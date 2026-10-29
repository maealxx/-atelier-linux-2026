"""Bruitages de « Pourquoi ton pote rigole… » (pas de musique, demande de Maé). Calés sur src/rire/timeline.json.
Usage : python3 voix/rire/mixage.py <sortie.wav> [--voix]"""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, resample_poly, sosfilt

SR = 48000
ici = os.path.dirname(os.path.abspath(__file__))
tl = json.load(open(f"{ici}/../../src/rire/timeline.json"))
plans = json.load(open(f"{ici}/../../src/rire/plans.json"))
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

# coupes
for s in tl["scenes"]:
    for c in bornes(s["nom"])[:-1]:
        if c > 0.2: whoosh(c, 0.05)
# 1
pouffe(0.15, 0.06); pouffe(0.9, 0.05)
bip(rep("intro", "bip") - 0.05, 0.12)
craie(bornes("intro")[1], 6, 0.04)
pose(filtre(bruit(1.5), "lowpass", 400) * np.sin(np.pi * ts(1.5) / 1.5), rep("intro", "mère") - 0.3, 0.05)
# 2
b = bornes("annonce")
for j in range(6): pas_(b[0] + 0.1 + j * 0.27, 0.08)
pose(filtre(bruit(2.5), "bandpass", [1500, 5000]) * 0.4 * (rng.random(int(2.5 * SR)) > 0.97), b[1], 0.08)  # pluie légère du nuage
grillon(rep("annonce", "silence") + 0.1, 5, 0.03)
pose(np.zeros(1), 0, 0)
pouffe(rep("annonce", "pfff") - 0.05, 0.25)
for j in range(4): whoosh(rep("annonce", "pfff") + 0.15 + j * 0.05, 0.02, 0.2)
# 3
craie(rep("nerveux", "psychopathe") - 0.15, 4, 0.05)
craie(rep("nerveux", "rire") - 0.2, 7, 0.04)
pose(np.sin(2 * np.pi * np.cumsum(200 + 400 * ts(0.4) / 0.4) / SR) * np.sin(np.pi * ts(0.4) / 0.4), bornes("nerveux")[1], 0.05)
sirene(rep("nerveux", "gênante") - 1.0, rep("nerveux", "bouton") - rep("nerveux", "gênante") + 1.0, 0.03)
tt = ts(rep("nerveux", "bouton") - rep("nerveux", "tendue"))
pose(np.sin(2 * np.pi * np.cumsum(150 + 500 * (tt / tt[-1]) ** 2) / SR) * 0.4, rep("nerveux", "tendue"), 0.04)
for j in range(3): pop(bornes("nerveux")[3] + j * 0.13, 0.05)
pose(filtre(bruit(0.12), "lowpass", 800) * np.exp(-ts(0.12) * 20), rep("nerveux", "bouton") + 0.05, 0.25)
pose(note(1568, 0.5, 5) + note(2093, 0.5, 6), rep("nerveux", "bouton") + 0.07, 0.04)
# 4
vapeur(bornes("soupape")[0] + 0.15, 2.3, 0.08)
# 5
gloussement(bornes("monte")[0] + 0.5, 2.3, 0.025)
for j in range(9): pop(rep("monte", "donc") - 0.9 + j * 0.13, 0.04)
# 6
pose(note(1046, 0.3, 8), rep("regard", "croise") - 0.1, 0.03)
pose(note(1318, 0.3, 8), rep("regard", "regard"), 0.03)
pouffe(rep("regard", "fini") - 0.1, 0.2)
gloussement(rep("regard", "fini") + 0.1, 3.3, 0.06, 300)
gloussement(rep("regard", "fini") + 0.3, 3.1, 0.05, 380)
# 7
craie(bornes("enterrement")[0] + 0.1, 8, 0.04)
pose(np.sin(2 * np.pi * np.cumsum(500 - 250 * ts(0.6) / 0.6) / SR) * np.sin(np.pi * ts(0.6) / 0.6), rep("enterrement", "gérer") - 0.1, 0.04)
# 8
b = bornes("chute")
for j in range(6): pas_(b[0] + 0.3 + j * 0.25, 0.06)
pose(note(1318, 0.8, 3) + note(1760, 0.8, 4), rep("chute", "sexcuser") + 0.1, 0.03)
# 9
gloussement(bornes("commentaire")[0] + 0.1, 2.0, 0.04, 340)
cloche(rep("commentaire", "dis-le") - 0.1, 0.05)
pop(rep("commentaire", "dis-le") - 0.07, 0.08)

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
