import React from 'react';
import { YoutubeIcon, InstagramIcon } from './Icons';

export default function Footer({ onOpenPayment }) {
  return (
    <footer className="border-t border-white/[0.08] bg-[#07080b] text-zinc-500 py-12 sm:py-16 text-xs w-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-10">
          {/* Brand info */}
          <div className="md:col-span-6 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg overflow-hidden border border-white/10 bg-[#12151c] flex items-center justify-center p-1">
                <img src="/assets/logo.png" alt="ViralClip AI" className="w-full h-full object-contain" />
              </div>
              <span className="font-bold text-base text-white font-['Outfit']">
                ViralClip <span className="text-emerald-400">AI</span>
              </span>
            </div>
            <p className="text-zinc-400 max-w-sm leading-relaxed text-xs">
              Standalone Windows video repurposing engine. Turn widescreen videos into viral 9:16 vertical shorts with smart auto-framing, ambient blur mirror, and animated karaoke subtitles.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://instagram.com/viral_clip_ai"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full border border-white/10 bg-white/[0.02] text-zinc-400 hover:text-white transition flex items-center gap-1.5"
              >
                <InstagramIcon className="w-3.5 h-3.5 text-pink-400" />
                <span className="text-zinc-300 font-mono text-[11px]">@viral_clip_ai</span>
              </a>

              <a
                href="https://www.youtube.com/@Viral_ClipAi"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full border border-white/10 bg-white/[0.02] text-zinc-400 hover:text-white transition flex items-center gap-1.5"
              >
                <YoutubeIcon className="w-3.5 h-3.5 text-red-500" />
                <span className="text-zinc-300 font-mono text-[11px]">@Viral_ClipAi</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-2">
            <h4 className="font-semibold text-white text-xs font-mono uppercase tracking-wider">Navigation</h4>
            <ul className="space-y-1.5 text-xs text-zinc-400">
              <li><a href="#features" className="hover:text-white transition">Features</a></li>
              <li><a href="#clips" className="hover:text-white transition">Demo Clips</a></li>
              <li><a href="#setup-guide" className="hover:text-white transition">Setup Tutorial</a></li>
              <li><a href="#comparison" className="hover:text-white transition">Opus vs ViralClip</a></li>
              <li><a href="#faq" className="hover:text-white transition">FAQ</a></li>
              <li><a href="#pricing" className="hover:text-white transition">Pricing (₹399)</a></li>
            </ul>
          </div>

          {/* Direct Buy / Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-semibold text-white text-xs font-mono uppercase tracking-wider">Lifetime Access</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Get the standalone Windows installer with zero monthly fees.
            </p>
            <button
              onClick={onOpenPayment}
              className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition"
            >
              Get Lifetime — ₹399
            </button>
          </div>
        </div>

        <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-600">
          <p>© {new Date().getFullYear()} ViralClip AI Studio. All rights reserved.</p>
          <p>Windows 10 and 11 (64-bit) Compatible</p>
        </div>

      </div>
    </footer>
  );
}
