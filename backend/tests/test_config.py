import os

import app.config as config_mod


def test_load_backend_env_sets_vars_from_dotenv(tmp_path, monkeypatch):
    monkeypatch.delenv("SHORTSVIDS_GEMINI_API_KEY", raising=False)
    env_file = tmp_path / ".env"
    env_file.write_text("SHORTSVIDS_GEMINI_API_KEY=secret123\n")

    config_mod.load_backend_env(env_file)

    assert os.environ["SHORTSVIDS_GEMINI_API_KEY"] == "secret123"


def test_load_backend_env_does_not_override_existing_env(tmp_path, monkeypatch):
    monkeypatch.setenv("SHORTSVIDS_GEMINI_MODEL", "from-export")
    env_file = tmp_path / ".env"
    env_file.write_text("SHORTSVIDS_GEMINI_MODEL=from-dotenv\n")

    config_mod.load_backend_env(env_file)

    assert os.environ["SHORTSVIDS_GEMINI_MODEL"] == "from-export"


def test_load_backend_env_missing_file_is_a_noop(tmp_path):
    config_mod.load_backend_env(tmp_path / "missing.env")