import {AbsoluteFill, Easing, interpolate, random, Series, spring, staticFile, useCurrentFrame} from 'remotion';
import {boite, eclairePerso, face, halo, PLAF, RimDefs, SOL, trier} from './MaisonNuit';
import {montage} from './montage';
import {Finition, makeCam} from './moteur';
import {ChoixBoite} from './NeLuiOuvrePas';
import {BulleCommentaire} from './ParrainageKit';
import {Rond, RondMonde} from './Rond';
import PLANS from './hopital/plans.json';
import timeline from './hopital/timeline.json';

// « Et si l'apocalypse zombie commençait pendant que t'es à l'hôpital ? » — style des vidéos « What if » :
// persos à grosse tête ronde, zombies-silhouettes aux yeux qui brillent, couloir d'hôpital en perspective (3D éclairée),
// plan d'étage façon blueprint, compteur BPM, ombres derrière le rideau du bloc.
const {decoupe, repere, SCENES, DUREES} = montage(timeline, PLANS);
export const DUREE_HOPITAL = SCENES.reduce((t, [, d]) => t + d, 0);
const START = {};
SCENES.reduce((t, [nom, d]) => {
  START[nom] = t;
  return t + d;
}, 0);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const ease = (f, a, b, e = Easing.inOut(Easing.cubic)) => interpolate(f, [a, b], [0, 1], {...clamp, easing: e});
const lisse = (t, d) => Easing.inOut(Easing.sin)(Math.min(1, t / Math.max(1, d)));
const lerp = (a, b, u) => a + (b - a) * u;
const deg = (r) => (r * 180) / Math.PI;
const tremble = (f, k, c) => k * (random(`${c}${f}`) - 0.5);
const pop = (f, t0) => (f < t0 ? 0 : spring({frame: f - t0, fps: 30, config: {damping: 11, stiffness: 170}}));
const vise = (p, c) => {
  const dx = c[0] - p[0];
  const dy = c[1] - p[1];
  const dz = (c[2] - p[2]) * 1000;
  return {x: p[0], y: p[1], z: p[2], yaw: deg(Math.atan2(dx, dz)), pitch: deg(Math.atan2(dy, Math.hypot(dx, dz)))};
};
const POLICE = "'AntonB', 'DejaVu Sans', sans-serif";

// ---------- texte posé sur un mur (plaque, panneau) : suit la perspective ----------
const Plaque = ({cam, a: a0, b: b0, h = 60, txt, fond = '#1e3a7a', coul = '#ffffff', k = 0.62}) => {
  let a = a0;
  let b = b0;
  if (cam.proj(...a)[0] > cam.proj(...b)[0]) [a, b] = [b, a];
  if (!cam.visible(a[2], a[0], a[1]) || !cam.visible(b[2], b[0], b[1])) return null;
  const [ax, ay] = cam.proj(...a);
  const [bx, by] = cam.proj(...b);
  const ha = h * cam.scale(a[2], a[0], a[1]);
  const hb = h * cam.scale(b[2], b[0], b[1]);
  const L = Math.hypot(bx - ax, by - ay);
  const ang = deg(Math.atan2(by - ay, bx - ax));
  const hm = (ha + hb) / 2;
  return (
    <g transform={`translate(${ax} ${ay}) rotate(${ang})`}>
      <path d={`M0,${-ha / 2} L${L},${-hb / 2} L${L},${hb / 2} L0,${ha / 2} Z`} fill={fond} />
      <text x={L / 2} y={hm * 0.3} textAnchor="middle" fontFamily={POLICE} fontSize={hm * k} fill={coul} transform={`scale(1 ${1})`} textLength={L * 0.86} lengthAdjust="spacingAndGlyphs">{txt}</text>
    </g>
  );
};

// ===================== le couloir de l'hôpital (3D éclairée) =====================
export const CO = {x0: -380, x1: 380, z0: 0, z1: 9.2};
const PANNEAUX = [0.8, 2.2, 3.6, 5.0, 6.4, 7.8];
const PORTES = [[-1, 2.0, '412'], [1, 1.2, '413'], [-1, 3.4, '414'], [1, 3.8, '415'], [-1, 5.6, '416'], [1, 6.2, '417'], [-1, 7.6, '418']];
const couloir = (cam, f, fg, o = {}) => {
  const rouge = o.rouge ?? 0;
  const pulse = rouge > 0 ? 0.55 + 0.45 * Math.abs(Math.sin(fg / 6)) : 1;
  const panC = PANNEAUX.map((z, k) => (o.gresille && random(`gr${k}${Math.floor(fg / 3)}`) < 0.3 ? 0.15 : 1));
  const lums = PANNEAUX.map((z, k) => ({p: [0, PLAF + 40, z], c: rouge > 0.5 ? [1, 0.18, 0.14] : [0.86, 0.92, 1.05], i: (rouge > 0.5 ? 0.75 * pulse : 0.6) * panC[k], r: 900}));
  if (o.porteOuverte) lums.push({p: [-500, -100, 2.0], c: [0.3, 0.9, 0.6], i: 0.25, r: 600});
  const ctx = {lums, amb: rouge > 0.5 ? [0.06, 0.01, 0.015] : [0.03, 0.035, 0.06], F: {portee: 7, brume: rouge > 0.5 ? [40, 6, 8] : [22, 28, 46]}};
  const out = [];
  const mur = [0.58, 0.66, 0.9];
  // sol (dalles brillantes), plafond, murs (bas plus sombre), main courante
  for (let j = 0; j < 12; j++) {
    const za = CO.z0 + j * 0.8;
    out.push(face(cam, ctx, [[CO.x0, SOL, za], [CO.x1, SOL, za], [CO.x1, SOL, za + 0.8], [CO.x0, SOL, za + 0.8]], [0, -1, 0], [0.55, 0.57, 0.62], `cs${j}`, {sub: 3}));
    out.push(face(cam, ctx, [[CO.x0, PLAF, za], [CO.x1, PLAF, za], [CO.x1, PLAF, za + 0.8], [CO.x0, PLAF, za + 0.8]], [0, 1, 0], [0.78, 0.8, 0.86], `cp${j}`, {sub: 2}));
    [[CO.x0, 1], [CO.x1, -1]].forEach(([x, nx], q) => {
      out.push(face(cam, ctx, [[x, PLAF, za], [x, PLAF, za + 0.8], [x, 40, za + 0.8], [x, 40, za]], [nx, 0, 0], mur, `cm${j}${q}`, {sub: 3}));
      out.push(face(cam, ctx, [[x, 40, za], [x, 40, za + 0.8], [x, SOL, za + 0.8], [x, SOL, za]], [nx, 0, 0], [0.4, 0.46, 0.66], `cb${j}${q}`, {sub: 2}));
    });
  }
  // reflets des panneaux sur le sol
  PANNEAUX.forEach((z, k) => {
    const p = cam.poly([[-160, SOL - 1, z - 0.18], [160, SOL - 1, z - 0.18], [160, SOL - 1, z + 0.18], [-160, SOL - 1, z + 0.18]]);
    if (p) out.push(<polygon key={`rf${k}`} points={p} fill={rouge > 0.5 ? '#ff5a4a' : '#e8f0ff'} opacity={0.12 * panC[k]} filter="url(#hp-flou)" />);
  });
  [[CO.x0 + 4, 1], [CO.x1 - 4, -1]].forEach(([x, s], q) => out.push(boite(cam, ctx, s > 0 ? [x, x + 26] : [x - 26, x], [10, 34], [CO.z0, CO.z1], [0.7, 0.48, 0.28], `mc${q}`)));
  // fond du couloir : ascenseur à gauche, escalier de secours à droite
  out.push(face(cam, ctx, [[CO.x0, PLAF, CO.z1], [CO.x1, PLAF, CO.z1], [CO.x1, SOL, CO.z1], [CO.x0, SOL, CO.z1]], [0, 0, -1], mur, 'cf', {sub: 4}));
  out.push(boite(cam, ctx, [-330, -40], [-300, SOL], [CO.z1 - 0.02, CO.z1], [0.72, 0.74, 0.8], 'asc', {sub: 2}));
  out.push(face(cam, ctx, [[-186, -300, CO.z1 - 0.025], [-184, -300, CO.z1 - 0.025], [-184, SOL, CO.z1 - 0.025], [-186, SOL, CO.z1 - 0.025]], [0, 0, -1], [0.2, 0.2, 0.25], 'asc2'));
  out.push(boite(cam, ctx, [-230, -140], [-380, -320], [CO.z1 - 0.03, CO.z1 - 0.02], [0, 0, 0], 'ascd', {emis: {av: [255, 140, 40]}}));
  out.push(boite(cam, ctx, [60, 320], [-300, SOL], [CO.z1 - 0.02, CO.z1], [0.55, 0.62, 0.66], 'esc', {sub: 2}));
  out.push(boite(cam, ctx, [120, 260], [-400, -330], [CO.z1 - 0.03, CO.z1 - 0.02], [0, 0, 0], 'sortie', {emis: {av: [40, 220, 110]}}));
  out.push(halo(cam, [190, -365, CO.z1 - 0.1], 260, '#3aff8a', 0.4, 'sorh'));
  // portes des chambres (bois), fenêtre étroite, poignée, numéro
  PORTES.forEach(([s, z, num], k) => {
    const x = s < 0 ? CO.x0 + 3 : CO.x1 - 3;
    const n = [-s, 0, 0];
    const ouvert = o.porteOuverte && num === '412';
    if (ouvert) {
      out.push(face(cam, ctx, [[x, -260, z - 0.25], [x, -260, z + 0.25], [x, SOL, z + 0.25], [x, SOL, z - 0.25]], n, [0, 0, 0], `po${k}`, {emis: [14, 22, 30], double: true}));
    } else {
      out.push(face(cam, ctx, [[x, -260, z - 0.25], [x, -260, z + 0.25], [x, SOL, z + 0.25], [x, SOL, z - 0.25]], n, [0.88, 0.56, 0.3], `po${k}`, {sub: 2}));
      out.push(face(cam, ctx, [[x - s, -200, z - 0.1], [x - s, -200, z - 0.05], [x - s, 60, z - 0.05], [x - s, 60, z - 0.1]], n, [0, 0, 0], `pw${k}`, {emis: [16, 20, 34]}));
      out.push(boite(cam, ctx, s < 0 ? [x, x + 16] : [x - 16, x], [80, 96], [z + 0.12, z + 0.2], [0.85, 0.85, 0.9], `ph${k}`));
    }
    out.push(boite(cam, ctx, s < 0 ? [x, x + 8] : [x - 8, x], [-280, SOL], [z - 0.28, z - 0.25], [0.95, 0.95, 0.95], `pc${k}a`));
    out.push(boite(cam, ctx, s < 0 ? [x, x + 8] : [x - 8, x], [-280, SOL], [z + 0.25, z + 0.28], [0.95, 0.95, 0.95], `pc${k}b`));
    out.push(<Plaque key={`pn${k}`} cam={cam} a={[x - s * 6, -330, z - 0.12 * s]} b={[x - s * 6, -330, z + 0.12 * s]} h={70} txt={num} />);
  });
  // écran de surveillance au mur (courbes vertes)
  const ec = cam.poly([[CO.x1 - 5, -260, 4.6], [CO.x1 - 5, -260, 4.95], [CO.x1 - 5, -140, 4.95], [CO.x1 - 5, -140, 4.6]]);
  if (ec) out.push(<polygon key="ecr" points={ec} fill="#06120c" stroke="#2a3a4a" strokeWidth="4" />);
  // panneaux lumineux du plafond
  PANNEAUX.forEach((z, k) => {
    out.push(face(cam, ctx, [[-170, PLAF + 2, z - 0.22], [170, PLAF + 2, z - 0.22], [170, PLAF + 2, z + 0.22], [-170, PLAF + 2, z + 0.22]], [0, 1, 0], [0, 0, 0], `pl${k}`, {emis: rouge > 0.5 ? [255, Math.round(80 * pulse), 70] : panC[k] > 0.5 ? [240, 246, 255] : [70, 74, 84], double: true}));
    out.push(halo(cam, [0, PLAF + 30, z], 700, rouge > 0.5 ? '#ff4a3a' : '#eef4ff', 0.22 * panC[k] * (rouge > 0.5 ? pulse : 1), `plh${k}`));
  });
  // panneau suspendu « 4 OUEST · CHIRURGIE »
  out.push(<Plaque key="sign" cam={cam} a={[-170, PLAF + 150, 6.9]} b={[170, PLAF + 150, 6.9]} h={64} txt="4 OUEST · CHIRURGIE" k={0.55} />);
  return {fond: <g>{out}</g>, items: [...(o.extra || [])], ctx};
};

// ===================== la chambre 412 =====================
const CH = {x0: -620, x1: 620, z0: 0, z1: 2.8};
const LIT = {x0: -280, x1: 280, z0: 1.0, z1: 2.55};
const chambre = (cam, f, fg, o = {}) => {
  const rouge = o.rouge ?? 0;
  const pulse = rouge > 0 ? 0.6 + 0.4 * Math.abs(Math.sin(fg / 6)) : 1;
  const lums = [
    {p: [0, PLAF + 40, 1.4], c: rouge > 0.5 ? [1, 0.2, 0.15] : [0.8, 0.88, 1.05], i: rouge > 0.5 ? 0.8 * pulse : 0.35 * (o.plafonnier ?? 1), r: 1100},
    {p: [450, -260, 2.6], c: [0.3, 1, 0.55], i: 0.3, r: 600},
    {p: [700, -200, 1.4], c: [0.4, 0.5, 0.9], i: 0.35, r: 900},
  ];
  const ctx = {lums, amb: rouge > 0.5 ? [0.07, 0.015, 0.02] : [0.03, 0.035, 0.06], F: {portee: 6, brume: rouge > 0.5 ? [50, 8, 10] : [18, 24, 40]}};
  const out = [];
  const mur = [0.62, 0.7, 0.9];
  out.push(face(cam, ctx, [[CH.x0, SOL, CH.z0], [CH.x1, SOL, CH.z0], [CH.x1, SOL, CH.z1], [CH.x0, SOL, CH.z1]], [0, -1, 0], [0.6, 0.62, 0.66], 'chs', {sub: 6}));
  out.push(face(cam, ctx, [[CH.x0, PLAF, CH.z0], [CH.x1, PLAF, CH.z0], [CH.x1, PLAF, CH.z1], [CH.x0, PLAF, CH.z1]], [0, 1, 0], [0.8, 0.82, 0.88], 'chp', {sub: 6}));
  out.push(face(cam, ctx, [[CH.x0, PLAF, CH.z1], [CH.x1, PLAF, CH.z1], [CH.x1, SOL, CH.z1], [CH.x0, SOL, CH.z1]], [0, 0, -1], mur, 'chf', {sub: 8}));
  out.push(face(cam, ctx, [[CH.x0, PLAF, CH.z0], [CH.x0, PLAF, CH.z1], [CH.x0, SOL, CH.z1], [CH.x0, SOL, CH.z0]], [1, 0, 0], mur, 'chg', {sub: 8}));
  out.push(face(cam, ctx, [[CH.x1, PLAF, CH.z0], [CH.x1, PLAF, CH.z1], [CH.x1, SOL, CH.z1], [CH.x1, SOL, CH.z0]], [-1, 0, 0], mur, 'chd', {sub: 8}));
  out.push(face(cam, ctx, [[CH.x0, PLAF, CH.z0], [CH.x1, PLAF, CH.z0], [CH.x1, SOL, CH.z0], [CH.x0, SOL, CH.z0]], [0, 0, 1], mur, 'cha', {sub: 8}));
  // fenêtre (nuit) avec stores, rampe de gaz médicaux au-dessus du lit, moniteur
  out.push(face(cam, ctx, [[CH.x1 - 3, -380, 0.9], [CH.x1 - 3, -380, 2.0], [CH.x1 - 3, 60, 2.0], [CH.x1 - 3, 60, 0.9]], [-1, 0, 0], [0, 0, 0], 'chw', {emis: [12, 16, 36]}));
  for (let k = 0; k < 9; k++) out.push(face(cam, ctx, [[CH.x1 - 5, -380 + k * 50, 0.9], [CH.x1 - 5, -380 + k * 50, 2.0], [CH.x1 - 5, -366 + k * 50, 2.0], [CH.x1 - 5, -366 + k * 50, 0.9]], [-1, 0, 0], [0.8, 0.82, 0.88], `sto${k}`));
  out.push(boite(cam, ctx, [-500, 500], [-300, -230], [CH.z1 - 0.06, CH.z1], [0.85, 0.86, 0.9], 'rampe', {sub: 2}));
  out.push(boite(cam, ctx, [330, 560], [-420, -260], [CH.z1 - 0.05, CH.z1], [0.12, 0.13, 0.15], 'mon'));
  const mp = cam.poly([[345, -405, CH.z1 - 0.055], [545, -405, CH.z1 - 0.055], [545, -275, CH.z1 - 0.055], [345, -275, CH.z1 - 0.055]]);
  if (mp) {
    const [mx, my] = cam.proj(345, -340, CH.z1 - 0.06);
    const [nx] = cam.proj(545, -340, CH.z1 - 0.06);
    const w = nx - mx;
    const sc = cam.scale(CH.z1, 445, -340);
    const ecg = [...Array(30)].map((_, j) => {
      const u = j / 29;
      const ph = (u * 3 + fg / (o.bpm ? 3600 / o.bpm / 0.3 : 30)) % 1;
      const pic = ph > 0.45 && ph < 0.52 ? -40 * (ph < 0.485 ? 1 : -0.5) : 0;
      return `${mx + w * u},${my + pic * sc}`;
    }).join(' ');
    out.push(<g key="ecg"><polygon points={mp} fill="#041008" /><polyline points={ecg} fill="none" stroke="#3aff7a" strokeWidth={3 * sc} /></g>);
  }
  // porte de la salle de bain (mur de gauche) et porte du couloir (mur du fond)
  out.push(face(cam, ctx, [[CH.x0 + 3, -260, 1.6], [CH.x0 + 3, -260, 2.2], [CH.x0 + 3, SOL, 2.2], [CH.x0 + 3, SOL, 1.6]], [1, 0, 0], [0.9, 0.9, 0.92], 'sdb', {sub: 2}));
  out.push(<Plaque key="sdbp" cam={cam} a={[CH.x0 + 6, -310, 1.75]} b={[CH.x0 + 6, -310, 2.05]} h={50} txt="SDB" fond="#e8eef8" coul="#1e3a7a" />);
  if (!o.sansPorte) {
    const ouv = o.porte ?? 0;
    out.push(face(cam, ctx, [[-560, -260, CH.z0 + 0.003], [-200, -260, CH.z0 + 0.003], [-200, SOL, CH.z0 + 0.003], [-560, SOL, CH.z0 + 0.003]], [0, 0, 1], [0, 0, 0], 'pcl', {emis: [30, 34, 50]}));
    out.push(face(cam, ctx, [[-560, -260, CH.z0 + 0.006], [lerp(-200, -540, ouv), -260, CH.z0 + 0.006 + 0.3 * ouv], [lerp(-200, -540, ouv), SOL, CH.z0 + 0.006 + 0.3 * ouv], [-560, SOL, CH.z0 + 0.006]], [0, 0, 1], [0.88, 0.56, 0.3], 'pct', {double: true, sub: 2}));
  }
  const items = [];
  // le lit
  items.push({z: (LIT.z0 + LIT.z1) / 2, x: 0, el: (
    <g key="lit">
      {boite(cam, ctx, [LIT.x0, LIT.x1], [150, 330], [LIT.z0, LIT.z1], [0.85, 0.87, 0.92], 'lb', {sub: 2})}
      {boite(cam, ctx, [LIT.x0 + 10, LIT.x1 - 10], [100, 150], [LIT.z0 + 0.03, LIT.z1 - 0.03], [0.95, 0.97, 1], 'lm', {sub: 2})}
      {boite(cam, ctx, [LIT.x0 - 20, LIT.x1 + 20], [-60, 340], [LIT.z1 - 0.06, LIT.z1], [0.9, 0.9, 0.94], 'lt', {sub: 2})}
      {boite(cam, ctx, [LIT.x0 - 30, LIT.x0 - 10], [40, 160], [LIT.z0 + 0.2, LIT.z1 - 0.3], [0.7, 0.72, 0.78], 'lr1')}
      {boite(cam, ctx, [LIT.x1 + 10, LIT.x1 + 30], [40, 160], [LIT.z0 + 0.2, LIT.z1 - 0.3], [0.7, 0.72, 0.78], 'lr2')}
      {[[LIT.x0 + 20, LIT.z0 + 0.05], [LIT.x1 - 20, LIT.z0 + 0.05], [LIT.x0 + 20, LIT.z1 - 0.05], [LIT.x1 - 20, LIT.z1 - 0.05]].map(([x, z], k) => boite(cam, ctx, [x - 14, x + 14], [330, SOL], [z - 0.014, z + 0.014], [0.3, 0.3, 0.34], `lp${k}`))}
    </g>
  )});
  if (o.dansLit) items.push({z: LIT.z0 - 0.02, x: 0, el: o.dansLit});
  if (o.couverture !== false) items.push({z: LIT.z0 - 0.03, x: 0, el: boite(cam, ctx, [LIT.x0 + 4, LIT.x1 - 4], [o.couvY ?? 60, 170], [LIT.z0 - 0.02, LIT.z1 - 0.5], [0.66, 0.8, 0.96], 'cvt', {sub: 3})});
  // pied à perfusion
  items.push({z: 1.4, x: 420, el: (
    <g key="iv">
      {boite(cam, ctx, [410, 422], [-420, SOL], [1.4, 1.41], [0.8, 0.8, 0.85], 'ivp')}
      {boite(cam, ctx, [380, 450], [-420, -330], [1.39, 1.42], [0.75, 0.88, 1], 'ivs')}
    </g>
  )});
  (o.extra || []).forEach((it) => items.push(it));
  return {fond: <g>{out}</g>, items, ctx};
};

// ---------- habillage ----------
const BPM = ({f, v, op = 1}) => {
  const bat = Math.max(0, Math.sin((f / 30) * (v / 60) * Math.PI)) ** 6;
  return (
    <g transform="translate(540 240)" opacity={op}>
      <rect x="-200" y="-56" width="400" height="112" rx="56" fill="#160c12" opacity="0.92" stroke="#ff4a3a" strokeWidth="5" />
      <path transform={`translate(-140 0) scale(${1 + 0.18 * bat})`} d="M0,26 C-46,-6 -40,-40 -16,-40 C-6,-40 0,-32 0,-24 C0,-32 6,-40 16,-40 C40,-40 46,-6 0,26 Z" fill="#ff4a3a" />
      <text x="-90" y="22" fontFamily={POLICE} fontSize="64" fill="#ffffff">{Math.round(v)}</text>
      <text x="20" y="22" fontFamily="'DejaVu Sans', sans-serif" fontWeight="800" fontSize="20" fill="#ff8a7a">BPM</text>
      <polyline points={[...Array(24)].map((_, j) => {
        const u = j / 23;
        const ph = (u * 2 - f / 12) % 1;
        const p = ((ph % 1) + 1) % 1;
        return `${70 + 110 * u},${p > 0.4 && p < 0.47 ? -26 : p > 0.47 && p < 0.52 ? 18 : 0}`;
      }).join(' ')} fill="none" stroke="#ff4a3a" strokeWidth="4" strokeLinejoin="round" />
    </g>
  );
};
const DefsHop = () => (
  <defs>
    <filter id="hp-flou" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="10" />
    </filter>
    <filter id="hp-ombre" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="9" />
    </filter>
  </defs>
);
const Vue = ({fg, cam, d, items = [], zoom = 1, roll = 0, rouge = 0, dessus = null, flou = null, noir = 0}) => {
  const its = trier(cam, [...d.items, ...items]);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <RimDefs couleurs={{bleu: '#7aa0ff', rouge: '#ff5a4a', blanc: '#e8f0ff'}} />
        <DefsHop />
        {flou && (
          <defs>
            <filter id="hp-bouge" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation={`${flou[0]} ${flou[1]}`} />
            </filter>
          </defs>
        )}
        <g filter={flou ? 'url(#hp-bouge)' : undefined} transform={`rotate(${roll} 540 960) translate(540 960) scale(${zoom * (1 + Math.abs(roll) * 0.012)}) translate(-540 -960)`}>
          {d.fond}
          {its.map((it, k) => <g key={k}>{it.el}</g>)}
        </g>
        {rouge > 0 && <rect width="1080" height="1920" fill="#ff1a1a" opacity={0.18 * rouge} style={{mixBlendMode: 'multiply'}} />}
        <rect width="1080" height="1920" fill="#000" opacity={noir} />
        {dessus}
        <Finition f={fg} id="hpf" grain={0.035} vignette={0.6} />
      </svg>
    </AbsoluteFill>
  );
};
const Ecran2D = ({fg, children, dessus = null, vignette = 0.6}) => (
  <AbsoluteFill style={{background: '#000'}}>
    <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
      <DefsHop />
      {children}
      {dessus}
      <Finition f={fg} id="hp2" grain={0.035} vignette={vignette} />
    </svg>
  </AbsoluteFill>
);
const scene = (nom, rendu) => {
  const C = () => {
    const f = useCurrentFrame();
    const {i, t, d} = decoupe(nom, f);
    return rendu({f, fg: START[nom] + f, i, t, d, k: lisse(t, d), R: (mot, def) => repere(nom, mot, def)});
  };
  C.displayName = nom;
  return C;
};
// perso dans une scène, teinté par la lumière du lieu
const P = (cam, d, x, z, props, id, {y = SOL, echelle = 1, rim = 'bleu'} = {}) => ({z, x, el: <RondMonde cam={cam} x={x} z={z} y={y} echelle={echelle} teinte={eclairePerso(d.ctx, [x, y - 400, z], 1.15)} rim={rim} id={id} {...props} />});
const ZOMBIE = (ph, k = 0) => ({zombie: true, brasG: [70 + 8 * Math.sin(ph + k), -10], brasD: [70 + 8 * Math.sin(ph + k + 1), -10], jambes: Math.sin(ph * 0.8 + k)});

// ===================== 1. Le bloc : derrière le rideau, le patient se réveille et mord le chirurgien =====================
const Silhouette = ({x, y, s, rot = 0, children}) => <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} filter="url(#hp-ombre)" opacity="0.92">{children}</g>;
const Sang = ({f, t0, n = 26, x = 540, y = 820, seed = 's'}) => {
  const u = f - t0;
  if (u < 0) return null;
  return (
    <g>
      {[...Array(n)].map((_, k) => {
        const a = random(`${seed}a${k}`) * 6.28;
        const r = Math.min(1, u / 5) * (60 + 360 * random(`${seed}r${k}`));
        const cx = x + Math.cos(a) * r;
        const cy = y + Math.sin(a) * r * 0.8;
        const s = 6 + 26 * random(`${seed}s${k}`) * (1 - r / 500);
        const coule = Math.max(0, u - 8) * (2 + 4 * random(`${seed}c${k}`));
        return (
          <g key={k}>
            <circle cx={cx} cy={cy} r={s} fill="#9a0c14" />
            {s > 14 && <rect x={cx - s * 0.3} y={cy} width={s * 0.6} height={coule} rx={s * 0.3} fill="#8a0a12" />}
          </g>
        );
      })}
    </g>
  );
};
const Bloc = scene('bloc', ({f, fg, i, t, k, R}) => {
  const reveil = ease(f, R('réveille', 123) - 14, R('réveille', 123) + 10);
  const mord = R('mord', 151);
  const saute = ease(f, mord - 6, mord + 2, Easing.in(Easing.quad));
  const lutte = f > mord ? tremble(fg, 30, 'lu') : 0;
  const flick = f > mord + 10 && random(`bf${Math.floor(f / 2)}`) < 0.35 ? 0.35 : 1;
  const lumiere = i === 2 ? flick : 1;
  const zoom = i === 0 ? lerp(1.0, 1.08, k) : i === 1 ? lerp(1.12, 1.22, k) : 1.3 + 0.06 * saute + 0.04 * k;
  const bip = Math.floor((f / 30) * 1.2) % 1 === 0 && (f % 25) < 3 && f < mord + 8;
  return (
    <Ecran2D fg={fg} vignette={0.7}>
      <defs>
        <radialGradient id="bl-lampe" cx="50%" cy="20%" r="70%">
          <stop offset="0" stopColor="#fffbe8" stopOpacity={lumiere} />
          <stop offset="0.5" stopColor="#c8e8e0" stopOpacity={0.8 * lumiere} />
          <stop offset="1" stopColor="#3a6a6a" stopOpacity={lumiere} />
        </radialGradient>
        <linearGradient id="bl-pli" x1="0" y1="0" x2="1" y2="0">
          {[...Array(13)].map((_, j) => <stop key={j} offset={j / 12} stopColor={j % 2 ? '#ffffff' : '#000000'} stopOpacity={j % 2 ? 0.1 : 0.12} />)}
        </linearGradient>
      </defs>
      <g transform={`translate(540 900) scale(${zoom}) translate(${-540 + lutte * 0.2} -900)`}>
        <rect width="1080" height="1920" fill="#0e2426" />
        {/* derrière le rideau : la lumière du bloc + les ombres */}
        <rect x="-200" y="200" width="1480" height="1400" fill="url(#bl-lampe)" />
        <ellipse cx="540" cy="360" rx="260" ry="80" fill="#ffffff" opacity={0.6 * lumiere} filter="url(#hp-flou)" />
        {/* la table et le patient couché → assis → qui bondit */}
        <Silhouette x={540} y={1180} s={1}>
          <rect x="-330" y="-30" width="660" height="40" rx="10" fill="#0a1a1c" />
          <rect x="-20" y="10" width="40" height="300" fill="#0a1a1c" />
        </Silhouette>
        <Silhouette x={lerp(380, 600, saute)} y={lerp(1150, 1100, saute)} s={lerp(0.62, 0.7, saute)} rot={lerp(-90, -10, reveil) + 40 * saute + lutte * 0.3}>
          <Rond zombie sansYeux={reveil < 0.6} brasG={[lerp(0, 120, reveil), -40 * saute]} brasD={[lerp(0, 130, reveil), -40 * saute]} />
        </Silhouette>
        {/* le chirurgien (charlotte), qui recule… puis se fait attraper */}
        <Silhouette x={lerp(820, 790, reveil) + lutte} y={1460} s={0.78} rot={f > mord ? -12 + lutte * 0.4 : 0}>
          <Rond zombie sansYeux tenue="chirurgien" brasG={[lerp(30, 80, reveil), -60]} brasD={[lerp(20, 140, saute), -40]} />
          <path d="M-182,-840 Q-180,-1000 0,-1000 Q180,-1000 182,-840 Z" fill="#0a1a1c" />
        </Silhouette>
        {/* le rideau (devant), ses plis, et le sang qui gicle dessus */}
        <rect x="-200" y="120" width="1480" height="1600" fill="#9ad0c8" opacity="0.22" />
        <rect x="-200" y="120" width="1480" height="1600" fill="url(#bl-pli)" />
        <rect x="-200" y="100" width="1480" height="26" fill="#c8ccd4" />
        {[...Array(14)].map((_, j) => <circle key={j} cx={-160 + j * 110} cy="113" r="12" fill="#e8eaf0" />)}
        <Sang f={f} t0={mord + 1} x={700} y={820} seed="s1" />
        <Sang f={f} t0={mord + 9} x={560} y={980} n={16} seed="s2" />
        {/* la main ensanglantée qui claque contre le rideau */}
        {f > mord + 24 && (
          <g transform={`translate(380 1120) rotate(-15) scale(${1 + 0.1 * Math.max(0, 1 - (f - mord - 24) / 4)})`} opacity="0.85">
            <circle r="56" fill="#8a0a12" />
            {[-40, -14, 12, 38].map((x, j) => <rect key={j} x={x - 13} y={-140 + Math.abs(j - 1.5) * 12} width="26" height="100" rx="13" fill="#8a0a12" />)}
            <rect x="40" y="-30" width="26" height="80" rx="13" fill="#8a0a12" transform="rotate(-40 53 10)" />
            <rect x="-10" y="50" width="16" height={Math.min(160, (f - mord - 24) * 4)} rx="8" fill="#8a0a12" />
          </g>
        )}
        {/* moniteur cardiaque (devant le rideau, à gauche) */}
        <g transform="translate(160 600)">
          <rect x="-110" y="-80" width="220" height="160" rx="14" fill="#101418" stroke="#3a4a5a" strokeWidth="6" />
          <polyline points={[...Array(20)].map((_, j) => {
            const x = -96 + j * 10;
            const plat = f > mord + 30;
            const ph = (j / 19 + f / 25) % 1;
            return `${x},${plat ? 0 : ph > 0.45 && ph < 0.55 ? -40 : 0}`;
          }).join(' ')} fill="none" stroke={f > mord + 30 ? '#ff3a3a' : '#3aff7a'} strokeWidth="5" />
        </g>
      </g>
      <rect width="1080" height="1920" fill="#ff0000" opacity={f > mord && f < mord + 4 ? 0.25 : 0} />
      {bip && <rect width="0" height="0" />}
    </Ecran2D>
  );
});

// ===================== 2. Deux étages plus haut, chambre 412. Tu dors. =====================
const Chambre = scene('chambre', ({f, fg, i, t, k}) => {
  if (i === 0) {
    // on glisse le long du couloir calme jusqu'à la plaque 412
    const cam = makeCam(vise([lerp(150, -40, k), -280, lerp(0.2, 1.2, k)], [CO.x0, -300, 2.0]));
    const d = couloir(cam, f, fg, {});
    return <Vue fg={fg} cam={cam} d={d} zoom={1.02 + 0.06 * k} />;
  }
  // tu dors dans ton lit (vu de côté, de haut)
  const cam = makeCam(vise([300 - 40 * k, -420, 0.9 + 0.1 * k], [-60, 100, 1.85]));
  const d = chambre(cam, f, fg, {plafonnier: 0.6, couvY: 90});
  const dort = (
    <g>
      {(() => {
        const [px, py] = cam.proj(-120, 90, 1.85);
        const s = cam.scale(1.85, 0, 90) * 0.55;
        return (
          <g transform={`translate(${px} ${py}) rotate(-90) scale(${s})`}>
            <Rond yeux={0.08} bouche="o" souffle={Math.sin(fg / 14) * 10} brasG={[10, 0]} brasD={[10, 0]} />
          </g>
        );
      })()}
    </g>
  );
  return (
    <Vue fg={fg} cam={cam} d={{...d, items: [...d.items, {z: 1.9, x: 0, el: dort}]}} zoom={1.0 + 0.05 * k}
      dessus={[0, 1, 2].map((j) => <text key={j} x={620 + j * 40} y={720 - j * 50 - ((f / 2 + j * 10) % 30)} fontFamily={POLICE} fontSize={40 + j * 14} fill="#ffffff" opacity="0.6">Z</text>)} />
  );
});

// ===================== 3. Code rouge. Les lumières passent au rouge. Ton cœur : 152. =====================
const Alarme = scene('alarme', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    const cam = makeCam(vise([0, 100, 0.2], [0, PLAF, 2.5]));
    const d = couloir(cam, f, fg, {rouge: f > 3 ? 1 : 0});
    return <Vue fg={fg} cam={cam} d={d} zoom={1.05 + 0.05 * k} rouge={0.6} roll={-2} />;
  }
  // assis dans le lit, tout est rouge, le cœur s'emballe
  const bpm = interpolate(f, [55, R('semballe', 89), R('cent', 121) + 6], [72, 110, 152], clamp);
  const cam = makeCam(vise([-420 + 60 * k, -330, 0.3], [-60, -180, 1.9]));
  const d = chambre(cam, f, fg, {rouge: 1, couvY: 110, bpm});
  const moi = P(cam, d, -40, 2.0, {yeux: 1.35, bouche: 'o', sourcils: 1, sueur: 1, pupX: 10, brasG: [20, 30], brasD: [20, 30]}, 'a1', {y: 330, rim: 'rouge'});
  return <Vue fg={fg} cam={cam} d={d} items={[{...moi, z: LIT.z0 + 0.3}]} zoom={1.02 + 0.08 * k} rouge={0.6} dessus={<BPM f={f} v={bpm} op={ease(t, 0, 8)} />} />;
});

// ===================== 4. Tu passes la tête dans le couloir : ils avancent, bras tendus, les yeux qui brillent =====================
const Couloir = scene('couloir', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    const cam = makeCam(vise([220, -200, 1.2], [CO.x0, -200, 2.0]));
    const d = couloir(cam, f, fg, {rouge: 1, porteOuverte: true});
    const sort = ease(t, 4, 22, Easing.out(Easing.cubic));
    const moi = P(cam, d, CO.x0 + lerp(-120, 60, sort), 2.0, {yeux: 1.3, bouche: 'o', sourcils: 0.8, pupX: 16, brasG: [15, 10], brasD: [40, 40]}, 'c0', {rim: 'rouge'});
    return <Vue fg={fg} cam={cam} d={d} items={[moi]} zoom={1.08} rouge={0.5} />;
  }
  // le couloir : ils arrivent
  const cam = makeCam(vise([30, -230, lerp(0.1, 0.4, k)], [0, -150, 8]));
  const d = couloir(cam, f, fg, {rouge: 1, gresille: true});
  const zs = [[-150, 4.2, 0], [170, 3.4, 1], [-40, 2.8, 2], [220, 5.2, 3], [40, 6.0, 4], [-230, 5.6, 5], [120, 7.2, 6], [-120, 7.8, 7]];
  const items = zs.map(([x, z0, j]) => {
    const z = z0 - t * 0.012;
    return P(cam, d, x + 10 * Math.sin(fg / 20 + j), z, {...ZOMBIE(fg / 8, j)}, `z${j}`, {rim: 'blanc'});
  });
  const yeux = f >= R('yeux', 148) - 4 ? 1 : 0.7;
  return <Vue fg={fg} cam={cam} d={d} items={items} zoom={1.0 + 0.06 * k} rouge={0.4} dessus={<rect width="1080" height="1920" fill="#000" opacity={0.15 * (1 - yeux)} />} />;
});

// ===================== 5. Le plan : deux chambres, une salle de bain, le couloir bloqué =====================
const Plan = scene('plan', ({f, fg, R}) => {
  const e = (a) => pop(f, a);
  const bloque = pop(f, R('bloqué', 103) - 4);
  const W = 1080;
  return (
    <Ecran2D fg={fg} vignette={0.5}>
      <defs>
        <pattern id="pl-g" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40,0 L0,0 L0,40" fill="none" stroke="#3a5a9a" strokeWidth="1" opacity="0.5" />
        </pattern>
      </defs>
      <rect width={W} height="1920" fill="#0e2246" />
      <rect width={W} height="1920" fill="url(#pl-g)" />
      <g transform={`translate(540 900) scale(${1 + 0.04 * (f / 120)}) translate(-540 -900)`}>
        <text x="540" y="380" textAnchor="middle" fontFamily={POLICE} fontSize="62" fill="#ffc83a" letterSpacing="3" opacity={e(R('deux', 2))}>2 CHAMBRES · 1 SALLE DE BAIN</text>
        {[['412', 100, R('chambres', 9)], ['SDB', 445, R('salle', 41)], ['414', 600, R('chambres', 9)]].map(([n, x, a], k) => {
          const u = e(a);
          const w = k === 1 ? 155 : 380;
          return (
            <g key={k} opacity={u}>
              <text x={x + w / 2} y="510" textAnchor="middle" fontFamily={POLICE} fontSize={k === 1 ? 44 : 70} fill={k === 1 ? '#7ab0ff' : '#ffffff'}>{n}</text>
              <rect x={x} y="540" width={w} height={k === 1 ? 300 : 520} fill="none" stroke="#ffffff" strokeWidth="10" />
              {k !== 1 && <rect x={x + (k ? 200 : 40)} y="580" width="130" height="220" fill="#ffffff" opacity="0.18" />}
              {k !== 1 && <path d={`M${x + (k ? 210 : 170)},1060 a120,120 0 0 1 120,-120`} fill="none" stroke="#ffffff" strokeWidth="5" opacity="0.8" />}
            </g>
          );
        })}
        <rect x="445" y="840" width="155" height="220" fill="#0a1830" stroke="#ffffff" strokeWidth="10" opacity={e(R('salle', 41))} />
        {/* toi (point jaune) */}
        <circle cx="180" cy={700} r={18 + 4 * Math.sin(f / 4)} fill="#ffd23a" stroke="#000" strokeWidth="5" opacity={e(R('chambres', 9))} />
        {/* le couloir et les zombies (points rouges) */}
        <rect x="20" y="1070" width="1040" height="190" fill="none" stroke="#7a9ad0" strokeWidth="5" opacity={e(R('couloir', 91))} />
        <text x="1000" y="1310" textAnchor="end" fontFamily={POLICE} fontSize="40" fill="#9ab0d8" opacity={e(R('couloir', 91))}>COULOIR</text>
        {[...Array(16)].map((_, j) => {
          const u = e(R('couloir', 91) + j);
          const x = 120 + random(`zx${j}`) * 520 + 30 * Math.sin(f / 15 + j);
          const y = 1110 + random(`zy${j}`) * 120;
          return <circle key={j} cx={x} cy={y} r={18 * u} fill="#ff5a3a" />;
        })}
        <g opacity={bloque} transform={`translate(380 1165) scale(${bloque})`}>
          <path d="M-80,-80 L80,80 M80,-80 L-80,80" stroke="#ff2a2a" strokeWidth="22" strokeLinecap="round" />
        </g>
      </g>
    </Ecran2D>
  );
});

// ===================== 6. L'infirmière déboule, verrouille, chuchote : par la salle de bain =====================
const INF = {tenue: 'scrubs', cheveux: 'chignon', peau: '#b07a52'};
const Infirmiere = scene('infirmiere', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    const ouvre = ease(f, 0, 8, Easing.out(Easing.cubic)) * (1 - ease(f, R('verrouille', 61) - 12, R('verrouille', 61) - 4));
    const entre = ease(f, 4, 26, Easing.out(Easing.cubic));
    const cam = makeCam(vise([300, -300, 2.2], [-380, -150, 0.3]));
    const d = chambre(cam, f, fg, {rouge: 1, porte: ouvre});
    const inf = P(cam, d, lerp(-380, -320, entre), lerp(0.2, 0.5, entre), {...INF, yeux: 1.2, sourcils: -0.6, bouche: 'serre', brasG: [20, 10], brasD: [lerp(80, 20, ease(f, 61, 70)), 60], jambes: Math.sin(fg / 2.5) * (1 - entre)}, 'i0', {rim: 'rouge'});
    const clic = f >= R('verrouille', 61) && f < R('verrouille', 61) + 10;
    return <Vue fg={fg} cam={cam} d={d} items={[inf]} zoom={1.04 + 0.05 * k} rouge={0.5} roll={clic ? tremble(fg, 2, 'cl') : 0} />;
  }
  // gros plan : « chut… par la salle de bain » (elle pointe la porte)
  const pointe = ease(f, R('par', 103) - 6, R('salle', 119));
  const cam = makeCam(vise([-60, -380, 1.0], [-260, -380, 2.3]));
  const d = chambre(cam, f, fg, {rouge: 1});
  const inf = P(cam, d, -260, 1.7, {...INF, yeux: 1.15, sourcils: 0.4, bouche: 'chut', brasD: [lerp(160, 70, pointe), lerp(-140, -10, pointe)], brasG: [10, 0], pupX: -14 * pointe}, 'i1', {rim: 'rouge'});
  return <Vue fg={fg} cam={cam} d={d} items={[inf]} zoom={1.12 + 0.05 * k} rouge={0.45} />;
});

// ===================== 7. Trop tard : quelque chose à la porte. Puis dix. Puis vingt. =====================
const Porte = scene('porte', ({f, fg, k, R}) => {
  const n = f < R('dix', 79) - 4 ? 1 : f < R('vingt', 105) - 4 ? 10 : 20;
  const secoue = f > R('porte', 51) ? Math.sin(f * 1.9) * (n > 1 ? 1 : 0.4) : 0;
  const apparu = ease(f, R('quelque', 25) - 6, R('porte', 51));
  return (
    <Ecran2D fg={fg} vignette={0.7}>
      <defs>
        <linearGradient id="po-b" x1="0" y1="0" x2="1" y2="0">
          {[...Array(10)].map((_, j) => <stop key={j} offset={j / 9} stopColor={j % 2 ? '#a8763e' : '#9a6a36'} />)}
        </linearGradient>
        <clipPath id="po-v">
          <rect x="360" y="230" width="230" height="900" />
        </clipPath>
      </defs>
      <g transform={`translate(540 900) scale(${1.02 + 0.05 * k}) translate(-540 -900)`}>
        <rect width="1080" height="1920" fill="#2a3a5a" />
        <rect x="120" y="0" width="900" height="1920" fill="url(#po-b)" />
        <rect x="120" y="0" width="900" height="1920" fill="#1a2a5a" opacity="0.35" />
        {/* la vitre étroite */}
        <rect x="350" y="220" width="250" height="920" fill="#5a3a1e" />
        <g clipPath="url(#po-v)">
          <rect x="360" y="230" width="230" height="900" fill="#05070e" />
          {[...Array(n)].map((_, j) => {
            const x = 380 + random(`px${j}`) * 190;
            const y = 260 + (j / Math.max(1, n - 1)) * 820 + 30 * Math.sin(fg / 10 + j);
            const s = 0.32 + random(`ps${j}`) * 0.12;
            return (
              <g key={j} opacity={j === 0 ? apparu : 1} transform={`translate(${x} ${y + 330 * s}) scale(${s})`}>
                <Rond zombie brasG={[160, -20]} brasD={[150, -10]} />
              </g>
            );
          })}
          {/* mains plaquées sur la vitre */}
          {[...Array(Math.min(6, n))].map((_, j) => (
            <g key={`m${j}`} transform={`translate(${400 + (j % 2) * 120} ${330 + j * 140}) scale(0.8)`} opacity={0.9}>
              <circle r="34" fill="#1a1e2e" />
              {[-24, -8, 8, 24].map((x, q) => <rect key={q} x={x - 8} y={-80} width="16" height="56" rx="8" fill="#1a1e2e" />)}
            </g>
          ))}
          <rect x="360" y="230" width="230" height="900" fill="#8ab0ff" opacity="0.08" />
        </g>
        {/* la poignée qui s'agite */}
        <g transform={`translate(300 1180) rotate(${secoue * 14} 0 0)`}>
          <circle r="40" fill="#c8ccd8" />
          <rect x="0" y="-16" width="200" height="32" rx="16" fill="#c8ccd8" />
        </g>
        {/* le lit au premier plan */}
        <path d="M0,1500 Q540,1420 1080,1500 L1080,1920 L0,1920 Z" fill="#5a6888" />
        <rect x="200" y="1520" width="680" height="40" rx="20" fill="#3a4868" />
      </g>
    </Ecran2D>
  );
});

// ===================== 8. La salle de bain, la 414, tu cours… et oui, ta blouse est ouverte derrière =====================
const Fuite = scene('fuite', ({f, fg, i, t, k, d: dd}) => {
  if (i === 0) {
    // la salle de bain traversée en courant (2D, travelling)
    const u = ease(t, 0, dd, Easing.inOut(Easing.sin));
    return (
      <Ecran2D fg={fg} vignette={0.6}>
        <g transform={`translate(${lerp(200, -500, u)} 0) scale(1.05)`}>
          <rect x="-400" y="0" width="2400" height="1920" fill="#c8d8e8" />
          {[...Array(40)].map((_, j) => <rect key={j} x={-400 + (j % 20) * 120} y={200 + Math.floor(j / 20) * 120} width="114" height="114" fill="#e8f0f8" />)}
          <rect x="-400" y="1300" width="2400" height="620" fill="#7a8aa8" />
          <rect x="300" y="300" width="300" height="380" rx="20" fill="#a8c8e8" stroke="#e8eef8" strokeWidth="14" />
          <rect x="320" y="740" width="260" height="60" rx="20" fill="#f4f6fa" />
          <rect x="800" y="900" width="180" height="300" rx="40" fill="#f4f6fa" />
          <rect x="1300" y="250" width="380" height="1060" fill="#ff1a1a" opacity="0.4" />
          <rect x="1320" y="270" width="340" height="1040" fill="#9a6a36" />
          <text x="1490" y="400" textAnchor="middle" fontFamily={POLICE} fontSize="70" fill="#ffffff">414</text>
        </g>
        <g transform="translate(540 1900)">
          <g transform={`scale(1.3) translate(0 ${Math.abs(Math.sin(fg / 2.5)) * -30})`}>
            <Rond dos jambes={Math.sin(fg / 2.5)} brasG={[30 + 25 * Math.sin(fg / 2.5), -20]} brasD={[30 - 25 * Math.sin(fg / 2.5), -20]} />
          </g>
        </g>
        <rect width="1080" height="1920" fill="#ff1a1a" opacity="0.12" style={{mixBlendMode: 'multiply'}} />
      </Ecran2D>
    );
  }
  if (i === 1) {
    // de dos dans le couloir : la blouse ouverte (et le caleçon à carreaux)
    const cam = makeCam(vise([0, -300, lerp(0.6, 1.4, k)], [0, -150, 9]));
    const d = couloir(cam, f, fg, {rouge: 1});
    const z = lerp(1.6, 2.6, k);
    const z2 = lerp(3.4, 4.6, k);
    const items = [
      P(cam, d, 0, z, {dos: true, jambes: Math.sin(fg / 2.4), brasG: [45 + 30 * Math.sin(fg / 2.4), -30], brasD: [45 - 30 * Math.sin(fg / 2.4), -30]}, 'f1', {rim: 'rouge', echelle: 1.0}),
      P(cam, d, -160, z2, {...INF, dos: true, jambes: Math.sin(fg / 2.4 + 1), brasG: [40, -20], brasD: [40, -20]}, 'f2', {rim: 'rouge'}),
    ];
    return <Vue fg={fg} cam={cam} d={d} items={items} rouge={0.4} roll={Math.sin(fg / 5) * 1.5} />;
  }
  // de face : vous courez vers la caméra, eux derrière
  const cam = makeCam(vise([0, -230, lerp(7.6, 6.8, k)], [0, -200, 0]));
  const d = couloir(cam, f, fg, {rouge: 1});
  const items = [
    P(cam, d, 80, lerp(5.6, 5.0, k), {yeux: 1.35, bouche: 'cri', sourcils: 1, sueur: 1, jambes: Math.sin(fg / 2.4), brasG: [40 + 30 * Math.sin(fg / 2.4), -40], brasD: [40 - 30 * Math.sin(fg / 2.4), -40]}, 'f3', {rim: 'rouge'}),
    P(cam, d, -140, lerp(5.2, 4.6, k), {...INF, yeux: 1.2, bouche: 'serre', sourcils: -0.5, jambes: Math.sin(fg / 2.4 + 1), brasG: [40, -40], brasD: [40, -40]}, 'f4', {rim: 'rouge'}),
    ...[[-120, 2.2], [150, 1.6], [0, 1.0], [-220, 0.8]].map(([x, z], j) => P(cam, d, x, z + t * 0.006, ZOMBIE(fg / 6, j), `fz${j}`, {rim: 'blanc'})),
  ];
  return <Vue fg={fg} cam={cam} d={d} items={items} rouge={0.4} flou={[0, 2]} />;
});

// ===================== 9. L'ascenseur ou l'escalier de secours ? =====================
const Dilemme = scene('dilemme', ({f, fg, k, R}) => {
  const cam = makeCam(vise([0, -260, lerp(5.6, 6.4, k)], [0, -220, 9.2]));
  const d = couloir(cam, f, fg, {rouge: 1});
  const items = [
    P(cam, d, 120, 7.4, {dos: true, brasG: [20, 0], brasD: [20, 0]}, 'd1', {rim: 'rouge'}),
    P(cam, d, -100, 7.6, {...INF, dos: true, brasG: [20, 0], brasD: [60, 20]}, 'd2', {rim: 'rouge'}),
  ];
  const dis = R('dis-le', 103);
  return (
    <Vue fg={fg} cam={cam} d={d} items={items} rouge={0.45} zoom={1.0 + 0.05 * k}
      dessus={
        <g>
          <ChoixBoite f={f} debut={R('lascenseur', 36) - 4} x={540} y={520} texte="L'ASCENSEUR" emoji="1f6d7" couleur="#ffb03a" />
          <ChoixBoite f={f} debut={R('lescalier', 68) - 4} x={540} y={720} texte="L'ESCALIER" emoji="1f3c3" couleur="#3ad86a" />
          <BulleCommentaire f={f} t0={dis - 2} y={1700} />
        </g>
      } />
  );
});

const COMPOSANTS = {bloc: Bloc, chambre: Chambre, alarme: Alarme, couloir: Couloir, plan: Plan, infirmiere: Infirmiere, porte: Porte, fuite: Fuite, dilemme: Dilemme};
export const Hopital = () => (
  <Series>
    {SCENES.map(([nom, d]) => {
      const C = COMPOSANTS[nom];
      return (
        <Series.Sequence key={nom} durationInFrames={d}>
          <C />
        </Series.Sequence>
      );
    })}
  </Series>
);
