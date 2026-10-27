"""Sons de « Ne lui ouvre pas », calés sur src/chalet/timeline.json et plans.json (même minutage que NeLuiOuvrePas.jsx).
Usage : python3 voix/chalet/mixage.py <sortie.wav> [fin_en_s] [--voix]"""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, resample_poly, sosfilt

SR = 48000
ici = os.path.dirname(os.path.abspath(__file__))
src = f"{ici}/../../src/chalet"
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


img_ = lambda nom, f: (start[nom] + f) / FPS
T_MSG = img("message", "vibre", 63) - 2
T_LEO = img("leo2", "vibre", 48) - 2
ALARME = (30, start["leo"] + 20)

# ---------- 1. on fonce dans le blizzard ; dedans, l'alerte hurle ----------
bb = bornes("vibre")
whoosh(0.0, bb[1] + 0.1, 0.35)
blizzard(0, bb[1], 0.12, dedans=False)
blizzard(bb[1], DUREE, 0.06)
sirene(ALARME[0] / FPS, ALARME[1] / FPS, 0.05)
for t in (30, 37, 44):
    vibre(t / FPS, 0.1)
coup(bb[1] - 0.05, 0.25, 55)
# la fenêtre qui tremble
for j in range(4):
    toc(bb[3] + 0.1 + j * 0.18, 0.05)
blizzard(bb[3], bb[4], 0.1, dedans=False)
pose(filtre(bruit(0.4), "bandpass", [300, 2000]) * np.sin(np.pi * ts(0.4) / 0.4), bb[4] - 0.05, 0.06)

# ---------- 3. le souvenir de Léo : la porte ouverte, la tempête, la porte qui se ferme ----------
bl = bornes("leo")
blizzard(bl[0], bl[1], 0.1, dedans=False)
claque(bl[1] - 0.25, 0.12)
drone(bl[1], bl[2] - bl[1] + 0.5, 0.05, (55, 58.3))

# ---------- 4. trois coups à la porte ----------
for k in (28, 36, 44):
    toc(img_("frappe", k), 0.4)
coeur(img_("frappe", 50), fin("message"), 0.75, 0.1)
drone(img_("frappe", 50), fin("frappe") - img_("frappe", 50), 0.06, (49, 51.9))

# ---------- 5. le message ----------
vibre(T_MSG / FPS, 0.1)
ding(T_MSG / FPS + 0.04, 0.03)
coup(rep("message", "ce") - 0.1, 0.2, 50)

# ---------- 6. la silhouette ----------
coup(rep("fenetre", "silhouette") - 0.2, 0.3, 45)
drone(rep("fenetre", "silhouette"), fin("serrure") - rep("fenetre", "silhouette"), 0.09, (41.2, 43.7, 61.7))
bf = bornes("fenetre")
blizzard(bf[2], bf[4], 0.1, dedans=False)

# ---------- 7. la poignée, le verrou ----------
for j in range(9):
    pose(filtre(bruit(0.04), "bandpass", [1500, 5000]) * np.exp(-ts(0.04) * 60), rep("serrure", "poignée") + j * 0.13, 0.05)
for j in range(6):
    toc(rep("serrure", "verrou") - 0.3 + j * 0.09, 0.08)
claque(rep("serrure", "cède") - 0.05, 0.3)
pose(filtre(bruit(0.15), "highpass", 2500) * np.exp(-ts(0.15) * 20), rep("serrure", "cède") - 0.05, 0.15)

# ---------- 8. deux secondes : tic-tac ----------
t0c = rep("choix", "lit", 84) + 0.2
tictac(deb("choix") + 0.1, t0c, 0.05)
# le chrono : tic toutes les 0,25 s, bip à chaque seconde, plus aigu à la fin
t = t0c
while t < fin("choix") - 0.05:
    d = 0.025
    pose(filtre(bruit(d), "highpass", 3200) * np.exp(-ts(d) * 140), t, 0.06)
    t += 0.25
for j in range(3):
    d = 0.12
    pose(np.sin(2 * np.pi * (880 if j < 2 else 1320) * ts(d)) * env(int(d * SR), 0.005, 0.03), t0c + j * 1.0, 0.05)
pose(np.sin(2 * np.pi * 1760 * ts(0.4)) * env(int(0.4 * SR), 0.005, 0.1), fin("choix") - 0.1, 0.06)
coeur(deb("choix"), fin("choix"), 0.4, 0.12)

# ---------- 9. l'armoire ----------
ba = bornes("armoire")
marche(ba[0], ba[1] - 0.2, 0.25, 0.08, 1.3)
grincement(ba[1] + 0.1, 0.8, 0.05, 180)
claque(ba[2] - 0.15, 0.08)
respiration(ba[2], ba[4] + 0.4, 1.0, 0.02, etouffe=True)
coeur(ba[2], ba[4] + 0.5, 0.55, 0.12)
grincement(rep("armoire", "vois") - 0.3, 1.2, 0.06, 140)
blizzard(rep("armoire", "vois") - 0.2, ba[3], 0.08, dedans=False)
t = rep("armoire", "entrer")
while t < ba[3]:
    pas_bois_lourd(t, 0.08)
    t += 0.62
reniflement(rep("armoire", "renifle") - 0.1, 2, 0.06)
os_craquent(rep("armoire", "penche") - 0.1, 1.0, 0.07)
souffle(rep("armoire", "devant") - 0.4, 1.4, 0.04, 100, 500)
ouvre = img("armoire", "souvrent", 307) - 6
cri(ouvre / FPS - 0.05, 1.3, 0.3)
coup(ouvre / FPS - 0.03, 0.55, 45)
claque(ouvre / FPS - 0.03, 0.3)

# ---------- 10. pause sur l'image : bourdonnement de magnétoscope ----------
a_, b_ = int((ouvre / FPS + 1.1) * SR), int(deb("mort") * SR)
sfx[a_:b_] *= 0.05
hum(deb("mort"), fin("mort"), 0.04)
coup(rep("mort", "survis") - 0.05, 0.3, 40)

# ---------- 11. le rembobinage : le son de l'armoire à l'envers, en accéléré ----------
D_R = fin("rembobine") - deb("rembobine")
a = int(ba[2] * SR)
b = int((ouvre / FPS + 1.0) * SR)
seg = sfx[a:b][::-1].copy()
n = int((D_R - 0.9) * SR)
seg = np.interp(np.linspace(0, len(seg) - 1, n), np.arange(len(seg)), seg)
seg = filtre(seg, "highpass", 300) * np.linspace(0.6, 1, n)
pose(seg, deb("rembobine") + 0.2, 0.9)
tt = ts(D_R - 0.9)
pose(np.sin(2 * np.pi * np.cumsum(1800 + 900 * np.sin(np.pi * tt / tt[-1])) / SR) * 0.15 + filtre(bruit(D_R - 0.9), "highpass", 4000) * 0.4, deb("rembobine") + 0.2, 0.05)
clic(fin("rembobine") - 0.72, 0.12)
toc(fin("rembobine") - 0.7, 0.08)

# ---------- 12-13. sous le lit ----------
bt = bornes("lit")
frottement(bt[0] + 0.5, 1.0, 0.08)
grincement(rep("lit", "elle") - 0.2, 1.2, 0.06, 140)
blizzard(rep("lit", "elle"), fin("cri"), 0.07, dedans=False)
t = rep("lit", "entre")
while t < rep("lit", "pièce") + 0.4:
    pas_bois_lourd(t, 0.08)
    t += 0.6
raclement(rep("lit", "longs") - 0.1, rep("lit", "parquet") - rep("lit", "longs") + 0.9, 0.06)
coeur(deb("lit"), fin("visage"), 0.5, 0.13)
drone(rep("visage", "lentement"), fin("visage") - rep("visage", "lentement"), 0.1, (41.2, 43.7, 61.7, 123.5))
souffle(rep("visage", "juste") - 0.3, 1.6, 0.05, 100, 500)
reniflement(rep("visage", "toi") - 0.2, 2, 0.05)

# ---------- 14. le cri dehors, elle ressort, la porte claque ----------
appel_lointain(rep("cri", "hurle") - 0.1, 0.2)
coup(rep("cri", "hurle"), 0.25, 55)
bc = bornes("cri")
galop(bc[2] + 0.2, bc[3] - 0.5, 0.24, 0.18)
cri(bc[2] + 0.3, 0.9, 0.1)
claque(bc[3] - 8 / FPS, 0.45)

# ---------- 15. silence… puis Léo écrit ----------
a_, b_ = int(deb("leo2") * SR), int((T_LEO / FPS - 0.2) * SR)
sfx[a_:b_] *= 0.3
vibre(T_LEO / FPS, 0.1)
ding(T_LEO / FPS + 0.04, 0.03)
coeur(T_LEO / FPS, DUREE, 0.6, 0.11)

# ---------- 16. on frappe ----------
k0 = img("dilemme", "frappe", 7)
for k in (0, 8, 16):
    toc((k0 + k) / FPS, 0.4)
k1 = img("dilemme", "alors", 122)
for k in (-10, -2):
    toc((k1 + k) / FPS, 0.25)
drone(deb("dilemme"), DUREE - deb("dilemme"), 0.08, (41.2, 43.7, 61.7, 82.4))
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
