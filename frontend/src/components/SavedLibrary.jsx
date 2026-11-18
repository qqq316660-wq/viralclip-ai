import React, { useState, useMemo } from 'react';
import {
  Fire,
  Clock,
  DownloadSimple,
  Copy,
  Check,
  ArrowSquareOut,
  Trash,
  MagnifyingGlass,
  FolderOpen,
  Folder,
  Folders,
  GridFour,
  Sparkle,
  Calendar,
  Funnel,
  CheckSquare,
  Square,
  ArrowCounterClockwise,
  SortAscending,
  ArrowLeft,
  ArrowRight
} from '@phosphor-icons/react';
import { downloadVideoFile, openLocalClipsFolder } from '../utils/downloadHelper';

export default function SavedLibrary({
  savedJobs,
  backendUrl,
  onRefreshLibrary,
  onCreateNew
}) {
  // View mode: 'bundles' (Project Folders) vs 'all_clips' (All Shorts Grid)
  const [viewMode, setViewMode] = useState('bundles');
  const [activeBundle, setActiveBundle] = useState(null); // When drilled into a specific folder

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [customDate, setCustomDate] = useState('');
  const [hookFilter, setHookFilter] = useState('all');
  const [durationFilter, setDurationFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  // Selected clips for individual bulk actions
  const [selectedClipIds, setSelectedClipIds] = useState([]);
  // Selected bundles for multi-folder bulk actions
  const [selectedBundleIds, setSelectedBundleIds] = useState([]);

  const [removedClipIds, setRemovedClipIds] = useState(new Set());
  const [copiedType, setCopiedType] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [isDownloadingBulk, setIsDownloadingBulk] = useState(false);
  const [downloadingClipId, setDownloadingClipId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3200);
  };

  // Flatten all saved clips with metadata
  const allClipsWithMeta = useMemo(() => {
    return (savedJobs || [])
      .filter((j) => (j.status === 'completed' || (j.clips && j.clips.length > 0)) && j.clips && j.clips.length > 0)
      .flatMap((job) =>
        job.clips.map((clip) => {
          let dateStr = null;
          let parsedTimestamp = 0;

          if (clip.description) {
            const m = clip.description.match(/(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/);
            if (m) dateStr = m[1];
          }
          if (!dateStr && job.created_at) {
            const m = job.created_at.match(/(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/);
            if (m) dateStr = m[1];
          }

          if (dateStr) {
            parsedTimestamp = new Date(dateStr).getTime() || 0;
          }

          return {
            ...clip,
            jobId: job.job_id,
            projectTitle: job.video_title || 'Untitled Project',
            jobCreatedAt: job.created_at || 'Recently',
            dateFormatted: dateStr || 'Recently',
            timestamp: parsedTimestamp
          };
        })
      );
  }, [savedJobs]);

  // Group clips into Project Folders / Bundles
  const projectBundles = useMemo(() => {
    const bundles = [];
    (savedJobs || [])
      .filter((j) => (j.status === 'completed' || (j.clips && j.clips.length > 0)) && j.clips && j.clips.length > 0)
      .forEach((job) => {
        if (job.job_id === 'job_saved_library') {
          // Group archived clips by date sessions
          const subGroups = {};
          job.clips.forEach((clip) => {
            let d = 'General Archive';
            if (clip.description) {
              const m = clip.description.match(/(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/);
              if (m) d = m[1];
            }
            if (!subGroups[d]) subGroups[d] = [];
            subGroups[d].push(clip);
          });

          Object.entries(subGroups).forEach(([dateKey, clipsList]) => {
            const activeClips = clipsList.filter((c) => !removedClipIds.has(c.id));
            if (activeClips.length > 0) {
              const totalSec = activeClips.reduce((acc, c) => acc + (c.duration || 30), 0);
              const avgHook = Math.round(
                activeClips.reduce((acc, c) => acc + (c.hook_score || 88), 0) / activeClips.length
              );
              bundles.push({
                id: `bundle_archive_${dateKey.replace(/\s+/g, '_')}`,
                jobId: job.job_id,
                title: `Video Ingest • ${dateKey}`,
                date: dateKey,
                timestamp: new Date(dateKey).getTime() || 0,
                clips: activeClips,
                totalDuration: totalSec,
                avgHookScore: avgHook,
                sourceType: 'archive'
              });
            }
          });
        } else {
          const activeClips = (job.clips || []).filter((c) => !removedClipIds.has(c.id));
          if (activeClips.length > 0) {
            const totalSec = activeClips.reduce((acc, c) => acc + (c.duration || 30), 0);
            const avgHook = Math.round(
              activeClips.reduce((acc, c) => acc + (c.hook_score || 88), 0) / activeClips.length
            );
            bundles.push({
              id: `bundle_${job.job_id}`,
              jobId: job.job_id,
              title: job.video_title || 'Untitled Project',
              date: job.created_at || 'Recently',
              timestamp: new Date(job.created_at || 0).getTime() || 0,
              clips: activeClips,
              totalDuration: totalSec,
              avgHookScore: avgHook,
              sourceType: 'job'
            });
          }
        }
      });

    return bundles.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [savedJobs, removedClipIds]);

  // Extract distinct dates with count
  const availableDates = useMemo(() => {
    const map = new Map();
    allClipsWithMeta.forEach((c) => {
      if (c.dateFormatted && c.dateFormatted !== 'Recently') {
        map.set(c.dateFormatted, (map.get(c.dateFormatted) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
  }, [allClipsWithMeta]);

  // Filter and sort clips (for grid or inside folder view)
  const sourceClipsForGrid = activeBundle ? activeBundle.clips : allClipsWithMeta;

  const filteredClips = useMemo(() => {
    return sourceClipsForGrid
      .filter((c) => !removedClipIds.has(c.id))
      .filter((clip) => {
        if (dateFilter === 'today') {
          const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          if (!clip.dateFormatted.toLowerCase().includes(today.toLowerCase())) return false;
        } else if (dateFilter === 'custom' && customDate) {
          const cDate = new Date(customDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          if (!clip.dateFormatted.toLowerCase().includes(cDate.toLowerCase())) return false;
        } else if (dateFilter !== 'all' && dateFilter !== 'today') {
          if (clip.dateFormatted !== dateFilter) return false;
        }

        if (hookFilter === 'viral85' && (clip.hook_score || 0) < 85) return false;
        if (hookFilter === 'high75' && (clip.hook_score || 0) < 75) return false;

        if (durationFilter === 'quick30' && (clip.duration || 0) > 30) return false;
        if (durationFilter === 'standard' && ((clip.duration || 0) <= 30 || (clip.duration || 0) > 60)) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = (clip.title || '').toLowerCase().includes(q);
          const matchHeadline = (clip.suggested_headline || '').toLowerCase().includes(q);
          const matchDesc = (clip.description || '').toLowerCase().includes(q);
          const matchProject = (clip.projectTitle || '').toLowerCase().includes(q);
          const matchTags = (clip.hashtags || []).some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchHeadline && !matchDesc && !matchProject && !matchTags) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') return (b.timestamp || 0) - (a.timestamp || 0);
        if (sortOrder === 'oldest') return (a.timestamp || 0) - (b.timestamp || 0);
        if (sortOrder === 'hook_high') return (b.hook_score || 0) - (a.hook_score || 0);
        if (sortOrder === 'duration_short') return (a.duration || 0) - (b.duration || 0);
        if (sortOrder === 'duration_long') return (b.duration || 0) - (a.duration || 0);
        return 0;
      });
  }, [sourceClipsForGrid, removedClipIds, dateFilter, customDate, hookFilter, durationFilter, searchQuery, sortOrder]);

  // Filtered bundles list
  const filteredBundles = useMemo(() => {
    return projectBundles.filter((bundle) => {
      if (dateFilter === 'today') {
        const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        if (!bundle.date.toLowerCase().includes(today.toLowerCase())) return false;
      } else if (dateFilter === 'custom' && customDate) {
        const cDate = new Date(customDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        if (!bundle.date.toLowerCase().includes(cDate.toLowerCase())) return false;
      } else if (dateFilter !== 'all' && dateFilter !== 'today') {
        if (bundle.date !== dateFilter) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = bundle.title.toLowerCase().includes(q);
        const matchClips = bundle.clips.some(
          (c) =>
            (c.title || '').toLowerCase().includes(q) ||
            (c.suggested_headline || '').toLowerCase().includes(q) ||
            (c.hashtags || []).some((t) => t.toLowerCase().includes(q))
        );
        if (!matchTitle && !matchClips) return false;
      }

      return true;
    });
  }, [projectBundles, dateFilter, customDate, searchQuery]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    dateFilter !== 'all' ||
    customDate !== '' ||
    hookFilter !== 'all' ||
    durationFilter !== 'all' ||
    sortOrder !== 'newest';

  const resetFilters = () => {
    setSearchQuery('');
    setDateFilter('all');
    setCustomDate('');
    setHookFilter('all');
    setDurationFilter('all');
    setSortOrder('newest');
  };

  const handleCopyLink = async (clipId, url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(clipId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const handleCopyText = async (clipId, type, text) => {
    try {
      await navigator.clipboard.writeText(text || '');
      setCopiedType(`${clipId}_${type}`);
      setTimeout(() => setCopiedType(null), 2000);
    } catch {}
  };

  // Delete a single clip
  const handleDeleteClip = async (clipId) => {
    if (!window.confirm('Are you sure you want to permanently delete this short?')) return;
    try {
      setDeletingId(clipId);
      setRemovedClipIds((prev) => new Set([...prev, clipId]));
      setSelectedClipIds((prev) => prev.filter((id) => id !== clipId));

      const res = await fetch(`${backendUrl}/api/clips/${clipId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        showToast('Short deleted from local storage');
      }
      if (onRefreshLibrary) onRefreshLibrary();
    } catch (err) {
      console.error('Failed to delete clip:', err);
      showToast('Error removing short from storage');
    } finally {
      setDeletingId(null);
    }
  };

  // Bulk Delete Clips
  const handleBulkDeleteClips = async () => {
    if (selectedClipIds.length === 0) return;
    const count = selectedClipIds.length;
    if (!window.confirm(`Are you sure you want to permanently delete all ${count} selected shorts?`)) return;

    try {
      setIsDeletingBulk(true);
      const toDelete = [...selectedClipIds];

      setRemovedClipIds((prev) => new Set([...prev, ...toDelete]));
      setSelectedClipIds([]);

      const res = await fetch(`${backendUrl}/api/clips/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clip_ids: toDelete })
      });

      if (res.ok) {
        showToast(`Successfully deleted ${count} shorts`);
      }
      if (onRefreshLibrary) onRefreshLibrary();
    } catch (err) {
      console.error('Failed bulk delete:', err);
      showToast('Error deleting selected shorts');
    } finally {
      setIsDeletingBulk(false);
    }
  };

  // Sequential helper to download an array of clips directly to disk
  const downloadClipsList = async (clipsList, label = 'shorts') => {
    if (!clipsList || clipsList.length === 0) return;
    showToast(`Downloading ${clipsList.length} ${label}...`);

    for (let i = 0; i < clipsList.length; i++) {
      const clip = clipsList[i];
      const videoSrc = `${backendUrl}${clip.rendered_url}`;
      const rawName = clip.suggested_headline || clip.title || clip.id;
      const res = await downloadVideoFile(videoSrc, rawName, backendUrl);

      if (res && res.cancelled) {
        showToast('Download cancelled by user.');
        break;
      }

      if (i < clipsList.length - 1) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }
    showToast(`All ${clipsList.length} ${label} saved!`);
  };

  // Direct single clip download
  const handleDownloadSingleClip = async (clip) => {
    if (!clip.rendered_url) return;
    const rawName = clip.suggested_headline || clip.title || clip.id;
    setDownloadingClipId(clip.id);
    try {
      const videoSrc = `${backendUrl}${clip.rendered_url}`;
      const res = await downloadVideoFile(videoSrc, rawName, backendUrl);
      if (res && res.cancelled) {
        showToast('Save cancelled.');
      } else {
        showToast(`Short saved successfully!`);
      }
    } catch (e) {
      console.error(e);
      showToast(`Failed to download short.`);
    } finally {
      setDownloadingClipId(null);
    }
  };

  // Bulk Download Selected Clips
  const handleBulkDownloadClips = async () => {
    if (selectedClipIds.length === 0) return;
    const targets = filteredClips.filter((c) => selectedClipIds.includes(c.id));
    try {
      setIsDownloadingBulk(true);
      await downloadClipsList(targets, 'shorts');
    } finally {
      setIsDownloadingBulk(false);
    }
  };

  // Download entire bundle (prefer zip bundle download)
  const handleDownloadBundle = async (bundle) => {
    try {
      setIsDownloadingBulk(true);
      showToast(`Preparing folder bundle "${bundle.title || 'shorts'}"...`);
      const targetJobId = bundle.jobId || (bundle.id ? bundle.id.replace('bundle_', '') : 'shorts_bundle');
      const zipUrl = `${backendUrl}/api/jobs/${encodeURIComponent(targetJobId)}/download-zip`;
      const zipName = `${bundle.title || 'shorts'}_bundle.zip`;
      const res = await downloadVideoFile(zipUrl, zipName, backendUrl);
      if (res && res.cancelled) {
        showToast('Bundle save cancelled.');
      } else {
        showToast(`Folder bundle saved successfully!`);
      }
    } catch (e) {
      console.error('Zip bundle download error:', e);
      showToast(`Could not download folder bundle: ${e.message || 'Error creating zip'}`);
    } finally {
      setIsDownloadingBulk(false);
    }
  };

  // Delete entire bundle
  const handleDeleteBundle = async (bundle) => {
    if (!window.confirm(`Are you sure you want to delete folder "${bundle.title}" and all ${bundle.clips.length} shorts inside it?`)) return;

    try {
      const clipIds = bundle.clips.map((c) => c.id);
      setRemovedClipIds((prev) => new Set([...prev, ...clipIds]));
      setSelectedClipIds((prev) => prev.filter((id) => !clipIds.includes(id)));
      setSelectedBundleIds((prev) => prev.filter((bid) => bid !== bundle.id));

      if (activeBundle && activeBundle.id === bundle.id) {
        setActiveBundle(null);
      }

      if (bundle.sourceType === 'job') {
        await fetch(`${backendUrl}/api/jobs/${bundle.jobId}`, { method: 'DELETE' });
      } else {
        await fetch(`${backendUrl}/api/clips/bulk-delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clip_ids: clipIds })
        });
      }

      showToast(`Deleted folder "${bundle.title}"`);
      if (onRefreshLibrary) onRefreshLibrary();
    } catch (err) {
      console.error('Failed to delete bundle:', err);
      showToast('Error removing folder');
    }
  };

  // Multi-Bundle Bulk Actions
  const toggleSelectBundle = (bundleId) => {
    setSelectedBundleIds((prev) =>
      prev.includes(bundleId) ? prev.filter((id) => id !== bundleId) : [...prev, bundleId]
    );
  };

  const handleSelectAllBundles = () => {
    if (selectedBundleIds.length === filteredBundles.length && filteredBundles.length > 0) {
      setSelectedBundleIds([]);
    } else {
      setSelectedBundleIds(filteredBundles.map((b) => b.id));
    }
  };

  // Download all selected bundles
  const handleBulkDownloadBundles = async () => {
    const selectedBundles = filteredBundles.filter((b) => selectedBundleIds.includes(b.id));
    const allSelectedClips = selectedBundles.flatMap((b) => b.clips);
    if (allSelectedClips.length === 0) return;

    try {
      setIsDownloadingBulk(true);
      await downloadClipsList(allSelectedClips, `shorts across ${selectedBundles.length} folders`);
    } finally {
      setIsDownloadingBulk(false);
    }
  };

  // Delete all selected bundles
  const handleBulkDeleteBundles = async () => {
    const selectedBundles = filteredBundles.filter((b) => selectedBundleIds.includes(b.id));
    const totalClips = selectedBundles.reduce((acc, b) => acc + b.clips.length, 0);
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedBundles.length} folders (${totalClips} shorts total)?`)) return;

    try {
      setIsDeletingBulk(true);
      const allClipIds = selectedBundles.flatMap((b) => b.clips.map((c) => c.id));
      setRemovedClipIds((prev) => new Set([...prev, ...allClipIds]));
      setSelectedBundleIds([]);

      // Trigger deletion on backend
      for (const b of selectedBundles) {
        if (b.sourceType === 'job') {
          await fetch(`${backendUrl}/api/jobs/${b.jobId}`, { method: 'DELETE' });
        }
      }
      await fetch(`${backendUrl}/api/clips/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clip_ids: allClipIds })
      });

      showToast(`Deleted ${selectedBundles.length} folders successfully`);
      if (onRefreshLibrary) onRefreshLibrary();
    } catch (err) {
      console.error('Failed bulk delete bundles:', err);
      showToast('Error removing folders');
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const toggleSelectClip = (clipId) => {
    setSelectedClipIds((prev) =>
      prev.includes(clipId) ? prev.filter((id) => id !== clipId) : [...prev, clipId]
    );
  };

  const handleSelectAllClips = () => {
    if (selectedClipIds.length === filteredClips.length && filteredClips.length > 0) {
      setSelectedClipIds([]);
    } else {
      setSelectedClipIds(filteredClips.map((c) => c.id));
    }
  };

  const allVisibleClipsSelected = filteredClips.length > 0 && selectedClipIds.length === filteredClips.length;
  const allVisibleBundlesSelected = filteredBundles.length > 0 && selectedBundleIds.length === filteredBundles.length;

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', position: 'relative', paddingBottom: '90px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#181818',
            border: '1px solid var(--spotify-green)',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: 'var(--radius-full)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 12px rgba(30, 215, 96, 0.3)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 700
          }}
        >
          <Check size={16} color="var(--spotify-green)" weight="bold" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header and View Switcher */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FolderOpen size={28} weight="fill" color="var(--spotify-green)" />
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>
              My Saved Shorts
            </h2>
            <span
              style={{
                background: 'rgba(30, 215, 96, 0.15)',
                color: 'var(--spotify-green)',
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '12px',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)'
              }}
            >
              {allClipsWithMeta.length} Stored Locally
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-subdued)', marginTop: '4px' }}>
            Reframed 9:16 vertical shorts saved directly on your local device.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* View Mode Toggle: [Project Folders / Bundles] vs [All Shorts Grid] */}
          {!activeBundle && (
            <div
              style={{
                display: 'flex',
                background: '#181818',
                padding: '3px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid #282828'
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('bundles')}
                style={{
                  background: viewMode === 'bundles' ? '#27272a' : 'transparent',
                  color: viewMode === 'bundles' ? '#ffffff' : 'var(--text-subdued)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Folders size={16} weight={viewMode === 'bundles' ? 'fill' : 'regular'} color={viewMode === 'bundles' ? 'var(--spotify-green)' : 'currentColor'} />
                <span>Project Folders ({projectBundles.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('all_clips')}
                style={{
                  background: viewMode === 'all_clips' ? '#27272a' : 'transparent',
                  color: viewMode === 'all_clips' ? '#ffffff' : 'var(--text-subdued)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <GridFour size={16} weight={viewMode === 'all_clips' ? 'fill' : 'regular'} color={viewMode === 'all_clips' ? 'var(--spotify-green)' : 'currentColor'} />
                <span>All Shorts ({allClipsWithMeta.length})</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={async () => {
              try {
                await openLocalClipsFolder(backendUrl);
                showToast('Opening storage clips folder in Windows Explorer...');
              } catch {
                showToast('Failed to open folder');
              }
            }}
            className="btn-spotify-secondary"
            style={{ fontSize: '12px', padding: '8px 14px', gap: '6px' }}
            title="Open local Windows folder containing all rendered shorts"
          >
            <FolderOpen size={16} weight="bold" color="var(--spotify-green)" />
            <span>Open Storage Folder</span>
          </button>

          {onCreateNew && (
            <button
              type="button"
              onClick={onCreateNew}
              className="btn-spotify-primary"
              style={{ fontSize: '13px', padding: '9px 18px', gap: '8px' }}
            >
              <Sparkle size={16} weight="fill" />
              <span>Create New Short</span>
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb if drilled into a folder */}
      {activeBundle && (
        <div
          style={{
            background: '#161616',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setActiveBundle(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--spotify-green)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 700
              }}
            >
              <ArrowLeft size={16} weight="bold" />
              <span>Back to All Project Folders</span>
            </button>
            <span style={{ color: '#444444' }}>|</span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
              📁 {activeBundle.title} ({activeBundle.clips.length} shorts)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleDownloadBundle(activeBundle)}
              disabled={isDownloadingBulk}
              className="btn-spotify-primary"
              style={{ padding: '7px 14px', fontSize: '12px', gap: '6px' }}
            >
              <DownloadSimple size={15} weight="bold" />
              <span>Download Entire Folder ({activeBundle.clips.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Advanced Filter Toolbar */}
      <div
        style={{
          background: '#161616',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        {/* Row 1: Search, Date Filter, and Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#0d0d0d',
              padding: '9px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #2a2a2a',
              flex: '1 1 260px',
              minWidth: '220px'
            }}
          >
            <MagnifyingGlass size={16} color="var(--text-subdued)" />
            <input
              type="text"
              placeholder={viewMode === 'bundles' && !activeBundle ? 'Search project folders, titles...' : 'Search title, keywords, tags...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#ffffff',
                fontSize: '13px',
                width: '100%'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-subdued)',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Date-wise Filter Dropdown */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#0d0d0d',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: dateFilter !== 'all' ? '1px solid var(--spotify-green)' : '1px solid #2a2a2a'
            }}
          >
            <Calendar size={16} color={dateFilter !== 'all' ? 'var(--spotify-green)' : 'var(--text-subdued)'} weight="bold" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: dateFilter !== 'all' ? '#ffffff' : 'var(--text-subdued)',
                fontSize: '12px',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all" style={{ background: '#1c1c1c', color: '#fff' }}>All Dates</option>
              <option value="today" style={{ background: '#1c1c1c', color: '#fff' }}>Today</option>
              {availableDates.map(({ date, count }) => (
                <option key={date} value={date} style={{ background: '#1c1c1c', color: '#fff' }}>
                  {date} ({count})
                </option>
              ))}
              <option value="custom" style={{ background: '#1c1c1c', color: '#fff' }}>Calendar Date...</option>
            </select>

            {dateFilter === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                style={{
                  background: '#1c1c1c',
                  border: '1px solid #333333',
                  borderRadius: '4px',
                  color: '#ffffff',
                  fontSize: '11px',
                  padding: '3px 6px',
                  outline: 'none'
                }}
              />
            )}
          </div>

          {/* Hook Score Filter */}
          {(viewMode === 'all_clips' || activeBundle) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#0d0d0d',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: hookFilter !== 'all' ? '1px solid var(--spotify-green)' : '1px solid #2a2a2a'
              }}
            >
              <Fire size={16} color={hookFilter !== 'all' ? 'var(--spotify-green)' : 'var(--text-subdued)'} weight="fill" />
              <select
                value={hookFilter}
                onChange={(e) => setHookFilter(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: hookFilter !== 'all' ? '#ffffff' : 'var(--text-subdued)',
                  fontSize: '12px',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="all" style={{ background: '#1c1c1c', color: '#fff' }}>All Hook Scores</option>
                <option value="viral85" style={{ background: '#1c1c1c', color: '#fff' }}>Viral Hooks (85%+)</option>
                <option value="high75" style={{ background: '#1c1c1c', color: '#fff' }}>High Retention (75%+)</option>
              </select>
            </div>
          )}

          {/* Duration Filter */}
          {(viewMode === 'all_clips' || activeBundle) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#0d0d0d',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: durationFilter !== 'all' ? '1px solid var(--spotify-green)' : '1px solid #2a2a2a'
              }}
            >
              <Clock size={16} color={durationFilter !== 'all' ? 'var(--spotify-green)' : 'var(--text-subdued)'} weight="bold" />
              <select
                value={durationFilter}
                onChange={(e) => setDurationFilter(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: durationFilter !== 'all' ? '#ffffff' : 'var(--text-subdued)',
                  fontSize: '12px',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="all" style={{ background: '#1c1c1c', color: '#fff' }}>All Lengths</option>
                <option value="quick30" style={{ background: '#1c1c1c', color: '#fff' }}>Snappy (&lt;30s)</option>
                <option value="standard" style={{ background: '#1c1c1c', color: '#fff' }}>Standard (30s-60s)</option>
              </select>
            </div>
          )}

          {/* Sort Order */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#0d0d0d',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #2a2a2a'
            }}
          >
            <SortAscending size={16} color="var(--text-subdued)" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="newest" style={{ background: '#1c1c1c', color: '#fff' }}>Newest First</option>
              <option value="oldest" style={{ background: '#1c1c1c', color: '#fff' }}>Oldest First</option>
              <option value="hook_high" style={{ background: '#1c1c1c', color: '#fff' }}>Highest Hook Score</option>
              <option value="duration_short" style={{ background: '#1c1c1c', color: '#fff' }}>Shortest Duration</option>
              <option value="duration_long" style={{ background: '#1c1c1c', color: '#fff' }}>Longest Duration</option>
            </select>
          </div>
        </div>

        {/* Row 2: Select All & Count Badges */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid #222222',
            paddingTop: '12px',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {viewMode === 'bundles' && !activeBundle ? (
              /* Select All Bundles */
              <button
                type="button"
                onClick={handleSelectAllBundles}
                disabled={filteredBundles.length === 0}
                style={{
                  background: allVisibleBundlesSelected ? 'rgba(30, 215, 96, 0.15)' : '#222222',
                  border: allVisibleBundlesSelected ? '1px solid var(--spotify-green)' : '1px solid #333333',
                  color: allVisibleBundlesSelected ? 'var(--spotify-green)' : '#ffffff',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {allVisibleBundlesSelected ? <CheckSquare size={16} weight="fill" /> : <Square size={16} />}
                <span>{allVisibleBundlesSelected ? 'Deselect All Folders' : `Select All Folders (${filteredBundles.length})`}</span>
              </button>
            ) : (
              /* Select All Clips */
              <button
                type="button"
                onClick={handleSelectAllClips}
                disabled={filteredClips.length === 0}
                style={{
                  background: allVisibleClipsSelected ? 'rgba(30, 215, 96, 0.15)' : '#222222',
                  border: allVisibleClipsSelected ? '1px solid var(--spotify-green)' : '1px solid #333333',
                  color: allVisibleClipsSelected ? 'var(--spotify-green)' : '#ffffff',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {allVisibleClipsSelected ? <CheckSquare size={16} weight="fill" /> : <Square size={16} />}
                <span>{allVisibleClipsSelected ? 'Deselect All Shorts' : `Select All Shorts (${filteredClips.length})`}</span>
              </button>
            )}

            {viewMode === 'bundles' && !activeBundle && selectedBundleIds.length > 0 && (
              <span style={{ fontSize: '12px', color: 'var(--spotify-green)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {selectedBundleIds.length} of {filteredBundles.length} folders selected
              </span>
            )}

            {(viewMode === 'all_clips' || activeBundle) && selectedClipIds.length > 0 && (
              <span style={{ fontSize: '12px', color: 'var(--spotify-green)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {selectedClipIds.length} of {filteredClips.length} shorts selected
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-subdued)' }}>
              {viewMode === 'bundles' && !activeBundle
                ? `Showing ${filteredBundles.length} of ${projectBundles.length} project folders`
                : `Showing ${filteredClips.length} shorts`}
            </span>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                style={{
                  background: 'transparent',
                  border: '1px solid #333333',
                  borderRadius: 'var(--radius-full)',
                  padding: '4px 10px',
                  color: 'var(--text-subdued)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <ArrowCounterClockwise size={12} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: PROJECT FOLDERS / BUNDLES VIEW */}
      {viewMode === 'bundles' && !activeBundle && (
        <div>
          {filteredBundles.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '64px 20px',
                background: '#181818',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed #333333'
              }}
            >
              <Folders size={48} color="var(--text-subdued)" weight="thin" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', marginTop: '12px' }}>
                No matching project folders found
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-subdued)', marginTop: '4px' }}>
                Try clearing your search or date filter.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="btn-spotify-secondary"
                style={{ fontSize: '13px', padding: '8px 18px', marginTop: '12px' }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '22px'
              }}
            >
              {filteredBundles.map((bundle) => {
                const isSelected = selectedBundleIds.includes(bundle.id);
                return (
                  <div
                    key={bundle.id}
                    className="spotify-card"
                    style={{
                      background: '#151515',
                      border: isSelected ? '1px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: isSelected ? '0 0 20px rgba(30, 215, 96, 0.2)' : 'var(--shadow-heavy)',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                  >
                    {/* Header with Checkbox, Folder Icon & Title */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '14px' }}>
                      <button
                        type="button"
                        onClick={() => toggleSelectBundle(bundle.id)}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          background: isSelected ? 'var(--spotify-green)' : '#222222',
                          border: isSelected ? '1px solid var(--spotify-green)' : '1px solid #444444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                          marginTop: '2px'
                        }}
                        title={isSelected ? 'Deselect folder' : 'Select folder for bulk action'}
                      >
                        {isSelected && <Check size={16} weight="bold" color="#000000" />}
                      </button>

                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(30, 215, 96, 0.12)',
                          border: '1px solid rgba(30, 215, 96, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <Folder size={26} color="var(--spotify-green)" weight="fill" />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3
                          style={{
                            fontSize: '15px',
                            fontWeight: 800,
                            color: '#ffffff',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={bundle.title}
                        >
                          {bundle.title}
                        </h3>
                        <div style={{ fontSize: '11px', color: 'var(--text-subdued)', marginTop: '3px' }}>
                          📅 {bundle.date}
                        </div>
                      </div>
                    </div>

                    {/* Metadata Strip */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '16px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <span
                        style={{
                          background: 'rgba(30, 215, 96, 0.15)',
                          color: 'var(--spotify-green)',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '11px',
                          fontWeight: 800,
                          fontFamily: 'var(--font-mono)'
                        }}
                      >
                        📦 {bundle.clips.length} {bundle.clips.length === 1 ? 'Short' : 'Shorts'}
                      </span>
                      <span
                        style={{
                          background: '#222222',
                          color: '#ffffff',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)'
                        }}
                      >
                        ⏱️ ~{Math.round(bundle.totalDuration / 60)}m {Math.round(bundle.totalDuration % 60)}s
                      </span>
                      <span
                        style={{
                          background: '#222222',
                          color: 'var(--text-subdued)',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)'
                        }}
                      >
                        🔥 {bundle.avgHookScore} Hook
                      </span>
                    </div>

                    {/* Preview snippets of clips inside */}
                    <div
                      style={{
                        background: '#0c0c0c',
                        border: '1px solid #222222',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px',
                        marginBottom: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      {bundle.clips.slice(0, 3).map((c, cIdx) => (
                        <div
                          key={c.id || cIdx}
                          style={{
                            fontSize: '11px',
                            color: '#b3b3b3',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span style={{ color: 'var(--spotify-green)', fontSize: '9px' }}>▶</span>
                          <span>{c.suggested_headline || c.title || `Short #${cIdx + 1}`}</span>
                        </div>
                      ))}
                      {bundle.clips.length > 3 && (
                        <div style={{ fontSize: '10px', color: 'var(--text-subdued)', fontStyle: 'italic' }}>
                          + {bundle.clips.length - 3} more shorts inside
                        </div>
                      )}
                    </div>

                    {/* Action Buttons on Folder Card */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto' }}>
                      <button
                        type="button"
                        onClick={() => setActiveBundle(bundle)}
                        className="btn-spotify-primary"
                        style={{ flex: 1, padding: '9px 14px', fontSize: '12px', justifyContent: 'center' }}
                      >
                        <span>Open Folder</span>
                        <ArrowRight size={14} weight="bold" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadBundle(bundle)}
                        disabled={isDownloadingBulk}
                        className="btn-spotify-secondary"
                        style={{ padding: '9px 12px' }}
                        title="Download entire bundle"
                      >
                        <DownloadSimple size={16} weight="bold" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteBundle(bundle)}
                        className="btn-spotify-secondary"
                        style={{ padding: '9px 12px', color: '#f87171' }}
                        title="Delete entire project folder"
                      >
                        <Trash size={16} weight="bold" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: ALL SHORTS GRID (OR INSIDE A DRILLED FOLDER) */}
      {(viewMode === 'all_clips' || activeBundle) && (
        <div>
          {filteredClips.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '64px 20px',
                background: '#181818',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed #333333'
              }}
            >
              <FolderOpen size={48} color="var(--text-subdued)" weight="thin" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', marginTop: '12px' }}>
                No matching saved shorts found
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-subdued)', marginTop: '4px' }}>
                Try adjusting your search query or date filter.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="btn-spotify-secondary"
                style={{ fontSize: '13px', padding: '8px 18px', marginTop: '12px' }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
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
                const isDeleting = deletingId === clip.id;
                const isSelected = selectedClipIds.includes(clip.id);

                return (
                  <div
                    key={clip.id || idx}
                    className="spotify-card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-heavy)',
                      border: isSelected ? '1px solid var(--spotify-green)' : '1px solid var(--border-subtle)',
                      opacity: isDeleting ? 0.35 : 1,
                      transition: 'border 0.15s ease, opacity 0.2s ease',
                      position: 'relative'
                    }}
                  >
                    {/* 9:16 Video Preview Container */}
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
                      {/* Select Checkbox (Top Left) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectClip(clip.id);
                        }}
                        style={{
                          position: 'absolute',
                          top: '12px',
                          left: '12px',
                          zIndex: 10,
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: isSelected ? 'var(--spotify-green)' : 'rgba(0, 0, 0, 0.65)',
                          backdropFilter: 'blur(4px)',
                          border: isSelected ? '1px solid var(--spotify-green)' : '1px solid rgba(255, 255, 255, 0.3)',
                          color: isSelected ? '#000000' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        title={isSelected ? 'Deselect short' : 'Select short for bulk action'}
                      >
                        {isSelected && <Check size={16} weight="bold" color="#000000" />}
                      </button>

                      {/* Speaker Notch Aesthetic */}
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
                          Video preview unavailable
                        </div>
                      )}

                      {/* Viral Hook Pill Badge (Top Right) */}
                      <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 3 }}>
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
                          <span>{clip.hook_score || 88}/100 VIRAL</span>
                        </div>
                      </div>

                      {/* Duration Badge (Bottom Left) */}
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
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Clock size={12} />
                        <span>{Math.round(clip.duration || 30)}s</span>
                      </div>

                      {/* Created Date Badge (Bottom Right) */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '12px',
                          right: '12px',
                          zIndex: 3,
                          background: 'rgba(18, 18, 18, 0.9)',
                          color: '#ffffff',
                          border: '1px solid #2e2e2e',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '10px',
                          fontFamily: 'var(--font-mono)'
                        }}
                      >
                        {clip.dateFormatted}
                      </div>
                    </div>

                    {/* Content Section: Title, Headline, Combined Description, Tags */}
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      {/* Title */}
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: 800,
                          color: '#ffffff',
                          marginBottom: clip.suggested_headline ? '4px' : '8px',
                          lineHeight: 1.3
                        }}
                      >
                        {clip.title || clip.suggested_headline || 'Viral Short'}
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
                          <p
                            style={{
                              fontSize: '12px',
                              color: '#b3b3b3',
                              lineHeight: 1.45,
                              marginBottom: '10px',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                            title={combinedDesc}
                          >
                            {combinedDesc}
                          </p>
                        );
                      })()}

                      {/* Tags */}
                      {clip.hashtags && clip.hashtags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '14px' }}>
                          {clip.hashtags.map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              style={{
                                background: '#1c1c1c',
                                border: '1px solid #2a2a2a',
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
                                background: copiedType === `${clip.id}_title` ? 'rgba(30, 215, 96, 0.15)' : '#181818',
                                color: copiedType === `${clip.id}_title` ? 'var(--spotify-green)' : '#ffffff',
                                borderColor: copiedType === `${clip.id}_title` ? 'var(--spotify-green)' : '#333333'
                              }}
                              title="Copy Title"
                            >
                              {copiedType === `${clip.id}_title` ? <Check size={11} weight="bold" /> : <Copy size={11} />}
                              <span>Title</span>
                            </button>

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
                                background: copiedType === `${clip.id}_headline` ? 'rgba(30, 215, 96, 0.15)' : '#181818',
                                color: copiedType === `${clip.id}_headline` ? 'var(--spotify-green)' : '#ffffff',
                                borderColor: copiedType === `${clip.id}_headline` ? 'var(--spotify-green)' : '#333333'
                              }}
                              title="Copy Suggested Headline"
                            >
                              {copiedType === `${clip.id}_headline` ? <Check size={11} weight="bold" /> : <Copy size={11} />}
                              <span>Headline</span>
                            </button>

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
                                background: copiedType === `${clip.id}_desc` ? 'rgba(30, 215, 96, 0.15)' : '#181818',
                                color: copiedType === `${clip.id}_desc` ? 'var(--spotify-green)' : '#ffffff',
                                borderColor: copiedType === `${clip.id}_desc` ? 'var(--spotify-green)' : '#333333'
                              }}
                              title="Copy Description"
                            >
                              {copiedType === `${clip.id}_desc` ? <Check size={11} weight="bold" /> : <Copy size={11} />}
                              <span>Desc</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleCopyText(
                                  clip.id,
                                  'tags',
                                  Array.isArray(clip.hashtags)
                                    ? clip.hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ')
                                    : clip.hashtags || '#shorts #viral #reels'
                                )
                              }
                              className="btn-spotify-secondary"
                              style={{
                                padding: '7px 2px',
                                fontSize: '10px',
                                justifyContent: 'center',
                                gap: '3px',
                                background: copiedType === `${clip.id}_tags` ? 'rgba(30, 215, 96, 0.15)' : '#181818',
                                color: copiedType === `${clip.id}_tags` ? 'var(--spotify-green)' : '#ffffff',
                                borderColor: copiedType === `${clip.id}_tags` ? 'var(--spotify-green)' : '#333333'
                              }}
                              title="Copy Tags"
                            >
                              {copiedType === `${clip.id}_tags` ? <Check size={11} weight="bold" /> : <Copy size={11} />}
                              <span>Tags</span>
                            </button>
                          </div>
                        );
                      })()}

                      {/* Primary Actions */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: 'auto' }}>
                        {videoSrc ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleDownloadSingleClip(clip)}
                              disabled={downloadingClipId === clip.id}
                              className="btn-spotify-primary"
                              style={{
                                flex: 1,
                                padding: '9px 12px',
                                fontSize: '11px',
                                justifyContent: 'center',
                                cursor: downloadingClipId === clip.id ? 'wait' : 'pointer',
                                opacity: downloadingClipId === clip.id ? 0.75 : 1
                              }}
                              title="Download MP4 video directly"
                            >
                              <DownloadSimple size={15} weight="bold" />
                              <span>{downloadingClipId === clip.id ? 'Saving...' : 'Download'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyLink(clip.id, videoSrc)}
                              className="btn-spotify-secondary"
                              style={{ padding: '9px 10px' }}
                              title="Copy video URL"
                            >
                              {isCopied ? <Check size={15} weight="bold" color="var(--spotify-green)" /> : <Copy size={15} />}
                            </button>

                            <a
                              href={videoSrc}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-spotify-secondary"
                              style={{ padding: '9px 10px', textDecoration: 'none' }}
                              title="Open video in new tab"
                            >
                              <ArrowSquareOut size={15} weight="bold" />
                            </a>

                            <button
                              type="button"
                              onClick={async () => {
                                const clipFile = clip.rendered_url ? clip.rendered_url.split('/').pop().split('?')[0] : `${clip.id}.mp4`;
                                await openLocalClipsFolder(backendUrl, clipFile);
                                showToast('Showing file in Windows Explorer...');
                              }}
                              className="btn-spotify-secondary"
                              style={{ padding: '9px 10px' }}
                              title="Show this file in Windows Explorer"
                            >
                              <FolderOpen size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteClip(clip.id)}
                              disabled={isDeleting}
                              className="btn-spotify-secondary"
                              style={{
                                padding: '9px 10px',
                                color: '#f87171',
                                borderColor: 'rgba(248, 113, 113, 0.3)'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(248, 113, 113, 0.15)';
                                e.currentTarget.style.borderColor = '#f87171';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.3)';
                              }}
                              title="Delete this short permanently"
                            >
                              <Trash size={15} weight="bold" />
                            </button>
                          </>
                        ) : (
                          <div style={{ fontSize: '12px', color: 'var(--text-subdued)' }}>
                            Local file unavailable
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Floating Toolbar 1: Multi-Bundle Actions Bar */}
      {viewMode === 'bundles' && !activeBundle && selectedBundleIds.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#181818',
            border: '1px solid var(--spotify-green)',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.85), 0 0 20px rgba(30, 215, 96, 0.25)',
            borderRadius: 'var(--radius-full)',
            padding: '10px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            zIndex: 1000,
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                background: 'var(--spotify-green)',
                color: '#000000',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '11px'
              }}
            >
              {selectedBundleIds.length}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
              Project Folders Selected
            </span>
          </div>

          <div style={{ height: '20px', width: '1px', background: '#333333' }} />

          <button
            type="button"
            onClick={handleBulkDownloadBundles}
            disabled={isDownloadingBulk}
            className="btn-spotify-primary"
            style={{ padding: '8px 16px', fontSize: '12px', gap: '6px' }}
          >
            <DownloadSimple size={16} weight="bold" />
            <span>{isDownloadingBulk ? 'Downloading...' : `Download ${selectedBundleIds.length} Folders`}</span>
          </button>

          <button
            type="button"
            onClick={handleBulkDeleteBundles}
            disabled={isDeletingBulk}
            style={{
              background: 'rgba(248, 113, 113, 0.15)',
              border: '1px solid #f87171',
              color: '#f87171',
              borderRadius: 'var(--radius-full)',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Trash size={16} weight="bold" />
            <span>{isDeletingBulk ? 'Deleting...' : `Delete ${selectedBundleIds.length} Folders`}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedBundleIds([])}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-subdued)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              padding: '4px 6px'
            }}
          >
            Deselect All
          </button>
        </div>
      )}

      {/* Floating Toolbar 2: Multi-Clip Actions Bar */}
      {(viewMode === 'all_clips' || activeBundle) && selectedClipIds.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#181818',
            border: '1px solid var(--spotify-green)',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.85), 0 0 20px rgba(30, 215, 96, 0.25)',
            borderRadius: 'var(--radius-full)',
            padding: '10px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            zIndex: 1000,
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                background: 'var(--spotify-green)',
                color: '#000000',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '11px'
              }}
            >
              {selectedClipIds.length}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
              Shorts Selected
            </span>
          </div>

          <div style={{ height: '20px', width: '1px', background: '#333333' }} />

          <button
            type="button"
            onClick={handleBulkDownloadClips}
            disabled={isDownloadingBulk}
            className="btn-spotify-primary"
            style={{ padding: '8px 16px', fontSize: '12px', gap: '6px' }}
          >
            <DownloadSimple size={16} weight="bold" />
            <span>{isDownloadingBulk ? 'Downloading...' : `Download Bulk (${selectedClipIds.length})`}</span>
          </button>

          <button
            type="button"
            onClick={handleBulkDeleteClips}
            disabled={isDeletingBulk}
            style={{
              background: 'rgba(248, 113, 113, 0.15)',
              border: '1px solid #f87171',
              color: '#f87171',
              borderRadius: 'var(--radius-full)',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Trash size={16} weight="bold" />
            <span>{isDeletingBulk ? 'Deleting...' : `Delete Bulk (${selectedClipIds.length})`}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedClipIds([])}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-subdued)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              padding: '4px 6px'
            }}
          >
            Deselect All
          </button>
        </div>
      )}
    </div>
  );
}
