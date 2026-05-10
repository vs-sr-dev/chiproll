const assert = require("node:assert/strict");

const {
  SUPPORTED_CHIPS,
  C3_MIDI,
  assignTracks,
  isBassTrack,
  isPercussionTrack,
} = require("./trackAssigner");

assert.deepEqual(SUPPORTED_CHIPS, ["NES", "TIA"]);
assert.equal(C3_MIDI, 48);

function makeTrack(name, gmProgram, isPercussion, pitches = []) {
  return {
    name,
    gmProgram,
    isPercussion,
    notes: pitches.map((pitch) => ({
      pitch,
      noteName: `MIDI${pitch}`,
      hz: 440 * 2 ** ((pitch - 69) / 12),
      startTick: 0,
      durationTicks: 240,
      velocity: 100,
    })),
  };
}

// 1) Ensemble NES a 3 tracce: basso (GM 34) + 2 melodiche.
//    Atteso: bass -> triangle, mel1 -> pulse1, mel2 -> pulse2; nessuna unassigned.
{
  const lead = makeTrack("Lead", 27, false, [60, 62, 64, 67]);
  const second = makeTrack("Pad", 90, false, [55, 57, 59, 60]);
  const bass = makeTrack("Bass", 34, false, [36, 38, 40]);

  const result = assignTracks([lead, second, bass], "NES");

  assert.equal(result.unassigned.length, 0);
  assert.equal(result.assigned.length, 3);

  const byChannel = Object.fromEntries(result.assigned.map((a) => [a.channel, a]));
  assert.equal(byChannel.triangle.track, bass);
  assert.equal(byChannel.triangle.personality, "Smooth bass");
  assert.equal(byChannel.pulse1.track, lead);
  assert.equal(byChannel.pulse1.personality, "Standard square");
  assert.equal(byChannel.pulse2.track, second);
  assert.equal(byChannel.pulse2.personality, "Soft square");
}

// 2) Ensemble NES con drums (4 tracce: bass + 2 melodici + drums).
//    Atteso: bass -> triangle, drums -> noise, mel1 -> pulse1, mel2 -> pulse2.
{
  const lead = makeTrack("Lead", 56, false, [64, 65, 67]); // ottoni
  const harmony = makeTrack("Harmony", 27, false, [60, 62, 64]);
  const bass = makeTrack("Bass", 34, false, [36, 38]);
  const drums = makeTrack("Drums", 0, true, [38, 42]); // ch.9, gmProgram irrilevante

  const result = assignTracks([lead, harmony, bass, drums], "NES");

  assert.equal(result.unassigned.length, 0);
  assert.equal(result.assigned.length, 4);

  const byChannel = Object.fromEntries(result.assigned.map((a) => [a.channel, a]));
  assert.equal(byChannel.triangle.track, bass);
  assert.equal(byChannel.noise.track, drums);
  assert.equal(byChannel.noise.personality, "Noise/Percussion");
  assert.equal(byChannel.pulse1.track, lead);
  assert.equal(byChannel.pulse1.personality, "Sharp square");
  assert.equal(byChannel.pulse2.track, harmony);
}

// 3) NES 4 tracce melodiche, niente bass ne' drums: 2 finiscono in unassigned.
{
  const t1 = makeTrack("Mel1", 27, false, [60, 62, 64]);
  const t2 = makeTrack("Mel2", 73, false, [67, 69, 71]);
  const t3 = makeTrack("Mel3", 80, false, [60, 62]);
  const t4 = makeTrack("Mel4", 90, false, [55, 57]);

  const result = assignTracks([t1, t2, t3, t4], "NES");

  assert.equal(result.assigned.length, 2);
  assert.equal(result.unassigned.length, 2);

  // Triangle e Noise non assegnati (no bass / no drums).
  assert.ok(result.assigned.every((a) => a.channel !== "triangle"));
  assert.ok(result.assigned.every((a) => a.channel !== "noise"));

  // Le prime due melodiche prendono pulse1 e pulse2.
  assert.equal(result.assigned[0].track, t1);
  assert.equal(result.assigned[0].channel, "pulse1");
  assert.equal(result.assigned[1].track, t2);
  assert.equal(result.assigned[1].channel, "pulse2");

  // Le ultime due in unassigned, in ordine, con reason corretta.
  assert.equal(result.unassigned[0].track, t3);
  assert.match(result.unassigned[0].reason, /Pulse 1 \/ Pulse 2/);
  assert.equal(result.unassigned[1].track, t4);
}

// 4) TIA con 3 tracce (1 melodica + 1 percussione + 1 melodica): 1 unassigned.
{
  const lead = makeTrack("Lead", 27, false, [60, 62, 64]);
  const drums = makeTrack("Drums", 0, true, [38, 42]);
  const second = makeTrack("Second", 73, false, [67, 69]);

  const result = assignTracks([lead, drums, second], "TIA");

  assert.equal(result.assigned.length, 2);
  assert.equal(result.unassigned.length, 1);

  const byChannel = Object.fromEntries(result.assigned.map((a) => [a.channel, a]));
  assert.equal(byChannel.tia1.track, lead);
  assert.equal(byChannel.tia1.personality, "Standard square");
  assert.equal(byChannel.tia2.track, drums);
  assert.equal(byChannel.tia2.personality, "Noise/Percussion");

  assert.equal(result.unassigned[0].track, second);
  assert.match(result.unassigned[0].reason, /TIA/);
}

// 5) Detection bass per mediana: gmProgram=42 (Cello) ma note basse.
//    Mediana di [30, 35, 40, 45, 47] e' 40 (< 48) -> riconosciuto come basso.
{
  const lowCello = makeTrack("LowCello", 42, false, [30, 35, 40, 45, 47]);
  assert.ok(isBassTrack(lowCello));

  const result = assignTracks([lowCello], "NES");
  assert.equal(result.assigned.length, 1);
  assert.equal(result.assigned[0].channel, "triangle");
  assert.equal(result.assigned[0].personality, "Smooth bass");
}

// 5b) Cello con note medie -> non basso (resta su pulse).
{
  const midCello = makeTrack("MidCello", 42, false, [60, 62, 64, 65, 67]);
  assert.equal(isBassTrack(midCello), false);

  const result = assignTracks([midCello], "NES");
  assert.equal(result.assigned[0].channel, "pulse1");
}

// 5c) Boundary mediana: median == 48 NON e' basso (la soglia e' strict <).
{
  const onBoundary = makeTrack("Boundary", 0, false, [40, 48, 56]);
  assert.equal(isBassTrack(onBoundary), false);
}

// 6) Bass per gmProgram (32-39) anche con note alte: ha priorita.
{
  const bassHigh = makeTrack("HighBass", 33, false, [60, 64, 67]);
  assert.ok(isBassTrack(bassHigh));

  const result = assignTracks([bassHigh], "NES");
  assert.equal(result.assigned[0].channel, "triangle");
}

// 7) Multiple percussioni: la prima va a noise, le altre in unassigned.
{
  const drums1 = makeTrack("Drums1", 0, true, [36]);
  const drums2 = makeTrack("Drums2", 0, true, [42]);
  const lead = makeTrack("Lead", 27, false, [60, 62]);

  const result = assignTracks([drums1, drums2, lead], "NES");
  assert.equal(result.assigned.length, 2);
  assert.equal(result.unassigned.length, 1);

  const byChannel = Object.fromEntries(result.assigned.map((a) => [a.channel, a]));
  assert.equal(byChannel.noise.track, drums1);
  assert.equal(byChannel.pulse1.track, lead);

  assert.equal(result.unassigned[0].track, drums2);
  assert.match(result.unassigned[0].reason, /Noise/);
}

// 8) TIA con sola percussione: occupa Ch.1.
{
  const drums = makeTrack("Drums", 0, true, [36]);
  const result = assignTracks([drums], "TIA");
  assert.equal(result.assigned.length, 1);
  assert.equal(result.assigned[0].channel, "tia1");
  assert.equal(result.assigned[0].personality, "Noise/Percussion");
}

// 9) TIA con 2 melodici e niente percussione: entrambi assegnati.
{
  const lead = makeTrack("Lead", 27, false, [60, 62]);
  const second = makeTrack("Second", 73, false, [67, 69]);
  const result = assignTracks([lead, second], "TIA");
  assert.equal(result.assigned.length, 2);
  assert.equal(result.unassigned.length, 0);
  assert.equal(result.assigned[0].channel, "tia1");
  assert.equal(result.assigned[1].channel, "tia2");
}

// 10) Lista vuota -> output vuoto.
{
  const result = assignTracks([], "NES");
  assert.deepEqual(result, { assigned: [], unassigned: [] });
}

// 11) gmProgram null su melodico -> default Piano (Square tagliente).
{
  const noProgram = makeTrack("Generic", null, false, [60, 62]);
  const result = assignTracks([noProgram], "NES");
  assert.equal(result.assigned[0].personality, "Sharp square");
}

// 12) isPercussionTrack helper esposto.
{
  assert.equal(isPercussionTrack({ isPercussion: true }), true);
  assert.equal(isPercussionTrack({ isPercussion: false }), false);
  assert.equal(isPercussionTrack(null), false);
  assert.equal(isPercussionTrack({}), false);
}

// 13) Errori.
assert.throws(() => assignTracks(null, "NES"), /array/);
assert.throws(() => assignTracks([], "GBC"), /Unsupported chip/);

// 14) Output completo per ispezione visiva (NES con drums).
const showcase = assignTracks(
  [
    makeTrack("Lead", 56, false, [64, 65, 67]),
    makeTrack("Bass", 34, false, [36, 38]),
    makeTrack("Drums", 0, true, [38, 42]),
    makeTrack("Pad", 90, false, [55, 57]),
    makeTrack("Extra", 27, false, [60, 62]),
  ],
  "NES",
);

console.log("trackAssigner tests passed.");
console.log("NES showcase (5 tracks, one in excess):");
console.log(JSON.stringify(showcase, summarize, 2));

function summarize(key, value) {
  if (key === "track" && value && value.name) {
    return `<track ${value.name}>`;
  }
  return value;
}
