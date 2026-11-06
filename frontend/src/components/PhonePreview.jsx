import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  ChatCircle,
  BookmarkSimple,
  ShareFat,
  MusicNote,
  Eye,
  EyeSlash,
  Sparkle,
  CheckCircle,
  ArrowsOutCardinal
} from '@phosphor-icons/react';

const SUBTITLE_PRESETS = {
  single_word_pop: {
    id: 'single_word_pop',
    name: '1-Word Pop',
    words: ['THIS', 'WILL', 'BLOW', 'YOUR', 'MIND'],
    highlightColor: '#facc15',
    baseColor: '#ffffff',
    fontStyle: 'uppercase',
    fontFamily: '"Montserrat", "Arial Black", sans-serif',
    isSingleWord: true,
    intervalMs: 400
  },
  hormozi: {
    id: 'hormozi',
    name: 'Alex Hormozi',
    words: ['THIS', 'IS', 'HOW', 'YOU', 'WIN'],
    highlightColor: '#facc15',
    baseColor: '#ffffff',
    fontStyle: 'uppercase',
    fontFamily: '"Montserrat", "Arial Black", sans-serif',
    isSingleWord: false,
    intervalMs: 520
  },
  mrbeast: {
    id: 'mrbeast',
    name: 'MrBeast Pop',
    words: ['INSANE', 'ONE', 'MILLION', 'REWARD'],
    highlightColor: '#1ed760',
    baseColor: '#ffffff',
    fontStyle: 'uppercase',
    fontFamily: '"Impact", "Arial Black", sans-serif',
    isSingleWord: false,
    intervalMs: 480
  },
  ali_abdaal: {
    id: 'ali_abdaal',
    name: 'Ali Abdaal',
    words: ['The', 'real', 'secret', 'to', 'deep', 'work'],
    highlightColor: '#fef08a',
    baseColor: '#f8fafc',
    fontStyle: 'none',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    isSingleWord: false,
    intervalMs: 500
  },
  iman_gadzhi: {
    id: 'iman_gadzhi',
    name: 'Iman Gadzhi',
    words: ['MASTER', 'THE', 'ART', 'OF', 'FOCUS'],
    highlightColor: '#fbbf24',
    baseColor: '#ffffff',
    fontStyle: 'uppercase',
    fontFamily: '"Cinzel", "Georgia", "Times New Roman", serif',
    isSingleWord: false,
    intervalMs: 540
  },
  tiktok_bounce: {
    id: 'tiktok_bounce',
    name: 'TikTok Viral',
    words: ['WAIT', 'FOR', 'THE', 'ENDING', 'NOW'],
    highlightColor: '#00f2fe',
    baseColor: '#ffffff',
    fontStyle: 'uppercase',
    fontFamily: '"Montserrat", "Arial Black", sans-serif',
    isSingleWord: false,
    intervalMs: 440
  },
  podcast_box: {
    id: 'podcast_box',
    name: 'Podcast Box',
    words: ['THAT', 'CHANGED', 'MY', 'PERSPECTIVE'],
    highlightColor: '#facc15',
    baseColor: '#ffffff',
    fontStyle: 'uppercase',
    fontFamily: '"Arial Black", "Montserrat", sans-serif',
    isSingleWord: false,
    intervalMs: 500,
    hasBox: true
  },
  comic_punch: {
    id: 'comic_punch',
    name: 'Comic Punch',
    words: ['BOOM', 'LOOK', 'AT', 'THAT'],
    highlightColor: '#fb923c',
    baseColor: '#ffffff',
    fontStyle: 'uppercase',
    fontFamily: '"Impact", "Arial Black", sans-serif',
    isSingleWord: false,
    intervalMs: 450
  },
  velocity: {
    id: 'velocity',
    name: 'Velocity Cyan',
    words: ['FAST', 'FORWARD', 'TO', 'SUCCESS'],
    highlightColor: '#38bdf8',
    baseColor: '#ffffff',
    fontStyle: 'uppercase',
    fontFamily: '"Montserrat", "Arial Black", sans-serif',
    isSingleWord: false,
    intervalMs: 420
  },
  minimal: {
    id: 'minimal',
    name: 'Clean Minimal',
    words: ['The', 'essential', 'secret', 'of', 'focus'],
    highlightColor: '#ffffff',
    baseColor: '#888888',
    fontStyle: 'none',
    fontFamily: 'system-ui, sans-serif',
    isSingleWord: false,
    intervalMs: 550
  }
};

export default function PhonePreview({
  aspectRatio = '9:16',
  fitMode = 'blur_padding',
  subtitleStyle = 'single_word_pop',
  captionPosition = 'bottom',
  captionOffsetX = 0,
  setCaptionOffsetX,
  captionOffsetY = 0,
  setCaptionOffsetY,
  captionScale = 1.0,
  musicName = null,
  // Template & Branding Props
  templatePreset = 'none',
  templateBgColor = '',
  templateCardPadding = false,
  templateCornerRadius = 14,
  templateHookEnabled = false,
  templateHookMode = 'ai_hook',
  templateHookText = '',
  templateHookColor = '#000000',
  templateHookBg = 'transparent',
  templateHookBgColor = '#facc15',
  templateHookRadius = 14,
  templateHookBorder = false,
  templateHookBorderColor = '#000000',
  templateHookX = 50,
  setTemplateHookX,
  templateHookY = 48,
  setTemplateHookY,
  templateHookSize = 15,
  templateLogoEnabled = false,
  uploadedLogo = null,
  logoPreviewUrl = null,
  templateLogoPosition = 'top_left',
  templateLogoX = 8,
  setTemplateLogoX,
  templateLogoY = 7,
  setTemplateLogoY,
  templateLogoSize = 36,
  templateLogoOpacity = 1.0,
  templateWatermarkEnabled = false,
  templateWatermarkType = 'text',
  templateWatermarkText = '@yourchannel',
  templateWatermarkPosition = 'bottom_center',
  templateWatermarkX = 50,
  setTemplateWatermarkX,
  templateWatermarkY = 88,
  setTemplateWatermarkY,
  templateWatermarkColor = '#a1a1aa',
  templateWatermarkOpacity = 0.85,
  // Social Card Props (Clean defaults)
  templateSocialCardEnabled = false,
  templateChannelName = '',
  templateChannelHandle = '',
  templateLikeSubscribeEnabled = false,
  templateSocialCardBg = '#0c0f14',
  templateSocialFooterEnabled = false
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [showSafeZone, setShowSafeZone] = useState(true);
  const [previewSize, setPreviewSize] = useState('large'); // 'large' (334px Studio) or 'compact' (276px)
  const [popKey, setPopKey] = useState(0);

  const headlineDisplayText = templateHookMode === 'custom'
    ? (templateHookText?.trim() || 'CUSTOM HEADLINE')
    : (templateHookText?.trim() || 'WAIT TILL THE END 😱');

  // Freeform Dragging State for Logo
  const phoneScreenRef = useRef(null);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [isHoveringLogo, setIsHoveringLogo] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initialLogoX: 0, initialLogoY: 0 });

  const preset = SUBTITLE_PRESETS[subtitleStyle] || SUBTITLE_PRESETS.single_word_pop;

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIdx((prev) => {
        const next = (prev + 1) % preset.words.length;
        setPopKey((k) => k + 1);
        return next;
      });
    }, preset.intervalMs);
    return () => clearInterval(interval);
  }, [preset]);

  // Dragging event listeners for freeform logo placement
  const handleLogoMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLogo(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialLogoX: templateLogoX,
      initialLogoY: templateLogoY
    };
  };

  const handleLogoTouchStart = (e) => {
    const touch = e.touches[0];
    if (!touch) return;
    setIsDraggingLogo(true);
    dragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initialLogoX: templateLogoX,
      initialLogoY: templateLogoY
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingLogo || !phoneScreenRef.current) return;
      const rect = phoneScreenRef.current.getBoundingClientRect();
      const deltaXPct = ((e.clientX - dragStartRef.current.startX) / rect.width) * 100;
      const deltaYPct = ((e.clientY - dragStartRef.current.startY) / rect.height) * 100;
      const newX = Math.max(3, Math.min(84, dragStartRef.current.initialLogoX + deltaXPct));
      const newY = Math.max(3, Math.min(90, dragStartRef.current.initialLogoY + deltaYPct));
      if (setTemplateLogoX) setTemplateLogoX(Math.round(newX));
      if (setTemplateLogoY) setTemplateLogoY(Math.round(newY));
    };

    const handleTouchMove = (e) => {
      if (!isDraggingLogo || !phoneScreenRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;
      const rect = phoneScreenRef.current.getBoundingClientRect();
      const deltaXPct = ((touch.clientX - dragStartRef.current.startX) / rect.width) * 100;
      const deltaYPct = ((touch.clientY - dragStartRef.current.startY) / rect.height) * 100;
      const newX = Math.max(3, Math.min(84, dragStartRef.current.initialLogoX + deltaXPct));
      const newY = Math.max(3, Math.min(90, dragStartRef.current.initialLogoY + deltaYPct));
      if (setTemplateLogoX) setTemplateLogoX(Math.round(newX));
      if (setTemplateLogoY) setTemplateLogoY(Math.round(newY));
    };

    const handleMouseUp = () => {
      setIsDraggingLogo(false);
    };

    if (isDraggingLogo) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDraggingLogo, setTemplateLogoX, setTemplateLogoY]);

  // Freeform Dragging State for Watermark
  const [isDraggingWatermark, setIsDraggingWatermark] = useState(false);
  const [isHoveringWatermark, setIsHoveringWatermark] = useState(false);
  const watermarkDragStartRef = useRef({ startX: 0, startY: 0, initialX: 50, initialY: 88 });

  const handleWatermarkMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingWatermark(true);
    watermarkDragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: templateWatermarkX ?? 50,
      initialY: templateWatermarkY ?? 88
    };
  };

  const handleWatermarkTouchStart = (e) => {
    const touch = e.touches[0];
    if (!touch) return;
    setIsDraggingWatermark(true);
    watermarkDragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initialX: templateWatermarkX ?? 50,
      initialY: templateWatermarkY ?? 88
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingWatermark || !phoneScreenRef.current) return;
      const rect = phoneScreenRef.current.getBoundingClientRect();
      const deltaXPct = ((e.clientX - watermarkDragStartRef.current.startX) / rect.width) * 100;
      const deltaYPct = ((e.clientY - watermarkDragStartRef.current.startY) / rect.height) * 100;
      const newX = Math.max(5, Math.min(95, watermarkDragStartRef.current.initialX + deltaXPct));
      const newY = Math.max(5, Math.min(95, watermarkDragStartRef.current.initialY + deltaYPct));
      if (setTemplateWatermarkX) setTemplateWatermarkX(Math.round(newX));
      if (setTemplateWatermarkY) setTemplateWatermarkY(Math.round(newY));
    };

    const handleTouchMove = (e) => {
      if (!isDraggingWatermark || !phoneScreenRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;
      const rect = phoneScreenRef.current.getBoundingClientRect();
      const deltaXPct = ((touch.clientX - watermarkDragStartRef.current.startX) / rect.width) * 100;
      const deltaYPct = ((touch.clientY - watermarkDragStartRef.current.startY) / rect.height) * 100;
      const newX = Math.max(5, Math.min(95, watermarkDragStartRef.current.initialX + deltaXPct));
      const newY = Math.max(5, Math.min(95, watermarkDragStartRef.current.initialY + deltaYPct));
      if (setTemplateWatermarkX) setTemplateWatermarkX(Math.round(newX));
      if (setTemplateWatermarkY) setTemplateWatermarkY(Math.round(newY));
    };

    const handleMouseUp = () => {
      setIsDraggingWatermark(false);
    };

    if (isDraggingWatermark) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDraggingWatermark, setTemplateWatermarkX, setTemplateWatermarkY]);

  // Freeform Dragging State for Hook Text
  const [isDraggingHook, setIsDraggingHook] = useState(false);
  const [isHoveringHook, setIsHoveringHook] = useState(false);
  const hookDragStartRef = useRef({ startX: 0, startY: 0, initialX: 50, initialY: 12 });

  const handleHookMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingHook(true);
    hookDragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: templateHookX ?? 50,
      initialY: templateHookY ?? 12
    };
  };

  const handleHookTouchStart = (e) => {
    const touch = e.touches[0];
    if (!touch) return;
    setIsDraggingHook(true);
    hookDragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initialX: templateHookX ?? 50,
      initialY: templateHookY ?? 12
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingHook || !phoneScreenRef.current) return;
      const rect = phoneScreenRef.current.getBoundingClientRect();
      const deltaXPct = ((e.clientX - hookDragStartRef.current.startX) / rect.width) * 100;
      const deltaYPct = ((e.clientY - hookDragStartRef.current.startY) / rect.height) * 100;
      const newX = Math.max(5, Math.min(95, hookDragStartRef.current.initialX + deltaXPct));
      const newY = Math.max(3, Math.min(95, hookDragStartRef.current.initialY + deltaYPct));
      if (setTemplateHookX) setTemplateHookX(Math.round(newX));
      if (setTemplateHookY) setTemplateHookY(Math.round(newY));
    };

    const handleTouchMove = (e) => {
      if (!isDraggingHook || !phoneScreenRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;
      const rect = phoneScreenRef.current.getBoundingClientRect();
      const deltaXPct = ((touch.clientX - hookDragStartRef.current.startX) / rect.width) * 100;
      const deltaYPct = ((touch.clientY - hookDragStartRef.current.startY) / rect.height) * 100;
      const newX = Math.max(5, Math.min(95, hookDragStartRef.current.initialX + deltaXPct));
      const newY = Math.max(3, Math.min(95, hookDragStartRef.current.initialY + deltaYPct));
      if (setTemplateHookX) setTemplateHookX(Math.round(newX));
      if (setTemplateHookY) setTemplateHookY(Math.round(newY));
    };

    const handleMouseUp = () => {
      setIsDraggingHook(false);
    };

    if (isDraggingHook) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDraggingHook, setTemplateHookX, setTemplateHookY]);

  // Freeform Dragging State for Subtitles / Captions
  const [isDraggingSubtitle, setIsDraggingSubtitle] = useState(false);
  const [isHoveringSubtitle, setIsHoveringSubtitle] = useState(false);
  const subtitleDragStartRef = useRef({ startX: 0, startY: 0, initialOffsetX: 0, initialOffsetY: 0 });

  const handleSubtitleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSubtitle(true);
    subtitleDragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialOffsetX: captionOffsetX || 0,
      initialOffsetY: captionOffsetY || 0
    };
  };

  const handleSubtitleTouchStart = (e) => {
    const touch = e.touches[0];
    if (!touch) return;
    setIsDraggingSubtitle(true);
    subtitleDragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initialOffsetX: captionOffsetX || 0,
      initialOffsetY: captionOffsetY || 0
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingSubtitle) return;
      const deltaX = e.clientX - subtitleDragStartRef.current.startX;
      const deltaY = e.clientY - subtitleDragStartRef.current.startY;
      const newOffsetX = Math.max(-150, Math.min(150, subtitleDragStartRef.current.initialOffsetX + deltaX));
      const newOffsetY = Math.max(-200, Math.min(200, subtitleDragStartRef.current.initialOffsetY + deltaY));
      if (setCaptionOffsetX) setCaptionOffsetX(Math.round(newOffsetX));
      if (setCaptionOffsetY) setCaptionOffsetY(Math.round(newOffsetY));
    };

    const handleTouchMove = (e) => {
      if (!isDraggingSubtitle) return;
      const touch = e.touches[0];
      if (!touch) return;
      const deltaX = touch.clientX - subtitleDragStartRef.current.startX;
      const deltaY = touch.clientY - subtitleDragStartRef.current.startY;
      const newOffsetX = Math.max(-150, Math.min(150, subtitleDragStartRef.current.initialOffsetX + deltaX));
      const newOffsetY = Math.max(-200, Math.min(200, subtitleDragStartRef.current.initialOffsetY + deltaY));
      if (setCaptionOffsetX) setCaptionOffsetX(Math.round(newOffsetX));
      if (setCaptionOffsetY) setCaptionOffsetY(Math.round(newOffsetY));
    };

    const handleMouseUp = () => {
      setIsDraggingSubtitle(false);
    };

    if (isDraggingSubtitle) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDraggingSubtitle, setCaptionOffsetX, setCaptionOffsetY]);

  // Determine if canvas background is light (for status bar & UI contrast)
  const isLightBackground = () => {
    if (fitMode === 'white_bars') return true;
    if (fitMode === 'black_bars') return false;
    if (templateBgColor) {
      const hex = templateBgColor.replace('#', '');
      if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.55;
      }
    }
    return false;
  };

  const isLight = isLightBackground();

  // Compute CSS Y-position for captions inside 9:16 phone screen
  const getCaptionTopPercent = () => {
    let base = 74; // bottom default
    if (templateSocialCardEnabled) {
      base = captionPosition === 'top' ? 44 : captionPosition === 'center' ? 51 : 56;
    } else {
      if (captionPosition === 'top') base = 18;
      else if (captionPosition === 'center') base = 50;
    }

    // Convert captionOffsetY (-200 to +200) into screen % (phone height ~520px)
    const offsetPct = (captionOffsetY / 520) * 100;
    return Math.min(88, Math.max(12, base + offsetPct));
  };

  // Convert captionOffsetX (-150 to +150) into screen % (phone width ~270px)
  const getCaptionLeftOffset = () => {
    return (captionOffsetX / 270) * 100;
  };

  // Background style based on template and fitMode
  const getBackdropStyle = () => {
    if (templateBgColor) {
      return {
        background: templateBgColor,
        isCustom: true
      };
    }
    if (fitMode === 'white_bars') {
      return {
        background: '#ffffff',
        borderBars: true
      };
    }
    if (fitMode === 'black_bars') {
      return {
        background: '#000000',
        borderBars: true
      };
    }
    if (fitMode === 'blur_padding') {
      return {
        background: 'radial-gradient(ellipse at center, #2e1065 0%, #09090b 70%)',
        isBlur: true
      };
    }
    // crop_fill
    return {
      background: '#121212',
      isFull: true
    };
  };

  const backdrop = getBackdropStyle();

  // Video Card Width and Height calculation (Scales with Preview Size)
  const getVideoCardDimensions = () => {
    const isLarge = previewSize === 'large';
    if (templateCardPadding) {
      // Inset floating card with left/right/top/bottom margin (e.g. YouTube shorts white card style)
      const width = isLarge ? '292px' : '238px';
      let height = isLarge ? '292px' : '238px';
      if (aspectRatio === '9:16') {
        height = isLarge ? '440px' : '360px';
      } else if (aspectRatio === '16:9') {
        height = isLarge ? '164px' : '134px';
      }
      return {
        width,
        height,
        borderRadius: `${templateCornerRadius}px`,
        boxShadow: isLight
          ? '0 12px 30px -4px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(0,0,0,0.06)'
          : '0 12px 30px -4px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255,255,255,0.08)'
      };
    }

    // Edge-to-edge / unpadded standard
    const squareDim = isLarge ? '314px' : '254px';
    const landscapeHeight = isLarge ? '176px' : '143px';
    return {
      width: aspectRatio === '1:1' ? squareDim : '100%',
      height: aspectRatio === '1:1' ? squareDim : aspectRatio === '16:9' ? landscapeHeight : '100%',
      borderRadius: aspectRatio === '1:1' ? `${templateCornerRadius}px` : '0px',
      boxShadow: aspectRatio === '1:1' ? '0 10px 30px rgba(0,0,0,0.6)' : 'none'
    };
  };

  const videoCardDims = getVideoCardDimensions();

  // Watermark positioning styles inside the phone frame
  const getWatermarkStyle = () => {
    let x = templateWatermarkX;
    let y = templateWatermarkY;
    if (x === undefined || x === null) {
      if (templateWatermarkPosition === 'bottom_left') x = 18;
      else if (templateWatermarkPosition === 'bottom_right') x = 82;
      else x = 50;
    }
    if (y === undefined || y === null) {
      y = 88;
    }

    return {
      position: 'absolute',
      left: `${x}%`,
      top: `${y}%`,
      transform: 'translate(-50%, -50%)',
      zIndex: 37,
      cursor: isDraggingWatermark ? 'grabbing' : 'grab',
      userSelect: 'none',
      touchAction: 'none',
      pointerEvents: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      transition: isDraggingWatermark ? 'none' : 'box-shadow 0.15s ease'
    };
  };

  // Smart & Freeform Placement for Top Hook Text
  const getHookPlacementStyle = () => {
    const x = templateHookX ?? 50;
    const y = templateHookY ?? 12;

    return {
      position: 'absolute',
      left: `${x}%`,
      top: `${y}%`,
      transform: 'translate(-50%, -50%)',
      zIndex: 35,
      textAlign: 'center',
      cursor: isDraggingHook ? 'grabbing' : 'grab',
      userSelect: 'none',
      touchAction: 'none',
      pointerEvents: 'auto',
      display: 'flex',
      justifyContent: 'center',
      transition: isDraggingHook ? 'none' : 'box-shadow 0.15s ease'
    };
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        maxWidth: previewSize === 'large' ? '380px' : '320px',
        margin: '0 auto',
        transition: 'max-width 0.2s ease'
      }}
    >
      {/* Top Helper Bar with Mockup Scale & Safe Zone Toggles */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--text-subdued)'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 800 }}>
          <Sparkle size={14} color="var(--spotify-green)" weight="fill" />
          <span>STUDIO MOCKUP</span>
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setPreviewSize(previewSize === 'large' ? 'compact' : 'large')}
            style={{
              background: '#1c1c1c',
              border: '1px solid var(--border-subtle)',
              color: '#ffffff',
              borderRadius: 'var(--radius-full)',
              padding: '3px 8px',
              fontSize: '10px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease'
            }}
            title="Toggle between Studio XL (334px) and Compact (276px)"
          >
            <ArrowsOutCardinal size={11} weight="bold" color="var(--spotify-green)" />
            <span>{previewSize === 'large' ? '334px' : '276px'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSafeZone(!showSafeZone)}
            style={{
              background: showSafeZone ? 'rgba(30, 215, 96, 0.15)' : '#222222',
              border: showSafeZone ? '1px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
              color: showSafeZone ? 'var(--spotify-green)' : 'var(--text-subdued)',
              borderRadius: 'var(--radius-full)',
              padding: '3px 9px',
              fontSize: '10px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease'
            }}
            title="Toggle Social UI Safe Zone overlay"
          >
            {showSafeZone ? <Eye size={12} weight="bold" /> : <EyeSlash size={12} weight="bold" />}
            <span>Reels UI {showSafeZone ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Realistic Smartphone Chassis Frame (Expands to Studio XL size) */}
      <div
        ref={phoneScreenRef}
        style={{
          width: previewSize === 'large' ? '334px' : '276px',
          height: previewSize === 'large' ? '636px' : '526px',
          background: '#09090b',
          borderRadius: previewSize === 'large' ? '46px' : '42px',
          border: '8px solid #27272a',
          boxShadow: '0 28px 70px -12px rgba(0, 0, 0, 0.95), 0 0 0 1px #3f3f46, inset 0 0 0 2px #18181b',
          position: 'relative',
          overflow: 'hidden',
          userSelect: 'none',
          transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1), height 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* Dynamic Island / Notch */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: previewSize === 'large' ? '96px' : '84px',
            height: '20px',
            background: '#000000',
            borderRadius: '20px',
            zIndex: 45,
            display: 'flex',
            alignItems: 'center',
            height: '20px',
            background: '#000000',
            borderRadius: '20px',
            zIndex: 45,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.5)'
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#0f172a',
              border: '1px solid #1e293b'
            }}
          />
          <div
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: '#0284c7'
            }}
          />
        </div>

        {/* Status Bar */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '20px',
            right: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '10px',
            fontWeight: 700,
            color: isLight ? '#18181b' : '#ffffff',
            zIndex: 40,
            fontFamily: 'system-ui',
            transition: 'color 0.2s ease'
          }}
        >
          <span>9:41</span>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span style={{ fontSize: '9px' }}>5G</span>
            <div
              style={{
                width: '16px',
                height: '8px',
                border: '1px solid currentColor',
                borderRadius: '2px',
                padding: '1px',
                display: 'flex'
              }}
            >
              <div style={{ width: '80%', height: '100%', background: 'currentColor' }} />
            </div>
          </div>
        </div>

        {/* Video Canvas Container (Phone Interior Backdrop) */}
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            background: backdrop.background,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s ease'
          }}
        >
          {/* Ambient Blurred Mirror Effect Layer if fitMode is blur_padding and not solid custom bg */}
          {backdrop.isBlur && !templateBgColor && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(76, 29, 149, 0.7) 0%, rgba(15, 23, 42, 0.9) 50%, rgba(88, 28, 135, 0.7) 100%)',
                filter: 'blur(20px)',
                opacity: 0.9,
                transform: 'scale(1.2)'
              }}
            />
          )}

          {/* DRAGGABLE / FREEFORM BRAND LOGO OVERLAY (Standard Mode) */}
          {templateLogoEnabled && !templateSocialCardEnabled && (
            <div
              onMouseDown={handleLogoMouseDown}
              onTouchStart={handleLogoTouchStart}
              onMouseEnter={() => setIsHoveringLogo(true)}
              onMouseLeave={() => setIsHoveringLogo(false)}
              style={{
                position: 'absolute',
                left: `${templateLogoX}%`,
                top: `${templateLogoY}%`,
                zIndex: 38,
                cursor: isDraggingLogo ? 'grabbing' : 'grab',
                userSelect: 'none',
                touchAction: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transition: isDraggingLogo ? 'none' : 'box-shadow 0.15s ease'
              }}
            >
              {/* Outer boundary ring when hovering or dragging */}
              <div
                style={{
                  position: 'relative',
                  padding: '3px',
                  borderRadius: '6px',
                  border: isDraggingLogo
                    ? '2px dashed var(--spotify-green)'
                    : isHoveringLogo
                    ? '1.5px dashed rgba(30, 215, 96, 0.6)'
                    : '1.5px solid transparent',
                  background: isDraggingLogo ? 'rgba(30, 215, 96, 0.15)' : 'transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                {logoPreviewUrl ? (
                  <img
                    src={logoPreviewUrl}
                    alt="Brand Logo"
                    draggable={false}
                    style={{
                      width: `${templateLogoSize}px`,
                      height: 'auto',
                      maxHeight: `${templateLogoSize * 1.2}px`,
                      objectFit: 'contain',
                      opacity: templateLogoOpacity,
                      filter: isLight ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))',
                      borderRadius: '4px',
                      display: 'block'
                    }}
                  />
                ) : (
                  /* Auto clean monogram badge if no file uploaded */
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.15)',
                      backdropFilter: 'blur(6px)',
                      padding: '3px 8px',
                      borderRadius: '14px',
                      border: isLight ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.2)',
                      opacity: templateLogoOpacity,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                    }}
                  >
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #1ed760 0%, #0284c7 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: 900
                      }}
                    >
                      V
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        color: isLight ? '#18181b' : '#ffffff',
                        letterSpacing: '0.4px',
                        fontFamily: '"Montserrat", sans-serif'
                      }}
                    >
                      LOGO
                    </span>
                  </div>
                )}

                {/* Drag Hint indicator on hover / drag */}
                {(isHoveringLogo || isDraggingLogo) && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-18px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(0, 0, 0, 0.85)',
                      color: 'var(--spotify-green)',
                      fontSize: '8px',
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      border: '1px solid rgba(30,215,96,0.3)'
                    }}
                  >
                    <ArrowsOutCardinal size={9} weight="bold" />
                    <span>DRAG</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TOP HOOK TEXT / HEADLINE OVERLAY (Standard Mode) */}
          {templateHookEnabled && !templateSocialCardEnabled && (
            <div
              onMouseDown={handleHookMouseDown}
              onTouchStart={handleHookTouchStart}
              onMouseEnter={() => setIsHoveringHook(true)}
              onMouseLeave={() => setIsHoveringHook(false)}
              style={getHookPlacementStyle()}
            >
              <div
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  maxWidth: '100%',
                  fontWeight: 900,
                  fontSize: `${templateHookSize}px`,
                  lineHeight: 1.25,
                  fontFamily: '"Montserrat", "Arial Black", sans-serif',
                  letterSpacing: '-0.3px',
                  textTransform: 'uppercase',
                  padding: templateHookBg !== 'transparent' || templateHookBorder ? '4px 12px' : '4px 8px',
                  borderRadius: `${templateHookRadius}px`,
                  background:
                    templateHookBg === 'fill'
                      ? templateHookBgColor || '#facc15'
                      : isDraggingHook
                      ? 'rgba(30, 215, 96, 0.2)'
                      : isHoveringHook
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'transparent',
                  color: templateHookColor || (isLight ? '#000000' : '#ffffff'),
                  border: isDraggingHook
                    ? '1.5px dashed var(--spotify-green)'
                    : isHoveringHook
                    ? '1.5px dashed rgba(30, 215, 96, 0.6)'
                    : templateHookBorder
                    ? `2px solid ${templateHookBorderColor || '#000000'}`
                    : '1.5px solid transparent',
                  boxShadow:
                    templateHookBg === 'fill'
                      ? '0 4px 12px rgba(0, 0, 0, 0.25)'
                      : 'none',
                  textShadow:
                    templateHookBg === 'transparent' && !isLight
                      ? '0 2px 6px rgba(0, 0, 0, 0.95)'
                      : 'none'
                }}
              >
                {headlineDisplayText}
                {(isHoveringHook || isDraggingHook) && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-18px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(0, 0, 0, 0.85)',
                      color: 'var(--spotify-green)',
                      fontSize: '8px',
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      border: '1px solid rgba(30,215,96,0.3)'
                    }}
                  >
                    <ArrowsOutCardinal size={9} weight="bold" />
                    <span>DRAG</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ACTIVE VIDEO FRAME (Standard Mode) */}
          {!templateSocialCardEnabled && (
            <div
              style={{
                position: 'relative',
                zIndex: 10,
              width: videoCardDims.width,
              height: videoCardDims.height,
              borderRadius: videoCardDims.borderRadius,
              overflow: 'hidden',
              boxShadow: videoCardDims.boxShadow,
              background: '#18181b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {/* Simulated Animated Video Backdrop (zero CPU load, pure CSS) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #0f172a 100%)',
                opacity: 0.95
              }}
            />

            {/* Simulated Speaker / Face Silhouette */}
            <div
              style={{
                position: 'absolute',
                bottom: '12%',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                opacity: 0.85
              }}
            >
              {/* Head */}
              <div
                style={{
                  width: '54px',
                  height: '62px',
                  borderRadius: '50%',
                  background: 'linear-gradient(180deg, #6366f1 0%, #4338ca 100%)',
                  boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                  marginBottom: '-4px'
                }}
              />
              {/* Shoulders */}
              <div
                style={{
                  width: '110px',
                  height: '56px',
                  borderRadius: '55px 55px 0 0',
                  background: 'linear-gradient(180deg, #3730a3 0%, #1e1b4b 100%)'
                }}
              />
            </div>

            {/* Audio Waveform Micro-Bar */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                display: 'flex',
                gap: '2px',
                alignItems: 'flex-end',
                height: '12px'
              }}
            >
              {[6, 12, 8, 14, 10, 7].map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: '2px',
                    height: `${(activeIdx % (i + 2) + 1) * 3 + 2}px`,
                    background: 'var(--spotify-green)',
                    borderRadius: '1px',
                    transition: 'height 0.15s ease'
                  }}
                />
              ))}
            </div>

            {/* Frame Badge Overlay */}
            <div
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(4px)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '9px',
                fontFamily: 'var(--font-mono)',
                color: '#e4e4e7',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              {aspectRatio} {templateCardPadding ? '• CARD' : ''}
            </div>
          </div>
        )}

        {/* VIRAL SOCIAL POST CARD (ANIME / X COMMUNITY POST SPEC) */}
        {templateSocialCardEnabled && (
          <div
            style={{
              position: 'relative',
              zIndex: 25,
              width: previewSize === 'large' ? '296px' : '246px',
              background: templateSocialCardBg || '#0c0f14',
              borderRadius: `${templateCornerRadius || 14}px`,
              border: '1px solid rgba(255, 255, 255, 0.14)',
              boxShadow: '0 24px 50px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.05)',
              padding: previewSize === 'large' ? '12px' : '10px',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {/* Card Header: Avatar, Channel Name, @Handle, and LIKE & SUBSCRIBE */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}
            >
              {/* Left: Avatar & Channel Details */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {logoPreviewUrl ? (
                  <img
                    src={logoPreviewUrl}
                    alt="Avatar"
                    style={{
                      width: previewSize === 'large' ? '38px' : '34px',
                      height: previewSize === 'large' ? '38px' : '34px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1.5px solid rgba(255, 255, 255, 0.25)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: previewSize === 'large' ? '38px' : '34px',
                      height: previewSize === 'large' ? '38px' : '34px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #e11d48 0%, #4f46e5 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontWeight: 900,
                      fontSize: previewSize === 'large' ? '15px' : '13px',
                      border: '1.5px solid rgba(255, 255, 255, 0.25)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                      fontFamily: '"Montserrat", sans-serif'
                    }}
                  >
                    {(templateChannelName ? templateChannelName[0] : 'C').toUpperCase()}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                  <span
                    style={{
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: previewSize === 'large' ? '13px' : '12px',
                      letterSpacing: '0.3px',
                      fontFamily: '"Montserrat", "Arial Black", sans-serif'
                    }}
                  >
                    {templateChannelName || 'Channel Name'}
                  </span>
                  <span
                    style={{
                      color: '#94a3b8',
                      fontSize: previewSize === 'large' ? '10.5px' : '9.5px',
                      fontWeight: 600,
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    {templateChannelHandle || '@channel'}
                  </span>
                </div>
              </div>
            </div>

            {/* Hook Caption / Headline Directly Below Handle */}
            {templateHookEnabled && (
              <div
                style={{
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: previewSize === 'large' ? '11.5px' : '10.5px',
                  fontFamily: '"Montserrat", "Arial Black", sans-serif',
                  letterSpacing: '-0.2px',
                  lineHeight: 1.25,
                  textTransform: 'uppercase',
                  marginBottom: '8px'
                }}
              >
                {headlineDisplayText}
              </div>
            )}

            {/* Framed Video Container Embedded in the Card */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: previewSize === 'large' ? '206px' : '174px',
                borderRadius: '7px',
                overflow: 'hidden',
                background: '#18181b',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'height 0.2s ease'
              }}
            >
              {/* Simulated Animated Video Backdrop */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #0f172a 100%)',
                  opacity: 0.95
                }}
              />

              {/* Speaker Silhouette */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '10%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  opacity: 0.85
                }}
              >
                <div
                  style={{
                    width: previewSize === 'large' ? '48px' : '42px',
                    height: previewSize === 'large' ? '54px' : '48px',
                    borderRadius: '50%',
                    background: 'linear-gradient(180deg, #6366f1 0%, #4338ca 100%)',
                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                    marginBottom: '-4px'
                  }}
                />
                <div
                  style={{
                    width: previewSize === 'large' ? '98px' : '88px',
                    height: previewSize === 'large' ? '50px' : '44px',
                    borderRadius: '49px 49px 0 0',
                    background: 'linear-gradient(180deg, #3730a3 0%, #1e1b4b 100%)'
                  }}
                />
              </div>

              {/* Audio Waveform Micro-Bar */}
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  display: 'flex',
                  gap: '2px',
                  alignItems: 'flex-end',
                  height: '10px'
                }}
              >
                {[6, 12, 8, 14, 10, 7].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      width: '2px',
                      height: `${(activeIdx % (i + 2) + 1) * 2.5 + 2}px`,
                      background: 'var(--spotify-green)',
                      borderRadius: '1px',
                      transition: 'height 0.15s ease'
                    }}
                  />
                ))}
              </div>

              {/* Frame Ratio Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  backdropFilter: 'blur(4px)',
                  padding: '2px 5px',
                  borderRadius: '4px',
                  fontSize: '8px',
                  fontFamily: 'var(--font-mono)',
                  color: '#e4e4e7',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                1:1 • SOCIAL
              </div>
            </div>

            {/* Bottom Social Actions Footer (Default: HIDDEN as user requested) */}
            {templateSocialFooterEnabled && (
              <div
                style={{
                  marginTop: '8px',
                  paddingTop: '6px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '8px',
                    color: '#94a3b8',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  <span>100M Retweets</span>
                  <span>10M Quotes</span>
                  <span>1M Likes</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                    paddingTop: '4px',
                    color: 'var(--text-subdued)'
                  }}
                >
                  <ChatCircle size={13} />
                  <ShareFat size={13} />
                  <Heart size={13} />
                </div>
              </div>
            )}
          </div>
        )}

          {/* BOTTOM WATERMARK / ATTRIBUTION OVERLAY (DRAGGABLE) */}
          {templateWatermarkEnabled && templateWatermarkText && (
            <div
              onMouseDown={handleWatermarkMouseDown}
              onTouchStart={handleWatermarkTouchStart}
              onMouseEnter={() => setIsHoveringWatermark(true)}
              onMouseLeave={() => setIsHoveringWatermark(false)}
              style={getWatermarkStyle()}
            >
              <span
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: templateWatermarkColor || (isLight ? '#52525b' : '#a1a1aa'),
                  opacity: templateWatermarkOpacity,
                  letterSpacing: '0.4px',
                  background: isDraggingWatermark
                    ? 'rgba(30, 215, 96, 0.25)'
                    : isLight
                    ? 'rgba(0,0,0,0.06)'
                    : 'rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(4px)',
                  padding: '3px 9px',
                  borderRadius: '10px',
                  border: isDraggingWatermark
                    ? '1.5px dashed var(--spotify-green)'
                    : isHoveringWatermark
                    ? '1.5px dashed rgba(30, 215, 96, 0.6)'
                    : isLight
                    ? '1px solid rgba(0,0,0,0.08)'
                    : '1px solid rgba(255,255,255,0.1)',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{templateWatermarkText}</span>
                <CheckCircle size={11} weight="fill" color="var(--spotify-green)" />

                {(isHoveringWatermark || isDraggingWatermark) && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-18px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(0, 0, 0, 0.85)',
                      color: 'var(--spotify-green)',
                      fontSize: '8px',
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      border: '1px solid rgba(30,215,96,0.3)'
                    }}
                  >
                    <ArrowsOutCardinal size={9} weight="bold" />
                    <span>DRAG</span>
                  </div>
                )}
              </span>
            </div>
          )}

          {/* Social UI Overlay (Reels / TikTok icons on right side) */}
          {showSafeZone && (
            <div
              style={{
                position: 'absolute',
                right: '12px',
                bottom: '80px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                alignItems: 'center',
                zIndex: 25,
                color: '#ffffff',
                textShadow: '0 2px 4px rgba(0,0,0,0.8)'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <Heart size={22} weight="fill" color="#ff2d55" />
                <span style={{ fontSize: '9px', fontWeight: 700 }}>24.8K</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <ChatCircle size={22} weight="bold" />
                <span style={{ fontSize: '9px', fontWeight: 700 }}>642</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <BookmarkSimple size={22} weight="bold" />
                <span style={{ fontSize: '9px', fontWeight: 700 }}>3.1K</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <ShareFat size={22} weight="bold" />
                <span style={{ fontSize: '9px', fontWeight: 700 }}>Share</span>
              </div>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#27272a',
                  border: '2px solid #ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: '4px'
                }}
              >
                <MusicNote size={12} weight="bold" />
              </div>
            </div>
          )}

          {/* Background Music Ticker Overlay */}
          {musicName && (
            <div
              style={{
                position: 'absolute',
                left: '14px',
                bottom: '44px',
                maxWidth: '160px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(0, 0, 0, 0.72)',
                backdropFilter: 'blur(6px)',
                padding: '3px 8px',
                borderRadius: '12px',
                border: '1px solid rgba(30, 215, 96, 0.35)',
                fontSize: '9px',
                color: '#ffffff',
                zIndex: 25
              }}
            >
              <MusicNote size={11} color="var(--spotify-green)" weight="fill" />
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: 600
                }}
              >
                {musicName}
              </span>
            </div>
          )}

          {/* Safe Zone Boundary Dotted Line (when SafeZone is active) */}
          {showSafeZone && (
            <div
              style={{
                position: 'absolute',
                inset: '36px 14px 72px 14px',
                border: isLight ? '1px dashed rgba(0, 0, 0, 0.22)' : '1px dashed rgba(255, 255, 255, 0.18)',
                borderRadius: '8px',
                pointerEvents: 'none',
                zIndex: 20
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  left: '6px',
                  fontSize: '8px',
                  color: isLight ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.4)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700
                }}
              >
                SAFE ZONE
              </span>
            </div>
          )}

          {/* LIVE CAPTION RENDERER IN THE PHONE SCREEN (DRAGGABLE) */}
          <div
            onMouseDown={handleSubtitleMouseDown}
            onTouchStart={handleSubtitleTouchStart}
            onMouseEnter={() => setIsHoveringSubtitle(true)}
            onMouseLeave={() => setIsHoveringSubtitle(false)}
            style={{
              position: 'absolute',
              top: `${getCaptionTopPercent()}%`,
              left: `calc(50% + ${getCaptionLeftOffset()}px)`,
              transform: 'translate(-50%, -50%)',
              zIndex: 36,
              width: '88%',
              textAlign: 'center',
              cursor: isDraggingSubtitle ? 'grabbing' : 'grab',
              userSelect: 'none',
              touchAction: 'none',
              pointerEvents: 'auto',
              padding: '6px',
              borderRadius: '8px',
              border: isDraggingSubtitle
                ? '1.5px dashed var(--spotify-green)'
                : isHoveringSubtitle
                ? '1.5px dashed rgba(30, 215, 96, 0.6)'
                : '1.5px solid transparent',
              background: isDraggingSubtitle ? 'rgba(30, 215, 96, 0.12)' : 'transparent',
              transition: isDraggingSubtitle ? 'none' : 'background 0.15s ease, border 0.15s ease'
            }}
          >
            {(isHoveringSubtitle || isDraggingSubtitle) && (
              <div
                style={{
                  position: 'absolute',
                  top: '-18px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(0, 0, 0, 0.85)',
                  color: 'var(--spotify-green)',
                  fontSize: '8px',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  border: '1px solid rgba(30,215,96,0.3)'
                }}
              >
                <ArrowsOutCardinal size={9} weight="bold" />
                <span>DRAG CAPTION</span>
              </div>
            )}
            {preset.isSingleWord ? (
              /* Single Word Pop (1-Word Punchy Zoom) */
              <div
                key={popKey}
                style={{
                  display: 'inline-block',
                  fontFamily: preset.fontFamily,
                  fontSize: `${28 * (captionScale || 1.0)}px`,
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  color: preset.highlightColor,
                  WebkitTextStroke: '2px #000000',
                  textShadow: '0 4px 12px rgba(0, 0, 0, 0.95), 0 0 20px rgba(250, 204, 21, 0.6)',
                  transform: 'scale(1.15)',
                  letterSpacing: '1px'
                }}
              >
                {preset.words[activeIdx]}
              </div>
            ) : (
              /* Multi-Word Karaoke Sequence */
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: '5px',
                  lineHeight: 1.2
                }}
              >
                {preset.words.map((word, idx) => {
                  const isHighlighted = idx === activeIdx;
                  return (
                    <span
                      key={`${word}-${idx}`}
                      style={{
                        fontFamily: preset.fontFamily,
                        fontSize: `${17 * (captionScale || 1.0)}px`,
                        fontWeight: 900,
                        textTransform: preset.fontStyle === 'uppercase' ? 'uppercase' : 'none',
                        color: isHighlighted ? preset.highlightColor : preset.baseColor,
                        WebkitTextStroke: isHighlighted ? '1.5px #000000' : '1px #000000',
                        textShadow: '0 2px 8px rgba(0, 0, 0, 0.9)',
                        transform: isHighlighted ? 'scale(1.18)' : 'scale(1)',
                        transition: 'all 0.14s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'inline-block',
                        background: preset.hasBox ? (isHighlighted ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.55)') : 'transparent',
                        padding: preset.hasBox ? '2px 6px' : '0px',
                        borderRadius: preset.hasBox ? '4px' : '0px',
                        border: preset.hasBox ? (isHighlighted ? '1px solid rgba(250,204,21,0.5)' : '1px solid rgba(255,255,255,0.1)') : 'none'
                      }}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Home Screen Indicator Bar */}
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90px',
            height: '4px',
            borderRadius: '4px',
            background: isLight ? '#27272a' : '#ffffff',
            zIndex: 45,
            opacity: 0.8
          }}
        />
      </div>

      {/* Coordinate & Live Readout */}
      <div
        style={{
          fontSize: '11px',
          color: 'var(--text-subdued)',
          fontFamily: 'var(--font-mono)',
          textAlign: 'center'
        }}
      >
        {templateLogoEnabled && `Logo: (${templateLogoX}%, ${templateLogoY}%) • `}
        {templatePreset !== 'none' ? `Preset: ${templatePreset} • ` : ''}
        {isLight ? 'Light Theme' : 'Dark Theme'}
      </div>
    </div>
  );
}
