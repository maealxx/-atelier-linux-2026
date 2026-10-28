"""Sons de « Comment les banques gagnent de l'argent avec les parrainages », calés sur src/parrainage/timeline.json et plans.json.
Sans voix tant que la vraie voix n'est pas là (ajouter --voix pour mettre la voix calée par caler_voix.py).
Usage : python3 voix/parrainage/mixage.py <sortie.wav> [fin_en_s] [--voix]"""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, resample_poly, sosfilt

SR = 48000
ici = os.path.dirname(os.path.abspath(__file__))
src = f"{ici}/../../src/parrainage"
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
F = lambda nom, image: (start[nom] + image) / FPS


def note(f0, d, vol=1.0, dec=3.0):
    tt = ts(d)
    son = np.sin(2 * np.pi * f0 * tt) + 0.35 * np.sin(2 * np.pi * 2 * f0 * tt) + 0.15 * np.sin(2 * np.pi * 3 * f0 * tt)
    return son * np.exp(-tt * dec) * env(len(tt), 0.005, 0.05) * vol


def kick(t0, vol):
    d = 0.3
    pose(np.sin(2 * np.pi * np.cumsum(140 * np.exp(-ts(d) * 20) + 46) / SR) * np.exp(-ts(d) * 8), t0, vol)


def charley(t0, vol, d=0.05):
    pose(filtre(bruit(d), "highpass", 7500) * np.exp(-ts(d) * 70), t0, vol)


def clap(t0, vol):
    d = 0.2
    son = filtre(bruit(d), "bandpass", [900, 4000]) * np.exp(-ts(d) * 18)
    for j in (0.0, 0.012, 0.024):
        pose(son, t0 + j, vol * 0.5)


def whoosh(t0, vol, d=0.4, bas=400, haut=3500):
    pose(filtre(bruit(d), "bandpass", [bas, haut]) * np.sin(np.pi * ts(d) / d) ** 2, t0 - d / 2, vol)


def ding(t0, vol, f0=1568):
    pose(note(f0, 0.6, 1, 6) + 0.5 * note(f0 * 1.5, 0.6, 1, 8), t0, vol)


def piece(t0, vol):
    """petite pièce : tintement métallique"""
    d = 0.25
    tt = ts(d)
    f0 = rng.uniform(2600, 3400)
    pose((np.sin(2 * np.pi * f0 * tt) + 0.6 * np.sin(2 * np.pi * f0 * 1.48 * tt) + 0.3 * np.sin(2 * np.pi * f0 * 2.3 * tt)) * np.exp(-tt * 18), t0, vol)


def cashing(t0, vol):
    """« ka-tching » de caisse enregistreuse"""
    d = 0.08
    pose(filtre(bruit(d), "bandpass", [600, 3000]) * np.exp(-ts(d) * 50), t0, vol * 0.8)
    for j in range(5):
        piece(t0 + 0.06 + j * 0.035, vol * 0.5)
    pose(note(2637, 0.9, 1, 4) + note(3520, 0.9, 1, 5), t0 + 0.1, vol * 0.5)


def pluie_pieces(t0, t1, vol, dt=0.07):
    t = t0
    while t < t1:
        piece(t + rng.uniform(0, 0.03), vol * rng.uniform(0.5, 1))
        t += dt * rng.uniform(0.7, 1.3)


def buzz(t0, vol):
    """mauvaise réponse"""
    d = 0.45
    tt = ts(d)
    pose(np.sign(np.sin(2 * np.pi * 110 * tt)) * 0.5 * env(len(tt), 0.01, 0.08) + np.sign(np.sin(2 * np.pi * 116 * tt)) * 0.3 * env(len(tt), 0.01, 0.08), t0, vol)


def tampon(t0, vol):
    kick(t0, vol)
    pose(filtre(bruit(0.15), "lowpass", 900) * np.exp(-ts(0.15) * 25), t0, vol * 0.7)


def montee(t0, d, vol, f0=300, f1=1400):
    tt = ts(d)
    pose(np.sin(2 * np.pi * np.cumsum(f0 + (f1 - f0) * (tt / d) ** 2) / SR) * env(len(tt), 0.05, 0.05) * (0.3 + 0.7 * tt / d), t0, vol)


def arpege(t0, vol, notes=(1046, 1318, 1568, 2093), pas_=0.07):
    for j, f0 in enumerate(notes):
        pose(note(f0, 0.35, 1, 8), t0 + j * pas_, vol)


def bip_cb(t0, vol):
    pose(np.sin(2 * np.pi * 1975 * ts(0.16)) * env(int(0.16 * SR), 0.005, 0.02), t0, vol)


# ---------- musique : petit beat pop rapide (120 BPM), La m – Fa – Do – Sol ----------
BPM = 120
B = 60 / BPM
ACC = [[220.0, 261.6, 329.6], [174.6, 220.0, 261.6], [261.6, 329.6, 392.0], [196.0, 246.9, 293.7]]
musique = np.zeros_like(sfx)
garde = sfx
sfx = musique
t = 0.0
mes = 0
while t < DUREE:
    a = ACC[mes % 4]
    for b in range(4):
        tb = t + b * B
        if tb >= DUREE:
            break
        # accords en « pluck » sur les croches
        for c in (0, 0.5):
            for f0 in a:
                pose(note(f0 * 2, B * 0.45, 1, 9), tb + c * B, 0.012)
        pose(note(a[0] / 2, B * 0.9, 1, 3), tb, 0.06)
        if b in (0, 2) or (b == 3 and mes % 2):
            kick(tb, 0.16)
        if b in (1, 3):
            clap(tb, 0.07)
        for h in range(2):
            charley(tb + h * B / 2 + B / 4, 0.025 if h else 0.018)
    # petite mélodie au début de chaque mesure paire
    if mes % 2 == 0:
        for j, f0 in enumerate([a[2] * 2, a[1] * 2, a[2] * 2, a[0] * 4]):
            pose(note(f0, 0.25, 1, 10), t + 2 * B + j * B / 4, 0.012)
    t += 4 * B
    mes += 1
musique = sfx
sfx = garde
# musique coupée un court instant sur « Mais retiens ça » (moment sérieux)
if ok("retiens"):
    a_, b_ = int(rep("retiens", "mais") * SR), int(rep("retiens", "si") * SR)
    m = np.ones(len(musique))
    n = int(0.15 * SR)
    m[a_ - n : a_] = np.linspace(1, 0.25, n)
    m[a_:b_] = 0.25
    m[b_ : b_ + n] = np.linspace(0.25, 1, n)
    musique *= m
# fin : la musique s'éteint doucement
n = int(1.2 * SR)
musique[int(DUREE * SR) - n : int(DUREE * SR)] *= np.linspace(1, 0, n)

# ---------- whoosh à chaque coupe ----------
for nom in SC:
    for c in bornes(nom)[:-1]:
        if 0.2 < c < DUREE:
            whoosh(c, 0.05)

# ---------- 1. anniv : confettis, vibreur, notifications, messages ----------
pose(filtre(bruit(0.3), "highpass", 1500) * np.exp(-ts(0.3) * 10), 0.0, 0.18)  # pétard
kick(0.0, 0.25)
for j in range(12):
    piece(0.05 + j * 0.05, 0.02)
vibre(0.05, 0.12, 0.6)
notif(rep("anniv", "pote") - 0.05, 0.08)
notif(rep("anniv", "boursorama") - 0.05, 0.08)
for mot in ("joyeux", "inscris-toi"):
    pop(rep("anniv", mot) - 0.07, 0.08)
pop(rep("anniv", "code") - 0.2, 0.08)

# ---------- 2. pourquoi : la banque sort du sol, le billet tombe, la banque plisse les yeux, calculette ----------
if ok("pourquoi"):
    pop(rep("pourquoi", "pourquoi"), 0.06)
    kick(rep("pourquoi", "banque") - 0.1, 0.3)
    whoosh(rep("pourquoi", "banque") - 0.1, 0.06, 0.5, 150, 900)
    whoosh(rep("pourquoi", "cent") - 0.3, 0.05, 0.8, 1500, 6000)
    cashing(rep("pourquoi", "cent") + 0.2, 0.12)
    pop(rep("pourquoi", "compte") - 0.12, 0.08)
    ding(rep("pourquoi", "compte") + 0.15, 0.04, 2093)
    montee(rep("pourquoi", "gentille") - 0.2, 0.4, 0.04, 500, 250)
    t0 = rep("pourquoi", "fait") - 0.2
    for j in range(8):
        pose(filtre(bruit(0.02), "highpass", 3000) * np.exp(-ts(0.02) * 150), t0 + j * 0.09, 0.06)

# ---------- 3. pub : l'argent part, les pubs pop, l'étiquette grimpe, le panneau dans le vide ----------
if ok("pub"):
    pluie_pieces(rep("pub", "coûte"), rep("pub", "coûte") + 0.9, 0.04)
    pluie_pieces(rep("pub", "fortune"), rep("pub", "fortune") + 0.9, 0.05)
    for mot in ("pubs", "insta", "youtube", "influenceurs"):
        pop(rep("pub", mot) - 0.08, 0.08)
    t0, t1 = rep("pub", "peut") - 0.1, rep("pub", "euros")
    t = t0
    while t < t1:
        pose(note(1200 + 900 * (t - t0) / (t1 - t0), 0.05, 1, 30), t, 0.03)
        t += 0.05
    ding(rep("pub", "euros"), 0.06, 2093)
    pluie_pieces(rep("pub", "paie"), rep("pub", "paie") + 0.6, 0.03)
    tc = rep("pub", "personne")
    for j in range(8):  # grillons
        for q in range(3):
            pose(np.sin(2 * np.pi * 4300 * ts(0.03)) * np.sin(np.pi * ts(0.03) / 0.03), tc + j * 0.32 + q * 0.045, 0.012)

# ---------- 4. parrainage : la carte se retourne, la porte s'ouvre, l'argent tombe ; personne → buzz, cadenas, tampon ----------
if ok("parrainage"):
    whoosh(rep("parrainage", "linverse") - 0.05, 0.08, 0.5)
    ding(rep("parrainage", "linverse") + 0.1, 0.04, 1318)
    tc = rep("parrainage", "compte")
    pose(filtre(bruit(0.4), "bandpass", [200, 1200]) * np.sin(np.pi * ts(0.4) / 0.4), tc - 0.6, 0.04)  # porte
    ding(tc - 0.25, 0.05, 1568)
    cashing(tc + 0.7, 0.1)
    piece(tc + 0.8, 0.05)
    buzz(rep("parrainage", "client") - 0.1, 0.05)
    pose(filtre(bruit(0.06), "bandpass", [1500, 5000]) * np.exp(-ts(0.06) * 60), rep("parrainage", "prime") - 0.1, 0.12)  # cadenas
    tampon(rep("parrainage", "zéro") - 0.05, 0.35)

# ---------- 5. pote : la balance penche, il tourne sur lui-même, une pièce ----------
if ok("pote"):
    kick(rep("pote", "pote") - 0.05, 0.2)
    pose(note(1318, 0.3, 1, 9), rep("pote", "pote"), 0.03)
    whoosh(rep("pote", "commercial") - 0.1, 0.09, 0.5, 600, 5000)
    arpege(rep("pote", "commercial") + 0.1, 0.03)
    piece(rep("pote", "payé"), 0.1)
    ding(rep("pote", "payé") + 0.05, 0.04, 2637)

# ---------- 6. conditions : loupe, coches, jauge qui se remplit, victoire ----------
if ok("conditions"):
    whoosh(rep("conditions", "conditions") - 0.1, 0.05)
    for mot in ("payer", "parfois"):
        pop(rep("conditions", mot) - 0.1, 0.06)
    for mot in ("carte", "largent"):
        ding(rep("conditions", mot), 0.05, 1760)
    montee(rep("conditions", "deviennes") - 0.15, rep("conditions", "actif") - rep("conditions", "deviennes"), 0.03, 300, 1200)
    arpege(rep("conditions", "actif") - 0.05, 0.05, (1046, 1318, 1568, 2093, 2637))
    pose(filtre(bruit(0.4), "highpass", 1500) * np.exp(-ts(0.4) * 8), rep("conditions", "actif"), 0.05)

# ---------- 7. kebab : les pièces tombent dans la banque, bip du terminal, commission, ka-tching ----------
if ok("kebab"):
    b = bornes("kebab")
    pluie_pieces(b[0] + 0.1, b[1] - 0.1, 0.035, 0.1)
    bip_cb(rep("kebab", "carte") + 0.05, 0.08)
    ding(rep("kebab", "carte") + 0.15, 0.04, 2093)
    pop(rep("kebab", "commerçant") - 0.1, 0.06)
    pop(rep("kebab", "commission") - 0.1, 0.06)
    pop(rep("kebab", "banque") - 0.2, 0.06)
    cashing(rep("kebab", "partie"), 0.1)

# ---------- 8. dort : petite boîte à musique, réveil, marche ----------
if ok("dort"):
    t0 = fin("dort")
    for j, f0 in enumerate((1568, 1318, 1046, 1318)):
        pose(note(f0, 0.5, 1, 4), t0 + 0.1 + j * 0.3, 0.02)
    b = bornes("dort")
    for j in range(6):  # réveil
        bip(b[1] + j * 0.1, 2400, 0.06, 0.02)
    t = b[1] + 0.3
    while t < b[2]:
        pas_sol(t, 0.03)
        t += 0.2

# ---------- 9. crédits : chaque produit pop + pièce ; découvert : alarme ; frais : ka-tching ----------
if ok("credits"):
    pop(rep("credits", "prêt") - 0.1, 0.06)
    for mot in ("voiture", "appart", "assurance", "livret"):
        pop(rep("credits", mot) - 0.08, 0.07)
        piece(rep("credits", mot) + 0.3, 0.05)
    td = rep("credits", "découvert")
    for j in range(4):
        pose(note(880, 0.14, 1, 4) * 0.8, td + j * 0.28, 0.035)
        pose(note(660, 0.14, 1, 4) * 0.8, td + j * 0.28 + 0.14, 0.035)
    for j in range(3):
        cashing(rep("credits", "frais") - 0.05 + j * 0.13, 0.05)

# ---------- 10. calcul : montée + pièces qui s'empilent, ding sur « milliers » ----------
if ok("calcul"):
    t0 = rep("calcul", "années")
    montee(t0, rep("calcul", "deuros") - t0, 0.025, 200, 900)
    t = t0
    while t < rep("calcul", "deuros"):
        piece(t, 0.025)
        t += 0.12
    ding(rep("calcul", "milliers"), 0.06, 2093)
    cashing(rep("calcul", "deuros") + 0.2, 0.08)

# ---------- 11. reste : soupir grave, cadeau qui s'ouvre (hameçon), l'arbre pousse ----------
if ok("reste"):
    d = 0.6
    pose(np.sin(2 * np.pi * np.cumsum(260 - 140 * ts(d) / d) / SR) * env(int(d * SR), 0.05, 0.3), rep("reste", "relou") - 0.1, 0.05)
    pop(rep("reste", "cent") - 0.1, 0.06)
    tc = rep("reste", "cadeau") - 0.4
    whoosh(tc, 0.06, 0.3, 800, 5000)
    d = 0.5
    pose(np.sin(2 * np.pi * np.cumsum(300 + 400 * np.sin(2 * np.pi * 12 * ts(d)) * np.exp(-ts(d) * 4)) / SR) * env(int(d * SR), 0.01, 0.2), tc + 0.1, 0.04)  # « boing »
    montee(rep("reste", "investissement") - 0.6, 0.8, 0.03, 400, 1600)
    arpege(rep("reste", "investissement") + 0.2, 0.04, (1318, 1568, 2093, 2637))

# ---------- 12. retiens : loupe, coche « non », éclat, l'étiquette se retourne ----------
if ok("retiens"):
    montee(rep("retiens", "arnaque"), 0.6, 0.02, 600, 900)
    ding(rep("retiens", "non") - 0.05, 0.06, 1760)
    pose(filtre(bruit(0.6), "highpass", 4000) * np.sin(np.pi * ts(0.6) / 0.6), rep("retiens", "réelle") - 0.2, 0.03)
    pop(rep("retiens", "paie") - 0.25, 0.07)
    whoosh(rep("retiens", "plus") - 0.15, 0.08, 0.4)
    arpege(rep("retiens", "plus") + 0.05, 0.05, (1046, 1568, 2093, 3136))

# ---------- 13. commentaire : liens envoyés, bulle ----------
if ok("commentaire"):
    t0 = rep("commentaire", "envoyé") - 0.2
    for j in range(9):
        whoosh(t0 + j * 0.133 + 0.2, 0.02, 0.2, 1500, 6000)
        pop(t0 + j * 0.133 + 0.33, 0.03)
    pop(rep("commentaire", "dis-le") - 0.07, 0.1)
    ding(rep("commentaire", "dis-le"), 0.04, 1568)

# ---------- mix final : musique sous la voix ----------
mix = sfx[: int(DUREE * SR)] + musique[: int(DUREE * SR)] * 1.35
if "--voix" in sys.argv and os.path.exists(f"{ici}/voix_finale.wav"):
    a, sr = sf.read(f"{ici}/voix_finale.wav")
    a = resample_poly(a, SR, sr) if sr != SR else a
    v = np.zeros_like(mix)
    v[: min(len(a), len(v))] = a[: len(v)]
    n = len(v) // 480
    e = np.convolve(np.sqrt(np.mean(v[: n * 480].reshape(n, 480) ** 2, axis=1)), np.ones(15) / 15, mode="same")
    mix[: n * 480] *= np.repeat(1 - 0.4 * np.clip(e / 0.08, 0, 1), 480)
    print("niveaux (dB) : fond", round(20 * np.log10(np.sqrt(np.mean(mix**2)) + 1e-9), 1), "voix", round(20 * np.log10(np.sqrt(np.mean(v**2)) + 1e-9), 1))
    mix = mix + v
mix /= max(1e-6, np.abs(mix).max() / 0.9)
sf.write(args[0], np.stack([mix, mix], 1).astype(np.float32), SR)
print("ok", round(DUREE, 2), "s")
