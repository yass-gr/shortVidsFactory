const JSON_HEADERS = { 'Content-Type': 'application/json' }

export async function apiFetch(path, opts = {}) {
  const { isForm, json, ...rest } = opts
  let res
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
      if (data && data.detail) detail = data.detail
    } catch {
      // keep default detail message
    }
    throw new Error(detail)
  }
  return res.json()
}

export function createProject(name) {
  return apiFetch('/api/projects', { method: 'POST', json: { name } })
}

export function listProjects() {
  return apiFetch('/api/projects')
}

export function uploadVideo(projectId, file) {
  const form = new FormData()
  form.append('file', file)
  return apiFetch(`/api/projects/${projectId}/entries`, { method: 'POST', isForm: true, body: form })
}

export function pollJob(jobId, onProgress) {
  const source = new EventSource(`/api/jobs/${jobId}/stream`)
  const dispatch = (event) => {
    let data
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

export function getScripts(projectId) {
  return apiFetch(`/api/projects/${projectId}/scripts`)
}

export function generateScripts(projectId) {
  return apiFetch(`/api/projects/${projectId}/scripts`, { method: 'POST', json: {} })
}

export function approveScript(projectId, scriptId) {
  return apiFetch(`/api/projects/${projectId}/approve`, { method: 'POST', json: { script_id: scriptId } })
}

export function getSnapshot(projectId) {
  return apiFetch(`/api/projects/${projectId}/snapshot`)
}

export function saveSnapshot(projectId, snapshot) {
  return apiFetch(`/api/projects/${projectId}/snapshot`, { method: 'PUT', json: snapshot })
}

export function exportProject(projectId, destination) {
  return apiFetch(`/api/projects/${projectId}/export`, { method: 'POST', json: { destination } })
}

export function getMusic() {
  return apiFetch('/api/music')
}