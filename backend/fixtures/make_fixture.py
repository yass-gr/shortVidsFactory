import subprocess
from pathlib import Path

OUT_DIR = Path(__file__).parent.parent / "tests" / "fixtures"

CLIP_VIDEO = OUT_DIR / "clip_video.mp4"
CLIP_AUDIO = OUT_DIR / "clip.mp4"
TONE = OUT_DIR / "tone.wav"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if not CLIP_VIDEO.exists():
        subprocess.run([
            "ffmpeg", "-y", "-f", "lavfi",
            "-i", "testsrc2=size=320x240:rate=30:duration=3",
            "-f", "lavfi",
            "-i", "sine=frequency=440:duration=3",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
            str(CLIP_VIDEO),
        ], check=True)
    if not TONE.exists():
        subprocess.run([
            "ffmpeg", "-y", "-f", "lavfi",
            "-i", "sine=frequency=440:duration=3",
            str(TONE),
        ], check=True)
    if not CLIP_AUDIO.exists():
        subprocess.run([
            "ffmpeg", "-y", "-i", str(CLIP_VIDEO), "-i", str(TONE),
            "-c:v", "copy", "-c:a", "aac", "-shortest", str(CLIP_AUDIO),
        ], check=True)


if __name__ == "__main__":
    main()
