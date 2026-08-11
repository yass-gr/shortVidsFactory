import { useState } from 'react'
import { Folder, Send } from 'lucide-react'
import type { EditorSnapshot } from '../types'
import { exportProject, pollJob, revealDirectory, saveSnapshot } from '../api'

function defaultDestination(exportPath: string) {
  if (exportPath) {
    const idx = exportPath.lastIndexOf('/')
    if (idx > 0) return exportPath.slice(0, idx)
  }
  return '/tmp'
}

interface ExportBarProps {
  projectId: string
  snapshot: EditorSnapshot
  enabled: boolean
  onExported?: (path: string | undefined) => void
}

export default function ExportBar({ projectId, snapshot, enabled, onExported }: ExportBarProps) {
  const [destination, setDestination] = useState(defaultDestination(snapshot.export_path))
  const [progress, setProgress] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canExport = enabled && !exporting && destination.trim() !== ''

  function handleExport() {
    if (!canExport) return
    setExporting(true)
    setDone(false)
    setError(null)
    setProgress(0)
    saveSnapshot(projectId, snapshot)
      .then(() => exportProject(projectId, destination.trim()))
      .then((result) => {
        const { job_id } = result as { job_id: string }
        pollJob(job_id, (data) => {
          setProgress(data.progress || 0)
          if (data.status === 'done') {
            setExporting(false)
            setDone(true)
            const exportedPath = (data?.result as { path?: string } | undefined)?.path
            onExported?.(exportedPath)
          } else if (data.status === 'error') {
            setExporting(false)
            setError(data.error || 'Export failed')
          }
        })
      })
      .catch((err) => {
        setExporting(false)
        setError(err.message)
      })
  }

  return (
    <footer className="bg-[#14171A] border-t border-white/10 p-3.5 px-6 flex flex-wrap items-center justify-between gap-3 shrink-0 z-40">
      <div className="flex items-center gap-3 flex-1 max-w-md min-w-[260px]">
        <span className="text-xs font-semibold text-[#A7A9A8]">Export:</span>
        <div className="flex-1 bg-[#191C20] border border-white/10 rounded-xl px-3 py-1.5 flex items-center text-xs text-white">
          <input
            type="text"
            data-testid="export-destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="bg-transparent w-full font-mono text-xs text-white outline-none border-none"
          />
          <Folder className="w-4 h-4 text-[#707477] ml-2 shrink-0 cursor-pointer hover:text-white" />
        </div>
      </div>

      <div className="hidden md:flex items-center gap-3 text-xs text-[#A7A9A8]">
        <span className="text-[#D5FF3F] font-semibold">Ready to export</span>
        <span>•</span>
        <span className="font-mono text-white">MP4 • 1080×1920 • H.264</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end gap-1">
          {exporting && (
            <div className="flex items-center gap-2 text-xs text-[#A7A9A8]">
              <progress
                data-testid="export-progress"
                max={1}
                value={progress}
                className="w-24 h-1.5 rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-[#24282D] [&::-webkit-progress-value]:bg-[#D5FF3F]"
              />
              <span className="font-mono">{Math.round(progress * 100)}%</span>
            </div>
          )}
          {done && (
            <p data-testid="export-success" className="text-[11px] text-[#D5FF3F] font-semibold">
              Export complete
            </p>
          )}
          {done && (
            <button
              type="button"
              data-testid="open-folder"
              onClick={() => revealDirectory(projectId)}
              className="text-[11px] text-[#A7A9A8] underline underline-offset-2 hover:text-white transition-colors cursor-pointer"
            >
              Open folder
            </button>
          )}
          {error && (
            <p data-testid="export-error" className="text-[11px] text-[#FF5B63]">
              {error}
            </p>
          )}
          {error && (
            <button
              type="button"
              data-testid="export-retry"
              onClick={handleExport}
              className="text-[11px] text-[#A7A9A8] underline underline-offset-2 hover:text-white transition-colors cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>

        <button
          type="button"
          data-testid="export-button"
          onClick={handleExport}
          disabled={!canExport}
          className="flex items-center gap-2 bg-[#D5FF3F] hover:bg-[#E2FF70] text-black text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-[#D5FF3F]/10 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </footer>
  )
}