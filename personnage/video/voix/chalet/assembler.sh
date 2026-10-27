#!/usr/bin/env bash
# « Ne lui ouvre pas » : image (out/nl_brut.mp4) + sons (+ voix si --voix) + passe shader + sous-titres, compressée.
# Usage : bash voix/chalet/assembler.sh <dossier_outils_sous_titres> <sortie.mp4> [fin_en_s] [--voix]
set -euo pipefail
cd "$(dirname "$0")/../.."
WK="$1"; SORTIE="$2"; FIN="${3:-}"; VOIX="${4:-}"
python3 voix/chalet/mixage.py out/nl_audio.wav $FIN $VOIX
# sous-titres : seulement les mots qui tombent dans la partie rendue
python3 -c "
import json,sys; fin=float(sys.argv[1]) if sys.argv[1] else 1e9
json.dump([m for m in json.load(open('voix/chalet/mots.json')) if m[0] < fin - 0.2 and m[2].strip('«» :;,.!?')], open('out/nl_mots.json','w'), ensure_ascii=False)" "$FIN"
bash voix/postfx.sh out/nl_brut.mp4 out/nl_post.mp4 0.6
ffmpeg -loglevel error -y -i out/nl_post.mp4 -i out/nl_audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest out/nl_avec_son.mp4
cat > out/nl_st.json <<JSON
{"video": "out/nl_avec_son.mp4", "words": "out/nl_mots.json", "out": "out/nl_soustitre.mp4", "mode": "burn", "work": "$WK",
 "couleurs": ["&H2A2AFF&"], "sfx": false, "bas": [[3.6, 9.23], [20.03, 23.9], [81.03, 85.3]],
 "emojis": [["vibre", "1f4f3"], ["tempête", "1f328"], ["alerte", "1f6a8"], ["frappe", "1f6aa"], ["silhouette", "1f47b"], ["survis", "1f480"], ["rembobine", "23ea"], ["lit", "1f6cf"], ["visage", "1f631"]]}
JSON
python3 voix/soustitres.py out/nl_st.json
ffmpeg -loglevel error -y -i out/nl_soustitre.mp4 -af "acompressor=threshold=-22dB:ratio=3:attack=5:release=150,loudnorm=I=-15:TP=-1:LRA=9" -c:a aac -b:a 192k -c:v libx264 -b:v 2650k -maxrate 3400k -bufsize 7M -preset slow -pix_fmt yuv420p "$SORTIE"
ls -la "$SORTIE"
