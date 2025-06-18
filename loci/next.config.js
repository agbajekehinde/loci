// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable server components
    serverComponentsExternalPackages: ['tesseract.js', 'canvas'],
  },
  // Configure webpack for better WASM handling
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Handle WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    // Add fallbacks for Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    // Handle Tesseract.js specific issues
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });
    // Ignore problematic files during build
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      })
    );
    return config;
  },
  // Configure headers for WASM files
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
  // Configure static file serving
  async rewrites() {
    return [
      {
        source: '/tesseract/:path*',
        destination: 'https://unpkg.com/tesseract.js@5.0.4/dist/:path*',
      },
    ];
  },
};

/*
// Alternative configuration for Vercel deployment
// vercel.json
{
  "functions": {
    "app/api/verify-address/route.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cross-Origin-Embedder-Policy",
          "value": "credentialless"
        },
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin"
        }
      ]
    }
  ]
}
// package.json additions/updates
{
  "dependencies": {
    "tesseract.js": "^5.0.4",
    "canvas": "^2.11.2",
    "sharp": "^0.33.0"
  },
  "devDependencies": {
    "@types/canvas": "^2.11.1"
  }
}
// Alternative lightweight OCR implementation using Sharp + external APIs
// app/api/verify-address/lightweight-ocr.ts
import sharp from 'sharp';
*/

/**
 * @typedef {Object} OCRResult
 * @property {string} text
 * @property {number} confidence
 */

// Environment variables template (.env.local)
/*
# OCR Service API Keys (choose one or multiple for fallbacks)
OCR_SPACE_API_KEY=your_ocr_space_key_here
GOOGLE_CLOUD_VISION_API_KEY=your_google_vision_key_here
AZURE_COMPUTER_VISION_KEY=your_azure_key_here
AZURE_COMPUTER_VISION_ENDPOINT=your_azure_endpoint_here
AWS_ACCESS_KEY_ID=your_aws_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_here
AWS_REGION=us-east-1
*/

// LightweightOCR class using ES module syntax
export class LightweightOCR {
  constructor() {
    this.apiKey = process.env.OCR_SPACE_API_KEY;
  }

  async processImage(imageBuffer) {
    // Implementation here
    try {
      // Your OCR logic
      return {
        text: '',
        confidence: 0
      };
    } catch (error) {
      console.error('OCR processing failed:', error);
      throw error;
    }
  }
}

// Export using ES module syntax
export default nextConfig;