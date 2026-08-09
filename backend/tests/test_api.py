import json
import shutil
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import app.api as api_mod
import app.config as config_mod
import app.storage as storage_mod
from app.main import create_app
from app.jobs import manager, JobStatus
from app.transcribe import WordSeg

CLIP = Path(__file__).parent / "fixtures" / "clip_video.mp4"


@pytest.fixture(autouse=True)
def isolated_project_root(tmp_path, monkeypatch):
    root = tmp_path / "projects"
    monkeypatch.setattr(config_mod, "PROJECT_ROOT", root)
    monkeypatch.setattr(api_mod, "PROJECT_ROOT", root)
    monkeypatch.setattr(storage_mod, "PROJECT_ROOT", root)
    return root


class FakeTranscriber:
    def __init__(self, model="base"):
        self.model = model

    def transcribe(self, path):
        return [
            WordSeg(start=0.0, end=0.5, text="hello"),
            WordSeg(start=0.5, end=1.0, text="world"),
        ]


def _new_project(client, name="demo"):
    r = client.post("/api/projects", json={"name": name})
    assert r.status_code == 201
    return r.json()["id"]


def _project_dir(project_id):
    return config_mod.PROJECT_ROOT / project_id


def _wait_job(job_id, timeout=15.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        job = manager.get(job_id)
        if job.status in (JobStatus.done, JobStatus.error):
            return job
        time.sleep(0.01)
    raise AssertionError(f"job {job_id} still {manager.get(job_id).status}")


def test_create_project():
    client = TestClient(create_app())
    r = client.post("/api/projects", json={"name": "demo"})
    assert r.status_code == 201
    body = r.json()
    assert body["id"].startswith("p")
    assert body["name"] == "demo"


def test_list_projects():
    client = TestClient(create_app())
    pid = _new_project(client, "demo")
    body = client.get("/api/projects").json()
    by_id = {p["id"]: p for p in body["projects"]}
    assert pid in by_id
    assert by_id[pid]["name"] == "demo"


def test_get_scripts_returns_pending_none_when_empty():
    client = TestClient(create_app())
    pid = _new_project(client)
    r = client.get(f"/api/projects/{pid}/scripts")
    assert r.status_code == 200
    assert r.json() == {"pending": None}


def test_upload_enqueues_transcribe_and_writes_transcript(monkeypatch):
    client = TestClient(create_app())
    pid = _new_project(client)
    recorded = {}

    class RecordingTranscriber(FakeTranscriber):
        def __init__(self, model="base"):
            super().__init__(model)
            recorded["model"] = model

    monkeypatch.setattr(api_mod, "Transcriber", RecordingTranscriber)
    monkeypatch.setattr(api_mod, "build_proxy", lambda source, proxy: source)
    monkeypatch.setenv("SHORTVIDS_WHISPER_MODEL", "turbo")

    with CLIP.open("rb") as f:
        r = client.post(
            f"/api/projects/{pid}/entries",
            files={"file": ("clip.mp4", f, "video/mp4")},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["project_id"] == pid
    assert body["job_id"]
    assert _project_dir(body["project_id"]).is_dir()
    assert body["media"]["width"] == 320
    assert recorded["model"] == "turbo"

    job = _wait_job(body["job_id"])
    assert job.status == JobStatus.done
    assert job.kind == "transcribe"
    transcript_path = _project_dir(pid) / "transcript.json"
    assert transcript_path.exists()
    data = json.loads(transcript_path.read_text())
    assert data == [
        {"start": 0.0, "end": 0.5, "text": "hello"},
        {"start": 0.5, "end": 1.0, "text": "world"},
    ]


def test_retranscribe_enqueues_again(monkeypatch):
    client = TestClient(create_app())
    pid = _new_project(client)

    class FakeTranscriber:
        def __init__(self, model="base"):
            pass

        def transcribe(self, path):
            return [WordSeg(start=0.0, end=0.4, text="again")]

    monkeypatch.setattr(api_mod, "Transcriber", FakeTranscriber)
    r = client.post(f"/api/projects/{pid}/transcribe")
    assert r.status_code == 200
    job = _wait_job(r.json()["job_id"])
    assert job.status == JobStatus.done
    assert job.result == [{"start": 0.0, "end": 0.4, "text": "again"}]


def test_generate_scripts_job_writes_scripts(monkeypatch):
    from app.scripts import Caption, Cut, Script

    client = TestClient(create_app())
    pid = _new_project(client)
    monkeypatch.setattr(api_mod, "Transcriber", FakeTranscriber)
    monkeypatch.setattr(api_mod, "build_proxy", lambda source, proxy: source)

    with CLIP.open("rb") as f:
        up = client.post(
            f"/api/projects/{pid}/entries",
            files={"file": ("clip.mp4", f, "video/mp4")},
        ).json()
    _wait_job(up["job_id"])

    script = Script(
        id="b", hook="hook", summary="summary", duration_s=15.0, words_used=2,
        cuts=[Cut(source_start=0.0, source_end=0.8,
                  caption_lines=[Caption(start=0.0, end=0.8, text="hello world")])],
    )
    monkeypatch.setattr(
        api_mod, "generate_scripts",
        lambda client, project_id, transcript, duration_s: [script],
    )

    r = client.post(f"/api/projects/{pid}/scripts", json={})
    assert r.status_code == 200
    job_id = r.json()["job_id"]
    job = _wait_job(job_id)
    assert job.status == JobStatus.done
    assert (_project_dir(pid) / "scripts.json").exists()

    r2 = client.get(f"/api/projects/{pid}/scripts")
    body = r2.json()
    assert isinstance(body, list)
    assert body[0]["id"] == "b"
    assert body[0]["cuts"][0]["source_start"] == 0.0


def test_approve_builds_snapshot():
    client = TestClient(create_app())
    pid = _new_project(client)
    pdir = _project_dir(pid)
    shutil.copyfile(CLIP, pdir / "source.mp4")
    (pdir / "transcript.json").write_text(json.dumps([
        {"start": 0.0, "end": 0.5, "text": "one"},
        {"start": 0.5, "end": 1.0, "text": "two"},
    ]))
    (pdir / "scripts.json").write_text(json.dumps([{
        "id": "s1", "hook": "H", "summary": "S", "duration_s": 15.0, "words_used": 2,
        "cuts": [{"source_start": 0.0, "source_end": 0.8,
                  "caption_lines": [{"start": 0.0, "end": 0.8, "text": "one two"}]}],
    }]))

    r = client.post(f"/api/projects/{pid}/approve", json={"script_id": "s1"})
    assert r.status_code == 200
    assert r.json() == {
        "cuts": [{"source_start": 0.0, "source_end": 0.8,
                  "caption_lines": [{"start": 0.0, "end": 0.8, "text": "one two"}]}],
        "music": None,
        "font": "Arial",
        "export_path": "",
    }
    editor = json.loads((pdir / "editor.json").read_text())
    assert editor["music"] is None
    assert editor["font"] == "Arial"


def test_approve_unknown_script_404():
    client = TestClient(create_app())
    pid = _new_project(client)
    pdir = _project_dir(pid)
    shutil.copyfile(CLIP, pdir / "source.mp4")
    (pdir / "transcript.json").write_text("[]")
    (pdir / "scripts.json").write_text("[]")
    r = client.post(f"/api/projects/{pid}/approve", json={"script_id": "nope"})
    assert r.status_code == 404


def test_approve_missing_generation_404():
    client = TestClient(create_app())
    pid = _new_project(client)
    r = client.post(f"/api/projects/{pid}/approve", json={"script_id": "s1"})
    assert r.status_code == 404
    assert "generated yet" in r.json()["detail"]


def test_path_traversal_project_rejected():
    client = TestClient(create_app())
    r = client.get("/api/projects/%2e%2e/scripts")
    assert r.status_code == 404


def test_snapshot_roundtrip():
    client = TestClient(create_app())
    pid = _new_project(client)
    assert client.get(f"/api/projects/{pid}/snapshot").status_code == 404

    snapshot = {
        "cuts": [],
        "music": None,
        "font": "Arial",
        "export_path": "",
    }
    r = client.put(f"/api/projects/{pid}/snapshot", json=snapshot)
    assert r.status_code == 200
    assert r.json() == snapshot
    r2 = client.get(f"/api/projects/{pid}/snapshot")
    assert r2.status_code == 200
    assert r2.json() == snapshot


def test_export_job_stub():
    client = TestClient(create_app())
    pid = _new_project(client)
    r = client.post(f"/api/projects/{pid}/export", json={"destination": "/tmp/out.mp4"})
    assert r.status_code == 200
    job_id = r.json()["job_id"]
    job = _wait_job(job_id)
    assert job.kind == "export"
    assert job.result == {"exported": True}


def test_job_stream_emits_sse_events():
    client = TestClient(create_app())

    def work(ctx):
        return {"ok": 1}

    job = manager.submit("demo", work, {})
    with client.stream("GET", f"/api/jobs/{job.id}/stream") as r:
        assert r.status_code == 200
        text = "".join(r.iter_text())
    assert "event: done" in text
    assert '"status": "done"' in text


def test_job_stream_unknown_job_404():
    client = TestClient(create_app())
    r = client.get("/api/jobs/garbageid/stream")
    assert r.status_code == 404


def test_music_list(tmp_path, monkeypatch):
    monkeypatch.setenv("SHORTSVIDS_MUSIC_DIR", str(tmp_path))
    (tmp_path / "a.mp3").write_bytes(b"\x00")
    client = TestClient(create_app())
    r = client.get("/api/music")
    body = r.json()
    assert len(body["tracks"]) == 1
    assert body["tracks"][0]["title"] == "a.mp3"
    assert body["social"] is False
