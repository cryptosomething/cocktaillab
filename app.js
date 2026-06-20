// app.js
// =============================================================================
// UI-Steuerung, API-Aufrufe und Modal-Logik für die Cocktail-Seite.
// =============================================================================

import { AXES, computeFlavorProfile } from "./flavor.js";
import { renderRadar } from "./radar.js";
import { formatMeasure } from "./units.js";

const API = "https://www.thecocktaildb.com/api/json/v1/1/";

// Gewähltes Maßsystem: metrisch (Hauptanzeige) oder imperial (optional).
// Auswahl wird – wenn möglich – über localStorage gemerkt.
let unitSystem = readStoredUnitSystem();

function readStoredUnitSystem() {
  try {
    return localStorage.getItem("unitSystem") === "imperial" ? "imperial" : "metric";
  } catch {
    return "metric";
  }
}
function storeUnitSystem(sys) {
  try { localStorage.setItem("unitSystem", sys); } catch { /* z. B. file:// ohne Storage */ }
}

// --- DOM-Referenzen ---
const els = {
  // Reiter / Ansichten
  tabs:          document.querySelectorAll(".tab"),
  viewDiscover:  document.getElementById("view-discover"),
  viewAll:       document.getElementById("view-all"),
  viewFlavor:    document.getElementById("view-flavor"),
  // Entdecken-Ansicht
  search:        document.getElementById("search-input"),
  randomBtn:     document.getElementById("random-btn"),
  filterCat:     document.getElementById("filter-category"),
  filterGlass:   document.getElementById("filter-glass"),
  filterAlc:     document.getElementById("filter-alcohol"),
  // Alle-Cocktails-Ansicht
  alphabet:      document.getElementById("alphabet"),
  // Geschmack-finden-Ansicht
  flavorChips:   document.getElementById("flavor-chips"),
  flavorCount:   document.getElementById("flavor-count"),
  flavorFindBtn: document.getElementById("flavor-find-btn"),
  flavorResetBtn:document.getElementById("flavor-reset-btn"),
  // Modal
  modal:         document.getElementById("modal"),
  modalBody:     document.getElementById("modal-body"),
};

// Zustands-/Anzeige-Elemente je Ansicht gebündelt, damit die generischen
// Render-Helfer wissen, wohin sie schreiben.
const discoverCtx = {
  status:  document.getElementById("result-status"),
  loading: document.getElementById("loading"),
  error:   document.getElementById("error"),
  empty:   document.getElementById("empty"),
  results: document.getElementById("results"),
};
const allCtx = {
  status:  document.getElementById("all-status"),
  loading: document.getElementById("all-loading"),
  error:   document.getElementById("all-error"),
  empty:   document.getElementById("all-empty"),
  results: document.getElementById("all-results"),
};
const flavorCtx = {
  status:  document.getElementById("flavor-status"),
  loading: document.getElementById("flavor-loading"),
  error:   document.getElementById("flavor-error"),
  empty:   document.getElementById("flavor-empty"),
  results: document.getElementById("flavor-results"),
};

// =============================================================================
// API-Schicht
// =============================================================================

// Generischer fetch-Wrapper mit Fehlerbehandlung.
async function apiGet(path) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(`Serverfehler ${res.status}`);
  return res.json();
}

// Cache für list.php-Ergebnisse (ändern sich praktisch nie).
const listCache = new Map();
async function getList(type) {
  if (listCache.has(type)) return listCache.get(type);
  const data = await apiGet(`list.php?${type}=list`);
  const arr = data?.drinks ?? [];
  listCache.set(type, arr);
  return arr;
}

// =============================================================================
// Datenaufbereitung
// =============================================================================

// Sicheres Anzeigen: null/leere Werte werden zu Fallback.
function safe(value, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  return s === "" ? fallback : s;
}

// Thumbnail in gewünschter Größe (small/medium/large) – defensiv bei null.
function thumb(url, size = "medium") {
  if (!url) return placeholderImg();
  return `${url}/${size}`;
}

// Inline-Platzhalter (SVG-Data-URI), falls kein Bild vorhanden ist.
function placeholderImg() {
  return "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>
       <rect width='100%' height='100%' fill='#2a231d'/>
       <text x='50%' y='50%' fill='#b7a99a' font-size='48' text-anchor='middle' dominant-baseline='middle'>🍸</text>
     </svg>`
  );
}

// Zutaten-Bild-URL (Zutatenname URL-kodiert).
function ingredientImg(name) {
  return `https://www.thecocktaildb.com/images/ingredients/${encodeURIComponent(name)}-small.png`;
}

// Extrahiert die bis zu 15 Zutat/Mengen-Paare aus einem vollständigen Drink.
// Nur nicht-leere Zutaten werden übernommen, alles getrimmt.
function extractIngredients(drink) {
  const list = [];
  for (let i = 1; i <= 15; i++) {
    const name = drink[`strIngredient${i}`];
    const measure = drink[`strMeasure${i}`];
    if (name && String(name).trim() !== "") {
      list.push({
        name: String(name).trim(),
        measure: measure ? String(measure).trim() : "",
      });
    }
  }
  return list;
}

// Bevorzugt deutsche Anleitung, fällt auf Englisch zurück.
function getInstructions(drink) {
  return safe(drink.strInstructionsDE, "") || safe(drink.strInstructions, "Keine Anleitung verfügbar.");
}

// =============================================================================
// UI-Zustände (generisch pro Ansicht über ctx)
// =============================================================================

function showLoading(ctx, on) { ctx.loading.classList.toggle("hidden", !on); }
function showError(ctx, msg) {
  ctx.error.textContent = msg || "";
  ctx.error.classList.toggle("hidden", !msg);
}
function showEmpty(ctx, on) { ctx.empty.classList.toggle("hidden", !on); }
function setStatus(ctx, text) { ctx.status.textContent = text || ""; }

function clearResults(ctx) {
  ctx.results.innerHTML = "";
  showError(ctx, "");
  showEmpty(ctx, false);
}

// =============================================================================
// Ergebnis-Grid rendern (in das Grid der jeweiligen Ansicht)
// =============================================================================

// drinks: Array von Objekten mit mind. idDrink, strDrink, strDrinkThumb.
function renderResults(ctx, drinks, { foundLabel = "gefunden" } = {}) {
  clearResults(ctx);
  if (!drinks || drinks.length === 0) {
    showEmpty(ctx, true);
    setStatus(ctx, "Keine Treffer.");
    return;
  }
  setStatus(ctx, `${drinks.length} Cocktail${drinks.length === 1 ? "" : "s"} ${foundLabel}.`);

  const frag = document.createDocumentFragment();
  for (const d of drinks) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "card";
    card.dataset.id = d.idDrink;

    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = thumb(d.strDrinkThumb, "medium");
    img.alt = `Foto von ${safe(d.strDrink, "Cocktail")}`;
    img.addEventListener("error", () => { img.src = placeholderImg(); }, { once: true });

    const name = document.createElement("span");
    name.className = "card-name";
    name.textContent = safe(d.strDrink, "Unbekannter Cocktail");

    card.append(img, name);
    card.addEventListener("click", () => openDetail(d.idDrink));
    frag.appendChild(card);
  }
  ctx.results.appendChild(frag);
}

// =============================================================================
// Such- & Filterabläufe (Entdecken-Ansicht)
// =============================================================================

// Voller Such-Lookup nach Name (search.php liefert komplette Objekte).
async function searchByName(name) {
  clearResults(discoverCtx);
  showLoading(discoverCtx, true);
  setStatus(discoverCtx, `Suche nach „${name}“…`);
  try {
    const data = await apiGet(`search.php?s=${encodeURIComponent(name)}`);
    renderResults(discoverCtx, data.drinks);
  } catch (e) {
    showError(discoverCtx, `Suche fehlgeschlagen: ${e.message}`);
    setStatus(discoverCtx, "");
  } finally {
    showLoading(discoverCtx, false);
  }
}

// Beim Start / leerer Suche: eine Auswahl beliebter Cocktails zeigen.
// filter.php?c=Cocktail liefert in einem Aufruf viele Klassiker.
async function loadPopular() {
  clearResults(discoverCtx);
  showLoading(discoverCtx, true);
  setStatus(discoverCtx, "Lade beliebte Cocktails…");
  try {
    const data = await apiGet("filter.php?c=Cocktail");
    const drinks = (data.drinks ?? []).slice(0, 24); // erste 24 als Startauswahl
    renderResults(discoverCtx, drinks, { foundLabel: "zum Entdecken" });
    setStatus(discoverCtx, "Beliebte Cocktails – such oben oder öffne einen Cocktail.");
  } catch (e) {
    showError(discoverCtx, `Cocktails konnten nicht geladen werden: ${e.message}`);
    setStatus(discoverCtx, "");
  } finally {
    showLoading(discoverCtx, false);
  }
}

// Filter (filter.php) liefert nur Teildaten – das genügt fürs Grid.
async function applyFilter(param, value, label) {
  clearResults(discoverCtx);
  showLoading(discoverCtx, true);
  setStatus(discoverCtx, `Filtere nach ${label}: „${value}“…`);
  try {
    const data = await apiGet(`filter.php?${param}=${encodeURIComponent(value)}`);
    renderResults(discoverCtx, data.drinks);
  } catch (e) {
    showError(discoverCtx, `Filter fehlgeschlagen: ${e.message}`);
    setStatus(discoverCtx, "");
  } finally {
    showLoading(discoverCtx, false);
  }
}

// Zufalls-Cocktail: random.php liefert ein komplettes Objekt → direkt Detail.
async function loadRandom() {
  showLoading(discoverCtx, true);
  setStatus(discoverCtx, "Mische einen Zufalls-Cocktail…");
  try {
    const data = await apiGet("random.php");
    const drink = data.drinks?.[0];
    if (drink) {
      renderResults(discoverCtx, [drink]);
      openDetailFromObject(drink);
    } else {
      showError(discoverCtx, "Kein Cocktail erhalten.");
    }
  } catch (e) {
    showError(discoverCtx, `Zufalls-Cocktail fehlgeschlagen: ${e.message}`);
  } finally {
    showLoading(discoverCtx, false);
  }
}

// =============================================================================
// Ansicht „Alle Cocktails A–Z"
// =============================================================================

const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
let currentLetter = null;

// Baut die Alphabet-Leiste einmalig auf.
function buildAlphabet() {
  const frag = document.createDocumentFragment();
  for (const letter of LETTERS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "alpha-btn";
    btn.textContent = letter.toUpperCase();
    btn.dataset.letter = letter;
    btn.setAttribute("aria-label", `Cocktails mit ${letter.toUpperCase()}`);
    btn.addEventListener("click", () => loadLetter(letter));
    frag.appendChild(btn);
  }
  els.alphabet.appendChild(frag);
}

// Lädt alle Cocktails zu einem Anfangsbuchstaben (search.php?f=).
async function loadLetter(letter) {
  currentLetter = letter;
  // aktiven Buchstaben markieren
  els.alphabet.querySelectorAll(".alpha-btn").forEach(b =>
    b.classList.toggle("is-active", b.dataset.letter === letter));

  clearResults(allCtx);
  showLoading(allCtx, true);
  setStatus(allCtx, `Lade Cocktails mit „${letter.toUpperCase()}“…`);
  try {
    const data = await apiGet(`search.php?f=${encodeURIComponent(letter)}`);
    // alphabetisch sortieren für eine saubere Übersicht
    const drinks = (data.drinks ?? []).sort((a, b) =>
      String(a.strDrink).localeCompare(String(b.strDrink), "de"));
    renderResults(allCtx, drinks);
  } catch (e) {
    showError(allCtx, `Konnte Cocktails mit „${letter.toUpperCase()}“ nicht laden: ${e.message}`);
    setStatus(allCtx, "");
  } finally {
    showLoading(allCtx, false);
  }
}

// =============================================================================
// Ansicht „Geschmack finden": 3 Geschmacksachsen → passende Vorschläge
// =============================================================================

// Passendes Emoji je Achse (Reihenfolge identisch zu AXES aus flavor.js).
const AXIS_EMOJI = ["🍬", "🍋", "🌿", "🥃", "🍓", "🍃", "🌶️", "🥛"];

const MAX_FLAVORS = 3;          // genau so viele Achsen müssen gewählt werden
const FLAVOR_RESULT_COUNT = 12; // Anzahl der angezeigten Vorschläge

let flavorChipsBuilt = false;
const selectedAxes = [];        // Indizes der gewählten Achsen (max. MAX_FLAVORS)

// Baut die 8 Geschmacks-Chips aus AXES einmalig auf.
function buildFlavorChips() {
  const frag = document.createDocumentFragment();
  AXES.forEach((axis, i) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "flavor-chip";
    chip.dataset.axis = String(i);
    chip.setAttribute("aria-pressed", "false");

    const emoji = document.createElement("span");
    emoji.className = "chip-emoji";
    emoji.setAttribute("aria-hidden", "true");
    emoji.textContent = AXIS_EMOJI[i] || "•";

    const label = document.createElement("span");
    label.className = "chip-label";
    label.textContent = axis;

    chip.append(emoji, label);
    chip.addEventListener("click", () => toggleAxis(i));
    frag.appendChild(chip);
  });
  els.flavorChips.appendChild(frag);
  flavorChipsBuilt = true;
  updateFlavorUI();

  els.flavorFindBtn.addEventListener("click", findFlavorMatches);
  els.flavorResetBtn.addEventListener("click", resetFlavorSelection);
}

// Achse an-/abwählen; bei erreichtem Maximum werden weitere Auswahlen blockiert.
function toggleAxis(index) {
  const pos = selectedAxes.indexOf(index);
  if (pos !== -1) {
    selectedAxes.splice(pos, 1);
  } else {
    if (selectedAxes.length >= MAX_FLAVORS) return; // schon 3 gewählt
    selectedAxes.push(index);
  }
  updateFlavorUI();
}

// Setzt die Auswahl zurück und leert die Ergebnisse.
function resetFlavorSelection() {
  selectedAxes.length = 0;
  updateFlavorUI();
  clearResults(flavorCtx);
  setStatus(flavorCtx, "");
}

// Spiegelt den Auswahlzustand in die Chips, den Zähler und den Button.
function updateFlavorUI() {
  const full = selectedAxes.length >= MAX_FLAVORS;
  els.flavorChips.querySelectorAll(".flavor-chip").forEach(chip => {
    const idx = Number(chip.dataset.axis);
    const active = selectedAxes.includes(idx);
    chip.classList.toggle("is-active", active);
    chip.setAttribute("aria-pressed", active ? "true" : "false");
    // Nicht gewählte Chips deaktivieren, sobald das Maximum erreicht ist.
    chip.disabled = !active && full;
  });

  els.flavorCount.textContent = `${selectedAxes.length} von ${MAX_FLAVORS} gewählt`;
  els.flavorFindBtn.disabled = selectedAxes.length !== MAX_FLAVORS;
}

// ---------------------------------------------------------------------------
// Cocktail-Pool: search.php?f=<Buchstabe> liefert VOLLSTÄNDIGE Objekte inkl.
// Zutaten. Mit wenigen Buchstaben bekommen wir hunderte Cocktails, aus denen
// wir lokal Geschmacksprofile berechnen. Der Pool wird einmalig aufgebaut.
// ---------------------------------------------------------------------------

// Buchstaben für den Pool – breite Mischung gängiger Cocktail-Anfangsbuchstaben.
const POOL_LETTERS = "abcdfgimprstvw".split("");
let flavorPool = null;          // Array von { drink, values } nach dem Laden
let poolPromise = null;         // verhindert paralleles Mehrfachladen

// Lädt (einmalig) den Pool: Buchstaben in kleinen Parallel-Batches abrufen,
// vollständige Drinks sammeln, Profile berechnen und Drinks cachen.
async function ensureFlavorPool() {
  if (flavorPool) return flavorPool;
  if (poolPromise) return poolPromise;

  poolPromise = (async () => {
    const byId = new Map();
    const batchSize = 4;
    for (let i = 0; i < POOL_LETTERS.length; i += batchSize) {
      const batch = POOL_LETTERS.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(async letter => {
        try {
          const data = await apiGet(`search.php?f=${encodeURIComponent(letter)}`);
          return data.drinks ?? [];
        } catch {
          return []; // einzelne Buchstaben dürfen fehlschlagen
        }
      }));
      for (const drinks of results) {
        for (const drink of drinks) {
          if (drink?.idDrink) byId.set(String(drink.idDrink), drink);
        }
      }
    }

    if (byId.size === 0) throw new Error("Cocktail-Pool ist leer.");

    flavorPool = [];
    for (const drink of byId.values()) {
      drinkCache.set(String(drink.idDrink), drink); // Detail später ohne Nachladen
      const ingredients = extractIngredients(drink);
      const { values } = computeFlavorProfile(ingredients);
      flavorPool.push({ drink, values });
    }
    return flavorPool;
  })();

  return poolPromise;
}

// Bewertet ein Profil gegen die gewählten Achsen.
// Belohnt sowohl die durchschnittliche Stärke der gewählten Achsen als auch
// deren Ausgewogenheit (alle drei sollten spürbar vorhanden sein).
function scoreProfile(values, axes) {
  const picked = axes.map(a => values[a]);
  const avg = picked.reduce((s, v) => s + v, 0) / picked.length;
  const balance = Math.min(...picked); // niedrigste gewählte Achse
  return 0.6 * avg + 0.4 * balance;
}

// Hauptablauf: Pool sicherstellen, bewerten, Top-Treffer rendern.
async function findFlavorMatches() {
  if (selectedAxes.length !== MAX_FLAVORS) return;

  const names = selectedAxes.map(a => AXES[a]).join(", ");
  clearResults(flavorCtx);
  showLoading(flavorCtx, true);
  setStatus(flavorCtx, `Suche Cocktails mit ${names}…`);

  try {
    const pool = await ensureFlavorPool();
    const ranked = pool
      .map(entry => ({ ...entry, score: scoreProfile(entry.values, selectedAxes) }))
      // Nur Cocktails, bei denen jede gewählte Achse spürbar vorhanden ist.
      .filter(entry => selectedAxes.every(a => entry.values[a] >= 15))
      .sort((a, b) => b.score - a.score)
      .slice(0, FLAVOR_RESULT_COUNT);

    showLoading(flavorCtx, false);

    if (ranked.length === 0) {
      renderResults(flavorCtx, []); // zeigt Leerzustand
      setStatus(flavorCtx, `Keine guten Treffer für ${names}. Versuch eine andere Kombination.`);
      return;
    }

    renderResults(flavorCtx, ranked.map(r => r.drink), { foundLabel: "passend" });
    setStatus(flavorCtx, `Top-Treffer für ${names} – sortiert nach Übereinstimmung.`);
  } catch (e) {
    showLoading(flavorCtx, false);
    showError(flavorCtx, `Vorschläge fehlgeschlagen: ${e.message}`);
    setStatus(flavorCtx, "");
  }
}

// =============================================================================
// Reiter-Umschaltung
// =============================================================================

function switchView(view) {
  els.tabs.forEach(t => {
    const active = t.dataset.view === view;
    t.classList.toggle("is-active", active);
    t.setAttribute("aria-selected", active ? "true" : "false");
  });
  els.viewDiscover.classList.toggle("hidden", view !== "discover");
  els.viewAll.classList.toggle("hidden", view !== "all");
  els.viewFlavor.classList.toggle("hidden", view !== "flavor");

  // Beim ersten Öffnen der A–Z-Ansicht direkt Buchstabe „A" laden.
  if (view === "all" && currentLetter === null) loadLetter("a");
  // Geschmacks-Ansicht: Chips einmalig aufbauen.
  if (view === "flavor" && !flavorChipsBuilt) buildFlavorChips();
}

// =============================================================================
// Detailansicht (Modal)
// =============================================================================

// Cache vollständiger Drink-Objekte (idDrink → drink), gefüllt von jedem
// vollständigen Objekt, das wir sehen (Suche, Zufall, Geschmacks-Pool).
// Spart einen lookup.php-Aufruf, wenn die Details schon vorliegen.
const drinkCache = new Map();

// Per ID: vollständige Details öffnen – aus dem Cache, sonst nachladen.
async function openDetail(idDrink) {
  const cached = drinkCache.get(String(idDrink));
  if (cached) { openDetailFromObject(cached); return; }
  try {
    const data = await apiGet(`lookup.php?i=${encodeURIComponent(idDrink)}`);
    const drink = data.drinks?.[0];
    if (!drink) throw new Error("Cocktail nicht gefunden.");
    openDetailFromObject(drink);
  } catch (e) {
    // Fehler in der aktuell sichtbaren Ansicht melden.
    const ctx = currentCtx();
    showError(ctx, `Details konnten nicht geladen werden: ${e.message}`);
  }
}

// Liefert den Kontext der aktuell sichtbaren Ansicht (für Fehlermeldungen).
function currentCtx() {
  if (!els.viewFlavor.classList.contains("hidden")) return flavorCtx;
  if (!els.viewAll.classList.contains("hidden")) return allCtx;
  return discoverCtx;
}

// Detailansicht aus einem bereits vollständigen Drink-Objekt aufbauen.
function openDetailFromObject(drink) {
  if (drink?.idDrink) drinkCache.set(String(drink.idDrink), drink);
  const ingredients = extractIngredients(drink);
  const profile = computeFlavorProfile(ingredients);

  els.modalBody.innerHTML = "";
  els.modalBody.appendChild(buildDetailDOM(drink, ingredients, profile));
  openModal();
}

// Segmentierter Umschalter Metrisch (ml) / Imperial (oz) für die Zutaten.
function buildUnitToggle() {
  const wrap = document.createElement("div");
  wrap.className = "unit-toggle";
  wrap.setAttribute("role", "group");
  wrap.setAttribute("aria-label", "Maßeinheiten");
  for (const [sys, label] of [["metric", "ml"], ["imperial", "oz"]]) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.system = sys;
    b.textContent = label;
    const active = sys === unitSystem;
    b.className = "unit-btn" + (active ? " is-active" : "");
    b.setAttribute("aria-pressed", active ? "true" : "false");
    b.addEventListener("click", () => setUnitSystem(sys));
    wrap.appendChild(b);
  }
  return wrap;
}

// Wechselt das Maßsystem, merkt es und aktualisiert die offene Detailansicht.
function setUnitSystem(sys) {
  if (sys === unitSystem) return;
  unitSystem = sys;
  storeUnitSystem(sys);

  els.modalBody.querySelectorAll(".unit-toggle .unit-btn").forEach(b => {
    const active = b.dataset.system === sys;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-pressed", active ? "true" : "false");
  });
  els.modalBody.querySelectorAll(".ingredient-measure").forEach(span => {
    span.textContent = formatMeasure(span.dataset.raw || "", sys);
  });
}

// Baut den DOM-Baum der Detailansicht (kein innerHTML mit Fremddaten).
function buildDetailDOM(drink, ingredients, profile) {
  const root = document.createElement("div");

  // --- Kopfbereich: Bild + Metadaten ---
  const header = document.createElement("div");
  header.className = "detail-header";

  const img = document.createElement("img");
  img.className = "detail-img";
  img.src = thumb(drink.strDrinkThumb, "large");
  img.alt = `Foto von ${safe(drink.strDrink, "Cocktail")}`;
  img.addEventListener("error", () => { img.src = placeholderImg(); }, { once: true });

  const meta = document.createElement("div");
  const title = document.createElement("h2");
  title.className = "detail-title";
  title.id = "modal-title";
  title.textContent = safe(drink.strDrink, "Unbekannter Cocktail");
  meta.appendChild(title);

  // Badges (nur anzeigen, wenn vorhanden)
  const badges = document.createElement("div");
  badges.className = "badges";
  const addBadge = (text, accent = false) => {
    if (!text || text === "—") return;
    const b = document.createElement("span");
    b.className = "badge" + (accent ? " accent" : "");
    b.textContent = text;
    badges.appendChild(b);
  };
  addBadge(safe(drink.strAlcoholic, ""), true);
  addBadge(safe(drink.strCategory, ""));
  addBadge(safe(drink.strGlass, ""));
  if (drink.strIBA) addBadge("IBA: " + drink.strIBA);
  if (drink.strTags) {
    for (const tag of String(drink.strTags).split(",").map(t => t.trim()).filter(Boolean)) {
      addBadge("#" + tag);
    }
  }
  if (badges.children.length) meta.appendChild(badges);

  header.append(img, meta);
  root.appendChild(header);

  // --- Geschmacksrad ---
  const flavorSection = document.createElement("section");
  flavorSection.className = "detail-section";
  flavorSection.innerHTML = "<h3>Geschmacksrad</h3>";
  const flavorWrap = document.createElement("div");
  flavorWrap.className = "flavor-wrap";
  flavorWrap.appendChild(renderRadar(profile.values, AXES));
  const summary = document.createElement("p");
  summary.className = "flavor-summary";
  summary.textContent = profile.summary;
  flavorWrap.appendChild(summary);
  flavorSection.appendChild(flavorWrap);
  root.appendChild(flavorSection);

  // --- Zutaten ---
  const ingSection = document.createElement("section");
  ingSection.className = "detail-section";
  // Kopf mit Überschrift + Maßeinheiten-Umschalter (metrisch ist Standard).
  const ingHead = document.createElement("div");
  ingHead.className = "section-head";
  const ingTitle = document.createElement("h3");
  ingTitle.textContent = "Zutaten";
  ingHead.append(ingTitle, buildUnitToggle());
  ingSection.appendChild(ingHead);
  const ul = document.createElement("ul");
  ul.className = "ingredient-list";
  for (const ing of ingredients) {
    const li = document.createElement("li");
    li.className = "ingredient-item";

    const iimg = document.createElement("img");
    iimg.loading = "lazy";
    iimg.src = ingredientImg(ing.name);
    iimg.alt = "";
    iimg.addEventListener("error", () => { iimg.src = placeholderImg(); }, { once: true });

    const textWrap = document.createElement("div");
    textWrap.className = "ingredient-text";
    const nm = document.createElement("span");
    nm.className = "ingredient-name";
    nm.textContent = ing.name;
    textWrap.appendChild(nm);
    if (ing.measure) {
      const ms = document.createElement("span");
      ms.className = "ingredient-measure";
      ms.dataset.raw = ing.measure;                       // Original für Umschaltung
      ms.textContent = formatMeasure(ing.measure, unitSystem);
      textWrap.appendChild(ms);
    }
    li.append(iimg, textWrap);
    ul.appendChild(li);
  }
  ingSection.appendChild(ul);
  root.appendChild(ingSection);

  // --- Zubereitung ---
  const instrSection = document.createElement("section");
  instrSection.className = "detail-section";
  instrSection.innerHTML = "<h3>Zubereitung</h3>";
  const p = document.createElement("p");
  p.className = "instructions";
  p.textContent = getInstructions(drink);
  instrSection.appendChild(p);
  root.appendChild(instrSection);

  return root;
}

// =============================================================================
// Modal-Steuerung inkl. Fokus-Falle und Esc-Schließen
// =============================================================================

let lastFocused = null;

function openModal() {
  lastFocused = document.activeElement;
  els.modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  const closeBtn = els.modal.querySelector(".modal-close");
  closeBtn?.focus();
  document.addEventListener("keydown", onModalKeydown);
}

function closeModal() {
  els.modal.classList.add("hidden");
  document.body.style.overflow = "";
  document.removeEventListener("keydown", onModalKeydown);
  lastFocused?.focus();
}

function onModalKeydown(e) {
  if (e.key === "Escape") { closeModal(); return; }
  if (e.key !== "Tab") return;
  // Fokus-Falle: Tab bleibt innerhalb des Modals.
  const focusables = els.modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault(); last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault(); first.focus();
  }
}

// Klick auf Overlay oder Schließen-Buttons schließt das Modal.
els.modal.addEventListener("click", (e) => {
  if (e.target.hasAttribute("data-close")) closeModal();
});

// =============================================================================
// Dropdowns aus list.php befüllen
// =============================================================================

async function populateFilters() {
  try {
    const [cats, glasses, alcs] = await Promise.all([
      getList("c"), getList("g"), getList("a"),
    ]);
    fillSelect(els.filterCat, cats, "strCategory");
    fillSelect(els.filterGlass, glasses, "strGlass");
    fillSelect(els.filterAlc, alcs, "strAlcoholic");
  } catch (e) {
    setStatus(discoverCtx, "Filteroptionen konnten nicht geladen werden.");
  }
}

function fillSelect(select, items, key) {
  for (const item of items) {
    const val = item[key];
    if (!val) continue;
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = val;
    select.appendChild(opt);
  }
}

// =============================================================================
// Event-Bindings
// =============================================================================

// Debounce-Helfer (~300 ms) für die Suche.
function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

const debouncedSearch = debounce((value) => {
  const q = value.trim();
  if (q.length === 0) { loadPopular(); return; } // leere Suche → beliebte Cocktails
  searchByName(q);
}, 300);

els.search.addEventListener("input", (e) => {
  resetFilters();
  debouncedSearch(e.target.value);
});

els.randomBtn.addEventListener("click", () => { resetFilters(); loadRandom(); });

els.filterCat.addEventListener("change", (e) => {
  if (e.target.value) { els.search.value = ""; resetOtherFilters(els.filterCat);
    applyFilter("c", e.target.value, "Kategorie"); }
});
els.filterGlass.addEventListener("change", (e) => {
  if (e.target.value) { els.search.value = ""; resetOtherFilters(els.filterGlass);
    applyFilter("g", e.target.value, "Glas"); }
});
els.filterAlc.addEventListener("change", (e) => {
  if (e.target.value) {
    els.search.value = ""; resetOtherFilters(els.filterAlc);
    // API erwartet Unterstrich statt Leerzeichen (z. B. "Non_Alcoholic").
    applyFilter("a", e.target.value.replace(/\s+/g, "_"), "Alkohol");
  }
});

// Reiter umschalten
els.tabs.forEach(t => t.addEventListener("click", () => switchView(t.dataset.view)));

// Setzt alle Filter-Dropdowns zurück (z. B. bei neuer Textsuche).
function resetFilters() {
  els.filterCat.value = "";
  els.filterGlass.value = "";
  els.filterAlc.value = "";
}
// Setzt alle Filter außer dem aktiven zurück (Filter sind exklusiv).
function resetOtherFilters(active) {
  for (const sel of [els.filterCat, els.filterGlass, els.filterAlc]) {
    if (sel !== active) sel.value = "";
  }
}

// =============================================================================
// Initialisierung
// =============================================================================

(async function init() {
  buildAlphabet();
  await populateFilters();
  loadPopular(); // Startseite zeigt direkt beliebte Cocktails
})();
