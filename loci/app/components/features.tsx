import React from 'react';
import { MapPin, FileText, Shield, Zap, Globe, Users } from 'lucide-react';

const FeaturesSection = () => {
  const features = [
    {
      icon: MapPin,
      title: 'GPS-Powered Verification',
      description: 'Precise location matching using advanced GPS technology and reverse geocoding to ensure address accuracy.',
      color: 'blue'
    },
    {
      icon: FileText,
      title: 'Document Analysis',
      description: 'AI-powered OCR extracts and validates information from utility bills, IDs, and land documents.',
      color: 'green'
    },
    {
      icon: Shield,
      title: 'Fraud Detection',
      description: 'Advanced algorithms detect document tampering, address reuse, and suspicious submission patterns.',
      color: 'red'
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Get verification results in under 30 seconds with our optimized processing pipeline.',
      color: 'yellow'
    },
    {
      icon: Globe,
      title: 'GIS Integration',
      description: 'Access cadastral IDs, zoning information, and official land records for comprehensive verification.',
      color: 'purple'
    },
    {
      icon: Users,
      title: 'Multi-User Support',
      description: 'Perfect for individuals, businesses, and developers with scalable API access and bulk processing.',
      color: 'indigo'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      red: 'bg-red-100 text-red-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      purple: 'bg-purple-100 text-purple-600',
      indigo: 'bg-indigo-100 text-indigo-600'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <section id="features" className="py-20 dark:bg-[var(--background)] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-[var(--foreground)] mb-4">
            Everything You Need for Property Verification
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Our comprehensive platform combines cutting-edge technology with local expertise 
            to deliver the most accurate land and property data verification in Nigeria.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="group p-6 rounded-xl border border-[var(--card-border)] dark:border-[var(--card-border)] bg-[var(--card)] dark:bg-[var(--card)] hover:shadow-xl transition-all duration-300 backdrop-blur-md">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${getColorClasses(feature.color)}`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-[var(--foreground)] mb-3">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Feature Highlight */}
        <div className="mt-16 bg-gradient-to-r from-teal-800/90 to-gray-800/90 dark:from-teal-900/90 dark:to-gray-900/90 rounded-2xl p-8 text-white shadow-xl backdrop-blur-md">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-4">Ready for Enterprise Scale</h3>
              <p className="text-blue-100 mb-6">
                Our API handles millions of requests with enterprise-grade security, 
                comprehensive documentation, and 24/7 support for mission-critical applications.
              </p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>99.9% uptime SLA</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Enterprise security & compliance</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Dedicated support team</span>
                </div>
              </div>
            </div>
            <div className="bg-white/20 rounded-xl p-6">
              <div className="text-sm opacity-80 mb-2">API Response Example</div>
              <div className="bg-black/20 rounded p-3 text-sm font-mono">
                <div className="text-green-300">{`{`}</div>
                <div className="ml-4 text-blue-200">&quot;status&quot;: &quot;verified&quot;,</div>
                <div className="ml-4 text-blue-200">&quot;confidence&quot;: 0.98,</div>
                <div className="ml-4 text-blue-200">&quot;zoning&quot;: &quot;residential&quot;,</div>
                <div className="ml-4 text-blue-200">&quot;cadastral_id&quot;: &quot;LAG-03-B&quot;</div>
                <div className="text-green-300">{`}`}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;