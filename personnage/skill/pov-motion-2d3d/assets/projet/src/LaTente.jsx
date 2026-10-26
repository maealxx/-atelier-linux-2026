import {AbsoluteFill, Easing, interpolate, random, Series, spring, staticFile, useCurrentFrame} from 'remotion';
import {Choix} from './Livreur';
import {Telephone} from './Maison';
import {camFace, montage, Plan, punch} from './montage';
import {clamp, makeCam, marche, Perso} from './moteur';
import {SOL} from './Rue';
import {boiteG, tache} from './Gare';
import {plaque} from './Lycee';
import {clairiere, FEU, ombrePortee, TENTE, tenteInt, Tete, vacille} from './Foret';
import PLANS from './tente/plans.json';
import timeline from './tente/timeline.json';

// « La tente » : camping en forêt. Le feu s'éteint tout seul, une voix dehors imite ton pote… qui dort à côté de toi.
// Puis le vrai Lucas t'écrit : il est dehors. Les deux qui dorment à côté de toi ouvrent les yeux.
const {decoupe, repere, SCENES} = montage(timeline, PLANS);
export const DUREE_TENTE = SCENES.reduce((t, [, d]) => t + d, 0);
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
const tremble = (f, k, cle) => k * (random(`${cle}${f}`) - 0.5);
const LUNE_T = [0.62, 0.74, 1.05]; // lumière de lune
const feuT = (v) => [0.55 + 0.75 * v, 0.62 + 0.3 * v, 0.95 - 0.35 * v]; // lumière du feu (orange) mêlée à la lune

// ----- les potes -----
const LUCAS = {chev: '#3a2416', peau: '#f2c3a0'};
const HUGO = {chev: '#d8b060', peau: '#e8b48c'};
const PL = {x: -420, z: 9.0};
const PH = {x: 420, z: 9.0};
const MOI = {x: 0, z: 8.55, y: SOL + 330}; // assis dans son sac, au milieu
// le feu : il brûle jusqu'à « s'éteint », puis plus rien que les braises
const feuDe = (fg) => interpolate(fg, [repere('feu', 'séteint', 142) - 3, repere('feu', 'séteint', 142) + 3], [1, 0], clamp);
const fumeeDe = (fg) => interpolate(fg, [repere('feu', 'séteint', 142), repere('feu', 'séteint', 142) + 10, START.appel], [0, 1, 0.3], clamp);
const braisesDe = (fg) => interpolate(fg, [repere('feu', 'séteint', 142), START.appel], [1, 0.25], clamp);

// sacs de couchage, oreillers et têtes des potes (couchés, vus d'en haut)
const sacs = (cam, f, deco, {lucas = {}, hugo = {}, moi = true} = {}) => {
  const items = [];
  const L = (p) => deco.L(p);
  const col = (c, p) => {
    const l = L(p);
    return `rgb(${c.map((v) => Math.round(Math.min(255, v * (0.25 + 1.3 * l)))).join(',')})`;
  };
  [[PL, [40, 90, 170], lucas, LUCAS], [PH, [40, 130, 70], hugo, HUGO]].forEach(([P, c, etat, look], k) => {
    const p = [P.x, SOL - 60, 8.6];
    const dx = etat.secoue ? tremble(f, 40 * etat.secoue, `se${k}`) : 0;
    items.push({z: 8.55, x: P.x, y: SOL - 60, el: <g key={`sac${k}`}>
      {tache(cam, P.x, SOL - 2, 8.6, 300, 0.55, 'fo-ombre', 0.6, 'o')}
      {boiteG(cam, P.x - 190 + dx, P.x + 190 + dx, SOL - 120, SOL, 8.12, 8.88, [col(c, p), col(c.map((v) => v * 0.8), p), col(c.map((v) => v * 0.65), p)], 'b')}
      {boiteG(cam, P.x - 150 + dx, P.x + 150 + dx, SOL - 150, SOL - 120, 8.2, 8.8, [col(c.map((v) => v * 1.1), p), col(c, p), col(c.map((v) => v * 0.7), p)], 'b2')}
    </g>});
    items.push({z: 9.05, x: P.x, y: SOL - 60, el: <g key={`or${k}`}>
      {boiteG(cam, P.x - 170, P.x + 170, SOL - 70, SOL, 8.9, 9.2, [col([210, 210, 220], [P.x, SOL, 9]), col([180, 180, 190], [P.x, SOL, 9]), col([160, 160, 170], [P.x, SOL, 9])], 'o')}
      {plaque(cam, [P.x - 95 + dx, SOL - 72, P.z + 0.13], [1, 0, 0], [0, 0, -1], 190, 210,
        <g transform="scale(0.475)" style={{filter: `brightness(${0.35 + 1.2 * L([P.x, SOL, 9])})`}}><Tete {...look} {...etat} /></g>, 'tete')}
    </g>});
  });
  if (moi) items.push({z: 8.4, x: 0, y: SOL - 60, el: <g key="sacmoi">{boiteG(cam, -170, 170, SOL - 110, SOL, 8.1, 8.45, [col([150, 60, 50], [0, SOL, 8.3]), col([120, 50, 40], [0, SOL, 8.3]), col([100, 40, 34], [0, SOL, 8.3])], 'b')}</g>});
  return items;
};
// lui, assis dans la tente (coupé sous le sol pour que ses jambes ne dépassent pas)
const moiAssis = (cam, deco, id, pose) => {
  const clip = cam.poly([[MOI.x - 3000, -3000, MOI.z], [MOI.x + 3000, -3000, MOI.z], [MOI.x + 3000, SOL - 110, MOI.z], [MOI.x - 3000, SOL - 110, MOI.z]]);
  const l = deco.L([0, -100, MOI.z]);
  return {z: MOI.z, x: MOI.x, el: clip && (
    <g key={id}>
      <defs><clipPath id={`cl${id}`}><polygon points={clip} /></clipPath></defs>
      <g clipPath={`url(#cl${id})`}><Perso cam={cam} id={id} x={MOI.x} z={MOI.z} y={MOI.y} ombre={0} lum={0.3 + 0.9 * l} teinte={[1.15, 0.92, 0.74]} {...pose} /></g>
    </g>
  )};
};
// gros plan sur son visage dans la tente
const faceMoi = (t, d, {dir = -1, dist = 0.5, dx = 0, dy = 0} = {}) => camFace(MOI.x, MOI.z, dir, dist, t, d, {dx, dy: 330 + dy, push: 0.08});

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
const PF = {x: -480, z: 5.62}; // lui, debout près du feu

// 1. Le feu de camp, trois heures du matin. Et le feu s'éteint d'un coup.
const Feu = scene('feu', ({f, fg, i, t, d}) => {
  const k = lisse(t, d);
  const feu = feuDe(fg);
  const cams = [
    () => vise([850 - 150 * k, -480, 4.0 + 0.35 * k], [-200, -180, 6.6]),
    () => camFace(PF.x, PF.z, 1, 0.62, t, d, {dx: 120, dy: -10, push: 0.1}),
    () => vise([380, SOL - 160, 5.15 + 0.15 * k], [0, SOL - 260, FEU.z]),
    () => vise([-1900 + 200 * k, -700, 2.0], [2200, -3200, 20]),
  ];
  const cam = makeCam(cams[i]());
  const decor = clairiere(cam, fg, {feu, fumee: fumeeDe(fg), braises: braisesDe(fg)});
  const v = decor.v;
  const items = [];
  const surpris = feu < 0.5;
  items.push(ombrePortee(cam, PF.x, PF.z, FEU.x, FEU.z, {long: 1700, large: 230, op: 0.55 * v, key: 'om'}) && {z: PF.z + 0.4, x: PF.x - 400, y: SOL, el: ombrePortee(cam, PF.x, PF.z, FEU.x, FEU.z, {long: 1700, large: 230, op: 0.55 * v, key: 'om'})});
  if (i !== 2 || true) items.push({z: PF.z, x: PF.x, el: <Perso cam={cam} id={`fe${i}`} x={PF.x} z={PF.z} dos={i === 1 ? false : cam.z > PF.z} lum={0.35 + 0.9 * v} teinte={feuT(v)} smile={surpris ? 0 : 0.3} eyes={surpris ? 1.4 : 1} worry={surpris ? 1 : 0}
    epauleG={surpris ? 10 : 25} coudeG={surpris ? 20 : 95} epauleD={surpris ? -10 : -25} coudeD={surpris ? -20 : -95} pupilX={i === 1 ? -6 : 0} breath={Math.sin(fg / 6) * 3} />});
  const pouf = i === 2 ? interpolate(fg, [repere('feu', 'séteint', 142), repere('feu', 'séteint', 142) + 2, repere('feu', 'séteint', 142) + 10], [0, 0.35, 0], clamp) : 0;
  return <Plan f={fg} cam={cam} decor={decor} items={items.filter(Boolean)} noir={0.04} zoom={doux(t)} roll={[1.5, -1, 0, 1][i]} dessus={<rect width="1080" height="1920" fill="#ffb060" opacity={pouf} />} />;
});

// 2. Tu fonces dans la tente, tu fermes la fermeture éclair. Tes potes dorment déjà.
const Tente = scene('tente', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  if (i === 0) {
    const u = interpolate(t, [0, d - 4], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
    const x = PF.x + (0 - PF.x) * u;
    const z = PF.z + (TENTE.z0 + 0.05 - PF.z) * u;
    const m = marche(fg, 0.7, 1.2);
    const cam = makeCam(vise([1250, -620, 5.3], [-100, -150, 7.6]));
    const decor = clairiere(cam, fg, {feu: 0, braises: braisesDe(fg), fumee: 0.3});
    const items = [{z, x, el: z < TENTE.z0 && <Perso cam={cam} id="te0" x={x} z={z} dos lum={0.45} teinte={LUNE_T} lift={m.bob * 2} legG={m.legG} legD={m.legD} epauleG={14 + m.bras * 3} coudeG={80} epauleD={-14 + m.bras * 3} coudeD={-80} />}];
    return <Plan f={fg} cam={cam} decor={decor} items={items} noir={0.06} zoom={doux(t)} roll={-1.5} />;
  }
  const porte = i === 1 ? interpolate(f, [R('fermes', 45) - 4, R('éclair', 72) + 8], [0.75, 0], ease) : 0;
  const cams = [null, () => vise([70, -60, 8.5 - 0.05 * k], [0, 150, TENTE.z0]), () => vise([0, -330, 8.12 + 0.08 * k], [0, SOL - 140, 8.95])];
  const cam = makeCam(cams[i]());
  const deco = tenteInt(cam, fg, {lampe: 1, porte});
  const items = sacs(cam, fg, deco, {lucas: {ronfle: 0.3 + 0.3 * Math.sin(fg / 9)}, hugo: {}});
  if (i === 2) items.push(moiAssis(cam, deco, 'te2', {dos: true}));
  return <Plan f={fg} cam={cam} decor={deco} items={items} noir={0.03} zoom={doux(t)} roll={[0, 1, -1][i]} />;
});

// 3. Dehors, la voix de Lucas : « Hé, viens voir. J'ai trouvé un truc. »
const SILS = [{x: -350, y: -80, z: 8.6}, {x: 0, y: -160, z: 8.55}, {x: 350, y: -80, z: 8.6}];
const Appel = scene('appel', ({f, fg, i, t, d}) => {
  const k = lisse(t, d);
  if (i === 0) {
    // vu de la forêt, entre les arbres : la tente éclairée au loin (comme si quelqu'un l'observait)
    const cam = makeCam(vise([-2500 + 400 * k, -420 + tremble(fg, 6, 'ap'), 11.8 - 0.5 * k], [0, -150, 8.6]));
    const decor = clairiere(cam, fg, {feu: 0, braises: 0.25, lumiereTente: 1, silhouettes: SILS});
    return <Plan f={fg} cam={cam} decor={decor} items={[]} noir={0.05} zoom={doux(t)} roll={Math.sin(fg / 20) * 1.5} />;
  }
  const cam = makeCam(faceMoi(t, d, {dist: 0.55, dx: 40}));
  const deco = tenteInt(cam, fg, {lampe: 1});
  const items = sacs(cam, fg, deco, {lucas: {ronfle: 0.3}}).concat([moiAssis(cam, deco, 'ap1', {eyes: 1.35, worry: 1, pupilX: -10, pupilY: 2, breath: 0})]);
  return <Plan f={fg} cam={cam} decor={deco} items={items} noir={0.03} zoom={doux(t)} roll={-1} />;
});

// 4. Tu te retournes. Lucas dort à côté de toi. Il ronfle.
const Lucas = scene('lucas', ({f, fg, i, t, d}) => {
  const k = lisse(t, d);
  const cams = [() => faceMoi(t, d, {dist: 0.5, dx: -60}), () => vise([PL.x + 40, SOL - 620 + 60 * k, 8.72], [PL.x, SOL - 70, PL.z + 0.02])];
  const cam = makeCam(cams[i]());
  const deco = tenteInt(cam, fg, {lampe: 1});
  const ron = Math.max(0, Math.sin(fg / 7));
  const items = sacs(cam, fg, deco, {lucas: {ronfle: ron}});
  if (i === 0) items.push(moiAssis(cam, deco, 'lu0', {eyes: 1.3, worry: 1, pupilX: interpolate(t, [0, 10], [-10, 10], clamp), breath: 0}));
  return <Plan f={fg} cam={cam} decor={deco} items={items} noir={0.03} zoom={i === 1 ? 1.0 + 0.06 * k : doux(t)} roll={[1, 0][i]} />;
});

// 5. Dehors, la voix recommence. Plus près. « Allez, sors. »
const Voix = scene('voix', ({f, fg, i, t, d}) => {
  const k = lisse(t, d);
  if (i === 1) {
    const cam = makeCam(vise([-2400 + 300 * k, 180, 11.6 - 0.4 * k], [0, -300, 8.6]));
    const decor = clairiere(cam, fg, {feu: 0, braises: 0.2, lumiereTente: 1, silhouettes: SILS});
    return <Plan f={fg} cam={cam} decor={decor} items={[]} noir={0.06} zoom={doux(t)} roll={-2} />;
  }
  const cams = [() => vise([40, -150, 8.75 - 0.15 * k], [0, 0, TENTE.z0]), null, () => faceMoi(t, d, {dist: 0.45, dx: 30})];
  const cam = makeCam(cams[i]());
  const deco = tenteInt(cam, fg, {lampe: 1});
  const items = sacs(cam, fg, deco, {lucas: {ronfle: 0.2}});
  if (i === 2) items.push(moiAssis(cam, deco, 'vo2', {eyes: 1.45, worry: 1, sweat: 1, pupilX: 0, breath: 0, shiver: tremble(fg, 3, 'vo')}));
  const frisson = i === 0 ? tremble(fg, 0.6, 'fr') : 0;
  return <Plan f={fg} cam={cam} decor={deco} items={items} noir={0.03} zoom={doux(t) + Math.abs(frisson) * 0.01} roll={frisson} />;
});

// 6. Ta lampe grésille. Sur la toile, une ombre. Quelqu'un attend devant l'entrée.
const lampeOmbre = (f, R) => (f > R('grésille', 16) - 4 ? (random(`lg${Math.floor(f / 2)}`) > 0.55 ? 0.25 : 0.7) : 1);
const Ombre = scene('ombre', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const lampe = lampeOmbre(f, R);
  const ombre = interpolate(f, [R('toile', 47), R('ombre', 72)], [0, 1], ease);
  const cams = [() => vise([120, -120, 8.3], [0, -420, 8.62]), () => vise([60, -170, 8.9 - 0.2 * k], [0, -150, TENTE.z0]), () => vise([90, -230, 9.1], [0, -120, TENTE.z0])];
  const cam = makeCam(cams[i]());
  const deco = tenteInt(cam, fg, {lampe, ombre});
  const items = sacs(cam, fg, deco, {lucas: {}, hugo: {}});
  if (i === 2) items.push(moiAssis(cam, deco, 'om2', {dos: true}));
  return <Plan f={fg} cam={cam} decor={deco} items={items} noir={0.03} zoom={doux(t)} roll={[2, 0, -1][i]} />;
});

// 7. Tu secoues Lucas. Rien. Tu secoues Hugo. Rien. Impossible de les réveiller.
const Secoue = scene('secoue', ({f, fg, i, t, d}) => {
  const k = lisse(t, d);
  const lampe = 0.6 + 0.2 * Math.sin(fg / 5);
  const cams = [
    () => vise([PL.x + 60, SOL - 640, 8.7], [PL.x, SOL - 70, PL.z + 0.02]),
    () => vise([PH.x - 60, SOL - 640, 8.7], [PH.x, SOL - 70, PH.z + 0.02]),
    () => vise([0, -380, 8.1 + 0.08 * k], [0, SOL - 160, 8.95]),
  ];
  const cam = makeCam(cams[i]());
  const deco = tenteInt(cam, fg, {lampe, ombre: 0.8});
  const items = sacs(cam, fg, deco, {lucas: {secoue: i === 0 ? 1 : 0}, hugo: {secoue: i === 1 ? 1 : 0}});
  if (i === 2) items.push(moiAssis(cam, deco, 'se2', {eyes: 1.45, worry: 1, sweat: 1, scream: 0.3, shiver: tremble(fg, 6, 'se'), epauleG: 35, coudeG: 100, epauleD: -35, coudeD: -100}));
  return <Plan f={fg} cam={cam} decor={deco} items={items} noir={0.04} zoom={doux(t)} roll={[tremble(fg, 2, 'r1'), tremble(fg, 2, 'r2'), 0][i]} />;
});

// 8. La fermeture éclair commence à s'ouvrir. Toute seule. Lentement.
const porteDe = (fg) => interpolate(fg, [START.fermeture + repere('fermeture', 'commence', 38), START.fermeture + timeline.scenes.find((s) => s.nom === 'fermeture').frames], [0, 0.5], clamp);
const Fermeture = scene('fermeture', ({f, fg, i, t, d}) => {
  const k = lisse(t, d);
  const cams = [() => vise([30, -40, 8.32 - 0.03 * k], [0, 230, TENTE.z0]), () => vise([120, -260, 9.12], [0, 0, TENTE.z0])];
  const cam = makeCam(cams[i]());
  const deco = tenteInt(cam, fg, {lampe: 0.7, ombre: 0.6, porte: porteDe(fg)});
  const items = sacs(cam, fg, deco, {});
  if (i === 1) items.push(moiAssis(cam, deco, 'fm1', {dos: true, shiver: tremble(fg, 3, 'fm')}));
  return <Plan f={fg} cam={cam} decor={deco} items={items} noir={0.04} zoom={i === 0 ? 1.0 + 0.08 * k : doux(t)} roll={[0, -1][i]} />;
});

// 9. Message de Lucas : « T'es où ? Avec Hugo on est partis chercher du bois. On revient. »
const MSG = 'T’es où ? Avec Hugo on est partis chercher du bois. On revient.';
const Message = scene('message', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const cam = makeCam(faceMoi(t, d, {dist: 0.55, dx: -50, dy: 40}));
  const deco = tenteInt(cam, fg, {lampe: 0.45, ombre: 0.5, porte: porteDe(START.message)});
  const items = sacs(cam, fg, deco, {}).concat([moiAssis(cam, deco, 'me', {eyes: 1.3, worry: 1, pupilY: 8, teinte: [0.8, 0.9, 1.2]})]);
  const tel = i === 0 ? (
    <Telephone f={f} verrouille heure="03:07" date="dimanche 27 octobre" barres={1} nom="Lucas" initiale="L" notif={{debut: R('message', 35), texte: 'T’es où ?'}} echelle={1.15} y={1000} vibre={interpolate(f, [R('vibre', 14) - 6, R('vibre', 14) + 20], [1, 0], clamp)} />
  ) : (
    <Telephone f={f} heure="03:07" barres={1} nom="Lucas" initiale="L" messages={[{debut: R('tes', 67), texte: MSG, gras: true}]} echelle={1.3 + 0.35 * k} y={960 - (1.3 + 0.35 * k) * 330} />
  );
  return <Plan f={fg} cam={cam} decor={deco} items={items} noir={0.05} zoom={1} dessus={<g><rect width="1080" height="1920" fill="#000" opacity="0.5" />{tel}</g>} />;
});

// écran partagé : Lucas en haut, Hugo en bas, chacun en gros plan (vu d'au-dessus)
const Partage = ({fg, t, d, lampe, porte, etat, flash = 0, secousse = 0}) => {
  const k = lisse(t, d);
  const vue = (P, id) => {
    const cam = makeCam(vise([P.x + tremble(fg, secousse, `pa${id}`), SOL - 560 + 60 * k, 8.72], [P.x, SOL - 70, P.z + 0.03]));
    const deco = tenteInt(cam, fg, {lampe, porte});
    const items = sacs(cam, fg, deco, {lucas: etat, hugo: etat, moi: false});
    return <Plan f={fg} cam={cam} decor={deco} items={items} noir={0.04} zoom={1.25 + 0.08 * k} roll={0} />;
  };
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{clipPath: 'inset(420px 0 540px 0)', transform: 'translateY(-420px)'}}>{vue(PL, 'l')}</AbsoluteFill>
      <AbsoluteFill style={{clipPath: 'inset(420px 0 540px 0)', transform: 'translateY(540px)'}}>{vue(PH, 'h')}</AbsoluteFill>
      <div style={{position: 'absolute', left: 0, top: 955, width: 1080, height: 10, background: '#000'}} />
      <AbsoluteFill style={{background: '#fff', opacity: flash}} />
    </AbsoluteFill>
  );
};

// 10. Les deux ouvrent les yeux. En même temps.
const Yeux = scene('yeux', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const o = interpolate(f, [R('ouvrent', 54) - 2, R('ouvrent', 54) + 1], [0, 1.25], clamp);
  const cams = [() => vise([0, -160 + 40 * k, 8.35 + 0.1 * k], [0, SOL - 80, 9.0]), () => vise([tremble(fg, 12 * (1 - k), 'ye'), SOL - 420, 8.78], [0, SOL - 75, 9.03])];
  const cam = makeCam(cams[i]());
  const deco = tenteInt(cam, fg, {lampe: 0.5 + (i === 1 ? 0.4 * (1 - k) : 0), ombre: 0.5, porte: porteDe(START.message)});
  const regard = [6, -14];
  const items = sacs(cam, fg, deco, {lucas: {yeux: o, regard: [14, -12]}, hugo: {yeux: o, regard: [-14, -12]}, moi: false});
  const flash = i === 1 ? interpolate(f, [R('ouvrent', 54) - 1, R('ouvrent', 54) + 1, R('ouvrent', 54) + 8], [0, 0.6, 0], clamp) : 0;
  if (i === 1) return <Partage fg={fg} t={t} d={d} lampe={0.6} porte={porteDe(START.message)} etat={{yeux: o, regard: [0, -12]}} flash={flash} secousse={f > R('ouvrent', 54) ? 14 * Math.max(0, 1 - (f - R('ouvrent', 54)) / 12) : 0} />;
  return <Plan f={fg} cam={cam} decor={deco} items={items} noir={0.04} zoom={i === 1 ? 1.05 + 0.08 * k : 1.0 + 0.05 * k} roll={i === 1 ? tremble(fg, 2, 'yr') : 0} dessus={<rect width="1080" height="1920" fill="#fff" opacity={flash} />} />;
  // (regard inutilisé : les pupilles fixent la caméra, légèrement vers le haut)
});

// 11. Ils te sourient, beaucoup trop large. Dehors, la vraie voix de Lucas : « Mec, sors de la tente ! »
const TORCHE = {x: 1500, z: 13.5};
const Sourire = scene('sourire', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const grin = interpolate(f, [R('sourient', 12), R('large', 45) + 6], [0, 1], ease);
  if (i === 1) {
    // dehors, au loin : la lampe torche des vrais potes, les bras chargés de bois
    const cam = makeCam(vise([300, -420, 6.6 + 0.4 * k], [TORCHE.x - 400, -250, TORCHE.z]));
    const decor = clairiere(cam, fg, {feu: 0, braises: 0.15, lumiereTente: 0.5, torche: {x: TORCHE.x, z: TORCHE.z - 0.5 * k}});
    const m = marche(fg, 0.3, 0.7);
    const items = [
      {z: TORCHE.z - 0.5 * k, x: TORCHE.x - 250, el: <Perso cam={cam} id="vl" x={TORCHE.x - 250} z={TORCHE.z - 0.5 * k} lum={0.7} teinte={[1.1, 1.05, 0.95]} couleurs={{chev: LUCAS.chev, haut: '#3a5ab8', hautO: '#2a4a98'}} lift={m.bob} legG={m.legG} legD={m.legD} epauleD={-150} coudeD={-20} scream={0.4} />},
      {z: TORCHE.z + 0.3 - 0.5 * k, x: TORCHE.x + 300, el: <Perso cam={cam} id="vh" x={TORCHE.x + 300} z={TORCHE.z + 0.3 - 0.5 * k} lum={0.55} teinte={[1.05, 1, 0.95]} couleurs={{chev: HUGO.chev, haut: '#2a8a4a', hautO: '#207038'}} lift={m.bob} legG={m.legD} legD={m.legG} epauleG={35} coudeG={100} epauleD={-35} coudeD={-100} />},
    ];
    return <Plan f={fg} cam={cam} decor={decor} items={items} noir={0.06} zoom={doux(t)} roll={1.5} />;
  }
  if (i === 0) return <Partage fg={fg} t={t} d={d} lampe={0.5} porte={0.55} etat={{yeux: 1.25, grin, regard: [0, -10]}} />;
  const cams = [null, null, () => vise([380, -300, 9.15], [-60, -60, TENTE.z0])];
  const cam = makeCam(cams[i]());
  const deco = tenteInt(cam, fg, {lampe: 0.5, ombre: 0, porte: 0.55, torche: i === 2 ? 1 : 0});
  const items = sacs(cam, fg, deco, {lucas: {yeux: 1.25, grin, regard: [14, -8], tourne: 18 * grin}, hugo: {yeux: 1.25, grin, regard: [-14, -8], tourne: -18 * grin}, moi: i !== 0});
  if (i === 2) items.push(moiAssis(cam, deco, 'so2', {dos: false, eyes: 1.5, worry: 1, sweat: 1, scream: 0.4, pupilX: -10, shiver: tremble(fg, 5, 'so')}));
  return <Plan f={fg} cam={cam} decor={deco} items={items} noir={0.04} zoom={i === 0 ? 1.0 + 0.06 * k : doux(t)} roll={[0, 0, -2][i]} />;
});

// 12. Tu sors dans le noir, vers sa voix ? Ou tu restes dans la tente, avec eux ?
const Dilemme = scene('dilemme', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const cams = [() => vise([40, -60, 8.45 - 0.1 * k], [0, -60, TENTE.z0]), () => vise([-430 + 100 * k, -560, 9.15], [60, SOL - 150, 8.3])];
  const cam = makeCam(cams[i]());
  const deco = tenteInt(cam, fg, {lampe: 0.45 + 0.1 * Math.sin(fg / 6), porte: 0.6, torche: 1});
  const items = sacs(cam, fg, deco, {lucas: {yeux: 1.25, grin: 1, regard: [14, -8], tourne: 18}, hugo: {yeux: 1.25, grin: 1, regard: [-14, -8], tourne: -18}});
  if (i === 1) items.push(moiAssis(cam, deco, 'di1', {eyes: 1.4, worry: 1, sweat: 1, pupilX: Math.sin(fg / 10) * 10}));
  const dis = R('dis-le', 119);
  return (
    <Plan f={fg} cam={cam} decor={deco} items={items} noir={0.04} zoom={doux(t)} roll={[0, 1][i]}
      dessus={
        <g>
          <Choix f={f} debut={R('sors', 6)} x={540} y={250} texte="JE SORS" emoji="1f332" couleur="#3ad86a" />
          <Choix f={f} debut={R('restes', 68)} x={540} y={450} texte="JE RESTE" emoji="26fa" couleur="#ff3a4a" />
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

const COMPOSANTS = {feu: Feu, tente: Tente, appel: Appel, lucas: Lucas, voix: Voix, ombre: Ombre, secoue: Secoue, fermeture: Fermeture, message: Message, yeux: Yeux, sourire: Sourire, dilemme: Dilemme};
export const LaTente = () => (
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
