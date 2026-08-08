from __future__ import annotations
from pydantic import BaseModel


class WordSeg(BaseModel):
    start: float
    end: float
    text: str


class Transcriber:
    def __init__(self, model: str = "base", device: str = "cpu", engine=None):
        self._model = model
        if engine is None:
            from faster_whisper import WhisperModel
            engine = WhisperModel(model, device=device, compute_type="int8")
        self._engine = engine

    def transcribe(self, path: str) -> list[WordSeg]:
        segments, _ = self._engine.transcribe(path, word_timestamps=True)
        words: list[WordSeg] = []
        for seg in segments:
            for w in (seg.words or []):
                words.append(WordSeg(start=w.start, end=w.end, text=w.word.strip()))
        return words