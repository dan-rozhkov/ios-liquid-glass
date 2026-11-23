# Inline the skill's glass.css / glass.js into every *.src.html here → *.html, ready for Playwright.
# Usage: python3 build.py   (then screenshot with deviceScaleFactor 2, or the reference's scale)
import pathlib
here = pathlib.Path(__file__).parent; skill = here.parent
css, js = (skill / 'glass.css').read_text(), (skill / 'glass.js').read_text()
for src in here.glob('*.src.html'):
    out = src.with_name(src.name.replace('.src.html', '.html'))
    out.write_text(src.read_text().replace('/*GLASSCSS*/', css).replace('/*GLASSJS*/', js))
    print(out.name)
