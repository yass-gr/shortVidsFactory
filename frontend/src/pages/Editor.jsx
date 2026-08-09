import { useEffect, useState } from 'react'
import Preview from '../editor/Preview.jsx'
import Timeline from '../editor/Timeline.jsx'
import Inspector from '../editor/Inspector.jsx'
import ExportBar from '../editor/ExportBar.jsx'
import { getSnapshot, saveSnapshot } from '../api.js'
import {
  useTimelineReducer,
  selectCut,
  trimCut,
  reorderCut,
  duplicateCut,
  deleteCut,
  replaceCuts,
  updateCutCaptions,
} from '../editor/useTimelineReducer.js'

const DEFAULT_FONT = 'Arial'

export default function Editor({ projectId }) {
  const [state, dispatch] = useTimelineReducer([])
  const [font, setFont] = useState(DEFAULT_FONT)
  const [music, setMusic] = useState(null)
  const [exportPath, setExportPath] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const { cuts, selectedId } = state
  const selected = selectedId !== null ? cuts[selectedId] : null

  useEffect(() => {
    let active = true
    getSnapshot(projectId)
      .then((snap) => {
        if (!active) return
        dispatch(replaceCuts(snap.cuts || []))
        setFont(snap.font || DEFAULT_FONT)
        setMusic(snap.music ?? null)
        setExportPath(snap.export_path || '')
      })
      .catch(() => {
        // No snapshot yet (404) or backend unavailable: fall back to defaults.
      })
    return () => {
      active = false
    }
  }, [projectId])

  function handleSave() {
    setSaving(true)
    setSaveError(null)
    saveSnapshot(projectId, { cuts, music, font, export_path: exportPath })
      .catch((err) => setSaveError(err.message))
      .finally(() => setSaving(false))
  }

  return (
    <main>
      <h2>Editor</h2>
      <Preview projectId={projectId} cuts={cuts} />
      <Timeline
        cuts={cuts}
        selectedId={selectedId}
        onSelect={(index) => dispatch(selectCut(index))}
        onTrim={(index, which, boundary) => dispatch(trimCut(index, which, boundary))}
        onReorder={(from, to) => dispatch(reorderCut(from, to))}
        onDuplicate={(index) => dispatch(duplicateCut(index))}
        onDelete={(index) => dispatch(deleteCut(index))}
      />
      <Inspector
        cut={selected}
        font={font}
        music={music}
        onCaptionChange={(lines) => dispatch(updateCutCaptions(selectedId, lines))}
        onFontChange={setFont}
        onMusicChange={setMusic}
        onMusicClear={() => setMusic(null)}
        onSave={handleSave}
        saving={saving}
        saveError={saveError}
      />
      <ExportBar
        projectId={projectId}
        snapshot={{ cuts, music, font, export_path: exportPath }}
        enabled={cuts.length >= 1}
        onExported={(path) => path && setExportPath(path)}
      />
      {selected && (
        <p data-testid="editor-selected">
          Selected cut {selectedId + 1}: {selected.source_start}s – {selected.source_end}s
        </p>
      )}
    </main>
  )
}
