const API_BASE = 'http://127.0.0.1:8000'

/**
 * Get proxied stream URL for IP camera. Bypasses CORS.
 * @param {string} ipCamUrl - Raw URL from user (e.g. http://192.168.1.100:8080/video)
 * @returns {string} Proxy URL the browser can use in img/video src
 */
export function getStreamProxyUrl(ipCamUrl) {
  if (!ipCamUrl?.trim()) return ''
  const encoded = encodeURIComponent(ipCamUrl.trim())
  return `${API_BASE}/cameras/stream-proxy?url=${encoded}`
}

/**
 * Check if IP camera URL is reachable.
 * @param {string} url - IP camera stream URL
 * @returns {Promise<{ok: boolean, error?: string, stream_type?: string}>}
 */
export async function checkStreamUrl(url) {
  if (!url?.trim()) return { ok: false, error: 'No URL' }
  try {
    const res = await fetch(
      `${API_BASE}/cameras/stream-check?url=${encodeURIComponent(url.trim())}`
    )
    return res.json()
  } catch (e) {
    return { ok: false, error: e.message || 'Check failed' }
  }
}
