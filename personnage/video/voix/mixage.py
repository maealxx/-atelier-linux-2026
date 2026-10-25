"""Bruitages synthétisés calés sur src/timeline.json et src/plans.json (+ la voix guide si --avec-voix).
Usage : python3 voix/mixage.py <sortie.wav> [--avec-voix]
Bruitages discrets : swoosh à chaque coupe, pulsation grave, montée avant la créature, impacts."""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly

SR = 48000
ici = os.path.dirname(os.path.abspath(__file__))
tl = json.load(open(f"{ici}/../src/timeline.json"))
FPS = tl["fps"]
debut, t = {}, 0.0
for s in tl["scenes"]:
    debut[s["nom"]] = t
    t += s["frames"] / FPS
DUREE = t
DUREES_CREA = [s["frames"] for s in tl["scenes"] if s["nom"] == "creature"][0] / FPS
rng = np.random.default_rng(7)
voix = np.zeros(int(DUREE * SR) + SR)
sfx = np.zeros_like(voix)


def filtre(x, typ, f):
    return sosfilt(butter(2, f, btype=typ, fs=SR, output="sos"), x)


def bruit(d):
    return rng.standard_normal(int(d * SR))


def env(n, a=0.01, r=0.1):
    e = np.ones(n)
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def pose(son, t0, vol, piste=sfx):
    i = int(t0 * SR)
    son = son[: max(0, len(piste) - i)]
    piste[i : i + len(son)] += son * vol


def tps(nom, frame):
    return debut[nom] + frame / FPS


def ts(d):
    return np.arange(int(d * SR)) / SR


# ---------- voix guide (seulement si demandée) ----------
for s in (tl["scenes"] if "--avec-voix" in sys.argv else []):
    a, sr = sf.read(f"{ici}/{s['voix']}")
    a = resample_poly(a, SR, sr)
    pose(a / (np.abs(a).max() + 1e-9), debut[s["nom"]] + s["debutVoix"], 0.9, voix)

# ---------- ambiance : nappe grave continue, plus forte à la fin ----------
tt = ts(DUREE)
nappe = 0.6 * np.sin(2 * np.pi * 55 * tt) + 0.5 * np.sin(2 * np.pi * 58.3 * tt) + 0.3 * filtre(bruit(DUREE), "lowpass", 180)
monte = np.interp(tt, [0, debut["creature"], debut["creature"] + 1, DUREE], [1, 1.4, 2.4, 2.2])
pose(nappe * monte * env(len(tt), 2, 2), 0, 0.035)
# vent léger
pose(filtre(bruit(DUREE), "bandpass", [300, 900]) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * tt)), 0, 0.01)


# ---------- pas ----------
def pas(t0, vol=0.12):
    d = 0.09
    pose(filtre(bruit(d), "lowpass", 400) * np.exp(-ts(d) * 45), t0, vol)


def cycle_pas(nom, vitesse, f0, f1, vol=0.12):
    periode = np.pi / vitesse
    f = f0 + periode / 2
    while f < f1:
        pas(tps(nom, f), vol)
        f += periode


cycle_pas("busPart", 0.55, 0, 55, 0.14)
cycle_pas("aPied", 0.3, 0, 135, 0.07)
cycle_pas("ruelle", 0.3, 0, 150, 0.11)
cycle_pas("poubelles", 0.3, 0, 95, 0.11)
cycle_pas("poubelles", 0.48, 95, 165, 0.12)
cycle_pas("arret", 0.3, 0, 115, 0.1)

# ---------- 1. le bus repart : moteur qui s'éloigne + souffle des portes ----------
d = 4.8
mot = (np.sin(2 * np.pi * 38 * ts(d)) + 0.5 * filtre(bruit(d), "lowpass", 250)) * np.linspace(1, 0, int(d * SR)) ** 1.5
pose(mot, tps("busPart", 5), 0.18)
pose(filtre(bruit(0.5), "highpass", 2500) * env(int(0.5 * SR), 0.01, 0.3), tps("busPart", 0), 0.05)

# ---------- 3-5. ruelle : gouttes, ampoule qui grésille ----------
for k in range(14):
    t0 = debut["ruelle"] + rng.uniform(0, 14)
    f = rng.uniform(1100, 1900)
    dd = 0.12
    pose(np.sin(2 * np.pi * (f - 3000 * ts(dd)) * ts(dd)) * np.exp(-ts(dd) * 40), t0, 0.035)
for nom, f0, f1 in [("ruelle", 40, 150), ("poussette", 0, 180), ("poubelles", 60, 165)]:
    d = (f1 - f0) / FPS
    buzz = np.sign(np.sin(2 * np.pi * 100 * ts(d))) * 0.5 * (rng.random(int(d * SR)) > 0.002).astype(float)
    pose(filtre(buzz, "bandpass", [90, 1200]) * env(int(d * SR), 0.1, 0.3), tps(nom, f0), 0.012)

# ---------- 4. poussette : grincement de roue ----------
f = 10
while f < 90:
    dd = 0.09
    pose(np.sin(2 * np.pi * (1900 + 4000 * ts(dd)) * ts(dd)) * env(int(dd * SR), 0.01, 0.05), tps("poussette", f), 0.03)
    f += 15
pose(filtre(bruit(2.7), "lowpass", 300) * env(int(2.7 * SR), 0.5, 0.4), tps("poussette", 10), 0.04)

# ---------- 5. poubelles : froissement quand les yeux s'ouvrent ----------
pose(filtre(bruit(0.6), "bandpass", [1800, 4500]) * env(int(0.6 * SR), 0.02, 0.4), tps("poubelles", 45), 0.05)

# ---------- 6-7. néon de l'arrêt ----------
for nom in ["arret", "postit"]:
    d = tl["scenes"][[s["nom"] for s in tl["scenes"]].index(nom)]["frames"] / FPS
    hum = np.sin(2 * np.pi * 100 * ts(d)) + 0.4 * np.sin(2 * np.pi * 200 * ts(d)) + 0.25 * np.sin(2 * np.pi * 300 * ts(d))
    grs = (rng.random(int(d * SR)) < 0.0015) * rng.standard_normal(int(d * SR)) * 8
    pose((hum + filtre(grs, "highpass", 2000)) * env(int(d * SR), 0.3, 0.3), debut[nom], 0.014)

# ---------- 8. le vieux bus arrive, freine ----------
d = 5.0
rumble = np.sin(2 * np.pi * (34 + 10 * ts(d) / d) * ts(d)) + 0.6 * filtre(bruit(d), "lowpass", 220)
pose(rumble * np.linspace(0.05, 1, int(d * SR)) ** 2, tps("busVieux", 15), 0.2)
dd = 0.8
pose(np.sin(2 * np.pi * (3100 + 120 * np.sin(2 * np.pi * 9 * ts(dd))) * ts(dd)) * env(int(dd * SR), 0.05, 0.4), tps("busVieux", 120), 0.02)
pose(filtre(bruit(0.8), "highpass", 2000) * env(int(0.8 * SR), 0.01, 0.6), tps("busVieux", 142), 0.045)
# ralenti du moteur jusqu'à la fin
d = DUREE - tps("busVieux", 140)
pose((np.sin(2 * np.pi * 31 * ts(d)) * (0.8 + 0.2 * np.sin(2 * np.pi * 7 * ts(d))) + 0.3 * filtre(bruit(d), "lowpass", 150)) * env(int(d * SR), 0.5, 1), tps("busVieux", 140), 0.06)

# ---------- 9. portes qui grincent ----------
dd = 1.1
cr = np.sin(2 * np.pi * np.cumsum(np.linspace(320, 170, int(dd * SR))) / SR) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 23 * ts(dd))))
pose(filtre(cr, "bandpass", [150, 2500]) * env(int(dd * SR), 0.05, 0.3), tps("portes", 8), 0.05)
pose(filtre(bruit(0.7), "highpass", 1500) * env(int(0.7 * SR), 0.01, 0.5), tps("portes", 6), 0.05)

# ---------- 10. souffle dans la nuque ----------
for f in [22, 68, 108]:
    dd = 1.0
    pose(filtre(bruit(dd), "bandpass", [350, 1600]) * np.sin(np.pi * ts(dd) / dd) ** 2, tps("souffle", f), 0.11)

# ---------- 11. la créature : impact + grognement ----------
dd = 2.5
boom = np.sin(2 * np.pi * (48 - 10 * ts(dd)) * ts(dd)) * np.exp(-ts(dd) * 1.8) + filtre(bruit(dd), "lowpass", 120) * np.exp(-ts(dd) * 3)
pose(boom, tps("creature", 12), 0.3)
d = DUREE - tps("creature", 20)
saw = 2 * ((ts(d) * (52 + 6 * np.sin(2 * np.pi * 0.7 * ts(d)))) % 1) - 1
grogne = filtre(saw + 0.6 * bruit(d), "lowpass", 380) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.45 * ts(d))) ** 2
pose(grogne * env(int(d * SR), 0.8, 1.2), tps("creature", 20), 0.09)

# ---------- 12. battements de cœur ----------
f = 0
while f < tl["scenes"][-1]["frames"]:
    for dt in (0, 0.18):
        dd = 0.15
        pose(np.sin(2 * np.pi * 55 * ts(dd)) * np.exp(-ts(dd) * 22), tps("dilemme", f) + dt, 0.22)
    f += 25

# ---------- montage : swoosh à chaque coupe ----------
plans = json.load(open(f"{ici}/../src/plans.json"))
coupes = []
for s in tl["scenes"]:
    w = plans[s["nom"]]
    b = 0.0
    for x in w[:-1]:
        b += x / sum(w) * s["frames"]
        coupes.append(debut[s["nom"]] + round(b) / FPS)
    coupes.append(debut[s["nom"]])
for c in sorted(coupes)[1:]:
    dd = 0.28
    sweep = filtre(bruit(dd), "bandpass", [700, 5000]) * np.sin(np.pi * ts(dd) / dd) ** 2
    pose(sweep, c - 0.14, 0.035)


# ---------- pulsation grave qui accélère (à partir de la ruelle) ----------
def kick(t0, vol):
    dd = 0.25
    pose(np.sin(2 * np.pi * (70 - 30 * ts(dd) / dd) * ts(dd)) * np.exp(-ts(dd) * 14), t0, vol)


t = debut["ruelle"]
while t < debut["creature"]:
    k = (t - debut["ruelle"]) / (debut["creature"] - debut["ruelle"])
    kick(t, 0.07 + 0.08 * k)
    t += 0.8 - 0.35 * k

# ---------- impacts sur les moments forts ----------
def impact(t0, vol):
    dd = 1.2
    pose(np.sin(2 * np.pi * (60 - 25 * ts(dd)) * ts(dd)) * np.exp(-ts(dd) * 4) + filtre(bruit(dd), "lowpass", 300) * np.exp(-ts(dd) * 6), t0, vol)


for nom in ["poussette", "postit", "busVieux"]:
    impact(debut[nom], 0.12)

# ---------- montée de tension avant la créature ----------
d = debut["creature"] + (plans["creature"][0] / sum(plans["creature"])) * DUREES_CREA - debut["souffle"]
r = ts(d) / d
riser = filtre(bruit(d), "bandpass", [200, 2500]) * r ** 2 + 0.4 * np.sin(2 * np.pi * np.cumsum(120 + 500 * r ** 2) / SR) * r ** 3
pose(riser, debut["souffle"], 0.06)

# ---------- voix off enregistrée (un seul fichier, déjà traité par caler_voix.py) ----------
if tl.get("voix"):
    a, sr = sf.read(f"{ici}/{tl['voix']}")
    a = resample_poly(a, SR, sr) if sr != SR else a
    pose(a, 0, 1.0, voix)
    # les bruitages baissent un peu quand la voix parle
    n = len(voix) // 480
    e = np.sqrt(np.mean(voix[: n * 480].reshape(n, 480) ** 2, axis=1))
    e = np.convolve(e, np.ones(15) / 15, mode="same")
    duck = 1 - 0.45 * np.clip(e / 0.08, 0, 1)
    sfx[: n * 480] *= np.repeat(duck, 480)

mix = voix + sfx
mix = mix[: int(DUREE * SR)]
mix /= max(1.0, np.abs(mix).max() / 0.95)
sf.write(sys.argv[1], np.stack([mix, mix], 1).astype(np.float32), SR)
print("ok", round(DUREE, 2), "s", "crête voix", round(np.abs(voix).max(), 2), "crête bruitages", round(np.abs(sfx).max(), 2))
