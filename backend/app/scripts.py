from pydantic import BaseModel, ValidationError


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
        try:
            st = Script.model_validate(item)
        except ValidationError:
            continue
        if not (15.0 <= st.duration_s <= max_duration):
            continue
        valid = True
        for cut in st.cuts:
            if cut.source_end - cut.source_start <= 0.2:
                valid = False
                break
            if cut.source_start < 0 or cut.source_end > transcript_end + 0.5:
                valid = False
                break
            for cap in cut.caption_lines:
                if cap.start < cut.source_start or cap.end > cut.source_end:
                    valid = False
                    break
        if valid:
            scripts.append(st)
    if not scripts:
        raise ValueError("No valid scripts in candidates")
    return scripts