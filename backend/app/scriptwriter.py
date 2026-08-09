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