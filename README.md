# cdc-badge-flasher

Eigene Web-Flasher-Seite fürs **CDC Badge**, die immer aus krim404s aktuellem
[cdc-badge-os](https://github.com/krim404/cdc-badge-os)-Flasher gebaut wird - ergänzt um
ein Bootloader-Hinweis-Popup (FLASH + RESET) und den Hinweis, dass die PIN nach dem
Flashen auf `123456` steht.

## Idee

Krim404s `index.html` wird **nicht** verändert oder kopiert-gepflegt. Der Build zieht bei
jedem Lauf seine aktuelle Seite frisch, schreibt die Manifest- und Bild-Verweise auf seine
absoluten URLs um (Firmware, Bootloader und Bild kommen also direkt von ihm) und schiebt
genau eine Zeile ein:

```html
<script src="cdc-flash-popup.js" defer></script>
```

Damit trägt jedes Update von krim404 automatisch durch. Gepflegt wird nur eine einzige
eigene Datei: [`cdc-flash-popup.js`](cdc-flash-popup.js).

## Das Popup

`cdc-flash-popup.js` hängt sich selbst ein und schiebt sich zwischen den Klick auf
"Update Firmware" / "Factory Setup" und den echten Flashvorgang:

1. Klick auf einen Flash-Button → Popup mit gezeichneter Badge-Rückseite (nur die zwei
   Taster), animierte Reihenfolge **FLASH halten → RESET tippen → loslassen**, plus PIN-Hinweis.
2. Klick auf **Jetzt flashen** → Popup schließt, esp-web-tools startet wie gewohnt.
3. Abbrechen / Esc / Klick daneben bricht ab, ohne zu flashen.

Sprache **DE/EN** umschaltbar (oben rechts im Popup, wird gemerkt, erkennt die Browser-Sprache).
Keine Abhängigkeiten, respektiert `prefers-reduced-motion`.

## Lokal bauen und testen

```bash
python3 build.py                 # baut dist/ aus krim404s aktueller Seite
python3 -m http.server -d dist   # http://localhost:8000 (Web Serial geht auf localhost)
```

Zum echten Flashen: Chrome oder Edge + Badge im Bootloader-Modus (siehe Popup).

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) baut und veröffentlicht auf GitHub Pages -
bei jedem Push, manuell per "Run workflow" und täglich per Cron (zieht krim404s Updates nach).
In den Repo-Einstellungen unter **Pages** als Quelle **GitHub Actions** wählen.
