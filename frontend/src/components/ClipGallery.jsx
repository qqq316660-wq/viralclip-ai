import React, { useState } from 'react';
import {
  Fire,
  Clock,
  DownloadSimple,
  Copy,
  Check,
  ArrowSquareOut,
  ArrowCounterClockwise,
  ShareNetwork,
  Sparkle,
  FolderOpen
} from '@phosphor-icons/react';
import { downloadVideoFile } from '../utils/downloadHelper';

export default function ClipGallery({ clips, backendUrl, onStartNew, onOpenLibrary }) {
  const [copiedId, setCopiedId] = useState(null);
  const [copiedType, setCopiedType] = useState(null);
  const [filterMode, setFilterMode] = useState('all');
  const [downloadingClipId, setDownloadingClipId] = useState(null);

  const handleCopyLink = async (clipId, url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(clipId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Ignore
    }
  };

  const handleCopyText = async (clipId, type, text) => {
    try {
      await navigator.clipboard.writeText(text || '');
      setCopiedType(`${clipId}_${type}`);
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      // Ignore
    }
  };

  const handleDownloadSingleClip = async (clip, idx) => {
    if (!clip.rendered_url) return;
    const rawName = clip.suggested_headline || clip.title || `viralclip_${clip.id || idx + 1}`;
    const clipKey = clip.id || idx;
    setDownloadingClipId(clipKey);
    try {
      const videoSrc = `${backendUrl}${clip.rendered_url}`;
      await downloadVideoFile(videoSrc, rawName, backendUrl);
    } catch (e) {
      console.error('Download failed:', e);
    } finally {
      setDownloadingClipId(null);
    }
  };

  const filteredClips = (clips || []).filter((c) => {
    if (filterMode === 'high_hook') return (c.hook_score || 0) >= 80;
    if (filterMode === 'quick') return (c.duration || 0) <= 35;
    return true;
  });

  return (
    <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
      {/* Gallery Header and Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Fire size={24} weight="fill" color="var(--spotify-green)" />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
              Viral Shorts Ready ({filteredClips.length})
            </h2>
            <span
              style={{
                background: 'rgba(30, 215, 96, 0.15)',
                color: 'var(--spotify-green)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                fontSize: '11px',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)'
              }}
            >
              Saved Locally ✓
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-subdued)', marginTop: '2px' }}>
            Reframed 9:16 vertical shorts with burned animated karaoke subtitles
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Filters */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              background: '#181818',
              padding: '4px',
              borderRadius: 'var(--radius-full)'
            }}
          >
            {[
              { id: 'all', label: `All (${clips?.length || 0})` },
              { id: 'high_hook', label: 'Top Hooks' },
              { id: 'quick', label: 'Snappy' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                style={{
                  background: filterMode === tab.id ? '#2a2a2a' : 'transparent',
                  color: filterMode === tab.id ? '#ffffff' : 'var(--text-subdued)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Open Saved Shorts Library */}
          {onOpenLibrary && (
            <button
              type="button"
              onClick={onOpenLibrary}
              className="btn-spotify-secondary"
              style={{ fontSize: '12px', padding: '8px 16px', gap: '6px' }}
            >
              <FolderOpen size={15} weight="bold" color="var(--spotify-green)" />
              <span>Saved Shorts</span>
            </button>
          )}

          {/* Start New Shorts Onboarding */}
          {onStartNew && (
            <button
              type="button"
              onClick={onStartNew}
              className="btn-spotify-secondary"
              style={{ fontSize: '12px', padding: '8px 16px' }}
            >
              <ArrowCounterClockwise size={14} weight="bold" />
              <span>Create New</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Vertical Clips */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px'
        }}
      >
        {filteredClips.map((clip, idx) => {
          const videoSrc = clip.rendered_url ? `${backendUrl}${clip.rendered_url}` : null;
          const isCopied = copiedId === clip.id;

          return (
            <div
              key={clip.id || idx}
              className="spotify-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-heavy)'
              }}
            >
              {/* 9:16 Video Player Frame */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '9/16',
                  maxHeight: '480px',
                  background: '#0a0a0a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderBottom: '1px solid #222222'
                }}
              >
                {/* Speaker Notch */}
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '54px',
                    height: '4px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(255, 255, 255, 0.2)',
                    zIndex: 2,
                    pointerEvents: 'none'
                  }}
                />

                {videoSrc ? (
                  <video
                    src={videoSrc}
                    controls
                    playsInline
                    preload="metadata"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      background: '#000000'
                    }}
                  />
                ) : (
                  <div style={{ color: 'var(--text-subdued)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
                    Rendering short...
                  </div>
                )}

                {/* Viral Hook Pill Badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: '14px',
                    right: '14px',
                    zIndex: 3
                  }}
                >
                  <div
                    style={{
                      background: 'rgba(18, 18, 18, 0.9)',
                      color: 'var(--spotify-green)',
                      border: '1px solid rgba(30, 215, 96, 0.4)',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Fire size={13} weight="fill" />
                    <span>{clip.hook_score || 85}/100 VIRAL</span>
                  </div>
                </div>

                {/* Duration Badge Bottom Left */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    zIndex: 3,
                    background: 'rgba(18, 18, 18, 0.9)',
                    color: 'var(--text-subdued)',
                    border: '1px solid #2e2e2e',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Clock size={12} />
                  <span>{clip.duration ? `${clip.duration.toFixed(1)}s` : '30.0s'}</span>
                </div>
              </div>

              {/* Clip Details */}
              <div
                style={{
                  padding: '18px',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-subdued)',
                      fontFamily: 'var(--font-mono)',
                      marginBottom: '6px'
                    }}
                  >
                    {clip.start_time !== undefined && clip.end_time !== undefined
                      ? `${clip.start_time.toFixed(1)}s to ${clip.end_time.toFixed(1)}s`
                      : '0.0s to 30.0s'}
                  </div>

                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', marginBottom: clip.suggested_headline ? '4px' : '8px', lineHeight: '1.3' }}>
                    {clip.title || clip.suggested_headline || `Short Segment #${idx + 1}`}
                  </h4>

                  {/* Suggested Headline */}
                  {clip.suggested_headline && clip.suggested_headline !== clip.title && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--spotify-green)',
                        fontWeight: 600,
                        marginBottom: '8px',
                        lineHeight: 1.4,
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '6px'
                      }}
                    >
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          background: 'rgba(30, 215, 96, 0.15)',
                          color: 'var(--spotify-green)',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          flexShrink: 0
                        }}
                      >
                        Headline
                      </span>
                      <span style={{ fontStyle: 'italic' }}>"{clip.suggested_headline}"</span>
                    </div>
                  )}

                  {/* Combined Description & Hook Reason */}
                  {(() => {
                    const combinedDesc = [
                      clip.description,
                      clip.hook_reason && (!clip.description || !clip.description.includes(clip.hook_reason))
                        ? clip.hook_reason
                        : null
                    ]
                      .filter(Boolean)
                      .join(' ');

                    if (!combinedDesc) return null;

                    return (
                      <p style={{ fontSize: '12px', color: '#b3b3b3', lineHeight: '1.45', marginBottom: '10px' }}>
                        {combinedDesc}
                      </p>
                    );
                  })()}

                  {/* Hashtags */}
                  {clip.hashtags && clip.hashtags.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '14px' }}>
                      {clip.hashtags.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          style={{
                            background: '#242424',
                            color: 'var(--text-subdued)',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono)'
                          }}
                        >
                          {tag.startsWith('#') ? tag : `#${tag}`}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 4 Dedicated Copy Buttons: Title, Headline, Description, Tags */}
                  {(() => {
                    const combinedDesc = [
                      clip.description,
                      clip.hook_reason && (!clip.description || !clip.description.includes(clip.hook_reason))
                        ? clip.hook_reason
                        : null
                    ]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: '4px',
                          marginBottom: '14px'
                        }}
                      >
                        {/* Copy Title */}
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(
                              clip.id,
                              'title',
                              clip.title || clip.suggested_headline || 'Viral Short'
                            )
                          }
                          className="btn-spotify-secondary"
                          style={{
                            padding: '7px 2px',
                            fontSize: '10px',
                            justifyContent: 'center',
                            gap: '3px',
                            background:
                              copiedType === `${clip.id}_title`
                                ? 'rgba(30, 215, 96, 0.15)'
                                : '#1e1e1e',
                            borderColor:
                              copiedType === `${clip.id}_title`
                                ? 'var(--spotify-green)'
                                : '#333333',
                            color:
                              copiedType === `${clip.id}_title`
                                ? 'var(--spotify-green)'
                                : '#ffffff',
                            transition: 'all 0.15s ease'
                          }}
                          title="Copy Title"
                        >
                          {copiedType === `${clip.id}_title` ? (
                            <>
                              <Check size={11} weight="bold" color="var(--spotify-green)" />
                              <span style={{ color: 'var(--spotify-green)' }}>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} />
                              <span>Title</span>
                            </>
                          )}
                        </button>

                        {/* Copy Headline */}
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(
                              clip.id,
                              'headline',
                              clip.suggested_headline || clip.title || ''
                            )
                          }
                          className="btn-spotify-secondary"
                          style={{
                            padding: '7px 2px',
                            fontSize: '10px',
                            justifyContent: 'center',
                            gap: '3px',
                            background:
                              copiedType === `${clip.id}_headline`
                                ? 'rgba(30, 215, 96, 0.15)'
                                : '#1e1e1e',
                            borderColor:
                              copiedType === `${clip.id}_headline`
                                ? 'var(--spotify-green)'
                                : '#333333',
                            color:
                              copiedType === `${clip.id}_headline`
                                ? 'var(--spotify-green)'
                                : '#ffffff',
                            transition: 'all 0.15s ease'
                          }}
                          title="Copy Suggested Headline"
                        >
                          {copiedType === `${clip.id}_headline` ? (
                            <>
                              <Check size={11} weight="bold" color="var(--spotify-green)" />
                              <span style={{ color: 'var(--spotify-green)' }}>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} />
                              <span>Headline</span>
                            </>
                          )}
                        </button>

                        {/* Copy Description */}
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(
                              clip.id,
                              'desc',
                              combinedDesc || ''
                            )
                          }
                          className="btn-spotify-secondary"
                          style={{
                            padding: '7px 2px',
                            fontSize: '10px',
                            justifyContent: 'center',
                            gap: '3px',
                            background:
                              copiedType === `${clip.id}_desc`
                                ? 'rgba(30, 215, 96, 0.15)'
                                : '#1e1e1e',
                            borderColor:
                              copiedType === `${clip.id}_desc`
                                ? 'var(--spotify-green)'
                                : '#333333',
                            color:
                              copiedType === `${clip.id}_desc`
                                ? 'var(--spotify-green)'
                                : '#ffffff',
                            transition: 'all 0.15s ease'
                          }}
                          title="Copy Description"
                        >
                          {copiedType === `${clip.id}_desc` ? (
                            <>
                              <Check size={11} weight="bold" color="var(--spotify-green)" />
                              <span style={{ color: 'var(--spotify-green)' }}>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} />
                              <span>Desc</span>
                            </>
                          )}
                        </button>

                        {/* Copy Tags */}
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(
                              clip.id,
                              'tags',
                              clip.hashtags && clip.hashtags.length > 0
                                ? Array.isArray(clip.hashtags)
                                  ? clip.hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ')
                                  : String(clip.hashtags)
                                : '#shorts #viral #reels'
                            )
                          }
                          className="btn-spotify-secondary"
                          style={{
                            padding: '7px 2px',
                            fontSize: '10px',
                            justifyContent: 'center',
                            gap: '3px',
                            background:
                              copiedType === `${clip.id}_tags`
                                ? 'rgba(30, 215, 96, 0.15)'
                                : '#1e1e1e',
                            borderColor:
                              copiedType === `${clip.id}_tags`
                                ? 'var(--spotify-green)'
                                : '#333333',
                            color:
                              copiedType === `${clip.id}_tags`
                                ? 'var(--spotify-green)'
                                : '#ffffff',
                            transition: 'all 0.15s ease'
                          }}
                          title="Copy Tags"
                        >
                          {copiedType === `${clip.id}_tags` ? (
                            <>
                              <Check size={11} weight="bold" color="var(--spotify-green)" />
                              <span style={{ color: 'var(--spotify-green)' }}>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} />
                              <span>Tags</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {videoSrc ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDownloadSingleClip(clip, idx)}
                        disabled={downloadingClipId === (clip.id || idx)}
                        className="btn-spotify-primary"
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          fontSize: '12px',
                          justifyContent: 'center',
                          cursor: downloadingClipId === (clip.id || idx) ? 'wait' : 'pointer',
                          opacity: downloadingClipId === (clip.id || idx) ? 0.75 : 1
                        }}
                        title="Download MP4 video directly"
                      >
                        <DownloadSimple size={16} weight="bold" />
                        <span>{downloadingClipId === (clip.id || idx) ? 'Saving...' : 'Download .mp4'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyLink(clip.id, videoSrc)}
                        className="btn-spotify-secondary"
                        style={{ padding: '10px 12px' }}
                        title="Copy video URL"
                      >
                        {isCopied ? <Check size={16} weight="bold" color="var(--spotify-green)" /> : <Copy size={16} />}
                      </button>

                      <a
                        href={videoSrc}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-spotify-secondary"
                        style={{ padding: '10px 12px', textDecoration: 'none' }}
                        title="Open video in new tab"
                      >
                        <ArrowSquareOut size={16} weight="bold" />
                      </a>
                    </>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--text-subdued)', fontFamily: 'var(--font-mono)' }}>
                      Rendering short...
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
