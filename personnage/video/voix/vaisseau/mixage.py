"""Sons de « Le vaisseau », calés sur src/vaisseau/timeline.json et plans.json (même minutage que LeVaisseau.jsx).
Sans voix tant que la vraie voix n'est pas là (ajouter --voix pour mettre la voix calée par caler_voix.py).
Usage : python3 voix/vaisseau/mixage.py <sortie.wav> [fin_en_s] [--voix]"""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, resample_poly, sosfilt

SR = 48000
ici = os.path.dirname(os.path.abspath(__file__))
src = f"{ici}/../../src/vaisseau"
tl = json.load(open(f"{src}/timeline.json"))
plans = json.load(open(f"{src}/plans.json"))
FPS = tl["fps"]
start, t = {}, 0
for s in tl["scenes"]:
    start[s["nom"]] = t
    t += s["frames"]
args = [a for a in sys.argv[1:] if not a.startswith("--")]
DUREE = float(args[1]) if len(args) > 1 else t / FPS
rng = np.random.default_rng(5)
sfx = np.zeros(int(DUREE * SR) + SR)


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


def pose(son, t0, vol):
    i = int(max(0, t0) * SR)
    son = son[: max(0, len(sfx) - i)]
    sfx[i : i + len(son)] += son * vol


def rep(nom, mot, defaut=0):
    s = next(s for s in tl["scenes"] if s["nom"] == nom)
    return (start[nom] + s["reperes"].get(mot, defaut)) / FPS


def bornes(nom):
    w = plans[nom]
    d = next(s["frames"] for s in tl["scenes"] if s["nom"] == nom)
    b = [0]
    for x in w:
        b.append(round(b[-1] + x / sum(w) * d))
    return [(start[nom] + k) / FPS for k in b]


def metal(t0, vol, f0=None):
    """pas ou choc sur une plaque de métal"""
    d = 0.25
    f0 = f0 or rng.uniform(180, 260)
    tt = ts(d)
    son = (np.sin(2 * np.pi * f0 * tt) + 0.5 * np.sin(2 * np.pi * f0 * 2.71 * tt) + 0.3 * np.sin(2 * np.pi * f0 * 5.4 * tt)) * np.exp(-tt * 22)
    son += filtre(bruit(d), "bandpass", [1500, 6000]) * np.exp(-tt * 60) * 0.6
    pose(son, t0, vol)


def bip(t0, f0, d, vol):
    tt = ts(d)
    pose(np.sign(np.sin(2 * np.pi * f0 * tt)) * 0.4 * env(len(tt), 0.005, 0.03), t0, vol)


# ---------- le vaisseau : bourdonnement grave, ventilation, grincements de coque ----------
tt = ts(DUREE)
hum = np.sin(2 * np.pi * 43 * tt) + 0.5 * np.sin(2 * np.pi * 86.3 * tt) + 0.25 * np.sin(2 * np.pi * 129 * tt)
hum *= 0.8 + 0.2 * np.sin(2 * np.pi * 0.11 * tt)
pose(hum * env(len(tt), 1.5, 1), 0, 0.05)
pose(filtre(bruit(DUREE), "bandpass", [200, 900]) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.07 * tt)) * env(len(tt), 1, 1), 0, 0.035)
t = 3.0
while t < DUREE - 2:
    d = rng.uniform(0.8, 1.6)
    g = filtre(bruit(d), "bandpass", [90, 400]) * np.sin(np.pi * ts(d) / d) ** 2 * (1 + 0.5 * np.sin(2 * np.pi * rng.uniform(6, 11) * ts(d)))
    pose(g, t, 0.05)
    t += rng.uniform(4, 8)

# ---------- l'alarme : un bip à chaque passage du gyrophare (période 48 images) ----------
k = 0
while (k * 48 + 12) / FPS < DUREE:
    tb = (k * 48 + 12) / FPS
    if tb > 0.4:
        bip(tb, 740, 0.16, 0.03)
        bip(tb + 0.2, 554, 0.16, 0.025)
    k += 1

# ---------- swoosh grave à chaque coupe ----------
for nom in start:
    for c in bornes(nom)[:-1]:
        if 0.2 < c < DUREE:
            d = 0.5
            pose(filtre(bruit(d), "bandpass", [300, 2500]) * np.sin(np.pi * ts(d) / d) ** 2, c - 0.25, 0.025)

# ---------- 1. réveil : grande inspiration, cœur, verre ----------
t0 = rep("reveil", "réveilles")
d = 0.9
pose(filtre(bruit(d), "bandpass", [400, 3000]) * np.sin(np.pi * ts(d) / d) ** 1.5, t0 - 0.2, 0.08)


def poum(t0, vol):
    d = 0.18
    pose(np.sin(2 * np.pi * (60 - 20 * ts(d) / d) * ts(d)) * np.exp(-ts(d) * 20), t0, vol)


t = t0
while t < start["sortie"] / FPS:
    poum(t, 0.12)
    poum(t + 0.16, 0.07)
    t += 0.62

# ---------- 2. sortie : le couvercle (verrous, sifflement, servo), les pieds sur le caillebotis ----------
tp = rep("sortie", "pousses")
for j in range(3):
    metal(tp + j * 0.09, 0.08, 900 + j * 120)
ts_ = rep("sortie", "sifflement")
d = 1.6
pose(filtre(bruit(d), "highpass", 3000) * np.exp(-ts(d) * 1.8) * env(int(d * SR), 0.02, 0.2), ts_ - 0.15, 0.16)
d = 1.1
pose(np.sin(2 * np.pi * (220 + 120 * ts(d)) * ts(d)) * 0.4 * env(int(d * SR), 0.1, 0.2), ts_, 0.03)
b = bornes("sortie")
metal(b[1] + 0.45, 0.12)
metal(b[1] + 0.6, 0.1)
pose(filtre(bruit(0.7), "bandpass", [300, 1500]) * np.sin(np.pi * ts(0.7) / 0.7), rep("sortie", "glacé"), 0.03)

# ---------- 3. capsules : nappe de malaise, griffes sur verre sur « griffes » ----------
d = (start["hublot"] - start["capsules"]) / FPS
pose(sum(np.sin(2 * np.pi * f_ * ts(d)) for f_ in (110, 116.5, 164.8)) * env(int(d * SR), 1.5, 1.5) / 3, start["capsules"] / FPS, 0.03)
tg = rep("capsules", "griffes")
for j in range(3):
    d = 0.35
    f0 = 2600 + j * 300
    pose(np.sin(2 * np.pi * (f0 - 900 * ts(d) / d) * ts(d)) * np.sin(np.pi * ts(d) / d) * (1 + 0.6 * np.sin(2 * np.pi * 40 * ts(d))), tg + j * 0.15, 0.025)
pose(filtre(bruit(1.2), "lowpass", 160) * np.exp(-ts(1.2) * 2.5), rep("capsules", "sauf"), 0.12)

# ---------- 4. hublot : pas sur le métal, nappe éthérée sur la Terre ----------
b = bornes("hublot")
t = b[0] + 0.1
while t < b[1] - 0.2:
    metal(t, 0.07)
    t += 0.42
te = rep("hublot", "terre")
d = 4.0
pose(sum(np.sin(2 * np.pi * f_ * ts(d)) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.3 * ts(d) + f_)) for f_ in (440, 554, 659, 880)) * env(int(d * SR), 1.0, 1.5) / 4, te - 0.3, 0.025)

# ---------- voix (si elle existe) ----------
mix = sfx[: int(DUREE * SR)]
if "--voix" in sys.argv and os.path.exists(f"{ici}/voix_finale.wav"):
    a, sr = sf.read(f"{ici}/voix_finale.wav")
    a = resample_poly(a, SR, sr) if sr != SR else a
    v = np.zeros_like(mix)
    v[: min(len(a), len(v))] = a[: len(v)]
    n = len(v) // 480
    e = np.convolve(np.sqrt(np.mean(v[: n * 480].reshape(n, 480) ** 2, axis=1)), np.ones(15) / 15, mode="same")
    mix[: n * 480] *= np.repeat(1 - 0.45 * np.clip(e / 0.08, 0, 1), 480)
    mix = mix + v
mix /= max(1e-6, np.abs(mix).max() / 0.85)
sf.write(args[0], np.stack([mix, mix], 1).astype(np.float32), SR)
print("ok", round(DUREE, 2), "s")
