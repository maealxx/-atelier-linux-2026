"""Bruitages de « Jour 467 ». Calés sur src/jour467/timeline.json.
Usage : python3 voix/jour467/mixage.py <sortie.wav> [--voix]"""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, resample_poly, sosfilt

SR = 48000
ici = os.path.dirname(os.path.abspath(__file__))
tl = json.load(open(f"{ici}/../../src/jour467/timeline.json"))
plans = json.load(open(f"{ici}/../../src/jour467/plans.json"))
start, t = {}, 0
for s in tl["scenes"]:
    start[s["nom"]] = t
    t += s["frames"]
D = t / 30
rng = np.random.default_rng(7)
out = np.zeros(int(D * SR) + SR)
ts = lambda d: np.arange(int(d * SR)) / SR
bruit = lambda d: rng.standard_normal(int(d * SR))
filtre = lambda x, ty, f: sosfilt(butter(2, f, btype=ty, fs=SR, output="sos"), x)
def pose(son, t0, v):
    i = int(max(0, t0) * SR)
    if i >= len(out): return
    son = son[: len(out) - i]; out[i : i + len(son)] += son * v
def rep(nom, mot, d=0):
    s = next(s for s in tl["scenes"] if s["nom"] == nom)
    return (start[nom] + s["reperes"].get(mot, d)) / 30
def bornes(nom):
    w = plans[nom]; d = next(s["frames"] for s in tl["scenes"] if s["nom"] == nom); b = [0]
    for x in w: b.append(round(b[-1] + x / sum(w) * d))
    return [(start[nom] + k) / 30 for k in b]
def note(f0, d, dec=6):
    tt = ts(d); return (np.sin(2 * np.pi * f0 * tt) + 0.3 * np.sin(4 * np.pi * f0 * tt)) * np.exp(-tt * dec)
def whoosh(t0, v, d=0.35):
    pose(filtre(bruit(d), "bandpass", [400, 3500]) * np.sin(np.pi * ts(d) / d) ** 2, t0 - d / 2, v)
def pop(t0, v):
    d = 0.08; pose(np.sin(2 * np.pi * (500 + 2500 * ts(d)) * ts(d)) * np.exp(-ts(d) * 40), t0, v)
def craie(t0, n, v):
    for j in range(n):
        pose(filtre(bruit(0.1), "bandpass", [2000, 7000]) * np.exp(-ts(0.1) * 15), t0 + j * 0.13, v)
def bip(t0, v):
    pose(np.sin(2 * np.pi * 1000 * ts(0.45)) * np.r_[np.linspace(0, 1, 200), np.ones(int(0.45 * SR) - 400), np.linspace(1, 0, 200)], t0, v)
def grillon(t0, n, v):
    for j in range(n):
        for q in range(3):
            pose(np.sin(2 * np.pi * 4300 * ts(0.03)) * np.sin(np.pi * ts(0.03) / 0.03), t0 + j * 0.34 + q * 0.045, v)
def pas_(t0, v):
    d = 0.1; pose(filtre(bruit(d), "bandpass", [200, 1500]) * np.exp(-ts(d) * 35) + np.sin(2 * np.pi * 90 * ts(d)) * np.exp(-ts(d) * 30) * 0.5, t0, v)
def pouffe(t0, v):
    d = 0.35; tt = ts(d)
    pose(filtre(bruit(d), "bandpass", [300, 3000]) * np.exp(-tt * 9) * (1 + np.sin(2 * np.pi * 30 * tt)), t0, v)
def gloussement(t0, d, v, f0=320):
    tt = ts(d)
    son = np.sin(2 * np.pi * (f0 + 60 * np.sin(2 * np.pi * 2 * tt)) * tt) * (np.sin(2 * np.pi * 7 * tt) > 0.2) + filtre(bruit(d), "bandpass", [600, 3000]) * 0.3
    pose(son * np.sin(np.pi * tt / d), t0, v)
def sirene(t0, d, v):
    tt = ts(d); pose(np.sin(2 * np.pi * np.cumsum(700 + 250 * np.sin(2 * np.pi * 1.6 * tt)) / SR) * 0.6, t0, v)
def vapeur(t0, d, v):
    tt = ts(d); pose(filtre(bruit(d), "highpass", 3000) * np.sin(np.pi * tt / d) ** 0.5 + np.sin(2 * np.pi * 2400 * tt) * 0.25 * np.sin(np.pi * tt / d), t0, v)
def cloche(t0, v):
    pose(note(880, 1.5, 2) + note(1320, 1.5, 3), t0, v)


def coeur(t0, t1, per, v):
    t = t0
    while t < t1:
        for dt, g in ((0, 1), (0.15, 0.6)):
            d = 0.16; pose(np.sin(2 * np.pi * (60 - 20 * ts(d) / d) * ts(d)) * np.exp(-ts(d) * 20), t + dt, v * g)
        t += per
def grogne(t0, d, v, f0=90):
    tt = ts(d)
    son = np.sin(2 * np.pi * np.cumsum(f0 + 25 * np.sin(2 * np.pi * 3 * tt) + 10 * rng.standard_normal(len(tt)).cumsum() / SR * 50) / SR)
    son = np.sign(son) * np.abs(son) ** 0.5 + filtre(bruit(d), "bandpass", [200, 900]) * 0.6
    pose(filtre(son, "lowpass", 1400) * np.sin(np.pi * tt / d), t0, v)
def coup_porte(t0, v):
    d = 0.3; pose(np.sin(2 * np.pi * (80 - 30 * ts(d)) * ts(d)) * np.exp(-ts(d) * 14) + filtre(bruit(d), "lowpass", 900) * np.exp(-ts(d) * 25), t0, v)
def cri(t0, d, v):
    tt = ts(d)
    f = 520 + 200 * np.sin(np.pi * tt / d)
    son = sum(np.sin(k * 2 * np.pi * np.cumsum(f) / SR) / k for k in range(1, 8))
    pose(filtre(son, "bandpass", [400, 2500]) * np.sin(np.pi * tt / d) + filtre(bruit(d), "bandpass", [1000, 4000]) * 0.3 * np.sin(np.pi * tt / d), t0, v)
def croque(t0, v):
    for j in range(5):
        pose(filtre(bruit(0.07), "bandpass", [300, 3000]) * np.exp(-ts(0.07) * 40), t0 + j * 0.06, v * (1 - j * 0.15))
    pose(filtre(bruit(0.5), "lowpass", 500) * np.exp(-ts(0.5) * 6), t0, v * 0.6)
def bip_mon(t0, v, f0=1000, d=0.12):
    pose(np.sin(2 * np.pi * f0 * ts(d)) * np.exp(-ts(d) * 6), t0, v)
def sirene(t0, t1, v):
    d = t1 - t0; tt = ts(d)
    pose(np.sign(np.sin(2 * np.pi * np.cumsum(700 + 300 * (np.sin(2 * np.pi * 0.8 * tt) > 0)) / SR)) * 0.4, t0, v)
def pas(t0, t1, per, v):
    t = t0
    while t < t1:
        d = 0.08; pose(filtre(bruit(d), "bandpass", [200, 2000]) * np.exp(-ts(d) * 40) + np.sin(2 * np.pi * 100 * ts(d)) * np.exp(-ts(d) * 30) * 0.5, t, v)
        t += per
def drone(t0, d, v, fs=(55, 58.3)):
    tt = ts(d); pose(sum(np.sin(2 * np.pi * f * tt) for f in fs) * np.minimum(1, np.minimum(tt / 0.5, (d - tt) / 1.0)), t0, v)

def oiseaux(t0, d, v):
    t = t0
    while t < t0 + d:
        f0 = rng.uniform(2500, 4200)
        tt = ts(0.12); pose(np.sin(2 * np.pi * (f0 + 900 * np.sin(2 * np.pi * 18 * tt)) * tt) * np.sin(np.pi * tt / 0.12), t, v)
        t += rng.uniform(0.3, 1.2)
def vent(t0, d, v):
    pose(filtre(bruit(d), "lowpass", 500) * np.minimum(1, np.minimum(ts(d) / 0.8, (d - ts(d)) / 0.8)), t0, v)
def grillons(t0, d, v):
    t = t0
    while t < t0 + d:
        for q in range(3):
            pose(np.sin(2 * np.pi * 4300 * ts(0.03)) * np.sin(np.pi * ts(0.03) / 0.03), t + q * 0.045, v)
        t += 0.4
def dring(t0, v):
    tt = ts(0.6); pose(np.sin(2 * np.pi * 1200 * tt) * (np.sin(2 * np.pi * 25 * tt) > 0) * np.exp(-tt * 3), t0, v)
def clavier(t0, d, v):
    t = t0
    while t < t0 + d:
        pose(filtre(bruit(0.03), "bandpass", [1500, 6000]) * np.exp(-ts(0.03) * 120), t, v * rng.uniform(0.6, 1))
        t += rng.uniform(0.06, 0.16)

# coupes
for s in tl["scenes"]:
    for c in bornes(s["nom"])[1:-1]:
        whoosh(c, 0.035)
# ambiance de jour (vent + oiseaux), de nuit (grillons)
for nom in ("ouverture", "carte", "groupe", "regle", "facteur", "joggeur", "bureau", "feu", "maman"):
    b = bornes(nom); vent(b[0], b[-1] - b[0] + 0.5, 0.05); oiseaux(b[0], b[-1] - b[0], 0.015)
for nom in ("fete", "twist", "choix"):
    b = bornes(nom); grillons(b[0], b[-1] - b[0], 0.02); vent(b[0], b[-1] - b[0] + 0.5, 0.04)
for nom in ("eau", "caissiere", "leo", "changement", "dessin"):
    b = bornes(nom); vent(b[0], b[-1] - b[0] + 0.5, 0.04); oiseaux(b[0], b[-1] - b[0], 0.01)
# 1. ouverture : le compteur, l'horloge
for j in range(12): pop(rep("ouverture", "467") - 0.4 + j * 0.035, 0.03)
pose(note(220, 1.2, 2) + note(330, 1.2, 2.5), rep("ouverture", "fermée") - 0.05, 0.05)
for j in range(8): whoosh(bornes("ouverture")[3] + j * 0.2, 0.02, 0.15)
cloche(rep("ouverture", "sept") - 0.05, 0.08)
grogne(rep("ouverture", "zombie") - 0.1, 1.0, 0.04, 80)
# 2-3. le toit, les cartes
for m, sc in (("19", "carte"), ("karim", "groupe"), ("inès", "groupe"), ("léo", "groupe"), ("toi", "groupe")):
    whoosh(rep(sc, m) - 0.1, 0.06, 0.3)
# 4. règle : crayon, polaroid
craie(bornes("regle")[0] + 0.2, 8, 0.03)
pop(rep("regle", "avant") - 0.1, 0.06)
# 5. facteur : pas, feuille, sonnette
pas(bornes("facteur")[0], bornes("facteur")[1], 0.55, 0.04)
pose(filtre(bruit(0.4), "bandpass", [1500, 6000]) * np.exp(-ts(0.4) * 8), rep("facteur", "feuilles") + 0.1, 0.06)
dring(rep("facteur", "sonne") - 0.05, 0.06)
# 6. joggeur : pas rapides, souffle
pas(bornes("joggeur")[0], bornes("joggeur")[-1], 0.22, 0.04)
# 7. bureau : clavier
clavier(rep("bureau", "assis"), bornes("bureau")[-1] - rep("bureau", "assis"), 0.05)
pop(rep("bureau", "branchés") - 0.05, 0.06)
# 8. feu : grince, klaxon lointain
pose(note(440, 0.6, 2) * 0.5, rep("feu", "vert") + 0.2, 0.03)
# 9. maman : grincement de poussette
b = bornes("maman")
t = b[0]
while t < b[-1]:
    pose(np.sin(2 * np.pi * np.linspace(1800, 2200, int(0.12 * SR)) * ts(0.12)) * np.sin(np.pi * ts(0.12) / 0.12), t, 0.012); t += 0.9
# 10. fête : silence lourd, foule qui se balance
drone(bornes("fete")[1], bornes("fete")[-1] - bornes("fete")[1], 0.05)
pose(filtre(bruit(0.5), "lowpass", 300) * np.exp(-ts(0.5) * 3), rep("fete", "musique") - 0.05, 0.08)
for j in range(6): grogne(bornes("fete")[1] + j * 0.6, 1.4, 0.03, 60)
# 11-12. eau, supermarché, caissière
for j in range(3): pose(note(1400, 0.3, 10), rep("eau", "deau") + j * 0.5, 0.03)
pas(rep("eau", "descendez"), bornes("eau")[-1], 0.6, 0.04)
coeur(rep("eau", "passez"), bornes("caissiere")[-1], 0.55, 0.08)
grogne(rep("caissiere", "fixe") - 0.2, 1.2, 0.05, 90)
cloche(rep("caissiere", "pièce") - 0.02, 0.07)
# 13-15. Léo, les papiers, le dessin
pose(note(523, 0.8, 3) + note(659, 0.8, 3), rep("leo", "noms") - 0.1, 0.04)
pose(note(220, 1.4, 1.5), rep("leo", "truc") - 0.05, 0.06)
pose(filtre(bruit(0.3), "bandpass", [2000, 7000]) * np.exp(-ts(0.3) * 10), rep("changement", "papiers") - 0.1, 0.05)
craie(rep("dessin", "supermarché") - 0.4, 6, 0.04)
for j in range(4): craie(rep("dessin", "quatre") - 0.2 + j * 0.2, 2, 0.04)
coeur(rep("dessin", "bonhommes"), bornes("choix")[-1], 0.6, 0.08)
# 16. twist : les têtes qui se tournent, la main levée
drone(bornes("twist")[0], bornes("choix")[-1] - bornes("twist")[0], 0.06, (49, 52))
pose(filtre(bruit(0.8), "bandpass", [300, 2000]) * np.sin(np.pi * ts(0.8) / 0.8), rep("twist", "tournés") - 0.3, 0.12)
pose(filtre(bruit(0.6), "highpass", 3000) * np.sin(np.pi * ts(0.6) / 0.6), rep("twist", "tournés"), 0.06)
pose(note(73, 2.5, 1.0), rep("twist", "lève") - 0.05, 0.1)
# 17. choix
pop(rep("choix", "réponds") - 0.05, 0.06)
pop(rep("choix", "partez") - 0.05, 0.06)
pop(rep("choix", "dis-le") - 0.07, 0.08)
mix = out[: int(D * SR)]
if "--voix" in sys.argv and os.path.exists(f"{ici}/voix_finale.wav"):
    a, sr = sf.read(f"{ici}/voix_finale.wav"); a = resample_poly(a, SR, sr) if sr != SR else a
    v = np.zeros_like(mix); v[: min(len(a), len(v))] = a[: len(v)]
    n = len(v) // 480
    e = np.convolve(np.sqrt(np.mean(v[: n * 480].reshape(n, 480) ** 2, axis=1)), np.ones(15) / 15, mode="same")
    mix[: n * 480] *= np.repeat(1 - 0.45 * np.clip(e / 0.08, 0, 1), 480)
    mix = mix + v
mix /= max(1e-6, np.abs(mix).max() / 0.85)
sf.write(sys.argv[1], np.stack([mix, mix], 1).astype(np.float32), SR)
print("ok", round(D, 2))
