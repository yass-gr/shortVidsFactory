import json
import subprocess
from pathlib import Path


def probe(path: Path) -> dict[str, float | int]:
    out = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", "-show_format", str(path)],
        capture_output=True, check=True, text=True,
    )
    data = json.loads(out.stdout)
    vs = next(s for s in data["streams"] if s["codec_type"] == "video")
    return {
        "width": int(vs["width"]),
        "height": int(vs["height"]),
        "duration_s": float(data["format"]["duration"]),
    }


def build_proxy(source: Path, proxy: Path, width: int = 540) -> Path:
    subprocess.run([
        "ffmpeg", "-y", "-i", str(source),
        "-vf", f"scale={width}:-2",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
        str(proxy),
    ], check=True, capture_output=True)
    return proxy


def path_escaped(path: Path) -> str:
    escaped = path.as_posix().replace("'", "'\\''")
    return f"'{escaped}'"
