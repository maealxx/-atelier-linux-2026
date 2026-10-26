"""Sons de « La tente », calés sur src/tente/timeline.json et plans.json (même minutage que LaTente.jsx).
Sans voix tant que la vraie voix n'est pas là (ajouter --voix pour mettre la voix calée par caler_voix.py).
Usage : python3 voix/tente/mixage.py <sortie.wav> [fin_en_s] [--voix]"""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, resample_poly, sosfilt

SR = 48000
ici = os.path.dirname(os.path.abspath(__file__))
src = f"{ici}/../../src/tente"
tl = json.load(open(f"{src}/timeline.json"))
plans = json.load(open(f"{src}/plans.json"))
FPS = tl["fps"]
start, t = {}, 0
for s in tl["scenes"]:
    start[s["nom"]] = t
    t += s["frames"]
args = [a for a in sys.argv[1:] if a and not a.startswith("--")]
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



def poum(t0, vol):
    d = 0.18
    pose(np.sin(2 * np.pi * (60 - 20 * ts(d) / d) * ts(d)) * np.exp(-ts(d) * 20), t0, vol)


def coeur(t0, t1, periode, vol):
    t = t0
    while t < min(t1, DUREE):
        poum(t, vol)
        poum(t + 0.16, vol * 0.6)
        t += periode


def pas_sol(t0, vol, grave=False):
    """pas sur le carrelage (ou sur le ballast, plus grave)"""
    d = 0.12
    son = filtre(bruit(d), "bandpass", [120, 900] if grave else [300, 3000]) * np.exp(-ts(d) * 40)
    son += np.sin(2 * np.pi * (70 if grave else 120) * ts(d)) * np.exp(-ts(d) * 30) * 0.6
    pose(son, t0, vol)


def course(t0, t1, cadence, vol, grave=False):
    t = t0
    while t < min(t1, DUREE):
        pas_sol(t, vol * rng.uniform(0.8, 1.1), grave)
        t += cadence


def impact(t0, vol):
    d = 1.2
    tt = ts(d)
    pose(np.sin(2 * np.pi * (70 - 40 * tt) * tt) * np.exp(-tt * 3) + filtre(bruit(d), "lowpass", 300) * np.exp(-tt * 5), t0, vol)
    pose(filtre(bruit(0.5), "highpass", 1500) * np.exp(-ts(0.5) * 6), t0, vol * 0.5)


def sonnerie_portes(t0, n, vol):
    """le buzzer de fermeture des portes"""
    for j in range(n):
        bip(t0 + j * 0.32, 1050, 0.2, vol)


def vibre(t0, vol, d=0.9):
    tt = ts(d)
    pose(np.sin(2 * np.pi * 150 * tt) * (np.sin(2 * np.pi * 4 * tt) > 0) * env(len(tt), 0.01, 0.05), t0, vol)


def notif(t0, vol):
    for j, f0 in enumerate((1320, 1760)):
        d = 0.14
        pose(np.sin(2 * np.pi * f0 * ts(d)) * np.exp(-ts(d) * 18), t0 + j * 0.1, vol)


def frappe(t0, t1, vol):
    t = t0
    while t < t1:
        d = 0.03
        pose(filtre(bruit(d), "highpass", 2500) * np.exp(-ts(d) * 120), t, vol * rng.uniform(0.6, 1))
        t += rng.uniform(0.08, 0.16)


def pop(t0, vol):
    d = 0.08
    pose(np.sin(2 * np.pi * (500 + 2500 * ts(d)) * ts(d)) * np.exp(-ts(d) * 40), t0, vol)


def rame_passe(t0, d, vol, monte=True):
    """roulement + moteur qui monte (départ) ou descend (arrivée)"""
    tt = ts(d)
    k = tt / d if monte else 1 - tt / d
    moteur = np.sin(2 * np.pi * np.cumsum(180 + 520 * k) / SR) * 0.3 + np.sin(2 * np.pi * np.cumsum(360 + 1040 * k) / SR) * 0.12
    roul = filtre(bruit(d), "lowpass", 260) * (1 + 0.5 * np.sin(2 * np.pi * (2 + 6 * k) * tt))
    clac = np.zeros(len(tt))
    for c in np.arange(0.2, d, 0.45 if monte else 0.3):
        i = int(c * SR)
        n = int(0.05 * SR)
        clac[i : i + n] += filtre(bruit(0.05), "bandpass", [200, 1200])[: len(clac[i : i + n])] * np.exp(-ts(0.05) * 50)[: len(clac[i : i + n])]
    pose((moteur + roul + clac * 0.8), t0, vol)



fin = lambda nom: start[nom] / FPS
SC = [s["nom"] for s in tl["scenes"]]
fin_scene = lambda nom: (start[nom] + next(s["frames"] for s in tl["scenes"] if s["nom"] == nom)) / FPS
ok = lambda nom: fin(nom) < DUREE
tt_ = ts(DUREE)


def zip_(t0, d, vol):
    """fermeture éclair : petits clics très rapides"""
    t = t0
    while t < t0 + d:
        dd = 0.012
        pose(filtre(bruit(dd), "highpass", 2500) * np.exp(-ts(dd) * 300), t, vol * rng.uniform(0.6, 1))
        t += rng.uniform(0.012, 0.022)


def feuilles(t0, vol):
    """un pas dans les feuilles mortes"""
    d = 0.22
    pose(filtre(bruit(d), "bandpass", [700, 5000]) * np.exp(-ts(d) * 14) * (rng.random(int(d * SR)) > 0.6), t0, vol)
    pose(filtre(bruit(0.1), "lowpass", 300) * np.exp(-ts(0.1) * 30), t0, vol * 0.8)


def hibou(t0, vol):
    for j, (f0, d) in enumerate(((420, 0.35), (400, 0.6))):
        tt = ts(d)
        pose(np.sin(2 * np.pi * (f0 - 30 * tt / d) * tt) * np.sin(np.pi * tt / d) ** 1.5, t0 + j * 0.5, vol)


# ---------- la nuit : vent dans les arbres, grillons (s'arrêtent net au moment où le feu s'éteint) ----------
pose(filtre(bruit(DUREE), "bandpass", [150, 700]) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.06 * tt_)) * env(len(tt_), 0.5, 1), 0, 0.05)
t_off = rep("feu", "séteint")
t = 0.0
grillons = np.zeros(len(sfx))
while t < DUREE:
    d = 0.05
    for j in range(3):
        i0 = int((t + j * 0.07) * SR)
        s = np.sin(2 * np.pi * 4400 * ts(d)) * np.sin(np.pi * ts(d) / d)
        grillons[i0 : i0 + len(s)] += s[: max(0, len(grillons) - i0)]
    t += rng.uniform(0.5, 0.9)
k = np.ones(len(sfx))
a_ = int(t_off * SR)
k[a_:] = 0.0
# les grillons reviennent faiblement après, mais se taisent quand l'ombre arrive
b_ = int(fin("appel") * SR)
c_ = int(rep("ombre", "toile") * SR)
if b_ < len(k):
    k[b_:c_] = np.linspace(0, 0.4, max(0, min(len(k), c_) - b_))[: max(0, min(len(k), c_) - b_)]
sfx += grillons * k * 0.012

# ---------- 1. le feu : crépitement, puis « pouf » et sifflement de la braise ----------
d = t_off
crep = filtre(bruit(d), "lowpass", 600) * 0.3
for c in np.cumsum(rng.uniform(0.03, 0.25, 400)):
    if c >= d:
        break
    i0 = int(c * SR)
    n = int(0.015 * SR)
    crep[i0 : i0 + n] += filtre(bruit(0.015), "highpass", 1500)[: len(crep[i0 : i0 + n])] * rng.uniform(0.5, 2.5)
pose(crep * env(len(crep), 0.05, 0.02), 0, 0.09)
pose(filtre(bruit(0.7), "lowpass", 900) * np.exp(-ts(0.7) * 5), t_off - 0.05, 0.4)
pose(filtre(bruit(2.5), "highpass", 3000) * np.exp(-ts(2.5) * 1.5), t_off + 0.1, 0.05)
d = 3.0
pose(sum(np.sin(2 * np.pi * f_ * ts(d)) for f_ in (73.4, 77.8)) * env(int(d * SR), 0.05, 1.5) / 2, t_off, 0.1)
hibou(3.2, 0.03)

# ---------- 2. course, la tente, la fermeture éclair, la lanterne qui bourdonne ----------
b = bornes("tente")
t = b[0]
while t < b[1]:
    feuilles(t, 0.12)
    t += 0.18
pose(filtre(bruit(0.4), "bandpass", [300, 3000]) * np.exp(-ts(0.4) * 8), b[1] - 0.2, 0.12)  # il plonge dans la toile
zip_(rep("tente", "fermes") - 0.1, 1.0, 0.05)
d = DUREE - fin("tente")
lan = (np.sin(2 * np.pi * 120 * ts(d)) + 0.3 * np.sin(2 * np.pi * 240 * ts(d))) * env(int(d * SR), 0.2, 0.2)
pose(lan, fin("tente"), 0.006)

# ---------- 3-5. la voix dehors : pas dans les feuilles autour de la tente, ronflement de Lucas ----------
if ok("appel"):
    for t0, n, v in ((rep("appel", "dehors"), 4, 0.05), (rep("voix", "plus"), 6, 0.08)):
        for j in range(n):
            feuilles(t0 + j * 0.55, v + 0.01 * j)
    hibou(fin("appel") + 0.3, 0.025)
if ok("lucas"):
    t = fin("lucas") + 0.8
    while t < fin_scene("lucas") + 0.5:
        d = 1.1
        pose(filtre(bruit(d), "bandpass", [80, 400]) * np.sin(np.pi * ts(d) / d) ** 2 * (1 + 0.8 * np.sin(2 * np.pi * 28 * ts(d))), t, 0.09)
        t += 1.6
if ok("voix"):
    d = 1.4
    pose(filtre(bruit(d), "bandpass", [200, 2000]) * np.sin(np.pi * ts(d) / d), rep("voix", "dehors"), 0.04)  # la toile frémit

# ---------- 6-8. la lanterne grésille, l'ombre, le cœur, la fermeture qui s'ouvre toute seule ----------
if ok("ombre"):
    t = rep("ombre", "grésille") - 0.1
    while t < rep("ombre", "grésille") + 1.4:
        pose(filtre(bruit(0.05), "bandpass", [2000, 6000]) * np.exp(-ts(0.05) * 40), t, 0.05)
        t += rng.uniform(0.06, 0.2)
    pose(sum(np.sin(2 * np.pi * f_ * ts(3)) for f_ in (55, 58.3)) * env(int(3 * SR), 0.5, 1) / 2, rep("ombre", "ombre") - 0.3, 0.09)
    coeur(rep("ombre", "ombre"), fin("message"), 0.6, 0.12)
if ok("secoue"):
    for mot in ("secoues", "hugo"):
        t0 = rep("secoue", mot)
        for j in range(5):
            pose(filtre(bruit(0.12), "bandpass", [200, 2500]) * np.exp(-ts(0.12) * 20), t0 + j * 0.13, 0.1)
if ok("fermeture"):
    t0 = rep("fermeture", "commence")
    t = t0
    while t < fin_scene("fermeture"):
        zip_(t, 0.25, 0.05)
        t += 0.5

# ---------- 9. le message ----------
if ok("message"):
    vibre(rep("message", "vibre") - 0.2, 0.12)
    notif(rep("message", "message"), 0.06)
    frappe(rep("message", "tes") - 1.05, rep("message", "tes") - 0.05, 0.03)
    pop(rep("message", "tes"), 0.08)

# ---------- 10-11. silence, puis SCREAMER sur « ouvrent » ; nappe grave sur le sourire ----------
if ok("yeux"):
    a_ = int((fin("yeux") + 0.2) * SR)
    b_ = int((rep("yeux", "ouvrent") - 0.05) * SR)
    if a_ < b_:
        sfx[a_:b_] *= 0.08
    impact(rep("yeux", "ouvrent"), 0.6)
if ok("sourire"):
    d = fin_scene("sourire") - fin("sourire")
    pose(sum(np.sin(2 * np.pi * f_ * ts(d)) for f_ in (98, 103.8, 146.8)) * env(int(d * SR), 0.3, 0.8) / 3, fin("sourire"), 0.09)
    b = bornes("sourire")
    t = b[1]
    while t < b[2]:
        feuilles(t, 0.05)
        t += 0.35
if ok("dilemme"):
    coeur(fin("dilemme"), DUREE, 0.5, 0.11)

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
