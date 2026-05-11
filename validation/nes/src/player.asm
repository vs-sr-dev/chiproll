; ============================================================================
; ChipRoll validation player for the NES (APU).
;
; Consumes a ChipRoll ca65 NES export (song.asm in this folder) and plays it
; via the four APU channels. The screen stays at the post-reset state showing
; a solid background colour — this is an audio "hello world", not graphics.
;
; The export shape (`buildCa65Assembly`) is:
;   - pattern_PN_<chan>_data: RLE pairs (NOTE_SYMBOL, duration), $00 terminated
;   - pattern_PN_descriptor:  four .word pointers (pulse1, pulse2, triangle, noise)
;   - song_pattern_table:     .word per descriptor
;   - song_length_table:      step count per pattern
;   - song_order:             indices, $FF terminator
;   - SONG_FRAMES_PER_STEP_NTSC: derived from BPM at export time
;
; Per-channel state is (MusicPtr, TicksRemaining). When ticks hit zero we pull
; the next (symbol, duration) from the stream and rewrite that channel's APU
; regs. Writing $4003 / $4007 / $400B / $400F re-triggers the corresponding
; channel, so adjacent same-pitch notes naturally retrigger — no extra marker
; needed (unlike the TIA, which has no envelope hardware).
;
; Built with cc65: `cl65 -t nes` handles ca65 + ld65 (NROM mapper 0).
; ============================================================================

    .setcpu "6502"

    .include "nes.inc"
    .include "note_constants.inc"

; ----------------------------------------------------------------------------
; iNES header (16 bytes, NROM)
; ----------------------------------------------------------------------------
    .segment "HEADER"
    .byte 'N', 'E', 'S', $1A
    .byte $02           ; 2 * 16KB PRG = 32KB
    .byte $01           ; 1 * 8KB CHR
    .byte $00           ; mapper 0, horizontal mirroring
    .byte $00
    .res 8, $00

; ----------------------------------------------------------------------------
; Zero-page state. cc65's nes.cfg gives us only 26 bytes of ZP ($02-$1B);
; we only put variables here that need ZP-indexed addressing (ChanPtrLo,X
; for indirect-Y reads, ChanTicks,X for fast X-indexed access).
; ----------------------------------------------------------------------------
    .segment "ZEROPAGE"

FrameCounter:        .res 1

; channel index: 0=pulse1, 1=pulse2, 2=triangle, 3=noise
ChanPtrLo:           .res 4
ChanPtrHi:           .res 4
ChanTicks:           .res 4

; Scratch pointer used by StepChannel and LoadCurrentPattern.
ScratchPtrLo:        .res 1
ScratchPtrHi:        .res 1
; 15 bytes total in ZP.

; ----------------------------------------------------------------------------
; Other player state lives in NES system RAM at $0200+. These get addressed
; via absolute 16-bit mode (one extra cycle per access, no functional
; difference). Hardcoded so we don't have to add a custom linker segment.
; ----------------------------------------------------------------------------
OrderIndex          = $0200
PatternIndex        = $0201
StepInPattern       = $0202
CurrentPatternLen   = $0203
CurrentSymbol       = $0204

; Apu15Mask shadows the desired $4015 channel-enable bits.
Apu15Mask           = $0205

; Triangle: defer onset by 1 frame for articulation (writing $400B doesn't
; audibly re-attack once the wave is running).
PendingTriOn        = $0206
PendingTriLo        = $0207
PendingTriHi        = $0208

; Pulse 1/2: defer onset by 1 frame so the $4015 channel-enable bit latches
; before the $4003 / $4007 length write. Without the gap, the APU does not
; reliably reload the length counter after a previous REST cleared the bit,
; leaving the channel permanently silent.
PendingP1On         = $0209
PendingP1Lo         = $020A
PendingP1Hi         = $020B
PendingP2On         = $020C
PendingP2Lo         = $020D
PendingP2Hi         = $020E

; ----------------------------------------------------------------------------
; Code segment
; ----------------------------------------------------------------------------
    .segment "CODE"

Reset:
    SEI
    CLD
    LDX #$FF
    TXS

    ; --- APU init ---
    LDA #$00
    STA $4015            ; silence all channels
    STA $4010            ; DMC IRQ off
    LDA #$0F
    STA Apu15Mask        ; cached mask, all 4 channels enabled
    STA $4015
    LDA #$40
    STA $4017            ; APU frame counter: 4-step, no IRQ

    ; --- Wait for PPU warmup (two VBlanks) ---
    BIT $2002
WaitVBlank1:
    BIT $2002
    BPL WaitVBlank1
WaitVBlank2:
    BIT $2002
    BPL WaitVBlank2

    ; --- Leave rendering off, set background colour ---
    LDA #$00
    STA $2000
    STA $2001
    LDA #$3F
    STA $2006
    LDA #$00
    STA $2006
    LDA #$0C             ; "blue-grey" master palette entry
    STA $2007

    ; --- Init song state ---
    LDA #0
    STA OrderIndex
    JSR LoadCurrentPattern
    LDA #1               ; first DEC -> 0 -> DoStep immediately
    STA FrameCounter

; ----------------------------------------------------------------------------
; Main loop
; ----------------------------------------------------------------------------
MainLoop:
WaitFrame:
    BIT $2002
    BPL WaitFrame
    JSR TickMusic
    JMP MainLoop

; ----------------------------------------------------------------------------
; TickMusic — called once per VBlank
; ----------------------------------------------------------------------------
TickMusic:
    ; --- Apply deferred onsets from the previous step ---

    LDA PendingP1On
    BEQ NoP1Pending
    LDA Apu15Mask
    ORA #$01
    STA Apu15Mask
    STA $4015
    LDA #$BF
    STA $4000
    LDA #$08
    STA $4001
    LDA PendingP1Lo
    STA $4002
    LDA PendingP1Hi
    STA $4003
    LDA #0
    STA PendingP1On
NoP1Pending:

    LDA PendingP2On
    BEQ NoP2Pending
    LDA Apu15Mask
    ORA #$02
    STA Apu15Mask
    STA $4015
    LDA #$BF
    STA $4004
    LDA #$08
    STA $4005
    LDA PendingP2Lo
    STA $4006
    LDA PendingP2Hi
    STA $4007
    LDA #0
    STA PendingP2On
NoP2Pending:

    LDA PendingTriOn
    BEQ NoTriPending
    LDA Apu15Mask
    ORA #$04
    STA Apu15Mask
    STA $4015
    LDA #$FF
    STA $4008
    LDA PendingTriLo
    STA $400A
    LDA PendingTriHi
    STA $400B
    LDA #0
    STA PendingTriOn
NoTriPending:

    DEC FrameCounter
    BNE TickDone
    LDA #SONG_FRAMES_PER_STEP_NTSC
    STA FrameCounter

    LDX #0
    JSR StepChannel
    LDX #1
    JSR StepChannel
    LDX #2
    JSR StepChannel
    LDX #3
    JSR StepChannel

    INC StepInPattern
    LDA StepInPattern
    CMP CurrentPatternLen
    BCC TickDone

    INC OrderIndex
    LDX OrderIndex
    LDA song_order,X
    CMP #$FF
    BNE NotEnd
    LDA #0
    STA OrderIndex
NotEnd:
    JSR LoadCurrentPattern
TickDone:
    RTS

; ----------------------------------------------------------------------------
; StepChannel(X = 0..3) — advance one channel's RLE cursor by one step.
;   ticks > 0: just decrement (note continues sustaining naturally)
;   ticks = 0: pull next (symbol, duration) from the stream, rewrite APU regs
; ----------------------------------------------------------------------------
StepChannel:
    LDA ChanTicks,X
    BEQ ReloadEntry
    DEC ChanTicks,X
    RTS

ReloadEntry:
    LDA ChanPtrLo,X
    STA ScratchPtrLo
    LDA ChanPtrHi,X
    STA ScratchPtrHi

    LDY #0
    LDA (ScratchPtrLo),Y
    BNE GotSymbol
    ; $00 = end of stream for this channel: silence it for the rest of the
    ; pattern. Set ticks to $FF so we don't try to reload again until the
    ; next pattern boundary resets ChanTicks.
    LDA #$FF
    STA ChanTicks,X
    JMP SilenceChannel

GotSymbol:
    STA CurrentSymbol
    INY
    LDA (ScratchPtrLo),Y
    SEC
    SBC #1               ; ticks = duration - 1 (this step counts as 1)
    STA ChanTicks,X

    ; Advance the channel's stream pointer by 2 (consumed one RLE pair).
    LDA ChanPtrLo,X
    CLC
    ADC #2
    STA ChanPtrLo,X
    BCC NoPtrCarry
    INC ChanPtrHi,X
NoPtrCarry:

    ; Dispatch to per-channel APU write.
    CPX #2
    BEQ DoTriangle
    BCC DoPulse          ; X=0 or X=1
    JMP DoNoise          ; X=3

; ---- Pulse 1 (X=0) / Pulse 2 (X=1) -----------------------------------------
; Silence is done by clearing this channel's bit in $4015 (length counter
; forced to 0). A subsequent onset sets the bit and writes $4003/$4007 to
; reload the length counter — this restarts the channel cleanly, whereas
; the $4000 = $30 (vol 0) trick leaves the channel in a state that doesn't
; recover after writing $4000 = $BF + a new period.
DoPulse:
    LDA CurrentSymbol
    CMP #NOTE_REST       ; explicit REST check (NOTE_REST != 0, so generic
    BNE PulsePlay        ; "BNE play" wouldn't catch it)
    LDA Apu15Mask
    CPX #0
    BNE PulseSilence2
    AND #$FE             ; clear bit 0 (Pulse 1 enable)
    STA Apu15Mask
    STA $4015
    LDA #0
    STA PendingP1On      ; cancel any deferred onset (this is a REST)
    RTS
PulseSilence2:
    AND #$FD             ; clear bit 1 (Pulse 2 enable)
    STA Apu15Mask
    STA $4015
    LDA #0
    STA PendingP2On
    RTS

PulsePlay:
    TAY                  ; Y = NOTE_X (index into pulse_timer table)
    CPX #0
    BNE Pulse2Play
    ; Defer Pulse 1 onset: cache timer + clear $4015 bit (mute this frame).
    ; TickMusic prologue re-enables and writes $4000-$4003 on the next frame.
    LDA pulse_timer_lo,Y
    STA PendingP1Lo
    LDA pulse_timer_hi,Y
    STA PendingP1Hi
    LDA Apu15Mask
    AND #$FE
    STA Apu15Mask
    STA $4015
    LDA #1
    STA PendingP1On
    RTS
Pulse2Play:
    LDA pulse_timer_lo,Y
    STA PendingP2Lo
    LDA pulse_timer_hi,Y
    STA PendingP2Hi
    LDA Apu15Mask
    AND #$FD
    STA Apu15Mask
    STA $4015
    LDA #1
    STA PendingP2On
    RTS

; ---- Triangle (X=2) --------------------------------------------------------
; Triangle re-attack on a real APU requires (a) muting the channel for at
; least one frame (length counter forced to 0 via $4015), then (b) re-
; enabling + writing $4008/$400A/$400B to reload counters. We split this
; across two frames: DoTriangle handles (a), TickMusic prologue handles (b).
DoTriangle:
    LDA CurrentSymbol
    CMP #NOTE_REST
    BNE TriPlay
    LDA Apu15Mask
    AND #$FB             ; clear bit 2 (Triangle enable)
    STA Apu15Mask
    STA $4015
    LDA #0
    STA PendingTriOn     ; this was a REST; no deferred re-enable
    RTS
TriPlay:
    TAY
    ; Cache timer values for next frame; mute the channel this frame.
    LDA tri_timer_lo,Y
    STA PendingTriLo
    LDA tri_timer_hi,Y
    STA PendingTriHi
    LDA Apu15Mask
    AND #$FB
    STA Apu15Mask
    STA $4015
    LDA #1
    STA PendingTriOn
    RTS

; ---- Noise (X=3) -----------------------------------------------------------
DoNoise:
    LDA CurrentSymbol
    CMP #NOTE_REST
    BNE NoisePlay
    LDA Apu15Mask
    AND #$F7             ; clear bit 3 (Noise enable)
    STA Apu15Mask
    STA $4015
    RTS
NoisePlay:
    ; NOISE_PERIOD_X is offset by $80; low nibble is the period index 0..15.
    AND #$0F
    STA $400E
    LDA Apu15Mask
    ORA #$08
    STA Apu15Mask
    STA $4015
    LDA #$3F             ; halt, const vol, vol 15
    STA $400C
    LDA #$08
    STA $400F            ; trigger (reload length counter)
    RTS

; ----------------------------------------------------------------------------
; SilenceChannel(X) — mute one channel mid-pattern (end-of-stream $00).
; Same mechanism as REST: clear the relevant bit in $4015.
; ----------------------------------------------------------------------------
SilenceChannel:
    LDA Apu15Mask
    CPX #0
    BNE :+
    AND #$FE
    JMP SCSave
:   CPX #1
    BNE :+
    AND #$FD
    JMP SCSave
:   CPX #2
    BNE :+
    AND #$FB
    LDX #0
    STX PendingTriOn
    JMP SCSave
:   AND #$F7
SCSave:
    STA Apu15Mask
    STA $4015
    RTS

; ----------------------------------------------------------------------------
; LoadCurrentPattern — uses OrderIndex to set up all 4 channel pointers and
; the pattern length.
; ----------------------------------------------------------------------------
LoadCurrentPattern:
    LDX OrderIndex
    LDA song_order,X
    STA PatternIndex     ; save for the length-table lookup at the end

    ASL                  ; *2 (.word entries in song_pattern_table)
    TAX
    LDA song_pattern_table,X
    STA ScratchPtrLo
    INX
    LDA song_pattern_table,X
    STA ScratchPtrHi

    ; ScratchPtr now points to pattern_PN_descriptor: 4 .word entries.
    ; Copy them into ChanPtrLo/Hi.
    LDY #0
    LDX #0
DescLoop:
    LDA (ScratchPtrLo),Y
    STA ChanPtrLo,X
    INY
    LDA (ScratchPtrLo),Y
    STA ChanPtrHi,X
    INY
    INX
    CPX #4
    BNE DescLoop

    ; Reset per-channel tick counters and step counter.
    LDA #0
    STA ChanTicks
    STA ChanTicks+1
    STA ChanTicks+2
    STA ChanTicks+3
    STA StepInPattern

    ; Look up the pattern length.
    LDY PatternIndex
    LDA song_length_table,Y
    STA CurrentPatternLen
    RTS

; ----------------------------------------------------------------------------
; ROM data: timer tables + song data
; ----------------------------------------------------------------------------
    .include "pulse_timer.inc"
    .include "triangle_timer.inc"
    .include "song.asm"

; ----------------------------------------------------------------------------
; NMI / IRQ vectors
; ----------------------------------------------------------------------------
    .segment "VECTORS"
    .word Reset            ; NMI
    .word Reset            ; Reset
    .word Reset            ; IRQ/BRK

; ----------------------------------------------------------------------------
; CHR ROM (8 KiB) — empty, we never render tiles
; ----------------------------------------------------------------------------
    .segment "CHARS"
    .res $2000, $00
