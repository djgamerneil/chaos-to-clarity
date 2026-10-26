# Running this project on another device

These are the steps to run **Clarity — a living drawing** on a fresh machine. They are written so a person or a coding agent (such as Codex) can follow them from top to bottom without extra context.N

**For a coding agent:** don't change any source files to get the project running. Everything it needs is in the folder. Only run the commands below and report what they print.

## What this project is

- It's a static web page (`index.html`, `app.js`, `style.css`) that uses PixiJS 7, GSAP 3 and the Web Audio API.
- Vite bundles it and serves it locally.
- The artwork is already prepared. The four layer images are in `public/assets/`, so nothing needs to be generated or sliced.

## 1. Copy the folder

Copy the whole `chaos-to-clarity` folder to the new device. You can leave out:

| Leave out | Why |
|---|---|
| `node_modules/` | It is about 58 MB and contains files built for the original computer's operating system. It is reinstalled in step 3. |
| `dist/` (if present) | Build output, recreated by `npm run build`. |

These must be included:

```
index.html
app.js
style.css
package.json
package-lock.json
public/assets/bg_topo.png
public/assets/body_base.png
public/assets/chest_scribbles.png
public/assets/head_waves.png
```

The scan (`Adobe Scan … .jpeg`) and the `.md` files are reference material. The app does not load them.

## 2. Install Node.js

You need **Node.js 18, 20, or 22 or newer** (Vite 6.4 requires one of these). npm comes with Node.js.

Check what is installed:

```bash
node --version
npm --version
```

If `node` is missing or older than 18, install the current LTS version from https://nodejs.org and open a new terminal.

## 3. Install dependencies

Open a terminal **inside the project folder** (the one that contains `package.json`) and run:

```bash
npm ci
```

`npm ci` installs the exact versions recorded in `package-lock.json`. If it fails because the lock file doesn't match, run `npm install` instead.

An internet connection is needed for this step only.

## 4. Start the app

```bash
npm run dev
```

Vite prints a local address, usually:

```
➜  Local:   http://localhost:5173/
```

Open that address in a browser (Chrome, Edge, Firefox or Safari), then click **Tap to begin**.

Keep the terminal open while using the app. Press `Ctrl + C` in the terminal to stop it.

## 5. Check that it works

When everything is set up correctly:

1. **Start screen:** a white page shows the word **"Clarity"**, and the button changes from "Loading…" to **"Tap to begin"**.
2. **After the tap:** black-ink topographic lines appear, the caption "The noise closes in." shows, and static sound begins.
3. **Controls:** **Sound on** and **Skip to sanctuary** buttons appear in the top-right corner.
4. **The full sequence** runs about 49 seconds and ends on the full drawing, which keeps moving gently and indefinitely.

These browser-console messages are **expected and harmless**, because two optional files are not included:

- `404` for `assets/alivetopographic lines.mp4`: the optional intro video. A built-in animation is used instead.
- `404` for `assets/clarity.mp3` and `assets/lofi.mp3`: optional music. A built-in generated loop plays instead.

## Troubleshooting

| Problem | Fix |
|---|---|
| **Windows PowerShell:** "running scripts is disabled on this system" when running `npm` or `npx` | Use the `.cmd` versions, which skip this check: `npm.cmd ci`, then `npm.cmd run dev`. Or allow scripts for your user once, with `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, and open a new terminal. |
| `npm: command not found` / `'npm' is not recognized` | Node.js is not installed or not on PATH. Install it (step 2) and open a new terminal. |
| Port 5173 is already in use | Vite automatically picks the next free port. Use the address it prints. |
| The button says **"Layers missing"** | One of the four PNGs in `public/assets/` was not copied. Copy them again from the original folder. They must keep these exact names. |
| **"WebGL failed to start"** | The browser or graphics driver has WebGL turned off. Try a different browser, or enable hardware acceleration in the browser's settings. |
| No sound | Sound only starts after **Tap to begin**, because browsers block audio until you interact. Also check the **Sound on/off** button and the device's volume. |
| A blank page, or errors about `import` | The page was opened directly as a file (`file://…`) or through a plain static server. It must be run with `npm run dev`, or built as described below. |

## Viewing on a phone on the same Wi-Fi (optional)

```bash
npm run dev -- --host
```

Vite prints a `Network:` address such as `http://192.168.1.20:5173/`. Open that address on the phone. Both devices must be on the same network, and the computer's firewall may ask to allow Node.js.

## Building a static version (optional)

To host it on a website, or run it without the dev server:

```bash
npm run build      # writes the finished site to dist/
npm run preview    # serves dist/ locally to check it
```

You can upload the `dist/` folder to any static host, such as Netlify, Vercel, GitHub Pages or a normal web server.

## Optional media

To use your own files, put them in `public/assets/` with exactly these names, then reload the page:

| File | Purpose |
|---|---|
| `alivetopographic lines.mp4` | Intro video for the first 15 seconds |
| `clarity.mp3` (or `lofi.mp3`) | The music track. It should be a seamless loop. |

## Where to look next

- `README.md`: how the experience works and which settings to tune.
- `STORYBOARD.md` and `STORYBOARD_TIMELINE.md`: the scene and timing plan.
- `ASSETS_PREP.md`: how the artwork layers were made, in case they need re-making from a new scan.
