import {random} from 'remotion';

// ===================== La forêt au crépuscule puis de nuit (« Rentrez chez vous ») =====================
// Sentier droit selon Z (X ≈ 0, ±300), sol à SOL. Troncs hauts (la canopée sort du cadre), toujours tournés vers la caméra.
// Ambiance : `nuit` 0 (soleil couchant orange-rose) → 1 (lune froide bleu-violet). La lumière principale est un halo
// lointain dans la direction `lumYaw` (degrés) : les troncs sont en contre-jour, avec un liseré clair côté lumière,
// et se fondent dans la brume avec la distance (perspective atmosphérique). Style épuré, sans contour noir.
export const SOL = 432;
export const OEIL = -150; // hauteur des yeux debout
export const ACCROUPI = 170; // hauteur des yeux accroupi
export const CHENE = {x: 760, z: 20.0, r: 330};
export const DEUX = [{x: -420, z: 6.6}, {x: 430, z: 6.5}]; // les deux arbres entre lesquels elle apparaît
export const LAMPE = {x: -420, y: -60, z: 36};

const R = (s) => random(s);
const borne = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
export const rgb = (c, k = 1) => `rgb(${c.map((v) => Math.round(borne(v * k, 0, 255))).join(',')})`;

export const palette = (nuit) => ({
  ciel: mix([16, 11, 22], [5, 5, 12], nuit),
  brume: mix([122, 90, 110], [44, 46, 76], nuit),
  halo: mix([255, 164, 112], [150, 166, 255], nuit),
  tronc: mix([30, 21, 27], [10, 10, 18], nuit),
  sol: mix([30, 22, 26], [10, 10, 17], nuit),
  chemin: mix([82, 62, 62], [36, 36, 52], nuit),
  rim: mix([255, 196, 150], [196, 206, 255], nuit),
  feuille: mix([96, 52, 34], [50, 46, 62], nuit),
});

// ----- génération déterministe de la forêt -----
export const ARBRES = (() => {
  const out = [];
  for (let i = 0; i < 560; i++) {
    const z = -24 + R(`az${i}`) * 84;
    const x = (R(`ax${i}`) - 0.5) * 10000;
    const r = 70 + R(`ar${i}`) ** 2 * 230;
    if (Math.abs(x) < 400 + r) continue; // le sentier reste dégagé
    if (Math.abs(x - CHENE.x) < 1500 && Math.abs(z - CHENE.z) < 2.6) continue; // autour du gros chêne
    if (Math.abs(x) < 900 && z > 5.8 && z < 7.4) continue; // autour des deux arbres du face-à-face
    if (Math.abs(x - LAMPE.x) < 900 && Math.abs(z - LAMPE.z) < 2) continue;
    out.push({x, z, r, br: Math.floor(R(`ab${i}`) * 3.2), s: i, pench: (R(`ap${i}`) - 0.5) * 0.08});
  }
  DEUX.forEach((d, k) => out.push({...d, r: 175, br: 2, s: 900 + k, pench: k ? 0.03 : -0.03}));
  out.push({...CHENE, br: 3, s: 999, pench: 0, chene: true});
  return out;
})();
const FEUILLES = [...Array(3600)].map((_, i) => ({
  x: (R(`fx${i}`) - 0.5) * (i % 2 ? 1400 : 5200),
  z: -24 + R(`fz${i}`) * 84,
  r: 22 + R(`fr${i}`) * 26,
  a: R(`fa${i}`) * 180,
  t: R(`ft${i}`),
}));
const BUISSONS = [...Array(260)]
  .map((_, i) => {
    const cote = R(`bc${i}`) > 0.5 ? 1 : -1;
    return {x: cote * (420 + R(`bx${i}`) * 3800), z: -24 + R(`bz${i}`) * 84, r: 160 + R(`br${i}`) * 260, s: i};
  })
  .filter((b) => !(Math.abs(b.x - CHENE.x) < 700 && Math.abs(b.z - CHENE.z) < 1.2));

// point du ciel où se trouve la lumière (très loin dans la direction lumYaw)
const pointLumiere = (cam, lumYaw, lumY) => {
  const a = (lumYaw * Math.PI) / 180;
  const p = cam.proj(cam.x + Math.sin(a) * 4e6, lumY * 400, cam.z + Math.cos(a) * 4000);
  const devant = cam.profondeur(cam.z + Math.cos(a) * 4000, cam.x + Math.sin(a) * 4e6, cam.y) > 0;
  return {x: p[0], y: p[1], devant};
};

// axe horizontal perpendiculaire à la ligne de visée (les troncs font face à la caméra)
const travers = (cam, x, z) => {
  const vx = x - cam.x;
  const vz = (z - cam.z) * 1000;
  const L = Math.hypot(vx, vz) || 1;
  return [vz / L, -vx / L];
};

// ----- un tronc (billboard vertical) -----
const tronc = (cam, a, P, L, opts) => {
  const dd = cam.profondeur(a.z, a.x, -400);
  if (dd < 0.05 || dd > 46) return null;
  const sx = cam.proj(a.x, -400, a.z)[0];
  const marge = (a.r * 1.6) / Math.max(dd, 0.05);
  if (sx + marge < -200 || sx - marge > 1280) return null;
  const [px, pz] = travers(cam, a.x, a.z);
  const H = a.chene ? -9000 : -9500;
  const pt = (u, y) => {
    const h = borne((SOL - y) / 9000);
    const evase = 1 + 0.45 * Math.max(0, 1 - (SOL - y) / 260) ** 2; // pied évasé
    const rr = a.r * (1 - 0.3 * h) * evase;
    const wob = (a.chene ? 0.08 : 0.04) * Math.sin(y / 700 + a.s);
    return [a.x + px * (u + wob) * rr + a.pench * (SOL - y), y, a.z + (pz * (u + wob) * rr) / 1000];
  };
  const ys = [SOL + 30, SOL - 120, SOL - 500, -900, -2400, -4600, H];
  const bord = (u) => ys.map((y) => pt(u, y));
  const contour = [...bord(-1), ...bord(1).reverse()];
  const brume = 1 - Math.exp(-dd / opts.portee);
  const col = mix(P.tronc, P.brume, brume * 0.94);
  const poly = cam.poly(contour);
  if (!poly) return null;
  // liseré côté lumière (contre-jour), plus fort à moyenne distance
  const cote = L.x > sx ? 1 : -1;
  const rimK = opts.rim * (1 - brume) * borne(1.4 - Math.abs(L.x - sx) / 900) * (L.devant ? 1 : 0.35);
  const lis = rimK > 0.02 ? cam.poly([...ys.map((y) => pt(cote * 0.97, y)), ...ys.map((y) => pt(cote * 0.62, y)).reverse()]) : '';
  const lis2 = rimK > 0.02 ? cam.poly([...ys.map((y) => pt(cote * 0.995, y)), ...ys.map((y) => pt(cote * 0.9, y)).reverse()]) : '';
  // branches
  const branches = [];
  for (let b = 0; b < a.br; b++) {
    const yb = -1300 - R(`by${a.s}${b}`) * 3600;
    const s = R(`bs${a.s}${b}`) > 0.5 ? 1 : -1;
    const len = (1.6 + R(`bl${a.s}${b}`) * 2.8) * (a.chene ? 1.6 : 1);
    const b0 = pt(s * 0.8, yb);
    const b1 = pt(s * 0.8, yb - a.r * 0.5);
    const tip = pt(s * (0.8 + len), yb - a.r * len * 0.75);
    const mid = pt(s * (0.8 + len * 0.55), yb - a.r * len * 0.36);
    const p = cam.poly([b0, mid, tip, pt(s * (0.8 + len * 0.5), yb - a.r * len * 0.5), b1]);
    if (p) branches.push(<polygon key={b} points={p} fill={rgb(col)} />);
  }
  // écorce (seulement de près)
  const ecorce = [];
  if (dd < (a.chene ? 3.5 : 2.2)) {
    const n = a.chene ? 9 : 5;
    for (let j = 0; j < n; j++) {
      const u = -0.85 + (1.7 * (j + R(`eu${a.s}${j}`) * 0.6)) / n;
      const pts = [];
      for (let y = SOL + 20; y > -3000; y -= 160) {
        const p = cam.proj(...pt(u + 0.05 * Math.sin(y / 230 + j * 1.7), y));
        pts.push(p.join(','));
      }
      if (cam.profondeur(a.z, a.x, 0) > 0.06) ecorce.push(<polyline key={j} points={pts.join(' ')} fill="none" stroke="#000" strokeOpacity={0.35} strokeWidth={(a.chene ? 26 : 16) / dd} />);
    }
  }
  return {
    z: a.z,
    x: a.x,
    el: (
      <g key={`t${a.s}`}>
        {branches}
        <polygon points={poly} fill={rgb(col)} />
        {ecorce}
        {lis && <polygon points={lis} fill={rgb(P.rim)} opacity={0.16 * rimK} />}
        {lis2 && <polygon points={lis2} fill={rgb(P.rim)} opacity={0.5 * rimK} />}
      </g>
    ),
  };
};

// ----- buisson / fougère basse -----
const buisson = (cam, b, P, L, opts) => {
  const dd = cam.profondeur(b.z, b.x, SOL - 100);
  if (dd < 2.2 || dd > 22) return null; // trop près, un buisson n'est plus qu'une tache
  const [cx, cy] = cam.proj(b.x, SOL + 10, b.z);
  const s = 1 / dd;
  if (cx < -b.r * s * 2 || cx > 1080 + b.r * s * 2) return null;
  const brume = 1 - Math.exp(-dd / opts.portee);
  const col = mix(mix(P.tronc, [24, 30, 30], 0.3), P.brume, brume * 0.9);
  const cote = L.x > cx ? 1 : -1;
  const blobs = [...Array(13)].map((_, k) => ({
    x: (R(`bbx${b.s}${k}`) - 0.5) * 1.8 * b.r,
    y: -R(`bby${b.s}${k}`) * b.r * 0.85 * (1 - Math.abs(R(`bbx${b.s}${k}`) - 0.5)),
    r: b.r * (0.22 + R(`bbr${b.s}${k}`) * 0.25),
    a: R(`bba${b.s}${k}`) * 60 - 30,
  }));
  return {
    z: b.z,
    x: b.x,
    el: (
      <g key={`b${b.s}`} transform={`translate(${cx} ${cy}) scale(${s})`}>
        {blobs.map((o, k) => (
          <ellipse key={k} cx={o.x} cy={o.y} rx={o.r * 1.5} ry={o.r * 0.55} transform={`rotate(${o.a} ${o.x} ${o.y})`} fill={rgb(col)} />
        ))}
        {blobs.map((o, k) => (
          <ellipse key={`r${k}`} cx={o.x + cote * o.r * 0.6} cy={o.y - o.r * 0.3} rx={o.r * 0.8} ry={o.r * 0.12} transform={`rotate(${o.a} ${o.x} ${o.y})`} fill={rgb(P.rim)} opacity={0.07 * opts.rim * (1 - brume)} />
        ))}
      </g>
    ),
  };
};

// ----- bandes de brume entre les arbres (elles suivent le regard, à distances fixes) -----
const bandeBrume = (cam, d, P, k, f, op) => {
  const a = ((cam.yaw || 0) * Math.PI) / 180;
  const x = cam.x + Math.sin(a) * d * 1000;
  const z = cam.z + Math.cos(a) * d;
  const yS = cam.proj(x, SOL, z)[1];
  const h = 2600 / d;
  const id = `bb${k}`;
  return {
    z,
    x,
    el: (
      <g key={id}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={rgb(P.brume)} stopOpacity="0" />
            <stop offset="0.7" stopColor={rgb(P.brume)} stopOpacity={0.3 * op} />
            <stop offset="1" stopColor={rgb(P.brume)} stopOpacity={0.12 * op} />
          </linearGradient>
          <radialGradient id={`${id}n`}>
            <stop offset="0" stopColor={rgb(P.brume)} stopOpacity={0.22 * op} />
            <stop offset="1" stopColor={rgb(P.brume)} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="-300" y={yS - h} width="1680" height={h + 260 / d} fill={`url(#${id})`} />
        {[0, 1, 2].map((j) => {
          const dx = ((f * (0.6 + j * 0.25) + j * 500 + k * 300) % 2200) - 560;
          return <ellipse key={j} cx={dx} cy={yS - h * 0.25} rx={900 / Math.sqrt(d)} ry={h * 0.28} fill={`url(#${id}n)`} />;
        })}
      </g>
    ),
  };
};

// ----- la forêt complète -----
// opts : nuit, lumYaw, lumY (hauteur de la lumière, + = plus bas), rim, portee (distance de brume), brume, rayons, f
export const foret = (cam, f, o = {}) => {
  const opts = {nuit: 0, lumYaw: 8, lumY: -1.2, rim: 1, portee: 11, brume: 1, rayons: 1, poussiere: 1, haloK: 1, ...o};
  const P = palette(opts.nuit);
  const L = pointLumiere(cam, opts.lumYaw, opts.lumY);
  const hor = cam.fuite[1];
  const id = 'fn';
  const fond = (
    <g key="fond">
      <defs>
        <linearGradient id={`${id}-ciel`} x1="0" y1="0" x2="0" y2="1920" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={rgb(P.ciel)} />
          <stop offset={borne((hor - 700) / 1920)} stopColor={rgb(mix(P.ciel, P.brume, 0.45))} />
          <stop offset={borne(hor / 1920)} stopColor={rgb(P.brume)} />
          <stop offset="1" stopColor={rgb(P.sol)} />
        </linearGradient>
        <radialGradient id={`${id}-halo`} cx={L.x} cy={L.y} r="1050" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={rgb(mix(P.halo, [255, 255, 255], 0.55))} stopOpacity={0.95 * opts.haloK} />
          <stop offset="0.08" stopColor={rgb(P.halo)} stopOpacity={0.7 * opts.haloK} />
          <stop offset="0.35" stopColor={rgb(P.halo)} stopOpacity={0.22 * opts.haloK} />
          <stop offset="1" stopColor={rgb(P.halo)} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-sol`} x1="0" y1={hor} x2="0" y2="1920" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={rgb(mix(P.sol, P.brume, 0.85))} />
          <stop offset="0.25" stopColor={rgb(mix(P.sol, P.brume, 0.35))} />
          <stop offset="1" stopColor={rgb(P.sol)} />
        </linearGradient>
        <linearGradient id={`${id}-chemin`} x1="0" y1={hor} x2="0" y2="1920" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={rgb(mix(P.chemin, P.brume, 0.8))} />
          <stop offset="0.3" stopColor={rgb(mix(P.chemin, P.brume, 0.3))} />
          <stop offset="1" stopColor={rgb(P.chemin, 0.8)} />
        </linearGradient>
        <linearGradient id={`${id}-rayon`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={rgb(P.halo)} stopOpacity="0.16" />
          <stop offset="0.5" stopColor={rgb(P.halo)} stopOpacity="0.05" />
          <stop offset="1" stopColor={rgb(P.halo)} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="-400" y="-600" width="1880" height="3100" fill={`url(#${id}-ciel)`} />
      {L.devant && <rect x="-400" y="-600" width="1880" height="3100" fill={`url(#${id}-halo)`} />}
      {sol(cam, id)}
    </g>
  );
  // rayons de lumière (derrière les troncs proches)
  const rayons = L.devant && opts.rayons > 0
    ? [-2, -1, 0, 1, 2, 3].map((j) => {
        const a = (j * 13 - 6 + 2 * Math.sin(f / 90 + j)) * (Math.PI / 180);
        const l = 1500;
        const w = 0.04 + 0.03 * R(`ry${j}`);
        const p = [[L.x, L.y], [L.x + Math.sin(a - w) * l, L.y + Math.cos(a - w) * l], [L.x + Math.sin(a + w) * l, L.y + Math.cos(a + w) * l]];
        return <polygon key={`ry${j}`} points={p.map((q) => q.join(',')).join(' ')} fill={`url(#${id}-rayon)`} opacity={opts.rayons * (0.5 + 0.5 * Math.sin(f / 40 + j * 2))} />;
      })
    : null;
  const items = [];
  // couloirs dégagés (ligne de vue vers la lampe, la créature…) : [x0, z0, x1, z1, demi-largeur]
  const bloque = (a) =>
    (opts.degage || []).some(([x0, z0, x1, z1, w]) => {
      const t = Math.min(1, Math.max(0, (a.z - z0) / (z1 - z0 || 1e-6)));
      return a.z > Math.min(z0, z1) - 0.3 && a.z < Math.max(z0, z1) + 0.3 && Math.abs(a.x - (x0 + (x1 - x0) * t)) < w + a.r && !a.chene;
    });
  ARBRES.forEach((a) => {
    if (bloque(a)) return;
    const t = tronc(cam, a, P, L, opts);
    if (t) items.push(t);
  });
  BUISSONS.forEach((b) => {
    const t = buisson(cam, b, P, L, opts);
    if (t) items.push(t);
  });
  if (opts.brume > 0) [1.6, 3.2, 5.5, 9, 14, 22].forEach((d, k) => items.push(bandeBrume(cam, d, P, k, f, opts.brume)));
  // feuilles mortes au sol (donnent la sensation d'avancer)
  const feuilles = [];
  FEUILLES.forEach((l, k) => {
    if (Math.abs(l.z - cam.z) > 7) return;
    const dd = cam.profondeur(l.z, l.x, SOL);
    if (dd < 0.1 || dd > 6.5) return;
    const [x, y] = cam.proj(l.x, SOL, l.z);
    if (x < -60 || x > 1140 || y > 2000) return;
    const brume = 1 - Math.exp(-dd / opts.portee);
    const c = mix(mix(P.feuille, P.sol, l.t * 0.6), P.brume, brume);
    feuilles.push(<ellipse key={k} cx={x} cy={y} rx={l.r / dd} ry={(l.r * 0.32) / dd} transform={`rotate(${l.a * 0.15 - 12} ${x} ${y})`} fill={rgb(c)} />);
  });
  // poussière en suspension dans la lumière
  const pous = opts.poussiere > 0
    ? [...Array(26)].map((_, k) => {
        const x = (R(`px${k}`) * 1300 - 110 + f * (0.4 + R(`pv${k}`) * 0.5)) % 1300 - 110;
        const y = (R(`py${k}`) * 2000 + Math.sin(f / 30 + k) * 30 - f * 0.25) % 2000;
        const yy = y < 0 ? y + 2000 : y;
        const proche = borne(1 - Math.hypot(x - L.x, yy - L.y) / 1100);
        return <circle key={`p${k}`} cx={x} cy={yy} r={1.5 + R(`pr${k}`) * 2.5} fill={rgb(mix(P.halo, [255, 255, 255], 0.4))} opacity={opts.poussiere * (0.12 + 0.6 * proche) * (0.5 + 0.5 * Math.sin(f / 9 + k))} />;
      })
    : null;
  return {
    fond,
    brume: (
      <g key="brume">
        {feuilles}
        <defs>
          <clipPath id={`${id}-air`}>
            <rect x="-400" y="-600" width="1880" height={Math.max(0, hor + 600 + 60)} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${id}-air)`}>{rayons}</g>
      </g>
    ),
    items,
    poussiere: pous,
    L,
    P,
  };
};

// sol + sentier (polygones découpés au plan proche)
const sol = (cam, id) => {
  const zc = cam.z;
  const s = cam.poly([[-40000, SOL, zc - 50], [40000, SOL, zc - 50], [40000, SOL, zc + 50], [-40000, SOL, zc + 50]]);
  // le sentier : morceaux successifs pour garder un bord sinueux
  const morceaux = [];
  const z0 = Math.floor(zc) - 30;
  for (let z = z0; z < zc + 46; z += 1) {
    const g = (zz) => -300 + 70 * Math.sin(zz * 0.7) + 30 * Math.sin(zz * 2.3);
    const d = (zz) => 300 + 70 * Math.sin(zz * 0.9 + 1) + 30 * Math.sin(zz * 1.9 + 2);
    const p = cam.poly([[g(z), SOL, z], [d(z), SOL, z], [d(z + 1), SOL, z + 1], [g(z + 1), SOL, z + 1]]);
    if (p) morceaux.push(<polygon key={z} points={p} fill={`url(#${id}-chemin)`} stroke={`url(#${id}-chemin)`} strokeWidth="1.5" />);
  }
  return (
    <g>
      {s && <polygon points={s} fill={`url(#${id}-sol)`} />}
      {morceaux}
    </g>
  );
};

// voile lumineux par-dessus (diffusion de la lumière dans la brume, « bloom » doux)
export const Voile = ({L, P, k = 1, id = 'fnv'}) =>
  L.devant ? (
    <g>
      <defs>
        <radialGradient id={id} cx={L.x} cy={L.y} r="900" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={rgb(P.halo)} stopOpacity={0.32 * k} />
          <stop offset="0.4" stopColor={rgb(P.halo)} stopOpacity={0.1 * k} />
          <stop offset="1" stopColor={rgb(P.halo)} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1080" height="1920" fill={`url(#${id})`} />
    </g>
  ) : null;
