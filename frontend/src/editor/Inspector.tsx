import { useEffect, useState } from 'react'
import { Music, Plus, Sliders, Trash2, Type, Volume2 } from 'lucide-react'
import type { CaptionLine, Cut, SnapshotMusic } from '../types'
import { formatTime } from '../format'
import { getMusic } from '../api'

export const FONTS = ['Arial', 'OpenSans', 'Roboto']

interface MusicOption {
  id: string
  title: string
  source: string
  path: string | null
}

interface InspectorProps {
  cut: Cut | null
  font: string
  music: SnapshotMusic | null
  onCaptionChange: (lines: CaptionLine[]) => void
  onFontChange: (font: string) => void
  onMusicChange: (music: SnapshotMusic) => void
  onMusicClear: () => void
  onSave: () => void
  saving?: boolean
  saveError?: string | null
}

export default function Inspector({
  cut,
  font,
  music,
  onCaptionChange,
  onFontChange,
  onMusicChange,
  onMusicClear,
  onSave,
  saving = false,
  saveError = null,
}: InspectorProps) {
  const [inspectorTab, setInspectorTab] = useState<'captions' | 'font' | 'music'>('captions')
  const [tracks, setTracks] = useState<MusicOption[]>([])

  useEffect(() => {
    let active = true
    getMusic()
      .then((res) => {
        if (active) setTracks((res as { tracks?: MusicOption[] }).tracks || [])
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const lines = cut?.caption_lines || []

  const selectedTrackId =
    (music && tracks.find((t) => t.source === music.source && t.path === music.path)?.id) || ''

  function handleAddCaption() {
    if (!cut) return
    onCaptionChange([...lines, { start: cut.source_start, end: cut.source_end, text: '' }])
  }

  function handleCaptionText(index: number, text: string) {
    onCaptionChange(lines.map((line, i) => (i === index ? { ...line, text } : line)))
  }

  function handleRemoveCaption(index: number) {
    onCaptionChange(lines.filter((_, i) => i !== index))
  }

  function handleMusicSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value
    if (!id) {
      onMusicClear()
      return
    }
    const track = tracks.find((t) => t.id === id)
    if (!track) return
    onMusicChange({
      source: track.source,
      path: track.path,
      offset: 0,
      trim_start: 0,
      trim_end: null,
      volume: 0.8,
      duck: true,
    })
  }

  function handleVolume(e: React.ChangeEvent<HTMLInputElement>) {
    if (!music) return
    onMusicChange({ ...music, volume: Number(e.target.value) })
  }

  function handleDuck(e: React.ChangeEvent<HTMLInputElement>) {
    if (!music) return
    onMusicChange({ ...music, duck: e.target.checked })
  }

  const tabClass = (active: boolean) =>
    `flex-1 py-2.5 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
      active ? 'border-[#D5FF3F] text-[#D5FF3F]' : 'border-transparent text-[#707477] hover:text-white'
    }`

  return (
    <aside className="w-[360px] bg-[#14171A] border-l border-white/10 p-5 flex flex-col justify-between shrink-0 overflow-y-auto">
      <div className="space-y-6">
        <div className="flex items-center border-b border-white/10 text-xs font-semibold">
          <button type="button" onClick={() => setInspectorTab('captions')} className={tabClass(inspectorTab === 'captions')}>
            <Type className="w-4 h-4" />
            <span>Captions</span>
          </button>
          <button type="button" onClick={() => setInspectorTab('font')} className={tabClass(inspectorTab === 'font')}>
            <Sliders className="w-4 h-4" />
            <span>Font</span>
          </button>
          <button type="button" onClick={() => setInspectorTab('music')} className={tabClass(inspectorTab === 'music')}>
            <Music className="w-4 h-4" />
            <span>Music</span>
          </button>
        </div>

        <div className={inspectorTab === 'captions' ? 'space-y-4' : 'hidden space-y-4'}>
          {cut && (
            <div className="flex items-center justify-between text-xs text-[#707477]">
              <span>
                Editing cut ({formatTime(cut.source_start)} – {formatTime(cut.source_end)})
              </span>
            </div>
          )}

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {lines.map((line, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-[#191C20] p-2 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
              >
                <span className="font-mono text-[10px] text-[#707477] bg-[#111316] px-2 py-1.5 rounded border border-white/5">
                  {formatTime(line.start)}
                </span>
                <input
                  type="text"
                  data-testid={`caption-text-${i}`}
                  value={line.text}
                  onChange={(e) => handleCaptionText(i, e.target.value)}
                  aria-label={`Caption ${i + 1} text`}
                  className="flex-1 bg-transparent text-xs text-white outline-none border-none focus:ring-0"
                />
                <button
                  type="button"
                  data-testid={`caption-remove-${i}`}
                  onClick={() => handleRemoveCaption(i)}
                  aria-label={`Remove caption ${i + 1}`}
                  className="p-1 rounded text-[#707477] hover:text-[#FF5B63] transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {!cut ? (
            <p className="text-xs text-[#707477]">Select a cut to edit captions.</p>
          ) : (
            <button
              type="button"
              data-testid="caption-add"
              onClick={handleAddCaption}
              className="w-full py-2.5 rounded-xl bg-[#191C20] hover:bg-[#24282D] border border-white/10 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add caption</span>
            </button>
          )}
        </div>

        <div className={inspectorTab === 'font' ? 'space-y-4' : 'hidden space-y-4'}>
          <label className="text-xs font-semibold text-[#A7A9A8] uppercase tracking-wider block">
            Subtitle Font Family
          </label>
          <select
            data-testid="font-select"
            value={font}
            onChange={(e) => onFontChange(e.target.value)}
            className="w-full bg-[#191C20] border border-white/15 rounded-xl p-3 text-xs text-white outline-none focus:border-[#D5FF3F]"
          >
            {FONTS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className={inspectorTab === 'music' ? 'space-y-5' : 'hidden space-y-5'}>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#A7A9A8] uppercase tracking-wider block">
              Background Music Track
            </label>
            <select
              data-testid="music-select"
              value={selectedTrackId}
              onChange={handleMusicSelect}
              className="w-full bg-[#191C20] border border-white/15 rounded-xl p-3 text-xs text-white outline-none focus:border-[#D5FF3F]"
            >
              <option value="">None</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          {music && (
            <div className="space-y-4 bg-[#191C20] p-4 rounded-2xl border border-white/5">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#A7A9A8]">
                    <Volume2 className="w-3.5 h-3.5" />
                    Volume
                  </span>
                </div>
                <input
                  type="range"
                  data-testid="music-volume"
                  min={0}
                  max={1}
                  step={0.1}
                  value={music.volume}
                  onChange={handleVolume}
                  className="w-full cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                  <input
                    type="checkbox"
                    data-testid="music-duck"
                    checked={music.duck}
                    onChange={handleDuck}
                    className="w-4 h-4 accent-[#D5FF3F] rounded"
                  />
                  <span>Duck under voice</span>
                </label>
              </div>

              <button
                type="button"
                data-testid="music-clear"
                onClick={onMusicClear}
                className="w-full mt-2 py-2 rounded-xl border border-[#FF5B63]/40 text-[#FF5B63] hover:bg-[#FF5B63]/10 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove music</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 mt-4 border-t border-white/10 space-y-2">
        <button
          type="button"
          data-testid="inspector-save"
          onClick={onSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-[#D5FF3F] hover:bg-[#E2FF70] text-black text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-[#D5FF3F]/10 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saveError && <p data-testid="inspector-save-error">{saveError}</p>}
      </div>
    </aside>
  )
}