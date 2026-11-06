import React, { useState, useRef, useEffect } from 'react';
import {
  DeviceMobile,
  Square,
  Monitor,
  ArrowLeft,
  ArrowRight,
  Sparkle,
  Check,
  CloudCheck,
  Crop,
  TextT,
  ArrowsVertical,
  ArrowsHorizontal,
  ArrowCounterClockwise,
  MusicNote,
  Play,
  Pause,
  UploadSimple,
  Trash,
  SpeakerHigh,
  Sliders,
  Palette
} from '@phosphor-icons/react';
import PhonePreview from './PhonePreview';
import TemplatePanel from './TemplatePanel';

const SUBTITLE_PRESETS = [
  {
    id: 'single_word_pop',
    name: '1-Word Pop',
    badge: 'VIRAL',
    description: 'High-retention 1-word punchy pop animation',
    highlightColor: '#facc15',
    isSingleWord: true
  },
  {
    id: 'hormozi',
    name: 'Alex Hormozi',
    badge: 'POPULAR',
    description: 'Bold yellow bounce karaoke headline styling',
    highlightColor: '#facc15',
    isSingleWord: false
  },
  {
    id: 'mrbeast',
    name: 'MrBeast Pop',
    badge: 'DYNAMIC',
    description: 'Vibrant neon green word burst highlight',
    highlightColor: '#1ed760',
    isSingleWord: false
  },
  {
    id: 'ali_abdaal',
    name: 'Ali Abdaal',
    badge: 'STUDY',
    description: 'Clean modern yellow focus highlight with soft shadow',
    highlightColor: '#fef08a',
    isSingleWord: false
  },
  {
    id: 'iman_gadzhi',
    name: 'Iman Gadzhi',
    badge: 'LUXURY',
    description: 'Cinematic gold uppercase with high tracking',
    highlightColor: '#fbbf24',
    isSingleWord: false
  },
  {
    id: 'tiktok_bounce',
    name: 'TikTok Viral',
    badge: 'TRENDING',
    description: 'Vibrant electric cyan pop with high contrast outline',
    highlightColor: '#00f2fe',
    isSingleWord: false
  },
  {
    id: 'podcast_box',
    name: 'Podcast Box',
    badge: 'INTERVIEW',
    description: 'Dark pill backing box with crisp yellow highlight',
    highlightColor: '#facc15',
    isSingleWord: false
  },
  {
    id: 'comic_punch',
    name: 'Comic Punch',
    badge: 'ENERGETIC',
    description: 'Slanted comic heavy font with comic stroke',
    highlightColor: '#fb923c',
    isSingleWord: false
  },
  {
    id: 'velocity',
    name: 'Velocity Cyan',
    badge: 'FAST-PACED',
    description: 'Electric cyan word karaoke highlight',
    highlightColor: '#38bdf8',
    isSingleWord: false
  },
  {
    id: 'minimal',
    name: 'Clean Minimal',
    badge: 'EDITORIAL',
    description: 'Editorial sans with subtle pure focus',
    highlightColor: '#ffffff',
    isSingleWord: false
  }
];

export default function SettingsBar({
  activeTab,
  videoUrl,
  uploadedFile,
  uploadedSrt,
  selectedHistoryVideo = null,
  videoQuality,
  aspectRatio,
  setAspectRatio,
  fitMode,
  setFitMode,
  subtitleStyle,
  setSubtitleStyle,
  captionPosition = 'bottom',
  setCaptionPosition,
  captionOffsetX = 0,
  setCaptionOffsetX,
  captionOffsetY = 0,
  setCaptionOffsetY,
  captionScale = 1.0,
  setCaptionScale,
  numClips,
  setNumClips,
  selectionMode = 'ai_prompt',
  setSelectionMode,
  colabUrl,
  isProcessing,
  onBack,
  onStartGeneration,
  // Background Music Props
  uploadedMusic = null,
  setUploadedMusic,
  musicVolume = 0.20,
  setMusicVolume,
  originalVolume = 1.00,
  setOriginalVolume,
  musicStartTime = 0.0,
  setMusicStartTime,
  // Template & Branding Props
  templatePreset = 'shorts_white_card',
  setTemplatePreset,
  templateBgColor = '#ffffff',
  setTemplateBgColor,
  templateCardPadding = true,
  setTemplateCardPadding,
  templateCornerRadius = 12,
  setTemplateCornerRadius,
  templateHookEnabled = true,
  setTemplateHookEnabled,
  templateHookMode = 'ai_hook',
  setTemplateHookMode,
  templateHookText = 'WAIT TILL THE END 😱',
  setTemplateHookText,
  templateHookColor = '#000000',
  setTemplateHookColor,
  templateHookBg = 'transparent',
  setTemplateHookBg,
  templateHookBgColor = '#facc15',
  setTemplateHookBgColor,
  templateHookRadius = 14,
  setTemplateHookRadius,
  templateHookBorder = false,
  setTemplateHookBorder,
  templateHookBorderColor = '#000000',
  setTemplateHookBorderColor,
  templateHookX = 50,
  setTemplateHookX,
  templateHookY = 48,
  setTemplateHookY,
  templateHookSize = 15,
  setTemplateHookSize,
  templateLogoEnabled = false,
  setTemplateLogoEnabled,
  uploadedLogo = null,
  setUploadedLogo,
  logoPreviewUrl = null,
  setLogoPreviewUrl,
  templateLogoPosition = 'top_left',
  setTemplateLogoPosition,
  templateLogoX = 8,
  setTemplateLogoX,
  templateLogoY = 7,
  setTemplateLogoY,
  templateLogoSize = 36,
  setTemplateLogoSize,
  templateLogoOpacity = 1.0,
  setTemplateLogoOpacity,
  templateWatermarkEnabled = false,
  setTemplateWatermarkEnabled,
  templateWatermarkType = 'text',
  setTemplateWatermarkType,
  templateWatermarkText = '@yourchannel',
  setTemplateWatermarkText,
  templateWatermarkPosition = 'bottom_center',
  setTemplateWatermarkPosition,
  templateWatermarkX = 50,
  setTemplateWatermarkX,
  templateWatermarkY = 22,
  setTemplateWatermarkY,
  templateWatermarkColor = '#a1a1aa',
  setTemplateWatermarkColor,
  templateWatermarkOpacity = 0.85,
  setTemplateWatermarkOpacity,
  // Viral Social Card Props
  templateSocialCardEnabled = false,
  setTemplateSocialCardEnabled,
  templateChannelName = 'ViralClip AI',
  setTemplateChannelName,
  templateChannelHandle = '@viral_clip_ai',
  setTemplateChannelHandle,
  templateLikeSubscribeEnabled = false,
  setTemplateLikeSubscribeEnabled,
  templateSocialCardBg = '#0c0f14',
  setTemplateSocialCardBg,
  templateSocialFooterEnabled = false,
  setTemplateSocialFooterEnabled
}) {
  // Active settings tab: 'frame', 'caption', 'template', or 'music' (default to frame for clean starting UX)
  const [activeSubTab, setActiveSubTab] = useState('frame');

  // Audio Playback & Preview State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState(null);
  const audioRef = useRef(null);
  const musicFileInputRef = useRef(null);

  // Sync object URL for uploaded music
  useEffect(() => {
    if (uploadedMusic) {
      const url = URL.createObjectURL(uploadedMusic);
      setAudioBlobUrl(url);
      setIsPlaying(false);
      setPlaybackTime(0);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setAudioBlobUrl(null);
      setIsPlaying(false);
      setPlaybackTime(0);
      setAudioDuration(0);
    }
  }, [uploadedMusic]);

  // Audio preview listeners
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setPlaybackTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration || 0);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((err) => {
        console.warn('Audio play prevented:', err);
      });
    }
  };

  const handleSeek = (newTime) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setPlaybackTime(newTime);
    }
  };

  const handleJumpToOffset = (offsetSec) => {
    setMusicStartTime && setMusicStartTime(offsetSec);
    if (audioRef.current) {
      audioRef.current.currentTime = offsetSec;
      setPlaybackTime(offsetSec);
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSetCurrentAsOffset = () => {
    if (setMusicStartTime) {
      setMusicStartTime(Math.round(playbackTime * 10) / 10);
    }
  };

  const handleRemoveMusic = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setUploadedMusic && setUploadedMusic(null);
    setMusicStartTime && setMusicStartTime(0);
    if (musicFileInputRef.current) {
      musicFileInputRef.current.value = '';
    }
  };

  const formatSecs = (sec) => {
    if (isNaN(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      style={{
        maxWidth: '1440px',
        margin: '0 auto',
        alignItems: 'start'
      }}
      className="settings-layout-container"
    >
      {/* Left Column: Settings Configuration Panel */}
      <div
        className="spotify-card"
        style={{
          padding: '28px 26px',
          boxShadow: 'var(--shadow-heavy)'
        }}
      >
        {/* Step Header with Back Button and Quick Action */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            borderBottom: '1px solid var(--separator)',
            paddingBottom: '14px'
          }}
        >
          <button
            type="button"
            onClick={onBack}
            disabled={isProcessing}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-subdued)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              transition: 'color 0.15s ease'
            }}
            onMouseEnter={(e) => (e.target.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.target.style.color = 'var(--text-subdued)')}
          >
            <ArrowLeft size={16} weight="bold" />
            <span>Back to Ingest</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '12px',
                color: 'var(--text-subdued)',
                fontFamily: 'var(--font-mono)'
              }}
            >
              STEP 2: REPURPOSE SPECS
            </span>
            <button
              type="button"
              onClick={onStartGeneration}
              disabled={isProcessing}
              title="Generate directly with current settings"
              style={{
                background: 'rgba(30, 215, 96, 0.15)',
                border: '1px solid var(--spotify-green)',
                color: 'var(--spotify-green)',
                borderRadius: 'var(--radius-full)',
                padding: '4px 12px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease'
              }}
            >
              <Sparkle size={13} weight="fill" />
              <span>Generate ({numClips})</span>
            </button>
          </div>
        </div>

        {/* Ingest Source Summary Strip */}
        <div
          style={{
            background: '#161616',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--text-subdued)' }}>Source:</span>
            <span style={{ fontWeight: 700, color: '#ffffff' }}>
              {activeTab === 'history' && selectedHistoryVideo
                ? selectedHistoryVideo.title || selectedHistoryVideo.filename
                : activeTab === 'url'
                ? videoUrl
                  ? 'YouTube Video'
                  : 'Web Video'
                : uploadedFile?.name || 'Local File'}
            </span>
            {activeTab === 'history' && (
              <span
                style={{
                  background: 'rgba(30, 215, 96, 0.15)',
                  color: 'var(--spotify-green)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 700,
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                📁 Storage History • {selectedHistoryVideo?.duration_formatted || 'Ready'}
              </span>
            )}
            {activeTab === 'url' && videoQuality && (
              <span
                style={{
                  background: 'rgba(30, 215, 96, 0.15)',
                  color: 'var(--spotify-green)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 700,
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                yt-dlp: {videoQuality.toUpperCase()}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-subdued)' }}>Transcription:</span>
            {activeTab === 'history' ? (
              <span
                style={{
                  color: 'var(--spotify-green)',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Check size={14} weight="bold" />
                <span>Transcript Ready ({selectedHistoryVideo?.segments_count || 0} segments)</span>
              </span>
            ) : uploadedSrt ? (
              <span
                style={{
                  color: 'var(--spotify-green)',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Check size={14} weight="bold" />
                Custom .SRT
              </span>
            ) : colabUrl ? (
              <span
                style={{
                  color: 'var(--spotify-green)',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <CloudCheck size={14} weight="bold" />
                Kaggle GPU Connected
              </span>
            ) : (
              <span style={{ color: 'var(--text-warning)' }}>Standard Mode</span>
            )}
          </div>
        </div>

        {/* Primary Spec Switcher Tabs: 5 Clean Dedicated Sections */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: '6px',
            background: '#111111',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '24px',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveSubTab('frame')}
            style={{
              background: activeSubTab === 'frame' ? '#222222' : 'transparent',
              border: activeSubTab === 'frame' ? '1px solid var(--spotify-green)' : '1px solid transparent',
              color: activeSubTab === 'frame' ? '#ffffff' : 'var(--text-subdued)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 6px',
              fontWeight: 700,
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              minHeight: '54px',
              boxShadow: activeSubTab === 'frame' ? '0 0 12px rgba(30, 215, 96, 0.15)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Crop size={16} weight={activeSubTab === 'frame' ? 'bold' : 'regular'} color={activeSubTab === 'frame' ? 'var(--spotify-green)' : 'currentColor'} />
            <span>1. Frame & Canvas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('caption')}
            style={{
              background: activeSubTab === 'caption' ? '#222222' : 'transparent',
              border: activeSubTab === 'caption' ? '1px solid var(--spotify-green)' : '1px solid transparent',
              color: activeSubTab === 'caption' ? '#ffffff' : 'var(--text-subdued)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 6px',
              fontWeight: 700,
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              minHeight: '54px',
              boxShadow: activeSubTab === 'caption' ? '0 0 12px rgba(30, 215, 96, 0.15)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <TextT size={16} weight={activeSubTab === 'caption' ? 'bold' : 'regular'} color={activeSubTab === 'caption' ? 'var(--spotify-green)' : 'currentColor'} />
            <span>2. Subtitles</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('template')}
            style={{
              background: activeSubTab === 'template' ? '#222222' : 'transparent',
              border: activeSubTab === 'template' ? '1px solid var(--spotify-green)' : '1px solid transparent',
              color: activeSubTab === 'template' ? '#ffffff' : 'var(--text-subdued)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 6px',
              fontWeight: 700,
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              minHeight: '54px',
              boxShadow: activeSubTab === 'template' ? '0 0 12px rgba(30, 215, 96, 0.15)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Palette size={16} weight={activeSubTab === 'template' ? 'bold' : 'regular'} color={activeSubTab === 'template' ? 'var(--spotify-green)' : 'currentColor'} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span>3. Branding</span>
              {(templateHookEnabled || templateLogoEnabled || templateWatermarkEnabled || templateCardPadding || templateSocialCardEnabled) && (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'var(--spotify-green)',
                    boxShadow: '0 0 6px var(--spotify-green)',
                    display: 'inline-block'
                  }}
                  title="Branding active"
                />
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('music')}
            style={{
              background: activeSubTab === 'music' ? '#222222' : 'transparent',
              border: activeSubTab === 'music' ? '1px solid var(--spotify-green)' : '1px solid transparent',
              color: activeSubTab === 'music' ? '#ffffff' : 'var(--text-subdued)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 6px',
              fontWeight: 700,
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              minHeight: '54px',
              boxShadow: activeSubTab === 'music' ? '0 0 12px rgba(30, 215, 96, 0.15)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <MusicNote size={16} weight={activeSubTab === 'music' ? 'bold' : 'regular'} color={activeSubTab === 'music' ? 'var(--spotify-green)' : 'currentColor'} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span>4. Audio BGM</span>
              {uploadedMusic && (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'var(--spotify-green)',
                    boxShadow: '0 0 6px var(--spotify-green)',
                    display: 'inline-block'
                  }}
                  title="Music Track Attached"
                />
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('output')}
            style={{
              background: activeSubTab === 'output' ? 'rgba(30, 215, 96, 0.15)' : 'transparent',
              border: activeSubTab === 'output' ? '1px solid var(--spotify-green)' : '1px solid transparent',
              color: activeSubTab === 'output' ? 'var(--spotify-green)' : 'var(--text-subdued)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 6px',
              fontWeight: 700,
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              minHeight: '54px',
              boxShadow: activeSubTab === 'output' ? '0 0 12px rgba(30, 215, 96, 0.2)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Sparkle size={16} weight={activeSubTab === 'output' ? 'fill' : 'regular'} color={activeSubTab === 'output' ? 'var(--spotify-green)' : 'currentColor'} />
            <span>5. Clips & AI</span>
          </button>
        </div>

        {/* TAB 3: TEMPLATE & BRANDING AREA */}
        {activeSubTab === 'template' && (
          <div>
            <TemplatePanel
              templatePreset={templatePreset}
              setTemplatePreset={setTemplatePreset}
              templateBgColor={templateBgColor}
              setTemplateBgColor={setTemplateBgColor}
              templateCardPadding={templateCardPadding}
              setTemplateCardPadding={setTemplateCardPadding}
              templateCornerRadius={templateCornerRadius}
              setTemplateCornerRadius={setTemplateCornerRadius}
              templateHookEnabled={templateHookEnabled}
              setTemplateHookEnabled={setTemplateHookEnabled}
              templateHookMode={templateHookMode}
              setTemplateHookMode={setTemplateHookMode}
              templateHookText={templateHookText}
              setTemplateHookText={setTemplateHookText}
              templateHookColor={templateHookColor}
              setTemplateHookColor={setTemplateHookColor}
              templateHookBg={templateHookBg}
              setTemplateHookBg={setTemplateHookBg}
              templateHookBgColor={templateHookBgColor}
              setTemplateHookBgColor={setTemplateHookBgColor}
              templateHookRadius={templateHookRadius}
              setTemplateHookRadius={setTemplateHookRadius}
              templateHookBorder={templateHookBorder}
              setTemplateHookBorder={setTemplateHookBorder}
              templateHookBorderColor={templateHookBorderColor}
              setTemplateHookBorderColor={setTemplateHookBorderColor}
              templateHookX={templateHookX}
              setTemplateHookX={setTemplateHookX}
              templateHookY={templateHookY}
              setTemplateHookY={setTemplateHookY}
              templateHookSize={templateHookSize}
              setTemplateHookSize={setTemplateHookSize}
              templateLogoEnabled={templateLogoEnabled}
              setTemplateLogoEnabled={setTemplateLogoEnabled}
              uploadedLogo={uploadedLogo}
              setUploadedLogo={setUploadedLogo}
              logoPreviewUrl={logoPreviewUrl}
              setLogoPreviewUrl={setLogoPreviewUrl}
              templateLogoPosition={templateLogoPosition}
              setTemplateLogoPosition={setTemplateLogoPosition}
              templateLogoX={templateLogoX}
              setTemplateLogoX={setTemplateLogoX}
              templateLogoY={templateLogoY}
              setTemplateLogoY={setTemplateLogoY}
              templateLogoSize={templateLogoSize}
              setTemplateLogoSize={setTemplateLogoSize}
              templateLogoOpacity={templateLogoOpacity}
              setTemplateLogoOpacity={setTemplateLogoOpacity}
              templateWatermarkEnabled={templateWatermarkEnabled}
              setTemplateWatermarkEnabled={setTemplateWatermarkEnabled}
              templateWatermarkType={templateWatermarkType}
              setTemplateWatermarkType={setTemplateWatermarkType}
              templateWatermarkText={templateWatermarkText}
              setTemplateWatermarkText={setTemplateWatermarkText}
              templateWatermarkPosition={templateWatermarkPosition}
              setTemplateWatermarkPosition={setTemplateWatermarkPosition}
              templateWatermarkX={templateWatermarkX}
              setTemplateWatermarkX={setTemplateWatermarkX}
              templateWatermarkY={templateWatermarkY}
              setTemplateWatermarkY={setTemplateWatermarkY}
              templateWatermarkColor={templateWatermarkColor}
              setTemplateWatermarkColor={setTemplateWatermarkColor}
              templateWatermarkOpacity={templateWatermarkOpacity}
              setTemplateWatermarkOpacity={setTemplateWatermarkOpacity}
              templateSocialCardEnabled={templateSocialCardEnabled}
              setTemplateSocialCardEnabled={setTemplateSocialCardEnabled}
              templateChannelName={templateChannelName}
              setTemplateChannelName={setTemplateChannelName}
              templateChannelHandle={templateChannelHandle}
              setTemplateChannelHandle={setTemplateChannelHandle}
              templateLikeSubscribeEnabled={templateLikeSubscribeEnabled}
              setTemplateLikeSubscribeEnabled={setTemplateLikeSubscribeEnabled}
              templateSocialCardBg={templateSocialCardBg}
              setTemplateSocialCardBg={setTemplateSocialCardBg}
              templateSocialFooterEnabled={templateSocialFooterEnabled}
              setTemplateSocialFooterEnabled={setTemplateSocialFooterEnabled}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
              fitMode={fitMode}
              setFitMode={setFitMode}
              isProcessing={isProcessing}
            />

            {/* Step Navigation Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-subtle)'
              }}
            >
              <button
                type="button"
                onClick={() => setActiveSubTab('caption')}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-full)',
                  padding: '9px 16px',
                  color: 'var(--text-subdued)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ← Back: Subtitles
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('music')}
                className="btn-spotify-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                <span>Next: Audio BGM</span>
                <ArrowRight size={15} weight="bold" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: FRAME & CANVAS SETTINGS */}
        {activeSubTab === 'frame' && (
          <div>
            {/* Aspect Ratio Options */}
            <div style={{ marginBottom: '22px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: 'var(--text-subdued)',
                  marginBottom: '10px'
                }}
              >
                Aspect Ratio Format
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { id: '9:16', label: '9:16 Reel', sub: '1080x1920', icon: DeviceMobile },
                  {
                    id: '1:1',
                    label: '1:1 Square',
                    sub: fitMode === 'crop_fill' ? '1080x1080' : '1:1 in 9:16',
                    icon: Square
                  },
                  { id: '16:9', label: '16:9 Land', sub: '1920x1080', icon: Monitor }
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = aspectRatio === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setAspectRatio(item.id)}
                      style={{
                        background: isSelected ? '#252525' : '#141414',
                        border: isSelected ? '1px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 10px',
                        color: isSelected ? '#ffffff' : 'var(--text-subdued)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Icon
                        size={22}
                        weight={isSelected ? 'fill' : 'regular'}
                        color={isSelected ? 'var(--spotify-green)' : 'currentColor'}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>{item.label}</span>
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-subdued)' }}>
                        {item.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Framing & Background Mode (Blur, Black, White, Crop) */}
            <div style={{ marginBottom: '22px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: 'var(--text-subdued)',
                  marginBottom: '10px'
                }}
              >
                Framing & Background Style
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {[
                  {
                    id: 'blur_padding',
                    label: 'Ambient Blurred Mirror',
                    desc: 'Dynamic blurred mirror fills 9:16 vertical frame',
                    indicatorColor: '#7c3aed'
                  },
                  {
                    id: 'black_bars',
                    label: 'Solid Black Bars',
                    desc: 'Cinematic pitch-black background top & bottom',
                    indicatorColor: '#000000',
                    borderIndicator: '#3f3f46'
                  },
                  {
                    id: 'white_bars',
                    label: 'Solid White Bars',
                    desc: 'Modern minimal clean white canvas top & bottom',
                    indicatorColor: '#ffffff'
                  },
                  {
                    id: 'crop_fill',
                    label: 'Smart Face Crop (Fill)',
                    desc: 'Centers subjects dynamically to fill full frame',
                    indicatorColor: 'var(--spotify-green)'
                  }
                ].map((item) => {
                  const isSelected = fitMode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setFitMode(item.id)}
                      style={{
                        background: isSelected ? '#252525' : '#141414',
                        border: isSelected ? '1px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: isSelected ? '#ffffff' : 'var(--text-subdued)',
                        transition: 'all 0.15s ease',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '3px',
                              background: item.indicatorColor,
                              border: item.borderIndicator ? `1px solid ${item.borderIndicator}` : 'none'
                            }}
                          />
                          <span style={{ fontSize: '13px', fontWeight: 700 }}>{item.label}</span>
                        </div>
                        {isSelected && <Check size={14} weight="bold" color="var(--spotify-green)" />}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-subdued)', lineHeight: 1.4 }}>{item.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step Navigation Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-subtle)'
              }}
            >
              <button
                type="button"
                onClick={() => setActiveSubTab('caption')}
                className="btn-spotify-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                <span>Next: Subtitles</span>
                <ArrowRight size={15} weight="bold" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: CAPTIONS & POSITIONING */}
        {activeSubTab === 'caption' && (
          <div>
            {/* Caption Style Selector */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: 'var(--text-subdued)'
                  }}
                >
                  Subtitle Style Preset
                </label>
                <span style={{ fontSize: '11px', color: 'var(--spotify-green)', fontWeight: 700 }}>
                  Live in Mockup ➜
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                {SUBTITLE_PRESETS.map((preset) => {
                  const isSelected = subtitleStyle === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setSubtitleStyle(preset.id)}
                      style={{
                        background: isSelected ? '#222222' : '#141414',
                        border: isSelected ? '1.5px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 10px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: isSelected ? '#ffffff' : 'var(--text-subdued)',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '76px',
                        boxShadow: isSelected ? '0 0 12px rgba(30, 215, 96, 0.15)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              background: preset.highlightColor,
                              display: 'inline-block',
                              boxShadow: `0 0 6px ${preset.highlightColor}`
                            }}
                          />
                          <span style={{ fontSize: '11.5px', fontWeight: 800 }}>{preset.name}</span>
                        </div>
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            background: isSelected ? 'var(--spotify-green)' : '#27272a',
                            color: isSelected ? '#000000' : 'var(--text-subdued)',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {preset.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-subdued)', lineHeight: 1.3 }}>
                        {preset.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Caption Placement Preset (Top, Center, Bottom) */}
            <div style={{ marginBottom: '22px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: 'var(--text-subdued)',
                  marginBottom: '10px'
                }}
              >
                Vertical Position Anchor
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { id: 'top', label: 'Top (Header)', desc: 'Ideal for hooks & headlines' },
                  { id: 'center', label: 'Center (Middle)', desc: 'High visual engagement' },
                  { id: 'bottom', label: 'Bottom (Standard)', desc: 'Standard Reels & Shorts zone' }
                ].map((pos) => {
                  const isSelected = captionPosition === pos.id;
                  return (
                    <button
                      key={pos.id}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setCaptionPosition(pos.id)}
                      style={{
                        background: isSelected ? '#252525' : '#141414',
                        border: isSelected ? '1px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 8px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        color: isSelected ? '#ffffff' : 'var(--text-subdued)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '2px' }}>{pos.label}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-subdued)' }}>{pos.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fine-Tune Position Sliders (X & Y Nudges + Scale) */}
            <div
              style={{
                background: '#141414',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                marginBottom: '20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Fine-Tune Alignment & Font Size
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCaptionOffsetX(0);
                    setCaptionOffsetY(0);
                    setCaptionScale(1.0);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-subdued)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Reset alignment coordinates to default"
                >
                  <ArrowCounterClockwise size={12} />
                  <span>Reset</span>
                </button>
              </div>

              {/* Y-Axis Offset */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-subdued)' }}>
                    <ArrowsVertical size={14} color="var(--spotify-green)" />
                    <span>Vertical Nudge (Y-Axis)</span>
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffffff' }}>
                    {captionOffsetY >= 0 ? `+${captionOffsetY}` : captionOffsetY} px
                  </span>
                </div>
                <input
                  type="range"
                  min="-150"
                  max="150"
                  step="5"
                  value={captionOffsetY}
                  disabled={isProcessing}
                  onChange={(e) => setCaptionOffsetY(parseInt(e.target.value, 10))}
                  style={{ width: '100%' }}
                />
              </div>

              {/* X-Axis Offset */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-subdued)' }}>
                    <ArrowsHorizontal size={14} color="var(--spotify-green)" />
                    <span>Horizontal Nudge (X-Axis)</span>
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffffff' }}>
                    {captionOffsetX >= 0 ? `+${captionOffsetX}` : captionOffsetX} px
                  </span>
                </div>
                <input
                  type="range"
                  min="-120"
                  max="120"
                  step="5"
                  value={captionOffsetX}
                  disabled={isProcessing}
                  onChange={(e) => setCaptionOffsetX(parseInt(e.target.value, 10))}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Font Size Multiplier */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-subdued)' }}>Caption Font Scale</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--spotify-green)' }}>
                    {captionScale}x
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {[
                    { label: 'Compact', val: 0.85 },
                    { label: 'Normal', val: 1.0 },
                    { label: 'Large', val: 1.2 },
                    { label: 'Giant', val: 1.4 }
                  ].map((s) => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => setCaptionScale(s.val)}
                      style={{
                        background: captionScale === s.val ? '#27272a' : '#0d0d0d',
                        border: captionScale === s.val ? '1px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
                        color: captionScale === s.val ? 'var(--spotify-green)' : 'var(--text-subdued)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '6px 4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {s.label} ({s.val}x)
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Step Navigation Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-subtle)'
              }}
            >
              <button
                type="button"
                onClick={() => setActiveSubTab('frame')}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-full)',
                  padding: '9px 16px',
                  color: 'var(--text-subdued)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ← Back: Frame & Canvas
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('template')}
                className="btn-spotify-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                <span>Next: Branding & Template</span>
                <ArrowRight size={15} weight="bold" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: BACKGROUND MUSIC (BGM) */}
        {activeSubTab === 'music' && (
          <div>
            {/* Hidden HTML5 Audio Element for Preview */}
            {audioBlobUrl && (
              <audio
                ref={audioRef}
                src={audioBlobUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleAudioEnded}
                preload="metadata"
                style={{ display: 'none' }}
              />
            )}

            {/* Hidden File Input for Audio */}
            <input
              type="file"
              ref={musicFileInputRef}
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setUploadedMusic && setUploadedMusic(file);
                  setMusicStartTime && setMusicStartTime(0);
                  setIsPlaying(false);
                }
              }}
            />

            {!uploadedMusic ? (
              /* No Music Track Yet: Beautiful Upload Dropzone */
              <div style={{ marginBottom: '22px' }}>
                <div
                  onClick={() => musicFileInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '36px 20px',
                    textAlign: 'center',
                    background: '#141414',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--spotify-green)';
                    e.currentTarget.style.background = '#1a1a1a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.background = '#141414';
                  }}
                >
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      background: 'rgba(30, 215, 96, 0.1)',
                      border: '1px solid rgba(30, 215, 96, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 14px'
                    }}
                  >
                    <UploadSimple size={26} color="var(--spotify-green)" weight="bold" />
                  </div>
                  <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
                    Upload Background Music Track
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-subdued)', maxWidth: '420px', margin: '0 auto 14px', lineHeight: 1.5 }}>
                    Upload custom or royalty-free audio (.mp3, .wav, .m4a). It will be seamlessly mixed behind your video speech.
                  </p>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      style={{
                        background: 'var(--spotify-green)',
                        color: '#000000',
                        border: 'none',
                        borderRadius: 'var(--radius-full)',
                        padding: '9px 20px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <MusicNote size={15} weight="bold" />
                      <span>Select Audio File</span>
                    </button>
                    <span style={{ fontSize: '11px', color: 'var(--text-subdued)', fontFamily: 'var(--font-mono)' }}>
                      MP3, WAV, M4A, AAC
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    background: '#111111',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 14px',
                    marginTop: '14px',
                    fontSize: '12px',
                    color: 'var(--text-subdued)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <Sparkle size={18} color="var(--spotify-green)" weight="fill" style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: '#ffffff' }}>Optional: </strong>
                    If no background music is attached, your original video speech is preserved 100% cleanly without any modification.
                  </div>
                </div>
              </div>
            ) : (
              /* Music Track Attached: Player, Start Time Selector & Mixer */
              <div>
                {/* Track Card with Info & Remove */}
                <div
                  style={{
                    background: '#161616',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    marginBottom: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(30, 215, 96, 0.15)',
                        border: '1px solid rgba(30, 215, 96, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <MusicNote size={20} color="var(--spotify-green)" weight="fill" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#ffffff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={uploadedMusic.name}
                      >
                        {uploadedMusic.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-subdued)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                        {formatFileSize(uploadedMusic.size)} {audioDuration > 0 && `• ${formatSecs(audioDuration)}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => musicFileInputRef.current?.click()}
                      style={{
                        background: '#242424',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-full)',
                        padding: '6px 12px',
                        color: 'var(--text-subdued)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#ffffff';
                        e.currentTarget.style.borderColor = 'var(--border-gray)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-subdued)';
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      }}
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveMusic}
                      title="Remove music track"
                      style={{
                        background: 'rgba(243, 114, 127, 0.12)',
                        border: '1px solid rgba(243, 114, 127, 0.25)',
                        borderRadius: 'var(--radius-full)',
                        padding: '6px 10px',
                        color: 'var(--text-negative)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Trash size={14} weight="bold" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>

                {/* Spotify-Style Mini Audio Playback Player */}
                <div
                  style={{
                    background: '#131313',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    marginBottom: '20px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-subdued)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                        Audio Playback Preview
                      </span>
                      {isPlaying && (
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '12px' }}>
                          {[6, 12, 8, 14, 10, 7].map((h, i) => (
                            <div
                              key={i}
                              style={{
                                width: '2px',
                                height: `${Math.max(3, (playbackTime * 4 + i * 3) % 12 + 2)}px`,
                                background: 'var(--spotify-green)',
                                borderRadius: '1px'
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleSetCurrentAsOffset}
                      title="Set current playhead position as start time"
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-full)',
                        padding: '3px 10px',
                        fontSize: '11px',
                        color: 'var(--spotify-green)',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Use Position as Start ({formatSecs(playbackTime)})
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {/* Play/Pause Button */}
                    <button
                      type="button"
                      onClick={togglePlayAudio}
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: 'var(--spotify-green)',
                        border: 'none',
                        color: '#000000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: isPlaying ? '0 0 16px rgba(30, 215, 96, 0.5)' : 'none',
                        transition: 'transform 0.15s ease, background 0.15s ease',
                        flexShrink: 0
                      }}
                    >
                      {isPlaying ? <Pause size={20} weight="fill" /> : <Play size={20} weight="fill" style={{ marginLeft: '2px' }} />}
                    </button>

                    {/* Scrub Bar & Timestamps */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-subdued)', marginBottom: '4px' }}>
                        <span style={{ color: isPlaying ? 'var(--spotify-green)' : 'inherit', fontWeight: 700 }}>
                          {formatSecs(playbackTime)}
                        </span>
                        <span>{formatSecs(audioDuration)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={audioDuration > 0 ? audioDuration : 100}
                        step="0.5"
                        value={playbackTime}
                        onChange={(e) => handleSeek(parseFloat(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--spotify-green)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Start Offset / Timeline Start Point Selector */}
                <div
                  style={{
                    background: '#141414',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    marginBottom: '20px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                        Music Start Offset
                      </span>
                      <p style={{ fontSize: '11px', color: 'var(--text-subdued)', margin: '2px 0 0 0' }}>
                        Where in the music track to begin playing during the short
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--spotify-green)' }}>
                        {formatSecs(musicStartTime)}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-subdued)', marginLeft: '4px' }}>
                        ({musicStartTime}s)
                      </span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max={audioDuration > 0 ? Math.floor(audioDuration) : 180}
                    step="1"
                    value={musicStartTime}
                    onChange={(e) => setMusicStartTime && setMusicStartTime(parseFloat(e.target.value))}
                    style={{ width: '100%', marginBottom: '12px' }}
                  />

                  {/* Quick Jump Buttons */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      { label: '0s (Intro)', sec: 0 },
                      { label: '15s', sec: 15 },
                      { label: '30s (Drop)', sec: 30 },
                      { label: '45s', sec: 45 },
                      { label: '60s', sec: 60 }
                    ].map((item) => {
                      const isSelected = Math.abs(musicStartTime - item.sec) < 0.5;
                      return (
                        <button
                          key={item.sec}
                          type="button"
                          onClick={() => handleJumpToOffset(item.sec)}
                          style={{
                            background: isSelected ? '#27272a' : '#0d0d0d',
                            border: isSelected ? '1px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
                            color: isSelected ? 'var(--spotify-green)' : 'var(--text-subdued)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '5px 10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Voice vs Music Volume Mixer Controls */}
                <div
                  style={{
                    background: '#141414',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    marginBottom: '20px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sliders size={16} color="var(--spotify-green)" />
                      <span>Audio Volume Balance & Mixing</span>
                    </span>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--spotify-green)', fontWeight: 700 }}>
                      {Math.round(originalVolume * 100)}% Voice / {Math.round(musicVolume * 100)}% Music
                    </span>
                  </div>

                  {/* Quick Mixer Presets */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '16px' }}>
                    {[
                      { label: 'Balanced (Podcast/Reels)', orig: 1.0, bgm: 0.20 },
                      { label: 'Subtle Background', orig: 1.0, bgm: 0.12 },
                      { label: 'Punchy Beat (Viral)', orig: 0.85, bgm: 0.32 }
                    ].map((p, idx) => {
                      const isSel = Math.abs(musicVolume - p.bgm) < 0.02 && Math.abs(originalVolume - p.orig) < 0.05;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setOriginalVolume && setOriginalVolume(p.orig);
                            setMusicVolume && setMusicVolume(p.bgm);
                          }}
                          style={{
                            background: isSel ? '#252525' : '#0e0e0e',
                            border: isSel ? '1px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
                            color: isSel ? '#ffffff' : 'var(--text-subdued)',
                            padding: '8px 6px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textAlign: 'center'
                          }}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Original Video Speech Volume Slider */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-subdued)' }}>
                        <SpeakerHigh size={15} color="var(--spotify-green)" />
                        <span>Original Video Speech Volume</span>
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffffff' }}>
                        {Math.round(originalVolume * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1.5"
                      step="0.05"
                      value={originalVolume}
                      onChange={(e) => setOriginalVolume && setOriginalVolume(parseFloat(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Background Music Volume Slider */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-subdued)' }}>
                        <MusicNote size={15} color="var(--spotify-green)" />
                        <span>Background Music Volume</span>
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--spotify-green)' }}>
                        {Math.round(musicVolume * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1.0"
                      step="0.02"
                      value={musicVolume}
                      onChange={(e) => setMusicVolume && setMusicVolume(parseFloat(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Ultra-Fast Mixing Guarantee Strip */}
                <div
                  style={{
                    background: '#111111',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    fontSize: '11px',
                    color: 'var(--text-subdued)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Sparkle size={15} color="var(--spotify-green)" weight="fill" />
                  <span>
                    <strong style={{ color: '#ffffff' }}>Lightning-Fast Mixing: </strong>
                    Audio is ducked and combined in a single FFmpeg pass. Zero added rendering delay!
                  </span>
                </div>
              </div>
            )}

            {/* Step Navigation Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-subtle)'
              }}
            >
              <button
                type="button"
                onClick={() => setActiveSubTab('template')}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-full)',
                  padding: '9px 16px',
                  color: 'var(--text-subdued)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ← Back: Branding & Template
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('output')}
                className="btn-spotify-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                <span>Next: Clips & AI Output</span>
                <ArrowRight size={15} weight="bold" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: CLIPS & AI OUTPUT GENERATION */}
        {activeSubTab === 'output' && (
          <div>
            {/* Quick Repurpose Overview Summary Strip */}
            <div
              style={{
                background: '#141414',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: '22px'
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-subdued)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
                Pipeline Configuration Summary
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                <div style={{ background: '#1c1c1c', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-subdued)', textTransform: 'uppercase' }}>Canvas Frame</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>{aspectRatio}</div>
                  <div style={{ fontSize: '10px', color: 'var(--spotify-green)', marginTop: '2px' }}>
                    {fitMode === 'crop_fill' ? 'Smart Crop' : fitMode === 'blur_padding' ? 'Blurred Mirror' : fitMode === 'white_bars' ? 'White Canvas' : 'Black Bars'}
                  </div>
                </div>

                <div style={{ background: '#1c1c1c', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-subdued)', textTransform: 'uppercase' }}>Subtitles</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                    {SUBTITLE_PRESETS.find(p => p.id === subtitleStyle)?.name || subtitleStyle}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-subdued)', marginTop: '2px' }}>
                    {captionPosition.toUpperCase()} • {captionScale}x
                  </div>
                </div>

                <div style={{ background: '#1c1c1c', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-subdued)', textTransform: 'uppercase' }}>Template Style</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                    {templateSocialCardEnabled ? 'Social Card' : templateCardPadding ? 'Bordered Canvas' : 'Clean Video'}
                  </div>
                  <div style={{ fontSize: '10px', color: (templateHookText?.trim() || templateWatermarkEnabled) ? 'var(--spotify-green)' : 'var(--text-subdued)', marginTop: '2px' }}>
                    {templateHookText?.trim() ? 'Hook Active' : 'Clean / Default'}
                  </div>
                </div>

                <div style={{ background: '#1c1c1c', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-subdued)', textTransform: 'uppercase' }}>Audio BGM</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: uploadedMusic ? 'var(--spotify-green)' : '#ffffff', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {uploadedMusic ? uploadedMusic.name : 'Speech Only'}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-subdued)', marginTop: '2px' }}>
                    {uploadedMusic ? `Vol ${Math.round(musicVolume * 100)}%` : 'Pure Original'}
                  </div>
                </div>
              </div>
            </div>

            {/* Number of Viral Clips Slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: 'var(--text-subdued)'
                  }}
                >
                  Clips to Extract
                </label>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--spotify-green)', fontFamily: 'var(--font-mono)' }}>
                  {numClips} {numClips === 1 ? 'Short' : 'Shorts'} (25s to 60s)
                </span>
              </div>

              <input
                type="range"
                min="1"
                max="20"
                value={numClips}
                disabled={isProcessing}
                onChange={(e) => setNumClips(parseInt(e.target.value, 10))}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-subdued)', marginTop: '4px' }}>
                <span>1 Short</span>
                <span>5</span>
                <span>10</span>
                <span>15</span>
                <span>20 Shorts</span>
              </div>
            </div>

            {/* Viral Hook Intelligence Selection Strategy */}
            <div style={{ marginBottom: '28px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: 'var(--text-subdued)',
                  marginBottom: '10px'
                }}
              >
                Viral Hook Selection Strategy
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setSelectionMode && setSelectionMode('ai_prompt')}
                  style={{
                    background: selectionMode === 'ai_prompt' ? '#252525' : '#141414',
                    border: selectionMode === 'ai_prompt' ? '1px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkle size={15} weight="fill" color="var(--spotify-green)" />
                      <span>AI Prompt & Review</span>
                    </span>
                    <span
                      style={{
                        background: 'rgba(30, 215, 96, 0.15)',
                        color: 'var(--spotify-green)',
                        fontSize: '9px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-full)'
                      }}
                    >
                      RECOMMENDED
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-subdued)', margin: 0, lineHeight: 1.4 }}>
                    Copy prompt to ChatGPT/Gemini, review viral hooks, headlines & hashtags before rendering.
                  </p>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setSelectionMode && setSelectionMode('auto')}
                  style={{
                    background: selectionMode === 'auto' ? '#252525' : '#141414',
                    border: selectionMode === 'auto' ? '1px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                      ⚡ Auto Heuristic
                    </span>
                    <span
                      style={{
                        background: '#282828',
                        color: 'var(--text-subdued)',
                        fontSize: '9px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-full)'
                      }}
                    >
                      INSTANT
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-subdued)', margin: 0, lineHeight: 1.4 }}>
                    Fully automated keyword & speech pacing scoring. Renders immediately without review.
                  </p>
                </button>
              </div>
            </div>

            {/* Primary Action Button: Generate Viral Shorts */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <button
                type="button"
                className="btn-spotify-primary"
                onClick={onStartGeneration}
                disabled={isProcessing}
                style={{ width: '100%', padding: '14px 24px', fontSize: '15px' }}
              >
                <Sparkle size={20} weight="fill" />
                <span>{isProcessing ? 'Queuing Pipeline...' : `Generate ${numClips} Viral Shorts`}</span>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setActiveSubTab('music')}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-full)',
                  padding: '9px 16px',
                  color: 'var(--text-subdued)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ← Back: Audio BGM
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Interactive Phone Mockup Live Preview */}
      <div style={{ position: 'sticky', top: '24px', display: 'flex', justifyContent: 'center' }}>
        <PhonePreview
          aspectRatio={aspectRatio}
          fitMode={fitMode}
          subtitleStyle={subtitleStyle}
          captionPosition={captionPosition}
          captionOffsetX={captionOffsetX}
          captionOffsetY={captionOffsetY}
          captionScale={captionScale}
          musicName={uploadedMusic?.name}
          templatePreset={templatePreset}
          templateBgColor={templateBgColor}
          templateCardPadding={templateCardPadding}
          templateCornerRadius={templateCornerRadius}
          templateHookEnabled={templateHookEnabled}
          templateHookMode={templateHookMode}
          templateHookText={templateHookText}
          templateHookColor={templateHookColor}
          templateHookBg={templateHookBg}
          templateHookBgColor={templateHookBgColor}
          templateHookRadius={templateHookRadius}
          templateHookBorder={templateHookBorder}
          templateHookBorderColor={templateHookBorderColor}
          templateHookX={templateHookX}
          setTemplateHookX={setTemplateHookX}
          templateHookY={templateHookY}
          setTemplateHookY={setTemplateHookY}
          templateHookSize={templateHookSize}
          templateLogoEnabled={templateLogoEnabled}
          uploadedLogo={uploadedLogo}
          logoPreviewUrl={logoPreviewUrl}
          templateLogoPosition={templateLogoPosition}
          templateLogoX={templateLogoX}
          setTemplateLogoX={setTemplateLogoX}
          templateLogoY={templateLogoY}
          setTemplateLogoY={setTemplateLogoY}
          templateLogoSize={templateLogoSize}
          templateLogoOpacity={templateLogoOpacity}
          templateWatermarkEnabled={templateWatermarkEnabled}
          templateWatermarkType={templateWatermarkType}
          templateWatermarkText={templateWatermarkText}
          templateWatermarkPosition={templateWatermarkPosition}
          templateWatermarkX={templateWatermarkX}
          setTemplateWatermarkX={setTemplateWatermarkX}
          templateWatermarkY={templateWatermarkY}
          setTemplateWatermarkY={setTemplateWatermarkY}
          setCaptionOffsetX={setCaptionOffsetX}
          setCaptionOffsetY={setCaptionOffsetY}
          templateWatermarkColor={templateWatermarkColor}
          templateWatermarkOpacity={templateWatermarkOpacity}
          templateSocialCardEnabled={templateSocialCardEnabled}
          templateChannelName={templateChannelName}
          templateChannelHandle={templateChannelHandle}
          templateLikeSubscribeEnabled={templateLikeSubscribeEnabled}
          templateSocialCardBg={templateSocialCardBg}
          templateSocialFooterEnabled={templateSocialFooterEnabled}
        />
      </div>
    </div>
  );
}
