#!/usr/bin/env bash
# Assemble la vidéo finale : image (out/brut.mp4) + voix et bruitages + sous-titres incrustés, compressée < 30 Mo.
# Usage : bash voix/assembler.sh <dossier_outils_sous_titres> <sortie.mp4>
set -euo pipefail
cd "$(dirname "$0")/.."
WK="$1"
python3 voix/mixage.py out/audio.wav
ffmpeg -loglevel error -y -i out/brut.mp4 -i out/audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest out/avec_son.mp4
cat > out/st.json <<JSON
{"video": "out/avec_son.mp4", "words": "voix/mots.json", "out": "out/soustitre.mp4", "mode": "burn", "work": "$WK",
 "couleurs": ["&H2A2AFF&"], "upper": ["surtout"], "sfx": false,
 "emojis": [["rates", "1f629"], ["ruelle", "1f311"], ["yeux", "1f440"], ["post-it", "1f4dd"], ["rouillé", "1f922"], ["souffle", "1f630"], ["énorme", "1f479"]]}
JSON
python3 voix/soustitres.py out/st.json
ffmpeg -loglevel error -y -i out/soustitre.mp4 -c:v libx264 -b:v 3200k -maxrate 4M -bufsize 8M -preset slow -pix_fmt yuv420p -c:a copy "$2"
ls -la "$2"
