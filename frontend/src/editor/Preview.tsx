import { useMemo, useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'
import type { Cut } from './useTimelineReducer'

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function activeCaption(cuts: Cut[], time: number): string | null {
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

function hashString(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return h.toString(36)
}

interface PreviewProps {
  projectId: string
  cuts?: Cut[]
}

export default function Preview({ projectId, cuts = [] }: PreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
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

  function handleTimeUpdate(e: React.SyntheticEvent<HTMLVideoElement>) {
    setTime(e.currentTarget.currentTime)
  }

  function handleScrub(e: React.ChangeEvent<HTMLInputElement>) {
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
      <div className="bg-[#14171A] rounded-2xl border border-white/10 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-2 text-xs text-[#707477]">
          <span className="font-semibold text-white">Preview</span>
          <span className="text-[11px]">Rendered preview (540px wide)</span>
        </div>

        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <div className="relative aspect-[9/16] w-[240px] rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black">
            <video
              ref={videoRef}
              src={src}
              data-testid="preview-video"
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              playsInline
              className="w-full h-full object-cover"
            />
            {caption && (
              <div data-testid="preview-caption" className="absolute inset-x-4 bottom-12 text-center">
                <div className="bg-black/85 backdrop-blur-md px-3 py-2 rounded-xl border border-white/20 text-sm font-black tracking-wider text-white uppercase inline-block">
                  {caption}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 bg-[#191C20] p-2.5 rounded-xl border border-white/5 mt-3">
          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
            className="w-8 h-8 rounded-lg bg-[#D5FF3F] text-black flex items-center justify-center hover:bg-[#E2FF70] transition-colors cursor-pointer"
          >
            {playing ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
          </button>

          <span data-testid="preview-time" className="text-xs font-mono text-white font-semibold min-w-[85px]">
            {formatTime(time)} / {formatTime(duration)}
          </span>

          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={Math.min(time, duration)}
            onChange={handleScrub}
            aria-label="Seek"
            className="flex-1 cursor-pointer"
          />
        </div>
      </div>
    </div>
  )
}