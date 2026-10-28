"""Corrige à la main l'alignement de caler_voix.py sur deux passages (listes à virgules mal découpées).
À relancer après chaque caler_voix.py : python3 voix/parrainage/retouche.py"""
import json, os, re
import soundfile as sf
ici = os.path.dirname(os.path.abspath(__file__))
FPS, QUEUE = 30, 0.8
SCENES = json.load(open(f"{ici}/scenes.json"))
mots = json.load(open(f"{ici}/mots.json"))
VOY = re.compile(r"[aeiouyàâäéèêëîïôöûùü]+", re.I)
syl = lambda w: max(1, len(VOY.findall(w)))
# (début, fin, texte) relevés sur l'énergie de la voix finale
FIX = [
    (11.04, 11.98, "Elle fait un calcul."),
    (12.05, 13.55, "Trouver un nouveau client, pour une banque,"),
    (13.77, 16.03, "ça coûte une fortune. Pubs télé, Insta, YouTube, influenceurs."),
    (16.26, 17.77, "Ça peut dépasser cent euros par client."),
    (47.33, 48.12, "Et un jour,"),
    (48.35, 51.90, "tu veux un prêt pour ta voiture, ton appart, une assurance, un livret."),
    (52.14, 52.76, "Et le découvert?"),
    (52.99, 53.41, "Des frais."),
    (53.65, 57.48, "Sur des années, un client, ça peut rapporter des centaines, voire des milliers d'euros."),
]
for t0, t1, texte in FIX:
    ws = texte.split()
    # retire les mots déjà placés pour ce passage (même texte, dans l'ordre)
    idx = None
    for i in range(len(mots) - len(ws) + 1):
        if [m[2] for m in mots[i : i + len(ws)]] == ws and abs(mots[i][0] - t0) < 3:
            idx = i
            break
    assert idx is not None, texte
    p = [syl(w) + 0.6 for w in ws]
    tot, acc = sum(p), 0
    for k, w in enumerate(ws):
        a = t0 + acc / tot * (t1 - t0)
        acc += p[k]
        mots[idx + k][0], mots[idx + k][1] = round(a, 3), round(t0 + acc / tot * (t1 - t0), 3)
# scène de chaque mot : on refait la correspondance dans l'ordre du texte
sc = [i for i, (_, tx) in enumerate(SCENES) for _ in tx.split()]
assert len(sc) == len(mots)
duree = sf.info(f"{ici}/voix_finale.wav").duration
debuts = [min(m[0] for m, s in zip(mots, sc) if s == i) for i in range(len(SCENES))]
bornes = [0.0] + [d - 0.05 for d in debuts[1:]] + [duree - 0.3 + QUEUE]
scenes, t = [], 0
for i, (nom, texte) in enumerate(SCENES):
    fr = int(round((bornes[i + 1] - bornes[i]) * FPS))
    rep = {}
    for m, s in zip(mots, sc):
        cle = re.sub(r"[^\w-]", "", m[2].lower())
        if s == i and cle not in rep:
            rep[cle] = int(round((m[0] - t) * FPS))
    scenes.append({"nom": nom, "frames": fr, "texte": texte, "reperes": rep})
    t += fr / FPS
json.dump({"fps": FPS, "voix": "parrainage/voix_finale.wav", "scenes": scenes}, open(f"{ici}/../../src/parrainage/timeline.json", "w"), ensure_ascii=False, indent=1)
json.dump(mots, open(f"{ici}/mots.json", "w"), ensure_ascii=False)
for s in scenes:
    print(f"{s['nom']:12s} {s['frames']:4d}")
print("total", sum(s["frames"] for s in scenes) / FPS)
