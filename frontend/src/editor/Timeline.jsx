import { useMemo, useRef } from 'react'

const MIN_FLEX_GROW = 0.001
const HANDLE_WIDTH = 8

const duration = (cut) => cut.source_end - cut.source_start

export default function Timeline({
  cuts = [],
  selectedId,
  onSelect,
  onTrim,
  onReorder,
  onDuplicate,
  onDelete,
}) {
  const trackRef = useRef(null)
  const dragFrom = useRef(null)

  const totalDuration = useMemo(
    () => cuts.reduce((acc, cut) => acc + duration(cut), 0),
    [cuts],
  )

  function startTrim(e, index, which) {
    e.preventDefault()
    e.stopPropagation()
    const cut = cuts[index]
    if (!cut) return
    const base = which === 'left' ? cut.source_start : cut.source_end
    const startX = e.clientX
    const pxPerSecond = (trackRef.current?.clientWidth || totalDuration) / (totalDuration || 1)

    function onMove(ev) {
      const boundary = base + (ev.clientX - startX) / pxPerSecond
      onTrim(index, which, boundary)
    }
    function onUp() {
      document.body.removeEventListener('mousemove', onMove)
      document.body.removeEventListener('mouseup', onUp)
    }
    document.body.addEventListener('mousemove', onMove)
    document.body.addEventListener('mouseup', onUp)
  }

  const handleTrimLeft = (index) => (e) => startTrim(e, index, 'left')
  const handleTrimRight = (index) => (e) => startTrim(e, index, 'right')

  function beginReorder(e, index) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
    dragFrom.current = index
    onSelect(index)
  }

  function allowDrop(e) {
    e.preventDefault()
  }

  function finishReorder(e, to) {
    e.preventDefault()
    if (dragFrom.current === null) return
    onReorder(dragFrom.current, to)
    dragFrom.current = null
  }

  function finishReorderCancel() {
    dragFrom.current = null
  }

  function handleKeyDown(e) {
    if (e.key === 'Delete' && selectedId !== null) {
      e.preventDefault()
      onDelete(selectedId)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button
          type="button"
          disabled={selectedId === null}
          onClick={() => onDuplicate(selectedId)}
        >
          Duplicate
        </button>
        <button
          type="button"
          disabled={selectedId === null}
          onClick={() => onDelete(selectedId)}
        >
          Delete
        </button>
      </div>
      <div
        ref={trackRef}
        data-testid="timeline"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{
          display: 'flex',
          alignItems: 'stretch',
          minHeight: 44,
          outline: 'none',
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
              onClick={() => onSelect(index)}
              style={{
                position: 'relative',
                flexGrow: Math.max(duration(cut), MIN_FLEX_GROW),
                flexBasis: 0,
                minWidth: 40,
                boxSizing: 'border-box',
                background: isSelected ? '#3a7bd5' : '#6c7a89',
                color: '#fff',
                border: isSelected ? '2px solid #1b4f8a' : '1px solid #4a5a68',
                borderRadius: 4,
                textAlign: 'center',
                padding: '10px 6px',
                fontSize: 13,
                cursor: 'grab',
                overflow: 'hidden',
              }}
            >
              Cut {index + 1}
              <div
                data-testid={`trim-left-${index}`}
                draggable={false}
                aria-label={`Trim left edge of cut ${index + 1}`}
                onMouseDown={handleTrimLeft(index)}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: HANDLE_WIDTH,
                  cursor: 'ew-resize',
                  background: 'rgba(255,255,255,0.35)',
                }}
              />
              <div
                data-testid={`trim-right-${index}`}
                draggable={false}
                aria-label={`Trim right edge of cut ${index + 1}`}
                onMouseDown={handleTrimRight(index)}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: HANDLE_WIDTH,
                  cursor: 'ew-resize',
                  background: 'rgba(255,255,255,0.35)',
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}