#!/usr/bin/env bash
# « Salle zéro » : image (out/sz_brut.mp4) + voix et bruitages + sous-titres incrustés, compressée < 30 Mo.
# Usage : bash voix/salle-zero/assembler.sh <dossier_outils_sous_titres> <sortie.mp4>
set -euo pipefail
cd "$(dirname "$0")/../.."
WK="$1"
python3 voix/salle-zero/mixage.py out/sz_audio.wav
ffmpeg -loglevel error -y -i out/sz_brut.mp4 -i out/sz_audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest out/sz_avec_son.mp4
cat > out/sz_st.json <<JSON
{"video": "out/sz_avec_son.mp4", "words": "voix/salle-zero/mots.json", "out": "out/sz_soustitre.mp4", "mode": "burn", "work": "$WK",
 "couleurs": ["&H2A2AFF&"], "sfx": false,
 "emojis": [["réveilles", "1f634"], ["craie", "1f4dd"], ["casiers", "1f630"], ["zéro", "1f6aa"], ["encore", "1f300"], ["surveillant", "1f440"], ["dents", "1f479"], ["fonce", "1f631"]]}
JSON
python3 voix/soustitres.py out/sz_st.json
ffmpeg -loglevel error -y -i out/sz_soustitre.mp4 -c:v libx264 -b:v 3200k -maxrate 4M -bufsize 8M -preset slow -pix_fmt yuv420p -c:a copy "$2"
ls -la "$2"
