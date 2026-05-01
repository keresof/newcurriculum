import { $, svgEl, setAttrs } from "../core/dom.js";
import { clamp } from "../core/math.js";
import { toast } from "../core/ui.js";

const W = 720;
const H = 420;
const padL = 48;
const padR = 16;
const chartW = W - padL - padR;
const histTop = 24;
const histH = 168;
const histBase = histTop + histH;
const boxY = 258;
const boxH = 44;

function parseData(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return [];
  return s
    .split(/[\s,;\n\t]+/)
    .map((t) => Number(t.replace(",", ".")))
    .filter((x) => Number.isFinite(x));
}

function mean(arr) {
  if (!arr.length) return NaN;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdevPop(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length);
}

function quantileSorted(sorted, q) {
  const n = sorted.length;
  if (n === 0) return NaN;
  const pos = (n - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  const t = pos - lo;
  return sorted[lo] * (1 - t) + sorted[hi] * t;
}

function whiskers(sorted, q1, q3) {
  const iqr = q3 - q1;
  const low = q1 - 1.5 * iqr;
  const high = q3 + 1.5 * iqr;
  let wL = sorted[0];
  for (const v of sorted) {
    if (v >= low) {
      wL = v;
      break;
    }
  }
  let wR = sorted[sorted.length - 1];
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    if (sorted[i] <= high) {
      wR = sorted[i];
      break;
    }
  }
  return { wL, wR };
}

function histogramCounts(sorted, k) {
  const n = sorted.length;
  if (n === 0 || k < 1) return { counts: [], lo: 0, hi: 1, binW: 1 };
  let lo = sorted[0];
  let hi = sorted[n - 1];
  if (lo === hi) {
    lo -= 0.5;
    hi += 0.5;
  }
  const binW = (hi - lo) / k;
  const counts = Array(k).fill(0);
  for (const v of sorted) {
    let i = Math.floor((v - lo) / binW);
    if (i >= k) i = k - 1;
    if (i < 0) i = 0;
    counts[i] += 1;
  }
  return { counts, lo, hi, binW };
}

export const StatsLabMod = (() => {
  const svg = $("#stats-svg");
  const refs = {
    hist: null,
    box: null,
    axisHist: null,
    axisBox: null,
  };

  const state = {
    raw: "",
    bins: 12,
  };

  const DEFAULT =
    "12, 18, 20, 22, 25, 28, 30, 32, 35, 38, 40, 42, 45, 48, 50, 52, 55, 58, 60, 62, 65, 68, 70, 72, 75";

  function xScale(lo, hi, v) {
    if (hi === lo) return padL + chartW / 2;
    return padL + ((v - lo) / (hi - lo)) * chartW;
  }

  function render() {
    const ta = $("#stats-data");
    if (ta) state.raw = ta.value;
    const binEl = $("#stats-bins");
    if (binEl) state.bins = clamp(Number(binEl.value) || 12, 5, 40);
    const binsVal = $("#stats-bins-val");
    if (binsVal) binsVal.textContent = String(state.bins);

    const data = parseData(state.raw);
    const sorted = [...data].sort((a, b) => a - b);

    if (sorted.length < 3) {
      $("#stats-fb").textContent =
        "En az 3 sayı girin (virgül, boşluk veya satır ile ayırın). Örnek veri düğmelerini kullanabilirsiniz.";
      $("#stats-fb").className = "feedback warn";
      $("#stats-mean").textContent = "—";
      $("#stats-median").textContent = "—";
      $("#stats-sd").textContent = "—";
      $("#stats-iqr").textContent = "—";
      $("#stats-n").textContent = String(sorted.length);
      clearDraw();
      return;
    }

    const m = mean(sorted);
    const sd = stdevPop(sorted);
    const q1 = quantileSorted(sorted, 0.25);
    const q2 = quantileSorted(sorted, 0.5);
    const q3 = quantileSorted(sorted, 0.75);
    const iqr = q3 - q1;
    const { wL, wR } = whiskers(sorted, q1, q3);

    $("#stats-mean").textContent = m.toFixed(2);
    $("#stats-median").textContent = q2.toFixed(2);
    $("#stats-sd").textContent = sd.toFixed(3);
    $("#stats-iqr").textContent = iqr.toFixed(2);
    $("#stats-n").textContent = String(sorted.length);

    $("#stats-fb").textContent =
      "Histogram: frekans dağılımı; kutu: Q1–Q3 ve medyan (turuncu çizgi). Bıyıklar 1.5×IQR içindeki en uç değerlerdir.";
    $("#stats-fb").className = "feedback";

    const lo = sorted[0];
    const hi = sorted[sorted.length - 1];
    const { counts, lo: hLo, binW } = histogramCounts(sorted, state.bins);
    const maxC = Math.max(1, ...counts);

    while (refs.hist.firstChild) refs.hist.removeChild(refs.hist.firstChild);
    const gap = 2;
    const bw = (chartW - gap * (state.bins - 1)) / state.bins;
    counts.forEach((c, i) => {
      const x0 = padL + i * (bw + gap);
      const barH = (c / maxC) * (histH - 8);
      const y0 = histBase - barH;
      const r = refs.hist.appendChild(
        svgEl("rect", {
          class: "stats-bar",
          x: x0,
          y: y0,
          width: Math.max(2, bw),
          height: Math.max(0, barH),
          rx: 3,
          fill: "rgba(99,102,241,0.55)",
          stroke: "rgba(79,70,229,0.9)",
          "stroke-width": 1,
        })
      );
      r.appendChild(
        svgEl("title", {})
      ).textContent = `Aralık ~ [${(hLo + i * binW).toFixed(2)}, ${(hLo + (i + 1) * binW).toFixed(2)}) · n=${c}`;
    });

    setAttrs(refs.axisHist, {
      x1: padL,
      y1: histBase,
      x2: padL + chartW,
      y2: histBase,
    });

    while (refs.box.firstChild) refs.box.removeChild(refs.box.firstChild);
    const y0 = boxY;
    const y1 = boxY + boxH;
    const xL = xScale(lo, hi, wL);
    const xQ1 = xScale(lo, hi, q1);
    const xQ2 = xScale(lo, hi, q2);
    const xQ3 = xScale(lo, hi, q3);
    const xR = xScale(lo, hi, wR);

    refs.box.appendChild(
      svgEl("line", {
        x1: xL,
        y1: (y0 + y1) / 2,
        x2: xQ1,
        y2: (y0 + y1) / 2,
        stroke: "#64748b",
        "stroke-width": 2,
        "stroke-linecap": "round",
      })
    );
    refs.box.appendChild(
      svgEl("line", {
        x1: xQ3,
        y1: (y0 + y1) / 2,
        x2: xR,
        y2: (y0 + y1) / 2,
        stroke: "#64748b",
        "stroke-width": 2,
        "stroke-linecap": "round",
      })
    );
    refs.box.appendChild(
      svgEl("rect", {
        x: Math.min(xQ1, xQ3),
        y: y0,
        width: Math.abs(xQ3 - xQ1),
        height: boxH,
        rx: 4,
        fill: "rgba(14,165,233,0.2)",
        stroke: "#0284c7",
        "stroke-width": 1.5,
      })
    );
    refs.box.appendChild(
      svgEl("line", {
        x1: xQ2,
        y1: y0,
        x2: xQ2,
        y2: y1,
        stroke: "#ea580c",
        "stroke-width": 2.5,
      })
    );
    [[xL, wL], [xQ1, q1], [xQ2, q2], [xQ3, q3], [xR, wR]].forEach(([x, val]) => {
      const t = refs.box.appendChild(
        svgEl("text", {
          x,
          y: y1 + 14,
          "text-anchor": "middle",
          "font-size": 9,
          fill: "#64748b",
        })
      );
      t.textContent = Number.isInteger(val) ? String(val) : val.toFixed(2);
    });

    setAttrs(refs.axisBox, {
      x1: padL,
      y1: y1 + 4,
      x2: padL + chartW,
      y2: y1 + 4,
    });
  }

  function clearDraw() {
    if (refs.hist) while (refs.hist.firstChild) refs.hist.removeChild(refs.hist.firstChild);
    if (refs.box) while (refs.box.firstChild) refs.box.removeChild(refs.box.firstChild);
  }

  function buildSVG() {
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    refs.axisHist = svg.appendChild(
      svgEl("line", {
        class: "axis",
        stroke: "#cbd5e1",
        "stroke-width": 1.5,
      })
    );
    refs.hist = svg.appendChild(svgEl("g", { class: "stats-hist-bars" }));
    refs.axisBox = svg.appendChild(
      svgEl("line", {
        class: "axis",
        stroke: "#cbd5e1",
        "stroke-width": 1.5,
      })
    );
    refs.box = svg.appendChild(svgEl("g", { class: "stats-box-plot" }));
    svg.appendChild(
      svgEl("text", {
        x: padL,
        y: 16,
        fill: "#64748b",
        "font-size": 11,
        "font-weight": 600,
      })
    ).textContent = "Histogram (nicel dağılım)";
    svg.appendChild(
      svgEl("text", {
        x: padL,
        y: boxY - 10,
        fill: "#64748b",
        "font-size": 11,
        "font-weight": 600,
      })
    ).textContent = "Kutu grafiği (aynı eksen ölçeği)";
    setAttrs(svg, { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMid meet" });
  }

  function setExample(text) {
    const ta = $("#stats-data");
    if (ta) {
      ta.value = text;
      state.raw = text;
    }
    render();
  }

  function init() {
    const ta = $("#stats-data");
    if (ta && !ta.value.trim()) ta.value = DEFAULT;
    state.raw = ta?.value ?? DEFAULT;

    buildSVG();
    $("#stats-apply")?.addEventListener("click", () => {
      const d = parseData($("#stats-data")?.value);
      if (d.length > 500) {
        toast("En fazla 500 değer; listeyi kısaltın.", "warn");
        return;
      }
      render();
    });
    $("#stats-data")?.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        $("#stats-apply")?.click();
      }
    });
    $("#stats-bins")?.addEventListener("input", () => render());
    $("#stats-ex-sym")?.addEventListener("click", () =>
      setExample(
        "48, 50, 52, 52, 53, 54, 54, 55, 55, 56, 56, 57, 57, 58, 58, 59, 59, 60, 60, 61, 61, 62, 62, 63, 63"
      )
    );
    $("#stats-ex-skew")?.addEventListener("click", () =>
      setExample(
        "2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 22, 28, 35, 48, 62, 85, 110, 140, 180, 240, 310"
      )
    );
    $("#stats-ex-rand")?.addEventListener("click", () => {
      const n = 40;
      const parts = [];
      for (let i = 0; i < n; i += 1) parts.push(Math.round(50 + Math.random() * 40 + (Math.random() ** 2) * 80));
      setExample(parts.join(", "));
      toast("Yeni rastgele örneklem üretildi.", "info");
    });
    render();
  }

  return { init };
})();
