import {SOL} from './Rue';

// ===================== Le surveillant en vraie 3D =====================
// Un squelette en volume (os épais + boîtes orientées), dessiné avec la caméra du plan, donc vu sous tous les angles.
// Repère local (en unités) : x à sa droite, y vers le bas (pieds à 0), z devant lui.
// angle : direction du regard en degrés (0 = il regarde vers +Z, donc de dos pour le bonhomme ; 180 = vers lui).

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

// Les deux poses : debout (gilet, bras ballants) et à quatre pattes (araignée)
const debout = (f) => ({
  bassin: [0, -470, 0],
  poitrine: [0, -800, 0],
  cou: [0, -880, 0],
  tete: [0, -965, 0],
  epauleG: [-125, -800, 0],
  epauleD: [125, -800, 0],
  coudeG: [-155, -540, 10],
  coudeD: [155, -540, 10],
  mainG: [-150, -265, 25],
  mainD: [150, -265, 25],
  hancheG: [-45, -470, 0],
  hancheD: [45, -470, 0],
  genouG: [-45, -235, 8],
  genouD: [45, -235, 8],
  piedG: [-48, 0, 0],
  piedD: [48, 0, 0],
});
const pattes = (f) => {
  const g = (ph) => Math.sin(f / 2.3 + ph);
  return {
    bassin: [0, -360, -260],
    poitrine: [0, -400, 230],
    cou: [0, -420, 380],
    tete: [0, -430, 500],
    epauleG: [-150, -400, 230],
    epauleD: [150, -400, 230],
    coudeG: [-430, -640 - 60 * Math.abs(g(0)), 380 + 60 * g(0)],
    coudeD: [430, -640 - 60 * Math.abs(g(Math.PI)), 380 + 60 * g(Math.PI)],
    mainG: [-520, 0, 640 + 120 * g(0)],
    mainD: [520, 0, 640 + 120 * g(Math.PI)],
    hancheG: [-90, -360, -260],
    hancheD: [90, -360, -260],
    genouG: [-420, -600 - 60 * Math.abs(g(Math.PI / 2)), -380 + 60 * g(Math.PI / 2)],
    genouD: [420, -600 - 60 * Math.abs(g(-Math.PI / 2)), -380 + 60 * g(-Math.PI / 2)],
    piedG: [-520, 0, -560 + 120 * g(Math.PI / 2)],
    piedD: [520, 0, -560 + 120 * g(-Math.PI / 2)],
  };
};

const SURVEILLANT = {jambe: '#1c1d22', bras: '#4e545b', main: '#b9b2a8', gilet: '#5b6168', gilet2: '#4a5056', peau: '#c4bdb2', peau2: '#a9a297', cheveux: '#2a2522', rouge: '#3a0505'};
// « L'hôte » de la soirée : costume noir, peau blafarde, chapeau pointu et masque pailleté
const HOTE = {jambe: '#121216', bras: '#16161b', main: '#d6cfc2', gilet: '#1b1b22', gilet2: '#121218', peau: '#d8d2c6', peau2: '#bdb6aa', cheveux: '#0c0c0e', rouge: '#3a0505'};

// Boîte orientée : centre c, axes unitaires u, v, w (en unités), demi-tailles a, b, e. Faces cachées éliminées.
const boite = (vue, c, [u, v, w], [a, b, e], cols) => {
  const axes = [u, v, w];
  const demi = [a, b, e];
  // chaque face : son axe (normal), le sens, la couleur
  const s = [
    [2, 1, cols.devant],
    [2, -1, cols.derriere ?? cols.devant],
    [0, 1, cols.cote],
    [0, -1, cols.coteInt ?? cols.cote],
    [1, -1, cols.dessus ?? cols.cote],
    [1, 1, cols.dessous ?? cols.cote],
  ];
  const faces = [];
  s.forEach(([k, sens, col]) => {
    const n = mul(axes[k], sens);
    const centre = add(c, mul(n, demi[k]));
    if (dot(n, sub(vue, centre)) <= 0) return;
    const [i, j] = [0, 1, 2].filter((x) => x !== k);
    const p = mul(axes[i], demi[i]);
    const q = mul(axes[j], demi[j]);
    faces.push({centre, coins: [add(add(centre, p), q), add(sub(centre, p), q), sub(sub(centre, p), q), sub(add(centre, p), q)], col});
  });
  return faces;
};

// Construit le monstre : renvoie un élément triable {z, el}
// Options en plus pour l'hôte : tenue 'hote', y (sol sous ses pieds), masque 0 → 1 (posé sur le visage), ventre 0 → 1 (la bouche se déchire jusqu'au ventre)
export const surveillant3D = (cam, {x, z, y = SOL, angle = 0, ouvre = 0, pose = 0, f = 0, echelle = 1, tenue = 'surveillant', masque = 0, ventre = 0}) => {
  const COUL = tenue === 'hote' ? HOTE : SURVEILLANT;
  const base = [x, y, z * 1000];
  const P = debout(f);
  const Q = pattes(f);
  const J = Object.fromEntries(Object.keys(P).map((k) => [k, mix(P[k], Q[k], pose)]));
  const monde = (p) => add(base, rotY(mul(p, echelle), angle));
  const W = Object.fromEntries(Object.entries(J).map(([k, p]) => [k, monde(p)]));
  const vue = [cam.x, cam.y, cam.z * 1000];
  const pr = (p) => cam.proj(p[0], p[1], p[2] / 1000);
  const vis = (p) => cam.visible(p[2] / 1000, p[0], p[1]);
  const sc = (p) => cam.scale(p[2] / 1000, p[0], p[1]);
  const prof = (p) => cam.profondeur(p[2] / 1000, p[0], p[1]);
  const morceaux = []; // {d: profondeur, el}

  // os épais
  const os = (a, b, larg, col, k) => {
    const A = W[a];
    const B = W[b];
    if (!vis(A) || !vis(B)) return;
    const m = mul(add(A, B), 0.5);
    const pa = pr(A);
    const pb = pr(B);
    morceaux.push({d: prof(m), el: <line key={k} x1={pa[0]} y1={pa[1]} x2={pb[0]} y2={pb[1]} stroke={col} strokeWidth={Math.max(2, larg * echelle * sc(m))} strokeLinecap="round" />});
  };
  os('hancheG', 'genouG', 62, COUL.jambe, 'j1');
  os('genouG', 'piedG', 54, COUL.jambe, 'j2');
  os('hancheD', 'genouD', 62, COUL.jambe, 'j3');
  os('genouD', 'piedD', 54, COUL.jambe, 'j4');
  os('epauleG', 'coudeG', 50, COUL.bras, 'b1');
  os('coudeG', 'mainG', 42, COUL.bras, 'b2');
  os('epauleD', 'coudeD', 50, COUL.bras, 'b3');
  os('coudeD', 'mainD', 42, COUL.bras, 'b4');
  os('poitrine', 'cou', 46, COUL.peau2, 'cou');
  // articulations noueuses
  ['coudeG', 'coudeD', 'genouG', 'genouD'].forEach((k) => {
    const p = W[k];
    if (!vis(p)) return;
    const q = pr(p);
    morceaux.push({d: prof(p) - 0.5, el: <circle key={`a${k}`} cx={q[0]} cy={q[1]} r={Math.max(2, (k[0] === 'c' ? 34 : 40) * echelle * sc(p))} fill="#2b2e33" />});
  });
  // griffes au bout des mains
  [['mainG', 'coudeG'], ['mainD', 'coudeD']].forEach(([m, c0]) => {
    const p = W[m];
    const d = norme(sub(W[m], W[c0]));
    [-1, 0, 1].forEach((k) => {
      const bout = add(add(p, mul(d, 110 * echelle)), mul(norme(croix(d, [0, 1, 0.01])), k * 40 * echelle));
      if (!vis(p) || !vis(bout)) return;
      const a = pr(p);
      const b = pr(bout);
      morceaux.push({d: prof(p) - 1.5, el: <line key={`g${m}${k}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#e4dccb" strokeWidth={Math.max(1, 9 * echelle * sc(p))} strokeLinecap="round" />});
    });
  });
  // mains / pieds : petites boules
  ['mainG', 'mainD'].forEach((k) => {
    const p = W[k];
    if (!vis(p)) return;
    const q = pr(p);
    morceaux.push({d: prof(p) - 1, el: <circle key={k} cx={q[0]} cy={q[1]} r={Math.max(2, 34 * echelle * sc(p))} fill={COUL.main} />});
  });

  // torse : boîte alignée entre le bassin et la poitrine
  const haut = sub(W.poitrine, W.bassin);
  const L = Math.hypot(...haut) / 2;
  const v = norme(mul(haut, -1)); // vers le haut du torse (y monde négatif)
  const cote = norme(rotY([1, 0, 0], angle));
  const avant = norme(croix(cote, v));
  const centreT = mul(add(W.poitrine, W.bassin), 0.5);
  boite(vue, centreT, [cote, mul(v, -1), avant], [125 * echelle, L, 62 * echelle], {devant: COUL.gilet, derriere: COUL.gilet2, cote: COUL.gilet2}).forEach((fa, i) => {
    if (!fa.coins.every(vis)) return;
    morceaux.push({d: prof(fa.centre), el: <polygon key={`t${i}`} points={fa.coins.map((c) => pr(c).join(',')).join(' ')} fill={fa.col} stroke="#2b2f33" strokeWidth="1" />});
  });
  // cordon rouge + sifflet sur le devant (surveillant) / nœud papillon (hôte)
  const sifflet = add(add(centreT, mul(avant, 66 * echelle)), mul(v, L * 0.3));
  if (vis(sifflet) && dot(avant, sub(vue, sifflet)) > 0) {
    const q = pr(sifflet);
    const s = sc(sifflet) * echelle;
    if (tenue === 'hote') {
      const n = pr(add(add(centreT, mul(avant, 66 * echelle)), mul(v, L * 0.92)));
      const s2 = sc(sifflet) * echelle;
      morceaux.push({d: prof(sifflet) - 2, el: <g key="noeud"><path d={`M${n[0]},${n[1]} l${-40 * s2},${-18 * s2} l0,${36 * s2} Z M${n[0]},${n[1]} l${40 * s2},${-18 * s2} l0,${36 * s2} Z`} fill="#8e1a2a" /><path d={`M${n[0]},${n[1]} L${n[0]},${n[1] + 300 * s2}`} stroke="#e8e4d8" strokeWidth={Math.max(1, 30 * s2)} opacity="0.9" /></g>});
    } else morceaux.push({d: prof(sifflet) - 2, el: <g key="sif"><path d={`M${q[0] - 40 * s},${q[1] - 130 * s} Q${q[0]},${q[1] + 10 * s} ${q[0] + 40 * s},${q[1] - 130 * s}`} stroke="#c41a1a" strokeWidth={Math.max(1, 6 * s)} fill="none" /><rect x={q[0] - 14 * s} y={q[1] - 10 * s} width={28 * s} height={40 * s} rx={6 * s} fill="#c9ccd1" /></g>});
  }

  // tête : deux moitiés qui pivotent autour d'un axe vertical à l'arrière du crâne
  const T = W.tete;
  const regard = norme(rotY([0, 0, 1], angle));
  const dir = pose > 0.5 ? norme(sub(W.tete, W.cou)) : regard;
  const droite = norme(croix(dir, [0, -1, 0]));
  const charniere = sub(T, mul(dir, 70 * echelle));
  const ouv = ouvre * 38;
  [-1, 1].forEach((c) => {
    const rot = (p) => {
      // rotation de la moitié autour de l'axe vertical passant par la charnière
      const r = sub(p, charniere);
      const a = ((c * ouv) * Math.PI) / 180;
      const rx = dot(r, droite);
      const rz = dot(r, dir);
      const ry = r[1];
      return add(charniere, add(add(mul(droite, rx * Math.cos(a) + rz * Math.sin(a)), mul(dir, -rx * Math.sin(a) + rz * Math.cos(a))), [0, ry, 0]));
    };
    const cM = rot(add(T, mul(droite, c * 37 * echelle)));
    const u = norme(sub(rot(add(T, mul(droite, c * 100))), rot(T)));
    const w = norme(sub(rot(add(T, mul(dir, 100))), rot(T)));
    boite(vue, cM, [u, [0, 1, 0], w], [37 * echelle, 90 * echelle, 75 * echelle], {devant: c > 0 ? COUL.peau : COUL.peau2, derriere: COUL.cheveux, cote: COUL.peau2, coteInt: ouvre > 0.05 ? '#5a0a0a' : COUL.peau2, dessus: COUL.cheveux}).forEach((fa, i) => {
      if (!fa.coins.every(vis)) return;
      morceaux.push({d: prof(fa.centre), el: <polygon key={`h${c}${i}`} points={fa.coins.map((q) => pr(q).join(',')).join(' ')} fill={fa.col} stroke="#6f685e" strokeWidth="1" />});
    });
    // dents sur le bord intérieur avant de chaque moitié
    if (ouvre > 0.05) {
      const bordHaut = rot(add(add(T, mul(dir, 74 * echelle)), [0, -85 * echelle, 0]));
      const bordBas = rot(add(add(T, mul(dir, 74 * echelle)), [0, 85 * echelle, 0]));
      for (let k = 0; k < 9; k++) {
        const p = mix(bordHaut, bordBas, (k + 0.5) / 9);
        const pointe = add(p, mul(droite, -c * 34 * echelle * ouvre));
        const p1 = add(p, [0, -8 * echelle, 0]);
        const p2 = add(p, [0, 8 * echelle, 0]);
        if (![p1, p2, pointe].every(vis)) continue;
        morceaux.push({d: prof(p) - 3, el: <polygon key={`d${c}${k}`} points={[p1, pointe, p2].map((q) => pr(q).join(',')).join(' ')} fill="#ece6cf" />});
      }
    }
  });
  // l'intérieur de la tête : gueule rouge, yeux, bave
  if (ouvre > 0.05 && vis(T)) {
    const q = pr(add(T, mul(dir, 20)));
    const s = sc(T) * echelle;
    morceaux.push({
      d: prof(T) - 6,
      el: (
        <g key="gueule">
          <ellipse cx={q[0]} cy={q[1]} rx={(14 + 48 * ouvre) * s} ry={(70 + 25 * ouvre) * s} fill={COUL.rouge} />
          {[[-15, -40, 10], [18, -20, 12], [0, 15, 8], [-22, 40, 6], [20, 45, 7]].map(([ex, ey, r], k) => (
            <g key={k} opacity={ouvre}>
              <circle cx={q[0] + ex * s * (1 + ouvre)} cy={q[1] + ey * s} r={r * 2.5 * s} fill="#ff2a1a" opacity="0.35" />
              <circle cx={q[0] + ex * s * (1 + ouvre)} cy={q[1] + ey * s} r={r * s} fill="#ff3b2a" />
              <circle cx={q[0] + ex * s * (1 + ouvre)} cy={q[1] + ey * s} r={r * 0.35 * s} fill="#fff" />
            </g>
          ))}
          {[-20, 15].map((ex, k) => (
            <path key={`b${k}`} d={`M${q[0] + ex * s},${q[1] + 90 * s} q3,${(60 + Math.sin(f / 6 + k) * 25) * s} 0,${(110 + Math.sin(f / 6 + k) * 35) * s}`} stroke="#c9d4c4" strokeWidth={Math.max(1, 5 * s)} fill="none" opacity={0.6 * ouvre} />
          ))}
        </g>
      ),
    });
  }
  // la bouche qui se déchire du crâne jusqu'au ventre (sur le devant du torse)
  if (ventre > 0.02) {
    const haut = add(add(centreT, mul(avant, 64 * echelle)), mul(v, L * 0.95));
    const bas = add(add(centreT, mul(avant, 64 * echelle)), mul(v, -L * 0.75));
    const larg = 95 * echelle * ventre;
    const pts = [];
    for (let k = 0; k <= 10; k++) {
      const t = k / 10;
      const c = mix(haut, bas, t);
      pts.push([add(c, mul(cote, -larg * Math.sin(Math.PI * t))), add(c, mul(cote, larg * Math.sin(Math.PI * t)))]);
    }
    if ([haut, bas].every(vis) && dot(avant, sub(vue, centreT)) > 0) {
      const g = pts.map((p) => pr(p[0]));
      const d_ = pts.map((p) => pr(p[1])).reverse();
      const s2 = sc(centreT) * echelle;
      morceaux.push({
        d: prof(centreT) - 70,
        el: (
          <g key="ventre">
            <polygon points={[...g, ...d_].map((q) => q.join(',')).join(' ')} fill="#2a0303" stroke="#5a0a0a" strokeWidth={Math.max(1, 6 * s2)} />
            {pts.slice(1, -1).map((p, k) =>
              [0, 1].map((c) => {
                const a = pr(p[c]);
                const b = pr(add(p[c], mul(cote, (c ? -1 : 1) * 40 * echelle * ventre)));
                return <polygon key={`${k}${c}`} points={`${a[0]},${a[1] - 8 * s2} ${b[0]},${b[1]} ${a[0]},${a[1] + 8 * s2}`} fill="#ece6cf" />;
              })
            )}
            {[0.3, 0.5, 0.7].map((t, k) => {
              const q = pr(mix(haut, bas, t));
              return <circle key={`o${k}`} cx={q[0]} cy={q[1]} r={Math.max(1, 10 * s2 * ventre)} fill="#ff3b2a" />;
            })}
          </g>
        ),
      });
    }
  }
  // chapeau pointu de fête + masque pailleté
  if (tenue === 'hote') {
    const sommet = add(T, mul(norme(sub(W.tete, W.cou)), 95 * echelle));
    const pointe = add(sommet, mul(norme(sub(W.tete, W.cou)), 230 * echelle));
    if (vis(sommet) && vis(pointe) && ouvre < 0.2) {
      const a = pr(sommet);
      const b = pr(pointe);
      const s2 = sc(sommet) * echelle;
      morceaux.push({d: prof(sommet) - 10, el: <g key="chapeau"><polygon points={`${a[0] - 70 * s2},${a[1]} ${a[0] + 70 * s2},${a[1]} ${b[0]},${b[1]}`} fill="#c42a8a" /><line x1={a[0] - 35 * s2} y1={a[1] - 60 * s2} x2={a[0] + 35 * s2} y2={a[1] - 60 * s2} stroke="#ffd23e" strokeWidth={Math.max(1, 12 * s2)} /><circle cx={b[0]} cy={b[1]} r={16 * s2} fill="#ffd23e" /></g>});
    }
    if (masque > 0.01) {
      const tombe = 1 - masque;
      const pm = add(add(T, mul(dir, 82 * echelle)), [0, tombe * 700, 0]);
      if (vis(pm) && dot(dir, sub(vue, T)) > 0) {
        const q = pr(pm);
        const s2 = sc(pm) * echelle;
        morceaux.push({
          d: prof(pm) - 12,
          el: (
            <g key="masque" transform={`translate(${q[0]} ${q[1]}) scale(${s2}) rotate(${tombe * 70})`}>
              <path d="M-95,-40 Q-100,-90 -40,-80 Q0,-60 40,-80 Q100,-90 95,-40 Q90,40 0,60 Q-90,40 -95,-40 Z" fill="#5a1a7a" stroke="#ffd23e" strokeWidth="6" />
              <ellipse cx="-42" cy="-30" rx="24" ry="14" fill="#050507" />
              <ellipse cx="42" cy="-30" rx="24" ry="14" fill="#050507" />
              {[...Array(14)].map((_, k) => (
                <circle key={k} cx={-80 + (k % 7) * 27} cy={k < 7 ? -62 : 20} r="5" fill={k % 2 ? '#ffd23e' : '#ff8ad8'} opacity={0.6 + 0.4 * Math.sin(f / 3 + k)} />
              ))}
              <path d="M-30,25 Q0,45 30,25" stroke="#050507" strokeWidth="5" fill="none" />
            </g>
          ),
        });
      }
    }
  }
  // ombre au sol
  const ombre = W.bassin;
  const qo = pr([ombre[0], y, ombre[2]]);
  const so = sc([ombre[0], y, ombre[2]]);
  morceaux.sort((a, b) => b.d - a.d);
  return {
    z: W.bassin[2] / 1000,
    el: (
      <g key="surveillant3d">
        {vis([ombre[0], y, ombre[2]]) && <ellipse cx={qo[0]} cy={qo[1]} rx={(200 + 350 * pose) * so * echelle} ry={40 * so * echelle} fill="#000" opacity="0.5" />}
        {morceaux.map((m) => m.el)}
      </g>
    ),
  };
};
