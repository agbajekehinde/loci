'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, MapPin, Code,} from 'lucide-react';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 bg-[var(--glass)] dark:bg-[var(--background)] dark:bg-[var(--background)] backdrop-blur-lg border-b border-[var(--card-border)] dark:border-[var(--card-border)] shadow-md z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-9 h-9 bg-gradient-to-r from-teal-600 to-green-600 dark:from-teal-500 dark:to-green-400 rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <MapPin className="w-5 h-5 text-white drop-shadow" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">Loci</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 -mt-1">by LandVerify</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-gray-700 dark:text-gray-200 hover:text-teal-600 dark:hover:text-teal-400 font-medium transition-colors">Features</Link>
            <Link href="#how-it-works" className="text-gray-700 dark:text-gray-200 hover:text-teal-600 dark:hover:text-teal-400 font-medium transition-colors">How it Works</Link>
            <Link href="/docs" className="text-gray-700 dark:text-gray-200 hover:text-teal-600 dark:hover:text-teal-400 font-medium transition-colors flex items-center space-x-1">
              <Code className="w-4 h-4" />
              <span>API Docs</span>
            </Link>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link 
              href="/demo" 
              className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-700 text-white px-5 py-2 rounded-lg font-semibold shadow transition-colors"
            >
              Book a Demo
            </Link>
            <Link 
              href="/dashboard" 
              className="border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-5 py-2 rounded-xl font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shadow"
            >
              API Access
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-7 h-7 text-gray-900 dark:text-white" /> : <Menu className="w-7 h-7 text-gray-900 dark:text-white" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/95 rounded-b-xl shadow-lg mt-2 animate-fade-in">
            <nav className="flex flex-col space-y-4">
              <Link href="#features" className="text-gray-700 dark:text-gray-200 hover:text-teal-600 dark:hover:text-teal-400 font-medium transition-colors">Features</Link>
              <Link href="#how-it-works" className="text-gray-700 dark:text-gray-200 hover:text-teal-600 dark:hover:text-teal-400 font-medium transition-colors">How it Works</Link>
              <Link href="/docs" className="text-gray-700 dark:text-gray-200 hover:text-teal-600 dark:hover:text-teal-400 font-medium transition-colors">API Docs</Link>
              <Link href="/pricing" className="text-gray-700 dark:text-gray-200 hover:text-teal-600 dark:hover:text-teal-400 font-medium transition-colors">Pricing</Link>
              <div className="flex flex-col space-y-2 pt-4">
                <Link href="/verify" className="bg-teal-600 hover:bg-green-600 dark:bg-teal-500 dark:hover:bg-green-500 text-white px-4 py-2 rounded-lg text-center font-semibold shadow transition-colors">
                  Verify Address
                </Link>
                <Link href="/dashboard" className="border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-center font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shadow">
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