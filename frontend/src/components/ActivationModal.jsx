import React, { useState, useEffect } from 'react';
import {
  Sparkle,
  Key,
  ShieldCheck,
  WifiHigh,
  WifiSlash,
  CheckCircle,
  WarningCircle,
  VideoCamera,
  Cpu,
  Subtitles,
  MusicNotes,
  ArrowRight,
  ArrowLeft,
  User,
  Phone,
  DeviceMobile
} from '@phosphor-icons/react';
import ViralClipLogo from './ViralClipLogo';

export default function ActivationModal({ backendUrl, onActivated }) {
  // Tabs: 'onboarding' | 'register' | 'success'
  const [currentScreen, setCurrentScreen] = useState('onboarding');
  const [onboardingSlide, setOnboardingSlide] = useState(0);

  // Form Fields
  const [licenseKey, setLicenseKey] = useState('');
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');

  // Status & Network State
  const [isOnline, setIsOnline] = useState(true);
  const [systemHwid, setSystemHwid] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  // Feature Showcase Cards for Onboarding
  const features = [
    {
      icon: <VideoCamera size={34} weight="duotone" color="var(--spotify-green)" />,
      badge: "AI Hook Detection",
      title: "Automated Viral Long-to-Shorts",
      desc: "Turn podcasts, long interviews, and YouTube videos into high-retention 9:16 vertical shorts with heuristic engagement scoring."
    },
    {
      icon: <Cpu size={34} weight="duotone" color="#00d2ff" />,
      badge: "Zero Local VRAM Required",
      title: "Free Kaggle & Colab GPU Bridge",
      desc: "Connect Google Colab or Kaggle (free NVIDIA T4 GPU) to run Whisper Large-v3 in 5–10 seconds, or upload your own .SRT files instantly."
    },
    {
      icon: <Subtitles size={34} weight="duotone" color="#ffa42b" />,
      badge: "Kinetic Animations",
      title: "Karaoke Animated Subtitles",
      desc: "Apply viral Hormozi Yellow Bounce, MrBeast Neon Pop, or Cyberpunk subtitle presets with 1-word explosive timing."
    },
    {
      icon: <MusicNotes size={34} weight="duotone" color="#d946ef" />,
      badge: "Smart Audio Mixer",
      title: "Custom Background Music & Ducking",
      desc: "Upload trending audio tracks with intelligent speech ducking, volume normalization, and smooth start offset controls."
    }
  ];

  // Auto-format License Key (e.g. VC-XXXX-XXXX-XXXX)
  const handleKeyChange = (e) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setLicenseKey(val);
  };

  // Check Internet Connectivity & HWID on mount and periodic ping
  const checkNetwork = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/license/check-internet`);
      if (res.ok) {
        const data = await res.json();
        setIsOnline(Boolean(data.online));
      } else {
        setIsOnline(navigator.onLine);
      }
    } catch {
      setIsOnline(navigator.onLine);
    }
  };

  useEffect(() => {
    checkNetwork();
    const interval = setInterval(checkNetwork, 6000);

    // Fetch system HWID
    fetch(`${backendUrl}/api/license/status`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.hwid) setSystemHwid(data.hwid);
      })
      .catch(() => {});

    return () => clearInterval(interval);
  }, [backendUrl]);

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!licenseKey.trim()) {
      setErrorMessage('Please enter your License Key.');
      return;
    }

    if (!isOnline) {
      setErrorMessage('Internet Required: Please connect to the internet for a 5-second one-time activation. Once activated, the software works 100% offline forever.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/api/license/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: licenseKey.trim().toUpperCase(),
          name: userName.trim(),
          phone: userPhone.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.message || 'Activation failed. Please check your key.');
      }

      setSuccessInfo(data.license || { key: licenseKey, registered_name: userName });
      setCurrentScreen('success');
      setTimeout(() => {
        if (onActivated) onActivated(data.license);
      }, 1800);
    } catch (err) {
      setErrorMessage(err.message || 'Activation failed. Please check network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(16px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'linear-gradient(180deg, #1e1e1e 0%, #141414 100%)',
          border: '1px solid #333333',
          borderRadius: '20px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 35px rgba(30, 215, 96, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            padding: '24px 28px 18px',
            borderBottom: '1px solid #282828',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.02)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ViralClipLogo size={36} glow={true} />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
                ViralClip <span style={{ color: 'var(--spotify-green)' }}>AI Studio</span>
              </h2>
              <span style={{ fontSize: '11px', color: 'var(--text-subdued)', fontWeight: 600 }}>
                Professional Standalone Edition
              </span>
            </div>
          </div>

          {/* Network Status Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: 'var(--radius-pill)',
              background: isOnline ? 'rgba(30, 215, 96, 0.12)' : 'rgba(243, 114, 127, 0.12)',
              border: `1px solid ${isOnline ? 'rgba(30, 215, 96, 0.3)' : 'rgba(243, 114, 127, 0.3)'}`,
              fontSize: '11px',
              fontWeight: 700,
              color: isOnline ? 'var(--spotify-green)' : '#f3727f'
            }}
          >
            {isOnline ? <WifiHigh size={14} weight="bold" /> : <WifiSlash size={14} weight="bold" />}
            <span>{isOnline ? 'Online (Ready)' : 'Offline'}</span>
          </div>
        </div>

        {/* SCREEN 1: ONBOARDING & FEATURES CAROUSEL */}
        {currentScreen === 'onboarding' && (
          <div style={{ padding: '28px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(30, 215, 96, 0.12)',
                  color: 'var(--spotify-green)',
                  padding: '4px 12px',
                  borderRadius: '100px',
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '10px'
                }}
              >
                <Sparkle size={13} weight="fill" />
                <span>Feature Showcase</span>
              </div>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
                Welcome to ViralClip AI
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-subdued)', maxWidth: '420px', margin: '0 auto', lineHeight: '1.5' }}>
                Automate your vertical video repurposing pipeline with AI-driven hook detection and viral formatting.
              </p>
            </div>

            {/* Feature Slide Card */}
            <div
              style={{
                background: '#181818',
                border: '1px solid #2e2e2e',
                borderRadius: '14px',
                padding: '24px',
                minHeight: '170px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '12px',
                    background: '#222222',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #333'
                  }}
                >
                  {features[onboardingSlide].icon}
                </div>
                <div>
                  <span
                    style={{
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      fontWeight: 800,
                      letterSpacing: '0.05em',
                      color: 'var(--spotify-green)',
                      display: 'block',
                      marginBottom: '2px'
                    }}
                  >
                    {features[onboardingSlide].badge}
                  </span>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                    {features[onboardingSlide].title}
                  </h4>
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#b3b3b3', lineHeight: '1.5', margin: 0 }}>
                {features[onboardingSlide].desc}
              </p>
            </div>

            {/* Slide Dots Indicator */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '20px 0 24px' }}>
              {features.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setOnboardingSlide(idx)}
                  style={{
                    width: onboardingSlide === idx ? '26px' : '8px',
                    height: '8px',
                    borderRadius: '4px',
                    background: onboardingSlide === idx ? 'var(--spotify-green)' : '#333333',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setOnboardingSlide((prev) => (prev > 0 ? prev - 1 : features.length - 1))}
                style={{
                  padding: '12px 18px',
                  borderRadius: '12px',
                  background: '#222222',
                  border: '1px solid #333333',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={16} />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onboardingSlide < features.length - 1) {
                    setOnboardingSlide((prev) => prev + 1);
                  } else {
                    setCurrentScreen('register');
                  }
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  background: 'var(--spotify-green)',
                  border: 'none',
                  color: '#000000',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(30, 215, 96, 0.35)',
                  transition: 'transform 0.15s ease'
                }}
              >
                <span>{onboardingSlide === features.length - 1 ? 'Proceed to Activation' : 'Next Feature'}</span>
                <ArrowRight size={16} weight="bold" />
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 2: REGISTRATION & LICENSE ACTIVATION */}
        {currentScreen === 'register' && (
          <form onSubmit={handleSubmit} style={{ padding: '28px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '18px' }}>
              <button
                type="button"
                onClick={() => setCurrentScreen('onboarding')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-subdued)',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  marginBottom: '10px'
                }}
              >
                <ArrowLeft size={14} /> Back to Features
              </button>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px' }}>
                Activate Your Studio License
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-subdued)', margin: 0, lineHeight: '1.4' }}>
                Enter your key to unlock ViralClip AI on this computer. 1 Key is locked to 1 PC for lifetime offline use.
              </p>
            </div>

            {/* Offline Notice Alert if no internet */}
            {!isOnline && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(243, 114, 127, 0.12)',
                  border: '1px solid rgba(243, 114, 127, 0.35)',
                  color: '#ff949f',
                  fontSize: '12px',
                  lineHeight: '1.4',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  marginBottom: '16px'
                }}
              >
                <WifiSlash size={20} weight="bold" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Internet Connection Required:</strong>
                  <div>Please connect to the internet for a one-time 5-second activation. Once registered, the software will work 100% offline forever without internet!</div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(243, 114, 127, 0.12)',
                  border: '1px solid #f3727f',
                  color: '#f3727f',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}
              >
                <WarningCircle size={18} weight="bold" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Input 1: License Key */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: 'var(--text-subdued)',
                  marginBottom: '6px',
                  letterSpacing: '0.04em'
                }}
              >
                License Key *
              </label>
              <div style={{ position: 'relative' }}>
                <Key
                  size={18}
                  style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-subdued)' }}
                />
                <input
                  type="text"
                  required
                  placeholder="VC-XXXX-XXXX-XXXX"
                  value={licenseKey}
                  onChange={handleKeyChange}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: '10px',
                    background: '#121212',
                    border: '1px solid #333333',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Input 2: Full Name */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: 'var(--text-subdued)',
                  marginBottom: '6px',
                  letterSpacing: '0.04em'
                }}
              >
                Your Name (Owner)
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={18}
                  style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-subdued)' }}
                />
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: '10px',
                    background: '#121212',
                    border: '1px solid #333333',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Input 3: WhatsApp / Phone */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: 'var(--text-subdued)',
                  marginBottom: '6px',
                  letterSpacing: '0.04em'
                }}
              >
                Phone or WhatsApp Number (Optional)
              </label>
              <div style={{ position: 'relative' }}>
                <Phone
                  size={18}
                  style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-subdued)' }}
                />
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: '10px',
                    background: '#121212',
                    border: '1px solid #333333',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Hardware Lock Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#181818',
                border: '1px solid #282828',
                marginBottom: '20px',
                fontSize: '11px',
                color: 'var(--text-subdued)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <DeviceMobile size={15} color="var(--spotify-green)" />
                <span>Device HWID:</span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#e0e0e0' }}>
                {systemHwid || 'Detecting hardware...'}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '14px 20px',
                borderRadius: '12px',
                background: isSubmitting ? '#2e2e2e' : 'var(--spotify-green)',
                border: 'none',
                color: isSubmitting ? 'var(--text-subdued)' : '#000000',
                fontSize: '14px',
                fontWeight: 800,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: isSubmitting ? 'none' : '0 4px 18px rgba(30, 215, 96, 0.4)',
                transition: 'all 0.2s ease'
              }}
            >
              <ShieldCheck size={20} weight="bold" />
              <span>{isSubmitting ? 'Verifying & Locking to Hardware...' : 'Activate Studio License'}</span>
            </button>
          </form>
        )}

        {/* SCREEN 3: ACTIVATION SUCCESS CELEBRATION */}
        {currentScreen === 'success' && (
          <div
            style={{
              padding: '48px 28px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'rgba(30, 215, 96, 0.15)',
                border: '2px solid var(--spotify-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px',
                boxShadow: '0 0 30px rgba(30, 215, 96, 0.4)'
              }}
            >
              <CheckCircle size={44} weight="fill" color="var(--spotify-green)" />
            </div>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
              Studio Activated Successfully!
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-subdued)', maxWidth: '400px', lineHeight: '1.5', margin: '0 0 20px' }}>
              Welcome <strong style={{ color: '#fff' }}>{successInfo?.registered_name || 'Creator'}</strong>. Your license has been locked to this machine.
              You can now use ViralClip AI completely offline.
            </p>

            <div
              style={{
                background: '#181818',
                border: '1px solid #2e2e2e',
                borderRadius: '10px',
                padding: '10px 20px',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--spotify-green)'
              }}
            >
              Key: {successInfo?.key || licenseKey} • Locked to PC
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
