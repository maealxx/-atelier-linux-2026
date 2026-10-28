import {AbsoluteFill, Easing, interpolate, random, Series, spring, staticFile, useCurrentFrame} from 'remotion';
import {montage, Plan} from './montage';
import {clamp, Finition, makeCam, Perso} from './moteur';
import {Chrono, ChoixBoite, Screamer, VHS, fmt} from './NeLuiOuvrePas';
import {COUCHE, doigts, DEBOUT, galop, melange, PENCHE, QUATRE, ECARTE, Rodeur, RodeurMonde} from './Rodeur';
import {BOUT, gresille, station, VOIT} from './Station';
import {Arriere, Facade, Interieur, Plafond, Quai} from './Station2D';
import PLANS from './station/plans.json';
import timeline from './station/timeline.json';

// « La station-service » (2,5D illustrée) : 3 h du matin, tu fais le plein au milieu de la forêt. La caissière colle une
// feuille contre la vitre : « NE LÈVE PAS LES YEUX ». Quelque chose goutte sur ton épaule : une créature couchée sur le toit
// de ta voiture. Dilemme au milieu : la voiture (tu meurs, rembobinage VHS) ou la boutique. Dedans, les néons s'éteignent
// un à un, et la caissière sourit… beaucoup trop grand. Dilemme final : le générateur, ou rester avec elle ?
const {decoupe, repere, SCENES} = montage(timeline, PLANS);
export const DUREE_STATION = SCENES.reduce((t, [, d]) => t + d, 0);
const START = {};
const DUREE = {};
SCENES.reduce((t, [nom, d]) => {
  START[nom] = t;
  DUREE[nom] = d;
  return t + d;
}, 0);

const EZ = Easing.bezier(0.45, 0, 0.55, 1);
const lisse = (t, d) => EZ(Math.min(1, Math.max(0, t / Math.max(1, d))));
const ease = (f, a, b, e = EZ) => interpolate(f, [a, b], [0, 1], {...clamp, easing: e});
const lerp = (a, b, t) => a + (b - a) * t;
const tremble = (f, k, cle) => k * (random(`${cle}${f}`) - 0.5);
// caméra 2D portée à la main
const main = (f, k = 1) => ({x: k * (6 * Math.sin(f / 23) + 4 * Math.sin(f / 9.7)), y: k * 4 * Math.sin(f / 17 + 1), r: k * 0.4 * Math.sin(f / 31)});
const cam2 = (fg, x, y, zoom, k = 1) => {
  const m = main(fg, k);
  return {x: x + m.x / zoom, y: y + m.y / zoom, zoom, roll: m.r};
};
const camMix = (a, b, u) => ({x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), zoom: lerp(a.zoom, b.zoom, u)});
const R2 = (f, seed, k) => (random(`${seed}${Math.floor(f / 2)}`) > 0.35 * k ? 1 : 0.2);

// le cadre commun : un décor 2D + flou de bougé éventuel + finition (grain, vignette)
const Ecran = ({fg, roll = 0, flou = 0, noir = 0, children, dessus = null}) => (
  <AbsoluteFill style={{background: '#000'}}>
    <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
      <defs>
        <filter id="ec-bouge" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={`${flou} 0`} />
        </filter>
      </defs>
      <g transform={`rotate(${roll} 540 960)`} filter={flou > 0.5 ? 'url(#ec-bouge)' : undefined}>{children}</g>
      <rect width="1080" height="1920" fill="#000" opacity={noir} />
      {dessus}
      <Finition f={fg} grain={0.03} vignette={0.8} />
    </svg>
  </AbsoluteFill>
);

const RENDUS = {};
const scene = (nom, rendu) => {
  const C = () => {
    const f = useCurrentFrame();
    const {i, t, d, bornes} = decoupe(nom, f);
    return rendu({f, fg: START[nom] + f, i, t, d, bornes, R: (mot, def) => repere(nom, mot, def)});
  };
  C.displayName = nom;
  RENDUS[nom] = rendu;
  return C;
};
const imageA = (fg) => {
  const nom = SCENES.find(([n, d]) => fg >= START[n] && fg < START[n] + d)?.[0] || SCENES[0][0];
  const f = fg - START[nom];
  const {i, t, d, bornes} = decoupe(nom, f);
  return RENDUS[nom]({f, fg, i, t, d, bornes, R: (mot, def) => repere(nom, mot, def)});
};

// ----- ce qui ne change pas d'un plan à l'autre -----
const compteur = (fg) => Math.min(41.8, 18.2 + fg * 0.04);
const neonsA = (fg) => [R2(fg, 'a0', 0.12), 1, fg % 97 < 6 ? R2(fg, 'a2', 0.9) : 1];
// elle est sur le toit de la voiture, penchée : sa tête pend juste au-dessus de la tienne
const CACHEE = (fg) => ({pose: COUCHE, tete: 15 * Math.sin(fg / 40), x: -230, y: 40, s: 0.5});
const CREAT = (fg, extra = {}) => ({pose: PENCHE, tete: 25 + 10 * Math.sin(fg / 40), x: 8, y: 40, s: 0.55, ...extra});
const MOI = (pose = {}) => ({pose: {epauleD: -20, coudeD: 120, ...pose}});
const TETE_MOI = {x: 230, y: -200};
const TOIT = {x: 235, y: -240};
const ECRAN_P = {x: 640, y: -80};

// ----- quelques plans en vraie 3D (la station entière, la contre-plongée, la course vers la boutique) -----
const deg = (r) => (r * 180) / Math.PI;
const vise = (p, c) => {
  const dx = c[0] - p[0];
  const dy = c[1] - p[1];
  const dz = (c[2] - p[2]) * 1000;
  return {x: p[0], y: p[1], z: p[2], yaw: deg(Math.atan2(dx, dz)), pitch: deg(Math.atan2(dy, Math.hypot(dx, dz)))};
};
const main3 = (f, k = 1) => ({dx: k * (5 * Math.sin(f / 23) + 3 * Math.sin(f / 9.7)), dy: k * 3 * Math.sin(f / 17 + 1), r: k * 0.35 * Math.sin(f / 31)});
const OEIL = -150;
const pov = (fg, p, c, {k = 1, pas = 0, v = 0.21} = {}) => {
  const m = main3(fg, k);
  return vise([p[0] + m.dx + Math.sin(fg * v) * 9 * pas, p[1] + m.dy - Math.abs(Math.sin(fg * v)) * 16 * pas, p[2]], c);
};
const roulis = (fg, k = 1, pas = 0, v = 0.21) => main3(fg, k).r + Math.sin(fg * v) * 0.9 * pas;
const mix3 = (a, b, u) => a.map((x, i) => x + (b[i] - x) * u);
const NEON_T = [0.84, 0.92, 1.05];
const auvent = (fg) => [gresille(fg, 'a0', 0.15), 1, fg % 97 < 6 ? gresille(fg, 'a2', 1) : 1, 1];
const MOI3 = {x: 60, z: 1.1};
const caissiere3 = (cam, {x = 870, z = BOUT.z0 + 0.25, id = 'ca', ...pose}) => ({z, x, el: <Perso cam={cam} id={id} x={x} z={z} lum={0.95} teinte={[0.95, 0.97, 1.0]} ombre={0.25} coiffure="queue" cils couleurs={{haut: '#2a6a8a', hautO: '#1f5470', chev: '#3a2418'}} {...pose} />});
const moi3 = (cam, {id, ...pose}) => ({z: MOI3.z, x: MOI3.x, el: <Perso cam={cam} id={id} x={MOI3.x} z={MOI3.z} lum={0.85} teinte={NEON_T} ombre={0.35} epauleD={-20} coudeD={120} {...pose} />});
// sur le toit : couchée au fond (cachée), ou penchée, la tête juste au-dessus de la tienne
const toit3 = (cam, fg, {penche = true, ouvre = 0, tete = 25} = {}) => {
  const x = penche ? MOI3.x - 450 * 0.55 : -470;
  return {z: MOI3.z + 0.05, x, y: VOIT.toit, el: <RodeurMonde cam={cam} x={x} z={MOI3.z + 0.05} y={VOIT.toit} pose={penche ? PENCHE : COUCHE} echelle={0.55} tete={penche ? tete : 15 * Math.sin(fg / 40)} ouvre={ouvre} respire={0.5 + 0.5 * Math.sin(fg / 14)} lum={0.9} id={`rt${fg}`} />};
};
const Vue3D = ({fg, cam: c, items = [], o = {}, zoom = 1, roll = 0, noir = 0, dessus = null}) => {
  const cam = makeCam(c);
  const its = typeof items === 'function' ? items(cam) : items;
  const d = station(cam, fg, {auvent: auvent(fg), compteur: compteur(fg), ...o, extra: its.filter(Boolean)});
  return <Plan grain={0.03} vignette={0.8} f={fg} cam={cam} decor={d} items={[]} zoom={zoom} roll={roll} noir={noir} dessus={dessus} />;
};

const Deux = ({f, a, b, choisi = 0}) => (
  <g>
    <ChoixBoite f={f} debut={a} x={540} y={300} texte="LA VOITURE" emoji="1f697" couleur="#ffb03a" etat={choisi === 1 ? 1 : choisi === 2 ? -1 : 0} />
    <ChoixBoite f={f} debut={b} x={540} y={500} texte="LA BOUTIQUE" emoji="1f3ea" couleur="#5ab0ff" etat={choisi === 2 ? 1 : choisi === 1 ? -1 : 0} />
  </g>
);

// ===== 1. 3 h du matin, tu fais le plein au milieu de la forêt (1re image : toi) =====
const Pompe = scene('pompe', ({fg, i, t, d}) => {
  const k = lisse(t, d);
  const o = {compteur: compteur(fg), neons: neonsA(fg), moi: MOI({pupilX: 6}), creature: CACHEE(fg)};
  if (i === 2) {
    // en 3D : la station, seule au milieu de la forêt, la grue descend vers toi
    const c = vise([-2600 + 600 * k, -700, -5.5 + 1.5 * k], [0, -300, 2.5]);
    return <Vue3D fg={fg} cam={c} items={(cam) => [moi3(cam, {id: 'p2', pupilX: 6}), toit3(cam, fg, {penche: false})]} />;
  }
  if (i < 2) {
    const c = [
      () => cam2(fg, TETE_MOI.x - 20, TETE_MOI.y + 80 - 30 * k, 2.4 + 0.25 * k),
      () => cam2(fg, ECRAN_P.x, ECRAN_P.y, 5.2 + 0.4 * k, 0.6),
    ][i]();
    return <Ecran fg={fg} roll={c.roll}><Quai cam={c} f={fg} o={o} /></Ecran>;
  }
  // tu lèves les yeux vers la boutique : la caissière te fixe
  const c = cam2(fg, 0, -150, 1.05 + 0.25 * k, 0.8);
  return <Ecran fg={fg} roll={c.roll}><Facade cam={c} f={fg} o={{caissiere: {pose: {eyes: 1.3, worry: 0.8}}}} /></Ecran>;
});

// ===== 2. La caissière tape contre la vitre. Fort. =====
const Vitre = scene('vitre', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const tape = f > R('tape', 43) - 4 ? Math.max(0, Math.sin(f * 0.9)) : 0;
  const bras = {epauleD: -150 - 30 * tape, coudeD: -40, epauleG: 150 + 30 * tape, coudeG: 40, eyes: 1.45, worry: 1, scream: 0.3};
  const c = i === 0 ? cam2(fg, 0, -120, 1.3 + 0.3 * k, 1 + tape) : cam2(fg, 0, -237, 2.6 + 0.2 * k, 0.8 + tape);
  return <Ecran fg={fg} roll={c.roll}><Facade cam={c} f={fg} o={{tape, caissiere: {pose: bras}}} /></Ecran>;
});

// ===== 3. Elle colle une feuille contre le verre : « Ne lève pas les yeux. » =====
const Feuille = scene('feuille', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const feuille = ease(f, R('colle', 10), R('feuille', 28) + 6);
  const c = i === 0 ? cam2(fg, 0, -150, 1.4 + 0.3 * k, 0.7) : cam2(fg, 0, -130, 2.5 + 0.35 * k, 0.5);
  return <Ecran fg={fg} roll={c.roll}><Facade cam={c} f={fg} o={{feuille: i === 0 ? feuille : 1, caissiere: {pose: {epauleD: -110, coudeD: -60, epauleG: 110, coudeG: 60, eyes: 1.4, worry: 1}}}} /></Ecran>;
});

// gouttes noires qui tombent (repère écran)
const Gouttes = ({f, t0, x, y, y0 = -80, n = 4, s = 1}) => (
  <g>
    {[...Array(n)].map((_, k) => {
      const tk = t0 + k * 14;
      const u = (f - tk) / 9;
      if (u < 0) return null;
      const yy = u < 1 ? lerp(y0, y, u * u) : y;
      return (
        <g key={k}>
          {u < 1 && <ellipse cx={x + k * 14 * s} cy={yy} rx={9 * s} ry={17 * s} fill="#050307" />}
          {u >= 1 && <ellipse cx={x + k * 14 * s - 6} cy={y + 4} rx={(18 + 12 * Math.min(1, (u - 1) * 2)) * s} ry={(8 + 4 * Math.min(1, (u - 1) * 2)) * s} fill="#050307" opacity="0.92" />}
        </g>
      );
    })}
  </g>
);

// ===== 4. Tu ne comprends pas. Quelque chose goutte sur ton épaule. Noir. Épais. =====
const Goutte = scene('goutte', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const peur = ease(f, R('noir', 113), R('noir', 113) + 8);
  // on ne la voit pas encore : seulement les gouttes qui tombent du haut de l'image
  const o = {compteur: compteur(fg), neons: neonsA(fg)};
  if (i === 0) {
    const c = cam2(fg, TETE_MOI.x, TETE_MOI.y + 60, 2.6 + 0.2 * k);
    return <Ecran fg={fg} roll={c.roll}><Quai cam={c} f={fg} o={{...o, moi: MOI({brows: 6, pupilX: 10, worry: 0.3})}} /></Ecran>;
  }
  // gros plan : l'épaule, les gouttes noires qui tombent dessus
  const c = cam2(fg, TETE_MOI.x - 50, TETE_MOI.y + 120, 4.2 + 0.3 * k, 0.6);
  const ep = {x: 540 + (258 - c.x) * c.zoom, y: 960 + (-15 - c.y) * c.zoom};
  return (
    <Ecran fg={fg} roll={c.roll} dessus={<Gouttes f={f} t0={R('goutte', 72) - 26} x={ep.x} y={ep.y} s={c.zoom / 2.5} />}>
      <Quai cam={c} f={fg} o={{...o, moi: MOI({eyes: 1.15 + 0.35 * peur, worry: 0.4 + 0.6 * peur, pupilX: -12 * peur, pupilY: -6 * peur})}} />
    </Ecran>
  );
});

// longs doigts gris qui entrent par le haut de l'image
const Doigts = ({x, y, s = 2.2, plie = 0.25}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {doigts([0, 0], [0.15, 1], {long: 1.3, plie, cote: 1}).map((dd, j) => (
      <g key={j}>
        <polyline points={dd.map((p) => p.join(',')).join(' ')} fill="none" stroke="#eef0ff" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={dd.map((p) => p.join(',')).join(' ')} fill="none" stroke="#8a8796" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ))}
  </g>
);

// ===== 5. Ça vient du toit. Quelque chose est couché sur le toit. Juste au-dessus de ta tête. =====
const Toit = scene('toit', ({fg, i, t, d}) => {
  const k = lisse(t, d);
  const o = {compteur: compteur(fg), neons: neonsA(fg), moi: MOI({pupilX: 8})};
  if (i === 0) {
    // en 3D, contre-plongée au ras du sol : toi… et, juste au-dessus de ta tête, elle
    const c = vise([MOI3.x + 520 - 120 * k, 330, MOI3.z - 0.75 + 0.2 * k], [MOI3.x - 60, -420 - 60 * k, MOI3.z]);
    return <Vue3D fg={fg} cam={c} noir={0.2} zoom={1.02 + 0.06 * k} roll={roulis(fg, 0.6)} items={(cam) => [moi3(cam, {id: 't0', pupilX: 8}), toit3(cam, fg, {ouvre: 0.3})]} />;
  }
  if (i === 1) {
    // gros plan : sa tête, penchée vers toi
    const c = cam2(fg, TOIT.x - 20, TOIT.y + 90, 3.0 + 0.3 * k, 0.5);
    return <Ecran fg={fg} roll={c.roll}><Quai cam={c} f={fg} o={{...o, creature: CREAT(fg, {tete: 25 + 25 * ease(t, 6, 36), ouvre: 0.4 * ease(t, 10, 40)})}} /></Ecran>;
  }
  // tu fixes la pompe sans lever les yeux… les doigts descendent dans l'image
  const c = cam2(fg, ECRAN_P.x - 60, ECRAN_P.y + 40, 3.6, 0.6);
  return (
    <Ecran fg={fg} roll={c.roll} dessus={<Doigts x={330} y={lerp(-330, 140, ease(t, 4, d))} />}>
      <Quai cam={c} f={fg} o={{...o, creature: CREAT(fg)}} />
    </Ecran>
  );
});

// ===== 6. Trois secondes : la voiture, ou la boutique ? (chrono en millisecondes) =====
const PORTIERE = {x: -80, y: -40, zoom: 1.6};
const BOUTIQUE_P = {x: 980, y: -120, zoom: 1.8};
const Choix = scene('choix', ({f, fg, i, t, R}) => {
  const t0 = R('boutique', 90) + 12;
  const reste = 3 - Math.max(0, f - t0) / 30;
  let c0;
  let vit = 0;
  if (i === 0) {
    const w = ease(t, 0, 8, Easing.out(Easing.cubic));
    c0 = camMix({x: ECRAN_P.x, y: ECRAN_P.y, zoom: 2.6}, PORTIERE, w);
    vit = t < 8 ? 1 - w : 0;
  } else if (i === 1) {
    const w = ease(t, 0, 8, Easing.out(Easing.cubic));
    c0 = camMix(PORTIERE, BOUTIQUE_P, w);
    vit = t < 8 ? 1 - w : 0;
  } else {
    c0 = camMix(PORTIERE, BOUTIQUE_P, 0.5 + 0.5 * Math.sin(t * (0.12 + t * 0.0014)));
  }
  const c = cam2(fg, c0.x, c0.y, c0.zoom, 1.2 + (i === 2 ? 1 - reste / 3 : 0));
  return (
    <Ecran fg={fg} roll={c.roll} flou={30 * vit}
      dessus={
        <g>
          <Deux f={f} a={R('voiture', 54) - 4} b={R('boutique', 90) - 6} />
          {f >= t0 - 4 && <Chrono reste={reste} />}
          <rect width="1080" height="1920" fill="#ff1a1a" opacity={f >= t0 ? 0.05 + 0.06 * Math.max(0, Math.sin(f / 2.5)) * (1 - reste / 3) : 0} />
        </g>
      }>
      <Quai cam={c} f={fg} o={{compteur: 41.8, neons: neonsA(fg), moi: MOI({eyes: 1.4, worry: 1, sweat: 1}), creature: CREAT(fg)}} />
    </Ecran>
  );
});

// ----- dans la voiture : par le pare-brise, la forêt noire ; tableau de bord, volant -----
const ParBrise = () => (
  <g>
    <defs>
      <linearGradient id="pb-c" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#04060c" />
        <stop offset="1" stopColor="#1a2234" />
      </linearGradient>
      <linearGradient id="pb-b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#6a7a98" stopOpacity="0" />
        <stop offset="1" stopColor="#6a7a98" stopOpacity="0.5" />
      </linearGradient>
    </defs>
    <rect width="1080" height="1920" fill="url(#pb-c)" />
    {[...Array(14)].map((_, k) => {
      const x = k * 90 - 40 + 20 * Math.sin(k * 3);
      const h = 600 + 200 * random(`pbh${k}`);
      return <path key={k} d={`M${x},${1150 - h} L${x - 110},1150 L${x + 110},1150 Z`} fill="#070a12" />;
    })}
    <rect y="900" width="1080" height="300" fill="url(#pb-b)" />
    <rect y="1150" width="1080" height="800" fill="#0c0e14" />
    <path d="M0,1150 Q540,1080 1080,1150 L1080,1260 L0,1260 Z" fill="#8a9ab8" opacity="0.4" />
  </g>
);
const Habitacle = ({fg, clef = 0, tousse = 0, fissures = []}) => (
  <g>
    <path d="M0,0 L1080,0 L1080,330 Q540,250 0,330 Z" fill="#0b0c10" />
    <path d="M0,330 L150,330 L-40,1300 L-200,1300 Z" fill="#0b0c10" />
    <path d="M1080,330 L930,330 L1120,1300 L1280,1300 Z" fill="#0b0c10" />
    <path d="M-50,1250 Q540,1150 1130,1250 L1130,1920 L-50,1920 Z" fill="#101116" />
    <path d="M-50,1250 Q540,1150 1130,1250" stroke="#2a2c34" strokeWidth="6" fill="none" />
    {[380, 700].map((x, k) => (
      <g key={k}>
        <circle cx={x} cy="1380" r="90" fill="#06070a" stroke="#2a2c34" strokeWidth="6" />
        <circle cx={x} cy="1380" r="80" fill={clef > 0.5 ? (tousse > 0.5 && Math.floor(fg / 2) % 2 ? '#1a0a04' : '#ff8a2a') : '#06070a'} opacity={0.3} />
        <line x1={x} y1="1380" x2={x + 60 * Math.cos(-2.4 + clef * (0.8 + 0.6 * tousse * Math.sin(fg)))} y2={1380 + 60 * Math.sin(-2.4 + clef * (0.8 + 0.6 * tousse * Math.sin(fg)))} stroke="#ff6a2a" strokeWidth="6" />
      </g>
    ))}
    <g transform={`translate(560 1650) rotate(${tremble(fg, 6 * tousse, 'vol')})`}>
      <ellipse rx="420" ry="230" fill="none" stroke="#08090c" strokeWidth="70" />
      <rect x="-60" y="-40" width="120" height="260" fill="#08090c" />
    </g>
    {fissures.map(([x, y, s], k) => (
      <g key={k} stroke="#e8eef8" strokeWidth="3" opacity="0.85" fill="none">
        {[...Array(9)].map((_, j) => {
          const a = (j / 9) * Math.PI * 2 + k;
          const l = (60 + 120 * random(`fi${k}${j}`)) * s;
          return <path key={j} d={`M${x},${y} l${Math.cos(a) * l * 0.5},${Math.sin(a) * l * 0.5} l${Math.cos(a + 0.3) * l * 0.5},${Math.sin(a + 0.3) * l * 0.5}`} />;
        })}
        <circle cx={x} cy={y} r={14 * s} />
      </g>
    ))}
  </g>
);
const Bras = ({descend, tap = 0}) => {
  const y = lerp(-500, 520, descend);
  return (
    <g>
      <path d={`M${640},${-100} Q${700},${(y - 100) / 2} ${600},${y}`} stroke="#eef0ff" strokeWidth="58" fill="none" strokeLinecap="round" />
      <path d={`M${640},${-100} Q${700},${(y - 100) / 2} ${600},${y}`} stroke="#8a8796" strokeWidth="46" fill="none" strokeLinecap="round" />
      <g transform={`translate(600 ${y}) scale(2.3)`}>
        {doigts([0, 0], [-0.1, 1], {long: 1.25, plie: 0.18 - 0.25 * tap, cote: -1}).map((dd, j) => (
          <g key={j}>
            <polyline points={dd.map((p) => p.join(',')).join(' ')} fill="none" stroke="#eef0ff" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={dd.map((p) => p.join(',')).join(' ')} fill="none" stroke="#8a8796" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ))}
      </g>
    </g>
  );
};

// ===== 7. La voiture : la portière, la clé, le moteur tousse… le bras, un, deux, trois, la vitre explose =====
const Voiture = scene('voiture', ({f, fg, i, t, d, R}) => {
  if (i === 0) {
    // tu fonces vers la portière (zoom rapide), noir quand elle claque
    const u = ease(t, 0, d - 8, Easing.in(Easing.cubic));
    const c0 = camMix(PORTIERE, {x: -250, y: 120, zoom: 6.5}, u);
    const c = cam2(fg, c0.x, c0.y, c0.zoom, 1.5);
    return (
      <Ecran fg={fg} roll={c.roll} flou={12 * u} noir={ease(t, d - 10, d)} dessus={<Deux f={f + 300} a={0} b={0} choisi={1} />}>
        <Quai cam={c} f={fg} o={{compteur: 41.8, neons: neonsA(fg), creature: CREAT(fg)}} />
      </Ecran>
    );
  }
  const claque = interpolate(f - R('claques', 43), [0, 2, 8], [0, 1, 0], clamp);
  const clef = ease(f, R('tournes', 80) - 4, R('clé', 92));
  const tousse = f > R('moteur', 106) - 4 && f < R('et', 140) ? 1 : 0;
  const descend = ease(f, R('long', 151) - 10, R('pare-brise', 193) + 8, Easing.out(Easing.cubic));
  const taps = [R('tapotent', 230) + 37, R('deux', 287) - 2, R('trois', 308) - 2];
  const tap = taps.reduce((s, tt) => s + (f >= tt && f < tt + 6 ? 1 - (f - tt) / 6 : 0), 0);
  const fiss = taps.filter((tt) => f >= tt).map((tt, j) => [560 + j * 40, 760 + j * 30, 0.6 + 0.4 * j + 0.3 * Math.min(1, (f - tt) / 8)]);
  const explose = R('explose', 350) - 4;
  if (f >= explose) {
    const u = f - explose;
    if (u > 26) return <AbsoluteFill style={{background: '#000'}} />;
    return <Screamer f={u} fg={fg} />;
  }
  const sh = tremble(fg, 14 * tousse + 10 * tap + 20 * claque, 'vt');
  return (
    <Ecran fg={fg} roll={sh * 0.1} noir={0.5 * claque}>
      <g transform={`translate(${sh} 0)`}>
        <ParBrise />
        {descend > 0 && <Bras descend={descend} tap={tap} />}
        <Habitacle fg={fg} clef={clef} tousse={tousse} fissures={fiss} />
      </g>
    </Ecran>
  );
});

// ===== 8. Si tu as choisi la voiture… tu ne survis pas. =====
const Mort = scene('mort', ({f, fg, R}) => {
  const pulse = interpolate(f - R('survis', 60), [0, 3, 18], [0, 0.55, 0.2], clamp);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{filter: `grayscale(1) contrast(1.3) brightness(${0.55 + 0.05 * Math.sin(f)})`}}>
        <Screamer f={30} fg={fg} fige />
      </AbsoluteFill>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{position: 'absolute'}}>
        <defs>
          <filter id="mo-n">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" seed={fg} />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <pattern id="mo-l" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="2" fill="#000" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="1080" height="1920" fill="#c0101a" opacity={0.18 + pulse} style={{mixBlendMode: 'multiply'}} />
        <rect width="1080" height="1920" fill="#ff1a2a" opacity={pulse * 0.5} />
        <rect width="1080" height="1920" fill="url(#mo-l)" />
        <g opacity={Math.floor(f / 15) % 2 ? 1 : 0.6}>
          <rect x="70" y="100" width="22" height="70" fill="#fff" />
          <rect x="110" y="100" width="22" height="70" fill="#fff" />
          <text x="160" y="160" fontFamily="'DejaVu Sans Mono', monospace" fontWeight="700" fontSize="66" fill="#fff">PAUSE</text>
        </g>
        {f > DUREE.mort - 12 && <rect width="1080" height="1920" filter="url(#mo-n)" opacity="0.9" />}
      </svg>
    </AbsoluteFill>
  );
});

// ===== 9. On rembobine (rapide) =====
const Rembobine = scene('rembobine', ({f, fg}) => {
  const D = DUREE.rembobine;
  const a = START.voiture + DUREE.voiture - 40;
  const b = START.choix + DUREE.choix - 40;
  const fin = D - 12;
  if (f < fin) {
    const u = Easing.inOut(Easing.cubic)(Math.min(1, f / fin));
    const src = Math.round(lerp(a, b, u));
    return <VHS f={fg} force={1} compteur={fmt(src / 30)}>{imageA(src)}</VHS>;
  }
  return <VHS f={fg} force={interpolate(f, [fin, D], [0.8, 0.15], clamp)} texte="▶ PLAY" compteur={fmt(b / 30)}>{imageA(b)}</VHS>;
});

// ===== 10. Cette fois, la boutique ! La caissière t'ouvre et verrouille derrière toi. =====
// vue de la boutique : elle s'est tassée sur le toit (moins haute, pour rester dans la vitrine)
const TASSEE = melange(COUCHE, PENCHE, 0.4);
const DEHORS = (fg, extra = {}) => ({compteur: 41.8, neons: neonsA(fg), creature: CREAT(fg, {pose: TASSEE, x: -230}), ...extra});
const Boutique = scene('boutique', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  if (i === 0) {
    // en 3D, vue subjective : tu cours vers la boutique
    const u = ease(t, 0, d, Easing.in(Easing.quad));
    const c = pov(fg, mix3([520, OEIL, MOI3.z + 0.2], [870, OEIL, BOUT.z0 - 0.45], u), [870, -170, BOUT.z0 + 0.3], {k: 1.5, pas: 1.4, v: 0.42});
    return <Vue3D fg={fg} cam={c} roll={roulis(fg, 1.5, 1.4, 0.42)} zoom={1.05} noir={0.2} o={{compteur: 41.8, caissiere: caissiere3(makeCam(c), {epauleD: -150, coudeD: -40 + 30 * Math.sin(fg * 0.5), eyes: 1.4, worry: 1})}} items={(cam) => [toit3(cam, fg)]} dessus={<Deux f={f + 300} a={0} b={0} choisi={2} />} />;
  }
  // dedans : elle verrouille ; dehors, la voiture… et ce qu'il y a sur le toit
  const verrou = ease(f, R('verrouille', 98), R('derrière', 109));
  const c = cam2(fg, -150 + 100 * k, -100, 1.0 + 0.1 * k, 0.9);
  return (
    <Ecran fg={fg} roll={c.roll}>
      <Interieur cam={c} f={fg} o={{dehors: DEHORS(fg), caissiere: {x: -560, y: 760, s: 1.05, pose: {epauleD: -60 - 30 * verrou, coudeD: -90, eyes: 1.4, worry: 1}}}} />
    </Ecran>
  );
});

// ===== 11. Par la vitre, tu la vois descendre du toit. À quatre pattes. =====
const Descend = scene('descend', ({f, fg, t, d, R}) => {
  const k = lisse(t, d);
  const u = ease(f, R('vois', 36), R('pattes', 89) + 6);
  const creature = {pose: galop(melange(TASSEE, QUATRE, ease(u, 0, 0.4)), fg * 0.2, Math.sin(u * Math.PI) * 0.8), x: lerp(-230, 380, u), y: lerp(40, 380, ease(u, 0.15, 0.7)), s: 0.5, tete: -20};
  const c = cam2(fg, -120, -80, 1.25 + 0.3 * k, 0.6);
  return (
    <Ecran fg={fg} roll={c.roll}>
      <Interieur cam={c} f={fg} o={{dehors: DEHORS(fg, {creature})}} />
    </Ecran>
  );
});

// ----- caméras de surveillance (noir et blanc) -----
const CCTV = ({f, fg, n, children}) => (
  <AbsoluteFill style={{background: '#000'}}>
    <AbsoluteFill style={{filter: 'grayscale(1) contrast(1.35) brightness(1.1)'}}>{children}</AbsoluteFill>
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{position: 'absolute'}}>
      <defs>
        <pattern id="cc-l" width="4" height="5" patternUnits="userSpaceOnUse">
          <rect width="4" height="2" fill="#000" opacity="0.35" />
        </pattern>
        <filter id="cc-n">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed={fg} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
      <rect width="1080" height="1920" fill="url(#cc-l)" />
      <rect width="1080" height="1920" filter="url(#cc-n)" opacity="0.18" />
      <text x="60" y="140" fontFamily="'DejaVu Sans Mono', monospace" fontWeight="700" fontSize="58" fill="#fff">CAM {n}</text>
      <circle cx="960" cy="120" r="18" fill="#ff2a2a" opacity={Math.floor(f / 15) % 2 ? 1 : 0.3} />
      <text x="1020" y="1860" textAnchor="end" fontFamily="'DejaVu Sans Mono', monospace" fontSize="44" fill="#fff">03:14:{String(Math.floor(fg / 30) % 60).padStart(2, '0')}</text>
    </svg>
  </AbsoluteFill>
);

// ===== 12. Sur les écrans de surveillance, elle fait le tour de la boutique. Lentement. =====
const Ecrans = scene('ecrans', ({f, fg, i, t, d}) => {
  const k = lisse(t, d);
  const pose = galop(QUATRE, fg * 0.18, 0.5);
  if (i === 0) {
    return (
      <CCTV f={f} fg={fg} n="01">
        <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
          <Facade cam={{x: lerp(-140, 80, k), y: 120, zoom: 0.7}} f={fg} o={{creature: {x: lerp(-1300, 700, k), y: 455, s: 0.7, pose}}} />
        </svg>
      </CCTV>
    );
  }
  const creature = {pose, x: i === 1 ? lerp(-900, 900, k) : lerp(1100, -600, k), y: 380, s: 0.5, tete: -10};
  return (
    <CCTV f={f} fg={fg} n={`0${i + 1}`}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <Quai cam={{x: i === 1 ? 0 : 300, y: -250, zoom: 0.72}} f={fg} o={{compteur: 41.8, neons: neonsA(fg), creature}} />
      </svg>
    </CCTV>
  );
});

// ===== 13. La caissière chuchote : « Tant que la lumière est allumée, elle ne peut pas entrer. » =====
const VISAGE = {x: 950, y: 560 - (922 - 192) * 0.85};
const Regle = scene('regle', ({fg, i, t, d}) => {
  const k = lisse(t, d);
  if (i === 0) {
    const c = cam2(fg, VISAGE.x - 60, VISAGE.y + 60, 2.8 + 0.2 * k, 0.5);
    return <Ecran fg={fg} roll={c.roll}><Interieur cam={c} f={fg} o={{dehors: DEHORS(fg, {creature: null}), caissiere: {pose: {eyes: 1.3, worry: 1, pupilX: -8, epauleD: -150, coudeD: -20}}}} /></Ecran>;
  }
  // tu lèves les yeux vers les néons du plafond
  const c = cam2(fg, 0, 0, 1.0 + 0.1 * k, 0.5);
  return <Ecran fg={fg} roll={c.roll}><Plafond cam={c} f={fg} /></Ecran>;
});

// ===== 14. Les néons grésillent. Un par un, ils s'éteignent. Il n'en reste qu'un. =====
const neonsB = (f, R) => {
  const g = f > R('grésiller', 60) - 4;
  const off = [R('un', 81), R('par', 86) + 10, R('séteignent', 110) + 6];
  return [0, 1, 2, 3].map((k) => (k < 3 && f >= off[k] ? 0 : g ? R2(f, `nb${k}`, 0.6) : 1));
};
const Neons = scene('neons', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const nb = neonsB(f, R);
  if (i === 0) {
    const c = cam2(fg, 0, 0, 1.1 + 0.05 * k, 0.8 + 0.8 * (1 - (nb[0] + nb[1] + nb[2] + nb[3]) / 4));
    return <Ecran fg={fg} roll={c.roll}><Plafond cam={c} f={fg} o={{neons: nb}} /></Ecran>;
  }
  // dans le noir qui gagne : elle est debout derrière la vitre, collée au verre
  const c = cam2(fg, -100, -150, 1.2 + 0.15 * k, 0.8);
  const plaque = (
    <g transform="translate(-120 260) scale(0.95)">
      <Rodeur pose={melange(DEBOUT, ECARTE, 0.35)} tete={-20 + 4 * Math.sin(fg / 20)} respire={0.5 + 0.5 * Math.sin(fg / 14)} lum={0.75} id="r2" />
    </g>
  );
  return <Ecran fg={fg} roll={c.roll}><Interieur cam={c} f={fg} o={{neons: nb, dehors: DEHORS(fg, {creature: null, lit: 0}), plaque, caissiere: {pose: {}}}} /></Ecran>;
});

// ===== 15. Tu te tournes vers la caissière. Elle sourit. Beaucoup trop grand. =====
const NB_FIN = [0, 0, 0, 1];
const Sourit = scene('sourire', ({f, fg, i, t, R}) => {
  if (i === 0) {
    const w = ease(t, 0, 14, Easing.out(Easing.cubic));
    const c0 = camMix({x: -100, y: -150, zoom: 1.3}, {x: VISAGE.x - 40, y: VISAGE.y + 120, zoom: 2.0}, w);
    const c = cam2(fg, c0.x, c0.y, c0.zoom, 0.8);
    return <Ecran fg={fg} roll={c.roll} flou={t < 12 ? 24 * (1 - w) : 0}><Interieur cam={c} f={fg} o={{neons: NB_FIN, dehors: DEHORS(fg, {creature: null, lit: 0}), caissiere: {pose: {eyes: 1.1}}}} /></Ecran>;
  }
  const s = ease(f, R('sourit', 59) - 4, R('grand', 98) + 8, Easing.inOut(Easing.cubic));
  const c = cam2(fg, VISAGE.x, VISAGE.y + 30, 3.0 + 0.5 * s, 0.4);
  return <Ecran fg={fg} roll={c.roll}><Interieur cam={c} f={fg} o={{neons: NB_FIN, dehors: DEHORS(fg, {creature: null, lit: 0}), caissiere: {pose: {grin: s, eyes: 1 + 0.35 * s, brows: -4 * s}}}} /></Ecran>;
});

// ===== 16. Le générateur est dans l'arrière-boutique. Tu y vas ? Ou tu restes dans le noir… avec elle ? =====
const Dilemme = scene('dilemme', ({f, fg, t, d, R}) => {
  const k = lisse(t, d);
  const nb = [0, 0, 0, R2(fg, 'dl', 0.3)];
  const dis = R('dis-le', 180);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <defs>
          <clipPath id="di-h"><rect width="1080" height="956" /></clipPath>
          <clipPath id="di-b"><rect y="964" width="1080" height="956" /></clipPath>
        </defs>
        <g clipPath="url(#di-h)">
          <g transform="translate(0 -480)"><Arriere cam={cam2(fg, 640, -150, 1.25 + 0.1 * k, 0.6)} f={fg} o={{neons: nb}} /></g>
        </g>
        <g clipPath="url(#di-b)">
          <g transform="translate(0 480)"><Interieur cam={cam2(fg, VISAGE.x, VISAGE.y + 60, 2.6 + 0.15 * k, 0.4)} f={fg} o={{neons: nb, dehors: DEHORS(fg, {creature: null, lit: 0}), caissiere: {pose: {grin: 1, eyes: 1.35, brows: -4}}}} /></g>
        </g>
        <Finition f={fg} grain={0.03} vignette={0.8} />
        <rect x="0" y="956" width="1080" height="8" fill="#000" />
        <ChoixBoite f={f} debut={R('rallumer', 75) - 6} x={540} y={850} texte="LE GÉNÉRATEUR" emoji="1f526" couleur="#ffd23a" />
        <ChoixBoite f={f} debut={R('restes', 121) - 6} x={540} y={1075} texte="JE RESTE AVEC ELLE" emoji="1fae3" couleur="#ff3a4a" />
        {f >= dis && (
          <g transform={`translate(540 1730) scale(${spring({frame: f - dis, fps: 30, config: {damping: 10}})})`}>
            <rect x="-400" y="-70" width="800" height="140" rx="70" fill="#fff" />
            <image href={staticFile('emoji/1f4ac.svg')} x="-370" y="-48" width="96" height="96" />
            <text x="40" y="18" textAnchor="middle" fontFamily="'DejaVu Sans', Arial, sans-serif" fontWeight="900" fontSize="46" fill="#111">
              DIS-LE EN COMMENTAIRE
            </text>
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
});

const COMPOSANTS = {pompe: Pompe, vitre: Vitre, feuille: Feuille, goutte: Goutte, toit: Toit, choix: Choix, voiture: Voiture, mort: Mort, rembobine: Rembobine, boutique: Boutique, descend: Descend, ecrans: Ecrans, regle: Regle, neons: Neons, sourire: Sourit, dilemme: Dilemme};
export const LaStation = () => (
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
