// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiFetch,
  approveScript,
  createProject,
  exportProject,
  generateScripts,
  getMusic,
  getScripts,
  getSnapshot,
  pollJob,
  revealDirectory,
  saveSnapshot,
  uploadVideo,
} from '../api.js'

function jsonResponse(body, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  }
}

class FakeEventSource {
  static close = vi.fn()
  constructor(url) {
    this.url = url
    this.handlers = {}
    FakeEventSource.instances.push(this)
  }
  addEventListener(type, fn) {
    ;(this.handlers[type] ||= []).push(fn)
  }
  emit(type, data) {
    const listeners = this.handlers[type] || []
    if (type === 'message') listeners.push(this.onmessage)
    listeners.filter(Boolean).forEach((fn) => fn({ data: JSON.stringify(data) }))
  }
  close() {
    FakeEventSource.close()
  }
}
FakeEventSource.instances = []

describe('api client', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
    FakeEventSource.instances = []
    FakeEventSource.close.mockReset()
    global.EventSource = FakeEventSource
  })

  afterEach(() => {
    delete global.EventSource
    vi.restoreAllMocks()
  })

  describe('apiFetch', () => {
    it('GETs and parses JSON on ok', async () => {
      global.fetch.mockResolvedValue(jsonResponse({ hello: 'world' }))
      const data = await apiFetch('/api/health')
      expect(global.fetch).toHaveBeenCalledWith('/api/health', {})
      expect(data).toEqual({ hello: 'world' })
    })

    it('throws with server detail on error', async () => {
      global.fetch.mockResolvedValue(jsonResponse({ detail: 'nope' }, false, 404))
      await expect(apiFetch('/api/projects/x/snapshot')).rejects.toThrow('nope')
    })

    it('throws with generic message when body is not json', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 500, json: () => Promise.reject(new Error('x')) })
      await expect(apiFetch('/api/bad')).rejects.toThrow('Request failed (500)')
    })

    it('attaches the http status to the thrown error', async () => {
      global.fetch.mockResolvedValue(jsonResponse({ detail: 'nope' }, false, 404))
      const err = await apiFetch('/api/projects/x/snapshot').catch((e) => e)
      expect(err.status).toBe(404)
      expect(err.message).toBe('nope')
    })
  })

  describe('createProject', () => {
    it('POSTs the body to /api/projects and returns the project', async () => {
      global.fetch.mockResolvedValue(jsonResponse({ id: 'abc', name: 'demo' }))
      const result = await createProject('demo')
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/projects',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'demo' }),
        }),
      )
      expect(result).toEqual({ id: 'abc', name: 'demo' })
    })
  })

  describe('uploadVideo', () => {
    it('POSTs a FormData body to the entries endpoint', async () => {
      global.fetch.mockResolvedValue(jsonResponse({ job_id: 'j1', media: {} }))
      const file = new File(['abc'], 'clip.mp4', { type: 'video/mp4' })
      const result = await uploadVideo('p1', file)
      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('/api/projects/p1/entries')
      expect(init.method).toBe('POST')
      expect(init.body).toBeInstanceOf(FormData)
      expect(init.body.get('file')).toBe(file)
      expect(init.headers).toBeUndefined()
      expect(result).toEqual({ job_id: 'j1', media: {} })
    })
  })

  describe('scripts endpoints', () => {
    it('getScripts hits the scripts route', async () => {
      global.fetch.mockResolvedValue(jsonResponse([{ id: 's1' }]))
      const data = await getScripts('p1')
      expect(global.fetch).toHaveBeenCalledWith('/api/projects/p1/scripts', {})
      expect(data).toEqual([{ id: 's1' }])
    })

    it('generateScripts POSTs to the scripts route', async () => {
      global.fetch.mockResolvedValue(jsonResponse({ job_id: 'j2' }))
      const data = await generateScripts('p1')
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/projects/p1/scripts',
        expect.objectContaining({ method: 'POST' }),
      )
      expect(data).toEqual({ job_id: 'j2' })
    })

    it('approveScript POSTs script_id to the approve route', async () => {
      global.fetch.mockResolvedValue(jsonResponse({ cuts: [] }))
      const data = await approveScript('p1', 's1')
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/projects/p1/approve',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ script_id: 's1' }),
        }),
      )
      expect(data).toEqual({ cuts: [] })
    })
  })

  describe('snapshot + export + music', () => {
    it('getSnapshot GETs the snapshot route', async () => {
      global.fetch.mockResolvedValue(jsonResponse({ cuts: [] }))
      await getSnapshot('p1')
      expect(global.fetch).toHaveBeenCalledWith('/api/projects/p1/snapshot', {})
    })

    it('saveSnapshot PUTs the snapshot', async () => {
      global.fetch.mockResolvedValue(jsonResponse({ cuts: [] }))
      await saveSnapshot('p1', { cuts: [] })
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/projects/p1/snapshot',
        expect.objectContaining({ method: 'PUT', body: JSON.stringify({ cuts: [] }) }),
      )
    })

    it('exportProject POSTs destination', async () => {
      global.fetch.mockResolvedValue(jsonResponse({ job_id: 'j3' }))
      await exportProject('p1', '/tmp/out')
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/projects/p1/export',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ destination: '/tmp/out' }) }),
      )
    })

    it('revealDirectory POSTs to the reveal route', async () => {
      global.fetch.mockResolvedValue(jsonResponse({ ok: true }))
      const data = await revealDirectory('p1')
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/projects/p1/reveal',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({}) }),
      )
      expect(data).toEqual({ ok: true })
    })

    it('getMusic GETs the music route', async () => {
      global.fetch.mockResolvedValue(jsonResponse({ tracks: [] }))
      const data = await getMusic()
      expect(global.fetch).toHaveBeenCalledWith('/api/music', {})
      expect(data).toEqual({ tracks: [] })
    })
  })

  describe('pollJob', () => {
    it('opens an EventSource, forwards events, and closes on done', () => {
      const onProgress = vi.fn()
      const source = pollJob('j9', onProgress)
      expect(source).toBeInstanceOf(FakeEventSource)
      expect(FakeEventSource.instances[0].url).toBe('/api/jobs/j9/stream')
      source.emit('running', { status: 'running', progress: 0.5 })
      source.emit('done', { status: 'done', progress: 1, result: [1, 2] })
      expect(onProgress).toHaveBeenNthCalledWith(1, { status: 'running', progress: 0.5 })
      expect(onProgress).toHaveBeenNthCalledWith(2, { status: 'done', progress: 1, result: [1, 2] })
      expect(FakeEventSource.close).toHaveBeenCalled()
    })

    it('does not close on non-terminal events', () => {
      const source = pollJob('p8', vi.fn())
      source.emit('queued', { status: 'queued', progress: 0 })
      expect(FakeEventSource.close).not.toHaveBeenCalled()
    })

    it('does not close when the server announces an error', () => {
      const source = pollJob('p7', () => {})
      source.emit('error', { status: 'error', progress: 1, error: 'kaboom' })
      expect(FakeEventSource.close).toHaveBeenCalled()
    })
  })
})