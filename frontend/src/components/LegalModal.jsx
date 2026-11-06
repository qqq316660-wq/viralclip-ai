import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  FileText,
  Copyright,
  WarningCircle,
  Lightning,
  LockKey,
  CheckCircle,
  Scales
} from '@phosphor-icons/react';

export default function LegalModal({ isOpen, onClose, initialTab = 'privacy' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#151515',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          animation: 'legalModalFadeIn 0.2s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#181818'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(30, 215, 96, 0.15)',
                border: '1px solid rgba(30, 215, 96, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--spotify-green, #1ed760)'
              }}
            >
              <Scales size={20} weight="bold" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
                Legal & Compliance Center
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-subdued, #a7a7a7)', margin: '2px 0 0' }}>
                ViralClip AI • Autonomous Video Repurposing Studio
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: '#121212',
            padding: '6px 16px',
            gap: '8px',
            overflowX: 'auto'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '9999px',
              border: activeTab === 'privacy' ? '1px solid var(--spotify-green, #1ed760)' : '1px solid transparent',
              background: activeTab === 'privacy' ? 'rgba(30, 215, 96, 0.12)' : 'transparent',
              color: activeTab === 'privacy' ? 'var(--spotify-green, #1ed760)' : 'var(--text-subdued, #a7a7a7)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <ShieldCheck size={16} weight={activeTab === 'privacy' ? 'fill' : 'regular'} />
            <span>Privacy Policy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '9999px',
              border: activeTab === 'terms' ? '1px solid var(--spotify-green, #1ed760)' : '1px solid transparent',
              background: activeTab === 'terms' ? 'rgba(30, 215, 96, 0.12)' : 'transparent',
              color: activeTab === 'terms' ? 'var(--spotify-green, #1ed760)' : 'var(--text-subdued, #a7a7a7)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <FileText size={16} weight={activeTab === 'terms' ? 'fill' : 'regular'} />
            <span>Terms & Conditions</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('copyright')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '9999px',
              border: activeTab === 'copyright' ? '1px solid var(--spotify-green, #1ed760)' : '1px solid transparent',
              background: activeTab === 'copyright' ? 'rgba(30, 215, 96, 0.12)' : 'transparent',
              color: activeTab === 'copyright' ? 'var(--spotify-green, #1ed760)' : 'var(--text-subdued, #a7a7a7)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <Copyright size={16} weight={activeTab === 'copyright' ? 'fill' : 'regular'} />
            <span>Copyright & Liability Disclaimer</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            fontSize: '0.86rem',
            lineHeight: 1.65,
            color: '#d4d4d8',
            flex: 1
          }}
        >
          {/* TAB 1: PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Highlight Disclaimer Banner */}
              <div
                style={{
                  background: 'rgba(255, 164, 43, 0.08)',
                  border: '1px solid rgba(255, 164, 43, 0.25)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start'
                }}
              >
                <WarningCircle size={20} color="#ffa42b" weight="fill" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffa42b', margin: '0 0 4px' }}>
                    Speed, Performance & Result Disclaimer
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: '#e4e4e7', margin: 0, lineHeight: 1.5 }}>
                    ViralClip AI provides autonomous video repurposing tools engineered for speed and efficiency. However, <strong>we provide absolutely no guarantee or warranty</strong> that video processing, transcription, AI hook scoring, or video rendering will operate at any specific speed or turnaround time. Processing speed is inherently dependent upon host hardware capabilities (CPU/GPU VRAM), network bandwidth, video duration, and external API availability. Furthermore, <strong>we provide no guarantee of virality, view counts, audience retention, subscriber growth, or monetization success</strong> on any social media platform.
                  </p>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px' }}>
                  1. Data Collection & Processing Architecture
                </h4>
                <p style={{ margin: 0, color: '#a1a1aa' }}>
                  ViralClip AI operates primarily as a local-first software application. Ingested video files, audio tracks, and custom subtitles are processed on your local machine or through user-configured endpoint infrastructure (such as local FFmpeg, Faster-Whisper, and optional Ollama or Kaggle instances). We do not collect, harvest, monetize, or sell your original video files or personal data to third parties.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px' }}>
                  2. Third-Party AI Services & API Keys
                </h4>
                <p style={{ margin: 0, color: '#a1a1aa' }}>
                  When using cloud AI models (such as Google Gemini for hook reasoning), API keys entered into ViralClip AI remain stored exclusively in your local application session storage or local environment variables. We never transmit your API keys to our own servers or third-party analytical vendors. Ingestion of data through external APIs is subject to the respective service&apos;s privacy policy (e.g., Google Privacy Policy).
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px' }}>
                  3. Local Storage & Cache Management
                </h4>
                <p style={{ margin: 0, color: '#a1a1aa' }}>
                  Generated shorts, audio snippets, thumbnail previews, and subtitle files are written directly to your local file system storage folder (<code style={{ background: '#222', padding: '2px 6px', borderRadius: '4px', color: 'var(--spotify-green)' }}>storage/</code>). You maintain full control over these assets and may delete or relocate them at any time.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px' }}>
                  4. Telemetry & Analytics
                </h4>
                <p style={{ margin: 0, color: '#a1a1aa' }}>
                  ViralClip AI does not transmit background telemetric tracking, behavioral profiling, or keystroke logs. The software runs without invasive user tracking.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: TERMS & CONDITIONS */}
          {activeTab === 'terms' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '14px 16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Scales size={18} color="var(--spotify-green)" weight="bold" />
                  <strong style={{ color: '#ffffff' }}>Agreement to Terms</strong>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#a1a1aa', margin: 0 }}>
                  By launching, installing, downloading, or utilizing ViralClip AI (&quot;the Software&quot;), you acknowledge that you have read, understood, and agree to be strictly bound by these Terms and Conditions. If you do not agree, you must immediately discontinue use of the software.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px' }}>
                  1. &quot;AS-IS&quot; License & Warranty Exclusion
                </h4>
                <p style={{ margin: 0, color: '#a1a1aa' }}>
                  ViralClip AI is provided strictly on an <strong>&quot;AS IS&quot;</strong> and <strong>&quot;AS AVAILABLE&quot;</strong> basis, without warranty of any kind, whether express, statutory, or implied, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, non-infringement, or uninterrupted availability. You utilize this tool entirely at your own risk.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px' }}>
                  2. User Responsibility for Ingested & Rendered Media
                </h4>
                <p style={{ margin: 0, color: '#a1a1aa' }}>
                  You represent and warrant that you possess all necessary rights, legal permissions, licenses, and consents to ingest, reframe, crop, transcribe, and edit any audio, video, image, logo, or font uploaded or referenced within ViralClip AI. You assume full legal responsibility for any content you export, upload, or publish to social media channels (including YouTube Shorts, Instagram Reels, and TikTok).
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px' }}>
                  3. Prohibited Uses & Unlawful Activity
                </h4>
                <p style={{ margin: 0, color: '#a1a1aa' }}>
                  You agree NOT to use ViralClip AI to:
                </p>
                <ul style={{ margin: '6px 0 0 20px', color: '#a1a1aa', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>Create defamatory, non-consensual, deceptive, harmful, or fraudulent media (including malicious deepfakes).</li>
                  <li>Infringe upon the intellectual property, copyright, patent, trademark, or privacy rights of any third party.</li>
                  <li>Circumvent copyright protection mechanisms or automated download restrictions in violation of applicable laws.</li>
                  <li>Violate the Terms of Service of platforms from which media is ingested (such as YouTube, Twitch, or Vimeo).</li>
                </ul>
              </div>

              <div>
                <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px' }}>
                  4. Limitation of Liability
                </h4>
                <p style={{ margin: 0, color: '#a1a1aa' }}>
                  To the fullest extent permitted by law, in no event shall the creators, developers, distributors, or affiliates of ViralClip AI be liable for any direct, indirect, punitive, incidental, special, or consequential damages, including loss of profits, account suspensions, platform strikes, loss of data, hardware malfunction, or legal fees arising out of the use or misuse of the Software.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: COPYRIGHT & LIABILITY DISCLAIMER */}
          {activeTab === 'copyright' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div
                style={{
                  background: 'rgba(243, 114, 127, 0.08)',
                  border: '1px solid rgba(243, 114, 127, 0.3)',
                  borderRadius: '10px',
                  padding: '16px 18px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start'
                }}
              >
                <Copyright size={22} color="#f3727f" weight="fill" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f3727f', margin: '0 0 4px' }}>
                    Zero Responsibility for Copyright Infringements
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#ffffff', margin: 0, lineHeight: 1.55 }}>
                    <strong>ViralClip AI and its authors hold ABSOLUTE ZERO RESPONSIBILITY AND NO LIABILITY</strong> in the event that any video, audio track, background music, speech transcript, font, brand logo, or derivative short generated using this software receives a copyright strike, Content ID claim, DMCA takedown notice, account restriction, monetization block, or legal lawsuit from any rights holder, studio, record label, or social media platform.
                  </p>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px' }}>
                  1. The User is Solely Liable for Fair Use & Licensing
                </h4>
                <p style={{ margin: 0, color: '#a1a1aa' }}>
                  The fact that ViralClip AI automates cropping, transcribing, and subtitle generation does <strong>NOT</strong> grant or imply any copyright license or fair use immunity. The determination of whether repurposed content qualifies as Fair Use (or fair dealing) under United States Code Title 17, Section 107, or international intellectual property law is strictly the sole legal responsibility and burden of the user.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px' }}>
                  2. Third-Party Trademarks, Music & Assets
                </h4>
                <p style={{ margin: 0, color: '#a1a1aa' }}>
                  Any mention of YouTube, TikTok, Instagram, Spotify, NVIDIA, or other third-party trademarks within this application is for compatibility and descriptive reference purposes only. ViralClip AI is not affiliated with, endorsed by, or sponsored by any of these entities. Users must ensure that any background music or audio files added to clips possess adequate broadcast and synchronization licenses.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px' }}>
                  3. Full User Indemnification Clause
                </h4>
                <p style={{ margin: 0, color: '#a1a1aa' }}>
                  You agree to fully defend, indemnify, and hold harmless ViralClip AI, its authors, maintainers, contributors, and agents against any and all claims, damages, liabilities, costs, losses, and legal expenses arising out of or related to:
                </p>
                <ul style={{ margin: '6px 0 0 20px', color: '#a1a1aa', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>Any copyright, patent, trade secret, or trademark infringement claims resulting from your uploaded or exported content.</li>
                  <li>Platform-level enforcement actions including strikes, demonetization, or permanent account bans.</li>
                  <li>Your violation of any applicable local, federal, or international law or intellectual property rights.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#121212',
            fontSize: '0.78rem',
            color: 'var(--text-subdued, #a7a7a7)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={14} color="var(--spotify-green, #1ed760)" weight="fill" />
            <span>Updated for 2026 Studio Compliance Standards</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-spotify-primary"
            style={{
              padding: '8px 24px',
              fontSize: '12px',
              letterSpacing: '1px'
            }}
          >
            I Understand & Accept
          </button>
        </div>
      </div>
    </div>
  );
}
