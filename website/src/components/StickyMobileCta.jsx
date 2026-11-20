import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function StickyMobileCta({ onOpenPayment }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-[#090a0f]/95 backdrop-blur-xl border-t border-white/10 p-3 shadow-2xl">
      <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white font-['Outfit']">ViralClip AI</span>
            <span className="px-1.5 py-0.2 text-[9px] font-mono uppercase bg-emerald-500/15 text-emerald-400 rounded font-semibold border border-emerald-500/20">
              Lifetime
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-extrabold text-white font-['Outfit']">₹399</span>
            <span className="text-[10px] text-zinc-500">One-time payment</span>
          </div>
        </div>

        <button
          onClick={onOpenPayment}
          className="px-5 py-2.5 rounded-full bg-emerald-500 text-black font-semibold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition"
        >
          <span>Get Lifetime</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
