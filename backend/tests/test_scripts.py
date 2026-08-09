import pytest

from app.scripts import validate_script_candidates

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

def test_invalid_script_skipped_while_valid_kept():
    raw = [
        {"id": "good", "hook": "h", "summary": "s", "duration_s": 16.0,
         "words_used": 3,
         "cuts": [{"source_start": 0.0, "source_end": 1.5,
                   "caption_lines": [{"start": 0.0, "end": 1.5, "text": "one two three"}]}]},
        {"id": "bad", "hook": "h", "summary": "s", "duration_s": 60.0,
         "words_used": 1,
         "cuts": [{"source_start": 0.0, "source_end": 60.0, "caption_lines": []}]},
    ]
    scripts = validate_script_candidates(raw, TRANSCRIPT)
    assert [s.id for s in scripts] == ["good"]


def test_all_invalid_scripts_raise():
    raw = [
        {"id": "bad1", "hook": "h", "summary": "s", "duration_s": 60.0,
         "words_used": 1,
         "cuts": [{"source_start": 0.0, "source_end": 60.0, "caption_lines": []}]},
        {"id": "bad2", "hook": "h", "summary": "s", "duration_s": 60.0,
         "words_used": 1,
         "cuts": [{"source_start": 0.0, "source_end": 60.0, "caption_lines": []}]},
    ]
    with pytest.raises(ValueError):
        validate_script_candidates(raw, TRANSCRIPT)


def test_structurally_broken_candidate_skipped_while_valid_kept():
    raw = [
        {"id": "broken"},
        {"id": "good", "hook": "h", "summary": "s", "duration_s": 16.0,
         "words_used": 3,
         "cuts": [{"source_start": 0.0, "source_end": 1.5,
                   "caption_lines": [{"start": 0.0, "end": 1.5, "text": "one two three"}]}]},
    ]
    scripts = validate_script_candidates(raw, TRANSCRIPT)
    assert [s.id for s in scripts] == ["good"]


def test_cut_exceeding_transcript_rejected():
    raw = [{"id": "a", "hook": "h", "summary": "s", "duration_s": 16.0,
            "words_used": 1,
            "cuts": [{"source_start": 0.0, "source_end": 4.0, "caption_lines": []}]}]
    with pytest.raises(ValueError):
        validate_script_candidates(raw, TRANSCRIPT)

def test_empty_cut_rejected():
    raw = [{"id": "a", "hook": "h", "summary": "s", "duration_s": 16.0,
            "words_used": 1,
            "cuts": [{"source_start": 1.0, "source_end": 1.0, "caption_lines": []}]}]
    with pytest.raises(ValueError):
        validate_script_candidates(raw, TRANSCRIPT)

def test_caption_outside_cut_rejected():
    raw = [{"id": "a", "hook": "h", "summary": "s", "duration_s": 16.0,
            "words_used": 1,
            "cuts": [{"source_start": 0.0, "source_end": 1.5,
                      "caption_lines": [{"start": 0.0, "end": 2.0, "text": "hello"}]}]}]
    with pytest.raises(ValueError):
        validate_script_candidates(raw, TRANSCRIPT)

def test_negative_source_start_rejected():
    raw = [{"id": "a", "hook": "h", "summary": "s", "duration_s": 16.0,
            "words_used": 1,
            "cuts": [{"source_start": -0.1, "source_end": 1.0, "caption_lines": []}]}]
    with pytest.raises(ValueError):
        validate_script_candidates(raw, TRANSCRIPT)

def test_below_floor_duration_rejected():
    raw = [{"id": "a", "hook": "h", "summary": "s", "duration_s": 12.0,
            "words_used": 1,
            "cuts": [{"source_start": 0.0, "source_end": 1.0, "caption_lines": []}]}]
    with pytest.raises(ValueError):
        validate_script_candidates(raw, TRANSCRIPT)
