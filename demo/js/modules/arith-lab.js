import { $, svgEl, setAttrs } from "../core/dom.js";
import { clamp } from "../core/math.js";
import { toast } from "../core/ui.js";

/** Güvenli tam sayı çarpımı için üst sınır (her biri ≤ MAX_N ⇒ a×b ≤ MAX_SAFE_INTEGER). */
const MIN_N = 2;
const MAX_N = 9_000_000;
/** Logaritmik kaydırıcı çözünürlüğü (0…T → 2…MAX_N). */
const SLIDER_TICKS = 2000;

function valueFromSliderTick(tick) {
  const u = clamp(Number(tick), 0, SLIDER_TICKS) / SLIDER_TICKS;
  const lo = Math.log2(MIN_N);
  const hi = Math.log2(MAX_N);
  const raw = 2 ** (lo + u * (hi - lo));
  return Math.min(MAX_N, Math.max(MIN_N, Math.round(raw)));
}

function tickFromValue(v) {
  const lo = Math.log2(MIN_N);
  const hi = Math.log2(MAX_N);
  const x = Math.max(MIN_N, Math.min(MAX_N, Number(v)));
  const lv = Math.log2(x);
  const u = (lv - lo) / (hi - lo);
  return Math.round(clamp(u, 0, 1) * SLIDER_TICKS);
}

/** Asal çarpanlara ayırma: [{ p, e }, ...] artan p. */
function factorize(n) {
  const out = [];
  let x = n;
  for (let p = 2; p * p <= x; p += 1) {
    if (x % p !== 0) continue;
    let e = 0;
    while (x % p === 0) {
      x /= p;
      e += 1;
    }
    out.push({ p, e });
  }
  if (x > 1) out.push({ p: x, e: 1 });
  return out;
}

function gcdU(a, b) {
  let x = Math.abs(Math.floor(a));
  let y = Math.abs(Math.floor(b));
  if (x === 0) return y;
  if (y === 0) return x;
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

function lcmU(a, b) {
  const g = gcdU(a, b);
  if (g === 0) return 0;
  return (a / g) * b;
}

function expUnicode(e) {
  const sup = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  if (e >= 0 && e <= 9) return sup[e];
  return String(e);
}

function formatFactorization(facs) {
  if (!facs.length) return "1";
  const parts = facs.map(({ p, e }) => (e === 1 ? `${p}` : `${p}${expUnicode(e)}`));
  const joined = parts.join(" × ");
  if (joined.length > 140) return `${joined.slice(0, 137)}…`;
  return joined;
}

function primeHue(p) {
  return ((p * 47) % 360 + (p % 7) * 13) % 360;
}

function mergePrimeMap(fa, fb) {
  const map = new Map();
  for (const { p, e } of fa) map.set(p, { a: e, b: 0 });
  for (const { p, e } of fb) {
    const cur = map.get(p) || { a: 0, b: 0 };
    cur.b = e;
    map.set(p, cur);
  }
  return [...map.entries()].sort((u, v) => u[0] - v[0]);
}

/** Boşluk / alt çizgi / nokta temizle; yalnızca rakamlar. */
function parsePositiveInt(raw) {
  const s = String(raw ?? "")
    .trim()
    .replace(/[\s._]/g, "")
    .replace(/[^\d]/g, "");
  if (!s) return null;
  if (s.length > 15) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 1) return null;
  if (n > Number.MAX_SAFE_INTEGER) return null;
  return Math.floor(n);
}

export const ArithLabMod = (() => {
  const W = 720;
  const H = 310;
  const svg = $("#arith-svg");
  const refs = { gA: null, gB: null, gG: null, gL: null };

  const state = { a: 36, b: 48 };

  function syncFormFromState() {
    const ia = $("#arith-a-in");
    const ib = $("#arith-b-in");
    const sa = $("#arith-a-slide");
    const sb = $("#arith-b-slide");
    if (ia) ia.value = String(state.a);
    if (ib) ib.value = String(state.b);
    if (sa) sa.value = String(tickFromValue(state.a));
    if (sb) sb.value = String(tickFromValue(state.b));
  }

  /** true: geçerli ve güncellendi; false: eski state korundu. */
  function commitFromInputs(showErrors) {
    const pa = parsePositiveInt($("#arith-a-in")?.value);
    const pb = parsePositiveInt($("#arith-b-in")?.value);
    if (pa == null || pb == null) {
      if (showErrors) toast("a ve b için yalnızca doğal sayı (rakam) girin.", "warn");
      syncFormFromState();
      return false;
    }
    let a = pa;
    let b = pb;
    if (a < MIN_N || b < MIN_N) {
      if (showErrors) toast(`Her sayı en az ${MIN_N} olmalı.`, "warn");
      a = Math.max(MIN_N, a);
      b = Math.max(MIN_N, b);
    }
    let clamped = false;
    if (a > MAX_N) {
      a = MAX_N;
      clamped = true;
    }
    if (b > MAX_N) {
      b = MAX_N;
      clamped = true;
    }
    if (clamped && showErrors) {
      toast(`Üst sınır ${MAX_N.toLocaleString("tr-TR")} (tam sayı doğruluğu ve tarayıcı limiti).`, "warn");
    }
    const prod = a * b;
    if (!Number.isSafeInteger(prod)) {
      if (showErrors) toast("a×b çok büyük; sayıları küçültün.", "warn");
      syncFormFromState();
      return false;
    }
    state.a = a;
    state.b = b;
    syncFormFromState();
    return true;
  }

  /** Tek satır bant: her asal için genişlik ∝ e·ln(p+1) */
  function segmentWidths(facs) {
    const parts = facs.map(({ p, e }) => ({
      p,
      e,
      w: Math.max(8, e * (12 + Math.log(p + 1) * 6)),
    }));
    const sum = parts.reduce((s, x) => s + x.w, 0) || 1;
    const avail = W - 80;
    return parts.map((x) => ({ ...x, w: (x.w / sum) * avail }));
  }

  function drawBand(group, y, label, segments, opts = {}) {
    while (group.firstChild) group.removeChild(group.firstChild);
    const { dim = false } = opts;
    const gLab = group.appendChild(svgEl("text", {
      x: 8,
      y: y + 22,
      fill: "#64748b",
      "font-size": 12,
      "font-weight": 600,
    }));
    gLab.textContent = label;

    if (!segments.length) {
      group.appendChild(svgEl("text", {
        x: 72,
        y: y + 26,
        fill: "#94a3b8",
        "font-size": 12,
        "font-style": "italic",
      })).textContent = label.includes("EBOB")
        ? "— ortak asal çarpan yok (EBOB = 1) —"
        : "— —";
      return;
    }

    let x = 72;
    const barH = 28;
    segments.forEach(({ p, e, w }) => {
      const hue = primeHue(p);
      const fill = dim ? `hsla(${hue},48%,76%,0.55)` : `hsl(${hue},68%,48%)`;
      const stroke = dim ? `hsla(${hue},35%,55%,0.55)` : `hsl(${hue},75%,32%)`;
      const ry = y;
      group.appendChild(svgEl("rect", {
        x, y: ry, width: Math.max(4, w - 2), height: barH, rx: 4,
        fill, stroke, "stroke-width": 1.2,
      }));
      const t = group.appendChild(svgEl("text", {
        x: x + (w - 2) / 2,
        y: ry + barH / 2 + 4,
        "text-anchor": "middle",
        "font-size": 11,
        "font-weight": 700,
        fill: dim ? "#475569" : "#fff",
        "font-family": "JetBrains Mono, ui-monospace, monospace",
      }));
      t.textContent = e === 1 ? `${p}` : `${p}${expUnicode(e)}`;
      x += w;
    });
  }

  function render() {
    const a = state.a;
    const b = state.b;

    const fa = factorize(a);
    const fb = factorize(b);
    const g = gcdU(a, b);
    const l = lcmU(a, b);

    $("#arith-eq-a").textContent = `${a} = ${formatFactorization(fa)}`;
    $("#arith-eq-b").textContent = `${b} = ${formatFactorization(fb)}`;
    $("#arith-gcd").textContent = String(g);
    $("#arith-lcm").textContent = String(l);
    $("#arith-prod").textContent = String(a * b);
    $("#arith-check").textContent = String(g * l);

    const merged = mergePrimeMap(fa, fb);
    const segA = segmentWidths(fa);
    const segB = segmentWidths(fb);
    const gcdFacs = merged
      .map(([p, { a: ea, b: eb }]) => ({ p, e: Math.min(ea, eb) }))
      .filter((x) => x.e > 0);

    const segG = segmentWidths(gcdFacs);

    drawBand(refs.gA, 8, `a = ${a}`, segA);
    drawBand(refs.gB, 88, `b = ${b}`, segB);
    drawBand(refs.gG, 160, `EBOB = ${g}`, segG, { dim: false });

    const lcmFacs = factorize(l);
    const segL = segmentWidths(lcmFacs);
    drawBand(refs.gL, 232, `EKOK = ${l}`, segL, { dim: true });

    const fbEl = $("#arith-fb");
    if (fbEl) {
      if (g === 1 && a > 1 && b > 1) {
        fbEl.textContent = `${a} ve ${b} aralarında asaldır: ortak asal çarpan yok, EBOB = 1, EKOK = a×b = ${a * b}.`;
        fbEl.className = "feedback ok";
      } else {
        fbEl.textContent =
          `EBOB × EKOK = ${g} × ${l} = ${g * l} = a × b = ${a * b}. Ortak asal çarpanlar orta banttaki yükseklikle (üs min(e₁,e₂)) özetlenir.`;
        fbEl.className = "feedback";
      }
    }
  }

  function randomize() {
    state.a = valueFromSliderTick(Math.floor(Math.random() * (SLIDER_TICKS + 1)));
    state.b = valueFromSliderTick(Math.floor(Math.random() * (SLIDER_TICKS + 1)));
    if (state.a === state.b) {
      state.b = valueFromSliderTick((tickFromValue(state.a) + 127) % (SLIDER_TICKS + 1));
    }
    syncFormFromState();
    render();
    if (gcdU(state.a, state.b) === 1) toast("Bu çift aralarında asal — EKOK = çarpımları.", "ok");
  }

  function onSlide(which) {
    const slide = which === "a" ? $("#arith-a-slide") : $("#arith-b-slide");
    if (!slide) return;
    const v = valueFromSliderTick(slide.value);
    if (which === "a") state.a = v;
    else state.b = v;
    syncFormFromState();
    render();
  }

  function wireInput(el, commit) {
    if (!el) return;
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit(true);
      }
    });
    el.addEventListener("blur", () => commit(false));
  }

  function buildSVG() {
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const root = svg.appendChild(svgEl("g", { class: "arith-root" }));
    refs.gA = root.appendChild(svgEl("g", { class: "arith-band" }));
    refs.gB = root.appendChild(svgEl("g", { class: "arith-band" }));
    refs.gG = root.appendChild(svgEl("g", { class: "arith-band" }));
    refs.gL = root.appendChild(svgEl("g", { class: "arith-band" }));
    setAttrs(svg, { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMid meet" });
  }

  function init() {
    buildSVG();
    syncFormFromState();

    const tryCommit = (showErr) => {
      commitFromInputs(showErr);
      render();
    };

    wireInput($("#arith-a-in"), tryCommit);
    wireInput($("#arith-b-in"), tryCommit);

    $("#arith-a-slide")?.addEventListener("input", () => onSlide("a"));
    $("#arith-b-slide")?.addEventListener("input", () => onSlide("b"));

    $("#arith-apply")?.addEventListener("click", () => tryCommit(true));
    $("#arith-rand")?.addEventListener("click", randomize);
    render();
  }

  return { init };
})();
