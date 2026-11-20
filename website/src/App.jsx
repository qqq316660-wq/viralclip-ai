import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import FeatureExplorer from './components/FeatureExplorer';
import ClipShowcase from './components/ClipShowcase';
import SetupGuideSection from './components/SetupGuideSection';
import ComparisonTable from './components/ComparisonTable';
import PricingSection from './components/PricingSection';
import FaqSection from './components/FaqSection';
import Footer from './components/Footer';
import StickyMobileCta from './components/StickyMobileCta';
import PaymentModal from './components/PaymentModal';

export default function App() {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const handleOpenPayment = () => {
    setIsPaymentModalOpen(true);
  };

  const handleClosePayment = () => {
    setIsPaymentModalOpen(false);
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#090a0f] text-[#e2e8f0] relative flex flex-col selection:bg-emerald-500/30 selection:text-emerald-400 pb-16 sm:pb-0">
      {/* Navigation */}
      <Navbar onOpenPayment={handleOpenPayment} />

      {/* Main Content */}
      <main className="flex-1">
        <Hero onOpenPayment={handleOpenPayment} />
        <FeatureExplorer onOpenPayment={handleOpenPayment} />
        <ClipShowcase onOpenPayment={handleOpenPayment} />
        <SetupGuideSection onOpenPayment={handleOpenPayment} />
        <ComparisonTable onOpenPayment={handleOpenPayment} />
        <PricingSection onOpenPayment={handleOpenPayment} />
        <FaqSection />
      </main>

      {/* Footer */}
      <Footer onOpenPayment={handleOpenPayment} />

      {/* Sticky Mobile Bottom Bar */}
      <StickyMobileCta onOpenPayment={handleOpenPayment} />

      {/* Interactive Payment & UPI QR Modal */}
      <PaymentModal 
        isOpen={isPaymentModalOpen} 
        onClose={handleClosePayment} 
      />
    </div>
  );
}
