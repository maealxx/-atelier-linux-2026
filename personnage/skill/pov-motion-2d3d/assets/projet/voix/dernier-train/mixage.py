"""Sons de « Le dernier train », calés sur src/dernier-train/timeline.json et plans.json (même minutage que DernierTrain.jsx).
Sans voix tant que la vraie voix n'est pas là (ajouter --voix pour mettre la voix calée par caler_voix.py).
Usage : python3 voix/dernier-train/mixage.py <sortie.wav> [fin_en_s] [--voix]"""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, resample_poly, sosfilt

SR = 48000
ici = os.path.dirname(os.path.abspath(__file__))
src = f"{ici}/../../src/dernier-train"
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

# ---------- ambiance de la station : souffle de ventilation, bourdonnement électrique des néons ----------
tt = ts(DUREE)
pose(filtre(bruit(DUREE), "bandpass", [80, 500]) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.05 * tt)) * env(len(tt), 0.3, 1), 0, 0.05)
buzz = (np.sin(2 * np.pi * 100 * tt) + 0.4 * np.sin(2 * np.pi * 200 * tt) + 0.2 * np.sin(2 * np.pi * 300 * tt))
# le bourdonnement des néons disparaît quand ils s'éteignent (scène « noir »)
k = np.ones(len(tt))
a_, b_ = int((fin("noir") + 1.0) * SR), int((fin("noir") + 4.6) * SR)
if a_ < len(k):
    k[a_:b_] = np.linspace(1, 0.25, len(k[a_:b_]))
    k[b_:] = 0.25
pose(buzz * k, 0, 0.012)
# swoosh doux à chaque coupe
for nom in SC:
    for c in bornes(nom)[1:-1]:
        if 0.2 < c < DUREE:
            d = 0.45
            pose(filtre(bruit(d), "bandpass", [300, 2200]) * np.sin(np.pi * ts(d) / d) ** 2, c - 0.22, 0.02)

# ---------- 1. l'escalator, la course, le saut, la sonnerie, les portes, la main sur la vitre, le train qui part ----------
b = bornes("portes")
d = b[2] - b[0]
pose(filtre(bruit(d), "bandpass", [60, 300]) * (1 + 0.3 * np.sin(2 * np.pi * 9 * ts(d))), 0, 0.06)  # escalator
course(0.05, b[2] - 0.1, 0.19, 0.11)
tsaut = rep("portes", "sautes") + 0.45
pose(np.sin(2 * np.pi * 55 * ts(0.3)) * np.exp(-ts(0.3) * 12), tsaut, 0.25)
course(b[2], rep("portes", "main") - 0.3, 0.17, 0.12)
sonnerie_portes(b[2] - 0.6, 5, 0.035)
d = 0.5
pose(filtre(bruit(d), "highpass", 1800) * np.exp(-ts(d) * 6), rep("portes", "ferment") - 0.4, 0.06)  # vérin des portes
metal(rep("portes", "ferment") + 0.15, 0.28, 140)
tm = rep("portes", "main") - 0.12
pose(filtre(bruit(0.2), "bandpass", [200, 2500]) * np.exp(-ts(0.2) * 25) + np.sin(2 * np.pi * 90 * ts(0.2)) * np.exp(-ts(0.2) * 20), tm, 0.35)
rame_passe(rep("portes", "il") - 0.5, 4.0, 0.12, monte=True)

# ---------- 2. réseau : le tel (petit bip d'erreur), le panneau qui grésille ----------
bip(rep("reseau", "pas") - 0.05, 420, 0.12, 0.03)
bip(rep("reseau", "pas") + 0.12, 320, 0.18, 0.03)
d = 1.8
pose(filtre(bruit(d), "bandpass", [3000, 8000]) * (rng.random(int(d * SR)) > 0.97), rep("reseau", "prochain") - 0.2, 0.05)

# ---------- 3. la grille : course dans l'escalator, la grille qui descend (cliquetis), les secousses, le clac final ----------
if ok("grille"):
    course(fin("grille"), rep("grille", "là"), 0.2, 0.11)
    t0, t1 = rep("grille", "là"), rep("grille", "fermée")
    d = t1 - t0
    rattle = filtre(bruit(d), "bandpass", [700, 4000]) * (0.5 + 0.5 * (np.sin(2 * np.pi * 14 * ts(d)) > 0.6))
    pose(rattle * env(int(d * SR), 0.2, 0.1), t0, 0.05)
    pose(np.sin(2 * np.pi * 70 * ts(d)) * env(int(d * SR), 0.3, 0.1), t0, 0.05)
    course(t0 + 0.1, rep("grille", "lattrapes") - 0.1, 0.18, 0.11)
    t = rep("grille", "lattrapes")
    while t < t1 - 0.1:
        metal(t, 0.18, rng.uniform(300, 500))
        t += rng.uniform(0.18, 0.3)
    metal(t1, 0.45, 120)
    pose(filtre(bruit(1.2), "lowpass", 180) * np.exp(-ts(1.2) * 3), t1, 0.25)

# ---------- 4. noir : chaque néon qui s'éteint fait « clac » (relais + étincelle), de plus en plus près ----------
if ok("noir"):
    for n in range(1, 28, 2):
        if n in (5, 7):
            continue
        to = (start["noir"] + 30 + ((21 - abs(n - 6)) / 18) * 100) / FPS
        prox = 1 - abs(n - 6) / 21
        d = 0.09
        pose(filtre(bruit(d), "bandpass", [800, 5000]) * np.exp(-ts(d) * 50), to, 0.08 + 0.18 * prox)
        pose(np.sin(2 * np.pi * 70 * ts(0.25)) * np.exp(-ts(0.25) * 14), to, 0.08 + 0.2 * prox)
    d = fin_scene("noir") - rep("noir", "il")
    pose(sum(np.sin(2 * np.pi * f_ * ts(d)) for f_ in (73.4, 77.8)) * env(int(d * SR), 0.6, 0.5) / 2, rep("noir", "il"), 0.07)

# ---------- 5. annonce : crépitement du haut-parleur, carillon, souffle de la voix ----------
if ok("annonce"):
    t0 = fin("annonce")
    d = fin_scene("annonce") - t0
    crep = filtre(bruit(d), "bandpass", [1500, 6000]) * (rng.random(int(d * SR)) > 0.93) + filtre(bruit(d), "bandpass", [400, 3000]) * 0.15
    pose(crep * env(int(d * SR), 0.05, 0.4), t0, 0.06)
    for j, f0 in enumerate((659, 523, 784)):
        dd = 0.5
        pose(np.sin(2 * np.pi * f0 * ts(dd)) * np.exp(-ts(dd) * 4), rep("annonce", "une") - 0.9 + j * 0.28, 0.06)
    pose(sum(np.sin(2 * np.pi * f_ * ts(1.5)) for f_ in (98, 104)) * env(int(1.5 * SR), 0.02, 1) / 2, rep("annonce", "prénom"), 0.1)

# ---------- 6-7. la chose : pas lents et lourds sur le ballast (au rythme de sa marche), puis plus rien ----------
if ok("rails"):
    t0 = rep("rails", "quelque") - 0.2
    t1 = rep("pilier", "sarrêtent", 126) + 0.1 if ok("pilier") else DUREE
    t = t0
    while t < min(t1, DUREE):
        pas_sol(t, 0.08 + 0.06 * min(1, (t - t0) / 6), grave=True)
        pose(filtre(bruit(0.15), "bandpass", [1500, 5000]) * np.exp(-ts(0.15) * 20), t + 0.02, 0.025)  # cailloux
        t += 0.65
    d = min(t1, DUREE) - t0
    pose(np.sin(2 * np.pi * 49 * ts(d)) * np.linspace(0.2, 1, int(d * SR)), t0, 0.06)
if ok("pilier"):
    course(fin("pilier") + 0.05, rep("pilier", "plaques") + 0.1, 0.24, 0.08)
    coeur(rep("pilier", "plaques"), rep("pilier", "sarrêtent") - 0.3, 0.55, 0.13)
    # silence total après « s'arrêtent » : on coupe l'ambiance (fait plus bas)

# ---------- 8. message : vibreur, notif, frappe, pop ----------
if ok("message"):
    vibre(rep("message", "vibre") - 0.2, 0.12)
    notif(rep("message", "numéro"), 0.06)
    frappe(rep("message", "ne") - 1.05, rep("message", "ne") - 0.05, 0.03)
    pop(rep("message", "ne"), 0.08)

# ---------- 9. le train fantôme : grondement lointain, arrivée, freins qui crissent ----------
if ok("phares"):
    t0 = fin("phares")
    tarr = rep("phares", "un")
    tstop = rep("phares", "sarrête") + 0.2
    pose(filtre(bruit(tarr - t0 + 0.5), "lowpass", 120) * np.linspace(0, 1, int((tarr - t0 + 0.5) * SR)), t0, 0.12)
    rame_passe(tarr, tstop - tarr, 0.16, monte=False)
    d = 1.6
    pose(sum(np.sin(2 * np.pi * (f0 + 60 * np.sin(2 * np.pi * 5 * ts(d))) * ts(d)) for f0 in (2400, 3150)) / 2 * env(int(d * SR), 0.2, 0.6), tstop - 1.5, 0.05)
    pose(filtre(bruit(1.0), "lowpass", 150) * np.exp(-ts(1.0) * 4), tstop, 0.2)

# ---------- 10-11. les portes s'ouvrent (pschitt), les têtes se tournent (sting), « le tien » ----------
if ok("wagon"):
    d = 0.8
    pose(filtre(bruit(d), "highpass", 1500) * np.exp(-ts(d) * 4), rep("wagon", "portes") - 0.1, 0.12)
    metal(rep("wagon", "souvrent") + 0.2, 0.15, 160)
    impact(rep("wagon", "tournent") + 0.05, 0.4)
    d = fin_scene("visage") - rep("wagon", "tournent")
    pose(sum(np.sin(2 * np.pi * f_ * ts(d)) for f_ in (110, 116.5, 164.8)) * env(int(d * SR), 0.8, 0.8) / 3, rep("wagon", "tournent"), 0.05)
if ok("visage"):
    impact(rep("visage", "tien"), 0.6)

# ---------- 12. les pas reprennent, plus vite ; le tel vibre encore ----------
if ok("pas"):
    t = rep("pas", "pas")
    while t < DUREE:
        k = min(1, (t - rep("pas", "pas")) / 2)
        pas_sol(t, 0.1 + 0.08 * k)
        t += 0.6 - 0.25 * k
    coeur(fin("pas"), DUREE, 0.42, 0.12)
    vibre(rep("pas", "vibre") - 0.2, 0.12)
    frappe(rep("pas", "ne") - 1.05, rep("pas", "ne") - 0.05, 0.03)
    pop(rep("pas", "ne"), 0.08)
    pose(np.sin(2 * np.pi * 220 * ts(0.25)) * np.exp(-ts(0.25) * 10), rep("pas", "ne"), 0.05)

# ---------- 13. la sonnerie des portes en boucle ----------
if ok("dilemme"):
    t = rep("dilemme", "sonnerie") - 0.1
    while t < DUREE - 0.3:
        sonnerie_portes(t, 3, 0.03)
        t += 1.6

# silence total juste après « les pas s'arrêtent » (avant le vibreur)
if ok("pilier"):
    a_ = int((rep("pilier", "sarrêtent") + 0.35) * SR)
    b_ = int((rep("message", "vibre") - 0.25) * SR)
    if a_ < b_:
        sfx[a_:b_] *= 0.08

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
