#!/usr/bin/env bash
# « Le livreur » : image (out/li_brut.mp4) + voix et bruitages + sous-titres incrustés, compressée < 30 Mo.
# Usage : bash voix/livreur/assembler.sh <dossier_outils_sous_titres> <sortie.mp4>
set -euo pipefail
cd "$(dirname "$0")/../.."
WK="$1"
python3 voix/livreur/mixage.py out/li_audio.wav
ffmpeg -loglevel error -y -i out/li_brut.mp4 -i out/li_audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest out/li_avec_son.mp4
cat > out/li_st.json <<JSON
{"video": "out/li_avec_son.mp4", "words": "voix/livreur/mots.json", "out": "out/li_soustitre.mp4", "mode": "burn", "work": "$WK",
 "couleurs": ["&H2A2AFF&"], "sfx": false,
 "emojis": [["livreur", "1f6f5"], ["vibre", "1f4f1"], ["judas", "1f441"], ["prénom", "1f630"], ["fenêtre", "1fa9f"], ["sortez", "26a0"], ["personne", "1f47b"], ["chambre", "1f6cf"], ["là", "1f631"]]}
JSON
python3 voix/soustitres.py out/li_st.json
ffmpeg -loglevel error -y -i out/li_soustitre.mp4 -c:v libx264 -b:v 3200k -maxrate 4M -bufsize 8M -preset slow -pix_fmt yuv420p -c:a copy "$2"
ls -la "$2"
