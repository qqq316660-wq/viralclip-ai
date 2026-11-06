import React, { useState, useEffect } from 'react';
import { WarningCircle } from '@phosphor-icons/react';
import Header from './components/Header';
import StepBar from './components/StepBar';
import IngestionPanel from './components/IngestionPanel';
import SettingsBar from './components/SettingsBar';
import JobProgress from './components/JobProgress';
import ClipGallery from './components/ClipGallery';
import SavedLibrary from './components/SavedLibrary';
import Footer from './components/Footer';
import ActivationModal from './components/ActivationModal';
import LicenseInfoModal from './components/LicenseInfoModal';
import CookieModal from './components/CookieModal';
import UpdateModal from './components/UpdateModal';

const BACKEND_URL = (typeof window !== 'undefined' && window.location.port === '5173')
  ? 'http://127.0.0.1:8001'
  : (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8001');

export default function App() {
  const [systemInfo, setSystemInfo] = useState(null);

  // License State (Node-locked offline system)
  const [licenseStatus, setLicenseStatus] = useState(null);
  const [isLicenseLoaded, setIsLicenseLoaded] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(true);
  const [showLicenseDetails, setShowLicenseDetails] = useState(false);
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);

  // View Mode: 'studio' | 'library'
  const [currentView, setCurrentView] = useState('studio');
  const [savedJobs, setSavedJobs] = useState([]);


  // Onboarding Step State: 1 = Ingest, 2 = Settings, 3 = Neural Progress, 4 = Gallery
  const [currentStep, setCurrentStep] = useState(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(1);

  // Media Inputs
  const [activeTab, setActiveTab] = useState('url'); // 'url', 'file', or 'history'
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedSrt, setUploadedSrt] = useState(null);
  const [selectedHistoryVideo, setSelectedHistoryVideo] = useState(null);
  const [videoQuality, setVideoQuality] = useState('1080p');
  const [hasSrtOption, setHasSrtOption] = useState(null); // 'yes' | 'no' | null
  const [hasColabOption, setHasColabOption] = useState(null); // 'yes' | 'no' | null

  // Repurpose Settings
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [fitMode, setFitMode] = useState('blur_padding');
  const [subtitleStyle, setSubtitleStyle] = useState('single_word_pop');
  const [captionPosition, setCaptionPosition] = useState('bottom');
  const [captionOffsetX, setCaptionOffsetX] = useState(0);
  const [captionOffsetY, setCaptionOffsetY] = useState(0);
  const [captionScale, setCaptionScale] = useState(1.0);
  const [numClips, setNumClips] = useState(3);
  const [selectionMode, setSelectionMode] = useState('ai_prompt');
  const [colabUrl, setColabUrl] = useState('');

  // Background Music (BGM) Settings
  const [uploadedMusic, setUploadedMusic] = useState(null);
  const [musicVolume, setMusicVolume] = useState(0.20);
  const [originalVolume, setOriginalVolume] = useState(1.00);
  const [musicStartTime, setMusicStartTime] = useState(0.0);

  // Template & Branding Area Settings (Defaulted OFF for clean step-by-step UX)
  const [templatePreset, setTemplatePreset] = useState('none');
  const [templateBgColor, setTemplateBgColor] = useState('');
  const [templateCardPadding, setTemplateCardPadding] = useState(false);
  const [templateCornerRadius, setTemplateCornerRadius] = useState(14);
  const [templateHookEnabled, setTemplateHookEnabled] = useState(false);
  const [templateHookMode, setTemplateHookMode] = useState('ai_hook'); // 'ai_hook' | 'custom'
  const [templateHookText, setTemplateHookText] = useState('');
  const [templateHookColor, setTemplateHookColor] = useState('#000000');
  const [templateHookBg, setTemplateHookBg] = useState('transparent');
  const [templateHookBgColor, setTemplateHookBgColor] = useState('#facc15');
  const [templateHookRadius, setTemplateHookRadius] = useState(14);
  const [templateHookBorder, setTemplateHookBorder] = useState(false);
  const [templateHookBorderColor, setTemplateHookBorderColor] = useState('#000000');
  const [templateHookX, setTemplateHookX] = useState(50);
  const [templateHookY, setTemplateHookY] = useState(48);
  const [templateHookSize, setTemplateHookSize] = useState(15);
  const [templateLogoEnabled, setTemplateLogoEnabled] = useState(false);
  const [uploadedLogo, setUploadedLogo] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(null);
  const [templateLogoPosition, setTemplateLogoPosition] = useState('top_left');
  const [templateLogoX, setTemplateLogoX] = useState(8);
  const [templateLogoY, setTemplateLogoY] = useState(7);
  const [templateLogoSize, setTemplateLogoSize] = useState(36);
  const [templateLogoOpacity, setTemplateLogoOpacity] = useState(1.0);
  const [templateWatermarkEnabled, setTemplateWatermarkEnabled] = useState(false);
  const [templateWatermarkType, setTemplateWatermarkType] = useState('text');
  const [templateWatermarkText, setTemplateWatermarkText] = useState('');
  const [templateWatermarkPosition, setTemplateWatermarkPosition] = useState('bottom_center');
  const [templateWatermarkX, setTemplateWatermarkX] = useState(50);
  const [templateWatermarkY, setTemplateWatermarkY] = useState(22);
  const [templateWatermarkColor, setTemplateWatermarkColor] = useState('#a1a1aa');
  const [templateWatermarkOpacity, setTemplateWatermarkOpacity] = useState(0.85);

  // Social Card Settings (Clean & Normal Defaults)
  const [templateSocialCardEnabled, setTemplateSocialCardEnabled] = useState(false);
  const [templateChannelName, setTemplateChannelName] = useState('ViralClip AI');
  const [templateChannelHandle, setTemplateChannelHandle] = useState('@viral_clip_ai');
  const [templateLikeSubscribeEnabled, setTemplateLikeSubscribeEnabled] = useState(false);
  const [templateSocialCardBg, setTemplateSocialCardBg] = useState('#0c0f14');
  const [templateSocialFooterEnabled, setTemplateSocialFooterEnabled] = useState(false);

  // Processing State
  const [currentJob, setCurrentJob] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch Saved Jobs for Library
  const fetchSavedJobs = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/jobs`);
      if (res.ok) {
        const data = await res.json();
        setSavedJobs(data || []);
      }
    } catch {
      // Backend not yet connected
    }
  };

  // Total count of all saved clips across completed jobs
  const savedClipsCount = (savedJobs || []).reduce((acc, job) => {
    if ((job.status === 'completed' || (job.clips && job.clips.length > 0)) && job.clips) {
      return acc + job.clips.length;
    }
    return acc;
  }, 0);

  // Fetch System Hardware Status, License Status & Saved Jobs on Mount
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/system`)
      .then((res) => res.json())
      .then((data) => setSystemInfo(data))
      .catch(() => {});

    // Check License Status (Offline Node-Lock)
    fetch(`${BACKEND_URL}/api/license/status`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.is_activated) {
          setLicenseStatus(data);
          setIsBackendConnected(true);
        } else if (data) {
          setLicenseStatus(null);
          setIsBackendConnected(true);
        } else {
          setIsBackendConnected(false);
        }
        setIsLicenseLoaded(true);
      })
      .catch(() => {
        setIsBackendConnected(false);
        setIsLicenseLoaded(false);
      });

    fetchSavedJobs();

    // Check for Software Updates & Rollback Directives
    fetch(`${BACKEND_URL}/api/updater/check`)
      .then((res) => (res.ok ? res.json() : null))
      .then((updateData) => {
        if (updateData) {
          setUpdateInfo(updateData);
          if (updateData.update_available || updateData.rollback_required) {
            setTimeout(() => {
              setShowUpdateModal(true);
            }, 600);
          }
        }
      })
      .catch(() => {});


    // Check if there was an active job in localStorage
    const lastJobId = localStorage.getItem('viralclip_active_job_id');
    if (lastJobId) {
      fetch(`${BACKEND_URL}/api/jobs/${lastJobId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((jobData) => {
          if (jobData) {
            setCurrentJob(jobData);
            if (jobData.status === 'completed') {
              setMaxUnlockedStep(4);
              setCurrentStep(4);
            } else if (
              jobData.status === 'rendering' ||
              jobData.status === 'awaiting_clips' ||
              jobData.status === 'transcribing' ||
              jobData.status === 'downloading'
            ) {
              setIsProcessing(true);
              setMaxUnlockedStep(3);
              setCurrentStep(3);
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  // Proactively check for software updates when backend is connected
  useEffect(() => {
    if (!isBackendConnected) return;
    const timer = setTimeout(() => {
      fetch(`${BACKEND_URL}/api/updater/check`)
        .then((res) => (res.ok ? res.json() : null))
        .then((updateData) => {
          if (updateData) {
            setUpdateInfo(updateData);
            if (updateData.update_available || updateData.rollback_required) {
              setShowUpdateModal(true);
            }
          }
        })
        .catch(() => {});
    }, 1000);
    return () => clearTimeout(timer);
  }, [isBackendConnected]);

  // Poll Job Progress when active
  useEffect(() => {
    let interval = null;
    if (currentJob && currentJob.status !== 'completed' && currentJob.status !== 'failed') {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/jobs/${currentJob.job_id}`);
          if (res.ok) {
            const data = await res.json();
            setCurrentJob(data);
            if (data.status === 'completed') {
              setIsProcessing(false);
              setMaxUnlockedStep(4);
              setCurrentStep(4);
              fetchSavedJobs();
            } else if (data.status === 'failed') {
              setIsProcessing(false);
              setErrorMessage(data.error || 'Job failed during execution.');
              fetchSavedJobs();
            }
          }
        } catch {
          // Retry polling
        }
      }, 1200);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentJob]);

  // Step 1 -> Step 2
  const handleContinueToSettings = () => {
    setErrorMessage('');
    if (activeTab === 'history') {
      if (!selectedHistoryVideo) {
        setErrorMessage('Please select a processed video from history to continue.');
        return;
      }
      setMaxUnlockedStep((prev) => Math.max(prev, 2));
      setCurrentStep(2);
      return;
    }
    if (activeTab === 'url' && !videoUrl.trim()) {
      setErrorMessage('Please enter a valid video link or YouTube URL.');
      return;
    }
    if (activeTab === 'file' && !uploadedFile) {
      setErrorMessage('Please select or drop a video file.');
      return;
    }
    if (hasSrtOption === 'yes' && !uploadedSrt) {
      setErrorMessage('You indicated you have a .SRT file, please upload it to continue.');
      return;
    }
    if (hasSrtOption === 'no' && hasColabOption === 'yes' && !colabUrl.trim()) {
      setErrorMessage('Please enter your Kaggle GPU tunnel URL to continue.');
      return;
    }
    if (hasSrtOption === 'no' && hasColabOption === 'no') {
      setErrorMessage('Transcription requires either an uploaded .SRT subtitle file or a Kaggle GPU connection.');
      return;
    }
    if (hasSrtOption === null) {
      setErrorMessage('Please confirm whether you have a .SRT file or require Kaggle Free GPU.');
      return;
    }
    setMaxUnlockedStep((prev) => Math.max(prev, 2));
    setCurrentStep(2);
  };

  // Step 2 -> Step 3 (Start Generation)
  const handleStartGeneration = async () => {
    setErrorMessage('');
    try {
      setIsProcessing(true);
      setCurrentStep(3);
      setMaxUnlockedStep((prev) => Math.max(prev, 3));

      let uploadId = null;
      let subtitleUploadId = null;

      // 1. Upload local video file if file tab is active
      if (activeTab === 'file' && uploadedFile) {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        const upRes = await fetch(`${BACKEND_URL}/api/upload`, {
          method: 'POST',
          body: formData
        });
        if (!upRes.ok) throw new Error('Failed to upload video file to backend server');
        const upData = await upRes.json();
        uploadId = upData.upload_id;
      }

      // 2. Upload optional SRT subtitle file if attached
      if (uploadedSrt) {
        const srtFormData = new FormData();
        srtFormData.append('file', uploadedSrt);
        const srtRes = await fetch(`${BACKEND_URL}/api/upload`, {
          method: 'POST',
          body: srtFormData
        });
        if (!srtRes.ok) throw new Error('Failed to upload subtitle track to backend server');
        const srtData = await srtRes.json();
        subtitleUploadId = srtData.upload_id;
      }

      // 3. Upload optional background music file if attached
      let musicUploadId = null;
      if (uploadedMusic) {
        const musicFormData = new FormData();
        musicFormData.append('file', uploadedMusic);
        const musicRes = await fetch(`${BACKEND_URL}/api/upload`, {
          method: 'POST',
          body: musicFormData
        });
        if (!musicRes.ok) throw new Error('Failed to upload background music track to backend server');
        const musicData = await musicRes.json();
        musicUploadId = musicData.upload_id;
      }

      // 3.5 Upload optional custom logo file if attached
      let logoUploadId = null;
      if ((templateLogoEnabled || templateSocialCardEnabled) && uploadedLogo) {
        const logoFormData = new FormData();
        logoFormData.append('file', uploadedLogo);
        const logoRes = await fetch(`${BACKEND_URL}/api/upload`, {
          method: 'POST',
          body: logoFormData
        });
        if (logoRes.ok) {
          const logoData = await logoRes.json();
          logoUploadId = logoData.upload_id;
        }
      }

      // 4. Submit Generation Job
      const payload = {
        video_url: activeTab === 'url' ? videoUrl.trim() : null,
        upload_id: activeTab === 'file' ? uploadId : null,
        subtitle_upload_id: activeTab === 'file' ? subtitleUploadId : null,
        reuse_job_id: activeTab === 'history' && selectedHistoryVideo ? selectedHistoryVideo.reuse_job_id : null,
        reuse_video_id: activeTab === 'history' && selectedHistoryVideo ? selectedHistoryVideo.reuse_video_id : null,
        colab_transcribe_url: activeTab === 'url' && colabUrl.trim() ? colabUrl.trim() : null,
        video_quality: videoQuality,
        aspect_ratio: aspectRatio,
        fit_mode: fitMode,
        subtitle_style: subtitleStyle,
        caption_position: captionPosition,
        caption_offset_x: captionOffsetX,
        caption_offset_y: captionOffsetY,
        caption_scale: captionScale,
        num_clips: numClips,
        min_clip_duration: 25,
        max_clip_duration: 60,
        selection_mode: selectionMode,
        music_upload_id: musicUploadId,
        music_volume: musicVolume,
        original_volume: originalVolume,
        music_start_time: musicStartTime,
        template_preset: templatePreset,
        template_bg_color: templateBgColor,
        template_card_padding: templateCardPadding,
        template_corner_radius: templateCornerRadius,
        template_hook_enabled: templateHookEnabled,
        template_hook_mode: templateHookMode,
        template_hook_text: templateHookMode === 'custom' && templateHookText?.trim() ? templateHookText.trim() : null,
        template_hook_color: templateHookColor,
        template_hook_bg: templateHookBg,
        template_hook_bg_color: templateHookBgColor,
        template_hook_x: templateHookX,
        template_hook_y: templateHookY,
        template_logo_upload_id: logoUploadId,
        template_logo_enabled: templateLogoEnabled,
        template_logo_position: templateLogoPosition,
        template_logo_x: templateLogoX,
        template_logo_y: templateLogoY,
        template_logo_size: templateLogoSize,
        template_logo_opacity: templateLogoOpacity,
        template_watermark_enabled: templateWatermarkEnabled,
        template_watermark_text: templateWatermarkEnabled && templateWatermarkText?.trim() ? templateWatermarkText.trim() : null,
        template_watermark_position: templateWatermarkPosition,
        template_watermark_x: templateWatermarkX,
        template_watermark_y: templateWatermarkY,
        template_watermark_color: templateWatermarkColor,
        template_watermark_opacity: templateWatermarkOpacity,
        template_social_card_enabled: templateSocialCardEnabled,
        template_channel_name: templateChannelName,
        template_channel_handle: templateChannelHandle,
        template_like_subscribe_enabled: false,
        template_social_card_bg: templateSocialCardBg,
        template_social_footer_enabled: templateSocialFooterEnabled
      };

      const jobRes = await fetch(`${BACKEND_URL}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!jobRes.ok) {
        const errData = await jobRes.json();
        throw new Error(errData.detail || 'Could not queue generation job on backend');
      }

      const jobData = await jobRes.json();
      setCurrentJob(jobData);
      localStorage.setItem('viralclip_active_job_id', jobData.job_id);
    } catch (err) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'An unexpected error occurred during job initiation');
      setCurrentStep(2);
    }
  };

  // Submit approved AI clips to resume pipeline rendering
  const handleSubmitClips = async (clips) => {
    if (!currentJob) return;
    const res = await fetch(`${BACKEND_URL}/api/jobs/${currentJob.job_id}/submit-clips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clips })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to submit clips to rendering engine');
    }
    const updated = await res.json();
    setCurrentJob(updated);
  };

  // Skip AI review and proceed with automated heuristic
  const handleSkipToHeuristic = async () => {
    if (!currentJob) return;
    const res = await fetch(`${BACKEND_URL}/api/jobs/${currentJob.job_id}/submit-clips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ use_heuristic: true })
    });
    if (res.ok) {
      const updated = await res.json();
      setCurrentJob(updated);
    }
  };

  // Reset Onboarding flow to create new clips
  const handleResetOnboarding = () => {
    const activeId = localStorage.getItem('viralclip_active_job_id');
    // Only cancel if actively running and not completed
    if (activeId && isProcessing && currentJob && currentJob.status !== 'completed') {
      fetch(`${BACKEND_URL}/api/jobs/${activeId}/cancel`, { method: 'POST' }).catch(() => {});
    }
    localStorage.removeItem('viralclip_active_job_id');
    setCurrentJob(null);
    setIsProcessing(false);
    setVideoUrl('');
    setUploadedFile(null);
    setUploadedSrt(null);
    setVideoQuality('1080p');
    setAspectRatio('9:16');
    setFitMode('blur_padding');
    setSubtitleStyle('single_word_pop');
    setCaptionPosition('bottom');
    setCaptionOffsetX(0);
    setCaptionOffsetY(0);
    setCaptionScale(1.0);
    setHasSrtOption(null);
    setHasColabOption(null);
    setColabUrl('');
    setSelectedHistoryVideo(null);
    setCurrentStep(1);
    setMaxUnlockedStep(1);
    fetchSavedJobs();
  };

  const handleAppShutdown = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/app/shutdown`, { method: 'POST' });
    } catch {}
    window.close();
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', margin: 0, padding: 0 }}>
      {/* Offline Backend Alert Banner */}
      {!isBackendConnected && (
        <div
          style={{
            maxWidth: '720px',
            margin: '20px auto',
            background: 'rgba(234, 179, 8, 0.1)',
            border: '1px solid #eab308',
            color: '#fef08a',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            fontSize: '13px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <WarningCircle size={20} weight="fill" color="#eab308" />
            <div>
              <strong>Backend Offline:</strong> Cannot connect to local ViralClip AI server on <code>{BACKEND_URL}</code>.
              <div style={{ fontSize: '11px', color: '#fef9c3', marginTop: '2px' }}>
                Make sure the desktop application is running. Once connected, your hardware license activates automatically.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              fetch(`${BACKEND_URL}/api/license/status`)
                .then((res) => (res.ok ? res.json() : null))
                .then((data) => {
                  if (data) {
                    setIsBackendConnected(true);
                    if (data.is_activated) setLicenseStatus(data);
                    setIsLicenseLoaded(true);
                  }
                })
                .catch(() => {});
            }}
            style={{
              background: '#eab308',
              color: '#000000',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Onboarding & License Activation Modal (Shows if unlicensed and backend is connected) */}
      {isBackendConnected && isLicenseLoaded && (!licenseStatus || !licenseStatus.is_activated) && (
        <ActivationModal
          backendUrl={BACKEND_URL}
          onActivated={(newLic) => {
            setLicenseStatus({
              is_activated: true,
              license_key: newLic.key,
              registered_name: newLic.registered_name,
              registered_phone: newLic.registered_phone,
              hwid: newLic.hwid,
              offline_ready: true,
              status: "active"
            });
          }}
        />
      )}

      {/* License Details Modal (When user clicks Pro badge) */}
      {showLicenseDetails && (
        <LicenseInfoModal
          license={licenseStatus}
          onClose={() => setShowLicenseDetails(false)}
        />
      )}

      {/* Cookie Management Modal (Bypasses YouTube bot verification & age-restrictions) */}
      <CookieModal
        isOpen={showCookieModal}
        onClose={() => setShowCookieModal(false)}
        backendUrl={BACKEND_URL}
      />

      {/* Live OTA Update & Rollback Modal */}
      <UpdateModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        backendUrl={BACKEND_URL}
        initialUpdateInfo={updateInfo}
        onUpdateSuccess={(newVer) => {
          setUpdateInfo((prev) => prev ? { ...prev, update_available: false, current_version: newVer } : null);
        }}
      />

      {/* Centered Spotify Hero Header with Navigation */}
      <Header
        systemInfo={systemInfo}
        currentView={currentView}
        onSelectView={setCurrentView}
        savedClipsCount={savedClipsCount}
        license={licenseStatus}
        onOpenLicenseModal={() => setShowLicenseDetails(true)}
        onOpenCookieModal={() => setShowCookieModal(true)}
        updateInfo={updateInfo}
        onOpenUpdateModal={() => setShowUpdateModal(true)}
        isProcessing={isProcessing || currentJob?.status === 'awaiting_clips'}
        onCancelJob={handleResetOnboarding}
        onShutdown={handleAppShutdown}
      />

      {/* New Software Update Available Banner (Sticky Notification) */}
      {updateInfo?.update_available && !showUpdateModal && (
        <div
          style={{
            maxWidth: '1240px',
            margin: '12px auto 0',
            width: 'calc(100% - 40px)',
            background: 'linear-gradient(90deg, rgba(30, 215, 96, 0.16) 0%, rgba(20, 20, 20, 0.95) 100%)',
            border: '1px solid rgba(30, 215, 96, 0.45)',
            color: '#ffffff',
            borderRadius: '12px',
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span
              style={{
                background: 'var(--spotify-green)',
                color: '#000000',
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '6px'
              }}
            >
              UPDATE v{updateInfo.latest_version}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>
              {updateInfo.title || `ViralClip AI v${updateInfo.latest_version} is available!`}
            </span>
            {updateInfo.changelog?.[0] && (
              <span style={{ color: 'var(--text-subdued)', fontSize: '12px' }}>
                • {updateInfo.changelog[0]}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowUpdateModal(true)}
            style={{
              background: 'var(--spotify-green)',
              color: '#000000',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: '6px 16px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Update Now
          </button>
        </div>
      )}

      <main style={{ maxWidth: '1240px', width: '100%', margin: '0 auto', padding: '0 20px 60px', flex: 1 }}>
        {/* Saved Shorts Library View */}
        {currentView === 'library' ? (
          <SavedLibrary
            savedJobs={savedJobs}
            backendUrl={BACKEND_URL}
            onRefreshLibrary={fetchSavedJobs}
            onCreateNew={() => {
              setCurrentView('studio');
              handleResetOnboarding();
            }}
          />
        ) : (
          /* Studio Creation Flow */
          <>
            {/* Step-by-Step Onboarding Navigation */}
            <StepBar
              currentStep={currentStep}
              onSelectStep={(step) => setCurrentStep(step)}
              maxUnlockedStep={maxUnlockedStep}
            />

            {/* Error Notification Banner */}
            {errorMessage && (
              <div
                style={{
                  maxWidth: '720px',
                  margin: '0 auto 24px',
                  background: '#281518',
                  border: '1px solid var(--text-negative)',
                  color: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '13px'
                }}
              >
                <WarningCircle size={20} weight="fill" color="var(--text-negative)" />
                <div style={{ flex: 1 }}>{errorMessage}</div>
                <button
                  type="button"
                  onClick={() => setErrorMessage('')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-subdued)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '11px',
                    textTransform: 'uppercase'
                  }}
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Step 1: Ingest Media Source */}
            {currentStep === 1 && (
              <IngestionPanel
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                videoUrl={videoUrl}
                setVideoUrl={setVideoUrl}
                uploadedFile={uploadedFile}
                setUploadedFile={setUploadedFile}
                uploadedSrt={uploadedSrt}
                setUploadedSrt={setUploadedSrt}
                selectedHistoryVideo={selectedHistoryVideo}
                setSelectedHistoryVideo={setSelectedHistoryVideo}
                onSelectHistoryVideo={(vid) => {
                  setSelectedHistoryVideo(vid);
                  setActiveTab('history');
                  setMaxUnlockedStep((prev) => Math.max(prev, 2));
                  setCurrentStep(2);
                }}
                videoQuality={videoQuality}
                setVideoQuality={setVideoQuality}
                hasSrtOption={hasSrtOption}
                setHasSrtOption={setHasSrtOption}
                hasColabOption={hasColabOption}
                setHasColabOption={setHasColabOption}
                colabUrl={colabUrl}
                setColabUrl={setColabUrl}
                backendUrl={BACKEND_URL}
                isProcessing={isProcessing}
                onContinue={handleContinueToSettings}
                onOpenCookieModal={() => setShowCookieModal(true)}
              />
            )}

            {/* Step 2: Repurpose Specs Settings */}
            {currentStep === 2 && (
              <SettingsBar
                activeTab={activeTab}
                videoUrl={videoUrl}
                uploadedFile={uploadedFile}
                uploadedSrt={uploadedSrt}
                selectedHistoryVideo={selectedHistoryVideo}
                videoQuality={videoQuality}
                aspectRatio={aspectRatio}
                setAspectRatio={setAspectRatio}
                fitMode={fitMode}
                setFitMode={setFitMode}
                subtitleStyle={subtitleStyle}
                setSubtitleStyle={setSubtitleStyle}
                captionPosition={captionPosition}
                setCaptionPosition={setCaptionPosition}
                captionOffsetX={captionOffsetX}
                setCaptionOffsetX={setCaptionOffsetX}
                captionOffsetY={captionOffsetY}
                setCaptionOffsetY={setCaptionOffsetY}
                captionScale={captionScale}
                setCaptionScale={setCaptionScale}
                numClips={numClips}
                setNumClips={setNumClips}
                selectionMode={selectionMode}
                setSelectionMode={setSelectionMode}
                colabUrl={colabUrl}
                isProcessing={isProcessing}
                onBack={() => setCurrentStep(1)}
                onStartGeneration={handleStartGeneration}
                uploadedMusic={uploadedMusic}
                setUploadedMusic={setUploadedMusic}
                musicVolume={musicVolume}
                setMusicVolume={setMusicVolume}
                originalVolume={originalVolume}
                setOriginalVolume={setOriginalVolume}
                musicStartTime={musicStartTime}
                setMusicStartTime={setMusicStartTime}
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
              />
            )}

            {/* Step 3: Neural Processing Progress */}
            {currentStep === 3 && (
              <JobProgress
                job={currentJob}
                backendUrl={BACKEND_URL}
                onSubmitClips={handleSubmitClips}
                onSkipToHeuristic={handleSkipToHeuristic}
                onViewClips={() => {
                  setMaxUnlockedStep(4);
                  setCurrentStep(4);
                }}
                onRetry={() => {
                  setCurrentJob(null);
                  setIsProcessing(false);
                  setCurrentStep(2);
                }}
                onStartNew={handleResetOnboarding}
              />
            )}

            {/* Step 4: Viral Shorts Gallery */}
            {currentStep === 4 && (
              <ClipGallery
                clips={currentJob?.clips}
                backendUrl={BACKEND_URL}
                onStartNew={handleResetOnboarding}
                onOpenLibrary={() => setCurrentView('library')}
              />
            )}
          </>
        )}
      </main>

      <Footer
        systemInfo={systemInfo}
        currentView={currentView}
        onSelectView={setCurrentView}
        savedClipsCount={savedClipsCount}
      />
    </div>
  );
}
