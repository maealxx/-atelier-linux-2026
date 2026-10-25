"""Génère la voix off provisoire (Kokoro, voix française) et la timeline des scènes.
Usage : python3 voix/generer.py <dossier_modeles_kokoro>
Sortie : voix/NN.wav + src/timeline.json (durées des scènes + mots horodatés pour les sous-titres)."""
import json, sys, os, re
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

FPS = 30
DEBUT = 0.35  # la voix démarre 0,35 s après le début de la scène
FIN = 0.55  # marge après la dernière syllabe
SCENES = [
    # (nom, durée minimale en s, texte de la voix off)
    ("busPart", 5.0, "Imagine. Tu rates le dernier bus pour rentrer chez toi."),
    ("aPied", 4.5, "Pas le choix. Tu rentres à pied."),
    ("ruelle", 5.0, "Pour couper, tu prends une petite ruelle. Grosse erreur."),
    ("poussette", 6.0, "Au fond, une poussette roule vers toi. Toute seule."),
    ("poubelles", 5.5, "Entre les poubelles, deux yeux te fixent. Tu accélères."),
    ("arret", 5.0, "Au bout de la ruelle, un vieil arrêt de bus. Abandonné."),
    ("postit", 5.0, "Dessus, un post-it. Surtout, ne pas monter dans le bus."),
    ("busVieux", 6.0, "Et là, un bus arrive. Vieux. Rouillé. Dégueulasse."),
    ("portes", 5.5, "Les portes s'ouvrent. Personne au volant. Tu hésites."),
    ("souffle", 4.5, "Puis tu sens un souffle chaud, dans ta nuque."),
    ("creature", 5.5, "Derrière toi… quelque chose d'énorme."),
    ("dilemme", 6.5, "Alors… tu montes dans le bus ? Ou tu restes là ? Dis-le en commentaire."),
]

ici = os.path.dirname(os.path.abspath(__file__))
k = Kokoro(f"{sys.argv[1]}/kokoro-v1.0.int8.onnx", f"{sys.argv[1]}/voices-v1.0.bin")
out, t0, mots = [], 0.0, []
for i, (nom, mini, texte) in enumerate(SCENES):
    # une phrase à la fois, avec un petit silence entre elles
    phrases = [p for p in re.split(r"(?<=[.?!…])\s+", texte) if p]
    morceaux, horo, t = [], [], 0.0
    for p in phrases:
        a, sr = k.create(p, voice="ff_siwis", speed=0.92, lang="fr-fr")
        # retire les silences de début / fin
        nz = np.where(np.abs(a) > 0.01)[0]
        a = a[max(0, nz[0] - 200): nz[-1] + 1200] if len(nz) else a
        d = len(a) / sr
        # mots répartis au prorata du nombre de lettres
        ws = p.split()
        poids = np.array([len(re.sub(r"\W", "", w)) + 1.5 for w in ws], float)
        bornes = np.concatenate([[0], np.cumsum(poids) / poids.sum()]) * d
        for w, a0, a1 in zip(ws, bornes[:-1], bornes[1:]):
            horo.append([t + a0, t + a1, w])
        morceaux.append(a)
        pause = 0.45 if p.endswith(("…", ".")) else 0.3
        morceaux.append(np.zeros(int(sr * pause), np.float32))
        t += d + pause
    voix = np.concatenate(morceaux[:-1])
    dv = len(voix) / sr
    sf.write(f"{ici}/{i + 1:02d}.wav", voix, sr)
    duree = max(mini, DEBUT + dv + FIN)
    frames = int(round(duree * FPS))
    out.append({"nom": nom, "frames": frames, "voix": f"{i + 1:02d}.wav", "debutVoix": DEBUT, "dureeVoix": round(dv, 3), "texte": texte})
    mots += [[round(t0 + DEBUT + a, 3), round(t0 + DEBUT + b, 3), w] for a, b, w in horo]
    t0 += frames / FPS
    print(f"{nom:10s} voix {dv:5.2f}s  scène {frames / FPS:5.2f}s")
json.dump({"fps": FPS, "scenes": out}, open(f"{ici}/../src/timeline.json", "w"), ensure_ascii=False, indent=1)
json.dump(mots, open(f"{ici}/mots.json", "w"), ensure_ascii=False)
print("total", round(t0, 2), "s")
