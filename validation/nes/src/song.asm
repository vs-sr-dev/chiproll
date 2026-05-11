; Exported from ChipRoll - NES ca65 (song-aware)
; BPM: 80
; Per-channel RLE: pairs of (NOTE_SYMBOL, duration), $00 terminator.
; Each pattern has 4 streams (pulse1, pulse2, triangle, noise) and a
; descriptor of 4 .word entries. song_pattern_table indexes descriptors,
; song_order ends with $FF.

; NOTE: SONG_FRAMES_PER_STEP_* were added by hand to test the new player
; against an export from before app.js was reloaded. The next ChipRoll export
; (after a browser refresh) will emit them natively.
SONG_BPM = 80
SONG_FRAMES_PER_STEP_NTSC = 11
SONG_FRAMES_PER_STEP_PAL  = 9

PATTERN_P1_STEPS = 16
pattern_P1_pulse1_data:
  .byte NOTE_REST, $10
  .byte $00
pattern_P1_pulse2_data:
  .byte NOTE_REST, $10
  .byte $00
pattern_P1_triangle_data:
  .byte NOTE_D3, $01
  .byte NOTE_D3, $01
  .byte NOTE_D3, $01
  .byte NOTE_D3, $01
  .byte NOTE_D3, $01
  .byte NOTE_D3, $01
  .byte NOTE_C3, $01
  .byte NOTE_C3, $01
  .byte NOTE_D3, $01
  .byte NOTE_D3, $01
  .byte NOTE_D3, $01
  .byte NOTE_D3, $01
  .byte NOTE_D3, $01
  .byte NOTE_D3, $01
  .byte NOTE_C3, $01
  .byte NOTE_C3, $01
  .byte $00
pattern_P1_noise_data:
  .byte NOTE_REST, $10
  .byte $00
pattern_P1_descriptor:
  .word pattern_P1_pulse1_data
  .word pattern_P1_pulse2_data
  .word pattern_P1_triangle_data
  .word pattern_P1_noise_data

PATTERN_P2_STEPS = 16
pattern_P2_pulse1_data:
  .byte NOTE_D5, $01
  .byte NOTE_A5, $01
  .byte NOTE_GS5, $04
  .byte NOTE_F5, $01
  .byte NOTE_E5, $01
  .byte NOTE_D5, $01
  .byte NOTE_REST, $01
  .byte NOTE_D5, $01
  .byte NOTE_E5, $01
  .byte NOTE_F5, $01
  .byte NOTE_REST, $01
  .byte NOTE_E5, $01
  .byte NOTE_C5, $01
  .byte $00
pattern_P2_pulse2_data:
  .byte NOTE_REST, $10
  .byte $00
pattern_P2_triangle_data:
  .byte NOTE_D3, $01
  .byte NOTE_D4, $01
  .byte NOTE_E3, $01
  .byte NOTE_E4, $01
  .byte NOTE_F3, $01
  .byte NOTE_F4, $01
  .byte NOTE_G3, $01
  .byte NOTE_G4, $01
  .byte NOTE_D3, $01
  .byte NOTE_D4, $01
  .byte NOTE_E3, $01
  .byte NOTE_E4, $01
  .byte NOTE_F3, $01
  .byte NOTE_F4, $01
  .byte NOTE_C3, $01
  .byte NOTE_C4, $01
  .byte $00
pattern_P2_noise_data:
  .byte NOTE_REST, $10
  .byte $00
pattern_P2_descriptor:
  .word pattern_P2_pulse1_data
  .word pattern_P2_pulse2_data
  .word pattern_P2_triangle_data
  .word pattern_P2_noise_data

PATTERN_P3_STEPS = 16
pattern_P3_pulse1_data:
  .byte NOTE_D5, $01
  .byte NOTE_A5, $01
  .byte NOTE_GS5, $03
  .byte NOTE_E5, $01
  .byte NOTE_F5, $01
  .byte NOTE_C6, $01
  .byte NOTE_B5, $04
  .byte NOTE_C6, $01
  .byte NOTE_B5, $01
  .byte NOTE_A5, $01
  .byte NOTE_GS5, $01
  .byte $00
pattern_P3_pulse2_data:
  .byte NOTE_REST, $10
  .byte $00
pattern_P3_triangle_data:
  .byte NOTE_D3, $01
  .byte NOTE_D4, $01
  .byte NOTE_E3, $01
  .byte NOTE_E4, $01
  .byte NOTE_F3, $01
  .byte NOTE_F4, $01
  .byte NOTE_G3, $01
  .byte NOTE_G4, $01
  .byte NOTE_D3, $01
  .byte NOTE_D4, $01
  .byte NOTE_E3, $01
  .byte NOTE_E4, $01
  .byte NOTE_F3, $01
  .byte NOTE_F4, $01
  .byte NOTE_C3, $01
  .byte NOTE_C4, $01
  .byte $00
pattern_P3_noise_data:
  .byte NOTE_REST, $10
  .byte $00
pattern_P3_descriptor:
  .word pattern_P3_pulse1_data
  .word pattern_P3_pulse2_data
  .word pattern_P3_triangle_data
  .word pattern_P3_noise_data

; Song tables
song_pattern_table:
  .word pattern_P1_descriptor
  .word pattern_P2_descriptor
  .word pattern_P3_descriptor
song_length_table:
  .byte PATTERN_P1_STEPS
  .byte PATTERN_P2_STEPS
  .byte PATTERN_P3_STEPS
song_order:
  .byte $00, $01, $02
  .byte $FF   ; end marker
song_order_length = 3
