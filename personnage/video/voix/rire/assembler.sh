#!/usr/bin/env bash
# « Pourquoi ton pote rigole… » : image (out/lr_brut.mp4) + bruitages (+ voix si --voix) + shader + sous-titres.
# Usage : bash voix/rire/assembler.sh <dossier_outils_sous_titres> <sortie.mp4> [--voix]
set -euo pipefail
cd "$(dirname "$0")/../.."
WK="$1"; SORTIE="$2"; VOIX="${3:-}"
python3 voix/rire/mixage.py out/lr_audio.wav $VOIX
python3 -c "
import json
json.dump([[a, b, 'BIP' if w.lower().strip(',') == 'bip' else w] for a, b, w in json.load(open('voix/rire/mots.json')) if w.strip('«» :;,.!?')], open('out/lr_mots.json','w'), ensure_ascii=False)"
bash voix/postfx.sh out/lr_brut.mp4 out/lr_post.mp4 0.3
ffmpeg -loglevel error -y -i out/lr_post.mp4 -i out/lr_audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest out/lr_son.mp4
cat > out/lr_st.json <<JSON
{"video": "out/lr_son.mp4", "words": "out/lr_mots.json", "out": "out/lr_st.mp4", "mode": "burn", "work": "$WK", "couleurs": ["&H2A2AFF&"], "sfx": false,
 "emojis": [["morte", "1f480"], ["pfff", "1f923"], ["psychopathe", "1f52a"], ["nerveux", "1f62c"], ["cocotte", "1f975"], ["contagieux", "1f602"], ["enterrements", "26b0"], ["excuser", "1f490"]]}
JSON
python3 voix/soustitres.py out/lr_st.json
ffmpeg -loglevel error -y -i out/lr_st.mp4 -af "loudnorm=I=-16:TP=-1.5:LRA=9" -c:a aac -b:a 192k -c:v libx264 -b:v 3800k -maxrate 4500k -bufsize 8M -preset slow -pix_fmt yuv420p "$SORTIE"
ls -la "$SORTIE"
