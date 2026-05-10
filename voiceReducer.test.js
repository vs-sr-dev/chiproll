const assert = require("node:assert/strict");

const { STRATEGIES, reduceToMonophonic, reduceTrack } = require("./voiceReducer");

assert.deepEqual(STRATEGIES, ["highest", "lowest", "last"]);

function makeNote(pitch, startTick, durationTicks) {
  return {
    pitch,
    noteName: pitchToName(pitch),
    hz: 440 * 2 ** ((pitch - 69) / 12),
    startTick,
    durationTicks,
    velocity: 100,
  };
}

function pitchToName(pitch) {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const cls = ((pitch % 12) + 12) % 12;
  const oct = Math.floor(pitch / 12) - 1;
  return `${names[cls]}${oct}`;
}

// 1) Lista vuota -> vuota.
assert.deepEqual(reduceToMonophonic([]), []);

// 2) Nota singola -> invariata.
const single = [makeNote(60, 0, 480)];
const singleResult = reduceToMonophonic(single);
assert.equal(singleResult.length, 1);
assert.equal(singleResult[0].pitch, 60);
assert.equal(singleResult[0].startTick, 0);
assert.equal(singleResult[0].durationTicks, 480);

// 3) Esempio del brief: accordo C4+E4+G4 perfettamente sovrapposto.
const chord = [makeNote(60, 0, 480), makeNote(64, 0, 480), makeNote(67, 0, 480)];

const chordHighest = reduceToMonophonic(chord, "highest");
assert.equal(chordHighest.length, 1);
assert.equal(chordHighest[0].pitch, 67);
assert.equal(chordHighest[0].noteName, "G4");
assert.equal(chordHighest[0].durationTicks, 480);

const chordLowest = reduceToMonophonic(chord, "lowest");
assert.equal(chordLowest.length, 1);
assert.equal(chordLowest[0].pitch, 60);
assert.equal(chordLowest[0].noteName, "C4");

// 4) "last" su tie di startTick: tie-break su ordine di input (l'ultima inserita vince).
const chordLast = reduceToMonophonic(chord, "last");
assert.equal(chordLast.length, 1);
assert.equal(chordLast[0].pitch, 67); // G4 e' l'ultima nell'array

// Stesso accordo ma in ordine diverso: "last" segue l'input.
const chordReordered = [makeNote(67, 0, 480), makeNote(64, 0, 480), makeNote(60, 0, 480)];
const reorderedLast = reduceToMonophonic(chordReordered, "last");
assert.equal(reorderedLast[0].pitch, 60); // C4 e' l'ultima nell'array

// 5) Sovrapposizione parziale: troncamento del perdente.
// C4 [0..480), E4 [240..720). Highest -> C4 [0..240), E4 [240..720).
const partial = [makeNote(60, 0, 480), makeNote(64, 240, 480)];
const partialHighest = reduceToMonophonic(partial, "highest");
assert.equal(partialHighest.length, 2);
assert.equal(partialHighest[0].pitch, 60);
assert.equal(partialHighest[0].startTick, 0);
assert.equal(partialHighest[0].durationTicks, 240);
assert.equal(partialHighest[1].pitch, 64);
assert.equal(partialHighest[1].startTick, 240);
assert.equal(partialHighest[1].durationTicks, 480);

// 6) "last" con voce che entra e poi termina: la prima riprende.
// C4 [0..480), E4 [120..240). E4 entra dopo, vince [120..240), poi C4 riprende [240..480).
const interrupt = [makeNote(60, 0, 480), makeNote(64, 120, 120)];
const interruptLast = reduceToMonophonic(interrupt, "last");
assert.equal(interruptLast.length, 3);
assert.equal(interruptLast[0].pitch, 60);
assert.equal(interruptLast[0].startTick, 0);
assert.equal(interruptLast[0].durationTicks, 120);
assert.equal(interruptLast[1].pitch, 64);
assert.equal(interruptLast[1].startTick, 120);
assert.equal(interruptLast[1].durationTicks, 120);
assert.equal(interruptLast[2].pitch, 60);
assert.equal(interruptLast[2].startTick, 240);
assert.equal(interruptLast[2].durationTicks, 240);

// 7) Stair: tre note sovrapposte a cascata. Highest costruisce la scala alta.
// C4 [0..240), E4 [120..360), G4 [240..480).
// Transizioni: 0,120,240,360,480.
// [0..120) C4, [120..240) C4+E4 -> E4, [240..360) E4+G4 -> G4, [360..480) G4.
const stair = [makeNote(60, 0, 240), makeNote(64, 120, 240), makeNote(67, 240, 240)];
const stairHighest = reduceToMonophonic(stair, "highest");
assert.equal(stairHighest.length, 3);
assert.equal(stairHighest[0].pitch, 60);
assert.equal(stairHighest[0].durationTicks, 120);
assert.equal(stairHighest[1].pitch, 64);
assert.equal(stairHighest[1].startTick, 120);
assert.equal(stairHighest[1].durationTicks, 120);
assert.equal(stairHighest[2].pitch, 67);
assert.equal(stairHighest[2].startTick, 240);
assert.equal(stairHighest[2].durationTicks, 240);

// 8) Back-to-back senza overlap: entrambe sopravvivono integre.
const backToBack = [makeNote(60, 0, 240), makeNote(64, 240, 240)];
const backResult = reduceToMonophonic(backToBack, "highest");
assert.equal(backResult.length, 2);
assert.equal(backResult[0].pitch, 60);
assert.equal(backResult[0].durationTicks, 240);
assert.equal(backResult[1].pitch, 64);
assert.equal(backResult[1].startTick, 240);
assert.equal(backResult[1].durationTicks, 240);

// 9) Default = "highest".
const defaultResult = reduceToMonophonic(chord);
assert.equal(defaultResult[0].pitch, 67);

// 10) Input immutato.
const original = [makeNote(60, 0, 480), makeNote(64, 0, 480)];
const originalSnapshot = JSON.stringify(original);
reduceToMonophonic(original, "highest");
assert.equal(JSON.stringify(original), originalSnapshot);

// 11) Note a durata zero filtrate via.
const withZeroDur = [makeNote(60, 0, 0), makeNote(64, 0, 480)];
const filtered = reduceToMonophonic(withZeroDur, "highest");
assert.equal(filtered.length, 1);
assert.equal(filtered[0].pitch, 64);

// 12) Strategia non valida -> throw.
assert.throws(() => reduceToMonophonic(chord, "random"), /Unsupported strategy/);

// 13) Input non array -> throw.
assert.throws(() => reduceToMonophonic("nope"), /array/);

// 14) reduceTrack passthrough.
const track = {
  name: "Lead",
  gmProgram: 27,
  isPercussion: false,
  notes: chord,
};
const reducedTrack = reduceTrack(track, "highest");
assert.equal(reducedTrack.name, "Lead");
assert.equal(reducedTrack.gmProgram, 27);
assert.equal(reducedTrack.notes.length, 1);
assert.equal(reducedTrack.notes[0].pitch, 67);

// 15) Nessun campo interno (__originalIndex) leakato in output.
for (const note of stairHighest) {
  assert.equal(note.__originalIndex, undefined);
}

console.log("voiceReducer tests passed.");
console.log({
  briefExample: chordHighest[0],
  partialHighest,
  interruptLast,
  stairHighest,
});
