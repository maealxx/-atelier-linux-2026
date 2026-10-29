"""Sons du test de 10 s de « La classe » (voix guide + bruitages + petite musique)."""
import json, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly

SR = 48000
D = 11.0
rng = np.random.default_rng(3)
out = np.zeros(int(D * SR) + SR)
ts = lambda d: np.arange(int(d * SR)) / SR
bruit = lambda d: rng.standard_normal(int(d * SR))
filtre = lambda x, t, f: sosfilt(butter(2, f, btype=t, fs=SR, output="sos"), x)
def pose(s, t0, v):
    i = int(t0 * SR)
    if i >= len(out): return
    s = s[: len(out) - i]; out[i : i + len(s)] += s * v
def note(f0, d, dec=6):
    t = ts(d); return (np.sin(2 * np.pi * f0 * t) + 0.3 * np.sin(4 * np.pi * f0 * t)) * np.exp(-t * dec)
def whoosh(t0, v, d=0.35):
    pose(filtre(bruit(d), "bandpass", [400, 3500]) * np.sin(np.pi * ts(d) / d) ** 2, t0 - d / 2, v)
def pop(t0, v):
    d = 0.08; pose(np.sin(2 * np.pi * (500 + 2500 * ts(d)) * ts(d)) * np.exp(-ts(d) * 40), t0, v)
# musique : pizzicato léger 112 BPM (Do – La m – Fa – Sol)
B = 60 / 112
acc = [[262, 330, 392], [220, 262, 330], [175, 220, 262], [196, 247, 294]]
t, m = 0, 0
while t < D:
    a = acc[m % 4]
    for b in range(4):
        tb = t + b * B
        pose(note(a[b % 3] * 2, 0.3, 14), tb, 0.03)
        pose(note(a[0] / 2, 0.4, 8), tb, 0.05 if b % 2 == 0 else 0.02)
        pose(filtre(bruit(0.04), "highpass", 6000) * np.exp(-ts(0.04) * 80), tb + B / 2, 0.015)
    t += 4 * B; m += 1
# craie au tableau
for j in range(10):
    pose(filtre(bruit(0.1), "bandpass", [2000, 7000]) * np.exp(-ts(0.1) * 15), 0.05 + j * 0.14, 0.05)
for c in (56, 158, 218, 282):
    whoosh(c / 30, 0.06)
# cuisine : « pfffouah » vert, boing du recul, la plante qui fane
d = 0.8
pose(filtre(bruit(d), "lowpass", 600) * np.sin(np.pi * ts(d) / d) * (1 + 0.5 * np.sin(2 * np.pi * 20 * ts(d))), 2.85, 0.12)
d = 0.5
pose(np.sin(2 * np.pi * np.cumsum(300 + 400 * np.sin(2 * np.pi * 12 * ts(d)) * np.exp(-ts(d) * 4)) / SR) * np.exp(-ts(d) * 3), 3.95, 0.07)
d = 0.7
pose(np.sin(2 * np.pi * np.cumsum(900 - 600 * ts(d) / d) / SR) * np.exp(-ts(d) * 2), 4.2, 0.03)
# bactéries qui apparaissent
for j in range(14):
    pop(5.35 + j * 0.09, 0.04)
# la vague de salive
d = 1.3
pose(filtre(bruit(d), "bandpass", [200, 2500]) * np.sin(np.pi * ts(d) / d) ** 1.5, 7.9, 0.15)
for j in range(10):
    pose(np.sin(2 * np.pi * np.cumsum(500 + 1500 * ts(0.06) / 0.06) / SR) * np.exp(-ts(0.06) * 30), 8.0 + j * 0.1, 0.03)
# craie + ding
for j in range(6):
    pose(filtre(bruit(0.1), "bandpass", [2000, 7000]) * np.exp(-ts(0.1) * 15), 9.45 + j * 0.15, 0.05)
pose(note(1568, 0.6, 5) + note(2093, 0.6, 6), 10.3, 0.04)
# voix guide (canard sous la voix)
v, sr = sf.read("voix/classe/guide_test.wav")
v = resample_poly(v, SR, sr)
vv = np.zeros_like(out); vv[: len(v)] = v[: len(vv)]
vv = vv / np.abs(vv).max() * 0.6
n = len(vv) // 480
e = np.convolve(np.sqrt(np.mean(vv[: n * 480].reshape(n, 480) ** 2, axis=1)), np.ones(15) / 15, mode="same")
out[: n * 480] *= np.repeat(1 - 0.45 * np.clip(e / 0.08, 0, 1), 480)
mix = (out + vv)[: int(D * SR)]
mix /= np.abs(mix).max() / 0.9
sf.write(sys.argv[1], np.stack([mix, mix], 1).astype(np.float32), SR)
print("ok")
