#!/usr/bin/env bash
# « Le vaisseau » : image (out/va_brut.mp4) + sons (+ voix si --voix) + sous-titres incrustés, compressée.
# Usage : bash voix/vaisseau/assembler.sh <dossier_outils_sous_titres> <sortie.mp4> [fin_en_s] [--voix]
set -euo pipefail
cd "$(dirname "$0")/../.."
WK="$1"; SORTIE="$2"; FIN="${3:-}"; VOIX="${4:-}"
python3 voix/vaisseau/mixage.py out/va_audio.wav $FIN $VOIX
# sous-titres : seulement les mots qui tombent dans la partie rendue
python3 -c "
import json,sys; fin=float(sys.argv[1]) if sys.argv[1] else 1e9
json.dump([m for m in json.load(open('voix/vaisseau/mots.json')) if m[0] < fin - 0.2], open('out/va_mots.json','w'), ensure_ascii=False)" "$FIN"
ffmpeg -loglevel error -y -i out/va_brut.mp4 -i out/va_audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest out/va_avec_son.mp4
cat > out/va_st.json <<JSON
{"video": "out/va_avec_son.mp4", "words": "out/va_mots.json", "out": "out/va_soustitre.mp4", "mode": "burn", "work": "$WK",
 "couleurs": ["&H2A2AFF&"], "sfx": false,
 "emojis": [["capsule", "1f6f8"], ["glacé", "1f976"], ["griffes", "1f631"], ["Terre", "1f30d"], ["rampe", "1f440"], ["brillent", "1f47d"], ["visage", "1f628"], ["plafond", "1f47e"], ["secours", "1f680"]]}
JSON
python3 voix/soustitres.py out/va_st.json
ffmpeg -loglevel error -y -i out/va_soustitre.mp4 -af "acompressor=threshold=-22dB:ratio=3:attack=5:release=150,loudnorm=I=-15:TP=-1:LRA=9" -c:a aac -b:a 192k -c:v libx264 -b:v 2900k -maxrate 3600k -bufsize 7M -preset slow -pix_fmt yuv420p "$SORTIE"
ls -la "$SORTIE"
