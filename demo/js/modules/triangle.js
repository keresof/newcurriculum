import { $, $$, svgEl, setAttrs } from "../core/dom.js";
import { randomInt, clamp } from "../core/math.js";
import { flashHighlight, prefersReducedMotion } from "../core/motion.js";
import { State, recordAttempt, renderModuleMini } from "../core/state.js";
import { toast } from "../core/ui.js";

export const TriangleMod = (() => {
  const svg = $("#triangle-svg");
  const W = 720, H = 420;
  const verts = {
    A: { x: 360, y: 90, label: "A" },
    B: { x: 160, y: 340, label: "B" },
    C: { x: 560, y: 340, label: "C" },
  };
  const refs = {};
  let dragging = null;

  function buildSVG() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    refs.body = svg.appendChild(svgEl("polygon", { class: "body" }));
    refs.angleA = svg.appendChild(svgEl("path", { class: "angle-fill" }));
    refs.angleB = svg.appendChild(svgEl("path", { class: "angle-fill" }));
    refs.angleC = svg.appendChild(svgEl("path", { class: "angle-fill" }));
    refs.angleAtxt = svg.appendChild(svgEl("text", { fill: "#b45309", "font-weight": 700 }));
    refs.angleBtxt = svg.appendChild(svgEl("text", { fill: "#b45309", "font-weight": 700 }));
    refs.angleCtxt = svg.appendChild(svgEl("text", { fill: "#b45309", "font-weight": 700 }));
    ["A", "B", "C"].forEach((k) => {
      refs["v" + k] = svg.appendChild(svgEl("circle", {
        class: "vertex", r: 12, "data-k": k,
      }));
      refs["lbl" + k] = svg.appendChild(svgEl("text", {
        "text-anchor": "middle", "font-size": 14, fill: "#0f172a", "font-weight": 700,
      }));
      refs["v" + k].addEventListener("pointerdown", onDragStart);
    });
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
    verts[dragging].x = clamp(px, 30, W - 30);
    verts[dragging].y = clamp(py, 60, H - 30);
    render();
  }
  function onDragEnd(e) {
    const node = e.currentTarget;
    node.removeEventListener("pointermove", onDragMove);
    node.removeEventListener("pointerup", onDragEnd);
    node.removeEventListener("pointercancel", onDragEnd);
    node.releasePointerCapture?.(e.pointerId);
    dragging = null;
  }

  function angleAt(p, q, r) {
    // angle at p formed by p->q and p->r vectors
    const v1x = q.x - p.x, v1y = q.y - p.y;
    const v2x = r.x - p.x, v2y = r.y - p.y;
    const dot = v1x * v2x + v1y * v2y;
    const m1 = Math.hypot(v1x, v1y);
    const m2 = Math.hypot(v2x, v2y);
    const cos = clamp(dot / (m1 * m2), -1, 1);
    return Math.acos(cos) * 180 / Math.PI;
  }
  function arcAt(p, q, r, radius = 28) {
    const a1 = Math.atan2(q.y - p.y, q.x - p.x);
    const a2 = Math.atan2(r.y - p.y, r.x - p.x);
    let delta = a2 - a1;
    // normalize to [-PI, PI]
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    const sweep = delta > 0 ? 1 : 0;
    const x1 = p.x + radius * Math.cos(a1);
    const y1 = p.y + radius * Math.sin(a1);
    const x2 = p.x + radius * Math.cos(a2);
    const y2 = p.y + radius * Math.sin(a2);
    return `M ${p.x} ${p.y} L ${x1} ${y1} A ${radius} ${radius} 0 0 ${sweep} ${x2} ${y2} Z`;
  }

  function render() {
    const A = verts.A, B = verts.B, C = verts.C;
    refs.body.setAttribute("points", `${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`);
    const aDeg = angleAt(A, B, C);
    const bDeg = angleAt(B, A, C);
    const cDeg = angleAt(C, A, B);
    const sum = aDeg + bDeg + cDeg;

    refs.angleA.setAttribute("d", arcAt(A, B, C));
    refs.angleB.setAttribute("d", arcAt(B, A, C));
    refs.angleC.setAttribute("d", arcAt(C, A, B));

    // Place angle texts inside the angles
    placeAngleText(refs.angleAtxt, A, B, C, `${aDeg.toFixed(1)}°`);
    placeAngleText(refs.angleBtxt, B, A, C, `${bDeg.toFixed(1)}°`);
    placeAngleText(refs.angleCtxt, C, A, B, `${cDeg.toFixed(1)}°`);

    ["A", "B", "C"].forEach((k) => {
      const v = verts[k];
      setAttrs(refs["v" + k], { cx: v.x, cy: v.y });
      refs["lbl" + k].setAttribute("x", v.x);
      refs["lbl" + k].setAttribute("y", v.y - 18);
      refs["lbl" + k].textContent = k;
    });

    // Side lengths in pixels (display-friendly: divide by 30 to get "units")
    const la = Math.hypot(B.x - C.x, B.y - C.y) / 30;
    const lb = Math.hypot(A.x - C.x, A.y - C.y) / 30;
    const lc = Math.hypot(A.x - B.x, A.y - B.y) / 30;

    $("#tri-a").textContent = `${aDeg.toFixed(1)}°`;
    $("#tri-b").textContent = `${bDeg.toFixed(1)}°`;
    $("#tri-c").textContent = `${cDeg.toFixed(1)}°`;
    $("#tri-sum").textContent = `${sum.toFixed(1)}°`;
    $("#tri-la").textContent = la.toFixed(2);
    $("#tri-lb").textContent = lb.toFixed(2);
    $("#tri-lc").textContent = lc.toFixed(2);

    const valid = (la + lb > lc) && (la + lc > lb) && (lb + lc > la);
    $("#tri-ineq").textContent = valid ? "✓ sağlanıyor" : "✗ ihlal";
    $("#tri-ineq").style.color = valid ? "var(--ok)" : "var(--warn)";
    refs.body.classList.toggle("invalid", !valid);

    const fb = $("#triangle-fb");
    fb.innerHTML = `İç açılar toplamı: <b>${sum.toFixed(1)}°</b> (her zaman 180°). En uzun kenarın karşısındaki açı en büyüktür.`;
    fb.className = "feedback ok";
  }
  function placeAngleText(el, p, q, r, text) {
    const a1 = Math.atan2(q.y - p.y, q.x - p.x);
    const a2 = Math.atan2(r.y - p.y, r.x - p.x);
    let mid = (a1 + a2) / 2;
    if (Math.abs(a1 - a2) > Math.PI) mid += Math.PI;
    const d = 50;
    el.setAttribute("x", p.x + d * Math.cos(mid));
    el.setAttribute("y", p.y + d * Math.sin(mid) + 5);
    el.setAttribute("text-anchor", "middle");
    el.setAttribute("font-size", "12");
    el.textContent = text;
  }

  function reset() {
    // Gerçek eşkenar üçgen · taban BC, A üstte dengede.
    // Yükseklik = kenar·√3/2
    const baseY = 340;
    const half = 150;            // yarı taban
    const height = half * Math.sqrt(3); // tüm kenar = 2*half; yükseklik = 2·half·√3/2
    verts.A = { x: 360, y: baseY - height };   // ≈ (360, 80.2)
    verts.B = { x: 360 - half, y: baseY };     // (210, 340)
    verts.C = { x: 360 + half, y: baseY };     // (510, 340)
    render();
  }
  function rand() {
    verts.A = { x: randomInt(150, 570), y: randomInt(70, 200) };
    verts.B = { x: randomInt(60, 320), y: randomInt(220, 380) };
    verts.C = { x: randomInt(400, 660), y: randomInt(220, 380) };
    render();
  }
  function init() {
    buildSVG();
    $("#triangle-reset").addEventListener("click", reset);
    $("#triangle-rand").addEventListener("click", rand);
    render();
  }
  return { init };
})();
