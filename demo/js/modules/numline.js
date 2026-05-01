import { $, $$, svgEl, setAttrs } from "../core/dom.js";
import { randomInt, clamp } from "../core/math.js";
import { flashHighlight, prefersReducedMotion } from "../core/motion.js";
import { State, recordAttempt, renderModuleMini } from "../core/state.js";
import { toast } from "../core/ui.js";

export const NumLine = (() => {
  const svg = $("#numline-svg");
  const W = 720, H = 240, padX = 50;
  const axisY = 150;
  const xToPx = (x) => padX + ((x + 10) / 20) * (W - 2 * padX);
  const pxToX = (px) => Math.round(((px - padX) / (W - 2 * padX)) * 20 - 10);

  const target = { a: -3, b: 4, leftClosed: true, rightClosed: true };
  const user   = { a: -3, b: 4, leftClosed: true, rightClosed: true };

  // Persistent SVG references (created once)
  const refs = {};
  let dragging = null;

  function buildSVG() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // Background label zones
    svg.appendChild(svgEl("text", {
      x: padX, y: axisY - 80, class: "label-zone", "text-anchor": "start",
    })).textContent = "HEDEF";
    svg.appendChild(svgEl("text", {
      x: padX, y: axisY + 88, class: "label-zone", "text-anchor": "start",
    })).textContent = "SEN";

    // Target band + endpoints (above axis)
    refs.targetBand = svg.appendChild(svgEl("rect", {
      class: "interval-band-target", y: axisY - 60, height: 22, rx: 6,
    }));
    refs.targetLeft = svg.appendChild(svgEl("circle", {
      class: "endpoint-target closed", cy: axisY - 49, r: 7,
    }));
    refs.targetRight = svg.appendChild(svgEl("circle", {
      class: "endpoint-target closed", cy: axisY - 49, r: 7,
    }));
    refs.targetLabelL = svg.appendChild(svgEl("text", {
      y: axisY - 70, "text-anchor": "middle", "font-size": 12, fill: "#b45309", "font-weight": 700,
    }));
    refs.targetLabelR = svg.appendChild(svgEl("text", {
      y: axisY - 70, "text-anchor": "middle", "font-size": 12, fill: "#b45309", "font-weight": 700,
    }));

    // Axis
    svg.appendChild(svgEl("line", {
      class: "axis", x1: padX, y1: axisY, x2: W - padX, y2: axisY,
      stroke: "#cbd5e1", "stroke-width": 2,
    }));

    // Ticks
    for (let x = -10; x <= 10; x += 1) {
      const px = xToPx(x);
      const big = x % 5 === 0;
      svg.appendChild(svgEl("line", {
        class: "tick",
        x1: px, y1: axisY - (big ? 8 : 4),
        x2: px, y2: axisY + (big ? 8 : 4),
        stroke: "#cbd5e1",
      }));
      if (big) {
        const t = svg.appendChild(svgEl("text", {
          x: px, y: axisY + 26, "text-anchor": "middle", "font-size": 12, fill: "#94a3b8",
        }));
        t.textContent = x;
      }
    }

    // User band + endpoints (below axis)
    refs.userBand = svg.appendChild(svgEl("rect", {
      class: "interval-band-user", y: axisY + 38, height: 22, rx: 6,
    }));
    refs.userLeft = svg.appendChild(svgEl("circle", {
      class: "endpoint-user closed", cy: axisY + 49, r: 11,
      "data-side": "left",
    }));
    refs.userRight = svg.appendChild(svgEl("circle", {
      class: "endpoint-user closed", cy: axisY + 49, r: 11,
      "data-side": "right",
    }));
    refs.userLabelL = svg.appendChild(svgEl("text", {
      y: axisY + 78, "text-anchor": "middle", "font-size": 13, fill: "#312e81", "font-weight": 700,
    }));
    refs.userLabelR = svg.appendChild(svgEl("text", {
      y: axisY + 78, "text-anchor": "middle", "font-size": 13, fill: "#312e81", "font-weight": 700,
    }));

    // Bind drag handlers ONCE
    [refs.userLeft, refs.userRight].forEach((node) => {
      node.addEventListener("pointerdown", onDragStart);
      node.addEventListener("click", (e) => {
        // click toggles closed (no real movement)
        if (!dragging || !dragging.moved) toggleClosed(node.dataset.side);
        dragging = null;
      });
    });
  }

  function onDragStart(e) {
    e.preventDefault();
    const node = e.currentTarget;
    node.setPointerCapture?.(e.pointerId);
    dragging = { side: node.dataset.side, moved: false, pointerId: e.pointerId };
    node.addEventListener("pointermove", onDragMove);
    node.addEventListener("pointerup", onDragEnd);
    node.addEventListener("pointercancel", onDragEnd);
  }
  function onDragMove(e) {
    if (!dragging) return;
    const rect = svg.getBoundingClientRect();
    const ratio = W / rect.width;
    const px = (e.clientX - rect.left) * ratio;
    const x = clamp(pxToX(px), -10, 10);
    if (dragging.side === "left")  { user.a = x; }
    if (dragging.side === "right") { user.b = x; }
    dragging.moved = true;
    syncFormFromUser();
    render();
  }
  function onDragEnd(e) {
    const node = e.currentTarget;
    node.removeEventListener("pointermove", onDragMove);
    node.removeEventListener("pointerup", onDragEnd);
    node.removeEventListener("pointercancel", onDragEnd);
    node.releasePointerCapture?.(e.pointerId);
    // Keep dragging.moved info for the click handler that fires after pointerup
    setTimeout(() => { dragging = null; }, 0);
  }

  function toggleClosed(side) {
    if (side === "left") user.leftClosed = !user.leftClosed;
    if (side === "right") user.rightClosed = !user.rightClosed;
    syncFormFromUser();
    render();
  }

  function syncFormFromUser() {
    $("#num-left").value  = user.a;
    $("#num-right").value = user.b;
    $("#num-left-v").textContent  = user.a;
    $("#num-right-v").textContent = user.b;
    $("#num-left-type").value  = user.leftClosed  ? "closed" : "open";
    $("#num-right-type").value = user.rightClosed ? "closed" : "open";
    $("#num-li").textContent = user.leftClosed  ? "[" : "(";
    $("#num-ri").textContent = user.rightClosed ? "]" : ")";
  }

  function syncUserFromForm() {
    user.a = Number($("#num-left").value);
    user.b = Number($("#num-right").value);
    user.leftClosed  = $("#num-left-type").value  === "closed";
    user.rightClosed = $("#num-right-type").value === "closed";
    $("#num-left-v").textContent  = user.a;
    $("#num-right-v").textContent = user.b;
    $("#num-li").textContent = user.leftClosed  ? "[" : "(";
    $("#num-ri").textContent = user.rightClosed ? "]" : ")";
    render();
  }

  function newTask() {
    const a = randomInt(-9, 4);
    const b = randomInt(a + 2, 10);
    target.a = a;
    target.b = b;
    target.leftClosed  = Math.random() > 0.5;
    target.rightClosed = Math.random() > 0.5;

    State.byModule.numline.task = (State.byModule.numline.task || 0) + 1;
    const lc = target.leftClosed  ? "[" : "(";
    const rc = target.rightClosed ? "]" : ")";
    $("#numline-target").innerHTML =
      `Hedef aralık: <b>${lc}${a}, ${b}${rc}</b> — turuncu kesikli aralığa eşitle.`;
    $("#numline-fb").textContent = "";
    $("#numline-fb").className = "feedback";
    renderModuleMini("numline");
    render();
  }

  function render() {
    const tA = Math.min(target.a, target.b);
    const tB = Math.max(target.a, target.b);
    const uA = Math.min(user.a, user.b);
    const uB = Math.max(user.a, user.b);

    // Target
    setAttrs(refs.targetBand, {
      x: xToPx(tA),
      width: xToPx(tB) - xToPx(tA),
    });
    setAttrs(refs.targetLeft, {
      cx: xToPx(target.a),
      class: "endpoint-target " + (target.leftClosed ? "closed" : "open"),
    });
    setAttrs(refs.targetRight, {
      cx: xToPx(target.b),
      class: "endpoint-target " + (target.rightClosed ? "closed" : "open"),
    });
    refs.targetLabelL.setAttribute("x", xToPx(target.a));
    refs.targetLabelL.textContent = `${target.leftClosed ? "[" : "("}${target.a}`;
    refs.targetLabelR.setAttribute("x", xToPx(target.b));
    refs.targetLabelR.textContent = `${target.b}${target.rightClosed ? "]" : ")"}`;

    // User
    setAttrs(refs.userBand, {
      x: xToPx(uA),
      width: xToPx(uB) - xToPx(uA),
    });
    setAttrs(refs.userLeft, {
      cx: xToPx(user.a),
      class: "endpoint-user " + (user.leftClosed ? "closed" : "open"),
    });
    setAttrs(refs.userRight, {
      cx: xToPx(user.b),
      class: "endpoint-user " + (user.rightClosed ? "closed" : "open"),
    });
    refs.userLabelL.setAttribute("x", xToPx(user.a));
    refs.userLabelL.textContent = `${user.leftClosed ? "[" : "("}${user.a}`;
    refs.userLabelR.setAttribute("x", xToPx(user.b));
    refs.userLabelR.textContent = `${user.b}${user.rightClosed ? "]" : ")"}`;
  }

  function check() {
    const ok =
      user.a === target.a &&
      user.b === target.b &&
      user.leftClosed  === target.leftClosed &&
      user.rightClosed === target.rightClosed;
    const fb = $("#numline-fb");
    if (ok) {
      fb.textContent = "Harika! Aralığı tam yakaladın. +10 puan";
      fb.className = "feedback ok";
      toast("Doğru aralık · +10 puan", "ok");
      recordAttempt("numline", true, 10);
      setTimeout(newTask, 700);
    } else {
      const diffs = [];
      if (user.a !== target.a) diffs.push("sol uç");
      if (user.b !== target.b) diffs.push("sağ uç");
      if (user.leftClosed  !== target.leftClosed)  diffs.push("sol kapsam");
      if (user.rightClosed !== target.rightClosed) diffs.push("sağ kapsam");
      let msg = `Eksik: ${diffs.join(", ")}.`;
      if (user.leftClosed !== target.leftClosed || user.rightClosed !== target.rightClosed) {
        msg +=
          " Köşeli [ ] «uç dahil», yuvarlak ( ) «uç hariç» demektir — uçtaki daireye tıklayarak değiştir.";
      }
      if (user.a === target.b && user.b === target.a && user.leftClosed === target.rightClosed && user.rightClosed === target.leftClosed) {
        msg =
          "Aralığın uç değerleri hedefle aynı ama sol/saç ve kapsam eşleşmesi ters: sol kaydırıcı sol uç, sağ kaydırıcı sağ uç olacak şekilde ayarla.";
      }
      fb.textContent = msg;
      fb.className = "feedback warn";
      toast("Tam uymadı, tekrar dene", "warn");
      recordAttempt("numline", false);
    }
  }

  function hint() {
    toast(`Sol uç ${target.a}, sağ uç ${target.b}. Kapsamı kendin bul 😉`);
  }

  function init() {
    buildSVG();
    $("#num-left").addEventListener("input", syncUserFromForm);
    $("#num-right").addEventListener("input", syncUserFromForm);
    $("#num-left-type").addEventListener("change", syncUserFromForm);
    $("#num-right-type").addEventListener("change", syncUserFromForm);
    $("#numline-check").addEventListener("click", check);
    $("#numline-new").addEventListener("click", newTask);
    $("#numline-hint").addEventListener("click", hint);
    syncUserFromForm();
    newTask();
  }

  return { init };
})();
