from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT: Path = Path("projects")
PROJECT_ROOT.mkdir(exist_ok=True)


def load_backend_env(dotenv_path: Path | None = None) -> None:
    """Load backend/.env into os.environ (existing shell env wins over the file)."""
    path = dotenv_path or Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(path)


load_backend_env()


def project_dir(project_id: str) -> Path:
    d = PROJECT_ROOT / project_id
    d.mkdir(parents=True, exist_ok=True)
    return d
