from app.transcribe import Transcriber, WordSeg


class FakeWord:
    def __init__(self, start, end, word):
        self.start, self.end, self.word = start, end, word


class FakeSegment:
    def __init__(self, start, end, words):
        self.start, self.end = start, end
        self.words = list(words)


class FakeEngine:
    def transcribe(self, path, word_timestamps=True, **kwargs):
        segments = (
            FakeSegment(
                0.0, 1.2,
                [FakeWord(0.0, 0.4, " hello"), FakeWord(0.4, 0.8, " world")],
            ),
            FakeSegment(
                1.5, 2.0,
                [FakeWord(1.5, 1.9, " again")],
            ),
        )
        return iter(segments), None


def test_transcriber_with_fake_engine():
    t = Transcriber(engine=FakeEngine())
    words = t.transcribe("/tmp/fake.mp3")
    assert words == [
        WordSeg(start=0.0, end=0.4, text="hello"),
        WordSeg(start=0.4, end=0.8, text="world"),
        WordSeg(start=1.5, end=1.9, text="again"),
    ]