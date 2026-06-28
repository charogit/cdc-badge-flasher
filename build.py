#!/usr/bin/env python3
"""
Baut die eigene CDC-Badge-Flasher-Seite, immer aus krim404s aktueller Version.

Ablauf:
  1. krim404s aktuelle web-flasher/index.html frisch laden.
  2. Manifest-Verweise + Bild auf krim404s ABSOLUTE URLs umschreiben, damit Firmware,
     Bootloader und Bild direkt von ihm kommen (du hostest nie eine Binärdatei).
  3. Eine Zeile <script src="cdc-flash-popup.js"> einschieben (das Bootloader-Popup).
  4. Ergebnis + Popup nach dist/ schreiben.

So trägt jedes Update von krim404 automatisch durch - gewartet wird nur cdc-flash-popup.js.
"""
import pathlib
import shutil
import urllib.request

UPSTREAM = "https://krim404.github.io/cdc-badge-os/flasher/"
HERE = pathlib.Path(__file__).parent
DIST = HERE / "dist"


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "cdc-badge-flasher-build"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8")


def main() -> None:
    DIST.mkdir(exist_ok=True)
    html = fetch(UPSTREAM + "index.html")

    # 1) Manifeste + Bild auf absolute Upstream-URLs (Firmware bleibt bei krim404)
    replacements = {
        'manifest="manifest.json"': f'manifest="{UPSTREAM}manifest.json"',
        'manifest="manifest_factory.json"': f'manifest="{UPSTREAM}manifest_factory.json"',
        'src="badge.jpg"': f'src="{UPSTREAM}badge.jpg"',
        'fetch("manifest.json")': f'fetch("{UPSTREAM}manifest.json")',
    }
    for old, new in replacements.items():
        if old not in html:
            print(f"WARN: Muster nicht gefunden (Upstream hat sich evtl. geaendert): {old}")
        html = html.replace(old, new)

    # 2) Popup-Script idempotent vor </body> einschieben
    if "cdc-flash-popup.js" not in html:
        tag = '  <script src="cdc-flash-popup.js" defer></script>\n</body>'
        if "</body>" not in html:
            raise SystemExit("FEHLER: kein </body> im Upstream-HTML gefunden.")
        html = html.replace("</body>", tag, 1)

    (DIST / "index.html").write_text(html, encoding="utf-8")
    shutil.copy(HERE / "cdc-flash-popup.js", DIST / "cdc-flash-popup.js")
    print(f"OK -> {DIST}/index.html  (+ cdc-flash-popup.js)")


if __name__ == "__main__":
    main()
