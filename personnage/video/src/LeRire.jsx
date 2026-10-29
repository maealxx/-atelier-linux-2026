import {AbsoluteFill, Easing, interpolate, random, Series, useCurrentFrame} from 'remotion';
import {Bureau, CheveuxMatin, Classe, CravateProf, Cuisine, ELEVES, LunettesMoustache, Poussiere, PROF} from './LaClasse';
import {montage} from './montage';
import {Finition} from './moteur';
import {BulleCommentaire, Cadre, Couche, DefsFlou, ease, Emo, Fig, lerp, mainD, mainG, Ombre, pop, TEXTE, TITRE, versEcran} from './ParrainageKit';
import PLANS from './rire/plans.json';
import timeline from './rire/timeline.json';

// « La classe » épisode : pourquoi ton pote rigole quand le prof dit que sa mère est morte (le rire nerveux).
// 2,5D : couches en parallaxe + flou de profondeur ; lumière : soleil de la fenêtre (rayons, poussière), liseré chaud
// côté fenêtre et ombre froide de l'autre côté sur chaque perso (filtre), nuage qui passe pendant les moments tristes.
const {decoupe, repere, SCENES} = montage(timeline, PLANS);
export const DUREE_RIRE = SCENES.reduce((t, [, d]) => t + d, 0);
const START = {};
SCENES.reduce((t, [nom, d]) => {
  START[nom] = t;
  return t + d;
}, 0);
const lisse = (t, d) => Easing.inOut(Easing.sin)(Math.min(1, t / Math.max(1, d)));
const tremble = (f, k, c) => k * (random(`${c}${f}`) - 0.5);
const POTE = {};
const TOI = ELEVES[0];

// ---------- éclairage ----------
// liseré lumineux côté fenêtre (gauche) + ombre douce côté opposé, à l'intérieur de la silhouette
const DefsLumiere = () => (
  <defs>
    {[
      ['chaud', '#fff0c8', '#3a2a5a', 7, 0.28],
      ['froid', '#c8d8ff', '#1a1a3a', 6, 0.38],
      ['rouge', '#ff6a5a', '#1a0a20', 7, 0.35],
    ].map(([id, rim, ombre, dx, o]) => (
      <filter key={id} id={`lum-${id}`} x="-15%" y="-15%" width="130%" height="130%">
        <feOffset in="SourceAlpha" dx={dx} dy={-dx * 0.4} result="dec" />
        <feComposite in="SourceAlpha" in2="dec" operator="out" result="bord" />
        <feFlood floodColor={rim} result="cr" />
        <feComposite in="cr" in2="bord" operator="in" result="rim" />
        <feGaussianBlur in="rim" stdDeviation="1.6" result="rimb" />
        <feOffset in="SourceAlpha" dx={-dx * 2.4} dy="0" result="dec2" />
        <feComposite in="SourceAlpha" in2="dec2" operator="out" result="cote" />
        <feGaussianBlur in="cote" stdDeviation="9" result="coteb" />
        <feFlood floodColor={ombre} floodOpacity={o} result="co" />
        <feComposite in="co" in2="coteb" operator="in" result="sh0" />
        <feComposite in="sh0" in2="SourceAlpha" operator="in" result="sh" />
        <feMerge>
          <feMergeNode in="SourceGraphic" />
          <feMergeNode in="sh" />
          <feMergeNode in="rimb" />
        </feMerge>
      </filter>
    ))}
  </defs>
);
const Eclaire = ({l = 'chaud', children}) => <g filter={`url(#lum-${l})`}>{children}</g>;
// lumière d'ambiance : chaleur de la fenêtre (haut-gauche), ombre froide (bas-droite), poussière dans les rayons
const Ambiance = ({f, soleil = 1, chaud = '#ffcf8a', froid = '#2a3a7a'}) => (
  <g>
    <defs>
      <radialGradient id="amb-c" cx="0" cy="0.2" r="1.1">
        <stop offset="0" stopColor={chaud} stopOpacity={0.42 * soleil} />
        <stop offset="1" stopColor={chaud} stopOpacity="0" />
      </radialGradient>
      <radialGradient id="amb-f" cx="1" cy="1" r="1.1">
        <stop offset="0" stopColor={froid} stopOpacity={0.35 + 0.2 * (1 - soleil)} />
        <stop offset="1" stopColor={froid} stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="1080" height="1920" fill="url(#amb-c)" style={{mixBlendMode: 'screen'}} />
    <rect width="1080" height="1920" fill="url(#amb-f)" style={{mixBlendMode: 'multiply'}} />
    <rect width="1080" height="1920" fill="#3a4a7a" opacity={0.22 * (1 - soleil)} style={{mixBlendMode: 'multiply'}} />
    {[...Array(22)].map((_, k) => {
      const x = (random(`am${k}`) * 900 + f * (0.4 + random(`av${k}`))) % 900;
      const y = 300 + random(`ay${k}`) * 1300 + 20 * Math.sin(f / 30 + k);
      return <circle key={k} cx={x} cy={y} r={2 + 3 * random(`ar${k}`)} fill="#fff6d8" opacity={(0.25 + 0.4 * random(`ao${k}`)) * soleil * (1 - x / 1100)} />;
    })}
  </g>
);

// ---------- le fond de la classe (vue depuis le tableau : les élèves de face) ----------
const MurFond = ({f, soleil = 1}) => (
  <g>
    <defs>
      <linearGradient id="mf-m" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f4dcaa" />
        <stop offset="1" stopColor="#e8c48a" />
      </linearGradient>
      <linearGradient id="mf-r" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff6d8" stopOpacity="0.55" />
        <stop offset="1" stopColor="#fff6d8" stopOpacity="0" />
      </linearGradient>
    </defs>
    <rect x="-400" y="-400" width="1880" height="2900" fill="url(#mf-m)" />
    <rect x="-400" y="1050" width="1880" height="420" fill="#d8a868" />
    <rect x="-400" y="1040" width="1880" height="16" fill="#b8884a" />
    {/* fenêtre (mur de gauche, en biais) */}
    <path d="M-400,250 L60,330 L60,980 L-400,1060 Z" fill="#f8f4ea" />
    <path d="M-380,280 L40,350 L40,960 L-380,1030 Z" fill="#8ad0f8" />
    <path d="M-380,280 L40,350 L40,960 L-380,1030 Z" fill="#5a6a80" opacity={0.6 * (1 - soleil)} />
    <path d="M-170,316 L-170,996" stroke="#f8f4ea" strokeWidth="14" />
    {/* panneau de liège, affiches, porte-manteaux, étagère */}
    <rect x="160" y="300" width="380" height="260" rx="10" fill="#c8945a" />
    {[[200, 330, '#ffffff'], [330, 350, '#ffd23a'], [430, 320, '#7ae8c8'], [230, 450, '#ff9ab8'], [380, 460, '#ffffff']].map(([x, y, c], k) => (
      <g key={k} transform={`rotate(${(k % 2 ? 4 : -5)} ${x + 40} ${y + 40})`}>
        <rect x={x} y={y} width="90" height="80" fill={c} />
        <circle cx={x + 45} cy={y + 8} r="7" fill="#e83a3a" />
      </g>
    ))}
    <g transform="translate(800 330)">
      <rect x="-110" y="-70" width="220" height="150" rx="8" fill="#ffffff" />
      <path d="M-90,40 Q-40,-50 0,10 T90,-40" stroke="#3a8ad8" strokeWidth="8" fill="none" />
      <circle cx="60" cy="-30" r="14" fill="#ff7a4a" />
    </g>
    {[620, 700, 780, 860, 940].map((x, k) => (
      <g key={k}>
        <rect x={x - 6} y="620" width="12" height="40" rx="4" fill="#7a7a8a" />
        {k % 2 === 0 && <path d={`M${x - 40},660 Q${x},640 ${x + 40},660 L${x + 36},860 L${x - 36},860 Z`} fill={['#ff7a4a', '#3ad8a8', '#8a5aff'][k / 2]} />}
      </g>
    ))}
    <rect x="160" y="760" width="380" height="20" fill="#9a6a3a" />
    {[0, 1, 2, 3, 4, 5].map((k) => <rect key={k} x={180 + k * 56} y={680 + (k % 2) * 10} width="44" height={80 - (k % 2) * 10} fill={['#ff6a5a', '#4a8ad8', '#ffd23a', '#3ab86a', '#8a5aff', '#ff9ab8'][k]} />)}
    {/* rayon de soleil qui traverse la pièce */}
    <path d="M40,350 L1100,900 L1100,1400 L40,960 Z" fill="url(#mf-r)" opacity={(0.55 + 0.08 * Math.sin(f / 35)) * soleil} />
  </g>
);
// un élève assis à son pupitre, vu de face (le pupitre cache les jambes)
const Assis = ({x, y, s = 1, p = {}, l = 'chaud', dessus = null, tete = null}) => {
  const top = y - 470 * s;
  return (
    <g>
      <Eclaire l={l}>
        <Fig x={x} y={y} s={s} ombre={false} {...p} tete={tete} />
      </Eclaire>
      {dessus}
      <rect x={x - 230 * s} y={top} width={460 * s} height={34 * s} rx={8 * s} fill="#c88a4a" />
      <rect x={x - 230 * s} y={top} width={460 * s} height={8 * s} rx={4 * s} fill="#e8b070" />
      <rect x={x - 215 * s} y={top + 34 * s} width={430 * s} height={470 * s} fill="#a86a32" />
      <rect x={x - 215 * s} y={top + 34 * s} width={430 * s} height={40 * s} fill="#000" opacity="0.18" />
    </g>
  );
};
// la classe vue de face : rangée du fond (toi, ton pote…), rangée de devant (floue)
const RangFond = ({f, pote = {}, toi = {}, autres = {}, focus = 'fond'}) => (
  <g>
    <Couche p={0.62} flou={focus === 'devant' ? 4 : 0}>
      <Ombre x={540} y={1420} rx={600} ry={40} o={0.25} />
      <Assis x={250} y={1450} s={0.62} p={{...ELEVES[2], breath: Math.sin(f / 9) * 3, ...autres}} />
      <Assis x={560} y={1450} s={0.62} p={{breath: Math.sin(f / 8 + 1) * 3, ...pote}} />
      <Assis x={860} y={1450} s={0.62} p={{...TOI, breath: Math.sin(f / 9 + 2) * 3, ...toi}} />
    </Couche>
    <Couche p={1.15} flou={focus === 'fond' ? 8 : 0}>
      <Assis x={120} y={2250} s={1.05} p={{...ELEVES[1], dos: true, breath: Math.sin(f / 8) * 3, ...autres}} />
      <Assis x={960} y={2250} s={1.05} p={{...ELEVES[3], dos: true, breath: Math.sin(f / 7) * 3, ...autres}} />
    </Couche>
  </g>
);

// ---------- petits effets ----------
const NuagePluie = ({x, y, s = 1, f}) => (
  <g transform={`translate(${x} ${y + 6 * Math.sin(f / 12)}) scale(${s})`}>
    {[...Array(10)].map((_, k) => {
      const lx = -90 + random(`np${k}`) * 180;
      const ly = 60 + ((f * 9 + k * 37) % 160);
      return <line key={k} x1={lx} y1={ly} x2={lx - 6} y2={ly + 26} stroke="#8ab0ff" strokeWidth="6" strokeLinecap="round" opacity={1 - (ly - 60) / 160} />;
    })}
    <ellipse cx="-50" cy="20" rx="70" ry="50" fill="#7a8098" />
    <ellipse cx="40" cy="10" rx="90" ry="64" fill="#8a90a8" />
    <ellipse cx="0" cy="40" rx="120" ry="44" fill="#7a8098" />
  </g>
);
const Larme = ({x, y, u}) => (u > 0 ? <path transform={`translate(${x} ${y + 60 * u})`} d="M0,-14 Q10,2 8,8 A9,9 0 1 1 -8,8 Q-10,2 0,-14 Z" fill="#8ad0ff" opacity={1 - Math.max(0, u - 0.8) * 5} /> : null);
const Pouf = ({x, y, u}) => (u > 0 && u < 1 ? (
  <g opacity={1 - u}>
    {[...Array(7)].map((_, k) => {
      const a = -0.6 + k * 0.2;
      return <circle key={k} cx={x + Math.cos(a) * 140 * u} cy={y + Math.sin(a) * 90 * u} r={14 + 18 * u} fill="#ffffff" opacity="0.8" />;
    })}
  </g>
) : null);
const Censure = ({x, y, u, s = 1}) => (u > 0 ? (
  <g transform={`translate(${x} ${y}) scale(${u * s}) rotate(-6)`}>
    <rect x="-150" y="-50" width="300" height="100" rx="14" fill="#111" />
    <text x="20" y="22" textAnchor="middle" fontFamily={TITRE} fontSize="64" fill="#fff">BIP</text>
    <Emo c="1f92c" x={-100} y={0} s={80} />
  </g>
) : null);

// ---------- dans la tête : le poste de pilotage ----------
const Cockpit = ({f, alarme = 0, pression = 0, appui = 0, panneau = 0, pense = 0, haussement = 0, manuel = 0}) => {
  const gyro = alarme > 0 ? (Math.sin(f / 3) + 1) / 2 : 0;
  const ang = -120 + 240 * pression + tremble(f, 6 * pression, 'pg');
  const pose = {epauleD: appui > 0 ? lerp(-20, -60, appui) : -10 + haussement * -100, coudeD: appui > 0 ? lerp(10, 80, appui) : haussement * -60, epauleG: haussement * 100, coudeG: haussement * 60, eyes: 1.2 + 0.3 * alarme, worry: alarme, sweat: alarme, scream: 0.2 * alarme * (1 - appui), pupilY: appui > 0 ? 12 : 0, breath: Math.sin(f / 4) * 4};
  return (
    <g>
      <defs>
        <radialGradient id="ck-f" cx="50%" cy="40%" r="75%">
          <stop offset="0" stopColor="#2a3a6a" />
          <stop offset="1" stopColor="#0a0e22" />
        </radialGradient>
        <radialGradient id="ck-gy" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ff3a3a" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ff3a3a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <Couche p={0.3}>
        <rect x="-400" y="-400" width="1880" height="2900" fill="url(#ck-f)" />
        {/* grand écran : le cours, en direct */}
        <rect x="120" y="300" width="840" height="520" rx="30" fill="#06081a" stroke="#4a5a9a" strokeWidth="10" />
        <rect x="140" y="320" width="800" height="480" rx="20" fill={alarme > 0 ? (Math.floor(f / 6) % 2 ? '#5a0a14' : '#2a0610') : '#14244a'} />
        {alarme > 0 ? (
          <g>
            <text x="540" y="520" textAnchor="middle" fontFamily={TITRE} fontSize="66" fill="#ffd0d0">SITUATION</text>
            <text x="540" y="610" textAnchor="middle" fontFamily={TITRE} fontSize="78" fill="#ff5a5a">GÊNANTE</text>
            <Emo c="26a0" x={540} y={410} s={90} />
          </g>
        ) : (
          <g>
            <circle cx="540" cy="540" r="120" fill="#2a4a8a" />
            <Emo c="1f9e0" x={540} y={540} s={150} />
          </g>
        )}
        {/* manomètre de pression */}
        <g transform="translate(880 980)">
          <circle r="120" fill="#e8ecf4" stroke="#4a5a9a" strokeWidth="12" />
          <path d="M-90,50 A105,105 0 0 1 90,50" stroke="#3ad86a" strokeWidth="18" fill="none" pathLength="1" strokeDasharray="0.45 1" />
          <path d="M-90,50 A105,105 0 0 1 90,50" stroke="#ff3a3a" strokeWidth="18" fill="none" pathLength="1" strokeDasharray="0 0.6 0.4 1" />
          <path d={`M0,0 L${Math.sin((ang * Math.PI) / 180) * 90},${-Math.cos((ang * Math.PI) / 180) * 90}`} stroke="#1a1a2a" strokeWidth="10" strokeLinecap="round" />
          <circle r="14" fill="#1a1a2a" />
          {pression > 0.8 && [0, 1, 2].map((k) => <circle key={k} cx={60 + k * 20} cy={-140 - ((f * 3 + k * 20) % 80)} r={20 + k * 6} fill="#fff" opacity={0.4} filter="url(#flou4)" />)}
        </g>
      </Couche>
      {/* le pilote (un mini toi), derrière la console */}
      <Couche p={0.7}>
        <Eclaire l={alarme > 0 ? 'rouge' : 'froid'}>
          <Fig x={420} y={1700} s={0.78} {...pose} tete={<g><rect x="222" y="150" width="20" height="90" rx="10" fill="#2a2a34" /><rect x="358" y="150" width="20" height="90" rx="10" fill="#2a2a34" /><path d="M232,160 Q300,60 368,160" stroke="#2a2a34" strokeWidth="14" fill="none" /></g>} />
        </Eclaire>
        {pense > 0 && [...Array(9)].map((_, k) => {
          const u = pop(f, k * 4 * (1 / Math.max(0.1, pense)));
          const a = -2.6 + k * 0.32;
          return <Emo key={k} c="1f602" x={420 + Math.cos(a) * (300 + 40 * (k % 3))} y={900 + Math.sin(a) * 260 + 10 * Math.sin(f / 5 + k)} s={110 * u * Math.min(1, pense * 1.5)} rot={10 * Math.sin(f / 6 + k)} />;
        })}
        {pense > 0 && (
          <g transform="translate(420 760) rotate(-4)">
            <rect x="-170" y="-60" width="340" height="120" rx="12" fill="#ffffff" />
            <text y="22" textAnchor="middle" fontFamily={TITRE} fontSize="50" fill="#e83a3a">RIGOLE PAS</text>
            <rect x="-8" y="60" width="16" height="140" fill="#c8a070" />
          </g>
        )}
        {manuel > 0 && (
          <g transform={`translate(600 1240) rotate(${180 + 10 * Math.sin(f / 6)}) scale(${manuel})`}>
            <rect x="-120" y="-80" width="240" height="160" rx="10" fill="#ffd23a" />
            <text y="10" textAnchor="middle" fontFamily={TITRE} fontSize="30" fill="#3a2a00">MODE D'EMPLOI</text>
          </g>
        )}
      </Couche>
      {/* la console et les boutons */}
      <Couche p={1.0}>
        <path d="M-200,1380 L1280,1380 L1280,2400 L-200,2400 Z" fill="#1e2648" />
        <path d="M-200,1380 L1280,1380 L1280,1420 L-200,1420 Z" fill="#3a4a8a" />
        {[...Array(12)].map((_, k) => <circle key={k} cx={60 + k * 90} cy="1470" r="12" fill={['#3ad86a', '#ffd23a', '#4ac8ff'][k % 3]} opacity={0.4 + 0.6 * (Math.floor(f / 4 + k) % 3 === 0 ? 1 : 0.3)} />)}
        {panneau > 0 && [['PLEURER', '#4a8aff', 230], ["S'EXCUSER", '#3ab86a', 540], ['RIRE', '#ff3a3a', 850]].map(([t, c, x], k) => {
          const u = pop(f, k * 4);
          const enfonce = k === 2 ? appui : 0;
          return (
            <g key={k} transform={`translate(${x} ${1600 + 14 * enfonce}) scale(${u * (k === 2 ? 1.2 : 1)})`}>
              <ellipse cx="0" cy="40" rx="120" ry="40" fill="#0a0e22" />
              <ellipse cx="0" cy={20 - 0} rx="110" ry="36" fill={c} />
              <ellipse cx="0" cy={6 - 0} rx="110" ry="36" fill={c} />
              <ellipse cx="-20" cy="-4" rx="60" ry="14" fill="#fff" opacity="0.35" />
              <text y="110" textAnchor="middle" fontFamily={TITRE} fontSize={k === 2 ? 52 : 40} fill="#fff">{t}</text>
            </g>
          );
        })}
      </Couche>
      {/* gyrophare + lumière rouge qui balaie */}
      {alarme > 0 && (
        <g>
          <rect width="1080" height="1920" fill="#ff2a2a" opacity={0.12 * gyro} style={{mixBlendMode: 'screen'}} />
          <circle cx="980" cy="200" r="40" fill="#ff3a3a" />
          <circle cx="980" cy="200" r="200" fill="url(#ck-gy)" opacity={gyro} />
        </g>
      )}
    </g>
  );
};
// masque « dans la tête » : un cercle qui s'ouvre
const Iris = ({u, cx = 540, cy = 760, children, id = 'iris'}) => (
  <g>
    <defs>
      <clipPath id={id}>
        <circle cx={cx} cy={cy} r={1 + 1500 * u} />
      </clipPath>
    </defs>
    <g clipPath={`url(#${id})`}>{children}</g>
  </g>
);

// ---------- la cocotte-minute ----------
const Cocotte = ({f, siffle = 1}) => (
  <g>
    <Couche p={0.85}>
      <Ombre x={540} y={1380} rx={420} ry={50} o={0.35} />
      <rect x="40" y="1360" width="1000" height="60" rx="10" fill="#2a2a34" />
      {[260, 820].map((x) => <ellipse key={x} cx={x} cy="1362" rx="150" ry="18" fill="#ff5a2a" opacity={0.5 + 0.3 * Math.sin(f / 2 + x)} />)}
      <g transform={`translate(${tremble(f, 6 * siffle, 'co')} 0)`}>
        <rect x="270" y="1060" width="540" height="300" rx="40" fill="#b8c0cc" />
        <rect x="270" y="1060" width="200" height="300" rx="40" fill="#e0e6ee" opacity="0.6" transform="translate(-270 0)" />
        <rect x="160" y="1150" width="120" height="40" rx="20" fill="#2a2a34" />
        <rect x="800" y="1150" width="120" height="40" rx="20" fill="#2a2a34" />
        <ellipse cx="540" cy="1060" rx="290" ry="70" fill="#d0d6de" />
        {/* le couvercle : ta tête, joues gonflées */}
        <g transform="translate(540 1000)">
          <circle r="150" fill="#F2C3A0" />
          <path d="M-150,-10 Q-140,-150 0,-152 Q140,-150 150,-10 Q120,-80 60,-100 Q20,-60 -40,-80 Q-90,-60 -150,-10 Z" fill="#2B2140" />
          <path d="M-60,10 Q-44,0 -28,10 M28,10 Q44,0 60,10" stroke="#1E1E2A" strokeWidth="9" fill="none" strokeLinecap="round" />
          <circle cx="-80" cy="50" r="34" fill="#ff8a80" opacity={0.6 + 0.3 * siffle} />
          <circle cx="80" cy="50" r="34" fill="#ff8a80" opacity={0.6 + 0.3 * siffle} />
          <ellipse cx="0" cy="70" rx="30" ry="12" fill="#7A2E3A" />
        </g>
        <rect x="520" y="790" width="40" height="70" rx="10" fill="#2a2a34" />
        {/* la vapeur qui siffle */}
        {[...Array(10)].map((_, k) => {
          const u = ((f * 0.06 + k / 10) % 1);
          return <circle key={k} cx={540 + Math.sin(k * 2 + f / 5) * 40 * u} cy={780 - u * 700} r={20 + 70 * u} fill="#ffffff" opacity={(1 - u) * 0.6 * siffle} filter="url(#flou8)" />;
        })}
        {[0, 1, 2].map((k) => <path key={`s${k}`} d={`M${600 + k * 30},${760 - k * 20} q40,-30 80,0`} stroke="#fff" strokeWidth="6" fill="none" opacity={siffle * (Math.floor(f / 3 + k) % 2)} />)}
      </g>
    </Couche>
  </g>
);

// ===================== les scènes =====================
const Image = ({fg, t, cam, punch = 0.05, soleil = 1, children, dessus = null, noir = 0, ambiance = true}) => (
  <AbsoluteFill style={{background: '#000'}}>
    <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
      <DefsFlou />
      <DefsLumiere />
      <Cadre cam={cam} t={t} punch={punch}>{children}</Cadre>
      {ambiance && <Ambiance f={fg} soleil={soleil} />}
      {dessus}
      <rect width="1080" height="1920" fill="#000" opacity={noir} />
      <Finition f={fg} id="rif" grain={0.03} vignette={0.45} />
    </svg>
  </AbsoluteFill>
);
const scene = (nom, rendu) => {
  const C = () => {
    const f = useCurrentFrame();
    const {i, t, d} = decoupe(nom, f);
    return rendu({f, fg: START[nom] + f, i, t, d, k: lisse(t, d), R: (mot, def) => repere(nom, mot, def)});
  };
  C.displayName = nom;
  return C;
};
const poseProf = (f, triste = 0) => ({epauleG: 10, coudeG: -10, epauleD: -10, coudeD: 10, worry: triste, eyes: lerp(1.05, 0.8, triste), smile: 0.4 * (1 - triste), brows: -4 * (1 - triste), tilt: 4 * triste, breath: Math.sin(f / 9) * 3});
const ProfFig = ({x, y, s, l = 'chaud', ...p}) => (
  <Eclaire l={l}>
    <Fig x={x} y={y} s={s} {...PROF} tete={<LunettesMoustache />} devant={<CravateProf />} {...p} />
  </Eclaire>
);

// 1. Pourquoi ton pote, ce fils de BIP, se tape une barre quand le prof dit que sa mère est morte ?
const Intro = scene('intro', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    // 1re image : toi… non, ton pote, au fond, qui se retient d'exploser de rire
    const bip = pop(f, R('bip', 50) - 3) * (1 - ease(f, R('bip', 50) + 16, R('bip', 50) + 22));
    const se = Math.abs(Math.sin(f / 2.2));
    return (
      <Image fg={fg} t={t} cam={{x: lerp(40, 30, k), y: lerp(120, 100, k), z: lerp(2.9, 2.5, k)}} punch={0.08}>
        <Couche p={0.3}>
          <MurFond f={fg} />
        </Couche>
        <RangFond f={fg} pote={{smile: 0.2, eyes: 0.35, blush: 0.6, scream: 0.15, tilt: tremble(f, 6, 'ti'), sweat: 0.4, lift: -se * 8}} toi={{pupilX: -12, eyes: 1.2, worry: 0.3}} />
        <Couche p={0.62}>
          <Censure x={560} y={760} u={bip} s={0.6} />
        </Couche>
      </Image>
    );
  }
  // le prof, au tableau, la mine triste ; le nuage passe devant le soleil
  const triste = ease(f, R('mère', 121) - 10, R('morte', 130));
  return (
    <Image fg={fg} t={t} cam={{x: lerp(60, 80, k), y: -120, z: lerp(1.25, 1.35, k)}} soleil={1 - 0.7 * triste}>
      <Classe f={fg} titre={['LE RIRE', 'NERVEUX']} ecrit={1} soleil={1 - 0.7 * triste} />
      <Couche p={0.8}>
        <Bureau />
        <ProfFig x={760} y={1720} s={1.05} {...poseProf(f, triste)} />
        {triste > 0.3 && <NuagePluie x={760} y={720} s={0.8 * triste} f={fg} />}
      </Couche>
    </Image>
  );
});

// 2. Le prof arrive : « ma mère est décédée ». Silence. Et là, ton pote : « Pfff. »
const Annonce = scene('annonce', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    // le prof entre, la voix cassée (vu du fond de la classe, les élèves de dos)
    const marche = ease(t, 0, 40, Easing.out(Easing.cubic));
    const m = Math.sin(fg / 4) * (1 - marche);
    return (
      <Image fg={fg} t={t} cam={{x: lerp(-40, 0, k), y: 40, z: lerp(1.0, 1.06, k)}} soleil={0.45}>
        <Classe f={fg} titre={['LE RIRE', 'NERVEUX']} soleil={0.45} />
        <Couche p={0.8}>
          <Bureau />
          <ProfFig x={lerp(1100, 700, marche)} y={1720} s={1.0} l="froid" {...poseProf(f, 1)} legG={Math.max(0, m) * 0.6} legD={Math.max(0, -m) * 0.6} />
        </Couche>
        <Couche p={1.3} flou={4}>
          {[120, 400, 690, 960].map((x, j) => <Fig key={j} x={x} y={2420} s={1.25} dos {...ELEVES[j]} ombre={false} breath={Math.sin(fg / 9 + j) * 3} />)}
        </Couche>
      </Image>
    );
  }
  if (i === 1) {
    // gros plan : la larme, le nuage de pluie
    const larme = ease(f, R('décédée', 138) - 6, R('décédée', 138) + 30, Easing.in(Easing.quad));
    const s = 2.3;
    const [lx, ly] = versEcran(540, 2900, s, [262, 214]);
    return (
      <Image fg={fg} t={t} cam={{z: lerp(1.0, 1.08, k), y: lerp(0, -30, k)}} soleil={0.35}>
        <Classe f={fg} titre={['LE RIRE', 'NERVEUX']} soleil={0.35} />
        <Couche p={0.9}>
          <ProfFig x={540} y={2900} s={s} l="froid" {...poseProf(f, 1)} eyes={0.75} />
          <Larme x={lx} y={ly} u={larme} />
          <NuagePluie x={540} y={420} s={1.4} f={fg} />
        </Couche>
      </Image>
    );
  }
  if (i === 2) {
    // silence total : toute la classe figée ; on avance doucement vers ton pote
    return (
      <Image fg={fg} t={t} cam={{x: lerp(0, 32, k), y: lerp(-40, 110, k), z: lerp(1.0, 2.0, Easing.in(Easing.quad)(k))}} soleil={0.4} punch={0.02}>
        <Couche p={0.3}>
          <MurFond f={fg} soleil={0.4} />
        </Couche>
        <RangFond f={fg} pote={{smile: 0, eyes: 1, worry: 0.6, blush: 0.4 * k, pupilX: -8}} toi={{eyes: 1.1}} autres={{eyes: 1.1, worry: 0.3}} focus={k > 0.4 ? 'fond' : 'devant'} />
        <Couche p={0.6}>
          <Emo c="1f997" x={160} y={1420} s={70} rot={5 * Math.sin(fg / 2)} />
        </Couche>
      </Image>
    );
  }
  // « Pfff » : il lâche tout, toutes les têtes se tournent vers lui
  const pf = R('pfff', 237);
  const lache = f >= pf - 2;
  const tourne = ease(f, pf + 4, pf + 14);
  return (
    <Image fg={fg} t={t} cam={{x: 32, y: 110, z: 2.3 + 0.3 * ease(f, pf - 2, pf + 4, Easing.out(Easing.back(2)))}} soleil={0.4} punch={0}>
      <Couche p={0.3}>
        <MurFond f={fg} soleil={0.4} />
      </Couche>
      <RangFond f={fg} pote={{smile: lache ? 1 : 0, scream: lache ? 0 : 0.3, eyes: lache ? 0.3 : 0.6, blush: 0.8, tilt: lache ? -8 : 0}} toi={{pupilX: -14 * tourne, eyes: 1.4, worry: 0.8}} autres={{pupilX: 14 * tourne, eyes: 1.3}} />
      <Couche p={0.62}>
        <Pouf x={600} y={860} u={ease(f, pf - 2, pf + 14)} />
      </Couche>
    </Image>
  );
});

// 3. C'est pas un psychopathe : c'est un rire nerveux. Dans sa tête, le pilote panique et appuie sur RIRE.
const Nerveux = scene('nerveux', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    // le prof au tableau : il barre PSYCHOPATHE, il écrit RIRE NERVEUX
    const barre = ease(f, R('psychopathe', 53) - 4, R('psychopathe', 53) + 10);
    const ecrit = ease(f, R('rire', 82) - 8, R('nerveux', 89) + 10, Easing.linear);
    const pose = {epauleG: 130 + 10 * Math.sin(f / 3), coudeG: 20, epauleD: -20, coudeD: 40, smile: 0.6, eyes: 1.1, brows: -4, breath: Math.sin(f / 7) * 4};
    const schema = (
      <g>
        <text x="540" y="560" textAnchor="middle" fontFamily={TITRE} fontSize="80" fill="#f4f2ea">PSYCHOPATHE</text>
        <path d="M200,540 L880,560" stroke="#ff6a6a" strokeWidth="16" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - barre} />
        <clipPath id="nv-c">
          <rect x="140" y="640" width={800 * ecrit} height="200" />
        </clipPath>
        <text x="540" y="770" textAnchor="middle" fontFamily={TITRE} fontSize="92" fill="#9ad8ff" clipPath="url(#nv-c)">RIRE NERVEUX</text>
      </g>
    );
    return (
      <Image fg={fg} t={t} cam={{x: lerp(-30, -50, k), y: -60, z: lerp(1.08, 1.14, k), r: -1.5}}>
        <Classe f={fg} titre={[]} schema={schema} />
        <Couche p={0.8}>
          <ProfFig x={880} y={1760} s={1.1} {...pose} pupilX={-14} />
          <Poussiere f={t} t0={8} x={versEcran(880, 1760, 1.1, mainG(pose))[0]} y={versEcran(880, 1760, 1.1, mainG(pose))[1]} />
        </Couche>
      </Image>
    );
  }
  // dans sa tête : le cercle s'ouvre sur le poste de pilotage
  const iris = i === 1 ? ease(t, 0, 14, Easing.out(Easing.cubic)) : 1;
  const alarme = f >= R('gênante', 173) - 30 ? 1 : 0;
  const pression = i >= 2 ? ease(f, R('tendue', 191), R('pression', 261) + 12, Easing.in(Easing.quad)) : 0;
  const appui = i === 3 ? ease(f, R('bouton', 318) - 6, R('bouton', 318) + 2, Easing.in(Easing.quad)) : 0;
  const flash = i === 3 ? interpolate(f - R('bouton', 318) - 2, [0, 2, 10], [0, 0.8, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <DefsFlou />
        <DefsLumiere />
        <Iris u={iris} cy={900}>
          <Cadre cam={{z: i === 3 ? 1.0 + 0.12 * k : 1.05 + 0.04 * k, y: i === 3 ? 120 * k : 0, x: tremble(fg, 10 * pression, 'ck')}} t={t} punch={0.03}>
            <Cockpit f={f} alarme={alarme} pression={pression} appui={appui} panneau={i === 3 ? 1 : 0} />
          </Cadre>
        </Iris>
        <rect width="1080" height="1920" fill="#fff" opacity={flash} />
        <Finition f={fg} id="nvf" grain={0.03} vignette={0.5} />
      </svg>
    </AbsoluteFill>
  );
});

// 4. Une soupape : comme une cocotte-minute qui siffle
const Soupape = scene('soupape', ({f, fg, t, k}) => (
  <Image fg={fg} t={t} cam={{z: lerp(1.0, 1.1, k), y: lerp(40, -20, k)}}>
    <Cuisine f={fg} fane={0} />
    <Cocotte f={f} siffle={ease(t, 6, 14)} />
  </Image>
));

// 5. Plus il essaie de s'arrêter, plus ça monte. « Surtout rigole pas »… donc il pense qu'à ça.
const Monte = scene('monte', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    const jauge = ease(t, 0, 90, Easing.in(Easing.quad));
    const sec = tremble(fg, 10 * jauge, 'mt');
    return (
      <Image fg={fg} t={t} cam={{x: 32 + sec * 0.3, y: 110, z: lerp(2.0, 2.6, k)}} punch={0.04}
        dessus={
          <g transform="translate(940 700)">
            <rect x="-40" y="-300" width="80" height="600" rx="40" fill="#14123a" opacity="0.7" />
            <rect x="-28" y={288 - 576 * jauge} width="56" height={576 * jauge} rx="28" fill={jauge > 0.7 ? '#ff3a3a' : '#ffc83a'} />
            <Emo c="1f602" x={0} y={-360} s={90} />
          </g>
        }>
        <Couche p={0.3}>
          <MurFond f={fg} soleil={0.5} />
        </Couche>
        <RangFond f={fg} pote={{smile: 0, scream: 0, eyes: lerp(0.8, 0.25, jauge), blush: 0.4 + 0.6 * jauge, worry: 0.8, sweat: jauge, tilt: sec * 0.4, lift: -Math.abs(Math.sin(f / 1.6)) * 6 * jauge, epauleG: 120 * jauge, coudeG: 60 * jauge}} toi={{pupilX: -10}} />
      </Image>
    );
  }
  // dans la tête : il brandit « RIGOLE PAS »… et les 😂 se multiplient
  const pense = ease(f, R('donc', 183) - 30, R('quà', 197));
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <DefsFlou />
        <DefsLumiere />
        <Iris u={ease(t, 0, 12, Easing.out(Easing.cubic))} cy={900} id="ir2">
          <Cadre cam={{z: 1.04 + 0.06 * k}} t={t} punch={0.03}>
            <Cockpit f={f} pense={Math.max(0.05, pense)} alarme={0} />
          </Cadre>
        </Iris>
        <Finition f={fg} id="mtf" grain={0.03} vignette={0.5} />
      </svg>
    </AbsoluteFill>
  );
});

// 6. Il croise ton regard : c'est fini. Deux à pleurer de rire au fond de la classe.
const Regard = scene('regard', ({f, fg, i, t, k, R}) => {
  const fini = f >= R('fini', 60) - 4;
  if (i === 0) {
    // gros plan : ses yeux qui glissent vers toi
    const glisse = ease(t, 10, 40);
    return (
      <Image fg={fg} t={t} cam={{x: 32, y: 100, z: 3.1 + 0.2 * k}} punch={0.03} soleil={0.6}>
        <Couche p={0.3}>
          <MurFond f={fg} soleil={0.6} />
        </Couche>
        <RangFond f={fg} pote={{eyes: 0.8, pupilX: 14 * glisse, worry: 0.6, blush: 0.7, smile: 0}} />
      </Image>
    );
  }
  if (i === 1) {
    // toi, qui le regardes aussi… et vous explosez
    return (
      <Image fg={fg} t={t} cam={{x: 516, y: 100, z: 3.0 + 0.15 * k}} punch={0.06} soleil={0.6}>
        <Couche p={0.3}>
          <MurFond f={fg} soleil={0.6} />
        </Couche>
        <RangFond f={fg} toi={fini ? {smile: 1, eyes: 0.25, blush: 0.8, tilt: tremble(fg, 10, 'tr'), lift: -Math.abs(Math.sin(f / 1.5)) * 10} : {pupilX: -14, eyes: 1.1, worry: 0.4}} />
      </Image>
    );
  }
  // plan large : vous deux pleurez de rire, le prof vous fusille du regard
  const rire = (o) => ({smile: 1, eyes: 0.25, blush: 0.9, tilt: tremble(fg + o, 10, 'rr'), lift: -Math.abs(Math.sin(f / 1.5 + o)) * 10, epauleD: -150, coudeD: -40 + 20 * Math.sin(f / 2 + o)});
  return (
    <Image fg={fg} t={t} cam={{x: 0, y: -40, z: lerp(1.0, 1.05, k)}} soleil={0.7}>
      <Couche p={0.3}>
        <MurFond f={fg} soleil={0.7} />
      </Couche>
      <RangFond f={fg} pote={rire(0)} toi={rire(3)} autres={{eyes: 1.2, pupilX: 8}} focus="fond" />
      <Couche p={0.62}>
        {[560, 860].map((x, j) => <Larme key={j} x={x - 40} y={930} u={((f + j * 9) % 18) / 18} />)}
      </Couche>
    </Image>
  );
});

// 7. Ça arrive même aux enterrements. Son cerveau sait pas gérer.
const Enterrement = scene('enterrement', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    const trace = ease(t, 0, 40, Easing.inOut(Easing.cubic));
    const schema = (
      <g opacity="0.95">
        <path d="M380,800 L420,600 L660,600 L700,800 Z" fill="none" stroke="#f4f2ea" strokeWidth="10" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - trace} />
        <path d="M540,640 L540,720 M510,670 L570,670" stroke="#f4f2ea" strokeWidth="8" opacity={trace > 0.6 ? 1 : 0} />
        {[250, 830].map((x, j) => (
          <g key={j} opacity={trace > 0.3 ? 1 : 0} stroke="#f4f2ea" strokeWidth="8" fill="none" strokeLinecap="round">
            <circle cx={x} cy="580" r="32" />
            <path d={`M${x},612 L${x},720 M${x},720 L${x - 30},800 M${x},720 L${x + 30},800 M${x},650 L${x - 40},700 M${x},650 L${x + 40},700`} />
          </g>
        ))}
        <g opacity={ease(t, 30, 40)}>
          <ellipse cx="900" cy="520" rx="70" ry="40" fill="none" stroke="#ffd23a" strokeWidth="6" />
          <text x="900" y="535" textAnchor="middle" fontFamily={TITRE} fontSize="40" fill="#ffd23a">PFFF</text>
        </g>
      </g>
    );
    return (
      <Image fg={fg} t={t} cam={{x: 0, y: -260, z: lerp(1.35, 1.45, k)}} soleil={0.8}>
        <Classe f={fg} titre={[]} schema={schema} soleil={0.8} />
      </Image>
    );
  }
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <DefsFlou />
        <DefsLumiere />
        <Iris u={ease(t, 0, 12, Easing.out(Easing.cubic))} cy={900} id="ir3">
          <Cadre cam={{z: 1.05 + 0.05 * k}} t={t} punch={0.03}>
            <Cockpit f={f} haussement={ease(t, 20, 32) * (1 - ease(t, 55, 67))} manuel={pop(f, R('gérer', 113) - 4)} />
          </Cadre>
        </Iris>
        <Finition f={fg} id="enf" grain={0.03} vignette={0.5} />
      </svg>
    </AbsoluteFill>
  );
});

// 8. Par contre, demain, il ira quand même s'excuser.
const Chute = scene('chute', ({f, fg, t, k, R}) => {
  const entre = ease(t, 8, 50, Easing.out(Easing.cubic));
  const m = Math.sin(fg / 4) * (1 - entre);
  const touche = ease(f, R('sexcuser', 74) - 4, R('sexcuser', 74) + 10);
  const pose = {epauleD: -40, coudeD: -70, blush: 1, eyes: 0.9, worry: 0.6, pupilY: 8, smile: 0.2};
  const [hx, hy] = versEcran(lerp(-150, 330, entre), 1730, 1.0, mainD(pose));
  return (
    <Image fg={fg} t={t} cam={{x: lerp(-20, 10, k), y: 30, z: lerp(1.02, 1.08, k)}} soleil={1}>
      <Classe f={fg} titre={['LE RIRE', 'NERVEUX']} soleil={1} />
      <Couche p={0.8}>
        <Bureau />
        <ProfFig x={860} y={1720} s={1.0} {...poseProf(f, 1 - touche)} smile={0.8 * touche} eyes={1.1} />
        <Eclaire>
          <Fig x={lerp(-150, 330, entre)} y={1730} s={1.0} {...pose} legG={Math.max(0, m) * 0.6} legD={Math.max(0, -m) * 0.6} />
        </Eclaire>
        <Emo c="1f490" x={hx + 30} y={hy - 60} s={180} rot={-15} />
        {touche > 0.5 && <Emo c="2764" x={800} y={760 - 40 * touche} s={90 * touche} />}
      </Couche>
    </Image>
  );
});

// 9. Et toi, ton pire fou rire au mauvais moment ? Dis-le en commentaire.
const Commentaire = scene('commentaire', ({f, fg, t, k, R}) => {
  const rire = (o) => ({smile: 1, eyes: 0.3, blush: 0.6, lift: -Math.abs(Math.sin(f / 1.8 + o)) * 8, tilt: 4 * Math.sin(f / 3 + o)});
  return (
    <Image fg={fg} t={t} cam={{x: 0, y: lerp(-60, 0, k), z: lerp(1.08, 1.0, k)}} soleil={1}
      dessus={<BulleCommentaire f={f} t0={R('dis-le', 72) - 2} y={1700} />}>
      <Couche p={0.3}>
        <MurFond f={fg} />
      </Couche>
      <RangFond f={fg} pote={rire(0)} toi={rire(2)} autres={rire(4)} focus="fond" />
    </Image>
  );
});

const COMPOSANTS = {intro: Intro, annonce: Annonce, nerveux: Nerveux, soupape: Soupape, monte: Monte, regard: Regard, enterrement: Enterrement, chute: Chute, commentaire: Commentaire};
export const LeRire = () => (
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
