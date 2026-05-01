import { svgEl } from "../core/dom.js";

export const TriGeo = (() => {
  const D2R = Math.PI / 180;

  // KKK (SSS): 3 kenar → tek üçgen (üçgen eşitsizliği sağlanıyorsa)
  function KKK(a, b, c) {
    if (a + b <= c || a + c <= b || b + c <= a) return null;
    // cos B = (a² + c² − b²) / (2ac)
    const cosB = (a * a + c * c - b * b) / (2 * a * c);
    if (Math.abs(cosB) > 1) return null;
    const B = Math.acos(cosB);
    return { A: { x: c * Math.cos(B), y: c * Math.sin(B) }, B: { x: 0, y: 0 }, C: { x: a, y: 0 } };
  }
  // KAK (SAS): c, açı B, a
  function KAK(c, Bdeg, a) {
    const B = Bdeg * D2R;
    return { A: { x: c * Math.cos(B), y: c * Math.sin(B) }, B: { x: 0, y: 0 }, C: { x: a, y: 0 } };
  }
  // AKA (ASA): açı B, a, açı C
  function AKA(Bdeg, a, Cdeg) {
    if (Bdeg + Cdeg >= 180 || Bdeg <= 0 || Cdeg <= 0) return null;
    const Adeg = 180 - Bdeg - Cdeg;
    // Sinüs teoremi: c = a · sin C / sin A  (c = |AB|)
    const c = a * Math.sin(Cdeg * D2R) / Math.sin(Adeg * D2R);
    return KAK(c, Bdeg, a);
  }
  // KAA (AAS): açı B, açı C, b (= |AC|, yani B'nin karşısı olmayan bitişik olmayan kenar)
  function KAA(Bdeg, Cdeg, b) {
    if (Bdeg + Cdeg >= 180 || Bdeg <= 0 || Cdeg <= 0) return null;
    const Adeg = 180 - Bdeg - Cdeg;
    // a / sin A = b / sin B  →  a = b · sin A / sin B
    const a = b * Math.sin(Adeg * D2R) / Math.sin(Bdeg * D2R);
    return AKA(Bdeg, a, Cdeg);
  }
  // KKA (SSA) · ambigü: a, b, açı B; döndürülen obj.alt varsa ikinci çözüm
  function KKA(a, b, Bdeg) {
    const B = Bdeg * D2R;
    const sinB = Math.sin(B);
    const sinA = a * sinB / b;
    if (sinA > 1 + 1e-9) return null;            // hiç çözüm yok
    const clampedSinA = Math.min(1, Math.max(-1, sinA));
    const Aa = Math.asin(clampedSinA);            // dar açı çözüm
    const Ao = Math.PI - Aa;                      // geniş açı çözüm
    const build = (Aangle) => {
      const Cangle = Math.PI - B - Aangle;
      if (Cangle <= 0) return null;
      const c = b * Math.sin(Cangle) / sinB;
      return { A: { x: c * Math.cos(B), y: c * Math.sin(B) }, B: { x: 0, y: 0 }, C: { x: a, y: 0 } };
    };
    const primary = build(Aa);
    const alt = (Aa !== Ao && Math.PI - B - Ao > 0) ? build(Ao) : null;
    if (!primary) return null;
    return { ...primary, alt };
  }
  // HK (RHS/HL): dik üçgen — hipotenüs h, bir kenar a (dik açı C'de)
  function HK(h, a) {
    if (h <= a) return null;
    const other = Math.sqrt(h * h - a * a);
    return { A: { x: a, y: other }, B: { x: 0, y: 0 }, C: { x: a, y: 0 } };
  }

  // Ölçüm okuma: bir üçgen {A, B, C} için
  function measure(t) {
    if (!t) return null;
    const AB = Math.hypot(t.B.x - t.A.x, t.B.y - t.A.y);
    const BC = Math.hypot(t.C.x - t.B.x, t.C.y - t.B.y);
    const CA = Math.hypot(t.A.x - t.C.x, t.A.y - t.C.y);
    // Açılar
    const angle = (P, Q, R) => {
      const v1x = Q.x - P.x, v1y = Q.y - P.y;
      const v2x = R.x - P.x, v2y = R.y - P.y;
      const dot = v1x * v2x + v1y * v2y;
      const m = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
      return Math.acos(Math.max(-1, Math.min(1, dot / m))) * 180 / Math.PI;
    };
    return {
      a: BC, b: CA, c: AB,
      A: angle(t.A, t.B, t.C),
      B: angle(t.B, t.A, t.C),
      C: angle(t.C, t.A, t.B),
    };
  }

  // Üçgeni verilen dikdörtgen viewport'un ortasına sığacak şekilde dönüştür.
  // externalScale verilirse sığdırma hesabı atlanır ve o ölçek kullanılır —
  // benzerlik/karşılaştırma modüllerinde iki üçgenin paylaşılan ölçeği için.
  function fitToPort(t, port, paddingPct = 0.12, externalScale = null) {
    if (!t) return null;
    const xs = [t.A.x, t.B.x, t.C.x];
    const ys = [t.A.y, t.B.y, t.C.y];
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const w = maxX - minX || 1, h = maxY - minY || 1;
    let scale;
    if (externalScale !== null && Number.isFinite(externalScale) && externalScale > 0) {
      scale = externalScale;
    } else {
      const availW = port.w * (1 - 2 * paddingPct);
      const availH = port.h * (1 - 2 * paddingPct);
      scale = Math.min(availW / w, availH / h);
    }
    const cx = port.x + port.w / 2;
    const cy = port.y + port.h / 2;
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    // SVG y ters: matematik y+ → svg y- (flipY)
    const xf = (p) => ({ x: cx + (p.x - midX) * scale, y: cy - (p.y - midY) * scale });
    return { A: xf(t.A), B: xf(t.B), C: xf(t.C), scale };
  }

  // İki üçgenin (örn. T₁ ve T₂ = k·T₁) aynı ölçekte çizilebilmesi için
  // paylaşılan ölçek hesaplar. Her ikisinin de kendi port'una sığmasını
  // garanti eder (büyük olanın sığması esas alınır).
  function computeSharedScale(t1, t2, port, paddingPct = 0.12) {
    const bbox = (t) => {
      if (!t) return { w: 1, h: 1 };
      const xs = [t.A.x, t.B.x, t.C.x];
      const ys = [t.A.y, t.B.y, t.C.y];
      return {
        w: Math.max(...xs) - Math.min(...xs) || 1,
        h: Math.max(...ys) - Math.min(...ys) || 1,
      };
    };
    const b1 = bbox(t1), b2 = bbox(t2);
    const maxW = Math.max(b1.w, b2.w);
    const maxH = Math.max(b1.h, b2.h);
    const availW = port.w * (1 - 2 * paddingPct);
    const availH = port.h * (1 - 2 * paddingPct);
    return Math.min(availW / maxW, availH / maxH);
  }

  // Vertex ve karşı kenar renk paleti — Oliver Byrne (Euclid) tarzı:
  // renk fonksiyonel iz, eşleşen parçaları bağlar. A-a kırmızı, B-b mor, C-c yeşil.
  const COLOR = {
    A: "#ef4444", B: "#6366f1", C: "#10b981",
    // Kenar = karşı köşenin rengi
    a: "#ef4444", b: "#6366f1", c: "#10b981",
  };

  // Zengin üçgen çizimi — hem G2 hem G3'te kullanılır.
  //   container: parent SVG <g>
  //   t: matematik koordinatlarında { A, B, C } (y+ up)
  //   port: { x, y, w, h }
  //   externalScale: opsiyonel · iki üçgeni paylaşılan ölçekte çizmek için
  function drawRichTriangle(container, t, port, externalScale = null) {
    while (container.firstChild) container.removeChild(container.firstChild);
    if (!t) {
      const err = container.appendChild(svgEl("text", {
        x: port.x + port.w / 2, y: port.y + port.h / 2,
        "text-anchor": "middle", fill: "#b91c1c", "font-weight": 700, "font-size": 14,
      }));
      err.textContent = "⚠ Geçersiz parametreler";
      return;
    }
    const fit = fitToPort(t, port, 0.12, externalScale);
    const m = measure(t);
    if (!fit || !m) return;

    // 1) Üçgen dolum (hafif)
    const pts = `${fit.A.x},${fit.A.y} ${fit.B.x},${fit.B.y} ${fit.C.x},${fit.C.y}`;
    container.appendChild(svgEl("polygon", {
      points: pts, fill: "rgba(15,23,42,0.035)", stroke: "none",
    }));

    // 2) Renkli kenarlar (karşı köşenin rengi) + tick marks
    const drawEdge = (P, Q, color, labelText, tickCount) => {
      container.appendChild(svgEl("line", {
        x1: P.x, y1: P.y, x2: Q.x, y2: Q.y,
        stroke: color, "stroke-width": 3.2, "stroke-linecap": "round",
      }));
      const mx = (P.x + Q.x) / 2, my = (P.y + Q.y) / 2;
      const dx = Q.x - P.x, dy = Q.y - P.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const ux = dx / len,   uy = dy / len;
      // Tick marks — 1 tick = kenar 'a', 2 = 'b', 3 = 'c'
      const tickLen = 6, gap = 4;
      for (let i = 0; i < tickCount; i++) {
        const off = (i - (tickCount - 1) / 2) * gap;
        const cx = mx + ux * off, cy = my + uy * off;
        container.appendChild(svgEl("line", {
          x1: cx - nx * tickLen / 2, y1: cy - ny * tickLen / 2,
          x2: cx + nx * tickLen / 2, y2: cy + ny * tickLen / 2,
          stroke: color, "stroke-width": 2.6, "stroke-linecap": "round",
        }));
      }
      // Kenar etiketi (capsule)
      const lblX = mx + nx * 16;
      const lblY = my + ny * 16;
      const rectW = Math.max(34, labelText.length * 8 + 10);
      container.appendChild(svgEl("rect", {
        x: lblX - rectW / 2, y: lblY - 9, width: rectW, height: 18, rx: 9,
        fill: "#fff", stroke: color, "stroke-width": 1.3,
        filter: "drop-shadow(0 1px 2px rgba(15,23,42,0.08))",
      }));
      container.appendChild(svgEl("text", {
        x: lblX, y: lblY + 4, "text-anchor": "middle", "font-size": 11.5,
        "font-weight": 700, fill: color, "font-family": "JetBrains Mono, monospace",
      })).textContent = labelText;
    };
    drawEdge(fit.B, fit.C, COLOR.a, `a=${m.a.toFixed(1)}`, 1);
    drawEdge(fit.C, fit.A, COLOR.b, `b=${m.b.toFixed(1)}`, 2);
    drawEdge(fit.A, fit.B, COLOR.c, `c=${m.c.toFixed(1)}`, 3);

    // 3) Açı yayları + derece etiketleri (her köşede)
    const drawAngleMark = (vertex, adj1, adj2, degValue, color) => {
      const a1 = Math.atan2(adj1.y - vertex.y, adj1.x - vertex.x);
      const a2 = Math.atan2(adj2.y - vertex.y, adj2.x - vertex.x);
      let delta = a2 - a1;
      while (delta > Math.PI) delta -= 2 * Math.PI;
      while (delta < -Math.PI) delta += 2 * Math.PI;
      const sweep = delta > 0 ? 1 : 0;
      const radius = 26;
      const x1 = vertex.x + radius * Math.cos(a1);
      const y1 = vertex.y + radius * Math.sin(a1);
      const x2 = vertex.x + radius * Math.cos(a2);
      const y2 = vertex.y + radius * Math.sin(a2);
      container.appendChild(svgEl("path", {
        d: `M ${vertex.x} ${vertex.y} L ${x1} ${y1} A ${radius} ${radius} 0 0 ${sweep} ${x2} ${y2} Z`,
        fill: color, "fill-opacity": 0.18,
        stroke: color, "stroke-width": 1.5, "stroke-opacity": 0.7,
      }));
      // Açı değeri · bisector yönünde dışarı
      const midAngle = a1 + delta / 2;
      const lblX = vertex.x + (radius + 14) * Math.cos(midAngle);
      const lblY = vertex.y + (radius + 14) * Math.sin(midAngle) + 4;
      container.appendChild(svgEl("text", {
        x: lblX, y: lblY, "text-anchor": "middle", "font-size": 11,
        "font-weight": 700, fill: color, "font-family": "JetBrains Mono, monospace",
      })).textContent = `${degValue.toFixed(1)}°`;
    };
    drawAngleMark(fit.A, fit.B, fit.C, m.A, COLOR.A);
    drawAngleMark(fit.B, fit.C, fit.A, m.B, COLOR.B);
    drawAngleMark(fit.C, fit.A, fit.B, m.C, COLOR.C);

    // 4) Köşe noktaları: halo + iç disk + beyaz harf
    const drawVertexDot = (p, letter, color) => {
      container.appendChild(svgEl("circle", {
        cx: p.x, cy: p.y, r: 16, fill: color, "fill-opacity": 0.16,
      }));
      container.appendChild(svgEl("circle", {
        cx: p.x, cy: p.y, r: 11, fill: color,
        stroke: "#fff", "stroke-width": 2.5,
      }));
      container.appendChild(svgEl("text", {
        x: p.x, y: p.y + 4, "text-anchor": "middle",
        fill: "#fff", "font-weight": 800, "font-size": 13,
        "font-family": "Inter, sans-serif",
      })).textContent = letter;
    };
    drawVertexDot(fit.A, "A", COLOR.A);
    drawVertexDot(fit.B, "B", COLOR.B);
    drawVertexDot(fit.C, "C", COLOR.C);
  }

  return { KKK, KAK, AKA, KAA, KKA, HK, measure, fitToPort, computeSharedScale, drawRichTriangle, COLOR };
})();
