import subprocess
from pathlib import Path

import pytest

from app.editor import MusicTrack, new_snapshot
from app.export import export_video
from app.media import probe
from app.scripts import Caption, Cut, Script

SOURCE = Path(__file__).parent / "fixtures" / "clip_video.mp4"
FONT = "/usr/share/fonts/Adwaita/AdwaitaSans-Regular.ttf"

FIXTURE_2S = Script(
    id="e2",
    hook="hook",
    summary="summary",
    duration_s=16.0,
    words_used=30,
    cuts=[
        Cut(source_start=0.0, source_end=1.0, caption_lines=[
            Caption(start=0.1, end=0.9, text="hello world"),
        ]),
        Cut(source_start=1.0, source_end=2.0, caption_lines=[
            Caption(start=1.1, end=1.9, text="second caption"),
        ]),
    ],
)


def test_export_produces_vertical_h264(tmp_path):
    snap = new_snapshot("p1", FIXTURE_2S)
    out = export_video(snap, SOURCE, tmp_path / "workspace", tmp_path / "out.mp4", lambda: FONT)
    info = probe(out)
    assert info["width"] == 1080 and info["height"] == 1920
    assert info["duration_s"] == pytest.approx(2.0, abs=0.5)


def test_export_with_music_muxes(tmp_path):
    music = tmp_path / "music.wav"
    subprocess.run(
        ["ffmpeg", "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
         "-c:a", "pcm_s16le", str(music)],
        check=True, capture_output=True,
    )
    snap = new_snapshot("p1", FIXTURE_2S)
    snap.music = MusicTrack(source="local", path=str(music), volume=0.5, duck=True)
    out = export_video(snap, SOURCE, tmp_path / "workspace", tmp_path / "out_music.mp4", lambda: FONT)
    info = probe(out)
    assert info["width"] == 1080 and info["height"] == 1920
    assert info["duration_s"] == pytest.approx(2.0, abs=0.5)


def test_export_survives_bad_music(tmp_path):
    bogus = tmp_path / "music.mp3"
    bogus.write_bytes(b"junk")
    snap = new_snapshot("p1", FIXTURE_2S)
    snap.music = MusicTrack(source="local", path=str(bogus), volume=0.5, duck=True)
    out = export_video(snap, SOURCE, tmp_path / "workspace", tmp_path / "out.mp4", lambda: FONT)
    info = probe(out)
    assert info["width"] == 1080 and info["height"] == 1920
    assert info["duration_s"] == pytest.approx(2.0, abs=0.5)


def test_export_font_falls_back_to_existing(tmp_path, monkeypatch):
    monkeypatch.delenv("SHORTSVIDS_FONT_PATH", raising=False)
    snap = new_snapshot("p1", FIXTURE_2S)
    out = export_video(
        snap, SOURCE, tmp_path / "workspace", tmp_path / "out.mp4",
        lambda: "/nonexistent/fonts/Missing.ttf",
    )
    info = probe(out)
    assert info["width"] == 1080 and info["height"] == 1920
    assert info["duration_s"] == pytest.approx(2.0, abs=0.5)


def test_default_font_reads_env(monkeypatch):
    from app.export import default_font

    monkeypatch.setenv("SHORTSVIDS_FONT_PATH", "/tmp/custom.ttf")
    assert default_font() == "/tmp/custom.ttf"


def test_resolve_font_uses_injected_when_valid(monkeypatch):
    from app.export import _resolve_font

    monkeypatch.delenv("SHORTSVIDS_FONT_PATH", raising=False)
    assert _resolve_font(lambda: FONT) == FONT


def test_resolve_font_falls_back_to_installed(monkeypatch):
    from app.export import _resolve_font

    monkeypatch.delenv("SHORTSVIDS_FONT_PATH", raising=False)
    resolved = _resolve_font(lambda: "/nonexistent/fonts/Missing.ttf")
    assert resolved != "/nonexistent/fonts/Missing.ttf"
    assert Path(resolved).is_file()