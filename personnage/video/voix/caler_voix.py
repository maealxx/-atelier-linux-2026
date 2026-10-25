"""Prépare une voix off enregistrée (ex. ElevenLabs) et recale la vidéo dessus.
Usage : python3 voix/caler_voix.py <voix_brute> [vitesse=1.1] [projet] [blanc_max=0.16]
Sans projet : texte de voix/generer.py, sorties dans src/timeline.json et voix/ (« Le dernier bus »).
Avec projet : texte de voix/<projet>/scenes.json, sorties dans src/<projet>/ et voix/<projet>/.
1. raccourcit les blancs (sans les supprimer), 2. remonte les passages chuchotés,
3. accélère sans changer la hauteur, 4. normalise le volume (≈ -15 LUFS),
5. repère chaque bout de phrase grâce aux pauses et en déduit le minutage des mots,
6. réécrit src/timeline.json (durée des scènes) et voix/mots.json (sous-titres).
Le texte de référence est celui de voix/generer.py (une scène = un paragraphe)."""
import json, os, re, subprocess, sys
import numpy as np, soundfile as sf

ici = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ici)
SRC, VITESSE = sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else 1.1
PROJET = sys.argv[3] if len(sys.argv) > 3 else ""
FPS = 30
DEBUT = 0.1  # la voix démarre 0,1 s après le début de la vidéo
QUEUE = 0.8  # temps laissé après la dernière phrase
BLANC_MAX = float(sys.argv[4]) if len(sys.argv) > 4 else 0.16  # durée maximale d'un blanc (avant accélération)

# texte de référence (sans importer kokoro)
if PROJET:
    SCENES = [(nom, 0, texte) for nom, texte in json.load(open(f"{ici}/{PROJET}/scenes.json"))]
else:
    src = open(f"{ici}/generer.py").read()
    SCENES = eval(src[src.index("SCENES = [") + 9 : src.index("]\n\nici") + 1])
DOSSIER = f"{ici}/{PROJET}" if PROJET else ici
SORTIE_TL = f"{ici}/../src/{PROJET}/timeline.json" if PROJET else f"{ici}/../src/timeline.json"
NOM_VOIX = f"{PROJET}/voix_finale.wav" if PROJET else "voix_finale.wav"

tmp = f"{ici}/eleven"
os.makedirs(tmp, exist_ok=True)
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", SRC, "-ac", "1", "-ar", "44100", f"{tmp}/_in.wav"], check=True)
a, sr = sf.read(f"{tmp}/_in.wav")
HOP = int(sr * 0.01)


def zones_parole(x, seuil_db=-42, min_blanc=0.12):
    """Renvoie la liste des zones de parole [(début, fin)] en secondes."""
    n = len(x) // HOP
    rms = np.sqrt(np.mean(x[: n * HOP].reshape(n, HOP) ** 2, axis=1)) + 1e-9
    db = 20 * np.log10(rms)
    parle = db > seuil_db
    zones, i = [], 0
    while i < n:
        if parle[i]:
            j = i
            while j < n and parle[j]:
                j += 1
            zones.append([i * 0.01, j * 0.01])
            i = j
        else:
            i += 1
    fusion = []
    for z in zones:
        if fusion and z[0] - fusion[-1][1] < min_blanc:
            fusion[-1][1] = z[1]
        else:
            fusion.append(z)
    return [z for z in fusion if z[1] - z[0] > 0.04]


# ---------- 1-2. blancs raccourcis + chuchotements remontés ----------
zones = zones_parole(a)
morceaux = []
fondu = int(sr * 0.012)
for k, (d, f) in enumerate(zones):
    s = a[max(0, int(d * sr) - fondu) : int(f * sr) + fondu].copy()
    r = 20 * np.log10(np.sqrt(np.mean(s**2)) + 1e-9)
    gain = np.clip(-21 - r, -3, 12)  # on vise -21 dB par morceau, +12 dB max pour les chuchotements
    s *= 10 ** (gain / 20)
    s[:fondu] *= np.linspace(0, 1, fondu)
    s[-fondu:] *= np.linspace(1, 0, fondu)
    morceaux.append(s)
    if k < len(zones) - 1:
        blanc = min(zones[k + 1][0] - f, BLANC_MAX)
        morceaux.append(np.zeros(int(blanc * sr)))
v = np.concatenate([np.zeros(int(DEBUT * VITESSE * sr))] + morceaux + [np.zeros(int(0.3 * sr))])
sf.write(f"{tmp}/_niv.wav", v, sr)

# ---------- 3-4. accélération + normalisation ----------
subprocess.run(
    ["ffmpeg", "-loglevel", "error", "-y", "-i", f"{tmp}/_niv.wav", "-af",
     f"atempo={VITESSE},acompressor=threshold=-24dB:ratio=3:attack=8:release=120,loudnorm=I=-15:TP=-1.5:LRA=7", "-ar", "44100", f"{ici}/{NOM_VOIX}"],
    check=True,
)
vf, sr = sf.read(f"{ici}/{NOM_VOIX}")
duree = len(vf) / sr

# ---------- 5. alignement texte ↔ pauses ----------
VOY = re.compile(r"[aeiouyàâäéèêëîïôöûùü]+", re.I)
syl = lambda w: max(1, len(VOY.findall(w)))
morc = []  # bouts de phrase : (scène, [mots])
for i, (_, _, texte) in enumerate(SCENES):
    for b in re.split(r"(?<=[.,…?!:])\s+", texte):
        if b.strip():
            morc.append((i, b.split()))
segs = zones_parole(vf, seuil_db=-38, min_blanc=0.09)
S = [sum(syl(w) for w in m) for _, m in morc]
D = [f - d for d, f in segs]
rate = sum(D) / sum(S)
n, m = len(morc), len(segs)
INF = 1e18
cout = np.full((n + 1, m + 1), INF)
choix = {}
cout[0, 0] = 0
for i in range(n + 1):
    for j in range(m + 1):
        if cout[i, j] >= INF:
            continue
        for da in range(1, 4):
            for db in range(1, 4):
                if i + da > n or j + db > m:
                    continue
                attendu = rate * sum(S[i : i + da])
                reel = segs[j + db - 1][1] - segs[j][0]
                c = cout[i, j] + (reel - attendu) ** 2 / attendu + 0.15 * (da - 1) + 0.15 * (db - 1)
                if c < cout[i + da, j + db]:
                    cout[i + da, j + db] = c
                    choix[(i + da, j + db)] = (i, j)
# remonte le chemin
i, j, groupes = n, m, []
while (i, j) != (0, 0):
    pi, pj = choix[(i, j)]
    groupes.append((pi, i, pj, j))
    i, j = pi, pj
groupes.reverse()

mots = []
for ci0, ci1, sj0, sj1 in groupes:
    t0, t1 = segs[sj0][0], segs[sj1 - 1][1]
    ws = [w for _, ms in morc[ci0:ci1] for w in ms]
    sc = [sc for sc, ms in morc[ci0:ci1] for _ in ms]
    p = np.array([syl(w) + 0.6 for w in ws], float)
    b = t0 + np.concatenate([[0], np.cumsum(p)]) / p.sum() * (t1 - t0)
    for w, s_, x0, x1 in zip(ws, sc, b[:-1], b[1:]):
        mots.append([round(x0, 3), round(x1, 3), w, s_])

# ---------- 6. durée des scènes = de la 1re syllabe d'un paragraphe à la suivante ----------
debuts = [min(x0 for x0, _, _, s_ in mots if s_ == i) for i in range(len(SCENES))]
bornes = [0.0] + [d - 0.05 for d in debuts[1:]] + [duree - 0.3 + QUEUE]
scenes, t = [], 0
for i, (nom, _, texte) in enumerate(SCENES):
    fr = int(round((bornes[i + 1] - bornes[i]) * FPS))
    reperes = {}
    for x0, _, w, s_ in mots:
        cle = re.sub(r"[^\w-]", "", w.lower())
        if s_ == i and cle not in reperes:
            reperes[cle] = int(round((x0 - t) * FPS))
    scenes.append({"nom": nom, "frames": fr, "texte": texte, "reperes": reperes})
    t += fr / FPS
json.dump({"fps": FPS, "voix": NOM_VOIX, "scenes": scenes}, open(SORTIE_TL, "w"), ensure_ascii=False, indent=1)
json.dump([m_[:3] for m_ in mots], open(f"{DOSSIER}/mots.json", "w"), ensure_ascii=False)
for f_ in ["_in.wav", "_niv.wav"]:
    os.remove(f"{tmp}/{f_}")
print(f"voix {duree:.1f} s (brute {len(a) / 44100:.1f} s), vidéo {t:.1f} s, {len(segs)} morceaux de parole pour {len(morc)} bouts de phrase")
for g in groupes:
    print(f"  {segs[g[2]][0]:6.2f}-{segs[g[3] - 1][1]:6.2f}  {' / '.join(' '.join(ms) for _, ms in morc[g[0]:g[1]])}")
