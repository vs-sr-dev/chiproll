# ChipRoll Validation

Minimal "hello world" projects for each chip supported by ChipRoll. Each project
consumes an actual ChipRoll export and plays it on the real hardware (or, in
practice, in an emulator). Together they verify that the export side of the
tool produces something a real player can run end-to-end.

| Folder | Chip | Assembler | Emulator (any of) |
| ------ | ---- | --------- | ----------------- |
| [`a2600/`](a2600/) | Atari TIA (2 channels) | dasm | Stella, RetroArch (Stella core) |
| [`nes/`](nes/) | NES APU (4 channels) | cc65 (ca65 + ld65) | Mesen, FCEUX, RetroArch (Nestopia core) |
| [`a7800/`](a7800/) | Atari POKEY on a 7800 cart | dasm | A7800, MAME `a7800`, RetroArch (ProSystem core) |

The sources are committed. Build outputs (`build/`, `*.bin`, `*.nes`, `*.a78`,
listing/symbol files) are gitignored — run the local `build.bat` to produce
them.

Each folder's README lists exactly which toolchain version to install and where
to drop it, plus the commands to assemble and to launch the result in an
emulator.
