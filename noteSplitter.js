(function createNoteSplitter(root, factory) {
  const exported = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }

  if (root) {
    root.NoteSplitter = exported;
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function buildNoteSplitter() {
    function splitNotesIntoChunks(notes, chunkSize) {
      if (!Array.isArray(notes)) {
        throw new Error("notes must be an array");
      }
      if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
        throw new Error("chunkSize must be a positive integer");
      }

      let maxEnd = 0;
      for (const note of notes) {
        if (!Number.isInteger(note.step) || note.step < 0) continue;
        const dur = Math.max(1, Number.isInteger(note.duration) ? note.duration : 1);
        maxEnd = Math.max(maxEnd, note.step + dur);
      }

      const numChunks = Math.max(1, Math.ceil(maxEnd / chunkSize));
      const chunks = Array.from({ length: numChunks }, () => []);

      for (const note of notes) {
        if (!Number.isInteger(note.step) || note.step < 0) continue;

        const dur = Math.max(1, Number.isInteger(note.duration) ? note.duration : 1);
        const endStep = note.step + dur;

        let cursor = note.step;
        let isFirstSegment = true;

        while (cursor < endStep) {
          const chunkIdx = Math.floor(cursor / chunkSize);
          const chunkBoundary = (chunkIdx + 1) * chunkSize;
          const segEnd = Math.min(endStep, chunkBoundary);
          const localStart = cursor - chunkIdx * chunkSize;
          const segDuration = segEnd - cursor;

          chunks[chunkIdx].push({
            ...note,
            step: localStart,
            duration: segDuration,
            isContinuation: !isFirstSegment,
          });

          cursor = segEnd;
          isFirstSegment = false;
        }
      }

      return chunks;
    }

    return {
      splitNotesIntoChunks,
    };
  },
);
