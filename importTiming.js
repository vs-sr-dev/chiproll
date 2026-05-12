(function createImportTiming(root, factory) {
  const exported = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }

  if (root) {
    root.ImportTiming = exported;
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function buildImportTiming() {
    function gcd(a, b) {
      let x = Math.abs(Math.trunc(a));
      let y = Math.abs(Math.trunc(b));
      while (y !== 0) {
        const t = y;
        y = x % y;
        x = t;
      }
      return x;
    }

    // GCD dei soli onset (note.startTick). Le durate sono volutamente escluse:
    // i MIDI accorciano spesso di 1 tick l'ultima nota (191 vs 192) per evitare
    // sovrapposizioni — includerle scenderebbe a gcd=1 e farebbe esplodere il BPM.
    function computeOnsetTickGcd(notes) {
      let g = 0;
      for (const note of notes) {
        if (!Number.isFinite(note.startTick) || note.startTick < 0) continue;
        // gcd(0, x) = x: il primo onset != 0 inizializza correttamente.
        g = gcd(g, note.startTick);
      }
      return g;
    }

    // Trova la "griglia principale" come moda dei delta inter-onset.
    //
    // Il GCD puro e' fragile: basta UNA nota ornamentale fuori griglia (es. terzina
    // dentro una linea altrimenti in quintine) e il GCD globale crolla, mandando il
    // BPM auto-stretchato fuori range. La moda invece misura "qual e' la spaziatura
    // ricorrente tra onset" — gli ornamenti rari restano outlier e non spostano il
    // valore.
    //
    // `minCoverage` (0..1) richiede che almeno quella frazione di onset cada su un
    // multiplo intero della moda — altrimenti il brano non ha una griglia chiara e
    // ritorniamo 0 (fallback al default 16th).
    function computeMainGridTicks(notes, minCoverage = 0.8) {
      const onsets = [];
      for (const note of notes) {
        if (!Number.isFinite(note.startTick) || note.startTick < 0) continue;
        onsets.push(Math.trunc(note.startTick));
      }
      if (onsets.length < 2) return 0;
      onsets.sort((a, b) => a - b);

      const counts = new Map();
      for (let i = 1; i < onsets.length; i += 1) {
        const d = onsets[i] - onsets[i - 1];
        if (d > 0) counts.set(d, (counts.get(d) || 0) + 1);
      }

      let mode = 0;
      let modeCount = 0;
      for (const [d, c] of counts.entries()) {
        if (c > modeCount) {
          mode = d;
          modeCount = c;
        }
      }
      if (mode === 0) return 0;

      let onGrid = 0;
      for (const t of onsets) {
        if (t % mode === 0) onGrid += 1;
      }
      if (onGrid / onsets.length < minCoverage) return 0;

      return mode;
    }

    // Raffina la griglia rilevata tenendo conto di STRUTTURE SECONDARIE ricorrenti.
    //
    // Esempio: un MIDI ha mainGrid=384 (quarti) ma molte note cadono anche a 192
    // tick di offset (ottavi). Se queste off-mainGrid note formano un cluster
    // sostanziale (≥ minClusterFraction delle note totali), allineiamo la griglia
    // anche a loro tramite gcd(mainGrid, secondaryOffsets).
    //
    // Outlier sporadici (terzine ornamentali, errori di edit) restano sotto la
    // soglia e vengono ignorati — la griglia non viene contaminata.
    function refineGridWithSecondaryStructure(onsets, mainGrid, minClusterFraction = 0.05) {
      if (mainGrid <= 0 || onsets.length === 0) return mainGrid;
      const minCount = Math.max(2, Math.ceil(onsets.length * minClusterFraction));

      const remainderCounts = new Map();
      for (const t of onsets) {
        const r = ((t % mainGrid) + mainGrid) % mainGrid;
        if (r === 0) continue;
        remainderCounts.set(r, (remainderCounts.get(r) || 0) + 1);
      }

      let g = mainGrid;
      for (const [r, c] of remainderCounts.entries()) {
        if (c >= minCount) g = gcd(g, r);
      }
      return g;
    }

    // Enumera i divisori interi di n in ordine crescente.
    function divisorsOf(n) {
      if (n <= 0) return [];
      const out = [];
      for (let d = 1; d <= n; d += 1) {
        if (n % d === 0) out.push(d);
      }
      return out;
    }

    // Calcola un eventuale "auto stretch" del BPM all'import, in modo che la griglia
    // ChipRoll a sedicesimi (stepsPerBeat=4) cada esattamente sugli onset MIDI.
    //
    // Strategia:
    //  1. Rileva la "griglia principale" gridTicks come moda dei delta inter-onset,
    //     tollerando outlier ornamentali fino a (1 - minCoverage) delle note.
    //  2. Default ticksPerStep = ppq/4 (sedicesimi).
    //  3. Se gridTicks e' un multiplo intero del default → niente swing, default OK.
    //  4. Altrimenti, tra i DIVISORI INTERI di gridTicks scegli quello piu' vicino al
    //     default ticksPerStep che produca un BPM stretchato dentro [bpmMin, bpmMax].
    //     Qualunque divisore di gridTicks preserva l'allineamento (ogni onset main-grid
    //     resta multiplo intero del divisore). Tra i candidati validi preferiamo il
    //     ticksPerStep piu' vicino a ppq/4 perche':
    //        - minimizza la deviazione del BPM mostrato vs midiBpm originale,
    //        - mantiene la densita' visiva degli step simile a un MIDI 16th puro.
    //
    //  Formula (invariante: velocita' reale conservata):
    //        stepDurationSec = 60 / (newBpm * 4)          (ChipRoll playback)
    //                        = ticksPerStep * (60 / (ppq * midiBpm))   (MIDI reale)
    //        ⇒ newBpm = ppq * midiBpm / (ticksPerStep * 4)
    //
    //  5. Se nessun divisore produce BPM in range → fallback default + warning.
    function computeImportTimingAdjustment({ ppq, bpm, tracks, bpmMin, bpmMax, minCoverage = 0.8 }) {
      if (!Number.isFinite(ppq) || ppq <= 0) {
        throw new Error("ppq must be a positive number");
      }
      if (!Number.isFinite(bpm) || bpm <= 0) {
        throw new Error("bpm must be a positive number");
      }
      if (!Array.isArray(tracks)) {
        throw new Error("tracks must be an array");
      }

      const defaultStepsPerBeat = 4;
      const defaultTicksPerStep = ppq / defaultStepsPerBeat;

      const allOnsets = [];
      const onsetTicks = [];
      for (const track of tracks) {
        for (const note of track.notes || []) {
          allOnsets.push(note);
          if (Number.isFinite(note.startTick) && note.startTick >= 0) {
            onsetTicks.push(Math.trunc(note.startTick));
          }
        }
      }
      const mainGrid = computeMainGridTicks(allOnsets, minCoverage);
      // Raffina con strutture secondarie ricorrenti (es. ottavi dentro una griglia
      // di quarti). Cluster <5% restano outlier ornamentali e non spostano il grid.
      const gridTicks = refineGridWithSecondaryStructure(onsetTicks, mainGrid);

      const noAdjust = {
        ticksPerStep: defaultTicksPerStep,
        stepsPerBeat: defaultStepsPerBeat,
        bpm,
        adjusted: false,
        gridTicks,
      };

      if (gridTicks === 0) return noAdjust;
      if (gridTicks % defaultTicksPerStep === 0) return noAdjust;

      const minFn = Number.isFinite(bpmMin) ? bpmMin : -Infinity;
      const maxFn = Number.isFinite(bpmMax) ? bpmMax : Infinity;

      // Cerca tra i divisori interi di gridTicks il ticksPerStep ottimo
      // (piu' vicino al default 16th) che dia un BPM in range.
      const candidates = divisorsOf(gridTicks)
        .map((d) => ({ ticksPerStep: d, newBpm: (ppq * bpm) / (d * defaultStepsPerBeat) }))
        .filter((c) => c.newBpm >= minFn && c.newBpm <= maxFn);

      if (candidates.length === 0) {
        // Nessun divisore in range: caso patologico (griglia molto piccola o midiBpm estremo).
        const fallbackBpm = (ppq * bpm) / (gridTicks * defaultStepsPerBeat);
        return {
          ...noAdjust,
          warning:
            `MIDI main grid (${gridTicks} ticks @ ppq=${ppq}) does not align to 16ths. ` +
            `Auto-stretch would need ${Math.round(fallbackBpm * 10) / 10} BPM, out of range. Some swing will remain.`,
        };
      }

      candidates.sort(
        (a, b) => Math.abs(a.ticksPerStep - defaultTicksPerStep) - Math.abs(b.ticksPerStep - defaultTicksPerStep),
      );
      const best = candidates[0];

      return {
        ticksPerStep: best.ticksPerStep,
        stepsPerBeat: ppq / best.ticksPerStep,
        bpm: best.newBpm,
        adjusted: true,
        originalBpm: bpm,
        gridTicks,
      };
    }

    return {
      gcd,
      computeOnsetTickGcd,
      computeMainGridTicks,
      refineGridWithSecondaryStructure,
      computeImportTimingAdjustment,
    };
  },
);
