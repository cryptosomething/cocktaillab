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


---

Daten von [TheCocktailDB](https://www.thecocktaildb.com) (Test-Key „1").
