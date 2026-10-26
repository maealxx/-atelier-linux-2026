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

def scene_ok(nom):
    return start[nom] / FPS < DUREE


def impact(t0, vol):
    """coup de screamer : choc grave + bruit blanc + cri métallique strident"""
    d = 1.2
    tt = ts(d)
    pose(np.sin(2 * np.pi * (70 - 40 * tt) * tt) * np.exp(-tt * 3) + filtre(bruit(d), "lowpass", 300) * np.exp(-tt * 5), t0, vol)
    pose(filtre(bruit(0.5), "highpass", 1500) * np.exp(-ts(0.5) * 6), t0, vol * 0.6)
    d = 0.9
    tt = ts(d)
    cri = sum(np.sin(2 * np.pi * (f0 + 300 * np.sin(2 * np.pi * 7 * tt)) * tt) for f0 in (1800, 2350, 3100)) / 3
    pose(cri * np.exp(-tt * 3) * env(len(tt), 0.01, 0.2), t0 + 0.02, vol * 0.45)


def souffle_alien(t0, vol, d=1.4):
    tt = ts(d)
    pose(filtre(bruit(d), "bandpass", [120, 900]) * np.sin(np.pi * tt / d) ** 2 * (1 + 0.4 * np.sin(2 * np.pi * 23 * tt)), t0, vol)


# ---------- 5. conduit : quelque chose rampe au plafond (coups sourds qui avancent), puis s'arrête ----------
if scene_ok("conduit"):
    t0, t1 = (start["conduit"] + 20) / FPS, rep("conduit", "sarrête")
    t = t0
    while t < t1:
        k = (t - t0) / max(0.1, t1 - t0)
        metal(t, 0.05 + 0.08 * k, rng.uniform(90, 140))
        t += rng.uniform(0.18, 0.32)
    pose(filtre(bruit(0.5), "bandpass", [2000, 6000]) * np.exp(-ts(0.5) * 8), t1, 0.03)
    d = (start["grille"] - start["conduit"]) / FPS
    pose(np.sin(2 * np.pi * 55 * ts(d)) * np.linspace(0, 1, int(d * SR)), start["conduit"] / FPS, 0.06)

# ---------- 6. grille : silence, petit grincement, les yeux… SCREAMER ----------
if scene_ok("grille"):
    tg = (start["grille"] + round(plans["grille"][0] / sum(plans["grille"]) * next(s["frames"] for s in tl["scenes"] if s["nom"] == "grille"))) / FPS
    d = 0.6
    pose(np.sin(2 * np.pi * (300 + 80 * ts(d)) * ts(d)) * np.sin(np.pi * ts(d) / d) * 0.3, rep("grille", "deux") - 0.2, 0.03)
    impact(tg, 0.6)
    metal(tg + 0.05, 0.25, 600)
    metal(tg + 0.4, 0.2, 500)

# ---------- 7. fuite : course, portes qui claquent, griffes qui approchent, cœur qui s'emballe ----------
if scene_ok("fuite"):
    D = next(s["frames"] for s in tl["scenes"] if s["nom"] == "fuite")
    t0, t1 = start["fuite"] / FPS, (start["fuite"] + D) / FPS
    t = t0
    while t < t1:
        metal(t, 0.09)
        t += 0.2
    for z in [8, 16, 24]:
        # pz = 2 + 28 f / D, la porte se ferme quand pz − z ≈ 1,2
        fz = (z + 1.2 - 2) / 28 * D
        tc = t0 + fz / FPS
        if tc < t1:
            pose(filtre(bruit(0.4), "bandpass", [500, 4000]) * np.exp(-ts(0.4) * 6), tc - 0.15, 0.08)
            metal(tc + 0.2, 0.3, 120)
    t = rep("fuite", "griffes") - 0.4
    while t < t1:
        k = (t - t0) / (t1 - t0)
        d = 0.12
        pose(np.sin(2 * np.pi * (3000 - 1200 * ts(d) / d) * ts(d)) * np.exp(-ts(d) * 12), t, 0.02 + 0.05 * k)
        t += rng.uniform(0.1, 0.18)
    t = t0
    while t < t1:
        poum(t, 0.14)
        poum(t + 0.12, 0.08)
        t += 0.38

# ---------- 8-10. salle des écrans : porte, bips d'ordinateurs, grésillement de l'écran, drone ----------
if scene_ok("ecrans"):
    te = start["ecrans"] / FPS
    pose(filtre(bruit(0.6), "bandpass", [300, 3000]) * np.exp(-ts(0.6) * 4), te, 0.08)
    fin = min(DUREE, start["alien"] / FPS)
    t = te + 0.5
    while t < fin:
        bip(t, rng.choice([1200, 1600, 2000]), 0.05, 0.008)
        t += rng.uniform(0.3, 0.9)
    d = fin - te
    pose(filtre(bruit(d), "bandpass", [2000, 7000]) * 0.3 * env(int(d * SR), 0.5, 0.5), te, 0.03)
    td = rep("double", "visage")
    pose(sum(np.sin(2 * np.pi * f_ * ts(3.0)) for f_ in (98, 103.8)) * env(int(3.0 * SR), 0.05, 1.5) / 2, td - 0.1, 0.12)
    if scene_ok("question"):
        t = start["question"] / FPS
        while t < start["alien"] / FPS:
            poum(t, 0.1)
            t += 0.75

# ---------- 11. alien : souffle, SCREAMER, grondement, respiration lente ----------
if scene_ok("alien"):
    souffle_alien(rep("alien", "souffle") - 0.3, 0.12)
    impact(rep("alien", "retournes") + 0.1, 0.65)
    d = 3.0
    pose(filtre(bruit(d), "lowpass", 120) * env(int(d * SR), 0.1, 1.5), rep("alien", "trois"), 0.15)
    t = rep("alien", "et")
    while t < min(DUREE, (start["alarme"] + 10) / FPS):
        souffle_alien(t, 0.08, 1.6)
        t += 2.2

# ---------- 12-13. alarme (deux tons), sas qui s'ouvre, respiration jusqu'à la fin ----------
if scene_ok("alarme"):
    t = start["alarme"] / FPS
    while t < DUREE:
        bip(t, 880, 0.35, 0.05)
        bip(t + 0.4, 660, 0.35, 0.045)
        t += 0.9
    pose(filtre(bruit(1.5), "highpass", 2500) * np.exp(-ts(1.5) * 2), rep("alarme", "capsule") - 0.2, 0.1)
    t = start["dilemme"] / FPS
    while t < DUREE:
        souffle_alien(t, 0.07, 1.8)
        t += 2.4

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
