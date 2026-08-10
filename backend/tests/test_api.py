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
from app.editor import EditorSnapshot
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


def test_get_scripts_returns_pending_none_when_job_errored():
    client = TestClient(create_app())
    pid = _new_project(client)
    job = manager.submit(
        "scripts",
        lambda args: (_ for _ in ()).throw(RuntimeError("boom")),
        {"project_id": pid},
    )
    api_mod._scripts_jobs[pid] = job.id
    _wait_job(job.id)
    assert job.status == JobStatus.error
    r = client.get(f"/api/projects/{pid}/scripts")
    assert r.status_code == 200
    assert r.json() == {"pending": None}


def test_get_scripts_returns_pending_none_when_job_unknown():
    client = TestClient(create_app())
    pid = _new_project(client)
    api_mod._scripts_jobs[pid] = "unknown-job"
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
    monkeypatch.setenv("SHORTSVIDS_WHISPER_MODEL", "turbo")

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


def test_transcribe_reads_shortsids_whisper_model(monkeypatch):
    client = TestClient(create_app())
    pid = _new_project(client)
    recorded = {}

    class RecordingTranscriber(FakeTranscriber):
        def __init__(self, model="base"):
            super().__init__(model)
            recorded["model"] = model

    monkeypatch.setattr(api_mod, "Transcriber", RecordingTranscriber)
    monkeypatch.setattr(api_mod, "build_proxy", lambda source, proxy: source)
    monkeypatch.setenv("SHORTSVIDS_WHISPER_MODEL", "small")

    r = client.post(f"/api/projects/{pid}/transcribe", json={})
    assert r.status_code == 200
    job = _wait_job(r.json()["job_id"])
    assert job.status == JobStatus.done
    assert recorded["model"] == "small"


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
    dummy = object()
    monkeypatch.setattr(api_mod, "_get_client", lambda: dummy)

    def fake_generate(client, transcript, duration_s, retries=2):
        assert client is dummy
        return [script]

    monkeypatch.setattr(api_mod, "generate_scripts", fake_generate)

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


def test_snapshot_put_rejects_garbage_numeric_cut():
    client = TestClient(create_app())
    pid = _new_project(client)
    bad = {
        "cuts": [{"source_start": "0.0;rm -rf", "source_end": 1.0, "caption_lines": []}],
        "music": None,
        "font": "Arial",
        "export_path": "",
    }
    r = client.put(f"/api/projects/{pid}/snapshot", json=bad)
    assert r.status_code == 422


def test_snapshot_put_coerces_numeric_strings_to_float():
    client = TestClient(create_app())
    pid = _new_project(client)
    body = {
        "cuts": [{"source_start": "0.0", "source_end": "1.5", "caption_lines": []}],
        "music": None,
        "font": "Arial",
        "export_path": "",
    }
    r = client.put(f"/api/projects/{pid}/snapshot", json=body)
    assert r.status_code == 200
    stored = json.loads((_project_dir(pid) / "editor.json").read_text())
    assert stored["cuts"][0]["source_start"] == 0.0
    assert isinstance(stored["cuts"][0]["source_end"], float)


def test_preview_builds_on_demand():
    client = TestClient(create_app())
    pid = _new_project(client)
    pdir = _project_dir(pid)
    shutil.copyfile(CLIP, pdir / "source.mp4")
    snapshot = {
        "cuts": [
            {"source_start": 0.0, "source_end": 1.0,
             "caption_lines": [{"start": 0.0, "end": 1.0, "text": "one"}]},
            {"source_start": 1.0, "source_end": 2.0,
             "caption_lines": [{"start": 1.0, "end": 2.0, "text": "two"}]},
        ],
        "music": None,
        "font": "Arial",
        "export_path": "",
    }
    storage_mod.save_json(pdir / "editor.json", snapshot)
    r = client.get(f"/api/projects/{pid}/preview.mp4")
    assert r.status_code == 200
    assert r.headers["content-type"] == "video/mp4"
    assert (pdir / "preview.mp4").exists()


def test_preview_missing_snapshot_404():
    client = TestClient(create_app())
    pid = _new_project(client)
    shutil.copyfile(CLIP, _project_dir(pid) / "source.mp4")
    r = client.get(f"/api/projects/{pid}/preview.mp4")
    assert r.status_code == 404


def test_preview_missing_source_404():
    client = TestClient(create_app())
    pid = _new_project(client)
    storage_mod.save_json(_project_dir(pid) / "editor.json", {
        "cuts": [],
        "music": None, "font": "Arial", "export_path": "",
    })
    r = client.get(f"/api/projects/{pid}/preview.mp4")
    assert r.status_code == 404


def test_export_job_wired(tmp_path, monkeypatch):
    client = TestClient(create_app())
    pid = _new_project(client)
    pdir = _project_dir(pid)
    storage_mod.save_json(pdir / "editor.json", {
        "cuts": [{"source_start": 0.0, "source_end": 0.8,
                  "caption_lines": [{"start": 0.0, "end": 0.8, "text": "hi"}]}],
        "music": None,
        "font": "Arial",
        "export_path": "",
    })

    seen = {}

    def fake_export(snap, source, project_dir, destination, get_font=None):
        assert isinstance(snap, EditorSnapshot)
        seen["destination"] = destination
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(b"mp4")
        return destination

    monkeypatch.setattr(api_mod, "export_video", fake_export)

    r = client.post(f"/api/projects/{pid}/export", json={"destination": str(tmp_path)})
    assert r.status_code == 200
    job = _wait_job(r.json()["job_id"])
    assert job.kind == "export"
    assert job.status == JobStatus.done
    out = seen["destination"]
    assert str(out) == str(tmp_path / "shortvids_export.mp4")
    assert out.exists()
    assert job.result == {"exported": True, "path": str(out)}
    editor = json.loads((pdir / "editor.json").read_text())
    assert editor["export_path"] == str(out)


def test_export_relative_destination_resolves_against_home(tmp_path, monkeypatch):
    client = TestClient(create_app())
    pid = _new_project(client)
    pdir = _project_dir(pid)
    storage_mod.save_json(pdir / "editor.json", {
        "cuts": [{"source_start": 0.0, "source_end": 0.8,
                  "caption_lines": [{"start": 0.0, "end": 0.8, "text": "hi"}]}],
        "music": None,
        "font": "Arial",
        "export_path": "",
    })
    fake_home = tmp_path / "home"
    monkeypatch.setattr(Path, "home", staticmethod(lambda: fake_home))

    seen = {}

    def fake_export(snap, source, project_dir, destination, get_font=None):
        seen["destination"] = destination
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(b"mp4")
        return destination

    monkeypatch.setattr(api_mod, "export_video", fake_export)

    r = client.post(f"/api/projects/{pid}/export", json={"destination": "myvids"})
    assert r.status_code == 200
    job = _wait_job(r.json()["job_id"])
    assert job.status == JobStatus.done
    out = seen["destination"]
    assert str(out) == str(fake_home / "myvids" / "shortvids_export.mp4")
    assert out.exists()
    editor = json.loads((pdir / "editor.json").read_text())
    assert editor["export_path"] == str(out)


def test_reveal_opens_export_folder(monkeypatch):
    client = TestClient(create_app())
    pid = _new_project(client)
    pdir = _project_dir(pid)
    storage_mod.save_json(pdir / "editor.json", {
        "cuts": [], "music": None, "font": "Arial",
        "export_path": "/tmp/vids/shortvids_export.mp4",
    })
    calls = []
    monkeypatch.setattr("app.media.subprocess.run", lambda args, **kw: calls.append(args))
    r = client.post(f"/api/projects/{pid}/reveal", json={})
    assert r.status_code == 200
    assert r.json() == {"ok": True}
    assert calls == [["xdg-open", "/tmp/vids"]]


def test_reveal_missing_export_path_404():
    client = TestClient(create_app())
    pid = _new_project(client)
    storage_mod.save_json(_project_dir(pid) / "editor.json", {
        "cuts": [], "music": None, "font": "Arial", "export_path": "",
    })
    r = client.post(f"/api/projects/{pid}/reveal", json={})
    assert r.status_code == 404


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


def _touch(pdir, name, ts):
    p = pdir / name
    p.touch()
    import os
    os.utime(p, (ts, ts))


def test_list_projects_enriched_draft():
    client = TestClient(create_app())
    pid = _new_project(client, "demo")
    body = client.get("/api/projects").json()
    by_id = {p["id"]: p for p in body["projects"]}
    assert by_id[pid]["status"] == "draft"
    assert by_id[pid]["duration_s"] is None
    assert isinstance(by_id[pid]["edited_at"], str)


def test_list_projects_processing_and_ready():
    client = TestClient(create_app())
    p1 = _new_project(client, "p1")
    p2 = _new_project(client, "p2")
    (config_mod.PROJECT_ROOT / p1 / "scripts.json").write_text("[]")
    (config_mod.PROJECT_ROOT / p2 / "editor.json").write_text('{"cuts": []}')
    body = client.get("/api/projects").json()
    by_id = {p["id"]: p for p in body["projects"]}
    assert by_id[p1]["status"] == "processing"
    assert by_id[p2]["status"] == "ready"


def test_list_projects_duration_and_edited_at(monkeypatch):
    client = TestClient(create_app())
    pid = _new_project(client, "demo")
    pdir = config_mod.PROJECT_ROOT / pid
    shutil.copyfile(CLIP, pdir / "source.mp4")
    monkeypatch.setattr(api_mod, "probe", lambda path: {"width": 320, "height": 240, "duration_s": 5.0})
    body = client.get("/api/projects").json()
    by_id = {p["id"]: p for p in body["projects"]}
    assert by_id[pid]["duration_s"] == 5.0
    assert isinstance(by_id[pid]["edited_at"], str)


def test_list_projects_handles_missing_source(monkeypatch):
    client = TestClient(create_app())
    pid = _new_project(client, "demo")
    monkeypatch.setattr(api_mod, "probe", lambda path: (_ for _ in ()).throw(OSError("nope")))
    body = client.get("/api/projects").json()
    by_id = {p["id"]: p for p in body["projects"]}
    assert by_id[pid]["duration_s"] is None


def test_frame_endpoint_returns_cached_jpeg():
    client = TestClient(create_app())
    pid = _new_project(client)
    pdir = config_mod.PROJECT_ROOT / pid
    shutil.copyfile(CLIP, pdir / "source.mp4")
    r = client.get(f"/api/projects/{pid}/frame?t=0.5")
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/jpeg"
    assert (pdir / "frame_0.5.jpg").exists()
    r2 = client.get(f"/api/projects/{pid}/frame?t=0.5")
    assert r2.status_code == 200


def test_frame_endpoint_missing_source_404():
    client = TestClient(create_app())
    pid = _new_project(client)
    r = client.get(f"/api/projects/{pid}/frame")
    assert r.status_code == 404
