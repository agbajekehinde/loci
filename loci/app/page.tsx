import React from 'react';
import Header from './components/header';
import HeroSection from './components/hero';
import StatsSection from './components/stats';
import FeaturesSection from './components/features';
import HowItWorksSection from './components/howitworks';
import DemoSection from './components/demo';
import Footer from './components/footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
      <HeroSection />
      <StatsSection />
      <FeaturesSection/>
      <HowItWorksSection />
      <DemoSection />
      <Footer />
      </main>
    </div>
  );
}