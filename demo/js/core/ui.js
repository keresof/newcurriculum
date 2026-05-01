import { prefersReducedMotion } from "./motion.js";
import { $ } from "./dom.js";

export function pulse(el) {
  if (!el || !el.animate || prefersReducedMotion()) return;
  el.animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }],
    { duration: 380, easing: "cubic-bezier(.2,.7,.2,1)" }
  );
}

export function toast(message, kind = "info") {
  const host = $("#toast-host");
  if (!host) return;
  const t = document.createElement("div");
  t.className = `toast ${kind}`;
  t.innerHTML = `<span class="dot"></span><span>${message}</span>`;
  host.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}
