import {random} from 'remotion';
import {foret, mix, palette, rgb, SOL} from './ForetNuit';

// ===================== La station-service, version « forêt » (même rendu que « Rentrez chez vous ») =====================
// Une clairière dans la forêt de nuit (ForetNuit), une route qui s'enfonce entre les arbres, et la station : l'auvent et
// ses néons froids, l'îlot de la pompe, la voiture, la boutique vitrée éclairée de l'intérieur.
// Éclairage « physique » simple, face par face : lumières ponctuelles (néons, vitrine, phares…) avec atténuation et
// orientation de la face (Lambert adouci), lune bleue en ambiance, brume selon la distance, rendu filmique (pas d'aplat
// saturé). Les objets lumineux se reflètent sur l'asphalte mouillé (reflet miroir flouté) et éclairent la brume (cônes).
const R = (s) => random(s);
const borne = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export const AUV = {x0: -1900, x1: 1900, z0: -0.6, z1: 3.6, y: -1100, ep: 150};
export const PILIERS = [[-1500, -0.2], [1500, -0.2], [-1500, 3.2], [1500, 3.2]];
export const ILOT = {x0: 300, x1: 470, z0: 0.95, z1: 2.6};
export const POMPE = {x: 385, z: 1.75};
export const VOIT = {x0: -760, x1: -120, z0: 0.75, z1: 2.5};
export const MOI = {x: 95, z: 1.95};
export const BOUT = {x0: -1700, x1: 1700, z0: 5.6, z1: 9.6, toit: -940, plaf: -800, haut: -640, vitre: 300};
export const PORTE = {x0: 560, x1: 920};
export const ENSEIGNE = {x: -2300, z: -1.2};
// néons de l'auvent : [x, y, z]
export const NEONS = [[-1050, AUV.y + AUV.ep, 0.5], [0, AUV.y + AUV.ep, 0.5], [1050, AUV.y + AUV.ep, 0.5], [-1050, AUV.y + AUV.ep, 2.6], [0, AUV.y + AUV.ep, 2.6], [1050, AUV.y + AUV.ep, 2.6]];
const NEON_C = [0.82, 0.93, 1.08];
const VITRINE_C = [1.0, 1.0, 0.86];

// néon qui grésille (déterministe)
export const gresille = (f, seed, k = 1) => (R(`gr${seed}${Math.floor(f / 2)}`) > 0.35 * k ? 1 : 0.12);

// ----- l'éclairage -----
// L : {auvent: [6], vitrine: 0..1, ecran, extra: [{p:[x,y,z], c:[r,g,b], i, r}]}
const sous = (a, b) => [a[0] - b[0], a[1] - b[1], (a[2] - b[2]) * 1000];
const norme = (v) => {
  const l = Math.hypot(...v) || 1;
  return v.map((x) => x / l);
};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const ponctuelle = (p, n, q, I, portee) => {
  const v = sous(q, p);
  const d = Math.hypot(...v);
  const ndl = n ? dot(n, v.map((x) => x / (d || 1))) : 0.6;
  // Lambert adouci (un peu de lumière diffuse même de biais) × atténuation
  return I * (0.12 + 0.88 * Math.max(0, ndl)) / (1 + (d / portee) ** 2);
};
export const lumiere = (p, n, L) => {
  // lune / ciel : bleu froid, plus fort sur les faces tournées vers le haut
  const ciel = n ? 0.5 + 0.5 * Math.max(0, -n[1]) : 0.6;
  let c = [0.022 * ciel + 0.01, 0.022 * ciel + 0.01, 0.045 * ciel + 0.02];
  const add = (col, v) => {
    c = [c[0] + col[0] * v, c[1] + col[1] * v, c[2] + col[2] * v];
  };
  (L.auvent || []).forEach((on, k) => {
    if (on < 0.05) return;
    // le néon éclaire vers le bas : rien au-dessus de l'auvent
    if (p[1] < NEONS[k][1] - 20) return;
    add(NEON_C, ponctuelle(p, n, NEONS[k], 1.05 * on, 1150));
  });
  const vit = L.vitrine ?? 1;
  if (vit > 0.05) {
    [-1250, -420, 420, 1250].forEach((x) => {
      const q = [x, -200, BOUT.z0 + 0.25];
      if (p[2] > BOUT.z0 + 0.05) return;
      add(VITRINE_C, ponctuelle(p, n, q, 0.55 * vit, 1300));
    });
  }
  if ((L.ecran ?? 1) > 0) add([0.3, 1, 0.55], ponctuelle(p, n, [POMPE.x - 150, -140, POMPE.z], 0.12 * (L.ecran ?? 1), 300));
  (L.extra || []).forEach((e) => add(e.c, ponctuelle(p, n, e.p, e.i, e.r)));
  return c;
};
// rendu filmique : pas de blanc cramé, les noirs restent profonds
const film = (v) => 1 - Math.exp(-v * 2.3);
// albedo × lumière, puis brume selon la distance
export const ombre = (cam, albedo, p, n, L, F) => {
  const l = lumiere(p, n, L);
  let col = albedo.map((a, i) => film(a * l[i]) * 255);
  if (F) {
    const dd = Math.max(0, cam.profondeur(p[2], p[0], p[1]));
    const b = 1 - Math.exp(-dd / F.portee);
    const lb = lumiere(p, null, L);
    const brume = F.brume.map((v, i) => v + film(lb[i] * 0.5) * 120);
    col = mix(col, brume, b * 0.9);
  }
  return rgb(col);
};

// ----- faces -----
// pts : 4+ points 3D, n : normale (unité, z non mis à l'échelle). On n'affiche que les faces tournées vers la caméra.
const face = (cam, ctx, pts, n, albedo, key, {sub = 1, emis = null, double = false, op = 1} = {}) => {
  const c = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length, a[2] + p[2] / pts.length], [0, 0, 0]);
  if (!double && n && dot(n, sous([cam.x, cam.y, cam.z], c)) <= 0) return null;
  if (sub > 1 && pts.length === 4) {
    // subdivision : l'éclairage varie sur les grandes faces (taches de lumière, dégradés)
    const out = [];
    const lp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    for (let i = 0; i < sub; i++) {
      for (let j = 0; j < sub; j++) {
        const q = (u, v) => lp(lp(pts[0], pts[1], u), lp(pts[3], pts[2], u), v);
        const qs = [q(i / sub, j / sub), q((i + 1) / sub, j / sub), q((i + 1) / sub, (j + 1) / sub), q(i / sub, (j + 1) / sub)];
        out.push(face(cam, ctx, qs, n, albedo, `${key}-${i}-${j}`, {emis, double: true, op}));
      }
    }
    return <g key={key}>{out}</g>;
  }
  const p = cam.poly(pts);
  if (!p) return null;
  const fill = emis ? rgb(emis) : ombre(cam, albedo, c, n, ctx.L, ctx.F);
  return <polygon key={key} points={p} fill={fill} stroke={fill} strokeWidth="1.2" strokeLinejoin="round" opacity={op} />;
};
// une boîte (x0..x1, y0 haut..y1 bas, z0..z1)
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
// halo lumineux (bloom) autour d'un point
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
          <stop offset="0.25" stopColor={couleur} stopOpacity={op * 0.45} />
          <stop offset="1" stopColor={couleur} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={x} cy={y} r={rr} fill={`url(#${id})`} />
    </g>
  );
};

// ----- la voiture : un vrai volume (profil extrudé), vitres sombres qui reflètent les néons -----
// profil latéral (dz depuis l'avant, y) de la caisse et de l'habitacle
const CAISSE = [[0, 330], [0, 205], [0.06, 158], [0.5, 132], [1.42, 120], [1.66, 150], [1.75, 205], [1.75, 330]];
const HAB = [[0.5, 132], [0.86, -120], [1.3, -128], [1.5, 120]];
const ROUES = [0.35, 1.38];
const profilFaces = (cam, ctx, prof, xg, xd, z0, alb, key, {vitre = false, ferme = true} = {}) => {
  const out = [];
  const P = prof.map(([dz, y]) => [z0 + dz, y]);
  // bandes entre deux points du profil (capot, pare-brise, toit, lunette, coffre, pare-chocs)
  for (let i = 0; i < P.length - (ferme ? 0 : 1); i++) {
    const a = P[i];
    const b = P[(i + 1) % P.length];
    const t = norme([0, b[1] - a[1], (b[0] - a[0]) * 1000]);
    // normale vers l'extérieur (profil parcouru avant → arrière par le haut)
    const n = [0, -t[2], t[1]];
    const pts = [[xg, a[1], a[0]], [xd, a[1], a[0]], [xd, b[1], b[0]], [xg, b[1], b[0]]];
    const estVitre = vitre && Math.abs(n[1]) < 0.85;
    out.push(face(cam, ctx, pts, n, estVitre ? [0.05, 0.06, 0.08] : alb, `${key}b${i}`, {sub: estVitre ? 1 : 3}));
    if (estVitre) {
      // reflet du néon : une bande claire en biais
      const c = cam.poly([[xg + 60, a[1] + (b[1] - a[1]) * 0.2, a[0] + (b[0] - a[0]) * 0.2], [xg + 200, a[1] + (b[1] - a[1]) * 0.2, a[0] + (b[0] - a[0]) * 0.2], [xg + 120, a[1] + (b[1] - a[1]) * 0.75, a[0] + (b[0] - a[0]) * 0.75], [xg - 20, a[1] + (b[1] - a[1]) * 0.75, a[0] + (b[0] - a[0]) * 0.75]]);
      if (c && dot(n, sous([cam.x, cam.y, cam.z], [xg, a[1], a[0]])) > 0) out.push(<polygon key={`${key}r${i}`} points={c} fill="#d8ecff" opacity="0.13" />);
    }
  }
  // flancs
  [[xg, -1], [xd, 1]].forEach(([x, s]) => {
    out.push(face(cam, ctx, P.map(([z, y]) => [x, y, z]), [s, 0, 0], vitre ? [0.05, 0.06, 0.08] : alb, `${key}f${s}`));
  });
  return out;
};
const roue = (cam, ctx, x, zc, key) => {
  const pts = [...Array(14)].map((_, k) => {
    const a = (k / 14) * Math.PI * 2;
    return [x, 345 + Math.sin(a) * 88, zc + (Math.cos(a) * 88) / 1000];
  });
  const p = cam.poly(pts);
  if (!p) return null;
  const jante = cam.poly(pts.map(([xx, y, z]) => [xx, 345 + (y - 345) * 0.55, zc + (z - zc) * 0.55]));
  return (
    <g key={key}>
      <polygon points={p} fill="#060608" />
      {jante && <polygon points={jante} fill={ombre(cam, [0.45, 0.46, 0.5], [x, 345, zc], [Math.sign(x - VOIT.x0 - 300), 0, 0], ctx.L, ctx.F)} />}
    </g>
  );
};
export const voiture = (cam, ctx, o = {}) => {
  const V = VOIT;
  const alb = o.couleur || [0.1, 0.11, 0.17];
  const el = [];
  // ombre portée sous la voiture
  const om = cam.poly([[V.x0 - 40, SOL - 1, V.z0 - 0.05], [V.x1 + 40, SOL - 1, V.z0 - 0.05], [V.x1 + 40, SOL - 1, V.z1 + 0.05], [V.x0 - 40, SOL - 1, V.z1 + 0.05]]);
  if (om) el.push(<polygon key="om" points={om} fill="#000" opacity="0.55" />);
  // roues du côté opposé d'abord
  const cote = cam.x > (V.x0 + V.x1) / 2 ? 1 : -1;
  ROUES.forEach((dz, k) => el.push(roue(cam, ctx, cote > 0 ? V.x0 + 10 : V.x1 - 10, V.z0 + dz, `ro${k}`)));
  el.push(...profilFaces(cam, ctx, CAISSE, V.x0, V.x1, V.z0, alb, 'cai'));
  el.push(...profilFaces(cam, ctx, HAB, V.x0 + 70, V.x1 - 70, V.z0, alb, 'hab', {vitre: true, ferme: false}));
  // montants (pied B) et poignées sur le flanc visible
  const xv = cote > 0 ? V.x1 + 2 : V.x0 - 2;
  if (Math.sign(cam.x - xv) === cote) {
    const pb = cam.poly([[xv - cote * 70, -124, V.z0 + 1.06], [xv - cote * 70, -124, V.z0 + 1.12], [xv, 125, V.z0 + 1.12], [xv, 125, V.z0 + 1.04]]);
    if (pb) el.push(<polygon key="pb" points={pb} fill={ombre(cam, alb, [xv, 0, V.z0 + 1.1], [cote, 0, 0], ctx.L, ctx.F)} />);
    [0.75, 1.25].forEach((dz, k) => {
      const q = cam.poly([[xv, 175, V.z0 + dz], [xv, 175, V.z0 + dz + 0.12], [xv, 190, V.z0 + dz + 0.12], [xv, 190, V.z0 + dz]]);
      if (q) el.push(<polygon key={`po${k}`} points={q} fill="#9aa4b8" opacity="0.6" />);
    });
    // la trappe à essence (côté droit, vers l'arrière)
    if (cote > 0) {
      const t = cam.poly([[xv, 150, V.z0 + 1.45], [xv, 150, V.z0 + 1.58], [xv, 230, V.z0 + 1.58], [xv, 230, V.z0 + 1.45]]);
      if (t) el.push(<polygon key="tr" points={t} fill="#0a0c12" />);
    }
    // ligne de caisse claire (reflet du néon)
    const lc = cam.seg([xv, 160, V.z0 + 0.1], [xv, 140, V.z0 + 1.65]);
    if (lc) el.push(<line key="lc" x1={lc[0][0]} y1={lc[0][1]} x2={lc[1][0]} y2={lc[1][1]} stroke="#cfe2ff" strokeOpacity="0.18" strokeWidth={Math.max(1.5, 14 * cam.scale(V.z0 + 0.9, xv, 150))} />);
  }
  ROUES.forEach((dz, k) => el.push(roue(cam, ctx, cote > 0 ? V.x1 + 4 : V.x0 - 4, V.z0 + dz, `rp${k}`)));
  // phares (avant) et feux (arrière)
  [[V.x0 + 90, V.x0 + 230], [V.x1 - 230, V.x1 - 90]].forEach(([a, b], k) => {
    const ph = cam.poly([[a, 175, V.z0 - 0.002], [b, 175, V.z0 - 0.002], [b, 215, V.z0 + 0.03], [a, 215, V.z0 + 0.03]]);
    if (ph && cam.z < V.z0) el.push(<polygon key={`ph${k}`} points={ph} fill={o.phares ? '#fff8dc' : '#7a7e88'} />);
    const fe = cam.poly([[a, 170, V.z1 + 0.002], [b, 170, V.z1 + 0.002], [b, 210, V.z1 + 0.002], [a, 210, V.z1 + 0.002]]);
    if (fe && cam.z > V.z1) el.push(<polygon key={`fe${k}`} points={fe} fill={o.feux ? '#ff3030' : '#5a1416'} />);
  });
  if (o.phares) [V.x0 + 160, V.x1 - 160].forEach((x, k) => el.push(halo(cam, [x, 195, V.z0 - 0.05], 600, '#fff2c8', 0.5, `phh${k}`)));
  return {z: (V.z0 + V.z1) / 2, x: (V.x0 + V.x1) / 2, el: <g key="voit">{el}</g>};
};

// ----- la pompe sur son îlot -----
const pompe = (cam, ctx, f, o) => {
  const {x, z} = POMPE;
  const el = [];
  el.push(boite(cam, ctx, [ILOT.x0, ILOT.x1], [SOL - 45, SOL], [ILOT.z0, ILOT.z1], [0.4, 0.4, 0.42], 'ilot', {sub: 2}));
  // bornes de protection jaunes
  [ILOT.z0 + 0.06, ILOT.z1 - 0.06].forEach((zz, k) => el.push(boite(cam, ctx, [x - 18, x + 18], [SOL - 200, SOL - 45], [zz - 0.025, zz + 0.025], [0.6, 0.48, 0.1], `bo${k}`)));
  el.push(boite(cam, ctx, [x - 85, x + 85], [-230, SOL - 45], [z - 0.32, z + 0.32], [0.3, 0.31, 0.35], 'corps', {sub: 3}));
  el.push(boite(cam, ctx, [x - 90, x + 90], [-300, -230], [z - 0.33, z + 0.33], [0.7, 0.08, 0.09], 'tete'));
  // écran (côté voiture, −X) : litres qui défilent
  const xe = x - 86;
  if (cam.x < xe) {
    const p = cam.poly([[xe, -200, z - 0.18], [xe, -200, z + 0.18], [xe, -80, z + 0.18], [xe, -80, z - 0.18]]);
    if (p) {
      const [cx, cy] = cam.proj(xe, -140, z);
      const s = cam.scale(z, xe, -140);
      const yaw = Math.abs(Math.cos(((cam.yaw || 0) * Math.PI) / 180));
      el.push(
        <g key="ecr">
          <polygon points={p} fill="#06140c" />
          <g transform={`translate(${cx} ${cy}) scale(${Math.max(0.25, 1 - yaw * 0.7)} 1)`}>
            <text x="0" y={20 * s} textAnchor="middle" fontFamily="'DejaVu Sans Mono', monospace" fontWeight="700" fontSize={58 * s} fill="#8dffae">{(o.compteur ?? 0).toFixed(2)}</text>
          </g>
        </g>,
      );
    }
  }
  el.push(halo(cam, [xe - 10, -140, z], 260, '#7dffa0', 0.25 * (ctx.L.ecran ?? 1), 'ecrh'));
  // le tuyau : de la pompe jusqu'à la trappe de la voiture, en passant derrière toi
  const tuy = [];
  const a = cam.seg([x - 86, -20, z + 0.1], [x - 86, -20, z + 0.1]);
  if (cam.visible(z, x, 0) && a) {
    const pts = [...Array(16)].map((_, k) => {
      const u = k / 15;
      const P0 = [x - 86, -20, z + 0.1];
      const P1 = [MOI.x + 40, 380, MOI.z + 0.55];
      const P2 = o.tuyau === 'pose' ? [x - 100, 40, z] : [VOIT.x1 + 5, 190, VOIT.z0 + 1.52];
      const q = P0.map((v, j) => (1 - u) ** 2 * v + 2 * u * (1 - u) * P1[j] + u * u * P2[j]);
      return cam.proj(...q).join(',');
    });
    tuy.push(<polyline key="tuy" points={pts.join(' ')} stroke="#0b0b0d" strokeWidth={Math.max(2, 16 * cam.scale(z, x, 100))} fill="none" strokeLinecap="round" strokeLinejoin="round" />);
  }
  return [{z, x, el: <g key="pompe">{el}</g>}, {z: MOI.z + 0.45, x: MOI.x + 40, el: <g key="tuyau">{tuy}</g>}];
};

// ----- l'auvent : dalle, bandeau rouge, néons -----
const auvent = (cam, ctx, f) => {
  const el = [];
  el.push(boite(cam, ctx, [AUV.x0, AUV.x1], [AUV.y, AUV.y + AUV.ep], [AUV.z0, AUV.z1], [0.62, 0.62, 0.66], 'dalle', {sub: 6, emis: {}}));
  // bandeau rouge sur les tranches
  [[AUV.z0 - 0.003, [0, 0, -1]], [AUV.z1 + 0.003, [0, 0, 1]]].forEach(([zz, n], k) => {
    el.push(face(cam, ctx, [[AUV.x0, AUV.y + 15, zz], [AUV.x1, AUV.y + 15, zz], [AUV.x1, AUV.y + 75, zz], [AUV.x0, AUV.y + 75, zz]], n, [0.9, 0.08, 0.1], `band${k}`, {sub: 4}));
  });
  NEONS.forEach((q, k) => {
    const on = ctx.L.auvent[k];
    const p = cam.poly([[q[0] - 330, q[1] + 3, q[2] - 0.05], [q[0] + 330, q[1] + 3, q[2] - 0.05], [q[0] + 330, q[1] + 3, q[2] + 0.05], [q[0] - 330, q[1] + 3, q[2] + 0.05]]);
    if (p && cam.y > q[1]) el.push(<polygon key={`n${k}`} points={p} fill={on > 0.5 ? '#f6fbff' : '#22252c'} />);
    if (on > 0.2) el.push(halo(cam, [q[0], q[1] + 30, q[2]], 950, '#d6ecff', 0.32 * on, `nh${k}`));
  });
  return el;
};
// cônes de lumière dans la brume, sous chaque néon
const cones = (cam, ctx) =>
  NEONS.map((q, k) => {
    const on = ctx.L.auvent[k];
    if (on < 0.3) return null;
    const pts = [[q[0] - 330, q[1] + 5, q[2]], [q[0] + 330, q[1] + 5, q[2]], [q[0] + 900, SOL, q[2]], [q[0] - 900, SOL, q[2]]];
    const p = cam.poly(pts);
    if (!p) return null;
    return {z: q[2] + 0.02, x: q[0], y: 0, el: (
      <g key={`cn${k}`}>
        <defs>
          <linearGradient id={`sn-cn${k}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e2f0ff" stopOpacity={0.16 * on} />
            <stop offset="0.6" stopColor="#e2f0ff" stopOpacity={0.04 * on} />
            <stop offset="1" stopColor="#e2f0ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={p} fill={`url(#sn-cn${k})`} />
      </g>
    )};
  }).filter(Boolean);

// ----- la boutique vue de dehors : façade vitrée, l'intérieur blanc-vert, la caissière -----
const boutique = (cam, ctx, f, o) => {
  const B = BOUT;
  const el = [];
  const vit = ctx.L.vitrine ?? 1;
  // murs (côtés, toit) : boîte sans la façade
  el.push(boite(cam, ctx, [B.x0, B.x1], [B.toit, SOL], [B.z0, B.z1], [0.5, 0.5, 0.53], 'bmur', {sub: 4, sans: ['av']}));
  // façade : bandeau du haut et soubassement
  el.push(face(cam, ctx, [[B.x0, B.toit, B.z0], [B.x1, B.toit, B.z0], [B.x1, B.haut, B.z0], [B.x0, B.haut, B.z0]], [0, 0, -1], [0.55, 0.55, 0.58], 'bh', {sub: 6}));
  el.push(face(cam, ctx, [[B.x0, B.vitre, B.z0], [B.x1, B.vitre, B.z0], [B.x1, SOL, B.z0], [B.x0, SOL, B.z0]], [0, 0, -1], [0.4, 0.4, 0.43], 'bb', {sub: 6}));
  // l'intérieur, vu par la vitre
  const vp = cam.poly([[B.x0, B.haut, B.z0], [B.x1, B.haut, B.z0], [B.x1, B.vitre, B.z0], [B.x0, B.vitre, B.z0]]);
  if (vp && cam.z < B.z0) {
    const Li = {auvent: [0, 0, 0, 0, 0, 0], vitrine: 0, ecran: 0, extra: [[-1000, 6.6], [1000, 6.6], [-1000, 8.4], [1000, 8.4]].map(([x, z], k) => ({p: [x, B.plaf + 10, z], c: [1, 1, 0.9], i: 1.5 * (o.boutique?.[k] ?? 1) * vit, r: 1400}))};
    const ci = {L: Li, F: null};
    el.push(
      <g key="int">
        <defs>
          <clipPath id="sn-vit">
            <polygon points={vp} />
          </clipPath>
        </defs>
        <polygon points={vp} fill={rgb([16, 18, 20])} />
        <g clipPath="url(#sn-vit)">
          {face(cam, ci, [[B.x0, B.plaf, B.z1], [B.x1, B.plaf, B.z1], [B.x1, SOL, B.z1], [B.x0, SOL, B.z1]], [0, 0, -1], [0.75, 0.78, 0.74], 'ifond', {sub: 5})}
          {face(cam, ci, [[B.x0, SOL, B.z0], [B.x1, SOL, B.z0], [B.x1, SOL, B.z1], [B.x0, SOL, B.z1]], [0, -1, 0], [0.7, 0.7, 0.68], 'isol', {sub: 5})}
          {face(cam, ci, [[B.x0, B.plaf, B.z0], [B.x1, B.plaf, B.z0], [B.x1, B.plaf, B.z1], [B.x0, B.plaf, B.z1]], [0, 1, 0], [0.8, 0.8, 0.8], 'iplaf', {sub: 4})}
          {[-1300, -650, 0].map((x, k) => (
            <g key={k}>
              {boite(cam, ci, [x, x + 420], [-230, SOL], [7.4, 7.9], [0.55, 0.55, 0.58], `ir${k}`)}
              {[-190, -80, 30, 140, 250].map((y, j) => boite(cam, ci, [x + 15, x + 405], [y, y + 70], [7.37, 7.4], [[0.85, 0.3, 0.2], [0.3, 0.5, 0.85], [0.9, 0.75, 0.2], [0.35, 0.75, 0.4], [0.75, 0.3, 0.6]][(j + k) % 5], `ip${k}${j}`))}
            </g>
          ))}
          {boite(cam, ci, [700, 1400], [120, SOL], [6.2, 6.6], [0.55, 0.45, 0.35], 'icpt')}
          {o.caissiere?.el}
          {(o.dedans || []).map((it, k) => <g key={k}>{it.el}</g>)}
          {[[-1000, 6.6], [1000, 6.6], [-1000, 8.4], [1000, 8.4]].map(([x, z], k) => {
            const p = cam.poly([[x - 380, B.plaf + 4, z - 0.12], [x + 380, B.plaf + 4, z - 0.12], [x + 380, B.plaf + 4, z + 0.12], [x - 380, B.plaf + 4, z + 0.12]]);
            return p ? <polygon key={`it${k}`} points={p} fill={(o.boutique?.[k] ?? 1) * vit > 0.5 ? '#ffffff' : '#30333a'} /> : null;
          })}
        </g>
        {/* reflets sur la vitre : l'auvent et les néons s'y reflètent légèrement */}
        <polygon points={vp} fill="#cfe0ff" opacity="0.05" />
      </g>,
    );
    // montants de la vitrine
    for (let x = B.x0; x <= B.x1 + 1; x += 425) {
      const p = cam.poly([[x - 16, B.haut, B.z0 - 0.004], [x + 16, B.haut, B.z0 - 0.004], [x + 16, B.vitre, B.z0 - 0.004], [x - 16, B.vitre, B.z0 - 0.004]]);
      if (p) el.push(<polygon key={`mt${x}`} points={p} fill="#1c1e22" />);
    }
    // la porte (cadre)
    const pf = cam.poly([[PORTE.x0, B.haut + 30, B.z0 - 0.006], [PORTE.x1, B.haut + 30, B.z0 - 0.006], [PORTE.x1, SOL, B.z0 - 0.006], [PORTE.x0, SOL, B.z0 - 0.006]]);
    if (pf) el.push(<polygon key="porte" points={pf} fill="none" stroke="#141518" strokeWidth={Math.max(2, 30 * cam.scale(B.z0, 740, 0))} />);
  }
  // la feuille collée contre la vitre
  if (o.feuille > 0) {
    const fx = o.feuilleX ?? 760;
    const fy = o.feuilleY ?? 90;
    const pts = [[fx - 150, fy - 190, B.z0 - 0.008], [fx + 150, fy - 190, B.z0 - 0.008], [fx + 150, fy + 190, B.z0 - 0.008], [fx - 150, fy + 190, B.z0 - 0.008]];
    const p = cam.poly(pts);
    if (p) {
      const [cx, cy] = cam.proj(fx, fy, B.z0 - 0.008);
      const s = cam.scale(B.z0, fx, fy);
      el.push(
        <g key="feuille" opacity={o.feuille}>
          <polygon points={p} fill="#ece8dc" />
          <g transform={`translate(${cx} ${cy}) scale(${s}) rotate(-3)`} fontFamily="'DejaVu Sans', sans-serif" fontWeight="800" fontStyle="italic" fill="#151515" textAnchor="middle">
            <text y="-70" fontSize="70">NE LÈVE</text>
            <text y="20" fontSize="70">PAS LES</text>
            <text y="110" fontSize="70">YEUX</text>
          </g>
        </g>,
      );
    }
  }
  // enseigne lumineuse sur le bandeau
  const ens = cam.poly([[-650, B.toit + 60, B.z0 - 0.01], [650, B.toit + 60, B.z0 - 0.01], [650, B.toit + 230, B.z0 - 0.01], [-650, B.toit + 230, B.z0 - 0.01]]);
  if (ens && cam.z < B.z0) {
    const [cx, cy] = cam.proj(0, B.toit + 145, B.z0 - 0.01);
    const s = cam.scale(B.z0, 0, B.toit + 145);
    el.push(
      <g key="ens">
        <polygon points={ens} fill="#b0161e" />
        <text x={cx} y={cy + 34 * s} textAnchor="middle" fontFamily="'DejaVu Sans', sans-serif" fontWeight="800" fontSize={100 * s} fill="#ffe9e0" letterSpacing={6 * s}>OUVERT 24/24</text>
      </g>,
    );
  }
  el.push(halo(cam, [0, B.toit + 145, B.z0 - 0.1], 1500, '#ff4a4a', 0.12, 'ensh'));
  if (vit > 0.1) el.push(halo(cam, [0, -150, B.z0 - 0.2], 2600, '#eef6e8', 0.22 * vit, 'bvh'));
  return {z: (B.z0 + B.z1) / 2, x: 0, el: <g key="bout">{el}</g>};
};

// ----- détails : piliers, enseigne de prix, poubelle, bac à glace -----
const details = (cam, ctx, f) => {
  const it = [];
  PILIERS.forEach(([x, z], k) => it.push({z, x, el: boite(cam, ctx, [x - 75, x + 75], [AUV.y + AUV.ep, SOL], [z - 0.075, z + 0.075], [0.72, 0.72, 0.74], `pil${k}`, {sub: 3})}));
  // grand panneau de prix sur un mât, à l'entrée
  const E = ENSEIGNE;
  it.push({z: E.z, x: E.x, el: (
    <g key="ens">
      {boite(cam, ctx, [E.x - 40, E.x + 40], [-1500, SOL], [E.z - 0.04, E.z + 0.04], [0.5, 0.5, 0.52], 'mat')}
      {boite(cam, ctx, [E.x - 380, E.x + 380], [-2500, -1500], [E.z - 0.08, E.z + 0.08], [0.2, 0.2, 0.22], 'pan', {emis: {av: [210, 40, 44]}})}
      {(() => {
        const [cx, cy] = cam.proj(E.x, -2120, E.z - 0.09);
        const s = cam.scale(E.z, E.x, -2120);
        return cam.visible(E.z, E.x, -2100) && cam.z < E.z ? (
          <g fontFamily="'DejaVu Sans Mono', monospace" fontWeight="700" textAnchor="middle">
            <text x={cx} y={cy - 120 * s} fontSize={130 * s} fill="#fff">GAZOLE</text>
            <text x={cx} y={cy + 170 * s} fontSize={240 * s} fill="#ffd36a">1,89</text>
          </g>
        ) : null;
      })()}
      {halo(cam, [E.x, -2000, E.z - 0.1], 1400, '#ff5a50', 0.22, 'ensh2')}
    </g>
  )});
  it.push({z: 3.9, x: -1350, el: boite(cam, ctx, [-1450, -1250], [80, SOL], [3.8, 3.98], [0.25, 0.3, 0.28], 'poub')});
  it.push({z: BOUT.z0 - 0.3, x: -1200, el: (
    <g key="glace">
      {boite(cam, ctx, [-1500, -900], [40, SOL], [BOUT.z0 - 0.5, BOUT.z0 - 0.1], [0.85, 0.88, 0.92], 'gl', {sub: 2})}
      {(() => {
        const [cx, cy] = cam.proj(-1200, 220, BOUT.z0 - 0.51);
        const s = cam.scale(BOUT.z0 - 0.5, -1200, 220);
        return cam.z < BOUT.z0 - 0.5 && cam.visible(BOUT.z0 - 0.5, -1200, 220) ? <text x={cx} y={cy} textAnchor="middle" fontFamily="'DejaVu Sans', sans-serif" fontWeight="800" fontSize={90 * s} fill="#2a6ab0">GLACE</text> : null;
      })()}
    </g>
  )});
  return it;
};

// ----- le sol : asphalte mouillé (tuiles éclairées une à une), route, marquages, reflets miroir -----
const sol = (cam, ctx, f, emissifs) => {
  const el = [];
  const alb = [0.11, 0.11, 0.13];
  // la dalle de la station
  const X = [-3200, 3200];
  const Z = [-1.6, 10];
  const nx = 16;
  const nz = 18;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const xa = X[0] + ((X[1] - X[0]) * i) / nx;
      const xb = X[0] + ((X[1] - X[0]) * (i + 1)) / nx;
      const za = Z[0] + ((Z[1] - Z[0]) * j) / nz;
      const zb = Z[0] + ((Z[1] - Z[0]) * (j + 1)) / nz;
      el.push(face(cam, ctx, [[xa, SOL, za], [xb, SOL, za], [xb, SOL, zb], [xa, SOL, zb]], [0, -1, 0], alb, `s${i}_${j}`));
    }
  }
  // la route qui part dans la forêt
  for (let j = 0; j < 14; j++) {
    const za = -30 + j * 2.1;
    const zb = za + 2.1;
    el.push(face(cam, ctx, [[-650, SOL - 0.5, za], [650, SOL - 0.5, za], [650, SOL - 0.5, zb], [-650, SOL - 0.5, zb]], [0, -1, 0], [0.13, 0.13, 0.15], `r${j}`));
  }
  // marquages
  const trait = (a, b, w, k, op = 0.4) => {
    const p = cam.poly([[a[0] - w, SOL - 1, a[1]], [a[0] + w, SOL - 1, a[1]], [b[0] + w, SOL - 1, b[1]], [b[0] - w, SOL - 1, b[1]]]);
    return p ? <polygon key={k} points={p} fill="#d8d2b0" opacity={op} /> : null;
  };
  for (let j = 0; j < 12; j++) el.push(trait([0, -30 + j * 2.4], [0, -29.2 + j * 2.4], 14, `m${j}`, 0.3));
  [-1000, 1000].forEach((x, k) => el.push(trait([x, -0.3], [x, 3.4], 12, `p${k}`)));
  // reflets des lumières sur l'asphalte mouillé (miroir sous le sol, flouté, étiré)
  const refl = emissifs
    .map((e, k) => {
      const pts = e.pts.map(([x, y, z]) => [x, 2 * SOL - y, z]);
      const p = cam.poly(pts);
      return p ? <polygon key={`rf${k}`} points={p} fill={e.c} opacity={e.op ?? 0.5} /> : null;
    })
    .filter(Boolean);
  const hor = cam.fuite[1];
  return (
    <g key="sol">
      {el}
      <defs>
        <filter id="sn-refl" x="-20%" y="-50%" width="140%" height="200%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="10 34" />
        </filter>
        <clipPath id="sn-sol">
          <rect x="-400" y={hor} width="1880" height="3000" />
        </clipPath>
      </defs>
      <g clipPath="url(#sn-sol)" filter="url(#sn-refl)" opacity="0.55">{refl}</g>
    </g>
  );
};

// ----- la scène complète, dehors -----
// o : auvent [6], vitrine, boutique [4], ecran, compteur, phares, feuille, caissiere {el}, dedans [], extra (items),
//     lumieres (lumières en plus), portee (brume), nuit, sansVoiture, tuyau
export const stationNuit = (cam, f, o = {}) => {
  const L = {auvent: o.auvent || NEONS.map(() => 1), vitrine: o.vitrine ?? 1, ecran: o.ecran ?? 1, extra: o.lumieres || []};
  if (o.phares) L.extra = [...L.extra, {p: [(VOIT.x0 + VOIT.x1) / 2, 200, VOIT.z0 - 0.4], c: [1, 0.95, 0.8], i: 1.2, r: 1500}];
  const P = palette(o.nuit ?? 1);
  const F = {portee: o.portee ?? 14, brume: P.brume.map((v) => v * 0.75)};
  const ctx = {L, F};
  // la forêt : lumière dans la direction de la station (troncs en contre-jour autour de la clairière)
  const cx = 0;
  const cz = 2.5;
  const lumYaw = (Math.atan2(cx - cam.x, (cz - cam.z) * 1000) * 180) / Math.PI;
  const d = foret(cam, f, {nuit: o.nuit ?? 1, lumYaw, lumY: -1.0, rim: 1.1, portee: 9, rayons: 0, poussiere: 0.6, haloK: 0.3, brume: 0.45, degage: [[0, -3, 0, 12, 3300], [0, -40, 0, -2, 700]], feuillesDegage: false, ...(o.foret || {})});
  // objets lumineux (pour les reflets au sol)
  const em = [];
  NEONS.forEach((q, k) => L.auvent[k] > 0.5 && em.push({pts: [[q[0] - 330, q[1], q[2]], [q[0] + 330, q[1], q[2]], [q[0] + 330, q[1] + 40, q[2]], [q[0] - 330, q[1] + 40, q[2]]], c: '#e8f4ff', op: 0.9}));
  if (L.vitrine > 0.1) em.push({pts: [[BOUT.x0, BOUT.haut, BOUT.z0], [BOUT.x1, BOUT.haut, BOUT.z0], [BOUT.x1, BOUT.vitre, BOUT.z0], [BOUT.x0, BOUT.vitre, BOUT.z0]], c: '#e4ecd8', op: 0.55 * L.vitrine});
  em.push({pts: [[-650, BOUT.toit + 60, BOUT.z0], [650, BOUT.toit + 60, BOUT.z0], [650, BOUT.toit + 230, BOUT.z0], [-650, BOUT.toit + 230, BOUT.z0]], c: '#ff3a3a', op: 0.6});
  em.push({pts: [[ENSEIGNE.x - 380, -2500, ENSEIGNE.z], [ENSEIGNE.x + 380, -2500, ENSEIGNE.z], [ENSEIGNE.x + 380, -1500, ENSEIGNE.z], [ENSEIGNE.x - 380, -1500, ENSEIGNE.z]], c: '#ff4a40', op: 0.5});
  if (o.phares) em.push({pts: [[VOIT.x0 + 90, 175, VOIT.z0], [VOIT.x1 - 90, 175, VOIT.z0], [VOIT.x1 - 90, 215, VOIT.z0], [VOIT.x0 + 90, 215, VOIT.z0]], c: '#fff6d0', op: 0.9});
  const items = [...d.items];
  const dessous = cam.y > AUV.y + AUV.ep;
  const auv = auvent(cam, ctx, f);
  // l'auvent : vu d'en dessous, c'est un plafond (derrière tout) ; vu d'au-dessus, il cache ce qui est dessous
  if (!dessous) items.push({z: cam.z + 0.001, x: cam.x, y: cam.y, el: <g key="auv">{auv}</g>});
  else {
    // vu d'en dessous : derrière ce qui est sous l'auvent, devant ce qui est au-delà (boutique, arbres)
    const a = ((cam.yaw || 0) * Math.PI) / 180;
    const [dx, dz] = [Math.sin(a), Math.cos(a) / 1000];
    const ts = [];
    if (Math.abs(dx) > 1e-6) ts.push((AUV.x0 - cam.x) / dx, (AUV.x1 - cam.x) / dx);
    if (Math.abs(dz) > 1e-9) ts.push((AUV.z0 - cam.z) / dz, (AUV.z1 - cam.z) / dz);
    const t = Math.max(0, ...ts.filter((v) => v > 0 && Number.isFinite(v)).map((v) => v)) ;
    const sortie = Math.min(...ts.filter((v) => v > 0));
    const tt = Number.isFinite(sortie) ? (cam.x >= AUV.x0 && cam.x <= AUV.x1 && cam.z >= AUV.z0 && cam.z <= AUV.z1 ? sortie : t) : 0;
    items.push({z: cam.z + dz * tt, x: cam.x + dx * tt, y: AUV.y, el: <g key="auv">{auv}</g>});
  }
  items.push(...cones(cam, ctx));
  if (!o.sansBoutique) items.push(boutique(cam, ctx, f, o));
  items.push(...pompe(cam, ctx, f, o));
  if (!o.sansVoiture) items.push(voiture(cam, ctx, o));
  items.push(...details(cam, ctx, f));
  if (o.extra) items.push(...o.extra.filter(Boolean));
  const fond = (
    <g key="fondS">
      {d.fond}
      {sol(cam, ctx, f, em)}
    </g>
  );
  return {fond, brume: d.brume, items, L: d.L, P: d.P, Ls: L, ctx, poussiere: d.poussiere};
};

// lumière reçue par un personnage (billboard) à cet endroit : sert à teinter le bonhomme, la caissière, la créature
export const eclaire = (o, p, k = 1) => {
  const L = {auvent: o.auvent || NEONS.map(() => 1), vitrine: o.vitrine ?? 1, ecran: o.ecran ?? 1, extra: o.lumieres || []};
  const l = lumiere(p, null, L);
  return l.map((v) => borne(film(v * 1.25 * k) * 1.25, 0.06, 1.15));
};

// ===================== Dans la boutique =====================
// 4 dalles lumineuses au plafond (elles grésillent puis s'éteignent une à une), frigos lumineux au fond,
// la porte de l'arrière-boutique (le générateur) et sa veilleuse rouge, le comptoir, les écrans de surveillance.
export const PLAFONNIERS = [[-850, 6.5], [850, 6.5], [-850, 8.6], [850, 8.6]];
export const COMPTOIR = {x0: 450, x1: 1500, z0: 6.35, z1: 6.8, y: 80};
export const CAISSE_P = {x: 1000, z: 7.15};
export const PORTE_G = {x0: 720, x1: 1080};
const lumsDedans = (o) => {
  const on = o.boutique || [1, 1, 1, 1];
  const L = PLAFONNIERS.map(([x, z], k) => ({p: [x, BOUT.plaf + 30, z], c: [0.9, 1, 0.88], i: 0.85 * on[k], r: 1150}));
  L.push({p: [-700, -300, BOUT.z1 - 0.3], c: [0.75, 0.92, 1], i: 0.35 * (o.frigos ?? 1), r: 900});
  L.push({p: [900, -560, BOUT.z1 - 0.15], c: [1, 0.12, 0.1], i: 0.28 * (o.veilleuse ?? 1), r: 650});
  // un peu de la lumière de l'auvent entre par la vitrine
  L.push({p: [0, -400, BOUT.z0 - 1.2], c: [0.8, 0.9, 1.05], i: 0.25 * (o.dehorsLum ?? 1), r: 1600});
  return [...L, ...(o.lumieres || [])];
};
export const eclaireDedans = (o, p, k = 1) => {
  const l = lumiere(p, null, {auvent: [], vitrine: 0, ecran: 0, extra: lumsDedans(o)});
  return l.map((v) => borne(film(v * 1.25 * k) * 1.25, 0.05, 1.15));
};
export const dedans = (cam, f, o = {}) => {
  const B = BOUT;
  const ctx = {L: {auvent: [], vitrine: 0, ecran: 0, extra: lumsDedans(o)}, F: {portee: 30, brume: [14, 14, 20]}};
  const on = o.boutique || [1, 1, 1, 1];
  // dehors, vu par la vitrine (dessiné d'abord, l'intérieur le recouvre partout sauf la vitre)
  const ext = stationNuit(cam, f, {...o.dehors, sansBoutique: true});
  const tri = (l) => l.filter((it) => it && it.el && cam.profondeur(it.z, it.x ?? cam.x, it.y ?? cam.y) > 0.05).sort((a, b) => cam.profondeur(b.z, b.x ?? cam.x, b.y ?? cam.y) - cam.profondeur(a.z, a.x ?? cam.x, a.y ?? cam.y));
  const coque = [];
  const F = (pts, n, alb, k, sub = 4) => coque.push(face(cam, ctx, pts, n, alb, k, {sub}));
  // sol carrelé (damier)
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 8; j++) {
      const xa = B.x0 + ((B.x1 - B.x0) * i) / 10;
      const xb = B.x0 + ((B.x1 - B.x0) * (i + 1)) / 10;
      const za = B.z0 + ((B.z1 - B.z0) * j) / 8;
      const zb = B.z0 + ((B.z1 - B.z0) * (j + 1)) / 8;
      coque.push(face(cam, ctx, [[xa, SOL, za], [xb, SOL, za], [xb, SOL, zb], [xa, SOL, zb]], [0, -1, 0], (i + j) % 2 ? [0.5, 0.5, 0.48] : [0.3, 0.31, 0.31], `ds${i}_${j}`, {sub: 2}));
    }
  }
  F([[B.x0, B.plaf, B.z0], [B.x1, B.plaf, B.z0], [B.x1, B.plaf, B.z1], [B.x0, B.plaf, B.z1]], [0, 1, 0], [0.5, 0.5, 0.5], 'dpl', 6);
  F([[B.x0, B.plaf, B.z0], [B.x0, B.plaf, B.z1], [B.x0, SOL, B.z1], [B.x0, SOL, B.z0]], [1, 0, 0], [0.42, 0.46, 0.44], 'dmg', 6);
  F([[B.x1, B.plaf, B.z0], [B.x1, B.plaf, B.z1], [B.x1, SOL, B.z1], [B.x1, SOL, B.z0]], [-1, 0, 0], [0.42, 0.46, 0.44], 'dmd', 6);
  F([[B.x0, B.plaf, B.z1], [B.x1, B.plaf, B.z1], [B.x1, SOL, B.z1], [B.x0, SOL, B.z1]], [0, 0, -1], [0.42, 0.46, 0.44], 'dmf', 6);
  // façade vue de dedans : bandeau du haut, soubassement (la vitre entre les deux)
  F([[B.x0, B.plaf, B.z0], [B.x1, B.plaf, B.z0], [B.x1, B.haut, B.z0], [B.x0, B.haut, B.z0]], [0, 0, 1], [0.5, 0.52, 0.52], 'dfh', 4);
  F([[B.x0, B.vitre, B.z0], [B.x1, B.vitre, B.z0], [B.x1, SOL, B.z0], [B.x0, SOL, B.z0]], [0, 0, 1], [0.4, 0.42, 0.42], 'dfb', 4);
  // la vitre : reflet de la pièce (léger), montants
  const vp = cam.poly([[B.x0, B.haut, B.z0], [B.x1, B.haut, B.z0], [B.x1, B.vitre, B.z0], [B.x0, B.vitre, B.z0]]);
  const lumMoy = on.reduce((a, b) => a + b, 0) / 4;
  if (vp && cam.z > B.z0) {
    coque.push(
      <g key="dvit">
        <defs>
          <linearGradient id="dv-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#dfe8f0" stopOpacity={0.1 * lumMoy} />
            <stop offset="0.5" stopColor="#dfe8f0" stopOpacity={0.03 * lumMoy} />
            <stop offset="1" stopColor="#dfe8f0" stopOpacity={0.12 * lumMoy} />
          </linearGradient>
        </defs>
        <polygon points={vp} fill="url(#dv-g)" />
      </g>,
    );
    for (let x = B.x0; x <= B.x1 + 1; x += 425) {
      const p = cam.poly([[x - 16, B.haut, B.z0 + 0.004], [x + 16, B.haut, B.z0 + 0.004], [x + 16, B.vitre, B.z0 + 0.004], [x - 16, B.vitre, B.z0 + 0.004]]);
      if (p) coque.push(<polygon key={`dmt${x}`} points={p} fill="#141518" />);
    }
  }
  // les plafonniers
  PLAFONNIERS.forEach(([x, z], k) => {
    const p = cam.poly([[x - 420, B.plaf + 3, z - 0.22], [x + 420, B.plaf + 3, z - 0.22], [x + 420, B.plaf + 3, z + 0.22], [x - 420, B.plaf + 3, z + 0.22]]);
    if (p && cam.y > B.plaf) coque.push(<polygon key={`dpf${k}`} points={p} fill={on[k] > 0.5 ? '#fbfdff' : '#262830'} stroke="#3a3c44" strokeWidth="3" />);
    if (on[k] > 0.3) coque.push(halo(cam, [x, B.plaf + 40, z], 1100, '#f4f8ff', 0.3 * on[k], `dph${k}`));
  });
  const items = [];
  // frigos lumineux le long du mur du fond (gauche)
  for (let k = 0; k < 4; k++) {
    const xa = -1650 + k * 440;
    items.push({z: B.z1 - 0.2, x: xa + 210, el: (
      <g key={`fr${k}`}>
        {boite(cam, ctx, [xa, xa + 420], [-560, SOL], [B.z1 - 0.4, B.z1 - 0.02], [0.35, 0.37, 0.4], `frb${k}`, {sans: ['av']})}
        {face(cam, ctx, [[xa + 20, -540, B.z1 - 0.4], [xa + 400, -540, B.z1 - 0.4], [xa + 400, SOL - 30, B.z1 - 0.4], [xa + 20, SOL - 30, B.z1 - 0.4]], [0, 0, -1], [0, 0, 0], `frv${k}`, {emis: (o.frigos ?? 1) > 0.5 ? [150, 185, 205] : [20, 24, 28]})}
        {[-400, -250, -100, 50, 200].map((y, j) => {
          const p = cam.poly([[xa + 30, y, B.z1 - 0.41], [xa + 390, y, B.z1 - 0.41], [xa + 390, y + 90, B.z1 - 0.41], [xa + 30, y + 90, B.z1 - 0.41]]);
          return p ? <polygon key={j} points={p} fill={['#c0392b', '#2e86c1', '#f1c40f', '#27ae60', '#8e44ad'][(j + k) % 5]} opacity={(o.frigos ?? 1) > 0.5 ? 0.55 : 0.15} /> : null;
        })}
      </g>
    )});
  }
  // la porte de l'arrière-boutique (le générateur) et sa veilleuse rouge
  items.push({z: B.z1 - 0.02, x: 900, el: (
    <g key="pg">
      {face(cam, ctx, [[PORTE_G.x0, -420, B.z1 - 0.01], [PORTE_G.x1, -420, B.z1 - 0.01], [PORTE_G.x1, SOL, B.z1 - 0.01], [PORTE_G.x0, SOL, B.z1 - 0.01]], [0, 0, -1], [0.32, 0.34, 0.38], 'pgp', {sub: 3})}
      {(() => {
        const [cx, cy] = cam.proj(900, -300, B.z1 - 0.02);
        const sc = cam.scale(B.z1, 900, -300);
        return cam.z < B.z1 && cam.visible(B.z1, 900, -300) ? (
          <g>
            <rect x={cx - 120 * sc} y={cy - 26 * sc} width={240 * sc} height={52 * sc} fill="#e8e0c8" />
            <text x={cx} y={cy + 14 * sc} textAnchor="middle" fontFamily="'DejaVu Sans', sans-serif" fontWeight="800" fontSize={34 * sc} fill="#a01818">GÉNÉRATEUR</text>
            <circle cx={cam.proj(1040, 0, B.z1 - 0.02)[0]} cy={cam.proj(1040, 0, B.z1 - 0.02)[1]} r={16 * sc} fill="#9a9ca4" />
          </g>
        ) : null;
      })()}
      {boite(cam, ctx, [850, 950], [-560, -510], [B.z1 - 0.08, B.z1 - 0.01], [0, 0, 0], 'vei', {emis: {av: (o.veilleuse ?? 1) > 0.5 ? [255, 40, 30] : [60, 10, 10]}})}
      {halo(cam, [900, -535, B.z1 - 0.1], 700, '#ff2a20', 0.45 * (o.veilleuse ?? 1), 'veih')}
    </g>
  )});
  // rayonnages (gondoles) à gauche
  [7.1, 8.1].forEach((z, r) => {
    items.push({z, x: -800, el: (
      <g key={`go${r}`}>
        {boite(cam, ctx, [-1450, -250], [-180, SOL], [z - 0.2, z + 0.2], [0.5, 0.52, 0.55], `gob${r}`, {sub: 2})}
        {[-150, -40, 70, 180, 290].map((y, j) =>
          [-1, 1].map((sd) => {
            const zz = z + sd * 0.205;
            const n = [0, 0, sd];
            return face(cam, ctx, [[-1430, y, zz], [-270, y, zz], [-270, y + 75, zz], [-1430, y + 75, zz]], n, [[0.8, 0.25, 0.2], [0.25, 0.45, 0.8], [0.85, 0.7, 0.2], [0.3, 0.7, 0.35], [0.7, 0.3, 0.6]][(j + r + (sd > 0 ? 2 : 0)) % 5], `gp${r}${j}${sd}`, {sub: 3});
          }),
        )}
      </g>
    )});
  });
  // le comptoir, la caisse, l'écran de surveillance
  const C = COMPTOIR;
  items.push({z: (C.z0 + C.z1) / 2, x: (C.x0 + C.x1) / 2, el: (
    <g key="cpt">
      {boite(cam, ctx, [C.x0, C.x1], [C.y, SOL], [C.z0, C.z1], [0.42, 0.32, 0.24], 'cptb', {sub: 3})}
      {boite(cam, ctx, [C.x0 - 10, C.x1 + 10], [C.y - 20, C.y], [C.z0 - 0.02, C.z1 + 0.02], [0.25, 0.25, 0.27], 'cptt', {sub: 3})}
      {boite(cam, ctx, [C.x0 + 150, C.x0 + 260], [C.y - 90, C.y - 20], [C.z0 + 0.15, C.z0 + 0.28], [0.12, 0.12, 0.14], 'reg')}
    </g>
  )});
  // les écrans de surveillance, au mur derrière le comptoir
  items.push({z: B.z1 - 0.05, x: 1350, el: (
    <g key="cctv">
      {[0, 1].map((r) =>
        [0, 1].map((c) => {
          const x0 = 1180 + c * 230;
          const y0 = -640 + r * 170;
          return face(cam, ctx, [[x0, y0, B.z1 - 0.05], [x0 + 210, y0, B.z1 - 0.05], [x0 + 210, y0 + 150, B.z1 - 0.05], [x0, y0 + 150, B.z1 - 0.05]], [0, 0, -1], [0, 0, 0], `cc${r}${c}`, {emis: [70 + 20 * Math.sin(f / 7 + r + c), 78, 74]});
        }),
      )}
    </g>
  )});
  if (o.caissiere) items.push(o.caissiere);
  if (o.extra) items.push(...o.extra.filter(Boolean));
  const fond = (
    <g key="dfond">
      {ext.fond}
      {ext.brume}
      {tri(ext.items).map((it, k) => <g key={k}>{it.el}</g>)}
      {coque}
    </g>
  );
  return {fond, brume: null, items, ctx};
};
