"""Sous-titres TikTok style Maé : 1-3 mots, 2 lignes max, ligne active colorée (jaune/vert/rouge),
pop d'apparition, emojis Twemoji animés (pop + balancement + fondu), pop sonore sur chaque emoji (sfx).
Usage : python3 subtitles.py config.json"""
import json, re, subprocess, os, math, io, sys
import cairosvg
from PIL import Image

C = json.load(open(sys.argv[1]))
WK = C["work"]; FONTS = f"{WK}/fonts"; EMO = f"{WK}/emo/package"
probe = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
    "stream=width,height,r_frame_rate:format=duration", "-of", "json", C["video"]], capture_output=True, text=True).stdout)
W, H = probe["streams"][0]["width"], probe["streams"][0]["height"]
n_, d_ = probe["streams"][0]["r_frame_rate"].split("/"); FPS = round(int(n_) / int(d_))
DUR = float(probe["format"]["duration"])
OVER = C.get("mode", "burn") == "overlay"

# --- mots : fusion des apostrophes / traits d'union / ponctuation, corrections
merged = []
for s, e, t in json.load(open(C["words"])):
    if merged and (t[:1] in "'-" or re.fullmatch(r"[!?.,…]+", t)):
        ps, pe, pt = merged[-1]; merged[-1] = [ps, e, pt + ("" if t[:1] in "'-" else " ") + t]
    else:
        merged.append([s, e, t])
words = []
for s, e, t in merged:
    key = re.sub(r"[,!?.…]+$", "", t)
    if key in C.get("fixes", {}):
        rep = C["fixes"][key].split(); step = (e - s) / len(rep)
        for k, r in enumerate(rep): words.append([s + k * step, s + (k + 1) * step, r])
        continue
    if key.lower() in [u.lower() for u in C.get("upper", [])]: t = t.upper()
    words.append([s, e, t])

# --- groupes de 1-3 mots ; coupe sur ponctuation, pause > 0,5 s, ou changement de locuteur (majuscule)
keep = set(C.get("keep_caps", []))
groups, cur = [], []
for w in words:
    bare = re.sub(r"[,!?.…]+$", "", w[2])
    newspk = bool(cur) and w[2][:1].isupper() and not w[2].isupper() and bare not in keep and not re.search(r"[,!?.…]$", cur[-1][2])
    if cur and (w[0] - cur[-1][1] > 0.5 or newspk): groups.append(cur); cur = []
    cur.append(w)
    if len(cur) >= 3 or re.search(r"[,!?.…]$", w[2]): groups.append(cur); cur = []
if cur: groups.append(cur)

COLS = C.get("couleurs", ["&H00E6FF&", "&H1AD119&", "&H2A2AFF&"])  # jaune, vert, rouge (BGR) par défaut
Y0 = int(H * 0.69)
def ts(x): x = max(0, x); return f"{int(x//3600)}:{int(x%3600//60):02d}:{x%60:05.2f}"
def split_lines(g):
    n = len(g)
    if n == 1 or (n == 2 and sum(len(w[2]) for w in g) <= 14): return [list(range(n))]
    if n == 2: return [[0], [1]]
    a = len(g[0][2]) + len(g[1][2]); b = len(g[1][2]) + len(g[2][2])
    return [[0, 1], [2]] if a <= b + 2 else [[0], [1, 2]]

fs = round(84 * W / 1080)
hdr = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Montserrat Thin Black,{fs},&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,5,0,5,40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
ev, layout = [], []
for gi, g in enumerate(groups):
    col = COLS[gi % len(COLS)]; lines = split_lines(g)
    nxt = groups[gi + 1][0][0] if gi + 1 < len(groups) else g[-1][1] + 0.5
    g_end = min(g[-1][1] + 0.3, nxt); layout.append((g[0][0], g_end, len(lines)))
    for i, (s, e, t) in enumerate(g):
        end = g[i + 1][0] if i + 1 < len(g) else g_end
        act = next(k for k, L in enumerate(lines) if i in L)
        txt = [((r"{\c" + col + "}" + " ".join(g[j][2].upper() for j in L) + r"{\c&HFFFFFF&}") if k == act
                else " ".join(g[j][2].upper() for j in L)) for k, L in enumerate(lines)]
        pop = r"\fscx70\fscy70\t(0,90,\fscx106\fscy106)\t(90,160,\fscx100\fscy100)" if i == 0 else ""
        yy = int(H * 0.86) if any(a <= s < b for a, b in C.get("bas", [])) else Y0
        ev.append(f"Dialogue: 0,{ts(s)},{ts(end)},Sub,,0,0,0,,{{\\an5\\pos({W//2},{yy})\\blur1{pop}}}" + r"\N".join(txt))
ass = f"{WK}/subs.ass"; open(ass, "w").write(hdr + "\n".join(ev) + "\n")

# --- emojis : 1er groupe contenant le mot-clé
used, emo = set(), []
for gi, g in enumerate(groups):
    for kw, cp in C.get("emojis", []):
        if kw not in used and kw.lower() in " ".join(w[2] for w in g).lower():
            used.add(kw); a, b, nl = layout[gi]; emo.append((a, b, cp, nl, len(emo))); break
SZ = round(130 * W / 1080)
imgs = {e[2]: Image.open(io.BytesIO(cairosvg.svg2png(url=f"{EMO}/{e[2]}.svg", output_width=SZ*2, output_height=SZ*2))).convert("RGBA") for e in emo}
def layer(t):
    fr = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for a, b, cp, nl, k in emo:
        if not (a <= t < b): continue
        r = t - a
        sc = 1.25 * r / 0.12 if r < 0.12 else (1.25 - 0.25 * (r - 0.12) / 0.12 if r < 0.24 else 1 + 0.05 * math.sin((r - 0.24) * 4 * math.pi))
        im = imgs[cp].resize((max(2, int(SZ * sc)),) * 2, Image.LANCZOS).rotate(10 * math.sin(r * 3.2 * math.pi), resample=Image.BICUBIC, expand=True)
        fade = min(1.0, (b - t) / 0.12)
        if fade < 1: im.putalpha(im.getchannel("A").point(lambda v: int(v * fade)))
        half = 55 if nl == 1 else 100; pos = k % 3
        cx = W // 2 + (150 if pos == 0 else (-150 if pos == 2 else 0))
        yb = int(H * 0.86) if any(u <= a < v for u, v in C.get("bas", [])) else Y0
        cy = (yb - half - 75 if (pos == 1 or yb != Y0) else yb + half + 70) + 8 * math.sin(r * 2.4 * math.pi)
        fr.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))
    return fr

n = int(DUR * FPS)
src = (f"color=c=0x0000FF:s={W}x{H}:r={FPS}:d={DUR}," if OVER else "[1:v]") + f"ass={ass}:fontsdir={FONTS}[bg];[bg][0:v]overlay=0:0:format=auto[o]"
cmd = ["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-"]
if not OVER: cmd += ["-i", C["video"]]
cmd += ["-filter_complex", src, "-map", "[o]"] + ([] if OVER else ["-map", "1:a?", "-c:a", "copy"])
cmd += ["-frames:v", str(n), "-c:v", "libx264", "-b:v", "5M", "-maxrate", "6M", "-bufsize", "10M", "-preset", "slow", "-pix_fmt", "yuv420p", C["out"]]
p = subprocess.Popen(cmd, stdin=subprocess.PIPE); empty = Image.new("RGBA", (W, H), (0, 0, 0, 0)).tobytes()
for f in range(n):
    t = f / FPS
    p.stdin.write(layer(t).tobytes() if any(a <= t < b for a, b, *_ in emo) else empty)
p.stdin.close(); p.wait()

# --- SFX : petit pop sonore à chaque apparition d'emoji
if C.get("sfx") and emo and not OVER:
    import numpy as np, wave
    sr = 44100; tt = np.arange(int(sr * 0.12)) / sr
    pop = np.sin(2 * np.pi * (900 - 5000 * tt) * tt) * np.exp(-tt * 38) * 0.55
    wf = wave.open(f"{WK}/pop.wav", "w"); wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(sr)
    wf.writeframes((pop * 32767).astype(np.int16).tobytes()); wf.close()
    tmp = C["out"] + ".tmp.mp4"; os.replace(C["out"], tmp)
    ins = ["-i", tmp]; fc = []
    for k, (a, *_) in enumerate(emo):
        ins += ["-i", f"{WK}/pop.wav"]
        fc.append(f"[{k+1}:a]adelay={int(a*1000)}:all=1,volume={C.get('sfx_vol', 0.7)}[s{k}]")
    mix = "[0:a]" + "".join(f"[s{k}]" for k in range(len(emo))) + f"amix=inputs={len(emo)+1}:normalize=0:duration=first[aout]"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y"] + ins + ["-filter_complex", ";".join(fc + [mix]),
                    "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", C["out"]], check=True)
    os.remove(tmp)

for g in groups: print(round(g[0][0], 2), " ".join(w[2] for w in g))
print("emojis:", [(round(a, 2), cp) for a, b, cp, *_ in emo])
