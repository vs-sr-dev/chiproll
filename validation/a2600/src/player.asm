; ============================================================================
; ChipRoll validation player for the Atari 2600 (TIA).
;
; Consumes a ChipRoll TIA-native ca65 export (song.asm in this folder) and
; plays it back at a steady tempo while displaying a solid-color background.
; Six bytes per step are streamed straight into AUDF0/AUDC0/AUDV0 and
; AUDF1/AUDC1/AUDV1 every FRAMES_PER_STEP NTSC frames. End of song wraps to
; the start: the song_order ends in $FF as ChipRoll emits.
;
; Assembled with dasm:
;     dasm src/player.asm -f3 -obuild/song.bin -lbuild/song.lst -sbuild/song.sym
;
; Run with Stella (or any 2600 emulator) on the resulting build/song.bin.
; ============================================================================

    processor 6502

    include "vcs.h"
    include "macro.h"

; FRAMES_PER_STEP: at 60 Hz NTSC, 15 frames/step ~= 4 steps per second, a
; comfortable pace to hear the alternation in the demo song. Adjust to match
; your composition's BPM if you re-export.
FRAMES_PER_STEP equ 15

; ----------------------------------------------------------------------------
; Zero-page state
; ----------------------------------------------------------------------------
    SEG.U Variables
    org $80

FrameCounter        ds 1    ; counts down 0..FRAMES_PER_STEP-1
MusicPtrLo          ds 1    ; current pointer into the pattern stream
MusicPtrHi          ds 1
OrderIndex          ds 1    ; index into song_order
StepInPattern      ds 1    ; 0..CurrentPatternLength-1
CurrentPatternLength ds 1   ; from song_length_table for active pattern

; ----------------------------------------------------------------------------
; Code segment
; ----------------------------------------------------------------------------
    SEG Code
    org $F000

Reset:
    SEI                     ; ignore IRQs
    CLD                     ; clear decimal mode (paranoia)
    LDX #$FF
    TXS                     ; init stack
    LDA #0
ClearMem:
    STA $00,X
    DEX
    BNE ClearMem            ; zero $01..$FF (skip $00 which is fine to leave)
    STA $00

    JSR LoadCurrentPattern  ; OrderIndex=0 -> MusicPtr = song_order[0]'s pattern
    LDA #1                  ; first DEC will hit 0 immediately -> step 0 plays now
    STA FrameCounter

; ----------------------------------------------------------------------------
; Main loop: VSYNC, VBLANK, visible kernel, overscan.
; ----------------------------------------------------------------------------
MainLoop:
    ; --- Vertical sync (3 scanlines) ---
    LDA #2
    STA VBLANK
    STA VSYNC
    STA WSYNC
    STA WSYNC
    STA WSYNC
    LDA #0
    STA VSYNC

    ; --- VBLANK (37 scanlines) ---
    LDA #43
    STA TIM64T              ; ~37 scanlines worth of timer

    JSR TickMusic           ; advance one step every FRAMES_PER_STEP frames

VBlankWait:
    LDA INTIM
    BNE VBlankWait
    STA WSYNC
    STA HMOVE
    LDA #0
    STA VBLANK

    ; --- Visible kernel (192 scanlines) ---
    LDA #$84                ; a dim blue background — "ChipRoll is alive"
    STA COLUBK
    LDX #192
KernelLoop:
    STA WSYNC
    DEX
    BNE KernelLoop

    ; --- Overscan (30 scanlines) ---
    LDA #2
    STA VBLANK
    LDX #30
OverscanLoop:
    STA WSYNC
    DEX
    BNE OverscanLoop

    JMP MainLoop

; ----------------------------------------------------------------------------
; TickMusic
;   Once per NTSC frame; advances the song by one step every FRAMES_PER_STEP
;   calls. On a step boundary, writes 6 bytes from (MusicPtr) into the TIA
;   audio registers and bumps MusicPtr by 6. When MusicPtr reaches the end of
;   the current pattern, advances OrderIndex (wrapping at $FF).
; ----------------------------------------------------------------------------
TickMusic:
    DEC FrameCounter
    BEQ DoStep
    RTS

DoStep:
    LDA #FRAMES_PER_STEP
    STA FrameCounter

    ; Stream 6 bytes -> TIA audio regs.
    LDY #0
    LDA (MusicPtrLo),Y
    STA AUDF0
    INY
    LDA (MusicPtrLo),Y
    STA AUDC0
    INY
    LDA (MusicPtrLo),Y
    STA AUDV0
    INY
    LDA (MusicPtrLo),Y
    STA AUDF1
    INY
    LDA (MusicPtrLo),Y
    STA AUDC1
    INY
    LDA (MusicPtrLo),Y
    STA AUDV1

    ; Advance pointer by 6 bytes (one step = 2 channels x 3 bytes).
    LDA MusicPtrLo
    CLC
    ADC #6
    STA MusicPtrLo
    BCC NoCarry
    INC MusicPtrHi
NoCarry:

    ; Bump StepInPattern; if we hit the end of the pattern, move to the next
    ; song_order entry.
    INC StepInPattern
    LDA StepInPattern
    CMP CurrentPatternLength
    BCC Done                ; not yet finished with this pattern

    INC OrderIndex
    LDX OrderIndex
    LDA song_order,X
    CMP #$FF
    BNE NotEndMarker
    LDA #0                  ; $FF marker -> wrap to start of song
    STA OrderIndex
NotEndMarker:
    JSR LoadCurrentPattern
Done:
    RTS

; ----------------------------------------------------------------------------
; LoadCurrentPattern
;   Reads song_order[OrderIndex] (a 0-based pattern index), looks up the
;   pattern's base address in song_pattern_table and its length in
;   song_length_table, sets MusicPtr and CurrentPatternLength accordingly,
;   and resets StepInPattern to 0.
; ----------------------------------------------------------------------------
LoadCurrentPattern:
    LDX OrderIndex
    LDA song_order,X        ; pattern index (0..N-1)
    TAY                     ; preserve in Y for the length table lookup
    ASL                     ; *2 (2 bytes per .word in song_pattern_table)
    TAX
    LDA song_pattern_table,X
    STA MusicPtrLo
    INX
    LDA song_pattern_table,X
    STA MusicPtrHi

    LDA song_length_table,Y
    STA CurrentPatternLength
    LDA #0
    STA StepInPattern
    RTS

; ----------------------------------------------------------------------------
; ChipRoll-exported song data lives here.
; ----------------------------------------------------------------------------
    include "song.asm"

; ----------------------------------------------------------------------------
; Reset / IRQ vectors at the top of the 4 KiB cartridge.
; ----------------------------------------------------------------------------
    org $FFFC
    .word Reset
    .word Reset
