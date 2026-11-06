import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkle,
  Copy,
  Check,
  ArrowSquareOut,
  FilmSlate,
  Lightning,
  Clock,
  Fire,
  Tag,
  WarningCircle,
  Plus,
  Minus,
  Trash,
  CaretDown,
  CaretUp,
  Code,
  X
} from '@phosphor-icons/react';

import { copyToClipboard } from '../utils/clipboard';

export default function AiPromptReview({
  job,
  backendUrl,
  onSubmitClips,
  onSkipToHeuristic,
  onStartNew
}) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedType, setCopiedType] = useState(null);
  const [rawJsonInput, setRawJsonInput] = useState('');
  const [parsedClips, setParsedClips] = useState([]);
  const [parseError, setParseError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  const [promptSelectStatus, setPromptSelectStatus] = useState(false);
  const promptTextareaRef = useRef(null);

  const promptText = job?.prompt_text || '';

  const handleSelectAllPrompt = () => {
    if (promptTextareaRef.current) {
      promptTextareaRef.current.focus();
      promptTextareaRef.current.select();
      promptTextareaRef.current.setSelectionRange(0, promptTextareaRef.current.value.length);
      setPromptSelectStatus(true);
      setTimeout(() => setPromptSelectStatus(false), 2000);
    }
  };

  const handleCopyPrompt = async () => {
    if (!promptText) return;
    const copied = await copyToClipboard(promptText);
    if (copied) {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    } else {
      setShowPromptDetails(true);
      setCopiedPrompt(false);
    }
  };

  const handleCopyText = async (clipId, type, text) => {
    const copied = await copyToClipboard(text || '');
    if (copied) {
      setCopiedType(`${clipId}_${type}`);
      setTimeout(() => setCopiedType(null), 2000);
    }
  };

  // Helper to parse timestamps flexibly
  const parseTimeSec = (val) => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    const str = String(val).trim().replace(',', '.');
    const num = parseFloat(str);
    if (!isNaN(num) && !str.includes(':')) return num;
    const parts = str.split(':');
    if (parts.length === 3) {
      return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
    } else if (parts.length === 2) {
      return parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
    }
    return 0;
  };

  // Live client-side parse of JSON pasted by user
  const handleJsonChange = (text) => {
    setRawJsonInput(text);
    setParseError('');

    if (!text.trim()) {
      setParsedClips([]);
      return;
    }

    try {
      let cleaned = text.trim();
      // Remove markdown code block if present
      const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        cleaned = jsonMatch[1].trim();
      } else {
        const start = cleaned.indexOf('[');
        const end = cleaned.lastIndexOf(']');
        if (start !== -1 && end !== -1 && end > start) {
          cleaned = cleaned.substring(start, end + 1);
        }
      }

      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) {
        setParseError('Response must be a JSON array of clips [ { ... } ]');
        return;
      }

      const normalized = parsed.map((item, idx) => {
        const start = parseTimeSec(item.start_time);
        let end = parseTimeSec(item.end_time);
        if (end <= start && item.duration) {
          end = start + parseTimeSec(item.duration);
        }
        const dur = Math.max(1, Math.round((end - start) * 10) / 10);
        let tags = item.hashtags || [];
        if (typeof tags === 'string') {
          tags = tags.split(/\s+/).filter(Boolean);
        }
        tags = tags.map((t) => (t.startsWith('#') ? t : `#${t}`));

        const headline = item.hook || item.suggested_headline || item.title || `Viral Moment #${idx + 1}`;
        const rawScore = item.hook_score || item.virality_score || item.score || item.viral_score || 88;
        const parsedScore = Math.min(99, Math.max(50, parseInt(rawScore, 10) || 88));
        const hookReason = item.hook_reason || item.reason || item.virality_reason || '';

        return {
          id: item.id || `custom_clip_${idx + 1}`,
          title: headline,
          suggested_headline: headline,
          hook: item.hook || headline,
          start_time: Math.round(start * 10) / 10,
          end_time: Math.round(end * 10) / 10,
          duration: dur,
          hook_score: parsedScore,
          hook_reason: hookReason,
          description: item.description || '',
          hashtags: tags
        };
      });

      // Sort clips in descending order of virality score so the highest retention shorts appear first
      normalized.sort((a, b) => (b.hook_score || 0) - (a.hook_score || 0));

      if (normalized.length === 0) {
        setParseError('No clips found in JSON.');
      } else {
        setParsedClips(normalized);
      }
    } catch (err) {
      setParseError('Validating JSON... Please ensure you paste the full array from ChatGPT/Gemini.');
    }
  };

  // Nudge clip start or end time by +/- 1 second
  const handleNudgeTime = (index, field, delta) => {
    setParsedClips((prev) => {
      const copy = [...prev];
      const clip = { ...copy[index] };
      if (field === 'start') {
        const newStart = Math.max(0, Math.round((clip.start_time + delta) * 10) / 10);
        if (newStart < clip.end_time) {
          clip.start_time = newStart;
          clip.duration = Math.round((clip.end_time - clip.start_time) * 10) / 10;
        }
      } else if (field === 'end') {
        const maxDur = job?.duration || 9999;
        const newEnd = Math.min(maxDur, Math.round((clip.end_time + delta) * 10) / 10);
        if (newEnd > clip.start_time) {
          clip.end_time = newEnd;
          clip.duration = Math.round((clip.end_time - clip.start_time) * 10) / 10;
        }
      }
      copy[index] = clip;
      return copy;
    });
  };

  const handleRemoveClip = (index) => {
    setParsedClips((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (parsedClips.length === 0) {
      setParseError('Please paste valid JSON from ChatGPT/Gemini to render clips.');
      return;
    }
    setIsSubmitting(true);
    setParseError('');
    try {
      await onSubmitClips(parsedClips);
    } catch (err) {
      setParseError(err.message || 'Failed to submit clips to rendering engine.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        background: '#181818',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(30, 215, 96, 0.35)',
        padding: '24px',
        marginTop: '20px',
        boxShadow: 'var(--shadow-heavy)'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkle size={22} weight="fill" color="var(--spotify-green)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
              AI Viral Hook Selection
            </h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-subdued)', marginTop: '4px' }}>
            Copy the pre-built prompt into ChatGPT or Gemini, then paste the AI JSON response below.
          </p>
        </div>

        {/* Quick AI Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <a
            href="https://chatgpt.com"
            target="_blank"
            rel="noreferrer"
            className="btn-spotify-secondary"
            style={{ fontSize: '12px', padding: '6px 12px', textDecoration: 'none' }}
          >
            <span>Open ChatGPT</span>
            <ArrowSquareOut size={13} />
          </a>
          <a
            href="https://gemini.google.com"
            target="_blank"
            rel="noreferrer"
            className="btn-spotify-secondary"
            style={{ fontSize: '12px', padding: '6px 12px', textDecoration: 'none' }}
          >
            <span>Open Gemini</span>
            <ArrowSquareOut size={13} />
          </a>
          <a
            href="https://claude.ai"
            target="_blank"
            rel="noreferrer"
            className="btn-spotify-secondary"
            style={{ fontSize: '12px', padding: '6px 12px', textDecoration: 'none' }}
          >
            <span>Open Claude</span>
            <ArrowSquareOut size={13} />
          </a>

          {onStartNew && (
            <button
              type="button"
              onClick={onStartNew}
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-full)',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              title="Discard current job and start with a fresh video"
            >
              <X size={13} weight="bold" />
              <span>Cancel & Ingest New Video</span>
            </button>
          )}
        </div>
      </div>

      {/* Step 1: Copy Prompt Box */}
      <div
        style={{
          background: '#121212',
          border: '1px solid #282828',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'var(--spotify-green)',
                color: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 800
              }}
            >
              1
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
              Copy AI Prompt (With Formatted Transcript)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="btn-spotify-primary"
              style={{ fontSize: '12px', padding: '7px 16px', gap: '6px' }}
            >
              {copiedPrompt ? (
                <>
                  <Check size={15} weight="bold" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy size={15} weight="bold" />
                  <span>Copy Full Prompt</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowPromptDetails(!showPromptDetails)}
              style={{
                background: showPromptDetails ? 'rgba(29, 185, 84, 0.15)' : '#242424',
                color: showPromptDetails ? 'var(--spotify-green)' : '#ffffff',
                border: showPromptDetails ? '1px solid var(--spotify-green)' : '1px solid #444444',
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
              title="Drag-down / View full prompt text"
            >
              {showPromptDetails ? <CaretUp size={14} weight="bold" /> : <CaretDown size={14} weight="bold" />}
              <span>{showPromptDetails ? 'Hide Prompt ▲' : 'Drag-Down / View Prompt ▼'}</span>
            </button>
          </div>
        </div>

        {/* Drag-Down Prompt Accordion Viewer */}
        {showPromptDetails && (
          <div
            style={{
              marginTop: '12px',
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
                  ai_hook_scoring_prompt.txt
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
                  Formatted Transcript Included
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleSelectAllPrompt}
                  style={{
                    background: promptSelectStatus ? 'var(--spotify-green)' : '#262626',
                    color: promptSelectStatus ? '#000000' : '#ffffff',
                    border: '1px solid #3a3a3a',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  title="Select all prompt text"
                >
                  {promptSelectStatus ? 'Selected!' : 'Select All'}
                </button>

                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  style={{
                    background: copiedPrompt ? 'var(--spotify-green)' : '#262626',
                    color: copiedPrompt ? '#000000' : '#ffffff',
                    border: copiedPrompt ? '1px solid var(--spotify-green)' : '1px solid #3a3a3a',
                    borderRadius: '4px',
                    padding: '4px 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Copy prompt to clipboard"
                >
                  {copiedPrompt ? <Check size={13} weight="bold" /> : <Copy size={13} weight="bold" />}
                  <span>{copiedPrompt ? 'Copied!' : 'Copy Prompt'}</span>
                </button>
              </div>
            </div>

            <textarea
              ref={promptTextareaRef}
              readOnly
              value={promptText}
              onClick={(e) => e.target.select()}
              rows={12}
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
                whiteSpace: 'pre-wrap',
                overflowY: 'auto'
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
                Paste into ChatGPT, Gemini or Claude to get the JSON clip response
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Paste AI Response */}
      <div
        style={{
          background: '#121212',
          border: '1px solid #282828',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'var(--spotify-green)',
              color: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 800
            }}
          >
            2
          </div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
            Paste AI JSON Response Here
          </span>
          {parsedClips.length > 0 && (
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
              ✓ {parsedClips.length} clips ready
            </span>
          )}
        </div>

        <textarea
          rows={5}
          placeholder='Paste the JSON response from ChatGPT or Gemini here (e.g. [{"start_time": "01:15", "end_time": "01:52", "hook_score": 96, "suggested_headline": "...", "description": "..."}])'
          value={rawJsonInput}
          onChange={(e) => handleJsonChange(e.target.value)}
          style={{
            width: '100%',
            background: '#0a0a0a',
            border: parseError && !parsedClips.length ? '1px solid #f87171' : '1px solid #333333',
            color: '#ffffff',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            resize: 'vertical'
          }}
        />

        {parseError && parsedClips.length === 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#f87171',
              fontSize: '11px',
              marginTop: '6px'
            }}
          >
            <WarningCircle size={14} weight="bold" />
            <span>{parseError}</span>
          </div>
        )}
      </div>

      {/* Parsed Clips Preview Cards & Nudge Controls */}
      {parsedClips.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            Review & Fine-Tune Selected Clips ({parsedClips.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {parsedClips.map((clip, idx) => (
              <div
                key={clip.id || idx}
                style={{
                  background: '#1c1c1c',
                  border: '1px solid #2e2e2e',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  gap: '14px',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
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
                      Clip #{idx + 1}
                    </span>

                    {/* Virality Score Badge */}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: (clip.hook_score || 88) >= 90 ? 'rgba(255, 75, 43, 0.2)' : 'rgba(255, 170, 0, 0.18)',
                        border: (clip.hook_score || 88) >= 90 ? '1px solid rgba(255, 75, 43, 0.5)' : '1px solid rgba(255, 170, 0, 0.4)',
                        color: (clip.hook_score || 88) >= 90 ? '#ff5252' : '#ffb703',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '11px',
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)'
                      }}
                      title={`Virality Score: ${clip.hook_score || 88}/100`}
                    >
                      <Fire size={13} weight="fill" />
                      <span>{clip.hook_score || 88}% Virality</span>
                    </span>

                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                      {clip.title || clip.suggested_headline}
                    </span>
                  </div>

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
                      <p style={{ fontSize: '12px', color: '#b3b3b3', lineHeight: '1.45', marginBottom: '8px' }}>
                        {combinedDesc}
                      </p>
                    );
                  })()}

                  {/* Hashtags */}
                  {clip.hashtags && clip.hashtags.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      {clip.hashtags.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          style={{
                            background: '#282828',
                            color: 'var(--text-subdued)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
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
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginTop: '10px' }}>
                        {/* Copy Title */}
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(
                              clip.id,
                              'title',
                              clip.title || clip.suggested_headline || ''
                            )
                          }
                          style={{
                            background:
                              copiedType === `${clip.id}_title`
                                ? 'rgba(30, 215, 96, 0.2)'
                                : '#282828',
                            color:
                              copiedType === `${clip.id}_title`
                                ? 'var(--spotify-green)'
                                : '#ffffff',
                            border:
                              copiedType === `${clip.id}_title`
                                ? '1px solid var(--spotify-green)'
                                : '1px solid #3a3a3a',
                            borderRadius: 'var(--radius-full)',
                            padding: '5px 2px',
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                            transition: 'all 0.15s ease'
                          }}
                          title="Copy Title"
                        >
                          {copiedType === `${clip.id}_title` ? (
                            <>
                              <Check size={11} weight="bold" />
                              <span>Copied!</span>
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
                          style={{
                            background:
                              copiedType === `${clip.id}_headline`
                                ? 'rgba(30, 215, 96, 0.2)'
                                : '#282828',
                            color:
                              copiedType === `${clip.id}_headline`
                                ? 'var(--spotify-green)'
                                : '#ffffff',
                            border:
                              copiedType === `${clip.id}_headline`
                                ? '1px solid var(--spotify-green)'
                                : '1px solid #3a3a3a',
                            borderRadius: 'var(--radius-full)',
                            padding: '5px 2px',
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                            transition: 'all 0.15s ease'
                          }}
                          title="Copy Suggested Headline"
                        >
                          {copiedType === `${clip.id}_headline` ? (
                            <>
                              <Check size={11} weight="bold" />
                              <span>Copied!</span>
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
                          style={{
                            background:
                              copiedType === `${clip.id}_desc`
                                ? 'rgba(30, 215, 96, 0.2)'
                                : '#282828',
                            color:
                              copiedType === `${clip.id}_desc`
                                ? 'var(--spotify-green)'
                                : '#ffffff',
                            border:
                              copiedType === `${clip.id}_desc`
                                ? '1px solid var(--spotify-green)'
                                : '1px solid #3a3a3a',
                            borderRadius: 'var(--radius-full)',
                            padding: '5px 2px',
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                            transition: 'all 0.15s ease'
                          }}
                          title="Copy Description"
                        >
                          {copiedType === `${clip.id}_desc` ? (
                            <>
                              <Check size={11} weight="bold" />
                              <span>Copied!</span>
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
                          style={{
                            background:
                              copiedType === `${clip.id}_tags`
                                ? 'rgba(30, 215, 96, 0.2)'
                                : '#282828',
                            color:
                              copiedType === `${clip.id}_tags`
                                ? 'var(--spotify-green)'
                                : '#ffffff',
                            border:
                              copiedType === `${clip.id}_tags`
                                ? '1px solid var(--spotify-green)'
                                : '1px solid #3a3a3a',
                            borderRadius: 'var(--radius-full)',
                            padding: '5px 2px',
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                            transition: 'all 0.15s ease'
                          }}
                          title="Copy Tags"
                        >
                          {copiedType === `${clip.id}_tags` ? (
                            <>
                              <Check size={11} weight="bold" />
                              <span>Copied!</span>
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

                {/* Timing & Nudge Column */}
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* Hook Score Pill */}
                  <div
                    style={{
                      background: 'rgba(30, 215, 96, 0.1)',
                      color: 'var(--spotify-green)',
                      border: '1px solid rgba(30, 215, 96, 0.3)',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '11px',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      alignSelf: 'flex-end'
                    }}
                  >
                    <Fire size={12} weight="fill" />
                    <span>{clip.hook_score}/100 VIRAL</span>
                  </div>

                  {/* Duration */}
                  <div style={{ fontSize: '11px', color: 'var(--text-subdued)', fontFamily: 'var(--font-mono)' }}>
                    {clip.duration}s ({clip.start_time}s → {clip.end_time}s)
                  </div>

                  {/* Start Time Nudge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-subdued)' }}>Start:</span>
                    <button
                      type="button"
                      onClick={() => handleNudgeTime(idx, 'start', -1)}
                      style={{
                        background: '#282828',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '2px 5px',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}
                      title="Start 1s earlier"
                    >
                      -1s
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudgeTime(idx, 'start', 1)}
                      style={{
                        background: '#282828',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '2px 5px',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}
                      title="Start 1s later"
                    >
                      +1s
                    </button>
                  </div>

                  {/* End Time Nudge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-subdued)' }}>End:</span>
                    <button
                      type="button"
                      onClick={() => handleNudgeTime(idx, 'end', -1)}
                      style={{
                        background: '#282828',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '2px 5px',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}
                      title="End 1s earlier"
                    >
                      -1s
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudgeTime(idx, 'end', 1)}
                      style={{
                        background: '#282828',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '2px 5px',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}
                      title="End 1s later"
                    >
                      +1s
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveClip(idx)}
                      style={{
                        background: 'transparent',
                        color: '#f87171',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        marginLeft: '4px'
                      }}
                      title="Delete Clip"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          borderTop: '1px solid #282828',
          paddingTop: '18px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onSkipToHeuristic}
            className="btn-spotify-secondary"
            style={{ fontSize: '12px', padding: '8px 14px' }}
          >
            <Lightning size={14} weight="bold" />
            <span>Or Use Auto Heuristic</span>
          </button>

          {onStartNew && (
            <button
              type="button"
              onClick={onStartNew}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--radius-full)',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              title="Discard current job and start with a fresh video"
            >
              <X size={13} weight="bold" />
              <span>Cancel & Ingest New Video</span>
            </button>
          )}
        </div>

        <button
          type="button"
          disabled={parsedClips.length === 0 || isSubmitting}
          onClick={handleSubmit}
          className="btn-spotify-primary"
          style={{
            fontSize: '13px',
            padding: '10px 24px',
            opacity: parsedClips.length === 0 ? 0.5 : 1,
            cursor: parsedClips.length === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          <FilmSlate size={16} weight="bold" />
          <span>{isSubmitting ? 'Submitting...' : `Render ${parsedClips.length} Viral Shorts 🚀`}</span>
        </button>
      </div>
    </div>
  );
}
