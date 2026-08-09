from pydantic import BaseModel
from .scripts import Script, Cut


class MusicTrack(BaseModel):
    source: str = ""            # "local" | "social"
    path: str | None = None
    offset: float = 0.0
    trim_start: float = 0.0
    trim_end: float | None = None
    volume: float = 0.8
    duck: bool = True


class EditorSnapshot(BaseModel):
    cuts: list[Cut]
    music: MusicTrack | None = None
    font: str = "Arial"
    export_path: str = ""


def new_snapshot(project_id: str, script: Script) -> EditorSnapshot:
    # project_id is not stored in the snapshot; used only for defaults
    return EditorSnapshot(cuts=[c.model_copy(deep=True) for c in script.cuts])