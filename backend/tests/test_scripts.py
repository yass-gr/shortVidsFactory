from app.scripts import validate_script_candidates, Script

TRANSCRIPT = [
    {"start": 0.0, "end": 0.5, "text": "one"},
    {"start": 0.5, "end": 1.0, "text": "two"},
    {"start": 1.0, "end": 1.5, "text": "three"},
]

def test_valid_script_passes_and_bounds_aligned():
    raw = [{
        "id": "a", "hook": "hi", "summary": "s", "duration_s": 15.0,
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