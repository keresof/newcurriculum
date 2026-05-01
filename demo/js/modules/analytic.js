import { $, $$, svgEl, setAttrs } from "../core/dom.js";
import { randomInt, clamp } from "../core/math.js";
import { flashHighlight, prefersReducedMotion } from "../core/motion.js";
import { State, recordAttempt, renderModuleMini } from "../core/state.js";
import { toast } from "../core/ui.js";

export const AnalyticLineMod = (() => {
  const svg = $("#analytic-svg");
  const W = 720, H = 500;
  const padL = 40, padR = 40, padT = 30, padB = 40;
  const xMin = -10, xMax = 10, yMin = -10, yMax = 10;

  const toPx = (x, y) => ({
    x: padL + ((x - xMin) / (xMax - xMin)) * (W - padL - padR),
    y: (H - padB) - ((y - yMin) / (yMax - yMin)) * (H - padT - padB),
  });
  const toMath = (px, py) => ({
    x: Math.round(((px - padL) / (W - padL - padR)) * (xMax - xMin) + xMin),
    y: Math.round(((H - padB - py) / (H - padT - padB)) * (yMax - yMin) + yMin),
  });

  const A = { x: -4, y: 2 };
  const B = { x: 4, y: -2 };
  const refs = {};
  let dragging = null;

  function buildSVG() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // Grid
    for (let x = xMin; x <= xMax; x++) {
      const p = toPx(x, 0);
      svg.appendChild(svgEl("line", {
        class: x % 5 === 0 ? "grid-major" : "grid-minor",
        x1: p.x, y1: padT, x2: p.x, y2: H - padB,
      }));
    }
    for (let y = yMin; y <= yMax; y++) {
      const p = toPx(0, y);
      svg.appendChild(svgEl("line", {
        class: y % 5 === 0 ? "grid-major" : "grid-minor",
        x1: padL, y1: p.y, x2: W - padR, y2: p.y,
      }));
    }
    // Axes
    const o = toPx(0, 0);
    svg.appendChild(svgEl("line", { class: "axis", x1: padL, y1: o.y, x2: W - padR, y2: o.y }));
    svg.appendChild(svgEl("line", { class: "axis", x1: o.x, y1: padT, x2: o.x, y2: H - padB }));
    // Tick labels
    [-10, -5, 5, 10].forEach((v) => {
      const px = toPx(v, 0);
      const t = svg.appendChild(svgEl("text", {
        class: "tick-label", x: px.x, y: o.y + 14, "text-anchor": "middle",
      }));
      t.textContent = v;
      const py = toPx(0, v);
      const t2 = svg.appendChild(svgEl("text", {
        class: "tick-label", x: o.x + 6, y: py.y + 3,
      }));
      t2.textContent = v;
    });

    // Line AB
    refs.lineAB = svg.appendChild(svgEl("line", { class: "line-ab" }));
    // Midpoint marker (small cross)
    refs.midMark = svg.appendChild(svgEl("circle", {
      r: 4, fill: "#94a3b8", stroke: "#fff", "stroke-width": 2,
    }));
    // Dividing point P
    refs.pointP = svg.appendChild(svgEl("circle", { class: "point P", r: 9 }));
    // A and B (draggable)
    refs.pointA = svg.appendChild(svgEl("circle", { class: "point A", r: 10, "data-k": "A" }));
    refs.pointB = svg.appendChild(svgEl("circle", { class: "point B", r: 10, "data-k": "B" }));
    // Labels
    refs.lblA = svg.appendChild(svgEl("text", { fill: "#4338ca", "font-size": 14, "font-weight": 700 }));
    refs.lblB = svg.appendChild(svgEl("text", { fill: "#b45309", "font-size": 14, "font-weight": 700 }));
    refs.lblP = svg.appendChild(svgEl("text", { fill: "#065f46", "font-size": 13, "font-weight": 700 }));
    refs.lblM = svg.appendChild(svgEl("text", { fill: "#64748b", "font-size": 11 }));

    refs.pointA.addEventListener("pointerdown", onDragStart);
    refs.pointB.addEventListener("pointerdown", onDragStart);
  }

  function onDragStart(e) {
    e.preventDefault();
    const node = e.currentTarget;
    node.setPointerCapture?.(e.pointerId);
    dragging = node.dataset.k;
    node.addEventListener("pointermove", onDragMove);
    node.addEventListener("pointerup", onDragEnd);
    node.addEventListener("pointercancel", onDragEnd);
  }
  function onDragMove(e) {
    if (!dragging) return;
    const rect = svg.getBoundingClientRect();
    const ratio = W / rect.width;
    const px = (e.clientX - rect.left) * ratio;
    const py = (e.clientY - rect.top) * ratio;
    const m = toMath(px, py);
    m.x = clamp(m.x, xMin, xMax);
    m.y = clamp(m.y, yMin, yMax);
    if (dragging === "A") { A.x = m.x; A.y = m.y; }
    if (dragging === "B") { B.x = m.x; B.y = m.y; }
    render();
  }
  function onDragEnd(e) {
    const node = e.currentTarget;
    node.removeEventListener("pointermove", onDragMove);
    node.removeEventListener("pointerup", onDragEnd);
    node.removeEventListener("pointercancel", onDragEnd);
    node.releasePointerCapture?.(e.pointerId);
    dragging = null;
    flashHighlight($("#an-readout"));
    flashHighlight($("#an-eq"));
  }

  function render() {
    const pA = toPx(A.x, A.y);
    const pB = toPx(B.x, B.y);
    setAttrs(refs.lineAB, { x1: pA.x, y1: pA.y, x2: pB.x, y2: pB.y });
    setAttrs(refs.pointA, { cx: pA.x, cy: pA.y });
    setAttrs(refs.pointB, { cx: pB.x, cy: pB.y });

    // Doğruya dik normal vektör (SVG uzayında): A→B yönü (dx, dy), dik = (dy, -dx)
    // Normal ile label'ları noktadan dışarı iteliriz → çakışma riski düşer
    const dxPx = pB.x - pA.x, dyPx = pB.y - pA.y;
    const len = Math.hypot(dxPx, dyPx) || 1;
    const nx = -dyPx / len, ny = dxPx / len; // unit normal
    // A için negatif, B için pozitif yönde 18 px ofset
    setAttrs(refs.lblA, { x: pA.x - nx * 20, y: pA.y - ny * 20 + 4, "text-anchor": "middle" });
    setAttrs(refs.lblB, { x: pB.x + nx * 20, y: pB.y + ny * 20 + 4, "text-anchor": "middle" });
    refs.lblA.textContent = "A";
    refs.lblB.textContent = "B";

    // Midpoint
    const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    const pMid = toPx(mid.x, mid.y);
    setAttrs(refs.midMark, { cx: pMid.x, cy: pMid.y });
    setAttrs(refs.lblM, { x: pMid.x + nx * 14, y: pMid.y + ny * 14 + 4, "text-anchor": "middle" });
    refs.lblM.textContent = "M";

    // Distance
    const d = Math.hypot(B.x - A.x, B.y - A.y);

    // Slope + angle
    const dx = B.x - A.x, dy = B.y - A.y;
    let slopeStr, angleStr, eqStr;
    if (Math.abs(dx) < 1e-6) {
      slopeStr = "tanımsız";
      angleStr = "90°";
      eqStr = `x = ${A.x}`;
    } else {
      const m = dy / dx;
      slopeStr = m.toFixed(3);
      let ang = Math.atan(m) * 180 / Math.PI;
      if (ang < 0) ang += 180;
      angleStr = ang.toFixed(1) + "°";
      const b = A.y - m * A.x;
      const sign = b >= 0 ? "+" : "−";
      eqStr = `y = ${m.toFixed(2)}·x ${sign} ${Math.abs(b).toFixed(2)}`;
    }

    // Dividing point: P = (m·A + k·B) / (k + m), with m = 1 (normalized)
    // Ratio k: |AP|/|PB|
    const k = Number($("#an-ratio").value);
    const P = {
      x: (A.x + k * B.x) / (1 + k),
      y: (A.y + k * B.y) / (1 + k),
    };
    const pP = toPx(P.x, P.y);
    setAttrs(refs.pointP, { cx: pP.x, cy: pP.y });
    // P label'ını doğrunun dik yönünde 18 px ofset — A ve B label'larının karşı tarafında
    setAttrs(refs.lblP, { x: pP.x + nx * 18, y: pP.y + ny * 18 + 4, "text-anchor": "middle" });
    refs.lblP.textContent = "P";

    // Readout
    $("#an-a").textContent = `(${A.x}, ${A.y})`;
    $("#an-b").textContent = `(${B.x}, ${B.y})`;
    $("#an-d").textContent = d.toFixed(3);
    $("#an-mid").textContent = `(${mid.x.toFixed(1)}, ${mid.y.toFixed(1)})`;
    $("#an-slope").textContent = slopeStr;
    $("#an-angle").textContent = angleStr;
    $("#an-eq").textContent = eqStr;
    $("#an-div").textContent = `(${P.x.toFixed(2)}, ${P.y.toFixed(2)})`;
  }

  function onRatioSlider() {
    $("#an-ratio-num").value = Number($("#an-ratio").value).toFixed(1);
    render();
    flashHighlight($("#an-readout"));
  }
  function onRatioNum() {
    let v = Number($("#an-ratio-num").value);
    if (!Number.isFinite(v)) return;
    v = clamp(v, 0.1, 5);
    $("#an-ratio").value = v;
    render();
  }

  function init() {
    buildSVG();
    render();
    $("#an-ratio").addEventListener("input", onRatioSlider);
    $("#an-ratio-num").addEventListener("input", onRatioNum);
    $("#an-ratio-num").addEventListener("blur", onRatioNum);
    const cl = $("#an-checklist");
    if (cl) {
      cl.querySelectorAll("input[type=checkbox]").forEach((cb) => {
        cb.addEventListener("change", () => {
          const all = Array.from(cl.querySelectorAll("input[type=checkbox]")).every((x) => x.checked);
          if (all) toast("Analitik keşif listesi tamamlandı.", "ok");
        });
      });
    }
  }
  return { init };
})();
