# AORMS launch reels — animated source

Self-contained animated reels for the Instagram campaign
([INSTAGRAM-CAMPAIGN.md](../INSTAGRAM-CAMPAIGN.md)). Each reel is a small
React timeline rendered in the browser — no video editor, no build step.
Scenes are plain JSX transformed in-page by Babel standalone; React and
Babel load from CDN, fonts from Google Fonts (IBM Plex).

## Files

| File | Role |
|---|---|
| `animations.jsx` | Timeline engine — `Stage`, `Sprite`, `useTime`/`useSprite`, `Easing`, scrubber + play/pause chrome. Everything exports on `window`. |
| `aorms-kit.jsx` | Shared brand kit — Carbon-dark palette, IBM Plex font stacks, `formatINR`, `rise`/`fade` reveal helpers, `EndCard`, `BrandLogo`, contour background. |
| `prioritize-scene.jsx` | **"When everything is urgent"** (P4 · ESTI, purple accent) — hook → AI daily stand-up → ESTI scoring → ranked task list → payoff → end card. 37 s. |
| `task-prioritization-square.html` | Mounts the prioritize scene at **1080×1080 (1:1)** with `window.SQUARE = true`. |
| `assets/` | Brand assets referenced by the scenes (AORMS white logo, ESTI mark, landing contour background). |

Load order matters: `animations.jsx` → `aorms-kit.jsx` → scene. Each file
reads the previous one's globals from `window`.

## Preview

Babel fetches the `.jsx` files over HTTP, so serve the directory instead of
opening the file directly:

```sh
cd docs/marketing/reels
python3 -m http.server 8080
# open http://localhost:8080/task-prioritization-square.html
```

Controls: space = play/pause, ←/→ = seek, 0 = restart. The playhead
position persists per `persistKey` across reloads.

## Export to video

Screen-record the stage at 100 % zoom (the stage letterboxes itself to the
viewport), or use any DOM-to-video capture of the `#root` element. The
timeline is deterministic — a given `t` always renders the same frame — so
captures are reproducible.

## Adding a reel

1. Write a new `<name>-scene.jsx` that composes `Sprite`s inside the shared
   kit (copy `prioritize-scene.jsx` as the template) and assigns its root
   component to `window`.
2. Copy one of the mount HTML files, point it at the new scene, and set the
   `Stage` size — 1080×1080 for feed (set `window.SQUARE = true`),
   1080×1920 for reels/stories.
3. Register the concept in `INSTAGRAM-CAMPAIGN.md` §4.
