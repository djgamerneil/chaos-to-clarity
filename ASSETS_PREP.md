# ASSETS_PREP — slicing the artwork into 4 layers

> **Status:** the four layers have already been sliced from `Adobe Scan 23 Oct 2026 (1)_page-0001.jpg.jpeg` and are in `public/assets/`. Follow these steps only to re-slice from a new or better scan.

The code expects four PNGs in `public/assets/`. All four must be **exactly the same pixel size** and share the same alignment, because each is a full-canvas "cel" stacked on top of the others. Nothing is cropped per layer.

| File | Contains | Notes |
|---|---|---|
| `bg_topo.png` | All the topographic ink lines **outside** the figure | Black ink on transparency. Let the lines run ~25 px *underneath* the silhouette edge (see step 5). |
| `body_base.png` | Silhouette (head, neck, shoulders) filled **solid opaque white**, its black outline, the ears, both earbuds, and the earphone wires down to the jack | The white fill hides the background lines inside the figure. |
| `chest_scribbles.png` | The dense circular scribbles on the chest, plus the wispy strands rising up the neck | Black ink on transparency. |
| `head_waves.png` | The clean horizontal wavy lines inside the dome of the head, including the ends that run toward the ears | Black ink on transparency. Leave the head outline in `body_base`. |

Stack order in the code (bottom to top): white paper, `bg_topo`, `body_base`, `chest_scribbles`, `head_waves`.

## Target size

- Width **2400 px** (height follows the scan's ratio, about 1630 px). Mobile GPUs commonly cap textures at 4096 px, and mipmapped 2400 px layers stay crisp when scaled down.
- PNG-24 with alpha. Keep each file under roughly 4 MB (run through Squoosh or `pngquant` if larger).

## Steps (Photoshop, or the free Photopea at photopea.com)

1. **Open and crop.** Open the scan (`Adobe Scan 23 Oct 2026 (1)_page-0001.jpg.jpeg`, 3509 × 2380 px). Crop to the paper edge, straighten if needed (Edit > Transform > Rotate), then Image > Image Size to 2400 px wide.
2. **Clean the paper.** Add a Levels adjustment: drag the black input slider to about 60 and the white slider to about 190, so the paper is pure white and the ink is solid black. Flatten.
3. **Turn ink into transparency.** Open the Channels panel, Ctrl/Cmd-click the **Gray** channel (this selects the light areas), then Select > Inverse. Create a new layer, fill the selection with black (`Alt+Backspace`), and hide the original. You now have black ink on a transparent layer. Call it `INK_ALL`.
4. **Make the silhouette path.** With the Pen tool, trace the outside edge of the figure (head dome, ears, neck, shoulders, down to the bottom edge of the canvas). Make it a selection. Save it (Select > Save Selection > `figure`).
5. **Split the layers.** Duplicate `INK_ALL` four times and rename the copies:
   - **bg_topo:** load `figure`, then Select > Modify > **Contract by 25 px** (the selection now sits 25 px inside the silhouette edge). Press Delete on the `bg_topo` copy. Everything inside that smaller selection is removed, and the lines just outside it, plus the 25 px band under the silhouette edge, stay.
   - **chest_scribbles:** lasso around the chest scribbles and the neck strands (about the lower 30% of the figure, roughly y = 62% to 100% of the canvas height, x = 28% to 75%). Keep only that, delete the rest. Do not include the wire that crosses it.
   - **head_waves:** lasso the horizontal wave lines inside the dome (roughly y = 22% to 47%, x = 38% to 62%). Delete the rest, including the head outline.
   - **body_base:** this is what remains: the outline, ears, earbuds and wires. Delete the scribbles and waves from it. Then add a new layer **under** it, load `figure`, and fill the selection with **pure white `#FFFFFF`**. Merge the two layers. The fill must be 100% opaque.
6. **Check alignment.** Toggle each layer on and off at 100% zoom. There should be no visible seams where layers meet, and no ink missing at the borders between regions. Where a stroke crosses a border, copy it to the layer that owns most of it.
7. **Export.** For each layer: hide all the others, then File > Export As > PNG, with **Transparency ticked** and the same canvas size every time. Name files exactly: `bg_topo.png`, `body_base.png`, `chest_scribbles.png`, `head_waves.png`.

## Tuning the coordinates

`app.js` has a `CONFIG.pts` block with positions as fractions of the canvas (x from the left, y from the top). The defaults were read off the scan:

```js
chest: { x: 0.50,  y: 0.86 }    // centre of the scribbles
earL:  { x: 0.410, y: 0.439 }   // left earbud (measured on the current slices)
earR:  { x: 0.580, y: 0.437 }   // right earbud (measured on the current slices)
```

After slicing, open the layers in Photoshop, hover over each point and divide its pixel position by the canvas width/height. Adjust if your crop differs from the scan.

## Optional audio

Drop a royalty-free lo-fi chillhop loop at `public/assets/clarity.mp3` (or `lofi.mp3`; a seamless loop, 70–90 bpm, ideally with a clear kick for the head waves to react to). If the file is missing, the app plays a built-in generative lo-fi loop instead, so you can test without it.
