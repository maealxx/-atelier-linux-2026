import {AbsoluteFill, Audio, Easing, interpolate, random, staticFile, useCurrentFrame} from 'remotion';
import {Finition} from './moteur';
import {Cadre, Couche, DefsFlou, ease, Emo, Fig, lerp, mainD, mainG, Ombre, pop, TEXTE, TITRE, versEcran} from './ParrainageKit';

// ===================== « La classe » : vidéos explicatives drôles (1 min) =====================
// Un prof dans une salle de classe lance le sujet et fait les transitions ; le reste, ce sont des mises en
// situation avec le bonhomme et des schémas animés. Style 2D propre : aplats + dégradés doux, parallaxe, ressorts.

// ---------- le prof (même style que le bonhomme) ----------
export const PROF = {couleurs: {chev: '#6a6a72', haut: '#dfe8f6', hautO: '#c4d0e4', pant: '#4a4a5a', peau: '#f0c09a', peauO: '#dca37e'}};
export const LunettesMoustache = () => (
  <g>
    {[272, 328].map((x) => <circle key={x} cx={x} cy="198" r="21" fill="#ffffff" fillOpacity="0.18" stroke="#2a2a34" strokeWidth="6" />)}
    <path d="M293,196 Q300,190 307,196" stroke="#2a2a34" strokeWidth="5" fill="none" />
    <path d="M251,194 L234,190 M349,194 L366,190" stroke="#2a2a34" strokeWidth="5" />
    <path d="M276,226 Q288,214 300,222 Q312,214 324,226 Q312,232 300,228 Q288,232 276,226 Z" fill="#5a5a62" />
    {/* front dégarni */}
    <path d="M250,128 Q300,104 350,128 Q330,118 300,118 Q270,118 250,128 Z" fill="#f0c09a" />
  </g>
);
export const CravateProf = ({c = '#c8344a'}) => (
  <g>
    <path d="M292,300 L308,300 L312,318 L300,326 L288,318 Z" fill={c} />
    <path d="M294,322 L306,322 L322,436 L300,458 L282,436 Z" fill={c} transform="rotate(-8 300 330)" />
    <path d="M300,322 L306,322 L322,436 L300,458 Z" fill="#000" opacity="0.15" transform="rotate(-8 300 330)" />
  </g>
);
// cheveux en bataille du matin (repère de la tête)
export const CheveuxMatin = () => (
  <g fill="#2B2140">
    <path d="M232,140 L206,96 L254,124 Z" />
    <path d="M262,112 L250,58 L290,104 Z" />
    <path d="M300,104 L318,50 L330,108 Z" />
    <path d="M338,118 L382,82 L366,138 Z" />
    <path d="M360,150 L404,138 L376,170 Z" />
  </g>
);
export const MAMAN = {coiffure: 'carre', cils: true, couleurs: {chev: '#5a3424', haut: '#f7a8c4', hautO: '#e88aac', pant: '#f7a8c4', peau: '#f2c3a0', peauO: '#e3a984'}};
const ELEVES = [
  {couleurs: {chev: '#1a1210', haut: '#3a8ad8', hautO: '#2a70b8', peau: '#c8906a', peauO: '#b07a58'}},
  {coiffure: 'queue', couleurs: {chev: '#c8803a', haut: '#ffd23a', hautO: '#e8b820'}},
  {couleurs: {chev: '#3a2418', haut: '#3ad86a', hautO: '#2ab858'}},
  {coiffure: 'long', couleurs: {chev: '#1a1214', haut: '#ff7ab0', hautO: '#e8609a', peau: '#8a5a3a', peauO: '#74482c'}},
];

// ---------- la salle de classe ----------
const Craie = ({id = 'craie'}) => (
  <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
    <feDisplacementMap in="SourceGraphic" in2="n" scale="5" result="d" />
    <feComponentTransfer in="n" result="m">
      <feFuncA type="discrete" tableValues="0 1 1 1 1 0.6" />
    </feComponentTransfer>
    <feComposite in="d" in2="m" operator="in" />
  </filter>
);
// tableau : x, y = coin haut-gauche, w, h ; contenu = dessin à la craie
const Tableau = ({x, y, w, h, children}) => (
  <g>
    <rect x={x - 26} y={y - 26} width={w + 52} height={h + 52} rx="10" fill="#9a6a3a" />
    <rect x={x - 26} y={y - 26} width={w + 52} height="14" rx="6" fill="#b88654" />
    <rect x={x} y={y} width={w} height={h} fill="#2f5a48" />
    <rect x={x} y={y} width={w} height={h} fill="url(#cl-tab)" />
    <rect x={x - 40} y={y + h + 18} width={w + 80} height="22" rx="6" fill="#86592e" />
    <rect x={x + 60} y={y + h + 8} width="60" height="14" rx="5" fill="#f4f0e4" />
    <rect x={x + 140} y={y + h + 6} width="80" height="18" rx="5" fill="#d8c8a8" />
    {children}
  </g>
);
export const Classe = ({f, titre = [], ecrit = 1, schema = null}) => (
  <g>
    <defs>
      <linearGradient id="cl-mur" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f6dca6" />
        <stop offset="1" stopColor="#efc98a" />
      </linearGradient>
      <radialGradient id="cl-tab" cx="40%" cy="30%" r="80%">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.08" />
        <stop offset="1" stopColor="#000000" stopOpacity="0.18" />
      </radialGradient>
      <linearGradient id="cl-ciel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7ec8f8" />
        <stop offset="1" stopColor="#c8ecff" />
      </linearGradient>
      <linearGradient id="cl-rayon" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff6d8" stopOpacity="0.5" />
        <stop offset="1" stopColor="#fff6d8" stopOpacity="0" />
      </linearGradient>
      <Craie />
    </defs>
    <Couche p={0.3}>
      <rect x="-400" y="-400" width="1880" height="2200" fill="url(#cl-mur)" />
      <rect x="-400" y="1180" width="1880" height="300" fill="#e2b06c" />
      <rect x="-400" y="1170" width="1880" height="16" fill="#c8924e" />
      {/* fenêtre à gauche, rayons de soleil */}
      <rect x="-300" y="330" width="320" height="640" rx="10" fill="#f8f4ea" />
      <rect x="-280" y="350" width="280" height="600" fill="url(#cl-ciel)" />
      <ellipse cx={-150 + 20 * Math.sin(f / 60)} cy="460" rx="90" ry="34" fill="#fff" opacity="0.9" />
      <rect x="-150" y="350" width="12" height="600" fill="#f8f4ea" />
      <rect x="-280" y="640" width="280" height="12" fill="#f8f4ea" />
      <path d="M20,360 L620,1400 L380,1400 L20,800 Z" fill="url(#cl-rayon)" opacity={0.6 + 0.1 * Math.sin(f / 40)} />
      {/* horloge, affiches */}
      <g transform="translate(540 230)">
        <circle r="62" fill="#fff" stroke="#3a3a48" strokeWidth="10" />
        <path d={`M0,0 L${Math.sin(f / 50) * 36},${-Math.cos(f / 50) * 36}`} stroke="#3a3a48" strokeWidth="6" strokeLinecap="round" />
        <path d="M0,0 L22,-18" stroke="#3a3a48" strokeWidth="8" strokeLinecap="round" />
      </g>
      <g transform="translate(990 300) rotate(4)">
        <rect x="-70" y="-90" width="140" height="180" rx="6" fill="#ffffff" />
        <Emo c="1f9b7" x={0} y={-10} s={100} />
        <rect x="-50" y="56" width="100" height="10" rx="5" fill="#ff7ab0" />
      </g>
      <Tableau x={120} y={380} w={840} h={560}>
        <g filter="url(#craie)">
          {titre.map((l, k) => {
            const u = Math.max(0, Math.min(1, ecrit * titre.length - k));
            return (
              <g key={k}>
                <clipPath id={`cl-t${k}`}>
                  <rect x="140" y={430 + k * 150} width={800 * u} height="150" />
                </clipPath>
                <text x="540" y={540 + k * 150} textAnchor="middle" fontFamily={TITRE} fontSize={Math.min(100, 780 / (l.length * 0.66))} fill="#f4f2ea" clipPath={`url(#cl-t${k})`} transform={`rotate(${k % 2 ? 1 : -1} 540 ${520 + k * 150})`}>{l}</text>
              </g>
            );
          })}
          {schema}
        </g>
      </Tableau>
    </Couche>
  </g>
);
// le bureau du prof (premier plan à gauche)
const Bureau = () => (
  <g>
    <Ombre x={250} y={1640} rx={380} ry={40} o={0.35} />
    <rect x="-80" y="1300" width="640" height="60" rx="10" fill="#a8743e" />
    <rect x="-60" y="1360" width="600" height="300" fill="#8a5a2e" />
    <rect x="-60" y="1360" width="600" height="20" fill="#000" opacity="0.15" />
    <rect x="40" y="1250" width="200" height="50" rx="6" fill="#3a8ad8" />
    <rect x="50" y="1214" width="180" height="40" rx="6" fill="#ff7a4a" />
    <Emo c="1f34e" x={400} y={1250} s={90} />
  </g>
);
const Eleves = ({f, rire = 0}) => (
  <g>
    {ELEVES.map((e, k) => {
      const x = [120, 400, 690, 960][k];
      const sec = rire * Math.abs(Math.sin(f / 2.5 + k)) * 16;
      return <Fig key={k} x={x} y={2420 - sec} s={1.25} dos {...e} ombre={false} breath={Math.sin(f / 9 + k) * 3} />;
    })}
  </g>
);
const Poussiere = ({f, t0, x, y}) => {
  const u = f - t0;
  if (u < 0 || u > 30) return null;
  return (
    <g>
      {[...Array(14)].map((_, k) => {
        const a = random(`pc${k}`) * 6.28;
        const r = (u / 30) * (40 + 120 * random(`pr${k}`));
        return <circle key={k} cx={x + Math.cos(a) * r} cy={y + Math.sin(a) * r - u * 1.5} r={4 + 6 * random(`ps${k}`)} fill="#f4f2ea" opacity={0.7 * (1 - u / 30)} />;
      })}
    </g>
  );
};

// ---------- la cuisine du matin ----------
const Cuisine = ({f, fane = 0}) => (
  <g>
    <defs>
      <linearGradient id="cu-mur" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffe9c4" />
        <stop offset="1" stopColor="#ffd8a0" />
      </linearGradient>
      <linearGradient id="cu-aube" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffb07a" />
        <stop offset="1" stopColor="#ffe2a8" />
      </linearGradient>
    </defs>
    <Couche p={0.3}>
      <rect x="-400" y="-400" width="1880" height="2900" fill="url(#cu-mur)" />
      {/* carrelage */}
      {[...Array(10)].map((_, k) => <rect key={k} x={-400 + k * 200} y="760" width="196" height="380" fill="#ffffff" opacity="0.35" />)}
      {/* fenêtre lever de soleil */}
      <rect x="360" y="260" width="400" height="420" rx="12" fill="#ffffff" />
      <rect x="380" y="280" width="360" height="380" fill="url(#cu-aube)" />
      <circle cx="560" cy="560" r="80" fill="#fff4c8" />
      <rect x="554" y="280" width="12" height="380" fill="#ffffff" />
      {/* placards hauts */}
      {[-260, 0, 820, 1080].map((x, k) => <rect key={k} x={x} y="200" width="240" height="300" rx="10" fill="#7ac8b0" stroke="#5aa890" strokeWidth="6" />)}
      {/* frigo */}
      <rect x="880" y="560" width="300" height="900" rx="20" fill="#f4f6fa" />
      <rect x="880" y="900" width="300" height="10" fill="#c8ccd8" />
      <rect x="910" y="700" width="16" height="140" rx="8" fill="#a8acb8" />
    </Couche>
    <Couche p={0.55}>
      {/* plan de travail */}
      <rect x="-300" y="1120" width="1180" height="60" rx="8" fill="#f4ece0" />
      <rect x="-500" y="1600" width="2080" height="900" fill="#e8c89a" />
      {[...Array(12)].map((_, k) => <path key={`sl${k}`} d={`M${-500 + k * 200},1600 L${-900 + k * 260},2500`} stroke="#d8b484" strokeWidth="6" />)}
      <rect x="-300" y="1180" width="1180" height="480" fill="#7ac8b0" />
      {[0, 1, 2, 3].map((k) => <rect key={k} x={-280 + k * 290} y="1210" width="270" height="440" rx="10" fill="#6ab8a0" />)}
      {/* plante qui fane */}
      <g transform="translate(120 1120)">
        <path d="M-40,0 L40,0 L30,-70 L-30,-70 Z" fill="#c8643a" />
        {[-30, 0, 30].map((a, k) => (
          <path key={k} d="M0,-70 C-10,-140 10,-180 0,-220" stroke="#3ab85a" strokeWidth="12" fill="none" strokeLinecap="round" transform={`rotate(${a + (a >= 0 ? 1 : -1) * 70 * fane + (k === 1 ? 90 * fane : 0)} 0 -70)`} />
        ))}
        {[-30, 0, 30].map((a, k) => (
          <ellipse key={`f${k}`} cx="0" cy="-230" rx="30" ry="16" fill={fane > 0.5 ? '#9a8a3a' : '#4ad86a'} transform={`rotate(${a + (a >= 0 ? 1 : -1) * 70 * fane + (k === 1 ? 90 * fane : 0)} 0 -70)`} />
        ))}
      </g>
      <rect x="230" y="1040" width="90" height="80" rx="8" fill="#ffffff" />
      <path d="M320,1060 q30,0 30,24 q0,24 -30,24" stroke="#ffffff" strokeWidth="10" fill="none" />
    </Couche>
  </g>
);
// le nuage vert qui sort de la bouche (bulles qui grossissent et ondulent)
const Haleine = ({f, t0, x, y, vers, u}) => {
  if (u <= 0) return null;
  return (
    <g opacity={Math.min(1, u * 2) * (1 - Math.max(0, u - 0.85) * 3)}>
      {[...Array(9)].map((_, k) => {
        const p = Math.max(0, Math.min(1, u * 1.4 - k * 0.06));
        const cx = lerp(x, vers, p) + 20 * Math.sin(f / 5 + k);
        const cy = y - 40 * Math.sin(p * Math.PI) + (k % 3 - 1) * 50 * p;
        const r = 30 + 90 * p * (0.7 + 0.3 * random(`hl${k}`));
        return <circle key={k} cx={cx} cy={cy} r={r} fill={k % 2 ? '#9ad84a' : '#7ac83a'} opacity={0.55} filter="url(#flou4)" />;
      })}
      {[0, 1, 2].map((k) => (
        <path key={`o${k}`} d={`M${lerp(x, vers, u) - 40 + k * 40},${y - 120} q-15,-25 0,-50 q15,-25 0,-50`} stroke="#6aa82a" strokeWidth="8" fill="none" strokeLinecap="round" opacity={0.7} transform={`translate(0 ${-10 * Math.sin(f / 4 + k)})`} />
      ))}
    </g>
  );
};

// ---------- l'intérieur de la bouche ----------
const Bacterie = ({x, y, s = 1, c = '#7ad84a', f, k, triste = 0}) => (
  <g transform={`translate(${x} ${y + 6 * Math.sin(f / 5 + k)}) scale(${s}) rotate(${10 * Math.sin(f / 7 + k)})`}>
    {[...Array(6)].map((_, j) => <path key={j} d={`M0,0 L${Math.cos(j) * 60},${Math.sin(j) * 52}`} stroke={c} strokeWidth="8" strokeLinecap="round" />)}
    <ellipse rx="46" ry="40" fill={c} />
    <ellipse rx="46" ry="40" fill="url(#bo-b)" />
    <ellipse cx="-14" cy="-6" rx="9" ry={11 * (1 - 0.6 * triste)} fill="#fff" />
    <ellipse cx="14" cy="-6" rx="9" ry={11 * (1 - 0.6 * triste)} fill="#fff" />
    <circle cx="-12" cy="-4" r="4.5" fill="#1a1a24" />
    <circle cx="16" cy="-4" r="4.5" fill="#1a1a24" />
    <path d={triste ? 'M-12,20 Q0,10 12,20' : 'M-12,14 Q0,26 12,14'} stroke="#1a1a24" strokeWidth="4" fill="none" strokeLinecap="round" />
  </g>
);
const BACTS = [...Array(26)].map((_, k) => ({x: 120 + random(`bx${k}`) * 840, y: 1000 + random(`by${k}`) * 520, s: 0.6 + random(`bs${k}`) * 0.6, c: ['#7ad84a', '#b07aff', '#ffc83a', '#4ac8e8'][k % 4], t: k * 1.6}));
const Bouche = ({f, apparition = 1, vague = -1}) => (
  <g>
    <defs>
      <radialGradient id="bo-f" cx="50%" cy="45%" r="70%">
        <stop offset="0" stopColor="#5a0e1e" />
        <stop offset="1" stopColor="#1a0208" />
      </radialGradient>
      <linearGradient id="bo-l" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ff8aa0" />
        <stop offset="1" stopColor="#d84a6a" />
      </linearGradient>
      <radialGradient id="bo-b" cx="35%" cy="30%" r="70%">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.45" />
        <stop offset="1" stopColor="#000000" stopOpacity="0.15" />
      </radialGradient>
      <linearGradient id="bo-v" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#c8f0ff" stopOpacity="0.2" />
        <stop offset="0.7" stopColor="#c8f0ff" stopOpacity="0.75" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0.95" />
      </linearGradient>
    </defs>
    <Couche p={0.3}>
      <rect x="-400" y="-400" width="1880" height="2700" fill="url(#bo-f)" />
      <ellipse cx="540" cy="760" rx="160" ry="200" fill="#000" opacity="0.5" filter="url(#flou14)" />
      <path d="M520,420 Q540,560 560,420" stroke="#ff6a86" strokeWidth="40" fill="none" strokeLinecap="round" />
    </Couche>
    <Couche p={0.7}>
      {/* la langue */}
      <path d="M-100,1900 C-60,1200 180,980 540,980 C900,980 1140,1200 1180,1900 Z" fill="url(#bo-l)" />
      <path d="M540,1020 C530,1300 550,1600 540,1900" stroke="#c83a5a" strokeWidth="10" fill="none" opacity="0.5" />
      {[...Array(40)].map((_, k) => <circle key={k} cx={100 + random(`pa${k}`) * 880} cy={1060 + random(`pb${k}`) * 760} r={6 + 6 * random(`pc${k}`)} fill="#ffb0c0" opacity="0.5" />)}
      {/* les bactéries */}
      {BACTS.map((b, k) => {
        const u = pop(f, b.t / apparition);
        const emporte = vague > 0 ? Math.max(0, Math.min(1, (vague * 1400 - b.x - 100) / 300)) : 0;
        return u > 0 ? (
          <g key={k} transform={`translate(${emporte * (700 + 300 * random(`be${k}`))} ${-emporte * 300 * random(`bf${k}`)}) rotate(${emporte * 300} ${b.x} ${b.y})`} opacity={1 - emporte * 0.8}>
            <g transform={`translate(${b.x} ${b.y}) scale(${u}) translate(${-b.x} ${-b.y})`}>
              <Bacterie x={b.x} y={b.y} s={b.s} c={b.c} f={f} k={k} triste={emporte > 0 ? 1 : 0} />
            </g>
          </g>
        ) : null;
      })}
      {/* la vague de salive */}
      {vague > 0 && (
        <g>
          <path d={`M-400,1900 L-400,${900} C${-200 + vague * 1400 - 600},800 ${vague * 1400 - 300},${900 + 60 * Math.sin(f / 3)} ${vague * 1400},${1000 + 80 * Math.sin(f / 4)} C${vague * 1400 + 120},1300 ${vague * 1400 + 60},1600 ${vague * 1400 + 100},1900 Z`} fill="url(#bo-v)" />
          {[...Array(14)].map((_, k) => <circle key={k} cx={vague * 1400 - 50 - random(`bv${k}`) * 500} cy={950 + random(`bw${k}`) * 900} r={8 + 16 * random(`bz${k}`)} fill="none" stroke="#ffffff" strokeWidth="4" opacity="0.7" />)}
        </g>
      )}
    </Couche>
    <Couche p={1.1}>
      {/* dents du haut et du bas */}
      {[...Array(8)].map((_, k) => <rect key={k} x={-60 + k * 152} y={-60 + Math.abs(k - 3.5) * 22} width="140" height="230" rx="40" fill="#fbf8ee" stroke="#e0d8c4" strokeWidth="6" />)}
      {[...Array(8)].map((_, k) => <rect key={`b${k}`} x={-60 + k * 152} y={1780 - Math.abs(k - 3.5) * 22} width="140" height="230" rx="40" fill="#fbf8ee" stroke="#e0d8c4" strokeWidth="6" />)}
    </Couche>
  </g>
);

// ===================== le test de 10 secondes =====================
const T = {cuisine: 56, bouche: 158, vague: 218, prof2: 282, fin: 330};
const MOTS = (s) => Math.round(s * 30);
export const DUREE_TEST_CLASSE = T.fin;
const Image = ({f, children, t, cam, flash = 0, noir = 0}) => (
  <AbsoluteFill style={{background: '#000'}}>
    <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
      <DefsFlou />
      <Cadre cam={cam} t={t} punch={0.05}>{children}</Cadre>
      <rect width="1080" height="1920" fill="#fff" opacity={flash} />
      <rect width="1080" height="1920" fill="#000" opacity={noir} />
      <Finition f={f} id="clf" grain={0.03} vignette={0.35} />
    </svg>
  </AbsoluteFill>
);
export const TestClasse = () => {
  const f = useCurrentFrame();
  let contenu;
  if (f < T.cuisine) {
    // 1re image : le prof se retourne du tableau, le titre est déjà écrit à la craie
    const tourne = ease(f, 0, 8, Easing.out(Easing.cubic));
    const ecrit = ease(f, 0, MOTS(1.5), Easing.linear);
    const pose = {epauleG: lerp(150, 120, tourne), coudeG: lerp(20, 30, tourne), epauleD: -15, coudeD: 20, smile: 0.5, eyes: 1.1, brows: -4, breath: Math.sin(f / 7) * 4, tilt: -4};
    const k = f / T.cuisine;
    contenu = (
      <Image f={f} t={f} cam={{x: lerp(30, 0, k), y: lerp(40, 0, k), z: lerp(1.0, 1.07, k)}}>
        <Classe f={f} titre={['POURQUOI', 'TU PUES DE LA', 'GUEULE LE MATIN ?']} ecrit={ecrit} />
        <Couche p={0.8}>
          <Bureau />
          <g transform={`translate(770 0) scale(${lerp(-1, 1, tourne) || 0.01} 1) translate(-770 0)`}>
            <Fig x={770} y={1720} s={1.05} {...PROF} dos={tourne < 0.5} {...pose} tete={tourne >= 0.5 ? <LunettesMoustache /> : null} devant={tourne >= 0.5 ? <CravateProf /> : null} />
          </g>
          <Poussiere f={f} t0={2} x={versEcran(770, 1720, 1.05, mainG(pose))[0]} y={versEcran(770, 1720, 1.05, mainG(pose))[1]} />
        </Couche>
        <Couche p={1.3} flou={4}>
          <Eleves f={f} />
        </Couche>
      </Image>
    );
  } else if (f < T.bouche) {
    // la cuisine : tu dis bonjour à ta mère… le nuage vert… elle recule de trois mètres
    const t = f - T.cuisine;
    const bonjour = MOTS(2.8) - T.cuisine;
    const recule = MOTS(4.02) - T.cuisine;
    const h = ease(t, bonjour, bonjour + 22, Easing.out(Easing.quad));
    const r = ease(t, recule - 4, recule + 10, Easing.out(Easing.back(1.5)));
    const entre = ease(t, 0, 16, Easing.out(Easing.cubic));
    const moiPose = {epauleD: -150 * (1 - h) - 20 * h, coudeD: -30, epauleG: 15, coudeG: -10, eyes: lerp(0.35, 0.5, h), smile: 0, scream: t > bonjour - 2 && t < bonjour + 14 ? 0.5 : 0, breath: Math.sin(f / 8) * 4, tilt: 6};
    const [bx, by] = versEcran(lerp(200, 330, entre), 1700, 1.0, [300, 240]);
    contenu = (
      <Image f={f} t={t} cam={{x: lerp(-20, 30, t / 100), z: 1.02 + 0.03 * r, r: 2.5 * r * Math.sin(t / 2) * (1 - ease(t, recule + 10, recule + 20))}}>
        <Cuisine f={f} fane={ease(t, recule, recule + 18)} />
        <Couche p={0.9}>
          <Fig x={lerp(200, 330, entre)} y={1700} s={1.0} {...moiPose} tete={<CheveuxMatin />} />
          <Fig x={lerp(760, 1010, r)} y={1700} s={0.98} {...MAMAN} epauleD={-40 - 60 * r} coudeD={-70} epauleG={20 + 90 * r} coudeG={-40} smile={0.6 * (1 - r)} eyes={lerp(1, 1.35, r)} worry={r} tilt={lerp(0, 14, r)} scream={0.3 * r} />
          <Emo c="2615" x={lerp(700, 830, r)} y={lerp(1040, 1000, r)} s={80} rot={-30 * r} />
          <Haleine f={f} t0={bonjour} x={bx + 40} y={by} vers={lerp(760, 900, r) - 60} u={h} />
          {r > 0.3 && <Emo c="1f922" x={lerp(760, 960, r) + 40} y={850} s={120 * pop(t, recule + 2)} />}
        </Couche>
      </Image>
    );
  } else if (f < T.prof2) {
    // dans ta bouche : des milliards de bactéries… puis la salive les emporte
    const t = f - T.bouche;
    const ouvre = ease(t, 0, 10, Easing.out(Easing.cubic));
    const vague = f >= T.vague ? ease(f, MOTS(8.0), MOTS(9.1), Easing.inOut(Easing.cubic)) : -1;
    contenu = (
      <AbsoluteFill style={{background: '#000'}}>
        <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
          <defs>
            <clipPath id="bo-c">
              <circle cx="540" cy="960" r={1200 * ouvre + 1} />
            </clipPath>
          </defs>
          <DefsFlou />
          <g clipPath="url(#bo-c)">
            <Cadre cam={{z: lerp(1.15, 1.0, ouvre) + 0.04 * (t / 120), y: 20 * Math.sin(f / 30)}} t={t} punch={0.03}>
              <Bouche f={t} apparition={MOTS(6.3) - T.bouche > 0 ? 1 : 1} vague={vague} />
            </Cadre>
          </g>
          <Finition f={f} id="clf2" grain={0.03} vignette={0.5} />
        </svg>
      </AbsoluteFill>
    );
  } else {
    // retour en classe : le prof dessine le schéma — salive → bactéries
    const t = f - T.prof2;
    const trace = ease(t, 2, 36, Easing.inOut(Easing.cubic));
    const pose = {epauleG: 120 + 10 * Math.sin(f / 3), coudeG: 20, epauleD: -20, coudeD: 30, smile: 0.7, eyes: 1.1, brows: -4, breath: Math.sin(f / 7) * 4};
    const schema = (
      <g>
        <text x="300" y="640" textAnchor="middle" fontFamily={TITRE} fontSize="64" fill="#9ad8ff" opacity={Math.min(1, trace * 3)}>SALIVE</text>
        <path d="M420,620 L640,620" stroke="#f4f2ea" strokeWidth="12" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - Math.min(1, Math.max(0, trace * 2 - 0.4))} />
        <path d="M610,590 L645,620 L610,650" stroke="#f4f2ea" strokeWidth="12" fill="none" strokeLinecap="round" opacity={trace > 0.7 ? 1 : 0} />
        <g opacity={trace > 0.5 ? 1 : 0} transform="translate(780 620) scale(1.1)">
          <Bacterie x={0} y={0} s={1} c="#f4f2ea" f={f} k={1} triste />
        </g>
        <path d="M720,540 L840,700 M840,540 L720,700" stroke="#ff6a6a" strokeWidth="14" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - ease(t, 30, 44)} />
        <text x="540" y="840" textAnchor="middle" fontFamily={TITRE} fontSize="58" fill="#f4f2ea" opacity={ease(t, 38, 46)}>= ÇA NETTOIE</text>
      </g>
    );
    contenu = (
      <Image f={f} t={t} cam={{x: lerp(-40, -60, t / 48), z: 1.12 + 0.03 * (t / 48), y: -40, r: -2}}>
        <Classe f={f} titre={[]} schema={schema} />
        <Couche p={0.8}>
          <Fig x={860} y={1760} s={1.1} {...PROF} {...pose} pupilX={-14} tete={<LunettesMoustache />} devant={<CravateProf />} />
          <Poussiere f={t} t0={4} x={versEcran(860, 1760, 1.1, mainG(pose))[0]} y={versEcran(860, 1760, 1.1, mainG(pose))[1]} />
        </Couche>
        <Couche p={1.3} flou={4}>
          <Eleves f={f} />
        </Couche>
      </Image>
    );
  }
  return (
    <AbsoluteFill>
      {contenu}
    </AbsoluteFill>
  );
};
