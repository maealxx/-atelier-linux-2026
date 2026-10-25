import {Easing, interpolate, random, Series, spring, staticFile, useCurrentFrame} from 'remotion';
import {BAIE, FENETRES, jardin, PERRON, PORTAIL, PORTE, Telephone} from './Maison';
import {surveillant3D} from './Monstre3D';
import {camFace, dosPour, montage, Plan, punch} from './montage';
import {clamp, makeCam, marche, orbite, Perso} from './moteur';
import {SOL} from './Rue';
import PLANS from './soiree/plans.json';
import timeline from './soiree/timeline.json';

// « La soirée » : tu sors prendre l'air et toutes les lumières de la maison s'éteignent.
const {DUREES, decoupe, repere, SCENES} = montage(timeline, PLANS);
export const DUREE_SOIREE = SCENES.reduce((t, [, d]) => t + d, 0);

const ease = {...clamp, easing: Easing.inOut(Easing.sin)};
const FETE = [1, 0.85, 0.92];
const LUNE = [0.7, 0.8, 1.08];
const ECRAN = [0.75, 0.88, 1.15];
const TERRASSE = SOL - 25;
const BLACKOUT = repere('coupure', 'séteignent', 150);
const HOTE = {x: 600, z: PERRON.z0 + 0.45, y: SOL - PERRON.n * PERRON.marche};

// Lampadaire de la rue qui bugue
const bug = (f, graine, base = 1) => {
  const r = random(`${graine}${Math.floor(f / 2)}`);
  return random(`${graine}c${Math.floor(f / 9)}`) < 0.3 ? (r > 0.5 ? base : 0.05) : base * (0.85 + 0.15 * r);
};
const noirBug = (f) => 0.04 + 0.1 * (1 - bug(f, 'nb'));
const hote = (cam, f, o = {}) => surveillant3D(cam, {x: HOTE.x, z: HOTE.z, y: HOTE.y, angle: 180, f, echelle: 1.3, tenue: 'hote', masque: 1, ...o}).el;
// le voile sombre + le téléphone par-dessus la scène
const ecran = (f, props, voile = 0.55) => (
  <g>
    <rect width="1080" height="1920" fill="#000" opacity={voile} />
    <Telephone f={f} {...props} />
  </g>
);
// la conversation (les anciens messages restent affichés)
const MSG1 = repere('message', 'on', 73);
const MSG2 = repere('message', 'surtout', 105);
const messages1 = (decal = 0) => [
  {debut: MSG1 - decal, texte: 'on est dans la cave'},
  {debut: MSG2 - decal, texte: 'SURTOUT NE RENTRE PAS ‼️', gras: true},
];

// ---------- 1. Les lumières s'éteignent ----------
const Coupure = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('coupure', f);
  const z = interpolate(f, [0, 60], [7.6, 6.9], {...clamp, easing: Easing.out(Easing.quad)});
  const cams = [
    () => ({x: -250, y: 250, z: 3.2 + (0.5 * t) / d, pitch: -14, yaw: -4}),
    () => camFace(-720, z, -1, 0.75, t, d, {dy: -25}),
    () => ({x: -460, y: -1080, z: 6.4 + (0.2 * t) / d, pitch: -4}),
    () => ({x: -650, y: -560, z: 5.9, yaw: -22, pitch: -12}),
    () => ({x: 100, y: -250, z: -0.8 + (0.5 * t) / d, pitch: -6, yaw: -3}),
  ];
  const cam = makeCam(cams[i]());
  const fenetre = (k) => (f < BLACKOUT + ((k * 3) % 11) ? 1 : 0);
  const fete = f < BLACKOUT ? 1 : 0;
  const decor = jardin(cam, f, {fete, fenetre, gens: f < BLACKOUT ? 'danse' : null, guirlande: f < BLACKOUT ? 1 : Math.max(0, 1 - (f - BLACKOUT) / 6)});
  const m = marche(f, 0.3, f < 60 ? 0.8 : 0);
  return (
    <Plan f={f} cam={cam} decor={decor} noir={f < BLACKOUT ? 0 : 0.08} zoom={punch(t)} roll={[-3, 3, 0, -5, 2][i]}
      items={[{z, el: <Perso cam={cam} id="s1" x={-720} y={TERRASSE} z={z} dos={dosPour(cam, z, -1)} lum={f < BLACKOUT ? 0.95 : 0.5} teinte={f < BLACKOUT ? FETE : LUNE} lift={m.bob} legG={m.legG} legD={m.legD} epauleG={m.bras} epauleD={m.bras} smile={f < BLACKOUT ? 0.4 : 0} worry={f < BLACKOUT ? 0 : 0.8} eyes={f < BLACKOUT ? 1 : 1.25} breath={Math.sin(f / 8) * 3} />}]}
    />
  );
};

// ---------- 2. Le silence ----------
const Silence = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('silence', f);
  const z = 6.9 - interpolate(f, [d, DUREES.silence], [0, 0.9], clamp);
  const cams = [
    () => camFace(-720, 6.9, -1, 0.5, t, d, {dy: -25}),
    () => ({x: -150, y: 120, z: 6.0 + (0.1 * t) / d, pitch: 8}),
    () => ({x: -660, y: 395, z: z - 0.6, pitch: -12}),
    () => orbite(-720, z, 1.4, -28 + (56 * t) / d, -120, {pitch: -4}),
  ];
  const cam = makeCam(cams[i]());
  const decor = jardin(cam, f, {fete: 0, gens: null, enceinte: 0, lampadaire: bug(f, 'lp')});
  return (
    <Plan f={f} cam={cam} decor={decor} noir={noirBug(f)} zoom={punch(t)} roll={[4, -3, 2, -2][i]}
      items={[{z, el: <Perso cam={cam} id="s2" x={-720} y={z > 6.2 ? TERRASSE : SOL} z={z} dos={dosPour(cam, z, -1)} lum={0.55} teinte={LUNE} worry={1} eyes={1.2} pupilX={Math.sin(f / 9) * 5} breath={Math.sin(f / 6) * 3} />}]}
    />
  );
};

// ---------- 3. Trois coups contre la vitre ----------
const Vitre = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('vitre', f);
  const coups = [repere('vitre', 'trois', 126), repere('vitre', 'coups', 132), repere('vitre', 'retour', 145)];
  const choc = coups.reduce((v, c) => Math.max(v, interpolate(f, [c, c + 1, c + 6], [0, 1, 0], clamp)), 0);
  const sh = choc * (random(`v${f}`) - 0.5) * 30;
  const cams = [
    () => ({x: -560 + sh, y: -230, z: 6.7, yaw: -8}),
    () => ({x: -380 + sh, y: -150, z: 7.3, yaw: -58}),
    () => ({x: -640 + sh, y: -120, z: 7.05, yaw: -8, pitch: -2}),
    () => ({x: -480 + sh, y: -260, z: 5.4 + (0.3 * t) / d, yaw: -8}),
  ];
  const cam = makeCam(cams[i]());
  const trace = interpolate(f, [coups[2], coups[2] + 10], [0, 1], clamp);
  const pm = cam.proj(-760, -200, 7.99);
  const sm = cam.scale(7.99, -760, -200);
  const vitre = trace > 0 && cam.visible(7.99, -760, -200) ? (
    <g opacity={0.5 * trace}>
      <ellipse cx={pm[0]} cy={pm[1]} rx={55 * sm} ry={70 * sm} fill="#c9d4e0" />
      {[-40, -15, 10, 35].map((dx, k) => (
        <ellipse key={k} cx={pm[0] + dx * sm} cy={pm[1] - 95 * sm} rx={11 * sm} ry={36 * sm} fill="#c9d4e0" />
      ))}
      <ellipse cx={pm[0] + 62 * sm} cy={pm[1] - 30 * sm} rx={12 * sm} ry={30 * sm} fill="#c9d4e0" transform={`rotate(40 ${pm[0] + 62 * sm} ${pm[1] - 30 * sm})`} />
    </g>
  ) : null;
  const decor = jardin(cam, f, {fete: 0, gens: null, enceinte: 0, vitre});
  const tape = interpolate(f, [10, 20, 40, 50], [0, 1, 1, 0], clamp);
  return (
    <Plan f={f} cam={cam} decor={decor} noir={noirBug(f)} zoom={punch(t, 0.14) + choc * 0.05} roll={[2, -6, 3, 7][i]}
      items={[{z: 7.55, el: <Perso cam={cam} id="s3" x={-720} y={TERRASSE} z={7.55} dos={dosPour(cam, 7.55, 1)} lum={0.5} teinte={LUNE} epauleD={-70 * tape} coudeD={-60 * tape} worry={0.6 + 0.4 * choc} eyes={1 + 0.3 * Math.min(1, trace + choc)} sweat={trace} breath={Math.sin(f / 6) * 3} shiver={choc * 6} />}]}
    />
  );
};

// ---------- 4. Le premier message ----------
const Message = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('message', f);
  const vibre = interpolate(f, [repere('message', 'vibre', 16), repere('message', 'vibre', 16) + 20], [1, 0], clamp);
  const cams = [
    () => ({x: -620, y: -60, z: 6.0, yaw: 14, pitch: 6}),
    () => ({x: -600, y: -200, z: 5.6, yaw: 10}),
    () => camFace(-720, 7.0, -1, 0.45, t, d, {dy: -25}),
    () => ({x: -600, y: -200, z: 5.6, yaw: 10}),
  ];
  const cam = makeCam(cams[i]());
  const decor = jardin(cam, f, {fete: 0, gens: null, enceinte: 0});
  const tel = [
    ecran(f, {verrouille: true, notif: {debut: 12, texte: 'Lucas : on est dans la cave…'}, echelle: 0.8, y: 1150, vibre}, 0.3),
    ecran(f, {messages: messages1(), echelle: 1.05, y: 960, vibre}),
    null,
    ecran(f, {messages: messages1(), echelle: 1.5, y: 980, x: 640}),
  ][i];
  return (
    <Plan f={f} cam={cam} decor={decor} noir={noirBug(f)} zoom={punch(t)} roll={[3, 0, -4, -6][i]}
      items={[{z: 7.0, el: <Perso cam={cam} id="s4" x={-720} y={TERRASSE} z={7.0} dos={dosPour(cam, 7.0, -1)} lum={0.85} teinte={ECRAN} worry={1} eyes={1.25} pupilY={4} sweat={0.6} breath={Math.sin(f / 6) * 3} />}]}
      dessus={tel}
    />
  );
};

// ---------- 5. Quelqu'un derrière chaque fenêtre ----------
const Fenetres = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('fenetres', f);
  const cams = [
    () => ({x: -200, y: 380, z: 2.6 + (0.3 * t) / d, pitch: -28, yaw: 2}),
    () => ({x: -460, y: -1100, z: 6.4 + (0.3 * t) / d}),
    () => ({x: 740, y: -1100, z: 6.5 + (0.3 * t) / d, yaw: 2}),
    () => orbite(-300, 4.0, 1.5, -25 + (50 * t) / d, -100, {pitch: -15}),
  ];
  const cam = makeCam(cams[i]());
  const decor = jardin(cam, f, {fete: 0, gens: 'immobile', enceinte: 0, lampadaire: bug(f, 'lp5')});
  return (
    <Plan f={f} cam={cam} decor={decor} noir={noirBug(f)} zoom={punch(t)} roll={[0, 4, -4, 3][i]}
      items={[{z: 4.0, el: <Perso cam={cam} id="s5" x={-300} z={4.0} dos={dosPour(cam, 4.0, 1)} lum={0.5} teinte={LUNE} worry={1} eyes={1.25} pupilY={-4} tilt={-3} breath={Math.sin(f / 6) * 3} />}]}
    />
  );
};

// ---------- 6. Les sourires ----------
const Sourires = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('sourires', f);
  const sourire = interpolate(f, [repere('sourires', 'sourient', 57) - 4, repere('sourires', 'sourient', 57) + 8], [0, 1], clamp);
  const cams = [
    () => ({x: 0, y: -400, z: 1.2 + (0.4 * t) / d, pitch: -14}),
    () => ({x: -460, y: -1140, z: 7.25 + (0.1 * t) / d}),
    () => camFace(-300, 4.0, 1, 0.55, t, d),
    () => ({x: 300, y: 300, z: 2.0, pitch: -22, yaw: -6}),
  ];
  const cam = makeCam(cams[i]());
  const decor = jardin(cam, f, {fete: 0, gens: 'immobile', sourire, enceinte: 0});
  return (
    <Plan f={f} cam={cam} decor={decor} noir={noirBug(f)} zoom={punch(t, 0.16)} roll={[-2, 6, -5, 3][i]}
      items={[{z: 4.0, el: <Perso cam={cam} id="s6" x={-300} z={4.0} dos={dosPour(cam, 4.0, 1)} lum={0.5} teinte={LUNE} worry={1} eyes={1.3} sweat={sourire} breath={Math.sin(f / 5) * 3} shiver={(random(`s6${f}`) - 0.5) * 4 * sourire} />}]}
    />
  );
};

// ---------- 7. La porte s'ouvre ----------
const Porte = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('porte', f);
  const porte = interpolate(f, [repere('porte', 'porte', 5) + 10, repere('porte', 'porte', 5) + 50], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
  const cams = [
    () => ({x: 600, y: -150, z: 3.0 + (3.4 * t) / d, yaw: Math.sin(f / 20) * 2}),
    () => ({x: 600, y: -260, z: 7.35 + (0.2 * t) / d}),
    () => camFace(-300, 4.0, 1, 0.5, t, d),
    () => ({x: 360, y: -100, z: 7.0, yaw: 28, pitch: 2}),
  ];
  const cam = makeCam(cams[i]());
  const decor = jardin(cam, f, {fete: 0, gens: 'immobile', sourire: 1, porte, enceinte: 0});
  return (
    <Plan f={f} cam={cam} decor={decor} noir={noirBug(f)} zoom={punch(t)} roll={[0, 5, -4, 6][i]}
      items={[{z: 4.0, el: <Perso cam={cam} id="s7" x={-300} z={4.0} dos={dosPour(cam, 4.0, 1)} lum={0.5} teinte={LUNE} worry={1} eyes={1.3} sweat={1} breath={Math.sin(f / 5) * 4} />}]}
    />
  );
};

// ---------- 8. Le portail cadenassé ----------
const Portail = () => {
  const f = useCurrentFrame();
  const {i, t, d, D} = decoupe('portail', f);
  const k = interpolate(f, [0, D * 0.75], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
  const x = -300 + 900 * k;
  const z = 4.0 - 5.9 * k;
  const cams = [
    () => ({x: x + 120, y: -200, z: z + 1.3, yaw: 180 - 4}),
    () => ({x: 600, y: -120, z: -1.95, yaw: 180}),
    () => ({x: 650, y: -150, z: -3.4, yaw: 0}),
    () => ({x: 1400, y: -1000, z: -3.3, pitch: 18, yaw: -8}),
  ];
  const cam = makeCam(cams[i]());
  const decor = jardin(cam, f, {fete: 0, gens: 'immobile', sourire: 1, porte: 1, enceinte: 0, cadenas: interpolate(f, [repere('portail', 'cadenassé', 66), repere('portail', 'cadenassé', 66) + 40], [1, 0.2], clamp), lampadaire: bug(f, 'lp8')});
  const m = marche(f, 0.35, k < 1 ? 0.8 : 0);
  const mains = i === 2 ? 1 : 0;
  return (
    <Plan f={f} cam={cam} decor={decor} noir={noirBug(f)} zoom={punch(t)} roll={[3, -6, 4, -3][i]}
      items={[{z, el: <Perso cam={cam} id="s8" x={x} z={z} dos={dosPour(cam, z, 1)} lum={0.5} teinte={LUNE} lift={m.bob} legG={m.legG} legD={m.legD} epauleG={m.bras + 30 * mains} epauleD={-m.bras - 30 * mains} coudeG={120 * mains} coudeD={-120 * mains} worry={1} eyes={1.3} sweat={1} breath={Math.sin(f / 4) * 4} />}]}
    />
  );
};

// ---------- 9. Le deuxième message ----------
const Message2 = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('message2', f);
  const MSG3 = repere('message2', 'celui', 34);
  const msgs = [...messages1(400), {debut: MSG3, photo: true, texte: "celui qui organise la soirée... personne le connaît"}];
  const cams = [() => ({x: 650, y: -150, z: -3.0, yaw: 0}), () => ({x: 650, y: -150, z: -3.0, yaw: 0}), () => ({x: 650, y: -150, z: -3.0, yaw: 0})];
  const cam = makeCam(cams[i]());
  const decor = jardin(cam, f, {fete: 0, gens: 'immobile', sourire: 1, porte: 1, enceinte: 0, lampadaire: bug(f, 'lp9')});
  const tel = [
    ecran(f, {verrouille: true, notif: {debut: 4, texte: 'Lucas : Deuxième message'}, echelle: 0.85, y: 1100, vibre: interpolate(f, [4, 24], [1, 0], clamp)}, 0.35),
    ecran(f, {messages: msgs, echelle: 1.05, y: 960}),
    ecran(f, {messages: msgs, echelle: 2.3, y: 160, x: 600}, 0.7),
  ][i];
  return (
    <Plan f={f} cam={cam} decor={decor} noir={noirBug(f)} zoom={punch(t)} roll={[2, 0, -5][i]}
      items={[{z: -1.9, el: <Perso cam={cam} id="s9" x={600} z={-1.9} dos={dosPour(cam, -1.9, 1)} lum={0.5} teinte={LUNE} />}]}
      dessus={tel}
    />
  );
};

// ---------- 10. L'hôte sur le perron ----------
const Hote = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('hote', f);
  const apparait = interpolate(f, [repere('hote', 'lhôte', 32) - 6, repere('hote', 'lhôte', 32) + 4], [0, 1], clamp);
  const cams = [
    () => ({x: 680, y: -230, z: -2.9 + (0.6 * t) / d, yaw: 0}),
    () => ({x: 600, y: 380, z: 5.5 + (0.2 * t) / d, pitch: -26 - (10 * t) / d}),
    () => camFace(600, -1.9, 1, 0.55, t, d),
    () => ({x: 600, y: -900, z: 6.0 + (0.25 * t) / d, pitch: -4}),
  ];
  const cam = makeCam(cams[i]());
  const decor = jardin(cam, f, {fete: 0, gens: 'immobile', sourire: 1, porte: 1, enceinte: 0, lampadaire: bug(f, 'lp10')});
  const flash = interpolate(f, [repere('hote', 'lhôte', 32) - 6, repere('hote', 'lhôte', 32) - 4, repere('hote', 'lhôte', 32) + 4], [0, 0.45, 0], clamp);
  const masque = interpolate(f, [repere('hote', 'masque', 130) - 10, DUREES.hote], [1, 0.9], clamp);
  return (
    <Plan f={f} cam={cam} decor={decor} noir={noirBug(f)} zoom={punch(t, 0.16)} roll={[0, -7, 4, 3][i]}
      items={[
        apparait > 0 && {z: HOTE.z, el: hote(cam, f, {masque})},
        {z: -1.9, el: <Perso cam={cam} id="s10" x={600} z={-1.9} dos={dosPour(cam, -1.9, 1)} lum={0.5} teinte={LUNE} worry={1} eyes={1.3} sweat={1} shiver={(random(`s10${f}`) - 0.5) * 5} />},
      ]}
      dessus={<rect width="1080" height="1920" fill="#fff3dc" opacity={flash} />}
    />
  );
};

// ---------- 11. La bouche jusqu'au ventre ----------
const Revelation = () => {
  const f = useCurrentFrame();
  const {i, t, d, bornes} = decoupe('revelation', f);
  const masque = interpolate(f, [0, bornes[1]], [0.9, 0], clamp);
  const ouvre = interpolate(f, [bornes[1], bornes[2]], [0, 1], ease);
  const descend = interpolate(f, [repere('revelation', 'descend', 135) - 20, DUREES.revelation], [0, 1], clamp);
  const z = HOTE.z - 1.4 * descend;
  const marcheN = Math.min(PERRON.n, Math.max(0, Math.floor((HOTE.z - z) / 0.25)));
  const y = HOTE.y + marcheN * PERRON.marche;
  const cams = [
    () => ({x: 600, y: -950, z: 6.25 + (0.1 * t) / d}),
    () => ({x: 600, y: -650, z: 5.7 - (0.2 * t) / d}),
    () => camFace(600, -1.9, 1, 0.45, t, d),
    () => orbite(600, z, 1.9, -25 + (50 * t) / d, 150, {pitch: -16}),
    () => ({x: 760, y: 400, z: 5.8, pitch: -6, yaw: -8}),
  ];
  const cam = makeCam(cams[i]());
  const decor = jardin(cam, f, {fete: 0, gens: 'immobile', sourire: 1, porte: 1, enceinte: 0});
  const flash = interpolate(f, [bornes[1] + 12, bornes[1] + 14, bornes[1] + 22], [0, 0.5, 0], clamp);
  const peur = interpolate(f, [bornes[2], bornes[2] + 5], [0, 1], clamp);
  return (
    <Plan f={f} cam={cam} decor={decor} noir={noirBug(f)} zoom={punch(t, 0.18)} roll={[0, 5, -8, 4, -5][i]}
      items={[
        {z, el: surveillant3D(cam, {x: HOTE.x, z, y, angle: 180, f, echelle: 1.3, tenue: 'hote', masque, ouvre, ventre: ouvre, pose: 0.25 * descend}).el},
        {z: -1.9, el: <Perso cam={cam} id="s11" x={600} z={-1.9} dos={dosPour(cam, -1.9, 1)} lum={0.5} teinte={LUNE} worry={1} eyes={1 + 0.35 * peur} scream={peur} epauleG={35 * peur} coudeG={130 * peur} epauleD={-35 * peur} coudeD={-130 * peur} sweat={1} shiver={peur ? (random(`s11${f}`) - 0.5) * 8 : 0} />},
      ]}
      dessus={<rect width="1080" height="1920" fill="#ffe9e0" opacity={flash} />}
    />
  );
};

// ---------- 12. Le dilemme ----------
const Choix = ({f, debut, x, y, texte, emoji, couleur}) => {
  const p = spring({frame: f - debut, fps: 30, config: {damping: 9}});
  if (f < debut) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${p}) rotate(${(1 - p) * -12})`}>
      <rect x="-290" y="-90" width="580" height="180" rx="28" fill="#0b0b0e" opacity="0.85" stroke={couleur} strokeWidth="6" />
      <image href={staticFile(`emoji/${emoji}.svg`)} x="-265" y="-55" width="110" height="110" />
      <text x="-135" y="20" textAnchor="start" fontFamily="'DejaVu Sans', Arial, sans-serif" fontWeight="900" fontSize="50" fill="#fff">
        {texte}
      </text>
    </g>
  );
};
const Dilemme = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('dilemme', f);
  const zH = 5.0 - 0.6 * (f / DUREES.dilemme);
  const cams = [
    () => ({x: 600, y: -900, z: -3.6 + (0.3 * t) / d, pitch: 16}),
    () => ({x: 600, y: -120, z: -1.95, yaw: 180}),
    () => ({x: 600, y: -250, z: 6.9 + (0.2 * t) / d}),
    () => orbite(600, zH, 1.7, 20 - (40 * t) / d, -600, {pitch: 2}),
    () => ({x: 600, y: -900, z: -3.3 + (0.3 * t) / d, pitch: 16}),
  ];
  const cam = makeCam(cams[i]());
  const decor = jardin(cam, f, {fete: 0, gens: 'immobile', sourire: 1, porte: 1, enceinte: 0, cadenas: 0.3, lampadaire: bug(f, 'lp12')});
  return (
    <Plan f={f} cam={cam} decor={decor} noir={noirBug(f)} zoom={punch(t)} roll={[-3, 5, -4, 6, 0][i]}
      items={[
        {z: zH, el: surveillant3D(cam, {x: 600, z: zH, angle: 180, f: 400 + f * 0.25, echelle: 1.3, tenue: 'hote', masque: 0, ouvre: 1, ventre: 1, pose: 0.35}).el},
        {z: -1.9, el: <Perso cam={cam} id="s12" x={600} z={-1.9} dos={dosPour(cam, -1.9, 1)} lum={0.55} teinte={LUNE} worry={1} eyes={1.25} sweat={1} breath={Math.sin(f / 4) * 4} />},
      ]}
      dessus={
        <g>
          <Choix f={f} debut={repere('dilemme', 'tu', 28)} x={320} y={190} texte="TU RENTRES ?" emoji="1f3e0" couleur="#ffb45a" />
          <Choix f={f} debut={repere('dilemme', 'ou', 64)} x={760} y={420} texte="LE PORTAIL ?" emoji="1f9d7" couleur="#8fd3ff" />
          {f >= repere('dilemme', 'dis-le', 106) && (
            <g transform={`translate(540 1680) scale(${spring({frame: f - repere('dilemme', 'dis-le', 106), fps: 30, config: {damping: 10}})})`}>
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
};

const COMPOSANTS = {coupure: Coupure, silence: Silence, vitre: Vitre, message: Message, fenetres: Fenetres, sourires: Sourires, porte: Porte, portail: Portail, message2: Message2, hote: Hote, revelation: Revelation, dilemme: Dilemme};

export const Soiree = () => (
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
