import { $, $$, svgEl, setAttrs } from "../core/dom.js";
import { randomInt, clamp } from "../core/math.js";
import { flashHighlight, prefersReducedMotion } from "../core/motion.js";
import { State, recordAttempt, renderModuleMini } from "../core/state.js";
import { toast } from "../core/ui.js";

export const FunctionMod = (() => {
  const canvas = $("#graph");
  const ctx = canvas.getContext("2d");
  const xMin = -10, xMax = 10, yMin = -10, yMax = 10;

  let target = null;
  let anim = { a: 1, b: 0 };
  let lastSize = { w: 0, h: 0 };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (w === lastSize.w && h === lastSize.h) return;
    lastSize = { w, h };
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function toPx(x, y) {
    const w = lastSize.w, h = lastSize.h;
    return {
      px: ((x - xMin) / (xMax - xMin)) * w,
      py: h - ((y - yMin) / (yMax - yMin)) * h,
    };
  }

  function drawGrid() {
    const w = lastSize.w, h = lastSize.h;
    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#fbfcff");
    grad.addColorStop(1, "#f1f4fb");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.lineWidth = 1;
    for (let x = xMin; x <= xMax; x += 1) {
      const { px } = toPx(x, 0);
      ctx.strokeStyle = x % 5 === 0 ? "#cbd5e1" : "#e5e9f3";
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke();
    }
    for (let y = yMin; y <= yMax; y += 1) {
      const { py } = toPx(0, y);
      ctx.strokeStyle = y % 5 === 0 ? "#cbd5e1" : "#e5e9f3";
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke();
    }
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.5;
    const ax = toPx(0, 0);
    ctx.beginPath(); ctx.moveTo(0, ax.py); ctx.lineTo(w, ax.py); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax.px, 0); ctx.lineTo(ax.px, h); ctx.stroke();
    ctx.fillStyle = "#64748b";
    ctx.font = "11px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    for (let x = xMin; x <= xMax; x += 5) {
      if (x === 0) continue;
      const { px, py } = toPx(x, 0);
      ctx.fillText(String(x), px, py + 14);
    }
    ctx.textAlign = "left";
    for (let y = yMin; y <= yMax; y += 5) {
      if (y === 0) continue;
      const { px, py } = toPx(0, y);
      ctx.fillText(String(y), px + 6, py + 3);
    }
  }
  function drawTarget() {
    if (!target) return;
    const t = Date.now() / 400;
    const pulseR = prefersReducedMotion() ? 8 : 8 + Math.sin(t) * 2;
    [[target.x1, target.y1], [target.x2, target.y2]].forEach(([x, y]) => {
      const { px, py } = toPx(x, y);
      ctx.beginPath(); ctx.arc(px, py, pulseR + 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(245,158,11,0.18)"; ctx.fill();
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#f59e0b"; ctx.fill();
      ctx.fillStyle = "#0f172a";
      ctx.font = "600 11px Inter, system-ui";
      ctx.textAlign = "left";
      ctx.fillText(`(${x}, ${y})`, px + 10, py - 8);
    });
  }
  function drawLine() {
    const p1 = toPx(xMin, anim.a * xMin + anim.b);
    const p2 = toPx(xMax, anim.a * xMax + anim.b);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#6366f1";
    ctx.shadowColor = "rgba(99,102,241,.35)";
    ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(p1.px, p1.py); ctx.lineTo(p2.px, p2.py); ctx.stroke();
    ctx.shadowBlur = 0;
  }
  function readSliders() {
    // Slider is the single source of truth; number input mirrors it
    return { a: Number($("#a-slider").value), b: Number($("#b-slider").value) };
  }
  // Çift yönlü senkron: slider ↔ number input
  function syncFromSlider(whichId, numId) {
    return () => {
      const v = Number($("#" + whichId).value);
      $("#" + numId).value = v.toFixed(1);
      updateLabels();
    };
  }
  function syncFromNumber(whichId, sliderId, min, max) {
    return () => {
      let v = Number($("#" + whichId).value);
      if (!Number.isFinite(v)) v = 0;
      v = clamp(v, min, max);
      $("#" + sliderId).value = v;
      updateLabels();
    };
  }
  function loop() {
    resize();
    if (lastSize.w > 0) {
      const { a, b } = readSliders();
      anim.a += (a - anim.a) * 0.2;
      anim.b += (b - anim.b) * 0.2;
      drawGrid();
      drawTarget();
      drawLine();
    }
    requestAnimationFrame(loop);
  }
  function newTask() {
    // DESIGN: Hedef noktaların grid [-10,10]x[-10,10] içinde kalmasını garanti et.
    // Aksi halde öğrenci hedef noktaları göremez, oyun bozulur.
    let x1, x2, a, b, y1, y2, tries = 0;
    do {
      x1 = randomInt(-5, -1);
      x2 = randomInt(1, 5);
      a = randomInt(-3, 3);
      if (a === 0) a = 1;
      b = randomInt(-5, 5);
      y1 = a * x1 + b;
      y2 = a * x2 + b;
      tries++;
    } while (
      (Math.abs(y1) > 9 || Math.abs(y2) > 9) && tries < 50
    );
    target = { x1, y1, x2, y2, a, b };
    State.byModule.function.task = (State.byModule.function.task || 0) + 1;
    $("#function-target").innerHTML =
      `Hedef: Doğru <b>(${x1}, ${y1})</b> ve <b>(${x2}, ${y2})</b> noktalarından geçsin.`;
    $("#function-fb").textContent = "";
    $("#function-fb").className = "feedback";
    const poe = $("#fn-poe-fb");
    if (poe) {
      poe.textContent = "";
      poe.className = "feedback poe-feedback";
    }
    renderModuleMini("function");
  }
  function updateLabels() {
    const { a, b } = readSliders();
    // Sync number inputs (keep slider as source of truth; number just mirrors)
    if (document.activeElement?.id !== "a-num") $("#a-num").value = a.toFixed(1);
    if (document.activeElement?.id !== "b-num") $("#b-num").value = b.toFixed(1);
    const sign = b >= 0 ? "+" : "−";
    $("#eq").textContent = `y = ${a.toFixed(1)}·x ${sign} ${Math.abs(b).toFixed(1)}`;
    flashHighlight($("#eq"));
  }
  function comparePredSlope() {
    if (!target) return;
    const raw = ($("#fn-predict-m")?.value || "").trim().replace(",", ".");
    const pred = parseFloat(raw);
    if (!Number.isFinite(pred)) {
      toast("Geçerli bir eğim (sayı) gir.", "warn");
      return;
    }
    const trueM = (target.y2 - target.y1) / (target.x2 - target.x1);
    const d = Math.abs(pred - trueM);
    const fb = $("#fn-poe-fb");
    if (!fb) return;
    if (d < 0.2) {
      fb.className = "feedback poe-feedback ok";
      fb.textContent = `Çok yakın! Gerçek Δy/Δx ≈ ${trueM.toFixed(2)}, tahminin ${pred.toFixed(2)}.`;
    } else if (Math.abs(pred - trueM) > 2 && Math.abs(pred) < 0.5) {
      fb.className = "feedback poe-feedback warn";
      fb.textContent = `Eğim çok küçük tahmin edilmiş. Hedef noktalar (${target.x1},${target.y1}) ve (${target.x2},${target.y2}) ile Δy/Δx ≈ ${trueM.toFixed(2)}.`;
    } else {
      fb.className = "feedback poe-feedback warn";
      fb.textContent = `Tahmin ${pred.toFixed(2)}; gerçek eğim ≈ ${trueM.toFixed(2)} (fark ${d.toFixed(2)}). İki hedef noktayı kullan.`;
    }
  }
  function check() {
    const { a, b } = readSliders();
    const err = Math.abs(a - target.a) + Math.abs(b - target.b);
    const fb = $("#function-fb");
    if (err < 0.25) {
      fb.textContent = `Mükemmel! a=${target.a}, b=${target.b}. +15 puan`;
      fb.className = "feedback ok";
      toast("Doğruyu yakaladın · +15 puan", "ok");
      recordAttempt("function", true, 15);
      setTimeout(newTask, 800);
    } else if (err < 1.2) {
      fb.textContent = `Çok yaklaştın (fark ≈ ${err.toFixed(2)}). İnce ayar yap.`;
      fb.className = "feedback warn";
      recordAttempt("function", false);
    } else {
      const trueM = (target.y2 - target.y1) / (target.x2 - target.x1);
      const bIntercept = target.y1 - trueM * target.x1;
      if (Math.abs(a - trueM) < 0.35 && Math.abs(b - bIntercept) > 0.8) {
        fb.textContent = `Eğim fikri doğruya yakın (Δy/Δx≈${trueM.toFixed(1)}), ama kesim b uyuşmuyor. Bir noktayı doğruya yerleştir: b = y − m·x.`;
      } else if (Math.abs(b - bIntercept) < 0.5 && Math.abs(a - trueM) > 0.6) {
        fb.textContent = `Kesim b yakın görünüyor; eğimi iki noktadan yeniden hesapla: m = (y₂−y₁)/(x₂−x₁) = ${trueM.toFixed(2)}.`;
      } else {
        const slope = trueM.toFixed(1);
        fb.textContent = `Eğim Δy/Δx = ${slope}. İki turuncu noktayı aynı doğruya oturt.`;
      }
      fb.className = "feedback warn";
      recordAttempt("function", false);
    }
  }
  function hint() {
    const slope = (target.y2 - target.y1) / (target.x2 - target.x1);
    toast(`Eğim ≈ ${slope.toFixed(1)}. y(0) = b'yi bul.`);
  }
  function init() {
    $("#a-slider").addEventListener("input", syncFromSlider("a-slider", "a-num"));
    $("#b-slider").addEventListener("input", syncFromSlider("b-slider", "b-num"));
    $("#a-num").addEventListener("input", syncFromNumber("a-num", "a-slider", -5, 5));
    $("#b-num").addEventListener("input", syncFromNumber("b-num", "b-slider", -10, 10));
    $("#function-check").addEventListener("click", check);
    $("#function-new").addEventListener("click", newTask);
    $("#function-hint").addEventListener("click", hint);
    const cmp = $("#fn-compare-predict");
    if (cmp) cmp.addEventListener("click", comparePredSlope);
    window.addEventListener("resize", resize);
    newTask();
    updateLabels();
    loop();
  }
  return { init, resize };
})();
