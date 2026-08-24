import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Film, Smartphone } from 'lucide-react'
import Preview from '../editor/Preview'
import Timeline from '../editor/Timeline'
import Inspector from '../editor/Inspector'
import ExportBar from '../editor/ExportBar'
import { getSnapshot, saveSnapshot } from '../api'
import type { EditorSnapshot, SnapshotMusic } from '../types'
import { formatTime } from '../format'
import {
  useTimelineReducer,
  selectCut,
  trimCut,
  reorderCut,
  duplicateCut,
  deleteCut,
  replaceCuts,
  updateCutCaptions,
} from '../editor/useTimelineReducer'
import type { CaptionLine } from '../editor/useTimelineReducer'

const DEFAULT_FONT = () => localStorage.getItem('svf_default_font') ?? 'Arial'

interface EditorProps {
  projectId: string
  onRegisterSave?: (fn: () => void) => void
  onDirtyChange?: (dirty: boolean) => void
  onNavigateExport?: (projectId: string, jobId: string, destination: string) => void
  onBack?: () => void
}

export default function Editor({ projectId, onRegisterSave, onDirtyChange, onNavigateExport, onBack }: EditorProps) {
  const [state, dispatch] = useTimelineReducer([])
  const [font, setFont] = useState<string>(() => DEFAULT_FONT())
  const [music, setMusic] = useState<SnapshotMusic | null>(null)
  const [exportPath, setExportPath] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)

  const { cuts, selectedId } = state
  const selected = selectedId !== null ? cuts[selectedId] : null

  const totalDuration = cuts.reduce((acc, cut) => acc + (cut.source_end - cut.source_start), 0)

  useEffect(() => {
    let active = true
    setLoadError(null)
    getSnapshot(projectId)
      .then((snap) => {
        if (!active) return
        const editorSnap = snap as EditorSnapshot
        dispatch(replaceCuts(editorSnap.cuts || []))
        setFont(editorSnap.font || DEFAULT_FONT())
        setMusic(editorSnap.music ?? null)
        setExportPath(editorSnap.export_path || '')
      })
      .catch((err) => {
        if (!active) return
        if (err?.status === 404) return
        setLoadError(err.message)
      })
    return () => {
      active = false
    }
  }, [projectId, loadAttempt])

  function handleReload() {
    setLoadAttempt((a) => a + 1)
  }

  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const snapshot = { cuts, music, font, export_path: exportPath }
      await saveSnapshot(projectId, snapshot)
      setHasUnsavedChanges(false)
    } catch (err) {
      setSaveError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }, [projectId, cuts, music, font, exportPath])

  useEffect(() => {
    onRegisterSave?.(handleSave)
  }, [onRegisterSave, handleSave])

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges)
  }, [onDirtyChange, hasUnsavedChanges])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        void handleSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSave])

  const markDirty = <A extends unknown[]>(fn: (...args: A) => void) =>
    (...args: A) => {
      setHasUnsavedChanges(true)
      fn(...args)
    }

  const select = markDirty((i: number) => dispatch(selectCut(i)))
  const trim = markDirty((i: number, w: 'left' | 'right', b: number) => dispatch(trimCut(i, w, b)))
  const reorder = markDirty((f: number, t: number) => dispatch(reorderCut(f, t)))
  const duplicate = markDirty((i: number | null) => {
    if (i !== null) dispatch(duplicateCut(i))
  })
  const del = markDirty((i: number | null) => dispatch(deleteCut(i)))
  const captions = markDirty((i: number | null, lines: CaptionLine[]) => {
    if (i !== null) dispatch(updateCutCaptions(i, lines))
  })

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] bg-[#0D0F11] text-[#F5F5F2] overflow-hidden select-none">
      <h1 className="sr-only">Editor</h1>

      {loadError && (
        <div
          data-testid="editor-load-error"
          role="alert"
          className="flex items-center justify-between gap-3 px-6 py-3 bg-[#FF5B63]/10 border-b border-[#FF5B63]/30 text-xs text-[#FF5B63] shrink-0"
        >
          <span>Couldn't load your project: {loadError}</span>
          <button
            type="button"
            onClick={handleReload}
            className="bg-[#FF5B63] hover:bg-[#ff7077] text-white px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main 3-Panel Editor Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* PANEL 1: Left Info & Shortcuts Sidebar (250px) */}
        <aside className="w-[250px] bg-[#14171A] border-r border-white/10 p-4 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="space-y-5">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => onBack?.()}
              className="flex items-center gap-2 text-xs text-[#707477] hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to scripts</span>
            </button>

            {/* Timeline Summary (real computed values) */}
            <div className="bg-[#191C20] p-3.5 rounded-2xl border border-white/10 space-y-2">
              <span className="text-[10px] uppercase font-bold text-[#707477] tracking-wider block">
                Timeline
              </span>
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#707477] tracking-wider block">
                    Duration
                  </span>
                  <div className="text-lg font-black text-white tracking-tight font-mono">
                    {formatTime(totalDuration)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-[#707477] tracking-wider block">
                    Cuts
                  </span>
                  <div className="text-lg font-black text-[#D5FF3F] tracking-tight">
                    {cuts.length}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-[#A7A9A8]">
                {cuts.length} cut{cuts.length === 1 ? '' : 's'} • 9:16 • 1080×1920 MP4
              </p>
            </div>

            {/* Video Format Info Box */}
            <div className="bg-[#191C20] p-3.5 rounded-2xl border border-white/10 space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#707477] tracking-wider">
                  Aspect ratio
                </span>
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Smartphone className="w-4 h-4 text-[#D5FF3F]" />
                  <span>9:16 (Vertical)</span>
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-white/5">
                <span className="text-[10px] uppercase font-bold text-[#707477] tracking-wider">
                  Output
                </span>
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Film className="w-4 h-4 text-[#D5FF3F]" />
                  <span>1080 × 1920 MP4</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5">
                {hasUnsavedChanges ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Unsaved changes
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] text-[#D5FF3F] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D5FF3F]" />
                    All changes saved
                  </div>
                )}
              </div>
            </div>

            {/* Keyboard Shortcuts Box */}
            <div className="bg-[#191C20] p-3.5 rounded-2xl border border-white/10 space-y-2">
              <span className="text-[10px] uppercase font-bold text-[#707477] tracking-wider block">
                Keyboard shortcuts
              </span>
              <div className="space-y-2 text-[11px] text-[#A7A9A8]">
                <div className="flex items-center justify-between">
                  <span className="bg-[#24282D] text-white px-1.5 py-0.5 rounded border border-white/10 font-mono text-[10px]">
                    Del
                  </span>
                  <span>Delete cut</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="bg-[#24282D] text-white px-1.5 py-0.5 rounded border border-white/10 font-mono text-[10px]">
                    ← →
                  </span>
                  <span>Select</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="bg-[#24282D] text-white px-1.5 py-0.5 rounded border border-white/10 font-mono text-[10px]">
                    D
                  </span>
                  <span>Duplicate cut</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="bg-[#24282D] text-white px-1.5 py-0.5 rounded border border-white/10 font-mono text-[10px]">
                    ⌘S
                  </span>
                  <span>Save</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* PANEL 2: Center Stage Video Preview & Timeline */}
        <main className="flex-1 flex flex-col justify-between overflow-hidden bg-[#0D0F11] p-4 gap-4">
          <div className="bg-[#14171A] rounded-2xl border border-white/10 p-4 flex flex-col flex-1 min-h-[360px] overflow-hidden relative">
            <Preview projectId={projectId} cuts={cuts} />
          </div>

          <div className="bg-[#14171A] rounded-2xl border border-white/10 p-4 space-y-3">
            <Timeline
              projectId={projectId}
              cuts={cuts}
              selectedId={selectedId}
              onSelect={select}
              onTrim={trim}
              onReorder={reorder}
              onDuplicate={duplicate}
              onDelete={del}
            />
          </div>
        </main>

        {/* PANEL 3: Right Inspector Sidebar */}
        <Inspector
          cut={selected}
          font={font}
          music={music}
          onCaptionChange={(lines) => captions(selectedId, lines)}
          onFontChange={setFont}
          onMusicChange={setMusic}
          onMusicClear={() => setMusic(null)}
          onSave={handleSave}
          saving={saving}
          saveError={saveError}
        />
      </div>

      {/* FOOTER BAR: Export Bar */}
      <ExportBar
        projectId={projectId}
        snapshot={{ cuts, music, font, export_path: exportPath }}
        enabled={cuts.length > 0}
        onNavigateExport={(jobId, dest) => onNavigateExport?.(projectId, jobId, dest)}
      />
    </div>
  )
}