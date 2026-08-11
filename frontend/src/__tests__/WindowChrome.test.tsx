import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import WindowChrome from '../components/WindowChrome.jsx'

describe('WindowChrome', () => {
  it('shows brand, saved state, and navigates to projects when brand is clicked', () => {
    const onNavigate = vi.fn()
    render(
      <WindowChrome
        currentScreen="projects"
        onNavigate={onNavigate}
        onNewProjectClick={vi.fn()}
      />,
    )
    expect(screen.getByText('ShortVidsFactory')).toBeTruthy()
    expect(screen.getByText('Projects')).toBeTruthy()
    fireEvent.click(screen.getByText('ShortVidsFactory'))
    expect(onNavigate).toHaveBeenCalledWith('projects')
  })

  it('renders the New project button on the projects screen and fires onNewProjectClick', () => {
    const onNewProjectClick = vi.fn()
    render(
      <WindowChrome
        currentScreen="projects"
        onNavigate={vi.fn()}
        onNewProjectClick={onNewProjectClick}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /new project/i }))
    expect(onNewProjectClick).toHaveBeenCalled()
  })

  it('shows the editor Save button and unsaved indicator on the editor screen', () => {
    const onSaveProject = vi.fn()
    render(
      <WindowChrome
        currentScreen="editor"
        hasUnsavedChanges
        onNavigate={vi.fn()}
        onNewProjectClick={vi.fn()}
        onSaveProject={onSaveProject}
      />,
    )
    expect(screen.getByText('Unsaved changes')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onSaveProject).toHaveBeenCalled()
  })

  it('opens settings from the more options button', () => {
    const onOpenSettings = vi.fn()
    render(
      <WindowChrome
        currentScreen="projects"
        onNavigate={vi.fn()}
        onNewProjectClick={vi.fn()}
        onOpenSettings={onOpenSettings}
      />,
    )
    fireEvent.click(screen.getByTitle(/more options/i))
    expect(onOpenSettings).toHaveBeenCalled()
  })
})