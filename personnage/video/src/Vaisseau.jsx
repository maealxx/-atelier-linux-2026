import {random} from 'remotion';
import {plaque} from './Lycee';
import {SOL} from './Rue';

// ===================== Le vaisseau alien (« Le vaisseau ») =====================
// La salle des capsules : un long hall de section hexagonale, de Z −1 (porte blindée) à Z 26 (le hublot).
// Sol en caillebotis à Y = SOL (432), plafond plat à Y = PLAF_V (−1000) entre X ±1100, pans coupés jusqu'aux murs X ±1600 (Y −700).
// Capsules couchées le long des deux murs (axe selon X), tous les 2,5 Z. Lumière froide bleu-vert + gyrophares rouges.
export const PLAF_V = -1000;
export const HALL = {x: 1600, xp: 1100, yp: -700, z0: -1, z1: 26};
export const HUBLOT = {x: 0, y: -330, z: 26, r: 640};
export const POD_Z = [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5];
export const POD = {x0: 560, x1: 1360, yVerre: 70, r: 240, dz: 0.3};
export const MA_CAPSULE = {cote: -1, z: 5}; // celle où il se réveille (mur gauche)
export const GRIFFEE = {cote: 1, z: 12.5}; // la capsule vide, griffée (mur droit)
export const GRILLES = [9, 15.5, 22.9]; // grilles d'aération au plafond (Z) ; la dernière est pile au-dessus du hublot

const ligne = (cam, A, B, w, col, key, op = 1) => {
  const r = cam.seg(A, B);
  return r ? <line key={key} x1={r[0][0]} y1={r[0][1]} x2={r[1][0]} y2={r[1][1]} stroke={col} strokeWidth={w} opacity={op} strokeLinecap="round" /> : null;
};
const quad = (cam, pts, fill, key, op = 1, extra = {}) => {
  const p = cam.poly(pts);
  return p ? <polygon key={key} points={p} fill={fill} opacity={op} {...extra} /> : null;
};
const halo = (cam, x, y, z, r, grad, op, key) => {
  if (!cam.visible(z, x, y) || op <= 0.01) return null;
  const [px, py] = cam.proj(x, y, z);
  return <circle key={key} cx={px} cy={py} r={r * cam.scale(z, x, y)} fill={`url(#${grad})`} opacity={Math.min(1, op)} />;
};
// largeur à l'écran d'un trait de w unités au point P
// (profondeur plafonnée : un tuyau qui passe derrière la caméra ne doit pas devenir un disque géant)
const lw = (cam, w, P) => Math.max(1, w / Math.max(0.35, cam.profondeur(P[2], P[0], P[1])));
const boiteV = (cam, x0, x1, y0, y1, z0, z1, [dessus, face, cote, dessous = cote], key) => (
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
// gyrophare : 0 → 1 → 0, tourne en 1,6 s
export const gyro = (f, ph = 0) => Math.pow(Math.max(0, Math.sin((f / 48) * Math.PI * 2 + ph)), 3);

export const DefsVaisseau = ({cam, id = 'va'}) => (
  <defs>
    <radialGradient id={`${id}-rouge`}>
      <stop offset="0" stopColor="#ff4a3a" stopOpacity="0.95" />
      <stop offset="0.3" stopColor="#ff1a1a" stopOpacity="0.45" />
      <stop offset="1" stopColor="#ff0000" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-bleu`}>
      <stop offset="0" stopColor="#bff6ff" stopOpacity="0.9" />
      <stop offset="0.35" stopColor="#3ad0ff" stopOpacity="0.35" />
      <stop offset="1" stopColor="#0a6aff" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-vert`}>
      <stop offset="0" stopColor="#c8ffe8" stopOpacity="0.8" />
      <stop offset="0.4" stopColor="#2affb0" stopOpacity="0.3" />
      <stop offset="1" stopColor="#00ff90" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-vapeur`}>
      <stop offset="0" stopColor="#e8f6ff" stopOpacity="0.55" />
      <stop offset="0.6" stopColor="#c8e8ff" stopOpacity="0.18" />
      <stop offset="1" stopColor="#c8e8ff" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-terre`} cx="38%" cy="35%" r="70%">
      <stop offset="0" stopColor="#9ad8ff" />
      <stop offset="0.45" stopColor="#2a7ad8" />
      <stop offset="0.8" stopColor="#0c2a6a" />
      <stop offset="1" stopColor="#02081a" />
    </radialGradient>
    <radialGradient id={`${id}-atmo`}>
      <stop offset="0.6" stopColor="#6ac8ff" stopOpacity="0.5" />
      <stop offset="1" stopColor="#6ac8ff" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-brume`} cx={cam.fuite[0]} cy={cam.fuite[1]} r="1050" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="#3ab8d8" stopOpacity="0.28" />
      <stop offset="0.5" stopColor="#1a6a8a" stopOpacity="0.12" />
      <stop offset="1" stopColor="#0a2a3a" stopOpacity="0" />
    </radialGradient>
    <filter id={`${id}-flou`}>
      <feGaussianBlur stdDeviation="12" />
    </filter>
  </defs>
);

// ----- l'espace vu par le hublot : étoiles et Terre, très loin (vraie parallaxe), découpé par le hublot -----
const Espace = ({cam, f, clip}) => {
  const etoiles = [...Array(140)].map((_, k) => {
    const x = (random(`ex${k}`) - 0.5) * 60000;
    const y = -330 + (random(`ey${k}`) - 0.5) * 60000;
    const z = 60;
    if (!cam.visible(z, x, y)) return null;
    const [px, py] = cam.proj(x, y, z);
    const r = 1 + 2.2 * random(`er${k}`);
    return <circle key={k} cx={px} cy={py} r={r} fill="#fff" opacity={0.5 + 0.5 * Math.abs(Math.sin(f / 13 + k))} />;
  });
  const T = [2600, 1200, 80];
  let terre = null;
  if (cam.visible(T[2], T[0], T[1])) {
    const [px, py] = cam.proj(...T);
    const r = 5200 * cam.scale(T[2], T[0], T[1]);
    terre = (
      <g>
        <circle cx={px} cy={py} r={r * 1.35} fill="url(#va-atmo)" />
        <circle cx={px} cy={py} r={r} fill="url(#va-terre)" />
        <path d={`M${px - r * 0.5},${py - r * 0.3} q${r * 0.3},${-r * 0.2} ${r * 0.5},${r * 0.05} t${r * 0.2},${r * 0.35} q${-r * 0.3},${r * 0.2} ${-r * 0.55},${-r * 0.1} Z`} fill="#3a9a5a" opacity="0.8" />
        <path d={`M${px + r * 0.1},${py + r * 0.25} q${r * 0.25},${-r * 0.1} ${r * 0.4},${r * 0.15} q${-r * 0.1},${r * 0.25} ${-r * 0.35},${r * 0.12} Z`} fill="#4aaa6a" opacity="0.75" />
        <ellipse cx={px - r * 0.2} cy={py - r * 0.5} rx={r * 0.5} ry={r * 0.08} fill="#fff" opacity="0.35" />
      </g>
    );
  }
  return (
    <g clipPath={`url(#${clip})`}>
      <rect width="1080" height="1920" fill="#01030a" />
      {etoiles}
      {terre}
    </g>
  );
};

// ----- le hall -----
export const hall = (cam, f, {alarme = 1, neons = () => 1, brume = 1} = {}) => {
  const {x: X, xp: XP, yp: YP, z0: Z0, z1: Z1} = HALL;
  const fond = [];
  fond.push(<DefsVaisseau key="defs" cam={cam} />);
  fond.push(<rect key="noir" width="1080" height="1920" fill="#03070c" />);
  // plafond, pans coupés, murs
  fond.push(quad(cam, [[-XP, PLAF_V, Z0], [XP, PLAF_V, Z0], [XP, PLAF_V, Z1], [-XP, PLAF_V, Z1]], '#0d1620', 'plaf'));
  [-1, 1].forEach((s) => {
    fond.push(quad(cam, [[s * XP, PLAF_V, Z0], [s * X, YP, Z0], [s * X, YP, Z1], [s * XP, PLAF_V, Z1]], '#111d28', `pan${s}`));
    fond.push(quad(cam, [[s * X, YP, Z0], [s * X, SOL, Z0], [s * X, SOL, Z1], [s * X, YP, Z1]], '#0f1a24', `mur${s}`));
    // bandeau lumineux le long du mur, au-dessus des capsules
    fond.push(quad(cam, [[s * X, -330, Z0], [s * X, -310, Z0], [s * X, -310, Z1], [s * X, -330, Z1]], '#2ad8ff', `ban${s}`, 0.5));
    // panneaux muraux entre les capsules
    POD_Z.forEach((z) => {
      fond.push(quad(cam, [[s * X, -640, z - 0.9], [s * X, -360, z - 0.9], [s * X, -360, z + 0.9], [s * X, -640, z + 0.9]], '#16242f', `pm${s}${z}`));
      fond.push(quad(cam, [[s * X, -600, z - 0.3], [s * X, -440, z - 0.3], [s * X, -440, z + 0.3], [s * X, -600, z + 0.3]], ['#0a3a2a', '#3a2a0a', '#0a2a3a'][Math.round(z * 2) % 3], `ec${s}${z}`, 0.9));
      // petites diodes de l'écran
      for (let k = 0; k < 4; k++) {
        const on = random(`di${s}${z}${k}${Math.floor(f / 10)}`) > 0.4;
        fond.push(quad(cam, [[s * X, -580 + k * 36, z - 0.24], [s * X, -560 + k * 36, z - 0.24], [s * X, -560 + k * 36, z - 0.1 + 0.12 * random(`dl${s}${z}${k}`)], [s * X, -580 + k * 36, z - 0.1 + 0.12 * random(`dl${s}${z}${k}`)]], k % 2 ? '#2affb0' : '#ffb02a', `dd${s}${z}${k}`, on ? 0.9 : 0.25));
      }
    });
  });
  // sol : bandes latérales sombres, allée centrale en caillebotis avec liserés lumineux
  fond.push(quad(cam, [[-X, SOL, Z0], [X, SOL, Z0], [X, SOL, Z1], [-X, SOL, Z1]], '#0a1118', 'sol'));
  fond.push(quad(cam, [[-470, SOL - 1, Z0], [470, SOL - 1, Z0], [470, SOL - 1, Z1], [-470, SOL - 1, Z1]], '#16222c', 'allee'));
  for (let x = -450; x <= 450; x += 75) fond.push(ligne(cam, [x, SOL - 2, Z0], [x, SOL - 2, Z1], lw(cam, 7, [x, SOL, cam.z + 2]), '#0a1118', `gx${x}`, 0.8));
  for (let z = Z0; z <= Z1; z += 0.25) {
    if (Math.abs(z - cam.z) > 12) continue;
    fond.push(ligne(cam, [-470, SOL - 2, z], [470, SOL - 2, z], lw(cam, 6, [0, SOL, z]), '#0a1118', `gz${z}`, 0.8));
  }
  [-1, 1].forEach((s) => fond.push(quad(cam, [[s * 470, SOL - 3, Z0], [s * 500, SOL - 3, Z0], [s * 500, SOL - 3, Z1], [s * 470, SOL - 3, Z1]], '#2ad8ff', `lis${s}`, 0.75)));
  // mur du fond avec le hublot (l'espace, puis l'anneau du hublot)
  const H = HUBLOT;
  const cercle = (r, z = Z1) => [...Array(40)].map((_, k) => [H.x + Math.cos((k / 40) * 6.283) * r, H.y + Math.sin((k / 40) * 6.283) * r, z]);
  fond.push(quad(cam, [[-X, YP, Z1], [-XP, PLAF_V, Z1], [XP, PLAF_V, Z1], [X, YP, Z1], [X, SOL, Z1], [-X, SOL, Z1]], '#101c26', 'fondmur'));
  const pH = cam.poly(cercle(H.r));
  const hubVisible = cercle(H.r + 140).every((q) => cam.visible(q[2], q[0], q[1])); // sinon le contour découpé fait une forme géante
  if (pH && hubVisible) {
    fond.push(
      <g key="hub">
        <defs>
          <clipPath id="va-hub">
            <polygon points={pH} />
          </clipPath>
        </defs>
        <Espace cam={cam} f={f} clip="va-hub" />
        <polygon points={pH} fill="#5ac8ff" opacity="0.06" />
      </g>,
    );
    const pA = cam.poly(cercle(H.r + 110, Z1 - 0.005));
    fond.push(pA && <polygon key="anneau" points={pA} fill="none" stroke="#2a3a48" strokeWidth={lw(cam, 150, [0, H.y, Z1])} />);
    fond.push(pA && <polygon key="anneau2" points={cam.poly(cercle(H.r + 30, Z1 - 0.01))} fill="none" stroke="#5a6a78" strokeWidth={lw(cam, 24, [0, H.y, Z1])} />);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * 6.283;
      fond.push(halo(cam, H.x + Math.cos(a) * (H.r + 110), H.y + Math.sin(a) * (H.r + 110), Z1 - 0.02, 60, 'va-bleu', 0.8, `bo${k}`));
    }
  }
  // mur de départ : porte blindée à bandes jaunes et noires
  fond.push(quad(cam, [[-X, YP, Z0], [-XP, PLAF_V, Z0], [XP, PLAF_V, Z0], [X, YP, Z0], [X, SOL, Z0], [-X, SOL, Z0]], '#101c26', 'murdep'));
  fond.push(quad(cam, [[-650, -600, Z0 + 0.01], [650, -600, Z0 + 0.01], [650, SOL, Z0 + 0.01], [-650, SOL, Z0 + 0.01]], '#1e2a34', 'porte'));
  for (let k = -6; k < 6; k++) fond.push(quad(cam, [[k * 110, -600, Z0 + 0.015], [k * 110 + 55, -600, Z0 + 0.015], [k * 110 + 95, -520, Z0 + 0.015], [k * 110 + 40, -520, Z0 + 0.015]], '#e8b020', `hz${k}`, 0.85));
  fond.push(<rect key="brume" width="1080" height="1920" fill="url(#va-brume)" opacity={brume} />);

  // ----- éléments triés -----
  const items = [];
  // nervures : cadres métalliques tous les 3 Z (sol → mur → pan → plafond → pan → mur → sol)
  for (let z = 0.75; z < Z1; z += 3) {
    const pts = [[-X + 10, SOL], [-X + 10, YP], [-XP, PLAF_V + 10], [XP, PLAF_V + 10], [X - 10, YP], [X - 10, SOL]];
    const els = [];
    for (let k = 0; k < pts.length - 1; k++) {
      const A = [pts[k][0] * 0.985, pts[k][1], z];
      const B = [pts[k + 1][0] * 0.985, pts[k + 1][1], z];
      els.push(ligne(cam, A, B, lw(cam, 130, [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, z]), '#1c2a36', `n${k}`));
      els.push(ligne(cam, A, B, lw(cam, 22, [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, z]), '#2c3e4c', `nl${k}`));
    }
    // néon au plafond sur la nervure
    const on = neons(z) * gresille(f, `ne${z}`, 0.05, 0.3);
    els.push(ligne(cam, [-700, PLAF_V + 40, z], [700, PLAF_V + 40, z], lw(cam, 26, [0, PLAF_V, z]), '#c8f4ff', 'neon', 0.25 + 0.75 * on));
    els.push(halo(cam, 0, PLAF_V + 80, z, 900, 'va-bleu', 0.35 * on, 'nh'));
    // gyrophares rouges dans les angles
    [-1, 1].forEach((s) => {
      const g = alarme * gyro(f, z + s);
      const P = [s * (XP + 150), PLAF_V + 160, z];
      els.push(halo(cam, P[0], P[1], P[2], 1700, 'va-rouge', 0.9 * g, `gh${s}`));
      if (cam.visible(z, P[0], P[1])) {
        const [px, py] = cam.proj(...P);
        els.push(<circle key={`gd${s}`} cx={px} cy={py} r={Math.max(2, 50 * cam.scale(z, P[0], P[1]))} fill={g > 0.3 ? '#ff6a5a' : '#6a1a1a'} />);
      }
    });
    items.push({z, x: 0, y: PLAF_V + 200, el: <g key={`nv${z}`}>{els}</g>});
  }
  // tuyaux et câbles au plafond, sur toute la longueur
  [[-850, PLAF_V + 70, 70, '#26343e'], [-700, PLAF_V + 60, 45, '#3a2a1e'], [760, PLAF_V + 70, 60, '#26343e'], [880, PLAF_V + 90, 40, '#1e3a2e']].forEach(([x, y, w, c], k) => {
    for (let z = Z0; z < Z1; z += 2) {
      items.push({z: z + 1, x, y, el: <g key={`tu${k}${z}`}>{ligne(cam, [x, y, z], [x, y, Math.min(Z1, z + 2.02)], lw(cam, w, [x, y, z + 1]), c, 't')}{ligne(cam, [x - w * 0.25, y - w * 0.3, z], [x - w * 0.25, y - w * 0.3, Math.min(Z1, z + 2.02)], lw(cam, w * 0.25, [x, y, z + 1]), '#5a6a74', 'r', 0.5)}</g>});
    }
  });
  for (let z = 1; z < Z1 - 1; z += 3) {
    const pts = [...Array(9)].map((_, k) => [-300 + (600 * k) / 8, PLAF_V + 40 + Math.sin((k / 8) * Math.PI) * 180, z + 1.5]);
    const els = [];
    for (let k = 0; k < 8; k++) els.push(ligne(cam, pts[k], pts[k + 1], lw(cam, 10, pts[k]), '#1a242c', `c${k}`, 0.8));
    items.push({z: z + 1.5, x: 0, y: PLAF_V + 150, el: <g key={`ca${z}`}>{els}</g>});
  }
  // grilles d'aération au plafond
  GRILLES.forEach((z, k) => {
    const els = [quad(cam, [[-260, PLAF_V + 2, z - 0.3], [260, PLAF_V + 2, z - 0.3], [260, PLAF_V + 2, z + 0.3], [-260, PLAF_V + 2, z + 0.3]], '#05080c', 'g')];
    for (let j = -4; j <= 4; j++) els.push(ligne(cam, [j * 55, PLAF_V + 4, z - 0.28], [j * 55, PLAF_V + 4, z + 0.28], lw(cam, 16, [0, PLAF_V, z]), '#3a4a56', `gl${j}`));
    items.push({z, x: 0, y: PLAF_V, el: <g key={`gr${k}`}>{els}</g>});
  });
  // vapeur froide au ras du sol
  if (brume > 0) {
    for (let k = 0; k < 26; k++) {
      const x = (random(`vx${k}`) - 0.5) * 2800;
      const z = Z0 + 1 + random(`vz${k}`) * (Z1 - Z0 - 2) + Math.sin(f / 60 + k) * 0.3;
      const y = SOL - 40 - random(`vy${k}`) * 80;
      items.push({z, x, y, el: halo(cam, x + Math.sin(f / 40 + k) * 120, y, z, 900 + 500 * random(`vr${k}`), 'va-vapeur', 0.35 * brume, `vp${k}`)});
    }
  }
  return {fond: <g>{fond}</g>, items, brume: null};
};

// ----- une capsule couchée (le long d'un mur), avec son dormeur -----
// cote : −1 mur gauche, 1 mur droit. ouvre : 0 → 1 (le couvercle de verre bascule vers le mur). vide, griffee, buee (0 → 1).
const VISAGES = [
  {peau: '#f2c3a0', chev: '#2b2140'},
  {peau: '#c8906a', chev: '#1a1410'},
  {peau: '#f6d2b4', chev: '#c88a3a'},
  {peau: '#8a5a3a', chev: '#0e0a08'},
  {peau: '#e8b48c', chev: '#5a3a2a'},
];
export const Dormeur = ({k = 0, ouvert = 0, worry = 0}) => {
  const V = VISAGES[k % VISAGES.length];
  return (
    <g>
      <ellipse cx="0" cy="-10" rx="86" ry="80" fill={V.chev} />
      <ellipse cx="0" cy="8" rx="70" ry="74" fill={V.peau} />
      <path d="M-74,-6 Q-80,-86 0,-90 Q80,-86 74,-6 Q50,-50 0,-48 Q-50,-50 -74,-6 Z" fill={V.chev} />
      {ouvert > 0.1 ? (
        [-26, 26].map((x) => <ellipse key={x} cx={x} cy="10" rx="9" ry={11 * ouvert} fill="#1a1420" />)
      ) : (
        [-26, 26].map((x) => <path key={x} d={`M${x - 11},10 Q${x},16 ${x + 11},10`} stroke="#3a2a2a" strokeWidth="5" fill="none" strokeLinecap="round" />)
      )}
      {worry > 0 && [-1, 1].map((s) => <path key={s} d={`M${s * 14},-12 L${s * 38},${-18 - 8 * worry}`} stroke={V.chev} strokeWidth="6" strokeLinecap="round" />)}
      <path d="M-12,46 Q0,52 12,46" stroke="#a8604a" strokeWidth="5" fill="none" strokeLinecap="round" />
    </g>
  );
};
export const capsule = (cam, f, cote, z, k, {ouvre = 0, vide = false, griffee = false, buee = 0.6, lumiere = 1, regard = 0} = {}) => {
  const s = cote;
  const {x0, x1, yVerre: YV, r: R, dz: DZ} = POD;
  const xa = s * x0;
  const xb = s * x1;
  const lo = Math.min(xa, xb);
  const hi = Math.max(xa, xb);
  const els = [];
  // socle et coque
  els.push(boiteV(cam, lo + 40, hi - 40, 200, SOL, z - DZ + 0.04, z + DZ - 0.04, ['#1c2832', '#141e28', '#18242e'], 'socle'));
  els.push(boiteV(cam, lo, hi, YV, 200, z - DZ, z + DZ, ['#cfd8e0', '#8a98a6', '#a8b4c0'], 'coque'));
  els.push(quad(cam, [[lo, YV + 40, z - DZ - 0.002], [hi, YV + 40, z - DZ - 0.002], [hi, YV + 60, z - DZ - 0.002], [lo, YV + 60, z - DZ - 0.002]], '#2ad8ff', 'lis', 0.8 * lumiere));
  // intérieur : matelas, dormeur (tête côté mur), couverture
  els.push(quad(cam, [[lo + 30, YV - 2, z - DZ + 0.03], [hi - 30, YV - 2, z - DZ + 0.03], [hi - 30, YV - 2, z + DZ - 0.03], [lo + 30, YV - 2, z + DZ - 0.03]], '#dfe8ef', 'mat'));
  els.push(halo(cam, s * 960, YV - 60, z, 520, 'va-bleu', 0.55 * lumiere, 'lum'));
  if (!vide) {
    const xt = s * 1180;
    els.push(boiteV(cam, Math.min(s * 640, s * 1060), Math.max(s * 640, s * 1060), YV - 70, YV - 4, z - 0.17, z + 0.17, ['#7ab8d8', '#5a98b8', '#6aa8c8'], 'couv'));
    if (cam.visible(z, xt, YV - 40)) {
      const [px, py] = cam.proj(xt, YV - 50, z);
      const sc = cam.scale(z, xt, YV - 50) * 1.05;
      const ang = (Math.atan2(cam.proj(xt - s * 100, YV - 50, z)[1] - py, cam.proj(xt - s * 100, YV - 50, z)[0] - px) * 180) / Math.PI - 90;
      els.push(<g key="tete" transform={`translate(${px} ${py}) rotate(${ang}) scale(${sc})`}><Dormeur k={k} ouvert={regard} worry={regard > 0 ? 1 : 0} /></g>);
    }
  }
  if (griffee) {
    for (let j = 0; j < 4; j++) els.push(ligne(cam, [s * (700 + j * 40), YV - 3, z - 0.18], [s * (900 + j * 40), YV - 3, z + 0.16], lw(cam, 10, [s * 800, YV, z]), '#3a0a0a', `gm${j}`, 0.9));
  }
  // couvercle de verre : demi-cylindre selon X, qui bascule autour de l'arête côté mur
  const N = 9;
  const ang = ouvre * 1.9; // rotation en radians autour de l'axe (X, y = YV, z = z + DZ) vers l'arrière
  const pt = (x, a) => {
    let y = YV - Math.sin(a) * R;
    let zz = Math.cos(a) * R; // −R → R (unités), centré sur z
    // rotation autour de la charnière (zz = R, y = YV)
    const dy = y - YV;
    const dz = zz - R;
    y = YV + dy * Math.cos(ang) + dz * Math.sin(ang);
    zz = R - dy * Math.sin(ang) + dz * Math.cos(ang);
    return [x, y, z + (zz * DZ) / R / 1];
  };
  const verre = [];
  for (let j = 0; j < N; j++) {
    const a0 = (j / N) * Math.PI;
    const a1 = ((j + 1) / N) * Math.PI;
    const P = [pt(lo + 10, a0), pt(hi - 10, a0), pt(hi - 10, a1), pt(lo + 10, a1)];
    const c = P.reduce((m, p) => [m[0] + p[0] / 4, m[1] + p[1] / 4, m[2] + p[2] / 4], [0, 0, 0]);
    const reflet = Math.pow(Math.max(0, Math.cos(a0 - 1.1)), 6);
    verre.push({d: cam.profondeur(c[2], c[0], c[1]), el: quad(cam, P, griffee && j % 3 === 1 ? '#c8e8f8' : '#a8e4ff', `v${j}`, 0.1 + 0.18 * buee + 0.35 * reflet, {stroke: '#d8f4ff', strokeOpacity: 0.25, strokeWidth: 1})});
  }
  verre.sort((a, b) => b.d - a.d);
  els.push(...verre.map((v) => v.el));
  // arceaux du couvercle
  [lo + 10, hi - 10].forEach((x, j) => {
    for (let q = 0; q < N; q++) els.push(ligne(cam, pt(x, (q / N) * Math.PI), pt(x, ((q + 1) / N) * Math.PI), lw(cam, 26, [x, YV, z]), '#9aa8b4', `ar${j}${q}`));
  });
  if (griffee) {
    // fêlures du verre
    for (let j = 0; j < 6; j++) {
      const a = 0.6 + j * 0.3;
      els.push(ligne(cam, pt(s * 820, a), pt(s * (820 + 140 * (j % 2 ? 1 : -1)), a + 0.35), lw(cam, 6, [s * 820, YV, z]), '#ffffff', `fe${j}`, 0.8));
    }
  }
  return {z, x: s * 960, y: YV, el: <g key={`pod${s}${z}`}>{els}</g>};
};

// ===================== Le couloir de fuite =====================
// Couloir étroit de Z 0 à 48 (X ±650), plafond à −650, néons tous les 3 Z, portes coulissantes tous les 8 Z.
// neon(z) → 0..1 (allumé), porte(z) → 0 (ouverte) .. 1 (fermée).
export const COULOIR_V = {x: 650, plaf: -650, z0: 0, z1: 48};
export const PORTES_V = [8, 16, 24, 32, 40];
export const couloirV = (cam, f, {neon = () => 1, porte = () => 0, alarme = 1} = {}) => {
  const {x: X, plaf: PL, z0: Z0, z1: Z1} = COULOIR_V;
  const fond = [];
  fond.push(<DefsVaisseau key="defs" cam={cam} />);
  fond.push(<rect key="noir" width="1080" height="1920" fill="#020407" />);
  fond.push(quad(cam, [[-X, PL, Z0], [X, PL, Z0], [X, PL, Z1], [-X, PL, Z1]], '#0b141c', 'plaf'));
  fond.push(quad(cam, [[-X, SOL, Z0], [X, SOL, Z0], [X, SOL, Z1], [-X, SOL, Z1]], '#0a1118', 'sol'));
  [-1, 1].forEach((s) => {
    fond.push(quad(cam, [[s * X, PL, Z0], [s * X, SOL, Z0], [s * X, SOL, Z1], [s * X, PL, Z1]], '#0e1922', `mur${s}`));
    // bas de mur coupé en biais + bandeau lumineux
    fond.push(quad(cam, [[s * X, 250, Z0], [s * X, 270, Z0], [s * X, 270, Z1], [s * X, 250, Z1]], '#2ad8ff', `ban${s}`, 0.35));
    for (let z = Z0 + 1; z < Z1; z += 2) {
      fond.push(quad(cam, [[s * X, -560, z - 0.8], [s * X, 200, z - 0.8], [s * X, 200, z + 0.8], [s * X, -560, z + 0.8]], '#13212c', `pa${s}${z}`));
      fond.push(quad(cam, [[s * X, -400, z - 0.05], [s * X, 120, z - 0.05], [s * X, 120, z + 0.05], [s * X, -400, z + 0.05]], '#1e2e3a', `pr${s}${z}`));
    }
  });
  for (let z = Z0; z <= Z1; z += 0.3) {
    if (Math.abs(z - cam.z) > 14) continue;
    fond.push(ligne(cam, [-X, SOL - 1, z], [X, SOL - 1, z], lw(cam, 6, [0, SOL, z]), '#05090d', `gz${z}`, 0.8));
  }
  fond.push(quad(cam, [[-X, PL, Z1], [X, PL, Z1], [X, SOL, Z1], [-X, SOL, Z1]], '#05080b', 'fondc'));
  fond.push(<rect key="brume" width="1080" height="1920" fill="url(#va-brume)" opacity="0.8" />);
  const items = [];
  // néons au plafond, avec leur tache de lumière
  for (let z = Z0 + 1.5; z < Z1; z += 3) {
    const on = neon(z) * gresille(f, `cn${z}`, 0.06, 0.25);
    if (Math.abs(z - cam.z) < 1.1 && cam.y < 0) continue; // un néon collé à la caméra ferait une grande tache blanche
    items.push({z, x: 0, y: PL, el: <g key={`cn${z}`}>
      {quad(cam, [[-60, PL + 2, z - 0.7], [60, PL + 2, z - 0.7], [60, PL + 2, z + 0.7], [-60, PL + 2, z + 0.7]], on > 0.5 ? '#d8f6ff' : '#1a2630', 't')}
      {halo(cam, 0, PL + 60, z, 900, 'va-bleu', 0.5 * on, 'h')}
      {halo(cam, 0, SOL - 5, z, 700, 'va-bleu', 0.25 * on, 's')}
    </g>});
  }
  // gyrophares
  for (let z = Z0 + 4; z < Z1; z += 8) {
    const g = alarme * gyro(f, z);
    items.push({z, x: X - 40, y: PL + 80, el: halo(cam, X - 40, PL + 80, z, 1400, 'va-rouge', 0.8 * g, `cg${z}`)});
  }
  // portes coulissantes (deux battants qui se referment au centre), cadre épais
  PORTES_V.forEach((z) => {
    const fe = Math.max(0, Math.min(1, porte(z)));
    const ouvert = (1 - fe) * (X - 20);
    const els = [];
    els.push(boiteV(cam, -X, -X + 120, PL, SOL, z - 0.12, z + 0.12, ['#1c2a36', '#24323e', '#1c2a36'], 'cg'));
    els.push(boiteV(cam, X - 120, X, PL, SOL, z - 0.12, z + 0.12, ['#1c2a36', '#24323e', '#1c2a36'], 'cd'));
    els.push(boiteV(cam, -X, X, PL, PL + 110, z - 0.12, z + 0.12, ['#1c2a36', '#24323e', '#1c2a36', '#1c2a36'], 'ch'));
    if (fe > 0.01) {
      els.push(boiteV(cam, -X + 120, -X + 120 + (X - 120) * fe, PL + 110, SOL, z - 0.04, z + 0.04, ['#2a3a46', '#33424e', '#2a3a46'], 'bg'));
      els.push(boiteV(cam, X - 120 - (X - 120) * fe, X - 120, PL + 110, SOL, z - 0.04, z + 0.04, ['#2a3a46', '#33424e', '#2a3a46'], 'bd'));
      for (let k = -4; k < 4; k++) els.push(quad(cam, [[k * 80 * fe, -80, z - 0.045], [k * 80 * fe + 40 * fe, -80, z - 0.045], [k * 80 * fe + 60 * fe, -20, z - 0.045], [k * 80 * fe + 20 * fe, -20, z - 0.045]], '#e8b020', `hz${k}`, 0.8));
    }
    els.push(halo(cam, 0, PL + 160, z - 0.15, 300, fe > 0.5 ? 'va-rouge' : 'va-vert', 0.9, 'voyant'));
    items.push({z, x: 0, y: 0, el: <g key={`po${z}`}>{els}{ouvert < 0 && null}</g>});
  });
  return {fond: <g>{fond}</g>, items, brume: null};
};

// ===================== La salle des écrans =====================
// Salle X ±1400, Z 0 → 8, plafond bas à −700 (l'alien y touche le plafond). Écrans sur tous les murs,
// grand écran central sur le mur du fond (Z 8) qui montre la salle des capsules en direct (vue CCTV).
// Porte d'entrée au fond gauche (mur X −1400, Z 1 → 2.6), sas de la capsule de secours sur le mur droit (X 1400, Z 3.6 → 5.4).
export const SALLE_E = {x: 1400, plaf: -700, z0: 0, z1: 8};
export const ECRAN = {x0: -560, x1: 560, y0: -640, y1: -20, z: 8};
export const SAS = {x: 1400, z0: 3.6, z1: 5.4};
export const salleEcrans = (cam, f, {flux = null, sas = 0, alarme = 0, porte = 0, lumiere = 1} = {}) => {
  const {x: X, plaf: PL, z0: Z0, z1: Z1} = SALLE_E;
  const fond = [];
  fond.push(<DefsVaisseau key="defs" cam={cam} />);
  fond.push(<rect key="noir" width="1080" height="1920" fill="#020604" />);
  fond.push(quad(cam, [[-X, PL, Z0], [X, PL, Z0], [X, PL, Z1], [-X, PL, Z1]], '#08120e', 'plaf'));
  for (let x = -X; x <= X; x += 350) fond.push(ligne(cam, [x, PL + 2, Z0], [x, PL + 2, Z1], lw(cam, 14, [x, PL, 4]), '#14241c', `px${x}`));
  fond.push(quad(cam, [[-X, SOL, Z0], [X, SOL, Z0], [X, SOL, Z1], [-X, SOL, Z1]], '#08100c', 'sol'));
  for (let z = Z0; z <= Z1; z += 0.35) fond.push(ligne(cam, [-X, SOL - 1, z], [X, SOL - 1, z], lw(cam, 5, [0, SOL, z]), '#030604', `gz${z}`, 0.8));
  const murs = [
    {k: 'f', pts: (a, b, y0, y1) => [[a, y0, Z1], [b, y0, Z1], [b, y1, Z1], [a, y1, Z1]], long: X, ax: [1, 0, 0], P: (u, yy) => [u, yy, Z1 - 0.01]},
    {k: 'a', pts: (a, b, y0, y1) => [[a, y0, Z0], [b, y0, Z0], [b, y1, Z0], [a, y1, Z0]], long: X, ax: [-1, 0, 0], P: (u, yy) => [-u, yy, Z0 + 0.01]},
  ];
  murs.forEach((m) => fond.push(quad(cam, m.pts(-X, X, PL, SOL), '#0b1611', `m${m.k}`)));
  [-1, 1].forEach((s) => fond.push(quad(cam, [[s * X, PL, Z0], [s * X, SOL, Z0], [s * X, SOL, Z1], [s * X, PL, Z1]], '#0a1510', `ml${s}`)));
  // mosaïque de petits écrans (verts / bleus), qui clignotent et défilent
  const petit = (P0, ax, w, h, k) => {
    const c = ['#0a3a22', '#0a2a3a', '#2a3a0a'][k % 3];
    const on = gresille(f, `pe${k}`, 0.05, 0.4);
    return plaque(cam, P0, ax, [0, 1, 0], w, h,
      <g opacity={on}>
        <rect width={w} height={h} fill="#020604" stroke="#1a2a22" strokeWidth="14" />
        <rect x="12" y="12" width={w - 24} height={h - 24} fill={c} />
        {[...Array(5)].map((_, j) => <rect key={j} x="30" y={30 + j * (h - 60) / 5} width={(w - 60) * (0.3 + 0.7 * random(`pl${k}${j}${Math.floor(f / 8)}`))} height={(h - 60) / 10} fill={k % 2 ? '#2affb0' : '#5ac8ff'} opacity="0.7" />)}
        <polyline points={[...Array(12)].map((_, j) => `${30 + j * (w - 60) / 11},${h - 40 - 40 * Math.abs(Math.sin(f / 6 + j + k))}`).join(' ')} fill="none" stroke="#b8ff6a" strokeWidth="6" />
      </g>, `pe${k}`);
  };
  let k = 0;
  for (let u = -X + 120; u < X - 300; u += 330) {
    for (let yy = -620; yy < 100; yy += 260) {
      if (u > ECRAN.x0 - 330 && u < ECRAN.x1 && yy < ECRAN.y1 + 40) { k++; continue; }
      fond.push(petit([u, yy, Z1 - 0.01], [1, 0, 0], 300, 230, k++));
      fond.push(petit([-u, yy, Z0 + 0.01], [-1, 0, 0], 300, 230, k++));
    }
  }
  [-1, 1].forEach((s) => {
    for (let z = Z0 + 0.4; z < Z1 - 0.3; z += 0.4) {
      if (s < 0 && z > 0.8 && z < 2.8) continue; // la porte
      if (s > 0 && z > SAS.z0 - 0.2 && z < SAS.z1 + 0.2) continue; // le sas
      for (let yy = -620; yy < 100; yy += 260) fond.push(petit([s * (X - 2), yy, s > 0 ? z + 0.3 : z], [0, 0, s > 0 ? -1 : 1], 300, 230, k++));
    }
  });
  // la porte d'entrée (mur gauche), qui coulisse vers le haut
  fond.push(quad(cam, [[-X + 2, -500, 1], [-X + 2, SOL, 1], [-X + 2, SOL, 2.6], [-X + 2, -500, 2.6]], '#020304', 'trou'));
  fond.push(quad(cam, [[-X + 4, -500, 1], [-X + 4, -500 + (SOL + 500) * (1 - porte), 1], [-X + 4, -500 + (SOL + 500) * (1 - porte), 2.6], [-X + 4, -500, 2.6]], '#24323e', 'battant'));
  // le sas de la capsule de secours (mur droit) : sa porte s'ouvre, lumière chaude derrière
  fond.push(quad(cam, [[X - 2, -520, SAS.z0], [X - 2, SOL, SAS.z0], [X - 2, SOL, SAS.z1], [X - 2, -520, SAS.z1]], sas > 0 ? '#ffd8a0' : '#1a2630', 'sas'));
  if (sas > 0) {
    // l'intérieur de la capsule de secours : coque blanche éclairée, hublot, un seul siège avec harnais
    fond.push(plaque(cam, [X - 3, -520, SAS.z1], [0, 0, -1], [0, 1, 0], (SAS.z1 - SAS.z0) * 1000, SOL + 520,
      <g opacity={sas}>
        <defs>
          <radialGradient id="sas-in" cx="50%" cy="40%" r="70%">
            <stop offset="0" stopColor="#fff4e0" />
            <stop offset="0.6" stopColor="#e8c89a" />
            <stop offset="1" stopColor="#8a6a4a" />
          </radialGradient>
        </defs>
        <rect width="1800" height="952" fill="url(#sas-in)" />
        <circle cx="900" cy="230" r="120" fill="#05080f" stroke="#9aa8b4" strokeWidth="26" />
        <circle cx="940" cy="200" r="16" fill="#fff" />
        <path d="M640,952 L660,520 Q900,430 1140,520 L1160,952 Z" fill="#c8501a" />
        <path d="M700,560 Q900,500 1100,560 L1080,760 Q900,720 720,760 Z" fill="#e8642a" />
        <path d="M760,520 L860,900 M1040,520 L940,900" stroke="#2a2a30" strokeWidth="30" />
        <rect x="610" y="420" width="580" height="30" rx="15" fill="#ffd27a" />
        {[0, 1, 2, 3].map((j) => <circle key={j} cx={300 + j * 400} cy="80" r="22" fill="#ffd27a" opacity={0.6 + 0.4 * Math.sin(f / 5 + j)} />)}
      </g>, 'interieur'));
    fond.push(halo(cam, X - 10, -50, (SAS.z0 + SAS.z1) / 2, 2400, 'va-vapeur', 0.6 * sas, 'sash'));
  }
  const hs = (SAS.z1 - SAS.z0) / 2;
  fond.push(quad(cam, [[X - 4, -520, SAS.z0], [X - 4, SOL, SAS.z0], [X - 4, SOL, SAS.z0 + hs * (1 - sas)], [X - 4, -520, SAS.z0 + hs * (1 - sas)]], '#2a3a46', 'sasg'));
  fond.push(quad(cam, [[X - 4, -520, SAS.z1 - hs * (1 - sas)], [X - 4, SOL, SAS.z1 - hs * (1 - sas)], [X - 4, SOL, SAS.z1], [X - 4, -520, SAS.z1]], '#2a3a46', 'sasd'));
  fond.push(halo(cam, X - 20, -600, SAS.z0 - 0.3, 500, sas > 0 ? 'va-vapeur' : 'va-rouge', 0.9, 'sasv'));
  // le grand écran central : la salle des capsules en direct (vue de la caméra de surveillance)
  const E = ECRAN;
  const w = E.x1 - E.x0;
  const h = E.y1 - E.y0;
  fond.push(quad(cam, [[E.x0 - 50, E.y0 - 50, Z1 - 0.005], [E.x1 + 50, E.y0 - 50, Z1 - 0.005], [E.x1 + 50, E.y1 + 50, Z1 - 0.005], [E.x0 - 50, E.y1 + 50, Z1 - 0.005]], '#1a2a22', 'cadre'));
  fond.push(
    plaque(cam, [E.x0, E.y0, Z1 - 0.012], [1, 0, 0], [0, 1, 0], w, h,
      <g>
        <rect width={w} height={h} fill="#000" />
        {flux && (
          <svg x="0" y="0" width={w} height={h} viewBox={`0 ${820 - (1080 * h) / w / 2} 1080 ${(1080 * h) / w}`} preserveAspectRatio="xMidYMid slice">
            {flux}
          </svg>
        )}
        <rect width={w} height={h} fill="#3aff8a" opacity="0.14" style={{mixBlendMode: 'screen'}} />
        {[...Array(40)].map((_, j) => <rect key={j} x="0" y={(j * h) / 40 + ((f * 3) % (h / 40))} width={w} height="4" fill="#000" opacity="0.35" />)}
        <circle cx={w - 50} cy="46" r="16" fill="#ff2a2a" opacity={Math.floor(f / 15) % 2 ? 1 : 0.2} />
      </g>, 'grand'),
  );
  fond.push(halo(cam, 0, (E.y0 + E.y1) / 2, Z1 - 0.05, 2600, 'va-vert', 0.35 * lumiere, 'eclat'));
  fond.push(<rect key="brume" width="1080" height="1920" fill="url(#va-brume)" opacity="0.5" />);
  // gyrophares de l'alarme
  [[-X + 60, 1], [X - 60, 6.5], [0, 0.2]].forEach(([x, z], j) => fond.push(halo(cam, x, PL + 60, z, 1800, 'va-rouge', 0.9 * alarme * gyro(f, j * 2), `ga${j}`)));
  const items = [];
  // console centrale (pupitre en biais), avec claviers lumineux
  const P = {x0: -700, x1: 700, z0: 5.6, z1: 6.4};
  items.push({z: 6, x: 0, y: 200, el: <g key="console">
    {boiteV(cam, P.x0, P.x1, 120, SOL, P.z0 + 0.15, P.z1, ['#16241c', '#1a2a22', '#14201a'], 'b')}
    {quad(cam, [[P.x0, 120, P.z0 + 0.15], [P.x1, 120, P.z0 + 0.15], [P.x1, 40, P.z1], [P.x0, 40, P.z1]], '#22342a', 'pupitre')}
    {[...Array(14)].map((_, j) => quad(cam, [[P.x0 + 60 + j * 95, 100, P.z0 + 0.3], [P.x0 + 120 + j * 95, 100, P.z0 + 0.3], [P.x0 + 120 + j * 95, 70, P.z0 + 0.55], [P.x0 + 60 + j * 95, 70, P.z0 + 0.55]], ['#2affb0', '#ffb02a', '#5ac8ff', '#ff4a4a'][j % 4], `cl${j}`, 0.4 + 0.6 * (random(`cl${j}${Math.floor(f / 7)}`) > 0.3)))}
    {halo(cam, 0, 60, P.z0 + 0.4, 1300, 'va-vert', 0.3 * lumiere, 'h')}
  </g>});
  return {fond: <g>{fond}</g>, items, brume: null};
};
