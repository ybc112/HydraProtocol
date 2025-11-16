'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('quickstart');

  const sections = [
    { id: 'quickstart', title: 'Quick Start', icon: '🚀' },
    { id: 'upload', title: 'Upload Data', icon: '📤' },
    { id: 'purchase', title: 'Purchase Data', icon: '💰' },
    { id: 'compute', title: 'ZKP Computation', icon: '🔐' },
    { id: 'zkp', title: 'About ZKP', icon: '📚' },
    { id: 'faq', title: 'FAQ', icon: '❓' },
  ];

  return (
    <main className="min-h-screen bg-slate-900">
      <Header />

      {/* Background Pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(16, 185, 129) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}></div>
      </div>

      <div className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          {/* Page Header */}
          <div className="text-center mb-12">
            <div className="inline-block mb-4 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
              <span className="text-emerald-400 font-semibold">📚 Documentation</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4 text-white">
              Documentation
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Learn how to use HydraProtocol for privacy-preserving data marketplace
            </p>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 sticky top-24">
                <h3 className="text-lg font-bold text-white mb-4">Contents</h3>
                <nav className="space-y-2">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        activeSection === section.id
                          ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                          : 'text-gray-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      <span className="mr-2">{section.icon}</span>
                      {section.title}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-8">

                {/* Quick Start Section */}
                {activeSection === 'quickstart' && (
                  <div className="prose prose-invert max-w-none">
                    <h2 className="text-3xl font-bold text-white mb-6">🚀 Quick Start</h2>

                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold text-emerald-400 mb-3">Step 1: Connect Your Wallet</h3>
                        <p className="text-gray-300 mb-4">
                          Click the "Connect Wallet" button in the top right corner and select your Sui wallet.
                        </p>
                        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                          <p className="text-sm text-gray-400">
                            Supported wallets: Suiet, Sui Wallet, Ethos Wallet
                          </p>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-emerald-400 mb-3">Step 2: Get Testnet SUI</h3>
                        <p className="text-gray-300 mb-4">
                          You need SUI tokens to interact with the protocol. Get free testnet SUI from:
                        </p>
                        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                          <code className="text-sm text-emerald-400">
                            https://discord.com/channels/916379725201563759/971488439931392130
                          </code>
                          <p className="text-sm text-gray-400 mt-2">
                            Join Sui Discord and use the !faucet command
                          </p>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-emerald-400 mb-3">Step 3: Explore the Marketplace</h3>
                        <p className="text-gray-300">
                          Browse available datasets in the marketplace and purchase access to data you're interested in.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Data Section */}
                {activeSection === 'upload' && (
                  <div className="prose prose-invert max-w-none">
                    <h2 className="text-3xl font-bold text-white mb-6">📤 How to Upload Data</h2>

                    <div className="space-y-6">
                      <p className="text-gray-300">
                        Uploading data to HydraProtocol stores your encrypted data on Walrus (decentralized storage)
                        and registers it on Sui blockchain for marketplace listing.
                      </p>

                      <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
                        <h4 className="text-emerald-400 font-semibold mb-2">📝 Before You Upload</h4>
                        <ul className="list-disc list-inside text-gray-300 space-y-1">
                          <li>Recommended file types: CSV, JSON, Excel (.xlsx), TXT</li>
                          <li>File size limit: 10MB (testnet)</li>
                          <li>Data will be encrypted with AES-256-GCM before upload</li>
                          <li>You'll need SUI tokens for gas fees (~0.02-0.05 SUI)</li>
                          <li>Encryption key stored securely in your browser</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-white mb-3">Steps:</h3>
                        <ol className="list-decimal list-inside space-y-3 text-gray-300">
                          <li>Navigate to the Marketplace page</li>
                          <li>Click "Upload New Data" button at the top</li>
                          <li>Fill in the form:
                            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
                              <li><strong>Title</strong>: Descriptive name (e.g., "Patient Recovery Data 2024")</li>
                              <li><strong>Description</strong>: Detailed description of what the data contains</li>
                              <li><strong>Category</strong>: Choose from:
                                <ul className="ml-6 mt-1 space-y-1">
                                  <li>🏥 Healthcare - Medical records, patient data, clinical trials</li>
                                  <li>💰 Finance - Transaction data, market data, trading records</li>
                                  <li>🔬 Research - Scientific datasets, experimental results</li>
                                  <li>🤖 IoT - Sensor data, device telemetry, smart home data</li>
                                  <li>🚚 Logistics - Supply chain, shipping, tracking data</li>
                                  <li>📊 General - Any other type of structured data</li>
                                </ul>
                              </li>
                              <li><strong>Price</strong>: Set price in SUI tokens (e.g., 0.1 SUI)</li>
                              <li><strong>File</strong>: Select your data file</li>
                            </ul>
                          </li>
                          <li>Click "Upload to Walrus"</li>
                          <li>Sign the blockchain transaction in your wallet</li>
                          <li>Wait for confirmation (typically 10-30 seconds)</li>
                          <li>Your data is now listed on the marketplace!</li>
                        </ol>
                      </div>

                      <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                        <h4 className="text-white font-semibold mb-2">What Happens Behind the Scenes:</h4>
                        <ol className="text-sm text-gray-400 space-y-2">
                          <li>1️⃣ Browser generates a random AES-256-GCM encryption key</li>
                          <li>2️⃣ Your data file is encrypted locally in your browser</li>
                          <li>3️⃣ Encrypted data uploaded to Walrus decentralized storage</li>
                          <li>4️⃣ Metadata + Walrus blob ID registered on Sui blockchain</li>
                          <li>5️⃣ Data listing created on marketplace smart contract</li>
                          <li>6️⃣ Encryption key stored in your browser for later distribution to buyers</li>
                        </ol>
                      </div>

                      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                        <h4 className="text-blue-400 font-semibold mb-2">💡 For Sellers</h4>
                        <p className="text-gray-300 text-sm mb-2">
                          After listing your data, enable "Auto-distribute Keys" in the "My Data" page to automatically
                          distribute decryption keys to buyers when they purchase your data.
                        </p>
                        <p className="text-xs text-gray-400">
                          Your wallet must be online for automatic distribution. Otherwise, you can manually distribute keys later.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Purchase Data Section */}
                {activeSection === 'purchase' && (
                  <div className="prose prose-invert max-w-none">
                    <h2 className="text-3xl font-bold text-white mb-6">💰 How to Purchase Data</h2>

                    <div className="space-y-6">
                      <p className="text-gray-300">
                        Purchasing data gives you access rights to download and compute on the dataset with automatic key distribution.
                      </p>

                      <div>
                        <h3 className="text-xl font-semibold text-white mb-3">Steps:</h3>
                        <ol className="list-decimal list-inside space-y-3 text-gray-300">
                          <li>Browse the Marketplace and find a dataset</li>
                          <li>Click the "Purchase" button on the dataset card</li>
                          <li>Review the price and data description</li>
                          <li>Confirm the transaction in your wallet</li>
                          <li><strong>Wait for seller to distribute decryption key</strong> (usually instant if seller is online)</li>
                          <li>Access your purchased data in "My Data" page</li>
                        </ol>
                      </div>

                      <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
                        <h4 className="text-emerald-400 font-semibold mb-2">🔑 Secure Key Distribution</h4>
                        <p className="text-gray-300 text-sm mb-2">
                          HydraProtocol uses a secure two-step key distribution mechanism:
                        </p>
                        <ol className="text-sm text-gray-300 space-y-1">
                          <li>1. Your wallet generates an X25519 public key (one-time)</li>
                          <li>2. After purchase, seller encrypts the decryption key with your public key</li>
                          <li>3. Encrypted key is stored on-chain</li>
                          <li>4. Only you can decrypt it with your private key</li>
                        </ol>
                        <p className="text-xs text-emerald-300/70 mt-2">
                          ✅ No plaintext keys on-chain · ✅ End-to-end encryption · ✅ Seller can't access your private key
                        </p>
                      </div>

                      <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                        <h4 className="text-yellow-400 font-semibold mb-2">⚠️ Important Notes</h4>
                        <ul className="list-disc list-inside text-gray-300 space-y-1">
                          <li>You cannot purchase your own data</li>
                          <li>Access expires after the period defined in the listing</li>
                          <li>Payment is split: 90% to seller, 10% platform fee</li>
                          <li>Transactions are final and cannot be refunded</li>
                          <li>Key distribution requires seller's wallet to be online (or auto-distribute enabled)</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-white mb-3">After Purchase:</h3>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                          <li>View purchased data in "My Data" page</li>
                          <li>Check key distribution status</li>
                          <li>Use data for ZKP computations directly</li>
                          <li>Check access expiration date</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* ZKP Computation Section */}
                {activeSection === 'compute' && (
                  <div className="prose prose-invert max-w-none">
                    <h2 className="text-3xl font-bold text-white mb-6">🔐 ZKP Computation</h2>

                    <div className="space-y-6">
                      <p className="text-gray-300">
                        Execute privacy-preserving computations on your purchased data without revealing the raw data.
                      </p>

                      <div>
                        <h3 className="text-xl font-semibold text-white mb-3">Available Computations:</h3>

                        <div className="space-y-4">
                          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                            <h4 className="text-emerald-400 font-semibold mb-2">📊 Average Calculation</h4>
                            <p className="text-gray-300 text-sm mb-2">
                              Compute the average of numeric values across datasets without revealing individual data points.
                            </p>
                            <p className="text-xs text-gray-500 mb-3">
                              Input: 3 data values | Output: Average + Commitment hash
                            </p>
                            <div className="text-xs text-gray-400 bg-slate-800 rounded p-2">
                              <strong>Example:</strong> Calculate average patient age: [45, 67, 52] → Result: 54.67
                            </div>
                          </div>

                          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                            <h4 className="text-emerald-400 font-semibold mb-2">🎯 Threshold Query</h4>
                            <p className="text-gray-300 text-sm mb-2">
                              Count how many values exceed a threshold without revealing the actual values.
                            </p>
                            <p className="text-xs text-gray-500 mb-3">
                              Input: 10 data values + threshold | Output: Count + Commitment hash
                            </p>
                            <div className="text-xs text-gray-400 bg-slate-800 rounded p-2">
                              <strong>Example:</strong> Threshold=60 on patient ages → Result: "6 out of 10 patients exceed threshold 60"
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-white mb-3">How to Compute:</h3>
                        <ol className="list-decimal list-inside space-y-3 text-gray-300">
                          <li>Go to the "Compute" page</li>
                          <li>Select the datasets you want to compute on (purchased data only)</li>
                          <li>System automatically detects columns (e.g., "年龄", "恢复天数")</li>
                          <li>Choose computation type:
                            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
                              <li><strong>Average Calculation</strong>: No extra input needed</li>
                              <li><strong>Threshold Query</strong>: Enter threshold value (e.g., 50, 60)</li>
                            </ul>
                          </li>
                          <li>Select target column (or use "Auto" for automatic detection)</li>
                          <li>Enable "Use Real Data" checkbox to analyze actual file content</li>
                          <li>Click "Compute with ZKP"</li>
                          <li>Wait for proof generation (10-30 seconds)</li>
                          <li>Sign the transaction to submit proof on-chain</li>
                          <li>View results in the "Results" page with full computation details</li>
                        </ol>
                      </div>

                      <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
                        <h4 className="text-emerald-400 font-semibold mb-2">🔒 Privacy Protection</h4>
                        <ul className="text-sm text-gray-300 space-y-1">
                          <li>✅ Original data never leaves your browser unencrypted</li>
                          <li>✅ Column detection happens locally (data remains encrypted during transfer)</li>
                          <li>✅ ZKP proves correctness without revealing input values</li>
                          <li>✅ Only computation result is stored on-chain</li>
                        </ul>
                      </div>

                      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                        <h4 className="text-blue-400 font-semibold mb-2">💡 Supported File Types</h4>
                        <p className="text-gray-300 text-sm">
                          CSV, JSON, Excel (.xlsx), and text files with numeric data. The system automatically
                          extracts numeric columns for computation.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* About ZKP Section */}
                {activeSection === 'zkp' && (
                  <div className="prose prose-invert max-w-none">
                    <h2 className="text-3xl font-bold text-white mb-6">📚 About Zero-Knowledge Proofs</h2>

                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold text-emerald-400 mb-3">What is a Zero-Knowledge Proof?</h3>
                        <p className="text-gray-300">
                          A zero-knowledge proof is a cryptographic method that allows one party (the prover)
                          to prove to another party (the verifier) that a statement is true, without revealing
                          any information beyond the validity of the statement itself.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-emerald-400 mb-3">How HydraProtocol Uses ZKP</h3>
                        <p className="text-gray-300 mb-4">
                          HydraProtocol uses <strong>zk-SNARKs (Groth16)</strong> to enable privacy-preserving computations:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                          <li><strong>Circom Circuits</strong>: Define the computation logic</li>
                          <li><strong>SnarkJS</strong>: Generate proofs in the browser</li>
                          <li><strong>Sui Smart Contract</strong>: Verify proofs on-chain</li>
                        </ul>
                      </div>

                      <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                        <h4 className="text-white font-semibold mb-3">Technical Details:</h4>
                        <ul className="text-sm text-gray-400 space-y-2">
                          <li>🔐 <strong>Curve</strong>: BN254</li>
                          <li>📊 <strong>Proof Size</strong>: ~200 bytes</li>
                          <li>⚡ <strong>Verification Time</strong>: &lt;1ms on-chain</li>
                          <li>🔒 <strong>Security</strong>: Cryptographic soundness guarantee</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-emerald-400 mb-3">Example Use Cases</h3>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                          <li><strong>Medical Research</strong>: Calculate average recovery times without revealing patient data</li>
                          <li><strong>Financial Analysis</strong>: Compute statistics without exposing transaction details</li>
                          <li><strong>Supply Chain</strong>: Verify metrics without revealing business secrets</li>
                          <li><strong>DAO Voting</strong>: Prove voting results without revealing individual votes</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* FAQ Section */}
                {activeSection === 'faq' && (
                  <div className="prose prose-invert max-w-none">
                    <h2 className="text-3xl font-bold text-white mb-6">❓ Frequently Asked Questions</h2>

                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-emerald-400 mb-2">
                          Q: Is my data secure?
                        </h3>
                        <p className="text-gray-300">
                          Yes! Your data is encrypted with AES-256-GCM before being uploaded to Walrus.
                          Only users who purchase access can decrypt it.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-emerald-400 mb-2">
                          Q: What happens to my data on Walrus?
                        </h3>
                        <p className="text-gray-300">
                          Walrus is a decentralized storage network. Your data is stored with 5x redundancy
                          using Reed-Solomon encoding. On testnet, blobs expire after 30 days.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-emerald-400 mb-2">
                          Q: How much does it cost?
                        </h3>
                        <p className="text-gray-300">
                          Costs include: 1) Gas fees for Sui transactions (~0.01 SUI), 2) Data purchase price
                          set by the seller, 3) Platform fee (10% of purchase price).
                        </p>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-emerald-400 mb-2">
                          Q: Why is ZKP computation slow?
                        </h3>
                        <p className="text-gray-300">
                          Proof generation happens in your browser and involves complex cryptographic calculations.
                          Average circuit takes ~10-30 seconds. This is normal for client-side zk-SNARK generation.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-emerald-400 mb-2">
                          Q: Can I get a refund?
                        </h3>
                        <p className="text-gray-300">
                          No. Data purchases are final and recorded on the blockchain. Make sure to review
                          the data description before purchasing.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-emerald-400 mb-2">
                          Q: What file types are supported for ZKP computation?
                        </h3>
                        <p className="text-gray-300 mb-2">
                          For ZKP computations, the system supports CSV, JSON, Excel (.xlsx), and text files with numeric data.
                          The system automatically detects and extracts numeric columns.
                        </p>
                        <p className="text-sm text-gray-400">
                          For storage only: All file types are supported as encrypted blobs (PDF, images, etc.).
                        </p>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-emerald-400 mb-2">
                          Q: How does the key distribution work?
                        </h3>
                        <p className="text-gray-300 mb-2">
                          HydraProtocol uses a secure two-step process:
                        </p>
                        <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                          <li>Buyer's wallet generates an X25519 public key (registered on-chain)</li>
                          <li>Seller encrypts the AES decryption key with buyer's public key using ECDH</li>
                          <li>Encrypted key stored on-chain, only buyer can decrypt with their private key</li>
                        </ol>
                        <p className="text-xs text-emerald-300 mt-2">
                          ✅ No plaintext keys ever stored on-chain
                        </p>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-emerald-400 mb-2">
                          Q: What if the seller doesn't distribute the key?
                        </h3>
                        <p className="text-gray-300">
                          Sellers can enable "Auto-distribute Keys" in the "My Data" page. When enabled, keys are
                          automatically distributed when the seller's wallet is online. If manual distribution is needed,
                          buyers can contact sellers off-chain.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-emerald-400 mb-2">
                          Q: What is Walrus?
                        </h3>
                        <p className="text-gray-300">
                          Walrus is a decentralized storage and data availability protocol built by Mysten Labs.
                          It provides cost-effective storage with 5x redundancy using Reed-Solomon encoding and high availability guarantees.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-emerald-400 mb-2">
                          Q: Can I compute on multiple datasets at once?
                        </h3>
                        <p className="text-gray-300">
                          Yes! You can select multiple purchased datasets on the Compute page. The system will
                          combine the numeric data from all selected files for a single ZKP computation.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-emerald-400 mb-2">
                          Q: How long do computation results stay on-chain?
                        </h3>
                        <p className="text-gray-300">
                          Computation results are stored permanently on the Sui blockchain as shared objects.
                          You can view all your computation history in the "Results" page at any time.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
