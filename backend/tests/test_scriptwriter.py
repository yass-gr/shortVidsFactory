import json

import pytest

from app.scriptwriter import (
    InvalidAIOutput,
    SCRIPT_PROMPT_TEMPLATE,
    generate_scripts,
)


TRANSCRIPT = [
    {"start": 0.0, "end": 0.5, "text": "one"},
    {"start": 0.5, "end": 1.0, "text": "two"},
    {"start": 1.0, "end": 1.5, "text": "three"},
]


def _payload():
    return {
        "scripts": [{
            "id": "a", "hook": "one two three", "summary": "summary",
            "duration_s": 15.0, "words_used": 3,
            "cuts": [{"source_start": 0.0, "source_end": 1.5,
                      "caption_lines": [{"start": 0.0, "end": 1.5,
                                          "text": "one two three"}]}],
        }]
    }


def test_prompt_constraints_embedded():
    assert "15-30" in SCRIPT_PROMPT_TEMPLATE
    assert "SFW" in SCRIPT_PROMPT_TEMPLATE
    assert "no violence" in SCRIPT_PROMPT_TEMPLATE
    assert "want to watch the full video" in SCRIPT_PROMPT_TEMPLATE


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
    with pytest.raises(InvalidAIOutput) as exc:
        generate_scripts(client, TRANSCRIPT, duration_s=30.0)
    assert "timed out" in str(exc.value)