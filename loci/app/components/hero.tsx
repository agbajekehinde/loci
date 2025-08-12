'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Shield, Zap, ArrowRight, Play } from 'lucide-react';

const HeroSection = () => {
  return (
    <>
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden py-10 bg-white dark:bg-[var(--background)] transition-colors duration-300">
        {/* Overlay for readability */}
        <div className="bg-white dark:bg-[var(--background)] transition-colors duration-300" />
        <div className="relative z-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center py-32">
          {/* Content */}
          <div className="space-y-8 w-full">
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm mx-auto backdrop-blur-sm bg-opacity-80 dark:bg-teal-900 dark:text-teal-200">
                <Shield className="w-4 h-4" />
                <span>Powered by Advanced GIS Technology and Machine Learning</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight whitespace-nowrap">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-green-500 dark:from-teal-400 dark:to-green-300">Verify Customer Property <br/> with Confidence</span>
              </h1>
              
              <p className="text-lg md:text-xl text-gray-700 dark:text-gray-100 leading-relaxed font-medium">
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
                <span className="text-gray-600 dark:text-white font-semibold">Results in under 30 seconds</span>
              </div>
              <div className="flex items-center space-x-3 justify-center">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Shield className="w-4 h-4 text-teal-600" />
                </div>
                <span className="text-gray-600 dark:text-white font-semibold">90%+ fraud detection rate</span>
              </div>
              <div className="flex items-center space-x-3 justify-center">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-teal-600" />
                </div>
                <span className="text-gray-600 dark:text-white font-semibold">36 States with FCT coverage</span>
              </div>
              <div className="flex items-center space-x-3 justify-center">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-teal-600" />
                </div>
                <span className="text-gray-600 dark:text-white font-semibold">Easy API integration</span>
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
              
              <button className="inline-flex items-center justify-center space-x-2 border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50/10 transition-colors backdrop-blur">
                <Play className="w-5 h-5 text-teal-300" />
                <span>Watch Demo</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Hero Image Section */}
      <section className="mt-24 dark:bg-[var(--background)] transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-0 sm:px-6 lg:px-0">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl">
            <img 
              src="/hero-dashboard.jpg"
              alt="Loci Address Verification Dashboard showing real-time verification results and analytics"
              className="w-full h-auto object-cover"
            />
            {/* Optional overlay with additional info */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end">
              <div className="p-8 text-white">
                <h3 className="text-2xl font-bold mb-2">Real-time Address Verification</h3>
                <p className="text-gray-200">See how Loci instantly validates addresses with comprehensive data analysis and visual confirmation.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default HeroSection;