import {random} from 'remotion';
import {plaque} from './Lycee';
import {Perso} from './moteur';
import {SOL} from './Rue';

// ===================== La station de métro (« Le dernier train ») =====================
// Quai à gauche (X −1500 → 0, sol SOL = 432), voies à droite (fosse X 0 → 1800, ballast à FOSSE = 852).
// Voûte elliptique carrelée de X −1500 à X 1800 (naissance à Y −420, sommet à −1320). Station de Z 0 à Z 28,
// tunnel noir aux deux bouts (Z −20 → 0 : d'où arrivent la chose et le train fantôme ; Z 28 → 48 : où part le dernier train).
// Lumière : une rangée de néons tous les 2 Z de chaque côté de la voûte, plus plein de petites sources d'ambiance
// (diodes du bord du quai, pubs rétroéclairées, panneau horaire orange, distributeur, signaux rouges/verts, sortie verte).
export const FOSSE = 852;
export const MUR_Q = -1500;
export const MUR_V = 1800;
export const NAISS = -420;
export const VOUTE = {xc: 150, a: 1650, b: 900};
export const ST = {z0: 0, z1: 28};
export const TUN = {x0: 20, x1: 1780, y: -260, apex: -640, av: -20, ap: 48};
export const RAILS = [330, 850];
export const NEONS_Z = [...Array(14)].map((_, k) => 1 + 2 * k);
export const PILIERS = [4, 10, 17.5, 23];
export const PILIER = {x0: -900, x1: -660, dz: 0.13};
export const HORAIRE = {x0: -560, x1: 40, y0: -800, y1: -590, z: 8};
export const PASSAGE = {z0: 13.4, z1: 15.6, y: -330};
export const HP = {x: -660, y: -640, z: 10}; // haut-parleur, sur la face du pilier côté voies
export const TRAIN = {x0: 60, x1: 1060, toit: -760, bas: 560, jupe: 780, plancher: 412, long: 3.7};

export const ligne = (cam, A, B, w, col, key, op = 1) => {
  const r = cam.seg(A, B);
  return r ? <line key={key} x1={r[0][0]} y1={r[0][1]} x2={r[1][0]} y2={r[1][1]} stroke={col} strokeWidth={w} opacity={op} strokeLinecap="round" /> : null;
};
export const quad = (cam, pts, fill, key, op = 1, extra = {}) => {
  const p = cam.poly(pts);
  return p ? <polygon key={key} points={p} fill={fill} opacity={op} {...extra} /> : null;
};
// polygone percé (ex. mur du bout avec la bouche du tunnel)
export const troue = (cam, ext, trous, fill, key) => {
  const p = cam.poly(ext);
  if (!p) return null;
  const d = [p, ...trous.map((t) => cam.poly(t)).filter(Boolean)].map((s) => `M${s.replace(/ /g, ' L')} Z`).join(' ');
  return <path key={key} d={d} fill={fill} fillRule="evenodd" />;
};
export const halo = (cam, x, y, z, r, grad, op, key) => {
  if (!cam.visible(z, x, y) || op <= 0.01) return null;
  const [px, py] = cam.proj(x, y, z);
  return <circle key={key} cx={px} cy={py} r={r * cam.scale(z, x, y)} fill={`url(#${grad})`} opacity={Math.min(1, op)} />;
};
// tache de lumière posée sur un plan horizontal (sol, ballast)
export const tache = (cam, x, y, z, rx, rz, grad, op, key) => {
  if (op <= 0.01) return null;
  const pts = [...Array(20)].map((_, k) => [x + Math.cos((k / 20) * 6.283) * rx, y, z + Math.sin((k / 20) * 6.283) * rz]);
  return quad(cam, pts, `url(#${grad})`, key, Math.min(1, op));
};
export const lw = (cam, w, P) => Math.max(1, w / Math.max(0.35, cam.profondeur(P[2], P[0], P[1])));
export const boiteG = (cam, x0, x1, y0, y1, z0, z1, [dessus, face, cote, dessous = cote], key) => (
  <g key={key}>
    {cam.y < y0 && quad(cam, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], dessus, 'h')}
    {cam.y > y1 && quad(cam, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], dessous, 'b')}
    {cam.x > x1 && quad(cam, [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], cote, 'd')}
    {cam.x < x0 && quad(cam, [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], cote, 'g')}
    {cam.z < z0 && quad(cam, [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], face, 'f')}
    {cam.z > z1 && quad(cam, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], face, 'a')}
  </g>
);
// lumière qui grésille (paquets de 3 images)
export const gresille = (f, graine, taux = 0.1, bas = 0.25) => (random(`${graine}${Math.floor(f / 3)}`) < taux ? bas : 1);
export const rgb = (c, k, t = [1, 1, 1]) => `rgb(${c.map((v, i) => Math.round(Math.min(255, v * k * t[i]))).join(',')})`;
const voute = (th, z, d = 0) => [VOUTE.xc - (VOUTE.a - d) * Math.cos(th), NAISS - (VOUTE.b - d) * Math.sin(th), z];
const TH = [...Array(11)].map((_, k) => (Math.PI * k) / 10);
// la bouche du tunnel (en coupe), à la profondeur z
const bouche = (z) => {
  const {x0, x1, y, apex} = TUN;
  const arc = [...Array(9)].map((_, k) => {
    const a = Math.PI * (k / 8);
    return [(x0 + x1) / 2 - Math.cos(a) * ((x1 - x0) / 2), y - Math.sin(a) * (y - apex), z];
  });
  return [[x0, FOSSE, z], ...arc, [x1, FOSSE, z]];
};

export const DefsGare = ({cam, id = 'ga'}) => (
  <defs>
    <radialGradient id={`${id}-neon`}>
      <stop offset="0" stopColor="#f2fbff" stopOpacity="0.9" />
      <stop offset="0.3" stopColor="#bfe4ff" stopOpacity="0.35" />
      <stop offset="1" stopColor="#7ab8ff" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-sol`}>
      <stop offset="0" stopColor="#e8f6ff" stopOpacity="0.5" />
      <stop offset="0.5" stopColor="#bfe0ff" stopOpacity="0.18" />
      <stop offset="1" stopColor="#bfe0ff" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-orange`}>
      <stop offset="0" stopColor="#ffd08a" stopOpacity="0.9" />
      <stop offset="0.35" stopColor="#ff9a2a" stopOpacity="0.35" />
      <stop offset="1" stopColor="#ff7a00" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-rouge`}>
      <stop offset="0" stopColor="#ff5a4a" stopOpacity="0.95" />
      <stop offset="0.3" stopColor="#ff1a1a" stopOpacity="0.4" />
      <stop offset="1" stopColor="#ff0000" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-vert`}>
      <stop offset="0" stopColor="#c8ffd8" stopOpacity="0.9" />
      <stop offset="0.35" stopColor="#2aff6a" stopOpacity="0.35" />
      <stop offset="1" stopColor="#00ff50" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-froid`}>
      <stop offset="0" stopColor="#d8f4ff" stopOpacity="0.8" />
      <stop offset="0.4" stopColor="#5ac8ff" stopOpacity="0.3" />
      <stop offset="1" stopColor="#0a8aff" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-phare`}>
      <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
      <stop offset="0.12" stopColor="#fff8e0" stopOpacity="0.8" />
      <stop offset="0.45" stopColor="#ffe8b0" stopOpacity="0.22" />
      <stop offset="1" stopColor="#ffe8b0" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-chaud`}>
      <stop offset="0" stopColor="#fff0c8" stopOpacity="0.85" />
      <stop offset="0.4" stopColor="#ffc87a" stopOpacity="0.3" />
      <stop offset="1" stopColor="#ffb050" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-pub`}>
      <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
      <stop offset="0.5" stopColor="#ffe8f0" stopOpacity="0.15" />
      <stop offset="1" stopColor="#fff" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-brume`} cx={cam.fuite[0]} cy={cam.fuite[1]} r="1000" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="#0a1014" stopOpacity="0.5" />
      <stop offset="0.5" stopColor="#0a1014" stopOpacity="0.15" />
      <stop offset="1" stopColor="#0a1014" stopOpacity="0" />
    </radialGradient>
  </defs>
);

// ----- les affiches (pubs rétroéclairées) -----
const AFFICHES = [
  // parfum
  (w, h) => (
    <g>
      <defs>
        <linearGradient id="af0" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a2a6a" />
          <stop offset="1" stopColor="#5a2a8a" />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill="url(#af0)" />
      <circle cx={w * 0.7} cy={h * 0.35} r={h * 0.28} fill="#ff8ac8" opacity="0.5" />
      <rect x={w * 0.62} y={h * 0.3} width={w * 0.16} height={h * 0.45} rx="30" fill="#f8d8ff" opacity="0.9" />
      <rect x={w * 0.66} y={h * 0.22} width={w * 0.08} height={h * 0.1} fill="#e8b84a" />
      <rect x={w * 0.08} y={h * 0.62} width={w * 0.4} height={h * 0.07} fill="#fff" />
      <rect x={w * 0.08} y={h * 0.74} width={w * 0.28} height={h * 0.04} fill="#e8c8ff" />
    </g>
  ),
  // concert
  (w, h) => (
    <g>
      <rect width={w} height={h} fill="#ffcf2a" />
      <path d={`M0,${h} L${w * 0.45},${h * 0.2} L${w * 0.7},${h} Z`} fill="#e83a2a" />
      <circle cx={w * 0.72} cy={h * 0.32} r={h * 0.16} fill="#1a1a2a" />
      <rect x={w * 0.06} y={h * 0.08} width={w * 0.5} height={h * 0.14} fill="#1a1a2a" />
      <rect x={w * 0.06} y={h * 0.27} width={w * 0.32} height={h * 0.05} fill="#1a1a2a" />
    </g>
  ),
  // voyage (plage)
  (w, h) => (
    <g>
      <rect width={w} height={h * 0.55} fill="#2ac8e8" />
      <rect y={h * 0.55} width={w} height={h * 0.2} fill="#0a8ab8" />
      <rect y={h * 0.75} width={w} height={h * 0.25} fill="#f8d89a" />
      <circle cx={w * 0.8} cy={h * 0.2} r={h * 0.1} fill="#fff4a0" />
      <path d={`M${w * 0.2},${h * 0.8} Q${w * 0.24},${h * 0.4} ${w * 0.32},${h * 0.25}`} stroke="#5a3a1a" strokeWidth="26" fill="none" />
      <path d={`M${w * 0.32},${h * 0.25} q-120,-10 -200,60 M${w * 0.32},${h * 0.25} q110,-30 200,40 M${w * 0.32},${h * 0.25} q0,-90 -60,-140`} stroke="#2a9a4a" strokeWidth="34" fill="none" strokeLinecap="round" />
      <rect x={w * 0.5} y={h * 0.08} width={w * 0.42} height={h * 0.08} fill="#fff" />
    </g>
  ),
  // téléphone
  (w, h) => (
    <g>
      <rect width={w} height={h} fill="#12121a" />
      <circle cx={w * 0.3} cy={h * 0.5} r={h * 0.45} fill="#7a2aff" opacity="0.55" />
      <circle cx={w * 0.5} cy={h * 0.6} r={h * 0.35} fill="#ff2a8a" opacity="0.4" />
      <rect x={w * 0.24} y={h * 0.12} width={w * 0.2} height={h * 0.78} rx="40" fill="#0a0a10" stroke="#c8c8d8" strokeWidth="10" />
      <rect x={w * 0.55} y={h * 0.38} width={w * 0.38} height={h * 0.1} fill="#fff" />
      <rect x={w * 0.55} y={h * 0.53} width={w * 0.25} height={h * 0.05} fill="#a8a8c8" />
    </g>
  ),
  // film
  (w, h) => (
    <g>
      <rect width={w} height={h} fill="#0a1a1a" />
      <rect y={h * 0.6} width={w} height={h * 0.4} fill="#c83a1a" opacity="0.8" />
      <ellipse cx={w * 0.5} cy={h * 0.42} rx={w * 0.12} ry={h * 0.22} fill="#1a0a0a" />
      <circle cx={w * 0.5} cy={h * 0.24} r={h * 0.1} fill="#1a0a0a" />
      <rect x={w * 0.2} y={h * 0.78} width={w * 0.6} height={h * 0.1} fill="#fff" />
    </g>
  ),
];
const NOM_STATION = (w, h) => (
  <g>
    <rect width={w} height={h} rx="30" fill="#0b3a8a" stroke="#f4f4f0" strokeWidth="18" />
    <text x={w / 2} y={h * 0.68} textAnchor="middle" fontFamily="'DejaVu Sans', Arial, sans-serif" fontWeight="900" fontSize={h * 0.5} fill="#f4f4f0" letterSpacing="6">
      SAINT-OUBLI
    </text>
  </g>
);
const PLAN_RESEAU = (w, h) => (
  <g>
    <rect width={w} height={h} fill="#f4f0e4" />
    {['#e8b020', '#2a6ad8', '#d82a5a', '#2aa84a', '#8a3ad8', '#ff7a2a'].map((c, k) => (
      <path key={k} d={`M${40 + k * 30},${60 + k * 100} C${w * 0.3},${h * 0.2 + k * 60} ${w * 0.6},${h * 0.9 - k * 90} ${w - 40},${120 + k * 110}`} stroke={c} strokeWidth="18" fill="none" />
    ))}
    {[...Array(14)].map((_, k) => <circle key={k} cx={80 + ((k * 137) % (w - 160))} cy={80 + ((k * 211) % (h - 160))} r="16" fill="#fff" stroke="#222" strokeWidth="6" />)}
  </g>
);

// ===================== le quai =====================
// neon(z) : 0 → 1 (néon allumé), pubs(z) idem pour les affiches. horaire : texte du panneau.
export const quai = (cam, f, {neon = () => 1, pubs = null, horaire = '05:40', hp = 0, signal = 'rouge', leds = 1, tunnelLampes = 1, brume = 1} = {}) => {
  const on = {};
  NEONS_Z.forEach((n) => (on[n] = Math.max(0, Math.min(1, neon(n))) * gresille(f, `qn${n}`, 0.04, 0.35)));
  const pub = pubs || ((z) => Math.max(0, Math.min(1, neon(Math.round((z - 1) / 2) * 2 + 1))));
  // lumière reçue à la profondeur z (0.1 = noir d'ambiance)
  const L = (z) => {
    let s = 0;
    NEONS_Z.forEach((n) => (s += on[n] * Math.max(0, 1 - Math.abs(z - n) / 2.6)));
    return 0.1 + 0.9 * Math.min(1, s);
  };
  const T = [0.92, 0.98, 1.06]; // néons froids
  const fond = [];
  fond.push(<DefsGare key="defs" cam={cam} />);
  fond.push(<rect key="noir" width="1080" height="1920" fill="#030405" />);

  // ----- les tunnels aux deux bouts -----
  [[TUN.av, ST.z0], [ST.z1, TUN.ap]].forEach(([za, zb], j) => {
    const {x0, x1} = TUN;
    for (let z = za; z < zb; z += 1) {
      const loin = j === 0 ? (ST.z0 - z) / 20 : (z - ST.z1) / 20; // 0 à la bouche → 1 au fond
      const k = 0.35 * (1 - loin) + 0.04;
      const sec = bouche(0);
      for (let s = 0; s < sec.length - 1; s++) {
        const A = sec[s];
        const B = sec[s + 1];
        fond.push(quad(cam, [[A[0], A[1], z], [B[0], B[1], z], [B[0], B[1], z + 1.02], [A[0], A[1], z + 1.02]], rgb([60, 58, 56], k), `tu${j}${z}${s}`));
      }
      fond.push(quad(cam, [[x0, FOSSE, z], [x1, FOSSE, z], [x1, FOSSE, z + 1.02], [x0, FOSSE, z + 1.02]], rgb([46, 42, 40], k), `tb${j}${z}`));
      // câbles le long du mur et petites lampes orange tous les 3 Z
      fond.push(ligne(cam, [x0 + 15, -80, z], [x0 + 15, -80, z + 1], lw(cam, 14, [x0, -80, z]), '#0a0a0a', `tc${j}${z}`));
      fond.push(ligne(cam, [x0 + 15, -40, z], [x0 + 15, -40, z + 1], lw(cam, 10, [x0, -40, z]), '#141210', `td${j}${z}`));
      if (Math.round(z) % 3 === 0) {
        const lo = tunnelLampes * gresille(f, `tl${j}${z}`, 0.08, 0.2);
        fond.push(halo(cam, x0 + 40, -180, z + 0.5, 700, 'ga-orange', 0.5 * lo, `tlh${j}${z}`));
        fond.push(halo(cam, x0 + 40, -180, z + 0.5, 60, 'ga-orange', lo, `tlp${j}${z}`));
      }
    }
    // rails dans le tunnel
    RAILS.forEach((x) => fond.push(ligne(cam, [x, FOSSE - 30, za], [x, FOSSE - 30, zb], lw(cam, 30, [x, FOSSE, cam.z + 3]), '#5a5a5e', `tr${j}${x}`, 0.6)));
  });

  // ----- murs des deux bouts, percés par la bouche du tunnel -----
  [ST.z0, ST.z1].forEach((z, j) => {
    const ext = [[MUR_Q, SOL, z], ...TH.map((th) => voute(th, z)), [MUR_V, FOSSE, z], [0, FOSSE, z], [0, SOL, z]];
    fond.push(troue(cam, ext, [bouche(z)], rgb([200, 204, 198], L(z) * 0.8, T), `bout${j}`));
    // signal lumineux à côté de la bouche
    const col = signal === 'vert' ? 'ga-vert' : 'ga-rouge';
    const sz = j === 0 ? z + 0.02 : z - 0.02;
    fond.push(boiteG(cam, 1560, 1700, -150, 120, sz - 0.03, sz + 0.03, ['#111', '#151515', '#111'], `sig${j}`));
    fond.push(halo(cam, 1630, -80, sz, 420, col, 0.75, `sgh${j}`));
    fond.push(halo(cam, 1630, -80, sz, 70, col, 1, `sgp${j}`));
    fond.push(halo(cam, 1630, 40, sz, 50, j === 0 ? 'ga-vert' : 'ga-orange', 0.35, `sgq${j}`));
  });

  // ----- la voûte (carrelage blanc), découpée en tranches pour que la lumière suive les néons -----
  for (let z = ST.z0; z < ST.z1; z += 1) {
    const l = L(z + 0.5);
    for (let s = 0; s < 10; s++) {
      const k = l * (0.78 + 0.22 * Math.sin(TH[s] + 0.15));
      fond.push(quad(cam, [voute(TH[s], z), voute(TH[s + 1], z), voute(TH[s + 1], z + 1.01), voute(TH[s], z + 1.01)], rgb([206, 210, 204], k, T), `v${z}${s}`));
    }
  }
  // joints du carrelage sur la voûte
  TH.slice(1, 10).forEach((th, s) => fond.push(ligne(cam, voute(th, ST.z0, 2), voute(th, ST.z1, 2), lw(cam, 5, voute(th, cam.z + 3)), '#5a5e5a', `vj${s}`, 0.35)));
  for (let z = Math.max(ST.z0, Math.floor(cam.z) - 6); z < Math.min(ST.z1, cam.z + 10); z += 0.5) {
    for (let s = 0; s < 10; s++) fond.push(ligne(cam, voute(TH[s], z, 2), voute(TH[s + 1], z, 2), lw(cam, 4, voute(TH[s], z)), '#5a5e5a', `vt${z}${s}`, 0.25));
  }
  // haut-parleurs et câbles au sommet
  fond.push(ligne(cam, voute(Math.PI / 2, ST.z0, 30), voute(Math.PI / 2, ST.z1, 30), lw(cam, 24, voute(Math.PI / 2, cam.z + 3)), '#2a2c2e', 'cabv'));

  // ----- le mur du quai : carrelage, bandeau bleu canard, plaques, plan, passage vers la sortie -----
  for (let z = ST.z0; z < ST.z1; z += 1) {
    const l = L(z + 0.5);
    fond.push(quad(cam, [[MUR_Q, NAISS, z], [MUR_Q, 120, z], [MUR_Q, 120, z + 1.01], [MUR_Q, NAISS, z + 1.01]], rgb([214, 216, 208], l, T), `mq${z}`));
    fond.push(quad(cam, [[MUR_Q, 120, z], [MUR_Q, SOL, z], [MUR_Q, SOL, z + 1.01], [MUR_Q, 120, z + 1.01]], rgb([24, 112, 122], l, T), `mb${z}`));
    fond.push(quad(cam, [[MUR_Q + 1, 100, z], [MUR_Q + 1, 120, z], [MUR_Q + 1, 120, z + 1.01], [MUR_Q + 1, 100, z + 1.01]], rgb([230, 180, 60], l), `ml${z}`));
  }
  for (let y = NAISS + 90; y < 100; y += 104) fond.push(ligne(cam, [MUR_Q + 1, y, ST.z0], [MUR_Q + 1, y, ST.z1], lw(cam, 4, [MUR_Q, y, cam.z + 3]), '#6a6e68', `jh${y}`, 0.35));
  for (let z = Math.max(ST.z0, Math.floor(cam.z) - 5); z < Math.min(ST.z1, cam.z + 9); z += 0.2) fond.push(ligne(cam, [MUR_Q + 1, NAISS, z], [MUR_Q + 1, SOL, z], lw(cam, 4, [MUR_Q, 0, z]), '#6a6e68', `jv${z}`, 0.25));
  [3, 20.5, 26].forEach((z, k) => fond.push(plaque(cam, [MUR_Q + 3, -330, z - 0.75], [0, 0, 1], [0, 1, 0], 1500, 270, NOM_STATION(1500, 270), `nom${k}`)));
  fond.push(plaque(cam, [MUR_Q + 3, -360, 6.6], [0, 0, 1], [0, 1, 0], 1300, 820, PLAN_RESEAU(1300, 820), 'plan'));
  // passage vers la sortie (couloir chaud) + panneau vert « SORTIE »
  {
    const {z0, z1, y} = PASSAGE;
    fond.push(quad(cam, [[MUR_Q + 2, y, z0], [MUR_Q + 2, SOL, z0], [MUR_Q + 2, SOL, z1], [MUR_Q + 2, y, z1]], '#140c06', 'pass'));
    fond.push(quad(cam, [[MUR_Q - 900, y + 60, z0 + 0.3], [MUR_Q - 900, SOL, z0 + 0.3], [MUR_Q - 900, SOL, z1 - 0.3], [MUR_Q - 900, y + 60, z1 - 0.3]], '#4a2e14', 'passf'));
    fond.push(quad(cam, [[MUR_Q, SOL, z0], [MUR_Q - 900, SOL, z0 + 0.3], [MUR_Q - 900, SOL, z1 - 0.3], [MUR_Q, SOL, z1]], '#2a1a0c', 'passs'));
    fond.push(halo(cam, MUR_Q - 500, 0, (z0 + z1) / 2, 1300, 'ga-chaud', 0.45, 'passh'));
    fond.push(plaque(cam, [MUR_Q + 4, y - 120, (z0 + z1) / 2 - 0.45], [0, 0, 1], [0, 1, 0], 900, 100,
      <g>
        <rect width="900" height="100" rx="14" fill="#0a7a3a" />
        <text x="450" y="76" textAnchor="middle" fontFamily="'DejaVu Sans', Arial" fontWeight="900" fontSize="74" fill="#eafff0">SORTIE</text>
      </g>, 'sortie'));
    fond.push(halo(cam, MUR_Q + 20, y - 70, (z0 + z1) / 2, 700, 'ga-vert', 0.5, 'sortieh'));
  }

  // ----- le mur d'en face (de l'autre côté des voies) : carrelage, bandeau, pubs rétroéclairées -----
  for (let z = ST.z0; z < ST.z1; z += 1) {
    const l = L(z + 0.5);
    fond.push(quad(cam, [[MUR_V, NAISS, z], [MUR_V, 380, z], [MUR_V, 380, z + 1.01], [MUR_V, NAISS, z + 1.01]], rgb([212, 214, 206], l * 0.9, T), `mv${z}`));
    fond.push(quad(cam, [[MUR_V, 380, z], [MUR_V, FOSSE, z], [MUR_V, FOSSE, z + 1.01], [MUR_V, 380, z + 1.01]], rgb([150, 58, 40], l * 0.85, T), `mw${z}`));
  }
  for (let y = NAISS + 90; y < 380; y += 104) fond.push(ligne(cam, [MUR_V - 1, y, ST.z0], [MUR_V - 1, y, ST.z1], lw(cam, 4, [MUR_V, y, cam.z + 3]), '#6a6e68', `kh${y}`, 0.3));
  [2.5, 6.5, 14.5, 18.5, 22.5].forEach((z, k) => {
    const p = pub(z) * gresille(f, `pu${k}`, 0.03, 0.5);
    fond.push(quad(cam, [[MUR_V - 2, -330, z + 0.82], [MUR_V - 2, 660, z + 0.82], [MUR_V - 2, 660, z - 0.82], [MUR_V - 2, -330, z - 0.82]], '#1a1a1c', `pc${k}`));
    const af = plaque(cam, [MUR_V - 4, -290, z + 0.75], [0, 0, -1], [0, 1, 0], 1500, 910,
      <g>
        {AFFICHES[k % AFFICHES.length](1500, 910)}
        <rect width="1500" height="910" fill="#000" opacity={0.75 * (1 - p)} />
      </g>, `pub${k}`);
    fond.push(af);
    fond.push(halo(cam, MUR_V - 40, 160, z, 1300, 'ga-pub', 0.55 * p, `puh${k}`));
  });
  [10.5, 26.5].forEach((z, k) => fond.push(plaque(cam, [MUR_V - 3, -290, z + 0.75], [0, 0, -1], [0, 1, 0], 1500, 270, NOM_STATION(1500, 270), `nomv${k}`)));

  // ----- néons de la voûte (deux rangées) et leurs taches de lumière -----
  const RANGS = [0.3 * Math.PI, 0.71 * Math.PI];
  NEONS_Z.forEach((n) => {
    const o = on[n];
    RANGS.forEach((th, r) => {
      const A = voute(th, n - 0.75, 40);
      const B = voute(th, n + 0.75, 40);
      if (Math.abs(n - cam.z) < 1.0 && cam.y < A[1] + 500) return; // collé à la caméra : grande tache blanche
      fond.push(ligne(cam, A, B, lw(cam, 70, voute(th, n, 40)), '#1c2024', `nb${n}${r}`));
      fond.push(ligne(cam, A, B, lw(cam, 38, voute(th, n, 45)), o > 0.5 ? '#f4fcff' : '#3a4248', `nn${n}${r}`, 0.4 + 0.6 * o));
      fond.push(halo(cam, ...voute(th, n, 120), 1300, 'ga-neon', 0.4 * o, `nh${n}${r}`));
    });
  });

  // ----- la fosse : ballast, traverses, rails, puis le flanc du quai -----
  for (let z = ST.z0; z < ST.z1; z += 1) fond.push(quad(cam, [[0, FOSSE, z], [MUR_V, FOSSE, z], [MUR_V, FOSSE, z + 1.01], [0, FOSSE, z + 1.01]], rgb([60, 54, 50], L(z + 0.5) * 0.8), `fo${z}`));
  for (let z = Math.max(TUN.av, Math.floor(cam.z) - 8); z < Math.min(TUN.ap, cam.z + 16); z += 0.6) {
    fond.push(quad(cam, [[180, FOSSE - 12, z], [1000, FOSSE - 12, z], [1000, FOSSE - 12, z + 0.22], [180, FOSSE - 12, z + 0.22]], z < ST.z0 || z > ST.z1 ? '#2a2420' : rgb([90, 76, 64], L(z) * 0.8), `tv${z}`));
  }
  RAILS.forEach((x) => {
    fond.push(ligne(cam, [x, FOSSE - 30, ST.z0], [x, FOSSE - 30, ST.z1], lw(cam, 34, [x, FOSSE, cam.z + 3]), '#3a3a3e', `ra${x}`));
    fond.push(ligne(cam, [x, FOSSE - 46, ST.z0], [x, FOSSE - 46, ST.z1], lw(cam, 12, [x, FOSSE, cam.z + 3]), '#c8ccd4', `rb${x}`, 0.75));
  });
  fond.push(ligne(cam, [1480, FOSSE - 60, TUN.av], [1480, FOSSE - 60, TUN.ap], lw(cam, 40, [1480, FOSSE, cam.z + 3]), '#4a4038', 'rail3'));
  if (cam.x > 0) {
    for (let z = ST.z0; z < ST.z1; z += 1) fond.push(quad(cam, [[0, SOL, z], [0, FOSSE, z], [0, FOSSE, z + 1.01], [0, SOL, z + 1.01]], rgb([74, 72, 70], L(z + 0.5)), `fl${z}`));
    // niches de refuge sous le quai
    [5, 12, 19, 26].forEach((z, k) => fond.push(quad(cam, [[1, 560, z - 0.4], [1, FOSSE, z - 0.4], [1, FOSSE, z + 0.4], [1, 560, z + 0.4]], '#0a0a0a', `ni${k}`)));
  }

  // ----- le quai : dalles, bordure, bande d'éveil, diodes, reflets des néons, flaques -----
  if (cam.y < SOL) {
    for (let z = ST.z0; z < ST.z1; z += 1) {
      const l = L(z + 0.5);
      fond.push(quad(cam, [[MUR_Q, SOL, z], [-260, SOL, z], [-260, SOL, z + 1.01], [MUR_Q, SOL, z + 1.01]], rgb([112, 108, 104], l), `qs${z}`));
      fond.push(quad(cam, [[-260, SOL, z], [0, SOL, z], [0, SOL, z + 1.01], [-260, SOL, z + 1.01]], rgb([206, 206, 198], l), `qb${z}`));
      fond.push(quad(cam, [[-230, SOL - 1, z], [-170, SOL - 1, z], [-170, SOL - 1, z + 1.01], [-230, SOL - 1, z + 1.01]], rgb([226, 184, 46], l), `qe${z}`));
    }
    [-1200, -900, -600].forEach((x) => fond.push(ligne(cam, [x, SOL - 1, ST.z0], [x, SOL - 1, ST.z1], lw(cam, 4, [x, SOL, cam.z + 3]), '#3a3836', `dx${x}`, 0.5)));
    for (let z = Math.max(ST.z0, Math.floor(cam.z) - 4); z < Math.min(ST.z1, cam.z + 12); z += 0.3) fond.push(ligne(cam, [MUR_Q, SOL - 1, z], [-260, SOL - 1, z], lw(cam, 4, [-700, SOL, z]), '#3a3836', `dz${z}`, 0.45));
    // reflets des néons sur le sol mouillé
    NEONS_Z.forEach((n) => fond.push(tache(cam, -820, SOL - 2, n, 650, 1.1, 'ga-sol', 0.7 * on[n], `rs${n}`)));
    [[-500, 3.2, 360, 0.5], [-1000, 9, 300, 0.35], [-350, 15.5, 420, 0.6], [-1100, 21, 330, 0.4]].forEach(([x, z, rx, rz], k) => {
      fond.push(tache(cam, x, SOL - 3, z, rx, rz, 'ga-froid', 0.35 + 0.4 * L(z), `fl${k}`));
    });
    // diodes au bord du quai (elles restent allumées dans le noir)
    for (let z = ST.z0 + 0.25; z < ST.z1; z += 0.5) {
      if (Math.abs(z - cam.z) > 14) continue;
      const p = leds * (0.55 + 0.45 * Math.sin(f / 9 + z * 1.7));
      fond.push(halo(cam, -40, SOL - 3, z, 130, 'ga-froid', 0.55 * p, `ld${z}`));
      fond.push(halo(cam, -40, SOL - 3, z, 22, 'ga-froid', p, `le${z}`));
    }
  }
  fond.push(<rect key="brume" width="1080" height="1920" fill="url(#ga-brume)" opacity={brume} />);

  // ----- éléments triés : piliers, bancs, distributeur, panneau horaire -----
  const items = [];
  PILIERS.forEach((z, k) => {
    const {x0, x1, dz} = PILIER;
    const l = L(z);
    const yh = voute(Math.acos((VOUTE.xc - (x0 + x1) / 2) / VOUTE.a), z)[1] + 30;
    const els = [];
    els.push(boiteG(cam, x0, x1, yh, 60, z - dz, z + dz, [rgb([200, 200, 194], l, T), rgb([214, 216, 208], l, T), rgb([186, 190, 184], l, T)], 'h'));
    els.push(boiteG(cam, x0, x1, 60, SOL, z - dz, z + dz, [rgb([30, 98, 80], l), rgb([34, 110, 90], l), rgb([26, 84, 70], l)], 'b'));
    els.push(boiteG(cam, x0 - 2, x1 + 2, 40, 62, z - dz - 0.002, z + dz + 0.002, [rgb([230, 180, 60], l), rgb([230, 180, 60], l), rgb([200, 156, 50], l)], 'l'));
    if (Math.abs(z - HP.z) < 0.1) {
      // haut-parleur sur la face côté voies : il s'allume quand la voix parle
      els.push(boiteG(cam, x1, x1 + 70, HP.y - 110, HP.y + 110, z - 0.11, z + 0.11, ['#2a2c30', '#24262a', '#1c1e22'], 'hp'));
      for (let j = 0; j < 5; j++) els.push(ligne(cam, [x1 + 72, HP.y - 80 + j * 40, z - 0.08], [x1 + 72, HP.y - 80 + j * 40, z + 0.08], lw(cam, 10, [x1, HP.y, z]), '#0a0a0c', `hg${j}`));
      els.push(halo(cam, x1 + 80, HP.y + 85, z + 0.07, 60, 'ga-rouge', 0.4 + 0.6 * hp, 'hpd'));
      els.push(halo(cam, x1 + 120, HP.y, z, 650, 'ga-orange', 0.2 + 0.35 * hp, 'hph'));
      els.push(halo(cam, x1 + 300, SOL - 5, z, 900, 'ga-froid', 0.35, 'hps'));
    }
    if (k === 2) {
      // caméra de surveillance avec sa diode rouge
      els.push(boiteG(cam, x1, x1 + 160, -760, -690, z - 0.05, z + 0.05, ['#d8d8d4', '#c8c8c4', '#b8b8b4'], 'cc'));
      els.push(halo(cam, x1 + 165, -725, z, 50, 'ga-rouge', Math.floor(f / 20) % 2 ? 1 : 0.3, 'ccd'));
    }
    items.push({z, x: (x0 + x1) / 2, y: 0, el: <g key={`pi${k}`}>{els}</g>});
  });
  // bancs orange contre le mur
  [2, 8.2, 19.2, 25].forEach((z, k) => {
    const l = L(z);
    const els = [];
    els.push(boiteG(cam, MUR_Q + 40, MUR_Q + 220, 300, SOL, z - 0.7, z + 0.7, ['#1a1c1e', '#222426', '#16181a'], 'pied'));
    for (let j = 0; j < 4; j++) {
      const za = z - 0.7 + j * 0.35 + 0.02;
      els.push(boiteG(cam, MUR_Q + 20, MUR_Q + 300, 250, 290, za, za + 0.31, [rgb([236, 100, 42], l), rgb([210, 84, 34], l), rgb([190, 72, 30], l)], `s${j}`));
      els.push(boiteG(cam, MUR_Q + 10, MUR_Q + 50, 40, 250, za, za + 0.31, [rgb([236, 100, 42], l), rgb([210, 84, 34], l), rgb([220, 92, 38], l)], `d${j}`));
    }
    items.push({z, x: MUR_Q + 160, y: 300, el: <g key={`bc${k}`}>{els}</g>});
  });
  // distributeur de boissons qui brille
  {
    const z = 12;
    const els = [];
    els.push(boiteG(cam, MUR_Q + 10, MUR_Q + 330, -360, SOL, z - 0.42, z + 0.42, ['#1a2a3a', '#20303e', '#1a2a3a'], 'c'));
    els.push(plaque(cam, [MUR_Q + 332, -320, z - 0.36], [0, 0, 1], [0, 1, 0], 720, 600,
      <g>
        <rect width="720" height="600" fill="#cfefff" />
        {[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4].map((c) => <rect key={`${r}${c}`} x={30 + c * 135} y={30 + r * 140} width="90" height="110" rx="14" fill={['#e8302a', '#2a8ae8', '#2ac84a', '#ffb02a', '#a83ae8'][(r + c) % 5]} />))}
      </g>, 'vit'));
    els.push(quad(cam, [[MUR_Q + 332, 300, z - 0.36], [MUR_Q + 332, 300, z + 0.36], [MUR_Q + 332, 380, z + 0.36], [MUR_Q + 332, 380, z - 0.36]], '#0a0a0a', 'trappe'));
    els.push(halo(cam, MUR_Q + 380, 0, z, 1100, 'ga-froid', 0.5, 'dh'));
    els.push(tache(cam, MUR_Q + 600, SOL - 3, z, 500, 0.6, 'ga-froid', 0.7, 'ds'));
    items.push({z, x: MUR_Q + 170, y: 0, el: <g key="distri">{els}</g>});
  }
  // panneau horaire suspendu, LED orange
  {
    const {x0, x1, y0, y1, z} = HORAIRE;
    const els = [];
    [x0 + 60, x1 - 60].forEach((x, j) => els.push(ligne(cam, [x, y0, z], [x, voute(Math.acos((VOUTE.xc - x) / VOUTE.a), z)[1], z], lw(cam, 12, [x, y0, z]), '#2a2c2e', `ti${j}`)));
    els.push(boiteG(cam, x0, x1, y0, y1, z - 0.06, z + 0.06, ['#141618', '#141618', '#101214', '#101214'], 'b'));
    const ecran = (
      <g>
        <rect width="560" height="170" fill="#050505" />
        <text x="280" y="58" textAnchor="middle" fontFamily="'DejaVu Sans Mono', monospace" fontWeight="700" fontSize="44" fill="#ffa21a">PROCHAIN TRAIN</text>
        <text x="280" y="150" textAnchor="middle" fontFamily="'DejaVu Sans Mono', monospace" fontWeight="700" fontSize="86" fill="#ffb43a" opacity={gresille(f, 'hor', 0.05, 0.3)}>{horaire}</text>
        {[...Array(28)].map((_, k) => <line key={k} x1="0" y1={k * 6.2} x2="560" y2={k * 6.2} stroke="#000" strokeWidth="2" opacity="0.5" />)}
      </g>
    );
    if (cam.z < z) els.push(plaque(cam, [x0 + 20, y0 + 20, z - 0.062], [1, 0, 0], [0, 1, 0], 560, 170, ecran, 'e1'));
    else els.push(plaque(cam, [x1 - 20, y0 + 20, z + 0.062], [-1, 0, 0], [0, 1, 0], 560, 170, ecran, 'e2'));
    els.push(halo(cam, (x0 + x1) / 2, (y0 + y1) / 2, cam.z < z ? z - 0.08 : z + 0.08, 900, 'ga-orange', 0.4, 'hh'));
    items.push({z, x: (x0 + x1) / 2, y: (y0 + y1) / 2, el: <g key="horaire">{els}</g>});
  }
  return {fond: <g>{fond}</g>, items, brume: null, L};
};

// ===================== la rame =====================
// tete : Z de l'avant (le train roule vers +Z). portes 0 → 1. lumiere : éclairage intérieur. phares 0 → 1, feux (rouges arrière) 0 → 1.
// fantome : vieux train sale, lumière verdâtre, pas de numéro. dedans(cam, k) : rendu détaillé de l'intérieur de la voiture k par ses ouvertures.
const PORTES_U = [[0.55, 1.25], [2.3, 3.0]];
const FENETRES_U = [[0.08, 0.45], [1.35, 2.2], [3.1, 3.47]];
export const voitures = (tete, n = 4) => [...Array(n)].map((_, k) => {
  const z1 = tete - k * TRAIN.long - 0.04;
  const z0 = z1 - TRAIN.long + 0.08;
  return {k, z0, z1, c: (z0 + z1) / 2};
});
// position des portes (en Z) d'une voiture
export const portesDe = (v) => PORTES_U.map(([a, b]) => [v.z0 + a, v.z0 + b]);
export const rame = (cam, f, {tete, n = 4, portes = 0, lumiere = 1, phares = 0, feux = 0, fantome = false, dedans = null, silhouettes = true, bip = 0} = {}) => {
  const {x0, x1, toit, bas, jupe, plancher} = TRAIN;
  const caisse = fantome ? ['#8a9290', '#727a78', '#9aa2a0'] : ['#dfe4e8', '#c4cad0', '#eef2f4'];
  const bande = fantome ? '#2a4a40' : '#13a0a8';
  const interieur = fantome ? '#c8f0d8' : '#fff1c4';
  const items = [];
  voitures(tete, n).forEach((v) => {
    const {k, z0, z1} = v;
    const els = [];
    const ouv = []; // ouvertures (fenêtres + portes ouvertes), pour voir dedans
    const FEN_Y = [-560, -140];
    FENETRES_U.forEach(([a, b]) => ouv.push([[x0, FEN_Y[0], z0 + a], [x0, FEN_Y[0], z0 + b], [x0, FEN_Y[1], z0 + b], [x0, FEN_Y[1], z0 + a]]));
    PORTES_U.forEach(([a, b]) => ouv.push([[x0, -620, z0 + a], [x0, -620, z0 + b], [x0, plancher, z0 + b], [x0, plancher, z0 + a]]));
    if (cam.x < x0) {
      // l'intérieur, vu par les ouvertures
      if (dedans && dedans.k === k) {
        const id = `rd${k}`;
        els.push(
          <g key="dd">
            <defs>
              <clipPath id={id}>{ouv.map((o, j) => <polygon key={j} points={cam.poly(o)} />)}</clipPath>
            </defs>
            <g clipPath={`url(#${id})`}>{dedans.rendu}</g>
          </g>,
        );
      } else {
        ouv.forEach((o, j) => els.push(quad(cam, o, interieur, `in${j}`, 0.25 + 0.75 * lumiere)));
        if (silhouettes && lumiere > 0.2) {
          // têtes des passagers derrière les vitres
          const id = `rs${k}${fantome ? 'f' : ''}`;
          const tetes = [];
          for (let j = 0; j < 9; j++) {
            const z = z0 + 0.15 + (j / 9) * (TRAIN.long - 0.3) + 0.12 * random(`sz${k}${j}`);
            const x = 300 + 500 * random(`sx${k}${j}`);
            const y = -330 + 60 * random(`sy${k}${j}`);
            if (!cam.visible(z, x, y)) continue;
            const [px, py] = cam.proj(x, y, z);
            const s = cam.scale(z, x, y);
            tetes.push(<g key={j} opacity={0.8}><ellipse cx={px} cy={py} rx={75 * s} ry={88 * s} fill={fantome ? '#2b2140' : '#2a2a32'} /><rect x={px - 130 * s} y={py + 80 * s} width={260 * s} height={300 * s} rx={60 * s} fill={fantome ? '#c8584a' : '#3a3a48'} /></g>);
          }
          els.push(<g key="tt"><defs><clipPath id={id}>{ouv.map((o, j) => <polygon key={j} points={cam.poly(o)} />)}</clipPath></defs><g clipPath={`url(#${id})`}>{tetes}</g></g>);
        }
      }
      // la caisse, percée des ouvertures
      els.push(troue(cam, [[x0, toit + 40, z0], [x0, toit + 40, z1], [x0, bas, z1], [x0, bas, z0]], ouv, caisse[0], 'caisse'));
      els.push(quad(cam, [[x0 - 1, bas, z0], [x0 - 1, bas, z1], [x0 - 1, jupe, z1], [x0 - 1, jupe, z0]], '#16181a', 'jupe'));
      // bandes de couleur sous les fenêtres (interrompues aux portes)
      const seg = [[0, PORTES_U[0][0]], [PORTES_U[0][1], PORTES_U[1][0]], [PORTES_U[1][1], TRAIN.long - 0.08]];
      seg.forEach(([a, b], j) => {
        els.push(quad(cam, [[x0 - 2, -60, z0 + a], [x0 - 2, -60, z0 + b], [x0 - 2, 10, z0 + b], [x0 - 2, 10, z0 + a]], bande, `ba${j}`));
        els.push(quad(cam, [[x0 - 2, 30, z0 + a], [x0 - 2, 30, z0 + b], [x0 - 2, 52, z0 + b], [x0 - 2, 52, z0 + a]], fantome ? '#4a2a20' : '#e8302a', `bb${j}`));
      });
      // crasse du train fantôme
      if (fantome) for (let j = 0; j < 6; j++) els.push(quad(cam, [[x0 - 3, 100 + 40 * j, z0 + 0.1], [x0 - 3, 100 + 40 * j, z1 - 0.1], [x0 - 3, 140 + 40 * j, z1 - 0.1], [x0 - 3, 140 + 40 * j, z0 + 0.1]], '#3a3020', `cr${j}`, 0.15 + 0.05 * j));
      // les vantaux des portes (ils glissent vers l'extérieur)
      PORTES_U.forEach(([a, b], j) => {
        const m = (a + b) / 2;
        const w = (b - a) / 2;
        const d = portes * (w - 0.03);
        [[a - d, m - d], [m + d, b + d]].forEach(([u0, u1], q) => {
          const za = z0 + u0;
          const zb = z0 + u1;
          els.push(quad(cam, [[x0 - 4, -620, za], [x0 - 4, -620, zb], [x0 - 4, plancher, zb], [x0 - 4, plancher, za]], caisse[2], `v${j}${q}`, 1, {stroke: '#5a6066', strokeWidth: 2}));
          els.push(quad(cam, [[x0 - 5, -540, za + 0.06], [x0 - 5, -540, zb - 0.06], [x0 - 5, -160, zb - 0.06], [x0 - 5, -160, za + 0.06]], interieur, `vf${j}${q}`, 0.25 + 0.6 * lumiere));
          els.push(quad(cam, [[x0 - 5, -60, za], [x0 - 5, -60, zb], [x0 - 5, 10, zb], [x0 - 5, 10, za]], bande, `vb${j}${q}`));
        });
        // voyant de porte (rouge qui clignote pendant la sonnerie)
        const vb = bip > 0 && Math.floor(f / 6) % 2 === 0;
        els.push(halo(cam, x0 - 8, -670, z0 + m, vb ? 300 : 70, vb ? 'ga-rouge' : 'ga-orange', vb ? 1 : 0.4, `vo${j}`));
      });
    }
    // le toit
    if (cam.y < toit) {
      els.push(quad(cam, [[x0 + 30, toit, z0], [x1 - 30, toit, z0], [x1 - 30, toit, z1], [x0 + 30, toit, z1]], fantome ? '#4a4a48' : '#8a9096', 'toit'));
      els.push(boiteG(cam, 380, 740, toit - 120, toit, z0 + 1.2, z1 - 1.2, ['#6a7076', '#5a6066', '#50565c'], 'clim'));
    }
    // l'autre flanc
    if (cam.x > x1) els.push(quad(cam, [[x1, toit + 40, z0], [x1, toit + 40, z1], [x1, jupe, z1], [x1, jupe, z0]], caisse[1], 'flanc2'));
    // bouts de voiture (soufflet sombre entre deux voitures)
    if (k > 0 && cam.z > z1) els.push(quad(cam, [[x0 + 60, toit + 80, z1], [x1 - 60, toit + 80, z1], [x1 - 60, bas, z1], [x0 + 60, bas, z1]], '#141618', 'b1'));
    if (k < n - 1 && cam.z < z0) els.push(quad(cam, [[x0 + 60, toit + 80, z0], [x1 - 60, toit + 80, z0], [x1 - 60, bas, z0], [x0 + 60, bas, z0]], '#141618', 'b0'));
    // la face avant (voiture de tête, vue de devant)
    if (k === 0 && cam.z > z1) {
      const Z = z1;
      els.push(quad(cam, [[x0, toit + 60, Z], [x1, toit + 60, Z], [x1, jupe, Z], [x0, jupe, Z]], caisse[1], 'av'));
      els.push(quad(cam, [[x0 + 90, -650, Z + 0.003], [x1 - 90, -650, Z + 0.003], [x1 - 90, -170, Z + 0.003], [x0 + 90, -170, Z + 0.003]], '#0a1216', 'pare'));
      els.push(quad(cam, [[x0 + 140, -640, Z + 0.004], [x0 + 300, -640, Z + 0.004], [x0 + 200, -180, Z + 0.004], [x0 + 140, -180, Z + 0.004]], '#ffffff', 'reflet', 0.08));
      // girouette (destination) : vide et noire sur le train fantôme
      els.push(quad(cam, [[360, -740, Z + 0.004], [760, -740, Z + 0.004], [760, -670, Z + 0.004], [360, -670, Z + 0.004]], '#050505', 'giro'));
      if (!fantome) els.push(plaque(cam, [380, -735, Z + 0.005], [1, 0, 0], [0, 1, 0], 360, 60, <text x="180" y="50" textAnchor="middle" fontFamily="'DejaVu Sans Mono', monospace" fontWeight="700" fontSize="48" fill="#ffb43a">TERMINUS</text>, 'dest'));
      els.push(quad(cam, [[x0, -60, Z + 0.003], [x1, -60, Z + 0.003], [x1, 10, Z + 0.003], [x0, 10, Z + 0.003]], bande, 'bav'));
      [x0 + 170, x1 - 170].forEach((x, j) => {
        els.push(halo(cam, x, 260, Z + 0.01, 110, 'ga-phare', 0.3 + 0.7 * phares, `pc${j}`));
        els.push(halo(cam, x, 260, Z + 0.05, 2600, 'ga-phare', 0.85 * phares, `ph${j}`));
      });
    }
    // feux rouges arrière (dernière voiture, vue de derrière)
    if (k === n - 1 && cam.z < z0) {
      const Z = z0;
      els.push(quad(cam, [[x0, toit + 60, Z], [x1, toit + 60, Z], [x1, jupe, Z], [x0, jupe, Z]], caisse[1], 'ar'));
      els.push(quad(cam, [[x0 + 90, -650, Z - 0.003], [x1 - 90, -650, Z - 0.003], [x1 - 90, -170, Z - 0.003], [x0 + 90, -170, Z - 0.003]], '#0a1216', 'parear'));
      els.push(quad(cam, [[x0, -60, Z - 0.003], [x1, -60, Z - 0.003], [x1, 10, Z - 0.003], [x0, 10, Z - 0.003]], bande, 'bar'));
      [x0 + 170, x1 - 170].forEach((x, j) => {
        els.push(halo(cam, x, 260, Z - 0.01, 90, 'ga-rouge', 0.3 + 0.7 * feux, `fc${j}`));
        els.push(halo(cam, x, 260, Z - 0.05, 700, 'ga-rouge', 0.6 * feux, `fh${j}`));
      });
    }
    items.push({z: v.c, x: (x0 + x1) / 2, y: 0, el: <g key={`vo${k}`}>{els}</g>});
  });
  // lumière qui sort des fenêtres sur le quai
  if (lumiere > 0.2 && cam.y < SOL) {
    voitures(tete, n).forEach((v) => {
      items.push({z: v.c, x: -300, y: SOL, el: tache(cam, -320, SOL - 4, v.c, 420, 1.6, fantome ? 'ga-vert' : 'ga-chaud', 0.3 * lumiere, `lq${v.k}`)});
    });
  }
  // faisceau des phares sur les rails, devant le train
  if (phares > 0) items.push({z: tete + 2, x: 560, y: FOSSE, el: tache(cam, 560, FOSSE - 40, tete + 2.5, 900, 2.6, 'ga-phare', 0.6 * phares, 'faisceau')});
  return items;
};

// ===================== l'intérieur d'une voiture =====================
// Voiture centrée en cz. Sol au niveau du quai, banquettes bleues contre le flanc opposé (X 1040), barres jaunes.
// passagers : [{x, z, id, ...props du Perso}]
export const WAGON = {x0: 80, x1: 1040, plaf: -700, sol: 412};
export const wagon = (cam, f, {cz, lumiere = 1, passagers = [], fantome = true, flick = 1} = {}) => {
  const {x0, x1, plaf, sol} = WAGON;
  const za = cz - TRAIN.long / 2 + 0.06;
  const zb = cz + TRAIN.long / 2 - 0.06;
  const k = lumiere * flick;
  const T = fantome ? [0.86, 1.04, 0.92] : [1.05, 1, 0.9];
  const fond = [];
  fond.push(<rect key="noir" width="1080" height="1920" fill="#050605" />);
  fond.push(quad(cam, [[x0, plaf, za], [x1, plaf, za], [x1, plaf, zb], [x0, plaf, zb]], rgb([214, 220, 210], k, T), 'plaf'));
  fond.push(quad(cam, [[440, plaf + 2, za + 0.1], [680, plaf + 2, za + 0.1], [680, plaf + 2, zb - 0.1], [440, plaf + 2, zb - 0.1]], fantome ? '#e8fff0' : '#fffbe8', 'tube', 0.5 + 0.5 * k));
  fond.push(quad(cam, [[x0, sol, za], [x1, sol, za], [x1, sol, zb], [x0, sol, zb]], rgb([70, 82, 94], k, T), 'sol'));
  for (let z = za; z < zb; z += 0.25) fond.push(ligne(cam, [x0, sol - 1, z], [x1, sol - 1, z], lw(cam, 3, [560, sol, z]), '#2a323a', `sj${z}`, 0.5));
  // flanc opposé : bas, fenêtres sur le tunnel noir (reflets), haut
  fond.push(quad(cam, [[x1, plaf, za], [x1, -560, za], [x1, -560, zb], [x1, plaf, zb]], rgb([200, 206, 198], k, T), 'fh'));
  fond.push(quad(cam, [[x1, -560, za], [x1, -140, za], [x1, -140, zb], [x1, -560, zb]], '#0b1014', 'fv'));
  for (let j = 0; j < 4; j++) fond.push(quad(cam, [[x1 - 2, -560, za + 0.9 * j + 0.1], [x1 - 2, -560, za + 0.9 * j + 0.28], [x1 - 2, -140, za + 0.9 * j + 0.18], [x1 - 2, -140, za + 0.9 * j]], '#ffffff', `rf${j}`, 0.07));
  fond.push(quad(cam, [[x1, -140, za], [x1, sol, za], [x1, sol, zb], [x1, -140, zb]], rgb([186, 192, 184], k, T), 'fb'));
  // bouts de la voiture avec la porte d'intercirculation
  [za, zb].forEach((z, j) => {
    fond.push(quad(cam, [[x0, plaf, z], [x1, plaf, z], [x1, sol, z], [x0, sol, z]], rgb([196, 202, 194], k * 0.9, T), `bt${j}`));
    fond.push(quad(cam, [[440, -520, z], [680, -520, z], [680, sol, z], [440, sol, z]], rgb([150, 158, 150], k, T), `pi${j}`));
    fond.push(quad(cam, [[470, -480, z], [650, -480, z], [650, -200, z], [470, -200, z]], '#0b1014', `pv${j}`));
  });
  // pubs au-dessus des fenêtres
  for (let j = 0; j < 4; j++) {
    const z = za + 0.25 + j * 0.85;
    fond.push(quad(cam, [[x1 - 3, -670, z], [x1 - 3, -670, z + 0.7], [x1 - 3, -590, z + 0.7], [x1 - 3, -590, z]], ['#e8b020', '#2a6ad8', '#d82a5a', '#2aa84a'][j], `pb${j}`, 0.4 + 0.5 * k));
  }
  const items = [];
  // banquettes contre le flanc opposé
  for (let j = 0; j < 3; j++) {
    const z = za + 0.35 + j * 1.1;
    const els = [];
    els.push(boiteG(cam, 800, x1, 210, 260, z, z + 0.9, [rgb([42, 90, 170], k), rgb([34, 74, 150], k), rgb([30, 66, 136], k)], 's'));
    els.push(boiteG(cam, x1 - 50, x1, -150, 210, z, z + 0.9, [rgb([42, 90, 170], k), rgb([38, 84, 160], k), rgb([34, 74, 150], k)], 'd'));
    els.push(boiteG(cam, 820, x1, 260, sol, z + 0.05, z + 0.85, ['#2a2c30', '#2a2c30', '#222428'], 'p'));
    items.push({z: z + 0.45, x: 920, y: 200, el: <g key={`bq${j}`}>{els}</g>});
  }
  // barres verticales jaunes
  [[380, za + 0.9], [380, zb - 0.9], [700, cz], [380, cz]].forEach(([x, z], j) => {
    items.push({z, x, y: -100, el: <g key={`br${j}`}>{ligne(cam, [x, plaf, z], [x, sol, z], lw(cam, 26, [x, -100, z]), '#e8c020', 'b')}{ligne(cam, [x - 6, plaf, z], [x - 6, sol, z], lw(cam, 7, [x, -100, z]), '#fff4a0', 'r', 0.6)}</g>});
  });
  // barre de maintien au plafond
  items.push({z: cz, x: 380, y: plaf + 60, el: ligne(cam, [380, plaf + 60, za + 0.2], [380, plaf + 60, zb - 0.2], lw(cam, 18, [380, plaf, cz]), '#c8a018', 'bmh')});
  // les passagers
  passagers.forEach((p) => {
    const {x, z, id, ...pose} = p;
    items.push({z, x, el: <Perso cam={cam} key={id} id={id} x={x} z={z} y={sol} lum={0.85 * k + 0.15} teinte={T} ombre={0.35} {...pose} />});
  });
  return {fond: <g>{fond}</g>, items, brume: null};
};

// ===================== l'escalator vers la sortie =====================
// Deux escalators en pente (30°) entre le palier du bas (Z −1 → 1.5, Y = SOL) et le palier du haut (Z 9.5 → 14, Y = HAUT).
// Galerie X ±1050, plafond 1500 au-dessus des marches. Séparation centrale avec des lampadaires (globes chauds).
// La grille de sortie (treillis) est en Z = GRILLE_Z, sur le palier du haut ; derrière, le hall de sortie et sa lueur orange.
export const PENTE = 577;
export const ESC = {z0: 1.5, z1: 9.5, x: 1050, plaf: 1500};
export const HAUT = SOL - (ESC.z1 - ESC.z0) * PENTE;
export const GRILLE_Z = 11.4;
export const solEsc = (z) => SOL - Math.max(0, Math.min(ESC.z1 - ESC.z0, z - ESC.z0)) * PENTE;
export const escalators = (cam, f, {grille = 0, lumiere = 1, marche = 1} = {}) => {
  const X = ESC.x;
  const L = (z) => lumiere * (0.75 + 0.25 * Math.sin(z * 1.3));
  const T = [1.05, 0.96, 0.86];
  const fond = [];
  fond.push(<DefsGare key="defs" cam={cam} />);
  fond.push(<rect key="noir" width="1080" height="1920" fill="#050403" />);
  const pas = 0.5;
  const ZS = [];
  for (let z = -1; z < 14; z += pas) ZS.push(z);
  // le hall de sortie derrière la grille (fond orange), puis son mur
  fond.push(quad(cam, [[-X, HAUT - ESC.plaf, 14], [X, HAUT - ESC.plaf, 14], [X, HAUT, 14], [-X, HAUT, 14]], '#3a2410', 'hallf'));
  fond.push(halo(cam, 0, HAUT - 500, 13.9, 2200, 'ga-orange', 0.55, 'hallh'));
  fond.push(plaque(cam, [-500, HAUT - 1250, 13.98], [1, 0, 0], [0, 1, 0], 1000, 140,
    <g>
      <rect width="1000" height="140" rx="16" fill="#0a7a3a" />
      <text x="500" y="105" textAnchor="middle" fontFamily="'DejaVu Sans', Arial" fontWeight="900" fontSize="100" fill="#eafff0">SORTIE</text>
    </g>, 'sortie'));
  fond.push(halo(cam, 0, HAUT - 1180, 13.95, 900, 'ga-vert', 0.6, 'sortieh'));
  ZS.forEach((z) => {
    const ya = solEsc(z);
    const yb = solEsc(z + pas);
    const l = L(z);
    const plafA = ya - ESC.plaf;
    const plafB = yb - ESC.plaf;
    // plafond, murs, sol
    fond.push(quad(cam, [[-X, plafA, z], [X, plafA, z], [X, plafB, z + pas + 0.01], [-X, plafB, z + pas + 0.01]], rgb([196, 186, 168], l * 0.8, T), `pf${z}`));
    [-1, 1].forEach((s) => {
      fond.push(quad(cam, [[s * X, plafA, z], [s * X, ya - 300, z], [s * X, yb - 300, z + pas + 0.01], [s * X, plafB, z + pas + 0.01]], rgb([214, 206, 188], l, T), `mu${s}${z}`));
      fond.push(quad(cam, [[s * X, ya - 300, z], [s * X, ya, z], [s * X, yb, z + pas + 0.01], [s * X, yb - 300, z + pas + 0.01]], rgb([150, 52, 40], l, T), `mb${s}${z}`));
    });
    fond.push(quad(cam, [[-X, ya, z], [X, ya, z], [X, yb, z + pas + 0.01], [-X, yb, z + pas + 0.01]], rgb([150, 138, 122], l), `so${z}`));
  });
  // paliers : dalles, plaques peignes brillantes au bout des escalators, reflets chauds des néons
  [[-1, ESC.z0], [ESC.z1, 14]].forEach(([za, zb], j) => {
    const y = solEsc(za) - 1;
    for (let x = -X + 262; x < X; x += 262) fond.push(ligne(cam, [x, y, za], [x, y, zb], lw(cam, 5, [x, y, (za + zb) / 2]), '#5a5048', `px${j}${x}`, 0.6));
    for (let z = za; z <= zb; z += 0.26) fond.push(ligne(cam, [-X, y, z], [X, y, z], lw(cam, 5, [0, y, z]), '#5a5048', `pz${j}${z}`, 0.6));
    [[-940, -220], [220, 940]].forEach(([xa, xb], q) => {
      const zc = j === 0 ? ESC.z0 - 0.25 : ESC.z1;
      fond.push(quad(cam, [[xa, y - 1, zc], [xb, y - 1, zc], [xb, y - 1, zc + 0.25], [xa, y - 1, zc + 0.25]], '#b8bcc4', `pg${j}${q}`, 0.9));
      fond.push(quad(cam, [[xa, y - 2, zc + (j === 0 ? 0 : 0.22)], [xb, y - 2, zc + (j === 0 ? 0 : 0.22)], [xb, y - 2, zc + (j === 0 ? 0.03 : 0.25)], [xa, y - 2, zc + (j === 0 ? 0.03 : 0.25)]], '#ffd84a', `pj${j}${q}`, 0.9));
    });
    for (let z = za + 0.6; z < zb; z += 1.6) fond.push(tache(cam, 0, y - 2, z, 900, 0.9, 'ga-chaud', 0.55 * lumiere, `rf${j}${z}`));
    fond.push(tache(cam, -700, y - 2, (za + zb) / 2, 380, 0.5, 'ga-froid', 0.4, `fl${j}`));
  });
  // joints du carrelage, parallèles à la pente
  [-1, 1].forEach((s) => {
    for (let h = 360; h < ESC.plaf; h += 110) fond.push(ligne(cam, [s * (X - 1), SOL - h, ESC.z0], [s * (X - 1), HAUT - h, ESC.z1], lw(cam, 4, [s * X, solEsc(cam.z) - h, cam.z + 2]), '#7a7468', `jt${s}${h}`, 0.35));
  });
  // affiches encadrées le long des murs (inclinées comme la pente)
  [2.6, 4.6, 6.6, 8.6].forEach((z, k) => {
    [-1, 1].forEach((s) => {
      const y = solEsc(z) - 1050;
      const ax = s < 0 ? [0, -0.5, 0.866] : [0, 0.5, -0.866];
      const P0 = s < 0 ? [s * (X - 3), y, z] : [s * (X - 3), y - 0.5 * 1100, z + 0.866 * 1.1];
      fond.push(plaque(cam, P0, ax, [0, 1, 0], 1100, 640, <g><rect width="1100" height="640" fill="#1a1a1a" />{AFFICHES[(k * 2 + (s > 0 ? 1 : 0)) % AFFICHES.length](1060, 600)}</g>, `af${s}${k}`));
      fond.push(halo(cam, s * (X - 60), y + 320, z + 0.5, 900, 'ga-pub', 0.35 * lumiere, `afh${s}${k}`));
    });
  });
  // néons au plafond (tube central)
  for (let z = -0.5; z < 13.5; z += 1.6) {
    const y = solEsc(z) - ESC.plaf + 15;
    const o = lumiere * gresille(f, `en${z}`, 0.06, 0.3);
    if (Math.abs(z - cam.z) < 1.0 && cam.y < y + 600) continue;
    fond.push(ligne(cam, [0, y, z - 0.6], [0, solEsc(z + 0.6) - ESC.plaf + 15, z + 0.6], lw(cam, 40, [0, y, z]), o > 0.5 ? '#fff6e0' : '#4a4038', `ne${z}`));
    fond.push(halo(cam, 0, y + 80, z, 1200, 'ga-chaud', 0.35 * o, `neh${z}`));
  }
  fond.push(<rect key="brume" width="1080" height="1920" fill="url(#ga-brume)" opacity="0.8" />);

  const items = [];
  // les deux escalators : marches qui défilent, balustrades, mains courantes ; séparation centrale avec lampadaires
  ZS.forEach((z) => {
    if (z < ESC.z0 - 1 || z > ESC.z1 + 1) return;
    const els = [];
    const ya = solEsc(z);
    const yb = solEsc(z + pas);
    [[-940, -220, -1], [220, 940, 1]].forEach(([xa, xb, sens], q) => {
      els.push(quad(cam, [[xa, ya - 2, z], [xb, ya - 2, z], [xb, yb - 2, z + pas + 0.01], [xa, yb - 2, z + pas + 0.01]], '#3a3c40', `m${q}`));
      // nez de marches (lignes qui défilent)
      for (let j = 0; j < 4; j++) {
        const u = (((j / 4 + ((f * 0.012 * marche * sens) % 1) + 1) % 1) * pas);
        const zz = z + u;
        const y = solEsc(zz) - 3;
        els.push(ligne(cam, [xa, y, zz], [xb, y, zz], lw(cam, 6, [0, y, zz]), '#9aa0a8', `n${q}${j}`, 0.8));
      }
      // balustrades (panneaux) et mains courantes noires
      [xa, xb].forEach((x, r) => {
        const dx = r === 0 ? -40 : 40;
        els.push(quad(cam, [[x + dx / 2, ya - 260, z], [x + dx / 2, ya, z], [x + dx / 2, yb, z + pas + 0.01], [x + dx / 2, yb - 260, z + pas + 0.01]], '#8a8c90', `p${q}${r}`, 0.9));
        els.push(ligne(cam, [x + dx / 2, ya - 280, z], [x + dx / 2, yb - 280, z + pas + 0.01], lw(cam, 36, [x, ya - 280, z]), '#101012', `c${q}${r}`));
      });
    });
    // séparation centrale (dessus plat)
    els.push(quad(cam, [[-180, ya - 270, z], [180, ya - 270, z], [180, yb - 270, z + pas + 0.01], [-180, yb - 270, z + pas + 0.01]], '#6a6258', 'sep'));
    items.push({z: z + pas / 2, x: 0, y: ya, el: <g key={`es${z}`}>{els}</g>});
  });
  // les lampadaires de la séparation (globes chauds)
  for (let z = ESC.z0 + 0.3; z < ESC.z1; z += 0.9) {
    const y = solEsc(z) - 270;
    const o = lumiere * gresille(f, `lp${z}`, 0.05, 0.4);
    items.push({z, x: 0, y: y - 250, el: <g key={`lp${z}`}>
      {ligne(cam, [0, y, z], [0, y - 230, z], lw(cam, 18, [0, y, z]), '#2a2420', 'pied')}
      {halo(cam, 0, y - 260, z, 70, 'ga-chaud', 0.6 + 0.4 * o, 'g')}
      {halo(cam, 0, y - 260, z, 700, 'ga-chaud', 0.45 * o, 'h')}
    </g>});
  }
  // la grille de sortie (treillis en losanges) : elle descend depuis le plafond
  {
    const yh = HAUT - ESC.plaf;
    const h = ESC.plaf * Math.max(0, Math.min(1, grille));
    const els = [];
    els.push(boiteG(cam, -X, X, yh, yh + 120, GRILLE_Z - 0.12, GRILLE_Z + 0.12, ['#2a2a2c', '#3a3a3e', '#2a2a2c', '#202022'], 'caisson'));
    if (h > 10) {
      const W = 2 * X;
      const losanges = (
        <g>
          {[...Array(Math.ceil(W / 120) + 1)].map((_, j) => (
            <g key={j}>
              <line x1={j * 120} y1="0" x2={j * 120 + h * 0.4} y2={h} stroke="#8a8e94" strokeWidth="12" />
              <line x1={j * 120} y1="0" x2={j * 120 - h * 0.4} y2={h} stroke="#6a6e74" strokeWidth="12" />
            </g>
          ))}
          <rect x="0" y={h - 50} width={W} height="50" fill="#4a4c50" />
        </g>
      );
      if (cam.z < GRILLE_Z) els.push(plaque(cam, [-X, yh + 120, GRILLE_Z], [1, 0, 0], [0, 1, 0], W, h, losanges, 'gr'));
      else els.push(plaque(cam, [X, yh + 120, GRILLE_Z], [-1, 0, 0], [0, 1, 0], W, h, losanges, 'gr'));
    }
    items.push({z: GRILLE_Z, x: 0, y: yh + h / 2, el: <g key="grille">{els}</g>});
  }
  return {fond: <g>{fond}</g>, items, brume: null};
};
