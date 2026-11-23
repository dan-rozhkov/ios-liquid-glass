---
name: ios-liquid-glass
description: Use when a faux iOS UI, case render, stageshow scene, phone mockup or promo video needs iOS 26+ Liquid Glass — glass tab bars, capsule buttons, circle buttons, "стекло как в iOS" — or an iOS 27 status bar (signal, Wi-Fi, battery icons). Chromium-only lens refraction for screenshots and recorded videos, plus how to swap glass into an already-recorded video without re-animating.
---

# iOS Liquid Glass for renders

For **renders only** (screenshots, frame-recorded videos made in Chromium/Playwright). The refraction uses `backdrop-filter: url(#svg-filter)`, which only Chromium supports; Safari/Firefox show the plain frosted version. Don't use it for live site UI.

Files next to this skill:
- `glass.css` — the look. Styles: `.glass` (light, default), `.glass-tint` + `--tint` (coloured / prominent), `.glass-dark` (over dark content, frosted), `.glass-clear` (dark clear glass over vivid media, sharp content and a strong bend at the caps) + `.glass-sel` (its darker selected-tab lens). Components: `.glass-capsule`, `.glass-circle`, `.glass-tabbar`, `.glass-sheet` (floating bottom sheet).
- `glass.js` — `applyGlass(root)`: builds one SVG filter per `.glass` element (blur → saturate → `feDisplacementMap` from a rounded-rect SDF), so the backdrop bends like a lens near the edges and stays flat in the middle. CSS vars per element: `--bezel` (edge zone px), `--refract` (bend px), `--blur`, `--sat`; opt-in `--tint-map`, `--lum` (both rejected by Danil's references, keep off); bend shape `--profile:snell` (physical, used by `.glass-clear`), `--curve`, `--nofold`, post-bend `--soften`; caps-only bend `--bezel-x`, `--refract-x`, `--disp-x` (used by `.glass-lens`); map supersampling `--ss`; lens options `--mag`, `--disp` (on by default for `.glass-capsule/-circle/-tabbar`, see «Lens options»). `--tone` (a tone curve on the backdrop, used by `.glass-clear`).
- `examples/` — `light-tinted.src.html` (three phones: light sheet, list + Done, dark content + tab bar, colour swatches), `dark.src.html` (iOS Notes dark scene), `tinted-vs-reference.src.html` (Reminders buttons at the reference's scale), `lens.src.html` (the lens options over stripes and text), `clear-dark.src.html` (`.glass-clear` toolbar + tab bar over a red photo and a striped track, rebuilt 1:1 over `clear-dark-ref.jpg`, iPhone Pro Max; shoot `.scr` at dpr 920/440), `tabbar-lens.src.html` (the tab-bar drag lens, animated: `renderAt(t)` for recording, drag with a mouse live, `?take` loops the scripted take; record with `node examples/record-tabbar-lens.mjs video OUT.mp4 60 3`), `sheet.src.html` (Settings screen + floating sheet with title, radio list, footnote and a tinted Done button; iPhone Pro Max 440×956, shoot at dpr 943/440 to compare with Danil's reference). `python3 examples/build.py` inlines the current css/js into `*.html`.
- `track-video.py`, `patch-video.py` — swap a glass element into an existing recorded video (see below).
- `statusbar-ios27.html` — the iOS 27 status bar icons (signal, Wi-Fi, battery) as inline SVG; `examples/ios27-status-ref.png` is Danil's reference.

## Usage

1. Inline `glass.css`, add class `glass` (+ a style class + a component class) to the element.
2. Inline `glass.js` after the markup and call `applyGlass(container)` **after** the element is visible and laid out (it reads `offsetWidth`; hidden views give 0). Re-run if the size changes.
3. Content must actually pass under the glass (scroll it under the tab bar), or the refraction has nothing to show.
4. Pick the style by what is underneath: light content → `.glass`; dark content → `.glass-dark`; dark UI over a photo or bright, colourful media where the content should stay sharp → `.glass-clear`; the one primary action → `.glass-tint`.

## Matching a reference (how every value here was found)

1. Download the reference at full size (Pinterest: `i.pinimg.com/originals/…` or `/1200x/…` from the pin page).
2. Measure pixel luminance across each edge (top, bottom, left/right cap) and the fill, and the background next to it.
3. Rebuild the same element at the reference's scale (px per pt) on the same background, screenshot, and compare crops side by side; iterate on numbers until edge profiles match within a few levels.
4. Post the comparison to Danil before calling it done. When two references disagree, take the middle and say so.
5. Find the device first: width/height ratio of the screenshot → 393×852 (Pro) or 440×956 (Pro Max); px per pt = image width / pt width. Guessing 393 when it was 440 throws every size off by 12%.
6. Fit text sizes by measured glyph extents (cap top → descender, line width), not by eye; match line breaks of multi-line text.
7. Caption comparison images with a Cyrillic-capable font (`ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 36)`); PIL's default font prints Russian as boxes.

## The look (approved by Danil, measured on real iOS)

- Fill `rgba(250,250,252,.6)`, soft shadow `0 10px 30px -6px rgba(0,0,0,.10), 0 2px 6px rgba(0,0,0,.04)`. No uniform hairline.
- **Outline is directional**: darkest on the left/right ends (.15 black), getting lighter toward the middle but **never zero** (.05 floor), lightest on top, slightly stronger at the bottom. A uniform border looks fake.
- **White specular rim sits 1px inside the outline** (`::after` with `inset:1px`). If it overlaps the outline, the dark edge disappears.
- Tab bar: floating capsule 64px, radius 32, padding 5; active tab = inner pill `rgba(24,24,27,.085)` with radius 27 (concentric). Small controls: 40px capsule/circle.
- Compare side by side with the reference at 3–4× zoom and measure edge luminance (left/right vs top/bottom) before calling it done.

## Tinted (coloured) glass — `.glass.glass-tint` + `style="--tint:#hex"`

Measured on a real iOS 26 screenshot (Reminders "Update now", dark mode) — trust this over a literal reading of the HIG:
- Near-opaque, flat fill, a touch softer than the tint: `oklch(from tint l+.012 c×.9 h+5 / .97)` → blue #0091FF renders rgb 65,144,246 (measured 65,144,246).
- Rim light on the **top and bottom edges only**: a lighter, cyan-shifted tone `oklch(from tint l+.17 c×.6 h−28)` (≈ rgb 99,213,251 for blue), ~2px fading inward. Nothing on the side caps, **no dark outline**, no coloured shadow.
- Label white, semibold. Tint only the primary action, one or two per view; colour on the background, not on the symbol (HIG).
- The HIG says tint "generates a range of tones mapped to content brightness"; in practice over flat backgrounds it reads as a flat fill. glass.js still offers that mapping as opt-in `--tint-map` (it darkens over dark content, which the screenshot does NOT show — don't use it by default).
- Apple system colours (light): Blue #0088FF, Green #34C759, Red #FF383C, Orange #FF8D28, Indigo #6155F5, Purple #CB30E0 (dark: Blue #0091FF …).

## Sheet — `.glass.glass-sheet`

Rule from Danil (2026-11-17): use Apple's styles exactly as measured; add nothing of your own. A gradient "volumetric" primary button was rejected — the primary button is one flat colour. Toolbar buttons on the sheet (close, «…») are regular glass circles 44 pt, as iOS 26 renders sheet toolbar items; grey fills are iOS 18.

Measured on Danil's iOS 26 screenshot (iPhone Pro Max, a Settings sheet with "Self-Evaluation Prompt", 2026-11-17):
- Floats over the screen: `left/right/bottom: 8.5px`, height set by content. Corners are **continuous** — `corner-shape: squircle` with radius 68 top / 105 bottom (bottom concentric with the display). A circular radius misses the reference by 20 px at the corner start; fitted by rim position at 6–9 depths.
- Material: fill `rgba(248,248,250,.72)` → 238 over a 213–224 backdrop (reference 238); `--blur:5`, `--sat:1.25`, `--bezel:30`, `--refract:10`. A text row underneath turns into a smudge 14 levels darker than the fill — the same profile as the reference within ±2. Blur 9 washes it out; more opacity hides it.
- Edge: a uniform white ~1pt rim on all sides (`inset 0 0 0 1.3px #fff`), **no dark outline**, near-zero shadow. Not the directional outline of small controls.
- Content layout from the reference (pt): side padding 34.5; illustration ~100×87 at 34 from the top; title SF Bold 28.7 centered; list rows 50.6 tall, label 17 regular (selected #000, others #444447), hairline separators `rgba(0,0,0,.075)`; footnote 13.1/15.7 #3a3a3d; primary capsule 59.7 tall, inset 34.5 from the sides and the bottom.
- Scaling to another phone or sheet width, keep the reference proportions, not the pt values: button inset from the sheet sides and bottom = 8.2% of the sheet width, button height ≈ 14%, bottom corner radius ≈ 25%. With small insets (4–5%) the capsule stops being concentric with the sheet corner and looks off (Danil, 2026-11-17).
- Radio: selected = accent disc with a 9pt white dot (`inset 0 0 0 6.5px accent, inset 0 0 0 20px #fff`); unselected = `rgba(255,255,255,.6)` disc with a 1px `rgba(0,0,0,.14)` ring. 22pt.
- The primary button is `.glass-tint` with app colours: `--label` for a non-white label (reference: cream #fee5ae on orange), `--rim-l:.06;--rim-h:0` (light mode: the rim is barely visible and keeps the hue; the default cyan shift turns orange pink), shadow `-2px 3px 10px -3px rgba(0,0,0,.14)`. To hit a measured fill, invert the tint formula: tint = oklch(L−.012, C/.9, h−5) of the target (#e97d49 fill ← #ed7143 tint).
- Wrap the sheet's content in one absolutely positioned child (`<div class="in">`): `.glass>*` sets `position:relative`, which overrides `position:absolute` on direct children.

## Clear dark glass — `.glass.glass-clear`

For dark UI over vivid media: photos, bright illustrations, coloured stripes. Measured on Danil's iOS 26 reference (an F1 app: toolbar capsule + tab bar over a red/orange photo and a striped track, iPhone Pro Max, 2026-11-23; `examples/clear-dark-ref.jpg`). `.glass-dark` can't produce this look: its blur 5 smears the content and its bend is too weak.
- Content stays sharp: `--blur:.8`, `--sat:1`.
- Bend (Danil, 2026-11-23: match the reference 1:1): `--profile:snell` (`glass.js`: a convex squircle bevel, Snell refraction n 1.5), `--bezel` ≈ .5 × height (32 for a 65 pt bar), `--refract:20`, `--mag:0`, `--disp:0`. What the reference shows and this profile reproduces: the middle stays flat (stripes under the tab bar stay straight), the bend is steep only near the rim, and a thin mirrored band at the rim turns stripes into nested arcs on the caps. The default `t²` profile with `--mag` bent the whole bar into arcs and left a smeared band where it folded: rejected. For a 40 pt control use roughly `--bezel:20;--refract:12`.
- `--blur:.5` + `--soften:.4`: Chromium's `feDisplacementMap` has no smoothing, so strong bends get stair-steps on straight lines; a light blur after the bend removes them.
- Tuning the bend: a sweep script that sets CSS vars on the glass, re-runs `applyGlass` and shoots each variant, then contact sheets next to the reference.
- Tone: over black it adds light (32 over 0, the same as the tab bar fill, white .125). Bright colours are about halved (red stripe 220 → 129), dark ones barely change. That's a highlight-compressing curve, `--tone:"0 .32 .42 .46"`, not a uniform dim: `--lum` halves the darks too and breaks the match.
- Rim: **brighter on the top and bottom, nothing at the middle of the caps** (Danil, 2026-11-23: a uniform ring is wrong). A .9px ring cut out with a mask (`:after` + `mask-composite`) and filled with a vertical gradient: .3 at the edge → .08 at 22% → 0 at 42–58%. Measured: top rim 92/85 vs the reference's 82/86 (2 device px). 1.2px at .5 read too thick (Danil, 2026-11-23). Rim alpha is .26 / .28 together with the glow below.
- Rim colour follows the backdrop (Danil, 2026-11-23): on the reference it's warm over the red photo (toolbar top 162,95,86) and neutral over black (tab bar 86). CSS can't see the backdrop, so `glass.js` draws the rim inside the filter with `--rim-tint` (alpha on the top edge). The backdrop near the edge is blurred (`--rim-spread` 3), then `out = in·--rim-gain + --rim-lift`, cut by a `--rim-w` ring with the same top/bottom profile, and laid over the lens. The fill on top still adds its light. `.glass-clear`: `--rim-tint:.7;--rim-bottom:.77;--rim-gain:1;--rim-lift:.35;--rim-sat:1;--rim-w:1.3`, and its CSS `:after` rim is off. The rim on the straight edges is 2 device px at full brightness, as on the reference (84, 88 / 86, 92). With `--rim-w:.9` only 1 px was bright and the edges looked dim (Danil, 2026-11-23). Ours: tab bar top 94, 85; bottom 97, 94; toolbar top warm. `.glass-sel` sets `--rim-tint:0` and keeps its own faint CSS rim.
- Faint inner glow from the top and bottom edges (Danil, 2026-11-23): on the reference +16 over the fill right inside the rim, then +7, +5, +4, +2 over ~3 pt. On `:before`: `inset 0 ±5px 4px -3px rgba(255,255,255,.095)`, vertical offset only, so the caps stay plain. Ours: +13, +7, +6, +5, +3. Reset the base `:before` mask and padding. Inset box-shadows don't work for this: they wrap round the caps evenly. Reset the base `.glass:after` box-shadow, or its white rim shows through. No outline, no shadow.
- Selected tab: a **soft** darker lens, nearly the full bar height (2 pt padding). The reference measures 11 over a 32 bar, but Danil found that too loud (2026-11-23): use `rgba(0,0,0,.22)` (≈ 23 over 32), a gentle lens (`--refract:10;--mag:.05`) and a faint rim on the top and bottom only (.16). Make it a separate `.glass.glass-clear.glass-sel` element **on top of** the bar (a sibling, absolutely positioned) that holds the active icon; leave the bar's `.on` cell empty. A child with `backdrop-filter` inside the bar sees only the bar's fill (the bar is a backdrop root).
- Toolbar dividers: 1px `rgba(255,255,255,.35)`, ~28 pt tall.
- Checked against the reference: fill over black 32/32, rim at the middle of the caps 32 = fill (none); over the warm gradient ±10 levels (the scene behind is not identical).

## Dark style — `.glass.glass-dark`

Measured (iOS 26 dark, Notes over black + Reminders sheet): the glass ADDS light — `rgba(255,255,255,.115)` (34 over 9, 64 over 35; ours 37 / 60). Thin rim light on top and bottom edges only (~+45 luminance) plus a soft glow 6–8px inward; side caps plain, no outline. Blur ~5px so text under small controls disappears; don't dim the backdrop (`--lum` exists in glass.js but broke the match). Small elements (tab bars, toolbars, buttons) flip from light to dark over dark content; symbols and labels flip to white. Bigger elements (sidebars, menus) don't flip. Never mix regular and clear glass. Clear glass is only for media-rich backgrounds and needs a 35% black dimming layer over bright content.

## iOS 27 status bar — `statusbar-ios27.html`

Every faux iPhone gets the iOS 27 status bar, not the iOS 26 one (Danil, 2026-11-20). Drawn from `examples/ios27-status-ref.png`, which compares iOS 27 with iOS 26:
- Signal: 4 bars as full capsules (rx = half the width), much thicker than iOS 26; inactive bars are a solid light gray (#b8b8b8), not an outline. viewBox 67×45: bars 12 wide, 6 apart, heights 18 / 29 / 38 / 45. Show 3 of 4 active unless the scene needs low signal.
- Wi-Fi: heavier strokes than iOS 26: two arcs at stroke 9 with round caps and a filled wedge at the bottom. viewBox 66×46.
- Battery: a solid capsule with NO outline. The charge is black from the left, the rest of the body and the nub are the same light gray. viewBox 98×48: body 87×48 with rx 15, nub 8×16 with rx 4 at x 90. iOS 26 drew an outlined body with an inset black bar.
- Size in a 390 pt-wide phone: signal 18×12, Wi-Fi 17×12, battery 26×12.5, gap 7 px. Time on the left: 16 px, weight 500. Bar height 54, padding `4px 14px 0 16px`.
- The icons use `currentColor`/default fill, so over dark content set `color:#fff` and swap the gray to `rgba(255,255,255,.35)`.
- Web search found no reliable spec (only rumours about a round indicator for an "iPhone Duo"). Build from the reference image, and compare side by side at 4× before calling it done.

Paste the `<span class="ri">…</span>` from `statusbar-ios27.html` next to the time inside a flex row with `justify-content:space-between`. One `clipPath id="bc"` per page is enough; repeating it in every phone is harmless because all copies are identical.

## Lens options (`--mag`, `--disp`)

Ideas taken from bilalgursen/liquid-glass (MIT, a WebGL2 shader). We kept only the lens maths. Its look (a warm caustic, a blue back rim, light that follows the cursor) is that author's style, not measured on iOS, so do not copy it. The engine itself is not for us either: it repaints the DOM into a canvas and loses shadows, `::before/::after` and masks. Our `backdrop-filter` in Chromium uses the real pixels.
**Defaults (Danil, 2026-11-22): `--mag:.25;--disp:.3` on small controls only** (`.glass-capsule`, `.glass-circle`, `.glass-tabbar` in glass.css). If a page uses its own class names, set the two vars on those classes yourself. Leave them at 0 on sheets, menus and other large glass. There the same values magnify tens of pixels and smear the whole backdrop into a rainbow (checked on `sheet` and `dark`). Set 0 to turn the lens off on a control.
- `--mag` magnifies the middle: the backdrop is sampled at `local / (1 + mag·height)`, and the height is a convex cap that rises from 0 at the rim to 1 within `--bezel`. It is strongest on a lens that moves over content: a slider thumb while it is held, a switch knob while it crosses, the tab-bar selection while it travels.
- `--disp` splits R/G/B on the rim bend only (red a little further, blue a little less), not on the magnification, as a faint fringe at the caps. It costs 3 maps and 3 displacements per element. The channels are summed opaque, then the alpha of the green pass is put back; summing with alpha darkened glass on a translucent backdrop (the × / «…» circles on a light sheet went 249 → 223).
- `--bezel` larger than the corner radius: the bend direction comes from a shape with corners as round as the bezel, so stripes curve smoothly round the corner instead of kinking along the diagonal. This is always on, but it only changes elements where `--bezel` > radius. The defaults (`bezel = min(r, 16)`) and the sheet (30 < 68) are not affected.
- Checked on a real app screen (2026-11-22, tab bar + sheet circles): text under the tab bar is magnified, a faint colour fringe shows at the caps, and the fills stay unchanged.
- Regression check (2026-11-22): with all options off, the 4 examples and two app-screen builds are pixel-identical to the old glass.js. After a glass.js change, run that check again with `regress/`: `build.sh OUT` (the examples, plus extra pages if set, with the current css/js), `node shot.mjs OUT SHOTS` and `python3 diff.py SHOTS_BEFORE SHOTS_AFTER`. Shoot the before set first, then edit, then shoot again; expect `changed: 0`, except on pages with capsules, circles or tab bars where the defaults now apply (max ±3 levels over flat content).

## Motion (for videos)

iOS 26 glass controls change shape while you interact with them. Animate them like this; don't just fade them:
- Press: the element swells a little on a spring (≈ 1.05–1.1 scale, slightly underdamped, ζ ≈ 0.4–0.5), then settles back. On release, do not snap.
- Switch: while it crosses, the knob turns into clear glass (a lens with `--mag`, wider than at rest) and bends the track under it. At the end it settles back to a white knob.
- Slider: a small pill at rest. While it is held, it opens into a wide lens (`--mag`) and stretches a little in the direction it moves.
- Tabs / segmented control: the selection travels as a lens and magnifies the labels it passes. Labels flip to the selected style only when the lens settles.
- Re-run `applyGlass` when a glass element changes size: the map is built per size. Re-running is cheap since 2026-11-23: the element's filter is reused and maps are cached by size, so a lens can be rebuilt every frame (see «Tab-bar drag lens»).
- The numbers above come from the library demo, not from iOS. Before calling a video done, check timing and scale against a screen recording of iOS 26.

## Tab-bar drag lens — `.glass.glass-lens` + `examples/tabbar-lens.src.html`

**Approved by Danil (2026-11-23, iteration 2).** Matched on an iOS 26 screen recording (X app dock, 2.63 px/pt on a 393 pt phone, compared side by side). While the finger is down on a floating tab bar:
- Lift: the grey selection pill swells into a clear lens in ~130 ms (4–5 frames at 30 fps), spring ω 26, ζ .62 (slight overshoot). Pill 74×51 → lens 103×79 pt on a 344×61 bar: the lens is 1.3× the bar height and sticks out ~9 pt above and below. The grey fill fades out as it grows; the bar itself swells 2%.
- The lens follows the finger on a spring (ω 34, ζ .86) and stretches a little along fast motion (up to +12% wide, −4% tall). At the ends it overshoots past the bar edge, as on iOS.
- **Selected icons only inside the lens**: two icon layers, outline everywhere and filled on top, with the filled layer clipped to the lens rect (`clip-path: inset(… round r)`). The filled layer sits **under** the lens, so the rim refracts it: an icon the rim crosses smears into a thick black arc with a colour fringe, as in the reference. The same clip at rest shows the filled icon in the grey pill, so one mechanism covers both states.
- Material: almost no fill (.02), blur .3, `--profile:snell`, `--mag:.1`. **Bend thin on top/bottom, wide on the caps** (Danil, 2026-11-23: «не хватает искажения по краям, особенно по горизонтали; радуга сильнее»): bezel = refract = .12 × height on top/bottom (set per frame, the lens changes size), and on the left/right caps `--bezel-x:3.3;--refract-x:2.3` (new in glass.js, blended by the horizontal part of the edge normal). On the reference the photo above the bar stays visible inside the top of the lens and the rainbow runs along its edge; horizontal lines (the photo edge across the bar, the stats text under it) arc and squeeze near the caps. A wide bend everywhere (.26–.42 × height) pulled the bar's white over the top and hid that.
- Rainbow: `--disp:.55` on top/bottom, `--disp-x:.18` (a fifth of it) on the caps. `--disp` .35+ on the caps split whole icons into magenta/cyan/yellow copies.
- Scene matters: the reference bar barely blurs (`--blur:.8` on the bar) and the photo edge sits at the bar's middle; with a blurred bar there is no sharp line for the lens to bend.
- Thin grey outline, white specular top line.
- Release (not in the reference, which cuts while the finger is down): the selection snaps to the nearest tab and the lens shrinks back into the pill over ~200–250 ms (ω 17, ζ .6), crossfading into the grey fill. The filled icon switches to the new tab through the same clip.
- Per-frame glass: `applyGlass` reuses each element's filter and caches maps by size, so call it on the lens every frame (`applyGlass({querySelectorAll: () => [lens]})`). `--ss:2` on the lens keeps map builds fast; recording 336 frames at dpr 3 takes ~1 min.
- Known gap: a blue badge crossing the top-right corner gets a pink halo (the colour split there is still strong); the reference shows a darker blue smear.

## Other HIG rules worth keeping

- Glass lives only in the navigation layer, never in content; no glass on glass.
- Icon-only → circle; text → capsule; concentric radii with the container.
- Hit region ≥ 44×44 pt (iOS toolbar glass buttons are usually 44 pt; 40 pt is fine for a denser render, say so).
- Not reproducible in a still: adaptive shadow opacity, the inner glow on touch, "materialize" (lensing modulation instead of a fade). For videos, see «Motion».

Sources: developer.apple.com/design/human-interface-guidelines/materials, /buttons, /color; developer.apple.com/videos/play/wwdc2025/219.

## Gotchas

- `corner-shape` is not inherited: glass.css restates `corner-shape:inherit` on `:before/:after`, otherwise the rim stays circular inside a squircle. glass.js still builds the lens map from a circular radius (minor at the corners).

- `.glass` sets `position:relative` only through `:where()` (zero specificity), so an element's own `position:absolute` wins. Older copies of glass.css set it directly — there, restate `position:absolute`.
- A glass button taller than the one it replaces shifts the layout below it. Compensate with negative margin (`height:40px;margin:-2px 0` replacing a 36px button) so everything else stays pixel-identical.
- Scripts (`regress/shot.mjs`, `examples/record-tabbar-lens.mjs`) load Playwright through `pw.mjs`: run them from a folder where `playwright` resolves (or set `PLAYWRIGHT` to its entry file). If the bundled browser version is missing, set `CHROMIUM` to an installed one in `~/Library/Caches/ms-playwright/`. `regress/build.sh` adds extra pages only when `CALDERA` points to a folder with them.

## Swapping glass into an already-recorded video

When the animation sources are gone but the approved video exists, don't re-animate — patch:
1. Render the old and new screen at the video's device scale (find it: template-match a render against frame 0 over scale 0.86–0.92 × dpr 2, then refine offset to 1px).
2. Render **button-only layers** for old and new: hide everything except the button but keep the screen background **white** (`.canvas *{visibility:hidden} .scr,SEL,SEL *{visibility:visible} .scr{background:#fff!important}`). A grey backdrop breaks the subtraction and leaves ghosts of the old border.
3. Check alignment: mean abs error of old layer vs frame 0 in the button box should be < 1 level.
4. `track-video.py` finds per-frame vertical offset (NCC) and opacity of the old button; `patch-video.py` adds `alpha × (new − old)` at that offset (rest frames get alpha exactly 1), re-encodes H.264 CRF 18 at the source fps.
5. Save under a new filename (CDN caches old names), then make web variants with the project's encode script.
