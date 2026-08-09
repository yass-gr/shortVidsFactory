import { useEffect, useState } from 'react'
import { getMusic } from '../api.js'

export const FONTS = ['Arial', 'OpenSans', 'Roboto']

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
}) {
  const [tracks, setTracks] = useState([])

  useEffect(() => {
    let active = true
    getMusic()
      .then((res) => {
        if (active) setTracks(res.tracks || [])
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

  function handleCaptionText(index, text) {
    onCaptionChange(lines.map((line, i) => (i === index ? { ...line, text } : line)))
  }

  function handleRemoveCaption(index) {
    onCaptionChange(lines.filter((_, i) => i !== index))
  }

  function handleMusicSelect(e) {
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

  function handleVolume(e) {
    onMusicChange({ ...music, volume: Number(e.target.value) })
  }

  function handleDuck(e) {
    onMusicChange({ ...music, duck: e.target.checked })
  }

  return (
    <aside>
      <h3>Inspector</h3>

      <section style={{ marginBottom: 16 }}>
        <h4 style={{ margin: '8px 0' }}>Captions</h4>
        {cut ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lines.map((line, i) => (
              <div key={i} style={{ display: 'flex', gap: 8 }}>
                <input
                  data-testid={`caption-text-${i}`}
                  value={line.text}
                  onChange={(e) => handleCaptionText(i, e.target.value)}
                  aria-label={`Caption ${i + 1} text`}
                />
                <button
                  type="button"
                  data-testid={`caption-remove-${i}`}
                  onClick={() => handleRemoveCaption(i)}
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" data-testid="caption-add" onClick={handleAddCaption}>
              Add caption
            </button>
          </div>
        ) : (
          <p>Select a cut to edit captions.</p>
        )}
      </section>

      <section style={{ marginBottom: 16 }}>
        <h4 style={{ margin: '8px 0' }}>Font</h4>
        <select data-testid="font-select" value={font} onChange={(e) => onFontChange(e.target.value)}>
          {FONTS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </section>

      <section style={{ marginBottom: 16 }}>
        <h4 style={{ margin: '8px 0' }}>Music</h4>
        <select data-testid="music-select" value={selectedTrackId} onChange={handleMusicSelect}>
          <option value="">None</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        {music && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            <label>
              Volume
              <input
                type="range"
                data-testid="music-volume"
                min={0}
                max={1}
                step={0.1}
                value={music.volume}
                onChange={handleVolume}
              />
            </label>
            <label>
              <input
                type="checkbox"
                data-testid="music-duck"
                checked={music.duck}
                onChange={handleDuck}
              />
              Duck under voice
            </label>
            <button type="button" data-testid="music-clear" onClick={onMusicClear}>
              Remove music
            </button>
          </div>
        )}
      </section>

      <section>
        <button type="button" data-testid="inspector-save" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saveError && <p data-testid="inspector-save-error">{saveError}</p>}
      </section>
    </aside>
  )
}
