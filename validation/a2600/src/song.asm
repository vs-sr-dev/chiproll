; Exported from ChipRoll - TIA-native ca65
; BPM: 120
; Format per step: ch1 (AUDF, AUDC, AUDV), then ch2 (AUDF, AUDC, AUDV).
; AUDV=0 marks a silent step. Patterns may have different step counts.

PATTERN_P1_STEPS = 16
pattern_P1:
  .byte $14, $0C, $0F, $00, $00, $00   ; step 0
  .byte $00, $00, $00, $00, $00, $00   ; step 1
  .byte $14, $0C, $0F, $00, $00, $00   ; step 2
  .byte $0D, $0C, $0F, $00, $00, $00   ; step 3
  .byte $00, $00, $00, $00, $00, $00   ; step 4
  .byte $0D, $0C, $0F, $00, $00, $00   ; step 5
  .byte $06, $0C, $0F, $00, $00, $00   ; step 6
  .byte $00, $00, $00, $00, $00, $00   ; step 7
  .byte $06, $0C, $0F, $00, $00, $00   ; step 8
  .byte $06, $0C, $0F, $00, $00, $00   ; step 9
  .byte $00, $00, $00, $00, $00, $00   ; step 10
  .byte $06, $0C, $0F, $00, $00, $00   ; step 11
  .byte $06, $0C, $0F, $00, $00, $00   ; step 12
  .byte $06, $0C, $0F, $00, $00, $00   ; step 13
  .byte $0D, $0C, $0F, $00, $00, $00   ; step 14
  .byte $0D, $0C, $0F, $00, $00, $00   ; step 15

PATTERN_P2_STEPS = 16
pattern_P2:
  .byte $0E, $01, $0F, $00, $00, $00   ; step 0
  .byte $00, $00, $00, $00, $00, $00   ; step 1
  .byte $0E, $01, $0F, $00, $00, $00   ; step 2
  .byte $04, $01, $0F, $00, $00, $00   ; step 3
  .byte $00, $00, $00, $00, $00, $00   ; step 4
  .byte $04, $01, $0F, $00, $00, $00   ; step 5
  .byte $0E, $01, $0F, $00, $00, $00   ; step 6
  .byte $00, $00, $00, $00, $00, $00   ; step 7
  .byte $0E, $01, $0F, $00, $00, $00   ; step 8
  .byte $04, $01, $0F, $00, $00, $00   ; step 9
  .byte $00, $00, $00, $00, $00, $00   ; step 10
  .byte $04, $01, $0F, $00, $00, $00   ; step 11
  .byte $0E, $01, $0F, $00, $00, $00   ; step 12
  .byte $0E, $01, $0F, $00, $00, $00   ; step 13
  .byte $04, $01, $0F, $00, $00, $00   ; step 14
  .byte $04, $01, $0F, $00, $00, $00   ; step 15

; Song tables
song_pattern_table:
  .word pattern_P1
  .word pattern_P2
song_length_table:
  .byte PATTERN_P1_STEPS
  .byte PATTERN_P2_STEPS
song_order:
  .byte $00, $01
  .byte $FF   ; end marker
song_order_length = 2
