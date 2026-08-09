import { useReducer } from 'react'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

export function selectCut(index) {
  return { type: 'select', index }
}

export function trimCut(index, which, boundary) {
  return { type: 'trim', index, which, boundary }
}

export function reorderCut(from, to) {
  return { type: 'reorder', from, to }
}

export function duplicateCut(index) {
  return { type: 'duplicate', index }
}

export function deleteCut(index) {
  return { type: 'delete', index }
}

export function timelineReducer(state, action) {
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
      const prev = cuts[index - 1]
      const next = cuts[index + 1]
      const trimmed = cuts.map((cut, i) => {
        if (i !== index) return cut
        if (which === 'left') {
          const lower = Math.max(cut.source_start, prev ? prev.source_end : cut.source_start)
          const newStart = clamp(boundary, lower, cut.source_end)
          if (newStart >= cut.source_end) return cut
          return { ...cut, source_start: newStart }
        }
        if (which === 'right') {
          const upper = Math.min(cut.source_end, next ? next.source_start : cut.source_end)
          const newEnd = clamp(boundary, cut.source_start, upper)
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
      } else if (from < to && selectedId > from && selectedId <= to) {
        nextSelectedId = selectedId - 1
      } else if (from > to && selectedId >= to && selectedId < from) {
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

    default:
      return state
  }
}

export function useTimelineReducer(initialCuts = []) {
  return useReducer(timelineReducer, initialCuts, (cuts) => ({ cuts, selectedId: null }))
}
