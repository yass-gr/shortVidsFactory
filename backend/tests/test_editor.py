from app.editor import new_snapshot, EditorSnapshot
from app.scripts import Script, Cut, Caption

FIXTURE = Script(
    id="a", hook="hook", summary="summary", duration_s=20.0, words_used=30,
    cuts=[
        Cut(source_start=0.0, source_end=10.0, caption_lines=[
            Caption(start=0.0, end=5.0, text="hello"),
        ]),
    ],
)


def test_new_snapshot_builds_cuts_from_script():
    snap = new_snapshot("p1", FIXTURE)
    assert len(snap.cuts) == 1
    assert snap.cuts[0].caption_lines[0].text == "hello"
    assert snap.font == "Arial"
    assert snap.music is None
    assert snap.export_path == ""


def test_snapshot_can_roundtrip():
    snap = new_snapshot("p1", FIXTURE)
    d = snap.model_dump()
    again = EditorSnapshot.model_validate(d)
    assert again == snap