import React, { useState } from 'react';
import { X, Check, Copy, QrCode, ShieldCheck, ArrowRight, Smartphone, ExternalLink } from 'lucide-react';
import { InstagramIcon } from './Icons';

export default function PaymentModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const upiId = "akash8885@slc";
  const instaHandle = "viral_clip_ai";
  const instaDmUrl = "https://ig.me/m/viral_clip_ai";
  const upiIntentUrl = "upi://pay?pa=akash8885@slc&pn=Akash%20Dutta&am=399&cu=INR&tn=ViralClip%20AI%20Lifetime";

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md bg-[#0e1118] border border-white/10 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl text-white overflow-hidden max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Handle */}
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-3 sm:hidden"></div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 transition"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.08] pr-8">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold block">
              Direct Lifetime License
            </span>
            <h3 className="text-lg sm:text-xl font-bold font-['Outfit'] text-white mt-0.5">
              ViralClip AI Studio
            </h3>
            <p className="text-xs text-zinc-400">One-time payment · Zero subscriptions</p>
          </div>

          <div className="text-right">
            <span className="text-2xl sm:text-3xl font-black text-white font-['Outfit'] leading-none">
              ₹399
            </span>
          </div>
        </div>

        {/* 1-Tap UPI Launch Button (Mobile) */}
        <div className="space-y-2.5 mb-4">
          <a
            href={upiIntentUrl}
            className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-98 shadow-sm"
          >
            <Smartphone className="w-4 h-4 fill-black" />
            <span>Pay ₹399 via UPI App (PhonePe / GPay / Paytm)</span>
          </a>

          {/* UPI ID Row */}
          <div className="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-zinc-500 font-mono text-[10px]">UPI ID:</span>
              <span className="font-mono font-semibold text-white text-xs truncate">{upiId}</span>
              <span className="text-[10px] text-zinc-500 hidden xs:inline">(Akash)</span>
            </div>
            <button 
              onClick={handleCopy}
              className="p-1 px-2.5 text-zinc-300 hover:text-emerald-400 bg-white/5 hover:bg-white/10 rounded-lg transition flex items-center gap-1 text-[11px] font-medium"
              title="Copy UPI ID"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* QR Code Collapsible */}
        <div className="mb-4">
          <button
            onClick={() => setShowQr(!showQr)}
            className="w-full py-2 px-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 flex items-center justify-between text-xs text-zinc-300 transition"
          >
            <span className="flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>{showQr ? 'Hide QR Code' : 'Scan QR Code with another phone'}</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">
              {showQr ? 'Close' : 'View QR'}
            </span>
          </button>

          {showQr && (
            <div className="mt-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/10 text-center animate-fadeIn">
              <div className="mx-auto w-36 h-36 bg-white p-1.5 rounded-lg flex items-center justify-center">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=upi://pay?pa=akash8885@slc&pn=Akash%20Dutta&am=399&cu=INR`} 
                  alt="UPI QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-[10px] text-zinc-400 mt-2">
                Scan with PhonePe, Google Pay, or Paytm to pay ₹399
              </p>
            </div>
          )}
        </div>

        {/* After Payment Instructions */}
        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3.5 mb-4 text-xs space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>After Payment — Instant Delivery</span>
          </div>
          <p className="text-zinc-300 leading-relaxed text-[11px]">
            Send your payment screenshot to our official Instagram:
          </p>
          <a
            href={instaDmUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 font-semibold text-xs flex items-center justify-between text-white transition"
          >
            <span className="flex items-center gap-2">
              <InstagramIcon className="w-4 h-4 text-pink-400" />
              <span>DM Screenshot to @{instaHandle}</span>
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
          </a>
        </div>

        <p className="text-[10px] text-center text-zinc-500">
          Your Windows installer and license are delivered immediately upon confirmation.
        </p>

      </div>
    </div>
  );
}
