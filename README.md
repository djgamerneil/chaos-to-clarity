# Clarity — a living drawing

A four-scene WebGL experience built on a hand-drawn fine-liner artwork. Stack: HTML/CSS/ES modules, PixiJS 7 (layers + custom GLSL shaders), GSAP 3 (timeline and camera), Web Audio API (static, snap, lo-fi, analyser), bundled with Vite.

## Folder layout

```
chaos-to-clarity/
├── index.html
├── style.css
├── app.js
├── package.json
├── ASSETS_PREP.md
├── STORYBOARD.md
├── STORYBOARD_TIMELINE.md
└── public/
    └── assets/
        ├── bg_topo.png                   (required)
        ├── body_base.png                 (required)
        ├── chest_scribbles.png           (required)
        ├── head_waves.png                (required)
        ├── alivetopographic lines.mp4    (optional intro video)
        └── clarity.mp3                   (optional; lofi.mp3 is also accepted)
```

The four PNGs are already sliced from the scan (see `ASSETS_PREP.md`). If one is missing, the start screen shows which file could not be loaded. Vite serves `public/` at the site root and copies it into the build, so the code refers to these files as `assets/…`.

## Run locally

```bash
npm install
npm run dev
```

Open the printed URL (usually `http://localhost:5173`). `npm run build` writes a static site to `dist/`, and `npm run preview` serves that build.

**Windows PowerShell:** if `npm` or `npx` fails with "running scripts is disabled on this system", either call the `.cmd` shims (`npm.cmd run dev`, `npx.cmd vite`) or allow local scripts once for your user:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

PixiJS and GSAP come from npm and are bundled by Vite, so the page must be run through Vite (or built). Opening `index.html` directly, or with Live Server, will not resolve the imports.

## Deploy to GitHub Pages

The `.github/workflows/pages.yml` workflow builds and deploys the site to GitHub Pages whenever changes are pushed to `main` (or when started manually from the Actions tab). The Pages-specific Vite base path is configured by `npm run build:pages` for this repository's URL path.

In the repository settings, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. After the workflow completes, GitHub Pages will show the live site URL on that settings page.

## The journey

The visitor's tap on the gate starts the cinematic (browsers block audio until a gesture). It runs 49 seconds, then the sanctuary loops indefinitely. `STORYBOARD_TIMELINE.md` is the cue sheet; the code mirrors it in `journey()`.

| Scene | Time | What happens | How it's built |
|---|---|---|---|
| 1. Overwhelm | 0–15 s | Black ink topography close up, pulling back; static starts; the ink artwork is revealed beneath from 10 s | Intro video (`alivetopographic lines.mp4`), or the `FRAG_NEON` shader if it is missing; `intro.zoom` / `intro.alpha` |
| 2. Internal Agony | 15–30 s | Paper tone, push into the chest, scribbles rotate and pulse to a peak, static at its loudest | `FRAG_CHEST` driven by `S.chInt`, camera shake, `audio.intensify()` |
| 3. Escape | 30–45 s | Pan up the wire to the earpiece while lo-fi fades in under the static; snap at 42 s cuts the static and freezes the chest; pan to the head | Camera tweens, `audio.fadeIn()`, `snap()` → `audio.snap()` + `audio.drop()`, ring effect |
| 4. Sanctuary | 45 s → ∞ | Pull out to the full drawing, slow contour drift, subtle chest float, pointer parallax, head waves follow the bass | Background displacement, analyser-driven `FRAG_HEAD` |

Captions from the storyboard appear at their cue points. **Skip to sanctuary** (top right) jumps to Scene 4 at any time during the cinematic, and **Sound on/off** mutes everything and stays available throughout.

## Tuning

- **Timings, camera moves and captions:** the `journey()` function in `app.js` (positions are seconds after the tap).
- **Key points on the artwork:** `CONFIG.pts` (fractions of the canvas).
- **Chest violence:** `S.chInt` (1 = violent, about 0.06 = tamed) and the numbers in `FRAG_CHEST`.
- **How much the head waves react:** the `0.011` (bass) and `0.004` (mid) factors in `FRAG_HEAD`, and the bin ranges in `audio.update()`.
- **Intro fallback look:** line density (`16.0`) and stroke width (the `smoothstep` edges) in `FRAG_NEON`.
- **Background illusion:** `S.wave` sets how far the travelling ripple pushes the topo lines (0 turns it off); the ripple spacing (`34.0`) and speed (`1.4`) are in `FRAG_BG`.

## Notes and limits

- **Music:** put your track at `public/assets/clarity.mp3` (or `lofi.mp3`). Without either, a generative lo-fi loop plays and still drives the head waves, since the analyser reads whichever one is playing.
- **Intro video:** put it at `public/assets/alivetopographic lines.mp4`. It plays muted and cover-fitted. Without it, the procedural neon shader stands in.
- **Framing:** the artwork is cover-fitted, so it always fills the screen with no empty bars; whatever overflows is trimmed (a little top and bottom on wide screens, the sides on a portrait phone). The camera is clamped to the artwork's edges. The zoom values in `journey()` are relative to that fit.
- **AR:** this build is a full-screen WebGL canvas. For real image-tracked AR (camera feed over the physical drawing), the usual route is MindAR image tracking with the scan as the target, rendering this canvas as the overlay. That would be a separate step.
