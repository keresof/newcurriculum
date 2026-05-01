import { $, $$, svgEl, setAttrs } from "../core/dom.js";
import { randomInt, clamp } from "../core/math.js";
import { flashHighlight, prefersReducedMotion } from "../core/motion.js";
import { State, recordAttempt, renderModuleMini } from "../core/state.js";
import { toast } from "../core/ui.js";

export const TrigMod = (() => {
  const svg = $("#trig-svg");
  const W = 820, H = 480;
  // Left: unit circle (big)
  const cCX = 210, cCY = 220, cR = 170;
  // Right: 3 graphs stacked
  const gX0 = 450, gX1 = 800;                 // x range of graphs
  const gW = gX1 - gX0;
  const graphs = [
    { name: "sin", y: 60,  h: 110, color: "#10b981", yMin: -1.1, yMax: 1.1 },
    { name: "cos", y: 200, h: 110, color: "#6366f1", yMin: -1.1, yMax: 1.1 },
    { name: "tan", y: 340, h: 120, color: "#f59e0b", yMin: -3.5, yMax: 3.5 },
  ];

  const refs = {};
  let targetSin = 0.5;

  function buildSVG() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // ========== Unit circle (left) ==========
    const lblC = svg.appendChild(svgEl("text", {
      x: cCX, y: 30, "text-anchor": "middle", "font-weight": 700, "font-size": 14,
    }));
    lblC.textContent = "Birim Çember (yarıçap 1)";

    // Axes through origin
    svg.appendChild(svgEl("line", {
      x1: cCX - cR - 24, y1: cCY, x2: cCX + cR + 24, y2: cCY,
      stroke: "#cbd5e1", "stroke-width": 1,
    }));
    svg.appendChild(svgEl("line", {
      x1: cCX, y1: cCY - cR - 24, x2: cCX, y2: cCY + cR + 24,
      stroke: "#cbd5e1", "stroke-width": 1,
    }));
    // Axis labels
    ["1", "-1"].forEach((t, i) => {
      const tx = svg.appendChild(svgEl("text", {
        x: i === 0 ? cCX + cR + 12 : cCX - cR - 18,
        y: cCY - 6, "font-size": 11, fill: "#94a3b8",
      }));
      tx.textContent = t;
    });

    // Circle
    svg.appendChild(svgEl("circle", {
      cx: cCX, cy: cCY, r: cR, class: "unit-circle",
    }));

    // Quadrant labels (I, II, III, IV) — small
    [
      { x: cCX + cR - 16, y: cCY - cR + 18, t: "I" },
      { x: cCX - cR + 6,  y: cCY - cR + 18, t: "II" },
      { x: cCX - cR + 6,  y: cCY + cR - 6,  t: "III" },
      { x: cCX + cR - 22, y: cCY + cR - 6,  t: "IV" },
    ].forEach((q) => {
      const el = svg.appendChild(svgEl("text", {
        x: q.x, y: q.y, "font-size": 11, fill: "#cbd5e1", "font-weight": 700,
      }));
      el.textContent = q.t;
    });

    // Angle arc (filled) from 0 to θ
    refs.angleArc = svg.appendChild(svgEl("path", { class: "angle-fill" }));
    // Radius line
    refs.radius  = svg.appendChild(svgEl("line", { stroke: "#0f172a", "stroke-width": 2 }));
    // sin (vertical) and cos (horizontal) projections
    refs.cosProj = svg.appendChild(svgEl("line", { stroke: "#6366f1", "stroke-width": 4, "stroke-linecap": "round" }));
    refs.sinProj = svg.appendChild(svgEl("line", { stroke: "#10b981", "stroke-width": 4, "stroke-linecap": "round" }));
    // Labels for sin / cos inside the circle
    refs.cosLbl  = svg.appendChild(svgEl("text", { fill: "#4338ca", "font-weight": 700, "font-size": 12, "text-anchor": "middle" }));
    refs.sinLbl  = svg.appendChild(svgEl("text", { fill: "#047857", "font-weight": 700, "font-size": 12 }));
    // Angle label
    refs.angleLbl = svg.appendChild(svgEl("text", { fill: "#b45309", "font-weight": 700, "font-size": 12 }));
    // Point on circle (draggable)
    refs.point   = svg.appendChild(svgEl("circle", { class: "point", r: 10 }));

    refs.point.addEventListener("pointerdown", onCircleDragStart);

    // ========== Graphs (right side) ==========
    graphs.forEach((g, idx) => {
      const yBase = g.y + g.h; // bottom
      const yTop  = g.y;

      // Frame
      svg.appendChild(svgEl("rect", {
        x: gX0, y: yTop, width: gW, height: g.h,
        fill: "#fbfcff", stroke: "#e2e8f0", rx: 8,
      }));
      // Title
      const ttl = svg.appendChild(svgEl("text", {
        x: gX0 + 10, y: yTop + 16, "font-size": 12, "font-weight": 700, fill: "#0f172a",
      }));
      ttl.textContent = `y = ${g.name} θ`;

      // Zero axis
      const midY = yTop + g.h / 2;
      svg.appendChild(svgEl("line", {
        x1: gX0 + 30, y1: midY, x2: gX0 + gW - 10, y2: midY,
        stroke: "#cbd5e1", "stroke-width": 1,
      }));

      // Vertical axis
      svg.appendChild(svgEl("line", {
        x1: gX0 + 30, y1: yTop + 6, x2: gX0 + 30, y2: yBase - 6,
        stroke: "#cbd5e1", "stroke-width": 1,
      }));

      // x-axis ticks (0, 90, 180, 270, 360)
      [0, 90, 180, 270, 360].forEach((deg) => {
        const tx = gX0 + 30 + (deg / 360) * (gW - 40);
        svg.appendChild(svgEl("line", {
          x1: tx, y1: midY - 3, x2: tx, y2: midY + 3, stroke: "#94a3b8",
        }));
        if (idx === 2) { // only label bottom graph to save space
          const lbl = svg.appendChild(svgEl("text", {
            x: tx, y: yBase + 14, "text-anchor": "middle", "font-size": 10, fill: "#94a3b8",
          }));
          lbl.textContent = `${deg}°`;
        }
      });

      // Curve
      const pts = [];
      const n = 240;
      for (let i = 0; i <= n; i++) {
        const deg = (i / n) * 360;
        const rad = deg * Math.PI / 180;
        let v;
        if (g.name === "sin") v = Math.sin(rad);
        if (g.name === "cos") v = Math.cos(rad);
        if (g.name === "tan") v = Math.tan(rad);
        if (!Number.isFinite(v) || v < g.yMin || v > g.yMax) {
          pts.push(null);
          continue;
        }
        const px = gX0 + 30 + (deg / 360) * (gW - 40);
        const py = yTop + ((g.yMax - v) / (g.yMax - g.yMin)) * g.h;
        pts.push({ x: px, y: py });
      }
      // Build path with breaks (for tan asymptotes)
      let d = "";
      let started = false;
      pts.forEach((p) => {
        if (!p) { started = false; return; }
        if (!started) { d += `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} `; started = true; }
        else { d += `L ${p.x.toFixed(1)} ${p.y.toFixed(1)} `; }
      });
      svg.appendChild(svgEl("path", {
        d, fill: "none", stroke: g.color, "stroke-width": 2.5,
      }));

      // Asymptotes for tan (90°, 270°)
      if (g.name === "tan") {
        [90, 270].forEach((deg) => {
          const ax = gX0 + 30 + (deg / 360) * (gW - 40);
          svg.appendChild(svgEl("line", {
            x1: ax, y1: yTop + 4, x2: ax, y2: yBase - 4,
            stroke: g.color, "stroke-dasharray": "4 3", opacity: 0.5,
          }));
        });
      }

      // Moving cursor (vertical line) + dot
      refs["cursor_" + g.name] = svg.appendChild(svgEl("line", {
        y1: yTop + 4, y2: yBase - 4, stroke: "#0f172a", "stroke-width": 1.5, "stroke-dasharray": "3 3",
      }));
      refs["dot_" + g.name] = svg.appendChild(svgEl("circle", {
        r: 5, fill: g.color, stroke: "#fff", "stroke-width": 2,
      }));
      refs["val_" + g.name] = svg.appendChild(svgEl("text", {
        "font-size": 11, "font-weight": 700, fill: g.color,
      }));
    });
  }

  function onCircleDragStart(e) {
    e.preventDefault();
    const node = e.currentTarget;
    node.setPointerCapture?.(e.pointerId);
    node.addEventListener("pointermove", onCircleDragMove);
    node.addEventListener("pointerup", onCircleDragEnd);
    node.addEventListener("pointercancel", onCircleDragEnd);
  }
  function onCircleDragMove(e) {
    const rect = svg.getBoundingClientRect();
    const ratio = W / rect.width;
    const px = (e.clientX - rect.left) * ratio;
    const py = (e.clientY - rect.top) * ratio;
    const dx = px - cCX;
    const dy = cCY - py; // SVG y is inverted
    let theta = Math.atan2(dy, dx) * 180 / Math.PI;
    if (theta < 0) theta += 360;
    theta = clamp(Math.round(theta), 0, 360);
    $("#trig-angle").value = theta;
    updateAll(false);
  }
  function onCircleDragEnd(e) {
    const node = e.currentTarget;
    node.removeEventListener("pointermove", onCircleDragMove);
    node.removeEventListener("pointerup", onCircleDragEnd);
    node.removeEventListener("pointercancel", onCircleDragEnd);
    node.releasePointerCapture?.(e.pointerId);
  }

  function quadrantOf(deg) {
    const d = ((deg % 360) + 360) % 360;
    if (d >= 0   && d < 90)  return "I";
    if (d >= 90  && d < 180) return "II";
    if (d >= 180 && d < 270) return "III";
    return "IV";
  }
  function referenceOf(deg) {
    const d = ((deg % 360) + 360) % 360;
    if (d <= 90)  return d;
    if (d <= 180) return 180 - d;
    if (d <= 270) return d - 180;
    return 360 - d;
  }
  function radianFmt(deg) {
    // Show pretty π fractions for common angles
    const common = {
      0: "0", 30: "π/6", 45: "π/4", 60: "π/3", 90: "π/2",
      120: "2π/3", 135: "3π/4", 150: "5π/6", 180: "π",
      210: "7π/6", 225: "5π/4", 240: "4π/3", 270: "3π/2",
      300: "5π/3", 315: "7π/4", 330: "11π/6", 360: "2π",
    };
    return common[deg] ?? (deg * Math.PI / 180).toFixed(2);
  }

  function render(angleDeg) {
    const rad = angleDeg * Math.PI / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    const t = Math.tan(rad);
    const tBlowup = Math.abs(Math.cos(rad)) < 1e-3;

    // Circle point
    const ux = cCX + cR * c;
    const uy = cCY - cR * s;
    setAttrs(refs.point, { cx: ux, cy: uy });

    // Radius from origin to point
    setAttrs(refs.radius, { x1: cCX, y1: cCY, x2: ux, y2: uy });

    // cos projection: horizontal from (cCX, cCY) to (ux, cCY)
    setAttrs(refs.cosProj, { x1: cCX, y1: cCY, x2: ux, y2: cCY });
    // sin projection: vertical from (ux, cCY) to (ux, uy)
    setAttrs(refs.sinProj, { x1: ux, y1: cCY, x2: ux, y2: uy });

    // Angle arc path (start at (cCX+16, cCY) and sweep to angleDeg)
    const arcR = 22;
    const a0x = cCX + arcR;
    const a0y = cCY;
    const a1x = cCX + arcR * Math.cos(rad);
    const a1y = cCY - arcR * Math.sin(rad);
    const largeArc = angleDeg > 180 ? 1 : 0;
    const sweepFlag = 0; // SVG y-axis inverted → sweep=0 goes counter-clockwise visually (i.e., mathematical positive)
    refs.angleArc.setAttribute(
      "d",
      `M ${cCX} ${cCY} L ${a0x} ${a0y} A ${arcR} ${arcR} 0 ${largeArc} ${sweepFlag} ${a1x} ${a1y} Z`
    );

    // cos label (on cos projection)
    setAttrs(refs.cosLbl, {
      x: (cCX + ux) / 2,
      y: cCY + (s >= 0 ? 18 : -6),
    });
    refs.cosLbl.textContent = `cos=${c.toFixed(2)}`;

    // sin label (on sin projection)
    setAttrs(refs.sinLbl, {
      x: ux + (c >= 0 ? 8 : -62),
      y: (cCY + uy) / 2 + 4,
    });
    refs.sinLbl.textContent = `sin=${s.toFixed(2)}`;

    // Angle label near arc
    setAttrs(refs.angleLbl, {
      x: cCX + (arcR + 8) * Math.cos(rad / 2),
      y: cCY - (arcR + 8) * Math.sin(rad / 2) + 4,
    });
    refs.angleLbl.textContent = `θ=${angleDeg}°`;

    // Update graph cursors
    graphs.forEach((g) => {
      const yTop = g.y;
      const cx = gX0 + 30 + (angleDeg / 360) * (gW - 40);
      let v = g.name === "sin" ? s : g.name === "cos" ? c : t;
      let dotVisible = true;
      if (g.name === "tan" && (!Number.isFinite(v) || v < g.yMin || v > g.yMax)) {
        dotVisible = false;
      }
      setAttrs(refs["cursor_" + g.name], { x1: cx, x2: cx });

      if (dotVisible) {
        const py = yTop + ((g.yMax - v) / (g.yMax - g.yMin)) * g.h;
        setAttrs(refs["dot_" + g.name], { cx, cy: py, r: 5, fill: g.color });
        setAttrs(refs["val_" + g.name], { x: cx + 8, y: Math.max(yTop + 14, py - 6) });
        refs["val_" + g.name].textContent = v.toFixed(2);
      } else {
        setAttrs(refs["dot_" + g.name], { r: 0 });
        refs["val_" + g.name].textContent = "∞";
        setAttrs(refs["val_" + g.name], { x: cx + 8, y: yTop + 16 });
      }
    });

    // Readouts
    $("#trig-sin").textContent = s.toFixed(3);
    $("#trig-cos").textContent = c.toFixed(3);
    $("#trig-tan").textContent = tBlowup ? "∞" : t.toFixed(3);
    $("#trig-cot").textContent = Math.abs(s) < 1e-3 ? "∞" : (c / s).toFixed(3);
    $("#trig-pyt").textContent = (s * s + c * c).toFixed(3);
    $("#trig-angle-v").textContent = `${angleDeg}°`;
    $("#trig-quad").textContent = quadrantOf(angleDeg);
    $("#trig-rad").textContent = radianFmt(angleDeg);
    $("#trig-ref").textContent = `${referenceOf(angleDeg)}°`;
  }

  function updateAll(linkFlash) {
    const a = Number($("#trig-angle").value);
    render(a);
    if (linkFlash) flashHighlight($("#trig-readout"));
  }

  // Target: rastgele bir trigonometrik koşul (sin, cos veya kadran).
  let task = null; // { kind: "sin"|"cos"|"quad", value, label }
  function newTask() {
    const kind = ["sin", "cos", "quad"][randomInt(0, 2)];
    if (kind === "sin") {
      const v = Math.round((Math.random() * 2 - 1) * 100) / 100; // -1..1
      task = { kind, value: v, label: `sin θ ≈ ${v.toFixed(2)}` };
    } else if (kind === "cos") {
      const v = Math.round((Math.random() * 2 - 1) * 100) / 100;
      task = { kind, value: v, label: `cos θ ≈ ${v.toFixed(2)}` };
    } else {
      const q = ["II", "III", "IV"][randomInt(0, 2)]; // I kadranı kolay, atla
      task = { kind, value: q, label: `θ ${q}. kadranda olsun` };
    }
    State.byModule.trig.task = (State.byModule.trig.task || 0) + 1;
    $("#trig-target").innerHTML = `Hedef: <b>${task.label}</b>. Birim çemberde noktayı sürükle veya kaydırıcıyı kullan.`;
    $("#trig-fb").textContent = "";
    $("#trig-fb").className = "feedback";
    renderModuleMini("trig");
  }
  function check() {
    if (!task) return;
    const a = Number($("#trig-angle").value);
    const s = Math.sin(a * Math.PI / 180);
    const c = Math.cos(a * Math.PI / 180);
    const fb = $("#trig-fb");
    let ok = false, note = "";
    if (task.kind === "sin") {
      const d = Math.abs(s - task.value);
      ok = d <= 0.03;
      note = `sin ${a}° = ${s.toFixed(3)} (fark ${d.toFixed(3)})`;
    } else if (task.kind === "cos") {
      const d = Math.abs(c - task.value);
      ok = d <= 0.03;
      note = `cos ${a}° = ${c.toFixed(3)} (fark ${d.toFixed(3)})`;
    } else {
      const q = quadrantOf(a);
      ok = q === task.value;
      note = `θ = ${a}° → ${q}. kadran`;
    }
    if (ok) {
      fb.innerHTML = `<b>Mükemmel!</b> ${note}. +12 puan`;
      fb.className = "feedback ok";
      toast(`${note} · +12`, "ok");
      recordAttempt("trig", true, 12);
      setTimeout(newTask, 800);
    } else {
      let hint = "";
      if (task.kind === "sin") {
        const ref = referenceOf(a);
        hint = ` İpucu: sin(θ)=sin(180°−θ); referans açı ≈ ${ref}° — tamamlayıcı açılara bak.`;
      } else if (task.kind === "cos") {
        hint = " İpucu: cos θ = cos(−θ); yatay eksene göre simetri ve kadran işaretini kontrol et.";
      } else {
        hint = " İpucu: Kadran aralıklarını 0–90, 90–180, 180–270, 270–360 ile eşleştir.";
      }
      fb.textContent = note + hint;
      fb.className = "feedback warn";
      recordAttempt("trig", false);
    }
  }
  function hint() {
    if (!task) return;
    let deg;
    if (task.kind === "sin") {
      // Primary solution in [-90, 90] and supplementary in [90, 270]
      const a1 = Math.asin(clamp(task.value, -1, 1)) * 180 / Math.PI;
      deg = a1 < 0 ? Math.round(a1 + 360) : Math.round(a1);
      toast(`İpucu: θ ≈ ${deg}° ya da ${(180 - deg + 360) % 360}°`);
    } else if (task.kind === "cos") {
      const a1 = Math.acos(clamp(task.value, -1, 1)) * 180 / Math.PI;
      deg = Math.round(a1);
      toast(`İpucu: θ ≈ ${deg}° ya da ${360 - deg}°`);
    } else {
      const ranges = { I: "0-90", II: "90-180", III: "180-270", IV: "270-360" };
      toast(`İpucu: θ aralığı ${ranges[task.value]}°`);
    }
  }

  function init() {
    buildSVG();
    $("#trig-angle").addEventListener("input", () => updateAll(true));
    $("#trig-check").addEventListener("click", check);
    $("#trig-new").addEventListener("click", newTask);
    $("#trig-hint").addEventListener("click", hint);
    newTask();
    updateAll(true);
  }
  return { init };
})();
