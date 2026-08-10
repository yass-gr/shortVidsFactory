# Design: Direct Gemini REST client for script generation

**Date:** 2026-08-10
**Status:** Approved

## Problem

AI script generation is slow. `OpenCodeClient.run` shells out to
`opencode run --format json` for every job (`backend/app/ai.py:84`). Each
invocation cold-starts the entire opencode CLI runtime (plugin loading, project
config, agent loading, provider connection) and runs on a free-tier model
(`opencode/deepseek-v4-flash-free`) with a 600s default timeout. This produces
minutes-long, silent waits.

A Gemini API key was provided and verified: `gemini-3.6-flash` returns a
completion in ~1.5s.

## Goal

Replace the opencode subprocess bridge with direct HTTP calls to the Gemini
REST API, eliminating per-request opencode cold-start and using a fast,
dedicated model. No behavior change to the rest of the pipeline
(transcript → script candidates → validation → approval).

## Architecture

```
api._scripts_job → scriptwriter.generate_scripts → GeminiClient.run(prompt)
```

One substitution in the AI integration path. Downstream consumers
(`extract_json_blocks`, `validate_script_candidates`) are untouched.

## Components

### `backend/app/ai.py` — `GeminiClient`

Replace `OpenCodeClient` with `GeminiClient`:

- Constructor reads config from env:
  - `SHORTSVIDS_GEMINI_API_KEY` (required)
  - `SHORTSVIDS_GEMINI_MODEL` (default `gemini-3.6-flash`)
  - `SHORTSVIDS_GEMINI_TIMEOUT` (default 120)
  - `SHORTSVIDS_GEMINI_BASE_URL` (optional override, defaults to
    `https://generativelanguage.googleapis.com/v1beta`)
- `run(prompt: str) -> str`:
  - `POST {base}/models/{model}:generateContent?key={api_key}`
  - Body: `{"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"responseMimeType": "application/json"}}`
  - JSON mode reduces parse failures and retries.
  - Parse `candidates[0].content.parts[*].text`, join parts, return.
  - Non-2xx → raise `InvalidAIOutput` with API `error.message`.
  - `httpx.TimeoutException` → raise `TimeoutError` (a superclass of
    `subprocess.TimeoutExpired`, so the existing retry loop in
    `scriptwriter.py` keeps working).
- Uses `httpx` (already a dependency).
- HTTP transport injected for tests (e.g. `httpx.MockTransport` or a fake
  `httpx.post`).

`extract_json_blocks` and `InvalidAIOutput` are retained unchanged.

### `backend/app/scriptwriter.py`

- `generate_scripts` calls `client.run(prompt)` only — drop `cwd` and `agent`,
  which existed solely for the opencode subprocess.
- Retry-on-timeout logic unchanged (`TimeoutError`).

### `backend/app/api.py`

- `_get_client()` returns `GeminiClient()`.

## Error handling

- Missing API key → clear `InvalidAIOutput`/config error at call time.
- HTTP/API errors → surface Gemini `error.message` (mirrors current
  `_opencode_error` behavior).
- Timeout → retried up to `retries + 1` times, then clear error message.

## Security

- The API key is **never hardcoded** or committed. Read from env.
- `backend/.env` (if created) is added to `.gitignore`.

## Testing

- `backend/tests/test_ai.py`:
  - Keep `extract_json_blocks` tests.
  - Replace opencode-subprocess tests with `GeminiClient` tests using a fake
    HTTP transport: correct URL/model/key, response parsing, API-error
    surfacing, timeout → `TimeoutError`, missing-key error.
- `backend/tests/test_scriptwriter.py`:
  - Adjust `FakeClient.run` signature to `run(prompt)`.
  - Retry/timeout tests unchanged (still exercise `TimeoutError` path).
- Run full backend suite (`pytest` in `backend/`).