'use client';
import React, { useState, useEffect } from 'react';
import { Upload, Loader2, CheckCircle, XCircle, AlertTriangle, Shield } from 'lucide-react';
import Image from 'next/image';

// Interfaces for data structures
interface FormDataType {
    full_name: string;
    phone_number: string;
    email: string;
    nin_or_bvn: string;
    typed_address: string;
    utility_bill: File | null;
    id_document: File | null;
    land_document: File | null;
    info_consent: boolean;
    data_consent: boolean;
}

interface DocumentValidity {
    passed: boolean;
    score: number;
    details: string;
    confidence: number;
}

interface DocumentMatch {
    address_match: boolean;
    name_match: boolean;
    match_score: number;
    found_addresses: string[];
    confidence: number;
}

interface VerificationResult {
    success: boolean;
    overall_score: number;
    verification_id: string;
    checks: {
        utility_bill: {
            validity: DocumentValidity;
            match: DocumentMatch;
        };
        id_document: {
            validity: DocumentValidity;
            match: DocumentMatch;
        };
        zoning_cadastral: {
            passed: boolean;
            score: number | string;
            details: string;
            confidence: number;
            status?: string;
        };
        gps_reverse_check?: {
            ip?: string;
            city?: string;
            region?: string;
            country?: string;
            isp?: string;
            details?: string;
        };
        distance_integrity?: {
            passed?: boolean;
            details?: string;
        };
    };
    ip?: string;
    recommendations?: string[];
    timestamp: string;
}

const AddressVerificationForm: React.FC = () => {
    // State management for form data, UI elements, and results
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
    const [showResults, setShowResults] = useState<boolean>(false);
    const [formData, setFormData] = useState<FormDataType>({
        full_name: '',
        phone_number: '',
        email: '',
        nin_or_bvn: '',
        typed_address: '',
        utility_bill: null,
        id_document: null,
        land_document: null,
        info_consent: false,
        data_consent: false
    });

    // Handler for general input changes
    const handleInputChange = <K extends keyof FormDataType>(field: K, value: FormDataType[K]): void => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Handler for file uploads
    const handleFileUpload = (field: keyof Pick<FormDataType, 'utility_bill' | 'id_document' | 'land_document'>, file: File | undefined): void => {
        if (file && file.size > 5 * 1024 * 1024) {
            // Using a custom message box instead of alert()
            const messageBox = document.createElement('div');
            messageBox.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            messageBox.innerHTML = `
                <div class="bg-white rounded-lg p-6 max-w-sm mx-4 text-center">
                    <p class="text-lg font-semibold mb-4">File Too Large</p>
                    <p class="text-gray-700 mb-6">File size should be less than 5MB.</p>
                    <button id="closeMessageBox" class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">OK</button>
                </div>
            `;
            document.body.appendChild(messageBox);
            document.getElementById('closeMessageBox')?.addEventListener('click', () => {
                document.body.removeChild(messageBox);
            });
            return;
        }
        setFormData(prev => ({
            ...prev,
            [field]: file || null
        }));
    };

    // Converts a File object to a Base64 string
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]); // Remove data:image/jpeg;base64, prefix
            };
            reader.onerror = error => reject(error);
        });
    };

    // Handles the form submission
    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault(); // Prevent default form submission

        // Basic validation for required fields
        if (!formData.full_name || !formData.phone_number || !formData.email || !formData.typed_address ||
            !formData.utility_bill ||
            !formData.id_document || !formData.info_consent || !formData.data_consent) {
            // Using a custom message box instead of alert()
            const messageBox = document.createElement('div');
            messageBox.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            messageBox.innerHTML = `
                <div class="bg-white rounded-lg p-6 max-w-sm mx-4 text-center">
                    <p class="text-lg font-semibold mb-4">Missing Information</p>
                    <p class="text-gray-700 mb-6">Please fill in all required fields and provide consent.</p>
                    <button id="closeMessageBox" class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">OK</button>
                </div>
            `;
            document.body.appendChild(messageBox);
            document.getElementById('closeMessageBox')?.addEventListener('click', () => {
                document.body.removeChild(messageBox);
            });
            return;
        }

        setIsSubmitting(true);

        try {
            // Convert files to base64
            const utilityBillBase64 = formData.utility_bill ? await fileToBase64(formData.utility_bill) : '';
            const idDocumentBase64 = formData.id_document ? await fileToBase64(formData.id_document) : '';
            const landDocumentBase64 = formData.land_document ? await fileToBase64(formData.land_document) : '';

            const payload = {
                full_name: formData.full_name,
                email: formData.email,
                phone_number: formData.phone_number,
                nin_or_bvn: formData.nin_or_bvn,
                typed_address: formData.typed_address,
                utility_bill: utilityBillBase64,
                id_document: idDocumentBase64,
                land_document: landDocumentBase64
            };

            console.log('Sending verification request...', payload);

            const response = await fetch('/api/verify-address', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', errorText);
                throw new Error(`Verification request failed: ${response.status}`);
            }

            const result: VerificationResult = await response.json();
            console.log('Verification result:', result);

            setVerificationResult(result);
            setShowResults(true);

            if (Notification.permission === 'granted') {
                new Notification('Verification Complete', {
                    body: `Verification ${result.success ? 'passed' : 'failed'} with ${result.overall_score}% score`,
                    icon: '/favicon.ico'
                });
            }

        } catch (error) {
            console.error('Verification error:', error);
            // Using a custom message box instead of alert()
            const messageBox = document.createElement('div');
            messageBox.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            messageBox.innerHTML = `
                <div class="bg-white rounded-lg p-6 max-w-sm mx-4 text-center">
                    <p class="text-lg font-semibold mb-4">Verification Failed</p>
                    <p class="text-gray-700 mb-6">Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
                    <button id="closeMessageBox" class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">OK</button>
                </div>
            `;
            document.body.appendChild(messageBox);
            document.getElementById('closeMessageBox')?.addEventListener('click', () => {
                document.body.removeChild(messageBox);
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper functions for styling based on score
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    // Overlay component for submission loading state
    const LoadingOverlay = () => (
        <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 relative">
                        <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
                        <Shield className="w-8 h-8 text-blue-600 absolute inset-2" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Verifying Your Address</h3>
                    <p className="text-gray-600 mb-4">Running comprehensive verification checks...</p>
                    <div className="space-y-2 text-sm text-left">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span>Document authenticity check...</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span>Address matching analysis...</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span>Zoning and cadastral overlay...</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Component to display verification results
    const ResultsDisplay: React.FC<{ result: VerificationResult }> = ({ result }) => {
        // Get uploaded images from formData (closure)
        const [utilityBillUrl, setUtilityBillUrl] = useState<string | null>(null);
        const [idDocumentUrl, setIdDocumentUrl] = useState<string | null>(null);
        useEffect(() => {
            if (formData.utility_bill) {
                setUtilityBillUrl(URL.createObjectURL(formData.utility_bill));
            }
            if (formData.id_document) {
                setIdDocumentUrl(URL.createObjectURL(formData.id_document));
            }
            return () => {
                if (utilityBillUrl) URL.revokeObjectURL(utilityBillUrl);
                if (idDocumentUrl) URL.revokeObjectURL(idDocumentUrl);
            };
            // eslint-disable-next-line
        }, [showResults]);

        // Helper to render validity and match for a document
        const renderDocSection = (label: string, doc: { validity: DocumentValidity; match: DocumentMatch }, imageUrl?: string) => (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                <h4 className="text-lg font-semibold mb-2 text-gray-900">{label}</h4>
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                        <div className="font-medium mb-1 text-gray-900">Validity</div>
                        <div className="mb-1">Status: <span className={doc.validity.passed ? 'text-green-700' : 'text-red-700'}>{doc.validity.passed ? 'Passed' : 'Failed'}</span></div>
                        <div className="mb-1">Score: <span className="font-bold text-gray-900">{doc.validity.score}%</span></div>
                        <div className="mb-1">Confidence: <span className="font-bold text-gray-900">{doc.validity.confidence}%</span></div>
                        <div className="mb-1">Details: <span className="text-gray-800">{doc.validity.details}</span></div>
                    </div>
                    <div className="flex-1">
                        <div className="font-medium mb-1 text-gray-900">Address & Name Match</div>
                        <div className="mb-1">Address Match: <span className={doc.match.address_match ? 'text-green-700' : 'text-red-700'}>{doc.match.address_match ? 'Yes' : 'No'}</span></div>
                        <div className="mb-1">Name Match: <span className={doc.match.name_match ? 'text-green-700' : 'text-red-700'}>{doc.match.name_match ? 'Yes' : 'No'}</span></div>
                        <div className="mb-1">Match Score: <span className="font-bold text-gray-900">{doc.match.match_score}%</span></div>
                        <div className="mb-1">Confidence: <span className="font-bold text-gray-900">{doc.match.confidence}%</span></div>
                        <div className="mb-1">Found Addresses: <span className="text-gray-800">{doc.match.found_addresses && doc.match.found_addresses.length > 0 ? doc.match.found_addresses.join(', ') : 'None'}</span></div>
                    </div>
                    {imageUrl && (
                        <div className="flex-shrink-0 flex flex-col items-center justify-center">
                            <Image src={imageUrl} alt={label + ' preview'} width={160} height={180} className="max-w-[160px] max-h-[180px] rounded shadow border border-gray-300 bg-white" />
                            <div className="text-xs text-gray-700 mt-1">{label} Image</div>
                        </div>
                    )}
                </div>
            </div>
        );

        // Geolocation/IP section
        const geo = result.checks.gps_reverse_check || {};
        const dist = result.checks.distance_integrity || {};
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto text-gray-900">
                    {/* Header */}
                    <div className={`p-6 ${result.success ? 'bg-green-50' : 'bg-red-50'} border-b`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {result.success ? (
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                ) : (
                                    <XCircle className="w-8 h-8 text-red-600" />
                                )}
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {result.success ? 'Verification Successful' : 'Verification Failed'}
                                    </h2>
                                    <p className="text-gray-600">ID: {result.verification_id}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`text-3xl font-bold ${getScoreColor(result.overall_score)}`}>
                                    {result.overall_score}%
                                </div>
                                <p className="text-sm text-gray-600">Overall Score</p>
                            </div>
                        </div>
                    </div>

                    {/* Geolocation/IP Section */}
                    <div className="p-6 border-b bg-gray-50">
                        <h4 className="text-lg font-semibold mb-2 text-gray-900">IP & Geolocation</h4>
                        <div className="mb-1">User IP: <span className="font-mono text-blue-700">{result.ip || geo.ip || 'N/A'}</span></div>
                        <div className="mb-1">Location: <span className="text-gray-800">{geo.city || 'Unknown City'}, {geo.region || 'Unknown Region'}, {geo.country || 'Unknown Country'}</span></div>
                        <div className="mb-1">ISP: <span className="text-gray-800">{geo.isp || 'Unknown ISP'}</span></div>
                        <div className="mb-1">Distance Integrity: <span className={dist.passed ? 'text-green-700' : 'text-red-700'}>{dist.passed ? 'Within acceptable range' : 'Too far from address'}</span></div>
                        <div className="mb-1">Details: <span className="text-gray-800">{dist.details || geo.details}</span></div>
                    </div>

                    {/* Utility Bill Section */}
                    <div className="p-6 border-b">
                        {renderDocSection('Utility Bill', result.checks.utility_bill, utilityBillUrl || undefined)}
                    </div>

                    {/* ID Document Section */}
                    <div className="p-6 border-b">
                        {renderDocSection('ID Document', result.checks.id_document, idDocumentUrl || undefined)}
                    </div>

                    {/* Zoning/Cadastral Section */}
                    <div className="p-6 border-b">
                        <h4 className="text-lg font-semibold mb-2 text-gray-900">LandVerify Advanced Checks</h4>
                        <div className="mb-1">Status: {
                          result.checks.zoning_cadastral.status === 'submitted' ? (
                            <span className="text-yellow-700">Submitted</span>
                          ) : result.checks.zoning_cadastral.passed ? (
                            <span className="text-green-700">Passed</span>
                          ) : (
                            <span className="text-green-700">Submitted</span>
                          )
                        }</div>
                        <div className="mb-1">Score: <span className="font-bold text-gray-900">{result.checks.zoning_cadastral.score}%</span></div>
                        <div className="mb-1">Confidence: <span className="font-bold text-gray-900">{result.checks.zoning_cadastral.confidence}%</span></div>
                        <div className="mb-1">Details: <span className="text-gray-800">{result.checks.zoning_cadastral.details}</span></div>
                    </div>

                    {/* Recommendations */}
                    {result.recommendations && result.recommendations.length > 0 && (
                        <div className="p-6 border-b">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
                                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                Recommendations
                            </h3>
                            <ul className="space-y-2">
                                {result.recommendations.map((rec, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                                        <span className="text-gray-800">{rec}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="p-6 flex justify-end gap-3">
                        <button
                            onClick={() => setShowResults(false)}
                            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                        >
                            Close
                        </button>
                        <button
                            onClick={() => handleSubmit()}
                            className={`px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <span className="flex items-center">
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Verifying...
                                </span>
                            ) : (
                                'Resubmit'
                            )}
                        </button>
                        <button
                            onClick={() => {
                                setShowResults(false);
                                setVerificationResult(null);
                                setFormData({
                                    full_name: '',
                                    phone_number: '',
                                    email: '',
                                    nin_or_bvn: '',
                                    typed_address: '',
                                    utility_bill: null,
                                    id_document: null,
                                    land_document: null,
                                    info_consent: false,
                                    data_consent: false
                                });
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            New Verification
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // If verification results are showing, render the ResultsDisplay
    if (showResults && verificationResult) {
        return <ResultsDisplay result={verificationResult} />;
    }

    // Main form rendering
    return (
        <div className="max-w-2xl mx-auto p-6 bg-white shadow-lg rounded-lg">
            {isSubmitting && <LoadingOverlay />}

            <div className="mb-8 text-center">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Address Verification</h1>
                <p className="text-gray-600">Fill out the form below to verify your address using documents.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information Section */}
                <div className="p-6 border border-gray-200 rounded-lg bg-gray-50">
                    <h2 className="text-xl font-semibold mb-5 text-gray-800 border-b pb-3">1. Personal Information</h2>

                    <div>
                        <label htmlFor="full_name" className="block text-sm font-medium text-gray-800 mb-1">
                            Full Name *
                        </label>
                        <input
                            type="text"
                            id="full_name"
                            value={formData.full_name}
                            onChange={(e) => handleInputChange('full_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                            placeholder="Enter your full name"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="phone_number" className="block text-sm font-medium text-gray-800 mb-1">
                            Phone Number *
                        </label>
                        <input
                            type="tel"
                            id="phone_number"
                            value={formData.phone_number}
                            onChange={(e) => handleInputChange('phone_number', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                            placeholder="+234..."
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-800 mb-1">
                            Email Address *
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                            placeholder="your.email@example.com"
                            required
                        />
                    </div>
{/*
                    <div>
                        <label htmlFor="nin_or_bvn" className="block text-sm font-medium text-gray-800 mb-1">
                            NIN or BVN (Optional)
                        </label>
                        <input
                            type="text"
                            id="nin_or_bvn"
                            value={formData.nin_or_bvn}
                            onChange={(e) => handleInputChange('nin_or_bvn', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                            placeholder="For future verification tiers"
                        />
                    </div>

                    */}
                </div>

                {/* Address Information Section */}
                <div className="p-6 border border-gray-200 rounded-lg bg-gray-50">
                    <h2 className="text-xl font-semibold mb-5 text-gray-800 border-b pb-3">2. Address Information</h2>

                    <div>
                        <label htmlFor="typed_address" className="block text-sm font-medium text-gray-700 mb-1">
                            Address *
                        </label>
                        <textarea
                            id="typed_address"
                            value={formData.typed_address}
                            onChange={(e) => handleInputChange('typed_address', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                            placeholder="Enter the complete address (e.g., 10 Ogudu Road, Lagos)"
                            required
                        />
                    </div>
                </div>

                {/* Document Upload Section */}
                <div className="p-6 border border-gray-200 rounded-lg bg-gray-50">
                    <h2 className="text-xl font-semibold mb-5 text-gray-800 border-b pb-3">3. Upload Documents</h2>

                    <div>
                        <label htmlFor="utility-bill" className="block text-sm font-medium text-gray-700 mb-2">
                            Utility Bill or relevant land document * (Max 5MB - JPEG, PNG, PDF scans)
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                    if (!e.target.files || e.target.files.length === 0) return;
                                    handleFileUpload('utility_bill', e.target.files[0]);
                                }}
                                className="hidden"
                                id="utility-bill"
                                required
                            />
                            <label htmlFor="utility-bill" className="cursor-pointer">
                                <span className="text-sm text-gray-600">
                                    {formData.utility_bill ? formData.utility_bill.name : 'Click to upload utility bill'}
                                </span>
                            </label>
                        </div>
                        {!formData.utility_bill && (
                            <p className="text-red-500 text-sm mt-2">Utility bill is required.</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="id-document" className="block text-sm font-medium text-gray-700 mb-2">
                            ID Document * (Max 5MB - JPEG, PNG, PDF scans)
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        handleFileUpload('id_document', e.target.files[0]);
                                    }
                                }}
                                className="hidden"
                                id="id-document"
                                required
                            />
                            <label htmlFor="id-document" className="cursor-pointer">
                                <span className="text-sm text-gray-600">
                                    {formData.id_document ? formData.id_document.name : 'Click to upload ID document'}
                                </span>
                            </label>
                        </div>
                        {!formData.id_document && (
                            <p className="text-red-500 text-sm mt-2">ID document is required.</p>
                        )}
                    </div>

                    {/* <div>
                        <label htmlFor="land-document" className="block text-sm font-medium text-gray-700 mb-2">
                            Land Document (Optional, Max 5MB)
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                    if (!e.target.files || e.target.files.length === 0) return;
                                    handleFileUpload('land_document', e.target.files[0]);
                                }}
                                className="hidden"
                                id="land-document"
                            />
                            <label htmlFor="land-document" className="cursor-pointer">
                                <span className="text-sm text-gray-600">
                                    {formData.land_document ? formData.land_document.name : 'Click to upload land document'}
                                </span>
                            </label>
                        </div>
                    </div> */}
                </div>

                {/* Consent Section */}
                <div className="p-6 border border-gray-200 rounded-lg bg-gray-50">
                    <h2 className="text-xl font-semibold mb-5 text-gray-800 border-b pb-3">4. Consent & Confirmation</h2>

                    <div className="space-y-4">
                        <label htmlFor="info_consent" className="flex items-start space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                id="info_consent"
                                checked={formData.info_consent}
                                onChange={(e) => handleInputChange('info_consent', e.target.checked)}
                                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                required
                            />
                            <span className="text-sm text-gray-700">
                                I consent to LandVerify processing my personal information for address verification purposes. *
                            </span>
                        </label>
                        {!formData.info_consent && (
                            <p className="text-red-500 text-sm">Consent is required to proceed.</p>
                        )}

                        <label htmlFor="data_consent" className="flex items-start space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                id="data_consent"
                                checked={formData.data_consent}
                                onChange={(e) => handleInputChange('data_consent', e.target.checked)}
                                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                required
                            />
                            <span className="text-sm text-gray-700">
                                I agree to the <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a> regarding my data. *
                            </span>
                        </label>
                        {!formData.data_consent && (
                            <p className="text-red-500 text-sm">Agreement to terms and policy is required.</p>
                        )}
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-center pt-4">
                    <button
                        type="submit"
                        className={`px-8 py-3 rounded-md text-lg font-semibold transition-colors duration-200 ${
                            isSubmitting ? 'bg-teal-600 cursor-not-allowed' : 'bg-teal-600 text-white hover:bg-teal-700'
                        }`}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <span className="flex items-center">
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Verifying...
                            </span>
                        ) : (
                            'Verify Address'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddressVerificationForm;
