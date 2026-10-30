#!/usr/bin/env bash
# « Jour 467 » : image (out/j467_brut.mp4) + bruitages (+ voix si --voix) + shader + sous-titres.
# Usage : bash voix/jour467/assembler.sh <dossier_outils_sous_titres> <sortie.mp4> [--voix]
set -euo pipefail
cd "$(dirname "$0")/../.."
WK="$1"; SORTIE="$2"; VOIX="${3:-}"
python3 voix/jour467/mixage.py out/j467_audio.wav $VOIX
python3 -c "
import json
json.dump([[a, b, w] for a, b, w in json.load(open('voix/jour467/mots.json')) if w.strip('«» :;,.!?')], open('out/j467_mots.json','w'), ensure_ascii=False)"
bash voix/postfx.sh out/j467_brut.mp4 out/j467_post.mp4 0.45
ffmpeg -loglevel error -y -i out/j467_post.mp4 -i out/j467_audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest out/j467_son.mp4
cat > out/j467_st.json <<JSON
{"video": "out/j467_son.mp4", "words": "out/j467_mots.json", "out": "out/j467_st.mp4", "mode": "burn", "work": "$WK", "couleurs": ["&H3AC8FF&"], "sfx": false, "police": "Anton", "taille": 116, "contour": 5, "ombre": 3,
 "emojis": [["467", "1f9df"], ["boulangerie", "1f956"], ["survivants", "1f465"], ["jumelles", "1f52d"], ["facteur", "1f4ec"], ["chevilles", "1f9b6"], ["branchés", "1f50c"], ["vert", "1f6a6"], ["poussette", "1f476"], ["silence", "1f92b"], ["payiez", "1fa99"], ["noms", "1f4dd"], ["bonhommes", "1f630"], ["bonjour", "1f44b"]]}
JSON
python3 voix/soustitres.py out/j467_st.json
ffmpeg -loglevel error -y -i out/j467_st.mp4 -af "loudnorm=I=-16:TP=-1.5:LRA=9" -c:a aac -b:a 192k -c:v libx264 -b:v 3800k -maxrate 4500k -bufsize 8M -preset slow -pix_fmt yuv420p "$SORTIE"
ls -la "$SORTIE"
