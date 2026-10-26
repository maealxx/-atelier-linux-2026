import {random} from 'remotion';
import {boite} from './Appart';
import {Bonhomme} from './Bonhomme';
import {plaque} from './Lycee';
import {couleurDe, RoueDessin} from './Roulette';
import {SOL} from './Rue';

// ===================== Le casino (« Et si tu misais 1 000 € ? ») =====================
// Salle X ±4500, Z −6 → 16, sol à SOL (432), plafond à Y −1700. Lumière rouge, lustres, machines à sous.
// La table de roulette est au centre : plateau en Y = TABLE_Y, de X −1250 à 1250 et de Z 4.45 à 5.55.
// La roue 3D (RoueDessin de Roulette.jsx) est posée à gauche du plateau, le tapis de mise à droite.
export const TABLE_Y = 90;
export const TABLE = {x0: -1250, x1: 1250, z0: 4.45, z1: 5.55};
export const ROUE = {x: -760, z: 5.0, ech: 0.36};
export const PLAF_C = -1700;
export const MUR = {x: 4500, z0: -6, z1: 16};
export const ROUGE_CASE = {x: 359, z: 4.675}; // la case « ROUGE » du tapis, où il mise
export const JOUEUR = {x: 359, z: 4.05};
export const CROUPIER = {x: -230, z: 5.95};
export const TABLEAU = {x0: -1530, x1: -1170, y0: -980, y1: -380, z: 5.72}; // panneau des derniers numéros

const ligne = (cam, A, B, w, col, key, op = 1) => {
  const r = cam.seg(A, B);
  return r ? <line key={key} x1={r[0][0]} y1={r[0][1]} x2={r[1][0]} y2={r[1][1]} stroke={col} strokeWidth={w} opacity={op} strokeLinecap="round" /> : null;
};
const quad = (cam, pts, fill, key, op = 1) => {
  const p = cam.poly(pts);
  return p ? <polygon key={key} points={p} fill={fill} opacity={op} /> : null;
};
const rz = (cam, z, x0, x1, y0, y1, fill, key, op) => quad(cam, [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], fill, key, op);
const rx = (cam, x, z0, z1, y0, y1, fill, key, op) => quad(cam, [[x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0]], fill, key, op);
const ry = (cam, y, x0, x1, z0, z1, fill, key, op) => quad(cam, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], fill, key, op);
const billboard = (cam, x, y, z, contenu, key, taille = 1) => {
  if (!cam.visible(z, x, y)) return null;
  const [px, py] = cam.proj(x, y, z);
  return (
    <g key={key} transform={`translate(${px} ${py}) scale(${cam.scale(z, x, y) * taille})`}>
      {contenu}
    </g>
  );
};
const halo = (cam, x, y, z, r, grad, op, key) => {
  if (!cam.visible(z, x, y) || op <= 0) return null;
  const [px, py] = cam.proj(x, y, z);
  return <circle key={key} cx={px} cy={py} r={r * cam.scale(z, x, y)} fill={`url(#${grad})`} opacity={op} />;
};
// lumière qui grésille (par paquets de 3 images)
export const gresille = (f, graine, taux = 0.1, bas = 0.3) => (random(`${graine}${Math.floor(f / 3)}`) < taux ? bas : 1);
// un disque horizontal (jeton, plateau…) en polygone
const disque = (cam, x, y, z, r, n = 20) => cam.poly([...Array(n)].map((_, i) => [x + Math.cos((i / n) * 6.283) * r, y, z + (Math.sin((i / n) * 6.283) * r) / 1000]));

// ----- les dégradés partagés -----
const Defs = ({cam, rouge}) => (
  <defs>
    <radialGradient id="ca-chaud">
      <stop offset="0" stopColor="#ffe2a8" stopOpacity="0.95" />
      <stop offset="0.25" stopColor="#ffb860" stopOpacity="0.45" />
      <stop offset="1" stopColor="#ff7a30" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="ca-rouge">
      <stop offset="0" stopColor="#ff5a5a" stopOpacity="0.9" />
      <stop offset="0.3" stopColor="#ff2a3a" stopOpacity="0.4" />
      <stop offset="1" stopColor="#ff0020" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="ca-neon">
      <stop offset="0" stopColor="#ff3a6a" stopOpacity="0.55" />
      <stop offset="1" stopColor="#ff1a4a" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="ca-lampe" cx="50%" cy="50%" r="50%">
      <stop offset="0" stopColor="#fff0c0" stopOpacity="0.55" />
      <stop offset="0.5" stopColor="#ffc870" stopOpacity="0.22" />
      <stop offset="1" stopColor="#ffb050" stopOpacity="0" />
    </radialGradient>
    <linearGradient id="ca-tapis" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#0f5a32" />
      <stop offset="1" stopColor="#0a4426" />
    </linearGradient>
    <radialGradient id="ca-brume" cx={cam.fuite[0]} cy={cam.fuite[1]} r="1000" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor={rouge} stopOpacity="0.32" />
      <stop offset="0.45" stopColor={rouge} stopOpacity="0.14" />
      <stop offset="1" stopColor={rouge} stopOpacity="0" />
    </radialGradient>
    <filter id="ca-flou">
      <feGaussianBlur stdDeviation="10" />
    </filter>
  </defs>
);

// ----- un lustre (billboard), avec ses pampilles -----
const Lustre = ({k}) => (
  <g>
    <line x1="0" y1="-600" x2="0" y2="-120" stroke="#8a6a2a" strokeWidth="14" />
    <ellipse cx="0" cy="0" rx="330" ry="70" fill="none" stroke="#d8b050" strokeWidth="22" />
    <ellipse cx="0" cy="-60" rx="200" ry="40" fill="none" stroke="#e8c868" strokeWidth="16" />
    {[...Array(11)].map((_, i) => {
      const a = (i / 11) * 6.283;
      const x = Math.cos(a) * 330;
      const y = Math.sin(a) * 70;
      return (
        <g key={i}>
          <line x1={x} y1={y} x2={x} y2={y + 90 + (i % 3) * 30} stroke="#fff4dc" strokeWidth="5" opacity="0.7" />
          <circle cx={x} cy={y + 100 + (i % 3) * 30} r="14" fill="#fff8e8" opacity="0.9" />
          <rect x={x - 9} y={y - 70} width="18" height="60" rx="5" fill="#fff2d0" />
          <circle cx={x} cy={y - 82} r="13" fill="#ffd27a" />
        </g>
      );
    })}
    <circle cx="0" cy="40" r="40" fill="#e8c868" />
    <path d="M-60,40 L0,190 L60,40 Z" fill="#fff4dc" opacity="0.5" />
  </g>
);

// ----- une machine à sous (boîte + écran + rouleaux + lumière du haut) -----
const machine = (cam, f, x, z0, z1, k, sens) => {
  const els = [];
  const cols = ['#ff2a5a', '#2ac8ff', '#ffc82a', '#9a4aff', '#2aff8a'];
  const c = cols[(k + Math.floor(f / 14)) % cols.length];
  const on = gresille(f, `ms${k}`, 0.08, 0.45);
  els.push(boite(cam, x - 260, x + 260, -620, SOL, z0, z1, ['#2a1018', '#3a1420', '#24101a'], `mb${k}`));
  const zf = sens < 0 ? z0 - 0.005 : z1 + 0.005;
  // écran (rouleaux)
  els.push(
    plaque(cam, [sens < 0 ? x - 200 : x + 200, -520, zf], [sens < 0 ? 1 : -1, 0, 0], [0, 1, 0], 400, 330,
      <g>
        <rect width="400" height="330" rx="20" fill="#08060a" />
        <rect x="14" y="14" width="372" height="190" rx="12" fill={c} opacity={0.35 * on} />
        {[0, 1, 2].map((j) => (
          <g key={j}>
            <rect x={28 + j * 122} y="28" width="104" height="162" rx="10" fill="#f4eee0" opacity={0.85 * on} />
            <text x={80 + j * 122} y="135" fontSize="90" textAnchor="middle" fontWeight="900" fontFamily="'DejaVu Sans', Arial" fill={['#e0202c', '#f0a020', '#2a6ad8'][(k + j + Math.floor(f / 9)) % 3]}>
              {['7', '♦', '★', 'BAR'.slice(0, 1)][(k * 3 + j + Math.floor(f / 9)) % 4]}
            </text>
          </g>
        ))}
        <rect x="40" y="230" width="320" height="70" rx="12" fill={c} opacity={0.75 * on} />
      </g>,
      `me${k}`),
  );
  els.push(halo(cam, x, -560, zf, 520, 'ca-neon', 0.35 * on, `mh${k}`));
  // lampe ronde sur le dessus
  els.push(billboard(cam, x, -660, (z0 + z1) / 2, <circle r="70" fill={c} opacity={0.9 * on} />, `ml${k}`));
  return {z: (z0 + z1) / 2, x, y: -100, el: <g key={`m${k}`}>{els}</g>};
};

// ----- un pilier doré -----
const pilier = (cam, x, z, k) => ({
  z, x, y: -600,
  el: (
    <g key={`pi${k}`}>
      {boite(cam, x - 170, x + 170, PLAF_C, SOL, z - 0.17, z + 0.17, ['#3a0c14', '#5a1420', '#46101a'], 'p')}
      {boite(cam, x - 210, x + 210, PLAF_C + 90, PLAF_C + 200, z - 0.21, z + 0.21, ['#c8a040', '#d8b450', '#a8842e'], 'c')}
      {boite(cam, x - 210, x + 210, SOL - 120, SOL, z - 0.21, z + 0.21, ['#c8a040', '#b8943a', '#987428'], 'b')}
      {[-1, 1].map((s) => ligne(cam, [x + s * 120, PLAF_C + 220, z - 0.172], [x + s * 120, SOL - 140, z - 0.172], 10, '#d8b050', `l${s}`, 0.8))}
    </g>
  ),
});

// ----- une table voisine (cartes ou roulette), avec ses joueurs -----
const tableVoisine = (cam, f, x, z, k) => {
  const els = [];
  els.push(boite(cam, x - 900, x + 900, TABLE_Y - 20, SOL, z - 0.5, z + 0.5, ['#5a2a10', '#3a1a0a', '#2a1206'], `tv${k}`));
  els.push(ry(cam, TABLE_Y - 21, x - 820, x + 820, z - 0.42, z + 0.42, '#0e5a32', `tt${k}`));
  els.push(boite(cam, x - 500, x + 500, -1150, -1080, z - 0.2, z + 0.2, ['#0c2a1a', '#123a24', '#0c2a1a'], `tl${k}`));
  els.push(halo(cam, x, TABLE_Y - 30, z, 1300, 'ca-lampe', 0.8 * gresille(f, `tl${k}`, 0.05, 0.6), `th${k}`));
  return {z, x, y: 0, el: <g key={`tvg${k}`}>{els}</g>};
};

// ----- la salle -----
export const casino = (cam, f, {lustres = 1, rouge = '#ff1a2a', neon = 1, sans = []} = {}) => {
  const fond = [];
  const X = MUR.x;
  const {z0: Z0, z1: Z1} = MUR;
  fond.push(<Defs key="defs" cam={cam} rouge={rouge} />);
  fond.push(<rect key="noir" width="1080" height="1920" fill="#0a0204" />);
  // plafond à caissons dorés
  fond.push(ry(cam, PLAF_C, -X, X, Z0, Z1, '#160408', 'plaf'));
  for (let x = -X; x <= X; x += 900) fond.push(ligne(cam, [x, PLAF_C, Z0], [x, PLAF_C, Z1], 8, '#8a6424', `px${x}`, 0.28));
  for (let z = Z0; z <= Z1; z += 1.5) fond.push(ligne(cam, [-X, PLAF_C, z], [X, PLAF_C, z], 8, '#8a6424', `pz${z}`, 0.28));
  // moquette rouge à motifs
  fond.push(ry(cam, SOL, -X, X, Z0, Z1, '#3e0a12', 'sol'));
  for (let x = -X; x <= X; x += 450) fond.push(ligne(cam, [x, SOL, Z0], [x, SOL, Z1], 6, '#c8963a', `sx${x}`, 0.18));
  for (let z = Z0; z <= Z1; z += 0.45) fond.push(ligne(cam, [-X, SOL, z], [X, SOL, z], 6, '#c8963a', `sz${z}`, 0.18));
  for (let x = -X + 225; x < X; x += 450) {
    for (let z = Z0 + 0.225; z < Z1; z += 0.9) {
      if (Math.abs(cam.x - x) > 3200 || Math.abs(cam.z - z) > 7) continue;
      fond.push(quad(cam, [[x, SOL, z - 0.1], [x + 100, SOL, z], [x, SOL, z + 0.1], [x - 100, SOL, z]], '#7a1a24', `sd${x}${z}`, 0.8));
    }
  }
  // murs (fond, devant, côtés) : bordeaux, pilastres dorés, frise, appliques
  const murs = [
    {z: Z1, pts: (a, b, y0, y1) => [[a, y0, Z1], [b, y0, Z1], [b, y1, Z1], [a, y1, Z1]], long: [-X, X], k: 'mf'},
    {z: Z0, pts: (a, b, y0, y1) => [[a, y0, Z0], [b, y0, Z0], [b, y1, Z0], [a, y1, Z0]], long: [-X, X], k: 'md'},
  ];
  murs.forEach((m) => {
    fond.push(quad(cam, m.pts(-X, X, PLAF_C, SOL), '#2a0810', `${m.k}0`));
    fond.push(quad(cam, m.pts(-X, X, PLAF_C, PLAF_C + 160), '#4a1018', `${m.k}fr`));
    fond.push(quad(cam, m.pts(-X, X, PLAF_C + 160, PLAF_C + 190), '#c8a040', `${m.k}or`));
    fond.push(quad(cam, m.pts(-X, X, SOL - 200, SOL), '#1a0408', `${m.k}pl`));
    for (let x = -X + 500; x < X; x += 1000) {
      fond.push(quad(cam, m.pts(x - 60, x + 60, PLAF_C + 190, SOL - 200), '#6a4a1a', `${m.k}pi${x}`));
      fond.push(quad(cam, m.pts(x + 140, x + 860, -1250, -300), '#3a0c16', `${m.k}pa${x}`));
      fond.push(halo(cam, x + 500, -1300, m.z + (m.z > 0 ? -0.02 : 0.02), 420, 'ca-chaud', 0.5 * gresille(f, `ap${m.k}${x}`, 0.04), `${m.k}ap${x}`));
    }
  });
  [-X, X].forEach((x, s) => {
    fond.push(rx(cam, x, Z0, Z1, PLAF_C, SOL, '#260710', `ml${s}`));
    fond.push(rx(cam, x, Z0, Z1, PLAF_C + 160, PLAF_C + 190, '#c8a040', `mlo${s}`));
    fond.push(rx(cam, x, Z0, Z1, SOL - 200, SOL, '#1a0408', `mlp${s}`));
    for (let z = Z0 + 1; z < Z1; z += 2) {
      fond.push(rx(cam, x, z - 0.06, z + 0.06, PLAF_C + 190, SOL - 200, '#6a4a1a', `mlpi${s}${z}`));
      fond.push(halo(cam, x + (s ? -20 : 20), -1300, z + 1, 420, 'ca-chaud', 0.5 * gresille(f, `al${s}${z}`, 0.04), `mla${s}${z}`));
    }
  });
  // enseigne néon « CASINO » sur le mur du fond (et un cœur / pique / carreau / trèfle)
  const n = neon * gresille(f, 'neon', 0.09, 0.2);
  fond.push(halo(cam, 0, -1250, Z1 - 0.02, 2600, 'ca-neon', 0.6 * n, 'nh'));
  fond.push(
    plaque(cam, [-1500, -1500, Z1 - 0.01], [1, 0, 0], [0, 1, 0], 3000, 520,
      <g>
        <text x="1500" y="400" fontSize="420" textAnchor="middle" fontWeight="900" fontFamily="'DejaVu Sans', Arial" fill="none" stroke="#ff3a6a" strokeWidth="26" opacity={n}>CASINO</text>
        <text x="1500" y="400" fontSize="420" textAnchor="middle" fontWeight="900" fontFamily="'DejaVu Sans', Arial" fill="none" stroke="#ffd0dc" strokeWidth="7" opacity={n}>CASINO</text>
      </g>,
      'enseigne'),
  );
  ['♠', '♥', '♦', '♣'].forEach((c, k) => {
    const x = [-3300, -2300, 2300, 3300][k];
    const on = gresille(f, `sy${k}`, 0.07, 0.25);
    fond.push(halo(cam, x, -1150, Z1 - 0.02, 900, k % 3 ? 'ca-rouge' : 'ca-neon', 0.5 * on, `syh${k}`));
    fond.push(plaque(cam, [x - 200, -1400, Z1 - 0.01], [1, 0, 0], [0, 1, 0], 400, 400, <text x="200" y="330" fontSize="360" textAnchor="middle" fill={k % 3 ? '#ff4a4a' : '#ffd0dc'} opacity={on}>{c}</text>, `sy${k}`));
  });
  // le même néon sur le mur de devant (pour les contrechamps)
  fond.push(halo(cam, 0, -1250, Z0 + 0.02, 2400, 'ca-rouge', 0.5 * gresille(f, 'neon2', 0.07, 0.3), 'nh2'));
  fond.push(
    plaque(cam, [1300, -1480, Z0 + 0.01], [-1, 0, 0], [0, 1, 0], 2600, 460,
      <text x="1300" y="360" fontSize="330" textAnchor="middle" fontWeight="900" fontFamily="'DejaVu Sans', Arial" fill="none" stroke="#ff3a3a" strokeWidth="22" opacity={gresille(f, 'neon2', 0.07, 0.3)}>JACKPOT</text>,
      'enseigne2'),
  );
  fond.push(<rect key="brume" width="1080" height="1920" fill="url(#ca-brume)" />);

  // ----- objets triés en profondeur -----
  const items = [];
  // machines à sous le long du mur du fond et du mur de devant
  for (let k = 0; k < 11; k++) {
    const x = -3750 + k * 750;
    if (Math.abs(x) < 1700) continue; // laisse voir l'enseigne
    items.push(machine(cam, f, x, Z1 - 0.9, Z1 - 0.3, k, -1));
  }
  for (let k = 0; k < 12; k++) items.push(machine(cam, f, -4100 + k * 750, Z0 + 0.3, Z0 + 0.9, 20 + k, 1));
  // piliers
  [[-2300, 1.6], [2300, 1.6], [-2300, 9.6], [2300, 9.6]].forEach(([x, z], k) => items.push(pilier(cam, x, z, k)));
  // tables voisines
  if (!sans.includes('voisines')) {
    items.push(tableVoisine(cam, f, -2900, 11.4, 0));
    items.push(tableVoisine(cam, f, 2900, 11.8, 1));
    items.push(tableVoisine(cam, f, 3000, -1.6, 2));
    items.push(tableVoisine(cam, f, -3000, -2.0, 3));
  }
  // lustres
  [[-1700, 8.5], [1700, 8.5], [0, 12.5], [0, 1.5], [-1700, 0.2], [1700, 0.2]].forEach(([x, z], k) => {
    const on = lustres * gresille(f, `lu${k}`, 0.06, 0.55);
    items.push({
      z, x, y: PLAF_C + 600,
      el: (
        <g key={`lu${k}`}>
          {halo(cam, x, PLAF_C + 650, z, 1700, 'ca-chaud', 0.55 * on, 'h')}
          {billboard(cam, x, PLAF_C + 650, z, <Lustre k={k} />, 'b', 1)}
        </g>
      ),
    });
  });
  return {fond: <g>{fond}</g>, items, brume: null};
};

// ----- la table de roulette (plateau, rebord, pied, tapis de mise, lampe) -----
const Tapis = ({mise}) => {
  const w = 1500;
  const cw = 1390 / 12;
  return (
    <g>
      <rect width={w} height="800" fill="none" stroke="#e8d8a0" strokeWidth="8" />
      <rect x="0" y="0" width="110" height="540" fill="#0e8a3a" stroke="#e8d8a0" strokeWidth="6" />
      <text x="55" y="300" fontSize="70" textAnchor="middle" fill="#f4f0e4" fontWeight="900" fontFamily="'DejaVu Sans', Arial">0</text>
      {[...Array(36)].map((_, i) => {
        const num = i + 1;
        const x = 110 + Math.floor(i / 3) * cw;
        const y = (2 - (i % 3)) * 180;
        return (
          <g key={num}>
            <rect x={x} y={y} width={cw} height="180" fill="none" stroke="#e8d8a0" strokeWidth="4" />
            <ellipse cx={x + cw / 2} cy={y + 90} rx="40" ry="62" fill={couleurDe(num) === 'rouge' ? '#c0141e' : '#141416'} />
            <text x={x + cw / 2} y={y + 112} fontSize="58" textAnchor="middle" fill="#f4f0e4" fontWeight="900" fontFamily="'DejaVu Sans', Arial">{num}</text>
          </g>
        );
      })}
      {['1ère 12', '2e 12', '3e 12'].map((t, k) => (
        <g key={t}>
          <rect x={110 + k * (1390 / 3)} y="540" width={1390 / 3} height="110" fill="none" stroke="#e8d8a0" strokeWidth="4" />
          <text x={110 + (k + 0.5) * (1390 / 3)} y="615" fontSize="52" textAnchor="middle" fill="#e8d8a0" fontWeight="700" fontFamily="'DejaVu Sans', Arial">{t}</text>
        </g>
      ))}
      {['1-18', 'PAIR', 'R', 'N', 'IMPAIR', '19-36'].map((t, k) => {
        const x = 110 + k * (1390 / 6);
        const lu = (t === 'R' && mise) || 0;
        return (
          <g key={t}>
            <rect x={x} y="650" width={1390 / 6} height="150" fill={lu ? '#ffd23e' : 'none'} opacity={lu ? 0.25 * lu : 1} stroke="#e8d8a0" strokeWidth="4" />
            {t === 'R' || t === 'N' ? (
              <path d={`M${x + 1390 / 12},670 L${x + 1390 / 6 - 30},725 L${x + 1390 / 12},780 L${x + 30},725 Z`} fill={t === 'R' ? '#d01a24' : '#141416'} stroke="#e8d8a0" strokeWidth="3" />
            ) : (
              <text x={x + 1390 / 12} y="745" fontSize="48" textAnchor="middle" fill="#e8d8a0" fontWeight="700" fontFamily="'DejaVu Sans', Arial">{t}</text>
            )}
          </g>
        );
      })}
    </g>
  );
};

export const tableRoulette = (cam, f, {th, b, allume = null, lampe = 1, mise = 0}) => {
  const {x0, x1, z0, z1} = TABLE;
  const Y = TABLE_Y;
  const els = [];
  // pied et caisson en bois
  els.push(boite(cam, x0 + 120, x1 - 120, Y + 40, SOL - 60, z0 + 0.12, z1 - 0.12, ['#2a1206', '#4a2410', '#3a1c0a'], 'caisson'));
  els.push(boite(cam, x0 + 300, x1 - 300, SOL - 60, SOL, z0 + 0.2, z1 - 0.2, ['#2a1206', '#1e0e04', '#160a02'], 'socle'));
  // plateau (épaisseur), puis tapis vert
  els.push(boite(cam, x0, x1, Y, Y + 40, z0, z1, ['#0e5a32', '#5a2e14', '#4a2410'], 'plateau'));
  els.push(ry(cam, Y - 1, x0 + 40, x1 - 40, z0 + 0.04, z1 - 0.04, 'url(#ca-tapis)', 'tapis'));
  // la tache de lumière de la lampe sur le tapis
  els.push(halo(cam, -200, Y - 2, 5.0, 1500, 'ca-lampe', 0.9 * lampe, 'lumtapis'));
  // tapis de mise
  els.push(plaque(cam, [-330, Y - 2, 5.4], [1, 0, 0], [0, 0, -1], 1500, 800, <g opacity="0.85"><Tapis mise={mise} /></g>, 'mise'));
  // rebord matelassé (cuir bordeaux) tout autour
  const R = 60;
  els.push(boite(cam, x0 - R, x1 + R, Y - 34, Y + 6, z0 - R / 1000, z0 + R / 1000, ['#5a1018', '#3a0a10', '#4a0c14'], 'rbA'));
  els.push(boite(cam, x0 - R, x1 + R, Y - 34, Y + 6, z1 - R / 1000, z1 + R / 1000, ['#5a1018', '#3a0a10', '#4a0c14'], 'rbF'));
  els.push(boite(cam, x0 - R, x0 + R, Y - 34, Y + 6, z0, z1, ['#5a1018', '#3a0a10', '#4a0c14'], 'rbG'));
  els.push(boite(cam, x1 - R, x1 + R, Y - 34, Y + 6, z0, z1, ['#5a1018', '#3a0a10', '#4a0c14'], 'rbD'));
  // la roue
  els.push(<RoueDessin key="roue" cam={cam} th={th} b={b} cx={ROUE.x} cz={ROUE.z} y0={Y} ech={ROUE.ech} allume={allume} />);
  return {z: 5.0, x: 0, y: Y, el: <g key="table">{els}</g>};
};

// lampe suspendue au-dessus de la table (dans les items, triée à part)
export const lampeTable = (cam, f, on = 1) => ({
  z: 5.0, x: -200, y: -1100,
  el: (
    <g key="lampe">
      {ligne(cam, [-900, PLAF_C, 5.0], [-900, -1150, 5.0], 6, '#8a6a2a', 'c1')}
      {ligne(cam, [500, PLAF_C, 5.0], [500, -1150, 5.0], 6, '#8a6a2a', 'c2')}
      {boite(cam, -1150, 750, -1150, -1070, 4.78, 5.22, ['#0c2a1a', '#143a26', '#0c2a1a', '#ffe8b0'], 'abat')}
      {halo(cam, -200, -1040, 5.0, 1500, 'ca-lampe', 0.75 * on, 'h')}
    </g>
  ),
});

// panneau lumineux des derniers numéros (sur un pied, à gauche de la roue)
export const tableauNumeros = (cam, f, liste, {nouveau = -1, eclat = 0} = {}) => {
  const {x0, x1, y0, y1, z} = TABLEAU;
  const els = [];
  els.push(boite(cam, (x0 + x1) / 2 - 22, (x0 + x1) / 2 + 22, y1, SOL, z - 0.02, z + 0.02, ['#c8a040', '#a8842e', '#886420'], 'pied'));
  els.push(boite(cam, x0, x1, y0, y1, z, z + 0.08, ['#1a1a20', '#101014', '#18181e'], 'boite'));
  const h = (y1 - y0) / 1;
  els.push(
    plaque(cam, [x0 + 20, y0 + 20, z - 0.003], [1, 0, 0], [0, 1, 0], x1 - x0 - 40, h - 40,
      <g>
        <rect width={x1 - x0 - 40} height={h - 40} fill="#050508" />
        <text x={(x1 - x0 - 40) / 2} y="52" fontSize="34" textAnchor="middle" fill="#ffd23e" fontWeight="900" fontFamily="'DejaVu Sans', Arial">DERNIERS</text>
        {liste.slice(-6).reverse().map((v, k) => {
          const col = couleurDe(v);
          const bl = k === 0 && nouveau >= 0 ? 0.6 + 0.4 * Math.abs(Math.sin(nouveau / 3)) : 1;
          return (
            <g key={k} opacity={bl}>
              <rect x={col === 'rouge' ? 30 : col === 'noir' ? 150 : 90} y={78 + k * 78} width="140" height="64" rx="12" fill={col === 'rouge' ? '#d0141e' : col === 'noir' ? '#26262c' : '#14a84a'} stroke={k === 0 ? '#ffd23e' : '#555'} strokeWidth={k === 0 ? 6 : 2} />
              <text x={(col === 'rouge' ? 30 : col === 'noir' ? 150 : 90) + 70} y={78 + k * 78 + 50} fontSize="46" textAnchor="middle" fill="#fff" fontWeight="900" fontFamily="'DejaVu Sans', Arial">{v}</text>
            </g>
          );
        })}
      </g>,
      'ecran'),
  );
  els.push(halo(cam, (x0 + x1) / 2, (y0 + y1) / 2, z - 0.01, 700, 'ca-rouge', 0.25 + 0.4 * eclat, 'h'));
  return {z: z - 0.05, x: (x0 + x1) / 2, y: (y0 + y1) / 2, el: <g key="tableau">{els}</g>};
};

// ----- jetons empilés (coul = couleur du jeton), n jetons de 9 unités -----
export const pileJetons = (cam, x, z, n, coul, key, y = TABLE_Y, r = 40) => {
  const els = [];
  for (let k = 0; k < n; k++) {
    const yy = y - 2 - k * 9;
    const dx = Math.sin(k * 1.7) * 3;
    const b = disque(cam, x + dx, yy, z, r);
    const t = disque(cam, x + dx, yy - 8, z, r);
    if (b) els.push(<polygon key={`b${k}`} points={b} fill="#1a1a1a" />);
    if (t) els.push(<polygon key={`t${k}`} points={t} fill={coul} stroke="#f4ecd8" strokeWidth={Math.max(1, 6 * cam.scale(z, x, yy))} strokeDasharray={`${8 * cam.scale(z, x, yy) * 3} ${10 * cam.scale(z, x, yy) * 3}`} />);
  }
  return {z, x, y, el: <g key={key}>{els}</g>};
};

// ----- l'enveloppe « LOYER » posée sur la table -----
export const enveloppe = (cam, x, z, key, {ouverte = 0} = {}) => ({
  z, x, y: TABLE_Y,
  el: (
    <g key={key}>
      {boite(cam, x - 110, x + 110, TABLE_Y - 14, TABLE_Y - 2, z - 0.07, z + 0.07, ['#e8dcc0', '#c8b898', '#b8a888'], 'e')}
      {plaque(cam, [x - 100, TABLE_Y - 15, z + 0.06], [1, 0, 0], [0, 0, -1], 200, 120,
        <g>
          <path d="M0,0 L100,60 L200,0" fill="none" stroke="#a8986e" strokeWidth="5" />
          <text x="100" y="98" fontSize="40" textAnchor="middle" fontWeight="900" fontFamily="'DejaVu Sans', Arial" fill="#c0141e">LOYER</text>
        </g>, 'txt')}
      {ouverte > 0 && [0, 1, 2].map((k) => plaque(cam, [x - 80 + k * 18, TABLE_Y - 17 - k * 3, z + 0.045 - k * 0.012], [1, 0, 0], [0, 0, -1], 160, 80, <g><rect width="160" height="80" rx="6" fill="#7ab87a" stroke="#3a6a3a" strokeWidth="4" /><text x="80" y="54" fontSize="40" textAnchor="middle" fontWeight="900" fill="#2a4a2a" fontFamily="'DejaVu Sans', Arial">100 €</text></g>, `b${k}`))}
    </g>
  ),
});

// ----- le râteau du croupier : manche depuis sa main, tête en T sur le tapis -----
export const rateau = (cam, main, tete, key) => {
  const [hx, hz] = tete;
  return {
    z: hz, x: hx, y: TABLE_Y,
    el: (
      <g key={key}>
        {ligne(cam, main, [hx, TABLE_Y - 18, hz + 0.02], Math.max(2, 14 * cam.scale(hz, hx, TABLE_Y)), '#c8a060', 'm')}
        {ligne(cam, [hx - 90, TABLE_Y - 8, hz], [hx + 90, TABLE_Y - 8, hz], Math.max(3, 22 * cam.scale(hz, hx, TABLE_Y)), '#e0c080', 't')}
      </g>
    ),
  };
};

// ----- les deux mains crispées sur le rebord de la table (gros plan) -----
export const mains = (cam, f, {serre = 1, tremble = 0, x = JOUEUR.x}) => {
  const els = [];
  const z = TABLE.z0 - 0.06;
  const peau = '#f2c3a0';
  const peauO = '#d89a78';
  [-1, 1].forEach((s) => {
    const cx = x + s * 230 + (random(`mt${s}${f}`) - 0.5) * tremble;
    const cy = TABLE_Y - 34 + (random(`mty${s}${f}`) - 0.5) * tremble * 0.6;
    // avant-bras (manche corail) qui vient du bas, vers la caméra
    els.push(ligne(cam, [cx + s * 40, cy + 90, z - 0.1], [cx + s * 160, cy + 520, z - 0.75], Math.max(4, 85 * cam.scale(z - 0.4, cx, cy + 300)), '#e2554a', `bras${s}`));
    els.push(ligne(cam, [cx, cy + 40, z - 0.04], [cx + s * 40, cy + 120, z - 0.15], Math.max(4, 100 * cam.scale(z - 0.1, cx, cy + 80)), peau, `poignet${s}`));
    // paume contre le rebord
    const p = disque(cam, cx, cy + 20, z - 0.01, 70, 16);
    // doigts repliés sur le dessus du rebord
    for (let k = 0; k < 4; k++) {
      const fx = cx - s * 60 + s * k * 40;
      const r = Math.max(3, 34 * cam.scale(z, fx, cy));
      els.push(ligne(cam, [fx, cy + 10, z - 0.03], [fx, cy - 6, z + 0.02 + 0.03 * serre], r, peauO, `do${s}${k}`));
      els.push(ligne(cam, [fx, cy - 6, z + 0.02 + 0.03 * serre], [fx, cy - 2, z + 0.06 + 0.02 * serre], r * 0.92, peau, `dt${s}${k}`));
    }
    if (p) els.push(<polygon key={`pa${s}`} points={p} fill={peau} opacity="0" />);
    // pouce
    els.push(ligne(cam, [cx + s * 70, cy + 40, z - 0.05], [cx + s * 20, cy + 30, z - 0.06], Math.max(3, 36 * cam.scale(z, cx, cy)), peau, `po${s}`));
  });
  return {z: z - 0.2, x, y: TABLE_Y, el: <g key="mains">{els}</g>};
};

// ----- le croupier 2D : le bonhomme en chemise blanche, gilet noir et nœud papillon -----
const CHEMISE = {haut: '#f2f0ea', hautO: '#cfcac0', pant: '#141418', chaus: '#0a0a0c', chev: '#1a1410'};
export const Croupier = ({cam, id, x, z, y = SOL, lum = 1, teinte = [1, 1, 1], shiver = 0, ombre = 0.4, ...pose}) => {
  if (!cam.visible(z, x, y - 300)) return null;
  const [px, py] = cam.proj(x, y, z);
  const s = cam.scale(z, x, y - 300) * 0.78;
  const [r, g, b] = teinte.map((c) => c * lum);
  const dos = pose.dos;
  return (
    <g>
      <defs>
        <filter id={id}>
          <feColorMatrix type="matrix" values={`${r} 0 0 0 0  0 ${g} 0 0 0  0 0 ${b} 0 0  0 0 0 1 0`} />
        </filter>
      </defs>
      <ellipse cx={px} cy={py} rx={130 * s} ry={22 * s} fill="#000" opacity={ombre} />
      <g filter={`url(#${id})`} transform={`translate(${px + shiver} ${py}) scale(${s}) translate(-300 -922)`}>
        <Bonhomme {...pose} couleurs={CHEMISE} />
        {/* gilet noir */}
        <path d={dos ? 'M222,300 Q300,290 378,300 L386,512 L214,512 Z' : 'M214,300 L262,300 L300,420 L338,300 L386,300 L386,512 L214,512 Z'} fill="#16161c" />
        {!dos && (
          <g>
            {[440, 475].map((yy) => <circle key={yy} cx="300" cy={yy} r="7" fill="#c8a040" />)}
            {/* nœud papillon */}
            <path d="M300,302 L268,286 L268,318 Z M300,302 L332,286 L332,318 Z" fill="#b0101c" />
            <circle cx="300" cy="302" r="9" fill="#d01a24" />
          </g>
        )}
      </g>
    </g>
  );
};
