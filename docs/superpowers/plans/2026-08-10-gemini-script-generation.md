# Gemini Direct REST Script Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the opencode-subprocess AI client with a direct Gemini REST client so script generation stops cold-starting the opencode CLI on every job and instead completes in a couple of seconds.

**Architecture:** `api._scripts_job` → `scriptwriter.generate_scripts` → `GeminiClient.run(prompt)`, which POSTs to `generativelanguage.googleapis.com` over `httpx`. Downstream parsing (`extract_json_blocks`) and validation (`validate_script_candidates`) are unchanged.

**Tech Stack:** Python 3.12+, FastAPI, `httpx` (0.28, classic package), Gemini Generative Language REST API (`gemini-3.6-flash`).

## Global Constraints

- Model default: `gemini-3.6-flash` (verified returning ~1.5s).
- Env vars use the `SHORTSVIDS_` prefix: `SHORTSVIDS_GEMINI_API_KEY` (required), `SHORTSVIDS_GEMINI_MODEL`, `SHORTSVIDS_GEMINI_TIMEOUT` (default `120`), `SHORTSVIDS_GEMINI_BASE_URL` (optional).
- The API key is **never hardcoded or committed**. It is read from the environment (or `backend/.env`, which must be gitignored).
- `httpx` (classic, 0.28) is used for HTTP; `httpx2` remains as-is (used by starlette TestClient fallback).
- Timeouts surface as builtin `TimeoutError` (NOTE: `subprocess.TimeoutExpired` is **not** a subclass of `TimeoutError`, so the retry loop must catch `TimeoutError` explicitly and fake clients must raise `TimeoutError`).
- Non-2xx HTTP responses raise `InvalidAIOutput` with the API `error.message`.

---

### Task 1: Add `httpx` dependency

**Files:**
- Modify: `backend/pyproject.toml`

**Interfaces:**
- Consumes: nothing.
- Produces: `httpx` available to `import httpx` in the backend.

- [ ] **Step 1: Add `httpx` to dependencies**

In `backend/pyproject.toml`, under `[project].dependencies`, add `"httpx",`. Keep `httpx2` (starlette's TestClient prefers it).

- [ ] **Step 2: Verify install metadata**

Run: `cd backend && .venv/bin/pip install -e . -q && .venv/bin/python -c "import httpx; print(httpx.__version__)"`
Expected: prints `0.28.1`.

- [ ] **Step 3: Commit**

```bash
git add backend/pyproject.toml
git commit -m "build(backend): add httpx dependency for Gemini client"
```

---

### Task 2: Replace `OpenCodeClient` with `GeminiClient`

**Files:**
- Modify: `backend/app/ai.py` (replace the `OpenCodeClient` class at the end; keep `InvalidAIOutput`, `extract_json_blocks`, `_assistant_text`)
- Modify: `backend/tests/test_ai.py` (replace the 3 `OpenCodeClient` subprocess tests starting at `def _fake_binary`; keep the `extract_json_blocks` tests and `_event` helper)
- Test: `backend/tests/test_ai.py`

**Interfaces:**
- Consumes: `httpx`, `os.environ`.
- Produces:
  - `class GeminiClient` with `run(prompt: str) -> str`.
  - `GeminiClient.__init__(api_key: str | None = None, model: str | None = None, timeout: int | None = None, base_url: str | None = None, transport: httpx.BaseTransport | None = None)`.
  - `.api_key`, `.model`, `.timeout`, `.base_url` attributes (`.timeout` is read by the scriptwriter retry error message).
  - Raises `InvalidAIOutput` when `SHORTSVIDS_GEMINI_API_KEY` is unset or on non-2xx; raises `TimeoutError` on `httpx.TimeoutException`.

- [ ] **Step 1: Write the failing tests**

Append to `backend/tests/test_ai.py`, add `import httpx` to imports, change the import line to `from app.ai import GeminiClient, extract_json_blocks, InvalidAIOutput`, and delete the three `OpenCodeClient` subprocess tests (`_fake_binary` and the two `test_run_surfaces_*` + `test_run_uses_configurable_timeout_from_env`):

```python
VALID_RESPONSE = {
    "candidates": [{
        "content": {"parts": [{"text": "```json\n{\"scripts\": []}\n```"}]},
    }]
}


def _gemini_client(handler, **kwargs):
    transport = httpx.MockTransport(handler)
    return GeminiClient(api_key="testkey", model="gemini-3.6-flash", transport=transport, **kwargs)


def test_gemini_run_returns_text_from_response():
    def handler(request):
        assert request.url.path.endswith("/models/gemini-3.6-flash:generateContent")
        assert request.url.params["key"] == "testkey"
        body = json.loads(request.content)
        assert body["contents"][0]["parts"][0]["text"] == "cu"
        assert body["generationConfig"]["responseMimeType"] == "application/json"
        return httpx.Response(200, json=VALID_RESPONSE)

    out = _gemini_client(handler).run("cu")
    assert extract_json_blocks(out) == [{"scripts": []}]


def test_gemini_run_joins_multiple_text_parts():
    def handler(request):
        resp = VALID_RESPONSE
        resp["candidates"][0]["content"]["parts"] = [{"text": '{"scripts": '}, {"text": "[]}"}]
        return httpx.Response(200, json=resp)

    out = _gemini_client(handler).run("cu")
    assert extract_json_blocks(out) == [{"scripts": []}]


def test_gemini_run_surfaces_api_error_message():
    def handler(request):
        return httpx.Response(429, json={"error": {"message": "rate limited"}})

    with pytest.raises(InvalidAIOutput) as exc:
        _gemini_client(handler).run("cu")
    assert "rate limited" in str(exc.value)


def test_gemini_run_timeout_raises_timeout_error():
    def handler(request):
        raise httpx.ReadTimeout("slow", request=request)

    with pytest.raises(TimeoutError):
        _gemini_client(handler).run("cu")


def test_gemini_requires_api_key_from_env(monkeypatch):
    monkeypatch.delenv("SHORTSVIDS_GEMINI_API_KEY", raising=False)
    with pytest.raises(InvalidAIOutput):
        GeminiClient(api_key=None)


def test_gemini_reads_defaults_from_env(monkeypatch):
    monkeypatch.setenv("SHORTSVIDS_GEMINI_TIMEOUT", "77")
    client = GeminiClient(api_key="k")
    assert client.timeout == 77
    assert client.model == "gemini-3.6-flash"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && .venv/bin/python -m pytest tests/test_ai.py -v`
Expected: FAIL with `ImportError: cannot import name 'GeminiClient'`.

- [ ] **Step 3: Implement `GeminiClient`**

In `backend/app/ai.py`, add `import httpx` at the top, delete `class OpenCodeClient` (the `__init__` and `run` at the end of the file) and replace with:

```python
class GeminiClient:
    def __init__(self, api_key: str | None = None, model: str | None = None,
                 timeout: int | None = None, base_url: str | None = None,
                 transport: httpx.BaseTransport | None = None):
        self.api_key = api_key or os.environ.get("SHORTSVIDS_GEMINI_API_KEY")
        if not self.api_key:
            raise InvalidAIOutput("SHORTSVIDS_GEMINI_API_KEY is not set")
        self.model = model or os.environ.get("SHORTSVIDS_GEMINI_MODEL", "gemini-3.6-flash")
        self.timeout = timeout if timeout is not None else int(
            os.environ.get("SHORTSVIDS_GEMINI_TIMEOUT", "120"))
        self.base_url = (
            base_url
            or os.environ.get("SHORTSVIDS_GEMINI_BASE_URL",
                              "https://generativelanguage.googleapis.com/v1beta")
        ).rstrip("/")
        self._client = httpx.Client(transport=transport, timeout=self.timeout)

    def run(self, prompt: str) -> str:
        url = f"{self.base_url}/models/{self.model}:generateContent"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json"},
        }
        try:
            resp = self._client.post(url, params={"key": self.api_key}, json=payload)
        except httpx.TimeoutException:
            raise TimeoutError(f"Gemini API request timed out after {self.timeout}s")
        if resp.status_code != 200:
            try:
                message = resp.json()["error"]["message"]
            except (ValueError, KeyError, TypeError):
                message = resp.text[:200] or f"HTTP {resp.status_code}"
            raise InvalidAIOutput(f"Gemini API error {resp.status_code}: {message}")
        data = resp.json()
        parts = data["candidates"][0]["content"]["parts"]
        return "".join(p.get("text", "") for p in parts)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && .venv/bin/python -m pytest tests/test_ai.py -v`
Expected: PASS (all `extract_json_blocks` tests + 6 new `GeminiClient` tests).

- [ ] **Step 5: Commit**

```bash
git add backend/app/ai.py backend/tests/test_ai.py
git commit -m "feat(backend): direct Gemini REST client for script generation"
```

---

### Task 3: Update `scriptwriter.py` to the `run(prompt)` interface

**Files:**
- Modify: `backend/app/scriptwriter.py`
- Modify: `backend/tests/test_scriptwriter.py`
- Test: `backend/tests/test_scriptwriter.py`

**Interfaces:**
- Consumes: `GeminiClient` (Task 2).
- Produces:
  - `generate_scripts(client, transcript: list[dict], duration_s: float, retries: int = 2) -> list[Script]` — `project_id` and `cwd`/`agent` arguments are REMOVED.
  - Retry loop catches builtin `TimeoutError`.

- [ ] **Step 1: Write the failing tests**

Replace `FakeClient` and the three `generate_scripts` tests in `backend/tests/test_scriptwriter.py` (keep `_payload`, `TRANSCRIPT`, `test_prompt_constraints_embedded`, and `import json`; remove `import subprocess`):

```python
class FakeClient:
    def __init__(self, attempts_before_success=0):
        self.calls = 0
        self.attempts_before_success = attempts_before_success

    def run(self, prompt):
        self.calls += 1
        if self.calls <= self.attempts_before_success:
            raise TimeoutError("Gemini API request timed out")
        return "Let me produce this\n```json\n" + json.dumps(_payload()) + "\n```\n"


def test_generate_scripts_returns_validated_list():
    scripts = generate_scripts(FakeClient(), TRANSCRIPT, duration_s=30.0)
    assert len(scripts) == 1
    assert scripts[0].id == "a"
    assert scripts[0].duration_s == 15.0
    assert scripts[0].cuts[0].caption_lines[0].text == "one two three"


def test_generate_scripts_retries_once_after_timeout():
    client = FakeClient(attempts_before_success=1)
    scripts = generate_scripts(client, TRANSCRIPT, duration_s=30.0)
    assert client.calls == 2
    assert len(scripts) == 1
    assert scripts[0].id == "a"


def test_generate_scripts_gives_up_with_clear_error_after_repeated_timeouts():
    client = FakeClient(attempts_before_success=99)
    with pytest.raises(Exception) as exc:
        generate_scripts(client, TRANSCRIPT, duration_s=30.0)
    assert "timed out" in str(exc.value)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && .venv/bin/python -m pytest tests/test_scriptwriter.py -v`
Expected: FAIL — the old `generate_scripts` still calls `client.run(prompt, cwd=..., agent=...)`, but the new `FakeClient.run(self, prompt)` rejects it (`TypeError: run() got an unexpected keyword argument 'cwd'`).

- [ ] **Step 3: Implement**

Replace `backend/app/scriptwriter.py` with:

```python
from .ai import InvalidAIOutput, extract_json_blocks
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


def generate_scripts(client, transcript: list[dict], duration_s: float,
                     retries: int = 2) -> list[Script]:
    prompt = SCRIPT_PROMPT_TEMPLATE.format(
        transcript=transcript_to_prompt(transcript),
        duration=duration_s,
    )
    last_error: Exception | None = None
    for _ in range(retries + 1):
        try:
            stdout = client.run(prompt)
            raw = extract_json_blocks(stdout)[-1]
            candidates = raw["scripts"] if isinstance(raw, dict) else raw
            return validate_script_candidates(candidates, transcript)
        except TimeoutError as e:
            last_error = e
    raise InvalidAIOutput(
        f"Script generation timed out after {retries + 1} attempts (model provider "
        f"did not respond within {getattr(client, 'timeout', '<unset>')}s). Please retry."
    ) from last_error
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && .venv/bin/python -m pytest tests/test_scriptwriter.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/scriptwriter.py backend/tests/test_scriptwriter.py
git commit -m "refactor(backend): script generation uses run(prompt) + TimeoutError retry"
```

---

### Task 4: Wire `GeminiClient` into the API

**Files:**
- Modify: `backend/app/api.py` (`_get_client`, `_scripts_job`)
- Modify: `backend/tests/test_api.py` (the `generate_scripts` monkeypatch in `test_generate_scripts_job_writes_scripts`)
- Test: `backend/tests/test_api.py`

**Interfaces:**
- Consumes: `GeminiClient` (Task 2), `generate_scripts(client, transcript, duration_s, retries=2)` (Task 3).
- Produces: `api._scripts_job` completes with `scripts.json` written.

- [ ] **Step 1: Update the failing test first**

In `backend/tests/test_api.py`, change the `generate_scripts` monkeypatch from:

```python
    monkeypatch.setattr(
        api_mod, "generate_scripts",
        lambda client, project_id, transcript, duration_s: [script],
    )
```

to:

```python
    monkeypatch.setattr(
        api_mod, "generate_scripts",
        lambda client, transcript, duration_s, retries=2: [script],
    )
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && .venv/bin/python -m pytest tests/test_api.py::test_generate_scripts_job_writes_scripts -v`
Expected: FAIL — `TypeError: <lambda>() got an unexpected keyword argument 'project_id'`.

- [ ] **Step 3: Implement**

In `backend/app/api.py`:

```python
def _get_client():
    from .ai import GeminiClient

    return GeminiClient()
```

and in `_scripts_job`:

```python
    scripts = generate_scripts(_get_client(), transcript, duration_s)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && .venv/bin/python -m pytest tests/test_api.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/api.py backend/tests/test_api.py
git commit -m "feat(backend): use GeminiClient for script jobs"
```

---

### Task 5: Update docs and gitignore

**Files:**
- Modify: `docs/acceptance.md`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: accurate run/configuration docs; `.env` / `backend/.env` ignored so the key is never committed.

- [ ] **Step 1: Update prerequisites in `docs/acceptance.md`**

Replace the opencode prerequisite line with:

```markdown
- A Google AI (Gemini) API key, exported as `SHORTSVIDS_GEMINI_API_KEY` (or placed in `backend/.env`).
```

- [ ] **Step 2: Update the env table in `docs/acceptance.md`**

Replace the `SHORTSVIDS_OPENCODE_*` rows (lines 17-19) with:

```markdown
| `SHORTSVIDS_GEMINI_API_KEY` | Google AI (Gemini) API key for script generation | unset (required) |
| `SHORTSVIDS_GEMINI_MODEL` | Gemini model used for script generation | `gemini-3.6-flash` |
| `SHORTSVIDS_GEMINI_TIMEOUT` | per-call timeout (s) for the Gemini API; generation retries on timeout | `120` |
| `SHORTSVIDS_GEMINI_BASE_URL` | API base URL override | `https://generativelanguage.googleapis.com/v1beta` |
```

- [ ] **Step 3: Add `.env` to `.gitignore`**

Append to `.gitignore`:

```gitignore
.env
backend/.env
```

- [ ] **Step 4: Verify gitignore**

Run: `git check-ignore backend/.env && git check-ignore .env`
Expected: both print a path (both are ignored).

- [ ] **Step 5: Commit**

```bash
git add docs/acceptance.md .gitignore
git commit -m "docs: switch acceptance config to Gemini client; ignore .env"
```

---

### Task 6: Full regression run

**Files:**
- Test: whole backend suite.

- [ ] **Step 1: Run the full backend test suite**

Run: `cd backend && .venv/bin/python -m pytest tests/ -q`
Expected: all tests PASS (69+).

- [ ] **Step 2: Smoke-test against the real Gemini API**

Run (requires `SHORTSVIDS_GEMINI_API_KEY` set in the shell):

```bash
cd backend && .venv/bin/python -c "
import os
from app.ai import GeminiClient
from app.scriptwriter import generate_scripts
client = GeminiClient()
transcript = [{'start': 0.0, 'end': 1.0, 'text': 'hello world'}]
scripts = generate_scripts(client, transcript, duration_s=15.0, retries=0)
print('OK', [s.id for s in scripts])
"
```

Expected: prints `OK [...]` with at least one valid script.

- [ ] **Step 3: Note the working tree**

The uncommitted opencode-related edits to `backend/app/ai.py`, `backend/app/scriptwriter.py`, `backend/tests/test_ai.py`, `backend/tests/test_scriptwriter.py`, `backend/tests/__pycache__`, and `docs/acceptance.md` were incorporated into Tasks 2-5. Confirm `git status` shows only the plan/committed files remaining.