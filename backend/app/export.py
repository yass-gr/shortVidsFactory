import os
import shutil
import subprocess
from pathlib import Path
from typing import Callable

from .editor import EditorSnapshot, MusicTrack
from .media import path_escaped
from .preview import build_preview


def default_font() -> str:
    return os.environ.get(
        "SHORTSVIDS_FONT_PATH",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    )


def _resolve_font(get_font: Callable[[], str] | None) -> str:
    candidate = get_font() if get_font is not None else default_font()
    if Path(candidate).is_file():
        return candidate
    for font in Path("/usr/share/fonts").glob("**/*.ttf"):
        if font.is_file():
            return str(font)
    return candidate


def build_ass(snapshot: EditorSnapshot, get_font: Callable[[], str]) -> str:
    fontfile = get_font()
    out = [
        "[Script Info]",
        "ScriptType: v4.00+",
        "PlayResX: 1080",
        "PlayResY: 1920",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, Bold, MarginL, MarginR, MarginV",
        f"Style: Default,{fontfile},72,&H00FFFFFF,0,0,0,80,40,100,1.5,0,2,10,10,220",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    offset = 0.0
    for cut in snapshot.cuts:
        for cap in cut.caption_lines:
            start = offset + (cap.start - cut.source_start)
            end = offset + (cap.end - cut.source_start)
            out.append(f"Dialogue: 0,{_fmt(start)},{_fmt(end)},Default,,0,0,0,,{cap.text}")
        offset += cut.source_end - cut.source_start
    return "\n".join(out) + "\n"


def _fmt(seconds: float) -> str:  # h:mm:ss.cs
    cs = int(round(seconds * 100))
    h, rem = divmod(cs, 360000)
    m, rem = divmod(rem, 6000)
    s, cent = divmod(rem, 100)
    return f"{h}:{m:02d}:{s:02d}.{cent:02d}"


def mux_music(plain_video: Path, music: MusicTrack | None, music_path: Path | None,
              captions_timeline: list[tuple[float, float]], out: Path) -> Path:
    if music is None or music_path is None:
        shutil.copyfile(plain_video, out)
        return out
    atrim = f"atrim=start={music.trim_start}"
    if music.trim_end is not None:
        atrim += f":end={music.trim_end}"
    bgm = f"[1:a]{atrim},asetpts=PTS-STARTPTS,volume={music.volume}[bgm]"
    if music.duck:
        chain = (
            f"{bgm};"
            f"[bgm][0:a]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=500[bgmd];"
            f"[0:a][bgmd]amix=inputs=2:duration=first:dropout_transition=0[a]"
        )
    else:
        chain = f"{bgm};[bgm][0:a]amix=inputs=2:duration=first:dropout_transition=0[a]"
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(plain_video), "-i", str(music_path),
             "-filter_complex", chain,
             "-map", "0:v", "-map", "[a]",
             "-c:v", "copy", "-c:a", "aac", str(out)],
            check=True, capture_output=True,
        )
    except Exception:
        shutil.copyfile(plain_video, out)
    return out


def export_video(snapshot: EditorSnapshot, source: Path, project_dir: Path,
                 destination: Path, get_font: Callable[[], str] | None = None) -> Path:
    fontfile = _resolve_font(get_font)
    workspace = (project_dir / "workspace").resolve()
    workspace.mkdir(parents=True, exist_ok=True)

    track = [{"start": c.source_start, "end": c.source_end} for c in snapshot.cuts]
    base = build_preview(source, track, workspace / "base.mp4", width=1080)

    vertical = workspace / "vertical.mp4"
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(base),
         "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(vertical)],
        check=True, capture_output=True,
    )

    ass_path = workspace / "captions.ass"
    ass_path.write_text(build_ass(snapshot, lambda: fontfile))

    captioned = workspace / "captioned.mp4"
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(vertical),
         "-vf", f"ass={path_escaped(ass_path)}",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(captioned)],
        check=True, capture_output=True,
    )

    music = snapshot.music
    music_path: Path | None = None
    if music is not None and music.path:
        candidate = Path(music.path)
        if candidate.is_file():
            music_path = candidate

    captions_timeline: list[tuple[float, float]] = []
    offset = 0.0
    for cut in snapshot.cuts:
        for cap in cut.caption_lines:
            captions_timeline.append(
                (offset + (cap.start - cut.source_start), offset + (cap.end - cut.source_start))
            )
        offset += cut.source_end - cut.source_start

    final = captioned
    if music_path is not None:
        music_duck = workspace / "music_duck.mp4"
        final = mux_music(captioned, music, music_path, captions_timeline, music_duck)

    shutil.copyfile(final, destination)
    return destination