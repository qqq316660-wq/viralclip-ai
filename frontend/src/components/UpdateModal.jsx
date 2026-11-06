import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkle,
  ArrowClockwise,
  CheckCircle,
  WarningCircle,
  CloudArrowDown,
  ClockCounterClockwise,
  Gear,
  DownloadSimple,
  SpinnerGap,
  ArrowRight,
  ShieldCheck,
  Lightning
} from '@phosphor-icons/react';

export default function UpdateModal({
  isOpen,
  onClose,
  backendUrl = 'http://127.0.0.1:8001',
  initialUpdateInfo = null,
  onUpdateSuccess = null
}) {
  const [activeTab, setActiveTab] = useState('update'); // 'update' | 'backups' | 'settings'
  const [isChecking, setIsChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(initialUpdateInfo);
  const [checkError, setCheckError] = useState('');

  // Live Update Task State
  const [taskState, setTaskState] = useState({
    state: 'idle', // idle | checking | downloading | backing_up | applying | completed | rolling_back | error
    progress: 0,
    message: '',
    error: null
  });

  // Backups and Settings
  const [backups, setBackups] = useState([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [updateConfig, setUpdateConfig] = useState(null);
  const [customManifestUrl, setCustomManifestUrl] = useState('');
  const [configSaveStatus, setConfigSaveStatus] = useState('');

  useEffect(() => {
    if (initialUpdateInfo) {
      setUpdateInfo(initialUpdateInfo);
    }
  }, [initialUpdateInfo]);

  useEffect(() => {
    if (isOpen) {
      fetchUpdateStatus();
      if (!updateInfo) {
        handleCheckForUpdates();
      }
      fetchBackups();
      fetchConfig();
    }
  }, [isOpen]);

  // Poll progress when task is active
  useEffect(() => {
    let timer = null;
    if (
      taskState.state === 'downloading' ||
      taskState.state === 'verifying' ||
      taskState.state === 'backing_up' ||
      taskState.state === 'applying' ||
      taskState.state === 'rolling_back'
    ) {
      timer = setInterval(fetchUpdateStatus, 500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [taskState.state]);

  const fetchUpdateStatus = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/updater/status`);
      if (res.ok) {
        const data = await res.json();
        // Clear out non-critical update check errors automatically
        if (data.state === 'error' && (data.message?.toLowerCase().includes('check') || data.error?.toLowerCase().includes('check') || data.error?.toLowerCase().includes('404'))) {
          setTaskState({ state: 'idle', progress: 0, message: '', error: null });
          fetch(`${backendUrl}/api/updater/dismiss-error`, { method: 'POST' }).catch(() => {});
        } else {
          setTaskState(data);
        }
        if (data.state === 'completed' && onUpdateSuccess) {
          onUpdateSuccess(data.target_version);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    setCheckError('');
    try {
      const res = await fetch(`${backendUrl}/api/updater/check`);
      if (res.ok) {
        const data = await res.json();
        setUpdateInfo(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setCheckError(err.detail || 'Could not connect to update service.');
      }
    } catch {
      setCheckError('Backend server not reachable for updates.');
    } finally {
      setIsChecking(false);
    }
  };

  const fetchBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const res = await fetch(`${backendUrl}/api/updater/backups`);
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/updater/config`);
      if (res.ok) {
        const data = await res.json();
        setUpdateConfig(data);
        setCustomManifestUrl(data.manifest_url || '');
      }
    } catch {
      // ignore
    }
  };

  const handleSaveConfig = async () => {
    setConfigSaveStatus('Saving...');
    try {
      const res = await fetch(`${backendUrl}/api/updater/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manifest_url: customManifestUrl.trim() })
      });
      if (res.ok) {
        setConfigSaveStatus('Saved successfully!');
        setTimeout(() => setConfigSaveStatus(''), 2500);
        handleCheckForUpdates();
      } else {
        setConfigSaveStatus('Failed to save.');
      }
    } catch {
      setConfigSaveStatus('Error saving config.');
    }
  };

  const handleInstallUpdate = async () => {
    if (!updateInfo || !updateInfo.download_url) return;
    setTaskState({
      state: 'downloading',
      progress: 5,
      message: 'Starting update download...',
      error: null
    });
    try {
      const res = await fetch(`${backendUrl}/api/updater/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          download_url: updateInfo.download_url,
          checksum: updateInfo.checksum,
          version: updateInfo.latest_version || updateInfo.version
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setTaskState({
          state: 'error',
          progress: 0,
          message: 'Failed to start update',
          error: err.detail || 'Could not start update process'
        });
      }
    } catch (err) {
      setTaskState({
        state: 'error',
        progress: 0,
        message: 'Network error',
        error: String(err)
      });
    }
  };

  const handleRollback = async (backupFilename = null) => {
    if (!window.confirm('Are you sure you want to rollback to the previous version?')) return;
    setTaskState({
      state: 'rolling_back',
      progress: 10,
      message: 'Starting rollback restore...',
      error: null
    });
    try {
      const res = await fetch(`${backendUrl}/api/updater/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup_filename: backupFilename })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setTaskState({
          state: 'error',
          progress: 0,
          message: 'Rollback failed to start',
          error: err.detail || 'Could not execute rollback'
        });
      }
    } catch (err) {
      setTaskState({
        state: 'error',
        progress: 0,
        message: 'Network error during rollback',
        error: String(err)
      });
    }
  };

  const handleRestart = async () => {
    try {
      await fetch(`${backendUrl}/api/updater/restart`, { method: 'POST' });
    } catch {
      // ignore
    }
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  if (!isOpen) return null;

  const isWorking = [
    'downloading',
    'verifying',
    'backing_up',
    'applying',
    'rolling_back'
  ].includes(taskState.state);

  const formatSize = (bytes) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    if (mb < 1.0) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={(e) => {
        if (!isWorking && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#121212',
          border: '1px solid #282828',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.8)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #222222',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#181818'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: updateInfo?.update_available ? 'rgba(30, 215, 96, 0.15)' : '#242424',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: updateInfo?.update_available ? 'var(--spotify-green)' : '#ffffff'
              }}
            >
              <Lightning size={20} weight="fill" />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                ViralClip AI Studio Updater
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-subdued)' }}>
                Current Version: <strong style={{ color: '#ffffff' }}>v{updateInfo?.current_version || '1.6.0'}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleCheckForUpdates}
              disabled={isChecking || isWorking}
              title="Check for updates now"
              style={{
                background: '#242424',
                border: '1px solid #333333',
                color: '#ffffff',
                borderRadius: 'var(--radius-full)',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: isChecking ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ArrowClockwise size={13} className={isChecking ? 'spin-animation' : ''} />
              <span>{isChecking ? 'Checking...' : 'Check Now'}</span>
            </button>

            {!isWorking && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-subdued)',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            padding: '10px 24px',
            borderBottom: '1px solid #1e1e1e',
            background: '#141414',
            gap: '8px'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('update')}
            style={{
              background: activeTab === 'update' ? '#242424' : 'transparent',
              color: activeTab === 'update' ? '#ffffff' : 'var(--text-subdued)',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <CloudArrowDown size={14} weight="bold" />
            <span>Update</span>
            {updateInfo?.update_available && (
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--spotify-green)',
                  marginLeft: '2px'
                }}
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('backups');
              fetchBackups();
            }}
            style={{
              background: activeTab === 'backups' ? '#242424' : 'transparent',
              color: activeTab === 'backups' ? '#ffffff' : 'var(--text-subdued)',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ClockCounterClockwise size={14} />
            <span>Rollback Backups {backups.length > 0 ? `(${backups.length})` : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            style={{
              background: activeTab === 'settings' ? '#242424' : 'transparent',
              color: activeTab === 'settings' ? '#ffffff' : 'var(--text-subdued)',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Gear size={14} />
            <span>Settings</span>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* Active Work Progress Card */}
          {isWorking && (
            <div
              style={{
                background: '#181818',
                border: '1px solid #2e2e2e',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '16px',
                textAlign: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}>
                <SpinnerGap size={20} className="spin-animation" color="var(--spotify-green)" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                  {taskState.message || 'Processing update...'}
                </span>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  background: '#282828',
                  borderRadius: '10px',
                  height: '8px',
                  overflow: 'hidden',
                  margin: '12px 0 8px'
                }}
              >
                <div
                  style={{
                    background: 'var(--spotify-green)',
                    height: '100%',
                    width: `${taskState.progress}%`,
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-subdued)' }}>
                {taskState.progress}% completed • Please do not close the window.
              </div>
            </div>
          )}

          {/* Success Card */}
          {taskState.state === 'completed' && (
            <div
              style={{
                background: 'rgba(30, 215, 96, 0.08)',
                border: '1px solid rgba(30, 215, 96, 0.35)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '16px',
                textAlign: 'center'
              }}
            >
              <CheckCircle size={32} weight="fill" color="var(--spotify-green)" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
                {taskState.message || 'Update Installed Successfully!'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-subdued)', marginBottom: '16px' }}>
                All backend pipelines and web assets have been upgraded cleanly.
              </div>
              <button
                type="button"
                onClick={handleRestart}
                style={{
                  background: 'var(--spotify-green)',
                  color: '#000000',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  padding: '9px 24px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Restart Studio Now
              </button>
            </div>
          )}

          {/* Error Card */}
          {taskState.state === 'error' && (
            <div
              style={{
                background: 'rgba(255, 77, 77, 0.08)',
                border: '1px solid rgba(255, 77, 77, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <WarningCircle size={22} weight="fill" color="#ff4d4d" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>Update Operation Failed</div>
                  <div style={{ fontSize: '12px', color: '#ff6b6b', marginTop: '2px' }}>
                    {taskState.error || taskState.message}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  setTaskState({ state: 'idle', progress: 0, message: '', error: null });
                  try {
                    await fetch(`${backendUrl}/api/updater/dismiss-error`, { method: 'POST' });
                  } catch {}
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-subdued)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Dismiss Error"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* TAB 1: UPDATE SCREEN */}
          {activeTab === 'update' && !isWorking && taskState.state !== 'completed' && (
            <div>
              {/* Rollback Directive Alert */}
              {updateInfo?.rollback_required ? (
                <div
                  style={{
                    background: 'rgba(255, 170, 0, 0.08)',
                    border: '1px solid rgba(255, 170, 0, 0.4)',
                    borderRadius: '12px',
                    padding: '18px 20px',
                    marginBottom: '18px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <WarningCircle size={20} weight="fill" color="#ffaa00" />
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#ffaa00' }}>
                      STABILITY ROLLBACK DIRECTIVE
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#dddddd', lineHeight: '1.5' }}>
                    The developer has requested an immediate rollback to stable version{' '}
                    <strong style={{ color: '#ffffff' }}>v{updateInfo.rollback_target}</strong>.
                  </div>
                  {updateInfo.changelog && (
                    <div style={{ fontSize: '11px', color: 'var(--text-subdued)', marginTop: '8px' }}>
                      Reason: {updateInfo.changelog[0]}
                    </div>
                  )}
                  <div style={{ marginTop: '14px' }}>
                    <button
                      type="button"
                      onClick={() => handleRollback()}
                      style={{
                        background: '#ffaa00',
                        color: '#000000',
                        border: 'none',
                        borderRadius: 'var(--radius-full)',
                        padding: '8px 20px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      Rollback to v{updateInfo.rollback_target} Now
                    </button>
                  </div>
                </div>
              ) : updateInfo?.update_available ? (
                <div>
                  {/* New Version Hero Banner */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, rgba(30, 215, 96, 0.12) 0%, rgba(20, 20, 20, 0.8) 100%)',
                      border: '1px solid rgba(30, 215, 96, 0.3)',
                      borderRadius: '14px',
                      padding: '20px',
                      marginBottom: '18px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <span
                        style={{
                          background: 'var(--spotify-green)',
                          color: '#000000',
                          padding: '2px 10px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '11px',
                          fontWeight: 800,
                          textTransform: 'uppercase'
                        }}
                      >
                        ⚡ New Update Available
                      </span>
                      {updateInfo.size_bytes > 0 && (
                        <span style={{ fontSize: '11px', color: 'var(--text-subdued)', fontFamily: 'var(--font-mono)' }}>
                          Patch Size: {formatSize(updateInfo.size_bytes)}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0 6px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-subdued)' }}>
                        v{updateInfo.current_version}
                      </span>
                      <ArrowRight size={18} color="var(--spotify-green)" weight="bold" />
                      <span style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff' }}>
                        v{updateInfo.latest_version}
                      </span>
                    </div>

                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                      {updateInfo.title || `ViralClip AI v${updateInfo.latest_version}`}
                    </div>
                  </div>

                  {/* Changelog Box */}
                  <div
                    style={{
                      background: '#161616',
                      border: '1px solid #262626',
                      borderRadius: '12px',
                      padding: '16px 18px',
                      marginBottom: '20px'
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkle size={14} color="var(--spotify-green)" weight="fill" />
                      <span>What's New in this Patch:</span>
                    </div>

                    <ul style={{ margin: 0, paddingLeft: '18px', color: '#cccccc', fontSize: '12px', lineHeight: '1.6' }}>
                      {(updateInfo.changelog || ['Minor fixes and stability updates.']).map((point, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={onClose}
                      style={{
                        background: '#242424',
                        color: 'var(--text-subdued)',
                        border: '1px solid #333333',
                        borderRadius: 'var(--radius-full)',
                        padding: '10px 20px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Remind Me Later
                    </button>

                    <button
                      type="button"
                      onClick={handleInstallUpdate}
                      style={{
                        background: 'var(--spotify-green)',
                        color: '#000000',
                        border: 'none',
                        borderRadius: 'var(--radius-full)',
                        padding: '10px 26px',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 16px rgba(30, 215, 96, 0.35)',
                        transition: 'transform 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
                    >
                      <DownloadSimple size={16} weight="bold" />
                      <span>Update Now (Instant Patch)</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Up to Date State */
                <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'rgba(30, 215, 96, 0.1)',
                      color: 'var(--spotify-green)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px'
                    }}
                  >
                    <ShieldCheck size={32} weight="fill" />
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
                    You're running the latest version!
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-subdued)', maxWidth: '360px', margin: '0 auto 20px' }}>
                    ViralClip AI Studio v{updateInfo?.current_version || '1.6.0'} is up to date. You will be automatically notified whenever a new patch is published.
                  </div>

                  <button
                    type="button"
                    onClick={handleCheckForUpdates}
                    disabled={isChecking}
                    style={{
                      background: '#242424',
                      color: '#ffffff',
                      border: '1px solid #333333',
                      borderRadius: 'var(--radius-full)',
                      padding: '8px 20px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <ArrowClockwise size={14} className={isChecking ? 'spin-animation' : ''} />
                    <span>Check for Updates Again</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BACKUPS & ROLLBACK */}
          {activeTab === 'backups' && (
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-subdued)', marginBottom: '14px', lineHeight: '1.4' }}>
                Whenever you install an update, a safe backup of your previous working version is automatically created. If an update ever causes an issue, you can restore a previous version with 1-click.
              </div>

              {isLoadingBackups ? (
                <div style={{ textAlign: 'center', padding: '30px' }}>
                  <SpinnerGap size={24} className="spin-animation" color="var(--spotify-green)" />
                </div>
              ) : backups.length === 0 ? (
                <div
                  style={{
                    padding: '24px',
                    background: '#161616',
                    borderRadius: '12px',
                    textAlign: 'center',
                    color: 'var(--text-subdued)',
                    fontSize: '12px'
                  }}
                >
                  No previous backup snapshots found yet. Backups are generated automatically during every update.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {backups.map((b, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#181818',
                        border: '1px solid #282828',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                          Backup v{b.version}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-subdued)', marginTop: '2px' }}>
                          Created: {b.created_at} • Size: {formatSize(b.size_bytes)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRollback(b.filename)}
                        disabled={isWorking}
                        style={{
                          background: 'rgba(255, 170, 0, 0.12)',
                          color: '#ffaa00',
                          border: '1px solid rgba(255, 170, 0, 0.3)',
                          borderRadius: 'var(--radius-full)',
                          padding: '5px 14px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Restore this Version
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SETTINGS */}
          {activeTab === 'settings' && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                Remote Manifest URL (version.json):
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-subdued)', marginBottom: '10px', lineHeight: '1.4' }}>
                The endpoint where ViralClip AI Studio looks for update releases. You can point this to your GitHub raw file, Cloudflare bucket, or local test server (e.g. <code>http://127.0.0.1:8085/version.json</code>).
              </div>

              <input
                type="text"
                value={customManifestUrl}
                onChange={(e) => setCustomManifestUrl(e.target.value)}
                placeholder="https://raw.githubusercontent.com/.../version.json"
                style={{
                  width: '100%',
                  background: '#1c1c1c',
                  border: '1px solid #333333',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '12px',
                  color: '#ffffff',
                  marginBottom: '14px',
                  fontFamily: 'var(--font-mono)'
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--spotify-green)', fontWeight: 600 }}>
                  {configSaveStatus}
                </span>

                <button
                  type="button"
                  onClick={handleSaveConfig}
                  style={{
                    background: 'var(--spotify-green)',
                    color: '#000000',
                    border: 'none',
                    borderRadius: 'var(--radius-full)',
                    padding: '8px 20px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Save Manifest URL
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

