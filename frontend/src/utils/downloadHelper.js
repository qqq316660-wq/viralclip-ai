/**
 * Direct file downloader utility that triggers native browser downloads
 * directly to the user's disk without opening video players or new tabs.
 */

export const sanitizeFilename = (name) => {
  if (!name) return 'short.mp4';
  const clean = name.replace(/[^a-zA-Z0-9_\-\.\s]/g, '').trim().replace(/\s+/g, '_');
  return clean.toLowerCase().endsWith('.mp4') ? clean : `${clean}.mp4`;
};

/**
 * Downloads a video file directly to the user's computer.
 *
 * Why this works:
 * 1. Cross-origin <a href="..." download> tags are ignored by modern browsers,
 *    causing Chrome to navigate to the MP4 file and display the black screen player.
 * 2. Fetching the file as a Blob and creating an in-memory `blob:` object URL makes
 *    the download same-origin, forcing Chrome/Edge/Firefox to trigger an immediate,
 *    direct file save without any player or new tab.
 * 3. As an additional guarantee, the backend endpoint sends
 *    'Content-Disposition: attachment; filename="..."'.
 */
export const downloadVideoFile = async (videoUrl, suggestedFilename, backendUrl = 'http://127.0.0.1:8001') => {
  const filename = sanitizeFilename(suggestedFilename);

  // Derive direct attachment endpoint
  let targetUrl = videoUrl;
  if (videoUrl && videoUrl.includes('/api/clips/')) {
    const clipFile = videoUrl.split('/api/clips/').pop().split('?')[0];
    targetUrl = `${backendUrl}/api/download-clip/${clipFile}?title=${encodeURIComponent(filename)}`;
  } else if (!targetUrl.startsWith('http')) {
    targetUrl = `${backendUrl}${targetUrl}`;
  }

  try {
    // 1. Fetch as Blob (guarantees local blob: url trigger)
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
    }, 10000);
    return true;
  } catch (err) {
    console.warn('Direct blob download failed, falling back to direct attachment link:', err);
    // 2. Fallback to direct navigation of attachment endpoint
    const fallbackLink = document.createElement('a');
    fallbackLink.style.display = 'none';
    fallbackLink.href = targetUrl;
    fallbackLink.setAttribute('download', filename);
    document.body.appendChild(fallbackLink);
    fallbackLink.click();
    document.body.removeChild(fallbackLink);
    return true;
  }
};
