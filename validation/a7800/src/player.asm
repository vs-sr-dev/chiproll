; ============================================================================
; ChipRoll validation player for the Atari 7800 with POKEY at $0450.
;
; Consumes a ChipRoll POKEY-native ca65 export (song.asm in this folder) and
; plays it back at a steady tempo while showing a solid-color background.
; Nine bytes per step are consumed: 8 bytes stream into $0450..$0457 (AUDF1,
; AUDC1, AUDF2, AUDC2, AUDF3, AUDC3, AUDF4, AUDC4) and the 9th byte is an
; onset bitmask (bit n = "new onset" for channel n+1). For onset channels
; the player writes AUDC=$00 this frame and applies the real AUDC on the
; next frame, so adjacent same-pitch notes are audibly distinct (POKEY has
; no envelope hardware — same trick the TIA player uses with AUDV bit 7).
; Driven by MARIA's end-of-display NMI, one step every
; SONG_FRAMES_PER_STEP_NTSC frames.
;
; Assembled with dasm:
;     dasm src/player.asm -f3 -obuild/song.bin ...
; then 7800header signs the .bin to a 16 KiB linear .a78 with POKEY at $0450.
;
; Tested in A7800 / MAME a7800 / RetroArch ProSystem core.
; ============================================================================

    processor 6502

    include "7800.h"

; ----------------------------------------------------------------------------
; POKEY register addresses — base mapped at $0450 on this cart (set by the
; A78 header flag `pokey@450`). PAUDF0..PSKCTL are relative offsets defined
; in 7800.h. AUDCTL stays $00 for v1 POKEY scope (64 kHz clock, no joined,
; no filters).
; ----------------------------------------------------------------------------
POKEY_BASE      = $0450
POKEY_AUDCTL    = POKEY_BASE + PAUDCTL
POKEY_SKCTL     = POKEY_BASE + PSKCTL

; FRAMES_PER_STEP comes from song.asm's SONG_FRAMES_PER_STEP_NTSC symbol,
; which ChipRoll emits in the POKEY export based on the composition's BPM.
FRAMES_PER_STEP equ SONG_FRAMES_PER_STEP_NTSC

; ----------------------------------------------------------------------------
; Zero-page state ($40..$FF is RAM block 0 / zero page on the 7800)
; ----------------------------------------------------------------------------
    SEG.U Variables
    org $40
FrameCounter         ds 1   ; counts down 0..FRAMES_PER_STEP-1
MusicPtrLo           ds 1   ; current pointer into the pattern stream
MusicPtrHi           ds 1
OrderIndex           ds 1   ; index into pokey_song_order
StepInPattern        ds 1   ; 0..CurrentPatternLength-1
CurrentPatternLength ds 1   ; from pokey_song_length_table for active pattern
OnsetMask            ds 1   ; step's 9th byte; LSR-shifted to walk ch1..ch4
SavedAudc1           ds 1   ; deferred AUDC for ch1 onset (0 = nothing pending)
SavedAudc2           ds 1   ; ditto ch2
SavedAudc3           ds 1   ; ditto ch3
SavedAudc4           ds 1   ; ditto ch4

; ----------------------------------------------------------------------------
; Cartridge ROM — 16 KiB linear, mapped to $C000..$FFFF
; ----------------------------------------------------------------------------
    SEG Code
    org $C000

Reset:
    SEI
    CLD
    LDX #$FF
    TXS

    ; --- Standard Atari 7800 mode lock (per Atari recommended startup) ---
    LDA #$07
    STA INPTCTRL        ; $01: lock 7800 into 7800 mode + select cart
    LDA #$00
    STA INPTCTRL        ; release input control write-enable

    ; --- MARIA off while we configure things ---
    STA CTRL            ; $3C = 0: DMA disabled (bits 6:5 = 00)
    STA OFFSET          ; $38 must always be 0
    STA CHARBASE        ; $34 = 0 (DL uses indirect mode, charbase unused)

    ; --- Clear zero page ---
    LDA #0
    LDX #$FF
ClearZP:
    STA $00,X
    DEX
    BNE ClearZP
    STA $00

    ; --- Background colour ($84 = dim blue, "ChipRoll is alive") ---
    LDA #$84
    STA BACKGRND

    ; --- Point MARIA at our static DLL ---
    LDA #<DisplayListList
    STA DPPL
    LDA #>DisplayListList
    STA DPPH

    ; --- POKEY init: AUDCTL=$00, SKCTL=$03 (enable polynomials) ---
    LDA #$00
    STA POKEY_AUDCTL
    LDA #$03
    STA POKEY_SKCTL

    ; --- Music state: order=0, load first pattern, FrameCounter=1 so the
    ;     first NMI triggers step 0 immediately ---
    LDA #0
    STA OrderIndex
    JSR LoadCurrentPattern
    LDA #1
    STA FrameCounter

    ; --- Enable MARIA DMA. CTRL = $40 = bit 6 (DMA enable),
    ;     read mode 160A. Matches the 7800basic startup convention. ---
    LDA #$40
    STA CTRL

MainLoop:
    JMP MainLoop        ; everything happens in the NMI handler

; ----------------------------------------------------------------------------
; NMI — fires once per frame on the DLI-flagged final DLL zone.
; Save A/X/Y, tick music, restore, RTI.
; ----------------------------------------------------------------------------
NMI:
    PHA
    TXA
    PHA
    TYA
    PHA
    JSR TickMusic
    PLA
    TAY
    PLA
    TAX
    PLA
    RTI

IRQ:
    RTI

; ----------------------------------------------------------------------------
; TickMusic — once per frame.
;
; First flushes any AUDC saved from the previous step's onset (one-frame
; defer = the silence-then-volume articulation pattern). Then, every
; FRAMES_PER_STEP frames, reads the 9-byte step record and applies
; per-channel writes: onset bit set → write AUDC=$00 now, stash real
; AUDC for next frame; clear → write real AUDC through.
; ----------------------------------------------------------------------------
TickMusic:
    ; --- Flush pending AUDCs from the previous onset (1-frame defer) ---
    LDA SavedAudc1
    BEQ NoSv1
    STA POKEY_BASE+1
    LDA #0
    STA SavedAudc1
NoSv1:
    LDA SavedAudc2
    BEQ NoSv2
    STA POKEY_BASE+3
    LDA #0
    STA SavedAudc2
NoSv2:
    LDA SavedAudc3
    BEQ NoSv3
    STA POKEY_BASE+5
    LDA #0
    STA SavedAudc3
NoSv3:
    LDA SavedAudc4
    BEQ NoSv4
    STA POKEY_BASE+7
    LDA #0
    STA SavedAudc4
NoSv4:

    DEC FrameCounter
    BEQ DoStep
    RTS

DoStep:
    LDA #FRAMES_PER_STEP
    STA FrameCounter

    ; Read 9-byte step: 0=AUDF1, 1=AUDC1, 2=AUDF2, 3=AUDC2, 4=AUDF3, 5=AUDC3,
    ; 6=AUDF4, 7=AUDC4, 8=onset bitmask (bit 0=ch1 onset, bit 1=ch2, …).
    LDY #8
    LDA (MusicPtrLo),Y
    STA OnsetMask

    ; --- ch1 ---
    LDY #0
    LDA (MusicPtrLo),Y          ; AUDF1
    STA POKEY_BASE+0
    INY                         ; Y = 1
    LDA (MusicPtrLo),Y          ; AUDC1 (real)
    TAX                         ; preserve raw byte in X
    LSR OnsetMask               ; bit 0 -> C
    BCC NoOnset1
    LDA #0                      ; onset: silence this frame
    STA POKEY_BASE+1
    STX SavedAudc1              ; apply real AUDC next frame
    JMP DoneCh1
NoOnset1:
    STX POKEY_BASE+1            ; rest or continuation: write through
DoneCh1:

    ; --- ch2 ---
    INY                         ; Y = 2
    LDA (MusicPtrLo),Y          ; AUDF2
    STA POKEY_BASE+2
    INY                         ; Y = 3
    LDA (MusicPtrLo),Y          ; AUDC2
    TAX
    LSR OnsetMask               ; bit 1 -> C
    BCC NoOnset2
    LDA #0
    STA POKEY_BASE+3
    STX SavedAudc2
    JMP DoneCh2
NoOnset2:
    STX POKEY_BASE+3
DoneCh2:

    ; --- ch3 ---
    INY                         ; Y = 4
    LDA (MusicPtrLo),Y          ; AUDF3
    STA POKEY_BASE+4
    INY                         ; Y = 5
    LDA (MusicPtrLo),Y          ; AUDC3
    TAX
    LSR OnsetMask               ; bit 2 -> C
    BCC NoOnset3
    LDA #0
    STA POKEY_BASE+5
    STX SavedAudc3
    JMP DoneCh3
NoOnset3:
    STX POKEY_BASE+5
DoneCh3:

    ; --- ch4 ---
    INY                         ; Y = 6
    LDA (MusicPtrLo),Y          ; AUDF4
    STA POKEY_BASE+6
    INY                         ; Y = 7
    LDA (MusicPtrLo),Y          ; AUDC4
    TAX
    LSR OnsetMask               ; bit 3 -> C
    BCC NoOnset4
    LDA #0
    STA POKEY_BASE+7
    STX SavedAudc4
    JMP DoneCh4
NoOnset4:
    STX POKEY_BASE+7
DoneCh4:

    ; Advance pointer by 9 (one step = 4 channels × 2 bytes + 1 onset byte)
    LDA MusicPtrLo
    CLC
    ADC #9
    STA MusicPtrLo
    BCC NoCarry
    INC MusicPtrHi
NoCarry:

    ; End-of-pattern check
    INC StepInPattern
    LDA StepInPattern
    CMP CurrentPatternLength
    BCC Done

    ; Advance to next song-order entry, wrap on $FF marker
    INC OrderIndex
    LDX OrderIndex
    LDA pokey_song_order,X
    CMP #$FF
    BNE NotEndMarker
    LDA #0
    STA OrderIndex
NotEndMarker:
    JSR LoadCurrentPattern
Done:
    RTS

; ----------------------------------------------------------------------------
; LoadCurrentPattern — reads pokey_song_order[OrderIndex], looks up base
; address (pokey_song_pattern_table) and length (pokey_song_length_table),
; resets StepInPattern.
; ----------------------------------------------------------------------------
LoadCurrentPattern:
    LDX OrderIndex
    LDA pokey_song_order,X          ; pattern index (0..N-1)
    TAY                             ; preserve for length lookup
    ASL                             ; ×2 (2 bytes per .word)
    TAX
    LDA pokey_song_pattern_table,X
    STA MusicPtrLo
    INX
    LDA pokey_song_pattern_table,X
    STA MusicPtrHi

    LDA pokey_song_length_table,Y
    STA CurrentPatternLength
    LDA #0
    STA StepInPattern
    RTS

; ----------------------------------------------------------------------------
; MARIA Display List List + Display List
;
; Eighteen 16-line zones (288 scanlines total — comfortably more than one
; NTSC frame's 262). Zone 11 has the DLI bit set so MARIA fires NMI at the
; END of the visible area (after 192 scanlines); the extra zones 12-17 pad
; the frame so MARIA never reads past the DLL into garbage memory (which
; would manifest as a flood of bogus NMIs from random DLI bits).
;
; Each zone's DL is the same "end of DL" marker (byte 1 = $00 → width 0 →
; end-of-DL), so MARIA does no sprite/character DMA and the screen shows
; pure BACKGRND.
;
; DLL entry layout (3 bytes per entry, matches 7800basic convention):
;   byte 0: $4F = ($00 | (WZONEHEIGHT*4) | (WZONEHEIGHT-1))  no DLI, 16 lines
;           $CF = ($80 | (WZONEHEIGHT*4) | (WZONEHEIGHT-1))  DLI,    16 lines
;   byte 1: DL high byte
;   byte 2: DL low byte
; ----------------------------------------------------------------------------
DisplayListList:
    .byte $4F, >DisplayList, <DisplayList   ; zone 0  (no DLI, 16 lines)
    .byte $4F, >DisplayList, <DisplayList   ; zone 1
    .byte $4F, >DisplayList, <DisplayList   ; zone 2
    .byte $4F, >DisplayList, <DisplayList   ; zone 3
    .byte $4F, >DisplayList, <DisplayList   ; zone 4
    .byte $4F, >DisplayList, <DisplayList   ; zone 5
    .byte $4F, >DisplayList, <DisplayList   ; zone 6
    .byte $4F, >DisplayList, <DisplayList   ; zone 7
    .byte $4F, >DisplayList, <DisplayList   ; zone 8
    .byte $4F, >DisplayList, <DisplayList   ; zone 9
    .byte $4F, >DisplayList, <DisplayList   ; zone 10
    .byte $CF, >DisplayList, <DisplayList   ; zone 11 (DLI: NMI fires here)
    .byte $4F, >DisplayList, <DisplayList   ; zone 12 (overscan padding)
    .byte $4F, >DisplayList, <DisplayList   ; zone 13
    .byte $4F, >DisplayList, <DisplayList   ; zone 14
    .byte $4F, >DisplayList, <DisplayList   ; zone 15
    .byte $4F, >DisplayList, <DisplayList   ; zone 16
    .byte $4F, >DisplayList, <DisplayList   ; zone 17

DisplayList:
    .byte $00, $00          ; first DL entry's "MODE" byte = $00 -> end of DL

; ----------------------------------------------------------------------------
; ChipRoll-exported POKEY song data
; ----------------------------------------------------------------------------
    include "song.asm"

; ----------------------------------------------------------------------------
; 6502 vectors at the top of cart ROM
; ----------------------------------------------------------------------------
    org $FFFA
    .word NMI               ; NMI vector
    .word Reset             ; RESET vector
    .word IRQ               ; IRQ vector
