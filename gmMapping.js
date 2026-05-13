(function createGmMapping(root, factory) {
  const exported = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }

  if (root) {
    root.GmMapping = exported;
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function buildGmMapping() {
    const PERSONALITIES = [
      "Soft square",
      "Standard square",
      "Sharp square",
      "Smooth bass",
      "Noise/Percussion",
    ];

    const SUPPORTED_CHIPS = ["NES", "TIA", "POKEY"];

    // Tabella personalità per fascia GM (chip-agnostica, intento musicale).
    // Allineata 1:1 alla tabella NES del brief: il duty cycle determina la personalità,
    // e per TIA si conserva la stessa etichetta come descrizione di intento.
    const PERSONALITY_BY_RANGE = [
      { min: 0, max: 7, family: "Piano", personality: "Sharp square" },
      { min: 8, max: 15, family: "Chromatic perc.", personality: "Sharp square" },
      { min: 16, max: 23, family: "Organ", personality: "Soft square" },
      { min: 24, max: 31, family: "Guitar", personality: "Standard square" },
      { min: 32, max: 39, family: "Bass", personality: "Smooth bass" },
      { min: 40, max: 47, family: "Strings", personality: "Soft square" },
      { min: 48, max: 55, family: "Ensemble", personality: "Standard square" },
      { min: 56, max: 63, family: "Brass", personality: "Sharp square" },
      { min: 64, max: 71, family: "Reeds", personality: "Standard square" },
      { min: 72, max: 79, family: "Flute/Pipes", personality: "Soft square" },
      { min: 80, max: 87, family: "Synth Lead", personality: "Sharp square" },
      { min: 88, max: 95, family: "Synth Pad", personality: "Soft square" },
      { min: 96, max: 103, family: "Synth FX", personality: "Standard square" },
      { min: 104, max: 111, family: "Ethnic", personality: "Standard square" },
      { min: 112, max: 119, family: "Percussive", personality: "Noise/Percussion" },
      { min: 120, max: 127, family: "Sound FX", personality: "Noise/Percussion" },
    ];

    function normalizeProgram(gmProgram) {
      if (gmProgram === null || gmProgram === undefined) {
        return 0;
      }

      if (!Number.isInteger(gmProgram) || gmProgram < 0 || gmProgram > 127) {
        throw new Error(`gmProgram out of range [0..127]: ${gmProgram}`);
      }

      return gmProgram;
    }

    function findRange(program) {
      for (const range of PERSONALITY_BY_RANGE) {
        if (program >= range.min && program <= range.max) {
          return range;
        }
      }

      throw new Error(`No GM range found for program ${program}`);
    }

    function getPersonalityLabel(gmProgram, isPercussion = false, chip = "NES") {
      // Single source of truth: la label e' quella restituita da getMapping per il chip indicato.
      return getMapping(gmProgram, chip, isPercussion).personality;
    }

    function getGmFamily(gmProgram, isPercussion = false) {
      if (isPercussion) {
        return "Drums";
      }

      const program = normalizeProgram(gmProgram);
      return findRange(program).family;
    }

    function getMapping(gmProgram, chip, isPercussion = false) {
      if (!SUPPORTED_CHIPS.includes(chip)) {
        throw new Error(`Unsupported chip: ${chip}. Available: ${SUPPORTED_CHIPS.join(", ")}`);
      }

      if (isPercussion) {
        if (chip === "NES") return { personality: "Noise/Percussion", channelType: "noise", dutyOrAudc: null };
        if (chip === "POKEY") return { personality: "Noise/Percussion", channelType: "noise", dutyOrAudc: 0x80 };
        return { personality: "Noise/Percussion", channelType: "noise", dutyOrAudc: 8 };
      }

      const program = normalizeProgram(gmProgram);
      const personality = findRange(program).personality;

      if (chip === "NES") return buildNesConfig(personality);
      if (chip === "POKEY") return buildPokeyConfig(personality);
      return buildTiaConfig(personality, program);
    }

    function buildNesConfig(personality) {
      switch (personality) {
        case "Soft square":
          return { personality, channelType: "pulse", dutyOrAudc: "12.5%" };
        case "Standard square":
          return { personality, channelType: "pulse", dutyOrAudc: "25%" };
        case "Sharp square":
          return { personality, channelType: "pulse", dutyOrAudc: "50%" };
        case "Smooth bass":
          return { personality, channelType: "triangle", dutyOrAudc: null };
        case "Noise/Percussion":
          return { personality, channelType: "noise", dutyOrAudc: null };
        default:
          throw new Error(`Unhandled NES personality: ${personality}`);
      }
    }

    function buildPokeyConfig(personality) {
      // POKEY timbres: $A0 = Pure tone, $E0 = Buzz, $80 = Noise.
      // Mappiamo le personality "chip-agnostiche" sul timbro piu' coerente:
      // - Smooth bass / Soft / Standard → Pure tone (clean, suoni "puliti")
      // - Sharp square                    → Buzz (timbro brillante/aggressivo)
      // - Noise/Percussion                → Noise (rumore via poly17)
      // L'utente puo' sempre ridurre il timbro nell'UI per-pattern dopo l'import.
      switch (personality) {
        case "Sharp square":
          return { personality, channelType: "pokey", dutyOrAudc: 0xE0 };
        case "Noise/Percussion":
          return { personality, channelType: "noise", dutyOrAudc: 0x80 };
        case "Soft square":
        case "Standard square":
        case "Smooth bass":
        default:
          return { personality, channelType: "pokey", dutyOrAudc: 0xA0 };
      }
    }

    function buildTiaConfig(personality, program) {
      // Da brief: 0-55 -> AUDC 12 (Pure Tone), 56-119 -> AUDC 1 (Buzz).
      // 120-127 non esplicito nel brief: estendo con AUDC 1 (continuita con 80-119).
      // Ch.9 -> AUDC 8 e' gestito a monte da isPercussion.
      const audc = program <= 55 ? 12 : 1;

      // TIA non ha rumore melodico (solo ch.9 ha AUDC 8). Per GM 112-127 non percussione
      // l'utente sente AUDC 1, che e' un buzz aggressivo: la label segue la realizzazione,
      // non l'intento GM "Percussive/Sound FX".
      const tiaPersonality = personality === "Noise/Percussion" ? "Sharp square" : personality;

      return { personality: tiaPersonality, channelType: "pulse", dutyOrAudc: audc };
    }

    return {
      PERSONALITIES,
      SUPPORTED_CHIPS,
      PERSONALITY_BY_RANGE,
      getMapping,
      getPersonalityLabel,
      getGmFamily,
    };
  },
);
