import {AbsoluteFill, Easing, interpolate, random, Series, spring, staticFile, useCurrentFrame} from 'remotion';
import {SOL} from './ForetNuit';
import {montage, Plan} from './montage';
import {clamp, makeCam, marche, Perso} from './moteur';
import {Chrono, ChoixBoite, MainPov, Screamer, VHS, fmt} from './NeLuiOuvrePas';
import {doigts, galop, melange, QUATRE, DEBOUT, RodeurMonde, TeteRodeur} from './Rodeur';
import {boutiqueInt, BOUT, gresille, POMPE, station, VOIT} from './Station';
import PLANS from './station/plans.json';
import timeline from './station/timeline.json';

// « La station-service » : 3 h du matin, tu fais le plein au milieu de la forêt. La caissière colle une feuille contre
// la vitre : « NE LÈVE PAS LES YEUX ». Quelque chose goutte sur ton épaule : une créature couchée sur le toit de ta
// voiture. Dilemme au milieu : la voiture (tu meurs, rembobinage VHS) ou la boutique. Dedans, les néons s'éteignent un à un,
// et la caissière sourit… beaucoup trop grand. Dilemme final : le générateur, ou rester avec elle ?
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
const deg = (r) => (r * 180) / Math.PI;
const vise = (p, c, extra = {}) => {
  const dx = c[0] - p[0];
  const dy = c[1] - p[1];
  const dz = (c[2] - p[2]) * 1000;
  return {x: p[0], y: p[1], z: p[2], yaw: deg(Math.atan2(dx, dz)), pitch: deg(Math.atan2(dy, Math.hypot(dx, dz))), ...extra};
};
const main = (f, k = 1) => ({dx: k * (5 * Math.sin(f / 23) + 3 * Math.sin(f / 9.7)), dy: k * 3 * Math.sin(f / 17 + 1), r: k * 0.35 * Math.sin(f / 31)});
const OEIL = -150;
const pov = (fg, p, c, {k = 1, pas = 0, v = 0.21} = {}) => {
  const m = main(fg, k);
  return vise([p[0] + m.dx + Math.sin(fg * v) * 9 * pas, p[1] + m.dy - Math.abs(Math.sin(fg * v)) * 16 * pas, p[2]], c);
};
const roulis = (fg, k = 1, pas = 0, v = 0.21) => main(fg, k).r + Math.sin(fg * v) * 0.9 * pas;
const mixC = (a, b, u) => a.map((x, i) => x + (b[i] - x) * u);
const PLAN = {grain: 0.03, vignette: 0.8};

// ----- les néons : l'auvent grésille parfois ; dans la boutique, ils s'éteignent un à un -----
const NEON_T = [0.84, 0.92, 1.05];
const auvent = (fg) => [gresille(fg, 'a0', 0.15), 1, fg % 97 < 6 ? gresille(fg, 'a2', 1) : 1, 1];

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
const RENDUS = {};
const imageA = (fg) => {
  const nom = SCENES.find(([n, d]) => fg >= START[n] && fg < START[n] + d)?.[0] || SCENES[0][0];
  const f = fg - START[nom];
  const {i, t, d, bornes} = decoupe(nom, f);
  return RENDUS[nom]({f, fg, i, t, d, bornes, R: (mot, def) => repere(nom, mot, def)});
};

// ----- les personnages -----
const MOI = {x: 60, z: 1.1};
const CAISSE = {x: 950, z: 5.95};
const moi = (cam, {x = MOI.x, z = MOI.z, id, lum = 0.85, ...pose}) => ({z, x, el: <Perso cam={cam} id={id} x={x} z={z} lum={lum} teinte={NEON_T} ombre={0.35} {...pose} />});
const caissiere = (cam, {x = CAISSE.x, z = CAISSE.z, id = 'ca', lum = 0.95, ...pose}) => ({z, x, el: <Perso cam={cam} id={id} x={x} z={z} lum={lum} teinte={[0.95, 0.97, 1.0]} ombre={0.25} coiffure="queue" cils couleurs={{haut: '#2a6a8a', hautO: '#1f5470', chev: '#3a2418'}} {...pose} />});
const surToit = (cam, {f, fg, pose = QUATRE, tete = 0, x = -430, z = 1.4}) => ({z, x, y: VOIT.toit, el: <RodeurMonde cam={cam} x={x} z={z} y={VOIT.toit} pose={pose} echelle={0.55} tete={tete} respire={0.5 + 0.5 * Math.sin(fg / 14)} lum={0.9} id={`rt${fg}`} />});

// dehors
const VueExt = ({fg, cam: c, o = {}, items = [], zoom = 1, roll = 0, noir = 0, flou = null, dessus = null}) => {
  const cam = makeCam(c);
  const its = typeof items === 'function' ? items(cam) : items;
  const d = station(cam, fg, {auvent: auvent(fg), compteur: Math.min(41.8, 18.2 + fg * 0.035), ...o, extra: its.filter(Boolean)});
  return <Plan {...PLAN} f={fg} cam={cam} decor={d} items={[]} zoom={zoom} roll={roll} noir={noir} flou={flou} dessus={dessus} />;
};
// dedans (la boutique, on voit dehors par la vitrine)
const VueInt = ({fg, cam: c, o = {}, items = [], dehors = [], zoom = 1, roll = 0, noir = 0, flou = null, dessus = null}) => {
  const cam = makeCam(c);
  const its = typeof items === 'function' ? items(cam) : items;
  const deh = typeof dehors === 'function' ? dehors(cam) : dehors;
  const d = boutiqueInt(cam, fg, {auvent: auvent(fg), ...o, extra: deh.filter(Boolean)});
  const tri = (l) => [...l].sort((a, b) => cam.profondeur(b.z, b.x ?? cam.x, b.y ?? cam.y) - cam.profondeur(a.z, a.x ?? cam.x, a.y ?? cam.y));
  const fond = (
    <g>
      {d.fond}
      {tri(d.dehors).map((it, k) => <g key={k}>{it.el}</g>)}
      {d.surf}
      {d.facade}
    </g>
  );
  return <Plan {...PLAN} f={fg} cam={cam} decor={{fond, brume: null, items: [...d.items, ...its.filter(Boolean)]}} items={[]} zoom={zoom} roll={roll} noir={noir} flou={flou} dessus={dessus} />;
};

const Deux = ({f, a, b, choisi = 0}) => (
  <g>
    <ChoixBoite f={f} debut={a} x={540} y={300} texte="LA VOITURE" emoji="1f697" couleur="#ffb03a" etat={choisi === 1 ? 1 : choisi === 2 ? -1 : 0} />
    <ChoixBoite f={f} debut={b} x={540} y={500} texte="LA BOUTIQUE" emoji="1f3ea" couleur="#5ab0ff" etat={choisi === 2 ? 1 : choisi === 1 ? -1 : 0} />
  </g>
);

// ===== 1. 3 h du matin, tu fais le plein au milieu de la forêt (1re image : toi) =====
const Pompe = scene('pompe', ({f, fg, i, t, d}) => {
  const k = lisse(t, d);
  const compteur = 18.2 + fg * 0.11;
  const pose = {epauleD: -20, coudeD: 120, pupilX: 6};
  if (i === 0) {
    // plan rapproché sur toi à la pompe, le néon claque au-dessus
    const c = vise([380 - 60 * k, -230, 0.25 + 0.2 * k], [MOI.x, -200, MOI.z]);
    return <VueExt fg={fg} cam={c} o={{compteur}} zoom={1.05} items={(cam) => [moi(cam, {id: 'p0', ...pose})]} />;
  }
  if (i === 1) {
    // le compteur qui défile
    const c = vise([POMPE.x + 40, -265, POMPE.z - 0.42 + 0.08 * k], [POMPE.x, -265, POMPE.z]);
    return <VueExt fg={fg} cam={c} o={{compteur}} />;
  }
  if (i === 2) {
    // la station, seule au milieu de la forêt ; le brouillard
    const c = vise([-2600 + 600 * k, -700, -5.5 + 1.5 * k], [0, -300, 2.5]);
    return <VueExt fg={fg} cam={c} o={{compteur}} items={(cam) => [moi(cam, {id: 'p2', ...pose})]} />;
  }
  // tu lèves les yeux vers la boutique : la caissière te fixe
  const c = pov(fg, [MOI.x + 20, OEIL, MOI.z], [400, -250, BOUT.z0], {k: 0.7});
  return <VueExt fg={fg} cam={c} roll={roulis(fg, 0.7)} zoom={1.1 + 0.15 * k} o={{compteur, caissiere: caissiere(makeCam(c), {x: 380, z: 4.75, id: 'p3'})}} />;
});

// ===== 2. La caissière tape contre la vitre. Fort. =====
const Vitre = scene('vitre', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const tape = Math.max(0, Math.sin(f * 0.9)) * (f > R('tape', 43) - 4 ? 1 : 0);
  if (i === 0) {
    const c = pov(fg, [MOI.x + 30, OEIL, MOI.z + 0.6 * k], [380, -250, BOUT.z0], {k: 0.9, pas: 0.5});
    const cam = makeCam(c);
    return <VueExt fg={fg} cam={c} roll={roulis(fg, 0.9, 0.5)} zoom={1.25 + 0.2 * k} o={{caissiere: caissiere(cam, {x: 380, z: 4.75, id: 'v0', epauleD: -150 - 30 * tape, coudeD: -40, epauleG: 150 + 30 * tape, coudeG: 40, eyes: 1.4, worry: 1})}} />;
  }
  // gros plan sur elle, derrière la vitre
  const c = vise([380 + tremble(fg, 10 * tape, 'vt'), -320, BOUT.z0 - 0.75 + 0.1 * k], [380, -330, BOUT.z0 + 0.25]);
  const cam = makeCam(c);
  return <VueExt fg={fg} cam={c} o={{caissiere: caissiere(cam, {x: 380, z: 4.75, id: 'v1', epauleD: -150 - 30 * tape, coudeD: -40, eyes: 1.5, worry: 1, scream: 0.4})}} />;
});

// ===== 3. Elle colle une feuille contre le verre : « Ne lève pas les yeux. » =====
const Feuille = scene('feuille', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const feuille = ease(f, R('colle', 10), R('feuille', 28) + 6);
  if (i === 0) {
    const c = pov(fg, [MOI.x + 40, OEIL, MOI.z + 0.6 + 0.4 * k], [300, -230, BOUT.z0], {k: 0.6});
    const cam = makeCam(c);
    return <VueExt fg={fg} cam={c} roll={roulis(fg, 0.6)} zoom={1.3 + 0.2 * k} o={{feuille, caissiere: caissiere(cam, {x: 330, z: 4.75, id: 'f0', epauleD: -110, coudeD: -60, epauleG: 110, coudeG: 60, eyes: 1.4, worry: 1})}} />;
  }
  // gros plan sur la feuille, ses yeux juste au-dessus
  const c = vise([300 + 20 * Math.sin(fg / 30), -230, BOUT.z0 - 0.62 + 0.12 * k], [300, -240, BOUT.z0]);
  const cam = makeCam(c);
  return <VueExt fg={fg} cam={c} o={{feuille: 1, caissiere: caissiere(cam, {x: 300, z: 4.75, y: SOL + 150, id: 'f1', eyes: 1.5, worry: 1})}} />;
});

// gouttes noires qui tombent sur l'épaule (en 2D, par-dessus l'image)
const Gouttes = ({f, t0, x, y, n = 4}) => (
  <g>
    {[...Array(n)].map((_, k) => {
      const tk = t0 + k * 14;
      const u = (f - tk) / 9;
      if (u < 0) return null;
      const yy = u < 1 ? lerp(-60, y, u * u) : y;
      return (
        <g key={k}>
          {u < 1 && <ellipse cx={x + k * 12} cy={yy} rx="9" ry="16" fill="#050307" />}
          {u >= 1 && <ellipse cx={x + k * 12 - 6} cy={y + 4} rx={18 + 10 * Math.min(1, (u - 1) * 2)} ry={8 + 3 * Math.min(1, (u - 1) * 2)} fill="#050307" opacity="0.9" />}
        </g>
      );
    })}
  </g>
);

// ===== 4. Tu ne comprends pas. Quelque chose goutte sur ton épaule. Noir. Épais. =====
const Goutte = scene('goutte', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  if (i === 0) {
    const c = vise([MOI.x + 200, -220, MOI.z - 0.65 + 0.1 * k], [MOI.x, -200, MOI.z]);
    return <VueExt fg={fg} cam={c} items={(cam) => [moi(cam, {id: 'g0', epauleD: -20, coudeD: 120, brows: 6, pupilX: 10, worry: 0.3})]} />;
  }
  // gros plan : l'épaule, les gouttes noires
  const c = vise([MOI.x + 120, -280, MOI.z - 0.38], [MOI.x - 60, -250, MOI.z]);
  const cam = makeCam(c);
  const [sx, sy] = cam.proj(MOI.x - 70, -230, MOI.z);
  return (
    <VueExt fg={fg} cam={c} zoom={1.05 + 0.05 * k} items={(cam2) => [moi(cam2, {id: 'g1', epauleD: -20, coudeD: 120, eyes: 1.2 + 0.3 * ease(f, R('noir', 113), R('noir', 113) + 6), worry: 0.6, pupilX: -12})]}
      dessus={<Gouttes f={f} t0={R('goutte', 72) - 26} x={sx} y={sy} />} />
  );
});

// ===== 5. Ça vient du toit de ta voiture. Quelque chose est couché sur le toit. Juste au-dessus de ta tête. =====
const Toit = scene('toit', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  if (i === 0) {
    // contre-plongée : la voiture, et sur le toit… elle ; toi à côté, tu ne la vois pas
    const c = vise([900 - 100 * k, 300, -0.6 + 0.2 * k], [-300, -250, 1.4]);
    return <VueExt fg={fg} cam={c} items={(cam) => [surToit(cam, {f, fg, tete: 20}), moi(cam, {id: 't0', epauleD: -20, coudeD: 120, pupilX: 8})]} />;
  }
  if (i === 1) {
    // juste sous l'auvent, en plongée : elle, couchée, la tête penchée vers toi
    const c = vise([-200 + 80 * k, -950, 0.5 + 0.15 * k], [-150, 200, 1.3]);
    return <VueExt fg={fg} cam={c} items={(cam) => [surToit(cam, {f, fg, tete: -35 * ease(t, 10, 40)}), moi(cam, {id: 't1', epauleD: -20, coudeD: 120})]} />;
  }
  // tu ne lèves pas les yeux : tu fixes la pompe… de longs doigts gris entrent dans le haut de l'image
  const c = pov(fg, [MOI.x - 60, OEIL, MOI.z - 0.35], [POMPE.x, -150, POMPE.z], {k: 0.5});
  const u = ease(t, 6, d);
  return (
    <VueExt fg={fg} cam={c} o={{compteur: 18.2 + fg * 0.11}} roll={roulis(fg, 0.5)}
      dessus={
        <g transform={`translate(${380} ${lerp(-260, 120, u)}) scale(2.2)`}>
          {doigts([0, 0], [0.15, 1], {long: 1.3, plie: 0.25, cote: 1}).map((dd, j) => (
            <g key={j}>
              <polyline points={dd.map((p) => p.join(',')).join(' ')} fill="none" stroke="#eef0ff" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points={dd.map((p) => p.join(',')).join(' ')} fill="none" stroke="#8a8796" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          ))}
        </g>
      } />
  );
});

// ===== 6. Trois secondes : la voiture, ou la boutique ? (chrono en millisecondes) =====
const PORTIERE = [-110, -50, 1.25];
const ENTREE = [870, -150, BOUT.z0];
const Choix = scene('choix', ({f, fg, i, t, d, R}) => {
  const t0 = R('boutique', 90) + 12;
  const reste = 3 - Math.max(0, f - t0) / 30;
  let cible;
  let vit = 0;
  if (i === 0) {
    const w = ease(t, 0, 8, Easing.out(Easing.cubic));
    cible = mixC([POMPE.x, -150, POMPE.z], PORTIERE, w);
    vit = t < 8 ? 1 - w : 0;
  } else if (i === 1) {
    const w = ease(t, 0, 8, Easing.out(Easing.cubic));
    cible = mixC(PORTIERE, ENTREE, w);
    vit = t < 8 ? 1 - w : 0;
  } else {
    const u = 0.5 + 0.5 * Math.sin(t * (0.12 + t * 0.0014));
    cible = mixC(PORTIERE, ENTREE, u);
  }
  const c = pov(fg, [MOI.x - 60, OEIL, MOI.z - 0.35], cible, {k: 1.2 + (i === 2 ? 1 - reste / 3 : 0)});
  return (
    <VueExt fg={fg} cam={c} roll={roulis(fg, 1.2)} zoom={1.05} flou={vit > 0.2 ? [30 * vit, 0] : null} o={{compteur: 41.8}}
      items={(cam) => [surToit(cam, {f, fg, tete: -30})]}
      dessus={
        <g>
          <Deux f={f} a={R('voiture', 54) - 4} b={R('boutique', 90) - 6} />
          {f >= t0 - 4 && <Chrono reste={reste} />}
          <rect width="1080" height="1920" fill="#ff1a1a" opacity={f >= t0 ? 0.05 + 0.06 * Math.max(0, Math.sin(f / 2.5)) * (1 - reste / 3) : 0} />
        </g>
      } />
  );
});

// ----- dans la voiture : tableau de bord, volant, montants, vue par le pare-brise -----
const SIEGE = [-430, -30, 1.45];
const Habitacle = ({f, fg, clef = 0, tousse = 0, fissures = [], eclate = 0}) => (
  <g>
    {/* toit intérieur et montants */}
    <path d="M0,0 L1080,0 L1080,330 Q540,250 0,330 Z" fill="#0b0c10" />
    <path d="M0,330 L150,330 L-40,1300 L-200,1300 Z" fill="#0b0c10" />
    <path d="M1080,330 L930,330 L1120,1300 L1280,1300 Z" fill="#0b0c10" />
    {/* tableau de bord */}
    <path d="M-50,1250 Q540,1150 1130,1250 L1130,1920 L-50,1920 Z" fill="#101116" />
    <path d="M-50,1250 Q540,1150 1130,1250" stroke="#2a2c34" strokeWidth="6" fill="none" />
    {/* compteurs qui s'allument et toussent */}
    {[380, 700].map((x, k) => (
      <g key={k}>
        <circle cx={x} cy="1380" r="90" fill="#06070a" stroke="#2a2c34" strokeWidth="6" />
        <circle cx={x} cy="1380" r="80" fill={clef > 0.5 ? (tousse > 0.5 && Math.floor(fg / 2) % 2 ? '#1a0a04' : '#ff8a2a') : '#06070a'} opacity={0.25} />
        <line x1={x} y1="1380" x2={x + 60 * Math.cos(-2.4 + clef * (0.8 + 0.6 * tousse * Math.sin(fg)))} y2={1380 + 60 * Math.sin(-2.4 + clef * (0.8 + 0.6 * tousse * Math.sin(fg)))} stroke="#ff6a2a" strokeWidth="6" />
      </g>
    ))}
    {/* volant */}
    <g transform={`translate(560 1650) rotate(${tremble(fg, 6 * tousse, 'vol')})`}>
      <ellipse rx="420" ry="230" fill="none" stroke="#08090c" strokeWidth="70" />
      <rect x="-60" y="-40" width="120" height="260" fill="#08090c" />
    </g>
    {/* fissures du pare-brise */}
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
    {eclate > 0 && <rect width="1080" height="1920" fill="#fff" opacity={eclate} />}
  </g>
);
// le long bras gris qui descend du toit devant le pare-brise
const Bras = ({descend, tap = 0, fg}) => {
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

// ===== 7. La voiture : tu claques la portière, la clé, le moteur tousse… le bras, un, deux, trois, la vitre explose =====
const Voiture = scene('voiture', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  if (i === 0) {
    // tu plonges dans la voiture (choix confirmé)
    const u = ease(t, 0, d, Easing.inOut(Easing.cubic));
    const pos = mixC([MOI.x - 60, OEIL, MOI.z - 0.35], SIEGE, u);
    const c = pov(fg, pos, mixC(PORTIERE, [-430, -60, -2], u), {k: 1.5});
    const claque = interpolate(f - R('claques', 43), [0, 2, 8], [0, 1, 0], clamp);
    return (
      <AbsoluteFill>
        <VueExt fg={fg} cam={c} o={{sansVoiture: u > 0.6}} roll={roulis(fg, 1.5) + tremble(fg, 4 * claque, 'cl')} zoom={1.05} flou={u > 0.2 && u < 0.8 ? [24, 0] : null}
          dessus={<g>{u > 0.6 && <g opacity={ease(u, 0.6, 0.8)}><Habitacle f={f} fg={fg} /></g>}<rect width="1080" height="1920" fill="#000" opacity={0.4 * claque} /><Deux f={f + 300} a={0} b={0} choisi={1} /></g>} />
      </AbsoluteFill>
    );
  }
  const cam = {...vise(SIEGE, [-430, -40, -2]), x: SIEGE[0] + tremble(fg, 6, 'vs'), y: SIEGE[1] + tremble(fg + 2, 4, 'vs')};
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
  return (
    <VueExt fg={fg} cam={{...cam, x: cam.x + tremble(fg, 14 * tousse + 8 * tap, 'vt')}} o={{sansVoiture: true, compteur: 41.8}} zoom={1.0}
      dessus={<g>{descend > 0 && <Bras descend={descend} tap={tap} fg={fg} />}<Habitacle f={f} fg={fg} clef={clef} tousse={tousse} fissures={fiss} /></g>} />
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
const Boutique = scene('boutique', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  if (i === 0) {
    // tu cours vers la boutique (vue subjective)
    const u = ease(t, 0, d, Easing.in(Easing.quad));
    const c = pov(fg, mixC([MOI.x - 60, OEIL, MOI.z - 0.35], [870, OEIL, BOUT.z0 - 0.35], u), ENTREE, {k: 1.5, pas: 1.4, v: 0.42});
    return <VueExt fg={fg} cam={c} roll={roulis(fg, 1.5, 1.4, 0.42)} zoom={1.05} items={(cam) => [surToit(cam, {f, fg, tete: -30})]} dessus={<Deux f={f + 300} a={0} b={0} choisi={2} />} />;
  }
  // dedans : tu te retournes ; elle verrouille ; dehors, la voiture et ce qu'il y a sur le toit
  const c = pov(fg, [100, OEIL, BOUT.z0 + 1.4], [450, -120, BOUT.z0], {k: 0.9});
  const verrou = ease(f, R('verrouille', 98), R('derrière', 109));
  return (
    <VueInt fg={fg} cam={c} roll={roulis(fg, 0.9)} zoom={1.05}
      items={(cam) => [caissiere(cam, {x: 700, z: BOUT.z0 + 0.4, id: 'b1', epauleD: -60 - 30 * verrou, coudeD: -90, eyes: 1.4, worry: 1})]}
      dehors={(cam) => [surToit(cam, {f, fg, tete: -30})]} />
  );
});

// ===== 11. Par la vitre, tu la vois descendre du toit. À quatre pattes. =====
const Descend = scene('descend', ({f, fg, t, d, R}) => {
  const k = lisse(t, d);
  const u = ease(f, R('vois', 36), R('pattes', 89) + 6);
  const x = lerp(-430, -150, u);
  const z = lerp(1.4, 2.3, u);
  const y = lerp(VOIT.toit, SOL, ease(u, 0.15, 0.75));
  const c = pov(fg, [400, OEIL, BOUT.z0 + 0.55 - 0.2 * k], [-250, 100, 1.8], {k: 0.6});
  return (
    <VueInt fg={fg} cam={c} roll={roulis(fg, 0.6)} zoom={1.2 + 0.25 * k}
      dehors={(cam) => [{z, x, y, el: <RodeurMonde cam={cam} x={x} z={z} y={y} pose={galop(QUATRE, fg * 0.2, 0.5 * u * (1 - u) * 4)} echelle={0.75} tete={-20} lum={0.9} id="rd" />}]} />
  );
});

// ----- caméras de surveillance (noir et blanc) -----
const CCTV = ({f, fg, cam: n, children}) => (
  <AbsoluteFill style={{background: '#000'}}>
    <AbsoluteFill style={{filter: 'grayscale(1) contrast(1.35) brightness(1.15)'}}>{children}</AbsoluteFill>
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
      <text x="1020" y="1860" textAnchor="end" fontFamily="'DejaVu Sans Mono', monospace" fontSize="44" fill="#fff">03:1{2 + Math.floor(fg / 900)}:{String(Math.floor(fg / 30) % 60).padStart(2, '0')}</text>
    </svg>
  </AbsoluteFill>
);

// ===== 12. Sur les écrans de surveillance, elle fait le tour de la boutique. Lentement. =====
const Ecrans = scene('ecrans', ({f, fg, i, t, d}) => {
  const k = lisse(t, d);
  const pose = galop(QUATRE, fg * 0.18, 0.5);
  const vues = [
    // devant la vitrine, vue d'en haut (coin de l'auvent)
    {c: vise([1700, -1000, 2.9], [0, 200, 4.2]), x: lerp(-1300, 300, k), z: 4.05},
    // le long du mur de côté
    {c: vise([2600, -700, 3.2], [1500, 200, 6.5]), x: 1700, z: lerp(4.4, 7.6, k)},
    // derrière, près de la porte du fond
    {c: vise([-1800, -600, 9.8], [500, 200, 8.3]), x: lerp(1300, -200, k), z: 8.4},
  ];
  const v = vues[i];
  return (
    <CCTV f={f} fg={fg} cam={`0${i + 1}`}>
      <VueExt fg={fg} cam={v.c} items={(cam) => [{z: v.z, x: v.x, el: <RodeurMonde cam={cam} x={v.x} z={v.z} pose={pose} echelle={0.75} lum={1} id={`cc${i}`} />}]} />
    </CCTV>
  );
});

// ===== 13. La caissière chuchote : « Tant que la lumière est allumée, elle ne peut pas entrer. » =====
const Regle = scene('regle', ({f, fg, i, t, d}) => {
  const k = lisse(t, d);
  if (i === 0) {
    const c = vise([CAISSE.x - 260 + 60 * k, -220, CAISSE.z - 0.7 + 0.1 * k], [CAISSE.x, -230, CAISSE.z]);
    return <VueInt fg={fg} cam={c} items={(cam) => [caissiere(cam, {id: 'r0', eyes: 1.3, worry: 1, pupilX: 10, epauleD: -150, coudeD: -20})]} />;
  }
  // tu lèves les yeux vers les néons du plafond
  const c = pov(fg, [0, -60, 7.9], [0, -800, 5.0], {k: 0.6});
  return <VueInt fg={fg} cam={c} roll={roulis(fg, 0.6)} zoom={1.05 + 0.05 * k} />;
});

// ===== 14. Les néons grésillent. Un par un, ils s'éteignent. Il n'en reste qu'un. =====
const neonsB = (f, R) => {
  const g = f > R('grésiller', 60) - 4;
  const off = [R('un', 81), R('par', 86) + 10, R('séteignent', 110) + 6];
  return [0, 1, 2, 3].map((k) => (k < 3 && f >= off[k] ? 0 : g ? gresille(f, `nb${k}`, 0.6) : 1));
};
const Neons = scene('neons', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const nb = neonsB(f, R);
  const lum = nb.reduce((a, b) => a + b, 0) / 4;
  if (i === 0) {
    const c = pov(fg, [0, -60, 7.9], [0, -800, 5.0], {k: 0.8 + 0.6 * (1 - lum)});
    return <VueInt fg={fg} cam={c} roll={roulis(fg, 0.8)} zoom={1.1} o={{boutique: nb}} noir={0.3 * (1 - lum)} />;
  }
  // tu regardes la vitrine : dans le noir qui gagne, elle est collée contre la vitre
  const c = pov(fg, [500, OEIL, 6.3], [0, -250, BOUT.z0], {k: 0.8});
  return (
    <VueInt fg={fg} cam={c} roll={roulis(fg, 0.8)} zoom={1.1 + 0.1 * k} o={{boutique: nb}} noir={0.35 * (1 - lum)}
      dehors={(cam) => [{z: BOUT.z0 - 0.08, x: 0, el: <RodeurMonde cam={cam} x={0} z={BOUT.z0 - 0.08} pose={melange(DEBOUT, QUATRE, 0.1)} tete={-25} lum={0.7} id="nv" />}]} />
  );
});

// le sourire beaucoup trop grand (par-dessus le visage de la caissière)
const Sourire = ({x, y, s, k}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d={`M${-70 - 50 * k},-10 Q0,${60 + 50 * k} ${70 + 50 * k},-10 Q0,${20 + 20 * k} ${-70 - 50 * k},-10 Z`} fill="#140406" />
    {[...Array(14)].map((_, j) => {
      const u = j / 13;
      const xx = lerp(-60 - 45 * k, 60 + 45 * k, u);
      return <path key={j} d={`M${xx - 6},${-2 + 14 * Math.sin(u * Math.PI) * k} l6,${16 * k + 4} l6,${-16 * k - 4}`} fill="#f2efe4" />;
    })}
  </g>
);

// ===== 15. Tu te tournes vers la caissière. Elle sourit. Beaucoup trop grand. =====
const Sourit = scene('sourire', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const nb = [0, 0, 0, 1];
  if (i === 0) {
    const w = ease(t, 0, 12, Easing.out(Easing.cubic));
    const c = pov(fg, [500, OEIL, 6.3], mixC([0, -250, BOUT.z0], [CAISSE.x, -230, CAISSE.z], w), {k: 0.8});
    return <VueInt fg={fg} cam={c} roll={roulis(fg, 0.8)} o={{boutique: nb}} noir={0.25} flou={t < 10 ? [24 * (1 - w), 0] : null} items={(cam) => [caissiere(cam, {id: 's0', lum: 0.7})]} />;
  }
  const s = ease(f, R('sourit', 59) - 4, R('grand', 98) + 10, Easing.inOut(Easing.cubic));
  const c = vise([CAISSE.x - 120, -230, CAISSE.z - 0.5 + 0.08 * k], [CAISSE.x, -232, CAISSE.z]);
  const cam = makeCam(c);
  const [fx, fy] = cam.proj(CAISSE.x, SOL - 922 * 0.78 + 228 * 0.78, CAISSE.z);
  const sc = cam.scale(CAISSE.z, CAISSE.x, -200) * 0.78;
  return (
    <VueInt fg={fg} cam={c} o={{boutique: nb}} noir={0.2}
      items={(cam2) => [caissiere(cam2, {id: 's1', lum: 0.65, eyes: 1 + 0.4 * s, smile: 0})]}
      dessus={s > 0 && <Sourire x={fx + tremble(fg, 1, 'ss')} y={fy} s={sc} k={s} />} />
  );
});

// ===== 16. Le générateur est dans l'arrière-boutique. Tu y vas ? Ou tu restes dans le noir… avec elle ? =====
const Dilemme = scene('dilemme', ({f, fg, t, d, R}) => {
  const k = lisse(t, d);
  const nb = [0, 0, 0, gresille(fg, 'dl', 0.3)];
  const haut = <VueInt fg={fg} cam={pov(fg, [700, OEIL, 6.6], [1150, -100, BOUT.z1], {k: 0.7})} o={{boutique: nb}} noir={0.3} zoom={1.25} />;
  const c2 = vise([CAISSE.x - 150, -230, CAISSE.z - 0.75 + 0.15 * k], [CAISSE.x, -232, CAISSE.z]);
  const cam2 = makeCam(c2);
  const [fx, fy] = cam2.proj(CAISSE.x, SOL - 922 * 0.78 + 228 * 0.78, CAISSE.z);
  const sc = cam2.scale(CAISSE.z, CAISSE.x, -200) * 0.78;
  const bas = <VueInt fg={fg} cam={c2} o={{boutique: nb}} noir={0.25} items={(cam) => [caissiere(cam, {id: 'd1', lum: 0.6, eyes: 1.4})]} dessus={<Sourire x={fx} y={fy} s={sc} k={1} />} />;
  const dis = R('dis-le', 180);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{clipPath: 'inset(0 0 962px 0)'}}>
        <AbsoluteFill style={{transform: 'translateY(-400px)'}}>{haut}</AbsoluteFill>
      </AbsoluteFill>
      <AbsoluteFill style={{clipPath: 'inset(962px 0 0 0)'}}>
        <AbsoluteFill style={{transform: 'translateY(380px)'}}>{bas}</AbsoluteFill>
      </AbsoluteFill>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{position: 'absolute'}}>
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
