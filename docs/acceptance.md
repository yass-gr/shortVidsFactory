# Manual Acceptance Checklist

Human-run end-to-end acceptance for ShortVidsFactory.

## Prerequisites

- Python >= 3.12 with backend deps installed (`pip install -e backend` or via venv).
- System `ffmpeg`/`ffprobe` binaries on `PATH` (all media goes through them).
- `opencode` CLI available as `opencode run --format json` (the local AI agent for scripts/captions).
- Node + npm for the frontend (Vite + React 18).
- A real spoken-word video clip, at least 20 seconds long (must contain actual speech so captions can be transcribed).

## Configuration (environment variables)

| Variable | Purpose | Default |
|----------|---------|---------|
| `SHORTSVIDS_OPENCODE_BIN` | opencode binary name/path | `opencode` |
| `SHORTSVIDS_OPENCODE_MODEL` | model passed via `opencode run --model` | unset (no flag) |
| `SHORTSVIDS_WHISPER_MODEL` | faster-whisper model for transcription | `base` |
| `SHORTSVIDS_MUSIC_DIR` | local music track directory | `./music` |
| `SHORTSVIDS_FONT_PATH` | caption font file for export | `/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf` |

## Run the servers

Backend:

```bash
cd backend
uvicorn app.main:app --port 8765
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Acceptance steps

1. Open `/upload`: drop a real ≥20s spoken-word mp4 → transcription completes in ~seconds → 3 script cards appear.
2. Choose a script → the editor loads the timeline + preview; scrub/play; trim a cut; reorder; duplicate; delete.
3. Open the inspector: edit caption text; pick a font; add a local music track; set volume and ducking on.
4. Confirm captions match the spoken audio (Style A guarantee — captions always reflect real spoken words).
5. Save the snapshot → hard refresh the page → the editor resumes with the saved cuts/font/music.
6. Export to a chosen folder → verify a valid 1080x1920 (9:16) H.264 MP4 with burned-in captions and music ducked under speech → open the folder (Reveal).
