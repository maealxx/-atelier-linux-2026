#!/usr/bin/env bash
# « Choisis une couleur » : image (out/ro_brut.mp4) + sons, volume normalisé, compressée < 30 Mo.
# Usage : bash voix/roulette/assembler.sh <sortie.mp4>
set -euo pipefail
cd "$(dirname "$0")/../.."
python3 voix/roulette/mixage.py out/ro_audio.wav
ffmpeg -loglevel error -y -i out/ro_brut.mp4 -i out/ro_audio.wav -map 0:v -map 1:a -af "loudnorm=I=-16:TP=-1.5:LRA=11" -ar 48000 -c:v libx264 -b:v 3200k -maxrate 4M -bufsize 8M -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -shortest "$1"
ls -la "$1"
