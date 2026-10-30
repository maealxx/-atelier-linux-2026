import {createContext, useContext} from 'react';
import {AbsoluteFill, Easing, interpolate, random, Series, spring, useCurrentFrame} from 'remotion';
import {montage} from './montage';
import {Finition} from './moteur';
import {BulleCommentaire, ChoixBoite, DefsFlou} from './WhatIf';
import {ikBras, mainRond, Rond} from './Rond';
import PLANS from './hopital/plans.json';
import timeline from './hopital/timeline.json';

// « Et si l'apocalypse zombie commençait pendant que t'es à l'hôpital ? » — style des vidéos « What if » :
// décors illustrés 2D (dégradés lisses, lumière douce), persos à grosse tête ronde vus de 3/4, zombies-silhouettes
// aux yeux qui brillent, couloir en perspective dessinée, carte d'identité du perso, plans courts (1 à 1,5 s).
const {decoupe, repere, SCENES} = montage(timeline, PLANS);
export const DUREE_HOPITAL = SCENES.reduce((t, [, d]) => t + d, 0);
const START = {};
SCENES.reduce((t, [nom, d]) => {
  START[nom] = t;
  return t + d;
}, 0);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const ease = (f, a, b, e = Easing.inOut(Easing.cubic)) => interpolate(f, [a, b], [0, 1], {...clamp, easing: e});
const lisse = (t, d) => Easing.inOut(Easing.sin)(Math.min(1, t / Math.max(1, d)));
const lerp = (a, b, u) => a + (b - a) * u;
const tremble = (f, k, c) => k * (random(`${c}${f}`) - 0.5);
const pop = (f, t0) => (f < t0 ? 0 : spring({frame: f - t0, fps: 30, config: {damping: 11, stiffness: 170}}));
const punchZ = (t, fort = 0.1) => interpolate(t, [0, 7], [1 + fort, 1], {...clamp, easing: Easing.out(Easing.cubic)});
const POLICE = "'AntonB', 'DejaVu Sans', sans-serif";
const TXT = "'DejaVu Sans', sans-serif";

// ===================== caméra 2D : centre visé, zoom, roulis + calques en parallaxe =====================
const CtxV = createContext({x: 540, y: 960, z: 1});
const Vue = ({x = 540, y = 960, z = 1, r = 0, children}) => (
  <CtxV.Provider value={{x, y, z}}>
    <g transform={`translate(540 960) rotate(${r}) scale(${z}) translate(${-x} ${-y})`}>{children}</g>
  </CtxV.Provider>
);
// p < 1 : arrière-plan (bouge moins), p > 1 : premier plan (bouge plus)
const Calque = ({p = 1, children}) => {
  const c = useContext(CtxV);
  return <g transform={`translate(${(c.x - 540) * (1 - p)} ${(c.y - 960) * (1 - p)})`}>{children}</g>;
};

const DefsHop = ({flou}) => (
  <defs>
    <filter id="hp-flou" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="10" />
    </filter>
    <filter id="hp-flou2" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="28" />
    </filter>
    <filter id="hp-ombre" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="9" />
    </filter>
    {flou && (
      <filter id="hp-bouge" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation={`${flou[0]} ${flou[1]}`} />
      </filter>
    )}
  </defs>
);
// image finale : décor + étalonnage rouge (alarme) + habillage + grain/vignette
const Ecran = ({fg, children, dessus = null, rouge = 0, teinte = null, vignette = 0.6, flou = null, fond = '#000'}) => {
  const pulse = 0.5 + 0.5 * Math.sin(fg / 4.5);
  return (
    <AbsoluteFill style={{background: fond}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <DefsFlou />
        <DefsHop flou={flou} />
        <g filter={flou ? 'url(#hp-bouge)' : undefined}>{children}</g>
        {rouge > 0 && (
          <g>
            <rect width="1080" height="1920" fill="#ff2418" opacity={0.72 * rouge} style={{mixBlendMode: 'multiply'}} />
            <rect width="1080" height="1920" fill="#ff3a2a" opacity={0.07 * rouge * pulse} style={{mixBlendMode: 'screen'}} />
            <rect width="1080" height="1920" fill="#000" opacity={0.18 * rouge * (1 - pulse)} />
          </g>
        )}
        {teinte && <rect width="1080" height="1920" fill={teinte[0]} opacity={teinte[1]} style={{mixBlendMode: 'multiply'}} />}
        {dessus}
        <Finition f={fg} id="hpf" grain={0.03} vignette={vignette} />
      </svg>
    </AbsoluteFill>
  );
};
const scene = (nom, rendu) => {
  const C = () => {
    const f = useCurrentFrame();
    const {i, t, d} = decoupe(nom, f);
    return rendu({f, fg: START[nom] + f, i, t, d, k: lisse(t, d), R: (mot, def) => repere(nom, mot, def)});
  };
  C.displayName = nom;
  return C;
};

// ---------- habillage ----------
// carte d'identité du perso (en haut à gauche), comme dans les vidéos « What if »
const Carte = ({f, t0, nom, sous, x = 60, y = 230}) => {
  const u = ease(f, t0, t0 + 9, Easing.out(Easing.back(1.4)));
  if (f < t0) return null;
  return (
    <g transform={`translate(${x - 760 * (1 - u)} ${y})`}>
      <rect x="6" y="10" width="700" height="168" rx="28" fill="#000" opacity="0.35" filter="url(#hp-ombre)" />
      <rect width="700" height="168" rx="28" fill="#ffffff" />
      <rect width="22" height="168" rx="11" fill="#ff3a3a" />
      <text x="56" y="82" fontFamily={POLICE} fontSize="74" fill="#141218" letterSpacing="2">{nom}</text>
      <text x="58" y="134" fontFamily={TXT} fontWeight="800" fontSize="31" fill="#6a7080" letterSpacing="1">{sous}</text>
    </g>
  );
};
const Puce = ({f, t0, txt, x = 540, y = 250, fond = '#141218', coul = '#ffffff', taille = 54}) => {
  const u = pop(f, t0);
  if (f < t0) return null;
  const w = txt.length * taille * 0.5 + 80;
  return (
    <g transform={`translate(${x} ${y}) scale(${u})`}>
      <rect x={-w / 2} y={-taille * 0.85} width={w} height={taille * 1.5} rx={taille * 0.4} fill={fond} opacity="0.92" />
      <text y={taille * 0.27} textAnchor="middle" fontFamily={POLICE} fontSize={taille} fill={coul} letterSpacing="3">{txt}</text>
    </g>
  );
};
const BPM = ({f, v, op = 1, y = 250}) => {
  const bat = Math.max(0, Math.sin((f / 30) * (v / 60) * Math.PI)) ** 6;
  return (
    <g transform={`translate(540 ${y})`} opacity={op}>
      <rect x="-200" y="-56" width="400" height="112" rx="56" fill="#160c12" opacity="0.92" stroke="#ff4a3a" strokeWidth="5" />
      <path transform={`translate(-140 0) scale(${1 + 0.18 * bat})`} d="M0,26 C-46,-6 -40,-40 -16,-40 C-6,-40 0,-32 0,-24 C0,-32 6,-40 16,-40 C40,-40 46,-6 0,26 Z" fill="#ff4a3a" />
      <text x="-90" y="22" fontFamily={POLICE} fontSize="64" fill="#ffffff">{Math.round(v)}</text>
      <text x="20" y="22" fontFamily={TXT} fontWeight="800" fontSize="20" fill="#ff8a7a">BPM</text>
      <polyline points={[...Array(24)].map((_, j) => {
        const u = j / 23;
        const p = (((u * 2 - f / 12) % 1) + 1) % 1;
        return `${70 + 110 * u},${p > 0.4 && p < 0.47 ? -26 : p > 0.47 && p < 0.52 ? 18 : 0}`;
      }).join(' ')} fill="none" stroke="#ff4a3a" strokeWidth="4" strokeLinejoin="round" />
    </g>
  );
};
// tracé ECG réaliste (onde P, QRS, onde T)
const ecg = (ph0) => {
  const ph = ((ph0 % 1) + 1) % 1;
  if (ph < 0.1) return -7 * Math.sin((ph / 0.1) * Math.PI);
  if (ph > 0.17 && ph < 0.19) return 9;
  if (ph >= 0.19 && ph < 0.22) return -62;
  if (ph >= 0.22 && ph < 0.25) return 26;
  if (ph > 0.38 && ph < 0.56) return -13 * Math.sin(((ph - 0.38) / 0.18) * Math.PI);
  return 0;
};
const pleth = (ph0) => {
  const ph = ((ph0 % 1) + 1) % 1;
  return -Math.max(0, Math.sin(ph * Math.PI * 1.6)) * 30 - (ph > 0.62 ? 6 * Math.sin(((ph - 0.62) / 0.38) * Math.PI) : 0);
};
// le moniteur de chevet (ECG vert, pléthysmographie bleue, chiffres)
const Moniteur = ({x, y, fg, bpm = 72, spo2 = 98, plat = false, alarme = false}) => {
  const W = 248;
  const tr = (fn, yy, amp, col, k) => [...Array(60)].map((_, j) => {
    const u = j / 59;
    const v = plat ? 0 : fn(u * 2.6 * (bpm / 72) - (fg / 30) * (bpm / 60)) * amp;
    return `${(16 + u * 160).toFixed(1)},${(yy + v).toFixed(1)}`;
  }).join(' ');
  const cl = alarme && Math.floor(fg / 6) % 2 === 0;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-14" y="-14" width={W + 28} height="228" rx="22" fill="#262b36" />
      <rect x="-14" y="-14" width={W + 28} height="40" rx="20" fill="#ffffff" opacity="0.08" />
      <rect width={W} height="200" rx="10" fill="#04080b" />
      <rect width={W} height="200" rx="10" fill="none" stroke={cl ? '#ff3a3a' : '#1a2a30'} strokeWidth={cl ? 8 : 3} />
      <polyline points={tr(ecg, 62, 0.9, '#3aff7a')} fill="none" stroke={plat ? '#ff4a4a' : '#3aff7a'} strokeWidth="3.5" strokeLinejoin="round" />
      <polyline points={tr(pleth, 150, 1, '#3ac8ff')} fill="none" stroke="#3ac8ff" strokeWidth="3" strokeLinejoin="round" opacity={plat ? 0.3 : 1} />
      <text x="16" y="22" fontFamily={TXT} fontWeight="800" fontSize="13" fill="#3aff7a">ECG II</text>
      <text x="16" y="112" fontFamily={TXT} fontWeight="800" fontSize="13" fill="#3ac8ff">PLETH</text>
      <text x="186" y="30" fontFamily={TXT} fontWeight="800" fontSize="13" fill="#3aff7a">HR</text>
      <text x={W - 8} y="82" textAnchor="end" fontFamily={POLICE} fontSize="50" fill={plat ? '#ff4a4a' : cl ? '#ff5a4a' : '#3aff7a'}>{plat ? '0' : Math.round(bpm)}</text>
      <text x="186" y="122" fontFamily={TXT} fontWeight="800" fontSize="13" fill="#3ac8ff">SpO2</text>
      <text x={W - 8} y="176" textAnchor="end" fontFamily={POLICE} fontSize="46" fill="#3ac8ff">{plat ? '--' : spo2}</text>
    </g>
  );
};

// ===================== la chambre 412 (illustrée) =====================
// patient : props du Rond assis dans le lit (ou null), posé en (540, 1160) à l'échelle 0.62
const PAT = {x: 540, y: 1160, s: 0.62};
const versMonde = (p) => [PAT.x + p[0] * PAT.s, PAT.y + p[1] * PAT.s];
const BRAS_LIT = {brasG: ikBras(-1, [-66, -300]), brasD: ikBras(1, [70, -300])};
const ChambreMonde = ({fg, bpm = 72, plat = false, alarme = false, patient = null, lampe = 1, f = 0}) => {
  const mG = versMonde(mainRond(-1, patient?.brasG || BRAS_LIT.brasG));
  const tubeFin = patient ? [mG[0] + 4, mG[1] - 6] : [470, 990];
  return (
    <g>
      <defs>
        <linearGradient id="ch-mur" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c6d3e6" />
          <stop offset="1" stopColor="#95a9c8" />
        </linearGradient>
        <linearGradient id="ch-sol" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#74839f" />
          <stop offset="1" stopColor="#424d66" />
        </linearGradient>
        <radialGradient id="ch-lum" cx="0.5" cy="0.35" r="0.6">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.45 * lampe} />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ch-nuit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c1636" />
          <stop offset="1" stopColor="#1e3466" />
        </linearGradient>
        <linearGradient id="ch-drap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b2d0f2" />
          <stop offset="1" stopColor="#7a9cd0" />
        </linearGradient>
        <linearGradient id="ch-dossier" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f0f3f8" />
          <stop offset="1" stopColor="#c8d0de" />
        </linearGradient>
        <linearGradient id="ch-rideau" x1="0" y1="0" x2="1" y2="0">
          {[...Array(9)].map((_, j) => <stop key={j} offset={j / 8} stopColor={j % 2 ? '#a8d4c4' : '#86b8a8'} />)}
        </linearGradient>
      </defs>
      {/* mur, lumière douce, plinthe, sol */}
      <rect x="-600" y="-400" width="2280" height="1660" fill="url(#ch-mur)" />
      <ellipse cx="540" cy="560" rx="700" ry="600" fill="url(#ch-lum)" />
      <rect x="-600" y="1040" width="2280" height="220" fill="#8a9ec0" />
      <rect x="-600" y="1034" width="2280" height="12" fill="#e2eaf6" />
      <rect x="-600" y="1260" width="2280" height="900" fill="url(#ch-sol)" />
      <rect x="-600" y="1260" width="2280" height="8" fill="#2e3850" opacity="0.6" />
      <ellipse cx="540" cy="1380" rx="520" ry="70" fill="#000" opacity="0.28" filter="url(#hp-flou)" />
      {/* fenêtre de nuit + stores */}
      <Calque p={0.92}>
        <rect x="-70" y="150" width="270" height="440" rx="10" fill="#dfe6f0" />
        <rect x="-56" y="164" width="242" height="412" fill="url(#ch-nuit)" />
        <circle cx="120" cy="250" r="34" fill="#f4f0d8" opacity="0.85" />
        {[...Array(12)].map((_, j) => <rect key={j} x="-56" y={168 + j * 26} width="242" height="13" fill="#d8e0ec" opacity="0.88" />)}
      </Calque>
      {/* rampe murale : prises, oxygène, appel infirmière, liseuse */}
      <rect x="280" y="560" width="720" height="86" rx="22" fill="#eef2f8" />
      <rect x="280" y="620" width="720" height="26" rx="13" fill="#c8d2e2" />
      {[330, 400].map((x) => (
        <g key={x}>
          <rect x={x - 24} y="578" width="48" height="40" rx="8" fill="#ffffff" stroke="#c0c8d6" strokeWidth="3" />
          <circle cx={x - 8} cy="598" r="4" fill="#5a6070" />
          <circle cx={x + 8} cy="598" r="4" fill="#5a6070" />
        </g>
      ))}
      <rect x="452" y="580" width="34" height="36" rx="6" fill="#ff8a3a" />
      <g transform="translate(930 600)">
        <circle r="24" fill="#3ab86a" />
        <rect x="-8" y="18" width="16" height="50" rx="6" fill="#d8f0ff" opacity="0.8" />
        <path d="M0,68 C0,140 -60,150 -90,240" stroke="#d8f0ff" strokeWidth="6" fill="none" opacity="0.7" />
      </g>
      <rect x="400" y="470" width="280" height="32" rx="14" fill="#e4e8f0" />
      <path d="M410,502 L670,502 L760,700 L320,700 Z" fill="#fff8e0" opacity={0.18 * lampe} />
      {/* moniteur sur bras articulé */}
      <path d="M960,560 L960,470 L900,450" stroke="#8a94a6" strokeWidth="18" fill="none" strokeLinecap="round" />
      <Moniteur x={700} y={250} fg={fg} bpm={bpm} plat={plat} alarme={alarme} />
      {/* pied à perfusion */}
      <g>
        <rect x="244" y="230" width="12" height="1150" rx="6" fill="#b8c0cc" />
        <path d="M200,236 L300,236" stroke="#b8c0cc" strokeWidth="10" strokeLinecap="round" />
        <path d="M160,1390 L340,1390 M250,1380 L190,1420 M250,1380 L310,1420" stroke="#9aa2b0" strokeWidth="14" strokeLinecap="round" />
        {[190, 310].map((x) => <circle key={x} cx={x} cy="1426" r="12" fill="#3a4050" />)}
        <path d="M222,246 L222,262 M278,246 L278,262" stroke="#8a929e" strokeWidth="5" />
        <rect x="206" y="258" width="88" height="150" rx="26" fill="#e8f4ff" opacity="0.9" stroke="#c8dcf0" strokeWidth="4" />
        <rect x="210" y="318" width="80" height="86" rx="22" fill="#a8d4ff" opacity="0.7" />
        <rect x="222" y="290" width="56" height="24" rx="4" fill="#ffffff" />
        <rect x="242" y="408" width="16" height="46" rx="6" fill="#e8f4ff" opacity="0.9" />
        <circle cx="250" cy={430 + ((fg * 3) % 18)} r="4" fill="#7ab8ff" />
        <path d={`M250,454 C250,700 330,860 ${tubeFin[0] - 80},${tubeFin[1] + 40} S${tubeFin[0] - 10},${tubeFin[1] + 8} ${tubeFin[0]},${tubeFin[1]}`} stroke="#e4f2ff" strokeWidth="6" fill="none" opacity="0.9" />
      </g>
      {/* le lit : roues, cadre, matelas, dossier relevé, oreiller */}
      {[220, 860].map((x) => (
        <g key={x}>
          <rect x={x - 12} y="1180" width="24" height="140" fill="#8a92a2" />
          <circle cx={x} cy="1330" r="20" fill="#2e3440" />
        </g>
      ))}
      <rect x="150" y="1150" width="780" height="60" rx="16" fill="#c8cfdc" />
      <rect x="150" y="1190" width="780" height="20" rx="10" fill="#9aa4b6" />
      <rect x="170" y="1070" width="740" height="96" rx="30" fill="#f2f5fa" />
      <path d="M330,1090 L360,620 Q540,580 720,620 L750,1090 Z" fill="url(#ch-dossier)" />
      <ellipse cx="540" cy="700" rx="200" ry="84" fill="#ffffff" />
      <ellipse cx="560" cy="726" rx="170" ry="46" fill="#dfe6f0" opacity="0.7" />
      {/* le patient */}
      {patient && (
        <g transform={`translate(${PAT.x} ${PAT.y}) scale(${PAT.s})`}>
          <Rond assis cou={18} bracelet oxymetre brasDevant {...BRAS_LIT} {...patient} />
        </g>
      )}
      {/* couverture et drap replié */}
      <path d="M160,1006 Q540,978 920,1006 L940,1172 Q540,1210 140,1172 Z" fill="url(#ch-drap)" />
      <path d="M160,1006 Q540,978 920,1006 L922,1040 Q540,1014 158,1040 Z" fill="#f4f7fc" />
      {[300, 470, 640, 790].map((x, j) => <path key={x} d={`M${x},1050 q${j % 2 ? 20 : -20},60 ${j % 2 ? -6 : 8},118`} stroke="#6a8cc0" strokeWidth="6" fill="none" opacity="0.5" />)}
      {/* les mains par-dessus la couverture, perfusion scotchée */}
      {patient && <rect x={tubeFin[0] - 14} y={tubeFin[1] - 12} width="30" height="22" rx="5" fill="#ffffff" opacity="0.95" transform={`rotate(-20 ${tubeFin[0]} ${tubeFin[1]})`} />}
      {/* barrière du lit */}
      <rect x="180" y="1056" width="300" height="24" rx="12" fill="#d8dee8" />
      {[210, 345, 455].map((x) => <rect key={x} x={x - 7} y="1076" width="14" height="74" fill="#c4ccd8" />)}
      {/* rideau au premier plan (parallaxe) */}
      <Calque p={1.25}>
        <path d={`M1010,-300 Q1040,${400 + 10 * Math.sin(f / 20)} 1000,1900 L1300,1900 L1300,-300 Z`} fill="url(#ch-rideau)" />
        <rect x="980" y="-320" width="340" height="30" fill="#c8ccd4" />
      </Calque>
    </g>
  );
};

// ===================== le couloir en perspective dessinée (dégradés lisses, pas de facettes) =====================
// repère : X horizontal (±380 = murs), Y vers le bas (sol 430, plafond -560), Z profondeur (1 Z = 1000).
const FOC = 900;
const CW = 380;
const CSOL = 430;
const CPLAF = -560;
const CZ1 = 9.6;
const proj = (cam, X, Y, Z) => {
  const k = FOC / (Math.max(0.06, Z - cam.z) * 1000);
  return [cam.vx + (X - cam.x) * k, cam.vy + (Y - cam.y) * k, k];
};
const pts = (cam, l) => l.map(([X, Y, Z]) => proj(cam, X, Y, Z).slice(0, 2).map((v) => v.toFixed(1)).join(',')).join(' ');
const PORTES_C = [[-1, 1.6, '410'], [1, 1.2, '411'], [-1, 3.0, '412'], [1, 3.4, '413'], [-1, 4.6, '414'], [1, 5.2, '415'], [-1, 6.4, '416'], [1, 7.0, '417'], [-1, 8.2, '418']];
const LUMS = [1.0, 2.4, 3.8, 5.2, 6.6, 8.0];
// texte posé sur un mur latéral (plan X = cste)
const TexteMur = ({cam, X, Y, Z, txt, taille = 44, coul = '#ffffff'}) => {
  const sens = X < 0 ? 1 : -1;
  const [x0, y0] = proj(cam, X, Y, Z);
  const [x1, y1] = proj(cam, X, Y, Z + 0.01 * sens);
  const [x2, y2] = proj(cam, X, Y + 10, Z);
  return <text transform={`matrix(${(x1 - x0) / 10} ${(y1 - y0) / 10} ${(x2 - x0) / 10} ${(y2 - y0) / 10} ${x0} ${y0})`} textAnchor="middle" dy={taille * 0.36} fontFamily={POLICE} fontSize={taille} fill={coul}>{txt}</text>;
};
const PersoC = ({cam, X, Z, s = 0.62, ...p}) => {
  if (Z - cam.z < 0.12) return null;
  const [x, y, k] = proj(cam, X, CSOL, Z);
  return (
    <g transform={`translate(${x} ${y}) scale(${k * s})`}>
      <Rond {...p} />
    </g>
  );
};
const ZOMBIE = (ph, k = 0) => ({zombie: true, brasG: [72 + 8 * Math.sin(ph + k), -12], brasD: [72 + 8 * Math.sin(ph + k + 1), -12], jambes: Math.sin(ph * 0.8 + k)});
// cam : {x, y, z, vx, vy}. o.persos : [{X, Z, ...props}], o.rouge, o.gresille, o.envers (on regarde vers l'entrée), o.asc / o.sortie (fond éclairé)
const CouloirMonde = ({cam, fg, rouge = 0, gresille = false, persos = [], envers = false, asc = 0, sortie = 0.5}) => {
  const zn = cam.z + 0.1;
  const brume = (Z) => Math.max(0, 1 - (Z - cam.z) / 11);
  const [lx0] = proj(cam, -CW, 0, zn);
  const [rx0] = proj(cam, CW, 0, zn);
  const [, fy0] = proj(cam, 0, CSOL, zn);
  const [, py0] = proj(cam, 0, CPLAF, zn);
  const allume = (j) => (rouge > 0.5 ? 0.12 : gresille && random(`gr${j}${Math.floor(fg / 3)}`) < 0.3 ? 0.15 : 1);
  const coin = (X, Y) => pts(cam, [[X, Y, zn], [X, Y, CZ1]]);
  return (
    <g>
      <defs>
        <linearGradient id="co-sol" gradientUnits="userSpaceOnUse" x1="0" y1={fy0} x2="0" y2={cam.vy}>
          <stop offset="0" stopColor="#8a97b2" />
          <stop offset="1" stopColor="#2c3652" />
        </linearGradient>
        <linearGradient id="co-plaf" gradientUnits="userSpaceOnUse" x1="0" y1={py0} x2="0" y2={cam.vy}>
          <stop offset="0" stopColor="#dfe5ef" />
          <stop offset="1" stopColor="#3a4560" />
        </linearGradient>
        <linearGradient id="co-murg" gradientUnits="userSpaceOnUse" x1={lx0} y1="0" x2={cam.vx} y2="0">
          <stop offset="0" stopColor="#bccbe2" />
          <stop offset="1" stopColor="#36425e" />
        </linearGradient>
        <linearGradient id="co-murd" gradientUnits="userSpaceOnUse" x1={rx0} y1="0" x2={cam.vx} y2="0">
          <stop offset="0" stopColor="#aebdd8" />
          <stop offset="1" stopColor="#323d58" />
        </linearGradient>
      </defs>
      <rect x="-200" y="-200" width="1480" height="2320" fill="#2c3652" />
      {/* plafond, sol, murs */}
      <polygon points={pts(cam, [[-CW, CPLAF, zn], [CW, CPLAF, zn], [CW, CPLAF, CZ1], [-CW, CPLAF, CZ1]])} fill="url(#co-plaf)" />
      <polygon points={pts(cam, [[-CW, CSOL, zn], [CW, CSOL, zn], [CW, CSOL, CZ1], [-CW, CSOL, CZ1]])} fill="url(#co-sol)" />
      <polygon points={pts(cam, [[-CW, CPLAF, zn], [-CW, CPLAF, CZ1], [-CW, CSOL, CZ1], [-CW, CSOL, zn]])} fill="url(#co-murg)" />
      <polygon points={pts(cam, [[CW, CPLAF, zn], [CW, CPLAF, CZ1], [CW, CSOL, CZ1], [CW, CSOL, zn]])} fill="url(#co-murd)" />
      {/* soubassement plus foncé, plinthes, mains courantes en bois */}
      {[-1, 1].map((s) => (
        <g key={s}>
          <polygon points={pts(cam, [[s * CW, 80, zn], [s * CW, 80, CZ1], [s * CW, CSOL, CZ1], [s * CW, CSOL, zn]])} fill="#2a3a6a" opacity="0.35" />
          <polygon points={pts(cam, [[s * CW, 380, zn], [s * CW, 380, CZ1], [s * CW, CSOL, CZ1], [s * CW, CSOL, zn]])} fill="#1e2640" opacity="0.6" />
          <polygon points={pts(cam, [[s * (CW - 2), 40, zn], [s * (CW - 2), 40, CZ1], [s * (CW - 2), 74, CZ1], [s * (CW - 2), 74, zn]])} fill="#c89a62" />
          <polygon points={pts(cam, [[s * (CW - 2), 40, zn], [s * (CW - 2), 40, CZ1], [s * (CW - 2), 50, CZ1], [s * (CW - 2), 50, zn]])} fill="#f0c890" opacity="0.7" />
        </g>
      ))}
      <polyline points={coin(-CW, CSOL)} stroke="#141a2c" strokeWidth="3" opacity="0.4" fill="none" />
      <polyline points={coin(CW, CSOL)} stroke="#141a2c" strokeWidth="3" opacity="0.4" fill="none" />
      {/* lumière : panneaux du plafond, flaques sur les murs et le sol (reflets) */}
      {LUMS.filter((Z) => Z > cam.z + 0.25).map((Z, j) => {
        const a = allume(j) * brume(Z);
        const [cx, cy, k] = proj(cam, 0, CPLAF, Z);
        const [, sy] = proj(cam, 0, CSOL, Z);
        return (
          <g key={Z}>
            {[-1, 1].map((s) => {
              const [wx, wy, kw] = proj(cam, s * CW, -150, Z);
              return <ellipse key={s} cx={wx} cy={wy} rx={170 * kw} ry={520 * kw} fill="#ffffff" opacity={0.16 * a} filter="url(#hp-flou)" />;
            })}
            <ellipse cx={cx} cy={sy} rx={260 * k} ry={60 * k} fill="#f4f8ff" opacity={0.3 * a} filter="url(#hp-flou)" />
            <polygon points={pts(cam, [[-150, CPLAF + 2, Z - 0.22], [150, CPLAF + 2, Z - 0.22], [150, CPLAF + 2, Z + 0.22], [-150, CPLAF + 2, Z + 0.22]])} fill={a > 0.5 ? '#f8fbff' : '#5a6070'} />
            <ellipse cx={cx} cy={cy + 20 * k} rx={330 * k} ry={110 * k} fill="#ffffff" opacity={0.3 * a} filter="url(#hp-flou)" />
          </g>
        );
      })}
      {/* gyrophares d'alarme */}
      {rouge > 0.5 && [1.7, 4.5, 7.3].filter((Z) => Z > cam.z + 0.2).map((Z, j) => [-1, 1].map((s) => {
        const [x, y, k] = proj(cam, s * (CW - 4), -470, Z);
        const p = 0.5 + 0.5 * Math.sin(fg / 3 + j * 2 + s);
        return (
          <g key={`${Z}${s}`}>
            <ellipse cx={x} cy={y + 60 * k} rx={300 * k} ry={420 * k} fill="#ff3a2a" opacity={0.5 * p * brume(Z)} filter="url(#hp-flou)" />
            <ellipse cx={x} cy={y} rx={34 * k} ry={30 * k} fill="#ffd0c8" />
          </g>
        );
      }))}
      {/* fond du couloir */}
      {(() => {
        const [ax, ay] = proj(cam, -CW, CPLAF, CZ1);
        const [bx, by, k] = proj(cam, CW, CSOL, CZ1);
        const P = (X, Y) => proj(cam, X, Y, CZ1);
        if (envers) {
          return (
            <g>
              <rect x={ax} y={ay} width={bx - ax} height={by - ay} fill="#4a5672" />
              <rect x={P(-200, 0)[0]} y={P(0, -280)[1]} width={400 * k} height={710 * k} fill="#6a7690" />
              <rect x={P(-196, 0)[0]} y={P(0, -270)[1]} width={194 * k} height={700 * k} fill="#9aa8c0" />
              <rect x={P(2, 0)[0]} y={P(0, -270)[1]} width={194 * k} height={700 * k} fill="#9aa8c0" />
              {[-1, 1].map((s) => <rect key={s} x={P(s * 100 - 40, 0)[0]} y={P(0, -180)[1]} width={80 * k} height={110 * k} fill="#1a2238" />)}
              <rect x={P(-170, 0)[0]} y={P(0, -400)[1]} width={340 * k} height={70 * k} fill="#1e3a7a" />
              <text x={P(0, 0)[0]} y={P(0, -350)[1]} textAnchor="middle" fontFamily={POLICE} fontSize={48 * k} fill="#ffffff">BLOC OPÉRATOIRE</text>
            </g>
          );
        }
        return (
          <g>
            <rect x={ax} y={ay} width={bx - ax} height={by - ay} fill="#4a5672" />
            {/* ascenseur */}
            <rect x={P(-340, 0)[0]} y={P(0, -290)[1]} width={290 * k} height={720 * k} fill="#6a7488" />
            <rect x={P(-330, 0)[0]} y={P(0, -280)[1]} width={134 * k} height={710 * k} fill="#b4bccb" />
            <rect x={P(-194, 0)[0]} y={P(0, -280)[1]} width={134 * k} height={710 * k} fill="#a4adbe" />
            <rect x={P(-250, 0)[0]} y={P(0, -380)[1]} width={110 * k} height={60 * k} rx={8 * k} fill="#120c08" />
            <text x={P(-195, 0)[0]} y={P(0, -334)[1]} textAnchor="middle" fontFamily={POLICE} fontSize={46 * k} fill="#ffa03a">4</text>
            <circle cx={P(-30, 0)[0]} cy={P(0, 0)[1]} r={16 * k} fill={asc > 0.5 ? '#ffd23a' : '#dfe4ec'} />
            {asc > 0 && <ellipse cx={P(-195, 0)[0]} cy={P(0, -350)[1]} rx={200 * k} ry={120 * k} fill="#ffb03a" opacity={0.5 * asc} filter="url(#hp-flou)" />}
            {/* escalier de secours */}
            <rect x={P(70, 0)[0]} y={P(0, -280)[1]} width={260 * k} height={710 * k} fill="#5a7a74" />
            <rect x={P(84, 0)[0]} y={P(0, -264)[1]} width={232 * k} height={694 * k} fill="#7aa098" />
            <rect x={P(100, 0)[0]} y={P(0, 40)[1]} width={200 * k} height={26 * k} rx={10 * k} fill="#d8dee6" />
            <rect x={P(160, 0)[0]} y={P(0, -180)[1]} width={80 * k} height={140 * k} fill="#1a2a34" />
            <ellipse cx={P(200, 0)[0]} cy={P(0, -350)[1]} rx={240 * k} ry={110 * k} fill="#3aff8a" opacity={0.25 + 0.5 * sortie} filter="url(#hp-flou)" />
            <rect x={P(110, 0)[0]} y={P(0, -390)[1]} width={180 * k} height={70 * k} rx={8 * k} fill="#1ac85a" />
            <text x={P(200, 0)[0]} y={P(0, -340)[1]} textAnchor="middle" fontFamily={POLICE} fontSize={46 * k} fill="#ffffff">SORTIE</text>
          </g>
        );
      })()}
      {/* portes des chambres */}
      {PORTES_C.filter(([, Z]) => Z > cam.z + 0.45).sort((a, b) => b[1] - a[1]).map(([s, Z, num]) => {
        const X = s * (CW - 1);
        return (
          <g key={num}>
            <polygon points={pts(cam, [[X, -290, Z - 0.31], [X, -290, Z + 0.31], [X, CSOL, Z + 0.31], [X, CSOL, Z - 0.31]])} fill="#e8edf4" />
            <polygon points={pts(cam, [[X, -264, Z - 0.27], [X, -264, Z + 0.27], [X, CSOL, Z + 0.27], [X, CSOL, Z - 0.27]])} fill="#b9814a" />
            <polygon points={pts(cam, [[X, -264, Z - 0.27], [X, -264, Z + 0.27], [X, CSOL, Z + 0.27], [X, CSOL, Z - 0.27]])} fill="#000" opacity={0.45 * (1 - brume(Z))} />
            <polygon points={pts(cam, [[X, -200, Z - 0.17], [X, -200, Z - 0.09], [X, 60, Z - 0.09], [X, 60, Z - 0.17]])} fill="#141a2a" />
            <polygon points={pts(cam, [[X, 70, Z + 0.15], [X, 70, Z + 0.22], [X, 92, Z + 0.22], [X, 92, Z + 0.15]])} fill="#e0e4ea" />
            <polygon points={pts(cam, [[X, -360, Z - 0.13], [X, -360, Z + 0.13], [X, -300, Z + 0.13], [X, -300, Z - 0.13]])} fill="#1e3a7a" />
            <TexteMur cam={cam} X={X} Y={-330} Z={Z} txt={num} taille={46} />
          </g>
        );
      })}
      {/* panneau suspendu */}
      {cam.z < 6.6 && (() => {
        const [x, y, k] = proj(cam, 0, -440, 6.9);
        return (
          <g>
            <path d={`M${x - 120 * k},${proj(cam, 0, CPLAF, 6.9)[1]} L${x - 120 * k},${y} M${x + 120 * k},${proj(cam, 0, CPLAF, 6.9)[1]} L${x + 120 * k},${y}`} stroke="#8a92a2" strokeWidth={4 * k} />
            <rect x={x - 190 * k} y={y - 36 * k} width={380 * k} height={72 * k} rx={10 * k} fill="#1e3a7a" />
            <text x={x} y={y + 16 * k} textAnchor="middle" fontFamily={POLICE} fontSize={44 * k} fill="#ffffff">4 OUEST · CHIRURGIE</text>
          </g>
        );
      })()}
      {/* les persos (du plus loin au plus près) */}
      {[...persos].sort((a, b) => b.Z - a.Z).map((p, j) => <PersoC key={j} cam={cam} {...p} />)}
    </g>
  );
};
const camC = (z, o = {}) => ({x: 0, y: -150, z, vx: 540, vy: 860, ...o});

// ===================== 1. Le bloc : derrière le rideau, le patient se réveille et mord le chirurgien =====================
const Silhouette = ({x, y, s, rot = 0, children}) => <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} filter="url(#hp-ombre)" opacity="0.92">{children}</g>;
const Sang = ({f, t0, n = 26, x = 540, y = 820, seed = 's'}) => {
  const u = f - t0;
  if (u < 0) return null;
  return (
    <g>
      {[...Array(n)].map((_, k) => {
        const a = random(`${seed}a${k}`) * 6.28;
        const r = Math.min(1, u / 4) * (60 + 360 * random(`${seed}r${k}`));
        const cx = x + Math.cos(a) * r;
        const cy = y + Math.sin(a) * r * 0.8;
        const s = 6 + 26 * random(`${seed}s${k}`) * (1 - r / 500);
        const coule = Math.max(0, u - 6) * (2 + 4 * random(`${seed}c${k}`));
        return (
          <g key={k}>
            <circle cx={cx} cy={cy} r={s} fill="#9a0c14" />
            {s > 14 && <rect x={cx - s * 0.3} y={cy} width={s * 0.6} height={coule} rx={s * 0.3} fill="#8a0a12" />}
          </g>
        );
      })}
    </g>
  );
};
const BlocMonde = ({f, fg, R}) => {
  const reveil = ease(f, R('réveille', 82) - 10, R('réveille', 82) + 8, Easing.out(Easing.back(1.2)));
  const mord = R('mord', 108);
  const saute = ease(f, mord - 5, mord + 2, Easing.in(Easing.quad));
  const lutte = f > mord ? tremble(fg, 30, 'lu') : 0;
  const lumiere = f > mord + 8 && random(`bf${Math.floor(f / 2)}`) < 0.35 ? 0.35 : 1;
  const sursaut = f > 50 && f < 66 ? Math.sin(f * 1.7) * 18 * Math.sin(((f - 50) / 16) * Math.PI) : 0;
  const plat = f > mord + 24;
  return (
    <g transform={`translate(${lutte * 0.25} 0)`}>
      <defs>
        <radialGradient id="bl-lampe" cx="50%" cy="20%" r="70%">
          <stop offset="0" stopColor="#fffbe8" stopOpacity={lumiere} />
          <stop offset="0.5" stopColor="#c8e8e0" stopOpacity={0.8 * lumiere} />
          <stop offset="1" stopColor="#3a6a6a" stopOpacity={lumiere} />
        </radialGradient>
        <linearGradient id="bl-pli" x1="0" y1="0" x2="1" y2="0">
          {[...Array(15)].map((_, j) => <stop key={j} offset={j / 14} stopColor={j % 2 ? '#ffffff' : '#000000'} stopOpacity={j % 2 ? 0.12 : 0.14} />)}
        </linearGradient>
      </defs>
      <rect x="-400" y="-200" width="1880" height="2320" fill="#0e2426" />
      <rect x="-200" y="200" width="1480" height="1400" fill="url(#bl-lampe)" />
      <ellipse cx="540" cy="360" rx="260" ry="80" fill="#ffffff" opacity={0.6 * lumiere} filter="url(#hp-flou)" />
      {/* la lampe scialytique (ombre) */}
      <Silhouette x={540} y={330} s={1}>
        <rect x="-8" y="-260" width="16" height="200" fill="#0a1a1c" />
        <ellipse cx="0" cy="-40" rx="200" ry="40" fill="#0a1a1c" />
      </Silhouette>
      {/* la table, le patient couché → assis → qui bondit */}
      <Silhouette x={540} y={1180} s={1}>
        <rect x="-330" y="-30" width="660" height="40" rx="10" fill="#0a1a1c" />
        <rect x="-20" y="10" width="40" height="300" fill="#0a1a1c" />
      </Silhouette>
      <Silhouette x={lerp(380, 600, saute)} y={lerp(1150, 1100, saute)} s={lerp(0.62, 0.7, saute)} rot={lerp(-90, -10, reveil) + 40 * saute + lutte * 0.3}>
        <Rond zombie sansYeux={reveil < 0.6} brasG={[lerp(sursaut, 120, reveil), -40 * saute]} brasD={[lerp(0, 130, reveil), -40 * saute]} />
      </Silhouette>
      {/* le chirurgien (charlotte), qui recule… puis se fait attraper */}
      <Silhouette x={lerp(820, 790, reveil) + lutte} y={1460} s={0.78} rot={f > mord ? -12 + lutte * 0.4 : 0}>
        <Rond zombie sansYeux tenue="chirurgien" brasG={[lerp(60, 80, reveil), lerp(-90, -60, reveil)]} brasD={[lerp(40, 140, saute), -40]} />
        <path d="M-182,-840 Q-180,-1000 0,-1000 Q180,-1000 182,-840 Z" fill="#0a1a1c" />
      </Silhouette>
      {/* le rideau (devant), ses plis, et le sang qui gicle dessus */}
      <rect x="-400" y="120" width="1880" height="1700" fill="#9ad0c8" opacity="0.22" />
      <rect x="-400" y="120" width="1880" height="1700" fill="url(#bl-pli)" />
      <rect x="-400" y="100" width="1880" height="26" fill="#c8ccd4" />
      {[...Array(18)].map((_, j) => <circle key={j} cx={-360 + j * 110} cy="113" r="12" fill="#e8eaf0" />)}
      <Sang f={f} t0={mord + 1} x={700} y={820} seed="s1" />
      <Sang f={f} t0={mord + 7} x={560} y={980} n={16} seed="s2" />
      {f > mord + 12 && (
        <g transform={`translate(380 1120) rotate(-15) scale(${1 + 0.15 * Math.max(0, 1 - (f - mord - 12) / 4)})`} opacity="0.88">
          <circle r="56" fill="#8a0a12" />
          {[-40, -14, 12, 38].map((x, j) => <rect key={j} x={x - 13} y={-140 + Math.abs(j - 1.5) * 12} width="26" height="100" rx="13" fill="#8a0a12" />)}
          <rect x="40" y="-30" width="26" height="80" rx="13" fill="#8a0a12" transform="rotate(-40 53 10)" />
          <rect x="-10" y="50" width="16" height={Math.min(220, (f - mord - 12) * 6)} rx="8" fill="#8a0a12" />
        </g>
      )}
      {/* moniteur du bloc (devant le rideau) */}
      <g transform="translate(40 520)">
        <rect x="-60" y="60" width="16" height="900" fill="#1a2a2c" />
        <Moniteur x={-110} y={-20} fg={fg} bpm={f > mord ? 160 : 64} spo2={f > mord ? 71 : 99} plat={plat} alarme={f > mord} />
      </g>
    </g>
  );
};
const Bloc = scene('bloc', ({f, fg, i, t, k, R}) => {
  const mord = R('mord', 108);
  const choc = f > mord && f < mord + 10 ? tremble(fg, 26 * (1 - (f - mord) / 10), 'bc') : 0;
  const vues = [
    {x: 540, y: 960, z: lerp(1.04, 1.14, k)},
    {x: lerp(420, 440, k), y: 1120, z: lerp(1.45, 1.55, k)},
    {x: 520, y: lerp(1060, 1020, k), z: lerp(1.35, 1.5, k) * punchZ(f - R('réveille', 82) + 4, 0.08)},
    {x: 600 + choc, y: 1010 + choc * 0.5, z: lerp(1.12, 1.2, k) * punchZ(f - mord, 0.16), r: choc * 0.08},
    {x: 115, y: 620, z: lerp(3.1, 3.3, k)},
  ];
  return (
    <Ecran fg={fg} vignette={0.7}
      dessus={
        <g>
          {i === 0 && <Puce f={f} t0={2} txt={`BLOC 3 · 03${Math.floor(fg / 15) % 2 ? ':' : ' '}00`} y={250} fond="#0a1a1c" coul="#7affc8" />}
          <rect width="1080" height="1920" fill="#ff0000" opacity={f > mord && f < mord + 4 ? 0.3 : i === 4 && Math.floor(fg / 5) % 2 ? 0.12 : 0} />
        </g>
      }>
      <Vue {...vues[i]}>
        <BlocMonde f={f} fg={fg} R={R} />
      </Vue>
    </Ecran>
  );
});

// ===================== 2. Deux étages plus haut, chambre 412. Opéré de l'appendicite hier soir. =====================
const Facade = ({fg, f}) => {
  const ET = 420;
  return (
    <g>
      <defs>
        <linearGradient id="fa-ciel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a1030" />
          <stop offset="1" stopColor="#24305a" />
        </linearGradient>
        <linearGradient id="fa-mur" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5a6688" />
          <stop offset="1" stopColor="#3a4466" />
        </linearGradient>
      </defs>
      <rect x="-400" y="0" width="1880" height="3400" fill="url(#fa-ciel)" />
      {[...Array(40)].map((_, j) => <circle key={j} cx={-300 + random(`et${j}`) * 1700} cy={200 + random(`ey${j}`) * 2800} r={2 + random(`er${j}`) * 2} fill="#ffffff" opacity={0.3 + 0.4 * random(`eo${j}`)} />)}
      <rect x="60" y="600" width="960" height="2800" fill="url(#fa-mur)" />
      <rect x="40" y="580" width="1000" height="40" fill="#6a7698" />
      <g transform="translate(540 520)">
        <rect x="-150" y="-60" width="300" height="110" rx="14" fill="#e8ecf4" />
        <rect x="-36" y="-44" width="72" height="78" fill="#e83a3a" />
        <rect x="-12" y="-44" width="24" height="78" fill="#ffffff" />
        <rect x="-36" y="-17" width="72" height="24" fill="#ffffff" />
      </g>
      {[...Array(6)].map((_, et) => [...Array(3)].map((__, c) => {
        const y = 700 + et * ET;
        const x = 120 + c * 310;
        const ch412 = et === 1 && c === 1;
        const bloc = et === 3;
        const r = random(`fw${et}${c}`);
        const col = ch412 ? '#ffe2a0' : bloc ? (Math.floor(fg / 3) % 3 ? '#7affc8' : '#ff3a3a') : r < 0.5 ? '#ffd88a' : '#1a2240';
        return (
          <g key={`${et}${c}`}>
            <rect x={x} y={y} width="220" height="280" rx="8" fill="#2a3048" />
            <rect x={x + 10} y={y + 10} width="200" height="260" rx="4" fill={col} opacity={bloc ? 0.85 : 1} />
            {ch412 && <ellipse cx={x + 110} cy={y + 140} rx="200" ry="200" fill="#ffd88a" opacity="0.25" filter="url(#hp-flou)" />}
            {ch412 && <g transform={`translate(${x + 110} ${y + 270}) scale(0.2)`}><Rond assis bouche="o" yeux={0.1} /></g>}
            <rect x={x + 104} y={y + 10} width="12" height="260" fill="#2a3048" />
          </g>
        );
      }))}
      <text x="70" y={700 + 3 * ET - 20} fontFamily={POLICE} fontSize="40" fill="#ff8a7a">BLOC</text>
    </g>
  );
};
const Chambre = scene('chambre', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    const u = ease(t, 6, 40, Easing.inOut(Easing.cubic));
    const vit = Math.abs(ease(t + 1, 6, 40) - ease(t - 1, 6, 40));
    const y = lerp(700 + 3 * 420 + 140, 700 + 420 + 140, u);
    return (
      <Ecran fg={fg} flou={[0, 60 * vit]} vignette={0.7}
        dessus={<Puce f={f} t0={R('chambre', 54) - 12} txt="CHAMBRE 412" y={300} fond="#ffffff" coul="#141218" />}>
        <Vue x={540} y={y} z={1.25 + 0.15 * u} r={-2 + 2 * u}>
          <Facade fg={fg} f={f} />
        </Vue>
      </Ecran>
    );
  }
  const moi = {profil: 0.35, yeux: 1, pupX: 10, bouche: 'neutre', sourcils: 0.2, souffle: Math.sin(fg / 14) * 8, penche: -4};
  if (i === 1) {
    return (
      <Ecran fg={fg}>
        <Vue x={lerp(520, 560, k)} y={900} z={lerp(1.0, 1.07, k) * punchZ(t)}>
          <ChambreMonde f={f} fg={fg} patient={moi} />
        </Vue>
      </Ecran>
    );
  }
  if (i === 2) {
    return (
      <Ecran fg={fg} dessus={<Carte f={f} t0={R('opéré', 90) - 2} nom="TOI · 19 ANS" sous="APPENDICITE OPÉRÉE HIER SOIR" />}>
        <Vue x={lerp(590, 610, k)} y={lerp(760, 740, k)} z={lerp(2.1, 2.25, k) * punchZ(t)}>
          <ChambreMonde f={f} fg={fg} patient={{...moi, profil: 0.5, pupX: 18, pupY: -4, yeux: 0.9, bouche: 'o'}} />
        </Vue>
      </Ecran>
    );
  }
  // insert : la main, le bracelet, la perfusion, l'oxymètre
  return (
    <Ecran fg={fg}>
      <Vue x={lerp(500, 530, k)} y={975} z={lerp(3.6, 3.8, k) * punchZ(t)} r={-3}>
        <ChambreMonde f={f} fg={fg} patient={moi} />
      </Vue>
    </Ecran>
  );
});

// ===================== 3. Code rouge. Les lumières passent au rouge. Ton cœur : 152. =====================
const Gyrophare = ({fg, f, allume}) => {
  const a = (fg * 14) % 360;
  return (
    <g>
      <defs>
        <linearGradient id="gy-plaf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2e3a" />
          <stop offset="1" stopColor="#6a7286" />
        </linearGradient>
      </defs>
      <rect x="-400" y="-200" width="1880" height="2320" fill="url(#gy-plaf)" />
      {[...Array(6)].map((_, j) => <path key={j} d={`M-400,${300 + j * 260} L1480,${200 + j * 300}`} stroke="#000" strokeWidth="4" opacity="0.15" />)}
      {allume && [0, 180].map((d) => (
        <g key={d} transform={`translate(540 760) scale(1 0.42) rotate(${a + d})`}>
          <path d="M0,0 L1500,-260 L1500,260 Z" fill="#ff3a2a" opacity="0.45" filter="url(#hp-flou)" />
        </g>
      ))}
      <rect x="430" y="700" width="220" height="60" rx="14" fill="#c8ccd6" />
      <path d="M450,700 Q450,560 540,560 Q630,560 630,700 Z" fill={allume ? '#ff3a2a' : '#8a3a3a'} />
      <path d="M470,690 Q470,590 520,580" stroke="#ffffff" strokeWidth="14" fill="none" opacity="0.5" strokeLinecap="round" />
      {allume && <circle cx="540" cy="640" r="180" fill="#ff5a3a" opacity={0.35 + 0.25 * Math.sin(fg)} filter="url(#hp-flou)" />}
      {/* bandeau lumineux */}
      <rect x="140" y="1000" width="800" height="150" rx="16" fill="#120808" stroke="#3a3a46" strokeWidth="8" />
      <svg x="160" y="1010" width="760" height="130" viewBox="0 0 760 130">
        <text x={allume ? 760 - ((f * 18) % 1500) : 2000} y="104" fontFamily={POLICE} fontSize="104" fill="#ff3a2a" letterSpacing="8">CODE ROUGE · CODE ROUGE</text>
      </svg>
    </g>
  );
};
const Alarme = scene('alarme', ({f, fg, i, t, k, R}) => {
  const bpm = interpolate(f, [60, R('semballe', 81), R('cent', 113) + 4], [72, 118, 152], clamp);
  if (i === 0) {
    const allume = f >= R('rouge', 7) - 2;
    return (
      <Ecran fg={fg} rouge={allume ? 0.35 : 0} vignette={0.8}>
        <Vue x={540} y={820} z={lerp(1.0, 1.12, k) * (allume ? punchZ(f - R('rouge', 7) + 2, 0.1) : 1)} r={-5 + 3 * k}>
          <Gyrophare fg={fg} f={f} allume={allume} />
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    const rouge = f >= R('lumières', 34) ? 1 : 0;
    return (
      <Ecran fg={fg} rouge={rouge}>
        <Vue x={540} y={900} z={lerp(1.05, 1.1, k) * (rouge ? punchZ(f - R('lumières', 34), 0.08) : 1)}>
          <ChambreMonde f={f} fg={fg} bpm={bpm} lampe={rouge ? 0.2 : 1} alarme={rouge > 0} patient={{profil: rouge ? -0.4 : 0.2, yeux: rouge ? 1.3 : 1, bouche: rouge ? 'o' : 'neutre', sourcils: rouge ? 1 : 0.2, pupX: rouge ? -14 : 0, pupY: -6}} />
        </Vue>
      </Ecran>
    );
  }
  if (i === 2) {
    const sursaut = ease(t, 0, 4, Easing.out(Easing.back(2)));
    const bat = Math.max(0, Math.sin((f / 30) * (bpm / 60) * Math.PI)) ** 8;
    return (
      <Ecran fg={fg} rouge={1} dessus={<BPM f={f} v={bpm} op={ease(t, 2, 8)} y={300} />}>
        <Vue x={560 + tremble(fg, 6, 'al')} y={740} z={lerp(2.3, 2.6, k) * (1 + 0.025 * bat) * punchZ(f - R('cœur', 74), 0.08)}>
          <ChambreMonde f={f} fg={fg} bpm={bpm} lampe={0.2} alarme patient={{profil: 0.1, yeux: 1.35, bouche: 'cri', sourcils: 1, sueur: ((f / 20) % 1), pupX: 0, pupY: -8, penche: 6 * (1 - sursaut), souffle: Math.sin(fg / 3) * 10}} />
        </Vue>
      </Ecran>
    );
  }
  return (
    <Ecran fg={fg} rouge={0.75}>
      <Vue x={824} y={350} z={lerp(3.3, 3.6, k) * punchZ(f - R('cent', 113), 0.1)} r={2}>
        <ChambreMonde f={f} fg={fg} bpm={bpm} lampe={0.2} alarme patient={{yeux: 1.3, bouche: 'cri'}} />
      </Vue>
    </Ecran>
  );
});

// ===================== 4. Tu passes la tête dans le couloir : ils avancent, bras tendus, les yeux qui brillent =====================
// mur du couloir vu de face (élévation), avec une porte
const MurPorte = ({num, ouvre = 0, fg, children, devant = null, sens = 1, couloirRouge = true, plaque = '#1e3a7a'}) => (
  <g>
    <defs>
      <linearGradient id="mp-mur" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#c0cde2" />
        <stop offset="1" stopColor="#8ea2c2" />
      </linearGradient>
      <linearGradient id="mp-bois" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#c48c52" />
        <stop offset="1" stopColor="#a06c3a" />
      </linearGradient>
    </defs>
    <rect x="-600" y="-200" width="2280" height="1820" fill="url(#mp-mur)" />
    <rect x="-600" y="1180" width="2280" height="440" fill="#5a6c96" opacity="0.5" />
    <rect x="-600" y="1150" width="2280" height="36" rx="12" fill="#c89a62" />
    <rect x="-600" y="1150" width="2280" height="10" fill="#f0c890" opacity="0.7" />
    <rect x="-600" y="1620" width="2280" height="600" fill="#6a7896" />
    <rect x="-600" y="1580" width="2280" height="44" fill="#2a3450" />
    <rect x="300" y="480" width="480" height="1110" fill="#eef2f8" />
    <rect x="320" y="400" width="440" height="60" rx="8" fill={plaque} />
    <text x="540" y="449" textAnchor="middle" fontFamily={POLICE} fontSize="50" fill="#ffffff">{num}</text>
    <rect x="324" y="500" width="432" height="1090" fill="#0a0e18" />
    {couloirRouge && <rect x="324" y="500" width="432" height="1090" fill="#5a1a1e" opacity="0.5" />}
    {children}
    {/* le battant : charnière à gauche (sens 1) ou à droite (sens -1) */}
    {(() => {
      const xh = sens > 0 ? 324 : 756;
      const xl = lerp(sens > 0 ? 756 : 324, sens > 0 ? -240 : 1320, ouvre);
      const g = 70 * ouvre;
      return (
        <g>
          <polygon points={`${xh},500 ${xl},${500 - g} ${xl},${1590 + g} ${xh},1590`} fill="url(#mp-bois)" />
          <polygon points={`${xh},500 ${xl},${500 - g} ${xl},${1590 + g} ${xh},1590`} fill="#000" opacity={0.25 * ouvre} />
          <rect x={Math.min(xh, xl) + Math.abs(xl - xh) * 0.62} y="620" width={Math.abs(xl - xh) * 0.14} height="360" fill="#141a2a" opacity={ouvre < 0.9 ? 1 : 0} />
          <rect x={lerp(xh, xl, 0.86) - 20} y="1030" width="40" height="80" rx="10" fill="#d8dce4" />
        </g>
      );
    })()}
    {devant}
  </g>
);
const Couloir = scene('couloir', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    const sort = ease(f, R('tête', 16) - 8, R('tête', 16) + 4, Easing.out(Easing.cubic));
    return (
      <Ecran fg={fg} rouge={1}>
        <Vue x={540} y={lerp(800, 780, k)} z={1.75}>
          <MurPorte num="412" ouvre={0.18} fg={fg} sens={-1}
            devant={
              <g clipPath="url(#cl-412)">
                <defs>
                  <clipPath id="cl-412">
                    <rect x="324" y="300" width="1000" height="1290" />
                  </clipPath>
                </defs>
                <g transform={`translate(${lerp(860, 640, sort)} ${1590}) scale(1.05)`}>
                  <Rond profil={-0.7} cou={18} penche={-16 * sort} yeux={1.3} pupX={-26} bouche="o" sourcils={0.9} sueur={0.6} brasG={[10, 0]} brasD={[10, 0]} />
                </g>
                <rect x="610" y="460" width="700" height="1200" fill="url(#mp-bois)" />
                <rect x="610" y="460" width="18" height="1200" fill="#000" opacity="0.3" />
              </g>
            } />
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    const cam = camC(lerp(0.0, 0.25, k));
    const persos = [[-150, 4.6], [170, 3.8], [-40, 3.3], [220, 5.6], [40, 6.4], [-230, 6.0], [120, 7.6], [-120, 8.2]].map(([X, Z], j) => ({X: X + 10 * Math.sin(fg / 20 + j), Z: Z - t * 0.006, ...ZOMBIE(fg / 8, j)}));
    return (
      <Ecran fg={fg} rouge={1}>
        <Vue z={punchZ(t, 0.06)}>
          <CouloirMonde cam={cam} fg={fg} rouge={1} gresille persos={persos} />
        </Vue>
      </Ecran>
    );
  }
  if (i === 2) {
    // contre-plongée : les pieds qui traînent, un pied à perfusion tiré derrière
    const cam = camC(0, {y: 250, vy: 1060});
    const av = t * 0.004;
    const pied = (X, Z, j) => ({X, Z: Z - av, ...ZOMBIE(fg / 10, j)});
    const [px, py, pk] = proj(cam, 90, CSOL, 1.5 - av);
    return (
      <Ecran fg={fg} rouge={1}>
        <Vue x={540} y={lerp(1160, 1120, k)} z={1.2}>
          <CouloirMonde cam={cam} fg={fg} rouge={1} persos={[pied(-120, 1.3, 0), pied(160, 2.4, 1), pied(-60, 3.4, 2)]} />
          <g transform={`translate(${px + 120 * pk} ${py}) scale(${pk})`}>
            <rect x="-8" y="-1100" width="16" height="1080" fill="#9aa2b0" transform="rotate(-14)" />
            <path d="M-90,0 L90,0" stroke="#8a92a2" strokeWidth="18" strokeLinecap="round" />
            <circle cx="-90" cy="8" r="20" fill="#2a2e3a" />
            <circle cx="90" cy="8" r="20" fill="#2a2e3a" />
          </g>
        </Vue>
      </Ecran>
    );
  }
  if (i === 3) {
    const cam = camC(lerp(0.2, 0.32, k), {y: -260});
    const persos = [
      {X: 40, Z: 1.35 - t * 0.003, ...ZOMBIE(fg / 9, 0), brasG: [96, -8], brasD: [100, -10]},
      {X: -210, Z: 2.4, ...ZOMBIE(fg / 9, 1)},
      {X: 230, Z: 2.9, ...ZOMBIE(fg / 9, 2)},
      {X: -40, Z: 4.0, ...ZOMBIE(fg / 9, 3)},
    ];
    return (
      <Ecran fg={fg} rouge={1}>
        <Vue z={punchZ(f - R('bras', 105), 0.08)}>
          <CouloirMonde cam={cam} fg={fg} rouge={1} persos={persos} />
        </Vue>
      </Ecran>
    );
  }
  // très gros plan : les yeux qui brillent
  const br = ease(f, R('brillent', 141) - 4, R('brillent', 141) + 4);
  return (
    <Ecran fg={fg} rouge={0.8} vignette={0.9}>
      <Vue x={540} y={lerp(1010, 1000, k)} z={lerp(1.0, 1.08, k) * punchZ(f - R('brillent', 141), 0.12)}>
        <g filter="url(#flou8)">
          <CouloirMonde cam={camC(0.4)} fg={fg} rouge={1} />
        </g>
        <g transform="translate(540 2350) scale(2.0)">
          <Rond zombie brasG={[95, -10]} brasD={[95, -10]} />
        </g>
      </Vue>
      <g opacity={br}>
        {[-1, 1].map((s) => <circle key={s} cx={540 + s * 240} cy="760" r="210" fill="#ffffff" opacity={0.35 + 0.1 * Math.sin(fg)} filter="url(#hp-flou2)" />)}
      </g>
    </Ecran>
  );
});

// ===================== 5. Le plan : deux chambres, une salle de bain, le couloir bloqué =====================
const Plan = scene('plan', ({f, fg, R}) => {
  const e = (a) => pop(f, a);
  const bloque = pop(f, R('bloqué', 94) - 4);
  return (
    <Ecran fg={fg} vignette={0.5}>
      <defs>
        <pattern id="pl-g" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40,0 L0,0 L0,40" fill="none" stroke="#3a5a9a" strokeWidth="1" opacity="0.5" />
        </pattern>
      </defs>
      <rect width="1080" height="1920" fill="#0e2246" />
      <rect width="1080" height="1920" fill="url(#pl-g)" />
      <g transform={`translate(540 900) scale(${1 + 0.05 * (f / 109)}) translate(-540 -900)`}>
        <text x="540" y="380" textAnchor="middle" fontFamily={POLICE} fontSize="62" fill="#ffc83a" letterSpacing="3" opacity={e(R('deux', 2))}>2 CHAMBRES · 1 SALLE DE BAIN</text>
        {[['412', 100, R('chambres', 7)], ['SDB', 445, R('salle', 36)], ['414', 600, R('chambres', 7) + 4]].map(([n, x, a], k) => {
          const u = e(a);
          const w = k === 1 ? 155 : 380;
          return (
            <g key={k} opacity={u}>
              <text x={x + w / 2} y="510" textAnchor="middle" fontFamily={POLICE} fontSize={k === 1 ? 44 : 70} fill={k === 1 ? '#7ab0ff' : '#ffffff'}>{n}</text>
              <rect x={x} y="540" width={w} height={k === 1 ? 300 : 520} fill="none" stroke="#ffffff" strokeWidth="10" />
              {k !== 1 && <rect x={x + (k ? 200 : 40)} y="580" width="130" height="220" fill="#ffffff" opacity="0.18" />}
              {k !== 1 && <path d={`M${x + (k ? 210 : 170)},1060 a120,120 0 0 1 120,-120`} fill="none" stroke="#ffffff" strokeWidth="5" opacity="0.8" />}
            </g>
          );
        })}
        <rect x="445" y="840" width="155" height="220" fill="#0a1830" stroke="#ffffff" strokeWidth="10" opacity={e(R('salle', 36))} />
        {/* le passage par la salle de bain */}
        <path d="M180,700 L520,700 L520,760 L800,760" stroke="#ffd23a" strokeWidth="10" strokeDasharray="24 18" fill="none" strokeDashoffset={-f * 3} opacity={e(R('salle', 36) + 6)} />
        <circle cx="180" cy={700} r={18 + 4 * Math.sin(f / 4)} fill="#ffd23a" stroke="#000" strokeWidth="5" opacity={e(R('chambres', 7))} />
        <rect x="20" y="1070" width="1040" height="190" fill="none" stroke="#7a9ad0" strokeWidth="5" opacity={e(R('couloir', 83))} />
        <text x="1000" y="1310" textAnchor="end" fontFamily={POLICE} fontSize="40" fill="#9ab0d8" opacity={e(R('couloir', 83))}>COULOIR</text>
        {[...Array(16)].map((_, j) => {
          const u = e(R('couloir', 83) + j * 0.6);
          const x = 120 + random(`zx${j}`) * 520 + 30 * Math.sin(f / 15 + j);
          const y = 1110 + random(`zy${j}`) * 120;
          return <circle key={j} cx={x} cy={y} r={18 * u} fill="#ff5a3a" />;
        })}
        <g opacity={bloque} transform={`translate(380 1165) scale(${bloque})`}>
          <path d="M-80,-80 L80,80 M80,-80 L-80,80" stroke="#ff2a2a" strokeWidth="22" strokeLinecap="round" />
        </g>
      </g>
    </Ecran>
  );
});

// ===================== 6. L'infirmière déboule, verrouille, chuchote : par la salle de bain =====================
const INF = {tenue: 'scrubs', cheveux: 'chignon', peau: '#b07a52'};
const MurChambre = ({children}) => (
  <g>
    <defs>
      <linearGradient id="mc-mur" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#c6d3e6" />
        <stop offset="1" stopColor="#95a9c8" />
      </linearGradient>
    </defs>
    <rect x="-600" y="-200" width="3400" height="1460" fill="url(#mc-mur)" />
    <rect x="-600" y="1040" width="3400" height="220" fill="#8a9ec0" />
    <rect x="-600" y="1034" width="3400" height="12" fill="#e2eaf6" />
    <rect x="-600" y="1260" width="3400" height="900" fill="#5a6886" />
    {children}
  </g>
);
const Infirmiere = scene('infirmiere', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    const ouvre = ease(f, 0, 6, Easing.out(Easing.cubic));
    const entre = ease(f, 3, 26, Easing.out(Easing.cubic));
    const choc = f < 10 ? tremble(fg, 22 * (1 - f / 10), 'ic') : 0;
    return (
      <Ecran fg={fg} rouge={1}>
        <Vue x={540 + choc} y={1000} z={1.15 * punchZ(t, 0.08)} r={choc * 0.1}>
          <MurChambre>
            <MurPorte num="" ouvre={ouvre} fg={fg} sens={1}>
              <ellipse cx="540" cy="1100" rx="300" ry="500" fill="#ff5a3a" opacity="0.35" filter="url(#hp-flou)" />
              {[[420, 0.18], [640, 0.15], [520, 0.12]].map(([x, s], j) => (
                <g key={j} transform={`translate(${x} ${1500 - j * 60}) scale(${s})`}>
                  <Rond {...ZOMBIE(fg / 8, j)} />
                </g>
              ))}
            </MurPorte>
          </MurChambre>
          <g transform={`translate(${lerp(560, 470, entre)} ${lerp(1560, 1820, entre)}) scale(${lerp(0.62, 0.98, entre)})`}>
            <Rond {...INF} profil={-0.2} yeux={1.2} sourcils={-0.6} bouche="serre" brasG={[30 + 25 * Math.sin(fg / 2.2), -30]} brasD={[30 - 25 * Math.sin(fg / 2.2), -30]} jambes={Math.sin(fg / 2.2) * (1 - entre)} />
          </g>
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    const v = R('verrouille', 57);
    const tour = ease(f, v - 6, v, Easing.out(Easing.back(2)));
    const clic = f >= v && f < v + 8;
    return (
      <Ecran fg={fg} rouge={1} dessus={clic && <text x="700" y="640" fontFamily={POLICE} fontSize={110 * pop(f, v)} fill="#ffffff" transform="rotate(-8 700 640)">CLIC</text>}>
        <Vue x={540 + (clic ? tremble(fg, 10, 'cl') : 0)} y={960} z={lerp(1.0, 1.06, k)}>
          <rect x="-200" y="-200" width="1480" height="2320" fill="#b07c48" />
          {[...Array(8)].map((_, j) => <path key={j} d={`M${-100 + j * 170},-200 Q${-60 + j * 170},960 ${-110 + j * 170},2120`} stroke="#8a5a2a" strokeWidth="5" fill="none" opacity="0.3" />)}
          <rect x="820" y="-200" width="300" height="2320" fill="#e8edf4" />
          <rect x="400" y="700" width="280" height="560" rx="40" fill="#c8ccd6" />
          <rect x="400" y="700" width="280" height="80" rx="40" fill="#ffffff" opacity="0.3" />
          <g transform={`translate(540 920) rotate(${90 * tour})`}>
            <circle r="90" fill="#9aa2b2" />
            <rect x="-24" y="-110" width="48" height="220" rx="24" fill="#e8ecf2" />
          </g>
          <circle cx="540" cy="1140" r="36" fill="#3a4050" />
          <circle cx="540" cy="1140" r="16" fill={tour > 0.9 ? '#ff3a3a' : '#3aff7a'} />
          {/* la main de l'infirmière */}
          <g transform={`translate(540 920) rotate(${90 * tour})`}>
            <g transform="translate(-10 -40)">
              <ellipse cx="-160" cy="40" rx="150" ry="110" fill={INF.peau} />
              <rect x="-90" y="-60" width="70" height="140" rx="34" fill={INF.peau} />
              <rect x="-30" y="-50" width="64" height="90" rx="30" fill="#9a6a44" />
              <rect x="-460" y="-20" width="320" height="140" rx="60" fill="#2a4a8a" />
            </g>
          </g>
        </Vue>
      </Ecran>
    );
  }
  if (i === 2) {
    const chut = ease(f, R('chuchote', 84) - 10, R('chuchote', 84) - 2, Easing.out(Easing.cubic));
    const main = ikBras(1, [14, -712], -1);
    return (
      <Ecran fg={fg} rouge={1}>
        <Vue x={540} y={lerp(980, 960, k)} z={punchZ(t, 0.06)}>
          <g filter="url(#flou8)">
            <ChambreMonde f={f} fg={fg} lampe={0.2} />
          </g>
          <g transform="translate(560 2240) scale(1.6)">
            <Rond {...INF} brasDevant cou={16} profil={0.2} yeux={1.15} sourcils={0.5} bouche="chut" pupX={lerp(0, -16, chut)} brasG={[10, 0]} brasD={[lerp(20, main[0], chut), lerp(0, main[1], chut)]} />
          </g>
        </Vue>
      </Ecran>
    );
  }
  // elle pointe, panoramique éclair vers la salle de bain
  const s = R('salle', 109);
  const pan = ease(f, s - 6, s + 4, Easing.inOut(Easing.cubic));
  const vit = Math.abs(ease(f + 1, s - 6, s + 4) - ease(f - 1, s - 6, s + 4));
  return (
    <Ecran fg={fg} rouge={1} flou={[90 * vit, 0]}>
      <Vue x={lerp(560, 1900, pan)} y={960} z={lerp(1.0, 1.12, ease(f, s + 4, 132))}>
        <MurChambre>
          <g transform="translate(560 2000) scale(1.25)">
            <Rond {...INF} cou={16} profil={0.6} yeux={1.15} sourcils={0.3} bouche="serre" pupX={20} brasG={[10, 0]} brasD={[100, -6]} />
          </g>
          <rect x="1680" y="460" width="440" height="1130" fill="#eef2f8" />
          <rect x="1704" y="484" width="392" height="1106" fill="#f4f6fa" />
          <rect x="1704" y="484" width="392" height="1106" fill="#c8d0dc" opacity="0.4" />
          <rect x="2040" y="1020" width="34" height="90" rx="12" fill="#a8b0bc" />
          <g transform="translate(1900 720)">
            <rect x="-150" y="-70" width="300" height="140" rx="20" fill="#1e3a7a" />
            <text y="24" textAnchor="middle" fontFamily={POLICE} fontSize="70" fill="#ffffff">SDB</text>
          </g>
          <ellipse cx="1900" cy="1000" rx="320" ry="600" fill="#ffffff" opacity={0.2 * ease(f, s + 4, s + 10)} filter="url(#hp-flou2)" />
        </MurChambre>
      </Vue>
    </Ecran>
  );
});

// ===================== 7. Trop tard : quelque chose à la porte. Puis dix. Puis vingt. =====================
const PorteMonde = ({f, fg, n, secoue, apparu}) => (
  <g>
    <defs>
      <linearGradient id="po-b" x1="0" y1="0" x2="1" y2="0">
        {[...Array(10)].map((_, j) => <stop key={j} offset={j / 9} stopColor={j % 2 ? '#b07c46' : '#a0703c'} />)}
      </linearGradient>
      <clipPath id="po-v">
        <rect x="360" y="230" width="230" height="900" />
      </clipPath>
    </defs>
    <rect x="-400" y="-200" width="1880" height="2320" fill="#9aaccb" />
    <rect x="120" y="-200" width="900" height="2320" fill="#e8edf4" />
    <rect x="150" y="-200" width="840" height="2320" fill="url(#po-b)" />
    <rect x="150" y="-200" width="840" height="2320" fill="#000" opacity="0.12" />
    <rect x="350" y="220" width="250" height="920" fill="#5a3a1e" />
    <g clipPath="url(#po-v)">
      <rect x="360" y="230" width="230" height="900" fill="#1a0608" />
      <rect x="360" y="230" width="230" height="900" fill="#ff3a2a" opacity={0.25 + 0.1 * Math.sin(fg / 4)} />
      {[...Array(n)].map((_, j) => {
        const x = 380 + random(`px${j}`) * 190;
        const y = 260 + (j / Math.max(1, n - 1)) * 820 + 30 * Math.sin(fg / 10 + j);
        const s = 0.32 + random(`ps${j}`) * 0.12;
        return (
          <g key={j} opacity={j === 0 ? apparu : 1} transform={`translate(${x} ${y + 330 * s}) scale(${s})`}>
            <Rond zombie brasG={[160, -20]} brasD={[150, -10]} />
          </g>
        );
      })}
      {[...Array(Math.min(6, n))].map((_, j) => (
        <g key={`m${j}`} transform={`translate(${400 + (j % 2) * 120} ${330 + j * 140}) scale(0.8)`} opacity={0.9}>
          <circle r="34" fill="#141018" />
          {[-24, -8, 8, 24].map((x, q) => <rect key={q} x={x - 8} y={-80} width="16" height="56" rx="8" fill="#141018" />)}
        </g>
      ))}
      <rect x="360" y="230" width="230" height="900" fill="#c8e0ff" opacity="0.1" />
      <path d="M380,250 L460,250 L380,420 Z" fill="#ffffff" opacity="0.12" />
    </g>
    <g transform={`translate(300 1180) rotate(${secoue * 14} 0 0)`}>
      <circle r="44" fill="#c8ccd8" />
      <rect x="0" y="-18" width="210" height="36" rx="18" fill="#d8dce6" />
      <rect x="0" y="-18" width="210" height="12" rx="6" fill="#ffffff" opacity="0.5" />
    </g>
    <rect x="120" y="1580" width="900" height="600" fill="#5a6886" />
  </g>
);
const Porte = scene('porte', ({f, fg, i, t, k, R}) => {
  const n = f < R('dix', 72) - 2 ? 1 : f < R('vingt', 98) - 2 ? 10 : 20;
  const secoue = f > R('porte', 47) ? Math.sin(f * 1.9) * (n > 1 ? 1 : 0.4) : 0;
  const apparu = ease(f, R('quelque', 24) - 6, R('porte', 47));
  const coup = f > R('porte', 47) && f % 10 < 3 ? tremble(fg, 12, 'pc') : 0;
  const monde = <PorteMonde f={f} fg={fg} n={n} secoue={secoue} apparu={apparu} />;
  if (i === 0) {
    return (
      <Ecran fg={fg} rouge={1}>
        <Vue x={540 + coup} y={lerp(860, 820, k)} z={lerp(1.15, 1.35, k)}>{monde}</Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    return (
      <Ecran fg={fg} rouge={1}>
        <Vue x={380 + coup} y={1180} z={lerp(2.6, 2.8, k) * punchZ(t)} r={-6}>{monde}</Vue>
      </Ecran>
    );
  }
  if (i === 2) {
    return (
      <Ecran fg={fg} rouge={1}>
        <Vue x={475 + coup} y={lerp(700, 660, k)} z={lerp(1.8, 1.95, k) * punchZ(t)}>{monde}</Vue>
      </Ecran>
    );
  }
  return (
    <Ecran fg={fg} rouge={1}>
      <Vue x={540 + coup} y={820} z={1.2 * punchZ(t, 0.06)}>
        <g filter="url(#flou4)">{monde}</g>
      </Vue>
      <g transform={`translate(${lerp(300, 330, k)} 2260) scale(1.75)`}>
        <Rond cou={16} profil={0.55} yeux={1.4} pupX={26} pupY={-14} bouche="cri" sourcils={1} sueur={(f / 18) % 1} larmes={(f / 24) % 1} brasG={[10, 0]} brasD={[10, 0]} souffle={Math.sin(fg / 2.5) * 10} />
      </g>
    </Ecran>
  );
});

const course = (ph) => ({jambes: Math.sin(ph), brasG: [40 + 32 * Math.sin(ph), -40], brasD: [40 - 32 * Math.sin(ph), -40]});

// ===================== 8. La salle de bain, la 414, tu cours… et oui, ta blouse est ouverte derrière =====================
const Fuite = scene('fuite', ({f, fg, i, t, k, d: dd, R}) => {
  if (i === 0) {
    const u = ease(t, 0, dd, Easing.inOut(Easing.sin));
    const bob = Math.abs(Math.sin(fg / 2.5)) * -24;
    return (
      <Ecran fg={fg} rouge={0.6}>
        <Vue x={lerp(400, 1500, u)} y={1000} z={1.05}>
          <defs>
            <linearGradient id="sb-c" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#e4eef8" />
              <stop offset="1" stopColor="#b8c8dc" />
            </linearGradient>
          </defs>
          <rect x="-400" y="-200" width="2800" height="1600" fill="url(#sb-c)" />
          {[...Array(23)].map((_, j) => <path key={j} d={`M${-400 + j * 120},-200 L${-400 + j * 120},1400`} stroke="#ffffff" strokeWidth="5" />)}
          {[...Array(13)].map((_, j) => <path key={j} d={`M-400,${-200 + j * 120} L2400,${-200 + j * 120}`} stroke="#ffffff" strokeWidth="5" />)}
          <rect x="-400" y="1340" width="2800" height="800" fill="#7a8aa8" />
          <rect x="-400" y="1330" width="2800" height="20" fill="#5a6886" />
          <rect x="300" y="360" width="320" height="400" rx="24" fill="#a8c8e8" stroke="#f4f6fa" strokeWidth="16" />
          <path d="M340,420 L440,420 L340,560 Z" fill="#ffffff" opacity="0.4" />
          <path d="M290,840 L630,840 L600,960 L320,960 Z" fill="#f4f6fa" />
          <rect x="420" y="960" width="80" height="380" fill="#e4e8f0" />
          <rect x="860" y="980" width="200" height="360" rx="50" fill="#f4f6fa" />
          <rect x="840" y="900" width="240" height="120" rx="30" fill="#ffffff" />
          <rect x="1150" y="100" width="420" height="1240" fill="#f4f6fa" opacity="0.6" />
          {[...Array(7)].map((_, j) => <path key={j} d={`M${1170 + j * 60},110 q20,600 0,1220`} stroke="#c8d4e4" strokeWidth="8" fill="none" />)}
          <rect x="1820" y="300" width="420" height="1040" fill="#e8edf4" />
          <rect x="1840" y="320" width="380" height="1020" fill="#b07c46" />
          <text x="2030" y="460" textAnchor="middle" fontFamily={POLICE} fontSize="80" fill="#ffffff">414</text>
          <g transform={`translate(${lerp(700, 1700, u) + 200} ${1400 + bob}) scale(0.95)`}>
            <Rond {...INF} profil={0.8} yeux={1.1} sourcils={-0.4} bouche="serre" {...course(fg / 2.5 + 1)} />
          </g>
          <g transform={`translate(${lerp(700, 1700, u) - 120} ${1420 - bob}) scale(1.0)`}>
            <Rond profil={0.8} yeux={1.3} sourcils={1} bouche="o" sueur={0.7} {...course(fg / 2.5)} />
          </g>
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    const sors = R('sors', 50);
    const ouvre = ease(f, sors - 6, sors, Easing.out(Easing.cubic));
    const u = ease(f, sors - 2, 64, Easing.in(Easing.quad));
    const choc = f >= sors && f < sors + 8 ? tremble(fg, 24, 'fs') : 0;
    return (
      <Ecran fg={fg} rouge={1}>
        <Vue x={540 + choc} y={1000} z={1.1 * punchZ(f - sors, 0.08)} r={choc * 0.08}>
          <MurPorte num="414" ouvre={ouvre} fg={fg} sens={1} couloirRouge={false}>
            <rect x="324" y="500" width="432" height="1090" fill="#c8d4e8" />
          </MurPorte>
          {f > sors - 2 && (
            <g>
              <g transform={`translate(${lerp(560, -160, u)} ${lerp(1600, 1900, u)}) scale(${lerp(0.75, 1.4, u)})`}>
                <Rond {...INF} profil={-0.6} yeux={1.1} sourcils={-0.4} bouche="serre" {...course(fg / 2.3 + 1)} />
              </g>
              <g transform={`translate(${lerp(560, 160, ease(f, sors + 4, 64, Easing.in(Easing.quad)))} ${lerp(1600, 1920, ease(f, sors + 4, 64))}) scale(${lerp(0.75, 1.5, ease(f, sors + 4, 64, Easing.in(Easing.quad)))})`}>
                <Rond profil={-0.5} yeux={1.3} sourcils={1} bouche="cri" sueur={0.8} {...course(fg / 2.3)} />
              </g>
            </g>
          )}
        </Vue>
      </Ecran>
    );
  }
  if (i === 2) {
    // de face : vous courez vers la caméra, eux derrière (on regarde vers l'entrée du service)
    const cam = camC(lerp(0.0, 0.5, k), {y: -230 + Math.sin(fg / 2.5) * 10});
    const persos = [
      {X: 90, Z: cam.z + 0.95, profil: 0.15, yeux: 1.35, bouche: 'cri', sourcils: 1, sueur: (f / 15) % 1, ...course(fg / 2.4)},
      {X: -150, Z: cam.z + 1.2, ...INF, yeux: 1.2, bouche: 'serre', sourcils: -0.5, ...course(fg / 2.4 + 1)},
      ...[[-120, 2.4], [150, 2.1], [0, 3.0], [-220, 3.6], [210, 4.2]].map(([X, z], j) => ({X, Z: cam.z + z - t * 0.012, ...ZOMBIE(fg / 5, j)})),
    ];
    return (
      <Ecran fg={fg} rouge={1} flou={[0, 1.5]}>
        <Vue r={Math.sin(fg / 5) * 1.2} z={punchZ(f - R('cours', 104), 0.06)}>
          <CouloirMonde cam={cam} fg={fg} rouge={1} envers persos={persos} />
        </Vue>
      </Ecran>
    );
  }
  // de dos : la blouse ouverte (et le caleçon à carreaux)
  const oui = R('oui', 124);
  const der = R('derrière', 161);
  const cam = camC(lerp(0.4, 1.4, k), {y: -260});
  const zoomFesses = ease(f, oui - 3, oui + 3, Easing.out(Easing.cubic)) * (1 - ease(f, oui + 14, oui + 22)) + ease(f, der - 3, der + 3, Easing.out(Easing.cubic));
  const Zm = cam.z + 1.3;
  const [hx, hy, hk] = proj(cam, 0, CSOL, Zm);
  return (
    <Ecran fg={fg} rouge={1}>
      <Vue x={lerp(540, hx, zoomFesses)} y={lerp(960, hy - 230 * hk * 0.62, zoomFesses)} z={lerp(1, 2.6, zoomFesses)} r={Math.sin(fg / 5) * 1.2 * (1 - zoomFesses)}>
        <CouloirMonde cam={cam} fg={fg} rouge={1} persos={[
          {X: 0, Z: Zm, dos: true, ...course(fg / 2.4)},
          {X: -170, Z: cam.z + 2.6, ...INF, dos: true, ...course(fg / 2.4 + 1)},
        ]} />
      </Vue>
      {/* les zombies juste derrière (premier plan flou) */}
      <g filter="url(#flou8)" opacity={1 - zoomFesses}>
        <g transform={`translate(${-60 + 20 * Math.sin(fg / 6)} 2500) scale(1.6)`}><Rond {...ZOMBIE(fg / 6, 0)} /></g>
        <g transform={`translate(${1140 + 20 * Math.sin(fg / 7)} 2600) scale(1.7)`}><Rond {...ZOMBIE(fg / 6, 2)} /></g>
      </g>
    </Ecran>
  );
});

// ===================== 9. L'ascenseur ou l'escalier ? L'ascenseur s'ouvre… il est plein. =====================
// le fond du couloir vu de face : l'ascenseur (x ≈ 540) et la porte de l'escalier de secours (x ≈ 1500)
const AscenseurMonde = ({fg, ouvre = 0, yeux = 0, ding = 0, porteEsc = 0, persos = null}) => {
  const W = 290 * ouvre;
  return (
    <g>
      <defs>
        <linearGradient id="as-mur" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c0cde2" />
          <stop offset="1" stopColor="#8ea2c2" />
        </linearGradient>
        <linearGradient id="as-inox" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c8d0dc" />
          <stop offset="0.5" stopColor="#eef2f8" />
          <stop offset="1" stopColor="#a8b2c2" />
        </linearGradient>
        <clipPath id="as-clip">
          <rect x="250" y="460" width="580" height="1130" />
        </clipPath>
      </defs>
      <rect x="-600" y="-200" width="3000" height="1820" fill="url(#as-mur)" />
      <rect x="-600" y="1150" width="3000" height="36" rx="12" fill="#c89a62" />
      <rect x="-600" y="1620" width="3000" height="600" fill="#6a7896" />
      <rect x="-600" y="1580" width="3000" height="44" fill="#2a3450" />
      {/* escalier de secours */}
      <g transform="translate(960 0)">
        <MurPorte num="ESCALIER" plaque="#1a9a4a" ouvre={porteEsc} fg={fg} sens={1} couloirRouge={false}>
          <rect x="324" y="500" width="432" height="1090" fill="#2a3a34" />
          <path d="M324,1590 L756,1300 L756,1590 Z" fill="#4a5a54" />
        </MurPorte>
        <rect x="390" y="260" width="300" height="100" rx="12" fill="#1ac85a" />
        <text x="540" y="336" textAnchor="middle" fontFamily={POLICE} fontSize="70" fill="#ffffff">SORTIE</text>
        <ellipse cx="540" cy="310" rx="300" ry="160" fill="#3aff8a" opacity="0.35" filter="url(#hp-flou)" />
      </g>
      {/* ascenseur */}
      <rect x="220" y="430" width="640" height="1170" rx="10" fill="#7a8496" />
      <g clipPath="url(#as-clip)">
        <rect x="250" y="460" width="580" height="1130" fill="#2a2830" />
        <rect x="250" y="460" width="580" height="1130" fill="#ff3a2a" opacity={0.12 + 0.08 * Math.sin(fg / 2)} />
        <rect x="250" y="460" width="580" height="160" fill="#ffe8b0" opacity={0.18 * ouvre} />
        {[[330, 1640, 0.62], [740, 1640, 0.6], [540, 1660, 0.66], [420, 1700, 0.72], [660, 1700, 0.74], [300, 1760, 0.8], [800, 1760, 0.8], [540, 1790, 0.86]].map(([x, y, s], j) => (
          <g key={j} transform={`translate(${x + 8 * Math.sin(fg / 7 + j)} ${y}) scale(${s * (1 + 0.06 * yeux)})`}>
            <Rond {...ZOMBIE(fg / 9, j)} sansYeux={yeux < 0.5} brasG={[lerp(20, 95, yeux), -10]} brasD={[lerp(20, 100, yeux), -10]} />
          </g>
        ))}
        <rect x={250 - W} y="460" width="290" height="1130" fill="url(#as-inox)" />
        <rect x={540 + W} y="460" width="290" height="1130" fill="url(#as-inox)" />
        <rect x={538 - W} y="460" width="4" height="1130" fill="#5a6274" />
      </g>
      <rect x="400" y="300" width="280" height="100" rx="14" fill="#120c08" />
      <text x="500" y="378" textAnchor="middle" fontFamily={POLICE} fontSize="80" fill="#ffa03a">4</text>
      <path d="M600,370 L630,320 L660,370 Z" fill="#ffa03a" opacity={ding > 0 ? 1 : 0.3} />
      {ding > 0 && <ellipse cx="540" cy="350" rx="260" ry="140" fill="#ffb03a" opacity={0.45 * ding} filter="url(#hp-flou)" />}
      <rect x="900" y="980" width="70" height="150" rx="14" fill="#d8dee6" />
      <circle cx="935" cy="1025" r="20" fill={ding > 0 ? '#ffd23a' : '#a8b0bc'} />
      <circle cx="935" cy="1085" r="20" fill="#a8b0bc" />
      {persos}
    </g>
  );
};
const Ascenseur = scene('ascenseur', ({f, fg, i, t, k, R}) => {
  const asc = ease(f, R('lascenseur', 31) - 2, R('lascenseur', 31) + 6);
  if (i === 0) {
    const cam = camC(lerp(5.0, 5.8, k), {y: -230});
    const persos = [
      {X: 120, Z: 6.9, dos: true, brasG: [20, 0], brasD: [20, 0], souffle: Math.sin(fg / 3) * 10},
      {X: -110, Z: 7.1, ...INF, dos: true, brasG: [20, 0], brasD: [60, 20]},
    ];
    return (
      <Ecran fg={fg} rouge={1}>
        <Vue z={punchZ(t, 0.05)}>
          <CouloirMonde cam={cam} fg={fg} rouge={1} persos={persos} asc={asc} sortie={0.3} />
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    // panoramique éclair : de l'ascenseur à la sortie de secours
    const e = R('lescalier', 56);
    const pan = ease(f, e - 6, e + 3);
    const vit = Math.abs(ease(f + 1, e - 6, e + 3) - ease(f - 1, e - 6, e + 3));
    return (
      <Ecran fg={fg} rouge={1} flou={[90 * vit, 0]}>
        <Vue x={lerp(540, 1500, pan)} y={lerp(900, 860, k)} z={1.2}>
          <AscenseurMonde fg={fg} ding={1} />
        </Vue>
      </Ecran>
    );
  }
  if (i === 2) {
    const ouvre = ease(f, R('souvrent', 103) - 10, R('souvrent', 103) + 22, Easing.inOut(Easing.sin));
    const yeux = f >= R('plein', 142) - 3 ? 1 : 0;
    const choc = yeux && f < R('plein', 142) + 8 ? tremble(fg, 18, 'as') : 0;
    return (
      <Ecran fg={fg} rouge={1}>
        <Vue x={540 + choc} y={lerp(1040, 1000, k)} z={lerp(1.35, 1.55, k) * (yeux ? punchZ(f - R('plein', 142) + 3, 0.12) : 1)}>
          <AscenseurMonde fg={fg} ouvre={ouvre} yeux={yeux} ding={1 - ouvre * 0.5} />
        </Vue>
      </Ecran>
    );
  }
  // demi-tour : ils foncent dans l'escalier
  const es = R('escalier', 163);
  const ouvre = ease(f, es - 4, es + 3, Easing.out(Easing.cubic));
  const u = ease(t, 0, 40, Easing.in(Easing.quad));
  const choc = f >= es && f < es + 8 ? tremble(fg, 20, 'es') : 0;
  return (
    <Ecran fg={fg} rouge={1}>
      <Vue x={1500 + choc} y={1000} z={1.1 * punchZ(f - es, 0.08)}>
        <AscenseurMonde fg={fg} ouvre={1} yeux={1} porteEsc={ouvre}
          persos={
            <g>
              <g transform={`translate(${lerp(900, 1500, Math.min(1, u * 1.2))} ${lerp(1700, 1560, u)}) scale(${lerp(0.95, 0.6, u)})`}>
                <Rond {...INF} profil={0.7} bouche="serre" sourcils={-0.5} {...course(fg / 2.3 + 1)} />
              </g>
              <g transform={`translate(${lerp(760, 1460, u)} ${lerp(1760, 1580, u)}) scale(${lerp(1.05, 0.62, u)})`}>
                <Rond profil={0.7} yeux={1.3} bouche="cri" sourcils={1} sueur={0.8} {...course(fg / 2.3)} />
              </g>
            </g>
          } />
      </Vue>
    </Ecran>
  );
});

// ===================== 10. Quatre étages pieds nus, les points de suture qui tirent =====================
// la cage d'escalier vue de haut (vertige)
const CageVue = ({fg, f, u}) => (
  <g>
    <rect x="-400" y="-200" width="1880" height="2320" fill="#0e1014" />
    {[...Array(7)].map((_, j) => {
      const s = 1 - j * 0.13;
      const w = 900 * s;
      const h = 1500 * s;
      const c = Math.round(160 - j * 20);
      return (
        <g key={j}>
          <rect x={540 - w / 2} y={960 - h / 2} width={w} height={h} rx="20" fill={`rgb(${c},${c + 8},${c + 20})`} />
          <rect x={540 - w / 2 + 120 * s} y={960 - h / 2 + 120 * s} width={w - 240 * s} height={h - 240 * s} rx="12" fill={`rgb(${c - 50},${c - 44},${c - 36})`} />
          <rect x={540 - w / 2 + 116 * s} y={960 - h / 2 + 116 * s} width={w - 232 * s} height={h - 232 * s} rx="12" fill="none" stroke="#e8c070" strokeWidth={10 * s} />
          {j < 5 && <text x={540 - w / 2 + 60 * s} y={960 - h / 2 + 90 * s} textAnchor="middle" fontFamily={POLICE} fontSize={70 * s} fill="#1ac85a">{4 - j}</text>}
        </g>
      );
    })}
    <rect x="490" y="910" width="100" height="100" fill="#000" />
    {/* vous deux, vus d'en haut, qui tournent en descendant */}
    {[0, 1].map((q) => {
      const a = u * Math.PI * 3.2 - q * 0.5;
      const lvl = u * 3.5 - q * 0.12;
      const s = 1 - lvl * 0.13;
      const x = 540 + Math.cos(a) * 390 * s;
      const y = 960 + Math.sin(a) * 680 * s;
      return (
        <g key={q} transform={`translate(${x} ${y}) scale(${0.28 * s})`}>
          <ellipse cx="0" cy="40" rx="150" ry="110" fill={q ? '#2a4a8a' : '#a8ccf4'} />
          <circle r="120" fill={q ? '#1a1210' : '#141218'} />
          {q === 1 && <circle cx="0" cy="-20" r="56" fill="#2a1a14" />}
        </g>
      );
    })}
  </g>
);
// une volée de marches vue de côté
const Marches = ({fg, persos = null, etage = 3}) => (
  <g>
    <defs>
      <linearGradient id="ma-mur" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#a8b2c0" />
        <stop offset="1" stopColor="#6a7484" />
      </linearGradient>
    </defs>
    <rect x="-800" y="-600" width="3200" height="3400" fill="url(#ma-mur)" />
    <text x="760" y="520" textAnchor="middle" fontFamily={POLICE} fontSize="420" fill="#1ac85a" opacity="0.85">{etage}</text>
    <rect x="-800" y="700" width="3200" height="30" fill="#1ac85a" opacity="0.7" />
    {[...Array(26)].map((_, j) => <rect key={j} x={-300 + j * 80} y={600 + j * 60} width="90" height="2400" fill={j % 2 ? '#5a6474' : '#545e6e'} />)}
    {[...Array(26)].map((_, j) => <rect key={`n${j}`} x={-300 + j * 80} y={600 + j * 60} width="90" height="10" fill="#e8c070" opacity="0.8" />)}
    <path d="M-340,420 L1800,2020" stroke="#c89a62" strokeWidth="22" strokeLinecap="round" />
    {[...Array(9)].map((_, j) => <path key={j} d={`M${-260 + j * 240},${480 + j * 180} l0,180`} stroke="#8a929e" strokeWidth="10" />)}
    {persos}
    <ellipse cx="300" cy="-100" rx="500" ry="300" fill="#ffffff" opacity="0.15" filter="url(#hp-flou2)" />
  </g>
);
const Escalier = scene('escalier', ({f, fg, i, t, k, d, R}) => {
  if (i === 0) {
    const u = ease(t, 0, d, Easing.inOut(Easing.sin));
    return (
      <Ecran fg={fg} rouge={0.55}>
        <Vue x={540} y={960} z={lerp(1.1, 1.5, u)} r={lerp(0, 40, u)}>
          <CageVue fg={fg} f={f} u={u} />
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    // pieds nus sur les marches : travelling en diagonale
    const u = ease(t, 0, d, Easing.linear);
    const pos = (q) => {
      const x = lerp(100, 1300, u) - q * 300;
      return [x, 600 + ((x + 300) / 80) * 60 - 40];
    };
    const [hx, hy] = pos(0);
    return (
      <Ecran fg={fg} rouge={0.55}>
        <Vue x={hx + 60} y={hy - 300} z={1.15} r={-4}>
          <Marches fg={fg} etage={lerp(3, 2, u) > 2.5 ? 3 : 2}
            persos={
              <g>
                {[1, 0].map((q) => {
                  const [x, y] = pos(q);
                  const bob = Math.abs(Math.sin(fg / 2.2 + q)) * -26;
                  return (
                    <g key={q} transform={`translate(${x} ${y + bob}) rotate(-6) scale(0.82)`}>
                      <Rond {...(q ? INF : {})} profil={0.75} yeux={q ? 1.1 : 1.3} bouche={q ? 'serre' : 'o'} sourcils={q ? -0.4 : 0.9} {...course(fg / 2.2 + q)} />
                    </g>
                  );
                })}
              </g>
            } />
        </Vue>
      </Ecran>
    );
  }
  if (i === 2) {
    // gros plan : la grimace, la main sur le ventre
    const main = ikBras(-1, [-30, -330], -1);
    return (
      <Ecran fg={fg} rouge={0.55}>
        <Vue x={540} y={960 + Math.sin(fg / 2.2) * 14} z={1}>
          <g filter="url(#flou8)" transform={`translate(0 ${-((fg * 40) % 600)})`}>
            <Marches fg={fg} etage={2} />
          </g>
          <g transform="translate(540 2150) scale(1.55)">
            <Rond brasDevant cou={16} profil={0.3} yeux={0.75} bouche="serre" sourcils={1.1} sueur={(f / 14) % 1} brasG={main} brasD={[40 + 30 * Math.sin(fg / 2.2), -40]} souffle={Math.sin(fg / 2.5) * 12} />
          </g>
        </Vue>
      </Ecran>
    );
  }
  // insert : le pansement qui rougit
  const rouge = ease(f, R('ventre', 149) - 6, 167);
  return (
    <Ecran fg={fg} rouge={0.45}>
      <Vue x={540} y={960} z={lerp(1, 1.08, k) * punchZ(f - R('ventre', 149), 0.08)}>
        <rect x="-200" y="-200" width="1480" height="2320" fill="#a8ccf4" />
        <pattern id="es-pois" width="76" height="76" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="20" r="10" fill="#5a8ad8" />
          <circle cx="58" cy="58" r="10" fill="#5a8ad8" />
        </pattern>
        <rect x="-200" y="-200" width="1480" height="2320" fill="url(#es-pois)" opacity="0.6" />
        <path d="M-200,700 Q540,560 1280,720 L1280,1500 Q540,1380 -200,1520 Z" fill="#f0c7a0" />
        <path d="M-200,700 Q540,560 1280,720" stroke="#88b0e0" strokeWidth="30" fill="none" />
        <rect x="380" y="840" width="380" height="300" rx="30" fill="#f8f8f4" transform="rotate(-8 570 990)" />
        <ellipse cx="570" cy="990" rx={60 + 70 * rouge} ry={30 + 40 * rouge} fill="#b0101a" opacity={0.25 + 0.6 * rouge} filter="url(#hp-ombre)" />
        {[0, 1, 2, 3].map((j) => <path key={j} d={`M${470 + j * 60},${960 - j * 8} l0,60`} stroke="#3a2a4a" strokeWidth="6" opacity="0.5" />)}
        <g transform={`translate(${880 + 10 * Math.sin(fg / 3)} 1180)`}>
          <ellipse rx="170" ry="120" fill="#f0c7a0" />
          {[-100, -40, 20, 80].map((x) => <rect key={x} x={x - 26} y="-230" width="52" height="160" rx="26" fill="#f0c7a0" transform="rotate(-20)" />)}
        </g>
      </Vue>
    </Ecran>
  );
});

// ===================== 11. Rez-de-chaussée : porte bloquée. Il reste le sous-sol. =====================
const PalierRdc = ({fg, secoue = 0, persos = null}) => (
  <g>
    <rect x="-600" y="-200" width="2280" height="2320" fill="#9aa4b4" />
    <rect x="-600" y="1580" width="2280" height="600" fill="#5a6474" />
    <text x="900" y="760" textAnchor="middle" fontFamily={POLICE} fontSize="360" fill="#1ac85a" opacity="0.85">0</text>
    <text x="900" y="900" textAnchor="middle" fontFamily={POLICE} fontSize="80" fill="#1ac85a" opacity="0.85">RDC</text>
    <g transform={`translate(${secoue * 6} 0)`}>
      <rect x="140" y="440" width="560" height="1150" fill="#d8dee6" />
      <rect x="164" y="464" width="512" height="1126" fill="#5a7a74" />
      <rect x="320" y="560" width="200" height="300" fill="#141a20" />
      <rect x="200" y="1020" width="440" height="40" rx="18" fill="#d8dee6" />
      <rect x="200" y="1020" width="440" height="12" rx="6" fill="#ffffff" opacity="0.5" />
    </g>
    {persos}
  </g>
);
const Rez = scene('rez', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    const pousse = f > 14 ? Math.sin(f * 2.2) * ease(f, 14, 20) : 0;
    return (
      <Ecran fg={fg} rouge={0.55}>
        <Vue x={460} y={1000} z={lerp(1.1, 1.18, k) * punchZ(t)}>
          <PalierRdc fg={fg} secoue={pousse}
            persos={
              <g>
                <g transform={`translate(${430 + pousse * 10} 1700) scale(1.0)`}>
                  <Rond {...INF} dos brasG={[150, 20]} brasD={[150, 20]} />
                </g>
                <g transform="translate(860 1780) scale(1.05)">
                  <Rond dos brasG={[20, 0]} brasD={[20, 0]} souffle={Math.sin(fg / 3) * 10} />
                </g>
              </g>
            } />
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    // à travers la vitre : ils sont collés de l'autre côté
    const coup = f % 9 < 3 ? tremble(fg, 14, 'rz') : 0;
    return (
      <Ecran fg={fg} rouge={1}>
        <Vue x={475 + coup} y={lerp(700, 660, k)} z={1.75 * punchZ(t)}>
          <PorteMonde f={f} fg={fg} n={8} secoue={Math.sin(f * 1.9)} apparu={1} />
        </Vue>
      </Ecran>
    );
  }
  // les marches qui descendent dans le noir, « -1 SOUS-SOL » qui grésille
  const gr = random(`ss${Math.floor(fg / 3)}`) < 0.35 ? 0.2 : 1;
  const sign = ease(f, R('sous-sol', 130) - 4, R('sous-sol', 130) + 2);
  return (
    <Ecran fg={fg} rouge={0.45}>
      <Vue x={540} y={lerp(1000, 1080, k)} z={lerp(1.0, 1.12, k)}>
        <defs>
          <linearGradient id="rz-noir" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6a7484" />
            <stop offset="1" stopColor="#020204" />
          </linearGradient>
        </defs>
        <rect x="-400" y="-200" width="1880" height="2320" fill="#4a5262" />
        {[...Array(12)].map((_, j) => {
          const w = 900 - j * 50;
          const y = 900 + j * 70;
          return <rect key={j} x={540 - w / 2} y={y} width={w} height="70" fill={`rgb(${110 - j * 9},${118 - j * 9},${130 - j * 10})`} />;
        })}
        <rect x="-400" y="900" width="1880" height="1300" fill="url(#rz-noir)" opacity="0.55" />
        <path d="M80,900 L300,1800 M1000,900 L780,1800" stroke="#c89a62" strokeWidth="18" />
        <g transform="translate(540 600)" opacity={gr * (0.35 + 0.65 * sign)}>
          <rect x="-260" y="-80" width="520" height="160" rx="16" fill="#1ac85a" />
          <text y="40" textAnchor="middle" fontFamily={POLICE} fontSize="100" fill="#ffffff">-1 · SOUS-SOL</text>
          <ellipse rx="400" ry="200" fill="#3aff8a" opacity="0.3" filter="url(#hp-flou)" />
        </g>
        <g transform="translate(300 2060) scale(1.3)"><Rond dos brasG={[20, 0]} brasD={[20, 0]} souffle={Math.sin(fg / 3) * 10} /></g>
        <g transform="translate(800 2120) scale(1.35)"><Rond {...INF} dos brasG={[20, 0]} brasD={[30, 10]} /></g>
      </Vue>
    </Ecran>
  );
});

// ===================== 12. La morgue : froid, tiroirs ouverts… tous vides =====================
const MorgueMonde = ({fg, f, ouvert = () => 0, flick = 1, porte = 0}) => (
  <g>
    <defs>
      <linearGradient id="mo-mur" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8aa0b8" />
        <stop offset="1" stopColor="#4a5a72" />
      </linearGradient>
      <linearGradient id="mo-inox" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#e8eef4" />
        <stop offset="1" stopColor="#8a96a8" />
      </linearGradient>
    </defs>
    <rect x="-600" y="-200" width="2280" height="2320" fill="url(#mo-mur)" />
    {[...Array(14)].map((_, j) => <path key={j} d={`M-600,${1500 + j * 60} L1680,${1500 + j * 60}`} stroke="#3a4a60" strokeWidth="3" />)}
    <rect x="-600" y="1480" width="2280" height="800" fill="#5a6a82" opacity="0.6" />
    {/* néon */}
    <rect x="240" y="90" width="600" height="30" rx="14" fill={flick > 0.5 ? '#f0faff' : '#5a6a7a'} />
    <ellipse cx="540" cy="300" rx="700" ry="400" fill="#dff4ff" opacity={0.3 * flick} filter="url(#hp-flou2)" />
    <text x="540" y="260" textAnchor="middle" fontFamily={POLICE} fontSize="90" fill="#2a3a5a" letterSpacing="10">MORGUE</text>
    {/* le mur de tiroirs */}
    <rect x="70" y="330" width="940" height="1170" rx="16" fill="#9aa6b6" />
    {[...Array(12)].map((_, j) => {
      const c = j % 4;
      const r = Math.floor(j / 4);
      const x = 100 + c * 225;
      const y = 360 + r * 380;
      const o = ouvert(j);
      return (
        <g key={j}>
          <rect x={x} y={y} width="205" height="350" rx="12" fill="#0a0e14" />
          <g transform={`translate(${x + 102} ${y + 175}) scale(${1 + 0.45 * o}) translate(${-102} ${-175 + 120 * o})`}>
            <rect width="205" height="350" rx="12" fill="url(#mo-inox)" />
            {o > 0.05 && <rect x="10" y="350" width="185" height={140 * o} fill="#c8d0dc" />}
            {o > 0.05 && <path d={`M30,${350 + 40 * o} q40,${-20 * o} 80,0 t70,${10 * o}`} stroke="#f4f6fa" strokeWidth="18" fill="none" />}
            <rect x="72" y="40" width="60" height="40" rx="4" fill="#f4f6fa" />
            <rect x="62" y="250" width="80" height="22" rx="11" fill="#5a6474" />
          </g>
        </g>
      );
    })}
    {/* la porte par laquelle vous entrez (à gauche) */}
    {porte > 0 && <rect x="-560" y="400" width="420" height="1100" fill="#1ac85a" opacity={0.25 * porte} filter="url(#hp-flou)" />}
  </g>
);
const Vapeur = ({fg, x, y, s = 1}) => (
  <g>
    {[0, 1, 2].map((j) => {
      const u = ((fg / 24 + j / 3) % 1);
      return <ellipse key={j} cx={x + 60 * u * s} cy={y - 140 * u * s} rx={(30 + 60 * u) * s} ry={(20 + 40 * u) * s} fill="#ffffff" opacity={0.5 * (1 - u)} filter="url(#hp-flou)" />;
    })}
  </g>
);
const Morgue = scene('morgue', ({f, fg, i, t, k, R}) => {
  const flick = random(`mf${Math.floor(fg / 2)}`) < 0.2 ? 0.2 : 1;
  const BLEU = ['#7aa8ff', 0.35];
  const ouv = R('ouverts', 121);
  const ouvert = (j) => ease(f, ouv - 10 + ((j * 7) % 12), ouv - 2 + ((j * 7) % 12), Easing.out(Easing.back(1.4)));
  if (i === 0) {
    const entre = ease(t, 4, 50, Easing.out(Easing.quad));
    return (
      <Ecran fg={fg} teinte={BLEU}>
        <Vue x={lerp(400, 460, k)} y={1000} z={lerp(1.05, 1.15, k)}>
          <MorgueMonde fg={fg} f={f} flick={flick} />
          <g transform={`translate(${lerp(-200, 260, entre)} ${lerp(1700, 1820, entre)}) scale(1.0)`}>
            <Rond {...INF} profil={0.6} yeux={1.2} sourcils={0.6} bouche="serre" {...course(fg / 4)} jambes={Math.sin(fg / 4) * (1 - entre)} />
          </g>
          <g transform={`translate(${lerp(-420, 40, entre)} ${lerp(1760, 1900, entre)}) scale(1.08)`}>
            <Rond profil={0.6} yeux={1.25} sourcils={1} bouche="o" {...course(fg / 4 + 1)} jambes={Math.sin(fg / 4 + 1) * (1 - entre)} />
          </g>
          <Vapeur fg={fg} x={130} y={980} s={1.3} />
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    // il fait froid : tu grelottes, la buée sort de ta bouche
    const gr = tremble(fg, 8, 'gr');
    return (
      <Ecran fg={fg} teinte={BLEU}>
        <Vue x={540 + gr} y={980} z={punchZ(t, 0.06)}>
          <g filter="url(#flou8)">
            <MorgueMonde fg={fg} f={f} flick={flick} />
          </g>
          <g transform="translate(540 2160) scale(1.6)">
            <Rond brasDevant cou={16} profil={-0.2} yeux={1.2} bouche="serre" sourcils={0.9} brasG={ikBras(-1, [80, -420])} brasD={ikBras(1, [-80, -430])} />
          </g>
          <Vapeur fg={fg} x={560} y={1030} s={2} />
          <rect x="-400" y="-200" width="1880" height="2320" fill="none" stroke="#e8f8ff" strokeWidth="160" opacity="0.25" filter="url(#hp-flou2)" />
        </Vue>
      </Ecran>
    );
  }
  if (i === 2) {
    return (
      <Ecran fg={fg} teinte={BLEU}>
        <Vue x={540} y={lerp(960, 920, k)} z={lerp(1.1, 1.2, k) * punchZ(f - ouv, 0.06)}>
          <MorgueMonde fg={fg} f={f} flick={flick} ouvert={ouvert} />
        </Vue>
      </Ecran>
    );
  }
  // gros plan dans un tiroir : vide, le drap déchiré
  const vides = R('vides', 178);
  return (
    <Ecran fg={fg} teinte={BLEU}>
      <Vue x={lerp(320, 330, k)} y={lerp(1120, 1080, k)} z={lerp(2.6, 3.1, k) * punchZ(f - vides, 0.14)}>
        <MorgueMonde fg={fg} f={f} flick={flick} ouvert={() => 1} />
        {/* traces de griffes à l'intérieur */}
        {[0, 1, 2].map((j) => <path key={j} d={`M${300 + j * 22},${930} l${12},${110}`} stroke="#3a0a10" strokeWidth="6" strokeLinecap="round" opacity={f > vides - 4 ? 0.9 : 0.5} />)}
      </Vue>
    </Ecran>
  );
});

// ===================== 13. Le garage des ambulances =====================
// ambulance vue de côté (avant vers la droite), sol en y = 0
const Ambulance = ({fg, gyro = 0, phares = 0, roule = 0, cabine = null}) => {
  const bleu = gyro > 0 && Math.floor(fg / 4) % 2 === 0;
  return (
    <g>
      <ellipse cx="0" cy="0" rx="560" ry="40" fill="#000" opacity="0.4" filter="url(#hp-ombre)" />
      {gyro > 0 && <ellipse cx="-100" cy="-600" rx="700" ry="260" fill={bleu ? '#3a7aff' : '#ff3a3a'} opacity={0.35 * gyro} filter="url(#hp-flou2)" />}
      <rect x="-470" y="-560" width="740" height="470" rx="30" fill="#f4f6fa" />
      <rect x="-470" y="-200" width="740" height="110" rx="20" fill="#dfe4ec" />
      <path d="M260,-90 L260,-430 L380,-430 Q440,-420 470,-310 L500,-210 L500,-90 Z" fill="#f4f6fa" />
      <path d="M280,-410 L370,-410 Q415,-398 445,-300 L280,-300 Z" fill="#22304a" />
      <clipPath id="am-vitre">
        <path d="M280,-410 L370,-410 Q415,-398 445,-300 L280,-300 Z" />
      </clipPath>
      <g clipPath="url(#am-vitre)">{cabine}</g>
      <path d="M296,-400 L330,-400 L300,-320 Z" fill="#ffffff" opacity="0.3" />
      <rect x="-470" y="-280" width="970" height="44" fill="#e83a3a" />
      <rect x="-470" y="-230" width="970" height="12" fill="#ffb03a" />
      <text x="-110" y="-340" textAnchor="middle" fontFamily={POLICE} fontSize="96" fill="#e83a3a" letterSpacing="4">AMBULANCE</text>
      <g transform="translate(-370 -470)">
        <circle r="54" fill="#2a6ae8" />
        <rect x="-12" y="-38" width="24" height="76" fill="#ffffff" />
        <rect x="-12" y="-38" width="24" height="76" fill="#ffffff" transform="rotate(60)" />
        <rect x="-12" y="-38" width="24" height="76" fill="#ffffff" transform="rotate(-60)" />
      </g>
      <rect x="-440" y="-590" width="640" height="34" rx="12" fill="#c8ccd6" />
      {[...Array(8)].map((_, j) => <rect key={j} x={-430 + j * 78} y="-588" width="66" height="28" rx="8" fill={j % 2 ? (gyro && bleu ? '#5aa0ff' : '#2a4a8a') : gyro && !bleu ? '#ff5a4a' : '#8a2a2a'} />)}
      <line x1="-460" y1="-540" x2="-460" y2="-100" stroke="#c8ccd6" strokeWidth="6" />
      <ellipse cx="490" cy="-170" rx="20" ry="30" fill={phares ? '#fff8c8' : '#d8dce4'} />
      {phares > 0 && <path d="M500,-180 L1300,-320 L1300,40 Z" fill="#fff8c8" opacity={0.25 * phares} filter="url(#hp-flou)" />}
      {[-300, 330].map((x) => (
        <g key={x} transform={`translate(${x} -40) rotate(${roule})`}>
          <circle r="78" fill="#1a1c22" />
          <circle r="40" fill="#9aa2b0" />
          {[0, 60, 120].map((a) => <rect key={a} x="-4" y="-38" width="8" height="76" fill="#6a7280" transform={`rotate(${a})`} />)}
        </g>
      ))}
    </g>
  );
};
const GarageMonde = ({fg, children}) => (
  <g>
    <defs>
      <linearGradient id="ga-mur" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3a3e4a" />
        <stop offset="1" stopColor="#5a5e6a" />
      </linearGradient>
    </defs>
    <rect x="-1200" y="-400" width="3600" height="2000" fill="url(#ga-mur)" />
    <rect x="1350" y="300" width="900" height="1300" fill="#0a1430" />
    <circle cx="1900" cy="520" r="40" fill="#f4f0d8" opacity="0.8" />
    {[-900, -300, 300, 900].map((x) => (
      <g key={x}>
        <ellipse cx={x} cy="700" rx="300" ry="700" fill="#ffb050" opacity="0.18" filter="url(#hp-flou2)" />
        <rect x={x - 60} y="200" width="120" height="30" rx="10" fill="#ffd090" />
      </g>
    ))}
    <rect x="-200" y="160" width="700" height="110" rx="14" fill="#c8202a" />
    <text x="150" y="240" textAnchor="middle" fontFamily={POLICE} fontSize="70" fill="#ffffff">URGENCES · AMBULANCES</text>
    {[-700, 1150].map((x) => <rect key={x} x={x} y="200" width="110" height="1400" fill="#6a6e7a" />)}
    <rect x="-1200" y="1600" width="3600" height="800" fill="#4a4e58" />
    {[...Array(8)].map((_, j) => <rect key={j} x={-1100 + j * 460} y="1780" width="240" height="22" fill="#e8c03a" opacity="0.8" />)}
    {children}
  </g>
);
const Garage = scene('garage', ({f, fg, i, t, k, R}) => {
  const ORANGE = ['#ffb070', 0.25];
  const moteur = f >= R('moteur', 85) - 2;
  if (i === 0) {
    const entre = ease(t, 0, 50, Easing.out(Easing.quad));
    return (
      <Ecran fg={fg} teinte={ORANGE}>
        <Vue x={lerp(300, 420, k)} y={1050} z={lerp(0.78, 0.84, k)}>
          <GarageMonde fg={fg}>
            <g transform="translate(560 1640) scale(1.05)"><Ambulance fg={fg} /></g>
            <g transform={`translate(${lerp(-700, -260, entre)} 1720) scale(0.85)`}><Rond {...INF} profil={0.6} {...course(fg / 2.4 + 1)} jambes={Math.sin(fg / 2.4) * (1 - entre * 0.7)} /></g>
            <g transform={`translate(${lerp(-1000, -520, entre)} 1740) scale(0.9)`}><Rond profil={0.6} yeux={1.25} bouche="o" sourcils={0.8} {...course(fg / 2.4)} /></g>
          </GarageMonde>
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    return (
      <Ecran fg={fg} teinte={ORANGE}>
        <Vue x={lerp(900, 960, k)} y={1350} z={lerp(1.35, 1.45, k) * (moteur ? punchZ(f - R('moteur', 85), 0.06) : 1)}>
          <GarageMonde fg={fg}>
            <g transform={`translate(560 ${1640 + (moteur ? Math.sin(fg * 2.5) * 3 : 0)}) scale(1.05)`}><Ambulance fg={fg} gyro={f >= R('allumé', 96) - 2 ? 1 : 0} phares={moteur ? 1 : 0} /></g>
            {moteur && <Vapeur fg={fg} x={50} y={1620} s={1.6} />}
          </GarageMonde>
        </Vue>
      </Ecran>
    );
  }
  // l'arrière : les portes ouvertes, la cabine éclairée
  const ouv = ease(f, R('portes', 115) - 6, R('ouvertes', 121) + 2, Easing.out(Easing.back(1.2)));
  return (
    <Ecran fg={fg} teinte={ORANGE}>
      <Vue x={540} y={1000} z={lerp(1.0, 1.1, k)}>
        <GarageMonde fg={fg}>
          <AmbuArriere fg={fg} ouvre={ouv} gyro={1} />
        </GarageMonde>
      </Vue>
    </Ecran>
  );
});
// l'ambulance vue de l'arrière, portes qui s'ouvrent sur la cabine éclairée
const AmbuArriere = ({fg, ouvre = 0, gyro = 0, x = 540, y = 1600, s = 1, dedans = null}) => {
  const bleu = Math.floor(fg / 4) % 2 === 0;
  const pw = 330 * (1 - ouvre * 0.85);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="10" rx="480" ry="40" fill="#000" opacity="0.45" filter="url(#hp-ombre)" />
      {gyro > 0 && <ellipse cx="0" cy="-880" rx="600" ry="200" fill={bleu ? '#3a7aff' : '#ff3a3a'} opacity="0.4" filter="url(#hp-flou2)" />}
      {[-300, 300].map((xx) => <rect key={xx} x={xx - 60} y="-110" width="120" height="120" rx="20" fill="#1a1c22" />)}
      <rect x="-400" y="-860" width="800" height="760" rx="30" fill="#e8ecf2" />
      <rect x="-340" y="-800" width="680" height="660" fill="#f4faff" />
      <rect x="-340" y="-800" width="680" height="660" fill="#bfe0ff" opacity="0.35" />
      <rect x="-300" y="-360" width="420" height="80" rx="20" fill="#ffffff" />
      <rect x="-300" y="-290" width="420" height="40" fill="#8a92a2" />
      <rect x="-320" y="-780" width="640" height="120" fill="#d8e0ea" />
      <rect x="200" y="-640" width="60" height="200" rx="24" fill="#3ab86a" />
      {dedans}
      <rect x="-340" y="-140" width="680" height="40" fill="#c8ccd6" />
      {/* portes */}
      <g>
        <rect x={-340} y="-800" width={pw} height="660" fill="#f4f6fa" stroke="#c8ccd6" strokeWidth="4" />
        <rect x={-340 + pw * 0.15} y="-740" width={pw * 0.7} height="200" fill="#22304a" />
        <rect x={-340} y="-420" width={pw} height="40" fill="#e83a3a" />
        <rect x={340 - pw} y="-800" width={pw} height="660" fill="#f4f6fa" stroke="#c8ccd6" strokeWidth="4" />
        <rect x={340 - pw + pw * 0.15} y="-740" width={pw * 0.7} height="200" fill="#22304a" />
        <rect x={340 - pw} y="-420" width={pw} height="40" fill="#e83a3a" />
      </g>
      {[-370, 370].map((xx) => <rect key={xx} x={xx - 22} y="-300" width="44" height="90" rx="10" fill="#ff3a3a" />)}
      <rect x="-420" y="-110" width="840" height="50" rx="14" fill="#5a6070" />
      {[...Array(6)].map((_, j) => <rect key={j} x={-280 + j * 96} y="-900" width="80" height="36" rx="8" fill={j % 2 ? (gyro && bleu ? '#5aa0ff' : '#2a4a8a') : gyro && !bleu ? '#ff5a4a' : '#8a2a2a'} />)}
    </g>
  );
};

// ===================== 14. Elle saute au volant, tu plonges à l'arrière… ceux-là courent =====================
// depuis l'intérieur de l'ambulance, on regarde par les portes arrière ouvertes
const AmbuInterieur = ({fg, dehors, devant = null}) => (
  <g>
    <defs>
      <clipPath id="ai-porte">
        <rect x="230" y="560" width="620" height="1000" />
      </clipPath>
    </defs>
    <g clipPath="url(#ai-porte)">{dehors}</g>
    <path d="M-400,-200 L1480,-200 L1480,2120 L-400,2120 Z M230,560 L230,1560 L850,1560 L850,560 Z" fill="#dfe6ee" fillRule="evenodd" />
    <path d="M-400,-200 L230,560 L230,1560 L-400,2120 Z" fill="#c8d2de" />
    <path d="M1480,-200 L850,560 L850,1560 L1480,2120 Z" fill="#b8c2d0" />
    <path d="M-400,-200 L1480,-200 L850,560 L230,560 Z" fill="#eef4fa" />
    <path d="M-400,2120 L1480,2120 L850,1560 L230,1560 Z" fill="#8a94a6" />
    <rect x="380" y="100" width="320" height="40" rx="18" fill="#ffffff" />
    <ellipse cx="540" cy="200" rx="400" ry="160" fill="#ffffff" opacity="0.4" filter="url(#hp-flou)" />
    <path d="M1100,300 L1480,140 L1480,700 L1100,780 Z" fill="#d8e0ea" stroke="#a8b2c2" strokeWidth="6" />
    <path d="M-60,1700 L360,1500 L360,1580 L-60,1820 Z" fill="#ffffff" />
    <path d="M-60,1820 L360,1580 L360,1640 L-60,1900 Z" fill="#8a92a2" />
    <rect x="1180" y="900" width="70" height="300" rx="30" fill="#3ab86a" transform="rotate(-8 1215 1050)" />
    {devant}
  </g>
);
const Courent = scene('courent', ({f, fg, i, t, k, d, R}) => {
  const ORANGE = ['#ffb070', 0.22];
  if (i === 0) {
    // de côté : elle saute dans la cabine
    const saute = ease(f, R('saute', 17) - 6, R('volant', 24) + 2, Easing.out(Easing.cubic));
    return (
      <Ecran fg={fg} teinte={ORANGE}>
        <Vue x={1000} y={1350} z={1.3 * punchZ(t)}>
          <GarageMonde fg={fg}>
            <g transform="translate(560 1640) scale(1.05)">
              <Ambulance fg={fg} gyro={1} phares={1}
                cabine={saute > 0.6 && <g transform="translate(350 -190) scale(0.22)"><Rond {...INF} profil={0.8} bouche="serre" sourcils={-0.5} assis brasG={[100, -60]} brasD={[90, -50]} /></g>} />
            </g>
            {saute < 0.6 && (
              <g transform={`translate(${lerp(1300, 920, saute)} ${lerp(1720, 1420, saute)}) scale(${lerp(0.85, 0.6, saute)}) rotate(${-20 * saute})`}>
                <Rond {...INF} profil={-0.6} bouche="serre" sourcils={-0.5} {...course(fg / 2)} />
              </g>
            )}
          </GarageMonde>
        </Vue>
      </Ecran>
    );
  }
  const dehors = (zs, vite = false) => (
    <g transform="translate(540 1500) scale(0.42) translate(-540 -1640)">
      <GarageMonde fg={fg}>
        {zs.map(([x, y, s], j) => (
          <g key={j} transform={`translate(${x} ${y}) scale(${s})`}>
            <Rond {...ZOMBIE(fg / (vite ? 1.6 : 8), j)} jambes={Math.sin(fg / (vite ? 1.6 : 8) + j)} brasG={vite ? [60 + 40 * Math.sin(fg / 1.6 + j), -60] : [90, -10]} brasD={vite ? [60 - 40 * Math.sin(fg / 1.6 + j), -60] : [92, -10]} />
          </g>
        ))}
      </GarageMonde>
    </g>
  );
  if (i === 1) {
    // tu plonges à l'arrière (vu de l'intérieur)
    const pl = ease(f, R('plonges', 48) - 8, R('larrière', 61) + 4, Easing.out(Easing.cubic));
    return (
      <Ecran fg={fg} teinte={ORANGE}>
        <Vue x={540} y={1000} z={punchZ(f - R('plonges', 48) + 4, 0.08)}>
          <AmbuInterieur fg={fg} dehors={dehors([])}
            devant={
              <g transform={`translate(${lerp(540, 600, pl)} ${lerp(1500, 2350, pl)}) scale(${lerp(0.7, 1.8, pl)}) rotate(${lerp(0, -70, pl)})`}>
                <Rond yeux={1.3} bouche="cri" sourcils={1} brasG={[150, -20]} brasD={[150, -20]} jambes={0.8} />
              </g>
            } />
        </Vue>
      </Ecran>
    );
  }
  if (i === 2) {
    const av = t * 4;
    return (
      <Ecran fg={fg} teinte={ORANGE}>
        <Vue x={540} y={1050} z={lerp(1.0, 1.1, k)}>
          <AmbuInterieur fg={fg} dehors={dehors([[100 + av, 1640, 0.7], [500, 1660 + av * 0.2, 0.75], [900 - av, 1640, 0.7], [300, 1700 + av * 0.4, 0.8], [700, 1720, 0.8]])} />
        </Vue>
      </Ecran>
    );
  }
  if (i === 3) {
    // « attends… »
    return (
      <Ecran fg={fg} teinte={ORANGE}>
        <Vue x={540} y={lerp(1000, 980, k)} z={lerp(1.0, 1.08, k)}>
          <g filter="url(#flou8)">
            <AmbuInterieur fg={fg} dehors={dehors([[300, 1660, 0.75], [700, 1680, 0.78]])} />
          </g>
          <g transform="translate(560 2180) scale(1.6)">
            <Rond cou={16} profil={0.3} yeux={0.55} pupX={20} bouche="serre" sourcils={-0.6} sueur={0.4} brasG={[10, 0]} brasD={[10, 0]} />
          </g>
        </Vue>
      </Ecran>
    );
  }
  // ils courent !
  const u = t / Math.max(1, d);
  return (
    <Ecran fg={fg} teinte={ORANGE} flou={[0, 3]}>
      <Vue x={540 + tremble(fg, 16, 'cr')} y={1050} z={punchZ(f - R('courent', 167), 0.14)}>
        <AmbuInterieur fg={fg} dehors={dehors([[300, 1640 + 900 * u, 0.9 + 1.6 * u], [760, 1660 + 800 * u, 0.85 + 1.5 * u], [540, 1700 + 1000 * u, 1 + 2 * u]], true)} />
        {[...Array(10)].map((_, j) => <path key={j} d={`M${540 + Math.cos(j) * 400},${1060 + Math.sin(j) * 600} L${540 + Math.cos(j) * 900},${1060 + Math.sin(j) * 1300}`} stroke="#ffffff" strokeWidth="6" opacity="0.4" />)}
      </Vue>
    </Ecran>
  );
});

// ===================== 15. La barrière explose, l'hôpital rétrécit derrière =====================
const BLEU_NUIT = ['#6a8aff', 0.3];
const Rue = ({fg, vit = 1}) => {
  const off = (fg * 38 * vit) % 600;
  return (
    <g>
      <defs>
        <linearGradient id="ru-ciel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#060a20" />
          <stop offset="1" stopColor="#1e2a50" />
        </linearGradient>
      </defs>
      <rect x="-1200" y="-400" width="3600" height="2100" fill="url(#ru-ciel)" />
      <g transform={`translate(${off * 0.3} 0)`}>
        {[...Array(10)].map((_, j) => <rect key={j} x={-1400 + j * 360} y={700 + random(`b${j}`) * 400} width="300" height="1200" fill="#10162e" />)}
      </g>
      <g transform={`translate(${off} 0)`}>
        {[...Array(8)].map((_, j) => (
          <g key={j}>
            <rect x={-1600 + j * 600} y="900" width="16" height="800" fill="#2a2e3a" />
            <circle cx={-1592 + j * 600} cy="900" r="22" fill="#ffd890" />
            <ellipse cx={-1592 + j * 600} cy="1700" rx="200" ry="40" fill="#ffd890" opacity="0.25" />
          </g>
        ))}
      </g>
      <rect x="-1200" y="1700" width="3600" height="700" fill="#22262e" />
      <g transform={`translate(${off * 1.6 % 400} 0)`}>
        {[...Array(12)].map((_, j) => <rect key={j} x={-1600 + j * 400} y="1880" width="200" height="16" fill="#e8e8e8" opacity="0.7" />)}
      </g>
    </g>
  );
};
const Evasion = scene('evasion', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    const b = R('barrière', 31);
    const x = lerp(-300, 520, ease(t, 0, b, Easing.in(Easing.quad))) + Math.max(0, f - b) * 14;
    const casse = f >= b;
    const choc = casse && f < b + 8 ? tremble(fg, 26, 'ba') : 0;
    return (
      <Ecran fg={fg} teinte={BLEU_NUIT} flou={[4, 0]}>
        <Vue x={540 + choc} y={1300} z={0.9 * (casse ? punchZ(f - b, 0.12) : 1)}>
          <Rue fg={fg} />
          {/* la barrière */}
          {!casse ? (
            <g>
              <rect x="1040" y="1420" width="60" height="300" fill="#c8ccd6" />
              <rect x="560" y="1440" width="480" height="40" fill="#ffffff" />
              {[0, 1, 2, 3].map((j) => <rect key={j} x={580 + j * 120} y="1440" width="60" height="40" fill="#e83a3a" />)}
            </g>
          ) : (
            <g>
              <rect x="1040" y="1420" width="60" height="300" fill="#c8ccd6" />
              {[0, 1, 2, 3].map((j) => {
                const u = (f - b) / 10;
                return <rect key={j} x={600 + j * 120 + u * (200 + j * 120)} y={1440 - u * (300 - j * 60) + u * u * 200} width="110" height="40" fill={j % 2 ? '#ffffff' : '#e83a3a'} transform={`rotate(${u * 200 * (j % 2 ? 1 : -1)} ${640 + j * 120} 1460)`} />;
              })}
            </g>
          )}
          <g transform={`translate(${x} 1720) scale(0.75)`}>
            <Ambulance fg={fg} gyro={1} phares={1} roule={fg * 30} />
          </g>
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    // derrière l'ambulance : ton visage colle à la vitre
    return (
      <Ecran fg={fg} teinte={BLEU_NUIT}>
        <Vue x={540} y={lerp(960, 920, k) + Math.sin(fg / 2) * 6} z={lerp(1.45, 1.6, k)}>
          <rect x="-400" y="-200" width="1880" height="2320" fill="#0a1020" />
          <AmbuArriere fg={fg} ouvre={0} gyro={1} x={540} y={1800} s={1.15}
            dedans={null} />
          <g transform="translate(540 1800) scale(1.15)">
            <clipPath id="ev-vitre">
              <rect x={-340 + 330 * 0.15} y="-740" width={330 * 0.7} height="200" />
            </clipPath>
            <g clipPath="url(#ev-vitre)">
              <g transform="translate(-170 -440) scale(0.38)">
                <Rond yeux={1.3} bouche="o" sourcils={0.9} brasG={[150, -60]} brasD={[10, 0]} />
              </g>
            </g>
          </g>
        </Vue>
      </Ecran>
    );
  }
  // POV : l'hôpital qui rétrécit, la route qui défile
  const s = lerp(1, 0.35, ease(t, 0, 45, Easing.out(Easing.quad)));
  return (
    <Ecran fg={fg} teinte={BLEU_NUIT}>
      <Vue x={540} y={960} z={1}>
        <rect x="-400" y="-200" width="1880" height="2320" fill="#0a1030" />
        <path d="M540,1000 L-400,2120 L1480,2120 Z" fill="#22262e" />
        {[...Array(6)].map((_, j) => {
          const u = ((fg / 8 + j / 6) % 1);
          return <rect key={j} x={540 - 6 - 30 * u} y={1000 + 1100 * u * u} width={12 + 60 * u} height={20 + 120 * u} fill="#e8e8e8" opacity="0.7" />;
        })}
        <g transform={`translate(540 1000) scale(${s}) translate(-540 -1000)`}>
          <rect x="140" y="200" width="800" height="800" fill="#3a4466" />
          {[...Array(15)].map((_, j) => <rect key={j} x={190 + (j % 5) * 150} y={260 + Math.floor(j / 5) * 240} width="100" height="160" fill={random(`hw${j}`) < 0.5 ? '#ff3a2a' : '#ffd88a'} opacity={0.6 + 0.4 * Math.sin(fg / 3 + j)} />)}
          <rect x="440" y="110" width="200" height="90" fill="#e8ecf4" />
          <rect x="515" y="120" width="50" height="70" fill="#e83a3a" />
          <rect x="490" y="140" width="100" height="30" fill="#e83a3a" />
          <ellipse cx="540" cy="600" rx="600" ry="500" fill="#ff3a2a" opacity="0.2" filter="url(#hp-flou2)" />
        </g>
        {/* le cadre des vitres arrière */}
        <path d="M-400,-200 L1480,-200 L1480,2120 L-400,2120 Z M120,380 L120,1250 L520,1250 L520,380 Z M560,380 L560,1250 L960,1250 L960,380 Z" fill="#dfe4ec" fillRule="evenodd" />
        <rect x="120" y="380" width="840" height="870" fill="#ffffff" opacity="0.06" />
        <path d="M150,420 L300,420 L150,700 Z" fill="#ffffff" opacity="0.1" />
      </Vue>
    </Ecran>
  );
});

// ===================== 16. « T'as été mordu ? » Toi non. Mais elle… =====================
const Cabine = ({fg, children}) => (
  <g>
    <rect x="-400" y="-200" width="1880" height="2320" fill="#0c1430" />
    <g transform={`translate(${-((fg * 30) % 400)} 0)`}>
      {[...Array(8)].map((_, j) => <circle key={j} cx={j * 400} cy="500" r="30" fill="#ffd890" opacity="0.6" filter="url(#hp-flou)" />)}
    </g>
    {children}
  </g>
);
const Twist = scene('twist', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    // le rétroviseur : ses yeux
    return (
      <Ecran fg={fg} teinte={BLEU_NUIT}>
        <Vue x={540} y={900} z={lerp(1.0, 1.1, k) * punchZ(f - R('rétro', 29), 0.06)}>
          <Cabine fg={fg}>
            <rect x="-400" y="-200" width="1880" height="300" fill="#1a1e28" />
            <rect x="530" y="80" width="20" height="440" fill="#2a2e38" />
            <rect x="100" y="500" width="880" height="320" rx="60" fill="#1a1e28" />
            <clipPath id="tw-retro">
              <rect x="130" y="530" width="820" height="260" rx="44" />
            </clipPath>
            <g clipPath="url(#tw-retro)">
              <rect x="130" y="530" width="820" height="260" fill="#3a4258" />
              <g transform="translate(540 2050) scale(1.85)">
                <Rond {...INF} yeux={1} pupX={-14} sourcils={0.3} />
              </g>
              <path d="M200,540 L420,540 L200,780 Z" fill="#ffffff" opacity="0.08" />
            </g>
          </Cabine>
        </Vue>
      </Ecran>
    );
  }
  if (i === 1) {
    return (
      <Ecran fg={fg} teinte={BLEU_NUIT}>
        <Vue x={540} y={980} z={punchZ(t, 0.06)}>
          <Cabine fg={fg}>
            <g transform="translate(560 2150) scale(1.6)">
              <Rond {...INF} cou={16} profil={-0.5} pupX={-24} yeux={1.1} sourcils={0.5} bouche={f >= R('tas', 51) && f < R('mordu', 57) + 10 ? 'o' : 'neutre'} brasG={[30, -40]} brasD={[30, -40]} />
            </g>
            <ellipse cx="980" cy="1900" rx="420" ry="420" fill="none" stroke="#1a1c22" strokeWidth="60" />
          </Cabine>
        </Vue>
      </Ecran>
    );
  }
  if (i === 2) {
    const non = Math.sin(f / 2.2) * 0.35 * (f >= R('non', 99) - 6 ? 1 : 0.3);
    return (
      <Ecran fg={fg} teinte={BLEU_NUIT}>
        <Vue x={540} y={980} z={lerp(1.0, 1.06, k)}>
          <g filter="url(#flou8)">
            <AmbuInterieur fg={fg} dehors={<rect x="0" y="0" width="1080" height="1920" fill="#0a1020" />} />
          </g>
          <g transform="translate(540 2170) scale(1.6)">
            <Rond brasDevant cou={16} profil={non} yeux={1.2} bouche="o" sourcils={0.8} brasG={ikBras(-1, [-200, -760])} brasD={ikBras(1, [200, -760])} />
          </g>
        </Vue>
      </Ecran>
    );
  }
  // son bras sur le volant : la morsure
  const mo = R('morsure', 161);
  const rev = ease(f, mo - 8, mo + 2);
  const veines = 0.5 + 0.5 * Math.sin(fg / 3);
  const oeil = f >= R('bras', 183) - 2;
  return (
    <Ecran fg={fg} teinte={BLEU_NUIT}>
      <Vue x={lerp(300, 620, ease(t, 0, 40))} y={lerp(1100, 1000, k)} z={lerp(1.4, 1.7, k) * punchZ(f - mo, 0.1)}>
        <Cabine fg={fg}>
          <ellipse cx="540" cy="1250" rx="620" ry="620" fill="none" stroke="#1a1c22" strokeWidth="90" />
          <path d="M-400,1000 Q300,900 760,1000 L760,1180 Q300,1100 -400,1220 Z" fill={INF.peau} />
          <path d="M-400,1000 Q-100,960 100,980 L100,1210 Q-100,1200 -400,1220 Z" fill="#2a4a8a" />
          <ellipse cx="830" cy="1080" rx="120" ry="100" fill={INF.peau} />
          <g opacity={rev}>
            {[...Array(7)].map((_, j) => <ellipse key={j} cx={440 + j * 22} cy={1040 + Math.abs(j - 3) * 6} rx="9" ry="12" fill="#5a0a10" />)}
            {[...Array(7)].map((_, j) => <ellipse key={`b${j}`} cx={440 + j * 22} cy={1130 - Math.abs(j - 3) * 6} rx="9" ry="12" fill="#5a0a10" />)}
            <ellipse cx="506" cy="1085" rx="110" ry="80" fill="#5a1a3a" opacity="0.35" filter="url(#hp-ombre)" />
            {[[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1.3]].map(([a, b], j) => <path key={j} d={`M506,1085 q${a * 60},${b * 20} ${a * 140},${b * 40} t${a * 80},${b * 30}`} stroke="#2a0a3a" strokeWidth="6" fill="none" opacity={0.3 + 0.5 * veines} />)}
          </g>
        </Cabine>
      </Vue>
      {oeil && (
        <g opacity={ease(f, R('bras', 183) - 2, R('bras', 183) + 3)}>
          <rect width="1080" height="1920" fill="#000" opacity="0.75" />
          {[-1, 1].map((s) => (
            <g key={s}>
              <circle cx={540 + s * 150} cy="760" r="140" fill="#ffffff" opacity="0.4" filter="url(#hp-flou2)" />
              <circle cx={540 + s * 150} cy="760" r="40" fill="#ffffff" />
            </g>
          ))}
        </g>
      )}
    </Ecran>
  );
});

// ===================== 17. Tu sautes, ou tu lui fais confiance ? =====================
const Choix = scene('choix', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    return (
      <Ecran fg={fg} teinte={BLEU_NUIT} flou={[4, 0]}>
        <Vue x={540} y={1300} z={lerp(0.95, 1.05, k)}>
          <Rue fg={fg} />
          <g transform={`translate(${520 + Math.sin(fg / 6) * 10} ${1720 + Math.sin(fg / 2) * 3}) scale(0.8)`}>
            <Ambulance fg={fg} gyro={1} phares={1} roule={fg * 30}
              cabine={<g transform="translate(350 -190) scale(0.22)"><Rond {...INF} profil={0.8} assis brasG={[100, -60]} brasD={[90, -50]} /></g>} />
          </g>
        </Vue>
      </Ecran>
    );
  }
  const dis = R('dis-le', 122);
  return (
    <Ecran fg={fg} teinte={BLEU_NUIT}
      dessus={
        <g>
          <ChoixBoite f={f} debut={Math.max(62, R('sautes', 39))} x={540} y={420} texte="SAUTER EN MARCHE" emoji="1f3c3" couleur="#ff5a3a" />
          <ChoixBoite f={f} debut={Math.max(70, R('confiance', 99))} x={540} y={600} texte="LUI FAIRE CONFIANCE" emoji="1f91d" couleur="#3ad86a" />
          <BulleCommentaire f={f} t0={dis - 2} y={1700} />
        </g>
      }>
      <Vue x={540} y={lerp(1000, 980, k) + Math.sin(fg / 2) * 5} z={lerp(1.0, 1.06, k)}>
        <AmbuInterieur fg={fg} dehors={<g><rect x="0" y="0" width="1080" height="1920" fill="#0a1020" />{[0, 1, 2].map((j) => <circle key={j} cx={540} cy={1000} r={30 + ((fg * 6 + j * 200) % 600)} fill="none" stroke="#ffd890" strokeWidth="4" opacity="0.15" />)}</g>}
          devant={
            <g>
              <g transform="translate(280 1880) scale(1.1)">
                <Rond profil={0.6} yeux={1.2} pupX={24} bouche="serre" sourcils={0.9} sueur={(f / 20) % 1} brasG={[15, 0]} brasD={[15, 0]} souffle={Math.sin(fg / 3) * 8} />
              </g>
              <rect x="700" y="560" width="300" height="200" rx="20" fill="#22304a" />
              <g transform="translate(850 900) scale(0.35)">
                <clipPath id="ch-cab"><rect x="-430" y="-1000" width="860" height="580" /></clipPath>
                <g clipPath="url(#ch-cab)"><Rond {...INF} dos /></g>
              </g>
            </g>
          } />
      </Vue>
    </Ecran>
  );
});

const COMPOSANTS = {bloc: Bloc, chambre: Chambre, alarme: Alarme, couloir: Couloir, plan: Plan, infirmiere: Infirmiere, porte: Porte, fuite: Fuite, ascenseur: Ascenseur, escalier: Escalier, rez: Rez, morgue: Morgue, garage: Garage, courent: Courent, evasion: Evasion, twist: Twist, choix: Choix};
export const Hopital = () => (
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
