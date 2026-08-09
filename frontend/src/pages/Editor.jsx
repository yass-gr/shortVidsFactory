import Preview from '../editor/Preview.jsx'
import Timeline from '../editor/Timeline.jsx'
import {
  useTimelineReducer,
  selectCut,
  trimCut,
  reorderCut,
  duplicateCut,
  deleteCut,
} from '../editor/useTimelineReducer.js'

const DEMO_CUTS = [
  {
    source_start: 0,
    source_end: 1,
    caption_lines: [{ start: 0, end: 1, text: 'Demo cut one' }],
  },
  {
    source_start: 1,
    source_end: 2,
    caption_lines: [{ start: 1, end: 2, text: 'Demo cut two' }],
  },
]

export default function Editor({ projectId }) {
  const [state, dispatch] = useTimelineReducer(DEMO_CUTS)
  const { cuts, selectedId } = state
  const selected = selectedId !== null ? cuts[selectedId] : null

  return (
    <main>
      <h2>Editor</h2>
      <Preview projectId={projectId} cuts={cuts} />
      <Timeline
        cuts={cuts}
        selectedId={selectedId}
        onSelect={(index) => dispatch(selectCut(index))}
        onTrim={(index, which, boundary) => dispatch(trimCut(index, which, boundary))}
        onReorder={(from, to) => dispatch(reorderCut(from, to))}
        onDuplicate={(index) => dispatch(duplicateCut(index))}
        onDelete={(index) => dispatch(deleteCut(index))}
      />
      {selected && (
        <p data-testid="editor-selected">
          Selected cut {selectedId + 1}: {selected.source_start}s – {selected.source_end}s
        </p>
      )}
    </main>
  )
}