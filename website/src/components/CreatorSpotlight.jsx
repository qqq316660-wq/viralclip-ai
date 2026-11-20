import React from 'react';
import { ExternalLink, TrendingUp, CheckCircle, Flame, Video, Award } from 'lucide-react';
import { YoutubeIcon } from './Icons';

export default function CreatorSpotlight({ onOpenPayment }) {
  const channelUrl = "https://youtube.com/@respawnclipzdaily?si=v-Qmdi3N6A5uiEDl";

  return (
    <section id="creator-channel" className="py-12 sm:py-24 relative overflow-hidden w-full max-w-full">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 w-full">
        
        {/* Box Card */}
        <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#141922] to-[#0e1217] border border-[#00f576]/30 p-4 sm:p-10 lg:p-12 shadow-2xl overflow-hidden w-full">
          
          {/* Subtle Accent Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#00f576]/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Creator Channel Info */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00f576]/10 border border-[#00f576]/30 text-[#00f576] text-xs font-bold uppercase tracking-wider">
                <Award className="w-3.5 h-3.5" /> Real Creator Case Study
              </div>

              <h2 className="text-2xl sm:text-4xl font-extrabold text-white font-['Outfit'] leading-tight">
                How <span className="text-[#00f576]">@respawnclipzdaily</span> Scales Daily Shorts With ViralClip AI
              </h2>

              <p className="text-xs sm:text-base text-zinc-300 leading-relaxed">
                Meet one of our verified active users. Instead of hiring video editors or spending ₹3,000/month on cloud tools, this gaming creator repurposes long livestreams and gameplay into multiple high-retention shorts every single day directly through ViralClip AI.
              </p>

              {/* Creator Metrics / Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-[11px] text-zinc-400 font-mono">Upload Cadence</div>
                  <div className="text-lg sm:text-xl font-extrabold text-white font-['Outfit'] mt-0.5">3-5 Shorts / Day</div>
                  <div className="text-[10px] text-emerald-400 font-mono mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> 100% Automated
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-[11px] text-zinc-400 font-mono">Editing Time</div>
                  <div className="text-lg sm:text-xl font-extrabold text-[#00f576] font-['Outfit'] mt-0.5">&lt; 3 Minutes</div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-1">From URL to Ready Video</div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 col-span-2 sm:col-span-1">
                  <div className="text-[11px] text-zinc-400 font-mono">Software Cost</div>
                  <div className="text-lg sm:text-xl font-extrabold text-white font-['Outfit'] mt-0.5">₹99 One-Time</div>
                  <div className="text-[10px] text-emerald-400 font-mono mt-1">₹0 Monthly Subs</div>
                </div>
              </div>

              {/* Verified Link */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
                <a
                  href={channelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm transition shadow-lg shadow-red-600/20 text-center"
                >
                  <YoutubeIcon className="w-4 h-4 fill-white flex-shrink-0" />
                  <span>Inspect @respawnclipzdaily Channel</span>
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                </a>

                <div className="text-xs text-zinc-400 flex items-center justify-center sm:justify-start gap-1.5">
                  <CheckCircle className="w-4 h-4 text-[#00f576] flex-shrink-0" />
                  <span>Real public YouTube channel</span>
                </div>
              </div>

            </div>

            {/* Right Column: Visual Channel Card */}
            <div className="lg:col-span-5">
              <div className="p-5 rounded-2xl bg-[#090b0e] border border-white/10 shadow-xl space-y-4 relative">
                
                {/* Header Mockup */}
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white font-extrabold text-xl shadow">
                    R
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-white text-sm sm:text-base">Respawn Clipz Daily</h4>
                      <CheckCircle className="w-4 h-4 text-[#00f576] fill-[#00f576]/20" />
                    </div>
                    <p className="text-xs text-zinc-400 font-mono">@respawnclipzdaily</p>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-normal">
                  "I was struggling to manually clip my GTA gameplay. With ViralClip AI, I just drop my raw gameplay video, let it auto-score hooks (98+ score), and I get ready shorts with karaoke subtitles in 2 minutes. The lifetime deal saved me thousands."
                </p>

                {/* Clip types showcase */}
                <div className="space-y-2 pt-1 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-zinc-300 flex items-center gap-2">
                      <Video className="w-3.5 h-3.5 text-[#00f576]" /> 100 Days In Realistic GTA
                    </span>
                    <span className="text-xs font-mono font-bold text-[#00f576]">99 Hook</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-zinc-300 flex items-center gap-2">
                      <Video className="w-3.5 h-3.5 text-[#00f576]" /> GTA Police Took My License!
                    </span>
                    <span className="text-xs font-mono font-bold text-[#00f576]">97 Hook</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-zinc-300 flex items-center gap-2">
                      <Video className="w-3.5 h-3.5 text-[#00f576]" /> The Masked Pig Robber
                    </span>
                    <span className="text-xs font-mono font-bold text-[#00f576]">96 Hook</span>
                  </div>
                </div>

                <div className="pt-2 text-center">
                  <span className="text-[11px] text-zinc-500 font-mono">
                    All clips rendered locally with ViralClip AI Studio
                  </span>
                </div>

              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
