"""Allonge des scènes en ajoutant du silence à leur fin (screamer, noir, rembobinage…), après caler_voix.py.
Décale la voix, les sous-titres (mots.json) et la durée des scènes (timeline.json).
Usage : python3 voix/inserer_blancs.py <projet> <scène>=<secondes> [<scène>=<secondes> …]"""
import json, os, sys
import numpy as np, soundfile as sf

ici = os.path.dirname(os.path.abspath(__file__))
PROJET = sys.argv[1]
AJOUTS = {a.split("=")[0]: float(a.split("=")[1]) for a in sys.argv[2:]}
TL = f"{ici}/../src/{PROJET}/timeline.json"
tl = json.load(open(TL))
mots = json.load(open(f"{ici}/{PROJET}/mots.json"))
v, sr = sf.read(f"{ici}/{PROJET}/voix_finale.wav")
FPS = tl["fps"]

# du dernier au premier, pour que les temps restent valables
debut, t = {}, 0
for s in tl["scenes"]:
    debut[s["nom"]] = t
    t += s["frames"]
for s in reversed(tl["scenes"]):
    if s["nom"] not in AJOUTS:
        continue
    n = round(AJOUTS[s["nom"]] * FPS)
    T = (debut[s["nom"]] + s["frames"]) / FPS  # fin de la scène
    i = int(T * sr)
    v = np.concatenate([v[:i], np.zeros(int(n / FPS * sr)), v[i:]])
    mots = [[m[0] + n / FPS, m[1] + n / FPS, m[2]] if m[0] >= T - 1e-6 else m for m in mots]
    s["frames"] += n
    print(f"{s['nom']} : +{n} images à {T:.2f} s")

json.dump(tl, open(TL, "w"), ensure_ascii=False, indent=1)
json.dump(mots, open(f"{ici}/{PROJET}/mots.json", "w"), ensure_ascii=False)
sf.write(f"{ici}/{PROJET}/voix_finale.wav", v, sr)
print("durée", round(sum(s["frames"] for s in tl["scenes"]) / FPS, 2), "s")
