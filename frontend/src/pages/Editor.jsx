import Preview from '../editor/Preview.jsx'

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
  return (
    <main>
      <h2>Editor</h2>
      <Preview projectId={projectId} cuts={DEMO_CUTS} />
    </main>
  )
}