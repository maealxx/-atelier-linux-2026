"""Bruitages de « La soirée » + voix off, calés sur src/soiree/timeline.json, plans.json et voix/soiree/mots.json.
Usage : python3 voix/soiree/mixage.py <sortie.wav>"""
import json, os, re, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, resample_poly, sosfilt

SR = 48000
ici = os.path.dirname(os.path.abspath(__file__))
src = f"{ici}/../../src/soiree"
tl = json.load(open(f"{src}/timeline.json"))
plans = json.load(open(f"{src}/plans.json"))
mots = json.load(open(f"{ici}/mots.json"))
FPS = tl["fps"]
debut, t = {}, 0.0
for s in tl["scenes"]:
    debut[s["nom"]] = t
    t += s["frames"] / FPS
DUREE = t
duree = {s["nom"]: s["frames"] / FPS for s in tl["scenes"]}
rng = np.random.default_rng(13)
voix = np.zeros(int(DUREE * SR) + SR)
sfx = np.zeros_like(voix)


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


def mot(m, apres=0.0):
    """Début du premier mot qui contient `m` après le temps `apres`."""
    for a, b, w in mots:
        if a >= apres and m in re.sub(r"[^\w-]", "", w.lower()):
            return a
    raise KeyError(m)


def bornes(nom):
    w = plans[nom]
    b, out = 0.0, [debut[nom]]
    for x in w:
        b += x / sum(w) * duree[nom] * FPS
        out.append(debut[nom] + round(b) / FPS)
    return out


# ---------- briques sonores ----------
def clic(t0, vol, f=3000, d=0.03):
    pose(filtre(bruit(d), "bandpass", [f * 0.6, f * 1.6]) * np.exp(-ts(d) * 120), t0, vol)


def metal(t0, vol):
    d = 0.9
    tt = ts(d)
    s = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * k) for f, k in [(310, 6), (742, 9), (1190, 12), (1730, 16)])
    pose((s / 4 + 0.6 * filtre(bruit(d), "bandpass", [1500, 6000]) * np.exp(-tt * 40)), t0, vol)


def pas(t0, vol=0.09):
    d = 0.09
    pose(filtre(bruit(d), "lowpass", 500) * np.exp(-ts(d) * 45), t0, vol)


def cycle_pas(t0, t1, vitesse, vol):
    periode = np.pi / vitesse / FPS
    t = t0 + periode / 2
    while t < t1:
        pas(t, vol)
        t += periode


def boom(t0, vol):
    d = 2.2
    pose(np.sin(2 * np.pi * (52 - 14 * ts(d)) * ts(d)) * np.exp(-ts(d) * 2) + filtre(bruit(d), "lowpass", 140) * np.exp(-ts(d) * 3), t0, vol)


# ---------- musique de fête étouffée (on est dehors), coupée net à la coupure de courant ----------
coupure = mot("séteignent", 0)
d = coupure
tt = ts(d)
beat = np.zeros_like(tt)
for k in range(int(d * 2.1) + 1):
    t0 = k / 2.1
    i = int(t0 * SR)
    n = min(len(tt) - i, int(0.25 * SR))
    if n > 0:
        beat[i : i + n] += np.sin(2 * np.pi * (60 - 25 * ts(n / SR)) * ts(n / SR)) * np.exp(-ts(n / SR) * 12)
basse = 0.5 * np.sign(np.sin(2 * np.pi * 55 * tt)) * (0.5 + 0.5 * np.sin(2 * np.pi * 2.1 * tt))
accords = sum(np.sin(2 * np.pi * f_ * tt) for f_ in (220, 277, 330)) * 0.25 * (0.5 + 0.5 * np.sin(2 * np.pi * 1.05 * tt))
musique = filtre(beat + basse + accords + 0.15 * bruit(d), "lowpass", 600)
pose(musique * env(len(tt), 0.3, 0.02), 0, 0.17)
# voix lointaines de la fête
pose(filtre(bruit(d), "bandpass", [300, 1200]) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 0.7 * tt))) * env(len(tt), 0.3, 0.02), 0, 0.03)
# éclats de rire et cris de fête
for t_ in np.arange(0.3, coupure - 0.3, 0.55) + rng.uniform(0, 0.3, len(np.arange(0.3, coupure - 0.3, 0.55))):
    dd = rng.uniform(0.25, 0.5)
    f0 = rng.uniform(500, 1100)
    rire = filtre(bruit(dd), "bandpass", [f0, f0 * 2.2]) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * rng.uniform(5, 8) * ts(dd))))
    pose(rire * env(int(dd * SR), 0.02, 0.1), t_, 0.035)
# le « clac » du courant qui saute
pose(filtre(bruit(0.3), "lowpass", 900) * np.exp(-ts(0.3) * 15), coupure, 0.2)

# ---------- grillons + vent après la coupure ----------
d = DUREE - coupure
tt = ts(d)
grillon = np.sin(2 * np.pi * 4300 * tt) * (np.sin(2 * np.pi * 30 * tt) > 0.6) * (np.sin(2 * np.pi * 0.9 * tt) > -0.2)
pose(grillon * env(len(tt), 0.5, 0.5), coupure + 0.4, 0.008)
pose(filtre(bruit(d), "bandpass", [200, 700]) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * tt)) * env(len(tt), 1, 1), coupure, 0.015)
nappe = 0.5 * np.sin(2 * np.pi * 46 * tt) + 0.4 * filtre(bruit(d), "lowpass", 200)
monte = np.interp(tt + coupure, [coupure, debut["hote"], debut["revelation"] + 1, DUREE], [0.8, 1.3, 2.4, 2.2])
pose(nappe * monte * env(len(tt), 1.5, 1), coupure, 0.03)

# ---------- swoosh à chaque coupe ----------
for nom in debut:
    for c in bornes(nom)[1:-1] + ([debut[nom]] if debut[nom] > 0 else []):
        d = 0.26
        pose(filtre(bruit(d), "bandpass", [700, 5000]) * np.sin(np.pi * ts(d) / d) ** 2, c - 0.13, 0.03)

# ---------- pas sur la terrasse / dans l'herbe ----------
cycle_pas(0, 2.0, 0.3, 0.07)
cycle_pas(debut["portail"], debut["portail"] + duree["portail"] * 0.75, 0.35, 0.06)

# ---------- trois coups contre la vitre ----------
def coup(t0, vol):
    d = 0.25
    pose(filtre(bruit(d), "lowpass", 700) * np.exp(-ts(d) * 25) + np.sin(2 * np.pi * 120 * ts(d)) * np.exp(-ts(d) * 30), t0, vol)
coup(mot("frappes", debut["vitre"]) + 0.15, 0.08)
t = debut["vitre"]
for m_ in ("trois", "coups", "retour"):
    t = mot(m_, t)
    coup(t, 0.22)

# ---------- téléphone : vibrations et « ding » des messages ----------
def vibre(t0):
    for k in range(2):
        d = 0.35
        pose(np.sign(np.sin(2 * np.pi * 160 * ts(d))) * env(int(d * SR), 0.01, 0.05), t0 + k * 0.5, 0.025)
def ding(t0):
    d = 0.5
    pose((np.sin(2 * np.pi * 1320 * ts(d)) + 0.5 * np.sin(2 * np.pi * 1980 * ts(d))) * np.exp(-ts(d) * 9), t0, 0.04)
vibre(mot("vibre", debut["message"]))
ding(mot("on", debut["message"]) - 0.1)
ding(mot("surtout", debut["message"]) - 0.1)
vibre(debut["message2"] + 0.1)
ding(mot("celui", debut["message2"]) - 0.1)

def notif(t0):
    """carillon de notification sur l'écran verrouillé"""
    for k, f_ in enumerate((1568, 2093)):
        d = 0.35
        pose(np.sin(2 * np.pi * f_ * ts(d)) * np.exp(-ts(d) * 10), t0 + k * 0.09, 0.035)
def frappe(t0, t1):
    """petits clics de « Lucas écrit… »"""
    t = t0
    while t < t1:
        clic(t, 0.025, rng.uniform(3500, 5500), 0.012)
        t += rng.uniform(0.07, 0.16)
def bulle(t0):
    d = 0.08
    pose(np.sin(2 * np.pi * (500 + 4000 * ts(d)) * ts(d)) * np.exp(-ts(d) * 50), t0, 0.06)
def declic(t0):
    clic(t0, 0.1, 3000, 0.02)
    pose(filtre(bruit(0.12), "bandpass", [1500, 6000]) * np.exp(-ts(0.12) * 30), t0 + 0.06, 0.05)
    clic(t0 + 0.14, 0.08, 2200, 0.02)

notif(debut["message"] + 12 / FPS)
notif(debut["message2"] + 4 / FPS)
for m_, nom in (("on", "message"), ("surtout", "message"), ("celui", "message2")):
    t1 = mot(m_, debut[nom])
    frappe(t1 - 32 / FPS, t1 - 0.05)
    bulle(t1)
declic(mot("celui", debut["message2"]) + 0.05)

# ---------- fenêtres : un coup sourd par fenêtre qui s'allume, craquement quand les têtes se tordent ----------
for n in range(20):
    t0 = debut["fenetres"] + (4 + n * 6) / FPS
    if t0 < debut["fenetres"] + duree["fenetres"] - 0.75:
        dd = 0.3
        pose(np.sin(2 * np.pi * (75 - 30 * ts(dd)) * ts(dd)) * np.exp(-ts(dd) * 14) + 0.3 * filtre(bruit(dd), "lowpass", 300) * np.exp(-ts(dd) * 20), t0, 0.07 + 0.004 * n)
t0 = debut["fenetres"] + duree["fenetres"] - 22 / FPS
for k in range(6):
    clic(t0 + k * 0.045 + rng.uniform(0, 0.02), 0.16, rng.uniform(1200, 3000), 0.04)
boom(t0, 0.18)

# ---------- la porte s'ouvre + musique lointaine à l'intérieur ----------
t0 = mot("porte", debut["porte"]) + 0.3
dd = 1.5
cr = np.sin(2 * np.pi * np.cumsum(np.linspace(240, 130, int(dd * SR))) / SR) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 17 * ts(dd))))
pose(filtre(cr, "bandpass", [120, 2200]) * env(int(dd * SR), 0.1, 0.4), t0, 0.05)
d = DUREE - t0
tt = ts(d)
lointain = filtre(np.sin(2 * np.pi * 330 * tt) * (np.sin(2 * np.pi * 1.6 * tt) > 0) + 0.5 * np.sin(2 * np.pi * 262 * tt), "lowpass", 500)
pose(lointain * (0.6 + 0.4 * np.sin(2 * np.pi * 0.3 * tt)) * env(len(tt), 1, 1), t0, 0.006)

# ---------- chaîne + cadenas ----------
t0 = mot("cadenassé", debut["portail"]) - 0.4
for k in range(9):
    clic(t0 + k * 0.06 + rng.uniform(0, 0.03), 0.06, rng.uniform(2500, 5000), 0.05)

# ---------- l'hôte : le lampadaire grésille, le masque tombe, la bouche se déchire, les marches ----------
d = duree["hote"] + duree["revelation"]
pose(filtre(bruit(d), "bandpass", [2000, 6000]) * (rng.random(int(d * SR)) > 0.97) * env(int(d * SR), 0.2, 0.2), debut["hote"], 0.04)
boom(mot("lhôte", debut["hote"]) - 0.15, 0.18)
t0 = mot("dessous", debut["revelation"])
pose(filtre(bruit(0.2), "lowpass", 500) * np.exp(-ts(0.2) * 20), t0 - 0.2, 0.15)
tb = mot("bouche", debut["revelation"])
dd = 1.0
pose(filtre(bruit(dd), "bandpass", [250, 1600]) * np.sin(np.pi * ts(dd) / dd), tb, 0.09)
for k in range(6):
    clic(tb + k * 0.09 + rng.uniform(0, 0.03), 0.12, rng.uniform(1500, 3000), 0.035)
boom(mot("ventre", debut["revelation"]) - 0.05, 0.28)
td = mot("descend", debut["revelation"])
for k in range(3):
    pas(td + 0.15 + k * 0.4, 0.25)

# ---------- battements de cœur + grognement ----------
t = debut["dilemme"]
while t < DUREE:
    for dt in (0, 0.18):
        dd = 0.15
        pose(np.sin(2 * np.pi * 55 * ts(dd)) * np.exp(-ts(dd) * 22), t + dt, 0.2)
    t += 0.8
d = DUREE - debut["revelation"]
saw = 2 * ((ts(d) * (44 + 5 * np.sin(2 * np.pi * 0.6 * ts(d)))) % 1) - 1
pose(filtre(saw + 0.5 * bruit(d), "lowpass", 330) * env(int(d * SR), 0.5, 1), debut["revelation"], 0.05)

# ---------- pulsation grave qui accélère (des fenêtres jusqu'au dilemme) ----------
t = debut["fenetres"]
while t < debut["dilemme"]:
    k = (t - debut["fenetres"]) / (debut["dilemme"] - debut["fenetres"])
    dd = 0.25
    pose(np.sin(2 * np.pi * (70 - 30 * ts(dd) / dd) * ts(dd)) * np.exp(-ts(dd) * 14), t, 0.05 + 0.08 * k)
    t += 0.85 - 0.4 * k

# ---------- voix + baisse des bruitages sous la voix ----------
a, sr = sf.read(f"{ici}/../{tl['voix']}")
a = resample_poly(a, SR, sr) if sr != SR else a
voix[: len(a)] += a
n = len(voix) // 480
e = np.convolve(np.sqrt(np.mean(voix[: n * 480].reshape(n, 480) ** 2, axis=1)), np.ones(15) / 15, mode="same")
sfx[: n * 480] *= np.repeat(1 - 0.45 * np.clip(e / 0.08, 0, 1), 480)

mix = (voix + sfx)[: int(DUREE * SR)]
mix /= max(1.0, np.abs(mix).max() / 0.85)
sf.write(sys.argv[1], np.stack([mix, mix], 1).astype(np.float32), SR)
print("ok", round(DUREE, 2), "s", "crête voix", round(np.abs(voix).max(), 2), "crête bruitages", round(np.abs(sfx).max(), 2))
