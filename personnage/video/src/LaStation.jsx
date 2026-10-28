import {AbsoluteFill, Easing, interpolate, random, Series, spring, staticFile, useCurrentFrame} from 'remotion';
import {Voile} from './ForetNuit';
import {montage, Plan} from './montage';
import {clamp, Finition, makeCam, Perso} from './moteur';
import {Chrono, ChoixBoite, Screamer, VHS, fmt} from './NeLuiOuvrePas';
import {COUCHE, DEBOUT, doigts, ECARTE, galop, melange, PENCHE, QUATRE, RodeurMonde} from './Rodeur';
import {BOUT, CAISSE_P, COMPTOIR, dedans, eclaire, eclaireDedans, MOI, NEONS, PLAFONNIERS, PORTE, PORTE_G, POMPE, stationNuit, VOIT} from './StationNuit';
import PLANS from './station/plans.json';
import timeline from './station/timeline.json';

// « La station-service », dans le style de « Rentrez chez vous » : une vraie station en 3D au milieu de la forêt de
// nuit, éclairée par ses néons (lumière qui tombe, brume, asphalte mouillé), caméra à l'épaule, plans subjectifs,
// plans dynamiques sur le bonhomme. 3 h du matin, la caissière colle une feuille contre la vitre : « NE LÈVE PAS LES
// YEUX ». Quelque chose goutte sur ton épaule : une créature, sur le toit de ta voiture, penchée au-dessus de toi.
// Dilemme au milieu : la voiture (tu meurs, rembobinage VHS) ou la boutique. Dedans, les néons s'éteignent un à un,
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

// ----- caméra -----
const vise = (p, c, extra = {}) => {
  const dx = c[0] - p[0];
  const dy = c[1] - p[1];
  const dz = (c[2] - p[2]) * 1000;
  return {x: p[0], y: p[1], z: p[2], yaw: deg(Math.atan2(dx, dz)), pitch: deg(Math.atan2(dy, Math.hypot(dx, dz))), ...extra};
};
const mixP = (a, b, u) => a.map((x, i) => x + (b[i] - x) * u);
// caméra portée à la main : petite dérive permanente ; pas : balancement de la marche / course
const main = (f, k = 1) => ({dx: k * (5 * Math.sin(f / 23) + 3 * Math.sin(f / 9.7)), dy: k * 3 * Math.sin(f / 17 + 1), r: k * 0.35 * Math.sin(f / 31)});
const OEIL = -150;
const pov = (fg, p, c, {k = 1, pas = 0, v = 0.21} = {}) => {
  const m = main(fg, k);
  const q = [p[0] + m.dx + Math.sin(fg * v) * 9 * pas, p[1] + m.dy - Math.abs(Math.sin(fg * v)) * 16 * pas, p[2]];
  return {...vise(q, c), roll: m.r + Math.sin(fg * v) * 0.9 * pas};
};
// vitesse de rotation (pour le flou de bougé des panoramiques rapides)
const vitesseYaw = (a, b) => Math.abs((((b.yaw - a.yaw + 540) % 360) - 180));

// ----- les lumières -----
const R2 = (f, seed, k) => (random(`${seed}${Math.floor(f / 2)}`) > 0.35 * k ? 1 : 0.12);
// l'auvent : un néon grésille de temps en temps
const auv = (fg) => NEONS.map((_, k) => (k === 1 ? (fg % 113 < 7 ? R2(fg, 'a1', 1) : 1) : k === 5 ? R2(fg, 'a5', 0.12) : 1));
const compteur = (fg) => Math.min(41.8, 18.2 + fg * 0.035);
const DEHORS = (fg, extra = {}) => ({compteur: compteur(fg), auvent: auv(fg), ...extra});

// ----- les vues -----
const Vue = ({fg, cam: c, o = {}, items = [], zoom = 1, roll = 0, noir = 0, flou = null, dessus = null, voile = 0.45, grain = 0.035}) => {
  const cam = makeCam(c);
  const its = typeof items === 'function' ? items(cam) : items;
  const d = stationNuit(cam, fg, {...o, extra: [...(o.extra || []), ...its.filter(Boolean)]});
  return <Plan grain={grain} vignette={0.85} f={fg} cam={cam} decor={d} items={[]} zoom={zoom} roll={roll + (c.roll || 0)} noir={noir} flou={flou} dessus={<g>{d.poussiere}<Voile L={d.L} P={d.P} k={voile} />{dessus}</g>} />;
};
const VueIn = ({fg, cam: c, o = {}, items = [], dehors = [], zoom = 1, roll = 0, noir = 0, flou = null, dessus = null}) => {
  const cam = makeCam(c);
  const its = typeof items === 'function' ? items(cam) : items;
  const deh = typeof dehors === 'function' ? dehors(cam) : dehors;
  const d = dedans(cam, fg, {...o, dehors: {...(o.dehors || {}), extra: deh.filter(Boolean)}, extra: its.filter(Boolean)});
  return <Plan grain={0.04} vignette={0.88} f={fg} cam={cam} decor={d} items={[]} zoom={zoom} roll={roll + (c.roll || 0)} noir={noir} flou={flou} dessus={dessus} />;
};

// ----- les personnages, éclairés par ce qui les entoure -----
const moi = (cam, o, {x = MOI.x, z = MOI.z, id = 'moi', dedansL = false, k = 1, ...pose}) => {
  const t = dedansL ? eclaireDedans(o, [x, -100, z], k) : eclaire(o, [x, -100, z], k);
  return {z, x, el: <Perso cam={cam} id={id} x={x} z={z} lum={1} teinte={t} ombre={0.45} {...pose} />};
};
const CAISS = {coiffure: 'queue', cils: true, couleurs: {haut: '#2a6a8a', hautO: '#1f5470', chev: '#3a2418'}};
// la caissière : derrière la vitrine (vue de dehors), ou dans la boutique
const caissiere = (cam, o, {x = 740, z = BOUT.z0 + 0.2, id = 'cai', k = 1, ...pose}) => {
  const t = eclaireDedans(o, [x, -150, z], k);
  return {z, x, el: <Perso cam={cam} id={id} x={x} z={z} lum={1} teinte={t} ombre={0.3} {...CAISS} {...pose} />};
};
// la créature sur le toit de la voiture, penchée, la tête juste au-dessus de la tienne
const TOIT_Y = -126;
const TOIT_X = MOI.x - 450 * 0.55;
const creature = (cam, o, fg, {x = TOIT_X, y = TOIT_Y, z = MOI.z - 0.05, pose = PENCHE, tete = 25 + 8 * Math.sin(fg / 40), ouvre = 0, echelle = 0.55, lum = null, id = 'cr'} = {}) => {
  const l = lum ?? Math.max(...eclaire(o, [x, y - 300, z], 0.9));
  return {z, x, y, el: <RodeurMonde cam={cam} x={x} z={z} y={y} pose={pose} echelle={echelle} tete={tete} ouvre={ouvre} respire={0.5 + 0.5 * Math.sin(fg / 14)} lum={l} id={`${id}${fg}`} />};
};

const Deux = ({f, a, b, choisi = 0}) => (
  <g>
    <ChoixBoite f={f} debut={a} x={540} y={300} texte="LA VOITURE" emoji="1f697" couleur="#ffb03a" etat={choisi === 1 ? 1 : choisi === 2 ? -1 : 0} />
    <ChoixBoite f={f} debut={b} x={540} y={500} texte="LA BOUTIQUE" emoji="1f3ea" couleur="#5ab0ff" etat={choisi === 2 ? 1 : choisi === 1 ? -1 : 0} />
  </g>
);

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

const TETE = [MOI.x, -150, MOI.z];
const EPAULE = [MOI.x + 72, -70, MOI.z];
const VITRE_C = [740, -150, BOUT.z0];

// ===== 1. Imagine. 3 h du matin. Tu fais le plein dans une station perdue au milieu de la forêt (1re image : toi) =====
const Pompe = scene('pompe', ({f, fg, i, t, d}) => {
  const k = lisse(t, d);
  const o = DEHORS(fg);
  const pose = {epauleD: -20, coudeD: 120, pupilX: 6, pupilY: 4};
  if (i === 0) {
    // plan serré sur toi sous les néons ; un néon claque au-dessus de ta tête dès la 1re seconde
    const zap = f >= 4 && f < 14 ? R2(fg, 'z0', 0.9) : 1;
    const c = pov(fg, [MOI.x + 200 - 60 * k, -230 + 20 * k, MOI.z - 0.95 + 0.25 * k], [MOI.x - 10, -170, MOI.z], {k: 0.6});
    return <Vue fg={fg} cam={c} o={{...o, auvent: o.auvent.map((v, j) => (j === 4 ? zap : v))}} zoom={interpolate(f, [0, 6], [1.18, 1.05], {...clamp, easing: Easing.out(Easing.cubic)})} items={(cam) => [moi(cam, o, {id: 'p0', ...pose})]} />;
  }
  if (i === 1) {
    // gros plan : les litres qui défilent sur l'écran de la pompe
    const c = vise([POMPE.x - 360 + 40 * k, -150, POMPE.z - 0.1 + 0.05 * k], [POMPE.x - 86, -140, POMPE.z]);
    return <Vue fg={fg} cam={c} o={o} />;
  }
  if (i === 2) {
    // la station, seule au milieu de la forêt : on descend des arbres vers la lumière
    const c = vise([-250 + 150 * k, lerp(-2700, -1050, k), lerp(-14, -6.5, k)], [0, lerp(-300, -200, k), 3]);
    return <Vue fg={fg} cam={c} o={o} voile={0.6} items={(cam) => [moi(cam, o, {id: 'p2', ...pose})]} />;
  }
  // au ras du sol mouillé, travelling vers toi
  const c = vise([MOI.x + 160 - 80 * k, 330, MOI.z - 2.3 + 0.6 * k], [MOI.x, -150, MOI.z]);
  return <Vue fg={fg} cam={c} o={o} items={(cam) => [moi(cam, o, {id: 'p3', ...pose, pupilX: 14})]} />;
});

// ===== 2. Et d'un coup, la caissière tape contre la vitre. Fort. =====
const BRAS_TAPE = (tape) => ({epauleD: -150 - 30 * tape, coudeD: -40, epauleG: 150 + 30 * tape, coudeG: 40, eyes: 1.45, worry: 1, scream: 0.3});
const Vitre = scene('vitre', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const tape = f > R('tape', 39) - 4 ? Math.max(0, Math.sin(f * 0.9)) : 0;
  const o = DEHORS(fg);
  const cais = (cam) => caissiere(cam, o, {id: 'v', ...BRAS_TAPE(tape)});
  if (i === 0) {
    // tu tournes la tête d'un coup vers la boutique (panoramique rapide, flou)
    const u = ease(t, 2, 11, Easing.inOut(Easing.cubic));
    const a = pov(fg, [MOI.x, OEIL, MOI.z - 0.1], [POMPE.x, -140, POMPE.z + 0.1], {k: 0.8});
    const b = pov(fg, [MOI.x, OEIL, MOI.z - 0.1], VITRE_C, {k: 0.8});
    const c = {...b, yaw: lerp(a.yaw, b.yaw, u), pitch: lerp(a.pitch, b.pitch, u)};
    const v = Math.abs(lerp(a.yaw, b.yaw, ease(t + 1, 2, 11, Easing.inOut(Easing.cubic))) - c.yaw);
    return <Vue fg={fg} cam={c} o={{...o, caissiere: cais(makeCam(c))}} zoom={1.05 + 0.75 * ease(t, 8, 22, Easing.out(Easing.cubic))} flou={v > 1 ? [Math.min(40, v * 3), 0] : null} />;
  }
  // plus près : ses mains qui frappent le verre (la vitre tremble)
  const sh = tremble(fg, 10 * tape, 'vt');
  const c = vise([740 + sh, -230 + sh * 0.5, BOUT.z0 - 1.35 + 0.25 * k], [740, -230, BOUT.z0 + 0.2]);
  return <Vue fg={fg} cam={c} o={{...o, caissiere: cais(makeCam(c))}} zoom={1.0 + 0.04 * tape} />;
});

// ===== 3. Elle colle une feuille contre le verre. Dessus : « Ne lève pas les yeux. » =====
const BRAS_FEUILLE = {epauleD: -110, coudeD: -60, epauleG: 110, coudeG: 60, eyes: 1.4, worry: 1};
const Feuille = scene('feuille', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const o = DEHORS(fg);
  if (i === 0) {
    // par-dessus ton épaule : toi de dos, elle derrière la vitre qui plaque la feuille
    const feuille = ease(f, R('colle', 10), R('feuille', 28) + 6);
    const c = vise([MOI.x - 170 + 40 * k, -330, MOI.z - 0.8 + 0.15 * k], [700, -150, BOUT.z0]);
    return (
      <Vue fg={fg} cam={c} o={{...o, feuille, caissiere: caissiere(makeCam(c), o, {id: 'f0', ...BRAS_FEUILLE})}} zoom={1.15}
        items={(cam) => [moi(cam, o, {id: 'f0m', dos: true, epauleD: -20, coudeD: 120, k: 0.8})]} />
    );
  }
  // la feuille, en gros ; ses yeux au-dessus
  const c = vise([745 + main(fg, 0.5).dx, -60, BOUT.z0 - 1.05 + 0.3 * k], [740, -40, BOUT.z0]);
  return <Vue fg={fg} cam={c} o={{...o, feuille: 1, caissiere: caissiere(makeCam(c), o, {id: 'f1', ...BRAS_FEUILLE, pupilX: 4})}} />;
});

// gouttes noires qui tombent (repère écran)
const Gouttes = ({f, t0, x, y, y0 = -80, n = 4, s = 1}) => (
  <g>
    {[...Array(n)].map((_, k) => {
      const tk = t0 + k * 14;
      const u = (f - tk) / 9;
      if (u < 0) return null;
      const yy = u < 1 ? lerp(y0, y, u * u) : y;
      const cx = x + (k % 2 ? 1 : -1) * k * 9 * s;
      const e = Math.min(1, (u - 1) * 2);
      // une fois tombée : une tache épaisse, brillante, qui coule lentement vers le bas
      const coule = Math.min(1, Math.max(0, (u - 1) / 5)) * (40 + 25 * k) * s;
      return (
        <g key={k}>
          {u < 1 && (
            <g>
              <path d={`M${cx},${yy - 26 * s} Q${cx + 11 * s},${yy} ${cx},${yy + 12 * s} Q${cx - 11 * s},${yy} ${cx},${yy - 26 * s} Z`} fill="#040306" />
              <ellipse cx={cx - 3 * s} cy={yy - 2 * s} rx={2.5 * s} ry={5 * s} fill="#9aa8c8" opacity="0.6" />
            </g>
          )}
          {u >= 1 && (
            <g>
              <path d={`M${cx - 7 * s},${y} Q${cx - 8 * s},${y + coule} ${cx - 2 * s},${y + coule + 8 * s} Q${cx + 5 * s},${y + coule} ${cx + 4 * s},${y}`} fill="#040306" />
              <ellipse cx={cx} cy={y + 2 * s} rx={(14 + 10 * e) * s} ry={(6 + 3 * e) * s} fill="#040306" />
              <ellipse cx={cx - 4 * s} cy={y} rx={5 * s} ry={1.8 * s} fill="#b8c4e0" opacity="0.45" />
            </g>
          )}
        </g>
      );
    })}
  </g>
);

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


// ===== 4. Tu ne comprends pas. Et là, quelque chose goutte sur ton épaule. Noir. Épais. (on ne la voit pas encore) =====
const Goutte = scene('goutte', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const o = DEHORS(fg);
  if (i === 0) {
    // de face : tu regardes la boutique, tu ne comprends pas
    const regard = interpolate(f, [0, 14, 30, 44], [0, 1, 1, -0.4], {...clamp, easing: EZ});
    const c = pov(fg, [MOI.x + 140 - 50 * k, -210, MOI.z - 1.05 + 0.2 * k], [MOI.x, -170, MOI.z], {k: 0.5});
    return <Vue fg={fg} cam={c} o={o} items={(cam) => [moi(cam, o, {id: 'g0', epauleD: -20, coudeD: 120, brows: 6, pupilX: 12 * regard, tilt: 3 * regard, worry: 0.4})]} />;
  }
  // gros plan : ton épaule ; les gouttes noires tombent d'en haut (hors champ)
  const peur = ease(f, R('noir', 109), R('noir', 109) + 8);
  const c = vise([MOI.x + 120 + main(fg, 0.4).dx, -90, MOI.z - 0.42 + 0.04 * k], [MOI.x + 40, -70, MOI.z]);
  const cam = makeCam(c);
  const [ex, ey] = cam.proj(...EPAULE);
  return (
    <Vue fg={fg} cam={c} o={o} zoom={1.45 + 0.1 * k}
      items={[moi(cam, o, {id: 'g1', epauleD: -20, coudeD: 120, eyes: 1.15 + 0.35 * peur, worry: 0.4 + 0.6 * peur, pupilX: 12 * peur, pupilY: -6 * peur})]}
      dessus={<Gouttes f={f} t0={R('goutte', 72) - 26} x={ex} y={ey} s={cam.scale(MOI.z, ...EPAULE.slice(0, 2)) * 0.9} />} />
  );
});

// ===== 5. Ça vient du toit de ta voiture. Quelque chose est couché sur le toit. Juste au-dessus de ta tête. =====
const Toit = scene('toit', ({f, fg, i, t, d}) => {
  const k = lisse(t, d);
  const o = DEHORS(fg);
  const pose = {epauleD: -20, coudeD: 120, eyes: 1.25, worry: 0.8, pupilX: 6};
  if (i === 0) {
    // la caméra remonte le long de la goutte : de ton épaule… jusqu'au bord du toit, et ce qui est dessus
    const u = ease(t, 3, d - 4, Easing.inOut(Easing.cubic));
    const c = vise([MOI.x + 170, 40 - 60 * u, MOI.z - 0.8], mixP([MOI.x + 40, 40, MOI.z], [MOI.x - 90, -380, MOI.z], u));
    return <Vue fg={fg} cam={c} o={o} roll={main(fg, 0.6).r} items={(cam) => [moi(cam, o, {id: 't0', ...pose}), creature(cam, o, fg, {ouvre: 0.25})]} />;
  }
  if (i === 1) {
    // contre-plongée : toi, immobile, et elle, penchée juste au-dessus de ta tête
    const c = vise([MOI.x + 10 - 40 * k, 340, MOI.z - 1.25 + 0.2 * k], [MOI.x - 110, -330, MOI.z]);
    return <Vue fg={fg} cam={c} o={o} zoom={1.02 + 0.05 * k} roll={-3 + main(fg, 0.5).r} voile={0.6} items={(cam) => [moi(cam, o, {id: 't1', ...pose}), creature(cam, o, fg, {ouvre: 0.35 * ease(t, 10, 40), tete: 25 + 15 * ease(t, 6, 40)})]} />;
  }
  // tu ne lèves pas les yeux : tu fixes la pompe… de longs doigts gris entrent par le haut de l'image
  const c = pov(fg, [MOI.x - 10, OEIL + 10, MOI.z - 0.15], [POMPE.x - 86, -130, POMPE.z - 0.1], {k: 0.4});
  return <Vue fg={fg} cam={c} o={o} zoom={1.1} dessus={<Doigts x={380} y={lerp(-330, 160, ease(t, 4, d))} />} />;
});

// ===== 6. Trois secondes : la voiture, ou la boutique ? (chrono en millisecondes) =====
const PORTIERE = [VOIT.x1, 80, VOIT.z0 + 0.75];
const Choix = scene('choix', ({f, fg, i, t, d, R}) => {
  const t0 = R('boutique', 90) + 12;
  const reste = 3 - Math.max(0, f - t0) / 30;
  const o = DEHORS(fg, {compteur: 41.8});
  const tension = i === 2 ? 1 - reste / 3 : 0;
  let c;
  let flou = null;
  let items = [];
  if (i < 2) {
    // regard vers la portière… puis vers la boutique (panoramiques rapides)
    const de = i === 0 ? [POMPE.x - 86, -130, POMPE.z] : PORTIERE;
    const vers = i === 0 ? PORTIERE : VITRE_C;
    const u = ease(t, 0, 9, Easing.out(Easing.cubic));
    const a = pov(fg, [MOI.x, OEIL, MOI.z - 0.1], de, {k: 1.2});
    const b = pov(fg, [MOI.x, OEIL, MOI.z - 0.1], vers, {k: 1.2});
    const dyaw = ((b.yaw - a.yaw + 540) % 360) - 180;
    c = {...b, yaw: a.yaw + dyaw * u, pitch: lerp(a.pitch, b.pitch, u)};
    const v = Math.abs(dyaw) * Math.abs(ease(t + 1, 0, 9, Easing.out(Easing.cubic)) - u);
    flou = v > 1 ? [Math.min(40, v * 3), 0] : null;
    items = (cam) => [creature(cam, o, fg, {ouvre: 0.3})];
  } else {
    // de l'extérieur : toi entre la voiture et la boutique ; elle au-dessus ; la caméra tourne autour de toi
    const a = lerp(200, 160, lisse(t, d));
    const r = 1.6;
    c = {x: MOI.x - Math.sin((a * Math.PI) / 180) * r * 1000 + tremble(fg, 8 * tension, 'ch'), y: -120, z: MOI.z - Math.cos((a * Math.PI) / 180) * r, yaw: a, pitch: -6};
    items = (cam) => [moi(cam, o, {id: 'ch', epauleD: -20, coudeD: 120, eyes: 1.4, worry: 1, sweat: 1, pupilX: 14 * Math.sin(fg / 9)}), creature(cam, o, fg, {ouvre: 0.4, tete: 40})];
  }
  const pouls = Math.max(0, Math.sin(f / 4.5)) ** 8;
  return (
    <Vue fg={fg} cam={c} o={o} items={items} flou={flou} zoom={1.05 + 0.03 * pouls * (0.5 + tension)}
      dessus={
        <g>
          <Deux f={f} a={R('voiture', 55) - 4} b={R('boutique', 90) - 6} />
          {f >= t0 - 4 && <Chrono reste={reste} />}
          <rect width="1080" height="1920" fill="#ff1a1a" opacity={f >= t0 ? 0.05 + 0.06 * Math.max(0, Math.sin(f / 2.5)) * (1 - reste / 3) : 0} />
        </g>
      } />
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

// ===== 7. La voiture : tu fonces, la portière… la clé, le moteur tousse, le bras, un, deux, trois, la vitre explose =====
const Voiture = scene('voiture', ({f, fg, i, t, d, R}) => {
  if (i === 0) {
    // vue subjective : tu te jettes sur la portière ; au-dessus, ses doigts sur le bord du toit
    const o = DEHORS(fg, {compteur: 41.8});
    const u = ease(t, 0, d - 6, Easing.in(Easing.quad));
    const c = pov(fg, mixP([MOI.x, OEIL, MOI.z - 0.1], [VOIT.x1 + 170, -60, VOIT.z0 + 0.95], u), mixP(PORTIERE, [VOIT.x1, 120, VOIT.z0 + 0.75], u), {k: 1.6, pas: 1.4 * (1 - u), v: 0.42});
    return <Vue fg={fg} cam={c} o={o} flou={[14 * u, 4 * u]} noir={ease(t, d - 8, d)} items={(cam) => [creature(cam, o, fg, {ouvre: 0.5, tete: 45})]} dessus={<Deux f={f + 300} a={0} b={0} choisi={1} />} />;
  }
  const claque = interpolate(f - R('claques', 44), [0, 2, 8], [0, 1, 0], clamp);
  const clef = ease(f, R('tournes', 79) - 4, R('clé', 92));
  const tousse = f > R('moteur', 112) - 4 && f < R('et', 140) ? 1 : 0;
  const descend = ease(f, R('long', 152) - 10, R('pare-brise', 194) + 8, Easing.out(Easing.cubic));
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

const CCTV = ({f, fg, n, children}) => (
  <AbsoluteFill style={{background: '#000'}}>
    <AbsoluteFill style={{filter: 'grayscale(1) contrast(1.25) brightness(1.7)'}}>{children}</AbsoluteFill>
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


// ===== 10. Cette fois, tu cours vers la boutique ! La caissière t'ouvre, et verrouille derrière toi. =====
const MOI_IN = {x: 230, z: 6.25};
const Boutique = scene('boutique', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  if (i === 0) {
    // vue subjective : tu sprintes vers la porte vitrée, elle te fait signe
    const o = DEHORS(fg, {compteur: 41.8});
    const u = ease(t, 0, d, Easing.in(Easing.quad));
    const c = pov(fg, mixP([MOI.x + 60, OEIL + 20, MOI.z + 0.2], [720, OEIL + 20, BOUT.z0 - 0.45], u), [740, -170, BOUT.z0 + 1.2], {k: 1.6, pas: 2.2, v: 0.42});
    return (
      <Vue fg={fg} cam={c} o={{...o, caissiere: caissiere(makeCam(c), o, {id: 'b0', x: 760, epauleD: -60, coudeD: -90 + 40 * Math.sin(fg * 0.5), eyes: 1.4, worry: 1})}} flou={[0, 3]} zoom={1.04}
        items={(cam) => [creature(cam, o, fg, {ouvre: 0.4, tete: 40})]} dessus={<Deux f={f + 300} a={0} b={0} choisi={2} />} />
    );
  }
  // dedans : elle verrouille ; dehors, sous les néons, la voiture… et ce qu'il y a sur le toit
  const verrou = ease(f, R('verrouille', 93), R('derrière', 105));
  const o = {dehors: DEHORS(fg, {compteur: 41.8})};
  const c = pov(fg, [MOI_IN.x - 150, OEIL, MOI_IN.z + 0.9 - 0.2 * k], [600, -120, BOUT.z0], {k: 0.9});
  return (
    <VueIn fg={fg} cam={c} o={o}
      items={(cam) => [caissiere(cam, o, {id: 'b1', x: 760, z: BOUT.z0 + 0.35, dos: true, epauleD: -60 - 40 * verrou, coudeD: -90})]} dehors={(cam) => [creature(cam, o.dehors, fg, {ouvre: 0.2})]} />
  );
});

// ===== 11. Par la vitre, tu la vois descendre du toit. À quatre pattes. =====
const Descend = scene('descend', ({f, fg, t, d, R}) => {
  const k = lisse(t, d);
  const u = ease(f, R('vois', 33) - 4, d - 2);
  const bas = ease(u, 0.1, 0.45);
  const o = {dehors: DEHORS(fg, {compteur: 41.8})};
  const x = lerp(TOIT_X, 150, ease(u, 0.3, 1));
  const y = lerp(TOIT_Y, 432, bas);
  const z = lerp(MOI.z - 0.05, 4.4, ease(u, 0.35, 1));
  const pose = galop(melange(PENCHE, QUATRE, ease(u, 0, 0.3)), fg * 0.22, 0.4 + 0.5 * ease(u, 0.3, 0.5));
  const c = pov(fg, [350, OEIL + 30, BOUT.z0 + 0.55 - 0.15 * k], [lerp(-150, 150, u), lerp(-150, 150, u), lerp(2.2, 4.4, u)], {k: 0.6});
  return <VueIn fg={fg} cam={c} o={o} zoom={1.7 + 0.3 * k} dehors={(cam) => [creature(cam, o.dehors, fg, {x, y, z, pose, tete: -15, ouvre: 0.2})]} />;
});

// ===== 12. Sur les écrans de surveillance, elle fait le tour de la boutique. Lentement. =====
const Ecrans = scene('ecrans', ({f, fg, i, t, d}) => {
  const k = lisse(t, d);
  const o = DEHORS(fg, {compteur: 41.8});
  const pose = galop(QUATRE, fg * 0.18, 0.5);
  const VUES = [
    {c: vise([1750, -1000, -0.4], [-200, 250, 2.6]), x: lerp(-900, 700, k), z: 3.6},
    {c: vise([-1800, -1000, 0.2], [600, 300, 4.8]), x: lerp(1500, -800, k), z: 5.0},
    {c: vise([-2700, -850, 11.4], [-1500, 250, 8.6]), x: lerp(-2400, -1950, k), z: lerp(10.2, 7.0, k)},
  ];
  const v = VUES[i];
  return (
    <CCTV f={f} fg={fg} n={`0${i + 1}`}>
      <Vue fg={fg} cam={v.c} o={o} voile={0.2} grain={0} items={(cam) => [creature(cam, o, fg, {x: v.x, y: 432, z: v.z, pose, tete: -10, lum: 0.8, echelle: 0.6})]} />
    </CCTV>
  );
});

// ===== 13. La caissière chuchote : « Tant que la lumière est allumée, elle ne peut pas entrer. » =====
const VISAGE = [CAISSE_P.x, -110, CAISSE_P.z];
const Regle = scene('regle', ({f, fg, i, t, d}) => {
  const k = lisse(t, d);
  const o = {boutique: [1, R2(fg, 'rg', 0.08), 1, 1], dehors: DEHORS(fg, {compteur: 41.8})};
  if (i === 0) {
    // gros plan : elle chuchote, penchée sur le comptoir
    const c = pov(fg, [CAISSE_P.x - 90, -112, 5.95 + 0.1 * k], VISAGE, {k: 0.4});
    return <VueIn fg={fg} cam={c} o={o} zoom={2.0} items={(cam) => [caissiere(cam, o, {id: 'r0', x: CAISSE_P.x, z: CAISSE_P.z, eyes: 1.3, worry: 1, pupilX: -6, brows: 6})]} />;
  }
  // tu lèves les yeux vers les plafonniers
  const c = pov(fg, [MOI_IN.x, OEIL, MOI_IN.z + 0.3], [300, -800, 7.3 + 0.3 * k], {k: 0.5});
  return <VueIn fg={fg} cam={c} o={o} />;
});

// ===== 14. Les néons grésillent. Un par un, ils s'éteignent. Il n'en reste qu'un. =====
// le dernier qui reste allumé : celui au-dessus de la caissière
const neonsB = (f, R) => {
  const g = f > R('grésiller', 56) - 4;
  const off = {0: R('un', 76), 2: R('par', 82) + 10, 3: R('séteignent', 104) + 6};
  return [0, 1, 2, 3].map((k) => (off[k] !== undefined && f >= off[k] ? 0 : g ? R2(f, `nb${k}`, 0.6) : 1));
};
const Neons = scene('neons', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const nb = neonsB(f, R);
  const noirs = 4 - nb.reduce((a, b) => a + b, 0);
  if (i === 0) {
    // la boutique entière : les plafonniers claquent un à un, la nuit gagne la pièce
    const o = {boutique: nb, frigos: nb[0] > 0.5 ? 1 : 0.2, dehors: DEHORS(fg, {compteur: 41.8})};
    const c = pov(fg, [-750, -430, 5.8], [700, 0, 8.4], {k: 0.6 + 0.4 * noirs});
    return (
      <VueIn fg={fg} cam={c} o={o} zoom={1.0 + 0.04 * k}
        items={(cam) => [caissiere(cam, o, {id: 'n0', x: CAISSE_P.x, z: CAISSE_P.z, eyes: 1.2, pupilY: -8}), moi(cam, o, {id: 'n0m', x: MOI_IN.x, z: MOI_IN.z, dedansL: true, dos: true, epauleD: -10, coudeD: 30})]} />
    );
  }
  // dans le noir : derrière la vitre, elle est debout, collée au verre, à contre-jour des néons de l'auvent
  const o = {boutique: [0, 1, 0, 0], frigos: 0.2, dehorsLum: 0.6, dehors: DEHORS(fg, {compteur: 41.8, vitrine: 0})};
  const c = pov(fg, [250, OEIL, 7.7 - 0.35 * k], [-60, -330, BOUT.z0], {k: 0.6});
  return <VueIn fg={fg} cam={c} o={o} dehors={(cam) => [creature(cam, o.dehors, fg, {x: -60, y: 432, z: BOUT.z0 - 0.12, pose: melange(DEBOUT, ECARTE, 0.35), tete: -20 + 4 * Math.sin(fg / 20), echelle: 0.82, lum: 0.32})]} />;
});

// ===== 15. Tu te tournes vers la caissière. Elle sourit. Beaucoup trop grand. =====
const NB_FIN = [0, 1, 0, 0];
const Sourit = scene('sourire', ({f, fg, i, t, R}) => {
  const o = {boutique: NB_FIN, frigos: 0.2, dehors: DEHORS(fg, {compteur: 41.8, vitrine: 0})};
  if (i === 0) {
    // tu te retournes d'un coup (flou), elle est là, sous le dernier néon
    const u = ease(t, 0, 12, Easing.out(Easing.cubic));
    const a = pov(fg, [MOI_IN.x + 250, OEIL, 6.0], [-60, -300, BOUT.z0], {k: 0.7});
    const b = pov(fg, [MOI_IN.x + 250, OEIL, 6.0], VISAGE, {k: 0.7});
    const dyaw = ((b.yaw - a.yaw + 540) % 360) - 180;
    const c = {...b, yaw: a.yaw + dyaw * u, pitch: lerp(a.pitch, b.pitch, u)};
    const v = Math.abs(dyaw) * Math.abs(ease(t + 1, 0, 12, Easing.out(Easing.cubic)) - u);
    return <VueIn fg={fg} cam={c} o={o} flou={v > 1 ? [Math.min(40, v * 3), 0] : null} zoom={1.05} items={(cam) => [caissiere(cam, o, {id: 's0', x: CAISSE_P.x, z: CAISSE_P.z, eyes: 1.1})]} />;
  }
  // gros plan : son sourire s'étire, beaucoup trop grand
  const s = ease(f, R('sourit', 56) - 4, R('grand', 89) + 8, Easing.inOut(Easing.cubic));
  const c = pov(fg, [CAISSE_P.x - 25, -112, 5.95], VISAGE, {k: 0.3});
  return <VueIn fg={fg} cam={c} o={o} zoom={2.1 + 0.5 * s} items={(cam) => [caissiere(cam, o, {id: 's1', x: CAISSE_P.x, z: CAISSE_P.z, grin: s, eyes: 1 + 0.35 * s, brows: -4 * s})]} />;
});

// ===== 16. Le générateur est dans l'arrière-boutique. Tu y vas ? Ou tu restes dans le noir… avec elle ? =====
const Dilemme = scene('dilemme', ({f, fg, t, d, R}) => {
  const k = lisse(t, d);
  const nb = [0, R2(fg, 'dl', 0.3), 0, 0];
  const o = {boutique: nb, frigos: 0.2, dehors: DEHORS(fg, {compteur: 41.8, vitrine: 0})};
  const dis = R('dis-le', 181);
  const haut = pov(fg, [700, OEIL, 8.0 - 0.3 * k], [(PORTE_G.x0 + PORTE_G.x1) / 2, -150, BOUT.z1], {k: 0.6});
  const bas = pov(fg, [CAISSE_P.x - 25, -112, 5.95], VISAGE, {k: 0.3});
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 956, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 0, top: -480, width: 1080, height: 1920}}>
          <VueIn fg={fg} cam={haut} o={{...o, veilleuse: 0.6 + 0.4 * Math.sin(fg / 6)}} />
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, top: 964, width: 1080, height: 956, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 0, top: -480, width: 1080, height: 1920}}>
          <VueIn fg={fg} cam={bas} o={o} zoom={2.4} items={(cam) => [caissiere(cam, o, {id: 'd1', x: CAISSE_P.x, z: CAISSE_P.z, grin: 1, eyes: 1.35, brows: -4})]} />
        </div>
      </div>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{position: 'absolute'}}>
        <rect x="0" y="956" width="1080" height="8" fill="#000" />
        <ChoixBoite f={f} debut={R('rallumer', 76) - 6} x={540} y={850} texte="LE GÉNÉRATEUR" emoji="1f526" couleur="#ffd23a" />
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
