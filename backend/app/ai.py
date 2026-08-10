import json
import os
import re

import httpx


class InvalidAIOutput(Exception):
    pass


_json_re = re.compile(r"```json\s*(.*?)\s*```", re.DOTALL)


def _assistant_text(stdout: str) -> str:
    """Extract assistant message text from opencode's --format json event stream.

    opencode run --format json emits one JSON object per line (step-start, text,
    step-finish, ...). The model's reply lives in the "text" field of
    "type": "text" events. If stdout is not an event stream, return it as-is.
    """
    parts = []
    for line in stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            return stdout
        if event.get("type") == "text":
            text = event.get("part", {}).get("text", "")
            if text:
                parts.append(text)
    if not parts:
        return stdout
    return "\n".join(parts)


def extract_json_blocks(stdout: str) -> list[dict]:
    blocks = []
    text = _assistant_text(stdout)
    for m in _json_re.finditer(text):
        blocks.append(json.loads(m.group(1)))
    if not blocks:
        stripped = text.strip()
        try:
            blocks = [json.loads(stripped)]
        except json.JSONDecodeError:
            pass
    if not blocks:
        raise InvalidAIOutput("No JSON block found in model output")
    return blocks


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