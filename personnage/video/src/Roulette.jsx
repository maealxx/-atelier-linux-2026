import {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Easing, interpolate, random, spring, staticFile, useCurrentFrame} from 'remotion';
import {clamp, Finition, makeCam, Perso} from './moteur';
import CONF from './roulette/tirages.json';

// ===================== « Choisis une couleur » : la roulette du casino en 3D =====================
// Vue fixe (POV assis à la table), toutes les 5 s un tirage. La vidéo commence roulette lancée : 3 s pour choisir.
// Monde : table (tapis) en Y = 0, roulette centrée en (0, 0, Z 5), rayon extérieur 1120 unités.
const {cycle: CYCLE, arrivee: TL, outro: OUTRO, depart: DEPART, tirages: TIRAGES} = CONF;
const N = TIRAGES.length;
export const DUREE_ROULETTE = N * CYCLE + OUTRO;

const ORDRE = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const ROUGES = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const couleurDe = (n) => (n === 0 ? 'vert' : ROUGES.has(n) ? 'rouge' : 'noir');
const TEINTE = {rouge: '#c0141e', noir: '#141416', vert: '#0e8a3a'};
const TEINTE_FOND = {rouge: '#7a0a10', noir: '#060607', vert: '#065a24'};
const SECT = (2 * Math.PI) / 37;
const phi = (n) => ORDRE.indexOf(n) * SECT; // centre de la case dans le repère de la roue
const C = {x: 0, z: 5};
const OMEGA = 1.5 / 30; // rotation de la roue (rad / image)
const TOURS = 5; // tours de la bille avant de tomber
// angle (monde) où la bille s'arrête à chaque tirage : toujours vers l'avant, côté caméra
const CIBLE = [0.2, -0.25, 0.12, -0.15, 0.22, -0.05].map((v) => -Math.PI / 2 + v);
const ZOOM = [0.62, 0.5, 0.66, 0.78, 0.55, 0.7];

const wrap = (a) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));
const mod2pi = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
// décalage de la roue pour que chaque bille s'arrête pile devant la caméra
const DELTAS = [];
TIRAGES.forEach((k, n) => {
  const brut = CIBLE[n] - phi(k) - OMEGA * (n * CYCLE + TL);
  const avant = n ? DELTAS[n - 1] : 0;
  DELTAS.push(avant + wrap(brut - avant));
});
const etat = (f) => {
  const n = Math.min(N, Math.floor(f / CYCLE));
  const s = f - n * CYCLE;
  return {n, s, tourne: n < N && s < TL};
};
const angleRoue = (f) => {
  const {n, s} = etat(f);
  const avant = n ? DELTAS[Math.min(n, N) - 1] : 0;
  const delta = n < N && s < TL ? avant + (DELTAS[n] - avant) * Easing.inOut(Easing.sin)(s / TL) : DELTAS[Math.min(n, N - 1)];
  return OMEGA * f + delta;
};

// profil de la cuvette : hauteur (Y, + = vers le bas) selon le rayon
const yAt = (r) => {
  if (r < 120) return -190;
  if (r < 520) return -190 + ((r - 120) / 400) * 230;
  if (r < 700) return 60;
  if (r < 820) return 20;
  if (r < 950) return 10 - ((r - 820) / 130) * 50;
  return -70;
};

// la bille : rayon, angle dans le repère de la roue, rebond
const bille = (f) => {
  const {n, s, tourne} = etat(f);
  const k = TIRAGES[Math.min(n, N - 1)];
  if (!tourne) {
    const dl = n < N ? s - TL : CYCLE - TL + s;
    return {r: 612, a: phi(n < N ? k : TIRAGES[N - 1]) + 0.04 * Math.sin(dl / 2.5) * Math.exp(-dl / 10), hop: 0, roule: 0};
  }
  const prev = n ? TIRAGES[n - 1] : DEPART;
  const tau = s / TL;
  const B = mod2pi(phi(prev) - phi(k)) + 2 * Math.PI * TOURS;
  const a = phi(k) + B * Math.pow(1 - tau, 2.3);
  let r;
  let hop = 0;
  if (s < 8 && n > 0) r = 612 + (905 - 612) * Easing.out(Easing.quad)(s / 8);
  else if (tau < 0.66) r = 905 + 6 * Math.sin(s * 0.9);
  else if (tau < 0.86) {
    const u = (tau - 0.66) / 0.2;
    r = 905 - 150 * u;
    hop = 55 * Math.abs(Math.sin(u * Math.PI * 3)) * (1 - u * 0.5);
  } else {
    const u = (tau - 0.86) / 0.14;
    r = 755 - 143 * u;
    hop = 40 * Math.abs(Math.sin(u * Math.PI * 4)) * (1 - u);
  }
  return {r, a, hop, roule: 1 - tau};
};

// ----- la caméra : POV fixe, qui zoome sur la case au moment du résultat -----
const BASE = {pos: [0, -1300, 3.15], cible: [0, 0, 5.55]};
const regarde = (pos, cible, f) => {
  const dx = cible[0] - pos[0];
  const dy = cible[1] - pos[1];
  const dz = (cible[2] - pos[2]) * 1000;
  return {
    x: pos[0] + Math.sin(f / 37) * 18,
    y: pos[1] + Math.sin(f / 29) * 12,
    z: pos[2],
    yaw: (Math.atan2(dx, dz) * 180) / Math.PI + Math.sin(f / 45) * 0.4,
    pitch: (Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI,
  };
};
const camera = (f) => {
  const {n, s} = etat(f);
  const m = Math.min(n, N - 1);
  // zoom : vers la case gagnante, de l'arrivée jusqu'à la relance
  let z = 0;
  if (n < N) z = interpolate(s, [TL - 26, TL + 12, CYCLE - 22, CYCLE], [0, 1, 1, 0], {...clamp, easing: Easing.inOut(Easing.cubic)}) * ZOOM[n];
  else z = interpolate(s, [0, 30], [0, 0.35], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const aL = CIBLE[m];
  const P = [C.x + 612 * Math.cos(aL), 30, C.z + (612 * Math.sin(aL)) / 1000];
  const posZ = [P[0] * 0.6, P[1] - 800, P[2] - 0.8];
  const lerp = (a, b) => a.map((v, i) => v + (b[i] - v) * z);
  return makeCam(regarde(lerp(BASE.pos, posZ), lerp(BASE.cible, P), f));
};

// ----- dessin de la roue -----
// RoueDessin est réutilisable : centre (cx, cz), hauteur du plateau y0, échelle ech, angle de la roue th,
// bille {r, a, hop} (rayon et angle dans le repère de la roue), allume(n) → 0..1 fait briller une case.
export {ORDRE, ROUGES, SECT, phi, yAt};
export const RoueDessin = ({cam, th, b, cx = C.x, cz = C.z, y0 = 0, ech = 1, allume = null}) => {
  const pt = (r, a, y) => [cx + r * ech * Math.cos(a), y0 + y * ech, cz + (r * ech * Math.sin(a)) / 1000];
  const L = []; // {d, el}
  const quad = (pts, fill, key, extra = {}) => {
    const p = cam.poly(pts);
    if (!p) return;
    const c = pts.reduce((a, q) => [a[0] + q[0] / pts.length, a[1] + q[1] / pts.length, a[2] + q[2] / pts.length], [0, 0, 0]);
    L.push({d: cam.profondeur(c[2], c[0], c[1]) + (extra.biais || 0), el: <polygon key={key} points={p} fill={fill} stroke={extra.trait || 'none'} strokeWidth={extra.lw || 0} />});
  };
  // cuvette fixe en bois : pente extérieure, rebord, piste de la bille
  const NS = 74;
  for (let k = 0; k < NS; k++) {
    const a0 = (k / NS) * 2 * Math.PI;
    const a1 = ((k + 1) / NS) * 2 * Math.PI;
    const lum = 0.75 + 0.25 * Math.cos(a0 + 0.8);
    const bois = `rgb(${Math.round(92 * lum)},${Math.round(50 * lum)},${Math.round(26 * lum)})`;
    const bois2 = `rgb(${Math.round(120 * lum)},${Math.round(70 * lum)},${Math.round(36 * lum)})`;
    quad([pt(1050, a0, -70), pt(1050, a1, -70), pt(1130, a1, 0), pt(1130, a0, 0)], bois, `pe${k}`, {biais: 0.02});
    quad([pt(950, a0, -70), pt(950, a1, -70), pt(1050, a1, -70), pt(1050, a0, -70)], bois2, `re${k}`, {biais: 0.02});
    quad([pt(950, a0, -70), pt(950, a1, -70), pt(950, a1, -40), pt(950, a0, -40)], '#2a1608', `mi${k}`, {biais: 0.02});
    quad([pt(820, a0, 10), pt(820, a1, 10), pt(950, a1, -40), pt(950, a0, -40)], k % 2 ? '#3a2412' : '#33200f', `pi${k}`, {biais: 0.03});
  }
  // les déflecteurs dorés sur la piste
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * 2 * Math.PI + 0.2;
    quad([pt(860, a - 0.04, -12), pt(860, a + 0.04, -12), pt(900, a + 0.02, -28), pt(900, a - 0.02, -28)], '#d8b45a', `df${k}`, {biais: -0.01});
  }
  // partie tournante : cases, numéros, séparations, cône central
  ORDRE.forEach((num, k) => {
    const a0 = th + (k - 0.5) * SECT;
    const a1 = th + (k + 0.5) * SECT;
    const col = couleurDe(num);
    const lu = allume ? allume(num) : 0;
    quad([pt(700, a0, 20), pt(700, a1, 20), pt(820, a1, 20), pt(820, a0, 20)], lu > 0 ? mele(TEINTE[col], '#ffe27a', lu * 0.55) : TEINTE[col], `nb${k}`, {biais: 0.01});
    quad([pt(520, a0, 60), pt(520, a1, 60), pt(700, a1, 60), pt(700, a0, 60)], lu > 0 ? mele(TEINTE_FOND[col], '#ff5a4a', lu * 0.6) : TEINTE_FOND[col], `ca${k}`, {biais: 0.015});
    quad([pt(700, a0, 20), pt(700, a1, 20), pt(700, a1, 60), pt(700, a0, 60)], '#2a2a2e', `bo${k}`, {biais: 0.012});
    // séparation métallique (petit mur)
    quad([pt(520, a0, 60), pt(700, a0, 60), pt(700, a0, 30), pt(520, a0, 30)], '#9aa0aa', `se${k}`, {trait: '#6a6e76', lw: 1});
    quad([pt(520, a0 - 0.004, 30), pt(700, a0 - 0.004, 30), pt(700, a0 + 0.004, 30), pt(520, a0 + 0.004, 30)], '#e8ecf2', `st${k}`);
    // cône central (bois clair) découpé en quartiers
    const lum = 0.7 + 0.3 * Math.cos(a0 - th * 0 + 0.8);
    quad([pt(520, a0, 40), pt(520, a1, 40), pt(120, a1, -190), pt(120, a0, -190)], `rgb(${Math.round(150 * lum)},${Math.round(92 * lum)},${Math.round(44 * lum)})`, `co${k}`, {biais: 0.04});
  });
  // anneau doré + dôme du centre
  for (let k = 0; k < 24; k++) {
    const a0 = (k / 24) * 2 * Math.PI;
    const a1 = ((k + 1) / 24) * 2 * Math.PI;
    quad([pt(120, a0, -190), pt(120, a1, -190), pt(60, a1, -230), pt(60, a0, -230)], k % 2 ? '#e0c068' : '#c8a44a', `dm${k}`, {biais: 0.05});
  }
  // la croix chromée qui tourne
  const croix = [0, 1, 2, 3].map((k) => {
    const a = th * 1 + (k * Math.PI) / 2 + 0.3;
    const A = pt(0, a, -330);
    const B = pt(380, a, -270);
    const sa = cam.seg(A, B);
    if (!sa) return null;
    const pb = cam.proj(...B);
    const s = cam.scale(B[2], B[0], B[1]);
    return (
      <g key={`cr${k}`}>
        <line x1={sa[0][0]} y1={sa[0][1]} x2={sa[1][0]} y2={sa[1][1]} stroke="#d8dce4" strokeWidth={Math.max(2, 26 * s * ech)} strokeLinecap="round" />
        <circle cx={pb[0]} cy={pb[1]} r={Math.max(2, 34 * s * ech)} fill="#e8ecf2" />
        <circle cx={pb[0] - 8 * s * ech} cy={pb[1] - 10 * s * ech} r={Math.max(1, 12 * s * ech)} fill="#fff" />
      </g>
    );
  });
  const axe = cam.seg(pt(0, 0, -230), pt(0, 0, -400));
  const sommet = cam.proj(...pt(0, 0, -420));
  const sAxe = cam.scale(cz, cx, y0 - 400 * ech) * ech;
  // la bille
  const aw = th + b.a;
  const yb = yAt(b.r) - 27 - b.hop;
  const pb = pt(b.r, aw, yb);
  const qb = cam.proj(...pb);
  const sb = cam.scale(pb[2], pb[0], pb[1]) * ech;
  const qo = cam.proj(...pt(b.r, aw, yAt(b.r) - 2));
  L.push({
    d: cam.profondeur(pb[2], pb[0], pb[1]) - 0.01,
    el: (
      <g key="bille">
        <ellipse cx={qo[0]} cy={qo[1]} rx={32 * sb} ry={14 * sb} fill="#000" opacity={0.45} />
        <circle cx={qb[0]} cy={qb[1]} r={30 * sb} fill="url(#ro-bille)" />
        <circle cx={qb[0] - 8 * sb} cy={qb[1] - 9 * sb} r={8 * sb} fill="#fff" opacity="0.9" />
      </g>
    ),
  });
  // les numéros, plaqués sur l'anneau (lisibles depuis l'extérieur)
  const numeros = ORDRE.map((num, k) => {
    const a = th + k * SECT;
    const tx = [-Math.sin(a), 0, Math.cos(a)];
    const ny = [Math.cos(a), 0, Math.sin(a)];
    const w = 100 * ech;
    const h = 100 * ech;
    const c = pt(760, a, 19);
    const P0 = [c[0] - (tx[0] * w) / 2 - (ny[0] * h) / 2, c[1], c[2] - (tx[2] * w) / 2000 - (ny[2] * h) / 2000];
    const corners = [P0, [P0[0] + tx[0] * w, c[1], P0[2] + (tx[2] * w) / 1000], [P0[0] + ny[0] * h, c[1], P0[2] + (ny[2] * h) / 1000]];
    if (!corners.every((q) => cam.visible(q[2], q[0], q[1]))) return null;
    const o = cam.proj(...corners[0]);
    const u = cam.proj(...corners[1]);
    const v = cam.proj(...corners[2]);
    const mtx = [(u[0] - o[0]) / 100, (u[1] - o[1]) / 100, (v[0] - o[0]) / 100, (v[1] - o[1]) / 100, o[0], o[1]];
    L.push({
      d: cam.profondeur(c[2], c[0], c[1]) + 0.004,
      el: (
        <g key={`n${k}`} transform={`matrix(${mtx.join(' ')})`}>
          <text x="50" y="72" fontSize="62" textAnchor="middle" fill="#f4f0e4" fontWeight="900" fontFamily="'DejaVu Sans', Arial">
            {num}
          </text>
        </g>
      ),
    });
    return null;
  });
  L.sort((p, q) => q.d - p.d);
  return (
    <g>
      {numeros}
      {L.map((p) => p.el)}
      {axe && <line x1={axe[0][0]} y1={axe[0][1]} x2={axe[1][0]} y2={axe[1][1]} stroke="#c8ccd4" strokeWidth={Math.max(2, 40 * sAxe)} />}
      {croix}
      <circle cx={sommet[0]} cy={sommet[1]} r={Math.max(3, 44 * sAxe)} fill="#e8ecf2" />
      <circle cx={sommet[0] - 10 * sAxe} cy={sommet[1] - 12 * sAxe} r={Math.max(2, 14 * sAxe)} fill="#fff" />
    </g>
  );
};

const Roue = ({cam, f}) => <RoueDessin cam={cam} th={angleRoue(f)} b={bille(f)} />;
const mele = (a, b, k) => {
  const h = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [p, q] = [h(a), h(b)];
  return `rgb(${p.map((v, i) => Math.round(v + (q[i] - v) * k)).join(',')})`;
};

// ----- la table, le tapis de mise, les jetons, le croupier, la salle -----
const Jetons = ({cam, x, z, n, coul, key_}) => {
  const els = [];
  for (let k = 0; k < n; k++) {
    const y = -k * 22;
    const cercle = (yy) => cam.poly([...Array(18)].map((_, i) => [x + Math.cos((i / 18) * 6.283) * 95, yy, z + (Math.sin((i / 18) * 6.283) * 95) / 1000]));
    els.push(<polygon key={`b${k}`} points={cercle(y)} fill={k % 2 ? coul : '#f0ece0'} />);
    els.push(<polygon key={`t${k}`} points={cercle(y - 20)} fill={coul} stroke="#f0ece0" strokeWidth="3" strokeDasharray="10 14" />);
  }
  return <g key={key_}>{els}</g>;
};
const Salle = ({cam, f}) => {
  const bokeh = [...Array(46)].map((_, k) => {
    const x = (random(`bx${k}`) - 0.5) * 30000;
    const y = -500 - random(`by${k}`) * 9000;
    const z = 16 + random(`bz${k}`) * 20;
    if (!cam.visible(z, x, y)) return null;
    const p = cam.proj(x, y, z);
    const r = (300 + random(`br${k}`) * 600) * cam.scale(z, x, y);
    const c = ['#ffc860', '#ff6a3a', '#ffe0a0', '#c83a5a', '#6ab8ff'][k % 5];
    return <circle key={k} cx={p[0]} cy={p[1]} r={r} fill={c} opacity={(0.18 + 0.15 * random(`bo${k}`)) * (0.8 + 0.2 * Math.sin(f / 9 + k))} filter="url(#ro-flou)" />;
  });
  // machines à sous au fond (écrans qui clignotent)
  const machines = [...Array(9)].map((_, k) => {
    const x = -8000 + k * 2000;
    const z = 22;
    const pts = cam.poly([[x - 600, -2600, z], [x + 600, -2600, z], [x + 600, 1500, z], [x - 600, 1500, z]]);
    const ecran = cam.poly([[x - 450, -2300, z - 0.01], [x + 450, -2300, z - 0.01], [x + 450, -1300, z - 0.01], [x - 450, -1300, z - 0.01]]);
    const c = ['#ff3a7a', '#3ac8ff', '#ffd23a'][(k + Math.floor(f / 10)) % 3];
    return (
      <g key={`m${k}`}>
        {pts && <polygon points={pts} fill="#1a0e10" />}
        {ecran && <polygon points={ecran} fill={c} opacity={0.55 + 0.3 * random(`me${k}${Math.floor(f / 6)}`)} filter="url(#ro-flou)" />}
      </g>
    );
  });
  return (
    <g>
      <rect width="1080" height="1920" fill="url(#ro-salle)" />
      {machines}
      {bokeh}
      {/* lustre au plafond */}
      {cam.visible(14, 0, -7000) && <circle cx={cam.proj(0, -7000, 14)[0]} cy={cam.proj(0, -7000, 14)[1]} r={2600 * cam.scale(14, 0, -7000)} fill="url(#ro-lustre)" />}
    </g>
  );
};
const Table = ({cam, f}) => {
  const {poly} = cam;
  const tapis = poly([[-2600, 0, 1.6], [2600, 0, 1.6], [2600, 0, 8.4], [-2600, 0, 8.4]]);
  const rebordFond = poly([[-2700, -90, 8.4], [2700, -90, 8.4], [2700, -90, 8.8], [-2700, -90, 8.8]]);
  const rebordFace = poly([[-2700, -90, 8.4], [2700, -90, 8.4], [2700, 0, 8.4], [-2700, 0, 8.4]]);
  const cotes = [-1, 1].map((sg) => (
    <g key={sg}>
      <polygon points={poly([[sg * 2600, -90, 1.6], [sg * 2600, -90, 8.8], [sg * 2900, -90, 8.8], [sg * 2900, -90, 1.6]])} fill="#5a2e14" />
      <polygon points={poly([[sg * 2600, -90, 1.6], [sg * 2600, -90, 8.4], [sg * 2600, 0, 8.4], [sg * 2600, 0, 1.6]])} fill="#3a1e0c" />
    </g>
  ));
  // le tapis de mise (côté caméra)
  const Tableau = () => (
    <g>
      <rect width="2600" height="900" fill="none" stroke="#e8d8a0" strokeWidth="8" />
      <rect x="0" y="0" width="200" height="900" fill={TEINTE.vert} stroke="#e8d8a0" strokeWidth="6" />
      <text x="100" y="500" fontSize="110" textAnchor="middle" fill="#f4f0e4" fontWeight="900" fontFamily="'DejaVu Sans', Arial">0</text>
      {[...Array(36)].map((_, i) => {
        const num = i + 1;
        const col = Math.floor(i / 3);
        const row = 2 - (i % 3);
        const x = 200 + col * 183;
        const y = row * 300;
        return (
          <g key={num}>
            <rect x={x} y={y} width="183" height="300" fill="none" stroke="#e8d8a0" strokeWidth="5" />
            <ellipse cx={x + 92} cy={y + 150} rx="70" ry="95" fill={TEINTE[couleurDe(num)]} />
            <text x={x + 92} y={y + 185} fontSize="90" textAnchor="middle" fill="#f4f0e4" fontWeight="900" fontFamily="'DejaVu Sans', Arial">{num}</text>
          </g>
        );
      })}
    </g>
  );
  const P0 = [-1300, 0, 3.75];
  const coins = [P0, [1300, 0, 3.75], [-1300, 0, 2.85]];
  let tableau = null;
  if (coins.every((q) => cam.visible(q[2], q[0], q[1]))) {
    const o = cam.proj(...coins[0]);
    const u = cam.proj(...coins[1]);
    const v = cam.proj(...coins[2]);
    tableau = (
      <g transform={`matrix(${(u[0] - o[0]) / 2600} ${(u[1] - o[1]) / 2600} ${(v[0] - o[0]) / 900} ${(v[1] - o[1]) / 900} ${o[0]} ${o[1]})`} opacity="0.7">
        <Tableau />
      </g>
    );
  }
  return (
    <g>
      {tapis && <polygon points={tapis} fill="url(#ro-tapis)" />}
      {cotes}
      {rebordFace && <polygon points={rebordFace} fill="#3a1e0c" />}
      {rebordFond && <polygon points={rebordFond} fill="#6a3618" />}
      {tableau}
      {/* lumière de la lampe au-dessus de la table */}
      {cam.visible(5, 0, 0) && <ellipse cx={cam.proj(0, 0, 5)[0]} cy={cam.proj(0, 0, 5)[1]} rx={1900 * cam.scale(5, 0, 0)} ry={1100 * cam.scale(5, 0, 0)} fill="url(#ro-lampe)" />}
    </g>
  );
};

// ----- interface : titre, chrono, résultat, historique, sous-titres -----
const MONT = "'MontB', 'DejaVu Sans', sans-serif";
const PHRASES = [
  ['CHOISIS UNE', 'COULEUR', '👇'],
  ['ROUGE OU NOIR ?', 'VITE', '⏱️'],
  ['PRENDS UN', 'NUMÉRO', '🤔'],
  ["ET SI C'ÉTAIT LE", 'VERT', '😳'],
  ["T'AS", '3 SECONDES', '🔥'],
  ['DERNIER', 'TIRAGE', '🎰'],
];
const NOMS = {rouge: 'ROUGE', noir: 'NOIR', vert: 'VERT'};
const PASTILLE = {rouge: '#e0202c', noir: '#1a1a1e', vert: '#14a84a'};
const Interface = ({f}) => {
  const {n, s, tourne} = etat(f);
  const reste = (TL - s) / 30;
  const sec = Math.max(1, Math.ceil(reste));
  const frac = reste - Math.floor(reste);
  const pulse = tourne ? 1 + 0.18 * Math.max(0, (frac - 0.7) / 0.3) : 1;
  const resultat = n < N && !tourne ? TIRAGES[n] : null;
  const pR = resultat !== null ? spring({frame: s - TL, fps: 30, config: {damping: 9}}) : 0;
  const histo = TIRAGES.slice(0, n + (tourne || n >= N ? 0 : 1)).slice(-6);
  const phrase = PHRASES[Math.min(n, N - 1)];
  const pP = spring({frame: s, fps: 30, config: {damping: 10}});
  const urgent = sec === 1 && tourne;
  return (
    <AbsoluteFill style={{fontFamily: MONT, color: '#fff'}}>
      {/* titre */}
      <div style={{position: 'absolute', top: 110, width: '100%', textAlign: 'center'}}>
        <div style={{fontSize: 74, letterSpacing: 2, textShadow: '0 6px 0 #000, 0 0 30px rgba(0,0,0,0.8)', WebkitTextStroke: '3px #000'}}>CHOISIS UNE COULEUR</div>
        <div style={{display: 'flex', justifyContent: 'center', gap: 34, marginTop: 22}}>
          {['rouge', 'noir', 'vert'].map((c) => (
            <div key={c} style={{display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(0,0,0,0.55)', padding: '10px 22px', borderRadius: 40, border: `4px solid ${resultat !== null && couleurDe(resultat) === c ? '#ffd23e' : 'rgba(255,255,255,0.25)'}`, transform: `scale(${resultat !== null && couleurDe(resultat) === c ? 1 + 0.15 * pR : 1})`}}>
              <div style={{width: 44, height: 44, borderRadius: 22, background: PASTILLE[c], border: '3px solid #fff'}} />
              <div style={{fontSize: 38}}>{NOMS[c]}</div>
            </div>
          ))}
        </div>
      </div>
      {/* chrono */}
      {tourne && (
        <div style={{position: 'absolute', top: 330, width: '100%', display: 'flex', justifyContent: 'center'}}>
          <svg width="230" height="230" viewBox="0 0 230 230" style={{transform: `scale(${pulse})`}}>
            <circle cx="115" cy="115" r="100" fill="rgba(0,0,0,0.65)" stroke="rgba(255,255,255,0.2)" strokeWidth="14" />
            <circle cx="115" cy="115" r="100" fill="none" stroke={urgent ? '#ff2a3a' : '#ffd23e'} strokeWidth="14" strokeDasharray={`${(reste / 3) * 628} 628`} transform="rotate(-90 115 115)" strokeLinecap="round" />
            <text x="115" y="150" fontSize="110" textAnchor="middle" fill={urgent ? '#ff3a4a' : '#fff'} fontFamily={MONT}>
              {sec}
            </text>
          </svg>
        </div>
      )}
      {tourne && s > TL - 32 && (
        <div style={{position: 'absolute', top: 580, width: '100%', textAlign: 'center', fontSize: 42, color: '#ffd23e', WebkitTextStroke: '2px #000', opacity: interpolate(s, [TL - 32, TL - 26], [0, 1], clamp)}}>RIEN NE VA PLUS</div>
      )}
      {/* résultat */}
      {resultat !== null && (
        <div style={{position: 'absolute', top: 340, width: '100%', display: 'flex', justifyContent: 'center'}}>
          <div style={{transform: `scale(${pR}) rotate(${(1 - pR) * -10}deg)`, display: 'flex', alignItems: 'center', gap: 26, background: PASTILLE[couleurDe(resultat)], padding: '24px 54px', borderRadius: 70, border: '8px solid #ffd23e', boxShadow: '0 12px 40px rgba(0,0,0,0.7)'}}>
            <div style={{fontSize: 120, lineHeight: 1}}>{resultat}</div>
            <div style={{fontSize: 80}}>{NOMS[couleurDe(resultat)]}</div>
          </div>
        </div>
      )}
      {/* historique des tirages (comme le panneau du casino) */}
      <div style={{position: 'absolute', right: 26, top: 640, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', background: 'rgba(0,0,0,0.55)', padding: '16px 12px', borderRadius: 20, border: '3px solid rgba(255,215,90,0.5)'}}>
        <div style={{fontSize: 24, color: '#ffd23e'}}>TIRAGES</div>
        {histo.map((v, k) => (
          <div key={k} style={{width: 74, height: 74, borderRadius: 37, background: PASTILLE[couleurDe(v)], border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34}}>
            {v}
          </div>
        ))}
      </div>
      {/* sous-titre */}
      {n < N && (
        <div style={{position: 'absolute', top: 1380, width: '100%', textAlign: 'center', transform: `scale(${tourne ? pP : 1})`}}>
          {tourne ? (
            <div style={{fontSize: 82, lineHeight: 1.15, WebkitTextStroke: '4px #000', paintOrder: 'stroke fill', textShadow: '0 6px 0 #000'}}>
              <div>{phrase[0]}</div>
              <div>
                <span style={{color: '#ff3a3a'}}>{phrase[1]}</span> {phrase[2]}
              </div>
            </div>
          ) : (
            <div style={{fontSize: 76, lineHeight: 1.15, WebkitTextStroke: '4px #000', paintOrder: 'stroke fill', textShadow: '0 6px 0 #000', transform: `scale(${pR})`}}>
              <div>
                C'EST <span style={{color: couleurDe(resultat) === 'noir' ? '#cfd4dc' : PASTILLE[couleurDe(resultat)]}}>{NOMS[couleurDe(resultat)]}</span> !
              </div>
              <div>T'AVAIS BON ? {couleurDe(resultat) === 'vert' ? '🤯' : '✅'}</div>
            </div>
          )}
        </div>
      )}
      {/* fin */}
      {n >= N && (
        <div style={{position: 'absolute', top: 1240, width: '100%', textAlign: 'center'}}>
          <div style={{fontSize: 84, lineHeight: 1.15, WebkitTextStroke: '4px #000', paintOrder: 'stroke fill', textShadow: '0 6px 0 #000', transform: `scale(${spring({frame: s, fps: 30, config: {damping: 10}})})`}}>
            <div>COMBIEN T'EN AS EU</div>
            <div>
              SUR <span style={{color: '#ffd23e'}}>6</span> ? 🎰
            </div>
          </div>
          {s > 25 && (
            <div style={{display: 'inline-flex', alignItems: 'center', gap: 18, marginTop: 50, background: '#fff', color: '#111', padding: '22px 48px', borderRadius: 70, fontSize: 50, transform: `scale(${spring({frame: s - 25, fps: 30, config: {damping: 10}})})`}}>
              💬 DIS-LE EN COMMENTAIRE
            </div>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
};

// Police Montserrat Black (comme les sous-titres des autres vidéos)
const usePolice = () => {
  const [h] = useState(() => delayRender('police'));
  useEffect(() => {
    const ff = new FontFace('MontB', `url(${staticFile('fonts/Montserrat-Black.ttf')})`);
    ff.load()
      .then((x) => {
        document.fonts.add(x);
        continueRender(h);
      })
      .catch(() => continueRender(h));
  }, [h]);
};

export const Roulette = () => {
  const f = useCurrentFrame();
  usePolice();
  const cam = camera(f);
  const croupier = cam.visible(9.1, 0, -300) ? cam.proj(0, -90, 8.4) : null;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <defs>
          <linearGradient id="ro-salle" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0c0406" />
            <stop offset="0.5" stopColor="#2a0c10" />
            <stop offset="1" stopColor="#140608" />
          </linearGradient>
          <radialGradient id="ro-lustre">
            <stop offset="0" stopColor="#ffe0a0" stopOpacity="0.5" />
            <stop offset="1" stopColor="#ffe0a0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ro-tapis" cx="50%" cy="45%" r="60%">
            <stop offset="0" stopColor="#1e8a4a" />
            <stop offset="0.6" stopColor="#0e5a2c" />
            <stop offset="1" stopColor="#06321a" />
          </radialGradient>
          <radialGradient id="ro-lampe">
            <stop offset="0" stopColor="#fff2c8" stopOpacity="0.3" />
            <stop offset="1" stopColor="#fff2c8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ro-bille" cx="35%" cy="30%" r="70%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.6" stopColor="#d8dce4" />
            <stop offset="1" stopColor="#8a8e96" />
          </radialGradient>
          <filter id="ro-flou">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>
        <Salle cam={cam} f={f} />
        {/* le croupier derrière la table (coupé par le rebord) */}
        {croupier && (
          <g>
            <defs>
              <clipPath id="ro-crc">
                <rect x="0" y="0" width="1080" height={croupier[1]} />
              </clipPath>
            </defs>
            <g clipPath="url(#ro-crc)">
              <Perso cam={cam} id="cr" x={0} y={600} z={9.3} lum={0.7} teinte={[1.05, 0.9, 0.8]} couleurs={{haut: '#18181c', hautO: '#0e0e12', pant: '#0a0a0c'}} smile={0.2} pupilY={6} ombre={0} />
            </g>
          </g>
        )}
        <Table cam={cam} f={f} />
        <Jetons cam={cam} x={-950} z={3.15} n={7} coul="#c0141e" key_="j1" />
        <Jetons cam={cam} x={-720} z={3.0} n={4} coul="#1a4ac8" key_="j2" />
        <Jetons cam={cam} x={900} z={3.2} n={9} coul="#141416" key_="j3" />
        <Roue cam={cam} f={f} />
        <Finition f={f} vignette={0.85} />
      </svg>
      <Interface f={f} />
    </AbsoluteFill>
  );
};
