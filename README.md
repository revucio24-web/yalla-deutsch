# Yalla Deutsch

**Deutsch lernen. Schritt für Schritt.**

Eine spielerische Web-App, mit der arabischsprachige Menschen Deutsch lernen – über
 Situationen aus dem echten Alltag statt über abstrakte Vokabeltests.

Keine Anmeldung, kein Backend, keine Tracking: der gesamte Lernfortschritt liegt im
`localStorage` des Browsers und verlässt das Gerät nie.

## Inhalt

- **5 Stadtbereiche** mit **35 Missionen** und **210 Wörtern** auf A1/A2-Niveau
- **8 Aufgabentypen** in Missionen: choice, symbol, listen, match, build, blank, dialogue, basket
- Ein zusätzliches, offlinefähiges **Wortpaare-Spiel** mit sechs deutsch-arabischen Paaren
- Dialogtrainer mit **3 A1/A2-Alltagssituationen**: Café, Bäckerei und Supermarkt
- Gesprächsoptionen mit arabischen Übersetzungen, Gerätestimme, Punkten und lokalem Bestwert
- Level, XP, Sterne, Word-Mastery (1–5) und eine fälligkeitsbasierte Wiederholungsliste
- Arabische Oberfläche (RTL) mit deutschen Sprachhinweisen
- Deutsche Wörter per Maus, Enter oder Leertaste mit der lokalen Gerätestimme anhören
- Einstellungen: deutsche Sprachausgabe, arabische Hilfe, reduzierte Bewegung, große Schrift

## Lokal starten

```bash
pnpm install
pnpm dev        # Entwicklungsserver
pnpm test       # Vitest ohne Systembrowser-Voraussetzung
pnpm test:browser # verpflichtende Chromium-Viewport-Regression für den PR-Nachweis
pnpm lint       # ESLint
pnpm build      # Typecheck + Produktionsbuild nach dist/
```

`pnpm test` führt die Node-basierten Tests aus und benötigt kein installiertes Chromium/Chrome.
Die echte Browser-Regression läuft separat mit `pnpm test:browser`; sie ist ein verpflichtender
QA-Schritt und muss im PR-Nachweis mit dem Befehl und dem erfolgreichen Ergebnis aufgeführt werden.
Sie startet ein bereits installiertes System-Chromium/Chrome direkt, ohne Playwright oder einen
Browser-Download. Gemessen werden echte Viewportwerte, berechnete Schriftgröße, Sichtbarkeit,
Label-/Button-Grenzen sowie horizontaler Text-, Dokument- und Body-Overflow bei **320, 700, 701,
768, 960 und 961 px**.
Im echten Dialog prüft derselbe Lauf mit echten Chromium-Touch-Eingaben bei **320×640 und 320×720** außerdem,
dass die vollständige Rückmeldung und die dritte Antwort sofort über der fixen Bottom-Navigation
ohne weiteres Scrollen sichtbar sind. Der Touch-Fokus bleibt erhalten; Tab und Enter erreichen an
beiden Höhen die nächste Antwort mit sichtbarem 3px-Fokusring.

Der Browser-Test erkennt `chromium`, `chromium-browser`, `google-chrome` oder
`google-chrome-stable` auf `PATH`. Für eine nicht standardmäßige Installation kann der Pfad explizit
gesetzt werden:

```bash
CHROME_BIN=/absoluter/pfad/zu/chromium pnpm test:browser
```

`CHROMIUM_BIN` wird als bisheriger Alias ebenfalls akzeptiert. Fehlt das Binary, schlägt nur
`pnpm test:browser` mit einer konkreten Installations-/Konfigurationsmeldung fehl; es gibt keinen
stillschweigenden Skip. `pnpm test` bleibt davon unabhängig.
GitHub Actions führt beide Schritte zusätzlich auf einem sauberen Checkout ausschließlich bei
Pull Requests nach `main` aus. Dafür wird Chrome for Testing **154.0.8037.92** auf `ubuntu-24.04`
bereitgestellt; `browser-actions/setup-chrome` ist auf Commit
`48ad923757ca74d66703209fe939badbdf80f2f4` fixiert und die installierte Browserversion wird
verifiziert. Dieser Workflow hat nur Lesezugriff und enthält keine Pages-, Deploy- oder Release-
Schritte; der bestehende Pages-Workflow bleibt unverändert.

## PWA und Offline-Nutzung

Der Produktionsbuild nimmt die gehashten JavaScript- und CSS-Dateien in den App-Cache auf.
Nach dem ersten vollständigen Laden kann die App offline weiterlaufen. Unterstützte Browser
bieten über das Browsermenü **„App installieren“** beziehungsweise **„Zum Startbildschirm
hinzufügen“** an. Missionen, Dialogpunkte und Einstellungen bleiben ausschließlich im lokalen
`localStorage` und verlassen das Gerät nicht.

Der Service Worker cached nur öffentliche, gleich-originige GET-Ressourcen der App. Es werden
keine Konten, API-Antworten, Tracker oder privaten Dokumente gespeichert.

Die PWA-Icons lassen sich reproduzierbar neu erstellen:

```bash
python scripts/generate_pwa_icons.py
```

## Deployment

Statischer Build, läuft auf jedem kostenlosen Static-Host. `base: './'` in
`vite.config.ts` sorgt dafür, dass der Build auch aus einem Unterverzeichnis
funktioniert.

GitHub Pages läuft über `.github/workflows/deploy.yml`: jeder Push auf `main`
baut die App, lädt `dist/` als Artefakt hoch und schaltet es auf den
`gh-pages`-Zweig aus. Pages muss im Repo einmalig unter
**Settings → Pages → Source** auf **GitHub Actions** stehen.

## Lerninhalte erweitern

Die Inhalte sind versioniert und werden **nicht** zur Laufzeit erzeugt.
Quelle ist `scripts/generate_content.py`; die App liest ausschließlich die
daraus entstandenen JSON-Dateien.

```bash
python scripts/generate_content.py
```

- **Neue Wörter**: eine Mission in `GROUPS` bekommt genau sechs Zeilen im Format
  `German|Arabic|article|icon`. Leere Articles für Ausdrücke.
- **Neue Mission**: eine Gruppe in `GROUPS` plus ein Eintrag in `EXAMPLES` mit
  `(Satz, Übersetzung, Lückensatz, Lückwort, Dialogfrage, Übersetzung, Antwort)`
  ergänzen. Das Skript prüft Längen, ID-Eindeutigkeit sowie doppelte
  Antwortoptionen und bricht bei einem Fehler ab.

`src/domain.test.ts` sichert die Inhaltsinvarianten ab: 6 Wörter und 5 Aufgaben je
Mission, eindeutige IDs, erhaltene bestehende Missionen und Antwortpositionen,
die nicht immer gleich sind. `src/memoryGame.test.tsx` prüft die Regeln und
Tastatur-/Sprachkennzeichnung des Wortpaare-Spiels.
