import React, { useState } from 'react';
import { Smartphone, Subtitles, Layers, FileText, Download, Check, Sparkles, ArrowRight } from 'lucide-react';

const STEPS = [
  {
    id: 'framing',
    number: '01',
    label: 'Auto-Framing & Canvas',
    icon: Smartphone,
    title: 'Widescreen to 9:16 vertical without re-editing.',
    description: 'Stop manually moving keyframes across a Premiere Pro timeline. ViralClip AI reframes your footage, detects speakers, and fills vertical margins automatically.',
    bulletPoints: [
      'Instant 9:16 vertical crops with smart speaker centering',
      'Ambient blurred mirror canvas fills letterboxes seamlessly',
      'Split-screen layouts for multi-speaker podcasts and reaction videos',
      'Live safe-zone preview for TikTok and Instagram Reels buttons'
    ],
    image: '/assets/product/Screenshot 2026-11-17 205008.png'
  },
  {
    id: 'captions',
    number: '02',
    label: 'Karaoke Subtitles',
    icon: Subtitles,
    title: 'Word-by-word animated captions people actually watch.',
    description: 'Over 80% of mobile users watch vertical videos on mute. Word-by-word karaoke animations hook viewers in the first 2 seconds and keep them reading till the very end.',
    bulletPoints: [
      'Alex Hormozi & MrBeast pop-in animated word styles',
      'Dynamic highlight colors (yellow, neon green, custom gradients)',
      'Custom .SRT upload: Instant 0-second sync skipping all transcription wait time',
      'Auto-positioned inside safe areas so UI buttons never hide text'
    ],
    image: '/assets/product/Screenshot 2026-11-17 205023.png'
  },
  {
    id: 'hooks',
    number: '03',
    label: 'Hook Detection',
    icon: Layers,
    title: 'Find the viral moment in a 1-hour video.',
    description: 'ViralClip analyzes speech pacing and high-interest spikes to automatically extract the most exciting 30-to-60 second clips from full podcasts and live streams.',
    bulletPoints: [
      'Auto-detects opening hooks with high retention scores',
      'Slider to extract 1 to 20 shorts in a single batch',
      'Pins punchline headline banners above the video automatically',
      'Exports ready-to-post vertical MP4s'
    ],
    image: '/assets/product/Screenshot 2026-11-17 205113.png'
  },
  {
    id: 'offline',
    number: '04',
    label: '100% Offline & Private',
    icon: Download,
    title: 'Runs on your PC. No monthly subscriptions, no queues.',
    description: 'Cloud websites charge $30/month and make you wait in line for servers. ViralClip AI runs directly on your Windows PC with unlimited lifetime rendering.',
    bulletPoints: [
      '100% private: your footage never leaves your computer',
      'Zero minute limits: render 10 minutes or 50 hours of content',
      'Zero forced watermarks: export 100% clean clips ready to monetize',
      'Free GPU bridge included for fast processing on any laptop'
    ],
    image: '/assets/product/Screenshot 2026-11-17 204935.png'
  }
];

export default function FeatureExplorer({ onOpenPayment }) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const activeStep = STEPS[activeStepIndex];

  return (
    <section id="features" className="py-16 sm:py-28 bg-[#090a0f] relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-semibold">
            How It Works
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold text-white font-['Outfit'] mt-2">
            Everything vertical creators need. Zero bloat.
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-zinc-400 leading-relaxed">
            From raw widescreen video to viral vertical short in 4 simple steps.
          </p>
        </div>

        {/* Feature Navigation Tabs */}
        <div className="flex items-center justify-center gap-2 mb-10 overflow-x-auto no-scrollbar pb-2">
          {STEPS.map((step, idx) => {
            const isSelected = activeStepIndex === idx;
            const Icon = step.icon;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStepIndex(idx)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 border ${
                  isSelected
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-sm'
                    : 'bg-white/[0.02] text-zinc-400 border-white/5 hover:border-white/15 hover:text-white'
                }`}
              >
                <span className="font-mono text-[10px] text-zinc-500">{step.number}</span>
                <Icon className="w-3.5 h-3.5" />
                <span>{step.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Feature Display Card (Minimalist split preview) */}
        <div className="rounded-2xl border border-white/10 bg-[#0e1118] p-6 sm:p-8 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Info Column */}
            <div className="lg:col-span-6 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] text-xs font-mono text-emerald-400">
                <span>Step {activeStep.number}</span>
                <span className="text-zinc-600">·</span>
                <span>{activeStep.label}</span>
              </div>

              <h3 className="text-xl sm:text-3xl font-bold text-white font-['Outfit'] leading-tight">
                {activeStep.title}
              </h3>

              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                {activeStep.description}
              </p>

              {/* Bullet Points */}
              <ul className="space-y-2.5 pt-2 border-t border-white/[0.06]">
                {activeStep.bulletPoints.map((point, pIdx) => (
                  <li key={pIdx} className="flex items-start gap-2.5 text-xs text-zinc-300">
                    <span className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-3">
                <button
                  onClick={onOpenPayment}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black transition"
                >
                  <span>Get Lifetime Access — ₹399</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right Visual Column (Clean Window Preview) */}
            <div className="lg:col-span-6">
              <div className="rounded-xl border border-white/10 bg-black/60 p-2 shadow-2xl overflow-hidden">
                <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-white/[0.06] mb-2">
                  <span className="w-2 h-2 rounded-full bg-white/15"></span>
                  <span className="w-2 h-2 rounded-full bg-white/15"></span>
                  <span className="w-2 h-2 rounded-full bg-white/15"></span>
                  <span className="text-[10px] font-mono text-zinc-500 ml-2">Studio Preview</span>
                </div>
                <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black">
                  <img
                    src={activeStep.image}
                    alt={activeStep.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
