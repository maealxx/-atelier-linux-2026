#!/usr/bin/env bash
# « Apocalypse zombie à l hôpital » : image (out/hp_brut.mp4) + bruitages (+ voix si --voix) + shader + sous-titres.
# Usage : bash voix/hopital/assembler.sh <dossier_outils_sous_titres> <sortie.mp4> [--voix]
set -euo pipefail
cd "$(dirname "$0")/../.."
WK="$1"; SORTIE="$2"; VOIX="${3:-}"
python3 voix/hopital/mixage.py out/hp_audio.wav $VOIX
python3 -c "
import json
json.dump([[a, b, w] for a, b, w in json.load(open('voix/hopital/mots.json')) if w.strip('«» :;,.!?')], open('out/hp_mots.json','w'), ensure_ascii=False)"
bash voix/postfx.sh out/hp_brut.mp4 out/hp_post.mp4 0.45
ffmpeg -loglevel error -y -i out/hp_post.mp4 -i out/hp_audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest out/hp_son.mp4
cat > out/hp_st.json <<JSON
{"video": "out/hp_son.mp4", "words": "out/hp_mots.json", "out": "out/hp_st.mp4", "mode": "burn", "work": "$WK", "couleurs": ["&H3AC8FF&"], "sfx": false, "police": "Anton", "taille": 116, "contour": 5, "ombre": 3,
 "emojis": [["chirurgien", "1fa78"], ["dors", "1f634"], ["rouge", "1f6a8"], ["brillent", "1f440"], ["bloqué", "26d4"], ["chuchote", "1f92b"], ["vingt", "1f9df"], ["derrière", "1f351"]]}
JSON
python3 voix/soustitres.py out/hp_st.json
ffmpeg -loglevel error -y -i out/hp_st.mp4 -af "loudnorm=I=-16:TP=-1.5:LRA=9" -c:a aac -b:a 192k -c:v libx264 -b:v 3800k -maxrate 4500k -bufsize 8M -preset slow -pix_fmt yuv420p "$SORTIE"
ls -la "$SORTIE"
