import React from 'react';
import { Lightning, FolderOpen, Sparkle, Plus, Power, Cookie, InstagramLogo } from '@phosphor-icons/react';
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

        {/* Hardware Status Pill, License Pill & App Exit Button */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span
            style={{
              background: isCuda ? 'rgba(30, 215, 96, 0.15)' : 'rgba(255, 255, 255, 0.06)',
              color: isCuda ? 'var(--spotify-green)' : 'var(--text-subdued)',
              border: `1px solid ${isCuda ? 'var(--spotify-green-border)' : 'var(--border-subtle)'}`,
              padding: '3px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Lightning size={13} weight="fill" />
            <span>{isCuda ? `CUDA GPU ACCELERATED ${vram ? `(${vram})` : ''}` : 'CPU FALLBACK MODE'}</span>
          </span>

          {license?.is_activated && (
            <button
              type="button"
              onClick={onOpenLicenseModal}
              title="Click to view license details"
              style={{
                background: 'rgba(30, 215, 96, 0.12)',
                color: 'var(--spotify-green)',
                border: '1px solid rgba(30, 215, 96, 0.3)',
                padding: '3px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--spotify-green)' }} />
              <span>PRO LIFETIME (OFFLINE READY)</span>
            </button>
          )}

          {onOpenCookieModal && (
            <button
              type="button"
              onClick={onOpenCookieModal}
              title="Configure YouTube cookies for bot bypass"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                color: 'var(--text-subdued)',
                border: '1px solid var(--border-subtle)',
                padding: '3px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.borderColor = 'var(--spotify-green)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-subdued)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              <Cookie size={13} weight="fill" color="var(--spotify-green)" />
              <span>YOUTUBE COOKIES</span>
            </button>
          )}

          <a
            href="https://www.instagram.com/viral_clip_ai/?__pwa=1"
            target="_blank"
            rel="noopener noreferrer"
            title="Official Instagram: @viral_clip_ai"
            style={{
              background: 'rgba(225, 48, 108, 0.1)',
              color: '#ff6699',
              border: '1px solid rgba(225, 48, 108, 0.3)',
              padding: '3px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(225, 48, 108, 0.2)';
              e.currentTarget.style.borderColor = '#ff6699';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(225, 48, 108, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(225, 48, 108, 0.3)';
              e.currentTarget.style.color = '#ff6699';
            }}
          >
            <InstagramLogo size={13} weight="bold" color="#ff6699" />
            <span>@VIRAL_CLIP_AI</span>
          </a>

          {onOpenUpdateModal && (
            <button
              type="button"
              onClick={onOpenUpdateModal}
              title={updateInfo?.update_available ? `Update available: v${updateInfo.latest_version}` : 'Check for software updates'}
              style={{
                background: updateInfo?.update_available ? 'rgba(30, 215, 96, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                color: updateInfo?.update_available ? 'var(--spotify-green)' : 'var(--text-subdued)',
                border: `1px solid ${updateInfo?.update_available ? 'var(--spotify-green)' : 'var(--border-subtle)'}`,
                padding: '3px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.borderColor = 'var(--spotify-green)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = updateInfo?.update_available ? 'var(--spotify-green)' : 'var(--text-subdued)';
                e.currentTarget.style.borderColor = updateInfo?.update_available ? 'var(--spotify-green)' : 'var(--border-subtle)';
              }}
            >
              {updateInfo?.update_available ? (
                <>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--spotify-green)' }} />
                  <span>UPDATE v{updateInfo.latest_version}</span>
                </>
              ) : (
                <>
                  <Lightning size={13} weight="fill" color="var(--spotify-green)" />
                  <span>UPDATES</span>
                </>
              )}
            </button>
          )}

          {onShutdown && (
            <button
              type="button"
              onClick={onShutdown}
              title="Stop background server and exit ViralClip"
              style={{
                background: 'rgba(255, 77, 77, 0.08)',
                color: '#ff8585',
                border: '1px solid rgba(255, 77, 77, 0.28)',
                padding: '3px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Power size={13} weight="bold" />
              <span>EXIT STUDIO</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
