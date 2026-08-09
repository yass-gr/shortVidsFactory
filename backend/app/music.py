import shutil
from abc import ABC, abstractmethod
from pathlib import Path
from dataclasses import dataclass


class MusicUnavailable(Exception):
    pass


@dataclass
class TrackMeta:
    id: str
    title: str
    source: str          # "local" | "social"
    path: Path | None = None


class MusicSource(ABC):
    @abstractmethod
    def list_tracks(self) -> list[TrackMeta]:
        ...

    @abstractmethod
    def fetch(self, track_id: str, dest: Path) -> Path:
        ...


class LocalFilesMusicSource(MusicSource):
    def __init__(self, root: Path | None = None, exts=(".mp3", ".wav", ".m4a", ".ogg")):
        self.root = root or Path(__import__("os").environ.get("SHORTSVIDS_MUSIC_DIR", "./music"))
        self.exts = exts

    def list_tracks(self) -> list[TrackMeta]:
        if not self.root.exists():
            return []
        return [
            TrackMeta(id=p.name, title=p.name, source="local", path=p)
            for p in sorted(self.root.iterdir())
            if p.suffix.lower() in self.exts
        ]

    def fetch(self, track_id: str, dest: Path) -> Path:
        src = self.root / track_id
        shutil.copyfile(src, dest)
        return dest


class SocialExtractorMusicSource(MusicSource):
    def list_tracks(self) -> list[TrackMeta]:
        return []

    def fetch(self, track_id: str, dest: Path) -> Path:
        raise MusicUnavailable("Social music extraction not available in this build")


class CombinedMusicSource(MusicSource):
    def __init__(self, social: MusicSource, local: MusicSource):
        self.social = social
        self.local = local

    def list_tracks(self) -> list[TrackMeta]:
        try:
            tracks = self.social.list_tracks()
            return tracks + self.local.list_tracks()
        except MusicUnavailable:
            return self.local.list_tracks()

    def fetch(self, track_id: str, dest: Path) -> Path:
        local_ids = {t.id for t in self.local.list_tracks()}
        if track_id in local_ids:
            return self.local.fetch(track_id, dest)
        if track_id in {t.id for t in self.social.list_tracks()}:
            return self.social.fetch(track_id, dest)
        raise MusicUnavailable(f"Unknown track: {track_id}")