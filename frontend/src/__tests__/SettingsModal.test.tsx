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
    const folder = screen.getByDisplayValue('/Users/yass/Videos/Exports')
    fireEvent.change(folder, { target: { value: '/tmp/out' } })
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }))
    expect(localStorage.getItem('svf_export_folder')).toBe('/tmp/out')
  })

  it('closes via the Cancel button without persisting', () => {
    const onClose = vi.fn()
    render(<SettingsModal isOpen onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
    expect(localStorage.getItem('svf_export_folder')).toBeNull()
  })
})