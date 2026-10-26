# Cinematic timing reference

The visitor tap starts the sequence. The intro video is the supplied `alivetopographic lines.mp4`; the art PNGs and `clarity.mp3` are loaded from `public/assets/`. Total cinematic duration is 49 seconds, then the sanctuary loops indefinitely.

| Time | Camera and art | Sound and text |
|---|---|---|
| 0–5s | Stay close on moving neon topography. Begin pulling back. | Start static; “The noise closes in.” |
| 5–10s | Pull back farther; contours surge toward center. | Static continues. |
| 10–15s | Reveal transition from video into full monochrome ink artwork. | Static swells. |
| 15–20s | Switch canvas to paper tone; zoom toward chest. | “The noise turns inward.” Static intensifies. |
| 20–25s | Chest scribbles begin rotating and pulsing. | Agitated static continues. |
| 25–30s | Tight chest crop; scribble movement reaches peak. | “Every thought circles.” Static at peak. |
| 30–35s | Camera pans from chest toward earphone wire and head. | “Follow the wire.” Lo-fi starts fading in. |
| 35–40s | Trace the wire upward; frame the earpiece. | Lo-fi grows, static remains underneath. |
| 40–42s | Hold at the earphones; prepare the snap. | Music takes focus. |
| 42s | Snap: freeze chest rotation and cut the static. | Static cuts; music continues. “Click. Clarity.” |
| 42–45s | Pan toward the head, then begin the full-art pullback. | Music only. |
| 45–49s | Settle on the complete artwork. | “A breath. A beat. A way through.” |
| 49s onward | Topography breathes, chest floats subtly, head waves follow bass energy. | Lo-fi loop continues. Mute remains available. |

The code exposes the beats as GSAP timeline positions in `app.js`. Adjust positions after the final track and layer exports are in place; preserve the 45-second scene transition and keep the sanctuary motion slow.
