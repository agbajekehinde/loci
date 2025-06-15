'use client';

import React, { useState } from 'react';
import { MapPin, Upload, Play, CheckCircle, AlertTriangle } from 'lucide-react';

const DemoSection = () => {
  const [activeDemo, setActiveDemo] = useState('individual');
  
  const demoResults = {
    individual: {
      address: "15 Adelabu Street, Surulere, Lagos",
      status: "verified",
      confidence: 95,
      processingTime: "12 seconds",
      details: {
        gpsMatch: true,
        documentMatch: true,
        zoning: "Residential",
        cadastralId: "LAG-SUR-045-B"
      }
    },
    business: {
      address: "Plot 123, Adeola Odeku Street, Victoria Island, Lagos",
      status: "partial",
      confidence: 78,
      processingTime: "8 seconds",
      details: {
        gpsMatch: true,
        documentMatch: false,
        zoning: "Commercial",
        cadastralId: "LAG-VI-123-C"
      }
    }
  };

  const currentDemo = demoResults[activeDemo as keyof typeof demoResults];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            See Loci in Action
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Try our interactive demo to see how quickly and accurately we can verify addresses. 
            Perfect for both individual users and businesses.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Demo Controls */}
          <div className="space-y-6">
            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => setActiveDemo('individual')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeDemo === 'individual'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-blue-600'
                }`}
              >
                Individual
              </button>
              <button
                onClick={() => setActiveDemo('business')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeDemo === 'business'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-blue-600'
                }`}
              >
                Business
              </button>
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-2">
                {activeDemo === "individual" ? "Individual Demo" : "Business Demo"}
              </h3>
              <p className="text-gray-600">{currentDemo.address}</p>
            </div>
            {/* Demo Result Details */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="text-green-500" />
                <span>Status: {currentDemo.status}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Play className="text-blue-500" />
                <span>Processing Time: {currentDemo.processingTime}</span>
              </div>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="text-yellow-500" />
                <span>Confidence: {currentDemo.confidence}%</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="text-red-500" />
                <span>GPS Match: {currentDemo.details.gpsMatch ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Upload className="text-purple-500" />
                <span>Document Match: {currentDemo.details.documentMatch ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
          {/* Demo Display */}
          <div className="bg-gray-100 p-8 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Demo Details</h3>
            <ul className="space-y-2">
              <li>
                <strong>Zoning:</strong> {currentDemo.details.zoning}
              </li>
              <li>
                <strong>Cadastral ID:</strong> {currentDemo.details.cadastralId}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DemoSection;