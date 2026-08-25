# shortVidsFactory

Turn long videos into vertical (9:16) short clips: upload → Whisper transcription → AI script generation → timeline editor → MP4 export.

## Stack

- **Frontend**: `frontend/` — React 19 + Vite + Tailwind 4, hash routing (`src/App.tsx`), tests with Vitest + Testing Library in `src/__tests__/`.
- **Backend**: `backend/app` — Python (uv), API under `/api`, job queue with SSE polling, ffmpeg rendering.

## Agent skills

### Issue tracker

Issues are tracked as GitHub issues on `yass-gr/shortVidsFactory`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
