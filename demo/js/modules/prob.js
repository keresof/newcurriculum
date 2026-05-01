import { $, $$, svgEl, setAttrs } from "../core/dom.js";
import { randomInt, clamp } from "../core/math.js";
import { flashHighlight, prefersReducedMotion } from "../core/motion.js";
import { State, recordAttempt, renderModuleMini } from "../core/state.js";
import { toast } from "../core/ui.js";

export const ProbMod = (() => {
  const svg = $("#prob-hist");
  const refs = { barsTheo: [], barsExp: [], labels: [], freq: [] };
  const W = 720, H = 360;
  const padL = 50, padR = 30, padT = 30, padB = 60;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const MODES = {
    die1: {
      label: "1d6",
      cats: [1, 2, 3, 4, 5, 6],
      theo: () => Array(6).fill(1 / 6),
      run: () => randomInt(1, 6),
      expected: 3.5,
    },
    die2: {
      label: "2d6",
      cats: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      // Triangular distribution for sum of two d6
      theo: () => {
        // weights 1,2,3,4,5,6,5,4,3,2,1 over 36
        const w = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];
        return w.map((x) => x / 36);
      },
      run: () => randomInt(1, 6) + randomInt(1, 6),
      expected: 7,
    },
    coin10: {
      label: "10 para · tura",
      cats: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      // Binom(10, 0.5): C(10,k) / 1024
      theo: () => {
        const C = [1, 10, 45, 120, 210, 252, 210, 120, 45, 10, 1];
        return C.map((c) => c / 1024);
      },
      run: () => {
        let heads = 0;
        for (let i = 0; i < 10; i++) if (Math.random() < 0.5) heads++;
        return heads;
      },
      expected: 5,
    },
  };

  // State: counts per category, total rolls, mode
  const state = { mode: "die2", counts: {}, total: 0, lastResult: null };

  function resetCounts() {
    state.counts = {};
    MODES[state.mode].cats.forEach((c) => (state.counts[c] = 0));
    state.total = 0;
    state.lastResult = null;
  }

  function buildSVG() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    // Axes
    svg.appendChild(svgEl("line", {
      class: "axis", x1: padL, y1: padT, x2: padL, y2: H - padB,
      stroke: "#cbd5e1",
    }));
    svg.appendChild(svgEl("line", {
      class: "axis", x1: padL, y1: H - padB, x2: W - padR, y2: H - padB,
      stroke: "#cbd5e1",
    }));
    // Y-axis title
    const yt = svg.appendChild(svgEl("text", {
      x: padL - 30, y: padT - 8, fill: "#94a3b8", "font-size": 11,
    }));
    yt.textContent = "Oran";

    rebuildBars();
  }

  function rebuildBars() {
    // Remove previous bar nodes (keep axes — first two children)
    while (svg.childNodes.length > 3) svg.removeChild(svg.lastChild);
    refs.barsTheo.length = 0;
    refs.barsExp.length = 0;
    refs.labels.length = 0;
    refs.freq.length = 0;

    const cats = MODES[state.mode].cats;
    const gap = 6;
    const barW = (innerW - gap * (cats.length - 1)) / cats.length;

    cats.forEach((cat, i) => {
      const x = padL + i * (barW + gap);
      // Theoretical bar (background outline)
      const theo = svg.appendChild(svgEl("rect", {
        class: "bar-theo", x, y: H - padB, width: barW, height: 0, rx: 4,
      }));
      // Experimental bar (filled)
      const exp = svg.appendChild(svgEl("rect", {
        class: "bar-exp", x: x + 4, y: H - padB, width: barW - 8, height: 0, rx: 3,
      }));
      // Frequency label (above bar)
      const freq = svg.appendChild(svgEl("text", {
        class: "freq-label", x: x + barW / 2, y: H - padB,
        "text-anchor": "middle",
      }));
      // Category label (below axis)
      const lbl = svg.appendChild(svgEl("text", {
        class: "cat-label", x: x + barW / 2, y: H - padB + 18,
        "text-anchor": "middle",
      }));
      lbl.textContent = cat;

      refs.barsTheo.push(theo);
      refs.barsExp.push(exp);
      refs.labels.push(lbl);
      refs.freq.push(freq);
    });
  }

  function draw() {
    const cats = MODES[state.mode].cats;
    const theo = MODES[state.mode].theo();
    const maxTheo = Math.max(...theo);
    // Scale so that theoretical max fills ~85% of inner height
    const visMax = Math.max(maxTheo, 0.01) * 1.15;

    cats.forEach((cat, i) => {
      const expProb = state.total > 0 ? state.counts[cat] / state.total : 0;
      const theoH = (theo[i] / visMax) * innerH;
      const expH  = (expProb / visMax) * innerH;
      setAttrs(refs.barsTheo[i], {
        y: H - padB - theoH,
        height: theoH,
      });
      setAttrs(refs.barsExp[i], {
        y: H - padB - expH,
        height: expH,
      });
      if (state.total > 0 && state.counts[cat] > 0) {
        refs.freq[i].textContent = state.counts[cat];
        setAttrs(refs.freq[i], { y: H - padB - expH - 4 });
      } else {
        refs.freq[i].textContent = "";
      }
    });
  }

  function updateStats() {
    const modeInfo = MODES[state.mode];
    const cats = modeInfo.cats;
    let sum = 0;
    let modeCat = null, modeCount = 0;
    cats.forEach((cat) => {
      const c = state.counts[cat] || 0;
      sum += cat * c;
      if (c > modeCount) { modeCount = c; modeCat = cat; }
    });
    const mean = state.total > 0 ? (sum / state.total).toFixed(2) : "—";
    const mode = modeCount > 0 ? String(modeCat) : "—";

    $("#prob-mini").querySelector("[data-k='total']").textContent = state.total;
    $("#prob-mini").querySelector("[data-k='mean']").textContent = mean;
    $("#prob-mini").querySelector("[data-k='mode']").textContent = mode;

    const theoArr = modeInfo.theo();
    let tv = 0;
    if (state.total > 0) {
      cats.forEach((cat, i) => {
        const expProb = (state.counts[cat] || 0) / state.total;
        tv += Math.abs(expProb - theoArr[i]);
      });
      tv /= 2;
    }
    const tvEl = $("#prob-tv");
    if (tvEl) tvEl.textContent = state.total > 0 ? tv.toFixed(4) : "—";

    const last = state.lastResult;
    $("#prob-last").textContent = last == null ? "Son atış: —" : `Son atış: ${last}`;

    // Pedagogical hint based on mode + sample size
    const fb = $("#prob-fb");
    if (state.total === 0) {
      fb.textContent = "İpucu: Atış sayısı az iken deneysel dağılım düzensiz, arttıkça teorik dağılıma yakınsar.";
    } else if (state.total < 50) {
      fb.textContent = `Az örneklem (${state.total}). Ortalama ${mean}, teorik beklenen ${modeInfo.expected}. Daha çok at.`;
    } else if (state.total < 500) {
      fb.textContent = `${state.total} atış. Gözlenen ortalama ${mean} ↔ teorik ${modeInfo.expected}. Dağılım şekillenmeye başlıyor.`;
    } else {
      fb.textContent = `${state.total} atış · ortalama ${mean} (teorik ${modeInfo.expected}). Deneysel frekanslar teorik dağılıma yaklaştı.`;
    }
  }

  function rollOnce() {
    const r = MODES[state.mode].run();
    state.counts[r] = (state.counts[r] || 0) + 1;
    state.total += 1;
    state.lastResult = r;
  }

  function runN() {
    const n = clamp(Number($("#prob-trials").value) || 500, 10, 10000);
    for (let i = 0; i < n; i++) rollOnce();
    draw();
    updateStats();
  }
  function rollSingle() {
    rollOnce();
    draw();
    updateStats();
  }
  function reset() {
    resetCounts();
    draw();
    updateStats();
  }
  function onModeChange() {
    state.mode = $("#prob-mode").value;
    $("#prob-mode-v").textContent = MODES[state.mode].label;
    resetCounts();
    rebuildBars();
    draw();
    updateStats();
  }
  function onTrialsSlider() {
    $("#prob-trials-num").value = $("#prob-trials").value;
  }
  function onTrialsNum() {
    let v = Number($("#prob-trials-num").value);
    if (!Number.isFinite(v)) return;
    v = clamp(v, 10, 10000);
    $("#prob-trials").value = v;
  }

  function init() {
    resetCounts();
    buildSVG();
    draw();
    updateStats();
    $("#prob-mode").addEventListener("change", onModeChange);
    $("#prob-trials").addEventListener("input", onTrialsSlider);
    $("#prob-trials-num").addEventListener("input", onTrialsNum);
    $("#prob-trials-num").addEventListener("blur", onTrialsNum);
    $("#run-sim").addEventListener("click", runN);
    $("#add-one").addEventListener("click", rollSingle);
    $("#reset-sim").addEventListener("click", reset);
    const prow = $("#prob-checklist");
    if (prow) {
      prow.querySelectorAll("input[type=checkbox]").forEach((cb) => {
        cb.addEventListener("change", () => {
          const all = Array.from(prow.querySelectorAll("input[type=checkbox]")).every((x) => x.checked);
          if (all) toast("Olasılık keşif listesi tamamlandı.", "ok");
        });
      });
    }
  }
  return { init };
})();
