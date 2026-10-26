"""Sons de « Et si l'hypergamie disparaissait », calés sur src/hypergamie/timeline.json et plans.json (même minutage que Hypergamie.jsx).
Sans voix tant que la vraie voix n'est pas là (ajouter --voix pour mettre la voix calée par caler_voix.py).
Usage : python3 voix/hypergamie/mixage.py <sortie.wav> [fin_en_s] [--voix]"""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, resample_poly, sosfilt

SR = 48000
ici = os.path.dirname(os.path.abspath(__file__))
src = f"{ici}/../../src/hypergamie"
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


def note(f0, d, vol=1.0, dec=3.0):
    tt = ts(d)
    son = np.sin(2 * np.pi * f0 * tt) + 0.35 * np.sin(2 * np.pi * 2 * f0 * tt) + 0.15 * np.sin(2 * np.pi * 3 * f0 * tt)
    return son * np.exp(-tt * dec) * env(len(tt), 0.005, 0.05) * vol


def kick(t0, vol):
    d = 0.25
    pose(np.sin(2 * np.pi * np.cumsum(120 * np.exp(-ts(d) * 18) + 45) / SR) * np.exp(-ts(d) * 10), t0, vol)


def charley(t0, vol):
    d = 0.06
    pose(filtre(bruit(d), "highpass", 7000) * np.exp(-ts(d) * 60), t0, vol)


def clap(t0, vol):
    d = 0.18
    pose(filtre(bruit(d), "bandpass", [900, 3500]) * np.exp(-ts(d) * 22), t0, vol)


# ---------- musique de fond légère et joyeuse (100 BPM) : accords, basse, petit beat ----------
BPM = 100
B = 60 / BPM
ACC = [[261.6, 329.6, 392.0], [220.0, 277.2, 329.6], [174.6, 220.0, 261.6], [196.0, 246.9, 293.7]]  # Do, La, Fa, Sol
t = 0.0
mes = 0
while t < DUREE:
    a = ACC[mes % 4]
    for b in range(4):
        tb = t + b * B
        if tb >= DUREE:
            break
        for f0 in a:
            pose(note(f0, B * 0.9, 1, 2.5), tb, 0.018)
        pose(note(a[0] / 2, B * 0.8, 1, 4), tb, 0.05)
        kick(tb, 0.10 if b % 2 == 0 else 0.0)
        if b % 2 == 1:
            clap(tb, 0.05)
        charley(tb + B / 2, 0.03)
    t += 4 * B
    mes += 1
# la musique baisse pendant le « revers » (petit froid), puis reprend
# (fait sur sfx à la fin)

# ---------- whoosh doux à chaque coupe ----------
for nom in SC:
    for c in bornes(nom)[1:-1]:
        if 0.2 < c < DUREE:
            d = 0.4
            pose(filtre(bruit(d), "bandpass", [400, 3000]) * np.sin(np.pi * ts(d) / d) ** 2, c - 0.2, 0.025)

# ---------- 1. le schéma : flèches qui fusent, puis CASSE (verre + paillettes), chute sur la ligne ----------
for j in range(5):
    d = 0.35
    pose(filtre(bruit(d), "bandpass", [1500, 5000]) * np.sin(np.pi * ts(d) / d), 0.05 + j * 0.1, 0.03)
tc = rep("schema", "disparaisse")
pose(filtre(bruit(0.6), "highpass", 2500) * np.exp(-ts(0.6) * 7), tc, 0.18)
for j in range(10):
    pose(note(1200 + 300 * j, 0.25, 1, 10), tc + 0.03 * j, 0.02)
kick(tc, 0.3)
tl_ = rep("schema", "lendemain") - 0.4
for j in range(6):
    pose(note(880 - 60 * j, 0.15, 1, 12), tl_ + j * 0.06, 0.03)

# ---------- 2-3. le téléphone : pings de match qui s'enchaînent, vibreur, bulle ----------
if ok("matchs"):
    t0 = rep("matchs", "ouvres")
    for j in range(14):
        pose(note(1568 if j % 2 else 1318, 0.18, 1, 14), t0 + 0.15 + j * 0.2, 0.04)
    kick(rep("matchs", "matchs"), 0.2)
    b = bornes("matchs")
    d = 0.5
    pose(np.sin(2 * np.pi * np.cumsum(200 + 600 * ts(d) / d) / SR) * env(int(d * SR), 0.01, 0.1), b[2] + 0.1, 0.05)  # boing du saut
if ok("messages"):
    t = fin("messages") + 0.1
    while t < rep("messages", "tes") - 0.6:
        pose(filtre(bruit(0.03), "highpass", 3000) * np.exp(-ts(0.03) * 100), t, 0.03)
        t += 0.12
    pose(note(1760, 0.12, 1, 20), rep("messages", "tes") - 0.05, 0.05)

# ---------- 4-6. la rue : oiseaux, voitures qui passent, clochette de la boulangerie, musique de la salle ----------
for nom in ("rue", "salle", "dilemme"):
    if not ok(nom):
        continue
    t0, t1 = fin(nom), min(DUREE, fin_scene(nom))
    t = t0 + 0.3
    while t < t1:
        d = 0.12
        pose(np.sin(2 * np.pi * np.cumsum(3000 + 1500 * np.sin(2 * np.pi * 18 * ts(d))) / SR) * np.sin(np.pi * ts(d) / d), t, 0.012)
        t += rng.uniform(0.4, 1.2)
    d = t1 - t0
    pose(filtre(bruit(d), "lowpass", 400) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.25 * ts(d))), t0, 0.03)
if ok("rue"):
    pose(note(1046, 0.4, 1, 6) + note(1318, 0.4, 1, 6), rep("rue", "sourit") - 0.1, 0.04)
if ok("boulangerie"):
    for j in range(3):
        pose(note(2093, 0.6, 1, 5), fin("boulangerie") + 0.05 + j * 0.09, 0.03)
    pose(filtre(bruit(0.3), "bandpass", [800, 4000]) * np.exp(-ts(0.3) * 12), rep("boulangerie", "glisse"), 0.06)  # papier
    pose(note(1568, 0.3, 1, 8), rep("boulangerie", "gratuite"), 0.04)
if ok("salle"):
    b = bornes("salle")
    t = b[1]
    while t < b[2]:
        kick(t, 0.06)
        t += 0.3

# ---------- 7. le bus : moteur, freins, petit bip du bouton ----------
if ok("bus"):
    t0, t1 = fin("bus"), fin_scene("bus")
    d = t1 - t0
    pose((np.sin(2 * np.pi * 55 * ts(d)) * 0.6 + filtre(bruit(d), "lowpass", 200)) * env(int(d * SR), 0.3, 0.3), t0, 0.05)

# ---------- 8. la soirée : la musique monte, et l'éclat de rire général ----------
if ok("soiree"):
    t0, t1 = fin("soiree"), fin_scene("soiree")
    t = t0
    while t < t1:
        kick(t, 0.08)
        t += B / 2
    tr = rep("soiree", "tout")
    for j in range(16):
        d = 0.16
        f0 = rng.uniform(220, 520)
        pose(np.sin(2 * np.pi * f0 * ts(d)) * (np.sin(np.pi * ts(d) / d) ** 2) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * ts(d))), tr + j * 0.11 + rng.uniform(0, 0.05), 0.02)

# ---------- 9. l'appel : sonnerie, puis on décroche ----------
if ok("pote"):
    b = bornes("pote")
    t = b[0] + 0.1
    while t < b[1] - 0.2:
        for f0 in (988, 1319):
            pose(note(f0, 0.12, 1, 10), t, 0.04)
            t += 0.14
        t += 0.3
    pose(note(1568, 0.15, 1, 15), b[1] - 0.1, 0.05)

# ---------- 10. le revers : disque qui grince, la musique se coupe un instant ----------
if ok("revers"):
    tr = rep("revers", "choix") - 0.2
    d = 0.6
    pose(np.sin(2 * np.pi * np.cumsum(900 * np.exp(-ts(d) * 4) + 80) / SR) * env(int(d * SR), 0.01, 0.2), tr, 0.06)
    a_, b_ = int(tr * SR), int((tr + 1.4) * SR)
    sfx[a_:b_] *= np.linspace(0.25, 0.25, max(0, min(len(sfx), b_) - a_))[: max(0, min(len(sfx), b_) - a_)]
    t = rep("revers", "reçoit")
    for j in range(10):
        pose(note(1318, 0.12, 1, 16), t + j * 0.16, 0.03)

# ---------- 12. le dilemme : petit roulement, ding sur chaque étiquette ----------
if ok("dilemme"):
    pose(note(1318, 0.4, 1, 6), rep("dilemme", "oui") - 0.05, 0.05)
    pose(note(1568, 0.4, 1, 6), rep("dilemme", "boulangère") - 0.15, 0.05)

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
