import { launch } from '../pw.mjs';
import fs from 'fs'; import path from 'path';
const [dir, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const files = [];
(function walk(d){ for (const f of fs.readdirSync(d)) { const p = path.join(d,f); fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') && files.push(p); } })(dir);
const b = await launch();
const pg = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 });
for (const f of files) {
  await pg.goto('file://' + f); await pg.waitForTimeout(1500);
  await pg.screenshot({ path: path.join(out, path.relative(dir, f).replace(/[\/]/g, '__') + '.png'), fullPage: true, animations: 'disabled' });
}
await b.close(); console.log(files.length, 'shots');
