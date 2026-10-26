// ===================== L'alien en vraie 3D (« Le vaisseau ») =====================
// Grand (≈ 3 m = 1100 unités à echelle 1), noir brillant, tête allongée vers l'arrière, mâchoire qui s'ouvre,
// longs doigts, queue, tubes dorsaux, deux yeux qui brillent. Dessiné en volumes (boules + os effilés) triés en profondeur.
// Repère local : x à sa droite, y vers le bas (pieds à 0), z devant lui. angle : 0 = il regarde vers +Z, 180 = vers −Z.
// Options : gueule 0 → 1 (mâchoire ouverte, langue-mâchoire qui sort), penche (tête penchée, degrés), elan 0 → 1 (se penche
// et tend les bras vers l'avant), rampe 0 → 1 (à quatre pattes), souffle (respiration), yeux 0 → 1, tete (seule la tête :
// {dir: [x, y, z]} dans le repère monde, pour le screamer de la grille), f (temps).

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const croix = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norme = (a) => mul(a, 1 / (Math.hypot(...a) || 1));
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const rotY = (p, deg) => {
  const r = (deg * Math.PI) / 180;
  return [p[0] * Math.cos(r) + p[2] * Math.sin(r), p[1], -p[0] * Math.sin(r) + p[2] * Math.cos(r)];
};
const rotAxe = (v, axe, a) => {
  // rotation de Rodrigues
  const k = norme(axe);
  return add(add(mul(v, Math.cos(a)), mul(croix(k, v), Math.sin(a))), mul(k, dot(k, v) * (1 - Math.cos(a))));
};

const NOIR = '#0c0e12';
const NOIR2 = '#1a1e26';
const REFLET = '#7a8ca0';

// squelette (repère local), selon la pose
const squelette = (f, {elan = 0, rampe = 0, souffle = 1}) => {
  const b = Math.sin(f / 9) * 10 * souffle;
  const S = {
    bassin: [0, -560, 0],
    ventre: [0, -700, 10],
    poitrine: [0, -850 + b, 20],
    cou: [0, -960 + b, 50],
    tete: [0, -1010 + b, 110],
    epauleG: [-120, -880 + b, 10],
    epauleD: [120, -880 + b, 10],
    coudeG: [-210, -650, -40],
    coudeD: [210, -650, -40],
    mainG: [-190, -420, 60],
    mainD: [190, -420, 60],
    hancheG: [-70, -560, 0],
    hancheD: [70, -560, 0],
    genouG: [-90, -330, 120],
    genouD: [90, -330, 120],
    chevilleG: [-90, -120, -60],
    chevilleD: [90, -120, -60],
    piedG: [-95, 0, 40],
    piedD: [95, 0, 40],
  };
  // élan : buste en avant, bras tendus vers l'avant (vers la caméra)
  if (elan > 0) {
    const e = elan;
    S.poitrine = mix(S.poitrine, [0, -800, 220], e);
    S.cou = mix(S.cou, [0, -860, 380], e);
    S.tete = mix(S.tete, [0, -880, 520], e);
    S.epauleG = mix(S.epauleG, [-130, -830, 220], e);
    S.epauleD = mix(S.epauleD, [130, -830, 220], e);
    S.coudeG = mix(S.coudeG, [-260, -820, 470], e);
    S.coudeD = mix(S.coudeD, [260, -820, 470], e);
    S.mainG = mix(S.mainG, [-230, -880, 760], e);
    S.mainD = mix(S.mainD, [230, -880, 760], e);
  }
  // rampe : à quatre pattes, tête en avant, au ras du sol
  if (rampe > 0) {
    const g = (ph) => Math.sin(f / 3 + ph);
    const R = {
      bassin: [0, -380, -280],
      ventre: [0, -400, -80],
      poitrine: [0, -420, 160],
      cou: [0, -440, 330],
      tete: [0, -430, 470],
      epauleG: [-150, -420, 160],
      epauleD: [150, -420, 160],
      coudeG: [-330, -560 - 60 * Math.abs(g(0)), 330 + 60 * g(0)],
      coudeD: [330, -560 - 60 * Math.abs(g(Math.PI)), 330 + 60 * g(Math.PI)],
      mainG: [-300, 0, 560 + 110 * g(0)],
      mainD: [300, 0, 560 + 110 * g(Math.PI)],
      hancheG: [-90, -380, -280],
      hancheD: [90, -380, -280],
      genouG: [-260, -520 - 40 * Math.abs(g(1.6)), -140 + 60 * g(1.6)],
      genouD: [260, -520 - 40 * Math.abs(g(-1.6)), -140 + 60 * g(-1.6)],
      chevilleG: [-280, -160, -420],
      chevilleD: [280, -160, -420],
      piedG: [-290, 0, -330 + 100 * g(1.6)],
      piedD: [290, 0, -330 + 100 * g(-1.6)],
    };
    Object.keys(S).forEach((k) => (S[k] = mix(S[k], R[k], rampe)));
  }
  return S;
};

export const alien3D = (cam, {x, z, y = 432, angle = 180, echelle = 1, f = 0, gueule = 0, penche = 0, elan = 0, rampe = 0, souffle = 1, yeux = 1, tete = null, id = 'al'}) => {
  const base = [x, y, z * 1000];
  const vue = [cam.x, cam.y, cam.z * 1000];
  const pr = (p) => cam.proj(p[0], p[1], p[2] / 1000);
  const vis = (p) => cam.visible(p[2] / 1000, p[0], p[1]);
  const sc = (p) => 1 / Math.max(0.12, cam.profondeur(p[2] / 1000, p[0], p[1]));
  const prof = (p) => cam.profondeur(p[2] / 1000, p[0], p[1]);
  const L = []; // {d, el}
  const boule = (p, r, key, fill = `url(#${id}-b)`, extra = {}) => {
    if (!vis(p)) return;
    const q = pr(p);
    L.push({d: prof(p) + (extra.biais || 0), el: <circle key={key} cx={q[0]} cy={q[1]} r={Math.max(1, r * echelle * sc(p))} fill={fill} />});
  };
  const os = (A, B, r0, r1, key, col = NOIR) => {
    if (!vis(A) || !vis(B)) return;
    const a = pr(A);
    const b = pr(B);
    const sa = r0 * 1.45 * echelle * sc(A);
    const sb = r1 * 1.45 * echelle * sc(B);
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const n = Math.hypot(dx, dy) || 1;
    const nx = -dy / n;
    const ny = dx / n;
    const m = mul(add(A, B), 0.5);
    L.push({
      d: prof(m),
      el: (
        <g key={key}>
          <polygon points={`${a[0] + nx * sa},${a[1] + ny * sa} ${b[0] + nx * sb},${b[1] + ny * sb} ${b[0] - nx * sb},${b[1] - ny * sb} ${a[0] - nx * sa},${a[1] - ny * sa}`} fill={col} />
          <circle cx={a[0]} cy={a[1]} r={sa} fill={col} />
          <circle cx={b[0]} cy={b[1]} r={sb} fill={col} />
          <line x1={a[0] + nx * sa * 0.45} y1={a[1] + ny * sa * 0.45} x2={b[0] + nx * sb * 0.45} y2={b[1] + ny * sb * 0.45} stroke={REFLET} strokeWidth={Math.max(0.6, Math.min(sa, sb) * 0.25)} strokeLinecap="round" opacity="0.35" />
        </g>
      ),
    });
  };

  // la tête : une suite de boules le long d'un crâne courbé vers l'arrière, + mâchoire + yeux
  const dessinerTete = (T, dir, haut) => {
    // dir : vers l'avant du museau ; haut : vers le haut du crâne
    const arriere = mul(dir, -1);
    const pa = (penche * Math.PI) / 180;
    const h = rotAxe(haut, dir, pa);
    const droite = norme(croix(dir, h));
    // crâne : de la bouche vers l'arrière et le haut, en se courbant
    const N = 9;
    for (let k = 0; k < N; k++) {
      const t = k / (N - 1);
      const p = add(add(T, mul(arriere, (-60 + 430 * t) * echelle)), mul(h, (20 + 170 * t * t) * echelle));
      boule(p, 95 - 45 * t + (k === 1 ? 10 : 0), `cr${k}`);
    }
    // museau / lèvre supérieure
    const museau = add(T, mul(dir, 70 * echelle));
    boule(museau, 62, 'mu');
    // mâchoire inférieure (descend quand la gueule s'ouvre)
    const ouv = gueule * 0.9;
    const mDir = norme(rotAxe(dir, droite, ouv));
    const machoire = add(add(T, mul(h, -50 * echelle)), mul(mDir, 60 * echelle));
    boule(machoire, 52, 'ma', `url(#${id}-b)`, {biais: -0.002});
    // intérieur de la gueule, dents, langue-mâchoire
    if (gueule > 0.05) {
      const centre = add(add(T, mul(dir, 80 * echelle)), mul(h, -40 * echelle * (1 + gueule)));
      if (vis(centre)) {
        const q = pr(centre);
        const s = sc(centre) * echelle;
        const dents = [...Array(12)].map((_, k) => {
          const a = (k / 12) * 2 * Math.PI;
          const rx = 46 * s;
          const ry = 40 * s * (0.4 + gueule);
          const px = q[0] + Math.cos(a) * rx;
          const py = q[1] + Math.sin(a) * ry;
          return <polygon key={k} points={`${px - 6 * s},${py} ${px + 6 * s},${py} ${q[0] + (px - q[0]) * 0.55},${q[1] + (py - q[1]) * 0.55}`} fill="#e8e4d0" />;
        });
        const langue = add(centre, mul(dir, 140 * echelle * gueule));
        const ql = pr(langue);
        L.push({
          d: prof(centre) - 0.003,
          el: (
            <g key="gueule">
              <ellipse cx={q[0]} cy={q[1]} rx={50 * s} ry={42 * s * (0.4 + gueule)} fill="#2a0408" />
              {dents}
              <line x1={q[0]} y1={q[1]} x2={ql[0]} y2={ql[1]} stroke="#3a0a10" strokeWidth={Math.max(1, 26 * s)} strokeLinecap="round" />
              <circle cx={ql[0]} cy={ql[1]} r={Math.max(1, 20 * s)} fill="#e8e4d0" />
              {[-1, 1].map((c) => (
                <path key={c} d={`M${q[0] + c * 20 * s},${q[1] + 30 * s} q${c * 4},${(50 + 20 * Math.sin(f / 5 + c)) * s} 0,${(90 + 30 * Math.sin(f / 5 + c)) * s}`} stroke="#c8d8d0" strokeWidth={Math.max(1, 5 * s)} fill="none" opacity="0.65" />
              ))}
            </g>
          ),
        });
      }
    }
    // les yeux qui brillent (de chaque côté du museau)
    if (yeux > 0) {
      [-1, 1].forEach((c) => {
        const e = add(add(add(T, mul(dir, 30 * echelle)), mul(droite, c * 58 * echelle)), mul(h, 32 * echelle));
        if (!vis(e) || dot(sub(vue, e), add(dir, mul(droite, c * 0.6))) < 0) return;
        const q = pr(e);
        const s = sc(e) * echelle;
        L.push({
          d: prof(e) - 0.004,
          el: (
            <g key={`oe${c}`} opacity={yeux}>
              <circle cx={q[0]} cy={q[1]} r={60 * s} fill={`url(#${id}-oeil)`} />
              <ellipse cx={q[0]} cy={q[1]} rx={16 * s} ry={10 * s} fill="#eaffb0" />
              <ellipse cx={q[0]} cy={q[1]} rx={4 * s} ry={9 * s} fill="#1a2a00" />
            </g>
          ),
        });
      });
    }
  };

  let defs = (
    <defs key="defs">
      <radialGradient id={`${id}-b`} cx="35%" cy="30%" r="75%">
        <stop offset="0" stopColor={REFLET} />
        <stop offset="0.3" stopColor="#262c36" />
        <stop offset="1" stopColor="#030406" />
      </radialGradient>
      <radialGradient id={`${id}-oeil`}>
        <stop offset="0" stopColor="#f4ff9a" stopOpacity="0.95" />
        <stop offset="0.3" stopColor="#b8ff2a" stopOpacity="0.5" />
        <stop offset="1" stopColor="#6aff00" stopOpacity="0" />
      </radialGradient>
    </defs>
  );

  if (tete) {
    // seulement la tête (et un bout de cou), position monde x, y, z, orientée selon tete.dir
    const T = [x, y, z * 1000];
    const dir = norme(tete.dir);
    const haut = norme(tete.haut || (Math.abs(dir[1]) > 0.9 ? [0, 0, -1] : [0, -1, 0]));
    for (let k = 1; k <= 4; k++) os(add(T, mul(dir, -k * 120 * echelle)), add(T, mul(dir, -(k + 1) * 120 * echelle)), 48, 44, `cou${k}`);
    dessinerTete(T, dir, haut);
    L.sort((a, b) => b.d - a.d);
    return {z, el: <g key={id}>{defs}{L.map((l) => l.el)}</g>};
  }

  const J = squelette(f, {elan, rampe, souffle});
  const monde = (p) => add(base, rotY(mul(p, echelle), angle));
  const W = Object.fromEntries(Object.entries(J).map(([k, p]) => [k, monde(p)]));
  const avant = norme(rotY([0, 0, 1], angle));
  const cote = norme(rotY([1, 0, 0], angle));
  // jambes (digitigrades), bras longs
  [['hancheG', 'genouG', 58, 40], ['genouG', 'chevilleG', 40, 26], ['chevilleG', 'piedG', 26, 20], ['hancheD', 'genouD', 58, 40], ['genouD', 'chevilleD', 40, 26], ['chevilleD', 'piedD', 26, 20],
    ['epauleG', 'coudeG', 40, 30], ['coudeG', 'mainG', 30, 22], ['epauleD', 'coudeD', 40, 30], ['coudeD', 'mainD', 30, 22]].forEach(([a, b, r0, r1], k) => os(W[a], W[b], r0, r1, `m${k}`));
  // doigts longs et griffus
  [['mainG', 'coudeG'], ['mainD', 'coudeD']].forEach(([m, c], j) => {
    const d = norme(sub(W[m], W[c]));
    const lat = norme(croix(d, [0, 1, 0.01]));
    [-1, 0, 1].forEach((k) => os(W[m], add(add(W[m], mul(d, 170 * echelle)), mul(lat, k * 55 * echelle)), 14, 5, `d${j}${k}`, NOIR2));
  });
  // colonne : bassin → ventre → poitrine → cou, avec côtes
  os(W.bassin, W.ventre, 80, 72, 'c1');
  os(W.ventre, W.poitrine, 72, 95, 'c2');
  os(W.poitrine, W.cou, 60, 40, 'c3');
  os(W.epauleG, W.epauleD, 44, 44, 'ep');
  for (let k = 0; k < 4; k++) {
    const p = mix(W.ventre, W.poitrine, 0.2 + k * 0.22);
    [-1, 1].forEach((c) => os(p, add(add(p, mul(cote, c * 95 * echelle)), mul(avant, 40 * echelle)), 16, 10, `cote${k}${c}`, NOIR2));
  }
  // tubes dorsaux
  [-1, 1].forEach((c) => {
    const p = add(add(W.poitrine, mul(cote, c * 55 * echelle)), mul(avant, -50 * echelle));
    os(p, add(add(p, mul(avant, -200 * echelle)), [0, -140 * echelle, 0]), 24, 14, `tub${c}`, NOIR2);
  });
  // queue : chaîne de boules qui ondule
  let q0 = W.bassin;
  for (let k = 1; k <= 12; k++) {
    const t = k / 12;
    const p = add(add(add(W.bassin, mul(avant, -170 * k * echelle)), [0, (120 * t * t - 40 * t) * echelle * (1 - rampe * 0.5) + 520 * echelle * t * (1 - rampe), 0]), mul(cote, Math.sin(f / 10 + k * 0.6) * 60 * t * echelle));
    os(q0, p, 40 - 30 * t, 38 - 32 * t, `q${k}`);
    q0 = p;
  }
  // la tête
  const dirTete = norme(add(mul(avant, 1), [0, 0.15 - elan * 0.1, 0]));
  dessinerTete(W.tete, dirTete, [0, -1, 0]);
  L.sort((a, b) => b.d - a.d);
  const ombre = [W.bassin[0], y, W.bassin[2]];
  const qo = vis(ombre) ? pr(ombre) : null;
  return {
    z: W.bassin[2] / 1000,
    el: (
      <g key={id}>
        {defs}
        {qo && <ellipse cx={qo[0]} cy={qo[1]} rx={330 * echelle * sc(ombre)} ry={60 * echelle * sc(ombre)} fill="#000" opacity="0.55" />}
        {L.map((l) => l.el)}
      </g>
    ),
  };
};
