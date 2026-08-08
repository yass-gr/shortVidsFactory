from pathlib import Path

from app.media import build_proxy, path_escaped, probe

CLIP = Path(__file__).parent / "fixtures" / "clip_video.mp4"


def test_probe_returns_dimensions_and_duration():
    info = probe(CLIP)
    assert info["width"] == 320
    assert info["height"] == 240
    assert abs(info["duration_s"] - 3.0) < 0.5


def test_build_proxy_downscales(tmp_path):
    out = tmp_path / "proxy_test.mp4"
    build_proxy(CLIP, out, width=160)
    info = probe(out)
    assert info["width"] == 160
    assert info["height"] == 120


def test_path_escaped_quotes_single_quote():
    assert path_escaped(Path("a'b.mp4")) == "'a'\\''b.mp4'"