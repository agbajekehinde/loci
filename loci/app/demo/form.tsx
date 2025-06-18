'use client';
import React, { useState, useEffect } from 'react';
import { MapPin, Upload, Check, AlertCircle, Loader2, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, Shield, Globe, FileCheck, MapPinIcon } from 'lucide-react';

interface Location {
    latitude: number;
    longitude: number;
    accuracy?: number;
}

interface FormDataType {
    full_name: string;
    phone_number: string;
    email: string;
    nin_or_bvn: string;
    typed_address: string;
    gps_latitude: number | null;
    gps_longitude: number | null;
    utility_bill: File | null;
    id_document: File | null;
    land_document: File | null;
    info_consent: boolean;
    data_consent: boolean;
}

interface CheckResult {
    passed: boolean;
    score: number;
    details: string;
    confidence: number;
}

interface VerificationResult {
    success: boolean;
    overall_score: number;
    verification_id: string;
    checks: {
        gps_reverse_check: CheckResult;
        document_validity: CheckResult;
        address_match: CheckResult;
        distance_integrity: CheckResult;
        zoning_cadastral: CheckResult;
    };
    recommendations?: string[];
    timestamp: string;
}

const AddressVerificationForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [locationStatus, setLocationStatus] = useState<'requesting' | 'granted' | 'denied' | 'unavailable'>('requesting');
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [pinLocation, setPinLocation] = useState<Location | null>(null);
  const [pinDropped, setPinDropped] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormDataType>({
    full_name: '',
    phone_number: '',
    email: '',
    nin_or_bvn: '',
    typed_address: '',
    gps_latitude: null,
    gps_longitude: null,
    utility_bill: null,
    id_document: null,
    land_document: null,
    info_consent: false,
    data_consent: false
  });

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification('LandVerify', {
            body: 'Please allow location access to verify your address',
            icon: '/favicon.ico'
          });
        }
      } catch (error) {
        console.error('Notification permission error:', error);
      }
    }
  };

  useEffect(() => {
    const requestLocation = async () => {
      if (!navigator.geolocation) {
        setLocationStatus('unavailable');
        return;
      }

      await requestNotificationPermission();

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: Location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          setUserLocation(location);
          setLocationStatus('granted');
          
          setPinLocation(location);
          setFormData(prev => ({
            ...prev,
            gps_latitude: location.latitude,
            gps_longitude: location.longitude
          }));

          if (Notification.permission === 'granted') {
            new Notification('Location Access Granted', {
              body: 'Your location has been captured for address verification',
              icon: '/favicon.ico'
            });
          }
        },
        (error) => {
          console.error('Location error:', error);
          setLocationStatus('denied');
          
          if (Notification.permission === 'granted') {
            new Notification('Location Access Denied', {
              body: 'Manual pin drop will be required for verification',
              icon: '/favicon.ico'
            });
          }
        },
        options
      );
    };

    requestLocation();
  }, []);

const handleInputChange = <K extends keyof FormDataType>(field: K, value: FormDataType[K]): void => {
    setFormData(prev => ({
        ...prev,
        [field]: value
    }));
};

interface FileUploadField {
    utility_bill: File | null;
    id_document: File | null;
    land_document: File | null;
}

const handleFileUpload = <K extends keyof FileUploadField>(field: K, file: File | undefined): void => {
    if (file && file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
    }
    
    setFormData(prev => ({
        ...prev,
        [field]: file || null
    }));
};

interface ValidateStepFunction {
    (step: number): boolean;
}

const validateStep: ValidateStepFunction = (step: number): boolean => {
    switch (step) {
        case 1:
            return Boolean(formData.full_name && formData.phone_number && formData.email);
        case 2:
            return Boolean(formData.typed_address && formData.gps_latitude && formData.gps_longitude);
        case 3:
            return Boolean(formData.utility_bill && formData.id_document);
        case 4:
            return Boolean(formData.info_consent && formData.data_consent);
        default:
            return false;
    }
};

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const simulateMapPin = () => {
    const baseLocation = userLocation || { latitude: 6.5244, longitude: 3.3792 };
    const offset = 0.01;
    
    const newPin: Location = {
      latitude: baseLocation.latitude + (Math.random() - 0.5) * offset,
      longitude: baseLocation.longitude + (Math.random() - 0.5) * offset
    };
    
    setPinLocation(newPin);
    setPinDropped(true);
    setFormData(prev => ({
      ...prev,
      gps_latitude: newPin.latitude,
      gps_longitude: newPin.longitude
    }));

    if (Notification.permission === 'granted') {
      new Notification('Location Pin Updated', {
        body: `New coordinates: ${newPin.latitude.toFixed(6)}, ${newPin.longitude.toFixed(6)}`,
        icon: '/favicon.ico'
      });
    }
  };

  const resetToUserLocation = () => {
    if (userLocation) {
      setPinLocation(userLocation);
      setPinDropped(false);
      setFormData(prev => ({
        ...prev,
        gps_latitude: userLocation.latitude,
        gps_longitude: userLocation.longitude
      }));
    }
  };

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

 const handleSubmit = async () => {
  if (!validateStep(4)) return;
  
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
      gps_latitude: formData.gps_latitude!,
      gps_longitude: formData.gps_longitude!,
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
    alert(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    setIsSubmitting(false);
  }
};

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const LocationStatus = () => {
    switch (locationStatus) {
      case 'requesting':
        return (
          <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-3 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Requesting location access...</span>
          </div>
        );
      case 'granted':
        return (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <Check className="w-4 h-4" />
            <span className="text-sm">Location access granted</span>
          </div>
        );
      case 'denied':
        return (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Location access denied - manual pin drop required</span>
          </div>
        );
      case 'unavailable':
        return (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Location services unavailable</span>
          </div>
        );
      default:
        return null;
    }
  };

  const LoadingOverlay = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
              <span>GPS reverse geocoding...</span>
            </div>
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
              <span>Distance integrity verification...</span>
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

  const ResultsDisplay = ({ result }: { result: VerificationResult }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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

        {/* Score Breakdown */}
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold mb-4">Verification Breakdown</h3>
          <div className="grid gap-4">
            {Object.entries(result.checks).map(([key, check]) => {
              const icons = {
                gps_reverse_check: Globe,
                document_validity: FileCheck,
                address_match: MapPinIcon,
                distance_integrity: MapPin,
                zoning_cadastral: Shield
              };
              
              const titles = {
                gps_reverse_check: 'GPS Reverse Check',
                document_validity: 'Document Validity',
                address_match: 'Address Match',
                distance_integrity: 'Distance Integrity',
                zoning_cadastral: 'Zoning & Cadastral'
              };
              
              const Icon = icons[key as keyof typeof icons];
              const title = titles[key as keyof typeof titles];
              
              return (
                <div key={key} className={`p-4 rounded-lg border ${getScoreBgColor(check.score)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{title}</span>
                      {check.passed ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${getScoreColor(check.score)}`}>
                        {check.score}%
                      </span>
                      <span className="text-xs text-gray-500">
                        ({check.confidence}% confidence)
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{check.details}</p>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${check.score >= 80 ? 'bg-green-500' : check.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${check.score}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recommendations */}
        {result.recommendations && result.recommendations.length > 0 && (
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Recommendations
            </h3>
            <ul className="space-y-2">
              {result.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Summary Stats */}
        <div className="p-6 border-b bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(result.checks).filter(c => c.passed).length}
              </div>
              <div className="text-sm text-gray-600">Checks Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {Object.values(result.checks).filter(c => !c.passed).length}
              </div>
              <div className="text-sm text-gray-600">Checks Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(Object.values(result.checks).reduce((sum, c) => sum + c.confidence, 0) / Object.values(result.checks).length)}%
              </div>
              <div className="text-sm text-gray-600">Avg Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-700">
                <Clock className="w-6 h-6 mx-auto" />
              </div>
              <div className="text-sm text-gray-600">
                {new Date(result.timestamp).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 flex justify-end gap-3">
          <button
            onClick={() => setShowResults(false)}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Close
          </button>
          <button
            onClick={() => {
              // Reset form for new verification
              setCurrentStep(1);
              setShowResults(false);
              setVerificationResult(null);
              setFormData({
                full_name: '',
                phone_number: '',
                email: '',
                nin_or_bvn: '',
                typed_address: '',
                gps_latitude: null,
                gps_longitude: null,
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

  if (showResults && verificationResult) {
    return <ResultsDisplay result={verificationResult} />;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white">
      {isSubmitting && <LoadingOverlay />}
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Address Verification</h1>
        <p className="text-gray-600">Verify your address using GPS and documents</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {step}
            </div>
            {step < 4 && (
              <div className={`w-16 h-1 mx-2 ${
                step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Location Status */}
      <LocationStatus />

      {/* Step Content */}
      <div className="mt-6">
        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Personal Information</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => handleInputChange('phone_number', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                placeholder="+234..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                NIN or BVN (Optional)
              </label>
              <input
                type="text"
                value={formData.nin_or_bvn}
                onChange={(e) => handleInputChange('nin_or_bvn', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                placeholder="For future verification tiers"
              />
            </div>
          </div>
        )}

        {/* Step 2: Address Information */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Address Information</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address *
              </label>
              <textarea
                value={formData.typed_address}
                onChange={(e) => handleInputChange('typed_address', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                placeholder="Enter the complete address (e.g., 10 Ogudu Road, Lagos)"
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">GPS Location</h3>
                <div className="flex gap-2">
                  {userLocation && (
                    <button
                      type="button"
                      onClick={resetToUserLocation}
                      className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
                      title="Reset to device location"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={simulateMapPin}
                    className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <MapPin className="w-4 h-4" />
                    Drop Pin
                  </button>
                </div>
              </div>
              
              {pinLocation ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {pinDropped && (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    )}
                    <div className="text-sm text-gray-600">
                      <strong>Latitude:</strong> {pinLocation.latitude.toFixed(6)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Longitude:</strong> {pinLocation.longitude.toFixed(6)}
                  </div>
                  {userLocation && pinDropped && (
                    <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                      📍 Custom pin location set! Distance from device: {
                        Math.round(
                          Math.sqrt(
                            Math.pow((pinLocation.latitude - userLocation.latitude) * 111000, 2) +
                            Math.pow((pinLocation.longitude - userLocation.longitude) * 111000, 2)
                          )
                        )
                      }m
                    </div>
                  )}
                  {userLocation && !pinDropped && (
                    <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                      📱 Using device location
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-4 border-2 border-dashed border-gray-300 rounded">
                  No location selected. Drop a pin to set coordinates.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Document Upload */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Upload Documents</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Utility Bill * (Max 5MB)
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
                />
                <label htmlFor="utility-bill" className="cursor-pointer">
                  <span className="text-sm text-gray-600">
                    {formData.utility_bill ? formData.utility_bill.name : 'Click to upload utility bill'}
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID Document * (Max 5MB)
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
                />
                <label htmlFor="id-document" className="cursor-pointer">
                  <span className="text-sm text-gray-600">
                    {formData.id_document ? formData.id_document.name : 'Click to upload ID document'}
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
            </div>
          </div>
        )}

        {/* Step 4: Consent */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Consent & Confirmation</h2>
            
            <div className="space-y-4">
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={formData.info_consent}
                  onChange={(e) => handleInputChange('info_consent', e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  I confirm that the above information is true and accurate to the best of my knowledge.
                </span>
              </label>

              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={formData.data_consent}
                  onChange={(e) => handleInputChange('data_consent', e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  I consent to the processing of my personal data in accordance with the Nigeria Data Protection Regulation (NDPR) for the purpose of address verification.
                </span>
              </label>
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Verification Summary</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div><strong>Name:</strong> {formData.full_name}</div>
                <div><strong>Address:</strong> {formData.typed_address}</div>
                <div><strong>GPS:</strong> {formData.gps_latitude?.toFixed(6)}, {formData.gps_longitude?.toFixed(6)}</div>
                <div><strong>Documents:</strong> {[formData.utility_bill, formData.id_document, formData.land_document].filter(Boolean).length} uploaded</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        
        {currentStep < 4 ? (
          <button
            onClick={nextStep}
            disabled={!validateStep(currentStep)}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!validateStep(4) || isSubmitting}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Submit Verification'
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default AddressVerificationForm;