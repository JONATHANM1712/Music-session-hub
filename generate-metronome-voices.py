"""Generate crisp 1.mp3 ... 16.mp3 for Music Session Hub voice counting.

Requires internet access and edge-tts:
    py -m pip install edge-tts
    py generate-metronome-voices.py

Optional: install ffmpeg to remove both leading and trailing silence and to
level the loudness of the generated samples. Even without ffmpeg, the browser's
metronome-voice.js automatically detects and trims MP3 silence during playback.

Voice playback speed (100%-250%) and volume are adjusted independently in the
Metronome website; regenerate only to change the underlying speech recordings.
"""

import asyncio
from pathlib import Path
import shutil
import subprocess
import sys

try:
    import edge_tts
except ImportError:
    sys.exit("Missing edge-tts: run py -m pip install edge-tts")

WORDS = (
    "one", "two", "three", "four", "five", "six", "seven", "eight",
    "nine", "ten", "eleven", "twelve", "thirteen", "fourteen",
    "fifteen", "sixteen",
)
OUTPUT = Path(__file__).resolve().parent / "metronome-voice-counts"
VOICE = "en-US-AriaNeural"
# Shorter, clearly articulated base recordings work better at 200-280 BPM.
# Speech speed in the web app additionally stretches these at playback time.
GENERATION_RATE = "+35%"


def polish_with_ffmpeg(path: Path) -> None:
    """Cut silence at both ends, with gentle dynamics for audible short words."""
    if not shutil.which("ffmpeg"):
        return  # The JavaScript player will trim silence automatically.
    output = path.with_name(path.stem + ".clean.mp3")
    filter_chain = (
        "silenceremove=start_periods=1:start_threshold=-38dB,"
        "areverse,"
        "silenceremove=start_periods=1:start_threshold=-38dB,"
        "areverse,"
        "acompressor=threshold=-20dB:ratio=2:attack=5:release=30,"
        "loudnorm=I=-16:TP=-2:LRA=7"
    )
    result = subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
         "-i", str(path), "-af", filter_chain,
         "-codec:a", "libmp3lame", "-b:a", "160k", str(output)],
        capture_output=True, text=True,
    )
    if result.returncode == 0 and output.exists() and output.stat().st_size > 500:
        output.replace(path)
    else:
        output.unlink(missing_ok=True)
        print(f"  Keeping untrimmed sample for {path.name}: {result.stderr.strip()}")


async def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    print(f"Generating 16 counts with {VOICE} at {GENERATION_RATE} base speed")
    if not shutil.which("ffmpeg"):
        print("ffmpeg not installed — browser-side silence trimming will be used.")
    for number, word in enumerate(WORDS, start=1):
        target = OUTPUT / f"{number}.mp3"
        print(f"{number:02d}/16 — {word}")
        await edge_tts.Communicate(
            text=word, voice=VOICE, rate=GENERATION_RATE, pitch="+0Hz"
        ).save(str(target))
        polish_with_ffmpeg(target)
    print(f"Done: {OUTPUT}")
    print("Upload the complete folder alongside metronome.html on GitHub Pages.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit("Voice generation interrupted.")
