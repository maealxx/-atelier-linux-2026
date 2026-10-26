import {random} from 'remotion';
import {boite} from './Appart';
import {Bonhomme} from './Bonhomme';
import {plaque} from './Lycee';
import {SOL} from './Rue';

// ===================== « Le Ballon d'Or » : la salle de la cérémonie et le stade =====================
// Mêmes unités que les autres décors : sol à Y = 432, 1 Z = 1000 unités (1 m ≈ 370 unités).

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
const halo = (cam, x, y, z, r, grad, op, key) => {
  if (!cam.visible(z, x, y) || op <= 0) return null;
  const [px, py] = cam.proj(x, y, z);
  return <circle key={key} cx={px} cy={py} r={r * cam.scale(z, x, y)} fill={`url(#${grad})`} opacity={op} />;
};
const disque = (cam, cx, cz, r_x, r_z, y, fill, op, key, n = 28) => {
  const p = cam.poly([...Array(n)].map((_, k) => [cx + Math.cos((k / n) * 6.283) * r_x, y, cz + Math.sin((k / n) * 6.283) * r_z]));
  return p ? <polygon key={key} points={p} fill={fill} opacity={op} /> : null;
};
const billboard = (cam, x, y, z, contenu, key, taille = 1) => {
  if (!cam.visible(z, x, y)) return null;
  const [px, py] = cam.proj(x, y, z);
  return (
    <g key={key} transform={`translate(${px} ${py}) scale(${cam.scale(z, x, y) * taille})`}>
      {contenu}
    </g>
  );
};
const item = (z, x, y, el) => ({z, x, y, el});

const Defs = () => (
  <defs>
    <radialGradient id="ga-or" cx="35%" cy="30%" r="75%">
      <stop offset="0" stopColor="#fff6c8" />
      <stop offset="0.35" stopColor="#f2c84a" />
      <stop offset="0.75" stopColor="#b8861a" />
      <stop offset="1" stopColor="#6a4a0a" />
    </radialGradient>
    <radialGradient id="ga-halo-or">
      <stop offset="0" stopColor="#ffe08a" stopOpacity="0.55" />
      <stop offset="1" stopColor="#ffe08a" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="ga-spot">
      <stop offset="0" stopColor="#fff8e8" stopOpacity="0.55" />
      <stop offset="0.6" stopColor="#fff0d0" stopOpacity="0.18" />
      <stop offset="1" stopColor="#fff0d0" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="ga-chaud">
      <stop offset="0" stopColor="#ffc27a" stopOpacity="0.55" />
      <stop offset="1" stopColor="#ffc27a" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="ga-projo">
      <stop offset="0" stopColor="#f4f8ff" stopOpacity="0.9" />
      <stop offset="0.25" stopColor="#dce8ff" stopOpacity="0.35" />
      <stop offset="1" stopColor="#dce8ff" stopOpacity="0" />
    </radialGradient>
    <linearGradient id="ga-faisceau" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#fff6e0" stopOpacity="0.35" />
      <stop offset="1" stopColor="#fff6e0" stopOpacity="0.04" />
    </linearGradient>
    <linearGradient id="ga-velours" x1="0" y1="0" x2="1" y2="0">
      {[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1].map((o, k) => (
        <stop key={k} offset={o} stopColor={k % 2 ? '#5a0a14' : '#8a1422'} />
      ))}
    </linearGradient>
    <linearGradient id="ga-nuit" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#02040c" />
      <stop offset="1" stopColor="#0c1630" />
    </linearGradient>
    <pattern id="ga-foule" width="28" height="22" patternUnits="userSpaceOnUse">
      <rect width="28" height="22" fill="#14161c" />
      {[[4, 5, '#c83a3a'], [14, 4, '#e8e0d0'], [23, 6, '#3a6ac8'], [9, 15, '#e8c84a'], [19, 16, '#c83a3a'], [26, 14, '#2a2a30'], [2, 17, '#e8e0d0']].map(([x, y, c], k) => (
        <circle key={k} cx={x} cy={y} r="3.6" fill={c} />
      ))}
    </pattern>
    <filter id="ga-flou">
      <feGaussianBlur stdDeviation="10" />
    </filter>
  </defs>
);

// ===================== Les objets =====================
// Le Ballon d'Or : boule dorée qui brille (billboard, c'est une sphère) ; r en unités
export const BouleOr = ({r = 1, f = 0}) => (
  <g>
    <circle r={r * 1.9} fill="url(#ga-halo-or)" />
    <circle r={r} fill="url(#ga-or)" />
    {[-0.55, 0, 0.55].map((k, i) => (
      <path key={i} d={`M${-r * Math.cos(Math.asin(k))},${r * k} Q0,${r * k + r * 0.18} ${r * Math.cos(Math.asin(k))},${r * k}`} stroke="#8a6210" strokeWidth={r * 0.03} fill="none" opacity="0.55" />
    ))}
    {[-0.5, 0, 0.5].map((k, i) => (
      <path key={`v${i}`} d={`M${r * k},${-r * Math.cos(Math.asin(k))} Q${r * k + r * 0.15},0 ${r * k},${r * Math.cos(Math.asin(k))}`} stroke="#8a6210" strokeWidth={r * 0.03} fill="none" opacity="0.55" />
    ))}
    <ellipse cx={-r * 0.35} cy={-r * 0.4} rx={r * 0.22} ry={r * 0.14} fill="#fff" opacity={0.75 + 0.2 * Math.sin(f / 5)} transform={`rotate(-30 ${-r * 0.35} ${-r * 0.4})`} />
    {[0, 1, 2].map((k) => {
      const a = f / 9 + k * 2.1;
      return <path key={`e${k}`} d={`M${Math.cos(a) * r * 0.7},${Math.sin(a * 1.3) * r * 0.6} l0,${-r * 0.12} l${r * 0.03},${r * 0.09} l${r * 0.12},0 l${-r * 0.12},${r * 0.03} l0,${r * 0.12} l${-r * 0.03},${-r * 0.12} l${-r * 0.12},0 Z`} fill="#fff" opacity={0.5 + 0.5 * Math.sin(f / 3 + k)} />;
    })}
  </g>
);
// Le trophée posé sur son socle (3D)
const trophee = (cam, f, x, z, y, key) => (
  <g key={key}>
    {boite(cam, x - 170, x + 170, y - 240, y, z - 0.17, z + 0.17, ['#2a2a2e', '#1a1a1e', '#141418'], 'socle')}
    {boite(cam, x - 120, x + 120, y - 300, y - 240, z - 0.12, z + 0.12, ['#e0b84a', '#c8a03a', '#a8842a'], 'bague')}
    {billboard(cam, x, y - 520, z, <BouleOr r={220} f={f} />, 'boule')}
  </g>
);
// Ballon de foot (billboard qui tourne)
export const BallonFoot = ({r = 1, rot = 0}) => (
  <g transform={`rotate(${rot})`}>
    <circle r={r} fill="#f4f4f0" stroke="#222" strokeWidth={r * 0.04} />
    {[[0, 0], [0.62, 0.2], [-0.62, 0.2], [0.38, -0.6], [-0.38, -0.6], [0, 0.72]].map(([x, y], k) => (
      <polygon key={k} points={[...Array(5)].map((_, i) => `${(x + 0.2 * Math.cos((i / 5) * 6.283 - 1.57)) * r},${(y + 0.2 * Math.sin((i / 5) * 6.283 - 1.57)) * r}`).join(' ')} fill="#1a1a1a" />
    ))}
    <ellipse cx={-r * 0.35} cy={-r * 0.4} rx={r * 0.2} ry={r * 0.12} fill="#fff" opacity="0.7" />
  </g>
);

// Contenus du grand écran de la scène (5200 × 2200)
const Ecran = ({mode, f}) => {
  const fond = <rect width="5200" height="2200" fill="#0a0814" />;
  const rayons = [...Array(16)].map((_, k) => {
    const a = (k / 16) * 6.283 + f / 60;
    return <path key={k} d={`M2600,1100 L${2600 + Math.cos(a) * 4000},${1100 + Math.sin(a) * 4000} L${2600 + Math.cos(a + 0.15) * 4000},${1100 + Math.sin(a + 0.15) * 4000} Z`} fill="#ffd25a" opacity="0.08" />;
  });
  const titre = (t, y, s = 300, c = '#ffd25a') => (
    <text x="2600" y={y} fontSize={s} textAnchor="middle" fill={c} fontWeight="900" fontFamily="'MontEB', 'DejaVu Sans', sans-serif" letterSpacing="20">
      {t}
    </text>
  );
  if (mode === 'logo')
    return (
      <g>
        {fond}
        {rayons}
        <g transform="translate(2600 900)">
          <BouleOr r={520} f={f} />
        </g>
        {titre("BALLON D'OR", 1900, 320)}
      </g>
    );
  if (mode === 'question')
    return (
      <g>
        {fond}
        {rayons}
        {titre('ET LE VAINQUEUR', 900, 300, '#fff')}
        {titre('EST…', 1350, 360)}
      </g>
    );
  if (mode === 'toi' || mode === 'visage')
    return (
      <g>
        {fond}
        {rayons}
        <g transform={`translate(${mode === 'toi' ? 1350 : 1600} ${mode === 'toi' ? -200 : -560}) scale(${mode === 'toi' ? 2.6 : 3.6})`}>
          <rect x="140" y="80" width="320" height="330" rx="60" fill="#1a1630" />
          <Bonhomme eyes={1.3} worry={mode === 'visage' ? 1 : 0.6} sweat={mode === 'visage' ? 1 : 0} scream={mode === 'toi' ? 0.3 : 0} couleurs={{haut: '#1c1c24', hautO: '#111116'}} />
        </g>
        {mode === 'toi' && titre('?????', 1250, 380, '#fff')}
        {mode === 'toi' && titre('(PERSONNE NE LE CONNAÎT)', 1800, 150, '#ffd25a')}
      </g>
    );
  if (mode === 'poids')
    return (
      <g>
        {fond}
        {rayons}
        <g transform="translate(1500 1100)">
          <BouleOr r={520} f={f} />
        </g>
        {titre('TRÈS LOURD', 1250, 330, '#fff')}
        <g transform="translate(1100 0)">{titre('😰', 1250, 380)}</g>
      </g>
    );
  return fond;
};

// ===================== LA SALLE DE LA CÉRÉMONIE =====================
// Salle : X -5500 → 5500, Z -9 (fond) → 8 (bord de la scène), sol Y 432, plafond Y -5600.
// Scène : X -3600 → 3600, Z 8 → 13, dessus en Y 32 (SCENE_Y). Marches au centre (Z 7.25 → 8). Grand écran au fond (Z 13).
export const SCENE_Y = 32;
export const LUTRIN = {x: 1700, z: 9.3};
export const TROPHEE = {x: -1500, z: 9.7};
export const marcheScene = (z) => (z >= 8 ? SCENE_Y : z >= 7.75 ? SOL - 266 : z >= 7.5 ? SOL - 133 : SOL);
const RANGS = [];
for (let z = -8; z <= 5.6; z += 1.1) RANGS.push(z);

// Une personne du public vue de dos ou de face (tourne : 0 dos → 1 face), billboard
const Spectateur = ({k, tourne, f}) => {
  const peau = ['#f2c3a0', '#c88a5a', '#8a5a3a', '#e8b48c'][k % 4];
  const chev = ['#2a1e16', '#0e0e10', '#6a4a2a', '#c8a85a'][(k * 7) % 4];
  const habit = ['#1c1c24', '#3a1a2a', '#1a2a3a', '#2a2a2a', '#4a3a2a'][(k * 3) % 5];
  const face = tourne > 0.5;
  const dx = Math.sin(f / 20 + k) * 3;
  return (
    <g transform={`translate(${dx} 0)`}>
      <path d="M-120,0 Q-125,-150 -60,-170 L60,-170 Q125,-150 120,0 Z" fill={habit} />
      <ellipse cx="0" cy="-250" rx="66" ry="78" fill={face ? peau : chev} />
      {face ? (
        <g>
          <path d="M-66,-270 Q-60,-340 0,-336 Q60,-340 66,-270 Q40,-300 0,-298 Q-40,-300 -66,-270 Z" fill={chev} />
          <circle cx="-22" cy="-250" r="9" fill="#1e1e2a" />
          <circle cx="22" cy="-250" r="9" fill="#1e1e2a" />
          <ellipse cx="0" cy="-212" rx="10" ry="8" fill="#7a2e3a" />
        </g>
      ) : (
        <path d="M-60,-200 Q0,-180 60,-200" stroke="#000" strokeWidth="6" opacity="0.2" fill="none" />
      )}
    </g>
  );
};

// ecran : contenu du grand écran ; tourne(k) : le public se retourne ; spots : [{x, z}] faisceaux de poursuite (cible au sol)
export const theatre = (cam, f, {ecran = 'logo', tourne = () => 0, spots = [], lumiere = 1, flashs = 0} = {}) => {
  const items = [];
  const fond = (
    <g>
      <Defs />
      <rect width="1080" height="1920" fill="#08040a" />
      {/* plafond et lustres */}
      {ry(cam, -5600, -5500, 5500, -9, 13, '#140c12', 'plaf')}
      {[-5, 1].map((z, k) => (
        <g key={`lu${k}`}>
          {halo(cam, 0, -4700, z, 3200, 'ga-chaud', 0.5 * lumiere, `luh${k}`)}
          {[...Array(14)].map((_, i) => {
            const a = (i / 14) * 6.283 + f / 80;
            const x = Math.cos(a) * 700;
            const zz = z + (Math.sin(a) * 700) / 1000;
            return cam.visible(zz, x, -4650) && <circle key={i} cx={cam.proj(x, -4650, zz)[0]} cy={cam.proj(x, -4650, zz)[1]} r={Math.max(1.5, 40 * cam.scale(zz, x, -4650))} fill="#fff4d0" opacity={0.6 + 0.4 * Math.sin(f / 4 + i)} />;
          })}
        </g>
      ))}
      {/* murs du fond de salle et latéraux, avec balcons dorés */}
      {rz(cam, -9, -5500, 5500, -5600, SOL, '#2a0c14', 'mfond')}
      {[-1, 1].map((sg) => (
        <g key={`ml${sg}`}>
          {rx(cam, sg * 5500, -9, 13, -5600, SOL, '#3a0e18', 'mur')}
          {[-2000, -3600].map((y, j) => (
            <g key={j}>
              {rx(cam, sg * 5498, -8, 6, y, y + 140, '#c8a03a', 'bal')}
              {rx(cam, sg * 5497, -8, 6, y + 140, y + 700, '#24080e', 'balf')}
              {[...Array(8)].map((_, i) => halo(cam, sg * 5450, y + 300, -7 + i * 1.8, 500, 'ga-chaud', 0.5 * lumiere, `ap${j}${i}`))}
            </g>
          ))}
        </g>
      ))}
      {/* sol de la salle + tapis rouge dans l'allée */}
      {ry(cam, SOL, -5500, 5500, -9, 8, '#1a0c10', 'sol')}
      {ry(cam, SOL - 1, -380, 380, -9, 7.25, '#9a1020', 'tapis')}
      {ligne(cam, [-380, SOL - 2, -9], [-380, SOL - 2, 7.25], 6, '#e0b84a', 'tb1')}
      {ligne(cam, [380, SOL - 2, -9], [380, SOL - 2, 7.25], 6, '#e0b84a', 'tb2')}
      {/* la scène : mur du fond, grand écran, rideaux de velours, cadre doré */}
      {rz(cam, 13, -5500, 5500, -5600, SOL, '#0e0a18', 'fondsc')}
      {plaque(cam, [-2600, -3400, 12.99], [1, 0, 0], [0, 1, 0], 5200, 2200, <Ecran mode={ecran} f={f} />, 'ecran')}
      {halo(cam, 0, -2300, 12.9, 5200, 'ga-halo-or', 0.35 * lumiere, 'ecranh')}
      {[-1, 1].map((sg) => (
        <g key={`ri${sg}`}>
          {quad(cam, [[sg * 3000, -4700, 12.6], [sg * 4400, -4700, 12.6], [sg * 4600, SCENE_Y, 12.4], [sg * 3200 + sg * 120 * Math.sin(f / 30), SCENE_Y, 12.4]], 'url(#ga-velours)', 'rideau')}
          {ligne(cam, [sg * 3600, -4700, 8.02], [sg * 3600, SOL, 8.02], 60, '#c8a03a', 'cadre')}
        </g>
      ))}
      {quad(cam, [[-4600, -5000, 12.7], [4600, -5000, 12.7], [4600, -4500, 12.6], [-4600, -4500, 12.6]], 'url(#ga-velours)', 'lambrequin')}
      {ligne(cam, [-3600, -4700, 8.02], [3600, -4700, 8.02], 60, '#c8a03a', 'cadreh')}
      {/* la scène en volume + marches */}
      {boite(cam, -3600, 3600, SCENE_Y, SOL, 8, 13, ['#1a1420', '#2a1a10', '#22160e'], 'scene')}
      {[0, 1, 2].map((k) => boite(cam, -420, 420, SOL - 133 * (k + 1), SOL, 7.25 + 0.25 * k, 8, ['#9a1020', '#5a0a14', '#4a0810'], `marche${k}`))}
      {ligne(cam, [-3600, SCENE_Y + 30, 7.99], [3600, SCENE_Y + 30, 7.99], 10, '#ffd25a', 'led', 0.7 + 0.3 * Math.sin(f / 4))}
      {ry(cam, SCENE_Y - 1, -3400, 3400, 8.2, 12.8, '#2a1e2a', 'plateau')}
      {/* rampe de projecteurs au-dessus de la scène */}
      {ligne(cam, [-4200, -4300, 8.5], [4200, -4300, 8.5], 30, '#1a1a1e', 'pont')}
      {[...Array(9)].map((_, k) => boite(cam, -3600 + k * 900 - 70, -3600 + k * 900 + 70, -4280, -4120, 8.4, 8.6, ['#222', '#2a2a2e', '#1a1a1a', '#fff4d8'], `pj${k}`))}
      {/* lumière sur la scène */}
      {disque(cam, 0, 10.4, 3200, 1.9, SCENE_Y - 2, 'url(#ga-spot)', 0.8 * lumiere, 'flaque')}
    </g>
  );
  // les rangées de fauteuils et le public
  RANGS.forEach((z, r) => {
    [-1, 1].forEach((sg) => {
      items.push(
        item(z + 0.35, sg * 2600, SOL - 200, (
          <g key={`rg${r}${sg}`}>
            {boite(cam, sg > 0 ? 480 : -4900, sg > 0 ? 4900 : -480, SOL - 200, SOL, z + 0.1, z + 0.5, ['#7a0e1c', '#5a0a14', '#4a0810'], 'assise')}
            {boite(cam, sg > 0 ? 480 : -4900, sg > 0 ? 4900 : -480, SOL - 420, SOL - 200, z + 0.5, z + 0.62, ['#8a1422', '#6a0e18', '#5a0a14'], 'dossier')}
          </g>
        ))
      );
      for (let i = 0; i < 6; i++) {
        const k = r * 12 + i + (sg > 0 ? 6 : 0);
        const x = sg * (700 + i * 720 + (r % 2) * 200);
        if (random(`vide${k}`) < 0.12) continue;
        items.push(item(z + 0.33, x, SOL - 300, billboard(cam, x, SOL - 200, z + 0.33, <Spectateur k={k} tourne={(cam.z > z + 0.3) !== (tourne(k, z) > 0.5) ? 1 : 0} f={f} />, `sp${k}`, 1.3)));
        // écrans de téléphone qui filment
        if (random(`tel${k}`) < 0.18) items.push(item(z + 0.2, x + 60, SOL - 500, halo(cam, x + 60, SOL - 520, z + 0.2, 120, 'ga-spot', 0.9, `tl${k}`)));
      }
    });
  });
  // faisceaux de poursuite (du pont de projecteurs jusqu'à la cible)
  spots.forEach((s, k) => {
    const src = [s.sx ?? 0, -4250, s.sz ?? 8.5];
    const pts = [...Array(12)].map((_, i) => [s.x + Math.cos((i / 12) * 6.283) * 520, s.y ?? SOL, s.z + (Math.sin((i / 12) * 6.283) * 520) / 1000]);
    const poly = (a, b) => cam.poly([src, a, b]);
    items.push(
      item(Math.min(s.z, src[2]) - 0.5, s.x, SOL - 1500, (
        <g key={`spot${k}`} opacity={s.op ?? 1}>
          {pts.map((p, i) => {
            const q = pts[(i + 1) % pts.length];
            const pp = poly(p, q);
            return pp ? <polygon key={i} points={pp} fill="url(#ga-faisceau)" opacity="0.18" /> : null;
          })}
          {disque(cam, s.x, s.z, 520, 0.52, (s.y ?? SOL) - 2, 'url(#ga-spot)', 1, 'cercle')}
        </g>
      ))
    );
  });
  // lutrin + micro, trophée sur son socle
  items.push(
    item(LUTRIN.z, LUTRIN.x, SCENE_Y - 300, (
      <g key="lutrin">
        {boite(cam, LUTRIN.x - 260, LUTRIN.x + 260, SCENE_Y - 520, SCENE_Y, LUTRIN.z - 0.2, LUTRIN.z + 0.2, ['#c8a03a', '#1a1420', '#141018'], 'lu')}
        {plaque(cam, [LUTRIN.x - 120, SCENE_Y - 440, LUTRIN.z - 0.205], [1, 0, 0], [0, 1, 0], 240, 240, <g><circle cx="120" cy="120" r="110" fill="none" stroke="#e0b84a" strokeWidth="12" /><circle cx="120" cy="120" r="60" fill="#e0b84a" /></g>, 'em')}
        {ligne(cam, [LUTRIN.x, SCENE_Y - 520, LUTRIN.z], [LUTRIN.x - 60, SCENE_Y - 760, LUTRIN.z - 0.15], 8, '#222', 'mic')}
        {billboard(cam, LUTRIN.x - 60, SCENE_Y - 780, LUTRIN.z - 0.15, <ellipse rx="26" ry="38" fill="#333" />, 'micb')}
      </g>
    ))
  );
  items.push(item(TROPHEE.z, TROPHEE.x, SCENE_Y - 400, trophee(cam, f, TROPHEE.x, TROPHEE.z, SCENE_Y, 'trophee')));
  // flashs des photographes
  const flashEls = [];
  if (flashs > 0)
    for (let k = 0; k < 6; k++) {
      if (random(`fl${k}${Math.floor(f / 3)}`) > 0.25 * flashs) continue;
      const x = (random(`fx${k}${Math.floor(f / 3)}`) - 0.5) * 8000;
      const z = 5 + random(`fz${k}`) * 2.5;
      flashEls.push(halo(cam, x, SOL - 450, z, 900, 'ga-spot', 1, `fl${k}`));
    }
  const brume = (
    <g>
      <defs>
        <radialGradient id="ga-brume" cx={cam.fuite[0]} cy={cam.fuite[1]} r="1100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1a0c18" stopOpacity="0.25" />
          <stop offset="1" stopColor="#1a0c18" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#ga-brume)" />
      {flashEls}
    </g>
  );
  return {fond, items, brume};
};

// ===================== LE STADE =====================
// Pelouse : X -12500 → 12500, Z -20 → 20 (centre en 0), sol Y 432. Buts en Z ±20 (largeur ±1350, hauteur 900).
// Tribunes en pente tout autour, 4 pylônes d'éclairage, panneaux LED, écran géant au fond (Z 34).
export const PELOUSE = {x: 12500, z: 20};
export const stade = (cam, f, {ecran = 'BALLON D\'OR', ola = 0} = {}) => {
  const items = [];
  const bande = [...Array(10)].map((_, k) => ry(cam, SOL, -PELOUSE.x, PELOUSE.x, -20 + k * 4, -18 + k * 4, '#2a7a3a', `bd${k}`));
  const L = (A, B, k) => ligne(cam, A, B, Math.max(1.5, 26 * cam.scale((A[2] + B[2]) / 2, (A[0] + B[0]) / 2, SOL)), '#e8f0e8', k, 0.85);
  const cercle = (cx, cz, r, k, a0 = 0, a1 = 6.283) => {
    const pts = [...Array(36)].map((_, i) => {
      const a = a0 + ((a1 - a0) * i) / 35;
      return [cx + Math.cos(a) * r, SOL - 1, cz + (Math.sin(a) * r) / 1000];
    });
    return pts.slice(1).map((p, i) => L(pts[i], p, `${k}${i}`));
  };
  const tribune = (pts, key) => {
    const p = cam.poly(pts);
    return p ? <polygon key={key} points={p} fill="url(#ga-foule)" /> : null;
  };
  const pylone = (x, z, k) => (
    <g key={`py${k}`}>
      {ligne(cam, [x, SOL, z], [x, -14000, z], Math.max(2, 160 * cam.scale(z, x, -7000)), '#2a2e36', 'mat')}
      {rz(cam, z, x - 1400, x + 1400, -15600, -13800, '#c8d4e8', 'panneau')}
      {halo(cam, x, -14700, z - 0.1, 5000, 'ga-projo', 0.8, 'ph')}
    </g>
  );
  const fond = (
    <g>
      <Defs />
      <rect width="1080" height="1920" fill="url(#ga-nuit)" />
      {[...Array(60)].map((_, k) => {
        const x = (random(`sx${k}`) - 0.5) * 120000;
        const y = -20000 - random(`sy${k}`) * 40000;
        const z = cam.z + 80;
        return cam.visible(z, x, y) ? <circle key={`et${k}`} cx={cam.proj(x, y, z)[0]} cy={cam.proj(x, y, z)[1]} r="1.5" fill="#fff" opacity="0.5" /> : null;
      })}
      {/* tribunes (pente remplie de spectateurs), toit */}
      {tribune([[-16000, SOL - 400, -24], [16000, SOL - 400, -24], [22000, -9000, -33], [-22000, -9000, -33]], 'tr1')}
      {tribune([[-16000, SOL - 400, 24], [16000, SOL - 400, 24], [22000, -9000, 33], [-22000, -9000, 33]], 'tr2')}
      {tribune([[-14000, SOL - 400, -24], [-14000, SOL - 400, 24], [-22000, -9000, 33], [-22000, -9000, -33]], 'tr3')}
      {tribune([[14000, SOL - 400, -24], [14000, SOL - 400, 24], [22000, -9000, 33], [22000, -9000, -33]], 'tr4')}
      {[[-24, -33], [24, 33]].map(([a, b], k) => quad(cam, [[-23000, -9000, b], [23000, -9000, b], [23000, -10500, b + Math.sign(b) * 3], [-23000, -10500, b + Math.sign(b) * 3]], '#1a1e26', `toit${k}`))}
      {/* « ola » : une vague claire qui traverse la tribune d'en face */}
      {ola > 0 && quad(cam, [[-16000 + ((f * 600) % 38000), SOL - 400, 24], [-14000 + ((f * 600) % 38000), SOL - 400, 24], [-12000 + ((f * 600) % 38000), -9000, 33], [-14000 + ((f * 600) % 38000), -9000, 33]], '#fff', 'ola', 0.15 * ola)}
      {/* écran géant */}
      {plaque(cam, [-6000, -12500, 34], [1, 0, 0], [0, 1, 0], 12000, 3200, <g><rect width="12000" height="3200" fill="#08081a" stroke="#333" strokeWidth="60" /><text x="6000" y="1500" fontSize="1200" textAnchor="middle" fill="#ffd25a" fontWeight="900" fontFamily="'MontEB', 'DejaVu Sans', sans-serif">{ecran}</text><text x="6000" y="2800" fontSize="900" textAnchor="middle" fill="#fff" fontWeight="900" fontFamily="'MontEB', 'DejaVu Sans', sans-serif">0 - 0</text></g>, 'ecr')}
      {/* pelouse rayée + lignes */}
      {ry(cam, SOL + 2, -16000, 16000, -24, 24, '#1e5a2a', 'bord')}
      {ry(cam, SOL + 1, -PELOUSE.x, PELOUSE.x, -20, 20, '#25703a', 'pel')}
      {bande}
      {L([-PELOUSE.x, SOL - 1, -20], [PELOUSE.x, SOL - 1, -20], 'l1')}
      {L([-PELOUSE.x, SOL - 1, 20], [PELOUSE.x, SOL - 1, 20], 'l2')}
      {L([-PELOUSE.x, SOL - 1, -20], [-PELOUSE.x, SOL - 1, 20], 'l3')}
      {L([PELOUSE.x, SOL - 1, -20], [PELOUSE.x, SOL - 1, 20], 'l4')}
      {L([-PELOUSE.x, SOL - 1, 0], [PELOUSE.x, SOL - 1, 0], 'l5')}
      {cercle(0, 0, 3400, 'cc')}
      {[-1, 1].map((sg) => (
        <g key={`sf${sg}`}>
          {L([-7450, SOL - 1, sg * 20], [-7450, SOL - 1, sg * 13.9], `s1${sg}`)}
          {L([7450, SOL - 1, sg * 20], [7450, SOL - 1, sg * 13.9], `s2${sg}`)}
          {L([-7450, SOL - 1, sg * 13.9], [7450, SOL - 1, sg * 13.9], `s3${sg}`)}
          {L([-3400, SOL - 1, sg * 20], [-3400, SOL - 1, sg * 18.2], `s4${sg}`)}
          {L([3400, SOL - 1, sg * 20], [3400, SOL - 1, sg * 18.2], `s5${sg}`)}
          {L([-3400, SOL - 1, sg * 18.2], [3400, SOL - 1, sg * 18.2], `s6${sg}`)}
        </g>
      ))}
      {/* flaques de lumière des pylônes sur la pelouse */}
      {[[-15500, -26], [15500, -26], [-15500, 26], [15500, 26]].map(([x, z], k) => pylone(x, z, k))}
    </g>
  );
  // buts (poteaux + filets)
  [-1, 1].forEach((sg) => {
    const z = sg * 20;
    const p = (x, y, dz = 0) => [x, y, z + sg * dz];
    items.push(
      item(z, 0, SOL - 450, (
        <g key={`but${sg}`}>
          {[...Array(9)].map((_, k) => ligne(cam, p(-1350 + k * 337, SOL - 900, 0.9), p(-1350 + k * 337, SOL, 1.6), 2, '#e8e8e8', `fv${k}`, 0.5))}
          {[...Array(5)].map((_, k) => ligne(cam, p(-1350, SOL - 900 + k * 225, 0.9 + k * 0.17), p(1350, SOL - 900 + k * 225, 0.9 + k * 0.17), 2, '#e8e8e8', `fh${k}`, 0.5))}
          {ligne(cam, p(-1350, SOL, 0), p(-1350, SOL - 900, 0), Math.max(2, 40 * cam.scale(z, -1350, 0)), '#fff', 'p1')}
          {ligne(cam, p(1350, SOL, 0), p(1350, SOL - 900, 0), Math.max(2, 40 * cam.scale(z, 1350, 0)), '#fff', 'p2')}
          {ligne(cam, p(-1350, SOL - 900, 0), p(1350, SOL - 900, 0), Math.max(2, 40 * cam.scale(z, 0, -400)), '#fff', 'tr')}
        </g>
      ))
    );
  });
  // panneaux LED autour du terrain
  const PUB = ['⚽ FOOT 24/7', "BALLON D'OR", 'GOAL TV', 'SUPER CHIPS'];
  [-1, 1].forEach((sg) =>
    [...Array(6)].map((_, k) =>
      items.push(
        item(sg * 21.5, -10000 + k * 4000, SOL - 150, (
          <g key={`led${sg}${k}`}>
            {boite(cam, -11800 + k * 4000, -8200 + k * 4000, SOL - 300, SOL, sg * 21.4, sg * 21.6, ['#111', '#0a0a14', '#0a0a14'], 'b')}
            {cam.z * sg < 21.4 &&
              plaque(cam, [-11780 + k * 4000, SOL - 290, sg * 21.4 - sg * 0.001], [1, 0, 0], [0, 1, 0], 3560, 280, <g><rect width="3560" height="280" fill={['#0a2a8a', '#8a0a2a', '#0a6a3a', '#6a4a0a'][(k + Math.floor(f / 45)) % 4]} /><text x="1780" y="215" fontSize="200" textAnchor="middle" fill="#fff" fontWeight="900" fontFamily="'MontEB', 'DejaVu Sans', sans-serif">{PUB[(k + Math.floor(f / 45)) % 4]}</text></g>, 'pub')}
          </g>
        ))
      )
    )
  );
  const brume = (
    <g>
      <defs>
        <radialGradient id="st-brume" cx={cam.fuite[0]} cy={cam.fuite[1]} r="1200" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#c8d8ff" stopOpacity="0.12" />
          <stop offset="1" stopColor="#c8d8ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#st-brume)" />
    </g>
  );
  return {fond, items, brume};
};
export {trophee};
