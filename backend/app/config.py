from pathlib import Path

PROJECT_ROOT: Path = Path("projects")
PROJECT_ROOT.mkdir(exist_ok=True)


def project_dir(project_id: str) -> Path:
    d = PROJECT_ROOT / project_id
    d.mkdir(parents=True, exist_ok=True)
    return d
