import React from 'react';
import { TrendingUp, Users, Globe, Clock } from 'lucide-react';

const StatsSection = () => {
  const stats = [
    {
      icon: TrendingUp,
      value: '10M+',
      label: 'Addresses Verified',
      description: 'Across Lagos and Ogun States'
    },
    {
      icon: Users,
      value: '500+',
      label: 'Businesses Trust Us',
      description: 'Banks, Real Estate, E-commerce'
    },
    {
      icon: Globe,
      value: '99.9%',
      label: 'Uptime Guarantee',
      description: 'Enterprise-grade reliability'
    },
    {
      icon: Clock,
      value: '<30s',
      label: 'Average Response',
      description: 'Lightning-fast verification'
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Trusted by Nigeria&apos;s Leading Companies
          </h2>
          <p className="text-lg text-gray-600">
            Our GIS-powered verification has prevented millions in fraud across industries
          </p>
        </div>
        
        <div className="grid md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <stat.icon className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-2">{stat.value}</div>
              <div className="text-lg font-semibold text-gray-700 mb-1">{stat.label}</div>
              <div className="text-sm text-gray-500">{stat.description}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;