import { useMemo, useRef, useState } from 'react'

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function activeCaption(cuts, time) {
  let offset = 0
  for (const cut of cuts) {
    const dur = cut.source_end - cut.source_start
    if (time >= offset && time < offset + dur) {
      const sourceTime = cut.source_start + (time - offset)
      for (const cap of cut.caption_lines || []) {
        if (sourceTime >= cap.start && sourceTime < cap.end) return cap.text
      }
      return null
    }
    offset += dur
  }
  return null
}

function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return h.toString(36)
}

export default function Preview({ projectId, cuts = [] }) {
  const videoRef = useRef(null)
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)

  const signature = useMemo(
    () => hashString(JSON.stringify(cuts)),
    [cuts],
  )
  const duration = useMemo(
    () => cuts.reduce((acc, cut) => acc + (cut.source_end - cut.source_start), 0),
    [signature],
  )
  const src = `/api/projects/${projectId}/preview.mp4?v=${signature}`
  const caption = activeCaption(cuts, time)

  function handleTimeUpdate(e) {
    setTime(e.currentTarget.currentTime)
  }

  function handleScrub(e) {
    const value = Number(e.target.value)
    const video = videoRef.current
    if (video) video.currentTime = value
    setTime(value)
  }

  function handleTogglePlay() {
    const video = videoRef.current
    if (!video) return
    if (playing) {
      video.pause()
      setPlaying(false)
    } else {
      video.play()
      setPlaying(true)
    }
  }

  return (
    <div>
      <div style={{ position: 'relative', width: 540 }}>
        <video
          ref={videoRef}
          src={src}
          width="540"
          data-testid="preview-video"
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
        {caption && (
          <div
            data-testid="preview-caption"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 16,
              textAlign: 'center',
              color: '#fff',
              background: 'rgba(0,0,0,0.6)',
              padding: '8px 12px',
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            {caption}
          </div>
        )}
      </div>
      <div>
        <button type="button" onClick={handleTogglePlay}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={Math.min(time, duration)}
          onChange={handleScrub}
          aria-label="Seek"
        />
        <span data-testid="preview-time">
          {formatTime(time)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  )
}