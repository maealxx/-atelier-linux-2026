import {Easing, interpolate, random, Series, useCurrentFrame} from 'remotion';
import {Calque, Carte, clamp, course, ease, Ecran, lerp, lisse, POLICE, pop, Puce, punchZ, tremble, TXT, Vue, ZOMBIE} from './Hopital';
import {montage} from './montage';
import {Rond} from './Rond';
import {BulleCommentaire, ChoixBoite} from './WhatIf';
import PLANS from './jour467/plans.json';
import timeline from './jour467/timeline.json';

// « Jour 467 » — style « What if » : un groupe de survivants observe depuis le toit d'un supermarché
// des zombies qui rejouent leur vie d'avant (boulanger, facteur, joggeur, bureau, feu rouge, maman, boîte de nuit, caissière).
// Décors 2D illustrés de jour (ville envahie par la végétation, lumière chaude et brumeuse) et de nuit (parking, lune).
const {decoupe, repere, SCENES} = montage(timeline, PLANS);
export const DUREE_JOUR467 = SCENES.reduce((t, [, d]) => t + d, 0);
const START = {};
SCENES.reduce((t, [nom, d]) => {
  START[nom] = t;
  return t + d;
}, 0);
const scene = (nom, rendu) => {
  const C = () => {
    const f = useCurrentFrame();
    const {i, t, d} = decoupe(nom, f);
    return rendu({f, fg: START[nom] + f, i, t, d, k: lisse(t, d), R: (mot, def) => repere(nom, mot, def)});
  };
  C.displayName = nom;
  return C;
};
const hex = (c) => [1, 3, 5].map((j) => parseInt(c.slice(j, j + 2), 16));
const mix = (a, b, u) => {
  const A = hex(a);
  const B = hex(b);
  return `rgb(${A.map((v, j) => Math.round(v + (B[j] - v) * u)).join(',')})`;
};
const JOUR = ['#ffe0b0', 0.12];
const NUIT = ['#6a8aff', 0.32];

// ===================== le casting =====================
const habit = (couleurs, p = {}) => ({tenue: 'habit', couleurs, ...p});
const TOI = habit({haut: '#3a4a5e', hautO: '#2a384a', bas: '#4a4838', chaus: '#3a3028'}, {cheveux: 'pointes'});
const KARIM = habit({haut: '#23304a', hautO: '#1a2438', bas: '#23304a', chaus: '#1a1a1a', chev: '#1a1210'}, {cheveux: 'court', barbe: true, peau: '#c8906a'});
const INES = habit({haut: '#4a7a5a', hautO: '#3a6248', bas: '#3a3a48', chaus: '#5a3a2a', chev: '#3a2418'}, {cheveux: 'long', lunettes: true, peau: '#e8b890'});
const LEO = habit({haut: '#e85a3a', hautO: '#c84a2a', bas: '#3a4a7a', chaus: '#f4f4f8', chev: '#5a3a1a'}, {cheveux: 'court', chapeau: 'casquette', chapeauCoul: '#e8a03a'});
const BOULANGER = habit({haut: '#f4f0e8', hautO: '#dcd6c8', bas: '#5a5a5a', chaus: '#2a2a2a'}, {mort: true, cheveux: 'aucun', chapeau: 'toque'});
const FACTEUR = habit({haut: '#4a6ab0', hautO: '#3a5490', bas: '#2a3a5a', chaus: '#1a1a1a'}, {mort: true, cheveux: 'aucun', chapeau: 'facteur', chapeauCoul: '#2a4a8a'});
const JOGGEUR = habit({haut: '#e8d83a', hautO: '#c8b82a', bas: '#2a2a3a', chaus: '#8a8a7a', chev: '#3a2a1a'}, {mort: true, cheveux: 'court', chapeau: 'bandeau', chapeauCoul: '#e83a3a'});
const BUREAU = habit({haut: '#eef0f4', hautO: '#d0d4dc', bas: '#2a2a3a', chaus: '#1a1a1a', chev: '#2a2a2a'}, {mort: true, cheveux: 'court'});
const MAMAN = habit({haut: '#d87aa0', hautO: '#b86080', bas: '#4a4a6a', chaus: '#3a2a2a', chev: '#6a4a2a'}, {mort: true, cheveux: 'long'});
const CAISSIERE = habit({haut: '#c83a3a', hautO: '#a82a2a', bas: '#2a2a3a', chaus: '#1a1a1a', chev: '#2a1a10'}, {mort: true, cheveux: 'chignon'});
const PASSANTS = [
  habit({haut: '#7a6a5a', hautO: '#5a4a3a', bas: '#3a3a3a', chev: '#2a2a2a'}, {mort: true, cheveux: 'court'}),
  habit({haut: '#5a7a8a', hautO: '#4a6070', bas: '#4a4a5a', chev: '#8a6a3a'}, {mort: true, cheveux: 'long'}),
  habit({haut: '#8a5a6a', hautO: '#6a4050', bas: '#2a2a3a', chev: '#1a1a1a'}, {mort: true, cheveux: 'aucun'}),
  habit({haut: '#6a8a5a', hautO: '#506a44', bas: '#3a3a2a', chev: '#4a3a2a'}, {mort: true, cheveux: 'court', chapeau: 'casquette', chapeauCoul: '#3a3a3a'}),
];
// démarche traînante d'un zombie « de jour »
const traine = (ph, k = 0) => ({jambes: 0.5 * Math.sin(ph + k), brasG: [14 + 6 * Math.sin(ph + k), 8], brasD: [22 + 6 * Math.sin(ph + k + 1), 10], penche: 8 * Math.sin(ph * 0.5 + k)});
const P = ({x, y, s = 1, flip = false, rot = 0, children}) => <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s}) rotate(${rot})`}>{children}</g>;

// ===================== décors =====================
const Herbe = ({x, y, s = 1, c = '#6a8a3a'}) => <path transform={`translate(${x} ${y}) scale(${s})`} d="M-30,0 L-22,-46 L-12,0 L-4,-60 L6,0 L16,-40 L26,0 Z" fill={c} />;
const Lierre = ({x, y, h = 500, s = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d={`M0,0 Q30,${-h * 0.3} -10,${-h * 0.55} Q-40,${-h * 0.8} 10,${-h}`} stroke="#4a6a2a" strokeWidth="8" fill="none" />
    {[...Array(9)].map((_, j) => <ellipse key={j} cx={(j % 2 ? 18 : -18) + 8 * Math.sin(j)} cy={-h * (j / 9)} rx="22" ry="14" fill={j % 3 ? '#5a8a3a' : '#6a9a44'} transform={`rotate(${j * 40} ${(j % 2 ? 18 : -18)} ${-h * (j / 9)})`} />)}
  </g>
);
const Arbre = ({x, y, s = 1, nuit = 0}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-22" y="-420" width="44" height="420" rx="16" fill={mix('#6a4a32', '#1a1420', nuit)} />
    {[[-110, -480, 150], [100, -500, 140], [0, -600, 170], [-60, -680, 120], [80, -660, 120]].map(([cx, cy, r], j) => <circle key={j} cx={cx} cy={cy} r={r} fill={mix(j % 2 ? '#6a9a4a' : '#5a8a3a', '#141e24', nuit)} />)}
    <circle cx="-40" cy="-640" r="80" fill="#ffffff" opacity={0.08 * (1 - nuit)} />
  </g>
);
// une façade de la rue (largeur 560, de y 380 au trottoir en y 1460)
const Boutique = ({type, x, nuit = 0, fg = 0, rideau = 1}) => {
  const fen = mix('#6a7c8c', '#0a0e1a', nuit);
  const facade = {boulangerie: '#e8d6b4', pharmacie: '#d6dcd0', ecole: '#ecc890', club: '#2a2232', superette: '#e8e2d6', maison: '#e4d4c0', tour: '#7a8898', mur: '#d8c8b0'}[type] || '#d8c8b0';
  const f2 = mix(facade, '#141a30', nuit * 0.85);
  if (type === 'maison') {
    return (
      <g transform={`translate(${x} 0)`}>
        <path d="M-20,620 L280,380 L580,620 Z" fill={mix('#a84a3a', '#1a1420', nuit)} />
        <rect x="0" y="610" width="560" height="850" fill={f2} />
        <rect x="60" y="720" width="150" height="180" fill={fen} stroke="#f4f4f0" strokeWidth="10" />
        <rect x="350" y="720" width="150" height="180" fill={fen} stroke="#f4f4f0" strokeWidth="10" />
        <rect x="220" y="1080" width="130" height="380" fill={mix('#5a7a5a', '#10141a', nuit)} />
        <circle cx="330" cy="1280" r="9" fill="#e8c860" />
        <rect x="0" y="1380" width="560" height="80" fill="none" />
        {[...Array(12)].map((_, j) => <rect key={j} x={j * 48 + 4} y="1360" width="18" height="100" fill={mix('#f4f4f0', '#3a3e4a', nuit)} />)}
        <rect x="0" y="1370" width="560" height="14" fill={mix('#f4f4f0', '#3a3e4a', nuit)} />
        {/* boîte aux lettres */}
        <rect x="455" y="1300" width="12" height="160" fill="#5a5a5a" />
        <rect x="410" y="1210" width="110" height="100" rx="10" fill={mix('#e8b830', '#3a3020', nuit)} />
        <rect x="430" y="1240" width="70" height="10" rx="5" fill="#2a2418" />
        <Lierre x={30} y={1460} h={700} />
      </g>
    );
  }
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x="0" y={type === 'tour' ? -900 : 380} width="560" height={type === 'tour' ? 2360 : 1080} fill={f2} />
      <rect x="-10" y={type === 'tour' ? -920 : 360} width="580" height="34" fill={mix('#8a7a6a', '#0a0a14', nuit)} />
      {type === 'tour' ? (
        [...Array(9)].map((_, r) => [...Array(4)].map((__, c) => {
          const y = -820 + r * 240;
          const etage3 = r === 6;
          return <rect key={`${r}${c}`} x={30 + c * 130} y={y} width="110" height="200" fill={etage3 ? mix('#2a3240', '#060810', nuit) : mix('#8a9cb0', '#0a0e1a', nuit)} stroke={mix('#5a6878', '#141a28', nuit)} strokeWidth="8" />;
        }))
      ) : (
        <g>
          <rect x="70" y="470" width="150" height="230" fill={fen} stroke={mix('#f4f0e8', '#3a3e4a', nuit)} strokeWidth="10" />
          <rect x="340" y="470" width="150" height="230" fill={fen} stroke={mix('#f4f0e8', '#3a3e4a', nuit)} strokeWidth="10" />
          <path d="M80,480 L140,480 L80,560 Z" fill="#ffffff" opacity={0.25 * (1 - nuit)} />
          <path d="M360,520 L420,610 L380,690" stroke="#1a1a1a" strokeWidth="4" fill="none" opacity="0.6" />
          <rect x="70" y="720" width="150" height="14" fill={mix('#c8b8a0', '#20202a', nuit)} />
          <rect x="340" y="720" width="150" height="14" fill={mix('#c8b8a0', '#20202a', nuit)} />
        </g>
      )}
      {/* enseigne */}
      {type === 'boulangerie' && <g><rect x="20" y="870" width="520" height="100" rx="10" fill={mix('#7a3e22', '#140a08', nuit)} /><text x="280" y="942" textAnchor="middle" fontFamily={POLICE} fontSize="66" fill={mix('#f0c86a', '#3a3020', nuit)} letterSpacing="4">BOULANGERIE</text></g>}
      {type === 'pharmacie' && <g><rect x="20" y="870" width="520" height="100" rx="10" fill="#2a5a3a" /><text x="280" y="942" textAnchor="middle" fontFamily={POLICE} fontSize="66" fill="#d8f0d8">PHARMACIE</text></g>}
      {type === 'ecole' && <g><rect x="20" y="870" width="520" height="100" rx="10" fill="#2a4a8a" /><text x="280" y="942" textAnchor="middle" fontFamily={POLICE} fontSize="60" fill="#ffffff">ÉCOLE PRIMAIRE</text></g>}
      {type === 'superette' && <g><rect x="20" y="870" width="520" height="100" rx="10" fill="#c83a2a" /><text x="280" y="942" textAnchor="middle" fontFamily={POLICE} fontSize="62" fill="#ffffff" letterSpacing="2">SUPERMAR HÉ</text></g>}
      {type === 'club' && (() => {
        const on = random(`neon${Math.floor(fg / 4)}`) < 0.15 ? 0.9 : 0.15;
        return (
          <g>
            <rect x="20" y="860" width="520" height="120" rx="14" fill="#140e1a" />
            <text x="280" y="948" textAnchor="middle" fontFamily={POLICE} fontSize="84" fill="none" stroke="#ff4ab0" strokeWidth="5" opacity={0.35 + on * 0.65}>LE MIRAGE</text>
            <ellipse cx="280" cy="920" rx="320" ry="110" fill="#ff4ab0" opacity={0.25 * on} filter="url(#hp-flou)" />
          </g>
        );
      })()}
      {/* rez-de-chaussée */}
      {type !== 'tour' && (
        <g>
          <rect x="30" y="1000" width="500" height="460" fill={mix('#3a4048', '#06080e', nuit)} />
          {(type === 'boulangerie' || type === 'pharmacie') && (
            <g>
              <rect x="30" y="1000" width="500" height={460 * rideau} fill={mix('#9aa0a8', '#2a2e38', nuit)} />
              {[...Array(Math.floor(23 * rideau))].map((_, j) => <rect key={j} x="30" y={1010 + j * 20} width="500" height="5" fill="#000" opacity="0.18" />)}
              {type === 'boulangerie' && rideau > 0.8 && <g transform="translate(280 1180) rotate(-4)"><rect x="-90" y="-50" width="180" height="100" fill="#f4f0e4" /><text y="16" textAnchor="middle" fontFamily={POLICE} fontSize="50" fill="#c83a2a">FERMÉ</text></g>}
              <path d="M80,1300 q40,-60 90,-10 q30,30 70,-20" stroke="#3a6ad8" strokeWidth="12" fill="none" opacity="0.6" />
            </g>
          )}
          {type === 'ecole' && (
            <g>
              {[...Array(5)].map((_, j) => <rect key={j} x={60 + j * 96} y="1040" width="70" height="90" fill={['#ff8a5a', '#5ab0ff', '#ffd23a', '#7ad86a', '#d87aff'][j]} opacity="0.75" />)}
            </g>
          )}
          {type === 'superette' && (
            <g>
              <rect x="40" y="1010" width="480" height="450" fill={mix('#8aa4b8', '#0a1018', nuit)} opacity="0.85" />
              <path d="M120,1040 L200,1200 L150,1300 M200,1200 L300,1180" stroke="#ffffff" strokeWidth="4" opacity="0.7" />
              <rect x="278" y="1010" width="4" height="450" fill="#d8dce4" />
            </g>
          )}
          {type === 'club' && <g><rect x="200" y="1100" width="160" height="360" fill="#0a060e" />{[160, 400].map((px) => <g key={px}><rect x={px - 6} y="1360" width="12" height="100" fill="#c8a040" /><circle cx={px} cy="1356" r="12" fill="#e8c060" /></g>)}<path d="M166,1370 Q280,1420 394,1370" stroke="#a8202a" strokeWidth="10" fill="none" /></g>}
        </g>
      )}
      <Lierre x={20} y={1460} h={type === 'tour' ? 1200 : 760} />
      <Lierre x={540} y={1460} h={420} s={0.9} />
    </g>
  );
};
// la rue (élévation) : ciel, ville au loin, façades, trottoir, chaussée, herbes
const RueMonde = ({fg, nuit = 0, boutiques = [], children, voiture = null, fumee = true}) => (
  <g>
    <defs>
      <linearGradient id="j-ciel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={mix('#b8ccd8', '#060a20', nuit)} />
        <stop offset="1" stopColor={mix('#f4dcae', '#24305a', nuit)} />
      </linearGradient>
      <linearGradient id="j-route" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={mix('#6a6a6e', '#1a1c26', nuit)} />
        <stop offset="1" stopColor={mix('#4a4a50', '#0c0e16', nuit)} />
      </linearGradient>
    </defs>
    <rect x="-1500" y="-1200" width="6000" height="2700" fill="url(#j-ciel)" />
    <circle cx={lerp(1800, 400, nuit)} cy={lerp(120, 200, nuit)} r={nuit > 0.5 ? 70 : 110} fill={nuit > 0.5 ? '#f4f0d8' : '#fff4d8'} opacity="0.9" />
    <circle cx={lerp(1800, 400, nuit)} cy={lerp(120, 200, nuit)} r="300" fill={nuit > 0.5 ? '#c8d4ff' : '#ffe8b0'} opacity="0.25" filter="url(#hp-flou2)" />
    <Calque p={0.8}>
      {[...Array(16)].map((_, j) => {
        const h = 500 + random(`sk${j}`) * 700;
        const x = -1400 + j * 360;
        return <path key={j} d={`M${x},1400 L${x},${1400 - h} L${x + 120},${1400 - h - 60 * random(`sb${j}`)} L${x + 200},${1400 - h + 40} L${x + 300},${1400 - h} L${x + 300},1400 Z`} fill={mix('#a4aeb4', '#121830', nuit)} />;
      })}
      {fumee && nuit < 0.5 && [...Array(6)].map((_, j) => <circle key={j} cx={2200 + 40 * Math.sin(fg / 30 + j) + j * 20} cy={700 - j * 120 - ((fg * 2) % 120)} r={60 + j * 25} fill="#5a5a5a" opacity={0.18 - j * 0.02} filter="url(#hp-flou)" />)}
    </Calque>
    {boutiques.map((b, j) => <Boutique key={j} fg={fg} nuit={nuit} {...b} />)}
    <rect x="-1500" y="1460" width="6000" height="110" fill={mix('#bcb2a2', '#2a2c36', nuit)} />
    <rect x="-1500" y="1560" width="6000" height="24" fill={mix('#d8d0c4', '#3a3c46', nuit)} />
    <rect x="-1500" y="1584" width="6000" height="1200" fill="url(#j-route)" />
    {[...Array(12)].map((_, j) => <rect key={j} x={-1400 + j * 500} y="1760" width="240" height="22" fill="#e8e4d8" opacity={0.35 * (1 - nuit * 0.6)} />)}
    {[...Array(24)].map((_, j) => <path key={`c${j}`} d={`M${-1300 + j * 230},${1620 + (j % 3) * 70} l40,30 l-20,40 l50,20`} stroke="#2a2a2e" strokeWidth="4" fill="none" opacity="0.4" />)}
    {[...Array(30)].map((_, j) => <Herbe key={`h${j}`} x={-1400 + j * 190 + 60 * random(`hx${j}`)} y={j % 2 ? 1560 : 1470 + 10 * random(`hy${j}`)} s={0.8 + random(`hs${j}`) * 0.8} c={mix(j % 3 ? '#6a8a3a' : '#8aa04a', '#1a2420', nuit)} />)}
    {voiture}
    {children}
  </g>
);
// le toit du supermarché (camp des survivants)
const ToitMonde = ({fg, nuit = 0, children, devant = null}) => (
  <g>
    <defs>
      <linearGradient id="t-ciel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={mix('#a8c0d4', '#060a20', nuit)} />
        <stop offset="1" stopColor={mix('#f4d8a8', '#2a3460', nuit)} />
      </linearGradient>
    </defs>
    <rect x="-1500" y="-1200" width="4200" height="3000" fill="url(#t-ciel)" />
    {nuit > 0.5 && [...Array(40)].map((_, j) => <circle key={j} cx={-1200 + random(`st${j}`) * 3800} cy={-1000 + random(`sy${j}`) * 1800} r={2 + 2 * random(`sr${j}`)} fill="#ffffff" opacity={0.6 * random(`so${j}`)} />)}
    <Calque p={0.75}>
      {[...Array(14)].map((_, j) => {
        const h = 300 + random(`tk${j}`) * 600;
        const x = -1400 + j * 330;
        return (
          <g key={j}>
            <rect x={x} y={1250 - h} width="280" height={h + 200} fill={mix(j % 2 ? '#b4b8b8' : '#a4aaae', '#10162c', nuit)} />
            {[...Array(Math.floor(h / 110))].map((__, r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={x + 30 + c * 80} y={1290 - h + r * 110} width="50" height="60" fill={mix('#7a8a98', '#080c18', nuit)} opacity={random(`tw${j}${r}${c}`) < 0.2 ? 0.2 : 0.9} />))}
          </g>
        );
      })}
      {nuit < 0.5 && [...Array(5)].map((_, j) => <circle key={j} cx={1700 + j * 30} cy={500 - j * 140 - ((fg * 2) % 140)} r={70 + j * 30} fill="#5a5a5a" opacity={0.2 - j * 0.03} filter="url(#hp-flou)" />)}
    </Calque>
    {/* le muret du toit */}
    <rect x="-1500" y="1250" width="4200" height="90" fill={mix('#c4bcac', '#2a2c3a', nuit)} />
    <rect x="-1500" y="1250" width="4200" height="16" fill={mix('#e4dccc', '#3a3c4a', nuit)} />
    <rect x="-1500" y="1340" width="4200" height="1200" fill={mix('#8a8478', '#1a1a24', nuit)} />
    {[...Array(60)].map((_, j) => <circle key={j} cx={-1400 + random(`g${j}`) * 4000} cy={1360 + random(`gy${j}`) * 900} r={4 + 4 * random(`gr${j}`)} fill={mix('#6a6458', '#10101a', nuit)} />)}
    {/* le camp : bâche, bidons, panneau solaire, antenne, linge */}
    <path d="M-300,1660 L60,1380 L420,1660 Z" fill={mix('#3a7ad8', '#141e3a', nuit)} />
    <path d="M60,1380 L120,1660 L-300,1660 Z" fill="#000" opacity="0.15" />
    {[-560, -470].map((x) => <g key={x}><rect x={x} y="1520" width="80" height="140" rx="12" fill={mix('#2a6ab8', '#101a30', nuit)} /><rect x={x} y="1560" width="80" height="10" fill="#000" opacity="0.2" /></g>)}
    <g transform="translate(620 1560) skewX(-20)"><rect width="260" height="120" fill={mix('#1a2a5a', '#080c1a', nuit)} />{[0, 1, 2].map((j) => <rect key={j} x={j * 87} width="4" height="120" fill="#c8ccd6" />)}</g>
    <rect x="1000" y="1000" width="10" height="380" fill="#8a8a8a" />
    <path d="M960,1040 L1050,1040 M970,1080 L1040,1080" stroke="#8a8a8a" strokeWidth="8" />
    {nuit > 0.5 && <g><circle cx="200" cy="1640" r="20" fill="#ffb050" /><ellipse cx="200" cy="1640" rx="200" ry="120" fill="#ffb050" opacity="0.25" filter="url(#hp-flou)" /></g>}
    {children}
    {devant}
  </g>
);
// vue aux jumelles (masque écran)
const Jumelles = ({children, k = 0}) => (
  <g>
    {children}
    <mask id="ju-masque">
      <rect x="-10" y="-10" width="1100" height="1940" fill="#ffffff" />
      <circle cx="380" cy="900" r="330" fill="#000000" />
      <circle cx="700" cy="900" r="330" fill="#000000" />
    </mask>
    <rect x="-10" y="-10" width="1100" height="1940" fill="#050506" mask="url(#ju-masque)" />
    <circle cx="380" cy="900" r="330" fill="none" stroke="#000" strokeWidth="60" opacity="0.5" filter="url(#hp-flou)" />
    <circle cx="700" cy="900" r="330" fill="none" stroke="#000" strokeWidth="60" opacity="0.5" filter="url(#hp-flou)" />
    <path d="M540,700 L540,1100 M340,900 L740,900" stroke="#ffffff" strokeWidth="3" opacity="0.5" />
    {[-2, -1, 1, 2].map((j) => <path key={j} d={`M${540 + j * 50},890 L${540 + j * 50},910`} stroke="#ffffff" strokeWidth="3" opacity="0.5" />)}
    <text x="760" y="1180" fontFamily={TXT} fontWeight="800" fontSize="26" fill="#ffffff" opacity="0.6">x{(8 + 4 * k).toFixed(1)}</text>
  </g>
);
// une page de carnet
const Page = ({children, rot = -3}) => (
  <g transform={`rotate(${rot} 540 960)`}>
    <rect x="100" y="250" width="900" height="1400" rx="16" fill="#000" opacity="0.35" filter="url(#hp-ombre)" />
    <rect x="90" y="230" width="900" height="1400" rx="16" fill="#f8f2e0" />
    {[...Array(26)].map((_, j) => <rect key={j} x="90" y={330 + j * 50} width="900" height="3" fill="#9ab8e0" opacity="0.6" />)}
    <rect x="200" y="230" width="4" height="1400" fill="#e86a6a" opacity="0.6" />
    {[...Array(14)].map((_, j) => <circle key={j} cx="130" cy={290 + j * 96} r="16" fill="#c8bca0" />)}
    <circle cx="820" cy="1460" r="90" fill="none" stroke="#b08a5a" strokeWidth="14" opacity="0.25" />
    {children}
  </g>
);
const Ecrit = ({x, y, txt, taille = 46, c = '#1e2a6a', rot = 0, op = 1}) => <text x={x} y={y} transform={`rotate(${rot} ${x} ${y})`} fontFamily="'DejaVu Sans', sans-serif" fontStyle="italic" fontWeight="700" fontSize={taille} fill={c} opacity={op}>{txt}</text>;
// le compteur de jours (HUD)
const Jour = ({f, t0 = 0, de = 455, a = 467, y = 260}) => {
  const u = ease(f, t0, t0 + 14, Easing.out(Easing.cubic));
  return <Puce f={f} t0={t0} txt={`JOUR ${Math.round(lerp(de, a, u))}`} y={y} fond="#141218" coul="#ffd23a" taille={72} />;
};

// ===================== 1. Jour 467 : le boulanger fait la queue =====================
const RUE_BOULANGERIE = [{type: 'pharmacie', x: -560}, {type: 'boulangerie', x: 20}, {type: 'mur', x: 600}, {type: 'superette', x: 1180}];
const Ouverture = scene('ouverture', ({f, fg, i, t, k, R}) => {
  const balance = (ph) => ({...BOULANGER, ...traine(fg / 14), jambes: 0, penche: 6 * Math.sin(fg / 20)});
  if (i === 0) {
    return (
      <Ecran fg={fg} teinte={JOUR} dessus={<Jour f={f} t0={2} />}>
        <Vue x={lerp(400, 300, k)} y={lerp(1000, 1080, k)} z={lerp(0.62, 0.78, k)}>
          <RueMonde fg={fg} boutiques={RUE_BOULANGERIE}>
            <P x={300} y={1520} s={0.55}><Rond {...balance()} profil={-0.2} /></P>
            <P x={-200} y={1600} s={0.6}><Rond {...PASSANTS[0]} {...traine(fg / 9, 1)} profil={0.6} /></P>
          </RueMonde>
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={lerp(320, 340, k)} y={1180} z={lerp(1.35, 1.45, k) * punchZ(t)}>
          <RueMonde fg={fg} boutiques={RUE_BOULANGERIE}>
            <P x={300} y={1520} s={0.62}><Rond {...balance()} cou={14} profil={-0.25} pupY={-6} /></P>
          </RueMonde>
        </Vue>
      </Ecran>
    );
  }
  if (i === 2) {
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={300} y={1180} z={lerp(2.6, 2.8, k) * punchZ(f - R('fermée', 101), 0.08)} r={-3}>
          <RueMonde fg={fg} boutiques={RUE_BOULANGERIE} />
        </Vue>
      </Ecran>
    );
  }
  if (i === 3) {
    // accéléré : les jours et les nuits défilent, lui ne bouge pas
    const cyc = (t / 7) % 1;
    const nuit = 0.5 - 0.5 * Math.cos(cyc * Math.PI * 2);
    const mois = Math.min(8, Math.floor(t / 5.5) + 1);
    return (
      <Ecran fg={fg} teinte={nuit > 0.5 ? NUIT : JOUR} dessus={<Puce f={f} t0={R('depuis', 120) - 6} txt={`+ ${mois} MOIS`} y={260} fond="#141218" coul="#ffffff" taille={60} />}>
        <Vue x={300} y={1060} z={0.9}>
          <RueMonde fg={fg * 6} nuit={nuit} boutiques={RUE_BOULANGERIE}>
            <P x={300} y={1520} s={0.55}><Rond {...BOULANGER} jambes={0} brasG={[12, 8]} brasD={[16, 10]} penche={4} /></P>
            {[...Array(4)].map((_, j) => <P key={j} x={-400 + ((t * 40 + j * 300) % 1500)} y={1600 + j * 20} s={0.5}><g opacity="0.35"><Rond {...PASSANTS[j % 4]} {...traine(fg / 3, j)} profil={0.6} /></g></P>)}
          </RueMonde>
        </Vue>
      </Ecran>
    );
  }
  // 7 h pile : l'horloge de la pharmacie, il relève la tête
  const sept = ease(f, R('sept', 180) - 4, R('sept', 180) + 4, Easing.out(Easing.back(2)));
  return (
    <Ecran fg={fg} teinte={JOUR}>
      <Vue x={lerp(-60, 160, ease(t, 14, 30))} y={lerp(760, 1120, ease(t, 14, 30))} z={lerp(1.6, 1.5, k)}>
        <RueMonde fg={fg} boutiques={RUE_BOULANGERIE}>
          <g transform="translate(-60 760)">
            <circle r="120" fill="#f4f0e4" stroke="#2a5a3a" strokeWidth="18" />
            {[...Array(12)].map((_, j) => <rect key={j} x="-4" y="-104" width="8" height="22" fill="#2a2a2a" transform={`rotate(${j * 30})`} />)}
            <rect x="-6" y="-70" width="12" height="76" rx="6" fill="#1a1a1a" transform={`rotate(${lerp(195, 210, sept)})`} />
            <rect x="-5" y="-96" width="10" height="100" rx="5" fill="#1a1a1a" transform={`rotate(${lerp(-40, 0, sept)})`} />
            <circle r="10" fill="#c83a2a" />
          </g>
          <P x={300} y={1520} s={0.55}><Rond {...BOULANGER} jambes={0} brasG={[12, 8]} brasD={[16, 10]} penche={lerp(8, -10, ease(f, R('pile', 191) - 4, R('pile', 191) + 4))} pupY={-10} /></P>
        </RueMonde>
      </Vue>
    </Ecran>
  );
});

// ===================== 2. Toi, 19 ans, quatre survivants, sur le toit =====================
const Carte2 = scene('carte', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    return (
      <Ecran fg={fg} teinte={JOUR} dessus={<Carte f={f} t0={R('19', 15) - 4} nom="TOI · 19 ANS" sous="SURVIVANT · JOUR 467" />}>
        <Vue x={540} y={lerp(980, 960, k)} z={punchZ(t)}>
          <g filter="url(#flou8)"><ToitMonde fg={fg} /></g>
          <P x={560} y={2200} s={1.6}><Rond {...TOI} cou={16} profil={-0.4} pupX={-20} yeux={1.05} sourcils={0.3} brasDevant brasG={[30, -110]} brasD={[30, -110]} /></P>
          <g transform="translate(540 1400)"><rect x="-130" y="-50" width="110" height="100" rx="30" fill="#2a2a30" /><rect x="20" y="-50" width="110" height="100" rx="30" fill="#2a2a30" /><rect x="-30" y="-20" width="60" height="40" fill="#3a3a40" /></g>
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    // de dos, alignés au bord du toit, la ville devant
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={lerp(480, 560, k)} y={1250} z={lerp(1.0, 1.08, k)}>
          <ToitMonde fg={fg}>
            {[[180, LEO, 0.72], [420, INES, 1], [660, KARIM, 1.08], [900, TOI, 1]].map(([x, p, s], j) => (
              <P key={j} x={x} y={1470} s={0.62 * s}><Rond {...p} dos brasG={[14, 0]} brasD={[14, 0]} souffle={Math.sin(fg / 20 + j) * 6} /></P>
            ))}
          </ToitMonde>
        </Vue>
      </Ecran>
    );
  }
  if (i === 2) {
    // le supermarché vu de la rue, le camp sur le toit
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={1460} y={lerp(1050, 980, k)} z={lerp(0.85, 0.75, k) * punchZ(f - R('supermarché', 113), 0.05)}>
          <RueMonde fg={fg} boutiques={[{type: 'mur', x: 600}, {type: 'superette', x: 1180}, {type: 'mur', x: 1760}]}>
            <path d="M1220,360 L1330,240 L1440,360 Z" fill="#3a7ad8" />
            <rect x="1480" y="290" width="60" height="70" rx="8" fill="#2a6ab8" />
            {[1300, 1400, 1500, 1600].map((x, j) => <P key={j} x={x} y={360} s={0.14 * (j === 0 ? 0.75 : 1)}><Rond {...[LEO, INES, KARIM, TOI][j]} brasG={[14, 0]} brasD={[14, 0]} /></P>)}
          </RueMonde>
        </Vue>
      </Ecran>
    );
  }
  return (
    <Ecran fg={fg} teinte={JOUR}>
      <Jumelles k={k}>
        <Vue x={300} y={lerp(1200, 1180, k)} z={1.5}>
          <RueMonde fg={fg} boutiques={RUE_BOULANGERIE}>
            <P x={300} y={1520} s={0.55}><Rond {...BOULANGER} jambes={0} brasG={[12, 8]} brasD={[16, 10]} penche={6 * Math.sin(fg / 20)} /></P>
          </RueMonde>
        </Vue>
      </Jumelles>
    </Ecran>
  );
});

// ===================== 3. Le groupe =====================
const GrosPlan = ({fg, perso, p = {}, s = 1.6, flou = true, nuit = 0, x = 560}) => (
  <g>
    <g filter={flou ? 'url(#flou8)' : undefined}><ToitMonde fg={fg} nuit={nuit} /></g>
    <P x={x} y={2200} s={s}><Rond cou={16} {...perso} {...p} /></P>
  </g>
);
const Groupe = scene('groupe', ({f, fg, i, t, k, R}) => {
  const fiches = [
    [KARIM, 'KARIM · 42 ANS', 'ANCIEN POMPIER', R('karim', 1), {profil: 0.3, sourcils: -0.3, bouche: 'serre', brasG: [20, 0], brasD: [150, -60]}],
    [INES, 'INÈS · 24 ANS', 'ELLE NOTE TOUT', R('inès', 49) - 48 + 48, {profil: -0.3, pupY: 14, sourcils: 0.2, brasDevant: true, brasG: [40, -100], brasD: [50, -90]}],
    [LEO, 'LÉO · 11 ANS', 'LE PLUS JEUNE', R('léo', 116), {profil: 0.2, bouche: 'sourire', yeux: 1.1}],
    [TOI, 'TOI', 'AUX JUMELLES', R('toi', 154), {profil: -0.1, brasDevant: true, brasG: [80, -150], brasD: [80, -150]}],
  ];
  const [perso, nom, sous, , p] = fiches[i];
  const t0 = [2, R('inès', 49) - 4, R('léo', 116) - 4, R('toi', 154) - 4][i];
  return (
    <Ecran fg={fg} teinte={JOUR} dessus={<Carte f={f} t0={t0} nom={nom} sous={sous} />}>
      <Vue x={540} y={lerp(980, 950, k)} z={punchZ(t)}>
        <GrosPlan fg={fg} perso={perso} p={p} s={i === 2 ? 1.75 : 1.6} />
        {i === 0 && <g transform="translate(830 1250) rotate(30)"><rect x="-14" y="-300" width="28" height="560" rx="10" fill="#7a4a2a" /><path d="M14,-300 L120,-260 L100,-160 L14,-180 Z" fill="#c8ccd6" /><path d="M-14,-300 L-60,-250 L-14,-220 Z" fill="#c83a2a" /></g>}
        {i === 1 && <g transform="translate(540 1520) rotate(-8)"><rect x="-170" y="-110" width="340" height="220" rx="10" fill="#f8f2e0" /><rect x="-170" y="-110" width="20" height="220" fill="#8a3a2a" />{[0, 1, 2, 3].map((j) => <rect key={j} x="-130" y={-80 + j * 44} width={200 + 60 * Math.sin(j + fg / 6) * (j === 3 ? 1 : 0)} height="8" fill="#1e2a6a" opacity="0.6" />)}</g>}
        {i === 3 && <g transform="translate(560 1060)"><rect x="-150" y="-60" width="130" height="120" rx="34" fill="#2a2a30" /><rect x="20" y="-60" width="130" height="120" rx="34" fill="#2a2a30" /><circle cx="-85" cy="0" r="40" fill="#5a7ab8" opacity="0.6" /><circle cx="85" cy="0" r="40" fill="#5a7ab8" opacity="0.6" /><rect x="-30" y="-24" width="60" height="48" fill="#3a3a40" /></g>}
      </Vue>
    </Ecran>
  );
});

// ===================== 4. La règle d'Inès : ils refont ce qu'ils faisaient avant =====================
const Polaroid = ({x, y, rot = 0, s = 1, titre, children, gris = false}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <rect x="-220" y="-260" width="440" height="520" fill="#000" opacity="0.3" filter="url(#hp-ombre)" />
    <rect x="-230" y="-270" width="460" height="530" fill="#fbfaf4" />
    <clipPath id={`pol${titre}`}><rect x="-200" y="-240" width="400" height="400" /></clipPath>
    <g clipPath={`url(#pol${titre})`}>
      <rect x="-200" y="-240" width="400" height="400" fill={gris ? '#a8b0a0' : '#ffe6b8'} />
      {children}
    </g>
    <text y="220" textAnchor="middle" fontFamily="'DejaVu Sans', sans-serif" fontStyle="italic" fontWeight="700" fontSize="44" fill="#2a2a3a">{titre}</text>
  </g>
);
const Regle = scene('regle', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    const u = ease(t, 0, 40);
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={540} y={lerp(980, 900, k)} z={lerp(1.0, 1.1, k)}>
          <rect x="-400" y="-200" width="1880" height="2320" fill="#6a5a48" />
          <Page>
            <Ecrit x={240} y={380} txt="Jour 466 — observations" taille={52} />
            <Ecrit x={240} y={480} txt="• Boulanger : 7h00, toujours" op={ease(t, 4, 10)} />
            <Ecrit x={240} y={580} txt="• Facteur : 7h12, rue des Lilas" op={ease(t, 10, 16)} />
            <Ecrit x={240} y={680} txt="• Joggeur : 43 tours du parc" op={ease(t, 16, 22)} />
            <Ecrit x={240} y={780} txt="• Ils n'attaquent pas si…" op={ease(t, 22, 28)} />
            <path d={`M240,880 L${240 + 560 * u},880`} stroke="#c83a2a" strokeWidth="8" />
            <Ecrit x={240} y={980} txt="→ ROUTINES ?" taille={70} c="#c83a2a" op={ease(t, 28, 36)} rot={-3} />
            <g transform="translate(760 1250) scale(0.32)" opacity="0.8"><Rond {...BOULANGER} brasG={[12, 8]} brasD={[16, 10]} /></g>
          </Page>
          <g transform={`translate(${lerp(900, 700, u)} ${lerp(1300, 1000, u)}) rotate(-40)`}><rect x="-14" y="-200" width="28" height="300" rx="8" fill="#e8b830" /><path d="M-14,100 L0,150 L14,100 Z" fill="#f0d0a0" /></g>
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={540} y={980} z={lerp(1.0, 1.06, k) * punchZ(f - R('affamés', 69), 0.08)}>
          <g filter="url(#flou8)"><RueMonde fg={fg} boutiques={RUE_BOULANGERIE} /></g>
          <P x={560} y={2200} s={1.6}><Rond {...PASSANTS[2]} cou={14} profil={0.15} bouche="cri" brasG={[80, -20]} brasD={[90, -20]} penche={6 * Math.sin(fg / 6)} /></P>
          <P x={150} y={2100} s={1.1}><g filter="url(#flou4)"><Rond {...PASSANTS[0]} {...traine(fg / 8)} /></g></P>
        </Vue>
      </Ecran>
    );
  }
  // avant / maintenant
  const flip = ease(f, R('avant', 126) - 6, R('avant', 126) + 4);
  return (
    <Ecran fg={fg} teinte={JOUR}>
      <Vue x={540} y={960} z={lerp(1.0, 1.06, k)}>
        <rect x="-400" y="-200" width="1880" height="2320" fill="#5a4a3a" />
        <Polaroid x={lerp(540, 330, flip)} y={lerp(900, 760, flip)} rot={lerp(0, -8, flip)} s={lerp(1.1, 0.9, flip)} titre="AVANT">
          <rect x="-200" y="40" width="400" height="120" fill="#c8b890" />
          <g transform="translate(0 150) scale(0.32)"><Rond {...FACTEUR} mort={false} bouche="sourire" brasG={[12, 0]} brasD={[150, -60]} /></g>
        </Polaroid>
        <g opacity={flip}>
          <Polaroid x={760} y={1180} rot={6} s={0.9} titre="J+467" gris>
            <rect x="-200" y="40" width="400" height="120" fill="#7a7a6a" />
            <g transform="translate(0 150) scale(0.32)"><Rond {...FACTEUR} brasG={[12, 0]} brasD={[150, -60]} /></g>
          </Polaroid>
        </g>
      </Vue>
    </Ecran>
  );
});

// ===================== 5. Le facteur : des feuilles mortes dans les boîtes aux lettres =====================
const RUE_MAISONS = [{type: 'maison', x: -560}, {type: 'maison', x: 20}, {type: 'maison', x: 600}, {type: 'maison', x: 1180}];
const SacFacteur = () => <g><path d="M-120,-560 L110,-300" stroke="#5a3a1a" strokeWidth="18" /><rect x="60" y="-360" width="150" height="130" rx="18" fill="#8a5a2a" /><rect x="60" y="-360" width="150" height="40" rx="14" fill="#6a4220" /></g>;
const Facteur = scene('facteur', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    const x = lerp(-200, 420, t / 45);
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={lerp(150, 380, k)} y={1180} z={0.95 * punchZ(t)}>
          <RueMonde fg={fg} boutiques={RUE_MAISONS}>
            <P x={x} y={1540} s={0.62}><Rond {...FACTEUR} {...traine(fg / 7)} profil={0.6} /><SacFacteur /></P>
          </RueMonde>
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    // insert : la main glisse une feuille morte dans la fente
    const u = ease(t, 6, 26, Easing.inOut(Easing.cubic));
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={540} y={960} z={1}>
          <rect x="-400" y="-200" width="1880" height="2320" fill="#c8b890" />
          <rect x="140" y="600" width="800" height="700" rx="40" fill="#e8b830" />
          <rect x="140" y="600" width="800" height="120" rx="40" fill="#ffffff" opacity="0.2" />
          <rect x="300" y="820" width="480" height="60" rx="30" fill="#2a2418" />
          <text x="540" y="1150" textAnchor="middle" fontFamily={POLICE} fontSize="90" fill="#8a6a1a" opacity="0.6">LETTRES</text>
          <g transform={`translate(${lerp(820, 560, u)} ${lerp(560, 830, u)}) rotate(${lerp(-30, 10, u)})`}>
            <path d="M0,-120 Q90,-60 60,60 Q0,130 -60,60 Q-90,-60 0,-120 Z" fill="#c8742a" />
            <path d="M0,-110 L0,120" stroke="#8a4a1a" strokeWidth="6" />
          </g>
          <g transform={`translate(${lerp(1000, 760, u)} ${lerp(500, 760, u)})`}>
            <ellipse rx="150" ry="110" fill="#a3b59a" />
            {[-90, -40, 10].map((x) => <rect key={x} x={x - 25} y="-200" width="50" height="140" rx="25" fill="#a3b59a" transform="rotate(-50)" />)}
            <rect x="60" y="-40" width="400" height="140" rx="50" fill="#4a6ab0" />
          </g>
        </Vue>
      </Ecran>
    );
  }
  if (i === 2) {
    const appuie = f >= R('sonne', 107) - 2 && f < R('sonne', 107) + 10;
    return (
      <Ecran fg={fg} teinte={JOUR} dessus={appuie && <text x="660" y="700" fontFamily={POLICE} fontSize={120 * pop(f, R('sonne', 107) - 2)} fill="#ffffff" transform="rotate(-10 660 700)">DRING</text>}>
        <Vue x={540} y={960} z={punchZ(f - R('sonne', 107), 0.1)}>
          <rect x="-400" y="-200" width="1880" height="2320" fill="#e4d4c0" />
          <rect x="-400" y="-200" width="700" height="2320" fill="#5a7a5a" />
          <rect x="380" y="760" width="300" height="420" rx="30" fill="#c8c0b0" />
          <circle cx="530" cy="900" r="70" fill={appuie ? '#ffd23a' : '#f4f0e0'} stroke="#8a8478" strokeWidth="12" />
          <rect x="430" y="1040" width="200" height="60" rx="10" fill="#f4f0e4" />
          <text x="530" y="1084" textAnchor="middle" fontFamily={TXT} fontWeight="700" fontSize="32" fill="#3a3a3a">FAMILLE MARTIN</text>
          <g transform={`translate(${appuie ? 560 : 640} ${appuie ? 900 : 860}) rotate(-30)`}>
            <rect x="-30" y="-20" width="300" height="60" rx="30" fill="#a3b59a" />
            <rect x="150" y="-60" width="400" height="160" rx="60" fill="#4a6ab0" />
          </g>
        </Vue>
      </Ecran>
    );
  }
  if (i === 3) {
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={290} y={1160} z={lerp(1.5, 1.62, k)}>
          <RueMonde fg={fg} boutiques={RUE_MAISONS}>
            <P x={240} y={1470} s={0.6}><Rond {...FACTEUR} dos jambes={0} brasG={[12, 0]} brasD={[12, 0]} penche={lerp(0, 12, k)} /><g transform="scale(-1 1)"><SacFacteur /></g></P>
          </RueMonde>
        </Vue>
      </Ecran>
    );
  }
  return (
    <Ecran fg={fg} teinte={JOUR}>
      <Jumelles k={k}>
        <Vue x={lerp(440, 1600, k)} y={1250} z={1.8}>
          <RueMonde fg={fg} boutiques={RUE_MAISONS}>
            {[-560, 20, 600, 1180].map((x) => [...Array(8)].map((_, j) => <path key={`${x}${j}`} transform={`translate(${x + 430 + j * 12} ${1220 + (j % 3) * 6}) rotate(${j * 40})`} d="M0,-26 Q20,-10 12,12 Q0,26 -12,12 Q-20,-10 0,-26 Z" fill={j % 2 ? '#c8742a' : '#a85a20'} />))}
            {[...Array(14)].map((_, j) => <path key={`s${j}`} transform={`translate(${-500 + j * 160} ${1440 + (j % 2) * 20}) rotate(${j * 50})`} d="M0,-22 Q18,-8 10,10 Q0,22 -10,10 Q-18,-8 0,-22 Z" fill="#b8642a" />)}
          </RueMonde>
        </Vue>
      </Jumelles>
    </Ecran>
  );
});

// ===================== 6. Le joggeur : il court en rond, depuis un an =====================
const ParcMonde = ({fg, children}) => (
  <g>
    <defs>
      <linearGradient id="pa-ciel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#b8ccd8" />
        <stop offset="1" stopColor="#f4dcae" />
      </linearGradient>
      <linearGradient id="pa-herbe" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8aa04a" />
        <stop offset="1" stopColor="#5a7a32" />
      </linearGradient>
    </defs>
    <rect x="-1400" y="-1200" width="4000" height="2100" fill="url(#pa-ciel)" />
    <Calque p={0.8}>{[...Array(10)].map((_, j) => <Arbre key={j} x={-1200 + j * 360} y={900} s={0.8} />)}</Calque>
    <rect x="-1400" y="880" width="4000" height="2000" fill="url(#pa-herbe)" />
    <ellipse cx="540" cy="1320" rx="560" ry="260" fill="none" stroke="#d8c49a" strokeWidth="90" />
    <ellipse cx="540" cy="1320" rx="560" ry="260" fill="none" stroke="#9a7a4a" strokeWidth="26" opacity="0.7" />
    <rect x="160" y="1500" width="200" height="20" fill="#7a4a2a" />
    {[...Array(20)].map((_, j) => <Herbe key={j} x={-600 + j * 120} y={1700 + (j % 3) * 60} s={1.4} c={j % 2 ? '#6a8a3a' : '#4a6a2a'} />)}
    {children}
  </g>
);
const Joggeur = scene('joggeur', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    const a = (fg / 18) % (Math.PI * 2);
    const x = 540 + Math.cos(a) * 560;
    const y = 1320 + Math.sin(a) * 260;
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={540} y={lerp(1150, 1200, k)} z={lerp(0.78, 0.86, k)}>
          <ParcMonde fg={fg}>
            <P x={x} y={y} s={0.36 + 0.08 * Math.sin(a)} flip={Math.sin(a) > 0}><Rond {...JOGGEUR} {...course(fg / 2.6)} profil={0.7} /></P>
          </ParcMonde>
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    // les pieds usés (travelling de côté)
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={540} y={1100} z={1}>
          <g transform={`translate(${-((fg * 22) % 240)} 0)`}>
            <rect x="-400" y="-200" width="2200" height="1400" fill="#8aa04a" />
            <rect x="-400" y="1200" width="2200" height="900" fill="#c8b48a" />
            {[...Array(12)].map((_, j) => <ellipse key={j} cx={-300 + j * 240} cy="1260" rx="70" ry="14" fill="#9a7a4a" opacity="0.6" />)}
          </g>
          <P x={540} y={1250} s={2.4}><g transform="translate(0 -60)"><Rond {...JOGGEUR} {...course(fg / 2.6)} profil={0.8} couleurs={{...JOGGEUR.couleurs, chaus: '#6a7a62'}} /></g></P>
          <rect x="-400" y="-200" width="1880" height="900" fill="#000" opacity="0" />
        </Vue>
      </Ecran>
    );
  }
  return (
    <Ecran fg={fg} teinte={JOUR}>
      <Vue x={540} y={980 + Math.abs(Math.sin(fg / 2.6)) * 14} z={1}>
        <g filter="url(#flou8)" transform={`translate(${-((fg * 30) % 360)} 0)`}><ParcMonde fg={fg} /></g>
        <P x={560} y={2250} s={1.55}><Rond {...JOGGEUR} cou={14} profil={0.2} {...course(fg / 2.6)} bouche="o" souffle={Math.sin(fg / 2.6) * 10} sueur={(f / 12) % 1} /></P>
      </Vue>
    </Ecran>
  );
});

// ===================== 7. Le bureau : vingt zombies devant des écrans noirs =====================
const BureauMonde = ({fg, f, children}) => (
  <g>
    <rect x="-600" y="-400" width="2400" height="2600" fill="#c8c4b8" />
    <rect x="-600" y="200" width="2400" height="760" fill="#b8ccd8" />
    <Calque p={0.85}>{[...Array(8)].map((_, j) => <rect key={j} x={-500 + j * 300} y={400 + random(`bv${j}`) * 300} width="220" height="800" fill="#9aa8b4" />)}</Calque>
    {[...Array(7)].map((_, j) => <rect key={j} x={-600 + j * 340} y="200" width="20" height="760" fill="#8a8478" />)}
    <rect x="-600" y="960" width="2400" height="1300" fill="#8a8a92" />
    {[...Array(6)].map((_, j) => <rect key={j} x={-500 + j * 400} y="60" width="260" height="40" rx="10" fill="#e8ecf0" />)}
    {[0, 1, 2].map((r) => {
      const s = [0.38, 0.5, 0.66][r];
      const y = [1180, 1380, 1640][r];
      return (
        <g key={r}>
          {[...Array(5)].map((_, c) => {
            const x = 540 + (c - 2) * 420 * s * 1.3;
            const tape = Math.sin(fg * 1.3 + c + r) * 6;
            return (
              <g key={c} transform={`translate(${x} ${y}) scale(${s})`}>
                <g transform="translate(0 -40)"><Rond {...BUREAU} {...(r === 2 && c === 2 ? {} : {})} assis jambes={0} brasDevant brasG={[60 + tape, -70]} brasD={[60 - tape, -70]} profil={0.05 * (c - 2)} penche={4 * Math.sin(fg / 9 + c)} /></g>
                <rect x="-230" y="-260" width="460" height="40" fill="#a8946a" />
                <rect x="-200" y="-220" width="20" height="220" fill="#7a6a4a" />
                <rect x="180" y="-220" width="20" height="220" fill="#7a6a4a" />
                <rect x="-150" y="-560" width="300" height="200" rx="10" fill="#141618" stroke="#3a3c42" strokeWidth="10" />
                <rect x="-20" y="-360" width="40" height="100" fill="#3a3c42" />
              </g>
            );
          })}
        </g>
      );
    })}
    {children}
  </g>
);
const Bureau = scene('bureau', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={1460} y={lerp(1300, 780, ease(t, 0, 40, Easing.inOut(Easing.cubic)))} z={lerp(0.9, 1.25, k)}>
          <RueMonde fg={fg} boutiques={[{type: 'mur', x: 600}, {type: 'tour', x: 1180}, {type: 'mur', x: 1760}]}>
            <text x="1460" y="1090" textAnchor="middle" fontFamily={POLICE} fontSize="60" fill="#ffd23a" opacity={ease(f, R('troisième', 3), R('étage', 12))}>3e ÉTAGE</text>
          </RueMonde>
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={540} y={lerp(1200, 1150, k)} z={lerp(1.0, 1.08, k) * punchZ(t)}>
          <BureauMonde fg={fg} f={f} />
        </Vue>
      </Ecran>
    );
  }
  if (i === 2) {
    // les mains qui tapent
    const tape = (j) => Math.max(0, Math.sin(fg * 1.6 + j * 1.7)) * 30;
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={540} y={960} z={1}>
          <rect x="-400" y="-200" width="1880" height="2320" fill="#a8946a" />
          <rect x="140" y="900" width="800" height="340" rx="24" fill="#d8d8dc" />
          {[...Array(4)].map((_, r) => [...Array(11)].map((__, c) => <rect key={`${r}${c}`} x={170 + c * 70} y={930 + r * 74} width="58" height="60" rx="10" fill="#f4f4f6" stroke="#b8b8c0" strokeWidth="4" />))}
          {[[330, 0], [750, 1]].map(([x, j]) => (
            <g key={j} transform={`translate(${x} ${980 - tape(j)})`}>
              <ellipse rx="130" ry="90" fill="#a3b59a" />
              {[-80, -30, 20, 70].map((fx, q) => <rect key={q} x={fx - 22} y={20 + tape(j + q) * 0.3} width="44" height="110" rx="22" fill="#a3b59a" />)}
              <rect x={j ? 40 : -440} y="-90" width="400" height="160" rx="60" fill="#eef0f4" />
            </g>
          ))}
          <rect x="140" y="-200" width="800" height="760" fill="#141618" stroke="#3a3c42" strokeWidth="24" />
          <path d="M200,-100 L400,-100 L200,200 Z" fill="#ffffff" opacity="0.05" />
        </Vue>
      </Ecran>
    );
  }
  // le câble du clavier : débranché
  return (
    <Ecran fg={fg} teinte={JOUR}>
      <Vue x={540} y={960} z={lerp(1.0, 1.1, k) * punchZ(f - R('branchés', 160), 0.1)}>
        <rect x="-400" y="-200" width="1880" height="2320" fill="#8a8a92" />
        <rect x="-400" y="-200" width="1880" height="900" fill="#a8946a" />
        <rect x="-200" y="500" width="900" height="200" rx="20" fill="#d8d8dc" />
        <path d="M640,620 C800,700 760,1000 600,1100 S520,1300 640,1400" stroke="#2a2a2e" strokeWidth="22" fill="none" strokeLinecap="round" />
        <rect x="600" y="1390" width="80" height="60" rx="8" fill="#5a5a62" />
        {[0, 1, 2].map((j) => <rect key={j} x={615 + j * 18} y="1450" width="10" height="30" fill="#c8a040" />)}
        <rect x="820" y="1500" width="200" height="120" rx="14" fill="#f4f4f0" />
        {[0, 1].map((j) => <rect key={j} x={870 + j * 70} y="1530" width="30" height="50" rx="6" fill="#2a2a2e" />)}
        <Ecrit x={600} y={1720} txt="?" taille={140} c="#c83a2a" op={ease(f, R('branchés', 160), R('branchés', 160) + 6)} />
      </Vue>
    </Ecran>
  );
});

// ===================== 8. Le feu rouge : il attend qu'il passe au vert =====================
const Voiture = ({x, y, s = 1, conducteur = null, poussiere = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx="0" cy="0" rx="430" ry="30" fill="#000" opacity="0.35" filter="url(#hp-ombre)" />
    <path d="M-420,-60 L-420,-200 Q-400,-240 -300,-250 L-200,-380 Q-160,-410 -60,-410 L150,-410 Q220,-400 270,-330 L330,-250 Q420,-240 430,-180 L430,-60 Z" fill="#6a8aa8" />
    <path d="M-170,-370 L-120,-390 L100,-390 Q160,-385 200,-330 L240,-260 L-230,-260 Z" fill="#2a3440" />
    <rect x="-10" y="-390" width="16" height="130" fill="#6a8aa8" />
    <g>
      <clipPath id="vo-vitre"><path d="M-170,-370 L-120,-390 L100,-390 Q160,-385 200,-330 L240,-260 L-230,-260 Z" /></clipPath>
      <g clipPath="url(#vo-vitre)">{conducteur}</g>
    </g>
    <path d="M-170,-370 L-120,-390 L-40,-390 L-160,-270 Z" fill="#ffffff" opacity="0.15" />
    <rect x="-420" y="-200" width="850" height="140" fill="#c8b48a" opacity={0.35 * poussiere} />
    {[-260, 270].map((wx) => (
      <g key={wx} transform={`translate(${wx} -50)`}>
        <ellipse rx="80" ry="64" fill="#1a1c20" />
        <circle r="34" fill="#8a8a8a" />
      </g>
    ))}
    {[-330, -200, 200, 330].map((hx, j) => <Herbe key={j} x={hx} y={20} s={1.4} c="#6a8a3a" />)}
    <rect x="400" y="-200" width="30" height="40" rx="8" fill="#f4e8c0" />
  </g>
);
const FeuRouge = ({x, y, s = 1, rouge = 0}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-14" y="0" width="28" height="1100" fill="#3a3c42" />
    <rect x="-80" y="-360" width="160" height="380" rx="24" fill="#22242a" />
    {['#c83a2a', '#c8a02a', '#3a9a4a'].map((c, j) => <circle key={j} cy={-280 + j * 120} r="48" fill={c} opacity={j === 0 ? 0.25 + 0.75 * rouge : 0.18} />)}
    {rouge > 0 && <circle cy="-280" r="140" fill="#ff3a2a" opacity={0.4 * rouge} filter="url(#hp-flou)" />}
    <Lierre x={10} y={1100} h={1000} />
  </g>
);
const Feu = scene('feu', ({f, fg, i, t, k, R}) => {
  const conducteur = (p = {}) => <g transform="translate(-20 -60) scale(0.36)"><Rond {...BUREAU} couleurs={{...BUREAU.couleurs, haut: '#5a5a6a', hautO: '#4a4a5a'}} assis profil={0.7} brasDevant brasG={[70, -40]} brasD={[70, -40]} {...p} /></g>;
  if (i === 0) {
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={540} y={lerp(760, 720, k)} z={lerp(1.0, 1.08, k) * punchZ(f - R('rouge', 7), 0.08)}>
          <RueMonde fg={fg} boutiques={[{type: 'mur', x: 0}, {type: 'pharmacie', x: 580}]}>
            <FeuRouge x={540} y={560} s={1.4} rouge={0} />
          </RueMonde>
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={lerp(500, 560, k)} y={1300} z={lerp(1.05, 1.15, k)}>
          <RueMonde fg={fg} boutiques={[{type: 'mur', x: 0}, {type: 'pharmacie', x: 580}]}>
            <FeuRouge x={980} y={480} s={1} />
            <Voiture x={500} y={1700} s={0.95} conducteur={conducteur()} />
          </RueMonde>
        </Vue>
      </Ecran>
    );
  }
  if (i === 2) {
    // de l'intérieur : la poussière, le volant, le regard fixe
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={540} y={980} z={lerp(1.0, 1.05, k)}>
          <rect x="-400" y="-200" width="1880" height="2320" fill="#2a2e36" />
          <path d="M-400,300 L1480,300 L1480,1000 L-400,1000 Z" fill="#c8d4dc" />
          <path d="M-400,300 L1480,300 L1480,1000 L-400,1000 Z" fill="#c8b48a" opacity="0.4" />
          {[...Array(30)].map((_, j) => <circle key={j} cx={random(`po${j}`) * 1080} cy={320 + random(`pp${j}`) * 660} r={3 + 6 * random(`pr${j}`)} fill="#8a7a5a" opacity="0.5" />)}
          <FeuRouge x={900} y={520} s={0.5} />
          <P x={420} y={2150} s={1.5}><Rond {...BUREAU} couleurs={{...BUREAU.couleurs, haut: '#5a5a6a', hautO: '#4a4a5a'}} cou={14} profil={0.6} pupX={14} pupY={-8} brasDevant brasG={[60, -60]} brasD={[60, -60]} /></P>
          <ellipse cx="420" cy="1560" rx="260" ry="200" fill="none" stroke="#1a1a1e" strokeWidth="50" />
          <rect x="-400" y="1500" width="1880" height="800" fill="#1e2228" opacity="0.6" />
          <Ecrit x={720} y={1600} txt="J+365" taille={60} c="#c8b48a" rot={-6} op={0.8} />
        </Vue>
      </Ecran>
    );
  }
  // il attend… qu'il passe au vert
  return (
    <Ecran fg={fg} teinte={JOUR}>
      <Vue x={540} y={lerp(1000, 980, k)} z={punchZ(f - R('vert', 172), 0.08)}>
        <g filter="url(#flou8)"><RueMonde fg={fg} boutiques={[{type: 'mur', x: 0}, {type: 'pharmacie', x: 580}]}><FeuRouge x={540} y={560} s={1.4} /></RueMonde></g>
        <P x={560} y={2200} s={1.6}><Rond {...BUREAU} couleurs={{...BUREAU.couleurs, haut: '#5a5a6a', hautO: '#4a4a5a'}} cou={14} profil={0.1} pupY={-18} brasDevant brasG={[60, -80]} brasD={[60, -80]} penche={4 * Math.sin(fg / 12)} /></P>
      </Vue>
    </Ecran>
  );
});

// ===================== 9. La maman et la poussette vide =====================
const RUE_ECOLE = [{type: 'mur', x: -560}, {type: 'ecole', x: 20}, {type: 'ecole', x: 600}, {type: 'mur', x: 1180}];
const Poussette = ({x, y, s = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-200,-300 Q-200,-480 0,-480 L60,-480 L60,-300 Z" fill="#3a5a8a" />
    <rect x="-210" y="-310" width="320" height="130" rx="40" fill="#4a6a9a" />
    <path d="M110,-300 L220,-520" stroke="#2a2a2e" strokeWidth="16" strokeLinecap="round" />
    <rect x="180" y="-540" width="90" height="26" rx="13" fill="#2a2a2e" />
    {[-150, 60].map((wx) => <circle key={wx} cx={wx} cy="-60" r="60" fill="none" stroke="#2a2a2e" strokeWidth="18" />)}
    <path d="M-150,-180 L-150,-60 M60,-180 L60,-60" stroke="#2a2a2e" strokeWidth="10" />
  </g>
);
const Grille = () => (
  <g>
    <rect x="-1500" y="1380" width="6000" height="14" fill="#2a3a5a" />
    {[...Array(90)].map((_, j) => <rect key={j} x={-1480 + j * 66} y="1240" width="12" height="220" fill="#2a3a5a" />)}
    <rect x="-1500" y="1240" width="6000" height="14" fill="#2a3a5a" />
  </g>
);
const Maman = scene('maman', ({f, fg, i, t, k, R}) => {
  const pousse = (ph) => ({...MAMAN, ...traine(ph), brasG: [70, -20], brasD: [70, -20], penche: 10});
  if (i === 0) {
    const x = lerp(-300, 380, ease(t, 0, 50, Easing.linear));
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={lerp(300, 420, k)} y={1180} z={0.95 * punchZ(t)}>
          <RueMonde fg={fg} boutiques={RUE_ECOLE}>
            <Grille />
            <Poussette x={x + 220} y={1620} s={0.65} />
            <P x={x} y={1620} s={0.62}><Rond {...pousse(fg / 8)} profil={0.6} /></P>
          </RueMonde>
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    // dans la poussette : vide, juste un doudou
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={540} y={980} z={lerp(1.0, 1.08, k) * punchZ(f - R('vide', 82), 0.08)}>
          <rect x="-400" y="-200" width="1880" height="2320" fill="#c8b890" />
          <ellipse cx="540" cy="1100" rx="480" ry="360" fill="#3a5a8a" />
          <ellipse cx="540" cy="1120" rx="400" ry="290" fill="#e8dcd0" />
          <ellipse cx="540" cy="1160" rx="360" ry="220" fill="#d8ccc0" />
          <g transform="translate(680 1200) rotate(-20)">
            <circle r="70" fill="#c89a6a" />
            <circle cx="-50" cy="-60" r="30" fill="#c89a6a" />
            <circle cx="50" cy="-60" r="30" fill="#c89a6a" />
            <circle cx="-22" cy="-10" r="8" fill="#2a1a10" />
            <circle cx="22" cy="-10" r="8" fill="#2a1a10" />
          </g>
          <path d="M100,760 Q540,560 980,760" stroke="#2a4a7a" strokeWidth="60" fill="none" />
        </Vue>
      </Ecran>
    );
  }
  if (i === 2) {
    // accéléré : aller… retour…
    const al = R('aller', 142);
    const re = R('retour', 164);
    const x = f < re - 6 ? lerp(-200, 1100, ease(f, al - 30, re - 8)) : lerp(1100, -200, ease(f, re - 6, re + 24));
    const sens = f < re - 6 ? 1 : -1;
    return (
      <Ecran fg={fg} teinte={JOUR} dessus={<g>{f >= al - 4 && <Puce f={f} t0={al - 4} txt="ALLER →" y={300} fond="#141218" coul="#ffffff" taille={56} />}{f >= re - 4 && <Puce f={f} t0={re - 4} txt="← RETOUR" y={420} fond="#141218" coul="#ffd23a" taille={56} />}</g>}>
        <Vue x={450} y={1150} z={0.8}>
          <RueMonde fg={fg * 4} boutiques={RUE_ECOLE}>
            <Grille />
            {[0.2, 0.12, 0.06].map((o, j) => <g key={j} opacity={o}><Poussette x={x + sens * (220 - 70 * (j + 1))} y={1620} s={0.65} /></g>)}
            <g transform={`translate(${x + (sens > 0 ? 220 : -220)} 0)`}><Poussette x={0} y={1620} s={sens > 0 ? 0.65 : -0.65} /></g>
            <P x={x} y={1620} s={0.62} flip={sens < 0}><Rond {...pousse(fg / 4)} profil={0.6} /></P>
          </RueMonde>
        </Vue>
      </Ecran>
    );
  }
  return (
    <Ecran fg={fg} teinte={JOUR}>
      <Vue x={540} y={lerp(1000, 970, k)} z={lerp(1.0, 1.08, k)}>
        <g filter="url(#flou8)"><RueMonde fg={fg} boutiques={RUE_ECOLE}><Grille /></RueMonde></g>
        <P x={520} y={2200} s={1.6}><Rond {...MAMAN} cou={14} profil={0.4} pupY={14} pupX={10} brasDevant brasG={[60, -40]} brasD={[60, -40]} penche={6} larmes={0} /></P>
      </Vue>
    </Ecran>
  );
});

// ===================== 10. Samedi soir : ils dansent sans musique =====================
const RUE_CLUB = [{type: 'mur', x: -560}, {type: 'club', x: 20}, {type: 'mur', x: 600}];
const Foule = ({fg, n = 22, sync = 1, tournes = 0, yeux = 1, x0 = 540, y0 = 1700, large = 1}) => (
  <g>
    <ellipse cx={x0} cy={y0 - 500} rx={800 * large} ry="520" fill="#8aa0e0" opacity="0.32" filter="url(#hp-flou2)" />
    {[...Array(n)].map((_, j) => {
      const r = Math.floor(j / 6);
      const x = x0 + ((j % 6) - 2.5) * 210 * large + 60 * random(`fx${j}`);
      const y = y0 - r * 110;
      const s = 0.52 - r * 0.07;
      const bal = Math.sin(fg / 9 + (1 - sync) * j) * 10;
      return (
        <P key={j} x={x} y={y} s={s} rot={bal * (1 - tournes)}>
          <Rond zombie dos={tournes < 0.5} sansYeux={yeux < 0.5} brasG={[16, 0]} brasD={[16, 0]} />
        </P>
      );
    }).reverse()}
  </g>
);
const Fete = scene('fete', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    return (
      <Ecran fg={fg} teinte={NUIT} dessus={<Puce f={f} t0={R('samedi', 3)} txt="SAMEDI · 23:00" y={260} fond="#141218" coul="#ff7ac8" taille={60} />}>
        <Vue x={300} y={lerp(980, 920, k)} z={lerp(1.3, 1.45, k)}>
          <RueMonde fg={fg} nuit={1} boutiques={RUE_CLUB} />
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    const arrive = ease(t, 0, 50);
    return (
      <Ecran fg={fg} teinte={NUIT}>
        <Vue x={300} y={1300} z={lerp(0.85, 0.92, k)}>
          <RueMonde fg={fg} nuit={1} boutiques={RUE_CLUB}>
            <Foule fg={fg} n={Math.round(8 + 16 * arrive)} sync={0.3} x0={300} y0={1880} />
          </RueMonde>
        </Vue>
      </Ecran>
    );
  }
  if (i === 2) {
    // pas de musique : l'enceinte morte
    return (
      <Ecran fg={fg} teinte={NUIT}>
        <Vue x={540} y={960} z={lerp(1.0, 1.06, k)}>
          <rect x="-400" y="-200" width="1880" height="2320" fill="#141220" />
          <rect x="260" y="500" width="560" height="900" rx="30" fill="#1e1e26" stroke="#3a3a46" strokeWidth="12" />
          <circle cx="540" cy="760" r="170" fill="#0a0a0e" stroke="#3a3a46" strokeWidth="14" />
          <circle cx="540" cy="760" r="60" fill="#2a2a32" />
          <circle cx="540" cy="1170" r="120" fill="#0a0a0e" stroke="#3a3a46" strokeWidth="12" />
          <path d="M380,620 L460,700 M640,1100 L700,1220" stroke="#5a5a66" strokeWidth="6" />
          <path d="M820,1300 Q1000,1400 960,1700" stroke="#2a2a2e" strokeWidth="14" fill="none" />
          <g opacity={ease(f, R('musique', 117) - 4, R('musique', 117) + 4)}>
            <circle cx="540" cy="1520" r="80" fill="none" stroke="#ff4a4a" strokeWidth="14" />
            <path d="M500,1490 L540,1520 M540,1520 L580,1550 M540,1520 L520,1480" stroke="#ff4a4a" strokeWidth="10" />
            <path d="M470,1450 L610,1590" stroke="#ff4a4a" strokeWidth="14" />
          </g>
          <ellipse cx="540" cy="200" rx="600" ry="300" fill="#c8d4ff" opacity="0.15" filter="url(#hp-flou2)" />
        </Vue>
      </Ecran>
    );
  }
  if (i === 3) {
    return (
      <Ecran fg={fg} teinte={NUIT}>
        <Vue x={540} y={lerp(1420, 1380, k)} z={lerp(1.15, 1.25, k)}>
          <RueMonde fg={fg} nuit={1} boutiques={[{type: 'club', x: 260}]}>
            <ellipse cx="540" cy="1500" rx="800" ry="300" fill="#c8d4ff" opacity="0.12" filter="url(#hp-flou2)" />
            <Foule fg={fg} n={24} sync={1} x0={540} y0={1900} />
          </RueMonde>
        </Vue>
      </Ecran>
    );
  }
  return (
    <Ecran fg={fg} teinte={NUIT}>
      <Vue x={540} y={1250} z={lerp(1.0, 1.06, k)}>
        <ToitMonde fg={fg} nuit={1}>
          <g transform="translate(540 1700) scale(0.3)" opacity="0.6"><Foule fg={fg} n={18} sync={1} x0={0} y0={0} /></g>
          {[[260, LEO, 0.72], [470, INES, 1], [680, KARIM, 1.08], [880, TOI, 1]].map(([x, p, s], j) => (
            <P key={j} x={x} y={1480} s={0.62 * s}><Rond {...p} dos brasG={[14, 0]} brasD={[14, 0]} /></P>
          ))}
        </ToitMonde>
      </Vue>
    </Ecran>
  );
});

// ===================== 11. Jour 470 : plus d'eau, vous descendez =====================
const RUE_FACE = [{type: 'mur', x: -560}, {type: 'superette', x: 20}, {type: 'boulangerie', x: 600}];
const Eau = scene('eau', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    const goutte = ((t % 20) / 20);
    return (
      <Ecran fg={fg} teinte={JOUR} dessus={<Jour f={f} t0={R('jour', 0)} de={467} a={470} />}>
        <Vue x={540} y={980} z={lerp(1.0, 1.08, k)}>
          <g filter="url(#flou4)"><ToitMonde fg={fg} /></g>
          <rect x="-400" y="1300" width="1880" height="1000" fill="#7a7468" opacity="0.6" />
          {[[300, -20], [520, 10], [740, -8]].map(([x, r], j) => (
            <g key={j} transform={`translate(${x} 1350) rotate(${r})`}>
              <rect x="-70" y="-360" width="140" height="360" rx="40" fill="#cfe8f8" opacity="0.6" stroke="#9ac8e8" strokeWidth="6" />
              <rect x="-30" y="-420" width="60" height="70" rx="10" fill="#3a7ad8" />
              {j === 1 && <rect x="-66" y="-30" width="132" height="26" rx="10" fill="#7ab8f0" opacity="0.8" />}
            </g>
          ))}
          <path transform={`translate(520 ${880 + goutte * 400})`} d="M0,-26 Q20,0 16,12 A18,18 0 1 1 -16,12 Q-20,0 0,-26 Z" fill="#7ab8f0" opacity={1 - goutte} />
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    // l'échelle de secours, vous descendez
    const u = ease(t, 0, 55, Easing.inOut(Easing.sin));
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={1460} y={lerp(700, 1200, u)} z={1.2}>
          <RueMonde fg={fg} boutiques={[{type: 'mur', x: 600}, {type: 'superette', x: 1180}, {type: 'mur', x: 1760}]}>
            <rect x="1660" y="360" width="16" height="1100" fill="#5a5a62" />
            <rect x="1780" y="360" width="16" height="1100" fill="#5a5a62" />
            {[...Array(22)].map((_, j) => <rect key={j} x="1660" y={380 + j * 50} width="136" height="10" fill="#5a5a62" />)}
            <P x={1728} y={lerp(700, 1300, u)} s={0.42}><Rond {...KARIM} dos brasG={[150, 20]} brasD={[150, 20]} jambes={Math.sin(fg / 4)} /></P>
            <P x={1728} y={lerp(500, 1080, u)} s={0.4}><Rond {...TOI} dos brasG={[150, 20]} brasD={[150, 20]} jambes={Math.sin(fg / 4 + 1)} /></P>
          </RueMonde>
        </Vue>
      </Ecran>
    );
  }
  if (i === 2) {
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={lerp(300, 380, k)} y={1220} z={0.85}>
          <RueMonde fg={fg} boutiques={RUE_FACE}>
            {[[-300, 1620, 0], [700, 1660, 1], [980, 1600, 2], [100, 1700, 3]].map(([x, y, j]) => <P key={j} x={x + 10 * Math.sin(fg / 20 + j)} y={y} s={0.55}><Rond {...PASSANTS[j]} {...traine(fg / 10, j)} profil={j % 2 ? 0.5 : -0.5} /></P>)}
            <P x={lerp(-500, 200, k)} y={1780} s={0.66}><Rond {...KARIM} {...course(fg / 5)} jambes={Math.sin(fg / 5) * 0.5} profil={0.7} /></P>
            <P x={lerp(-650, 60, k)} y={1800} s={0.62}><Rond {...TOI} {...course(fg / 5 + 1)} jambes={Math.sin(fg / 5 + 1) * 0.5} profil={0.7} /></P>
          </RueMonde>
        </Vue>
      </Ecran>
    );
  }
  if (i === 3) {
    // entre eux, lentement
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={540} y={1150} z={lerp(1.05, 1.15, k)}>
          <g filter="url(#flou4)"><RueMonde fg={fg} boutiques={RUE_FACE} /></g>
          <P x={120} y={2000} s={1.0}><Rond {...PASSANTS[1]} {...traine(fg / 12, 1)} profil={0.3} /></P>
          <P x={980} y={2050} s={1.05}><Rond {...PASSANTS[3]} {...traine(fg / 12, 2)} profil={-0.4} /></P>
          <P x={440} y={2140} s={1.2}><Rond {...TOI} cou={14} profil={-0.2} pupX={-24} yeux={1.3} sourcils={1} bouche="serre" sueur={(f / 16) % 1} jambes={0.3 * Math.sin(fg / 10)} brasG={[10, 0]} brasD={[10, 0]} /></P>
          <P x={700} y={2160} s={1.25}><Rond {...KARIM} cou={14} profil={0.3} pupX={20} sourcils={0.6} bouche="serre" jambes={0.3 * Math.sin(fg / 10 + 1)} brasG={[10, 0]} brasD={[10, 0]} /></P>
        </Vue>
      </Ecran>
    );
  }
  return (
    <Ecran fg={fg} teinte={JOUR}>
      <Vue x={540} y={980} z={lerp(1.0, 1.06, k)}>
        <g filter="url(#flou8)"><RueMonde fg={fg} boutiques={RUE_FACE} /></g>
        <P x={540} y={2200} s={1.6}><Rond {...PASSANTS[0]} cou={14} profil={-0.6} pupX={-30} brasG={[10, 0]} brasD={[10, 0]} penche={-6} /></P>
        <P x={1000} y={2050} s={0.9}><g filter="url(#flou4)"><Rond {...TOI} profil={-0.4} /></g></P>
      </Vue>
    </Ecran>
  );
});

// ===================== 12. La caissière : elle attend que vous payiez =====================
const Caisse = ({fg, children}) => (
  <g>
    <rect x="-600" y="-400" width="2400" height="2600" fill="#d8d4c8" />
    {[...Array(5)].map((_, j) => (
      <g key={j}>
        <rect x={-400 + j * 420} y="300" width="340" height="760" fill="#e8e4dc" stroke="#c8c0b0" strokeWidth="8" />
        {[0, 1, 2, 3].map((r) => <rect key={r} x={-400 + j * 420} y={420 + r * 170} width="340" height="14" fill="#a8a090" />)}
        {[...Array(4)].map((__, q) => random(`pr${j}${q}`) < 0.4 && <rect key={q} x={-370 + j * 420 + q * 70} y={360 + Math.floor(random(`py${j}${q}`) * 4) * 170} width="50" height="60" fill={['#c83a2a', '#3a7ad8', '#e8b830', '#3a9a4a'][q]} />)}
      </g>
    ))}
    <rect x="-600" y="80" width="2400" height="60" fill="#c83a2a" />
    {[...Array(6)].map((_, j) => <rect key={j} x={-500 + j * 380} y="0" width="220" height="30" rx="10" fill={j % 3 ? '#f4f8ff' : '#5a5a62'} />)}
    <rect x="-600" y="1060" width="2400" height="1200" fill="#b8b0a0" />
    {[...Array(10)].map((_, j) => <rect key={j} x={-600 + j * 240} y="1060" width="6" height="1200" fill="#9a9284" />)}
    {children}
  </g>
);
const Comptoir = () => (
  <g>
    <rect x="-200" y="1320" width="1500" height="900" fill="#5a5a62" />
    <rect x="-200" y="1300" width="1500" height="60" fill="#3a3a42" />
    <rect x="-200" y="1310" width="700" height="30" fill="#1a1a1e" />
    <g transform="translate(820 1180)"><rect x="-120" y="-150" width="240" height="160" rx="12" fill="#2a2a32" /><rect x="-100" y="-130" width="200" height="100" fill="#0a1a10" /><text y="-62" textAnchor="middle" fontFamily={POLICE} fontSize="50" fill="#3aff7a">0,00 €</text><rect x="-30" y="10" width="60" height="130" fill="#3a3a42" /></g>
  </g>
);
const Caissiere = scene('caissiere', ({f, fg, i, t, k, R}) => {
  const tourne = ease(f, R('fixe', 41) - 14, R('fixe', 41));
  if (i === 0) {
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={540} y={lerp(1150, 1100, k)} z={lerp(1.0, 1.08, k)}>
          <Caisse fg={fg}>
            <P x={540} y={1700} s={0.8}><Rond {...CAISSIERE} profil={lerp(-0.8, 0, tourne)} pupX={lerp(-30, 0, tourne)} brasG={[12, 0]} brasD={[12, 0]} /></P>
            <Comptoir />
          </Caisse>
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    const main = ease(f, R('tend', 65) - 6, R('main', 72) + 2, Easing.out(Easing.back(1.4)));
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={540} y={lerp(1000, 980, k)} z={punchZ(f - R('tend', 65), 0.06)}>
          <g filter="url(#flou8)"><Caisse fg={fg} /></g>
          <P x={540} y={2200} s={1.6}><Rond {...CAISSIERE} cou={14} profil={0} pupY={4} brasDevant brasG={[10, 0]} brasD={[lerp(10, 110, main), lerp(0, -60, main)]} /></P>
        </Vue>
      </Ecran>
    );
  }
  if (i === 2) {
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={540} y={1050} z={lerp(1.0, 1.06, k)}>
          <g filter="url(#flou4)"><Caisse fg={fg} /></g>
          <P x={340} y={2200} s={1.3}><Rond {...TOI} cou={14} profil={0.3} pupX={20} yeux={1.35} sourcils={1} bouche="o" sueur={(f / 14) % 1} brasG={[10, 0]} brasD={[10, 0]} /></P>
          <P x={760} y={2240} s={1.35}><Rond {...KARIM} cou={14} profil={-0.3} pupX={-14} yeux={1.2} sourcils={0.8} bouche="serre" brasG={[10, 0]} brasD={[10, 0]} /></P>
        </Vue>
      </Ecran>
    );
  }
  if (i === 3) {
    // la pièce dans la paume
    const u = ease(f, R('pièce', 151) - 14, R('pièce', 151));
    const ding = f >= R('pièce', 151) && f < R('pièce', 151) + 10;
    return (
      <Ecran fg={fg} teinte={JOUR} dessus={ding && <text x="700" y="640" fontFamily={POLICE} fontSize={110 * pop(f, R('pièce', 151))} fill="#ffd23a" transform="rotate(-8 700 640)">DING</text>}>
        <Vue x={540} y={1000} z={lerp(1.0, 1.1, k)}>
          <rect x="-400" y="-200" width="1880" height="2320" fill="#c8c0b0" />
          <g transform="translate(560 1260)">
            <ellipse rx="230" ry="150" fill="#a3b59a" />
            {[-150, -60, 30, 120].map((x, j) => <rect key={j} x={x - 30} y="-40" width="60" height="180" rx="30" fill="#a3b59a" transform={`rotate(${-20 + j * 12} ${x} 0)`} />)}
            <rect x="-600" y="-80" width="400" height="160" rx="60" fill="#c83a2a" />
          </g>
          <g transform={`translate(${lerp(760, 560, u)} ${lerp(400, 1180, u)})`}>
            <circle r="56" fill="#e8c040" stroke="#b8902a" strokeWidth="8" />
            <text y="16" textAnchor="middle" fontFamily={POLICE} fontSize="44" fill="#8a6a1a">2€</text>
          </g>
          <g transform={`translate(${lerp(900, 700, u)} ${lerp(200, 980, u)})`}>
            <ellipse rx="130" ry="90" fill="#c8906a" />
            {[-70, -20, 30].map((x) => <rect key={x} x={x - 22} y="40" width="44" height="120" rx="22" fill="#c8906a" />)}
            <rect x="40" y="-200" width="160" height="300" rx="60" fill="#23304a" />
          </g>
        </Vue>
      </Ecran>
    );
  }
  const passe = ease(t, 6, 36);
  return (
    <Ecran fg={fg} teinte={JOUR}>
      <Vue x={540} y={1150} z={1.0}>
        <Caisse fg={fg}>
          <P x={lerp(540, 340, ease(t, 0, 10))} y={1700} s={0.8}><Rond {...CAISSIERE} profil={0.4} brasG={[12, 0]} brasD={[80, -20]} /></P>
          <Comptoir />
          <P x={lerp(-200, 1300, passe)} y={2060} s={1.05}><Rond {...KARIM} profil={0.7} {...course(fg / 4)} jambes={Math.sin(fg / 4) * 0.6} /></P>
          <P x={lerp(-450, 1050, passe)} y={2080} s={1.0}><Rond {...TOI} profil={0.7} pupX={-20} sueur={0.6} {...course(fg / 4 + 1)} jambes={Math.sin(fg / 4 + 1) * 0.6} /></P>
        </Caisse>
      </Vue>
    </Ecran>
  );
});

// ===================== 13. Léo leur a donné des noms =====================
const Leo = scene('leo', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={540} y={lerp(1000, 970, k)} z={punchZ(t)}>
          <GrosPlan fg={fg} perso={LEO} s={1.75} p={{profil: -0.2, bouche: 'sourire', yeux: 1.1, brasDevant: true, brasG: [80, -150], brasD: [80, -150]}} />
          <g transform="translate(540 1040)"><rect x="-150" y="-60" width="130" height="120" rx="34" fill="#2a2a30" /><rect x="20" y="-60" width="130" height="120" rx="34" fill="#2a2a30" /><rect x="-30" y="-24" width="60" height="48" fill="#3a3a40" /></g>
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    const noms = [['M. Baguette', BOULANGER], ['Jean-Mi le facteur', FACTEUR], ['Speedy', JOGGEUR], ['Maman Poussette', MAMAN]];
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={540} y={lerp(960, 920, k)} z={lerp(1.0, 1.06, k)}>
          <rect x="-400" y="-200" width="1880" height="2320" fill="#6a5a48" />
          <Page rot={2}>
            <Ecrit x={240} y={380} txt="MES ZOMBIES  ♥" taille={60} c="#e85a3a" />
            {noms.map(([n, p], j) => (
              <g key={j} opacity={ease(t, 4 + j * 8, 10 + j * 8)}>
                <g transform={`translate(300 ${640 + j * 260}) scale(0.2)`}><Rond {...p} brasG={[12, 0]} brasD={[12, 0]} /></g>
                <Ecrit x={420} y={560 + j * 260} txt={n} taille={56} c="#2a3a8a" />
              </g>
            ))}
          </Page>
        </Vue>
      </Ecran>
    );
  }
  const inquiet = ease(f, R('remarqué', 126) - 8, R('remarqué', 126));
  return (
    <Ecran fg={fg} teinte={JOUR}>
      <Vue x={540} y={lerp(980, 950, k)} z={lerp(1.0, 1.1, k) * punchZ(f - R('truc', 139), 0.08)}>
        <GrosPlan fg={fg} perso={LEO} s={1.75} p={{profil: 0.4, pupX: 24, yeux: lerp(1.1, 1.35, inquiet), bouche: inquiet > 0.5 ? 'o' : 'sourire', sourcils: lerp(0, 1, inquiet), brasG: [10, 0], brasD: [lerp(10, 120, inquiet), lerp(0, -70, inquiet)]}} />
      </Vue>
    </Ecran>
  );
});

// ===================== 14. Le facteur dépose des papiers, avec des dessins =====================
const Changement = scene('changement', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    const u = ease(t, 4, 30, Easing.inOut(Easing.cubic));
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={540} y={960} z={punchZ(f - R('feuilles', 37), 0.06)}>
          <rect x="-400" y="-200" width="1880" height="2320" fill="#c8b890" />
          <rect x="140" y="600" width="800" height="700" rx="40" fill="#e8b830" />
          <rect x="300" y="820" width="480" height="60" rx="30" fill="#2a2418" />
          <g transform={`translate(${lerp(820, 560, u)} ${lerp(560, 830, u)}) rotate(${lerp(-20, 6, u)})`}>
            <rect x="-120" y="-90" width="240" height="180" fill="#f8f6ee" />
            <path d="M-80,-40 L-20,10 L40,-30 L80,20" stroke="#e85a3a" strokeWidth="8" fill="none" />
            <circle cx="-60" cy="40" r="16" fill="none" stroke="#3a7ad8" strokeWidth="6" />
          </g>
          <g transform={`translate(${lerp(1000, 760, u)} ${lerp(500, 760, u)})`}>
            <ellipse rx="150" ry="110" fill="#a3b59a" />
            <rect x="60" y="-40" width="400" height="140" rx="50" fill="#4a6ab0" />
          </g>
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Jumelles k={k}>
          <Vue x={lerp(440, 1000, k)} y={1250} z={1.8}>
            <RueMonde fg={fg} boutiques={RUE_MAISONS}>
              {[-560, 20, 600, 1180].map((x, j) => <g key={j} transform={`translate(${x + 465} 1225) rotate(${-8 + j * 5})`}><rect x="-36" y="-26" width="72" height="52" fill="#f8f6ee" /><path d="M-24,-8 L0,8 L20,-10" stroke="#e85a3a" strokeWidth="5" fill="none" /></g>)}
              <P x={lerp(300, 900, k)} y={1540} s={0.62}><Rond {...FACTEUR} {...traine(fg / 7)} profil={0.6} /><SacFacteur /></P>
            </RueMonde>
          </Vue>
        </Jumelles>
      </Ecran>
    );
  }
  return (
    <Ecran fg={fg} teinte={JOUR}>
      <Vue x={540} y={960} z={lerp(1.2, 1.4, k)} r={-4}>
        <rect x="-400" y="-200" width="1880" height="2320" fill="#e8b830" />
        <g filter="url(#flou4)">
          <rect x="140" y="560" width="800" height="800" fill="#f8f6ee" />
          <path d="M260,1100 L260,800 L820,800 L820,1100 Z" stroke="#e85a3a" strokeWidth="14" fill="none" />
          {[0, 1, 2, 3].map((j) => <circle key={j} cx={360 + j * 120} cy="720" r="26" fill="none" stroke="#3a7ad8" strokeWidth="10" />)}
        </g>
      </Vue>
    </Ecran>
  );
});

// ===================== 15. Le dessin : un supermarché, un toit, quatre petits bonhommes =====================
const Crayon = ({d, u, c = '#e85a3a', w = 14}) => <path d={d} stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - u} />;
const Dessin = ({f, R, gros = 0}) => {
  const sm = ease(f, R('supermarché', 78) - 14, R('supermarché', 78) + 6);
  const toit = ease(f, R('toit', 112) - 10, R('toit', 112) + 4);
  const bonhomme = (j) => ease(f, R('quatre', 133) - 6 + j * 6, R('quatre', 133) + j * 6);
  return (
    <g>
      <rect x="40" y="300" width="1000" height="1300" fill="#f8f6ee" />
      <rect x="40" y="300" width="1000" height="1300" fill="#e8dcc0" opacity="0.3" />
      <Crayon d="M160,1450 L160,1000 L920,1000 L920,1450" u={sm} />
      <Crayon d="M300,1450 L300,1250 L460,1250 L460,1450" u={sm} c="#3a7ad8" w={10} />
      <Crayon d="M560,1150 L820,1150 L820,1300 L560,1300 Z" u={sm} c="#3a7ad8" w={10} />
      <text x="540" y="1110" textAnchor="middle" fontFamily="'DejaVu Sans', sans-serif" fontWeight="700" fontSize="70" fill="#e85a3a" opacity={sm} transform="rotate(-2 540 1110)">SUPER</text>
      <Crayon d="M130,1000 L950,1000" u={toit} c="#2a2a2e" w={18} />
      {[0, 1, 2, 3].map((j) => {
        const u = bonhomme(j);
        const x = 300 + j * 160;
        const h = j === 0 ? 0.75 : 1;
        return (
          <g key={j} transform={`translate(${x} 990) scale(${h})`}>
            <Crayon d="M0,-180 m-36,0 a36,36 0 1 0 72,0 a36,36 0 1 0 -72,0" u={u} c="#2a2a2e" w={9} />
            <Crayon d="M0,-144 L0,-60 M0,-120 L-40,-90 M0,-120 L40,-90 M0,-60 L-30,0 M0,-60 L30,0" u={u} c="#2a2a2e" w={9} />
          </g>
        );
      })}
      <circle cx="900" cy="440" r="70" fill="none" stroke="#e8b830" strokeWidth="12" opacity={ease(f, R('dessus', 54), R('dessus', 54) + 10)} />
      {gros > 0 && <path d="M560,600 L560,620" stroke="#000" />}
    </g>
  );
};
const DessinS = scene('dessin', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    const u = ease(t, 0, 50, Easing.inOut(Easing.sin));
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={290} y={lerp(1100, 1180, u)} z={1.5}>
          <RueMonde fg={fg} boutiques={RUE_MAISONS}>
            <P x={330} y={1560} s={0.6}><Rond {...KARIM} profil={0.5} pupX={-20} sourcils={0.6} bouche="serre" brasG={[10, 0]} brasD={[lerp(20, 140, u), lerp(0, -60, u)]} jambes={0} /></P>
          </RueMonde>
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={540} y={lerp(1000, 1080, k)} z={lerp(0.95, 1.05, k)} r={-2}>
          <rect x="-400" y="-200" width="1880" height="2320" fill="#5a4a3a" />
          <Dessin f={f} R={R} />
          <g transform="translate(-40 1560)"><ellipse rx="170" ry="120" fill="#c8906a" /><rect x="-40" y="-150" width="60" height="140" rx="30" fill="#c8906a" /></g>
        </Vue>
      </Ecran>
    );
  }
  if (i === 2) {
    return (
      <Ecran fg={fg} teinte={JOUR}>
        <Vue x={540} y={lerp(900, 880, k)} z={lerp(1.9, 2.1, k) * punchZ(f - R('quatre', 133), 0.08)}>
          <rect x="-400" y="-200" width="1880" height="2320" fill="#5a4a3a" />
          <Dessin f={f} R={R} />
        </Vue>
      </Ecran>
    );
  }
  // vos quatre visages
  return (
    <Ecran fg={fg} teinte={JOUR}>
      <Vue x={540} y={960} z={punchZ(t, 0.08)}>
        <g filter="url(#flou8)"><ToitMonde fg={fg} /></g>
        {[[200, 1440, LEO, 1.0], [430, 1520, INES, 1.05], [660, 1560, KARIM, 1.1], [890, 1500, TOI, 1.05]].map(([x, y, p, s], j) => (
          <P key={j} x={x} y={y + 400} s={0.62 * s}><Rond {...p} cou={10} yeux={1.35} bouche="o" sourcils={1} pupY={6} brasG={[10, 0]} brasD={[10, 0]} /></P>
        ))}
      </Vue>
    </Ecran>
  );
});

// ===================== 16. Ce soir, ils ne dansent pas : ils regardent le toit =====================
const Twist = scene('twist', ({f, fg, i, t, k, R}) => {
  const tour = ease(f, R('tournés', 102) - 6, R('tournés', 102) + 2);
  if (i === 0) {
    return (
      <Ecran fg={fg} teinte={NUIT}>
        <Vue x={540} y={lerp(1380, 1340, k)} z={lerp(1.1, 1.18, k)}>
          <RueMonde fg={fg} nuit={1} boutiques={[{type: 'club', x: 260}]}>
            <Foule fg={0} n={24} sync={1} x0={540} y0={1900} />
          </RueMonde>
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    return (
      <Ecran fg={fg} teinte={NUIT}>
        <Vue x={540} y={lerp(1000, 980, k)} z={1}>
          <rect x="-400" y="-200" width="1880" height="2320" fill="#1a2448" />
          <ellipse cx="540" cy="700" rx="700" ry="600" fill="#a8b8f0" opacity="0.45" filter="url(#hp-flou2)" />
          <circle cx="540" cy="420" r="120" fill="#f4f0d8" opacity="0.9" />
          {[[260, 1900, 1.4], [780, 1980, 1.5], [520, 2250, 1.9]].map(([x, y, s], j) => <P key={j} x={x} y={y} s={s}><Rond zombie dos brasG={[14, 0]} brasD={[14, 0]} /></P>)}
          <ellipse cx="540" cy="300" rx="500" ry="250" fill="#c8d4ff" opacity="0.12" filter="url(#hp-flou2)" />
        </Vue>
      </Ecran>
    );
  }
  if (i === 2) {
    return (
      <Ecran fg={fg} teinte={NUIT}>
        <Vue x={540} y={1380} z={lerp(1.15, 1.3, k) * punchZ(f - R('tournés', 102), 0.1)}>
          <RueMonde fg={fg} nuit={1} boutiques={[{type: 'club', x: 260}]}>
            <Foule fg={0} n={24} sync={1} tournes={tour} yeux={tour} x0={540} y0={1900} />
          </RueMonde>
        </Vue>
      </Ecran>
    );
  }
  if (i === 3) {
    // contrechamp : vous, tout petits, au bord du toit
    return (
      <Ecran fg={fg} teinte={NUIT}>
        <Vue x={1460} y={lerp(420, 380, k)} z={lerp(1.6, 1.75, k)}>
          <RueMonde fg={fg} nuit={1} boutiques={[{type: 'mur', x: 600}, {type: 'superette', x: 1180}, {type: 'mur', x: 1760}]}>
            {[1300, 1400, 1500, 1600].map((x, j) => <P key={j} x={x} y={362} s={0.14 * (j === 0 ? 0.75 : 1)}><Rond {...[LEO, INES, KARIM, TOI][j]} yeux={1.3} bouche="o" brasG={[14, 0]} brasD={[14, 0]} /></P>)}
          </RueMonde>
        </Vue>
      </Ecran>
    );
  }
  // le facteur lève la main
  const leve = ease(f, R('lève', 179) - 4, R('main', 190) + 6, Easing.out(Easing.back(1.2)));
  const salut = f > R('bonjour', 220) - 6 ? Math.sin(f / 3) * 14 : 0;
  return (
    <Ecran fg={fg} teinte={NUIT}>
      <Vue x={540} y={lerp(1150, 1000, ease(t, 0, 60))} z={lerp(1.0, 1.35, ease(t, 0, 60))}>
        <RueMonde fg={fg} nuit={1} boutiques={[{type: 'club', x: 260}]}>
          <Foule fg={0} n={18} sync={1} tournes={1} yeux={1} x0={540} y0={1700} />
          <P x={540} y={1880} s={0.8}>
            <Rond {...FACTEUR} profil={0} pupY={-16} yeux={1} brasG={[12, 0]} brasD={[lerp(12, 160 + salut, leve), lerp(0, -30, leve)]} />
            <SacFacteur />
          </P>
          <ellipse cx="540" cy="1200" rx="300" ry="500" fill="#c8d4ff" opacity="0.12" filter="url(#hp-flou2)" />
        </RueMonde>
      </Vue>
    </Ecran>
  );
});

// ===================== 17. Tu lui réponds, ou vous partez cette nuit ? =====================
const Choix = scene('choix', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    const hesite = Math.sin(f / 6) * 0.5 + 0.5;
    return (
      <Ecran fg={fg} teinte={NUIT}>
        <Vue x={540} y={lerp(980, 960, k)} z={punchZ(t)}>
          <GrosPlan fg={fg} perso={TOI} nuit={1} p={{profil: 0.2, pupY: 20, yeux: 1.25, sourcils: 0.9, bouche: 'serre', sueur: (f / 16) % 1, brasG: [10, 0], brasD: [lerp(20, 110, hesite * ease(t, 10, 30)), lerp(0, -60, hesite * ease(t, 10, 30))]}} />
        </Vue>
      </Ecran>
    );
  }
  const dis = R('dis-le', 102);
  return (
    <Ecran fg={fg} teinte={NUIT}
      dessus={
        <g>
          <ChoixBoite f={f} debut={Math.max(62, R('réponds', 32))} x={540} y={420} texte="LUI RÉPONDRE" emoji="1f44b" couleur="#ffd23a" />
          <ChoixBoite f={f} debut={Math.max(70, R('partez', 54))} x={540} y={600} texte="PARTIR CETTE NUIT" emoji="1f3c3" couleur="#5ab0ff" />
          <BulleCommentaire f={f} t0={dis - 2} y={1700} />
        </g>
      }>
      <Vue x={540} y={lerp(1300, 1260, k)} z={lerp(1.0, 1.05, k)}>
        <ToitMonde fg={fg} nuit={1}>
          <g transform="translate(540 1700) scale(0.3)" opacity="0.7"><Foule fg={0} n={18} sync={1} tournes={1} yeux={1} x0={0} y0={0} /></g>
          {[[260, LEO, 0.72], [470, INES, 1], [680, KARIM, 1.08], [880, TOI, 1]].map(([x, p, s], j) => (
            <P key={j} x={x} y={1480} s={0.62 * s}><Rond {...p} dos brasG={[14, 0]} brasD={j === 3 ? [lerp(14, 120, Math.sin(f / 8) * 0.5 + 0.5), -40] : [14, 0]} /></P>
          ))}
        </ToitMonde>
      </Vue>
    </Ecran>
  );
});

const COMPOSANTS = {ouverture: Ouverture, carte: Carte2, groupe: Groupe, regle: Regle, facteur: Facteur, joggeur: Joggeur, bureau: Bureau, feu: Feu, maman: Maman, fete: Fete, eau: Eau, caissiere: Caissiere, leo: Leo, changement: Changement, dessin: DessinS, twist: Twist, choix: Choix};
export const Jour467 = () => (
  <Series>
    {SCENES.map(([nom, d]) => {
      const C = COMPOSANTS[nom];
      return (
        <Series.Sequence key={nom} durationInFrames={d}>
          <C />
        </Series.Sequence>
      );
    })}
  </Series>
);
