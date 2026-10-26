"""Sons de « Choisis une couleur » (roulette) : ambiance de casino, bille qui roule et rebondit, bips du chrono, résultat.
Calé sur src/roulette/tirages.json (mêmes règles que Roulette.jsx). Usage : python3 voix/roulette/mixage.py <sortie.wav>"""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

SR = 48000
FPS = 30
ici = os.path.dirname(os.path.abspath(__file__))
C = json.load(open(f"{ici}/../../src/roulette/tirages.json"))
CYCLE, TL, OUTRO, T = C["cycle"], C["arrivee"], C["outro"], C["tirages"]
N = len(T)
DUREE = (N * CYCLE + OUTRO) / FPS
ROUGES = {1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36}
rng = np.random.default_rng(7)
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


def clic(t0, vol, f=3000, d=0.03):
    pose(filtre(bruit(d), "bandpass", [f * 0.6, min(f * 1.6, 20000)]) * np.exp(-ts(d) * 120), t0, vol)


def jeton(t0, vol):
    for k in range(rng.integers(2, 5)):
        d = 0.08
        tt = ts(d)
        f0 = rng.uniform(3200, 5200)
        pose((np.sin(2 * np.pi * f0 * tt) + 0.5 * np.sin(2 * np.pi * f0 * 1.47 * tt)) * np.exp(-tt * 60), t0 + k * rng.uniform(0.03, 0.07), vol)


def note(f0, t0, d, vol, decay=4):
    tt = ts(d)
    pose((np.sin(2 * np.pi * f0 * tt) + 0.3 * np.sin(2 * np.pi * 2 * f0 * tt)) * np.exp(-tt * decay) * env(len(tt), 0.005, 0.05), t0, vol)


# ---------- ambiance de casino : brouhaha, jetons, machines à sous, petite musique lounge ----------
tt = ts(DUREE)
foule = filtre(bruit(DUREE), "bandpass", [250, 1800]) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.17 * tt) + 0.15 * np.sin(2 * np.pi * 0.43 * tt))
pose(foule * env(len(tt), 0.5, 1), 0, 0.03)
t = 0.4
while t < DUREE - 0.5:
    jeton(t, 0.03)
    t += rng.uniform(0.8, 2.2)
t = 1.5
while t < DUREE - 1:
    for k, f0 in enumerate([1046, 1318, 1568, 2093]):
        note(f0 * rng.choice([1, 0.75]), t + k * 0.07, 0.25, 0.008, 9)
    t += rng.uniform(3.5, 6)
beat = 60 / 100
accords = [[220, 277, 330], [196, 247, 294], [175, 220, 262], [196, 247, 311]]
t, k = 0, 0
while t < DUREE:
    for f0 in accords[k % 4]:
        note(f0, t, beat * 4, 0.012, 0.8)
    note(accords[k % 4][0] / 2, t, beat * 2, 0.03, 2)
    note(accords[k % 4][0] / 2, t + beat * 2, beat * 2, 0.025, 2)
    for b in range(8):
        clic(t + b * beat / 2, 0.012 if b % 2 else 0.02, 8000, 0.02)
    t += beat * 4
    k += 1

# ---------- chaque tirage ----------
for n in range(N):
    c0 = n * CYCLE / FPS
    tl = TL / FPS
    # lancer de la bille par le croupier
    if n > 0:
        d = 0.35
        pose(filtre(bruit(d), "bandpass", [800, 5000]) * np.sin(np.pi * ts(d) / d) ** 2, c0 - 0.05, 0.06)
        clic(c0, 0.12, 4000, 0.02)
    # la bille qui roule dans la piste (de plus en plus lente)
    d = tl * 0.66
    tt = ts(d)
    vit = 1 - tt / tl
    rate = 18 + 40 * vit
    mod = 0.55 + 0.45 * np.sin(2 * np.pi * np.cumsum(rate) / SR)
    roule = filtre(bruit(d), "bandpass", [1800, 6500]) * mod * (0.4 + 0.6 * vit)
    pose(roule * env(len(tt), 0.05, 0.15), c0, 0.06)
    pose(filtre(bruit(d), "lowpass", 300) * env(len(tt), 0.1, 0.2), c0, 0.04)
    # les rebonds sur les déflecteurs et les cases
    chocs = [0.66 + 0.2 * k / 3 for k in range(1, 4)] + [0.86 + 0.14 * k / 4 for k in range(1, 5)]
    for i, tau in enumerate(chocs):
        clic(c0 + tau * tl, 0.16 + 0.03 * i, rng.uniform(2200, 3800), 0.04)
        pose(filtre(bruit(0.05), "lowpass", 900) * np.exp(-ts(0.05) * 80), c0 + tau * tl, 0.08)
    clic(c0 + tl, 0.28, 2600, 0.05)
    # bips du chrono : 3, 2, 1
    for k, rest in enumerate([3, 2, 1]):
        tb = c0 + tl - rest
        if tb < 0:
            tb = 0.02
        note(1320 if rest == 1 else 880, tb, 0.14, 0.07, 18)
        if rest == 1:
            note(1320, tb + 0.16, 0.14, 0.06, 18)
    # résultat
    v = T[n]
    tr = c0 + tl + 0.08
    if v == 0:
        for k, f0 in enumerate([523, 659, 784, 1046, 1318]):
            note(f0, tr + k * 0.08, 0.7, 0.06, 3)
        d = 1.6
        pose(filtre(bruit(d), "bandpass", [400, 2500]) * np.sin(np.pi * ts(d) / d), tr + 0.1, 0.09)
    else:
        for k, f0 in enumerate([784, 1046, 1318] if v in ROUGES else [659, 880, 1174]):
            note(f0, tr + k * 0.07, 0.5, 0.05, 4)
        d = 1.0
        pose(filtre(bruit(d), "bandpass", [400, 2200]) * np.sin(np.pi * ts(d) / d), tr + 0.15, 0.04)
    jeton(tr + 0.6, 0.06)

# ---------- fin ----------
tf = N * CYCLE / FPS + 0.2
for f0 in [262, 330, 392, 523]:
    note(f0, tf, 2.0, 0.04, 1.2)

mix = sfx[: int(DUREE * SR)]
mix /= np.abs(mix).max() / 0.85
sf.write(sys.argv[1], np.stack([mix, mix], 1).astype(np.float32), SR)
print("ok", round(DUREE, 2), "s")
