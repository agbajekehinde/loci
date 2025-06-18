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

module.exports = nextConfig;

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

export class LightweightOCR {
  static OCR_SERVICES = {
    GOOGLE_CLOUD: 'google',
    AZURE: 'azure',
    AWS_TEXTRACT: 'aws',
    OCR_SPACE: 'ocrspace', // Free tier available
  };

  // Pre-process image for better OCR results
  static async preprocessImage(imageBuffer) {
    try {
      return await sharp(imageBuffer)
        .resize(2000, 2000, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .greyscale()
        .normalize()
        .sharpen()
        .png({ quality: 100 })
        .toBuffer();
    } catch (error) {
      console.error('Image preprocessing failed:', error);
      return imageBuffer;
    }
  }

  // OCR.Space API implementation (free tier available)
  static async ocrSpaceExtract(imageBuffer) {
    try {
      const processedBuffer = await this.preprocessImage(imageBuffer);
      const base64Image = processedBuffer.toString('base64');
      
      const formData = new FormData();
      formData.append('base64Image', `data:image/png;base64,${base64Image}`);
      formData.append('apikey', process.env.OCR_SPACE_API_KEY || 'helloworld'); // Free key
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('detectOrientation', 'true');
      formData.append('scale', 'true');
      formData.append('OCREngine', '2');

      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.IsErroredOnProcessing) {
        throw new Error(result.ErrorMessage[0] || 'OCR processing failed');
      }

      const text = result.ParsedResults?.[0]?.ParsedText || '';
      const confidence = result.ParsedResults?.[0]?.TextOverlay?.HasOverlay ? 0.8 : 0.6;

      return { text: text.trim(), confidence };
      
    } catch (error) {
      console.error('OCR.Space extraction failed:', error);
      return { text: '', confidence: 0 };
    }
  }

  // Google Cloud Vision API implementation
  static async googleCloudExtract(imageBuffer) {
    if (!process.env.GOOGLE_CLOUD_VISION_API_KEY) {
      throw new Error('Google Cloud Vision API key not configured');
    }

    try {
      const processedBuffer = await this.preprocessImage(imageBuffer);
      const base64Image = processedBuffer.toString('base64');
      
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_VISION_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              image: { content: base64Image },
              features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
              imageContext: {
                languageHints: ['en']
              }
            }],
          }),
        }
      );
      
      const result = await response.json();
      const annotation = result.responses?.[0]?.textAnnotations?.[0];
      
      return {
        text: annotation?.description || '',
        confidence: annotation?.confidence || 0.8
      };
      
    } catch (error) {
      console.error('Google Cloud Vision extraction failed:', error);
      return { text: '', confidence: 0 };
    }
  }

  // Main extraction method with fallbacks
  static async extractText(imageBuffer, documentType = 'generic') {
    const methods = [
      () => this.ocrSpaceExtract(imageBuffer),
      () => this.googleCloudExtract(imageBuffer),
      // Add more fallback methods as needed
    ];

    for (const method of methods) {
      try {
        const result = await method();
        if (result.text && result.confidence > 0.5) {
          console.log(`OCR successful with confidence: ${result.confidence}`);
          return this.cleanText(result.text);
        }
      } catch (error) {
        console.error('OCR method failed, trying next:', error);
      }
    }

    console.warn('All OCR methods failed');
    return '';
  }

  // Clean and normalize extracted text
  static cleanText(text) {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,\-\/()]/g, '')
      .trim();
  }
}

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