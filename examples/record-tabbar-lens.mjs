// node rec.mjs stills OUT t1 t2 …   |  node rec.mjs video OUT.mp4 [fps] [dpr]
import { launch } from '../pw.mjs';
import fs from 'fs'; import { execSync } from 'child_process';
const [mode, out, ...rest] = process.argv.slice(2);
const page = new URL('tabbar-lens.html?still', import.meta.url).href;   // run examples/build.py first
const b = await launch();
const dpr = mode === 'video' ? +(rest[1] || 3) : 2.63;
const pg = await b.newPage({ viewport: { width: 500, height: 900 }, deviceScaleFactor: dpr });
await pg.goto(page); await pg.waitForTimeout(500);
const dock = await pg.$('#scr');
const box = await dock.boundingBox();
const clip = { x: box.x, y: box.y + 852 - 22 - 61 - 40, width: 393, height: 61 + 80 };
if (mode === 'stills') {
  fs.mkdirSync(out, { recursive: true });
  for (const t of rest) { await pg.evaluate((t) => renderAt(+t), t); await pg.waitForTimeout(80); await pg.screenshot({ path: `${out}/t${t}.png`, clip }); }
} else {
  const fps = +(rest[0] || 60), dur = await pg.evaluate(() => DURATION), dir = out + '.frames';
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const full = { x: box.x, y: box.y, width: 393, height: 852 };
  for (let i = 0; i * (1 / fps) <= dur; i++) {
    await pg.evaluate((t) => renderAt(t), i / fps); await pg.waitForTimeout(30);
    await pg.screenshot({ path: `${dir}/${String(i).padStart(5, '0')}.png`, clip: full });
  }
  execSync(`ffmpeg -v error -y -framerate ${fps} -i ${dir}/%05d.png -c:v libx264 -crf 16 -pix_fmt yuv420p -vf "pad=ceil(iw/2)*2:ceil(ih/2)*2" ${out}`);
}
await b.close(); console.log('done');
