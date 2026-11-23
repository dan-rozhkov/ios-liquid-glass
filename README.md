# ios-liquid-glass

A [Claude Code](https://claude.com/claude-code) skill for iOS 26+ **Liquid Glass** in renders: screenshots and frame-recorded videos of faux iOS UI (case studies, promo videos, phone mockups). The values are measured on real iOS screenshots and screen recordings and are compared side by side with them.

**Chromium only.** The lens refraction is `backdrop-filter: url(#svg-filter)` with an `feDisplacementMap`, which only Chromium supports. Safari and Firefox show a plain frosted panel. Use it for rendering through Playwright/Chromium, not for live site UI.

## What's inside

| File | What it is |
|---|---|
| `SKILL.md` | The skill: usage, every style with its measurements, motion rules, what was tried and rejected |
| `glass.css` | Styles: `.glass` (light), `.glass-tint` (coloured), `.glass-dark`, `.glass-clear` (dark clear glass over media), `.glass-lens` (tab-bar drag lens); components `.glass-capsule`, `.glass-circle`, `.glass-tabbar`, `.glass-sheet` |
| `glass.js` | `applyGlass(root)`: one SVG filter per `.glass` element (blur, saturation, lens bend from a rounded-rect SDF, optional magnification and colour split) |
| `examples/*.src.html` | Scenes per style. `python3 examples/build.py` inlines the current css/js into `*.html` |
| `examples/tabbar-lens.src.html` | Animated tab-bar lens (iOS 26 drag): `renderAt(t)` for frame recording, mouse drag live, `?take` loops a scripted take |
| `examples/record-tabbar-lens.mjs` | Renders that take to MP4 or stills |
| `statusbar-ios27.html` | iOS 27 status bar icons as inline SVG |
| `regress/` | Pixel-diff check that a `glass.js` change leaves existing renders untouched |
| `track-video.py`, `patch-video.py` | Swap a glass button into an already recorded video |

## Install

```sh
git clone https://github.com/dan-rozhkov/ios-liquid-glass ~/.claude/skills/ios-liquid-glass
```

Claude Code picks it up as the `ios-liquid-glass` skill.

## Scripts

Node scripts load Playwright through `pw.mjs`. Run them from a folder where `playwright` is installed, or set `PLAYWRIGHT` to its entry file. Set `CHROMIUM` to use a specific browser executable.

```sh
python3 examples/build.py
node examples/record-tabbar-lens.mjs video lens.mp4 60 3     # fps, device pixel ratio
regress/build.sh /tmp/before && node regress/shot.mjs /tmp/before /tmp/shots-before
```

Reference screenshots used for matching are not in the repository (they are screens of third-party apps).

## Credits

The lens magnification, colour split and corner handling borrow the maths of [bilalgursen/liquid-glass](https://github.com/bilalgursen/liquid-glass) (MIT); the values and the rendering path are this skill's own.

## License

[MIT](LICENSE)
