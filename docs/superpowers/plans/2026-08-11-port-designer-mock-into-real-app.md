# Port Designer Mock UI into the Real App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain, unstyled real frontend (`frontend/`, React 18 + JSX) with the designer's five-screen UI (`design system/shortvidsfactory/`) ported wholesale to TypeScript + React 19 + Tailwind 4 + lucide-react, keeping real backend API integration, real `<video>` preview, the timeline reducer, and an all-new full-screen export flow.

**Architecture:** The real app keeps its hash router (`#/`, `#/new`, `#/project/:id/scripts`, `#/project/:id/editor`) and gains one new route (`#/project/:id/export`) for the dedicated export screen. Each designer screen is ported 1:1 into a TypeScript component under `frontend/src`, wired to the existing FastAPI endpoints (project list, upload + SSE jobs, scripts, snapshot, export, music, preview). Mock-only data (initial datasets, Unsplash images, simulated timers) is deleted and replaced with real API responses and a new backend frame endpoint that supplies per-cut / per-project thumbnails. The backend gets two small additions to serve the new UI: an enriched project list and a cached ffmpeg frame extractor.

**Tech Stack:**
- React 19 + ReactDOM 19 (upgrade from 18.3)
- Vite 6 (port `vite.config.js` → `vite.config.ts`), `@vitejs/plugin-react` 5
- Tailwind CSS 4 via `@tailwindcss/vite` (brings the design's utility classes + tokens)
- `lucide-react` for all icons
- TypeScript 5.8 (`tsc --noEmit` for typecheck)
- Vitest 3 + `@testing-library/react` 16 + jsdom (rebuild all `__tests__` as `.tsx`)
- Backend stays FastAPI + pytest + ffmpeg/ffprobe

## Global Constraints

- Hash routes are preserved: `#/` → Projects, `#/new` → Upload, `#/project/:id/scripts` → Scripts, `#/project/:id/editor` → Editor, `#/project/:id/export` (NEW) → Exporting.
- Every real component is TypeScript. No `.jsx`/`.js` files remain in `frontend/src` at the end of the plan (delete legacy files as each is replaced).
- All data comes from the real API (snake_case). No design mocks: no `initialData.ts`, no Unsplash `https://images.unsplash.com/...` URLs, no `INITIAL_CUTS`/`INITIAL_SCRIPTS`/`INITIAL_PROJECTS`, no simulated `setTimeout` progress/export animation.
- Fonts are exactly `['Arial', 'OpenSans', 'Roboto']` (matches `app/editor.py` default). Settings modal default font list is the same set.
- No `motion`, `@google/genai`, `express`, `dotenv`, and no express `server.js` — remove from the port. Do not copy design `.env.example`/`.gitignore`/`README.md`/`metadata.json`/`server*`.
- Keep the existing behavior test IDs where tests depend on them: `preview-video`, `preview-caption`, `preview-time`, `timeline`, `timeline-cut-<i>`, `trim-left-<i>`, `trim-right-<i>`, `caption-text-<i>`, `caption-remove-<i>`, `caption-add`, `font-select`, `music-select`, `music-volume`, `music-duck`, `music-clear`, `inspector-save`, `inspector-save-error`, `export-destination`, `export-button`, `editor-load-error`, `progressbar`. Reuse where the design replaces the surrounding markup.
- The editor keeps real preview (`src="/api/projects/{id}/preview.mp4?v=<cuts-signature>"`), real `useTimelineReducer` (trim/reorder/duplicate/delete/captions), and snapshot save/load.
- `App` keeps its `initialRoute` test prop and reads `window.location.hash` (existing behavior — do not break `App.test.tsx` navigation assertions).
- Acceptable every-task exit commands (run at the end of each frontend task): `npm test`, `npx tsc --noEmit`, `npm run build`. Backend tasks: `pytest` from `backend/`.
- The backend `GET /api/projects` list must remain backwards-compatible: the existing `test_list_projects` asserts `{id, name}` — new keys must be additive.

---

## File Structure

**Frontend (new/rewritten files):**

```
frontend/
  package.json                          MODIFY   (React 19, vite 6, tailwind, lucide, ts, vitest 3, rtl 16)
  tsconfig.json                         CREATE   (modeled on design tsconfig, allowJs, noEmit)
  vite.config.ts                        CREATE   (port vite.config.js + tailwind plugin + vitest config)
  index.html                            MODIFY   (<script src> → /src/main.tsx)
  src/
    main.tsx                            MODIFY   (import './index.css', render <App />)
    index.css                           CREATE   (design tokens + scrollbars + range inputs, verbatim from design)
    types.ts                            CREATE   (API-shape types + AppScreen enum)
    format.ts                           CREATE   (time/duration/relative-time/cut-range formatters)
    api.ts                              MODIFY   (was api.js; typed return values, same functions)
    App.tsx                             REWRITE  (hash router + WindowChrome + SettingsModal + toast)
    components/
      WindowChrome.tsx                  CREATE   (port of design WindowChrome)
      SettingsModal.tsx                 CREATE   (port of design SettingsModal, localStorage-backed)
    pages/
      Projects.tsx                      CREATE   (port of ProjectsScreen, real listProjects + frames)
      Upload.tsx                        CREATE   (port of NewProjectScreen, real createProject/uploadVideo/pollJob)
      Scripts.tsx                       CREATE   (port of ChooseScriptScreen, real scripts API)
      Editor.tsx                        CREATE   (port of EditorScreen 3-panel shell + editor/*)
      Exporting.tsx                     CREATE   (new; port of ExportingScreen, real export job stream)
    editor/
      useTimelineReducer.ts             MODIFY   (was .js; identical reducer + action creators, typed)
      Preview.tsx                       MODIFY   (design vertical 9:16 frame + real video + caption overlay)
      Timeline.tsx                      MODIFY   (design-styled cut blocks + trim/reorder/dup/delete)
      Inspector.tsx                     MODIFY   (design tabs: captions / font / music + Save)
      ExportBar.tsx                     MODIFY   (design footer bar; save+export → navigate to export route)
  __tests__/  (all rewritten as .tsx)  — see per-task
```

**Backend (new/modified files):**

```
backend/
  app/media.py                          MODIFY   (add extract_frame())
  app/api.py                            MODIFY   (enrich api_list_projects; add /frame route)
  tests/test_api.py                     MODIFY   (add enrichment + frame tests)
  tests/test_media.py                   MODIFY   (add extract_frame unit test)
```

---

## Task 1: Backend — enrich project list

**Files:**
- Modify: `backend/app/api.py` (`api_list_projects`, lines 122-134)
- Test: `backend/tests/test_api.py`

**Interfaces:**
- Produces: `GET /api/projects` → `{"projects": [{ "id": str, "name": str, "duration_s": float|null, "status": "ready"|"processing"|"draft", "edited_at": str|null }]}`

Status derivation (checked in this order):
- `editor.json` exists → `"ready"`
- else `scripts.json` exists → `"processing"`
- else → `"draft"`

`duration_s` comes from `probe(pdir / "source.mp4")` when the file exists (wrap in try/except so a missing/uninspectable video or missing ffmpeg never breaks the list). `edited_at` is the ISO timestamp of the newest mtime among `project.json`, `source.mp4`, `transcript.json`, `scripts.json`, `editor.json` (default to project dir mtime).

- [ ] **Step 1: Write the failing backend tests**

Append to `backend/tests/test_api.py`:

```python
def _touch(pdir, name, ts):
    p = pdir / name
    p.touch()
    import os
    os.utime(p, (ts, ts))


def test_list_projects_enriched_draft():
    client = TestClient(create_app())
    pid = _new_project(client, "demo")
    body = client.get("/api/projects").json()
    by_id = {p["id"]: p for p in body["projects"]}
    assert by_id[pid]["status"] == "draft"
    assert by_id[pid]["duration_s"] is None
    assert isinstance(by_id[pid]["edited_at"], str)


def test_list_projects_processing_and_ready():
    client = TestClient(create_app())
    p1 = _new_project(client, "p1")
    p2 = _new_project(client, "p2")
    (config_mod.PROJECT_ROOT / p1 / "scripts.json").write_text("[]")
    (config_mod.PROJECT_ROOT / p2 / "editor.json").write_text('{"cuts": []}')
    body = client.get("/api/projects").json()
    by_id = {p["id"]: p for p in body["projects"]}
    assert by_id[p1]["status"] == "processing"
    assert by_id[p2]["status"] == "ready"


def test_list_projects_duration_and_edited_at(monkeypatch):
    client = TestClient(create_app())
    pid = _new_project(client, "demo")
    pdir = config_mod.PROJECT_ROOT / pid
    shutil.copyfile(CLIP, pdir / "source.mp4")
    monkeypatch.setattr(api_mod, "probe", lambda path: {"width": 320, "height": 240, "duration_s": 5.0})
    body = client.get("/api/projects").json()
    by_id = {p["id"]: p for p in body["projects"]}
    assert by_id[pid]["duration_s"] == 5.0
    assert isinstance(by_id[pid]["edited_at"], str)


def test_list_projects_handles_missing_source(monkeypatch):
    client = TestClient(create_app())
    pid = _new_project(client, "demo")
    monkeypatch.setattr(api_mod, "probe", lambda path: (_ for _ in ()).throw(OSError("nope")))
    body = client.get("/api/projects").json()
    by_id = {p["id"]: p for p in body["projects"]}
    assert by_id[pid]["duration_s"] is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest backend/tests/test_api.py -x -q` (from repo root, or `pytest -x -q` from `backend/`)
Expected: FAIL — the enriched keys (`status`, `duration_s`, `edited_at`) are absent.

- [ ] **Step 3: Implement the enriched list**

Edit `backend/app/api.py` — replace the body of `api_list_projects`:

```python
@router.get("/projects")
def api_list_projects():
    projects = []
    for d in sorted(PROJECT_ROOT.iterdir()):
        if not d.is_dir():
            continue
        meta = {"id": d.name, "name": d.name}
        try:
            meta = load_json(d / "project.json")
        except FileNotFoundError:
            pass

        duration_s = None
        source = d / "source.mp4"
        if source.exists():
            try:
                duration_s = probe(source)["duration_s"]
            except Exception:  # uninspectable media / missing ffmpeg
                duration_s = None

        if (d / "editor.json").exists():
            status = "ready"
        elif (d / "scripts.json").exists():
            status = "processing"
        else:
            status = "draft"

        edited_at = None
        candidates = [d] + [d / n for n in
                            ("project.json", "source.mp4", "transcript.json",
                             "scripts.json", "editor.json")]
        mtimes = [p.stat().st_mtime for p in candidates if p.exists()]
        if mtimes:
            edited_at = __import__("datetime").datetime.fromtimestamp(
                max(mtimes)).isoformat()

        projects.append({
            "id": meta.get("id", d.name),
            "name": meta.get("name", d.name),
            "duration_s": duration_s,
            "status": status,
            "edited_at": edited_at,
        })
    return {"projects": projects}
```

Note: `probe` and `load_json` are already imported in `api.py`; `_project_dir`/`PROJECT_ROOT` already exist.

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest backend/tests/test_api.py -x -q`
Expected: PASS (all 4 new tests + existing `test_list_projects`).

- [ ] **Step 5: Commit**

```bash
git add backend/app/api.py backend/tests/test_api.py
git commit -m "feat(backend): enrich project list with status, duration, edited_at"
```

---

## Task 2: Backend — frame endpoint

**Files:**
- Modify: `backend/app/media.py`
- Modify: `backend/app/api.py`
- Test: `backend/tests/test_media.py`, `backend/tests/test_api.py`

**Interfaces:**
- Produces: `media.extract_frame(source: Path, out_path: Path, t: float) -> Path` — runs ffmpeg `-ss {t} -frames:v 1 -q:v 2` to write a JPEG; does not clobber an existing `out_path` (cache).
- Produces: `GET /api/projects/{id}/frame?t=<float>` → `FileResponse` JPEG (`media_type="image/jpeg"`) cached at `pdir / f"frame_{round(t,1)}.jpg"`. 404 when `source.mp4` is missing.

- [ ] **Step 1: Write the failing backend tests**

Append to `backend/tests/test_media.py`:

```python
def test_extract_frame_writes_jpeg(tmp_path):
    from subprocess import CalledProcessError
    from app.media import extract_frame
    source = tmp_path / "src.mp4"
    source.write_bytes(b"x")
    out = extract_frame(source, tmp_path / "frame.jpg", 1.5)
    assert out.exists()
```

Append to `backend/tests/test_api.py`:

```python
def test_frame_endpoint_returns_cached_jpeg():
    client = TestClient(create_app())
    pid = _new_project(client)
    pdir = config_mod.PROJECT_ROOT / pid
    shutil.copyfile(CLIP, pdir / "source.mp4")
    r = client.get(f"/api/projects/{pid}/frame?t=0.5")
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/jpeg"
    assert (pdir / "frame_0.5.jpg").exists()
    r2 = client.get(f"/api/projects/{pid}/frame?t=0.5")
    assert r2.status_code == 200


def test_frame_endpoint_missing_source_404():
    client = TestClient(create_app())
    pid = _new_project(client)
    r = client.get(f"/api/projects/{pid}/frame")
    assert r.status_code == 404
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest backend/tests/test_media.py backend/tests/test_api.py -q`
Expected: FAIL — `extract_frame` and the `/frame` route don't exist.

- [ ] **Step 3: Implement `extract_frame` in `media.py`**

Append to `backend/app/media.py`:

```python
def extract_frame(source: Path, out_path: Path, t: float = 0.0) -> Path:
    if out_path.exists():
        return out_path
    subprocess.run(
        ["ffmpeg", "-y", "-ss", f"{t:.1f}", "-i", str(source),
         "-frames:v", "1", "-q:v", "2", str(out_path)],
        check=True, capture_output=True,
    )
    return out_path
```

- [ ] **Step 4: Implement the `/frame` route in `api.py`**

Add the `extract_frame` import at the top of `backend/app/api.py`:

```python
from .media import build_proxy, extract_frame, open_destination, probe
```

Add the route (e.g. after `api_preview`):

```python
@router.get("/projects/{project_id}/frame")
def api_frame(project_id: str, t: float = 0.0):
    pdir = _require_project(project_id)
    source = pdir / "source.mp4"
    if not source.exists():
        raise HTTPException(status_code=404, detail="Source video not uploaded")
    out = pdir / f"frame_{round(max(t, 0.0), 1)}.jpg"
    try:
        extract_frame(source, out, max(t, 0.0))
    except Exception:
        raise HTTPException(status_code=500, detail="Could not extract frame")
    return FileResponse(out, media_type="image/jpeg", filename=out.name)
```

(`FileResponse` is already imported in `api.py`.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `python -m pytest backend/tests/test_media.py backend/tests/test_api.py -q`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/media.py backend/app/api.py backend/tests/test_media.py backend/tests/test_api.py
git commit -m "feat(backend): add cached frame extraction endpoint"
```
---

## Task 3: Frontend — toolchain upgrade (TS + React 19 + Tailwind + Vitest 3)

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts` (delete `frontend/vite.config.js`)
- Create: `frontend/src/index.css`
- Modify: `frontend/index.html`
- Rename: `frontend/src/main.jsx` → `frontend/src/main.tsx`
- Rename: `frontend/src/api.js` → `frontend/src/api.ts` (same functions, typed)
- Create: `frontend/src/types.ts`
- Create: `frontend/src/format.ts`
- Rename: `frontend/src/__tests__/api.test.js` → `frontend/src/__tests__/api.test.ts`
- Create: `frontend/src/__tests__/format.test.ts`

**Interfaces:**
- Produces: `types.ts` exports `AppScreen`, `ProjectStatus`, `ProjectMeta`, `ScriptSummary`, `CaptionLine`, `Cut`, `MusicTrackItem`, `SnapshotMusic`, `EditorSnapshot`.
- Produces: `format.ts` exports `formatTime(sec)`, `formatDuration(sec)`, `formatEditedTime(iso|null)`, `formatCutRange(start,end)`.
- Produces: `api.ts` keeps the exact same exported function names/signatures as the old `api.js` (tests currently import from `'../api.js'`; Vite resolves that specifier to `api.ts`, so no import rewrites are needed anywhere).

- [ ] **Step 1: Write the failing `format.test.ts`**

Create `frontend/src/__tests__/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatCutRange, formatDuration, formatEditedTime, formatTime } from '../format.js'

describe('format helpers', () => {
  it('formats seconds as MM:SS', () => {
    expect(formatTime(7)).toBe('00:07')
    expect(formatTime(65)).toBe('01:05')
    expect(formatTime(1500)).toBe('25:00')
  })

  it('formats durations zero-padded', () => {
    expect(formatDuration(27)).toBe('00:27')
    expect(formatDuration(9)).toBe('00:09')
  })

  it('renders cut ranges with duration', () => {
    expect(formatCutRange(0, 9)).toBe('00:00 – 00:09 (9s)')
    expect(formatCutRange(9, 18)).toBe('00:09 – 00:18 (9s)')
  })

  it('renders relative edited times', () => {
    const now = Date.now()
    expect(formatEditedTime(new Date(now).toISOString())).toBe('just now')
    expect(formatEditedTime(new Date(now - 2 * 60 * 1000).toISOString())).toBe('2m ago')
    expect(formatEditedTime(new Date(now - 5 * 3600 * 1000).toISOString())).toBe('5h ago')
    expect(formatEditedTime(new Date(now - 2 * 24 * 3600 * 1000).toISOString())).toBe('2d ago')
    expect(formatEditedTime(null)).toBe('Never')
  })
})
```

Note: import from `'../format.js'` (Vite maps `.js` → `.ts`); if your editor/tooling complains, `'../format'` is equivalent.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test`
Expected: FAIL — `format.js` module not found (only `format.test.ts` exists).

- [ ] **Step 3: Create `frontend/src/format.ts`**

```ts
export function formatTime(sec: number): string {
  const total = Math.max(0, Math.floor(sec))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatDuration(sec: number): string {
  return formatTime(sec)
}

export function formatCutRange(startSec: number, endSec: number): string {
  return `${formatTime(startSec)} – ${formatTime(endSec)} (${Math.round(endSec - startSec)}s)`
}

export function formatEditedTime(iso: string | null): string {
  if (!iso) return 'Never'
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
```

- [ ] **Step 4: Create `frontend/src/types.ts`**

```ts
export type AppScreen = 'projects' | 'upload' | 'scripts' | 'editor' | 'exporting'

export type ProjectStatus = 'ready' | 'processing' | 'draft'

export interface ProjectMeta {
  id: string
  name: string
  duration_s: number | null
  status: ProjectStatus
  edited_at: string | null
}

export interface CaptionLine {
  start: number
  end: number
  text: string
}

export interface Cut {
  source_start: number
  source_end: number
  caption_lines: CaptionLine[]
}

export interface ScriptSummary {
  id: string
  hook: string
  summary: string
  duration_s: number
  words_used: number
  cuts: Cut[]
}

export interface MusicTrackItem {
  id: string
  title: string
  source: string
  path: string | null
}

export interface SnapshotMusic {
  source: string
  path: string | null
  offset: number
  trim_start: number
  trim_end: number | null
  volume: number
  duck: boolean
}

export interface EditorSnapshot {
  cuts: Cut[]
  music: SnapshotMusic | null
  font: string
  export_path: string
}

export interface JobEvent {
  id: string
  status: string
  progress: number
  result?: unknown
  error?: string
}
```

- [ ] **Step 5: Rename `api.js` → `api.ts` with the same behavior (typed returns)**

Create `frontend/src/api.ts` as an exact port of the current `api.js` (copy verbatim the bodies of `apiFetch`, `createProject`, `listProjects`, `uploadVideo`, `pollJob`, `getScripts`, `generateScripts`, `approveScript`, `getSnapshot`, `saveSnapshot`, `exportProject`, `revealDirectory`, `getMusic`), then add minimal types:

```ts
const JSON_HEADERS = { 'Content-Type': 'application/json' }

export async function apiFetch<T = unknown>(path: string, opts: RequestInit & { isForm?: boolean; json?: unknown } = {}): Promise<T> {
  const { isForm, json, ...rest } = opts as RequestInit & { isForm?: boolean; json?: unknown }
  let res: Response
  if (isForm) {
    res = await fetch(path, rest)
  } else if (json !== undefined) {
    res = await fetch(path, { ...rest, headers: { ...JSON_HEADERS, ...rest.headers }, body: JSON.stringify(json) })
  } else {
    res = await fetch(path, rest)
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (data && (data as { detail?: string }).detail) detail = (data as { detail: string }).detail
    } catch {
      // keep default detail message
    }
    const err = new Error(detail) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return res.json() as Promise<T>
}
```

Keep every other exported function byte-identical to the current `api.js`, adding return types:
- `createProject(name: string)` → `apiFetch<{ id: string; name: string }>('/api/projects', { method: 'POST', json: { name } })`
- `listProjects()` → `apiFetch<{ projects: ProjectMeta[] }>('/api/projects')` — import `ProjectMeta` from `./types.js`
- `uploadVideo(projectId: string, file: File)` returns `apiFetch<{ project_id: string; job_id: string; media: unknown }>`
- `getScripts(projectId: string)` → `apiFetch<ScriptSummary[] | { pending: string | null }>`
- `pollJob(jobId: string, onProgress?: (data: JobEvent) => void)` unchanged (returns `EventSource`)
- `saveSnapshot(projectId: string, snapshot: EditorSnapshot)` → `apiFetch<EditorSnapshot>`
- all others unchanged, untyped passthroughs.

Replace `frontend/index.html`'s script tag with `<script type="module" src="/src/main.tsx"></script>`.

- [ ] **Step 6: Update `package.json`, add configs, make the existing suite green**

Replace `frontend/package.json`:

```json
{
  "name": "shortvidsfactory-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "lucide-react": "^0.546.0",
    "react": "^19.0.1",
    "react-dom": "^19.0.1"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.14",
    "@testing-library/dom": "^10.4.0",
    "@testing-library/react": "^16.1.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^5.0.4",
    "jsdom": "^24.1.0",
    "tailwindcss": "^4.1.14",
    "typescript": "~5.8.2",
    "vite": "^6.2.3",
    "vitest": "^3.0.0"
  }
}
```

Create `frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "allowJs": true,
    "checkJs": false,
    "isolatedModules": true,
    "moduleDetection": "force",
    "skipLibCheck": true,
    "types": ["vitest/globals"],
    "allowImportingTsExtensions": true
  },
  "include": ["src"]
}
```

Create `frontend/vite.config.ts` (delete `vite.config.js`):

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8765',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

Create `frontend/src/index.css` — copy the design's `index.css` (design system/shortvidsfactory/src/index.css) verbatim (Tailwind import, CSS variables, body styles, scrollbars, range inputs).

Rename `main.jsx` → `main.tsx` and change it to:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

Keep `App.jsx` and all page/editor components as-is for now (they are still JSX — the tsconfig `allowJs` accepts them).

Install and verify:

```bash
cd frontend && rm -f package-lock.json node_modules/.vite && npm install
npm test
npx tsc --noEmit
npm run build
```

Expected: all existing tests pass (imports like `'../api.js'` resolve to `api.ts` via Vite), `tsc` is clean, `vite build` succeeds. `api.test.js` was renamed to `api.test.ts` in Step 5's rename — no content change.

- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/tsconfig.json frontend/vite.config.ts frontend/src frontend/index.html
git rm frontend/vite.config.js
git commit -m "build(frontend): upgrade to TypeScript, React 19, Tailwind 4, Vitest 3"
```

---

## Task 4: Frontend — WindowChrome + SettingsModal components

**Files:**
- Create: `frontend/src/components/WindowChrome.tsx`
- Create: `frontend/src/components/SettingsModal.tsx`
- Create: `frontend/src/__tests__/WindowChrome.test.tsx`
- Create: `frontend/src/__tests__/SettingsModal.test.tsx`

**Interfaces:**
- Consumes: `AppScreen`, `ProjectMeta-status` types from `types.ts` (`ProjectStatus`).
- Produces: `WindowChrome` props `{ currentScreen: AppScreen; activeProjectTitle?: string | null; hasUnsavedChanges?: boolean; onNavigate: (screen: AppScreen) => void; onNewProjectClick: () => void; onSaveProject?: () => void; onOpenSettings?: () => void }`. The chrome derives real hash routes internally from `AppScreen` (see Step 1), so the rest of the app never deals with `#/...` strings except through `App`.
- Produces: `SettingsModal` props `{ isOpen: boolean; onClose: () => void }`; persists `svf_export_folder`, `svf_default_font`, `svf_api_key` to `localStorage`.

- [ ] **Step 1: Write the failing `WindowChrome.test.tsx`**

```tsx
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import WindowChrome from '../components/WindowChrome.jsx'

describe('WindowChrome', () => {
  it('shows brand, saved state, and navigates to projects when brand is clicked', () => {
    const onNavigate = vi.fn()
    render(
      <WindowChrome
        currentScreen="projects"
        onNavigate={onNavigate}
        onNewProjectClick={vi.fn()}
      />,
    )
    expect(screen.getByText('ShortVidsFactory')).toBeTruthy()
    expect(screen.getByText('Projects')).toBeTruthy()
    fireEvent.click(screen.getByText('ShortVidsFactory'))
    expect(onNavigate).toHaveBeenCalledWith('projects')
  })

  it('renders the New project button on the projects screen and fires onNewProjectClick', () => {
    const onNewProjectClick = vi.fn()
    render(
      <WindowChrome
        currentScreen="projects"
        onNavigate={vi.fn()}
        onNewProjectClick={onNewProjectClick}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /new project/i }))
    expect(onNewProjectClick).toHaveBeenCalled()
  })

  it('shows the editor Save button and unsaved indicator on the editor screen', () => {
    const onSaveProject = vi.fn()
    render(
      <WindowChrome
        currentScreen="editor"
        hasUnsavedChanges
        onNavigate={vi.fn()}
        onNewProjectClick={vi.fn()}
        onSaveProject={onSaveProject}
      />,
    )
    expect(screen.getByText('Unsaved changes')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onSaveProject).toHaveBeenCalled()
  })

  it('opens settings from the more options button', () => {
    const onOpenSettings = vi.fn()
    render(
      <WindowChrome
        currentScreen="projects"
        onNavigate={vi.fn()}
        onNewProjectClick={vi.fn()}
        onOpenSettings={onOpenSettings}
      />,
    )
    fireEvent.click(screen.getByTitle(/more options/i))
    expect(onOpenSettings).toHaveBeenCalled()
  })
})
```

Note: import from `'../components/WindowChrome.jsx'` — Vite maps this to the `.tsx` file; `'../components/WindowChrome'` works too.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/__tests__/WindowChrome.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `frontend/src/components/WindowChrome.tsx`**

Port `design system/shortvidsfactory/src/components/WindowChrome.tsx` 1:1 (same JSX, same lucide icons, same Tailwind classes, same macOS dots, brand block, screen shortcut bar, project pill, right-side contextual actions, settings button). Apply these edits:

1. Replace the interface and destructure with:

```tsx
import React from 'react'
import { Clapperboard, Edit2, ArrowLeft, Plus, MoreHorizontal, Check, Shield } from 'lucide-react'
import type { AppScreen } from '../types'

interface WindowChromeProps {
  currentScreen: AppScreen
  onNavigate: (screen: AppScreen) => void
  activeProjectTitle?: string | null
  onNewProjectClick: () => void
  hasUnsavedChanges?: boolean
  onSaveProject?: () => void
  onOpenSettings?: () => void
}

const NAV_TARGETS: Partial<Record<AppScreen, string>> = {
  projects: '#/',
  upload: '#/new',
}

export const WindowChrome: React.FC<WindowChromeProps> = ({
  currentScreen,
  onNavigate,
  activeProjectTitle,
  onNewProjectClick,
  hasUnsavedChanges = false,
  onSaveProject,
  onOpenSettings,
}) => {
```

   Remove the `Shield` import if unused (drop it from the import list — the design file imports it but never uses it). Keep `Edit2`, `ArrowLeft`, `Plus`, `MoreHorizontal`, `Check`.

2. In the brand block, replace `onClick={() => setCurrentScreen('projects')}` with `onClick={() => onNavigate('projects')}`.

3. In the screen shortcut bar, replace every `onClick={() => setCurrentScreen('x')}` with `onClick={() => onNavigate('x')}` for the five buttons.

4. The center project pill: keep `{activeProjectTitle}` instead of `activeProject?.title`, and only render when `activeProjectTitle` is truthy and `currentScreen !== 'projects'`:

```tsx
{currentScreen !== 'projects' && activeProjectTitle && (
  <div className="hidden md:flex items-center gap-2 text-sm text-[#F5F5F2] font-medium bg-[#191C20] px-3 py-1.5 rounded-lg border border-white/5">
    <span>{activeProjectTitle}</span>
    <Edit2 className="w-3.5 h-3.5 text-[#707477] hover:text-[#D5FF3F] cursor-pointer transition-colors" />
  </div>
)}
```

5. Replace the "Back to projects" button's handler with `onNavigate('projects')`, "Back to editor" with `onNavigate('editor')`, and the "New project"/`onNewProjectClick` stays. The Save button uses `onSaveProject`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/__tests__/WindowChrome.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the failing `SettingsModal.test.tsx`**

```tsx
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import SettingsModal from '../components/SettingsModal.jsx'

describe('SettingsModal', () => {
  beforeEach(() => localStorage.clear())

  it('renders nothing when closed', () => {
    render(<SettingsModal isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByText('Settings')).toBeNull()
  })

  it('edits the export folder and persists it on save', () => {
    render(<SettingsModal isOpen onClose={vi.fn()} />)
    const folder = screen.getByDisplayValue('/Users/yass/Videos/Exports')
    fireEvent.change(folder, { target: { value: '/tmp/out' } })
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }))
    expect(localStorage.getItem('svf_export_folder')).toBe('/tmp/out')
  })

  it('closes via the Cancel button without persisting', () => {
    const onClose = vi.fn()
    render(<SettingsModal isOpen onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
    expect(localStorage.getItem('svf_export_folder')).toBeNull()
  })
})
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/__tests__/SettingsModal.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 7: Create `frontend/src/components/SettingsModal.tsx`**

Port `design system/shortvidsfactory/src/components/Modals/SettingsModal.tsx` 1:1 (same JSX, icons, header/body/footer structure). Apply these edits:

1. Replace the header imports and add localStorage defaults:

```tsx
import React, { useState } from 'react'
import { X, Key, Folder, Sliders, Volume2, ShieldCheck, Cpu } from 'lucide-react'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('svf_api_key') ?? '')
  const [exportFolder, setExportFolder] = useState(
    () => localStorage.getItem('svf_export_folder') ?? '/Users/yass/Videos/Exports',
  )
  const [defaultFont, setDefaultFont] = useState(
    () => localStorage.getItem('svf_default_font') ?? 'OpenSans',
  )
  const [hardwareAccel, setHardwareAccel] = useState(true)

  const handleSave = () => {
    localStorage.setItem('svf_api_key', apiKey)
    localStorage.setItem('svf_export_folder', exportFolder)
    localStorage.setItem('svf_default_font', defaultFont)
    onClose()
  }

  if (!isOpen) return null
```

   (Drop the unused `Volume2` import if present — the design imports it but it isn't used in the JSX.)

2. Keep the default font `<select>` options as `OpenSans`, `Arial`, `Roboto`, `Inter` (matching the design).

3. Wire the footer: "Cancel" → `onClose`; "Save Settings" → `handleSave` (replacing the current `onClick={onClose}` on the save button).

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/__tests__/SettingsModal.test.tsx`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components frontend/src/__tests__
git commit -m "feat(frontend): port WindowChrome and SettingsModal to design"
```

---

## Task 5: Frontend — App shell with design chrome, hash router, toast, and 4 routes

**Files:**
- Rewrite: `frontend/src/App.tsx` (delete `frontend/src/App.jsx`)
- Rewrite: `frontend/src/__tests__/App.test.tsx` (delete old `App.test.jsx`)

**Interfaces:**
- Consumes: `WindowChrome`, `SettingsModal`, and the pages that exist at this point. Pages are imported extensionless (`./pages/Projects`), so route bodies can live behind `() => import(...)` style branches or plain conditional imports — this plan uses plain imports; when later tasks replace a page file (`.jsx` → `.tsx`), the import path stays `./pages/X` and only the file on disk changes.

**Note on ordering:** At this step the old `pages/Projects.jsx`, `pages/Upload.jsx`, `pages/Scripts.jsx`, `pages/Editor.jsx` still exist and export default components with the OLD props (`onNavigate`, `projectId`, etc.). `App.tsx` will render them inside the design shell. Later tasks (6–15) replace each page with its `.tsx` port and adjust `App.tsx`'s branch to pass the NEW props — so `App`'s page-rendering call sites change in those tasks. This task only builds the shell: hash router + chrome + modal + toast + keyboard save shortcut, delegating each route to the existing component with adaptive props (pass `onNavigate` which all old pages already accept).

- [ ] **Step 1: Write the failing `App.test.tsx`**

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from '../App.tsx'
import * as api from '../api.js'

vi.mock('../api.js', () => ({
  listProjects: vi.fn(() => Promise.resolve({ projects: [] })),
  getSnapshot: vi.fn(() =>
    Promise.resolve({
      cuts: [
        { source_start: 0, source_end: 1, caption_lines: [{ start: 0, end: 1, text: 'One' }] },
        { source_start: 1, source_end: 2, caption_lines: [{ start: 1, end: 2, text: 'Two' }] },
      ],
      music: null,
      font: 'Arial',
      export_path: '',
    }),
  ),
  getMusic: vi.fn(() => Promise.resolve({ tracks: [], social: false, uses_local: true })),
  createProject: vi.fn(),
  uploadVideo: vi.fn(),
  pollJob: vi.fn(),
  generateScripts: vi.fn(),
  getScripts: vi.fn(),
  approveScript: vi.fn(),
  saveSnapshot: vi.fn(),
  exportProject: vi.fn(),
  revealDirectory: vi.fn(),
}))

describe('App', () => {
  beforeEach(() => window.history.pushState({}, '', '/'))

  it('renders the design brand and window chrome', async () => {
    render(<App />)
    expect(screen.getByText('ShortVidsFactory')).toBeTruthy()
    await waitFor(() => expect(api.listProjects).toHaveBeenCalled())
  })

  it('navigates to the upload screen when the New project button is clicked', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /new project/i }))
    expect(window.location.hash).toBe('#/new')
    await waitFor(() => expect(screen.getByText('New project')).toBeTruthy())
  })

  it('renders the editor page with the preview video for /project/:id/editor', async () => {
    render(<App initialRoute="/project/p1/editor" />)
    expect(screen.getByRole('heading', { name: 'Editor' })).toBeTruthy()
    expect(document.querySelector('video')?.getAttribute('src')).toContain('/api/projects/p1/preview.mp4')
    await waitFor(() => expect(api.getSnapshot).toHaveBeenCalled())
  })

  it('finds projects route via hash', () => {
    window.location.hash = '#/new'
    render(<App />)
    expect(window.location.hash).toBe('#/new')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/__tests__/App.test.tsx`
Expected: FAIL — `App.tsx` doesn't exist yet.

- [ ] **Step 3: Implement `App.tsx` (design shell)**

Copy the routing logic and layout from the current `frontend/src/App.jsx`, then wrap it in the design chrome. Create `frontend/src/App.tsx` and delete `App.jsx`:

```tsx
import { useEffect, useState } from 'react'
import type { AppScreen } from './types'
import { WindowChrome } from './components/WindowChrome'
import { SettingsModal } from './components/SettingsModal'
import Projects from './pages/Projects'
import Upload from './pages/Upload'
import Scripts from './pages/Scripts'
import Editor from './pages/Editor'

const SCREEN_BY_PATH: Array<[RegExp, AppScreen]> = [
  [/^\/new$/, 'upload'],
  [/^\/project\/[^/]+\/scripts$/, 'scripts'],
  [/^\/project\/[^/]+\/editor$/, 'editor'],
  [/^[^/]*$|^\//, 'projects'],
]

function screenForRoute(route: string): AppScreen {
  for (const [re, screen] of SCREEN_BY_PATH) if (re.test(route)) return screen
  return 'projects'
}

const routeFromHash = (): string => {
  const hash = window.location.hash
  return hash && hash.length > 1 ? hash.slice(1) : '/'
}

export default function App({ initialRoute = '/' }: { initialRoute?: string }) {
  const [route, setRoute] = useState<string>(() => {
    const fromHash = routeFromHash()
    return window.location.hash && window.location.hash.length > 1 ? fromHash : initialRoute
  })
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [activeProjectTitle, setActiveProjectTitle] = useState<string | null>(null)

  useEffect(() => {
    const onHashChange = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    const m = route.match(/^\/project\/[^/]+\/(scripts|editor)$/)
    setActiveProjectTitle(m ? `Project ${m[1]}` : null)
  }, [route])

  function showToast(msg: string) {
    setToastMessage(msg)
    window.setTimeout(() => setToastMessage(null), 2500)
  }

  function navigate(screen: AppScreen, projectId?: string) {
    const screenPath: Record<AppScreen, string> = {
      projects: '/',
      upload: '/new',
      scripts: projectId ? `/project/${projectId}/scripts` : '/',
      editor: projectId ? `/project/${projectId}/editor` : '/',
      exporting: projectId ? `/project/${projectId}/export` : '/',
    }
    const next = `#${screenPath[screen]}`
    if (window.location.hash === next) {
      setRoute(screenPath[screen])
    } else {
      window.location.hash = next
      setRoute(screenPath[screen])
    }
    setActiveProjectTitle(projectId ? `Project ${projectId}` : null)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const currentScreen = screenForRoute(route)

  let pageBody: React.ReactNode
  if (route === '/new') {
    pageBody = <Upload onNavigate={(r: string) => navigate('projects')} />
  } else {
    const m = route.match(/^\/project\/([^/]+)\/(scripts|editor)$/)
    if (m && m[2] === 'scripts') {
      pageBody = <Scripts projectId={m[1]} navigate={(r: string) => navigate('editor', m[1])} />
    } else if (m && m[2] === 'editor') {
      pageBody = <Editor projectId={m[1]} />
    } else {
      pageBody = <Projects onNavigate={(r: string) => navigate('projects')} />
    }
  }

  return (
    <div className="w-screen h-screen bg-[#0D0F11] flex flex-col justify-center items-center overflow-hidden font-sans antialiased text-[#F5F5F2] p-0 md:p-3">
      <div className="w-full h-full max-w-[1600px] max-h-[1000px] bg-[#111316] border border-white/10 rounded-2xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
        <WindowChrome
          currentScreen={currentScreen}
          activeProjectTitle={activeProjectTitle}
          onNavigate={(s) => navigate(s)}
          onNewProjectClick={() => navigate('upload')}
          onSaveProject={() => showToast('Project changes saved securely to disk!')}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        <div className="flex-1 overflow-hidden relative">{pageBody}</div>

        {toastMessage && (
          <div className="absolute bottom-6 right-6 z-50 bg-[#D5FF3F] text-black font-bold text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2">
            <span>✓</span>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}
```

Important: `Upload`/`Scripts` old pages take `onNavigate`/`navigate` props; `Projects` old page takes `onNavigate`. Keep those signatures here. The new per-page props arrive in Tasks 6–8 where the routing call sites are edited.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npm test`
Expected: PASS — App tests plus all old page tests.

- [ ] **Step 5: Typecheck and build**

Run: `cd frontend && npx tsc --noEmit && npm run build`
Expected: both clean. (Note: `App.jsx` no longer exists; `Scripts.jsx`/`Editor.jsx` are untouched and still resolve via `allowJs`.)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.tsx frontend/src/__tests__/App.test.tsx
git rm frontend/src/App.jsx frontend/src/__tests__/App.test.jsx
git commit -m "feat(frontend): wrap app in design window chrome with hash router"
```

---

## Task 6: Frontend — Projects page (design port, real API)

**Files:**
- Create: `frontend/src/pages/Projects.tsx` (delete `frontend/src/pages/Projects.jsx`)
- Rewrite: `frontend/src/__tests__/Projects.test.tsx` (delete old `Projects.test.jsx` — currently the old test file name is `Scripts.test.jsx`; there is NO `Projects.test.jsx` in the tree, so just create the new file)

**Interfaces:**
- Consumes: `listProjects(): Promise<{ projects: ProjectMeta[] }>` from `api.ts`; `formatDuration`, `formatEditedTime` from `format.ts`; `ProjectMeta`, `ProjectStatus` from `types.ts`.
- Produces: default export `Projects ({ onSelectProject, onNewProjectClick, onOpenSettings })` where `onSelectProject: (project: ProjectMeta) => void`, `onNewProjectClick: () => void`, `onOpenSettings: () => void`. The page self-loads projects via `listProjects()` with `loading`, `error(+Retry)`, `empty` and `loaded` states.
- Status mapping for display: `'ready' → 'Ready'` (green), `'processing' → 'Processing'` (amber), `'draft' → 'Draft'` (grey). Thumbnail uses `/api/projects/{id}/frame?t=0.5`.

- [ ] **Step 1: Write the failing `Projects.test.tsx`**

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Projects from '../pages/Projects.tsx'
import * as api from '../api.js'

vi.mock('../api.js', () => ({
  apiFetch: vi.fn(),
  listProjects: vi.fn(),
}))

const PROJECTS = [
  { id: 'p1', name: 'Startup Podcast Ep. 12', duration_s: 1471, status: 'ready', edited_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
  { id: 'p2', name: 'Creativity Talk', duration_s: null, status: 'processing', edited_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString() },
]

function makeProps(overrides = {}) {
  return {
    onSelectProject: vi.fn(),
    onNewProjectClick: vi.fn(),
    onOpenSettings: vi.fn(),
    ...overrides,
  }
}

describe('Projects', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows loading then renders project cards with statuses and duration', async () => {
    api.listProjects.mockResolvedValue({ projects: PROJECTS })
    render(<Projects {...makeProps()} />)

    expect(screen.getByText(/loading/i)).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Startup Podcast Ep. 12')).toBeTruthy())
    expect(screen.getByText('Creativity Talk')).toBeTruthy()
    expect(screen.getByText(/24:31/)).toBeTruthy()
    expect(screen.getByText('Ready')).toBeTruthy()
    expect(screen.getByText('Processing')).toBeTruthy()
    expect(screen.getByText(/2h ago/)).toBeTruthy()
    expect(screen.getByText(/1d ago/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /create new project/i })).toBeTruthy()
  })

  it('fetches a frame thumbnail from the frame endpoint', async () => {
    api.listProjects.mockResolvedValue({ projects: [PROJECTS[0]] })
    render(<Projects {...makeProps()} />)
    await waitFor(() => expect(screen.getByAltText('Startup Podcast Ep. 12')).toBeTruthy())
    const img = screen.getByAltText('Startup Podcast Ep. 12') as HTMLImageElement
    expect(img.src).toContain('/api/projects/p1/frame')
  })

  it('calls onSelectProject when Continue is clicked', async () => {
    api.listProjects.mockResolvedValue({ projects: PROJECTS })
    const props = makeProps()
    render(<Projects {...props} />)
    await waitFor(() => expect(screen.getByText('Startup Podcast Ep. 12')).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: /continue/i })[0])
    expect(props.onSelectProject).toHaveBeenCalledWith(PROJECTS[0])
  })

  it('shows empty state when no projects exist', async () => {
    api.listProjects.mockResolvedValue({ projects: [] })
    render(<Projects {...makeProps()} />)
    await waitFor(() => expect(screen.getByText(/no projects yet/i)).toBeTruthy())
  })

  it('shows an error with Retry that reloads', async () => {
    api.listProjects.mockRejectedValueOnce(new Error('backend down'))
    api.listProjects.mockResolvedValue({ projects: PROJECTS })
    render(<Projects {...makeProps()} />)
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    await waitFor(() => expect(screen.getByText('Startup Podcast Ep. 12')).toBeTruthy())
    expect(api.listProjects).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/__tests__/Projects.test.tsx`
Expected: FAIL — `Projects.tsx` doesn't exist.

- [ ] **Step 3: Implement `pages/Projects.tsx`**

Port `design system/shortvidsfactory/src/components/screens/ProjectsScreen.tsx` 1:1 (JSX, grid/list toggle, card thumbnails, duration badges, status pills, Continue buttons, New-project CTA card, left sidebar). Apply these edits:

1. Replace the props interface and component signature:

```tsx
import React, { useEffect, useState } from 'react'
import {
  Folder, Plus, Settings, LayoutGrid, List, CheckCircle2,
  Clock, ArrowRight, HardDrive,
} from 'lucide-react'
import type { ProjectMeta, ProjectStatus } from '../types'
import { formatDuration, formatEditedTime } from '../format'
import { listProjects } from '../api'

interface ProjectsScreenProps {
  onSelectProject: (project: ProjectMeta) => void
  onNewProjectClick: () => void
  onOpenSettings: () => void
}

const STATUS_DISPLAY: Record<ProjectStatus, 'Ready' | 'Processing' | 'Draft'> = {
  ready: 'Ready',
  processing: 'Processing',
  draft: 'Draft',
}

const frameFor = (id: string) => `/api/projects/${id}/frame?t=0.5`

export const Projects: React.FC<ProjectsScreenProps> = ({
  onSelectProject,
  onNewProjectClick,
  onOpenSettings,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [projects, setProjects] = useState<ProjectMeta[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setError(null)
    setProjects(null)
    try {
      const data = await listProjects()
      setProjects(data.projects)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  useEffect(() => {
    void load()
  }, [])
```

   (Remove the fake `sortOption` state and the sort dropdown from the header — the grid/list toggle stays.)

2. Delete the whole left-sidebar footer (user profile card with the Unsplash avatar + "Pro" badge, and the storage meter). Replace it with a single simple card:

```tsx
      {/* Local workspace card */}
      <div className="flex items-center gap-3 bg-[#191C20] p-3 rounded-xl border border-white/5">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-white">Local workspace</div>
          <p className="text-[11px] text-[#707477] truncate">All projects saved on this machine</p>
        </div>
      </div>
```

   (Keep `Folder`, `Plus`, `Settings`, `LayoutGrid`, `List`, `CheckCircle2`, `Clock`, `ArrowRight`, `HardDrive` imports only where still used — `HardDrive` is no longer used, so drop it from the import list.)

3. In the main content area, keep the header (title "Projects", subtitle, view toggle). Map the data inside the card grid:

   - Card thumbnail: replace `<img src={project.thumbnail}>` with `src={frameFor(project.id)}` and `alt={project.name}`.
   - Title: `{project.name}`.
   - Meta line: `Edited • {formatEditedTime(project.edited_at)}`.
   - Duration badge: `formatDuration(project.duration_s ?? 0)`.
   - Status pill: switch on `project.status`:

```tsx
{project.status === 'ready' && (
  <span className="flex items-center gap-1.5 text-xs text-[#D5FF3F] bg-[#D5FF3F]/10 px-2.5 py-1 rounded-full border border-[#D5FF3F]/20 font-medium">
    <CheckCircle2 className="w-3.5 h-3.5" />
    Ready
  </span>
)}
{project.status === 'processing' && (
  <span className="flex items-center gap-1.5 text-xs text-[#FFB13B] bg-[#FFB13B]/10 px-2.5 py-1 rounded-full border border-[#FFB13B]/20 font-medium animate-pulse">
    <Clock className="w-3.5 h-3.5" />
    Processing
  </span>
)}
{project.status === 'draft' && (
  <span className="flex items-center gap-1.5 text-xs text-[#A7A9A8] bg-white/5 px-2.5 py-1 rounded-full border border-white/10 font-medium">
    <CheckCircle2 className="w-3.5 h-3.5 text-[#707477]" />
    Draft
  </span>
)}
```

   - Continue button handler: `onClick={() => onSelectProject(project)}`.
   - New-project CTA card: keep the dashed card; `onClick={onNewProjectClick}`.

4. The card `key={project.id}` stays. The grid is populated from `projects ?? []`; render the loading / error / empty states above it:

```tsx
{error && (
  <div role="alert" className="bg-[#191C20] border border-[#FF5B63]/40 rounded-2xl p-4 text-xs text-[#FF5B63]">
    <p>{error}</p>
    <button type="button" onClick={load} className="mt-3 bg-[#24282D] hover:bg-white/10 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors cursor-pointer">
      Retry
    </button>
  </div>
)}
{projects === null && !error && <p className="text-sm text-[#A7A9A8]">Loading…</p>}
{projects && projects.length === 0 && <p className="text-sm text-[#A7A9A8]">No projects yet. Create your first one below.</p>}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/__tests__/Projects.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire the new props into `App.tsx`, delete the old page**

In `frontend/src/App.tsx` change the projects branch:

```tsx
pageBody = (
  <Projects
    onSelectProject={(p) => navigate(p.status === 'processing' ? 'scripts' : 'editor', p.id)}
    onNewProjectClick={() => navigate('upload')}
    onOpenSettings={() => setIsSettingsOpen(true)}
  />
)
```

Delete `frontend/src/pages/Projects.jsx`.

- [ ] **Step 6: Run the full suite**

Run: `cd frontend && npm test && npx tsc --noEmit`
Expected: PASS. (Old `Scripts.test.jsx` still targets the old `Scripts.jsx` — untouched so far.)

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Projects.tsx frontend/src/__tests__/Projects.test.tsx frontend/src/App.tsx
git rm frontend/src/pages/Projects.jsx
git commit -m "feat(frontend): port Projects screen to design with real API"
```

---

## Task 7: Frontend — Upload (New Project) page (design port, real upload flow)

**Files:**
- Create: `frontend/src/pages/Upload.tsx` (delete `frontend/src/pages/Upload.jsx`)
- Rewrite: `frontend/src/__tests__/Upload.test.tsx` (delete old `Upload.test.jsx`)

**Interfaces:**
- Consumes: `createProject(name)`, `uploadVideo(projectId, file)`, `pollJob(jobId, onProgress)` from `api.ts`.
- Produces: default export `Upload ({ onUploaded })` where `onUploaded: (projectId: string) => void` — called once the job reaches `done`. (App routes to `navigate('scripts', projectId)`.) The page replaces the design's fake `selectedFile` / canned upload with a real file `<input type="file">`, product `File`, and the live job stream.

- [ ] **Step 1: Write the failing `Upload.test.tsx`**

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Upload from '../pages/Upload.tsx'
import * as api from '../api.js'

vi.mock('../api.js', () => ({
  apiFetch: vi.fn(),
  createProject: vi.fn(),
  uploadVideo: vi.fn(),
  pollJob: vi.fn(),
  getSnapshot: vi.fn(),
}))

describe('Upload', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a project, uploads the picked file, then reports the project id', async () => {
    api.createProject.mockResolvedValue({ id: 'p1', name: 'demo' })
    api.uploadVideo.mockResolvedValue({ project_id: 'p1', job_id: 'j1', media: {} })
    api.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress({ status: 'done', progress: 1 })
      return { close: vi.fn() }
    })
    const onUploaded = vi.fn()
    const file = new File(['abc'], 'clip.mp4', { type: 'video/mp4' })
    const { container } = render(<Upload onUploaded={onUploaded} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(input, 'files', { value: [file] })
    fireEvent.change(input)

    // pick the project name then submit
    fireEvent.change(screen.getByLabelText(/project name/i), { target: { value: 'my project' } })
    fireEvent.click(screen.getByRole('button', { name: /generate ai scripts/i }))

    await waitFor(() => {
      expect(api.createProject).toHaveBeenCalledWith('my project')
      expect(api.uploadVideo).toHaveBeenCalledWith('p1', file)
      expect(api.pollJob).toHaveBeenCalledWith('j1', expect.any(Function))
      expect(onUploaded).toHaveBeenCalledWith('p1')
    })
  })

  it('blocks submission until a file is chosen', () => {
    const { container } = render(<Upload onUploaded={vi.fn()} />)
    expect(container.querySelector('input[type="file"]')).toBeTruthy()
    const button = screen.getByRole('button', { name: /generate ai scripts/i }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('shows progress while processing', async () => {
    api.createProject.mockResolvedValue({ id: 'p2', name: 'demo' })
    api.uploadVideo.mockResolvedValue({ project_id: 'p2', job_id: 'j2', media: {} })
    api.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress({ status: 'running', progress: 0.5 })
      return { close: vi.fn() }
    })
    const onUploaded = vi.fn()
    const file = new File(['abc'], 'clip.mp4', { type: 'video/mp4' })
    const { container } = render(<Upload onUploaded={onUploaded} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(input, 'files', { value: [file] })
    fireEvent.change(input)
    fireEvent.click(screen.getByRole('button', { name: /generate ai scripts/i }))
    await waitFor(() => expect(screen.getByRole('progressbar')).toBeTruthy())
    expect(screen.getByText(/50%/)).toBeTruthy()
    expect(onUploaded).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/__tests__/Upload.test.tsx`
Expected: FAIL — `Upload.tsx` doesn't exist.

- [ ] **Step 3: Implement `pages/Upload.tsx`**

Port `design system/shortvidsfactory/src/components/screens/NewProjectScreen.tsx` 1:1 (workflow sidebar with the 4-step tracker + tip box, main form card with project-name input, dropzone / selected-file card, processing progress block, and the "Generate AI Scripts" submit). Apply these edits:

1. Replace state + submission logic. The design's fake `projectName`/`selectedFile`/`handleStartProcessing` with `setTimeout`s are replaced by real file handling:

```tsx
import React, { useRef, useState } from 'react'
import {
  UploadCloud, FileVideo, CheckCircle2, ArrowRight, Lightbulb,
  X, Sparkles, Loader2, ArrowLeft,
} from 'lucide-react'
import { createProject, pollJob, uploadVideo } from '../api'

interface UploadProps {
  onUploaded: (projectId: string) => void
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export default function Upload({ onUploaded }: UploadProps) {
  const [projectName, setProjectName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'processing' | 'done'>('idle')
  const [progressPercent, setProgressPercent] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] ?? null)
    setError(null)
  }

  const handleStartProcessing = async () => {
    if (!selectedFile) return
    setStatus('processing')
    setProgressPercent(5)
    setError(null)
    try {
      const project = await createProject(projectName.trim() || 'Untitled')
      const { job_id, project_id } = await uploadVideo(project.id, selectedFile)
      setProgressPercent(15)
      await new Promise<void>((resolve, reject) => {
        const source = pollJob(job_id, (data) => {
          if (data?.progress !== undefined) setProgressPercent(Math.round(data.progress * 100))
          if (data?.status === 'done') {
            source?.close()
            resolve()
          } else if (data?.status === 'error') {
            source?.close()
            reject(new Error((data as { error?: string }).error || 'Processing failed'))
          }
        })
      })
      setProgressPercent(100)
      setStatus('done')
      onUploaded(project_id)
    } catch (err) {
      setStatus('idle')
      setError((err as Error).message)
    }
  }
```

2. In the dropzone (`!selectedFile` branch), `onClick` currently fabricates a file — change it to open the real file picker:

```tsx
<div
  onClick={() => inputRef.current?.click()}
  className="border-2 border-dashed ... cursor-pointer transition-all group"
>
  ... existing dropzone JSX ...
</div>
```

   Keep the label "2. Upload video file". Show the accepted types: `Supports MP4, MOV, MKV, WebM • Max size 4 GB`.

3. Add a hidden real file input at the top of the returned JSX (after the sidebar/main split container opens):

```tsx
<input
  ref={inputRef}
  type="file"
  accept="video/*"
  className="hidden"
  onChange={handlePickFile}
  aria-label="Video file"
/>
```

4. Replace the selected-file card body to show the real `File`:

```tsx
<div className="flex items-center gap-3">
  <div className="w-12 h-12 rounded-xl bg-[#D5FF3F]/10 border border-[#D5FF3F]/20 text-[#D5FF3F] flex items-center justify-center">
    <FileVideo className="w-6 h-6" />
  </div>
  <div>
    <h4 className="text-sm font-semibold text-white">{selectedFile.name}</h4>
    <p className="text-xs text-[#707477]">{formatBytes(selectedFile.size)}</p>
  </div>
</div>
{status === 'idle' && (
  <button type="button" onClick={() => setSelectedFile(null)} className="p-1.5 rounded-lg text-[#707477] hover:text-white hover:bg-white/10 transition-colors">
    <X className="w-4 h-4" />
  </button>
)}
```

5. The processing block reads `progressPercent` (a percentage, so `{progressPercent}%` and `style={{ width: `${progressPercent}%` }}` work without change) and gets `role="progressbar"`:

```tsx
<div role="progressbar" aria-valuenow={progressPercent} className="bg-[#111316] p-5 rounded-2xl border border-[#D5FF3F]/30 space-y-3">
```

6. The submit button keeps its JSX but uses real state:

```tsx
<button
  type="button"
  disabled={!selectedFile || status === 'processing'}
  onClick={handleStartProcessing}
  className="flex items-center gap-2 bg-[#D5FF3F] hover:bg-[#E2FF70] disabled:opacity-50 text-black text-sm font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-[#D5FF3F]/10 cursor-pointer"
>
  <Sparkles className="w-4 h-4" />
  <span>Generate AI Scripts</span>
  <ArrowRight className="w-4 h-4" />
</button>
```

7. Update the workflow-sidebar step tracker: steps 1–3 turn filled based on `progressPercent` (≥15 uploading/transcribing, ≥80 writing scripts, 100 done) using the same ring/border classes as the design. Keep step 4 ("Editor") grey.

8. Remove the design's "Back to projects" button handler target `setCurrentScreen('projects')` → since the page no longer receives `setCurrentScreen`, either delete the button or keep it as a no-op that App handles via route; this plan keeps it but the handler goes away. Simplest: delete the back button entirely (the chrome already provides navigation).

9. Add an error banner (design has none):

```tsx
{error && (
  <div role="alert" className="bg-[#191C20] border border-[#FF5B63]/40 rounded-2xl p-4 text-xs text-[#FF5B63]">
    <p>{error}</p>
  </div>
)}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/__tests__/Upload.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire the new props into `App.tsx`, delete the old page**

In `frontend/src/App.tsx` change the upload branch:

```tsx
pageBody = <Upload onUploaded={(pid) => navigate('scripts', pid)} />
```

Delete `frontend/src/pages/Upload.jsx` and `frontend/src/__tests__/Upload.test.jsx`.

- [ ] **Step 6: Run the full suite**

Run: `cd frontend && npm test && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Upload.tsx frontend/src/__tests__/Upload.test.tsx frontend/src/App.tsx
git rm frontend/src/pages/Upload.jsx frontend/src/__tests__/Upload.test.jsx
git commit -m "feat(frontend): port New Project screen with real upload + job stream"
```

---

## Task 8: Frontend — Scripts (Choose Script) page (design port, real API)

**Files:**
- Create: `frontend/src/pages/Scripts.tsx` (delete `frontend/src/pages/Scripts.jsx`)
- Rewrite: `frontend/src/__tests__/Scripts.test.tsx` (delete old `Scripts.test.jsx`)

**Interfaces:**
- Consumes: `getScripts(projectId)`, `generateScripts(projectId)`, `pollJob(jobId, onProgress)`, `approveScript(projectId, scriptId)` from `api.ts`; `ScriptSummary` from `types.ts`; `formatDuration`, `formatTime` from `format.ts`.
- Produces: default export `Scripts ({ projectId, onPick })` where `onPick: () => void` fires after a successful approve. Card model derives from real scripts: `hook` → title, `summary`, `words_used`, `duration_s` → `formatDuration`, `cuts.length` → cut count, thumbnail via `/api/projects/{projectId}/frame?t=...`.
- Removed from the design: "Recommended" badge (`isRecommended`), bookmark button, caption-preview highlight overlay (`captionPreview`/`highlightedWords`), fake "3 scripts generated" count badge (replace with real count), and the fake regenerate `alert` (replace with real `generateScripts` + poll).

- [ ] **Step 1: Write the failing `Scripts.test.tsx`**

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Scripts from '../pages/Scripts.tsx'
import * as api from '../api.js'

vi.mock('../api.js', () => ({
  apiFetch: vi.fn(),
  getScripts: vi.fn(),
  generateScripts: vi.fn(),
  pollJob: vi.fn(),
  approveScript: vi.fn(),
}))

const SCRIPTS = [
  {
    id: 's1', hook: 'Hook one', summary: 'Summary one', words_used: 30, duration_s: 15.0,
    cuts: [{ source_start: 0, source_end: 5, caption_lines: [] }],
  },
  {
    id: 's2', hook: 'Hook two', summary: 'Summary two', words_used: 42, duration_s: 20.5,
    cuts: [
      { source_start: 0, source_end: 5, caption_lines: [] },
      { source_start: 5, source_end: 10, caption_lines: [] },
    ],
  },
  {
    id: 's3', hook: 'Hook three', summary: 'Summary three', words_used: 18, duration_s: 12.0,
    cuts: [
      { source_start: 0, source_end: 4, caption_lines: [] },
      { source_start: 4, source_end: 8, caption_lines: [] },
      { source_start: 8, source_end: 12, caption_lines: [] },
    ],
  },
]

function renderScripts(props = {}) {
  return render(<Scripts projectId="p1" onPick={vi.fn()} {...props} />)
}

describe('Scripts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows loading then renders script cards matching real fields', async () => {
    api.getScripts.mockResolvedValue(SCRIPTS)
    renderScripts()

    await waitFor(() => {
      expect(screen.getByText('Hook one')).toBeTruthy()
      expect(screen.getByText('Summary one')).toBeTruthy()
      expect(screen.getByText('Hook two')).toBeTruthy()
      expect(screen.getByText('Hook three')).toBeTruthy()
    })
    expect(screen.getByText(/30 words/i)).toBeTruthy()
    expect(screen.getByText(/00:15/)).toBeTruthy()
    expect(screen.getByText(/1 cut/i)).toBeTruthy()
    expect(screen.getByText(/3 cuts/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /use this/i })).toBeTruthy()
  })

  it('generates and polls when no saved scripts exist', async () => {
    api.getScripts.mockResolvedValue({ pending: null })
    api.generateScripts.mockResolvedValue({ job_id: 'j1' })
    api.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress({ status: 'done', progress: 1, result: SCRIPTS })
      return { close: vi.fn() }
    })
    renderScripts()

    await waitFor(() => expect(api.generateScripts).toHaveBeenCalledWith('p1'))
    await waitFor(() => expect(screen.getByText('Hook one')).toBeTruthy())
  })

  it('approves the chosen script and calls onPick', async () => {
    api.getScripts.mockResolvedValue(SCRIPTS)
    api.approveScript.mockResolvedValue({ cuts: [] })
    const onPick = vi.fn()
    renderScripts({ onPick })

    await waitFor(() => expect(screen.getByText('Hook one')).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: /use this/i })[1])
    await waitFor(() => expect(api.approveScript).toHaveBeenCalledWith('p1', 's2'))
    expect(onPick).toHaveBeenCalled()
  })

  it('re-generates on the regenerate button', async () => {
    api.getScripts.mockResolvedValue(SCRIPTS)
    api.generateScripts.mockResolvedValue({ job_id: 'j9' })
    api.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress({ status: 'done', progress: 1, result: SCRIPTS })
      return { close: vi.fn() }
    })
    renderScripts()
    await waitFor(() => expect(screen.getByText('Hook one')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /regenerate/i }))
    await waitFor(() => expect(api.generateScripts).toHaveBeenCalledWith('p1'))
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/__tests__/Scripts.test.tsx`
Expected: FAIL — `Scripts.tsx` doesn't exist.

- [ ] **Step 3: Implement `pages/Scripts.tsx`**

Port `design system/shortvidsfactory/src/components/screens/ChooseScriptScreen.tsx` 1:1 (left sidebar with source-video preview card + workflow tracker + tip box; main area with header, script cards grid, bottom regenerate bar). Reuse the exact same loading/generation logic already written in the old `frontend/src/pages/Scripts.jsx` (get → if list, render; else generate/poll; error + Retry; approve → onPick). Apply these edits:

1. Props + state:

```tsx
import React, { useEffect, useState } from 'react'
import {
  CheckCircle2, Sparkles, ArrowRight, RotateCw, Info,
  Lightbulb, FileText, Clock, Scissors,
} from 'lucide-react'
import type { ScriptSummary } from '../types'
import { formatDuration, formatTime } from '../format'
import { approveScript, generateScripts, getScripts, pollJob } from '../api'

interface ScriptsProps {
  projectId: string
  onPick: () => void
}

const frameFor = (projectId: string, t: number) => `/api/projects/${projectId}/frame?t=${t}`

export default function Scripts({ projectId, onPick }: ScriptsProps) {
  const [scripts, setScripts] = useState<ScriptSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [approvingId, setApprovingId] = useState<string | null>(null)
```

   Copy the load/generate/poll `useEffect` and `handleUse`/`retry` exactly from the current `Scripts.jsx`, changing `navigate('/project/${projectId}/editor')` to `onPick()` and `handleUse`'s button text state from `'Approving…'` to a pending spinner.

2. Sidebar source-video card: use `projectId`:

```tsx
<img src={frameFor(projectId, 0)} alt="Source video" className="w-full h-full object-cover" />
```

   Subtitle: `Source video: {projectId}`.

3. Script card mapping (no bookmark, no recommended badge, no caption overlay):

```tsx
{scripts.map((script, idx) => {
  const firstCutStart = script.cuts.length > 0 ? script.cuts[0].source_start : 0
  return (
    <article key={script.id} className="bg-[#191C20] rounded-2xl p-5 border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 group relative border-white/10 hover:border-white/20">
      {/* Top bar: number badge */}
      <div className="flex items-center justify-between">
        <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
          {idx + 1}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-white tracking-tight leading-snug group-hover:text-[#D5FF3F] transition-colors">
        {script.hook}
      </h3>

      {/* Thumbnail frame */}
      <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-black border border-white/10">
        <img src={frameFor(projectId, firstCutStart)} alt={script.hook} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">
          {formatDuration(script.duration_s)}
        </div>
      </div>

      {/* Summary */}
      <p className="text-xs text-[#A7A9A8] leading-relaxed line-clamp-3">{script.summary}</p>

      {/* Stats footer */}
      <div className="grid grid-cols-3 gap-1 pt-3 border-t border-white/5 text-[11px] text-[#707477]">
        <div className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /><span>{script.words_used} words</span></div>
        <div className="flex items-center gap-1 justify-center"><Clock className="w-3.5 h-3.5" /><span>{formatDuration(script.duration_s)}</span></div>
        <div className="flex items-center gap-1 justify-end"><Scissors className="w-3.5 h-3.5" /><span>{script.cuts.length} cut{script.cuts.length === 1 ? '' : 's'}</span></div>
      </div>

      {/* Action */}
      <button
        type="button"
        disabled={approvingId !== null}
        onClick={() => handleUse(script)}
        className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer bg-[#24282D] text-white hover:bg-white/10 disabled:opacity-50"
      >
        <span>{approvingId === script.id ? 'Approving…' : 'Use this'}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </article>
  )
})}
```

   Replace the header's fake "3 scripts generated" badge with a real count when loaded: `{scripts.length} scripts generated`. Remove the `Info` notice box if it stays static — keep it, it's non-fabricated guidance.

4. Regenerate bar button handler:

```tsx
const handleRegenerate = async () => {
  setError(null)
  setScripts(null)
  try {
    const { job_id } = await generateScripts(projectId)
    const source = pollJob(job_id, (job) => {
      if (job?.status === 'done') {
        source?.close()
        setScripts((job?.result as ScriptSummary[]) ?? [])
      } else if (job?.status === 'error') {
        source?.close()
        setError((job as { error?: string }).error || 'Script generation failed')
      }
    })
  } catch (err) {
    setError((err as Error).message)
  }
}
```

   Wire it to the `RotateCw` "Regenerate scripts" button.

5. Keep loading (`Loading…`), error (+ Retry), and `No scripts yet.` states using the same pattern as `Scripts.jsx`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/__tests__/Scripts.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire the new props into `App.tsx`, delete the old page**

In `frontend/src/App.tsx` change the scripts branch:

```tsx
pageBody = <Scripts projectId={m[1]} onPick={() => navigate('editor', m[1])} />
```

Delete `frontend/src/pages/Scripts.jsx` and `frontend/src/__tests__/Scripts.test.jsx`.

- [ ] **Step 6: Run the full suite**

Run: `cd frontend && npm test && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Scripts.tsx frontend/src/__tests__/Scripts.test.tsx frontend/src/App.tsx
git rm frontend/src/pages/Scripts.jsx frontend/src/__tests__/Scripts.test.jsx
git commit -m "feat(frontend): port Choose Script screen to design with real scripts API"
```

---

## Task 9: Frontend — timeline reducer → TS, port Preview + Timeline to design

**Files:**
- Rename: `frontend/src/editor/useTimelineReducer.js` → `frontend/src/editor/useTimelineReducer.ts` (identical logic, added types)
- Create: `frontend/src/editor/Preview.tsx` (delete `Preview.jsx`)
- Create: `frontend/src/editor/Timeline.tsx` (delete `Timeline.jsx`)
- Rewrite: `frontend/src/__tests__/Preview.test.tsx`, `frontend/src/__tests__/Timeline.test.tsx` (delete the `.jsx` twins)
- Modify: `frontend/src/pages/Editor.jsx` import lines to extensionless (`./Preview`, `./Timeline`) so the old page keeps compiling against the new `.tsx` files (it is deleted in Task 11).

**Key contract — test-IDs and props must be preserved** so the untouched old `Editor.test.jsx` keeps passing until Task 11 rewrites it. Ported components keep: `Preview` props `{ projectId, cuts }` and test-IDs `preview-video`, `preview-caption`, `preview-time`; `Timeline` props `{ cuts, selectedId, onSelect, onTrim, onReorder, onDuplicate, onDelete }` and test-IDs `timeline`, `timeline-cut-<i>`, `trim-left-<i>`, `trim-right-<i>`, buttons named Duplicate/Delete, and `flexGrow` proportional to `source_end - source_start`. The reducer must keep every exported creator (`selectCut`, `trimCut`, `reorderCut`, `duplicateCut`, `deleteCut`, `replaceCuts`, `updateCutCaptions`) and reducer behavior exactly.

- [ ] **Step 1: Port the reducer to TypeScript**

Copy `frontend/src/editor/useTimelineReducer.js` to `useTimelineReducer.ts` and add types. Keep all logic byte-identical:

```ts
import { useReducer } from 'react'

export interface CaptionLine { start: number; end: number; text: string }
export interface Cut { source_start: number; source_end: number; caption_lines: CaptionLine[] }
export interface TimelineState { cuts: Cut[]; selectedId: number | null }

type Action =
  | { type: 'select'; index: number | null }
  | { type: 'trim'; index: number; which: 'left' | 'right'; boundary: number }
  | { type: 'reorder'; from: number; to: number }
  | { type: 'duplicate'; index: number }
  | { type: 'delete'; index: number }
  | { type: 'replace'; cuts: Cut[] }
  | { type: 'captions'; index: number; captionLines: CaptionLine[] }

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export function selectCut(index: number | null) { return { type: 'select', index } as Action }
export function trimCut(index: number, which: 'left' | 'right', boundary: number) { return { type: 'trim', index, which, boundary } as Action }
export function reorderCut(from: number, to: number) { return { type: 'reorder', from, to } as Action }
export function duplicateCut(index: number) { return { type: 'duplicate', index } as Action }
export function deleteCut(index: number) { return { type: 'delete', index } as Action }
export function replaceCuts(cuts: Cut[]) { return { type: 'replace', cuts } as Action }
export function updateCutCaptions(index: number, captionLines: CaptionLine[]) { return { type: 'captions', index, captionLines } as Action }

export function timelineReducer(state: TimelineState, action: Action): TimelineState {
  // ... copy every case body from the .js file unchanged ...
}

export function useTimelineReducer(initialCuts: Cut[] = []) {
  return useReducer(timelineReducer, initialCuts, (cuts) => ({ cuts, selectedId: null }))
}
```

Do **not** change any reducer behavior — the reducer unit tests in `Timeline.test.tsx` (Step 4) re-assert them.

- [ ] **Step 2: Port `Preview.tsx` — design vertical frame around the real video**

Take the current `Preview.jsx` (real `<video>`, `activeCaption`, `hashString`, `formatTime`) and wrap it in the editor's design stage from `EditorScreen.tsx` (panel "Preview", vertical `aspect-[9/16]` frame, scrubber row). Keep the real `<video>` element with the SAME `src` signature (`/api/projects/{projectId}/preview.mp4?v=<hash>`) and test-IDs. Extract and keep the design's caption-overlay styling, word highlighting from the caption text (last word in `#D5FF3F`), and the Play/Pause icon button row. Layout sketch:

```tsx
import { useMemo, useRef, useState } from 'react'
import { Play, Pause, Volume2, Maximize2 } from 'lucide-react'

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function activeCaption(cuts: Cut[], time: number): string | null {
  let offset = 0
  for (const cut of cuts) {
    const dur = cut.source_end - cut.source_start
    if (time >= offset && time < offset + dur) {
      const sourceTime = cut.source_start + (time - offset)
      for (const cap of cut.caption_lines || []) {
        if (sourceTime >= cap.start && sourceTime < cap.end) return cap.text
      }
      return null
    }
    offset += dur
  }
  return null
}
```

(the existing `hashString`, state, handlers for `time`/`playing`/`togglePlay`/`scrub` stay verbatim). Render the video inside the design's frame; keep the play/pause toggle button with `role="button"` and accessible name Play/Pause (the old test finds it by `{ name: /play/i }` then `/pause/i`), the scrub `input[type="range"]` with `aria-label="Seek"`, and `data-testid="preview-time"` readout. The caption overlay uses `data-testid="preview-caption"`.

- [ ] **Step 3: Run the Preview tests to verify they pass**

Run: `cd frontend && npx vitest run src/__tests__/Preview.test.tsx`
Expected: PASS (same 5 assertions as the old file: video src, play/pause, captions by time, formatted time, src refresh on cut change).

- [ ] **Step 4: Write `Timeline.test.tsx` (reducer + component)**

Copy the entire current `frontend/src/__tests__/Timeline.test.jsx` content into `Timeline.test.tsx` unchanged (it already imports `useTimelineReducer.js` — update that import to `useTimelineReducer.ts`), and update the `Timeline` import line to `'../editor/Timeline.tsx'`.

- [ ] **Step 5: Port `Timeline.tsx` — design-styled cut blocks keeping all interactions**

Port the box-style cut blocks from `EditorScreen.tsx`'s timeline section into the current `Timeline.jsx` (which already implements trim/reorder/select/duplicate/delete/keyboard). Apply these edits:

1. Copy the current `Timeline.jsx` prop flow, `startTrim`, drag-to-reorder (HTML5 `dataTransfer`), `handleKeyDown`, `canDelete` logic verbatim.
2. Replace the block rendering with the design's block markup, but keep the widths proportional via `style={{ flexGrow: Math.max(duration(cut), MIN_FLEX_GROW), flexBasis: 0, minWidth: 140 }}` and add a background thumbnail:

```tsx
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
  onMouseDown={() => { trackRef.current?.focus() }}
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
  className={isSelected ? 'ring-2 ring-[#5D8CFF]/30 shadow-lg shadow-[#5D8CFF]/20 rounded-xl' : `rounded-xl bg-[#191C20]`}
>
  <img
    src={`/api/projects/${projectId}/frame?t=${cut.source_start}`}
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
    onMouseDown={(e) => { e.stopPropagation(); handleTrimLeft(index)(e) }}
    style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', background: isSelected ? '#5D8CFF' : 'rgba(255,255,255,0.3)' }}
  />
  <div
    data-testid={`trim-right-${index}`}
    draggable={false}
    aria-label={`Trim right edge of cut ${index + 1}`}
    onMouseDown={(e) => { e.stopPropagation(); handleTrimRight(index)(e) }}
    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', background: isSelected ? '#5D8CFF' : 'rgba(255,255,255,0.3)' }}
  />
</div>
```

   The component signature becomes `Timeline({ projectId, cuts = [], selectedId, onSelect, onTrim, onReorder, onDuplicate, onDelete })`. Add `formatTime` helper (copy from Preview). Keep the Duplicate/Delete buttons (visible, `disabled` per current logic) above the track.

3. Keep `<div ref={trackRef} data-testid="timeline" tabIndex={0} onKeyDown={handleKeyDown}>` with `display: 'flex'`, `alignItems: 'stretch'`, `minHeight: 80`, `outline: 'none'`, `gap: 8`, `overflowX: 'auto'`.

- [ ] **Step 6: Run the Timeline tests to verify they pass**

Run: `cd frontend && npx vitest run src/__tests__/Timeline.test.tsx`
Expected: PASS (reducer suite + component interaction tests).

- [ ] **Step 7: Confirm the old Editor page still compiles and passes**

Edit `frontend/src/pages/Editor.jsx` import lines: `import Preview from '../editor/Preview'`, `import Timeline from '../editor/Timeline'`, `import Inspector from './Inspector'` untouched. Run:

Run: `cd frontend && npm test && npx tsc --noEmit`
Expected: PASS (old `Editor.test.jsx` still green because test-IDs/props were preserved).

- [ ] **Step 8: Commit**

```bash
git add frontend/src/editor frontend/src/pages/Editor.jsx frontend/src/__tests__
git rm frontend/src/editor/Preview.jsx frontend/src/editor/Timeline.jsx
git commit -m "feat(frontend): port Editor preview + timeline to design, keep reducer behavior"
```

---

## Task 10: Frontend — port Inspector + ExportBar to design (keep Save contract)

**Files:**
- Create: `frontend/src/editor/Inspector.tsx` (delete `Inspector.jsx`)
- Create: `frontend/src/editor/ExportBar.tsx` (delete `ExportBar.jsx`)
- Rewrite: `frontend/src/__tests__/Inspector.test.tsx`, `frontend/src/__tests__/ExportBar.test.tsx`
- Modify: `frontend/src/pages/Editor.jsx` imports to extensionless (`./Inspector`, `/ExportBar`).

**Key contract:** preserve test-IDs `caption-text-<i>`, `caption-remove-<i>`, `caption-add`, `font-select`, `music-select`, `music-volume`, `music-duck`, `music-clear`, `inspector-save`, `inspector-save-error`, and `export-destination`, `export-button`, `export-progress`, `export-success`, `open-folder`, `export-error`, `export-retry`. Keep `Inspector` props `{ cut, font, music, onCaptionChange, onFontChange, onMusicChange, onMusicClear, onSave, saving, saveError }` and `ExportBar` props `{ projectId, snapshot, enabled, onExported }`. This keeps the old `Editor.test.jsx` green until Task 11.

- [ ] **Step 1: Port `Inspector.tsx` with design tabs while keeping IDs**

Port `EditorScreen.tsx`'s right-side inspector (tabs: Captions / Font / Music) into `Inspector.tsx`. Keep the caption list behavior from the old `Inspector.jsx` (edit/remove/add map to `onCaptionChange(lines)`), keep `getMusic()` loading, and keep the font and save controls. Concretely:

1. Tabs state: `const [inspectorTab, setInspectorTab] = useState<'captions'|'font'|'music'>('captions')`, rendered as the design's three tab buttons (`Type`, `Sliders`, `Music` icons).
2. **Captions tab:** the design's per-line row (timestamp badge + text input + trash) with:
   - input `data-testid={`caption-text-${i}`}` `value={line.text}` `onChange={(e) => handleCaptionText(i, e.target.value)}` `aria-label={`Caption ${i + 1} text`}`.
   - trash button `data-testid={`caption-remove-${i}`}` onClick remove.
   - "Add caption" button `data-testid="caption-add"` → `lines.push({ start: cut.source_start, end: cut.source_end, text: '' })`. Copy `handleAddCaption`, `handleCaptionText`, `handleRemoveCaption` from the old component verbatim (they operate on `cut.caption_lines`).
   - Empty state keeps text `Select a cut to edit captions.`
3. **Font tab:** the design lists `['OpenSans','Arial','Roboto','Inter','Playfair']` — prune to the real backend set and use a `<select data-testid="font-select">` (a design-styled select is fine and keeps the tests that read `.value`):

```tsx
export const FONTS = ['Arial', 'OpenSans', 'Roboto']

<select
  data-testid="font-select"
  value={font}
  onChange={(e) => onFontChange(e.target.value)}
  className="w-full bg-[#191C20] border border-white/15 rounded-xl p-3 text-xs text-white outline-none focus:border-[#D5FF3F]"
>
  {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
</select>
```

4. **Music tab:** keep `getMusic()` → `tracks`; select `data-testid="music-select"` with `<option value="">None</option>` + real tracks; keep `handleMusicSelect` (matches by `source`+`path`), volume range `data-testid="music-volume"` `min={0} max={1} step={0.1}`, duck checkbox `data-testid="music-duck"`, remove button `data-testid="music-clear"`. Style with the design's select/row classes.
5. **Save:** the Save button `data-testid="inspector-save"` `{saving ? 'Saving…' : 'Save'}` and `data-testid="inspector-save-error"` render at the bottom of the sidebar, styled like the chrome Save button.

- [ ] **Step 2: Port `ExportBar.tsx` — design footer bar**

Take the current `ExportBar.jsx` flow (save snapshot → `exportProject` → `pollJob` → success/`open-folder`/error/retry) and restyle it as the design's footer: "Export:" label, destination input `data-testid="export-destination"` (folder path, prefilled via `defaultDestination`, shows `MP4 • 1080×1920 • H.264` spec text), `Export` button `data-testid="export-button"` disabled when `!canExport`, a progress row `export-progress`/percent, `export-success` + `open-folder`, `export-error` + `export-retry`. Keep every handler from the old file verbatim. `defaultDestination` and `canExport` stay identical.

- [ ] **Step 3: Write `Inspector.test.tsx` and `ExportBar.test.tsx`**

Copy the current `Inspector.test.jsx` and `ExportBar.test.jsx` content into the `.tsx` twins, updating imports to `'../editor/Inspector.tsx'` / `'../editor/ExportBar.tsx'` and the `vi.mock('../api.js', …)` stay the same (Vite resolves to `api.ts`).

- [ ] **Step 4: Run the tests**

Run: `cd frontend && npx vitest run src/__tests__/Inspector.test.tsx src/__tests__/ExportBar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Confirm old Editor page still green**

Run: `cd frontend && npm test && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/editor/Inspector.tsx frontend/src/editor/ExportBar.tsx frontend/src/pages/Editor.jsx frontend/src/__tests__
git rm frontend/src/editor/Inspector.jsx frontend/src/editor/ExportBar.jsx
git commit -m "feat(frontend): port Inspector + ExportBar to design, keep snapshot save contract"
```

---

## Task 11: Frontend — port the Editor page (3-panel design shell, real snapshot)

**Files:**
- Create: `frontend/src/pages/Editor.tsx` (delete `frontend/src/pages/Editor.jsx`)
- Rewrite: `frontend/src/__tests__/Editor.test.tsx` (delete old `Editor.test.jsx`)

**Interfaces:**
- Consumes: `getSnapshot(projectId)`, `saveSnapshot(projectId, snapshot)`, `getMusic()`, `formatCutRange`, `formatTime` etc.; `editor/Preview`, `editor/Timeline`, `editor/Inspector`, `editor/ExportBar` (all already ported).
- Produces: default export `Editor ({ projectId, onRegisterSave })` — loads snapshot on mount, feeds `useTimelineReducer`, delegates to the four editor subcomponents, handles save (via `handleSave` as the Inspector's `onSave` AND via WindowChrome's Save button via `onRegisterSave`), tracks unsaved state, listens for keyboard shortcuts (`Ctrl/Cmd+S`), and holds `selectedFont` / `music` / `exportPath` state.

**Removed from the design (real-app honesty):** the left sidebar's fabricated "Script in use" card (title + words + emoji) — replace with real computed values: total duration, cut count, and the real output row below. Font list is limited to `['Arial', 'OpenSans', 'Roboto']` (matches backend). The fake playback simulation (scripted `currentTimeSec` increments) is replaced by the real `<video>` in `Preview`, so the design's fake play/pause logic does NOT move here.

- [ ] **Step 1: Write the failing `Editor.test.tsx`**

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Editor from '../pages/Editor.tsx'
import * as api from '../api.js'

vi.mock('../api.js', () => ({
  getSnapshot: vi.fn(),
  saveSnapshot: vi.fn(),
  getMusic: vi.fn(),
}))

const SNAPSHOT = {
  cuts: [
    { source_start: 0, source_end: 2, caption_lines: [{ start: 0, end: 2, text: 'First' }] },
    { source_start: 2, source_end: 5, caption_lines: [{ start: 2, end: 5, text: 'Second' }] },
  ],
  music: null,
  font: 'Roboto',
  export_path: 'out.mp4',
}

describe('Editor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getMusic.mockResolvedValue({ tracks: [], social: false, uses_local: true })
  })

  it('loads the snapshot on mount and feeds its cuts into the timeline', async () => {
    api.getSnapshot.mockResolvedValue(SNAPSHOT)
    render(<Editor projectId="p1" />)

    await waitFor(() => expect(screen.getByTestId('timeline-cut-1')).toBeTruthy())
    fireEvent.click(screen.getByTestId('timeline-cut-0'))
    expect(screen.getByDisplayValue('First')).toBeTruthy()
    expect(screen.getByTestId('font-select').value).toBe('Roboto')
  })

  it('falls back to empty cuts and default font when the snapshot is absent', async () => {
    const err = new Error('No snapshot yet') as Error & { status?: number }
    err.status = 404
    api.getSnapshot.mockRejectedValue(err)
    render(<Editor projectId="p1" />)

    await waitFor(() => expect(api.getSnapshot).toHaveBeenCalled())
    expect(screen.queryByTestId('timeline-cut-0')).toBeNull()
    expect(screen.getByTestId('font-select').value).toBe('Arial')
  })

  it('shows unsaved changes after editing and saves on Cmd/Ctrl+S', async () => {
    api.getSnapshot.mockResolvedValue(SNAPSHOT)
    render(<Editor projectId="p1" />)
    await waitFor(() => expect(screen.getByTestId('timeline-cut-0')).toBeTruthy())

    fireEvent.click(screen.getByTestId('timeline-cut-0'))
    const input = screen.getByTestId('caption-text-0')
    fireEvent.change(input, { target: { value: 'Edited' } })
    expect(screen.getByText(/unsaved/i)).toBeTruthy()

    api.saveSnapshot.mockResolvedValue(SNAPSHOT)
    fireEvent.keyDown(screen.getByTestId('timeline'), { key: 's', ctrlKey: true })
    await waitFor(() => expect(api.saveSnapshot).toHaveBeenCalledWith('p1', expect.objectContaining({ font: 'Roboto' })))
    expect(screen.getByText(/saved/i)).toBeTruthy()
  })

  it('exposes save via handleSave and reloads on load error retry', async () => {
    api.getSnapshot.mockRejectedValueOnce(new Error('boom'))
    api.getSnapshot.mockResolvedValue(SNAPSHOT)
    render(<Editor projectId="p1" />)
    await waitFor(() => expect(screen.getByTestId('editor-load-error')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    await waitFor(() => expect(screen.getByTestId('timeline-cut-0')).toBeTruthy())
  })

  it('updates caption text into the timeline reducer', async () => {
    api.getSnapshot.mockResolvedValue(SNAPSHOT)
    render(<Editor projectId="p1" />)
    await waitFor(() => expect(screen.getByTestId('timeline-cut-0')).toBeTruthy())
    fireEvent.click(screen.getByTestId('timeline-cut-0'))
    fireEvent.change(screen.getByTestId('caption-text-0'), { target: { value: 'Changed' } })
    expect(screen.getByDisplayValue('Changed')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/__tests__/Editor.test.tsx`
Expected: FAIL — `Editor.tsx` doesn't exist.

- [ ] **Step 3: Implement `pages/Editor.tsx`**

Port `design system/shortvidsfactory/src/components/screens/EditorScreen.tsx`'s 3-panel layout (header row, left sidebar, center preview+timeline, right inspector) but source everything from the REAL state. Reuse the data-loading/save skeleton from the OLD `frontend/src/pages/Editor.jsx` (which already handles `getSnapshot` 404 fallback, load-error retry, `replaceCuts`, font/music/export-path state, `handleSave`). Key edits:

1. Props + state: `Editor({ projectId, onRegisterSave })`; state from old file verbatim (`useTimelineReducer`, `font`, `music`, `exportPath`, `saving`, `saveError`, `loadError`, `loadAttempt`) plus `hasUnsavedChanges`:

```tsx
import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Film, Music, Type, Sparkles, Sliders, Smartphone, HelpCircle } from 'lucide-react'
import Preview from '../editor/Preview'
import Timeline from '../editor/Timeline'
import Inspector from '../editor/Inspector'
import ExportBar from '../editor/ExportBar'
import { getSnapshot, saveSnapshot } from '../api'
import {
  useTimelineReducer,
  selectCut,
  trimCut,
  reorderCut,
  duplicateCut,
  deleteCut,
  replaceCuts,
  updateCutCaptions,
} from '../editor/useTimelineReducer'

const DEFAULT_FONT = 'Arial'
```

  Keep the reducer usage EXACTLY as the old page: `const [state, dispatch] = useTimelineReducer([])` and `const { cuts, selectedId } = state` — creators are action objects passed to `dispatch` (`dispatch(selectCut(index))`, never called directly). Add `hasUnsavedChanges` state.

2. `handleSave` and its `onRegisterSave` bridge (match old `handleSave` which calls `saveSnapshot(projectId, { cuts, music, font, export_path: exportPath })`):

```tsx
const handleSave = useCallback(async () => {
  setSaving(true)
  setSaveError(null)
  try {
    const snapshot = { cuts, music, font, export_path: exportPath }
    await saveSnapshot(projectId, snapshot)
    setHasUnsavedChanges(false)
  } catch (err) {
    setSaveError((err as Error).message)
  } finally {
    setSaving(false)
  }
}, [projectId, cuts, music, font, exportPath])

useEffect(() => {
  onRegisterSave?.(handleSave)
}, [onRegisterSave, handleSave])
```

3. Keyboard shortcut for save and mark-dirty dispatch wrappers:

```tsx
useEffect(() => {
  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      void handleSave()
    }
  }
  window.addEventListener('keydown', onKeyDown)
  return () => window.removeEventListener('keydown', onKeyDown)
}, [handleSave])

const markDirty = (fn: (...args: unknown[]) => void) =>
  (...args: unknown[]) => {
    setHasUnsavedChanges(true)
    fn(...args)
  }

const select = markDirty((i: number) => dispatch(selectCut(i)))
const trim = markDirty((i: number, w: 'start' | 'end', b: number) => dispatch(trimCut(i, w, b)))
const reorder = markDirty((f: number, t: number) => dispatch(reorderCut(f, t)))
const duplicate = markDirty((i: number) => dispatch(duplicateCut(i)))
const del = markDirty((i: number) => dispatch(deleteCut(i)))
const captions = markDirty((i: number, l: unknown[]) => dispatch(updateCutCaptions(i, l)))
```

  `replaceCuts` from the load effect dispatches directly (NOT through a dirty wrapper — loading is not a user edit).

4. Left sidebar (design's `aside`): replace the fake "Script in use" card with real data — total duration and cut count from `state.cuts`, plus a real output row (9:16 • 1080×1920 MP4). Keep the backtrack shortcut cards with real hints: `Del Delete cut • ⌘S Save • D Duplicate cut • ← → Select`. The top back button calls `onBack`. Keep the design's `h-[calc(100vh-60px)]` heights and `justify-between`.

5. Center: `<Preview projectId={projectId} cuts={state.cuts} />` inside the design's preview panel; below it `<Timeline projectId={projectId} cuts={state.cuts} selectedId={state.selectedId} onSelect={select} onTrim={trim} onReorder={reorder} onDuplicate={duplicate} onDelete={del} />`. Keep the footer `<ExportBar projectId={projectId} snapshot={{ cuts: state.cuts, music, font, export_path: exportPath }} enabled={state.cuts.length > 0} onExported={handleExported} />` — `handleExported` marks saved and refreshes `exportPath` from the result (verbatim from old Editor.jsx).

6. Right side: `<Inspector cut={selected} font={font} music={music} onCaptionChange={(lines) => captions(selectedId, lines)} onFontChange={setFont} onMusicChange={setMusic} onMusicClear={() => setMusic(null)} onSave={handleSave} saving={saving} saveError={saveError} />`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/__tests__/Editor.test.tsx`
Expected: PASS.

- [ ] **Step 5: Update App (wire chrome Save to editor), delete old page**

In `frontend/src/App.tsx`, keep the WindowChrome Save button's Save handler but have it delegate to the registered editor save:

- Add `const saveEditorRef = useRef<(() => void) | null>(null)` in `App` (import `useRef`).
- The chrome Save button's `onClick` calls `saveEditorRef.current?.()` (instead of submitting the settings form directly).
- Render `pageBody = <Editor projectId={m[1]} onRegisterSave={(fn) => { saveEditorRef.current = fn }} />` for the editor route (line `pageBody = <Editor projectId={m[1]} />`).

Delete `frontend/src/pages/Editor.jsx` and `frontend/src/__tests__/Editor.test.jsx`.

- [ ] **Step 6: Run the full suite**

Run: `cd frontend && npm test && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/App.tsx frontend/src/pages/Editor.tsx frontend/src/__tests__/Editor.test.tsx
git rm frontend/src/pages/Editor.jsx frontend/src/__tests__/Editor.test.jsx
git commit -m "feat(frontend): port Editor screen to design, wire real snapshot + save"
```

---

## Task 12: Frontend — Exporting screen + export route

**Files:**
- Create: `frontend/src/pages/Exporting.tsx`
- Create: `frontend/src/__tests__/Exporting.test.tsx`
- Modify: `frontend/src/App.tsx` (add the `/project/:id/export` route + export-navigation helper)
- Modify: `frontend/src/editor/ExportBar.tsx` (navigate to the export screen instead of inline success UI)

**Interfaces:**
- Consumes: `pollJob(jobId, onProgress)`, `revealDirectory()`, from `api.ts`; `JobEvent` from `types.ts`.
- Produces: default export `Exporting ({ projectId, jobId, destination, onBack })` — polls the job stream, drives a progress percent + 4-step tracker + live log list, shows the design's success/error states, supplies "Open Folder" (`revealDirectory`) and "Back to editor" (`onBack`).
- `App` gains a `navigateExport(projectId, jobId, destination)` helper used by the editor's ExportBar: `#/project/{projectId}/export?job={jobId}&dest={encodeURIComponent(destination)}`.

- [ ] **Step 1: Write the failing `Exporting.test.tsx`**

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Exporting from '../pages/Exporting.tsx'
import * as api from '../api.js'

vi.mock('../api.js', () => ({
  pollJob: vi.fn(),
  revealDirectory: vi.fn(),
}))

function renderExporting(overrides = {}) {
  return render(
    <Exporting
      projectId="p1"
      jobId="j1"
      destination="/tmp/vids"
      onBack={vi.fn()}
      {...overrides}
    />,
  )
}

describe('Exporting', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows processing progress and mapped steps from job events', async () => {
    api.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress({ status: 'running', progress: 0.5 })
      return { close: vi.fn() }
    })
    renderExporting()
    await waitFor(() => expect(api.pollJob).toHaveBeenCalledWith('j1', expect.any(Function)))
    expect(screen.getByRole('progressbar')).toBeTruthy()
    expect(screen.getByText(/50%/)).toBeTruthy()
  })

  it('marks step trackers complete as progress rises', async () => {
    api.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress({ status: 'running', progress: 0.85 })
      return { close: vi.fn() }
    })
    renderExporting()
    await waitFor(() => expect(screen.getByRole('progressbar')).toBeTruthy())
    expect(screen.getAllByText(/done/i).length).toBeGreaterThanOrEqual(2)
  })

  it('shows success, then revealDirectory on Open Folder', async () => {
    api.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress({ status: 'done', progress: 1, result: { path: '/tmp/vids/out.mp4' } })
      return { close: vi.fn() }
    })
    api.revealDirectory.mockResolvedValue({ ok: true })
    renderExporting()
    await waitFor(() => expect(screen.getByText(/export completed/i)).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /open folder/i }))
    expect(api.revealDirectory).toHaveBeenCalled()
  })

  it('shows error state and calls onBack from the back button', async () => {
    api.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress({ status: 'error', progress: 1, error: 'boom' })
      return { close: vi.fn() }
    })
    const onBack = vi.fn()
    renderExporting({ onBack })
    await waitFor(() => expect(screen.getByText(/boom/)).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /back to editor/i }))
    expect(onBack).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/__tests__/Exporting.test.tsx`
Expected: FAIL — `Exporting.tsx` doesn't exist.

- [ ] **Step 3: Implement `pages/Exporting.tsx`**

Port `design system/shortvidsfactory/src/components/screens/ExportingScreen.tsx` 1:1 (header, progress card, 4-step tracker, live log list, preview thumbnail, settings card, footer), replacing the fake auto-increment `setInterval` with a real `pollJob` stream:

```tsx
import { useEffect, useState } from 'react'
import {
  CheckCircle2, Loader2, ArrowLeft, FileText, Sparkles, Folder,
  Trash2, ExternalLink, Play, Pause, ChevronUp, ChevronDown, Check, Info,
} from 'lucide-react'
import { pollJob, revealDirectory } from '../api'
import type { JobEvent } from '../types'

interface ExportingProps {
  projectId: string
  jobId: string
  destination: string
  onBack: () => void
}

const STEP_LABELS = ['Prepare', 'Render video', 'Add music', 'Export']

export default function Exporting({ projectId, jobId, destination, onBack }: ExportingProps) {
  const [progressPercent, setProgressPercent] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)
  const [logs, setLogs] = useState<Array<{ status: 'pending' | 'in_progress' | 'completed'; message: string }>>(
    STEP_LABELS.map((label, i) => ({
      status: i === 0 ? 'in_progress' : 'pending',
      message: `${label}...`,
    })),
  )
  const [showLogs, setShowLogs] = useState(true)

  useEffect(() => {
    if (!jobId) {
      setError('No export job is running.')
      return undefined
    }

    const source = pollJob(jobId, (data: JobEvent) => {
      const progress = data?.progress ?? 0
      setProgressPercent(Math.round(progress * 100))

      const stepIdx = progress < 0.25 ? 0 : progress < 0.5 ? 1 : progress < 0.75 ? 2 : 3
      setLogs((prev) =>
        prev.map((log, i) => ({
          ...log,
          status: i < stepIdx ? 'completed' : i === stepIdx ? 'in_progress' : 'pending',
          message: i < stepIdx ? `${STEP_LABELS[i]} — Done` : i === stepIdx ? `${STEP_LABELS[i]}...` : log.message,
        })),
      )

      if (data?.status === 'done') {
        source.close()
        setCompleted(true)
        setProgressPercent(100)
        setLogs((prev) =>
          prev.map((log, i) => ({
            status: 'completed',
            message: `${STEP_LABELS[i]} — Done`,
          })),
        )
      } else if (data?.status === 'error') {
        source.close()
        setError(data.error || 'Export failed')
      }
    })

    return () => source.close()
  }, [jobId])
```

  Finish the JSX by porting the design's layout verbatim with these substitutions:
- Progress card: `role="progressbar"` `aria-valuenow={progressPercent}`, bar `width: ${progressPercent}%`, label `Exporting video… {progressPercent}%`.
- Steps: map `STEP_LABELS` with the design's icons per step (`Check`, `Loader2`, `CheckCircle2`).
- Logs: the four rows + collapse toggle (`ChevronUp`/`ChevronDown` → `setShowLogs(!showLogs)`).
- Preview thumbnail: `<img src={`/api/projects/${projectId}/frame?t=0`} />` (real).
- Settings card: show `destination` (from prop) and real constants (MP4 • 1080×1920 • H.264 • 30fps).
- Success: `{completed && !error && (<button onClick={() => revealDirectory()}><ExternalLink /> Open Folder</button>)}` plus `Export completed successfully!` and the output path.
- Error: `{error && <p role="alert">{error}</p>}` plus a note that nothing was saved.
- Footer: `<button onClick={onBack}><ArrowLeft /> Back to editor</button>`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/__tests__/Exporting.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add the route and export navigation in `App.tsx`**

In `frontend/src/App.tsx`:

1. Add a `navigateExport` helper alongside `navigate`:

```tsx
function navigateExport(projectId: string, jobId: string, destination: string) {
  const params = new URLSearchParams({ job: jobId, dest: destination })
  const hash = `#/project/${projectId}/export?${params.toString()}`
  window.location.hash = hash
  setRoute(`/project/${projectId}/export?${params.toString()}`)
  setActiveProjectTitle(`Project ${projectId}`)
}
```

2. Parse the new route before the generic `/project/:id/(scripts|editor)` matcher:

```tsx
const exportMatch = route.match(/^\/project\/([^/]+)\/export/)
if (exportMatch) {
  const pid = exportMatch[1]
  const params = new URLSearchParams(route.includes('?') ? route.split('?')[1] : '')
  pageBody = (
    <Exporting
      projectId={pid}
      jobId={params.get('job') ?? ''}
      destination={params.get('dest') ?? ''}
      onBack={() => navigate('editor', pid)}
    />
  )
} else if (route === '/new') { ... }
```

3. Add the import: `import Exporting from './pages/Exporting'`.

- [ ] **Step 6: Rewire `ExportBar.tsx` to navigate on export start**

In `frontend/src/editor/ExportBar.tsx` the handler currently polls inline and shows success UI. Replace the success branch: after `exportProject` resolves with `{ job_id }`, call a new prop `onNavigateExport(jobId)`:

- Add to props: `onNavigateExport?: (jobId: string) => void`.
- In `handleExport`: after `saveSnapshot(...)` and `exportProject(projectId, destination.trim())` resolve, call `onNavigateExport?.(job_id)` — remove the inline `pollJob` success / `revealDirectory` flow (the Exporting screen owns the job stream). Keep the button disabled state and destination input; progress/errors now surface via the Exporting route. Provide a default `onNavigateExport` that does nothing so old tests stay green.
- Update `frontend/src/__tests__/ExportBar.test.tsx`: the old success-path test now asserts `onNavigateExport` is called with the job id and that inline `revealDirectory` is NOT called from the bar.

- [ ] **Step 7: Run the full suite**

Run: `cd frontend && npm test && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/Exporting.tsx frontend/src/__tests__/Exporting.test.tsx frontend/src/App.tsx frontend/src/editor/ExportBar.tsx frontend/src/__tests__/ExportBar.test.tsx
git commit -m "feat(frontend): dedicated export screen with live job progress"
```

---

## Task 13: Final cleanup, verification, and manual acceptance prep

**Files:**
- Verify: no `.js`/`.jsx` remain under `frontend/src` (all converted to `.ts`/`.tsx`).
- Verify: design-only mocks gone — grep for `unsplash.com`, `INITIAL_`, `SAMPLE_`, `setTimeout` inside `frontend/src`.
- Optional: update `docs/acceptance.md` and `docs/designer-brief.md` if needed to reference the new `/export` route.

- [ ] **Step 1: Confirm no legacy files remain**

Run: `cd frontend && find src -name '*.js' -o -name '*.jsx' | wc -l`
Expected: 0.

- [ ] **Step 2: Confirm no fabricated data remains**

Run: `cd frontend && grep -rn "unsplash\|INITIAL_\|SAMPLE_" src --include='*.ts*' | grep -v '__tests__' || true`
Expected: no matches outside tests.

- [ ] **Step 3: Full automated verification**

Run:

```bash
cd frontend && npm test && npx tsc --noEmit && npm run build
cd ../backend && python -m pytest -q
```

Expected: frontend suite + typecheck + build pass; backend suite passes (Tasks 1–2 added tests).

- [ ] **Step 4: Manual smoke test (dev servers)**

Start backend (`cd backend && uvicorn app.main:app --port 8765`) and frontend (`cd frontend && npm run dev`, proxy already targets `http://localhost:8765`). Verify live in the browser:
1. `#/` shows the design Projects grid with real project cards (thumbnails from the frame endpoint, status badges, durations, edited times).
2. `#/new` uploads a real ≤20s clip, runs the real job stream, navigates to Scripts.
3. `#/project/:id/scripts` shows real 3-script cards; choosing one opens the Editor.
4. Editor: real preview video plays; captions overlay; trim/reorder/duplicate/delete; font/music tabs edit; Cmd/Ctrl+S persists; ExportBar navigates to the export screen.
5. Export screen: live progress → success → Open Folder reveals the file; error path shows the error state and Back to editor.
6. Settings modal persists export folder/font to localStorage.

- [ ] **Step 5: Commit any residual changes**

```bash
git add -A
git status --short
git commit -m "chore(frontend): final cleanup after design port"
```

---

## Execution Handoff

- Run in order: Task 1 → Task 13. Each task ends with a green verification command and a commit; if a task fails, stop at that task and fix it before proceeding.
- Prefer `superpowers:subagent-driven-development` (recommended) — each Task is a dispatchable unit with its own acceptance run.
- The old `Scripts.test.jsx` and `Editor.test.jsx` files reference old props/structure; they are deleted in Tasks 8 and 11 respectively, exactly as the plan states. The old editor components' tests (Preview/Timeline/Inspector/ExportBar) are recreated in `.tsx` form in Tasks 9–10.
- After Task 12, `ExportBar` no longer polls inline; the Exporting screen owns the job stream, so `ExportBar.test.tsx` must not assert an `open-folder` button on the bar.
- Final repo state: all `frontend/src` files are `.ts`/`.tsx`; the design mock folder (`design system/`) stays in the repo untouched as the reference; the backend has the two new endpoints and their tests.
