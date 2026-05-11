; Exported from ChipRoll - POKEY-native ca65 (song-aware)
; BPM: 120
; AUDCTL = $00 (64 kHz clock, no joined, no filters). Set once at init.
; Format per step: 4 channels x (AUDF, AUDC) = 8 bytes, then 1 onset
; bitmask byte (bit n = new-onset flag for channel n+1, drag-sustain
; clears the bit). Player writes AUDC=$00 for one frame on onset bits
; to articulate adjacent same-pitch notes (POKEY has no envelope).
; AUDC byte: high nibble = distortion ($A=pure $E=buzz $8=noise),
; low nibble = volume (0-15, $F = full). AUDC=$00 = silent step.

SONG_BPM = 120
SONG_FRAMES_PER_STEP_NTSC = 8   ; 60 Hz playback
SONG_FRAMES_PER_STEP_PAL  = 6   ; 50 Hz playback

PATTERN_P1_STEPS = 8
pokey_pattern_P1:
  ; ch1 = pure A4 repeated (exercises onset articulation — same pitch
  ; on consecutive steps should sound as 8 distinct notes, not one).
  ; ch2 = buzz A2 sustained (onset only on step 0, continuation after,
  ; exercises the drag/sustain path).
  ; ch3 = noise hit on every other step.
  ; ch4 = silent.
  .byte $6C, $AF, $D9, $EF, $5B, $8F, $00, $00, $07   ; step 0  ch1+ch2+ch3 onset
  .byte $6C, $AF, $D9, $EF, $00, $00, $00, $00, $01   ; step 1  ch1 onset, ch2 sustain
  .byte $6C, $AF, $D9, $EF, $5B, $8F, $00, $00, $05   ; step 2  ch1+ch3 onset, ch2 sustain
  .byte $6C, $AF, $D9, $EF, $00, $00, $00, $00, $01   ; step 3
  .byte $6C, $AF, $D9, $EF, $5B, $8F, $00, $00, $05   ; step 4
  .byte $6C, $AF, $D9, $EF, $00, $00, $00, $00, $01   ; step 5
  .byte $6C, $AF, $D9, $EF, $5B, $8F, $00, $00, $05   ; step 6
  .byte $6C, $AF, $D9, $EF, $00, $00, $00, $00, $01   ; step 7

; Song tables
pokey_song_pattern_table:
  .word pokey_pattern_P1
pokey_song_length_table:
  .byte PATTERN_P1_STEPS
pokey_song_order:
  .byte $00
  .byte $FF   ; end marker
pokey_song_order_length = 1
