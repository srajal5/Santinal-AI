import { useEffect, useRef, useState, useCallback } from 'react'
import { useCamera } from '../context/CameraContext'
import { useIncident } from '../context/IncidentContext'
import { useAlert } from '../context/AlertContext'
import { getStreamProxyUrl, checkStreamUrl } from '../api/streams'
import { detectIncidentsFromVideo, detectFrameFromWebcam, createIncidentFromDetection } from '../api/incidents'

function LocalWebcamFeed() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [error, setError] = useState(null)
  const [active, setActive] = useState(false)
  const [detectionEnabled, setDetectionEnabled] = useState(false)
  const [detectionActive, setDetectionActive] = useState(false)
  const [detectionStatus, setDetectionStatus] = useState('')
  const [alertShown, setAlertShown] = useState(false)
  const detectionIntervalRef = useRef(null)
  const alertTimeoutRef = useRef(null)
  const lastIncidentTimeRef = useRef(0)
  const { activeCamera } = useCamera()
  const { setIncidents } = useIncident()
  const { refresh: refreshAlerts } = useAlert()

  const drawDetections = useCallback((detections, videoWidth, videoHeight) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    canvas.width = videoWidth
    canvas.height = videoHeight
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    detections.forEach((det) => {
      const [x1, y1, x2, y2] = det.bbox
      const isViolence = det.type === 'violence'
      
      // Draw bounding box
      ctx.strokeStyle = isViolence ? '#ef4444' : '#f97316'
      ctx.lineWidth = 3
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
      
      // Draw label background
      ctx.fillStyle = isViolence ? 'rgba(239, 68, 68, 0.8)' : 'rgba(249, 115, 22, 0.8)'
      ctx.fillRect(x1, y1 - 25, 100, 25)
      
      // Draw label text
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 14px Arial'
      ctx.fillText(
        `${det.type.toUpperCase()} ${Math.round(det.confidence * 100)}%`,
        x1 + 5,
        y1 - 7
      )
    })
  }, [])

  const processFrame = useCallback(async () => {
    if (!videoRef.current || !detectionEnabled || !active) return
    
    const video = videoRef.current
    // Ensure video is ready and has valid dimensions
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return
    if (video.videoWidth === 0 || video.videoHeight === 0) return
    
    // Create a canvas to capture the frame
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Convert to base64
    const frameData = canvas.toDataURL('image/jpeg', 0.8)
    
    try {
      const result = await detectFrameFromWebcam(frameData, 0.5)
      
      if (result.detections && result.detections.length > 0) {
        // Draw detections on overlay canvas
        drawDetections(result.detections, video.videoWidth, video.videoHeight)
        
        // Show alert if violence or accident detected
        const now = Date.now()
        if ((result.has_violence || result.has_accident) && (now - lastIncidentTimeRef.current > 15000)) { // 15s cooldown
          lastIncidentTimeRef.current = now
          setAlertShown(true)
          setDetectionStatus('⚠️ INCIDENT DETECTED!')
          
          // Create incident via backend (this will also create an alert)
          try {
            const maxConfidence = Math.max(...result.detections.map(d => d.confidence))
            const detectionType = result.has_violence ? 'violence' : 'accident'
            
            const incident = await createIncidentFromDetection({
              type: detectionType,
              confidence: maxConfidence,
              latitude: activeCamera?.latitude || 0,
              longitude: activeCamera?.longitude || 0,
              cameraId: activeCamera?.camera_id || null,
            })
            
            setIncidents(prev => [incident, ...prev])
            
            if (refreshAlerts) {
              refreshAlerts()
            }
          } catch (err) {
            console.error('Failed to create incident from detection:', err)
          }
          
          // Reset alert after 3 seconds
          alertTimeoutRef.current = setTimeout(() => {
            setAlertShown(false)
            setDetectionStatus('')
          }, 3000)
        }
      } else {
        // Clear detections if none found
        const overlayCanvas = canvasRef.current
        if (overlayCanvas) {
          const overlayCtx = overlayCanvas.getContext('2d')
          overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
        }
      }
    } catch (err) {
      console.error('Frame detection failed:', err)
    }
  }, [detectionEnabled, active, drawDetections, alertShown, setIncidents, refreshAlerts, activeCamera])

  const startDetection = useCallback(() => {
    if (detectionIntervalRef.current) return
    
    setDetectionActive(true)
    detectionIntervalRef.current = setInterval(processFrame, 500) // Process every 500ms
  }, [processFrame])

  const stopDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current)
      alertTimeoutRef.current = null
    }
    setDetectionActive(false)
    setAlertShown(false)
    setDetectionStatus('')
    
    // Clear canvas
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [])

  useEffect(() => {
    if (!active || !videoRef.current) {
      if (detectionEnabled) {
        stopDetection()
        setDetectionEnabled(false)
      }
      return
    }
    
    let stream = null
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((s) => {
        stream = s
        videoRef.current.srcObject = s
      })
      .catch((e) => {
        setError(e.message || 'Camera access denied')
        if (detectionEnabled) {
          stopDetection()
          setDetectionEnabled(false)
        }
      })
    
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop())
      if (detectionEnabled) {
        stopDetection()
        setDetectionEnabled(false)
      }
    }
  }, [active, detectionEnabled, stopDetection])

  useEffect(() => {
    if (detectionEnabled && active) {
      startDetection()
    } else {
      stopDetection()
    }
    return () => stopDetection()
  }, [detectionEnabled, active, startDetection, stopDetection])

  if (error) {
    return (
      <div className="rounded-lg bg-gray-800/50 p-4 text-amber-500 text-sm">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Local Webcam</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDetectionEnabled(!detectionEnabled)}
            disabled={!active}
            className={`text-xs px-3 py-1 rounded transition-colors ${
              detectionEnabled
                ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {detectionEnabled ? '🛑 Stop Detection' : '🎯 Start Detection'}
          </button>
          <button
            type="button"
            onClick={() => setActive(!active)}
            className="text-xs px-3 py-1 rounded bg-green-600/20 text-green-400 hover:bg-green-600/30"
          >
            {active ? 'Stop' : 'Start'}
          </button>
        </div>
      </div>
      <div className="rounded-lg overflow-hidden bg-black aspect-video relative">
        {active ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
            />
            <div className="absolute left-2 top-2 text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: 'var(--text-muted, #9ca3af)' }}>
              {new Date().toLocaleString()}
            </div>
            <div className={`absolute right-2 top-2 text-[10px] px-2 py-0.5 rounded transition-colors ${
              detectionActive
                ? 'bg-red-500/70 text-white animate-pulse'
                : 'bg-gray-500/50 text-gray-300'
            }`}>
              {detectionActive ? '🔍 DETECTING' : '⏸️ IDLE'}
            </div>
            {detectionStatus && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-red-500 animate-bounce">
                {detectionStatus}
              </div>
            )}
            <div className="pointer-events-none absolute inset-0" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 2px), repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 2px)',
              mixBlendMode: 'overlay',
            }} />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 text-sm gap-2">
            <span>Click Start to use laptop camera</span>
            <span className="text-xs text-gray-700">Enable detection for real-time monitoring</span>
          </div>
        )}
      </div>
    </div>
  )
}

function IPCamFeed() {
  const [url, setUrl] = useState('')
  const [feedUrl, setFeedUrl] = useState(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(null)
  const [detectionEnabled, setDetectionEnabled] = useState(false)
  const [detectionActive, setDetectionActive] = useState(false)
  const [detectionStatus, setDetectionStatus] = useState('')
  const [alertShown, setAlertShown] = useState(false)
  const imgRef = useRef(null)
  const canvasRef = useRef(null)
  const detectionIntervalRef = useRef(null)
  const alertTimeoutRef = useRef(null)
  const lastIncidentTimeRef = useRef(0)
  const { activeCamera } = useCamera()
  const { setIncidents } = useIncident()
  const { refresh: refreshAlerts } = useAlert()

  const drawDetections = useCallback((detections, imgWidth, imgHeight) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    canvas.width = imgWidth
    canvas.height = imgHeight
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    detections.forEach((det) => {
      const [x1, y1, x2, y2] = det.bbox
      const isViolence = det.type === 'violence'
      
      // Draw bounding box
      ctx.strokeStyle = isViolence ? '#ef4444' : '#f97316'
      ctx.lineWidth = 3
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
      
      // Draw label background
      ctx.fillStyle = isViolence ? 'rgba(239, 68, 68, 0.8)' : 'rgba(249, 115, 22, 0.8)'
      ctx.fillRect(x1, y1 - 25, 100, 25)
      
      // Draw label text
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 14px Arial'
      ctx.fillText(
        `${det.type.toUpperCase()} ${Math.round(det.confidence * 100)}%`,
        x1 + 5,
        y1 - 7
      )
    })
  }, [])

  const processFrame = useCallback(async () => {
    if (!imgRef.current || !detectionEnabled || !feedUrl) return
    
    const img = imgRef.current
    if (!img.complete || img.naturalWidth === 0) return
    
    // Create a canvas to capture the frame
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    
    // Convert to base64
    const frameData = canvas.toDataURL('image/jpeg', 0.8)
    
    try {
      const result = await detectFrameFromWebcam(frameData, 0.5)
      
      if (result.detections && result.detections.length > 0) {
        // Draw detections on overlay canvas
        drawDetections(result.detections, img.naturalWidth, img.naturalHeight)
        
        // Show alert if violence or accident detected
        const now = Date.now()
        if ((result.has_violence || result.has_accident) && (now - lastIncidentTimeRef.current > 15000)) { // 15s cooldown
          lastIncidentTimeRef.current = now
          setAlertShown(true)
          setDetectionStatus('⚠️ INCIDENT DETECTED!')
          
          // Create incident via backend (this will also create an alert)
          try {
            const maxConfidence = Math.max(...result.detections.map(d => d.confidence))
            const detectionType = result.has_violence ? 'violence' : 'accident'
            
            const incident = await createIncidentFromDetection({
              type: detectionType,
              confidence: maxConfidence,
              latitude: activeCamera?.latitude || 0,
              longitude: activeCamera?.longitude || 0,
              cameraId: activeCamera?.camera_id || null,
            })
            
            setIncidents(prev => [incident, ...prev])
            
            if (refreshAlerts) {
              refreshAlerts()
            }
          } catch (err) {
            console.error('Failed to create incident from detection:', err)
          }
          
          // Reset alert after 3 seconds
          alertTimeoutRef.current = setTimeout(() => {
            setAlertShown(false)
            setDetectionStatus('')
          }, 3000)
        }
      } else {
        // Clear detections if none found
        const overlayCanvas = canvasRef.current
        if (overlayCanvas) {
          const overlayCtx = overlayCanvas.getContext('2d')
          overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
        }
      }
    } catch (err) {
      console.error('Frame detection failed:', err)
    }
  }, [detectionEnabled, feedUrl, drawDetections, alertShown, setIncidents, refreshAlerts, activeCamera])

  const startDetection = useCallback(() => {
    if (detectionIntervalRef.current) return
    
    setDetectionActive(true)
    detectionIntervalRef.current = setInterval(processFrame, 1000) // Process every 1 second for IP cam
  }, [processFrame])

  const stopDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current)
      alertTimeoutRef.current = null
    }
    setDetectionActive(false)
    setAlertShown(false)
    setDetectionStatus('')
    
    // Clear canvas
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [])

  useEffect(() => {
    if (detectionEnabled && feedUrl) {
      startDetection()
    } else {
      stopDetection()
    }
    return () => stopDetection()
  }, [detectionEnabled, feedUrl, startDetection, stopDetection])

  const handleLoad = async () => {
    const raw = url.trim()
    if (!raw) return
    setError(null)
    setChecking(true)
    try {
      const result = await checkStreamUrl(raw)
      if (!result.ok) {
        setError(result.error || 'Cannot connect to camera')
        setFeedUrl(null)
        if (detectionEnabled) {
          stopDetection()
          setDetectionEnabled(false)
        }
        return
      }
      setFeedUrl(raw)
    } catch (e) {
      setError(e.message || 'Failed to check stream')
      setFeedUrl(null)
      if (detectionEnabled) {
        stopDetection()
        setDetectionEnabled(false)
      }
    } finally {
      setChecking(false)
    }
  }

  const handleStop = () => {
    setFeedUrl(null)
    setUrl('')
    setError(null)
    if (detectionEnabled) {
      stopDetection()
      setDetectionEnabled(false)
    }
  }

  const proxyUrl = feedUrl ? getStreamProxyUrl(feedUrl) : ''
  const displayUrl = proxyUrl || null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">IP Cam</h3>
        {feedUrl && (
          <button
            type="button"
            onClick={() => setDetectionEnabled(!detectionEnabled)}
            className={`text-xs px-3 py-1 rounded transition-colors ${
              detectionEnabled
                ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {detectionEnabled ? '🛑 Stop Detection' : '🎯 Start Detection'}
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500">
        IP Webcam / DroidCam: http://IP:port/video or /videofeed
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="http://192.168.1.100:8080/video"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(null) }}
          onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
          disabled={!!feedUrl}
          className="flex-1 min-w-0 px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50"
        />
        {!feedUrl ? (
          <button
            type="button"
            onClick={handleLoad}
            disabled={checking || !url.trim()}
            className="px-4 py-2 rounded bg-green-600 text-white text-sm hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checking ? 'Checking…' : 'Connect'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStop}
            className="px-4 py-2 rounded bg-gray-700 text-gray-300 text-sm hover:bg-gray-600"
          >
            Stop
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-amber-500">{error}</p>
      )}
      <div className="rounded-lg overflow-hidden bg-black aspect-video relative">
        {displayUrl ? (
          <>
            <img
              ref={imgRef}
              key={displayUrl}
              src={displayUrl}
              alt="IP Cam live feed"
              className="w-full h-full object-contain"
              onError={(e) => {
                setError('Stream lost or unreachable')
                e.target.style.display = 'none'
                if (detectionEnabled) {
                  stopDetection()
                  setDetectionEnabled(false)
                }
              }}
              onLoad={() => setError(null)}
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
            />
            <div className="absolute left-2 top-2 text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: 'var(--text-muted, #9ca3af)' }}>
              {new Date().toLocaleString()}
            </div>
            <div className={`absolute right-2 top-2 text-[10px] px-2 py-0.5 rounded transition-colors ${
              detectionActive
                ? 'bg-red-500/70 text-white animate-pulse'
                : 'bg-gray-500/50 text-gray-300'
            }`}>
              {detectionActive ? '🔍 DETECTING' : feedUrl ? '⏸️ IDLE' : ''}
            </div>
            {detectionStatus && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-red-500 animate-bounce">
                {detectionStatus}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 text-sm gap-2">
            <span>Enter IP camera URL</span>
            <span className="text-xs text-gray-600">e.g. http://192.168.1.100:8080/video</span>
          </div>
        )}
      </div>
    </div>
  )
}

function UploadVideoFeed() {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const videoRef = useRef(null)
  const { activeCamera } = useCamera()
  const { setIncidents } = useIncident()
  const { refresh: refreshAlerts } = useAlert()

  const handleChange = (e) => {
    const f = e.target.files?.[0]
    if (f?.type.startsWith('video/')) {
      setStatus('')
      setFile(f)
    } else {
      setFile(null)
      setStatus('Please select a valid video file.')
    }
  }

  const handleRunDetection = async () => {
    setStatus('')
    if (!file) {
      setStatus('Please select a video file first.')
      return
    }
    if (!activeCamera || !activeCamera.camera_id || activeCamera.camera_id === '__local__') {
      setStatus('Please select a camera from the left panel before running detection.')
      return
    }

    setLoading(true)
    try {
      const response = await detectIncidentsFromVideo({
        cameraId: activeCamera.camera_id,
        file,
      })

      // Handle the new response format
      const { incidents, message, detections, camera_found } = response || {}
      
      if (Array.isArray(detections) && detections.length > 0) {
        setStatus(message || `Detected ${detections.length} incident${detections.length > 1 ? 's' : ''}.`)
        if (Array.isArray(incidents) && incidents.length > 0) {
          setIncidents((prev) => [...incidents, ...prev])
          if (refreshAlerts) {
            refreshAlerts()
          }
        }
      } else if (Array.isArray(incidents) && incidents.length > 0) {
        setStatus(message || `Detected ${incidents.length} incident${incidents.length > 1 ? 's' : ''}.`)
        setIncidents((prev) => [...incidents, ...prev])
        if (refreshAlerts) {
          refreshAlerts()
        }
      } else {
        setStatus(message || 'No violence or accident detected in this video.')
      }
    } catch (err) {
      console.error('Video detection failed', err)
      // Extract more specific error message if available
      const errorDetail = err.response?.data?.detail || err.message || 'Unknown error'
      setStatus(`Detection failed: ${errorDetail}. Check backend server and try again.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-300">Upload Video for Incident Detection</h3>
      <p className="text-xs text-gray-500">
        Select a camera on the left, upload a recorded incident video, and run the YOLO model to
        auto-detect violence or accidents. Detected incidents will appear in the Incidents table and
        generate alerts in the Live Alerts panel.
      </p>
      <label className="block">
        <span className="sr-only">Choose video</span>
        <input
          type="file"
          accept="video/*"
          onChange={handleChange}
          className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600"
        />
      </label>
      <div className="rounded-lg overflow-hidden bg-black aspect-video">
        {file ? (
          <video
            ref={videoRef}
            src={URL.createObjectURL(file)}
            controls
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
            Select a video file to preview and analyze
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={handleRunDetection}
        disabled={loading || !file}
        className="w-full mt-1 inline-flex items-center justify-center rounded bg-green-600 text-white text-sm font-medium py-2 px-4 disabled:bg-gray-700 disabled:cursor-not-allowed hover:bg-green-500"
      >
        {loading ? 'Running detection…' : 'Run Incident Detection'}
      </button>
      {status && (
        <p className="text-xs text-gray-300">
          {status}
        </p>
      )}
    </div>
  )
}

function ApiCameraFeed({ camera }) {
  const [detectionEnabled, setDetectionEnabled] = useState(false)
  const [detectionActive, setDetectionActive] = useState(false)
  const [detectionStatus, setDetectionStatus] = useState('')
  const [alertShown, setAlertShown] = useState(false)
  const imgRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const detectionIntervalRef = useRef(null)
  const alertTimeoutRef = useRef(null)
  const lastIncidentTimeRef = useRef(0)
  const { setIncidents } = useIncident()
  const { refresh: refreshAlerts } = useAlert()

  const drawDetections = useCallback((detections, width, height) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    canvas.width = width
    canvas.height = height
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    detections.forEach((det) => {
      const [x1, y1, x2, y2] = det.bbox
      const isViolence = det.type === 'violence'
      
      // Draw bounding box
      ctx.strokeStyle = isViolence ? '#ef4444' : '#f97316'
      ctx.lineWidth = 3
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
      
      // Draw label background
      ctx.fillStyle = isViolence ? 'rgba(239, 68, 68, 0.8)' : 'rgba(249, 115, 22, 0.8)'
      ctx.fillRect(x1, y1 - 25, 100, 25)
      
      // Draw label text
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 14px Arial'
      ctx.fillText(
        `${det.type.toUpperCase()} ${Math.round(det.confidence * 100)}%`,
        x1 + 5,
        y1 - 7
      )
    })
  }, [])

  const processFrame = useCallback(async () => {
    if (!detectionEnabled) return
    
    let element = null
    let width = 0
    let height = 0
    
    // Try to get frame from img or video element
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      element = imgRef.current
      width = imgRef.current.naturalWidth
      height = imgRef.current.naturalHeight
    } else if (videoRef.current && videoRef.current.readyState >= 2) {
      element = videoRef.current
      width = videoRef.current.videoWidth
      height = videoRef.current.videoHeight
    }
    
    if (!element || width === 0 || height === 0) return
    
    // Create a canvas to capture the frame
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(element, 0, 0, canvas.width, canvas.height)
    
    // Convert to base64
    const frameData = canvas.toDataURL('image/jpeg', 0.8)
    
    try {
      const result = await detectFrameFromWebcam(frameData, 0.5)
      
      if (result.detections && result.detections.length > 0) {
        // Draw detections on overlay canvas
        drawDetections(result.detections, width, height)
        
        // Show alert if violence or accident detected
        const now = Date.now()
        if ((result.has_violence || result.has_accident) && (now - lastIncidentTimeRef.current > 15000)) { // 15s cooldown
          lastIncidentTimeRef.current = now
          setAlertShown(true)
          setDetectionStatus('⚠️ INCIDENT DETECTED!')
          
          // Create incident via backend (this will also create an alert)
          try {
            const maxConfidence = Math.max(...result.detections.map(d => d.confidence))
            const detectionType = result.has_violence ? 'violence' : 'accident'
            
            const incident = await createIncidentFromDetection({
              type: detectionType,
              confidence: maxConfidence,
              latitude: camera?.latitude || 0,
              longitude: camera?.longitude || 0,
              cameraId: camera?.camera_id || null,
            })
            
            setIncidents(prev => [incident, ...prev])
            
            if (refreshAlerts) {
              refreshAlerts()
            }
          } catch (err) {
            console.error('Failed to create incident from detection:', err)
          }
          
          // Reset alert after 3 seconds
          alertTimeoutRef.current = setTimeout(() => {
            setAlertShown(false)
            setDetectionStatus('')
          }, 3000)
        }
      } else {
        // Clear detections if none found
        const overlayCanvas = canvasRef.current
        if (overlayCanvas) {
          const overlayCtx = overlayCanvas.getContext('2d')
          overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
        }
      }
    } catch (err) {
      console.error('Frame detection failed:', err)
    }
  }, [detectionEnabled, drawDetections, alertShown, setIncidents, refreshAlerts, camera])

  const startDetection = useCallback(() => {
    if (detectionIntervalRef.current) return
    
    setDetectionActive(true)
    detectionIntervalRef.current = setInterval(processFrame, 1000) // Process every 1 second
  }, [processFrame])

  const stopDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current)
      alertTimeoutRef.current = null
    }
    setDetectionActive(false)
    setAlertShown(false)
    setDetectionStatus('')
    
    // Clear canvas
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [])

  useEffect(() => {
    if (detectionEnabled) {
      startDetection()
    } else {
      stopDetection()
    }
    return () => stopDetection()
  }, [detectionEnabled, startDetection, stopDetection])

  if (!camera?.stream_url) {
    return (
      <div className="rounded-lg bg-gray-800/50 p-4 text-gray-500 text-sm">
        No stream URL for this camera
      </div>
    )
  }

  const rawUrl = camera.stream_url
  const useProxy = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
  const displaySrc = useProxy ? getStreamProxyUrl(rawUrl) : rawUrl
  const isMjpg = rawUrl.toLowerCase().includes('video') || rawUrl.toLowerCase().includes('mjpg') || rawUrl.toLowerCase().includes('videofeed')

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">{camera.name}</h3>
        <button
          type="button"
          onClick={() => setDetectionEnabled(!detectionEnabled)}
          className={`text-xs px-3 py-1 rounded transition-colors ${
            detectionEnabled
              ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {detectionEnabled ? '🛑 Stop Detection' : '🎯 Start Detection'}
        </button>
      </div>
      <div className="rounded-lg overflow-hidden bg-black aspect-video relative">
        {isMjpg ? (
          <>
            <img
              ref={imgRef}
              src={displaySrc}
              alt={camera.name}
              className="w-full h-full object-contain"
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
            />
            <div className="absolute left-2 top-2 text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: 'var(--text-muted, #9ca3af)' }}>
              {new Date().toLocaleString()}
            </div>
            <div className={`absolute right-2 top-2 text-[10px] px-2 py-0.5 rounded transition-colors ${
              detectionActive
                ? 'bg-red-500/70 text-white animate-pulse'
                : 'bg-gray-500/50 text-gray-300'
            }`}>
              {detectionActive ? '🔍 DETECTING' : 'LIVE'}
            </div>
            {detectionStatus && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-red-500 animate-bounce">
                {detectionStatus}
              </div>
            )}
            <div className="pointer-events-none absolute inset-0" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 2px), repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 2px)',
              mixBlendMode: 'overlay',
            }} />
          </>
        ) : (
          <>
            <video
              ref={videoRef}
              src={displaySrc}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
            />
            <div className="absolute left-2 top-2 text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: 'var(--text-muted, #9ca3af)' }}>
              {new Date().toLocaleString()}
            </div>
            <div className={`absolute right-2 top-2 text-[10px] px-2 py-0.5 rounded transition-colors ${
              detectionActive
                ? 'bg-red-500/70 text-white animate-pulse'
                : 'bg-gray-500/50 text-gray-300'
            }`}>
              {detectionActive ? '🔍 DETECTING' : 'LIVE'}
            </div>
            {detectionStatus && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-red-500 animate-bounce">
                {detectionStatus}
              </div>
            )}
            <div className="pointer-events-none absolute inset-0" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 2px), repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 2px)',
              mixBlendMode: 'overlay',
            }} />
          </>
        )}
      </div>
    </div>
  )
}

function CameraFeed() {
  const { activeCamera } = useCamera()

  const isLocal = activeCamera?.camera_id === '__local__'
  const isApiCamera = activeCamera?.camera_id && !isLocal

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <section className="rounded-xl bg-gray-900/50 border border-gray-800 p-4">
          {isLocal && <LocalWebcamFeed />}
          {isApiCamera && <ApiCameraFeed camera={activeCamera} />}
          {!activeCamera && (
            <div className="flex items-center justify-center min-h-[240px] text-gray-500 text-sm">
              Select a camera from the left panel
            </div>
          )}
        </section>
      </div>
      <div className="space-y-6">
        <section className="rounded-xl bg-gray-900/50 border border-gray-800 p-4">
          <IPCamFeed />
        </section>
        <section className="rounded-xl bg-gray-900/50 border border-gray-800 p-4">
          <UploadVideoFeed />
        </section>
      </div>
    </div>
  )
}

export default CameraFeed
