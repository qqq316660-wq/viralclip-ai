import React from 'react';
import { Check, X, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

const COMPARISON_ROWS = [
  {
    feature: 'Pricing Model',
    viralClip: '₹399 One-Time Lifetime',
    opusClip: '$29 / Month ($348 / Year)',
    cloudApps: '$20 to $49 / Month',
    winner: true,
  },
  {
    feature: 'Monthly Video Limit',
    viralClip: 'Unlimited Hours (Zero limits)',
    opusClip: '150 to 300 minutes / month',
    cloudApps: 'Strict token limits',
    winner: true,
  },
  {
    feature: 'Processing Location',
    viralClip: '100% Offline on your PC',
    opusClip: 'Uploads gigabytes to cloud',
    cloudApps: 'Cloud server queues',
    winner: true,
  },
  {
    feature: 'Video Privacy',
    viralClip: '100% Private (Never leaves PC)',
    opusClip: 'Stored on 3rd-party servers',
    cloudApps: 'Stored on 3rd-party servers',
    winner: true,
  },
  {
    feature: 'Custom .SRT Upload',
    viralClip: 'Instant 0s sync (Skips Whisper)',
    opusClip: 'Not supported',
    cloudApps: 'Paywalled',
    winner: true,
  },
  {
    feature: 'Watermark Policy',
    viralClip: 'Zero watermark. 100% clean',
    opusClip: 'Forced on free tiers',
    cloudApps: 'Watermarked',
    winner: true,
  },
  {
    feature: 'Max Export Quality',
    viralClip: '4K / 1080p @ 60 FPS',
    opusClip: '1080p @ 30 FPS',
    cloudApps: '720p on entry plans',
    winner: true,
  },
];

export default function ComparisonTable({ onOpenPayment }) {
  return (
    <section id="comparison" className="py-16 sm:py-24 border-t border-b border-white/[0.06] bg-[#090a0f] relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-semibold">
            Honest Comparison
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold text-white font-['Outfit'] mt-2">
            Why creators choose ViralClip AI over monthly tools
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Stop paying $30 every month for tools that limit your upload minutes.
          </p>
        </div>

        {/* Desktop Comparison Table (Yizerge-Inspired) */}
        <div className="hidden sm:block rounded-2xl border border-white/10 bg-[#0e1118] overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="p-4 sm:px-6 font-semibold text-zinc-400 w-1/3">Feature</th>
                <th className="p-4 sm:px-6 font-bold text-emerald-400 bg-emerald-500/[0.04] border-x border-emerald-500/20 w-1/3">
                  <div className="flex items-center gap-1.5">
                    <span>ViralClip AI</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">₹399 Lifetime</span>
                  </div>
                </th>
                <th className="p-4 sm:px-6 font-semibold text-zinc-400 w-1/3">Cloud Repurposers (Opus, Munch)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {COMPARISON_ROWS.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/[0.01] transition">
                  <td className="p-4 sm:px-6 font-medium text-zinc-300">
                    {row.feature}
                  </td>
                  <td className="p-4 sm:px-6 font-semibold text-white bg-emerald-500/[0.04] border-x border-emerald-500/20">
                    <div className="flex items-center gap-2">
                      <span className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex-shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                      <span>{row.viralClip}</span>
                    </div>
                  </td>
                  <td className="p-4 sm:px-6 text-zinc-400">
                    <div className="flex items-center gap-2">
                      <span className="p-0.5 rounded-full bg-white/5 text-zinc-500 flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </span>
                      <span>{row.opusClip}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Clean Comparison Cards */}
        <div className="sm:hidden space-y-3">
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.03]">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-emerald-500/20">
              <span className="font-bold text-white text-sm">ViralClip AI</span>
              <span className="text-xs font-mono font-bold text-emerald-400">₹399 One-Time</span>
            </div>
            <ul className="space-y-2 text-xs text-zinc-200">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Unlimited videos, zero monthly fees</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>100% offline & private on your PC</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Instant custom .SRT upload (0s sync)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Zero watermarks, 4K & 1080p 60fps export</span>
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-white/10 bg-[#0e1118]">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
              <span className="font-medium text-zinc-400 text-sm">Typical Cloud Tools</span>
              <span className="text-xs font-mono text-zinc-500">$29 - $49 / Month</span>
            </div>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li className="flex items-center gap-2">
                <X className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                <span>150 to 300 minutes limit every month</span>
              </li>
              <li className="flex items-center gap-2">
                <X className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                <span>Uploads gigabytes to external servers</span>
              </li>
              <li className="flex items-center gap-2">
                <X className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                <span>Forced watermarks on entry tiers</span>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </section>
  );
}
