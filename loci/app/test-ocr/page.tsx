'use client';

import React, { useState } from 'react';
import useClientSideOCR, { OCRResult } from '@/app/components/ClientSideOCR';

export default function TestOCRPage() {
  const [file, setFile] = useState<File | null>(null);
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [result, setResult] = useState<OCRResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const { processImage, isInitialized } = useClientSideOCR();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleTestOCR = async () => {
    if (!file || !address || !name) {
      alert('Please select a file and enter address and name');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      const ocrResult = await processImage(
        file,
        address,
        name
      );

      setResult(ocrResult);
      console.log('OCR Result:', ocrResult);
    } catch (error) {
      console.error('OCR Error:', error);
      alert(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Client-Side OCR Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Document
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter the address to match"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter the name to match"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleTestOCR}
              disabled={!file || !address || !name || isProcessing}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Test OCR'}
            </button>
          </div>
        </div>

        {isProcessing && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Processing...</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>OCR Progress</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progress * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">OCR Results</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Match Results</h3>
                <div className="space-y-2 text-sm">
                  <div>Address Matched: <span className={result.addressMatched ? 'text-green-600' : 'text-red-600'}>{result.addressMatched ? 'Yes' : 'No'}</span></div>
                  <div>Name Matched: <span className={result.nameMatched ? 'text-green-600' : 'text-red-600'}>{result.nameMatched ? 'Yes' : 'No'}</span></div>
                  <div>Match Score: <span className="font-semibold">{result.matchScore}%</span></div>
                  <div>Confidence: <span className="font-semibold">{result.confidence}%</span></div>
                  <div>Fuzzy Address Match: <span className={result.fuzzyAddressMatched ? 'text-green-600' : 'text-red-600'}>{result.fuzzyAddressMatched ? 'Yes' : 'No'}</span></div>
                  <div>Strict Address Match: <span className={result.strictAddressMatched ? 'text-green-600' : 'text-red-600'}>{result.strictAddressMatched ? 'Yes' : 'No'}</span></div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Extracted Information</h3>
                <div className="space-y-2 text-sm">
                  <div>Found Addresses: {result.foundAddresses.length > 0 ? result.foundAddresses.join(', ') : 'None'}</div>
                  <div>Block Matches: {result.blockMatches || 0}</div>
                  <div>Total Blocks: {result.totalBlocks || 0}</div>
                  <div>Full Name: {result.fullName}</div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Extracted Text</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <pre className="text-sm whitespace-pre-wrap">{result.extractedText}</pre>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Normalized Text</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <pre className="text-sm whitespace-pre-wrap">{result.normalizedExtractedText}</pre>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Status</h2>
          <div className="space-y-2 text-sm">
            <div>OCR Initialized: <span className={isInitialized ? 'text-green-600' : 'text-yellow-600'}>{isInitialized ? 'Yes' : 'No'}</span></div>
            <div>File Selected: <span className={file ? 'text-green-600' : 'text-red-600'}>{file ? 'Yes' : 'No'}</span></div>
            {file && (
              <div>File Size: {(file.size / 1024 / 1024).toFixed(2)} MB</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 