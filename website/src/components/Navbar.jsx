import React, { useState } from 'react';
import { Menu, X, ArrowRight, Sparkles } from 'lucide-react';
import { InstagramIcon } from './Icons';

export default function Navbar({ onOpenPayment }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#090a0f]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between">
        
        {/* Brand Logo */}
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 bg-[#12151c] flex items-center justify-center p-1 group-hover:border-emerald-500/50 transition">
            <img src="/assets/logo.png" alt="ViralClip AI" className="w-full h-full object-contain" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base sm:text-lg tracking-tight text-white font-['Outfit']">
              ViralClip <span className="text-emerald-400">AI</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full border border-white/10 bg-white/[0.04] text-zinc-400">
              v3.0
            </span>
          </div>
        </a>

        {/* Desktop Nav Items */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-zinc-400">
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#clips" className="hover:text-white transition">Demo Clips</a>
          <a href="#setup-guide" className="hover:text-white transition">Setup Guide</a>
          <a href="#comparison" className="hover:text-white transition">Compare</a>
          <a href="#faq" className="hover:text-white transition">FAQ</a>
          <a href="#pricing" className="hover:text-white transition">Pricing</a>
        </nav>

        {/* Right Action */}
        <div className="hidden sm:flex items-center gap-3">
          <a
            href="https://instagram.com/viral_clip_ai"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full border border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.07] transition"
            title="Follow & DM on Instagram @viral_clip_ai"
          >
            <InstagramIcon className="w-4 h-4 text-zinc-300" />
          </a>

          <button
            onClick={onOpenPayment}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black transition active:scale-95 shadow-sm"
          >
            <span>Get Lifetime — ₹399</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={onOpenPayment}
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500 text-black"
          >
            ₹399
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-zinc-400 hover:text-white rounded-lg border border-white/10 bg-white/[0.03]"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/[0.08] bg-[#0b0d13] px-4 py-4 space-y-3 animate-fadeIn">
          <div className="grid grid-cols-2 gap-2 text-xs font-medium text-zinc-300">
            <a 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
            >
              Features
            </a>
            <a 
              href="#clips" 
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
            >
              Demo Clips
            </a>
            <a 
              href="#setup-guide" 
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
            >
              Setup Guide
            </a>
            <a 
              href="#comparison" 
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
            >
              Compare
            </a>
            <a 
              href="#faq" 
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
            >
              FAQ
            </a>
            <a 
              href="#pricing" 
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
            >
              Pricing (₹399)
            </a>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenPayment();
              }}
              className="w-full py-2.5 rounded-full text-xs font-semibold bg-emerald-500 text-black flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 fill-black" />
              <span>Get Lifetime Access — ₹399</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
