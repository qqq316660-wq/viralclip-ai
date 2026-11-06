import React, { useState } from 'react';
import {
  ArrowUp,
  Lightning,
  ShieldCheck,
  FileText,
  Copyright,
  FilmSlate,
  FolderOpen,
  InstagramLogo
} from '@phosphor-icons/react';
import ViralClipLogo from './ViralClipLogo';
import LegalModal from './LegalModal';

export default function Footer({
  systemInfo,
  currentView = 'studio',
  onSelectView,
  savedClipsCount = 0
}) {
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState('privacy');

  const isCuda = systemInfo?.device === 'cuda';
  const vram = systemInfo?.gpu_vram_gb ? `${systemInfo.gpu_vram_gb}GB` : null;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openLegal = (tab) => {
    setLegalModalTab(tab);
    setLegalModalOpen(true);
  };

  return (
    <>
      <footer
        style={{
          marginTop: 'auto',
          width: '100%',
          background: '#0a0a0a',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#8e8e93',
          padding: '16px 24px',
          fontSize: '0.8rem',
          lineHeight: 1.4
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px'
          }}
        >
          {/* Left: Brand Identity & Operational Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              onClick={() => {
                if (onSelectView) onSelectView('studio');
                scrollToTop();
              }}
              title="Return to Studio Workspace"
            >
              <ViralClipLogo size={18} glow={false} />
              <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '0.84rem', letterSpacing: '-0.01em' }}>
                ViralClip AI
              </span>
              <span style={{ color: '#636366', fontSize: '0.75rem' }}>•</span>
              <span style={{ color: '#a1a1aa', fontSize: '0.76rem' }}>
                Autonomous Studio
              </span>
            </div>

            {/* Quick View Switches */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  if (onSelectView) onSelectView('studio');
                  scrollToTop();
                }}
                style={{
                  background: currentView === 'studio' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  border: 'none',
                  color: currentView === 'studio' ? 'var(--spotify-green, #1ed760)' : '#8e8e93',
                  fontWeight: currentView === 'studio' ? 700 : 500,
                  fontSize: '0.74rem',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                <FilmSlate size={13} weight={currentView === 'studio' ? 'fill' : 'regular'} />
                <span>Studio</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onSelectView) onSelectView('library');
                  scrollToTop();
                }}
                style={{
                  background: currentView === 'library' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  border: 'none',
                  color: currentView === 'library' ? 'var(--spotify-green, #1ed760)' : '#8e8e93',
                  fontWeight: currentView === 'library' ? 700 : 500,
                  fontSize: '0.74rem',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                <FolderOpen size={13} weight={currentView === 'library' ? 'fill' : 'regular'} />
                <span>Library</span>
                {savedClipsCount > 0 && (
                  <span
                    style={{
                      background: 'rgba(30, 215, 96, 0.2)',
                      color: 'var(--spotify-green, #1ed760)',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '0 5px',
                      borderRadius: '8px'
                    }}
                  >
                    {savedClipsCount}
                  </span>
                )}
              </button>
            </div>

            {/* Hardware Mode Pill */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: isCuda ? 'rgba(30, 215, 96, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                color: isCuda ? 'var(--spotify-green, #1ed760)' : '#8e8e93',
                border: `1px solid ${isCuda ? 'rgba(30, 215, 96, 0.25)' : 'rgba(255, 255, 255, 0.06)'}`,
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 600
              }}
            >
              <Lightning size={11} weight="fill" />
              <span>{isCuda ? `CUDA GPU ${vram ? `(${vram})` : ''}` : 'CPU MODE'}</span>
            </span>
          </div>

          {/* Right: Legal Links, Status & Scroll-to-Top */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            {/* Legal Links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem' }}>
              <button
                type="button"
                onClick={() => openLegal('privacy')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8e8e93',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#8e8e93')}
              >
                <ShieldCheck size={13} />
                <span>Privacy Policy</span>
              </button>

              <span style={{ color: '#333' }}>•</span>

              <button
                type="button"
                onClick={() => openLegal('terms')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8e8e93',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#8e8e93')}
              >
                <FileText size={13} />
                <span>Terms of Service</span>
              </button>

              <span style={{ color: '#333' }}>•</span>

              <button
                type="button"
                onClick={() => openLegal('copyright')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8e8e93',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#8e8e93')}
              >
                <Copyright size={13} />
                <span>Copyright Disclaimer</span>
              </button>

              <span style={{ color: '#333' }}>•</span>

              <a
                href="https://www.instagram.com/viral_clip_ai/?__pwa=1"
                target="_blank"
                rel="noopener noreferrer"
                title="Follow @viral_clip_ai on Instagram for new updates & features"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: '#a1a1aa',
                  textDecoration: 'none',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#a1a1aa')}
              >
                <InstagramLogo size={13} weight="bold" color="#f472b6" />
                <span>@viral_clip_ai • Updates & Features</span>
              </a>
            </div>

            {/* Pipeline Operational Dot */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.72rem',
                color: '#71717a'
              }}
              title="All transcription and video pipelines operational"
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--spotify-green, #1ed760)',
                  boxShadow: '0 0 6px rgba(30, 215, 96, 0.7)',
                  display: 'inline-block'
                }}
              />
              <span>Operational</span>
            </div>

            {/* Scroll-to-Top Button */}
            <button
              type="button"
              onClick={scrollToTop}
              title="Scroll to top"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#d4d4d8',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--spotify-green, #1ed760)';
                e.currentTarget.style.color = '#000000';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = '#d4d4d8';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <ArrowUp size={13} weight="bold" />
            </button>
          </div>
        </div>
      </footer>

      {/* Interactive Legal & Disclaimers Modal */}
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalModalTab}
      />
    </>
  );
}
