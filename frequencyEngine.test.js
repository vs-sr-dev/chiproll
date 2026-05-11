const assert = require("node:assert/strict");

const {
  getNearestNote,
  getNoisePeriodEntry,
  NES_TRIANGLE_FREQUENCY_TABLE,
  TIA_FREQUENCY_TABLES,
  getTiaFrequencyTable,
  POKEY_FREQUENCY_TABLES,
  POKEY_TIMBRE_OPTIONS,
  getPokeyFrequencyTable,
  getNearestPokeyNote,
} = require("./frequencyEngine");

const pulseResult = getNearestNote(440);
const triangleResult = getNearestNote(220, "NES_TRIANGLE");
const noiseEntry = getNoisePeriodEntry(15);
const tiaPureTable = getTiaFrequencyTable(12);
const tiaBuzzTable = getTiaFrequencyTable(1);

assert.equal(pulseResult.valore_registro, 253);
assert.ok(Math.abs(pulseResult.hz_piu_vicino - 440.3968996062992) < 1e-9);
assert.ok(Math.abs(pulseResult.scarto_cents - 1.5609463398693302) < 1e-9);
assert.equal(pulseResult.intonato, true);

assert.equal(triangleResult.valore_registro, 253);
assert.ok(Math.abs(triangleResult.hz_piu_vicino - 220.1984498031496) < 1e-9);
assert.equal(triangleResult.intonato, true);

assert.equal(NES_TRIANGLE_FREQUENCY_TABLE.chip, "NES_TRIANGLE");
assert.deepEqual(noiseEntry, {
  index: 15,
  periodo: 4068,
  label: "Period 15",
});
assert.equal(TIA_FREQUENCY_TABLES[12].entries.length, 32);
assert.equal(tiaPureTable.entries[0].audf, 0);
// Pure tone (AUDC=12) uses divisor 6 on a real TIA:
//   3546894 / (114 * 6 * 1) = 5185.5175438596... Hz at AUDF=0 (~E8)
//   3546894 / (114 * 6 * 32) = 162.05... Hz at AUDF=31 (~E3)
assert.ok(Math.abs(tiaPureTable.entries[0].hz - 5185.517543859649) < 1e-9);
assert.ok(Math.abs(tiaPureTable.entries[31].hz - 162.04742324561403) < 1e-9);
assert.equal(tiaBuzzTable.entries[0].hz, 2080);
assert.equal(tiaBuzzTable.entries[31].hz, 65);

// POKEY: 3 timbres, clock fisso 64 kHz, AUDF 0-255 (256 entries).
const pokeyPureTable = getPokeyFrequencyTable(0xA0);
const pokeyBuzzTable = getPokeyFrequencyTable(0xE0);
const pokeyNoiseTable = getPokeyFrequencyTable(0x80);
assert.equal(POKEY_TIMBRE_OPTIONS.length, 3);
assert.equal(POKEY_FREQUENCY_TABLES[0xA0].entries.length, 256);
assert.equal(pokeyPureTable.entries[0].audf, 0);
assert.equal(pokeyPureTable.entries[0].hz, 32000); // f = 64000 / (2 * (0+1))
assert.equal(pokeyPureTable.entries[255].hz, 64000 / (2 * 256));
// Tutti e 3 i timbres condividono la stessa formula clock (differiscono nel
// synth audio e nell'AUDC scritto al chip, non nella frequenza).
assert.equal(pokeyPureTable.entries[100].hz, pokeyBuzzTable.entries[100].hz);
assert.equal(pokeyPureTable.entries[100].hz, pokeyNoiseTable.entries[100].hz);

// A4 (440 Hz) → AUDF nearest = round(64000 / (2 * 440)) - 1 = 72
const pokeyA4 = getNearestPokeyNote(440, 0xA0);
assert.equal(pokeyA4.valore_registro, 72);
assert.ok(Math.abs(pokeyA4.scarto_cents) < 15);

console.log("A4 (440 Hz) test passed:");
console.log(pulseResult);
console.log("Triangle, Noise and TIA verified:");
console.log({
  triangleResult,
  noiseEntry,
  tiaPureFirst: tiaPureTable.entries[0],
  tiaBuzzLast: tiaBuzzTable.entries[31],
});
