import { $, svgEl, setAttrs } from "../core/dom.js";
import { clamp } from "../core/math.js";

const D2R = Math.PI / 180;
const ROOT = "\u221A"; // √

/** n = d² ise { outer, inner } kök sadeleştirmesi (inner karefree). */
function simplifySqrt(n) {
  let outer = 1;
  let rem = Math.max(0, Math.round(n));
  for (let p = 2; p * p <= rem; p += 1) {
    const pp = p * p;
    while (rem % pp === 0) {
      outer *= p;
      rem /= pp;
    }
  }
  return { outer, inner: rem };
}

/** Kenar uzunluğu tam kareye yakınsa Unicode kök gösterimi. */
function lengthToSqrtUnicode(a, tol = 0.015) {
  const n = Math.round(a * a);
  if (n <= 0) return a.toFixed(2);
  if (Math.abs(Math.sqrt(n) - a) > tol * Math.max(1, a)) return a.toFixed(2);
  const { outer, inner } = simplifySqrt(n);
  if (inner === 1) return String(outer);
  if (outer === 1) return `${ROOT}${inner}`;
  return `${outer}${ROOT}${inner}`;
}

/** KaTeX için a = ... kök ifadesi veya null. */
function lengthToSqrtLatex(a, tol = 0.015) {
  const n = Math.round(a * a);
  if (n <= 0) return null;
  if (Math.abs(Math.sqrt(n) - a) > tol * Math.max(1, a)) return null;
  const { outer, inner } = simplifySqrt(n);
  if (inner === 1) return String(outer);
  if (outer === 1) return `\\sqrt{${inner}}`;
  return `${outer}\\sqrt{${inner}}`;
}

/** A° tam sayıya yakınsa klasik cos kesirleri (LaTeX). */
function cosADegreeExactLatex(Adeg) {
  const k = Math.round(Adeg);
  const m = {
    30: "\\tfrac{\\sqrt{3}}{2}",
    45: "\\tfrac{\\sqrt{2}}{2}",
    60: "\\tfrac{1}{2}",
    90: "0",
    120: "-\\tfrac{1}{2}",
    135: "-\\tfrac{\\sqrt{2}}{2}",
    150: "-\\tfrac{\\sqrt{3}}{2}",
  };
  if (m[k] !== undefined && Math.abs(Adeg - k) < 0.55) return m[k];
  return null;
}

/** Derece → radyan (π kesri veya ≈ rad). */
function degToRadLatex(degFloat) {
  const z = Math.round(degFloat);
  const map = {
    30: "\\tfrac{\\pi}{6}",
    45: "\\tfrac{\\pi}{4}",
    60: "\\tfrac{\\pi}{3}",
    90: "\\tfrac{\\pi}{2}",
    120: "\\tfrac{2\\pi}{3}",
    135: "\\tfrac{3\\pi}{4}",
    150: "\\tfrac{5\\pi}{6}",
    180: "\\pi",
  };
  if (map[z] !== undefined && Math.abs(degFloat - z) < 0.45) return map[z];
  const r = (degFloat * Math.PI) / 180;
  return `\\approx ${r.toFixed(2)}\\ \\text{rad}`;
}

function safeKatex(el, tex, displayMode = false) {
  if (!el) return;
  if (typeof katex === "undefined") {
    el.textContent = tex.replace(/\\[a-zA-Z]+/g, "").replace(/[{}]/g, "");
    return;
  }
  try {
    el.innerHTML = katex.renderToString(tex, { displayMode, throwOnError: false });
  } catch {
    el.textContent = tex;
  }
}

function mid(P, Q) {
  return { x: (P.x + Q.x) / 2, y: (P.y + Q.y) / 2 };
}

/** Üç nokta arası açı (radyan), P köşede. */
function angleAt(P, Q, R) {
  const v1x = Q.x - P.x;
  const v1y = Q.y - P.y;
  const v2x = R.x - P.x;
  const v2y = R.y - P.y;
  const d = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (d < 1e-12) return 0;
  return Math.acos(clamp((v1x * v2x + v1y * v2y) / d, -1, 1));
}

function deg(r) {
  return (r * 180) / Math.PI;
}

/**
 * Köşe P’de Q–P–R iç açısı için yay: merkez P, yarıçap r (model birimi), içbükey centroid’e göre seçilir.
 * @returns {{ d: string, labelX: number, labelY: number, sweep: number } | null}
 */
function interiorAngleArc(P, Q, R, centroid, r) {
  const ux = Q.x - P.x;
  const uy = Q.y - P.y;
  const vx = R.x - P.x;
  const vy = R.y - P.y;
  const lu = Math.hypot(ux, uy);
  const lv = Math.hypot(vx, vy);
  if (lu < 1e-9 || lv < 1e-9) return null;
  const a1 = Math.atan2(uy / lu, ux / lu);
  const a2 = Math.atan2(vy / lv, vx / lv);
  let d = a2 - a1;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  const alt = d > 0 ? d - 2 * Math.PI : d + 2 * Math.PI;
  const gd = Math.atan2(centroid.y - P.y, centroid.x - P.x);
  function bisDir(del) {
    const m = a1 + del / 2;
    return { x: Math.cos(m), y: Math.sin(m) };
  }
  const gux = Math.cos(gd);
  const guy = Math.sin(gd);
  const b1 = bisDir(d);
  const b2 = bisDir(alt);
  const sweep = b1.x * gux + b1.y * guy >= b2.x * gux + b2.y * guy ? d : alt;
  const end = a1 + sweep;
  const x1 = P.x + r * Math.cos(a1);
  const y1 = P.y + r * Math.sin(a1);
  const x2 = P.x + r * Math.cos(end);
  const y2 = P.y + r * Math.sin(end);
  const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
  const sweepFlag = sweep > 0 ? 1 : 0;
  const arc = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${x2} ${y2}`;
  const sector = `M ${P.x} ${P.y} L ${arc.slice(1)} Z`;
  const midAng = a1 + sweep / 2;
  const labelR = r * 1.42;
  const labelX = P.x + labelR * Math.cos(midAng);
  const labelY = P.y + labelR * Math.sin(midAng);
  return { sector, arc, labelX, labelY };
}

function angleMarkRadius(P, Q, R) {
  const e1 = Math.hypot(Q.x - P.x, Q.y - P.y);
  const e2 = Math.hypot(R.x - P.x, R.y - P.y);
  const m = Math.min(e1, e2);
  return clamp(m * 0.2, 0.65, 3.2);
}

/** Çevrel çember merkezi (model düzlemi). Doğrusal üçgende null. */
function circumcenter(A, B, C) {
  const ax = A.x;
  const ay = A.y;
  const bx = B.x;
  const by = B.y;
  const cx = C.x;
  const cy = C.y;
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-9) return null;
  const a2 = ax * ax + ay * ay;
  const b2 = bx * bx + by * by;
  const c2 = cx * cx + cy * cy;
  return {
    x: (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d,
    y: (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d,
  };
}

/** C köşesinden doğru AB üzerine dik ayağı H (sonsuz doğru). */
function footCtoLineAB(A, B, C) {
  const vx = B.x - A.x;
  const vy = B.y - A.y;
  const vv = vx * vx + vy * vy;
  if (vv < 1e-14) return null;
  const t = ((C.x - A.x) * vx + (C.y - A.y) * vy) / vv;
  return { x: A.x + t * vx, y: A.y + t * vy, t };
}

export const TrigLawMod = (() => {
  const svg = $("#triglaw-svg");
  const W = 720;
  const H = 420;
  const refs = {};

  const state = { b: 8, c: 11, Adeg: 60 };
  let sinProofStep = 1;
  let sinLawProofStep = 1;
  let cosGeomStep = 1;
  let cosProofOpen = false;
  let cosProofTab = "num";
  let sinLawProofOpen = false;
  let sinAreaProofOpen = false;

  function readState() {
    state.b = clamp(Number($("#triglaw-b")?.value) || state.b, 2, 24);
    state.c = clamp(Number($("#triglaw-c")?.value) || state.c, 2, 24);
    state.Adeg = clamp(Number($("#triglaw-A")?.value) || state.Adeg, 10, 170);
    return state;
  }

  function syncForm() {
    $("#triglaw-b-v").textContent = String(state.b);
    $("#triglaw-c-v").textContent = String(state.c);
    $("#triglaw-A-v").textContent = `${state.Adeg}°`;
  }

  function computeGeom() {
    const Ar = state.Adeg * D2R;
    const A = { x: 0, y: 0 };
    const C = { x: state.b, y: 0 };
    const B = { x: state.c * Math.cos(Ar), y: -state.c * Math.sin(Ar) };
    const a = Math.hypot(B.x - C.x, B.y - C.y);
    const angA = angleAt(A, B, C);
    const angB = angleAt(B, A, C);
    const angC = angleAt(C, A, B);
    const Fb = { x: B.x, y: 0 };
    return { A, B, C, a, angA, angB, angC, Fb };
  }

  function isSinPanel() {
    return Boolean(document.querySelector("#mod-triglaw [data-inner-panel=\"sin-law\"]")?.classList.contains("active"));
  }

  function fitTransform(geom, sinMode, extraPoint) {
    const { A, B, C } = geom;
    let minX = Math.min(A.x, B.x, C.x);
    let maxX = Math.max(A.x, B.x, C.x);
    let minY = Math.min(A.y, B.y, C.y);
    let maxY = Math.max(A.y, B.y, C.y);
    if (extraPoint) {
      minX = Math.min(minX, extraPoint.x);
      maxX = Math.max(maxX, extraPoint.x);
      minY = Math.min(minY, extraPoint.y);
      maxY = Math.max(maxY, extraPoint.y);
    }
    if (sinMode) {
      const O = circumcenter(A, B, C);
      if (O) {
        const R = Math.hypot(A.x - O.x, A.y - O.y);
        minX = Math.min(minX, O.x - R);
        maxX = Math.max(maxX, O.x + R);
        minY = Math.min(minY, O.y - R);
        maxY = Math.max(maxY, O.y + R);
      }
    }
    const w = maxX - minX || 1;
    const h = maxY - minY || 1;
    const pad = 72;
    const innerW = W - 2 * pad;
    const innerH = H - 2 * pad;
    const sc = Math.min(innerW / w, innerH / h);
    const tx = pad + (innerW - w * sc) / 2 - minX * sc;
    const ty = pad + (innerH - h * sc) / 2 - minY * sc;
    return { tx, ty, s: sc };
  }

  function toScreen(tx, ty, s, P) {
    return { x: tx + P.x * s, y: ty + P.y * s };
  }

  function vertexLabelPos(tx, ty, s, P, cent, px) {
    const sp = toScreen(tx, ty, s, P);
    const sc = toScreen(tx, ty, s, cent);
    let dx = sp.x - sc.x;
    let dy = sp.y - sc.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    return { x: sp.x + dx * px, y: sp.y + dy * px };
  }

  function edgeLabelPos(tx, ty, s, P, Q, cent, px) {
    const sm = toScreen(tx, ty, s, mid(P, Q));
    const sc = toScreen(tx, ty, s, cent);
    let dx = sm.x - sc.x;
    let dy = sm.y - sc.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    return { x: sm.x + dx * px, y: sm.y + dy * px };
  }

  function renderAngleCardA(Adeg) {
    const elDeg = $("#triglaw-card-A-deg");
    if (elDeg) elDeg.textContent = `${Adeg}°`;
    safeKatex($("#triglaw-card-A-rad"), degToRadLatex(Adeg), false);
  }

  function renderKatexMain(b, c, Adeg, a, cosA) {
    const cosSlot = cosADegreeExactLatex(Adeg) ?? `\\cos(${Math.round(Adeg)}^\\circ)`;
    const body = [
      "\\begin{aligned}",
      "&a^2 = b^2 + c^2 - 2bc\\cos A \\\\[6px]",
      `&\\quad = ${b}^2 + ${c}^2 - 2\\cdot ${b}\\cdot ${c}\\cdot \\bigl(${cosSlot}\\bigr)`,
      "\\end{aligned}",
    ].join("");
    safeKatex($("#triglaw-katex"), body, true);

    const sqrtL = lengthToSqrtLatex(a);
    const aTex = sqrtL ? `a = ${sqrtL}` : `a \\approx ${a.toFixed(3)}`;
    safeKatex($("#triglaw-a-katex"), aTex, false);
    const note = $("#triglaw-a-note");
    if (note) {
      note.textContent = sqrtL
        ? `(ondalık ≈ ${a.toFixed(3)} birim)`
        : "(a² tam kare değilse kök sadeleşmez; yaklaşık değer üstte.)";
    }

    const cosL = cosADegreeExactLatex(Adeg);
    const cosTex = cosL
      ? `\\cos A = ${cosL} \\approx ${cosA.toFixed(4)}`
      : `\\cos A \\approx ${cosA.toFixed(4)}`;
    safeKatex($("#triglaw-cos-katex"), cosTex, false);
  }

  function renderCosSteps(b, c, Adeg, a, cosA) {
    safeKatex($("#triglaw-cos-s1"), "a^2 = b^2 + c^2 - 2bc\\cos A", false);
    const cosL = cosADegreeExactLatex(Adeg);
    const s2 = cosL
      ? `\\cos A = ${cosL} \\approx ${cosA.toFixed(6)}`
      : `\\cos A \\approx ${cosA.toFixed(6)}`;
    safeKatex($("#triglaw-cos-s2"), s2, false);
    const b2 = b * b;
    const c2 = c * c;
    const term = 2 * b * c * cosA;
    const a2 = b2 + c2 - term;
    safeKatex(
      $("#triglaw-cos-s3"),
      `${b}^2=${b2},\\quad ${c}^2=${c2},\\quad 2\\cdot${b}\\cdot${c}\\cdot\\cos A\\approx${term.toFixed(3)}`,
      false
    );
    safeKatex($("#triglaw-cos-s4"), `a^2 \\approx ${a2.toFixed(3)}`, false);
    const sqrtL = lengthToSqrtLatex(a);
    const s5 = sqrtL
      ? `a = ${sqrtL}\\quad(\\text{yaklaşık }${a.toFixed(4)})`
      : `a = \\sqrt{a^2} \\approx ${a.toFixed(4)}`;
    safeKatex($("#triglaw-cos-s5"), s5, false);
  }

  function renderSinAreaKatex(angA) {
    const num = 0.5 * state.b * state.c * Math.sin(angA);
    const body = [
      "\\begin{aligned}",
      "&\\Delta = \\tfrac{1}{2}bc\\sin A = \\tfrac{1}{2}ca\\sin B = \\tfrac{1}{2}ab\\sin C \\\\[4px]",
      `&\\Delta = \\tfrac{1}{2}\\cdot${state.b}\\cdot${state.c}\\cdot\\sin A \\approx ${num.toFixed(3)}`,
      "\\end{aligned}",
    ].join("");
    safeKatex($("#triglaw-sin-area-katex"), body, true);
  }

  const SIN_PROOF_TEX = [
    "|AB| = c\\text{ taban; }C\\text{’den }AB\\text{’ye dik: }CH=h,\\ \\angle CHB=90^\\circ.",
    "\\triangle ACH\\text{’te (veya komşu dik üçgende) } \\sin A = \\dfrac{h}{b}\\Rightarrow h=b\\sin A\\quad(|AC|=b).",
    "|AB|\\text{ üzerinde }|AH|+|HB|=c\\text{; yükseklik }h\\text{ ile alan }\\Delta=\\tfrac12 c\\,h.",
    "\\Rightarrow \\Delta = \\tfrac{1}{2}bc\\sin A\\ \\text{(aynı }\\Delta\\text{’nın üç eş yazılışı }\\tfrac12ca\\sin B\\text{ vb.).}",
    "\\dfrac{a}{\\sin A}=2R\\ \\Rightarrow\\ \\Delta=\\dfrac{abc}{4R}\\ \\text{(çevrel çember).}",
  ];

  const COS_GEOM_TEX = [
    "AC\\text{ doğrusunu }x\\text{-ekseni alalım: }A=(0,0),\\ C=(b,0).",
    "B\\text{’den }AC\\text{’ye dik inince ayak }F=(c\\cos A,\\ 0).\\ \\triangle ABF\\text{ dik: }|BF|=c\\sin A,\\ |AF|=c\\cos A.",
    "|FC| = |b - c\\cos A|\\ \\text{(}C\\text{’ye kalan yatay parça).}",
    "\\triangle BFC\\text{ dik (}\\angle BFC=90^\\circ\\text{): Pisagor } a^2 = |FC|^2 + |BF|^2.",
    "\\text{Kareleri açınca } a^2 = b^2 + c^2 - 2bc\\cos A\\ \\text{ elde edilir.}",
  ];

  const SIN_LAW_PROOF_TEX = [
    "\\text{Çevrel çember yarıçapı }R\\text{: } a=2R\\sin A,\\ b=2R\\sin B,\\ c=2R\\sin C.",
    "\\Rightarrow \\dfrac{a}{\\sin A} = \\dfrac{b}{\\sin B} = \\dfrac{c}{\\sin C} = 2R.",
    "\\text{Üç oran aynı }2R\\text{'ye eşittir; üstteki sayısal satır bunu doğrular.}",
    "\\text{Çok küçük açıda sinüs }\\approx 0\\text{ → oran taşar; sınırda tahta tartışması gerekir.}",
  ];

  function renderSinProofSteps() {
    if (!sinAreaProofOpen) return;
    const host = $("#triglaw-sin-area-steps");
    if (!host) return;
    host.innerHTML = "";
    for (let i = 0; i < SIN_PROOF_TEX.length; i += 1) {
      const row = document.createElement("div");
      row.className = `triglaw-sin-proof-line${i + 1 === sinProofStep ? " is-active" : ""}`;
      const badge = document.createElement("span");
      badge.className = "triglaw-sin-proof-badge mono";
      badge.textContent = String(i + 1);
      const k = document.createElement("div");
      k.className = "triglaw-sin-proof-k";
      row.appendChild(badge);
      row.appendChild(k);
      host.appendChild(row);
      safeKatex(k, SIN_PROOF_TEX[i], false);
    }
    const nEl = $("#triglaw-sin-p-n");
    if (nEl) nEl.textContent = `${sinProofStep} / ${SIN_PROOF_TEX.length}`;
  }

  function renderCosGeomSteps() {
    if (!cosProofOpen || cosProofTab !== "geom") return;
    const host = $("#triglaw-cos-geom-steps");
    if (!host) return;
    host.innerHTML = "";
    for (let i = 0; i < COS_GEOM_TEX.length; i += 1) {
      const row = document.createElement("div");
      row.className = `triglaw-cos-geom-line${i + 1 === cosGeomStep ? " is-active" : ""}`;
      const badge = document.createElement("span");
      badge.className = "triglaw-sin-proof-badge mono";
      badge.textContent = String(i + 1);
      const k = document.createElement("div");
      k.className = "triglaw-sin-proof-k";
      row.appendChild(badge);
      row.appendChild(k);
      host.appendChild(row);
      safeKatex(k, COS_GEOM_TEX[i], false);
    }
    const nEl = $("#triglaw-cos-geom-n");
    if (nEl) nEl.textContent = `${cosGeomStep} / ${COS_GEOM_TEX.length}`;
  }

  function renderSinLawProofSteps() {
    if (!sinLawProofOpen) return;
    const host = $("#triglaw-sin-law-steps");
    if (!host) return;
    host.innerHTML = "";
    for (let i = 0; i < SIN_LAW_PROOF_TEX.length; i += 1) {
      const row = document.createElement("div");
      row.className = `triglaw-sin-proof-line${i + 1 === sinLawProofStep ? " is-active" : ""}`;
      const badge = document.createElement("span");
      badge.className = "triglaw-sin-proof-badge mono";
      badge.textContent = String(i + 1);
      const k = document.createElement("div");
      k.className = "triglaw-sin-proof-k";
      row.appendChild(badge);
      row.appendChild(k);
      host.appendChild(row);
      safeKatex(k, SIN_LAW_PROOF_TEX[i], false);
    }
    const nEl = $("#triglaw-sin-law-p-n");
    if (nEl) nEl.textContent = `${sinLawProofStep} / ${SIN_LAW_PROOF_TEX.length}`;
  }

  function renderSinLaw(angA, angB, angC, a, k1, k2, k3, spread) {
    const body = [
      "\\begin{aligned}",
      "&\\dfrac{a}{\\sin A} = \\dfrac{b}{\\sin B} = \\dfrac{c}{\\sin C} = 2R",
      "\\end{aligned}",
    ].join("");
    safeKatex($("#triglaw-sin-katex"), body, true);
    const fmt = (r) => `${deg(r).toFixed(1)}°`;
    const set = (id, v) => {
      const el = $(id);
      if (el) el.textContent = v;
    };
    set("#triglaw-sin-angA", fmt(angA));
    set("#triglaw-sin-angB", fmt(angB));
    set("#triglaw-sin-angC", fmt(angC));
    set("#triglaw-sin-k1", Number.isFinite(k1) ? k1.toFixed(3) : "—");
    set("#triglaw-sin-k2", Number.isFinite(k2) ? k2.toFixed(3) : "—");
    set("#triglaw-sin-k3", Number.isFinite(k3) ? k3.toFixed(3) : "—");
    const twoRTex = Number.isFinite(k1) ? `2R \\approx ${k1.toFixed(3)}` : "2R";
    safeKatex($("#triglaw-sin-2r-katex"), twoRTex, false);
    renderSinAreaKatex(angA);
    if (sinAreaProofOpen) renderSinProofSteps();
    if (sinLawProofOpen) renderSinLawProofSteps();
    const fb = $("#triglaw-sin-fb");
    if (fb) {
      if (!Number.isFinite(k1) || !Number.isFinite(spread)) {
        fb.textContent = "Bir açının sinüsü çok küçükse oran tanımsızlaşabilir; kaydırıcıları biraz oynatın.";
        fb.className = "feedback";
      } else if (spread < 0.02) {
        fb.textContent = `Üç oran uyumlu (Δ < 0.02). 2R ≈ ${k1.toFixed(2)} birim.`;
        fb.className = "feedback ok";
      } else {
        fb.textContent = `Oranlar arası fark Δ ≈ ${spread.toFixed(3)} (yuvarlama etkisi).`;
        fb.className = "feedback";
      }
    }
  }

  function syncDrawerUI() {
    const mod = document.getElementById("mod-triglaw");
    const cosDr = $("#triglaw-cos-proof-drawer");
    const sinLawDr = $("#triglaw-sin-law-proof-drawer");
    const sinAreaDr = $("#triglaw-sin-area-proof-drawer");
    const cosTog = $("#triglaw-cos-proof-toggle");
    const sinLawTog = $("#triglaw-sin-law-proof-toggle");
    const sinAreaTog = $("#triglaw-sin-area-proof-toggle");
    if (cosDr) cosDr.hidden = !cosProofOpen;
    if (sinLawDr) sinLawDr.hidden = !sinLawProofOpen;
    if (sinAreaDr) sinAreaDr.hidden = !sinAreaProofOpen;
    cosTog?.setAttribute("aria-expanded", cosProofOpen ? "true" : "false");
    sinLawTog?.setAttribute("aria-expanded", sinLawProofOpen ? "true" : "false");
    sinAreaTog?.setAttribute("aria-expanded", sinAreaProofOpen ? "true" : "false");
    cosTog?.classList.toggle("is-open", cosProofOpen);
    sinLawTog?.classList.toggle("is-open", sinLawProofOpen);
    sinAreaTog?.classList.toggle("is-open", sinAreaProofOpen);
    mod?.querySelectorAll("[data-cos-proof]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.cosProof === cosProofTab);
    });
    mod?.querySelectorAll("[data-cos-proof-panel]").forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.cosProofPanel === cosProofTab);
    });
  }

  function render() {
    readState();
    syncForm();

    const g = computeGeom();
    const sinMode = isSinPanel();
    const showCosGeomViz = !sinMode && cosProofOpen && cosProofTab === "geom";
    const { tx, ty, s } = fitTransform(g, sinMode, showCosGeomViz ? g.Fb : null);
    const { A, B, C, a, angA, angB, angC, Fb } = g;

    setAttrs(refs.gGeom, { transform: `translate(${tx},${ty}) scale(${s})` });
    setAttrs(refs.poly, {
      points: `${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`,
    });

    const cent = { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 };
    const pxV = 18;
    const pxE = 12;

    const arcA = interiorAngleArc(A, B, C, cent, angleMarkRadius(A, B, C));
    if (sinMode) {
      setAttrs(refs.gAngles, { visibility: "hidden" });
      setAttrs(refs.angDegA, { visibility: "hidden" });
    } else {
      setAttrs(refs.gAngles, { visibility: "visible" });
      setAttrs(refs.angDegA, { visibility: "visible" });
      if (arcA) {
        setAttrs(refs.angleSectorA, { d: arcA.sector });
        setAttrs(refs.angleArcA, { d: arcA.arc });
      } else {
        setAttrs(refs.angleSectorA, { d: "" });
        setAttrs(refs.angleArcA, { d: "" });
      }
      if (arcA) {
        const p = toScreen(tx, ty, s, { x: arcA.labelX, y: arcA.labelY });
        setAttrs(refs.angDegA, { x: p.x, y: p.y });
        refs.angDegA.textContent = `${state.Adeg}°`;
      }
    }

    const pA = vertexLabelPos(tx, ty, s, A, cent, pxV);
    const pB = vertexLabelPos(tx, ty, s, B, cent, pxV);
    const pC = vertexLabelPos(tx, ty, s, C, cent, pxV);
    setAttrs(refs.tA, { x: pA.x, y: pA.y });
    setAttrs(refs.tB, { x: pB.x, y: pB.y });
    setAttrs(refs.tC, { x: pC.x, y: pC.y });

    const pa = edgeLabelPos(tx, ty, s, B, C, cent, pxE);
    const pb = edgeLabelPos(tx, ty, s, A, C, cent, pxE);
    const pc = edgeLabelPos(tx, ty, s, A, B, cent, pxE);
    setAttrs(refs.ta, { x: pa.x, y: pa.y });
    setAttrs(refs.tb, { x: pb.x, y: pb.y });
    setAttrs(refs.tc, { x: pc.x, y: pc.y });

    refs.ta.textContent = `a = ${lengthToSqrtUnicode(a)}`;
    refs.tb.textContent = `b = ${state.b}`;
    refs.tc.textContent = `c = ${state.c}`;

    const cap = $("#triglaw-stage-caption");
    if (cap) {
      if (showCosGeomViz) {
        cap.textContent =
          "Kosinüs (koordinat): B’den AC’ye dik → F; |AF|=c·cosA, |BF|=c·sinA, |FC|=|b−c·cosA|; △BFC’de Pisagor.";
      } else {
        cap.textContent = sinMode
          ? "Çevrel çember + C→AB dikmesi (CH). Merkez O, yarıçap R."
          : "SAS üçgen · L1’de yalnızca verilen ∠A vurgulanır.";
      }
    }

    const O = circumcenter(A, B, C);
    const foot = footCtoLineAB(A, B, C);
    const areaVizStep = sinAreaProofOpen ? sinProofStep : 5;
    const splitAbStep = sinAreaProofOpen ? sinProofStep : 0;
    const dimRays =
      (sinLawProofOpen && sinLawProofStep < 2) || (sinAreaProofOpen && sinProofStep < 2);

    if (sinMode && O) {
      const R = Math.hypot(A.x - O.x, A.y - O.y);
      setAttrs(refs.gCircum, { visibility: "visible" });
      setAttrs(refs.circumCircle, { cx: O.x, cy: O.y, r: R });
      setAttrs(refs.lineOA, { x1: O.x, y1: O.y, x2: A.x, y2: A.y });
      setAttrs(refs.lineOB, { x1: O.x, y1: O.y, x2: B.x, y2: B.y });
      setAttrs(refs.lineOC, { x1: O.x, y1: O.y, x2: C.x, y2: C.y });
      setAttrs(refs.dotO, { cx: O.x, cy: O.y });
      const rayOp = dimRays ? "0.38" : "0.88";
      [refs.lineOA, refs.lineOB, refs.lineOC].forEach((ln) => setAttrs(ln, { opacity: rayOp }));
      const pO = toScreen(tx, ty, s, O);
      setAttrs(refs.tO, { x: pO.x + 10, y: pO.y - 8, visibility: "visible" });
      refs.tO.textContent = "O";
      const midR = { x: (O.x + A.x) / 2, y: (O.y + A.y) / 2 };
      const pr = toScreen(tx, ty, s, midR);
      setAttrs(refs.tRlab, {
        x: pr.x + 6,
        y: pr.y - 4,
        visibility: areaVizStep >= 4 ? "visible" : "hidden",
      });
      refs.tRlab.textContent = "R";
    } else {
      setAttrs(refs.gCircum, { visibility: "hidden" });
      setAttrs(refs.tO, { visibility: "hidden" });
      setAttrs(refs.tRlab, { visibility: "hidden" });
    }

    if (sinMode && foot) {
      setAttrs(refs.gProof, { visibility: "visible" });
      const chOp = areaVizStep >= 2 ? "1" : areaVizStep >= 1 ? "0.35" : "0";
      setAttrs(refs.lineCH, {
        x1: C.x,
        y1: C.y,
        x2: foot.x,
        y2: foot.y,
        opacity: chOp,
      });
      const ux = B.x - A.x;
      const uy = B.y - A.y;
      const ulen = Math.hypot(ux, uy) || 1;
      const ex = ux / ulen;
      const ey = uy / ulen;
      const sx = C.x - foot.x;
      const sy = C.y - foot.y;
      const slen = Math.hypot(sx, sy) || 1;
      const gx = sx / slen;
      const gy = sy / slen;
      const sz = 0.22 * (areaVizStep >= 2 ? 1 : 0.01);
      const fx = foot.x;
      const fy = foot.y;
      const d =
        sz > 0.001
          ? `M ${fx + gx * sz} ${fy + gy * sz} L ${fx + gx * sz + ex * sz} ${fy + gy * sz + ey * sz} L ${fx + ex * sz} ${fy + ey * sz} Z`
          : "";
      setAttrs(refs.cornerH, { d, opacity: areaVizStep >= 2 ? "0.95" : "0" });
      const pH = toScreen(tx, ty, s, foot);
      const pCsc = toScreen(tx, ty, s, C);
      setAttrs(refs.tH, {
        x: (pH.x + pCsc.x) / 2 + 8,
        y: (pH.y + pCsc.y) / 2,
        visibility: areaVizStep >= 2 ? "visible" : "hidden",
      });
      refs.tH.textContent = "h";
      const ahOp = splitAbStep >= 3 ? "0.92" : "0";
      const hbOp = splitAbStep >= 3 ? "0.92" : "0";
      setAttrs(refs.segAH_ab, {
        x1: A.x,
        y1: A.y,
        x2: foot.x,
        y2: foot.y,
        opacity: ahOp,
      });
      setAttrs(refs.segHB_ab, {
        x1: foot.x,
        y1: foot.y,
        x2: B.x,
        y2: B.y,
        opacity: hbOp,
      });
      const lenAH = Math.hypot(foot.x - A.x, foot.y - A.y);
      const lenHB = Math.hypot(B.x - foot.x, B.y - foot.y);
      const pAH = toScreen(tx, ty, s, mid(A, foot));
      const pHB = toScreen(tx, ty, s, mid(foot, B));
      setAttrs(refs.tAHab, {
        x: pAH.x,
        y: pAH.y - 10,
        visibility: splitAbStep >= 4 ? "visible" : "hidden",
      });
      refs.tAHab.textContent = `AH≈${lenAH.toFixed(2)}`;
      setAttrs(refs.tBHub, {
        x: pHB.x,
        y: pHB.y - 10,
        visibility: splitAbStep >= 4 ? "visible" : "hidden",
      });
      refs.tBHub.textContent = `HB≈${lenHB.toFixed(2)}`;
    } else {
      setAttrs(refs.gProof, { visibility: "hidden" });
      setAttrs(refs.tH, { visibility: "hidden" });
      setAttrs(refs.segAH_ab, { opacity: "0" });
      setAttrs(refs.segHB_ab, { opacity: "0" });
      setAttrs(refs.tAHab, { visibility: "hidden" });
      setAttrs(refs.tBHub, { visibility: "hidden" });
    }

    if (showCosGeomViz) {
      setAttrs(refs.gProofCos, { visibility: "visible" });
      const st = cosGeomStep;
      const opAF = st >= 2 ? (st >= 5 ? "1" : "0.88") : "0";
      const opBF = st >= 2 ? (st >= 5 ? "1" : "0.9") : st >= 1 ? "0.12" : "0";
      const opFC = st >= 3 ? (st >= 5 ? "1" : "0.9") : "0";
      setAttrs(refs.segAF, { x1: A.x, y1: A.y, x2: Fb.x, y2: Fb.y, opacity: opAF });
      setAttrs(refs.segFC, { x1: Fb.x, y1: Fb.y, x2: C.x, y2: C.y, opacity: opFC });
      setAttrs(refs.lineBF, { x1: B.x, y1: B.y, x2: Fb.x, y2: Fb.y, opacity: opBF });
      const vx = B.x - Fb.x;
      const vy = B.y - Fb.y;
      const hx = C.x - Fb.x;
      const hy = C.y - Fb.y;
      const vlen = Math.hypot(vx, vy) || 1;
      const hlen = Math.hypot(hx, hy) || 1;
      const ex = vx / vlen;
      const ey = vy / vlen;
      const gx = hx / hlen;
      const gy = hy / hlen;
      const sz = 0.22 * (st >= 2 ? 1 : 0.01);
      const fx = Fb.x;
      const fy = Fb.y;
      const dF =
        sz > 0.001
          ? `M ${fx + gx * sz} ${fy + gy * sz} L ${fx + gx * sz + ex * sz} ${fy + gy * sz + ey * sz} L ${fx + ex * sz} ${fy + ey * sz} Z`
          : "";
      setAttrs(refs.cornerF, { d: dF, opacity: st >= 2 ? "0.95" : "0" });
      const rem = Math.abs(C.x - Fb.x);
      const pF = toScreen(tx, ty, s, Fb);
      const pBf = toScreen(tx, ty, s, mid(B, Fb));
      const pAf = toScreen(tx, ty, s, mid(A, Fb));
      const pFc = toScreen(tx, ty, s, mid(Fb, C));
      setAttrs(refs.tF, { x: pF.x, y: pF.y + 14, visibility: st >= 2 ? "visible" : "hidden" });
      refs.tF.textContent = "F";
      setAttrs(refs.tLegBF, {
        x: pBf.x + (B.x < Fb.x ? -12 : 10),
        y: pBf.y - 6,
        visibility: st >= 2 ? "visible" : "hidden",
      });
      refs.tLegBF.textContent = "c·sin A";
      setAttrs(refs.tAF, { x: pAf.x, y: pAf.y + 12, visibility: st >= 2 ? "visible" : "hidden" });
      refs.tAF.textContent = "c·cos A";
      setAttrs(refs.tFCrem, { x: pFc.x, y: pFc.y - 12, visibility: st >= 3 ? "visible" : "hidden" });
      refs.tFCrem.textContent = `|b−c·cosA|≈${rem.toFixed(2)}`;
      setAttrs(refs.segBC_cos, { x1: B.x, y1: B.y, x2: C.x, y2: C.y, opacity: st >= 4 ? "0.55" : "0" });
    } else {
      setAttrs(refs.gProofCos, { visibility: "hidden" });
      setAttrs(refs.segAF, { opacity: "0" });
      setAttrs(refs.segFC, { opacity: "0" });
      setAttrs(refs.lineBF, { opacity: "0" });
      setAttrs(refs.cornerF, { d: "", opacity: "0" });
      setAttrs(refs.segBC_cos, { opacity: "0" });
      setAttrs(refs.tF, { visibility: "hidden" });
      setAttrs(refs.tLegBF, { visibility: "hidden" });
      setAttrs(refs.tAF, { visibility: "hidden" });
      setAttrs(refs.tFCrem, { visibility: "hidden" });
    }

    renderAngleCardA(state.Adeg);

    const cosA = (state.b ** 2 + state.c ** 2 - a ** 2) / (2 * state.b * state.c);
    const cosAc = clamp(cosA, -1, 1);
    renderKatexMain(state.b, state.c, state.Adeg, a, cosAc);
    renderCosSteps(state.b, state.c, state.Adeg, a, cosAc);
    renderCosGeomSteps();

    const sA = Math.sin(angA);
    const sB = Math.sin(angB);
    const sC = Math.sin(angC);
    const k1 = sA > 1e-6 ? a / sA : NaN;
    const k2 = sB > 1e-6 ? state.b / sB : NaN;
    const k3 = sC > 1e-6 ? state.c / sC : NaN;
    const ratios = [k1, k2, k3].filter(Number.isFinite);
    const spread =
      ratios.length >= 2 ? Math.max(...ratios) - Math.min(...ratios) : NaN;
    renderSinLaw(angA, angB, angC, a, k1, k2, k3, spread);

    const fb = $("#triglaw-fb");
    if (fb) {
      fb.textContent = `Verilen ∠A = ${state.Adeg}°; kenar a ve cos A kosinüs bağıntısından gelir.`;
      fb.className = "feedback ok";
    }

    syncDrawerUI();
  }

  function buildSVG() {
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    setAttrs(svg, { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMid meet" });

    refs.gGeom = svg.appendChild(svgEl("g", { class: "triglaw-geom" }));

    refs.gCircum = refs.gGeom.appendChild(svgEl("g", { class: "triglaw-circum", visibility: "hidden" }));
    refs.circumCircle = refs.gCircum.appendChild(
      svgEl("circle", {
        class: "triglaw-circum-circle",
        fill: "none",
        stroke: "#64748b",
        "stroke-width": 1.35,
        "stroke-dasharray": "7 5",
        "vector-effect": "non-scaling-stroke",
      })
    );
    refs.lineOA = refs.gCircum.appendChild(
      svgEl("line", {
        class: "triglaw-ray",
        stroke: "#94a3b8",
        "stroke-width": 1.1,
        "vector-effect": "non-scaling-stroke",
      })
    );
    refs.lineOB = refs.gCircum.appendChild(
      svgEl("line", {
        class: "triglaw-ray",
        stroke: "#94a3b8",
        "stroke-width": 1.1,
        "vector-effect": "non-scaling-stroke",
      })
    );
    refs.lineOC = refs.gCircum.appendChild(
      svgEl("line", {
        class: "triglaw-ray",
        stroke: "#94a3b8",
        "stroke-width": 1.1,
        "vector-effect": "non-scaling-stroke",
      })
    );
    refs.dotO = refs.gCircum.appendChild(
      svgEl("circle", {
        class: "triglaw-dot-o",
        r: 0.16,
        fill: "#0f172a",
        stroke: "#f8fafc",
        "stroke-width": 0.05,
        "vector-effect": "non-scaling-stroke",
      })
    );

    refs.poly = refs.gGeom.appendChild(
      svgEl("polygon", {
        fill: "rgba(99,102,241,0.12)",
        stroke: "#4f46e5",
        "stroke-width": 2.5,
        "stroke-linejoin": "round",
        "vector-effect": "non-scaling-stroke",
      })
    );

    refs.gProofCos = refs.gGeom.appendChild(svgEl("g", { class: "triglaw-proof-cos", visibility: "hidden" }));
    refs.segAF = refs.gProofCos.appendChild(
      svgEl("line", {
        class: "triglaw-brace-af",
        stroke: "#6366f1",
        "stroke-width": 2.6,
        "stroke-linecap": "round",
        "vector-effect": "non-scaling-stroke",
        opacity: "0",
      })
    );
    refs.segFC = refs.gProofCos.appendChild(
      svgEl("line", {
        class: "triglaw-brace-fc",
        stroke: "#ea580c",
        "stroke-width": 2.6,
        "stroke-linecap": "round",
        "vector-effect": "non-scaling-stroke",
        opacity: "0",
      })
    );
    refs.lineBF = refs.gProofCos.appendChild(
      svgEl("line", {
        class: "triglaw-alt-bf",
        stroke: "#4338ca",
        "stroke-width": 2.2,
        "stroke-dasharray": "5 4",
        "vector-effect": "non-scaling-stroke",
        opacity: "0",
      })
    );
    refs.cornerF = refs.gProofCos.appendChild(
      svgEl("path", {
        class: "triglaw-right-f",
        fill: "none",
        stroke: "#4338ca",
        "stroke-width": 0.9,
        "vector-effect": "non-scaling-stroke",
        opacity: "0",
      })
    );
    refs.segBC_cos = refs.gProofCos.appendChild(
      svgEl("line", {
        class: "triglaw-hyp-bc",
        stroke: "#b45309",
        "stroke-width": 3.2,
        "stroke-linecap": "round",
        "vector-effect": "non-scaling-stroke",
        opacity: "0",
      })
    );

    refs.gAngles = refs.gGeom.appendChild(svgEl("g", { class: "triglaw-angle-marks" }));
    const sec = refs.gAngles.appendChild(
      svgEl("path", {
        class: "triglaw-angle-sector",
        "data-role": "sector-A",
      })
    );
    const arc = refs.gAngles.appendChild(
      svgEl("path", {
        class: "triglaw-angle-arc",
        fill: "none",
        "data-role": "arc-A",
      })
    );
    refs.angleSectorA = sec;
    refs.angleArcA = arc;

    refs.gProof = refs.gGeom.appendChild(svgEl("g", { class: "triglaw-proof-geom", visibility: "hidden" }));
    refs.lineCH = refs.gProof.appendChild(
      svgEl("line", {
        class: "triglaw-altitude",
        stroke: "#059669",
        "stroke-width": 2,
        "stroke-dasharray": "6 4",
        "vector-effect": "non-scaling-stroke",
      })
    );
    refs.cornerH = refs.gProof.appendChild(
      svgEl("path", {
        class: "triglaw-right-tick",
        fill: "none",
        stroke: "#059669",
        "stroke-width": 0.85,
        "vector-effect": "non-scaling-stroke",
      })
    );
    refs.segAH_ab = refs.gProof.appendChild(
      svgEl("line", {
        class: "triglaw-ab-split ah",
        stroke: "#f59e0b",
        "stroke-width": 2.8,
        "stroke-linecap": "round",
        opacity: "0",
        "vector-effect": "non-scaling-stroke",
      })
    );
    refs.segHB_ab = refs.gProof.appendChild(
      svgEl("line", {
        class: "triglaw-ab-split hb",
        stroke: "#0d9488",
        "stroke-width": 2.8,
        "stroke-linecap": "round",
        opacity: "0",
        "vector-effect": "non-scaling-stroke",
      })
    );

    refs.gLabels = svg.appendChild(svgEl("g", { class: "triglaw-labels" }));
    refs.tA = refs.gLabels.appendChild(
      svgEl("text", {
        fill: "#0f172a",
        "font-weight": 800,
        "font-size": 14,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
      })
    );
    refs.tB = refs.gLabels.appendChild(
      svgEl("text", {
        fill: "#0f172a",
        "font-weight": 800,
        "font-size": 14,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
      })
    );
    refs.tC = refs.gLabels.appendChild(
      svgEl("text", {
        fill: "#0f172a",
        "font-weight": 800,
        "font-size": 14,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
      })
    );
    refs.ta = refs.gLabels.appendChild(
      svgEl("text", {
        fill: "#4338ca",
        "font-size": 11,
        "font-weight": 700,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
      })
    );
    refs.tb = refs.gLabels.appendChild(
      svgEl("text", {
        fill: "#4338ca",
        "font-size": 11,
        "font-weight": 700,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
      })
    );
    refs.tc = refs.gLabels.appendChild(
      svgEl("text", {
        fill: "#4338ca",
        "font-size": 11,
        "font-weight": 700,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
      })
    );
    refs.angDegA = refs.gLabels.appendChild(
      svgEl("text", {
        class: "triglaw-angle-deg-label",
        "text-anchor": "middle",
        "dominant-baseline": "middle",
      })
    );
    refs.tO = refs.gLabels.appendChild(
      svgEl("text", {
        class: "triglaw-label-o",
        fill: "#334155",
        "font-size": 12,
        "font-weight": 800,
        "text-anchor": "start",
        "dominant-baseline": "middle",
        visibility: "hidden",
      })
    );
    refs.tRlab = refs.gLabels.appendChild(
      svgEl("text", {
        fill: "#64748b",
        "font-size": 11,
        "font-weight": 700,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        visibility: "hidden",
      })
    );
    refs.tH = refs.gLabels.appendChild(
      svgEl("text", {
        fill: "#047857",
        "font-size": 12,
        "font-weight": 800,
        "font-style": "italic",
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        visibility: "hidden",
      })
    );
    const mkProofLbl = (fill, anchor = "middle") =>
      refs.gLabels.appendChild(
        svgEl("text", {
          fill,
          "font-size": 10,
          "font-weight": 700,
          "text-anchor": anchor,
          "dominant-baseline": "middle",
          visibility: "hidden",
        })
      );
    refs.tF = mkProofLbl("#4338ca");
    refs.tLegBF = mkProofLbl("#312e81");
    refs.tAF = mkProofLbl("#4f46e5");
    refs.tFCrem = mkProofLbl("#9a3412");
    refs.tAHab = mkProofLbl("#b45309");
    refs.tBHub = mkProofLbl("#0f766e");
    refs.tA.textContent = "A";
    refs.tB.textContent = "B";
    refs.tC.textContent = "C";
  }

  function init() {
    buildSVG();
    ["#triglaw-b", "#triglaw-c", "#triglaw-A"].forEach((sel) => {
      $(sel)?.addEventListener("input", () => {
        sinProofStep = 1;
        sinLawProofStep = 1;
        cosGeomStep = 1;
        cosProofOpen = false;
        sinLawProofOpen = false;
        sinAreaProofOpen = false;
        render();
      });
    });

    $("#triglaw-cos-proof-toggle")?.addEventListener("click", () => {
      cosProofOpen = !cosProofOpen;
      render();
    });
    $("#triglaw-cos-proof-close")?.addEventListener("click", () => {
      cosProofOpen = false;
      render();
    });
    document.getElementById("mod-triglaw")?.querySelectorAll("[data-cos-proof]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const k = btn.dataset.cosProof;
        if (k === "num" || k === "geom") {
          cosProofTab = k;
          render();
        }
      });
    });
    $("#triglaw-cos-geom-prev")?.addEventListener("click", () => {
      cosGeomStep = Math.max(1, cosGeomStep - 1);
      render();
    });
    $("#triglaw-cos-geom-next")?.addEventListener("click", () => {
      cosGeomStep = Math.min(COS_GEOM_TEX.length, cosGeomStep + 1);
      render();
    });

    $("#triglaw-sin-law-proof-toggle")?.addEventListener("click", () => {
      sinLawProofOpen = !sinLawProofOpen;
      if (sinLawProofOpen) sinAreaProofOpen = false;
      render();
    });
    $("#triglaw-sin-law-proof-close")?.addEventListener("click", () => {
      sinLawProofOpen = false;
      render();
    });
    $("#triglaw-sin-law-p-prev")?.addEventListener("click", () => {
      sinLawProofStep = Math.max(1, sinLawProofStep - 1);
      render();
    });
    $("#triglaw-sin-law-p-next")?.addEventListener("click", () => {
      sinLawProofStep = Math.min(SIN_LAW_PROOF_TEX.length, sinLawProofStep + 1);
      render();
    });

    $("#triglaw-sin-area-proof-toggle")?.addEventListener("click", () => {
      sinAreaProofOpen = !sinAreaProofOpen;
      if (sinAreaProofOpen) sinLawProofOpen = false;
      render();
    });
    $("#triglaw-sin-area-proof-close")?.addEventListener("click", () => {
      sinAreaProofOpen = false;
      render();
    });
    $("#triglaw-sin-p-prev")?.addEventListener("click", () => {
      sinProofStep = Math.max(1, sinProofStep - 1);
      render();
    });
    $("#triglaw-sin-p-next")?.addEventListener("click", () => {
      sinProofStep = Math.min(SIN_PROOF_TEX.length, sinProofStep + 1);
      render();
    });

    document.getElementById("mod-triglaw")?.querySelectorAll(".inner-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        queueMicrotask(() => {
          cosProofOpen = false;
          sinLawProofOpen = false;
          sinAreaProofOpen = false;
          sinProofStep = 1;
          sinLawProofStep = 1;
          render();
        });
      });
    });
    syncForm();
    render();
  }

  return { init };
})();
