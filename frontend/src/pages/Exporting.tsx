import { useEffect, useState } from 'react'
import {
  CheckCircle2, Loader2, ArrowLeft, FileText, Sparkles, Folder,
  ExternalLink, ChevronUp, ChevronDown, Check,
} from 'lucide-react'
import { pollJob, revealDirectory } from '../api'
import type { JobEvent } from '../types'

interface ExportingProps {
  projectId: string
  jobId: string
  destination: string
  onBack: () => void
}

const STEP_LABELS = ['Prepare', 'Render video', 'Add music', 'Export']
const STEP_DETAILS = [
  'Cuts and assets ready',
  'Rendering your video',
  'Mixing and ducking audio',
  'Finalizing your video',
]

type LogStatus = 'pending' | 'in_progress' | 'completed'

export default function Exporting({ projectId, jobId, destination, onBack }: ExportingProps) {
  const [progressPercent, setProgressPercent] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)
  const [resultPath, setResultPath] = useState<string | null>(null)
  const [logs, setLogs] = useState<Array<{ status: LogStatus; message: string }>>(
    STEP_LABELS.map((label, i) => ({
      status: i === 0 ? 'in_progress' : 'pending',
      message: `${label}...`,
    })),
  )
  const [showLogs, setShowLogs] = useState(true)

  useEffect(() => {
    if (!jobId) {
      setError('No export job is running.')
      return undefined
    }

    const source = pollJob(jobId, (data: JobEvent) => {
      const progress = data?.progress ?? 0
      setProgressPercent(Math.round(progress * 100))

      const stepIdx = progress < 0.25 ? 0 : progress < 0.5 ? 1 : progress < 0.75 ? 2 : 3
      setLogs((prev) =>
        prev.map((log, i) => ({
          ...log,
          status: i < stepIdx ? 'completed' : i === stepIdx ? 'in_progress' : 'pending',
          message: i < stepIdx ? `${STEP_LABELS[i]} — Done` : i === stepIdx ? `${STEP_LABELS[i]}...` : log.message,
        })),
      )

      if (data?.status === 'done') {
        setCompleted(true)
        setProgressPercent(100)
        const path = (data?.result as { path?: string } | undefined)?.path
        setResultPath(path ?? null)
        setLogs((prev) =>
          prev.map((log, i) => ({
            status: 'completed',
            message: `${STEP_LABELS[i]} — Done`,
          })),
        )
      } else if (data?.status === 'error') {
        setError(data.error || 'Export failed')
      }
    })

    return () => source.close()
  }, [jobId])

  const stepStatus = (i: number): LogStatus => logs[i]?.status ?? 'pending'

  return (
    <div className="flex h-[calc(100vh-60px)] bg-[#0D0F11] text-[#F5F5F2] overflow-hidden select-none">
      {/* LEFT SIDEBAR: Steps & Help (260px) */}
      <aside className="w-[260px] bg-[#14171A] border-r border-white/10 p-5 flex flex-col justify-between shrink-0 overflow-y-auto">
        <div className="space-y-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs text-[#707477] hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to editor</span>
          </button>

          <div>
            <h3 className="text-xs font-bold text-[#707477] uppercase tracking-wider">
              EXPORT STEPS
            </h3>

            {/* Steps Timeline */}
            <div className="space-y-4 mt-4 relative before:absolute before:left-[13px] before:top-2.5 before:bottom-2.5 before:w-[2px] before:bg-white/10">
              {STEP_LABELS.map((label, i) => {
                const status = stepStatus(i)
                return (
                  <div key={label} className="flex items-start gap-3 relative z-10">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        status === 'completed'
                          ? 'bg-[#D5FF3F] text-black'
                          : status === 'in_progress'
                            ? 'bg-[#D5FF3F] text-black ring-4 ring-[#D5FF3F]/20'
                            : 'bg-[#24282D] text-[#707477] border border-white/10'
                      }`}
                    >
                      {status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : status === 'in_progress' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 opacity-0" />
                      )}
                    </div>
                    <div>
                      <h4
                        className={`text-xs font-semibold ${
                          status === 'completed' || status === 'in_progress' ? 'text-white' : 'text-[#707477]'
                        }`}
                      >
                        {label}
                      </h4>
                      <p className="text-[10px] text-[#707477]">
                        {status === 'completed'
                          ? 'Done'
                          : status === 'in_progress'
                            ? STEP_DETAILS[i]
                            : 'Pending'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-[#191C20] p-4 rounded-2xl border border-white/5 space-y-3">
            <h5 className="text-xs font-bold text-white">What's happening?</h5>
            <div className="space-y-2 text-[11px] text-[#A7A9A8] leading-relaxed">
              <div className="flex items-start gap-2">
                <FileText className="w-3.5 h-3.5 text-[#D5FF3F] shrink-0 mt-0.5" />
                <span>We're encoding your final video and audio, then saving it to your chosen folder.</span>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="w-3.5 h-3.5 text-[#D5FF3F] shrink-0 mt-0.5" />
                <span>You'll get an MP4 (1080×1920) file with burned-in captions and music.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Need Help Footer Link */}
        <div className="pt-4 border-t border-white/10" />
      </aside>

      {/* MIDDLE PANEL: Export Status, Progress & Live Logs */}
      <main className="flex-1 overflow-y-auto p-8 flex flex-col justify-between space-y-6">
        <div className="space-y-6">
          {/* Main Title & File Name Pill */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">Exporting your video</h1>
            <p className="text-xs text-[#A7A9A8]">
              Please don't close ShortVidsFactory while we're exporting.
            </p>

            <div className="inline-flex items-center gap-2 bg-[#191C20] border border-white/10 px-4 py-2 rounded-xl text-xs font-mono text-white">
              <FileText className="w-4 h-4 text-[#D5FF3F]" />
              <span>shortvids_export.mp4</span>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs font-semibold text-[#FF5B63] bg-[#FF5B63]/10 border border-[#FF5B63]/40 p-4 rounded-2xl">
              {error} — nothing was saved to disk.
            </p>
          )}

          {/* Large % Metric & Progress Bar Box */}
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            className="bg-[#191C20] p-8 rounded-3xl border border-white/10 space-y-4"
          >
            <div className="flex items-baseline gap-4">
              <h3 className="text-3xl font-black text-[#D5FF3F] tracking-tight">
                Exporting video… {progressPercent}%
              </h3>
              {completed && (
                <span className="text-xs font-bold text-white">
                  Export complete! File saved to destination
                </span>
              )}
            </div>

            {/* Lime Green Progress Bar */}
            <div className="w-full bg-[#24282D] h-3 rounded-full overflow-hidden">
              <div
                className="bg-[#D5FF3F] h-full transition-all duration-300 shadow-[0_0_16px_rgba(213,255,63,0.5)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Live Log Terminal Card */}
          <div className="bg-[#191C20] rounded-2xl border border-white/10 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] animate-pulse" />
                <span>Live log</span>
              </div>
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="flex items-center gap-1 text-xs text-[#707477] hover:text-white transition-colors cursor-pointer"
              >
                <span>{showLogs ? 'Show less' : 'Show log'}</span>
                {showLogs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showLogs && (
              <div className="space-y-2 font-mono text-xs text-[#A7A9A8] max-h-[180px] overflow-y-auto pt-1">
                {logs.map((log, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {log.status === 'completed' ? (
                      <Check className="w-3.5 h-3.5 text-[#D5FF3F]" />
                    ) : log.status === 'in_progress' ? (
                      <Loader2 className="w-3.5 h-3.5 text-[#FFB13B] animate-spin" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-white/20" />
                    )}
                    <span className={log.status === 'in_progress' ? 'text-white font-semibold' : ''}>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Encouragement Card */}
          <div className="bg-[#191C20] p-5 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-[#8E6BFF]/20 text-[#8E6BFF] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Almost there!</h4>
              <p className="text-xs text-[#A7A9A8]">
                Your short video will be saved to the destination folder when export is complete.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* RIGHT PANEL: Video Preview & Export Settings (320px) */}
      <aside className="w-[320px] bg-[#14171A] border-l border-white/10 p-5 flex flex-col justify-between shrink-0 overflow-y-auto">
        <div className="space-y-5">
          <h4 className="text-xs font-bold text-white">Preview</h4>

          {/* 9:16 Preview Card */}
          <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-white/10 shadow-xl max-h-[260px] mx-auto">
            <img
              src={`/api/projects/${projectId}/frame?t=0`}
              alt="Export video preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20" />
          </div>

          {/* Export Settings Summary */}
          <div className="space-y-2 pt-3 border-t border-white/10 text-xs">
            <h5 className="font-bold text-white">Export settings</h5>
            <div className="space-y-1.5 text-[#A7A9A8]">
              <div className="flex justify-between">
                <span>Resolution</span>
                <span className="font-mono text-white">1080 × 1920 (9:16)</span>
              </div>
              <div className="flex justify-between">
                <span>Format</span>
                <span className="font-mono text-white">MP4</span>
              </div>
              <div className="flex justify-between">
                <span>Codec</span>
                <span className="font-mono text-white">H.264</span>
              </div>
              <div className="flex justify-between">
                <span>FPS</span>
                <span className="font-mono text-white">30</span>
              </div>
              <div className="flex justify-between">
                <span>Audio</span>
                <span className="font-mono text-white">AAC, 48kHz</span>
              </div>
            </div>
          </div>

          {/* Destination Path */}
          <div className="space-y-1.5 pt-2 border-t border-white/10">
            <label className="text-[10px] font-bold text-[#707477] uppercase tracking-wider block">
              Destination
            </label>
            <div className="bg-[#191C20] p-2.5 rounded-xl border border-white/10 flex items-center justify-between text-xs text-white">
              <span className="font-mono text-[11px] truncate">{destination || 'No destination set'}</span>
              <Folder className="w-4 h-4 text-[#707477] shrink-0" />
            </div>
          </div>

          {/* Status Action Cards at bottom */}
          <div className="space-y-3 pt-2">
            {!completed && !error && (
              <div className="bg-[#191C20] p-4 rounded-2xl border border-[#D5FF3F] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#D5FF3F]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Exporting…</span>
                </div>
                <p className="text-[11px] text-[#A7A9A8]">
                  You'll be notified when it's done.
                </p>
                <button
                  onClick={onBack}
                  title="The export keeps running in the background"
                  className="w-full py-2 rounded-xl border border-white/10 text-[#A7A9A8] hover:bg-white/5 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to editor</span>
                </button>
                <p className="text-[10px] text-[#707477] text-center">
                  Export continues in the background.
                </p>
              </div>
            )}

            {completed && !error && (
              <div className="bg-[#191C20] p-4 rounded-2xl border border-[#D5FF3F] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#D5FF3F]">
                  <CheckCircle2 className="w-4 h-4 text-[#D5FF3F]" />
                  <span>Export completed successfully!</span>
                </div>
                <p className="text-[11px] text-[#A7A9A8] break-all">
                  {resultPath || 'Your video was saved to the destination folder.'}
                </p>
                <button
                  onClick={() => revealDirectory(projectId)}
                  className="w-full py-2.5 rounded-xl bg-[#D5FF3F] hover:bg-[#E2FF70] text-black text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-[#D5FF3F]/10 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Folder</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
