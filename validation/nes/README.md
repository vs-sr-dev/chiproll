# nes — ChipRoll NES validation cart

Minimal NES ROM that consumes a ChipRoll NES ca65 export and plays it on
real hardware (or in Nestopia / Mesen / RetroArch). The display is a single
solid colour — this is an audio "hello world", not a graphics demo.

## What it shows

- The export format `buildCa65Assembly` produces is real hardware-ready:
  per-pattern RLE streams (`(NOTE_SYMBOL, duration)` per channel,
  `$00`-terminated), a 4-word descriptor per pattern, and the song tables
  drive playback end-to-end.
- All four APU channels work end-to-end: Pulse 1, Pulse 2, Triangle, Noise.
  Triangle and Pulse onsets are articulated by a 1-frame silence so adjacent
  same-pitch notes are audibly distinct (the APU has no true envelope on
  Triangle, and the length counter needs the `$4015` enable bit latched
  before `$4003/$4007` will reload it on real hardware).
- The export's `SONG_FRAMES_PER_STEP_NTSC` is honoured, so the cart tempo
  matches the composition's BPM automatically.

The demo song (`src/song.asm`) is hand-replaced after every export — you
can paste the output of the **ca65 Assembly** button straight in, no
manual edits required.

## Prerequisites

- [cc65](https://cc65.github.io/) (provides `ca65` + `ld65` + `cl65`).
  Download a binary build and unzip somewhere; point the `CC65_HOME`
  environment variable at the install root (the directory containing
  `bin\cl65.exe`):
  ```cmd
  set CC65_HOME=C:\path\to\cc65
  ```
- Any NES emulator: Nestopia, Mesen, FCEUX, or the Nestopia core in
  RetroArch.

## Build

From this folder:

```cmd
build.bat
```

Output is `build\song.nes` (40 KiB NROM cart: 16 B iNES header + 32 KiB
PRG + 8 KiB CHR). The `STARTUP segment does not exist` warning from `ld65`
is harmless — the cc65 default config expects a C runtime segment we
don't use.

## Run

Open `build\song.nes` in Nestopia. With the placeholder song you'll hear a
4-step Pulse 1 arpeggio over a sustained Triangle — just enough to confirm
the toolchain works. The real test is in **Re-export from ChipRoll** below.

## Re-export from ChipRoll (the actual validation step)

1. In ChipRoll, set Chip = **NES / Famicom**, write your song, click the
   **ca65 Assembly** export button.
2. Open `src/song.asm`, delete all current content, paste the export.
   No manual edits, no extra labels — the player consumes exactly the
   shape ChipRoll emits.
3. `build.bat`, then open `build\song.nes` in Nestopia. The song should
   play with the same tempo, melody, and per-channel timbres as the
   browser preview.

If the second step requires any tweak, that's a bug in ChipRoll's export
or this player — please file it.

## Files

- `src/player.asm` — the NES player. ~290 lines with comments. Standard
  reset + APU init + PPU warmup, then a vblank-driven loop that ticks the
  song one step every `SONG_FRAMES_PER_STEP_NTSC` frames. Onset state is
  deferred by one frame for Pulse 1/2/Triangle to articulate cleanly.
- `src/song.asm` — placeholder ChipRoll-shaped data; replace with your
  own export.
- `src/note_constants.inc` — generated table mapping `NOTE_C1`..`NOTE_C7`
  and `NOISE_PERIOD_0`..`15` to byte values. **`NOTE_REST = $7F`** —
  intentionally non-zero so the player can distinguish a REST entry
  (`NOTE_REST, $01`) from the end-of-stream sentinel (`$00`). Don't
  regenerate without preserving this.
- `src/pulse_timer.inc` — `pulse_timer_lo` / `_hi` lookup tables for
  the Pulse channels (divisor 16, NTSC clock 1.789773 MHz).
- `src/triangle_timer.inc` — same for Triangle (divisor 32).
- `build.bat` — wraps `cl65 -t nes` (which itself wraps `ca65` + `ld65`
  with the bundled NROM config).
