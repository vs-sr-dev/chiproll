# a7800 — ChipRoll POKEY validation cart

Minimal Atari 7800 ROM that consumes a ChipRoll POKEY-native ca65 export
and plays it on a real POKEY (or in A7800 / MAME `a7800` / RetroArch
ProSystem core). The display is a solid blue background — this is an audio
"hello world", not a graphics demo.

## What it shows

- The export format `buildPokeyCa65Assembly` produces is real
  hardware-ready: per-step 9-byte streams — 8 bytes
  `(AUDF1, AUDC1, AUDF2, AUDC2, AUDF3, AUDC3, AUDF4, AUDC4)` flow straight
  into POKEY registers at `$0450..$0457`, followed by a 1-byte onset
  bitmask (bit *n* = "new onset" for channel *n+1*, cleared on
  drag-fill / MIDI-sustain continuations) so the player can articulate
  adjacent same-pitch notes by writing `AUDC=$00` for one frame on
  onsets — POKEY has no envelope hardware, same trick the TIA player
  uses with AUDV bit 7.
- All four POKEY channels work end-to-end with `AUDCTL = $00` (64 kHz
  clock, no joined-16-bit, no filters — ChipRoll's POKEY v1 scope).
- The song tables (`pokey_song_pattern_table`, `pokey_song_length_table`,
  `pokey_song_order`) drive playback end-to-end, with the `$FF` end marker
  handled correctly.
- The export's `SONG_FRAMES_PER_STEP_NTSC` is honoured, so the cart tempo
  matches the composition's BPM automatically.

The placeholder song (`src/song.asm`) is hand-written to exercise pure
tone on ch1 + buzz on ch2 + noise on ch3, so you can hear all three
timbres on real silicon. Replace it with the output of the **POKEY-native
ca65** button after a real composition.

## Prerequisites

- `dasm` 2.20.14.1 (or later). Same install used by the [a2600 validation
  cart](../a2600/) — set the `DASM` env var to its full path:
  ```cmd
  set DASM=C:\path\to\dasm.exe
  ```
- A 7800 toolchain root with `bin\7800header.exe` and
  `includes\7800.h` etc. The needed files come from
  [7800-devtools/7800basic](https://github.com/7800-devtools/7800basic):
  - `7800header.c` (compile with any C compiler) →
    `bin\7800header.exe`
  - `includes\7800.h`, `7800macro.h`, `macro.h` — dasm machine-specific
    headers (CC0 licensed).

  Point `A78ASM_HOME` at that root:
  ```cmd
  set A78ASM_HOME=C:\path\to\7800
  ```

### Emulator notes

This cart relies on **POKEY mapped at $0450** — the post-retail mapping
introduced by homebrew flash carts and the High Score Cartridge. That
matters because:

- 1980s retail Atari 7800 cartridges did **not** ship with POKEY. Of the
  two commercial games that used POKEY (*Ballblazer*, *Commando*),
  POKEY sat at $4000 inside the cart, not $0450. So this cart is **not
  the same shape as a retail 7800 cart from the era** — emulators have
  to handle both mappings, and older builds often only know about
  $4000.
- Tested OK in [A7800](https://7800.8bitdev.org/index.php/A7800)
  standalone (the reference emulator for 7800 homebrew, MAME-derived)
  and in MAME's own `a7800` driver. POKEY@$450 works out of the box.
- **RetroArch + ProSystem core 1.3 plays silently** — that build
  predates POKEY@$450 support. Newer ProSystem builds may work; if
  you're stuck on 1.3, use A7800 standalone instead.

> **Real hardware note:** the cart skips the encryption signing step
> (`7800sign` / `signa7800`), so it boots in emulators but **will not**
> boot on an unmodified retail Atari 7800 console. Flash carts with a
> BIOS bypass (Concerto, CC2) handle it fine. To produce a
> hardware-bootable cart, run `build\song.a78` through `signa7800`.

## Build

From this folder:

```cmd
build.bat
```

Output is `build\song.a78` (16 KiB linear cart + 128-byte A78v3 header,
total 16512 bytes). The intermediate raw `build\song.bin` is also kept
for inspection.

## Run

Open `build\song.a78` in A7800 (or any 7800 emulator). With the
placeholder song you'll hear an 8-step loop on ch1 (pure tone arpeggio),
ch2 (buzz drone), and ch3 (noise hits) — just enough to confirm the
toolchain works. The real test is in **Re-export from ChipRoll** below.

## Re-export from ChipRoll (the actual validation step)

1. In ChipRoll, set Chip = **POKEY (Atari 8-bit / 7800)**, write your
   song, click the **POKEY-native ca65** export button.
2. Open `src/song.asm`, delete all current content, paste the export.
   No manual edits, no extra labels — the player consumes exactly the
   shape ChipRoll emits (`pokey_pattern_PN:` labels +
   `pokey_song_pattern_table` + `pokey_song_length_table` +
   `pokey_song_order` ending in `$FF`, plus the `SONG_*` constants).
3. `build.bat`, then open `build\song.a78` in A7800. The song should
   play with the same tempo, melody, and per-channel timbres as the
   browser preview.

If step 2 requires any tweak, that's a bug in ChipRoll's export or this
player — please file it.

## Files

- `src/player.asm` — the 7800 player. ~210 lines with comments. Standard
  Atari recommended startup (lock 7800 mode, clear MARIA control,
  initialise POKEY at $0450), then a 12-zone MARIA display list with
  DLI on the last zone → NMI handler ticks the song one step every
  `SONG_FRAMES_PER_STEP_NTSC` frames. Eight POKEY register writes per
  step come straight from `(MusicPtrLo),Y` so the export's byte layout
  maps 1-to-1 onto the hardware; the 9th byte (onset bitmask) gates a
  one-frame `AUDC=$00` re-trigger on each new onset.
- `src/song.asm` — placeholder ChipRoll-shaped data; replace with your
  own export (see "Re-export from ChipRoll" above).
- `build.bat` — wraps `dasm` + `7800header`. Override `DASM` and/or
  `A78ASM_HOME` env vars if needed.
