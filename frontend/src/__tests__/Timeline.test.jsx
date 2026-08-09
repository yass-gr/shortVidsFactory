import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  timelineReducer,
  selectCut,
  trimCut,
  reorderCut,
  duplicateCut,
  deleteCut,
  replaceCuts,
  updateCutCaptions,
} from '../editor/useTimelineReducer.js'
import Timeline from '../editor/Timeline.jsx'

const CUTS = [
  { source_start: 0, source_end: 4, caption_lines: [{ start: 0, end: 2, text: 'One' }] },
  { source_start: 10, source_end: 13, caption_lines: [{ start: 10, end: 12, text: 'Two' }] },
  { source_start: 20, source_end: 25, caption_lines: [] },
]

const state = (selectedId = null) => ({ cuts: CUTS, selectedId })

describe('useTimelineReducer', () => {
  describe('select', () => {
    it('records the selected index', () => {
      const next = timelineReducer(state(), selectCut(1))
      expect(next.selectedId).toBe(1)
      expect(next.cuts).toBe(CUTS)
    })

    it('accepts null to clear the selection', () => {
      const next = timelineReducer(state(1), selectCut(null))
      expect(next.selectedId).toBeNull()
    })

    it('ignores a selection out of range', () => {
      const next = timelineReducer(state(), selectCut(99))
      expect(next.selectedId).toBeNull()
    })
  })

  describe('trim', () => {
    it('clamps a left trim below the source start', () => {
      const next = timelineReducer(state(), trimCut(0, 'left', -10))
      expect(next.cuts[0].source_start).toBe(0)
    })

    it('clamps a right trim above the source end', () => {
      const next = timelineReducer(state(), trimCut(0, 'right', 999))
      expect(next.cuts[0].source_end).toBe(4)
    })

    it('lets a duplicated copy be trimmed on its left edge (duplicate then trim)', () => {
      const dup = timelineReducer(state(), duplicateCut(0))
      const next = timelineReducer(dup, trimCut(1, 'left', 2))
      expect(next.cuts).toHaveLength(4)
      expect(next.cuts[1].source_start).toBe(2)
      expect(next.cuts[1].source_end).toBe(4)
    })

    it('lets the original be trimmed on its right edge after duplication (duplicate then trim)', () => {
      const dup = timelineReducer(state(), duplicateCut(0))
      const next = timelineReducer(dup, trimCut(0, 'right', 3))
      expect(next.cuts[0].source_start).toBe(0)
      expect(next.cuts[0].source_end).toBe(3)
    })

    it('refuses to collapse a cut to zero length', () => {
      const next = timelineReducer(state(), trimCut(0, 'left', 50))
      expect(next.cuts[0].source_start).toBe(0)
    })

    it('tracks the new boundary and keeps other cuts and captions intact', () => {
      const next = timelineReducer(state(1), trimCut(0, 'right', 3))
      expect(next.cuts[0].source_end).toBe(3)
      expect(next.cuts[0].caption_lines).toEqual(CUTS[0].caption_lines)
      expect(next.cuts[1]).toBe(CUTS[1])
      expect(next.selectedId).toBe(1)
    })
  })

  describe('reorder', () => {
    it('moves a cut to the target position', () => {
      const next = timelineReducer(state(), reorderCut(0, 2))
      expect(next.cuts.map((c) => c.source_start)).toEqual([10, 20, 0])
    })

    it('moves a cut forward to a lower index', () => {
      const next = timelineReducer(state(), reorderCut(2, 0))
      expect(next.cuts.map((c) => c.source_start)).toEqual([20, 0, 10])
    })

    it('keeps the selection attached to the moved cut', () => {
      const next = timelineReducer(state(1), reorderCut(1, 0))
      expect(next.cuts[0].source_start).toBe(10)
      expect(next.selectedId).toBe(0)
    })

    it('shifts the selection when an unselected cut moves across it', () => {
      const next = timelineReducer(state(1), reorderCut(0, 2))
      expect(next.selectedId).toBe(0)
    })
  })

  describe('duplicate', () => {
    it('inserts a copy right after the original at index+1', () => {
      const next = timelineReducer(state(), duplicateCut(0))
      expect(next.cuts).toHaveLength(4)
      expect(next.cuts[1].source_start).toBe(0)
      expect(next.cuts[1].source_end).toBe(4)
      expect(next.cuts[1]).not.toBe(CUTS[0])
    })

    it('copies caption_lines onto the duplicate', () => {
      const next = timelineReducer(state(), duplicateCut(0))
      expect(next.cuts[1].caption_lines).toEqual(CUTS[0].caption_lines)
    })

    it('selects the duplicated cut', () => {
      const next = timelineReducer(state(), duplicateCut(0))
      expect(next.selectedId).toBe(1)
    })

    it('is a no-op when the index is out of range', () => {
      const next = timelineReducer(state(), duplicateCut(99))
      expect(next.cuts).toBe(CUTS)
    })
  })

  describe('delete', () => {
    it('removes the cut at the given index', () => {
      const next = timelineReducer(state(0), deleteCut(0))
      expect(next.cuts).toHaveLength(2)
      expect(next.cuts.map((c) => c.source_start)).toEqual([10, 20])
    })

    it('selects the cut that fills the gap', () => {
      const next = timelineReducer(state(1), deleteCut(1))
      expect(next.selectedId).toBe(1)
    })

    it('clears the selection when the list empties', () => {
      const s = { cuts: [CUTS[0]], selectedId: 0 }
      const next = timelineReducer(s, deleteCut(0))
      expect(next.cuts).toHaveLength(0)
      expect(next.selectedId).toBeNull()
    })

    it('is a no-op when the index is out of range', () => {
      const next = timelineReducer(state(), deleteCut(null))
      expect(next.cuts).toBe(CUTS)
    })
  })

  describe('replace', () => {
    it('replaces all cuts and clears the selection', () => {
      const next = timelineReducer(state(1), replaceCuts([CUTS[2]]))
      expect(next.cuts).toEqual([CUTS[2]])
      expect(next.selectedId).toBeNull()
    })

    it('accepts an empty cut list', () => {
      const next = timelineReducer(state(), replaceCuts([]))
      expect(next.cuts).toEqual([])
      expect(next.selectedId).toBeNull()
    })
  })

  describe('captions', () => {
    it('updates the caption_lines of the target cut', () => {
      const lines = [{ start: 0, end: 4, text: 'New' }]
      const next = timelineReducer(state(), updateCutCaptions(0, lines))
      expect(next.cuts[0].caption_lines).toEqual(lines)
      expect(next.cuts[1]).toBe(CUTS[1])
    })

    it('is a no-op when the index is out of range', () => {
      const next = timelineReducer(state(), updateCutCaptions(99, []))
      expect(next.cuts).toBe(CUTS)
    })
  })

  describe('purity', () => {
    it('does not mutate the input cuts', () => {
      const before = CUTS.map((c, i) => ({ index: i, start: c.source_start, end: c.source_end }))
      timelineReducer(state(), reorderCut(0, 2))
      timelineReducer(state(), duplicateCut(1))
      timelineReducer(state(0), trimCut(0, 'left', 1))
      expect(CUTS.map((c) => [c.source_start, c.source_end])).toEqual(before.map((c) => [c.start, c.end]))
    })
  })
})

const handlers = () => ({
  onSelect: vi.fn(),
  onTrim: vi.fn(),
  onReorder: vi.fn(),
  onDuplicate: vi.fn(),
  onDelete: vi.fn(),
})

describe('Timeline', () => {
  it('renders one block per cut with widths proportional to duration', () => {
    render(<Timeline cuts={CUTS} selectedId={null} {...handlers()} />)
    const blocks = screen.getAllByTestId(/timeline-cut-/)
    expect(blocks).toHaveLength(3)
    expect(blocks[0].style.flexGrow).toBe('4')
    expect(blocks[1].style.flexGrow).toBe('3')
  })

  it('selects a cut when its block is clicked', () => {
    const h = handlers()
    render(<Timeline cuts={CUTS} selectedId={null} {...h} />)
    fireEvent.click(screen.getByTestId('timeline-cut-1'))
    expect(h.onSelect).toHaveBeenCalledWith(1)
  })

  it('trims the left edge by dragging', () => {
    const h = handlers()
    render(<Timeline cuts={CUTS} selectedId={0} {...h} />)
    fireEvent.mouseDown(screen.getByTestId('trim-left-0'), { clientX: 0 })
    fireEvent.mouseMove(document.body, { clientX: 3 })
    fireEvent.mouseUp(document.body)
    expect(h.onTrim).toHaveBeenCalledWith(0, 'left', 3)
  })

  it('trims the right edge by dragging', () => {
    const h = handlers()
    render(<Timeline cuts={CUTS} selectedId={0} {...h} />)
    fireEvent.mouseDown(screen.getByTestId('trim-right-0'), { clientX: 0 })
    fireEvent.mouseMove(document.body, { clientX: 2 })
    fireEvent.mouseUp(document.body)
    expect(h.onTrim).toHaveBeenCalledWith(0, 'right', 6)
  })

  it('reorders when a block is dragged onto another block', () => {
    const h = handlers()
    render(<Timeline cuts={CUTS} selectedId={null} {...h} />)
    const blocks = screen.getAllByTestId(/timeline-cut-/)
    const dt = { setData: vi.fn(), effectAllowed: '' }
    fireEvent.dragStart(blocks[0], { dataTransfer: dt })
    fireEvent.dragOver(blocks[2], { dataTransfer: dt })
    fireEvent.drop(blocks[2], { dataTransfer: dt })
    expect(h.onReorder).toHaveBeenCalledWith(0, 2)
  })

  it('duplicates a selected cut via the Duplicate button', () => {
    const h = handlers()
    render(<Timeline cuts={CUTS} selectedId={1} {...h} />)
    fireEvent.click(screen.getByRole('button', { name: /duplicate/i }))
    expect(h.onDuplicate).toHaveBeenCalledWith(1)
  })

  it('disables the Duplicate button when nothing is selected', () => {
    render(<Timeline cuts={CUTS} selectedId={null} {...handlers()} />)
    expect(screen.getByRole('button', { name: /duplicate/i }).disabled).toBe(true)
  })

  it('deletes the selected cut when the Delete key is pressed', () => {
    const h = handlers()
    render(<Timeline cuts={CUTS} selectedId={0} {...h} />)
    fireEvent.keyDown(screen.getByTestId('timeline'), { key: 'Delete' })
    expect(h.onDelete).toHaveBeenCalledWith(0)
  })

  it('deletes the selected cut via the Delete button', () => {
    const h = handlers()
    render(<Timeline cuts={CUTS} selectedId={2} {...h} />)
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(h.onDelete).toHaveBeenCalledWith(2)
  })

  it('highlights the selected cut', () => {
    render(<Timeline cuts={CUTS} selectedId={0} {...handlers()} />)
    const selected = screen.getByTestId('timeline-cut-0')
    const other = screen.getByTestId('timeline-cut-1')
    expect(selected.style.border).not.toBe(other.style.border)
  })

  it('cannot delete the last remaining cut', () => {
    const h = handlers()
    render(<Timeline cuts={[CUTS[0]]} selectedId={0} {...h} />)
    expect(screen.getByRole('button', { name: /delete/i }).disabled).toBe(true)
    fireEvent.keyDown(screen.getByTestId('timeline'), { key: 'Delete' })
    expect(h.onDelete).not.toHaveBeenCalled()
  })

  it('focuses the timeline when a cut is clicked so Delete keys are dependable', () => {
    render(<Timeline cuts={CUTS} selectedId={null} {...handlers()} />)
    fireEvent.click(screen.getByTestId('timeline-cut-0'))
    expect(document.activeElement).toBe(screen.getByTestId('timeline'))
  })
})
