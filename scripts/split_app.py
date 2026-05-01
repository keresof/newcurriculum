#!/usr/bin/env python3
"""Bir kerelik: demo/app.js içeriğini demo/js/ altına ES modüllerine böler."""
from __future__ import annotations

import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEMO = ROOT / "demo"
SRC = (DEMO / "app.js").read_text(encoding="utf-8").splitlines(keepends=True)


def slice_lines(start: int, end: int) -> str:
    """1-based inclusive line numbers (app.js ile aynı)."""
    return "".join(SRC[start - 1 : end])


IMPORT_FULL = """import { $, $$, svgEl, setAttrs } from "../core/dom.js";
import { randomInt, clamp } from "../core/math.js";
import { flashHighlight, prefersReducedMotion } from "../core/motion.js";
import { State, recordAttempt, renderModuleMini } from "../core/state.js";
import { toast } from "../core/ui.js";

"""

IMPORT_GEO = """import { svgEl } from "../core/dom.js";

"""

IMPORT_CONG = """import { $, svgEl, setAttrs } from "../core/dom.js";
import { randomInt, clamp } from "../core/math.js";
import { State, recordAttempt, renderModuleMini } from "../core/state.js";
import { toast } from "../core/ui.js";
import { TriGeo } from "./tri-geo.js";

"""

SLICES: list[tuple[str, int, int, str]] = [
    ("modules/numline.js", 201, 473, "full"),
    ("modules/interval-ops.js", 481, 804, "full"),
    ("modules/venn.js", 813, 939, "full"),
    ("modules/venn-ops.js", 953, 1261, "full"),
    ("modules/function.js", 1266, 1505, "full"),
    ("modules/ref-func.js", 1510, 1885, "full"),
    ("modules/analytic.js", 1894, 2104, "full"),
    ("modules/trig.js", 2109, 2523, "full"),
    ("modules/triangle.js", 2528, 2696, "full"),
    ("modules/tri-geo.js", 2704, 2959, "geo"),
    ("modules/tri-congruence.js", 2968, 3233, "cong"),
    ("modules/tri-similarity.js", 3242, 3436, "cong"),
    ("modules/prob.js", 3447, 3700, "full"),
    ("modules/bayes.js", 3705, 3907, "full"),
]

HEAD = {
    "full": IMPORT_FULL,
    "geo": IMPORT_GEO,
    "cong": IMPORT_CONG,
}


def add_export(s: str) -> str:
    """İlk anlamlı satırdaki `const Foo` → `export const Foo` (üstteki yorumları korur)."""
    lines = s.splitlines(keepends=True)
    for i, ln in enumerate(lines):
        if not ln.strip():
            continue
        stripped = ln.lstrip()
        if stripped.startswith("const "):
            j = ln.index("const ")
            lines[i] = ln[:j] + "export " + ln[j:]
        break
    return "".join(lines)


def main() -> None:
    out = DEMO / "js"
    out.mkdir(parents=True, exist_ok=True)
    for rel, a, b, kind in SLICES:
        body = add_export(slice_lines(a, b))
        path = out / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(HEAD[kind] + body, encoding="utf-8")
        print("wrote", path.relative_to(ROOT))


if __name__ == "__main__":
    main()
