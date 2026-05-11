# ChipRoll

A browser-based piano roll for chip music composition. NES (4 channels), Atari TIA (2 channels), and Atari POKEY (4 channels). No install, no build, no server.

> Open `index.html` and start composing.

## Why

Chip music tooling has historically been built from the hardware up — duty cycles, AUDC values, period registers, and table-driven editors that ask the composer to think like the silicon. Plenty of musicians (myself included) come from a workflow rooted in DAWs and score editors, where the metaphors are different: notes on a grid, drag a note to extend it, drop a MIDI file to import a sketch from another session.

ChipRoll is an attempt to bring that grammar to chip composition. The frequency engine still calculates the chip-accurate values under the hood — every cell shows a green/yellow/red dot indicating how close the chip can actually get to the requested pitch — but the surface is the piano roll a musician already knows.

It's not trying to replace anything. It's trying to be the path of least resistance for musicians who want to write something for the NES or the 2600 the way they'd write anything else.

## What works today

### Composition
- Three chips: **NES APU** (Pulse 1, Pulse 2, Triangle, Noise), **Atari TIA** (Ch.1, Ch.2 with Pure Tone / Buzz / Noise timbres), and **Atari POKEY** (4 channels, each with per-pattern Pure Tone / Buzz / Noise timbre, ~B2–B7 across all timbres). POKEY v1 keeps AUDCTL at `$00` — single 64 kHz clock, no joined 16-bit channels, no filters — to keep the player code small. 16-bit joined channels and the 15 kHz / 1.79 MHz clock modes are deferred to a follow-up.
- Grid: **8 / 16 / 32 steps** per pattern, BPM 40–300, Loop transport.
- Frequency engine with chip-accurate register values and per-note intonation feedback in cents (green / yellow / red).
- Mute / Solo per channel, collapse lanes for focus.

### Patterns / Song
- Build a piece as a sequence of patterns (`P1`, `P2`, ...). The pattern rack under the transport lets you create (`+`), rename (double-click), delete (`×`), and duplicate (`Ctrl+D`) patterns. Each pattern keeps its own step count and its own TIA timbres.
- The **song lane** below the rack chains patterns into a song. Drag from rack to song to add; drag within the song to reorder; `×` on an entry removes a single instance without touching the rack.
- The transport has a **Pattern / Song** toggle. Pattern mode loops the pattern you're editing; Song mode plays the full chain end-to-end. Loop wraps the song from the last pattern back to the first.
- Pattern boundaries act as implicit note-offs — a held note never sustains across patterns.

### Note input
- **Click** an empty cell to insert; click a filled cell to remove.
- **Horizontal drag on empty** — fill consecutive cells with the same note as a single sustained voice.
- **Horizontal drag on filled** — move the entire run.
- **Vertical drag on filled** — change pitch (move the run to another row, length and position preserved).
- A 4-pixel movement threshold disambiguates intent so single clicks stay clean.

### Audio
- Web Audio API. NES Pulse / Triangle / Noise approximated with proper waveforms; TIA Pure Tone / Buzz with square; TIA Noise via random-buffer source.
- Envelope per voice (attack / sustain / release) — clean onsets, no clicks.
- Sustained notes (consecutive same-pitch cells in a run) play as one continuous voice with a single attack and release.

### Import (MIDI)
- Drop a `.mid` file into the import overlay.
- Pipeline: polyphony reduction (top melody / bottom bass / last wins) → quantization → General MIDI → chip personality mapping (Soft / Standard / Sharp square, Smooth bass, Noise/Percussion) → channel assignment with bass-detection by program *and* by median pitch.
- Per-track override of personality and channel before confirm.
- BPM and PPQ from the MIDI carry over.

### Export
All NES and TIA exports are **song-aware**: they emit every pattern in the rack plus song tables that describe the playback order. JSON is a full session snapshot.

- **FamiTracker text** (NES) — one `# PATTERN NN` block per pattern plus an `# ORDER` list. Because FamiTracker text imposes a single global pattern length per track, patterns with shorter step counts are padded with trailing empty rows up to the longest one; a `# NOTE` comment flags this when patterns are heterogeneous.
- **ca65 assembly** (NES) — per-pattern run-length-encoded streams (one per channel: pulse1, pulse2, triangle, noise), each terminated by `$00`, plus a `pattern_PN_descriptor` of four `.word` pointers. `song_pattern_table` / `song_length_table` / `song_order` (closed by `$FF`) let a player iterate the chain.
- **TIA-native ca65** (TIA) — one `pattern_PN:` label per pattern with `(AUDF, AUDC, AUDV)` triplets per step per channel, plus `song_pattern_table` / `song_length_table` / `song_order`.
- **POKEY-native ca65** (POKEY) — one `pokey_pattern_PN:` label per pattern with `(AUDF, AUDC)` pairs per step per channel (4 channels × 2 bytes = 8 bytes per step). AUDC byte already has the distortion (`$A0`/`$E0`/`$80`) OR'd with volume `$0F`; rests emit `$00,$00` for explicit silence. Tables are `pokey_song_pattern_table` / `pokey_song_length_table` / `pokey_song_order`.
- **Generic JSON** — full session snapshot, including actual chip frequencies and cents offsets for every step.

### Session
- **Save** / **Load** to a local JSON file (`Ctrl+S` / `Ctrl+O`). Round-trips everything: chip choice, BPM, patterns, song, transport mode, edit position.
- Load asks for confirmation only if the current session already has notes.

### Keyboard shortcuts
- `Space` — Play / Stop
- `[` / `]` — Previous / next pattern in the rack (wraps)
- `Ctrl+S` / `Ctrl+O` — Save / Load session
- `Ctrl+D` — Duplicate current pattern

## Roadmap

### Completing the export cycle
- **ca65 note-constants header** — separate `.inc` file with all the note symbols used by the NES assembly export.

### Chip expansion
- **POKEY v2** — joined 16-bit channels (`AUDCTL` bits 3/4) and alternative clocks (15 kHz for bass, 1.79 MHz for CH1/CH3 ultra-high pitch). Unlocks proper bass below B2 and pitch precision at the top of the range.
- **MusicXML import** — alternative to MIDI for those working from notation; already specified in the original brief (Step 8).

### Nice to have
- **Transpose Oct+ / Oct−** per channel (later: per semitone), beside Mute / Solo, with a warning when notes would fall outside the channel's range and get clipped.
- Undo / redo.
- MIDI export — round-trip back to DAWs for anyone who'd rather finish a sketch outside ChipRoll.

## Project layout

```
index.html             entry point — open this in a browser
app.js                 main app (UI, state, audio, import, export)
frequencyEngine.js     chip frequency tables + lookup
midiParser.js          .mid file → ParsedSong (uses @tonejs/midi)
quantizer.js           ticks → grid steps
voiceReducer.js        polyphony → monophonic stream
gmMapping.js           GM program → chip personality
trackAssigner.js       MIDI tracks → chip channels
styles.css             everything visual
*.test.js              Node tests for the modules
```

The `.test.js` files run with plain Node:

```bash
node frequencyEngine.test.js
node quantizer.test.js
node voiceReducer.test.js
node gmMapping.test.js
node trackAssigner.test.js
```

## Built on

- [@tonejs/midi](https://github.com/Tonejs/Midi) (MIT) — MIDI parsing, loaded via CDN.
- Vanilla browser APIs — no framework, no bundler, no toolchain.

## License

MIT — see [LICENSE](LICENSE).

Distribution intent: free source on GitHub, with a Pay-What-You-Want listing on [itch.io](https://itch.io) (free starting price) for users who prefer a packaged channel and would like to support the project.

## Credits

See [CREDITS.md](CREDITS.md) for the full attribution.
