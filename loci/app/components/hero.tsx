'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Shield, Zap, ArrowRight, Play } from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="pt-32 pb-16 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                <Shield className="w-4 h-4" />
                <span>Powered by Advanced GIS Technology and Machine Learning</span>
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Verify Any Nigerian Address in 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600"> Seconds</span>
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed">
                Stop fraud before it starts. Loci combines GPS technology, document verification, 
                and GIS data to instantly validate addresses across Nigeria. Perfect for real estate, 
                banking, and e-commerce.
              </p>
            </div>

            {/* Key Benefits */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Zap className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700">Results in under 30 seconds</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Shield className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700">90%+ fraud detection rate</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700">Lagos & Ogun coverage</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700">Easy API integration</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/demo" 
                className="inline-flex items-center justify-center space-x-2 bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
              >
                <span>Try Free Verification</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              
              <button className="inline-flex items-center justify-center space-x-2 border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors">
                <Play className="w-5 h-5" />
                <span>Watch Demo</span>
              </button>
            </div>

            {/* Trust Indicators
            <div className="pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-4">Trusted by leading Nigerian businesses</p>
              <div className="flex items-center space-x-8 opacity-60">
                <div className="text-lg font-bold text-gray-800">FirstBank</div>
                <div className="text-lg font-bold text-gray-800">Flutterwave</div>
                <div className="text-lg font-bold text-gray-800">Konga</div>
                <div className="text-lg font-bold text-gray-800">RevolutionPlus</div>
              </div>
            </div>
          </div> */}
          </div>

          {/* Right Column - Visual */}
          <div className="relative">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Address Verification</h3>
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white/20 rounded-lg p-4">
                    <div className="text-sm opacity-80 mb-1">Address Input</div>
                    <div className="font-medium">10 Ogudu Road, Lagos State</div>
                  </div>
                  
                  <div className="bg-white/20 rounded-lg p-4">
                    <div className="text-sm opacity-80 mb-1">GPS Coordinates</div>
                    <div className="font-medium">6.5882°N, 3.3878°E</div>
                  </div>
                  
                  <div className="bg-white/20 rounded-lg p-4">
                    <div className="text-sm opacity-80 mb-1">Verification Status</div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="font-medium">VERIFIED</span>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-white/20">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">98%</div>
                      <div className="text-sm opacity-80">Match Score</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">12s</div>
                      <div className="text-sm opacity-80">Process Time</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
              <Shield className="w-8 h-8 text-yellow-800" />
            </div>
            
            <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-green-400 rounded-full flex items-center justify-center">
              <MapPin className="w-6 h-6 text-green-800" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;