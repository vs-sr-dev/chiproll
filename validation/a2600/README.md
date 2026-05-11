# a2600 — ChipRoll TIA validation cart

Minimal Atari 2600 ROM that consumes a ChipRoll TIA-native ca65 export and
plays it on a real TIA (or in an emulator like Stella). The display is a
single solid color — this is an audio "hello world", not a graphics demo.

## What it shows

- The export format `buildTiaCa65Assembly` produces is real hardware-ready:
  per-step `(AUDF, AUDC, AUDV)` triplets for ch1 and ch2 stream straight into
  the TIA audio registers.
- The song tables (`song_pattern_table`, `song_length_table`, `song_order`)
  drive playback end-to-end, with the `$FF` end marker handled correctly.
- Per-channel timbre selection: the demo song uses pure tone on ch1 and buzz
  on ch2 simultaneously, so you can hear both timbres.

The demo song (`src/song.asm`) is hand-written but matches the exact shape
ChipRoll emits — you can replace it with the output of the **TIA-native ca65**
button on a real composition.

## Prerequisites

- `dasm` 2.20.14.1 (or later) at `D:\dasm\dasm.exe`. Download from
  [dasm-assembler/dasm releases](https://github.com/dasm-assembler/dasm/releases)
  and unzip in place. The bundled `vcs.h` is what we include.
- Any 2600 emulator: [Stella](https://stella-emu.github.io/), or the Stella
  core in RetroArch.

If your `dasm.exe` is somewhere else, set the env var before building:

```cmd
set DASM=C:\path\to\dasm.exe
```

## Build

From this folder:

```cmd
build.bat
```

Output is `build\song.bin` (4096 bytes, plain TIA cartridge image).

## Run

Open `build\song.bin` in Stella. With the placeholder song you'll hear a short
4-step alternating-pure-tone arpeggio on ch1 (ch2 silent), looping forever —
just enough to confirm the toolchain works. The real test is steps below.

## Re-export from ChipRoll (the actual validation step)

The point of this folder is to prove that **ChipRoll's export is paste-and-go**.
The placeholder `src/song.asm` is just so the toolchain builds without an
input file; replace it entirely with your composition:

1. In ChipRoll, set Chip = **Atari TIA**, write your song, click the
   **TIA-native ca65** export button.
2. Open `src/song.asm`, delete all current content, paste the export.
   No manual edits, no extra labels — the player consumes exactly the shape
   ChipRoll emits (`pattern_PN:` labels + `song_pattern_table` +
   `song_length_table` + `song_order` ending in `$FF`).
3. `build.bat`, then open `build\song.bin` in Stella. You should hear your
   composition, looping.

If the second step requires any tweak, that's a bug in ChipRoll's export or
this player — please file it.

## Files

- `src/player.asm` — the 2600 player. ~160 lines with comments. Standard
  3-line VSYNC + 37-line VBLANK + 192-line kernel + 30-line overscan. Music
  ticks once per NTSC frame via `TickMusic`, advancing one step every
  `FRAMES_PER_STEP` frames. Pattern length comes from `song_length_table`
  (the data ChipRoll already emits), so the player doesn't need any labels
  the export doesn't provide.
- `src/song.asm` — placeholder ChipRoll-shaped data; replace with your own
  export (see "Re-export from ChipRoll" above).
- `build.bat` — wraps dasm. Override `DASM` env var if needed.
