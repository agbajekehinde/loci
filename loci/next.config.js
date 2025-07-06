// next.config.js
import CopyWebpackPlugin from 'copy-webpack-plugin';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Move serverComponentsExternalPackages to top level as serverExternalPackages
  serverExternalPackages: ['tesseract.js', 'canvas'],
  experimental: {
    // Other experimental features can go here
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
    
    // Copy WASM files to public directory for static serving (both client and server)
    config.plugins.push(
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'node_modules/.pnpm/tesseract.js-core@6.0.0/node_modules/tesseract.js-core/tesseract-core-simd.wasm',
            to: 'public/wasm/',
          },
          {
            from: 'node_modules/.pnpm/tesseract.js-core@6.0.0/node_modules/tesseract.js-core/tesseract-core.wasm',
            to: 'public/wasm/',
          },
          {
            from: 'node_modules/.pnpm/tesseract.js-core@6.0.0/node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm',
            to: 'public/wasm/',
          },
          {
            from: 'node_modules/.pnpm/tesseract.js-core@6.0.0/node_modules/tesseract.js-core/tesseract-core-lstm.wasm',
            to: 'public/wasm/',
          },
          // Copy to root wasm directory for server-side access
          {
            from: 'node_modules/.pnpm/tesseract.js-core@6.0.0/node_modules/tesseract.js-core/tesseract-core-simd.wasm',
            to: 'wasm/',
          },
          {
            from: 'node_modules/.pnpm/tesseract.js-core@6.0.0/node_modules/tesseract.js-core/tesseract-core.wasm',
            to: 'wasm/',
          },
          {
            from: 'node_modules/.pnpm/tesseract.js-core@6.0.0/node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm',
            to: 'wasm/',
          },
          {
            from: 'node_modules/.pnpm/tesseract.js-core@6.0.0/node_modules/tesseract.js-core/tesseract-core-lstm.wasm',
            to: 'wasm/',
          },
        ],
      })
    );
    
    // Ignore problematic files during build
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      })
    );
    // Ignore test files and directories during build
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/test\//,
        contextRegExp: /.*/,
      })
    );
    // Ignore specific test files
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /05-versions-space\.pdf$/,
        contextRegExp: /.*/,
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
      {
        source: '/wasm/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            key: 'Content-Type',
            value: 'application/wasm',
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
  // Exclude test files from build
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'].filter(ext => !ext.includes('test')),
  // Exclude test directories from build
  distDir: '.next',
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