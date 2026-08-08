from pathlib import Path
from app.media import probe
from app.preview import build_preview

SOURCE = Path(__file__).parent / "fixtures" / "clip_video.mp4"

def test_preview_concats_two_cuts():
    out = build_preview(
        SOURCE,
        [ {"start": 0.0, "end": 1.0}, {"start": 1.0, "end": 2.0} ],
        out_path=Path("preview_tmp.mp4"),
    )
    info = probe(out)
    assert abs(info["duration_s"] - 2.0) < 0.6
    out.unlink(missing_ok=True)