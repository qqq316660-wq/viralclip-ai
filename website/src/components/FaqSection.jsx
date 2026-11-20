import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    q: 'Does it work on ordinary laptops without an expensive GPU?',
    a: 'Yes. ViralClip AI runs on standard Windows 10 and 11 laptops. For machines without a dedicated NVIDIA graphics card, it also includes a free 1-click cloud GPU connection so your laptop never heats up or lags.'
  },
  {
    q: 'Is it really a ₹399 one-time payment? Any hidden monthly fees?',
    a: '100% one-time payment of ₹399. There are zero monthly subscriptions, zero minute limits, and no expiring tokens. Once you own the software, you can render unlimited vertical clips forever.'
  },
  {
    q: 'How does the Custom .SRT Subtitle Upload feature work?',
    a: 'If your video already has subtitles (from YouTube CC or your video editor), simply drag and drop the .srt file. ViralClip AI instantly syncs and trims your video with zero waiting time.'
  },
  {
    q: 'How do I install it on Windows 10 or 11?',
    a: 'You receive a clean, standalone Windows setup installer (.exe). Just double-click to install. No coding, no command line, and no complex configurations required.'
  },
  {
    q: 'What video formats and resolutions can I export?',
    a: 'You can paste any YouTube URL or drop your own MP4, MOV, or MKV files. The software exports crisp vertical 1080×1920 (and up to 4K) at 60 FPS ready for YouTube Shorts, Instagram Reels, and TikTok.'
  },
  {
    q: 'Does ViralClip AI place an unwanted watermark on exported clips?',
    a: 'Never. All exported clips are 100% clean and free of forced app watermarks, so you can post and monetize your content with complete freedom.'
  }
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0);

  const toggle = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-16 sm:py-28 bg-[#090a0f] relative overflow-hidden">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-xl mx-auto mb-10 sm:mb-14">
          <span className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-semibold">
            FAQ
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold text-white font-['Outfit'] mt-2">
            Questions. Answered simply.
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Everything you need to know before installing ViralClip AI. Clean answers, zero fluff.
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-2">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            const numStr = String(idx + 1).padStart(2, '0');
            return (
              <div
                key={idx}
                className="rounded-xl border border-white/[0.08] bg-[#0e1118] transition overflow-hidden"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 text-xs sm:text-sm font-semibold text-white hover:text-emerald-400 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-zinc-500 font-normal">{numStr}</span>
                    <span>{faq.q}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-zinc-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-400' : ''}`} />
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-zinc-400 leading-relaxed border-t border-white/[0.04] pt-3 pl-10 sm:pl-11">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
