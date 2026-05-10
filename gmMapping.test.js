const assert = require("node:assert/strict");

const {
  PERSONALITIES,
  SUPPORTED_CHIPS,
  getMapping,
  getPersonalityLabel,
  getGmFamily,
} = require("./gmMapping");

assert.deepEqual(PERSONALITIES, [
  "Soft square",
  "Standard square",
  "Sharp square",
  "Smooth bass",
  "Noise/Percussion",
]);
assert.deepEqual(SUPPORTED_CHIPS, ["NES", "TIA"]);

// 1) GM 0 (Piano) - "attacco secco, classico chip"
assert.deepEqual(getMapping(0, "NES"), {
  personality: "Sharp square",
  channelType: "pulse",
  dutyOrAudc: "50%",
});
assert.deepEqual(getMapping(0, "TIA"), {
  personality: "Sharp square",
  channelType: "pulse",
  dutyOrAudc: 12,
});
assert.equal(getPersonalityLabel(0), "Sharp square");
assert.equal(getGmFamily(0), "Piano");

// 2) GM 27 (Distortion Guitar, Guitar) - esempio del brief UI mockup
assert.deepEqual(getMapping(27, "NES"), {
  personality: "Standard square",
  channelType: "pulse",
  dutyOrAudc: "25%",
});
assert.equal(getPersonalityLabel(27), "Standard square");
assert.equal(getGmFamily(27), "Guitar");

// 3) GM 34 (Electric Bass, Bass) - esempio del brief UI mockup
assert.deepEqual(getMapping(34, "NES"), {
  personality: "Smooth bass",
  channelType: "triangle",
  dutyOrAudc: null,
});
// TIA non ha triangle: il personality resta "Smooth bass" (intento), realizzato come pulse AUDC 12.
assert.deepEqual(getMapping(34, "TIA"), {
  personality: "Smooth bass",
  channelType: "pulse",
  dutyOrAudc: 12,
});
assert.equal(getPersonalityLabel(34), "Smooth bass");
assert.equal(getGmFamily(34), "Bass");

// 4) GM 56 (Trumpet, Brass) - tagliente, brillante
assert.deepEqual(getMapping(56, "NES"), {
  personality: "Sharp square",
  channelType: "pulse",
  dutyOrAudc: "50%",
});
assert.deepEqual(getMapping(56, "TIA"), {
  personality: "Sharp square",
  channelType: "pulse",
  dutyOrAudc: 1,
});
assert.equal(getGmFamily(56), "Brass");

// 5) GM 73 (Flute) - il piu morbido disponibile
assert.deepEqual(getMapping(73, "NES"), {
  personality: "Soft square",
  channelType: "pulse",
  dutyOrAudc: "12.5%",
});
assert.deepEqual(getMapping(73, "TIA"), {
  personality: "Soft square",
  channelType: "pulse",
  dutyOrAudc: 1, // 73 > 55, AUDC 1
});
assert.equal(getPersonalityLabel(73), "Soft square");

// 6) GM 80 (Square Lead, Synth Lead) - square duro
assert.deepEqual(getMapping(80, "NES"), {
  personality: "Sharp square",
  channelType: "pulse",
  dutyOrAudc: "50%",
});
assert.equal(getGmFamily(80), "Synth Lead");

// 7) GM 90 (Polysynth Pad) - soft
assert.deepEqual(getMapping(90, "NES"), {
  personality: "Soft square",
  channelType: "pulse",
  dutyOrAudc: "12.5%",
});

// 8) GM 116 (Taiko Drum, Percussive) - burst ritmici su NES,
//    su TIA "Sharp square" perche' AUDC 1 e' buzz aggressivo, non rumore vero.
assert.deepEqual(getMapping(116, "NES"), {
  personality: "Noise/Percussion",
  channelType: "noise",
  dutyOrAudc: null,
});
assert.deepEqual(getMapping(116, "TIA"), {
  personality: "Sharp square",
  channelType: "pulse",
  dutyOrAudc: 1,
});
// Label di default (NES) vs label TIA per lo stesso programma:
assert.equal(getPersonalityLabel(116), "Noise/Percussion");
assert.equal(getPersonalityLabel(116, false, "NES"), "Noise/Percussion");
assert.equal(getPersonalityLabel(116, false, "TIA"), "Sharp square");

// 9) GM 124 (Telephone Ring, Sound FX) - estensione personalita Noise su NES,
//    Sharp square su TIA per stessa ragione di 112-119.
assert.deepEqual(getMapping(124, "NES"), {
  personality: "Noise/Percussion",
  channelType: "noise",
  dutyOrAudc: null,
});
assert.deepEqual(getMapping(124, "TIA"), {
  personality: "Sharp square",
  channelType: "pulse",
  dutyOrAudc: 1,
});
assert.equal(getGmFamily(124), "Sound FX");

// 10) gmProgram = null -> default Piano (GM 0).
assert.deepEqual(getMapping(null, "NES"), getMapping(0, "NES"));
assert.deepEqual(getMapping(undefined, "NES"), getMapping(0, "NES"));
assert.equal(getPersonalityLabel(null), "Sharp square");
assert.equal(getPersonalityLabel(undefined), "Sharp square");

// 10b) getPersonalityLabel su TIA per ranges in cui non c'e' divergenza tra chip:
//      stessa label NES e TIA per famiglie melodiche standard.
assert.equal(getPersonalityLabel(0, false, "TIA"), "Sharp square");
assert.equal(getPersonalityLabel(34, false, "TIA"), "Smooth bass");
assert.equal(getPersonalityLabel(56, false, "TIA"), "Sharp square");

// 11) Ch.9 percussione: indipendente dal gmProgram, sempre Noise/Percussion.
assert.deepEqual(getMapping(0, "NES", true), {
  personality: "Noise/Percussion",
  channelType: "noise",
  dutyOrAudc: null,
});
assert.deepEqual(getMapping(0, "TIA", true), {
  personality: "Noise/Percussion",
  channelType: "noise",
  dutyOrAudc: 8, // su TIA i drums veri vanno su AUDC 8
});
// Anche con gmProgram non-default ch.9 vince
assert.deepEqual(getMapping(48, "NES", true), getMapping(0, "NES", true));
assert.deepEqual(getMapping(null, "TIA", true), getMapping(0, "TIA", true));
assert.equal(getPersonalityLabel(48, true), "Noise/Percussion");
assert.equal(getGmFamily(48, true), "Drums");

// 12) Boundary delle fasce: 31 e 32 sono in famiglie diverse (Guitar vs Bass).
assert.equal(getPersonalityLabel(31), "Standard square");
assert.equal(getPersonalityLabel(32), "Smooth bass");
assert.equal(getPersonalityLabel(39), "Smooth bass");
assert.equal(getPersonalityLabel(40), "Soft square");

// 13) Boundary TIA AUDC: 55 -> AUDC 12, 56 -> AUDC 1.
assert.equal(getMapping(55, "TIA").dutyOrAudc, 12);
assert.equal(getMapping(56, "TIA").dutyOrAudc, 1);

// 14) Casi di errore.
assert.throws(() => getMapping(0, "GBC"), /Unsupported chip/);
assert.throws(() => getMapping(128, "NES"), /out of range/);
assert.throws(() => getMapping(-1, "NES"), /out of range/);
assert.throws(() => getMapping(3.5, "NES"), /out of range/);
assert.throws(() => getPersonalityLabel(200), /out of range/);

console.log("gmMapping tests passed.");
console.log({
  examples: {
    "GM 0 (Piano) NES": getMapping(0, "NES"),
    "GM 27 (Guitar) NES": getMapping(27, "NES"),
    "GM 34 (Bass) NES": getMapping(34, "NES"),
    "GM 34 (Bass) TIA": getMapping(34, "TIA"),
    "GM 56 (Brass) TIA": getMapping(56, "TIA"),
    "GM 116 (Percussive) NES": getMapping(116, "NES"),
    "Ch.9 NES": getMapping(0, "NES", true),
    "Ch.9 TIA": getMapping(0, "TIA", true),
    "null -> default Piano": getMapping(null, "NES"),
  },
});
