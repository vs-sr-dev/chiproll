(function createQuantizer(root, factory) {
  const exported = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }

  if (root) {
    root.Quantizer = exported;
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function buildQuantizer() {
    const DEFAULT_STEPS_PER_BEAT = 4;

    function getTicksPerStep(ppq, stepsPerBeat) {
      if (!Number.isFinite(ppq) || ppq <= 0) {
        throw new Error("ppq must be a positive number");
      }

      if (!Number.isFinite(stepsPerBeat) || stepsPerBeat <= 0) {
        throw new Error("stepsPerBeat must be a positive number");
      }

      return ppq / stepsPerBeat;
    }

    function tickToStep(tick, ppq, stepsPerBeat = DEFAULT_STEPS_PER_BEAT) {
      if (!Number.isFinite(tick)) {
        throw new Error("tick must be a finite number");
      }

      const ticksPerStep = getTicksPerStep(ppq, stepsPerBeat);
      return Math.round(tick / ticksPerStep);
    }

    function durationToSteps(durationTicks, ppq, stepsPerBeat = DEFAULT_STEPS_PER_BEAT) {
      if (!Number.isFinite(durationTicks) || durationTicks < 0) {
        throw new Error("durationTicks must be a number >= 0");
      }

      const ticksPerStep = getTicksPerStep(ppq, stepsPerBeat);
      const raw = Math.round(durationTicks / ticksPerStep);
      return Math.max(1, raw);
    }

    function quantizeNote(note, ppq, stepsPerBeat = DEFAULT_STEPS_PER_BEAT) {
      const step = tickToStep(note.startTick, ppq, stepsPerBeat);
      const duration = durationToSteps(note.durationTicks, ppq, stepsPerBeat);

      return {
        ...note,
        step,
        duration,
      };
    }

    function quantizeTrack(track, ppq, stepsPerBeat = DEFAULT_STEPS_PER_BEAT) {
      return {
        ...track,
        notes: track.notes.map((note) => quantizeNote(note, ppq, stepsPerBeat)),
      };
    }

    return {
      DEFAULT_STEPS_PER_BEAT,
      tickToStep,
      durationToSteps,
      quantizeNote,
      quantizeTrack,
    };
  },
);
