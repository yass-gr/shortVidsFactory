import { useMemo, useRef } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import type { Cut } from './useTimelineReducer'

const MIN_FLEX_GROW = 0.001

const duration = (cut: Cut) => cut.source_end - cut.source_start

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

interface TimelineProps {
  projectId?: string
  cuts?: Cut[]
  selectedId: number | null
  onSelect: (index: number) => void
  onTrim: (index: number, which: 'left' | 'right', boundary: number) => void
  onReorder: (from: number, to: number) => void
  onDuplicate: (index: number | null) => void
  onDelete: (index: number | null) => void
}

export default function Timeline({
  projectId,
  cuts = [],
  selectedId,
  onSelect,
  onTrim,
  onReorder,
  onDuplicate,
  onDelete,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const dragFrom = useRef<number | null>(null)

  const totalDuration = useMemo(
    () => cuts.reduce((acc, cut) => acc + duration(cut), 0),
    [cuts],
  )

  function startTrim(e: React.PointerEvent<HTMLElement>, index: number, which: 'left' | 'right') {
    e.preventDefault()
    e.stopPropagation()
    const cut = cuts[index]
    if (!cut) return
    const base = which === 'left' ? cut.source_start : cut.source_end
    const startX = e.clientX
    const pxPerSecond = (trackRef.current?.clientWidth || totalDuration) / (totalDuration || 1)
    const target = e.currentTarget
    try {
      target.setPointerCapture(e.pointerId)
    } catch {
      /* pointer capture unsupported — document listeners below still work */
    }

    function onMove(ev: PointerEvent) {
      const boundary = base + (ev.clientX - startX) / pxPerSecond
      onTrim(index, which, boundary)
    }
    function onUp() {
      target.removeEventListener('pointermove', onMove)
      target.removeEventListener('pointerup', onUp)
      target.removeEventListener('pointercancel', onUp)
      document.body.removeEventListener('pointermove', onMove)
      document.body.removeEventListener('pointerup', onUp)
      document.body.removeEventListener('pointercancel', onUp)
    }
    // With pointer capture, move/up fire on the target; without it, on the body.
    target.addEventListener('pointermove', onMove)
    target.addEventListener('pointerup', onUp)
    target.addEventListener('pointercancel', onUp)
    document.body.addEventListener('pointermove', onMove)
    document.body.addEventListener('pointerup', onUp)
    document.body.addEventListener('pointercancel', onUp)
  }

  const handleTrimLeft = (index: number) => (e: React.PointerEvent<HTMLElement>) => startTrim(e, index, 'left')
  const handleTrimRight = (index: number) => (e: React.PointerEvent<HTMLElement>) => startTrim(e, index, 'right')

  function beginReorder(e: React.DragEvent<HTMLDivElement>, index: number) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
    dragFrom.current = index
    onSelect(index)
  }

  function allowDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
  }

  function finishReorder(e: React.DragEvent<HTMLDivElement>, to: number) {
    e.preventDefault()
    if (dragFrom.current === null) return
    onReorder(dragFrom.current, to)
    dragFrom.current = null
  }

  function finishReorderCancel() {
    dragFrom.current = null
  }

  const canDelete = selectedId !== null && cuts.length > 1

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Delete' && canDelete) {
      e.preventDefault()
      onDelete(selectedId)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      if (cuts.length === 0) return
      const delta = e.key === 'ArrowLeft' ? -1 : 1
      const next = selectedId === null ? (delta > 0 ? 0 : cuts.length - 1) : Math.min(cuts.length - 1, Math.max(0, selectedId + delta))
      onSelect(next)
    } else if ((e.key === 'd' || e.key === 'D') && selectedId !== null && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault()
      onDuplicate(selectedId)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="text-sm font-bold text-white">Timeline</h4>
          <p className="text-[11px] text-[#8A8F94]">Drag to reorder. Drag edges to trim.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={selectedId === null}
            onClick={() => onDuplicate(selectedId)}
            className="flex items-center gap-1.5 bg-[#191C20] hover:bg-[#24282D] text-xs font-medium text-white px-3 py-1.5 rounded-xl border border-white/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate</span>
          </button>
          <button
            type="button"
            disabled={!canDelete}
            onClick={() => onDelete(selectedId)}
            className="flex items-center gap-1.5 bg-transparent hover:bg-[#FF5B63]/10 text-xs font-medium text-[#FF5B63] px-3 py-1.5 rounded-xl border border-[#FF5B63]/40 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        data-testid="timeline"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{
          display: 'flex',
          alignItems: 'stretch',
          minHeight: 80,
          outline: 'none',
          gap: 8,
          overflowX: 'auto',
        }}
      >
        {cuts.map((cut, index) => {
          const isSelected = selectedId === index
          return (
            <div
              key={index}
              data-testid={`timeline-cut-${index}`}
              draggable
              onDragStart={(e) => beginReorder(e, index)}
              onDragOver={allowDrop}
              onDrop={(e) => finishReorder(e, index)}
              onDragEnd={finishReorderCancel}
              onClick={() => {
                trackRef.current?.focus()
                onSelect(index)
              }}
              onMouseDown={() => {
                trackRef.current?.focus()
              }}
              style={{
                position: 'relative',
                flexGrow: Math.max(duration(cut), MIN_FLEX_GROW),
                flexBasis: 0,
                minWidth: 140,
                minHeight: 80,
                boxSizing: 'border-box',
                overflow: 'hidden',
                borderRadius: 12,
                border: isSelected ? '2px solid #5D8CFF' : '2px solid rgba(255,255,255,0.1)',
                cursor: 'grab',
              }}
              className={isSelected ? 'ring-2 ring-[#5D8CFF]/30 shadow-lg shadow-[#5D8CFF]/20 rounded-xl' : 'rounded-xl bg-[#191C20]'}
            >
              <img
                src={projectId ? `/api/projects/${projectId}/frame?t=${cut.source_start}` : undefined}
                alt={`Cut ${index + 1}`}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2 flex flex-col justify-between">
                <span className="text-xs font-bold text-white bg-black/60 px-2 py-0.5 rounded self-start">{`Cut ${index + 1}`}</span>
                <span className="text-[10px] font-mono text-white/90 self-start">
                  {`${formatTime(cut.source_start)} – ${formatTime(cut.source_end)}`}
                </span>
              </div>
              <div
                data-testid={`trim-left-${index}`}
                draggable={false}
                aria-label={`Trim left edge of cut ${index + 1}`}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  handleTrimLeft(index)(e)
                }}
                style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', background: isSelected ? '#5D8CFF' : 'rgba(255,255,255,0.3)' }}
              />
              <div
                data-testid={`trim-right-${index}`}
                draggable={false}
                aria-label={`Trim right edge of cut ${index + 1}`}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  handleTrimRight(index)(e)
                }}
                style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', background: isSelected ? '#5D8CFF' : 'rgba(255,255,255,0.3)' }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}