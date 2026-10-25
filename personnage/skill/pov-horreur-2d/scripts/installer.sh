#!/usr/bin/env bash
# Prépare tout ce qu'il faut pour fabriquer une vidéo POV horreur 2,5D.
# Usage : bash installer.sh <dossier_du_projet_video> <dossier_outils>
#   <dossier_du_projet_video> : personnage/video du dépôt (contient package.json)
#   <dossier_outils>          : dossier de travail (modèles de voix, police, emojis), ex. le scratchpad
set -euo pipefail
PROJET="$1"
OUTILS="$2"
mkdir -p "$OUTILS/tts" "$OUTILS/st/fonts" "$OUTILS/st/emo"

echo "== Remotion (npm)"
(cd "$PROJET" && npm install --no-audit --no-fund >/dev/null)

echo "== Python : voix guide, bruitages, sous-titres"
pip install --break-system-packages -q kokoro-onnx soundfile scipy cairosvg fonttools 2>&1 | grep -v WARN || true

echo "== Voix guide Kokoro (GitHub releases ; Hugging Face est souvent bloqué)"
for f in kokoro-v1.0.int8.onnx voices-v1.0.bin; do
  [ -s "$OUTILS/tts/$f" ] || curl -sSL -o "$OUTILS/tts/$f" "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/$f"
done

echo "== Police Montserrat Black + emojis Twemoji (npm)"
cd "$OUTILS/st"
if [ ! -s fonts/Montserrat-Black.ttf ]; then
  npm pack @fontsource/montserrat@5.0.19 >/dev/null 2>&1 && tar xzf fontsource-montserrat-5.0.19.tgz && rm -rf mont && mv package mont
  python3 -c "from fontTools.ttLib import TTFont; f=TTFont('mont/files/montserrat-latin-900-normal.woff'); f.flavor=None; f.save('fonts/Montserrat-Black.ttf')"
fi
if [ ! -d emo/package ]; then
  (cd emo && npm pack @twemoji/svg@15.0.0 >/dev/null 2>&1 && tar xzf twemoji-svg-15.0.0.tgz)
fi

echo "== Navigateur pour le rendu"
CHROME=$(ls -d /opt/pw-browsers/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell 2>/dev/null | head -1 || true)
echo "Navigateur : ${CHROME:-introuvable (Remotion téléchargera le sien)}"
echo "OK. Outils sous-titres : $OUTILS/st   Modèles voix : $OUTILS/tts"
