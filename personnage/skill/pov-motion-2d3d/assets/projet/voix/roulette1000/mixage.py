"""Bruitages de « Et si tu misais 1 000 € ? » + voix off, calés sur src/roulette1000/ (timeline, plans, evenements).
Mêmes règles que Roulette1000.jsx : tours de roue, rebonds de la bille, chrono, battements de cœur au BPM affiché.
Usage : python3 voix/roulette1000/mixage.py <sortie.wav>"""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, resample_poly, sosfilt

SR = 48000
ici = os.path.dirname(os.path.abspath(__file__))
src = f"{ici}/../../src/roulette1000"
tl = json.load(open(f"{src}/timeline.json"))
plans = json.load(open(f"{src}/plans.json"))
EV = json.load(open(f"{src}/evenements.json"))
FPS = tl["fps"]
start, t = {}, 0
for s in tl["scenes"]:
    start[s["nom"]] = t
    t += s["frames"]
NF = t
DUREE = NF / FPS
rng = np.random.default_rng(21)
voix = np.zeros(int(DUREE * SR) + SR)
sfx = np.zeros_like(voix)
amb = np.zeros_like(voix)  # ambiance de salle (coupée pendant le silence)


def filtre(x, typ, f):
    return sosfilt(butter(2, f, btype=typ, fs=SR, output="sos"), x)


def bruit(d):
    return rng.standard_normal(int(d * SR))


def ts(d):
    return np.arange(int(d * SR)) / SR


def env(n, a=0.01, r=0.1):
    e = np.ones(n)
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def pose(son, t0, vol, piste=None):
    piste = sfx if piste is None else piste
    i = int(max(0, t0) * SR)
    son = son[: max(0, len(piste) - i)]
    piste[i : i + len(son)] += son * vol


def clic(t0, vol, f=3000, d=0.03):
    pose(filtre(bruit(d), "bandpass", [f * 0.6, min(f * 1.6, 20000)]) * np.exp(-ts(d) * 120), t0, vol)


def jeton(t0, vol, n=None, piste=None):
    for k in range(n or rng.integers(2, 5)):
        d = 0.08
        tt = ts(d)
        f0 = rng.uniform(3200, 5200)
        pose((np.sin(2 * np.pi * f0 * tt) + 0.5 * np.sin(2 * np.pi * f0 * 1.47 * tt)) * np.exp(-tt * 60), t0 + k * rng.uniform(0.03, 0.07), vol, piste)


def note(f0, t0, d, vol, decay=4, piste=None):
    tt = ts(d)
    pose((np.sin(2 * np.pi * f0 * tt) + 0.3 * np.sin(2 * np.pi * 2 * f0 * tt)) * np.exp(-tt * decay) * env(len(tt), 0.005, 0.05), t0, vol, piste)


def boom(t0, vol):
    d = 2.2
    pose(np.sin(2 * np.pi * (52 - 14 * ts(d)) * ts(d)) * np.exp(-ts(d) * 2) + filtre(bruit(d), "lowpass", 140) * np.exp(-ts(d) * 3), t0, vol)


def whoosh(t0, vol, d=0.26):
    pose(filtre(bruit(d), "bandpass", [700, 5000]) * np.sin(np.pi * ts(d) / d) ** 2, t0 - d / 2, vol)


def rep(nom, mot):
    for s in tl["scenes"]:
        if s["nom"] == nom:
            return start[nom] + s["reperes"].get(mot, 0)


def G(ref):
    if ref is None:
        return None
    return ref[1] if ref[0] is None else (start[ref[0]] + ref[1] if isinstance(ref[1], int) else rep(*ref))


def bornes(nom):
    w = plans[nom]
    d = next(s["frames"] for s in tl["scenes"] if s["nom"] == nom)
    b = [0]
    for x in w:
        b.append(round(b[-1] + x / sum(w) * d))
    return [(start[nom] + k) / FPS for k in b]


TOURS = [dict(t, debut=G(t["debut"]), saut=G(t["saut"]), fin=G(t["fin"])) for t in EV["tours"]]
SILENCE = (rep("silence", "tombe") / FPS + 0.05, start["twist"] / FPS + 0.08)  # silence total
B_ER = bornes("erreur")
SEPIA = (B_ER[2], B_ER[3] + 0.7 * (B_ER[4] - B_ER[3]))  # plans 3 et 4 (fondu à 70 % du dernier), comme Roulette1000.jsx

# ---------- ambiance de casino : brouhaha, jetons, machines à sous, musique lounge qui monte ----------
tt = ts(DUREE)
foule = filtre(bruit(DUREE), "bandpass", [250, 1800]) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.17 * tt) + 0.15 * np.sin(2 * np.pi * 0.43 * tt))
pose(foule * env(len(tt), 0.3, 1), 0, 0.05, amb)
t = 0.4
while t < DUREE - 0.5:
    jeton(t, 0.035, piste=amb)
    t += rng.uniform(0.7, 2.0)
t = 1.0
while t < DUREE - 1:
    for k, f0 in enumerate([1046, 1318, 1568, 2093]):
        note(f0 * rng.choice([1, 0.75]), t + k * 0.07, 0.25, 0.01, 9, amb)
    t += rng.uniform(2.5, 4.5)
# musique : basse + accords sombres, tempo qui suit un peu le stress
accords = [[220, 262, 330], [196, 247, 294], [175, 220, 262], [165, 208, 247]]
t, k = 0.0, 0
while t < DUREE:
    beat = 60 / 96
    for f0 in accords[k % 4]:
        note(f0, t, beat * 4, 0.012, 0.8, amb)
    note(accords[k % 4][0] / 2, t, beat * 2, 0.035, 2, amb)
    note(accords[k % 4][0] / 2, t + beat * 2, beat * 2, 0.03, 2, amb)
    for b in range(8):
        d = 0.02
        pose(filtre(bruit(d), "highpass", 7000) * np.exp(-ts(d) * 150), t + b * beat / 2, 0.012 if b % 2 else 0.02, amb)
    t += beat * 4
    k += 1
# le flashback de 1913 : ambiance étouffée + craquements de vieux disque
i0, i1 = int(SEPIA[0] * SR), int(SEPIA[1] * SR)
amb[i0:i1] = filtre(amb[i0:i1], "bandpass", [300, 2500]) * 0.6
d = SEPIA[1] - SEPIA[0]
craq = np.zeros(int(d * SR))
for _ in range(int(d * 18)):
    j = rng.integers(0, len(craq) - 200)
    craq[j : j + 60] += rng.standard_normal(60) * np.exp(-np.arange(60) / 8)
pose(craq + 0.15 * filtre(bruit(d), "bandpass", [800, 4000]), SEPIA[0], 0.05)
# silence total : tout se coupe (fondu très court)
i0, i1 = int(SILENCE[0] * SR), int(SILENCE[1] * SR)
f_ = int(0.08 * SR)
amb[i0 - f_ : i0] *= np.linspace(1, 0, f_)
amb[i0:i1] = 0
amb[i1 : i1 + int(0.4 * SR)] *= np.linspace(0, 1, int(0.4 * SR))
sfx += amb

# ---------- swoosh à chaque coupe ----------
for nom in start:
    for c in bornes(nom)[:-1]:
        if c > 0 and not (SILENCE[0] - 0.1 < c < SILENCE[1] - 0.05):
            whoosh(c, 0.03)

# ---------- la roue : bille qui roule, rebonds, chrono ----------
for T in TOURS:
    d0 = T["debut"] / FPS
    fin = (T["fin"] if T["fin"] is not None else T["debut"] + 600) / FPS
    fin = min(fin, DUREE)
    saut = (T["saut"] / FPS) if T["saut"] is not None else fin
    if d0 > 0:  # lancer du croupier
        d = 0.35
        pose(filtre(bruit(d), "bandpass", [800, 5000]) * np.sin(np.pi * ts(d) / d) ** 2, d0 - 0.05, 0.08)
        clic(d0, 0.14, 4000, 0.02)
    a = max(0.0, d0)
    d = saut - a
    if d > 0:
        tt = ts(d)
        vit = 1 - (tt + a - d0) / (fin - d0)
        rate = 14 + 36 * vit
        mod = 0.55 + 0.45 * np.sin(2 * np.pi * np.cumsum(rate) / SR)
        roule = filtre(bruit(d), "bandpass", [1800, 6500]) * mod * (0.4 + 0.6 * vit)
        pose(roule * env(len(tt), 0.05, 0.1), a, 0.07)
        pose(filtre(bruit(d), "lowpass", 300) * env(len(tt), 0.1, 0.2), a, 0.05)
    # rebonds : quand la bille retombe (hop = 60·|sin(u·6π)| → impacts à u = k/6)
    if T["saut"] is not None:
        for k_ in range(1, 7):
            tc = saut + (fin - saut) * k_ / 6
            clic(tc, 0.2 - 0.015 * k_, rng.uniform(2200, 3800), 0.04)
            pose(filtre(bruit(0.05), "lowpass", 900) * np.exp(-ts(0.05) * 80), tc, 0.09)
        clic(fin, 0.3, 2600, 0.05)
        # tic-tac du chrono sur les 5 dernières secondes, bip aigu sur la dernière
        for r in [5, 4, 3, 2, 1]:
            tb = fin - r
            if tb > max(d0, 0):
                note(1320 if r == 1 else 880, tb, 0.12, 0.06 if r > 2 else 0.08, 18)

# ---------- résultats ----------
t17 = rep("perte", "noir") / FPS
boom(t17, 0.22)
for k, f0 in enumerate([392, 330, 262, 196]):
    note(f0, t17 + 0.05 + k * 0.12, 0.6, 0.05, 3)
# le râteau qui tire les jetons
tr = rep("perte", "râteau") / FPS
d = 1.3
pose(filtre(bruit(d), "bandpass", [300, 1500]) * env(int(d * SR), 0.1, 0.3), tr, 0.05)
jeton(tr + 1.2, 0.08, 4)
# « FAUX » : buzzer
tf = rep("erreur", "faux") / FPS
d = 0.45
pose(np.sign(np.sin(2 * np.pi * 110 * ts(d))) * env(int(d * SR), 0.01, 0.1), tf, 0.05)
# 26 noirs : un petit tic par numéro
t0, t1 = rep("erreur", "noir") / FPS, (rep("erreur", "suite") + 6) / FPS
for k in range(26):
    clic(t0 + (t1 - t0) * k / 25, 0.06, 2600, 0.02)
# les 18 cases rouges qui s'allument
td = rep("chiffre", "dix-huit") / FPS
for k, f0 in enumerate([523, 659, 784]):
    note(f0, td + k * 0.05, 0.4, 0.03, 5)
# l'enveloppe posée sur le rouge
d = 0.3
pose(filtre(bruit(d), "bandpass", [1500, 6000]) * np.sin(np.pi * ts(d) / d), rep("tapis", "rouge") / FPS - 0.2, 0.06)
# le twist : « Rouge. Trois. » → jackpot
t3 = rep("twist", "rouge") / FPS
boom(t3, 0.12)
for k, f0 in enumerate([523, 659, 784, 1046, 1318, 1568]):
    note(f0, t3 + 0.03 + k * 0.07, 0.8, 0.06, 3)
d = 1.8
pose(filtre(bruit(d), "bandpass", [400, 2500]) * np.sin(np.pi * ts(d) / d), t3 + 0.1, 0.1)
for k in range(10):
    jeton(rep("twist", "récupères") / FPS + k * 0.09, 0.07, 2)
te = rep("twist", "explose") / FPS
boom(te, 0.12)
# le piège : nappe grave qui descend
tp = rep("piege", "piège") / FPS
d = 2.5
pose(np.sin(2 * np.pi * (110 - 40 * ts(d) / d) * ts(d)) * env(int(d * SR), 0.05, 1.0), tp, 0.07)
# relance finale de la bille (boucle)
tl3 = TOURS[2]["debut"] / FPS
for k, f0 in enumerate([392, 523]):
    note(f0, rep("dilemme", "tout") / FPS + k * 0.1, 0.4, 0.04, 6)

# ---------- battements de cœur au BPM affiché ----------
keys = [(start[sc] + o, v) for sc, o, v in EV["coeur"]]
fr = np.arange(NF + 2)
bpm = np.interp(fr, [k[0] for k in keys], [k[1] for k in keys])
phase = np.concatenate([[0], np.cumsum(bpm[1:] / 60 / FPS)])
stress = np.clip((bpm - 95) / 85, 0, 1)


def poum(t0, vol):
    d = 0.18
    pose(np.sin(2 * np.pi * (62 - 20 * ts(d) / d) * ts(d)) * np.exp(-ts(d) * 20), t0, vol)


for k in range(1, int(phase[-1])):
    f0 = np.searchsorted(phase, k)
    t0 = f0 / FPS
    if SILENCE[0] + 0.2 < t0 < SILENCE[1] - 0.25 and k % 2:
        continue  # un seul battement pendant le silence
    v = 0.06 + 0.2 * stress[min(f0, NF)]
    poum(t0, v)
    poum(t0 + 0.12 * 60 / bpm[min(f0, NF)] * 1.5, v * 0.6)

# ---------- voix + baisse des bruitages sous la voix ----------
a, sr = sf.read(f"{ici}/../{tl['voix']}")
a = resample_poly(a, SR, sr) if sr != SR else a
voix[: len(a)] += a
n = len(voix) // 480
e = np.convolve(np.sqrt(np.mean(voix[: n * 480].reshape(n, 480) ** 2, axis=1)), np.ones(15) / 15, mode="same")
sfx[: n * 480] *= np.repeat(1 - 0.45 * np.clip(e / 0.08, 0, 1), 480)

mix = (voix + sfx)[: int(DUREE * SR)]
mix /= max(1.0, np.abs(mix).max() / 0.9)
sf.write(sys.argv[1], np.stack([mix, mix], 1).astype(np.float32), SR)
print("ok", round(DUREE, 2), "s", "crête voix", round(np.abs(voix).max(), 2), "crête bruitages", round(np.abs(sfx).max(), 2))
