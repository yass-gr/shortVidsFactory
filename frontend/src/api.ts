import type { EditorSnapshot, JobEvent, ProjectMeta, ScriptSummary } from './types.js'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export async function apiFetch<T = unknown>(path: string, opts: RequestInit & { isForm?: boolean; json?: unknown } = {}): Promise<T> {
  const { isForm, json, ...rest } = opts as RequestInit & { isForm?: boolean; json?: unknown }
  let res: Response
  if (isForm) {
    res = await fetch(path, rest)
  } else if (json !== undefined) {
    res = await fetch(path, { ...rest, headers: { ...JSON_HEADERS, ...rest.headers }, body: JSON.stringify(json) })
  } else {
    res = await fetch(path, rest)
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (data && (data as { detail?: string }).detail) detail = (data as { detail: string }).detail
    } catch {
      // keep default detail message
    }
    const err = new Error(detail) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return res.json() as Promise<T>
}

export function createProject(name: string) {
  return apiFetch<{ id: string; name: string }>('/api/projects', { method: 'POST', json: { name } })
}

export function listProjects() {
  return apiFetch<{ projects: ProjectMeta[] }>('/api/projects')
}

export function uploadVideo(projectId: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  return apiFetch<{ project_id: string; job_id: string; media: unknown }>(`/api/projects/${projectId}/entries`, {
    method: 'POST',
    isForm: true,
    body: form,
  })
}

export function pollJob(jobId: string, onProgress?: (data: JobEvent) => void) {
  const source = new EventSource(`/api/jobs/${jobId}/stream`)
  const dispatch = (event: MessageEvent) => {
    let data: JobEvent
    try {
      data = JSON.parse(event.data)
    } catch {
      return
    }
    onProgress?.(data)
    if (data?.status === 'done' || data?.status === 'error') {
      source.close()
    }
  }
  source.onmessage = dispatch
  source.addEventListener('queued', dispatch)
  source.addEventListener('running', dispatch)
  source.addEventListener('done', dispatch)
  source.addEventListener('error', dispatch)
  return source
}

export function getScripts(projectId: string) {
  return apiFetch<ScriptSummary[] | { pending: string | null }>(`/api/projects/${projectId}/scripts`)
}

export function generateScripts(projectId: string) {
  return apiFetch(`/api/projects/${projectId}/scripts`, { method: 'POST', json: {} })
}

export function approveScript(projectId: string, scriptId: string) {
  return apiFetch(`/api/projects/${projectId}/approve`, { method: 'POST', json: { script_id: scriptId } })
}

export function getSnapshot(projectId: string) {
  return apiFetch(`/api/projects/${projectId}/snapshot`)
}

export function saveSnapshot(projectId: string, snapshot: EditorSnapshot) {
  return apiFetch<EditorSnapshot>(`/api/projects/${projectId}/snapshot`, { method: 'PUT', json: snapshot })
}

export function exportProject(projectId: string, destination: string) {
  return apiFetch(`/api/projects/${projectId}/export`, { method: 'POST', json: { destination } })
}

export function revealDirectory(projectId: string) {
  return apiFetch(`/api/projects/${projectId}/reveal`, { method: 'POST', json: {} })
}

export function getMusic() {
  return apiFetch('/api/music')
}