import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import Preview from '../editor/Preview.tsx'

const CUTS = [
  {
    source_start: 0,
    source_end: 4,
    caption_lines: [
      { start: 0, end: 2, text: 'Opening line' },
      { start: 2, end: 4, text: 'Closing phrase' },
    ],
  },
  {
    source_start: 10,
    source_end: 13,
    caption_lines: [
      { start: 10, end: 12, text: 'Third segment' },
      { start: 12, end: 13, text: 'Goodbye' },
    ],
  },
]

const TRIMMED_CUTS = [
  CUTS[0],
  { source_start: 10, source_end: 11, caption_lines: [{ start: 10, end: 11, text: 'Cut short' }] },
]

let playMock: ReturnType<typeof vi.fn>
let pauseMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  playMock = vi.fn().mockResolvedValue(undefined)
  pauseMock = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: playMock,
  })
  Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: pauseMock,
  })
})

const getVideo = (): HTMLVideoElement => document.querySelector('video') as HTMLVideoElement

function seekTo(video: HTMLVideoElement, time: number) {
  video.currentTime = time
  fireEvent(video, new Event('timeupdate'))
}

describe('Preview', () => {
  it('renders a video pointing at the preview endpoint', () => {
    render(<Preview projectId="p1" cuts={CUTS} />)
    const video = getVideo()
    expect(video).toBeTruthy()
    expect(video.getAttribute('src')).toContain('/api/projects/p1/preview.mp4')
  })

  it('plays and pauses the video from its toggle button', () => {
    render(<Preview projectId="p1" cuts={CUTS} />)
    const video = getVideo()
    fireEvent.click(screen.getByRole('button', { name: /play/i }))
    expect(playMock).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: /pause/i }))
    expect(pauseMock).toHaveBeenCalledTimes(1)
    expect(getVideo()).toBe(video)
  })

  it('shows the caption for the current preview time', () => {
    render(<Preview projectId="p1" cuts={CUTS} />)
    const video = getVideo()

    seekTo(video, 1)
    expect(screen.getByText('Opening line')).toBeTruthy()
    expect(screen.queryByText('Closing phrase')).toBeNull()

    seekTo(video, 3.5)
    expect(screen.getByText('Closing phrase')).toBeTruthy()
    expect(screen.queryByText('Opening line')).toBeNull()

    seekTo(video, 5)
    expect(screen.getByText('Third segment')).toBeTruthy()

    seekTo(video, 7)
    expect(screen.queryByText(/Opening|Closing|Third|Goodbye/)).toBeNull()
  })

  it('shows a formatted current-time readout', () => {
    render(<Preview projectId="p1" cuts={CUTS} />)
    const video = getVideo()
    expect(screen.getByText('0:00 / 0:07')).toBeTruthy()
    seekTo(video, 5)
    expect(screen.getByText('0:05 / 0:07')).toBeTruthy()
  })

  it('refreshes the video src when cuts change', () => {
    const { rerender } = render(<Preview projectId="p1" cuts={CUTS} />)
    const srcBefore = getVideo().getAttribute('src')
    rerender(<Preview projectId="p1" cuts={TRIMMED_CUTS} />)
    const srcAfter = getVideo().getAttribute('src')
    expect(srcBefore).not.toBe(srcAfter)
    expect(srcAfter).toContain('/api/projects/p1/preview.mp4')
  })
})