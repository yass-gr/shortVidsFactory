import React, { useEffect, useState } from 'react'
import {
  CheckCircle2, Sparkles, ArrowRight, RotateCw, Info,
  Lightbulb, FileText, Clock, Scissors,
} from 'lucide-react'
import type { ScriptSummary } from '../types'
import { formatDuration, formatTime } from '../format'
import { approveScript, generateScripts, getScripts, pollJob } from '../api'

interface ScriptsProps {
  projectId: string
  onPick: () => void
}

const frameFor = (projectId: string, t: number) => `/api/projects/${projectId}/frame?t=${t}`

export default function Scripts({ projectId, onPick }: ScriptsProps) {
  const [scripts, setScripts] = useState<ScriptSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  useEffect(() => {
    let source: ReturnType<typeof pollJob> | null = null
    let cancelled = false
    setScripts(null)
    setError(null)

    async function load() {
      try {
        const data = await getScripts(projectId)
        if (cancelled) return
        if (Array.isArray(data)) {
          setScripts(data)
          return
        }
        let jobId = data?.pending
        if (!jobId) {
          const { job_id } = (await generateScripts(projectId)) as { job_id: string }
          if (cancelled) return
          jobId = job_id
        }
        source = pollJob(jobId, (job) => {
          if (cancelled) return
          if (job?.status === 'done') {
            source?.close()
            setScripts((job?.result as ScriptSummary[]) ?? [])
          } else if (job?.status === 'error') {
            source?.close()
            setError(job?.error || 'Script generation failed')
          }
        })
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      }
    }

    load()
    return () => {
      cancelled = true
      source?.close()
    }
  }, [projectId, attempt])

  async function handleUse(script: ScriptSummary) {
    setApprovingId(script.id)
    try {
      await approveScript(projectId, script.id)
      onPick()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setApprovingId(null)
    }
  }

  const handleRegenerate = async () => {
    setError(null)
    setScripts(null)
    try {
      const { job_id } = (await generateScripts(projectId)) as { job_id: string }
      let source: ReturnType<typeof pollJob> | null = null
      source = pollJob(job_id, (job) => {
        if (job?.status === 'done') {
          source?.close()
          setScripts((job?.result as ScriptSummary[]) ?? [])
        } else if (job?.status === 'error') {
          source?.close()
          setError((job as { error?: string }).error || 'Script generation failed')
        }
      })
    } catch (err) {
      setError((err as Error).message)
    }
  }

  function retry() {
    setAttempt((a) => a + 1)
  }

  return (
    <div className="flex h-full bg-[#0D0F11] text-[#F5F5F2] overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-[280px] bg-[#14171A] border-r border-white/10 p-5 flex flex-col justify-between shrink-0 overflow-y-auto">
        <div className="space-y-6">
          {/* Source Video Preview Card */}
          <div className="bg-[#191C20] rounded-2xl border border-white/10 overflow-hidden">
            <div className="relative aspect-video bg-black">
              <img
                src={frameFor(projectId, 0)}
                alt="Source video"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-3 space-y-1">
              <h4 className="text-xs font-semibold text-white truncate">Project {projectId}</h4>
              <p className="text-[11px] text-[#8A8F94] truncate">
                Source video: {projectId}
              </p>
            </div>
          </div>

          {/* Workflow Steps Tracker */}
          <div className="space-y-4 relative before:absolute before:left-[13px] before:top-2.5 before:bottom-2.5 before:w-[2px] before:bg-white/10">
            {/* Step 1 */}
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-7 h-7 rounded-full bg-[#D5FF3F] text-black flex items-center justify-center text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-semibold text-white">Upload</h5>
                <p className="text-[10px] text-[#8A8F94]">Completed</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-7 h-7 rounded-full bg-[#D5FF3F] text-black flex items-center justify-center text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-semibold text-white">Transcribing</h5>
                <p className="text-[10px] text-[#8A8F94]">Completed (100%)</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-7 h-7 rounded-full bg-[#D5FF3F] text-black ring-4 ring-[#D5FF3F]/20 flex items-center justify-center text-xs font-bold">
                3
              </div>
              <div>
                <h5 className="text-xs font-semibold text-[#D5FF3F]">Writing scripts</h5>
                <p className="text-[10px] text-[#B4B6B5]">AI is crafting ideas</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-7 h-7 rounded-full bg-[#191C20] text-[#8A8F94] border border-white/10 flex items-center justify-center text-xs font-bold">
                4
              </div>
              <div>
                <h5 className="text-xs font-semibold text-[#8A8F94]">Editor</h5>
                <p className="text-[10px] text-[#8A8F94]">Pick a script to continue</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tip Box */}
        <div className="bg-[#191C20] p-3.5 rounded-2xl border border-white/5 space-y-1.5 mt-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#D5FF3F]">
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Tip</span>
          </div>
          <p className="text-[11px] text-[#B4B6B5] leading-relaxed">
            Each script is designed for a 15–30 second short. Pick the one that fits your audience best.
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 flex flex-col justify-between space-y-6">
        <div className="space-y-6">
          {/* Header Row */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Choose a script</h1>
              <p className="text-sm text-[#B4B6B5] mt-1">
                We've generated up to 3 short-video scripts. Pick the one you like best.
              </p>
            </div>

            {/* Top Right Info Notice Box */}
            <div className="hidden xl:flex items-center gap-2 bg-[#191C20] border border-white/10 px-3.5 py-2 rounded-xl text-xs text-[#B4B6B5]">
              <Info className="w-4 h-4 text-[#D5FF3F] shrink-0" />
              <span>Scripts are based on the transcript of your video and optimized for short-form engagement.</span>
            </div>
          </div>

          {error && (
            <div role="alert" className="bg-[#191C20] border border-[#FF5B63]/40 rounded-2xl p-4 text-xs text-[#FF5B63]">
              <p>{error}</p>
              <button
                type="button"
                onClick={retry}
                className="mt-3 bg-[#24282D] hover:bg-white/10 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {scripts === null && !error && <p className="text-sm text-[#B4B6B5]">Loading…</p>}

          {scripts && scripts.length === 0 && !error && <p className="text-sm text-[#B4B6B5]">No scripts yet.</p>}

          {scripts && scripts.length > 0 && (
            <>
              {/* Generated Badge */}
              <div className="inline-flex items-center gap-2 bg-[#D5FF3F]/10 border border-[#D5FF3F]/30 px-3 py-1 rounded-full text-xs font-semibold text-[#D5FF3F]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{scripts.length} scripts generated</span>
              </div>

              {/* Script Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {scripts.map((script, idx) => {
                  const firstCutStart = script.cuts.length > 0 ? script.cuts[0].source_start : 0
                  return (
                    <article key={script.id} className="bg-[#191C20] rounded-2xl p-5 border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 group relative border-white/10 hover:border-white/20">
                      {/* Top bar: number badge */}
                      <div className="flex items-center justify-between">
                        <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                          {idx + 1}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-bold text-white tracking-tight leading-snug group-hover:text-[#D5FF3F] transition-colors">
                        {script.hook}
                      </h3>

                      {/* Thumbnail frame */}
                      <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-black border border-white/10">
                        <img src={frameFor(projectId, firstCutStart)} alt={script.hook} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30" />
                        <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">
                          {formatTime(firstCutStart)}
                        </div>
                      </div>

                      {/* Summary */}
                      <p className="text-xs text-[#B4B6B5] leading-relaxed line-clamp-3">{script.summary}</p>

                      {/* Stats footer */}
                      <div className="grid grid-cols-3 gap-1 pt-3 border-t border-white/5 text-[11px] text-[#8A8F94]">
                        <div className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /><span>{script.words_used} words</span></div>
                        <div className="flex items-center gap-1 justify-center"><Clock className="w-3.5 h-3.5" /><span>{formatDuration(script.duration_s)}</span></div>
                        <div className="flex items-center gap-1 justify-end"><Scissors className="w-3.5 h-3.5" /><span>{script.cuts.length} cut{script.cuts.length === 1 ? '' : 's'}</span></div>
                      </div>

                      {/* Action */}
                      <button
                        type="button"
                        disabled={approvingId !== null}
                        onClick={() => handleUse(script)}
                        className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer bg-[#24282D] text-white hover:bg-white/10 disabled:opacity-50"
                      >
                        <span>{approvingId === script.id ? 'Approving…' : 'Use this'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </article>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Bottom Bar: Regenerate */}
        {scripts && scripts.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10 text-xs text-[#8A8F94]">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#D5FF3F]" />
              <span>You can always regenerate scripts if you want different ideas.</span>
            </div>

            <button
              type="button"
              onClick={handleRegenerate}
              className="flex items-center gap-2 bg-[#191C20] hover:bg-[#24282D] text-white px-4 py-2 rounded-xl border border-white/10 transition-colors font-medium cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Regenerate scripts</span>
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
