"""Sons de « Rentrez chez vous », calés sur src/foret/timeline.json et plans.json (même minutage que RentrezChezVous.jsx).
Usage : python3 voix/foret/mixage.py <sortie.wav> [fin_en_s] [--voix]"""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, resample_poly, sosfilt

SR = 48000
ici = os.path.dirname(os.path.abspath(__file__))
src = f"{ici}/../../src/foret"
tl = json.load(open(f"{src}/timeline.json"))
plans = json.load(open(f"{src}/plans.json"))
FPS = tl["fps"]
start, t = {}, 0
for s in tl["scenes"]:
    start[s["nom"]] = t
    t += s["frames"]
args = [a for a in sys.argv[1:] if a and not a.startswith("--")]
DUREE = float(args[1]) if len(args) > 1 else t / FPS
rng = np.random.default_rng(11)
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


def img(nom, mot, defaut=0):
    s = next(s for s in tl["scenes"] if s["nom"] == nom)
    return start[nom] + s["reperes"].get(mot, defaut)


def bornes(nom):
    w = plans[nom]
    d = next(s["frames"] for s in tl["scenes"] if s["nom"] == nom)
    b = [0]
    for x in w:
        b.append(round(b[-1] + x / sum(w) * d))
    return [(start[nom] + k) / FPS for k in b]


deb = lambda nom: start[nom] / FPS
fin = lambda nom: (start[nom] + next(s["frames"] for s in tl["scenes"] if s["nom"] == nom)) / FPS
ok = lambda nom: deb(nom) < DUREE
tt_ = ts(DUREE)

# mêmes images que RentrezChezVous.jsx
T1 = 30
T2 = img("blague", "vibration", 77) + 12
T3 = img("branche", "message", 92) + 20
T4 = img("cachette", "vibre", 103) + 10
T5 = img("photo", "vibration", 15) + 8
T6 = img("lampe", "je", 41) - 6
CRAC = img("branche", "craque", 59) - 6


# ---------- sons de base ----------
def poum(t0, vol):
    d = 0.18
    pose(np.sin(2 * np.pi * (60 - 20 * ts(d) / d) * ts(d)) * np.exp(-ts(d) * 20), t0, vol)


def coeur(t0, t1, periode, vol):
    t = t0
    while t < min(t1, DUREE):
        poum(t, vol)
        poum(t + 0.16, vol * 0.6)
        t += periode


def vibre(t0, vol, d=0.75):
    """vibreur du téléphone tenu en main"""
    tt = ts(d)
    son = (np.sin(2 * np.pi * 165 * tt) + 0.35 * np.sign(np.sin(2 * np.pi * 82 * tt))) * (np.sin(2 * np.pi * 3.2 * tt) > -0.2)
    pose(filtre(son, "lowpass", 900) * env(len(tt), 0.01, 0.05), t0, vol)


def ding(t0, vol):
    for j, f0 in enumerate((1568, 2093)):
        d = 0.5
        tt = ts(d)
        pose(np.sin(2 * np.pi * f0 * tt) * np.exp(-tt * 7) * env(len(tt), 0.002, 0.05), t0 + j * 0.09, vol)


def pas_feuilles(t0, vol, lourd=1.0):
    """un pas sur les feuilles mortes (froissement + petits craquements)"""
    d = 0.22
    tt = ts(d)
    son = filtre(bruit(d), "bandpass", [600, 6000]) * np.exp(-tt * 14) * 0.8
    cr = np.zeros(len(tt))
    for _ in range(6):
        i = int(rng.uniform(0, 0.14) * SR)
        n = int(0.006 * SR)
        cr[i : i + n] += rng.standard_normal(n) * 1.5
    son += filtre(cr, "highpass", 1500)
    son += np.sin(2 * np.pi * 75 * tt) * np.exp(-tt * 30) * 0.7 * lourd
    pose(son, t0, vol)


def marche(t0, t1, periode, vol, lourd=1.0):
    t = t0
    while t < min(t1, DUREE):
        pas_feuilles(t, vol * rng.uniform(0.75, 1.1), lourd)
        t += periode * rng.uniform(0.95, 1.05)


def craque(t0, vol):
    """une branche qui casse"""
    d = 0.35
    tt = ts(d)
    son = filtre(bruit(d), "highpass", 1200) * np.exp(-tt * 35) * 1.4
    son += np.sin(2 * np.pi * 110 * tt) * np.exp(-tt * 25)
    for j in range(5):
        i = int((0.02 + j * 0.035 + rng.uniform(0, 0.02)) * SR)
        n = int(0.01 * SR)
        son[i : i + n] += rng.standard_normal(n) * (1.2 - j * 0.2)
    pose(son, t0, vol)


def souffle(t0, d, vol, bas=300, haut=2500):
    tt = ts(d)
    pose(filtre(bruit(d), "bandpass", [bas, haut]) * np.sin(np.pi * tt / d) ** 2, t0, vol)


def respiration(t0, t1, periode, vol, etouffe=False):
    t = t0
    while t < min(t1, DUREE):
        bas, haut = (150, 700) if etouffe else (400, 3000)
        souffle(t, periode * 0.42, vol, bas, haut)  # inspiration
        souffle(t + periode * 0.5, periode * 0.4, vol * 0.8, bas * 0.8, haut * 0.8)  # expiration
        t += periode


def drone(t0, d, vol, freqs=(55, 58.3, 82.4), a=0.6, r=1.5):
    if d <= 0:
        return
    tt = ts(d)
    son = sum(np.sin(2 * np.pi * f * tt + j) for j, f in enumerate(freqs)) / len(freqs)
    son *= 0.8 + 0.2 * np.sin(2 * np.pi * 0.3 * tt)
    pose(son * env(len(tt), a, r), t0, vol)


def coup(t0, vol, grave=60):
    """impact sourd + souffle (stinger)"""
    d = 1.6
    tt = ts(d)
    pose(np.sin(2 * np.pi * (grave + 40 * np.exp(-tt * 6)) * tt) * np.exp(-tt * 2.6) + filtre(bruit(d), "lowpass", 400) * np.exp(-tt * 4) * 0.5, t0, vol)
    pose(filtre(bruit(0.6), "highpass", 2000) * np.exp(-ts(0.6) * 7), t0, vol * 0.3)


def whoosh(t0, d, vol):
    tt = ts(d)
    fc = 400 + 2600 * np.sin(np.pi * tt / d)
    son = bruit(d)
    out = np.zeros_like(son)
    # balayage : deux bandes croisées
    out += filtre(son, "bandpass", [300, 1200]) * (1 - tt / d) + filtre(son, "bandpass", [1200, 5000]) * (tt / d)
    pose(out * np.sin(np.pi * tt / d) ** 2 * (fc / fc.max()), t0, vol)


def os_craquent(t0, d, vol):
    """articulations qui craquent (clics secs irréguliers)"""
    t = t0
    while t < t0 + d:
        n = int(0.012 * SR)
        c = rng.standard_normal(n) * np.exp(-np.arange(n) / (0.002 * SR))
        pose(filtre(c, "bandpass", [800, 5000]), t, vol * rng.uniform(0.5, 1))
        t += rng.uniform(0.03, 0.14)


def cri(t0, d, vol):
    """hurlement de la créature : dents de scie qui glissent + souffle rauque"""
    tt = ts(d)
    f = 520 + 380 * np.sin(np.pi * tt / d) + 30 * np.sin(2 * np.pi * 7 * tt)
    ph = 2 * np.pi * np.cumsum(f) / SR
    son = sum(np.sin(k * ph) / k for k in range(1, 9))
    son += 0.6 * sum(np.sin(k * ph * 1.49) / k for k in range(1, 6))
    son = np.tanh(son * 2.2) * 0.6 + filtre(bruit(d), "bandpass", [1500, 6000]) * 0.5
    pose(filtre(son, "bandpass", [250, 7000]) * env(len(tt), 0.04, d * 0.5), t0, vol)


def galop(t0, t1, periode, vol, monte=True):
    t = t0
    k = 0
    while t < min(t1, DUREE):
        u = (t - t0) / max(1e-6, t1 - t0)
        d = 0.14
        tt = ts(d)
        pose(np.sin(2 * np.pi * 55 * tt) * np.exp(-tt * 28) + filtre(bruit(d), "bandpass", [300, 3000]) * np.exp(-tt * 30) * 0.5, t, vol * ((0.4 + 0.6 * u) if monte else 1))
        t += periode * (0.55 if k % 2 else 0.45)
        k += 1


def raclement(t0, d, vol):
    """griffes qui raclent l'écorce : grain irrégulier, 4 traînées"""
    tt = ts(d)
    son = filtre(bruit(d), "bandpass", [1800, 7000]) * (0.4 + 0.6 * (rng.random(len(tt)) > 0.55))
    son *= 0.6 + 0.4 * np.sin(2 * np.pi * 23 * tt) ** 2
    son += filtre(bruit(d), "bandpass", [200, 900]) * 0.5 * (np.sin(2 * np.pi * 9 * tt) > 0.3)
    pose(son * env(len(tt), 0.05, 0.2), t0, vol)


def reniflement(t0, n, vol):
    t = t0
    for _ in range(n):
        for j in range(3):
            d = 0.09
            tt = ts(d)
            pose(filtre(bruit(d), "bandpass", [700, 3200]) * np.sin(np.pi * tt / d), t + j * 0.11, vol)
        t += 0.55 + rng.uniform(0, 0.25)


def clic(t0, vol):
    d = 0.04
    pose(filtre(bruit(d), "highpass", 2500) * np.exp(-ts(d) * 120) + np.sin(2 * np.pi * 1800 * ts(d)) * np.exp(-ts(d) * 150) * 0.5, t0, vol)


def oiseau(t0, vol):
    """petit gazouillis au crépuscule"""
    for j in range(rng.integers(2, 5)):
        d = 0.08
        tt = ts(d)
        f = 3200 + 1200 * np.sin(np.pi * tt / d) + rng.uniform(-300, 300)
        pose(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / d), t0 + j * 0.11, vol)


def chouette(t0, vol):
    for j, (d, f) in enumerate(((0.35, 390), (0.6, 370))):
        tt = ts(d)
        pose(np.sin(2 * np.pi * f * tt) * np.sin(np.pi * tt / d) ** 0.5 * (1 + 0.1 * np.sin(2 * np.pi * 6 * tt)), t0 + j * 0.55, vol)


def grillons(t0, t1, vol):
    d = min(t1, DUREE) - t0
    if d <= 0:
        return
    tt = ts(d)
    son = np.sin(2 * np.pi * 4600 * tt) * (np.sin(2 * np.pi * 28 * tt) > 0.2) * (np.sin(2 * np.pi * 0.9 * tt) > -0.1)
    son += 0.6 * np.sin(2 * np.pi * 5100 * tt) * (np.sin(2 * np.pi * 31 * tt + 1) > 0.3) * (np.sin(2 * np.pi * 0.7 * tt + 2) > 0)
    pose(son * env(len(tt), 1.5, 1.0), t0, vol)


# ---------- ambiance : le vent dans les arbres (toujours), oiseaux au crépuscule, grillons à la nuit ----------
vent = filtre(bruit(DUREE), "lowpass", 500) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.07 * tt_) + 0.15 * np.sin(2 * np.pi * 0.23 * tt_))
vent += filtre(bruit(DUREE), "bandpass", [1500, 5000]) * 0.15 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.11 * tt_ + 1))
k = np.full(len(sfx), 0.05)
sfx[: len(vent)] += vent * k[: len(vent)]
for t0 in (0.8, 2.6, 4.9, 7.8, 10.5, 13.4):
    if t0 < deb("branche"):
        oiseau(t0, 0.02)
grillons(deb("coincidence"), deb("branche") + 1.5, 0.0035)
grillons(deb("griffes") + 4.0, DUREE, 0.0025)
if ok("coincidence"):
    chouette(rep("coincidence", "rien") + 0.2, 0.02)

# ---------- 1-2. la marche, les vibrations ----------
marche(0.0, deb("doute"), 0.5, 0.05)
for t in (T1, T2, T3, T4, T5, T6):
    if t / FPS < DUREE:
        vibre(t / FPS, 0.12 if t not in (T4, T5, T6) else 0.07)
        ding(t / FPS + 0.04, 0.025 if t not in (T4, T5, T6) else 0.01)
# on touche la notification
pose(filtre(bruit(0.03), "highpass", 2000) * np.exp(-ts(0.03) * 80), (img("vibre", "rentrez", 179) - 22) / FPS, 0.05)

# ---------- 3-4. le doute, on repart ----------
if ok("doute"):
    drone(deb("doute"), fin("doute") - deb("doute") + 1, 0.05, (73.4, 77.8))
if ok("coincidence"):
    marche(rep("coincidence", "continues") - 0.3, fin("coincidence"), 0.5, 0.05)

# ---------- 5. la branche craque : tout se tait ----------
if ok("branche"):
    marche(deb("branche"), CRAC / FPS - 0.1, 0.5, 0.05)
    craque(CRAC / FPS, 0.5)
    craque(CRAC / FPS + 0.22, 0.15)
    a_, b_ = int((CRAC / FPS + 0.2) * SR), int(min(DUREE, fin("branche") + 0.5) * SR)
    sfx[a_:b_] *= 0.35
    coeur(CRAC / FPS + 0.6, fin("branche"), 0.75, 0.12)
    drone(CRAC / FPS, fin("branche") - CRAC / FPS + 0.4, 0.05, (49, 51.9))

# ---------- 6. tu te retournes : la silhouette ----------
if ok("retourne"):
    whoosh(deb("retourne") - 0.05, 0.75, 0.25)
    coup(rep("retourne", "silhouette") - 0.3, 0.35, 45)
    drone(rep("retourne", "silhouette") - 0.3, fin("retourne") - rep("retourne", "silhouette") + 0.3, 0.1, (41.2, 43.7, 61.7, 123.5))
    coeur(rep("retourne", "silhouette"), fin("retourne"), 0.62, 0.12)
    os_craquent(rep("retourne", "bras") - 0.1, 1.2, 0.06)
    os_craquent(rep("retourne", "penche") - 0.1, 1.0, 0.07)
    # souffle rauque de la créature
    for j in range(3):
        souffle(rep("retourne", "visage") + j * 1.4, 1.1, 0.03, 120, 600)

# ---------- 7. à quatre pattes… elle fonce ----------
if ok("charge"):
    os_craquent(rep("charge", "coup") - 0.1, 1.8, 0.09)
    drone(deb("charge"), fin("charge") - deb("charge"), 0.1, (41.2, 43.7, 61.7))
    cri(rep("charge", "fonce") - 0.6, 2.2, 0.25)
    galop(rep("charge", "fonce") - 0.7, fin("charge"), 0.26, 0.22)
    coeur(deb("charge"), fin("charge"), 0.42, 0.13)
    coup(fin("charge") - 0.2, 0.45, 50)

# ---------- 8. la course ----------
if ok("course"):
    b = bornes("course")
    marche(deb("course"), fin("course"), 0.28, 0.11, 1.4)
    respiration(deb("course"), fin("course"), 0.56, 0.05)
    coeur(deb("course"), fin("course"), 0.36, 0.13)
    tf = img("course", "fouettent", 40)
    for t0 in (tf - 12, tf - 2, tf + 6, tf + 15):
        whoosh(t0 / FPS, 0.3, 0.2)
        pose(filtre(bruit(0.15), "bandpass", [1000, 6000]) * np.exp(-ts(0.15) * 18), t0 / FPS + 0.12, 0.08)
    galop(b[1] - 0.6, fin("course") + 0.2, 0.24, 0.2, monte=True)
    cri(b[1] + 0.05, 1.0, 0.12)
    whoosh(b[1] - 0.05, 0.4, 0.18)

# ---------- 9. derrière le chêne : main sur la bouche ----------
if ok("cachette"):
    b = bornes("cachette")
    marche(deb("cachette"), b[1] - 0.4, 0.26, 0.11, 1.4)
    pose(filtre(bruit(0.7), "bandpass", [200, 3000]) * np.exp(-ts(0.7) * 5), b[1] - 0.35, 0.18)  # on plonge dans les feuilles
    pose(np.sin(2 * np.pi * 60 * ts(0.3)) * np.exp(-ts(0.3) * 15), b[1] - 0.3, 0.2)
    galop(deb("cachette"), b[1] + 0.8, 0.24, 0.14, monte=False)
    a_, b2 = int((b[1] + 0.2) * SR), int(min(DUREE, fin("griffes") + 1) * SR)
    sfx[a_:b2] *= 0.3  # silence pesant
    respiration(b[1], fin("cachette"), 0.9, 0.03, etouffe=True)
    coeur(b[1], fin("griffes"), 0.48, 0.14)
    drone(b[1], fin("griffes") - b[1], 0.06, (36.7, 38.9))

# ---------- 10. les griffes, le reniflement, puis plus rien ----------
if ok("griffes"):
    b = bornes("griffes")
    raclement(rep("griffes", "raclent") - 0.1, rep("griffes", "juste") - rep("griffes", "raclent") + 0.9, 0.12)
    os_craquent(rep("griffes", "griffes") - 0.2, 0.5, 0.05)
    reniflement(rep("griffes", "lentends") - 0.2, 3, 0.07)
    souffle(rep("griffes", "renifler") + 0.6, 1.3, 0.04, 100, 500)
    # « plus rien » : seul le vent revient, très bas
    a_, b2 = int(rep("griffes", "plus") * SR), int(min(DUREE, fin("griffes")) * SR)
    sfx[a_:b2] *= 0.25

# ---------- 11. la photo ----------
if ok("photo"):
    coeur(deb("photo"), fin("photo"), 0.55, 0.12)
    coup(rep("photo", "toi") - 0.05, 0.25, 55)
    drone(rep("photo", "toi"), fin("photo") - rep("photo", "toi") + 0.5, 0.08, (49, 51.9, 73.4))
    # déclic d'appareil photo, tout près, derrière toi
    clic(rep("photo", "dos") - 0.05, 0.05)
    clic(rep("photo", "dos") + 0.02, 0.035)

# ---------- 12. la lampe torche ----------
if ok("lampe"):
    coeur(deb("lampe"), fin("lampe"), 0.6, 0.11)
    drone(deb("lampe"), fin("lampe") - deb("lampe"), 0.07, (55, 58.3, 82.4))
    for mot, d in (("sallume", 132), ("séteint", 148), ("rallume", 175)):
        clic(rep("lampe", mot, d) / 1 - (2 / FPS if mot == "rallume" else 0), 0.02)

# ---------- 13. le dilemme ----------
if ok("dilemme"):
    coeur(deb("dilemme"), DUREE, 0.5, 0.12)
    drone(deb("dilemme"), DUREE - deb("dilemme"), 0.08, (41.2, 43.7, 61.7, 82.4))
    souffle(rep("dilemme", "chasse") - 0.4, 1.4, 0.03, 120, 600)

# ---------- voix ----------
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
