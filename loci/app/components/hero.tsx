'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Shield, Zap, ArrowRight, Play, CheckCircle, Star } from 'lucide-react';

const HeroSection = () => {
  // Floating verification badges data
  const floatingBadges = [
    { top: '15%', left: '10%', delay: '0s' },
    { top: '25%', left: '85%', delay: '1s' },
    { top: '45%', left: '90%', delay: '2s' },
    { top: '65%', left: '8%', delay: '3s' },
    { top: '80%', left: '85%', delay: '4s' },
    { top: '70%', left: '15%', delay: '5s' },
  ];

  return (
    <>
      <section className="relative min-h-screen overflow-hidden">
        {/* Enhanced floating verification badges - more visible and nicer */}
        {floatingBadges.map((badge, index) => (
          <div
            key={index}
            className="absolute w-14 h-14 bg-gradient-to-br from-green-100 to-teal-100 dark:from-green-800 dark:to-teal-800 rounded-full flex items-center justify-center opacity-15 animate-bounce shadow-xl border-2 border-white dark:border-gray-700 backdrop-blur-sm"
            style={{
              top: badge.top,
              left: badge.left,
              animationDelay: badge.delay,
              animationDuration: '3s'
            }}
          >
            <CheckCircle className="w-7 h-7 text-teal-600 dark:text-teal-400" />
          </div>
        ))}

        {/* Nigerian map silhouette */}
        <div className="absolute right-8 top-1/2 transform -translate-y-1/2 opacity-8 pointer-events-none">
          <div 
            className="w-80 h-80 bg-gradient-to-br from-teal-600/10 to-green-500/10 animate-pulse"
            style={{ 
              clipPath: 'polygon(20% 8%, 25% 5%, 35% 8%, 45% 12%, 55% 8%, 65% 12%, 75% 8%, 80% 15%, 85% 25%, 88% 35%, 85% 45%, 88% 55%, 85% 65%, 80% 75%, 75% 82%, 65% 85%, 55% 88%, 45% 85%, 35% 88%, 25% 85%, 20% 78%, 15% 68%, 12% 58%, 15% 48%, 12% 38%, 15% 28%, 18% 18%)',
              animationDuration: '8s'
            }}
          />
        </div>

        {/* Overlay for readability */}
        <div className="bg-white dark:bg-[var(--background)] transition-colors duration-300" />
        
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-start justify-left text-left py-38">
          {/* Content */}
          <div className="space-y-8 w-full">
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm backdrop-blur-sm bg-opacity-80 dark:bg-teal-900 dark:text-teal-200">
                <Shield className="w-4 h-4" />
                <span>Powered by Advanced GIS Technology and Machine Learning</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-8xl font-extrabold text-gray-900 dark:text-white leading-tight whitespace-nowrap text-left">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-green-500 dark:from-teal-400 dark:to-green-300">Verify property data, <br/> Remove risks.</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-700 dark:text-gray-100 leading-relaxed font-medium text-left">
                Stop fraud before it starts. Loci combines GPS technology, document verification, 
                and GIS data to instantly validate addresses across Nigeria. Perfect for real estate,
                banking, and e-commerce.
              </p>
            </div>

                {/* Key Benefits */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Zap className="w-4 h-4 text-teal-600" />
                    </div>
                    <span className="text-gray-600 dark:text-white font-semibold">Results in under 30 seconds</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Shield className="w-4 h-4 text-teal-600" />
                    </div>
                    <span className="text-gray-600 dark:text-white font-semibold">90%+ fraud detection rate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-teal-600" />
                    </div>
                    <span className="text-gray-600 dark:text-white font-semibold">36 States with FCT coverage</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <ArrowRight className="w-4 h-4 text-teal-600" />
                    </div>
                    <span className="text-gray-600 dark:text-white font-semibold">Easy API integration</span>
                  </div>
                </div>

            {/* CTA Buttons */}
            <div className="flex items-center space-x-3 justify-start">
              <Link 
                href="/demo" 
                className="inline-flex items-center justify-center space-x-2 bg-teal-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-teal-700 transition-colors shadow-lg hover:shadow-xl"
              >
                <span>Book a Demo</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              
              <button className="inline-flex items-center justify-center space-x-2 border-2 border-gray-300 text-white-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-white transition-colors backdrop-blur">
                <Play className="w-5 h-5 text-gray-300" />
                <span>Watch Demo</span>
              </button>
            </div>

            {/* Trust indicators with 5 stars */}
            <div className="flex items-center space-x-6 pt-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold">Trusted by leading businesses</span>
              </div>
              <div className="flex space-x-1">
                {[1,2,3,4,5].map((star) => (
                  <Star key={star} className="w-4 h-4 text-yellow-400 fill-current" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default HeroSection;