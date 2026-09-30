# Yalla Deutsch

**Deutsch lernen. Schritt für Schritt.**

Eine spielerische Web-App, mit der arabischsprachige Menschen Deutsch lernen – über
 Situationen aus dem echten Alltag statt über abstrakte Vokabeltests.

Keine Anmeldung, kein Backend, keine Tracking: der gesamte Lernfortschritt liegt im
`localStorage` des Browsers und verlässt das Gerät nie.

## Inhalt

- **5 Stadtbereiche** mit **30 Missionen** und **180 Wörtern** auf A1/A2-Niveau
- **8 Aufgabentypen**: choice, symbol, listen, match, build, blank, dialogue, basket
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
pnpm test       # Vitest
pnpm lint       # ESLint
pnpm build      # Typecheck + Produktionsbuild nach dist/
```

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

`src/domain.test.ts` sichert die Invarianten ab: 5 Wörter, 5 Ziele je Mission,
Optionen ohne Duplikate, Antwort nicht immer an derselben Position.
