'use client';

import React from 'react';
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <p className="text-gray-700 text-sm">&copy; 2025 LandVerify Technologies. All rights reserved.</p>
          <nav className="mt-4 md:mt-0">
            <ul className="flex flex-wrap space-x-4">
              <li>
                <Link href="/about" className="text-gray-700 hover:text-blue-600 text-sm">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-700 hover:text-blue-600 text-sm">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-700 hover:text-blue-600 text-sm">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-4 text-center">
          <p className="text-gray-600 text-sm">
            Made with <span className="text-blue-600 font-semibold">love</span> and <span className="text-purple-600 font-semibold">innovation</span> by Loci.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;