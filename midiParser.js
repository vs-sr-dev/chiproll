(function createMidiParser(root, factory) {
  const exported = factory(root);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }

  if (root) {
    root.MidiParser = exported;
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function buildMidiParser(root) {
    function pitchToNoteName(pitch) {
      const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
      const pitchClass = ((pitch % 12) + 12) % 12;
      const octave = Math.floor(pitch / 12) - 1;
      return `${noteNames[pitchClass]}${octave}`;
    }

    function pitchToHz(pitch) {
      return 440 * (2 ** ((pitch - 69) / 12));
    }

    async function parseMidi(arrayBuffer) {
      if (!(arrayBuffer instanceof ArrayBuffer)) {
        throw new Error("parseMidi(arrayBuffer) requires a valid ArrayBuffer");
      }

      if (!root.Midi || typeof root.Midi !== "function") {
        throw new Error("@tonejs/midi is not available in the global context");
      }

      const midi = new root.Midi(arrayBuffer);
      const bpm = midi.header.tempos[0]?.bpm ?? 120;
      const ppq = midi.header.ppq;

      return {
        bpm,
        ppq,
        tracks: midi.tracks.map((track) => ({
          name: track.name || "Untitled track",
          gmProgram: Number.isInteger(track.instrument.number) ? track.instrument.number : null,
          isPercussion: track.channel === 9,
          notes: track.notes.map((note) => ({
            pitch: note.midi,
            noteName: pitchToNoteName(note.midi),
            hz: pitchToHz(note.midi),
            startTick: note.ticks,
            durationTicks: note.durationTicks,
            velocity: Math.round(note.velocity * 127),
          })),
        })),
      };
    }

    return {
      parseMidi,
      pitchToHz,
      pitchToNoteName,
    };
  },
);
