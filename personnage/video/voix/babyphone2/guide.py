"""Voix guide Kokoro de « Le babyphone 2 » (sert seulement au minutage tant que la vraie voix n'est pas là).
Usage : python3 voix/vaisseau/guide.py <dossier_modeles_kokoro>  →  voix/vaisseau/guide.wav (à passer à caler_voix.py)"""
import json, os, re, sys
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

ici = os.path.dirname(os.path.abspath(__file__))
k = Kokoro(f"{sys.argv[1]}/kokoro-v1.0.int8.onnx", f"{sys.argv[1]}/voices-v1.0.bin")
morceaux, sr = [], 24000
for nom, texte in json.load(open(f"{ici}/scenes.json")):
    for p in [b for b in re.split(r"(?<=[.,…?!:])\s+", texte) if b.strip()]:
        a, sr = k.create(p, voice="ff_siwis", speed=1.15, lang="fr-fr")
        nz = np.where(np.abs(a) > 0.01)[0]
        a = a[max(0, nz[0] - 200) : nz[-1] + 1200] if len(nz) else a
        morceaux += [a, np.zeros(int(sr * (0.35 if p.endswith(("…", ".", "?")) else 0.22)), np.float32)]
sf.write(f"{ici}/guide.wav", np.concatenate(morceaux), sr)
print("ok", round(sum(len(m) for m in morceaux) / sr, 1), "s")
