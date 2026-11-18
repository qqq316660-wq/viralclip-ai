import React, { useRef } from 'react';
import {
  Sparkle,
  PencilSimple,
  UploadSimple,
  Trash,
  Palette,
  Image as ImageIcon,
  TextT,
  Check,
  CheckCircle,
  Square,
  ArrowsOutCardinal,
  ArrowCounterClockwise,
  Sliders,
  IdentificationCard,
  At,
  ThumbsUp,
  ChatCircleText,
  EyeSlash,
  Broadcast
} from '@phosphor-icons/react';

export default function TemplatePanel({
  templatePreset = 'none',
  setTemplatePreset,
  templateBgColor = '',
  setTemplateBgColor,
  templateCardPadding = false,
  setTemplateCardPadding,
  templateCornerRadius = 14,
  setTemplateCornerRadius,
  templateHookEnabled = false,
  setTemplateHookEnabled,
  templateHookMode = 'ai_hook',
  setTemplateHookMode,
  templateHookText = '',
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
  templateWatermarkText = '',
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
  aspectRatio,
  setAspectRatio,
  fitMode,
  setFitMode,
  isProcessing,
  // Social Card Props
  templateSocialCardEnabled = false,
  setTemplateSocialCardEnabled,
  templateChannelName = 'ViralClip AI',
  setTemplateChannelName,
  templateChannelHandle = '@viral_clip_ai',
  setTemplateChannelHandle,
  templateLikeSubscribeEnabled = true,
  setTemplateLikeSubscribeEnabled,
  templateSocialCardBg = '#0c0f14',
  setTemplateSocialCardBg,
  templateSocialFooterEnabled = false,
  setTemplateSocialFooterEnabled
}) {
  const logoInputRef = useRef(null);

  // Active Template Mode: 'clean' | 'social' | 'bordered'
  const activeTemplateMode = templateSocialCardEnabled
    ? 'social'
    : templateCardPadding
    ? 'bordered'
    : 'clean';

  // Mode 1: Clean Video (Reset all templates to OFF)
  const handleSelectCleanVideo = () => {
    if (setTemplatePreset) setTemplatePreset('none');
    if (setTemplateSocialCardEnabled) setTemplateSocialCardEnabled(false);
    if (setTemplateBgColor) setTemplateBgColor('');
    if (setTemplateCardPadding) setTemplateCardPadding(false);
    if (setTemplateHookEnabled) setTemplateHookEnabled(false);
    if (setTemplateLogoEnabled) setTemplateLogoEnabled(false);
    if (setAspectRatio) setAspectRatio('9:16');
    if (setFitMode) setFitMode('crop_fill');
  };

  // Mode 2: Social Card (Creator Community Card with Ambient Blur)
  const handleSelectSocialCard = () => {
    if (setTemplatePreset) setTemplatePreset('social_post_card');
    if (setTemplateSocialCardEnabled) setTemplateSocialCardEnabled(true);
    if (setTemplateCardPadding) setTemplateCardPadding(false);
    if (setAspectRatio) setAspectRatio('9:16');
    if (setFitMode) setFitMode('blur_padding');
    if (setTemplateBgColor) setTemplateBgColor('');
    if (setTemplateLikeSubscribeEnabled) setTemplateLikeSubscribeEnabled(false);
    if (setTemplateSocialFooterEnabled) setTemplateSocialFooterEnabled(false);
    if (setTemplateHookEnabled) setTemplateHookEnabled(true);
    if (setTemplateHookMode) setTemplateHookMode('ai_hook');
    if (setTemplateHookColor) setTemplateHookColor('#ffffff');
    if (setTemplateHookBg) setTemplateHookBg('transparent');
    if (setTemplateLogoEnabled) setTemplateLogoEnabled(true);
  };

  // Mode 3: Bordered Canvas (White or Black Margin Bars)
  const handleSelectBorderedCanvas = (color = '#ffffff') => {
    if (setTemplateSocialCardEnabled) setTemplateSocialCardEnabled(false);
    if (setTemplatePreset) setTemplatePreset(color === '#ffffff' ? 'shorts_white_card' : 'midnight_black');
    if (setTemplateBgColor) setTemplateBgColor(color);
    if (setTemplateCardPadding) setTemplateCardPadding(true);
    if (setAspectRatio) setAspectRatio('9:16');
    if (setFitMode) setFitMode(color === '#ffffff' ? 'white_bars' : 'black_bars');
    if (setTemplateHookEnabled) setTemplateHookEnabled(true);
    if (setTemplateHookColor) setTemplateHookColor(color === '#ffffff' ? '#000000' : '#ffffff');
    if (setTemplateLogoEnabled) setTemplateLogoEnabled(true);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (setUploadedLogo) setUploadedLogo(file);
      const url = URL.createObjectURL(file);
      if (setLogoPreviewUrl) setLogoPreviewUrl(url);
    }
  };

  const handleRemoveLogo = () => {
    if (setUploadedLogo) setUploadedLogo(null);
    if (setLogoPreviewUrl) setLogoPreviewUrl(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  // Snap Logo to standard corners
  const handleSnapLogo = (pos) => {
    if (setTemplateLogoPosition) setTemplateLogoPosition(pos);
    switch (pos) {
      case 'top_left':
        if (setTemplateLogoX) setTemplateLogoX(6);
        if (setTemplateLogoY) setTemplateLogoY(6);
        break;
      case 'top_center':
        if (setTemplateLogoX) setTemplateLogoX(42);
        if (setTemplateLogoY) setTemplateLogoY(5);
        break;
      case 'top_right':
        if (setTemplateLogoX) setTemplateLogoX(78);
        if (setTemplateLogoY) setTemplateLogoY(6);
        break;
      case 'bottom_left':
        if (setTemplateLogoX) setTemplateLogoX(6);
        if (setTemplateLogoY) setTemplateLogoY(86);
        break;
      case 'bottom_center':
        if (setTemplateLogoX) setTemplateLogoX(42);
        if (setTemplateLogoY) setTemplateLogoY(86);
        break;
      case 'bottom_right':
        if (setTemplateLogoX) setTemplateLogoX(78);
        if (setTemplateLogoY) setTemplateLogoY(86);
        break;
      default:
        break;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. MASTER TEMPLATE STYLE SELECTOR (SEPARATED & ORGANIZED) */}
      <div
        style={{
          background: '#151515',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 18px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Palette size={17} color="var(--spotify-green)" weight="fill" />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
              Select Template Layout
            </span>
          </div>

          {activeTemplateMode !== 'clean' && (
            <button
              type="button"
              onClick={handleSelectCleanVideo}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-subdued)',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.target.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.target.style.color = 'var(--text-subdued)')}
            >
              <ArrowCounterClockwise size={13} weight="bold" />
              <span>Reset to Clean (OFF)</span>
            </button>
          )}
        </div>

        {/* 3 Master Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {/* Option A: Clean Video (Default) */}
          <button
            type="button"
            onClick={handleSelectCleanVideo}
            style={{
              background: activeTemplateMode === 'clean' ? '#252525' : '#101010',
              border: activeTemplateMode === 'clean' ? '1.5px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 12px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                1. Clean Video
              </span>
              {activeTemplateMode === 'clean' && (
                <CheckCircle size={15} weight="fill" color="var(--spotify-green)" />
              )}
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-subdued)', margin: 0, lineHeight: 1.35 }}>
              Default full-bleed video. No cards or borders. 100% clean.
            </p>
          </button>

          {/* Option B: Social Card */}
          <button
            type="button"
            onClick={handleSelectSocialCard}
            style={{
              background: activeTemplateMode === 'social' ? '#252525' : '#101010',
              border: activeTemplateMode === 'social' ? '1.5px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 12px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <IdentificationCard size={15} weight="fill" color="var(--spotify-green)" />
                <span>2. Social Card</span>
              </span>
              {activeTemplateMode === 'social' && (
                <CheckCircle size={15} weight="fill" color="var(--spotify-green)" />
              )}
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-subdued)', margin: 0, lineHeight: 1.35 }}>
              Framed post card with avatar, channel handle, dynamic hook & ambient blur.
            </p>
          </button>

          {/* Option C: Bordered Canvas */}
          <button
            type="button"
            onClick={() => handleSelectBorderedCanvas('#ffffff')}
            style={{
              background: activeTemplateMode === 'bordered' ? '#252525' : '#101010',
              border: activeTemplateMode === 'bordered' ? '1.5px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 12px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                3. Bordered Canvas
              </span>
              {activeTemplateMode === 'bordered' && (
                <CheckCircle size={15} weight="fill" color="var(--spotify-green)" />
              )}
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-subdued)', margin: 0, lineHeight: 1.35 }}>
              Floating inset video with colored margins (white/black), top headline & logo.
            </p>
          </button>
        </div>
      </div>

      {/* 2. MODE SPECIFIC CONFIGURATION AREA */}

      {/* CASE A: CLEAN VIDEO MODE */}
      {activeTemplateMode === 'clean' && (
        <div
          style={{
            background: '#131313',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '24px 20px',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'rgba(30, 215, 96, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 10px auto'
            }}
          >
            <Check size={20} weight="bold" color="var(--spotify-green)" />
          </div>
          <h4 style={{ color: '#ffffff', margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800 }}>
            Clean Video Active (No Template)
          </h4>
          <p style={{ color: 'var(--text-subdued)', margin: '0 auto', fontSize: '12px', maxWidth: '440px', lineHeight: 1.45 }}>
            Your shorts will render clean and full-bleed without any surrounding borders, cards, or text overlays. You can still customize subtitles and background music in their respective tabs.
          </p>
        </div>
      )}

      {/* CASE B: SOCIAL CARD MODE */}
      {activeTemplateMode === 'social' && (
        <div
          style={{
            background: '#151515',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IdentificationCard size={18} weight="fill" color="var(--spotify-green)" />
                <span>Social Card Settings</span>
              </span>
              <p style={{ fontSize: '11px', color: 'var(--text-subdued)', margin: '4px 0 0' }}>
                Customize your channel profile, callout banner, and hook text. Defaults are blank.
              </p>
            </div>

            <span
              style={{
                background: 'rgba(30, 215, 96, 0.15)',
                color: 'var(--spotify-green)',
                fontSize: '10px',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)'
              }}
            >
              ACTIVE TEMPLATE
            </span>
          </div>

          {/* Canvas Backdrop Mode: Embedded Blur vs Solid */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-subdued)', fontWeight: 700, marginBottom: '8px' }}>
              Canvas Backdrop (Behind Card):
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  if (setFitMode) setFitMode('blur_padding');
                  if (setTemplateBgColor) setTemplateBgColor('');
                }}
                style={{
                  background: fitMode === 'blur_padding' && !templateBgColor ? '#2a2a2a' : '#101010',
                  border: fitMode === 'blur_padding' && !templateBgColor ? '1px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Broadcast size={13} weight="bold" color="var(--spotify-green)" />
                <span>Embedded Ambient Blur (Recommended)</span>
                {fitMode === 'blur_padding' && !templateBgColor && <Check size={11} weight="bold" color="var(--spotify-green)" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (setFitMode) setFitMode('black_bars');
                  if (setTemplateBgColor) setTemplateBgColor('#000000');
                }}
                style={{
                  background: templateBgColor === '#000000' ? '#2a2a2a' : '#101010',
                  border: templateBgColor === '#000000' ? '1px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#000000', border: '1px solid #444' }} />
                <span>Solid Black</span>
                {templateBgColor === '#000000' && <Check size={11} weight="bold" color="var(--spotify-green)" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (setFitMode) setFitMode('white_bars');
                  if (setTemplateBgColor) setTemplateBgColor('#ffffff');
                }}
                style={{
                  background: templateBgColor === '#ffffff' ? '#2a2a2a' : '#101010',
                  border: templateBgColor === '#ffffff' ? '1px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffffff' }} />
                <span>Solid White</span>
                {templateBgColor === '#ffffff' && <Check size={11} weight="bold" color="var(--spotify-green)" />}
              </button>
            </div>
          </div>

          {/* Channel Profile Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-subdued)', fontWeight: 700, marginBottom: '6px' }}>
                Channel Name:
              </label>
              <input
                type="text"
                value={templateChannelName}
                onChange={(e) => setTemplateChannelName && setTemplateChannelName(e.target.value)}
                placeholder="Enter channel name (or leave default)"
                style={{
                  width: '100%',
                  background: '#101010',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 10px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-subdued)', fontWeight: 700, marginBottom: '6px' }}>
                Channel @Handle:
              </label>
              <div style={{ position: 'relative' }}>
                <At size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subdued)' }} />
                <input
                  type="text"
                  value={templateChannelHandle.startsWith('@') ? templateChannelHandle.slice(1) : templateChannelHandle}
                  onChange={(e) => setTemplateChannelHandle && setTemplateChannelHandle(e.target.value ? `@${e.target.value.replace(/^@/, '')}` : '')}
                  placeholder="channel (or leave default)"
                  style={{
                    width: '100%',
                    background: '#101010',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 10px 8px 28px',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Avatar Logo Upload */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-subdued)', fontWeight: 700, marginBottom: '6px' }}>
              Channel Avatar / Logo:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {logoPreviewUrl ? (
                <div style={{ position: 'relative', width: '38px', height: '38px' }}>
                  <img
                    src={logoPreviewUrl}
                    alt="Avatar"
                    style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)' }}
                  />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '16px',
                      height: '16px',
                      fontSize: '9px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Remove custom avatar"
                  >
                    <Trash size={10} weight="bold" />
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #e11d48 0%, #4f46e5 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                    border: '1.5px solid rgba(255,255,255,0.2)'
                  }}
                >
                  {(templateChannelName ? templateChannelName[0] : 'C').toUpperCase()}
                </div>
              )}

              <div style={{ flex: 1 }}>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  style={{
                    background: '#222222',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '6px 12px',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <UploadSimple size={13} weight="bold" />
                  <span>{logoPreviewUrl ? 'Change Avatar Image' : 'Upload Custom Avatar'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Headline Text (Above Video) */}
          <div
            style={{
              background: '#101010',
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '11px', color: '#ffffff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TextT size={14} weight="bold" color="var(--spotify-green)" />
                <span>Headline Text (Above Video)</span>
              </label>
              <span style={{ fontSize: '10px', color: templateHookMode === 'ai_hook' ? 'var(--spotify-green)' : 'var(--text-subdued)', fontWeight: 700 }}>
                {templateHookMode === 'ai_hook' ? '⚡ AI Hook per Video' : '✏️ Fixed Custom'}
              </span>
            </div>

            {/* Two Mode Selector Tabs: AI Generated Hook vs Custom Text */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  if (setTemplateHookMode) setTemplateHookMode('ai_hook');
                  if (setTemplateHookEnabled) setTemplateHookEnabled(true);
                }}
                style={{
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: templateHookMode === 'ai_hook' ? '1.5px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
                  background: templateHookMode === 'ai_hook' ? '#252525' : '#141414',
                  color: templateHookMode === 'ai_hook' ? '#ffffff' : 'var(--text-subdued)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Sparkle size={13} weight="fill" color={templateHookMode === 'ai_hook' ? 'var(--spotify-green)' : 'currentColor'} />
                <span>Generated Hook</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (setTemplateHookMode) setTemplateHookMode('custom');
                  if (setTemplateHookEnabled) setTemplateHookEnabled(true);
                }}
                style={{
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: templateHookMode === 'custom' ? '1.5px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
                  background: templateHookMode === 'custom' ? '#252525' : '#141414',
                  color: templateHookMode === 'custom' ? '#ffffff' : 'var(--text-subdued)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease'
                }}
              >
                <PencilSimple size={13} weight="bold" />
                <span>Custom Text</span>
              </button>
            </div>

            {/* When Generated Hook Mode is Selected */}
            {templateHookMode === 'ai_hook' ? (
              <div>
                <input
                  type="text"
                  value={templateHookText}
                  onChange={(e) => setTemplateHookText && setTemplateHookText(e.target.value)}
                  placeholder="e.g. DID YOU KNOW THIS CRAZY FACT? 🔥"
                  style={{
                    width: '100%',
                    background: '#151515',
                    border: '1px solid rgba(30, 215, 96, 0.35)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    outline: 'none'
                  }}
                />
                <p style={{ fontSize: '10.5px', color: 'var(--text-subdued)', margin: '6px 0 0', lineHeight: 1.4 }}>
                  💡 <strong style={{ color: 'var(--spotify-green)' }}>Example preview:</strong> When videos are generated, each short will automatically place its own AI hook/headline from the JSON right here.
                </p>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={templateHookText}
                  onChange={(e) => setTemplateHookText && setTemplateHookText(e.target.value)}
                  placeholder="Enter fixed custom headline (e.g. WAIT TILL THE END 😱)"
                  style={{
                    width: '100%',
                    background: '#151515',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    outline: 'none'
                  }}
                />
                <p style={{ fontSize: '10.5px', color: 'var(--text-subdued)', margin: '6px 0 0', lineHeight: 1.4 }}>
                  This exact custom headline will be placed on all generated shorts.
                </p>
              </div>
            )}
          </div>

          {/* Social Stats Footer (Default: OFF / Hidden) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#101010',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <div>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ChatCircleText size={14} weight="bold" color="var(--text-subdued)" />
                <span>Social Action Stats Footer</span>
              </span>
              <p style={{ fontSize: '10px', color: 'var(--text-subdued)', margin: '2px 0 0' }}>
                (Retweets, likes, and comment icons). Keep OFF for clean focus on your video.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setTemplateSocialFooterEnabled && setTemplateSocialFooterEnabled(!templateSocialFooterEnabled)}
              style={{
                background: templateSocialFooterEnabled ? 'var(--spotify-green)' : '#282828',
                color: templateSocialFooterEnabled ? '#000000' : 'var(--text-subdued)',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                padding: '4px 12px',
                fontWeight: 800,
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
            >
              {templateSocialFooterEnabled ? <Check size={11} weight="bold" /> : null}
              <span>{templateSocialFooterEnabled ? 'ON' : 'OFF (Hidden)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* CASE C: BORDERED CANVAS MODE */}
      {activeTemplateMode === 'bordered' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Canvas Background Color & Card Radius */}
          <div
            style={{
              background: '#151515',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-subdued)', fontWeight: 700, marginBottom: '8px' }}>
                Margin Bar Background Color:
              </label>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                {[
                  { label: 'White', hex: '#ffffff' },
                  { label: 'Black', hex: '#000000' },
                  { label: 'Slate', hex: '#18181b' },
                  { label: 'Off-White', hex: '#fbfbfe' }
                ].map((c) => {
                  const isSelected = templateBgColor?.toLowerCase() === c.hex.toLowerCase();
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => {
                        if (setTemplateBgColor) setTemplateBgColor(c.hex);
                        if (setFitMode) setFitMode(c.hex === '#ffffff' ? 'white_bars' : 'black_bars');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: isSelected ? '#2a2a2a' : '#101010',
                        border: isSelected ? '1px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#ffffff'
                      }}
                    >
                      <span
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: c.hex,
                          border: '1px solid rgba(255,255,255,0.2)'
                        }}
                      />
                      <span>{c.label}</span>
                      {isSelected && <Check size={11} weight="bold" color="var(--spotify-green)" />}
                    </button>
                  );
                })}

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#101010',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '4px 8px'
                  }}
                >
                  <input
                    type="color"
                    value={templateBgColor || '#ffffff'}
                    onChange={(e) => {
                      if (setTemplateBgColor) setTemplateBgColor(e.target.value);
                      if (setFitMode) setFitMode(e.target.value === '#ffffff' ? 'white_bars' : 'black_bars');
                    }}
                    style={{ width: '22px', height: '22px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                  />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#ffffff' }}>
                    {templateBgColor?.toUpperCase() || '#FFFFFF'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-subdued)' }}>Video Corner Radius</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--spotify-green)' }}>
                  {templateCornerRadius} px
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {[
                  { label: 'Sharp (0px)', val: 0 },
                  { label: 'Subtle (8px)', val: 8 },
                  { label: 'Rounded (14px)', val: 14 },
                  { label: 'Pill (22px)', val: 22 }
                ].map((rad) => {
                  const isSel = templateCornerRadius === rad.val;
                  return (
                    <button
                      key={rad.val}
                      type="button"
                      onClick={() => setTemplateCornerRadius && setTemplateCornerRadius(rad.val)}
                      style={{
                        background: isSel ? '#252525' : '#101010',
                        border: isSel ? '1px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: isSel ? '#ffffff' : 'var(--text-subdued)',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      {rad.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top Hook Headline (Banner over video) */}
          <div
            style={{
              background: '#151515',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '18px 20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TextT size={16} weight="bold" color="var(--spotify-green)" />
                  <span>Top Hook Headline</span>
                </span>
                <p style={{ fontSize: '11px', color: 'var(--text-subdued)', margin: '4px 0 0' }}>
                  Punchy headline placed at the top of the canvas.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTemplateHookEnabled && setTemplateHookEnabled(!templateHookEnabled)}
                style={{
                  background: templateHookEnabled ? 'var(--spotify-green)' : '#282828',
                  color: templateHookEnabled ? '#000000' : 'var(--text-subdued)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  padding: '6px 14px',
                  fontWeight: 800,
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {templateHookEnabled ? <Check size={12} weight="bold" /> : null}
                <span>{templateHookEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            {templateHookEnabled && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-subdued)', fontWeight: 700 }}>
                      Headline Source:
                    </label>
                    <span style={{ fontSize: '10px', color: templateHookMode === 'ai_hook' ? 'var(--spotify-green)' : 'var(--text-subdued)', fontWeight: 700 }}>
                      {templateHookMode === 'ai_hook' ? '⚡ AI Hook per Video' : '✏️ Fixed Custom'}
                    </span>
                  </div>

                  {/* Two Mode Selector Tabs: AI Generated Hook vs Custom Text */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setTemplateHookMode && setTemplateHookMode('ai_hook')}
                      style={{
                        padding: '7px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        border: templateHookMode === 'ai_hook' ? '1.5px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
                        background: templateHookMode === 'ai_hook' ? '#252525' : '#101010',
                        color: templateHookMode === 'ai_hook' ? '#ffffff' : 'var(--text-subdued)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Sparkle size={13} weight="fill" color={templateHookMode === 'ai_hook' ? 'var(--spotify-green)' : 'currentColor'} />
                      <span>Generated Hook</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTemplateHookMode && setTemplateHookMode('custom')}
                      style={{
                        padding: '7px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        border: templateHookMode === 'custom' ? '1.5px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
                        background: templateHookMode === 'custom' ? '#252525' : '#101010',
                        color: templateHookMode === 'custom' ? '#ffffff' : 'var(--text-subdued)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <PencilSimple size={13} weight="bold" />
                      <span>Custom Text</span>
                    </button>
                  </div>

                  {templateHookMode === 'ai_hook' ? (
                    <div>
                      <input
                        type="text"
                        value={templateHookText}
                        onChange={(e) => setTemplateHookText && setTemplateHookText(e.target.value)}
                        placeholder="e.g. WAIT TILL THE END 😱 (Example preview)"
                        style={{
                          width: '100%',
                          background: '#101010',
                          border: '1px solid rgba(30, 215, 96, 0.35)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '10px 14px',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: 800,
                          textTransform: 'uppercase'
                        }}
                      />
                      <p style={{ fontSize: '10.5px', color: 'var(--text-subdued)', margin: '5px 0 0', lineHeight: 1.4 }}>
                        💡 <strong style={{ color: 'var(--spotify-green)' }}>Example preview:</strong> Each video short will automatically place its own AI hook/headline from the JSON here.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        value={templateHookText}
                        onChange={(e) => setTemplateHookText && setTemplateHookText(e.target.value)}
                        placeholder="Enter custom headline text"
                        style={{
                          width: '100%',
                          background: '#101010',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '10px 14px',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: 800,
                          textTransform: 'uppercase'
                        }}
                      />
                      <p style={{ fontSize: '10.5px', color: 'var(--text-subdued)', margin: '5px 0 0', lineHeight: 1.4 }}>
                        This static headline will be burned onto all generated shorts.
                      </p>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-subdued)', fontWeight: 700, marginBottom: '6px' }}>
                      Container Style:
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setTemplateHookBg && setTemplateHookBg('transparent')}
                        style={{
                          flex: 1,
                          background: templateHookBg === 'transparent' ? '#252525' : '#101010',
                          border: templateHookBg === 'transparent' ? '1px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '7px 8px',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Transparent
                      </button>
                      <button
                        type="button"
                        onClick={() => setTemplateHookBg && setTemplateHookBg('fill')}
                        style={{
                          flex: 1,
                          background: templateHookBg === 'fill' ? '#252525' : '#101010',
                          border: templateHookBg === 'fill' ? '1px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '7px 8px',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Filled Box
                      </button>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-subdued)' }}>Vertical Position</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--spotify-green)' }}>
                        {templateHookY}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="80"
                      value={templateHookY}
                      onChange={(e) => setTemplateHookY && setTemplateHookY(parseInt(e.target.value, 10))}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Floating Brand Logo */}
          <div
            style={{
              background: '#151515',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '18px 20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon size={16} weight="bold" color="var(--spotify-green)" />
                  <span>Brand Logo Overlay</span>
                </span>
                <p style={{ fontSize: '11px', color: 'var(--text-subdued)', margin: '4px 0 0' }}>
                  Draggable logo or monogram badge anywhere on canvas.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTemplateLogoEnabled && setTemplateLogoEnabled(!templateLogoEnabled)}
                style={{
                  background: templateLogoEnabled ? 'var(--spotify-green)' : '#282828',
                  color: templateLogoEnabled ? '#000000' : 'var(--text-subdued)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  padding: '6px 14px',
                  fontWeight: 800,
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {templateLogoEnabled ? <Check size={12} weight="bold" /> : null}
                <span>{templateLogoEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            {templateLogoEnabled && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-subdued)', fontWeight: 700, marginBottom: '6px' }}>
                    Quick Snap Position:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
                    {[
                      { id: 'top_left', label: 'Top-L' },
                      { id: 'top_center', label: 'Top-C' },
                      { id: 'top_right', label: 'Top-R' },
                      { id: 'bottom_left', label: 'Bot-L' },
                      { id: 'bottom_center', label: 'Bot-C' },
                      { id: 'bottom_right', label: 'Bot-R' }
                    ].map((pos) => {
                      const isSel = templateLogoPosition === pos.id;
                      return (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => handleSnapLogo(pos.id)}
                          style={{
                            background: isSel ? '#252525' : '#101010',
                            border: isSel ? '1px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '6px 4px',
                            fontSize: '10px',
                            fontWeight: 700,
                            color: isSel ? '#ffffff' : 'var(--text-subdued)',
                            cursor: 'pointer',
                            textAlign: 'center'
                          }}
                        >
                          {pos.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    style={{
                      background: '#222222',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '7px 12px',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <UploadSimple size={14} weight="bold" />
                    <span>{logoPreviewUrl ? 'Replace Logo' : 'Upload Logo PNG'}</span>
                  </button>

                  {logoPreviewUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Trash size={13} weight="bold" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. CHANNEL WATERMARK / ATTRIBUTION (SHARED ACROSS ANY MODE) */}
      <div
        style={{
          background: '#151515',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 18px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={16} weight="bold" color="var(--spotify-green)" />
              <span>Channel Watermark / Attribution Tag</span>
            </span>
            <p style={{ fontSize: '11px', color: 'var(--text-subdued)', margin: '3px 0 0' }}>
              Creator handle or tag at the bottom of the video.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setTemplateWatermarkEnabled && setTemplateWatermarkEnabled(!templateWatermarkEnabled)}
            style={{
              background: templateWatermarkEnabled ? 'var(--spotify-green)' : '#282828',
              color: templateWatermarkEnabled ? '#000000' : 'var(--text-subdued)',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: '5px 12px',
              fontWeight: 800,
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {templateWatermarkEnabled ? <Check size={11} weight="bold" /> : null}
            <span>{templateWatermarkEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {templateWatermarkEnabled && (
          <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-subdued)', fontWeight: 700, marginBottom: '6px' }}>
                Watermark Handle Text:
              </label>
              <input
                type="text"
                value={templateWatermarkText}
                onChange={(e) => setTemplateWatermarkText && setTemplateWatermarkText(e.target.value)}
                placeholder="@yourchannel"
                style={{
                  width: '100%',
                  background: '#101010',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)'
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-subdued)', fontWeight: 700 }}>
                  Watermark Position Preset:
                </label>
                <span style={{ fontSize: '10px', color: 'var(--spotify-green)', fontWeight: 700 }}>
                  ✋ Draggable on Phone Screen
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { id: 'bottom_left', label: 'Bottom-Left', x: 18, y: 88 },
                  { id: 'bottom_center', label: 'Bottom-Center', x: 50, y: 88 },
                  { id: 'bottom_right', label: 'Bottom-Right', x: 82, y: 88 }
                ].map((pos) => {
                  const isSelected = templateWatermarkPosition === pos.id;
                  return (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => {
                        if (setTemplateWatermarkPosition) setTemplateWatermarkPosition(pos.id);
                        if (setTemplateWatermarkX) setTemplateWatermarkX(pos.x);
                        if (setTemplateWatermarkY) setTemplateWatermarkY(pos.y);
                      }}
                      style={{
                        background: isSelected ? '#252525' : '#101010',
                        border: isSelected ? '1px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '7px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: isSelected ? '#ffffff' : 'var(--text-subdued)',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      {pos.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fine-tune X / Y Sliders */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-subdued)', marginBottom: '4px' }}>
                  <span>Horizontal (X):</span>
                  <span style={{ color: '#ffffff', fontFamily: 'var(--font-mono)' }}>{templateWatermarkX ?? 50}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="95"
                  value={templateWatermarkX ?? 50}
                  onChange={(e) => {
                    if (setTemplateWatermarkPosition) setTemplateWatermarkPosition('custom');
                    if (setTemplateWatermarkX) setTemplateWatermarkX(Number(e.target.value));
                  }}
                  style={{ width: '100%', accentColor: 'var(--spotify-green)', cursor: 'pointer' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-subdued)', marginBottom: '4px' }}>
                  <span>Vertical (Y):</span>
                  <span style={{ color: '#ffffff', fontFamily: 'var(--font-mono)' }}>{templateWatermarkY ?? 88}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="95"
                  value={templateWatermarkY ?? 88}
                  onChange={(e) => {
                    if (setTemplateWatermarkPosition) setTemplateWatermarkPosition('custom');
                    if (setTemplateWatermarkY) setTemplateWatermarkY(Number(e.target.value));
                  }}
                  style={{ width: '100%', accentColor: 'var(--spotify-green)', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
