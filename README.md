# 🍸 CocktailLab – Cocktails mit individuellem Geschmacksrad

Eine statische, responsive Webseite, die Cocktails von [TheCocktailDB](https://www.thecocktaildb.com)
anzeigt. Das Besondere: Jeder Cocktail bekommt ein **individuell berechnetes
Geschmacksrad** (SVG-Radardiagramm), das deterministisch aus seinen echten
Zutaten entsteht – ganz ohne Geschmacksdaten von der API.

## Funktionen

- **Zwei Reiter**:
  - **Entdecken** – Suche, Filter und beim Start direkt eine Auswahl
    beliebter Cocktails.
  - **Alle Cocktails A–Z** – Übersicht aller Cocktails, blätterbar nach
    Anfangsbuchstabe.
- **Suche** nach Name (mit ~300 ms Debounce); leere Suche zeigt wieder die
  beliebten Cocktails.
- **Schnellzugriffe**: Zufalls-Cocktail-Button und Dropdowns für Kategorie,
  Glas und Alkoholgehalt (befüllt aus `list.php`, gecacht).
- **Ergebnis-Grid** aus Karten mit Thumbnail + Name.
- **Detailansicht** als Modal: großes Bild, Kategorie/Glas/Alkohol/IBA/Tags,
  Zutatenliste mit Mengen und Zutaten-Thumbnails, Zubereitung (deutsch
  bevorzugt, sonst englisch) und das **Geschmacksrad**.
- Saubere **Lade-, Leer- und Fehlerzustände**; `null`-Felder landen nie roh
  in der UI.
- Barrierearm: Tastaturbedienung, Fokus-Falle im Modal, Schließen mit `Esc`,
  sichtbare Fokus-Styles, aussagekräftige `alt`-Texte.

## Das Geschmacksrad

Die API liefert keine Geschmacksdaten. Das Profil wird lokal berechnet
([flavor.js](flavor.js)):

1. **Nachschlagetabelle** Zutat → Vektor über 8 Achsen (0–10):
   *Süße · Säure · Bitter · Stärke · Fruchtig · Kräuter · Würzig · Cremig.*
2. **Heuristik** für unbekannte Zutaten (Schlüsselwörter wie `juice`, `syrup`,
   `cream`, `bitter` …); ganz unbekannte Zutaten bekommen einen neutralen
   Mini-Vektor.
3. **Gewichtung** grob nach Menge (`oz`/`ml`/`cl`/`part`, Brüche wie `1 1/2`
   werden geparst); Basisspirituosen werden leicht stärker gewichtet.
4. **Aggregation**, Skalierung gegen ein festes Referenzmaximum auf 0–100,
   Clamping und Runden – so bleiben Cocktails untereinander vergleichbar.

Das Diagramm selbst ([radar.js](radar.js)) ist ein **selbst gebautes SVG** –
keine Chart-Bibliothek.

## Starten

Weil ES-Module über `file://` an CORS scheitern, die Seite über einen lokalen
Server ausliefern:

```bash
# Python 3
python3 -m http.server 8000
#   (unter Windows ggf.:  py -m http.server 8000)

# Alternativ mit Node:
npx serve .
```

Dann im Browser öffnen: <http://localhost:8000>

> Keine Build-Schritte, keine Abhängigkeiten, keine API-Keys nötig.

## Dateien

| Datei | Aufgabe |
|-------|---------|
| [index.html](index.html) | Seitenstruktur |
| [styles.css](styles.css) | Dunkles, responsives „Bar/Lounge"-Design |
| [app.js](app.js) | UI, API-Aufrufe, Routing/Modal |
| [flavor.js](flavor.js) | Zutaten-Tabelle + Berechnung des Geschmacksrads |
| [radar.js](radar.js) | SVG-Radardiagramm |

## Optional: KI-gestützte Verfeinerung

Das Profil ließe sich zusätzlich über die Anthropic-API verfeinern (Zutaten +
Anleitung an Claude `claude-sonnet-4-6` schicken, reines JSON mit den 8
Achsenwerten zurück). **Standard bleibt** die lokale, deterministische
Berechnung – offline lauffähig und ohne API-Key. Diese Erweiterung ist bewusst
nicht aktiviert.

---

Daten von [TheCocktailDB](https://www.thecocktaildb.com) (Test-Key „1").
