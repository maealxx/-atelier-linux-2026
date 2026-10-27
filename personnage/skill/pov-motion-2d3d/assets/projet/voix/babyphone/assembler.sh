#!/usr/bin/env bash
# « Le babyphone » : image (out/bp_brut.mp4) + sons (+ voix si --voix) + sous-titres incrustés, compressée.
# Usage : bash voix/babyphone/assembler.sh <dossier_outils_sous_titres> <sortie.mp4> [fin_en_s] [--voix]
set -euo pipefail
cd "$(dirname "$0")/../.."
WK="$1"; SORTIE="$2"; FIN="${3:-}"; VOIX="${4:-}"
python3 voix/babyphone/mixage.py out/bp_audio.wav $FIN $VOIX
# sous-titres : seulement les mots qui tombent dans la partie rendue
python3 -c "
import json,sys; fin=float(sys.argv[1]) if sys.argv[1] else 1e9
json.dump([m for m in json.load(open('voix/babyphone/mots.json')) if m[0] < fin - 0.2 and m[2].strip('«» ')], open('out/bp_mots.json','w'), ensure_ascii=False)" "$FIN"
bash voix/postfx.sh out/bp_brut.mp4 out/bp_post.mp4 0.55
ffmpeg -loglevel error -y -i out/bp_post.mp4 -i out/bp_audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest out/bp_avec_son.mp4
cat > out/bp_st.json <<JSON
{"video": "out/bp_avec_son.mp4", "words": "out/bp_mots.json", "out": "out/bp_soustitre.mp4", "mode": "burn", "work": "$WK",
 "couleurs": ["&H2A2AFF&"], "sfx": false,
 "emojis": [["vibre", "1f4f3"], ["grenier", "1f6ab"], ["veilleuse", "2b50"], ["chuchoter", "1f92b"], ["prénom", "1f628"], ["ouverte", "1f440"], ["mamie", "1f631"], ["longue", "1f480"], ["arrive", "1f47b"]]}
JSON
python3 voix/soustitres.py out/bp_st.json
ffmpeg -loglevel error -y -i out/bp_soustitre.mp4 -af "acompressor=threshold=-22dB:ratio=3:attack=5:release=150,loudnorm=I=-15:TP=-1:LRA=9" -c:a aac -b:a 192k -c:v libx264 -b:v 2650k -maxrate 3400k -bufsize 7M -preset slow -pix_fmt yuv420p "$SORTIE"
ls -la "$SORTIE"
