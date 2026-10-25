"""Bruitages de « Salle zéro » + voix off, calés sur src/salle-zero/timeline.json, plans.json et voix/salle-zero/mots.json.
Usage : python3 voix/salle-zero/mixage.py <sortie.wav>"""
import json, os, re, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, resample_poly, sosfilt

SR = 48000
ici = os.path.dirname(os.path.abspath(__file__))
src = f"{ici}/../../src/salle-zero"
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
rng = np.random.default_rng(11)
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


# ---------- ambiance : bourdonnement du bâtiment, plus lourd à la fin ----------
tt = ts(DUREE)
nappe = 0.5 * np.sin(2 * np.pi * 50 * tt) + 0.4 * np.sin(2 * np.pi * 53.5 * tt) + 0.4 * filtre(bruit(DUREE), "lowpass", 220)
monte = np.interp(tt, [0, debut["surveillant"], debut["retourne"] + 1, DUREE], [1, 1.3, 2.4, 2.2])
pose(nappe * monte * env(len(tt), 1.5, 1.5), 0, 0.03)

# ---------- swoosh à chaque coupe ----------
for nom in debut:
    for c in bornes(nom)[1:-1] + ([debut[nom]] if debut[nom] > 0 else []):
        d = 0.26
        pose(filtre(bruit(d), "bandpass", [700, 5000]) * np.sin(np.pi * ts(d) / d) ** 2, c - 0.13, 0.03)

# ---------- 1-2. horloge ----------
t = 0.2
while t < debut["tableau"]:
    clic(t, 0.05, 2600, 0.025)
    t += 1.0

# ---------- 3. craie qui crisse, puis qui tombe ----------
b = bornes("tableau")
d = b[1] - b[0] - 0.1
crisse = filtre(bruit(d), "bandpass", [2200, 4200]) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 7 * ts(d))))
pose(crisse * env(int(d * SR), 0.05, 0.1), b[0] + 0.1, 0.03)
clic(b[1] + 0.45, 0.12, 4200, 0.04)
clic(b[1] + 0.6, 0.06, 3600, 0.03)

# ---------- 4-5. pas dans le couloir, casiers ----------
cycle_pas(debut["couloir"], debut["casiers"], 0.3, 0.09)
bc = bornes("casiers")
cycle_pas(debut["casiers"], bc[4], 0.3, 0.1)
cycle_pas(bc[4], debut["hautParleur"], 0.52, 0.12)
# la vague de casiers derrière lui
for k, zc in enumerate(np.arange(0.6, 5.6, 0.34)):
    tk = debut["casiers"] + (zc - 0.6) * 22 / FPS
    if tk < bc[1]:
        metal(tk, 0.035)
# les trois « Clac »
t = debut["casiers"]
for _ in range(3):
    t = mot("clac", t + 0.05)
    metal(t, 0.13)

# ---------- 6. haut-parleurs : sonnerie + grésillement ----------
d = duree["hautParleur"]
gr = filtre(bruit(d), "bandpass", [800, 3500]) * (rng.random(int(d * SR)) > 0.4)
pose(gr * env(int(d * SR), 0.05, 0.4), debut["hautParleur"], 0.012)
for k, (f, dt) in enumerate([(660, 0), (523, 0.45)]):
    dd = 0.6
    pose((np.sin(2 * np.pi * f * ts(dd)) + 0.3 * np.sin(2 * np.pi * 2 * f * ts(dd))) * np.exp(-ts(dd) * 4), debut["hautParleur"] + 0.05 + dt, 0.05)

# ---------- 7. porte rouge qui grince ----------
dd = 1.4
cr = np.sin(2 * np.pi * np.cumsum(np.linspace(260, 140, int(dd * SR))) / SR) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 19 * ts(dd))))
pose(filtre(cr, "bandpass", [120, 2200]) * env(int(dd * SR), 0.1, 0.4), debut["salleZero"] + duree["salleZero"] * 0.55, 0.04)

# ---------- 8. escalier : pas précipités ----------
cycle_pas(bornes("escalier")[1], debut["surveillant"], 0.7, 0.12)

# ---------- 9. néon qui grésille au-dessus du surveillant ----------
d = duree["surveillant"] + duree["retourne"]
hum = np.sin(2 * np.pi * 100 * ts(d)) + 0.4 * np.sin(2 * np.pi * 200 * ts(d))
pose(hum * env(int(d * SR), 0.3, 0.3), debut["surveillant"], 0.012)

# ---------- 10. il se retourne : craquements, déchirure, impact ----------
t0 = mot("craque", debut["retourne"])
for k in range(7):
    clic(t0 + k * 0.07 + rng.uniform(0, 0.03), 0.14, rng.uniform(1500, 3500), 0.035)
t1 = mot("souvre", debut["retourne"]) if any("souvre" in re.sub(r"[^\w-]", "", w.lower()) for _, _, w in mots) else t0 + 0.6
dd = 0.7
pose(filtre(bruit(dd), "bandpass", [300, 1800]) * np.sin(np.pi * ts(dd) / dd), t1, 0.08)
boom(mot("dents", debut["retourne"]) - 0.05, 0.28)

# ---------- 11. le sifflet, le galop, les néons qui éclatent ----------
ts_ = mot("sifflet", debut["charge"])
dd = 0.9
pose(np.sin(2 * np.pi * (3100 * ts(dd) + 6 * np.sin(2 * np.pi * 30 * ts(dd)))) * env(int(dd * SR), 0.02, 0.25), ts_, 0.03)
bch = bornes("charge")
t = bch[1]
while t < debut["dilemme"]:
    pas(t, 0.16)
    pas(t + 0.08, 0.12)
    t += 0.22
for k in range(4):
    tk = bch[1] + 0.3 + k * 0.35
    pose(filtre(bruit(0.15), "highpass", 3000) * np.exp(-ts(0.15) * 30), tk, 0.08)

# ---------- 12. battements de cœur + grognement ----------
t = debut["dilemme"]
while t < DUREE:
    for dt in (0, 0.18):
        dd = 0.15
        pose(np.sin(2 * np.pi * 55 * ts(dd)) * np.exp(-ts(dd) * 22), t + dt, 0.2)
    t += 0.8
d = DUREE - debut["charge"]
saw = 2 * ((ts(d) * (48 + 5 * np.sin(2 * np.pi * 0.6 * ts(d)))) % 1) - 1
pose(filtre(saw + 0.5 * bruit(d), "lowpass", 350) * env(int(d * SR), 0.5, 1), debut["charge"], 0.05)

# ---------- pulsation grave qui accélère (couloir → charge) ----------
t = debut["couloir"]
while t < debut["dilemme"]:
    k = (t - debut["couloir"]) / (debut["dilemme"] - debut["couloir"])
    dd = 0.25
    pose(np.sin(2 * np.pi * (70 - 30 * ts(dd) / dd) * ts(dd)) * np.exp(-ts(dd) * 14), t, 0.06 + 0.08 * k)
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
