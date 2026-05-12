const assert = require("node:assert/strict");

const {
  gcd,
  computeOnsetTickGcd,
  computeMainGridTicks,
  computeImportTimingAdjustment,
} = require("./importTiming");

// gcd di base
assert.equal(gcd(0, 0), 0);
assert.equal(gcd(0, 192), 192);
assert.equal(gcd(192, 0), 192);
assert.equal(gcd(192, 384), 192);
assert.equal(gcd(120, 192), 24);
assert.equal(gcd(480, 960), 480);

// computeOnsetTickGcd: solo onset, ignora durate
{
  const notes = [
    { startTick: 0, durationTicks: 191 },
    { startTick: 192, durationTicks: 191 },
    { startTick: 384, durationTicks: 191 },
    { startTick: 768, durationTicks: 383 },
  ];
  assert.equal(computeOnsetTickGcd(notes), 192);
}

// computeOnsetTickGcd: input vuoto
assert.equal(computeOnsetTickGcd([]), 0);

// computeOnsetTickGcd: note malformate ignorate
assert.equal(
  computeOnsetTickGcd([
    { startTick: 240 },
    { startTick: -1 },
    { startTick: NaN },
    { startTick: 480 },
  ]),
  240,
);

// MIDI "pulito" 16th-only (Final Fantasy Prelude style): nessuno stretch.
{
  const result = computeImportTimingAdjustment({
    ppq: 480,
    bpm: 120,
    tracks: [
      { notes: [{ startTick: 0 }, { startTick: 120 }, { startTick: 240 }, { startTick: 360 }] },
    ],
    bpmMin: 30,
    bpmMax: 300,
  });
  assert.equal(result.adjusted, false);
  assert.equal(result.bpm, 120);
  assert.equal(result.stepsPerBeat, 4);
  assert.equal(result.ticksPerStep, 120);
}

// MIDI "8th-only": griglia principale = 240, multiplo del 16th default → nessuno stretch.
{
  const result = computeImportTimingAdjustment({
    ppq: 480,
    bpm: 120,
    tracks: [{ notes: [{ startTick: 0 }, { startTick: 240 }, { startTick: 480 }] }],
    bpmMin: 30,
    bpmMax: 300,
  });
  assert.equal(result.adjusted, false);
  assert.equal(result.bpm, 120);
  assert.equal(result.gridTicks, 240);
}

// MIDI Matoya: griglia principale = 192 (1.6 sedicesimi). Divisori di 192:
// 1,2,3,4,6,8,12,16,24,32,48,64,96,192. Default ticksPerStep = 120 (= ppq/4).
// Il divisore piu' vicino a 120 e' 96 → newBpm = 480*120/(96*4) = 150.
{
  const result = computeImportTimingAdjustment({
    ppq: 480,
    bpm: 120,
    tracks: [
      {
        notes: [
          { startTick: 0 },
          { startTick: 192 },
          { startTick: 384 },
          { startTick: 576 },
          { startTick: 768 },
          { startTick: 960 },
        ],
      },
    ],
    bpmMin: 40,
    bpmMax: 300,
  });
  assert.equal(result.adjusted, true);
  assert.equal(result.ticksPerStep, 96);
  assert.equal(result.bpm, 150);
  assert.equal(result.stepsPerBeat, 5); // 480 / 96
  assert.equal(result.originalBpm, 120);
  assert.equal(result.gridTicks, 192);
}

// MIDI Opening (forma reale): mainGrid = 384, ma c'e' un cluster sostanziale di
// note a offset 192 (es. ottavi dentro frasi di quarti). Refinement → 192.
// Divisori di 192 closest to 120 = 96 → newBpm = 150.
{
  const onsets = [];
  // 20 onset a multipli di 384 (la maggior parte).
  for (let i = 0; i < 20; i += 1) onsets.push({ startTick: i * 384 });
  // 5 onset a offset 192 (cluster sostanziale, > 5%).
  for (let i = 0; i < 5; i += 1) onsets.push({ startTick: i * 384 + 192 });
  const result = computeImportTimingAdjustment({
    ppq: 480,
    bpm: 120,
    tracks: [{ notes: onsets }],
    bpmMin: 40,
    bpmMax: 300,
  });
  assert.equal(result.adjusted, true);
  assert.equal(result.ticksPerStep, 96);
  assert.equal(result.bpm, 150);
  assert.equal(result.gridTicks, 192); // raffinato da 384 a 192
}

// MIDI con mainGrid 384 puro (zero offset secondari): no refinement.
// Divisori di 384 closest to 120 = 128 → newBpm = 112.5.
{
  const result = computeImportTimingAdjustment({
    ppq: 480,
    bpm: 120,
    tracks: [
      {
        notes: [
          { startTick: 0 },
          { startTick: 384 },
          { startTick: 768 },
          { startTick: 1152 },
          { startTick: 1536 },
        ],
      },
    ],
    bpmMin: 40,
    bpmMax: 300,
  });
  assert.equal(result.adjusted, true);
  assert.equal(result.ticksPerStep, 128);
  assert.equal(result.bpm, 112.5);
  assert.equal(result.gridTicks, 384); // niente refinement
}

// Matoya con OUTLIERS ornamentali: la moda resta 192 e copre >80% → stretch corretto.
{
  const onsets = [];
  for (let i = 0; i < 50; i += 1) onsets.push({ startTick: i * 192 });
  onsets.push({ startTick: 7808 }, { startTick: 7936 }, { startTick: 10880 });
  const result = computeImportTimingAdjustment({
    ppq: 480,
    bpm: 120,
    tracks: [{ notes: onsets }],
    bpmMin: 40,
    bpmMax: 300,
  });
  assert.equal(result.adjusted, true);
  assert.equal(result.bpm, 150);
  assert.equal(result.ticksPerStep, 96);
  assert.equal(result.gridTicks, 192);
}

// MIDI caotico (nessuna griglia coerente): coverage < 80% → no adjust.
{
  const result = computeImportTimingAdjustment({
    ppq: 480,
    bpm: 120,
    tracks: [
      {
        notes: [
          { startTick: 0 },
          { startTick: 100 },
          { startTick: 333 },
          { startTick: 555 },
          { startTick: 777 },
        ],
      },
    ],
    bpmMin: 30,
    bpmMax: 300,
  });
  assert.equal(result.adjusted, false);
  assert.equal(result.bpm, 120);
  assert.equal(result.gridTicks, 0);
}

// BPM stretchato fuori range → fallback con warning.
// Griglia = 7 (uniforme). Divisori di 7: {1, 7}.
//   ticksPerStep=7 → 480*120/(7*4) ≈ 2057 BPM (out, > 300)
//   ticksPerStep=1 → 480*120/(1*4) = 14400 BPM (out)
// Nessun divisore in range → warning.
{
  const result = computeImportTimingAdjustment({
    ppq: 480,
    bpm: 120,
    tracks: [
      {
        notes: [
          { startTick: 0 },
          { startTick: 7 },
          { startTick: 14 },
          { startTick: 21 },
        ],
      },
    ],
    bpmMin: 40,
    bpmMax: 300,
  });
  assert.equal(result.adjusted, false);
  assert.equal(result.bpm, 120);
  assert.equal(typeof result.warning, "string");
  assert.match(result.warning, /out of range/);
}

// Nessuna nota → default invariato.
{
  const result = computeImportTimingAdjustment({
    ppq: 480,
    bpm: 120,
    tracks: [{ notes: [] }],
    bpmMin: 30,
    bpmMax: 300,
  });
  assert.equal(result.adjusted, false);
  assert.equal(result.bpm, 120);
  assert.equal(result.gridTicks, 0);
}

// computeMainGridTicks: copertura sotto soglia → 0.
{
  // 1 onset ricorrente a 192, 4 a step diversi: coverage di 192 = 1/5 = 20% < 80%.
  const notes = [
    { startTick: 0 },
    { startTick: 192 },
    { startTick: 313 },
    { startTick: 455 },
    { startTick: 700 },
  ];
  assert.equal(computeMainGridTicks(notes, 0.8), 0);
}

// Errori input.
assert.throws(() => computeImportTimingAdjustment({ ppq: 0, bpm: 120, tracks: [] }), /ppq/);
assert.throws(() => computeImportTimingAdjustment({ ppq: 480, bpm: 0, tracks: [] }), /bpm/);
assert.throws(() => computeImportTimingAdjustment({ ppq: 480, bpm: 120, tracks: null }), /tracks/);

console.log("importTiming.test.js: all passed");
