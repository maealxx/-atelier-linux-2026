#!/usr/bin/env bash
# « Rentrez chez vous » : image (out/rc_brut.mp4) + sons (+ voix si --voix) + passe shader + sous-titres, compressée.
# Usage : bash voix/foret/assembler.sh <dossier_outils_sous_titres> <sortie.mp4> [fin_en_s] [--voix]
set -euo pipefail
cd "$(dirname "$0")/../.."
WK="$1"; SORTIE="$2"; FIN="${3:-}"; VOIX="${4:-}"
python3 voix/foret/mixage.py out/rc_audio.wav $FIN $VOIX
# sous-titres : seulement les mots qui tombent dans la partie rendue
python3 -c "
import json,sys; fin=float(sys.argv[1]) if sys.argv[1] else 1e9
json.dump([m for m in json.load(open('voix/foret/mots.json')) if m[0] < fin - 0.2 and m[2].strip('«» :;,.!?')], open('out/rc_mots.json','w'), ensure_ascii=False)" "$FIN"
bash voix/postfx.sh out/rc_brut.mp4 out/rc_post.mp4 0.6
ffmpeg -loglevel error -y -i out/rc_post.mp4 -i out/rc_audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest out/rc_avec_son.mp4
cat > out/rc_st.json <<JSON
{"video": "out/rc_avec_son.mp4", "words": "out/rc_mots.json", "out": "out/rc_soustitre.mp4", "mode": "burn", "work": "$WK",
 "couleurs": ["&H2A2AFF&"], "sfx": false, "bas": [[1.2, 15.73], [23.3, 26.7], [46.0, 49.2], [54.87, 63.0]],
 "emojis": [["vibre", "1f4f3"], ["forêt", "1f332"], ["retournes", "1f440"], ["yeux", "1f480"], ["fonce", "1f631"], ["chêne", "1f333"], ["renifler", "1f443"], ["photo", "1f4f8"], ["torche", "1f526"]]}
JSON
python3 voix/soustitres.py out/rc_st.json
ffmpeg -loglevel error -y -i out/rc_soustitre.mp4 -af "acompressor=threshold=-22dB:ratio=3:attack=5:release=150,loudnorm=I=-15:TP=-1:LRA=9" -c:a aac -b:a 192k -c:v libx264 -b:v 2650k -maxrate 3400k -bufsize 7M -preset slow -pix_fmt yuv420p "$SORTIE"
ls -la "$SORTIE"
