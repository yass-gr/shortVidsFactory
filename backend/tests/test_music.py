import pytest
from pathlib import Path
from app.music import (
    LocalFilesMusicSource,
    SocialExtractorMusicSource,
    CombinedMusicSource,
    MusicUnavailable,
)

def test_local_lists_audio_files(tmp_path):
    (tmp_path / "a.mp3").write_bytes(b"\x00")
    (tmp_path / "b.wav").write_bytes(b"\x00")
    (tmp_path / "c.txt").write_text("skip")
    src = LocalFilesMusicSource(root=tmp_path)
    assert {t.title for t in src.list_tracks()} == {"a.mp3", "b.wav"}

def test_local_fetch_copies(tmp_path):
    src = LocalFilesMusicSource(root=tmp_path)
    (tmp_path / "a.mp3").write_bytes(b"data")
    track = src.list_tracks()[0]
    dest = tmp_path / "out.mp3"
    result = src.fetch(track.id, dest)
    assert result.read_bytes() == b"data"

def test_social_returns_empty_and_raises(tmp_path):
    src = SocialExtractorMusicSource()
    assert src.list_tracks() == []
    with pytest.raises(MusicUnavailable):
        src.fetch("whatever", tmp_path / "x.mp3")

def test_combined_degrades_to_local(tmp_path):
    (tmp_path / "a.mp3").write_bytes(b"d")
    combined = CombinedMusicSource(social=SocialExtractorMusicSource(),
                                   local=LocalFilesMusicSource(root=tmp_path))
    assert len(combined.list_tracks()) == 1