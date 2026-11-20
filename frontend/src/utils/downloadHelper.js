/**
 * Direct file downloader utility with native Save As location picker.
 *
 * 1. Prompts user with native OS "Save As" dialog (window.showSaveFilePicker)
 *    IMMEDIATELY on click to preserve transient user activation!
 * 2. Fetches and writes directly to chosen file on disk.
 * 3. Gracefully handles user cancel (AbortError).
 * 4. Falls back to standard anchor download if showSaveFilePicker is not supported.
 */

export const sanitizeFilename = (name) => {
  if (!name) return 'short.mp4';
  const clean = name.replace(/[^a-zA-Z0-9_\-\.\s]/g, '').trim().replace(/\s+/g, '_');
  if (clean.toLowerCase().endsWith('.mp4') || clean.toLowerCase().endsWith('.zip')) {
    return clean;
  }
  return `${clean}.mp4`;
};

export const downloadVideoFile = async (
  videoUrl,
  suggestedFilename,
  backendUrl = 'http://127.0.0.1:8001',
  onProgress = null
) => {
  const filename = sanitizeFilename(suggestedFilename);
  const isZip = filename.toLowerCase().endsWith('.zip');

  // Derive direct attachment endpoint
  let targetUrl = videoUrl;
  if (videoUrl && (videoUrl.includes('/api/clips/') || videoUrl.includes('/sniper/clips/'))) {
    const clipFile = videoUrl.split(/\/api\/clips\/|\/sniper\/clips\//).pop().split('?')[0];
    targetUrl = `${backendUrl}/api/download-clip/${clipFile}?title=${encodeURIComponent(filename)}`;
  } else if (!targetUrl.startsWith('http')) {
    targetUrl = `${backendUrl}${targetUrl}`;
  }

  // 1. MUST CALL showSaveFilePicker IMMEDIATELY to preserve transient user activation!
  if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function') {
    let fileHandle = null;
    try {
      fileHandle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: isZip ? 'ZIP Archive (*.zip)' : 'MP4 Video (*.mp4)',
            accept: isZip
              ? { 'application/zip': ['.zip'] }
              : { 'video/mp4': ['.mp4'] }
          }
        ]
      });
    } catch (pickerErr) {
      if (pickerErr.name === 'AbortError') {
        // User explicitly cancelled the Save As dialog
        return { success: false, cancelled: true };
      }
      console.warn('showSaveFilePicker dialog error, falling back to blob/anchor:', pickerErr);
    }

    // User picked location! Now fetch and write:
    if (fileHandle) {
      if (onProgress) {
        onProgress({ phase: 'fetching', message: 'Downloading package from server...' });
      }

      const res = await fetch(targetUrl);
      if (!res.ok) {
        throw new Error(`Download response failed with status ${res.status}`);
      }

      if (onProgress) {
        onProgress({ phase: 'writing', message: 'Saving file to selected folder...' });
      }

      const writable = await fileHandle.createWritable();
      const blob = await res.blob();
      await writable.write(blob);
      await writable.close();
      return { success: true, saved: true, filename: fileHandle.name || filename };
    }
  }

  // 2. Fallback: Blob -> temporary anchor tag download
  try {
    const res = await fetch(targetUrl);
    if (!res.ok) throw new Error(`Download response status: ${res.status}`);
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 15000);
    return { success: true, saved: true, filename };
  } catch (err) {
    console.warn('Blob fallback failed, trying direct link navigation:', err);
    const fallbackLink = document.createElement('a');
    fallbackLink.style.display = 'none';
    fallbackLink.href = targetUrl;
    fallbackLink.setAttribute('download', filename);
    document.body.appendChild(fallbackLink);
    fallbackLink.click();
    document.body.removeChild(fallbackLink);
    return { success: true, saved: true, filename };
  }
};

/**
 * Tells the backend to open the local storage directory in Windows File Explorer
 * or highlight a specific clip file.
 */
export const openLocalClipsFolder = async (backendUrl = 'http://127.0.0.1:8001', clipFilename = null) => {
  try {
    const url = `${backendUrl}/api/open-clips-folder${clipFilename ? `?filename=${encodeURIComponent(clipFilename)}` : ''}`;
    const res = await fetch(url, { method: 'POST' });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Failed to open local clips folder:', err);
    return { status: 'error', message: err.message };
  }
};
