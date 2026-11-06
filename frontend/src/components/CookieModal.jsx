import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  UploadSimple,
  CheckCircle,
  Trash,
  Cookie,
  Question,
  ArrowSquareOut,
  SpinnerGap
} from '@phosphor-icons/react';

export default function CookieModal({ isOpen, onClose, backendUrl }) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'paste'
  const [cookieStatus, setCookieStatus] = useState({ has_cookies: false, cookie_count: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/cookies/status`);
      if (res.ok) {
        const data = await res.json();
        setCookieStatus(data);
      }
    } catch (e) {
      console.error('Failed to fetch cookie status:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setMessage('');
      setError('');
      fetchStatus();
    }
  }, [isOpen, backendUrl]);

  if (!isOpen) return null;

  const handleFileUpload = async (file) => {
    if (!file) return;
    setIsLoading(true);
    setMessage('');
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${backendUrl}/api/cookies/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || 'Cookies loaded successfully!');
        fetchStatus();
      } else {
        setError(data.detail || 'Failed to upload cookies file.');
      }
    } catch (err) {
      setError(err.message || 'Error uploading file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pasteText.trim()) return;
    setIsLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch(`${backendUrl}/api/cookies/paste`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookies_text: pasteText.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || 'Cookies saved successfully!');
        setPasteText('');
        fetchStatus();
      } else {
        setError(data.detail || 'Failed to save cookies.');
      }
    } catch (err) {
      setError(err.message || 'Error saving cookies.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Remove saved YouTube cookies?')) return;
    setIsLoading(true);
    try {
      await fetch(`${backendUrl}/api/cookies`, { method: 'DELETE' });
      setMessage('Cookies removed.');
      fetchStatus();
    } catch (err) {
      setError('Failed to remove cookies.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#161616',
          border: '1px solid #2e2e2e',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #242424',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(30, 215, 96, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--spotify-green)'
              }}
            >
              <Cookie size={22} weight="fill" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                YouTube Cookies & Authentication
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-subdued)' }}>
                Bypass &quot;Sign in to confirm you&apos;re not a bot&quot; and age restrictions permanently
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-subdued)',
              cursor: 'pointer',
              padding: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Status Bar */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: cookieStatus.has_cookies ? 'rgba(30, 215, 96, 0.1)' : '#1f1f1f',
              border: `1px solid ${cookieStatus.has_cookies ? 'rgba(30, 215, 96, 0.3)' : '#2c2c2c'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: cookieStatus.has_cookies ? 'var(--spotify-green)' : '#888'
                }}
              />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                {cookieStatus.has_cookies
                  ? `Active: ${cookieStatus.cookie_count} YouTube session cookies loaded`
                  : 'No cookies loaded (Public videos work out of the box)'}
              </span>
            </div>
            {cookieStatus.has_cookies && (
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ff6b6b',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Trash size={14} />
                <span>Remove</span>
              </button>
            )}
          </div>

          {/* Feedback messages */}
          {message && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(30, 215, 96, 0.15)', color: 'var(--spotify-green)', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={16} weight="bold" />
              <span>{message}</span>
            </div>
          )}
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(255, 77, 77, 0.15)', color: '#ff6b6b', fontSize: '12px', fontWeight: 700 }}>
              {error}
            </div>
          )}

          {/* Tab Selector */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #242424', paddingBottom: '10px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              style={{
                background: activeTab === 'upload' ? '#252525' : 'transparent',
                color: activeTab === 'upload' ? '#ffffff' : 'var(--text-subdued)',
                border: activeTab === 'upload' ? '1px solid var(--border-subtle)' : 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Upload cookies.txt
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              style={{
                background: activeTab === 'paste' ? '#252525' : 'transparent',
                color: activeTab === 'paste' ? '#ffffff' : 'var(--text-subdued)',
                border: activeTab === 'paste' ? '1px solid var(--border-subtle)' : 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Paste Cookies Text
            </button>
          </div>

          {/* Tab 1: File Upload */}
          {activeTab === 'upload' && (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".txt"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                style={{
                  border: '2px dashed #333',
                  borderRadius: '12px',
                  padding: '30px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: '#121212',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--spotify-green)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#333')}
              >
                <UploadSimple size={32} color="var(--spotify-green)" weight="bold" />
                <p style={{ margin: '10px 0 4px', fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                  {isLoading ? 'Processing cookies...' : 'Click to Select cookies.txt'}
                </p>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-subdued)' }}>
                  Standard Netscape format cookies file exported from your browser
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Paste Text */}
          {activeTab === 'paste' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="# Netscape HTTP Cookie File&#10;.youtube.com&#9;TRUE&#9;/&#9;TRUE&#9;1799999999&#9;LOGIN_INFO&#9;..."
                rows={5}
                style={{
                  width: '100%',
                  background: '#111',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  padding: '10px',
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
              <button
                type="button"
                onClick={handlePasteSubmit}
                disabled={isLoading || !pasteText.trim()}
                className="btn-spotify-primary"
                style={{ padding: '8px 16px', fontSize: '12px', alignSelf: 'flex-end' }}
              >
                {isLoading ? <SpinnerGap className="spin-animation" size={14} /> : 'Save Pasted Cookies'}
              </button>
            </div>
          )}

          {/* 3-Step Quick Guide */}
          <div
            style={{
              background: '#101010',
              borderRadius: '10px',
              padding: '14px 16px',
              border: '1px solid #222',
              fontSize: '11.5px',
              color: 'var(--text-subdued)',
              lineHeight: 1.5
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ffffff', fontWeight: 800, marginBottom: '8px' }}>
              <Question size={15} color="var(--spotify-green)" weight="bold" />
              <span>How to get YouTube cookies in 10 seconds:</span>
            </div>
            <ol style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>
                Install the free Chrome/Edge extension:{' '}
                <a
                  href="https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--spotify-green)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                >
                  Get cookies.txt LOCALLY <ArrowSquareOut size={11} />
                </a>
              </li>
              <li>Open YouTube in your browser and make sure you are signed in.</li>
              <li>Click the extension icon, click &quot;Export&quot;, and upload the downloaded file here.</li>
            </ol>
            <p style={{ margin: '8px 0 0', color: '#888888', fontSize: '10.5px' }}>
              💡 Once saved, your cookies stay locally on this computer so you never see YouTube bot warnings again!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

