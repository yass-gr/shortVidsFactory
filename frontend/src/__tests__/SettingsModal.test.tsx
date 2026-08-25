import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import SettingsModal from '../components/SettingsModal.jsx'

describe('SettingsModal', () => {
  beforeEach(() => localStorage.clear())

  it('renders nothing when closed', () => {
    render(<SettingsModal isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByText('Settings')).toBeNull()
  })

  it('edits the export folder and persists it on save', () => {
    render(<SettingsModal isOpen onClose={vi.fn()} />)
    const folder = screen.getByPlaceholderText('~/Videos')
    fireEvent.change(folder, { target: { value: '~/Videos/out' } })
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }))
    expect(localStorage.getItem('svf_export_folder')).toBe('~/Videos/out')
  })

  it('closes via the Cancel button without persisting', () => {
    const onClose = vi.fn()
    render(<SettingsModal isOpen onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
    expect(localStorage.getItem('svf_export_folder')).toBeNull()
  })

  it('closes on Escape without persisting', () => {
    const onClose = vi.fn()
    render(<SettingsModal isOpen onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
    expect(localStorage.getItem('svf_default_font')).toBeNull()
  })

  it('closes on backdrop click but not on inner clicks', () => {
    const onClose = vi.fn()
    render(<SettingsModal isOpen onClose={onClose} />)
    fireEvent.click(screen.getByTestId('settings-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('persists the default font choice', () => {
    render(<SettingsModal isOpen onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/default caption font/i), {
      target: { value: 'OpenSans' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }))
    expect(localStorage.getItem('svf_default_font')).toBe('OpenSans')
  })
})
