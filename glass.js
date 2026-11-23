// Liquid Glass for Chromium renders.
// Each .glass element gets its own SVG filter: blur + saturation of the backdrop,
// then a displacement map built from the element's rounded-rect shape, so the
// backdrop bends like a lens near the edges and stays flat in the middle.
// Opt-in (all off by default, so existing renders stay pixel-identical):
//   --mag   magnify the middle like a lens (0.15 ≈ 15%), e.g. a slider thumb or tab lens in motion;
//   --disp  split R/G/B along the bend (0.1–0.3), a faint colour fringe at the rim;
//   --tone  tone curve on the backdrop (feFuncR/G/B table); dark clear glass: "0 .32 .42 .46".
//   --profile:snell  physical bend: convex squircle bevel, Snell refraction (n 1.5); flat middle, steep rim,
//           a thin mirrored band at the rim (iOS look, matched on the F1 reference). Default: offset = refract·t².
//   --curve  exponent of the default profile (2); --nofold:1 caps refract so the default profile never mirrors;
//   --rim-tint  rim coloured by the backdrop under it (see the block in applyGlass); with --rim-* tuning vars.
//   --soften post-bend blur (px) against stair-steps: Chromium samples feDisplacementMap without smoothing.
//   bezel > corner radius: the bend direction follows a shape with corners as round as the
//   bezel, so it no longer breaks along the diagonals (the rim mask keeps the real shape).
// The three ideas come from bilalgursen/liquid-glass (MIT), engine.ts; values here are ours.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const host = document.createElementNS(NS, 'svg');
  host.setAttribute('width', '0');
  host.setAttribute('height', '0');
  host.style.position = 'absolute';
  document.body.appendChild(host);

  // Signed distance from a point to a rounded rect (negative inside).
  function sdRoundRect(x, y, w, h, r) {
    const qx = Math.abs(x - w / 2) - (w / 2 - r);
    const qy = Math.abs(y - h / 2) - (h / 2 - r);
    const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
    return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
  }

  // Lens height for magnification: 0 at the rim, rising to 1 within the bezel (convex cap).
  function capHeight(d, bezel) {
    const t = Math.pow(Math.min(Math.max(-d / bezel, 0), 1), 1 / 1.4);
    return Math.sqrt(1 - (1 - t) * (1 - t));
  }

  // Displacement map: R = x offset, G = y offset, 128 = none.
  // Offset points outward along the edge normal, growing towards the rim
  // (squared falloff), so content near the edge is pulled in = lens bend.
  // bendK scales only the rim bend (the --disp colour split), never the magnification.
  // Returns { url, norm }: norm > 1 means offsets were scaled down to fit the map.
  // Physical bend (--profile:snell): the bezel is a convex squircle bevel, h(u) = (1 − (1 − u)^4)^(1/4), u = 0 at the rim.
  // A vertical ray refracts at the surface (n = 1.5); the offset is tan(θ − φ), normalised to 1 at the rim.
  // Flat in the middle, steep near the rim, a thin mirrored band right at the rim (the iOS look).
  function snell(t) { // t = 1 at the rim, 0 at the bezel's inner edge
    const u = Math.max(1 - t, 1e-3), d = 1e-3;
    const hgt = (v) => Math.pow(1 - Math.pow(1 - Math.min(v, 1), 4), 0.25);
    const slope = (hgt(u + d) - hgt(Math.max(u - d, 0))) / (2 * d);
    const th = Math.min(Math.atan(slope), 1.5), ph = Math.asin(Math.sin(th) / 1.5);
    return Math.tan(th - ph) / 1.1;
  }
  // Maps are cached by their inputs: animations re-run applyGlass every frame and
  // revisit the same sizes (a lens growing and shrinking back), so most frames build nothing.
  const mapCache = new Map();
  function buildMap(...a) {
    const k = a.join(',');
    if (!mapCache.has(k)) { if (mapCache.size > 400) mapCache.clear(); mapCache.set(k, buildMapRaw(...a)); }
    return mapCache.get(k);
  }
  // bx / kx (--bezel-x / --refract-x, default 1): on the left/right caps the bend zone is bx× wider and
  // the bend kx× stronger, blended by the horizontal part of the edge normal; top and bottom keep bezel/refract.
  function buildMapRaw(w, h, r, bezel, ss, mag = 0, strength = 1, bendK = 1, curve = 2, bx = 1, kx = 1, dxk = 1) {
    const W = Math.round(w * ss), H = Math.round(h * ss);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(W, H);
    const e = 0.5;
    const rf = bezel > r ? Math.min(bezel, w / 2, h / 2) : r; // field for the bend direction
    const D = mag || bendK !== 1 || kx !== 1 ? new Float32Array(W * H * 2) : null;
    let norm = 1;
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const x = (i + 0.5) / ss, y = (j + 0.5) / ss;
        const d = sdRoundRect(x, y, w, h, r);
        let dx = 0, dy = 0, ax = 0;
        let t = Math.min(Math.max(1 + d / (bezel * Math.max(bx, 1)), 0), 1); // 0 inside flat area, 1 at rim
        if (t > 0) {
          const nx = sdRoundRect(x + e, y, w, h, rf) - sdRoundRect(x - e, y, w, h, rf);
          const ny = sdRoundRect(x, y + e, w, h, rf) - sdRoundRect(x, y - e, w, h, rf);
          const len = Math.hypot(nx, ny) || 1;
          ax = Math.abs(nx / len);                       // 1 on the caps, 0 on the top/bottom
          if (bx !== 1) t = Math.min(Math.max(1 + d / (bezel * (1 + (bx - 1) * ax)), 0), 1);
          const k = (curve < 0 ? Math.min(snell(t), 1) : Math.pow(t, curve)) * (1 + (kx - 1) * ax);
          dx = -(nx / len) * k;
          dy = -(ny / len) * k;
        }
        if (D) {
          const bk = dxk === 1 ? bendK : 1 + (bendK - 1) * (1 + (dxk - 1) * ax); // --disp-x: colour split on the caps
          dx *= bk; dy *= bk;
          // sample at local / (1 + mag·height): the middle is magnified, the rim is not
          const f = mag ? 1 / (1 + mag * capHeight(d, bezel)) - 1 : 0;
          dx += ((x - w / 2) * f) / strength;
          dy += ((y - h / 2) * f) / strength;
          const q = (j * W + i) * 2;
          D[q] = dx; D[q + 1] = dy;
          norm = Math.max(norm, Math.abs(dx), Math.abs(dy));
          continue;
        }
        const p = (j * W + i) * 4;
        img.data[p] = 128 + dx * 127;
        img.data[p + 1] = 128 + dy * 127;
        img.data[p + 2] = 128;
        img.data[p + 3] = 255;
      }
    }
    if (D) {
      for (let q = 0, p = 0; q < D.length; q += 2, p += 4) {
        img.data[p] = 128 + (D[q] / norm) * 127;
        img.data[p + 1] = 128 + (D[q + 1] / norm) * 127;
        img.data[p + 2] = 128;
        img.data[p + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return { url: c.toDataURL(), norm };
  }

  // Rim mask for --rim-tint: a ring `wpx` wide along the rounded rect, alpha = vertical profile
  // (top → 0 at the middle of the caps → bottom), antialiased. Returns a data URL.
  function buildRing(w, h, r, wpx, top, bot, ss) {
    const W = Math.round(w * ss), H = Math.round(h * ss);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d'); const img = ctx.createImageData(W, H);
    for (let j = 0; j < H; j++) {
      const y = (j + 0.5) / ss, v = y / h;
      // .3 at the edge → .08 at 22% → 0 at 42–58% → .08 at 78% → bottom (relative to the edge value)
      const prof = v < .22 ? 1 - (1 - .27) * v / .22 : v < .42 ? .27 * (.42 - v) / .2 : v < .58 ? 0 :
        v < .78 ? .27 * (v - .58) / .2 : .27 + (1 - .27) * (v - .78) / .22;
      const edge = v < .5 ? top : bot;
      for (let i = 0; i < W; i++) {
        const x = (i + 0.5) / ss;
        const d = -sdRoundRect(x, y, w, h, r);                 // depth inside, px
        const a = Math.min(Math.max(d * ss, 0), 1) * Math.min(Math.max((wpx - d) * ss + .5, 0), 1);
        const p = (j * W + i) * 4;
        img.data[p] = img.data[p + 1] = img.data[p + 2] = 255;
        img.data[p + 3] = Math.round(255 * a * prof * edge);
      }
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  let n = 0;
  window.applyGlass = function (root = document) {
    root.querySelectorAll('.glass').forEach((el) => {
      const cs = getComputedStyle(el);
      const w = el.offsetWidth, h = el.offsetHeight;
      if (!w || !h) return; // hidden or not laid out yet: skip, call applyGlass again once visible
      const r = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, w / 2, h / 2);
      const bezel = parseFloat(cs.getPropertyValue('--bezel')) || Math.min(r, 16);
      const strength = parseFloat(cs.getPropertyValue('--refract')) || 18;
      const blur = parseFloat(cs.getPropertyValue('--blur')) || 2;
      const sat = parseFloat(cs.getPropertyValue('--sat')) || 1.6;
      // Tinted glass (HIG: "a range of tones mapped to content brightness underneath"):
      // backdrop luminance → tone between a dark and a light shade of --tint.
      const tint = cs.getPropertyValue('--tint-map').trim();  // opt-in; iOS tinted buttons read as a flat fill
      let tone = '';
      if (tint) {
        const c = tint.replace('#', ''); const rgb = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
        const dk = parseFloat(cs.getPropertyValue('--tint-dark')) || 0.78;   // tone over black content (HIG: don't deviate too far from the colour)
        const lt = parseFloat(cs.getPropertyValue('--tint-light')) || 0.10;  // mix towards white over white content
        const tv = rgb.map((v) => `${(v * dk).toFixed(3)} ${(v + (1 - v) * lt).toFixed(3)}`);
        tone = `<feColorMatrix in="s" type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0" result="l"/>
        <feComponentTransfer in="l" result="s"><feFuncR type="table" tableValues="${tv[0]}"/><feFuncG type="table" tableValues="${tv[1]}"/><feFuncB type="table" tableValues="${tv[2]}"/></feComponentTransfer>`;
      }
      // Regular glass "adjusts the luminosity of background content" (HIG): --lum scales backdrop brightness.
      const lum = parseFloat(cs.getPropertyValue('--lum'));
      if (!isNaN(lum) && lum !== 1) tone += `<feComponentTransfer in="s" result="s"><feFuncR type="linear" slope="${lum}"/><feFuncG type="linear" slope="${lum}"/><feFuncB type="linear" slope="${lum}"/></feComponentTransfer>`;
      // --tone: a tone curve on the backdrop (feFuncR/G/B table, evenly spaced points from 0 to 1).
      // Dark clear glass compresses highlights: "0 .3 .4 .46" keeps darks, halves bright colours.
      const tc = cs.getPropertyValue('--tone').trim().replace(/^["']|["']$/g, '');
      if (tc) tone += `<feComponentTransfer in="s" result="s"><feFuncR type="table" tableValues="${tc}"/><feFuncG type="table" tableValues="${tc}"/><feFuncB type="table" tableValues="${tc}"/></feComponentTransfer>`;
      const mag = parseFloat(cs.getPropertyValue('--mag')) || 0;
      const disp = parseFloat(cs.getPropertyValue('--disp')) || 0;
      // --disp: the rim bend for red a little stronger, for blue a little weaker (one map each),
      // then the three channels are added back up. The magnification is the same for all three.
      const ks = disp ? [1 + disp, 1, 1 - disp] : [1];
      // --curve: bend profile exponent (rim offset = refract · t^curve, t = 0 at the bezel's inner edge, 1 at the rim).
      // Default 2. --nofold:1 caps refract at .9·bezel/curve so the edge never mirrors back on itself (no smear band).
      const curve = cs.getPropertyValue('--profile').trim() === 'snell' ? -1 : parseFloat(cs.getPropertyValue('--curve')) || 2;
      let str = strength;
      if (parseFloat(cs.getPropertyValue('--nofold'))) str = Math.min(strength, 0.9 * bezel / curve);
      // --ss: map supersampling (default 4 for snell, 2 otherwise); 2 is enough for a moving lens and 4× faster to build.
      const ss = parseFloat(cs.getPropertyValue('--ss')) || (curve < 0 ? 4 : 2);
      // --bezel-x / --refract-x: wider, stronger bend on the left/right caps only (the tab-bar lens).
      // --disp-x: multiplier of --disp on the caps (.3 = a thin fringe on the sides, the full rainbow on top and bottom).
      const bx = parseFloat(cs.getPropertyValue('--bezel-x')) || 1, kx = parseFloat(cs.getPropertyValue('--refract-x')) || 1;
      const dxk = parseFloat(cs.getPropertyValue('--disp-x')) || 1;
      const maps = ks.map((k) => buildMap(w, h, r, bezel, ss, mag, str, k, curve, bx, kx, dxk));
      const img = (m, i) => `<feImage href="${m.url}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="m${i}"/>`;
      const move = (m, i, res) => `<feDisplacementMap in="s" in2="m${i}" scale="${str * 2 * m.norm}" xChannelSelector="R" yChannelSelector="G"${res}/>`;
      // Each channel is taken opaque (alpha 1) and summed, then the alpha of the green pass is put
      // back ("in"). Summing with alpha would darken glass over a translucent backdrop (glass on a sheet).
      const keep = (ch) => [0, 1, 2].map((k) => [0, 1, 2, 3, 4].map((m) => +(k === ch && m === k)).join(' ')).join('  ') + '  0 0 0 0 1';
      const lens = !disp ? img(maps[0], 0) + move(maps[0], 0, '') :
        maps.map((m, ch) => img(m, ch) + move(m, ch, ` result="d${ch}"`) +
          `<feColorMatrix in="d${ch}" type="matrix" values="${keep(ch)}" result="c${ch}"/>`).join('') +
        `<feComposite in="c0" in2="c1" operator="arithmetic" k2="1" k3="1" result="c01"/>
        <feComposite in="c01" in2="c2" operator="arithmetic" k2="1" k3="1" result="rgb"/>
        <feComposite in="rgb" in2="d1" operator="in"/>`;
      // --soften: a light blur after the bend; Chromium samples feDisplacementMap without smoothing,
      // so strong bends show stair-steps on straight lines.
      const soft = parseFloat(cs.getPropertyValue('--soften')) || 0;
      // --rim-tint (opt-in): the rim takes the colour of what is under it, as on iOS (warm over a red photo,
      // neutral over black). The backdrop near the edge is blurred (--rim-spread), saturated (--rim-sat),
      // then out = in·--rim-gain + --rim-lift, cut by a ring --rim-w px wide with the top/bottom profile
      // (--rim-tint = alpha on the top edge, --rim-bottom on the bottom), and laid over the lens output.
      // Use instead of a white CSS rim (the fill on top still adds its light).
      let rimTint = '';
      const rt = parseFloat(cs.getPropertyValue('--rim-tint')) || 0;
      if (rt) {
        const g = (k, d) => { const v = parseFloat(cs.getPropertyValue(k)); return isNaN(v) ? d : v; };
        const ring = buildRing(w, h, r, g('--rim-w', .9), rt, g('--rim-bottom', rt), 4);
        const gain = g('--rim-gain', 1.2), lift = g('--rim-lift', .2);
        const fn = (c) => `<feFunc${c} type="linear" slope="${gain}" intercept="${lift}"/>`;
        rimTint = `<feOffset result="L"/>
        <feGaussianBlur in="SourceGraphic" stdDeviation="${g('--rim-spread', 3)}" edgeMode="duplicate"/>
        <feColorMatrix type="saturate" values="${g('--rim-sat', 1.4)}"/>
        <feComponentTransfer>${fn('R')}${fn('G')}${fn('B')}</feComponentTransfer>
        <feImage href="${ring}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="rm"/>
        <feComposite in="rimc" in2="rm" operator="in" result="rim"/>
        <feComposite in="rim" in2="L" operator="over"/>`;
        rimTint = rimTint.replace('</feComponentTransfer>', '</feComponentTransfer>').replace('<feComponentTransfer>', '<feComponentTransfer result="rimc">');
      }
      // Re-running applyGlass on the same element (animation, resize) reuses its filter node.
      let f = el._lgFilter;
      if (!f) { f = el._lgFilter = document.createElementNS(NS, 'filter'); f.setAttribute('id', 'lg' + n++); host.appendChild(f); }
      const id = f.getAttribute('id');
      f.setAttribute('x', '0'); f.setAttribute('y', '0');
      f.setAttribute('width', w); f.setAttribute('height', h);
      f.setAttribute('filterUnits', 'userSpaceOnUse');
      f.setAttribute('primitiveUnits', 'userSpaceOnUse');
      f.setAttribute('color-interpolation-filters', 'sRGB');
      f.innerHTML = `
        <feGaussianBlur in="SourceGraphic" stdDeviation="${blur}" edgeMode="duplicate" result="b"/>
        <feColorMatrix in="b" type="saturate" values="${sat}" result="s"/>
        ${tone}
        ${lens}${soft ? `<feGaussianBlur stdDeviation="${soft}"/>` : ''}${rimTint}`;
      el.style.backdropFilter = 'none';      // force Chromium to pick up the changed filter
      el.offsetWidth;
      el.style.backdropFilter = `url(#${id})`;
    });
  };
})();
