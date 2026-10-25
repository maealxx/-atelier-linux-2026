import {random} from 'remotion';
import {Bonhomme} from './Bonhomme';
import {plaque} from './Lycee';
import {SOL} from './Rue';

// ===================== « Le livreur » : l'appart, le palier de l'immeuble, la rue vue du 4e =====================
// Mêmes unités que les autres décors : sol à Y = 432, 1 Z = 1000 unités (1 m ≈ 370 unités).
//
// L'APPART (salon) : X -1500 → 1500, Z 0 → 6, plafond Y -620.
//   mur du fond (Z 6) : porte d'entrée X 650 → 1050 (judas en Y -160), console + miroir, grand cadre, bibliothèque ;
//   mur gauche (X -1500) : fenêtre Z 2 → 3.8 avec rideaux, radiateur, monstera ;
//   mur droit (X 1500) : ouverture du couloir Z 0.75 → 1.65, meuble TV, porte de la salle de bain Z 4.7 → 5.5 ;
//   mur avant (Z 0) : coin cuisine.
// Le petit COULOIR part de l'ouverture vers +X jusqu'à la porte de la CHAMBRE (X 3600, Z 0.85 → 1.55).
// La CHAMBRE : X 3600 → 6000, Z -0.6 → 3.2.
export const PLAF = -620;
export const PORTE = {x0: 650, x1: 1050, z: 6, haut: -380};
export const JUDAS = {x: 850, y: -160};
export const FENETRE = {x: -1500, z0: 2, z1: 3.8, y0: -430, y1: 80};
export const COULOIR = {x0: 1500, x1: 3600, z0: 0.75, z1: 1.65};
export const PCH = {x: 3600, z0: 0.85, z1: 1.55};
export const CHAMBRE = {x0: 3600, x1: 6000, z0: -0.6, z1: 3.2};
export const SDB = {z0: 4.7, z1: 5.5};

const ligne = (cam, A, B, w, col, key, op = 1) => {
  const r = cam.seg(A, B);
  return r ? <line key={key} x1={r[0][0]} y1={r[0][1]} x2={r[1][0]} y2={r[1][1]} stroke={col} strokeWidth={w} opacity={op} strokeLinecap="round" /> : null;
};
const quad = (cam, pts, fill, key, op = 1) => {
  const p = cam.poly(pts);
  return p ? <polygon key={key} points={p} fill={fill} opacity={op} /> : null;
};
// rectangles sur un plan Z constant, X constant ou Y constant
const rz = (cam, z, x0, x1, y0, y1, fill, key, op) => quad(cam, [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], fill, key, op);
const rx = (cam, x, z0, z1, y0, y1, fill, key, op) => quad(cam, [[x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0]], fill, key, op);
const ry = (cam, y, x0, x1, z0, z1, fill, key, op) => quad(cam, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], fill, key, op);
// Volume : seules les faces tournées vers la caméra sont dessinées
export const boite = (cam, x0, x1, y0, y1, z0, z1, [dessus, face, cote, dessous = cote], key) => (
  <g key={key}>
    {cam.y < y0 && ry(cam, y0, x0, x1, z0, z1, dessus, 'h')}
    {cam.y > y1 && ry(cam, y1, x0, x1, z0, z1, dessous, 'b')}
    {cam.x > x1 && rx(cam, x1, z0, z1, y0, y1, cote, 'd')}
    {cam.x < x0 && rx(cam, x0, z0, z1, y0, y1, cote, 'g')}
    {cam.z < z0 && rz(cam, z0, x0, x1, y0, y1, face, 'f')}
    {cam.z > z1 && rz(cam, z1, x0, x1, y0, y1, face, 'a')}
  </g>
);
const billboard = (cam, x, y, z, contenu, key, taille = 1) => {
  if (!cam.visible(z, x, y)) return null;
  const [px, py] = cam.proj(x, y, z);
  return (
    <g key={key} transform={`translate(${px} ${py}) scale(${cam.scale(z, x, y) * taille})`}>
      {contenu}
    </g>
  );
};
// halo de lumière (rond à l'écran, taille selon la distance)
const halo = (cam, x, y, z, r, grad, op, key) => {
  if (!cam.visible(z, x, y) || op <= 0) return null;
  const [px, py] = cam.proj(x, y, z);
  return <circle key={key} cx={px} cy={py} r={r * cam.scale(z, x, y)} fill={`url(#${grad})`} opacity={op} />;
};
const disqueSol = (cam, cx, cz, rx_, rz_, y, fill, op, key) => {
  const p = cam.poly([...Array(24)].map((_, k) => [cx + Math.cos((k / 24) * 6.283) * rx_, y, cz + Math.sin((k / 24) * 6.283) * rz_]));
  return p ? <polygon key={key} points={p} fill={fill} opacity={op} /> : null;
};
const item = (z, x, y, el) => ({z, x, y, el});

const Defs = () => (
  <defs>
    <radialGradient id="ap-chaud">
      <stop offset="0" stopColor="#ffc27a" stopOpacity="0.6" />
      <stop offset="0.4" stopColor="#ff9a4a" stopOpacity="0.22" />
      <stop offset="1" stopColor="#ff9a4a" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="ap-rose">
      <stop offset="0" stopColor="#ff6ab8" stopOpacity="0.5" />
      <stop offset="1" stopColor="#ff6ab8" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="ap-tv">
      <stop offset="0" stopColor="#7ab4ff" stopOpacity="0.5" />
      <stop offset="0.5" stopColor="#3a6aff" stopOpacity="0.15" />
      <stop offset="1" stopColor="#3a6aff" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="ap-lune">
      <stop offset="0" stopColor="#a8c4ff" stopOpacity="0.45" />
      <stop offset="1" stopColor="#a8c4ff" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="ap-neon">
      <stop offset="0" stopColor="#e6f2ff" stopOpacity="0.6" />
      <stop offset="0.5" stopColor="#c8dcff" stopOpacity="0.18" />
      <stop offset="1" stopColor="#c8dcff" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="ap-sodium">
      <stop offset="0" stopColor="#ffb45a" stopOpacity="0.7" />
      <stop offset="0.45" stopColor="#ff9a3a" stopOpacity="0.2" />
      <stop offset="1" stopColor="#ff9a3a" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="ap-cyan">
      <stop offset="0" stopColor="#7ae8ff" stopOpacity="0.5" />
      <stop offset="1" stopColor="#7ae8ff" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="ap-rouge">
      <stop offset="0" stopColor="#ff3a3a" stopOpacity="0.55" />
      <stop offset="1" stopColor="#ff3a3a" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="ap-vert">
      <stop offset="0" stopColor="#3aff7a" stopOpacity="0.5" />
      <stop offset="1" stopColor="#3aff7a" stopOpacity="0" />
    </radialGradient>
    <linearGradient id="ap-nuit" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#060a18" />
      <stop offset="0.6" stopColor="#101a36" />
      <stop offset="1" stopColor="#1e2a4a" />
    </linearGradient>
    <linearGradient id="ap-ciel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#03050c" />
      <stop offset="0.55" stopColor="#0b1428" />
      <stop offset="1" stopColor="#1c2440" />
    </linearGradient>
    <linearGradient id="ap-interieur" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#5a3a22" />
      <stop offset="1" stopColor="#b8753a" />
    </linearGradient>
    <filter id="ap-flou">
      <feGaussianBlur stdDeviation="3" />
    </filter>
  </defs>
);

// ===================== Le livreur (le vrai, ou l'autre) =====================
// Le bonhomme avec une veste sombre, un casque et le gros sac isotherme sur le dos.
// visiere : 'ouverte' (on voit son visage) | 'noire' (visière opaque, aucun visage)
const VESTE = {haut: '#24302a', hautO: '#18201c', pant: '#1d2028', chaus: '#121216'};
const VESTE_NOIRE = {haut: '#141716', hautO: '#0c0e0d', pant: '#101116', chaus: '#0a0a0c', peau: '#cfc6bc', peauO: '#b3aaa0'};
export const LivreurPerso = ({cam, id, x, z, y = SOL, lum = 1, teinte = [1, 1, 1], sx = 1, sy = 1, lift = 0, shiver = 0, ombre = 0.5, visiere = 'ouverte', casque = '#2c9a5a', sac = '#2fae5a', ...pose}) => {
  if (!cam.visible(z, x, y - 300)) return null;
  const [px, py] = cam.proj(x, y, z);
  const s = cam.scale(z, x, y - 300) * 0.78;
  const [r, g, b] = teinte.map((c) => c * lum);
  const dos = pose.dos;
  const tilt = pose.tilt || 0;
  const noire = visiere === 'noire';
  const leSac = (
    <g>
      <rect x="168" y="232" width="264" height="300" rx="16" fill={sac} />
      <rect x="168" y="232" width="264" height="54" rx="16" fill="#000" opacity="0.22" />
      <rect x="168" y="372" width="264" height="22" fill="#000" opacity="0.18" />
      {dos && <rect x="262" y="214" width="76" height="24" rx="10" fill="none" stroke="#111" strokeWidth="10" />}
    </g>
  );
  return (
    <g>
      <defs>
        <filter id={id}>
          <feColorMatrix type="matrix" values={`${r} 0 0 0 0  0 ${g} 0 0 0  0 0 ${b} 0 0  0 0 0 1 0`} />
        </filter>
      </defs>
      <ellipse cx={px} cy={py} rx={130 * s} ry={22 * s} fill="#000" opacity={ombre} />
      <g filter={`url(#${id})`} transform={`translate(${px + shiver} ${py}) scale(${s * sx} ${s * sy}) translate(-300 ${-922 + lift})`}>
        {!dos && leSac}
        <Bonhomme {...pose} couleurs={noire ? VESTE_NOIRE : VESTE} />
        {!dos && (
          <g>
            <path d="M238,300 L246,505 M362,300 L354,505" stroke="#0c0c0e" strokeWidth="16" strokeLinecap="round" />
            <path d="M230,300 Q300,318 370,300" stroke="#3a4a40" strokeWidth="10" fill="none" />
          </g>
        )}
        {dos && leSac}
        {/* casque */}
        <g transform={`rotate(${tilt} 300 262)`}>
          {dos || noire ? (
            <g>
              <ellipse cx="300" cy="180" rx="104" ry="106" fill={casque} />
              <path d="M200,190 Q300,214 400,190" stroke="#000" strokeWidth="8" fill="none" opacity="0.3" />
              {!dos && (
                <g>
                  <path d="M212,142 Q300,118 388,142 L392,222 Q300,252 208,222 Z" fill="#040506" />
                  <path d="M232,150 Q262,140 290,142 L250,214 Q236,210 228,200 Z" fill="#fff" opacity="0.1" />
                  <ellipse cx="300" cy="250" rx="62" ry="22" fill={casque} />
                </g>
              )}
            </g>
          ) : (
            <g>
              <path d="M196,214 Q190,66 300,62 Q410,66 404,214 L380,218 Q384,116 300,112 Q216,116 220,218 Z" fill={casque} />
              <path d="M226,96 Q300,74 374,96 L370,122 Q300,104 230,122 Z" fill="#0c1a22" opacity="0.85" />
              <path d="M212,214 Q240,290 300,288 Q360,290 388,214" stroke="#111" strokeWidth="6" fill="none" opacity="0.6" />
            </g>
          )}
        </g>
      </g>
    </g>
  );
};

// ===================== L'APPART =====================
const MUR = '#4a3e36';
const MUR2 = '#43372f';
const MUR3 = '#3d322b';
const PARQUET = '#3a2a1f';
const PLAFOND = '#2a2420';

// Le grand cadre du mur du fond (il tombe au moment du bruit)
const CADRE = {x0: -380, y0: -500};
const CadreContenu = () => (
  <g>
    <rect width="460" height="320" fill="#1a1612" />
    <rect x="22" y="22" width="416" height="276" fill="#2a3a4a" />
    <circle cx="320" cy="110" r="44" fill="#e8d8a8" opacity="0.8" />
    <path d="M22,298 L140,170 L230,240 L320,150 L438,260 L438,298 Z" fill="#1a2a24" />
    <path d="M22,298 L100,230 L180,280 L260,220 L438,298 Z" fill="#0f1a16" />
  </g>
);

// Les autres immeubles de nuit, vus par la fenêtre (image plaquée sur la vitre)
const VueVille = ({f}) => (
  <g>
    <rect width="1800" height="510" fill="url(#ap-nuit)" />
    {[...Array(14)].map((_, k) => {
      const x = k * 140 - 40;
      const h = 220 + random(`vv${k}`) * 260;
      return (
        <g key={k}>
          <rect x={x} y={510 - h} width="132" height={h} fill={['#0b0f1c', '#0e1222', '#0a0d18'][k % 3]} />
          {[...Array(12)].map((_, i) => {
            const fx = x + 14 + (i % 4) * 30;
            const fy = 510 - h + 20 + Math.floor(i / 4) * 44;
            const allume = random(`vf${k}${i}`) > 0.6;
            return fy < 500 && <rect key={i} x={fx} y={fy} width="16" height="24" fill={allume ? (random(`vc${k}${i}`) > 0.5 ? '#ffcf8a' : '#cfe0ff') : '#151a28'} opacity={allume ? 0.8 : 1} />;
          })}
        </g>
      );
    })}
    <circle cx="1420" cy="70" r="34" fill="#e8eeff" opacity="0.85" />
    <circle cx="1420" cy="70" r="90" fill="#e8eeff" opacity="0.08" />
    {/* reflet sur la vitre */}
    <path d="M200,0 L420,0 L120,510 L-100,510 Z" fill="#fff" opacity="0.04" />
  </g>
);

const tvImage = (f) => {
  const k = Math.floor(f / 14);
  const c = ['#2a5aa8', '#a83a5a', '#3aa87a', '#c8a83a', '#5a3aa8'][k % 5];
  return (
    <g>
      <rect width="1300" height="560" fill="#0a0e18" />
      <rect width="1300" height="560" fill={c} opacity="0.55" />
      <circle cx={400 + (k % 3) * 220} cy="260" r="120" fill="#fff" opacity="0.25" />
      <rect x="0" y="420" width="1300" height="140" fill="#000" opacity="0.35" />
      <rect x="60" y="460" width={300 + (k % 4) * 120} height="30" fill="#fff" opacity="0.3" />
    </g>
  );
};

// La chambre : vue de l'intérieur ou par la porte ; monstre = élément 3D déjà prêt
export const chambre = (cam, f, {porte = 0, monstre = null, rideau = 1}) => {
  const {x0, x1, z0, z1} = CHAMBRE;
  const vent = Math.sin(f / 5) * 0.5 + Math.sin(f / 2.3) * 0.3;
  const els = [
    ry(cam, SOL, x0, x1, z0, z1, '#241c18', 'csol'),
    ry(cam, PLAF, x0, x1, z0, z1, '#1a1a20', 'cpla'),
    rz(cam, z0, x0, x1, PLAF, SOL, '#2a2a34', 'cm1'),
    rz(cam, z1, x0, x1, PLAF, SOL, '#26262e', 'cm2'),
    // mur du fond, avec la fenêtre grande ouverte
    rx(cam, x1, z0, 0.6, PLAF, SOL, '#2e2e38', 'cf1'),
    rx(cam, x1, 2.2, z1, PLAF, SOL, '#2e2e38', 'cf2'),
    rx(cam, x1, 0.6, 2.2, PLAF, -480, '#2e2e38', 'cf3'),
    rx(cam, x1, 0.6, 2.2, 120, SOL, '#2e2e38', 'cf4'),
    rx(cam, x1 + 5, 0.6, 2.2, -480, 120, 'url(#ap-nuit)', 'cciel'),
    disqueSol(cam, 5200, 1.4, 900, 0.9, SOL - 1, 'url(#ap-lune)', 0.9, 'clune'),
    // lit, armoire, poster, vêtements par terre, lampe renversée
    boite(cam, 4300, 5500, 220, SOL, 2.2, z1 - 0.05, ['#4a4e62', '#3a3e50', '#33364a'], 'lit'),
    boite(cam, 4300, 5500, 100, 220, 2.2, z1 - 0.05, ['#d8d8e4', '#a8a8b8', '#9898a8'], 'drap'),
    boite(cam, 4380, 4900, 40, 120, 2.6, 3.1, ['#e8e8f0', '#c8c8d4', '#b8b8c4'], 'oreiller'),
    boite(cam, 3800, 4600, -450, SOL, z0 + 0.02, z0 + 0.6, ['#3a2a20', '#4a3426', '#3a2a20'], 'armoire'),
    plaque(cam, [4700, -420, z0 + 0.01], [1, 0, 0], [0, 1, 0], 360, 480, <g><rect width="360" height="480" fill="#7a2a3a" /><circle cx="180" cy="200" r="90" fill="#e8b84a" opacity="0.7" /><text x="180" y="420" fontSize="56" textAnchor="middle" fill="#f0e0d0" fontWeight="900" fontFamily="'DejaVu Sans', Arial">TOUR</text></g>, 'poster'),
    boite(cam, 4950, 5250, 380, SOL, 0.4, 0.8, ['#5a3a6a', '#4a2a5a', '#3a2a4a'], 'linge'),
    ligne(cam, [5700, SOL - 10, 2.6], [5450, SOL - 40, 2.2], 14, '#6a6a70', 'lampe'),
    // rideaux qui volent dans le vent
    rideau > 0 && quad(cam, [[x1 - 20, -480, 0.6], [x1 - 20 - (260 + 120 * vent), -480, 0.75], [x1 - 20 - (330 + 160 * vent), 110, 0.95 + 0.15 * vent], [x1 - 20, 120, 0.6]], '#c8d4e8', 'rid1', 0.55),
    rideau > 0 && quad(cam, [[x1 - 20, -480, 2.2], [x1 - 20 - (200 + 100 * vent), -480, 2.05], [x1 - 20 - (280 + 140 * vent), 110, 1.85 - 0.1 * vent], [x1 - 20, 120, 2.2]], '#b8c4d8', 'rid2', 0.5),
    halo(cam, x1, -200, 1.4, 1600, 'ap-lune', 0.7, 'clh'),
  ];
  // la porte de la chambre (charnière côté Z 0.85, elle s'ouvre vers l'intérieur)
  const a = (porte * 80 * Math.PI) / 180;
  const L = PCH.z1 - PCH.z0;
  const xb = PCH.x + Math.sin(a) * L * 1000;
  const zb = PCH.z0 + Math.cos(a) * L;
  const panneau = quad(cam, [[PCH.x + 2, -380, PCH.z0], [xb + 2, -380, zb], [xb + 2, SOL - 12, zb], [PCH.x + 2, SOL - 12, PCH.z0]], '#5e4c3e', 'pch');
  const poignee = ligne(cam, [xb - Math.sin(a) * 90 + 6, 20, zb - Math.cos(a) * 0.09], [xb - Math.sin(a) * 160 + 6, 20, zb - Math.cos(a) * 0.16], 10, '#c9b48a', 'pchp');
  return {
    fond: (
      <g>
        {els}
        {monstre}
        {panneau}
        {poignee}
      </g>
    ),
  };
};

// Le salon (+ couloir + chambre derrière les portes)
// tv : écran allumé ; lampes : intensité des lampes ; choc : la porte d'entrée tremble ; fente : ombre sous la porte (0 → 1)
// cadre : 0 accroché → 1 tombé ; fenteChambre : ombre qui passe sous la porte de la chambre (-1 → 1, null = rien)
// porteChambre : 0 → 1 ; monstre : élément 3D dans la chambre ; rideau : rideau du salon ouvert (0 → 1)
export const appart = (cam, f, {tv = 1, lampes = 1, choc = 0, fente = 0, cadre = 0, fenteChambre = null, porteChambre = 0, monstre = null, rideau = 0, lumiereChambre = 0.5} = {}) => {
  const items = [];
  const L = lampes;
  // ---------- couloir + chambre (au fond, derrière l'ouverture du mur droit) ----------
  const ch = chambre(cam, f, {porte: porteChambre, monstre});
  const {x0: cx0, x1: cx1, z0: cz0, z1: cz1} = COULOIR;
  const fenteCh = (
    <g key="fch">
      {rx(cam, PCH.x - 1, PCH.z0, PCH.z1, SOL - 14, SOL, '#9fb8ff', 'fl', lumiereChambre * (1 - porteChambre))}
      {fenteChambre !== null && rx(cam, PCH.x - 2, PCH.z0 + 0.3 * fenteChambre + 0.2, PCH.z0 + 0.3 * fenteChambre + 0.5, SOL - 14, SOL, '#000', 'fo', 0.95)}
    </g>
  );
  const murBout = (
    <g key="murBout">
      {/* le mur du bout, percé de la porte de la chambre */}
      {rx(cam, cx1, cz0, PCH.z0, PLAF, SOL, '#3e3630', 'cb1')}
      {rx(cam, cx1, PCH.z1, cz1, PLAF, SOL, '#3e3630', 'cb2')}
      {rx(cam, cx1, PCH.z0, PCH.z1, PLAF, -380, '#3e3630', 'cb3')}
      {porteChambre < 0.01 && cam.x < cx1 && fenteCh}
    </g>
  );
  const couloir = (
    <g key="couloir">
      {ry(cam, SOL, cx0, cx1, cz0, cz1, PARQUET, 'csol')}
      {[...Array(6)].map((_, k) => ligne(cam, [cx0 + k * 380, SOL, cz0], [cx0 + k * 380, SOL, cz1], 2, '#2a1e16', `cl${k}`))}
      {ry(cam, PLAF, cx0, cx1, cz0, cz1, PLAFOND, 'cpl')}
      {rz(cam, cz0, cx0, cx1, PLAF, SOL, '#463a32', 'cm0')}
      {rz(cam, cz1, cx0, cx1, PLAF, SOL, '#40352e', 'cm1')}
      {/* tapis de couloir, photos aux murs, petite applique */}
      {ry(cam, SOL - 1, cx0 + 200, cx1 - 200, cz0 + 0.2, cz1 - 0.2, '#5a2a2a', 'tap', 0.8)}
      {plaque(cam, [2100, -330, cz1 - 0.01], [1, 0, 0], [0, 1, 0], 260, 200, <g><rect width="260" height="200" fill="#16120f" /><rect x="16" y="16" width="228" height="168" fill="#6a5a4a" /><circle cx="90" cy="80" r="30" fill="#e8c8a8" /><circle cx="170" cy="90" r="30" fill="#e8c8a8" /></g>, 'ph1')}
      {plaque(cam, [2800, -300, cz1 - 0.01], [1, 0, 0], [0, 1, 0], 200, 260, <g><rect width="200" height="260" fill="#16120f" /><rect x="14" y="14" width="172" height="232" fill="#3a5a6a" /></g>, 'ph2')}
      {halo(cam, 2400, -560, cz0 + 0.45, 900, 'ap-chaud', 0.35 * L, 'chl')}
    </g>
  );
  // ---------- le salon ----------
  const tremble = choc * (random(`ch${f}`) - 0.5) * 14;
  const { x0: px0, x1: px1, z: pz, haut} = PORTE;
  const salon = (
    <g key="salon">
      {ry(cam, SOL, -1500, 1500, 0, 6, PARQUET, 'sol')}
      {[...Array(13)].map((_, k) => ligne(cam, [-1500 + k * 250, SOL, 0], [-1500 + k * 250, SOL, 6], 2, '#2a1e16', `pq${k}`, 0.8))}
      {[...Array(6)].map((_, k) => ligne(cam, [-1500 + (k % 2) * 125, SOL, k + 0.5], [1500, SOL, k + 0.5], 1.5, '#2a1e16', `pz${k}`, 0.5))}
      {ry(cam, PLAF, -1500, 1500, 0, 6, PLAFOND, 'plaf')}
      {/* moulures du plafond */}
      {ligne(cam, [-1500, PLAF + 20, 5.98], [1500, PLAF + 20, 5.98], 6, '#5a4c42', 'mo1')}
      {ligne(cam, [-1498, PLAF + 20, 0], [-1498, PLAF + 20, 6], 6, '#5a4c42', 'mo2')}
      {ligne(cam, [1498, PLAF + 20, 0], [1498, PLAF + 20, 6], 6, '#5a4c42', 'mo3')}
      {/* mur du fond (porte d'entrée) */}
      {rz(cam, 6, -1500, px0, PLAF, SOL, MUR, 'mf1')}
      {rz(cam, 6, px1, 1500, PLAF, SOL, MUR, 'mf2')}
      {rz(cam, 6, px0, px1, PLAF, haut, MUR, 'mf3')}
      {/* la porte d'entrée (elle tremble quand on frappe) */}
      <g key="porte" transform={`translate(${tremble} 0)`}>
        {rz(cam, 6.01, px0 - 40, px1 + 40, haut - 40, SOL, '#2a221c', 'chb')}
        {rz(cam, 6, px0, px1, haut, SOL, '#6a5444', 'pt')}
        {rz(cam, 5.999, px0 + 50, px1 - 50, haut + 60, -80, '#5e4a3c', 'pt1')}
        {rz(cam, 5.999, px0 + 50, px1 - 50, 0, SOL - 70, '#5e4a3c', 'pt2')}
        {rz(cam, 5.998, px1 - 90, px1 - 40, -10, 50, '#c9b48a', 'poi')}
        {rz(cam, 5.998, px1 - 80, px1 - 50, -120, -80, '#a8946a', 'ver')}
        {/* chaîne de sûreté */}
        {ligne(cam, [px1 - 60, -230, 5.996], [px1 - 200, -200, 5.996], 5, '#b8b8b8', 'cha')}
        {/* judas */}
        {cam.visible(5.998, JUDAS.x, JUDAS.y) && (
          <g>
            <circle cx={cam.proj(JUDAS.x, JUDAS.y, 5.998)[0]} cy={cam.proj(JUDAS.x, JUDAS.y, 5.998)[1]} r={18 * cam.scale(5.998, JUDAS.x, JUDAS.y)} fill="#c9b48a" />
            <circle cx={cam.proj(JUDAS.x, JUDAS.y, 5.997)[0]} cy={cam.proj(JUDAS.x, JUDAS.y, 5.997)[1]} r={9 * cam.scale(5.997, JUDAS.x, JUDAS.y)} fill="#e6f2ff" opacity={0.75} />
          </g>
        )}
        {/* la lumière du palier sous la porte, et l'ombre de ses pieds */}
        {rz(cam, 5.999, px0, px1, SOL - 12, SOL, '#dfeaff', 'fen', 0.7)}
        {fente > 0 && rz(cam, 5.998, px0 + 90, px0 + 180, SOL - 12, SOL, '#000', 'pie1', fente)}
        {fente > 0 && rz(cam, 5.998, px0 + 230, px0 + 320, SOL - 12, SOL, '#000', 'pie2', fente)}
        {fente > 0 && ry(cam, SOL - 1, px0 + 60, px1 - 60, 5.75, 5.999, '#000', 'pie3', 0.35 * fente)}
        {ry(cam, SOL - 1, px0, px1, 5.86, 5.999, '#dfeaff', 'lfs', 0.08 * (1 - fente))}
      </g>
      {/* paillasson intérieur */}
      {ry(cam, SOL - 1, px0 + 20, px1 - 20, 5.35, 5.85, '#5a4a2a', 'pai')}
      {/* console, miroir rond, bol à clés, petite lampe */}
      {plaque(cam, [180, -520, 5.99], [1, 0, 0], [0, 1, 0], 360, 360, <g><circle cx="180" cy="180" r="178" fill="#8a7a5a" /><circle cx="180" cy="180" r="160" fill="#2a3442" /><path d="M80,120 L160,60 L190,80 L100,150 Z" fill="#fff" opacity="0.08" /></g>, 'miroir')}
      {/* patères + vestes */}
      {[0, 1, 2].map((k) => ligne(cam, [-760 + k * 120, -330, 5.99], [-760 + k * 120, -300, 5.92], 10, '#c9b48a', `pat${k}`))}
      {[['#2a3a5a', -760], ['#5a2a2a', -640], ['#3a4a3a', -520]].map(([c, x], k) => quad(cam, [[x - 70, -310, 5.93], [x + 70, -310, 5.93], [x + 90, 60, 5.95], [x - 90, 60, 5.95]], c, `ves${k}`))}
      {/* le grand cadre (il tombe) */}
      {cadre < 1 && plaque(cam, [CADRE.x0, CADRE.y0 + 650 * cadre * cadre, 5.99], [Math.cos(cadre * 0.9), Math.sin(cadre * 0.9), 0], [-Math.sin(cadre * 0.9), Math.cos(cadre * 0.9), 0], 300, 210, <g transform="scale(0.652)"><CadreContenu /></g>, 'cadre')}
      {cadre >= 1 && plaque(cam, [CADRE.x0, SOL - 200, 5.9], [1, 0, 0], [0, 0.6, -0.8], 300, 260, <g transform="scale(0.652 0.8)"><CadreContenu /><path d="M40,30 L200,180 L120,300 M200,180 L400,120" stroke="#dfe8f0" strokeWidth="5" fill="none" opacity="0.7" /></g>, 'cadreT')}
      {/* clou resté au mur */}
      {cadre > 0 && ligne(cam, [CADRE.x0 + 150, CADRE.y0 - 10, 5.99], [CADRE.x0 + 150, CADRE.y0, 5.96], 6, '#999', 'clou')}
      {/* mur gauche + fenêtre */}
      {rx(cam, -1500, 0, FENETRE.z0, PLAF, SOL, MUR2, 'mg1')}
      {rx(cam, -1500, FENETRE.z1, 6, PLAF, SOL, MUR2, 'mg2')}
      {rx(cam, -1500, FENETRE.z0, FENETRE.z1, PLAF, FENETRE.y0, MUR2, 'mg3')}
      {rx(cam, -1500, FENETRE.z0, FENETRE.z1, FENETRE.y1, SOL, MUR2, 'mg4')}
      {plaque(cam, [-1502, FENETRE.y0, FENETRE.z0], [0, 0, 1], [0, 1, 0], 1800, 510, <VueVille f={f} />, 'vue')}
      {ligne(cam, [-1498, FENETRE.y0, 2.9], [-1498, FENETRE.y1, 2.9], 12, '#d8d0c4', 'fv')}
      {ligne(cam, [-1498, FENETRE.y0 - 4, FENETRE.z0], [-1498, FENETRE.y0 - 4, FENETRE.z1], 14, '#d8d0c4', 'fh')}
      {ligne(cam, [-1498, FENETRE.y1 + 6, FENETRE.z0 - 0.05], [-1498, FENETRE.y1 + 6, FENETRE.z1 + 0.05], 20, '#d8d0c4', 'fap')}
      {/* rideaux (s'ouvrent quand il regarde dehors) */}
      {quad(cam, [[-1490, PLAF + 60, FENETRE.z0 - 0.3], [-1490, PLAF + 60, FENETRE.z0 + 0.25 + 0.6 * (1 - rideau)], [-1490, SOL - 40, FENETRE.z0 + 0.2 + 0.6 * (1 - rideau)], [-1490, SOL - 40, FENETRE.z0 - 0.35]], '#7a3a32', 'ri1')}
      {quad(cam, [[-1490, PLAF + 60, FENETRE.z1 - 0.25 - 0.6 * (1 - rideau)], [-1490, PLAF + 60, FENETRE.z1 + 0.3], [-1490, SOL - 40, FENETRE.z1 + 0.35], [-1490, SOL - 40, FENETRE.z1 - 0.2 - 0.6 * (1 - rideau)]], '#7a3a32', 'ri2')}
      {[0.1, 0.25, 0.4].map((k, i) => ligne(cam, [-1489, PLAF + 60, FENETRE.z0 - 0.3 + k * (0.55 + 0.6 * (1 - rideau))], [-1489, SOL - 40, FENETRE.z0 - 0.3 + k * (0.55 + 0.6 * (1 - rideau))], 6, '#5a2a24', `pl${i}`))}
      {ligne(cam, [-1488, PLAF + 50, FENETRE.z0 - 0.4], [-1488, PLAF + 50, FENETRE.z1 + 0.4], 8, '#2a2420', 'tring')}
      {/* tableau + étagère murale à gauche */}
      {plaque(cam, [-1499, -470, 4.4], [0, 0, 1], [0, 1, 0], 900, 300, <g>{[0, 1, 2].map((k) => <g key={k}><rect x={k * 310} width="280" height="300" fill="#17120e" /><rect x={k * 310 + 16} y="16" width="248" height="268" fill={['#6a3a2a', '#2a4a5a', '#5a5a3a'][k]} /></g>)}</g>, 'trio')}
      {/* mur droit : ouverture du couloir, TV, porte de la salle de bain */}
      {rx(cam, 1500, 0, COULOIR.z0, PLAF, SOL, MUR3, 'md1')}
      {rx(cam, 1500, COULOIR.z1, SDB.z0, PLAF, SOL, MUR3, 'md2')}
      {rx(cam, 1500, COULOIR.z0, COULOIR.z1, PLAF, -380, MUR3, 'md3')}
      {rx(cam, 1500, SDB.z1, 6, PLAF, SOL, MUR3, 'md4')}
      {rx(cam, 1500, SDB.z0, SDB.z1, PLAF, -380, MUR3, 'md5')}
      {rx(cam, 1499, SDB.z0, SDB.z1, -380, SOL, '#8a8276', 'sdb')}
      {rx(cam, 1498, SDB.z0 + 0.06, SDB.z1 - 0.06, -320, -60, '#7e776c', 'sdb1')}
      {rx(cam, 1498, SDB.z0 + 0.06, SDB.z1 - 0.06, 20, SOL - 60, '#7e776c', 'sdb2')}
      {ligne(cam, [1496, 20, SDB.z0 + 0.08], [1440, 20, SDB.z0 + 0.08], 10, '#c9b48a', 'sdbp')}
      {plaque(cam, [1497, -330, SDB.z1 - 0.28], [0, 0, -1], [0, 1, 0], 120, 120, <g><rect width="120" height="120" rx="20" fill="#2a6aa8" /><path d="M30,40 Q60,14 90,40 Z M60,26 L60,12" stroke="#fff" strokeWidth="8" fill="#fff" />{[40, 60, 80].map((x) => <line key={x} x1={x} y1="56" x2={x - 6} y2="100" stroke="#fff" strokeWidth="6" strokeDasharray="10 8" />)}</g>, 'sdbl')}
      {/* encadrement de l'ouverture du couloir */}
      {ligne(cam, [1500, -380, COULOIR.z0], [1500, SOL, COULOIR.z0], 16, '#d8d0c4', 'oc1')}
      {ligne(cam, [1500, -380, COULOIR.z1], [1500, SOL, COULOIR.z1], 16, '#d8d0c4', 'oc2')}
      {ligne(cam, [1500, -380, COULOIR.z0], [1500, -380, COULOIR.z1], 16, '#d8d0c4', 'oc3')}
      {/* la TV accrochée au mur */}
      {rx(cam, 1497, 2.35, 3.95, -330, 20, '#08080a', 'tvc')}
      {tv > 0 && plaque(cam, [1495, -315, 3.92], [0, 0, -1], [0, 1, 0], 1540, 320, <g transform="scale(1.185 0.571)">{tvImage(f)}</g>, 'tvi')}
      {plaque(cam, [1499, -560, 3.9], [0, 0, -1], [0, 1, 0], 1500, 170, <g><rect width="1500" height="10" y="160" fill="#2a2420" />{[...Array(16)].map((_, k) => <rect key={k} x={40 + k * 52 + (k > 9 ? 200 : 0)} y={160 - 110 - (k % 3) * 18} width="40" height={110 + (k % 3) * 18} fill={['#7a3b2e', '#2e5a7a', '#6a6a2e', '#3d6a4a', '#5a3a6a'][k % 5]} />)}<circle cx="1300" cy="110" r="46" fill="#2a5a3a" /></g>, 'etag')}
      {/* mur avant : cuisine */}
      {rz(cam, 0, -1500, 1500, PLAF, SOL, '#41362f', 'mav')}
      {plaque(cam, [1300, -150, 0.01], [-1, 0, 0], [0, 1, 0], 2600, 150, <g>{[...Array(26)].map((_, k) => [...Array(3)].map((_, j) => <rect key={`${k}${j}`} x={k * 100 + 2} y={j * 50 + 2} width="96" height="46" fill={(k + j) % 2 ? '#d8d4c8' : '#c8c4b8'} opacity="0.6" />))}</g>, 'credence')}
      {plaque(cam, [1200, -560, 0.01], [-1, 0, 0], [0, 1, 0], 1400, 300, <g>{[0, 1, 2, 3].map((k) => <rect key={k} x={k * 350 + 5} width="340" height="300" fill="#5a4a3a" stroke="#3a2e24" strokeWidth="8" />)}</g>, 'placards')}
      {/* lumières : lampadaire, lampe de la console, TV */}
      {halo(cam, -1250, -250, 1.0, 1900, 'ap-chaud', 0.9 * L, 'hl1')}
      {disqueSol(cam, -1250, 1.0, 1300, 1.1, PLAF + 1, 'url(#ap-chaud)', 0.6 * L, 'pl1')}
      {disqueSol(cam, 380, 5.6, 900, 0.6, PLAF + 1, 'url(#ap-chaud)', 0.35 * L, 'pl2')}
      {/* poutres au plafond */}
      {[1.0, 2.2, 3.4, 4.6].map((z, k) => boite(cam, -1500, 1500, PLAF, PLAF + 70, z - 0.09, z + 0.09, ['#2a201a', '#3a2c22', '#33271e', '#2e231b'], `pou${k}`))}
      {/* néon rond rose au-dessus du lampadaire */}
      {plaque(cam, [-1497, -560, 0.55], [0, 0, 1], [0, 1, 0], 600, 260, <g><circle cx="130" cy="130" r="110" fill="none" stroke="#ff6ab8" strokeWidth="14" /><text x="380" y="160" fontSize="90" textAnchor="middle" fill="#ff8ac8" fontWeight="900" fontFamily="'DejaVu Sans', Arial">chill</text></g>, 'neonR')}
      {halo(cam, -1490, -430, 0.85, 1100, 'ap-rose', 0.55 * L, 'hnr')}
      {halo(cam, 380, -100, 5.75, 1100, 'ap-chaud', 0.6 * L, 'hl2')}
      {tv > 0 && halo(cam, 1400, -150, 3.15, 1800, 'ap-tv', 0.45 + 0.2 * Math.sin(f / 3) * random(`tv${Math.floor(f / 5)}`), 'htv')}
      {disqueSol(cam, -1150, 1.2, 900, 0.8, SOL - 1, 'url(#ap-chaud)', 0.5 * L, 'sl1')}
      {tv > 0 && disqueSol(cam, 900, 3.2, 900, 1.0, SOL - 1, 'url(#ap-tv)', 0.35, 'sl2')}
    </g>
  );
  // ---------- meubles (triés en profondeur avec les persos) ----------
  // canapé (dos au mur gauche, face à la TV)
  items.push(item(3.5, -400, 300, (
    <g key="canape">
      {boite(cam, -650, -150, 250, SOL, 2.3, 4.7, ['#5a6a7a', '#46545f', '#3e4a55'], 'assise')}
      {boite(cam, -650, -500, -20, 250, 2.3, 4.7, ['#5a6a7a', '#46545f', '#3e4a55'], 'dossier')}
      {boite(cam, -650, -150, 120, SOL, 2.15, 2.3, ['#52606c', '#46545f', '#3a4650'], 'acc1')}
      {boite(cam, -650, -150, 120, SOL, 4.7, 4.85, ['#52606c', '#46545f', '#3a4650'], 'acc2')}
      {boite(cam, -490, -390, 60, 240, 2.6, 3.05, ['#c8a85a', '#b8984a', '#a8883a'], 'cous1')}
      {boite(cam, -490, -390, 60, 240, 4.0, 4.45, ['#a84a4a', '#983a3a', '#882a2a'], 'cous2')}
      {boite(cam, -460, -170, 230, 262, 3.3, 4.2, ['#8a8a9a', '#7a7a8a', '#6a6a7a'], 'plaid')}
    </g>
  )));
  // tapis + table basse
  items.push(item(3.6, 350, SOL, ry(cam, SOL - 2, -80, 1180, 2.4, 4.8, '#6a4a3a', 'tapis')));
  items.push(item(3.55, 350, SOL - 5, (
    <g key="tapis2">
      {ry(cam, SOL - 3, 0, 1100, 2.5, 4.7, '#7a5a44', 't2', 0.7)}
      {ligne(cam, [0, SOL - 4, 3.6], [1100, SOL - 4, 3.6], 4, '#a8846a', 't3', 0.6)}
    </g>
  )));
  items.push(item(3.45, 350, 300, (
    <g key="table">
      {boite(cam, 120, 580, 260, 290, 3.0, 3.9, ['#6a4a32', '#5a3e2a', '#4e3424'], 'plateau')}
      {[[140, 3.05], [560, 3.05], [140, 3.85], [560, 3.85]].map(([x, z], k) => ligne(cam, [x, 290, z], [x, SOL, z], 14, '#3e2a1e', `pied${k}`))}
      {boite(cam, 200, 340, 240, 260, 3.2, 3.5, ['#d8d0c4', '#c8c0b4', '#b8b0a4'], 'mag')}
      {boite(cam, 420, 470, 190, 260, 3.55, 3.62, ['#c83a3a', '#b82a2a', '#a82a2a'], 'canette')}
      {boite(cam, 360, 390, 215, 260, 3.25, 3.3, ['#e8d8a8', '#d8c898', '#c8b888'], 'bougie')}
      {halo(cam, 375, 200, 3.27, 220, 'ap-chaud', 0.8 * L, 'bh')}
    </g>
  )));
  // meuble TV
  items.push(item(3.15, 1350, 300, boite(cam, 1220, 1490, 230, SOL, 2.2, 4.1, ['#3a2e26', '#2e241e', '#2a201a'], 'meubletv')));
  items.push(item(2.5, 1320, 200, (
    <g key="deco-tv">
      {boite(cam, 1300, 1400, 120, 230, 2.4, 2.55, ['#2a5a3a', '#1e4a2e', '#1a3e26'], 'pot')}
      {billboard(cam, 1350, 140, 2.48, <g><path d="M0,0 Q-60,-120 -20,-200 M0,0 Q30,-140 70,-180 M0,0 Q-10,-100 10,-230" stroke="#2e6a3a" strokeWidth="18" fill="none" strokeLinecap="round" /></g>, 'pl')}
    </g>
  )));
  // bibliothèque contre le mur du fond (gauche)
  items.push(item(5.85, -1050, 0, (
    <g key="biblio">
      {boite(cam, -1450, -850, -450, SOL, 5.65, 6, ['#4a3a2c', '#5a4636', '#4a3a2c'], 'bib')}
      {cam.z < 5.65 &&
        [-380, -170, 40, 250].map((y, k) => (
          <g key={k}>
            {rz(cam, 5.649, -1430, -870, y, y + 170, '#2a1e16', `nich${k}`)}
            {[...Array(9)].map((_, i) => rz(cam, 5.648, -1420 + i * 58, -1420 + i * 58 + 48, y + 30 + (i % 3) * 14, y + 168, ['#7a3b2e', '#2e5a7a', '#6a6a2e', '#3d6a4a', '#5a3a6a', '#8a6a3a'][(i + k) % 6], `l${k}${i}`))}
          </g>
        ))}
      {/* guirlande lumineuse sur la bibliothèque */}
      {[...Array(9)].map((_, k) => {
        const x = -1440 + k * 70;
        const y = -450 + Math.sin(k * 1.3) * 25 + 20;
        return cam.visible(5.64, x, y) && <circle key={`g${k}`} cx={cam.proj(x, y, 5.64)[0]} cy={cam.proj(x, y, 5.64)[1]} r={Math.max(2, 9 * cam.scale(5.64, x, y))} fill="#ffd27a" opacity={(0.6 + 0.4 * Math.sin(f / 6 + k)) * L} />;
      })}
    </g>
  )));
  // console + lampe sous le miroir
  items.push(item(5.8, 360, 200, (
    <g key="console">
      {boite(cam, 160, 560, 130, 160, 5.6, 5.98, ['#6a4a32', '#5a3e2a', '#4e3424'], 'cplat')}
      {ligne(cam, [180, 160, 5.65], [180, SOL, 5.65], 12, '#3e2a1e', 'cp1')}
      {ligne(cam, [540, 160, 5.65], [540, SOL, 5.65], 12, '#3e2a1e', 'cp2')}
      {boite(cam, 340, 420, -60, 130, 5.72, 5.85, ['#e8d0a0', '#d8b880', '#c8a870'], 'abat')}
      {boite(cam, 200, 300, 100, 130, 5.7, 5.85, ['#3a5a7a', '#2a4a6a', '#2a4a6a'], 'bol')}
    </g>
  )));
  // lampadaire + monstera près de la fenêtre
  items.push(item(1.0, -1250, 0, (
    <g key="lampadaire">
      {ligne(cam, [-1250, SOL, 1.0], [-1250, -200, 1.0], 10, '#1a1a1a', 'lpt')}
      {boite(cam, -1340, -1160, -330, -170, 0.92, 1.08, ['#f0d8a8', '#e8c890', '#d8b880'], 'lpa')}
      {disqueSol(cam, -1250, 1.0, 140, 0.14, SOL - 2, '#1a1a1a', 1, 'lpb')}
    </g>
  )));
  items.push(item(4.5, -1300, 0, (
    <g key="monstera">
      {boite(cam, -1400, -1200, 200, SOL, 4.4, 4.6, ['#c8b8a0', '#b8a890', '#a89880'], 'potm')}
      {billboard(cam, -1300, 200, 4.5, <g>{[[-150, -260, -30], [-40, -380, 0], [90, -300, 25], [150, -150, 40], [-170, -120, -50]].map(([x, y, r], k) => <g key={k}><line x1="0" y1="0" x2={x * 0.8} y2={y * 0.8} stroke="#1e4a26" strokeWidth="10" /><ellipse cx={x} cy={y} rx="80" ry="55" fill={k % 2 ? '#2a6a34' : '#235a2c'} transform={`rotate(${r} ${x} ${y})`} /></g>)}</g>, 'fm')}
    </g>
  )));
  // radiateur sous la fenêtre
  items.push(item(2.9, -1460, 250, (
    <g key="radiateur">
      {boite(cam, -1495, -1440, 120, 360, 2.2, 3.6, ['#d8d0c4', '#c8c0b4', '#b8b0a4'], 'rad')}
    </g>
  )));
  // coin cuisine (comptoir le long du mur avant)
  items.push(item(0.3, -500, 200, (
    <g key="cuisine">
      {boite(cam, -1450, 1300, 90, SOL, 0.0, 0.6, ['#2a2a2e', '#5e564e', '#544c45'], 'comptoir')}
      {boite(cam, -1450, 1300, 60, 90, 0.0, 0.64, ['#3a3a40', '#2a2a2e', '#2a2a2e'], 'plan')}
      {boite(cam, 1320, 1490, -520, SOL, 0.0, 0.65, ['#6a6e72', '#74787c', '#5e6266'], 'frigo')}
      {boite(cam, -300, 100, -60, 60, 0.15, 0.4, ['#3a3a40', '#2a2a2e', '#2a2a2e'], 'microondes')}
      {boite(cam, -900, -800, -80, 60, 0.2, 0.3, ['#c8a85a', '#b8984a', '#a8883a'], 'bouteille')}
    </g>
  )));
  // suspension au plafond (éteinte)
  items.push(item(3.0, 0, PLAF, (
    <g key="suspension">
      {ligne(cam, [0, PLAF, 3.0], [0, -420, 3.0], 3, '#111', 'sf')}
      {boite(cam, -110, 110, -440, -360, 2.9, 3.1, ['#2a2a2a', '#1e1e1e', '#1a1a1a', '#e8d8b0'], 'sab')}
    </g>
  )));

  // ordre de dessin : de la pièce la plus loin à la plus proche
  const dansCouloir = cam.x > COULOIR.x0;
  const dansChambre = cam.x > CHAMBRE.x0;
  const chambreG = <g key="chambre">{ch.fond}</g>;
  const ordre = dansChambre ? [salon, couloir, murBout, chambreG] : dansCouloir ? [salon, chambreG, murBout, couloir] : [chambreG, murBout, couloir, salon];
  const fond = (
    <g>
      <Defs />
      <rect width="1080" height="1920" fill="#050405" />
      {ordre}
    </g>
  );
  const brume = (
    <g>
      <defs>
        <radialGradient id="ap-brume" cx={cam.fuite[0]} cy={cam.fuite[1]} r="1100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0a0604" stopOpacity="0.3" />
          <stop offset="1" stopColor="#0a0604" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#ap-brume)" />
    </g>
  );
  return {fond, items: dansCouloir ? [] : items, brume};
};

// ===================== LE PALIER (vu par le judas) =====================
// Couloir de l'immeuble : X -3500 → 3500, Z 6 (notre porte) → 7.6 (portes d'en face), plafond Y -650.
export const PZ = 7.6;
const PPLAF = -650;
const NEONS = [-2200, 850, 2700];
// neon(k) → intensité ; faux : {x, z, tilt, sy} ou null ; sac : le sac posé par terre (0 → 1)
export const palier = (cam, f, {neon = () => 1, faux = null, sac = 0} = {}) => {
  const n = NEONS.map((x, k) => neon(k));
  const moy = (n[0] + n[1] + n[2]) / 3;
  const fond = (
    <g>
      <Defs />
      <rect width="1080" height="1920" fill="#030304" />
      {/* sol en lino, plafond, murs */}
      {ry(cam, SOL, -3500, 3500, 6, PZ, '#3a3a34', 'sol')}
      {[...Array(28)].map((_, k) => ligne(cam, [-3500 + k * 260, SOL, 6], [-3500 + k * 260, SOL, PZ], 2, '#2a2a26', `sl${k}`))}
      {[6.4, 6.8, 7.2].map((z, k) => ligne(cam, [-3500, SOL, z], [3500, SOL, z], 2, '#2a2a26', `sz${k}`))}
      {ry(cam, PPLAF, -3500, 3500, 6, PZ, '#26272a', 'pl')}
      {rz(cam, PZ, -3500, 3500, PPLAF, SOL, '#4a4a3e', 'mur')}
      {rz(cam, PZ - 0.001, -3500, 3500, 60, SOL, '#3a2e26', 'lambris')}
      {ligne(cam, [-3500, 60, PZ - 0.002], [3500, 60, PZ - 0.002], 8, '#2a221c', 'cimaise')}
      {rz(cam, 6, -3500, 3500, PPLAF, SOL, '#46463a', 'murP')}
      {rx(cam, -3500, 6, PZ, PPLAF, SOL, '#3e3e34', 'bout1')}
      {rx(cam, 3500, 6, PZ, PPLAF, SOL, '#3e3e34', 'bout2')}
      {/* portes d'en face : 41, 43, 45 */}
      {[[-1100, '41'], [400, '43'], [1700, '45']].map(([x, num], k) => (
        <g key={`pf${k}`}>
          {rz(cam, PZ - 0.003, x - 220, x + 220, -420, SOL, '#2a1e18', `pc${k}`)}
          {rz(cam, PZ - 0.004, x - 190, x + 190, -390, SOL, '#4a3428', `pp${k}`)}
          {rz(cam, PZ - 0.005, x + 120, x + 160, -10, 30, '#b8a070', `pg${k}`)}
          {plaque(cam, [x - 50, -340, PZ - 0.005], [1, 0, 0], [0, 1, 0], 100, 60, <g><rect width="100" height="60" rx="8" fill="#c8b07a" /><text x="50" y="45" fontSize="40" textAnchor="middle" fontWeight="900" fill="#2a1e14" fontFamily="'DejaVu Sans', Arial">{num}</text></g>, `num${k}`)}
          {ry(cam, SOL - 1, x - 200, x + 200, PZ - 0.35, PZ - 0.01, '#3a2a1a', `tap${k}`)}
        </g>
      ))}
      {/* ascenseur au fond à gauche */}
      {rx(cam, -3499, 6.2, 7.4, -500, SOL, '#6a6e74', 'asc')}
      {ligne(cam, [-3497, -500, 6.8], [-3497, SOL, 6.8], 4, '#3a3e44', 'ascl')}
      {plaque(cam, [-3497, -620, 6.55], [0, 0, 1], [0, 1, 0], 500, 90, <g><rect width="500" height="90" fill="#111" /><text x="250" y="70" fontSize="64" textAnchor="middle" fill="#ff5a3a" fontFamily="'DejaVu Sans Mono', monospace">▲ 4</text></g>, 'ascn')}
      {/* sortie de secours au fond à droite */}
      {rx(cam, 3499, 6.3, 7.3, -420, SOL, '#3a4a40', 'sortie')}
      {plaque(cam, [3497, -600, 7.2], [0, 0, -1], [0, 1, 0], 800, 120, <g><rect width="800" height="120" rx="10" fill="#1a8a3a" /><text x="400" y="88" fontSize="70" textAnchor="middle" fill="#e8ffe8" fontWeight="900" fontFamily="'DejaVu Sans', Arial">SORTIE</text></g>, 'sortieP')}
      {halo(cam, 3480, -540, 6.8, 900, 'ap-vert', 0.6, 'sortieH')}
      {/* extincteur, interrupteur, panneau d'affichage, radiateur, sac poubelle */}
      {rz(cam, PZ - 0.01, 2500, 2620, -260, 40, '#b81a1a', 'ext')}
      {rz(cam, PZ - 0.01, -250, -170, -150, -40, '#d8d0c4', 'inter')}
      {halo(cam, -210, -95, PZ - 0.02, 160, 'ap-sodium', 0.9, 'interH')}
      {plaque(cam, [-2400, -430, PZ - 0.01], [1, 0, 0], [0, 1, 0], 600, 380, <g><rect width="600" height="380" fill="#6a4a2a" /><rect x="20" y="20" width="560" height="340" fill="#a8845a" />{[[40, 40, '#f0ece0', -4], [220, 60, '#f8e070', 3], [400, 40, '#f0ece0', 2], [80, 210, '#ffb0c0', -2], [300, 200, '#f0ece0', 5]].map(([x, y, c, r], k) => <g key={k} transform={`rotate(${r} ${x + 70} ${y + 60})`}><rect x={x} y={y} width="150" height="130" fill={c} />{[0, 1, 2, 3].map((l) => <rect key={l} x={x + 14} y={y + 20 + l * 26} width={110 - l * 12} height="8" fill="#555" opacity="0.6" />)}</g>)}</g>, 'affiche')}
      {rz(cam, PZ - 0.01, -3000, -2600, 80, 360, '#c8c0b4', 'radia')}
      {/* les néons au plafond (ils grésillent) */}
      {NEONS.map((x, k) => (
        <g key={`ne${k}`}>
          {boite(cam, x - 400, x + 400, PPLAF, PPLAF + 30, 6.7, 6.9, ['#888', '#666', '#555', n[k] > 0.3 ? '#f0f6ff' : '#3a3c40'], `nb${k}`)}
          {halo(cam, x, PPLAF + 40, 6.8, 2200, 'ap-neon', 0.8 * n[k], `nh${k}`)}
          {disqueSol(cam, x, 6.8, 1100, 0.75, SOL - 1, 'url(#ap-neon)', 0.5 * n[k], `nd${k}`)}
        </g>
      ))}
      <rect width="1080" height="1920" fill="#000" opacity={0.55 * (1 - moy)} />
    </g>
  );
  const items = [];
  if (faux)
    items.push(
      item(faux.z, faux.x, SOL, (
        <LivreurPerso key="faux" cam={cam} id="faux" x={faux.x} z={faux.z} lum={0.35 + 0.55 * moy} teinte={[0.85, 0.92, 1.05]} sy={faux.sy || 1.12} visiere="noire" casque="#16201a" sac="#1f6a3c" tilt={faux.tilt || 0} dos={false} epauleG={4} epauleD={-4} ombre={0.6} />
      ))
    );
  if (sac > 0)
    items.push(
      item(6.45, 900, SOL, (
        <g key="sac" opacity={sac}>
          {boite(cam, 760, 1040, 140, SOL, 6.32, 6.58, ['#2a8a4a', '#1f6a3c', '#1a5a32'], 'sacb')}
          {boite(cam, 760, 1040, 120, 140, 6.32, 6.58, ['#1a5a32', '#18502c', '#14462a'], 'sacc')}
        </g>
      ))
    );
  const brume = (
    <g>
      <defs>
        <radialGradient id="pa-brume" cx={cam.fuite[0]} cy={cam.fuite[1]} r="900" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#020203" stopOpacity="0.6" />
          <stop offset="1" stopColor="#020203" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#pa-brume)" />
    </g>
  );
  return {fond, items, brume};
};

// ===================== LA RUE, vue du 4e étage =====================
// Notre immeuble : façade en Z = 10 (côté rue vers -Z), X -4200 → 4200, 6 étages de 1100.
// Trottoir Z 6.6 → 10, chaussée Z 0.4 → 6.6, trottoir d'en face Z -1 → 0.4, immeubles d'en face en Z -1.
export const FACADE = 10;
export const ETAGE = 1100;
const niveau = (k) => SOL - k * ETAGE;
// notre fenêtre (4e étage, au centre)
export const NOTRE = {x0: -300, x1: 300, y0: niveau(4) - 330 - 720, y1: niveau(4) - 330};
export const LAMPE = {x: -900, z: 7.0, tete: -1900};
const ROUTE_Y = SOL + 30;
const FEN_X = [-3400, -1700, 0, 1700, 3400];

const voiture = (cam, x0, x1, z0, z1, coul, key, clign = 0) => {
  const h = ROUTE_Y;
  const lx = (x1 - x0) * 0.2;
  return (
    <g key={key}>
      {[[x0 + 120, z0], [x1 - 160, z0], [x0 + 120, z1 - 0.12], [x1 - 160, z1 - 0.12]].map(([x, z], k) => boite(cam, x, x + 140, h - 120, h, z, z + 0.12, ['#0a0a0a', '#111', '#0a0a0a'], `ro${k}`))}
      {boite(cam, x0, x1, h - 330, h - 90, z0, z1, coul, 'carr')}
      {boite(cam, x0 + lx, x1 - lx * 1.2, h - 560, h - 330, z0 + 0.06, z1 - 0.06, [coul[0], '#1a2430', '#1c2733'], 'cab')}
      {clign > 0 && boite(cam, x1 - 40, x1, h - 260, h - 220, z0 - 0.01, z0 + 0.05, ['#ffa000', '#ffa000', '#ffa000'], 'cl')}
    </g>
  );
};
const arbre = (cam, x, z, key) => (
  <g key={key}>
    {ligne(cam, [x, SOL, z], [x, -900, z], Math.max(2, 50 * cam.scale(z, x, -400)), '#1a1410', 'tr')}
    {billboard(cam, x, -1100, z, <g>{[[-200, 0, 280], [180, -60, 300], [0, -260, 320], [-60, 160, 260], [220, 180, 240]].map(([dx, dy, r], k) => <circle key={k} cx={dx} cy={dy} r={r} fill={['#0e1a12', '#122016', '#0c160f'][k % 3]} />)}</g>, 'fe')}
  </g>
);
// Scooter garé (vu de côté)
const Scooter = () => (
  <g>
    <circle cx="-190" cy="-60" r="60" fill="#0a0a0a" />
    <circle cx="200" cy="-60" r="60" fill="#0a0a0a" />
    <circle cx="-190" cy="-60" r="24" fill="#555" />
    <circle cx="200" cy="-60" r="24" fill="#555" />
    <path d="M-260,-90 Q-250,-200 -120,-210 L60,-210 Q120,-200 140,-120 L240,-110 L200,-60 L-200,-60 Z" fill="#d8d8dc" />
    <path d="M150,-120 L210,-330 L250,-330" stroke="#222" strokeWidth="18" fill="none" strokeLinecap="round" />
    <rect x="-150" y="-250" width="200" height="40" rx="16" fill="#111" />
    <rect x="-280" y="-470" width="210" height="210" rx="14" fill="#2fae5a" />
    <rect x="-280" y="-470" width="210" height="40" rx="14" fill="#1f7a3e" />
    <circle cx="245" cy="-300" r="16" fill="#ffe8a8" />
  </g>
);

// lampe : lampadaire 0 → 1 ; livreur : {x, z, bras, regard, tete} ; forme : la chose accrochée au-dessus de notre fenêtre (0 → 1)
// dansFenetre : élément dessiné derrière la vitre de notre fenêtre (le bonhomme)
export const quartier = (cam, f, {lampe = 1, livreur = null, forme = 0, dansFenetre = null, clign = true} = {}) => {
  const items = [];
  const etoiles = [...Array(70)].map((_, k) => {
    const x = (random(`qx${k}`) - 0.5) * 60000;
    const y = -9000 - random(`qy${k}`) * 30000;
    const z = cam.z + 40;
    if (!cam.visible(z, x, y)) return null;
    const p = cam.proj(x, y, z);
    return <circle key={k} cx={p[0]} cy={p[1]} r={1 + random(`qr${k}`) * 1.6} fill="#e8eeff" opacity={0.3 + 0.4 * random(`qo${k}`)} />;
  });
  // fenêtres d'une façade : état (éteinte / chaude / froide / TV) déterministe
  const fenetres = (z, xs, etages, cote, cle) =>
    xs.flatMap((x) =>
      etages.map((k) => {
        const y1 = niveau(k) - 330;
        const y0 = y1 - 720;
        const nous = cle === 'n' && k === 4 && x === 0;
        const r = random(`${cle}${x}${k}`);
        const col = nous ? '#d89a5a' : r > 0.72 ? '#e8b878' : r > 0.6 ? '#9ab8e8' : r > 0.55 ? '#5a7ad8' : '#141a26';
        const dz = cote * 0.005;
        return (
          <g key={`${cle}${x}${k}`}>
            {rz(cam, z + dz, x - 340, x + 340, y0 - 40, y1 + 40, '#20201e', 'cad')}
            {rz(cam, z + 2 * dz, x - 300, x + 300, y0, y1, col, 'vit', nous ? 1 : r > 0.55 ? 0.85 : 1)}
            {r > 0.55 && !nous && rz(cam, z + 3 * dz, x - 300, x - 120, y0, y1, '#000', 'rid', 0.35)}
            {ligne(cam, [x, y0, z + 3 * dz], [x, y1, z + 3 * dz], 8, '#20201e', 'mv')}
          </g>
        );
      })
    );
  const fond = (
    <g>
      <Defs />
      <rect width="1080" height="1920" fill="url(#ap-ciel)" />
      {etoiles}
      {cam.visible(cam.z + 40, 9000, -26000) && <circle cx={cam.proj(9000, -26000, cam.z + 40)[0]} cy={cam.proj(9000, -26000, cam.z + 40)[1]} r="40" fill="#e8eeff" opacity="0.85" />}
      {/* immeubles d'en face (façade vers +Z) */}
      {rz(cam, -1, -9000, 9000, -6500, SOL, '#22252c', 'ef')}
      {fenetres(-1, [-7600, -5900, -4200, -2500, -800, 900, 2600, 4300, 6000, 7700], [1, 2, 3, 4, 5], 1, 'e')}
      {rz(cam, -1.005, -3000, 600, -500, SOL, '#0f1418', 'pharmaF')}
      {plaque(cam, [-2800, -660, -0.99], [1, 0, 0], [0, 1, 0], 1400, 170, <g><rect width="1400" height="170" fill="#0a2a14" /><text x="700" y="125" fontSize="110" textAnchor="middle" fill="#3aff7a" fontWeight="900" fontFamily="'DejaVu Sans', Arial" opacity={random(`ph${Math.floor(f / 4)}`) > 0.15 ? 1 : 0.2}>PHARMACIE</text></g>, 'pharma')}
      {halo(cam, -2100, -580, -0.95, 2400, 'ap-vert', 0.5, 'pharmaH')}
      {/* trottoir d'en face, chaussée, notre trottoir */}
      {ry(cam, SOL, -9000, 9000, -1, 0.4, '#2c2c2e', 'tr1')}
      {ry(cam, ROUTE_Y, -9000, 9000, 0.4, 6.6, '#1a1b1f', 'route')}
      {[...Array(14)].map((_, k) => ligne(cam, [-8000 + k * 1300, ROUTE_Y - 1, 3.5], [-7400 + k * 1300, ROUTE_Y - 1, 3.5], Math.max(1, 30 * cam.scale(3.5, -7700 + k * 1300, ROUTE_Y)), '#c8c8b8', `pt${k}`, 0.6))}
      {[...Array(7)].map((_, k) => ry(cam, ROUTE_Y - 1, 4300 + k * 180, 4400 + k * 180, 0.6, 6.4, '#c8c8c0', `pas${k}`, 0.55))}
      {/* flaques qui reflètent les lumières */}
      {disqueSol(cam, -300, 5.2, 700, 0.35, ROUTE_Y - 2, '#3a4a6a', 0.5, 'fl1')}
      {disqueSol(cam, 2600, 2.4, 900, 0.4, ROUTE_Y - 2, '#3a4a6a', 0.45, 'fl2')}
      {rz(cam, 6.6, -9000, 9000, SOL, ROUTE_Y, '#4a4a4a', 'bord')}
      {ry(cam, SOL, -9000, 9000, 6.6, FACADE, '#333336', 'tr2')}
      {[...Array(36)].map((_, k) => ligne(cam, [-9000 + k * 500, SOL - 1, 6.6], [-9000 + k * 500, SOL - 1, FACADE], 2, '#28282a', `dal${k}`))}
      {/* le halo du lampadaire sur le trottoir */}
      {disqueSol(cam, LAMPE.x, LAMPE.z, 1500, 1.3, SOL - 2, 'url(#ap-sodium)', 0.9 * lampe, 'lh')}
      {disqueSol(cam, LAMPE.x - 200, 6.0, 1300, 1.0, ROUTE_Y - 3, 'url(#ap-sodium)', 0.5 * lampe, 'lh2')}
      {/* NOTRE immeuble (façade vers -Z) — visible quand on regarde vers lui */}
      {cam.z < FACADE && (
        <g>
          {rz(cam, FACADE, -4200, 4200, niveau(6) - 200, SOL, '#3a3530', 'nf')}
          {rz(cam, FACADE + 0.3, 4200, 9000, niveau(5) - 200, SOL, '#2e3236', 'nv1')}
          {rz(cam, FACADE - 0.2, -9000, -4200, niveau(7) - 200, SOL, '#33302e', 'nv2')}
          {fenetres(FACADE + 0.3, [5200, 6900, 8600], [1, 2, 3, 4, 5], 1, 'v1')}
          {fenetres(FACADE - 0.2, [-8600, -6900, -5200], [1, 2, 3, 4, 5, 6, 7], 1, 'v2')}
          {/* bandeaux entre les étages + corniche */}
          {[1, 2, 3, 4, 5, 6].map((k) => rz(cam, FACADE - 0.002, -4200, 4200, niveau(k) - 20, niveau(k) + 30, '#2e2a26', `ba${k}`))}
          {fenetres(FACADE, FEN_X, [1, 2, 3, 4, 5, 6], 1, 'n')}
          {/* rez-de-chaussée : laverie, porte de l'immeuble, vieux snack au rideau baissé */}
          {rz(cam, FACADE - 0.003, -3900, -1300, -520, SOL, '#bfe8f0', 'lav')}
          {[...Array(5)].map((_, k) => cam.visible(FACADE - 0.005, -3600 + k * 500, 0) && <circle key={`ma${k}`} cx={cam.proj(-3600 + k * 500, 0, FACADE - 0.005)[0]} cy={cam.proj(-3600 + k * 500, 0, FACADE - 0.005)[1]} r={Math.max(2, 150 * cam.scale(FACADE, -3600 + k * 500, 0))} fill="#5a7a84" stroke="#e8f8ff" strokeWidth={Math.max(1, 20 * cam.scale(FACADE, -3600 + k * 500, 0))} />)}
          {plaque(cam, [-3600, -700, FACADE - 0.006], [1, 0, 0], [0, 1, 0], 2000, 160, <g><rect width="2000" height="160" fill="#06222a" /><text x="1000" y="120" fontSize="120" textAnchor="middle" fill="#7ae8ff" fontWeight="900" fontFamily="'DejaVu Sans', Arial">LAVERIE 24/24</text></g>, 'lavP')}
          {halo(cam, -2600, -200, FACADE - 0.3, 3000, 'ap-cyan', 0.5, 'lavH')}
          {rz(cam, FACADE - 0.003, -500, 500, -420, SOL, '#e8d0a0', 'hall')}
          {rz(cam, FACADE - 0.004, -460, 460, -380, SOL, '#3a3028', 'hallP', 0.5)}
          {ligne(cam, [0, -380, FACADE - 0.005], [0, SOL, FACADE - 0.005], 10, '#2a2420', 'hallM')}
          {rz(cam, FACADE - 0.004, 560, 660, -150, 0, '#c8c8c8', 'interph')}
          {rz(cam, FACADE - 0.003, 1300, 3900, -520, SOL, '#4a4a4c', 'rideau')}
          {[...Array(12)].map((_, k) => ligne(cam, [1300, -500 + k * 78, FACADE - 0.004], [3900, -500 + k * 78, FACADE - 0.004], 4, '#3a3a3c', `rl${k}`))}
          {plaque(cam, [1600, -700, FACADE - 0.006], [1, 0, 0], [0, 1, 0], 2000, 160, <g><rect width="2000" height="160" fill="#2a0808" /><text x="1000" y="120" fontSize="120" textAnchor="middle" fill="#ff4a3a" fontWeight="900" fontFamily="'DejaVu Sans', Arial">{random(`ta${Math.floor(f / 3)}`) > 0.3 ? 'TACOS' : 'TA OS'}</text></g>, 'tacos')}
          {plaque(cam, [1500, -380, FACADE - 0.005], [1, 0, 0], [0, 1, 0], 2200, 500, <g><path d="M100,300 Q300,120 500,280 T900,260 M1200,200 l300,150 l200,-180" stroke="#c83a8a" strokeWidth="40" fill="none" opacity="0.6" /><text x="1100" y="420" fontSize="140" fill="#3ac8a8" opacity="0.6" fontWeight="900" fontFamily="'DejaVu Sans', Arial">ZK 93</text></g>, 'graff')}
          {/* notre fenêtre : l'intérieur chaud, le bonhomme derrière la vitre */}
          {dansFenetre && (
            <g>
              <defs>
                <clipPath id="qu-clip">
                  <polygon points={cam.poly([[NOTRE.x0, NOTRE.y0, FACADE + 0.01], [NOTRE.x1, NOTRE.y0, FACADE + 0.01], [NOTRE.x1, NOTRE.y1, FACADE + 0.01], [NOTRE.x0, NOTRE.y1, FACADE + 0.01]])} />
                </clipPath>
              </defs>
              <g clipPath="url(#qu-clip)">
                {rz(cam, FACADE + 1.5, -1500, 1500, niveau(5), niveau(4), 'url(#ap-interieur)', 'int')}
                {dansFenetre}
                {rz(cam, FACADE + 0.02, NOTRE.x0, NOTRE.x1, NOTRE.y0, NOTRE.y1, '#fff', 'ref', 0.06)}
              </g>
              {ligne(cam, [0, NOTRE.y0, FACADE + 0.005], [0, NOTRE.y1, FACADE + 0.005], 10, '#20201e', 'mvn')}
            </g>
          )}
          {/* la chose accrochée à la façade, juste au-dessus de notre fenêtre */}
          {forme > 0 &&
            plaque(
              cam,
              [-1100, NOTRE.y0 - 760, FACADE - 0.01],
              [1, 0, 0],
              [0, 1, 0],
              2200,
              900,
              <g opacity={forme} filter="url(#ap-flou)">
                <ellipse cx="1100" cy="520" rx="170" ry="260" fill="#050506" />
                <ellipse cx="1100" cy="250" rx="110" ry="120" fill="#050506" />
                <rect x="1060" y="150" width="80" height="110" fill="#050506" transform="rotate(30 1100 250)" />
                {[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sy], k) => (
                  <path key={k} d={`M1100,${sy > 0 ? 420 : 640} L${1100 + sx * 520},${sy > 0 ? 120 + Math.sin(f / 9 + k) * 10 : 860} L${1100 + sx * 900},${sy > 0 ? 300 : 700}`} stroke="#050506" strokeWidth="46" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ))}
                <circle cx="1070" cy="245" r="9" fill="#e8e0d0" opacity="0.7" />
                <circle cx="1128" cy="250" r="9" fill="#e8e0d0" opacity="0.7" />
              </g>,
              'forme'
            )}
        </g>
      )}
    </g>
  );
  // balcons (triés : ils dépassent de la façade)
  if (cam.z < FACADE)
    [2, 3, 5].forEach((k) =>
      [-1700, 1700].forEach((x) => {
        const y = niveau(k) - 330;
        items.push(
          item(FACADE - 0.3, x, y, (
            <g key={`bal${k}${x}`}>
              {boite(cam, x - 450, x + 450, y, y + 60, FACADE - 0.6, FACADE, ['#4a4440', '#3a3430', '#36302c', '#2a2622'], 'dalle')}
              {[...Array(10)].map((_, i) => ligne(cam, [x - 440 + i * 98, y, FACADE - 0.58], [x - 440 + i * 98, y - 330, FACADE - 0.58], 5, '#151515', `ba${i}`))}
              {ligne(cam, [x - 450, y - 330, FACADE - 0.58], [x + 450, y - 330, FACADE - 0.58], 10, '#151515', 'main')}
              {k === 3 && billboard(cam, x + 280, y, FACADE - 0.3, <g><rect x="-60" y="-100" width="120" height="100" fill="#6a4a3a" /><circle cx="0" cy="-170" r="90" fill="#1e3a24" /></g>, 'pot')}
            </g>
          ))
        );
      })
    );
  // lampadaire
  items.push(
    item(LAMPE.z, LAMPE.x, -600, (
      <g key="lampadaire">
        {ligne(cam, [LAMPE.x, SOL, LAMPE.z], [LAMPE.x, LAMPE.tete, LAMPE.z], Math.max(2, 34 * cam.scale(LAMPE.z, LAMPE.x, -600)), '#151618', 'lp')}
        {ligne(cam, [LAMPE.x, LAMPE.tete, LAMPE.z], [LAMPE.x, LAMPE.tete, LAMPE.z - 0.7], Math.max(2, 24 * cam.scale(LAMPE.z, LAMPE.x, -600)), '#151618', 'lb')}
        {boite(cam, LAMPE.x - 120, LAMPE.x + 120, LAMPE.tete - 30, LAMPE.tete + 30, LAMPE.z - 0.85, LAMPE.z - 0.6, ['#222', '#1a1a1a', '#1a1a1a', lampe > 0.3 ? '#ffe2b0' : '#3a3530'], 'lt')}
        {halo(cam, LAMPE.x, LAMPE.tete + 40, LAMPE.z - 0.72, 2200, 'ap-sodium', lampe, 'lh')}
      </g>
    ))
  );
  // voitures garées, arbres, poubelles, plots
  items.push(item(5.8, 1300, ROUTE_Y, voiture(cam, 300, 2300, 5.3, 6.3, ['#5a6470', '#46505a', '#3a434c'], 'v1')));
  items.push(item(5.8, -3200, ROUTE_Y, voiture(cam, -4300, -2500, 5.3, 6.3, ['#7a2a2a', '#5a2020', '#4a1a1a'], 'v2', clign && Math.floor(f / 12) % 2)));
  items.push(item(1.1, 0, ROUTE_Y, voiture(cam, -1000, 900, 0.6, 1.6, ['#2a3a5a', '#22304a', '#1c283e'], 'v3')));
  items.push(item(1.1, 3800, ROUTE_Y, voiture(cam, 2900, 4700, 0.6, 1.6, ['#c8c8c0', '#a8a8a0', '#98988f'], 'v4')));
  items.push(item(8.6, 3000, -400, arbre(cam, 3000, 8.6, 'a1')));
  items.push(item(8.6, -3200, -400, arbre(cam, -3200, 8.6, 'a2')));
  items.push(item(-0.4, -6000, -400, arbre(cam, -6000, -0.4, 'a3')));
  items.push(item(-0.4, 6500, -400, arbre(cam, 6500, -0.4, 'a4')));
  items.push(item(9.3, 1100, 300, boite(cam, 980, 1220, 120, SOL, 9.15, 9.45, ['#1e4a2a', '#2a5a34', '#1a3e24'], 'poub')));
  items.push(item(9.3, 1400, 300, boite(cam, 1280, 1520, 120, SOL, 9.15, 9.45, ['#5a5a1e', '#6a6a2a', '#4a4a1a'], 'poub2')));
  [-2000, -1200, 200, 2600].forEach((x, k) => items.push(item(6.75, x, 300, boite(cam, x - 30, x + 30, 220, SOL, 6.72, 6.78, ['#333', '#2a2a2a', '#222'], `plot${k}`))));
  // le scooter du vrai livreur
  items.push(item(6.2, -1500, ROUTE_Y, billboard(cam, -1500, ROUTE_Y, 6.2, <Scooter />, 'scooter', 1.1)));
  items.push(item(9.5, -2300, 300, (
    <g key="banc">
      {boite(cam, -2700, -1900, 230, 260, 9.35, 9.65, ['#5a3a24', '#4a2e1c', '#3e2618'], 'bs')}
      {boite(cam, -2700, -1900, 40, 230, 9.62, 9.68, ['#5a3a24', '#4a2e1c', '#3e2618'], 'bd')}
      {ligne(cam, [-2650, 260, 9.4], [-2650, SOL, 9.4], 10, '#222', 'b1')}
      {ligne(cam, [-1950, 260, 9.4], [-1950, SOL, 9.4], 10, '#222', 'b2')}
    </g>
  )));
  items.push(item(8.2, 400, SOL, (
    <g key="sol-details">
      {disqueSol(cam, 400, 8.2, 260, 0.26, SOL - 2, '#1e1e20', 1, 'plaque')}
      {disqueSol(cam, -300, 8.0, 500, 0.3, SOL - 2, '#3a4a6a', 0.45, 'flaque')}
      {[...Array(14)].map((_, k) => disqueSol(cam, -3000 + random(`fx${k}`) * 6000, 7 + random(`fz${k}`) * 2.8, 40, 0.03, SOL - 3, ['#5a3a1a', '#6a4a20', '#3a2a14'][k % 3], 0.9, `feuille${k}`))}
    </g>
  )));
  // le vrai livreur
  if (livreur)
    items.push(
      item(livreur.z, livreur.x, SOL, (
        <LivreurPerso key="vrai" cam={cam} id="vrai" x={livreur.x} z={livreur.z} lum={0.75 * Math.max(0.4, lampe)} teinte={[1.1, 0.95, 0.8]} visiere="ouverte" dos={livreur.dos || false} epauleD={livreur.epauleD || 0} coudeD={livreur.coudeD || 0} epauleG={livreur.epauleG || 0} worry={livreur.worry || 0} eyes={livreur.eyes || 1} pupilY={livreur.pupilY || 0} smile={livreur.smile || 0} tilt={livreur.tilt || 0} scream={livreur.scream || 0} />
      ))
    );
  const brume = (
    <g>
      <defs>
        <radialGradient id="qu-brume" cx={cam.fuite[0]} cy={cam.fuite[1]} r="1200" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0a1020" stopOpacity="0.55" />
          <stop offset="1" stopColor="#0a1020" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#qu-brume)" />
    </g>
  );
  return {fond, items, brume};
};
