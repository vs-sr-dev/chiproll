(function createVoiceReducer(root, factory) {
  const exported = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }

  if (root) {
    root.VoiceReducer = exported;
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function buildVoiceReducer() {
    const STRATEGIES = ["highest", "lowest", "last"];

    function reduceToMonophonic(notes, strategy = "highest") {
      if (!STRATEGIES.includes(strategy)) {
        throw new Error(
          `Unsupported strategy: ${strategy}. Available: ${STRATEGIES.join(", ")}`,
        );
      }

      if (!Array.isArray(notes)) {
        throw new Error("notes must be an array");
      }

      if (notes.length === 0) {
        return [];
      }

      const indexed = notes
        .filter((note) => Number.isFinite(note.durationTicks) && note.durationTicks > 0)
        .map((note, originalIndex) => ({ ...note, __originalIndex: originalIndex }));

      if (indexed.length === 0) {
        return [];
      }

      const transitions = new Set();

      for (const note of indexed) {
        transitions.add(note.startTick);
        transitions.add(note.startTick + note.durationTicks);
      }

      const sortedTransitions = [...transitions].sort((a, b) => a - b);
      const segments = [];

      for (let i = 0; i < sortedTransitions.length - 1; i += 1) {
        const t1 = sortedTransitions[i];
        const t2 = sortedTransitions[i + 1];
        const sample = (t1 + t2) / 2;
        const active = indexed.filter(
          (note) => note.startTick <= sample && sample < note.startTick + note.durationTicks,
        );

        if (active.length === 0) {
          continue;
        }

        const winner = pickWinner(active, strategy);
        const previous = segments[segments.length - 1];

        if (
          previous &&
          previous.winner.__originalIndex === winner.__originalIndex &&
          previous.endTick === t1
        ) {
          previous.endTick = t2;
        } else {
          segments.push({ winner, startTick: t1, endTick: t2 });
        }
      }

      return segments.map((segment) => {
        const note = stripInternalFields(segment.winner);

        return {
          ...note,
          startTick: segment.startTick,
          durationTicks: segment.endTick - segment.startTick,
        };
      });
    }

    function pickWinner(active, strategy) {
      switch (strategy) {
        case "highest":
          return active.reduce((best, candidate) => (candidate.pitch > best.pitch ? candidate : best));
        case "lowest":
          return active.reduce((best, candidate) => (candidate.pitch < best.pitch ? candidate : best));
        case "last":
          return active.reduce((best, candidate) => {
            if (candidate.startTick !== best.startTick) {
              return candidate.startTick > best.startTick ? candidate : best;
            }

            return candidate.__originalIndex > best.__originalIndex ? candidate : best;
          });
        default:
          throw new Error(`Unhandled strategy: ${strategy}`);
      }
    }

    function stripInternalFields(note) {
      const copy = { ...note };
      delete copy.__originalIndex;
      return copy;
    }

    function reduceTrack(track, strategy = "highest") {
      return {
        ...track,
        notes: reduceToMonophonic(track.notes, strategy),
      };
    }

    return {
      STRATEGIES,
      reduceToMonophonic,
      reduceTrack,
    };
  },
);
