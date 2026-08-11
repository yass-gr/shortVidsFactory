import { useReducer } from 'react'

export interface CaptionLine { start: number; end: number; text: string }
export interface Cut { source_start: number; source_end: number; caption_lines: CaptionLine[] }
export interface TimelineState { cuts: Cut[]; selectedId: number | null }

type Action =
  | { type: 'select'; index: number | null }
  | { type: 'trim'; index: number; which: 'left' | 'right'; boundary: number }
  | { type: 'reorder'; from: number; to: number }
  | { type: 'duplicate'; index: number }
  | { type: 'delete'; index: number | null }
  | { type: 'replace'; cuts: Cut[] }
  | { type: 'captions'; index: number; captionLines: CaptionLine[] }

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export function selectCut(index: number | null) { return { type: 'select', index } as Action }
export function trimCut(index: number, which: 'left' | 'right', boundary: number) { return { type: 'trim', index, which, boundary } as Action }
export function reorderCut(from: number, to: number) { return { type: 'reorder', from, to } as Action }
export function duplicateCut(index: number) { return { type: 'duplicate', index } as Action }
export function deleteCut(index: number | null) { return { type: 'delete', index } as Action }
export function replaceCuts(cuts: Cut[]) { return { type: 'replace', cuts } as Action }
export function updateCutCaptions(index: number, captionLines: CaptionLine[]) { return { type: 'captions', index, captionLines } as Action }

export function timelineReducer(state: TimelineState, action: Action): TimelineState {
  const { cuts, selectedId } = state
  switch (action.type) {
    case 'select': {
      if (action.index === null) return { ...state, selectedId: null }
      if (action.index < 0 || action.index >= cuts.length) return state
      return { ...state, selectedId: action.index }
    }

    case 'trim': {
      const { index, which, boundary } = action
      if (!cuts[index] || Number.isNaN(boundary)) return state
      const trimmed = cuts.map((cut, i) => {
        if (i !== index) return cut
        if (which === 'left') {
          const newStart = clamp(boundary, cut.source_start, cut.source_end)
          if (newStart >= cut.source_end) return cut
          return { ...cut, source_start: newStart }
        }
        if (which === 'right') {
          const newEnd = clamp(boundary, cut.source_start, cut.source_end)
          if (newEnd <= cut.source_start) return cut
          return { ...cut, source_end: newEnd }
        }
        return cut
      })
      return { ...state, cuts: trimmed }
    }

    case 'reorder': {
      const { from, to } = action
      if (from === to || from < 0 || to < 0 || from >= cuts.length || to >= cuts.length) return state
      const nextCuts = cuts.slice()
      const [moved] = nextCuts.splice(from, 1)
      nextCuts.splice(to, 0, moved)

      let nextSelectedId = selectedId
      if (selectedId === from) {
        nextSelectedId = to
      } else if (selectedId !== null && from < to && selectedId > from && selectedId <= to) {
        nextSelectedId = selectedId - 1
      } else if (selectedId !== null && from > to && selectedId >= to && selectedId < from) {
        nextSelectedId = selectedId + 1
      }
      return { cuts: nextCuts, selectedId: nextSelectedId }
    }

    case 'duplicate': {
      const { index } = action
      const cut = cuts[index]
      if (!cut) return state
      const copy = {
        ...cut,
        caption_lines: (cut.caption_lines || []).slice(),
      }
      const nextCuts = cuts.slice()
      nextCuts.splice(index + 1, 0, copy)
      return { cuts: nextCuts, selectedId: index + 1 }
    }

    case 'delete': {
      const { index } = action
      if (index === null || index < 0 || index >= cuts.length) return state
      const nextCuts = cuts.filter((_, i) => i !== index)
      let nextSelectedId = null
      if (nextCuts.length > 0) {
        nextSelectedId = Math.min(index, nextCuts.length - 1)
      }
      return { cuts: nextCuts, selectedId: nextSelectedId }
    }

    case 'replace': {
      return { cuts: action.cuts, selectedId: null }
    }

    case 'captions': {
      const { index, captionLines } = action
      if (index === null || index < 0 || index >= cuts.length) return state
      const nextCuts = cuts.map((cut, i) => (i === index ? { ...cut, caption_lines: captionLines } : cut))
      return { ...state, cuts: nextCuts }
    }

    default:
      return state
  }
}

export function useTimelineReducer(initialCuts: Cut[] = []) {
  return useReducer(timelineReducer, initialCuts, (cuts) => ({ cuts, selectedId: null }))
}
