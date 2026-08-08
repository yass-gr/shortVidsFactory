import subprocess
from pathlib import Path


def build_preview(source: Path, track: list[dict], out_path: Path, width: int = 540) -> Path:
    filters: list[str] = []
    for i, cut in enumerate(track):
        filters.append(
            f"[0:v]trim=start={cut['start']}:end={cut['end']},"
            f"scale={width}:-2,setpts=PTS-STARTPTS[v{i}]"
        )
        filters.append(
            f"[0:a]atrim=start={cut['start']}:end={cut['end']},"
            f"asetpts=PTS-STARTPTS[a{i}]"
        )
    chain = "".join(f"[v{i}][a{i}]" for i in range(len(track)))
    filters.append(f"{chain}concat=n={len(track)}:v=1:a=1[outv][outa]")
    vf = ";".join(filters)
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(source), "-filter_complex", vf,
         "-map", "[outv]", "-map", "[outa]",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(out_path)],
        check=True, capture_output=True,
    )
    return out_path