// Playwright loader for the skill's scripts (regress/shot.mjs, examples/record-tabbar-lens.mjs).
//   PLAYWRIGHT  path to an installed playwright package entry (default: resolve "playwright" from the current directory)
//   CHROMIUM    browser executable (default: Playwright's bundled Chromium)
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
const entry = process.env.PLAYWRIGHT || createRequire(process.cwd() + '/').resolve('playwright');
const m = await import(pathToFileURL(entry).href);
export const chromium = m.chromium || m.default.chromium;
export const launch = () => chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
