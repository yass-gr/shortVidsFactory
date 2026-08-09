import json

from app.scriptwriter import SCRIPT_PROMPT_TEMPLATE, generate_scripts


TRANSCRIPT = [
    {"start": 0.0, "end": 0.5, "text": "one"},
    {"start": 0.5, "end": 1.0, "text": "two"},
    {"start": 1.0, "end": 1.5, "text": "three"},
]


def test_prompt_constraints_embedded():
    assert "15-30" in SCRIPT_PROMPT_TEMPLATE
    assert "SFW" in SCRIPT_PROMPT_TEMPLATE
    assert "no violence" in SCRIPT_PROMPT_TEMPLATE
    assert "want to watch the full video" in SCRIPT_PROMPT_TEMPLATE


class FakeClient:
    def run(self, prompt, cwd, agent=None):
        payload = {
            "scripts": [{
                "id": "a", "hook": "one two three", "summary": "summary",
                "duration_s": 15.0, "words_used": 3,
                "cuts": [{"source_start": 0.0, "source_end": 1.5,
                          "caption_lines": [{"start": 0.0, "end": 1.5,
                                              "text": "one two three"}]}],
            }]
        }
        return "Let me produce this\n```json\n" + json.dumps(payload) + "\n```\n"


def test_generate_scripts_returns_validated_list():
    scripts = generate_scripts(FakeClient(), "test-proj", TRANSCRIPT, duration_s=30.0)
    assert len(scripts) == 1
    assert scripts[0].id == "a"
    assert scripts[0].duration_s == 15.0
    assert scripts[0].cuts[0].caption_lines[0].text == "one two three"