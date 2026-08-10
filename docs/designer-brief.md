# ShortVidsFactory — Designer Brief

## What the app is
A tool that lets a creator turn any **spoken-word video clip** (interview, podcast, vlog) into a **vertical 9:16 short video** with burned-in captions, music, and trimming. It's a single-user local tool backed by an AI (Gemini) + Whisper transcription pipeline.

## Overall user flow (5 screens)

```
Projects (home)
  → New project  → Upload video → [processing] → Scripts → Editor → Export
```

---

## 1. Projects (Home)
The landing page listing all saved projects.
- Current UI is plain: a page title, a "New project" link, and a plain list of project cards each with a **Continue** button.
- States: **loading**, **error (+ Retry)**, **empty ("No projects yet.")**, **loaded list**.

> Design potential: grid of project cards with thumbnails, last-edited timestamps, status badges.

## 2. Upload / New Project
- Small form: **Project name** (text input) and a **video file** picker (accepts `video/*`).
- On submit → creates project, uploads. Shows a **progress bar** (uploading → processing via live job stream).
- On success it auto-navigates to the Scripts page for that project. States: idle / uploading / processing / error (+ Retry) / done.

> Design potential: a big drag-and-drop dropzone, processing stage with animation/steps ("Uploading → Transcribing → Writing scripts").

## 3. Scripts ("Choose a script")
AI has watched the video and proposes up to **3 short-video scripts** (~15–30s each).
- One card per script showing: a **hook** headline, a **summary** paragraph, and metadata (`words_used · duration`).
- **"Use this"** button per card → approves the script and opens the Editor.
- Card order matters: the first is likely the strongest hook. Auto-loads/generates on entry (loading state); error + Retry.

> Design potential: cards styled like content-idea previews; show the hook big, maybe a fake caption preview to sell the concept.

## 4. Editor (the main screen)
A lightweight video editor. Layout is currently **stacked vertically**; a designer should propose a professional **3-panel layout**:

### a) Preview
- Plays the assembled cut sequence (a server-rendered proxy, 540px wide) **rendered on-the-fly for each change**.
- Shows a **live caption overlay** at the bottom center that appears during each caption's timing.
- Controls: **Play/Pause**, a **scrub timeline slider**, and **time display** (mm:ss / total).
- Notes: fixed 540px width today — vertical 9:16 becomes letterboxed inside that box; design should frame it in a phone aspect ratio.

### b) Timeline
- Each **Cut** is a block whose width is proportional to its duration. Blocks show "Cut N".
- Interactions: **drag to reorder**, drag **left/right edge handles to trim** the start/end of each cut, **click to select**, and **Duplicate/Delete** buttons. Keyboard `Delete` deletes the selected cut.
- Selected cut is highlighted (blue) vs unselected (grey).

### c) Inspector (sidebar)
Three panels:
- **Captions** — list of caption lines per selected cut, each with a text field + remove button, plus "Add caption". Empty state: "Select a cut to edit captions." (Captions are auto-generated from the transcript, so they always match real spoken words.)
- **Font** — dropdown of 3 fonts (Arial, OpenSans, Roboto).
- **Music** — dropdown of local tracks ("None" + list), then controls when a track is picked: **Volume slider**, **"Duck under voice" checkbox**, and "Remove music".
- **Save** button (persists snapshot to disk).

There's also an **ExportBar** below the inspector:
- **Destination folder** text field, **Export** button (disabled until ≥1 cut), a **progress bar with %**, success message + **"Open folder"** button (reveals the file in the OS), and error + Retry.

> Design potential: standard editor layout — left/center preview, center-bottom timeline, right inspector. Keep the export as a footer bar or modal.

## 5. Data model (for understanding what to display)
- **Cut** = a clip from the source video with a `source_start`/`source_end` (seconds) plus its caption lines (`start`, `end`, `text`).
- A saved **Snapshot** stores: `cuts`, optional `music` (track + volume + ducking), `font`, `export_path`.
- Export produces a **1080×1920 H.264 MP4** with burned-in captions and music ducked under speech.

---

