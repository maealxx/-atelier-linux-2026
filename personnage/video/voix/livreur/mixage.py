"""Bruitages de « Le livreur » + voix off, calés sur src/livreur/timeline.json, plans.json et voix/livreur/mots.json.
Usage : python3 voix/livreur/mixage.py <sortie.wav>"""
import json, os, re, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, resample_poly, sosfilt

SR = 48000
ici = os.path.dirname(os.path.abspath(__file__))
src = f"{ici}/../../src/livreur"
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



def repere(nom, mot_, defaut):
    """Repère (en secondes, absolu) calé par caler_voix.py dans timeline.json."""
    for s in tl["scenes"]:
        if s["nom"] == nom:
            return debut[nom] + s.get("reperes", {}).get(mot_, defaut) / FPS
    raise KeyError(nom)


def frame(nom, k):
    return debut[nom] + k / FPS


# ---------- la TV du salon (étouffée), coupée quand il revient au judas ----------
fin_tv = debut["vide"]
d = fin_tv
tt = ts(d)
syll = (0.5 + 0.5 * np.sin(2 * np.pi * 4.3 * tt + 2 * np.sin(2 * np.pi * 0.7 * tt))) * (np.sin(2 * np.pi * 0.23 * tt) > -0.6)
parole = filtre(bruit(d), "bandpass", [250, 2200]) * syll
musique = sum(np.sin(2 * np.pi * f_ * tt) for f_ in (196, 247, 294)) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.5 * tt)) * 0.2
rires = np.zeros_like(tt)
for t0 in np.arange(1.5, d - 1, 4.7):
    i = int(t0 * SR)
    n = min(len(tt) - i, int(0.8 * SR))
    rires[i : i + n] += filtre(rng.standard_normal(n), "bandpass", [600, 1800]) * (np.sign(np.sin(2 * np.pi * 6 * ts(n / SR))) * 0.5 + 0.5) * np.hanning(n)
tv = filtre(parole + musique + 0.6 * rires, "lowpass", 2500)
# la TV est plus forte dans le salon, plus faible quand on est au judas ou à la fenêtre
niveau = np.interp(tt, [0, debut["judas"], debut["judas"] + 0.5, debut["fenetre"], debut["fenetre"] + 0.5, fin_tv], [1, 1, 0.55, 0.55, 0.3, 0.3])
pose(tv * niveau * env(len(tt), 0.05, 0.05), 0, 0.045)
# frigo / ventilation de l'appart
pose((np.sin(2 * np.pi * 60 * tt) * 0.5 + filtre(bruit(d), "lowpass", 150)) * env(len(tt), 0.5, 0.5), 0, 0.012)

# ---------- swoosh à chaque coupe ----------
for nom in debut:
    for c in bornes(nom)[1:-1] + ([debut[nom]] if debut[nom] > 0 else []):
        d = 0.26
        pose(filtre(bruit(d), "bandpass", [700, 5000]) * np.sin(np.pi * ts(d) / d) ** 2, c - 0.13, 0.028)


# ---------- coups contre la porte ----------
def coup(t0, vol):
    d = 0.3
    pose(filtre(bruit(d), "lowpass", 600) * np.exp(-ts(d) * 22) + 1.2 * np.sin(2 * np.pi * 95 * ts(d)) * np.exp(-ts(d) * 26), t0, vol)


k0 = repere("coups", "toque", 58)
for k in range(3):
    coup(k0 + k * 7 / FPS, 0.3)
r1 = repere("prenom", "retoque", 8)
for k in range(3):
    coup(r1 + k * 6 / FPS, 0.24)
r2 = repere("prenom", "plus", 28)
for k in range(3):
    coup(r2 + (2 + k * 6) / FPS, 0.42)


# ---------- téléphone : vibreur, notification, frappe, bulles ----------
def vibre(t0):
    for k in range(2):
        d = 0.35
        pose(np.sign(np.sin(2 * np.pi * 160 * ts(d))) * env(int(d * SR), 0.01, 0.05), t0 + k * 0.5, 0.025)


def notif(t0):
    for k, f_ in enumerate((1568, 2093)):
        d = 0.35
        pose(np.sin(2 * np.pi * f_ * ts(d)) * np.exp(-ts(d) * 10), t0 + k * 0.09, 0.035)


def frappe(t0, t1):
    t = t0
    while t < t1:
        clic(t, 0.025, rng.uniform(3500, 5500), 0.012)
        t += rng.uniform(0.07, 0.16)


def bulle(t0, vol=0.06):
    d = 0.08
    pose(np.sin(2 * np.pi * (500 + 4000 * ts(d)) * ts(d)) * np.exp(-ts(d) * 50), t0, vol)


v1 = repere("message", "vibre", 56)
vibre(v1)
notif(v1)
m1 = repere("message", "jarrive", 101)
frappe(max(m1 - 32 / FPS, bornes("message")[2]), m1 - 0.05)
bulle(m1)
v2 = repere("message2", "vibre", 23)
vibre(v2)
notif(v2)
m2 = repere("message2", "je", 49)
frappe(m2 - 32 / FPS, m2 - 0.05)
bulle(m2)
# le BIP d'alerte : sec, strident
tb = repere("alerte", "bipe", 28)
for k in range(2):
    d = 0.16
    pose(np.sign(np.sin(2 * np.pi * 2900 * ts(d))) * env(int(d * SR), 0.003, 0.02), tb + k * 0.2, 0.05)
m3 = repere("alerte", "ne", 80)
frappe(m3 - 32 / FPS, m3 - 0.05)
pose(np.sin(2 * np.pi * 70 * ts(1.5)) * np.exp(-ts(1.5) * 2) + filtre(bruit(1.5), "lowpass", 120) * np.exp(-ts(1.5) * 3), m3, 0.22)

# ---------- le palier : néon qui grésille (vu par le judas) ----------
for nom in ("judas", "vide"):
    d = duree[nom]
    tt = ts(d)
    hum = (np.sin(2 * np.pi * 100 * tt) + 0.4 * np.sin(2 * np.pi * 200 * tt)) * (rng.random(len(tt)) > 0.002)
    craq = filtre(bruit(d), "highpass", 3000) * (rng.random(len(tt)) > 0.9985)
    pose((hum + 3 * craq) * env(len(tt), 0.2, 0.2), debut[nom], 0.008 if nom == "judas" else 0.006)
# les néons qui claquent en s'éteignant
b = bornes("vide")
for n in range(3):
    t0 = b[2] + (6 + n * 7) / FPS
    clic(t0, 0.14, 1800, 0.05)
    pose(filtre(bruit(0.4), "lowpass", 400) * np.exp(-ts(0.4) * 12), t0, 0.05)
# il recule
cycle_pas(bornes("prenom")[4], bornes("prenom")[5], 0.25, 0.08)
cycle_pas(debut["judas"], bornes("judas")[1], 0.32, 0.08)
cycle_pas(debut["fenetre"], bornes("fenetre")[1], 0.32, 0.08)
cycle_pas(debut["vide"], bornes("vide")[1], 0.34, 0.09)

# ---------- la rue : vent, circulation lointaine, scooter au ralenti ----------
d0, d1 = bornes("fenetre")[2], debut["alerte"]
d = d1 - d0
tt = ts(d)
rue = filtre(bruit(d), "bandpass", [150, 900]) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * tt)) + 0.5 * filtre(bruit(d), "lowpass", 90)
scoot = filtre(np.sign(np.sin(2 * np.pi * 24 * tt)) * (0.7 + 0.3 * np.sin(2 * np.pi * 3 * tt)), "lowpass", 400)
pose((rue + 0.35 * scoot) * env(len(tt), 0.15, 0.3), d0, 0.05)
# vertige au moment de la plongée
dd = 1.2
pose(np.sin(2 * np.pi * np.cumsum(np.linspace(300, 120, int(dd * SR))) / SR) * env(int(dd * SR), 0.3, 0.6), d0, 0.02)
# la chose sur la façade : craquements
t0 = repere("arrete", "regarde", 89)
for k in range(5):
    clic(t0 + 0.3 + k * 0.23 + rng.uniform(0, 0.06), 0.06, rng.uniform(900, 2000), 0.04)
dd = 2.0
pose(filtre(bruit(dd), "lowpass", 300) * np.sin(np.pi * ts(dd) / dd), repere("arrete", "au-dessus", 127) - 0.3, 0.06)

# ---------- le BOUM dans la chambre, le cadre qui tombe, l'ombre ----------
tB = bornes("bruit")[1]
boom(tB, 0.4)
pose(filtre(bruit(0.5), "lowpass", 800) * np.exp(-ts(0.5) * 9), tB, 0.25)
tv_ = tB + 12 / FPS
pose(filtre(bruit(0.6), "highpass", 2500) * np.exp(-ts(0.6) * 7), tv_, 0.12)
for k in range(8):
    clic(tv_ + 0.03 + k * 0.05 + rng.uniform(0, 0.03), 0.08, rng.uniform(3000, 7000), 0.03)
to = repere("bruit", "ombre", 94)
dd = 1.2
pose(filtre(bruit(dd), "lowpass", 260) * np.sin(np.pi * ts(dd) / dd), to, 0.09)

# ---------- la porte de la chambre qui grince, la révélation ----------
tp = repere("chambre", "pousses", 37)
dd = 1.6
cr = np.sin(2 * np.pi * np.cumsum(np.linspace(240, 130, int(dd * SR))) / SR) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 17 * ts(dd))))
pose(filtre(cr, "bandpass", [120, 2200]) * env(int(dd * SR), 0.1, 0.4), tp, 0.045)
tl_ = repere("chambre", "là", 82)
boom(tl_ - 0.05, 0.4)
dd = 1.1
cri = np.sin(2 * np.pi * np.cumsum(np.linspace(1400, 700, int(dd * SR)) + 90 * np.sin(2 * np.pi * 9 * ts(dd))) / SR)
pose(filtre(cri + 0.4 * bruit(dd), "bandpass", [500, 4000]) * env(int(dd * SR), 0.02, 0.5), tl_ - 0.05, 0.05)
for k in range(8):
    clic(tl_ - 0.25 + k * 0.06 + rng.uniform(0, 0.03), 0.12, rng.uniform(1200, 3000), 0.035)

# ---------- dilemme : griffes au plafond, cœur, grognement ----------
t = debut["dilemme"]
while t < DUREE:
    clic(t, 0.05, rng.uniform(2500, 4500), 0.02)
    t += rng.uniform(0.08, 0.2)
t = debut["dilemme"]
while t < DUREE:
    for dt in (0, 0.18):
        dd = 0.15
        pose(np.sin(2 * np.pi * 55 * ts(dd)) * np.exp(-ts(dd) * 22), t + dt, 0.22)
    t += 0.7
d = DUREE - debut["chambre"]
saw = 2 * ((ts(d) * (46 + 5 * np.sin(2 * np.pi * 0.6 * ts(d)))) % 1) - 1
pose(filtre(saw + 0.5 * bruit(d), "lowpass", 350) * env(int(d * SR), 0.5, 1), debut["chambre"], 0.05)

# ---------- pulsation grave qui accélère (du prénom au dilemme), coupée pendant le silence ----------
t = debut["prenom"]
while t < debut["dilemme"]:
    if not (debut["vide"] + 1.5 < t < debut["bruit"] + 1.0):
        k = (t - debut["prenom"]) / (debut["dilemme"] - debut["prenom"])
        dd = 0.25
        pose(np.sin(2 * np.pi * (70 - 30 * ts(dd) / dd) * ts(dd)) * np.exp(-ts(dd) * 14), t, 0.05 + 0.08 * k)
    t += 0.9 - 0.4 * (t - debut["prenom"]) / (debut["dilemme"] - debut["prenom"])

# ---------- voix + baisse des bruitages sous la voix ----------
a, sr = sf.read(f"{ici}/../{tl['voix']}")
a = resample_poly(a, SR, sr) if sr != SR else a
voix[: len(a)] += a
n = len(voix) // 480
e = np.convolve(np.sqrt(np.mean(voix[: n * 480].reshape(n, 480) ** 2, axis=1)), np.ones(15) / 15, mode="same")
sfx[: n * 480] *= np.repeat(1 - 0.45 * np.clip(e / 0.08, 0, 1), 480)

mix = (voix + sfx)[: int(DUREE * SR)]
mix /= max(1.0, np.abs(mix).max() / 0.9)
sf.write(sys.argv[1], np.stack([mix, mix], 1).astype(np.float32), SR)
print("ok", round(DUREE, 2), "s", "crête voix", round(np.abs(voix).max(), 2), "crête bruitages", round(np.abs(sfx).max(), 2))
