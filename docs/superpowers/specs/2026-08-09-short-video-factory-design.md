# ShortVidsFactory — Design Spec

**Date:** 2026-08-09
**Status:** Approved design (pre-implementation)
**Persona-driven flow:** Pick a video → it curates a 15–30s short → you approve → edit → export.

## 1. Goal

A local web app that automates the short-video editing pipeline:

1. Upload a (potentially long) source video from the browser.
2. Transcription into word-timed segments.
3. A local AI agent curates **3 candidate scripts** — each a self-contained 15–30s short drawn from *actual spoken content* — with a hook/payoff for the whole, mapped cuts, and per-cut captions.
4. User approves one script → becomes an editable mini editor (CapCut-style) timeline.
5. Music added (pluggable sources; local files are guaranteed, social-app extractor is best-effort).
6. AI-generated captions + font choice; user-approved.
7. Export a 9:16 1080×1920 MP4 with burned-in captions.

All pop-processual flows are localhost web app (desktop wrapper via Tauri considered later). AI brain = `opencode run --format json` spawned per agent.

## 2. Stack & architecture

```
shortVidsFactory/
├── backend/               # Python FastAPI on localhost:8765
│   ├── api.py             # REST routes + SSE event stream for job progress
│   ├── media.py           # ffmpeg wrappers: proxy, trim, concat, captions, export
│   ├── transcribe.py      # faster-whisper → word-level timestamps
│   ├── ai.py              # uns the local opencode CLI agents (JSON in/out)
│   ├── music.py           # pluggable music sources (local files + social extractor)
│   └── projects.py        # project persistence (JSON snapshot per project)
└── frontend/              # React + Vite
    ├── upload flow        # pick file, create project
    ├── script choice      # 3 candidate script cards
    ├── editor             # preview + timeline + inspector
    └── export             # progress, done + open-folder
```

- Backend owns all media processing (whisper, ffmpeg, speech/music separation). Frontend is a thin client.
- **Jobs** run server-side (transcribe, script, preview build, export). Client polls status via SSE; each job is retry-able from the UI on failure.
- Projects are self-contained directories `projects/<id>/` holding source, proxies, previews, transcript.json, scripts.json, and the editor snapshot.

## 3. Stage-by-stage flow

### 3.1 Upload
- Browser uploads the source video → stored in project dir; backend builds a **low-res proxy** (~540px wide) for fast scrubbing in the editor. No heavy work triggered yet.

### 3.2 Transcribe
- `faster-whisper` runs locally (CPU) on the proxy/source audio. Output: word-level segments `[{start, end, text}]`, saved to `transcript.json`.
- Errors surface as "transcription failed" with retry.

### 3.3 Script generation (Agent 1 — **ScriptWriter**)
- Invoked via: `opencode run --format json <prompt> --project projects/<id>`
- Input context: full transcript, source duration, target 15–30s, language, creative constraints.
- **Hard constraints baked into prompt:**
  - 3 distinct candidate scripts, with different hooks/openings.
  - Self-contained (must make sense without watching the full video).
  - **Teaser:** the hook is built to make viewers *want* to watch the full video — pulled only from actual spoken content. No fabricated, externally-planted tease or text.
  - SFW, interesting, no violence.
  - Captions match actual words (Style A — mixed spoken audio), each cut's time range must exactly align the spoken words.
  - Per-cut captions = real words from the transcript.
- Output enforced to strict JSON schema: `{ scripts: [{ id, hook, summary, duration_s, words_used, cuts: [{ source_start, source_end, caption_lines: [{start,end,text}] }] }] }`.
- Validate JSON; on invalid/empty → clear error, allow regenerate.

### 3.4 Script approval
- Frontend shows 3 cards (hook line, word count, cut thumbnail previews). User approves one → becomes the initial timeline.

### 3.5 Editor (the mini CapCut)
Three zones:

- **Preview** — vertical 9:16 canvas, plays the current cut sequence with captions overlay, scrubber/play-pause. On-demand trimmed preview MP4 (540px) rebuilt when cuts change. Live frame-accurate scrubbing is **out of scope** for MVP (would need a browser video decoder engine).
- **Timeline** — single video track (blocks = cuts) + one music lane below. Operations:
  - trim/retrim (drag block edges, panel bounded by source edges),
  - delete, reorder (drag body), duplicate (new instance after original),
  - select cut → inspect.
- **Inspector** — per-cut caption text edit, font picker, music selection, music trim/volume/ducking, export button.

Editor state is client-side React; saved as a JSON snapshot (cuts, captions, fonts, music ref) on the backend. Reopening a project rehydrates the timeline.

### 3.6 Music
- Pluggable `MusicSource` interface on the backend:
  - **LocalFiles**: pick a local audio via a server-picked file dialog / drop zone. Always available; preferred path for MVP reliability.
  - **SocialExtractor** (TikTok/Insta): best-effort crawl + download. Behind the same interface; on failure the UI degrades to "source unavailable, use local" rather than breaking export. This is treated as an add-on/experimental, not a hard dependency.
- Music timeline support: trim music, shift, volume, and optional **auto-ducking** (lower music during speech). Caption timing comes from word segments.

### 3.7 Captions
- Captions = per-cut caption lines generated in 3.3 (matches real words). User approves them in editor; can edit text per line; can re-trigger **Agent 2 — CaptionEditor** for a single cut's captions to be recreated from the audio context.
- Font picker applies to all captions project-wide (single font style per project for MVP).

### 3.8 Export
All ffmpeg, one machine pass:
1. Concat cuts in timeline order (concat demuxer for same-codec; re-encode pass otherwise).
2. Scale to 1080×1920 (9:16), crop centered.
3. Burn captions to the frame from approved text + timestamps + font.
4. Mix music with volume budgeting/ducking under speech.
5. Output **H.264 + AAC** MP4 to a user-chosen destination; "Done" + open-folder.

Title/subtitle burn-in (persistent label) is **not** in MVP — captions only. Add later if valued.

## 4. Error handling

- Every stage is a retry-able server job with a job state; UI shows progress + friendly error + explicit Retry.
- Failed transcription → retry / re-upload.
- opencode returns invalid JSON → clear error + regenerate script attempt.
- Music extractor failure → banner "source unavailable", Local files still works.
- Export failure → error with ffmpeg log pointer; project snapshot intact.
- All AI output schemas validated server-side before use.

## 5. Persistence & projects

- `projects/<id>/` JSON snapshot covers full editor state — reopening a project continues editing.
- Project list/dashboard (create, resume, duplicate) in frontend.

## 6. Open questions / deferred

- Live frame-accurate scrubbing: deferred (build preview-on-demand model first).
- Real browser decoder engine for live layered timeline (MediaRecorder/WebCodecs pipeline): potential later iteration.
- Font selection UX details (system fonts vs bundled fonts) during implementation.
- Tauri desktop wrapper: post-MVP.

## 7. Testing approach

- Backend unit tests: ffmpeg result validation (output exists, duration ~expected, format matches), transcript schema, script JSON schema validation, music ducking math.
- Media integration test: fixture short clip → full pipeline → exported MP4 is valid (ffprobe) with caption overlay.
- Frontend: React component tests for the three states (script cards, timeline ops, inspector), and at least one end-to-end flow against a fake / recorded backend job (mock SSE).
- Manual REAL end-to-end on a real video as acceptance.