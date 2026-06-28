/*
 * cdc-flash-popup.js — Bootloader-Hinweis-Popup für den CDC Badge Web-Flasher.
 *
 * Selbstständig: injiziert eigenes CSS + DOM und schiebt sich zwischen den Klick auf
 * "Update Firmware" / "Factory Setup" und den echten esp-web-tools-Flashvorgang.
 * Fasst krim404s index.html NICHT an — Einbinden mit genau einer Zeile:
 *
 *     <script src="cdc-flash-popup.js" defer></script>
 *
 * Sprache: DE/EN umschaltbar im Popup (Auto-Erkennung über Browser, gemerkt in localStorage).
 * Keine Abhängigkeiten. Bricht nichts, wenn die Flash-Buttons (noch) nicht da sind.
 */
(function () {
  "use strict";

  // ---------- Texte ----------
  var I18N = {
    de: {
      eyebrow: "Vor der Installation",
      title: "Badge in den Flash-Modus bringen",
      sub: 'Die zwei Taster sind auf der <b>Rückseite</b>. Reihenfolge: <span class="cdc-k f">FLASH</span> halten, <span class="cdc-k r">RESET</span> tippen, loslassen.',
      s1: 'Hold-Schritt: <b><span class="cdc-k f">FLASH</span> halten</b> &mdash; rechts unten („FLASH / PW OFF").',
      s2: 'dabei <b><span class="cdc-k r">RESET</span> kurz drücken</b> &mdash; der Taster oben.',
      s3: '<b>FLASH loslassen.</b> Das E-Paper bleibt schwarz &mdash; das ist richtig.',
      pin: '<b>PIN-Hinweis:</b> Falls deine PIN nach dem Flashen nicht mehr geht, ist der Standard <code>123456</code>. Damit entsperren, dann gleich eigene PIN setzen.',
      cancel: "Abbrechen",
      confirm: "Jetzt flashen"
    },
    en: {
      eyebrow: "Before installing",
      title: "Put the badge into bootloader mode",
      sub: 'The two buttons are on the <b>back</b>. Order: hold <span class="cdc-k f">FLASH</span>, tap <span class="cdc-k r">RESET</span>, release.',
      s1: '<b>Hold <span class="cdc-k f">FLASH</span></b> &mdash; lower right ("FLASH / PW OFF").',
      s2: 'while holding, <b>tap <span class="cdc-k r">RESET</span></b> &mdash; the top button.',
      s3: '<b>Release FLASH.</b> The e-paper stays black &mdash; that is correct.',
      pin: '<b>PIN note:</b> if your PIN no longer works after flashing, the default is <code>123456</code>. Unlock with it, then set your own PIN under settings.',
      cancel: "Cancel",
      confirm: "Flash now"
    }
  };
  // s1 DE Feinschliff (kein "Hold-Schritt"-Artefakt):
  I18N.de.s1 = '<b><span class="cdc-k f">FLASH</span> halten</b> &mdash; rechts unten („FLASH / PW OFF").';

  function getLang() {
    try {
      var s = localStorage.getItem("cdcFlashLang");
      if (s === "de" || s === "en") return s;
    } catch (e) {}
    // Standard Deutsch; Englisch nur, wenn der Browser explizit Englisch meldet.
    return (navigator.language || "de").toLowerCase().indexOf("en") === 0 ? "en" : "de";
  }
  function setLang(l) {
    try { localStorage.setItem("cdcFlashLang", l); } catch (e) {}
  }

  // ---------- CSS ----------
  var CSS = [
    '.cdc-flash-overlay{--cdc-flash:#f2a63b;--cdc-reset:#3fcfe0;--cdc-bg:#161b22;--cdc-line:#30363d;',
    '--cdc-line2:#484f58;--cdc-ink:#e6edf3;--cdc-dim:#8b949e;--cdc-accent:#58a6ff;--cdc-accent2:#79c0ff;',
    '--cdc-warn:#d29922;--cdc-warnbg:rgba(210,153,34,.12);--cdc-surf2:#1c2128;',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;',
    'position:fixed;inset:0;background:rgba(4,6,9,.72);backdrop-filter:blur(3px);display:none;',
    'align-items:center;justify-content:center;padding:20px;z-index:99999;color:var(--cdc-ink);line-height:1.55}',
    '.cdc-flash-overlay.cdc-show{display:flex;animation:cdcOv .2s ease}',
    '@keyframes cdcOv{from{opacity:0}to{opacity:1}}',
    '.cdc-flash-overlay *{box-sizing:border-box}',
    '.cdc-modal{position:relative;width:100%;max-width:520px;max-height:92vh;overflow:auto;background:var(--cdc-bg);',
    'border:1px solid var(--cdc-line2);border-radius:1rem;padding:1.5rem;animation:cdcM .25s cubic-bezier(.2,.7,.3,1)}',
    '@keyframes cdcM{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}',
    '.cdc-lang{position:absolute;top:1rem;right:1rem;display:flex;gap:2px;background:var(--cdc-surf2);',
    'border:1px solid var(--cdc-line);border-radius:.5rem;padding:2px}',
    '.cdc-lang button{border:0;background:transparent;color:var(--cdc-dim);font:inherit;font-size:.72rem;',
    'font-weight:700;letter-spacing:.04em;padding:.2rem .5rem;border-radius:.35rem;cursor:pointer}',
    '.cdc-lang button[aria-pressed="true"]{background:var(--cdc-bg);color:var(--cdc-ink);box-shadow:0 0 0 1px var(--cdc-line2)}',
    '.cdc-eyebrow{font-family:SFMono-Regular,Menlo,Monaco,monospace;font-size:.7rem;letter-spacing:.2em;',
    'text-transform:uppercase;color:var(--cdc-accent)}',
    '.cdc-modal h2{font-size:1.25rem;margin:.4rem 0 .3rem;padding-right:5rem}',
    '.cdc-sub{color:var(--cdc-dim);font-size:.9rem;margin:0 0 1rem}',
    '.cdc-k{font-family:SFMono-Regular,Menlo,Monaco,monospace;font-weight:600}',
    '.cdc-k.f{color:var(--cdc-flash)}.cdc-k.r{color:var(--cdc-reset)}',
    '.cdc-grid{display:grid;grid-template-columns:170px 1fr;gap:1.1rem;align-items:center}',
    '@media(max-width:470px){.cdc-grid{grid-template-columns:1fr}}',
    '.cdc-board{width:100%;height:auto;display:block;margin:0 auto;max-width:200px}',
    '.cdc-board text{font-family:SFMono-Regular,Menlo,Monaco,monospace}',
    '.cdc-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.55rem}',
    '.cdc-step{display:flex;gap:.7rem;align-items:flex-start;padding:.6rem .75rem;border-radius:.6rem;',
    'border:1px solid var(--cdc-line);background:var(--cdc-surf2)}',
    '.cdc-step .cdc-dot{flex:0 0 auto;width:26px;height:26px;border-radius:7px;display:grid;place-items:center;',
    'font-family:SFMono-Regular,Menlo,Monaco,monospace;font-weight:700;font-size:.8rem;color:#000;margin-top:1px}',
    '.cdc-step.s1 .cdc-dot{background:var(--cdc-flash)}.cdc-step.s2 .cdc-dot{background:var(--cdc-reset)}',
    '.cdc-step.s3 .cdc-dot{background:var(--cdc-dim)}',
    '.cdc-step p{margin:0;font-size:.85rem;color:var(--cdc-dim)}.cdc-step b{color:var(--cdc-ink)}',
    '.cdc-pinbox{margin-top:1rem;border:1px solid rgba(210,153,34,.35);background:var(--cdc-warnbg);',
    'border-radius:.6rem;padding:.8rem .95rem;display:flex;gap:.7rem;align-items:flex-start}',
    '.cdc-pinbox .cdc-pi{flex:0 0 auto;width:1.4rem;height:1.4rem;border-radius:50%;background:var(--cdc-warn);',
    'color:#000;font-weight:700;display:inline-flex;align-items:center;justify-content:center;font-size:.85rem}',
    '.cdc-pinbox p{margin:0;font-size:.85rem;color:#e6c87a}.cdc-pinbox b{color:var(--cdc-ink)}',
    '.cdc-pinbox code{background:rgba(255,255,255,.1);padding:.05rem .35rem;border-radius:.25rem}',
    '.cdc-actions{display:flex;gap:.7rem;margin-top:1.25rem}',
    '.cdc-actions button{flex:1;border:0;cursor:pointer;font-weight:600;border-radius:.55rem;padding:.8rem 1rem;',
    'font-size:.92rem;transition:.15s;font-family:inherit}',
    '.cdc-actions .cdc-cancel{background:transparent;color:var(--cdc-dim);border:1px solid var(--cdc-line2)}',
    '.cdc-actions .cdc-cancel:hover{color:var(--cdc-ink)}',
    '.cdc-actions .cdc-confirm{background:var(--cdc-accent);color:#000}',
    '.cdc-actions .cdc-confirm:hover{background:var(--cdc-accent2)}',
    '.cdc-ring{transform-box:fill-box;transform-origin:center}',
    '@keyframes cdcFH{0%,4%{opacity:0}10%,66%{opacity:1}76%,100%{opacity:0}}',
    '@keyframes cdcFP{0%,10%{transform:scale(1)}20%{transform:scale(1.08)}32%{transform:scale(1)}}',
    '@keyframes cdcRT{0%,34%{opacity:0;transform:scale(.7)}40%{opacity:1;transform:scale(1)}',
    '48%{opacity:.85;transform:scale(1.28)}55%{opacity:0;transform:scale(1.4)}100%{opacity:0}}',
    '@keyframes cdcNA{0%,4%{opacity:0}10%,66%{opacity:1}76%,100%{opacity:0}}',
    '@keyframes cdcNB{0%,34%{opacity:0}40%,55%{opacity:1}62%,100%{opacity:0}}',
    '.cdc-a-flash{animation:cdcFH 8s ease-in-out infinite}.cdc-a-flash-p{animation:cdcFP 8s ease-in-out infinite}',
    '.cdc-a-reset{animation:cdcRT 8s ease-in-out infinite;opacity:0}',
    '.cdc-a-no1{animation:cdcNA 8s ease-in-out infinite}.cdc-a-no2{animation:cdcNB 8s ease-in-out infinite}',
    '@media(prefers-reduced-motion:reduce){.cdc-a-flash,.cdc-a-flash-p,.cdc-a-reset,.cdc-a-no1,.cdc-a-no2{animation:none!important;opacity:1}}'
  ].join("");

  var BOARD_SVG =
    '<svg class="cdc-board" viewBox="0 0 340 300" role="img" aria-label="Back of the badge: RESET top, FLASH lower right.">' +
    '<defs><linearGradient id="cdcCap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2e5df"/><stop offset="1" stop-color="#a4a99f"/></linearGradient></defs>' +
    '<rect x="8" y="8" width="324" height="284" rx="26" fill="#0f1318" stroke="#27303a"/>' +
    '<circle cx="42" cy="42" r="8" fill="#0a0c0f" stroke="#2c343c"/><circle cx="298" cy="42" r="8" fill="#0a0c0f" stroke="#2c343c"/>' +
    '<circle cx="42" cy="258" r="8" fill="#0a0c0f" stroke="#2c343c"/><circle cx="298" cy="258" r="8" fill="#0a0c0f" stroke="#2c343c"/>' +
    // RESET (top)
    '<rect x="128" y="56" width="46" height="46" rx="8" fill="#2a3038" stroke="#454d56"/>' +
    '<rect x="138" y="66" width="26" height="26" rx="5" fill="url(#cdcCap)"/>' +
    '<text x="151" y="120" text-anchor="middle" font-size="13" font-weight="700" fill="#3fcfe0">RESET</text>' +
    '<circle class="cdc-ring cdc-a-reset" cx="151" cy="79" r="36" fill="none" stroke="#3fcfe0" stroke-width="3.5"/>' +
    // FLASH (lower right)
    '<rect x="232" y="146" width="46" height="46" rx="8" fill="#2a3038" stroke="#454d56"/>' +
    '<rect x="242" y="156" width="26" height="26" rx="5" fill="url(#cdcCap)"/>' +
    '<text x="255" y="210" text-anchor="middle" font-size="13" font-weight="700" fill="#f2a63b">FLASH</text>' +
    '<text x="255" y="225" text-anchor="middle" font-size="9" fill="#7f857e">PW OFF</text>' +
    '<circle class="cdc-ring cdc-a-flash cdc-a-flash-p" cx="255" cy="169" r="36" fill="none" stroke="#f2a63b" stroke-width="3.5"/>' +
    '<circle class="cdc-ring cdc-a-flash" cx="255" cy="169" r="8" fill="#f2a63b"/>' +
    // order markers: 1 = FLASH, 2 = RESET
    '<g class="cdc-a-no1"><circle cx="220" cy="142" r="12" fill="#f2a63b" stroke="#0a0c0f" stroke-width="2"/><text x="220" y="147" text-anchor="middle" font-size="13" font-weight="700" fill="#1a1206">1</text></g>' +
    '<g class="cdc-a-no2"><circle cx="116" cy="52" r="12" fill="#3fcfe0" stroke="#0a0c0f" stroke-width="2"/><text x="116" y="57" text-anchor="middle" font-size="13" font-weight="700" fill="#06222a">2</text></g>' +
    '</svg>';

  function init() {
    if (document.getElementById("cdcFlashOverlay")) return; // schon da

    // CSS einhängen
    var style = document.createElement("style");
    style.id = "cdcFlashStyle";
    style.textContent = CSS;
    document.head.appendChild(style);

    // Overlay-DOM bauen
    var overlay = document.createElement("div");
    overlay.className = "cdc-flash-overlay";
    overlay.id = "cdcFlashOverlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "cdcTitle");
    overlay.innerHTML =
      '<div class="cdc-modal">' +
        '<div class="cdc-lang" role="group" aria-label="Language">' +
          '<button type="button" data-lang="de">DE</button>' +
          '<button type="button" data-lang="en">EN</button>' +
        '</div>' +
        '<div class="cdc-eyebrow" id="cdcEyebrow"></div>' +
        '<h2 id="cdcTitle"></h2>' +
        '<p class="cdc-sub" id="cdcSub"></p>' +
        '<div class="cdc-grid">' + BOARD_SVG +
          '<ol class="cdc-steps">' +
            '<li class="cdc-step s1"><span class="cdc-dot">1</span><p id="cdcS1"></p></li>' +
            '<li class="cdc-step s2"><span class="cdc-dot">2</span><p id="cdcS2"></p></li>' +
            '<li class="cdc-step s3"><span class="cdc-dot">3</span><p id="cdcS3"></p></li>' +
          '</ol>' +
        '</div>' +
        '<div class="cdc-pinbox"><span class="cdc-pi">i</span><p id="cdcPin"></p></div>' +
        '<div class="cdc-actions">' +
          '<button type="button" class="cdc-cancel" id="cdcCancel"></button>' +
          '<button type="button" class="cdc-confirm" id="cdcConfirm"></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    var $ = function (id) { return document.getElementById(id); };
    var pending = null, bypass = false, lastFocus = null, lang = getLang();

    function render() {
      var t = I18N[lang];
      $("cdcEyebrow").textContent = t.eyebrow;
      $("cdcTitle").textContent = t.title;
      $("cdcSub").innerHTML = t.sub;
      $("cdcS1").innerHTML = t.s1;
      $("cdcS2").innerHTML = t.s2;
      $("cdcS3").innerHTML = t.s3;
      $("cdcPin").innerHTML = t.pin;
      $("cdcCancel").textContent = t.cancel;
      $("cdcConfirm").textContent = t.confirm;
      var btns = overlay.querySelectorAll(".cdc-lang button");
      btns.forEach(function (b) {
        b.setAttribute("aria-pressed", b.getAttribute("data-lang") === lang ? "true" : "false");
      });
    }
    render();

    overlay.querySelectorAll(".cdc-lang button").forEach(function (b) {
      b.addEventListener("click", function () {
        lang = b.getAttribute("data-lang"); setLang(lang); render();
      });
    });

    function onKey(e) { if (e.key === "Escape") hide(); }
    function show(btn) {
      pending = btn; lastFocus = document.activeElement;
      overlay.classList.add("cdc-show"); $("cdcConfirm").focus();
      document.addEventListener("keydown", onKey);
    }
    function hide() {
      overlay.classList.remove("cdc-show");
      document.removeEventListener("keydown", onKey);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    // esp-web-tools Aktivier-Buttons abfangen - per Delegation am document, damit es auch
    // fuer dynamisch (per JS) erzeugte Buttons greift (z.B. der Store baut die Karte spaeter).
    document.addEventListener("click", function (e) {
      if (bypass) return;                   // synthetischer Klick -> echten Flash durchlassen
      var t = e.target;
      if (!t || !t.closest) return;
      var btn = t.closest('[slot="activate"]');
      if (!btn || !btn.closest("esp-web-install-button")) return;
      e.preventDefault();
      e.stopImmediatePropagation();         // esp-web-tools noch nicht starten
      show(btn);
    }, true);                               // Capture-Phase, vor esp-web-tools

    $("cdcCancel").addEventListener("click", hide);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) hide(); });
    $("cdcConfirm").addEventListener("click", function () {
      var btn = pending; hide();
      if (!btn) return;
      bypass = true;
      btn.click();                          // erneut auslösen -> esp-web-tools übernimmt
      setTimeout(function () { bypass = false; }, 0);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
