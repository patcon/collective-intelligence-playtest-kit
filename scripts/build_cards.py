# /// script
# dependencies = []
# ///
"""Render the-and-cards.csv into cards.html (screen + print at 2.5x3.5in).

Run: uv run scripts/build_cards.py
"""
import csv
import html
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Icons are drawn on a 24x24 grid as strokes so they match the cards' thin line art.
ICONS = {
    "gem": '<path d="M7 6h10l3 4-8 9-8-9z"/><path d="M4 10h16M10 6l-1.5 4L12 19l3.5-9L14 6"/>',
    "infinity": '<path d="M12 12c-2-2.7-3.5-4-5.5-4a4 4 0 0 0 0 8c2 0 3.5-1.3 5.5-4s3.5-4 5.5-4a4 4 0 0 1 0 8c-2 0-3.5-1.3-5.5-4z"/>',
    "rewind": '<path d="M5.6 9A7 7 0 1 1 5 13"/><path d="M5 5.5V9.2h3.7"/><path d="M12 8.5V12l2.5 1.5"/>',
    "faces": '<path d="M8 3.5c.8 1.5 1.2 3 1.2 4.5l2.3 2.6-1.4.5.7 1.3-.8.6.8.9-.9.9c.3 1.6-.5 2.7-1.5 3.4-.6.4-.9 1.4-.9 2.3"/><path d="M16 3.5c-.8 1.5-1.2 3-1.2 4.5l-2.3 2.6 1.4.5-.7 1.3.8.6-.8.9.9.9c-.3 1.6.5 2.7 1.5 3.4.6.4.9 1.4.9 2.3"/>',
    "heart": '<path d="M12 19s-7-4.4-7-9.5A3.8 3.8 0 0 1 12 7.5a3.8 3.8 0 0 1 7 2c0 5.1-7 9.5-7 9.5z"/><path d="M12 7.5l-1.2 3.2 2.4 2-1.2 3"/>',
    # Older printing (cards 178, 179): same heart, drawn whole instead of cracked.
    "heart-whole": '<path d="M12 19s-7-4.4-7-9.5A3.8 3.8 0 0 1 12 7.5a3.8 3.8 0 0 1 7 2c0 5.1-7 9.5-7 9.5z"/>',
    "ear": '<path d="M8 10a5 5 0 0 1 10 0c0 3-2.5 3.8-2.5 6.3A2.7 2.7 0 0 1 12.8 19c-1.4 0-2.3-.8-2.6-1.8"/><path d="M11 10.5a2.3 2.3 0 0 1 4.3-.8c.5 1.2-.7 1.9-1.6 2.5"/>',
    "megaphone": '<path d="M9 10.5l7-3.5v10l-7-3.5z"/><path d="M9 10.5H7.5a1.5 1.5 0 0 0 0 3H9"/><path d="M10 14l1 4h1.5l-.8-3.4"/>'
                 '<path d="M4.5 9.5l-1.5-1M4 12H2.5M4.5 14.5l-1.5 1M6 7.5L5.5 6"/>',
    "tear": '<path d="M3 11s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5z"/><circle cx="12" cy="11" r="2.3"/><path d="M16 15.5c.9 1.3 1.4 2.1 1.4 2.7a1.4 1.4 0 0 1-2.8 0c0-.6.5-1.4 1.4-2.7z"/>',
    "not-equal": '<path d="M6 9.5h12M6 14.5h12M15 6l-6 12"/>',
    "dollar": '<path d="M15.5 8.5c-.5-1.2-1.8-2-3.5-2-2 0-3.3 1-3.3 2.6 0 3.5 7 2 7 5.6 0 1.6-1.5 2.8-3.7 2.8-1.8 0-3.2-.9-3.7-2.2"/><path d="M12 4.5v15"/>',
    "baby": '<circle cx="12" cy="7.5" r="2.7"/><path d="M8.3 11.5c-1 1.5-1.3 3.3-.6 5 .8 2 2.4 3 4.3 3s3.5-1 4.3-3c.7-1.7.4-3.5-.6-5"/><path d="M8.5 11.5c1 .9 2.2 1.3 3.5 1.3s2.5-.4 3.5-1.3M9.5 15.5h5"/>',
}

# Cards whose printed icon is a variant of their CSV `icon` (old/worn batch).
ICON_VARIANT = {"178": "heart-whole", "179": "heart-whole"}

CSS = """
:root{--paper:#fbfaf7;--ink:#2b2b2b;--bg:#e9e5df;--mut:#6b6762}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#1d1c1b;--mut:#a29d97}}
:root[data-theme="dark"]{--bg:#1d1c1b;--mut:#a29d97}
*{box-sizing:border-box}
body{margin:0;padding:24px 16px;background:var(--bg);font-family:"Josefin Sans","Montserrat",system-ui,sans-serif}
header{max-width:1100px;margin:0 auto 20px;color:var(--mut);font-size:14px}
header h1{margin:0 0 4px;font-size:20px;color:inherit}
.deck{display:flex;flex-wrap:wrap;gap:16px;justify-content:center}

/* One card = 2.5in x 3.5in (poker size). Everything inside scales with --w. */
.card{--w:220px;width:var(--w);aspect-ratio:5/7;position:relative;background:var(--paper);color:var(--ink);
  border-radius:calc(var(--w)*.06);box-shadow:0 1px 3px rgba(0,0,0,.25);font-size:calc(var(--w)*.04)}
/* Double-line frame */
.card::before,.card::after{content:"";position:absolute;border:1px solid var(--ink);pointer-events:none}
.card::before{inset:calc(var(--w)*.075)}
.card::after{inset:calc(var(--w)*.095)}
/* Icon badge straddling the top of the frame */
.badge{position:absolute;left:50%;top:calc(var(--w)*.085);transform:translate(-50%,-50%);
  width:calc(var(--w)*.13);height:calc(var(--w)*.13);background:var(--paper);border:1px solid var(--ink);
  display:grid;place-items:center;z-index:1}
.badge svg{width:72%;height:72%;fill:none;stroke:var(--ink);stroke-width:1.3;stroke-linecap:round;stroke-linejoin:round}
.text{position:absolute;left:18%;right:18%;top:22%;margin:0;text-align:center;text-transform:uppercase;
  letter-spacing:.14em;line-height:1.9;font-weight:400}
.card.missing{background:transparent;box-shadow:none;border:2px dashed var(--mut);color:var(--mut)}
.card.missing::before,.card.missing::after{display:none}
.card.missing .text{top:45%;opacity:.7}
.meta{position:absolute;bottom:calc(var(--w)*.03);right:calc(var(--w)*.05);font-size:.7em;color:#aaa;letter-spacing:.05em}

@media print{
  body{background:#fff;padding:0}header{display:none}
  .deck{gap:.125in;justify-content:flex-start}
  .card{--w:2.5in;box-shadow:none;outline:1px dashed #ccc;break-inside:avoid}
  .meta{display:none}
  .card.missing{display:none}
}
"""


def card_html(card_id: str, icon: str, text: str) -> str:
    if not text:  # placeholder row for a card we don't have yet
        return (
            f'<article class="card missing" id="card-{card_id}">'
            f'<p class="text">Missing</p><span class="meta">#{card_id}</span></article>'
        )
    return (
        f'<article class="card" data-icon="{icon}" id="card-{card_id}">'
        f'<div class="badge" title="{icon}"><svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[ICON_VARIANT.get(card_id, icon)]}</svg></div>'
        f'<p class="text">{html.escape(text)}</p>'
        f'<span class="meta">#{card_id} · {icon}</span></article>'
    )


def main() -> None:
    rows = list(csv.DictReader((ROOT / "sources" / "the-and-cards.csv").open()))
    missing = {r["icon"] for r in rows if r["icon"]} - ICONS.keys()
    if missing:
        raise SystemExit(f"No SVG drawn for icon(s): {', '.join(sorted(missing))}")
    have = sum(1 for r in rows if r["text"])
    cards = "\n".join(card_html(r["card_id"], r["icon"], r["text"]) for r in rows)
    out = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Self Edition Cards</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@400&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body>
<header><h1>{{THE AND}} — Self edition</h1>{have} of {len(rows)} cards transcribed ({len(rows) - have} missing), generated from <code>sources/the-and-cards.csv</code> by <code>scripts/build_cards.py</code>. Print to get 2.5×3.5in cards.</header>
<main class="deck">
{cards}
</main></body></html>"""
    (ROOT / "cards.html").write_text(out)
    print(f"wrote cards.html with {have}/{len(rows)} cards ({len(rows) - have} missing)")

    # Standalone icon files: the bare glyph, and the glyph in its square badge as printed on cards.
    icon_dir = ROOT / "icons"
    icon_dir.mkdir(exist_ok=True)
    stroke = 'fill="none" stroke="#2b2b2b" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"'
    for name, paths in ICONS.items():
        (icon_dir / f"{name}.svg").write_text(
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" {stroke}>{paths}</svg>\n'
        )
        (icon_dir / f"{name}-badge.svg").write_text(
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-5 -5 34 34" width="136" height="136">'
            f'<rect x="-4.5" y="-4.5" width="33" height="33" fill="#fbfaf7" stroke="#2b2b2b" stroke-width="1"/>'
            f'<g {stroke}>{paths}</g></svg>\n'
        )
    print(f"wrote {len(ICONS) * 2} icon SVGs to icons/")


if __name__ == "__main__":
    main()
