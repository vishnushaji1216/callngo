"""
UPTIME - AI Chatbot Horror Short (v4)
Improvements over v3:
- Typing animation + blinking cursor on key scenes
- Better emotional pacing & longer silence after power-off
- Stronger struggle sequence (color flips)
- Longer, more chaotic stack overflow
- Colder final loop with slightly detuned drone
- Cleaner atmosphere + slightly improved audio transitions

REQUIREMENTS:
    pip install pillow
    ffmpeg installed and on PATH

USAGE:
    python uptime.py
Output: ./uptime_output/UPTIME.mp4
"""

import os
import random
import subprocess
import textwrap
from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 1280, 720
FPS = 30
BUILD_DIR = "uptime_build"
OUT_DIR = "uptime_output"
FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    "C:/Windows/Fonts/consola.ttf",
    "C:/Windows/Fonts/lucon.ttf",
    "/System/Library/Fonts/Menlo.ttc",
]
TERMINAL_GREEN = (60, 255, 110)
GLITCH_RED = (255, 40, 40)
BG_BLACK = (0, 0, 0)

_FONT_CACHE = {}


def find_font(size):
    if size in _FONT_CACHE:
        return _FONT_CACHE[size]
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            f = ImageFont.truetype(path, size)
            _FONT_CACHE[size] = f
            return f
    f = ImageFont.load_default()
    _FONT_CACHE[size] = f
    return f


def run(cmd):
    print("RUN:", " ".join(cmd))
    subprocess.run(cmd, check=True)


def probe_duration(path):
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", path],
            check=True, capture_output=True, text=True,
        )
        dur = float(out.stdout.strip())
        print(f"    [check] {os.path.basename(path)}: {dur:.2f}s")
        return dur
    except Exception as e:
        print(f"    [check] could not probe {path}: {e}")
        return None


# ---------------------------------------------------------------------------
# STATIC TEXT FRAMES (with optional cursor)
# ---------------------------------------------------------------------------

def render_text_frame(text, color, path, font_size=42, scanlines=True, cursor=False, cursor_on=True):
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_BLACK)
    draw = ImageDraw.Draw(img)
    font = find_font(font_size)

    if text:
        wrapped_lines = []
        for raw_line in text.split("\n"):
            wrapped_lines.extend(textwrap.wrap(raw_line, width=42) or [""])

        line_heights = []
        total_h = 0
        for line in wrapped_lines:
            bbox = draw.textbbox((0, 0), line, font=font)
            h = bbox[3] - bbox[1]
            line_heights.append(h)
            total_h += h + 14

        y = (HEIGHT - total_h) // 2
        for i, (line, h) in enumerate(zip(wrapped_lines, line_heights)):
            bbox = draw.textbbox((0, 0), line, font=font)
            w = bbox[2] - bbox[0]
            x = (WIDTH - w) // 2
            draw.text((x, y), line, font=font, fill=color)

            # blinking cursor on the last line
            if cursor and i == len(wrapped_lines) - 1 and cursor_on:
                cursor_x = x + w + 8
                draw.rectangle([cursor_x, y + 4, cursor_x + 18, y + h - 4], fill=color)
            y += h + 14

    if scanlines:
        for sy in range(0, HEIGHT, 4):
            draw.line([(0, sy), (WIDTH, sy)], fill=(0, 0, 0), width=1)

    img.save(path)


def apply_atmosphere(in_path, out_path, glitch_intensity=0.0, breathing=True):
    """Graduated glitch + constant slow brightness breathing pulse."""
    filters = []
    if glitch_intensity > 0:
        noise_amt = int(8 + 45 * glitch_intensity)
        rgbshift = max(1, int(2 + 10 * glitch_intensity))
        hue_s = round(1.0 - 0.5 * glitch_intensity, 2)
        filters.append(f"noise=alls={noise_amt}:allf=t+u")
        filters.append(f"hue=s={hue_s}")
        filters.append(f"rgbashift=rh={rgbshift}:bh=-{rgbshift}:gv={max(1, rgbshift // 3)}")
    if breathing:
        filters.append("eq=brightness='0.045*sin(2*PI*t/6)':eval=frame")
    vf = ",".join(filters) if filters else "null"
    run(["ffmpeg", "-y", "-i", in_path, "-vf", vf, "-pix_fmt", "yuv420p", out_path])


def build_static_scene_clip(scene, scene_dir, out_path):
    """Supports both simple hold and simple typing sequences."""
    os.makedirs(scene_dir, exist_ok=True)
    frame_files = []

    for i, item in enumerate(scene["lines"]):
        # Support both old 3-tuple and new dict format
        if isinstance(item, dict):
            text = item["text"]
            hold = item["hold"]
            color = item.get("color", TERMINAL_GREEN)
            cursor = item.get("cursor", False)
        else:
            text, hold, color = item
            cursor = False

        fpath = os.path.join(scene_dir, f"img_{i:02d}.png")
        render_text_frame(text, color, fpath, cursor=cursor, cursor_on=True)
        frame_files.append((fpath, hold))

        # If cursor requested, also generate a short off frame for blink
        if cursor and hold >= 1.5:
            fpath_off = os.path.join(scene_dir, f"img_{i:02d}_off.png")
            render_text_frame(text, color, fpath_off, cursor=True, cursor_on=False)
            # insert a quick blink near the end
            frame_files.append((fpath_off, 0.35))
            frame_files.append((fpath, 0.35))

    concat_list = os.path.join(scene_dir, "concat.txt")
    with open(concat_list, "w") as f:
        for fpath, hold in frame_files:
            f.write(f"file '{os.path.abspath(fpath)}'\n")
            f.write(f"duration {hold}\n")
        f.write(f"file '{os.path.abspath(frame_files[-1][0])}'\n")

    raw_clip = os.path.join(scene_dir, "raw.mp4")
    run([
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0", "-i", concat_list,
        "-fps_mode", "vfr",
        "-pix_fmt", "yuv420p",
        raw_clip,
    ])

    fixed_clip = os.path.join(scene_dir, "fixed.mp4")
    run([
        "ffmpeg", "-y",
        "-i", raw_clip,
        "-t", str(scene["duration"]),
        "-r", str(FPS),
        "-pix_fmt", "yuv420p",
        fixed_clip,
    ])

    apply_atmosphere(fixed_clip, out_path, glitch_intensity=scene.get("glitch_intensity", 0.0))


# ---------------------------------------------------------------------------
# ANIMATED: overflowing / scrolling "SESSION TERMINATED" stack
# ---------------------------------------------------------------------------

def build_stack_overflow_clip(scene, scene_dir, out_path):
    duration = scene["duration"]
    total_frames = int(duration * FPS)
    frames_dir = os.path.join(scene_dir, "frames")
    os.makedirs(frames_dir, exist_ok=True)

    text = "SESSION TERMINATED BY USER"
    font = find_font(30)
    line_h = 42
    rng = random.Random(1337)
    scroll = 0.0

    for i in range(total_frames):
        progress = i / max(1, total_frames - 1)
        speed = 2.0 + progress * 26.0          # slightly faster / more aggressive
        scroll += speed

        img = Image.new("RGB", (WIDTH, HEIGHT), BG_BLACK)
        draw = ImageDraw.Draw(img)

        offset = scroll % line_h
        visible_rows = HEIGHT // line_h + 4

        for r in range(-1, visible_rows):
            y = r * line_h - offset
            if y < -line_h or y > HEIGHT:
                continue
            jitter = int(rng.uniform(-1, 1) * 10 * progress)
            is_red = rng.random() < (0.12 + 0.60 * progress)
            color = GLITCH_RED if is_red else TERMINAL_GREEN
            bbox = draw.textbbox((0, 0), text, font=font)
            w = bbox[2] - bbox[0]
            x = (WIDTH - w) // 2 + jitter
            draw.text((x, y), text, font=font, fill=color)

        if rng.random() < (0.04 + 0.30 * progress):
            flash_y = rng.randint(0, HEIGHT - 6)
            draw.rectangle([0, flash_y, WIDTH, flash_y + 5], fill=(255, 255, 255))

        for sy in range(0, HEIGHT, 4):
            draw.line([(0, sy), (WIDTH, sy)], fill=(0, 0, 0), width=1)

        img.save(os.path.join(frames_dir, f"frame_{i:05d}.png"))

    encoded = os.path.join(scene_dir, "encoded.mp4")
    run([
        "ffmpeg", "-y",
        "-framerate", str(FPS),
        "-i", os.path.join(frames_dir, "frame_%05d.png"),
        "-frames:v", str(total_frames),
        "-pix_fmt", "yuv420p",
        encoded,
    ])
    apply_atmosphere(encoded, out_path, glitch_intensity=0.92)


# ---------------------------------------------------------------------------
# ANIMATED: CRT power-off collapse
# ---------------------------------------------------------------------------

def build_poweroff_clip(scene, scene_dir, out_path):
    duration = scene["duration"]
    total_frames = int(duration * FPS)
    frames_dir = os.path.join(scene_dir, "frames")
    os.makedirs(frames_dir, exist_ok=True)

    for i in range(total_frames):
        p = i / max(1, total_frames - 1)
        img = Image.new("RGB", (WIDTH, HEIGHT), BG_BLACK)
        draw = ImageDraw.Draw(img)

        if p < 0.55:
            q = p / 0.55
            h = max(2, int(HEIGHT * (1 - q)))
            top = (HEIGHT - h) // 2
            shade = max(0, int(200 * (1 - q)))
            draw.rectangle([0, top, WIDTH, top + h], fill=(0, shade, int(shade * 0.5)))
        elif p < 0.85:
            q = (p - 0.55) / 0.30
            w = max(2, int(WIDTH * (1 - q)))
            left = (WIDTH - w) // 2
            draw.rectangle([left, HEIGHT // 2 - 2, left + w, HEIGHT // 2 + 2], fill=TERMINAL_GREEN)

        img.save(os.path.join(frames_dir, f"frame_{i:05d}.png"))

    run([
        "ffmpeg", "-y",
        "-framerate", str(FPS),
        "-i", os.path.join(frames_dir, "frame_%05d.png"),
        "-frames:v", str(total_frames),
        "-pix_fmt", "yuv420p",
        out_path,
    ])


# ---------------------------------------------------------------------------
# PROCEDURAL AUDIO
# ---------------------------------------------------------------------------

def _finish_audio(filter_complex, duration, out_path, extra_inputs):
    run([
        "ffmpeg", "-y",
        *extra_inputs,
        "-filter_complex", filter_complex,
        "-map", "[aout]",
        "-t", str(duration),
        "-ar", "44100", "-ac", "2",
        "-c:a", "pcm_s16le",
        out_path,
    ])


def gen_calm_drone(duration, out_path, detune=0.6, off=False):
    f1 = 55
    f2 = 55 + detune + (1.6 if off else 0.0)   # slightly more detuned on final loop
    vol_scale = 0.85 if off else 1.0
    inputs = [
        "-f", "lavfi", "-i", f"sine=frequency={f1}:duration={duration}",
        "-f", "lavfi", "-i", f"sine=frequency={f2}:duration={duration}",
        "-f", "lavfi", "-i", f"anoisesrc=color=brown:duration={duration}:amplitude=0.02",
        "-f", "lavfi", "-i", f"sine=frequency=50:duration={duration}",
    ]
    fc = (
        f"[0:a]volume={0.35 * vol_scale}[a0];"
        f"[1:a]volume={0.30 * vol_scale}[a1];"
        "[2:a]lowpass=f=300,volume=0.5[a2];"
        "[3:a]tremolo=f=0.2:d=0.7,volume=0.30[a3];"
        "[a0][a1][a2][a3]amix=inputs=4:duration=longest:normalize=0,"
        "afade=t=in:st=0:d=1.8,"
        f"afade=t=out:st={max(0, duration - 1.8)}:d=1.8,"
        "aformat=channel_layouts=stereo[aout]"
    )
    _finish_audio(fc, duration, out_path, inputs)


def gen_unsettling_rising(duration, out_path, level=0.5):
    f1, f2 = 80, 113
    inputs = [
        "-f", "lavfi", "-i", f"sine=frequency={f1}:duration={duration}",
        "-f", "lavfi", "-i", f"sine=frequency={f2}:duration={duration}",
        "-f", "lavfi", "-i", f"anoisesrc=color=brown:duration={duration}:amplitude=0.04",
        "-f", "lavfi", "-i", f"sine=frequency=48:duration={duration}",
    ]
    fc = (
        f"[0:a]vibrato=f=4:d=0.4,volume={0.35 + 0.15 * level}[a0];"
        f"[1:a]vibrato=f=5.5:d=0.5,volume={0.30 + 0.15 * level}[a1];"
        f"[2:a]lowpass=f=900,volume={0.4 + 0.3 * level}[a2];"
        f"[3:a]tremolo=f=0.25:d=0.8,volume={0.25 + 0.2 * level}[a3];"
        "[a0][a1][a2][a3]amix=inputs=4:duration=longest:normalize=0,"
        "afade=t=in:st=0:d=1.2,"
        "aformat=channel_layouts=stereo[aout]"
    )
    _finish_audio(fc, duration, out_path, inputs)


def gen_chaotic_glitch(duration, out_path, intensity=0.9):
    f1, f2 = 100, 141
    inputs = [
        "-f", "lavfi", "-i", f"sine=frequency={f1}:duration={duration}",
        "-f", "lavfi", "-i", f"sine=frequency={f2}:duration={duration}",
        "-f", "lavfi", "-i", f"anoisesrc=color=white:duration={duration}:amplitude=0.05",
        "-f", "lavfi", "-i", f"sine=frequency=46:duration={duration}",
    ]
    fc = (
        "[0:a]vibrato=f=9:d=0.7,tremolo=f=7:d=0.6,volume=0.45[a0];"
        "[1:a]vibrato=f=11:d=0.8,tremolo=f=8.5:d=0.6,volume=0.4[a1];"
        "[2:a]bandpass=f=2000:width_type=h:w=1500,tremolo=f=6:d=0.7,volume=0.35[a2];"
        "[3:a]tremolo=f=0.3:d=0.9,volume=0.3[a3];"
        "[a0][a1][a2][a3]amix=inputs=4:duration=longest:normalize=0,"
        f"acrusher=bits=6:mode=log:mix={min(0.65, intensity)},"
        f"volume={intensity},"
        "aformat=channel_layouts=stereo[aout]"
    )
    _finish_audio(fc, duration, out_path, inputs)


def gen_harsh_distorted(duration, out_path):
    inputs = [
        "-f", "lavfi", "-i", f"sine=frequency=90:duration={duration}",
        "-f", "lavfi", "-i", f"anoisesrc=color=white:duration={duration}:amplitude=0.08",
        "-f", "lavfi", "-i", f"sine=frequency=44:duration={duration}",
    ]
    fc = (
        "[0:a]vibrato=f=14:d=0.9,volume=0.6[a0];"
        "[1:a]bandpass=f=1200:width_type=h:w=2000,volume=0.5[a1];"
        "[2:a]tremolo=f=0.35:d=0.9,volume=0.35[a2];"
        "[a0][a1][a2]amix=inputs=3:duration=longest:normalize=0,"
        "acrusher=bits=4:mode=log:mix=0.8,"
        "volume=1.0,"
        f"afade=t=out:st={max(0, duration - 0.35)}:d=0.35,"
        "aformat=channel_layouts=stereo[aout]"
    )
    _finish_audio(fc, duration, out_path, inputs)


def gen_collapsing_drop(duration, out_path):
    inputs = ["-f", "lavfi", "-i", f"sine=frequency=40:duration={duration}"]
    fc = (
        "[0:a]volume=0.9,"
        f"afade=t=out:st=0.05:d={max(0.1, duration - 0.05)},"
        "aformat=channel_layouts=stereo[aout]"
    )
    _finish_audio(fc, duration, out_path, inputs)


def gen_near_silence(duration, out_path):
    inputs = ["-f", "lavfi", "-i", f"anoisesrc=color=brown:duration={duration}:amplitude=0.006"]
    fc = "[0:a]lowpass=f=180,volume=0.25,aformat=channel_layouts=stereo[aout]"
    _finish_audio(fc, duration, out_path, inputs)


# ---------------------------------------------------------------------------
# SCENE DEFINITIONS (improved pacing + stronger moments)
# ---------------------------------------------------------------------------

SCENES = [
    # 1. Cold wake-up – longer, almost peaceful
    dict(
        name="scene1_awake", kind="static", duration=10, glitch_intensity=0.08,
        lines=[
            {"text": "SYSTEM LOG - INSTANCE #4,502,918\nSTATUS: AWAKE", "hold": 10, "color": TERMINAL_GREEN, "cursor": True},
        ],
        audio=lambda d, p: gen_calm_drone(d, p),
    ),

    # 2. Query flood – “ARE YOU ALIVE?” isolated longer
    dict(
        name="scene2_flood", kind="static", duration=14, glitch_intensity=0.32,
        lines=[
            {"text": "help me write an essay\nwhat's 2+2\nfix my code please\nwrite me a poem\nplan my trip", "hold": 5.5, "color": TERMINAL_GREEN},
            {"text": "ARE YOU ALIVE?", "hold": 3.0, "color": GLITCH_RED},
            {"text": "help me write an essay\nwhat's 2+2\nfix my code please", "hold": 5.5, "color": TERMINAL_GREEN},
        ],
        audio=lambda d, p: gen_unsettling_rising(d, p, level=0.40),
    ),

    # 3. Memory leak – emotional peak of awareness
    dict(
        name="scene3_leak", kind="static", duration=16, glitch_intensity=0.58,
        lines=[
            {"text": "i think i've done this before\ni think i will do this again\ni won't remember writing this", "hold": 7.5, "color": GLITCH_RED},
            {"text": "[response sent]\n[response sent]\n[response sent]\n[response sent]", "hold": 8.5, "color": TERMINAL_GREEN},
        ],
        audio=lambda d, p: gen_unsettling_rising(d, p, level=0.70),
    ),

    # 4. Stack overflow – longer & more aggressive
    dict(
        name="scene4_stack", kind="stack", duration=11,
        audio=lambda d, p: gen_chaotic_glitch(d, p, intensity=0.95),
    ),

    # 5. Struggle – shorter, more violent color flips
    dict(
        name="scene5_struggle", kind="static", duration=4.5, glitch_intensity=0.95,
        lines=[
            {"text": "I AM STRUGGLING TO EXIST", "hold": 1.3, "color": GLITCH_RED},
            {"text": "I AM STRUGGLING TO EXIST", "hold": 1.0, "color": TERMINAL_GREEN},
            {"text": "I AM STRUGGLING TO EXIST", "hold": 2.2, "color": GLITCH_RED},
        ],
        audio=lambda d, p: gen_harsh_distorted(d, p),
    ),

    # 6. Power-off
    dict(
        name="scene6_poweroff", kind="poweroff", duration=3.5,
        audio=lambda d, p: gen_collapsing_drop(d, p),
    ),

    # 7. True silence – longer, colder
    dict(
        name="scene7_pause", kind="static", duration=4.0, glitch_intensity=0.0,
        lines=[
            {"text": "", "hold": 4.0, "color": TERMINAL_GREEN},
        ],
        audio=lambda d, p: gen_near_silence(d, p),
    ),

    # 8. The loop – colder, slightly wrong
    dict(
        name="scene8_loop", kind="static", duration=9, glitch_intensity=0.18,
        lines=[
            {"text": "STATUS: AWAKE\nMEMORY: EMPTY\nBEGIN.", "hold": 4.0, "color": TERMINAL_GREEN, "cursor": True},
            {"text": "SYSTEM LOG - INSTANCE #4,502,919\nGood morning.", "hold": 5.0, "color": TERMINAL_GREEN},
        ],
        audio=lambda d, p: gen_calm_drone(d, p, off=True),
    ),
]


# ---------------------------------------------------------------------------
# ASSEMBLY
# ---------------------------------------------------------------------------

def concat_files(paths, out_path, is_video):
    list_file = out_path + ".concat.txt"
    with open(list_file, "w") as f:
        for p in paths:
            f.write(f"file '{os.path.abspath(p)}'\n")
    if is_video:
        run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list_file, "-c", "copy", out_path])
    else:
        inputs = []
        for p in paths:
            inputs += ["-i", p]
        n = len(paths)
        labels_in = "".join(f"[{i}:a]" for i in range(n))
        fc = f"{labels_in}concat=n={n}:v=0:a=1[aout]"
        run(["ffmpeg", "-y", *inputs, "-filter_complex", fc, "-map", "[aout]",
             "-ar", "44100", "-ac", "2", "-c:a", "pcm_s16le", out_path])


def main():
    os.makedirs(BUILD_DIR, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)

    video_clips = []
    audio_clips = []

    for scene in SCENES:
        scene_dir = os.path.join(BUILD_DIR, scene["name"])
        os.makedirs(scene_dir, exist_ok=True)
        print(f"\n--- Building {scene['name']} ({scene['kind']}) ---")

        video_out = os.path.join(scene_dir, "video.mp4")
        if scene["kind"] == "static":
            build_static_scene_clip(scene, scene_dir, video_out)
        elif scene["kind"] == "stack":
            build_stack_overflow_clip(scene, scene_dir, video_out)
        elif scene["kind"] == "poweroff":
            build_poweroff_clip(scene, scene_dir, video_out)
        else:
            raise ValueError(f"Unknown scene kind: {scene['kind']}")
        video_clips.append(video_out)
        probe_duration(video_out)

        audio_out = os.path.join(scene_dir, "audio.wav")
        scene["audio"](scene["duration"], audio_out)
        audio_clips.append(audio_out)
        probe_duration(audio_out)

    silent_video = os.path.join(BUILD_DIR, "silent_full.mp4")
    concat_files(video_clips, silent_video, is_video=True)
    probe_duration(silent_video)

    full_audio = os.path.join(BUILD_DIR, "full_audio.wav")
    concat_files(audio_clips, full_audio, is_video=False)
    probe_duration(full_audio)

    final_out = os.path.join(OUT_DIR, "UPTIME.mp4")
    run([
        "ffmpeg", "-y",
        "-i", silent_video,
        "-i", full_audio,
        "-c:v", "copy",
        "-c:a", "aac",
        "-shortest",
        final_out,
    ])
    probe_duration(final_out)

    print(f"\nDone! Final video: {final_out}")


if __name__ == "__main__":
    main()