import {random} from 'remotion';
import {mix, rgb, SOL} from './ForetNuit';

// ===================== Le chalet dans la tempête (« Ne lui ouvre pas ») =====================
// Intérieur : pièce en rondins X ±1300, Z 0 → 2,6, plafond −1000 (poutres). Mur du fond (Z 2,6) : la porte (gauche)
// et la fenêtre (droite) donnent sur la tempête. Mur gauche : cheminée en pierre (le feu, lumière chaude qui vacille).
// Mur droit : le lit (dessous : 170 de vide pour s'y glisser) et l'armoire à persiennes.
// Éclairage par polygone (chaque rondin, chaque latte est éclairé à son centre) : feu chaud, fenêtre froide,
// lampe à pétrole sur la table, flash rouge de l'alerte. Extérieur : la façade (Z 2,6) vue de la forêt enneigée.
const R = (s) => random(s);
export const CH = {x0: -1300, x1: 1300, z0: 0, z1: 2.6, plaf: -1000};
export const PORTE = {x0: -800, x1: -460, y0: -330, z: 2.6};
export const FEN = {x0: 200, x1: 700, y0: -480, y1: -40, z: 2.6};
export const CHEM = {z0: 0.95, z1: 1.65, x: CH.x0, prof: 170, haut: 60};
export const FEU = [CH.x0 + 80, 360, 1.3];
export const LIT = {x0: 760, x1: CH.x1, z0: 0.25, z1: 1.0, cadre: 262, matelas: 190};
export const ARM = {x0: 1060, x1: CH.x1, z0: 1.45, z1: 2.15, y: -380};
export const TABLE = {x0: -540, x1: -100, z0: 0.8, z1: 1.25, y: 160};
export const TEL_T = [-300, TABLE.y - 4, 1.0]; // le téléphone posé sur la table

const borne = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const vacille = (f) => 0.84 + 0.1 * Math.sin(f / 2.7) + 0.06 * Math.sin(f / 1.1 + 2) * R(`vc${Math.floor(f / 2)}`);

// ----- la lumière en un point (renvoie une couleur multiplicative 0 → ~1.5) -----
const lumiere = (p, L) => {
  const d = (q) => Math.hypot(p[0] - q[0], p[1] - q[1], (p[2] - q[2]) * 1000);
  const feu = (L.feu * vacille(L.f) * 1.3) / (1 + (d(FEU) / 680) ** 2);
  const fen = (L.fenetre * 0.5) / (1 + (d([450, -250, 2.55]) / 900) ** 2);
  const lampe = (L.lampe * 0.55) / (1 + (d([-200, -60, 1.05]) / 520) ** 2);
  const rouge = (L.rouge * 0.9) / (1 + (d(TEL_T) / 900) ** 2);
  const porte = (L.porte * 0.7) / (1 + (d([-630, -100, 2.6]) / 800) ** 2);
  const app = ((L.applique ?? 1) * 0.5) / (1 + (d([-250, -420, 2.5]) / 520) ** 2);
  return [
    0.035 + feu * 1.0 + fen * 0.35 + lampe * 1.0 + rouge * 1.0 + porte * 0.4 + app * 1.0,
    0.035 + feu * 0.52 + fen * 0.42 + lampe * 0.7 + rouge * 0.12 + porte * 0.5 + app * 0.72,
    0.06 + feu * 0.24 + fen * 0.7 + lampe * 0.35 + rouge * 0.12 + porte * 0.85 + app * 0.4,
  ];
};
const teinte = (albedo, p, L) => {
  const l = lumiere(p, L);
  return `rgb(${albedo.map((a, i) => Math.round(borne(a * l[i] * 255, 0, 255))).join(',')})`;
};
const BOIS = [0.78, 0.5, 0.3];
const BOIS_F = [0.55, 0.34, 0.2];
const PIERRE = [0.36, 0.34, 0.34];

// une boîte éclairée (faces visibles seulement)
export const boite = (cam, [x0, x1], [y0, y1], [z0, z1], albedo, L, key, {sans = []} = {}) => {
  const faces = [];
  const F = (nom, pts, n) => {
    if (sans.includes(nom)) return;
    const c = pts.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]);
    const p = cam.poly(pts);
    if (p) faces.push(<polygon key={nom} points={p} fill={teinte(albedo.map((a) => a * n), c, L)} />);
  };
  if (cam.y < y0) F('haut', [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], 1.05);
  if (cam.y > y1) F('bas', [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], 0.6);
  if (cam.x < x0) F('g', [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], 0.85);
  if (cam.x > x1) F('d', [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], 0.85);
  if (cam.z < z0) F('av', [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], 0.95);
  if (cam.z > z1) F('ar', [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], 0.95);
  return <g key={key}>{faces}</g>;
};

// ----- dehors, vu par la fenêtre ou la porte : nuit bleue, sol enneigé, sapins, neige qui file -----
const SAPINS = [...Array(26)].map((_, i) => ({x: -6000 + i * 480 + R(`sx${i}`) * 300, z: 5.5 + R(`sz${i}`) * 9, h: 1800 + R(`sh${i}`) * 2200}));
const dehors = (cam, f, id, {silhouette = null} = {}) => {
  const sol = cam.poly([[-30000, SOL, 2.62], [30000, SOL, 2.62], [30000, SOL, 60], [-30000, SOL, 60]]);
  const sap = SAPINS.map((s, k) => {
    if (!cam.visible(s.z, s.x, 0)) return null;
    const [x, y] = cam.proj(s.x, SOL, s.z);
    const sc = cam.scale(s.z, s.x, SOL);
    const h = s.h * sc;
    const w = s.h * 0.32 * sc;
    return <polygon key={k} points={`${x},${y - h} ${x - w},${y} ${x + w},${y}`} fill={rgb(mix([10, 14, 28], [60, 74, 110], Math.min(1, (s.z - 5) / 10)))} />;
  });
  return (
    <g>
      <rect x="-200" y="-400" width="1480" height="2800" fill={`url(#${id}-nuit)`} />
      {sap}
      {sol && <polygon points={sol} fill={`url(#${id}-neige)`} />}
      {silhouette}
      <Neige f={f} id={`${id}n`} force={0.9} vent={[-14, 9]} />
    </g>
  );
};

// ----- la neige qui file (par-dessus une image). rush > 0 : les flocons foncent vers la caméra -----
export const Neige = ({f, id = 'ng', force = 1, vent = [-10, 7], rush = 0, cx = 540, cy = 900}) => {
  const n = Math.round(150 * force);
  return (
    <g>
      {[...Array(n)].map((_, k) => {
        const prof = 0.3 + R(`np${k}`) * 0.7; // 1 = tout près
        if (rush > 0) {
          const a = R(`na${k}`) * Math.PI * 2;
          const u = (R(`nu${k}`) + (f * 0.035 * rush) * (0.6 + prof)) % 1;
          const r0 = 40 + u * u * 1500;
          const x = cx + Math.cos(a) * r0;
          const y = cy + Math.sin(a) * r0;
          const l = 6 + u * 90 * rush;
          return <line key={k} x1={x} y1={y} x2={x + Math.cos(a) * l} y2={y + Math.sin(a) * l} stroke="#e8eeff" strokeWidth={1 + 4 * u * prof} strokeLinecap="round" opacity={0.25 + 0.6 * u} />;
        }
        const vx = vent[0] * (0.5 + prof);
        const vy = vent[1] * (0.5 + prof) + 4;
        const x = (((R(`nx${k}`) * 1400 + f * vx + 40 * Math.sin(f / 20 + k)) % 1400) + 1400) % 1400 - 160;
        const y = (((R(`ny${k}`) * 2200 + f * vy) % 2200) + 2200) % 2200 - 140;
        const l = Math.hypot(vx, vy) * 1.2;
        return <line key={k} x1={x} y1={y} x2={x - (vx / Math.hypot(vx, vy)) * l} y2={y - (vy / Math.hypot(vx, vy)) * l} stroke="#dfe6ff" strokeWidth={1 + 3.5 * prof * prof} strokeLinecap="round" opacity={0.18 + 0.55 * prof} />;
      })}
    </g>
  );
};

// ----- l'intérieur du chalet -----
// o : feu, lampe, fenetre (lumière bleue), rouge (flash d'alerte), porte (0 → 1 ouverte), poignee (0 → 1),
//     verrou (0 → 1 qui saute), armoire (0 → 1 portes ouvertes), dehors (élément 3D à voir par la fenêtre/porte), coups (secousse de la porte)
export const chalet = (cam, f, o = {}) => {
  const L = {f, feu: 1, lampe: 1, fenetre: 1, rouge: 0, porte: 0, ...o, porte: (o.porte || 0) * 0.8};
  const id = `ch${o.id || ''}`;
  const fond = [];
  // plafond : planches + poutres
  for (let k = 0; k < 8; k++) {
    const za = (CH.z1 * k) / 8;
    const zb = (CH.z1 * (k + 1)) / 8;
    const p = cam.poly([[CH.x0, CH.plaf, za], [CH.x1, CH.plaf, za], [CH.x1, CH.plaf, zb], [CH.x0, CH.plaf, zb]]);
    if (p) fond.push(<polygon key={`pl${k}`} points={p} fill={teinte(BOIS_F, [0, CH.plaf, (za + zb) / 2], L)} />);
  }
  // murs en rondins (chaque rondin coupé en morceaux, éclairé à son centre)
  const H = 100;
  const murs = [
    {nom: 'fond', a: (u, y) => [CH.x0 + u * (CH.x1 - CH.x0), y, CH.z1], n: 10},
    {nom: 'gauche', a: (u, y) => [CH.x0, y, CH.z0 + u * (CH.z1 - CH.z0) - 0.4 * (1 - u)], n: 8},
    {nom: 'droit', a: (u, y) => [CH.x1, y, CH.z0 + u * (CH.z1 - CH.z0) - 0.4 * (1 - u)], n: 8},
    {nom: 'avant', a: (u, y) => [CH.x0 + u * (CH.x1 - CH.x0), y, -0.4], n: 10},
  ];
  murs.forEach((m) => {
    for (let y = CH.plaf; y < SOL; y += H) {
      for (let k = 0; k < m.n; k++) {
        const u0 = k / m.n;
        const u1 = (k + 1) / m.n;
        const pts = [m.a(u0, y), m.a(u1, y), m.a(u1, y + H), m.a(u0, y + H)];
        const p = cam.poly(pts);
        if (!p) continue;
        const c = m.a((u0 + u1) / 2, y + H / 2);
        const v = 0.9 + 0.14 * R(`lg${m.nom}${y}`);
        fond.push(<polygon key={`${m.nom}${y}${k}`} points={p} fill={teinte(BOIS.map((a) => a * v), c, L)} stroke={teinte(BOIS.map((a) => a * v), c, L)} strokeWidth="1" />);
      }
      // reflet sur le haut du rondin, joint sombre dessous
      const hl = cam.seg(m.a(0, y + 18), m.a(1, y + 18));
      if (hl) fond.push(<line key={`h${m.nom}${y}`} x1={hl[0][0]} y1={hl[0][1]} x2={hl[1][0]} y2={hl[1][1]} stroke="#ffcf9a" strokeOpacity="0.07" strokeWidth={Math.max(1, 14 * cam.scale(m.a(0.5, y)[2], m.a(0.5, y)[0], y))} />);
      const s = cam.seg(m.a(0, y), m.a(1, y));
      if (s) fond.push(<line key={`j${m.nom}${y}`} x1={s[0][0]} y1={s[0][1]} x2={s[1][0]} y2={s[1][1]} stroke="#1a0e08" strokeOpacity="0.55" strokeWidth={Math.max(1, 5 * cam.scale(m.a(0.5, y)[2], m.a(0.5, y)[0], y))} />);
    }
  });
  // sol : lattes de parquet selon X
  for (let k = 0; k < 16; k++) {
    const xa = CH.x0 + (k * (CH.x1 - CH.x0)) / 16;
    const xb = CH.x0 + ((k + 1) * (CH.x1 - CH.x0)) / 16;
    for (let j = 0; j < 7; j++) {
      const za = -0.4 + (j * (CH.z1 + 0.4)) / 7;
      const zb = -0.4 + ((j + 1) * (CH.z1 + 0.4)) / 7;
      const p = cam.poly([[xa, SOL, za], [xb, SOL, za], [xb, SOL, zb], [xa, SOL, zb]]);
      if (p) fond.push(<polygon key={`pa${k}${j}`} points={p} fill={teinte(BOIS_F.map((a) => a * (0.9 + 0.15 * R(`pq${k}${j}`))), [(xa + xb) / 2, SOL, (za + zb) / 2], L)} stroke="#140a06" strokeOpacity="0.5" strokeWidth="1.5" />);
    }
  }
  // poutres au plafond
  [0.5, 1.3, 2.1].forEach((z, k) => fond.push(boite(cam, [CH.x0, CH.x1], [CH.plaf, CH.plaf + 70], [z - 0.06, z + 0.06], BOIS_F, L, `pt${k}`)));
  // ----- la fenêtre : la tempête dehors (et ce qui s'y trouve) -----
  const fenP = cam.poly([[FEN.x0, FEN.y0, FEN.z], [FEN.x1, FEN.y0, FEN.z], [FEN.x1, FEN.y1, FEN.z], [FEN.x0, FEN.y1, FEN.z]]);
  const defs = (
    <defs key="defs">
      <linearGradient id={`${id}-nuit`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#060914" />
        <stop offset="0.6" stopColor="#1a2440" />
        <stop offset="1" stopColor="#2a3658" />
      </linearGradient>
      <linearGradient id={`${id}-neige`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5a6a94" />
        <stop offset="1" stopColor="#a8b6dc" />
      </linearGradient>
      <radialGradient id={`${id}-givre`}>
        <stop offset="0.55" stopColor="#dfe8ff" stopOpacity="0" />
        <stop offset="1" stopColor="#dfe8ff" stopOpacity="0.55" />
      </radialGradient>
      {fenP && (
        <clipPath id={`${id}-fen`}>
          <polygon points={fenP} />
        </clipPath>
      )}
    </defs>
  );
  fond.unshift(defs);
  if (fenP && cam.z < FEN.z) {
    const [cx, cy] = cam.proj((FEN.x0 + FEN.x1) / 2, (FEN.y0 + FEN.y1) / 2, FEN.z);
    const r = 420 * cam.scale(FEN.z, 450, -250);
    fond.push(
      <g key="fen" clipPath={`url(#${id}-fen)`}>
        {dehors(cam, f, id, {silhouette: o.dehors})}
        <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-givre)`} />
      </g>,
    );
    // croisillon et cadre
    const cr = [
      [[(FEN.x0 + FEN.x1) / 2, FEN.y0, FEN.z - 0.002], [(FEN.x0 + FEN.x1) / 2, FEN.y1, FEN.z - 0.002]],
      [[FEN.x0, (FEN.y0 + FEN.y1) / 2, FEN.z - 0.002], [FEN.x1, (FEN.y0 + FEN.y1) / 2, FEN.z - 0.002]],
    ];
    cr.forEach((sg, k) => {
      const s = cam.seg(...sg);
      if (s) fond.push(<line key={`cr${k}`} x1={s[0][0]} y1={s[0][1]} x2={s[1][0]} y2={s[1][1]} stroke="#2a1608" strokeWidth={22 * cam.scale(FEN.z, 450, -250)} />);
    });
    fond.push(<polygon key="cadre" points={fenP} fill="none" stroke="#2a1608" strokeWidth={34 * cam.scale(FEN.z, 450, -250)} />);
  }
  // ----- la porte (charnière à gauche, s'ouvre vers l'intérieur) -----
  const ang = ((o.porte || 0) * 75 * Math.PI) / 180;
  const w = PORTE.x1 - PORTE.x0;
  const coups = o.coups || 0;
  const bout = [PORTE.x0 + Math.cos(ang) * w, PORTE.z - (Math.sin(ang) * w) / 1000];
  const trou = cam.poly([[PORTE.x0, PORTE.y0, PORTE.z], [PORTE.x1, PORTE.y0, PORTE.z], [PORTE.x1, SOL, PORTE.z], [PORTE.x0, SOL, PORTE.z]]);
  if (trou && cam.z < PORTE.z) {
    fond.push(<polygon key="trou" points={trou} fill="#05070e" />);
    if (o.porte > 0) {
      fond.push(
        <g key="dehorsP">
          <defs>
            <clipPath id={`${id}-trou`}>
              <polygon points={trou} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${id}-trou)`}>{dehors(cam, f, `${id}`, {silhouette: o.dehorsPorte})}</g>
        </g>,
      );
    }
  }
  const dx = coups * 6 * Math.sin(f * 2.2);
  const panneau = cam.poly([[PORTE.x0 + dx, PORTE.y0, PORTE.z - 0.004], [bout[0] + dx, PORTE.y0, bout[1] - 0.004], [bout[0] + dx, SOL, bout[1] - 0.004], [PORTE.x0 + dx, SOL, PORTE.z - 0.004]]);
  const itemsPorte = [];
  // lumière sous la porte (et l'ombre de pieds devant), par-dessus le battant
  let sousPorte = null;
  if (!o.porte && cam.z < PORTE.z) {
    const a = cam.proj(PORTE.x0 + 30, SOL - 5, PORTE.z - 0.006);
    const b = cam.proj(PORTE.x1 - 30, SOL - 5, PORTE.z - 0.006);
    const sc = cam.scale(PORTE.z, -630, SOL);
    const ep = Math.max(2, 12 * sc);
    sousPorte = (
      <g>
        <rect x={a[0]} y={a[1] - ep / 2} width={b[0] - a[0]} height={ep} fill="#a8bcf0" />
        <ellipse cx={(a[0] + b[0]) / 2} cy={a[1]} rx={(b[0] - a[0]) * 0.7} ry={ep * 4} fill="#a8bcf0" opacity="0.18" />
        {(o.pieds || []).map((px, k) => {
          const q = cam.proj(-630 + px, SOL - 5, PORTE.z - 0.006);
          return <rect key={k} x={q[0] - 20 * sc} y={q[1] - ep / 2 - 1} width={40 * sc} height={ep + 2} fill="#05070e" />;
        })}
      </g>
    );
  }
  if (panneau) {
    const c = [PORTE.x0 + (bout[0] - PORTE.x0) / 2, 0, (PORTE.z + bout[1]) / 2];
    // poignée (bec-de-cane) et verrou
    const pp = (u, y) => [PORTE.x0 + (bout[0] - PORTE.x0) * u + dx, y, PORTE.z + (bout[1] - PORTE.z) * u - 0.008];
    const mp = cam.proj(...pp(0.86, 20));
    const sc = cam.scale(...[pp(0.86, 20)[2], pp(0.86, 20)[0], 20]);
    const rot = -38 * (o.poignee || 0);
    const vr = cam.proj(...pp(0.86, -60));
    const verrou = o.verrou || 0;
    itemsPorte.push({
      z: (PORTE.z + bout[1]) / 2 - 0.02,
      x: c[0],
      el: (
        <g key="porte">
          <polygon points={panneau} fill={teinte(BOIS_F, c, L)} />
          {sousPorte}
          {[0.25, 0.5, 0.75].map((u, k) => {
            const s = cam.seg(pp(u, PORTE.y0 + 20), pp(u, SOL - 10));
            return s ? <line key={k} x1={s[0][0]} y1={s[0][1]} x2={s[1][0]} y2={s[1][1]} stroke="#140a06" strokeOpacity="0.5" strokeWidth={4 * sc} /> : null;
          })}
          <g transform={`translate(${mp[0]} ${mp[1]}) scale(${sc}) rotate(${rot})`}>
            <circle r="16" fill="#3a3530" />
            <rect x="-74" y="-8" width="80" height="16" rx="8" fill="#8a8070" />
          </g>
          <g transform={`translate(${vr[0]} ${vr[1]}) scale(${sc})`}>
            <rect x="-40" y="-14" width="56" height="28" rx="4" fill="#4a453e" />
            <rect x={-20 + 50 * verrou} y="-6" width="56" height="12" rx="3" fill="#a89c88" transform={`rotate(${verrou * 25})`} />
          </g>
        </g>
      ),
    });
  }
  // ----- la cheminée et le feu -----
  const items = [...itemsPorte];
  items.push({z: (CHEM.z0 + CHEM.z1) / 2, x: CH.x0 + 100, el: (
    <g key="chem">
      {boite(cam, [CH.x0, CH.x0 + CHEM.prof], [CH.plaf, SOL - 470], [CHEM.z0 - 0.08, CHEM.z1 + 0.08], PIERRE, L, 'hotte')}
      {boite(cam, [CH.x0, CH.x0 + CHEM.prof], [SOL - 470, SOL], [CHEM.z0 - 0.08, CHEM.z0], PIERRE, L, 'jg')}
      {boite(cam, [CH.x0, CH.x0 + CHEM.prof], [SOL - 470, SOL], [CHEM.z1, CHEM.z1 + 0.08], PIERRE, L, 'jd')}
      {boite(cam, [CH.x0, CH.x0 + CHEM.prof + 40], [SOL - 470, SOL - 430], [CHEM.z0 - 0.1, CHEM.z1 + 0.1], BOIS_F, L, 'man')}
      {flammes(cam, f, L.feu)}
    </g>
  )});
  // ----- la table, la lampe, le téléphone -----
  items.push({z: (TABLE.z0 + TABLE.z1) / 2, x: (TABLE.x0 + TABLE.x1) / 2, el: (
    <g key="table">
      {[[TABLE.x0 + 30, TABLE.z0 + 0.03], [TABLE.x1 - 60, TABLE.z0 + 0.03], [TABLE.x0 + 30, TABLE.z1 - 0.06], [TABLE.x1 - 60, TABLE.z1 - 0.06]].map(([x, z], k) => boite(cam, [x, x + 30], [TABLE.y + 30, SOL], [z, z + 0.03], BOIS_F, L, `tp${k}`))}
      {boite(cam, [TABLE.x0, TABLE.x1], [TABLE.y, TABLE.y + 30], [TABLE.z0, TABLE.z1], BOIS, L, 'tt')}
      {boite(cam, [-230, -170], [TABLE.y - 130, TABLE.y], [1.02, 1.08], [0.4, 0.38, 0.32], L, 'lp')}
      {o.lampe > 0.05 && halo(cam, [-200, TABLE.y - 170, 1.05], 260, '#ffc070', 0.6 * o.lampe, `${id}hl`)}
      {boite(cam, [TEL_T[0] - 40, TEL_T[0] + 40], [TEL_T[1] - 6, TEL_T[1]], [TEL_T[2] - 0.08, TEL_T[2] + 0.08], [0.1, 0.1, 0.12], L, 'tel')}
      {o.ecran > 0 && (() => {
        const p = cam.poly([[TEL_T[0] - 34, TEL_T[1] - 7, TEL_T[2] - 0.072], [TEL_T[0] + 34, TEL_T[1] - 7, TEL_T[2] - 0.072], [TEL_T[0] + 34, TEL_T[1] - 7, TEL_T[2] + 0.072], [TEL_T[0] - 34, TEL_T[1] - 7, TEL_T[2] + 0.072]]);
        return p ? <polygon points={p} fill={o.rouge > 0.3 ? '#ff3b30' : '#8fa6ff'} opacity={o.ecran} /> : null;
      })()}
      {o.ecran > 0 && halo(cam, [TEL_T[0], TEL_T[1] - 40, TEL_T[2]], 300, o.rouge > 0.3 ? '#ff2a2a' : '#8fa6ff', 0.5 * o.ecran, `${id}he`)}
    </g>
  )});
  // ----- le lit (du vide dessous) -----
  items.push({z: (LIT.z0 + LIT.z1) / 2, x: (LIT.x0 + LIT.x1) / 2, el: (
    <g key="lit">
      {[[LIT.x0, LIT.z0], [LIT.x0, LIT.z1 - 0.05], [LIT.x1 - 50, LIT.z0], [LIT.x1 - 50, LIT.z1 - 0.05]].map(([x, z], k) => boite(cam, [x, x + 50], [LIT.cadre + 40, SOL], [z, z + 0.05], BOIS_F, L, `lp${k}`))}
      {boite(cam, [LIT.x0, LIT.x1], [LIT.cadre, LIT.cadre + 40], [LIT.z0, LIT.z1], BOIS_F, L, 'cadre')}
      {boite(cam, [LIT.x0 + 10, LIT.x1], [LIT.matelas, LIT.cadre], [LIT.z0 + 0.01, LIT.z1 - 0.01], [0.85, 0.82, 0.78], L, 'mat')}
      {boite(cam, [LIT.x0 - 20, LIT.x1], [LIT.matelas - 30, LIT.cadre + 60], [LIT.z0 - 0.02, LIT.z1 - 0.2], [0.62, 0.16, 0.14], L, 'couette')}
      {boite(cam, [LIT.x0 + 200, LIT.x1 - 40], [LIT.matelas - 60, LIT.matelas], [LIT.z1 - 0.18, LIT.z1 - 0.03], [0.9, 0.88, 0.84], L, 'oreiller')}
      {boite(cam, [LIT.x1 - 30, LIT.x1], [-120, LIT.cadre], [LIT.z0, LIT.z1], BOIS, L, 'tete')}
    </g>
  )});
  // ----- l'armoire (portes à persiennes sur sa face −X) -----
  const ouv = ((o.armoire || 0) * 100 * Math.PI) / 180;
  const zm = (ARM.z0 + ARM.z1) / 2;
  const battant = (zh, sens, k) => {
    const lg = Math.abs(zm - zh) * 1000;
    const bx = ARM.x0 - Math.sin(ouv) * lg;
    const bz = zh + sens * (Math.cos(ouv) * lg) / 1000;
    const pts = [[ARM.x0 - 4, ARM.y + 20, zh], [bx - 4, ARM.y + 20, bz], [bx - 4, SOL - 20, bz], [ARM.x0 - 4, SOL - 20, zh]];
    const p = cam.poly(pts);
    if (!p) return null;
    const lattes = [];
    for (let y = ARM.y + 80; y < SOL - 80; y += 34) {
      const s = cam.seg([ARM.x0 - 6 + (bx - ARM.x0) * 0.1, y, zh + (bz - zh) * 0.1], [ARM.x0 - 6 + (bx - ARM.x0) * 0.9, y, zh + (bz - zh) * 0.9]);
      if (s) lattes.push(<line key={y} x1={s[0][0]} y1={s[0][1]} x2={s[1][0]} y2={s[1][1]} stroke="#120904" strokeOpacity="0.7" strokeWidth={Math.max(1, 6 * cam.scale(zh, ARM.x0, y))} />);
    }
    return <g key={`bt${k}`}><polygon points={p} fill={teinte(BOIS, [ARM.x0, 0, zh], L)} />{lattes}</g>;
  };
  if (!o.dansArmoire) items.push({z: zm, x: (ARM.x0 + ARM.x1) / 2, el: (
    <g key="arm">
      {boite(cam, [ARM.x0, ARM.x1], [ARM.y, SOL], [ARM.z0, ARM.z1], BOIS_F, L, 'corps', {sans: ['g']})}
      {(() => {
        const p = cam.poly([[ARM.x0, ARM.y, ARM.z0], [ARM.x0, ARM.y, ARM.z1], [ARM.x0, SOL, ARM.z1], [ARM.x0, SOL, ARM.z0]]);
        return p ? <polygon points={p} fill="#0a0604" /> : null;
      })()}
      {battant(ARM.z0, 1, 0)}
      {battant(ARM.z1, -1, 1)}
    </g>
  )});
  items.push({z: 2.55, x: -250, el: <g key="app">{boite(cam, [-280, -220], [-460, -380], [2.53, 2.6], [0.3, 0.25, 0.2], L, 'appl')}{halo(cam, [-250, -420, 2.5], 360, '#ffc070', 0.55 * (L.applique ?? 1), 'app-h')}</g>});
  // ----- détails : tapis, porte-manteau avec le bonnet de Léo, bois de cerf -----
  const tapis = cam.poly([[-500, SOL - 2, 0.3], [400, SOL - 2, 0.3], [400, SOL - 2, 1.9], [-500, SOL - 2, 1.9]]);
  if (tapis) fond.push(<polygon key="tapis" points={tapis} fill={teinte([0.36, 0.13, 0.1], [0, SOL, 1.1], L)} />);
  items.push({z: 2.5, x: -1100, el: <g key="pm">{boite(cam, [-1120, -1090], [-420, SOL], [2.47, 2.5], BOIS_F, L, 'pm')}{boite(cam, [-1180, -1040], [-420, -300], [2.45, 2.55], [0.15, 0.4, 0.25], L, 'man1')}</g>});
  return {fond: <g key="fond">{fond}</g>, brume: <g key="br" />, items, L};
};

// petit halo lumineux (lampe, feu, écran) en 3D
export const halo = (cam, p, r, couleur, op, id) => {
  if (!cam.visible(p[2], p[0], p[1])) return null;
  const [x, y] = cam.proj(...p);
  const rr = r * cam.scale(p[2], p[0], p[1]);
  return (
    <g key={id}>
      <defs>
        <radialGradient id={id}>
          <stop offset="0" stopColor={couleur} stopOpacity={op} />
          <stop offset="1" stopColor={couleur} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={x} cy={y} r={rr} fill={`url(#${id})`} />
    </g>
  );
};

const flammes = (cam, f, k) => {
  if (k <= 0.02 || !cam.visible(FEU[2], FEU[0], FEU[1])) return null;
  const [x, y] = cam.proj(FEU[0] + 20, SOL - 20, FEU[2]);
  const s = cam.scale(FEU[2], FEU[0], SOL);
  return (
    <g>
      {[0, 1, 2, 3, 4].map((j) => {
        const h = (150 + 60 * Math.sin(f / 3 + j * 1.7) + 30 * R(`fl${j}${Math.floor(f / 2)}`)) * k;
        const lx = (j - 2) * 45 * s;
        return <path key={j} d={`M${x + lx - 40 * s},${y} Q${x + lx - 30 * s},${y - h * 0.5 * s} ${x + lx + 8 * Math.sin(f / 2 + j) * s},${y - h * s} Q${x + lx + 30 * s},${y - h * 0.5 * s} ${x + lx + 40 * s},${y} Z`} fill={j % 2 ? '#ffb347' : '#ff7a1a'} opacity="0.9" />;
      })}
      {[0, 1, 2].map((j) => <ellipse key={`b${j}`} cx={x + (j - 1) * 60 * s} cy={y} rx={70 * s} ry={18 * s} fill="#3a1a0a" />)}
      {halo(cam, [FEU[0] + 60, SOL - 120, FEU[2]], 900 * k, '#ff9a3a', 0.45, 'feu-h')}
    </g>
  );
};

// ----- le chalet vu de dehors (façade Z 2,6 vers +Z), à ajouter aux items d'une forêt enneigée -----
export const chaletExt = (cam, f, {lumiere = 1, porte = 0, perso = null} = {}) => {
  const L = {f, feu: 0, lampe: 0, fenetre: 0, rouge: 0, porte: 0};
  const neigeTeinte = (k) => rgb([150 * k, 165 * k, 210 * k]);
  const bois = (y) => rgb([52, 34, 26].map((v) => v * (0.8 + 0.2 * Math.sin(y))));
  const el = [];
  // façade en rondins
  for (let y = -700; y < SOL; y += 100) {
    const p = cam.poly([[CH.x0 - 60, y, CH.z1 + 0.06], [CH.x1 + 60, y, CH.z1 + 0.06], [CH.x1 + 60, y + 100, CH.z1 + 0.06], [CH.x0 - 60, y + 100, CH.z1 + 0.06]]);
    if (p) el.push(<polygon key={`f${y}`} points={p} fill={bois(y)} stroke="#120a06" strokeWidth="2" />);
  }
  // côtés (si on les voit)
  [CH.x0 - 60, CH.x1 + 60].forEach((x, k) => {
    if ((k === 0 && cam.x > x) || (k === 1 && cam.x < x)) return;
    const p = cam.poly([[x, -700, CH.z1 + 0.06], [x, -700, CH.z0 - 0.4], [x, SOL, CH.z0 - 0.4], [x, SOL, CH.z1 + 0.06]]);
    if (p) el.push(<polygon key={`c${k}`} points={p} fill="#1e140f" />);
  });
  // pignon + toit enneigé
  const pg = cam.poly([[CH.x0 - 60, -700, CH.z1 + 0.06], [CH.x1 + 60, -700, CH.z1 + 0.06], [0, -1700, CH.z1 + 0.06]]);
  if (pg) el.push(<polygon key="pg" points={pg} fill="#2a1c14" />);
  [[CH.x0 - 400, -620], [CH.x1 + 400, -620]].forEach(([x, y], k) => {
    const p = cam.poly([[x, y, CH.z1 + 0.5], [0, -1760, CH.z1 + 0.5], [0, -1760, CH.z0 - 0.6], [x, y, CH.z0 - 0.6]]);
    if (p) el.push(<polygon key={`t${k}`} points={p} fill={neigeTeinte(k ? 0.75 : 0.95)} />);
    const bord = cam.seg([x, y, CH.z1 + 0.5], [0, -1760, CH.z1 + 0.5]);
    if (bord) el.push(<line key={`tb${k}`} x1={bord[0][0]} y1={bord[0][1]} x2={bord[1][0]} y2={bord[1][1]} stroke="#dfe8ff" strokeWidth={30 * cam.scale(CH.z1 + 0.5, 0, -1200)} strokeLinecap="round" />);
  });
  // fenêtre allumée (on peut voir quelqu'un dedans)
  const fp = cam.poly([[FEN.x0, FEN.y0, CH.z1 + 0.07], [FEN.x1, FEN.y0, CH.z1 + 0.07], [FEN.x1, FEN.y1, CH.z1 + 0.07], [FEN.x0, FEN.y1, CH.z1 + 0.07]]);
  if (fp) {
    el.push(
      <g key="fenx">
        <defs>
          <radialGradient id="chx-f" cx="0.3" cy="0.7" r="0.9">
            <stop offset="0" stopColor="#ffd08a" />
            <stop offset="1" stopColor="#c0622a" />
          </radialGradient>
          <clipPath id="chx-fc">
            <polygon points={fp} />
          </clipPath>
        </defs>
        <polygon points={fp} fill="url(#chx-f)" opacity={0.3 + 0.7 * lumiere * vacille(f)} />
        {perso && <g clipPath="url(#chx-fc)">{perso}</g>}
        <polygon points={fp} fill="none" stroke="#1a0e08" strokeWidth={30 * cam.scale(CH.z1, 450, -250)} />
      </g>,
    );
    el.push(halo(cam, [450, -250, CH.z1 + 0.3], 1500, '#ffb060', 0.35 * lumiere, 'chx-h'));
    // la lumière de la fenêtre sur la neige
    const sl = cam.poly([[FEN.x0 - 150, SOL - 2, CH.z1 + 0.1], [FEN.x1 + 150, SOL - 2, CH.z1 + 0.1], [FEN.x1 + 600, SOL - 2, CH.z1 + 1.6], [FEN.x0 - 600, SOL - 2, CH.z1 + 1.6]]);
    if (sl) el.push(<polygon key="sl" points={sl} fill="#ffb060" opacity={0.18 * lumiere} />);
  }
  // porte
  const pp = cam.poly([[PORTE.x0, PORTE.y0, CH.z1 + 0.07], [PORTE.x1, PORTE.y0, CH.z1 + 0.07], [PORTE.x1, SOL, CH.z1 + 0.07], [PORTE.x0, SOL, CH.z1 + 0.07]]);
  if (pp) el.push(<polygon key="px" points={pp} fill={porte > 0 ? '#ffb060' : '#24170f'} stroke="#100804" strokeWidth="4" />);
  // cheminée qui fume
  const ch = cam.poly([[-900, -1500, 1.1], [-700, -1500, 1.1], [-700, -900, 1.1], [-900, -900, 1.1]]);
  if (ch) el.push(<polygon key="chm" points={ch} fill="#3a3632" />);
  return {z: CH.z1 + 0.04, x: 0, el: <g key="chx">{el}</g>};
};
