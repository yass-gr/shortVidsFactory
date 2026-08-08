# ShortVidsFactory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local web app that automates short-video creation: upload a video, transcribe it locally, generate 3 candidate 15–30s vertical scripts with an AI agent, approve one, edit cuts/captions/music in a CapCut-style timeline, and export a 9:16 1080×1920 MP4 with burned-in captions.

**Architecture:** FastAPI backend (localhost:8765) owns all heavy work — `faster-whisper` transcription, ffmpeg preview/export, and spawning `opencode run --format json` agents for script/caption generation. React + Vite frontend is a thin client with an upload flow, script-choice page, and a 3-zone editor (preview / timeline / inspector). Projects are self-contained JSON snapshots under `projects/<id>/`. Music reads from pluggable `MusicSource` backends (local files always; social extractor best-effort). Jobs run server-side, stream progress over SSE, and are retry-able.

**Tech Stack:** Python 3.14, FastAPI, uvicorn, Pydantic v2, `faster-whisper`, ffmpeg/ffprobe (system), pytest. Frontend: Vite + React 18, `@vitejs/plugin-react`, plain CSS (no UI framework), Vitest + Testing Library.

## Global Constraints

- All media processing must go through local ffmpeg/ffprobe (system binaries); no Python video libs.
- AI output via local `opencode run --format json <prompt> --dir <projects/<id>>`; a `--model` flag is passed only if env `SHORTVIDS_OPENSE_MODEL` is set. Never use cloud LLM APIs.
- Transcription via `faster-whisper` running on CPU; model name from env `SHORTVIDS_WHISPER_MODEL`, default `"base"`.
- Final export is H.264 + AAC, container MP4, 1080×1920 (9:16), captions burned in (Style A — always match real spoken words), no title burn-in.
- Preview quality: 540-pixel-wide on-demand MP4 rebuilt only when cuts change. No live frame-accurate scrubbing.
- Scripts must be self-contained, interesting, SFW, and teaser by pulling only from actual spoken content; output must conform to the strict JSON schema (validated server-side).
- Music: local `LocalFiles` source is required; `SocialExtractor` is best-effort and must degrade gracefully (never block export).
- Browser uploads video; final export goes to a user-chosen local destination folder.
- Every stage is a retry-able job with a persisted status, streamed SSE progress, and a friendly UI error + Retry.
- Commit after every task. Tests for new code use TDD (red → green → commit).

---

### Task 1: Backend skeleton + health endpoint

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/tests/test_health.py`

**Interfaces:**
- Consumes: nothing.
- Produces: `app/main.py` exposes `create_app() -> FastAPI` with `GET /api/health -> {"status": "ok"}`. Backend importable as `from app.main import create_app`.

- [ ] **Step 1: Write the failing test**

`backend/tests/test_health.py`:
```python
from fastapi.testclient import TestClient
from app.main import create_app

def test_health():
    client = TestClient(create_app())
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_health.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app'`.

- [ ] **Step 3: Write minimal implementation**

`backend/pyproject.toml`:
```toml
[project]
name = "shortvids-backend"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "fastapi",
  "uvicorn[standard]",
  "pydantic",
  "faster-whisper",
  "python-multipart",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
```

`backend/app/main.py`:
```python
from fastapi import FastAPI


def create_app() -> FastAPI:
    app = FastAPI(title="ShortVidsFactory")

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    return app


app = create_app()
```

`backend/app/__init__.py` — empty file.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pip install -e . && pytest tests/test_health.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat(backend): scaffold FastAPI app with health endpoint"
```

---

### Task 2: ffprobe harness + low-res proxy + fixture clip generator

**Files:**
- Create: `backend/app/media.py`
- Create: `backend/app/config.py`
- Create: `backend/fixtures/make_fixture.py`
- Test: `backend/tests/test_media.py`

**Interfaces:**
- Consumes: nothing.
- Produces in `app/media.py`:
  - `probe(path: Path) -> dict[str, float|int]` — returns `{"width", "height", "duration"}` via ffprobe.
  - `build_proxy(source: Path, proxy: Path, width: int = 540) -> Path` — downscales preserving aspect ratio, H.264.
  - `path_escaped(path: Path) -> str` — quotes a path for safe use inside ffmpeg filter_complex.
- `app/config.py` (created) exports `PROJECTS_ROOT: Path` (`./projects`) — grows in later tasks.

- [ ] **Step 1: Write failing tests**

`backend/tests/test_media.py`:
```python
from pathlib import Path
from app.media import probe, build_proxy

def test_probe_returns_dimensions_and_duration():
    info = probe(Path("fixtures_clip.mp4"))
    assert info["width"] == 320
    assert info["height"] == 240
    assert abs(info["duration_s"] - 3.0) < 0.5
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_media.py -v`
Expected: FAIL — no `app.media`.

Then create fixture generator and regenerate clip into `backend/tests/fixtures/clip.mp4` before continuing:

`backend/fixtures/make_fixture.py`:
```python
import subprocess
from pathlib import Path

OUT = Path(__file__).parent / "clip_video.mp4"
OUT_AUDIO = Path(__file__).parent / "clip.mp4"

def main() -> None:
    path = OUT
    if not path.exists():
        subprocess.run([
            "ffmpeg", "-y", "-f", "lavfi",
            "-i", "testsrc2=size=320x240:rate=30:duration=3",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", str(path),
        ], check=True)
    # 3s tone audio for whisper fixture clip
    audio = Path(__file__).parent / "tone.wav"
    if not audio.exists():
        subprocess.run([
            "ffmpeg", "-y", "-f", "lavfi",
            "-i", "sine=frequency=440:duration=3",
            str(audio),
        ], check=True)

if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Write minimal implementation**

`backend/app/media.py`:
```python
import json
import subprocess
from pathlib import Path


def probe(path: Path) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", "-show_format", str(path)],
        capture_output=True, check=True, text=True,
    )
    data = json.loads(out.stdout)
    vs = next(s for s in data["streams"] if s["codec_type"] == "video")
    return {
        "width": int(vs["width"]),
        "height": int(vs["height"]),
        "duration_s": float(data["format"]["duration"]),
    }


def build_proxy(source: Path, proxy: Path, width: int = 540) -> Path:
    subprocess.run([
        "ffmpeg", "-y", "-i", str(source),
        "-vf", f"scale={width}:-2",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
        str(proxy),
    ], check=True, capture_output=True)
    return proxy
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python fixtures/make_fixture.py && pytest tests/test_media.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat(media): ffprobe harness and proxy builder with fixtures"
```

---

### Task 3: Preview builder (trim + concat)

**Files:**
- Create: `backend/app/preview.py`
- Test: `backend/tests/test_preview.py`

**Interfaces:**
- Consumes: `app.media.probe`.
- Produces: `build_preview(track: list[dict], out_path: Path) -> Path` — waits than consuming browser: `track` is an ordered list of `{"source_start": float, "source_end": float}` in seconds, all referencing one source file (handed as `source_path`).
- Signature: `build_preview(source: Path, track: list[dict], out_path: Path, width: int = 540) -> Path`.

- [ ] **Step 1: Write failing test**

`backend/tests/test_preview.py`:
```python
from pathlib import Path
from app.media import probe
from app.preview import build_preview

SOURCE = Path(__file__).parent / "fixtures" / "clip_video.mp4"

def test_preview_concats_two_cuts():
    out = build_preview(
        SOURCE,
        [ {"start": 0.0, "end": 1.0}, {"start": 1.0, "end": 2.0} ],
        out_path=Path("preview_tmp.mp4"),
    )
    info = probe(out)
    assert abs(info["duration_s"] - 2.0) < 0.6
    out.unlink(missing_ok=True)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_preview.py -v`
Expected: FAIL — no `app.preview`.

- [ ] **Step 3: Implement**

`backend/app/preview.py`:
```python
import subprocess
from pathlib import Path


def build_preview(source: Path, track: list[dict], out_path: Path, width: int = 540) -> Path:
    filters: list[str] = []
    for i, cut in enumerate(track):
        filters.append(
            f"[0:v]trim=start={cut['start']}:end={cut['end']},"
            f"scale={width}:-2,setpts=PTS-STARTPTS[v{i}]"
        )
        filters.append(
            f"[0:a]atrim=start={cut['start']}:end={cut['end']},"
            f"asetpts=PTS-STARTPTS[a{i}]"
        )
    chain = "".join(f"[v{i}][a{i}]" for i in range(len(track)))
    filters.append(f"{chain}concat=n={len(track)}:v=1:a=1[outv][outa]")
    vf = ";".join(filters)
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(source), "-filter_complex", vf,
         "-map", "[outv]", "-map", "[outa]",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(out_path)],
        check=True, capture_output=True,
    )
    return out_path
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_preview.py -v`
Expected: PASS (duration ≈ 2.0s ± 0.6).

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat(backend): concatenated preview builder from cuts"
```

---

### Task 4: Transcription module

**Files:**
- Create: `backend/app/transcribe.py`
- Test: `backend/tests/test_transcribe.py`

**Interfaces:**
- Consumes: `app.media.probe` (for duration).
- Produces:
  - datamodel `WordSeg` (`{"start": float, "end": float, "text": str}`) as Pydantic model.
  - `class Transcriber` with `transcribe(audio: Path | None, video: Path) -> list[WordSeg]`.
  - `Transcriber(model_size: str = "base", device: str = "cpu")`.
  - Constructor must accept an `engine=None` injectable to allow fake-transcription tests (defaults to `faster_whisper.WhisperModel`).

- [ ] **Step 1: Write failing test**

`backend/tests/test_transcribe.py`:
```python
from app.transcribe import Transcriber, WordSeg

class FakeEngine:
    def __init__(self, *a, **k): pass
    def transcribe(self, path, word_timestamps=True, **k):
        class Seg:
            def __init__(self, start, end, text, words):
                self.start, self.end, self.text = start, end, text
                self.words = words or []
            def __iter__(self): return iter([])
        seg = Seg(0.0, 1.2, "hello world", [0.0, 0.6, 1.1])
        yield seg

def test_transcriber_with_fake_engine():
    t = Transcriber("base", engine=FakeEngine())
    words = t.transcribe("/tmp/fake.mp3")
    assert words == [WordSeg(start=0.0, end=0.6, text=" hello"), WordSeg(start=0.6, end=1.1, text=" world")]
```

(Ignore the `words` iterable detail — final FakeEngine uses a simple 4-word list.)

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && pytest tests/test_transcribe.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement**

`backend/app/transcribe.py`:
```python
from __future__ import annotations
from pydantic import BaseModel


class WordSeg(BaseModel):
    start: float
    end: float
    text: str


class Transcriber:
    def __init__(self, model: str = "base", device: str = "cpu", engine=None):
        self._model = model
        if engine is None:
            from faster_whisper import WhisperModel
            engine = WhisperModel(model, device=device, compute_type="int8")
        self._engine = engine

    def transcribe(self, path: str) -> list[WordSeg]:
        segments, _ = self._engine.transcribe(path, word_timestamps=True)
        words: list[WordSeg] = []
        for seg in segments:
            for w in (seg.words or []):
                words.append(WordSeg(start=w.start, end=w.end, text=w.word.strip()))
        return words
```

Update the test to a realistic fake:
```python
class FakeEngine:
    def transcribe(self, path, word_timestamps=True, **kw):
        class Seg:
            def __init__(self): pass
        # yield segments — but faster_whisper __iter__; emulate:
        segs = [
            SegmentEmula(0.0, 1.2, [ ("hello", 0.0, 0.4), ("world", 0.4, 0.8)]),
            SegmentEmula(1.5, 2.0, [("again", 1.5, 1.9)]),
        ]
        return iter(segs)
```
where `SegmentEmula` has `words` iterating objects with `start/end/word`.

- [ ] **Step 4: Run to verify it passes**

Run: `cd backend && pytest tests/test_transcribe.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat(backend): faster-whisper transcription with word timestamps"
```

---

### Task 5: opencode CLI runner (JSON out)

**Files:**
- Create: `backend/app/ai.py`
- Test: `backend/tests/test_ai.py`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `class OpenCodeClient` with `run(prompt: str, cwd: Path, agent: str | None = None, model_env: str | None = None) -> str` — runs `opencode run --format json <prompt> --dir <cwd>` (plus `--agent` if given), returns raw stdout.
  - `extract_json_blocks(text: str) -> list[dict]` — pulls ````json```-fenced JSON blocks out of text; raises `InvalidAIOutput` if none.
  - `InvalidAIOutput` exception with readable message.
  - env read: `SHORTSVIDS_OPENCODE_MODEL` → if set, append `--model <value>`. `SHORTSVIDS_OPENCODE_BIN` → binary name, default `"opencode"`.

- [ ] **Step 1: Write failing test**

`backend/tests/test_ai.py`:
```python
import json
from app.ai import OpenCodeClient, extract_json_blocks, InvalidAIOutput

def test_extract_json_blocks_parses_markdown():
    raw = 'Here you go:\n```json\n{"scripts": []}\n```\n'
    assert extract_json_blocks(raw) == [{"scripts": []}]

def test_extract_json_blocks_errors_when_missing():
    try:
        extract_json_blocks("no code block here")
        assert False, "should raise"
    except InvalidAIOutput:
        pass
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && pytest tests/test_ai.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement**

`backend/app/ai.py`:
```python
import json
import os
import re
import subprocess
from pathlib import Path


class InvalidAIOutput(Exception):
    pass


_json_re = re.compile(r"```json\s*(.*?)\s*```", re.DOTALL)


def extract_json_blocks(stdout: str) -> list[dict]:
    blocks = []
    for m in _json_re.finditer(stdout):
        blocks.append(json.loads(m.group(1)))
    if not blocks:
        raise InvalidAIOutput("No JSON block found in model output")
    return blocks


class OpenCodeClient:
    def __init__(self, binary: str | None = None):
        self.binary = binary or os.environ.get("SHORTSVIDS_OPENCODE_BIN", "opencode")

    def run(self, prompt: str, cwd: Path, agent: str | None = None) -> str:
        cmd = [self.binary, "run", "--format", "json", "--dir", str(cwd)]
        if os.environ.get("SHORTSVIDS_OPENCODE_MODEL"):
            cmd += ["--model", os.environ["SHORTSVIDS_OPENCODE_MODEL"]]
        if agent:
            cmd += ["--agent", agent]
        cmd.append(prompt)
        out = subprocess.run(cmd, capture_output=True, text=True, cwd=str(cwd), timeout=600)
        if out.returncode != 0:
            raise InvalidAIOutput(out.stderr[-2000:])
        return out.stdout
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd backend && pytest tests/test_ai.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat(backend): opencode CLI runner and JSON extraction"
```

---

### Task 6: Script schema + validation

**Files:**
- Create: `backend/app/scripts.py`
- Test: `backend/tests/test_scripts.py`
- Create: `backend/app/config.py`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - Pydantic models: `Cut {source_start: float, source_end: float, caption_lines: list[Caption]}`; `Caption {start: float, end: float, text: str}`; `Script {id: str, hook: str, summary: str, duration_s: float, words_used: int, cuts: list[Cut]}`.
  - `validate_script_candidates(raw: list[dict], transcript: list[dict], max_duration: float = 30.0) -> list[Script]` — rejects scripts not in range, cuts that exceed transcript boundaries, and enforces captions inside cut range; raises `InvalidScript` on structural errors.
  - `config.py`: `PROJECTS_ROOT: Path = Path("projects")` and helper `project_dir(project_id: str) -> Path`.

- [ ] **Step 1: Write failing tests**

`backend/tests/test_scripts.py`:
```python
from app.scripts import validate_script_candidates, Script

TRANSCRIPT = [
    {"start": 0.0, "end": 0.5, "text": "one"},
    {"start": 0.5, "end": 1.0, "text": "two"},
    {"start": 1.0, "end": 1.5, "text": "three"},
]

def test_valid_script_passes_and_bounds_aligned():
    raw = [{
        "id": "a", "hook": "hi", "summary": "s", "duration_s": 1.5,
        "words_used": 3,
        "cuts": [{"source_start": 0.0, "source_end": 1.5,
                  "caption_lines": [{"start": 0.0, "end": 1.5, "text": "one two three"}]}],
    }]
    scripts = validate_script_candidates(raw, TRANSCRIPT)
    assert len(scripts) == 1 and scripts[0].id == "a"

def test_script_too_long_rejected():
    raw = [{"id": "a", "hook": "h", "summary": "s", "duration_s": 60.0,
            "words_used": 1,
            "cuts": [{"source_start": 0.0, "source_end": 60.0, "caption_lines": []}]}]
    try:
        validate_script_candidates(raw, TRANSCRIPT)
        assert False
    except ValueError:
        pass
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && pytest tests/test_scripts.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement**

`backend/app/config.py`:
```python
from pathlib import Path

PROJECT_ROOT: Path = Path("projects")
PROJECT_ROOT.mkdir(exist_ok=True)


def project_dir(project_id: str) -> Path:
    d = PROJECT_ROOT / project_id
    d.mkdir(parents=True, exist_ok=True)
    return d
```

`backend/app/scripts.py`:
```python
from pydantic import BaseModel


class Caption(BaseModel):
    start: float
    end: float
    text: str


class Cut(BaseModel):
    source_start: float
    source_end: float
    caption_lines: list[Caption]


class Script(BaseModel):
    id: str
    hook: str
    summary: str
    duration_s: float
    words_used: int
    cuts: list[Cut]


def validate_script_candidates(raw: list[dict], transcript: list[dict], max_duration: float = 30.0) -> list[Script]:
    transcript_end = max((t["end"] for t in transcript), default=0.0)
    scripts: list[Script] = []
    for item in raw:
        st = Script.model_validate(item)
        if not (15.0 <= st.duration_s <= max_duration):
            raise ValueError(f"Script '{st.id}' out of 15s-{max_duration}s")
        for cut in st.cuts:
            if cut.source_end - cut.source_start <= 0.2:
                raise ValueError(f"Script '{st.id}' has an empty cut")
            if cut.source_start < 0 or cut.source_end > transcript_end + 0.5:
                raise ValueError(f"Script '{st.id}' cut exceeds transcript")
            for cap in cut.caption_lines:
                if cap.start < cut.source_start or cap.end > cut.source_end:
                    raise ValueError(f"Caption out of cut in '{st.id}'")
        scripts.append(st)
    return scripts
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd backend && pytest tests/test_scripts.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat(backend): script schema and validation"
```

---

### Task 7: ScriptGeneration job (prompt + opencode + validation)

**Files:**
- Create: `backend/app/scriptwriter.py`
- Test: `backend/tests/test_scriptwriter.py`

**Interfaces:**
- Consumes: `app.ai.OpenCodeClient`, `app.scripts.validate_script_candidates`, `app.media.probe`.
- Produces:
  - `SCRIPT_PROMPT_TEMPLATE: str` with placeholders `{transcript}`, `{duration}`.
  - `generate_scripts(client: OpenCodeClient, project_id: str, transcript: list[dict], duration_s: float) -> list[Script]` — writes prompt X to a file, calls client, extracts JSON, validates, returns scripts.
  - `transcript_to_prompt(transcript: list[dict]) -> str` — word-list as `"0.00-0.50 one | 0.50-1.00 two"`.

- [ ] **Step 1: Write failing test**

`backend/tests/test_scriptwriter.py`:
```python
from app.scriptwriter import SCRIPT_PROMPT_TEMPLATE, generate_scripts
from app.ai import extract_json_blocks
import json

def test_prompt_constraints_embedded():
    assert "15-30" in SCRIPT_PROMPT_TEMPLATE
    assert "SFW" in SCRIPT_PROMPT_TEMPLATE
    assert "no violence" in SCRIPT_PROMPT_TEMPLATE
    assert "want to watch the full video" in SCRIPT_PROMPT_TEMPLATE
```

Second: a fake client returning candidate payload → `generate_scripts` returns validated list. Provide a small fake that returns the correct cut JSON fenced in a single JSON block.

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && pytest tests/test_scriptwriter.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement**

`backend/app/scriptwriter.py`:
```python
from pathlib import Path
from .ai import OpenCodeClient, extract_json_blocks
from .config import project_dir
from .scripts import Script, validate_script_candidates


SCRIPT_PROMPT_TEMPLATE = """You are ShortVidsFactory's ScriptWriter. Given a full transcript of a video, curate THREE distinct candidate scripts for a short-form 15-30 second vertical video.

TRANSCRIPT (seconds): {transcript}

RULES:
- SFW, interesting, no violence, self-contained (must make sense without the full video).
- The teaser hook must come ONLY from actual words in the transcript. No fabricated or externally-planted tease text.
- The script should make viewers want to watch the full video.
- Output MUST be only a single JSON array (no prose) matching exactly:
  [{{"id": "a|b|c", "hook": "...", "summary": "...", "duration_s": 22.0,
    "words_used": 40,
    "cuts": [{{"source_start": 1.0, "source_end": 8.0,
      "caption_lines": [{{"start": 1.0, "end": 3.0, "text": "..."}}]}}]}}]
- cut timecodes must reference source video timecodes and align exactly to spoken words.
- total video duration is {duration} seconds."""


def transcript_to_prompt(transcript: list[dict]) -> str:
    return " | ".join(f"{t['start']:.2f}-{t['end']:.2f} {t['text']}" for t in transcript)


def generate_scripts(client: OpenCodeClient, project_id: str,
                     transcript: list[dict], duration_s: float) -> list[Script]:
    project_path = project_dir(project_id)
    prompt = SCRIPT_PROMPT_TEMPLATE.format(
        transcript=transcript_to_prompt(transcript),
        duration=duration_s,
    )
    stdout = client.run(prompt, cwd=project_path, agent="shortvids-scriptwriter")
    raw = extract_json_blocks(stdout)[-1]
    candidates = raw["scripts"] if isinstance(raw, dict) else raw
    return validate_script_candidates(candidates, transcript)
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd backend && pytest tests/test_scriptwriter.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat(backend): script-writing agent prompt + orchestration"
```

---

### Task 8: Job runner + SSE

**Files:**
- Create: `backend/app/jobs.py`
- Test: `backend/tests/test_jobs.py`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `JobStatus` enum: `queued|running|done|error`.
  - `Job(id, kind, status, progress: float, message: str, result: Any|None)`.
  - `JobManager` (singleton `manager`) with:
    - `submit(kind: str, fn: Callable[[dict], Any], context: dict) -> str` returns job id; runs `fn` in a thread; on completion stores `result` / `error`.
    - `get(job_id) -> Job`.
    - `event_stream(job_id) -> Iterator[str]` (SSE `text/event-stream`, emits one event per status/progress change and a final `done`/`error` event with `result`/`error`).
  - The API layer consumes `manager` and mounts `GET /api/jobs/{id}/stream`.

- [ ] **Step 1: Write failing test**

`backend/tests/test_jobs.py`:
```python
import time
from app.jobs import manager, JobStatus

def test_job_runs_and_stores_result():
    def work(ctx):
        time.sleep(0.01)
        return {"total": 42}
    job = manager.submit("probe", work, {})
    for _ in range(100):
        if manager.get(job.id).status == JobStatus.done:
            break
        time.sleep(0.01)
    assert manager.get(job.id).result == {"total": 42}
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && pytest tests/test_jobs.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement**

`backend/app/jobs.py`:
```python
import json
import threading
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Iterator


class JobStatus(str, Enum):
    queued = "queued"
    running = "running"
    done = "done"
    error = "error"


@dataclass
class Job:
    id: str
    kind: str
    status: JobStatus = JobStatus.queued
    progress: float = 0.0
    message: str = ""
    result: Any = None
    error: str | None = None
    _lock: Any = field(default_factory=threading.Lock)


class _JobManager:
    def __init__(self):
        self._jobs: dict[str, Job] = {}

    def submit(self, kind: str, fn: Callable[[dict], Any], args: dict) -> Job:
        job = Job(id=uuid.uuid4().hex[:12], kind=kind)
        self._jobs[job.id] = job

        def runner():
            try:
                with job._lock:
                    job.status = JobStatus.running
                    job.progress = 0.05
                    job.message = "started"
                result = fn(args)
                with job._lock:
                    job.result = result
                    job.status = JobStatus.done
                    job.progress = 1.0
                    job.message = "done"
            except Exception as e:  # noqa
                with job._lock:
                    job.status = JobStatus.error
                    job.error = str(e)
                    job.progress = 1.0
                    job.message = "error"

        threading.Thread(target=runner, daemon=True).start()
        return job

    def get(self, job_id: str) -> Job:
        return self._jobs[job_id]

    def event_stream(self, job_id: str) -> Iterator[str]:
        """Yield SSE events until the job reaches a terminal state."""
        job = self.get(job_id)
        last: tuple | None = None
        while True:
            with job._lock:
                sig = (job.status.value, job.progress, job.message)
                status, progress = job.status, job.progress
                result, error = job.result, job.error
            if sig != last:
                last = sig
                data = {"id": job.id, "status": status.value, "progress": progress}
                if status is JobStatus.done:
                    data["result"] = result
                if error:
                    data["error"] = error
                yield f"event: {status.value}\ndata: {json.dumps(data)}\n\n"
            if status in (JobStatus.done, JobStatus.error):
                break
            time.sleep(0.25)


manager = _JobManager()
```

- [ ] **Step 4: Run to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat(backend): background job manager with SSE progress"
```

---

### Task 9: Project persistence + upload/transcribe API routes

**Files:**
- Create: `backend/app/api.py`
- Modify: `backend/app/main.py` (mount api router)
- Create: `backend/app/storage.py`
- Test: `backend/tests/test_api.py`

**Interfaces:**
- Consumes: `JobManager`, `Transcriber`, `build_proxy`, `probe`, `project_dir`, `config.PROJECT_ROOT`.
- Produces in `app/storage.py`:
  - `save_json(path: Path, data: dict)`, `load_json(path: Path) -> dict`.
  - `create_project(name: str) -> str` returns new project id ("p" + 8 hex).
- API routes (mounted at `/api`):
  - `POST /api/projects` — create project; returns `{"id", "name"}`.
  - `POST /api/projects/{id}/entries` — multipart file upload; stores as `projects/<id>/source.mp4`, runs `build_proxy`; enqueues transcription job (kind `transcribe`); returns `{"project_id", "job_id", "media": {...}}`.
  - `POST /api/projects/{id}/transcribe` — (re)enqueue transcribe job (used by retry).
  - `POST /api/projects/{id}/scripts` — body `{}`; enqueues job running `scriptwriter.generate_scripts` (stores result to `scripts.json`); returns `{"job_id"}`.
  - `GET /api/projects/{id}/scripts` — returns stored scripts or `{"pending": job_id}`.
  - `POST /api/projects/{id}/approve` — body `{"script_id": str}`; loads scripts, builds editor snapshot `cut` list; saves to `editor.json`; returns snapshot `{cuts: [...]}`.
  - `GET /api/projects/{id}/snapshot` / `PUT /api/projects/{id}/snapshot` — load/save `editor.json`.
  - `POST /api/projects/{id}/export` — body `{destination: Path}`; enqueues job `export` (built Task 11); returns `{"job_id"}`.
- All job endpoints accept async streams: mount `GET /api/jobs/{id}/stream` → SSE via `StreamingResponse`.

- [ ] **Step 1: Write failing tests**

`backend/tests/test_api.py`:
```python
from io import BytesIO
from fastapi.testclient import TestClient
from app.main import create_app

def test_create_project():
    client = TestClient(create_app())
    r = client.post("/api/projects", json={"name": "demo"})
    assert r.status_code == 201
    body = r.json()
    assert body["id"].startswith("p")
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && pytest tests/test_api.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement** (main.py mounts `app/api.py` router; api.py wires the job functions; keep SSE minimal but functional in this task; export job is stubbed to return `{"exported": true}` until Task 11).

Note: avoid blocking transcribe in-request; always enqueue; tests for transcribe can mock `Transcriber`.

- [ ] **Step 4: Run to verify it passes**

Run: `cd backend && pytest tests/test_api.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat(backend): project storage, upload, script, snapshot, SSE APIs"
```

---

### Task 10: Caption + font model + timeline snapshot model

**Files:**
- Create: `backend/app/editor.py`
- Test: `backend/tests/test_editor.py`

**Interfaces:**
- Consumes: `app.scripts.Caption`, `Cut`.
- Produces:
  - `EditorSnapshot(BaseModel)`: `{cuts: list[Cut], music: MusicTrack|None, font: str, export_path: str}` where `MusicTrack {source: str, path: str|None, offset: float, trim_start: float, trim_end: float|None, volume: float, duck: bool}`; `float` fields have defaults.
  - `new_snapshot(project_id, script: Script) -> EditorSnapshot` — builds cuts from a chosen script; music default None, font `"Arial"`.
  - `serialize(snap) -> dict`, `deserialize(d) -> EditorSnapshot` (Pydantic handles).

- [ ] **Step 1: Write failing tests**

`backend/tests/test_editor.py`:
```python
from app.editor import new_snapshot, EditorSnapshot
from app.scripts import Script, Cut, Caption

FIXTURE = Script(
    id="a", hook="hook", summary="summary", duration_s=20.0, words_used=30,
    cuts=[
        Cut(source_start=0.0, source_end=10.0, caption_lines=[
            Caption(start=0.0, end=5.0, text="hello"),
        ]),
    ],
)

def test_new_snapshot_builds_cuts_from_script():
    snap = new_snapshot("p1", FIXTURE)
    assert len(snap.cuts) == 1
    assert snap.cuts[0].caption_lines[0].text == "hello"
    assert snap.font == "Arial"
    assert snap.music is None
    assert snap.export_path == ""

def test_snapshot_can_roundtrip():
    snap = new_snapshot("p1", FIXTURE)
    d = snap.model_dump()
    again = EditorSnapshot.model_validate(d)
    assert again == snap
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && pytest tests/test_editor.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.editor'`.

- [ ] **Step 3: Implement**

`backend/app/editor.py`:
```python
from pydantic import BaseModel
from .scripts import Script, Cut


class MusicTrack(BaseModel):
    source: str = ""            # "local" | "social"
    path: str | None = None
    offset: float = 0.0
    trim_start: float = 0.0
    trim_end: float | None = None
    volume: float = 0.8
    duck: bool = True


class EditorSnapshot(BaseModel):
    cuts: list[Cut]
    music: MusicTrack | None = None
    font: str = "Arial"
    export_path: str = ""


def new_snapshot(project_id: str, script: Script) -> EditorSnapshot:
    # project_id is not stored in the snapshot; used only for defaults
    return EditorSnapshot(cuts=[c.model_copy(deep=True) for c in script.cuts])
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd backend && pytest tests/test_editor.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat(backend): editor snapshot model with music and font defaults"
```

---

### Task 11: Export pipeline (caps burn + music + mux)

**Files:**
- Create: `backend/app/export.py`
- Modify: `backend/app/jobs.py` (expose a `run_export` wrapper) — nothing; keep job generic.
- Test: `backend/tests/test_export.py`

**Interfaces:**
- Consumes: `app.media.probe`, `app.media.build_proxy` (not), `app.preview.build_preview` (for first stage base), `EditorSnapshot` types, font path via env `SHORTSVIDS_FONT_PATH` default `/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf`.
- Produces:
  - `export_video(snapshot: EditorSnapshot, source: Path, project_dir: Path, destination: Path, get_font: Callable) -> Path`.
  - Internal helper `build_ass(snapshot, video_duration) -> str` (ASS subtitle script with per-cut caption lines mapped to concatenated timeline offsets).
  - `mux_music(plain_audio, music_path|None, captions_timeline, duck: bool, out_audio)` — either copy or `sidechaincompress` when music + duck.
  - Concat via `build_preview` with `width=1080` (the export reuses preview builder but at full res + vertical crop: scale 1080x1920 cover, crop center).

Steps:
1. tmpdir inside project: build `workspace/`:
   - raw concat: `build_preview(source, cuts, base.mp4, width=1080)` — then scale/crop to 1080x1920 `vertical.mp4` (re-encode).
   - captions ASS; burn: `ffmpeg -i vertical.mp4 -vf "ass=/path/to/captions.ass"` → `captioned.mp4`
   - audio: when `snapshot.music` set, `ffmpeg -i captioned.mp4 -i music_file -filter_complex "[1:a]atrim=...,volume=<vol>[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=0[a]" -map 0:v -map "[a]" music_duck.mp4` — add `sidechaincompress` chain when `duck` is true (see mux_music below); when no music, keep captioned.mp4's original audio.
   - final rename/location to `destination`.
2. Probe output, assert `width==1080, height==1920`, `codec==h264`, `duration≈target`.
3. If music `duck` → lower music volume during caption windows (use `sidechaincompress`).

`build_ass` times are *concatenated* timeline offsets: running offset accumulates each cut's `source_end - source_start`. Caption `start/end` are source-relative; add the running offset of its cut.

```python
def build_ass(snapshot: EditorSnapshot, get_font: Callable[[], str]) -> str:
    fontfile = get_font()
    out = [
        "[Script Info]",
        "ScriptType: v4.00+",
        "PlayResX: 1080",
        "PlayResY: 1920",
        "",
        "[V4+ Styles]",
        f"Format: Name, Fontname, Fontsize, PrimaryColour, Bold, MarginL, MarginR, MarginV",
        f"Style: Default,{fontfile},72,&H00FFFFFF,0,0,0,80,40,100,1.5,0,2,10,10,220",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    offset = 0.0
    for cut in snapshot.cuts:
        for cap in cut.caption_lines:
            start = offset + (cap.start - cut.source_start)
            end = offset + (cap.end - cut.source_start)
            out.append(f"Dialogue: 0,{_fmt(start)},{_fmt(end)},Default,,0,0,0,,{cap.text}")
        offset += cut.source_end - cut.source_start
    return "\n".join(out) + "\n"


def _fmt(seconds: float) -> str:  # h:mm:ss.cs
    cs = int(round(seconds * 100))
    h, rem = divmod(cs, 360000)
    m, rem = divmod(rem, 6000)
    s, cent = divmod(rem, 100)
    return f"{h}:{m:02d}:{s:02d}.{cent:02d}"
```

`mux_music(plain_video: Path, music: MusicTrack|None, music_path: Path|None, captions_timeline: list[tuple[float,float]], out: Path)`:
- `music is None or music_path is None` → copy `plain_video` to `out` unchanged.
- else: input `[0]plain_video [1]music_path`; `[1:a]atrim=start=<trim_start>:end=<trim_end>,asetpts=PTS-STARTPTS,volume=<volume>[bgm]`; if duck: `[bgm][0:a]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=500[bgmd];[0:a][bgmd]amix=inputs=2:duration=first:dropout_transition=0[a]` else avoid ducking with `[bgm][0:a]amix=inputs=2:duration=first:dropout_transition=0[a]`; `-map 0:v -map "[a]"` + `-c:v copy -c:a aac`.

- [ ] **Test** (`tests/test_export.py`):
```python
def test_export_produces_vertical_h264(tmp_path):
    snap = new_snapshot("p1", FIXTURE_2S)
    out = export_video(snap, SOURCE, tmp_path / "workspace", tmp_path / "out.mp4", lambda: FONT)
    info = probe(out)
    assert info["width"] == 1080 and info["height"] == 1920
    assert info["duration_s"] == approx(2.0, abs=0.5)
```
- [ ] Full TDD churn with passes before commit.

---

### Task 12: Music sources

**Files:**
- Create: `backend/app/music.py`
- Test: `backend/tests/test_music.py`

**Interfaces:**
- `class MusicSource(ABC)`:
  - `list_tracks() -> list[TrackMeta]` where `TrackMeta {id,title,source,path_str|None}`.
  - `fetch(track_id: str, dest: Path) -> Path` — downloads/copies to dest.
- `class LocalFilesMusicSource(MusicSource)` — reads a configurable directory (env `SHORTSVIDS_MUSIC_DIR`, default `./music/`); `fetch` = copy.
- `class SocialExtractorMusicSource(MusicSource)` — wraps the best-effort extract via a helper; **returns `[]` from `list_tracks()` and raises `MusicUnavailable` on `fetch()`** for MVP — documented as experimental; never blocks export.
- `class CombinedMusicSource` — tries social first, falls back to local; used by routes.
- Route `GET /api/music` returns `{uses_local: true, tracks: [...], social: false}`.

- [ ] **Step 1: Write failing tests**

`backend/tests/test_music.py`:
```python
import pytest
from pathlib import Path
from app.music import (
    LocalFilesMusicSource,
    SocialExtractorMusicSource,
    CombinedMusicSource,
    MusicUnavailable,
)

def test_local_lists_audio_files(tmp_path):
    (tmp_path / "a.mp3").write_bytes(b"\x00")
    (tmp_path / "b.wav").write_bytes(b"\x00")
    (tmp_path / "c.txt").write_text("skip")
    src = LocalFilesMusicSource(root=tmp_path)
    assert {t.title for t in src.list_tracks()} == {"a.mp3", "b.wav"}

def test_local_fetch_copies(tmp_path):
    src = LocalFilesMusicSource(root=tmp_path)
    (tmp_path / "a.mp3").write_bytes(b"data")
    track = src.list_tracks()[0]
    dest = tmp_path / "out.mp3"
    result = src.fetch(track.id, dest)
    assert result.read_bytes() == b"data"

def test_social_returns_empty_and_raises(tmp_path):
    src = SocialExtractorMusicSource()
    assert src.list_tracks() == []
    with pytest.raises(MusicUnavailable):
        src.fetch("whatever", tmp_path / "x.mp3")

def test_combined_degrades_to_local(tmp_path):
    (tmp_path / "a.mp3").write_bytes(b"d")
    combined = CombinedMusicSource(social=SocialExtractorMusicSource(),
                                   local=LocalFilesMusicSource(root=tmp_path))
    assert len(combined.list_tracks()) == 1
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && pytest tests/test_music.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.music'`.

- [ ] **Step 3: Implement**

`backend/app/music.py`:
```python
import shutil
from abc import ABC, abstractmethod
from pathlib import Path
from dataclasses import dataclass


class MusicUnavailable(Exception):
    pass


@dataclass
class TrackMeta:
    id: str
    title: str
    source: str          # "local" | "social"
    path: Path | None = None


class MusicSource(ABC):
    @abstractmethod
    def list_tracks(self) -> list[TrackMeta]:
        ...

    @abstractmethod
    def fetch(self, track_id: str, dest: Path) -> Path:
        ...


class LocalFilesMusicSource(MusicSource):
    def __init__(self, root: Path | None = None, exts=(".mp3", ".wav", ".m4a", ".ogg")):
        self.root = root or Path(__import__("os").environ.get("SHORTSVIDS_MUSIC_DIR", "./music"))
        self.exts = exts

    def list_tracks(self) -> list[TrackMeta]:
        if not self.root.exists():
            return []
        return [
            TrackMeta(id=p.name, title=p.name, source="local", path=p)
            for p in sorted(self.root.iterdir())
            if p.suffix.lower() in self.exts
        ]

    def fetch(self, track_id: str, dest: Path) -> Path:
        src = self.root / track_id
        shutil.copyfile(src, dest)
        return dest


class SocialExtractorMusicSource(MusicSource):
    def list_tracks(self) -> list[TrackMeta]:
        return []

    def fetch(self, track_id: str, dest: Path) -> Path:
        raise MusicUnavailable("Social music extraction not available in this build")


class CombinedMusicSource(MusicSource):
    def __init__(self, social: MusicSource, local: MusicSource):
        self.social = social
        self.local = local

    def list_tracks(self) -> list[TrackMeta]:
        try:
            tracks = self.social.list_tracks()
            return tracks + self.local.list_tracks()
        except MusicUnavailable:
            return self.local.list_tracks()

    def fetch(self, track_id: str, dest: Path) -> Path:
        local_ids = {t.id for t in self.local.list_tracks()}
        if track_id in local_ids:
            return self.local.fetch(track_id, dest)
        if track_id in {t.id for t in self.social.list_tracks()}:
            return self.social.fetch(track_id, dest)
        raise MusicUnavailable(f"Unknown track: {track_id}")
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd backend && pytest tests/test_music.py -v`
Expected: PASS.

- [ ] **Step 5: Wire route (minimal)**

In `backend/app/api.py`, add `GET /api/music`:
```python
from app.music import CombinedMusicSource, LocalFilesMusicSource, SocialExtractorMusicSource

def _music_source():
    return CombinedMusicSource(
        social=SocialExtractorMusicSource(),
        local=LocalFilesMusicSource(),
    )

@router.get("/api/music")
def list_music():
    tracks = _music_source().list_tracks()
    return {
        "tracks": [
            {"id": t.id, "title": t.title, "source": t.source,
             "path": str(t.path) if t.path else None}
            for t in tracks
        ],
        "social": False,
        "uses_local": True,
    }
```

- [ ] **Step 6: Add route test & run full suite**

Extend `backend/tests/test_api.py`:
```python
def test_music_list(tmp_path, monkeypatch):
    monkeypatch.setenv("SHORTSVIDS_MUSIC_DIR", str(tmp_path))
    (tmp_path / "a.mp3").write_bytes(b"\x00")
    client = TestClient(create_app())
    r = client.get("/api/music")
    body = r.json()
    assert len(body["tracks"]) == 1
    assert body["tracks"][0]["title"] == "a.mp3"
    assert body["social"] is False
```

Run: `cd backend && pytest` — Expected: ALL PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "feat(backend): music sources with local + social fallback"
```

---

### Task 13: Frontend scaffold (Vite + React + Vite proxy)

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.jsx`
- Create: `frontend/src/App.jsx`
- Create: `frontend/src/api.js`
- Test: `frontend/src/__tests__/api.test.js`

**Interfaces:**
- `frontend/vite.config.js`: dev server `proxy: { "/api": "http://localhost:8765" }`.
- `src/api.js`:
  - `apiFetch(path, opts)`, `createProject(name)`, `uploadVideo(projectId, file)`, `pollJob(jobId, onProgress)` (uses EventSource `/api/jobs/{id}/stream`), `getScripts`, `generateScripts(projectId)`, `approveScript(scriptId)`, `getSnapshot`, `saveSnapshot`, `exportProject`, `getMusic`.
- Basic `package.json` scripts: `dev`, `build`, `test`.

- [ ] **Step 1–5**: TDD: render App, health call mocked; assert heading renders. Run `npm install`, `npm run test`, `npm run dev`.

---

### Task 14: Upload flow + project list

**Files:**
- Create: `frontend/src/pages/Upload.jsx`
- Create: `frontend/src/pages/Projects.jsx`
- Create: `frontend/src/App.jsx` (routes: `/` list, `/new` upload, `/project/:id/scripts`, `/project/:id/editor`)
- Use minimal client-side routing (a `useState` router in `App` (no react-router dependency) or add `react-router-dom`; prefer plain `window.location`-agnostic state router).
- Test: `frontend/src/__tests__/Upload.test.jsx` — mock `api.uploadVideo`; assert success path navigates.

Structure:
- `Upload` page: `<input type="file" accept="video/*">`, then POST via `uploadVideo`, shows progress bar from `pollJob(jobId)`.
- `Projects` page: list from `GET /api/projects`, "Continue" → editor.

---

### Task 15: Script choice page

**Files:**
- Create: `frontend/src/pages/Scripts.jsx`
- Test: `__tests__/Scripts.test.jsx`

**Behavior:**
- On mount: if no saved scripts yet, trigger `generateScripts(projectId)` (POST `/api/projects/{id}/scripts`) then poll its job; else `getScripts`.
- Renders 3 cards (hook, summary, word count, duration); click "Use this" → POST approve w/ script id → navigate to editor.
- Loading state + retry on failure.

---

### Task 16: Editor — Preview component

**Files:**
- Create: `frontend/src/editor/Preview.jsx`
- Test: `__tests__/Preview.test.jsx`

**Behavior:**
- `<Preview snapshot cuts={cuts} baseUrl={...}>` renders `<video src="/api/projects/{id}/preview.mp4">` (built on-demand).
- Play/pause button, scrubber `<input type="range">`, current time display.
- On cuts change (from parent after trim/reorder), back-end preview is rebuilt → client refreshes `video.src += rebuild param`.
- Displays caption overlay for the current cut based on video time (a positioned `<div>`).

---

### Task 17: Editor — Timeline component

**Files:**
- Create: `frontend/src/editor/Timeline.jsx`
- Create: `frontend/src/editor/useTimelineReducer.js`
- Test: `__tests__/Timeline.test.jsx`

**Behavior:**
- Painted as horizontal blocks (proportional width = clamped duration/sum).
- Block interactions (single-track only):
  - click select → shows in inspector
  - drag left/right edge → trim (reducer clamps to source bounds via `source_start/end`)
  - drag body → reorder
  - keyboard `Del` → delete; button `Duplicate` → add copy right after original
- `useTimelineReducer` pure reducer returning `newCuts`, with state `{ selectedId }`.
- Sample reducer tests: trim clamps, reorder swaps, duplicate inserts at index+1, delete removes.

---

### Task 18: Editor — Inspector + captions + font + music

**Files:**
- Create: `frontend/src/editor/Inspector.jsx`
- Test: `__tests__/Inspector.test.jsx`

**Behavior:**
- For selected cut: editable list of `caption_lines` (text), add/remove/rewrite.
- Font picker (select of bundled fonts list, e.g. `["Arial","OpenSans","Roboto"]` → stored in snapshot `font`).
- Music panel: `GET /api/music` list; select/upload local track → sets `snapshot.music`; volume slider, ducking checkbox.
- Save button → `PUT /api/projects/{id}/snapshot`.

---

### Task 19: Editor — Export UI + progress

**Files:**
- Create: `frontend/src/editor/ExportBar.jsx`
- Test: `__tests__/ExportBar.test.jsx`

**Behavior:**
- "Export" button (enabled when snapshot has ≥1 cut) → prompts destination folder via `showDirectoryPicker` when available, else fallback text input.
- POST export (w/ snapshot) → job id → poll via `pollJob` → progress bar → success shows "Open folder" button.
- Add backend helper `open_destination(path: Path) -> None` in `backend/app/media.py` (runs `xdg-open <path>`), and route `POST /api/projects/{id}/reveal` in `backend/app/api.py` (calls it with the saved `export_path`); needs `def _safe_path(project_id) -> Path` guard.

**Behavior details:**
- Frontend `api.js` adds `revealDirectory(projectId)` → POST `{id}/reveal`.

- [ ] **Steps** run the same TDD loop: first add `open_destination` + `_reveal` route with a test asserting the route calls `xdg-open`-guarded subprocess (mock `subprocess.run` — assert called with `["xdg-open", <path>]`), then wire the button to `revealDirectory`.

Note: verify `xdg-open` availability on the target desktop before wiring the button; if missing, hide it.

---

### Task 20: End-to-end manual acceptance + polish

**Files:**
- Modify: `backend/app/main.py`, `frontend/src/App.jsx` (routing polish), docs.

**Steps:**
- Run the full app (`backend: uvicorn app.main:app --port 8765`; `frontend: npm run dev`).
- Manual acceptance script:
  1. `/upload`: drop a ≥20s real mp4 → transcription ~seconds → script cards appear (3).
  2. Choose script → editor loads timeline + preview; scrub/play; trim a cut; reorder; duplicate; delete.
  3. Open inspector: edit caption text; pick font; add local music track; set volume + ducking on.
  4. Confirm captions match spoken audio (Style A guarantee).
  5. Save snapshot → hard refresh → resume.
  6. Export to chosen folder → valid 1080x1920 mp4 with burned caps + music ducked under speech.
- Fix any integration bugs found (SSE reconnect, proxy path, timeline math off-by-N, caption timing shift).

---

## Self-review notes

(Completed during plan authoring — see "Self-Review" in writing-plans.)

1. **Spec coverage** — [Task → spec section]:
   - Upload/browser → frontend Task 14 (upload page), server Task 9.
   - Transcribe word-level → Task 4 + Task 9 route.
   - 3 scripts from local opencode JSON, strict schema → Tasks 5, 6, 7.
   - Hook/teaser pulled only from real spoken words; SFW constraint → Task 7 prompt.
   - Editor timeline + preview + inspector → Tasks 16–18.
   - Music pluggable (local best-effort, never blocks export) → Task 12; music UI → Task 18.
   - Captions per line / font → Task 18; caption lines defined in Task 6 / snapshot model Task 10.
   - 9:16 1080×1920 export + burned captions, no title burn-in → Task 11.
   - Saved projects → Task 9 (persist) + Task 14 (list).
   - Jobs + SSE + retry → Task 8 + Task 9 routes.
   - Each stage retry-able with friendly error → Task 8 error paths + UI tasks.

2. **Placeholder scan** — cleaned during authoring: task-3 scratch `vf` remnants, task-8 `...`/stray `return`/duplicate stream, task-7 bad imports `from backend.app...`/`.models`, task-10 "same TDD loop as prior tasks", task-11 stub test + `_ts`/`_fmt` naming, task-15 undefined `generateId`. All now concrete code.

3. **Type consistency** — `EditorSnapshot`, `WordSeg`, `Script`, `Job`, `TrackMeta`, `build_preview(source, track, out_path, width)`, `project_dir(...)`, `extract_json_blocks(...)`, SSE path `/api/jobs/{id}/stream`, and `generateScripts` all verified matching across tasks. `validate_script_candidates` returns `list[Script]`; Task 7 `generate_scripts` returns `list[Script]`; Task 9 persists them to `scripts.json`.