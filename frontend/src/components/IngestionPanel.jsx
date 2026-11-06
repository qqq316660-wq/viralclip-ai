import React, { useState, useRef, useMemo } from 'react';
import {
  YoutubeLogo,
  UploadSimple,
  LinkSimple,
  FileText,
  Trash,
  CheckCircle,
  FilmStrip,
  ArrowRight,
  Check,
  X,
  CloudCheck,
  WarningCircle,
  SpinnerGap,
  VideoCamera,
  Clock,
  DownloadSimple,
  Copy,
  ArrowSquareOut,
  Cpu,
  CaretDown,
  CaretUp,
  Code,
  ClockCounterClockwise,
  Cookie,
  ArrowsClockwise,
  Database
} from '@phosphor-icons/react';
import { copyToClipboard } from '../utils/clipboard';
import { KAGGLE_WHISPER_CODE } from '../utils/kaggleCode';

const SAMPLE_URLS = [
  {
    label: 'Karpathy Intro to LLMs',
    url: 'https://www.youtube.com/watch?v=zjkBMFhNj_g'
  }
];

const QUALITY_OPTIONS = [
  { id: 'best', label: 'Best', desc: 'Max (4K/2K/HD)' },
  { id: '2160p', label: '4K', desc: '2160p Ultra HD' },
  { id: '1440p', label: '2K', desc: '1440p Quad HD' },
  { id: '1080p', label: '1080p', desc: 'Full HD' },
  { id: '720p', label: '720p', desc: 'HD' },
  { id: '480p', label: '480p', desc: 'SD' },
  { id: '360p', label: '360p', desc: 'Compact' }
];

export default function IngestionPanel({
  activeTab,
  setActiveTab,
  videoUrl,
  setVideoUrl,
  uploadedFile,
  setUploadedFile,
  uploadedSrt,
  setUploadedSrt,
  videoQuality,
  setVideoQuality,
  hasSrtOption,
  setHasSrtOption,
  hasColabOption,
  setHasColabOption,
  colabUrl,
  setColabUrl,
  backendUrl,
  isProcessing,
  onContinue,
  selectedHistoryVideo = null,
  setSelectedHistoryVideo = () => { },
  onSelectHistoryVideo = () => { },
  onOpenCookieModal = null
}) {
  const [dragOver, setDragOver] = useState(false);
  const [srtDragOver, setSrtDragOver] = useState(false);
  const [videoInfo, setVideoInfo] = useState(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [infoError, setInfoError] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [showKaggleCodePreview, setShowKaggleCodePreview] = useState(false);
  const [codeSelectStatus, setCodeSelectStatus] = useState(false);
  const [historyVideos, setHistoryVideos] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const codeTextareaRef = useRef(null);

  const extractedVideoId = useMemo(() => {
    if (!videoUrl) return null;
    const match = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
    return match ? match[1] : null;
  }, [videoUrl]);

  const ytTranscriptUrl = extractedVideoId
    ? `https://www.youtube-transcript.io/videos?id=${extractedVideoId}`
    : 'https://www.youtube-transcript.io/';

  const fetchHistoryVideos = async () => {
    if (!backendUrl) return;
    setIsLoadingHistory(true);
    setHistoryError('');
    try {
      const res = await fetch(`${backendUrl}/api/history/videos`);
      if (res.ok) {
        const data = await res.json();
        setHistoryVideos(Array.isArray(data) ? data : (data.videos || []));
      } else {
        setHistoryError('Failed to fetch storage history');
      }
    } catch (err) {
      console.error('History fetch error:', err);
      setHistoryError('Backend server not reachable');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  React.useEffect(() => {
    fetchHistoryVideos();
  }, [backendUrl]);

  const handleDeleteHistoryVideo = async (e, videoId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this stored video and its transcription from disk?')) return;
    try {
      const res = await fetch(`${backendUrl}/api/history/videos/${videoId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (selectedHistoryVideo?.id === videoId) {
          setSelectedHistoryVideo(null);
        }
        fetchHistoryVideos();
      }
    } catch (err) {
      console.error('Error deleting stored video:', err);
    }
  };

  const handleCopyKaggleCode = async () => {
    let codeToCopy = KAGGLE_WHISPER_CODE;
    try {
      if (backendUrl) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        const res = await fetch(`${backendUrl}/api/kaggle-code`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const remoteCode = await res.text();
          if (remoteCode && remoteCode.trim().length > 100) {
            codeToCopy = remoteCode;
          }
        }
      }
    } catch (err) {
      console.warn('Backend fetch for kaggle-code failed, using bundled code:', err);
    }

    const copied = await copyToClipboard(codeToCopy);
    if (copied) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } else {
      setShowKaggleCodePreview(true);
      setIsCopied(false);
    }
  };

  const handleSelectAllCode = () => {
    if (codeTextareaRef.current) {
      codeTextareaRef.current.focus();
      codeTextareaRef.current.select();
      codeTextareaRef.current.setSelectionRange(0, codeTextareaRef.current.value.length);
      setCodeSelectStatus(true);
      setTimeout(() => setCodeSelectStatus(false), 2000);
    }
  };

  // Auto-fetch or inspect video info when a valid YouTube URL is entered
  const handleInspectUrl = async (urlToInspect) => {
    let target = (urlToInspect || videoUrl || '').trim();
    if (!target) return;

    if (target.includes('youtube-transcript.io')) {
      const match = target.match(/[?&]id=([\w-]{11})/i);
      if (match && match[1]) {
        target = `https://www.youtube.com/watch?v=${match[1]}`;
        setVideoUrl(target);
      }
    }

    if (target.includes('turboscribe.ai')) {
      setInfoError('TurboScribe.ai is a subtitle transcription service, not a video stream. Please enter a valid YouTube link.');
      return;
    }

    setIsLoadingInfo(true);
    setInfoError('');
    try {
      const res = await fetch(`${backendUrl}/api/video-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target })
      });
      if (res.ok) {
        const data = await res.json();
        setVideoInfo(data);
        if (data.available_qualities && data.available_qualities.length > 0) {
          // If current quality isn't available, pick first
          if (!data.available_qualities.includes(videoQuality)) {
            setVideoQuality(data.available_qualities[0]);
          }
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setInfoError(err.detail || 'Could not fetch video info from URL');
      }
    } catch {
      setInfoError('Backend not reachable for video inspection');
    } finally {
      setIsLoadingInfo(false);
    }
  };

  const handleVideoDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadedFile(e.dataTransfer.files[0]);
      setActiveTab('file');
    }
  };

  const handleSrtDrop = (e) => {
    e.preventDefault();
    setSrtDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadedSrt(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDuration = (sec) => {
    if (!sec) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Determine readiness
  const hasMediaSource =
    (activeTab === 'url' && videoUrl.trim().length > 0) ||
    (activeTab === 'file' && uploadedFile !== null) ||
    (activeTab === 'history' && selectedHistoryVideo !== null);

  const hasValidTranscription =
    activeTab === 'history' ||
    (hasSrtOption === 'yes' && uploadedSrt !== null) ||
    (hasSrtOption === 'no' && hasColabOption === 'yes' && colabUrl.trim().length > 0);

  const isBlocked =
    activeTab !== 'history' && hasSrtOption === 'no' && hasColabOption === 'no';

  const canContinue = hasMediaSource && hasValidTranscription && !isBlocked && !isProcessing;

  const renderKaggleCodeViewer = () => {
    if (!showKaggleCodePreview) return null;
    return (
      <div
        style={{
          marginTop: '14px',
          background: '#0d0d0d',
          border: '1px solid #333333',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.55)'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: '#161616',
            borderBottom: '1px solid #282828',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Code size={16} color="var(--spotify-green)" weight="bold" />
            <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono, monospace)', color: '#ffffff', fontWeight: 600 }}>
              kaggle_whisper_server.py
            </span>
            <span
              style={{
                fontSize: '10px',
                background: 'rgba(29, 185, 84, 0.15)',
                color: 'var(--spotify-green)',
                padding: '2px 7px',
                borderRadius: '4px',
                fontWeight: 700
              }}
            >
              Fixed & Ready for Kaggle T4 x2
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={handleSelectAllCode}
              style={{
                background: codeSelectStatus ? 'var(--spotify-green)' : '#262626',
                color: codeSelectStatus ? '#000000' : '#ffffff',
                border: '1px solid #3a3a3a',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="Select all code inside box"
            >
              {codeSelectStatus ? 'Selected!' : 'Select All'}
            </button>

            <button
              type="button"
              onClick={handleCopyKaggleCode}
              style={{
                background: isCopied ? 'var(--spotify-green)' : '#262626',
                color: isCopied ? '#000000' : '#ffffff',
                border: isCopied ? '1px solid var(--spotify-green)' : '1px solid #3a3a3a',
                borderRadius: '4px',
                padding: '4px 12px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Copy code to clipboard"
            >
              {isCopied ? <Check size={13} weight="bold" /> : <Copy size={13} weight="bold" />}
              <span>{isCopied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>
        </div>

        <textarea
          ref={codeTextareaRef}
          readOnly
          value={KAGGLE_WHISPER_CODE}
          onClick={(e) => e.target.select()}
          rows={14}
          style={{
            width: '100%',
            padding: '12px',
            background: '#080808',
            border: 'none',
            color: '#4ade80',
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            fontSize: '11.5px',
            lineHeight: '1.5',
            resize: 'vertical',
            outline: 'none',
            display: 'block',
            whiteSpace: 'pre',
            overflowX: 'auto'
          }}
        />

        <div
          style={{
            padding: '8px 12px',
            background: '#121212',
            borderTop: '1px solid #222222',
            fontSize: '11px',
            color: 'var(--text-subdued)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '6px'
          }}
        >
          <span>
            💡 <strong>Manual Copy:</strong> Click inside and press <code>Ctrl+A</code> then <code>Ctrl+C</code>.
          </span>
          <span style={{ color: '#888888' }}>
            Paste into a Kaggle Notebook cell & run with GPU T4 x2 + Internet ON
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      className="spotify-card"
      style={{
        maxWidth: '740px',
        margin: '0 auto',
        padding: '32px 28px',
        boxShadow: 'var(--shadow-heavy)'
      }}
    >
      {/* Source Selector Tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '26px'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('url')}
          disabled={isProcessing}
          style={{
            background: activeTab === 'url' ? 'var(--spotify-green)' : 'var(--bg-surface-elevated)',
            color: activeTab === 'url' ? '#000000' : 'var(--text-subdued)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            padding: '9px 22px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 700,
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            transition: 'all 0.15s ease'
          }}
        >
          <YoutubeLogo size={18} weight="fill" />
          <span>YouTube / URL</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('file')}
          disabled={isProcessing}
          style={{
            background: activeTab === 'file' ? 'var(--spotify-green)' : 'var(--bg-surface-elevated)',
            color: activeTab === 'file' ? '#000000' : 'var(--text-subdued)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            padding: '9px 22px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 700,
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            transition: 'all 0.15s ease'
          }}
        >
          <UploadSimple size={18} weight="bold" />
          <span>Upload Video</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('history');
            fetchHistoryVideos();
          }}
          disabled={isProcessing}
          style={{
            background: activeTab === 'history' ? 'var(--spotify-green)' : 'var(--bg-surface-elevated)',
            color: activeTab === 'history' ? '#000000' : 'var(--text-subdued)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            padding: '9px 22px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 700,
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            transition: 'all 0.15s ease'
          }}
        >
          <ClockCounterClockwise size={18} weight={activeTab === 'history' ? 'bold' : 'regular'} />
          <span>Storage History {historyVideos.length > 0 ? `(${historyVideos.length})` : ''}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: YouTube / URL */}
      {/* ========================================================================= */}
      {activeTab === 'url' && (
        <div>
          {/* URL Input Bar */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <div
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-subdued)',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <LinkSimple size={20} />
            </div>

            <input
              type="text"
              value={videoUrl}
              onChange={(e) => {
                let val = e.target.value;
                if (val.includes('youtube-transcript.io')) {
                  const m = val.match(/[?&]id=([\w-]{11})/i);
                  if (m && m[1]) {
                    val = `https://www.youtube.com/watch?v=${m[1]}`;
                  }
                }
                setVideoUrl(val);
                setVideoInfo(null);
                setInfoError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleInspectUrl();
              }}
              placeholder="Paste YouTube video or web video link..."
              disabled={isProcessing}
              className="spotify-pill-input"
              style={{ height: '48px', paddingRight: '120px' }}
            />

            <button
              type="button"
              disabled={isProcessing || !videoUrl.trim() || isLoadingInfo}
              onClick={() => handleInspectUrl()}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'var(--bg-surface-elevated)',
                color: videoUrl.trim() ? 'var(--spotify-green)' : 'var(--text-subdued)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-full)',
                padding: '6px 14px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                cursor: videoUrl.trim() ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              {isLoadingInfo ? (
                <>
                  <SpinnerGap size={14} className="spin-animation" />
                  <span>Checking...</span>
                </>
              ) : (
                <span>Inspect</span>
              )}
            </button>
          </div>

          {/* Quick Samples & Paste Shortcut */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-subdued)' }}>Sample:</span>
              {SAMPLE_URLS.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  disabled={isProcessing}
                  onClick={() => {
                    setVideoUrl(sample.url);
                    setVideoInfo(null);
                    handleInspectUrl(sample.url);
                  }}
                  style={{
                    background: '#242424',
                    border: 'none',
                    color: 'var(--text-subdued)',
                    borderRadius: 'var(--radius-full)',
                    padding: '3px 10px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.target.style.color = '#ffffff')}
                  onMouseLeave={(e) => (e.target.style.color = 'var(--text-subdued)')}
                >
                  {sample.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {onOpenCookieModal && (
                <button
                  type="button"
                  onClick={onOpenCookieModal}
                  title="Configure YouTube cookies to bypass sign-in & bot restrictions"
                  style={{
                    background: 'rgba(30, 215, 96, 0.1)',
                    border: '1px solid rgba(30, 215, 96, 0.25)',
                    color: 'var(--spotify-green)',
                    borderRadius: 'var(--radius-full)',
                    padding: '3px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Cookie size={13} weight="fill" />
                  <span>Cookies / Login</span>
                </button>
              )}

              <button
                type="button"
                disabled={isProcessing}
                onClick={async () => {
                  try {
                    let clip = await navigator.clipboard.readText();
                    if (clip) {
                      clip = clip.trim();
                      if (clip.includes('youtube-transcript.io')) {
                        const m = clip.match(/[?&]id=([\w-]{11})/i);
                        if (m && m[1]) {
                          clip = `https://www.youtube.com/watch?v=${m[1]}`;
                        }
                      }
                      setVideoUrl(clip);
                      setVideoInfo(null);
                      handleInspectUrl(clip);
                    }
                  } catch {
                    // Ignore
                  }
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--spotify-green)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                Paste Link
              </button>
            </div>
          </div>

          {/* Inspection Error Banner (if any) */}
          {infoError && (
            <div
              style={{
                background: '#29181a',
                border: '1px solid var(--text-negative)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                color: 'var(--text-negative)',
                fontSize: '12px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <WarningCircle size={16} weight="fill" />
              <span>{infoError}</span>
            </div>
          )}

          {/* Video Preview Card if Inspected */}
          {videoInfo && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                background: '#191919',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                marginBottom: '20px'
              }}
            >
              {videoInfo.thumbnail ? (
                <img
                  src={videoInfo.thumbnail}
                  alt="Thumbnail"
                  style={{
                    width: '96px',
                    height: '54px',
                    borderRadius: 'var(--radius-sm)',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#262626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--spotify-green)'
                  }}
                >
                  <VideoCamera size={24} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {videoInfo.title}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginTop: '4px',
                    fontSize: '11px',
                    color: 'var(--text-subdued)'
                  }}
                >
                  {videoInfo.uploader && <span>{videoInfo.uploader}</span>}
                  {videoInfo.duration > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      {formatDuration(videoInfo.duration)}
                    </span>
                  )}
                  <span
                    style={{
                      background: 'rgba(30, 215, 96, 0.1)',
                      color: 'var(--spotify-green)',
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-xs)',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    yt-dlp ready
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* YT-DLP Quality Selection (User Requirement 1: "yt-dlp quality set kar sakte hai kya?") */}
          {videoUrl.trim().length > 0 && (
            <div
              style={{
                background: '#151515',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: '20px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                    1. Select yt-dlp Video Download Quality
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-subdued)' }}>
                    Choose the resolution yt-dlp will download before clipping
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--spotify-green)',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  {videoQuality.toUpperCase()}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '8px'
                }}
              >
                {QUALITY_OPTIONS.map((q) => {
                  const isSelected = videoQuality === q.id;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setVideoQuality(q.id)}
                      style={{
                        background: isSelected ? 'rgba(30, 215, 96, 0.15)' : '#202020',
                        border: isSelected
                          ? '1px solid var(--spotify-green)'
                          : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 4px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        color: isSelected ? '#ffffff' : 'var(--text-subdued)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: isSelected ? 'var(--spotify-green)' : '#ffffff'
                        }}
                      >
                        {q.label}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-subdued)' }}>
                        {q.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: Upload Video File */}
      {/* ========================================================================= */}
      {activeTab === 'file' && (
        <div style={{ marginBottom: '20px' }}>
          {!uploadedFile ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleVideoDrop}
              onClick={() => document.getElementById('spotify-video-input')?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--spotify-green)' : '#333333'}`,
                borderRadius: 'var(--radius-md)',
                padding: '36px 20px',
                textAlign: 'center',
                background: dragOver ? 'rgba(30, 215, 96, 0.05)' : '#151515',
                cursor: 'pointer',
                transition: 'all 0.18s ease'
              }}
            >
              <input
                id="spotify-video-input"
                type="file"
                accept="video/mp4,video/quicktime,video/x-matroska,video/webm"
                style={{ display: 'none' }}
                disabled={isProcessing}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadedFile(e.target.files[0]);
                  }
                }}
              />
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: 'var(--radius-circle)',
                  background: '#242424',
                  color: 'var(--spotify-green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px'
                }}
              >
                <UploadSimple size={22} weight="bold" />
              </div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px', color: '#ffffff' }}>
                Select or drop your video file
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-subdued)' }}>
                Supports MP4, MOV, MKV, or WebM
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                background: '#1c1c1c',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #2e2e2e'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(30, 215, 96, 0.1)',
                    color: 'var(--spotify-green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FilmStrip size={22} weight="bold" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                    {uploadedFile.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-subdued)', fontFamily: 'var(--font-mono)' }}>
                    {formatFileSize(uploadedFile.size)} • Ready for processing
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setUploadedFile(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-negative)',
                  cursor: 'pointer',
                  padding: '6px'
                }}
                title="Remove video file"
              >
                <Trash size={18} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: Storage History / Previously Processed Videos */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClockCounterClockwise size={18} color="var(--spotify-green)" weight="bold" />
                <span>Previously Processed Videos & Transcripts</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-subdued)', marginTop: '2px' }}>
                Re-use already downloaded videos to generate more shorts instantly without re-downloading or re-transcribing.
              </div>
            </div>

            <button
              type="button"
              onClick={fetchHistoryVideos}
              disabled={isLoadingHistory}
              style={{
                background: '#242424',
                border: '1px solid #383838',
                color: '#ffffff',
                borderRadius: 'var(--radius-full)',
                padding: '5px 12px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Refresh storage history"
            >
              <ArrowsClockwise size={13} className={isLoadingHistory ? 'spin-animation' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {isLoadingHistory ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-subdued)' }}>
              <SpinnerGap size={24} className="spin-animation" style={{ margin: '0 auto 8px', display: 'block' }} />
              <div style={{ fontSize: '12px' }}>Scanning storage directory...</div>
            </div>
          ) : historyVideos.length === 0 ? (
            <div
              style={{
                border: '1px dashed #333333',
                borderRadius: 'var(--radius-md)',
                padding: '36px 20px',
                textAlign: 'center',
                background: '#151515'
              }}
            >
              <Database size={32} color="var(--text-subdued)" style={{ margin: '0 auto 10px', display: 'block' }} />
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                No Stored Videos Found Yet
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-subdued)', maxWidth: '420px', margin: '0 auto' }}>
                Videos you download from YouTube or upload directly are saved in storage. Process your first video using the YouTube or Upload tab above, and it will appear here for instant 1-click re-use!
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {historyVideos.map((item) => {
                const isSelected = selectedHistoryVideo?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectHistoryVideo(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: isSelected ? 'rgba(30, 215, 96, 0.08)' : '#181818',
                      border: isSelected
                        ? '1px solid var(--spotify-green)'
                        : '1px solid #282828',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      gap: '12px'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.borderColor = '#444444';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.borderColor = '#282828';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: 'var(--radius-sm)',
                          background: isSelected ? 'var(--spotify-green)' : '#242424',
                          color: isSelected ? '#000000' : 'var(--spotify-green)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <FilmStrip size={22} weight={isSelected ? 'fill' : 'bold'} />
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#ffffff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={item.title || item.filename}
                        >
                          {item.title || item.filename}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginTop: '3px',
                            fontSize: '11px',
                            color: 'var(--text-subdued)',
                            flexWrap: 'wrap'
                          }}
                        >
                          {(item.duration_formatted || item.duration_str) && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={12} />
                              {item.duration_formatted || item.duration_str}
                            </span>
                          )}
                          <span>{(item.size_mb ?? item.file_size_mb)} MB</span>
                          {(item.has_transcription || item.has_transcript) ? (
                            <span
                              style={{
                                background: 'rgba(30, 215, 96, 0.15)',
                                color: 'var(--spotify-green)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: 700,
                                fontSize: '10.5px'
                              }}
                            >
                              ✓ Transcript Ready ({item.segments_count} segments)
                            </span>
                          ) : (
                            <span
                              style={{
                                background: '#2c2c2c',
                                color: '#aaaaaa',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '10.5px'
                              }}
                            >
                              Video Only
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectHistoryVideo(item);
                        }}
                        style={{
                          background: isSelected ? 'var(--spotify-green)' : '#262626',
                          color: isSelected ? '#000000' : '#ffffff',
                          border: isSelected ? '1px solid var(--spotify-green)' : '1px solid #3c3c3c',
                          borderRadius: 'var(--radius-full)',
                          padding: '6px 14px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isSelected ? <Check size={13} weight="bold" /> : <ArrowRight size={13} weight="bold" />}
                        <span>{isSelected ? 'Selected' : 'Use Video'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteHistoryVideo(e, item.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-subdued)',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '4px'
                        }}
                        title="Delete from storage"
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-negative)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-subdued)')}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected Video Summary Strip if in History Tab */}
          {selectedHistoryVideo && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: '#142018',
                border: '1px solid var(--spotify-green)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle size={20} weight="fill" color="var(--spotify-green)" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                    {selectedHistoryVideo.title || selectedHistoryVideo.filename}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--spotify-green)' }}>
                    Ready for new shorts! Click "Continue to Settings" below to choose clip count (up to 20) and subtitle styles.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedHistoryVideo(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-subdued)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  textDecoration: 'underline'
                }}
              >
                Change Video
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP FLOW: Subtitle Check (.SRT) & Google Colab GPU */}
      {/* ========================================================================= */}
      {hasMediaSource && activeTab !== 'history' && (
        <div
          style={{
            borderTop: '1px solid var(--separator)',
            paddingTop: '20px',
            marginBottom: '26px'
          }}
        >
          {/* Question 1: Do you have a .SRT file? */}
          <div
            style={{
              background: '#161616',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              padding: '18px 20px',
              marginBottom: '16px'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                  {activeTab === 'url' ? '2.' : '1.'} Do you have a .SRT subtitle file for this video?
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-subdued)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span>If YES: Whisper transcription is skipped. Free SRT tools:</span>
                  <a
                    href={ytTranscriptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={extractedVideoId ? `Open YouTube Transcript for ${extractedVideoId}` : "Open YouTube-Transcript.io"}
                    style={{ color: '#ff6b6b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}
                  >
                    YouTube-Transcript.io <ArrowSquareOut size={11} weight="bold" />
                  </a>
                  <span style={{ color: '#555555' }}>•</span>
                  <a
                    href="https://turboscribe.ai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open TurboScribe.ai"
                    style={{ color: 'var(--spotify-green)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}
                  >
                    TurboScribe.ai <ArrowSquareOut size={11} weight="bold" />
                  </a>
                </div>
              </div>

              {/* Yes / No Toggle Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => {
                    setHasSrtOption('yes');
                    setHasColabOption(null);
                  }}
                  style={{
                    background:
                      hasSrtOption === 'yes' ? 'var(--spotify-green)' : 'var(--bg-surface-elevated)',
                    color: hasSrtOption === 'yes' ? '#000000' : 'var(--text-subdued)',
                    border:
                      hasSrtOption === 'yes'
                        ? '1px solid var(--spotify-green)'
                        : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-full)',
                    padding: '6px 18px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Check size={14} weight="bold" />
                  <span>Yes, I have .SRT</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => {
                    setHasSrtOption('no');
                    setUploadedSrt(null);
                  }}
                  style={{
                    background:
                      hasSrtOption === 'no' ? '#2c2c2c' : 'var(--bg-surface-elevated)',
                    color: hasSrtOption === 'no' ? '#ffffff' : 'var(--text-subdued)',
                    border:
                      hasSrtOption === 'no'
                        ? '1px solid #555555'
                        : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-full)',
                    padding: '6px 18px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <X size={14} weight="bold" />
                  <span>No .SRT</span>
                </button>
              </div>
            </div>

            {/* If YES to .SRT: Show SRT File Upload */}
            {hasSrtOption === 'yes' && (
              <div style={{ marginTop: '16px', borderTop: '1px solid #242424', paddingTop: '14px' }}>
                {!uploadedSrt ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setSrtDragOver(true);
                    }}
                    onDragLeave={() => setSrtDragOver(false)}
                    onDrop={handleSrtDrop}
                    onClick={() => document.getElementById('spotify-srt-input')?.click()}
                    style={{
                      border: `1px dashed ${srtDragOver ? 'var(--spotify-green)' : '#3e3e3e'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: srtDragOver ? 'rgba(30, 215, 96, 0.05)' : '#121212',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      id="spotify-srt-input"
                      type="file"
                      accept=".srt,.vtt,text/plain"
                      style={{ display: 'none' }}
                      disabled={isProcessing}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setUploadedSrt(e.target.files[0]);
                        }
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={18} color="var(--spotify-green)" />
                      <span style={{ fontSize: '12px', color: 'var(--text-subdued)' }}>
                        Click or drag to attach your <strong>.SRT</strong> or <strong>.VTT</strong> file
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--spotify-green)',
                        background: 'rgba(30, 215, 96, 0.1)',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)'
                      }}
                    >
                      Browse SRT
                    </span>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: '#1e1e1e',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(30, 215, 96, 0.4)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckCircle size={18} weight="fill" color="var(--spotify-green)" />
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                          {uploadedSrt.name}
                        </span>
                        <div style={{ fontSize: '11px', color: 'var(--spotify-green)' }}>
                          SRT Attached • Whisper Skipped (0s Instant Sync)
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadedSrt(null)}
                      disabled={isProcessing}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-negative)',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                )}

                {/* 1-Click Online Subtitle (.SRT) Tool Links */}
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    background: '#191919',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid #2b2b2b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={15} color="var(--spotify-green)" />
                    <span style={{ fontSize: '11px', color: '#b3b3b3', fontWeight: 500 }}>
                      Don't have .SRT yet? Generate free transcript in 1-click:
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <a
                      href={ytTranscriptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={extractedVideoId ? `Open YouTube Transcript for ID: ${extractedVideoId}` : 'Open YouTube-Transcript.io'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#232323',
                        color: '#ffffff',
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '11px',
                        fontWeight: 700,
                        textDecoration: 'none',
                        border: '1px solid #3c3c3c',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#2e2e2e';
                        e.currentTarget.style.borderColor = '#ff4444';
                        e.currentTarget.style.color = '#ff6b6b';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#232323';
                        e.currentTarget.style.borderColor = '#3c3c3c';
                        e.currentTarget.style.color = '#ffffff';
                      }}
                    >
                      <YoutubeLogo size={15} color="#ff4444" weight="fill" />
                      <span>YouTube-Transcript.io</span>
                      <ArrowSquareOut size={12} weight="bold" />
                    </a>

                    <a
                      href="https://turboscribe.ai/"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open TurboScribe.ai to generate free subtitles"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#232323',
                        color: '#ffffff',
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '11px',
                        fontWeight: 700,
                        textDecoration: 'none',
                        border: '1px solid #3c3c3c',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#2e2e2e';
                        e.currentTarget.style.borderColor = 'var(--spotify-green)';
                        e.currentTarget.style.color = 'var(--spotify-green)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#232323';
                        e.currentTarget.style.borderColor = '#3c3c3c';
                        e.currentTarget.style.color = '#ffffff';
                      }}
                    >
                      <span>⚡ TurboScribe.ai</span>
                      <ArrowSquareOut size={12} weight="bold" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Question 2: If user said NO to .SRT -> Ask for Kaggle Free GPU */}
          {hasSrtOption === 'no' && (
            <div
              style={{
                background: '#161616',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                padding: '20px 22px',
                marginBottom: '16px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Cpu size={18} color="var(--spotify-green)" weight="bold" />
                    <span>Connect Kaggle Free GPU (T4 x2) for AI Transcription?</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-subdued)', marginTop: '4px' }}>
                    Kaggle provides 30 hours of free dual T4 GPU every week for high-speed Whisper transcription.
                  </div>
                </div>

                {/* Yes / No Toggle for Kaggle */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setHasColabOption('yes')}
                    style={{
                      background:
                        hasColabOption === 'yes'
                          ? 'var(--spotify-green)'
                          : 'var(--bg-surface-elevated)',
                      color: hasColabOption === 'yes' ? '#000000' : 'var(--text-subdued)',
                      border:
                        hasColabOption === 'yes'
                          ? '1px solid var(--spotify-green)'
                          : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-full)',
                      padding: '6px 18px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Check size={14} weight="bold" />
                    <span>Yes, I have Kaggle URL</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => {
                      setHasColabOption('no');
                      setColabUrl('');
                    }}
                    style={{
                      background:
                        hasColabOption === 'no' ? '#2c2c2c' : 'var(--bg-surface-elevated)',
                      color: hasColabOption === 'no' ? '#ffffff' : 'var(--text-subdued)',
                      border:
                        hasColabOption === 'no'
                          ? '1px solid #555555'
                          : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-full)',
                      padding: '6px 18px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <X size={14} weight="bold" />
                    <span>No / Guide Me & Setup</span>
                  </button>
                </div>
              </div>

              {/* If YES to Kaggle GPU: URL Input Field */}
              {hasColabOption === 'yes' && (
                <div
                  style={{
                    marginTop: '16px',
                    borderTop: '1px solid #242424',
                    paddingTop: '14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: 'var(--text-subdued)'
                      }}
                    >
                      Kaggle GPU Tunnel URL
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={handleCopyKaggleCode}
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: isCopied ? '#000000' : '#ffffff',
                          background: isCopied ? 'var(--spotify-green)' : '#242424',
                          border: isCopied ? '1px solid var(--spotify-green)' : '1px solid #3a3a3a',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isCopied ? <Check size={13} weight="bold" /> : <Copy size={13} weight="bold" />}
                        <span>{isCopied ? 'Copied to Clipboard!' : 'Copy Python Code'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowKaggleCodePreview(!showKaggleCodePreview)}
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: showKaggleCodePreview ? 'var(--spotify-green)' : '#d0d0d0',
                          background: showKaggleCodePreview ? 'rgba(29, 185, 84, 0.12)' : '#242424',
                          border: showKaggleCodePreview ? '1px solid var(--spotify-green)' : '1px solid #3a3a3a',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease'
                        }}
                        title="Drag-down / View full Python code"
                      >
                        {showKaggleCodePreview ? <CaretUp size={13} weight="bold" /> : <CaretDown size={13} weight="bold" />}
                        <span>{showKaggleCodePreview ? 'Hide Code ▲' : 'Drag-Down Code ▼'}</span>
                      </button>
                    </div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={colabUrl}
                      onChange={(e) => setColabUrl(e.target.value)}
                      placeholder="https://your-tunnel.trycloudflare.com or https://xxxx.ngrok-free.app"
                      disabled={isProcessing}
                      className="spotify-pill-input"
                      style={{ height: '42px', fontSize: '13px' }}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '8px',
                      fontSize: '11px',
                      color: colabUrl.trim() ? 'var(--spotify-green)' : 'var(--text-subdued)'
                    }}
                  >
                    <CloudCheck size={14} />
                    <span>
                      {colabUrl.trim()
                        ? 'Kaggle GPU endpoint connected! Pipeline will send audio here for high-speed transcription.'
                        : 'Paste the public URL generated by your Kaggle notebook cell above.'}
                    </span>
                  </div>

                  {/* Drag-Down Code Viewer */}
                  {renderKaggleCodeViewer()}
                </div>
              )}

              {/* If NO to Kaggle GPU: Complete Step-by-Step Setup Guide */}
              {hasColabOption === 'no' && (
                <div
                  style={{
                    marginTop: '16px',
                    borderTop: '1px solid #242424',
                    paddingTop: '16px'
                  }}
                >
                  <div
                    style={{
                      background: '#1a1a1a',
                      border: '1px solid #333333',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px 18px',
                      color: '#ffffff'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--spotify-green)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>⚡ Get 30 Hours/Week of Free T4 x2 GPU on Kaggle</span>
                      </div>
                      <a
                        href="https://www.kaggle.com/code"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: 'var(--spotify-green)',
                          color: '#000000',
                          padding: '5px 12px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '11px',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>Open Kaggle Notebooks</span>
                        <ArrowSquareOut size={13} weight="bold" />
                      </a>
                    </div>

                    {/* Step-by-step numbered instructions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: '#cccccc' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <span style={{ background: '#292929', color: 'var(--spotify-green)', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px', flexShrink: 0 }}>1</span>
                        <div>
                          <strong style={{ color: '#ffffff' }}>Verify Mobile Number (Required for GPU):</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-subdued)', marginTop: '2px' }}>
                            Go to your Kaggle Profile ➔ Settings ➔ <strong>Phone Verification</strong>. Verifying your mobile number instantly unlocks 30 hours of free GPU T4 x2 quota every week!
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <span style={{ background: '#292929', color: 'var(--spotify-green)', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px', flexShrink: 0 }}>2</span>
                        <div>
                          <strong style={{ color: '#ffffff' }}>Create New Notebook & Enable GPU:</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-subdued)', marginTop: '2px' }}>
                            Click "New Notebook" on Kaggle. In the right sidebar: <strong>Settings ➔ Accelerator ➔ select "GPU T4 x2"</strong>. Also ensure <strong>Internet: On</strong> is toggled.
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <span style={{ background: '#292929', color: 'var(--spotify-green)', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px', flexShrink: 0 }}>3</span>
                        <div style={{ flex: 1 }}>
                          <strong style={{ color: '#ffffff' }}>Copy Whisper GPU Server Code:</strong>
                          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={handleCopyKaggleCode}
                              style={{
                                background: isCopied ? 'var(--spotify-green)' : '#2b2b2b',
                                color: isCopied ? '#000000' : '#ffffff',
                                border: isCopied ? '1px solid var(--spotify-green)' : '1px solid #444444',
                                borderRadius: 'var(--radius-full)',
                                padding: '7px 16px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {isCopied ? <Check size={15} weight="bold" /> : <Copy size={15} weight="bold" />}
                              <span>{isCopied ? 'Code Copied to Clipboard!' : 'Copy Python Code for Kaggle/Colab'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setShowKaggleCodePreview(!showKaggleCodePreview)}
                              style={{
                                background: showKaggleCodePreview ? 'rgba(29, 185, 84, 0.15)' : '#222222',
                                color: showKaggleCodePreview ? 'var(--spotify-green)' : '#ffffff',
                                border: showKaggleCodePreview ? '1px solid var(--spotify-green)' : '1px solid #444444',
                                borderRadius: 'var(--radius-full)',
                                padding: '7px 14px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.15s ease'
                              }}
                              title="Drag-down to reveal entire Python code"
                            >
                              {showKaggleCodePreview ? <CaretUp size={14} weight="bold" /> : <CaretDown size={14} weight="bold" />}
                              <span>{showKaggleCodePreview ? 'Hide Python Script ▲' : 'Drag-Down / View Full Code ▼'}</span>
                            </button>
                          </div>

                          {/* Drag-Down Code Viewer */}
                          {renderKaggleCodeViewer()}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <span style={{ background: '#292929', color: 'var(--spotify-green)', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px', flexShrink: 0 }}>4</span>
                        <div>
                          <strong style={{ color: '#ffffff' }}>Run Cell & Copy Link:</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-subdued)', marginTop: '2px' }}>
                            Run the cell on Kaggle. It will output: <code style={{ color: 'var(--spotify-green)', background: '#111', padding: '1px 4px', borderRadius: '3px' }}>🔥 YOUR PUBLIC KAGGLE WHISPER URL IS: https://xyz.trycloudflare.com</code>. Copy that link.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Switchers */}
                    <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #282828', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setHasColabOption('yes')}
                        style={{
                          background: 'var(--spotify-green)',
                          color: '#000000',
                          border: 'none',
                          borderRadius: 'var(--radius-full)',
                          padding: '6px 16px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Check size={14} weight="bold" />
                        <span>I Have the URL Now ➔ Enter Link</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setHasSrtOption('yes');
                          setHasColabOption(null);
                        }}
                        style={{
                          background: '#282828',
                          color: '#ffffff',
                          border: '1px solid #444',
                          borderRadius: 'var(--radius-full)',
                          padding: '6px 14px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Provide .SRT file instead
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* Bottom Forward Action Button */}
      {/* ========================================================================= */}
      <div style={{ textAlign: 'center' }}>
        <button
          type="button"
          className="btn-spotify-primary"
          disabled={!canContinue}
          onClick={onContinue}
          style={{
            width: '100%',
            maxWidth: '380px',
            opacity: canContinue ? 1 : 0.45,
            cursor: canContinue ? 'pointer' : 'not-allowed'
          }}
        >
          <span>
            {activeTab === 'history'
              ? (selectedHistoryVideo ? 'Continue to Settings (Ready)' : 'Select a Stored Video Above')
              : !hasMediaSource
                ? 'Provide Video First'
                : hasSrtOption === null
                  ? 'Confirm Subtitle / GPU Choice'
                  : hasSrtOption === 'yes' && !uploadedSrt
                    ? 'Upload .SRT File to Continue'
                    : isBlocked
                      ? 'Blocked (SRT or GPU Required)'
                      : hasSrtOption === 'no' && hasColabOption === 'yes' && !colabUrl.trim()
                        ? 'Enter Kaggle URL to Continue'
                        : 'Continue to Settings'}
          </span>
          <ArrowRight size={18} weight="bold" />
        </button>
      </div>
    </div>
  );
}
