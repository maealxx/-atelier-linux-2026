// ===================== La créature de la forêt (« Rentrez chez vous ») =====================
// Grande silhouette maigre, gris pâle, liseré blanc (contre-jour), orbites noires vides, bras beaucoup trop longs.
// Dessin 2D articulé : une pose = des articulations (repère local, pieds en (0, 0), ≈ 1150 de haut).
// Les poses se mélangent (`melange`) : on passe de debout à quatre pattes sans saut.

export const DEBOUT = {
  tete: [0, -1085], cou: [0, -955],
  epG: [-64, -935], epD: [64, -935],
  coG: [-104, -620], coD: [104, -620],
  maG: [-116, -300], maD: [116, -300],
  haG: [-32, -575], haD: [32, -575],
  geG: [-40, -292], geD: [40, -292],
  piG: [-46, 0], piD: [46, 0],
};
// bras écartés, mains ouvertes (comme pour barrer le passage)
export const ECARTE = {
  ...DEBOUT,
  coG: [-380, -905], coD: [380, -905],
  maG: [-430, -600], maD: [430, -600],
};
// à quatre pattes, de face : tête basse, coudes très hauts (araignée), genoux qui dépassent derrière
export const QUATRE = {
  tete: [0, -560], cou: [0, -440],
  epG: [-92, -500], epD: [92, -500],
  coG: [-330, -780], coD: [330, -780],
  maG: [-450, -24], maD: [450, -24],
  haG: [-46, -640], haD: [46, -640],
  geG: [-250, -950], geD: [250, -950],
  piG: [-170, -24], piD: [170, -24],
};

// couchée à plat (sur un toit), de face : tête basse, bras et jambes étalés
export const COUCHE = {
  tete: [0, -210], cou: [0, -150],
  epG: [-90, -150], epD: [90, -150],
  coG: [-300, -230], coD: [300, -230],
  maG: [-470, -20], maD: [470, -20],
  haG: [-40, -170], haD: [40, -170],
  geG: [-260, -260], geD: [260, -260],
  piG: [-420, -20], piD: [420, -20],
};

export const melange = (a, b, t) => Object.fromEntries(Object.keys(a).map((k) => [k, [a[k][0] + (b[k][0] - a[k][0]) * t, a[k][1] + (b[k][1] - a[k][1]) * t]]));
// cycle de course à quatre pattes (mains et pieds alternés)
export const galop = (p, ph, amp = 1) => {
  const s = Math.sin(ph);
  const c = Math.cos(ph);
  const lv = (v) => Math.max(0, v) * 130 * amp;
  const dec = (pt, dx, dy) => [pt[0] + dx, pt[1] + dy];
  return {
    ...p,
    maG: dec(p.maG, -20 * s * amp, -lv(s)),
    maD: dec(p.maD, 20 * s * amp, -lv(-s)),
    coG: dec(p.coG, 0, -lv(s) * 0.6),
    coD: dec(p.coD, 0, -lv(-s) * 0.6),
    piG: dec(p.piG, 0, -lv(-s) * 0.5),
    piD: dec(p.piD, 0, -lv(s) * 0.5),
    geG: dec(p.geG, 0, -lv(-s) * 0.5),
    geD: dec(p.geD, 0, -lv(s) * 0.5),
    tete: dec(p.tete, 10 * c * amp, -26 * Math.abs(c) * amp),
    cou: dec(p.cou, 6 * c * amp, -20 * Math.abs(c) * amp),
    epG: dec(p.epG, 0, -18 * Math.abs(c) * amp),
    epD: dec(p.epD, 0, -18 * Math.abs(c) * amp),
  };
};

const pts = (l) => l.map((p) => p.join(',')).join(' ');
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const nrm = (v) => {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
};
const rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];

// doigts : 4 longs doigts à 3 phalanges, qui partent du poignet dans la direction de l'avant-bras
export const doigts = (poignet, dir, {long = 1, ecart = 1, plie = 0.25, cote = 1} = {}) => {
  const d0 = nrm(dir);
  return [-0.42, -0.14, 0.14, 0.42].map((a, k) => {
    let p = [poignet[0] + d0[0] * 26, poignet[1] + d0[1] * 26];
    let v = rot(d0, a * ecart * cote);
    const out = [p];
    [70, 56, 44].forEach((L, j) => {
      v = rot(v, plie * cote * (j + 1) * 0.5);
      p = [p[0] + v[0] * L * long * (k === 0 || k === 3 ? 0.85 : 1), p[1] + v[1] * L * long * (k === 0 || k === 3 ? 0.85 : 1)];
      out.push(p);
    });
    return out;
  });
};

// pose : articulations ; tete : inclinaison (degrés) ; ouvre : bouche (0 → 1) ; lum : luminosité du corps
export const Rodeur = ({pose, tete = 0, ouvre = 0, lum = 1, rim = '#eef0ff', rimK = 1, plie = 0.25, id = 'ro', respire = 0, dos = false}) => {
  const p = pose;
  const corps = `rgb(${Math.round(142 * lum)},${Math.round(139 * lum)},${Math.round(154 * lum)})`;
  const sombre = `rgb(${Math.round(92 * lum)},${Math.round(88 * lum)},${Math.round(106 * lum)})`;
  const W = {cuisse: 30, tibia: 24, bras: 24, avb: 19, doigt: 9};
  const jambes = [[p.haG, p.geG, p.piG], [p.haD, p.geD, p.piD]];
  const bras = [[p.epG, p.coG, p.maG, -1], [p.epD, p.coD, p.maD, 1]];
  const mains = bras.map(([, co, ma, c]) => doigts(ma, sub(ma, co), {plie, cote: c}));
  // torse : épaules → taille fine → hanches
  const milieu = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const hc = milieu(p.haG, p.haD, 0.5);
  const tG = milieu(p.epG, p.haG, 0.62);
  const tD = milieu(p.epD, p.haD, 0.62);
  const torse = `M${p.epG[0] - 8},${p.epG[1]} Q${p.cou[0]},${p.cou[1] + 4} ${p.epD[0] + 8},${p.epD[1]} Q${tD[0] + 8},${tD[1] - 60} ${tD[0] - 6 + respire * 4},${tD[1]} Q${p.haD[0] + 8},${p.haD[1] - 10} ${p.haD[0] + 6},${p.haD[1] + 14} L${p.haG[0] - 6},${p.haG[1] + 14} Q${p.haG[0] - 8},${p.haG[1] - 10} ${tG[0] + 6 - respire * 4},${tG[1]} Q${tG[0] - 8},${tG[1] - 60} ${p.epG[0] - 8},${p.epG[1]} Z`;
  const cotes = [0.16, 0.27, 0.38, 0.49].map((t, j) => {
    const c = milieu(p.cou, hc, t + 0.04);
    const l = 34 - j * 3;
    return [`M${c[0] - 4},${c[1]} q${-l * 0.6},${-10} ${-l},${12}`, `M${c[0] + 4},${c[1]} q${l * 0.6},${-10} ${l},${12}`];
  });
  const membre = (l, w, key, couleur, extra = 0) => <polyline key={key} points={pts(l)} fill="none" stroke={couleur} strokeWidth={w + extra} strokeLinecap="round" strokeLinejoin="round" />;
  const ang = (Math.atan2(p.tete[0] - p.cou[0], -(p.tete[1] - p.cou[1])) * 180) / Math.PI + tete;
  const L = Math.hypot(p.tete[0] - p.cou[0], p.tete[1] - p.cou[1]);
  // dessine tout le corps avec une couleur (passe liseré puis passe corps)
  const passe = (couleur, e, cle) => (
    <g key={cle}>
      {jambes.map(([h, g, pi], k) => (
        <g key={k}>
          {membre([h, g], W.cuisse, 'c', couleur, e)}
          {membre([g, pi], W.tibia, 't', couleur, e)}
          <ellipse cx={pi[0] + (k ? 10 : -10)} cy={pi[1] - 6} rx={26 + e / 2} ry={12 + e / 2} fill={couleur} />
        </g>
      ))}
      <path d={torse} fill={couleur} stroke={couleur} strokeWidth={e} strokeLinejoin="round" />
      {membre([p.cou, [p.cou[0] + (p.tete[0] - p.cou[0]) * 0.5, p.cou[1] + (p.tete[1] - p.cou[1]) * 0.5]], 22, 'cou', couleur, e)}
      {bras.map(([ep, co, ma], k) => (
        <g key={`b${k}`}>
          {membre([ep, co], W.bras, 'h', couleur, e)}
          {membre([co, ma], W.avb, 'a', couleur, e)}
          <ellipse cx={ma[0]} cy={ma[1]} rx={17 + e / 2} ry={22 + e / 2} fill={couleur} />
          {mains[k].map((d, j) => membre(d, W.doigt, `d${j}`, couleur, e))}
        </g>
      ))}
    </g>
  );
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-orb`}>
          <stop offset="0" stopColor="#000" />
          <stop offset="0.7" stopColor="#050408" />
          <stop offset="1" stopColor="#1e1b26" />
        </radialGradient>
        <linearGradient id={`${id}-cr`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={corps} />
          <stop offset="1" stopColor={sombre} />
        </linearGradient>
      </defs>
      {passe(rim, 7, 'rim')}
      <g opacity={1 - 0.15 * (1 - rimK)}>{passe(corps, 0, 'corps')}</g>
      {/* ombres internes : intérieur des membres, côtes, colonne */}
      {jambes.map(([h, g, pi], k) => (
        <polyline key={`oj${k}`} points={pts([[h[0] + (k ? -7 : 7), h[1] + 20], [g[0] + (k ? -6 : 6), g[1]], [pi[0] + (k ? -5 : 5), pi[1] - 20]])} fill="none" stroke={sombre} strokeWidth="9" strokeLinecap="round" opacity="0.7" />
      ))}
      {cotes.map(([a, b], j) => (
        <g key={`co${j}`} stroke={sombre} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.85">
          <path d={a} />
          <path d={b} />
        </g>
      ))}
      <polyline points={pts([milieu(p.cou, hc, 0.08), milieu(p.cou, hc, 0.82)])} stroke={sombre} strokeWidth="3" opacity="0.6" />
      <path d={`M${hc[0] - 26},${hc[1] - 50} q26,16 52,0`} stroke={sombre} strokeWidth="3.5" fill="none" opacity="0.6" />
      {/* la tête : crâne allongé, orbites noires vides, sourire fin */}
      <g transform={`translate(${p.cou[0]} ${p.cou[1]}) rotate(${ang}) translate(0 ${-L})`}>
        <path d="M0,-92 C52,-92 70,-50 66,-6 C62,44 34,84 0,86 C-34,84 -62,44 -66,-6 C-70,-50 -52,-92 0,-92 Z" fill={rim} stroke={rim} strokeWidth="7" />
        <path d="M0,-92 C52,-92 70,-50 66,-6 C62,44 34,84 0,86 C-34,84 -62,44 -66,-6 C-70,-50 -52,-92 0,-92 Z" fill={`url(#${id}-cr)`} />
        {!dos && <path d="M-30,-62 q30,-10 60,0 M-22,-48 q22,-7 44,0" stroke={sombre} strokeWidth="3" fill="none" opacity="0.7" />}
        {!dos && [-1, 1].map((s) => (
          <g key={s} transform={`translate(${s * 25} 2) rotate(${s * -14})`}>
            <ellipse rx="22" ry="29" fill={sombre} opacity="0.8" />
            <ellipse rx="18.5" ry="25" fill={`url(#${id}-orb)`} />
          </g>
        ))}
        {dos ? null : ouvre > 0.02 ? (
          <g>
            <ellipse cx="0" cy="52" rx={14 + 10 * ouvre} ry={4 + 26 * ouvre} fill="#050307" />
            {[-12, -4, 4, 12].map((x) => (
              <path key={x} d={`M${x * (0.6 + ouvre * 0.5)},${52 - (4 + 26 * ouvre) + 1} l2.5,${7 * ouvre} l2.5,${-7 * ouvre}`} fill="#d8d6e0" />
            ))}
          </g>
        ) : (
          <path d="M-14,50 q14,8 28,-3" stroke="#1a1820" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        )}
      </g>
    </g>
  );
};

// la créature posée dans le monde (billboard), pieds au sol en (x, sol, z)
export const RodeurMonde = ({cam, x, z, y = 432, echelle = 1, ...r}) => {
  // visibilité testée au milieu du corps (les pieds peuvent être hors champ quand on lève les yeux)
  if (!cam.visible(z, x, y - 500)) return null;
  // ancré au milieu du corps : reste juste même si la caméra lève fort les yeux
  const [px, py] = cam.proj(x, y - 500 * echelle, z);
  const s = cam.scale(z, x, y - 500) * echelle;
  return (
    <g transform={`translate(${px} ${py}) scale(${s}) translate(0 500)`}>
      <ellipse cx="0" cy="4" rx="260" ry="34" fill="#000" opacity="0.4" />
      <Rodeur {...r} />
    </g>
  );
};

// marche lente (pieds levés à tour de rôle, bras qui se balancent)
export const marcheRodeur = (p, ph, amp = 1) => {
  const s = Math.sin(ph);
  const dec = (pt, dx, dy) => [pt[0] + dx, pt[1] + dy];
  return {
    ...p,
    piG: dec(p.piG, 0, -Math.max(0, s) * 70 * amp),
    geG: dec(p.geG, 6 * s * amp, -Math.max(0, s) * 50 * amp),
    piD: dec(p.piD, 0, -Math.max(0, -s) * 70 * amp),
    geD: dec(p.geD, -6 * s * amp, -Math.max(0, -s) * 50 * amp),
    maG: dec(p.maG, 30 * s * amp, 0),
    maD: dec(p.maD, -30 * s * amp, 0),
    tete: dec(p.tete, 6 * s * amp, -8 * Math.abs(s) * amp),
  };
};

// la tête seule (gros plans), centrée en (0, 0), ≈ 180 de haut
export const TeteRodeur = ({ouvre = 0, rim = '#eef0ff', corps = '#8e8b99', id = 'tr'}) => (
  <g>
    <defs>
      <radialGradient id={`${id}-orb`}>
        <stop offset="0" stopColor="#000" />
        <stop offset="0.7" stopColor="#050408" />
        <stop offset="1" stopColor="#1e1b26" />
      </radialGradient>
    </defs>
    <path d="M0,-92 C52,-92 70,-50 66,-6 C62,44 34,84 0,86 C-34,84 -62,44 -66,-6 C-70,-50 -52,-92 0,-92 Z" fill={rim} stroke={rim} strokeWidth="7" />
    <path d="M0,-92 C52,-92 70,-50 66,-6 C62,44 34,84 0,86 C-34,84 -62,44 -66,-6 C-70,-50 -52,-92 0,-92 Z" fill={corps} />
    <path d="M-30,-62 q30,-10 60,0 M-22,-48 q22,-7 44,0" stroke="#5d5a6a" strokeWidth="3" fill="none" opacity="0.7" />
    {[-1, 1].map((s) => (
      <g key={s} transform={`translate(${s * 25} 2) rotate(${s * -14})`}>
        <ellipse rx="22" ry="29" fill="#5d5a6a" opacity="0.8" />
        <ellipse rx="18.5" ry="25" fill={`url(#${id}-orb)`} />
      </g>
    ))}
    {ouvre > 0.02 ? (
      <g>
        <ellipse cx="0" cy="52" rx={14 + 10 * ouvre} ry={4 + 26 * ouvre} fill="#050307" />
        {[-12, -4, 4, 12].map((x) => (
          <path key={x} d={`M${x * (0.6 + ouvre * 0.5)},${52 - (4 + 26 * ouvre) + 1} l2.5,${7 * ouvre} l2.5,${-7 * ouvre}`} fill="#d8d6e0" />
        ))}
      </g>
    ) : (
      <path d="M-14,50 q14,8 28,-3" stroke="#1a1820" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    )}
  </g>
);
