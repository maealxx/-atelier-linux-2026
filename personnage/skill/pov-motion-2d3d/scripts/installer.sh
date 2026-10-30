#!/usr/bin/env bash
# Crée (ou complète) un projet vidéo à partir du moteur du skill, puis installe tous les outils.
# Usage : bash installer.sh <dossier_du_projet> <dossier_outils>
#   <dossier_du_projet> : où mettre le projet Remotion (s'il n'a pas de package.json, le moteur y est copié)
#   <dossier_outils>    : dossier de travail (modèles de voix, police, emojis), ex. le scratchpad
# Le script reprend là où il s'est arrêté : on peut le relancer sans risque.
set -euo pipefail
ICI="$(cd "$(dirname "$0")/.." && pwd)"
PROJET="$1"
OUTILS="$2"
mkdir -p "$PROJET" "$OUTILS/tts" "$OUTILS/st/fonts" "$OUTILS/st/emo"

if [ ! -f "$PROJET/package.json" ]; then
  echo "== Copie du moteur dans $PROJET"
  cp -r "$ICI/assets/projet/." "$PROJET/"
fi

echo "== Remotion (npm)"
(cd "$PROJET" && npm install --no-audit --no-fund >/dev/null)

echo "== Python : voix guide, calage, bruitages, sous-titres"
pip install --break-system-packages -q kokoro-onnx soundfile scipy numpy cairosvg pillow fonttools 2>&1 | grep -v WARN || true

echo "== Voix guide Kokoro (GitHub releases ; Hugging Face est souvent bloqué)"
for f in kokoro-v1.0.int8.onnx voices-v1.0.bin; do
  [ -s "$OUTILS/tts/$f" ] || curl -sSL -o "$OUTILS/tts/$f" "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/$f"
done

echo "== Whisper (calage des sous-titres sur la vraie voix)"
bash "$ICI/scripts/whisper.sh" "$OUTILS" || echo "Whisper non installé (on peut relancer scripts/whisper.sh)"

echo "== Polices Montserrat Black / Anton + emojis Twemoji (pour les sous-titres incrustés)"
cp -n "$ICI/assets/projet/public/fonts/Montserrat-Black.ttf" "$OUTILS/st/fonts/" 2>/dev/null || true
cp -n "$ICI/assets/projet/public/fonts/Anton-Regular.ttf" "$OUTILS/st/fonts/" 2>/dev/null || true
if [ ! -d "$OUTILS/st/emo/package" ]; then
  (cd "$OUTILS/st/emo" && npm pack @twemoji/svg@15.0.0 >/dev/null 2>&1 && tar xzf twemoji-svg-15.0.0.tgz)
fi

echo "== Navigateur pour le rendu"
CHROME=$(ls -d /opt/pw-browsers/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell 2>/dev/null | head -1 || true)
echo "Navigateur : ${CHROME:-introuvable (Remotion téléchargera le sien)}"
echo "OK. Projet : $PROJET   Outils sous-titres : $OUTILS/st   Modèles voix : $OUTILS/tts"
