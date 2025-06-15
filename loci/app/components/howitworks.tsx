import React from 'react';
import { User, MapPin, FileCheck, CheckCircle } from 'lucide-react';

const HowItWorksSection = () => {
  const steps = [
    {
      icon: User,
      title: 'Enter Details',
      description: 'Provide your personal information and the address you want to verify.',
      details: ['Full name & contact info', 'Address to verify', 'Quick & secure form']
    },
    {
      icon: MapPin,
      title: 'Pin Location',
      description: 'Drop a pin on our interactive map to confirm the exact GPS coordinates.',
      details: ['Interactive map interface', 'GPS coordinate capture', 'Location accuracy check']
    },
    {
      icon: FileCheck,
      title: 'Upload Documents',
      description: 'Submit utility bills, ID documents, and any land certificates for verification.',
      details: ['Utility bill (required)', 'Government ID (required)', 'Land documents (optional)']
    },
    {
      icon: CheckCircle,
      title: 'Get Results',
      description: 'Receive instant verification results with detailed analysis and recommendations.',
      details: ['Verification status', 'Confidence score', 'Fraud risk assessment']
    }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our streamlined process makes address verification simple and fast. 
            Complete verification in just 4 easy steps.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gray-300 z-0">
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-gray-300 rounded-full"></div>
                </div>
              )}
              
              <div className="relative z-10 bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <step.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600 mb-4">{step.description}</p>
                
                <ul className="space-y-1">
                  {step.details.map((detail, idx) => (
                    <li key={idx} className="flex items-center text-sm text-gray-500">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></div>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Process Benefits */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">5-Minute Process</h4>
            <p className="text-gray-600">Complete verification in under 5 minutes with our intuitive interface.</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileCheck className="w-8 h-8 text-blue-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Instant Results</h4>
            <p className="text-gray-600">Get verification results in real-time with detailed analysis reports.</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-purple-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Precise Location</h4>
            <p className="text-gray-600">GPS-accurate verification with cadastral and zoning information.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;