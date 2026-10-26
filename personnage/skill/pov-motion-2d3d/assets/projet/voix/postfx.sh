#!/usr/bin/env bash
# Passe « shader » de post-traitement (CPU, ffmpeg) : bloom, étalonnage ciné, aberration chromatique, vignette, grain fin.
# Usage : bash voix/postfx.sh <entrée.mp4> <sortie.mp4> [force_bloom=0.55]
set -euo pipefail
IN="$1"; OUT="$2"; B="${3:-0.55}"
FX="split=2[base][hl];\
[hl]lutrgb=r='clip((val-140)*2.2,0,255)':g='clip((val-140)*2.2,0,255)':b='clip((val-140)*2.2,0,255)',gblur=sigma=26,gblur=sigma=10[bloom];\
[base][bloom]blend=all_mode=screen:all_opacity=${B}[b1];\
[b1]colorbalance=rs=-0.04:gs=-0.01:bs=0.07:rm=0.01:bm=-0.01:rh=0.06:gh=0.02:bh=-0.05,\
eq=contrast=1.07:saturation=1.1:gamma=1.0,\
rgbashift=rh=-2:bh=2,\
vignette=angle=PI/5.5,\
noise=alls=4:allf=t,format=yuv420p"
ffmpeg -loglevel error -y -i "$IN" -filter_complex "$FX" -c:v libx264 -crf 15 -preset medium -an "$OUT"
