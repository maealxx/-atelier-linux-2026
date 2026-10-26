import {random} from 'remotion';
import {DefsGare, boiteG, halo, ligne, lw, quad, tache, troue} from './Gare';
import {plaque} from './Lycee';
import {Perso} from './moteur';
import {SOL} from './Rue';

// ===================== La ville de jour (« Et si l'hypergamie disparaissait ») =====================
// Décors 2,5D de jour, lumineux et colorés : la chambre, la rue commerçante (café, boulangerie, salle de sport avec
// vitrine sur l'intérieur et son miroir, fleuriste), l'intérieur de la boulangerie et l'intérieur du bus.
// Même moteur que les autres (caméra 3D + plaques + boîtes), mais des volumes simples et beaucoup de couches.

export const DefsVille = ({cam, id = 'vi'}) => (
  <defs>
    <linearGradient id={`${id}-ciel`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#5aaef0" />
      <stop offset="0.6" stopColor="#a8d8ff" />
      <stop offset="1" stopColor="#f2f6ff" />
    </linearGradient>
    <radialGradient id={`${id}-soleil`}>
      <stop offset="0" stopColor="#fffbe8" stopOpacity="1" />
      <stop offset="0.25" stopColor="#ffe9a8" stopOpacity="0.6" />
      <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-tache`}>
      <stop offset="0" stopColor="#fff2c8" stopOpacity="0.75" />
      <stop offset="0.6" stopColor="#ffe0a0" stopOpacity="0.25" />
      <stop offset="1" stopColor="#ffd890" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-ombre`}>
      <stop offset="0" stopColor="#1a1020" stopOpacity="0.45" />
      <stop offset="1" stopColor="#1a1020" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-brume`} cx={cam.fuite[0]} cy={cam.fuite[1]} r="1100" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="#fff4e0" stopOpacity="0.35" />
      <stop offset="0.6" stopColor="#fff4e0" stopOpacity="0.08" />
      <stop offset="1" stopColor="#fff4e0" stopOpacity="0" />
    </radialGradient>
    {['#ff4a8a', '#4ad8ff', '#ffd23a', '#8a5aff', '#3aff8a'].map((c, k) => (
      <radialGradient key={k} id={`${id}-fete${k}`}>
        <stop offset="0" stopColor={c} stopOpacity="0.8" />
        <stop offset="0.4" stopColor={c} stopOpacity="0.3" />
        <stop offset="1" stopColor={c} stopOpacity="0" />
      </radialGradient>
    ))}
  </defs>
);

// un arbre, une plante (billboards dessinés en 2D)
const billboard = (cam, x, y, z, contenu, key, taille = 1) => {
  if (!cam.visible(z, x, y) || cam.profondeur(z, x, y) < 0.25) return null;
  const [px, py] = cam.proj(x, y, z);
  return (
    <g key={key} transform={`translate(${px} ${py}) scale(${cam.scale(z, x, y) * taille})`}>
      {contenu}
    </g>
  );
};
const ARBRE = (k) => (
  <g>
    <ellipse cx="0" cy="0" rx="260" ry="50" fill="#2a3a20" opacity="0.35" />
    <path d="M-30,0 L-22,-900 L22,-900 L30,0 Z" fill="#6a4a2a" />
    {[[0, -1300, 380], [-260, -1100, 280], [250, -1120, 300], [-120, -1550, 280], [160, -1520, 260]].map(([x, y, r], j) => (
      <circle key={j} cx={x} cy={y} r={r} fill={['#4aa84a', '#5ab85a', '#3a983a'][(j + k) % 3]} />
    ))}
    <circle cx="-80" cy="-1450" r="120" fill="#7ad86a" opacity="0.6" />
  </g>
);
const PLANTE = () => (
  <g>
    <path d="M-90,0 L-110,-200 L110,-200 L90,0 Z" fill="#e8743a" />
    {[-60, -20, 30, 70, 0].map((a, j) => (
      <ellipse key={j} cx={Math.sin((a * Math.PI) / 180) * 160} cy={-330 - Math.cos((a * Math.PI) / 180) * 120} rx="60" ry="150" fill={j % 2 ? '#3a9a5a' : '#4ab86a'} transform={`rotate(${a} ${Math.sin((a * Math.PI) / 180) * 160} ${-330 - Math.cos((a * Math.PI) / 180) * 120})`} />
    ))}
  </g>
);
// un vélo (billboard)
const VELO = () => (
  <g stroke="#1a1a22" strokeWidth="16" fill="none">
    <circle cx="-230" cy="-180" r="170" />
    <circle cx="230" cy="-180" r="170" />
    <path d="M-230,-180 L-60,-420 L170,-420 L230,-180 M-60,-420 L0,-180 L170,-420 M-80,-470 L-20,-470 M170,-420 L150,-520 L220,-530" stroke="#e8302a" />
  </g>
);

// ===================== la chambre (le matin, plein soleil) =====================
export const CH = {x: 1400, plaf: -900, z0: 0, z1: 5};
export const LIT = {x0: -1250, x1: -150, z0: 2.6, z1: 4.95};
export const chambreJour = (cam, f, {soleil = 1} = {}) => {
  const {x: X, plaf: PL, z0: Z0, z1: Z1} = CH;
  const fond = [];
  fond.push(<DefsGare key="dg" cam={cam} />);
  fond.push(<DefsVille key="dv" cam={cam} />);
  fond.push(<rect key="noir" width="1080" height="1920" fill="#2a2228" />);
  fond.push(quad(cam, [[-X, PL, Z0], [X, PL, Z0], [X, PL, Z1], [-X, PL, Z1]], '#f6efe6', 'plaf'));
  fond.push(quad(cam, [[-X, PL, Z1], [X, PL, Z1], [X, SOL, Z1], [-X, SOL, Z1]], '#f4bfa0', 'fond'));
  fond.push(quad(cam, [[-X, PL, Z0], [-X, PL, Z1], [-X, SOL, Z1], [-X, SOL, Z0]], '#9ed6bc', 'mg'));
  fond.push(quad(cam, [[X, PL, Z0], [X, PL, Z1], [X, SOL, Z1], [X, SOL, Z0]], '#c6b2ee', 'md'));
  fond.push(quad(cam, [[-X, PL, Z0], [X, PL, Z0], [X, SOL, Z0], [-X, SOL, Z0]], '#e8b896', 'av'));
  // plinthes blanches
  [[-X + 2, 1], [X - 2, -1]].forEach(([x, s], k) => fond.push(quad(cam, [[x, SOL - 60, Z0], [x, SOL - 60, Z1], [x, SOL, Z1], [x, SOL, Z0]], '#ffffff', `pl${k}`)));
  fond.push(quad(cam, [[-X, SOL - 60, Z1 - 0.002], [X, SOL - 60, Z1 - 0.002], [X, SOL, Z1 - 0.002], [-X, SOL, Z1 - 0.002]], '#ffffff', 'plf'));
  // parquet
  fond.push(quad(cam, [[-X, SOL, Z0], [X, SOL, Z0], [X, SOL, Z1], [-X, SOL, Z1]], '#cf9a62', 'sol'));
  for (let x = -X + 180; x < X; x += 180) fond.push(ligne(cam, [x, SOL - 1, Z0], [x, SOL - 1, Z1], lw(cam, 4, [x, SOL, 2.5]), '#a8743e', `lx${x}`, 0.7));
  // la fenêtre (mur du fond) : ciel, immeubles au loin, soleil, rideaux jaunes
  const W = {x0: 250, x1: 1150, y0: -680, y1: -40};
  fond.push(plaque(cam, [W.x0, W.y0, Z1 - 0.004], [1, 0, 0], [0, 1, 0], W.x1 - W.x0, W.y1 - W.y0,
    <g>
      <rect width="900" height="640" fill="url(#vi-ciel)" />
      <circle cx="700" cy="140" r="200" fill="url(#vi-soleil)" />
      {[[80, 120, 1], [420, 80, 0.8]].map(([x, y, s], k) => <g key={k} transform={`translate(${x + ((f * 0.6) % 900) - 100} ${y}) scale(${s})`} fill="#fff" opacity="0.9"><ellipse cx="0" cy="0" rx="90" ry="40" /><ellipse cx="60" cy="-20" rx="70" ry="45" /><ellipse cx="-50" cy="-10" rx="60" ry="35" /></g>)}
      {[[0, 380, 160, '#e8c8a8'], [160, 300, 190, '#f2a088'], [350, 420, 140, '#c8d8e8'], [490, 340, 200, '#f6d8a0'], [690, 400, 210, '#b8a8d8']].map(([x, y, w, c], k) => (
        <g key={k}>
          <rect x={x} y={y} width={w} height={640 - y} fill={c} />
          {[...Array(6)].map((_, j) => <rect key={j} x={x + 20 + (j % 3) * (w / 3.4)} y={y + 30 + Math.floor(j / 3) * 80} width="26" height="40" fill="#8ab8e8" opacity="0.8" />)}
        </g>
      ))}
    </g>, 'vitre'));
  [[W.x0, W.y0, W.x1, W.y0 + 30], [W.x0, W.y1 - 30, W.x1, W.y1], [W.x0, W.y0, W.x0 + 30, W.y1], [W.x1 - 30, W.y0, W.x1, W.y1], [(W.x0 + W.x1) / 2 - 15, W.y0, (W.x0 + W.x1) / 2 + 15, W.y1]].forEach(([a, b, c, d], k) =>
    fond.push(quad(cam, [[a, b, Z1 - 0.006], [c, b, Z1 - 0.006], [c, d, Z1 - 0.006], [a, d, Z1 - 0.006]], '#ffffff', `cad${k}`)),
  );
  [[W.x0 - 220, W.x0 + 40], [W.x1 - 40, W.x1 + 220]].forEach(([a, b], k) => {
    fond.push(quad(cam, [[a, W.y0 - 80, Z1 - 0.01], [b, W.y0 - 80, Z1 - 0.01], [b + (k ? 30 : -30), W.y1 + 160, Z1 - 0.01], [a + (k ? 30 : -30), W.y1 + 160, Z1 - 0.01]], '#ffd23a', `rid${k}`));
    for (let j = 1; j < 4; j++) fond.push(ligne(cam, [a + j * 65, W.y0 - 80, Z1 - 0.012], [a + j * 65 + (k ? 20 : -20), W.y1 + 160, Z1 - 0.012], lw(cam, 6, [a, -300, Z1]), '#e8b020', `rp${k}${j}`, 0.7));
  });
  fond.push(ligne(cam, [W.x0 - 260, W.y0 - 100, Z1 - 0.01], [W.x1 + 260, W.y0 - 100, Z1 - 0.01], lw(cam, 16, [700, W.y0, Z1]), '#6a4a2a', 'tringle'));
  // affiches, cadres, guirlande lumineuse
  fond.push(plaque(cam, [-X + 3, -720, 1.2], [0, 0, 1], [0, 1, 0], 900, 600, <g><rect width="900" height="600" fill="#1a1a3a" /><circle cx="450" cy="300" r="220" fill="#ff6a5b" /><path d="M150,600 L450,180 L750,600 Z" fill="#ffd23a" opacity="0.9" /></g>, 'af1'));
  fond.push(plaque(cam, [-X + 3, -760, 3.0], [0, 0, 1], [0, 1, 0], 600, 760, <g><rect width="600" height="760" fill="#f4f0e8" /><rect x="40" y="40" width="520" height="520" fill="#4ab0e8" /><circle cx="300" cy="300" r="140" fill="#fff" /><rect x="40" y="600" width="400" height="40" fill="#222" /></g>, 'af2'));
  fond.push(plaque(cam, [X - 3, -700, 3.8], [0, 0, -1], [0, 1, 0], 700, 500, <g><rect width="700" height="500" fill="#2a2a2a" /><rect x="30" y="30" width="640" height="440" fill="#e8a0c8" /><path d="M30,470 L250,200 L420,380 L520,280 L670,470 Z" fill="#8a3a8a" /></g>, 'af3'));
  for (let k = 0; k < 14; k++) {
    const x = -1100 + k * 100;
    const y = -820 + Math.sin(k * 0.9) * 30 + 40 * Math.sin((k / 13) * Math.PI);
    fond.push(halo(cam, x, y, Z1 - 0.02, 60, `vi-fete${k % 5}`, 0.7 + 0.3 * Math.sin(f / 8 + k), `gu${k}`));
  }
  // rayon de soleil qui entre par la fenêtre et se pose au sol
  if (soleil > 0) {
    fond.push(quad(cam, [[W.x0, W.y0, Z1], [W.x1, W.y0, Z1], [W.x1 - 300, SOL, 1.6], [W.x0 - 500, SOL, 2.0]], '#fff4c8', 'rayon', 0.18 * soleil));
    fond.push(quad(cam, [[W.x0 - 500, SOL - 1, 2.0], [W.x1 - 300, SOL - 1, 1.6], [W.x1 - 100, SOL - 1, 3.6], [W.x0 - 200, SOL - 1, 4.0]], '#fff0b8', 'flaque', 0.4 * soleil));
    for (let k = 0; k < 14; k++) {
      const x = W.x0 - 200 + random(`pp${k}`) * 900 + Math.sin(f / 30 + k) * 40;
      const y = -500 + random(`py${k}`) * 800 + ((f * 1.5 + k * 60) % 300);
      fond.push(halo(cam, x, y, 2.5 + random(`pz${k}`) * 2, 18, 'vi-soleil', 0.6, `pou${k}`));
    }
  }
  fond.push(tache(cam, 100, SOL - 2, 2.2, 700, 0.8, 'vi-tache', 0.35, 'tapis-l'));
  // tapis rond coloré
  fond.push(quad(cam, [...Array(24)].map((_, k) => [200 + Math.cos((k / 24) * 6.283) * 650, SOL - 2, 2.0 + Math.sin((k / 24) * 6.283) * 0.7]), '#ff7a5a', 'tapis'));
  fond.push(quad(cam, [...Array(24)].map((_, k) => [200 + Math.cos((k / 24) * 6.283) * 450, SOL - 3, 2.0 + Math.sin((k / 24) * 6.283) * 0.48]), '#ffd23a', 'tapis2'));
  const items = [];
  // le lit
  const {x0, x1, z0, z1} = LIT;
  items.push({z: (z0 + z1) / 2, x: (x0 + x1) / 2, y: 200, el: <g key="lit">
    {boiteG(cam, x0, x1, 250, SOL, z0, z1, ['#8a5a3a', '#7a4a2a', '#6a3e22'], 'cadre')}
    {boiteG(cam, x0 + 20, x1 - 20, 170, 250, z0 + 0.02, z1 - 0.02, ['#ffffff', '#eeeeee', '#e4e4e4'], 'mat')}
    {boiteG(cam, x0 + 10, x1 - 10, 120, 175, z0, z1 - 0.65, ['#5ab0e8', '#4a98d0', '#4090c8'], 'couette')}
    {boiteG(cam, x0 + 80, x0 + 480, 80, 170, z1 - 0.55, z1 - 0.1, ['#fff8f0', '#f4ece4', '#ece4dc'], 'or1')}
    {boiteG(cam, x0 + 560, x1 - 80, 80, 170, z1 - 0.55, z1 - 0.1, ['#ffd8c8', '#f4c8b8', '#ecc0b0'], 'or2')}
    {boiteG(cam, x0, x1, -250, SOL, z1 - 0.06, z1, ['#8a5a3a', '#7a4a2a', '#6a3e22'], 'tete')}
  </g>});
  // table de nuit + lampe allumée
  items.push({z: 4.6, x: 150, y: 200, el: <g key="tdn">
    {boiteG(cam, -20, 300, 120, SOL, 4.3, 4.9, ['#f4e0c0', '#e8d0a8', '#dcc498'], 'b')}
    {boiteG(cam, 90, 190, -40, 120, 4.55, 4.65, ['#ffd27a', '#ffc85a', '#f0b84a'], 'l')}
    {halo(cam, 140, -60, 4.6, 600, 'ga-chaud', 0.5, 'lh')}
  </g>});
  items.push({z: 4.4, x: 1150, el: billboard(cam, 1150, SOL, 4.4, PLANTE(), 'plante', 1.1)});
  // étagère avec des livres sur le mur gauche
  items.push({z: 2.0, x: -X + 150, y: -300, el: <g key="et">
    {boiteG(cam, -X, -X + 260, -330, -300, 1.4, 2.6, ['#8a5a3a', '#7a4a2a', '#6a3e22'], 'p')}
    {[...Array(9)].map((_, j) => boiteG(cam, -X + 20, -X + 220, -330 - 120 - 40 * (j % 3), -330, 1.45 + j * 0.12, 1.55 + j * 0.12, [['#e8302a', '#2a6ad8', '#2aa84a', '#ffb02a'][j % 4], ['#c82a24', '#2458b8', '#249040', '#e09a24'][j % 4], ['#b02420', '#204ea0', '#208038', '#c88a20'][j % 4]], `li${j}`))}
  </g>});
  return {fond: <g>{fond}</g>, items, brume: null};
};

// ===================== la rue commerçante (de jour) =====================
// Façades à gauche (X −1600, boutiques au rez-de-chaussée), trottoir X −1600 → −100, chaussée X 0 → 2600, trottoir d'en face et immeubles (X 3800).
export const FAC = -1600;
export const BOUTIQUES = [
  {z0: 1, z1: 5, nom: 'CAFÉ', c: '#2a6a4a', vit: '#ffe8c0'},
  {z0: 6, z1: 10.5, nom: 'BOULANGERIE', c: '#8a3a2a', vit: '#ffe0a8', pain: true},
  {z0: 12, z1: 18, nom: 'FITNESS', c: '#1c1c2a', vit: '#dfe8f0', salle: true},
  {z0: 19.5, z1: 23.5, nom: 'FLEURS', c: '#c84a7a', vit: '#ffe0ec', fleurs: true},
  {z0: 25, z1: 29, nom: 'PIZZA', c: '#c8501a', vit: '#ffd8a0'},
  {z0: 30.5, z1: 35, nom: 'LIBRAIRIE', c: '#2a4a8a', vit: '#fff0d0'},
];
export const SALLE = {x: -3400, miroir: -3398, z0: 12.4, z1: 17.6};
const IMMEUBLES = ['#f2d1a6', '#e8a88c', '#b8d8e8', '#f0e0b0', '#c8b0d8', '#a8d0b0', '#f4c0c0', '#e8d8c0'];
const VOITURES = [[2.5, '#e8302a'], [9.5, '#2a6ad8'], [17, '#f4f4f0'], [27, '#ffb02a'], [36, '#3a3a44']];
// salle : {gars: props du perso musclé} ; passants : [{x, z, ...props}]
export const rueJour = (cam, f, {salle = null, passants = [], boulangere = null} = {}) => {
  const fond = [];
  const Z0 = -5;
  const Z1 = 60;
  fond.push(<DefsGare key="dg" cam={cam} />);
  fond.push(<DefsVille key="dv" cam={cam} />);
  fond.push(<rect key="ciel" width="1080" height="1920" fill="url(#vi-ciel)" />);
  fond.push(halo(cam, 30000, -40000, 80, 9000, 'vi-soleil', 1, 'soleil'));
  // immeubles d'en face (loin)
  for (let k = 0; k < 14; k++) {
    const z0 = Z0 + k * 5;
    const h = -4200 - 1400 * random(`ih${k}`);
    const c = IMMEUBLES[(k + 3) % IMMEUBLES.length];
    fond.push(quad(cam, [[3800, h, z0], [3800, h, z0 + 5], [3800, SOL, z0 + 5], [3800, SOL, z0]], c, `if${k}`));
    for (let e = 0; e < 4; e++) for (let w = 0; w < 3; w++) {
      const y = -600 - e * 1000;
      if (y < h + 300) continue;
      fond.push(quad(cam, [[3798, y - 420, z0 + 0.8 + w * 1.4], [3798, y - 420, z0 + 1.6 + w * 1.4], [3798, y, z0 + 1.6 + w * 1.4], [3798, y, z0 + 0.8 + w * 1.4]], '#8ab8e0', `iw${k}${e}${w}`));
    }
  }
  // chaussée, marquages, trottoirs
  fond.push(quad(cam, [[0, SOL + 40, Z0], [2600, SOL + 40, Z0], [2600, SOL + 40, Z1], [0, SOL + 40, Z1]], '#55555c', 'route'));
  for (let z = Z0; z < Z1; z += 3) fond.push(quad(cam, [[1280, SOL + 39, z], [1320, SOL + 39, z], [1320, SOL + 39, z + 1.5], [1280, SOL + 39, z + 1.5]], '#f4f4f0', `mk${z}`));
  for (let k = 0; k < 7; k++) fond.push(quad(cam, [[150, SOL + 39, 31 + k * 0.4], [2450, SOL + 39, 31 + k * 0.4], [2450, SOL + 39, 31.2 + k * 0.4], [150, SOL + 39, 31.2 + k * 0.4]], '#f4f4f0', `pp${k}`));
  fond.push(quad(cam, [[2600, SOL, Z0], [3800, SOL, Z0], [3800, SOL, Z1], [2600, SOL, Z1]], '#d8cfc4', 'trot2'));
  fond.push(quad(cam, [[FAC, SOL, Z0], [-100, SOL, Z0], [-100, SOL, Z1], [FAC, SOL, Z1]], '#e2d8cc', 'trot'));
  for (let z = Math.max(Z0, Math.floor(cam.z) - 3); z < Math.min(Z1, cam.z + 20); z += 0.5) fond.push(ligne(cam, [FAC, SOL - 1, z], [-100, SOL - 1, z], lw(cam, 3, [-800, SOL, z]), '#bfb2a2', `dt${z}`, 0.6));
  [-1100, -600].forEach((x) => fond.push(ligne(cam, [x, SOL - 1, Z0], [x, SOL - 1, Z1], lw(cam, 3, [x, SOL, cam.z + 3]), '#bfb2a2', `dx${x}`, 0.6)));
  fond.push(quad(cam, [[-100, SOL, Z0], [0, SOL, Z0], [0, SOL, Z1], [-100, SOL, Z1]], '#f4f0ea', 'bord'));
  if (cam.x > 0) fond.push(quad(cam, [[0, SOL, Z0], [0, SOL + 40, Z0], [0, SOL + 40, Z1], [0, SOL, Z1]], '#bab0a4', 'bordf'));
  // ombres des arbres sur le trottoir
  for (let z = 3; z < Z1; z += 12) fond.push(tache(cam, -150, SOL - 2, z + 0.6, 650, 0.6, 'vi-ombre', 0.8, `oa${z}`));
  // façades : étages (couleurs, fenêtres, balcons) puis boutiques
  for (let k = 0; k < 13; k++) {
    const z0 = Z0 + k * 5;
    const c = IMMEUBLES[k % IMMEUBLES.length];
    const h = -4600 - 900 * random(`fh${k}`);
    fond.push(quad(cam, [[FAC, h, z0], [FAC, h, z0 + 5.02], [FAC, -700, z0 + 5.02], [FAC, -700, z0]], c, `fa${k}`));
    if (Math.abs(z0 + 2.5 - cam.z) > 26) continue;
    for (let e = 0; e < 3; e++) for (let w = 0; w < 3; w++) {
      const y = -1100 - e * 1100;
      const za = z0 + 0.7 + w * 1.4;
      fond.push(quad(cam, [[FAC + 2, y - 520, za], [FAC + 2, y - 520, za + 0.8], [FAC + 2, y, za + 0.8], [FAC + 2, y, za]], '#9cc8ee', `fw${k}${e}${w}`));
      fond.push(quad(cam, [[FAC + 3, y - 520, za + 0.1], [FAC + 3, y - 520, za + 0.25], [FAC + 3, y, za + 0.1], [FAC + 3, y, za]], '#ffffff', `fr${k}${e}${w}`, 0.35));
      [za - 0.22, za + 0.8].forEach((zv, j) => fond.push(quad(cam, [[FAC + 3, y - 520, zv], [FAC + 3, y - 520, zv + 0.22], [FAC + 3, y, zv + 0.22], [FAC + 3, y, zv]], ['#3a8a5a', '#2a6aa8', '#c8501a'][k % 3], `vo${k}${e}${w}${j}`)));
    }
    fond.push(quad(cam, [[FAC + 1, -760, z0], [FAC + 1, -760, z0 + 5.02], [FAC + 1, -700, z0 + 5.02], [FAC + 1, -700, z0]], '#ffffff', `cor${k}`, 0.8));
  }
  BOUTIQUES.forEach((b, k) => {
    fond.push(quad(cam, [[FAC + 2, -700, b.z0], [FAC + 2, -700, b.z1], [FAC + 2, SOL, b.z1], [FAC + 2, SOL, b.z0]], b.c, `bf${k}`));
    // enseigne
    fond.push(plaque(cam, [FAC + 4, -680, b.z0 + 0.2], [0, 0, 1], [0, 1, 0], (b.z1 - b.z0 - 0.4) * 1000, 150,
      <g><rect width={(b.z1 - b.z0 - 0.4) * 1000} height="150" fill={b.c} /><text x={((b.z1 - b.z0 - 0.4) * 1000) / 2} y="112" textAnchor="middle" fontFamily="'DejaVu Sans', Arial" fontWeight="900" fontSize="110" fill="#fff8e8" letterSpacing="10">{b.nom}</text></g>, `en${k}`));
    // vitrine (intérieur éclairé), porte
    const va = b.z0 + 0.3;
    const vb = b.z1 - 1.3;
    const vitre = [[FAC + 3, -470, va], [FAC + 3, -470, vb], [FAC + 3, 300, vb], [FAC + 3, 300, va]];
    if (b.salle) {
      // l'intérieur de la salle de sport, vu par la vitrine
      const p = cam.poly(vitre);
      if (p && cam.x > FAC) {
        const dedans = salleSport(cam, f, salle || {});
        fond.push(<g key="salle"><defs><clipPath id="vi-salle"><polygon points={p} /></clipPath></defs><g clipPath="url(#vi-salle)">{dedans}</g></g>);
      }
    } else {
      fond.push(quad(cam, vitre, b.vit, `vt${k}`));
      fond.push(halo(cam, FAC + 10, -100, (va + vb) / 2, 1500, 'ga-chaud', 0.5, `vh${k}`));
      if (b.pain) {
        fond.push(plaque(cam, [FAC + 5, 0, va + 0.2], [0, 0, 1], [0, 1, 0], (vb - va - 0.4) * 1000, 280,
          <g>{[...Array(10)].map((_, j) => <ellipse key={j} cx={120 + j * 290} cy={140 + (j % 2) * 60} rx="130" ry="60" fill={['#d8903a', '#c87a2a', '#e8a85a'][j % 3]} />)}{[...Array(6)].map((_, j) => <rect key={j} x={100 + j * 480} y={-120} width="360" height="50" rx="25" fill="#e0a050" transform={`rotate(-20 ${280 + j * 480} -95)`} />)}</g>, `pa${k}`));
        if (boulangere) {
          // la boulangère derrière sa vitrine
          const pv = cam.poly(vitre);
          if (pv) fond.push(<g key="blg"><defs><clipPath id="vi-bv"><polygon points={pv} /></clipPath></defs><g clipPath="url(#vi-bv)"><Perso cam={cam} id="blg-v" x={FAC - 500} z={(va + vb) / 2} y={SOL + 120} lum={1} {...boulangere} /></g></g>);
        }
      }
      if (b.fleurs) for (let j = 0; j < 12; j++) fond.push(halo(cam, FAC + 8, 150 - (j % 3) * 90, va + 0.2 + j * 0.2, 120, `vi-fete${j % 5}`, 0.9, `fl${k}${j}`));
      fond.push(quad(cam, [[FAC + 4, -470, va + 0.05], [FAC + 4, -470, va + 0.6], [FAC + 4, 300, va + 0.3], [FAC + 4, 300, va + 0.05]], '#ffffff', `rf${k}`, 0.25));
    }
    fond.push(quad(cam, [[FAC + 3, -500, vb + 0.15], [FAC + 3, -500, b.z1 - 0.2], [FAC + 3, SOL, b.z1 - 0.2], [FAC + 3, SOL, vb + 0.15]], '#3a2a20', `po${k}`));
    fond.push(quad(cam, [[FAC + 4, -460, vb + 0.25], [FAC + 4, -460, b.z1 - 0.3], [FAC + 4, 250, b.z1 - 0.3], [FAC + 4, 250, vb + 0.25]], b.vit, `pv${k}`, 0.8));
    // cadre de la vitrine
    [[-480, -470], [300, 310]].forEach(([a, c2], j) => fond.push(quad(cam, [[FAC + 4, a, va], [FAC + 4, a, vb], [FAC + 4, c2, vb], [FAC + 4, c2, va]], '#2a2a2a', `cv${k}${j}`)));
  });
  fond.push(<rect key="brume" width="1080" height="1920" fill="url(#vi-brume)" />);
  const items = [];
  // stores (bannes rayées) au-dessus des vitrines
  BOUTIQUES.forEach((b, k) => {
    if (b.salle) return;
    const L = (b.z1 - b.z0 - 0.2) * 1000;
    const ay = [450 / 474, 150 / 474, 0];
    items.push({z: (b.z0 + b.z1) / 2, x: FAC + 230, y: -500, el: plaque(cam, [FAC + 4, -570, b.z0 + 0.1], [0, 0, 1], ay, L, 474,
      <g>{[...Array(Math.ceil(L / 250))].map((_, j) => <rect key={j} x={j * 250} width="125" height="474" fill={j % 2 ? '#ffffff' : b.c} />)}<path d={`M0,474 ${[...Array(Math.ceil(L / 125))].map((_, j) => `Q${j * 125 + 62},520 ${(j + 1) * 125},474`).join(' ')}`} fill={b.c} /></g>, `st${k}`)});
  });
  // arbres, vélos, bancs, lampadaires
  for (let z = 3; z < Z1; z += 12) {
    items.push({z, x: -250, el: billboard(cam, -250, SOL, z, ARBRE(z), `ar${z}`, 1.15)});
    items.push({z: z + 2.6, x: -350, el: <g key={`la${z}`}>{ligne(cam, [-350, SOL, z + 2.6], [-350, -1900, z + 2.6], lw(cam, 40, [-350, -700, z + 2.6]), '#2a3a3a', 'm')}{boiteG(cam, -480, -220, -1990, -1900, z + 2.5, z + 2.7, ['#2a3a3a', '#2a3a3a', '#203030'], 't')}</g>});
  }
  [[-700, 4.2], [-750, 24.5]].forEach(([x, z], k) => items.push({z, x, el: billboard(cam, x, SOL, z, VELO(), `ve${k}`, 1)}));
  [27, 40].forEach((z, k) => items.push({z, x: -500, y: 300, el: <g key={`bc${k}`}>{boiteG(cam, -600, -400, 230, 270, z - 0.8, z + 0.8, ['#2a6a4a', '#245a40', '#205038'], 's')}{boiteG(cam, -620, -590, 0, 230, z - 0.8, z + 0.8, ['#2a6a4a', '#245a40', '#205038'], 'd')}{boiteG(cam, -580, -420, 270, SOL, z - 0.7, z - 0.6, ['#1a1a1a', '#1a1a1a', '#1a1a1a'], 'p1')}{boiteG(cam, -580, -420, 270, SOL, z + 0.6, z + 0.7, ['#1a1a1a', '#1a1a1a', '#1a1a1a'], 'p2')}</g>}));
  // voitures garées (boîtes) le long du trottoir
  VOITURES.forEach(([z, c], k) => {
    items.push({z, x: 600, y: 200, el: <g key={`vo${k}`}>
      {boiteG(cam, 150, 1050, 60, SOL + 10, z - 2, z + 2, [c, c, c], 'c')}
      {boiteG(cam, 220, 980, -330, 60, z - 1.0, z + 0.9, ['#2a3440', '#9cc8ee', '#8ab8e0'], 'h')}
      {[[z - 1.3], [z + 1.3]].map(([zz], j) => boiteG(cam, 140, 170, 280, SOL + 40, zz - 0.35, zz + 0.35, ['#111', '#111', '#111'], `r${j}`))}
    </g>});
  });
  // passants
  passants.forEach((p, k) => {
    const {x, z, id, el, ...pose} = p;
    items.push({z, x, el: el || <Perso cam={cam} id={id || `ps${k}`} x={x} z={z} lum={1.05} ombre={0.3} {...pose} />});
  });
  return {fond: <g>{fond}</g>, items, brume: null};
};

// l'intérieur de la salle de sport (vu par la vitrine) : miroir au fond, haltères, lumière froide, et le gars qui pose
const salleSport = (cam, f, {gars = null, reflet = true}) => {
  const {x: XS, miroir: XM, z0, z1} = SALLE;
  const els = [];
  els.push(<rect key="n" width="1080" height="1920" fill="#20242c" />);
  els.push(quad(cam, [[FAC, -700, z0], [XS, -700, z0], [XS, -700, z1], [FAC, -700, z1]], '#2a2e36', 'pl'));
  els.push(quad(cam, [[FAC, SOL, z0], [XS, SOL, z0], [XS, SOL, z1], [FAC, SOL, z1]], '#3a3a42', 'so'));
  els.push(quad(cam, [[FAC, -700, z0], [XS, -700, z0], [XS, SOL, z0], [FAC, SOL, z0]], '#e8302a', 'm0'));
  els.push(quad(cam, [[FAC, -700, z1], [XS, -700, z1], [XS, SOL, z1], [FAC, SOL, z1]], '#e8302a', 'm1'));
  els.push(quad(cam, [[XS, -700, z0], [XS, -700, z1], [XS, SOL, z1], [XS, SOL, z0]], '#3a3e48', 'mf'));
  // le miroir : on y voit la salle à l'envers et le reflet du gars
  const mp = cam.poly([[XM, -520, 13.6], [XM, -520, 16.4], [XM, 330, 16.4], [XM, 330, 13.6]]);
  if (mp) {
    els.push(<polygon key="mir" points={mp} fill="#a8c0d0" />);
    if (gars && reflet) {
      const {x, z, ...pose} = gars;
      els.push(<g key="ref"><defs><clipPath id="vi-mir"><polygon points={mp} /></clipPath></defs><g clipPath="url(#vi-mir)" opacity="0.92"><Perso cam={cam} id="gars-r" x={2 * XM - x} z={z} lum={1} {...pose} dos={!pose.dos} /></g></g>);
    }
    els.push(<polygon key="mir2" points={mp} fill="#ffffff" opacity="0.12" />);
  }
  for (let z = z0 + 0.6; z < z1; z += 1.2) els.push(halo(cam, (FAC + XS) / 2, -690, z, 900, 'ga-froid', 0.5, `ne${z}`));
  // racks d'haltères
  [z0 + 0.7, z1 - 0.7].forEach((z, k) => {
    els.push(boiteG(cam, XS + 50, XS + 300, 100, SOL, z - 0.4, z + 0.4, ['#1a1a1a', '#222', '#1a1a1a'], `rk${k}`));
    for (let j = 0; j < 5; j++) els.push(boiteG(cam, XS + 80, XS + 260, 40, 100, z - 0.35 + j * 0.16, z - 0.25 + j * 0.16, ['#4a4a52', '#5a5a62', '#3a3a42'], `hl${k}${j}`));
  });
  // sol en dalles de caoutchouc, affiches de motivation, tapis de course
  for (let z = z0; z < z1; z += 0.5) els.push(ligne(cam, [FAC, SOL - 1, z], [XS, SOL - 1, z], lw(cam, 4, [-2500, SOL, z]), '#2a2a30', `dl${z}`));
  els.push(quad(cam, [[FAC - 200, -600, z0 + 0.002], [FAC - 900, -600, z0 + 0.002], [FAC - 900, -100, z0 + 0.002], [FAC - 200, -100, z0 + 0.002]], '#ffd23a', 'af1'));
  els.push(quad(cam, [[FAC - 1000, -600, z1 - 0.002], [FAC - 1600, -600, z1 - 0.002], [FAC - 1600, -150, z1 - 0.002], [FAC - 1000, -150, z1 - 0.002]], '#2ad8ff', 'af2'));
  els.push(halo(cam, XS + 20, -620, (z0 + z1) / 2, 1400, 'vi-fete1', 0.5, 'neon'));
  [z0 + 1.6, z1 - 1.6].forEach((z, j) => {
    els.push(boiteG(cam, FAC - 1200, FAC - 500, 250, SOL, z - 0.35, z + 0.35, ['#2a2a30', '#3a3a42', '#222228'], `tc${j}`));
    els.push(boiteG(cam, FAC - 560, FAC - 500, -250, 250, z - 0.3, z + 0.3, ['#2a2a30', '#e8302a', '#c82a24'], `tm${j}`));
  });
  if (gars) {
    const {x, z, ...pose} = gars;
    els.push(<Perso key="gars" cam={cam} id="gars" x={x} z={z} lum={1} {...pose} />);
  }
  return <g>{els}</g>;
};

// ===================== l'intérieur de la boulangerie =====================
export const BO = {x: 1300, plaf: -850, z0: 0, z1: 5.5, comptoir: 3.0};
export const boulangerieInt = (cam, f, {} = {}) => {
  const {x: X, plaf: PL, z0: Z0, z1: Z1, comptoir: ZC} = BO;
  const fond = [];
  fond.push(<DefsGare key="dg" cam={cam} />);
  fond.push(<DefsVille key="dv" cam={cam} />);
  fond.push(<rect key="n" width="1080" height="1920" fill="#3a2a20" />);
  fond.push(quad(cam, [[-X, PL, Z0], [X, PL, Z0], [X, PL, Z1], [-X, PL, Z1]], '#f8ecd8', 'pl'));
  for (let x = -X + 260; x < X; x += 520) fond.push(ligne(cam, [x, PL + 2, Z0], [x, PL + 2, Z1], lw(cam, 40, [x, PL, 3]), '#8a5a3a', `pt${x}`));
  fond.push(quad(cam, [[-X, PL, Z1], [X, PL, Z1], [X, SOL, Z1], [-X, SOL, Z1]], '#f4e2c4', 'fo'));
  fond.push(quad(cam, [[-X, PL, Z0], [-X, PL, Z1], [-X, SOL, Z1], [-X, SOL, Z0]], '#e8f0f4', 'mg'));
  for (let z = Z0; z < Z1; z += 0.25) for (let y = -400; y < SOL; y += 160) fond.push(quad(cam, [[-X + 1, y, z + 0.02], [-X + 1, y, z + 0.23], [-X + 1, y + 140, z + 0.23], [-X + 1, y + 140, z + 0.02]], (Math.round(z * 4) + y / 160) % 2 ? '#5a9ad8' : '#ffffff', `ca${z}${y}`, 0.85));
  fond.push(quad(cam, [[X, PL, Z0], [X, PL, Z1], [X, SOL, Z1], [X, SOL, Z0]], '#f0d8b8', 'md'));
  // mur de la vitrine (côté rue) : grande baie lumineuse et porte vitrée
  fond.push(quad(cam, [[-X, PL, Z0], [X, PL, Z0], [X, SOL, Z0], [-X, SOL, Z0]], '#8a3a2a', 'av'));
  fond.push(quad(cam, [[-1100, -650, Z0 + 0.01], [500, -650, Z0 + 0.01], [500, 250, Z0 + 0.01], [-1100, 250, Z0 + 0.01]], '#cfeaff', 'baie'));
  fond.push(quad(cam, [[700, -600, Z0 + 0.01], [1100, -600, Z0 + 0.01], [1100, SOL, Z0 + 0.01], [700, SOL, Z0 + 0.01]], '#bfe0f8', 'pv'));
  fond.push(halo(cam, -300, -200, Z0 + 0.05, 1800, 'vi-soleil', 0.5, 'baieh'));
  // fenêtre sur la rue (mur droit)
  fond.push(quad(cam, [[X - 1, -600, 0.6], [X - 1, -600, 2.4], [X - 1, 150, 2.4], [X - 1, 150, 0.6]], '#bfe4ff', 'fen'));
  fond.push(halo(cam, X - 10, -250, 1.5, 1600, 'vi-soleil', 0.6, 'fenh'));
  // sol en damier
  fond.push(quad(cam, [[-X, SOL, Z0], [X, SOL, Z0], [X, SOL, Z1], [-X, SOL, Z1]], '#e8dcc8', 'so'));
  for (let z = Z0; z < Z1; z += 0.3) for (let x = -X; x < X; x += 300) if ((Math.round(z / 0.3) + x / 300) % 2 === 0) fond.push(quad(cam, [[x, SOL - 1, z], [x + 300, SOL - 1, z], [x + 300, SOL - 1, z + 0.3], [x, SOL - 1, z + 0.3]], '#3a3a3a', `dm${z}${x}`, 0.85));
  // étagères à pain au fond, ardoise, horloge
  [-600, -250, 100].forEach((y, j) => {
    fond.push(quad(cam, [[-1000, y, Z1 - 0.01], [700, y, Z1 - 0.01], [700, y + 30, Z1 - 0.01], [-1000, y + 30, Z1 - 0.01]], '#8a5a3a', `eg${j}`));
    fond.push(plaque(cam, [-1000, y - 200, Z1 - 0.012], [1, 0, 0], [0, 1, 0], 1700, 200,
      <g>{[...Array(9)].map((_, k) => (j === 0 ? <rect key={k} x={40 + k * 185} y={10} width="40" height="190" rx="20" fill="#d8903a" transform={`rotate(${-12 + k * 3} ${60 + k * 185} 200)`} /> : <ellipse key={k} cx={95 + k * 185} cy="140" rx="85" ry="60" fill={['#c87a2a', '#d8903a', '#a8602a'][(k + j) % 3]} />))}</g>, `pn${j}`));
  });
  fond.push(plaque(cam, [800, -700, Z1 - 0.01], [1, 0, 0], [0, 1, 0], 450, 560,
    <g><rect width="450" height="560" fill="#1e2a22" stroke="#8a5a3a" strokeWidth="24" />{['PAIN', 'CROISSANT', 'ÉCLAIR', 'TARTE'].map((t, k) => <text key={k} x="40" y={110 + k * 115} fontFamily="'DejaVu Sans', Arial" fontWeight="700" fontSize="44" fill="#f4f0e8">{t}</text>)}</g>, 'ardoise'));
  // suspensions chaudes
  const items = [];
  [-650, 0, 650].forEach((x, j) => {
    items.push({z: 4.0, x, y: -500, el: <g key={`su${j}`}>
      {ligne(cam, [x, PL, 4.0], [x, -560, 4.0], lw(cam, 6, [x, -700, 4]), '#2a2a2a', 'f')}
      {boiteG(cam, x - 90, x + 90, -560, -480, 3.92, 4.08, ['#2a2a2a', '#2a3a2a', '#223022', '#ffd27a'], 'a')}
      {halo(cam, x, -470, 4.0, 900, 'ga-chaud', 0.55, 'h')}
    </g>});
    fond.push(tache(cam, x, SOL - 2, 3.6, 600, 0.7, 'vi-tache', 0.5, `ta${j}`));
  });
  // le comptoir, sa vitrine de pâtisseries et la caisse
  items.push({z: ZC + 0.3, x: 0, y: 200, el: <g key="cpt">
    {boiteG(cam, -1050, 950, 60, SOL, ZC, ZC + 0.6, ['#c8a07a', '#8a5a3a', '#7a4a2a'], 'b')}
    {plaque(cam, [-1000, 100, ZC - 0.005], [1, 0, 0], [0, 1, 0], 1900, 300, <g>{[...Array(10)].map((_, k) => <rect key={k} x={k * 190} width="95" height="300" fill="#7a4a2a" opacity="0.5" />)}</g>, 'lam')}
    {quad(cam, [[-1050, -200, ZC], [600, -200, ZC], [600, 60, ZC], [-1050, 60, ZC]], '#dff4ff', 'vit', 0.35)}
    {plaque(cam, [-1000, -120, ZC + 0.05], [1, 0, 0], [0, 1, 0], 1550, 170, <g>{[...Array(8)].map((_, k) => <g key={k}><ellipse cx={100 + k * 190} cy="120" rx="80" ry="45" fill={['#e8a85a', '#8a3a2a', '#ffd0e0', '#e8c060'][k % 4]} /><ellipse cx={100 + k * 190} cy="100" rx="60" ry="25" fill="#fff" opacity="0.4" /></g>)}</g>, 'pat')}
    {quad(cam, [[-1050, -200, ZC], [600, -200, ZC], [600, -200, ZC + 0.6], [-1050, -200, ZC + 0.6]], '#ffffff', 'vtop', 0.3)}
    {boiteG(cam, 650, 900, -150, 60, ZC + 0.1, ZC + 0.45, ['#2a2a2a', '#3a3a3a', '#222'], 'caisse')}
  </g>});
  return {fond: <g>{fond}</g>, items, brume: null};
};

// ===================== l'intérieur du bus =====================
// Bus de Z 0 à 10, X ±1150. Rangées de sièges (face à +Z) tous les 1,5 Z, des deux côtés de l'allée.
// La ville défile dehors (vitesse : unités Z par image).
export const BUS = {x: 1150, plaf: -820, z0: 0, z1: 10};
export const RANGS = [1.2, 2.7, 4.2, 5.7, 7.2];
export const busInt = (cam, f, {vitesse = 0.05} = {}) => {
  const {x: X, plaf: PL, z0: Z0, z1: Z1} = BUS;
  const fond = [];
  fond.push(<DefsGare key="dg" cam={cam} />);
  fond.push(<DefsVille key="dv" cam={cam} />);
  fond.push(<rect key="ciel" width="1080" height="1920" fill="url(#vi-ciel)" />);
  // dehors : façades et arbres qui défilent des deux côtés
  const dz = (f * vitesse) % 6;
  [-1, 1].forEach((s) => {
    for (let k = -2; k < 9; k++) {
      const z0 = k * 6 - dz;
      fond.push(quad(cam, [[s * 3200, -4200 - 600 * ((k + 20) % 3), z0], [s * 3200, -4200 - 600 * ((k + 20) % 3), z0 + 6.02], [s * 3200, SOL, z0 + 6.02], [s * 3200, SOL, z0]], IMMEUBLES[(k + 20 + (s > 0 ? 3 : 0)) % IMMEUBLES.length], `ex${s}${k}`));
      for (let e = 0; e < 3; e++) fond.push(quad(cam, [[s * 3198, -1300 - e * 1000, z0 + 1], [s * 3198, -1300 - e * 1000, z0 + 2.2], [s * 3198, -800 - e * 1000, z0 + 2.2], [s * 3198, -800 - e * 1000, z0 + 1]], '#8ab8e0', `ew${s}${k}${e}`));
      fond.push(billboard(cam, s * 1900, SOL, z0 + 3, ARBRE(k), `ea${s}${k}`, 1.1));
    }
  });
  // la caisse du bus, percée de grandes vitres
  const vitres = (s) => {
    const out = [];
    for (let z = Z0 + 0.4; z < Z1 - 0.5; z += 1.9) out.push([[s * X, -620, z], [s * X, -620, z + 1.7], [s * X, 40, z + 1.7], [s * X, 40, z]]);
    return out;
  };
  [-1, 1].forEach((s) => {
    fond.push(troue(cam, [[s * X, PL, Z0], [s * X, PL, Z1], [s * X, SOL, Z1], [s * X, SOL, Z0]], vitres(s), s < 0 ? '#e8e4dc' : '#dcd8d0', `pa${s}`));
    vitres(s).forEach((v, j) => {
      fond.push(quad(cam, v, '#ffffff', `rv${s}${j}`, 0.08));
      fond.push(quad(cam, [v[0], v[1], [v[1][0], 40, v[1][2]], [v[0][0], 40, v[0][2]]].map((p, q) => (q < 2 ? [p[0], p[1], p[2]] : p)), 'none', `cv${s}${j}`, 1, {stroke: '#3a3a40', strokeWidth: 4}));
    });
    fond.push(quad(cam, [[s * (X - 2), 40, Z0], [s * (X - 2), 40, Z1], [s * (X - 2), 120, Z1], [s * (X - 2), 120, Z0]], '#2a8ad8', `bd${s}`));
  });
  fond.push(quad(cam, [[-X, PL, Z0], [X, PL, Z0], [X, PL, Z1], [-X, PL, Z1]], '#eeeae2', 'pl'));
  fond.push(quad(cam, [[-200, PL + 2, Z0], [200, PL + 2, Z0], [200, PL + 2, Z1], [-200, PL + 2, Z1]], '#fffbe8', 'tube'));
  fond.push(quad(cam, [[-X, SOL, Z0], [X, SOL, Z0], [X, SOL, Z1], [-X, SOL, Z1]], '#5a6470', 'so'));
  fond.push(quad(cam, [[-300, SOL - 1, Z0], [300, SOL - 1, Z0], [300, SOL - 1, Z1], [-300, SOL - 1, Z1]], '#e8b020', 'allee', 0.35));
  [Z0, Z1].forEach((z, j) => fond.push(quad(cam, [[-X, PL, z], [X, PL, z], [X, SOL, z], [-X, SOL, z]], j ? '#2a3440' : '#d8d4cc', `bt${j}`)));
  fond.push(quad(cam, [[-900, -650, Z1 - 0.01], [900, -650, Z1 - 0.01], [900, 80, Z1 - 0.01], [-900, 80, Z1 - 0.01]], '#bfe4ff', 'pare'));
  // reflets du soleil qui défilent sur le sol
  for (let k = 0; k < 6; k++) fond.push(tache(cam, -700 + (k % 2) * 1400, SOL - 2, ((k * 1.9 + 10 - dz * 1.6) % 10) + 0.5, 500, 0.7, 'vi-tache', 0.45, `so${k}`));
  const items = [];
  RANGS.forEach((z, r) => {
    [[-1080, -330], [330, 1080]].forEach(([a, b], q) => {
      items.push({z: z + 0.2, x: (a + b) / 2, y: 200, el: <g key={`si${r}${q}`}>
        {boiteG(cam, a, b, 230, SOL, z, z + 0.45, ['#2a2a32', '#2a2a32', '#22222a'], 'pi')}
        {boiteG(cam, a, b, 170, 230, z, z + 0.45, ['#e8501a', '#c8401a', '#b03a18'], 'as')}
        {boiteG(cam, a, b, -60, 230, z - 0.08, z, ['#e8501a', '#d8481a', '#c04018'], 'do')}
        {boiteG(cam, a + 20, b - 20, -60, 0, z - 0.09, z - 0.07, ['#f4f0e8', '#f4f0e8', '#e8e4dc'], 'ap')}
      </g>});
    });
  });
  [1.9, 4.9, 7.9].forEach((z, j) => [-300, 300].forEach((x, q) => items.push({z, x, y: -200, el: <g key={`ba${j}${q}`}>{ligne(cam, [x, PL, z], [x, SOL, z], lw(cam, 30, [x, -200, z]), '#e8c020', 'b')}{halo(cam, x, -100, z, 40, 'ga-rouge', 0.9, 'bt')}</g>})));
  return {fond: <g>{fond}</g>, items, brume: null};
};
