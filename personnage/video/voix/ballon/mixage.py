"""Musique + bruitages de « Le Ballon d'Or » (sans voix), calés sur src/ballon/timeline.json et plans.json.
Usage : python3 voix/ballon/mixage.py <sortie.wav>"""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

SR = 48000
ici = os.path.dirname(os.path.abspath(__file__))
src = f"{ici}/../../src/ballon"
tl = json.load(open(f"{src}/timeline.json"))
plans = json.load(open(f"{src}/plans.json"))
FPS = tl["fps"]
debut, t = {}, 0.0
for s in tl["scenes"]:
    debut[s["nom"]] = t
    t += s["frames"] / FPS
DUREE = t
duree = {s["nom"]: s["frames"] / FPS for s in tl["scenes"]}
rng = np.random.default_rng(5)
mus = np.zeros(int(DUREE * SR) + SR)
sfx = np.zeros_like(mus)


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
    p = sfx if piste is None else piste
    i = int(max(0, t0) * SR)
    son = son[: max(0, len(p) - i)]
    p[i : i + len(son)] += son * vol


def bornes(nom):
    w = plans[nom]
    b, out = 0.0, [debut[nom]]
    for x in w:
        b += x / sum(w) * duree[nom] * FPS
        out.append(debut[nom] + round(b) / FPS)
    return out


def note(f0, t0, d, vol, decay=5, piste=None, harm=0.3):
    tt = ts(d)
    pose((np.sin(2 * np.pi * f0 * tt) + harm * np.sin(2 * np.pi * 2 * f0 * tt)) * np.exp(-tt * decay) * env(len(tt), 0.004, 0.04), t0, vol, piste)


def clic(t0, vol, f=3000, d=0.03):
    pose(filtre(bruit(d), "bandpass", [f * 0.6, min(f * 1.6, 20000)]) * np.exp(-ts(d) * 120), t0, vol)


def foule(t0, d, vol, f=(250, 1800), a=0.5, r=0.8):
    tt = ts(d)
    x = filtre(bruit(d), "bandpass", list(f)) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.4 * tt))
    pose(x * env(len(tt), a, r), t0, vol)


def boom(t0, vol):
    d = 1.6
    pose(np.sin(2 * np.pi * (60 - 20 * ts(d)) * ts(d)) * np.exp(-ts(d) * 3) + filtre(bruit(d), "lowpass", 150) * np.exp(-ts(d) * 4), t0, vol)


# ---------- la musique : petite boucle légère et rigolote (112 bpm), coupée pendant le « silence total » ----------
BPM = 112
b = 60 / BPM
grilles = [[262, 330, 392], [220, 262, 330], [175, 220, 262], [196, 247, 294]]
melodie = [784, 659, 784, 880, 784, 659, 587, 523, 587, 659, 587, 523, 440, 523, 587, 659]
silence = (debut["salle"], debut["joueurs"] + 0.6)
t, k = 0.0, 0
while t < DUREE:
    if not (silence[0] - 0.05 < t < silence[1]):
        acc = grilles[(k // 4) % 4]
        if k % 4 == 0:
            for f0 in acc:
                note(f0, t, b * 4, 0.018, 0.9, mus)
        note(acc[0] / 2, t, b * 0.9, 0.07, 6, mus, 0.6)  # basse
        note(melodie[k % 16] * (1 if k % 32 < 16 else 1.122), t + b * 0.5, b * 0.45, 0.03, 14, mus, 0.5)  # pizzicato
        if k % 2 == 0:
            pose(np.sin(2 * np.pi * (110 - 60 * ts(0.15)) * ts(0.15)) * np.exp(-ts(0.15) * 25), t, 0.12, mus)  # grosse caisse
        else:
            pose(filtre(bruit(0.12), "bandpass", [1500, 5000]) * np.exp(-ts(0.12) * 30), t, 0.04, mus)  # caisse claire
        pose(filtre(bruit(0.03), "highpass", 7000) * np.exp(-ts(0.03) * 150), t + b / 2, 0.025, mus)  # charleston
    t += b
    k += 1
# la musique est plus forte au stade
niveau = np.interp(np.arange(len(mus)) / SR, [0, debut["match"], debut["match"] + 1, DUREE], [1, 1, 1.35, 1.35])
mus *= niveau

# ---------- 1. la télé : jingle « flash info » ----------
for k, f0 in enumerate([523, 659, 784, 1046]):
    note(f0, debut["tv"] + 0.2 + k * 0.12, 0.5, 0.05, 4)
d = duree["tv"]
pose(filtre(bruit(d), "bandpass", [300, 2500]) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 3.7 * ts(d)))) * env(int(d * SR), 0.1, 0.3), debut["tv"], 0.012)
note(196, debut["tv"] + duree["tv"] * 0.42, 0.8, 0.08, 3)  # le « choc »

# ---------- 2. le téléphone explose : vibreur continu + une notif toutes les 11 images ----------
d = duree["tel"]
pose(np.sign(np.sin(2 * np.pi * 160 * ts(d))) * (np.sin(2 * np.pi * 1.4 * ts(d)) > -0.2) * env(int(d * SR), 0.02, 0.2), debut["tel"], 0.02)
for k in range(6):
    t0 = debut["tel"] + (8 + k * 11) / FPS
    for j, f0 in enumerate((1568, 2093)):
        note(f0, t0 + j * 0.07, 0.25, 0.03, 12)

# ---------- 3. la cérémonie : brouhaha, flashs des photographes ----------
foule(debut["arrivee"], duree["arrivee"] + duree["enveloppe"] * 0.5, 0.03)
for k in range(10):
    t0 = debut["arrivee"] + rng.uniform(0.2, duree["arrivee"] - 0.3)
    clic(t0, 0.06, 4500, 0.02)
    pose(filtre(bruit(0.25), "highpass", 2500) * np.exp(-ts(0.25) * 18), t0 + 0.01, 0.025)

# ---------- 4. l'enveloppe : roulement de tambour, puis coup sur TON nom ----------
bn = bornes("enveloppe")
t0, t1 = bn[1], bn[2]
t = t0
while t < t1:
    pose(filtre(bruit(0.05), "bandpass", [200, 2500]) * np.exp(-ts(0.05) * 40), t, 0.05 + 0.08 * (t - t0) / (t1 - t0))
    t += 0.045
boom(t1, 0.35)
pose(filtre(bruit(0.6), "bandpass", [3000, 9000]) * np.exp(-ts(0.6) * 5), t1, 0.08)  # cymbale
foule(t1 + 0.1, 1.2, 0.05, (300, 1500), 0.05, 0.9)  # « ohhh »

# ---------- 5. silence total : juste des grillons (gag) et un cœur qui bat ----------
d = silence[1] - silence[0]
tt = ts(d)
pose(np.sin(2 * np.pi * 4300 * tt) * (np.sin(2 * np.pi * 32 * tt) > 0.6) * (np.sin(2 * np.pi * 1.1 * tt) > 0) * env(len(tt), 0.3, 0.3), silence[0] + 0.3, 0.012)
t = silence[0] + 0.2
while t < silence[1]:
    for dt in (0, 0.18):
        pose(np.sin(2 * np.pi * 55 * ts(0.15)) * np.exp(-ts(0.15) * 22), t + dt, 0.18)
    t += 0.75

# ---------- 6. les joueurs : murmures ----------
foule(debut["joueurs"] + 0.5, duree["joueurs"] - 0.5, 0.025, (200, 900))

# ---------- 7. la marche ratée : pas, chute, « ooh » ----------
bm = bornes("marche")
for k in range(int((bm[1] + 22 / FPS - debut["marche"]) / 0.35)):
    pose(filtre(bruit(0.08), "lowpass", 600) * np.exp(-ts(0.08) * 45), debut["marche"] + 0.15 + k * 0.35, 0.08)
tch = bm[1] + 22 / FPS
pose(np.sin(2 * np.pi * np.cumsum(np.linspace(900, 200, int(0.5 * SR))) / SR) * env(int(0.5 * SR), 0.01, 0.1), tch - 0.05, 0.035)  # glissade
boom(tch + 0.3, 0.32)
clic(tch + 0.3, 0.15, 900, 0.06)
foule(tch + 0.35, 1.5, 0.07, (300, 1400), 0.05, 1.0)

# ---------- 8. le trophée : étincelles, puis « wah wah » de trompette (trop lourd) ----------
for k in range(6):
    note(2093 * (1 + 0.12 * k), debut["trophee"] + 0.1 + k * 0.06, 0.4, 0.02, 8)
for k, f0 in enumerate([392, 370, 349, 311]):
    tt = ts(0.45 if k < 3 else 0.9)
    saw = 2 * ((tt * f0 * (1 + 0.01 * np.sin(2 * np.pi * 6 * tt))) % 1) - 1
    pose(filtre(saw, "lowpass", 1400) * env(len(tt), 0.02, 0.1), debut["trophee"] + 0.85 + k * 0.42, 0.035)

# ---------- 9. le discours : larsen du micro, puis UN seul applaudissement ----------
tt = ts(0.7)
pose(np.sin(2 * np.pi * 2600 * tt) * env(len(tt), 0.2, 0.2), debut["discours"] + 0.05, 0.015)
foule(debut["discours"], duree["discours"], 0.01, (300, 1200))
for k in range(4):
    pose(filtre(bruit(0.05), "bandpass", [800, 4000]) * np.exp(-ts(0.05) * 60), debut["discours"] + duree["discours"] - 1.6 + k * 0.6, 0.14)

# ---------- 10. le contrat : vibreur + notification, puis la joie ----------
pose(np.sign(np.sin(2 * np.pi * 160 * ts(0.35))) * env(int(0.35 * SR), 0.01, 0.05), debut["contrat"] + 0.2, 0.025)
note(1568, debut["contrat"] + 0.2, 0.3, 0.035, 10)
note(2093, debut["contrat"] + 0.29, 0.3, 0.035, 10)
pose(np.sin(2 * np.pi * (500 + 4000 * ts(0.08)) * ts(0.08)) * np.exp(-ts(0.08) * 50), debut["contrat"] + 40 / FPS, 0.06)
for k, f0 in enumerate([523, 659, 784, 1046, 1318]):
    note(f0, bornes("contrat")[2] + k * 0.08, 0.5, 0.04, 4)

# ---------- 11. le match : stade, sifflet, huées ----------
foule(debut["match"], duree["match"] + duree["fin"], 0.05, (200, 2000), 0.6, 1.5)
bmt = bornes("match")
tmain = bmt[2] + 8 / FPS
pose(filtre(bruit(0.1), "lowpass", 500) * np.exp(-ts(0.1) * 30), bmt[1] + 0.3, 0.1)  # passe
clic(tmain, 0.1, 1200, 0.05)
tt = ts(1.1)
pose(np.sin(2 * np.pi * (3200 * tt + 30 * np.sin(2 * np.pi * 35 * tt))) * env(len(tt), 0.01, 0.15), tmain + 0.25, 0.05)  # coup de sifflet
foule(tmain + 0.4, 2.5, 0.09, (150, 800), 0.1, 1.2)  # huées

# ---------- 12. la fin : le stade chante, pop des étiquettes ----------
for k, t0 in enumerate([20 / FPS, 45 / FPS]):
    pose(np.sin(2 * np.pi * (300 + 900 * ts(0.12)) * ts(0.12)) * np.exp(-ts(0.12) * 30), debut["fin"] + t0, 0.06)
for k, f0 in enumerate([523, 659, 784, 1046]):
    note(f0, debut["fin"] + duree["fin"] - 2.2 + k * 0.1, 1.5, 0.03, 2)

# ---------- swoosh à chaque scène ----------
for nom in debut:
    if debut[nom] > 0:
        d = 0.3
        pose(filtre(bruit(d), "bandpass", [700, 5000]) * np.sin(np.pi * ts(d) / d) ** 2, debut[nom] - 0.15, 0.03)

mix = (0.55 * mus + sfx)[: int(DUREE * SR)]
mix /= np.abs(mix).max() / 0.9
sf.write(sys.argv[1], np.stack([mix, mix], 1).astype(np.float32), SR)
print("ok", round(DUREE, 2), "s")
