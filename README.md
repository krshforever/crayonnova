# 🖍️ Crayon Nova

**The future is drawn by hand.** A futuristic crayon brand site where every pixel is CSS, SVG, or canvas — zero bitmaps, zero dependencies.

**Live:** https://krshforever.github.io/crayonnova/

## What it is

A crayon line from 2099: 18 neon-wax shades on a dark "space paper" canvas, with a real working **Sketch Lab** — a canvas crayon engine, not a demo video of one.

## Pages

| Page | What |
|---|---|
| `index.html` | Hero with floating crayons, live doodle pad, featured palette, roll-a-crayon, club form |
| `colors.html` | All 18 shades — filter by family, copy any hex, shuffle the box |
| `sketch-lab.html` | The main event (below) |
| `manifesto.html` | Brand story, 5-step process, FAQ |
| `404.html` | A rough sketch of a page |

## The Sketch Lab engine (`assets/app.js` → `createEngine()`)

One shared engine powers both the hero pad and the full lab:

- **Crayon** — 4-pass jittered strokes + wax speckle, speed-sensitive width, pen-pressure support, pointer coalescing
- **Marker** — fat translucent strokes · **Eraser** — repaints paper
- **Text** — type, tap the sheet; multi-pass jittered fillText in handwriting font, size + tilt sliders
- **Stickers** — 6 hand-drawn SVG doodles (star, heart, arrow, bolt, moon, spiral) with ±8° rotation
- **History** — undo/redo ×24, ink-preserving resize · **Autosave** to localStorage (sheet survives reload)
- **Export** — PNG download · **Focus mode** — canvas takes over · **Cursor ring** — live nib preview
- Hotkeys: `1–0/-=` colors · `C/M/T/S/E` tools · `Ctrl+Z` / `Ctrl+Shift+Z`

## The whole site obeys one variable

Roll-a-crayon sets a single `--accent` CSS custom property that drives every button, glow, and focus ring site-wide — persisted to localStorage. Dark crayons auto-lift for contrast.

## Run it

No build. No install. Just serve the folder:

```bash
python3 -m http.server 8791
# → http://127.0.0.1:8791/index.html
```

## Stack

HTML + CSS + vanilla JS. Google Fonts (Space Grotesk, Caveat, Space Mono) with system fallbacks. That's the whole list.
