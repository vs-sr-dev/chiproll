const assert = require("node:assert/strict");

const {
  getNearestNote,
  getNoisePeriodEntry,
  NES_TRIANGLE_FREQUENCY_TABLE,
  TIA_FREQUENCY_TABLES,
  getTiaFrequencyTable,
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
assert.ok(Math.abs(tiaPureTable.entries[0].hz - 31113.105263157893) < 1e-9);
assert.equal(tiaBuzzTable.entries[0].hz, 2080);
assert.equal(tiaBuzzTable.entries[31].hz, 65);

console.log("A4 (440 Hz) test passed:");
console.log(pulseResult);
console.log("Triangle, Noise and TIA verified:");
console.log({
  triangleResult,
  noiseEntry,
  tiaPureFirst: tiaPureTable.entries[0],
  tiaBuzzLast: tiaBuzzTable.entries[31],
});
