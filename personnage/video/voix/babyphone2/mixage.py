"""Sons de « Le babyphone 2 », calés sur src/babyphone2/timeline.json et plans.json (même minutage que LeBabyphone2.jsx).
Usage : python3 voix/babyphone2/mixage.py <sortie.wav> [fin_en_s] [--voix]"""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, resample_poly, sosfilt

SR = 48000
ici = os.path.dirname(os.path.abspath(__file__))
src = f"{ici}/../../src/babyphone2"
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



# ---------- sons propres au chalet ----------
def sirene(t0, t1, vol):
    """alerte d'urgence du téléphone : deux tons stridents qui alternent"""
    d = min(t1, DUREE) - t0
    if d <= 0:
        return
    tt = ts(d)
    f = np.where((tt * 2.2) % 1 < 0.5, 853, 960)
    ph = 2 * np.pi * np.cumsum(f) / SR
    son = (np.sin(ph) + 0.35 * np.sin(3 * ph)) * (((tt * 4.4) % 1) < 0.85)
    pose(son * env(len(tt), 0.01, 0.3), t0, vol)


def blizzard(t0, t1, vol, dedans=True):
    d = min(t1, DUREE) - t0
    if d <= 0:
        return
    tt = ts(d)
    b = filtre(bruit(d), "lowpass", 380 if dedans else 900) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.17 * tt) + 0.2 * np.sin(2 * np.pi * 0.41 * tt + 1))
    # sifflement du vent
    sif = np.sin(2 * np.pi * np.cumsum(520 + 160 * np.sin(2 * np.pi * 0.23 * tt)) / SR) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.13 * tt)) ** 2
    pose((b + sif * (0.05 if dedans else 0.12)) * env(len(tt), 0.05, 0.05), t0, vol)


def toc(t0, vol):
    """un coup de poing sur la porte en bois"""
    d = 0.35
    tt = ts(d)
    pose(np.sin(2 * np.pi * 95 * tt) * np.exp(-tt * 18) + filtre(bruit(d), "bandpass", [150, 1200]) * np.exp(-tt * 40) * 0.9, t0, vol)


def grincement(t0, d, vol, f0=200):
    tt = ts(d)
    fr = f0 + 90 * np.sin(2 * np.pi * 0.9 * tt) + 40 * np.sin(2 * np.pi * 3.1 * tt)
    son = np.sign(np.sin(2 * np.pi * np.cumsum(fr) / SR)) * (0.6 + 0.4 * np.sin(2 * np.pi * 13 * tt))
    pose(filtre(son, "bandpass", [300, 2600]) * env(len(tt), 0.05, 0.2) * 0.4, t0, vol)


def tictac(t0, t1, vol):
    t = t0
    k = 0
    while t < min(t1, DUREE):
        d = 0.03
        pose(filtre(bruit(d), "highpass", 3000 if k % 2 else 2200) * np.exp(-ts(d) * 120), t, vol)
        t += 0.5
        k += 1


def pas_bois_lourd(t0, vol):
    d = 0.3
    tt = ts(d)
    pose(np.sin(2 * np.pi * 70 * tt) * np.exp(-tt * 16) + filtre(bruit(d), "bandpass", [200, 1400]) * np.exp(-tt * 25) * 0.5, t0, vol)
    grincement(t0 + 0.05, 0.25, vol * 0.3, 260)


def claque(t0, vol):
    d = 1.0
    tt = ts(d)
    pose(np.sin(2 * np.pi * 60 * tt) * np.exp(-tt * 9) + filtre(bruit(d), "lowpass", 900) * np.exp(-tt * 12), t0, vol)


def frottement(t0, d, vol):
    tt = ts(d)
    pose(filtre(bruit(d), "bandpass", [800, 5000]) * (0.5 + 0.5 * (rng.random(len(tt)) > 0.6)) * env(len(tt), 0.05, 0.2), t0, vol)


def hum(t0, t1, vol):
    """bourdonnement + souffle de bande (magnétoscope en pause)"""
    d = min(t1, DUREE) - t0
    if d <= 0:
        return
    tt = ts(d)
    pose((np.sin(2 * np.pi * 60 * tt) * 0.5 + np.sin(2 * np.pi * 120 * tt) * 0.25 + filtre(bruit(d), "highpass", 3000) * 0.3) * env(len(tt), 0.02, 0.05), t0, vol)


def appel_lointain(t0, vol):
    """un cri au loin dans la tempête (voyelle filtrée, réverbérée)"""
    d = 1.4
    tt = ts(d)
    f = 330 + 140 * np.sin(np.pi * tt / d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    son = sum(np.sin(k * ph) / k for k in range(1, 10))
    son = filtre(son, "bandpass", [500, 1400]) * np.sin(np.pi * tt / d)
    ech = np.zeros(len(son) + int(0.9 * SR))
    for j, (dt, g) in enumerate(((0, 1), (0.21, 0.5), (0.47, 0.3), (0.8, 0.15))):
        i = int(dt * SR)
        ech[i : i + len(son)] += son * g
    pose(filtre(ech, "lowpass", 2200), t0, vol)



# ---------- sons propres au babyphone 2 ----------
ECLAIRS = [40, 520, 1160, 1690, 2240, 2620]


def tonnerre(t0, vol):
    d = 3.2
    tt = ts(d)
    craq = filtre(bruit(d), "bandpass", [80, 2500]) * np.exp(-tt * 6) * (0.5 + 0.5 * (rng.random(len(tt)) > 0.6))
    gr = filtre(bruit(d), "lowpass", 140) * np.exp(-tt * 1.1) * 3
    pose(craq * 0.5 + gr, t0, vol)


def pluie(t0, t1, vol, dedans=True):
    d = max(0.1, t1 - t0)
    son = filtre(bruit(d), "bandpass", [600, 6000] if not dedans else [300, 2500]) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.2 * ts(d)))
    gouttes = np.zeros(len(son))
    for _ in range(int(d * (40 if not dedans else 12))):
        i = rng.integers(0, max(1, len(son) - 800))
        gouttes[i : i + 800] += np.sin(2 * np.pi * rng.uniform(1500, 4000) * ts(800 / SR)) * np.exp(-ts(800 / SR) * 120) * 0.6
    pose((son + gouttes) * env(len(son), 0.3, 0.3), t0, vol)


def gresille(t0, d, vol):
    tt = ts(d)
    son = filtre(bruit(d), "bandpass", [800, 7000]) * (0.4 + 0.6 * (np.sin(2 * np.pi * 7 * tt) > 0))
    son += np.sign(np.sin(2 * np.pi * 50 * tt)) * 0.15
    pose(son * env(len(tt), 0.02, 0.1), t0, vol)


def chuchote(t0, d, vol):
    """souffle sifflant façon chuchotement (filtré, modulé)"""
    tt = ts(d)
    son = filtre(bruit(d), "bandpass", [1500, 5000]) * (0.3 + 0.7 * np.abs(np.sin(2 * np.pi * 3.3 * tt + np.sin(2 * np.pi * 1.1 * tt))))
    pose(son * env(len(tt), 0.05, 0.2), t0, vol)


def rire(t0, vol):
    for j in range(4):
        chuchote(t0 + j * 0.13, 0.09, vol)


def bulle(t0, vol):
    d = 0.08
    pose(np.sin(2 * np.pi * (500 + 2500 * ts(d)) * ts(d)) * np.exp(-ts(d) * 40), t0, vol)


def swish(t0, vol):
    d = 0.35
    pose(filtre(bruit(d), "bandpass", [400, 3500]) * np.sin(np.pi * ts(d) / d) ** 2, t0 - d / 2, vol)


def murmure(t0, d, vol):
    tt = ts(d)
    voix = sum(np.sin(2 * np.pi * f * tt) / k for k, f in enumerate((92, 184, 276, 368), 1)) * (0.5 + 0.5 * np.sin(2 * np.pi * 4 * tt))
    pose(filtre(voix + filtre(bruit(d), "bandpass", [200, 1200]) * 0.6, "lowpass", 900) * env(len(tt), 0.1, 0.3), t0, vol)


deb = lambda nom: start[nom] / FPS
fin = lambda nom: (start[nom] + next(s["frames"] for s in tl["scenes"] if s["nom"] == nom)) / FPS
F = lambda nom, image: (start[nom] + image) / FPS

# ---------- ambiance : orage dehors (plus fort au jardin), tonnerre sur chaque éclair ----------
pluie(0, deb("porte"), 0.05)
pluie(F("porte", 140), DUREE, 0.14, dedans=False)
for e in ECLAIRS:
    if e / FPS < DUREE:
        tonnerre(e / FPS + 0.15, 0.35 if e / FPS > F("porte", 140) else 0.25)
drone(0, DUREE, 0.03, (55, 58.3, 82.4))
# coupes : whoosh discret
for nom in [s["nom"] for s in tl["scenes"]]:
    for c in bornes(nom)[1:-1]:
        swish(c, 0.02)

# ---------- 1. le téléphone vibre, les notifications ----------
BUZZ = [rep("alerte", "vibre", 95) - 0.2, rep("alerte", "encore", 115), rep("alerte", "et", 140), rep("alerte", "cinq", 167), rep("alerte", "surtout", 252) - 0.13]
for b in BUZZ:
    vibre(b, 0.12)
    ding(b + 0.04, 0.03)
coup(rep("alerte", "jamais") - 0.05, 0.22, 50)

# ---------- 2. la veilleuse (petite boîte à musique) ----------
for j, f0 in enumerate((1568, 1318, 1046, 1318, 1175)):
    pose(np.sin(2 * np.pi * f0 * ts(0.6)) * np.exp(-ts(0.6) * 5), rep("dodo", "allumes") + j * 0.28, 0.025)
clic(rep("dodo", "allumes") - 0.05, 0.08)

# ---------- 3. le babyphone : Léna chuchote, rigole ----------
gresille(F("chuchote", 70), 0.4, 0.03)
chuchote(rep("chuchote", "chuchote") - 0.2, 1.1, 0.05)
rire(rep("chuchote", "rigole"), 0.05)
chuchote(rep("chuchote", "chut") - 0.05, 1.0, 0.06)
drone(rep("chuchote", "chut"), fin("chuchote") - rep("chuchote", "chut") + 0.5, 0.05, (41.2, 43.7))

# ---------- 4. l'escalier en courant, la porte, la trappe ----------
be = bornes("escalier")
t = be[0] + 0.05
while t < be[2]:
    pas_bois_lourd(t, 0.06)
    t += 0.24
grincement(be[2] + 0.1, 0.7, 0.04, 220)
coup(rep("escalier", "trappe") - 0.1, 0.25, 45)
grincement(rep("escalier", "entrouverte"), 1.2, 0.04, 120)

# ---------- 5. tu redescends ; le babyphone grésille ; la voix d'homme ----------
bv = bornes("voix")
t = bv[0] + 0.1
while t < bv[1]:
    pas_bois_lourd(t, 0.05)
    t += 0.42
gresille(rep("voix", "grésille") - 0.1, bv[2] - rep("voix", "grésille") + 0.1, 0.06)
murmure(rep("voix", "murmure") - 0.1, 1.4, 0.07)
coeur(rep("voix", "murmure"), fin("message"), 0.7, 0.1)

# ---------- 6. la caméra a tourné ; la main sort ----------
coup(rep("ecran", "tourné") - 0.1, 0.18, 55)
os_craquent(rep("ecran", "main") - 0.3, 1.2, 0.07)
drone(rep("ecran", "longue"), fin("ecran") - rep("ecran", "longue"), 0.08, (41.2, 43.7, 61.7))

# ---------- 7. le message ----------
T6 = rep("message", "on", 66)
vibre(T6, 0.12)
ding(T6 + 0.04, 0.035)
coup(rep("message", "mamie") - 0.05, 0.3, 45)

# ---------- 8. la coupure : clac, silence, pas lourds, la chose descend ----------
tc = rep("coupure", "séteint") - 0.05
claque(tc, 0.25)
a_, b_ = int((tc + 0.05) * SR), int((tc + 1.4) * SR)
sfx[a_:b_] *= 0.15
bk = bornes("coupure")
for p in (rep("coupure", "pas"), rep("coupure", "lourds") + 0.13, rep("coupure", "létage") + 0.2, rep("coupure", "létage") + 0.6):
    coup(p, 0.28, 48)
    toc(p + 0.02, 0.05)
t = bk[2]
while t < bk[3]:
    pas_bois_lourd(t, 0.06)
    os_craquent(t + 0.05, 0.15, 0.02)
    t += 0.3
raclement(bk[2], bk[3] - bk[2], 0.04)

# ---------- 9. le choix : chrono, cœur ----------
t0c = img("choix", "dentrée", 132) / FPS + 14 / FPS
tictac(deb("choix") + 0.1, t0c, 0.04)
t = t0c
while t < t0c + 3:
    d = 0.025
    pose(filtre(bruit(d), "highpass", 3200) * np.exp(-ts(d) * 140), t, 0.06)
    t += 0.25
for j in range(3):
    d = 0.12
    pose(np.sin(2 * np.pi * (880 if j < 2 else 1320) * ts(d)) * env(int(d * SR), 0.005, 0.03), t0c + j * 1.0, 0.05)
coeur(deb("choix"), fin("choix"), 0.42, 0.12)
for mot in ("placard", "porte"):
    bulle(rep("choix", mot) - 0.13, 0.08)

# ---------- 10. le placard : porte, souffle, pas qui s'arrêtent, grésillement, « je te vois », screamer ----------
bp = bornes("placard")
t = bp[0]
while t < bp[1] - 0.3:
    pas_bois_lourd(t, 0.05)
    t += 0.26
grincement(bp[1] - 0.6, 0.5, 0.05, 260)
claque(bp[1] - 0.1, 0.1)
respiration(bp[1], rep("placard", "je") - 0.2, 1.1, 0.02, etouffe=True)
coeur(bp[1], rep("placard", "je"), 0.55, 0.12)
t = bp[2]
while t < rep("placard", "sarrêtent") + 0.1:
    pas_bois_lourd(t, 0.09)
    t += 0.55
gresille(rep("placard", "grésille") - 0.1, rep("placard", "je") - rep("placard", "grésille"), 0.06)
chuchote(rep("placard", "je") - 0.05, 0.9, 0.07)
crie = img("placard", "vois", 253) / FPS + 10 / FPS
cri(crie - 0.03, 1.3, 0.3)
coup(crie - 0.03, 0.55, 45)

# ---------- 11. pause ; 12. rembobinage ----------
a_, b_ = int((crie + 1.1) * SR), int(deb("mort") * SR)
sfx[a_:b_] *= 0.05
a_, b_ = int(deb("mort") * SR), int(fin("mort") * SR)
sfx[a_:b_] *= 0.1
hum(deb("mort"), fin("mort"), 0.04)
coup(rep("mort", "survis") - 0.05, 0.3, 40)
D_R = fin("rembobine") - deb("rembobine")
a = int(bp[1] * SR)
b = int((crie + 1.0) * SR)
seg = sfx[a:b][::-1].copy()
n = int((D_R - 0.9) * SR)
seg = np.interp(np.linspace(0, len(seg) - 1, n), np.arange(len(seg)), seg)
seg = filtre(seg, "highpass", 300) * np.linspace(0.6, 1, n)
pose(seg, deb("rembobine") + 0.2, 0.9)
tt = ts(D_R - 0.9)
pose(np.sin(2 * np.pi * np.cumsum(1800 + 900 * np.sin(np.pi * tt / tt[-1])) / SR) * 0.15 + filtre(bruit(D_R - 0.9), "highpass", 4000) * 0.4, deb("rembobine") + 0.2, 0.05)
clic(fin("rembobine") - 0.72, 0.12)

# ---------- 13. la porte fermée, la fenêtre, le jardin, le portail ----------
bo = bornes("porte")
t = bo[0]
while t < bo[1]:
    pas_bois_lourd(t, 0.07)
    t += 0.22
for j in range(8):
    pose(filtre(bruit(0.04), "bandpass", [1500, 5000]) * np.exp(-ts(0.04) * 60), rep("porte", "fermée") - 0.1 + j * 0.12, 0.06)
t = bo[2]
while t < bo[3] - 0.2:
    pas_bois_lourd(t, 0.06)
    t += 0.22
pose(filtre(bruit(0.3), "highpass", 2000) * np.exp(-ts(0.3) * 10), bo[3] - 0.15, 0.12)
coup(F("porte", 0) + (bo[3] - deb("porte")) + 0.45, 0.3, 60)
t = bo[4]
while t < bo[5]:
    pas_feuilles(t, 0.06)
    t += 0.24
claque(rep("porte", "sallume") - 0.05, 0.05)
drone(rep("porte", "sallume"), DUREE - rep("porte", "sallume"), 0.07, (41.2, 43.7, 61.7, 82.4))

# ---------- 14-15. Léna à la fenêtre ; la silhouette ; le dilemme ----------
coup(rep("fenetre", "silhouette") - 0.2, 0.3, 42)
os_craquent(rep("fenetre", "pose") - 0.1, 1.0, 0.06)
coeur(deb("dilemme"), DUREE, 0.6, 0.1)
for mot in ("tenfuis", "chercher"):
    bulle(rep("dilemme", mot) - 0.13, 0.08)
bulle(rep("dilemme", "dis-le") - 0.07, 0.1)

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
