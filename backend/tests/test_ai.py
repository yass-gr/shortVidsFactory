import json

import httpx
import pytest

from app.ai import GeminiClient, extract_json_blocks, InvalidAIOutput

def _event(type_, text=None):
    part = {"type": type_}
    if text is not None:
        part["text"] = text
    return json.dumps({"type": type_, "part": part})

def test_extract_json_blocks_parses_markdown():
    raw = 'Here you go:\n```json\n{"scripts": []}\n```\n'
    assert extract_json_blocks(raw) == [{"scripts": []}]

def test_extract_json_blocks_errors_when_missing():
    try:
        extract_json_blocks("no code block here")
        assert False, "should raise"
    except InvalidAIOutput:
        pass

def test_extract_json_blocks_parses_opencode_event_stream_text_part():
    raw = "\n".join([
        _event("step_start"),
        _event("text", '```json\n{"scripts": [{"id": "a"}]}\n```'),
        _event("step_finish"),
    ])
    assert extract_json_blocks(raw) == [{"scripts": [{"id": "a"}]}]

def test_extract_json_blocks_parses_bare_json_array_in_event_stream():
    raw = "\n".join([
        _event("step_start"),
        _event("text", '[{"id": "a"}, {"id": "b"}]'),
        _event("step_finish"),
    ])
    assert extract_json_blocks(raw) == [[{"id": "a"}, {"id": "b"}]]

def test_extract_json_blocks_rejects_event_stream_with_no_json():
    raw = "\n".join([
        _event("step_start"),
        _event("text", "I am afraid I cannot output JSON."),
        _event("step_finish"),
    ])
    try:
        extract_json_blocks(raw)
        assert False, "should raise"
    except InvalidAIOutput:
        pass


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
