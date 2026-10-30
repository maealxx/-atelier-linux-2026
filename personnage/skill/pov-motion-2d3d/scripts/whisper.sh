#!/usr/bin/env bash
# Récupère le modèle Whisper small (CTranslate2 int8) depuis npm (Hugging Face est bloqué par le proxy).
# Usage : bash whisper.sh <dossier_outils>   → modèle dans <dossier_outils>/wm/model
set -euo pipefail
O="$1/wm"; mkdir -p "$O/model"
[ -s "$O/model/model.bin" ] && { echo "Modèle Whisper déjà là : $O/model"; exit 0; }
pip install --break-system-packages -q faster-whisper 2>&1 | grep -v WARN || true
for p in 0 1 2 3; do
  mkdir -p "$O/x$p"
  (cd "$O/x$p" && npm pack "@skillninja/shortmovie-telop-model-p$p" >/dev/null 2>&1 && tar xzf ./*.tgz)
done
cat "$O"/x0/package/model.bin.part0 "$O"/x1/package/model.bin.part1 "$O"/x2/package/model.bin.part2 "$O"/x3/package/model.bin.part3 > "$O/model/model.bin"
cp "$O"/x0/package/{config.json,preprocessor_config.json,tokenizer.json,vocabulary.json} "$O/model/"
(cd "$O/model" && sha256sum model.bin && cat ../x0/package/model.sha256)
rm -rf "$O"/x?
echo "OK. Modèle Whisper : $O/model"
