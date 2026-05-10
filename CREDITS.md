# Credits

ChipRoll was built collaboratively across two LLM coding sessions and a series of human-written briefs. This file is the honest attribution of who did what.

## Architecture and briefs

**Samuele Voltan** — project owner, musician, design lead. Wrote the technical briefs that scoped the project and made every architectural decision (chip support, UI grammar, drag interaction model, run-length data model, license, distribution).

**Anthropic Claude** collaborated on the briefs as a thinking partner during their drafting, helping refine module boundaries and constraints.

The briefs themselves are working foundation, not part of the public source tree.

## Implementation

### OpenAI Codex (free tier)
Implemented the initial codebase against the briefs in the order specified:
- Steps 1–7 of the main brief: frequency engine (NES Pulse / Triangle / Noise + TIA), piano roll grid, click-to-insert interaction, Web Audio synthesis, intonation indicators, multi-channel UI, chip switcher, FamiTracker / ca65 / JSON exports.
- Step 1 of the MIDI brief: `midiParser.js` (using `@tonejs/midi`).

When Codex's free-tier weekly limit was reached, the project moved to Claude Code.

### Anthropic Claude (via Claude Code)
Picked up where Codex left off and implemented:
- **Steps 2–7 of the MIDI brief**: `quantizer.js` (tick → step), `voiceReducer.js` (polyphony reduction with three strategies — top melody / bottom bass / last wins), `gmMapping.js` (General MIDI → chip personality), `trackAssigner.js` (track-to-channel assignment with bass detection by program *and* by median pitch), the import overlay UI panel with drag-drop and per-track override dropdowns, and the end-to-end pipeline that writes imported notes to the piano roll with proper clipping and warnings.
- **The drag interaction model** with three modes (create / move-block / move-pitch) discriminated by a 4-pixel movement threshold.
- **The `isContinuation` note model** for sustained notes — visual block, single audio voice with one attack/release, and run-length-aware ca65 export.
- **The Loop transport button** with seamless cycle continuation (no audio gap).
- **The 8/16/32-step grid toggle** with size-fitting layout (cells shrink to keep total width constant).
- **The TIA AUDC 1 intonation fix** — deviation in cents now computed for Buzz timbre, not just Pure Tone.
- **BPM rounding** at MIDI import (raw float → integer).
- **Full English translation sweep** of the user-facing UI (HTML, dropdown labels, dialogs, alerts, JSON export keys, error messages).
- **Bug-fixes**: the `midiParser.js` `root`-not-defined bug latent from Step 1 (factory wasn't receiving the IIFE's `root` parameter), among others.

The Italian-language code comments throughout the modules are mostly Claude Code's; they trace internal logic and are intentionally not translated, both because they're dev-facing and because they preserve a record of the working language used during construction.

## Third-party

- [**@tonejs/midi**](https://github.com/Tonejs/Midi) (MIT) — MIDI file parsing, loaded via CDN. By Yotam Mann and contributors.

## License

This project is released under the [MIT License](LICENSE). © 2026 Samuele Voltan.

The output of LLM collaborators (Anthropic Claude, OpenAI Codex) was produced under the respective providers' terms of service, which assign ownership of the output to the user. The MIT license therefore covers the entire codebase without copyright fragmentation.
