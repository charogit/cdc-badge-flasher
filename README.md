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

## Deployment (Vercel)

Quelle ist krim404s GitHub - die Vercel-Seite baut sich daraus und schaut regelmäßig nach
Updates. Du hostest/pflegst keine Kopie.

- **Vercel** ist mit diesem (privaten) Repo verbunden. Build: `python3 build.py`, Output: `dist`
  (siehe `vercel.json`). Bei jedem Push deployt Vercel neu.
- **Täglich nach krim404-Updates schauen:** `.github/workflows/refresh.yml` ruft per Cron einen
  Vercel **Deploy-Hook** auf → Vercel baut neu → `build.py` zieht krim404s aktuelle Seite.
  Dazu im Repo das Secret `VERCEL_DEPLOY_HOOK` (Deploy-Hook-URL aus dem Vercel-Projekt) setzen.

Lokales Bauen/Testen wie oben (`python3 build.py` + `python3 -m http.server -d dist`).
