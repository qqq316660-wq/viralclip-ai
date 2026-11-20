import React from 'react';
import { Lightning, FolderOpen, Sparkle, Plus, Power, Cookie, InstagramLogo, Broadcast } from '@phosphor-icons/react';
import ViralClipLogo from './ViralClipLogo';

export default function Header({
  systemInfo,
  currentView,
  onSelectView,
  savedClipsCount = 0,
  license = null,
  onOpenLicenseModal = null,
  onOpenCookieModal = null,
  updateInfo = null,
  onOpenUpdateModal = null,
  isProcessing = false,
  onCancelJob = null,
  onShutdown = null
}) {
  const isCuda = systemInfo?.device === 'cuda';
  const vram = systemInfo?.gpu_vram_gb ? `${systemInfo.gpu_vram_gb}GB` : null;

  return (
    <header
      style={{
        padding: '32px 20px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}
    >
      {/* Centered Logo Badge */}
      <ViralClipLogo
        size={58}
        glow={true}
        interactive={true}
        onClick={() => onSelectView && onSelectView('studio')}
        style={{ marginBottom: '16px' }}
      />

      {/* Main Title */}
      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: '#ffffff',
          marginBottom: '6px'
        }}
      >
        ViralClip <span style={{ color: 'var(--spotify-green)' }}>AI</span>
      </h1>

      <p
        style={{
          fontSize: '0.88rem',
          color: 'var(--text-subdued)',
          maxWidth: '460px',
          lineHeight: '1.4'
        }}
      >
        Turn long videos and podcasts into high-retention 9:16 vertical shorts with AI hook detection and animated subtitles.
      </p>

      {/* Status Pill & Mode Navigation */}
      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
        {/* Navigation Tabs (Studio vs Saved Library) */}
        {onSelectView && (
          <div
            style={{
              display: 'inline-flex',
              background: '#181818',
              padding: '5px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid #2e2e2e',
              gap: '6px',
              boxShadow: 'var(--shadow-medium)'
            }}
          >
            <button
              type="button"
              onClick={() => onSelectView('studio')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 18px',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                background: currentView === 'studio' ? 'var(--spotify-green)' : 'transparent',
                color: currentView === 'studio' ? '#000000' : 'var(--text-subdued)',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Sparkle size={15} weight={currentView === 'studio' ? 'fill' : 'regular'} />
              <span>Studio</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectView('library')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 18px',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                background: currentView === 'library' ? 'var(--spotify-green)' : 'transparent',
                color: currentView === 'library' ? '#000000' : 'var(--text-subdued)',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <FolderOpen size={15} weight={currentView === 'library' ? 'fill' : 'regular'} />
              <span>Saved Shorts</span>
              {savedClipsCount > 0 && (
                <span
                  style={{
                    background: currentView === 'library' ? 'rgba(0, 0, 0, 0.25)' : 'rgba(30, 215, 96, 0.2)',
                    color: currentView === 'library' ? '#000000' : 'var(--spotify-green)',
                    padding: '1px 7px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '11px',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  {savedClipsCount}
                </span>
              )}
            </button>

            {isProcessing && onCancelJob && (
              <button
                type="button"
                onClick={onCancelJob}
                title="Discard active job and ingest a new video"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid rgba(255, 77, 77, 0.35)',
                  background: 'rgba(255, 77, 77, 0.12)',
                  color: '#ff6b6b',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Plus size={15} weight="bold" />
                <span>New Video (+)</span>
              </button>
            )}
          </div>
        )}

        {/* Tier 1: Hardware & System Engine Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              color: isCuda ? '#86efac' : '#a1a1aa',
              border: `1px solid ${isCuda ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255, 255, 255, 0.08)'}`,
              padding: '3px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Lightning size={12} weight="fill" color={isCuda ? '#86efac' : '#a1a1aa'} />
            <span>{isCuda ? `CUDA GPU ACCELERATED ${vram ? `(${vram})` : ''}` : 'CPU FALLBACK MODE'}</span>
          </span>

          {license?.is_activated && (
            <button
              type="button"
              onClick={onOpenLicenseModal}
              title="Click to view license details"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#d4d4d8',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '3px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#d4d4d8';
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
              <span>PRO LIFETIME (OFFLINE READY)</span>
            </button>
          )}

          {onOpenCookieModal && (
            <button
              type="button"
              onClick={onOpenCookieModal}
              title="Configure YouTube cookies for bot verification bypass"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#a1a1aa',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '3px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#a1a1aa';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              }}
            >
              <Cookie size={12} weight="fill" color="#a1a1aa" />
              <span>YOUTUBE COOKIES</span>
            </button>
          )}
        </div>

        {/* Tier 2: Community Releases & App Controls (Cleanly Separated!) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: '2px'
          }}
        >
          {/* Instagram Handle - Highlighted for New Features & Updates (Eye-friendly dark luxury style) */}
          <a
            href="https://www.instagram.com/viral_clip_ai/?__pwa=1"
            target="_blank"
            rel="noopener noreferrer"
            title="Follow @viral_clip_ai on Instagram for new feature drops, tutorials & updates"
            style={{
              background: 'rgba(255, 255, 255, 0.035)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '3px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.035)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}
          >
            <InstagramLogo size={13} weight="bold" color="#f472b6" />
            <span style={{ color: '#a1a1aa', fontWeight: 500 }}>Updates & Features:</span>
            <span style={{ color: '#f4f4f5', fontWeight: 700 }}>@viral_clip_ai</span>
          </a>

          {/* Software Updates Trigger */}
          {onOpenUpdateModal && (
            <button
              type="button"
              onClick={onOpenUpdateModal}
              title={updateInfo?.update_available ? `Update available: v${updateInfo.latest_version}` : 'Check for software updates'}
              style={{
                background: updateInfo?.update_available ? 'rgba(74, 222, 128, 0.08)' : 'rgba(255, 255, 255, 0.035)',
                color: updateInfo?.update_available ? '#86efac' : '#a1a1aa',
                border: `1px solid ${updateInfo?.update_available ? 'rgba(74, 222, 128, 0.25)' : 'rgba(255, 255, 255, 0.08)'}`,
                padding: '3px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = updateInfo?.update_available ? '#86efac' : '#a1a1aa';
                e.currentTarget.style.borderColor = updateInfo?.update_available ? 'rgba(74, 222, 128, 0.25)' : 'rgba(255, 255, 255, 0.08)';
              }}
            >
              {updateInfo?.update_available ? (
                <>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
                  <span style={{ fontWeight: 700 }}>Update v{updateInfo.latest_version}</span>
                </>
              ) : (
                <>
                  <Sparkle size={12} weight="fill" color="#a1a1aa" />
                  <span>Check Updates</span>
                </>
              )}
            </button>
          )}

          {/* Clean App Exit */}
          {onShutdown && (
            <button
              type="button"
              onClick={onShutdown}
              title="Stop background server and exit ViralClip AI Studio"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                color: '#71717a',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.72rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#f87171';
                e.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.3)';
                e.currentTarget.style.background = 'rgba(248, 113, 113, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#71717a';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              }}
            >
              <Power size={11} weight="bold" />
              <span>Exit</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
