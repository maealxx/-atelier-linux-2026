#!/usr/bin/env bash
# « La station-service » : image (out/st_brut.mp4) + sons (+ voix si --voix) + passe shader + sous-titres, compressée.
# Usage : bash voix/station/assembler.sh <dossier_outils_sous_titres> <sortie.mp4> [fin_en_s] [--voix]
set -euo pipefail
cd "$(dirname "$0")/../.."
WK="$1"; SORTIE="$2"; FIN="${3:-}"; VOIX="${4:-}"
python3 voix/station/mixage.py out/st_audio.wav $FIN $VOIX
# sous-titres : seulement les mots qui tombent dans la partie rendue
python3 -c "
import json,sys; fin=float(sys.argv[1]) if sys.argv[1] else 1e9
json.dump([m for m in json.load(open('voix/station/mots.json')) if m[0] < fin - 0.2 and m[2].strip('«» :;,.!?')], open('out/st_mots.json','w'), ensure_ascii=False)" "$FIN"
bash voix/postfx.sh out/st_brut.mp4 out/st_post.mp4 0.6
ffmpeg -loglevel error -y -i out/st_post.mp4 -i out/st_audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest out/st_avec_son.mp4
cat > out/st_st.json <<JSON
{"video": "out/st_avec_son.mp4", "words": "out/st_mots.json", "out": "out/st_soustitre.mp4", "mode": "burn", "work": "$WK",
 "couleurs": ["&H2A2AFF&"], "sfx": false, "bas": [[10.0, 12.9], [14.7, 17.4], [60.2, 62.7], [69.8, 79.2]],
 "emojis": [["station-service", "26fd"], ["yeux", "1f440"], ["épaule", "1f4a7"], ["tête", "1f47b"], ["survis", "1f480"], ["rembobine", "23ea"], ["surveillance", "1f4f9"], ["néons", "1f4a1"], ["grand", "1f631"]]}
JSON
python3 voix/soustitres.py out/st_st.json
ffmpeg -loglevel error -y -i out/st_soustitre.mp4 -af "acompressor=threshold=-22dB:ratio=3:attack=5:release=150,loudnorm=I=-15:TP=-1:LRA=9" -c:a aac -b:a 192k -c:v libx264 -b:v 2650k -maxrate 3400k -bufsize 7M -preset slow -pix_fmt yuv420p "$SORTIE"
ls -la "$SORTIE"
