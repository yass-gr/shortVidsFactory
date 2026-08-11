# Manual Acceptance Checklist

Human-run end-to-end acceptance for ShortVidsFactory.

## Prerequisites

- Python >= 3.12 with backend deps installed (`pip install -e backend` or via venv).
- System `ffmpeg`/`ffprobe` binaries on `PATH` (all media goes through them).
- A Google AI (Gemini) API key, exported as `SHORTSVIDS_GEMINI_API_KEY` (or placed in `backend/.env`).
- Node + npm for the frontend (Vite + React 19 + TypeScript).
- A real spoken-word video clip, at least 20 seconds long (must contain actual speech so captions can be transcribed).

## Configuration (environment variables)

| Variable | Purpose | Default |
|----------|---------|---------|
| `SHORTSVIDS_GEMINI_API_KEY` | Google AI (Gemini) API key for script generation | unset (required) |
| `SHORTSVIDS_GEMINI_MODEL` | Gemini model used for script generation | `gemini-3.6-flash` |
| `SHORTSVIDS_GEMINI_TIMEOUT` | per-call timeout (s) for the Gemini API; generation retries on timeout | `120` |
| `SHORTSVIDS_GEMINI_BASE_URL` | API base URL override | `https://generativelanguage.googleapis.com/v1beta` |
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

1. Open `#/` (Projects screen): the design grid shows real project cards — thumbnails from the frame endpoint, status badges, durations, and edited times. Click "New" (`New Project`) to upload.
2. `#/new` (New Project): drop a real ≥20s spoken-word mp4 → upload completes → the job stream transcribes in ~seconds → navigate to Scripts.
3. `#/project/:id/scripts` (Choose Script): real 3-script cards appear; choose one → opens the Editor.
4. `#/project/:id/editor` (Editor): real preview video plays with captions overlay; trim a cut; reorder; duplicate; delete. Back button returns to Scripts.
5. Open the inspector: edit caption text; pick a font (Arial / OpenSans / Roboto); add a local music track; set volume and ducking on.
6. Confirm captions match the spoken audio (Style A guarantee — captions always reflect real spoken words).
7. Save the snapshot (Inspector Save, Cmd/Ctrl+S, or the WindowChrome Save button) → hard refresh the page → the editor resumes with the saved cuts/font/music.
8. Export to a chosen folder → the dedicated `#/project/:id/export` screen polls the job stream, shows live progress, and on success reveals the folder → a valid 1080x1920 (9:16) H.264 MP4 with burned-in captions and music ducked under speech.
