'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Shield, Zap, ArrowRight, Play } from 'lucide-react';

const VIDEO_URL = "/background-vid.mp4";

const HeroSection = () => {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
        src={VIDEO_URL}
      />
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80 z-10" />
      <div className="relative z-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center py-32">
        {/* Content */}
        <div className="space-y-8 w-full">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm mx-auto backdrop-blur-sm bg-opacity-80">
              <Shield className="w-4 h-4" />
              <span>Powered by Advanced GIS Technology and Machine Learning</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight drop-shadow-xl">
              Verify Any Nigerian Address in
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-green-300 drop-shadow-xl"> Seconds</span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-100 leading-relaxed font-medium drop-shadow-lg">
              Stop fraud before it starts. Loci combines GPS technology, document verification, 
              and GIS data to instantly validate addresses across Nigeria. Perfect for real estate, 
              banking, and e-commerce.
            </p>
          </div>

          {/* Key Benefits */}
          <div className="grid sm:grid-cols-2 gap-4 justify-center">
            <div className="flex items-center space-x-3 justify-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Zap className="w-4 h-4 text-teal-600" />
              </div>
              <span className="text-white font-semibold drop-shadow">Results in under 30 seconds</span>
            </div>
            <div className="flex items-center space-x-3 justify-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Shield className="w-4 h-4 text-teal-600" />
              </div>
              <span className="text-white font-semibold drop-shadow">90%+ fraud detection rate</span>
            </div>
            <div className="flex items-center space-x-3 justify-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <MapPin className="w-4 h-4 text-teal-600" />
              </div>
              <span className="text-white font-semibold drop-shadow">Lagos & Ogun coverage</span>
            </div>
            <div className="flex items-center space-x-3 justify-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-teal-600" />
              </div>
              <span className="text-white font-semibold drop-shadow">Easy API integration</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/demo" 
              className="inline-flex items-center justify-center space-x-2 bg-teal-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-teal-700 transition-colors shadow-lg hover:shadow-xl"
            >
              <span>Try Free Verification</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            
            <button className="inline-flex items-center justify-center space-x-2 border-2 border-gray-300 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50/10 transition-colors backdrop-blur">
              <Play className="w-5 h-5 text-teal-300" />
              <span>Watch Demo</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;