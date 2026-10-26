import {AbsoluteFill, Easing, interpolate, random, Series, spring, staticFile, useCurrentFrame} from 'remotion';
import {appart} from './Appart';
import {Bonhomme} from './Bonhomme';
import {halo} from './Gare';
import {Choix} from './Livreur';
import {Telephone} from './Maison';
import {camFace, montage, Plan, punch} from './montage';
import {clamp, Finition, makeCam, marche, Perso} from './moteur';
import {SOL} from './Rue';
import {BO, boulangerieInt, BUS, busInt, chambreJour, FAC, rueJour, SALLE} from './Ville';
import PLANS from './hypergamie/plans.json';
import timeline from './hypergamie/timeline.json';

// « Et si l'hypergamie disparaissait ? » : le schéma d'internet se casse, et le bonhomme vit sa meilleure vie.
// Pas d'horreur : de jour, couleurs vives, décors 2,5D (couches, parallaxe), le bonhomme 2D et des filles dans le même style.
const {decoupe, repere, SCENES} = montage(timeline, PLANS);
export const DUREE_HYPERGAMIE = SCENES.reduce((t, [, d]) => t + d, 0);
const START = {};
SCENES.reduce((t, [nom, d]) => {
  START[nom] = t;
  return t + d;
}, 0);

const ease = {...clamp, easing: Easing.inOut(Easing.sin)};
const deg = (r) => (r * 180) / Math.PI;
const vise = (p, c, extra = {}) => {
  const dx = c[0] - p[0];
  const dy = c[1] - p[1];
  const dz = (c[2] - p[2]) * 1000;
  return {x: p[0], y: p[1], z: p[2], yaw: deg(Math.atan2(dx, dz)), pitch: deg(Math.atan2(dy, Math.hypot(dx, dz))), ...extra};
};
const lisse = (t, d) => Easing.inOut(Easing.sin)(Math.min(1, t / Math.max(1, d)));
const doux = (t) => punch(t, 0.04);
const JOUR = [1.04, 1.0, 0.95];
const CHAUD = [1.06, 0.95, 0.86];

// ----- les filles (même style que le bonhomme) -----
export const FILLES = {
  ines: {coiffure: 'long', cils: true, couleurs: {chev: '#4a2a1a', haut: '#ffd23a', hautO: '#e8b820', pant: '#2a5ad8', peau: '#f2c3a0', peauO: '#e3a984'}},
  lea: {coiffure: 'queue', cils: true, jupe: true, couleurs: {chev: '#c8803a', haut: '#3ad8a8', hautO: '#2ab890', pant: '#1a2a4a', jambe: '#f2c3a0'}},
  sarah: {coiffure: 'carre', cils: true, couleurs: {chev: '#1a1214', haut: '#ff7ab0', hautO: '#e8609a', pant: '#f4f0e8', peau: '#c8906a', peauO: '#b07a58'}},
  boulangere: {coiffure: 'queue', cils: true, couleurs: {chev: '#2a1a14', haut: '#ffffff', hautO: '#e4e4e4', pant: '#8a3a2a', peau: '#e8b48c', peauO: '#d09a74'}},
  maya: {coiffure: 'long', cils: true, jupe: true, couleurs: {chev: '#e8c870', haut: '#8a5aff', hautO: '#7048e0', pant: '#2a2a3a', jambe: '#2a2a3a'}},
};
const GARS = {
  karim: {couleurs: {chev: '#1a1210', haut: '#3ad86a', hautO: '#2ab858', peau: '#c8906a', peauO: '#b07a58', pant: '#2a2a3a'}},
  muscle: {couleurs: {chev: '#1a1210', haut: '#16161c', hautO: '#0c0c10', peau: '#d8a07a', peauO: '#c08a66', pant: '#3a3a48'}, sx: 1.3},
  tom: {couleurs: {chev: '#8a5a2a', haut: '#2a8ad8', hautO: '#2070b8', pant: '#3a3a3a'}},
};
// petit perso du schéma (dessin 2D direct)
const Fig = ({x, y, s = 0.2, ...pose}) => (
  <g transform={`translate(${x} ${y}) scale(${s}) translate(-300 -922)`}>
    <Bonhomme {...pose} />
  </g>
);

// ===================== le schéma (2D, avec des couches pour la profondeur) =====================
const NIV = [560, 790, 1020, 1250, 1480];
const COL = {f: 300, g: 780};
const FIGS_F = [FILLES.maya, FILLES.sarah, FILLES.lea, FILLES.ines, FILLES.boulangere];
const FIGS_G = [{...GARS.muscle, smile: 0.6}, GARS.karim, GARS.tom, {couleurs: {haut: '#8a8a9a', hautO: '#70707e', chev: '#4a3a2a'}}, {}];
const Schema = ({f, casse = 1e9, chute = 1e9, plat = false, gratte = false}) => {
  const zoom = plat ? 1.5 + 0.002 * f : 1.0 + 0.0016 * f;
  const cs = f - casse;
  const ch = plat ? 1 : interpolate(f, [chute, chute + 18], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  // les flèches : du bas des gars vers le bas des filles (bleu), et des filles vers le haut des gars (rose)
  const FLECHES = [
    {d: `M${COL.g - 90},${NIV[4] - 70} C${COL.g - 150},${NIV[4] + 90} ${COL.f + 150},${NIV[4] + 90} ${COL.f + 90},${NIV[4] - 70}`, c: '#4aa0ff'},
    {d: `M${COL.g - 90},${NIV[3] - 90} C${COL.g - 170},${NIV[3] + 30} ${COL.f + 170},${NIV[4] - 10} ${COL.f + 100},${NIV[4] - 110}`, c: '#4aa0ff'},
    {d: `M${COL.f + 90},${NIV[4] - 160} C${COL.f + 260},${NIV[3]} ${COL.g - 300},${NIV[1]} ${COL.g - 100},${NIV[0] - 120}`, c: '#ff5aa8'},
    {d: `M${COL.f + 90},${NIV[3] - 150} C${COL.f + 240},${NIV[2]} ${COL.g - 260},${NIV[1] - 60} ${COL.g - 100},${NIV[0] - 90}`, c: '#ff5aa8'},
    {d: `M${COL.f + 90},${NIV[2] - 150} C${COL.f + 220},${NIV[1] + 40} ${COL.g - 260},${NIV[0] + 20} ${COL.g - 100},${NIV[0] - 60}`, c: '#ff5aa8'},
  ];
  const ligne = (k, i) => {
    // position finale sur la ligne unique : filles et gars mélangés
    const pos = [0, 2, 4, 6, 8, 1, 3, 7, 9, 5][i];
    return {x: 120 + pos * 93, y: 1250};
  };
  const figs = [];
  FIGS_F.forEach((p, k) => {
    const a = {x: COL.f, y: NIV[k]};
    const b = ligne(k, k);
    const t = Math.max(0, Math.min(1, ch * 1.3 - k * 0.06));
    figs.push({x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * 140, s: 0.24 - 0.04 * t, p: {...p, smile: 0.4, breath: Math.sin(f / 6 + k) * 3}, k: `f${k}`});
  });
  FIGS_G.forEach((p, k) => {
    const a = {x: COL.g, y: NIV[k]};
    const b = ligne(k, k + 5);
    const t = Math.max(0, Math.min(1, ch * 1.3 - k * 0.06));
    const moi = k === 4;
    figs.push({
      x: a.x + (b.x - a.x) * t + (moi && plat ? 0 : 0),
      y: a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * 140,
      s: (moi ? 0.27 : 0.24) - 0.04 * t,
      p: {...p, smile: moi ? (plat ? 0.2 : ch > 0.5 ? 0.9 : 0) : 0.4, worry: moi && !plat && ch < 0.5 ? 0.8 : 0, eyes: moi && ch > 0.5 ? 1.2 : 1, breath: Math.sin(f / 6 + k) * 3,
        ...(moi && gratte ? {epauleD: -150, coudeD: -30 + 15 * Math.sin(f / 3), worry: 0.6, pupilY: -6} : {})},
      k: `g${k}`,
      moi,
    });
  });
  return (
    <AbsoluteFill style={{background: '#0e1230'}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <defs>
          <radialGradient id="sc-fond" cx="50%" cy="45%" r="75%">
            <stop offset="0" stopColor="#2a2f6a" />
            <stop offset="1" stopColor="#0a0c22" />
          </radialGradient>
          <filter id="sc-ombre" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#000" floodOpacity="0.5" />
          </filter>
          <filter id="sc-flou">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <rect width="1080" height="1920" fill="url(#sc-fond)" />
        {/* couche du fond : bulles floues qui dérivent (parallaxe lente) */}
        {[...Array(18)].map((_, k) => (
          <circle key={k} cx={(random(`bx${k}`) * 1300 - 100 + f * (0.4 + random(`bv${k}`))) % 1300 - 100} cy={random(`by${k}`) * 1920} r={30 + 90 * random(`br${k}`)} fill={['#ff5aa8', '#4aa0ff', '#ffd23a'][k % 3]} opacity="0.12" filter="url(#sc-flou)" />
        ))}
        <g transform={`translate(540 960) scale(${zoom}) rotate(${-1.5 + Math.sin(f / 40) * 1}) translate(${plat ? -585 : -540} ${plat ? -1130 : -960})`}>
          {/* la carte du schéma, légèrement inclinée, avec son ombre */}
          <g filter="url(#sc-ombre)">
            <rect x="70" y="250" width="940" height="1420" rx="50" fill="#f6f2ff" opacity={1 - 0.15 * ch} />
          </g>
          {/* colonnes et symboles */}
          <g opacity={1 - ch}>
            {[[COL.f, '#ff5aa8', '♀'], [COL.g, '#4aa0ff', '♂']].map(([x, c, s]) => (
              <g key={s}>
                <rect x={x - 130} y={360} width="260" height="1200" rx="40" fill={c} opacity="0.12" />
                <circle cx={x} cy="330" r="70" fill={c} />
                <text x={x} y="362" textAnchor="middle" fontSize="96" fontWeight="900" fill="#fff" fontFamily="'DejaVu Sans', Arial">{s}</text>
                {NIV.map((y, k) => <rect key={k} x={x - 110} y={y - 6} width="220" height="22" rx="11" fill={c} opacity={0.35 + 0.1 * (4 - k)} />)}
              </g>
            ))}
            {/* flèche de hauteur (« le haut ») */}
            <path d="M540,1520 L540,420" stroke="#c8c0e0" strokeWidth="10" strokeDasharray="20 18" />
            <path d="M510,450 L540,400 L570,450" fill="none" stroke="#c8c0e0" strokeWidth="10" strokeLinecap="round" />
          </g>
          {plat || ch > 0 ? <rect x="100" y={1250} width="880" height="20" rx="10" fill="#8a7ad8" opacity={ch} /> : null}
          {/* les flèches : elles se dessinent, puis se cassent en morceaux */}
          {FLECHES.map((fl, k) => {
            if (plat) return null;
            const prog = Math.min(1, 0.35 + (f - k * 3) / 22);
            if (cs < 0) {
              return (
                <g key={k}>
                  <path d={fl.d} fill="none" stroke={fl.c} strokeWidth="16" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - Math.max(0, prog)} transform={cs > -8 ? `translate(${(random(`sh${k}${f}`) - 0.5) * 10} 0)` : ''} />
                </g>
              );
            }
            // cassée : 6 morceaux qui s'envolent
            return (
              <g key={k}>
                {[...Array(6)].map((_, j) => {
                  const dx = (random(`mx${k}${j}`) - 0.5) * 900;
                  const dy = (random(`my${k}${j}`) - 0.7) * 900;
                  const u = Math.min(1, cs / 22);
                  return (
                    <path key={j} d={fl.d} fill="none" stroke={fl.c} strokeWidth="16" strokeLinecap="round" pathLength="1" strokeDasharray={`0.12 1`} strokeDashoffset={-j / 6}
                      transform={`translate(${dx * u} ${dy * u + 400 * u * u}) rotate(${(random(`mr${k}${j}`) - 0.5) * 300 * u} 540 960)`} opacity={1 - u} />
                  );
                })}
              </g>
            );
          })}
          {/* paillettes à la casse */}
          {cs >= 0 && cs < 30 && [...Array(40)].map((_, j) => {
            const a = random(`pa${j}`) * 6.283;
            const r = (cs / 30) * (200 + 500 * random(`pr${j}`));
            return <circle key={j} cx={540 + Math.cos(a) * r} cy={1000 + Math.sin(a) * r} r={6 + 8 * random(`ps${j}`)} fill={['#ffd23a', '#ff5aa8', '#4aa0ff', '#fff'][j % 4]} opacity={1 - cs / 30} />;
          })}
          {/* les persos */}
          {figs.map((g) => (
            <g key={g.k}>
              <ellipse cx={g.x} cy={g.y + 4} rx={g.s * 140} ry={g.s * 25} fill="#000" opacity="0.2" />
              <Fig x={g.x} y={g.y} s={g.s} {...g.p} />
              {g.moi && !plat && ch < 0.2 && <circle cx={g.x} cy={g.y - 140} r="130" fill="none" stroke="#ffd23a" strokeWidth="8" opacity={0.6 + 0.4 * Math.sin(f / 4)} />}
            </g>
          ))}
        </g>
        <rect width="1080" height="1920" fill="#fff" opacity={cs >= 0 ? interpolate(cs, [0, 2, 8], [0.6, 0.4, 0], clamp) : 0} />
        <Finition f={f} id="scf" vignette={0.7} />
      </svg>
    </AbsoluteFill>
  );
};

// ===================== écrans du téléphone =====================
const AVATARS = [FILLES.ines, FILLES.lea, FILLES.sarah, FILLES.maya, FILLES.boulangere];
const Avatar = ({x, y, r, k}) => (
  <g>
    <defs>
      <clipPath id={`av${k}`}>
        <circle cx={x} cy={y} r={r} />
      </clipPath>
    </defs>
    <circle cx={x} cy={y} r={r} fill={['#ffd8e8', '#d8f0ff', '#fff0c8', '#e8d8ff', '#d8ffe8'][k % 5]} />
    <g clipPath={`url(#av${k})`}>
      <Fig x={x} y={y + 730 * (r / 85) + r * 0.2} s={r / 85} {...AVATARS[k % AVATARS.length]} smile={0.5} />
    </g>
  </g>
);
// appli de rencontre : les « C'est un match ! » qui tombent, compteur qui monte
const EcranMatchs = ({f, n}) => (
  <g>
    <rect x="-255" y="-480" width="510" height="1010" rx="50" fill="#fff4f8" />
    <rect x="-255" y="-480" width="510" height="130" rx="50" fill="#ff4a7a" />
    <path d="M-30,-430 C-30,-460 0,-462 0,-440 C0,-462 30,-460 30,-430 C30,-405 0,-390 0,-380 C0,-390 -30,-405 -30,-430 Z" fill="#fff" />
    <g transform="translate(170 -425)">
      <circle r="44" fill="#ffd23a" />
      <text y="16" textAnchor="middle" fontSize="44" fontWeight="900" fill="#1a1a1a" fontFamily="'DejaVu Sans', Arial">{n}</text>
    </g>
    {[...Array(9)].map((_, k) => {
      const t0 = k * 7;
      const p = spring({frame: f - t0, fps: 30, config: {damping: 12}});
      const y = -300 + k * 110 - Math.max(0, f - 40) * 2.2;
      if (f < t0 || y < -340 || y > 520) return null;
      return (
        <g key={k} transform={`translate(0 ${y}) scale(${p})`}>
          <rect x="-225" y="-48" width="450" height="96" rx="30" fill="#ffffff" stroke="#ffb0c8" strokeWidth="4" />
          <Avatar x={-170} y={0} r={36} k={k} />
          <text x="-115" y="-6" fontSize="30" fontWeight="900" fill="#ff4a7a" fontFamily="'DejaVu Sans', Arial">C'est un match !</text>
          <text x="-115" y="30" fontSize="24" fill="#6a6a7a" fontFamily="'DejaVu Sans', Arial">{['Inès', 'Léa', 'Sarah', 'Maya', 'Chloé', 'Nina', 'Jade', 'Emma', 'Lina'][k]}, 2 km</text>
        </g>
      );
    })}
  </g>
);
// liste des conversations qui défile : elles ont toutes écrit en premier
const EcranListe = ({f}) => (
  <g>
    <rect x="-255" y="-480" width="510" height="1010" rx="50" fill="#121824" />
    <text x="-215" y="-400" fontSize="40" fontWeight="900" fill="#fff" fontFamily="'DejaVu Sans', Arial">Messages</text>
    <g>
      <clipPath id="li-c">
        <rect x="-255" y="-370" width="510" height="900" />
      </clipPath>
    </g>
    <g clipPath="url(#li-c)">
      {[...Array(12)].map((_, k) => {
        const y = -300 + k * 120 - f * 9;
        return (
          <g key={k} transform={`translate(0 ${y})`}>
            <Avatar x={-185} y={0} r={42} k={k} />
            <text x="-125" y="-8" fontSize="30" fontWeight="700" fill="#fff" fontFamily="'DejaVu Sans', Arial">{['Inès', 'Léa', 'Sarah', 'Maya', 'Chloé', 'Nina', 'Jade', 'Emma', 'Lina', 'Zoé', 'Rose', 'Anaïs'][k]}</text>
            <text x="-125" y="28" fontSize="24" fill="#9aa4b4" fontFamily="'DejaVu Sans', Arial">{['coucou', 't’es libre ce soir ?', 'on se voit quand ?', 'salut toi', 'trop mignon ta photo', 'un verre ?'][k % 6]}</text>
            <circle cx="205" cy="0" r="14" fill="#3a8aff" />
          </g>
        );
      })}
    </g>
  </g>
);
// appel entrant, puis visio avec le pote
const EcranAppel = ({f}) => (
  <g>
    <rect x="-255" y="-480" width="510" height="1010" rx="50" fill="#1a2a3a" />
    <circle cx="0" cy="-160" r={120 + 10 * Math.sin(f / 4)} fill="#3ad86a" opacity="0.25" />
    <circle cx="0" cy="-160" r="110" fill="#d8f0ff" />
    <g clipPath="url(#ap-c)">
      <clipPath id="ap-c">
        <circle cx="0" cy="-160" r="110" />
      </clipPath>
      <Fig x={0} y={-160 + 730 * (110 / 85) + 22} s={110 / 85} {...GARS.karim} smile={0.6} />
    </g>
    <text x="0" y="50" textAnchor="middle" fontSize="48" fontWeight="900" fill="#fff" fontFamily="'DejaVu Sans', Arial">Karim</text>
    <text x="0" y="100" textAnchor="middle" fontSize="28" fill="#9ab4c8" fontFamily="'DejaVu Sans', Arial">appel vidéo…</text>
    <circle cx="-130" cy="380" r="58" fill="#ff3a4a" />
    <circle cx="130" cy="380" r={58 + 6 * Math.sin(f / 3)} fill="#3ad86a" />
  </g>
);
const EcranVisio = ({f, parle}) => (
  <g>
    <rect x="-255" y="-480" width="510" height="1010" rx="50" fill="#c8b8e8" />
    <rect x="-255" y="-200" width="510" height="730" fill="#e8d8c8" />
    <rect x="-200" y="-420" width="180" height="260" fill="#ffd23a" opacity="0.6" />
    <Fig x={0} y={1180} s={1.25} {...GARS.karim} smile={0.6 + 0.3 * Math.sin(f / 5)} scream={parle ? 0.25 + 0.25 * Math.abs(Math.sin(f / 2.2)) : 0} eyes={1.2} worry={0.4} epauleD={-150} coudeD={-30 + 20 * Math.sin(f / 3)} />
    <rect x="80" y="-460" width="150" height="220" rx="20" fill="#9ed6bc" stroke="#fff" strokeWidth="5" />
    <g clipPath="url(#vi-moi)">
      <clipPath id="vi-moi">
        <rect x="80" y="-460" width="150" height="220" rx="20" />
      </clipPath>
      <Fig x={155} y={-60} s={0.42} smile={1} eyes={1.2} />
    </g>
  </g>
);
// les notifications de la boulangère qui s'empilent
const EcranNotifs = ({f}) => (
  <g>
    <rect x="-255" y="-480" width="510" height="1010" rx="50" fill="#1a1a2a" />
    {[...Array(10)].map((_, k) => {
      const t0 = k * 5;
      if (f < t0) return null;
      const p = spring({frame: f - t0, fps: 30, config: {damping: 13}});
      return (
        <g key={k} transform={`translate(0 ${-380 + (9 - Math.min(9, Math.floor((f - t0) / 5) + k)) * 0 + k * 92}) scale(${p})`}>
          <rect x="-230" y="-40" width="460" height="80" rx="24" fill="#f4f0ff" opacity="0.95" />
          <circle cx="-180" cy="0" r="24" fill={['#2a8ad8', '#3ad86a', '#ff7a2a', '#8a5aff'][k % 4]} />
          <text x="-140" y="-4" fontSize="22" fontWeight="900" fill="#111" fontFamily="'DejaVu Sans', Arial">{['Tom', 'Karim', 'Hugo', 'Yanis', 'Léo', 'Adam', 'Noah', 'Sami', 'Enzo', 'Max'][k]}</text>
          <text x="-140" y="24" fontSize="20" fill="#444" fontFamily="'DejaVu Sans', Arial">{['salut', 'tu fais quoi ce soir ?', 'super ton pain !', 'un café ?'][k % 4]}</text>
        </g>
      );
    })}
    <g transform="translate(170 -440)">
      <circle r="34" fill="#ff3a4a" />
      <text y="12" textAnchor="middle" fontSize="34" fontWeight="900" fill="#fff" fontFamily="'DejaVu Sans', Arial">47</text>
    </g>
  </g>
);

// ===================== les scènes =====================
const scene = (nom, rendu) => {
  const C = () => {
    const f = useCurrentFrame();
    const {i, t, d, bornes} = decoupe(nom, f);
    return rendu({f, fg: START[nom] + f, i, t, d, bornes, R: (mot, def) => repere(nom, mot, def)});
  };
  C.displayName = nom;
  return C;
};

// 1. Le schéma : les flèches se cassent, tout le monde tombe sur la même ligne.
const SchemaS = scene('schema', ({f, R}) => <Schema f={f} casse={R('disparaisse', 35)} chute={R('lendemain', 64) - 12} />);

// 2. Tu te réveilles : 47 matchs pendant la nuit. Tu sautes du lit.
const PL = {x: -300, z: 2.1};
const Matchs = scene('matchs', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const n = Math.min(47, Math.max(0, Math.round(interpolate(f, [R('ouvres', 34), R('quarante-sept', 72) + 10], [0, 47], clamp))));
  if (i === 0) {
    // vu d'au-dessus : il dort, le téléphone s'allume, il ouvre les yeux
    const o = interpolate(f, [R('réveilles', 11), R('réveilles', 11) + 6], [0, 1.15], clamp);
    return (
      <AbsoluteFill style={{background: '#000'}}>
        <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
          <g transform={`translate(540 900) scale(${1.15 + 0.1 * k}) translate(-540 -900)`}>
            <rect width="1080" height="1920" fill="#5ab0e8" />
            {[...Array(12)].map((_, j) => <rect key={j} x="0" y={j * 170} width="1080" height="80" fill="#4a98d0" opacity="0.5" />)}
            <rect x="140" y="260" width="800" height="380" rx="80" fill="#fff8f0" />
            <g transform="translate(540 1420) scale(1.6) translate(-300 -600)">
              <Bonhomme eyes={o} smile={o > 0.5 ? 0.3 : 0} breath={Math.sin(fg / 8) * 3} epauleD={-150} coudeD={-60} />
            </g>
            <path d="M40,1120 Q540,1050 1040,1120 L1080,1920 L0,1920 Z" fill="#ff8a6a" />
            <path d="M40,1120 Q540,1050 1040,1120" stroke="#ffd23a" strokeWidth="18" fill="none" />
            {/* le téléphone dans sa main, qui s'allume */}
            <g transform="translate(760 520) rotate(-12)">
              <rect x="-70" y="-130" width="140" height="260" rx="22" fill="#111" />
              <rect x="-60" y="-120" width="120" height="240" rx="16" fill="#ff4a7a" opacity={interpolate(f, [4, 10], [0.2, 1], clamp)} />
            </g>
            <circle cx="760" cy="520" r="300" fill="#ff8ab0" opacity={0.25 * interpolate(f, [4, 10], [0, 1], clamp)} />
          </g>
          <rect width="1080" height="1920" fill="#fff4c8" opacity="0.15" />
          <Finition f={fg} id="mf" vignette={0.6} />
        </svg>
      </AbsoluteFill>
    );
  }
  const cam = makeCam(i === 1 ? vise([400, -380, 0.6], [-300, -250, 3.5]) : vise([700 - 200 * k, -420, 0.3], [-350, -180, 3.0]));
  const decor = chambreJour(cam, fg);
  if (i === 1) {
    return (
      <Plan f={fg} cam={cam} decor={decor} items={[]} noir={0} zoom={1.0}
        dessus={<g><rect width="1080" height="1920" fill="#000" opacity="0.35" /><Telephone f={f} heure="09:12" barres={4} ecran={<EcranMatchs f={f - R('ouvres', 34)} n={n} />} echelle={1.2 + 0.15 * k} y={980} vibre={f > R('quarante-sept', 72) && f < R('quarante-sept', 72) + 15 ? 0.6 : 0} /></g>} />
    );
  }
  // il saute de joie à côté du lit
  const saut = Math.max(0, Math.sin(Math.min(Math.PI, (t / 14) * Math.PI))) * -260 + (t > 14 ? Math.max(0, Math.sin(((t - 14) / 12) * Math.PI)) * -120 : 0);
  return (
    <Plan f={fg} cam={cam} decor={decor} noir={0} zoom={doux(t)} roll={-2}
      items={[{z: PL.z, x: PL.x, el: <Perso cam={cam} id="ma2" x={PL.x} z={PL.z} lum={1} teinte={CHAUD} lift={saut} legG={saut < -50 ? 0.8 : 0} legD={saut < -50 ? 0.5 : 0} smile={1} eyes={1.25} epauleG={150} coudeG={20} epauleD={-150} coudeD={-20} />}]} />
  );
});

// 3. Elles t'écrivent toutes en premier. « T'es libre ce soir ? »
const Messages = scene('messages', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const cam = makeCam(vise([-200, -380, 0.8], [-300, -250, 4]));
  const decor = chambreJour(cam, fg);
  const tel = i === 0 ? (
    <Telephone f={f} heure="09:13" barres={4} ecran={<EcranListe f={f} />} echelle={1.2} y={980} />
  ) : (
    <Telephone f={f} heure="09:13" barres={4} nom="Inès" initiale="I" messages={[{debut: R('tes', 74), texte: 'T’es libre ce soir ?', gras: true}]} echelle={1.3 + 0.35 * k} y={960 - (1.3 + 0.35 * k) * 330} />
  );
  return <Plan f={fg} cam={cam} decor={decor} noir={0} zoom={1} dessus={<g><rect width="1080" height="1920" fill="#000" opacity="0.4" />{tel}</g>} />;
});

// 4. Dans la rue : une fille se retourne sur toi. Puis une deuxième, qui te sourit.
const Rue = scene('rue', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const zMoi = interpolate(fg, [START.rue, START.rue + timeline.scenes.find((s) => s.nom === 'rue').frames], [14, 9.5]);
  const m = marche(fg, 0.32, 0.8);
  const moi = {x: -850, z: zMoi, id: 'moi', lift: m.bob, legG: m.legG, legD: m.legD, smile: 0.7, eyes: 1.1, teinte: JOUR, epauleG: 8 + m.bras, coudeG: 20, epauleD: -8 + m.bras, coudeD: -20};
  const zIn = interpolate(fg, [START.rue + R('une', 59) - 30, START.rue + R('puis', 103)], [11, 15.5]);
  const seRetourne = f > R('retourne', 77) + 2;
  const mi = marche(fg + 7, 0.32, seRetourne ? 0.3 : 0.8);
  const ines = {...FILLES.ines, x: -600, z: zIn, id: 'in', dos: !seRetourne, lift: mi.bob, legG: mi.legG, legD: mi.legD, smile: seRetourne ? 0.6 : 0, blush: seRetourne ? 0.4 : 0, eyes: 1.1, teinte: JOUR};
  const sourit = interpolate(f, [R('sourit', 146) - 8, R('sourit', 146) + 4], [0.2, 1], clamp);
  const lea = {...FILLES.lea, x: -500, z: 9.3, id: 'le', smile: sourit, blush: 0.5 * sourit, eyes: 1.15, teinte: JOUR, epauleD: -150 * sourit, coudeD: -30 + 25 * Math.sin(f / 3) * sourit};
  const cams = [
    () => vise([100, -500, zMoi - 2.8], [-850, -260, zMoi]),
    () => vise([-280, -420, 10.0 + 0.3 * k], [-750, -250, 14.5]),
    () => camFace(lea.x, lea.z, -1, 0.75, t, d, {dx: -40, dy: -20, push: 0.1}),
  ];
  const cam = makeCam(cams[i]());
  const passants = i === 2 ? [lea] : i === 1 ? [moi, ines] : [moi, ines];
  const decor = rueJour(cam, fg, {passants: passants.map((p) => ({...p, dos: p.dos ?? false}))});
  return <Plan f={fg} cam={cam} decor={decor} noir={0} zoom={doux(t)} roll={[1.5, -1.5, 1][i]} />;
});

// 5. La boulangère te glisse son numéro avec ta baguette. Gratuite, la baguette.
const NumeroInsert = ({f, t, d}) => {
  const k = lisse(t, d);
  const glisse = interpolate(t, [4, 22], [260, 0], {...clamp, easing: Easing.out(Easing.cubic)});
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <defs>
          <radialGradient id="nu-f" cx="50%" cy="40%" r="70%">
            <stop offset="0" stopColor="#ffe8c0" />
            <stop offset="1" stopColor="#c8904a" />
          </radialGradient>
        </defs>
        <g transform={`translate(540 960) scale(${1.05 + 0.08 * k}) translate(-540 -960)`}>
          <rect width="1080" height="1920" fill="url(#nu-f)" />
          {/* le comptoir en bois */}
          <rect y="1250" width="1080" height="670" fill="#8a5a3a" />
          {[...Array(6)].map((_, j) => <rect key={j} y={1290 + j * 110} width="1080" height="8" fill="#6a4228" />)}
          {/* le sachet en papier et la baguette */}
          <path d="M300,1350 L780,1350 L740,700 L340,700 Z" fill="#e8d0a8" />
          <path d="M340,700 L740,700 L720,760 L360,760 Z" fill="#d8b888" />
          <rect x="455" y="280" width="170" height="760" rx="85" fill="#d8903a" transform="rotate(8 540 660)" />
          {[0, 1, 2, 3].map((j) => <path key={j} d={`M490,${380 + j * 140} q50,-30 100,0`} stroke="#b06a20" strokeWidth="14" fill="none" transform="rotate(8 540 660)" />)}
          {/* le petit papier avec son numéro, glissé contre le sachet */}
          <g transform={`translate(${560 + glisse} 1010) rotate(-8)`}>
            <rect x="-170" y="-90" width="340" height="180" rx="10" fill="#fffef4" />
            <text x="0" y="-10" textAnchor="middle" fontSize="44" fontWeight="700" fill="#2a2a6a" fontFamily="'DejaVu Sans', Arial">06 •• •• 47</text>
            <path d="M-20,40 C-20,22 0,20 0,34 C0,20 20,22 20,40 C20,56 0,66 0,74 C0,66 -20,56 -20,40 Z" fill="#ff4a7a" />
          </g>
          {/* sa main */}
          <g transform={`translate(${800 + glisse} 1080)`}>
            <ellipse cx="0" cy="0" rx="90" ry="60" fill="#e8b48c" />
            <rect x="40" y="-40" width="300" height="90" rx="40" fill="#ffffff" />
          </g>
        </g>
        <Finition f={f} id="nuf" vignette={0.55} />
      </svg>
    </AbsoluteFill>
  );
};
const PB = {x: 0, z: 2.3}; // toi devant le comptoir
const PBG = {x: 100, z: 3.95}; // la boulangère derrière
const Boulangerie = scene('boulangerie', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  if (i === 1) return <NumeroInsert f={fg} t={t} d={d} />;
  const cams = [
    () => vise([-950 + 150 * k, -480, 0.6 + 0.2 * k], [100, -200, 3.4]),
    null,
    () => camFace(PBG.x, PBG.z, -1, 0.7, t, d, {dx: 60, dy: -10, push: 0.12}),
  ];
  const cam = makeCam(cams[i]());
  const decor = boulangerieInt(cam, fg);
  const items = [
    {z: PBG.z, x: PBG.x, el: <Perso cam={cam} id={`bg${i}`} x={PBG.x} z={PBG.z} lum={1} teinte={CHAUD} {...FILLES.boulangere} smile={i === 2 ? 1 : 0.6} blush={0.5} eyes={i === 2 ? 0.55 : 1.1} epauleD={i === 0 ? -60 : 0} coudeD={i === 0 ? -40 : 0} />},
  ];
  if (i === 0) items.push({z: PB.z, x: PB.x, el: <Perso cam={cam} id="bm0" x={PB.x} z={PB.z} dos lum={1} teinte={CHAUD} />});
  return <Plan f={fg} cam={cam} decor={decor} items={items} noir={0} zoom={doux(t)} roll={[1, 0, -1.5][i]} />;
});

// 6. Le gars en débardeur pose devant le miroir. Personne le regarde.
const GARS_SALLE = {x: -2700, z: 15, ...GARS.muscle, dos: true, smile: 0.8, epauleG: 40, coudeG: 110, epauleD: -40, coudeD: -110, teinte: [0.95, 1, 1.08]};
const Salle = scene('salle', ({f, fg, i, t, d}) => {
  const k = lisse(t, d);
  const zMoi = interpolate(fg, [START.salle, START.salle + timeline.scenes.find((s) => s.nom === 'salle').frames], [12.5, 17.5]);
  const m = marche(fg, 0.32, 0.8);
  const flex = Math.sin(fg / 6) * 10;
  const gars = {...GARS_SALLE, epauleG: 40 + flex, epauleD: -40 - flex};
  const cams = [
    () => vise([-280, -460, 10.2 + 0.6 * k], [-1350, -250, 15.5]),
    () => vise([-1420, -320, 14.8 + 0.25 * k], [-3300, -300, 15.0]),
    () => camFace(-850, zMoi, 1, 0.7, t, d, {dx: -50, dy: -10, push: 0.1}),
  ];
  const cam = makeCam(cams[i]());
  const moi = {x: -850, z: zMoi, id: 'sm', dos: cam.z < zMoi, lift: m.bob, legG: m.legG, legD: m.legD, smile: i === 2 ? 0.9 : 0.6, eyes: 1.1, pupilX: i === 2 ? -8 : 0, teinte: JOUR};
  const decor = rueJour(cam, fg, {salle: {gars}, passants: i === 1 ? [] : [moi]});
  return <Plan f={fg} cam={cam} decor={decor} noir={0} zoom={doux(t)} roll={[-1.5, 0, 1.5][i]} />;
});

// 7. Dans le bus, une fille s'assoit à côté de toi. Vous rigolez tout le trajet.
const RANG = 4.2;
const ASSIS = SOL - 20; // assis : le bas du corps est caché par le dossier de devant
const Bus = scene('bus', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const assise = i === 0 ? interpolate(f, [R('sassoit', 43) - 14, R('sassoit', 43) + 4], [0, 1], ease) : 1;
  const sx = interpolate(assise, [0, 0.6, 1], [-120, -440, -440]);
  const sz = interpolate(assise, [0, 0.6, 1], [5.9, RANG + 0.25, RANG + 0.25]);
  const sy = interpolate(assise, [0, 0.6, 1], [SOL, SOL, ASSIS]);
  const rit = f > R('rigolez', 124) - 4 || i === 2;
  const rire = rit ? 0.5 + 0.5 * Math.abs(Math.sin(fg / 3)) : 0;
  const cams = [
    () => vise([-380 + 60 * k, -330, 7.0], [-560, -80, RANG]),
    () => vise([-630, -330, 6.55], [-630, -150, RANG]),
    () => vise([-150 - 100 * k, -260, 6.4], [-660, -60, RANG]),
  ];
  const cam = makeCam({...cams[i](), roll: 0});
  const decor = busInt(cam, fg, {vitesse: 0.06});
  const moi = <Perso cam={cam} id={`bu${i}`} x={-820} z={RANG + 0.25} y={ASSIS} lum={1} teinte={JOUR} smile={0.5 + 0.5 * rire} eyes={rit ? 0.7 : 1.1} pupilX={i < 2 ? 8 : 0} scream={rit ? 0.3 * rire : 0} />;
  const elle = <Perso cam={cam} id={`bf${i}`} x={sx} z={sz} y={sy} lum={1} teinte={JOUR} {...FILLES.sarah} smile={i === 1 ? 0.8 : 0.5 + 0.5 * rire} eyes={rit ? 0.7 : 1.1} pupilX={-8} scream={rit ? 0.3 * rire : 0} />;
  const items = [{z: RANG + 0.25, x: -820, el: moi}, {z: sz, x: sx, el: elle}];
  // le fil des écouteurs partagés
  if (assise > 0.95 && f > R('écoutes', 103) - 10) {
    const a = cam.proj(-820 + 54, ASSIS - 560, RANG + 0.25);
    const b = cam.proj(-440 - 54, ASSIS - 560, RANG + 0.25);
    const c = cam.proj(-630, ASSIS - 250, RANG + 0.2);
    items.push({z: RANG + 0.1, x: -630, el: <g key="fil"><path d={`M${a[0]},${a[1]} Q${c[0]},${c[1] + 80} ${b[0]},${b[1]}`} stroke="#ffffff" strokeWidth="5" fill="none" /><circle cx={a[0]} cy={a[1]} r="9" fill="#fff" /><circle cx={b[0]} cy={b[1]} r="9" fill="#fff" /></g>});
  }
  return <Plan f={fg} cam={cam} decor={decor} items={items} noir={0} zoom={(i === 1 ? 1.55 : i === 2 ? 1.15 : 1) * doux(t)} roll={Math.sin(fg / 25) * 1.2} />;
});

// 8. À une soirée, tu racontes une blague nulle. Tout le monde rigole. Même toi, t'y crois pas.
const PS = {x: -250, z: 3.2};
const INVITES = [
  {x: -850, z: 3.7, ...FILLES.maya, id: 'i1'},
  {x: 350, z: 3.9, ...FILLES.ines, id: 'i2'},
  {x: -560, z: 4.6, ...GARS.tom, id: 'i3'},
  {x: 720, z: 3.1, ...GARS.karim, id: 'i4'},
  {x: 60, z: 4.8, ...FILLES.lea, id: 'i5'},
];
const Soiree = scene('soiree', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const rit = f > R('tout', 92) - 2;
  const cams = [
    () => vise([200 - 150 * k, -480, 0.7 + 0.3 * k], [-250, -220, 3.8]),
    () => camFace(PS.x, PS.z, -1, 0.75, t, d, {dx: 40, dy: -10, push: 0.1}),
    () => vise([900 - 100 * k, -360, 1.4], [-200, -250, 4.0]),
    () => camFace(PS.x, PS.z, -1, 0.55, t, d, {dx: -30, dy: -20, push: 0.08}),
  ];
  const cam = makeCam(cams[i]());
  const decor = appart(cam, fg, {lampes: 1.1, tv: 0.6});
  const items = [];
  // lumières de fête qui tournent sur les murs
  for (let j = 0; j < 6; j++) {
    const a = fg / 22 + j;
    items.push({z: 5.6, x: Math.cos(a) * 1200, y: -300, el: halo(cam, Math.cos(a) * 1200, -350 + Math.sin(a * 1.3) * 200, 5.8, 900, `vi-fete${j % 5}`, 0.55, `fe${j}`)});
  }
  INVITES.forEach((g, j) => {
    const r = rit ? Math.abs(Math.sin(fg / 3 + j)) : 0;
    const dz = rit ? 0 : Math.sin(fg / 5 + j) * 20;
    items.push({z: g.z, x: g.x, el: <Perso cam={cam} key={g.id} lum={1} teinte={CHAUD} {...g} id={`${g.id}${i}`} lift={rit ? -r * 30 : dz} smile={rit ? 0.8 + 0.2 * r : 0.4} eyes={rit ? 0.6 : 1.05} scream={rit ? 0.2 * r : 0} epauleG={rit ? 20 : 8} coudeG={rit ? 120 : 20} epauleD={rit ? -20 : -8} coudeD={rit ? -120 : -20} />});
  });
  const fier = i === 3;
  items.push({z: PS.z, x: PS.x, el: <Perso cam={cam} id={`so${i}`} x={PS.x} z={PS.z} lum={1} teinte={CHAUD} smile={rit ? 1 : 0.6} eyes={fier ? 1.45 : 1.1} scream={i === 1 ? 0.2 + 0.2 * Math.abs(Math.sin(fg / 2.5)) : 0} epauleD={i === 1 ? -60 : 0} coudeD={i === 1 ? -60 + 20 * Math.sin(fg / 4) : 0} blush={fier ? 0.6 : 0} />});
  return <Plan f={fg} cam={cam} decor={decor} items={items} noir={0} zoom={doux(t)} roll={[1, -1.5, 2, 0][i]} dessus={<rect width="1080" height="1920" fill={['#ff4a8a', '#4ad8ff', '#ffd23a'][Math.floor(fg / 10) % 3]} opacity="0.06" />} />;
});

// 9. Ton pote t'appelle : « Frère, il se passe quoi ? Moi aussi, j'ai trois rencards demain. »
const Pote = scene('pote', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const cam = makeCam(i === 2 ? camFace(PL.x, PL.z, -1, 0.7, t, d, {dx: 40, dy: -10}) : vise([-200, -380, 0.8], [-300, -250, 4]));
  const decor = chambreJour(cam, fg);
  if (i === 2) {
    const r = Math.abs(Math.sin(fg / 3));
    return <Plan f={fg} cam={cam} decor={decor} noir={0} zoom={doux(t)} roll={1.5} items={[{z: PL.z, x: PL.x, el: <Perso cam={cam} id="pt2" x={PL.x} z={PL.z} lum={1} teinte={CHAUD} smile={1} eyes={0.65} scream={0.25 * r} lift={-r * 20} epauleD={-150} coudeD={-60} />}]} />;
  }
  const tel = i === 0 ? <Telephone f={f} heure="18:40" barres={4} ecran={<EcranAppel f={f} />} echelle={1.2} y={980} vibre={0.5} /> : <Telephone f={f} heure="18:40" barres={4} ecran={<EcranVisio f={f} parle={f > R('frère', 38) - 4} />} echelle={1.25 + 0.1 * k} y={980} />;
  return <Plan f={fg} cam={cam} decor={decor} noir={0} zoom={1} dessus={<g><rect width="1080" height="1920" fill="#000" opacity="0.35" />{tel}</g>} />;
});

// 10. Sauf que tout le monde a le choix. La boulangère aussi reçoit 47 messages par nuit.
const Revers = scene('revers', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const fige = f > R('choix', 51) - 4;
  const moiFace = (dy = 0) => {
    const cam = makeCam(camFace(-850, 9.5, -1, 0.75, t, d, {dx: 30, dy: -10 + dy, push: 0.06}));
    const decor = rueJour(cam, fg, {passants: [{x: -850, z: 9.5, id: `rv${dy}`, smile: fige ? 0 : 1, eyes: fige ? 1.5 : 1.1, worry: fige ? 1 : 0, sweat: fige ? 1 : 0, teinte: JOUR, epauleG: fige ? 8 : -20, coudeG: fige ? 15 : -120, epauleD: fige ? -8 : 20, coudeD: fige ? -15 : 120}]});
    return <Plan f={fg} cam={cam} decor={decor} noir={0} zoom={doux(t)} roll={fige ? 0 : 1} />;
  };
  if (i === 0) return moiFace();
  const camB = makeCam(camFace(PBG.x, PBG.z, -1, 0.95, t, d, {dx: -120, dy: 60, push: 0.05}));
  const decorB = boulangerieInt(camB, fg);
  const elle = <Perso cam={camB} id="rvb" x={PBG.x} z={PBG.z} lum={1} teinte={CHAUD} {...FILLES.boulangere} smile={0.5} eyes={1.25} pupilY={8} epauleD={-40} coudeD={-90} />;
  return (
    <AbsoluteFill style={{background: '#fff'}}>
      <AbsoluteFill style={{clipPath: 'inset(420px 0 540px 0)', transform: 'translateY(-420px)'}}>{moiFace(0)}</AbsoluteFill>
      <AbsoluteFill style={{clipPath: 'inset(420px 0 540px 0)', transform: 'translateY(540px)'}}>
        <Plan f={fg} cam={camB} decor={decorB} items={[{z: PBG.z, x: PBG.x, el: elle}]} noir={0} zoom={1} dessus={<Telephone f={f} heure="23:58" barres={4} ecran={<EcranNotifs f={f} />} echelle={0.5 + 0.04 * k} x={820} y={1080} />} />
      </AbsoluteFill>
      <div style={{position: 'absolute', left: 0, top: 952, width: 1080, height: 16, background: '#ffffff'}} />
    </AbsoluteFill>
  );
});

// 11. Plus de schéma derrière lequel te cacher. Juste toi, et tes blagues nulles.
const Toi = scene('toi', ({f}) => <Schema f={f + 40} plat gratte />);

// 12. Tu dis oui à tout le monde ? Ou tu retournes voir la boulangère ?
const Dilemme = scene('dilemme', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const zMoi = 11.6;
  const mi = marche(fg, 0.3, 0.8);
  const passants = [
    {x: -850, z: zMoi, id: 'dm', smile: 0.7, eyes: 1.15, pupilX: Math.sin(fg / 12) * 9, teinte: JOUR, epauleD: i === 1 ? -150 : 0, coudeD: i === 1 ? -30 + 15 * Math.sin(fg / 3) : 0},
    {...FILLES.maya, x: -450, z: interpolate(fg, [START.dilemme, START.dilemme + 160], [15, 12.4]), id: 'dp1', lift: mi.bob, legG: mi.legG, legD: mi.legD, smile: 0.7, blush: 0.4, epauleD: -150, coudeD: -30 + 25 * Math.sin(fg / 3), teinte: JOUR},
    {...FILLES.lea, x: -1150, z: 13.4, id: 'dp2', smile: 0.8, blush: 0.4, teinte: JOUR},
  ];
  const cams = [
    () => vise([-250 - 60 * k, -430, 9.7 + 0.3 * k], [-850, -250, 11.6]),
    () => vise([-300, -330, 9.5 + 0.3 * k], [-950, -230, 11.8]),
  ];
  const cam = makeCam(cams[i]());
  const decor = rueJour(cam, fg, {passants, boulangere: {...FILLES.boulangere, smile: 0.8, epauleD: -150, coudeD: -30 + 25 * Math.sin(fg / 3)}});
  const dis = R('dis-le', 107);
  return (
    <Plan f={fg} cam={cam} decor={decor} noir={0} zoom={doux(t)} roll={[1, -1][i]}
      dessus={
        <g>
          <Choix f={f} debut={R('oui', 29)} x={540} y={250} texte="OUI À TOUT" emoji="1f60e" couleur="#ffd23a" />
          <Choix f={f} debut={R('boulangère', 84) - 4} x={540} y={450} texte="LA BOULANGÈRE" emoji="1f956" couleur="#ff5aa8" />
          {f >= dis && (
            <g transform={`translate(540 1700) scale(${spring({frame: f - dis, fps: 30, config: {damping: 10}})})`}>
              <rect x="-400" y="-70" width="800" height="140" rx="70" fill="#fff" />
              <image href={staticFile('emoji/1f4ac.svg')} x="-370" y="-48" width="96" height="96" />
              <text x="40" y="18" textAnchor="middle" fontFamily="'DejaVu Sans', Arial, sans-serif" fontWeight="900" fontSize="46" fill="#111">
                DIS-LE EN COMMENTAIRE
              </text>
            </g>
          )}
        </g>
      }
    />
  );
});

const COMPOSANTS = {schema: SchemaS, matchs: Matchs, messages: Messages, rue: Rue, boulangerie: Boulangerie, salle: Salle, bus: Bus, soiree: Soiree, pote: Pote, revers: Revers, toi: Toi, dilemme: Dilemme};
export const Hypergamie = () => (
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
