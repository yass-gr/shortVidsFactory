import json
import secrets
from pathlib import Path

from .config import PROJECT_ROOT, project_dir


def save_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2))


def load_json(path: Path) -> dict:
    with open(path) as f:
        return json.load(f)


def create_project(name: str) -> str:
    while True:
        project_id = "p" + secrets.token_hex(4)
        if not (PROJECT_ROOT / project_id).exists():
            break
    pdir = project_dir(project_id)
    save_json(pdir / "project.json", {"id": project_id, "name": name})
    return project_id
