import React from 'react';
import Header from '../components/header';
import AddressVerificationForm from './form';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      < AddressVerificationForm />
    </div>
  );
}