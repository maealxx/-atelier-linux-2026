import {random} from 'remotion';
import {DefsGare, boiteG, halo, ligne, lw, quad, tache, troue} from './Gare';
import {plaque} from './Lycee';
import {SOL} from './Rue';
import {DefsForet, Tete} from './Foret';

// ===================== La maison du baby-sitting (« Le babyphone ») =====================
// La chambre de Léna (X ±1300, Z 0 → 5.2, plafond −1000) : lit contre le mur du fond, trappe du grenier au plafond
// au-dessus du pied du lit, veilleuse qui projette des étoiles qui tournent sur les murs, fenêtre sous la pluie,
// porte sur le palier (mur droit), étagère avec la caméra du babyphone.
// L'escalier : 14 marches de Z 0 à 3.64, palier en haut avec la porte de Léna (Z 6).
// Lumière : nuit bleutée, veilleuse chaude (dégradé radial lisse centré sur elle), éclairs.
export const CHE = {x: 1300, plaf: -1000, z0: 0, z1: 5.2};
export const LIT_E = {x0: -380, x1: 380, z0: 3.4, z1: 5.15, haut: 230};
export const TRAPPE = {x0: -280, x1: 280, z0: 3.0, z1: 3.8};
export const VEILLEUSE = {x: 600, y: 40, z: 4.7};
export const CAMERA_B = {x: 1180, y: -380, z: 4.15};
export const PORTE_E = {z0: 0.6, z1: 1.8, haut: -560};

// éclairs : 0 → 1 (flash bref, double, puis traîne)
export const ECLAIRS = [6, 300, 760, 1210, 1640];
export const eclair = (fg) => {
  let v = 0;
  ECLAIRS.forEach((t) => {
    const u = fg - t;
    if (u < 0 || u > 22) return;
    v = Math.max(v, u < 2 ? 1 : u < 4 ? 0.25 : u < 6 ? 0.8 : Math.exp(-(u - 6) / 4) * 0.6);
  });
  return v;
};

// pluie (par-dessus l'image) : traits obliques qui tombent, en deux couches (près / loin)
export const Pluie = ({f, force = 1, id = 'pl'}) => (
  <g opacity={force}>
    {[...Array(110)].map((_, k) => {
      const pres = k % 3 === 0;
      const v = pres ? 95 : 60;
      const x = (random(`${id}x${k}`) * 1300 - 100 + f * (pres ? 14 : 9)) % 1300 - 100;
      const y = (random(`${id}y${k}`) * 2200 + f * v) % 2200 - 140;
      const l = pres ? 90 : 50;
      return <line key={k} x1={x} y1={y} x2={x - l * 0.22} y2={y + l} stroke="#c8d8ff" strokeWidth={pres ? 3 : 1.8} opacity={pres ? 0.28 : 0.18} strokeLinecap="round" />;
    })}
  </g>
);
// la vitre mouillée (gouttes qui glissent), à poser dans le clip d'une fenêtre
const Gouttes = ({f, w, h}) => (
  <g>
    {[...Array(28)].map((_, k) => {
      const x = random(`gx${k}`) * w;
      const y = ((random(`gy${k}`) * h + f * (2 + 6 * random(`gv${k}`))) % (h + 60)) - 30;
      const r = 4 + 7 * random(`gr${k}`);
      return (
        <g key={k}>
          <line x1={x} y1={y - 40} x2={x} y2={y} stroke="#9ab4e8" strokeWidth={r * 0.5} opacity="0.25" />
          <circle cx={x} cy={y} r={r} fill="#cfe0ff" opacity="0.45" />
        </g>
      );
    })}
  </g>
);

export const DefsEnfant = ({cam, id = 'en'}) => (
  <defs>
    <radialGradient id={`${id}-etoile`}>
      <stop offset="0" stopColor="#fff6c8" stopOpacity="0.9" />
      <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-nuit`} cx={cam.fuite[0]} cy={cam.fuite[1]} r="1200" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="#0a1030" stopOpacity="0.25" />
      <stop offset="1" stopColor="#0a1030" stopOpacity="0" />
    </radialGradient>
    <linearGradient id={`${id}-ciel`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#060a18" />
      <stop offset="1" stopColor="#1a2440" />
    </linearGradient>
    <radialGradient id={`${id}-couloir`}>
      <stop offset="0" stopColor="#ffcf8a" stopOpacity="0.7" />
      <stop offset="1" stopColor="#ff9a4a" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-oeil`}>
      <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
      <stop offset="0.3" stopColor="#e8ffe8" stopOpacity="0.8" />
      <stop offset="1" stopColor="#a8ffb8" stopOpacity="0" />
    </radialGradient>
  </defs>
);

// les étoiles de la veilleuse : rayons qui partent de la veilleuse et tournent ; on dessine l'impact sur les murs / le plafond
const ETOILES = [...Array(54)].map((_, k) => ({a: random(`sa${k}`) * 6.283, e: -0.35 + random(`se${k}`) * 1.45, c: ['#ffe27a', '#ff9ad8', '#9ad8ff', '#fff4c8'][k % 4], s: 0.7 + 0.6 * random(`ss${k}`)}));
const impact = (P, d) => {
  const {x: X, plaf: PL, z0: Z0, z1: Z1} = CHE;
  let best = Infinity;
  const essai = (t) => {
    if (t > 1e-3 && t < best) best = t;
  };
  if (d[0] > 0) essai((X - P[0]) / d[0]);
  if (d[0] < 0) essai((-X - P[0]) / d[0]);
  if (d[1] < 0) essai((PL - P[1]) / d[1]);
  if (d[2] > 0) essai(((Z1 - P[2]) * 1000) / d[2]);
  if (d[2] < 0) essai(((Z0 - P[2]) * 1000) / d[2]);
  if (!isFinite(best)) return null;
  return [P[0] + d[0] * best, P[1] + d[1] * best, P[2] + (d[2] * best) / 1000];
};
const etoile = (cx, cy, r, c, key, op) => {
  const pts = [...Array(10)].map((_, k) => {
    const a = (k / 10) * 6.283 - Math.PI / 2;
    const rr = k % 2 ? r * 0.45 : r;
    return `${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`;
  });
  return (
    <g key={key} opacity={op}>
      <circle cx={cx} cy={cy} r={r * 2.2} fill={c} opacity="0.18" />
      <polygon points={pts.join(' ')} fill={c} />
    </g>
  );
};

// ----- la chambre de Léna -----
// veilleuse 0 → 1 ; trappe : ouverture 0 → 1 ; yeux : deux yeux qui brillent dans la trappe (0 → 1) ; porte (0 → 1) ;
// lena : {visible, yeux, regard, tourne} ; couette : {respire, leve (0 → 1)} ; main : la main grise qui dépasse (0 → 1)
export const chambreEnfant = (cam, f, {veilleuse = 1, trappe = 0, yeux = 0, porte = 0, lena = {visible: true}, couette = {}, main = 0, eclairage = 0, lampeCouloir = 1} = {}) => {
  const {x: X, plaf: PL, z0: Z0, z1: Z1} = CHE;
  const fond = [];
  fond.push(<DefsGare key="dg" cam={cam} />);
  fond.push(<DefsEnfant key="de" cam={cam} />);
  fond.push(<DefsForet key="df" cam={cam} />);
  fond.push(<rect key="n" width="1080" height="1920" fill="#06070c" />);
  // lumière de la veilleuse : dégradé radial à l'écran, centré sur elle (lisse d'un pan à l'autre)
  const V = VEILLEUSE;
  const vv = cam.visible(V.z, V.x, V.y);
  const [vx, vy] = cam.proj(V.x, V.y, V.z);
  const vr = Math.max(900, 2600 * cam.scale(V.z, V.x, V.y));
  fond.push(
    <defs key="lum">
      <radialGradient id="ce-v" cx={vv ? vx : 900} cy={vv ? vy : 1200} r={vv ? vr : 2400} gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#ffd6a8" stopOpacity="0.95" />
        <stop offset="0.3" stopColor="#e89aa8" stopOpacity="0.55" />
        <stop offset="0.7" stopColor="#7a5a9a" stopOpacity="0.22" />
        <stop offset="1" stopColor="#3a3060" stopOpacity="0.05" />
      </radialGradient>
    </defs>,
  );
  const pan = (pts, nuit, key, ombre = 0, trous = null) => {
    const el = trous ? troue(cam, pts, trous, nuit, `${key}n`) : quad(cam, pts, nuit, `${key}n`);
    const el2 = trous ? troue(cam, pts, trous, 'url(#ce-v)', `${key}v`) : quad(cam, pts, 'url(#ce-v)', `${key}v`);
    return (
      <g key={key}>
        {el}
        <g opacity={veilleuse}>{el2}</g>
        {ombre > 0 && (trous ? troue(cam, pts, trous, '#000', `${key}o`) : quad(cam, pts, '#000', `${key}o`))}
      </g>
    );
  };
  // ouvertures : fenêtre (mur gauche), porte (mur droit), trappe (plafond)
  const FEN = {z0: 1.6, z1: 3.2, y0: -680, y1: -60};
  const fenetre = [[-X, FEN.y0, FEN.z0], [-X, FEN.y0, FEN.z1], [-X, FEN.y1, FEN.z1], [-X, FEN.y1, FEN.z0]];
  const porteTrou = [[X, PORTE_E.haut, PORTE_E.z0], [X, PORTE_E.haut, PORTE_E.z1], [X, SOL, PORTE_E.z1], [X, SOL, PORTE_E.z0]];
  const T = TRAPPE;
  const trappeTrou = [[T.x0, PL, T.z0], [T.x1, PL, T.z0], [T.x1, PL, T.z1], [T.x0, PL, T.z1]];
  // derrière la fenêtre : ciel d'orage, pluie, éclair
  const pf = cam.poly(fenetre);
  if (pf && cam.x > -X) {
    const e = eclair(f);
    fond.push(
      <g key="dehors">
        <defs><clipPath id="ce-fen"><polygon points={pf} /></clipPath></defs>
        <g clipPath="url(#ce-fen)">
          <rect width="1080" height="1920" fill="url(#en-ciel)" />
          <rect width="1080" height="1920" fill="#c8d8ff" opacity={0.85 * e} />
          <Pluie f={f} id="plf" force={0.9} />
        </g>
        <g clipPath="url(#ce-fen)">{plaque(cam, [-X + 2, FEN.y0, FEN.z0], [0, 0, 1], [0, 1, 0], (FEN.z1 - FEN.z0) * 1000, FEN.y1 - FEN.y0, <Gouttes f={f} w={(FEN.z1 - FEN.z0) * 1000} h={FEN.y1 - FEN.y0} />, 'gout')}</g>
      </g>,
    );
  }
  // derrière la porte : le palier, lumière chaude
  if (porte > 0) fond.push(quad(cam, porteTrou, '#3a2416', 'pal'), halo(cam, X + 400, -250, (PORTE_E.z0 + PORTE_E.z1) / 2, 1400, 'en-couloir', 0.8 * lampeCouloir, 'palh'));
  // derrière la trappe : le noir du grenier, une poutre, les yeux
  if (trappe > 0) {
    fond.push(quad(cam, trappeTrou, '#010102', 'gre'));
    fond.push(ligne(cam, [T.x0 - 300, PL - 260, (T.z0 + T.z1) / 2], [T.x1 + 300, PL - 260, (T.z0 + T.z1) / 2], lw(cam, 60, [0, PL - 260, 3.4]), '#120c08', 'pou', 0.9));
    if (yeux > 0) {
      const ye = yeux * (Math.floor(f / 70) % 9 === 0 && f % 70 < 5 ? 0.1 : 1); // clignement
      [-85, 85].forEach((dx, k) => {
        fond.push(halo(cam, dx, PL - 230, 3.3, 360, 'en-oeil', 0.6 * ye, `oh${k}`));
        fond.push(halo(cam, dx, PL - 230, 3.3, 80, 'en-oeil', ye, `oc${k}`));
      });
    }
  }
  // les murs, le plafond, le sol (couleurs de nuit + lumière de la veilleuse)
  fond.push(pan([[-X, PL, Z1], [X, PL, Z1], [X, SOL, Z1], [-X, SOL, Z1]], '#251f40', 'mf'));
  fond.push(pan([[-X, PL, Z0], [-X, PL, Z1], [-X, SOL, Z1], [-X, SOL, Z0]], '#2e2238', 'mg', 0, [fenetre]));
  fond.push(pan([[X, PL, Z0], [X, PL, Z1], [X, SOL, Z1], [X, SOL, Z0]], '#1c2e34', 'md', 0, [porteTrou]));
  fond.push(pan([[-X, PL, Z0], [X, PL, Z0], [X, PL, Z1], [-X, PL, Z1]], '#14141c', 'pl', 0.1, trappe > 0 ? [trappeTrou] : null));
  fond.push(pan([[-X, PL, Z0], [X, PL, Z0], [X, SOL, Z0], [-X, SOL, Z0]], '#18141e', 'av'));
  fond.push(pan([[-X, SOL, Z0], [X, SOL, Z0], [X, SOL, Z1], [-X, SOL, Z1]], '#2a1c12', 'sol', 0.05));
  // parquet, plinthes, frise de nuages sur le mur du fond
  for (let x = -X + 200; x < X; x += 200) fond.push(ligne(cam, [x, SOL - 1, Z0], [x, SOL - 1, Z1], lw(cam, 3, [x, SOL, 2.5]), '#000', `pq${x}`, 0.25));
  fond.push(quad(cam, [[-X, -200, Z1 - 0.003], [X, -200, Z1 - 0.003], [X, -170, Z1 - 0.003], [-X, -170, Z1 - 0.003]], '#e8c8e8', 'frise', 0.25 + 0.5 * veilleuse));
  // lettres en bois « LÉNA » au-dessus du lit, guirlande d'étoiles en papier
  fond.push(plaque(cam, [-330, -720, Z1 - 0.005], [1, 0, 0], [0, 1, 0], 660, 200,
    <g>{['L', 'É', 'N', 'A'].map((c, k) => <text key={k} x={30 + k * 160} y="170" fontSize="170" fontWeight="900" fontFamily="'DejaVu Sans', Arial" fill={['#f4a8c8', '#a8d8f4', '#f4e0a8', '#c8a8f4'][k]} opacity={0.35 + 0.6 * veilleuse}>{c}</text>)}</g>, 'lena'));
  for (let k = 0; k < 11; k++) {
    const x = -1100 + k * 220;
    const y = -880 + 50 * Math.sin((k / 10) * Math.PI);
    fond.push(halo(cam, x, y, Z1 - 0.02, 50, 'en-etoile', 0.5 + 0.5 * veilleuse * (0.6 + 0.4 * Math.sin(f / 9 + k)), `gu${k}`));
  }
  // cadre de fenêtre, rideaux roses ; cadre de porte ; cadre de trappe
  [[FEN.y0 - 20, FEN.y0], [FEN.y1, FEN.y1 + 20]].forEach(([a, b], k) => fond.push(quad(cam, [[-X + 3, a, FEN.z0 - 0.05], [-X + 3, a, FEN.z1 + 0.05], [-X + 3, b, FEN.z1 + 0.05], [-X + 3, b, FEN.z0 - 0.05]], '#d8d0e0', `cf${k}`, 0.6)));
  [[FEN.z0 - 0.45, FEN.z0 + 0.1], [FEN.z1 - 0.1, FEN.z1 + 0.45]].forEach(([a, b], k) => fond.push(quad(cam, [[-X + 6, FEN.y0 - 120, a], [-X + 6, FEN.y0 - 120, b], [-X + 6, SOL - 40, b + (k ? 0.06 : -0.06)], [-X + 6, SOL - 40, a + (k ? 0.06 : -0.06)]], '#a85a8a', `ri${k}`, 0.55 + 0.3 * veilleuse)));
  fond.push(quad(cam, [[T.x0 - 30, PL + 2, T.z0 - 0.03], [T.x1 + 30, PL + 2, T.z0 - 0.03], [T.x1 + 30, PL + 2, T.z1 + 0.03], [T.x0 - 30, PL + 2, T.z1 + 0.03]], 'none', 'ctr', 1, {stroke: '#3a3440', strokeWidth: Math.max(2, 18 * cam.scale(3.4, 0, PL))}));
  // clair de lune qui entre par la fenêtre et se pose au sol ; lumière du couloir par la porte
  fond.push(quad(cam, [[-X, FEN.y0, FEN.z0], [-X, FEN.y0, FEN.z1], [-X + 1300, SOL - 1, FEN.z1 + 0.6], [-X + 900, SOL - 1, FEN.z0 + 0.4]], '#8aa8ff', 'rayonlune', 0.06 + 0.4 * eclair(f)));
  fond.push(quad(cam, [[-X + 300, SOL - 2, FEN.z0 + 0.3], [-X + 1050, SOL - 2, FEN.z0 + 0.45], [-X + 1250, SOL - 2, FEN.z1 + 0.6], [-X + 450, SOL - 2, FEN.z1 + 0.3]], '#9ab4ff', 'flaquelune', 0.16 + 0.5 * eclair(f)));
  if (porte > 0) fond.push(tache(cam, X - 500, SOL - 2, (PORTE_E.z0 + PORTE_E.z1) / 2, 900, 0.9, 'en-couloir', 0.55 * porte * lampeCouloir, 'solcouloir'));
  // poster licorne (mur gauche), grande lune en bois (mur du fond), étoiles phosphorescentes au plafond
  fond.push(plaque(cam, [-X + 3, -820, 0.35], [0, 0, 1], [0, 1, 0], 900, 620,
    <g><rect width="900" height="620" fill="#2a2440" stroke="#f4e0f0" strokeWidth="16" /><circle cx="450" cy="300" r="180" fill="#f4b8d8" opacity="0.6" /><path d="M300,470 Q450,170 610,470 Z" fill="#a8d8f4" opacity="0.7" /><path d="M440,140 L470,40 L490,150 Z" fill="#ffe27a" /></g>, 'poster'));
  fond.push(plaque(cam, [700, -820, Z1 - 0.004], [1, 0, 0], [0, 1, 0], 420, 420,
    <g><circle cx="210" cy="210" r="200" fill="#ffe8a8" opacity={0.35 + 0.5 * veilleuse} /><circle cx="290" cy="170" r="190" fill="#251f40" /></g>, 'lunemur'));
  for (let k = 0; k < 26; k++) {
    const x = (random(`px${k}`) - 0.5) * 2 * (X - 150);
    const z = Z0 + 0.3 + random(`pz${k}`) * (Z1 - Z0 - 0.6);
    if (x > T.x0 - 60 && x < T.x1 + 60 && z > T.z0 - 0.1 && z < T.z1 + 0.1) continue;
    fond.push(halo(cam, x, PL + 3, z, 40, 'en-oeil', 0.45 + 0.2 * Math.sin(f / 30 + k), `ph${k}`));
  }
  fond.push(<rect key="nuit" width="1080" height="1920" fill="url(#en-nuit)" />);
  // les étoiles de la veilleuse (elles tournent lentement)
  if (veilleuse > 0.02) {
    const rot = f * 0.0045;
    ETOILES.forEach((s, k) => {
      const a = s.a + rot;
      const d = [Math.cos(s.e) * Math.cos(a) * 1000, -Math.sin(s.e) * 1000, Math.cos(s.e) * Math.sin(a) * 1000];
      const p = impact([V.x, V.y, V.z], d);
      if (!p || !cam.visible(p[2], p[0], p[1])) return;
      if (trappe > 0 && p[1] <= PL + 1 && p[0] > T.x0 && p[0] < T.x1 && p[2] > T.z0 && p[2] < T.z1) return;
      const [px, py] = cam.proj(...p);
      const r = Math.min(40, 30 * s.s * cam.scale(p[2], p[0], p[1]) * Math.min(2.5, Math.hypot(p[0] - V.x, p[1] - V.y, (p[2] - V.z) * 1000) / 900));
      fond.push(etoile(px, py, r, s.c, `st${k}`, 0.85 * veilleuse));
    });
  }

  const items = [];
  // la porte (battant qui pivote vers l'intérieur de la chambre)
  {
    const a = porte * 1.45;
    const hz = PORTE_E.z0;
    const lz = (PORTE_E.z1 - PORTE_E.z0) * 1000;
    const bx = X - Math.sin(a) * lz * 0.55;
    const bz = hz + (Math.cos(a) * lz) / 1000 * (1 - 0.45 * Math.sin(a)) - 0.02 * Math.sin(a);
    items.push({z: (hz + bz) / 2, x: (X + bx) / 2, y: 0, el: <g key="porte">
      {quad(cam, [[X - 2, PORTE_E.haut, hz], [bx - 2, PORTE_E.haut, bz], [bx - 2, SOL, bz], [X - 2, SOL, hz]], '#3a3448', 'bat')}
      {quad(cam, [[X - 4, PORTE_E.haut, hz], [bx - 4, PORTE_E.haut, bz], [bx - 4, SOL, bz], [X - 4, SOL, hz]], 'url(#ce-v)', 'batv', veilleuse * 0.6)}
    </g>});
  }
  // le lit, la couette (qui respire, ou qui se lève), l'oreiller, Léna
  {
    const {x0, x1, z0, z1, haut} = LIT_E;
    const resp = couette.respire ? Math.sin(f / 11) * 12 * couette.respire : 0;
    const els = [];
    els.push(tache(cam, 0, SOL - 2, (z0 + z1) / 2, 700, 1.1, 'fo-ombre', 0.55, 'om'));
    els.push(boiteG(cam, x0, x1, haut, SOL, z0, z1, ['#e8e0f0', '#c8c0d8', '#b8b0c8'], 'cadre'));
    els.push(boiteG(cam, x0 - 20, x1 + 20, -380, SOL, z1 - 0.06, z1, ['#f0e8f8', '#e0d8ec', '#d0c8dc'], 'tete'));
    els.push(boiteG(cam, x0 + 15, x1 - 15, 170, haut, z0 + 0.02, z1 - 0.07, ['#ffffff', '#ececf4', '#e0e0ea'], 'mat'));
    els.push(boiteG(cam, x0 + 60, x1 - 60, 120, 172, z1 - 0.42, z1 - 0.1, ['#ffffff', '#f2eef8', '#e6e2ee'], 'or'));
    if (!couette.leve) {
      els.push(boiteG(cam, x0, x1, 130 - resp * 0.3, 175, z0 - 0.02, z1 - 0.45, ['#f4a8c8', '#e08ab0', '#d07aa0'], 'cou'));
      if (couette.bosse) els.push(boiteG(cam, -170, 170, 70 - resp, 135, z0 + 0.35, z1 - 0.65, ['#f6b2d0', '#e28eb4', '#d27ea4'], 'bos'));
      // pois blancs sur la couette
      for (let j = 0; j < 10; j++) els.push(halo(cam, x0 + 60 + (j % 5) * 140, 128 - resp * 0.3, z0 + 0.2 + Math.floor(j / 5) * 0.55, 30, 'en-etoile', 0.5, `po${j}`));
    }
    if (lena.visible) {
      const e = lena;
      els.push(plaque(cam, [-95, 118, z1 - 0.08], [1, 0, 0], [0, 0, -1], 190, 210, <g transform="scale(0.475)" style={{filter: `brightness(${0.55 + 0.6 * veilleuse})`}}><Tete chev="#6a3a1a" peau="#f6d0b4" yeux={e.yeux || 0} regard={e.regard || [0, 0]} tourne={e.tourne || 0} /></g>, 'lena'));
    }
    // la main grise, longue, qui sort de sous la couette et se pose sur le drap (doigts qui bougent)
    if (main > 0) {
      const sort = Math.min(1, main);
      const plie = 0.5 + 0.5 * Math.sin(f / 8);
      const doigt = (x0, L1, L2, j) => {
        const b1 = 0.15 * plie * (j % 2 ? 1 : -1);
        const x1 = x0 + Math.sin(b1) * L1;
        const y1 = 150 + Math.cos(b1) * L1;
        const b2 = b1 + 0.5 * plie;
        const x2 = x1 + Math.sin(b2) * L2;
        const y2 = y1 + Math.cos(b2) * L2;
        return (
          <g key={j}>
            <path d={`M${x0},150 L${x1},${y1} L${x2},${y2}`} stroke="#5a625c" strokeWidth="34" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d={`M${x0},150 L${x1},${y1} L${x2},${y2}`} stroke="#a8b0a8" strokeWidth="22" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={x1} cy={y1} r="15" fill="#8a928a" />
            <ellipse cx={x2} cy={y2 + 6} rx="9" ry="14" fill="#2a2a24" />
          </g>
        );
      };
      els.push(plaque(cam, [x1 - 60, 122, z0 + 0.95], [-1, 0, 0], [0, 0, -1], 340, 620 * sort + 30,
        <g>
          <rect x="0" y="0" width="340" height={620 * sort + 30} fill="url(#lm-ombre)" opacity="0.4" />
          <defs><linearGradient id="lm-ombre" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity="0.6" /><stop offset="1" stopColor="#000" stopOpacity="0" /></linearGradient></defs>
          <path d="M60,0 Q170,-10 280,0 L270,170 Q170,200 70,170 Z" fill="#9aa29a" stroke="#5a625c" strokeWidth="8" />
          {doigt(85, 210, 230, 0)}{doigt(145, 240, 250, 1)}{doigt(205, 235, 245, 2)}{doigt(262, 190, 210, 3)}
        </g>, 'main'));
    }
    items.push({z: (z0 + z1) / 2, x: 0, y: 150, el: <g key="lit">{els}</g>});
    // la couette qui se lève, comme un drap sur quelqu'un de très grand
    if (couette.leve) {
      const h = 120 + 1150 * couette.leve;
      if (cam.visible(4.2, 0, 150)) {
        const [px, py] = cam.proj(0, 175, 4.25);
        const s = cam.scale(4.25, 0, 175);
        const k = couette.leve;
        items.push({z: 4.2, x: 0, y: -200, el: <g key="drap" transform={`translate(${px} ${py}) scale(${s})`}>
          <path d={`M-440,0 Q-470,${-h * 0.45} -260,${-h * 0.78} Q-200,${-h * 1.02} 0,${-h * 1.05} Q200,${-h * 1.02} 260,${-h * 0.78} Q470,${-h * 0.45} 440,0 Q330,50 220,20 Q110,60 0,25 Q-110,60 -220,20 Q-330,50 -440,0 Z`} fill="#f4a8c8" />
          <path d={`M-260,${-h * 0.78} Q-200,${-h * 1.02} 0,${-h * 1.05} Q-120,${-h * 0.9} -150,${-h * 0.6} Z`} fill="#fff" opacity="0.18" />
          <path d={`M-420,0 Q-430,${-h * 0.5} -170,${-h * 0.9} Q-60,${-h * 0.98} 0,${-h} L-60,0 Q-300,40 -420,0 Z`} fill="#000" opacity="0.18" />
          {[-200, -60, 90, 230].map((x, j) => <path key={j} d={`M${x},10 Q${x * 0.7},${-h * 0.4} ${x * 0.35},${-h * 0.82}`} stroke="#c87aa0" strokeWidth="10" fill="none" opacity="0.6" />)}
          {k > 0.7 && [-70, 70].map((x, j) => <ellipse key={j} cx={x} cy={-h * 0.78} rx="34" ry="46" fill="#120408" opacity={(k - 0.7) / 0.3} />)}
        </g>});
      }
    }
  }
  // la trappe (panneau qui bascule vers le bas, charnière côté Z0)
  {
    // charnière côté fond (Z1) : le panneau pend vers le fond, l'ouverture reste visible depuis la chambre
    const a = trappe * 1.05;
    const L = (T.z1 - T.z0) * 1000;
    const ez = T.z1 - (Math.cos(a) * L) / 1000;
    const ey = PL + Math.sin(a) * L;
    items.push({z: (T.z0 + T.z1) / 2 + 0.3, x: 0, y: PL + 100, el: <g key="trappe">
      {quad(cam, [[T.x0, PL + 3, T.z1], [T.x1, PL + 3, T.z1], [T.x1, ey + 3, ez], [T.x0, ey + 3, ez]], '#2a2430', 'pan')}
      {quad(cam, [[T.x0, PL + 3, T.z1], [T.x1, PL + 3, T.z1], [T.x1, ey + 3, ez], [T.x0, ey + 3, ez]], 'url(#ce-v)', 'panv', 0.5 * veilleuse)}
      {trappe > 0.05 && ligne(cam, [T.x1 - 60, ey, ez], [T.x1 - 60, ey + 120, ez - 0.02], lw(cam, 10, [0, ey, ez]), '#6a6a72', 'cord')}
    </g>});
  }
  // table de nuit et veilleuse (dôme qui brille)
  items.push({z: 4.7, x: 600, y: 200, el: <g key="tdn">
    {boiteG(cam, 450, 750, 150, SOL, 4.4, 5.0, ['#f0e0f0', '#d8c8e0', '#c8b8d0'], 'b')}
    {boiteG(cam, 540, 660, 70, 150, 4.62, 4.78, ['#fff4d8', '#ffe8c0', '#f8dcb0'], 'v')}
    {halo(cam, V.x, V.y, V.z, 700, 'en-etoile', 0.85 * veilleuse, 'vh')}
  </g>});
  // étagère, peluches, et la caméra du babyphone (diode rouge)
  items.push({z: 4.15, x: 1150, y: -350, el: <g key="et">
    {boiteG(cam, X - 300, X, -340, -310, 3.6, 4.9, ['#d8c0a8', '#c8b098', '#b8a088'], 'p')}
    {boiteG(cam, X - 240, X - 120, -440, -340, CAMERA_B.z - 0.08, CAMERA_B.z + 0.08, ['#f4f4f0', '#e8e8e4', '#dcdcd8'], 'cam')}
    {halo(cam, X - 245, -400, CAMERA_B.z, 40, 'ga-rouge', Math.floor(f / 20) % 2 ? 1 : 0.4, 'led')}
    {boiteG(cam, X - 280, X - 120, -480, -340, 4.45, 4.75, ['#c8945a', '#b8844a', '#a8743a'], 'ours')}
  </g>});
  // coffre à jouets
  items.push({z: 1.0, x: -900, y: 300, el: boiteG(cam, -1250, -700, 180, SOL, 0.6, 1.3, ['#a8d8f4', '#88b8d8', '#78a8c8'], 'coffre')});
  // armoire (mur droit, entre la porte et l'étagère)
  items.push({z: 2.85, x: X - 160, y: -150, el: <g key="arm">
    {boiteG(cam, X - 320, X, -780, SOL, 2.25, 3.45, ['#c8dcf0', '#a8bcd8', '#98acc8'], 'a')}
    {[2.84, 2.86].map((z, j) => <g key={j}>{halo(cam, X - 322, -200, z + (j ? 0.12 : -0.12), 26, 'ga-chaud', 0.6, `poi${j}`)}</g>)}
    {quad(cam, [[X - 321, -760, 2.85], [X - 321, SOL - 20, 2.85]].concat([[X - 321, SOL - 20, 2.852], [X - 321, -760, 2.852]]), '#7a8ca8', 'fente')}
  </g>});
  // commode et petite lampe (mur gauche, après la fenêtre)
  items.push({z: 4.1, x: -X + 150, y: 200, el: <g key="com">
    {boiteG(cam, -X, -X + 300, 60, SOL, 3.55, 4.65, ['#f4d8e4', '#e4c0d0', '#d4b0c0'], 'c')}
    {[160, 290].map((y, j) => quad(cam, [[-X + 301, y - 50, 3.65], [-X + 301, y - 50, 4.55], [-X + 301, y + 40, 4.55], [-X + 301, y + 40, 3.65]], 'none', `ti${j}`, 1, {stroke: '#b890a8', strokeWidth: 3}))}
    {boiteG(cam, -X + 90, -X + 210, -80, 60, 4.0, 4.12, ['#ffffff', '#f0e8f0', '#e0d8e0'], 'lp')}
    {boiteG(cam, -X + 40, -X + 260, -200, -80, 3.92, 4.2, ['#f8c8dc', '#e8b0c8', '#d8a0b8'], 'ab')}
  </g>});
  // tapis rond moelleux
  items.push({z: 2.2, x: 0, y: SOL, el: <g key="tapis">
    {quad(cam, [...Array(28)].map((_, j) => [Math.cos((j / 28) * 6.283) * 900, SOL - 2, 2.1 + Math.sin((j / 28) * 6.283) * 0.85]), '#e8d0e8', 't1', 0.55 + 0.3 * veilleuse)}
    {quad(cam, [...Array(28)].map((_, j) => [Math.cos((j / 28) * 6.283) * 600, SOL - 3, 2.1 + Math.sin((j / 28) * 6.283) * 0.57]), '#c8a8e0', 't2', 0.5 + 0.3 * veilleuse)}
  </g>});
  // tipi (billboard), cubes et lapin en peluche
  if (cam.visible(0.9, -650, SOL) && cam.profondeur(0.9, -650, SOL) > 0.3) {
    const [px, py] = cam.proj(-650, SOL, 0.9);
    const sc = cam.scale(0.9, -650, SOL);
    items.push({z: 0.9, x: -650, y: 0, el: <g key="tipi" transform={`translate(${px} ${py}) scale(${sc})`}>
      <path d="M-330,0 L0,-760 L330,0 Z" fill="#f4e8d8" opacity={0.55 + 0.3 * veilleuse} />
      <path d="M-120,0 L0,-300 L120,0 Z" fill="#3a2a3a" />
      <path d="M-40,-760 L0,-680 L40,-760" stroke="#8a6a4a" strokeWidth="18" fill="none" />
      {[-230, -110, 10, 130, 250].map((x, j) => <path key={j} d={`M${x},${-200 - j * 10} l40,-50 l40,50 Z`} fill={['#f4a8c8', '#a8d8f4', '#ffe27a', '#c8a8f4', '#a8f4c8'][j]} />)}
    </g>});
  }
  [[-250, 1.5, '#ff7a7a'], [-130, 1.45, '#7ac8ff'], [-190, 1.4, '#ffd27a']].forEach(([x, z, c], j) => items.push({z, x, y: SOL - 50, el: boiteG(cam, x - 50, x + 50, SOL - 100 - (j === 2 ? 100 : 0), SOL - (j === 2 ? 100 : 0), z - 0.05, z + 0.05, [c, c, c], `cube${j}`)}));
  if (cam.visible(1.25, 380, SOL) && cam.profondeur(1.25, 380, SOL) > 0.3) {
    const [px, py] = cam.proj(380, SOL, 1.25);
    const sc = cam.scale(1.25, 380, SOL);
    items.push({z: 1.25, x: 380, y: SOL - 100, el: <g key="lapin" transform={`translate(${px} ${py}) scale(${sc})`} opacity={0.6 + 0.35 * veilleuse}>
      <ellipse cx="0" cy="-90" rx="80" ry="90" fill="#f0e8f0" /><circle cx="0" cy="-210" r="62" fill="#f0e8f0" />
      <ellipse cx="-28" cy="-310" rx="18" ry="62" fill="#f0e8f0" /><ellipse cx="28" cy="-310" rx="18" ry="62" fill="#f0e8f0" />
      <circle cx="-20" cy="-215" r="7" fill="#2a2a2a" /><circle cx="20" cy="-215" r="7" fill="#2a2a2a" />
    </g>});
  }
  return {fond: <g>{fond}</g>, items, brume: null};
};

// ===================== l'escalier et la porte de Léna =====================
export const ESC_M = {x: 520, marche: 75, prof: 0.26, n: 14, palier: 6};
export const hautEsc = ESC_M.n * ESC_M.prof;
export const ySolEsc = (z) => SOL - Math.max(0, Math.min(ESC_M.n, Math.ceil(z / ESC_M.prof - 0.001))) * ESC_M.marche;
export const escalierMaison = (cam, f, {porte = 0, applique = 1} = {}) => {
  const {x: X, marche: M, prof: P, n: N, palier: ZP} = ESC_M;
  const YH = SOL - N * M;
  const PLH = YH - 1150;
  const fond = [];
  fond.push(<DefsGare key="dg" cam={cam} />);
  fond.push(<DefsEnfant key="de" cam={cam} />);
  fond.push(<rect key="n" width="1080" height="1920" fill="#07060a" />);
  // lumière : une applique chaude au milieu de la montée + la lueur sous la porte de Léna
  const A = {x: -X + 40, y: SOL - 700 - 7 * M, z: 1.9};
  const av = cam.visible(A.z, A.x, A.y);
  const [ax, ay] = cam.proj(A.x, A.y, A.z);
  fond.push(
    <defs key="lum">
      <radialGradient id="em-a" cx={av ? ax : 540} cy={av ? ay : 400} r={av ? Math.max(800, 2200 * cam.scale(A.z, A.x, A.y)) : 2000} gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#ffd8a0" stopOpacity="0.9" />
        <stop offset="0.4" stopColor="#c87a4a" stopOpacity="0.45" />
        <stop offset="1" stopColor="#3a2418" stopOpacity="0.05" />
      </radialGradient>
    </defs>,
  );
  const pan = (pts, nuit, key) => (
    <g key={key}>
      {quad(cam, pts, nuit, `${key}n`)}
      <g opacity={applique}>{quad(cam, pts, 'url(#em-a)', `${key}a`)}</g>
    </g>
  );
  // murs (papier peint rayé), plafond en pente puis plat au-dessus du palier
  [-1, 1].forEach((s) => {
    fond.push(pan([[s * X, SOL - 1500, 0], [s * X, PLH, hautEsc], [s * X, PLH, ZP], [s * X, YH, ZP], [s * X, YH, hautEsc], [s * X, SOL, 0]], s < 0 ? '#2a1e26' : '#221a22', `m${s}`));
    for (let z = 0.2; z < ZP; z += 0.32) {
      const yb = z < hautEsc ? SOL - (z / P) * M : YH;
      fond.push(ligne(cam, [s * (X - 1), yb - 1400, z], [s * (X - 1), yb, z], lw(cam, 10, [s * X, yb - 600, z]), '#000', `rp${s}${z}`, 0.12));
    }
  });
  fond.push(pan([[-X, SOL - 1500, 0], [X, SOL - 1500, 0], [X, PLH, hautEsc], [-X, PLH, hautEsc]], '#16121a', 'plp'));
  fond.push(pan([[-X, PLH, hautEsc], [X, PLH, hautEsc], [X, PLH, ZP], [-X, PLH, ZP]], '#16121a', 'plh'));
  // le palier (sol) et le mur du fond avec la porte de Léna
  fond.push(pan([[-X, YH, hautEsc], [X, YH, hautEsc], [X, YH, ZP], [-X, YH, ZP]], '#2a1a12', 'pal'));
  const PD = {x0: -300, x1: 300, y0: YH - 820};
  fond.push(troue(cam, [[-X, PLH, ZP], [X, PLH, ZP], [X, YH, ZP], [-X, YH, ZP]], [[[PD.x0, PD.y0, ZP], [PD.x1, PD.y0, ZP], [PD.x1, YH, ZP], [PD.x0, YH, ZP]]], '#241a24', 'mfo'));
  // derrière la porte : la chambre aux étoiles
  fond.push(quad(cam, [[PD.x0, PD.y0, ZP + 0.01], [PD.x1, PD.y0, ZP + 0.01], [PD.x1, YH, ZP + 0.01], [PD.x0, YH, ZP + 0.01]], '#140e22', 'dch'));
  for (let k = 0; k < 18; k++) {
    const x = PD.x0 + 40 + random(`dx${k}`) * 520 + Math.sin(f / 50 + k) * 20;
    const y = PD.y0 + 40 + random(`dy${k}`) * 700;
    if (!cam.visible(ZP + 0.6, x, y)) continue;
    const [px, py] = cam.proj(x, y, ZP + 0.6);
    fond.push(etoile(px, py, 10 * cam.scale(ZP + 0.6, x, y) * 6, ['#ffe27a', '#ff9ad8', '#9ad8ff'][k % 3], `ds${k}`, 0.85));
  }
  // la lueur de la veilleuse sous la porte
  fond.push(quad(cam, [[PD.x0, YH - 6, ZP - 0.002], [PD.x1, YH - 6, ZP - 0.002], [PD.x1, YH, ZP - 0.002], [PD.x0, YH, ZP - 0.002]], '#ffc8e8', 'fente', 0.9));
  fond.push(tache(cam, 0, YH - 2, ZP - 0.4, 500, 0.4, 'en-couloir', 0.6, 'fentes'));
  const items = [];
  // les marches (boîtes) avec nez clair
  for (let k = 0; k < N; k++) {
    const z0 = k * P;
    const y = SOL - (k + 1) * M;
    items.push({z: z0 + P / 2, x: 0, y, el: <g key={`m${k}`}>
      {boiteG(cam, -X, X - 80, y, y + M, z0, z0 + P, ['#5a3a24', '#3a2416', '#2a1a10'], 'b')}
      {quad(cam, [[-X, y - 1, z0], [X - 80, y - 1, z0], [X - 80, y - 1, z0 + 0.04], [-X, y - 1, z0 + 0.04]], '#8a5a3a', 'nez', 0.8)}
      {quad(cam, [[-X + 120, y - 2, z0 + 0.03], [X - 200, y - 2, z0 + 0.03], [X - 200, y - 2, z0 + P - 0.02], [-X + 120, y - 2, z0 + P - 0.02]], '#5a2a3a', 'tapis', 0.8)}
    </g>});
  }
  // rampe : main courante et barreaux
  const rampe = (z) => (z < hautEsc ? SOL - (z / P) * M : YH) - 330;
  for (let k = 0; k <= N; k++) {
    const z = k * P + 0.13;
    items.push({z, x: X - 60, y: rampe(z) + 150, el: ligne(cam, [X - 60, rampe(z), z], [X - 60, rampe(z) + 330 - 4, z], lw(cam, 14, [X - 60, rampe(z), z]), '#d8d0c4', `ba${k}`)});
  }
  items.push({z: hautEsc / 2, x: X - 60, y: -400, el: ligne(cam, [X - 60, rampe(0), 0], [X - 60, rampe(hautEsc), hautEsc], lw(cam, 34, [X - 60, rampe(cam.z), cam.z + 0.5]), '#6a4a2e', 'mc')});
  // cadres qui montent avec l'escalier, applique
  [0.6, 1.4, 2.3, 3.1].forEach((z, k) => {
    const yb = SOL - (z / P) * M - 900;
    items.push({z, x: -X, y: yb, el: plaque(cam, [-X + 3, yb, z - 0.18], [0, 0, 1], [0, 1, 0], 360, 280, <g><rect width="360" height="280" fill="#2a1e14" /><rect x="22" y="22" width="316" height="236" fill={['#8a6a5a', '#5a6a8a', '#7a8a5a', '#8a5a7a'][k]} /><circle cx="140" cy="120" r="40" fill="#e8c8a8" opacity="0.8" /><circle cx="220" cy="130" r="34" fill="#e8c8a8" opacity="0.8" /></g>, `cad${k}`)});
  });
  items.push({z: A.z, x: A.x, y: A.y, el: <g key="app">{boiteG(cam, -X + 2, -X + 60, A.y - 50, A.y + 50, A.z - 0.08, A.z + 0.08, ['#d8b878', '#c8a868', '#b89858'], 'a')}{halo(cam, A.x + 30, A.y, A.z, 700, 'ga-chaud', 0.6 * applique, 'h')}</g>});
  // la porte de Léna (battant qui s'ouvre vers l'intérieur), lettres en bois
  {
    const a = porte * 1.2;
    const L = PD.x1 - PD.x0;
    const bx = PD.x0 + Math.cos(a) * L;
    const bz = ZP + (Math.sin(a) * L) / 1000;
    items.push({z: ZP + 0.05, x: 0, y: YH - 400, el: <g key="porte">
      {quad(cam, [[PD.x0, PD.y0, ZP + 0.003], [bx, PD.y0, bz + 0.003], [bx, YH, bz + 0.003], [PD.x0, YH, ZP + 0.003]], '#e8a8c8', 'bat')}
      {quad(cam, [[PD.x0, PD.y0, ZP + 0.003], [bx, PD.y0, bz + 0.003], [bx, YH, bz + 0.003], [PD.x0, YH, ZP + 0.003]], 'url(#em-a)', 'bata', 0.4 * applique)}
      {porte < 0.15 && plaque(cam, [PD.x0 + 110, PD.y0 + 140, ZP - 0.002], [1, 0, 0], [0, 1, 0], 380, 110, <g>{['L', 'É', 'N', 'A'].map((c, k) => <text key={k} x={k * 95} y="95" fontSize="100" fontWeight="900" fontFamily="'DejaVu Sans', Arial" fill={['#ffffff', '#ffe27a', '#9ad8ff', '#ffffff'][k]}>{c}</text>)}</g>, 'let')}
      {porte < 0.15 && halo(cam, PD.x1 - 70, YH - 380, ZP - 0.01, 30, 'ga-chaud', 0.8, 'poignee')}
    </g>});
  }
  return {fond: <g>{fond}</g>, items, brume: null};
};
