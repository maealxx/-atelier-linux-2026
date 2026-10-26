import {random} from 'remotion';
import {DefsGare, boiteG, halo, ligne, lw, quad, tache} from './Gare';
import {plaque} from './Lycee';
import {SOL} from './Rue';

// ===================== La forêt de nuit (« La tente ») =====================
// Clairière centrée en (0, Z 8). Sol à SOL (432). Tente en A (arête selon Z) : X ±650 au sol, arête à Y TENTE.haut,
// porte (avant) en Z TENTE.z0, fond en Z TENTE.z1. Feu de camp en FEU, devant la tente.
// Lumières : la lune (froide, de la droite), le feu (orange, vacille, s'éteint), la lanterne dans la tente,
// une lampe torche au loin. Les ombres portées partent à l'opposé de la source (persos, arbres).
export const TENTE = {x: 650, haut: -520, z0: 8.0, z1: 9.25};
export const FEU = {x: 0, z: 6.2};
export const LUNE = [26000, -34000, 90];

export const DefsForet = ({cam, id = 'fo'}) => (
  <defs>
    <linearGradient id={`${id}-ciel`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#040814" />
      <stop offset="0.55" stopColor="#0c1834" />
      <stop offset="1" stopColor="#1a2a4a" />
    </linearGradient>
    <radialGradient id={`${id}-lune`}>
      <stop offset="0" stopColor="#f4f8ff" stopOpacity="1" />
      <stop offset="0.12" stopColor="#dce8ff" stopOpacity="0.6" />
      <stop offset="0.4" stopColor="#8aa8e8" stopOpacity="0.15" />
      <stop offset="1" stopColor="#4a68a8" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-feu`}>
      <stop offset="0" stopColor="#fff0b0" stopOpacity="0.95" />
      <stop offset="0.15" stopColor="#ffb040" stopOpacity="0.6" />
      <stop offset="0.5" stopColor="#ff6a10" stopOpacity="0.18" />
      <stop offset="1" stopColor="#ff4a00" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-solfeu`}>
      <stop offset="0" stopColor="#ffb050" stopOpacity="0.75" />
      <stop offset="0.45" stopColor="#ff7a20" stopOpacity="0.28" />
      <stop offset="1" stopColor="#ff5a00" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-braise`}>
      <stop offset="0" stopColor="#ff6a2a" stopOpacity="0.9" />
      <stop offset="0.4" stopColor="#c81a0a" stopOpacity="0.35" />
      <stop offset="1" stopColor="#800000" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-brume`}>
      <stop offset="0" stopColor="#9ab0d8" stopOpacity="0.32" />
      <stop offset="0.6" stopColor="#6a80b0" stopOpacity="0.1" />
      <stop offset="1" stopColor="#4a6090" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-fumee`}>
      <stop offset="0" stopColor="#8a8e98" stopOpacity="0.5" />
      <stop offset="0.6" stopColor="#6a6e78" stopOpacity="0.18" />
      <stop offset="1" stopColor="#4a4e58" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-luciole`}>
      <stop offset="0" stopColor="#fbffb0" stopOpacity="1" />
      <stop offset="0.3" stopColor="#d8ff5a" stopOpacity="0.45" />
      <stop offset="1" stopColor="#a8ff2a" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-lanterne`}>
      <stop offset="0" stopColor="#fff6dc" stopOpacity="0.95" />
      <stop offset="0.25" stopColor="#ffd890" stopOpacity="0.4" />
      <stop offset="1" stopColor="#ffb860" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-torche`}>
      <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
      <stop offset="0.2" stopColor="#fff4d0" stopOpacity="0.5" />
      <stop offset="1" stopColor="#ffe8b0" stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${id}-ombre`}>
      <stop offset="0" stopColor="#000000" stopOpacity="0.7" />
      <stop offset="0.6" stopColor="#000000" stopOpacity="0.35" />
      <stop offset="1" stopColor="#000000" stopOpacity="0" />
    </radialGradient>
    <filter id={`${id}-flou`} x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="10" />
    </filter>
    <radialGradient id={`${id}-voile`} cx={cam.fuite[0]} cy={cam.fuite[1]} r="1100" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="#1a2a4a" stopOpacity="0.45" />
      <stop offset="0.6" stopColor="#0a1428" stopOpacity="0.15" />
      <stop offset="1" stopColor="#0a1428" stopOpacity="0" />
    </radialGradient>
  </defs>
);

// lumière du feu qui vacille (0 → 1), à multiplier par l'intensité du feu
export const vacille = (f) => 0.82 + 0.1 * Math.sin(f / 2.3) + 0.08 * Math.sin(f / 0.9 + 1) * random(`va${Math.floor(f / 2)}`);
const rgb = (c, k) => `rgb(${c.map((v) => Math.round(Math.min(255, Math.max(0, v * k)))).join(',')})`;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// ----- un sapin (billboard) : couches de branches, bord éclairé par la lune côté droit, lueur du feu en bas -----
const SAPIN = (k, feu = 0) => {
  const fonce = ['#0c1a14', '#0e1e16', '#0a1610'][k % 3];
  const lune = ['#1e3a3a', '#24403e', '#1a3434'][k % 3];
  return (
    <g>
      <rect x="-45" y="-700" width="90" height="700" fill="#1a120c" />
      {[0, 1, 2, 3, 4].map((j) => {
        const y = -500 - j * 520;
        const w = 900 - j * 150;
        return (
          <g key={j}>
            <path d={`M${-w},${y + 300} L0,${y - 600} L${w},${y + 300} Q0,${y + 200} ${-w},${y + 300} Z`} fill={fonce} />
            <path d={`M0,${y - 600} L${w},${y + 300} Q${w * 0.55},${y + 230} ${w * 0.25},${y + 220} Z`} fill={lune} opacity="0.85" />
            {feu > 0 && j < 2 && <path d={`M${-w},${y + 300} Q0,${y + 200} ${w},${y + 300} L${w * 0.7},${y + 150} Q0,${y + 80} ${-w * 0.7},${y + 150} Z`} fill="#ff7a2a" opacity={0.35 * feu} />}
          </g>
        );
      })}
    </g>
  );
};
const ARBRES = (() => {
  const out = [];
  for (let k = 0; k < 140; k++) {
    const a = random(`ta${k}`) * 6.283;
    const r = 3600 + random(`tr${k}`) * 9000 + (k > 90 ? 6000 : 0);
    const x = Math.cos(a) * r;
    const z = 8 + (Math.sin(a) * r) / 1000;
    // pas d'arbre du côté où se placent les caméras (devant la clairière), sauf très loin
    if (z < 5.5 && r < 11000) continue;
    out.push({x, z, s: 0.9 + random(`ts${k}`) * 0.8, k});
  }
  return out;
})();
const billboard = (cam, x, y, z, contenu, key, taille = 1) => {
  if (!cam.visible(z, x, y) || cam.profondeur(z, x, y) < 0.3) return null;
  const [px, py] = cam.proj(x, y, z);
  return (
    <g key={key} transform={`translate(${px} ${py}) scale(${cam.scale(z, x, y) * taille})`}>
      {contenu}
    </g>
  );
};

// ombre portée au sol d'un objet en (x, z), par une lumière en (lx, lz) : traînée sombre qui part à l'opposé
export const ombrePortee = (cam, x, z, lx, lz, {long = 1600, large = 240, op = 0.5, key = 'op'} = {}) => {
  if (op <= 0.01) return null;
  const dx = x - lx;
  const dz = (z - lz) * 1000;
  const n = Math.hypot(dx, dz) || 1;
  const ux = dx / n;
  const uz = dz / n;
  const px = -uz;
  const pz = ux;
  const pts = [
    [x + px * large * 0.5, SOL - 2, z + (pz * large * 0.5) / 1000],
    [x + ux * long + px * large, SOL - 2, z + (uz * long + pz * large) / 1000],
    [x + ux * long - px * large, SOL - 2, z + (uz * long - pz * large) / 1000],
    [x - px * large * 0.5, SOL - 2, z - (pz * large * 0.5) / 1000],
  ];
  const p = cam.poly(pts);
  if (!p) return null;
  return (
    <g key={key}>
      <polygon points={p} fill="#000" opacity={op} filter="url(#fo-flou)" />
    </g>
  );
};

// ----- la tente (vue de l'extérieur) -----
// lumiere : lanterne allumée dedans (la toile s'éclaire) ; silhouettes : ombres des occupants sur la toile
const faceTente = (cam) => {
  const {x: X, haut: H, z0, z1} = TENTE;
  const sG = (cam.x + X) * (H - SOL) - (cam.y - SOL) * X; // côté gauche : extérieur si > 0
  const sD = (cam.x - X) * (H - SOL) - (cam.y - SOL) * -X; // côté droit : extérieur si < 0
  return {gauche: sG > 0, droite: sD < 0, avant: cam.z < z0, arriere: cam.z > z1};
};
export const tenteExt = (cam, f, {lumiere = 0, feu = 0, silhouettes = [], porte = 0, lune = 1} = {}) => {
  const {x: X, haut: H, z0, z1} = TENTE;
  const v = faceTente(cam);
  const toile = [214, 104, 38];
  const eclaire = [255, 190, 110];
  const c = (base) => rgb(mix(base, eclaire, Math.min(1, lumiere * 0.85)), 0.42 + 0.25 * feu + 0.6 * lumiere);
  const els = [];
  const G = [[-X, SOL, z0], [0, H, z0], [0, H, z1], [-X, SOL, z1]];
  const D = [[X, SOL, z0], [0, H, z0], [0, H, z1], [X, SOL, z1]];
  const AV = [[-X, SOL, z0], [0, H, z0], [X, SOL, z0]];
  const AR = [[-X, SOL, z1], [0, H, z1], [X, SOL, z1]];
  const face = (pts, base, key) => quad(cam, pts, c(base), key);
  if (v.gauche) els.push(face(G, mix(toile, [120, 140, 200], 0.15 * lune), 'g'));
  if (v.droite) els.push(face(D, mix(toile, [150, 170, 230], 0.3 * lune), 'd'));
  if (v.arriere) els.push(quad(cam, AR, c(toile), 'ar'));
  if (v.avant) {
    els.push(quad(cam, AV, c(mix(toile, [255, 150, 60], 0.2 * feu)), 'av'));
    // porte en arche avec sa fermeture éclair
    const arche = [...Array(13)].map((_, k) => {
      const a = Math.PI * (k / 12);
      return [-Math.cos(a) * 300, SOL - 520 * Math.sin(a) * 0.95 - 10 * (1 - Math.sin(a)), z0 - 0.003];
    });
    els.push(quad(cam, [[-300, SOL, z0 - 0.003], ...arche, [300, SOL, z0 - 0.003]], c([180, 80, 28]), 'porte'));
    if (porte > 0) {
      const h = 500 * porte;
      els.push(quad(cam, [[-60 * porte, SOL, z0 - 0.004], [0, SOL - h, z0 - 0.004], [60 * porte, SOL, z0 - 0.004]], lumiere > 0.2 ? '#ffd8a0' : '#05070c', 'fente'));
    }
    els.push(ligne(cam, [0, SOL, z0 - 0.005], [0, SOL - 500, z0 - 0.005], lw(cam, 6, [0, 0, z0]), '#2a1a10', 'zip', 0.8));
  }
  // ombres chinoises des occupants sur la toile (quand la lanterne est allumée)
  if (lumiere > 0.2 && silhouettes.length) {
    const visibles = [v.gauche && G, v.droite && D, v.avant && AV].filter(Boolean);
    visibles.forEach((pts, j) => {
      const p = cam.poly(pts);
      if (!p) return;
      const id = `ts${j}${Math.round(cam.x)}`;
      els.push(
        <g key={`sil${j}`}>
          <defs><clipPath id={id}><polygon points={p} /></clipPath></defs>
          <g clipPath={`url(#${id})`} filter="url(#fo-flou)" opacity={0.75 * lumiere}>
            {silhouettes.map((s, q) => {
              const zz = j === 2 ? z0 : s.z;
              const xx = j === 0 ? -X * 0.55 : j === 1 ? X * 0.55 : s.x;
              if (!cam.visible(zz, xx, s.y)) return null;
              const [px, py] = cam.proj(xx, s.y, zz);
              const k = cam.scale(zz, xx, s.y);
              return (
                <g key={q} transform={`translate(${px} ${py}) scale(${k})`}>
                  <ellipse cx="0" cy="-60" rx="80" ry="92" fill="#2a1206" />
                  <path d="M-160,240 Q-150,60 0,40 Q150,60 160,240 Z" fill="#2a1206" />
                </g>
              );
            })}
          </g>
        </g>,
      );
    });
  }
  // coutures, mâts et haubans
  els.push(ligne(cam, [0, H, z0], [0, H, z1], lw(cam, 10, [0, H, (z0 + z1) / 2]), '#3a1a08', 'arete'));
  [[z0 - 0.02, -1], [z1 + 0.02, 1]].forEach(([z, s], k) => {
    els.push(ligne(cam, [0, H - 60, z], [0, SOL, z + s * 0.001], lw(cam, 12, [0, 0, z]), '#6a6a72', `mat${k}`));
    els.push(ligne(cam, [0, H - 60, z], [0, SOL, z + s * 0.9], lw(cam, 4, [0, 0, z]), '#c8c8c0', `hb${k}`, 0.5));
  });
  [[-X - 250, z0 + 0.2], [X + 250, z0 + 0.2], [-X - 250, z1 - 0.2], [X + 250, z1 - 0.2]].forEach(([x, z], k) => els.push(ligne(cam, [Math.sign(x) * X * 0.5, (SOL + H) / 2, z], [x, SOL, z], lw(cam, 3, [x, 0, z]), '#d8d8d0', `cd${k}`, 0.4)));
  // lueur de la toile éclairée qui déborde sur le sol
  if (lumiere > 0.05) els.push(tache(cam, 0, SOL - 3, (z0 + z1) / 2, 1500, 1.6, 'fo-lanterne', 0.4 * lumiere, 'sol'));
  return {z: (z0 + z1) / 2, x: 0, y: (SOL + H) / 2, el: <g key="tente">{els}</g>};
};

// ----- le feu de camp -----
// feu : 0 (éteint) → 1 ; fumee : 0 → 1 (juste après l'extinction) ; braises
export const feuDeCamp = (cam, f, {feu = 1, fumee = 0, braises = 1} = {}) => {
  const {x: FX, z: FZ} = FEU;
  const v = feu * vacille(f);
  const els = [];
  // pierres en cercle
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * 6.283;
    const x = FX + Math.cos(a) * 330;
    const z = FZ + (Math.sin(a) * 330) / 1000;
    els.push(boiteG(cam, x - 70, x + 70, SOL - 90, SOL, z - 0.06, z + 0.06, [rgb([90, 88, 86], 0.4 + 0.8 * v), rgb([70, 68, 66], 0.35 + 0.7 * v), rgb([60, 58, 56], 0.3 + 0.6 * v)], `p${k}`));
  }
  // bûches croisées (noircies)
  [[-1, 1], [1, -1]].forEach(([a, b], k) => {
    els.push(ligne(cam, [FX - 220 * a, SOL - 30, FZ - 0.22 * b], [FX + 220 * a, SOL - 60, FZ + 0.22 * b], lw(cam, 70, [FX, SOL, FZ]), '#2a1a10', `b${k}`));
    els.push(ligne(cam, [FX - 220 * a, SOL - 50, FZ - 0.22 * b], [FX + 220 * a, SOL - 80, FZ + 0.22 * b], lw(cam, 20, [FX, SOL, FZ]), braises > 0 ? '#c8401a' : '#3a2a20', `bb${k}`, 0.4 + 0.6 * braises * (0.6 + 0.4 * Math.sin(f / 7 + k))));
  });
  // braises
  if (braises > 0) els.push(halo(cam, FX, SOL - 50, FZ, 420, 'fo-braise', braises * (0.6 + 0.3 * Math.sin(f / 9)), 'br'));
  // flammes (billboard animé)
  if (feu > 0.02 && cam.visible(FZ, FX, SOL - 200)) {
    const [px, py] = cam.proj(FX, SOL - 40, FZ);
    const s = cam.scale(FZ, FX, SOL - 40);
    const fl = [...Array(7)].map((_, j) => {
      const h = (380 + 200 * Math.sin(f / 3 + j * 1.7) + 120 * random(`fh${j}${Math.floor(f / 3)}`)) * feu;
      const w = 90 + 40 * Math.sin(f / 4 + j);
      const x = (j - 3) * 55 + 25 * Math.sin(f / 5 + j);
      const t = Math.sin(f / 2 + j) * 40;
      return <path key={j} d={`M${x - w},0 Q${x - w * 0.8},${-h * 0.5} ${x + t},${-h} Q${x + w * 0.8},${-h * 0.5} ${x + w},0 Z`} fill={['#ff5a10', '#ff8a20', '#ffb030', '#ff7a18'][j % 4]} opacity="0.85" />;
    });
    const coeur = [...Array(4)].map((_, j) => {
      const h = (200 + 90 * Math.sin(f / 2.5 + j * 2)) * feu;
      const x = (j - 1.5) * 50;
      return <path key={j} d={`M${x - 50},0 Q${x - 40},${-h * 0.5} ${x + 10 * Math.sin(f / 2 + j)},${-h} Q${x + 40},${-h * 0.5} ${x + 50},0 Z`} fill="#fff2a0" opacity="0.9" />;
    });
    els.push(<g key="fl" transform={`translate(${px} ${py}) scale(${s})`}>{fl}{coeur}</g>);
    // étincelles qui montent
    for (let j = 0; j < 16; j++) {
      const age = ((f + j * 9) % 45) / 45;
      const x = FX + (random(`sx${j}`) - 0.5) * 300 + Math.sin(f / 6 + j) * 80 * age;
      const y = SOL - 150 - age * 1600;
      const z = FZ + (random(`sz${j}`) - 0.5) * 0.3;
      els.push(halo(cam, x, y, z, 40, 'fo-feu', feu * (1 - age), `et${j}`));
    }
  }
  // fumée après l'extinction
  if (fumee > 0) {
    for (let j = 0; j < 10; j++) {
      const age = ((f * 0.8 + j * 12) % 120) / 120;
      const x = FX + Math.sin(f / 20 + j) * 200 * age + 60 * j * age;
      const y = SOL - 150 - age * 2600;
      els.push(halo(cam, x, y, FZ, 500 + 1200 * age, 'fo-fumee', fumee * (1 - age) * 0.9, `fu${j}`));
    }
  }
  return {z: FZ, x: FX, y: SOL - 100, el: <g key="feu">{els}</g>};
};

// ===================== la clairière =====================
// torche : {x, z} (lampe torche au loin, à la fin)
export const clairiere = (cam, f, {feu = 1, fumee = 0, braises = 1, lumiereTente = 0, silhouettes = [], porte = 0, torche = null, lucioles = 1} = {}) => {
  const v = feu * vacille(f);
  const fond = [];
  fond.push(<DefsGare key="dg" cam={cam} />);
  fond.push(<DefsForet key="df" cam={cam} />);
  fond.push(<rect key="ciel" width="1080" height="1920" fill="url(#fo-ciel)" />);
  // étoiles et lune
  for (let k = 0; k < 120; k++) {
    const x = (random(`sx${k}`) - 0.5) * 200000;
    const y = -20000 - random(`sy${k}`) * 90000;
    const z = 70 + (random(`sz${k}`) - 0.5) * 120;
    if (!cam.visible(z, x, y)) continue;
    const [px, py] = cam.proj(x, y, z);
    fond.push(<circle key={`e${k}`} cx={px} cy={py} r={1 + 1.8 * random(`sr${k}`)} fill="#fff" opacity={0.4 + 0.5 * Math.abs(Math.sin(f / 17 + k))} />);
  }
  fond.push(halo(cam, ...LUNE, 16000, 'fo-lune', 1, 'lune'));
  if (cam.visible(LUNE[2], LUNE[0], LUNE[1])) {
    const [px, py] = cam.proj(...LUNE);
    const r = 1900 * cam.scale(LUNE[2], LUNE[0], LUNE[1]);
    fond.push(<g key="ld"><circle cx={px} cy={py} r={r} fill="#eef2ff" /><circle cx={px - r * 0.3} cy={py - r * 0.2} r={r * 0.22} fill="#c8d0e0" /><circle cx={px + r * 0.25} cy={py + r * 0.3} r={r * 0.15} fill="#ccd4e4" /></g>);
  }
  // collines et lisière lointaine (silhouette sombre)
  fond.push(quad(cam, [[-60000, SOL, 80], [60000, SOL, 80], [60000, -3500, 80], [20000, -5200, 80], [-10000, -4200, 80], [-60000, -5600, 80]], '#08101c', 'colline'));
  // le sol : herbe sombre, éclairée par le feu autour du foyer
  fond.push(quad(cam, [[-40000, SOL, -30], [40000, SOL, -30], [40000, SOL, 60], [-40000, SOL, 60]], '#0e1810', 'sol'));
  fond.push(tache(cam, 0, SOL - 1, 8, 5200, 5.5, 'fo-brume', 0.5, 'clair'));
  fond.push(tache(cam, FEU.x, SOL - 1, FEU.z, 3600, 3.6, 'fo-solfeu', 0.85 * v, 'solfeu'));
  fond.push(tache(cam, FEU.x, SOL - 2, FEU.z, 650, 0.65, 'fo-ombre', 0.6, 'cendre'));
  // touffes d'herbe et cailloux près de la caméra
  for (let k = 0; k < 70; k++) {
    const x = (random(`gx${k}`) - 0.5) * 5200;
    const z = 3 + random(`gz${k}`) * 9;
    if (Math.abs(x) < 800 && z > TENTE.z0 - 0.3 && z < TENTE.z1 + 0.3) continue;
    if (Math.hypot(x - FEU.x, (z - FEU.z) * 1000) < 450) continue;
    const d = Math.hypot(x - FEU.x, (z - FEU.z) * 1000);
    const l = Math.max(0, 1 - d / 3500) * v;
    const col = rgb(mix([30, 52, 32], [200, 120, 50], l * 0.7), 0.7 + 0.8 * l);
    if (!cam.visible(z, x, SOL)) continue;
    const [px, py] = cam.proj(x, SOL, z);
    const s = cam.scale(z, x, SOL);
    fond.push(<g key={`h${k}`} transform={`translate(${px} ${py}) scale(${s})`}>{[-40, -15, 10, 35].map((a, j) => <path key={j} d={`M${a},0 Q${a + 10},-60 ${a + 25 * Math.sin(f / 30 + k + j)},-${120 + 40 * ((k + j) % 3)}`} stroke={col} strokeWidth="12" fill="none" />)}</g>);
  }
  // ombres portées des arbres proches (par le feu), puis voile bleuté
  ARBRES.forEach((a) => {
    const d = Math.hypot(a.x - FEU.x, (a.z - FEU.z) * 1000);
    if (d < 6000 && v > 0.05) fond.push(ombrePortee(cam, a.x, a.z, FEU.x, FEU.z, {long: 4000, large: 300, op: 0.45 * v, key: `oa${a.k}`}));
  });
  fond.push(<rect key="voile" width="1080" height="1920" fill="url(#fo-voile)" />);

  const items = [];
  // les sapins (éclairés en bas par le feu quand ils sont proches)
  ARBRES.forEach((a) => {
    const d = Math.hypot(a.x - FEU.x, (a.z - FEU.z) * 1000);
    const l = Math.max(0, 1 - d / 7000) * v;
    items.push({z: a.z, x: a.x, y: -1000, el: billboard(cam, a.x, SOL, a.z, SAPIN(a.k, l), `ar${a.k}`, a.s)});
  });
  // brume qui traîne au ras du sol
  for (let k = 0; k < 16; k++) {
    const x = (random(`bx${k}`) - 0.5) * 9000 + Math.sin(f / 80 + k) * 400;
    const z = 4 + random(`bz${k}`) * 14;
    items.push({z, x, y: SOL - 80, el: halo(cam, x, SOL - 80, z, 1800, 'fo-brume', 0.55, `bm${k}`)});
  }
  // lucioles
  for (let k = 0; k < 14; k++) {
    const x = (random(`lx${k}`) - 0.5) * 6000 + Math.sin(f / 25 + k) * 300;
    const z = 5 + random(`lz${k}`) * 10 + Math.cos(f / 30 + k) * 0.3;
    const y = SOL - 300 - random(`ly${k}`) * 900 + Math.sin(f / 15 + k) * 80;
    items.push({z, x, y, el: halo(cam, x, y, z, 90, 'fo-luciole', lucioles * (0.4 + 0.6 * Math.abs(Math.sin(f / 11 + k * 2))), `lu${k}`)});
  }
  // bûche pour s'asseoir, sac à dos, glacière, bâton
  const lb = (k) => rgb([110, 70, 40], 0.35 + 0.9 * v * k);
  items.push({z: 5.3, x: -650, y: SOL - 60, el: <g key="buche">{boiteG(cam, -1050, -300, SOL - 140, SOL, 5.18, 5.42, [lb(1), lb(0.8), lb(0.6)], 'b')}</g>});
  items.push({z: 7.3, x: 900, y: SOL - 60, el: <g key="sac">{boiteG(cam, 800, 1050, SOL - 330, SOL, 7.2, 7.4, [rgb([40, 90, 140], 0.4 + 0.8 * v), rgb([30, 70, 120], 0.35 + 0.7 * v), rgb([25, 60, 100], 0.3 + 0.6 * v)], 's')}</g>});
  items.push({z: 6.9, x: -1100, y: SOL - 60, el: <g key="gla">{boiteG(cam, -1300, -950, SOL - 220, SOL, 6.75, 7.05, [rgb([220, 220, 220], 0.35 + 0.7 * v), rgb([200, 40, 40], 0.35 + 0.7 * v), rgb([170, 30, 30], 0.3 + 0.6 * v)], 'g')}</g>});
  items.push(feuDeCamp(cam, f, {feu, fumee, braises}));
  items.push(tenteExt(cam, f, {lumiere: lumiereTente, feu: v, silhouettes, porte}));
  // lampe torche au loin (les vrais potes qui reviennent)
  if (torche) {
    items.push({z: torche.z, x: torche.x, y: -200, el: <g key="torche">
      {halo(cam, torche.x, -150, torche.z, 900, 'fo-torche', 0.9, 'h')}
      {halo(cam, torche.x, -150, torche.z, 120, 'fo-torche', 1, 'c')}
      {tache(cam, torche.x + 600, SOL - 2, torche.z - 1.2, 900, 1.2, 'fo-torche', 0.35, 's')}
    </g>});
  }
  return {fond: <g>{fond}</g>, items, brume: null, v};
};

// ===================== l'intérieur de la tente =====================
// Lanterne accrochée à l'arête (centre). lampe : 0 → 1 (grésille). porte : ouverture de la fermeture éclair (0 → 1).
// ombre : silhouette dehors projetée sur la porte par la lune (0 → 1). nuit : la lune éclaire la toile de l'extérieur.
export const LANTERNE = {x: 0, y: -420, z: 8.62};
export const tenteInt = (cam, f, {lampe = 1, porte = 0, ombre = 0, torche = 0} = {}) => {
  const {x: X, haut: H, z0, z1} = TENTE;
  const fond = [];
  fond.push(<DefsGare key="dg" cam={cam} />);
  fond.push(<DefsForet key="df" cam={cam} />);
  fond.push(<rect key="n" width="1080" height="1920" fill="#08060a" />);
  const toile = [200, 96, 34];
  const nuit = [40, 50, 80];
  // lumière en un point : lanterne (chaude, décroît avec la distance) + lune à travers la toile
  const L = (p) => {
    const d = Math.hypot(p[0] - LANTERNE.x, p[1] - LANTERNE.y, (p[2] - LANTERNE.z) * 1000);
    return lampe * Math.max(0.05, 1 - d / 1100);
  };
  const teinte = (p) => {
    const l = L(p);
    return rgb(mix(nuit, toile, Math.min(1, l * 1.2)), 0.55 + 1.1 * l);
  };
  // pans de toile découpés en petits morceaux (dégradé de lumière réaliste)
  const N = 6;
  [-1, 1].forEach((s) => {
    for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) {
      const u0 = a / N;
      const u1 = (a + 1) / N;
      const w0 = b / N;
      const w1 = (b + 1) / N;
      const P = (u, w) => [s * X * (1 - u), SOL + (H - SOL) * u, z0 + (z1 - z0) * w];
      const c = P((u0 + u1) / 2, (w0 + w1) / 2);
      fond.push(quad(cam, [P(u0, w0), P(u1, w0), P(u1, w1 + 0.002), P(u0, w1 + 0.002)], teinte(c), `t${s}${a}${b}`));
    }
  });
  // le fond (triangle arrière) et le sol (tapis de sol gris)
  for (let a = 0; a < N; a++) {
    const y0 = SOL + ((H - SOL) * a) / N;
    const y1 = SOL + ((H - SOL) * (a + 1)) / N;
    const w0 = X * (1 - a / N);
    const w1 = X * (1 - (a + 1) / N);
    fond.push(quad(cam, [[-w0, y0, z1], [w0, y0, z1], [w1, y1, z1], [-w1, y1, z1]], teinte([0, (y0 + y1) / 2, z1]), `ar${a}`));
  }
  for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) {
    const xa = -X + (2 * X * a) / N;
    const xb = -X + (2 * X * (a + 1)) / N;
    const za = z0 + ((z1 - z0) * b) / N;
    const zb = z0 + ((z1 - z0) * (b + 1)) / N;
    fond.push(quad(cam, [[xa, SOL, za], [xb + 2, SOL, za], [xb + 2, SOL, zb + 0.002], [xa, SOL, zb + 0.002]], rgb(mix([20, 22, 28], [90, 92, 98], Math.min(1, L([(xa + xb) / 2, SOL, (za + zb) / 2]) * 1.3)), 0.6 + 0.8 * L([(xa + xb) / 2, SOL, (za + zb) / 2])), `s${a}${b}`));
  }
  // la porte (triangle avant) : arche de la porte, fermeture éclair qui s'ouvre sur la nuit
  for (let a = 0; a < N; a++) {
    const y0 = SOL + ((H - SOL) * a) / N;
    const y1 = SOL + ((H - SOL) * (a + 1)) / N;
    const w0 = X * (1 - a / N);
    const w1 = X * (1 - (a + 1) / N);
    fond.push(quad(cam, [[-w0, y0, z0], [w0, y0, z0], [w1, y1, z0], [-w1, y1, z0]], teinte([0, (y0 + y1) / 2, z0]), `av${a}`));
  }
  const arche = [...Array(13)].map((_, k) => {
    const a = Math.PI * (k / 12);
    return [-Math.cos(a) * 300, SOL - 500 * Math.sin(a), z0 + 0.003];
  });
  fond.push(quad(cam, [[-300, SOL, z0 + 0.003], ...arche, [300, SOL, z0 + 0.003]], 'none', 'arche', 1, {stroke: '#2a1206', strokeWidth: Math.max(2, 10 * cam.scale(z0, 0, 0)), strokeOpacity: 0.6}));
  // l'ombre de quelqu'un dehors, projetée sur la porte par la lune (plus visible quand la lanterne faiblit)
  if (ombre > 0) {
    const op = ombre * (0.45 + 0.5 * (1 - lampe));
    fond.push(plaque(cam, [-700, -900, z0 + 0.004], [1, 0, 0], [0, 1, 0], 1400, 1330,
      <g filter="url(#fo-flou)" opacity={op}>
        <ellipse cx="700" cy="330" rx="120" ry="150" fill="#0a0406" transform={`rotate(${8 + Math.sin(f / 40) * 3} 700 330)`} />
        <path d="M520,520 Q700,430 880,520 L940,1330 L460,1330 Z" fill="#0a0406" />
        <path d="M540,540 Q420,800 380,1180" stroke="#0a0406" strokeWidth="70" fill="none" strokeLinecap="round" />
        <path d="M860,540 Q980,800 1020,1180" stroke="#0a0406" strokeWidth="70" fill="none" strokeLinecap="round" />
      </g>, 'ombre'));
  }
  // la fente qui s'ouvre (fermeture éclair) : la nuit derrière, un peu de lune
  if (porte > 0) {
    const h = 500 * porte;
    const w = 40 + 160 * porte;
    const pts = [[-w, SOL, z0 + 0.005], [-w * 0.35, SOL - h * 0.6, z0 + 0.005], [0, SOL - h, z0 + 0.005], [w * 0.35, SOL - h * 0.6, z0 + 0.005], [w, SOL, z0 + 0.005]];
    fond.push(quad(cam, pts, '#04060c', 'fente'));
    fond.push(quad(cam, pts.map((p) => [p[0] * 0.6, p[1] + (SOL - p[1]) * 0.15, p[2]]), '#1a2a4a', 'fente2', 0.5));
    if (torche > 0) fond.push(halo(cam, 60, -50, z0 - 2.5, 600, 'fo-torche', torche * (0.6 + 0.4 * Math.sin(f / 9)), 'torche'));
    // le curseur de la fermeture
    fond.push(quad(cam, [[-18, SOL - h - 20, z0 + 0.006], [18, SOL - h - 20, z0 + 0.006], [18, SOL - h + 30, z0 + 0.006], [-18, SOL - h + 30, z0 + 0.006]], '#b8b8c0', 'curseur'));
  }
  fond.push(ligne(cam, [0, SOL, z0 + 0.004], [0, SOL - 500, z0 + 0.004], lw(cam, 5, [0, 0, z0]), '#2a1a10', 'zip', 0.7));
  // coutures, arête, poche filet, lanterne
  fond.push(ligne(cam, [0, H + 4, z0], [0, H + 4, z1], lw(cam, 10, [0, H, LANTERNE.z]), '#3a1a08', 'arete'));
  [-1, 1].forEach((s) => fond.push(quad(cam, [[s * X * 0.55, SOL - 330, z1 - 0.3], [s * X * 0.55, SOL - 330, z1 - 0.05], [s * X * 0.75, SOL - 120, z1 - 0.05], [s * X * 0.75, SOL - 120, z1 - 0.3]], '#1a1a1a', `poche${s}`, 0.35)));
  const items = [];
  const lp = LANTERNE;
  items.push({z: lp.z, x: lp.x, y: lp.y, el: <g key="lant">
    {ligne(cam, [0, H, lp.z], [0, lp.y - 60, lp.z], lw(cam, 4, [0, H, lp.z]), '#2a2a2a', 'f')}
    {boiteG(cam, -40, 40, lp.y - 60, lp.y + 60, lp.z - 0.04, lp.z + 0.04, ['#3a3a3a', lampe > 0.3 ? '#fff4d8' : '#4a4a40', lampe > 0.3 ? '#ffe8c0' : '#3a3a34', '#2a2a2a'], 'b')}
    {cam.profondeur(lp.z, lp.x, lp.y) > 0.4 && halo(cam, 0, lp.y, lp.z, 700, 'fo-lanterne', 0.55 * lampe, 'h')}
  </g>});
  return {fond: <g>{fond}</g>, items, brume: null, L};
};

// ----- une tête couchée vue d'au-dessus (pour les potes dans leur sac de couchage) -----
// yeux 0 → 1, ronfle 0 → 1 (bouche ouverte), grin 0 → 1 (sourire beaucoup trop large), regard [x, y] des pupilles
export const Tete = ({chev = '#3a2416', peau = '#f2c3a0', yeux = 0, ronfle = 0, grin = 0, regard = [0, 0], tourne = 0}) => (
  <g transform={`rotate(${tourne} 200 220)`}>
    <ellipse cx="200" cy="200" rx="170" ry="180" fill={chev} />
    <ellipse cx="200" cy="240" rx="140" ry="150" fill={peau} />
    <path d="M62,200 Q60,70 200,62 Q340,70 338,200 Q300,120 200,118 Q100,120 62,200 Z" fill={chev} />
    {[150, 250].map((x) =>
      yeux > 0.1 ? (
        <g key={x}>
          <ellipse cx={x} cy="230" rx="26" ry={26 * yeux} fill="#ffffff" />
          <circle cx={x + regard[0]} cy={230 + regard[1]} r={12 * Math.min(1, yeux)} fill="#111" />
        </g>
      ) : (
        <path key={x} d={`M${x - 24},232 Q${x},244 ${x + 24},232`} stroke="#3a2a2a" strokeWidth="8" fill="none" strokeLinecap="round" />
      ),
    )}
    {grin > 0.02 ? (
      <g>
        <path d={`M${200 - 40 - 110 * grin},300 Q200,${330 + 90 * grin} ${200 + 40 + 110 * grin},300 Q200,${318 + 20 * grin} ${200 - 40 - 110 * grin},300 Z`} fill="#2a0a0a" />
        <path d={`M${200 - 36 - 104 * grin},304 Q200,${326 + 40 * grin} ${200 + 36 + 104 * grin},304 Q200,${318 + 16 * grin} ${200 - 36 - 104 * grin},304 Z`} fill="#f4f0e4" />
        {[...Array(9)].map((_, j) => <line key={j} x1={200 + (j - 4) * 24 * grin} y1="304" x2={200 + (j - 4) * 24 * grin} y2={318 + 20 * grin} stroke="#c8c0b0" strokeWidth="3" />)}
      </g>
    ) : ronfle > 0.05 ? (
      <ellipse cx="200" cy="308" rx={16 + 8 * ronfle} ry={8 + 16 * ronfle} fill="#6a2a2a" />
    ) : (
      <path d="M180,306 Q200,314 220,306" stroke="#a8604a" strokeWidth="7" fill="none" strokeLinecap="round" />
    )}
  </g>
);
