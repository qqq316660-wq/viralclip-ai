import React, { useState } from 'react';
import { Play, CheckCircle2, Clock, ExternalLink, ArrowRight } from 'lucide-react';
import { YoutubeIcon } from './Icons';

export default function SetupGuideSection({ onOpenPayment }) {
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const videoUrl = "https://www.youtube.com/embed/_V4085Ao0cE?autoplay=1";
  const directYtLink = "https://youtu.be/_V4085Ao0cE?si=c2iVPNh94IQs-7cp";
  const channelLink = "https://www.youtube.com/@Viral_ClipAi";

  return (
    <section id="setup-guide" className="py-16 sm:py-24 bg-[#090a0f] border-t border-b border-white/[0.06] relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <span className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-semibold">
            Video Tutorial
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold text-white font-['Outfit'] mt-2">
            Watch full walkthrough & setup guide
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-zinc-400 leading-relaxed">
            See the exact installation process, feature tour, and output quality in our step-by-step video.
          </p>
        </div>

        {/* Video Card Container */}
        <div className="max-w-4xl mx-auto bg-[#0e1118] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          
          {/* Main Video Viewport / Thumbnail */}
          <div className="relative aspect-video w-full bg-black overflow-hidden group">
            {isPlayingVideo ? (
              <iframe
                src={videoUrl}
                title="Viral Clip AI Explanation And Setup"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div 
                className="relative w-full h-full cursor-pointer"
                onClick={() => setIsPlayingVideo(true)}
              >
                <img 
                  src="/assets/yt_guide_thumb.png" 
                  alt="Viral Clip AI Setup Tutorial" 
                  className="w-full h-full object-cover"
                />
                
                {/* Subtle Vignette Overlay */}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition flex items-center justify-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-xl transition-transform duration-200 group-hover:scale-105">
                    <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-white ml-1" />
                  </div>
                </div>

                {/* Duration Badge */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md text-white font-mono text-[11px] border border-white/10">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  <span>Full Setup Walkthrough</span>
                </div>
              </div>
            )}
          </div>

          {/* Video Metadata Footer */}
          <div className="p-5 sm:p-6 bg-[#0e1118]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4 mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white font-['Outfit']">
                  Viral Clip AI: Explanation & Step-By-Step Setup
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Official tutorial by <strong className="text-zinc-200">@Viral_ClipAi</strong>
                </p>
              </div>

              {/* External Links */}
              <div className="flex items-center gap-2">
                <a
                  href={directYtLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition flex items-center gap-1.5"
                >
                  <YoutubeIcon className="w-3.5 h-3.5 text-red-500" />
                  <span>Watch on YouTube</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <a
                  href={channelLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 text-xs font-medium transition flex items-center gap-1.5"
                >
                  <span>Channel</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Quick Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-300">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Zero-to-one Windows software setup walkthrough</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Instant .SRT upload & 0-second sync demo</span>
              </div>
            </div>

            {/* In-guide CTA */}
            <div className="mt-4 pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-zinc-400 text-center sm:text-left">
                Get full access to the software with all features unlocked.
              </span>
              <button
                onClick={onOpenPayment}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Get ViralClip AI — ₹399</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
