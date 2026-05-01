import { $, $$, svgEl, setAttrs } from "../core/dom.js";
import { randomInt, clamp } from "../core/math.js";
import { flashHighlight, prefersReducedMotion } from "../core/motion.js";
import { State, recordAttempt, renderModuleMini } from "../core/state.js";
import { toast } from "../core/ui.js";

export const RefFuncMod = (() => {
  const canvas = $("#ref-canvas");
  const ctx = canvas.getContext("2d");
  // Geniş görünür düzlem · hedef bu kutunun içinde mutlaka yeterli
  // sayıda görünür noktaya sahip olacak şekilde üretilir (bkz. newTask).
  const xMin = -12, xMax = 12, yMin = -12, yMax = 12;
  let lastSize = { w: 0, h: 0 };
  let target = null;

  const BASES = {
    lin:  { f: (x) => x,                  label: "x" },
    sq:   { f: (x) => x * x,              label: "x²" },
    sqrt: { f: (x) => x >= 0 ? Math.sqrt(x) : NaN, label: "√x" },
    abs:  { f: (x) => Math.abs(x),        label: "|x|" },
    rec:  { f: (x) => x === 0 ? NaN : 1 / x, label: "1/x" },
  };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (w === lastSize.w && h === lastSize.h) return;
    lastSize = { w, h };
    canvas.width = w * dpr; canvas.height = h * dpr;
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
    grad.addColorStop(0, "#fbfcff"); grad.addColorStop(1, "#f1f4fb");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 1;
    for (let x = xMin; x <= xMax; x += 1) {
      const { px } = toPx(x, 0);
      ctx.strokeStyle = x % 4 === 0 ? "#cbd5e1" : "#eef1fa";
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke();
    }
    for (let y = yMin; y <= yMax; y += 1) {
      const { py } = toPx(0, y);
      ctx.strokeStyle = y % 4 === 0 ? "#cbd5e1" : "#eef1fa";
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke();
    }
    ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 1.5;
    const ax = toPx(0, 0);
    ctx.beginPath(); ctx.moveTo(0, ax.py); ctx.lineTo(w, ax.py); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax.px, 0); ctx.lineTo(ax.px, h); ctx.stroke();
    ctx.fillStyle = "#64748b"; ctx.font = "11px Inter, system-ui";
    ctx.textAlign = "center";
    // Etiketleri her 4 birimde göster (yeni aralık ±12 olduğu için)
    const tickStep = 4;
    for (let x = Math.ceil(xMin / tickStep) * tickStep; x <= xMax; x += tickStep) {
      if (x === 0) continue;
      const { px, py } = toPx(x, 0);
      ctx.fillText(String(x), px, py + 14);
    }
    ctx.textAlign = "left";
    for (let y = Math.ceil(yMin / tickStep) * tickStep; y <= yMax; y += tickStep) {
      if (y === 0) continue;
      const { px, py } = toPx(0, y);
      ctx.fillText(String(y), px + 6, py + 3);
    }
  }
  function drawCurve(baseKey, a, r, k, color, dashed = false, alpha = 1) {
    const f = BASES[baseKey].f;
    ctx.save();
    if (dashed) ctx.setLineDash([8, 6]);
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.beginPath();
    let started = false;
    const steps = 600;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      const yBase = f(x - r);
      if (!Number.isFinite(yBase)) { started = false; continue; }
      const y = a * yBase + k;
      if (y < yMin - 5 || y > yMax + 5) { started = false; continue; }
      const { px, py } = toPx(x, y);
      if (!started) { ctx.moveTo(px, py); started = true; }
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  function readControls() {
    return {
      base: $("#ref-base").value,
      a: Number($("#ref-a").value),
      r: Number($("#ref-r").value),
      k: Number($("#ref-k").value),
    };
  }
  function updateLabels() {
    const c = readControls();
    // Slider → number input senkron (aktif giriş alanını ezmez)
    if (document.activeElement?.id !== "ref-a-num") $("#ref-a-num").value = c.a.toFixed(1);
    if (document.activeElement?.id !== "ref-r-num") $("#ref-r-num").value = c.r.toFixed(1);
    if (document.activeElement?.id !== "ref-k-num") $("#ref-k-num").value = c.k.toFixed(1);
    $("#ref-base-v").textContent = BASES[c.base].label;
    const aStr = c.a === 1 ? "" : c.a === -1 ? "−" : `${c.a.toFixed(1)}·`;
    const rStr = c.r === 0 ? "x" : c.r > 0 ? `(x − ${c.r.toFixed(1)})` : `(x + ${Math.abs(c.r).toFixed(1)})`;
    const kStr = c.k === 0 ? "" : c.k > 0 ? ` + ${c.k.toFixed(1)}` : ` − ${Math.abs(c.k).toFixed(1)}`;
    const baseLabel = BASES[c.base].label.replace("x", rStr);
    $("#ref-eq").textContent = `g(x) = ${aStr}${baseLabel}${kStr}`;
    // Nitel özellikler panelini güncelle
    updateQualities(c);
    flashHighlight($("#ref-eq"));
  }

  // Dönüşüm uygulanmış g(x) = a·f(x−r) + k için nitel özellikleri hesapla.
  // Referans tablo + r,k,a'ya göre dinamik
  function updateQualities(c) {
    const { base, a, r, k } = c;
    const f = BASES[base].f;
    const fmt = (v) => v === 0 ? "0" : (Math.abs(v - Math.round(v)) < 0.01 ? String(Math.round(v)) : v.toFixed(1));
    const rStr = r === 0 ? "" : (r > 0 ? ` + ${fmt(r)}` : ` − ${fmt(-r)}`);
    const kStr = k === 0 ? "" : (k > 0 ? ` + ${fmt(k)}` : ` − ${fmt(-k)}`);

    // Tanım & görüntü, bireysel hesap
    let domain, range, mono, zero, ext, parity, oneToOne, asym;
    const aPos = a > 0;
    const aOne = Math.abs(a) === 1;

    // Ortak: y-kesim f(0)
    let y0 = NaN;
    const fAtNegR = f(-r);
    if (Number.isFinite(fAtNegR)) y0 = a * fAtNegR + k;

    switch (base) {
      case "lin": {
        // g(x) = a(x - r) + k = ax + (k - ar) → her zaman bir doğru
        const intercept = k - a * r;
        domain = "ℝ";
        range = a === 0 ? `{${fmt(k)}}` : "ℝ";
        mono = a === 0 ? "sabit" : (aPos ? "artan (ℝ)" : "azalan (ℝ)");
        // Sıfır: ax + (k-ar) = 0 → x = (ar - k)/a
        zero = a === 0 ? (k === 0 ? "her x" : "yok") : `x = ${fmt((a*r - k)/a)}`;
        ext = "yok";
        parity = (r === 0 && k === 0) ? "tek" : (k === 0 && r === 0 ? "tek" : "ne tek ne çift");
        oneToOne = a === 0 ? "hayır (sabit)" : "evet";
        asym = "yok";
        break;
      }
      case "sq": {
        // g(x) = a(x-r)² + k
        domain = "ℝ";
        range = aPos ? `[${fmt(k)}, ∞)` : `(−∞, ${fmt(k)}]`;
        mono = aPos
          ? `(−∞, ${fmt(r)}] azalan · [${fmt(r)}, ∞) artan`
          : `(−∞, ${fmt(r)}] artan · [${fmt(r)}, ∞) azalan`;
        // Sıfır: a(x-r)² + k = 0 → (x-r)² = -k/a
        const disc = -k / a;
        if (disc < 0) zero = "yok (reel)";
        else if (disc === 0) zero = `x = ${fmt(r)} (çift kök)`;
        else {
          const rootOff = Math.sqrt(disc);
          zero = `x = ${fmt(r - rootOff)}, ${fmt(r + rootOff)}`;
        }
        ext = aPos ? `min (${fmt(r)}, ${fmt(k)})` : `max (${fmt(r)}, ${fmt(k)})`;
        parity = (r === 0) ? "çift" : "ne tek ne çift";
        oneToOne = "hayır (çift fonksiyon)";
        asym = "yok";
        break;
      }
      case "sqrt": {
        // g(x) = a√(x-r) + k, tanım x ≥ r
        domain = `[${fmt(r)}, ∞)`;
        range = aPos ? `[${fmt(k)}, ∞)` : `(−∞, ${fmt(k)}]`;
        mono = aPos ? `artan [${fmt(r)}, ∞)` : `azalan [${fmt(r)}, ∞)`;
        // Sıfır: a√(x-r) + k = 0 → √(x-r) = -k/a → x = r + (k/a)²
        if ((-k / a) < 0) zero = "yok";
        else {
          const rv = (-k / a);
          zero = `x = ${fmt(r + rv * rv)}`;
        }
        ext = aPos ? `min f(${fmt(r)}) = ${fmt(k)}` : `max f(${fmt(r)}) = ${fmt(k)}`;
        parity = "ne tek ne çift";
        oneToOne = "evet";
        asym = "yok";
        break;
      }
      case "abs": {
        // g(x) = a|x-r| + k
        domain = "ℝ";
        range = aPos ? `[${fmt(k)}, ∞)` : `(−∞, ${fmt(k)}]`;
        mono = aPos
          ? `(−∞, ${fmt(r)}] azalan · [${fmt(r)}, ∞) artan`
          : `(−∞, ${fmt(r)}] artan · [${fmt(r)}, ∞) azalan`;
        const disc = -k / a;
        if (disc < 0) zero = "yok";
        else if (disc === 0) zero = `x = ${fmt(r)}`;
        else zero = `x = ${fmt(r - disc)}, ${fmt(r + disc)}`;
        ext = aPos ? `min (${fmt(r)}, ${fmt(k)})` : `max (${fmt(r)}, ${fmt(k)})`;
        parity = (r === 0) ? "çift" : "ne tek ne çift";
        oneToOne = "hayır (çift fonksiyon)";
        asym = "yok";
        break;
      }
      case "rec": {
        // g(x) = a/(x-r) + k, tanım x ≠ r
        domain = `ℝ \\ {${fmt(r)}}`;
        range = `ℝ \\ {${fmt(k)}}`;
        mono = aPos
          ? `(−∞, ${fmt(r)}) azalan · (${fmt(r)}, ∞) azalan`
          : `(−∞, ${fmt(r)}) artan · (${fmt(r)}, ∞) artan`;
        // Sıfır: a/(x-r) + k = 0 → x = r - a/k  (k ≠ 0)
        zero = k === 0 ? "yok" : `x = ${fmt(r - a / k)}`;
        ext = "yok";
        parity = (r === 0 && k === 0) ? "tek" : "ne tek ne çift";
        oneToOne = "evet";
        asym = `dikey x = ${fmt(r)} · yatay y = ${fmt(k)}`;
        break;
      }
      default:
        domain = range = mono = zero = ext = parity = oneToOne = asym = "—";
    }

    $("#rq-dom").textContent = domain;
    $("#rq-range").textContent = range;
    $("#rq-mono").textContent = mono;
    $("#rq-zero").textContent = zero;
    $("#rq-y0").textContent = Number.isFinite(y0) ? fmt(y0) : "tanımsız";
    $("#rq-ext").textContent = ext;
    $("#rq-parity").textContent = parity;
    $("#rq-11").textContent = oneToOne;
    $("#rq-asym").textContent = asym;
  }
  // Çift yönlü senkron helperları
  function syncRefFromSlider(sliderId, numId) {
    return () => {
      const v = Number($("#" + sliderId).value);
      $("#" + numId).value = v.toFixed(1);
      updateLabels();
    };
  }
  function syncRefFromNumber(numId, sliderId, min, max) {
    return () => {
      let v = Number($("#" + numId).value);
      if (!Number.isFinite(v)) return; // while typing "-" etc.
      v = clamp(v, min, max);
      $("#" + sliderId).value = v;
      updateLabels();
    };
  }

  function loop() {
    resize();
    if (lastSize.w > 0) {
      const c = readControls();
      drawGrid();
      // Reference (faded)
      drawCurve(c.base, 1, 0, 0, "#94a3b8", true, 0.6);
      // Target (if any)
      if (target) drawCurve(target.base, target.a, target.r, target.k, "#f59e0b", false, 0.75);
      // User
      drawCurve(c.base, c.a, c.r, c.k, "#6366f1");
    }
    requestAnimationFrame(loop);
  }

  function newTask() {
    // DESIGN: Hedef eğrinin görünür alanda en az 12 örnek noktası olmalı
    // (aksi halde 1/x gibi baz fonksiyonları dikine gidip görünmez olabiliyor).
    const baseKeys = Object.keys(BASES);
    const aOpts = [-2, -1, 1, 2];
    let base, a, r, k, tries = 0;
    while (tries++ < 80) {
      base = baseKeys[randomInt(0, baseKeys.length - 1)];
      a = aOpts[randomInt(0, aOpts.length - 1)];
      r = randomInt(-4, 4);
      k = randomInt(-4, 4);
      const f = BASES[base].f;
      let inside = 0;
      for (let x = xMin; x <= xMax; x += 0.5) {
        const y = a * f(x - r) + k;
        if (Number.isFinite(y) && y >= yMin + 0.5 && y <= yMax - 0.5) inside++;
      }
      if (inside >= 12) break;
    }
    target = { base, a, r, k };
    State.byModule.reffunc.task = (State.byModule.reffunc.task || 0) + 1;
    $("#ref-base").value = base; // başlangıç olarak hedef bazı seç
    updateLabels();
    $("#ref-target").innerHTML =
      `Hedef (turuncu): <b>${BASES[base].label}</b> referansından türetilen eğriyi,
       <code>a</code>, <code>r</code>, <code>k</code> değerleriyle eşleştir.
       <br><small>Cevabın aynı grafiği verdiği sürece, spesifik parametre değerleri
       birbirini götürebilir — kabul edilir.</small>`;
    $("#ref-fb").textContent = "";
    $("#ref-fb").className = "feedback";
    renderModuleMini("reffunc");
  }

  function check() {
    if (!target) return;
    const c = readControls();
    const fb = $("#ref-fb");
    if (c.base !== target.base) {
      fb.textContent = `Yanlış referans fonksiyon. Hedef: ${BASES[target.base].label}.`;
      fb.className = "feedback warn";
      recordAttempt("reffunc", false);
      return;
    }
    // Sample-based equivalence: iki fonksiyonun grafik üzerindeki değerlerini karşılaştır.
    // Böylece aynı grafiği veren farklı (a,r,k) kombinasyonları (örn. y=x için r ve k
    // birbirini götürürse) doğru kabul edilir. Gerçek matematiksel eşitlik: "her x için f(x)=g(x)".
    const f = BASES[c.base].f;
    const userFn = (x) => c.a * f(x - c.r) + c.k;
    const tgtFn  = (x) => target.a * f(x - target.r) + target.k;
    let sq = 0, n = 0, maxErr = 0;
    for (let x = xMin + 0.1; x <= xMax; x += 0.25) {
      const u = userFn(x), t = tgtFn(x);
      if (!Number.isFinite(u) || !Number.isFinite(t)) continue;
      if (Math.abs(u) > yMax * 3 || Math.abs(t) > yMax * 3) continue;
      const d = Math.abs(u - t);
      sq += d * d; n++;
      if (d > maxErr) maxErr = d;
    }
    if (n < 5) {
      fb.textContent = "Karşılaştırma için yeterli ortak tanım aralığı yok. Parametreleri farklı bir bölgeye getir.";
      fb.className = "feedback warn";
      return;
    }
    const rmse = Math.sqrt(sq / n);
    if (rmse < 0.3 && maxErr < 0.8) {
      fb.innerHTML = `<b>Mükemmel!</b> Grafikler eşdeğer (RMSE=${rmse.toFixed(2)}). +20 puan<br><small>Not: Aynı grafiği veren farklı (a, r, k) parametrizasyonları olasıdır — sınıfta «denk dönüşüm» olarak tartışılabilir.</small>`;
      fb.className = "feedback ok";
      toast("Eşdeğer grafik · +20 puan", "ok");
      recordAttempt("reffunc", true, 20);
      setTimeout(newTask, 900);
    } else {
      fb.textContent = `Grafikler uyuşmuyor (RMSE=${rmse.toFixed(2)}, max fark=${maxErr.toFixed(2)}). Önce turuncu hedefle aynı <b>referans f(x)</b>’i seç; sonra a, r, k ile üst üste bindir.`;
      fb.className = "feedback warn";
      recordAttempt("reffunc", false);
    }
  }
  function hint() {
    if (!target) return;
    toast(`İpucu: r = ${target.r}, k = ${target.k}.`);
  }

  function init() {
    $("#ref-base").addEventListener("change", updateLabels);
    // Slider'lar
    $("#ref-a").addEventListener("input", syncRefFromSlider("ref-a", "ref-a-num"));
    $("#ref-r").addEventListener("input", syncRefFromSlider("ref-r", "ref-r-num"));
    $("#ref-k").addEventListener("input", syncRefFromSlider("ref-k", "ref-k-num"));
    // Number input'lar (yazarken de canlı senkron)
    $("#ref-a-num").addEventListener("input", syncRefFromNumber("ref-a-num", "ref-a", -3, 3));
    $("#ref-r-num").addEventListener("input", syncRefFromNumber("ref-r-num", "ref-r", -8, 8));
    $("#ref-k-num").addEventListener("input", syncRefFromNumber("ref-k-num", "ref-k", -8, 8));
    // Blur: son değeri sınırlara sıkıştır
    $("#ref-a-num").addEventListener("blur", syncRefFromNumber("ref-a-num", "ref-a", -3, 3));
    $("#ref-r-num").addEventListener("blur", syncRefFromNumber("ref-r-num", "ref-r", -8, 8));
    $("#ref-k-num").addEventListener("blur", syncRefFromNumber("ref-k-num", "ref-k", -8, 8));
    $("#ref-check").addEventListener("click", check);
    $("#ref-new").addEventListener("click", newTask);
    $("#ref-hint").addEventListener("click", hint);
    window.addEventListener("resize", resize);
    newTask();
    loop();
  }
  return { init, resize };
})();
