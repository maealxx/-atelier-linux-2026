import {random} from 'remotion';
import {foret, SOL} from './ForetNuit';

// ===================== La station-service dans la forêt (« La station-service ») =====================
// Auvent (y −1100) au-dessus des pompes, néons blancs froids dessous. La voiture garée selon Z à gauche de la pompe,
// la boutique vitrée derrière (façade de verre en Z 4,5, X ±1500, plafond −800). Tout autour : la forêt de nuit (ForetNuit).
// Éclairage par polygone : chaque surface est éclairée par la liste des néons (allumés / éteints / qui grésillent).
const R = (s) => random(s);
const borne = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const AUVENT = {x0: -1900, x1: 1900, z0: -0.2, z1: 3.0, y: -1100, ep: 140};
export const POMPE = {x: 260, z: 1.45};
export const VOIT = {x0: -760, x1: -110, z0: 0.55, z1: 2.25, bas: 330, ceinture: 90, toit: -150};
export const BOUT = {x0: -1500, x1: 1500, z0: 4.5, z1: 8.0, plaf: -800, vitre: 200};
export const PORTE_B = {x0: 700, x1: 1050};
export const COMPTOIR = {x0: 600, x1: 1350, z0: 5.3, z1: 5.75, y: 120};
export const NEONS_A = [[-900, AUVENT.y + AUVENT.ep, 0.6], [900, AUVENT.y + AUVENT.ep, 0.6], [-900, AUVENT.y + AUVENT.ep, 2.2], [900, AUVENT.y + AUVENT.ep, 2.2]];
export const NEONS_B = [[-700, BOUT.plaf, 5.4], [700, BOUT.plaf, 5.4], [-700, BOUT.plaf, 6.9], [700, BOUT.plaf, 6.9]];

// néon qui grésille (déterministe)
export const gresille = (f, seed, k = 1) => (R(`gr${seed}${Math.floor(f / 2)}`) > 0.35 * k ? 1 : 0.15);

// lumière en un point : néons de l'auvent (froids), néons de la boutique (blancs), lumière intérieure vue de dehors
const lumiere = (p, L) => {
  const d = (q) => Math.hypot(p[0] - q[0], p[1] - q[1], (p[2] - q[2]) * 1000);
  let c = [0.03, 0.035, 0.05];
  NEONS_A.forEach((q, k) => {
    const v = (L.auvent?.[k] ?? 1) * 0.75 / (1 + (d(q) / 1100) ** 2);
    c = [c[0] + v * 0.82, c[1] + v * 0.95, c[2] + v * 1.0];
  });
  NEONS_B.forEach((q, k) => {
    const v = (L.boutique?.[k] ?? 1) * 0.8 / (1 + (d(q) / 900) ** 2);
    c = [c[0] + v * 0.95, c[1] + v * 0.97, c[2] + v * 0.9];
  });
  // l'écran de la pompe (un peu vert)
  const e = (L.ecran ?? 1) * 0.12 / (1 + (d([POMPE.x, -250, POMPE.z - 0.2]) / 400) ** 2);
  return [c[0] + e * 0.3, c[1] + e, c[2] + e * 0.6];
};
export const teinte = (albedo, p, L) => {
  const l = lumiere(p, L);
  return `rgb(${albedo.map((a, i) => Math.round(borne(a * l[i] * 255, 0, 255))).join(',')})`;
};
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
  if (cam.y > y1) F('bas', [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], 0.55);
  if (cam.x < x0) F('g', [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], 0.85);
  if (cam.x > x1) F('d', [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], 0.85);
  if (cam.z < z0) F('av', [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], 0.95);
  if (cam.z > z1) F('ar', [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], 0.95);
  return <g key={key}>{faces}</g>;
};
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
// un tube néon (rectangle lumineux) + son halo
const tube = (cam, [x, y, z], on, id, long = 520) => {
  const p = cam.poly([[x - long / 2, y + 2, z - 0.03], [x + long / 2, y + 2, z - 0.03], [x + long / 2, y + 2, z + 0.03], [x - long / 2, y + 2, z + 0.03]]);
  if (!p) return null;
  return (
    <g key={id}>
      <polygon points={p} fill={on > 0.5 ? '#f4fbff' : '#2a2e34'} stroke={on > 0.5 ? '#ffffff' : '#1a1c20'} strokeWidth="3" />
      {on > 0.3 && halo(cam, [x, y + 60, z], long > 600 ? 520 : 900, '#cfe8ff', (long > 600 ? 0.22 : 0.4) * on, `${id}h`)}
    </g>
  );
};

// ----- dehors : la station au milieu de la forêt -----
// o : auvent [4], boutique [4] (néons), ecran (pompe), compteur (litres affichés), creature (élément 3D), caissiere (élément 3D),
//     feuille (0 → 1 : la feuille collée sur la vitre), portiere (0 → 1)
export const station = (cam, f, o = {}) => {
  const L = {auvent: [1, 1, 1, 1], boutique: [1, 1, 1, 1], ecran: 1, ...o};
  const d = foret(cam, f, {nuit: 1, lumYaw: 180, lumY: -1.4, rim: 0.6, portee: 7.5, rayons: 0, poussiere: 0, haloK: 0.35, degage: [[0, -3, 0, 9, 2600]]});
  const fond = [d.fond];
  // asphalte mouillé (la lumière des néons s'y reflète)
  const asph = cam.poly([[-3200, SOL - 1, -3], [3200, SOL - 1, -3], [3200, SOL - 1, 4.4], [-3200, SOL - 1, 4.4]]);
  if (asph) fond.push(<polygon key="asph" points={asph} fill="#121419" />);
  NEONS_A.forEach((q, k) => {
    const on = L.auvent[k];
    if (on < 0.2) return;
    const pool = cam.poly([...Array(14)].map((_, j) => {
      const a = (j / 14) * Math.PI * 2;
      return [q[0] + Math.cos(a) * 900, SOL - 1, q[2] + Math.sin(a) * 0.75];
    }));
    if (pool) fond.push(<polygon key={`pool${k}`} points={pool} fill="#9fb6d0" opacity={0.09 * on} />);
    // reflet allongé du néon sur le sol mouillé
    const r = cam.poly([[q[0] - 200, SOL - 1, q[2] - 0.02], [q[0] + 200, SOL - 1, q[2] - 0.02], [q[0] + 120, SOL - 1, q[2] - 0.6], [q[0] - 120, SOL - 1, q[2] - 0.6]]);
    if (r) fond.push(<polygon key={`ref${k}`} points={r} fill="#dff0ff" opacity={0.08 * on} />);
  });
  // marquages au sol
  [[-900, 0.2, 2.6], [600, 0.2, 2.6]].forEach(([x, z0, z1], k) => {
    const m = cam.poly([[x - 12, SOL - 2, z0], [x + 12, SOL - 2, z0], [x + 12, SOL - 2, z1], [x - 12, SOL - 2, z1]]);
    if (m) fond.push(<polygon key={`mq${k}`} points={m} fill="#d8d0a0" opacity="0.35" />);
  });
  const items = [...d.items];
  // ----- la boutique -----
  items.push({z: BOUT.z0 + 0.1, x: 0, el: boutiqueExt(cam, f, L, o)});
  // ----- l'auvent et ses piliers -----
  items.push({z: 1.4, x: 0, y: AUVENT.y, el: (
    <g key="auvent">
      {boite(cam, [AUVENT.x0, AUVENT.x1], [AUVENT.y, AUVENT.y + AUVENT.ep], [AUVENT.z0, AUVENT.z1], [0.75, 0.76, 0.8], L, 'auv')}
      {(() => {
        // bandeau rouge sur la tranche avant
        const p = cam.poly([[AUVENT.x0, AUVENT.y + 10, AUVENT.z0 - 0.002], [AUVENT.x1, AUVENT.y + 10, AUVENT.z0 - 0.002], [AUVENT.x1, AUVENT.y + 60, AUVENT.z0 - 0.002], [AUVENT.x0, AUVENT.y + 60, AUVENT.z0 - 0.002]]);
        return p && cam.z < AUVENT.z0 ? <polygon points={p} fill="#c4202a" /> : null;
      })()}
      {NEONS_A.map((q, k) => tube(cam, q, L.auvent[k], `na${k}`))}
    </g>
  )});
  NEONS_A.forEach((q, k) => {
    const on = L.auvent[k];
    if (on < 0.3) return;
    const p = cam.poly([[q[0] - 260, q[1] + 4, q[2]], [q[0] + 260, q[1] + 4, q[2]], [q[0] + 700, SOL - 2, q[2]], [q[0] - 700, SOL - 2, q[2]]]);
    if (!p) return;
    items.push({z: q[2] + 0.01, x: q[0], el: (
      <g key={`cone${k}`}>
        <defs>
          <linearGradient id={`cn${k}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e8f4ff" stopOpacity={0.13 * on} />
            <stop offset="1" stopColor="#e8f4ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={p} fill={`url(#cn${k})`} />
      </g>
    )});
  });
  [[-1500, 1.4], [1500, 1.4]].forEach(([x, z], k) => items.push({z, x, el: boite(cam, [x - 70, x + 70], [AUVENT.y + AUVENT.ep, SOL], [z - 0.07, z + 0.07], [0.7, 0.7, 0.72], L, `pil${k}`)}));
  // ----- la pompe -----
  items.push({z: POMPE.z, x: POMPE.x, el: pompe(cam, f, L, o)});
  // ----- la voiture -----
  if (!o.sansVoiture) items.push({z: (VOIT.z0 + VOIT.z1) / 2, x: (VOIT.x0 + VOIT.x1) / 2, el: voiture(cam, f, L, o)});
  if (o.creature) items.push(o.creature);
  if (o.extra) items.push(...o.extra);
  return {fond: <g key="fond">{fond}</g>, brume: <g key="br" />, items, L};
};

const pompe = (cam, f, L, o) => {
  const {x, z} = POMPE;
  // îlot
  const el = [boite(cam, [x - 320, x + 320], [SOL - 40, SOL], [z - 0.35, z + 0.35], [0.5, 0.5, 0.52], L, 'ilot')];
  el.push(boite(cam, [x - 140, x + 140], [-380, SOL - 40], [z - 0.12, z + 0.12], [0.5, 0.52, 0.56], L, 'corps'));
  el.push(boite(cam, [x - 150, x + 150], [-430, -380], [z - 0.13, z + 0.13], [0.75, 0.12, 0.12], L, 'tetep'));
  // écran face à −Z (côté voiture / caméra) : compteur
  if (cam.z < z - 0.12) {
    const p = cam.poly([[x - 100, -330, z - 0.122], [x + 100, -330, z - 0.122], [x + 100, -200, z - 0.122], [x - 100, -200, z - 0.122]]);
    if (p) {
      const [cx, cy] = cam.proj(x, -265, z - 0.122);
      const s = cam.scale(z - 0.122, x, -265);
      const litres = (o.compteur ?? 0).toFixed(2);
      el.push(
        <g key="ecr">
          <polygon points={p} fill="#0a1a10" />
          <text x={cx} y={cy + 18 * s} textAnchor="middle" fontFamily="'DejaVu Sans Mono', monospace" fontWeight="700" fontSize={52 * s} fill="#7dff9a">{litres}</text>
        </g>,
      );
    }
  }
  // tuyau qui va jusqu'au réservoir de la voiture
  const a = cam.proj(x - 140, -150, z - 0.05);
  const b = cam.proj(VOIT.x1 + 20, 60, 1.75);
  const c = cam.proj(x - 300, 380, z - 0.4);
  if (cam.visible(z, x, 0)) el.push(<path key="tuy" d={`M${a[0]},${a[1]} Q${c[0]},${c[1]} ${b[0]},${b[1]}`} stroke="#151515" strokeWidth={Math.max(3, 26 * cam.scale(z, x, 0))} fill="none" />);
  return <g key="pompe">{el}</g>;
};

const voiture = (cam, f, L, o) => {
  const V = VOIT;
  const coque = [0.18, 0.22, 0.32];
  const el = [];
  // roues
  [[V.x0 - 5, V.z0 + 0.3], [V.x0 - 5, V.z1 - 0.3], [V.x1 + 5, V.z0 + 0.3], [V.x1 + 5, V.z1 - 0.3]].forEach(([x, zr], k) => {
    if (!cam.visible(zr, x, 330)) return;
    const [px, py] = cam.proj(x, 345, zr);
    const s = cam.scale(zr, x, 345);
    el.push(<ellipse key={`r${k}`} cx={px} cy={py} rx={Math.max(4, 60 * s * Math.abs(Math.sin(((cam.yaw || 0) * Math.PI) / 180)) + 25 * s)} ry={88 * s} fill="#08080a" />);
  });
  el.push(boite(cam, [V.x0, V.x1], [V.ceinture, V.bas], [V.z0, V.z1], coque, L, 'caisse'));
  // habitacle (vitres sombres qui reflètent les néons)
  const hab = [[V.x0 + 60, V.toit, V.z0 + 0.45], [V.x1 - 60, V.toit, V.z0 + 0.45], [V.x1 - 20, V.ceinture, V.z0 + 0.25], [V.x0 + 20, V.ceinture, V.z0 + 0.25]];
  const habAr = [[V.x0 + 60, V.toit, V.z1 - 0.35], [V.x1 - 60, V.toit, V.z1 - 0.35], [V.x1 - 20, V.ceinture, V.z1 - 0.15], [V.x0 + 20, V.ceinture, V.z1 - 0.15]];
  const vitreC = '#0c1220';
  const pf = cam.poly(hab);
  if (pf && cam.z < V.z0 + 0.4) el.push(<polygon key="pare" points={pf} fill={vitreC} stroke={teinte(coque, [0, 0, V.z0], L)} strokeWidth="6" />);
  // côtés de l'habitacle
  [V.x0 + 20, V.x1 - 20].forEach((xs, k) => {
    const sens = k === 0 ? -1 : 1;
    if ((sens < 0 && cam.x > xs) || (sens > 0 && cam.x < xs)) return;
    const xt = xs + (k === 0 ? 40 : -40);
    const p = cam.poly([[xs, V.ceinture, V.z0 + 0.25], [xt, V.toit, V.z0 + 0.45], [xt, V.toit, V.z1 - 0.35], [xs, V.ceinture, V.z1 - 0.15]]);
    if (p) el.push(<polygon key={`cote${k}`} points={p} fill={vitreC} stroke={teinte(coque, [xs, 0, 1.4], L)} strokeWidth="8" />);
  });
  const pr = cam.poly(habAr);
  if (pr && cam.z > V.z1 - 0.4) el.push(<polygon key="lun" points={pr} fill={vitreC} />);
  // toit
  const toit = cam.poly([[V.x0 + 60, V.toit, V.z0 + 0.45], [V.x1 - 60, V.toit, V.z0 + 0.45], [V.x1 - 60, V.toit, V.z1 - 0.35], [V.x0 + 60, V.toit, V.z1 - 0.35]]);
  if (toit && cam.y < V.toit) el.push(<polygon key="toit" points={toit} fill={teinte(coque.map((a) => a * 1.2), [(V.x0 + V.x1) / 2, V.toit, 1.4], L)} />);
  // reflet du néon sur le pare-brise
  if (pf && cam.z < V.z0 + 0.4) {
    const a = cam.proj(V.x0 + 120, V.toit + 40, V.z0 + 0.43);
    const b = cam.proj(V.x1 - 200, V.ceinture - 40, V.z0 + 0.28);
    el.push(<line key="refl" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#cfe6ff" strokeOpacity="0.25" strokeWidth={Math.max(2, 30 * cam.scale(V.z0, 0, 0))} />);
  }
  // phares
  if (cam.z < V.z0) {
    [V.x0 + 100, V.x1 - 100].forEach((x, k) => {
      const [px, py] = cam.proj(x, 200, V.z0 - 0.002);
      const s = cam.scale(V.z0, x, 200);
      el.push(<ellipse key={`ph${k}`} cx={px} cy={py} rx={70 * s} ry={30 * s} fill={o.phares ? '#fff6d0' : '#8a8c90'} />);
    });
  }
  return <g key="voit">{el}</g>;
};

const boutiqueExt = (cam, f, L, o) => {
  const B = BOUT;
  const el = [];
  // mur de façade (au-dessus et sous les vitres)
  const lit = L.boutique.reduce((a, b) => a + b, 0) / 4;
  const mur = (y0, y1, k) => {
    const p = cam.poly([[B.x0, y0, B.z0], [B.x1, y0, B.z0], [B.x1, y1, B.z0], [B.x0, y1, B.z0]]);
    return p ? <polygon key={k} points={p} fill={teinte([0.55, 0.55, 0.58], [0, (y0 + y1) / 2, B.z0 - 0.3], L)} /> : null;
  };
  // l'intérieur vu par la vitre : lumière blanche, rayonnages, la caissière
  const vit = cam.poly([[B.x0 + 40, -620, B.z0], [B.x1 - 40, -620, B.z0], [B.x1 - 40, B.vitre, B.z0], [B.x0 + 40, B.vitre, B.z0]]);
  if (vit && cam.z < B.z0) {
    el.push(
      <g key="int">
        <defs>
          <linearGradient id="bt-in" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f2f6ff" stopOpacity={0.95 * lit} />
            <stop offset="1" stopColor="#9aa4b4" stopOpacity={0.9 * lit} />
          </linearGradient>
          <clipPath id="bt-vc">
            <polygon points={vit} />
          </clipPath>
        </defs>
        <polygon points={vit} fill="#0b0d12" />
        <polygon points={vit} fill="url(#bt-in)" />
        <g clipPath="url(#bt-vc)">
          {[-1100, -600, -100, 400].map((x, k) => boite(cam, [x, x + 320], [-200, SOL], [6.6, 7.0], [[0.8, 0.3, 0.2], [0.3, 0.5, 0.8], [0.9, 0.7, 0.2], [0.4, 0.7, 0.4]][k], {...L, auvent: [0, 0, 0, 0], boutique: L.boutique.map((v) => v * 1.6)}, `ray${k}`))}
          {boite(cam, [COMPTOIR.x0, COMPTOIR.x1], [COMPTOIR.y, SOL], [COMPTOIR.z0, COMPTOIR.z1], [0.6, 0.5, 0.4], {...L, auvent: [0, 0, 0, 0], boutique: L.boutique.map((v) => v * 1.6)}, 'cpt')}
          {o.caissiere?.el}
          {(o.dedans || []).map((it, k) => <g key={k}>{it.el}</g>)}
        </g>
        {/* reflet sur la vitre */}
        <polygon points={vit} fill="#cfe0ff" opacity="0.06" />
      </g>,
    );
  }
  el.push(mur(-800, -620, 'm1'));
  el.push(mur(B.vitre, SOL, 'm2'));
  // montants de la vitrine
  for (let x = B.x0; x <= B.x1; x += 500) {
    const p = cam.poly([[x - 18, -620, B.z0 - 0.004], [x + 18, -620, B.z0 - 0.004], [x + 18, B.vitre, B.z0 - 0.004], [x - 18, B.vitre, B.z0 - 0.004]]);
    if (p) el.push(<polygon key={`mt${x}`} points={p} fill="#2a2c30" />);
  }
  // la feuille collée contre la vitre (« NE LÈVE PAS LES YEUX »)
  if (o.feuille > 0) {
    const fx = 300;
    const pts = [[fx - 170, -380, B.z0 - 0.006], [fx + 170, -380, B.z0 - 0.006], [fx + 170, -60, B.z0 - 0.006], [fx - 170, -60, B.z0 - 0.006]];
    const p = cam.poly(pts);
    if (p) {
      const [cx, cy] = cam.proj(fx, -220, B.z0 - 0.006);
      const s = cam.scale(B.z0, fx, -220);
      el.push(
        <g key="feuille" opacity={o.feuille}>
          <polygon points={p} fill="#f2efe4" />
          <g transform={`translate(${cx} ${cy}) scale(${s}) rotate(-4)`} fontFamily="'DejaVu Sans', sans-serif" fontWeight="800" fontStyle="italic" fill="#1a1a1a" textAnchor="middle">
            <text y="-50" fontSize="64">NE LÈVE</text>
            <text y="30" fontSize="64">PAS LES</text>
            <text y="110" fontSize="64">YEUX</text>
          </g>
        </g>,
      );
    }
  }
  // toit de la boutique et enseigne lumineuse
  el.push(boite(cam, [B.x0 - 40, B.x1 + 40], [-900, -800], [B.z0 - 0.05, B.z1], [0.5, 0.5, 0.52], L, 'btoit'));
  const ens = cam.poly([[-700, -880, B.z0 - 0.06], [700, -880, B.z0 - 0.06], [700, -810, B.z0 - 0.06], [-700, -810, B.z0 - 0.06]]);
  if (ens && cam.z < B.z0) el.push(<polygon key="ens" points={ens} fill="#c4202a" />);
  if (lit > 0.1) el.push(halo(cam, [0, -300, B.z0 - 0.3], 2200, '#e8f2ff', 0.18 * lit, 'bt-h'));
  return <g key="bout">{el}</g>;
};

// ----- dans la boutique (on regarde vers la vitrine : dehors, l'auvent, la voiture) -----
// o : boutique [4] (néons du plafond), auvent [4], dehors (items 3D dehors : créature…), caissiere (item), ecrans
export const boutiqueInt = (cam, f, o = {}) => {
  const L = {auvent: [1, 1, 1, 1], boutique: [1, 1, 1, 1], ecran: 1, ...o};
  const B = BOUT;
  // d'abord tout le dehors (vu par la vitrine)
  const ext = station(cam, f, {...o, feuille: 0});
  const fond = [ext.fond];
  const dehorsItems = ext.items.filter((it) => cam.profondeur(it.z, it.x ?? cam.x, it.y ?? cam.y) > 0 && it.z < B.z0 - 0.05 && it.el?.key !== 'bout');
  // intérieur : sol carrelé, plafond, murs latéraux et du fond
  const items = [];
  const surf = [];
  // sol
  for (let i = 0; i < 12; i++) {
    for (let j = 0; j < 7; j++) {
      const xa = B.x0 + (i * (B.x1 - B.x0)) / 12;
      const xb = B.x0 + ((i + 1) * (B.x1 - B.x0)) / 12;
      const za = B.z0 + (j * (B.z1 - B.z0)) / 7;
      const zb = B.z0 + ((j + 1) * (B.z1 - B.z0)) / 7;
      const p = cam.poly([[xa, SOL, za], [xb, SOL, za], [xb, SOL, zb], [xa, SOL, zb]]);
      if (p) surf.push(<polygon key={`t${i}${j}`} points={p} fill={teinte((i + j) % 2 ? [0.75, 0.75, 0.72] : [0.55, 0.56, 0.55], [(xa + xb) / 2, SOL, (za + zb) / 2], L)} />);
    }
  }
  // plafond
  for (let j = 0; j < 7; j++) {
    const za = B.z0 + (j * (B.z1 - B.z0)) / 7;
    const zb = B.z0 + ((j + 1) * (B.z1 - B.z0)) / 7;
    const p = cam.poly([[B.x0, B.plaf, za], [B.x1, B.plaf, za], [B.x1, B.plaf, zb], [B.x0, B.plaf, zb]]);
    if (p) surf.push(<polygon key={`pl${j}`} points={p} fill={teinte([0.7, 0.7, 0.72], [0, B.plaf, (za + zb) / 2], L)} />);
  }
  // murs latéraux et du fond
  [[B.x0, 'g'], [B.x1, 'd']].forEach(([x, k]) => {
    for (let j = 0; j < 7; j++) {
      const za = B.z0 + (j * (B.z1 - B.z0)) / 7;
      const zb = B.z0 + ((j + 1) * (B.z1 - B.z0)) / 7;
      const p = cam.poly([[x, B.plaf, za], [x, B.plaf, zb], [x, SOL, zb], [x, SOL, za]]);
      if (p) surf.push(<polygon key={`${k}${j}`} points={p} fill={teinte([0.6, 0.62, 0.6], [x, -200, (za + zb) / 2], L)} />);
    }
  });
  for (let i = 0; i < 8; i++) {
    const xa = B.x0 + (i * (B.x1 - B.x0)) / 8;
    const xb = B.x0 + ((i + 1) * (B.x1 - B.x0)) / 8;
    const p = cam.poly([[xa, B.plaf, B.z1], [xb, B.plaf, B.z1], [xb, SOL, B.z1], [xa, SOL, B.z1]]);
    if (p) surf.push(<polygon key={`f${i}`} points={p} fill={teinte([0.6, 0.62, 0.6], [(xa + xb) / 2, -200, B.z1], L)} />);
  }
  // façade vue de dedans : mur sous la vitre, montants, bandeau du haut
  const pv = (y0, y1, k) => {
    const p = cam.poly([[B.x0, y0, B.z0], [B.x1, y0, B.z0], [B.x1, y1, B.z0], [B.x0, y1, B.z0]]);
    return p ? <polygon key={k} points={p} fill={teinte([0.5, 0.5, 0.52], [0, (y0 + y1) / 2, B.z0 + 0.2], L)} /> : null;
  };
  // rayonnages, frigos, comptoir, écrans de surveillance, néons
  [-1100, -600, -100, 400].forEach((x, k) => {
    items.push({z: 6.8, x: x + 160, el: (
      <g key={`ray${k}`}>
        {boite(cam, [x, x + 320], [-200, SOL], [6.6, 7.0], [0.5, 0.5, 0.52], L, `rb${k}`)}
        {[-150, -40, 70, 180, 290].map((y, j) => boite(cam, [x + 10, x + 310], [y, y + 70], [6.58, 6.62], [[0.8, 0.3, 0.2], [0.3, 0.5, 0.8], [0.9, 0.7, 0.2], [0.4, 0.7, 0.4], [0.7, 0.3, 0.6]][(j + k) % 5], L, `pr${k}${j}`))}
      </g>
    )});
  });
  items.push({z: B.z1 - 0.2, x: -300, el: boite(cam, [-1400, 800], [-600, SOL], [B.z1 - 0.35, B.z1 - 0.05], [0.4, 0.45, 0.5], L, 'frigo')});
  // la porte de l'arrière-boutique (le générateur), avec sa veilleuse rouge
  items.push({z: B.z1 - 0.01, x: 1150, el: (
    <g key="arr">
      {(() => {
        const p = cam.poly([[980, -330, B.z1 - 0.01], [1320, -330, B.z1 - 0.01], [1320, SOL, B.z1 - 0.01], [980, SOL, B.z1 - 0.01]]);
        return p ? <polygon points={p} fill={teinte([0.35, 0.36, 0.4], [1150, 0, B.z1 - 0.3], L)} stroke="#111" strokeWidth="4" /> : null;
      })()}
      {(() => {
        const q = cam.proj(1270, 20, B.z1 - 0.02);
        const sc = cam.scale(B.z1, 1270, 20);
        return cam.z < B.z1 ? <rect x={q[0] - 12 * sc} y={q[1] - 30 * sc} width={24 * sc} height={60 * sc} rx={8 * sc} fill="#8a8c90" /> : null;
      })()}
      {boite(cam, [1100, 1200], [-420, -370], [B.z1 - 0.06, B.z1 - 0.01], [1, 0.2, 0.15], {...L, boutique: [1, 1, 1, 1]}, 'veil')}
      {halo(cam, [1150, -395, B.z1 - 0.1], 500, '#ff2a2a', 0.5 * (o.veilleuse ?? 1), 'veil-h')}
    </g>
  )});
  items.push({z: (COMPTOIR.z0 + COMPTOIR.z1) / 2, x: (COMPTOIR.x0 + COMPTOIR.x1) / 2, el: (
    <g key="cpt">
      {boite(cam, [COMPTOIR.x0, COMPTOIR.x1], [COMPTOIR.y, SOL], [COMPTOIR.z0, COMPTOIR.z1], [0.55, 0.45, 0.36], L, 'cptb')}
      {boite(cam, [COMPTOIR.x0 + 380, COMPTOIR.x0 + 520], [COMPTOIR.y - 120, COMPTOIR.y], [COMPTOIR.z0 + 0.1, COMPTOIR.z0 + 0.3], [0.15, 0.15, 0.17], L, 'caisse')}
    </g>
  )});
  NEONS_B.forEach((q, k) => items.push({z: q[2], x: q[0], y: q[1], el: tube(cam, q, L.boutique[k], `nb${k}`, 700)}));
  if (o.caissiere) items.push(o.caissiere);
  if (o.dedans) items.push(...o.dedans);
  // vitre : léger reflet de l'intérieur
  const vit = cam.poly([[B.x0, -620, B.z0], [B.x1, -620, B.z0], [B.x1, B.vitre, B.z0], [B.x0, B.vitre, B.z0]]);
  const facade = (
    <g key="fac">
      {vit && <polygon points={vit} fill="#dfe8ff" opacity={0.05 + 0.05 * (L.boutique.reduce((a, b) => a + b, 0) / 4)} />}
      {pv(B.plaf, -620, 'fh')}
      {pv(B.vitre, SOL, 'fb')}
      {[...Array(7)].map((_, k) => {
        const x = B.x0 + k * 500;
        const p = cam.poly([[x - 18, -620, B.z0 + 0.004], [x + 18, -620, B.z0 + 0.004], [x + 18, B.vitre, B.z0 + 0.004], [x - 18, B.vitre, B.z0 + 0.004]]);
        return p ? <polygon key={k} points={p} fill="#1e2024" /> : null;
      })}
    </g>
  );
  return {fond: <g key="fondI">{fond}{/* le dehors vu à travers */}</g>, dehors: dehorsItems, surf: <g key="surf">{surf}</g>, facade, items, L};
};
