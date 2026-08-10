import os
import shutil
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, ValidationError

from .config import PROJECT_ROOT, project_dir
from .editor import EditorSnapshot
from .export import default_font, export_video
from .jobs import JobStatus, manager
from .media import build_proxy, open_destination, probe
from .music import CombinedMusicSource, LocalFilesMusicSource, SocialExtractorMusicSource
from .preview import build_preview
from .scriptwriter import generate_scripts
from .scripts import validate_script_candidates
from .storage import create_project, load_json, save_json
from .transcribe import Transcriber

router = APIRouter()

_scripts_jobs: dict[str, str] = {}


def _get_client():
    from .ai import GeminiClient

    return GeminiClient()


# --- job workers -------------------------------------------------------------


def _transcribe_job(args: dict):
    project_id = args["project_id"]
    pdir = project_dir(project_id)
    model = os.environ.get("SHORTSVIDS_WHISPER_MODEL", "base")
    transcriber = Transcriber(model=model)
    words = transcriber.transcribe(str(pdir / "source.mp4"))
    data = [w.model_dump() for w in words]
    save_json(pdir / "transcript.json", data)
    return data


def _scripts_job(args: dict):
    project_id = args["project_id"]
    pdir = project_dir(project_id)
    transcript = load_json(pdir / "transcript.json")
    duration_s = probe(pdir / "source.mp4")["duration_s"]
    scripts = generate_scripts(_get_client(), transcript, duration_s)
    data = [s.model_dump() for s in scripts]
    save_json(pdir / "scripts.json", data)
    return data


def _export_job(args: dict):
    project_id = args["project_id"]
    pdir = _require_project(project_id)
    snapshot = EditorSnapshot.model_validate(load_json(pdir / "editor.json"))
    destination = Path(args["destination"])
    if not destination.is_absolute():
        destination = Path.home() / destination
    if destination.suffix == ".mp4":
        out_file = destination
    else:
        destination.mkdir(parents=True, exist_ok=True)
        out_file = destination / "shortvids_export.mp4"
    export_video(snapshot, pdir / "source.mp4", pdir, out_file, default_font)
    snapshot.export_path = str(out_file)
    save_json(pdir / "editor.json", snapshot.model_dump())
    return {"exported": True, "path": str(out_file)}


# --- helpers -----------------------------------------------------------------


def _require_project(project_id: str) -> Path:
    root = PROJECT_ROOT.resolve()
    pdir = (root / project_id).resolve()
    if not pdir.is_relative_to(root):
        raise HTTPException(status_code=404, detail="Project not found")
    if not pdir.is_dir():
        raise HTTPException(status_code=404, detail="Project not found")
    return pdir


def _music_source():
    return CombinedMusicSource(
        social=SocialExtractorMusicSource(),
        local=LocalFilesMusicSource(),
    )


@router.get("/music")
def list_music():
    tracks = _music_source().list_tracks()
    return {
        "tracks": [
            {"id": t.id, "title": t.title, "source": t.source,
             "path": str(t.path) if t.path else None}
            for t in tracks
        ],
        "social": False,
        "uses_local": True,
    }


# --- project routes ----------------------------------------------------------


class CreateProjectBody(BaseModel):
    name: str


@router.post("/projects", status_code=201)
def api_create_project(body: CreateProjectBody):
    project_id = create_project(body.name)
    return {"id": project_id, "name": body.name}


@router.get("/projects")
def api_list_projects():
    projects = []
    for d in sorted(PROJECT_ROOT.iterdir()):
        if not d.is_dir():
            continue
        meta = {"id": d.name, "name": d.name}
        try:
            meta = load_json(d / "project.json")
        except FileNotFoundError:
            pass

        duration_s = None
        source = d / "source.mp4"
        if source.exists():
            try:
                duration_s = probe(source)["duration_s"]
            except Exception:  # uninspectable media / missing ffmpeg
                duration_s = None

        if (d / "editor.json").exists():
            status = "ready"
        elif (d / "scripts.json").exists():
            status = "processing"
        else:
            status = "draft"

        edited_at = None
        candidates = [d] + [d / n for n in
                            ("project.json", "source.mp4", "transcript.json",
                             "scripts.json", "editor.json")]
        mtimes = [p.stat().st_mtime for p in candidates if p.exists()]
        if mtimes:
            edited_at = __import__("datetime").datetime.fromtimestamp(
                max(mtimes)).isoformat()

        projects.append({
            "id": meta.get("id", d.name),
            "name": meta.get("name", d.name),
            "duration_s": duration_s,
            "status": status,
            "edited_at": edited_at,
        })
    return {"projects": projects}


class _EmptyBody(BaseModel):
    pass


@router.post("/projects/{project_id}/entries")
def api_upload_entry(project_id: str, file: UploadFile = File(...)):
    pdir = _require_project(project_id)
    source = pdir / "source.mp4"
    with source.open("wb") as out:
        shutil.copyfileobj(file.file, out)
    proxy = build_proxy(source, pdir / "proxy.mp4")
    info = probe(source)
    job = manager.submit("transcribe", _transcribe_job, {"project_id": project_id})
    return {
        "project_id": project_id,
        "job_id": job.id,
        "media": {
            "width": info["width"],
            "height": info["height"],
            "duration_s": info["duration_s"],
            "source": str(source),
            "proxy": str(proxy),
        },
    }


@router.post("/projects/{project_id}/transcribe")
def api_transcribe(project_id: str, body: _EmptyBody | None = None):
    _require_project(project_id)
    job = manager.submit("transcribe", _transcribe_job, {"project_id": project_id})
    return {"id": job.id, "job_id": job.id}


@router.post("/projects/{project_id}/scripts")
def api_generate_scripts(project_id: str, body: _EmptyBody | None = None):
    _require_project(project_id)
    job = manager.submit("scripts", _scripts_job, {"project_id": project_id})
    _scripts_jobs[project_id] = job.id
    return {"job_id": job.id}


@router.get("/projects/{project_id}/scripts")
def api_get_scripts(project_id: str):
    pdir = _require_project(project_id)
    path = pdir / "scripts.json"
    if path.exists():
        data = load_json(path)
        return data if isinstance(data, list) else [data]
    pending = _scripts_jobs.get(project_id)
    if pending:
        try:
            job = manager.get(pending)
        except KeyError:
            job = None
        if job is None or job.status == JobStatus.error:
            pending = None
    return {"pending": pending}


class ApproveBody(BaseModel):
    script_id: str


@router.post("/projects/{project_id}/approve")
def api_approve_script(project_id: str, body: ApproveBody):
    pdir = _require_project(project_id)
    try:
        transcript = load_json(pdir / "transcript.json")
        scripts_raw = load_json(pdir / "scripts.json")
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="transcript/scripts not generated yet - run upload and generate first",
        )
    if isinstance(scripts_raw, dict):
        scripts_raw = [scripts_raw]
    chosen = next((s for s in scripts_raw if s.get("id") == body.script_id), None)
    if chosen is None:
        raise HTTPException(status_code=404, detail="Script not found")
    validated = validate_script_candidates([chosen], transcript)
    snapshot = {
        "cuts": validated[0].model_dump()["cuts"],
        "music": None,
        "font": "Arial",
        "export_path": "",
    }
    save_json(pdir / "editor.json", snapshot)
    return snapshot


@router.get("/projects/{project_id}/snapshot")
def api_get_snapshot(project_id: str):
    pdir = _require_project(project_id)
    path = pdir / "editor.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="No snapshot yet")
    return load_json(path)


@router.put("/projects/{project_id}/snapshot")
def api_put_snapshot(project_id: str, snapshot: dict):
    pdir = _require_project(project_id)
    try:
        validated = EditorSnapshot.model_validate(snapshot)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=e.errors())
    save_json(pdir / "editor.json", validated.model_dump())
    return validated.model_dump()


@router.get("/projects/{project_id}/preview.mp4")
def api_preview(project_id: str):
    pdir = _require_project(project_id)
    try:
        snapshot = load_json(pdir / "editor.json")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="No snapshot yet")
    track = [{"start": c["source_start"], "end": c["source_end"]} for c in snapshot.get("cuts", [])]
    source = pdir / "source.mp4"
    if not source.exists():
        raise HTTPException(status_code=404, detail="Source video not uploaded")
    path = build_preview(source, track, pdir / "preview.mp4", width=540)
    return FileResponse(path, media_type="video/mp4", filename="preview.mp4")


class ExportBody(BaseModel):
    destination: str


@router.post("/projects/{project_id}/export")
def api_export(project_id: str, body: ExportBody):
    _require_project(project_id)
    job = manager.submit("export", _export_job,
                         {"project_id": project_id, "destination": body.destination})
    return {"job_id": job.id}


@router.post("/projects/{project_id}/reveal")
def api_reveal(project_id: str, body: _EmptyBody | None = None):
    pdir = _require_project(project_id)
    try:
        snapshot = load_json(pdir / "editor.json")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="No export yet")
    export_path = snapshot.get("export_path", "")
    if not export_path:
        raise HTTPException(status_code=404, detail="No export yet")
    open_destination(Path(export_path).parent)
    return {"ok": True}


# --- job routes --------------------------------------------------------------


@router.get("/jobs/{job_id}/stream")
def api_job_stream(job_id: str):
    try:
        job = manager.get(job_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Job not found")
    return StreamingResponse(manager.event_stream(job_id), media_type="text/event-stream")
