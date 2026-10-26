# Clip d'ouverture 5 s — "Et si l'hypergamie n'existait pas ?"
import math, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, S = 1080, 1920, 2          # sortie verticale, rendu 2x pour l'anti-aliasing
FPS, DUR = 30, 5.0
OUT = os.path.dirname(os.path.abspath(__file__))
FR = os.path.join(OUT, "frames"); os.makedirs(FR, exist_ok=True)
F = "/usr/share/fonts/opentype/inter/"
def font(name, size): return ImageFont.truetype(F + name, size * S)

BG = (14, 16, 28); GRID = (26, 30, 48)
BLUE = (77, 163, 255); PINK = (255, 92, 150); GOLD = (255, 205, 80)
WHITE = (240, 242, 250); GREY = (90, 96, 120)

ROWS = 6
LX, RX = 300, 780                 # colonnes hommes / femmes
TOP, BOT = 520, 1300
ys = [TOP + i * (BOT - TOP) / (ROWS - 1) for i in range(ROWS)]

# Sous-titres = voix off
SUBS = [(0.15, 1.55, "Tu connais forcément ce schéma."),
        (1.6, 3.3, "Toutes les femmes visent le haut."),
        (3.35, 5.0, "Et si l'hypergamie n'existait pas\u00a0?")]

def clamp(x): return max(0.0, min(1.0, x))
def ease(x): x = clamp(x); return 1 - (1 - x) ** 3
def back(x):
    x = clamp(x); c = 1.70158
    return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2
def mix(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
def P(*v): return [c * S for c in v]

def person(d, x, y, s, col):
    if s <= 0: return
    r = 26 * s
    d.ellipse(P(x - r * .55, y - r * 1.55, x + r * .55, y - r * .45), fill=col)
    d.rounded_rectangle(P(x - r * .95, y - r * .3, x + r * .95, y + r * 1.25), radius=r * .8 * S, fill=col)

def bezier(p0, p1, p2, p3, n=60):
    pts = []
    for i in range(n + 1):
        t = i / n; u = 1 - t
        pts.append((u**3*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t**3*p3[0],
                    u**3*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t**3*p3[1]))
    return pts

# Traits : femmes du bas (rangs 2..5) -> hommes du haut (rangs 0..1)
LINKS = [(5, 0, 1.75), (4, 0, 1.9), (3, 1, 2.05), (2, 0, 2.2), (5, 1, 2.35), (4, 1, 2.5), (3, 0, 2.65), (2, 1, 2.8)]

def frame(t):
    img = Image.new("RGB", (W * S, H * S), BG)
    d = ImageDraw.Draw(img)
    # grille de fond qui défile doucement
    off = (t * 20) % 60
    for gx in range(0, W + 60, 60): d.line(P(gx - off, 0, gx - off, H), fill=GRID, width=S)
    for gy in range(0, H + 60, 60): d.line(P(0, gy - off, W, gy - off), fill=GRID, width=S)

    # léger zoom caméra sur la fin
    zoom = 1 + 0.06 * ease((t - 3.3) / 1.7)

    # en-têtes
    a = ease(t / 0.5)
    hf = font("Inter-Bold.otf", 46)
    for x, txt, col in ((LX, "HOMMES", BLUE), (RX, "FEMMES", PINK)):
        y = 400 - 30 * (1 - a)
        c = mix(BG, col, a)
        d.text(P(x, y), txt, font=hf, fill=c, anchor="mm")
        d.line(P(x - 90 * a, y + 40, x + 90 * a, y + 40), fill=c, width=4 * S)

    # axe central "statut"
    ax = ease((t - 0.2) / 0.6)
    cx = (LX + RX) / 2
    d.line(P(cx, BOT + 40, cx, BOT + 40 - (BOT - TOP + 80) * ax), fill=GREY, width=3 * S)
    if ax > 0.95:
        d.polygon(P(cx - 14, TOP - 30, cx + 14, TOP - 30, cx, TOP - 55), fill=GREY)
    lf = font("Inter-SemiBold.otf", 24)
    la = ease((t - 0.6) / 0.4)
    d.text(P(cx, TOP - 85), "+ STATUT", font=lf, fill=mix(BG, GREY, la), anchor="mm")
    d.text(P(cx, BOT + 70), "– STATUT", font=lf, fill=mix(BG, GREY, la), anchor="mm")

    # traits (calque flou pour le glow)
    glow = Image.new("RGB", img.size, (0, 0, 0)); g = ImageDraw.Draw(glow)
    for wi, mi, start in LINKS:
        p = ease((t - start) / 0.7)
        if p <= 0: continue
        x0, y0 = RX - 45, ys[wi]; x3, y3 = LX + 45, ys[mi]
        pts = bezier((x0, y0), (x0 - 120, y0 - 40), (x3 + 140, y3 + 120), (x3, y3))
        k = max(2, int(len(pts) * p))
        seg = [c * S for pt in pts[:k] for c in pt]
        pulse = 0.75 + 0.25 * math.sin(t * 8 + wi)
        col = mix(PINK, GOLD, 0.35 * pulse)
        g.line(seg, fill=col, width=10 * S, joint="curve")
        d.line(seg, fill=col, width=4 * S, joint="curve")
        hx, hy = pts[k - 1]
        d.ellipse(P(hx - 8, hy - 8, hx + 8, hy + 8), fill=WHITE)
    img = Image.blend(img, Image.composite(glow, img, glow.convert("L").point(lambda v: 255 if v else 0)), 0.0)
    img = Image.fromarray(__import__("numpy").clip(
        __import__("numpy").asarray(img, dtype="int16") +
        __import__("numpy").asarray(glow.filter(ImageFilter.GaussianBlur(14 * S)), dtype="int16") * 0.8, 0, 255).astype("uint8"))
    d = ImageDraw.Draw(img)

    # personnages
    focus = ease((t - 2.0) / 0.8)   # les hommes du bas s'éteignent, ceux du haut brillent
    for i, y in enumerate(ys):
        s = back((t - 0.35 - i * 0.09) / 0.45)
        if i <= 1:
            mc = mix(BLUE, GOLD, focus * (0.6 + 0.4 * math.sin(t * 6)))
            if focus > 0:
                rr = 60 + 6 * math.sin(t * 6)
                d.ellipse(P(LX - rr, y - rr, LX + rr, y + rr), outline=mix(BG, GOLD, focus * .8), width=3 * S)
        else:
            mc = mix(BLUE, GREY, focus * 0.85)
        person(d, LX, y, s, mc)
        sw = back((t - 0.4 - i * 0.09) / 0.45)
        person(d, RX, y, sw, PINK)

    # rangs
    nf = font("Inter-Bold.otf", 22)
    for i, y in enumerate(ys):
        na = ease((t - 0.9 - i * 0.05) / 0.3)
        d.text(P(LX - 110, y), str(i + 1), font=nf, fill=mix(BG, GREY, na), anchor="mm")
        d.text(P(RX + 110, y), str(i + 1), font=nf, fill=mix(BG, GREY, na), anchor="mm")

    # titre final
    qa = back((t - 3.6) / 0.5)
    if qa > 0:
        tf = font("InterDisplay-Bold.otf", int(64 * min(qa, 1.15)) or 1)
        d.text(P(W / 2, 230), "ET SI L'HYPERGAMIE", font=tf, fill=WHITE, anchor="mm")
        d.text(P(W / 2, 305), "N'EXISTAIT PAS ?", font=tf, fill=GOLD, anchor="mm")

    # zoom
    if zoom > 1.0001:
        w2, h2 = int(W * S / zoom), int(H * S / zoom)
        cy = int(900 * S)
        box = ((W * S - w2) // 2, max(0, cy - h2 // 2), (W * S + w2) // 2, max(0, cy - h2 // 2) + h2)
        img = img.crop(box).resize((W * S, H * S), Image.LANCZOS)
        d = ImageDraw.Draw(img)

    # sous-titres mot par mot (hors zoom)
    sf = font("Inter-Bold.otf", 54)
    for a0, a1, txt in SUBS:
        if not (a0 <= t < a1): continue
        words = txt.split()
        per = (a1 - a0 - 0.25) / len(words)
        lines, cur = [], []
        for w in words:
            if d.textlength(" ".join(cur + [w]), font=sf) > 980 * S and cur: lines.append(cur); cur = []
            cur.append(w)
        lines.append(cur)
        idx = 0
        for li, line in enumerate(lines):
            y = 1560 + li * 80 - (len(lines) - 1) * 40
            total = d.textlength(" ".join(line), font=sf) / S
            x = W / 2 - total / 2
            for w in line:
                wt = a0 + idx * per
                if t >= wt:
                    pop = back((t - wt) / 0.18)
                    active = t < wt + per
                    col = GOLD if active else WHITE
                    ww = d.textlength(w, font=sf) / S
                    yy = y + 14 * (1 - min(pop, 1))
                    d.text(P(x, yy), w, font=sf, fill=col, anchor="lm",
                           stroke_width=7 * S, stroke_fill=(0, 0, 0))
                x += d.textlength(w + " ", font=sf) / S
                idx += 1

    # fondu d'entrée
    if t < 0.2:
        img = Image.blend(Image.new("RGB", img.size, (0, 0, 0)), img, t / 0.2)
    return img.resize((W, H), Image.LANCZOS)

n = int(FPS * DUR)
for f in range(n):
    frame(f / FPS).save(os.path.join(FR, f"{f:04d}.png"))
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(FR, "%04d.png"),
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", os.path.join(OUT, "clip_ouverture_hypergamie.mp4")], check=True)

def ts(s): return f"00:00:{int(s):02d},{int((s % 1) * 1000):03d}"
with open(os.path.join(OUT, "sous_titres.srt"), "w") as fh:
    for i, (a0, a1, txt) in enumerate(SUBS, 1): fh.write(f"{i}\n{ts(a0)} --> {ts(a1)}\n{txt}\n\n")
print("ok")
