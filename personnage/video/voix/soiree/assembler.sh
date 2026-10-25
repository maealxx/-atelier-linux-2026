#!/usr/bin/env bash
# « La soirée » : image (out/so_brut.mp4) + voix et bruitages + sous-titres incrustés, compressée < 30 Mo.
# Usage : bash voix/soiree/assembler.sh <dossier_outils_sous_titres> <sortie.mp4>
set -euo pipefail
cd "$(dirname "$0")/../.."
WK="$1"
python3 voix/soiree/mixage.py out/so_audio.wav
ffmpeg -loglevel error -y -i out/so_brut.mp4 -i out/so_audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest out/so_avec_son.mp4
cat > out/so_st.json <<JSON
{"video": "out/so_avec_son.mp4", "words": "voix/soiree/mots.json", "out": "out/so_soustitre.mp4", "mode": "burn", "work": "$WK",
 "couleurs": ["&H2A2AFF&"], "sfx": false,
 "emojis": [["soirée", "1f389"], ["vibre", "1f4f1"], ["fenêtre", "1fa9f"], ["sourient", "1f601"], ["danser", "1f57a"], ["cadenassé", "1f512"], ["connaît", "1f440"], ["masque", "1f3ad"], ["ventre", "1f631"]]}
JSON
python3 voix/soustitres.py out/so_st.json
ffmpeg -loglevel error -y -i out/so_soustitre.mp4 -c:v libx264 -b:v 3200k -maxrate 4M -bufsize 8M -preset slow -pix_fmt yuv420p -c:a copy "$2"
ls -la "$2"
