# Design: Port designer mock UI into the real app

**Date:** 2026-08-11
**Status:** Approved

## Problem

A designer delivered a high-fidelity, five-screen mock at
`design system/shortvidsfactory/` plus a written spec
(`design system/ShortVidsFactory_Design.md`). It is a static prototype:
hardcoded sample data, unsplash imagery, camelCase fields that do not match
the backend, and no API calls.

The real app lives in `frontend/` (React + Vite + Vitest). It is fully wired
to the FastAPI backend (`/api/projects`, upload, scripts, snapshot, export,
music, SSE jobs) and has passing behavior tests, but the UI is plain,
unstyled HTML (h1 / lists / forms).

The goal is to make the real app look and behave like the designer's mock,
ported as faithfully as possible, while keeping real API integration and
rebuilt tests. The export experience moves from the inline bar to the
design's dedicated full-screen export flow.

## Approach

Adopt the design screens as the base (wholesale port, per the approved
approach), converting them to TypeScript + React 19, strip mock-only pieces,
and wire real data/logic where the design is static. Remove unnecessary
parts and anything that fabricates data that cannot be real.

## Architecture

```
design system/shortvidsfactory/src → frontend/src (ported to .ts/.tsx)
                       │
                       ▼
App (hash router) ── WindowChrome, SettingsModal
   ├─ /                     → Projects
   ├─ /new                  → Upload (New Project)
   ├─ /project/:id/scripts  → Scripts (Choose Script)
   ├─ /project/:id/editor   → Editor (EditorScreen shell + editor/*)
   └─ /project/:id/export   → Exporting (new route, full-screen export)
```

Hash routes are kept (`#/…`). The editor keeps real logic
(`useTimelineReducer` trim/reorder/duplicate/delete, real `<video>` preview
at `/api/projects/{id}/preview.mp4`, snapshot save) wrapped in the design's
three-panel look.

## Stack

- Upgrade the real frontend to TypeScript + React 19 (matching the design).
- Add dependencies: `tailwindcss`, `@tailwindcss/vite`, `lucide-react`,
  `typescript`. Upgrade `vite` to 6, `vitest` to ^3, `@testing-library/react`
  to ^16 (React 19 support), add `@types/react`/`@types/react-dom`.
- Remove the design's `motion`, `@google/genai`, `express`, `dotenv`
  dependencies and its express server / `.env.example`.
- Bring the design's `index.css` (design tokens: backgrounds, borders, text,
  lime/coral/purple/blue/orange accents, radii, scrollbars, range inputs)
  into the real app.

## Screens (design → ported file)

| Design screen | Ported to | Real data source |
|---|---|---|
| `WindowChrome.tsx` | `components/WindowChrome.jsx`→`.tsx` | brand as `<h1>`, macOS dots, shortcut nav, read-only project pill, contextual actions (New project / Save / Back), settings gear |
| `ProjectsScreen.tsx` | `pages/Projects.tsx` | `GET /api/projects` (enriched) |
| `NewProjectScreen.tsx` | `pages/Upload.tsx` | `createProject` + `uploadVideo` (FormData) + SSE job → 4-step tracker |
| `ChooseScriptScreen.tsx` | `pages/Scripts.tsx` | `GET/POST /api/projects/{id}/scripts`, `approveScript`, regenerate |
| `EditorScreen.tsx` | `pages/Editor.tsx` + `editor/*` | `getSnapshot`/`saveSnapshot`, real preview video, reducer logic |
| `ExportingScreen.tsx` | `pages/Exporting.tsx` (new) | export job SSE stream |
| `SettingsModal.tsx` | `components/SettingsModal.tsx` | export folder + default font feed editor defaults; API-key field local-only |

## Data mapping

Design camelCase → real API snake_case:
- Script: `hook`→card title, `summary`, `words_used`, `duration_s`,
  `cuts.length` (cut count). No `recommended`; no bookmark.
- Cut: index-addressed (`Cut {n}`), `source_start`/`source_end` → range +
  proportional width, `caption_lines[{start,end,text}]` → caption rows.
- Music: `GET /api/music` → `tracks[{id,title,source,path}]`; snapshot music
  `{source,path,offset,trim_start,trim_end,volume,duck}`.
- Fonts: `['Arial','OpenSans','Roboto']` (matches backend defaults).

## Backend additions

1. Enrich `GET /api/projects`: add per-project `duration_s` (from
   `media.probe`), `status` (derived from existing files: `editor.json` →
   `ready`, only `scripts.json` → `processing`, else `draft`), `edited_at`
   (latest project-file mtime).
2. New `GET /api/projects/{id}/frame?t=<seconds>`: ffmpeg frame extract
   (JPEG, cached in the project dir); used by project cards, script cards,
   and timeline blocks. FFmpeg is already a dependency.

No new models or data files.

## Export flow

- Editor bottom bar stays the design's ExportBar: destination field
  (prefilled from `export_path` dir or settings default) + Export button
  (disabled when no cuts).
- On click: `saveSnapshot` → `exportProject` → navigate to
  `/project/:id/export?job=<job_id>`.
- Exporting screen polls the job SSE: real progress (0→1), step tracker and
  live log mapped from real job events, real preview (`preview.mp4`),
  settings panel from real constants (1080×1920 · MP4 · H.264 · 30fps · AAC
  48kHz; size estimated from duration × bitrate), destination path,
  success → "Open folder" (`revealDirectory`), error → Retry, Back to editor.

## Removed (fake / unnecessary)

- Design mock dataset and all unsplash URLs (replaced by real API + backend
  frames).
- Design-only deps (`motion`, `@google/genai`, `express`, `dotenv`), express
  server, `.env.example`.
- Fake user avatar + "Pro" badge → simple "Local workspace" card.
- Script bookmark button, project title-rename pencil, fake sort dropdown
  (grid/list toggle kept).
- "Recommended" badge (no backend notion), fake "Add cut" block (Duplicate
  exists).
- Fake playback simulation → real `<video>`; fake setTimeout processing →
  real SSE progress; fake export auto-increment progress → real job stream.

## Testing

- Rebuild the frontend `__tests__` as `.tsx` against the ported components,
  keeping `data-testid` hooks and behavior coverage: projects load + route,
  upload → scripts → editor flow, snapshot load/save, caption/font/music
  edits, timeline select/trim/reorder/duplicate, export start/success/error/
  retry, preview src, new `/project/:id/export` route. Command: `npm test`
  (`vitest run`).
- Add backend tests for the enriched project list + frame endpoint
  (`backend/tests/test_api.py` convention, pytest).
- Verify with `npm test`, `npx tsc --noEmit`, `npm run build`, and the
  backend test suite.