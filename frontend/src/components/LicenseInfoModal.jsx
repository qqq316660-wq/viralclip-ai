import React from 'react';
import { ShieldCheck, X, DeviceMobile, User, Phone, Key, WifiSlash } from '@phosphor-icons/react';

export default function LicenseInfoModal({ license, onClose }) {
  if (!license) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#181818',
          border: '1px solid #333333',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #282828',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={22} weight="fill" color="var(--spotify-green)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              Active Studio License
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-subdued)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Status Banner */}
          <div
            style={{
              padding: '12px',
              borderRadius: '10px',
              background: 'rgba(30, 215, 96, 0.1)',
              border: '1px solid rgba(30, 215, 96, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--spotify-green)', fontWeight: 800, textTransform: 'uppercase' }}>
                Edition
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                ViralClip Pro Lifetime
              </div>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                color: 'var(--spotify-green)',
                fontWeight: 700
              }}
            >
              <WifiSlash size={14} />
              <span>Offline Ready</span>
            </div>
          </div>

          {/* Details Table */}
          <div style={{ background: '#121212', borderRadius: '10px', border: '1px solid #262626', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #202020' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-subdued)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Key size={14} /> License Key:
              </span>
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff' }}>
                {license.license_key || license.key || 'N/A'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #202020' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-subdued)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} /> Registered To:
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                {license.registered_name || 'Owner'}
              </span>
            </div>

            {license.registered_phone && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #202020' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-subdued)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={14} /> Contact:
                </span>
                <span style={{ fontSize: '12px', color: '#fff' }}>
                  {license.registered_phone}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-subdued)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <DeviceMobile size={14} /> Node-Lock HWID:
              </span>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-subdued)' }}>
                {license.hwid || 'Verified'}
              </span>
            </div>
          </div>

          <p style={{ fontSize: '11px', color: 'var(--text-subdued)', lineHeight: '1.4', margin: 0, textAlign: 'center' }}>
            This license is cryptographically locked to your computer hardware. You do not need an active internet connection to create clips.
          </p>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px',
              borderRadius: '8px',
              background: '#242424',
              border: '1px solid #333',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              marginTop: '4px'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
