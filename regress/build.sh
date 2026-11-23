#!/bin/zsh
# build.sh OUTDIR — inline the current skill css/js into the skill examples (and, if CALDERA is set,
# into the Caldera case pages in that folder), into OUTDIR. Then: node shot.mjs OUTDIR SHOTS; python3 diff.py BEFORE AFTER.
set -e
O=$1; K=${0:A:h:h}; C=${CALDERA:-}
rm -rf $O; mkdir -p $O
cp $K/examples/*.src.html $K/examples/build.py $O/; (cd $O && sed -i '' "s#skill = here.parent#skill = __import__('pathlib').Path('$K')#" build.py && python3 build.py >/dev/null && rm *.src.html build.py)
if [[ -n $C ]]; then
  mkdir -p $O/cal
  cp $C/cmp.src.html $C/tinted.src.html $C/build2.py $C/build3.py $C/caldera-app-v14c-glass.html $O/cal/
  (cd $O/cal && python3 build2.py && python3 build3.py && rm *.py *.src.html caldera-app-v14c-glass.html)
fi
ls $O
