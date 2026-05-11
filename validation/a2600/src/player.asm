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

; FRAMES_PER_STEP is read from the song's SONG_FRAMES_PER_STEP_NTSC symbol,
; which ChipRoll emits in the TIA-native export based on the composition's
; BPM. dasm resolves forward references across passes, so the symbol coming
; from song.asm (included further down) works here.
FRAMES_PER_STEP equ SONG_FRAMES_PER_STEP_NTSC

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
SavedVol0           ds 1    ; deferred-volume slot for ch1 onset (0 = nothing pending)
SavedVol1           ds 1    ; ditto ch2

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
;   Once per NTSC frame. First applies any volume saved from a previous step's
;   onset (deferred by exactly one frame so adjacent same-pitch notes get a
;   silence tic separating them — the TIA has no envelope hardware, so this
;   software trick provides the articulation). Then, every FRAMES_PER_STEP
;   frames, loads the next step's bytes into the TIA audio registers.
;   AUDV bit 7 in the export marks a "new onset": when set, the player writes
;   AUDV=0 this frame and saves the actual volume to be applied next frame.
;   When clear, the AUDV byte is written through unchanged (rests = $00,
;   continuations = $0F). Pattern-end advances OrderIndex (wrapping at $FF).
; ----------------------------------------------------------------------------
TickMusic:
    ; Apply any pending volume from the previous step's onset (1-frame delay).
    LDA SavedVol0
    BEQ NoVol0
    STA AUDV0
    LDA #0
    STA SavedVol0
NoVol0:
    LDA SavedVol1
    BEQ NoVol1
    STA AUDV1
    LDA #0
    STA SavedVol1
NoVol1:

    DEC FrameCounter
    BEQ DoStep
    RTS

DoStep:
    LDA #FRAMES_PER_STEP
    STA FrameCounter

    ; Stream 6 bytes -> TIA audio regs. AUDV0/AUDV1 go through OnsetCheck so
    ; bit 7 ("new onset") triggers the silence-then-volume articulation.
    LDY #0
    LDA (MusicPtrLo),Y
    STA AUDF0
    INY
    LDA (MusicPtrLo),Y
    STA AUDC0
    INY
    LDA (MusicPtrLo),Y      ; raw AUDV ch1
    TAX                     ; preserve raw byte in X
    AND #$80
    BEQ NoOnset0
    LDA #0                  ; onset: silence this frame
    STA AUDV0
    TXA
    AND #$0F                ; low nibble = volume
    STA SavedVol0           ; applied at next frame's TickMusic entry
    JMP DoneAUDV0
NoOnset0:
    STX AUDV0               ; rest ($00) or continuation ($0F): write through
DoneAUDV0:
    INY
    LDA (MusicPtrLo),Y
    STA AUDF1
    INY
    LDA (MusicPtrLo),Y
    STA AUDC1
    INY
    LDA (MusicPtrLo),Y      ; raw AUDV ch2
    TAX
    AND #$80
    BEQ NoOnset1
    LDA #0
    STA AUDV1
    TXA
    AND #$0F
    STA SavedVol1
    JMP DoneAUDV1
NoOnset1:
    STX AUDV1
DoneAUDV1:

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
