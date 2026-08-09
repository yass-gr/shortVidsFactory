import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from '../App.jsx'
import * as api from '../api.js'

vi.mock('../api.js', () => ({
  listProjects: vi.fn(() => Promise.resolve({ projects: [] })),
}))

describe('App', () => {
  it('renders the app heading', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'ShortVidsFactory' })).toBeTruthy()
    await waitFor(() => expect(api.listProjects).toHaveBeenCalled())
  })
})