import React, { useRef, useState } from 'react'
import {
  UploadCloud, FileVideo, CheckCircle2, ArrowRight, Lightbulb,
  X, Sparkles, Loader2,
} from 'lucide-react'
import { createProject, pollJob, uploadVideo } from '../api'

interface UploadProps {
  onUploaded: (projectId: string) => void
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function processTextFor(progressPercent: number): string {
  if (progressPercent >= 80) return 'Writing scripts with AI...'
  if (progressPercent >= 15) return 'Transcribing audio with Whisper AI...'
  return 'Uploading video file...'
}

export default function Upload({ onUploaded }: UploadProps) {
  const [projectName, setProjectName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'processing' | 'done'>('idle')
  const [progressPercent, setProgressPercent] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] ?? null)
    setError(null)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      if (!file.type.startsWith('video/')) {
        setError('That file is not a video. Supported: MP4, MOV, MKV, WebM.')
        return
      }
      setSelectedFile(file)
      setError(null)
    }
  }

  const handleStartProcessing = async () => {
    if (!selectedFile) return
    setStatus('processing')
    setProgressPercent(5)
    setError(null)
    try {
      const project = await createProject(projectName.trim() || 'Untitled')
      const { job_id, project_id } = await uploadVideo(project.id, selectedFile)
      setProgressPercent(15)
      await new Promise<void>((resolve, reject) => {
        let source: ReturnType<typeof pollJob> | null = null
        source = pollJob(job_id, (data) => {
          if (data?.progress !== undefined) setProgressPercent(Math.round(data.progress * 100))
          if (data?.status === 'done') {
            source?.close()
            resolve()
          } else if (data?.status === 'error') {
            source?.close()
            reject(new Error((data as { error?: string }).error || 'Processing failed'))
          }
        })
      })
      setProgressPercent(100)
      setStatus('done')
      onUploaded(project_id)
    } catch (err) {
      setStatus('idle')
      setError((err as Error).message)
    }
  }

  const stepFilled = (threshold: number) =>
    status !== 'idle' && progressPercent >= threshold

  return (
    <div className="flex h-full bg-[#0D0F11] text-[#F5F5F2] overflow-hidden">
      {/* Workflow Sidebar */}
      <aside className="w-[280px] bg-[#14171A] border-r border-white/10 p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">New project</h2>
            <p className="text-xs text-[#8A8F94] mt-1">
              Convert long videos into vertical short clips.
            </p>
          </div>

          {/* Workflow Steps */}
          <div className="space-y-6 relative before:absolute before:left-[15px] before:top-3 before:bottom-3 before:w-[2px] before:bg-white/10">
            {/* Step 1 */}
            <div className="flex items-start gap-3 relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                status === 'idle'
                  ? 'bg-[#D5FF3F] text-black ring-4 ring-[#D5FF3F]/20'
                  : 'bg-[#D5FF3F] text-black'
              }`}>
                {status !== 'idle' ? <CheckCircle2 className="w-4 h-4" /> : '1'}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Upload video</h4>
                <p className="text-xs text-[#8A8F94]">Select source MP4/MOV file</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                stepFilled(15)
                  ? 'bg-[#D5FF3F] text-black ring-4 ring-[#D5FF3F]/20'
                  : 'bg-[#191C20] text-[#8A8F94] border border-white/10'
              }`}>
                2
              </div>
              <div>
                <h4 className={`text-sm font-semibold ${stepFilled(15) ? 'text-white' : 'text-[#8A8F94]'}`}>
                  Transcribing
                </h4>
                <p className="text-xs text-[#8A8F94]">Whisper AI speech-to-text</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                stepFilled(80)
                  ? 'bg-[#D5FF3F] text-black ring-4 ring-[#D5FF3F]/20'
                  : 'bg-[#191C20] text-[#8A8F94] border border-white/10'
              }`}>
                3
              </div>
              <div>
                <h4 className={`text-sm font-semibold ${stepFilled(80) ? 'text-white' : 'text-[#8A8F94]'}`}>
                  Writing scripts
                </h4>
                <p className="text-xs text-[#8A8F94]">AI is crafting short hooks</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-[#191C20] text-[#8A8F94] border border-white/10 flex items-center justify-center text-xs font-bold">
                4
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#8A8F94]">Editor</h4>
                <p className="text-xs text-[#8A8F94]">Pick a script to continue</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tip Box */}
        <div className="bg-[#191C20] p-4 rounded-2xl border border-white/5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#D5FF3F]">
            <Lightbulb className="w-4 h-4" />
            <span>Tip</span>
          </div>
          <p className="text-xs text-[#B4B6B5] leading-relaxed">
            For best results, pick a spoken-word video like a podcast, interview, or vlog with clear speech.
          </p>
        </div>
      </aside>

      {/* Main Form Area */}
      <main className="flex-1 overflow-y-auto p-10 flex flex-col justify-center max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Create a short video project</h1>
          <p className="text-sm text-[#B4B6B5] mt-1">
            Give your project a name and upload your video to generate AI scripts.
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handlePickFile}
          aria-label="Video file"
        />

        {error && (
          <div role="alert" className="bg-[#191C20] border border-[#FF5B63]/40 rounded-2xl p-4 text-xs text-[#FF5B63]">
            <p>{error}</p>
          </div>
        )}

        {/* Form Controls */}
        <div className="space-y-6 bg-[#191C20] p-8 rounded-3xl border border-white/10">
          {/* Project Name Input */}
          <div className="space-y-2">
            <label htmlFor="project-name" className="text-xs font-semibold uppercase tracking-wider text-[#B4B6B5]">
              1. Project name
            </label>
            <input
              id="project-name"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Creativity Talk – Plant Edition"
              className="w-full bg-[#111316] border border-white/15 focus:border-[#D5FF3F] rounded-xl px-4 py-3 text-sm text-white placeholder-[#8A8F94] outline-none transition-colors"
            />
          </div>

          {/* Video Picker / Dropzone */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#B4B6B5]">
              2. Upload video file
            </label>

            {!selectedFile ? (
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragOver(true)
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                data-testid="dropzone"
                className={`border-2 border-dashed bg-[#111316]/60 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 cursor-pointer transition-all group ${
                  isDragOver ? 'border-[#D5FF3F] bg-[#D5FF3F]/5' : 'border-white/20 hover:border-[#D5FF3F]'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-[#D5FF3F]/10 border border-[#D5FF3F]/30 text-[#D5FF3F] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Drag & drop your video here or <span className="text-[#D5FF3F] underline">Browse files</span>
                  </p>
                  <p className="text-xs text-[#8A8F94] mt-1">
                    Supports MP4, MOV, MKV, WebM • Max size 4 GB
                  </p>
                </div>
              </div>
            ) : (
              /* Selected File Card */
              <div className="bg-[#111316] p-4 rounded-2xl border border-white/15 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#D5FF3F]/10 border border-[#D5FF3F]/20 text-[#D5FF3F] flex items-center justify-center">
                    <FileVideo className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{selectedFile.name}</h4>
                    <p className="text-xs text-[#8A8F94]">{formatBytes(selectedFile.size)}</p>
                  </div>
                </div>
                {status === 'idle' && (
                  <button type="button" onClick={() => setSelectedFile(null)} aria-label="Remove file" className="p-1.5 rounded-lg text-[#8A8F94] hover:text-white hover:bg-white/10 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Processing / Progress Animation Bar */}
          {status === 'processing' && (
            <div role="progressbar" aria-valuenow={progressPercent} className="bg-[#111316] p-5 rounded-2xl border border-[#D5FF3F]/30 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-[#D5FF3F] font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {processTextFor(progressPercent)}
                </span>
                <span className="font-mono text-[#D5FF3F] font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full bg-[#24282D] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#D5FF3F] h-full transition-all duration-300 shadow-[0_0_12px_rgba(213,255,63,0.5)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Action Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={!selectedFile || status === 'processing'}
              onClick={handleStartProcessing}
              className="flex items-center gap-2 bg-[#D5FF3F] hover:bg-[#E2FF70] disabled:opacity-50 text-black text-sm font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-[#D5FF3F]/10 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate AI Scripts</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}