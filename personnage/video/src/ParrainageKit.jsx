import React, {createContext, useContext} from 'react';
import {continueRender, delayRender, Easing, interpolate, random, spring, staticFile} from 'remotion';
import {Bonhomme} from './Bonhomme';

// ===================== Kit graphique de « Comment les banques gagnent de l'argent avec les parrainages » =====================
// Style « explication » propre : studio en dégradé avec sol en perspective, couches en parallaxe (2,5D),
// objets à volume (billets, pièces, banque, carte), animations au ressort, ombres douces.

// ----- polices : Montserrat Black (comme les sous-titres) pour les gros chiffres, Inter pour le reste -----
const attente = delayRender('police');
if (typeof FontFace !== 'undefined') {
  const ff = new FontFace('MontserratB', `url(${staticFile('fonts/Montserrat-Black.ttf')})`);
  ff.load()
    .then((p) => {
      document.fonts.add(p);
      continueRender(attente);
    })
    .catch(() => continueRender(attente));
} else continueRender(attente);
export const TITRE = "'MontserratB', 'Inter', sans-serif";
export const TEXTE = "'Inter', 'DejaVu Sans', sans-serif";

// ----- palette -----
export const P = {
  rose: '#ff2e7e',
  roseC: '#ff6aa6',
  roseF: '#c8145a',
  vert: '#22c55e',
  vertC: '#86efac',
  or: '#ffc83a',
  orF: '#e8a412',
  rouge: '#ff4d4d',
  bleu: '#4f7cff',
  nuit: '#14123a',
  blanc: '#ffffff',
  encre: '#1b1a2e',
};

// ----- animation -----
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
export const ease = (f, a, b, e = Easing.bezier(0.33, 0, 0.2, 1)) => interpolate(f, [a, b], [0, 1], {...clamp, easing: e});
export const pop = (f, t0, k = {damping: 11, stiffness: 170, mass: 0.7}) => (f < t0 ? 0 : spring({frame: f - t0, fps: 30, config: k}));
export const doux = (f, t0) => (f < t0 ? 0 : spring({frame: f - t0, fps: 30, config: {damping: 20, stiffness: 120}}));
export const lerp = (a, b, u) => a + (b - a) * u;
export const mixP = (a, b, u) => a.map((v, i) => lerp(v, b[i], u));

// ----- caméra 2,5D : chaque couche bouge selon sa profondeur (parallaxe) -----
const CamCtx = createContext({x: 0, y: 0, z: 1, r: 0});
export const Couche = ({p = 1, children, flou = 0}) => {
  const c = useContext(CamCtx);
  const s = 1 + (c.z - 1) * p;
  return (
    <g transform={`translate(540 960) scale(${s}) translate(${-540 - c.x * p} ${-960 - c.y * p})`} filter={flou ? `url(#flou${flou})` : undefined}>
      {children}
    </g>
  );
};
// cam : {x, y, z, r}. Entrée de plan : petit coup de zoom (t = image dans le plan).
export const Cadre = ({cam = {}, t = 99, children, punch = 0.04}) => {
  const k = interpolate(t, [0, 10], [1 + punch, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const c = {x: 0, y: 0, z: 1, r: 0, ...cam};
  c.z *= k;
  return (
    <CamCtx.Provider value={c}>
      <g transform={`rotate(${c.r} 540 960)`}>{children}</g>
    </CamCtx.Provider>
  );
};
export const DefsFlou = () => (
  <defs>
    {[2, 4, 8, 14].map((s) => (
      <filter key={s} id={`flou${s}`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation={s} />
      </filter>
    ))}
    <filter id="ombreD" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="14" />
    </filter>
  </defs>
);

// ----- le studio : dégradé, halos qui dérivent, sol en perspective -----
export const THEMES = {
  violet: ['#3a2a9a', '#1a1250', '#0c0a2a', '#7a5aff', '#ff6aa6'],
  rose: ['#9a2a7a', '#4a1250', '#1a0a2a', '#ff6aa6', '#ffc83a'],
  bleu: ['#2a5ad8', '#122a6a', '#0a1430', '#4fc3ff', '#7a5aff'],
  vert: ['#1a8a6a', '#0e4a48', '#06201e', '#4ae8a8', '#ffc83a'],
  rouge: ['#b02a3a', '#5a1226', '#200810', '#ff6a5a', '#ffc83a'],
  nuit: ['#2a2a5a', '#14143a', '#08081a', '#5a6aff', '#ff2e7e'],
  or: ['#c87a1a', '#6a3a12', '#2a1408', '#ffd23a', '#ff6aa6'],
};
export const Studio = ({f, theme = 'violet', sol = true, horizon = 1240, grille = 0.18}) => {
  const [c1, c2, c3, a1, a2] = THEMES[theme];
  const id = `st-${theme}`;
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-f`} cx="50%" cy="38%" r="80%">
          <stop offset="0" stopColor={c1} />
          <stop offset="0.55" stopColor={c2} />
          <stop offset="1" stopColor={c3} />
        </radialGradient>
        <radialGradient id={`${id}-a1`}>
          <stop offset="0" stopColor={a1} stopOpacity="0.5" />
          <stop offset="1" stopColor={a1} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-a2`}>
          <stop offset="0" stopColor={a2} stopOpacity="0.38" />
          <stop offset="1" stopColor={a2} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-sol`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c3} stopOpacity="0.0" />
          <stop offset="0.25" stopColor={c3} stopOpacity="0.55" />
          <stop offset="1" stopColor={c3} stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id={`${id}-m`}>
          <rect x="-600" y={horizon} width="2280" height="1400" fill={`url(#${id}-fade)`} />
        </mask>
      </defs>
      <Couche p={0.15}>
        <rect x="-600" y="-600" width="2280" height="3120" fill={`url(#${id}-f)`} />
        <circle cx={250 + 60 * Math.sin(f / 70)} cy={520 + 40 * Math.cos(f / 60)} r="560" fill={`url(#${id}-a1)`} />
        <circle cx={850 + 50 * Math.cos(f / 80)} cy={1150 + 50 * Math.sin(f / 65)} r="620" fill={`url(#${id}-a2)`} />
      </Couche>
      {/* poussière lumineuse très légère */}
      <Couche p={0.35}>
        {[...Array(16)].map((_, k) => {
          const x = random(`pp${k}`) * 1300 - 110;
          const y = ((random(`py${k}`) * 2200 - f * (0.6 + random(`pv${k}`))) % 2200 + 2200) % 2200 - 140;
          return <circle key={k} cx={x + 20 * Math.sin(f / 40 + k)} cy={y} r={2 + 3 * random(`pr${k}`)} fill="#fff" opacity={0.08 + 0.12 * random(`po${k}`)} />;
        })}
      </Couche>
      {sol && (
        <Couche p={0.6}>
          <rect x="-600" y={horizon} width="2280" height="1500" fill={`url(#${id}-sol)`} />
          <g mask={`url(#${id}-m)`} stroke="#fff" strokeOpacity={grille} strokeWidth="2">
            {[...Array(23)].map((_, k) => {
              const x = -1660 + k * 200;
              return <line key={k} x1={540 + (x - 540) * 0.08} y1={horizon} x2={540 + (x - 540) * 1.6} y2={horizon + 1400} />;
            })}
            {[...Array(9)].map((_, k) => {
              const y = horizon + 1400 * Math.pow((k + ((f / 40) % 1)) / 9, 2.2);
              return <line key={k} x1="-600" y1={y} x2="1680" y2={y} />;
            })}
          </g>
          <rect x="-600" y={horizon - 2} width="2280" height="4" fill={a1} opacity="0.35" />
        </Couche>
      )}
    </g>
  );
};

// ombre douce au sol
export const Ombre = ({x, y, rx, ry = rx * 0.18, o = 0.45}) => <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#000" opacity={o} filter="url(#ombreD)" />;

// emoji Twemoji (fichiers dans public/emoji)
export const Emo = ({c, x, y, s = 100, rot = 0, o = 1}) => (
  <image href={staticFile(`emoji/${c}.svg`)} x={x - s / 2} y={y - s / 2} width={s} height={s} opacity={o} transform={rot ? `rotate(${rot} ${x} ${y})` : undefined} />
);

// ===================== le bonhomme =====================
const rotP = ([x, y], a, [cx, cy]) => {
  const r = (a * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
};
// position des mains dans le repère du bonhomme (600 × 1000, pieds en 300, 922)
export const mainD = (p = {}) => {
  let h = rotP([433, 598], p.coudeD || 0, [418, 450]);
  h = rotP(h, p.epauleD || 0, [390, 318]);
  return [h[0], h[1] + (p.breath || 0) * 0.5];
};
export const mainG = (p = {}) => {
  let h = rotP([167, 598], p.coudeG || 0, [182, 450]);
  h = rotP(h, p.epauleG || 0, [210, 318]);
  return [h[0], h[1] + (p.breath || 0) * 0.5];
};
// le bonhomme posé à (x, y) = ses pieds, échelle s ; `tete` : accessoire dessiné dans le repère de la tête ; `devant` : par-dessus le corps
export const Fig = ({x, y, s = 1, flip = false, tete = null, devant = null, ombre = true, ...pose}) => {
  const b = pose.breath || 0;
  return (
    <g>
      {ombre && <Ombre x={x} y={y + 4 * s} rx={150 * s} ry={26 * s} o={0.35} />}
      <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s}) translate(-300 -922)`}>
        <Bonhomme {...pose} />
        {tete && <g transform={`translate(0 ${b}) rotate(${pose.tilt || 0} 300 262)`}>{tete}</g>}
        {devant}
      </g>
    </g>
  );
};
// point du repère du bonhomme → écran
export const versEcran = (x, y, s, [px, py], flip = false) => [x + (flip ? -1 : 1) * (px - 300) * s, y + (py - 922) * s];

export const KARIM = {couleurs: {chev: '#1a1210', haut: '#3ad86a', hautO: '#2ab858', peau: '#c8906a', peauO: '#b07a58', pant: '#2a2a3a'}};
export const COSTUME = {couleurs: {...KARIM.couleurs, haut: '#1e2a4a', hautO: '#16203a', pant: '#1e2a4a'}};
export const VENDEUR = {couleurs: {chev: '#2a1a14', haut: '#ffffff', hautO: '#dcdce4', peau: '#d8a07a', peauO: '#c08a66', pant: '#3a3a48'}};
export const PASSANTS = [
  {couleurs: {chev: '#4a2a1a', haut: '#ffd23a', hautO: '#e8b820', pant: '#2a5ad8'}, coiffure: 'long', cils: true},
  {couleurs: {chev: '#1a1210', haut: '#2a8ad8', hautO: '#2070b8', pant: '#3a3a3a', peau: '#c8906a', peauO: '#b07a58'}},
  {couleurs: {chev: '#c8803a', haut: '#3ad8a8', hautO: '#2ab890', pant: '#1a2a4a'}, coiffure: 'queue', cils: true},
  {couleurs: {chev: '#8a5a2a', haut: '#8a5aff', hautO: '#7048e0', pant: '#2a2a3a'}},
];
// chapeau de fête (repère de la tête)
export const ChapeauFete = () => (
  <g transform="rotate(-14 300 100)">
    <path d="M250,108 L300,-40 L350,108 Z" fill="#ff2e7e" />
    <path d="M262,72 L338,72 L344,90 L256,90 Z" fill="#ffc83a" opacity="0.9" />
    <path d="M280,14 L320,14 L326,32 L274,32 Z" fill="#4fc3ff" opacity="0.9" />
    <circle cx="300" cy="-44" r="16" fill="#ffc83a" />
    <ellipse cx="300" cy="108" rx="54" ry="10" fill="#c8145a" />
  </g>
);
// cravate (repère du corps)
export const Cravate = () => (
  <g>
    <path d="M276,290 L300,326 L324,290 Z" fill="#ffffff" />
    <path d="M292,300 L308,300 L312,318 L300,326 L288,318 Z" fill="#ff2e7e" />
    <path d="M294,322 L306,322 L318,440 L300,462 L282,440 Z" fill="#ff2e7e" />
    <path d="M300,322 L306,322 L318,440 L300,462 Z" fill="#c8145a" opacity="0.5" />
    <path d="M222,296 L276,290 L292,360 L252,330 Z" fill="#16203a" />
    <path d="M378,296 L324,290 L308,360 L348,330 Z" fill="#16203a" />
  </g>
);

// ===================== l'argent =====================
// billet de 100 € (centre x, y ; largeur 300·s) ; flip : -1 → 1 (rotation 3D autour de l'axe vertical)
export const Billet = ({x, y, s = 1, rot = 0, flip = 1, id = 'b', yeux = null, casque = false}) => {
  const w = 300;
  const h = 160;
  const sx = Math.abs(flip) < 0.04 ? 0.04 : flip;
  const dos = flip < 0;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s * sx} ${s})`}>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={dos ? '#5ab87a' : '#9ef0b4'} />
          <stop offset="0.5" stopColor={dos ? '#3a9a5a' : '#5ad08a'} />
          <stop offset="1" stopColor={dos ? '#2a7a4a' : '#3ab06a'} />
        </linearGradient>
      </defs>
      <rect x={-w / 2 + 6} y={-h / 2 + 10} width={w} height={h} rx="14" fill="#000" opacity="0.18" />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="14" fill={`url(#${id}-g)`} />
      <rect x={-w / 2 + 12} y={-h / 2 + 12} width={w - 24} height={h - 24} rx="8" fill="none" stroke="#1f7a46" strokeWidth="3" opacity="0.5" />
      {!dos && (
        <g>
          <circle cx={-w / 2 + 78} cy="0" r="44" fill="#d8fbe4" opacity="0.65" />
          <text x={-w / 2 + 78} y="16" textAnchor="middle" fontFamily={TITRE} fontSize="46" fill="#1f7a46">€</text>
          <text x={w / 2 - 22} y="-22" textAnchor="end" fontFamily={TITRE} fontSize="58" fill="#14583a">100</text>
          <rect x="10" y="20" width="110" height="10" rx="5" fill="#1f7a46" opacity="0.35" />
          <rect x="10" y="40" width="80" height="10" rx="5" fill="#1f7a46" opacity="0.25" />
          <path d={`M${-w / 2},${-h / 2 + 30} L${-w / 2 + 40},${-h / 2}`} stroke="#fff" strokeWidth="18" opacity="0.18" />
        </g>
      )}
      {yeux && (
        <g transform="translate(-35 -6)">
          {yeux.ferme ? (
            <g stroke="#14583a" strokeWidth="7" strokeLinecap="round" fill="none">
              <path d="M-30,0 Q-18,10 -6,0" />
              <path d="M24,0 Q36,10 48,0" />
            </g>
          ) : (
            <g>
              <ellipse cx="-18" cy="0" rx="14" ry="17" fill="#fff" />
              <ellipse cx="36" cy="0" rx="14" ry="17" fill="#fff" />
              <circle cx={-16 + (yeux.px || 0)} cy="3" r="8" fill="#14283a" />
              <circle cx={38 + (yeux.px || 0)} cy="3" r="8" fill="#14283a" />
            </g>
          )}
          <path d={yeux.ferme ? 'M0,34 Q9,38 18,34' : 'M-4,30 Q9,44 22,30'} stroke="#14583a" strokeWidth="6" fill="none" strokeLinecap="round" />
        </g>
      )}
      {casque && (
        <g transform="translate(-8 -86)">
          <path d="M-70,10 Q-70,-56 0,-58 Q70,-56 70,10 Z" fill="#ffc83a" />
          <rect x="-86" y="4" width="172" height="16" rx="8" fill="#e8a412" />
          <rect x="-8" y="-58" width="16" height="64" rx="6" fill="#e8a412" />
        </g>
      )}
    </g>
  );
};
// pièce d'1 € dorée avec épaisseur (vue de 3/4) ; tourne : 0 → 1 (rotation sur elle-même)
export const Piece = ({x, y, r = 40, tourne = 0, o = 1}) => {
  const sx = Math.max(0.08, Math.abs(Math.cos(tourne * Math.PI * 2)));
  return (
    <g transform={`translate(${x} ${y}) scale(${sx} 1)`} opacity={o}>
      <ellipse cx="0" cy={r * 0.16} rx={r} ry={r} fill="#b87a0a" />
      <circle cx="0" cy="0" r={r} fill="#ffc83a" />
      <circle cx="0" cy="0" r={r * 0.78} fill="#ffd866" stroke="#e8a412" strokeWidth={r * 0.06} />
      <text x="0" y={r * 0.3} textAnchor="middle" fontFamily={TITRE} fontSize={r * 0.9} fill="#c8860a">€</text>
      <path d={`M${-r * 0.6},${-r * 0.5} Q${-r * 0.2},${-r * 0.85} ${r * 0.25},${-r * 0.75}`} stroke="#fff" strokeWidth={r * 0.12} fill="none" strokeLinecap="round" opacity="0.6" />
    </g>
  );
};
// pile de pièces (vue de 3/4)
export const Pile = ({x, y, n, r = 46}) => (
  <g>
    <Ombre x={x} y={y + 6} rx={r * 1.2} ry={r * 0.3} o={0.4} />
    {[...Array(Math.max(0, Math.round(n)))].map((_, k) => (
      <g key={k} transform={`translate(${x + (random(`pl${k}`) - 0.5) * 6} ${y - k * r * 0.24})`}>
        <ellipse cx="0" cy="0" rx={r} ry={r * 0.36} fill="#c8860a" />
        <rect x={-r} y={-r * 0.2} width={r * 2} height={r * 0.2} fill="#d8960a" />
        <ellipse cx="0" cy={-r * 0.2} rx={r} ry={r * 0.36} fill="#ffc83a" />
        <ellipse cx="0" cy={-r * 0.2} rx={r * 0.7} ry={r * 0.24} fill="none" stroke="#e8a412" strokeWidth="3" />
      </g>
    ))}
  </g>
);
// pluie de billets / pièces qui jaillissent d'un point (explosion douce)
export const Gerbe = ({f, t0, x, y, n = 14, force = 700, seed = 'g', billets = true, haut = 1}) => {
  const u = f - t0;
  if (u < 0) return null;
  return (
    <g>
      {[...Array(n)].map((_, k) => {
        const a = -Math.PI / 2 + (random(`${seed}a${k}`) - 0.5) * 2.2;
        const v = force * (0.5 + random(`${seed}v${k}`) * 0.6);
        const tt = u / 30;
        const px = x + Math.cos(a) * v * tt;
        const py = y + Math.sin(a) * v * tt * haut + 900 * tt * tt;
        const o = interpolate(u, [0, 4, 40, 55], [0, 1, 1, 0], clamp);
        if (py > 2100) return null;
        return billets && k % 3 !== 2 ? (
          <Billet key={k} id={`${seed}${k}`} x={px} y={py} s={0.42} rot={(random(`${seed}r${k}`) - 0.5) * 80 + u * 6 * (random(`${seed}s${k}`) - 0.5)} flip={Math.cos(u / 5 + k)} />
        ) : (
          <g key={k} opacity={o}>
            <Piece x={px} y={py} r={26} tourne={u / 18 + k * 0.1} />
          </g>
        );
      })}
    </g>
  );
};

// ===================== la banque (bâtiment à colonnes, en volume) =====================
// x, y : bas du centre de la façade. yeux : {ouvert, px, malin} (les fenêtres deviennent des yeux)
export const Banque = ({x, y, s = 1, f = 0, yeux = null, lueur = 0, logo = true}) => {
  const W = 560;
  const H = 520;
  const D = 120; // profondeur visible (côté droit)
  const malin = yeux?.malin || 0;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <defs>
        <linearGradient id="bq-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e6e2f4" />
        </linearGradient>
        <linearGradient id="bq-cote" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b8b2d8" />
          <stop offset="1" stopColor="#8a84b0" />
        </linearGradient>
        <radialGradient id="bq-lueur">
          <stop offset="0" stopColor="#ff6aa6" stopOpacity="0.6" />
          <stop offset="1" stopColor="#ff6aa6" stopOpacity="0" />
        </radialGradient>
      </defs>
      {lueur > 0 && <circle cx="0" cy={-H / 2} r={520} fill="url(#bq-lueur)" opacity={lueur} />}
      <Ombre x={40} y={6} rx={W * 0.62} ry={40} o={0.5} />
      {/* côté droit (volume) et pan du toit */}
      <path d={`M${W / 2},0 L${W / 2 + D},${-D * 0.5} L${W / 2 + D},${-H + 40 - D * 0.5} L${W / 2},${-H + 40} Z`} fill="url(#bq-cote)" />
      <path d={`M0,${-H - 130} L${D},${-H - 130 - D * 0.5} L${W / 2 + 40 + D},${-H + 40 - D * 0.5} L${W / 2 + 40},${-H + 40} Z`} fill="#9a94c0" />
      <path d={`M${W / 2 + 40},${-H + 34} L${W / 2 + 50 + D},${-H + 34 - D * 0.5} L${W / 2 + 50 + D},${-H + 64 - D * 0.5} L${W / 2 + 50},${-H + 64} Z`} fill="#b8b2d8" />
      {/* marches */}
      <rect x={-W / 2 - 30} y="-26" width={W + 60} height="26" rx="4" fill="#d8d4ec" />
      <rect x={-W / 2 - 14} y="-48" width={W + 28} height="24" rx="4" fill="#e8e4f8" />
      {/* façade */}
      <rect x={-W / 2} y={-H + 40} width={W} height={H - 88} fill="url(#bq-face)" />
      {/* colonnes */}
      {[-0.36, -0.12, 0.12, 0.36].map((u, k) => (
        <g key={k}>
          <rect x={u * W - 26} y={-H + 120} width="52" height={H - 170} fill="#f4f2fc" />
          <rect x={u * W - 26} y={-H + 120} width="14" height={H - 170} fill="#d8d4ec" />
          <rect x={u * W - 36} y={-H + 104} width="72" height="20" rx="4" fill="#e0dcf2" />
          <rect x={u * W - 36} y="-62" width="72" height="16" rx="4" fill="#e0dcf2" />
        </g>
      ))}
      {/* porte */}
      <path d={`M-58,-48 L-58,-220 Q0,-268 58,-220 L58,-48 Z`} fill="#2a1f5a" />
      <path d={`M0,-48 L0,-250`} stroke="#4a3a8a" strokeWidth="4" />
      {/* fronton */}
      <path d={`M${-W / 2 - 40},${-H + 40} L0,${-H - 130} L${W / 2 + 40},${-H + 40} Z`} fill="#f4f2fc" />
      <path d={`M${-W / 2 - 40},${-H + 40} L0,${-H - 130} L${W / 2 + 40},${-H + 40}`} fill="none" stroke="#d8d4ec" strokeWidth="10" strokeLinejoin="round" />
      <rect x={-W / 2 - 50} y={-H + 34} width={W + 100} height="30" rx="6" fill="#e0dcf2" />
      {/* logo de la banque (générique) */}
      {logo && (
        <g transform={`translate(0 ${-H - 30})`}>
          <circle r="52" fill={P.rose} />
          <text y="24" textAnchor="middle" fontFamily={TITRE} fontSize="66" fill="#fff">€</text>
        </g>
      )}
      {/* fenêtres-yeux */}
      {yeux &&
        [-0.24, 0.24].map((u, k) => {
          const o = yeux.ouvert ?? 1;
          return (
            <g key={k} transform={`translate(${u * W} ${-H + 250})`}>
              <ellipse rx="56" ry={52 * o} fill="#fff" stroke="#2a1f5a" strokeWidth="6" />
              <circle cx={(yeux.px || 0) * 20} cy={8 * o} r={24 * o} fill="#1b1a2e" />
              <circle cx={(yeux.px || 0) * 20 + 8} cy={0} r={7 * o} fill="#fff" />
              {/* paupière qui se plisse (malin) */}
              <path d={`M-62,${-56} L62,${-56} L62,${-56 + 60 * malin + (k ? -1 : 1) * 18 * malin} L-62,${-56 + 60 * malin + (k ? 1 : -1) * 18 * malin} Z`} fill="#f4f2fc" />
              <path d={`M-62,${-56 + 60 * malin + (k ? 1 : -1) * 18 * malin} L62,${-56 + 60 * malin + (k ? -1 : 1) * 18 * malin}`} stroke="#2a1f5a" strokeWidth={6 * Math.min(1, malin * 4)} strokeLinecap="round" />
            </g>
          );
        })}
    </g>
  );
};

// ===================== la carte bancaire (rose, générique) =====================
export const Carte = ({x, y, s = 1, rot = 0, sx = 1, id = 'cb', nfc = 0}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s * sx} ${s})`}>
    <defs>
      <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ff6aa6" />
        <stop offset="0.6" stopColor="#ff2e7e" />
        <stop offset="1" stopColor="#a8104a" />
      </linearGradient>
    </defs>
    <rect x="-166" y="-96" width="340" height="212" rx="20" fill="#000" opacity="0.2" />
    <rect x="-170" y="-106" width="340" height="212" rx="20" fill={`url(#${id}-g)`} />
    <path d="M-170,-20 Q0,-90 170,-60 L170,-106 L-170,-106 Z" fill="#fff" opacity="0.1" />
    <rect x="-130" y="-40" width="58" height="44" rx="8" fill="#ffd866" />
    <path d="M-130,-18 h58 M-101,-40 v44" stroke="#c8960a" strokeWidth="3" />
    {[0, 1, 2].map((k) => (
      <path key={k} d={`M${-50 + k * 14},-34 q10,16 0,32`} stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" opacity={0.6 + 0.4 * nfc} />
    ))}
    <text x="-130" y="62" fontFamily={TEXTE} fontWeight="700" fontSize="24" fill="#fff" letterSpacing="3" opacity="0.9">•••• 2026</text>
    <circle cx="112" cy="56" r="26" fill="#ffc83a" opacity="0.9" />
    <circle cx="140" cy="56" r="26" fill="#fff" opacity="0.6" />
  </g>
);

// ===================== petit téléphone (écran personnalisé) =====================
export const MiniTel = ({x, y, s = 1, rot = 0, children, id = 'mt', fond = '#0f1020'}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <defs>
      <clipPath id={`${id}-c`}>
        <rect x="-150" y="-300" width="300" height="600" rx="40" />
      </clipPath>
    </defs>
    <rect x="-152" y="-292" width="320" height="616" rx="52" fill="#000" opacity="0.25" />
    <rect x="-166" y="-316" width="332" height="632" rx="54" fill="#2a2c34" />
    <rect x="-160" y="-310" width="320" height="620" rx="50" fill="#0a0a0e" />
    <g clipPath={`url(#${id}-c)`}>
      <rect x="-150" y="-300" width="300" height="600" fill={fond} />
      {children}
      <path d="M-150,-300 L40,-300 L-150,40 Z" fill="#fff" opacity="0.05" />
    </g>
    <rect x="-46" y="-288" width="92" height="26" rx="13" fill="#000" />
  </g>
);

// ===================== les icônes des pubs =====================
export const Tele = ({x, y, s = 1, f = 0, ecran = null}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-150" y="-100" width="300" height="190" rx="18" fill="#22222e" />
    <rect x="-138" y="-88" width="276" height="166" rx="10" fill="#4f7cff" />
    {ecran}
    <path d="M-138,-88 L40,-88 L-138,40 Z" fill="#fff" opacity="0.12" />
    <rect x="-60" y="96" width="120" height="14" rx="7" fill="#22222e" />
    <path d="M-50,110 L-70,140 M50,110 L70,140" stroke="#22222e" strokeWidth="10" strokeLinecap="round" />
  </g>
);
export const IconeInsta = ({x, y, s = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <defs>
      <linearGradient id="ig-g" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stopColor="#ffc83a" />
        <stop offset="0.4" stopColor="#ff4d6a" />
        <stop offset="0.75" stopColor="#d02aa8" />
        <stop offset="1" stopColor="#6a3aff" />
      </linearGradient>
    </defs>
    <rect x="-110" y="-110" width="220" height="220" rx="60" fill="url(#ig-g)" />
    <rect x="-70" y="-70" width="140" height="140" rx="42" fill="none" stroke="#fff" strokeWidth="16" />
    <circle r="34" fill="none" stroke="#fff" strokeWidth="16" />
    <circle cx="44" cy="-44" r="10" fill="#fff" />
  </g>
);
export const IconePlay = ({x, y, s = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-130" y="-92" width="260" height="184" rx="56" fill="#ff2a2a" />
    <path d="M-30,-48 L54,0 L-30,48 Z" fill="#fff" />
  </g>
);
// anneau lumineux de l'influenceuse
export const Anneau = ({x, y, r = 120}) => (
  <g>
    <circle cx={x} cy={y} r={r + 30} fill="#fff6d8" opacity="0.18" filter="url(#flou8)" />
    <circle cx={x} cy={y} r={r} fill="none" stroke="#fff6d8" strokeWidth="22" />
    <line x1={x} y1={y + r} x2={x} y2={y + r + 170} stroke="#3a3a48" strokeWidth="10" />
  </g>
);

// ===================== éléments d'interface =====================
// tuile arrondie avec une icône (posée en 2,5D par l'appelant)
export const Tuile = ({x, y, s = 1, c = '#fff', children, w = 260, h = 260}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-w / 2 + 8} y={-h / 2 + 22} width={w} height={h} rx="48" fill="#000" opacity="0.28" filter="url(#flou8)" />
    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="48" fill={c} />
    <rect x={-w / 2} y={-h / 2} width={w} height={h * 0.45} rx="48" fill="#fff" opacity="0.18" />
    {children}
  </g>
);
// étiquette de prix accrochée (ficelle vers le haut)
export const Etiquette = ({x, y, s = 1, rot = 0, texte, c = '#ffc83a', ct = '#3a2400', w = 300}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <path d="M0,-130 L0,-60" stroke="#fff" strokeWidth="5" />
    <path d={`M${-w / 2},-60 L${w / 2 - 50},-60 L${w / 2},0 L${w / 2 - 50},60 L${-w / 2},60 Z`} fill="#000" opacity="0.25" transform="translate(8 12)" />
    <path d={`M${-w / 2},-60 L${w / 2 - 50},-60 L${w / 2},0 L${w / 2 - 50},60 L${-w / 2},60 Z`} fill={c} />
    <circle cx={w / 2 - 50} cy="0" r="12" fill="#fff" opacity="0.8" />
    <text x={-22} y="22" textAnchor="middle" fontFamily={TITRE} fontSize={Math.min(62, (w - 90) / (texte.length * 0.66))} fill={ct}>{texte}</text>
  </g>
);
// coche / croix dans une pastille
export const Coche = ({x, y, s = 1, u = 1, ok = true}) => (
  <g transform={`translate(${x} ${y}) scale(${s * u})`}>
    <circle r="56" fill={ok ? P.vert : P.rouge} />
    <circle r="56" fill="none" stroke="#fff" strokeWidth="6" opacity="0.4" />
    {ok ? <path d="M-26,2 L-6,22 L28,-20" stroke="#fff" strokeWidth="14" fill="none" strokeLinecap="round" strokeLinejoin="round" /> : <path d="M-22,-22 L22,22 M22,-22 L-22,22" stroke="#fff" strokeWidth="14" strokeLinecap="round" />}
  </g>
);
// tampon qui s'écrase
export const Tampon = ({f, t0, x, y, texte, c = P.vert, rot = -10, s = 1}) => {
  if (f < t0) return null;
  const u = f - t0;
  const k = interpolate(u, [0, 5, 9], [2.4, 0.92, 1], {...clamp, easing: Easing.out(Easing.quad)});
  const o = interpolate(u, [0, 3], [0, 1], clamp);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${k * s})`} opacity={o}>
      <rect x="-340" y="-80" width="680" height="160" rx="26" fill="none" stroke={c} strokeWidth="14" />
      <rect x="-324" y="-64" width="648" height="128" rx="16" fill={c} opacity="0.14" />
      <text x="0" y="24" textAnchor="middle" fontFamily={TITRE} fontSize={Math.min(70, 600 / (texte.length * 0.68))} fill={c}>{texte}</text>
    </g>
  );
};
// gros chiffre qui défile
export const Chiffre = ({x, y, v, taille = 140, c = '#fff', suffixe = ' €', prefixe = '', anchor = 'middle', ombre = true}) => {
  const s = `${prefixe}${Math.round(v).toLocaleString('fr-FR').replace(/ | /g, ' ')}${suffixe}`;
  return (
    <g>
      {ombre && <text x={x + 6} y={y + 10} textAnchor={anchor} fontFamily={TITRE} fontSize={taille} fill="#000" opacity="0.3">{s}</text>}
      <text x={x} y={y} textAnchor={anchor} fontFamily={TITRE} fontSize={taille} fill={c}>{s}</text>
    </g>
  );
};
// éclat (étoiles qui jaillissent)
export const Eclat = ({f, t0, x, y, n = 10, r = 220, c = '#fff', seed = 'e'}) => {
  const u = f - t0;
  if (u < 0 || u > 22) return null;
  const k = u / 22;
  return (
    <g>
      {[...Array(n)].map((_, j) => {
        const a = (j / n) * Math.PI * 2 + random(`${seed}${j}`) * 0.4;
        const d = r * Easing.out(Easing.cubic)(k);
        return <line key={j} x1={x + Math.cos(a) * d * 0.6} y1={y + Math.sin(a) * d * 0.6} x2={x + Math.cos(a) * d} y2={y + Math.sin(a) * d} stroke={c} strokeWidth={10 * (1 - k)} strokeLinecap="round" />;
      })}
    </g>
  );
};
// confettis
export const Confettis = ({f, t0 = 0, n = 60, seed = 'c', dense = 1}) => (
  <g>
    {[...Array(n)].map((_, k) => {
      const u = f - t0 - random(`${seed}d${k}`) * 30 * dense;
      if (u < 0) return null;
      const x0 = random(`${seed}x${k}`) * 1080;
      const v = 6 + random(`${seed}v${k}`) * 6;
      const y = -60 + u * v;
      if (y > 2000) return null;
      const x = x0 + Math.sin(u / 10 + k) * 40;
      const r = u * (4 + 6 * random(`${seed}r${k}`));
      const c = ['#ff2e7e', '#ffc83a', '#4fc3ff', '#3ad86a', '#ffffff', '#8a5aff'][k % 6];
      return <rect key={k} x="-12" y="-6" width="24" height="12" rx="3" fill={c} transform={`translate(${x} ${y}) rotate(${r}) scale(1 ${Math.cos(u / 6 + k)})`} />;
    })}
  </g>
);
// bulle « DIS-LE EN COMMENTAIRE »
export const BulleCommentaire = ({f, t0, y = 1700}) => {
  if (f < t0) return null;
  const s = spring({frame: f - t0, fps: 30, config: {damping: 10}});
  return (
    <g transform={`translate(540 ${y}) scale(${s})`}>
      <rect x="-400" y="-62" width="800" height="140" rx="70" fill="#000" opacity="0.3" />
      <rect x="-400" y="-70" width="800" height="140" rx="70" fill="#fff" />
      <image href={staticFile('emoji/1f4ac.svg')} x="-370" y="-48" width="96" height="96" />
      <text x="40" y="18" textAnchor="middle" fontFamily="'DejaVu Sans', Arial, sans-serif" fontWeight="900" fontSize="46" fill="#111">
        DIS-LE EN COMMENTAIRE
      </text>
    </g>
  );
};
// ligne qui se dessine avec des points qui y circulent (flux d'argent)
export const Flux = ({d, u = 1, c = P.or, f = 0, points = true, w = 10, id = 'fx'}) => (
  <g>
    <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - u} opacity="0.35" />
    {points && u > 0.99 && <path d={d} fill="none" stroke={c} strokeWidth={w * 1.8} strokeLinecap="round" pathLength="1" strokeDasharray="0.02 0.08" strokeDashoffset={-f / 40} />}
  </g>
);
export {Easing, interpolate, random, spring};
