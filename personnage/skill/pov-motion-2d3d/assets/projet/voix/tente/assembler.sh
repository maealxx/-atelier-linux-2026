#!/usr/bin/env bash
# « La tente » : image (out/te_brut.mp4) + sons (+ voix si --voix) + sous-titres incrustés, compressée.
# Usage : bash voix/tente/assembler.sh <dossier_outils_sous_titres> <sortie.mp4> [fin_en_s] [--voix]
set -euo pipefail
cd "$(dirname "$0")/../.."
WK="$1"; SORTIE="$2"; FIN="${3:-}"; VOIX="${4:-}"
python3 voix/tente/mixage.py out/te_audio.wav $FIN $VOIX
# sous-titres : seulement les mots qui tombent dans la partie rendue
python3 -c "
import json,sys; fin=float(sys.argv[1]) if sys.argv[1] else 1e9
json.dump([m for m in json.load(open('voix/tente/mots.json')) if m[0] < fin - 0.2 and m[2].strip('«» ')], open('out/te_mots.json','w'), ensure_ascii=False)" "$FIN"
ffmpeg -loglevel error -y -i out/te_brut.mp4 -i out/te_audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest out/te_avec_son.mp4
cat > out/te_st.json <<JSON
{"video": "out/te_avec_son.mp4", "words": "out/te_mots.json", "out": "out/te_soustitre.mp4", "mode": "burn", "work": "$WK",
 "couleurs": ["&H2A2AFF&"], "sfx": false,
 "emojis": [["forêt", "1f332"], ["feu", "1f525"], ["tente", "26fa"], ["ronfle", "1f634"], ["ombre", "1f47b"], ["réveiller", "1f630"], ["fermeture", "1f910"], ["bois", "1f4f1"], ["yeux", "1f440"]]}
JSON
python3 voix/soustitres.py out/te_st.json
ffmpeg -loglevel error -y -i out/te_soustitre.mp4 -af "acompressor=threshold=-22dB:ratio=3:attack=5:release=150,loudnorm=I=-15:TP=-1:LRA=9" -c:a aac -b:a 192k -c:v libx264 -b:v 2650k -maxrate 3400k -bufsize 7M -preset slow -pix_fmt yuv420p "$SORTIE"
ls -la "$SORTIE"
