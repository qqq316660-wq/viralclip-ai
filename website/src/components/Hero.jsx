import React from 'react';
import { ArrowRight, Play, Check, ShieldCheck, Zap, Laptop, Sparkles, Subtitles, Video, Maximize } from 'lucide-react';

export default function Hero({ onOpenPayment }) {
  return (
    <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-28 overflow-hidden w-full">
      {/* Subtle, soft ambient background gradient (Not eye-straining) */}
      <div 
        aria-hidden="true" 
        className="absolute inset-x-0 top-0 -z-10 h-[500px] pointer-events-none opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]"
        style={{
          background: 'radial-gradient(ellipse at 50% -20%, rgba(16, 185, 129, 0.15) 0%, rgba(9, 10, 15, 0) 70%)'
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Minimalist Pill */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-xs font-medium text-zinc-300 shadow-sm backdrop-blur-md">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-zinc-200">ViralClip Studio v3.0</span>
            <span className="text-zinc-600">·</span>
            <span className="text-emerald-400 font-semibold">₹399 Lifetime Access</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-400 hidden sm:inline">Windows 10 / 11 Native</span>
          </div>
        </div>

        {/* Hero Title */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white font-['Outfit'] leading-[1.08]">
            Turn long videos into <span className="text-emerald-400">viral vertical clips</span> in clicks.
          </h1>

          <p className="mt-5 text-sm sm:text-lg text-zinc-400 max-w-2xl mx-auto font-normal leading-relaxed">
            Film once in widescreen. Auto-frame your footage, generate animated word-by-word karaoke subtitles, and export in 4K — 100% offline on your Windows PC.
          </p>

          {/* Clean Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onOpenPayment}
              className="w-full sm:w-auto px-7 py-3.5 rounded-full text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-black transition active:scale-95 flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Get Lifetime Access — ₹399</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="#setup-guide"
              className="w-full sm:w-auto px-6 py-3.5 rounded-full text-sm font-medium border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-200 transition flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5 text-red-500 fill-red-500" />
              <span>Watch Setup Tutorial</span>
            </a>
          </div>

          {/* Micro trust note */}
          <p className="mt-4 text-[11px] text-zinc-500 font-normal">
            One-time payment · Zero recurring subscriptions · Instant setup via Instagram @viral_clip_ai
          </p>
        </div>

        {/* Product Visual Container (Clean Yizerge-Style Window Card) */}
        <div className="mt-12 sm:mt-16 relative mx-auto max-w-5xl">
          <div className="rounded-2xl border border-white/10 bg-[#0c0e14] p-2 sm:p-3 shadow-2xl">
            {/* Window Top Bar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] text-xs text-zinc-500 mb-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/10 inline-block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-white/10 inline-block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-white/10 inline-block"></span>
                </div>
                <span className="font-mono text-[11px] text-zinc-400 ml-2">ViralClip AI Studio v3.0</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Local Engine Active
                </span>
              </div>
            </div>

            {/* App Preview Image */}
            <div className="relative aspect-video sm:aspect-[16/9.5] w-full overflow-hidden rounded-xl bg-black border border-white/5">
              <img
                src="/assets/product/Screenshot 2026-11-17 205008.png"
                alt="ViralClip AI Studio Editor Interface"
                className="w-full h-full object-cover object-top"
              />

              {/* Minimal floating feature tags */}
              <div className="absolute top-3 left-3 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-xs text-zinc-200">
                <Subtitles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Word-by-word karaoke subtitles</span>
              </div>

              <div className="absolute bottom-3 right-3 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-xs text-zinc-200">
                <Maximize className="w-3.5 h-3.5 text-emerald-400" />
                <span>Smart 9:16 Canvas & Ambient Blur</span>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Strip (TikTok, Shorts, Reels, X) */}
        <div className="mt-12 pt-8 border-t border-white/[0.06] text-center">
          <p className="text-xs uppercase font-mono tracking-wider text-zinc-500 mb-4">
            Export once · Formatted for every vertical feed
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-medium text-zinc-400">
            <span className="px-3.5 py-1.5 rounded-full border border-white/5 bg-white/[0.02]">
              YouTube Shorts (1080×1920)
            </span>
            <span className="px-3.5 py-1.5 rounded-full border border-white/5 bg-white/[0.02]">
              Instagram Reels (Safe UI zones)
            </span>
            <span className="px-3.5 py-1.5 rounded-full border border-white/5 bg-white/[0.02]">
              TikTok (High-retention 60fps)
            </span>
            <span className="px-3.5 py-1.5 rounded-full border border-white/5 bg-white/[0.02]">
              Snapchat Spotlight
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}
