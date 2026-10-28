"""Cale les mots du script sur une transcription horodatée (faster-whisper, word_timestamps).
Usage : python3 voix/aligner_asr.py <projet> <asr_words.json>
asr_words.json : [[début, fin, mot], …] sur voix/<projet>/voix_finale.wav.
Réécrit voix/<projet>/mots.json et src/<projet>/timeline.json (durées de scènes + repères de mots)."""
import difflib, json, os, re, sys, unicodedata
import soundfile as sf

ici = os.path.dirname(os.path.abspath(__file__))
PROJET, ASR = sys.argv[1], sys.argv[2]
FPS, QUEUE = 30, 0.8
SCENES = json.load(open(f"{ici}/{PROJET}/scenes.json"))
asr = json.load(open(ASR))


def lettres(w):
    w = unicodedata.normalize("NFD", w.lower())
    return "".join(c for c in w if c.isalnum() and not unicodedata.combining(c))


# chaque lettre de la transcription reçoit un instant (interpolé dans son mot)
A, T = [], []
for a, b, w in asr:
    l = lettres(w)
    for k, c in enumerate(l):
        A.append(c)
        T.append(a + (b - a) * (k + 0.5) / len(l))
mots_script = [(i, w) for i, (_, tx) in enumerate(SCENES) for w in tx.split()]
S, idx = [], []
for j, (_, w) in enumerate(mots_script):
    for c in lettres(w) or "x":
        S.append(c)
        idx.append(j)
# correspondance lettre du script → lettre de la transcription
corr = [None] * len(S)
for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, S, A, autojunk=False).get_opcodes():
    if op in ("equal", "replace"):
        for k in range(i2 - i1):
            corr[i1 + k] = T[min(j2 - 1, j1 + int(k * (j2 - j1) / max(1, i2 - i1)))]
# trous : interpolation linéaire
connus = [k for k, v in enumerate(corr) if v is not None]
for k in range(len(corr)):
    if corr[k] is None:
        g = max([c for c in connus if c < k], default=None)
        d = min([c for c in connus if c > k], default=None)
        if g is None:
            corr[k] = corr[d]
        elif d is None:
            corr[k] = corr[g]
        else:
            corr[k] = corr[g] + (corr[d] - corr[g]) * (k - g) / (d - g)
mots = []
for j, (sc, w) in enumerate(mots_script):
    ks = [k for k, x in enumerate(idx) if x == j]
    a, b = corr[ks[0]] - 0.04, corr[ks[-1]] + 0.04
    mots.append([round(a, 3), round(max(b, a + 0.08), 3), w])
for j in range(1, len(mots)):  # pas de chevauchement, ordre croissant
    mots[j][0] = max(mots[j][0], mots[j - 1][0] + 0.02)
    mots[j - 1][1] = min(mots[j - 1][1], max(mots[j][0], mots[j - 1][0] + 0.05))
sc = [s for s, _ in mots_script]
duree = sf.info(f"{ici}/{PROJET}/voix_finale.wav").duration
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
json.dump({"fps": FPS, "voix": f"{PROJET}/voix_finale.wav", "scenes": scenes}, open(f"{ici}/../src/{PROJET}/timeline.json", "w"), ensure_ascii=False, indent=1)
json.dump(mots, open(f"{ici}/{PROJET}/mots.json", "w"), ensure_ascii=False)
for s in scenes:
    print(f"{s['nom']:12s} {s['frames']:4d}")
print("total", round(t, 2), "s")
