'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search, Shield, Zap, MapPin, ArrowRight, HelpCircle, Clock, CheckCircle } from 'lucide-react';

const FAQPage = () => {
  const [openItems, setOpenItems] = useState<OpenItems>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

interface OpenItems {
    [key: number]: boolean;
}

interface Category {
    id: string;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
}

interface FAQItem {
    id: number;
    category: string;
    question: string;
    answer: string;
}

const toggleItem = (id: number) => {
    setOpenItems((prev: OpenItems) => ({
        ...prev,
        [id]: !prev[id]
    }));
};

  const categories = [
    { id: 'all', name: 'All Questions', icon: HelpCircle },
    { id: 'verification', name: 'Verification Process', icon: Shield },
    { id: 'integration', name: 'API Integration', icon: Zap },
    { id: 'coverage', name: 'Coverage & Accuracy', icon: MapPin },
    { id: 'pricing', name: 'Pricing & Plans', icon: CheckCircle },
    { id: 'support', name: 'Support', icon: Clock }
  ];

  const faqData = [
    {
      id: 1,
      category: 'verification',
      question: 'How does Loci verify property addresses?',
      answer: 'Loci uses a multi-layered verification process combining GPS coordinates, satellite imagery, government databases, and machine learning algorithms. We cross-reference property documents with official land records, validate GPS coordinates against actual property locations, and use advanced image recognition to confirm property existence and characteristics.'
    },
    {
      id: 2,
      category: 'verification',
      question: 'How accurate is the address verification?',
      answer: 'Our verification system achieves over 90% accuracy in fraud detection. We continuously update our databases with government records, satellite imagery, and field verification data to maintain the highest accuracy standards across all 36 states and FCT.'
    },
    {
      id: 3,
      category: 'integration',
      question: 'How easy is it to integrate Loci API?',
      answer: 'Integration is straightforward with our RESTful API. Most developers can complete integration in under 2 hours using our comprehensive documentation, code samples, and SDKs for popular programming languages. We provide sandbox environments for testing before going live.'
    },
    {
      id: 4,
      category: 'integration',
      question: 'What data formats does the API support?',
      answer: 'Our API supports JSON requests and responses, with optional XML support. We accept various input formats including property addresses, GPS coordinates, property documents (PDF, images), and can return detailed verification reports with confidence scores, property details, and verification status.'
    },
    {
      id: 5,
      category: 'coverage',
      question: 'Which areas in Nigeria does Loci cover?',
      answer: 'Loci provides comprehensive coverage across all 36 states and the Federal Capital Territory (FCT). Our database includes urban, suburban, and rural areas with varying levels of detail. Metropolitan areas have the most comprehensive coverage with street-level accuracy.'
    },
    {
      id: 6,
      category: 'coverage',
      question: 'How often is your database updated?',
      answer: 'Our core database is updated weekly with new satellite imagery and government records. Critical updates like new developments or address changes are processed in real-time. We maintain partnerships with relevant government agencies to ensure data freshness.'
    },
    {
      id: 7,
      category: 'pricing',
      question: 'What are your pricing plans?',
      answer: 'We offer flexible pricing based on verification volume: Starter (up to 1,000 verifications/month), Professional (up to 10,000/month), and Enterprise (unlimited with custom features). All plans include API access, documentation, and basic support. Contact us for custom enterprise pricing.'
    },
    {
      id: 8,
      category: 'pricing',
      question: 'Do you offer a free trial?',
      answer: 'Yes! We provide 100 free verifications for new accounts to test our service. No credit card required for the trial. You can explore all features and see verification results before committing to a paid plan.'
    },
    {
      id: 9,
      category: 'verification',
      question: 'How fast are verification results?',
      answer: 'Most verifications are completed within 15-30 seconds. Simple address validations typically take 10-15 seconds, while comprehensive property verifications with document analysis may take up to 45 seconds. Results are delivered via API callback or can be retrieved using our status endpoint.'
    },
    {
      id: 10,
      category: 'support',
      question: 'What support do you provide?',
      answer: 'We offer email support for all plans, with response times of 24 hours for Starter, 12 hours for Professional, and 4 hours for Enterprise. Enterprise customers also get dedicated account management, phone support, and priority technical assistance.'
    },
    {
      id: 11,
      category: 'integration',
      question: 'Can I integrate Loci with my existing systems?',
      answer: 'Absolutely. Our API is designed to integrate seamlessly with CRM systems, banking platforms, e-commerce sites, and real estate applications. We provide webhooks, batch processing capabilities, and can work with your technical team for custom integrations.'
    },
    {
      id: 12,
      category: 'verification',
      question: 'What types of fraud can Loci detect?',
      answer: 'Loci identifies various fraud types including fake addresses, property ownership misrepresentation, document forgery, coordinate manipulation, and non-existent properties. Our ML models are trained to recognize patterns in fraudulent submissions and flag suspicious activities.'
    }
  ];

  const filteredFAQs = faqData.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[var(--background)] transition-colors duration-300">
      {/* Header Section */}
      <section className="relative py-20 bg-[var(--background)] text-white overflow-hidden transition-colors duration-300">
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm mb-6 backdrop-blur-sm">
            <HelpCircle className="w-4 h-4" />
            <span>Frequently Asked Questions</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-green-300">How can we help you?</span>
          </h1>
          
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Find answers to common questions about Loci's address verification service, 
            API integration, and features.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search FAQ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-800/50 text-white placeholder-gray-400 border border-gray-700 backdrop-blur-sm focus:ring-4 focus:ring-teal-500/30 focus:border-teal-500 transition-all duration-300 text-lg"
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 bg-[var(--background)] transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Category Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-lg p-6 sticky top-8 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Categories</h3>
                <div className="space-y-2">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    const isActive = activeCategory === category.id;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setActiveCategory(category.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                          isActive 
                            ? 'bg-teal-600 text-white shadow-lg' 
                            : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-sm font-medium">{category.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* FAQ Content */}
            <div className="lg:col-span-3">
              <div className="space-y-4">
                {filteredFAQs.length === 0 ? (
                  <div className="text-center py-12">
                    <HelpCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-400 mb-2">No results found</h3>
                    <p className="text-gray-500">Try adjusting your search or browse different categories.</p>
                  </div>
                ) : (
                  filteredFAQs.map((item) => (
                    <div
                      key={item.id}
                      className="bg-gray-800/30 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-700/50 hover:border-gray-600"
                    >
                      <button
                        onClick={() => toggleItem(item.id)}
                        className="w-full px-6 py-6 text-left flex items-center justify-between hover:bg-gray-700/30 transition-colors duration-200"
                      >
                        <h3 className="text-lg font-semibold text-white pr-4">
                          {item.question}
                        </h3>
                        {openItems[item.id] ? (
                          <ChevronUp className="w-6 h-6 text-teal-600 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-6 h-6 text-gray-400 flex-shrink-0" />
                        )}
                      </button>
                      
                      {openItems[item.id] && (
                        <div className="px-6 pb-6 border-t border-gray-700/50">
                          <div className="pt-4 text-gray-300 leading-relaxed">
                            {item.answer}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-[var(--background)] transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50">
            <h2 className="text-3xl font-bold text-white mb-4">Still have questions?</h2>
            <p className="text-xl text-gray-300 mb-8">
              Our support team is here to help you get the most out of Loci's verification services.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="inline-flex items-center justify-center space-x-2 bg-teal-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-teal-700 transition-colors shadow-lg">
                <span>Contact Support</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="inline-flex items-center justify-center space-x-2 border-2 border-gray-600 text-gray-300 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-700/30 hover:text-white hover:border-gray-500 transition-colors">
                <span>Schedule Demo</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FAQPage;