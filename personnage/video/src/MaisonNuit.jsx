import {continueRender, delayRender, random, staticFile} from 'remotion';
import {Bonhomme} from './Bonhomme';
import {mix, rgb, SOL} from './ForetNuit';
import {Perso} from './moteur';
import {Rodeur} from './Rodeur';

// ===================== La maison du « Babyphone 2 » =====================
// Pièces en vraie 3D éclairées face par face (même principe que StationNuit) mais avec une couleur de lumière forte
// par pièce, comme les vidéos de référence : chambre de Léna orange-rouge (bande LED au plafond), couloir vert froid,
// salon bleu-violet (la télé), cuisine cyan, jardin violet sous l'orage. Lumières ponctuelles + ambiance + brume
// colorée + halos ; les personnages 2D sont teintés par la lumière du lieu et reçoivent un liseré lumineux.
const R = (s) => random(s);
const borne = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export {SOL};
export const PLAF = -620;

// police haute et serrée (Anton) pour l'heure en haut de l'écran
const attente = delayRender('anton');
if (typeof FontFace !== 'undefined') {
  new FontFace('AntonB', `url(${staticFile('fonts/Anton-Regular.ttf')})`)
    .load()
    .then((p) => {
      document.fonts.add(p);
      continueRender(attente);
    })
    .catch(() => continueRender(attente));
} else continueRender(attente);

// ---------- éclairage ----------
// ctx : {lums: [{p, c, i, r, bas}], amb: [r, g, b], F: {portee, brume: [r, g, b]}}
const sous = (a, b) => [a[0] - b[0], a[1] - b[1], (a[2] - b[2]) * 1000];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const ponctuelle = (p, n, q, I, portee) => {
  const v = sous(q, p);
  const d = Math.hypot(...v);
  const ndl = n ? dot(n, v.map((x) => x / (d || 1))) : 0.6;
  return (I * (0.1 + 0.9 * Math.max(0, ndl))) / (1 + (d / portee) ** 2);
};
export const lumiere = (p, n, ctx) => {
  const a = ctx.amb || [0.02, 0.02, 0.03];
  let c = [...a];
  (ctx.lums || []).forEach((l) => {
    if (!l || l.i < 0.005) return;
    // lumière qui n'éclaire que vers le bas (bande LED au plafond) ou vers le haut
    if (l.bas && p[1] < l.p[1] - 15) return;
    const v = ponctuelle(p, n, l.p, l.i, l.r);
    c = [c[0] + l.c[0] * v, c[1] + l.c[1] * v, c[2] + l.c[2] * v];
  });
  return c;
};
const film = (v) => 1 - Math.exp(-v * 2.4);
export const ombre = (cam, albedo, p, n, ctx) => {
  const l = lumiere(p, n, ctx);
  let col = albedo.map((a, i) => film(a * l[i]) * 255);
  if (ctx.F) {
    const dd = Math.max(0, cam.profondeur(p[2], p[0], p[1]));
    const b = 1 - Math.exp(-dd / ctx.F.portee);
    const lb = lumiere(p, null, ctx);
    const brume = ctx.F.brume.map((v, i) => v + film(lb[i] * 0.5) * 90);
    col = mix(col, brume, b * 0.7);
  }
  return rgb(col);
};
// teinte reçue par un personnage (billboard) en p
export const eclairePerso = (ctx, p, k = 1) => lumiere(p, null, ctx).map((v) => borne(film(v * 1.3 * k) * 1.3, 0.05, 1.2));

// ---------- géométrie ----------
export const face = (cam, ctx, pts, n, albedo, key, {sub = 1, emis = null, double = false, op = 1} = {}) => {
  const c = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length, a[2] + p[2] / pts.length], [0, 0, 0]);
  if (!double && n && dot(n, sous([cam.x, cam.y, cam.z], c)) <= 0) return null;
  if (sub > 1 && pts.length === 4) {
    const out = [];
    const lp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    for (let i = 0; i < sub; i++) {
      for (let j = 0; j < sub; j++) {
        const q = (u, v) => lp(lp(pts[0], pts[1], u), lp(pts[3], pts[2], u), v);
        out.push(face(cam, ctx, [q(i / sub, j / sub), q((i + 1) / sub, j / sub), q((i + 1) / sub, (j + 1) / sub), q(i / sub, (j + 1) / sub)], n, albedo, `${key}-${i}-${j}`, {emis, double: true, op}));
      }
    }
    return <g key={key}>{out}</g>;
  }
  const p = cam.poly(pts);
  if (!p) return null;
  const fill = emis ? rgb(emis) : ombre(cam, albedo, c, n, ctx);
  return <polygon key={key} points={p} fill={fill} stroke={fill} strokeWidth="1.2" strokeLinejoin="round" opacity={op} />;
};
export const boite = (cam, ctx, [x0, x1], [y0, y1], [z0, z1], albedo, key, {sub = 1, sans = [], emis = {}} = {}) => {
  const F = [
    ['haut', [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0]],
    ['bas', [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], [0, 1, 0]],
    ['g', [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0]],
    ['d', [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], [1, 0, 0]],
    ['av', [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], [0, 0, -1]],
    ['ar', [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1]],
  ];
  return <g key={key}>{F.filter(([nom]) => !sans.includes(nom)).map(([nom, pts, n]) => face(cam, ctx, pts, n, albedo, `${key}${nom}`, {sub, emis: emis[nom]}))}</g>;
};
export const halo = (cam, p, r, couleur, op, id) => {
  if (!cam.visible(p[2], p[0], p[1])) return null;
  const [x, y] = cam.proj(...p);
  const rr = r * cam.scale(p[2], p[0], p[1]);
  if (rr < 2 || op < 0.01) return null;
  return (
    <g key={id}>
      <defs>
        <radialGradient id={id}>
          <stop offset="0" stopColor={couleur} stopOpacity={op} />
          <stop offset="0.3" stopColor={couleur} stopOpacity={op * 0.4} />
          <stop offset="1" stopColor={couleur} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={x} cy={y} r={rr} fill={`url(#${id})`} />
    </g>
  );
};
// objet 2D posé contre un mur (cadre, poster) : rectangle 3D + contenu dessiné dans un repère 100 × 100
const surMur = (cam, pts, key, contenu) => {
  const p = cam.poly(pts);
  if (!p) return null;
  return <polygon key={key} points={p} {...contenu} />;
};
// une pièce : sol en lames, murs (subdivisés pour les dégradés de lumière), plafond, plinthes
const coquille = (cam, ctx, {x0, x1, z0, z1, plaf = PLAF, mur = [0.8, 0.78, 0.76], sol = [0.5, 0.36, 0.26], plafond = [0.75, 0.74, 0.72], sub = 12, sansMur = []}, key) => {
  const out = [];
  const lames = 7;
  for (let i = 0; i < lames; i++) {
    const xa = x0 + ((x1 - x0) * i) / lames;
    const xb = x0 + ((x1 - x0) * (i + 1)) / lames;
    const v = 0.85 + 0.15 * R(`${key}l${i}`);
    out.push(face(cam, ctx, [[xa, SOL, z0], [xb, SOL, z0], [xb, SOL, z1], [xa, SOL, z1]], [0, -1, 0], sol.map((c) => c * v), `${key}s${i}`, {sub: 4}));
  }
  out.push(face(cam, ctx, [[x0, plaf, z0], [x1, plaf, z0], [x1, plaf, z1], [x0, plaf, z1]], [0, 1, 0], plafond, `${key}p`, {sub}));
  if (!sansMur.includes('g')) out.push(face(cam, ctx, [[x0, plaf, z0], [x0, plaf, z1], [x0, SOL, z1], [x0, SOL, z0]], [1, 0, 0], mur, `${key}mg`, {sub}));
  if (!sansMur.includes('d')) out.push(face(cam, ctx, [[x1, plaf, z0], [x1, plaf, z1], [x1, SOL, z1], [x1, SOL, z0]], [-1, 0, 0], mur, `${key}md`, {sub}));
  if (!sansMur.includes('f')) out.push(face(cam, ctx, [[x0, plaf, z1], [x1, plaf, z1], [x1, SOL, z1], [x0, SOL, z1]], [0, 0, -1], mur, `${key}mf`, {sub}));
  if (!sansMur.includes('av')) out.push(face(cam, ctx, [[x0, plaf, z0], [x1, plaf, z0], [x1, SOL, z0], [x0, SOL, z0]], [0, 0, 1], mur, `${key}ma`, {sub}));
  // plinthes
  const pl = [0.9, 0.9, 0.9];
  out.push(face(cam, ctx, [[x0 + 2, SOL - 40, z0], [x0 + 2, SOL - 40, z1], [x0 + 2, SOL, z1], [x0 + 2, SOL, z0]], [1, 0, 0], pl, `${key}pg`));
  out.push(face(cam, ctx, [[x1 - 2, SOL - 40, z0], [x1 - 2, SOL - 40, z1], [x1 - 2, SOL, z1], [x1 - 2, SOL, z0]], [-1, 0, 0], pl, `${key}pd`));
  out.push(face(cam, ctx, [[x0, SOL - 40, z1 - 0.002], [x1, SOL - 40, z1 - 0.002], [x1, SOL, z1 - 0.002], [x0, SOL, z1 - 0.002]], [0, 0, -1], pl, `${key}pf`));
  return out;
};
// fenêtre dans un mur du fond (z fixe) : nuit d'orage, pluie, éclair
const fenetre = (cam, ctx, [xa, xb], [ya, yb], z, f, eclair, key, {nz = -1, ciel = [18, 16, 46]} = {}) => {
  const out = [];
  const c = mix(ciel, [200, 200, 255], eclair * 0.8);
  out.push(face(cam, ctx, [[xa, ya, z], [xb, ya, z], [xb, yb, z], [xa, yb, z]], [0, 0, nz], [0, 0, 0], `${key}v`, {emis: c, double: true}));
  // pluie sur la vitre
  const p0 = cam.poly([[xa, ya, z], [xb, ya, z], [xb, yb, z], [xa, yb, z]]);
  if (p0) {
    out.push(
      <g key={`${key}pl`}>
        <clipPath id={`${key}cl`}>
          <polygon points={p0} />
        </clipPath>
        <g clipPath={`url(#${key}cl)`} opacity={0.35 + 0.4 * eclair}>
          {[...Array(26)].map((_, k) => {
            const x = xa + (xb - xa) * R(`${key}rx${k}`);
            const y = ya + (((R(`${key}ry${k}`) * (yb - ya) + f * 40) % (yb - ya)) + (yb - ya)) % (yb - ya);
            const s = cam.seg([x, y, z], [x - 6, y + 50, z]);
            return s ? <line key={k} x1={s[0][0]} y1={s[0][1]} x2={s[1][0]} y2={s[1][1]} stroke="#c8d0ff" strokeWidth="2" /> : null;
          })}
        </g>
      </g>,
    );
  }
  // montants
  const m = [0.15, 0.15, 0.17];
  const mx = (xa + xb) / 2;
  const my = (ya + yb) / 2;
  out.push(boite(cam, ctx, [mx - 12, mx + 12], [ya, yb], [z + nz * 0.012, z + nz * 0.004], m, `${key}m1`));
  out.push(boite(cam, ctx, [xa, xb], [my - 12, my + 12], [z + nz * 0.012, z + nz * 0.004], m, `${key}m2`));
  out.push(boite(cam, ctx, [xa - 30, xb + 30], [yb, yb + 26], [z + nz * 0.05, z], [0.85, 0.85, 0.85], `${key}ap`));
  return out;
};
// éclairs : intensité (0 → 1) selon l'image globale
export const ECLAIRS = [40, 520, 1160, 1690, 2240, 2620];
export const eclair = (fg) => ECLAIRS.reduce((s, t) => {
  const u = fg - t;
  if (u < 0 || u > 14) return s;
  return Math.max(s, u < 2 ? 1 : u < 4 ? 0.3 : u < 6 ? 0.85 : Math.exp(-(u - 6) / 3) * 0.6);
}, 0);

// tri des objets selon la profondeur
export const trier = (cam, l) => l.filter((it) => it && it.el && cam.profondeur(it.z, it.x ?? cam.x, it.y ?? cam.y) > 0.04).sort((a, b) => cam.profondeur(b.z, b.x ?? cam.x, b.y ?? cam.y) - cam.profondeur(a.z, a.x ?? cam.x, a.y ?? cam.y));

// ===================== 1. la chambre de Léna (bande LED orange-rouge) =====================
export const CH = {x0: -900, x1: 900, z0: 0, z1: 2.4};
export const LIT = {x0: -640, x1: -60, z0: 1.3, z1: 2.38};
export const VEILL = [250, 150, 2.2];
export const CAM_BB = [830, -240, 1.0]; // la caméra du babyphone, sur l'étagère
export const PORTE_CH = {z0: 0.3, z1: 0.9};
const LED_C = [1.0, 0.34, 0.14];
export const chambre = (cam, f, fg, o = {}) => {
  const led = o.led ?? 1;
  const ec = eclair(fg) * (o.eclairs ?? 1);
  const v = o.veilleuse ?? 1;
  const lums = [];
  // bande LED : sources le long du plafond
  [[-650, 0.18], [0, 0.18], [650, 0.18], [-650, 2.25], [0, 2.25], [650, 2.25], [-860, 0.8], [-860, 1.6], [860, 0.8], [860, 1.6]].forEach(([x, z]) => lums.push({p: [x, PLAF + 30, z], c: LED_C, i: 0.36 * led, r: 760, bas: true}));
  lums.push({p: VEILL, c: [1, 0.72, 0.38], i: 0.55 * v, r: 420});
  lums.push({p: [550, -200, 2.7], c: [0.7, 0.75, 1], i: 2.2 * ec, r: 1700});
  lums.push({p: [-1000, -150, 0.6], c: [0.3, 0.9, 0.55], i: 0.25 * (o.porte ?? 0.4), r: 700});
  (o.lumieres || []).forEach((l) => lums.push(l));
  const ctx = {lums, amb: [0.035, 0.012, 0.012], F: {portee: 5.5, brume: [26, 8, 6]}};
  const coque = coquille(cam, ctx, {...CH, mur: [0.86, 0.8, 0.78], sol: [0.62, 0.44, 0.32], plafond: [0.8, 0.78, 0.76]}, 'ch');
  // la bande LED elle-même (gorge lumineuse le long du plafond) + halos
  const ledC = mix([60, 20, 14], [255, 150, 90], led);
  [[[CH.x0 + 4, CH.x1 - 4], [CH.z1 - 0.03, CH.z1 - 0.01]], [[CH.x0 + 4, CH.x1 - 4], [CH.z0 + 0.01, CH.z0 + 0.03]], [[CH.x0 + 4, CH.x0 + 12], [CH.z0, CH.z1]], [[CH.x1 - 12, CH.x1 - 4], [CH.z0, CH.z1]]].forEach(([xs, zs], k) =>
    coque.push(boite(cam, ctx, xs, [PLAF + 30, PLAF + 42], zs, [0, 0, 0], `led${k}`, {emis: {bas: ledC, av: ledC, ar: ledC, g: ledC, d: ledC}})),
  );
  if (led > 0.05) [[-500, 2.36], [300, 2.36], [-880, 1.2], [880, 1.2], [880, 0.4], [-880, 2.0]].forEach(([x, z], k) => coque.push(halo(cam, [x, PLAF + 50, z], 900, '#ff7a3a', 0.28 * led, `ledh${k}`)));
  // plafonnier carré (éteint)
  coque.push(boite(cam, ctx, [-200, 200], [PLAF, PLAF + 14], [1.0, 1.4], [0, 0, 0], 'plf', {emis: {bas: [90, 52, 44], av: [70, 40, 34], g: [70, 40, 34], d: [70, 40, 34]}}));
  // fenêtre (mur du fond)
  coque.push(...fenetre(cam, ctx, [260, 780], [-420, 40], CH.z1 - 0.004, fg, ec, 'chf'));
  // porte vers le couloir (mur de gauche) : entrouverte, couloir vert
  const pz = PORTE_CH;
  coque.push(face(cam, ctx, [[CH.x0 + 3, -330, pz.z0], [CH.x0 + 3, -330, pz.z1], [CH.x0 + 3, SOL, pz.z1], [CH.x0 + 3, SOL, pz.z0]], [1, 0, 0], [0, 0, 0], 'chpo', {emis: mix([6, 14, 10], [30, 70, 48], o.porte ?? 0.4), double: true}));
  coque.push(boite(cam, ctx, [CH.x0 + 4, CH.x0 + 24], [-350, SOL], [pz.z0 - 0.04, pz.z0], [0.92, 0.92, 0.9], 'chc1'));
  coque.push(boite(cam, ctx, [CH.x0 + 4, CH.x0 + 24], [-350, SOL], [pz.z1, pz.z1 + 0.04], [0.92, 0.92, 0.9], 'chc2'));
  coque.push(boite(cam, ctx, [CH.x0 + 4, CH.x0 + 24], [-350, -330], [pz.z0, pz.z1], [0.92, 0.92, 0.9], 'chc3'));
  // cadres au mur de droite, guirlande d'étoiles
  [[0.5, -320, '#ffd23a'], [1.0, -260, '#4fc3ff'], [1.5, -340, '#ff7ab0']].forEach(([z, y, c], k) => {
    coque.push(boite(cam, ctx, [CH.x1 - 14, CH.x1 - 2], [y, y + 160], [z, z + 0.32], [0.95, 0.95, 0.95], `cad${k}`));
    const p = cam.poly([[CH.x1 - 15, y + 18, z + 0.03], [CH.x1 - 15, y + 18, z + 0.29], [CH.x1 - 15, y + 142, z + 0.29], [CH.x1 - 15, y + 142, z + 0.03]]);
    if (p && cam.x < CH.x1 - 15) coque.push(<polygon key={`cadi${k}`} points={p} fill={c} opacity={0.35 + 0.3 * led} />);
  });
  // tapis rond (rose)
  const tp = [...Array(16)].map((_, k) => [-50 + Math.cos((k / 16) * 6.283) * 380, SOL - 2, 0.95 + (Math.sin((k / 16) * 6.283) * 380) / 1000]);
  coque.push(face(cam, ctx, tp, [0, -1, 0], [0.95, 0.5, 0.62], 'tapis'));
  const items = [];
  // le lit
  const L = LIT;
  items.push({z: (L.z0 + L.z1) / 2, x: (L.x0 + L.x1) / 2, el: (
    <g key="lit">
      {boite(cam, ctx, [L.x0 - 20, L.x1 + 20], [-120, SOL], [L.z1 - 0.06, L.z1], [0.95, 0.94, 0.92], 'litt', {sub: 3})}
      {boite(cam, ctx, [L.x0 - 20, L.x1 + 20], [250, SOL], [L.z0, L.z1], [0.95, 0.94, 0.92], 'litb', {sub: 2})}
      {boite(cam, ctx, [L.x0, L.x1], [200, 250], [L.z0 + 0.02, L.z1 - 0.06], [0.98, 0.98, 0.98], 'litm', {sub: 2})}
      {boite(cam, ctx, [L.x0 + 140, L.x1 - 140], [150, 205], [L.z1 - 0.32, L.z1 - 0.08], [0.98, 0.98, 1], 'oreil', {sub: 2})}
      {/* la couette (bosse au milieu : quelqu'un dort) */}
      {boite(cam, ctx, [L.x0 - 10, L.x1 + 10], [180 - (o.bosse ?? 40), 210], [L.z0, L.z1 - 0.34], [0.95, 0.56, 0.62], 'couet', {sub: 3})}
      {boite(cam, ctx, [L.x0 - 12, L.x1 + 12], [180 - (o.bosse ?? 40), 380], [L.z0 - 0.012, L.z0], [0.9, 0.5, 0.56], 'couetav', {sub: 2})}
    </g>
  )});
  if (o.dansLit) items.push({z: L.z1 - 0.2, x: (L.x0 + L.x1) / 2, el: o.dansLit});
  // table de nuit + veilleuse étoile
  items.push({z: 2.2, x: 200, el: (
    <g key="tdn">
      {boite(cam, ctx, [80, 320], [240, SOL], [2.05, 2.36], [0.95, 0.92, 0.88], 'tdnb', {sub: 2})}
      {boite(cam, ctx, [210, 290], [175, 240], [2.16, 2.24], [0, 0, 0], 'veib', {emis: {av: mix([40, 30, 10], [255, 220, 140], v), haut: mix([40, 30, 10], [255, 230, 160], v), g: mix([40, 30, 10], [240, 200, 120], v), d: mix([40, 30, 10], [240, 200, 120], v)}})}
      {halo(cam, VEILL, 520, '#ffc870', 0.5 * v, 'veih')}
    </g>
  )});
  // étagère à jouets (mur de droite) + caméra du babyphone (diode rouge)
  items.push({z: 1.0, x: 830, el: (
    <g key="eta">
      {boite(cam, ctx, [770, 900], [-200, SOL], [0.6, 1.4], [0.95, 0.94, 0.92], 'etab', {sub: 2})}
      {[[-140, '#ff7ab0'], [20, '#4fc3ff'], [180, '#ffd23a']].map(([y, c], k) => boite(cam, ctx, [780, 840], [y, y + 90], [0.7 + k * 0.2, 0.86 + k * 0.2], c === '#ff7ab0' ? [1, 0.45, 0.6] : c === '#4fc3ff' ? [0.3, 0.7, 1] : [1, 0.85, 0.2], `jou${k}`))}
      {boite(cam, ctx, [800, 860], [-270, -200], [0.95, 1.05], [0.95, 0.95, 0.95], 'cbb')}
      {(() => {
        if (!cam.visible(1.0, 795, -235)) return null;
        const [x, y] = cam.proj(795, -235, 1.0);
        const s = cam.scale(1.0, 795, -235);
        return (
          <g>
            <circle cx={x} cy={y} r={14 * s} fill="#111" />
            <circle cx={x} cy={y} r={7 * s} fill="#3a3a5a" />
            <circle cx={cam.proj(795, -262, 1.04)[0]} cy={cam.proj(795, -262, 1.04)[1]} r={5 * s} fill="#ff2a2a" />
            <circle cx={cam.proj(795, -262, 1.04)[0]} cy={cam.proj(795, -262, 1.04)[1]} r={18 * s} fill="#ff2a2a" opacity="0.3" />
          </g>
        );
      })()}
    </g>
  )});
  (o.extra || []).forEach((it) => items.push(it));
  return {fond: <g>{coque}</g>, items, ctx};
};

// ===================== 2. le couloir de l'étage (vert froid) et la trappe du grenier =====================
export const CO = {x0: -420, x1: 420, z0: 0, z1: 3.0};
export const TRAPPE = {x0: -170, x1: 170, z0: 1.7, z1: 2.25};
export const couloir = (cam, f, fg, o = {}) => {
  const ec = eclair(fg) * (o.eclairs ?? 1);
  const ouv = o.trappe ?? 0.25; // angle d'ouverture de la trappe (0 → 1)
  const lums = [
    {p: [380, 380, 2.5], c: [0.35, 1, 0.55], i: 0.5 * (o.veilleuse ?? 1), r: 650},
    {p: [0, -250, 3.2], c: [0.35, 0.65, 0.8], i: 0.5 + 2 * ec, r: 1500},
    {p: [-500, -100, 0.75], c: LED_C, i: 0.5 * (o.porteLena ?? 1), r: 800},
    {p: [0, PLAF - 60, 2.0], c: [0.6, 0.9, 0.7], i: 0.15 * ouv, r: 500},
    ...(o.lumieres || []),
  ];
  const ctx = {lums, amb: [0.012, 0.03, 0.022], F: {portee: 4.5, brume: [6, 22, 16]}};
  const coque = coquille(cam, ctx, {...CO, mur: [0.72, 0.82, 0.76], sol: [0.45, 0.34, 0.26], plafond: [0.7, 0.76, 0.72]}, 'co');
  // le trou de la trappe (noir) + le panneau qui pend
  const T = TRAPPE;
  coque.push(face(cam, ctx, [[T.x0, PLAF + 1, T.z0], [T.x1, PLAF + 1, T.z0], [T.x1, PLAF + 1, T.z1], [T.x0, PLAF + 1, T.z1]], [0, 1, 0], [0, 0, 0], 'trou', {emis: [3, 4, 4], double: true}));
  const a = (ouv * 75 * Math.PI) / 180;
  const L = (T.z1 - T.z0) * 1000;
  const bout = [T.z0 + (Math.cos(a) * L) / 1000, PLAF + Math.sin(a) * L];
  coque.push(face(cam, ctx, [[T.x0, PLAF + 2, T.z0], [T.x1, PLAF + 2, T.z0], [T.x1, bout[1], bout[0]], [T.x0, bout[1], bout[0]]], [0, Math.cos(a), -Math.sin(a)], [0.85, 0.85, 0.82], 'trp', {double: true, sub: 2}));
  coque.push(boite(cam, ctx, [T.x0 - 30, T.x1 + 30], [PLAF, PLAF + 16], [T.z0 - 0.03, T.z0], [0.95, 0.95, 0.95], 'trc1'));
  coque.push(boite(cam, ctx, [T.x0 - 30, T.x1 + 30], [PLAF, PLAF + 16], [T.z1, T.z1 + 0.03], [0.95, 0.95, 0.95], 'trc2'));
  // fenêtre au bout
  coque.push(...fenetre(cam, ctx, [-200, 200], [-400, 20], CO.z1 - 0.004, fg, ec, 'cof', {ciel: [10, 26, 30]}));
  // portes : Léna à gauche (ouverte, lumière orange), une autre à droite (fermée)
  coque.push(face(cam, ctx, [[CO.x0 + 3, -330, 0.5], [CO.x0 + 3, -330, 1.05], [CO.x0 + 3, SOL, 1.05], [CO.x0 + 3, SOL, 0.5]], [1, 0, 0], [0, 0, 0], 'pl', {emis: mix([20, 6, 4], [230, 100, 50], o.porteLena ?? 1)}));
  coque.push(boite(cam, ctx, [CO.x1 - 14, CO.x1 - 2], [-330, SOL], [1.4, 1.95], [0.9, 0.9, 0.86], 'pd', {sub: 2}));
  // veilleuse prise (verte)
  coque.push(boite(cam, ctx, [CO.x1 - 10, CO.x1 - 2], [360, 400], [2.45, 2.55], [0, 0, 0], 'vp', {emis: {g: [140, 255, 170]}}));
  coque.push(halo(cam, [CO.x1 - 20, 380, 2.5], 420, '#7affa8', 0.5 * (o.veilleuse ?? 1), 'vph'));
  if (ouv > 0.1) coque.push(halo(cam, [0, PLAF - 10, 2.0], 300, '#0a0a0a', 0.6, 'trh'));
  // rampe de l'escalier (premier plan, à droite)
  coque.push(boite(cam, ctx, [180, 420], [-60, -30], [0.05, 0.8], [0.95, 0.95, 0.95], 'ramp'));
  [0.1, 0.3, 0.5, 0.7].forEach((z, k) => coque.push(boite(cam, ctx, [185, 205], [-30, SOL], [z, z + 0.02], [0.95, 0.95, 0.95], `bar${k}`)));
  const items = [...(o.extra || [])];
  return {fond: <g>{coque}</g>, items, ctx};
};

// ===================== 3. le salon (télé bleu-violet), l'escalier, le placard dessous, la porte d'entrée =====================
export const SA = {x0: -1400, x1: 1400, z0: 0, z1: 3.6, plaf: -600};
export const ESC = {x0: -1400, x1: -1000, za: 0.7, n: 12, pas: 0.23, marche: 85};
export const PLACARD = {z0: 2.55, z1: 3.15, y0: -120};
export const ENTREE = {x0: -820, x1: -470};
export const CANAPE = {x0: 240, x1: 520, z0: 1.2, z1: 2.5};
export const salon = (cam, f, fg, o = {}) => {
  const ec = eclair(fg) * (o.eclairs ?? 1);
  const tv = o.tv ?? 1;
  const lampe = o.lampe ?? 1;
  const tvPulse = 0.85 + 0.15 * Math.sin(fg / 3) * R(`tv${Math.floor(fg / 4)}`);
  const lums = [
    {p: [1300, -100, 1.8], c: [0.45, 0.5, 1.05], i: 1.0 * tv * tvPulse, r: 1500},
    {p: [130, -260, 2.9], c: [1, 0.66, 0.38], i: 0.5 * lampe, r: 800},
    {p: [700, -200, 3.9], c: [0.7, 0.72, 1], i: 2.4 * ec, r: 2000},
    {p: [-650, -200, 3.8], c: [0.45, 0.55, 0.9], i: 0.2 + 1.2 * ec, r: 900},
    ...(o.lumieres || []),
  ];
  // lumières coupées : la lune bleue entre par la fenêtre et la porte vitrée
  const noir = tv < 0.1 && lampe < 0.1;
  if (noir) lums.push({p: [700, -250, 4.4], c: [0.45, 0.5, 1], i: 0.75, r: 2400}, {p: [-650, -150, 4.2], c: [0.4, 0.5, 1], i: 0.35, r: 1400});
  const ctx = {lums, amb: noir ? [0.03, 0.03, 0.07] : [0.016, 0.012, 0.036], F: {portee: 6, brume: [10, 8, 26]}};
  const coque = coquille(cam, ctx, {...SA, plaf: SA.plaf, mur: [0.66, 0.66, 0.82], sol: [0.48, 0.36, 0.3], plafond: [0.7, 0.7, 0.78]}, 'sa');
  // fenêtre du fond et porte d'entrée
  coque.push(...fenetre(cam, ctx, [450, 1050], [-380, 60], SA.z1 - 0.004, fg, ec, 'saf'));
  const E = ENTREE;
  coque.push(boite(cam, ctx, [E.x0, E.x1], [-330, SOL], [SA.z1 - 0.03, SA.z1 - 0.004], [0.32, 0.26, 0.3], 'ent', {sub: 3}));
  coque.push(face(cam, ctx, [[E.x0 + 90, -280, SA.z1 - 0.032], [E.x1 - 90, -280, SA.z1 - 0.032], [E.x1 - 90, -140, SA.z1 - 0.032], [E.x0 + 90, -140, SA.z1 - 0.032]], [0, 0, -1], [0, 0, 0], 'entv', {emis: mix([30, 40, 80], [200, 210, 255], ec)}));
  coque.push(boite(cam, ctx, [E.x1 - 70, E.x1 - 40], [40, 60], [SA.z1 - 0.06, SA.z1 - 0.03], [0.9, 0.8, 0.4], 'entp'));
  // la télé (mur de droite)
  const tvC = mix([10, 10, 20], [120, 140, 255], tv * tvPulse);
  coque.push(boite(cam, ctx, [SA.x1 - 30, SA.x1 - 4], [-300, 60], [1.2, 2.4], [0.05, 0.05, 0.06], 'tvb'));
  coque.push(face(cam, ctx, [[SA.x1 - 31, -285, 1.22], [SA.x1 - 31, -285, 2.38], [SA.x1 - 31, 45, 2.38], [SA.x1 - 31, 45, 1.22]], [-1, 0, 0], [0, 0, 0], 'tve', {emis: tvC}));
  if (tv > 0.05) coque.push(halo(cam, [SA.x1 - 60, -120, 1.8], 1300, '#8a9aff', 0.3 * tv, 'tvh'));
  coque.push(boite(cam, ctx, [SA.x1 - 260, SA.x1 - 4], [250, SOL], [1.1, 2.5], [0.25, 0.22, 0.26], 'tvm', {sub: 2}));
  // cadres
  [[-200, -360, 0.9], [-500, -330, 1.3]].forEach(([x, y, k2], k) => coque.push(boite(cam, ctx, [x, x + 220], [y, y + 160], [SA.z1 - 0.02, SA.z1 - 0.004], [0.9, 0.85, 0.7], `sac${k}`)));
  const items = [];
  // l'escalier qui monte le long du mur de gauche (marches pleines), le placard dessous
  const S = ESC;
  for (let k = 0; k < S.n; k++) {
    const za = S.za + k * S.pas;
    const yt = SOL - (k + 1) * S.marche;
    items.push({z: za + 0.1, x: S.x1 - 150, y: yt, el: boite(cam, ctx, [S.x0, S.x1], [yt, SOL], [za, za + S.pas + (k === S.n - 1 ? 0.3 : 0)], [0.62, 0.48, 0.38], `esc${k}`, {sub: 2, sans: ['bas', 'g']})});
  }
  // rampe
  items.push({z: S.za + 0.6, x: S.x1, y: SOL - 400, el: (
    <g key="rmp">
      {(() => {
        const s = cam.seg([S.x1 - 10, SOL - S.marche - 260, S.za], [S.x1 - 10, SOL - S.n * S.marche - 260, S.za + S.n * S.pas]);
        return s ? <line x1={s[0][0]} y1={s[0][1]} x2={s[1][0]} y2={s[1][1]} stroke={ombre(cam, [0.95, 0.95, 0.95], [S.x1, 0, 1.5], [1, 0, 0], ctx)} strokeWidth={10 * cam.scale(1.5, S.x1, 0)} strokeLinecap="round" /> : null;
      })()}
    </g>
  )});
  // porte du placard sous l'escalier (face latérale des marches)
  const P = PLACARD;
  items.push({z: P.z0 + 0.01, x: S.x1 + 2, y: 200, el: (
    <g key="plc">
      {face(cam, ctx, [[S.x1 + 3, P.y0, P.z0], [S.x1 + 3, P.y0, P.z1], [S.x1 + 3, SOL, P.z1], [S.x1 + 3, SOL, P.z0]], [1, 0, 0], [0.88, 0.86, 0.84], 'plcp', {sub: 3})}
      {[0.15, 0.35, 0.55, 0.75].map((u, k) => {
        const s = cam.seg([S.x1 + 5, P.y0 + 60, P.z0 + 0.06 + u * 0.5], [S.x1 + 5, SOL - 40, P.z0 + 0.06 + u * 0.5]);
        return s ? <line key={k} x1={s[0][0]} y1={s[0][1]} x2={s[1][0]} y2={s[1][1]} stroke="#000" strokeOpacity="0.35" strokeWidth={4 * cam.scale(P.z0, S.x1, 0)} /> : null;
      })}
      {boite(cam, ctx, [S.x1 + 4, S.x1 + 20], [140, 165], [P.z1 - 0.1, P.z1 - 0.06], [0.9, 0.8, 0.4], 'plcpo')}
    </g>
  )});
  // canapé face à la télé, table basse, lampe sur pied
  const C = CANAPE;
  items.push({z: (C.z0 + C.z1) / 2, x: C.x0 + 80, el: (
    <g key="can">
      {boite(cam, ctx, [C.x0, C.x0 + 90], [-40, SOL], [C.z0, C.z1], [0.36, 0.3, 0.55], 'cand', {sub: 3})}
      {boite(cam, ctx, [C.x0 + 90, C.x1], [190, SOL], [C.z0, C.z1], [0.4, 0.34, 0.6], 'cans', {sub: 3})}
      {boite(cam, ctx, [C.x0, C.x1], [90, SOL], [C.z0 - 0.15, C.z0], [0.34, 0.28, 0.52], 'cana1', {sub: 2})}
      {boite(cam, ctx, [C.x0, C.x1], [90, SOL], [C.z1, C.z1 + 0.15], [0.34, 0.28, 0.52], 'cana2', {sub: 2})}
      {boite(cam, ctx, [C.x0 + 100, C.x0 + 190], [100, 200], [C.z0 + 0.1, C.z0 + 0.4], [0.95, 0.75, 0.3], 'cous')}
    </g>
  )});
  items.push({z: 1.85, x: 830, el: boite(cam, ctx, [700, 960], [290, 330], [1.5, 2.2], [0.5, 0.36, 0.26], 'tab', {sub: 2})});
  items.push({z: 2.9, x: 130, el: (
    <g key="lmp">
      {boite(cam, ctx, [122, 138], [-230, SOL], [2.89, 2.91], [0.2, 0.2, 0.2], 'lmpt')}
      {boite(cam, ctx, [60, 200], [-330, -230], [2.83, 2.97], [0, 0, 0], 'lmpa', {emis: {av: mix([40, 30, 25], [255, 200, 140], lampe), g: mix([40, 30, 25], [230, 170, 110], lampe), d: mix([40, 30, 25], [230, 170, 110], lampe)}})}
      {halo(cam, [130, -280, 2.88], 600, '#ffc080', 0.45 * lampe, 'lmph')}
    </g>
  )});
  (o.extra || []).forEach((it) => items.push(it));
  return {fond: <g>{coque}</g>, items, ctx};
};
// hauteur du sol de l'escalier à une profondeur z
export const solEscalier = (z) => SOL - Math.max(0, Math.min(ESC.n, Math.ceil((z - ESC.za) / ESC.pas - 0.001))) * ESC.marche;

// ===================== 4. la cuisine (cyan) =====================
export const CU = {x0: -800, x1: 800, z0: 0, z1: 2.2};
export const cuisine = (cam, f, fg, o = {}) => {
  const ec = eclair(fg) * (o.eclairs ?? 1);
  const lums = [
    {p: [0, -220, 2.5], c: [0.4, 0.7, 0.9], i: 0.6 + 2.2 * ec, r: 1500},
    {p: [-650, -50, 1.4], c: [0.6, 0.95, 1], i: 0.45 * (o.frigo ?? 1), r: 700},
    ...(o.lumieres || []),
  ];
  const ctx = {lums, amb: [0.01, 0.025, 0.03], F: {portee: 5, brume: [6, 20, 26]}};
  const coque = coquille(cam, ctx, {...CU, mur: [0.7, 0.82, 0.84], sol: [0.6, 0.6, 0.62], plafond: [0.72, 0.8, 0.8]}, 'cu');
  coque.push(...fenetre(cam, ctx, [-300, 300], [-400, -40], CU.z1 - 0.004, fg, ec, 'cuf', {ciel: [10, 22, 40]}));
  const items = [];
  items.push({z: 1.95, x: 0, el: (
    <g key="plan">
      {boite(cam, ctx, [-780, 780], [80, SOL], [1.7, 2.2], [0.86, 0.88, 0.9], 'cub', {sub: 3})}
      {boite(cam, ctx, [-790, 790], [60, 80], [1.66, 2.2], [0.3, 0.32, 0.34], 'cut', {sub: 3})}
      {boite(cam, ctx, [-200, 200], [62, 70], [1.8, 2.1], [0.15, 0.17, 0.18], 'evier')}
      {[-600, -300, 300, 600].map((x, k) => boite(cam, ctx, [x - 140, x + 140], [-560, -300], [1.95, 2.2], [0.86, 0.88, 0.9], `hau${k}`, {sub: 2}))}
    </g>
  )});
  items.push({z: 1.2, x: -700, el: (
    <g key="frg">
      {boite(cam, ctx, [-800, -560], [-300, SOL], [0.8, 1.6], [0.9, 0.92, 0.94], 'frgb', {sub: 3})}
      {boite(cam, ctx, [-570, -560], [-100, 40], [0.9, 0.94], [0.4, 0.4, 0.4], 'frgp')}
    </g>
  )});
  (o.extra || []).forEach((it) => items.push(it));
  return {fond: <g>{coque}</g>, items, ctx};
};

// ===================== 5. le jardin (violet, orage) et la façade =====================
export const FA = {x0: -1700, x1: 1700, z: 6.0, toit: -1550, etage: -560};
export const FEN_LENA = {x0: 450, x1: 950, y0: -1350, y1: -950};
export const PORTAIL = {x: 0, z: 0.4};
export const jardin = (cam, f, fg, o = {}) => {
  const ec = eclair(fg) * (o.eclairs ?? 1);
  const fl = o.fenetreLena ?? 0;
  const lums = [
    {p: [0, -3000, 2], c: [0.55, 0.45, 1], i: 0.25 + 3 * ec, r: 5000},
    {p: [(FEN_LENA.x0 + FEN_LENA.x1) / 2, -1150, FA.z - 0.3], c: LED_C, i: 1.4 * fl, r: 1600},
    {p: [-900, -300, FA.z - 0.2], c: [0.4, 0.5, 1], i: 0.35 * (o.salonLum ?? 0.5), r: 1200},
    {p: [600, -300, FA.z - 0.2], c: [0.4, 0.9, 1], i: 0.3, r: 1000},
    ...(o.lumieres || []),
  ];
  const ctx = {lums, amb: [0.02, 0.015, 0.04], F: {portee: 9, brume: [22, 16, 44]}};
  const out = [];
  // ciel d'orage + silhouette des arbres (2D, suit la caméra en lacet)
  const ciel = mix([28, 18, 60], [170, 160, 230], ec * 0.7);
  out.push(
    <g key="ciel">
      <defs>
        <linearGradient id="jc-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={rgb(mix([10, 6, 26], ciel, 0.4))} />
          <stop offset="1" stopColor={rgb(ciel)} />
        </linearGradient>
      </defs>
      <rect x="-200" y="-200" width="1480" height="2400" fill="url(#jc-g)" />
    </g>,
  );
  const [hx, hy] = cam.proj(cam.x + Math.sin((cam.yaw * Math.PI) / 180) * 1e5, SOL - 800, cam.z + Math.cos((cam.yaw * Math.PI) / 180) * 100);
  const decal = -(cam.yaw || 0) * 12;
  out.push(
    <g key="arb">
      <path d={`M-400,${hy} ${[...Array(30)].map((_, k) => `L${-400 + k * 70 + (decal % 70)},${hy - 120 - 160 * R(`ar${k}`) - 60 * Math.sin(k)}`).join(' ')} L1800,${hy} L1800,2400 L-400,2400 Z`} fill={rgb(mix([8, 6, 18], ciel, 0.15))} />
    </g>,
  );
  // pelouse
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 6; j++) {
      const xa = -3000 + i * 750;
      const za = -1 + j * 1.2;
      out.push(face(cam, ctx, [[xa, SOL, za], [xa + 750, SOL, za], [xa + 750, SOL, za + 1.2], [xa, SOL, za + 1.2]], [0, -1, 0], [0.22, 0.3, 0.2].map((c) => c * (0.85 + 0.2 * R(`pe${i}${j}`))), `pe${i}_${j}`, {sub: 2}));
    }
  }
  // allée
  out.push(face(cam, ctx, [[-200, SOL - 2, 0], [200, SOL - 2, 0], [200, SOL - 2, FA.z], [-200, SOL - 2, FA.z]], [0, -1, 0], [0.45, 0.42, 0.45], 'allee', {sub: 4}));
  const items = [];
  // la façade (boîte) avec ses fenêtres
  items.push({z: FA.z + 1, x: 0, y: -600, el: (
    <g key="fac">
      {boite(cam, ctx, [FA.x0, FA.x1], [FA.toit, SOL], [FA.z, FA.z + 2.4], [0.62, 0.6, 0.7], 'facb', {sub: 6})}
      {(() => {
        const toit = [[FA.x0 - 100, FA.toit, FA.z - 0.1], [FA.x1 + 100, FA.toit, FA.z - 0.1], [0, FA.toit - 700, FA.z + 1.2]];
        const p = cam.poly(toit);
        return p ? <polygon points={p} fill={ombre(cam, [0.3, 0.22, 0.3], [0, FA.toit, FA.z], [0, -0.5, -0.86], ctx)} /> : null;
      })()}
      {[[FEN_LENA, fl], [{x0: -1200, x1: -700, y0: -1350, y1: -950}, 0], [{x0: -1300, x1: -600, y0: -330, y1: 60}, o.salonLum ?? 0.5], [{x0: 450, x1: 950, y0: -330, y1: 60}, 0.15]].map(([F, on], k) => (
        <g key={k}>
          {face(cam, ctx, [[F.x0, F.y0, FA.z - 0.004], [F.x1, F.y0, FA.z - 0.004], [F.x1, F.y1, FA.z - 0.004], [F.x0, F.y1, FA.z - 0.004]], [0, 0, -1], [0, 0, 0], `fv${k}`, {emis: k === 0 ? mix([12, 8, 14], [255, 120, 60], on) : k === 2 ? mix([12, 8, 14], [90, 110, 220], on) : mix([12, 8, 14], [60, 140, 160], on)})}
          {on > 0.05 && halo(cam, [(F.x0 + F.x1) / 2, (F.y0 + F.y1) / 2, FA.z - 0.05], 900, k === 0 ? '#ff7a3a' : '#7a8aff', 0.3 * on, `fh${k}`)}
          {boite(cam, ctx, [F.x0 - 20, F.x1 + 20], [F.y1, F.y1 + 24], [FA.z - 0.05, FA.z], [0.85, 0.85, 0.85], `fa${k}`)}
        </g>
      ))}
      {boite(cam, ctx, [-200, 200], [-330, SOL], [FA.z - 0.02, FA.z], [0.3, 0.2, 0.25], 'facp')}
    </g>
  )});
  if (o.fenetre) items.push({z: FA.z - 0.02, x: (FEN_LENA.x0 + FEN_LENA.x1) / 2, y: -1150, el: o.fenetre});
  // clôture et portail
  for (let x = -3000; x < 3000; x += 120) {
    if (Math.abs(x - PORTAIL.x) < 260 && (o.portailOuvert ?? 0) > 0.5) continue;
    items.push({z: PORTAIL.z, x, y: 250, el: boite(cam, ctx, [x, x + 26], [180, SOL], [PORTAIL.z, PORTAIL.z + 0.03], [0.85, 0.82, 0.9], `cl${x}`)});
  }
  items.push({z: PORTAIL.z, x: 0, y: 210, el: boite(cam, ctx, [-3000, 3000], [210, 230], [PORTAIL.z - 0.005, PORTAIL.z], [0.85, 0.82, 0.9], 'cltr')});
  // arbres proches (troncs + houppiers sombres), de chaque côté
  [[-1400, 2.5], [1500, 3.2], [-2400, 0.8], [2300, 1.5]].forEach(([x, z], k) => {
    items.push({z, x, y: 0, el: (
      <g key={`ar${k}`}>
        {boite(cam, ctx, [x - 50, x + 50], [-600, SOL], [z - 0.05, z + 0.05], [0.25, 0.2, 0.22], `art${k}`)}
        {(() => {
          if (!cam.visible(z, x, -900)) return null;
          const [cx, cy] = cam.proj(x, -900, z);
          const s = cam.scale(z, x, -900);
          return <ellipse cx={cx} cy={cy} rx={420 * s} ry={480 * s} fill={ombre(cam, [0.12, 0.16, 0.14], [x, -900, z], null, ctx)} />;
        })()}
      </g>
    )});
  });
  (o.extra || []).forEach((it) => items.push(it));
  return {fond: <g>{out}</g>, items, ctx};
};

// ===================== personnages =====================
// liseré lumineux autour d'un personnage (comme le perso jaune des références)
export const RimDefs = ({couleurs}) => (
  <defs>
    {Object.entries(couleurs).map(([nom, c]) => (
      <filter key={nom} id={`rim-${nom}`} x="-20%" y="-20%" width="140%" height="140%">
        <feMorphology in="SourceAlpha" operator="dilate" radius="5" result="d" />
        <feFlood floodColor={c} result="c" />
        <feComposite in="c" in2="d" operator="in" result="l" />
        <feGaussianBlur in="l" stdDeviation="5" result="lb" />
        <feMerge>
          <feMergeNode in="lb" />
          <feMergeNode in="lb" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    ))}
  </defs>
);
export const RIMS = {orange: '#ffb070', vert: '#9affc0', bleu: '#a8b4ff', cyan: '#9af0ff', violet: '#d0a8ff', blanc: '#ffffff'};
// le bonhomme dans la pièce, teinté par la lumière, avec liseré
export const Moi = ({cam, ctx, x, z, y = SOL, rim = 'orange', k = 1, id = 'moi', ...pose}) => {
  const t = eclairePerso(ctx, [x, y - 300, z], k);
  return (
    <g filter={rim ? `url(#rim-${rim})` : undefined}>
      <Perso cam={cam} id={id} x={x} z={z} y={y} teinte={t} ombre={0.45} {...pose} />
    </g>
  );
};
export const LENA = {coiffure: 'long', cils: true, couleurs: {chev: '#c8803a', haut: '#ffd8ea', hautO: '#f0b8d0', pant: '#ffb8d8', peau: '#f2c3a0', peauO: '#e3a984'}};
export const Lena = ({cam, ctx, x, z, y = SOL, rim = 'orange', id = 'lena', ...pose}) => {
  const t = eclairePerso(ctx, [x, y - 200, z]);
  return (
    <g filter={rim ? `url(#rim-${rim})` : undefined}>
      <Perso cam={cam} id={id} x={x} z={z} y={y} teinte={t} sx={0.66} sy={0.66} {...LENA} {...pose} />
    </g>
  );
};
// la créature : silhouette noire immense, liseré coloré, yeux qui brillent, sourire plein de dents
export const Creature = ({cam, x, z, y = SOL, echelle = 1, rim = '#ff8a5a', pose, sourire = 1, tete = 0, id = 'cr', lum = 1}) => {
  if (!cam.visible(z, x, y - 500)) return null;
  const [px, py] = cam.proj(x, y - 500 * echelle, z);
  const s = cam.scale(z, x, y - 500) * echelle;
  return (
    <g transform={`translate(${px} ${py}) scale(${s}) translate(0 500)`}>
      <Rodeur pose={pose} couleur={[8, 7, 12]} visage="sourire" rim={rim} lum={lum} sourire={sourire} tete={tete} id={id} />
    </g>
  );
};
// petite tête qui dépasse de la couette (Léna couchée)
export const TeteCouchee = ({cam, x, y, z, s = 1, yeux = 0, ctx, id = 'tc', couleurs = LENA}) => {
  if (!cam.visible(z, x, y)) return null;
  const [px, py] = cam.proj(x, y, z);
  const k = cam.scale(z, x, y) * 0.78 * s;
  const t = eclairePerso(ctx, [x, y, z]);
  return (
    <g>
      <defs>
        <filter id={id}>
          <feColorMatrix type="matrix" values={`${t[0]} 0 0 0 0  0 ${t[1]} 0 0 0  0 0 ${t[2]} 0 0  0 0 0 1 0`} />
        </filter>
        <clipPath id={`${id}-c`}>
          <rect x="150" y="60" width="300" height="230" />
        </clipPath>
      </defs>
      <g filter={`url(#${id})`} transform={`translate(${px} ${py}) scale(${k}) translate(-300 -230)`}>
        <g clipPath={`url(#${id}-c)`}>
          <Bonhomme {...couleurs} eyes={yeux} />
        </g>
      </g>
    </g>
  );
};

// ===================== l'habillage : l'heure et le lieu en haut (comme les références) =====================
export const POLICE_HUD = "'AntonB', 'Impact', sans-serif";
export const HUD = ({f, lieu, heure, rouge = true, op = 1}) => (
  <g opacity={op}>
    <circle cx={540 - lieu.length * 12.4 - 22} cy={238} r="9" fill="#ff3a3a" opacity={rouge ? 0.6 + 0.4 * Math.sin(f / 5) : 0.5} />
    <text x={540} y={248} textAnchor="middle" fontFamily="'DejaVu Sans', sans-serif" fontWeight="700" fontSize="30" letterSpacing="9" fill="#e8e8f0" opacity="0.9">{lieu}</text>
    <text x={544} y={392} textAnchor="middle" fontFamily={POLICE_HUD} fontSize="138" fill="#000" opacity="0.35">{heure}</text>
    <text x={540} y={386} textAnchor="middle" fontFamily={POLICE_HUD} fontSize="138" fill="#ffffff">{heure}</text>
  </g>
);
// heure qui défile : départ « 23:00:00 » + secondes écoulées (accélérée si besoin)
export const horloge = (base, secondes) => {
  const [h, m, s] = base.split(':').map(Number);
  const t = h * 3600 + m * 60 + s + Math.floor(secondes);
  const hh = Math.floor(t / 3600) % 24;
  return `${String(hh).padStart(2, '0')}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};
// pluie (2D, par-dessus les plans extérieurs)
export const Pluie2 = ({f, n = 70, force = 1, id = 'p2'}) => (
  <g opacity={0.5 * force}>
    {[...Array(n)].map((_, k) => {
      const x = R(`${id}x${k}`) * 1300 - 100;
      const y = ((R(`${id}y${k}`) * 2200 + f * (60 + 30 * R(`${id}v${k}`))) % 2200) - 140;
      return <line key={k} x1={x} y1={y} x2={x - 14} y2={y + 70} stroke="#c8c0ff" strokeWidth={1.5 + R(`${id}w${k}`) * 1.5} opacity={0.4 + 0.5 * R(`${id}o${k}`)} />;
    })}
  </g>
);
