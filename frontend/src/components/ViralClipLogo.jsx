import React from 'react';
import { FilmSlate } from '@phosphor-icons/react';

/**
 * Official ViralClip AI Logo Component
 * Unified brand mark used across Header, Navigation, Modals, and Footer.
 */
export default function ViralClipLogo({
  size = 40,
  withText = false,
  subtitle = null,
  onClick = null,
  interactive = false,
  glow = true,
  style = {}
}) {
  // Resolve numeric size if string preset provided
  const numSize =
    typeof size === 'number'
      ? size
      : size === 'xs'
      ? 22
      : size === 'sm'
      ? 30
      : size === 'md'
      ? 42
      : size === 'lg'
      ? 56
      : size === 'xl'
      ? 72
      : 40;

  const iconSize = Math.round(numSize * 0.54);

  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Math.max(8, Math.round(numSize * 0.28)),
        cursor: onClick || interactive ? 'pointer' : 'default',
        userSelect: 'none',
        textDecoration: 'none',
        ...style
      }}
      className="viralclip-brand-logo"
    >
      {/* Circle Badge Mark */}
      <div
        style={{
          width: `${numSize}px`,
          height: `${numSize}px`,
          minWidth: `${numSize}px`,
          minHeight: `${numSize}px`,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1ed760 0%, #17b04e 100%)',
          color: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: glow
            ? `0 ${Math.max(4, Math.round(numSize * 0.14))}px ${Math.max(12, Math.round(numSize * 0.4))}px rgba(30, 215, 96, 0.42)`
            : '0 2px 8px rgba(0, 0, 0, 0.4)',
          transition: 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s ease',
          flexShrink: 0
        }}
      >
        <FilmSlate size={iconSize} weight="fill" />
      </div>

      {/* Optional Wordmark */}
      {withText && (
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.1 }}>
          <span
            style={{
              fontSize: `${Math.max(15, Math.round(numSize * 0.48))}px`,
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            ViralClip <span style={{ color: 'var(--spotify-green, #1ed760)' }}>AI</span>
          </span>
          {subtitle && (
            <span
              style={{
                fontSize: `${Math.max(10, Math.round(numSize * 0.22))}px`,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-subdued, #b3b3b3)',
                marginTop: '2px',
                fontFamily: 'var(--font-mono, monospace)'
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
