"""Bruitages de « Apocalypse zombie à l'hôpital ». Calés sur src/hopital/timeline.json.
Usage : python3 voix/hopital/mixage.py <sortie.wav> [--voix]"""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, resample_poly, sosfilt

SR = 48000
ici = os.path.dirname(os.path.abspath(__file__))
tl = json.load(open(f"{ici}/../../src/hopital/timeline.json"))
plans = json.load(open(f"{ici}/../../src/hopital/plans.json"))
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

# coupes
for s in tl["scenes"]:
    for c in bornes(s["nom"])[1:-1]:
        whoosh(c, 0.04)
# 1. bloc : bourdonnement, bip du moniteur, le réveil, la morsure, le cri, la ligne plate
b = bornes("bloc")
pose(filtre(bruit(b[-1]), "lowpass", 200) * 0.5 + np.sin(2 * np.pi * 50 * ts(b[-1])) * 0.2, 0, 0.12)
mord = rep("bloc", "mord")
t = 0.3
while t < mord + 0.9:
    bip_mon(t, 0.05); t += 0.8
grogne(rep("bloc", "réveille") - 0.3, 1.0, 0.08)
pose(filtre(bruit(0.4), "bandpass", [1500, 6000]) * np.exp(-ts(0.4) * 8), mord - 0.2, 0.12)
croque(mord, 0.35)
cri(mord + 0.1, 1.4, 0.25)
grogne(mord + 0.2, 1.6, 0.12, 70)
pose(np.sin(2 * np.pi * 1000 * ts(2.2)), mord + 1.0, 0.04)
for j in range(4): pose(filtre(bruit(0.06), "bandpass", [300, 1500]) * np.exp(-ts(0.06) * 50), mord + 0.8 + j * 0.05, 0.15)
# 2. chambre : calme, bip lent, respiration
b = bornes("chambre")
t = b[1]
while t < b[2]:
    bip_mon(t, 0.025, 880); t += 1.0
# 3. alarme : sirène, cœur qui accélère
b = bornes("alarme")
sirene(b[0], bornes("couloir")[-1], 0.03)
coeur(b[1], b[2], 0.55, 0.12)
coeur(b[2] - 0.1, bornes("couloir")[1], 0.4, 0.1)
for t0 in (rep("alarme", "code") - 0.05,):
    pose(note(880, 0.4, 3) + note(660, 0.4, 3), t0, 0.06)
# 4. couloir : grognements, pas traînants
b = bornes("couloir")
for j in range(6): grogne(b[1] + 0.3 + j * 0.55, 1.2, 0.06, 70 + 15 * j)
pas(b[1], b[2], 0.7, 0.03)
pose(filtre(bruit(0.6), "highpass", 3000) * np.sin(np.pi * ts(0.6) / 0.6), rep("couloir", "yeux") - 0.2, 0.04)
# 5. plan : pops
for j, m in enumerate(("deux", "chambres", "salle", "couloir")):
    pop(rep("plan", m) - 0.05, 0.06)
pose(note(220, 0.6, 3), rep("plan", "bloqué") - 0.05, 0.08)
# 6. infirmière : porte qui claque, verrou, chuchotement
b = bornes("infirmiere")
pas(b[0], b[0] + 0.8, 0.2, 0.06)
coup_porte(b[0] + 0.05, 0.2)
for j in range(3): pose(filtre(bruit(0.04), "bandpass", [2000, 6000]) * np.exp(-ts(0.04) * 80), rep("infirmiere", "verrouille") + j * 0.07, 0.12)
pose(filtre(bruit(1.2), "bandpass", [2000, 6000]) * np.sin(np.pi * ts(1.2) / 1.2) * (0.5 + 0.5 * np.sin(2 * np.pi * 4 * ts(1.2))), rep("infirmiere", "chuchote") - 0.1, 0.04)
coeur(b[0], bornes("porte")[-1], 0.5, 0.1)
# 7. porte : coups, poignée, grognements qui s'empilent
t = rep("porte", "porte") - 0.1
for j in range(14):
    coup_porte(t + j * 0.33 + rng.uniform(0, 0.08), 0.18 + 0.02 * j)
for j in range(8):
    pose(filtre(bruit(0.05), "bandpass", [1500, 5000]) * np.exp(-ts(0.05) * 60), rep("porte", "porte") + 0.2 + j * 0.15, 0.06)
for m, n in (("quelque", 1), ("dix", 4), ("vingt", 8)):
    for j in range(n): grogne(rep("porte", m) + j * 0.12, 1.2, 0.05, 60 + 10 * j)
# 8. fuite : course, souffle
b = bornes("fuite")
pas(b[0], b[-1], 0.2, 0.07)
pose(filtre(bruit(0.4), "lowpass", 800) * np.exp(-ts(0.4) * 10), rep("fuite", "sors") - 0.1, 0.1)
pose(note(1568, 0.3, 8), rep("fuite", "oui") - 0.05, 0.04)
for j in range(5): grogne(b[2] + j * 0.4, 1.0, 0.06, 80)
# 9. dilemme : ding de l'ascenseur, grognements derrière, bulle
pose(note(1318, 0.8, 3) + note(1046, 0.8, 3), rep("dilemme", "lascenseur") + 0.1, 0.05)
coup_porte(rep("dilemme", "lescalier") + 0.1, 0.1)
for j in range(4): grogne(bornes("dilemme")[0] + 1 + j * 0.9, 1.4, 0.05, 70)
coeur(bornes("dilemme")[0], D, 0.55, 0.08)
pop(rep("dilemme", "dis-le") - 0.07, 0.08)
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
