// units.js
// =============================================================================
// Umrechnung der Mengenangaben. TheCocktailDB liefert Mengen überwiegend im
// imperialen System (oz, cups, tsp …). Hauptanzeige der Seite ist jedoch
// metrisch (ml); imperial bleibt optional über einen Umschalter verfügbar.
//
// formatMeasure(measure, system):
//   - "metric"   → in Milliliter umgerechnet (wo eine Einheit erkennbar ist)
//   - "imperial" → die Originalangabe der Datenbank (unverändert)
// Nicht umrechenbare Angaben ("Juice of 1 Lime", "Dash", "1 part") bleiben in
// beiden Systemen unverändert stehen.
// =============================================================================

// Erkennbare Einheiten → Milliliter pro Einheit. Reihenfolge ist wichtig:
// spezifischere Muster (z. B. "tblsp") vor kürzeren (z. B. "tsp"/"l") prüfen.
const UNIT_TO_ML = [
  [/\bml\b|milliliter/,                 1],
  [/\bcl\b|centiliter/,                10],
  [/\bdl\b|deciliter/,                100],
  [/\boz\b|ounce/,                     30],   // 1 oz ≈ 30 ml (konsistent mit flavor.js)
  [/\bjigger/,                         45],
  [/\bshot/,                           45],
  [/\btblsp|tbsp|tablespoon/,          15],   // "tblsp" ist die DB-Schreibweise
  [/\btsp|teaspoon/,                    5],
  [/\bcups?\b/,                       240],
  [/\bpint/,                          473],
  [/\bquart/,                         946],
];

// Liest eine führende Mengenzahl: gemischter Bruch ("1 1/2"), reiner Bruch
// ("3/4"), Dezimal/Ganzzahl ("2", "2.5"). Gibt die Zahl oder null zurück.
function parseAmount(token) {
  const t = token.trim();
  const mixed = t.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)/);
  if (mixed) return parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / parseInt(mixed[3], 10);
  const frac = t.match(/^(\d+)\s*\/\s*(\d+)/);
  if (frac) return parseInt(frac[1], 10) / parseInt(frac[2], 10);
  const dec = t.match(/^(\d+(?:\.\d+)?)/);
  if (dec) return parseFloat(dec[1]);
  return null;
}

// Rundet Milliliter auf eine saubere, gut lesbare Zahl.
function roundMl(ml) {
  if (ml >= 100) return Math.round(ml / 10) * 10; // grobe Schritte für große Mengen
  return Math.round(ml);
}

// Wandelt eine einzelne Mengenangabe nach Milliliter. Erkennt auch Bereiche
// wie "2-3 oz" → "60-90 ml". Ohne erkennbare Einheit bleibt der Text gleich.
export function toMetric(measure) {
  if (!measure) return measure;
  const original = String(measure).trim();
  const lower = original.toLowerCase();

  // Passende Einheit (und damit den ml-Faktor) bestimmen.
  let factor = null;
  for (const [pattern, ml] of UNIT_TO_ML) {
    if (pattern.test(lower)) { factor = ml; break; }
  }
  if (factor === null) return original; // keine umrechenbare Einheit

  // Bereich "a - b" zuerst behandeln (z. B. "2-3 oz", "1 1/2 - 2 oz").
  const range = lower.match(
    /^(\d+(?:\s+\d+\s*\/\s*\d+|\s*\/\s*\d+|\.\d+)?)\s*-\s*(\d+(?:\s+\d+\s*\/\s*\d+|\s*\/\s*\d+|\.\d+)?)/
  );
  if (range) {
    const a = parseAmount(range[1]);
    const b = parseAmount(range[2]);
    if (a !== null && b !== null) return `${roundMl(a * factor)}–${roundMl(b * factor)} ml`;
  }

  const amount = parseAmount(lower);
  if (amount === null) return original; // Einheit ohne Zahl → unverändert lassen

  return `${roundMl(amount * factor)} ml`;
}

// Liefert die Anzeige je nach gewähltem System.
export function formatMeasure(measure, system) {
  if (system === "imperial") return String(measure ?? "").trim();
  return toMetric(measure);
}
