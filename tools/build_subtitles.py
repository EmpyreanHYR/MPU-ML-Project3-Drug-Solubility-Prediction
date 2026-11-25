"""Generate subtitle variants that keep a legibility panel behind the text.

A bare SRT carries text only; the player decides whether to draw a background,
and most draw none, so white subtitle lines land straight on the bright Studio
UI.  This tool keeps one source of truth and derives three products:

  * SOLAR_Studio_Demo_Bilingual.srt        plain text only, portable everywhere
  * SOLAR_Studio_Demo_Bilingual_boxed.srt  same cues plus one SSA override per
                                           line that paints an opaque black box
                                           behind that line only; honoured by
                                           mpv and the libass-based filters, and
                                           harmlessly ignored elsewhere
  * SOLAR_Studio_Demo_Bilingual_boxed.ass  full styling for libass players
                                           (VLC, mpv, IINA, PotPlayer): 50%
                                           black panel per line, thin outline
  * SOLAR_Studio_Demo_Bilingual_boxed.mp4  the SRT burnt into the video, for
                                           players with no subtitle styling at
                                           all (QuickTime, WeChat, PPT, browser
                                           <video>).

Usage:
  python3 tools/build_subtitles.py                      # dry run, prints plan
  python3 tools/build_subtitles.py --write               # write .srt/.ass
  python3 tools/build_subtitles.py --write --burn        # also encode the MP4
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
STEM = 'SOLAR_Studio_Demo_Bilingual'

TIMING = re.compile(r'^(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})$')

# SSA colours are &HAABBGGRR: AA 00 is opaque, FF is invisible.
BOX_COLOUR = '&H00000000'
SRT_TAG = '{\\an2\\bord0\\shad0\\1a&H00&\\3c&H00000000&\\4c&H00000000&}'
ASS_ALIGN = 2
ASS_FONT_SIZE = 40
ASS_PANEL_PAD_X = 26      # horizontal padding of the ASS backdrop
ASS_PANEL_PAD_Y = 4
ASS_BOTTOM_EN = 126       # bottom margin for the English line
ASS_BOTTOM_ZH = 64        # bottom margin for the Chinese line


@dataclass(frozen=True)
class Cue:
    start: str       # HH:MM:SS,mmm
    end: str
    english: str
    chinese: str


def parse_srt(path: Path) -> list[Cue]:
    cues: list[Cue] = []
    blocks = [b for b in re.split(r'\r?\n\s*\r?\n', path.read_text(encoding='utf-8-sig').strip()) if b.strip()]
    previous_end = '00:00:00,000'
    for index, block in enumerate(blocks, 1):
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if len(lines) < 4 or not TIMING.match(lines[1]):
            raise ValueError(f'{path.name}: malformed cue {index}: {block!r}')
        start, end = lines[1][:12], lines[1][17:29]
        english, chinese = lines[2], lines[3]
        if not chinese or chinese.isascii():
            raise ValueError(f'{path.name}: cue {index} has no Chinese line')
        if start < previous_end:
            raise ValueError(f'{path.name}: cue {index} overlaps the previous cue')
        previous_end = end
        cues.append(Cue(start, end, english, chinese))
    if not cues:
        raise ValueError(f'{path.name}: no cues found')
    return cues


def srt_time(cue_time: str) -> str:
    return cue_time


def ass_time(cue_time: str) -> str:
    hours, minutes, rest = cue_time.split(':')
    seconds, millis = rest.split(',')
    return f'{int(hours)}:{minutes}:{seconds}.{int(millis) // 10:02d}'


def render_plain_srt(cues: list[Cue]) -> str:
    out = []
    for index, cue in enumerate(cues, 1):
        out.append(f'{index}\n{srt_time(cue.start)} --> {srt_time(cue.end)}\n'
                   f'{cue.english}\n{cue.chinese}\n')
    return '\n'.join(out)


def render_boxed_srt(cues: list[Cue]) -> str:
    out = []
    for index, cue in enumerate(cues, 1):
        # One override per line keeps each box sized to its own text.
        body = f'{SRT_TAG}{cue.english}\n{SRT_TAG}{cue.chinese}'
        out.append(f'{index}\n{srt_time(cue.start)} --> {srt_time(cue.end)}\n{body}\n')
    return '\n'.join(out)


ASS_HEADER = (
    '[Script Info]\n'
    f'Title: {STEM}\n'
    'ScriptType: v4.00+\n'
    'WrapStyle: 2\n'
    'ScaledBorderAndShadow: yes\n'
    'PlayResX: 1920\n'
    'PlayResY: 1080\n'
    '\n'
    '[V4+ Styles]\n'
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour,'
    ' Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline,'
    ' Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n'
)


def ass_style(name: str, primary: str, bottom: int) -> str:
    return (f'Style: {name},PingFang SC,{ASS_FONT_SIZE},{primary},{primary},&H00000000,{BOX_COLOUR},'
            f'0,0,0,0,100,100,0,0,3,8,0,{ASS_ALIGN},120,120,{bottom},1\n')


BAR_ASS = (f'{{\\4c&H00000000&\\4a&H80&\\bord8\\xbord{ASS_PANEL_PAD_X}\\ybord{ASS_PANEL_PAD_Y}'
           '\\shad0}')


def render_ass(cues: list[Cue]) -> str:
    text = (ASS_HEADER
            + ass_style('English', '&H00FFFFFF', ASS_BOTTOM_EN)
            + ass_style('Chinese', '&H00FFE8D2', ASS_BOTTOM_ZH)
            + '\n[Events]\n'
            + 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n')
    for cue in cues:
        start, end = ass_time(cue.start), ass_time(cue.end)
        text += f'Dialogue: 0,{start},{end},English,,0,0,0,,{BAR_ASS}{cue.english}\n'
        text += f'Dialogue: 0,{start},{end},Chinese,,0,0,0,,{BAR_ASS}{cue.chinese}\n'
    return text


def burn(input_video: Path, subtitle: Path, output_video: Path, ffmpeg: str) -> None:
    """Render the boxed SRT into the picture with libass.

    The filter runs from inside the subtitle directory so no path separator or
    non-ASCII character has to survive filtergraph quoting.
    """
    with tempfile.TemporaryDirectory(prefix='solar_subs_') as workdir:
        work = Path(workdir)
        local_sub = work / 'captions.srt'
        local_sub.write_bytes(subtitle.read_bytes())
        command = [
            ffmpeg, '-hide_banner', '-loglevel', 'error', '-y',
            '-i', str(input_video.resolve()),
            '-vf', 'subtitles=captions.srt',
            '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
            '-c:a', 'copy', '-movflags', '+faststart',
            str(output_video.resolve()),
        ]
        subprocess.run(command, cwd=work, check=True)


def main() -> int:
    parser = argparse.ArgumentParser(description='Build subtitle variants with a legibility panel.')
    parser.add_argument('--source', type=Path, default=ROOT / f'{STEM}.srt')
    parser.add_argument('--outdir', type=Path, default=ROOT)
    parser.add_argument('--video', type=Path, default=ROOT / f'{STEM}.mp4')
    parser.add_argument('--write', action='store_true', help='Write the files instead of printing the plan.')
    parser.add_argument('--burn', action='store_true', help='Also encode the boxed MP4 (implies --write).')
    args = parser.parse_args()

    cues = parse_srt(args.source)
    products = {
        f'{STEM}.srt': render_plain_srt(cues),
        f'{STEM}_boxed.srt': render_boxed_srt(cues),
        f'{STEM}_boxed.ass': render_ass(cues),
    }
    if args.burn:
        args.write = True

    print(f'{len(cues)} cues, {cues[0].start} to {cues[-1].end}')
    if not args.write:
        for name in products:
            print(f'dry-run {args.outdir / name}')
        if args.burn:
            print(f'dry-run {args.outdir / (STEM + "_boxed.mp4")}')
        return 0

    for name, text in products.items():
        target = args.outdir / name
        target.write_text(text, encoding='utf-8')
        print(f'wrote {target}')

    if args.burn:
        ffmpeg = shutil.which('ffmpeg')
        if not ffmpeg:
            print('ffmpeg not found; cannot burn subtitles. The .srt/.ass tracks are ready to use.')
            return 1
        if not args.video.exists():
            print(f'missing video {args.video}')
            return 1
        target = args.outdir / f'{STEM}_boxed.mp4'
        burn(args.video, args.outdir / f'{STEM}_boxed.srt', target, ffmpeg)
        print(f'wrote {target}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
