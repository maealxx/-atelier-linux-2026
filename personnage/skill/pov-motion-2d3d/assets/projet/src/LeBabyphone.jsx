import {AbsoluteFill, Easing, interpolate, random, Series, spring, staticFile, useCurrentFrame} from 'remotion';
import {appart, FENETRE} from './Appart';
import {halo, tache} from './Gare';
import {Choix} from './Livreur';
import {plaque} from './Lycee';
import {jardin} from './Maison';
import {camFace, montage, Plan, punch} from './montage';
import {clamp, makeCam, marche, Perso} from './moteur';
import {SOL} from './Rue';
import {CAMERA_B, chambreEnfant, eclair, escalierMaison, ESC_M, hautEsc, LIT_E, Pluie, TRAPPE, ySolEsc} from './Enfant';
import {BabyReel, haptique, Tel, TelReel, TH, TW, VisionNocturne} from './TelReel';
import PLANS from './babyphone/plans.json';
import timeline from './babyphone/timeline.json';

// « Le babyphone » : tu gardes Léna. La mère t'envoie cinq messages : ne rentre JAMAIS dans le grenier.
// Dans le babyphone, Léna chuchote avec quelqu'un. La caméra pivote toute seule vers la trappe, ouverte.
// Puis la mère : Léna dort chez sa mamie ce soir. Alors qui est dans le lit ?
const {decoupe, repere, SCENES} = montage(timeline, PLANS);
export const DUREE_BABYPHONE = SCENES.reduce((t, [, d]) => t + d, 0);
const START = {};
SCENES.reduce((t, [nom, d]) => {
  START[nom] = t;
  return t + d;
}, 0);
const G = (nom, mot, def) => START[nom] + repere(nom, mot, def); // repère global

const deg = (r) => (r * 180) / Math.PI;
const vise = (p, c, extra = {}) => {
  const dx = c[0] - p[0];
  const dy = c[1] - p[1];
  const dz = (c[2] - p[2]) * 1000;
  return {x: p[0], y: p[1], z: p[2], yaw: deg(Math.atan2(dx, dz)), pitch: deg(Math.atan2(dy, Math.hypot(dx, dz))), ...extra};
};
const EZ = Easing.bezier(0.45, 0, 0.55, 1); // doux, sans à-coup
const lisse = (t, d) => EZ(Math.min(1, Math.max(0, t / Math.max(1, d))));
const doux = (t) => punch(t, 0.03);
const ease = (f, a, b) => interpolate(f, [a, b], [0, 1], {...clamp, easing: EZ});
const tremble = (f, k, cle) => k * (random(`${cle}${f}`) - 0.5);
const PLAN = {grain: 0.025, vignette: 0.75};
const TV_T = [0.72, 0.84, 1.16];
const NUIT_T = [0.95, 0.82, 0.98];

// ----- le téléphone : les cinq messages de la mère, puis le sixième -----
const BUZZ = [20, 48, 70, 84, 98];
const TEXTES = ['Tu es là ?', 'Réponds stp', 'C’est urgent', 'Léna est couchée ?', 'Surtout, ne rentre JAMAIS dans le grenier.'];
const NOTIFS = BUZZ.map((t, k) => ({t, titre: 'Maman de Léna', texte: TEXTES[k]}));
const MSGS = BUZZ.map((t, k) => ({t: t - 400, texte: TEXTES[k], alerte: k === 4}));
const T6 = G('message', 'on', 66);
const MSG6 = {t: T6, texte: 'On a oublié de te dire. Léna dort chez sa mamie ce soir.', alerte: true};

// ----- l'orage dans la fenêtre du salon (pluie + éclair), à poser dans le décor -----
const orageSalon = (cam, fg) => {
  const p = cam.poly([[FENETRE.x + 3, FENETRE.y0, FENETRE.z0], [FENETRE.x + 3, FENETRE.y0, FENETRE.z1], [FENETRE.x + 3, FENETRE.y1, FENETRE.z1], [FENETRE.x + 3, FENETRE.y1, FENETRE.z0]]);
  if (!p || cam.x < FENETRE.x) return null;
  const e = eclair(fg);
  return {z: 2.9, x: FENETRE.x + 5, y: -170, el: <g key="orage"><defs><clipPath id="bp-fen"><polygon points={p} /></clipPath></defs><g clipPath="url(#bp-fen)"><rect width="1080" height="1920" fill="#060a18" opacity="0.75" /><rect width="1080" height="1920" fill="#d8e4ff" opacity={0.9 * e} /><Pluie f={fg} id="pls" force={0.9} /></g></g>};
};
const flashEclair = (fg, k = 0.35) => <rect width="1080" height="1920" fill="#c8d8ff" opacity={k * eclair(fg)} />;
const salon = (cam, fg, extra = {}) => appart(cam, fg, {tv: 1, lampes: 0.22, ...extra});
// lui assis sur le canapé (coupé au-dessus de l'assise)
const ASSIS = {x: -400, z: 3.5, y: 580, coupe: 248};
const moiCanape = (cam, id, pose) => {
  if (!cam.visible(ASSIS.z, ASSIS.x, ASSIS.coupe)) return {z: ASSIS.z, x: ASSIS.x, el: null};
  const yc = cam.proj(ASSIS.x, ASSIS.coupe, ASSIS.z)[1];
  const clip = `-2000,-4000 3080,-4000 3080,${yc} -2000,${yc}`;
  return {z: ASSIS.z, x: ASSIS.x, el: (
    <g key={id}>
      <defs><clipPath id={`cl${id}`}><polygon points={clip} /></clipPath></defs>
      <g clipPath={`url(#cl${id})`}><Perso cam={cam} id={id} x={ASSIS.x} z={ASSIS.z} y={ASSIS.y} ombre={0} lum={0.62} teinte={TV_T} {...pose} /></g>
    </g>
  )};
};
const visageCanape = (t, d, o = {}) => camFace(ASSIS.x, ASSIS.z, -1, o.dist || 0.55, t, d, {dx: o.dx || 0, dy: 161 + (o.dy || 0), push: o.push ?? 0.08});
// arrière-plan flouté (profondeur de champ) derrière un objet tenu en main
const Flou = ({children, k = 7, lum = 0.7}) => <AbsoluteFill style={{filter: `blur(${k}px) brightness(${lum})`}}>{children}</AbsoluteFill>;

// ----- le flux de la caméra du babyphone (vue de la chambre en vision nocturne) -----
const vueChambre = (cam, fg, opts) => {
  const d = chambreEnfant(cam, fg, opts);
  const items = d.items.filter((o) => o && o.el).sort((a, b) => cam.profondeur(b.z, b.x ?? cam.x, b.y ?? cam.y) - cam.profondeur(a.z, a.x ?? cam.x, a.y ?? cam.y));
  return (
    <g>
      {d.fond}
      {items.map((o, k) => <g key={k}>{o.el}</g>)}
    </g>
  );
};
const CAM_B = [CAMERA_B.x - 180, CAMERA_B.y - 40, CAMERA_B.z];
// panoramique de la caméra : 0 = le lit, 1 = la trappe
const visee = (u) => {
  const a = [0, 110, 4.7];
  const b = [0, -1020, TRAPPE.z0 + 0.45];
  return a.map((v, i) => v + (b[i] - v) * u);
};
const flux = (fg, {u = 0, lena = {visible: true}, trappe = 0, yeux = 0, couette = {}, plein = false, parasites = 0, id = 'nv'}) => {
  const cam = makeCam(vise(CAM_B, visee(u)));
  return (
    <VisionNocturne f={fg} id={id} plein={plein} parasites={parasites} heure="23:14">
      {vueChambre(cam, fg, {veilleuse: 0.55, trappe, yeux, lena, couette, porte: 0})}
    </VisionNocturne>
  );
};

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

// 1. Ton tel vibre. Encore. Et encore. Cinq messages : « Surtout, ne rentre JAMAIS dans le grenier. »
const PT = {x: 350, y: 258, z: 3.47}; // le téléphone posé sur la table basse
const TelSurTable = ({cam, fg}) => {
  const h = haptique(fg, BUZZ, 1.2);
  const ang = (12 * Math.PI) / 180;
  const ax = [Math.cos(ang), 0, Math.sin(ang)];
  const ay = [Math.sin(ang), 0, -Math.cos(ang)];
  const w = 64;
  const hh = (64 * TH) / TW;
  const cx = PT.x + h.dx * 0.6;
  const P0 = [cx - (ax[0] * w) / 2 - (ay[0] * hh) / 2, PT.y, PT.z - ((ax[2] * w) / 2 + (ay[2] * hh) / 2) / 1000];
  const allume = fg >= BUZZ[0] ? 1 : 0;
  return (
    <g>
      {tache(cam, PT.x, PT.y - 1, PT.z, 260, 0.34, 'ga-froid', 0.65 * allume, 'lueur')}
      {plaque(cam, [P0[0] + 4, PT.y - 0.5, P0[2] - 0.004], ax, ay, w, hh, <rect width={w} height={hh} rx="10" fill="#000" opacity="0.5" />, 'ombre')}
      {plaque(cam, P0, ax, ay, w, hh, <g transform={`scale(${w / TW})`}><Tel f={fg} ecran={allume ? 'lock' : 'off'} notifs={NOTIFS} heure="23:02" reflet={0.4} /></g>, 'tel')}
    </g>
  );
};
const Alerte = scene('alerte', ({f, fg, i, t, d, bornes, R}) => {
  const k = lisse(t, d);
  if (i === 0) {
    // gros plan : le téléphone sur la table basse, l'écran s'allume, il vibre à chaque message
    const cam = makeCam(vise([430 - 30 * k, 110 + 10 * k, 3.3 + 0.03 * k], [350, 262, 3.48]));
    const decor = salon(cam, fg);
    const items = [{z: 3.05, x: PT.x, y: 255, el: <TelSurTable cam={cam} fg={fg} />}, orageSalon(cam, fg)].filter(Boolean);
    return <Plan {...PLAN} f={fg} cam={cam} decor={decor} items={items} noir={0.08} zoom={1.12 + 0.06 * k} roll={-2} dessus={flashEclair(fg, 0.3)} />;
  }
  // il le prend : le téléphone monte vers nous en se redressant, puis on touche la notification
  const camF = makeCam(vise([-420, -60, 2.3], [600, -150, 4.2]));
  const fond = (
    <Flou k={8} lum={0.6}>
      <Plan {...PLAN} f={fg} cam={camF} decor={salon(camF, fg)} items={[orageSalon(camF, fg)].filter(Boolean)} noir={0.1} />
    </Flou>
  );
  const prise = ease(f, bornes[1], bornes[1] + 20);
  const s = i === 1 ? 1.35 : 1.5 + 0.12 * k;
  const pose = i === 1
    ? {x: 540, y: interpolate(prise, [0, 1], [2300, 1000]), rx: interpolate(prise, [0, 1], [58, 6]), ry: -6 + 3 * Math.sin(f / 30), rz: interpolate(prise, [0, 1], [14, -2]), s}
    : {x: 540, y: 980, rx: 4, ry: -4 + 2 * Math.sin(f / 30), rz: -1.5, s};
  const tap = R('cest', 144);
  const zoomConv = i === 2 ? 0.22 * ease(f, R('surtout', 199) - 6, R('grenier', 240)) : 0;
  return (
    <AbsoluteFill>
      {fond}
      <TelReel f={fg} pose={pose} vib={[]} notifs={NOTIFS} messages={MSGS} tap={START.alerte + tap} heure="23:02" zoomConv={zoomConv} appui={ease(f, tap - 8, tap) * (1 - ease(f, tap + 2, tap + 10))} lueur={0.55} />
      {flashEclair(fg, 0.2)}
    </AbsoluteFill>
  );
});

// 2. Seul dans une immense maison. Tu couches Léna, tu allumes la veilleuse, tu prends le babyphone.
const PL_LIT = {x: -640, z: 3.95};
const Dodo = scene('dodo', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  if (i === 0) {
    // la maison sous l'orage, vue du jardin, un éclair la découpe
    const cam = makeCam(vise([500 - 250 * k, 250 - 120 * k, 3.6 + 0.8 * k], [0, -2300, 10]));
    const decor = jardin(cam, fg, {fenetre: (j) => (j === 3 ? 1 : j === 6 ? 0.6 : 0.12), lampadaire: 0.5});
    const e = eclair(fg);
    return (
      <Plan {...PLAN} f={fg} cam={cam} decor={decor} items={[]} noir={0.35 - 0.3 * e} zoom={doux(t)} roll={1}
        dessus={<g><rect width="1080" height="1920" fill="#0a1430" opacity="0.35" /><rect width="1080" height="1920" fill="#d8e4ff" opacity={0.55 * e} /><Pluie f={fg} id="plj" force={1} /></g>} />
    );
  }
  const veil = ease(f, R('allumes', 90), R('allumes', 90) + 14);
  const cams = [null, () => vise([700 - 100 * k, -520, 1.0 + 0.25 * k], [-250, 20, 4.3]), () => vise([-250, -420, 4.95], [1000, -230, 1.3])];
  const cam = makeCam(cams[i]());
  const decor = chambreEnfant(cam, fg, {veilleuse: i === 1 ? veil : 1, porte: 1, lena: {visible: true}});
  const items = [];
  if (i === 1) {
    const borde = Math.sin(Math.min(1, t / 30) * Math.PI);
    items.push({z: PL_LIT.z, x: PL_LIT.x, el: <Perso cam={cam} id="do1" x={PL_LIT.x} z={PL_LIT.z} lum={0.45 + 0.4 * veil} teinte={NUIT_T} dos={false} smile={0.5} epauleD={-40 - 30 * borde} coudeD={-40} pupilX={8} />});
  } else {
    const xp = interpolate(t, [0, d], [-300, 900], {...clamp, easing: EZ});
    const zp = interpolate(t, [0, d], [3.3, 1.6], {...clamp, easing: EZ});
    const m = marche(fg, 0.3, 0.8);
    items.push({z: zp, x: xp, el: <Perso cam={cam} id="do2" x={xp} z={zp} lum={0.7} teinte={NUIT_T} dos lift={m.bob} legG={m.legG} legD={m.legD} epauleD={-20} coudeD={-90} />});
  }
  return <Plan {...PLAN} f={fg} cam={cam} decor={decor} items={items} noir={0.04} zoom={doux(t)} roll={[0, 1.5, -1][i]} dessus={flashEclair(fg, 0.15)} />;
});

// 3. Vingt-trois heures, sur le canapé. Dans le babyphone, Léna chuchote.
const niveauVoix = (f, a, b) => (f > a && f < b ? 0.35 + 0.45 * Math.abs(Math.sin(f / 2.7) * Math.sin(f / 6.1)) : 0.05);
const Canape = scene('canape', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  if (i === 0) {
    const cam = makeCam(vise([950 - 100 * k, -430, 1.15 + 0.15 * k], [-420, -80, 3.6]));
    const decor = salon(cam, fg);
    return <Plan {...PLAN} f={fg} cam={cam} decor={decor} items={[moiCanape(cam, 'ca0', {pupilX: 8, breath: Math.sin(fg / 8) * 3}), orageSalon(cam, fg)].filter(Boolean)} noir={0.06} zoom={doux(t)} roll={-1} />;
  }
  const camF = makeCam(vise([-420, -60, 2.3], [600, -150, 4.2]));
  return (
    <AbsoluteFill>
      <Flou k={8} lum={0.55}><Plan {...PLAN} f={fg} cam={camF} decor={salon(camF, fg)} items={[]} noir={0.1} /></Flou>
      <BabyReel f={fg} pose={{x: 540, y: 1000 + 30 * (1 - k), rx: 8, ry: 6 + 3 * Math.sin(f / 25), rz: 2, s: 1.45 + 0.1 * k}} niveau={niveauVoix(f, R('entends', 96) - 6, d + 10)} flux={flux(fg, {u: 0, lena: {visible: true}, id: 'nv1'})} lueur={0.45} />
    </AbsoluteFill>
  );
});

// 4. Elle parle avec quelqu'un. Elle rigole. « Chut, elle va t'entendre. »
const Chuchote = scene('chuchote', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  if (i === 0) {
    const cam = makeCam(visageCanape(t, d, {dx: 40}));
    const decor = salon(cam, fg);
    return (
      <Plan {...PLAN} f={fg} cam={cam} decor={decor} items={[moiCanape(cam, 'ch0', {eyes: 1.35, worry: 1, pupilY: 6, breath: 0, teinte: [0.72, 1.0, 0.85]})]} noir={0.05} zoom={doux(t)} roll={1}
        dessus={<rect width="1080" height="1920" fill="#2aff8a" opacity={0.05 + 0.04 * Math.sin(f / 3)} />} />
    );
  }
  // plein écran sur la caméra : Léna, les yeux ouverts, qui regarde le plafond… puis la caméra
  const regarde = ease(f, R('tentendre', 115) - 4, R('tentendre', 115) + 6);
  const regard = [interpolate(regarde, [0, 1], [0, 18]), interpolate(regarde, [0, 1], [-14, -4])];
  const camB = makeCam(vise([260 - 40 * k, -210 + 20 * k, 4.6], [0, 112, 5.0]));
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <g transform={`translate(540 960) scale(${1.25 + 0.15 * k}) translate(-540 -960)`}>
          <VisionNocturne f={fg} id="nv2" plein heure="23:14">{vueChambre(camB, fg, {veilleuse: 0.55, lena: {visible: true, yeux: 1.1, regard, tourne: 12 * regarde}})}</VisionNocturne>
        </g>
      </svg>
    </AbsoluteFill>
  );
});

// 5. Tu montes l'escalier en courant. Tu ouvres la porte. Léna dort. Toute seule.
const Escalier = scene('escalier', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  if (i < 2) {
    const zp = i === 0 ? interpolate(t, [0, d], [0.35, 3.1], {...clamp, easing: EZ}) : 5.05;
    const m = marche(fg, 0.75, i === 0 ? 1.2 : 0);
    const porte = i === 1 ? ease(f, R('ouvres', 43), R('ouvres', 43) + 14) : 0;
    const YH = SOL - ESC_M.n * ESC_M.marche;
    const cams = [
      () => vise([160, ySolEsc(zp - 1.1) - 380, zp - 1.15], [0, ySolEsc(zp + 1.6) - 520, zp + 1.6]),
      () => vise([170 - 40 * k, YH - 520, 4.05 + 0.2 * k], [0, YH - 420, 6.0]),
    ];
    const cam = makeCam(cams[i]());
    const decor = escalierMaison(cam, fg, {porte});
    const y = zp < hautEsc ? ySolEsc(zp) : YH;
    const items = [{z: zp, x: 0, el: <Perso cam={cam} id={`es${i}`} x={0} z={zp} y={y} dos lum={0.75} teinte={[1.05, 0.88, 0.8]} lift={m.bob * 2} legG={m.legG} legD={m.legD} epauleG={14 + m.bras * 3} coudeG={80} epauleD={-14 + m.bras * 3} coudeD={-80} />}];
    return <Plan {...PLAN} f={fg} cam={cam} decor={decor} items={items} noir={0.04} zoom={doux(t)} roll={[1.5, 0][i]} dessus={flashEclair(fg, 0.12)} />;
  }
  // Léna dort, paisible, sous les étoiles
  const cam = makeCam(vise([25, -40 + 20 * k, 4.62 + 0.03 * k], [0, 118, LIT_E.z1 - 0.1]));
  const decor = chambreEnfant(cam, fg, {veilleuse: 1, lena: {visible: true}});
  return <Plan {...PLAN} f={fg} cam={cam} decor={decor} items={[]} noir={0.03} zoom={1.05 + 0.04 * k} roll={0} />;
});

// 6. Le babyphone grésille. Une voix d'homme, très basse, murmure ton prénom.
const Voix = scene('voix', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  if (i === 0) {
    const cam = makeCam(vise([650 - 60 * k, -330, 3.35], [-420, -60, 3.55]));
    const decor = salon(cam, fg);
    return <Plan {...PLAN} f={fg} cam={cam} decor={decor} items={[moiCanape(cam, 'vo0', {eyes: 1.1, worry: 0.6, pupilY: 8, epauleD: -30, coudeD: -90}), orageSalon(cam, fg)].filter(Boolean)} noir={0.06} zoom={doux(t)} roll={0} />;
  }
  if (i === 1) {
    const camF = makeCam(vise([-420, -60, 2.3], [600, -150, 4.2]));
    const gr = ease(f, R('grésille', 44) - 4, R('grésille', 44) + 4);
    return (
      <AbsoluteFill>
        <Flou k={8} lum={0.5}><Plan {...PLAN} f={fg} cam={camF} decor={salon(camF, fg)} items={[]} noir={0.1} /></Flou>
        <BabyReel f={fg} pose={{x: 540 + tremble(fg, 6 * gr, 'bv'), y: 980, rx: 6, ry: -6, rz: -2, s: 1.6 + 0.12 * k}} niveau={gr > 0.5 ? 0.9 + 0.1 * Math.sin(f) : 0.1} alerte={gr} grain={gr} flux={flux(fg, {u: 0, parasites: gr, id: 'nv3'})} lueur={0.5} />
      </AbsoluteFill>
    );
  }
  const cam = makeCam(visageCanape(t, d, {dist: 0.4, dx: -30, push: 0.12}));
  const decor = salon(cam, fg);
  return <Plan {...PLAN} f={fg} cam={cam} decor={decor} items={[moiCanape(cam, 'vo2', {eyes: 1.5, worry: 1, sweat: 1, pupilX: -6, breath: 0, shiver: tremble(fg, 3, 'vs'), teinte: [0.7, 1.0, 0.82]})]} noir={0.05} zoom={1.0 + 0.06 * k} roll={-1} dessus={<rect width="1080" height="1920" fill="#2aff8a" opacity="0.06" />} />;
});

// 7. Sur l'écran, la caméra a bougé toute seule. Elle filme la trappe du grenier. Ouverte.
const Ecran = scene('ecran', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const u = ease(f, R('caméra', 31), R('ouverte', 159) - 6);
  if (i === 0) {
    const camF = makeCam(vise([-420, -60, 2.3], [600, -150, 4.2]));
    return (
      <AbsoluteFill>
        <Flou k={9} lum={0.45}><Plan {...PLAN} f={fg} cam={camF} decor={salon(camF, fg)} items={[]} noir={0.1} /></Flou>
        <BabyReel f={fg} pose={{x: 540, y: 1010 - 40 * k, rx: 4, ry: 4, rz: 1, s: 1.65 + 0.25 * k}} niveau={0.05} flux={flux(fg, {u, lena: {visible: true}, trappe: 0.7, id: 'nv4'})} lueur={0.5} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <g transform={`translate(540 960) scale(${1.2 + 0.12 * k}) translate(-540 -960)`}>{flux(fg, {u, lena: {visible: true}, trappe: 0.7, plein: true, id: 'nv5'})}</g>
      </svg>
    </AbsoluteFill>
  );
});

// 8. Ton tel vibre encore : « On a oublié de te dire. Léna dort chez sa mamie ce soir. »
const Message = scene('message', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const camF = makeCam(vise([-420, -60, 2.3], [600, -150, 4.2]));
  const tap = G('message', 'mère', 40) + 2;
  const notif6 = [{t: G('message', 'vibre', 11) - 4, titre: 'Maman de Léna', texte: 'On a oublié de te dire…'}];
  const montee = ease(f, 0, 14);
  const pose = i === 0
    ? {x: 540, y: interpolate(montee, [0, 1], [1500, 1010]), rx: interpolate(montee, [0, 1], [30, 6]), ry: -5, rz: -2, s: 1.4}
    : {x: 540, y: 990, rx: 4, ry: -3 + 2 * Math.sin(f / 30), rz: -1, s: 1.55 + 0.1 * k};
  return (
    <AbsoluteFill>
      <Flou k={8} lum={0.5}><Plan {...PLAN} f={fg} cam={camF} decor={salon(camF, fg)} items={[]} noir={0.1} /></Flou>
      <TelReel f={fg} pose={pose} vib={[notif6[0].t]} notifs={notif6} messages={[...MSGS, MSG6]} tap={tap} heure="23:16" zoomConv={i === 1 ? 0.25 * ease(f, R('on', 66) + 6, R('soir', 134)) : 0} appui={ease(fg, tap - 8, tap) * (1 - ease(fg, tap + 2, tap + 10))} lueur={0.55} />
    </AbsoluteFill>
  );
});

// 9. Tu remontes. Sous la couette, quelque chose respire. Une petite main dépasse. Grise. Beaucoup trop longue.
const Lit = scene('lit', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  if (i === 0) {
    const YH = SOL - ESC_M.n * ESC_M.marche;
    const cam = makeCam(vise([60, YH - 400, 3.9 + 1.2 * k], [0, YH - 380, 6.0]));
    const decor = escalierMaison(cam, fg, {porte: 0.55, applique: 0.5});
    return <Plan {...PLAN} f={fg} cam={cam} decor={decor} items={[]} noir={0.06} zoom={1.0} roll={Math.sin(fg / 10) * 0.8} />;
  }
  const main = ease(f, R('main', 127) - 4, R('dépasse', 132) + 14);
  const cams = [null, () => vise([780 - 150 * k, -480 + 60 * k, 1.1 + 0.7 * k], [0, 60, 4.3]), () => vise([340, -330 + 40 * k, 3.1 + 0.08 * k], [300, 125, 4.05])];
  const cam = makeCam(cams[i]());
  const decor = chambreEnfant(cam, fg, {veilleuse: 0.8, trappe: 0.7, lena: {visible: false}, couette: {respire: 1, bosse: true}, main: i === 2 ? main : 0, porte: 1});
  return <Plan {...PLAN} f={fg} cam={cam} decor={decor} items={[]} noir={0.05} zoom={i === 2 ? 1.1 + 0.08 * k : doux(t)} roll={[0, 1, -1][i]} dessus={flashEclair(fg, 0.15)} />;
});

// 10. Au-dessus de toi, la trappe grince. Une petite voix : « Il arrive. »
const Trappe = scene('trappe', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const trappe = 0.7 + 0.3 * ease(f, R('trappe', 38), R('grince', 49) + 18);
  const yeux = ease(f, R('petite', 77) - 6, R('petite', 77) + 10);
  const cams = [() => vise([-520 + 60 * k, 120, 2.4], [0, -1020, 3.45]), () => vise([-320 + 40 * k, 60 - 100 * k, 2.55], [0, -1250, 3.45])];
  const cam = makeCam(cams[i]());
  const decor = chambreEnfant(cam, fg, {veilleuse: 0.7, trappe, yeux: i === 1 ? yeux : 0, lena: {visible: false}, couette: {respire: 1, bosse: true}, porte: 1});
  // poussière qui tombe de la trappe
  const items = [...Array(14)].map((_, j) => {
    const age = ((fg + j * 9) % 45) / 45;
    const x = (random(`pd${j}`) - 0.5) * 500;
    const z = TRAPPE.z0 + random(`pz${j}`) * 0.8;
    const y = -990 + age * age * 900;
    return {z, x, y, el: halo(cam, x, y, z, 14, 'en-etoile', 0.7 * (1 - age), `pd${j}`)};
  });
  return <Plan {...PLAN} f={fg} cam={cam} decor={decor} items={items} noir={0.05} zoom={i === 1 ? 1.05 + 0.12 * k : doux(t)} roll={[2, -1][i]} />;
});

// 11. La couette se soulève. Lentement. (screamer à la fin)
const Couette = scene('couette', ({f, fg, t, d}) => {
  const leve = ease(f, 4, d - 12);
  const choc = f >= d - 11;
  const cam = makeCam(vise([250 + (choc ? tremble(fg, 30, 'co') : 0), -230, 1.9 + (choc ? 0.6 : 0.3 * lisse(t, d))], [0, -260, 4.2]));
  const decor = chambreEnfant(cam, fg, {veilleuse: choc ? 0.3 : 0.75, trappe: 0.55, yeux: 1, lena: {visible: false}, couette: {leve: choc ? 1.1 : leve}, porte: 1});
  const flash = choc ? interpolate(f - (d - 11), [0, 1, 3, 6], [0.9, 0.2, 0.7, 0], clamp) : 0;
  return <Plan {...PLAN} f={fg} cam={cam} decor={decor} items={[]} noir={0.04} zoom={choc ? 1.25 : 1.0 + 0.1 * leve} roll={choc ? tremble(fg, 4, 'cr') : 0} dessus={<rect width="1080" height="1920" fill={Math.floor(f / 2) % 2 ? '#fff' : '#ff2a3a'} opacity={flash} />} />;
});

// 12. Tu t'enfuis de la maison ? Ou tu montes au grenier chercher la vraie Léna ?
const Dilemme = scene('dilemme', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const P = {x: 750, z: 2.0};
  const cams = [() => vise([1150 - 80 * k, -420, 0.55 + 0.2 * k], [0, -380, 3.9]), () => camFace(P.x, P.z, -1, 0.65, t, d, {dx: -60, dy: -10})];
  const cam = makeCam(cams[i]());
  const decor = chambreEnfant(cam, fg, {veilleuse: 0.55, trappe: 0.6, yeux: 1, lena: {visible: false}, couette: {leve: 1.1}, porte: 1});
  const items = [{z: P.z, x: P.x, el: <Perso cam={cam} id={`di${i}`} x={P.x} z={P.z} dos={i === 0} lum={0.55} teinte={NUIT_T} eyes={1.45} worry={1} sweat={1} pupilX={Math.sin(fg / 12) * 9} pupilY={-4} shiver={tremble(fg, 3, 'di')} />}];
  const dis = R('dis-le', 92);
  return (
    <Plan {...PLAN} f={fg} cam={cam} decor={decor} items={items} noir={0.04} zoom={doux(t)} roll={[1, -1][i]}
      dessus={
        <g>
          <Choix f={f} debut={R('tenfuis', 5)} x={540} y={250} texte="JE M'ENFUIS" emoji="1f3c3" couleur="#3ad86a" />
          <Choix f={f} debut={R('montes', 41)} x={540} y={450} texte="JE MONTE AU GRENIER" emoji="1fa9c" couleur="#ff3a4a" />
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

const COMPOSANTS = {alerte: Alerte, dodo: Dodo, canape: Canape, chuchote: Chuchote, escalier: Escalier, voix: Voix, ecran: Ecran, message: Message, lit: Lit, trappe: Trappe, couette: Couette, dilemme: Dilemme};
export const LeBabyphone = () => (
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
