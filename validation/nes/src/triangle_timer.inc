; NES Triangle timer (NTSC), 11-bit: timer = round(1789773/32/f - 1)
tri_timer_lo:
  .byte $00   ; NOTE_REST
  .byte $AD   ; NOTE_C1 (timer=1709)
  .byte $4D   ; NOTE_CS1 (timer=1613)
  .byte $F3   ; NOTE_D1 (timer=1523)
  .byte $9D   ; NOTE_DS1 (timer=1437)
  .byte $4C   ; NOTE_E1 (timer=1356)
  .byte $00   ; NOTE_F1 (timer=1280)
  .byte $B8   ; NOTE_FS1 (timer=1208)
  .byte $74   ; NOTE_G1 (timer=1140)
  .byte $34   ; NOTE_GS1 (timer=1076)
  .byte $F8   ; NOTE_A1 (timer=1016)
  .byte $BF   ; NOTE_AS1 (timer=959)
  .byte $89   ; NOTE_B1 (timer=905)
  .byte $56   ; NOTE_C2 (timer=854)
  .byte $26   ; NOTE_CS2 (timer=806)
  .byte $F9   ; NOTE_D2 (timer=761)
  .byte $CE   ; NOTE_DS2 (timer=718)
  .byte $A6   ; NOTE_E2 (timer=678)
  .byte $80   ; NOTE_F2 (timer=640)
  .byte $5C   ; NOTE_FS2 (timer=604)
  .byte $3A   ; NOTE_G2 (timer=570)
  .byte $1A   ; NOTE_GS2 (timer=538)
  .byte $FB   ; NOTE_A2 (timer=507)
  .byte $DF   ; NOTE_AS2 (timer=479)
  .byte $C4   ; NOTE_B2 (timer=452)
  .byte $AB   ; NOTE_C3 (timer=427)
  .byte $93   ; NOTE_CS3 (timer=403)
  .byte $7C   ; NOTE_D3 (timer=380)
  .byte $67   ; NOTE_DS3 (timer=359)
  .byte $52   ; NOTE_E3 (timer=338)
  .byte $3F   ; NOTE_F3 (timer=319)
  .byte $2D   ; NOTE_FS3 (timer=301)
  .byte $1C   ; NOTE_G3 (timer=284)
  .byte $0C   ; NOTE_GS3 (timer=268)
  .byte $FD   ; NOTE_A3 (timer=253)
  .byte $EF   ; NOTE_AS3 (timer=239)
  .byte $E1   ; NOTE_B3 (timer=225)
  .byte $D5   ; NOTE_C4 (timer=213)
  .byte $C9   ; NOTE_CS4 (timer=201)
  .byte $BD   ; NOTE_D4 (timer=189)
  .byte $B3   ; NOTE_DS4 (timer=179)
  .byte $A9   ; NOTE_E4 (timer=169)
  .byte $9F   ; NOTE_F4 (timer=159)
  .byte $96   ; NOTE_FS4 (timer=150)
  .byte $8E   ; NOTE_G4 (timer=142)
  .byte $86   ; NOTE_GS4 (timer=134)
  .byte $7E   ; NOTE_A4 (timer=126)
  .byte $77   ; NOTE_AS4 (timer=119)
  .byte $70   ; NOTE_B4 (timer=112)
  .byte $6A   ; NOTE_C5 (timer=106)
  .byte $64   ; NOTE_CS5 (timer=100)
  .byte $5E   ; NOTE_D5 (timer=94)
  .byte $59   ; NOTE_DS5 (timer=89)
  .byte $54   ; NOTE_E5 (timer=84)
  .byte $4F   ; NOTE_F5 (timer=79)
  .byte $4B   ; NOTE_FS5 (timer=75)
  .byte $46   ; NOTE_G5 (timer=70)
  .byte $42   ; NOTE_GS5 (timer=66)
  .byte $3F   ; NOTE_A5 (timer=63)
  .byte $3B   ; NOTE_AS5 (timer=59)
  .byte $38   ; NOTE_B5 (timer=56)
  .byte $34   ; NOTE_C6 (timer=52)
  .byte $31   ; NOTE_CS6 (timer=49)
  .byte $2F   ; NOTE_D6 (timer=47)
  .byte $2C   ; NOTE_DS6 (timer=44)
  .byte $29   ; NOTE_E6 (timer=41)
  .byte $27   ; NOTE_F6 (timer=39)
  .byte $25   ; NOTE_FS6 (timer=37)
  .byte $23   ; NOTE_G6 (timer=35)
  .byte $21   ; NOTE_GS6 (timer=33)
  .byte $1F   ; NOTE_A6 (timer=31)
  .byte $1D   ; NOTE_AS6 (timer=29)
  .byte $1B   ; NOTE_B6 (timer=27)
  .byte $1A   ; NOTE_C7 (timer=26)

tri_timer_hi:
  .byte $00   ; NOTE_REST
  .byte $06   ; NOTE_C1
  .byte $06   ; NOTE_CS1
  .byte $05   ; NOTE_D1
  .byte $05   ; NOTE_DS1
  .byte $05   ; NOTE_E1
  .byte $05   ; NOTE_F1
  .byte $04   ; NOTE_FS1
  .byte $04   ; NOTE_G1
  .byte $04   ; NOTE_GS1
  .byte $03   ; NOTE_A1
  .byte $03   ; NOTE_AS1
  .byte $03   ; NOTE_B1
  .byte $03   ; NOTE_C2
  .byte $03   ; NOTE_CS2
  .byte $02   ; NOTE_D2
  .byte $02   ; NOTE_DS2
  .byte $02   ; NOTE_E2
  .byte $02   ; NOTE_F2
  .byte $02   ; NOTE_FS2
  .byte $02   ; NOTE_G2
  .byte $02   ; NOTE_GS2
  .byte $01   ; NOTE_A2
  .byte $01   ; NOTE_AS2
  .byte $01   ; NOTE_B2
  .byte $01   ; NOTE_C3
  .byte $01   ; NOTE_CS3
  .byte $01   ; NOTE_D3
  .byte $01   ; NOTE_DS3
  .byte $01   ; NOTE_E3
  .byte $01   ; NOTE_F3
  .byte $01   ; NOTE_FS3
  .byte $01   ; NOTE_G3
  .byte $01   ; NOTE_GS3
  .byte $00   ; NOTE_A3
  .byte $00   ; NOTE_AS3
  .byte $00   ; NOTE_B3
  .byte $00   ; NOTE_C4
  .byte $00   ; NOTE_CS4
  .byte $00   ; NOTE_D4
  .byte $00   ; NOTE_DS4
  .byte $00   ; NOTE_E4
  .byte $00   ; NOTE_F4
  .byte $00   ; NOTE_FS4
  .byte $00   ; NOTE_G4
  .byte $00   ; NOTE_GS4
  .byte $00   ; NOTE_A4
  .byte $00   ; NOTE_AS4
  .byte $00   ; NOTE_B4
  .byte $00   ; NOTE_C5
  .byte $00   ; NOTE_CS5
  .byte $00   ; NOTE_D5
  .byte $00   ; NOTE_DS5
  .byte $00   ; NOTE_E5
  .byte $00   ; NOTE_F5
  .byte $00   ; NOTE_FS5
  .byte $00   ; NOTE_G5
  .byte $00   ; NOTE_GS5
  .byte $00   ; NOTE_A5
  .byte $00   ; NOTE_AS5
  .byte $00   ; NOTE_B5
  .byte $00   ; NOTE_C6
  .byte $00   ; NOTE_CS6
  .byte $00   ; NOTE_D6
  .byte $00   ; NOTE_DS6
  .byte $00   ; NOTE_E6
  .byte $00   ; NOTE_F6
  .byte $00   ; NOTE_FS6
  .byte $00   ; NOTE_G6
  .byte $00   ; NOTE_GS6
  .byte $00   ; NOTE_A6
  .byte $00   ; NOTE_AS6
  .byte $00   ; NOTE_B6
  .byte $00   ; NOTE_C7
