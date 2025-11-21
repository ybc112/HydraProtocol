export async function openSecureDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('hydra-secure', 2);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = (event as IDBVersionChangeEvent).oldVersion;
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys');
        }
      }
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('symmetric-keys')) {
          db.createObjectStore('symmetric-keys');
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

import { promptPassphraseUI } from './passphrase-ui';
async function promptPassphrase(): Promise<string> {
  let p = sessionStorage.getItem('hydra:passphrase');
  if (!p) {
    p = await promptPassphraseUI();
    sessionStorage.setItem('hydra:passphrase', p);
  }
  return p;
}

export async function savePrivateKey(address: string, priv: Uint8Array): Promise<void> {
  // 先完成所有异步操作（在事务外）
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const pass = await promptPassphrase();
  const key = await deriveKey(pass, salt);
  // Ensure priv is a standard Uint8Array with ArrayBuffer
  const privBuffer = new Uint8Array(priv);
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, privBuffer);
  const payload = new Uint8Array(salt.length + iv.length + new Uint8Array(cipherBuf).length);
  payload.set(salt, 0);
  payload.set(iv, salt.length);
  payload.set(new Uint8Array(cipherBuf), salt.length + iv.length);
  
  // 最后才打开事务并写入（同步操作）
  const db = await openSecureDB();
  const tx = db.transaction('keys', 'readwrite');
  const store = tx.objectStore('keys');
  await new Promise<void>((resolve, reject) => {
    const req = store.put(payload, address);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function readPrivateKey(address: string): Promise<Uint8Array | null> {
  // 先从 IndexedDB 读取加密数据（事务内）
  const db = await openSecureDB();
  const tx = db.transaction('keys', 'readonly');
  const store = tx.objectStore('keys');
  const payload: Uint8Array | null = await new Promise((resolve, reject) => {
    const req = store.get(address);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
  
  // 事务完成后再执行异步解密操作
  if (!payload) return null;
  const salt = payload.slice(0, 16);
  const iv = payload.slice(16, 28);
  const cipher = payload.slice(28);
  const pass = await promptPassphrase();
  const key = await deriveKey(pass, salt);
  const cipherBuffer = new Uint8Array(cipher);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBuffer);
  return new Uint8Array(plain);
}

export async function deletePrivateKey(address: string): Promise<void> {
  const db = await openSecureDB();
  const tx = db.transaction('keys', 'readwrite');
  const store = tx.objectStore('keys');
  await new Promise<void>((resolve, reject) => {
    const req = store.delete(address);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getOrCreatePrivateKey(address: string, generator: () => Uint8Array): Promise<Uint8Array> {
  const existing = await readPrivateKey(address);
  if (existing) return existing;
  const priv = generator();
  await savePrivateKey(address, priv);
  return priv;
}

export async function exportPrivateKeyBase64(address: string): Promise<string | null> {
  const k = await readPrivateKey(address);
  if (!k) return null;
  return btoa(String.fromCharCode(...k));
}

export async function saveSymmetricKey(blobId: string, symKey: Uint8Array): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const pass = await promptPassphrase();
  const key = await deriveKey(pass, salt);
  // Ensure symKey is a standard Uint8Array with ArrayBuffer
  const symKeyBuffer = new Uint8Array(symKey);
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, symKeyBuffer);
  const payload = new Uint8Array(salt.length + iv.length + new Uint8Array(cipherBuf).length);
  payload.set(salt, 0);
  payload.set(iv, salt.length);
  payload.set(new Uint8Array(cipherBuf), salt.length + iv.length);

  const db = await openSecureDB();
  const tx = db.transaction('symmetric-keys', 'readwrite');
  const store = tx.objectStore('symmetric-keys');
  await new Promise<void>((resolve, reject) => {
    const req = store.put(payload, blobId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function readSymmetricKey(blobId: string): Promise<Uint8Array | null> {
  const db = await openSecureDB();
  const tx = db.transaction('symmetric-keys', 'readonly');
  const store = tx.objectStore('symmetric-keys');
  const payload: Uint8Array | null = await new Promise((resolve, reject) => {
    const req = store.get(blobId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
  if (!payload) return null;
  const salt = payload.slice(0, 16);
  const iv = payload.slice(16, 28);
  const cipher = payload.slice(28);
  const pass = await promptPassphrase();
  const key = await deriveKey(pass, salt);
  const cipherBuffer = new Uint8Array(cipher);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBuffer);
  return new Uint8Array(plain);
}

export async function deleteSymmetricKey(blobId: string): Promise<void> {
  const db = await openSecureDB();
  const tx = db.transaction('symmetric-keys', 'readwrite');
  const store = tx.objectStore('symmetric-keys');
  await new Promise<void>((resolve, reject) => {
    const req = store.delete(blobId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function listSymmetricKeys(): Promise<string[]> {
  const db = await openSecureDB();
  const tx = db.transaction('symmetric-keys', 'readonly');
  const store = tx.objectStore('symmetric-keys');
  return new Promise((resolve, reject) => {
    const req = store.getAllKeys();
    req.onsuccess = () => resolve(req.result as string[]);
    req.onerror = () => reject(req.error);
  });
}
