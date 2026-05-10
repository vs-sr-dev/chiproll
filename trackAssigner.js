(function createTrackAssigner(root, factory) {
  let gmMapping = null;

  if (typeof require === "function") {
    try {
      gmMapping = require("./gmMapping");
    } catch (_) {
      // Probabilmente browser senza require: cadiamo sul lookup globale.
    }
  }

  if (!gmMapping && root && root.GmMapping) {
    gmMapping = root.GmMapping;
  }

  if (!gmMapping) {
    throw new Error("trackAssigner requires gmMapping: load it before trackAssigner.js");
  }

  const exported = factory(gmMapping);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }

  if (root) {
    root.TrackAssigner = exported;
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function buildTrackAssigner(gmMapping) {
    const { getMapping } = gmMapping;

    const SUPPORTED_CHIPS = ["NES", "TIA"];
    const C3_MIDI = 48; // soglia bass-by-median, esclusiva: median strict < 48 -> basso.
    const NES_PULSE_CHANNELS = ["pulse1", "pulse2"];
    const TIA_SLOTS = ["tia1", "tia2"];

    function assignTracks(tracks, chip) {
      if (!Array.isArray(tracks)) {
        throw new Error("tracks must be an array");
      }

      if (!SUPPORTED_CHIPS.includes(chip)) {
        throw new Error(`Unsupported chip: ${chip}. Available: ${SUPPORTED_CHIPS.join(", ")}`);
      }

      return chip === "NES" ? assignNes(tracks) : assignTia(tracks);
    }

    function assignNes(tracks) {
      const assigned = [];
      const unassigned = [];
      const claimed = new Set();

      // 1) Bass -> Triangle (priorita 1 nel brief).
      const bassIdx = findFirst(tracks, claimed, isBassTrack);
      if (bassIdx !== -1) {
        claimed.add(bassIdx);
        assigned.push({
          track: tracks[bassIdx],
          channel: "triangle",
          personality: "Smooth bass",
        });
      }

      // 2) Percussion -> Noise.
      const percIdx = findFirst(tracks, claimed, isPercussionTrack);
      if (percIdx !== -1) {
        claimed.add(percIdx);
        assigned.push({
          track: tracks[percIdx],
          channel: "noise",
          personality: "Noise/Percussion",
        });
      }

      // 3) Tracce rimanenti -> Pulse 1, Pulse 2 in ordine.
      //    Eccezione: percussioni extra (oltre la prima) non vanno mai su Pulse,
      //    finiscono in unassigned. Le tracce bass-extra invece cadono su Pulse
      //    (basse o no, sono pitched).
      let pulseSlot = 0;
      for (let i = 0; i < tracks.length; i += 1) {
        if (claimed.has(i)) {
          continue;
        }

        const track = tracks[i];

        if (isPercussionTrack(track)) {
          unassigned.push({ track, reason: nesUnassignedReason(track) });
          claimed.add(i);
          continue;
        }

        if (pulseSlot >= NES_PULSE_CHANNELS.length) {
          unassigned.push({ track, reason: nesUnassignedReason(track) });
          claimed.add(i);
          continue;
        }

        const mapping = getMapping(track.gmProgram, "NES", false);
        assigned.push({
          track,
          channel: NES_PULSE_CHANNELS[pulseSlot],
          personality: mapping.personality,
        });
        pulseSlot += 1;
        claimed.add(i);
      }

      return { assigned, unassigned };
    }

    function nesUnassignedReason(track) {
      if (isPercussionTrack(track)) {
        return "NES Noise channel already taken by another percussion track";
      }

      if (isBassTrack(track)) {
        return "NES Triangle channel already taken by another bass track";
      }

      return "NES melodic channels (Pulse 1 / Pulse 2) already taken";
    }

    function assignTia(tracks) {
      const assigned = [];
      const unassigned = [];
      const claimed = new Set();
      let slotIdx = 0;

      // Strategia: il lead melodico tiene Ch.1 (slot 0), la percussione cade su Ch.2.
      // Se non c'e' alcun melodico, la percussione prende Ch.1.
      const leadIdx = findFirst(tracks, claimed, (t) => !isPercussionTrack(t));
      if (leadIdx !== -1) {
        claimed.add(leadIdx);
        const track = tracks[leadIdx];
        const mapping = getMapping(track.gmProgram, "TIA", false);
        assigned.push({
          track,
          channel: TIA_SLOTS[slotIdx],
          personality: mapping.personality,
        });
        slotIdx += 1;
      }

      const percIdx = findFirst(tracks, claimed, isPercussionTrack);
      if (percIdx !== -1 && slotIdx < TIA_SLOTS.length) {
        claimed.add(percIdx);
        assigned.push({
          track: tracks[percIdx],
          channel: TIA_SLOTS[slotIdx],
          personality: "Noise/Percussion",
        });
        slotIdx += 1;
      }

      // Tracce rimanenti -> riempiono eventuali slot residui (caso 2 melodici + 0 perc).
      for (let i = 0; i < tracks.length; i += 1) {
        if (claimed.has(i)) {
          continue;
        }

        const track = tracks[i];

        if (slotIdx >= TIA_SLOTS.length) {
          unassigned.push({ track, reason: tiaUnassignedReason(track) });
          claimed.add(i);
          continue;
        }

        const mapping = getMapping(track.gmProgram, "TIA", isPercussionTrack(track));
        assigned.push({
          track,
          channel: TIA_SLOTS[slotIdx],
          personality: mapping.personality,
        });
        slotIdx += 1;
        claimed.add(i);
      }

      return { assigned, unassigned };
    }

    function tiaUnassignedReason(track) {
      if (isPercussionTrack(track)) {
        return "TIA percussion channel (AUDC 8) already taken";
      }

      return "TIA channels (Ch.1 / Ch.2) already taken";
    }

    function isPercussionTrack(track) {
      return Boolean(track && track.isPercussion === true);
    }

    function isBassTrack(track) {
      if (!track || isPercussionTrack(track)) {
        return false;
      }

      const program = track.gmProgram;

      if (Number.isInteger(program) && program >= 32 && program <= 39) {
        return true;
      }

      const median = computeMedianPitch(track.notes);

      if (median !== null && median < C3_MIDI) {
        return true;
      }

      return false;
    }

    function computeMedianPitch(notes) {
      if (!Array.isArray(notes) || notes.length === 0) {
        return null;
      }

      const pitches = notes
        .map((note) => note.pitch)
        .filter((pitch) => Number.isInteger(pitch))
        .sort((a, b) => a - b);

      if (pitches.length === 0) {
        return null;
      }

      return pitches[Math.floor(pitches.length / 2)];
    }

    function findFirst(tracks, claimed, predicate) {
      for (let i = 0; i < tracks.length; i += 1) {
        if (!claimed.has(i) && predicate(tracks[i])) {
          return i;
        }
      }

      return -1;
    }

    return {
      SUPPORTED_CHIPS,
      C3_MIDI,
      assignTracks,
      isBassTrack,
      isPercussionTrack,
    };
  },
);
