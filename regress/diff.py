import sys, os
from PIL import Image, ImageChops
a, b = sys.argv[1:3]; bad = 0
for f in sorted(os.listdir(a)):
    x, y = Image.open(os.path.join(a, f)).convert('RGB'), Image.open(os.path.join(b, f)).convert('RGB')
    if x.size != y.size: print('SIZE', f, x.size, y.size); bad += 1; continue
    d = ImageChops.difference(x, y); bb = d.getbbox()
    mx = max(m for _, m in d.getextrema())
    print(('SAME ' if not bb else 'DIFF ') + f, '' if not bb else f'bbox={bb} max={mx}'); bad += bool(bb)
print('changed:', bad)
