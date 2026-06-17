// flavor.js
// =============================================================================
// Berechnung des individuellen Geschmacksrads aus den Zutaten eines Cocktails.
//
// TheCocktailDB liefert KEINE Geschmacksdaten. Wir berechnen das Profil lokal
// und deterministisch: jede bekannte Zutat hat einen Vektor über 8 Achsen
// (Werte 0–10). Die Vektoren aller Zutaten werden gewichtet (grob nach Menge)
// aggregiert, gegen ein festes Referenzmaximum skaliert und auf 0–100 geclampt.
// Dadurch sind verschiedene Cocktails untereinander vergleichbar.
// =============================================================================

// Reihenfolge der Achsen ist fix – sie bestimmt die Indizes in jedem Vektor.
export const AXES = [
  "Süße",
  "Säure",
  "Bitter",
  "Stärke",          // alkoholische Stärke
  "Fruchtig",
  "Kräuter",         // Kräuter/Botanisch
  "Würzig",          // Würzig/Scharf
  "Cremig",
];

// Achsen-Index-Helfer für die Lesbarkeit der Tabelle.
const SWEET = 0, SOUR = 1, BITTER = 2, STRENGTH = 3,
      FRUIT = 4, HERBAL = 5, SPICY = 6, CREAMY = 7;

// Erzeugt einen Null-Vektor und setzt einzelne Achsen.
function vec(values) {
  const v = [0, 0, 0, 0, 0, 0, 0, 0];
  for (const [axis, val] of values) v[axis] = val;
  return v;
}

// -----------------------------------------------------------------------------
// Nachschlagetabelle: Zutatenname (kleingeschrieben) → Geschmacksvektor 0–10.
// Schlüssel sind Teilstrings; beim Lookup wird auf "enthält" geprüft, damit
// z. B. "Light rum" und "Dark rum" beide auf "rum" matchen.
// Leicht erweiterbar: einfach neue Zeilen ergänzen.
// -----------------------------------------------------------------------------
const INGREDIENT_TABLE = [
  // --- Basisspirituosen: hohe Stärke ---
  ["tequila",      vec([[STRENGTH, 9], [HERBAL, 2]])],
  ["vodka",        vec([[STRENGTH, 9]])],
  ["wodka",        vec([[STRENGTH, 9]])],
  ["gin",          vec([[STRENGTH, 8], [HERBAL, 6]])],
  ["dark rum",     vec([[STRENGTH, 8], [SWEET, 3]])],
  ["light rum",    vec([[STRENGTH, 8], [SWEET, 2]])],
  ["spiced rum",   vec([[STRENGTH, 8], [SWEET, 3], [SPICY, 3]])],
  ["white rum",    vec([[STRENGTH, 8], [SWEET, 2]])],
  ["rum",          vec([[STRENGTH, 8], [SWEET, 2]])],
  ["bourbon",      vec([[STRENGTH, 8], [SWEET, 2]])],
  ["scotch",       vec([[STRENGTH, 8], [BITTER, 2]])],
  ["whiskey",      vec([[STRENGTH, 8]])],
  ["whisky",       vec([[STRENGTH, 8]])],
  ["brandy",       vec([[STRENGTH, 8], [FRUIT, 2], [SWEET, 2]])],
  ["cognac",       vec([[STRENGTH, 8], [FRUIT, 2], [SWEET, 2]])],
  ["absinthe",     vec([[STRENGTH, 10], [HERBAL, 8]])],
  ["cachaca",      vec([[STRENGTH, 8], [HERBAL, 2]])],
  ["cachaça",      vec([[STRENGTH, 8], [HERBAL, 2]])],
  ["sake",         vec([[STRENGTH, 4], [SWEET, 2]])],

  // --- Liköre / süße Spirituosen ---
  ["triple sec",   vec([[SWEET, 6], [FRUIT, 6], [STRENGTH, 4]])],
  ["cointreau",    vec([[SWEET, 6], [FRUIT, 6], [STRENGTH, 4]])],
  ["grand marnier",vec([[SWEET, 6], [FRUIT, 6], [STRENGTH, 5]])],
  ["curacao",      vec([[SWEET, 6], [FRUIT, 6], [STRENGTH, 4]])],
  ["amaretto",     vec([[SWEET, 7], [STRENGTH, 4], [SPICY, 2]])],
  ["kahlua",       vec([[SWEET, 7], [STRENGTH, 3], [BITTER, 3]])], // Kaffeelikör
  ["coffee liqueur",vec([[SWEET, 7], [STRENGTH, 3], [BITTER, 3]])],
  ["baileys",      vec([[SWEET, 6], [CREAMY, 8], [STRENGTH, 3]])],
  ["irish cream",  vec([[SWEET, 6], [CREAMY, 8], [STRENGTH, 3]])],
  ["midori",       vec([[SWEET, 8], [FRUIT, 7], [STRENGTH, 3]])],
  ["melon liqueur",vec([[SWEET, 8], [FRUIT, 7], [STRENGTH, 3]])],
  ["peach schnapps",vec([[SWEET, 8], [FRUIT, 8], [STRENGTH, 3]])],
  ["schnapps",     vec([[SWEET, 7], [FRUIT, 5], [STRENGTH, 4]])],
  ["maraschino",   vec([[SWEET, 7], [FRUIT, 5], [STRENGTH, 4]])],
  ["chambord",     vec([[SWEET, 8], [FRUIT, 8], [STRENGTH, 3]])],
  ["sambuca",      vec([[SWEET, 7], [HERBAL, 6], [STRENGTH, 5]])],
  ["limoncello",   vec([[SWEET, 7], [SOUR, 5], [FRUIT, 6], [STRENGTH, 3]])],
  ["southern comfort", vec([[SWEET, 6], [FRUIT, 5], [STRENGTH, 5]])],
  ["drambuie",     vec([[SWEET, 7], [HERBAL, 4], [STRENGTH, 5]])],
  ["benedictine",  vec([[SWEET, 6], [HERBAL, 7], [STRENGTH, 5]])],
  ["frangelico",   vec([[SWEET, 7], [STRENGTH, 3], [SPICY, 2]])],
  ["galliano",     vec([[SWEET, 6], [HERBAL, 6], [STRENGTH, 4]])],

  // --- Bitter / Aperitifs ---
  ["campari",      vec([[BITTER, 9], [HERBAL, 4], [STRENGTH, 4]])],
  ["aperol",       vec([[BITTER, 6], [SWEET, 4], [FRUIT, 4], [STRENGTH, 2]])],
  ["angostura",    vec([[BITTER, 9], [HERBAL, 6], [SPICY, 3]])],
  ["bitters",      vec([[BITTER, 8], [HERBAL, 5], [SPICY, 2]])],
  ["sweet vermouth",vec([[BITTER, 4], [HERBAL, 6], [SWEET, 4], [STRENGTH, 2]])],
  ["dry vermouth", vec([[BITTER, 4], [HERBAL, 6], [STRENGTH, 2]])],
  ["vermouth",     vec([[BITTER, 4], [HERBAL, 6], [STRENGTH, 2]])],
  ["aperitif",     vec([[BITTER, 6], [HERBAL, 5]])],

  // --- Säfte & Früchte ---
  ["lime juice",   vec([[SOUR, 9], [FRUIT, 3]])],
  ["lime",         vec([[SOUR, 8], [FRUIT, 3]])],
  ["lemon juice",  vec([[SOUR, 9], [FRUIT, 3]])],
  ["lemon",        vec([[SOUR, 8], [FRUIT, 3]])],
  ["orange juice", vec([[FRUIT, 7], [SOUR, 3], [SWEET, 3]])],
  ["orange",       vec([[FRUIT, 6], [SOUR, 2], [SWEET, 2]])],
  ["pineapple juice", vec([[FRUIT, 8], [SWEET, 4], [SOUR, 2]])],
  ["pineapple",    vec([[FRUIT, 8], [SWEET, 4]])],
  ["cranberry",    vec([[FRUIT, 6], [SOUR, 5]])],
  ["grapefruit",   vec([[FRUIT, 5], [SOUR, 6], [BITTER, 3]])],
  ["tomato juice", vec([[FRUIT, 3], [SOUR, 3], [SPICY, 1]])],
  ["apple juice",  vec([[FRUIT, 6], [SWEET, 4]])],
  ["apple",        vec([[FRUIT, 6], [SWEET, 3]])],
  ["passion fruit",vec([[FRUIT, 8], [SOUR, 4], [SWEET, 3]])],
  ["mango",        vec([[FRUIT, 8], [SWEET, 5]])],
  ["banana",       vec([[FRUIT, 6], [SWEET, 5], [CREAMY, 3]])],
  ["strawberr",    vec([[FRUIT, 8], [SWEET, 4]])],
  ["raspberr",     vec([[FRUIT, 7], [SOUR, 3], [SWEET, 3]])],
  ["peach",        vec([[FRUIT, 8], [SWEET, 4]])],
  ["cherry",       vec([[FRUIT, 6], [SWEET, 4]])],
  ["coconut",      vec([[CREAMY, 6], [SWEET, 5], [FRUIT, 3]])],
  ["berries",      vec([[FRUIT, 7], [SWEET, 3], [SOUR, 2]])],

  // --- Süßungsmittel & Sirupe ---
  ["sugar syrup",  vec([[SWEET, 9]])],
  ["simple syrup", vec([[SWEET, 9]])],
  ["sugar",        vec([[SWEET, 9]])],
  ["honey",        vec([[SWEET, 8], [HERBAL, 1]])],
  ["agave",        vec([[SWEET, 8]])],
  ["grenadine",    vec([[SWEET, 8], [FRUIT, 4]])],
  ["gomme",        vec([[SWEET, 9]])],
  ["maple",        vec([[SWEET, 8]])],
  ["orgeat",       vec([[SWEET, 7], [SPICY, 2]])], // Mandelsirup
  ["syrup",        vec([[SWEET, 8]])],

  // --- Milchprodukte / cremig ---
  ["heavy cream",  vec([[CREAMY, 9], [SWEET, 2]])],
  ["cream of coconut", vec([[CREAMY, 8], [SWEET, 6], [FRUIT, 3]])],
  ["coconut cream",vec([[CREAMY, 8], [SWEET, 6], [FRUIT, 3]])],
  ["cream",        vec([[CREAMY, 9], [SWEET, 2]])],
  ["milk",         vec([[CREAMY, 7], [SWEET, 2]])],
  ["coconut milk", vec([[CREAMY, 7], [SWEET, 4], [FRUIT, 3]])],
  ["egg white",    vec([[CREAMY, 5]])],
  ["egg yolk",     vec([[CREAMY, 6]])],
  ["egg",          vec([[CREAMY, 5]])],
  ["ice cream",    vec([[CREAMY, 9], [SWEET, 7]])],
  ["yoghurt",      vec([[CREAMY, 7], [SOUR, 3]])],
  ["butter",       vec([[CREAMY, 8]])],
  ["condensed milk",vec([[CREAMY, 8], [SWEET, 7]])],

  // --- Kräuter / botanisch ---
  ["mint",         vec([[HERBAL, 9]])],
  ["basil",        vec([[HERBAL, 9]])],
  ["rosemary",     vec([[HERBAL, 8], [SPICY, 1]])],
  ["thyme",        vec([[HERBAL, 8]])],
  ["sage",         vec([[HERBAL, 8]])],
  ["lavender",     vec([[HERBAL, 8]])],
  ["elderflower",  vec([[HERBAL, 6], [SWEET, 4], [FRUIT, 3]])],
  ["cucumber",     vec([[HERBAL, 5]])],

  // --- Würzig / scharf ---
  ["ginger",       vec([[SPICY, 7], [HERBAL, 2]])],
  ["ginger beer",  vec([[SPICY, 5], [SWEET, 4]])], // Frisch-Anteil via Heuristik unten
  ["ginger ale",   vec([[SPICY, 3], [SWEET, 5]])],
  ["pepper",       vec([[SPICY, 8]])],
  ["chili",        vec([[SPICY, 9]])],
  ["tabasco",      vec([[SPICY, 9], [SOUR, 2]])],
  ["cinnamon",     vec([[SPICY, 6], [SWEET, 2]])],
  ["nutmeg",       vec([[SPICY, 5]])],
  ["clove",        vec([[SPICY, 6], [HERBAL, 2]])],
  ["worcestershire", vec([[SPICY, 5], [SOUR, 3], [BITTER, 2]])],
  ["horseradish",  vec([[SPICY, 8]])],

  // --- Spritzig / Filler (Frisch wird über Heuristik abgebildet, siehe unten) ---
  ["soda water",   vec([])],
  ["club soda",    vec([])],
  ["tonic",        vec([[BITTER, 3]])],
  ["sparkling",    vec([[SOUR, 2]])],
  ["champagne",    vec([[SOUR, 3], [STRENGTH, 3]])],
  ["prosecco",     vec([[SOUR, 3], [STRENGTH, 2], [SWEET, 2]])],
  ["cola",         vec([[SWEET, 6], [SPICY, 1]])],
  ["lemonade",     vec([[SWEET, 5], [SOUR, 3]])],
  ["water",        vec([])],

  // --- Sonstiges / Wein / Bier ---
  ["red wine",     vec([[STRENGTH, 4], [FRUIT, 3], [BITTER, 2]])],
  ["white wine",   vec([[STRENGTH, 3], [SOUR, 3], [FRUIT, 2]])],
  ["beer",         vec([[STRENGTH, 2], [BITTER, 3]])],
  ["coffee",       vec([[BITTER, 6]])],
  ["espresso",     vec([[BITTER, 7]])],
  ["tea",          vec([[BITTER, 3], [HERBAL, 3]])],
  ["chocolate",    vec([[SWEET, 6], [CREAMY, 3], [BITTER, 2]])],
  ["cocoa",        vec([[SWEET, 5], [BITTER, 3], [CREAMY, 2]])],
  ["vanilla",      vec([[SWEET, 5], [CREAMY, 3]])],
  ["salt",         vec([[SPICY, 1]])],
];

// "Frisch/Spritzig" ist optional als 9. Achse vorgesehen. Wir halten die
// Berechnung bei 8 Achsen, bilden den Spritzig-Charakter aber über eine kleine
// Erhöhung der Säure ab, damit Soda/Tonic nicht völlig flach wirken.
// (Wer 9 Achsen will, kann FRESH hier ergänzen.)

// -----------------------------------------------------------------------------
// Schlüsselwort-Heuristik für Zutaten, die nicht in der Tabelle stehen.
// Greift auf Wortbestandteile des Namens zurück.
// -----------------------------------------------------------------------------
function heuristicVector(nameLower) {
  const v = [0, 0, 0, 0, 0, 0, 0, 0];
  let matched = false;
  const add = (axis, val) => { v[axis] += val; matched = true; };

  if (nameLower.includes("juice"))   { add(FRUIT, 6); add(SOUR, 3); }
  if (nameLower.includes("syrup") || nameLower.includes("sugar")) add(SWEET, 8);
  if (nameLower.includes("liqueur")) { add(SWEET, 6); add(STRENGTH, 3); }
  if (nameLower.includes("bitter"))  add(BITTER, 7);
  if (nameLower.includes("cream") || nameLower.includes("milk")) add(CREAMY, 7);
  if (nameLower.includes("soda") || nameLower.includes("tonic") ||
      nameLower.includes("sparkling")) add(SOUR, 2);
  if (nameLower.includes("wine"))    { add(STRENGTH, 3); add(FRUIT, 2); }
  if (nameLower.includes("vodka") || nameLower.includes("whisk") ||
      nameLower.includes("rum") || nameLower.includes("gin") ||
      nameLower.includes("tequila") || nameLower.includes("brandy")) add(STRENGTH, 7);
  if (nameLower.includes("mint") || nameLower.includes("herb") ||
      nameLower.includes("basil")) add(HERBAL, 7);

  // Komplett unbekannt: neutraler Mini-Vektor, damit das Rad nicht verzerrt.
  if (!matched) return { vector: [1, 1, 1, 1, 1, 1, 1, 1].map(x => x * 0.5), known: false };
  return { vector: v, known: true };
}

// Liefert für einen Zutatennamen den Geschmacksvektor (Tabelle → Heuristik).
function lookupIngredient(name) {
  const lower = name.trim().toLowerCase();
  for (const [key, vector] of INGREDIENT_TABLE) {
    if (lower.includes(key)) return { vector: vector.slice(), known: true };
  }
  return heuristicVector(lower);
}

// -----------------------------------------------------------------------------
// Mengen-Parser: versucht aus strMeasure ein grobes relatives Gewicht zu lesen.
// Erkennt Zahlen inkl. Brüche ("1 1/2", "3/4") und Einheiten (oz/ml/cl/part).
// Gibt ein Gewicht zurück; bei Nicht-Erkennung null (→ Gleichgewichtung).
// -----------------------------------------------------------------------------
export function parseMeasure(measure) {
  if (!measure) return null;
  const m = measure.toLowerCase().trim();

  // Summe aus Ganzzahl + Bruch, z. B. "1 1/2", "1/2", "2".
  let amount = 0;
  let found = false;

  // gemischter Bruch "1 1/2"
  const mixed = m.match(/(\d+)\s+(\d+)\s*\/\s*(\d+)/);
  if (mixed) {
    amount = parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / parseInt(mixed[3], 10);
    found = true;
  } else {
    const frac = m.match(/(\d+)\s*\/\s*(\d+)/); // reiner Bruch "3/4"
    if (frac) {
      amount = parseInt(frac[1], 10) / parseInt(frac[2], 10);
      found = true;
    } else {
      const dec = m.match(/(\d+(?:\.\d+)?)/); // Dezimal/Ganzzahl
      if (dec) { amount = parseFloat(dec[1]); found = true; }
    }
  }

  if (!found) {
    // "dash", "splash", "to taste" etc. → kleine feste Menge.
    if (/dash|splash|drop|twist|wedge|slice|garnish|top/.test(m)) return 0.3;
    return null;
  }

  // Einheit grob in eine gemeinsame Skala (≈ oz) bringen.
  let unitFactor = 1;
  if (/\bml\b/.test(m))         unitFactor = 1 / 30;   // 30 ml ≈ 1 oz
  else if (/\bcl\b/.test(m))    unitFactor = 1 / 3;    // 3 cl ≈ 1 oz
  else if (/\boz\b/.test(m))    unitFactor = 1;
  else if (/\bpart/.test(m))    unitFactor = 1;        // "1 part" ≈ 1 Einheit
  else if (/\bcup/.test(m))     unitFactor = 8;
  else if (/\btsp|teaspoon/.test(m)) unitFactor = 1 / 6;
  else if (/\btbsp|tblsp|tablespoon/.test(m)) unitFactor = 1 / 2; // "tblsp" ist die DB-Schreibweise
  else if (/shot/.test(m))      unitFactor = 1.5;

  const weight = amount * unitFactor;
  // Plausibel begrenzen, damit Ausreißer ("8 cups") nicht alles dominieren.
  return Math.min(Math.max(weight, 0.1), 6);
}

// Basisspirituosen dürfen etwas stärker gewichtet werden (prägen den Charakter).
function isBaseSpirit(nameLower) {
  return /(tequila|vodka|wodka|gin|rum|bourbon|whisk|scotch|brandy|cognac|cachac|absinthe)/.test(nameLower);
}

// Referenzmaximum pro Achse: erfahrungsbasierter Wert, gegen den skaliert wird,
// um aggregierte Punkte in den Bereich 0–100 zu bringen. Bewusst fix, damit
// Cocktails untereinander vergleichbar bleiben.
const REFERENCE_MAX = 22;

// -----------------------------------------------------------------------------
// Hauptfunktion: berechnet das Geschmacksprofil aus einer Zutatenliste.
// ingredients: Array von { name, measure }.
// Rückgabe: { values: number[8] (0–100), summary: string }.
// -----------------------------------------------------------------------------
export function computeFlavorProfile(ingredients) {
  const totals = [0, 0, 0, 0, 0, 0, 0, 0];

  // Falls gar keine Menge erkennbar ist, nutzen wir Gleichgewichtung.
  const parsedWeights = ingredients.map(ing => parseMeasure(ing.measure));
  const anyWeight = parsedWeights.some(w => w !== null);

  ingredients.forEach((ing, i) => {
    const nameLower = (ing.name || "").toLowerCase();
    const { vector } = lookupIngredient(ing.name || "");

    // Gewicht bestimmen: erkannte Menge, sonst 1 (Gleichgewichtung).
    let weight = anyWeight ? (parsedWeights[i] ?? 1) : 1;
    if (isBaseSpirit(nameLower)) weight *= 1.3; // Basisspirituose leicht stärker.

    for (let a = 0; a < 8; a++) totals[a] += vector[a] * weight;
  });

  // Skalieren gegen festes Referenzmaximum → 0–100, clampen, runden.
  const values = totals.map(t => {
    const scaled = (t / REFERENCE_MAX) * 100;
    return Math.round(Math.min(Math.max(scaled, 0), 100));
  });

  return { values, summary: summarize(values) };
}

// Kurze deutsche Textzusammenfassung der zwei dominantesten Achsen + Stärke.
function summarize(values) {
  const labeled = values.map((v, i) => ({ axis: AXES[i], v }));
  const sorted = [...labeled].sort((a, b) => b.v - a.v);
  const top = sorted.filter(x => x.v >= 25).slice(0, 2).map(x => x.axis.toLowerCase());

  const strength = values[STRENGTH];
  let strengthText;
  if (strength >= 66) strengthText = "hohe Stärke";
  else if (strength >= 33) strengthText = "mittlere Stärke";
  else if (strength > 5) strengthText = "geringe Stärke";
  else strengthText = "alkoholfrei wirkend";

  if (top.length === 0) return `Ausgewogenes Profil, ${strengthText}.`;
  if (top.length === 1) return `Vor allem ${top[0]}, ${strengthText}.`;
  return `Ausgewogen ${top[0]}-${top[1]}, ${strengthText}.`;
}
