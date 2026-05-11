(function buildChipRollApp() {
  const root = document.getElementById("piano-roll-root");
  const patternRackRoot = document.getElementById("pattern-rack");
  const songLaneRoot = document.getElementById("song-lane");
  const SONG_DRAG_RACK_MIME = "application/x-chiproll-rack-pattern";
  const SONG_DRAG_REORDER_MIME = "application/x-chiproll-song-index";
  const chipSelect = document.getElementById("chip-select");
  const heroTitle = document.getElementById("hero-title");
  const heroCopy = document.getElementById("hero-copy");
  const heroChip = document.getElementById("hero-chip");
  const panelTitle = document.getElementById("panel-title");
  const playButton = document.getElementById("play-button");
  const stopButton = document.getElementById("stop-button");
  const loopButton = document.getElementById("loop-button");
  const clearButton = document.getElementById("clear-button");
  const bpmInput = document.getElementById("bpm-input");
  const stepCountSelect = document.getElementById("step-count-select");
  const modePatternButton = document.getElementById("mode-pattern-button");
  const modeSongButton = document.getElementById("mode-song-button");
  const saveButton = document.getElementById("save-button");
  const loadButton = document.getElementById("load-button");
  const loadFileInput = document.getElementById("load-file-input");
  const importButton = document.getElementById("import-button");
  const SESSION_FILE_VERSION = 1;
  const importOverlay = document.getElementById("import-overlay");
  const importClose = document.getElementById("import-close");
  const importDropZone = document.getElementById("import-drop-zone");
  const importFileInput = document.getElementById("import-file-input");
  const importStatus = document.getElementById("import-status");
  const importControls = document.getElementById("import-controls");
  const voiceStrategySelect = document.getElementById("voice-strategy-select");
  const importSummary = document.getElementById("import-summary");
  const importTracksList = document.getElementById("import-tracks");
  const importUnassignedList = document.getElementById("import-unassigned");
  const importCancel = document.getElementById("import-cancel");
  const importConfirm = document.getElementById("import-confirm");
  const {
    TIA_TIMBRE_OPTIONS,
    POKEY_TIMBRE_OPTIONS,
    getNearestNote,
    getNearestPokeyNote,
    getTiaFrequencyTable,
  } = window.FrequencyEngine;
  const { parseMidi } = window.MidiParser;
  const { quantizeTrack } = window.Quantizer;
  const { reduceTrack } = window.VoiceReducer;
  const { PERSONALITIES, getGmFamily } = window.GmMapping;
  const { assignTracks } = window.TrackAssigner;
  const VOICE_STRATEGIES = ["highest", "lowest", "last"];
  const NES_CHANNEL_LABELS = {
    pulse1: "Pulse 1",
    pulse2: "Pulse 2",
    triangle: "Triangle",
    noise: "Noise",
  };
  const TIA_CHANNEL_LABELS = {
    tia1: "TIA Ch.1",
    tia2: "TIA Ch.2",
  };
  const POKEY_CHANNEL_LABELS = {
    pokey1: "POKEY Ch.1",
    pokey2: "POKEY Ch.2",
    pokey3: "POKEY Ch.3",
    pokey4: "POKEY Ch.4",
  };
  const STEP_COUNT_OPTIONS = [8, 16, 32];
  const BPM_MIN = 40;
  const BPM_MAX = 300;
  const PREVIEW_DURATION_SECONDS = 0.15;
  const ATTACK_SECONDS = 0.005;
  const RELEASE_SECONDS = 0.05;
  const CHIP_OPTIONS = {
    NES: {
      heroTitle: "ChipRoll - NES / Famicom",
      heroCopy:
        "Four separate NES channels, 16 steps and instant playback. Pulse 1 / Pulse 2 / Triangle are pitched; Noise is percussive.",
      heroChip: "NES / Famicom",
      panelTitle: "Pulse 1 / Pulse 2 / Triangle / Noise",
    },
    TIA: {
      heroTitle: "ChipRoll - Atari TIA",
      heroCopy:
        "Two TIA channels with per-lane selectable timbre. Each timbre shows only the pitches physically available on the chip.",
      heroChip: "Atari TIA",
      panelTitle: "TIA Ch.1 / TIA Ch.2",
    },
    POKEY: {
      heroTitle: "ChipRoll - Atari POKEY",
      heroCopy:
        "Four POKEY channels across 5 octaves (B2-B7). Each channel has a per-pattern timbre (Pure tone / Buzz / Noise) — to switch timbre on the same channel mid-song, use a separate pattern.",
      heroChip: "Atari POKEY",
      panelTitle: "POKEY Ch.1 / Ch.2 / Ch.3 / Ch.4",
    },
  };
  const NES_CHANNEL_DEFS = [
    {
      id: "pulse1",
      name: "Pulse 1",
      chip: "NES_PULSE",
      profile: "NES",
      kind: "pitched",
      waveform: "square",
      laneClass: "pulse",
      rowLabel: "Note / Step",
      supportsIntonation: true,
      rows: buildNoteRange("C2", "C7"),
    },
    {
      id: "pulse2",
      name: "Pulse 2",
      chip: "NES_PULSE",
      profile: "NES",
      kind: "pitched",
      waveform: "square",
      laneClass: "pulse",
      rowLabel: "Note / Step",
      supportsIntonation: true,
      rows: buildNoteRange("C2", "C7"),
    },
    {
      id: "triangle",
      name: "Triangle",
      chip: "NES_TRIANGLE",
      profile: "NES",
      kind: "pitched",
      waveform: "triangle",
      laneClass: "triangle",
      rowLabel: "Note / Step",
      supportsIntonation: true,
      rows: buildNoteRange("C1", "C6"),
    },
    {
      id: "noise",
      name: "Noise",
      chip: "NES_NOISE",
      profile: "NES",
      kind: "noise",
      waveform: "noise",
      laneClass: "noise",
      rowLabel: "Level / Step",
      supportsIntonation: false,
      rows: buildNoiseRows(),
    },
  ];
  const TIA_CHANNEL_DEFS = [
    { id: "tia1", name: "TIA Ch.1", profile: "TIA" },
    { id: "tia2", name: "TIA Ch.2", profile: "TIA" },
  ];
  // POKEY: 4 canali con stesso range musicale (clock fisso 64 kHz su tutti).
  // rows e' pre-calcolato qui (note continue, NES-style) — il timbre cambia
  // solo come l'audio synth e il chip interpretano AUDC, non i pitch.
  const POKEY_CHANNEL_DEFS = [
    { id: "pokey1", name: "POKEY Ch.1", profile: "POKEY", rows: buildNoteRange("C2", "C7") },
    { id: "pokey2", name: "POKEY Ch.2", profile: "POKEY", rows: buildNoteRange("C2", "C7") },
    { id: "pokey3", name: "POKEY Ch.3", profile: "POKEY", rows: buildNoteRange("C2", "C7") },
    { id: "pokey4", name: "POKEY Ch.4", profile: "POKEY", rows: buildNoteRange("C2", "C7") },
  ];
  // Pattern-aware state (Step 1 del refactor patterns/song).
  // - patterns: dict { [id]: Pattern }, dove Pattern = { id, label, stepCount, channels: { [id]: { notes: Map, audc? } } }
  // - channelGlobals: mixer state (muted/solo/collapsed) trasversale a tutti i pattern.
  // - patternOrder: ordine dei pattern nel rack (puo' divergere da song).
  // - song: sequenza di patternId per Song mode.
  // - currentPatternId / transportMode: stato di edit/playback, salvati nel JSON.
  const appState = {
    activeChip: "NES",
    tiaRowsByAudc: {},
    bpm: 120,
    loop: false,
    patterns: {},
    patternOrder: [],
    song: [],
    currentPatternId: null,
    transportMode: "pattern",
    channelGlobals: {},
  };

  // Counter per la generazione di ID pattern (P1, P2, ...). Non si decrementa mai
  // alla delete per evitare collisioni con pattern referenziati nella song.
  let patternIdCounter = 0;

  function nextPatternId() {
    patternIdCounter += 1;
    return `P${patternIdCounter}`;
  }

  function currentPattern() {
    return appState.patterns[appState.currentPatternId];
  }

  function currentStepCount() {
    const pattern = currentPattern();
    return pattern ? pattern.stepCount : 16;
  }

  function channelData(channelId, patternId = appState.currentPatternId) {
    const pattern = appState.patterns[patternId];
    return pattern ? pattern.channels[channelId] : undefined;
  }

  function channelMixer(channelId) {
    return appState.channelGlobals[channelId];
  }

  function getChannelIds() {
    return Object.keys(appState.channelGlobals);
  }

  // Pattern in edit-label inline. null = nessun pattern in editing.
  // Quando settato, renderPatternRack() disegna un <input> al posto della pill.
  let editingPatternLabelId = null;

  function renderPatternRack() {
    patternRackRoot.innerHTML = "";

    const onlyOnePattern = appState.patternOrder.length === 1;

    for (const patternId of appState.patternOrder) {
      const pattern = appState.patterns[patternId];
      const isActive = patternId === appState.currentPatternId;
      const isEditing = patternId === editingPatternLabelId;

      if (isEditing) {
        patternRackRoot.appendChild(renderPatternLabelInput(pattern));
        continue;
      }

      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = `pattern-pill ${isActive ? "active" : ""}`.trim();
      pill.setAttribute("role", "tab");
      pill.setAttribute("aria-selected", String(isActive));
      pill.dataset.patternId = patternId;
      pill.draggable = true;
      pill.addEventListener("dragstart", (event) => {
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData(SONG_DRAG_RACK_MIME, patternId);
        pill.classList.add("dragging");
      });
      pill.addEventListener("dragend", () => {
        pill.classList.remove("dragging");
      });

      const idSpan = document.createElement("span");
      idSpan.className = "pattern-pill-id";
      idSpan.textContent = patternId;
      pill.appendChild(idSpan);

      if (pattern.label) {
        const labelSpan = document.createElement("span");
        labelSpan.className = "pattern-pill-label";
        labelSpan.textContent = pattern.label;
        pill.appendChild(labelSpan);
      }

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "pattern-pill-delete";
      deleteButton.setAttribute("aria-label", `Delete pattern ${patternId}`);
      deleteButton.textContent = "×";
      if (onlyOnePattern) {
        deleteButton.disabled = true;
      }
      deleteButton.addEventListener("click", (event) => {
        // Stop propagation: il click sulla X non deve switchare al pattern.
        event.stopPropagation();
        deletePattern(patternId);
      });
      pill.appendChild(deleteButton);

      pill.addEventListener("click", () => switchPattern(patternId));
      pill.addEventListener("dblclick", (event) => {
        event.preventDefault();
        editingPatternLabelId = patternId;
        renderPatternRack();
      });

      patternRackRoot.appendChild(pill);
    }

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "pattern-rack-add";
    addButton.setAttribute("aria-label", "Add pattern");
    addButton.textContent = "+";
    addButton.addEventListener("click", createPattern);
    patternRackRoot.appendChild(addButton);
  }

  function renderPatternLabelInput(pattern) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "pattern-pill-label-input";
    input.value = pattern.label || "";
    input.placeholder = pattern.id;
    input.setAttribute("aria-label", `Rename ${pattern.id}`);
    input.maxLength = 32;

    const commit = () => {
      const value = input.value.trim();
      pattern.label = value === "" ? null : value;
      editingPatternLabelId = null;
      renderPatternRack();
    };
    const cancel = () => {
      editingPatternLabelId = null;
      renderPatternRack();
    };

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commit();
      } else if (event.key === "Escape") {
        event.preventDefault();
        cancel();
      }
    });
    input.addEventListener("blur", commit);
    // Focus + select dopo il mount nel DOM (microtask).
    queueMicrotask(() => {
      input.focus();
      input.select();
    });
    return input;
  }

  function renderSongLane() {
    songLaneRoot.innerHTML = "";

    const label = document.createElement("span");
    label.className = "song-lane-label";
    label.textContent = "Song";
    songLaneRoot.appendChild(label);

    if (appState.song.length === 0) {
      const empty = document.createElement("span");
      empty.className = "song-lane-empty";
      empty.textContent = "Drag patterns here to build the song";
      songLaneRoot.appendChild(empty);
    }

    for (let i = 0; i < appState.song.length; i += 1) {
      songLaneRoot.appendChild(renderSongSlot(i));
    }

    songLaneRoot.appendChild(renderSongTail());
  }

  function renderSongSlot(index) {
    const patternId = appState.song[index];
    const pattern = appState.patterns[patternId];

    const slot = document.createElement("span");
    slot.className = "song-lane-slot";
    slot.dataset.songIndex = String(index);

    const indicator = document.createElement("span");
    indicator.className = "song-drop-indicator";
    slot.appendChild(indicator);

    const pill = document.createElement("span");
    const isPlayingHere = index === activeSongIndex;
    pill.className = `song-pill ${isPlayingHere ? "playing" : ""}`.trim();
    pill.setAttribute("role", "listitem");
    pill.draggable = true;
    pill.dataset.songIndex = String(index);

    const idSpan = document.createElement("span");
    idSpan.className = "song-pill-id";
    idSpan.textContent = patternId;
    pill.appendChild(idSpan);

    if (pattern && pattern.label) {
      const labelSpan = document.createElement("span");
      labelSpan.className = "pattern-pill-label";
      labelSpan.textContent = pattern.label;
      pill.appendChild(labelSpan);
    }

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "song-pill-delete";
    deleteButton.setAttribute("aria-label", `Remove ${patternId} at position ${index + 1}`);
    deleteButton.textContent = "×";
    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      removeSongEntryAt(index);
    });
    deleteButton.addEventListener("mousedown", (event) => {
      // Evita che il mousedown sulla X faccia partire il drag del pill.
      event.stopPropagation();
    });
    pill.appendChild(deleteButton);

    pill.addEventListener("dragstart", (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(SONG_DRAG_REORDER_MIME, String(index));
      pill.classList.add("dragging");
    });
    pill.addEventListener("dragend", () => {
      pill.classList.remove("dragging");
    });

    slot.appendChild(pill);

    slot.addEventListener("dragover", (event) => {
      if (!hasSongPayload(event)) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = isRackPayload(event) ? "copy" : "move";
      clearSongDropIndicators();
      slot.classList.add("drop-before");
    });
    slot.addEventListener("dragleave", (event) => {
      if (event.currentTarget.contains(event.relatedTarget)) {
        return;
      }
      slot.classList.remove("drop-before");
    });
    slot.addEventListener("drop", (event) => {
      if (!hasSongPayload(event)) {
        return;
      }
      event.preventDefault();
      slot.classList.remove("drop-before");
      handleSongDrop(event, index);
    });

    return slot;
  }

  function renderSongTail() {
    const tail = document.createElement("span");
    tail.className = "song-lane-tail";

    const indicator = document.createElement("span");
    indicator.className = "song-drop-indicator";
    tail.appendChild(indicator);

    tail.addEventListener("dragover", (event) => {
      if (!hasSongPayload(event)) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = isRackPayload(event) ? "copy" : "move";
      clearSongDropIndicators();
      tail.classList.add("drop-active");
    });
    tail.addEventListener("dragleave", (event) => {
      if (event.currentTarget.contains(event.relatedTarget)) {
        return;
      }
      tail.classList.remove("drop-active");
    });
    tail.addEventListener("drop", (event) => {
      if (!hasSongPayload(event)) {
        return;
      }
      event.preventDefault();
      tail.classList.remove("drop-active");
      handleSongDrop(event, appState.song.length);
    });

    return tail;
  }

  function hasSongPayload(event) {
    const types = Array.from(event.dataTransfer.types || []);
    return types.includes(SONG_DRAG_RACK_MIME) || types.includes(SONG_DRAG_REORDER_MIME);
  }

  function isRackPayload(event) {
    // I browser bloccano getData() in dragover; types resta accessibile, quindi
    // discriminiamo source via MIME distinta (rack vs song-reorder).
    return Array.from(event.dataTransfer.types || []).includes(SONG_DRAG_RACK_MIME);
  }

  function clearSongDropIndicators() {
    const slots = songLaneRoot.querySelectorAll(".song-lane-slot.drop-before");
    slots.forEach((s) => s.classList.remove("drop-before"));
    const tails = songLaneRoot.querySelectorAll(".song-lane-tail.drop-active");
    tails.forEach((t) => t.classList.remove("drop-active"));
  }

  function handleSongDrop(event, targetIndex) {
    const rackPatternId = event.dataTransfer.getData(SONG_DRAG_RACK_MIME);
    if (rackPatternId) {
      if (!appState.patterns[rackPatternId]) {
        return;
      }
      appState.song.splice(targetIndex, 0, rackPatternId);
      render();
      return;
    }
    const reorderRaw = event.dataTransfer.getData(SONG_DRAG_REORDER_MIME);
    if (reorderRaw === "") {
      return;
    }
    const fromIndex = Number(reorderRaw);
    if (!Number.isInteger(fromIndex) || fromIndex < 0 || fromIndex >= appState.song.length) {
      return;
    }
    // Drop su se stesso o subito dopo se stesso: no-op.
    if (targetIndex === fromIndex || targetIndex === fromIndex + 1) {
      return;
    }
    const [moved] = appState.song.splice(fromIndex, 1);
    const adjustedTarget = targetIndex > fromIndex ? targetIndex - 1 : targetIndex;
    appState.song.splice(adjustedTarget, 0, moved);
    render();
  }

  function removeSongEntryAt(index) {
    if (index < 0 || index >= appState.song.length) {
      return;
    }
    appState.song.splice(index, 1);
    render();
  }

  function switchPattern(id) {
    if (id === appState.currentPatternId) {
      return;
    }
    if (!appState.patterns[id]) {
      return;
    }
    stopPlayback();
    appState.currentPatternId = id;
    render();
  }

  function createPattern() {
    // Eredita stepCount del pattern corrente (decisione D1.opt1).
    // Note vuote, AUDC TIA al default (12).
    const inheritedStepCount = currentStepCount();
    const newId = nextPatternId();
    appState.patterns[newId] = createEmptyPattern(newId, appState.activeChip, inheritedStepCount);
    appState.patternOrder.push(newId);
    appState.song.push(newId);
    stopPlayback();
    appState.currentPatternId = newId;
    render();
  }

  function duplicatePattern(sourceId) {
    const source = appState.patterns[sourceId];
    if (!source) {
      return;
    }

    const newId = nextPatternId();

    // Deep clone canali + note. Le note sono oggetti plain; spread basta.
    const channels = {};
    for (const [chId, chData] of Object.entries(source.channels)) {
      const notesMap = new Map();
      for (const [key, entry] of chData.notes.entries()) {
        notesMap.set(key, { ...entry });
      }
      const out = { notes: notesMap };
      if (chData.audc !== undefined) {
        out.audc = chData.audc;
      }
      channels[chId] = out;
    }

    appState.patterns[newId] = {
      id: newId,
      label: null,
      stepCount: source.stepCount,
      channels,
    };

    // Inserisce subito dopo il source nel rack; appende alla song
    // (coerente con createPattern).
    const orderIdx = appState.patternOrder.indexOf(sourceId);
    if (orderIdx === -1) {
      appState.patternOrder.push(newId);
    } else {
      appState.patternOrder.splice(orderIdx + 1, 0, newId);
    }
    appState.song.push(newId);

    stopPlayback();
    appState.currentPatternId = newId;
    render();
  }

  function goToAdjacentPattern(direction) {
    const order = appState.patternOrder;
    if (order.length <= 1) {
      return;
    }
    const idx = order.indexOf(appState.currentPatternId);
    if (idx === -1) {
      return;
    }
    const nextIdx = (idx + direction + order.length) % order.length;
    switchPattern(order[nextIdx]);
  }

  function deletePattern(id) {
    if (appState.patternOrder.length <= 1) {
      return;
    }
    if (!appState.patterns[id]) {
      return;
    }

    const songRefs = appState.song.filter((pid) => pid === id).length;
    if (songRefs > 0) {
      const confirmed = window.confirm(
        `Pattern ${id} is used ${songRefs} time${songRefs === 1 ? "" : "s"} in the song. Delete and remove from song?`,
      );
      if (!confirmed) {
        return;
      }
    }

    appState.song = appState.song.filter((pid) => pid !== id);
    appState.patternOrder = appState.patternOrder.filter((pid) => pid !== id);
    delete appState.patterns[id];

    if (appState.currentPatternId === id) {
      appState.currentPatternId = appState.patternOrder[0];
      stopPlayback();
    }

    render();
  }
  const importSession = {
    parsedSong: null,
    result: null,
    overrides: new Map(),
    voiceStrategy: "highest",
  };
  let audioContext = null;
  let cachedNoiseBuffer = null;
  let isPlaying = false;
  let playbackCleanupTimerId = null;
  let playheadTimerIds = [];
  let activeStep = null;
  let activeSongIndex = null;
  let copiedExportId = null;
  let copiedExportTimerId = null;
  let dragState = null;
  let suppressNextClick = false;
  const DRAG_THRESHOLD_PX = 4;
  const dragPreviewCells = new Set();
  const activeVoices = new Set();

  resetChannelsForChip("NES");

  playButton.addEventListener("click", () => {
    void startPlayback();
  });

  stopButton.addEventListener("click", () => {
    stopPlayback();
  });

  loopButton.addEventListener("click", () => {
    appState.loop = !appState.loop;
    updateLoopButtonVisual();
  });

  clearButton.addEventListener("click", () => {
    clearAllNotes();
  });

  bpmInput.addEventListener("change", (event) => {
    handleBpmChange(event);
  });

  stepCountSelect.addEventListener("change", (event) => {
    handleStepCountChange(event);
  });

  modePatternButton.addEventListener("click", () => setTransportMode("pattern"));
  modeSongButton.addEventListener("click", () => setTransportMode("song"));

  saveButton.addEventListener("click", handleSaveSession);
  loadButton.addEventListener("click", () => loadFileInput.click());
  loadFileInput.addEventListener("change", (event) => {
    void handleLoadFileSelected(event);
  });

  importButton.addEventListener("click", openImportPanel);
  importClose.addEventListener("click", closeImportPanel);
  importCancel.addEventListener("click", closeImportPanel);
  importConfirm.addEventListener("click", handleConfirmImport);
  importFileInput.addEventListener("change", (event) => {
    void handleImportFileSelected(event);
  });
  importDropZone.addEventListener("click", () => importFileInput.click());
  importDropZone.addEventListener("dragover", handleDragOver);
  importDropZone.addEventListener("dragleave", handleDragLeave);
  importDropZone.addEventListener("drop", (event) => {
    void handleFileDrop(event);
  });
  voiceStrategySelect.addEventListener("change", (event) => {
    handleVoiceStrategyChange(event.target.value);
  });

  chipSelect.addEventListener("change", (event) => {
    void handleChipChange(event.target.value);
  });

  document.addEventListener("keydown", (event) => {
    void handleGlobalKeydown(event);
  });

  document.addEventListener("mousemove", handleDocumentMouseMove);

  document.addEventListener("mouseup", (event) => {
    if (event.button !== 0 || !dragState) {
      return;
    }

    const mode = dragState.mode;

    if (mode === "pending") {
      // Sotto soglia: trattato come click puro, lascio fare al click handler.
      cleanupDragPreviewVisuals();
      dragState = null;
      return;
    }

    if (mode === "create") {
      const moved = dragState.startStep !== dragState.currentStep;
      if (moved) {
        suppressClickBriefly();
        void finalizeDragCreate();
      } else {
        // Threshold attraversata ma cella invariata (wobble): cleanup e lascio
        // che il click handler faccia il toggleCell come per un single-click.
        cleanupDragPreviewVisuals();
        dragState = null;
      }
      return;
    }

    if (mode === "move-block") {
      suppressClickBriefly();
      finalizeMoveBlock();
      return;
    }

    if (mode === "move-pitch") {
      suppressClickBriefly();
      finalizeMovePitch();
      return;
    }
  });

  function suppressClickBriefly() {
    suppressNextClick = true;
    setTimeout(() => {
      suppressNextClick = false;
    }, 0);
  }

  chipSelect.value = appState.activeChip;
  bpmInput.value = String(appState.bpm);
  stepCountSelect.value = String(currentStepCount());
  updateTransportState();
  updateLoopButtonVisual();
  updateTransportModeVisual();
  render();

  window.ChipRoll = window.ChipRoll || {};
  window.ChipRoll.parseMidi = parseMidi;
  window.ChipRoll.runImportPipeline = runImportPipeline;
  window.ChipRoll.applyImportToPianoRoll = applyImportToPianoRoll;
  window.ChipRoll.readFileAsArrayBuffer = readFileAsArrayBuffer;
  window.ChipRoll.openImportPanel = openImportPanel;
  window.ChipRoll.getImportSession = () => ({
    parsedSong: importSession.parsedSong,
    result: importSession.result,
    overrides: Object.fromEntries(importSession.overrides),
    voiceStrategy: importSession.voiceStrategy,
  });

  function render() {
    // stepCount e' per-pattern: switchando pattern, il select del transport
    // riflette il valore del nuovo pattern attivo.
    stepCountSelect.value = String(currentStepCount());

    renderPatternRack();
    renderSongLane();

    root.innerHTML = "";
    updateHeaderCopy();

    const channelsStack = document.createElement("div");
    channelsStack.className = "channels-stack";

    for (const channel of getCurrentChannels()) {
      channelsStack.appendChild(renderChannel(channel));
    }

    root.appendChild(channelsStack);
    root.appendChild(renderExportSection());
  }

  function updateHeaderCopy() {
    const copy = CHIP_OPTIONS[appState.activeChip];
    heroTitle.textContent = copy.heroTitle;
    heroCopy.textContent = copy.heroCopy;
    heroChip.textContent = copy.heroChip;
    panelTitle.textContent = copy.panelTitle;
  }

  function renderChannel(channel) {
    const data = channelData(channel.id);
    const mixer = channelMixer(channel.id);
    const lane = document.createElement("section");
    lane.className = `channel-lane lane-${channel.laneClass} ${mixer.collapsed ? "collapsed" : ""}`.trim();

    const laneHeader = document.createElement("div");
    laneHeader.className = "channel-header";

    const laneTitle = document.createElement("div");
    laneTitle.className = "channel-title";

    const laneEyebrow = document.createElement("p");
    laneEyebrow.className = "channel-label";
    laneEyebrow.textContent = channel.kind === "noise" ? "Percussion" : "Pitched";

    const laneName = document.createElement("h3");
    laneName.textContent = (channel.profile === "TIA" || channel.profile === "POKEY")
      ? `${channel.name} - ${channel.timbreLabel}`
      : channel.name;

    laneTitle.appendChild(laneEyebrow);
    laneTitle.appendChild(laneName);

    const laneControls = document.createElement("div");
    laneControls.className = "channel-controls";

    const collapseButton = document.createElement("button");
    collapseButton.type = "button";
    collapseButton.className = "lane-button collapse-button";
    collapseButton.textContent = mixer.collapsed ? "^" : "v";
    collapseButton.setAttribute(
      "aria-label",
      mixer.collapsed ? `Expand ${channel.name}` : `Collapse ${channel.name}`,
    );
    collapseButton.addEventListener("click", () => toggleCollapsed(channel.id));

    laneControls.appendChild(collapseButton);

    if (channel.profile === "TIA" || channel.profile === "POKEY") {
      laneControls.appendChild(renderTimbreSelect(channel, data));
    }

    const muteButton = document.createElement("button");
    muteButton.type = "button";
    muteButton.className = `lane-button ${mixer.muted ? "active" : ""}`.trim();
    muteButton.textContent = "Mute";
    muteButton.addEventListener("click", () => toggleMute(channel.id));

    const soloButton = document.createElement("button");
    soloButton.type = "button";
    soloButton.className = `lane-button ${mixer.solo ? "active" : ""}`.trim();
    soloButton.textContent = "Solo";
    soloButton.addEventListener("click", () => toggleSolo(channel.id));

    laneControls.appendChild(muteButton);
    laneControls.appendChild(soloButton);

    laneHeader.appendChild(laneTitle);
    laneHeader.appendChild(laneControls);
    lane.appendChild(laneHeader);

    if (mixer.collapsed) {
      lane.appendChild(renderCollapsedSummary(channel.id));
    } else {
      lane.appendChild(renderGrid(channel, data));
    }

    return lane;
  }

  function renderCollapsedSummary(channelId) {
    const summary = document.createElement("div");
    summary.className = "collapsed-summary";
    const noteCount = channelData(channelId).notes.size;
    summary.textContent = noteCount === 0
      ? "Lane collapsed. No notes."
      : `Lane collapsed. ${noteCount} note${noteCount === 1 ? "" : "s"}.`;
    return summary;
  }

  function renderExportSection() {
    const section = document.createElement("section");
    section.className = "export-section";

    const header = document.createElement("div");
    header.className = "export-header";

    const titleWrap = document.createElement("div");
    const label = document.createElement("p");
    label.className = "panel-label";
    label.textContent = "Export";
    const title = document.createElement("h3");
    title.className = "export-title";
    title.textContent = "Copy to clipboard";
    titleWrap.appendChild(label);
    titleWrap.appendChild(title);

    const description = document.createElement("p");
    description.className = "export-copy";
    description.textContent =
      "Generate text or JSON from the current session — no downloads or extra windows.";

    header.appendChild(titleWrap);
    header.appendChild(description);
    section.appendChild(header);

    const buttons = document.createElement("div");
    buttons.className = "export-buttons";

    if (appState.activeChip === "NES") {
      buttons.appendChild(
        renderExportButton("FamiTracker Text", "famitracker", async () => {
          await copyExportText("famitracker", buildFamiTrackerText());
        }),
      );
      buttons.appendChild(
        renderExportButton("ca65 Assembly", "ca65", async () => {
          await copyExportText("ca65", buildCa65Assembly());
        }),
      );
    } else if (appState.activeChip === "TIA") {
      buttons.appendChild(
        renderExportButton("TIA-native ca65", "tia-ca65", async () => {
          await copyExportText("tia-ca65", buildTiaCa65Assembly());
        }),
      );
    } else if (appState.activeChip === "POKEY") {
      buttons.appendChild(
        renderExportButton("POKEY-native ca65", "pokey-ca65", async () => {
          await copyExportText("pokey-ca65", buildPokeyCa65Assembly());
        }),
      );
    }

    buttons.appendChild(
      renderExportButton("Generic JSON", "json", async () => {
        await copyExportText("json", buildGenericSessionJson());
      }),
    );

    section.appendChild(buttons);
    return section;
  }

  function renderExportButton(label, exportId, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "transport-button export-button";
    button.textContent = copiedExportId === exportId ? "Copied!" : label;
    button.addEventListener("click", () => {
      void onClick();
    });
    return button;
  }

  function renderTimbreSelect(channel, data) {
    const isPokey = channel.profile === "POKEY";
    const options = isPokey ? POKEY_TIMBRE_OPTIONS : TIA_TIMBRE_OPTIONS;
    const onChange = isPokey ? changePokeyTimbre : changeTiaTimbre;

    const wrapper = document.createElement("label");
    wrapper.className = "timbre-select-wrap";

    const text = document.createElement("span");
    text.className = "timbre-select-label";
    text.textContent = "Timbre";

    const select = document.createElement("select");
    select.className = "timbre-select";
    select.setAttribute("data-channel-id", channel.id);
    select.addEventListener("change", (event) => {
      onChange(channel.id, Number(event.target.value));
    });

    for (const option of options) {
      const optionElement = document.createElement("option");
      optionElement.value = String(option.audc);
      optionElement.textContent = option.label;
      select.appendChild(optionElement);
    }

    select.value = String(data.audc);

    wrapper.appendChild(text);
    wrapper.appendChild(select);
    return wrapper;
  }

  function renderGrid(channel, data) {
    const layout = document.createElement("div");
    layout.className = "roll-layout";

    const stepCount = currentStepCount();
    const grid = document.createElement("div");
    grid.className = "roll-grid";
    grid.style.gridTemplateColumns = `88px repeat(${stepCount}, minmax(0, 1fr))`;

    const corner = document.createElement("div");
    corner.className = "corner-cell";
    corner.textContent = channel.rowLabel;
    grid.appendChild(corner);

    for (let step = 0; step < stepCount; step += 1) {
      const header = document.createElement("div");
      header.className = "step-header";
      header.textContent = String(step + 1).padStart(2, "0");
      grid.appendChild(header);
    }

    for (const row of channel.rows) {
      const label = document.createElement("div");
      label.className = `note-label ${row.isBlackKey ? "black" : ""}`.trim();
      label.textContent = row.label;
      grid.appendChild(label);

      for (let step = 0; step < stepCount; step += 1) {
        const key = `${row.id}:${step}`;
        const occupied = data.notes.get(key);
        // continuesLeft: la cella corrente e' marcata come continuazione e ha
        // un vicino sinistro nella stessa riga (tipicamente sempre vero per dati ben formati).
        // continuesRight: il vicino destro nella stessa riga e' marcato come continuazione.
        let continuesLeft = false;
        let continuesRight = false;
        if (occupied) {
          if (occupied.isContinuation === true && step > 0 && data.notes.has(`${row.id}:${step - 1}`)) {
            continuesLeft = true;
          }
          if (step < stepCount - 1) {
            const nextEntry = data.notes.get(`${row.id}:${step + 1}`);
            if (nextEntry && nextEntry.isContinuation === true) {
              continuesRight = true;
            }
          }
        }
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = [
          "grid-cell",
          channel.laneClass,
          row.isBlackKey ? "black" : "",
          occupied ? "occupied" : "",
          continuesRight ? "continues-right" : "",
          activeStep === step ? "playing" : "",
        ]
          .filter(Boolean)
          .join(" ");
        cell.dataset.cellKey = `${channel.id}:${row.id}:${step}`;
        cell.setAttribute("aria-label", `${channel.name}, step ${step + 1}, ${row.label}`);
        cell.addEventListener("mousedown", (event) => {
          handleCellMouseDown(event, channel, row, step, !!occupied);
        });
        cell.addEventListener("mouseenter", () => {
          handleCellMouseEnter(channel, row, step);
        });
        cell.addEventListener("click", () => {
          if (suppressNextClick) {
            suppressNextClick = false;
            return;
          }
          void toggleCell(channel, row, step);
        });

        if (occupied) {
          cell.appendChild(renderCellContent(channel, occupied, continuesLeft, continuesRight));
        }

        grid.appendChild(cell);
      }
    }

    layout.appendChild(grid);
    return layout;
  }

  function renderCellContent(channel, entry, continuesLeft = false, continuesRight = false) {
    const notePill = document.createElement("div");
    const continuesClasses = [
      continuesLeft ? "continues-left" : "",
      continuesRight ? "continues-right" : "",
    ]
      .filter(Boolean)
      .join(" ");
    notePill.className = `note-pill channel-${channel.laneClass}${continuesClasses ? ` ${continuesClasses}` : ""}`;

    const title = document.createElement("div");
    title.className = "note-pill-title";
    title.textContent = entry.noteName;
    notePill.appendChild(title);

    if (channel.supportsIntonation && entry.nearest && Number.isFinite(entry.nearest.scarto_cents)) {
      notePill.className = `${notePill.className} ${getIntonationClassName(entry.nearest.scarto_cents)}`;
      const subtitle = document.createElement("div");
      subtitle.className = "note-pill-cents";
      subtitle.textContent = formatCents(entry.nearest.scarto_cents);
      notePill.appendChild(subtitle);
    }

    return notePill;
  }

  async function toggleCell(channel, row, step) {
    const data = channelData(channel.id);
    const key = `${row.id}:${step}`;

    if (data.notes.has(key)) {
      data.notes.delete(key);
      console.log(`[ChipRoll] Note removed: ${channel.name} / ${row.label} @ step ${step + 1}`);
      render();
      return;
    }

    clearChannelStep(channel.id, step);
    const entry = createEntryForCell(channel, row, step);
    entry.isContinuation = false;
    data.notes.set(key, entry);

    console.log(`[ChipRoll] Note inserted: ${channel.name} / ${row.label} @ step ${step + 1}`, entry);
    await previewChannelEntry(channel, entry);
    render();
  }

  function createEntryForCell(channel, row, step) {
    const entry = {
      step,
      rowId: row.id,
      noteName: row.label,
      waveform: channel.waveform,
      audc: channel.audc,
    };

    if (channel.profile === "TIA") {
      entry.hz = row.outputHz;
      entry.targetHz = row.targetHz;
      entry.registro = row.audf;

      if (channel.supportsIntonation) {
        entry.nearest = createRowIntonation(row.outputHz, row.targetHz);
      }
    } else if (channel.profile === "POKEY") {
      entry.hz = row.hz;
      entry.targetHz = row.hz;
      entry.nearest = getNearestPokeyNote(row.hz, channel.audc);
      entry.registro = entry.nearest.valore_registro;
    } else if (channel.kind === "noise") {
      entry.hz = row.hz;
      entry.registro = row.noiseIndex ?? 0;
    } else {
      entry.hz = row.hz;
      entry.targetHz = row.hz;
      entry.nearest = getNearestNote(row.hz, channel.chip);
      entry.registro = entry.nearest.valore_registro;
    }

    return entry;
  }

  function handleCellMouseDown(event, channel, row, step, isOccupied) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();

    // Se la cella e' occupata, precalcolo il run a cui appartiene per i modi
    // move-block / move-pitch. mousedown da solo non avvia ancora nessun modo:
    // il modo si determina al primo movimento oltre la soglia.
    const blockSpan = isOccupied ? findRunSpan(channel.id, row.id, step) : null;

    dragState = {
      mode: "pending",
      channel,
      row,
      channelId: channel.id,
      rowId: row.id,
      startStep: step,
      currentStep: step,
      hoverStep: step,
      targetRowId: row.id,
      targetRow: row,
      startedOnOccupied: isOccupied,
      blockSpan,
      mouseStartX: event.clientX,
      mouseStartY: event.clientY,
    };
    // Niente preview in modo pending (sotto soglia).
  }

  function handleCellMouseEnter(channel, row, step) {
    if (!dragState || dragState.mode === "pending") {
      return;
    }
    if (dragState.channelId !== channel.id) {
      return;
    }

    if (dragState.mode === "create") {
      // Create e' row-locked sulla riga di partenza.
      if (dragState.rowId !== row.id) {
        return;
      }
      if (step === dragState.currentStep) {
        return;
      }
      dragState.currentStep = step;
      applyDragPreviewVisuals();
      return;
    }

    if (dragState.mode === "move-block") {
      // Movimento orizzontale: traccia lo step puntato (stessa riga).
      if (dragState.rowId !== row.id) {
        return;
      }
      if (step !== dragState.hoverStep) {
        dragState.hoverStep = step;
        applyDragPreviewVisuals();
      }
      return;
    }

    if (dragState.mode === "move-pitch") {
      // Movimento verticale: traccia la riga puntata, qualsiasi step.
      if (row.id !== dragState.targetRowId) {
        dragState.targetRowId = row.id;
        dragState.targetRow = row;
        applyDragPreviewVisuals();
      }
    }
  }

  function handleDocumentMouseMove(event) {
    if (!dragState || dragState.mode !== "pending") {
      return;
    }

    const dx = event.clientX - dragState.mouseStartX;
    const dy = event.clientY - dragState.mouseStartY;

    if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
      return;
    }

    const horizontalDominant = Math.abs(dx) >= Math.abs(dy);

    if (dragState.startedOnOccupied) {
      dragState.mode = horizontalDominant ? "move-block" : "move-pitch";
    } else {
      // Cella vuota: solo l'orizzontale e' specificato, ma anche un drag verticale
      // su vuoto cade su create (row-locked) — se l'utente tornera' orizzontale fa
      // funzionare il fill normalmente. Sotto soglia non era ancora successo nulla.
      dragState.mode = "create";
    }

    applyDragPreviewVisuals();
  }

  function applyDragPreviewVisuals() {
    cleanupDragPreviewVisuals();

    if (!dragState || dragState.mode === "pending") {
      return;
    }

    if (dragState.mode === "create") {
      const minStep = Math.min(dragState.startStep, dragState.currentStep);
      const maxStep = Math.max(dragState.startStep, dragState.currentStep);
      for (let s = minStep; s <= maxStep; s += 1) {
        addPreviewClassByKey(`${dragState.channelId}:${dragState.rowId}:${s}`, "drag-preview");
      }
      return;
    }

    if (dragState.mode === "move-block") {
      const { blockSpan, startStep, hoverStep, channelId, rowId } = dragState;
      const offset = hoverStep - startStep;

      // Sorgente: cella ghost (semitrasparente).
      for (let s = blockSpan.startStep; s <= blockSpan.endStep; s += 1) {
        addPreviewClassByKey(`${channelId}:${rowId}:${s}`, "drag-source");
      }
      // Target: highlight della destinazione.
      for (let s = blockSpan.startStep + offset; s <= blockSpan.endStep + offset; s += 1) {
        addPreviewClassByKey(`${channelId}:${rowId}:${s}`, "drag-preview");
      }
      return;
    }

    if (dragState.mode === "move-pitch") {
      const { blockSpan, channelId, rowId, targetRowId } = dragState;

      for (let s = blockSpan.startStep; s <= blockSpan.endStep; s += 1) {
        addPreviewClassByKey(`${channelId}:${rowId}:${s}`, "drag-source");
      }
      if (targetRowId !== rowId) {
        for (let s = blockSpan.startStep; s <= blockSpan.endStep; s += 1) {
          addPreviewClassByKey(`${channelId}:${targetRowId}:${s}`, "drag-preview");
        }
      }
    }
  }

  function addPreviewClassByKey(key, className) {
    const cell = document.querySelector(`[data-cell-key="${CSS.escape(key)}"]`);
    if (cell) {
      cell.classList.add(className);
      dragPreviewCells.add(cell);
    }
  }

  function cleanupDragPreviewVisuals() {
    for (const cell of dragPreviewCells) {
      cell.classList.remove("drag-preview", "drag-source");
    }
    dragPreviewCells.clear();
  }

  function findRunSpan(channelId, rowId, step) {
    const data = channelData(channelId);
    if (!data) {
      return null;
    }

    const cur = data.notes.get(`${rowId}:${step}`);
    if (!cur) {
      return null;
    }

    // Vado indietro finche' la cella corrente e' una continuazione e c'e' un vicino.
    let runStart = step;
    while (runStart > 0) {
      const e = data.notes.get(`${rowId}:${runStart}`);
      if (!e || e.isContinuation !== true) break;
      const prev = data.notes.get(`${rowId}:${runStart - 1}`);
      if (!prev) break;
      runStart -= 1;
    }

    // Avanti finche' il vicino destro e' continuazione.
    const stepCount = currentStepCount();
    let runEnd = runStart;
    while (runEnd + 1 < stepCount) {
      const next = data.notes.get(`${rowId}:${runEnd + 1}`);
      if (!next || next.isContinuation !== true) break;
      runEnd += 1;
    }

    return { startStep: runStart, endStep: runEnd };
  }

  async function finalizeDragCreate() {
    if (!dragState || dragState.mode !== "create") {
      return;
    }

    const { channel, row, channelId, startStep, currentStep } = dragState;
    const data = channelData(channelId);
    const minStep = Math.min(startStep, currentStep);
    const maxStep = Math.max(startStep, currentStep);

    cleanupDragPreviewVisuals();
    dragState = null;

    if (minStep === maxStep) {
      return;
    }

    let firstInsertedEntry = null;
    let insertedCount = 0;
    let lastInsertedStep = -2;

    for (let s = minStep; s <= maxStep; s += 1) {
      const cellKey = `${row.id}:${s}`;

      if (data.notes.has(cellKey)) {
        continue;
      }

      clearChannelStep(channelId, s);
      const entry = createEntryForCell(channel, row, s);
      entry.isContinuation = lastInsertedStep === s - 1;
      data.notes.set(cellKey, entry);
      insertedCount += 1;
      lastInsertedStep = s;

      if (!firstInsertedEntry) {
        firstInsertedEntry = entry;
      }
    }

    if (firstInsertedEntry) {
      console.log(
        `[ChipRoll] Drag create: ${insertedCount} notes on ${channel.name} / ${row.label} (steps ${minStep + 1}..${maxStep + 1})`,
      );
      await previewChannelEntry(channel, firstInsertedEntry);
    }

    render();
  }

  function finalizeMoveBlock() {
    if (!dragState || dragState.mode !== "move-block" || !dragState.blockSpan) {
      cleanupDragPreviewVisuals();
      dragState = null;
      return;
    }

    const { channel, channelId, rowId, blockSpan, startStep, hoverStep } = dragState;
    const data = channelData(channelId);
    const offset = hoverStep - startStep;

    cleanupDragPreviewVisuals();
    dragState = null;

    if (offset === 0) {
      render();
      return;
    }

    const newStart = blockSpan.startStep + offset;
    const newEnd = blockSpan.endStep + offset;

    if (newStart < 0 || newEnd >= currentStepCount()) {
      console.log("[ChipRoll] Move-block blocked: out of grid.");
      render();
      return;
    }

    // Cattura entry source con offset relativo, poi cancella source.
    const captured = [];
    for (let s = blockSpan.startStep; s <= blockSpan.endStep; s += 1) {
      const e = data.notes.get(`${rowId}:${s}`);
      if (e) {
        captured.push({ relStep: s - blockSpan.startStep, entry: e });
      }
      data.notes.delete(`${rowId}:${s}`);
    }

    // Per ogni nuova posizione: clearChannelStep prima del set (stesso pattern di
    // toggleCell). Cosi' qualsiasi nota su altre righe (o stessa riga fuori dal
    // source range) viene sovrascritta silenziosamente, preservando l'invariante
    // canale-monofonico-per-step.
    let overwrittenCount = 0;
    for (const { relStep, entry } of captured) {
      const newStep = newStart + relStep;
      if (getEntryForStep(channelId, newStep)) {
        overwrittenCount += 1;
      }
      clearChannelStep(channelId, newStep);
      data.notes.set(`${rowId}:${newStep}`, { ...entry, step: newStep });
    }

    console.log(
      `[ChipRoll] Move-block: ${channel.name} / ${rowId} steps ${blockSpan.startStep + 1}..${blockSpan.endStep + 1} -> ${newStart + 1}..${newEnd + 1}` +
        (overwrittenCount > 0 ? ` (${overwrittenCount} pre-existing cell${overwrittenCount === 1 ? "" : "s"} overwritten)` : ""),
    );
    render();
  }

  function finalizeMovePitch() {
    if (!dragState || dragState.mode !== "move-pitch" || !dragState.blockSpan) {
      cleanupDragPreviewVisuals();
      dragState = null;
      return;
    }

    const { channel, channelId, row, rowId, blockSpan, targetRowId, targetRow } = dragState;
    const data = channelData(channelId);

    cleanupDragPreviewVisuals();
    dragState = null;

    if (targetRowId === rowId) {
      render();
      return;
    }

    // Catturo solo il pattern di isContinuation (l'hz/registro/nearest cambiano
    // perche' la riga e' diversa: vanno ricreati). Cancello la source row.
    const continuationPattern = [];
    for (let s = blockSpan.startStep; s <= blockSpan.endStep; s += 1) {
      const e = data.notes.get(`${rowId}:${s}`);
      continuationPattern.push(e?.isContinuation === true);
      data.notes.delete(`${rowId}:${s}`);
    }

    // Scrivo target row con clearChannelStep (per coerenza con toggleCell).
    // Sotto l'invariante monofonica gli step sono gia' vuoti dopo la delete del source,
    // quindi il clear non rimuove nulla; resta come safety net contro regressioni.
    let firstEntry = null;
    for (let i = 0; i < continuationPattern.length; i += 1) {
      const step = blockSpan.startStep + i;
      clearChannelStep(channelId, step);
      const newEntry = createEntryForCell(channel, targetRow, step);
      newEntry.isContinuation = continuationPattern[i];
      data.notes.set(`${targetRowId}:${step}`, newEntry);
      if (!firstEntry) firstEntry = newEntry;
    }

    console.log(
      `[ChipRoll] Move-pitch: ${channel.name} row ${row.label} -> ${targetRow.label} (steps ${blockSpan.startStep + 1}..${blockSpan.endStep + 1})`,
    );
    render();

    if (firstEntry) {
      void previewChannelEntry(channel, firstEntry);
    }
  }

  async function previewChannelEntry(channel, entry) {
    if (!isChannelAudible(channel.id)) {
      return;
    }

    if (!isFinitePositive(entry.hz)) {
      console.warn("[ChipRoll] Preview skipped: invalid frequency", { channel, entry });
      return;
    }

    const context = await ensureAudioContext();
    const startTime = context.currentTime;
    schedulePlaybackVoice(context, channel.waveform, entry.hz, startTime, PREVIEW_DURATION_SECONDS);
  }

  async function startPlayback() {
    if (appState.transportMode === "song" && appState.song.length === 0) {
      console.warn("[ChipRoll] Song mode: song is empty, nothing to play");
      return;
    }

    stopPlayback();

    const context = await ensureAudioContext();
    isPlaying = true;
    updateTransportState();

    const schedulerOffsetSeconds = 0.03;
    const startTime = context.currentTime + schedulerOffsetSeconds;

    if (appState.transportMode === "song") {
      scheduleSongCycle(context, startTime);
    } else {
      schedulePatternModeCycle(context, startTime);
    }
  }

  // Pattern mode: schedula il pattern in edit, gestisce loop auto-richiamandosi.
  function schedulePatternModeCycle(context, sequenceStartTime) {
    const patternId = appState.currentPatternId;
    const endTime = schedulePatternCycle(context, patternId, sequenceStartTime, null);

    playbackCleanupTimerId = window.setTimeout(() => {
      if (appState.loop && isPlaying) {
        schedulePatternModeCycle(context, endTime);
      } else {
        finishPlayback();
      }
    }, Math.max(0, Math.ceil((endTime - context.currentTime) * 1000)));
  }

  // Song mode: schedula in sequenza tutti i pattern di appState.song.
  // Ogni boundary e' un note-off implicito (non c'e' continuation cross-pattern).
  function scheduleSongCycle(context, sequenceStartTime) {
    let cursor = sequenceStartTime;
    for (let i = 0; i < appState.song.length; i += 1) {
      const patternId = appState.song[i];
      cursor = schedulePatternCycle(context, patternId, cursor, i);
    }
    const cycleEndTime = cursor;

    playbackCleanupTimerId = window.setTimeout(() => {
      if (appState.loop && isPlaying) {
        scheduleSongCycle(context, cycleEndTime);
      } else {
        finishPlayback();
      }
    }, Math.max(0, Math.ceil((cycleEndTime - context.currentTime) * 1000)));
  }

  // Schedula UNA passata di un singolo pattern. Ritorna l'endTime (cursor next).
  // songIndex: posizione nella song se in Song mode (per playhead song lane);
  //            null in Pattern mode.
  function schedulePatternCycle(context, patternId, sequenceStartTime, songIndex) {
    const pattern = appState.patterns[patternId];
    if (!pattern) {
      return sequenceStartTime;
    }

    const stepDurationSeconds = getStepDurationSeconds();
    const stepCount = pattern.stepCount;
    const channels = getChannelsForPattern(patternId);
    const isEditPattern = patternId === appState.currentPatternId;

    // Voice scheduling per canale, con run merging: una nota tenuta per piu'
    // step consecutivi (drag) scheda una sola voce con durata estesa, cosi'
    // l'inviluppo attack/release della Web Audio API non ricomincia ogni step.
    for (const channel of channels) {
      if (!isChannelAudible(channel.id)) {
        continue;
      }

      let step = 0;
      while (step < stepCount) {
        const entry = getEntryForStep(channel.id, step, patternId);

        if (!entry) {
          step += 1;
          continue;
        }

        if (!isFinitePositive(entry.hz)) {
          console.warn("[ChipRoll] Playback skipped: invalid frequency", { channel, entry });
          step += 1;
          continue;
        }

        // Run = nota corrente + tutte le successive che la marcano come continuazione,
        // restando sulla stessa riga. Il merging non attraversa il bordo del pattern
        // perche' iteriamo solo entro stepCount (note-off implicito al boundary).
        let runLength = 1;
        while (step + runLength < stepCount) {
          const next = getEntryForStep(channel.id, step + runLength, patternId);
          if (!next) break;
          if (next.rowId !== entry.rowId) break;
          if (next.isContinuation !== true) break;
          runLength += 1;
        }

        const stepStartTime = sequenceStartTime + step * stepDurationSeconds;
        const runDurationSeconds = runLength * stepDurationSeconds;
        schedulePlaybackVoice(
          context,
          channel.waveform,
          entry.hz,
          stepStartTime,
          runDurationSeconds,
        );

        step += runLength;
      }
    }

    // Playhead step-by-step: aggiorna activeStep solo se questo pattern e' anche
    // quello in edit (altrimenti il piano roll mostra un altro pattern e il
    // playhead sarebbe fuorviante). activeSongIndex viene comunque aggiornato a
    // ogni inizio pattern in Song mode.
    for (let step = 0; step < stepCount; step += 1) {
      const stepStartTime = sequenceStartTime + step * stepDurationSeconds;
      const playheadTimerId = window.setTimeout(() => {
        if (songIndex !== null && step === 0) {
          activeSongIndex = songIndex;
        }
        activeStep = isEditPattern ? step : null;
        render();
      }, Math.max(0, (stepStartTime - context.currentTime) * 1000));
      playheadTimerIds.push(playheadTimerId);
    }

    return sequenceStartTime + stepCount * stepDurationSeconds;
  }

  function schedulePlaybackVoice(context, waveform, hz, startTime, durationSeconds) {
    if (waveform === "square") {
      scheduleSquareNote(context, {
        frequency: hz,
        startTime,
        durationSeconds,
        destination: context.destination,
      });
      return;
    }

    if (waveform === "triangle") {
      scheduleTriangleNote(context, {
        frequency: hz,
        startTime,
        durationSeconds,
        destination: context.destination,
      });
      return;
    }

    scheduleNoiseBurst(context, {
      startTime,
      durationSeconds,
      destination: context.destination,
    });
  }

  function stopPlayback() {
    if (!isPlaying && activeStep === null && activeSongIndex === null && activeVoices.size === 0) {
      return;
    }

    clearPlaybackTimers();
    stopAllActiveVoices();
    finishPlayback();
  }

  function finishPlayback() {
    clearPlaybackTimers();
    activeStep = null;
    activeSongIndex = null;
    isPlaying = false;
    updateTransportState();
    render();
  }

  function clearPlaybackTimers() {
    if (playbackCleanupTimerId !== null) {
      window.clearTimeout(playbackCleanupTimerId);
      playbackCleanupTimerId = null;
    }

    for (const timerId of playheadTimerIds) {
      window.clearTimeout(timerId);
    }

    playheadTimerIds = [];
  }

  function stopAllActiveVoices() {
    for (const voice of [...activeVoices]) {
      try {
        voice.source.stop();
      } catch (error) {
        cleanupVoice(voice);
      }
    }
  }

  async function ensureAudioContext() {
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) {
        throw new Error("Web Audio API not supported in this browser");
      }

      audioContext = new AudioContextClass();
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    return audioContext;
  }

  function scheduleSquareNote(context, { frequency, startTime, durationSeconds, destination }) {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const releaseSeconds = Math.min(RELEASE_SECONDS, Math.max(0.02, durationSeconds * 0.4));
    const peakGain = 0.18;
    const sustainEndTime = Math.max(
      startTime + ATTACK_SECONDS,
      startTime + durationSeconds - releaseSeconds,
    );
    const stopTime = sustainEndTime + releaseSeconds;

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, startTime);
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(peakGain, startTime + ATTACK_SECONDS);
    gainNode.gain.setValueAtTime(peakGain, sustainEndTime);
    gainNode.gain.linearRampToValueAtTime(0.0001, stopTime);

    oscillator.connect(gainNode);
    gainNode.connect(destination);
    oscillator.start(startTime);
    oscillator.stop(stopTime);

    registerVoice(oscillator, [oscillator, gainNode]);
  }

  function scheduleTriangleNote(context, { frequency, startTime, durationSeconds, destination }) {
    const oscillator = context.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.connect(destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + durationSeconds);

    registerVoice(oscillator, [oscillator]);
  }

  function scheduleNoiseBurst(context, { startTime, durationSeconds, destination }) {
    const source = context.createBufferSource();
    const gainNode = context.createGain();
    const noiseBuffer = getNoiseBuffer(context);
    const releaseSeconds = Math.min(RELEASE_SECONDS, Math.max(0.02, durationSeconds * 0.45));
    const sustainEndTime = Math.max(
      startTime + ATTACK_SECONDS,
      startTime + durationSeconds - releaseSeconds,
    );
    const stopTime = sustainEndTime + releaseSeconds;

    source.buffer = noiseBuffer;
    source.loop = true;
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(0.14, startTime + ATTACK_SECONDS);
    gainNode.gain.setValueAtTime(0.14, sustainEndTime);
    gainNode.gain.linearRampToValueAtTime(0.0001, stopTime);

    source.connect(gainNode);
    gainNode.connect(destination);
    source.start(startTime);
    source.stop(stopTime);

    registerVoice(source, [source, gainNode]);
  }

  function getNoiseBuffer(context) {
    if (cachedNoiseBuffer && cachedNoiseBuffer.sampleRate === context.sampleRate) {
      return cachedNoiseBuffer;
    }

    const bufferLength = Math.max(1, Math.floor(context.sampleRate * 0.25));
    const buffer = context.createBuffer(1, bufferLength, context.sampleRate);
    const channelData = buffer.getChannelData(0);

    for (let index = 0; index < bufferLength; index += 1) {
      channelData[index] = Math.random() * 2 - 1;
    }

    cachedNoiseBuffer = buffer;
    return buffer;
  }

  function registerVoice(source, nodesToDisconnect) {
    const voice = { source, nodesToDisconnect };
    activeVoices.add(voice);

    source.addEventListener("ended", () => {
      cleanupVoice(voice);
    });
  }

  function cleanupVoice(voice) {
    if (!activeVoices.has(voice)) {
      return;
    }

    activeVoices.delete(voice);

    for (const node of voice.nodesToDisconnect) {
      try {
        node.disconnect();
      } catch (error) {
        // Ignore duplicate disconnect attempts.
      }
    }
  }

  function getEntryForStep(channelId, step, patternId = appState.currentPatternId) {
    const data = channelData(channelId, patternId);
    if (!data) {
      return null;
    }
    for (const entry of data.notes.values()) {
      if (entry.step === step) {
        return entry;
      }
    }

    return null;
  }

  function clearChannelStep(channelId, step) {
    const data = channelData(channelId);

    if (!data) {
      return;
    }

    for (const [mapKey, value] of data.notes.entries()) {
      if (value.step === step) {
        data.notes.delete(mapKey);
      }
    }
  }

  async function handleChipChange(nextChip) {
    if (nextChip === appState.activeChip) {
      return;
    }

    stopPlayback();
    appState.activeChip = nextChip;
    resetChannelsForChip(nextChip);
    render();

    if (importSession.parsedSong) {
      // I canali validi cambiano col chip: gli override pre-esistenti diventano invalidi.
      importSession.overrides.clear();
      runAndRenderPipeline();
    }
  }

  function resetChannelsForChip(chip) {
    // Cambio chip = reset completo: distruggo tutti i pattern esistenti
    // (la struttura canali del nuovo chip e' diversa) e ricreo un singolo
    // pattern vuoto P1. channelGlobals viene ricostruito per i canali del nuovo chip.
    if (chip === "TIA") {
      appState.tiaRowsByAudc = {
        12: buildTiaRows(12),
        1: buildTiaRows(1),
        8: buildTiaRows(8),
      };
    } else {
      appState.tiaRowsByAudc = {};
    }

    const channelDefs = channelDefsForChip(chip);

    appState.channelGlobals = Object.fromEntries(
      channelDefs.map((channel) => [
        channel.id,
        { muted: false, solo: false, collapsed: false },
      ]),
    );

    patternIdCounter = 0;
    const firstPatternId = nextPatternId();
    appState.patterns = {
      [firstPatternId]: createEmptyPattern(firstPatternId, chip, 16),
    };
    appState.patternOrder = [firstPatternId];
    appState.song = [firstPatternId];
    appState.currentPatternId = firstPatternId;
    appState.transportMode = "pattern";
    updateTransportModeVisual();
  }

  function channelDefsForChip(chip) {
    switch (chip) {
      case "NES":
        return NES_CHANNEL_DEFS;
      case "TIA":
        return TIA_CHANNEL_DEFS;
      case "POKEY":
        return POKEY_CHANNEL_DEFS;
      default:
        throw new Error(`Chip non supportato: ${chip}`);
    }
  }

  function defaultAudcForChip(chip) {
    if (chip === "TIA") return 12;
    if (chip === "POKEY") return 0xA0;
    return null;
  }

  function createEmptyPattern(id, chip, stepCount) {
    const channelDefs = channelDefsForChip(chip);
    const defaultAudc = defaultAudcForChip(chip);
    return {
      id,
      label: null,
      stepCount,
      channels: Object.fromEntries(
        channelDefs.map((channel) => [
          channel.id,
          defaultAudc !== null
            ? { notes: new Map(), audc: defaultAudc }
            : { notes: new Map() },
        ]),
      ),
    };
  }

  function getCurrentChannels() {
    return getChannelsForPattern(appState.currentPatternId);
  }

  function getChannelsForPattern(patternId) {
    if (appState.activeChip === "NES") {
      return NES_CHANNEL_DEFS;
    }

    if (appState.activeChip === "POKEY") {
      return POKEY_CHANNEL_DEFS.map((channel) => {
        const data = channelData(channel.id, patternId);
        const audc = data.audc;
        const timbre = POKEY_TIMBRE_OPTIONS.find((option) => option.audc === audc);

        return {
          ...channel,
          chip: "POKEY",
          audc,
          timbreLabel: timbre.label,
          // POKEY noise e' comunque pitched (LFSR rate via AUDF), quindi
          // tutti i timbres restano "pitched" nel modello dati. L'audio
          // synth distingue square vs noise dal waveform.
          kind: "pitched",
          waveform: audc === 0x80 ? "noise" : "square",
          laneClass: getPokeyLaneClass(audc),
          rowLabel: "Note / Step",
          supportsIntonation: true,
        };
      });
    }

    return TIA_CHANNEL_DEFS.map((channel) => {
      const data = channelData(channel.id, patternId);
      const audc = data.audc;
      const timbre = TIA_TIMBRE_OPTIONS.find((option) => option.audc === audc);

      return {
        ...channel,
        chip: "TIA",
        audc,
        timbreLabel: timbre.label,
        kind: audc === 8 ? "noise" : "pitched",
        waveform: audc === 8 ? "noise" : "square",
        laneClass: getTiaLaneClass(audc),
        rowLabel: audc === 8 ? "Noise / Step" : "Note / Step",
        supportsIntonation: audc !== 8,
        rows: appState.tiaRowsByAudc[audc],
      };
    });
  }

  function getTiaLaneClass(audc) {
    switch (audc) {
      case 12:
        return "tia-tone";
      case 1:
        return "tia-buzz";
      case 8:
        return "tia-noise";
      default:
        return "tia-tone";
    }
  }

  function getPokeyLaneClass(audc) {
    switch (audc) {
      case 0xA0:
        return "pokey-tone";
      case 0xE0:
        return "pokey-buzz";
      case 0x80:
        return "pokey-noise";
      default:
        return "pokey-tone";
    }
  }

  function changeTiaTimbre(channelId, audc) {
    // AUDC e' per-pattern (decisione Y del design): cambiare timbro su Ch.1
    // tocca solo il pattern in edit. Le note esistenti del pattern corrente
    // su questo canale vengono cancellate perche' le righe (lookup AUDF) sono
    // fisicamente diverse tra timbri.
    const data = channelData(channelId);

    if (!data || !appState.tiaRowsByAudc[audc]) {
      return;
    }

    data.audc = audc;
    data.notes.clear();
    render();
  }

  function changePokeyTimbre(channelId, audc) {
    // POKEY: AUDC per-pattern come TIA. Le righe POKEY sono note musicali
    // shared tra timbres, quindi la audf-mapping cambia (getNearestPokeyNote)
    // ma le rows no. Per coerenza con TIA cancello comunque le note del
    // pattern: cambiare timbre = cambiare "strumento", l'utente si aspetta
    // di ricominciare la melodia.
    const data = channelData(channelId);

    if (!data || !POKEY_TIMBRE_OPTIONS.some((option) => option.audc === audc)) {
      return;
    }

    data.audc = audc;
    data.notes.clear();
    render();
  }

  function toggleMute(channelId) {
    const mixer = channelMixer(channelId);
    if (!mixer) {
      return;
    }

    mixer.muted = !mixer.muted;
    render();
  }

  function toggleSolo(channelId) {
    const mixer = channelMixer(channelId);
    if (!mixer) {
      return;
    }

    mixer.solo = !mixer.solo;
    render();
  }

  function toggleCollapsed(channelId) {
    const mixer = channelMixer(channelId);
    if (!mixer) {
      return;
    }

    mixer.collapsed = !mixer.collapsed;
    render();
  }

  function isChannelAudible(channelId) {
    const currentChannels = getCurrentChannels();
    const anySolo = currentChannels.some((channel) => channelMixer(channel.id).solo);
    const mixer = channelMixer(channelId);

    if (mixer.muted) {
      return false;
    }

    if (!anySolo) {
      return true;
    }

    return mixer.solo;
  }

  function clearAllNotes() {
    const confirmed = window.confirm("Clear all notes?");

    if (!confirmed) {
      return;
    }

    // Clear delle note nel pattern in edit (non tocca gli altri pattern).
    const pattern = currentPattern();
    for (const channelId of Object.keys(pattern.channels)) {
      pattern.channels[channelId].notes.clear();
    }

    render();
  }

  function isSessionDirty() {
    for (const pattern of Object.values(appState.patterns)) {
      for (const channelData of Object.values(pattern.channels)) {
        if (channelData.notes.size > 0) {
          return true;
        }
      }
    }
    return false;
  }

  function serializeSession() {
    const patternsOut = {};
    for (const [id, pattern] of Object.entries(appState.patterns)) {
      const channelsOut = {};
      for (const [chId, chData] of Object.entries(pattern.channels)) {
        const channelOut = { notes: Array.from(chData.notes.values()) };
        if (chData.audc !== undefined) {
          channelOut.audc = chData.audc;
        }
        channelsOut[chId] = channelOut;
      }
      patternsOut[id] = {
        id: pattern.id,
        label: pattern.label,
        stepCount: pattern.stepCount,
        channels: channelsOut,
      };
    }
    return {
      version: SESSION_FILE_VERSION,
      savedAt: new Date().toISOString(),
      chip: appState.activeChip,
      bpm: appState.bpm,
      loop: appState.loop,
      channelGlobals: appState.channelGlobals,
      patterns: patternsOut,
      patternOrder: appState.patternOrder,
      song: appState.song,
      currentPatternId: appState.currentPatternId,
      transportMode: appState.transportMode,
    };
  }

  function handleSaveSession() {
    const session = serializeSession();
    const json = JSON.stringify(session, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = buildSessionFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function buildSessionFilename() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `chiproll-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
  }

  async function handleLoadFileSelected(event) {
    const file = event.target.files && event.target.files[0];
    // Reset value subito: senza questo, riselezionare lo stesso file non ritriggera change.
    event.target.value = "";
    if (!file) {
      return;
    }

    if (isSessionDirty()) {
      const confirmed = window.confirm("Discard current session and load file?");
      if (!confirmed) {
        return;
      }
    }

    let data;
    try {
      const text = await file.text();
      data = JSON.parse(text);
    } catch (error) {
      console.error("[ChipRoll] Load failed: invalid JSON", error);
      window.alert("Load failed: invalid JSON file.");
      return;
    }

    if (data == null || typeof data !== "object" || data.version !== SESSION_FILE_VERSION) {
      window.alert(`Load failed: unsupported version (expected ${SESSION_FILE_VERSION}).`);
      return;
    }

    try {
      applyLoadedSession(data);
    } catch (error) {
      console.error("[ChipRoll] Load failed: corrupt session data", error);
      window.alert("Load failed: corrupt session data.");
    }
  }

  function applyLoadedSession(data) {
    stopPlayback();

    appState.activeChip = data.chip;
    appState.bpm = data.bpm;
    appState.loop = Boolean(data.loop);
    appState.channelGlobals = data.channelGlobals;
    appState.patternOrder = data.patternOrder.slice();
    appState.song = data.song.slice();
    appState.currentPatternId = data.currentPatternId;
    appState.transportMode = data.transportMode === "song" ? "song" : "pattern";

    // Ricostruisce tiaRowsByAudc: deriva dal chip, non e' nel JSON.
    if (appState.activeChip === "TIA") {
      appState.tiaRowsByAudc = {
        12: buildTiaRows(12),
        1: buildTiaRows(1),
        8: buildTiaRows(8),
      };
    } else {
      appState.tiaRowsByAudc = {};
    }

    // Ricostruisce patterns con Map notes a partire dagli array.
    appState.patterns = {};
    for (const [id, pat] of Object.entries(data.patterns)) {
      const channels = {};
      for (const [chId, chData] of Object.entries(pat.channels)) {
        const notesMap = new Map();
        for (const entry of chData.notes) {
          notesMap.set(`${entry.rowId}:${entry.step}`, entry);
        }
        const out = { notes: notesMap };
        if (chData.audc !== undefined) {
          out.audc = chData.audc;
        }
        channels[chId] = out;
      }
      appState.patterns[id] = {
        id: pat.id,
        label: pat.label ?? null,
        stepCount: pat.stepCount,
        channels,
      };
    }

    // patternIdCounter = max numero P presente nei pattern (evita collisioni).
    let maxN = 0;
    for (const id of Object.keys(appState.patterns)) {
      const m = id.match(/^P(\d+)$/);
      if (m) {
        const n = Number(m[1]);
        if (n > maxN) maxN = n;
      }
    }
    patternIdCounter = maxN;

    editingPatternLabelId = null;

    // Sync controlli UI con lo stato caricato.
    chipSelect.value = appState.activeChip;
    bpmInput.value = String(appState.bpm);
    stepCountSelect.value = String(currentStepCount());
    updateHeaderCopy();
    updateLoopButtonVisual();
    updateTransportModeVisual();
    updateTransportState();
    render();
  }

  async function copyExportText(exportId, text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(text);
      } catch (error) {
        legacyCopyText(text);
      }
    } else {
      legacyCopyText(text);
    }

    copiedExportId = exportId;

    if (copiedExportTimerId !== null) {
      window.clearTimeout(copiedExportTimerId);
    }

    copiedExportTimerId = window.setTimeout(() => {
      copiedExportId = null;
      copiedExportTimerId = null;
      render();
    }, 1500);

    render();
  }

  function legacyCopyText(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  function runImportPipeline(parsedSong, chip, voiceStrategy = "highest") {
    if (!parsedSong || !Array.isArray(parsedSong.tracks)) {
      throw new Error("runImportPipeline requires a valid ParsedSong");
    }

    if (!VOICE_STRATEGIES.includes(voiceStrategy)) {
      throw new Error(`Unsupported voice strategy: ${voiceStrategy}`);
    }

    // Tag con indice originale per correlare l'output di assignTracks alle tracce iniziali
    // (UI: dropdown override per traccia). Reduce e quantize spread-ano i campi, quindi
    // __sourceIndex sopravvive lungo la pipeline.
    const tagged = parsedSong.tracks.map((track, idx) => ({ ...track, __sourceIndex: idx }));

    // Reduce in tick domain (preserva la precisione delle sovrapposizioni reali).
    const reduced = tagged.map((track) => reduceTrack(track, voiceStrategy));

    // Quantize dopo reduce: ogni segmento risultante ottiene step/duration coerenti.
    const quantized = reduced.map((track) => quantizeTrack(track, parsedSong.ppq));

    return assignTracks(quantized, chip);
  }

  function openImportPanel() {
    importOverlay.classList.remove("hidden");
    importOverlay.setAttribute("aria-hidden", "false");
  }

  function closeImportPanel() {
    importOverlay.classList.add("hidden");
    importOverlay.setAttribute("aria-hidden", "true");
    resetImportSession();
  }

  function resetImportSession() {
    importSession.parsedSong = null;
    importSession.result = null;
    importSession.overrides.clear();
    importSession.voiceStrategy = "highest";
    voiceStrategySelect.value = "highest";
    importTracksList.innerHTML = "";
    importUnassignedList.innerHTML = "";
    importSummary.textContent = "";
    importStatus.textContent = "";
    importControls.classList.add("hidden");
    importDropZone.classList.remove("hidden");
    importDropZone.classList.remove("dragging");
    importConfirm.disabled = true;
    importFileInput.value = "";
  }

  async function handleImportFileSelected(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await loadMidiFile(file);
    event.target.value = "";
  }

  function handleDragOver(event) {
    event.preventDefault();
    importDropZone.classList.add("dragging");
  }

  function handleDragLeave() {
    importDropZone.classList.remove("dragging");
  }

  async function handleFileDrop(event) {
    event.preventDefault();
    importDropZone.classList.remove("dragging");
    const file = event.dataTransfer?.files?.[0];

    if (!file) {
      return;
    }

    await loadMidiFile(file);
  }

  async function loadMidiFile(file) {
    importStatus.textContent = `Parsing "${file.name}"...`;

    try {
      const buffer = await readFileAsArrayBuffer(file);
      const parsedSong = await parseMidi(buffer);
      importSession.parsedSong = parsedSong;
      importSession.overrides.clear();
      console.log("[ChipRoll Import] ParsedSong", parsedSong);
      runAndRenderPipeline();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      importStatus.textContent = `Parse error: ${message}`;
      console.error("[ChipRoll Import] MIDI parse error", error);
    }
  }

  function runAndRenderPipeline() {
    if (!importSession.parsedSong) {
      return;
    }

    try {
      importSession.result = runImportPipeline(
        importSession.parsedSong,
        appState.activeChip,
        importSession.voiceStrategy,
      );
      console.log("[ChipRoll Import] pipeline ->", importSession.result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      importStatus.textContent = `Pipeline error: ${message}`;
      console.error("[ChipRoll Import] Pipeline error", error);
      return;
    }

    renderImportPreview();
  }

  function renderImportPreview() {
    const { result, parsedSong } = importSession;

    if (!result || !parsedSong) {
      return;
    }

    importDropZone.classList.add("hidden");
    importControls.classList.remove("hidden");
    importStatus.textContent = "";

    const total = parsedSong.tracks.length;
    const assignedCount = result.assigned.length;
    const unassignedCount = result.unassigned.length;
    importSummary.textContent =
      `${total} track${total === 1 ? "" : "s"} detected (${assignedCount} assigned, ${unassignedCount} unassigned). ` +
      `BPM: ${Math.round(parsedSong.bpm)}, PPQ: ${parsedSong.ppq}.`;

    importTracksList.innerHTML = "";
    if (assignedCount === 0) {
      const empty = document.createElement("p");
      empty.className = "import-empty";
      empty.textContent = "No track can be assigned to this chip.";
      importTracksList.appendChild(empty);
    }
    for (const entry of result.assigned) {
      importTracksList.appendChild(renderImportTrackRow(entry));
    }

    importUnassignedList.innerHTML = "";
    if (unassignedCount > 0) {
      const heading = document.createElement("h3");
      heading.className = "import-unassigned-heading";
      heading.textContent = `Unassigned tracks (${unassignedCount})`;
      importUnassignedList.appendChild(heading);

      const list = document.createElement("ul");
      list.className = "import-unassigned-list";
      for (const item of result.unassigned) {
        const li = document.createElement("li");
        const trackName = item.track.name || "Untitled";
        const family = item.track.isPercussion
          ? "Ch.9 - Drums"
          : `GM ${item.track.gmProgram ?? 0} - ${getGmFamily(item.track.gmProgram, item.track.isPercussion)}`;
        li.innerHTML = `<strong>"${escapeHtml(trackName)}"</strong> <span class="import-unassigned-meta">(${escapeHtml(family)})</span> &mdash; ${escapeHtml(item.reason)}`;
        list.appendChild(li);
      }
      importUnassignedList.appendChild(list);
    }

    importConfirm.disabled = assignedCount === 0;
  }

  function renderImportTrackRow(entry) {
    const trackIdx = entry.track.__sourceIndex;
    const originalTrack = importSession.parsedSong.tracks[trackIdx];
    const override = importSession.overrides.get(trackIdx) || {};
    const currentPersonality = override.personality ?? entry.personality;
    const currentChannel = override.channel ?? entry.channel;

    const row = document.createElement("section");
    row.className = "import-track-row";

    const head = document.createElement("div");
    head.className = "import-track-head";

    const name = document.createElement("p");
    name.className = "import-track-name";
    name.textContent = `Track ${trackIdx + 1}: "${originalTrack.name || "Untitled"}"`;

    const noteCount = originalTrack.notes.length;
    const noteWord = `${noteCount} note${noteCount === 1 ? "" : "s"}`;

    const meta = document.createElement("p");
    meta.className = "import-track-meta";
    meta.textContent = originalTrack.isPercussion
      ? `Ch.9 - Drums - ${noteWord}`
      : `GM ${originalTrack.gmProgram ?? 0} - ${getGmFamily(originalTrack.gmProgram, originalTrack.isPercussion)} - ${noteWord}`;

    head.appendChild(name);
    head.appendChild(meta);
    row.appendChild(head);

    const controls = document.createElement("div");
    controls.className = "import-track-controls";
    controls.appendChild(buildPersonalityDropdown(trackIdx, currentPersonality));
    controls.appendChild(buildChannelDropdown(trackIdx, currentChannel));
    row.appendChild(controls);

    return row;
  }

  function buildPersonalityDropdown(trackIdx, currentValue) {
    return buildLabeledSelect("Personality", PERSONALITIES, currentValue, (value) => {
      const existing = importSession.overrides.get(trackIdx) || {};
      importSession.overrides.set(trackIdx, { ...existing, personality: value });
    });
  }

  function buildChannelDropdown(trackIdx, currentValue) {
    const channelMap = appState.activeChip === "NES" ? NES_CHANNEL_LABELS : TIA_CHANNEL_LABELS;
    const ids = Object.keys(channelMap);
    return buildLabeledSelect("Channel", ids, currentValue, (value) => {
      const existing = importSession.overrides.get(trackIdx) || {};
      importSession.overrides.set(trackIdx, { ...existing, channel: value });
    }, (id) => channelMap[id] ?? id);
  }

  function buildLabeledSelect(labelText, values, currentValue, onChange, formatLabel = (v) => v) {
    const wrap = document.createElement("label");
    wrap.className = "meta-control import-track-control";
    const span = document.createElement("span");
    span.className = "meta-control-label";
    span.textContent = labelText;
    wrap.appendChild(span);

    const select = document.createElement("select");
    select.className = "meta-select";
    let hasCurrent = false;
    for (const value of values) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = formatLabel(value);
      if (value === currentValue) {
        option.selected = true;
        hasCurrent = true;
      }
      select.appendChild(option);
    }
    if (!hasCurrent && currentValue !== undefined && currentValue !== null) {
      // Override esterno non in lista: aggiungilo per non perderlo.
      const option = document.createElement("option");
      option.value = currentValue;
      option.textContent = formatLabel(currentValue);
      option.selected = true;
      select.appendChild(option);
    }
    select.addEventListener("change", (event) => onChange(event.target.value));
    wrap.appendChild(select);
    return wrap;
  }

  function handleVoiceStrategyChange(value) {
    if (!VOICE_STRATEGIES.includes(value)) {
      voiceStrategySelect.value = importSession.voiceStrategy;
      return;
    }

    if (value === importSession.voiceStrategy) {
      return;
    }

    importSession.voiceStrategy = value;
    // Le overrides utente sopravvivono: il numero/posizione delle tracce non cambia,
    // cambia solo come la polifonia viene ridotta dentro ogni traccia.
    runAndRenderPipeline();
  }

  function handleConfirmImport() {
    if (!importSession.result) {
      return;
    }

    if (hasExistingPianoRollNotes()) {
      const ok = window.confirm(
        "The piano roll already contains notes. Importing will overwrite them. Proceed?",
      );

      if (!ok) {
        return;
      }
    }

    const finalAssignments = importSession.result.assigned.map((entry) => {
      const trackIdx = entry.track.__sourceIndex;
      const override = importSession.overrides.get(trackIdx) || {};
      return {
        sourceIndex: trackIdx,
        track: entry.track,
        channel: override.channel ?? entry.channel,
        personality: override.personality ?? entry.personality,
      };
    });

    const payload = {
      chip: appState.activeChip,
      bpm: Math.round(importSession.parsedSong.bpm),
      ppq: importSession.parsedSong.ppq,
      voiceStrategy: importSession.voiceStrategy,
      finalAssignments,
      unassigned: importSession.result.unassigned,
    };

    console.log("[ChipRoll Import] confirmed mapping:", payload);
    window.ChipRoll.lastImportMapping = payload;

    applyImportToPianoRoll(payload);

    closeImportPanel();
  }

  function applyImportToPianoRoll(payload) {
    if (!payload || !Array.isArray(payload.finalAssignments)) {
      console.warn("[ChipRoll Import] applyImportToPianoRoll: invalid payload");
      return { warnings: ["Invalid payload."], notesWritten: 0 };
    }

    stopPlayback();

    // BPM dell'import: clamp negli stessi limiti dell'input UI.
    const newBpm = Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(payload.bpm || 120)));
    appState.bpm = newBpm;
    bpmInput.value = String(newBpm);

    // Switch chip se diverso (resetta tutto lo stato dei canali);
    // altrimenti svuota le note di ogni canale in-place per "sovrascrivere".
    if (payload.chip && payload.chip !== appState.activeChip) {
      appState.activeChip = payload.chip;
      chipSelect.value = payload.chip;
      resetChannelsForChip(payload.chip);
    } else {
      // Import nello stesso chip: svuoto le note del pattern in edit
      // (gli altri pattern restano intatti, coerente con "import sovrascrive
      // il piano roll corrente" ma scoped al pattern).
      const pattern = currentPattern();
      for (const id of Object.keys(pattern.channels)) {
        pattern.channels[id].notes.clear();
      }
    }

    const warnings = [];
    let totalNotesWritten = 0;

    for (const assignment of payload.finalAssignments) {
      const result = writeAssignmentToChannel(assignment);
      warnings.push(...result.warnings);
      totalNotesWritten += result.notesWritten;
    }

    for (const item of payload.unassigned || []) {
      const trackName = item.track?.name || "Untitled";
      warnings.push(`Track "${trackName}" unassigned: ${item.reason}`);
    }

    render();

    console.log("[ChipRoll Import] Import applied.", {
      chip: appState.activeChip,
      bpm: appState.bpm,
      stepCount: currentStepCount(),
      notesWritten: totalNotesWritten,
      warnings: warnings.length,
    });

    if (warnings.length > 0) {
      console.warn("[ChipRoll Import] Warnings:");
      for (const w of warnings) {
        console.warn(`  - ${w}`);
      }

      const summary = warnings.slice(0, 5).join("\n");
      const more = warnings.length > 5 ? `\n... and ${warnings.length - 5} more (see console).` : "";
      window.alert(`Import finished with ${warnings.length} warning${warnings.length === 1 ? "" : "s"}:\n\n${summary}${more}`);
    }

    return { warnings, notesWritten: totalNotesWritten };
  }

  function writeAssignmentToChannel(assignment) {
    const warnings = [];
    let notesWritten = 0;
    const { track, channel: channelId, personality } = assignment;

    const data = channelData(channelId);

    if (!data) {
      warnings.push(`Channel ${channelId} not available on the ${appState.activeChip} chip. Skipped.`);
      return { warnings, notesWritten };
    }

    // For TIA, AUDC depends on the chosen personality: Pure Tone / Buzz / Noise.
    if (appState.activeChip === "TIA") {
      data.audc = personalityToAudc(personality);
    }

    const channelDef = getCurrentChannels().find((c) => c.id === channelId);

    if (!channelDef) {
      warnings.push(`Channel ${channelId} not found after AUDC update.`);
      return { warnings, notesWritten };
    }

    let droppedOutOfGrid = 0;
    let clippedAtBoundary = 0;

    for (const note of track.notes || []) {
      if (!Number.isInteger(note.step) || note.step < 0) {
        continue;
      }

      if (note.step >= currentStepCount()) {
        droppedOutOfGrid += 1;
        continue;
      }

      let duration = Math.max(1, Number.isInteger(note.duration) ? note.duration : 1);

      if (note.step + duration > currentStepCount()) {
        duration = currentStepCount() - note.step;
        clippedAtBoundary += 1;
      }

      const row = pickRowForNote(channelDef, note);

      if (!row) {
        warnings.push(`Pitch ${note.pitch} on ${channelDef.name}: no row available.`);
        continue;
      }

      notesWritten += insertImportedRun(channelDef, data, row, note.step, duration);
    }

    if (droppedOutOfGrid > 0) {
      warnings.push(
        `${channelDef.name}: ${droppedOutOfGrid} note${droppedOutOfGrid === 1 ? "" : "s"} past step ${currentStepCount()} dropped. ` +
          `Extend the grid (8/16/32) or import a different section.`,
      );
    }

    if (clippedAtBoundary > 0) {
      warnings.push(`${channelDef.name}: ${clippedAtBoundary} note${clippedAtBoundary === 1 ? "" : "s"} clipped at the grid boundary.`);
    }

    return { warnings, notesWritten };
  }

  function insertImportedRun(channel, data, row, startStep, duration) {
    let inserted = 0;

    for (let i = 0; i < duration; i += 1) {
      const step = startStep + i;
      const key = `${row.id}:${step}`;

      if (data.notes.has(key)) {
        continue;
      }

      // Canale monofonico per step: pulisce note di altre righe sullo stesso step.
      clearChannelStep(channel.id, step);

      const entry = createEntryForCell(channel, row, step);
      entry.isContinuation = i > 0;
      data.notes.set(key, entry);
      inserted += 1;
    }

    return inserted;
  }

  function pickRowForNote(channel, note) {
    if (channel.kind === "noise" && channel.profile !== "TIA") {
      return pickNesNoiseRow(channel, note.pitch);
    }
    return pickPitchedRow(channel, note.pitch);
  }

  function pickPitchedRow(channel, midiPitch) {
    const rows = channel.rows;

    if (!rows || rows.length === 0) {
      return null;
    }

    const midis = rows.map(getRowMidi).filter((m) => m !== null);

    if (midis.length === 0) {
      return null;
    }

    const minMidi = Math.min(...midis);
    const maxMidi = Math.max(...midis);

    // Octave-shift per stare nel range del canale: una nota troppo alta/bassa
    // viene trasposta di ottava finche' non rientra. Mantiene la classe di altezza
    // (note name) anche se la voce reale e' diversa.
    let target = midiPitch;

    while (target > maxMidi) {
      target -= 12;
    }

    while (target < minMidi) {
      target += 12;
    }

    let best = null;
    let bestDiff = Infinity;

    for (const row of rows) {
      const rowMidi = getRowMidi(row);

      if (rowMidi === null) {
        continue;
      }

      const diff = Math.abs(rowMidi - target);

      if (diff < bestDiff) {
        bestDiff = diff;
        best = row;
      }
    }

    return best;
  }

  function pickNesNoiseRow(channel, pitch) {
    // Mappatura kit MIDI -> period NES Noise (2-bin):
    // pitch < 50 (kick / low tom / snare) -> period 14 (rumble basso)
    // pitch >= 50 (hi-hat / cymbal / claves) -> period 4 (tono breve alto)
    const targetIndex = pitch < 50 ? 14 : 4;
    return channel.rows.find((r) => r.noiseIndex === targetIndex) || channel.rows[0] || null;
  }

  function getRowMidi(row) {
    if (typeof row.midi === "number") {
      return row.midi;
    }

    if (typeof row.label === "string") {
      try {
        return noteNameToMidi(row.label);
      } catch (_) {
        return null;
      }
    }

    return null;
  }

  function personalityToAudc(personality) {
    switch (personality) {
      case "Sharp square":
        return 1;
      case "Noise/Percussion":
        return 8;
      case "Soft square":
      case "Standard square":
      case "Smooth bass":
      default:
        return 12;
    }
  }

  function hasExistingPianoRollNotes() {
    // Controllo solo il pattern in edit: il pannello import sovrascrive
    // il pattern corrente, non gli altri.
    const pattern = currentPattern();
    if (!pattern) {
      return false;
    }
    for (const channelId of Object.keys(pattern.channels)) {
      if (pattern.channels[channelId].notes.size > 0) {
        return true;
      }
    }
    return false;
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value);
    return div.innerHTML;
  }

  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
          return;
        }

        reject(new Error("FileReader did not return an ArrayBuffer"));
      };

      reader.onerror = () => {
        reject(reader.error ?? new Error("Cannot read MIDI file"));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  function updateTransportState() {
    playButton.disabled = isPlaying;
    stopButton.disabled = !isPlaying;
  }

  function updateLoopButtonVisual() {
    loopButton.classList.toggle("loop-active", appState.loop);
    loopButton.setAttribute("aria-pressed", String(appState.loop));
  }

  function updateTransportModeVisual() {
    const isSong = appState.transportMode === "song";
    modePatternButton.classList.toggle("active", !isSong);
    modePatternButton.setAttribute("aria-pressed", String(!isSong));
    modeSongButton.classList.toggle("active", isSong);
    modeSongButton.setAttribute("aria-pressed", String(isSong));
  }

  function setTransportMode(mode) {
    if (mode !== "pattern" && mode !== "song") {
      return;
    }
    if (appState.transportMode === mode) {
      return;
    }
    stopPlayback();
    appState.transportMode = mode;
    updateTransportModeVisual();
  }

  async function handleGlobalKeydown(event) {
    if (isTextInputLike(event.target)) {
      return;
    }

    const modifier = event.ctrlKey || event.metaKey;

    if (modifier) {
      if (event.code === "KeyS") {
        event.preventDefault();
        handleSaveSession();
        return;
      }
      if (event.code === "KeyO") {
        event.preventDefault();
        loadFileInput.click();
        return;
      }
      if (event.code === "KeyD") {
        event.preventDefault();
        duplicatePattern(appState.currentPatternId);
        return;
      }
      return;
    }

    if (event.code === "Space") {
      event.preventDefault();
      if (isPlaying) {
        stopPlayback();
        return;
      }
      await startPlayback();
      return;
    }

    if (event.code === "BracketLeft") {
      event.preventDefault();
      goToAdjacentPattern(-1);
      return;
    }

    if (event.code === "BracketRight") {
      event.preventDefault();
      goToAdjacentPattern(1);
      return;
    }
  }

  function isTextInputLike(target) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    if (target.isContentEditable) {
      return true;
    }

    return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
  }

  function isFinitePositive(value) {
    return Number.isFinite(value) && value > 0;
  }

  function getStepDurationSeconds() {
    return 60 / appState.bpm / 4;
  }

  function handleBpmChange(event) {
    const raw = Number(event.target.value);

    if (!Number.isFinite(raw)) {
      event.target.value = String(appState.bpm);
      return;
    }

    const clamped = Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(raw)));

    if (clamped === appState.bpm) {
      event.target.value = String(clamped);
      return;
    }

    appState.bpm = clamped;
    event.target.value = String(clamped);
    stopPlayback();
  }

  function handleStepCountChange(event) {
    const value = Number(event.target.value);

    if (!STEP_COUNT_OPTIONS.includes(value)) {
      event.target.value = String(currentStepCount());
      return;
    }

    if (value === currentStepCount()) {
      return;
    }

    stopPlayback();
    // stepCount e' per-pattern: la modifica tocca solo il pattern in edit.
    currentPattern().stepCount = value;
    render();
  }

  function buildFamiTrackerText() {
    const channels = NES_CHANNEL_DEFS;
    const orderedPatternIds = appState.patternOrder.slice();
    if (orderedPatternIds.length === 0) {
      return "; No patterns to export";
    }

    // FamiTracker text impone una pattern_length globale per il track. ChipRoll
    // consente stepCount per-pattern: paddiamo i pattern brevi con righe vuote
    // fino a max(stepCount). I pattern brevi avranno trailing rests visibili.
    const stepCounts = orderedPatternIds.map((pid) => appState.patterns[pid].stepCount);
    const maxStep = Math.max(...stepCounts);
    const hasMixedStepCounts = stepCounts.some((s) => s !== maxStep);

    const lines = [];
    if (hasMixedStepCounts) {
      lines.push(
        `# NOTE: patterns have mixed step counts (${stepCounts.join(", ")}); shorter patterns are padded to ${maxStep} rows with empty cells.`,
      );
    }
    lines.push(`# TRACK ${maxStep} ${appState.bpm} 6 "Exported from ChipRoll"`);
    lines.push("# COLUMNS : 1 1 1 1");

    const orderSource = appState.song.length === 0 ? orderedPatternIds : appState.song;
    const orderIndices = orderSource
      .map((pid) => orderedPatternIds.indexOf(pid))
      .filter((i) => i >= 0);
    const orderHex = orderIndices.map((i) => toUpperHex(i, 2)).join(" ");
    lines.push(`# ORDER 0 : ${orderHex}`);

    orderedPatternIds.forEach((pid, patternIdx) => {
      const pattern = appState.patterns[pid];
      lines.push(`# PATTERN ${toUpperHex(patternIdx, 2)}${pattern.label ? ` ; ${pattern.label}` : ""}`);
      for (let step = 0; step < maxStep; step += 1) {
        const cells = step < pattern.stepCount
          ? channels.map((channel) => formatFamiTrackerCell(channel.id, getEntryForStep(channel.id, step, pid)))
          : channels.map(() => "... .. . ....");
        lines.push(`ROW ${toUpperHex(step, 2)} : ${cells.join(" : ")}`);
      }
      lines.push("");
    });

    return lines.join("\n").trimEnd();
  }

  function formatFamiTrackerCell(channelId, entry) {
    if (!entry) {
      return "... .. . ....";
    }

    const channel = NES_CHANNEL_DEFS.find((item) => item.id === channelId);

    if (!channel) {
      return "... .. . ....";
    }

    if (channel.kind === "noise") {
      const note = formatNoiseToken(entry.noteName);
      const registro = toUpperHex(entry.registro ?? 0, 2);
      return `${note} ${registro} . ....`;
    }

    const note = formatFamiTrackerNote(entry.noteName);
    const registro = toUpperHex(entry.nearest?.valore_registro ?? 0, 3);
    return `${note} ${registro} . ....`;
  }

  function buildCa65Assembly() {
    // Layout: per ogni pattern, 4 stream RLE (pulse1/pulse2/triangle/noise)
    // ognuno terminato da $00, piu' un descriptor con 4 .word puntatori.
    // Pattern boundary = implicit note-off (lo stream termina, non sustaina
    // cross-pattern). Le tabelle song mappano descriptor + step count e
    // l'ordine di playback (chiuso da $FF).
    const lines = [
      "; Exported from ChipRoll - NES ca65 (song-aware)",
      `; BPM: ${appState.bpm}`,
      "; Per-channel RLE: pairs of (NOTE_SYMBOL, duration), $00 terminator.",
      "; Each pattern has 4 streams (pulse1, pulse2, triangle, noise) and a",
      "; descriptor of 4 .word entries. song_pattern_table indexes descriptors,",
      "; song_order ends with $FF.",
      "",
    ];

    for (const patternId of appState.patternOrder) {
      const pattern = appState.patterns[patternId];
      if (!pattern) {
        continue;
      }

      lines.push(`PATTERN_${patternId}_STEPS = ${pattern.stepCount}`);
      for (const channel of NES_CHANNEL_DEFS) {
        lines.push(`pattern_${patternId}_${channel.id}_data:`);
        for (const run of buildChannelRuns(channel.id, patternId, pattern.stepCount)) {
          lines.push(`  .byte ${run.symbol}, $${toUpperHex(run.duration, 2)}`);
        }
        lines.push("  .byte $00");
      }

      lines.push(`pattern_${patternId}_descriptor:`);
      for (const channel of NES_CHANNEL_DEFS) {
        lines.push(`  .word pattern_${patternId}_${channel.id}_data`);
      }
      lines.push("");
    }

    lines.push("; Song tables");
    lines.push("song_pattern_table:");
    for (const patternId of appState.patternOrder) {
      lines.push(`  .word pattern_${patternId}_descriptor`);
    }

    lines.push("song_length_table:");
    for (const patternId of appState.patternOrder) {
      lines.push(`  .byte PATTERN_${patternId}_STEPS`);
    }

    lines.push("song_order:");
    if (appState.song.length === 0) {
      lines.push("  .byte $FF   ; empty song");
      lines.push("song_order_length = 0");
    } else {
      const indices = appState.song.map((sid) => appState.patternOrder.indexOf(sid));
      const hex = indices.map((i) => `$${toUpperHex(i, 2)}`).join(", ");
      lines.push(`  .byte ${hex}`);
      lines.push("  .byte $FF   ; end marker");
      lines.push(`song_order_length = ${appState.song.length}`);
    }

    return lines.join("\n");
  }

  function buildChannelRuns(channelId, patternId = appState.currentPatternId, stepCount = currentStepCount()) {
    const runs = [];
    let currentSymbol = null;
    let currentDuration = 0;

    for (let step = 0; step < stepCount; step += 1) {
      const entry = getEntryForStep(channelId, step, patternId);
      const symbol = entry ? toAssemblySymbol(channelId, entry.noteName) : "NOTE_REST";
      // Una nota con isContinuation=true estende il run precedente.
      // Le pause (NOTE_REST) consecutive si fondono sempre.
      // Una nota click-inserita (isContinuation=false) inizia sempre un nuovo run,
      // anche se ha lo stesso simbolo della precedente.
      const canExtendRun =
        symbol === currentSymbol &&
        (symbol === "NOTE_REST" || (entry && entry.isContinuation === true));

      if (canExtendRun) {
        currentDuration += 1;
        continue;
      }

      if (currentSymbol !== null) {
        runs.push({ symbol: currentSymbol, duration: currentDuration });
      }

      currentSymbol = symbol;
      currentDuration = 1;
    }

    if (currentSymbol !== null) {
      runs.push({ symbol: currentSymbol, duration: currentDuration });
    }

    return runs;
  }

  function buildTiaCa65Assembly() {
    // Layout: per ogni pattern, una label `pattern_PN:` con stream di triplette
    // (AUDF, AUDC, AUDV), una riga per step, due canali per step (ch1 poi ch2).
    // AUDV=$00 marca silenzio. AUDC per-step segue entry.audc (per-pattern in
    // pratica: changeTiaTimbre cancella le note quando l'AUDC del canale cambia).
    // AUDV bit 7 ($80) = "new onset" marker: il player puo' inserire un frame
    // di silence prima della nota per articolare due note adiacenti dello stesso
    // pitch (il TIA non ha envelope hardware, senza marker due note uguali
    // suonano come una sola nota lunga). entry.isContinuation === true
    // (drag-fill o MIDI sustain) NON setta il bit 7. Bit 7 mascherato via & $0F
    // dal player prima di scrivere AUDV al chip.
    // Header emette anche SONG_BPM e SONG_FRAMES_PER_STEP_{NTSC,PAL} cosi' il
    // player puo' matchare il tempo della composizione senza configurazione.
    // Alla fine, due tabelle song: song_pattern_table (.word per ogni pattern),
    // song_length_table (step count per pattern), e song_order (sequenza di
    // indici chiusa da $FF).
    const stepDurSec = 60 / appState.bpm / 4;
    const framesPerStepNtsc = Math.max(1, Math.round(stepDurSec * 60));
    const framesPerStepPal = Math.max(1, Math.round(stepDurSec * 50));
    const lines = [
      "; Exported from ChipRoll - TIA-native ca65",
      `; BPM: ${appState.bpm}`,
      "; Format per step: ch1 (AUDF, AUDC, AUDV), then ch2 (AUDF, AUDC, AUDV).",
      "; AUDV=$00 marks a silent step. AUDV bit 7 ($80) flags a new onset",
      "; (player should articulate by writing AUDV=0 for one frame, then the",
      "; volume from the low nibble). Continuation steps emit $0F (no bit 7).",
      "; Patterns may have different step counts.",
      "",
      `SONG_BPM = ${appState.bpm}`,
      `SONG_FRAMES_PER_STEP_NTSC = ${framesPerStepNtsc}   ; 60 Hz playback`,
      `SONG_FRAMES_PER_STEP_PAL  = ${framesPerStepPal}   ; 50 Hz playback`,
      "",
    ];

    for (const patternId of appState.patternOrder) {
      const pattern = appState.patterns[patternId];
      if (!pattern) {
        continue;
      }

      lines.push(`PATTERN_${patternId}_STEPS = ${pattern.stepCount}`);
      lines.push(`pattern_${patternId}:`);

      for (let step = 0; step < pattern.stepCount; step += 1) {
        const bytes = [];
        for (const channel of TIA_CHANNEL_DEFS) {
          const entry = getEntryForStep(channel.id, step, patternId);
          if (entry) {
            const audf = entry.registro ?? 0;
            const audc = entry.audc ?? 0;
            // Bit 7 = "new onset" flag. Continuation (drag/MIDI sustain) clears it.
            const audv = entry.isContinuation === true ? 0x0F : 0x8F;
            bytes.push(audf, audc, audv);
          } else {
            bytes.push(0, 0, 0);
          }
        }
        const hex = bytes.map((b) => `$${toUpperHex(b, 2)}`).join(", ");
        lines.push(`  .byte ${hex}   ; step ${step}`);
      }

      lines.push("");
    }

    lines.push("; Song tables");
    lines.push("song_pattern_table:");
    for (const patternId of appState.patternOrder) {
      lines.push(`  .word pattern_${patternId}`);
    }

    lines.push("song_length_table:");
    for (const patternId of appState.patternOrder) {
      lines.push(`  .byte PATTERN_${patternId}_STEPS`);
    }

    lines.push("song_order:");
    if (appState.song.length === 0) {
      lines.push("  .byte $FF   ; empty song");
      lines.push("song_order_length = 0");
    } else {
      const indices = appState.song.map((sid) => appState.patternOrder.indexOf(sid));
      const hex = indices.map((i) => `$${toUpperHex(i, 2)}`).join(", ");
      lines.push(`  .byte ${hex}`);
      lines.push("  .byte $FF   ; end marker");
      lines.push(`song_order_length = ${appState.song.length}`);
    }

    return lines.join("\n");
  }

  function buildPokeyCa65Assembly() {
    // Layout: per ogni pattern una label `pokey_pattern_PN:` con uno stream
    // di 8 byte per step (4 canali x AUDF,AUDC). AUDC byte = high nibble
    // (distortion: $A0/$E0/$80) OR'd con low nibble (volume 0-15). Sui rest
    // AUDF=AUDC=$00 (volume 0 = silenzio garantito sul chip reale: POKEY
    // non auto-mute senza una scrittura esplicita di volume 0).
    // AUDCTL = $00 setup-time: nessun joined 16-bit, nessun filtro, clock
    // 64 kHz su tutti i canali. Player tipico: scrive AUDCTL=$00 a $D208
    // una volta init, poi stream pattern data a $D200..$D207 ogni frame.
    const VOLUME_FULL = 0x0F;
    const lines = [
      "; Exported from ChipRoll - POKEY-native ca65 (song-aware)",
      `; BPM: ${appState.bpm}`,
      "; AUDCTL = $00 (64 kHz clock, no joined, no filters). Set once at init.",
      "; Format per step: 4 channels x (AUDF, AUDC) = 8 bytes.",
      "; AUDC byte: high nibble = distortion ($A=pure $E=buzz $8=noise),",
      "; low nibble = volume (0-15, $F = full). AUDC=$00 = silent step.",
      "",
    ];

    for (const patternId of appState.patternOrder) {
      const pattern = appState.patterns[patternId];
      if (!pattern) {
        continue;
      }

      lines.push(`PATTERN_${patternId}_STEPS = ${pattern.stepCount}`);
      lines.push(`pokey_pattern_${patternId}:`);

      for (let step = 0; step < pattern.stepCount; step += 1) {
        const bytes = [];
        for (const channel of POKEY_CHANNEL_DEFS) {
          const entry = getEntryForStep(channel.id, step, patternId);
          if (entry) {
            const audf = entry.registro ?? 0;
            const audc = ((entry.audc ?? 0) | VOLUME_FULL) & 0xFF;
            bytes.push(audf, audc);
          } else {
            bytes.push(0, 0);
          }
        }
        const hex = bytes.map((b) => `$${toUpperHex(b, 2)}`).join(", ");
        lines.push(`  .byte ${hex}   ; step ${step}`);
      }

      lines.push("");
    }

    lines.push("; Song tables");
    lines.push("pokey_song_pattern_table:");
    for (const patternId of appState.patternOrder) {
      lines.push(`  .word pokey_pattern_${patternId}`);
    }

    lines.push("pokey_song_length_table:");
    for (const patternId of appState.patternOrder) {
      lines.push(`  .byte PATTERN_${patternId}_STEPS`);
    }

    lines.push("pokey_song_order:");
    if (appState.song.length === 0) {
      lines.push("  .byte $FF   ; empty song");
      lines.push("pokey_song_order_length = 0");
    } else {
      const indices = appState.song.map((sid) => appState.patternOrder.indexOf(sid));
      const hex = indices.map((i) => `$${toUpperHex(i, 2)}`).join(", ");
      lines.push(`  .byte ${hex}`);
      lines.push("  .byte $FF   ; end marker");
      lines.push(`pokey_song_order_length = ${appState.song.length}`);
    }

    return lines.join("\n");
  }

  function buildGenericSessionJson() {
    const channels = getCurrentChannels();
    const snapshot = {
      active_chip: appState.activeChip,
      bpm: appState.bpm,
      step_count: currentStepCount(),
      channels: channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        kind: channel.kind,
        timbre: (channel.profile === "TIA" || channel.profile === "POKEY") ? channel.timbreLabel : null,
        audc: (channel.profile === "TIA" || channel.profile === "POKEY") ? channel.audc : null,
        muted: channelMixer(channel.id).muted,
        solo: channelMixer(channel.id).solo,
        steps: Array.from({ length: currentStepCount() }, (_, step) => {
          const entry = getEntryForStep(channel.id, step);

          if (!entry) {
            return {
              step,
              note: null,
              real_hz: null,
              register: null,
              cents_offset: null,
            };
          }

          return {
            step,
            note: entry.noteName,
            real_hz: entry.hz ?? null,
            register: resolveEntryRegister(channel, entry),
            cents_offset: entry.nearest?.scarto_cents ?? null,
          };
        }),
      })),
    };

    return JSON.stringify(snapshot, null, 2);
  }

  function resolveEntryRegister(channel, entry) {
    return entry.registro ?? entry.nearest?.valore_registro ?? null;
  }

  function formatFamiTrackerNote(noteName) {
    const match = /^([A-G])(#?)(-?\d+)$/.exec(noteName);

    if (!match) {
      return "...";
    }

    const [, pitch, sharp, octave] = match;
    return `${pitch}${sharp ? "#" : "-"}${octave}`;
  }

  function formatNoiseToken(noteName) {
    const match = /(\d+)$/.exec(noteName);
    const indexText = match ? match[1] : "0";
    return `N-${indexText.slice(-1)}`;
  }

  function toAssemblySymbol(channelId, noteName) {
    if (channelId === "noise") {
      return `NOISE_${noteName.replace(/\s+/g, "_").toUpperCase()}`;
    }

    return `NOTE_${noteName.replace("#", "S").toUpperCase()}`;
  }

  function toUpperHex(value, width) {
    return Number(value).toString(16).toUpperCase().padStart(width, "0");
  }

  function formatCents(cents) {
    const sign = cents >= 0 ? "+" : "";
    return `${sign}${cents.toFixed(1)}¢`;
  }

  function getIntonationClassName(cents) {
    const absoluteCents = Math.abs(cents);

    if (absoluteCents < 10) {
      return "intonation-good";
    }

    if (absoluteCents <= 25) {
      return "intonation-warn";
    }

    return "intonation-bad";
  }

  function buildNoteRange(startNote, endNote) {
    const startMidi = noteNameToMidi(startNote);
    const endMidi = noteNameToMidi(endNote);
    const range = [];

    for (let midi = endMidi; midi >= startMidi; midi -= 1) {
      const label = midiToNoteName(midi);
      range.push({
        id: label,
        label,
        midi,
        hz: midiToHz(midi),
        isBlackKey: label.includes("#"),
      });
    }

    return range;
  }

  function buildNoiseRows() {
    const rows = [];

    for (let index = 15; index >= 0; index -= 1) {
      rows.push({
        id: `noise-${index}`,
        label: `Period ${index}`,
        hz: 40 + index,
        noiseIndex: index,
        isBlackKey: false,
      });
    }

    return rows;
  }

  function buildTiaRows(audc) {
    const table = getTiaFrequencyTable(audc);

    return [...table.entries]
      .sort((left, right) => right.hz - left.hz)
      .map((entry) => {
        const concert = createConcertPitchMatch(entry.hz);
        return {
          id: `tia-${audc}-${entry.audf}`,
          label: concert.noteName,
          targetHz: concert.concertHz,
          outputHz: entry.hz,
          audf: entry.audf,
          isBlackKey: concert.noteName.includes("#"),
          cents: concert.scarto_cents,
        };
      });
  }

  function createConcertPitchMatch(hz) {
    const midi = hzToNearestMidi(hz);
    const noteName = midiToNoteName(midi);
    const concertHz = midiToHz(midi);
    const cents = 1200 * Math.log2(hz / concertHz);

    return {
      noteName,
      concertHz,
      scarto_cents: cents,
      intonato: Math.abs(cents) < 10,
      hz_piu_vicino: hz,
    };
  }

  function createRowIntonation(outputHz, targetHz) {
    const cents = 1200 * Math.log2(outputHz / targetHz);

    return {
      hz_piu_vicino: outputHz,
      scarto_cents: cents,
      intonato: Math.abs(cents) < 10,
    };
  }

  function hzToNearestMidi(hz) {
    return Math.round(69 + 12 * Math.log2(hz / 440));
  }

  function noteNameToMidi(noteName) {
    const match = /^([A-G])(#?)(-?\d+)$/.exec(noteName);

    if (!match) {
      throw new Error(`Nome nota non valido: ${noteName}`);
    }

    const [, pitch, sharp, octaveText] = match;
    const pitchClassMap = {
      C: 0,
      D: 2,
      E: 4,
      F: 5,
      G: 7,
      A: 9,
      B: 11,
    };
    const pitchClass = pitchClassMap[pitch] + (sharp ? 1 : 0);
    const octave = Number(octaveText);
    return (octave + 1) * 12 + pitchClass;
  }

  function midiToNoteName(midi) {
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const pitchClass = ((midi % 12) + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    return `${noteNames[pitchClass]}${octave}`;
  }

  function midiToHz(midi) {
    return 440 * (2 ** ((midi - 69) / 12));
  }
})();
