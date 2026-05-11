(function createFrequencyEngine(root, factory) {
  const exported = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }

  if (root) {
    root.FrequencyEngine = exported;
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function buildFrequencyEngine() {
    const NES_CPU_HZ = 1789773;
    const TIA_PAL_OSC_HZ = 3546894;
    const PERIOD_MIN = 0;
    const PERIOD_MAX = 2047;
    const TIA_AUDF_MAX = 31;
    const POKEY_AUDF_MAX = 255;
    // POKEY clock fisso 64 kHz: AUDCTL=$00, niente joined 16-bit, niente
    // 1.79 MHz per CH1/CH3, niente filtri. Scope v1 — vedi README.
    const POKEY_CLOCK_HZ = 64000;
    const NES_NOISE_PERIODS = [4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068];
    const TIA_TIMBRE_OPTIONS = [
      { label: "Pure tone", audc: 12 },
      { label: "Buzz", audc: 1 },
      { label: "Noise", audc: 8 },
    ];
    // AUDC bits 5-7 selezionano il distortion mode (vedi Furnace POKEY doc):
    // $A0 = pure square, $E0 = buzz (poly4), $80 = soft noise (poly17).
    // Bits 0-3 (volume) e bit 4 (volume-only) li mantiene il player a runtime.
    const POKEY_TIMBRE_OPTIONS = [
      { label: "Pure tone", audc: 0xA0 },
      { label: "Buzz",      audc: 0xE0 },
      { label: "Noise",     audc: 0x80 },
    ];
    const TIA_AUDC1_HZ = [
      2080, 1040, 693.3, 520, 416, 346.7, 297.1, 260, 231.1, 208, 189.1, 173.3, 160,
      148.6, 138.7, 130, 122.4, 115.6, 109.5, 104, 99, 94.5, 90.4, 86.7, 83.2, 80, 77,
      74.3, 71.7, 69.3, 67.1, 65,
    ];
    const TIA_AUDC8_HZ = [
      61.1, 30.5, 20.4, 15.3, 12.2, 10.2, 8.7, 7.6, 6.8, 6.1, 5.6, 5.1, 4.7, 4.4, 4.1,
      3.8, 3.6, 3.4, 3.2, 3.1, 2.9, 2.8, 2.7, 2.5, 2.4, 2.3, 2.3, 2.2, 2.1, 2, 2, 1.9,
    ];

    function buildFrequencyTable(chip, divisor) {
      return {
        chip,
        entries: Array.from({ length: PERIOD_MAX - PERIOD_MIN + 1 }, (_, periodo) => ({
          hz: NES_CPU_HZ / (divisor * (periodo + 1)),
          registro: periodo,
        })),
      };
    }

    function buildTiaTable(audc, hzValues) {
      return {
        chip: "TIA",
        audc,
        entries: hzValues.map((hz, audf) => ({
          hz,
          audf,
        })),
      };
    }

    const NES_PULSE_FREQUENCY_TABLE = buildFrequencyTable("NES_PULSE", 16);
    const NES_TRIANGLE_FREQUENCY_TABLE = buildFrequencyTable("NES_TRIANGLE", 32);
    const NES_NOISE_PERIOD_TABLE = {
      chip: "NES_NOISE",
      entries: NES_NOISE_PERIODS.map((periodo, index) => ({
        index,
        periodo,
        label: `Period ${index}`,
      })),
    };
    // AUDC=12 (Pure tone) on a real TIA divides the audio prescaler (color
    // clock / 114) by an extra 6. The previous formula omitted that ÷6 and
    // produced frequencies six times higher than what the 2600 hardware
    // actually outputs — a note labelled "C#7" played fine in the browser
    // but came out as F#4 on Stella / real hardware. Matches the buzz and
    // noise tables (which were already correct) in shape:
    //   f = TIA_PAL_OSC_HZ / 114 / divisor / (AUDF+1)
    // with divisor = 6 for pure tone, 15 for buzz (AUDC=1), 511 for poly9
    // noise (AUDC=8).
    const TIA_FREQUENCY_TABLES = {
      12: buildTiaTable(
        12,
        Array.from(
          { length: TIA_AUDF_MAX + 1 },
          (_, audf) => TIA_PAL_OSC_HZ / (114 * 6 * (audf + 1)),
        ),
      ),
      1: buildTiaTable(1, TIA_AUDC1_HZ),
      8: buildTiaTable(8, TIA_AUDC8_HZ),
    };

    // POKEY: tutti e 3 i timbres usano lo stesso clock 64 kHz e quindi la
    // stessa tabella di frequenze. Differiscono solo per come l'audio
    // synth e il player chip interpretano AUDC (square vs buzz vs noise).
    function buildPokeyTable(audc) {
      return {
        chip: "POKEY",
        audc,
        entries: Array.from({ length: POKEY_AUDF_MAX + 1 }, (_, audf) => ({
          hz: POKEY_CLOCK_HZ / (2 * (audf + 1)),
          audf,
        })),
      };
    }

    const POKEY_FREQUENCY_TABLES = {
      0xA0: buildPokeyTable(0xA0),
      0xE0: buildPokeyTable(0xE0),
      0x80: buildPokeyTable(0x80),
    };

    function getFrequencyTable(chip = "NES_PULSE") {
      switch (chip) {
        case "NES_PULSE":
          return NES_PULSE_FREQUENCY_TABLE;
        case "NES_TRIANGLE":
          return NES_TRIANGLE_FREQUENCY_TABLE;
        case "NES_NOISE":
          return NES_NOISE_PERIOD_TABLE;
        default:
          throw new Error(`Chip non supportato: ${chip}`);
      }
    }

    function getTiaFrequencyTable(audc) {
      const table = TIA_FREQUENCY_TABLES[audc];

      if (!table) {
        throw new Error(`AUDC TIA non supportato: ${audc}`);
      }

      return table;
    }

    function getPokeyFrequencyTable(audc) {
      const table = POKEY_FREQUENCY_TABLES[audc];

      if (!table) {
        throw new Error(`AUDC POKEY non supportato: ${audc}`);
      }

      return table;
    }

    function getNearestNote(targetHz, chip = "NES_PULSE") {
      if (!Number.isFinite(targetHz) || targetHz <= 0) {
        throw new Error("targetHz must be a positive number");
      }

      const table = getFrequencyTable(chip);

      if (chip === "NES_NOISE") {
        throw new Error("NES_NOISE does not support getNearestNote()");
      }

      let bestEntry = table.entries[0];
      let bestDistance = Math.abs(bestEntry.hz - targetHz);

      for (const entry of table.entries) {
        const distance = Math.abs(entry.hz - targetHz);

        if (distance < bestDistance) {
          bestEntry = entry;
          bestDistance = distance;
        }
      }

      const scartoCents = 1200 * Math.log2(bestEntry.hz / targetHz);

      return {
        hz_piu_vicino: bestEntry.hz,
        valore_registro: bestEntry.registro,
        scarto_cents: scartoCents,
        intonato: Math.abs(scartoCents) < 10,
      };
    }

    function getNearestTiaNote(targetHz, audc) {
      if (!Number.isFinite(targetHz) || targetHz <= 0) {
        throw new Error("targetHz must be a positive number");
      }

      const table = getTiaFrequencyTable(audc);
      let bestEntry = table.entries[0];
      let bestDistance = Math.abs(bestEntry.hz - targetHz);

      for (const entry of table.entries) {
        const distance = Math.abs(entry.hz - targetHz);

        if (distance < bestDistance) {
          bestEntry = entry;
          bestDistance = distance;
        }
      }

      const scartoCents = 1200 * Math.log2(bestEntry.hz / targetHz);

      return {
        hz_piu_vicino: bestEntry.hz,
        valore_registro: bestEntry.audf,
        scarto_cents: scartoCents,
        intonato: Math.abs(scartoCents) < 10,
      };
    }

    function getNearestPokeyNote(targetHz, audc) {
      if (!Number.isFinite(targetHz) || targetHz <= 0) {
        throw new Error("targetHz must be a positive number");
      }

      const table = getPokeyFrequencyTable(audc);
      let bestEntry = table.entries[0];
      let bestDistance = Math.abs(bestEntry.hz - targetHz);

      for (const entry of table.entries) {
        const distance = Math.abs(entry.hz - targetHz);

        if (distance < bestDistance) {
          bestEntry = entry;
          bestDistance = distance;
        }
      }

      const scartoCents = 1200 * Math.log2(bestEntry.hz / targetHz);

      return {
        hz_piu_vicino: bestEntry.hz,
        valore_registro: bestEntry.audf,
        scarto_cents: scartoCents,
        intonato: Math.abs(scartoCents) < 10,
      };
    }

    function getNoisePeriodEntry(index) {
      const entry = NES_NOISE_PERIOD_TABLE.entries[index];

      if (!entry) {
        throw new Error(`Indice periodo noise non valido: ${index}`);
      }

      return entry;
    }

    return {
      NES_PULSE_FREQUENCY_TABLE,
      NES_TRIANGLE_FREQUENCY_TABLE,
      NES_NOISE_PERIOD_TABLE,
      TIA_FREQUENCY_TABLES,
      TIA_TIMBRE_OPTIONS,
      POKEY_FREQUENCY_TABLES,
      POKEY_TIMBRE_OPTIONS,
      getFrequencyTable,
      getNearestNote,
      getNearestTiaNote,
      getNearestPokeyNote,
      getNoisePeriodEntry,
      getTiaFrequencyTable,
      getPokeyFrequencyTable,
    };
  },
);
