import React from 'react';
import { Check, ShieldCheck, ArrowRight, Clock } from 'lucide-react';
import { InstagramIcon } from './Icons';

export default function PricingSection({ onOpenPayment }) {
  return (
    <section id="pricing" className="py-16 sm:py-28 bg-[#090a0f] relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-semibold">
            Simple Pricing
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold text-white font-['Outfit'] mt-2">
            Pay once. Create unlimited vertical shorts forever.
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-zinc-400 leading-relaxed">
            No recurring monthly charges. No minutes expiring. One single license gives you full lifetime access on Windows.
          </p>
        </div>

        {/* Minimalist Pricing Card (Yizerge-Inspired) */}
        <div className="max-w-lg mx-auto">
          <div className="rounded-2xl border border-white/10 bg-[#0e1118] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            
            {/* Top Pill */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-6">
              <div>
                <span className="text-xs font-mono font-medium text-emerald-400 uppercase tracking-wider block">
                  Lifetime License
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-['Outfit'] mt-0.5">
                  ViralClip AI Studio Pro
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Windows 10 / 11
              </span>
            </div>

            {/* Price Lockup */}
            <div className="mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black text-white font-['Outfit'] tracking-tight">
                  ₹399
                </span>
                <span className="text-xs font-mono text-zinc-400">INR (One-Time)</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Full standalone software with zero recurring subscription fees.
              </p>
            </div>

            {/* Features Checklist */}
            <ul className="space-y-3 mb-8 text-xs text-zinc-300">
              <li className="flex items-center gap-2.5">
                <span className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span><strong>Standalone Windows Software:</strong> Complete offline installer (.exe)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span><strong>Unlimited Video Renders:</strong> No minutes quota, no monthly credits</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span><strong>Word-by-Word Karaoke Subtitles:</strong> Hormozi & MrBeast bounce presets</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span><strong>Smart 9:16 Canvas:</strong> Ambient blur mirror and automatic speaker centering</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span><strong>Instant Custom .SRT Upload:</strong> 0-second sync skipping transcription</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span><strong>Clean 4K & 1080p Export:</strong> 100% free of forced app watermarks</span>
              </li>
            </ul>

            {/* Primary Action Button */}
            <div className="space-y-3">
              <button
                onClick={onOpenPayment}
                className="w-full py-3.5 rounded-full text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-black transition flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Get Lifetime Access — ₹399</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Instant activation via Instagram @viral_clip_ai</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
