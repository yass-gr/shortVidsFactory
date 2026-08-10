export type AppScreen = 'projects' | 'upload' | 'scripts' | 'editor' | 'exporting'

export type ProjectStatus = 'ready' | 'processing' | 'draft'

export interface ProjectMeta {
  id: string
  name: string
  duration_s: number | null
  status: ProjectStatus
  edited_at: string | null
}

export interface CaptionLine {
  start: number
  end: number
  text: string
}

export interface Cut {
  source_start: number
  source_end: number
  caption_lines: CaptionLine[]
}

export interface ScriptSummary {
  id: string
  hook: string
  summary: string
  duration_s: number
  words_used: number
  cuts: Cut[]
}

export interface MusicTrackItem {
  id: string
  title: string
  source: string
  path: string | null
}

export interface SnapshotMusic {
  source: string
  path: string | null
  offset: number
  trim_start: number
  trim_end: number | null
  volume: number
  duck: boolean
}

export interface EditorSnapshot {
  cuts: Cut[]
  music: SnapshotMusic | null
  font: string
  export_path: string
}

export interface JobEvent {
  id: string
  status: string
  progress: number
  result?: unknown
  error?: string
}