import React from 'react';
import Header from './components/header';
import HeroSection from './components/hero';
import FeaturesSection from './components/features';
import HowItWorksSection from './components/howitworks';
import Footer from './components/footer';
import FAQPage from './components/FAQ';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] dark:bg-[var(--background)] transition-colors duration-300">
      <Header />
      <main>
      <HeroSection />
      <FeaturesSection/>
      <HowItWorksSection />
      <FAQPage />
      
      {/* Hero Section */}
      <Footer />
      </main>
    </div>
  );
}