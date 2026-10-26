"""Calage de la voix de « Et si tu misais 1 000 € ? » avec un alignement fait à la main.
Usage : python3 voix/roulette1000/caler.py [vitesse=1.1] [blanc_max=0.2]
Même traitement que voix/caler_voix.py (blancs raccourcis, accélération, normalisation, chuchotements non remontés),
mais chaque bout de phrase est rattaché à son morceau de parole (GROUPES) au lieu d'être deviné,
et certains blancs sont gardés plus longs (PAUSES) pour les moments de tension."""
import json, os, re, subprocess, sys
import numpy as np, soundfile as sf

ici = os.path.dirname(os.path.abspath(__file__))
VITESSE = float(sys.argv[1]) if len(sys.argv) > 1 else 1.1
BLANC_MAX = float(sys.argv[2]) if len(sys.argv) > 2 else 0.2
FPS, DEBUT, QUEUE = 30, 0.1, 0.8
SCENES = json.load(open(f"{ici}/scenes.json"))
# bout de phrase → morceau(x) de parole de la voix brute (indices de zones_parole)
GROUPES = [([0], [0]), ([1], [1]), ([2], [2]), ([3], [3]), ([4], [4]), ([5], [5]), ([6, 7], [6]), ([8], [7]),
           ([9], [8]), ([10], [9]), ([11], [10]), ([12], [11]), ([13], [12]), ([14], [13]), ([15], [14]), ([16], [15]),
           ([17], [16]), ([18], [17]), ([19], [18]), ([20], [19]), ([21], [20]), ([22], [21]), ([23], [22]), ([24], [23]),
           ([25, 26], [24]), ([27], [25]), ([28], [26]), ([29], [27]), ([30], [28]), ([31], [29]), ([32], [30]), ([33], [31]),
           ([34], [32]), ([35], [33]), ([36], [34]), ([37], [35]), ([38], [36]), ([39], [37]), ([40], [38]), ([41], [39]),
           ([42], [40]), ([43], [41]), ([44], [42]), ([45], [43, 44, 45]), ([46], [46]), ([47], [47]), ([48], [48]),
           ([49], [49]), ([50, 51], [50]), ([52], [51]), ([53], [52]), ([54], [53]), ([55], [54]), ([56], [55])]
PAUSES = {13: 0.4, 46: 0.95}  # blanc gardé avant ces morceaux : « Noir. Dix-sept. » et « Rouge. Trois. »

tmp = f"{ici}/_tmp"
os.makedirs(tmp, exist_ok=True)
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", f"{ici}/brut.mp3", "-ac", "1", "-ar", "44100", f"{tmp}/in.wav"], check=True)
a, sr = sf.read(f"{tmp}/in.wav")
HOP = int(sr * 0.01)


def zones_parole(x, seuil_db=-42, min_blanc=0.12):
    n = len(x) // HOP
    db = 20 * np.log10(np.sqrt(np.mean(x[: n * HOP].reshape(n, HOP) ** 2, axis=1)) + 1e-9)
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


zones = zones_parole(a)
assert len(zones) == 56, f"{len(zones)} morceaux de parole (56 attendus) : revoir GROUPES"
fondu = int(sr * 0.012)
morceaux = [np.zeros(int(DEBUT * VITESSE * sr))]
pos, t = [], DEBUT * VITESSE  # position (avant accélération) de chaque morceau dans la voix montée
for k, (d, f) in enumerate(zones):
    s = a[max(0, int(d * sr) - fondu) : int(f * sr) + fondu].copy()
    r = 20 * np.log10(np.sqrt(np.mean(s**2)) + 1e-9)
    s *= 10 ** (np.clip(-21 - r, -3, 0) / 20)
    s[:fondu] *= np.linspace(0, 1, fondu)
    s[-fondu:] *= np.linspace(1, 0, fondu)
    pos.append((t + fondu / sr, t + len(s) / sr - fondu / sr))
    morceaux.append(s)
    t += len(s) / sr
    if k < len(zones) - 1:
        blanc = PAUSES.get(k + 1, min(zones[k + 1][0] - f, BLANC_MAX))
        morceaux.append(np.zeros(int(blanc * sr)))
        t += int(blanc * sr) / sr
morceaux.append(np.zeros(int(0.3 * sr)))
sf.write(f"{tmp}/niv.wav", np.concatenate(morceaux), sr)
subprocess.run(
    ["ffmpeg", "-loglevel", "error", "-y", "-i", f"{tmp}/niv.wav", "-af",
     f"atempo={VITESSE},acompressor=threshold=-24dB:ratio=3:attack=8:release=120,loudnorm=I=-15:TP=-1.5:LRA=7", "-ar", "44100", f"{ici}/voix_finale.wav"],
    check=True,
)
duree = sf.info(f"{ici}/voix_finale.wav").duration
pos = [(x / VITESSE, y / VITESSE) for x, y in pos]

# bouts de phrase, puis minutage des mots au prorata des syllabes dans chaque groupe
VOY = re.compile(r"[aeiouyàâäéèêëîïôöûùü]+", re.I)
syl = lambda w: max(1, len(VOY.findall(w)))
morc = [(i, b.split()) for i, (_, texte) in enumerate(SCENES) for b in re.split(r"(?<=[.,…?!:])\s+", texte) if b.strip()]
assert sorted(c for cs, _ in GROUPES for c in cs) == list(range(len(morc)))
mots = []
for cs, zs in GROUPES:
    ws = [(w, morc[c][0]) for c in cs for w in morc[c][1]]
    # plusieurs morceaux pour un bout : on répartit sur la durée parlée seulement
    plages = [pos[z] for z in zs]
    parle = sum(y - x for x, y in plages)
    p = np.array([syl(w) + 0.6 for w, _ in ws], float)
    cum = np.concatenate([[0], np.cumsum(p)]) / p.sum() * parle
    def temps(u):
        for x, y in plages:
            if u <= y - x + 1e-9:
                return x + u
            u -= y - x
        return plages[-1][1]
    for (w, sc), u0, u1 in zip(ws, cum[:-1], cum[1:]):
        mots.append([round(temps(u0), 3), round(temps(u1), 3), w, sc])

debuts = [min(x0 for x0, _, _, s_ in mots if s_ == i) for i in range(len(SCENES))]
bornes = [0.0] + [d - 0.05 for d in debuts[1:]] + [duree - 0.3 + QUEUE]
scenes, t = [], 0
for i, (nom, texte) in enumerate(SCENES):
    fr = int(round((bornes[i + 1] - bornes[i]) * FPS))
    reperes = {}
    for x0, _, w, s_ in mots:
        cle = re.sub(r"[^\w-]", "", w.lower())
        if s_ == i and cle not in reperes:
            reperes[cle] = int(round((x0 - t) * FPS))
    scenes.append({"nom": nom, "frames": fr, "texte": texte, "reperes": reperes})
    t += fr / FPS
os.makedirs(f"{ici}/../../src/roulette1000", exist_ok=True)
json.dump({"fps": FPS, "voix": "roulette1000/voix_finale.wav", "scenes": scenes}, open(f"{ici}/../../src/roulette1000/timeline.json", "w"), ensure_ascii=False, indent=1)
json.dump([m_[:3] for m_ in mots], open(f"{ici}/mots.json", "w"), ensure_ascii=False)
for f_ in ["in.wav", "niv.wav"]:
    os.remove(f"{tmp}/{f_}")
os.rmdir(tmp)
print(f"voix {duree:.1f} s (brute {len(a) / sr:.1f} s), vidéo {t:.1f} s")
for s in scenes:
    print(f"  {s['nom']:9s} {s['frames'] / FPS:5.2f} s  {s['texte'][:60]}")
