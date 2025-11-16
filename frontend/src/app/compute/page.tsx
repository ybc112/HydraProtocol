'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { useMyPurchases } from '../../hooks/useMyPurchases';
import { useSubmitComputation } from '../../hooks/useSubmitComputation';
import { useVerifyProof } from '../../hooks/useVerifyProof';
import { useCircuitVerificationKeys } from '../../hooks/useCircuitVerificationKeys';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import {
  generateAverageProof,
  generateThresholdProof,
  generateMockData,
  encodeProofToBytes,
  encodePublicSignalsToBytes,
  parsePublicSignals
} from '../../utils/zkp-browser';
import {
  downloadAndDecrypt,
  prepareCircuitInput,
  getDataStatistics,
  parseCsvColumns,
  chooseDefaultNumericColumn
} from '../../utils/data-parser';
import { SuiClient } from '@mysten/sui/client';
import { getHydraConfig, CONTRACT_ADDRESSES } from '../../config/hydra';


export default function ComputePage() {
  const wallet = useWallet();
  const { purchases, loading: loadingPurchases } = useMyPurchases();
  const { submitComputation, isSubmitting } = useSubmitComputation();
  const { verifyProof, isVerifying } = useVerifyProof();
  const { getVkIdByCircuit, loading: loadingVks } = useCircuitVerificationKeys();

  const [selectedDataIds, setSelectedDataIds] = useState<string[]>([]);
  const [circuitType, setCircuitType] = useState<'average' | 'threshold'>('average');
  const [thresholdValue, setThresholdValue] = useState('');
  const [computationParams, setComputationParams] = useState('');
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useRealData, setUseRealData] = useState(true);
  const [dataPreview, setDataPreview] = useState<string | null>(null);
  const [resultTitle, setResultTitle] = useState('');
  const [resultMemo, setResultMemo] = useState('');
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);

  const handleDataSelect = (dataRecordId: string) => {
    if (selectedDataIds.includes(dataRecordId)) {
      setSelectedDataIds(selectedDataIds.filter(id => id !== dataRecordId));
    } else {
      setSelectedDataIds([...selectedDataIds, dataRecordId]);
    }
  };

  // Auto-detect columns when data is selected
  useEffect(() => {
    const detectColumns = async () => {
      if (selectedDataIds.length === 0 || !wallet.connected) {
        setAvailableColumns([]);
        setSelectedColumn('');
        return;
      }

      try {
        const config = getHydraConfig();
        const client = new SuiClient({
          url: config.sui?.network === 'testnet'
            ? 'https://fullnode.testnet.sui.io:443'
            : 'https://fullnode.mainnet.sui.io:443'
        });

        // Just check the first selected dataset to get column names
        const dataRecordId = selectedDataIds[0];
        const recordObject = await client.getObject({
          id: dataRecordId,
          options: { showContent: true }
        });

        if (!recordObject.data?.content || !('fields' in recordObject.data.content)) {
          return;
        }

        const fields = recordObject.data.content.fields as any;
        const blobId = fields.walrus_blob_id;

        // Download and decrypt to get column names (but don't show data)
        const decryptedBuffer = await downloadAndDecrypt(
          blobId,
          undefined,
          { dataRecordId, buyerAddress: wallet.account!.address }
        );

        if (decryptedBuffer) {
          const parsed = parseCsvColumns(decryptedBuffer);
          if (parsed.headers.length > 0) {
            setAvailableColumns(parsed.headers);
            const defCol = chooseDefaultNumericColumn(parsed.headers);
            if (defCol) setSelectedColumn(defCol);
          }
        }
      } catch (err) {
        console.error('Failed to detect columns:', err);
      }
    };

    detectColumns();
  }, [selectedDataIds, wallet.connected, wallet.account]);

  const handleCompute = async () => {
    if (selectedDataIds.length === 0) {
      setError('Please select at least one dataset');
      return;
    }

    if (circuitType === 'threshold' && !thresholdValue) {
      setError('Please enter a threshold value');
      return;
    }

    try {
      setError(null);
      setResult(null);
      setDataPreview(null);
      setIsGeneratingProof(true);

      console.log('🔐 Generating ZKP proof...');

      // Fetch and parse real data from Walrus
      let circuitInput: number[];

      if (useRealData) {
        console.log('📥 Fetching real data from Walrus...');

        const config = getHydraConfig();
        const client = new SuiClient({
          url: config.sui?.network === 'testnet'
            ? 'https://fullnode.testnet.sui.io:443'
            : 'https://fullnode.mainnet.sui.io:443'
        });

        const allNumbers: number[] = [];
        const fileNames: string[] = [];

        // Download and parse each selected dataset
        for (const dataRecordId of selectedDataIds) {
          try {
            console.log(`📊 Processing dataset: ${dataRecordId}`);

            // 1. Query DataRecord to get blob ID
            const recordObject = await client.getObject({
              id: dataRecordId,
              options: { showContent: true }
            });

            if (!recordObject.data?.content || !('fields' in recordObject.data.content)) {
              console.warn(`⚠️ Could not read DataRecord: ${dataRecordId}`);
              continue;
            }

            const fields = recordObject.data.content.fields as any;
            const blobId = fields.walrus_blob_id;
            const dataType = fields.data_type || '';
            const description = fields.description || '';

            // Try to extract file name from description (JSON metadata)
            let fileName: string | undefined;
            try {
              const metadata = JSON.parse(description);
              fileName = metadata.fileName;
            } catch {
              // Description is not JSON, that's okay
            }

            fileNames.push(fileName || `data_${dataRecordId.slice(0, 8)}`);

            console.log(`📥 Downloading blob: ${blobId}`);

            // 3. Download and decrypt data
            const decryptedBuffer = await downloadAndDecrypt(
              blobId,
              undefined,
              { dataRecordId, buyerAddress: wallet.account!.address }
            );

            if (!decryptedBuffer) {
              throw new Error(`Failed to download/decrypt blob: ${blobId}`);
            }

            // 3. Parse CSV columns and select target column
            const parsed = parseCsvColumns(decryptedBuffer);
            const targetCol = selectedColumn || chooseDefaultNumericColumn(parsed.headers) || parsed.headers[0];
            const numbers = (parsed.columns[targetCol] || []);

            if (numbers.length === 0) {
              throw new Error('No numeric data found in file');
            }

            console.log(`✅ Extracted ${numbers.length} numbers from ${fileName || 'file'}`);
            allNumbers.push(...numbers);

          } catch (err) {
            console.error(`❌ Failed to process dataset ${dataRecordId}:`, err);
            throw err;
          }
        }

        if (allNumbers.length === 0) {
          throw new Error('No data extracted from selected datasets');
        }

        // Get statistics
        const stats = getDataStatistics(allNumbers);
        console.log('📊 Data statistics:', stats);

        // Set preview with column info
        setDataPreview(
          `Loaded ${fileNames.join(', ')}\n` +
          `Column: ${selectedColumn || 'auto'}\n` +
          `Total data points: ${stats.count}\n` +
          `Range: ${stats.min.toFixed(2)} - ${stats.max.toFixed(2)}\n` +
          `Mean: ${stats.mean.toFixed(2)}, Median: ${stats.median.toFixed(2)}`
        );

        // Prepare circuit input
        circuitInput = prepareCircuitInput(allNumbers, circuitType);
        console.log(`✅ Prepared circuit input: [${circuitInput.join(', ')}]`);

      } else {
        // Use mock data for testing
        console.log('🎲 Using mock data for testing...');
        circuitInput = generateMockData(circuitType);
        setDataPreview(`Using mock data: [${circuitInput.join(', ')}]`);
      }

      console.log(`🔐 Generating ZKP proof for ${circuitType} circuit...`);

      // Generate real ZKP proof
      let proofResult;
      if (circuitType === 'average') {
        proofResult = await generateAverageProof(circuitInput);
      } else {
        const threshold = parseInt(thresholdValue) || 50;
        proofResult = await generateThresholdProof(circuitInput, threshold);
      }

      const { proof, publicSignals } = proofResult;

      // Parse result from public signals
      const parsedResult = parsePublicSignals(circuitType, publicSignals);

      // Encode proof and public signals to bytes for smart contract
      const proofBytes = encodeProofToBytes(proof);
      const publicInputsBytes = encodePublicSignalsToBytes(publicSignals);

      console.log('✅ Proof generated, submitting to blockchain...');
      console.log('Proof size:', proofBytes.length, 'bytes');
      console.log('Public inputs:', publicSignals);

      setIsGeneratingProof(false);

      // Submit to smart contract
      const avgValue = circuitType === 'average' ? (circuitInput.reduce((a,b)=>a+b,0) / circuitInput.length) : undefined;
      const autoTitle = circuitType === 'average' ? 'Average Computation' : 'Threshold Query';
      const metadata = JSON.stringify({
        circuitType,
        params: circuitType === 'threshold' ? { threshold: thresholdValue } : {},
        computedAt: new Date().toISOString(),
        result: circuitType === 'average' ? `Average: ${avgValue!.toFixed(2)}` : parsedResult.result,
        commitment: parsedResult.commitment,
        dataSource: useRealData ? 'real' : 'mock',
        circuitInput: circuitInput,  // The actual numbers used
        dataPreview: dataPreview || 'No preview available',
        title: (resultTitle && resultTitle.trim().length > 0) ? resultTitle.trim() : autoTitle,
        memo: resultMemo || ''
      });

      const { txDigest, resultObjectId } = await submitComputation({
        circuitName: circuitType,
        proof: proofBytes,
        publicInputs: publicInputsBytes,
        dataRecordIds: selectedDataIds,
        metadata
      });

      console.log('🔍 Verifying proof on-chain...');

      // Get verification key ID for this circuit
      const vkId = getVkIdByCircuit(circuitType);
      if (!vkId) {
        throw new Error(`Verification key not found for circuit: ${circuitType}. Please register the circuit first.`);
      }

      // Automatically verify the proof
      try {
        const verifyTxDigest = await verifyProof({
          resultObjectId,
          vkObjectId: vkId,
          circuitName: circuitType
        });

        // Extract actual input numbers from metadata
        const inputNumbers = circuitInput;
        const inputSummary = `Computed on ${inputNumbers.length} data points: [${inputNumbers.join(', ')}]`;

        setResult(`✅ Computation successful and verified!

${circuitType === 'average' ? `Average: ${avgValue!.toFixed(2)}` : parsedResult.result}
${inputSummary}
Commitment: ${parsedResult.commitment}

Submit TX: ${txDigest.substring(0, 20)}...
Verify TX: ${verifyTxDigest.substring(0, 20)}...

✨ Status: VERIFIED`);
      } catch (verifyErr) {
        console.error('⚠️ Verification failed:', verifyErr);
        const inputNumbers = circuitInput;
        const inputSummary = `Computed on ${inputNumbers.length} data points: [${inputNumbers.join(', ')}]`;
        
        setResult(`⚠️ Computation submitted but verification failed

${parsedResult.result}
${inputSummary}
Commitment: ${parsedResult.commitment}

Transaction: ${txDigest.substring(0, 20)}...

Verification error: ${verifyErr instanceof Error ? verifyErr.message : 'Unknown error'}

⏳ Status: PENDING`);
      }

    } catch (err) {
      console.error('Computation failed:', err);
      setError(err instanceof Error ? err.message : 'Computation failed');
      setIsGeneratingProof(false);
    }
  };

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
              <span className="text-emerald-400 font-semibold">🔐 Zero-Knowledge Proof</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4 text-white">
              Privacy-Preserving Computation
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Perform computations on your purchased data without revealing the raw data.
              Results are cryptographically verified using zero-knowledge proofs.
            </p>
          </div>

          {/* Wallet Not Connected */}
          {!wallet.connected ? (
            <div className="max-w-2xl mx-auto">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h3>
                <p className="text-gray-400">
                  Please connect your wallet to access computation features
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Left Column: Data Selection */}
                <div className="space-y-6">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                    <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                      <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Select Data
                    </h2>
                    <p className="text-gray-400 mb-4">
                      Choose datasets you want to compute on
                    </p>

                    {/* Data Selection List */}
                    {loadingPurchases ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-4 border-emerald-500"></div>
                      </div>
                    ) : purchases.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-400 mb-4">No purchased data available</p>
                        <a href="/marketplace" className="text-emerald-400 hover:text-emerald-300">
                          Browse Marketplace →
                        </a>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {purchases.map((purchase) => (
                          <div
                            key={purchase.dataRecordId}
                            onClick={() => handleDataSelect(purchase.dataRecordId)}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedDataIds.includes(purchase.dataRecordId)
                                ? 'border-emerald-500 bg-emerald-500/10'
                                : 'border-slate-600 hover:border-slate-500'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-white truncate">{purchase.title}</h4>
                                <p className="text-sm text-gray-400 truncate">{purchase.dataType}</p>
                              </div>
                              <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                selectedDataIds.includes(purchase.dataRecordId)
                                  ? 'border-emerald-500 bg-emerald-500'
                                  : 'border-slate-500'
                              }`}>
                                {selectedDataIds.includes(purchase.dataRecordId) && (
                                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedDataIds.length > 0 && (
                      <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                        <p className="text-sm text-emerald-400">
                          ✓ {selectedDataIds.length} dataset{selectedDataIds.length > 1 ? 's' : ''} selected
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Computation Settings */}
                <div className="space-y-6">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                    <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                      <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Computation Type
                    </h2>

                    {/* Circuit Type Selection */}
                    <div className="space-y-4">
                      <div
                        onClick={() => setCircuitType('average')}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          circuitType === 'average'
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-slate-600 hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            circuitType === 'average' ? 'border-emerald-500' : 'border-slate-500'
                          }`}>
                            {circuitType === 'average' && (
                              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-white mb-1">Average Calculation</h4>
                            <p className="text-sm text-gray-400">
                              Compute the average of numeric values across selected datasets without revealing individual data points
                            </p>
                          </div>
                        </div>
                      </div>

                      <div
                        onClick={() => setCircuitType('threshold')}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          circuitType === 'threshold'
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-slate-600 hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            circuitType === 'threshold' ? 'border-emerald-500' : 'border-slate-500'
                          }`}>
                            {circuitType === 'threshold' && (
                              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-white mb-1">Threshold Query</h4>
                            <p className="text-sm text-gray-400">
                              Check if values meet a threshold condition without revealing the actual values
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Threshold Input */}
                    {circuitType === 'threshold' && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Threshold Value
                        </label>
                        <input
                          type="number"
                          value={thresholdValue}
                          onChange={(e) => setThresholdValue(e.target.value)}
                          placeholder="Enter threshold (e.g., 50)"
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    )}

                    {/* Data Source Toggle */}
                    <div className="mt-4">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useRealData}
                          onChange={(e) => setUseRealData(e.target.checked)}
                          className="w-5 h-5 text-emerald-500 rounded focus:ring-2 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-300">
                            Use Real Data
                          </span>
                          <p className="text-xs text-gray-500">
                            {useRealData 
                              ? 'Download and parse actual file content from Walrus'
                              : 'Use randomly generated mock data (for demo only)'}
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* Data Preview */}
                    {dataPreview && (
                      <div className="mt-4 p-4 bg-slate-700 border border-emerald-500/30 rounded-lg">
                        <h4 className="text-sm font-semibold text-emerald-400 mb-2">📊 Data Preview</h4>
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                          {dataPreview}
                        </pre>
                      </div>
                    )}

                    {/* Target Column Selection */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Target Column</label>
                      <select
                        value={selectedColumn}
                        onChange={(e) => setSelectedColumn(e.target.value)}
                        disabled={availableColumns.length === 0}
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Auto</option>
                        {availableColumns.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-2">
                        {availableColumns.length > 0 
                          ? `Detected columns: ${availableColumns.join(', ')}`
                          : 'Select a dataset above to auto-detect columns (data remains encrypted)'}
                      </p>
                    </div>

                    {/* Result Meta (Title & Notes) */}
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Result Title</label>
                        <input
                          type="text"
                          value={resultTitle}
                          onChange={(e) => setResultTitle(e.target.value)}
                          placeholder={circuitType === 'average' ? 'Average Computation' : 'Threshold Query'}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Notes (optional)</label>
                        <textarea
                          value={resultMemo}
                          onChange={(e) => setResultMemo(e.target.value)}
                          rows={2}
                          placeholder="Add a short memo for this computation"
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Compute Button */}
                    <button
                      onClick={handleCompute}
                      disabled={isGeneratingProof || isSubmitting || isVerifying || selectedDataIds.length === 0}
                      className={`mt-6 w-full px-6 py-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                        isGeneratingProof || isSubmitting || isVerifying || selectedDataIds.length === 0
                          ? 'bg-slate-700 text-gray-400 cursor-not-allowed'
                          : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-105'
                      }`}
                    >
                      {isGeneratingProof ? (
                        <>
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Generating Proof...</span>
                        </>
                      ) : isSubmitting ? (
                        <>
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Submitting to Blockchain...</span>
                        </>
                      ) : isVerifying ? (
                        <>
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Verifying Proof...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span>Compute with ZKP</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Result Display */}
                  {result && (
                    <div className="bg-emerald-900/20 border border-emerald-500 rounded-xl p-6">
                      <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                          <h4 className="font-bold text-emerald-400 mb-2">Computation Complete</h4>
                          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">{result}</pre>
                          <a
                            href="/results"
                            className="inline-block mt-4 text-emerald-400 hover:text-emerald-300 font-semibold"
                          >
                            View All Results →
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Display */}
                  {error && (
                    <div className="bg-red-900/20 border border-red-500 rounded-xl p-6">
                      <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                          <h4 className="font-bold text-red-400 mb-2">Error</h4>
                          <p className="text-sm text-red-300">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Info Section */}
              <div className="mt-8 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-3">ℹ️ How ZKP Computation Works</h3>
                <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-400">
                  <div>
                    <span className="text-emerald-400 font-semibold">1. Select Data</span>
                    <p className="mt-1">Choose which datasets to compute on from your purchased data</p>
                  </div>
                  <div>
                    <span className="text-emerald-400 font-semibold">2. Generate Proof</span>
                    <p className="mt-1">ZKP circuit generates a cryptographic proof of the computation without revealing raw data</p>
                  </div>
                  <div>
                    <span className="text-emerald-400 font-semibold">3. Verify On-Chain</span>
                    <p className="mt-1">Smart contract verifies the proof and stores the result on Sui blockchain</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
