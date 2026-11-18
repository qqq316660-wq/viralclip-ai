import React, { useState } from 'react';
import {
  DownloadSimple,
  Microphone,
  Sparkle,
  FilmSlate,
  CheckCircle,
  CircleNotch,
  ArrowRight,
  WarningCircle,
  ArrowCounterClockwise,
  Fire,
  Play,
  Check,
  X,
  FolderOpen
} from '@phosphor-icons/react';
import { downloadVideoFile, openLocalClipsFolder } from '../utils/downloadHelper';
import AiPromptReview from './AiPromptReview';

export default function JobProgress({
  job,
  backendUrl,
  onSubmitClips,
  onSkipToHeuristic,
  onViewClips,
  onRetry,
  onStartNew
}) {
  const [downloadingClipId, setDownloadingClipId] = useState(null);

  const handleDownloadClip = async (clip, idx) => {
    if (!clip.rendered_url) return;
    const rawName = clip.suggested_headline || clip.title || `viralclip_${clip.id || idx + 1}`;
    const key = clip.id || idx;
    setDownloadingClipId(key);
    try {
      const videoSrc = `${backendUrl}${clip.rendered_url}`;
      await downloadVideoFile(videoSrc, rawName, backendUrl);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloadingClipId(null);
    }
  };

  if (!job) return null;

  const stages = [
    { key: 'downloading', label: '1. Ingest Media', icon: DownloadSimple },
    { key: 'transcribing', label: '2. Whisper Sync', icon: Microphone },
    { key: 'selecting', label: '3. Hook Scoring', icon: Sparkle },
    { key: 'rendering', label: '4. 9:16 Render', icon: FilmSlate }
  ];

  const isFailed = job.status === 'failed';
  const isCompleted = job.status === 'completed';
  const isAwaitingClips = job.status === 'awaiting_clips';

  const getStageIndex = () => {
    switch (job.status) {
      case 'downloading':
        return 0;
      case 'transcribing':
        return 1;
      case 'awaiting_clips':
      case 'selecting':
        return 2;
      case 'rendering':
        return 3;
      case 'completed':
        return 4;
      case 'failed':
        return 0;
      default:
        return 0;
    }
  };

  const activeIdx = getStageIndex();

  // Strip ANSI color escape codes and clean up message
  const rawMessage = job.stage_message || job.error || '';
  const cleanMessage = rawMessage
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/^Failed:\s*(ERROR:\s*)?/i, '')
    .trim();

  return (
    <div
      className="spotify-card"
      style={{
        maxWidth: isAwaitingClips ? '880px' : '720px',
        margin: '0 auto',
        padding: '36px 28px',
        boxShadow: 'var(--shadow-heavy)',
        border: isFailed
          ? '1px solid rgba(233, 20, 41, 0.4)'
          : isCompleted
            ? '1px solid var(--spotify-green-border)'
            : isAwaitingClips
              ? '1px solid rgba(30, 215, 96, 0.5)'
              : '1px solid var(--border-subtle)'
      }}
    >
      {/* Neural Pipeline Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {isFailed ? (
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-circle)',
                background: '#2d1417',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <WarningCircle size={26} weight="fill" />
            </div>
          ) : isCompleted ? (
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-circle)',
                background: 'var(--spotify-green)',
                color: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CheckCircle size={26} weight="fill" />
            </div>
          ) : isAwaitingClips ? (
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-circle)',
                background: 'rgba(30, 215, 96, 0.15)',
                color: 'var(--spotify-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(30, 215, 96, 0.4)'
              }}
            >
              <Sparkle size={24} weight="fill" />
            </div>
          ) : (
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-circle)',
                background: '#242424',
                color: 'var(--spotify-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CircleNotch size={26} weight="bold" className="animate-spin-spotify" />
            </div>
          )}

          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: isFailed ? '#fca5a5' : '#ffffff', marginBottom: '2px' }}>
              {isFailed
                ? 'Processing Halted'
                : isCompleted
                  ? 'All clips rendered successfully'
                  : isAwaitingClips
                    ? 'AI Prompt Ready — Review & Confirm Clips'
                    : (job.stage_message || 'Processing neural pipeline...')}
            </h3>
            {job.video_title && (
              <p style={{ fontSize: '12px', color: 'var(--text-subdued)', fontFamily: 'var(--font-mono)' }}>
                {job.video_title}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                color: isFailed ? '#ef4444' : isCompleted || isAwaitingClips ? 'var(--spotify-green)' : '#ffffff',
                lineHeight: 1
              }}
            >
              {job.progress}%
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-subdued)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {isFailed ? 'Interrupted' : isCompleted ? 'Complete' : isAwaitingClips ? 'Action Needed' : 'Progress'}
            </div>
          </div>

          {onStartNew && (
            <button
              type="button"
              onClick={onStartNew}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#cccccc',
                border: '1px solid #3e3e3e',
                borderRadius: 'var(--radius-full)',
                padding: '4px 12px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease'
              }}
              title="Discard current job and start a new video"
            >
              <X size={12} weight="bold" />
              <span>Cancel & New Video</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '6px',
          background: '#2e2e2e',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          marginBottom: '24px'
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${job.progress}%`,
            background: isFailed ? '#ef4444' : 'var(--spotify-green)',
            borderRadius: 'var(--radius-full)',
            transition: 'width 0.4s ease',
            boxShadow: isFailed ? '0 0 12px rgba(239, 68, 68, 0.4)' : '0 0 12px rgba(30, 215, 96, 0.6)'
          }}
        />
      </div>

      {/* 4 Pipeline Stages */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          marginBottom: '28px'
        }}
      >
        {stages.map((stg, i) => {
          const Icon = stg.icon;
          const isDone = !isFailed && activeIdx > i;
          const isCurrent = !isFailed && activeIdx === i;

          let bg = '#161616';
          let border = '1px solid var(--border-subtle)';
          let text = 'var(--text-subdued)';
          let iconColor = '#555555';

          if (isDone) {
            bg = 'rgba(30, 215, 96, 0.08)';
            border = '1px solid rgba(30, 215, 96, 0.3)';
            text = 'var(--spotify-green)';
            iconColor = 'var(--spotify-green)';
          } else if (isCurrent) {
            bg = '#242424';
            border = '1px solid #ffffff';
            text = '#ffffff';
            iconColor = '#ffffff';
          } else if (isFailed && i === 0) {
            bg = 'rgba(239, 68, 68, 0.08)';
            border = '1px solid rgba(239, 68, 68, 0.3)';
            text = '#f87171';
            iconColor = '#f87171';
          }

          return (
            <div
              key={stg.key}
              style={{
                background: bg,
                border: border,
                borderRadius: 'var(--radius-md)',
                padding: '10px 8px',
                textAlign: 'center',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={18} weight={isDone || isCurrent ? 'bold' : 'regular'} color={iconColor} style={{ margin: '0 auto 4px' }} />
              <div style={{ fontSize: '11px', fontWeight: 700, color: text }}>
                {stg.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Prompt & Review Panel */}
      {isAwaitingClips && (
        <AiPromptReview
          job={job}
          backendUrl={backendUrl}
          onSubmitClips={onSubmitClips}
          onSkipToHeuristic={onSkipToHeuristic}
          onStartNew={onStartNew}
        />
      )}

      {/* Failure Info & Recovery Box */}
      {isFailed && (
        <div
          style={{
            background: '#1d1214',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '18px 20px',
            marginBottom: '24px'
          }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <WarningCircle size={20} color="#f87171" weight="fill" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fca5a5', marginBottom: '4px' }}>
                Error Details
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-subdued)',
                  fontFamily: 'var(--font-mono)',
                  wordBreak: 'break-word',
                  lineHeight: 1.5
                }}
              >
                {cleanMessage || 'An unexpected issue stopped processing.'}
              </div>
              <p style={{ fontSize: '12px', color: '#999999', marginTop: '10px', lineHeight: 1.4 }}>
                If YouTube throttled or dropped the stream, try choosing <strong>720p</strong> or <strong>480p</strong> for faster, uninterrupted downloads, or upload your video file directly.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '18px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {onStartNew && (
              <button
                type="button"
                className="btn-spotify-secondary"
                onClick={onStartNew}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Choose Different Video
              </button>
            )}
            {onRetry && (
              <button
                type="button"
                className="btn-spotify-primary"
                onClick={onRetry}
                style={{ padding: '8px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowCounterClockwise size={16} weight="bold" />
                <span>Adjust Settings & Retry</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Progressive Live Completed Shorts (Available as soon as each clip finishes!) */}
      {job.clips && job.clips.length > 0 && (job.status === 'rendering' || isCompleted) && (
        <div
          style={{
            marginTop: '28px',
            marginBottom: '28px',
            background: '#131313',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '20px'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FilmSlate size={20} color="var(--spotify-green)" weight="fill" />
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Live Completed Shorts ({job.clips.filter((c) => c.rendered_url).length}/{job.clips.length} Ready)
              </h3>
            </div>

            {job.status === 'rendering' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  color: 'var(--spotify-green)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700
                }}
              >
                <CircleNotch size={14} className="spin" />
                <span>Rendering clip #{job.clips.filter((c) => c.rendered_url).length + 1}...</span>
              </div>
            )}
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-subdued)', marginBottom: '16px' }}>
            Watch or download ready shorts immediately while remaining clips continue rendering in the background.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '16px'
            }}
          >
            {job.clips.map((clip, idx) => {
              const renderedCount = job.clips.filter((c) => c.rendered_url).length;
              const isRendered = Boolean(clip.rendered_url);
              const isCurrentlyRendering = !isRendered && idx === renderedCount && job.status === 'rendering';
              const videoSrc = isRendered ? `${backendUrl}${clip.rendered_url}` : null;

              if (isRendered) {
                return (
                  <div
                    key={clip.id || idx}
                    style={{
                      background: '#181818',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '9/16',
                        maxHeight: '340px',
                        background: '#000000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <video
                        src={videoSrc}
                        controls
                        playsInline
                        preload="metadata"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          background: 'rgba(0, 0, 0, 0.8)',
                          color: 'var(--spotify-green)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '10px',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Fire size={12} weight="fill" />
                        <span>{clip.hook_score || 88}/100</span>
                      </div>
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '10px',
                          left: '10px',
                          background: 'rgba(30, 215, 96, 0.2)',
                          border: '1px solid var(--spotify-green)',
                          color: 'var(--spotify-green)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '9px',
                          fontWeight: 800
                        }}
                      >
                        READY
                      </div>
                    </div>

                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', marginBottom: '6px', lineHeight: 1.3 }}>
                        {clip.suggested_headline || clip.title || `Short #${idx + 1}`}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-subdued)', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Short #{idx + 1}</span>
                        <span>{Math.round(clip.duration || 30)}s</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
                        <button
                          type="button"
                          onClick={() => handleDownloadClip(clip, idx)}
                          disabled={downloadingClipId === (clip.id || idx)}
                          className="btn-spotify-primary"
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            fontSize: '11px',
                            justifyContent: 'center',
                            cursor: downloadingClipId === (clip.id || idx) ? 'wait' : 'pointer',
                            opacity: downloadingClipId === (clip.id || idx) ? 0.75 : 1
                          }}
                          title="Download MP4 video directly"
                        >
                          <DownloadSimple size={14} weight="bold" />
                          <span>{downloadingClipId === (clip.id || idx) ? 'Saving...' : 'Download Short'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const clipFile = clip.rendered_url ? clip.rendered_url.split('/').pop().split('?')[0] : `${clip.id}.mp4`;
                            openLocalClipsFolder(backendUrl, clipFile);
                          }}
                          className="btn-spotify-secondary"
                          style={{ padding: '8px 10px' }}
                          title="Locate & show this video file in Windows File Explorer"
                        >
                          <FolderOpen size={14} weight="bold" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              if (isCurrentlyRendering) {
                return (
                  <div
                    key={clip.id || idx}
                    style={{
                      background: '#161616',
                      border: '1px solid var(--spotify-green)',
                      borderRadius: 'var(--radius-md)',
                      padding: '20px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      minHeight: '260px',
                      boxShadow: '0 0 20px rgba(30, 215, 96, 0.2)'
                    }}
                  >
                    <CircleNotch size={32} color="var(--spotify-green)" className="spin" style={{ marginBottom: '12px' }} />
                    <span
                      style={{
                        background: 'rgba(30, 215, 96, 0.15)',
                        color: 'var(--spotify-green)',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '10px',
                        fontWeight: 800,
                        marginBottom: '8px'
                      }}
                    >
                      RENDERING CLIP #{idx + 1}
                    </span>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                      {clip.suggested_headline || clip.title || `Short #${idx + 1}`}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-subdued)' }}>
                      Burning ASS subtitles & framing 9:16...
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={clip.id || idx}
                  style={{
                    background: '#111111',
                    border: '1px dashed #282828',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    minHeight: '200px',
                    opacity: 0.6
                  }}
                >
                  <span style={{ fontSize: '10px', color: 'var(--text-subdued)', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                    QUEUED (#{idx + 1})
                  </span>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#b3b3b3' }}>
                    {clip.suggested_headline || clip.title || `Short #${idx + 1}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completion CTA */}
      {isCompleted && (
        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            className="btn-spotify-primary"
            onClick={onViewClips}
            style={{ width: '100%', maxWidth: '380px' }}
          >
            <span>View Viral Shorts ({job.clips?.length || 0} Clips)</span>
            <ArrowRight size={18} weight="bold" />
          </button>
        </div>
      )}
    </div>
  );
}
