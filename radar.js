// radar.js
// =============================================================================
// Selbst gebautes SVG-Radardiagramm (Netzdiagramm) für das Geschmacksprofil.
// Keine externe Bibliothek – das SVG wird direkt aus den Werten erzeugt, damit
// es voll zum Look der Seite passt.
// =============================================================================

const SVG_NS = "http://www.w3.org/2000/svg";

// Hilfsfunktion: Punkt auf einem Kreis. Achse 0 zeigt nach oben (-90°),
// danach im Uhrzeigersinn gleichmäßig verteilt.
function pointOnAxis(cx, cy, radius, index, total) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function el(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// -----------------------------------------------------------------------------
// Zeichnet das Radardiagramm.
// values: Array von 8 Werten (0–100), in Reihenfolge von AXES.
// axes:   Array von 8 Achsen-Labels (deutsch).
// Rückgabe: <svg>-Element zum Einhängen ins DOM.
// -----------------------------------------------------------------------------
export function renderRadar(values, axes) {
  const size = 360;          // ViewBox-Größe (quadratisch)
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size / 2 - 56; // Platz für Labels am Rand lassen
  const total = axes.length;
  const rings = [20, 40, 60, 80, 100];

  const svg = el("svg", {
    viewBox: `0 0 ${size} ${size}`,
    class: "radar",
    role: "img",
    "aria-label": "Geschmacksrad: " +
      axes.map((a, i) => `${a} ${values[i]} von 100`).join(", "),
  });

  // --- Gitternetz-Ringe (als Polygone, da Achsen eckig sind) ---
  const gridGroup = el("g", { class: "radar-grid" });
  for (const ring of rings) {
    const r = (ring / 100) * maxRadius;
    const pts = [];
    for (let i = 0; i < total; i++) {
      const p = pointOnAxis(cx, cy, r, i, total);
      pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
    gridGroup.appendChild(el("polygon", {
      points: pts.join(" "),
      class: "radar-ring",
    }));
  }
  svg.appendChild(gridGroup);

  // --- Achsenlinien + Skalen-Beschriftung (auf der obersten Achse) ---
  const axisGroup = el("g", { class: "radar-axes" });
  for (let i = 0; i < total; i++) {
    const outer = pointOnAxis(cx, cy, maxRadius, i, total);
    axisGroup.appendChild(el("line", {
      x1: cx, y1: cy, x2: outer.x.toFixed(1), y2: outer.y.toFixed(1),
      class: "radar-axis-line",
    }));
  }
  // kleine Zahlen für die Ringe entlang der senkrechten Achse nach oben
  for (const ring of rings) {
    const r = (ring / 100) * maxRadius;
    const label = el("text", {
      x: cx + 4, y: (cy - r).toFixed(1),
      class: "radar-ring-label",
    });
    label.textContent = String(ring);
    axisGroup.appendChild(label);
  }
  svg.appendChild(axisGroup);

  // --- Datenpolygon (gefüllt, halbtransparent) ---
  const dataPts = [];
  for (let i = 0; i < total; i++) {
    const r = (values[i] / 100) * maxRadius;
    const p = pointOnAxis(cx, cy, r, i, total);
    dataPts.push(p);
  }
  svg.appendChild(el("polygon", {
    points: dataPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "),
    class: "radar-area",
  }));

  // --- Datenpunkte mit Hover-Tooltip (über <title>) ---
  const dotGroup = el("g", { class: "radar-dots" });
  for (let i = 0; i < total; i++) {
    const dot = el("circle", {
      cx: dataPts[i].x.toFixed(1), cy: dataPts[i].y.toFixed(1), r: 4,
      class: "radar-dot", tabindex: "0",
      "aria-label": `${axes[i]}: ${values[i]} von 100`,
    });
    const title = el("title");
    title.textContent = `${axes[i]}: ${values[i]}`;
    dot.appendChild(title);
    dotGroup.appendChild(dot);
  }
  svg.appendChild(dotGroup);

  // --- Achsen-Labels (deutsch) am äußeren Rand ---
  const labelGroup = el("g", { class: "radar-labels" });
  for (let i = 0; i < total; i++) {
    const p = pointOnAxis(cx, cy, maxRadius + 22, i, total);
    const text = el("text", {
      x: p.x.toFixed(1), y: p.y.toFixed(1),
      class: "radar-label",
      "text-anchor": labelAnchor(p.x, cx),
      "dominant-baseline": labelBaseline(p.y, cy),
    });
    text.textContent = `${axes[i]}`;
    const value = el("tspan", {
      x: p.x.toFixed(1), dy: "1.1em", class: "radar-label-value",
    });
    value.textContent = String(values[i]);
    text.appendChild(value);
    labelGroup.appendChild(text);
  }
  svg.appendChild(labelGroup);

  return svg;
}

// Textausrichtung je nach Position relativ zur Mitte, damit Labels nicht
// über den Rand laufen.
function labelAnchor(x, cx) {
  if (x < cx - 5) return "end";
  if (x > cx + 5) return "start";
  return "middle";
}
function labelBaseline(y, cy) {
  if (y < cy - 5) return "auto";
  if (y > cy + 5) return "hanging";
  return "middle";
}
