const assert = require("node:assert/strict");

const {
  DEFAULT_STEPS_PER_BEAT,
  tickToStep,
  durationToSteps,
  quantizeNote,
  quantizeTrack,
} = require("./quantizer");

assert.equal(DEFAULT_STEPS_PER_BEAT, 4);

// Esempio del brief: A4 a tick 0 con durata 240 (ppq=480, stepsPerBeat=4) -> step 0, durata 2.
assert.equal(tickToStep(0, 480, 4), 0);
assert.equal(durationToSteps(240, 480, 4), 2);

// Default stepsPerBeat = 4 (sedicesimi)
assert.equal(tickToStep(120, 480), 1);
assert.equal(tickToStep(240, 480), 2);
assert.equal(tickToStep(360, 480), 3);

// Arrotondamento (Math.round): tick a meta cella va al successivo, sotto resta.
assert.equal(tickToStep(60, 480, 4), 1);
assert.equal(tickToStep(59, 480, 4), 0);

// Durata sotto un singolo step: forzata a 1 (mai zero).
assert.equal(durationToSteps(10, 480, 4), 1);
assert.equal(durationToSteps(0, 480, 4), 1);

// Una battuta intera (16 step a stepsPerBeat=4) = 1920 tick a ppq=480.
assert.equal(tickToStep(1920, 480, 4), 16);
assert.equal(durationToSteps(1920, 480, 4), 16);

// PPQ alternativi
assert.equal(tickToStep(96, 96, 4), 4);
assert.equal(durationToSteps(48, 96, 4), 2);

// stepsPerBeat = 8 (trentaduesimi): ticksPerStep = 60 a ppq=480.
assert.equal(tickToStep(60, 480, 8), 1);
assert.equal(durationToSteps(60, 480, 8), 1);

// Quantizzazione di una nota completa: passthrough dei campi originali.
const sampleNote = {
  pitch: 69,
  noteName: "A4",
  hz: 440,
  startTick: 480,
  durationTicks: 240,
  velocity: 100,
};
const quantized = quantizeNote(sampleNote, 480, 4);
assert.equal(quantized.step, 4);
assert.equal(quantized.duration, 2);
assert.equal(quantized.pitch, 69);
assert.equal(quantized.noteName, "A4");
assert.equal(quantized.hz, 440);
assert.equal(quantized.velocity, 100);

// Quantizzazione di una traccia: nuovo array, originale invariato.
const sampleTrack = {
  name: "Lead",
  gmProgram: 27,
  isPercussion: false,
  notes: [
    { pitch: 60, noteName: "C4", hz: 261.63, startTick: 0, durationTicks: 240, velocity: 100 },
    { pitch: 62, noteName: "D4", hz: 293.66, startTick: 240, durationTicks: 240, velocity: 100 },
    { pitch: 64, noteName: "E4", hz: 329.63, startTick: 480, durationTicks: 480, velocity: 100 },
  ],
};
const quantizedTrack = quantizeTrack(sampleTrack, 480, 4);
assert.equal(quantizedTrack.name, "Lead");
assert.equal(quantizedTrack.gmProgram, 27);
assert.equal(quantizedTrack.notes.length, 3);
assert.equal(quantizedTrack.notes[0].step, 0);
assert.equal(quantizedTrack.notes[0].duration, 2);
assert.equal(quantizedTrack.notes[1].step, 2);
assert.equal(quantizedTrack.notes[2].step, 4);
assert.equal(quantizedTrack.notes[2].duration, 4);
assert.equal(sampleTrack.notes[0].startTick, 0); // immutabilita

// Casi di errore
assert.throws(() => tickToStep(0, 0, 4), /ppq/);
assert.throws(() => tickToStep(0, 480, 0), /stepsPerBeat/);
assert.throws(() => tickToStep(NaN, 480, 4), /tick/);
assert.throws(() => durationToSteps(-1, 480, 4), /durationTicks/);
assert.throws(() => durationToSteps(NaN, 480, 4), /durationTicks/);

console.log("quantizer tests passed.");
console.log({
  briefExample: {
    step: tickToStep(0, 480, 4),
    duration: durationToSteps(240, 480, 4),
  },
  quantizedNote: quantized,
  quantizedTrack: quantizedTrack.notes,
});
