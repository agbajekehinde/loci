'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, MapPin, Code,} from 'lucide-react';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-green-900 to-green-900 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-gray-900">Loci</span>
              <span className="text-xs text-gray-500 -mt-1">by LandVerify</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-gray-700 hover:text-blue-600 transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-gray-700 hover:text-blue-600 transition-colors">
              How it Works
            </Link>
            <Link href="/docs" className="text-gray-700 hover:text-blue-600 transition-colors flex items-center space-x-1">
              <Code className="w-4 h-4" />
              <span>API Docs</span>
            </Link>
            <Link href="/pricing" className="text-gray-700 hover:text-blue-600 transition-colors">
              Pricing
            </Link>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link 
              href="/verify" 
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
            >
              Verify Address
            </Link>
            <Link 
              href="/dashboard" 
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              API Access
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <nav className="flex flex-col space-y-4">
              <Link href="#features" className="text-gray-700 hover:text-blue-600">Features</Link>
              <Link href="#how-it-works" className="text-gray-700 hover:text-blue-600">How it Works</Link>
              <Link href="/docs" className="text-gray-700 hover:text-blue-600">API Docs</Link>
              <Link href="/pricing" className="text-gray-700 hover:text-blue-600">Pricing</Link>
              <div className="flex flex-col space-y-2 pt-4">
                <Link href="/verify" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-center">
                  Verify Address
                </Link>
                <Link href="/dashboard" className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-center">
                  API Access
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;