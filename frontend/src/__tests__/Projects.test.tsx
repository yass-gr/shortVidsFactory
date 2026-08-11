import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Projects from '../pages/Projects.tsx'
import * as api from '../api.js'
import type { ProjectMeta } from '../types'

vi.mock('../api.js', () => ({
  apiFetch: vi.fn(),
  listProjects: vi.fn(),
}))

const apiMock = vi.mocked(api)

const PROJECTS: ProjectMeta[] = [
  { id: 'p1', name: 'Startup Podcast Ep. 12', duration_s: 1471, status: 'ready', edited_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
  { id: 'p2', name: 'Creativity Talk', duration_s: null, status: 'processing', edited_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString() },
]

function makeProps(overrides = {}) {
  return {
    onSelectProject: vi.fn(),
    onNewProjectClick: vi.fn(),
    onOpenSettings: vi.fn(),
    ...overrides,
  }
}

describe('Projects', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows loading then renders project cards with statuses and duration', async () => {
    apiMock.listProjects.mockResolvedValue({ projects: PROJECTS })
    render(<Projects {...makeProps()} />)

    expect(screen.getByText(/loading/i)).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Startup Podcast Ep. 12')).toBeTruthy())
    expect(screen.getByText('Creativity Talk')).toBeTruthy()
    expect(screen.getByText(/24:31/)).toBeTruthy()
    expect(screen.getByText('Ready')).toBeTruthy()
    expect(screen.getByText('Processing')).toBeTruthy()
    expect(screen.getByText(/2h ago/)).toBeTruthy()
    expect(screen.getByText(/1d ago/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /create new project/i })).toBeTruthy()
  })

  it('fetches a frame thumbnail from the frame endpoint', async () => {
    apiMock.listProjects.mockResolvedValue({ projects: [PROJECTS[0]] })
    render(<Projects {...makeProps()} />)
    await waitFor(() => expect(screen.getByAltText('Startup Podcast Ep. 12')).toBeTruthy())
    const img = screen.getByAltText('Startup Podcast Ep. 12') as HTMLImageElement
    expect(img.src).toContain('/api/projects/p1/frame')
  })

  it('calls onSelectProject when Continue is clicked', async () => {
    apiMock.listProjects.mockResolvedValue({ projects: PROJECTS })
    const props = makeProps()
    render(<Projects {...props} />)
    await waitFor(() => expect(screen.getByText('Startup Podcast Ep. 12')).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: /continue/i })[0])
    expect(props.onSelectProject).toHaveBeenCalledWith(PROJECTS[0])
  })

  it('shows empty state when no projects exist', async () => {
    apiMock.listProjects.mockResolvedValue({ projects: [] })
    render(<Projects {...makeProps()} />)
    await waitFor(() => expect(screen.getByText(/no projects yet/i)).toBeTruthy())
  })

  it('shows an error with Retry that reloads', async () => {
    apiMock.listProjects.mockRejectedValueOnce(new Error('backend down'))
    apiMock.listProjects.mockResolvedValue({ projects: PROJECTS })
    render(<Projects {...makeProps()} />)
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    await waitFor(() => expect(screen.getByText('Startup Podcast Ep. 12')).toBeTruthy())
    expect(apiMock.listProjects).toHaveBeenCalledTimes(2)
  })
})