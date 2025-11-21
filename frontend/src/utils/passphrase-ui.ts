export function promptPassphraseUI(message = 'Enter a passphrase to protect your decryption key'): Promise<string> {
  return new Promise((resolve, reject) => {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(2,6,23,0.8)';
    overlay.style.backdropFilter = 'blur(2px)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';

    const card = document.createElement('div');
    card.style.width = '420px';
    card.style.maxWidth = '90vw';
    card.style.background = '#0f172a';
    card.style.border = '1px solid #334155';
    card.style.borderRadius = '16px';
    card.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
    card.style.padding = '20px';
    card.style.color = '#e2e8f0';

    const title = document.createElement('div');
    title.style.fontSize = '18px';
    title.style.fontWeight = '600';
    title.style.marginBottom = '12px';
    title.textContent = message;

    const input = document.createElement('input');
    input.type = 'password';
    input.placeholder = 'Enter passphrase';
    input.style.width = '100%';
    input.style.padding = '12px';
    input.style.borderRadius = '10px';
    input.style.border = '1px solid #475569';
    input.style.background = '#0b1220';
    input.style.color = '#e2e8f0';

    const hint = document.createElement('div');
    hint.style.fontSize = '12px';
    hint.style.color = '#94a3b8';
    hint.style.marginTop = '8px';
    hint.textContent = 'Use at least 12 characters. Do not use your wallet seed.';

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '10px';
    row.style.marginTop = '16px';

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Confirm';
    confirmBtn.style.flex = '1';
    confirmBtn.style.padding = '10px 14px';
    confirmBtn.style.borderRadius = '10px';
    confirmBtn.style.border = '1px solid transparent';
    confirmBtn.style.background = '#10b981';
    confirmBtn.style.color = '#0b1220';
    confirmBtn.style.fontWeight = '600';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.flex = '1';
    cancelBtn.style.padding = '10px 14px';
    cancelBtn.style.borderRadius = '10px';
    cancelBtn.style.border = '1px solid #475569';
    cancelBtn.style.background = '#0b1220';
    cancelBtn.style.color = '#e2e8f0';

    function cleanup() {
      document.body.removeChild(overlay);
    }

    function submit() {
      const v = input.value.trim();
      if (!v || v.length < 4) return;
      cleanup();
      resolve(v);
    }

    confirmBtn.onclick = submit;
    cancelBtn.onclick = () => { cleanup(); reject(new Error('cancelled')); };
    input.onkeydown = e => { if (e.key === 'Enter') submit(); };

    row.appendChild(confirmBtn);
    row.appendChild(cancelBtn);
    card.appendChild(title);
    card.appendChild(input);
    card.appendChild(hint);
    card.appendChild(row);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    setTimeout(() => input.focus(), 20);
  });
}