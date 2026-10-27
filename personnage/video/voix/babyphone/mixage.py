"""Sons de « Le babyphone », calés sur src/babyphone/timeline.json et plans.json (même minutage que LeBabyphone.jsx).
Sans voix tant que la vraie voix n'est pas là (ajouter --voix pour mettre la voix calée par caler_voix.py).
Usage : python3 voix/babyphone/mixage.py <sortie.wav> [fin_en_s] [--voix]"""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, resample_poly, sosfilt

SR = 48000
ici = os.path.dirname(os.path.abspath(__file__))
src = f"{ici}/../../src/babyphone"
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
ECLAIRS = [6, 300, 760, 1210, 1640]  # mêmes images que Enfant.jsx
BUZZ = [20, 48, 70, 84, 98]


def note_boite(f0, d=1.4, vol=1.0):
    """note de boîte à musique (cloche métallique)"""
    tt = ts(d)
    son = np.sin(2 * np.pi * f0 * tt) + 0.4 * np.sin(2 * np.pi * f0 * 2.76 * tt) * np.exp(-tt * 6) + 0.2 * np.sin(2 * np.pi * f0 * 5.4 * tt) * np.exp(-tt * 12)
    return son * np.exp(-tt * 3.2) * env(len(tt), 0.002, 0.05) * vol


def boite_a_musique(t0, t1, vol, desaccord=0.0):
    # « Ah vous dirai-je maman », lente, qui se désaccorde
    MEL = [0, 0, 7, 7, 9, 9, 7, None, 5, 5, 4, 4, 2, 2, 0, None]
    base = 1046.5
    t = t0
    k = 0
    while t < min(t1, DUREE):
        n = MEL[k % len(MEL)]
        if n is not None:
            f0 = base * 2 ** (n / 12) * (1 + desaccord * (rng.random() - 0.5) * 0.06)
            pose(note_boite(f0, 1.4, 1), t, vol)
        t += 0.42 + desaccord * rng.uniform(0, 0.12)
        k += 1


def tonnerre(t0, vol):
    d = 3.2
    tt = ts(d)
    r = filtre(bruit(d), "lowpass", 140) * (np.exp(-tt * 1.1) + 0.6 * np.exp(-((tt - 0.5) ** 2) * 8))
    pose(r, t0, vol)
    pose(filtre(bruit(0.3), "highpass", 1200) * np.exp(-ts(0.3) * 14), t0 - 0.05, vol * 0.4)


def vibre_table(t0, vol):
    """vibreur posé sur du bois : bourdonnement + petits chocs"""
    d = 0.45
    tt = ts(d)
    son = (np.sin(2 * np.pi * 170 * tt) + 0.6 * np.sign(np.sin(2 * np.pi * 85 * tt)) * 0.3) * env(len(tt), 0.01, 0.05)
    pose(son, t0, vol)
    pose(filtre(bruit(d), "bandpass", [200, 900]) * env(len(tt), 0.01, 0.05) * (np.sin(2 * np.pi * 42 * tt) > 0), t0, vol * 0.5)


def ding(t0, vol):
    for j, f0 in enumerate((1568, 2093)):
        pose(note_boite(f0, 0.5, 1), t0 + j * 0.09, vol)


def souffle_bp(t0, t1, vol):
    """souffle du haut-parleur du babyphone"""
    d = min(t1, DUREE) - t0
    if d <= 0:
        return
    pose(filtre(bruit(d), "bandpass", [1500, 6000]) * env(int(d * SR), 0.1, 0.1), t0, vol)


def chuchotis(t0, d, vol, grave=False):
    """chuchotement indistinct (bruit filtré modulé comme des syllabes)"""
    tt = ts(d)
    syl = np.clip(np.sin(2 * np.pi * (3.1 if not grave else 2.2) * tt) * np.sin(2 * np.pi * 0.7 * tt + 1), 0, 1) ** 1.5
    band = [300, 1200] if grave else [1800, 6000]
    pose(filtre(bruit(d), "bandpass", band) * syl * env(len(tt), 0.1, 0.2), t0, vol)


def grince(t0, d, vol, f0=180):
    tt = ts(d)
    fr = f0 + 60 * np.sin(2 * np.pi * 1.3 * tt) + 40 * rng.standard_normal(len(tt)).cumsum() / np.sqrt(len(tt)) * 0
    son = np.sign(np.sin(2 * np.pi * np.cumsum(fr) / SR)) * 0.3 * (0.6 + 0.4 * np.sin(2 * np.pi * 11 * tt))
    pose(filtre(son, "bandpass", [300, 2500]) * env(len(tt), 0.05, 0.2), t0, vol)


def pas_bois(t0, vol):
    d = 0.16
    pose(np.sin(2 * np.pi * 95 * ts(d)) * np.exp(-ts(d) * 24) + filtre(bruit(d), "bandpass", [200, 1500]) * np.exp(-ts(d) * 30) * 0.6, t0, vol)


# ---------- la pluie (toujours là), plus forte dehors ; le tonnerre après chaque éclair ----------
pluie = filtre(bruit(DUREE), "bandpass", [700, 9000]) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.13 * tt_))
k = np.full(len(sfx), 0.022)
a_, b_ = int(fin("dodo") * SR), int(bornes("dodo")[1] * SR)
k[a_:b_] = 0.06
sfx[: len(pluie)] += pluie * k[: len(pluie)]
for e in ECLAIRS:
    if e / FPS < DUREE:
        tonnerre(e / FPS + 0.35, 0.22)

# ---------- 1. le téléphone vibre sur la table : 5 fois, de plus en plus vite ; puis on le prend ----------
for j, b in enumerate(BUZZ):
    vibre_table(b / FPS, 0.16)
    ding(b / FPS + 0.02, 0.03)
bb = bornes("alerte")
pose(filtre(bruit(0.5), "bandpass", [300, 2000]) * np.sin(np.pi * ts(0.5) / 0.5), bb[1] - 0.05, 0.05)  # on le saisit
tap = rep("alerte", "cest")
pose(filtre(bruit(0.03), "highpass", 2000) * np.exp(-ts(0.03) * 80), tap, 0.06)
pose(sum(np.sin(2 * np.pi * f_ * ts(2.5)) for f_ in (55, 58.3)) * env(int(2.5 * SR), 0.3, 1) / 2, rep("alerte", "surtout") - 0.2, 0.09)
# TV allumée en sourdine dans les scènes du salon
for nom in ("alerte", "canape", "chuchote", "voix", "ecran", "message"):
    if ok(nom):
        d = fin_scene(nom) - fin(nom)
        pose(filtre(bruit(d), "bandpass", [250, 2200]) * (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 2.3 * ts(d)) * np.sin(2 * np.pi * 0.9 * ts(d)))) * env(int(d * SR), 0.2, 0.2), fin(nom), 0.012)

# ---------- 2. la chambre : la boîte à musique de la veilleuse ----------
if ok("dodo"):
    boite_a_musique(rep("dodo", "allumes"), fin_scene("dodo"), 0.018)
    pas_bois(rep("dodo", "prends") + 0.6, 0.06)
    pas_bois(rep("dodo", "prends") + 1.1, 0.06)

# ---------- 3-4. le babyphone : souffle, chuchotements de Léna, petit rire ----------
if ok("canape"):
    souffle_bp(bornes("canape")[1], fin_scene("chuchote"), 0.012)
    chuchotis(rep("canape", "entends") - 0.2, fin_scene("canape") - rep("canape", "entends") + 0.2, 0.05)
if ok("chuchote"):
    chuchotis(fin("chuchote"), rep("chuchote", "chut") - fin("chuchote"), 0.06)
    for j in range(4):
        d = 0.09
        pose(np.sin(2 * np.pi * 1400 * ts(d)) * np.sin(np.pi * ts(d) / d) * 0.5, rep("chuchote", "rigole") + j * 0.12, 0.015)
    boite_a_musique(bornes("chuchote")[1], fin_scene("chuchote"), 0.012, 0.3)
    coeur(rep("chuchote", "chut"), fin_scene("chuchote"), 0.6, 0.1)

# ---------- 5. l'escalier en courant, la porte qui s'ouvre, la chambre calme ----------
if ok("escalier"):
    b = bornes("escalier")
    t = b[0]
    while t < b[1]:
        pas_bois(t, 0.13)
        t += 0.2
    grince(rep("escalier", "ouvres") - 0.05, 0.7, 0.03, 220)
    boite_a_musique(b[2], fin_scene("escalier"), 0.015)

# ---------- 6. le babyphone grésille, une voix d'homme murmure ----------
if ok("voix"):
    tg = rep("voix", "grésille")
    d = fin_scene("voix") - tg
    pose(filtre(bruit(d), "bandpass", [1000, 7000]) * (rng.random(int(d * SR)) > 0.4) * env(int(d * SR), 0.02, 0.3), tg - 0.1, 0.06)
    chuchotis(rep("voix", "murmure") - 0.4, 1.6, 0.07, grave=True)
    pose(sum(np.sin(2 * np.pi * f_ * ts(3)) for f_ in (49, 52)) * env(int(3 * SR), 0.2, 1.2) / 2, rep("voix", "dhomme"), 0.12)

# ---------- 7. le moteur de la caméra qui pivote toute seule ----------
if ok("ecran"):
    souffle_bp(fin("ecran"), fin_scene("ecran"), 0.012)
    t0 = rep("ecran", "caméra")
    t1 = rep("ecran", "ouverte") - 0.2
    d = t1 - t0
    tt = ts(d)
    pose(np.sin(2 * np.pi * np.cumsum(620 + 40 * np.sin(2 * np.pi * 3 * tt)) / SR) * 0.4 * env(len(tt), 0.1, 0.1) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * tt)), t0, 0.025)
    pose(sum(np.sin(2 * np.pi * f_ * ts(2.5)) for f_ in (98, 103.8, 146.8)) * env(int(2.5 * SR), 0.05, 1.2) / 3, rep("ecran", "ouverte"), 0.12)

# ---------- 8. le sixième message ----------
if ok("message"):
    t6 = rep("message", "vibre") - 0.15
    vibre(t6, 0.12)
    ding(t6 + 0.02, 0.03)
    pose(filtre(bruit(0.03), "highpass", 2000) * np.exp(-ts(0.03) * 80), rep("message", "mère") + 0.07, 0.06)
    frappe(rep("message", "on") - 1.0, rep("message", "on") - 0.05, 0.03)
    pop(rep("message", "on"), 0.08)
    pose(sum(np.sin(2 * np.pi * f_ * ts(3)) for f_ in (73.4, 77.8)) * env(int(3 * SR), 0.1, 1.5) / 2, rep("message", "léna"), 0.12)

# ---------- 9-10. la respiration sous la couette, la main, la trappe qui grince, « il arrive » ----------
if ok("lit"):
    b = bornes("lit")
    t = b[0]
    while t < b[1]:
        pas_bois(t, 0.06)
        t += 0.45
    t = b[1]
    while t < fin_scene("lit"):
        d = 1.6
        pose(filtre(bruit(d), "bandpass", [150, 900]) * np.sin(np.pi * ts(d) / d) ** 2, t, 0.06)
        t += 1.9
    boite_a_musique(b[1], fin_scene("trappe"), 0.012, 0.8)
    coeur(b[1], fin_scene("couette"), 0.55, 0.11)
if ok("trappe"):
    grince(rep("trappe", "trappe") - 0.1, 1.6, 0.05, 150)
    for j in range(8):
        pose(filtre(bruit(0.05), "highpass", 3000) * np.exp(-ts(0.05) * 40), rep("trappe", "grince") + j * 0.2, 0.01)

# ---------- 11. la couette se soulève… SCREAMER ----------
if ok("couette"):
    d = fin_scene("couette") - fin("couette")
    pose(filtre(bruit(d), "bandpass", [200, 2000]) * np.linspace(0.2, 1, int(d * SR)), fin("couette"), 0.05)
    a_ = int((fin("couette") + 0.05) * SR)
    b_ = int((fin_scene("couette") - 0.4) * SR)
    sfx[a_:b_] *= 0.15
    impact(fin_scene("couette") - 0.36, 0.7)
if ok("dilemme"):
    coeur(fin("dilemme"), DUREE, 0.5, 0.12)
    boite_a_musique(fin("dilemme"), DUREE, 0.012, 1.0)

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
