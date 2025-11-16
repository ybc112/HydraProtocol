/**
 * Data Upload Component
 * Allows users to upload data to Walrus and list on marketplace
 */

'use client';

import { useState } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { useUploadData } from '../hooks/useUploadData';

export function UploadData() {
  const wallet = useWallet();
  const { upload, isUploading, uploadProgress, error } = useUploadData();

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [dataType, setDataType] = useState('csv');
  const [category, setCategory] = useState('Healthcare');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0.1');
  const [isPublic, setIsPublic] = useState(false);
  const [metadata, setMetadata] = useState('');

  // UI state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const categories = [
    { value: 'Healthcare', label: '🏥 Healthcare', desc: 'Medical records, patient data' },
    { value: 'Finance', label: '💰 Finance', desc: 'Transaction data, market data' },
    { value: 'Research', label: '🔬 Research', desc: 'Scientific datasets, experiments' },
    { value: 'IoT', label: '🤖 IoT', desc: 'Sensor data, device telemetry' },
    { value: 'Logistics', label: '🚚 Logistics', desc: 'Supply chain, shipping data' },
    { value: 'General', label: '📊 General', desc: 'Other structured data' },
  ];
  
  const dataTypes = [
    { value: 'csv', label: 'CSV', icon: '📊', forCompute: true },
    { value: 'json', label: 'JSON', icon: '📋', forCompute: true },
    { value: 'excel', label: 'Excel (.xlsx)', icon: '📈', forCompute: true },
    { value: 'text', label: 'Text', icon: '📝', forCompute: false },
    { value: 'binary', label: 'Binary/Other', icon: '📦', forCompute: false },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Check file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      
      setFile(selectedFile);

      // Auto-detect data type from file extension
      const fileName = selectedFile.name.toLowerCase();
      if (fileName.endsWith('.csv')) {
        setDataType('csv');
      } else if (fileName.endsWith('.json')) {
        setDataType('json');
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        setDataType('excel');
      } else if (fileName.endsWith('.txt')) {
        setDataType('text');
      } else {
        setDataType('binary');
      }

      // Auto-fill metadata with file info
      const autoMetadata = JSON.stringify({
        fileName: selectedFile.name,
        fileType: selectedFile.type || 'unknown',
        fileSize: selectedFile.size,
        fileSizeReadable: `${(selectedFile.size / 1024).toFixed(2)} KB`,
        uploadedAt: new Date().toISOString(),
      }, null, 2);
      setMetadata(autoMetadata);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      alert('Please select a file');
      return;
    }

    if (!wallet.connected) {
      alert('Please connect your wallet first');
      return;
    }

    setSuccessMessage(null);

    const result = await upload({
      file,
      dataType,
      metadata,
      isPublic,
      price: parseFloat(price),
      category,
      description,
    });

    if (result.success) {
      setSuccessMessage(
        `Data uploaded successfully! Blob ID: ${result.blobId?.slice(0, 10)}... | Listing ID: ${result.listingId?.slice(0, 10)}...`
      );

      // Reset form
      setFile(null);
      setDescription('');
      setMetadata('');
      setShowUploadForm(false);

      // Refresh page after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  };

  return (
    <div className="mb-8">
      {/* Upload Button */}
      {!showUploadForm && (
        <div className="text-center">
          <button
            onClick={() => setShowUploadForm(true)}
            disabled={!wallet.connected}
            className={`px-8 py-3 rounded-lg font-semibold transition-all ${
              wallet.connected
                ? 'bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-105'
                : 'bg-slate-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {wallet.connected ? '+ Upload New Data' : 'Connect Wallet to Upload'}
          </button>
        </div>
      )}

      {/* Upload Form */}
      {showUploadForm && (
        <div className="bg-slate-800 border-2 border-emerald-500/50 rounded-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Upload Data to Marketplace</h3>
            <button
              onClick={() => setShowUploadForm(false)}
              className="text-gray-500 hover:text-gray-300 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-900/20 border border-emerald-700 text-emerald-300 rounded-lg">
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-700 text-red-300 rounded-lg">
              {error}
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">Uploading...</span>
                <span className="text-sm font-medium text-gray-300">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div
                  className="bg-emerald-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                {uploadProgress < 20 && 'Calculating file hash...'}
                {uploadProgress >= 20 && uploadProgress < 50 && 'Uploading to Walrus...'}
                {uploadProgress >= 50 && uploadProgress < 85 && 'Registering on blockchain...'}
                {uploadProgress >= 85 && uploadProgress < 100 && 'Listing on marketplace...'}
                {uploadProgress === 100 && 'Complete!'}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select File *
              </label>
              <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 hover:border-emerald-500/50 transition-colors">
                <input
                  type="file"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  accept=".csv,.json,.xlsx,.xls,.txt"
                  className="w-full p-3 bg-slate-900 text-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-500 file:text-white hover:file:bg-emerald-600"
                  required
                />
                {file ? (
                  <div className="mt-3 p-3 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
                    <p className="text-sm text-emerald-400 font-medium">
                      ✓ {file.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Size: {(file.size / 1024).toFixed(2)} KB · Type: {file.type || 'unknown'}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-gray-500 text-center">
                    Supported: CSV, JSON, Excel, TXT (max 10MB)
                  </p>
                )}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category * <span className="text-xs text-gray-500">(What type of data is this?)</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isUploading}
                className="w-full p-3 border border-slate-700 bg-slate-900 text-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                required
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label} - {cat.desc}
                  </option>
                ))}
              </select>
            </div>

            {/* Data Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Data Type * <span className="text-xs text-gray-500">(Auto-detected from file)</span>
              </label>
              <select
                value={dataType}
                onChange={(e) => setDataType(e.target.value)}
                disabled={isUploading}
                className="w-full p-3 border border-slate-700 bg-slate-900 text-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                required
              >
                {dataTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label} {type.forCompute ? '✓ ZKP Compute' : '(Storage Only)'}
                  </option>
                ))}
              </select>
              {dataType && dataTypes.find(t => t.value === dataType)?.forCompute && (
                <p className="mt-2 text-xs text-emerald-400">
                  ✓ This file type supports ZKP computation
                </p>
              )}
              {(dataType === 'csv' || dataType === 'excel' || dataType === 'json') && (
                <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <p className="text-xs text-blue-300">
                    💡 <strong>Tip:</strong> Make sure your {dataType.toUpperCase()} file contains numeric columns for ZKP computation (e.g., age, temperature, count)
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isUploading}
                rows={3}
                placeholder="Describe your dataset..."
                className="w-full p-3 border border-slate-700 bg-slate-900 text-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Price (SUI) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={isUploading}
                  min="0.01"
                  step="0.01"
                  placeholder="0.1"
                  className="w-full p-3 pr-16 border border-slate-700 bg-slate-900 text-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  SUI
                </span>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPrice('0.1')}
                  className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-gray-300"
                >
                  0.1 SUI
                </button>
                <button
                  type="button"
                  onClick={() => setPrice('0.5')}
                  className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-gray-300"
                >
                  0.5 SUI
                </button>
                <button
                  type="button"
                  onClick={() => setPrice('1')}
                  className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-gray-300"
                >
                  1 SUI
                </button>
                <button
                  type="button"
                  onClick={() => setPrice('5')}
                  className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-gray-300"
                >
                  5 SUI
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                90% goes to you, 10% platform fee
              </p>
            </div>

            {/* Public/Private Toggle */}
            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  disabled={isUploading}
                  className="w-5 h-5 text-emerald-500 rounded focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-gray-300">
                  Make this data public (visible to all)
                </span>
              </label>
            </div>

            {/* Metadata (Advanced) */}
            <details className="border border-slate-700 rounded-lg p-4">
              <summary className="cursor-pointer font-medium text-gray-300">
                Advanced: Metadata (JSON)
              </summary>
              <textarea
                value={metadata}
                onChange={(e) => setMetadata(e.target.value)}
                disabled={isUploading}
                rows={4}
                placeholder='{"key": "value"}'
                className="w-full mt-3 p-3 border border-slate-700 bg-slate-900 text-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
              />
            </details>

            {/* Submit Buttons */}
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={isUploading || !file}
                className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                  isUploading || !file
                    ? 'bg-slate-700 text-gray-500 cursor-not-allowed'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-105'
                }`}
              >
                {isUploading ? 'Uploading...' : 'Upload & List Data'}
              </button>

              <button
                type="button"
                onClick={() => setShowUploadForm(false)}
                disabled={isUploading}
                className="px-6 py-3 border-2 border-slate-700 rounded-lg font-semibold text-gray-300 hover:bg-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
