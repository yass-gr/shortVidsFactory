import { describe, expect, it } from 'vitest'
import { formatCutRange, formatDuration, formatEditedTime, formatTime } from '../format.js'

describe('format helpers', () => {
  it('formats seconds as MM:SS', () => {
    expect(formatTime(7)).toBe('00:07')
    expect(formatTime(65)).toBe('01:05')
    expect(formatTime(1500)).toBe('25:00')
  })

  it('formats durations zero-padded', () => {
    expect(formatDuration(27)).toBe('00:27')
    expect(formatDuration(9)).toBe('00:09')
  })

  it('renders cut ranges with duration', () => {
    expect(formatCutRange(0, 9)).toBe('00:00 – 00:09 (9s)')
    expect(formatCutRange(9, 18)).toBe('00:09 – 00:18 (9s)')
  })

  it('renders relative edited times', () => {
    const now = Date.now()
    expect(formatEditedTime(new Date(now).toISOString())).toBe('just now')
    expect(formatEditedTime(new Date(now - 2 * 60 * 1000).toISOString())).toBe('2m ago')
    expect(formatEditedTime(new Date(now - 5 * 3600 * 1000).toISOString())).toBe('5h ago')
    expect(formatEditedTime(new Date(now - 2 * 24 * 3600 * 1000).toISOString())).toBe('2d ago')
    expect(formatEditedTime(null)).toBe('Never')
  })
})