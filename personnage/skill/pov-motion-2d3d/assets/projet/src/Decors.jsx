import {random} from 'remotion';
import {SOL} from './Rue';

// Petit utilitaire : segment 3D découpé derrière la caméra
const ligne = (cam, A, B, w, col, key, op = 1) => {
  const r = cam.seg(A, B);
  return r ? <line key={key} x1={r[0][0]} y1={r[0][1]} x2={r[1][0]} y2={r[1][1]} stroke={col} strokeWidth={w} opacity={op} strokeLinecap="round" /> : null;
};

// Billboard : un dessin en coordonnées locales (unités monde, pieds en 0,0) posé dans la scène
const billboard = (cam, x, y, z, contenu, key, taille = 1) => {
  if (!cam.visible(z, x, y - 300)) return null;
  const [px, py] = cam.proj(x, y, z);
  return (
    <g key={key} transform={`translate(${px} ${py}) scale(${cam.scale(z, x, y - 300) * taille})`}>
      {contenu}
    </g>
  );
};

const brumeDef = (cam, id, couleur, force = 0.8) => (
  <radialGradient id={id} cx={cam.fuite[0]} cy={cam.fuite[1]} r="950" gradientUnits="userSpaceOnUse">
    <stop offset="0" stopColor={couleur} stopOpacity={force} />
    <stop offset="0.25" stopColor={couleur} stopOpacity={force * 0.6} />
    <stop offset="0.6" stopColor={couleur} stopOpacity="0.12" />
    <stop offset="1" stopColor={couleur} stopOpacity="0" />
  </radialGradient>
);

// ===================== LA RUELLE =====================
// Ruelle étroite le long de Z (de -0.5 à 14), murs de briques en X = ±430.
export const RX = 430;
const RFOND = 14;
const RTOP = -2600;
export const AMPOULES = [
  {x: 330, z: 2.5, mur: RX},
  {x: 330, z: 7.6, mur: RX},
  {x: -330, z: 11.2, mur: -RX},
];
export const POUBELLES = [
  [3.6, 4.3],
  [5.0, 5.7],
];

export const ruelle = (cam, f, {ampoule = () => 1} = {}) => {
  const {poly} = cam;
  const z0 = -0.5;
  const mortier = [];
  for (let y = -1300; y < SOL; y += 85) {
    for (const x of [-RX, RX]) mortier.push(ligne(cam, [x, y, z0], [x, y, RFOND], 2, '#1d110d', `m${x}${y}`, 0.8));
  }
  const fenetres = [];
  [1.2, 3.4, 5.6, 7.8, 10, 12.2].forEach((z, i) => {
    const x = i % 2 ? RX : -RX;
    for (const y of [-950, -1750]) {
      const allumee = i === 3 && y === -950;
      fenetres.push(
        <g key={`f${z}${y}`}>
          <polygon points={poly([[x, y - 220, z], [x, y - 220, z + 0.5], [x, y + 220, z + 0.5], [x, y + 220, z]])} fill={allumee ? '#8a8f4a' : '#0b0a0c'} opacity={allumee ? 0.5 + 0.5 * (random(`fa${Math.floor(f / 6)}`) > 0.3 ? 1 : 0.2) : 1} />
          {[0.12, 0.25, 0.38].map((dz) => ligne(cam, [x, y - 220, z + dz], [x, y + 220, z + dz], 3, '#1c1a1a', `b${dz}`))}
        </g>
      );
    }
  });
  // câbles qui pendent d'un mur à l'autre
  const cables = [2.1, 5.3, 8.6, 11.4].map((z, k) => {
    const pts = [...Array(9)].map((_, i) => {
      const t = i / 8;
      return [-RX + t * 2 * RX, -1200 + Math.sin(t * Math.PI) * (220 + k * 40), z + (t - 0.5) * 0.3];
    });
    return <g key={`c${z}`}>{pts.slice(1).map((p, i) => ligne(cam, pts[i], p, 3, '#08080a', i))}</g>;
  });
  const flaques = [
    [[-200, SOL, 2.2], [60, SOL, 2.1], [140, SOL, 2.6], [-120, SOL, 2.8]],
    [[80, SOL, 6.1], [330, SOL, 6.0], [380, SOL, 6.7], [120, SOL, 6.9]],
    [[-300, SOL, 9.1], [-60, SOL, 9.0], [0, SOL, 9.6], [-260, SOL, 9.8]],
  ];
  const halos = AMPOULES.map((a, i) => {
    const v = ampoule(i);
    if (v < 0.03) return null;
    const pts = [...Array(18)].map((_, k) => [a.x * 0.4 + Math.cos((k / 18) * 6.283) * 380, SOL, a.z + Math.sin((k / 18) * 6.283) * 0.55]);
    const mur = [...Array(18)].map((_, k) => [a.mur, -650 + Math.cos((k / 18) * 6.283) * 520, a.z + Math.sin((k / 18) * 6.283) * 0.6]);
    return (
      <g key={`h${i}`} opacity={v}>
        <polygon points={poly(pts)} fill="url(#ru-flaque)" />
        <polygon points={poly(mur)} fill="url(#ru-flaque)" opacity="0.6" />
      </g>
    );
  });

  const fond = (
    <g>
      <defs>
        {brumeDef(cam, 'ru-brume', '#030405', 0.55)}
        <radialGradient id="ru-flaque">
          <stop offset="0" stopColor="#e6e79a" stopOpacity="0.42" />
          <stop offset="1" stopColor="#e6e79a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ru-ampoule">
          <stop offset="0" stopColor="#fbffd0" stopOpacity="0.9" />
          <stop offset="0.25" stopColor="#e6e79a" stopOpacity="0.35" />
          <stop offset="1" stopColor="#e6e79a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ru-sortie" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c2324" />
          <stop offset="1" stopColor="#4b5650" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="#06070b" />
      {/* les deux bouts de la ruelle : la brume du terrain vague au fond, la rue orangée à l'entrée */}
      <polygon points={poly([[-RX, RTOP, RFOND], [RX, RTOP, RFOND], [RX, SOL, RFOND], [-RX, SOL, RFOND]])} fill="url(#ru-sortie)" />
      <polygon points={poly([[-RX, RTOP, z0], [RX, RTOP, z0], [RX, SOL, z0], [-RX, SOL, z0]])} fill="#3a2a1c" />
      {/* murs */}
      <polygon points={poly([[-RX, RTOP, z0], [-RX, RTOP, RFOND], [-RX, SOL, RFOND], [-RX, SOL, z0]])} fill="#3a2622" />
      <polygon points={poly([[RX, RTOP, z0], [RX, RTOP, RFOND], [RX, SOL, RFOND], [RX, SOL, z0]])} fill="#33211d" />
      {mortier}
      {/* taches d'humidité */}
      {[[-RX, 1.6, 2.4], [RX, 4.4, 5.6], [-RX, 8.2, 9.4], [RX, 10.6, 11.5]].map(([x, a, b], k) => (
        <polygon key={k} points={poly([[x, -300, a], [x, -520, (a + b) / 2], [x, -260, b], [x, SOL, b - 0.1], [x, SOL, a + 0.1]])} fill="#120b09" opacity="0.5" />
      ))}
      {fenetres}
      {/* tuyaux */}
      {[1.0, 4.1, 9.2].map((z) => ligne(cam, [RX - 8, -2400, z], [RX - 8, SOL, z], Math.max(2, 22 * cam.scale(z, RX)), '#1b1d1f', `t${z}`))}
      {/* sol pavé */}
      <polygon points={poly([[-RX, SOL, z0], [RX, SOL, z0], [RX, SOL, RFOND], [-RX, SOL, RFOND]])} fill="#1b1a1c" />
      {ligne(cam, [0, SOL, z0], [0, SOL, RFOND], 6, '#101012', 'rig')}
      {flaques.map((p, k) => (
        <polygon key={k} points={poly(p)} fill="#2b3640" opacity="0.7" />
      ))}
      {halos}
      {cables}
    </g>
  );

  const items = [];
  // poubelles (bennes)
  POUBELLES.forEach(([a, b], k) => {
    const x0 = -RX;
    const x1 = -150;
    items.push({
      z: a,
      el: (
        <g key={`p${k}`}>
          {cam.x > x1 && <polygon points={poly([[x1, 80, a], [x1, 80, b], [x1, SOL, b], [x1, SOL, a]])} fill="#14231a" />}
          <polygon points={poly([[x0, 80, a], [x1, 80, a], [x1, 80, b], [x0, 80, b]])} fill="#0e1912" />
          <polygon points={poly([[x0, 80, a], [x1, 80, a], [x1, SOL, a], [x0, SOL, a]])} fill="#1d3325" />
          <polygon points={poly([[x0, 60, a], [x1, 60, a], [x1, 100, a], [x0, 100, a]])} fill="#0b120d" />
          {/* sac poubelle */}
          {billboard(cam, -230, 80, a + 0.3, <path d="M-90,0 Q-110,-120 -20,-150 L0,-185 L20,-150 Q110,-120 90,0 Z" fill="#050506" />, 'sac')}
        </g>
      ),
    });
  });
  items.push({z: 6.4, el: billboard(cam, 260, SOL, 6.4, <path d="M-120,0 Q-140,-150 -30,-190 L0,-230 L30,-190 Q140,-150 120,0 Z" fill="#060607" />, 'sac2')});
  items.push({z: 7.3, el: billboard(cam, -260, SOL, 7.3, <path d="M-140,0 Q-130,-170 0,-200 Q130,-170 140,0 Z" fill="#070708" />, 'sac3')});
  // ampoules sur potence
  AMPOULES.forEach((a, i) => {
    const v = ampoule(i);
    const s = cam.scale(a.z, a.x, -650);
    const p = cam.proj(a.x, -640, a.z);
    items.push({
      z: a.z,
      el: (
        <g key={`a${i}`}>
          {ligne(cam, [a.mur, -720, a.z], [a.x, -720, a.z], Math.max(2, 14 * s), '#121214', 'po')}
          {ligne(cam, [a.x, -720, a.z], [a.x, -660, a.z], Math.max(1, 6 * s), '#121214', 'fil')}
          {cam.visible(a.z, a.x, -650) && <circle cx={p[0]} cy={p[1]} r={22 * s} fill={v > 0.1 ? '#fbffd0' : '#2a2a20'} />}
          {cam.visible(a.z, a.x, -650) && v > 0.03 && <circle cx={p[0]} cy={p[1]} r={420 * s} fill="url(#ru-ampoule)" opacity={v} />}
        </g>
      ),
    });
  });
  const brume = <rect key="br" width="1080" height="1920" fill="url(#ru-brume)" />;
  return {fond, items, brume};
};

// La poussette vide (pieds = sol, 0,0)
export const Poussette = ({f, roule = 1}) => {
  const a = f * 12 * roule;
  const roue = (x) => (
    <g transform={`translate(${x} -55) rotate(${a})`}>
      <circle r="55" fill="none" stroke="#1a1a1c" strokeWidth="12" />
      <line x1="-55" y1="0" x2="55" y2="0" stroke="#1a1a1c" strokeWidth="5" />
      <line x1="0" y1="-55" x2="0" y2="55" stroke="#1a1a1c" strokeWidth="5" />
    </g>
  );
  return (
    <g transform={`rotate(${Math.sin(f / 4) * 1.5 * roule} 0 -60)`}>
      <path d="M-170,-150 L170,-150 L150,-300 L-150,-300 Z" fill="#2c2028" />
      <path d="M-150,-300 Q-160,-520 60,-540 L70,-300 Z" fill="#3a2732" />
      <path d="M-120,-300 Q-120,-480 40,-500" fill="none" stroke="#4a3340" strokeWidth="10" />
      <line x1="150" y1="-260" x2="290" y2="-470" stroke="#1a1a1c" strokeWidth="14" strokeLinecap="round" />
      <line x1="260" y1="-470" x2="320" y2="-470" stroke="#1a1a1c" strokeWidth="18" strokeLinecap="round" />
      <line x1="-130" y1="-150" x2="-110" y2="-60" stroke="#1a1a1c" strokeWidth="10" />
      <line x1="130" y1="-150" x2="110" y2="-60" stroke="#1a1a1c" strokeWidth="10" />
      {roue(-110)}
      {roue(110)}
      {/* petit mobile qui se balance */}
      <line x1="-30" y1="-520" x2={-30 + Math.sin(f / 6) * 20} y2="-430" stroke="#555" strokeWidth="3" />
      <circle cx={-30 + Math.sin(f / 6) * 20} cy="-425" r="14" fill="#7a6a5a" />
    </g>
  );
};

// ===================== LE TERRAIN VAGUE ET LE VIEIL ARRÊT =====================
// Même chaussée que la rue (X -1100 → -20), mais plus d'immeubles : friche, arbres morts, ville au loin.
export const ARRET = [3, 4];
export const vague = (cam, f, {neon = 1} = {}) => {
  const {poly} = cam;
  const zMin = cam.z - 3;
  const zMax = cam.z + 40;
  const fissures = [
    [[-900, 470, 2], [-760, 470, 2.6], [-820, 470, 3.3], [-640, 470, 4.1]],
    [[-400, 470, 5], [-300, 470, 5.8], [-420, 470, 6.6]],
    [[-1000, 470, 8], [-850, 470, 9.2], [-950, 470, 10.4], [-760, 470, 11]],
  ];
  const ville = [...Array(16)].map((_, i) => {
    const x = -9000 + i * 1200;
    const h = 2500 + random(`v${i}`) * 5000;
    return (
      <g key={`v${i}`}>
        <polygon points={poly([[x, SOL - h, 60], [x + 1000, SOL - h, 60], [x + 1000, SOL, 60], [x, SOL, 60]])} fill="#0b0d10" />
        {random(`vf${i}`) > 0.5 && <polygon points={poly([[x + 300, SOL - h * 0.6, 59.9], [x + 420, SOL - h * 0.6, 59.9], [x + 420, SOL - h * 0.6 + 300, 59.9], [x + 300, SOL - h * 0.6 + 300, 59.9]])} fill="#6b5a2a" opacity="0.5" />}
      </g>
    );
  });
  const fond = (
    <g>
      <defs>
        {brumeDef(cam, 'va-brume', '#1a2120', 0.9)}
        <linearGradient id="va-ciel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#040506" />
          <stop offset="0.45" stopColor="#101614" />
          <stop offset="0.6" stopColor="#1d2523" />
        </linearGradient>
        <radialGradient id="va-neon">
          <stop offset="0" stopColor="#d9ffe8" stopOpacity="0.5" />
          <stop offset="1" stopColor="#d9ffe8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#va-ciel)" />
      <circle cx="260" cy="300" r="150" fill="#c9d6c8" opacity="0.05" />
      <circle cx="260" cy="300" r="55" fill="#c9d6c8" opacity="0.35" />
      {ville}
      {/* friche */}
      <polygon points={poly([[-9000, SOL, zMin], [-1100, SOL, zMin], [-1100, SOL, zMax], [-9000, SOL, zMax]])} fill="#151813" />
      <polygon points={poly([[520, SOL, zMin], [9000, SOL, zMin], [9000, SOL, zMax], [520, SOL, zMax]])} fill="#151813" />
      {/* chaussée défoncée + trottoir */}
      <polygon points={poly([[-1100, 470, zMin], [-20, 470, zMin], [-20, 470, zMax], [-1100, 470, zMax]])} fill="#1f2021" />
      <polygon points={poly([[-20, SOL, zMin], [520, SOL, zMin], [520, SOL, zMax], [-20, SOL, zMax]])} fill="#2a2a2a" />
      <polygon points={poly([[-20, SOL, zMin], [-20, SOL, zMax], [-20, 470, zMax], [-20, 470, zMin]])} fill="#3a3a3a" />
      {fissures.map((pts, k) => (
        <g key={k}>{pts.slice(1).map((p, i) => ligne(cam, pts[i], p, 3, '#0c0c0d', i))}</g>
      ))}
    </g>
  );

  const items = [];
  // arbres morts
  [[1200, 5.5, 1.1], [1900, 11, 1.3], [-1800, 7.5, 1.2], [-2600, 14, 1.4], [800, 16, 1]].forEach(([x, z, t], k) => {
    items.push({
      z,
      el: billboard(
        cam,
        x,
        SOL,
        z,
        <g stroke="#050605" strokeLinecap="round" fill="none">
          <path d="M0,0 L-10,-900" strokeWidth="60" />
          <path d="M-8,-600 L-260,-1050 M-260,-1050 L-330,-1250 M-260,-1050 L-150,-1220 M-10,-880 L120,-1300 M120,-1300 L60,-1500 M120,-1300 L250,-1450 M-5,-750 L240,-950 M240,-950 L330,-1000" strokeWidth="26" />
        </g>,
        `arbre${k}`,
        t
      ),
    });
  });

  // ---- le vieil arrêt abandonné ----
  const [a, b] = ARRET;
  const rouille = '#4a3426';
  items.push({
    z: b,
    el: (
      <g key="panneauVieux">
        <polygon points={poly([[210, -330, b], [490, -330, b], [490, 330, b], [210, 330, b]])} fill="#2a2620" />
        <polygon points={poly([[225, -310, b], [475, -310, b], [475, 310, b], [225, 310, b]])} fill="#7d8075" opacity={0.35 + 0.45 * neon} />
        {/* affiches déchirées */}
        <polygon points={poly([[235, -300, b], [400, -300, b], [380, -150, b], [300, -180, b], [235, -120, b]])} fill="#5a4636" opacity="0.8" />
        <polygon points={poly([[300, 120, b], [470, 90, b], [470, 300, b], [320, 300, b]])} fill="#3d4a52" opacity="0.7" />
        {cam.visible(b, 330, -40) &&
          (() => {
            const [px, py] = cam.proj(330, -40, b - 0.002);
            const s = cam.scale(b, 330, -40);
            return (
              <g transform={`translate(${px} ${py}) scale(${s}) rotate(${-6 + Math.sin(f / 9) * 2})`}>
                <rect x="-72" y="-70" width="144" height="140" fill="#000" opacity="0.35" transform="translate(5 6)" />
                <rect x="-72" y="-70" width="144" height="140" fill="#f2d649" />
                <rect x="-72" y="-70" width="144" height="22" fill="#e5c63a" />
                <g fontFamily="'DejaVu Sans', Arial, sans-serif" fontWeight="900" fontStyle="italic" fill="#1a1a2e" textAnchor="middle" transform="skewX(-6)">
                  <text y="-22" fontSize="22">SURTOUT</text>
                  <text y="8" fontSize="17">NE PAS MONTER</text>
                  <text y="36" fontSize="17">DANS LE BUS !!</text>
                </g>
                <line x1="-50" y1="44" x2="50" y2="42" stroke="#b01818" strokeWidth="3" />
                <line x1="-46" y1="51" x2="46" y2="50" stroke="#b01818" strokeWidth="3" />
              </g>
            );
          })()}
      </g>
    ),
  });
  const neonA = [250, -320, (a + b) / 2];
  const neonB = [420, -140, (a + b) / 2 - 0.15];
  const pn = cam.proj(...[335, -230, (a + b) / 2]);
  const sn = cam.scale((a + b) / 2, 335, -230);
  items.push({
    z: a,
    el: (
      <g key="abriVieux">
        <polygon points={poly([[490, -330, a], [490, -330, b], [490, SOL, b], [490, SOL, a]])} fill="#9ab0a8" opacity="0.08" />
        {/* vitre fêlée */}
        {ligne(cam, [490, -100, a + 0.4], [490, -250, a + 0.2], 2, '#c9d6d0', 'v1', 0.4)}
        {ligne(cam, [490, -100, a + 0.4], [490, 60, a + 0.75], 2, '#c9d6d0', 'v2', 0.4)}
        {ligne(cam, [490, -100, a + 0.4], [490, -40, a + 0.05], 2, '#c9d6d0', 'v3', 0.4)}
        {/* toit cassé, penché */}
        <polygon points={poly([[180, -330, a], [500, -300, a], [500, -330, b], [180, -240, b]])} fill="#141210" />
        <polygon points={poly([[300, -320, a + 0.3], [420, -310, a + 0.35], [380, -290, a + 0.7]])} fill="#2b3633" />
        {ligne(cam, [190, -320, a], [190, SOL, a], Math.max(2, 12 * cam.scale(a, 190)), rouille, 'm1')}
        {ligne(cam, [490, -300, a], [490, SOL, a], Math.max(2, 12 * cam.scale(a, 490)), rouille, 'm2')}
        {/* banc cassé */}
        {ligne(cam, [380, 250, a + 0.2], [470, 330, b - 0.2], Math.max(2, 26 * cam.scale(a + 0.5, 420)), '#2d2a26', 'banc')}
        {/* néon qui pend */}
        {ligne(cam, [250, -330, (a + b) / 2], neonA, 3, '#222', 'fil')}
        {ligne(cam, neonA, neonB, Math.max(3, 18 * sn), neon > 0.2 ? '#eafff2' : '#3a3f3c', 'neon')}
        {cam.visible((a + b) / 2, 335, -230) && neon > 0.05 && <circle cx={pn[0]} cy={pn[1]} r={700 * sn} fill="url(#va-neon)" opacity={neon} />}
      </g>
    ),
  });
  // poteau tordu
  const pz = a - 0.15;
  items.push({
    z: pz,
    el: (
      <g key="poteauVieux">
        {ligne(cam, [120, SOL, pz], [150, -100, pz], Math.max(2, 16 * cam.scale(pz, 130)), rouille, 'pa')}
        {ligne(cam, [150, -100, pz], [230, -520, pz], Math.max(2, 16 * cam.scale(pz, 180)), rouille, 'pb')}
        {billboard(
          cam,
          240,
          -520,
          pz,
          <g transform="rotate(14)">
            <circle r="95" fill="#3b2a20" stroke="#6b5040" strokeWidth="8" />
            <text y="16" fontSize="44" fontWeight="900" fill="#8d7a66" textAnchor="middle" fontFamily="'DejaVu Sans', Arial, sans-serif">
              ARR T
            </text>
          </g>,
          'panneau'
        )}
      </g>
    ),
  });
  // feuilles mortes qui volent
  [...Array(10)].forEach((_, k) => {
    const z = 1.2 + random(`fz${k}`) * 5;
    const x = ((random(`fx${k}`) * 2400 + f * (6 + k)) % 2400) - 1200;
    const y = SOL - 20 - Math.abs(Math.sin(f / 10 + k)) * 120;
    items.push({z, el: billboard(cam, x, y, z, <ellipse rx="22" ry="10" fill="#3a2c1a" transform={`rotate(${f * 9 + k * 40})`} />, `feuille${k}`)});
  });
  const brume = <rect key="br" width="1080" height="1920" fill="url(#va-brume)" />;
  return {fond, items, brume};
};

// ===================== LA CRÉATURE =====================
// Énorme (≈ 3,5 fois le bonhomme). Pieds en 0,0. `monte` 0 → 1 : elle surgit de l'ombre.
export const Creature = ({f, monte = 1, gueule = 0.5}) => {
  const resp = 1 + Math.sin(f / 9) * 0.025;
  const yeux = [
    [-150, -2230, 34],
    [140, -2240, 38],
    [-40, -2330, 26],
    [-260, -2140, 20],
    [250, -2150, 22],
    [40, -2150, 16],
    [-90, -2420, 14],
  ];
  const g = 0.3 + 0.7 * gueule;
  return (
    <g transform={`translate(0 ${(1 - monte) * 900}) scale(1 ${resp})`} opacity={Math.min(1, monte * 1.5)}>
      <defs>
        <radialGradient id="cr-oeil">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.3" stopColor="#ff2a1a" />
          <stop offset="1" stopColor="#ff0000" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* corps voûté */}
      <path d="M-760,0 Q-900,-900 -950,-1500 Q-900,-1900 -420,-2000 L420,-2000 Q900,-1900 950,-1500 Q900,-900 760,0 Z" fill="#040405" stroke="#26313a" strokeWidth="10" />
      {/* bras qui descendent de chaque côté, griffes au sol */}
      {[-1, 1].map((c) => (
        <g key={c} transform={`scale(${c} 1)`}>
          <path d={`M-880,-1750 Q-1250,-1200 -1150,-350 Q-1120,-150 -980,-40 L-900,-60 Q-1010,-300 -1000,-600 Q-1000,-1200 -760,-1600 Z`} fill="#040405" stroke="#26313a" strokeWidth="8" />
          {[0, 1, 2, 3].map((k) => (
            <path key={k} d={`M${-1040 + k * 45},-70 Q${-1060 + k * 50},40 ${-1000 + k * 60 + Math.sin(f / 7 + k) * 10},${90 + k * 8}`} fill="none" stroke="#0a0a0c" strokeWidth="18" strokeLinecap="round" />
          ))}
        </g>
      ))}
      {/* tête penchée vers le bonhomme */}
      <g transform={`rotate(${Math.sin(f / 23) * 3} 0 -2000)`}>
        <ellipse cx="0" cy="-2250" rx="430" ry="360" fill="#040405" stroke="#26313a" strokeWidth="10" />
        {yeux.map(([x, y, r], k) => {
          const cl = (f + k * 17) % 90 < 4 ? 0.1 : 1;
          return (
            <g key={k} transform={`translate(${x} ${y}) scale(1 ${cl})`}>
              <circle r={r * 3} fill="url(#cr-oeil)" opacity="0.55" />
              <circle r={r} fill="url(#cr-oeil)" />
              <circle r={r * 0.25} fill="#fff" />
            </g>
          );
        })}
        {/* gueule */}
        <path d={`M-300,-2030 Q0,${-2030 + 260 * g} 300,-2030 Q0,${-2030 + 90 * g} -300,-2030 Z`} fill="#2a0606" />
        {[...Array(11)].map((_, k) => {
          const x = -270 + k * 54;
          const prof = 60 * g * (1 - Math.abs(x) / 320);
          return (
            <g key={k}>
              <path d={`M${x - 18},-2028 L${x},${-2028 + prof + 25} L${x + 18},-2028 Z`} fill="#e8e2cc" />
              <path d={`M${x - 16},${-2030 + 250 * g * (1 - (x / 300) ** 2) * 0.95} L${x},${-2030 + 250 * g * (1 - (x / 300) ** 2) * 0.95 - prof - 20} L${x + 16},${-2030 + 250 * g * (1 - (x / 300) ** 2) * 0.95} Z`} fill="#d8d2bc" />
            </g>
          );
        })}
        {/* bave */}
        {[-120, 60, 180].map((x, k) => (
          <path key={k} d={`M${x},${-2000 + 120 * g} q4,${80 + Math.sin(f / 8 + k) * 40} 0,${140 + Math.sin(f / 8 + k) * 60}`} fill="none" stroke="#9fb3a0" strokeWidth="8" opacity="0.5" strokeLinecap="round" />
        ))}
      </g>
    </g>
  );
};
