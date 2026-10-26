#!/usr/bin/env bash
# « Et si tu misais 1 000 € ? » : image (out/r1_brut.mp4) + voix et bruitages + sous-titres incrustés, compressée < 30 Mo.
# Usage : bash voix/roulette1000/assembler.sh <dossier_outils_sous_titres> <sortie.mp4>
set -euo pipefail
cd "$(dirname "$0")/../.."
WK="$1"
python3 voix/roulette1000/mixage.py out/r1_audio.wav
ffmpeg -loglevel error -y -i out/r1_brut.mp4 -i out/r1_audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest out/r1_avec_son.mp4
cat > out/r1_st.json <<JSON
{"video": "out/r1_avec_son.mp4", "words": "voix/roulette1000/mots.json", "out": "out/r1_soustitre.mp4", "mode": "burn", "work": "$WK",
 "couleurs": ["&H2A2AFF&"], "sfx": false,
 "emojis": [["cogne", "2764"], ["vacances", "1f334"], ["râteau", "1f4b8"], ["loyer.", "1f630"], ["mémoire", "1f9e0"], ["fortunes", "1f4b8"], ["avantage", "1f3e6"], ["explose", "1f525"], ["technique", "1f92f"]]}
JSON
python3 voix/soustitres.py out/r1_st.json
ffmpeg -loglevel error -y -i out/r1_soustitre.mp4 -c:v libx264 -b:v 3200k -maxrate 4M -bufsize 8M -preset slow -pix_fmt yuv420p -c:a copy "$2"
ls -la "$2"
