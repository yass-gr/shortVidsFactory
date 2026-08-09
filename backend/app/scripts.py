from pydantic import BaseModel


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
        st = Script.model_validate(item)
        if not (15.0 <= st.duration_s <= max_duration):
            raise ValueError(f"Script '{st.id}' out of 15s-{max_duration}s")
        for cut in st.cuts:
            if cut.source_end - cut.source_start <= 0.2:
                raise ValueError(f"Script '{st.id}' has an empty cut")
            if cut.source_start < 0 or cut.source_end > transcript_end + 0.5:
                raise ValueError(f"Script '{st.id}' cut exceeds transcript")
            for cap in cut.caption_lines:
                if cap.start < cut.source_start or cap.end > cut.source_end:
                    raise ValueError(f"Caption out of cut in '{st.id}'")
        scripts.append(st)
    return scripts