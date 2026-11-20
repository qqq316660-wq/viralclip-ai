import React, { useState } from 'react';
import { MessageSquare, CheckCircle, ShieldCheck, Sparkles, Star, Maximize2, Laptop, UserCheck } from 'lucide-react';

const REVIEWS = [
  {
    id: 'hamzeh',
    name: 'Hamzeh',
    handle: '@hamzeh',
    tag: 'Verified User • Active Creator',
    rating: 5,
    chatQuote: '“Nahi bhai you are a great... Working smoothly with GPU T4 x2!”',
    detail: 'Connected free Kaggle T4 GPU bridge on his laptop to run Whisper Large-v3 with zero latency.',
    image: '/assets/reviews/photo_5_2026-11-17_20-36-40.jpg',
    proofType: 'Live Laptop Screen & Chat Proof'
  },
  {
    id: 'sahil',
    name: 'Sahil Alam',
    handle: '@alamxsahil',
    tag: 'Verified Purchaser',
    rating: 5,
    chatQuote: '“Chahiye sir? Haan chahiye... Done.”',
    detail: 'Purchased ViralClip AI Pro Lifetime via UPI (₹99). Active content creator making vertical shorts.',
    image: '/assets/reviews/photo_2_2026-11-17_20-36-40.jpg',
    proofType: 'UPI Payment & Activation Proof'
  },
  {
    id: 'vikas',
    name: 'Vikas Kumar',
    handle: '@vikas_kumar',
    tag: 'Verified Purchaser',
    rating: 5,
    chatQuote: '“Mere pass... Kar raha hu... [₹99 PhonePe Payment Received]”',
    detail: 'Instant payment of ₹99 to Akash Dutta. Setup and standalone installer delivered immediately.',
    image: '/assets/reviews/photo_1_2026-11-17_20-36-40.jpg',
    proofType: 'Direct UPI Transaction Proof'
  },
  {
    id: 'roshan',
    name: 'Roshan',
    handle: '@xxroshan',
    tag: 'Verified Purchaser',
    rating: 5,
    chatQuote: '“Mobile me chalega? No it is for PC/Laptop. Ha chal jaiga... Haan chahiye.”',
    detail: 'Installed on his laptop for fast local video editing without ongoing costs.',
    image: '/assets/reviews/photo_4_2026-11-17_20-36-40.jpg',
    proofType: 'Customer Consultation & Confirmation'
  },
  {
    id: 'hamzeh-setup',
    name: 'Setup Feedback',
    handle: '@hamzeh',
    tag: 'Tutorial Review',
    rating: 5,
    chatQuote: '“Nice video man... Setup was completely straightforward.”',
    detail: 'Followed the YouTube setup tutorial and launched ViralClip AI Studio on his machine seamlessly.',
    image: '/assets/reviews/photo_3_2026-11-17_20-36-40.jpg',
    proofType: 'Setup Guide Feedback & Desktop Setup'
  }
];

export default function ReviewsProof({ onOpenPayment }) {
  const [selectedProof, setSelectedProof] = useState(null);

  return (
    <section id="reviews" className="py-12 sm:py-24 relative overflow-hidden w-full max-w-full">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 right-1/4 w-80 sm:w-96 h-80 sm:h-96 bg-[#00f576]/5 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 w-full">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00f576]/10 border border-[#00f576]/20 text-[#00f576] text-xs font-bold uppercase tracking-wider mb-3">
            <UserCheck className="w-3.5 h-3.5" /> 100% Authentic Proof
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white font-['Outfit']">
            Real Customer Chats, UPI Receipts & Live Laptop Screens
          </h2>
          <p className="mt-3 text-xs sm:text-base text-zinc-400">
            Real DMs from Instagram (@viral_clip_ai) and verified UPI payments. Tap any screenshot below to inspect the authentic proof.
          </p>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {REVIEWS.map((review) => (
            <div
              key={review.id}
              className="bg-[#0e1217] border border-white/10 hover:border-[#00f576]/40 rounded-2xl p-5 flex flex-col justify-between transition duration-200 shadow-xl group"
            >
              <div>
                {/* Top User Info & Stars */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-[#00f576] font-bold flex items-center justify-center text-sm border border-[#00f576]/30">
                      {review.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        {review.name}
                        <CheckCircle className="w-3.5 h-3.5 text-[#00f576]" />
                      </h4>
                      <p className="text-[11px] text-zinc-400 font-mono">{review.handle}</p>
                    </div>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                </div>

                {/* Badge */}
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/5 text-zinc-300 border border-white/10 mb-3">
                  {review.tag}
                </span>

                {/* Quote */}
                <blockquote className="text-xs sm:text-sm text-zinc-200 font-medium italic mb-2">
                  {review.chatQuote}
                </blockquote>

                <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                  {review.detail}
                </p>
              </div>

              {/* Chat / Proof Screenshot Thumbnail (Clickable) */}
              <div 
                onClick={() => setSelectedProof(review)}
                className="relative rounded-xl overflow-hidden bg-black/60 border border-white/10 cursor-pointer group/thumb hover:border-[#00f576] transition"
              >
                <div className="h-40 w-full overflow-hidden flex items-center justify-center bg-zinc-950">
                  <img 
                    src={review.image} 
                    alt={review.proofType} 
                    className="w-full h-full object-cover object-top opacity-85 group-hover/thumb:opacity-100 group-hover/thumb:scale-105 transition duration-300"
                  />
                </div>

                {/* Overlay Bar */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent flex items-end justify-between p-3">
                  <span className="text-[11px] font-mono text-zinc-300 font-semibold truncate max-w-[80%]">
                    {review.proofType}
                  </span>
                  <div className="p-1.5 rounded-lg bg-black/80 text-[#00f576] border border-[#00f576]/40">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* Trust Bottom Notice */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-[#00f576]" />
            <span>Join growing creators building their personal brand with ViralClip AI Studio</span>
          </div>
        </div>

      </div>

      {/* Lightbox Modal for Chat Screenshot */}
      {selectedProof && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn"
          onClick={() => setSelectedProof(null)}
        >
          <div 
            className="relative max-w-sm sm:max-w-md w-full bg-[#0e1217] rounded-2xl border border-[#00f576]/30 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-[#141922] border-b border-white/10 flex items-center justify-between text-xs">
              <span className="font-mono text-zinc-300 font-bold">{selectedProof.proofType}</span>
              <button
                onClick={() => setSelectedProof(null)}
                className="px-2.5 py-1 rounded-md bg-white/10 text-zinc-300 hover:text-white"
              >
                Close ✕
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto p-2 bg-black flex justify-center">
              <img 
                src={selectedProof.image} 
                alt="Full proof screenshot" 
                className="w-full h-auto object-contain rounded-lg"
              />
            </div>
            <div className="p-3 bg-[#0e1217] text-center border-t border-white/5">
              <button
                onClick={() => {
                  setSelectedProof(null);
                  onOpenPayment();
                }}
                className="w-full py-2.5 rounded-xl bg-[#00f576] text-black font-bold text-xs hover:bg-[#00f576]/90 transition"
              >
                Claim ₹99 Lifetime Deal Now
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
