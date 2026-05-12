const assert = require("node:assert/strict");

const { splitNotesIntoChunks } = require("./noteSplitter");

// Input vuoto: ritorna comunque un chunk vuoto (mai zero chunks).
{
  const out = splitNotesIntoChunks([], 16);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], []);
}

// Una sola nota interamente nel primo chunk: nessuno split, isContinuation = false.
{
  const out = splitNotesIntoChunks([{ pitch: 60, step: 4, duration: 4 }], 16);
  assert.equal(out.length, 1);
  assert.equal(out[0].length, 1);
  assert.equal(out[0][0].step, 4);
  assert.equal(out[0][0].duration, 4);
  assert.equal(out[0][0].isContinuation, false);
  assert.equal(out[0][0].pitch, 60); // passthrough campi
}

// Nota nel secondo chunk: step locale e' (assoluto % chunkSize).
{
  const out = splitNotesIntoChunks([{ pitch: 64, step: 20, duration: 2 }], 16);
  assert.equal(out.length, 2);
  assert.equal(out[0].length, 0);
  assert.equal(out[1].length, 1);
  assert.equal(out[1][0].step, 4);
  assert.equal(out[1][0].duration, 2);
  assert.equal(out[1][0].isContinuation, false);
}

// Nota a cavallo di 1 boundary: 2 segmenti, secondo con isContinuation = true.
{
  const out = splitNotesIntoChunks([{ pitch: 60, step: 14, duration: 6 }], 16);
  assert.equal(out.length, 2);
  assert.deepEqual(out[0].map((n) => ({ step: n.step, duration: n.duration, isContinuation: n.isContinuation })), [
    { step: 14, duration: 2, isContinuation: false },
  ]);
  assert.deepEqual(out[1].map((n) => ({ step: n.step, duration: n.duration, isContinuation: n.isContinuation })), [
    { step: 0, duration: 4, isContinuation: true },
  ]);
}

// Nota lunga che attraversa 3 chunk: 3 segmenti, primo onset, gli altri continuazione.
{
  const out = splitNotesIntoChunks([{ pitch: 60, step: 12, duration: 40 }], 16);
  assert.equal(out.length, 4); // chunks 0, 1, 2, 3 (end = 52 → ceil(52/16)=4)
  assert.deepEqual(
    out.map((c) => c.map((n) => ({ step: n.step, duration: n.duration, isContinuation: n.isContinuation }))),
    [
      [{ step: 12, duration: 4, isContinuation: false }],
      [{ step: 0, duration: 16, isContinuation: true }],
      [{ step: 0, duration: 16, isContinuation: true }],
      [{ step: 0, duration: 4, isContinuation: true }],
    ],
  );
}

// Nota all'ultimo step di un chunk con duration 1: resta nel chunk corrente.
{
  const out = splitNotesIntoChunks([{ pitch: 60, step: 15, duration: 1 }], 16);
  assert.equal(out.length, 1);
  assert.equal(out[0].length, 1);
  assert.equal(out[0][0].step, 15);
  assert.equal(out[0][0].duration, 1);
  assert.equal(out[0][0].isContinuation, false);
}

// Note miste: alcune corte in chunk 0, una che cavalca boundary.
{
  const notes = [
    { pitch: 60, step: 0, duration: 4 },
    { pitch: 62, step: 8, duration: 12 }, // cavalca: 8..15 in chunk 0, 0..3 in chunk 1
    { pitch: 64, step: 24, duration: 4 },
  ];
  const out = splitNotesIntoChunks(notes, 16);
  assert.equal(out.length, 2);
  assert.equal(out[0].length, 2);
  assert.equal(out[1].length, 2);
  // chunk 0: C4 + il primo segmento di D4
  assert.deepEqual(
    out[0].map((n) => ({ pitch: n.pitch, step: n.step, duration: n.duration, isContinuation: n.isContinuation })),
    [
      { pitch: 60, step: 0, duration: 4, isContinuation: false },
      { pitch: 62, step: 8, duration: 8, isContinuation: false },
    ],
  );
  // chunk 1: coda D4 (continuation) + E4
  assert.deepEqual(
    out[1].map((n) => ({ pitch: n.pitch, step: n.step, duration: n.duration, isContinuation: n.isContinuation })),
    [
      { pitch: 62, step: 0, duration: 4, isContinuation: true },
      { pitch: 64, step: 8, duration: 4, isContinuation: false },
    ],
  );
}

// chunkSize = 8: stesse note ma piu' chunk.
{
  const out = splitNotesIntoChunks([{ pitch: 60, step: 0, duration: 32 }], 8);
  assert.equal(out.length, 4);
  for (let i = 0; i < 4; i += 1) {
    assert.equal(out[i].length, 1);
    assert.equal(out[i][0].step, 0);
    assert.equal(out[i][0].duration, 8);
    assert.equal(out[i][0].isContinuation, i > 0);
  }
}

// Note con step negativo o non-integer vengono scartate (parity con writeAssignmentToChannel).
{
  const out = splitNotesIntoChunks(
    [
      { pitch: 60, step: -1, duration: 4 },
      { pitch: 62, step: 1.5, duration: 2 },
      { pitch: 64, step: 4, duration: 4 },
    ],
    16,
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].length, 1);
  assert.equal(out[0][0].pitch, 64);
}

// Duration <= 0: trattata come 1.
{
  const out = splitNotesIntoChunks([{ pitch: 60, step: 0, duration: 0 }], 16);
  assert.equal(out[0].length, 1);
  assert.equal(out[0][0].duration, 1);
}

// Errori di input.
assert.throws(() => splitNotesIntoChunks(null, 16), /notes must be an array/);
assert.throws(() => splitNotesIntoChunks([], 0), /chunkSize must be a positive integer/);
assert.throws(() => splitNotesIntoChunks([], -1), /chunkSize must be a positive integer/);
assert.throws(() => splitNotesIntoChunks([], 16.5), /chunkSize must be a positive integer/);

console.log("noteSplitter.test.js: all passed");
