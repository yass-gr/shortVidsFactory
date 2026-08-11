import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Inspector from '../editor/Inspector.tsx'
import * as api from '../api.js'

vi.mock('../api.js', () => ({
  getMusic: vi.fn(),
}))

const apiMock = vi.mocked(api)

const TRACKS = [
  { id: 'm1', title: 'Upbeat', source: 'local', path: '/music/upbeat.mp3' },
  { id: 'm2', title: 'Chill', source: 'local', path: '/music/chill.mp3' },
]

const MUSIC = {
  source: 'local',
  path: '/music/upbeat.mp3',
  offset: 0,
  trim_start: 0,
  trim_end: null,
  volume: 0.8,
  duck: true,
}

const CUT = {
  source_start: 5,
  source_end: 9,
  caption_lines: [
    { start: 5, end: 7, text: 'Hello' },
    { start: 7, end: 9, text: 'World' },
  ],
}

function makeProps(overrides = {}) {
  return {
    cut: CUT,
    font: 'Arial',
    music: null,
    onCaptionChange: vi.fn(),
    onFontChange: vi.fn(),
    onMusicChange: vi.fn(),
    onMusicClear: vi.fn(),
    onSave: vi.fn(),
    ...overrides,
  }
}

function renderInspector(overrides = {}) {
  const props = makeProps(overrides)
  render(<Inspector {...props} />)
  return props
}

// await the async getMusic load so its state update is flushed inside act
const musicLoaded = () => screen.findByText('Upbeat')

describe('Inspector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMock.getMusic.mockResolvedValue({ tracks: TRACKS, social: false, uses_local: true })
  })

  it('renders the caption text of the selected cut', async () => {
    renderInspector()
    expect((screen.getByTestId('caption-text-0') as HTMLInputElement).value).toBe('Hello')
    expect((screen.getByTestId('caption-text-1') as HTMLInputElement).value).toBe('World')
    await musicLoaded()
  })

  it('rewrites a caption text while keeping its timing window', async () => {
    const props = renderInspector()
    fireEvent.change(screen.getByTestId('caption-text-1'), { target: { value: 'Hey' } })
    expect(props.onCaptionChange).toHaveBeenCalledWith([
      { start: 5, end: 7, text: 'Hello' },
      { start: 7, end: 9, text: 'Hey' },
    ])
    await musicLoaded()
  })

  it('adds a new caption spanning the cut with empty text', async () => {
    const props = renderInspector()
    fireEvent.click(screen.getByTestId('caption-add'))
    expect(props.onCaptionChange).toHaveBeenCalledWith([
      { start: 5, end: 7, text: 'Hello' },
      { start: 7, end: 9, text: 'World' },
      { start: 5, end: 9, text: '' },
    ])
    await musicLoaded()
  })

  it('removes a caption line', async () => {
    const props = renderInspector()
    fireEvent.click(screen.getByTestId('caption-remove-0'))
    expect(props.onCaptionChange).toHaveBeenCalledWith([{ start: 7, end: 9, text: 'World' }])
    await musicLoaded()
  })

  it('shows a hint when no cut is selected', async () => {
    renderInspector({ cut: null })
    expect(screen.getByText('Select a cut to edit captions.')).toBeTruthy()
    await musicLoaded()
  })

  it('lets the user pick a font', async () => {
    const props = renderInspector()
    fireEvent.change(screen.getByTestId('font-select'), { target: { value: 'Roboto' } })
    expect(props.onFontChange).toHaveBeenCalledWith('Roboto')
    await musicLoaded()
  })

  it('loads music tracks and selecting one sets the snapshot music', async () => {
    const props = renderInspector()
    await musicLoaded()
    fireEvent.change(screen.getByTestId('music-select'), { target: { value: 'm1' } })
    expect(props.onMusicChange).toHaveBeenCalledWith({
      source: 'local',
      path: '/music/upbeat.mp3',
      offset: 0,
      trim_start: 0,
      trim_end: null,
      volume: 0.8,
      duck: true,
    })
  })

  it('updates the volume slider on the selected music', async () => {
    const props = renderInspector({ music: MUSIC })
    fireEvent.change(screen.getByTestId('music-volume'), { target: { value: 0.3 } })
    expect(props.onMusicChange).toHaveBeenCalledWith(expect.objectContaining({ volume: 0.3 }))
    await musicLoaded()
  })

  it('toggles the ducking checkbox on the selected music', async () => {
    const props = renderInspector({ music: MUSIC })
    fireEvent.click(screen.getByTestId('music-duck'))
    expect(props.onMusicChange).toHaveBeenCalledWith(expect.objectContaining({ duck: false }))
    await musicLoaded()
  })

  it('clears the music back to null', async () => {
    const props = renderInspector({ music: MUSIC })
    fireEvent.click(screen.getByTestId('music-clear'))
    expect(props.onMusicClear).toHaveBeenCalled()
    await musicLoaded()
  })

  it('calls onSave from the Save button', async () => {
    const props = renderInspector()
    fireEvent.click(screen.getByTestId('inspector-save'))
    expect(props.onSave).toHaveBeenCalled()
    await musicLoaded()
  })
})