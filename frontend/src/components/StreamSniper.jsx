import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Broadcast,
  Fire,
  Lightning,
  Play,
  Stop,
  Gear,
  DownloadSimple,
  Sparkle,
  Cpu,
  VideoCamera,
  TextT,
  CheckCircle,
  WarningCircle,
  ArrowSquareOut,
  X,
  Clock,
  SpeakerHigh,
  CircleNotch,
  Copy,
  FileText,
  CloudArrowUp,
  ArrowsMerge,
  Check,
  FolderOpen,
  Trash,
  Key,
  Crop,
  Sliders,
  ArrowsClockwise,
  Lock
} from '@phosphor-icons/react';
import { downloadVideoFile, openLocalClipsFolder, sanitizeFilename } from '../utils/downloadHelper';
import { KAGGLE_WHISPER_CODE } from '../utils/kaggleCode';

export default function StreamSniper({ backendUrl = 'http://127.0.0.1:8001', onBackToStudio }) {
  const [mode, setMode] = useState('vod'); // default to 'vod' since user is working on VOD Scanner
  const [streamUrl, setStreamUrl] = useState('');
  const [style, setStyle] = useState('bounce');
  const [layout, setLayout] = useState('splitscreen'); // default to splitscreen viral format

  // Reframe & Split Screen Layout State
  const [showReframeModal, setShowReframeModal] = useState(false);
  const [reframeFrameUrl, setReframeFrameUrl] = useState(null);
  const [isFetchingFrame, setIsFetchingFrame] = useState(false);
  const [fetchTimer, setFetchTimer] = useState(0);
  const [frameTimestampSec, setFrameTimestampSec] = useState(2100); // 35m active stream gameplay
  const [activeCropBox, setActiveCropBox] = useState('facecam'); // 'facecam' | 'gameplay'
  const canvasRef = useRef(null);
  const dragInfo = useRef({ active: false, mode: 'move', boxKey: 'facecam', handle: null, startX: 0, startY: 0, startBox: null });
  const [reframeSettings, setReframeSettings] = useState({
    splitPct: 35, // 35% Top Facecam, 65% Bottom Gameplay
    facecamBox: { x: 0, y: 36, w: 23, h: 28 }, // Default to streamer facecam
    gameplayBox: { x: 21.9, y: 0, w: 56.25, h: 100 }, // Default to 1:1 square centered gameplay
    hookY: 35, // % from top of vertical short (between the two)
    capY: 90   // % from top of vertical short (over gameplay)
  });

  const ytThumbUrl = useMemo(() => {
    const m = streamUrl?.match(/(?:v=|\/live\/|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
    return m ? `https://img.youtube.com/vi/${m[1]}/maxresdefault.jpg` : null;
  }, [streamUrl]);
  const [enableFacecam, setEnableFacecam] = useState(true);
  const [snipeSeconds, setSnipeSeconds] = useState(45);

  // Live State
  const [liveActive, setLiveActive] = useState(false);
  const [liveStatus, setLiveStatus] = useState(null);
  const [isStartingLive, setIsStartingLive] = useState(false);
  const [isSniping, setIsSniping] = useState(false);
  const [snipeSuccessMessage, setSnipeSuccessMessage] = useState(null);
  const [activeSnipeJobs, setActiveSnipeJobs] = useState([]);

  // VOD Chunking & Scanner State
  const [chunkMinutes, setChunkMinutes] = useState(30);
  const [transcriberType, setTranscriberType] = useState(() => {
    try {
      return localStorage.getItem('sniper_transcriber_type') || 'parakeet';
    } catch (_) {
      return 'parakeet';
    }
  });
  const [kaggleUrl, setKaggleUrl] = useState(() => {
    try {
      return localStorage.getItem('sniper_kaggle_url') || '';
    } catch (_) {
      return '';
    }
  });
  const updateTranscriberType = (t) => {
    setTranscriberType(t);
    try { localStorage.setItem('sniper_transcriber_type', t); } catch (_) {}
  };
  const updateKaggleUrl = (url) => {
    setKaggleUrl(url);
    try { localStorage.setItem('sniper_kaggle_url', url); } catch (_) {}
  };
  const [aiMode, setAiMode] = useState(() => {
    try {
      return localStorage.getItem('sniper_ai_mode') || 'auto';
    } catch (_) {
      return 'auto';
    }
  });

  const updateAiMode = (mode) => {
    setAiMode(mode);
    try {
      localStorage.setItem('sniper_ai_mode', mode);
    } catch (_) { }
  };
  const [vodStatus, setVodStatus] = useState(null);
  const [isInitializingVod, setIsInitializingVod] = useState(false);
  const [selectedMergeChunks, setSelectedMergeChunks] = useState([]);

  // Modals
  const [promptModalData, setPromptModalData] = useState(null); // { title, label, prompt }
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [jsonPasteModalChunk, setJsonPasteModalChunk] = useState(null); // chunk_idx or 'merged'
  const [pastedJsonText, setPastedJsonText] = useState('');
  const [isSubmittingJson, setIsSubmittingJson] = useState(false);

  // Clips & Gallery
  const [clips, setClips] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [pendingRenderJobs, setPendingRenderJobs] = useState([]);

  // API Keys Management
  const [showKeysModal, setShowKeysModal] = useState(false);
  const [keysInfo, setKeysInfo] = useState({ groq: false, gemini: false, openai: false, openrouter: false });
  const [selectedKeyProvider, setSelectedKeyProvider] = useState('gemini'); // 'gemini' | 'groq' | 'openai' | 'openrouter'
  const [keyInputs, setKeyInputs] = useState({ gemini: '', groq: '', openai: '', openrouter: '' });
  const [showKeyVisible, setShowKeyVisible] = useState({ gemini: false, groq: false, openai: false, openrouter: false });
  const [testingProvider, setTestingProvider] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keySaveMessage, setKeySaveMessage] = useState(null);

  // Storage History Drawer (Persistent Stream Sessions)
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historySessions, setHistorySessions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyToast, setHistoryToast] = useState(null);

  // Workflow Choice & Alerts
  const [showStreamSetupModal, setShowStreamSetupModal] = useState(false);
  const [showWorkflowChoiceModal, setShowWorkflowChoiceModal] = useState(false);
  const [showNoKeyAlertModal, setShowNoKeyAlertModal] = useState(false);
  const [pendingTranscribeChunk, setPendingTranscribeChunk] = useState(null);
  const [copiedKaggleCode, setCopiedKaggleCode] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState('vod'); // 'vod' | 'live' | 'all'
  const [isDownloadingBulk, setIsDownloadingBulk] = useState(false);
  const [downloadingClipId, setDownloadingClipId] = useState(null);
  const [bulkProgress, setBulkProgress] = useState({
    active: false,
    title: '',
    subtitle: '',
    message: ''
  });

  const pollIntervalRef = useRef(null);
  const galleryRef = useRef(null);

  useEffect(() => {
    fetchKeys();
    fetchClips();
    fetchStorageHistory();
  }, []);

  const fetchStorageHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch(`${backendUrl}/api/sniper/vod/history`);
      const data = await res.json();
      if (data && data.sessions) {
        setHistorySessions(data.sessions);
      }
    } catch (e) {
      console.error('Failed to load storage history', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const resumeSession = async (sessionId) => {
    try {
      setHistoryLoading(true);
      const res = await fetch(`${backendUrl}/api/sniper/vod/history/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });
      if (res.ok) {
        const data = await res.json();
        setMode('vod');
        if (data.url) setStreamUrl(data.url);
        if (data.chunk_minutes) setChunkMinutes(data.chunk_minutes);
        setVodStatus(data);
        setShowHistoryModal(false);
        setHistoryToast(`🎉 Resumed "${(data.title || 'Stream').substring(0, 40)}..."! Chunks & audio ready.`);
        setTimeout(() => setHistoryToast(null), 5000);
      } else {
        const err = await res.json();
        alert('Could not resume session: ' + (err.detail || 'Unknown error'));
      }
    } catch (e) {
      alert('Failed to resume session: ' + e.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const deleteHistorySession = async (sessionId) => {
    if (!window.confirm('Delete this session from storage history?')) return;
    try {
      const res = await fetch(`${backendUrl}/api/sniper/vod/history/${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchStorageHistory();
      }
    } catch (e) {
      console.error('Failed to delete session', e);
    }
  };

  const handleDeleteClip = async (clipId) => {
    if (!window.confirm('Are you sure you want to delete this short?')) return;
    try {
      const res = await fetch(`${backendUrl}/api/sniper/clips/${clipId}`, { method: 'DELETE' });
      if (res.ok) {
        setClips(prev => prev.filter(c => c.id !== clipId));
        if (selectedVideo && selectedVideo.id === clipId) setSelectedVideo(null);
      } else {
        const err = await res.json().catch(() => ({}));
        alert('Could not delete clip: ' + (err.detail || 'Server error'));
      }
    } catch (e) {
      alert('Failed to delete clip: ' + e.message);
    }
  };

  const handleClearGallery = async () => {
    const label = galleryFilter === 'all' ? 'ALL shorts' : (galleryFilter === 'vod' ? 'all VOD shorts' : 'all Live snipes');
    if (!window.confirm(`Are you sure you want to delete ${label} from the gallery? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${backendUrl}/api/sniper/clips?filter=${galleryFilter}`, { method: 'DELETE' });
      if (res.ok) {
        if (galleryFilter === 'all') {
          setClips([]);
        } else if (galleryFilter === 'vod') {
          setClips(prev => prev.filter(c => c.id && !c.id.startsWith('vod_')));
        } else if (galleryFilter === 'live') {
          setClips(prev => prev.filter(c => c.id && !c.id.startsWith('sniper_')));
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert('Could not clear gallery: ' + (err.detail || 'Server error'));
      }
    } catch (e) {
      alert('Failed to clear gallery: ' + e.message);
    }
  };

  // Direct single clip download with native Save As location dialog
  const handleDownloadSingle = async (clip) => {
    if (!clip || !clip.video_url) return;
    const rawName = sanitizeFilename(clip.hook || clip.suggested_headline || clip.title || clip.id || 'stream_short');
    setDownloadingClipId(clip.id);
    try {
      const videoSrc = `${backendUrl}${clip.video_url}`;
      await downloadVideoFile(videoSrc, rawName, backendUrl);
    } catch (e) {
      console.error('Failed to download clip:', e);
    } finally {
      setDownloadingClipId(null);
    }
  };

  // Bulk download array of clips (prompts for Windows folder or packages ZIP)
  const handleBulkDownload = async (targets, label = 'Stream Shorts') => {
    if (!targets || targets.length === 0) {
      alert('No rendered shorts available to download in this selection.');
      return;
    }
    if (targets.length === 1) {
      return handleDownloadSingle(targets[0]);
    }

    try {
      setIsDownloadingBulk(true);

      // Method A: Check if showDirectoryPicker is supported -> user picks ONE folder for all clips!
      if (typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function') {
        let dirHandle = null;
        try {
          dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        } catch (pickerErr) {
          if (pickerErr.name === 'AbortError') {
            setIsDownloadingBulk(false);
            return;
          }
          console.warn('showDirectoryPicker failed, falling back to ZIP:', pickerErr);
        }

        if (dirHandle) {
          setBulkProgress({
            active: true,
            title: `Saving ${targets.length} ${label}...`,
            subtitle: `Writing individual MP4 files directly to your chosen folder...`,
            message: `Starting bulk save...`
          });

          for (let i = 0; i < targets.length; i++) {
            const clip = targets[i];
            const rawName = sanitizeFilename(clip.hook || clip.suggested_headline || clip.title || `short_${i + 1}`);
            setBulkProgress(prev => ({
              ...prev,
              subtitle: `Saving "${rawName}" (${i + 1}/${targets.length})...`,
              message: `Saving clip ${i + 1} of ${targets.length}`
            }));

            const videoSrc = `${backendUrl}${clip.video_url}`;
            const res = await fetch(videoSrc);
            if (res.ok) {
              const blob = await res.blob();
              const fileHandle = await dirHandle.getFileHandle(rawName, { create: true });
              const writable = await fileHandle.createWritable();
              await writable.write(blob);
              await writable.close();
            }
          }

          setBulkProgress({ active: false, title: '', subtitle: '', message: '' });
          alert(`✓ Successfully saved all ${targets.length} shorts to your selected folder!`);
          return;
        }
      }

      // Method B: Fallback to ZIP bundle (asks location for ZIP)
      setBulkProgress({
        active: true,
        title: `Packaging ${targets.length} ${label}`,
        subtitle: `Compressing shorts into a single ZIP archive...`,
        message: 'Packaging files...'
      });

      const clipIdsParam = targets
        .map(c => c.id || c.video_url?.split('/').pop()?.replace('.mp4', ''))
        .filter(Boolean)
        .join(',');
      const zipUrl = `${backendUrl}/api/download-clips-zip?clip_ids=${encodeURIComponent(clipIdsParam)}&title=${encodeURIComponent(label.replace(/\s+/g, '_'))}`;
      const zipName = `${label.replace(/[^a-zA-Z0-9_\-]/g, '_')}.zip`;

      await downloadVideoFile(zipUrl, zipName, backendUrl, (prog) => {
        if (prog.phase === 'prompting') {
          setBulkProgress(prev => ({
            ...prev,
            title: 'Choose Save Location',
            subtitle: 'Windows Save As dialog is open. Choose where to save your ZIP archive.',
            message: 'Waiting for folder selection in Windows...'
          }));
        } else if (prog.phase === 'writing') {
          setBulkProgress(prev => ({
            ...prev,
            title: 'Saving ZIP to Disk...',
            subtitle: 'Writing completed ZIP archive to your selected folder...',
            message: 'Saving file to disk...'
          }));
        }
      });
    } catch (e) {
      console.error('Bulk download error:', e);
      alert('Bulk download failed: ' + e.message);
    } finally {
      setIsDownloadingBulk(false);
      setBulkProgress({ active: false, title: '', subtitle: '', message: '' });
    }
  };

  const fetchKeys = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/sniper/keys`);
      const data = await res.json();
      setKeysInfo(data);
      const hasKey = Boolean(data.groq || data.gemini || data.openai || data.openrouter);
      const stored = localStorage.getItem('sniper_ai_mode');
      if (hasKey && (!stored || stored === 'auto')) {
        updateAiMode('auto');
      }
    } catch (e) {
      console.error('Failed to load keys', e);
    }
  };

  const handleTestKey = async (provider) => {
    const keyVal = keyInputs[provider]?.trim();
    if (!keyVal) {
      setTestResults(prev => ({ ...prev, [provider]: { ok: false, message: 'Please enter an API key first' } }));
      return;
    }
    setTestingProvider(provider);
    setTestResults(prev => ({ ...prev, [provider]: null }));
    try {
      const res = await fetch(`${backendUrl}/api/sniper/keys/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key: keyVal })
      });
      const data = await res.json();
      setTestResults(prev => ({
        ...prev,
        [provider]: {
          ok: res.ok && data.ok,
          message: data.message || (data.ok ? 'Key verified successfully!' : 'Verification failed')
        }
      }));
    } catch (e) {
      setTestResults(prev => ({ ...prev, [provider]: { ok: false, message: 'Connection error: ' + e.message } }));
    } finally {
      setTestingProvider(null);
    }
  };

  const handleSaveKeys = async (enableAuto = true) => {
    setIsSavingKey(true);
    try {
      const payload = {};
      if (keyInputs.gemini?.trim()) payload.gemini_key = keyInputs.gemini.trim();
      if (keyInputs.groq?.trim()) payload.groq_key = keyInputs.groq.trim();
      if (keyInputs.openai?.trim()) payload.openai_key = keyInputs.openai.trim();
      if (keyInputs.openrouter?.trim()) payload.openrouter_key = keyInputs.openrouter.trim();

      const res = await fetch(`${backendUrl}/api/sniper/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await fetchKeys();
        if (enableAuto) {
          updateAiMode('auto');
          setHistoryToast('🎉 API Key saved! 1-Click Automatic AI Mode is now active.');
        } else {
          setHistoryToast('✓ Keys updated.');
        }
        setTimeout(() => setHistoryToast(null), 4000);
        setShowKeysModal(false);
      } else {
        alert('Failed to save API keys.');
      }
    } catch (e) {
      alert('Error saving keys: ' + e.message);
    } finally {
      setIsSavingKey(false);
    }
  };

  const fetchClips = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/sniper/clips`);
      const data = await res.json();
      if (data && data.clips) {
        setClips(prevClips => {
          // If new clips arrived, reduce pending skeleton jobs proportionally
          const newCount = data.clips.length - prevClips.length;
          if (newCount > 0) {
            setPendingRenderJobs(prevPending => prevPending.slice(newCount));
            setSnipeSuccessMessage(`🎉 Clip finished rendering! Ready in gallery below.`);
            setTimeout(() => setSnipeSuccessMessage(null), 6000);
          }
          return data.clips;
        });
        setActiveSnipeJobs(prev => {
          return prev.filter(job => !data.clips.some(c => c.id === job.id));
        });
      }
    } catch (e) {
      console.error('Failed to load clips', e);
    }
  };

  // Reusable status fetcher
  const fetchStatus = async () => {
    if (mode === 'live') {
      try {
        const res = await fetch(`${backendUrl}/api/sniper/live/status`);
        const data = await res.json();
        setLiveStatus(data);
        setLiveActive(data.active);
      } catch (e) {}
    } else if (mode === 'vod') {
      try {
        const res = await fetch(`${backendUrl}/api/sniper/vod/status`);
        const data = await res.json();
        setVodStatus(data);
        if (data?.kaggle_url && !kaggleUrl) {
          updateKaggleUrl(data.kaggle_url);
        }
        if (data && (data.status !== 'processing' || (data.stage && (data.stage.startsWith('Complete') || data.stage.includes('rendered'))))) {
          setPendingRenderJobs([]);
        }
        // Sync locked framing parameters to state so subsequent chunks reuse the exact locked framing
        if (!showReframeModal && data?.reframe_locked && data.facecam_box && Array.isArray(data.facecam_box) && data.facecam_box.length === 4) {
          const [fx, fy, fw, fh] = data.facecam_box;
          const [gx, gy, gw, gh] = data.gameplay_box || [0, 0, 1920, 1080];
          setReframeSettings(prev => ({
            ...prev,
            splitPct: data.split_pct !== undefined ? data.split_pct : prev.splitPct,
            hookY: data.hook_y !== undefined ? Math.round((data.hook_y / 1920) * 100) : prev.hookY,
            capY: data.cap_y !== undefined ? Math.round((data.cap_y / 1920) * 100) : prev.capY,
            facecamBox: {
              x: Number(((fx / 1920) * 100).toFixed(2)),
              y: Number(((fy / 1080) * 100).toFixed(2)),
              w: Number(((fw / 1920) * 100).toFixed(2)),
              h: Number(((fh / 1080) * 100).toFixed(2))
            },
            gameplayBox: {
              x: Number(((gx / 1920) * 100).toFixed(2)),
              y: Number(((gy / 1080) * 100).toFixed(2)),
              w: Number(((gw / 1920) * 100).toFixed(2)),
              h: Number(((gh / 1080) * 100).toFixed(2))
            }
          }));
        }
      } catch (e) {}
    }
  };

  // Periodic status polling loop
  useEffect(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      fetchClips();
      fetchStatus();
    }, 2000);

    return () => clearInterval(pollIntervalRef.current);
  }, [mode, backendUrl]);

  // Live Timer for Stream Frame Extraction
  useEffect(() => {
    let interval = null;
    if (isFetchingFrame) {
      setFetchTimer(0);
      interval = setInterval(() => {
        setFetchTimer(prev => prev + 1);
      }, 1000);
    } else {
      setFetchTimer(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isFetchingFrame]);

  // Start Live Session
  const handleStartLive = async () => {
    if (!streamUrl.trim()) return;
    setIsStartingLive(true);
    try {
      const res = await fetch(`${backendUrl}/api/sniper/live/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: streamUrl.trim(),
          style,
          layout,
          enable_facecam: enableFacecam
        })
      });
      if (res.ok) {
        setLiveActive(true);
      }
    } catch (e) {
      alert('Failed to start live stream session: ' + e.message);
    } finally {
      setIsStartingLive(false);
    }
  };

  const handleStopLive = async () => {
    try {
      await fetch(`${backendUrl}/api/sniper/live/stop`, { method: 'POST' });
      setLiveActive(false);
    } catch (e) {
      console.error(e);
    }
  };

  // Instant Snipe Button
  const handleClipNow = async () => {
    setIsSniping(true);
    setSnipeSuccessMessage(null);
    try {
      const res = await fetch(`${backendUrl}/api/sniper/live/clip-now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seconds: snipeSeconds })
      });
      const data = await res.json();
      if (res.ok && data.clip) {
        const newJob = {
          id: data.clip.id,
          seconds: snipeSeconds,
          startedAt: Date.now()
        };
        setActiveSnipeJobs(prev => [newJob, ...prev]);
        setSnipeSuccessMessage(`Sniped last ${snipeSeconds}s! Rendering 9:16 short with TrueType ASS bouncy captions...`);
        fetchClips();
      } else {
        alert(data.detail || 'Could not snipe buffer.');
      }
    } catch (e) {
      alert('Snipe error: ' + e.message);
    } finally {
      setIsSniping(false);
    }
  };

  // VOD: Analyze Stream & Divide into Chunks (Step 1: Open Extraction Dialog -> Then Reframe Modal)
  const handleFetchFrame = async (targetTs = frameTimestampSec) => {
    if (!streamUrl.trim()) return;
    setIsFetchingFrame(true);
    try {
      const res = await fetch(`${backendUrl}/api/sniper/vod/preview-frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: streamUrl.trim(), timestamp_sec: targetTs })
      });
      const data = await res.json();
      if (data.ok && data.frame_url) {
        setReframeFrameUrl(`${backendUrl}${data.frame_url}?t=${Date.now()}`);
        if (data.timestamp_sec) setFrameTimestampSec(data.timestamp_sec);
        if (data.detected_facecam && data.detected_facecam.w > 5 && data.detected_facecam.h > 5) {
          setReframeSettings(prev => ({
            ...prev,
            facecamBox: data.detected_facecam
          }));
        }
        setShowReframeModal(true);
      } else {
        alert(data.detail || 'Could not extract stream frame. Opening reframe editor.');
        setShowReframeModal(true);
      }
    } catch (err) {
      alert('Frame extraction failed: ' + err.message);
      setShowReframeModal(true);
    } finally {
      setIsFetchingFrame(false);
    }
  };

  const handleInitVODClick = () => {
    if (!streamUrl.trim()) return;
    if (reframeFrameUrl) {
      setShowReframeModal(true);
    } else {
      handleFetchFrame(frameTimestampSec || 600);
    }
  };

  const handleCancelChunk = async (chunkIdx) => {
    // Instant optimistic UI reset
    setVodStatus(prev => {
      if (!prev || !prev.chunks) return prev;
      return {
        ...prev,
        chunks: prev.chunks.map(c => c.index === chunkIdx ? {
          ...c,
          status: 'ready',
          words: [],
          prompt: null,
          error: null,
          clips_count: 0
        } : c)
      };
    });
    try {
      await fetch(`${backendUrl}/api/sniper/vod/cancel-chunk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chunk_idx: chunkIdx })
      });
      fetchStatus();
    } catch (err) {
      console.error('Cancel chunk error:', err);
    }
  };

  const handleResetStream = async () => {
    try {
      await fetch(`${backendUrl}/api/sniper/vod/reset`, { method: 'POST' });
    } catch (_) { }
    setVodStatus(null);
    setStreamUrl('');
    setReframeFrameUrl(null);
    setReframeSettings({
      splitPct: 35,
      hookY: 35,
      capY: 90,
      facecamBox: { x: 0, y: 36, w: 23, h: 28 },
      gameplayBox: { x: 21.9, y: 0, w: 56.25, h: 100 }
    });
    setHistoryToast('Stream session cleared. Ready for a new stream URL!');
    setTimeout(() => setHistoryToast(null), 3000);
  };

  // Interactive Mouse Drag & Resize for Crop Boxes
  const handleBoxMouseDown = (e, boxKey, handle = null) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveCropBox(boxKey);
    const box = boxKey === 'facecam' ? reframeSettings.facecamBox : reframeSettings.gameplayBox;
    dragInfo.current = {
      active: true,
      mode: handle ? 'resize' : 'move',
      boxKey,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startBox: { ...box }
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragInfo.current.active || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const dx = ((e.clientX - dragInfo.current.startX) / rect.width) * 100;
      const dy = ((e.clientY - dragInfo.current.startY) / rect.height) * 100;
      const { mode, boxKey, handle, startBox } = dragInfo.current;

      setReframeSettings(prev => {
        let b = { ...(boxKey === 'facecam' ? prev.facecamBox : prev.gameplayBox) };

        if (mode === 'move') {
          b.x = Math.max(0, Math.min(100 - startBox.w, startBox.x + dx));
          b.y = Math.max(0, Math.min(100 - startBox.h, startBox.y + dy));
        } else if (mode === 'resize') {
          if (handle.includes('e')) {
            b.w = Math.max(8, Math.min(100 - startBox.x, startBox.w + dx));
          }
          if (handle.includes('s')) {
            b.h = Math.max(8, Math.min(100 - startBox.y, startBox.h + dy));
          }
          if (handle.includes('w')) {
            const newX = Math.max(0, Math.min(startBox.x + startBox.w - 8, startBox.x + dx));
            b.w = startBox.w + (startBox.x - newX);
            b.x = newX;
          }
          if (handle.includes('n')) {
            const newY = Math.max(0, Math.min(startBox.y + startBox.h - 8, startBox.y + dy));
            b.h = startBox.h + (startBox.y - newY);
            b.y = newY;
          }
        }

        b.x = Math.round(b.x * 10) / 10;
        b.y = Math.round(b.y * 10) / 10;
        b.w = Math.round(b.w * 10) / 10;
        b.h = Math.round(b.h * 10) / 10;

        return {
          ...prev,
          [boxKey === 'facecam' ? 'facecamBox' : 'gameplayBox']: b
        };
      });
    };

    const handleMouseUp = () => {
      dragInfo.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleAutoDetectFacecam = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/sniper/vod/detect-facecam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stream_url: streamUrl.trim()
        })
      });
      const data = await res.json();
      if (data && data.box) {
        setReframeSettings(prev => ({
          ...prev,
          facecamBox: data.box
        }));
        setHistoryToast(data.found ? '✓ AI YuNet detected streamer facecam!' : 'AI preset applied.');
        setTimeout(() => setHistoryToast(null), 3000);
      }
    } catch (e) {
      alert('Facecam auto-detect failed: ' + e.message);
    }
  };

  const handleApplyReframe = async () => {
    setLayout('splitscreen');
    setShowReframeModal(false);

    // If stream is already initialized in vodStatus AND matches the current stream URL
    const isSameStream = vodStatus && vodStatus.chunks && vodStatus.chunks.length > 0 && vodStatus.url === streamUrl.trim();

    if (isSameStream) {
      try {
        await fetch(`${backendUrl}/api/sniper/vod/save-reframe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            layout: 'splitscreen',
            facecam_box: [
              Math.round((reframeSettings.facecamBox.x / 100) * 1920),
              Math.round((reframeSettings.facecamBox.y / 100) * 1080),
              Math.round((reframeSettings.facecamBox.w / 100) * 1920),
              Math.round((reframeSettings.facecamBox.h / 100) * 1080)
            ],
            gameplay_box: [
              Math.round((reframeSettings.gameplayBox.x / 100) * 1920),
              Math.round((reframeSettings.gameplayBox.y / 100) * 1080),
              Math.round((reframeSettings.gameplayBox.w / 100) * 1920),
              Math.round((reframeSettings.gameplayBox.h / 100) * 1080)
            ],
            hook_y: Math.round((reframeSettings.hookY / 100) * 1920),
            cap_y: Math.round((reframeSettings.capY / 100) * 1920),
            split_pct: reframeSettings.splitPct
          })
        });
        setHistoryToast('✓ Split Screen Reframe applied to stream!');
        setTimeout(() => setHistoryToast(null), 3500);
      } catch (_) { }
    } else {
      // New stream flow: always open Stream Setup Modal ("uske bad wala options")!
      setShowStreamSetupModal(true);
    }
  };

  const handleInitVOD = async () => {
    if (!streamUrl.trim()) return;
    setIsInitializingVod(true);
    setVodStatus(null); // Clear old stream chunks IMMEDIATELY from UI!
    try {
      const res = await fetch(`${backendUrl}/api/sniper/vod/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: streamUrl.trim(),
          chunk_minutes: chunkMinutes,
          style,
          layout: layout || 'splitscreen',
          enable_facecam: false,
          facecam_box: [
            Math.round((reframeSettings.facecamBox.x / 100) * 1920),
            Math.round((reframeSettings.facecamBox.y / 100) * 1080),
            Math.round((reframeSettings.facecamBox.w / 100) * 1920),
            Math.round((reframeSettings.facecamBox.h / 100) * 1080)
          ],
          gameplay_box: [
            Math.round((reframeSettings.gameplayBox.x / 100) * 1920),
            Math.round((reframeSettings.gameplayBox.y / 100) * 1080),
            Math.round((reframeSettings.gameplayBox.w / 100) * 1920),
            Math.round((reframeSettings.gameplayBox.h / 100) * 1080)
          ],
          hook_y: Math.round((reframeSettings.hookY / 100) * 1920),
          cap_y: Math.round((reframeSettings.capY / 100) * 1920),
          split_pct: reframeSettings.splitPct
        })
      });
      const data = await res.json();
      if (res.ok) {
        setVodStatus(data);
        fetchStatus();
      } else {
        alert(data.detail || 'Failed to initialize stream chunks.');
      }
    } catch (e) {
      alert('Error analyzing stream: ' + e.message);
    } finally {
      setIsInitializingVod(false);
    }
  };

  // VOD: Transcribe Click Dispatcher
  const handleTranscribeClick = (chunkIdx) => {
    if (aiMode === 'auto') {
      const hasKey = Boolean(keysInfo.groq || keysInfo.gemini || keysInfo.openai || keysInfo.openrouter);
      if (!hasKey) {
        setPendingTranscribeChunk(chunkIdx);
        setShowKeysModal(true);
        return;
      }
    }
    handleProcessChunk(chunkIdx);
  };

  // VOD: Process Single Chunk
  const handleProcessChunk = async (chunkIdx) => {
    try {
      const res = await fetch(`${backendUrl}/api/sniper/vod/process-chunk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chunk_idx: chunkIdx,
          transcriber: transcriberType,
          kaggle_url: kaggleUrl.trim() || null,
          ai_mode: aiMode,
          layout: layout || 'splitscreen',
          facecam_box: [
            Math.round((reframeSettings.facecamBox.x / 100) * 1920),
            Math.round((reframeSettings.facecamBox.y / 100) * 1080),
            Math.round((reframeSettings.facecamBox.w / 100) * 1920),
            Math.round((reframeSettings.facecamBox.h / 100) * 1080)
          ],
          gameplay_box: [
            Math.round((reframeSettings.gameplayBox.x / 100) * 1920),
            Math.round((reframeSettings.gameplayBox.y / 100) * 1080),
            Math.round((reframeSettings.gameplayBox.w / 100) * 1920),
            Math.round((reframeSettings.gameplayBox.h / 100) * 1080)
          ],
          hook_y: Math.round((reframeSettings.hookY / 100) * 1920),
          cap_y: Math.round((reframeSettings.capY / 100) * 1920),
          split_pct: reframeSettings.splitPct
        })
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.detail || 'Failed to process chunk.');
      }
    } catch (e) {
      alert('Error processing chunk: ' + e.message);
    }
  };

  // Copy Kaggle / Google Colab Server Setup Script (Exact same code as Studio mode)
  const copyKaggleScript = async () => {
    let codeToCopy = KAGGLE_WHISPER_CODE;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${backendUrl}/api/kaggle-code`, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().length > 100) {
          codeToCopy = text;
        }
      }
    } catch (err) {
      console.warn('Backend fetch for kaggle-code failed, using bundled code:', err);
    }

    try {
      await navigator.clipboard.writeText(codeToCopy);
      setCopiedKaggleCode(true);
      setTimeout(() => setCopiedKaggleCode(false), 3000);
    } catch (_) {
      alert('Could not copy automatically. Please try again.');
    }
  };

  // VOD: View & Copy Prompt for a Chunk
  const handleOpenPrompt = async (chunkIdx) => {
    try {
      const res = await fetch(`${backendUrl}/api/sniper/vod/prompt/${chunkIdx}`);
      const data = await res.json();
      if (res.ok) {
        setPromptModalData({
          chunk_idx: chunkIdx,
          label: data.label,
          prompt: data.prompt
        });
        setCopiedPrompt(false);
      } else {
        alert(data.detail || 'Could not fetch prompt.');
      }
    } catch (e) {
      alert('Error fetching prompt: ' + e.message);
    }
  };

  // VOD: Merge Selected Chunks (e.g. 1 hour)
  const handleMergeSelectedChunks = async () => {
    if (selectedMergeChunks.length < 2) {
      alert('Select at least 2 chunks to merge.');
      return;
    }
    try {
      const res = await fetch(`${backendUrl}/api/sniper/vod/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indices: selectedMergeChunks })
      });
      const data = await res.json();
      if (res.ok) {
        setPromptModalData({
          chunk_idx: 'merged',
          label: data.label,
          prompt: data.prompt
        });
        setCopiedPrompt(false);
      } else {
        alert(data.detail || 'Failed to merge chunks.');
      }
    } catch (e) {
      alert('Merge error: ' + e.message);
    }
  };

  // VOD: Submit Pasted JSON to Render
  const handleSubmitPastedJSON = async () => {
    if (!pastedJsonText.trim()) return;
    setIsSubmittingJson(true);
    try {
      const isMerged = jsonPasteModalChunk === 'merged';
      const endpoint = isMerged ? `${backendUrl}/api/sniper/vod/submit-merged-json` : `${backendUrl}/api/sniper/vod/submit-json`;
      const payload = isMerged
        ? { json_data: pastedJsonText, style, layout }
        : { chunk_idx: jsonPasteModalChunk, json_data: pastedJsonText, style, layout };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setJsonPasteModalChunk(null);
        setPastedJsonText('');

        // Create immediate skeleton loading cards in the gallery
        const count = data.clips_count || 1;
        const skeletons = [];
        for (let i = 0; i < count; i++) {
          skeletons.push({
            id: `pending_${Date.now()}_${i + 1}`,
            index: i + 1,
            total: count,
            hook: `Rendering Short ${i + 1}/${count}...`,
            title: `Extracting 9:16 vertical short with bouncy ASS subtitles`,
            score: 95
          });
        }
        setPendingRenderJobs(skeletons);
        setSnipeSuccessMessage(`🎬 Queued ${count} clips! Skeletons created in gallery — each clip will unlock as soon as rendered!`);
        setTimeout(() => galleryRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        alert(data.detail || 'Failed to submit JSON.');
      }
    } catch (e) {
      alert('JSON Submission Error: ' + e.message);
    } finally {
      setIsSubmittingJson(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '10px 20px 80px', color: '#ffffff' }}>
      {/* Top Bar with Back Button */}
      {onBackToStudio && (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
          <button
            type="button"
            onClick={onBackToStudio}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#1a1a1a',
              border: '1px solid #333',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--spotify-green)';
              e.currentTarget.style.color = 'var(--spotify-green)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#333';
              e.currentTarget.style.color = '#ffffff';
            }}
          >
            <span>← Back to Studio</span>
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 68, 68, 0.15)', border: '1px solid rgba(255, 68, 68, 0.35)', padding: '6px 16px', borderRadius: '30px', marginBottom: '14px' }}>
          <Broadcast size={18} color="#ff4444" weight="fill" />
          <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.04em', color: '#ff6666', textTransform: 'uppercase' }}>
            Gaming & Live Stream Sniper Hub
          </span>
        </div>
        <h2 style={{ fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '8px' }}>
          GTA 6 & Live Stream <span style={{ color: '#ff4444' }}>Sniper</span>
        </h2>
        <p style={{ color: '#a0a0a0', fontSize: '0.95rem', maxWidth: '640px', margin: '0 auto' }}>
          Deep 30-min chunked VOD scanner with Google Colab / Kaggle Whisper Large-V3 and animated subtitles.
        </p>

        {/* Feature badges - ONLY Configure AI Keys and Storage History as requested */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '16px' }}>
          <button
            onClick={() => setShowKeysModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: (keysInfo.gemini || keysInfo.groq || keysInfo.openai || keysInfo.openrouter) ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 170, 0, 0.15)',
              border: (keysInfo.gemini || keysInfo.groq || keysInfo.openai || keysInfo.openrouter) ? '1px solid rgba(0, 230, 118, 0.4)' : '1px solid rgba(255, 170, 0, 0.4)',
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '12px',
              color: (keysInfo.gemini || keysInfo.groq || keysInfo.openai || keysInfo.openrouter) ? '#00e676' : '#ffbb33',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            <Key size={14} weight="bold" />
            <span>🔑 AI Keys ({(keysInfo.gemini || keysInfo.groq || keysInfo.openai || keysInfo.openrouter) ? 'Connected' : 'Off / Setup Key'})</span>
          </button>
          <button
            onClick={() => { setShowHistoryModal(true); fetchStorageHistory(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0, 240, 255, 0.15)', border: '1px solid rgba(0, 240, 255, 0.4)', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', color: '#00F0FF', cursor: 'pointer', fontWeight: 700 }}
          >
            <FolderOpen size={14} weight="bold" />
            <span>📁 Storage History ({historySessions.length})</span>
          </button>
        </div>

        {historyToast && (
          <div style={{ marginTop: '14px', background: 'rgba(0, 230, 118, 0.15)', border: '1px solid rgba(0, 230, 118, 0.4)', color: '#00e676', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, display: 'inline-block' }}>
            {historyToast}
          </div>
        )}
      </div>

      {/* Mode Selector Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
        <div style={{ background: '#181818', padding: '5px', borderRadius: '30px', border: '1px solid #2e2e2e', display: 'inline-flex', gap: '8px' }}>
          {/* Live Stream Buffer (Locked - Coming Soon) */}
          <button
            type="button"
            disabled={true}
            title="Live Stream Buffer is currently locked (Coming Soon)"
            style={{
              padding: '9px 20px',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.03)',
              color: '#777',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: 0.6,
              userSelect: 'none'
            }}
          >
            <Lock size={15} weight="fill" color="#777" />
            <span>Live Stream Buffer</span>
            <span
              style={{
                fontSize: '9.5px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#aaa',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Coming Soon
            </span>
          </button>

          {/* Deep VOD Scanner (Active) */}
          <button
            type="button"
            onClick={() => { setMode('vod'); setGalleryFilter('vod'); }}
            style={{
              padding: '9px 24px',
              borderRadius: '24px',
              border: 'none',
              background: '#ff4444',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(255, 68, 68, 0.35)',
              transition: 'all 0.2s'
            }}
          >
            <Lightning size={18} weight="fill" />
            <span>⚡ Deep VOD Scanner ({chunkMinutes}m Chunks)</span>
          </button>
        </div>
      </div>

      {/* Main Control Console */}
      <div style={{ background: '#141414', border: '1px solid #262626', borderRadius: '16px', padding: '28px', marginBottom: '32px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
        {/* Stream Link Input */}
        <div style={{ marginBottom: '22px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#bbb', marginBottom: '8px' }}>
            {mode === 'live' ? 'LIVE STREAM URL (YOUTUBE / TWITCH)' : 'COMPLETED STREAM / VOD URL (YOUTUBE / TWITCH)'}
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={streamUrl}
              onChange={(e) => {
                setStreamUrl(e.target.value);
                setReframeFrameUrl(null);
              }}
              placeholder="https://www.youtube.com/watch?v=... or https://www.youtube.com/live/..."
              style={{
                flex: 1,
                background: '#0d0d0d',
                border: '1px solid #333',
                borderRadius: '10px',
                padding: '14px 18px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            {mode === 'live' ? (
              liveActive ? (
                <button
                  onClick={handleStopLive}
                  style={{
                    background: '#222',
                    border: '1px solid #444',
                    color: '#ff6666',
                    padding: '0 26px',
                    borderRadius: '10px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Stop size={18} weight="fill" />
                  <span>Stop Buffer</span>
                </button>
              ) : (
                <button
                  onClick={handleStartLive}
                  disabled={isStartingLive || !streamUrl.trim()}
                  style={{
                    background: '#ff4444',
                    border: 'none',
                    color: '#fff',
                    padding: '0 28px',
                    borderRadius: '10px',
                    fontWeight: 800,
                    cursor: streamUrl.trim() ? 'pointer' : 'not-allowed',
                    opacity: streamUrl.trim() ? 1 : 0.6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Broadcast size={18} weight="bold" />
                  <span>{isStartingLive ? 'Connecting...' : 'Connect Stream'}</span>
                </button>
              )
            ) : (
              <button
                onClick={handleInitVODClick}
                disabled={isFetchingFrame || isInitializingVod || !streamUrl.trim()}
                style={{
                  background: 'linear-gradient(135deg, #ff4444, #ff2222)',
                  border: 'none',
                  color: '#fff',
                  padding: '0 28px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  cursor: streamUrl.trim() && !isFetchingFrame && !isInitializingVod ? 'pointer' : 'not-allowed',
                  opacity: streamUrl.trim() ? 1 : 0.6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(255,68,68,0.3)'
                }}
              >
                {isFetchingFrame || isInitializingVod ? <CircleNotch size={18} className="animate-spin" /> : <Sparkle size={18} weight="fill" />}
                <span>{isFetchingFrame ? 'Downloading Frame...' : isInitializingVod ? 'Analyzing Stream...' : (vodStatus && streamUrl.trim() !== vodStatus.url ? 'Analyze & Chunk New Stream' : 'Analyze & Chunk Stream')}</span>
              </button>
            )}
          </div>
        </div>

        {/* VOD Empty State / Prompt to Analyze */}
        {mode === 'vod' && (!vodStatus || !vodStatus.chunks || vodStatus.chunks.length === 0) && (
          <div style={{ marginTop: '20px', padding: '34px 20px', background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed #333', borderRadius: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '30px', marginBottom: '8px' }}>🎬</div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#eee', marginBottom: '6px' }}>Ready to Scan Stream</h3>
            <p style={{ color: '#888', fontSize: '13px', maxWidth: '520px', margin: '0 auto 16px', lineHeight: '1.5' }}>
              Paste a stream URL above and click <b style={{ color: '#ff4444' }}>Analyze & Chunk Stream</b> to choose your subtitles, chunking, and AI options. Or open <b style={{ color: '#00F0FF' }}>Storage History</b> to resume a saved session instantly!
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                onClick={() => setShowHistoryModal(true)}
                style={{ background: '#1c1c1c', border: '1px solid #333', color: '#00F0FF', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FolderOpen size={16} />
                <span>Open Storage History ({historySessions.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Live Active Display */}
        {mode === 'live' && liveActive && liveStatus && (
          <div style={{ marginTop: '24px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span style={{ background: '#ff4444', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 800, marginRight: '8px' }}>ON AIR</span>
                <span style={{ fontWeight: 800, fontSize: '14px', color: '#00F0FF' }}>{liveStatus.game || 'Gaming'}</span>
                <span style={{ color: '#888', margin: '0 8px' }}>•</span>
                <span style={{ color: '#ccc', fontSize: '13px' }}>{liveStatus.title}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#888' }}>
                <Clock size={15} />
                <span>Buffer: {liveStatus.samples_sec}s</span>
              </div>
            </div>

            {/* VU Meters */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div style={{ background: '#111', padding: '12px 16px', borderRadius: '8px', border: '1px solid #222' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                  <span style={{ color: '#aaa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <SpeakerHigh size={15} color="#00F0FF" /> Audio Loudness (RMS dB)
                  </span>
                  <span style={{ color: '#00F0FF', fontWeight: 800 }}>{liveStatus.current_db} dB</span>
                </div>
                <div style={{ display: 'flex', gap: '3px', height: '22px', alignItems: 'flex-end' }}>
                  {(liveStatus.db || []).map((val, idx) => {
                    const norm = Math.max(0, Math.min(100, (val + 60) * 2));
                    const isSpike = val > -16;
                    return (
                      <div
                        key={idx}
                        style={{
                          flex: 1,
                          height: `${Math.max(10, norm)}%`,
                          background: isSpike ? '#ff4444' : '#00F0FF',
                          borderRadius: '2px',
                          opacity: idx === (liveStatus.db.length - 1) ? 1 : 0.6
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <div style={{ background: '#111', padding: '12px 16px', borderRadius: '8px', border: '1px solid #222' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                  <span style={{ color: '#aaa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Fire size={15} color="#ffbb33" /> Chat Activity Velocity
                  </span>
                  <span style={{ color: '#ffbb33', fontWeight: 800 }}>{liveStatus.chat_velocity} msgs/s</span>
                </div>
                <div style={{ height: '22px', background: '#1a1a1a', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', padding: '0 4px' }}>
                  <div
                    style={{
                      height: '8px',
                      width: `${Math.min(100, liveStatus.chat_velocity * 10)}%`,
                      background: 'linear-gradient(90deg, #ffbb33, #ff4444)',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Instant Snipe Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[30, 45, 60].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSnipeSeconds(s)}
                    style={{
                      background: snipeSeconds === s ? '#333' : '#222',
                      border: snipeSeconds === s ? '1px solid #666' : '1px solid #333',
                      color: snipeSeconds === s ? '#fff' : '#888',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 700
                    }}
                  >
                    Last {s}s
                  </button>
                ))}
              </div>

              <button
                onClick={handleClipNow}
                disabled={isSniping}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #ff4444, #ff2222)',
                  border: 'none',
                  color: '#fff',
                  padding: '14px 24px',
                  borderRadius: '10px',
                  fontWeight: 900,
                  fontSize: '15px',
                  letterSpacing: '0.04em',
                  cursor: isSniping ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 20px rgba(255, 68, 68, 0.4)'
                }}
              >
                <Fire size={22} weight="fill" />
                <span>{isSniping ? 'Sniping Buffer...' : `🎯 SNIPE LAST ${snipeSeconds}s NOW`}</span>
              </button>
            </div>

            {/* Active Rendering Jobs Banner */}
            {activeSnipeJobs.length > 0 && (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeSnipeJobs.map(job => (
                  <div
                    key={job.id}
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(255, 68, 68, 0.1)',
                      border: '1px solid rgba(255, 68, 68, 0.35)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      color: '#ff6666'
                    }}
                  >
                    <CircleNotch size={20} className="animate-spin" />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '13px' }}>
                        Rendering 9:16 Short ({job.id}) • Last {job.seconds}s
                      </div>
                      <div style={{ fontSize: '11px', color: '#bbb' }}>
                        Slicing rolling buffer, auto-detecting facecam PIP, transcribing audio and burning bouncy subtitles... (Takes ~30-45s)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {snipeSuccessMessage && activeSnipeJobs.length === 0 && (
              <div style={{ marginTop: '14px', padding: '10px 14px', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '8px', color: '#00F0FF', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} weight="fill" />
                <span>{snipeSuccessMessage}</span>
              </div>
            )}

            {clips.length > 0 && (
              <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => galleryRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  style={{
                    background: 'rgba(255, 68, 68, 0.15)',
                    border: '1px solid rgba(255, 68, 68, 0.4)',
                    color: '#ff6666',
                    padding: '8px 22px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span>View Cut Shorts ({clips.length}) in Gallery Below ↓</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* VOD Stream & Chunk Manager Display */}
        {mode === 'vod' && vodStatus && vodStatus.chunks && (
          <div style={{ marginTop: '24px' }}>
            {/* Stream Header Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1c1c1c', padding: '16px 20px', borderRadius: '12px', border: '1px solid #333', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ background: '#00F0FF', color: '#000', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 900 }}>
                    {vodStatus.game || 'Gaming'}
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 800 }}>{vodStatus.title}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#888' }}>
                  {vodStatus.uploader} • Duration: {roundHours(vodStatus.duration)} • Divided into {vodStatus.chunks.length} Chunks ({chunkMinutes}m each) • Style: <b style={{ color: '#00F0FF' }}>{style.toUpperCase()}</b> • Transcriber: <b style={{ color: '#00e676' }}>{transcriberType.toUpperCase()}</b> • Mode: <b style={{ color: aiMode === 'auto' ? '#00F0FF' : '#ffbb33' }}>{aiMode === 'auto' ? 'AUTOMATIC 1-CLICK' : 'MANUAL PROMPT'}</b>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => updateAiMode(aiMode === 'auto' ? 'prompt' : 'auto')}
                  style={{
                    background: aiMode === 'auto' ? 'rgba(0, 240, 255, 0.14)' : 'rgba(255, 187, 51, 0.12)',
                    border: aiMode === 'auto' ? '1px solid #00F0FF' : '1px solid #ffbb33',
                    color: aiMode === 'auto' ? '#00F0FF' : '#ffbb33',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Click to toggle between 1-Click Automatic AI and Manual Free Mode"
                >
                  <Lightning size={15} weight={aiMode === 'auto' ? 'fill' : 'bold'} />
                  <span>{aiMode === 'auto' ? '⚡ AI Auto-Mode (ON)' : '📋 Manual Mode'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowReframeModal(true);
                    if (!reframeFrameUrl) {
                      handleInitVODClick();
                    }
                  }}
                  style={{
                    background: 'rgba(255, 68, 68, 0.12)',
                    border: '1px solid rgba(255, 68, 68, 0.4)',
                    color: '#ff6666',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Adjust Streamer Facecam & Gameplay crop boxes and subtitle positions"
                >
                  <Crop size={15} />
                  <span>📐 Reframe Layout</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowStreamSetupModal(true)}
                  style={{ background: '#262626', border: '1px solid #444', color: '#eee', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="Configure Subtitle Animation, Transcriber & AI Mode"
                >
                  <Gear size={15} />
                  <span>Stream Settings</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetStream}
                  style={{
                    background: 'rgba(255, 68, 68, 0.08)',
                    border: '1px solid rgba(255, 68, 68, 0.35)',
                    color: '#ff6666',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 68, 68, 0.2)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 68, 68, 0.08)'; e.currentTarget.style.color = '#ff6666'; }}
                  title="Clear current stream and start fresh with a new link"
                >
                  <X size={15} />
                  <span>✕ Clear / New Stream</span>
                </button>

                {/* Merge Action Button if 2 or more selected */}
                {selectedMergeChunks.length >= 2 && (
                  <button
                    onClick={handleMergeSelectedChunks}
                    style={{
                      background: '#ffbb33',
                      border: 'none',
                      color: '#000',
                      padding: '9px 18px',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <ArrowsMerge size={16} weight="bold" />
                    <span>Merge {selectedMergeChunks.length} Chunks ({selectedMergeChunks.length * chunkMinutes}m)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Active Stage & Progress Bar if running */}
            {vodStatus.status === 'processing' && (
              <div style={{ marginBottom: '20px', background: '#1a1a1a', border: '1px solid rgba(0, 240, 255, 0.4)', borderRadius: '12px', padding: '16px', boxShadow: '0 0 20px rgba(0, 240, 255, 0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CircleNotch size={18} className="animate-spin" color="#00F0FF" />
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#00F0FF' }}>{vodStatus.stage}</span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{vodStatus.progress}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#222', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${vodStatus.progress}%`,
                      background: 'linear-gradient(90deg, #ff4444, #00F0FF)',
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Chunks Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {vodStatus.chunks.map((chunk) => {
                const isSelected = selectedMergeChunks.includes(chunk.index);
                const isProcessing = chunk.status === 'processing';
                const isQueued = chunk.status === 'queued';
                const isError = chunk.status === 'error';
                const isDone = chunk.status === 'done' && !isProcessing;
                const hasPromptReady = (chunk.status === 'ready_prompt' || (Boolean(chunk.prompt) && chunk.status !== 'ready')) && !isDone && !isProcessing && !isQueued;

                return (
                  <div
                    key={chunk.index}
                    style={{
                      background: isSelected ? 'rgba(255, 187, 51, 0.08)' : isProcessing ? 'rgba(0, 240, 255, 0.04)' : isQueued ? 'rgba(255, 145, 0, 0.06)' : isDone ? 'rgba(0, 230, 118, 0.04)' : '#141414',
                      border: isSelected ? '1px solid #ffbb33' : isProcessing ? '1px solid #00F0FF' : isQueued ? '1px solid #ff9100' : isDone ? '1px solid rgba(0, 230, 118, 0.4)' : hasPromptReady ? '1px solid rgba(0, 240, 255, 0.4)' : isError ? '1px solid #ff4444' : '1px solid #282828',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      boxShadow: isProcessing ? '0 0 15px rgba(0, 240, 255, 0.15)' : isQueued ? '0 0 12px rgba(255, 145, 0, 0.12)' : 'none',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>{chunk.label}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                            <span style={{ fontSize: '11px', color: '#888' }}>{chunk.duration_min}m Segment</span>
                            <span style={{ fontSize: '10px', color: '#00F0FF', fontFamily: 'monospace', background: 'rgba(0, 240, 255, 0.08)', padding: '1px 5px', borderRadius: '4px' }}>
                              ID: {chunk.chunk_id || `c${chunk.index + 1}`}
                            </span>
                          </div>
                        </div>

                        {/* Multi-select checkbox for merging */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMergeChunks(prev => [...prev, chunk.index]);
                            } else {
                              setSelectedMergeChunks(prev => prev.filter(i => i !== chunk.index));
                            }
                          }}
                          style={{ width: '18px', height: '18px', accentColor: '#ffbb33', cursor: 'pointer' }}
                        />
                      </div>

                      {/* Status pill */}
                      <div style={{ marginBottom: '14px' }}>
                        {isProcessing ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#00F0FF', fontWeight: 800 }}>
                            <CircleNotch size={14} className="animate-spin" color="#00F0FF" />
                            {vodStatus?.stage && vodStatus.active_chunk_idx === chunk.index && vodStatus.stage.includes('Rendering Short')
                              ? vodStatus.stage.split(':')[0]
                              : vodStatus?.stage && vodStatus.active_chunk_idx === chunk.index && vodStatus.stage.includes('Fast range')
                              ? 'Downloading audio...'
                              : 'Transcribing Chunk...'}
                          </span>
                        ) : isQueued ? (
                          <span style={{ fontSize: '11px', color: '#ff9100', fontWeight: 800, background: 'rgba(255,145,0,0.15)', padding: '2px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={13} color="#ff9100" /> Queued (#{chunk.queue_position || 1} in queue)
                          </span>
                        ) : isDone ? (
                          <span style={{ fontSize: '11px', color: '#00e676', fontWeight: 800, background: 'rgba(0,230,118,0.15)', padding: '2px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={13} weight="fill" color="#00e676" /> {chunk.clips_count || '10'} Rendered
                          </span>
                        ) : hasPromptReady ? (
                          <span style={{ fontSize: '11px', color: '#1ed760', fontWeight: 800, background: 'rgba(30,215,96,0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                            ✓ Transcribed & Prompt Ready
                          </span>
                        ) : isError ? (
                          <span style={{ fontSize: '11px', color: '#ff6666', fontWeight: 800, background: 'rgba(255,68,68,0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                            ⚠️ {chunk.error ? (chunk.error.length > 25 ? chunk.error.slice(0, 25) + '...' : chunk.error) : 'Failed'}
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#777' }}>Ready to transcribe</span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {isDone ? (
                        <div style={{
                          background: 'rgba(0, 230, 118, 0.08)',
                          border: '1px solid rgba(0, 230, 118, 0.28)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}>
                          <div style={{ color: '#00e676', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <CheckCircle size={16} weight="fill" color="#00e676" />
                            <span>
                              {chunk.completed_mode === 'manual' || !aiMode
                                ? '✓ Chunk Completed (Manual Prompt)'
                                : '✓ Chunk Completed (AI Auto-Mode)'}
                            </span>
                          </div>
                          <div style={{ color: '#999', fontSize: '11px' }}>
                            ✓ {chunk.clips_count || 10} Shorts Rendered & Added to Gallery
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '4px' }}>
                            <button
                              onClick={() => handleOpenPrompt(chunk.index)}
                              style={{ background: 'none', border: 'none', color: '#666', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                              onMouseEnter={e => e.target.style.color = '#00F0FF'}
                              onMouseLeave={e => e.target.style.color = '#666'}
                            >
                              View Prompt
                            </button>
                            <button
                              onClick={() => {
                                setJsonPasteModalChunk(chunk.index);
                                setPastedJsonText('');
                              }}
                              style={{ background: 'none', border: 'none', color: '#666', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                              onMouseEnter={e => e.target.style.color = '#ff4444'}
                              onMouseLeave={e => e.target.style.color = '#666'}
                            >
                              Re-paste JSON
                            </button>
                          </div>
                        </div>
                      ) : !hasPromptReady ? (
                        isProcessing ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              disabled
                              style={{
                                flex: 1,
                                background: 'rgba(0, 240, 255, 0.12)',
                                border: '1px solid #00F0FF',
                                color: '#00F0FF',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}
                            >
                              <CircleNotch size={14} className="animate-spin" color="#00F0FF" />
                              <span>
                                {vodStatus?.stage && vodStatus.active_chunk_idx === chunk.index && vodStatus.stage.includes('Rendering Short')
                                  ? `Rendering Shorts (${chunk.clips_count || 0} done)...`
                                  : 'Processing Chunk...'}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelChunk(chunk.index)}
                              title="Cancel processing this chunk"
                              style={{
                                background: 'rgba(255, 68, 68, 0.15)',
                                border: '1px solid #ff4444',
                                color: '#ff4444',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <X size={14} />
                              <span>Cancel</span>
                            </button>
                          </div>
                        ) : isQueued ? (
                          <button
                            type="button"
                            onClick={() => handleCancelChunk(chunk.index)}
                            title="Remove from queue"
                            style={{
                              width: '100%',
                              background: 'rgba(255, 145, 0, 0.12)',
                              border: '1px solid rgba(255, 145, 0, 0.4)',
                              color: '#ff9100',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <X size={14} />
                            <span>Cancel Queue (#{chunk.queue_position || 1})</span>
                          </button>
                        ) : isError ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => handleTranscribeClick(chunk.index)}
                              style={{
                                flex: 1,
                                background: 'linear-gradient(135deg, #ff4444, #cc0000)',
                                border: 'none',
                                color: '#fff',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}
                            >
                              <Lightning size={14} color="#fff" />
                              <span>Retry Chunk</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelChunk(chunk.index)}
                              title="Reset status back to Ready"
                              style={{
                                background: '#222',
                                border: '1px solid #444',
                                color: '#bbb',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              Reset
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleTranscribeClick(chunk.index)}
                            style={{
                              background: '#222',
                              border: '1px solid #333',
                              color: '#fff',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <Lightning size={14} color="#00F0FF" />
                            <span>Transcribe {chunkMinutes}m Chunk</span>
                          </button>
                        )
                      ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleOpenPrompt(chunk.index)}
                            style={{
                              flex: 1,
                              background: 'rgba(0, 240, 255, 0.15)',
                              border: '1px solid #00F0FF',
                              color: '#00F0FF',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <Copy size={14} />
                            <span>Copy Prompt</span>
                          </button>

                          <button
                            onClick={() => {
                              setJsonPasteModalChunk(chunk.index);
                              setPastedJsonText('');
                            }}
                            style={{
                              flex: 1,
                              background: '#ff4444',
                              border: 'none',
                              color: '#fff',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <Sparkle size={14} weight="fill" />
                            <span>Paste JSON</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Rendered Shorts Gallery */}
      <div ref={galleryRef}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {galleryFilter === 'live' ? (
                <>
                  <span style={{ color: '#ff4444' }}>🔴 Live Buffer Shorts</span>
                  <span style={{ background: 'rgba(255, 68, 68, 0.2)', color: '#ff4444', fontSize: '12px', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                    {clips.filter(c => c.id && c.id.startsWith('sniper_')).length}
                  </span>
                </>
              ) : galleryFilter === 'vod' ? (
                <>
                  <span style={{ color: '#00F0FF' }}>⚡ Deep VOD Scanner Shorts</span>
                  <span style={{ background: 'rgba(0, 240, 255, 0.2)', color: '#00F0FF', fontSize: '12px', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                    {clips.filter(c => !c.id || c.id.startsWith('vod_')).length}
                  </span>
                </>
              ) : (
                <>
                  <span>All Stream Shorts</span>
                  <span style={{ background: '#222', color: '#fff', fontSize: '12px', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                    {clips.length}
                  </span>
                </>
              )}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#181818', padding: '3px', borderRadius: '20px', border: '1px solid #2e2e2e', display: 'inline-flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setGalleryFilter('vod')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '16px',
                  border: 'none',
                  background: galleryFilter === 'vod' ? '#00F0FF' : 'transparent',
                  color: galleryFilter === 'vod' ? '#000' : '#888',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                ⚡ VOD Chunks ({clips.filter(c => !c.id || c.id.startsWith('vod_')).length})
              </button>
              <button
                type="button"
                onClick={() => setGalleryFilter('all')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '16px',
                  border: 'none',
                  background: galleryFilter === 'all' ? '#333' : 'transparent',
                  color: galleryFilter === 'all' ? '#fff' : '#888',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                All ({clips.length})
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => openLocalClipsFolder(backendUrl)}
                style={{
                  background: '#1c1c1c',
                  border: '1px solid #333',
                  color: '#00F0FF',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title="Open local clips folder in Windows Explorer"
              >
                <FolderOpen size={13} weight="bold" />
                <span>Open Folder</span>
              </button>

              {clips.filter(c => {
                if (galleryFilter === 'live') return c.id && c.id.startsWith('sniper_');
                if (galleryFilter === 'vod') return !c.id || c.id.startsWith('vod_');
                return true;
              }).length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const currentClips = clips.filter(c => {
                      if (galleryFilter === 'live') return c.id && c.id.startsWith('sniper_');
                      if (galleryFilter === 'vod') return !c.id || c.id.startsWith('vod_');
                      return true;
                    });
                    handleBulkDownload(currentClips, galleryFilter === 'vod' ? 'VOD Shorts' : (galleryFilter === 'live' ? 'Live Buffer Shorts' : 'All Stream Shorts'));
                  }}
                  disabled={isDownloadingBulk}
                  style={{
                    background: 'linear-gradient(135deg, #00F0FF 0%, #00bcff 100%)',
                    border: 'none',
                    color: '#000000',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    cursor: isDownloadingBulk ? 'wait' : 'pointer',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 10px rgba(0, 240, 255, 0.3)'
                  }}
                  title="Choose folder location to save all shorts"
                >
                  {isDownloadingBulk ? (
                    <CircleNotch size={14} className="animate-spin" />
                  ) : (
                    <DownloadSimple size={14} weight="bold" />
                  )}
                  <span>
                    Download All (
                    {clips.filter(c => {
                      if (galleryFilter === 'live') return c.id && c.id.startsWith('sniper_');
                      if (galleryFilter === 'vod') return !c.id || c.id.startsWith('vod_');
                      return true;
                    }).length}
                    )
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setPendingRenderJobs([]);
                  fetchClips();
                }}
                style={{ background: '#1c1c1c', border: '1px solid #333', color: '#aaa', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}
              >
                Refresh
              </button>
              {clips.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearGallery}
                  style={{
                    background: 'rgba(255, 68, 68, 0.12)',
                    border: '1px solid rgba(255, 68, 68, 0.35)',
                    color: '#ff6666',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Clear all shorts from gallery"
                >
                  <Trash size={13} />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {clips.length === 0 && activeSnipeJobs.length === 0 && pendingRenderJobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#121212', border: '1px dashed #282828', borderRadius: '16px' }}>
            <Broadcast size={48} color="#444" style={{ marginBottom: '12px' }} />
            <h4 style={{ color: '#888', fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>No stream shorts cut yet</h4>
            <p style={{ color: '#555', fontSize: '13px', maxWidth: '420px', margin: '0 auto' }}>
              Connect a live stream or start a VOD scan above. Rendered 9:16 vertical shorts with animated subtitles will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
            {/* Active Live Snipe Placeholder Cards */}
            {galleryFilter !== 'vod' && activeSnipeJobs.map(job => (
              <div
                key={job.id}
                style={{
                  background: '#141414',
                  border: '1px solid rgba(255, 68, 68, 0.45)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    aspectRatio: '9/16',
                    background: '#0d0d0d',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '20px',
                    textAlign: 'center'
                  }}
                >
                  <CircleNotch size={40} color="#ff4444" className="animate-spin" />
                  <span style={{ fontSize: '13px', color: '#ff6666', fontWeight: 900 }}>Rendering 9:16 Short...</span>
                  <span style={{ fontSize: '11px', color: '#888' }}>Burning TrueType ASS Bouncy Subtitles (~30-45s)</span>
                </div>
                <div style={{ padding: '14px', background: '#111' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>Last {job.seconds}s Clip</div>
                  <div style={{ fontSize: '11px', color: '#666' }}>Will unlock automatically once rendered</div>
                </div>
              </div>
            ))}

            {/* VOD JSON Rendering Skeleton Cards (Progressive Unlock) */}
            {galleryFilter !== 'live' && pendingRenderJobs.map((job, idx) => (
              <div
                key={job.id}
                style={{
                  background: '#141414',
                  border: idx === 0 ? '1px solid #00F0FF' : '1px solid #282828',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  boxShadow: idx === 0 ? '0 0 25px rgba(0, 240, 255, 0.18)' : 'none'
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    aspectRatio: '9/16',
                    background: 'linear-gradient(135deg, #0d0d0d, #1a1a1a)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '20px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ position: 'absolute', top: '12px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ background: idx === 0 ? '#00F0FF' : '#222', color: idx === 0 ? '#000' : '#888', fontSize: '10px', fontWeight: 900, padding: '3px 8px', borderRadius: '4px' }}>
                      {idx === 0 ? '⚡ RENDERING NOW' : `⏳ QUEUED (#${job.index})`}
                    </span>
                    <span style={{ fontSize: '10px', color: '#ffbb33', fontWeight: 800 }}>🔥 95%+ VIRALITY</span>
                  </div>

                  <CircleNotch size={38} color={idx === 0 ? '#00F0FF' : '#555'} className="animate-spin" />
                  <span style={{ fontSize: '13px', color: idx === 0 ? '#00F0FF' : '#ccc', fontWeight: 900, padding: '0 8px' }}>
                    {idx === 0 ? (vodStatus?.stage || job.hook) : job.hook}
                  </span>
                  <span style={{ fontSize: '11px', color: '#888' }}>
                    {idx === 0 ? 'Cutting facecam & burning ASS subtitles...' : 'Queued (renders right after)'}
                  </span>
                  <div style={{ fontSize: '10px', color: '#00F0FF', fontWeight: 700, marginTop: '4px' }}>
                    ✓ Plays immediately when done!
                  </div>
                </div>
                <div style={{ padding: '14px', background: '#111', borderTop: '1px solid #222' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>Clip {job.index} of {job.total}</div>
                  <div style={{ fontSize: '11px', color: '#666' }}>9:16 Vertical Short • Dynamic Hook</div>
                </div>
              </div>
            ))}

            {/* Completed Rendered Clips (Filtered by Mode) */}
            {clips
              .filter(c => {
                if (galleryFilter === 'live') return c.id && c.id.startsWith('sniper_');
                if (galleryFilter === 'vod') return !c.id || c.id.startsWith('vod_');
                return true;
              })
              .map((c, index, filteredClips) => {
                const currentGroup = c.batch_id || c.chunk_id || (c.id ? c.id.split('_').slice(0, 3).join('_') : 'default');
                const prevGroup = index > 0
                  ? (filteredClips[index - 1].batch_id || filteredClips[index - 1].chunk_id || (filteredClips[index - 1].id ? filteredClips[index - 1].id.split('_').slice(0, 3).join('_') : 'default'))
                  : null;
                const isDivider = prevGroup !== null && prevGroup !== currentGroup;
                const showGroupHeader = index === 0 || isDivider;

                const groupClips = filteredClips.filter(item => {
                  const itemGroup = item.batch_id || item.chunk_id || (item.id ? item.id.split('_').slice(0, 3).join('_') : 'default');
                  return itemGroup === currentGroup;
                });

                let groupLabel = 'Chunk Group';
                if (currentGroup.includes('_c')) {
                  const cNum = currentGroup.split('_c')[1]?.split('_')[0];
                  groupLabel = cNum ? `Chunk ${cNum}` : 'Chunk';
                } else if (c.chunk_id) {
                  groupLabel = `Chunk ${c.chunk_id}`;
                } else if (c.id && c.id.startsWith('sniper_')) {
                  groupLabel = 'Live Buffer Snipes';
                }

                return (
                  <React.Fragment key={c.id || index}>
                    {showGroupHeader && (
                      <div
                        style={{
                          gridColumn: '1 / -1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 18px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '10px',
                          marginTop: index > 0 ? '22px' : '0',
                          marginBottom: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Lightning size={16} color="#00F0FF" weight="fill" />
                            <span>{groupLabel}</span>
                          </span>
                          <span
                            style={{
                              background: 'rgba(0, 240, 255, 0.12)',
                              color: '#00F0FF',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 800
                            }}
                          >
                            {groupClips.length} Shorts
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleBulkDownload(groupClips, `${groupLabel} Shorts`)}
                          disabled={isDownloadingBulk}
                          style={{
                            background: 'rgba(0, 240, 255, 0.12)',
                            border: '1px solid rgba(0, 240, 255, 0.35)',
                            color: '#00F0FF',
                            fontSize: '12px',
                            fontWeight: 800,
                            padding: '6px 14px',
                            borderRadius: '8px',
                            cursor: isDownloadingBulk ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#00F0FF';
                            e.currentTarget.style.color = '#000000';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(0, 240, 255, 0.12)';
                            e.currentTarget.style.color = '#00F0FF';
                          }}
                          title={`Choose location and download all ${groupClips.length} shorts in ${groupLabel}`}
                        >
                          <DownloadSimple size={13} weight="bold" />
                          <span>Download {groupLabel} ({groupClips.length})</span>
                        </button>
                      </div>
                    )}
                    <div
                      key={c.id}
                      style={{
                        background: '#141414',
                        border: '1px solid #282828',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'transform 0.2s, border-color 0.2s',
                        position: 'relative'
                      }}
                    >
                  {/* Cover Image & Play Button */}
                  <div
                    style={{
                      position: 'relative',
                      aspectRatio: '9/16',
                      background: '#0a0a0a',
                      cursor: 'pointer',
                      overflow: 'hidden'
                    }}
                    onClick={() => setSelectedVideo(c)}
                  >
                    {c.cover_url ? (
                      <img
                        src={`${backendUrl}${c.cover_url}`}
                        alt={c.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                        <Broadcast size={32} />
                      </div>
                    )}

                    {/* Play Overlay */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.9
                      }}
                    >
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255, 68, 68, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Play size={22} color="#fff" weight="fill" />
                      </div>
                    </div>

                    {/* Duration Badge */}
                    {c.duration && (
                      <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.8)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                        {c.duration}s
                      </div>
                    )}

                    {/* Virality Score Badge */}
                    {c.score && (
                      <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(255, 68, 68, 0.9)', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Fire size={12} weight="fill" />
                        <span>{c.score}% Virality</span>
                      </div>
                    )}

                    {/* Game Badge */}
                    {c.game && (
                      <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0, 240, 255, 0.9)', color: '#000', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 900 }}>
                        {c.game}
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h5 style={{ fontSize: '14px', fontWeight: 800, color: '#fff', marginBottom: '6px', lineHeight: '1.3' }}>
                        {c.hook || c.title || 'Gaming Short'}
                      </h5>
                      <p style={{ color: '#777', fontSize: '12px', marginBottom: '12px' }}>
                        {c.title}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setSelectedVideo(c)}
                        style={{
                          flex: 1,
                          background: '#222',
                          border: '1px solid #333',
                          color: '#fff',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Play size={14} weight="fill" />
                        <span>Preview</span>
                      </button>
                      {c.video_url && (
                        <button
                          type="button"
                          onClick={() => handleDownloadSingle(c)}
                          disabled={downloadingClipId === c.id}
                          style={{
                            background: '#ff4444',
                            border: 'none',
                            color: '#fff',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: downloadingClipId === c.id ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                          title="Choose location and download short"
                        >
                          {downloadingClipId === c.id ? (
                            <CircleNotch size={14} className="animate-spin" />
                          ) : (
                            <DownloadSimple size={14} weight="bold" />
                          )}
                          <span>Download</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteClip(c.id)}
                        title="Delete short"
                        style={{
                          background: '#1c1c1c',
                          border: '1px solid #2e2e2e',
                          color: '#ff6666',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 68, 68, 0.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#1c1c1c'}
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          </div>
        )}
      </div>

      {/* Copy Prompt Modal */}
      {promptModalData && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setPromptModalData(null)}
        >
          <div
            style={{
              background: '#161616',
              borderRadius: '16px',
              border: '1px solid #333',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #222' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>AI Gaming Prompt: {promptModalData.label}</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#888' }}>Copy this prompt and paste into ChatGPT / Gemini / Claude to get viral clip timestamps.</p>
              </div>
              <button
                onClick={() => setPromptModalData(null)}
                style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              <pre
                style={{
                  background: '#0d0d0d',
                  border: '1px solid #282828',
                  borderRadius: '10px',
                  padding: '16px',
                  color: '#bbb',
                  fontSize: '12px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'monospace',
                  maxHeight: '380px',
                  overflowY: 'auto'
                }}
              >
                {promptModalData.prompt}
              </pre>
            </div>

            <div style={{ padding: '18px 24px', borderTop: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#888' }}>Step 1: Copy prompt → Step 2: Paste in ChatGPT → Step 3: Paste JSON back here</span>
              <button
                onClick={() => copyToClipboard(promptModalData.prompt)}
                style={{
                  background: copiedPrompt ? '#1ed760' : '#ff4444',
                  border: 'none',
                  color: copiedPrompt ? '#000' : '#fff',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {copiedPrompt ? <Check size={16} weight="bold" /> : <Copy size={16} />}
                <span>{copiedPrompt ? 'Copied to Clipboard!' : '📋 Copy Prompt'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paste JSON Modal */}
      {jsonPasteModalChunk !== null && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setJsonPasteModalChunk(null)}
        >
          <div
            style={{
              background: '#161616',
              borderRadius: '16px',
              border: '1px solid #333',
              maxWidth: '680px',
              width: '100%',
              padding: '24px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Paste AI Output JSON</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#888' }}>
                  Paste the JSON output received from ChatGPT / Claude / Gemini to render your 9:16 shorts.
                </p>
              </div>
              <button
                onClick={() => setJsonPasteModalChunk(null)}
                style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <textarea
              placeholder={`[\n  {\n    "start_time": "00:04:15",\n    "end_time": "00:04:55",\n    "hook_score": 96,\n    "hook": "HE CANNOT BE SERIOUS!",\n    "suggested_headline": "GTA 6 Police Chase Fail"\n  }\n]`}
              value={pastedJsonText}
              onChange={(e) => setPastedJsonText(e.target.value)}
              rows={12}
              style={{
                width: '100%',
                background: '#0d0d0d',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '14px',
                color: '#fff',
                fontSize: '13px',
                fontFamily: 'monospace',
                outline: 'none',
                marginBottom: '18px'
              }}
            />

            <button
              onClick={handleSubmitPastedJSON}
              disabled={isSubmittingJson || !pastedJsonText.trim()}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #ff4444, #ff2222)',
                border: 'none',
                color: '#fff',
                padding: '12px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '14px',
                cursor: isSubmittingJson ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isSubmittingJson ? <CircleNotch size={18} className="animate-spin" /> : <Sparkle size={18} weight="fill" />}
              <span>{isSubmittingJson ? 'Validating & Slicing...' : 'Render Viral Shorts from JSON'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Bulk Download Progress Modal */}
      {bulkProgress.active && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#161616',
              border: '1px solid #333',
              borderRadius: '14px',
              padding: '24px 28px',
              maxWidth: '440px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
            }}
          >
            <CircleNotch size={40} color="#00F0FF" className="animate-spin" style={{ margin: '0 auto 16px' }} />
            <h4 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 8px', color: '#ffffff' }}>
              {bulkProgress.title}
            </h4>
            <p style={{ fontSize: '13px', color: '#00F0FF', margin: '0 0 6px', fontWeight: 600 }}>
              {bulkProgress.subtitle}
            </p>
            <p style={{ fontSize: '11px', color: '#888', margin: 0 }}>
              {bulkProgress.message}
            </p>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {selectedVideo && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setSelectedVideo(null)}
        >
          <div
            style={{
              background: '#111',
              borderRadius: '16px',
              border: '1px solid #333',
              maxWidth: '420px',
              width: '100%',
              overflow: 'hidden',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #222' }}>
              <span style={{ fontWeight: 800, fontSize: '14px' }}>{selectedVideo.hook || selectedVideo.title}</span>
              <button
                onClick={() => setSelectedVideo(null)}
                style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ aspectRatio: '9/16', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <video
                src={`${backendUrl}${selectedVideo.video_url}`}
                controls
                autoPlay
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: '1px solid #222', background: '#161616' }}>
              <button
                onClick={() => handleDeleteClip(selectedVideo.id)}
                style={{
                  background: 'rgba(255, 68, 68, 0.15)',
                  border: '1px solid rgba(255, 68, 68, 0.4)',
                  color: '#ff6666',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Trash size={14} />
                <span>Delete Short</span>
              </button>
              {selectedVideo.video_url && (
                <button
                  type="button"
                  onClick={() => handleDownloadSingle(selectedVideo)}
                  disabled={downloadingClipId === selectedVideo.id}
                  style={{
                    background: '#ff4444',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: downloadingClipId === selectedVideo.id ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Choose location and download short"
                >
                  {downloadingClipId === selectedVideo.id ? (
                    <CircleNotch size={14} className="animate-spin" />
                  ) : (
                    <DownloadSimple size={14} weight="bold" />
                  )}
                  <span>Download</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Storage History Modal */}
      {showHistoryModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            style={{
              background: '#161616',
              borderRadius: '16px',
              border: '1px solid #333',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: '28px',
              position: 'relative',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FolderOpen size={24} color="#00F0FF" weight="fill" />
                <h3 style={{ fontSize: '18px', fontWeight: 800 }}>VOD Storage History ({historySessions.length})</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ color: '#888', fontSize: '13px', marginBottom: '20px', lineHeight: '1.4' }}>
              Previously scanned streams are stored here. Resuming loads cached audio and transcripts instantly with 0s download!
            </p>

            {historySessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666', border: '1px dashed #333', borderRadius: '12px' }}>
                <Clock size={36} color="#444" style={{ marginBottom: '12px' }} />
                <div style={{ fontWeight: 600 }}>No saved sessions yet</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>Analyze any stream and it will be saved here automatically.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {historySessions.map((sess) => {
                  const readyCount = (sess.chunks || []).filter(c => c.status === 'ready_prompt' || c.status === 'done' || (c.words && c.words.length > 0)).length;
                  const durHours = (sess.duration / 3600).toFixed(1);
                  return (
                    <div
                      key={sess.id}
                      style={{
                        background: '#1f1f1f',
                        border: '1px solid #333',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ background: 'rgba(0, 240, 255, 0.15)', color: '#00F0FF', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                              {sess.game || 'Gaming'}
                            </span>
                            <span style={{ color: '#aaa', fontSize: '12px' }}>• {sess.uploader || 'Creator'}</span>
                            <span style={{ color: '#777', fontSize: '11px' }}>• {durHours}h duration</span>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: '#eee', lineHeight: '1.3' }}>
                            {sess.title}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => resumeSession(sess.id)}
                            disabled={historyLoading}
                            style={{
                              background: 'linear-gradient(135deg, #00F0FF 0%, #0088cc 100%)',
                              color: '#000',
                              fontWeight: 800,
                              fontSize: '12px',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '8px 14px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Play size={13} weight="fill" />
                            <span>Resume</span>
                          </button>
                          <button
                            onClick={() => deleteHistorySession(sess.id)}
                            style={{
                              background: 'rgba(255, 68, 68, 0.1)',
                              color: '#ff4444',
                              border: '1px solid rgba(255, 68, 68, 0.3)',
                              borderRadius: '8px',
                              padding: '8px',
                              cursor: 'pointer'
                            }}
                            title="Delete saved session"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#aaa', borderTop: '1px solid #2a2a2a', paddingTop: '8px' }}>
                        <span>ID: <code style={{ color: '#00F0FF' }}>{sess.id}</code></span>
                        <span>Chunks: <b>{sess.chunks?.length || 0}</b> ({sess.chunk_minutes || 30}m each)</span>
                        <span style={{ color: readyCount > 0 ? '#00e676' : '#888' }}>
                          {readyCount > 0 ? `⚡ ${readyCount} Chunk(s) Transcribed & Ready` : 'Master audio cached'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dedicated Extraction Loading Screen Dialog Modal */}
      {isFetchingFrame && !showReframeModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999
          }}
        >
          <div
            style={{
              background: '#121212',
              border: '1px solid #282828',
              borderRadius: '20px',
              padding: '36px',
              width: '460px',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(0, 240, 255, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}
          >
            <div style={{ position: 'relative', width: '56px', height: '56px' }}>
              <CircleNotch size={56} className="animate-spin" color="#00F0FF" />
            </div>

            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff' }}>
              Downloading Stream Frame for Reframe
            </h3>

            <p style={{ margin: 0, fontSize: '12px', color: '#888', lineHeight: '1.5' }}>
              Downloading real stream slice at {Math.floor(frameTimestampSec / 60)}m ({frameTimestampSec}s) to calibrate streamer facecam and gameplay boxes.
            </p>

            <div
              style={{
                background: '#1a1a1a',
                border: '1px solid #333',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                color: '#00F0FF',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Clock size={14} />
              <span>Elapsed: {String(Math.floor(fetchTimer / 60)).padStart(2, '0')}:{String(fetchTimer % 60).padStart(2, '0')}s</span>
            </div>

            <div style={{ width: '100%', height: '4px', background: '#222', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: '100%',
                  background: 'linear-gradient(90deg, #ff4444, #00F0FF)',
                  animation: 'pulse 1.5s infinite'
                }}
              />
            </div>

            <div style={{ width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', color: '#aaa', marginTop: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00e676' }}>
                <Check size={14} weight="bold" />
                <span>Connected to stream source</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00F0FF' }}>
                <CircleNotch size={14} className="animate-spin" />
                <span>Downloading stream slice ({Math.floor(frameTimestampSec / 60)}:00)...</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666' }}>
                <CircleNotch size={14} />
                <span>Extracting crisp gameplay & facecam frame...</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsFetchingFrame(false);
              }}
              style={{
                marginTop: '8px',
                background: 'transparent',
                border: '1px solid #444',
                color: '#aaa',
                padding: '8px 20px',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Cancel Extraction
            </button>
          </div>
        </div>
      )}

      {/* Visual Reframe & Split Screen Layout Editor Modal */}
      {showReframeModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(10px)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#121212',
              border: '1px solid #333',
              borderRadius: '16px',
              maxWidth: '1080px',
              width: '100%',
              maxHeight: '94vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 25px 70px rgba(0,0,0,0.85)'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <Crop size={22} color="#ff4444" weight="bold" />
                  <h3 style={{ fontSize: '17px', fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>
                    Visual Reframe & Split Screen Editor
                  </h3>
                  <span style={{ background: 'rgba(0, 240, 255, 0.15)', color: '#00F0FF', fontSize: '10px', fontWeight: 900, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                    Viral 1080p Split Screen
                  </span>
                </div>
                <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>
                  Crop streamer facecam to top and gameplay to bottom. Position your headline badge and subtitle text.
                </p>
              </div>
              <button
                onClick={() => setShowReframeModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Video Timestamp Frame Fetcher Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '16px', background: '#181818', padding: '10px 14px', borderRadius: '10px', border: '1px solid #282828' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="#00F0FF" />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#aaa', textTransform: 'uppercase' }}>
                  Video Frame Timestamp:
                </span>
                {[
                  { label: '35m (Active Gameplay)', sec: 2100 },
                  { label: '45m', sec: 2700 },
                  { label: '15m', sec: 900 },
                  { label: '10m', sec: 600 },
                  { label: '5m', sec: 300 }
                ].map((t) => (
                  <button
                    key={t.sec}
                    type="button"
                    onClick={() => { setFrameTimestampSec(t.sec); handleFetchFrame(t.sec); }}
                    style={{
                      background: frameTimestampSec === t.sec ? '#00F0FF' : '#222',
                      color: frameTimestampSec === t.sec ? '#000' : '#ccc',
                      border: '1px solid #3a3a3a',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                  <input
                    type="number"
                    min="10"
                    max="99999"
                    value={frameTimestampSec}
                    onChange={(e) => setFrameTimestampSec(Number(e.target.value))}
                    style={{ width: '70px', background: '#0e0e0e', border: '1px solid #444', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', textAlign: 'center' }}
                  />
                  <span style={{ fontSize: '11px', color: '#666' }}>sec</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleFetchFrame(frameTimestampSec)}
                disabled={isFetchingFrame}
                style={{
                  background: 'linear-gradient(135deg, #00F0FF, #0099ff)',
                  border: 'none',
                  color: '#000',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 900,
                  cursor: isFetchingFrame ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isFetchingFrame ? <CircleNotch size={14} className="animate-spin" /> : <ArrowsClockwise size={14} weight="bold" />}
                <span>{isFetchingFrame ? 'Extracting Frame...' : 'Extract Stream Frame'}</span>
              </button>
            </div>

            {/* Main 2-Column Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1.4fr) minmax(280px, 1fr)', gap: '24px', alignItems: 'start' }}>
              {/* Left Column: 16:9 Stream Frame Workspace */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#aaa', textTransform: 'uppercase' }}>
                      1. Drag & Resize Crop Boxes on Video
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveCropBox('facecam')}
                      style={{
                        background: activeCropBox === 'facecam' ? 'rgba(255, 68, 68, 0.25)' : '#1e1e1e',
                        border: `1px solid ${activeCropBox === 'facecam' ? '#ff4444' : '#333'}`,
                        color: activeCropBox === 'facecam' ? '#ff6666' : '#888',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      🔴 Focus Facecam
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCropBox('gameplay')}
                      style={{
                        background: activeCropBox === 'gameplay' ? 'rgba(0, 240, 255, 0.25)' : '#1e1e1e',
                        border: `1px solid ${activeCropBox === 'gameplay' ? '#00F0FF' : '#333'}`,
                        color: activeCropBox === 'gameplay' ? '#00F0FF' : '#888',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      🔵 Focus Gameplay
                    </button>
                  </div>
                  {isFetchingFrame && (
                    <span style={{ fontSize: '11px', color: '#00F0FF', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <CircleNotch size={13} className="animate-spin" /> Fetching stream frame...
                    </span>
                  )}
                </div>

                {/* 16:9 Interactive Canvas Workspace */}
                <div
                  ref={canvasRef}
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '16/9',
                    background: '#090909',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid #333',
                    marginBottom: '14px',
                    boxShadow: 'inset 0 0 30px rgba(0,0,0,0.6)',
                    userSelect: 'none'
                  }}
                >
                  {reframeFrameUrl ? (
                    <img
                      src={reframeFrameUrl}
                      alt="Stream Frame"
                      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px', color: '#888' }}>
                      <CircleNotch size={36} className="animate-spin" color="#00F0FF" />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                        Extracting Real Gameplay & Streamer Facecam...
                      </span>
                      <span style={{ fontSize: '11px', color: '#666' }}>
                        Fetching high-definition stream snapshot from live VOD
                      </span>
                    </div>
                  )}

                  {isFetchingFrame && (
                    <div style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      background: 'rgba(0, 0, 0, 0.85)',
                      border: '1px solid #00F0FF',
                      borderRadius: '20px',
                      padding: '4px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      color: '#00F0FF',
                      fontWeight: 700,
                      zIndex: 30,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                    }}>
                      <CircleNotch size={12} className="animate-spin" color="#00F0FF" />
                      <span>Calibrating in-game frame...</span>
                    </div>
                  )}

                  {/* Streamer Facecam Box (Red) - Direct Mouse Drag & Resize */}
                  <div
                    onMouseDown={(e) => handleBoxMouseDown(e, 'facecam')}
                    style={{
                      position: 'absolute',
                      left: `${reframeSettings.facecamBox.x}%`,
                      top: `${reframeSettings.facecamBox.y}%`,
                      width: `${reframeSettings.facecamBox.w}%`,
                      height: `${reframeSettings.facecamBox.h}%`,
                      border: '2.5px solid #ff4444',
                      background: activeCropBox === 'facecam' ? 'rgba(255, 68, 68, 0.32)' : 'rgba(255, 68, 68, 0.18)',
                      boxShadow: activeCropBox === 'facecam' ? '0 0 20px rgba(255, 68, 68, 0.7)' : '0 0 10px rgba(255, 68, 68, 0.3)',
                      borderRadius: '6px',
                      boxSizing: 'border-box',
                      cursor: 'move',
                      zIndex: activeCropBox === 'facecam' ? 25 : 15
                    }}
                  >
                    <div style={{ position: 'absolute', top: '4px', left: '4px', fontSize: '9px', fontWeight: 900, color: '#fff', background: '#ff4444', padding: '1px 6px', borderRadius: '3px', pointerEvents: 'none', userSelect: 'none' }}>
                      🔴 Facecam (Drag / Resize)
                    </div>
                    {/* 8 Resize Handles */}
                    {[
                      { key: 'nw', cursor: 'nwse-resize', top: '-5px', left: '-5px' },
                      { key: 'ne', cursor: 'nesw-resize', top: '-5px', right: '-5px' },
                      { key: 'sw', cursor: 'nesw-resize', bottom: '-5px', left: '-5px' },
                      { key: 'se', cursor: 'nwse-resize', bottom: '-5px', right: '-5px' },
                      { key: 'n', cursor: 'ns-resize', top: '-5px', left: 'calc(50% - 5px)' },
                      { key: 's', cursor: 'ns-resize', bottom: '-5px', left: 'calc(50% - 5px)' },
                      { key: 'w', cursor: 'ew-resize', top: 'calc(50% - 5px)', left: '-5px' },
                      { key: 'e', cursor: 'ew-resize', top: 'calc(50% - 5px)', right: '-5px' }
                    ].map(h => (
                      <div
                        key={h.key}
                        onMouseDown={(e) => handleBoxMouseDown(e, 'facecam', h.key)}
                        style={{
                          position: 'absolute',
                          width: '10px',
                          height: '10px',
                          background: '#fff',
                          border: '2px solid #ff4444',
                          borderRadius: '2px',
                          cursor: h.cursor,
                          zIndex: 30,
                          ...h
                        }}
                      />
                    ))}
                  </div>

                  {/* Main Gameplay Box (Cyan) - Direct Mouse Drag & Resize */}
                  <div
                    onMouseDown={(e) => handleBoxMouseDown(e, 'gameplay')}
                    style={{
                      position: 'absolute',
                      left: `${reframeSettings.gameplayBox.x}%`,
                      top: `${reframeSettings.gameplayBox.y}%`,
                      width: `${reframeSettings.gameplayBox.w}%`,
                      height: `${reframeSettings.gameplayBox.h}%`,
                      border: `2.5px ${activeCropBox === 'gameplay' ? 'solid' : 'dashed'} #00F0FF`,
                      background: activeCropBox === 'gameplay' ? 'rgba(0, 240, 255, 0.22)' : 'rgba(0, 240, 255, 0.12)',
                      boxShadow: activeCropBox === 'gameplay' ? '0 0 20px rgba(0, 240, 255, 0.7)' : '0 0 10px rgba(0, 240, 255, 0.3)',
                      borderRadius: '6px',
                      boxSizing: 'border-box',
                      cursor: 'move',
                      zIndex: activeCropBox === 'gameplay' ? 25 : 10
                    }}
                  >
                    <div style={{ position: 'absolute', bottom: '4px', left: '4px', fontSize: '9px', fontWeight: 900, color: '#000', background: '#00F0FF', padding: '1px 6px', borderRadius: '3px', pointerEvents: 'none', userSelect: 'none' }}>
                      🔵 Gameplay (Drag / Resize)
                    </div>
                    {/* 8 Resize Handles */}
                    {[
                      { key: 'nw', cursor: 'nwse-resize', top: '-5px', left: '-5px' },
                      { key: 'ne', cursor: 'nesw-resize', top: '-5px', right: '-5px' },
                      { key: 'sw', cursor: 'nesw-resize', bottom: '-5px', left: '-5px' },
                      { key: 'se', cursor: 'nwse-resize', bottom: '-5px', right: '-5px' },
                      { key: 'n', cursor: 'ns-resize', top: '-5px', left: 'calc(50% - 5px)' },
                      { key: 's', cursor: 'ns-resize', bottom: '-5px', left: 'calc(50% - 5px)' },
                      { key: 'w', cursor: 'ew-resize', top: 'calc(50% - 5px)', left: '-5px' },
                      { key: 'e', cursor: 'ew-resize', top: 'calc(50% - 5px)', right: '-5px' }
                    ].map(h => (
                      <div
                        key={h.key}
                        onMouseDown={(e) => handleBoxMouseDown(e, 'gameplay', h.key)}
                        style={{
                          position: 'absolute',
                          width: '10px',
                          height: '10px',
                          background: '#fff',
                          border: '2px solid #00F0FF',
                          borderRadius: '2px',
                          cursor: h.cursor,
                          zIndex: 30,
                          ...h
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio & Layout Presets */}
                <div style={{ marginBottom: '14px', background: '#161616', padding: '10px 14px', borderRadius: '10px', border: '1px solid #282828' }}>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#aaa', textTransform: 'uppercase', marginBottom: '8px' }}>
                    📐 Video Aspect Ratio & Layout Modes
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setReframeSettings(prev => ({
                          ...prev,
                          splitPct: 45,
                          gameplayBox: { x: 21.9, y: 0, w: 56.25, h: 100 }
                        }));
                      }}
                      style={{
                        background: '#1f1f1f',
                        border: '1px solid #3a3a3a',
                        color: '#fff',
                        padding: '8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                      onMouseEnter={e => e.target.style.borderColor = '#00F0FF'}
                      onMouseLeave={e => e.target.style.borderColor = '#3a3a3a'}
                    >
                      📱 1:1 Square Gameplay + Facecam
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReframeSettings(prev => ({
                          ...prev,
                          splitPct: 40,
                          gameplayBox: { x: 0, y: 0, w: 100, h: 100 }
                        }));
                      }}
                      style={{
                        background: '#1f1f1f',
                        border: '1px solid #3a3a3a',
                        color: '#fff',
                        padding: '8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                      onMouseEnter={e => e.target.style.borderColor = '#00F0FF'}
                      onMouseLeave={e => e.target.style.borderColor = '#3a3a3a'}
                    >
                      🖥️ 16:9 Wide Gameplay + Facecam
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReframeSettings(prev => ({
                          ...prev,
                          splitPct: 45,
                          facecamBox: { x: 0, y: 36, w: 23, h: 28 },
                          gameplayBox: { x: 21.9, y: 0, w: 56.25, h: 100 }
                        }));
                      }}
                      style={{
                        background: 'rgba(255, 68, 68, 0.12)',
                        border: '1px solid #ff4444',
                        color: '#ff6666',
                        padding: '8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      🎮 Streamer Cam (Mid/Bottom-Left)
                    </button>
                  </div>
                </div>

                {/* 1-Click Facecam Position Presets */}
                <div style={{ marginBottom: '14px' }}>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#ff6666', textTransform: 'uppercase', marginBottom: '6px' }}>
                    🔴 Streamer Facecam Presets
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={handleAutoDetectFacecam}
                      style={{
                        background: 'rgba(255, 68, 68, 0.22)',
                        border: '1.5px solid #ff4444',
                        color: '#ff8888',
                        padding: '7px 4px',
                        borderRadius: '8px',
                        fontSize: '10px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        textAlign: 'center',
                        boxShadow: '0 0 10px rgba(255, 68, 68, 0.3)'
                      }}
                      title="Run local AI Face Detector on current frame"
                    >
                      ⚡ AI Auto-Lock
                    </button>
                    {[
                      { label: 'Mid-Left (Kai Cenat)', box: { x: 0, y: 36, w: 23, h: 28 } },
                      { label: 'Bottom-Left', box: { x: 0, y: 56, w: 28, h: 44 } },
                      { label: 'Top-Right', box: { x: 72, y: 2, w: 26, h: 36 } },
                      { label: 'Top-Left', box: { x: 2, y: 2, w: 26, h: 36 } },
                      { label: 'Bottom-Right', box: { x: 72, y: 62, w: 26, h: 36 } }
                    ].map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setReframeSettings(prev => ({ ...prev, facecamBox: p.box }))}
                        style={{
                          background: '#1a1a1a',
                          border: '1px solid #333',
                          color: '#eee',
                          padding: '7px 6px',
                          borderRadius: '8px',
                          fontSize: '10px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                        onMouseEnter={e => e.target.style.borderColor = '#ff4444'}
                        onMouseLeave={e => e.target.style.borderColor = '#333'}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gameplay Presets */}
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#00F0FF', textTransform: 'uppercase', marginBottom: '6px' }}>
                    🔵 Gameplay Focus Presets
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {[
                      { label: 'Center 1:1 (Viral)', box: { x: 21.9, y: 0, w: 56.25, h: 100 } },
                      { label: 'Full 16:9 Stream', box: { x: 0, y: 0, w: 100, h: 100 } },
                      { label: 'Left Action', box: { x: 0, y: 0, w: 65, h: 100 } },
                      { label: 'Right Action', box: { x: 35, y: 0, w: 65, h: 100 } }
                    ].map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setReframeSettings(prev => ({ ...prev, gameplayBox: p.box }))}
                        style={{
                          background: '#1a1a1a',
                          border: '1px solid #333',
                          color: '#eee',
                          padding: '7px 8px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                        onMouseEnter={e => e.target.style.borderColor = '#00F0FF'}
                        onMouseLeave={e => e.target.style.borderColor = '#333'}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Live 9:16 Vertical Smartphone Preview & Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#aaa', textTransform: 'uppercase', marginBottom: '8px', alignSelf: 'flex-start' }}>
                  2. Live 9:16 Split Screen Output Preview
                </span>

                {/* Smartphone Preview Container */}
                <div
                  style={{
                    position: 'relative',
                    width: '230px',
                    height: '408px',
                    borderRadius: '24px',
                    border: '4px solid #2a2a2a',
                    boxShadow: '0 0 35px rgba(0, 240, 255, 0.2), 0 10px 25px rgba(0,0,0,0.8)',
                    overflow: 'hidden',
                    background: '#000',
                    display: 'flex',
                    flexDirection: 'column',
                    userSelect: 'none'
                  }}
                >
                  {/* Top: Streamer Facecam */}
                  <div
                    style={{
                      height: `${reframeSettings.splitPct}%`,
                      width: '100%',
                      position: 'relative',
                      overflow: 'hidden',
                      background: '#1a1a1a',
                      borderBottom: '2px solid rgba(0, 240, 255, 0.4)'
                    }}
                  >
                    {reframeFrameUrl ? (
                      <svg
                        viewBox={`${(reframeSettings.facecamBox.x / 100) * 1920} ${(reframeSettings.facecamBox.y / 100) * 1080} ${(reframeSettings.facecamBox.w / 100) * 1920} ${(reframeSettings.facecamBox.h / 100) * 1080}`}
                        preserveAspectRatio="xMidYMid slice"
                        style={{ width: '100%', height: '100%', display: 'block' }}
                      >
                        <image href={reframeFrameUrl} x="0" y="0" width="1920" height="1080" />
                      </svg>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ff6666', fontSize: '11px', fontWeight: 800 }}>
                        Streamer Facecam (Top)
                      </div>
                    )}
                    <span style={{ position: 'absolute', top: '6px', left: '6px', background: 'rgba(255, 68, 68, 0.85)', color: '#fff', fontSize: '8px', fontWeight: 900, padding: '1px 5px', borderRadius: '3px', textTransform: 'uppercase' }}>
                      Facecam Top
                    </span>
                  </div>

                  {/* Bottom: Main Gameplay */}
                  <div
                    style={{
                      height: `${100 - reframeSettings.splitPct}%`,
                      width: '100%',
                      position: 'relative',
                      overflow: 'hidden',
                      background: '#141414'
                    }}
                  >
                    {reframeFrameUrl ? (
                      <svg
                        viewBox={`${(reframeSettings.gameplayBox.x / 100) * 1920} ${(reframeSettings.gameplayBox.y / 100) * 1080} ${(reframeSettings.gameplayBox.w / 100) * 1920} ${(reframeSettings.gameplayBox.h / 100) * 1080}`}
                        preserveAspectRatio="xMidYMid slice"
                        style={{ width: '100%', height: '100%', display: 'block' }}
                      >
                        <image href={reframeFrameUrl} x="0" y="0" width="1920" height="1080" />
                      </svg>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#00F0FF', fontSize: '11px', fontWeight: 800 }}>
                        Main Gameplay (Bottom)
                      </div>
                    )}
                    <span style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(0, 240, 255, 0.85)', color: '#000', fontSize: '8px', fontWeight: 900, padding: '1px 5px', borderRadius: '3px', textTransform: 'uppercase' }}>
                      Gameplay Bottom
                    </span>
                  </div>

                  {/* Headline (Hook) Pill Badge - Draggable / Positioned */}
                  <div
                    style={{
                      position: 'absolute',
                      top: `${reframeSettings.hookY}%`,
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      background: '#00F0FF',
                      color: '#000',
                      fontWeight: 900,
                      fontSize: '10px',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.7)',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      zIndex: 10,
                      letterSpacing: '0.04em'
                    }}
                  >
                    THIS IS NOT THE ISLAND!
                  </div>

                  {/* Subtitle Text Overlay - Positioned */}
                  <div
                    style={{
                      position: 'absolute',
                      top: `${reframeSettings.capY}%`,
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontFamily: 'Poppins, sans-serif',
                      fontSize: '11px',
                      fontWeight: 900,
                      color: '#fff',
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
                      pointerEvents: 'none',
                      zIndex: 10
                    }}
                  >
                    HE <span style={{ color: '#00F0FF', textShadow: '0 0 10px rgba(0,240,255,0.9), 2px 2px 0 #000' }}>LOST</span> HIS MIND!
                  </div>
                </div>

                {/* Vertical Placement Sliders */}
                <div style={{ width: '100%', marginTop: '14px', background: '#161616', padding: '12px 14px', borderRadius: '10px', border: '1px solid #282828', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#aaa' }}>
                      Split Line (Top {reframeSettings.splitPct}% / Bot {100 - reframeSettings.splitPct}%)
                    </span>
                    <input
                      type="range"
                      min="25"
                      max="55"
                      value={reframeSettings.splitPct}
                      onChange={(e) => setReframeSettings(prev => ({ ...prev, splitPct: Number(e.target.value) }))}
                      style={{ width: '110px', accentColor: '#00e676' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#00F0FF' }}>
                      Headline Y Position: {reframeSettings.hookY}%
                    </span>
                    <input
                      type="range"
                      min="20"
                      max="65"
                      value={reframeSettings.hookY}
                      onChange={(e) => setReframeSettings(prev => ({ ...prev, hookY: Number(e.target.value) }))}
                      style={{ width: '110px', accentColor: '#00e676' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#00F0FF' }}>
                      Subtitle Y Position: {reframeSettings.capY}%
                    </span>
                    <input
                      type="range"
                      min="60"
                      max="95"
                      value={reframeSettings.capY}
                      onChange={(e) => setReframeSettings(prev => ({ ...prev, capY: Number(e.target.value) }))}
                      style={{ width: '110px', accentColor: '#00e676' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #282828' }}>
              <button
                type="button"
                onClick={() => setShowReframeModal(false)}
                style={{ background: 'transparent', border: '1px solid #444', color: '#aaa', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleApplyReframe}
                style={{
                  background: 'linear-gradient(135deg, #ff4444, #00F0FF)',
                  border: 'none',
                  color: '#000',
                  padding: '9px 24px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 20px rgba(0, 240, 255, 0.4)'
                }}
              >
                <Check size={16} weight="bold" />
                <span>Apply Split Screen & Continue →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VOD Stream Setup & Options Modal */}
      {showStreamSetupModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setShowStreamSetupModal(false)}
        >
          <div
            style={{
              background: '#141414',
              borderRadius: '16px',
              border: '1px solid #333',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '26px',
              position: 'relative',
              boxShadow: '0 25px 60px rgba(0,0,0,0.9)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkle size={22} color="#00F0FF" weight="fill" />
                <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Stream Setup & Options</h3>
              </div>
              <button
                onClick={() => setShowStreamSetupModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Stream URL Preview */}
            <div style={{ background: '#0a0a0a', padding: '10px 14px', borderRadius: '8px', border: '1px solid #222', marginBottom: '18px', fontSize: '12px', color: '#aaa', display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              <span style={{ color: '#00F0FF', fontWeight: 800 }}>Target:</span>
              <span style={{ color: '#eee', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {streamUrl || 'No URL specified'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* 1. AI Processing Mode */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#ff6666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  1. AI Viral Selection Mode
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => updateAiMode('prompt')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: aiMode === 'prompt' ? '1px solid #ff4444' : '1px solid #2a2a2a',
                      background: aiMode === 'prompt' ? 'rgba(255, 68, 68, 0.12)' : '#1a1a1a',
                      color: '#fff',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '13px', color: aiMode === 'prompt' ? '#ff5555' : '#ddd', marginBottom: '3px' }}>
                      📋 Manual Mode (Free)
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', lineHeight: '1.3' }}>
                      Copy prompt → ChatGPT / Gemini → Paste JSON back. 100% Free, no keys needed.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const hasKey = Boolean(keysInfo.groq || keysInfo.gemini || keysInfo.openai || keysInfo.openrouter);
                      if (!hasKey) {
                        setShowStreamSetupModal(false);
                        setShowKeysModal(true);
                      } else {
                        updateAiMode('auto');
                      }
                    }}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: aiMode === 'auto' ? '1px solid #00F0FF' : '1px solid #2a2a2a',
                      background: aiMode === 'auto' ? 'rgba(0, 240, 255, 0.12)' : '#1a1a1a',
                      color: '#fff',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                      <div style={{ fontWeight: 800, fontSize: '13px', color: aiMode === 'auto' ? '#00F0FF' : '#ddd' }}>
                        ⚡ Auto AI Mode (1-Click)
                      </div>
                      {Boolean(keysInfo.groq || keysInfo.gemini || keysInfo.openai || keysInfo.openrouter) ? (
                        <span style={{ fontSize: '9px', background: 'rgba(0, 230, 118, 0.2)', color: '#00e676', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                          ● Active
                        </span>
                      ) : (
                        <span style={{ fontSize: '9px', background: 'rgba(255, 170, 0, 0.2)', color: '#ffbb33', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                          Off / Needs Key
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', lineHeight: '1.3' }}>
                      {Boolean(keysInfo.groq || keysInfo.gemini || keysInfo.openai || keysInfo.openrouter)
                        ? 'AI auto-detects viral moments & renders directly with 0 clicks.'
                        : 'Requires free Google Gemini or Groq API key. Click to setup.'}
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Subtitle Animation & Video Layout */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#00F0FF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  2. Subtitle Style & Layout
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#888', marginBottom: '4px' }}>SUBTITLE ANIMATION</span>
                      <select
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                        style={{ width: '100%', background: '#1c1c1c', border: '1px solid #333', color: '#fff', padding: '10px 12px', borderRadius: '8px', fontSize: '13px' }}
                      >
                        <option value="bounce">Bounce (Poppins • Cyan Pop)</option>
                        <option value="karaoke">Karaoke (Impact • Yellow Highlight)</option>
                        <option value="clean">Minimal Clean (Inter • White)</option>
                      </select>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#888', marginBottom: '4px' }}>VIDEO LAYOUT</span>
                      <select
                        value={layout}
                        onChange={(e) => setLayout(e.target.value)}
                        style={{ width: '100%', background: '#1c1c1c', border: '1px solid #333', color: '#fff', padding: '10px 12px', borderRadius: '8px', fontSize: '13px' }}
                      >
                        <option value="splitscreen">⚡ Split Screen (Facecam Top + Gameplay Bottom) - 1080p</option>
                        <option value="gameplay">Gameplay 9:16 (Centered Vertical)</option>
                        <option value="blur">Blur Background (16:9 in Middle)</option>
                      </select>
                      {layout === 'splitscreen' && (
                        <button
                          type="button"
                          onClick={() => { setShowStreamSetupModal(false); setShowReframeModal(true); }}
                          style={{ marginTop: '8px', width: '100%', background: 'rgba(255, 68, 68, 0.12)', border: '1px solid rgba(255, 68, 68, 0.35)', color: '#ff6666', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          <Crop size={13} />
                          <span>Adjust Facecam / Gameplay Crop Boxes</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Live Subtitle Style Preview Card */}
                  <div style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '110px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                      Live Subtitle Preview
                    </span>

                    {style === 'bounce' && (
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', background: '#FFFFFF', color: '#14100E', fontWeight: 900, fontSize: '11px', padding: '3px 10px', borderRadius: '4px', marginBottom: '8px', letterSpacing: '0.05em' }}>
                          WAIT FOR THIS MOMENT!
                        </span>
                        <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: '15px', fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.03em', textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000' }}>
                          HE <span style={{ color: '#00F0FF', textShadow: '0 0 14px rgba(0,240,255,0.9), 2px 2px 0 #000, -2px -2px 0 #000' }}>LOST</span> HIS MIND!
                        </div>
                      </div>
                    )}

                    {style === 'karaoke' && (
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', background: '#FFFFFF', color: '#14100E', fontWeight: 900, fontSize: '11px', padding: '3px 10px', borderRadius: '4px', marginBottom: '8px', letterSpacing: '0.05em' }}>
                          WAIT FOR THIS MOMENT!
                        </span>
                        <div style={{ fontFamily: 'Impact, sans-serif', fontSize: '17px', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000' }}>
                          POLICE <span style={{ color: '#FFE600', textShadow: '0 0 14px rgba(255,230,0,0.9), 2px 2px 0 #000, -2px -2px 0 #000' }}>CAUGHT</span> HIM!
                        </div>
                      </div>
                    )}

                    {style === 'clean' && (
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', background: '#FFFFFF', color: '#14100E', fontWeight: 900, fontSize: '11px', padding: '3px 10px', borderRadius: '4px', marginBottom: '6px' }}>
                          WAIT FOR THIS MOMENT!
                        </span>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#bbb' }}>
                          "He <span style={{ color: '#FFFFFF', fontWeight: 800 }}>actually</span> made the jump."
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Chunk Separation (Length) */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#ffbb33', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  3. Chunk Separation (Length)
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setChunkMinutes(30)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #ffbb33',
                      background: 'rgba(255, 187, 51, 0.15)',
                      color: '#ffbb33',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: 'default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>⚡ 30 Minutes per Chunk (Optimized Standard)</span>
                  </button>
                </div>
              </div>

              {/* 4. Speech-to-Text Transcriber */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#00e676', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  4. Speech-to-Text Transcriber
                </label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: transcriberType === 'kaggle' ? '12px' : '0' }}>
                  <button
                    type="button"
                    onClick={() => updateTranscriberType('parakeet')}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: transcriberType === 'parakeet' ? '1px solid #00e676' : '1px solid #333',
                      background: transcriberType === 'parakeet' ? 'rgba(0, 230, 118, 0.15)' : '#1a1a1a',
                      color: transcriberType === 'parakeet' ? '#00e676' : '#888',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    🟢 Local Parakeet (Offline)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTranscriberType('kaggle')}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: transcriberType === 'kaggle' ? '1px solid #00F0FF' : '1px solid #333',
                      background: transcriberType === 'kaggle' ? 'rgba(0, 240, 255, 0.15)' : '#1a1a1a',
                      color: transcriberType === 'kaggle' ? '#00F0FF' : '#888',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    ☁️ Free Cloud GPU (Colab / Kaggle)
                  </button>
                </div>

                {transcriberType === 'kaggle' && (
                  <div style={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#aaa' }}>Cloudflare Tunnel URL (Google Colab / Kaggle):</span>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <a
                          href="https://colab.research.google.com/#create=true"
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(0, 240, 255, 0.12)',
                            border: '1px solid rgba(0, 240, 255, 0.4)',
                            color: '#00F0FF',
                            fontSize: '11px',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontWeight: 700
                          }}
                        >
                          <ArrowSquareOut size={12} />
                          <span>🚀 Open Google Colab</span>
                        </a>
                        <a
                          href="https://www.kaggle.com/code"
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#222',
                            border: '1px solid #444',
                            color: '#20beff',
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontWeight: 700
                          }}
                        >
                          <ArrowSquareOut size={12} />
                          <span>Open Kaggle</span>
                        </a>
                        <button
                          type="button"
                          onClick={copyKaggleScript}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: copiedKaggleCode ? 'rgba(0, 230, 118, 0.2)' : 'rgba(0, 240, 255, 0.15)',
                            border: copiedKaggleCode ? '1px solid #00e676' : '1px solid rgba(0, 240, 255, 0.4)',
                            color: copiedKaggleCode ? '#00e676' : '#00F0FF',
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 700
                          }}
                        >
                          {copiedKaggleCode ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedKaggleCode ? 'Copied!' : 'Copy GPU Script'}</span>
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="https://xxxx-xxxx.trycloudflare.com"
                      value={kaggleUrl}
                      onChange={(e) => updateKaggleUrl(e.target.value)}
                      style={{ width: '100%', background: '#161616', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '12px' }}
                    />
                    <div style={{ fontSize: '11px', color: '#777', marginTop: '6px' }}>
                      💡 Tip: Google Colab needs <strong>no mobile number verification</strong>. Sign in, set Runtime to T4 GPU, paste script & paste Cloudflare URL here.
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowStreamSetupModal(false);
                    handleInitVOD();
                  }}
                  disabled={isInitializingVod}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #ff4444 0%, #ff2222 100%)',
                    border: 'none',
                    color: '#fff',
                    padding: '14px',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 20px rgba(255,68,68,0.35)'
                  }}
                >
                  {isInitializingVod ? <CircleNotch size={18} className="animate-spin" /> : <Sparkle size={18} weight="fill" />}
                  <span>{vodStatus?.chunks?.length ? '✓ Apply & Update Settings' : '🚀 Start Stream Analysis & Chunking'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated AI API Keys Modal */}
      {showKeysModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
          onClick={() => setShowKeysModal(false)}
        >
          <div
            style={{
              background: '#161616',
              borderRadius: '16px',
              border: '1px solid #333',
              maxWidth: '660px',
              width: '100%',
              padding: '26px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.85)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Key size={22} color="#00F0FF" weight="fill" />
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Configure AI API Key</h3>
                  <span style={{ fontSize: '10px', background: 'rgba(0,240,255,0.15)', color: '#00F0FF', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                    1-Click Auto Mode
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
                  Select an AI provider, enter your key, click Test to verify, and enable 1-click autonomous shorts generation.
                </p>
              </div>
              <button
                onClick={() => setShowKeysModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Provider Selector Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '18px' }}>
              {[
                { id: 'gemini', label: 'Google Gemini', desc: 'Free & Smart', badge: 'Recommended', color: '#00F0FF', has: keysInfo.gemini },
                { id: 'groq', label: 'Groq Cloud', desc: 'Ultra-Fast', badge: 'Free', color: '#f55036', has: keysInfo.groq },
                { id: 'openai', label: 'OpenAI', desc: 'GPT-4o mini', badge: 'Paid/Credits', color: '#10a37f', has: keysInfo.openai },
                { id: 'openrouter', label: 'OpenRouter', desc: 'Multi-AI Hub', badge: 'Free/Paid', color: '#6366f1', has: keysInfo.openrouter }
              ].map(p => {
                const isSel = selectedKeyProvider === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedKeyProvider(p.id)}
                    style={{
                      background: isSel ? 'rgba(255,255,255,0.08)' : '#111',
                      border: isSel ? `1px solid ${p.color}` : '1px solid #282828',
                      borderRadius: '10px',
                      padding: '10px 8px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 800, color: isSel ? p.color : '#eee', marginBottom: '2px' }}>
                      {p.label}
                    </div>
                    <div style={{ fontSize: '10px', color: '#777' }}>
                      {p.desc}
                    </div>
                    <div style={{ marginTop: '6px' }}>
                      {p.has ? (
                        <span style={{ fontSize: '9px', background: 'rgba(0, 230, 118, 0.2)', color: '#00e676', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                          ● Connected
                        </span>
                      ) : (
                        <span style={{ fontSize: '9px', background: '#222', color: '#666', padding: '1px 6px', borderRadius: '4px' }}>
                          {p.badge}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Provider Details & Input Area */}
            <div style={{ background: '#0e0e0e', border: '1px solid #282828', borderRadius: '12px', padding: '16px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>
                    {selectedKeyProvider === 'gemini' && 'Google Gemini (Gemini 1.5 / 2.0 Flash)'}
                    {selectedKeyProvider === 'groq' && 'Groq Cloud (Llama 3.1 & 3.3)'}
                    {selectedKeyProvider === 'openai' && 'OpenAI (GPT-4o mini)'}
                    {selectedKeyProvider === 'openrouter' && 'OpenRouter (Llama 3.3 / Gemini 1.5)'}
                  </span>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                    {selectedKeyProvider === 'gemini' && '100% Free with 15 requests/min. Exceptional video and gaming comprehension.'}
                    {selectedKeyProvider === 'groq' && 'Free high-speed tier with 0.5s ultra-fast LLM response.'}
                    {selectedKeyProvider === 'openai' && 'Requires OpenAI API credits from platform.openai.com.'}
                    {selectedKeyProvider === 'openrouter' && 'Unified API for dozens of models across providers.'}
                  </div>
                </div>
                <a
                  href={
                    selectedKeyProvider === 'gemini' ? 'https://aistudio.google.com/app/apikey' :
                      selectedKeyProvider === 'groq' ? 'https://console.groq.com/keys' :
                        selectedKeyProvider === 'openai' ? 'https://platform.openai.com/api-keys' :
                          'https://openrouter.ai/keys'
                  }
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#222',
                    border: '1px solid #444',
                    color: '#00F0FF',
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontWeight: 700
                  }}
                >
                  <ArrowSquareOut size={12} />
                  <span>Get Key</span>
                </a>
              </div>

              {/* Key Input */}
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <input
                  type={showKeyVisible[selectedKeyProvider] ? 'text' : 'password'}
                  placeholder={
                    keysInfo[`${selectedKeyProvider}_preview`] ? `Saved: ${keysInfo[`${selectedKeyProvider}_preview`]} (or enter new)` : `Paste your ${selectedKeyProvider.toUpperCase()} API key here...`
                  }
                  value={keyInputs[selectedKeyProvider] || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setKeyInputs(prev => ({ ...prev, [selectedKeyProvider]: val }));
                    setTestResults(prev => ({ ...prev, [selectedKeyProvider]: null }));
                  }}
                  style={{
                    width: '100%',
                    background: '#161616',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    padding: '10px 50px 10px 12px',
                    color: '#fff',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowKeyVisible(prev => ({ ...prev, [selectedKeyProvider]: !prev[selectedKeyProvider] }))}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#777', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}
                >
                  {showKeyVisible[selectedKeyProvider] ? 'HIDE' : 'SHOW'}
                </button>
              </div>

              {/* Live Test Feedback Banner */}
              {testResults[selectedKeyProvider] && (
                <div style={{
                  background: testResults[selectedKeyProvider].ok ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 68, 68, 0.15)',
                  border: testResults[selectedKeyProvider].ok ? '1px solid rgba(0, 230, 118, 0.4)' : '1px solid rgba(255, 68, 68, 0.4)',
                  color: testResults[selectedKeyProvider].ok ? '#00e676' : '#ff6666',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '10px'
                }}>
                  {testResults[selectedKeyProvider].ok ? <CheckCircle size={16} weight="fill" /> : <WarningCircle size={16} weight="fill" />}
                  <span>{testResults[selectedKeyProvider].message}</span>
                </div>
              )}

              {/* Action Buttons for this Provider */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleTestKey(selectedKeyProvider)}
                  disabled={testingProvider === selectedKeyProvider || (!keyInputs[selectedKeyProvider]?.trim() && !keysInfo[selectedKeyProvider])}
                  style={{
                    flex: 1,
                    background: '#222',
                    border: '1px solid #383838',
                    color: '#fff',
                    padding: '10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: testingProvider === selectedKeyProvider ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {testingProvider === selectedKeyProvider ? <CircleNotch size={14} className="animate-spin" /> : <span>🧪</span>}
                  <span>{testingProvider === selectedKeyProvider ? 'Testing...' : 'Test Key (Verify OK)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleSaveKeys(true);
                    if (pendingTranscribeChunk !== null) {
                      handleProcessChunk(pendingTranscribeChunk);
                      setPendingTranscribeChunk(null);
                    }
                  }}
                  disabled={isSavingKey || (!keyInputs[selectedKeyProvider]?.trim() && !keysInfo[selectedKeyProvider])}
                  style={{
                    flex: 2,
                    background: 'linear-gradient(135deg, #00F0FF 0%, #00a8ff 100%)',
                    border: 'none',
                    color: '#000',
                    padding: '10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: isSavingKey ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {isSavingKey ? <CircleNotch size={14} className="animate-spin" /> : <Check size={14} weight="bold" />}
                  <span>Save & Turn ON Automatic AI</span>
                </button>
              </div>
            </div>

            {/* Footer Option: Stay on Manual Mode */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #222' }}>
              <span style={{ fontSize: '11px', color: '#666' }}>
                No API key? You can always use 100% Free Manual Mode.
              </span>
              <button
                type="button"
                onClick={() => {
                  updateAiMode('prompt');
                  setShowKeysModal(false);
                  if (pendingTranscribeChunk !== null) {
                    handleProcessChunk(pendingTranscribeChunk);
                    setPendingTranscribeChunk(null);
                  }
                }}
                style={{ background: 'transparent', border: '1px solid #333', color: '#aaa', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
              >
                Keep Manual Mode (Prompt)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function roundHours(seconds) {
  if (!seconds) return '0h';
  const hrs = seconds / 3600;
  return `${hrs.toFixed(1)}h`;
}
