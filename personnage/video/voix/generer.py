"""Génère la timeline des scènes à partir du texte, lu par une voix guide (Kokoro, voix française).
La voix guide ne sert qu'au minutage : elle n'est pas mise dans la vidéo.
Usage : python3 voix/generer.py <dossier_modeles_kokoro>
Sortie : voix/NN.wav + src/timeline.json (durées des scènes + mots horodatés pour les sous-titres)."""
import json, sys, os, re
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

FPS = 30
DEBUT = 0.12  # le texte démarre 0,12 s après le début de la scène
FIN = 0.3  # marge après la dernière syllabe
SCENES = [
    # (nom, durée minimale en s, texte : rythmé, sans blanc)
    ("busPart", 4.0, "Minuit quarante-sept. Tu cours comme jamais… et les portes se ferment sous ton nez. Le dernier bus part sans toi."),
    ("aPied", 4.0, "Génial. Ton tel est à deux pour cent. Alors tu rentres à pied. Vingt minutes, tranquille."),
    ("ruelle", 4.0, "Pour gagner du temps, tu coupes par la petite ruelle. Celle où personne ne passe jamais."),
    ("poussette", 4.0, "Au fond, un grincement. Une poussette sort de l'ombre et roule droit vers toi. Toute seule. Tu regardes dedans… vide."),
    ("poubelles", 4.0, "Tu continues. Entre les poubelles, deux yeux rouges s'allument. Ils te suivent. Tu accélères."),
    ("arret", 4.0, "Au bout, un vieil arrêt de bus. Néon qui clignote, vitres cassées. Aucun numéro de ligne."),
    ("postit", 4.0, "Collé sur le panneau, un post-it écrit à la main : surtout, ne pas monter dans le bus. Souligné deux fois."),
    ("busVieux", 4.0, "Et là, un phare au loin. Un bus arrive. Vieux, rouillé, dégueulasse. Il s'arrête pile devant toi."),
    ("portes", 4.0, "Les portes s'ouvrent en grinçant. Lumière rouge. Personne au volant. Le post-it. Le bus. Le post-it."),
    ("souffle", 3.5, "Et puis tu le sens. Un souffle chaud… humide… juste dans ta nuque."),
    ("creature", 4.5, "Tu te retournes. Trois mètres de haut. Sept yeux. Et un sourire beaucoup trop grand."),
    ("dilemme", 5.5, "T'as deux secondes. Tu montes dans le bus ? Ou tu restes avec lui ? Dis-le en commentaire !"),
]

ici = os.path.dirname(os.path.abspath(__file__))
k = Kokoro(f"{sys.argv[1]}/kokoro-v1.0.int8.onnx", f"{sys.argv[1]}/voices-v1.0.bin")
out, t0, mots = [], 0.0, []
for i, (nom, mini, texte) in enumerate(SCENES):
    # une phrase à la fois, avec un petit silence entre elles
    phrases = [p for p in re.split(r"(?<=[.?!…])\s+", texte) if p]
    morceaux, horo, t = [], [], 0.0
    for p in phrases:
        a, sr = k.create(p, voice="ff_siwis", speed=1.12, lang="fr-fr")
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
        pause = 0.22 if p.endswith(("…", ".")) else 0.15
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
