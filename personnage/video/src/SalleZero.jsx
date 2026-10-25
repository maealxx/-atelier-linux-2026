import {Easing, interpolate, random, Series, spring, staticFile, useCurrentFrame} from 'remotion';
import {CASIERS, classe, couloir, escalier, KX, marcheY, PLAF, volee, VOLEE} from './Lycee';
import {surveillant3D} from './Monstre3D';
import {camFace, dosPour, montage, Plan, punch} from './montage';
import {clamp, flick, makeCam, marche, orbite, Perso} from './moteur';
import {SOL} from './Rue';
import PLANS from './salle-zero/plans.json';
import timeline from './salle-zero/timeline.json';

// « Salle zéro » : tu t'endors au lycée après le cours de 18 h.
const {DUREES, decoupe, repere, SCENES} = montage(timeline, PLANS);
export const DUREE_SALLE_ZERO = SCENES.reduce((t, [, d]) => t + d, 0);

const ease = {...clamp, easing: Easing.inOut(Easing.sin)};
const LUNE = [0.75, 0.85, 1.08]; // lumière de la classe
const VERT = [0.72, 1, 0.82]; // lumière du couloir (panneaux sortie)
const ASSIS = SOL + 250; // le bonhomme assis : on l'enfonce derrière sa table

// Néon qui « bugue » : il tient, puis il hoquette et coupe par moments
const bug = (f, graine, base = 0.9) => {
  const r = random(`${graine}${Math.floor(f / 2)}`);
  const coupe = random(`${graine}c${Math.floor(f / 9)}`) < 0.32;
  return coupe ? (r > 0.5 ? base : 0.04) : base * (0.82 + 0.18 * r);
};
// Classe : un seul néon allumé, qui bugue
const neonsClasse = (f) => (k) => (k === 3 ? bug(f, 'cl3') : k === 0 ? 0.25 * bug(f, 'cl0', 1) : 0);
// Couloir : un néon sur trois bugue, un sur trois reste faible, les autres sont morts
const neonsCouloir = (f, extra = () => null) => (k) => extra(k) ?? (k % 3 === 1 ? bug(f, `co${k}`) : k % 3 === 2 ? 0.28 : 0);
// La pièce s'assombrit un peu quand le néon principal coupe
const noirBug = (f, graine) => 0.03 + 0.12 * (1 - bug(f, graine, 1));

// Le surveillant en 3D : tour 0 → 1 = il se retourne vers le bonhomme, pattes = il se met à quatre pattes
const monstre = (cam, x, z, {f, tour = 0, ouvre = 0, pattes = 0}) => surveillant3D(cam, {x, z, angle: 180 * tour, ouvre, pose: pattes, f}).el;

// ---------- 1. Le réveil ----------
const Reveil = () => {
  const f = useCurrentFrame();
  const {i, t, d, bornes} = decoupe('reveil', f);
  const cams = [
    () => ({x: 30, y: 70, z: 3.42 - (0.06 * t) / d, yaw: 180, pitch: 3}),
    () => ({x: 600, y: -560, z: 6.3 + (0.1 * t) / d, yaw: 12}),
    () => camFace(0, 2.55, 1, 0.42, t, d, {dy: 250}),
    () => ({x: 0, y: -720, z: -1.2 + (0.3 * t) / d, pitch: 30}),
  ];
  const cam = makeCam(cams[i]());
  const decor = classe(cam, f, {neon: neonsClasse(f)});
  const reveille = interpolate(f, [bornes[2], bornes[2] + 8], [0, 1], clamp);
  return (
    <Plan
      f={f}
      cam={cam}
      decor={decor}
      noir={noirBug(f, 'nb')}
      zoom={punch(t)}
      roll={[4, -3, 2, 0][i]}
      items={[{z: 2.55, el: <Perso cam={cam} id="z1" x={0} y={ASSIS} z={2.55} dos={dosPour(cam, 2.55, 1)} lum={0.65} teinte={LUNE} tilt={-28 * (1 - reveille)} eyes={f < bornes[2] ? 0.08 : 1 + 0.2 * reveille} worry={0.5 * reveille} breath={Math.sin(f / 12) * 3} />}]}
    />
  );
};

// ---------- 2. La classe vide ----------
const ClasseVide = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('classeVide', f);
  const cams = [
    () => ({x: 0, y: -160, z: 2.42, yaw: interpolate(t, [0, d], [-75, -25], ease), pitch: 2}),
    () => ({x: -700, y: 300, z: 6.3, yaw: 158, pitch: -6}),
    () => camFace(0, 2.4, 1, 0.5, t, d),
  ];
  const cam = makeCam(cams[i]());
  const decor = classe(cam, f, {neon: neonsClasse(f)});
  return (
    <Plan
      f={f}
      cam={cam}
      decor={decor}
      noir={noirBug(f, 'nb')}
      zoom={punch(t)}
      roll={[0, -4, 3][i]}
      items={[{z: 2.4, el: <Perso cam={cam} id="z2" x={0} z={2.4} dos={dosPour(cam, 2.4, 1)} lum={0.65} teinte={LUNE} worry={0.7} pupilX={Math.sin(f / 10) * 4} breath={Math.sin(f / 8) * 3} />}]}
    />
  );
};

// ---------- 3. La phrase au tableau ----------
const Tableau = () => {
  const f = useCurrentFrame();
  const {i, t, d, bornes} = decoupe('tableau', f);
  const cams = [
    () => ({x: 120, y: -250, z: 1.6 + (3.0 * t) / d, yaw: 0, pitch: -2}),
    () => ({x: 300, y: -100, z: 6.3, pitch: 6}),
    () => camFace(0, 2.4, 1, 0.5, t, d),
    () => ({x: -150, y: -300, z: 4.3, yaw: 4}),
  ];
  const cam = makeCam(cams[i]());
  const craie = interpolate(f, [4, bornes[1] + 10], [0, 1], clamp);
  const decor = classe(cam, f, {craie, neon: neonsClasse(f)});
  // la craie qui tombe toute seule du rebord
  const tc = f - bornes[1];
  const craieY = -60 + Math.max(0, tc) ** 2 * 1.4;
  const pc = cam.proj(300, Math.min(craieY, SOL - 10), 6.92);
  const sc = cam.scale(6.92, 300, craieY);
  return (
    <Plan
      f={f}
      cam={cam}
      decor={decor}
      noir={noirBug(f, 'nb')}
      zoom={punch(t)}
      roll={[0, 5, 3, -6][i]}
      items={[
        {z: 6.92, el: cam.visible(6.92, 300, craieY) ? <rect x={pc[0] - 30 * sc} y={pc[1] - 8 * sc} width={60 * sc} height={16 * sc} fill="#f2f2ea" transform={`rotate(${tc > 0 ? tc * 25 : 0} ${pc[0]} ${pc[1]})`} /> : null},
        {z: 2.4, el: <Perso cam={cam} id="z3" x={0} z={2.4} dos={dosPour(cam, 2.4, 1)} lum={0.65} teinte={LUNE} worry={1} eyes={1.2} pupilY={-2} sweat={0.5} breath={Math.sin(f / 7) * 3} />},
      ]}
    />
  );
};

// ---------- 4. Le couloir ----------
const Couloir = () => {
  const f = useCurrentFrame();
  const {i, t, d, D} = decoupe('couloir', f);
  const z = interpolate(f, [0, D], [1, 3.2]);
  const cams = [
    () => ({x: 80, y: 385, z: z - 0.6, pitch: -10, yaw: 2}),
    () => ({x: 0, y: -570, z: 3.75 + (0.1 * t) / d, yaw: 0}),
    () => ({x: 200, y: -200, z: z + 2.2, yaw: 186, pitch: 1}),
    () => camFace(0, z, 1, 0.5, t, d),
  ];
  const cam = makeCam(cams[i]());
  const fleche = (k) => (k === 1 ? interpolate(f, [DUREES.couloir * 0.3, DUREES.couloir * 0.5], [0, 180], ease) : 180);
  const decor = couloir(cam, f, {fleche, neon: neonsCouloir(f)});
  const m = marche(f, 0.3, 0.8);
  return (
    <Plan
      f={f}
      cam={cam}
      decor={decor}
      noir={noirBug(f, 'nb')}
      zoom={punch(t)}
      roll={[3, -5, 2, 4][i]}
      items={[{z, el: <Perso cam={cam} id="z4" x={0} z={z} dos={dosPour(cam, z, 1)} lum={0.55} teinte={VERT} lift={m.bob} legG={m.legG} legD={m.legD} epauleG={m.bras} epauleD={m.bras} worry={0.7} pupilX={Math.sin(f / 9) * 4} breath={Math.sin(f / 7) * 3} />}]}
    />
  );
};

// ---------- 5. Les casiers ----------
const SLAMS = [2.0, 2.68, 3.36];
const Casiers = () => {
  const f = useCurrentFrame();
  const {i, t, d, bornes, D} = decoupe('casiers', f);
  const vite = interpolate(f, [bornes[4], bornes[4] + 10], [0, 1], clamp);
  const z = 3.2 + f * 0.009 + Math.max(0, f - bornes[4]) * 0.008;
  const cams = [
    () => ({x: 150, y: -180, z: z + 1.6, yaw: 188, pitch: 1}),
    () => ({x: -60, y: -120, z: SLAMS[0] - 1.0, yaw: -24}),
    () => ({x: -60, y: -120, z: SLAMS[1] - 1.0, yaw: -24}),
    () => ({x: -60, y: -120, z: SLAMS[2] - 1.0, yaw: -24}),
    () => ({x: 70, y: 385, z: z - 0.6, pitch: -10, yaw: Math.sin(f / 4) * 3}),
  ];
  const cam = makeCam(cams[i]());
  // les casiers s'ouvrent en vague derrière lui, puis trois claquent en gros plan
  const casier = (k) => {
    const zc = CASIERS[k];
    const s = SLAMS.findIndex((v) => Math.abs(v - zc) < 0.17);
    if (s >= 0) return interpolate(f, [bornes[s + 1], bornes[s + 1] + 4], [0, 1], clamp);
    if (zc > 5.6) return 0;
    return interpolate(f, [(zc - 0.6) * 22, (zc - 0.6) * 22 + 5], [0, 1], clamp);
  };
  const decor = couloir(cam, f, {casier, neon: neonsCouloir(f)});
  const m = marche(f, 0.3 + 0.22 * vite, 0.8 + 0.2 * vite);
  return (
    <Plan
      f={f}
      cam={cam}
      decor={decor}
      noir={noirBug(f, 'nb')}
      zoom={punch(t, i >= 1 && i <= 3 ? 0.2 : 0.12)}
      roll={[2, -6, 5, -7, 3][i]}
      items={[{z, el: <Perso cam={cam} id="z5" x={0} z={z} dos={dosPour(cam, z, 1)} lum={0.55} teinte={VERT} lift={m.bob} legG={m.legG} legD={m.legD} epauleG={m.bras} epauleD={m.bras} worry={1} eyes={1.15} sweat={0.6 + 0.4 * vite} breath={Math.sin(f / 5) * 3} />}]}
    />
  );
};
const casiersOuverts = (k) => (CASIERS[k] < 5.6 ? 1 : 0);

// ---------- 6. Les haut-parleurs ----------
const HautParleur = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('hautParleur', f);
  const vib = (random(`hp${f}`) - 0.5) * 6;
  const cams = [
    () => ({x: 250 + vib, y: -500, z: 5.55, yaw: 38, pitch: -9}),
    () => ({x: 60, y: 380, z: 6.1, yaw: 180, pitch: -18}),
    () => ({x: -200, y: -300, z: 2.0, yaw: 6}),
    () => camFace(0, 5.4, 1, 0.45, t, d),
  ];
  const cam = makeCam(cams[i]());
  const allume = i === 2 && t < d * 0.55 ? (random(`hpn${f}`) > 0.25 ? 1 : 0.3) : 0;
  const decor = couloir(cam, f, {casier: casiersOuverts, neon: neonsCouloir(f, () => (allume ? 1 : null))});
  return (
    <Plan
      f={f}
      cam={cam}
      decor={decor}
      noir={noirBug(f, 'nb')}
      zoom={punch(t)}
      roll={[6, -3, 0, 4][i]}
      items={[{z: 5.4, el: <Perso cam={cam} id="z6" x={0} z={5.4} dos={dosPour(cam, 5.4, 1)} lum={0.55 + 0.4 * allume} teinte={VERT} worry={1} eyes={1.25} pupilY={-4} tilt={3} sweat={1} shiver={(random(`s6${f}`) - 0.5) * 4} breath={Math.sin(f / 5) * 3} />}]}
    />
  );
};

// ---------- 7. La porte rouge ----------
const SalleZeroScene = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('salleZero', f);
  const cams = [
    () => ({x: 0, y: -200, z: 6 + (14 * t) / d, yaw: Math.sin(f / 20) * 2}),
    () => ({x: 0, y: -400, z: 29.2 + (0.1 * t) / d}),
    () => ({x: 130, y: 20, z: 28.9, yaw: -10, pitch: 4}),
    () => ({x: 120, y: -230, z: 4.5, yaw: 0}),
  ];
  const cam = makeCam(cams[i]());
  const decor = couloir(cam, f, {casier: casiersOuverts, ouvreRouge: interpolate(f, [DUREES.salleZero * 0.5, DUREES.salleZero], [0.15, 0.35], clamp), neon: neonsCouloir(f)});
  return (
    <Plan
      f={f}
      cam={cam}
      decor={decor}
      noir={noirBug(f, 'nb')}
      zoom={punch(t)}
      roll={[0, 4, -5, 2][i]}
      items={[{z: 5.4, el: <Perso cam={cam} id="z7" x={0} z={5.4} dos={dosPour(cam, 5.4, 1)} lum={0.55} teinte={[1, 0.8, 0.8]} worry={1} breath={Math.sin(f / 6) * 3} />}]}
    />
  );
};

// ---------- 8. L'escalier sans fin ----------
const Escalier = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('escalier', f);
  if (i === 0) {
    const cam = makeCam({x: Math.sin(f / 9) * 40, y: -1100 + (300 * t) / d, z: 0.001, pitch: 89.5, yaw: f * 0.8});
    return <Plan f={f} decor={escalier(cam, f)} noir={noirBug(f, 'es')} zoom={punch(t)} roll={f * 0.5} />;
  }
  // il dévale la volée ; à chaque plan il repart du haut et retombe sur le même panneau
  const {z0, pas, n} = VOLEE;
  const k = Math.min(1, t / Math.max(1, d - 3));
  const zc = z0 - 0.2 + k * (n * pas + 0.5);
  const yc = marcheY(zc);
  const zF = z0 + n * pas + 1.4;
  const bas = SOL + n * VOLEE.h;
  const cams = {
    1: () => ({x: 170, y: yc - 720, z: zc - 1.25, pitch: 22, yaw: -3}),
    2: () => ({x: -160, y: yc - 300, z: zc - 1.0, pitch: 10, yaw: 6}),
    3: () => ({x: 60, y: bas - 200, z: zF - 0.45, yaw: 180, pitch: -14}),
    4: () => ({x: 0, y: bas - 1150, z: zF - 1.15 + (0.25 * t) / d, pitch: 0}),
  };
  const cam = makeCam(cams[i]());
  const decor = volee(cam, f, {ampoule: bug(f, 'amp')});
  const m = marche(f, 0.75, 1);
  return (
    <Plan
      f={f}
      cam={cam}
      decor={decor}
      noir={noirBug(f, 'es')}
      zoom={punch(t, 0.16)}
      roll={[0, -5, 6, -8, 9][i]}
      items={[{z: zc, el: <Perso cam={cam} id="z8" x={0} y={yc} z={zc} dos={dosPour(cam, zc, 1)} lum={0.55 + 0.35 * bug(f, 'amp')} teinte={[1, 0.9, 0.75]} lift={m.bob * 2} legG={m.legG} legD={m.legD} epauleG={m.bras * 3} epauleD={m.bras * 3} coudeG={-60} coudeD={60} worry={1} scream={0.3} sweat={1} />}]}
    />
  );
};

// ---------- 9. Le surveillant, de dos ----------
const SurveillantScene = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('surveillant', f);
  const cams = [
    () => ({x: 130, y: -230, z: 7.1 + (0.2 * t) / d, yaw: 0}),
    () => ({x: 70, y: -520, z: 15.7 + (0.15 * t) / d, yaw: 0, pitch: 2}),
    () => camFace(0, 8, 1, 0.6, t, d),
    () => ({x: -250, y: -150, z: 5.5, yaw: 5}),
  ];
  const cam = makeCam(cams[i]());
  const decor = couloir(cam, f, {casier: casiersOuverts, neon: neonsCouloir(f, (k) => (k === 7 ? bug(f, 'c9') : null))});
  const leve = interpolate(f, [DUREES.surveillant * 0.75, DUREES.surveillant * 0.85], [0, 1], clamp);
  return (
    <Plan
      f={f}
      cam={cam}
      decor={decor}
      noir={noirBug(f, 'nb')}
      zoom={punch(t)}
      roll={[0, 3, -3, 2][i]}
      items={[
        {z: 17, el: monstre(cam, 0, 17, {f, tour: 0})},
        {z: 8, el: <Perso cam={cam} id="z9" x={0} z={8} dos={dosPour(cam, 8, 1)} lum={0.55} teinte={VERT} epauleD={-150 * leve} coudeD={-20 * leve} smile={0.3 * leve} worry={0.6 * (1 - leve)} breath={Math.sin(f / 7) * 3} />},
      ]}
    />
  );
};

// ---------- 10. Il se retourne ----------
const Retourne = () => {
  const f = useCurrentFrame();
  const {i, t, d, bornes} = decoupe('retourne', f);
  const cams = [
    () => ({x: 130, y: -260, z: 7.4 + (0.3 * t) / d, yaw: 0}),
    () => ({x: 0, y: -520, z: 16.25 + (0.05 * t) / d, yaw: 0}),
    () => camFace(0, 8, 1, 0.42, t, d),
    () => ({x: 0, y: -520, z: 16.55, yaw: 0}),
    () => ({x: 100, y: 380, z: 14.8, pitch: -22, yaw: -2}),
  ];
  const cam = makeCam(cams[i]());
  const decor = couloir(cam, f, {casier: casiersOuverts, neon: neonsCouloir(f, (k) => (k === 7 ? bug(f, 'c10') : null))});
  const tour = interpolate(f, [6, bornes[1] - 2], [0, 1], ease);
  const ouvre = interpolate(f, [bornes[1] + 4, bornes[2]], [0, 1], ease);
  const peur = interpolate(f, [bornes[2], bornes[2] + 5], [0, 1], clamp);
  const flash = interpolate(f, [bornes[1] + 14, bornes[1] + 16, bornes[1] + 24], [0, 0.5, 0], clamp);
  return (
    <Plan
      f={f}
      cam={cam}
      decor={decor}
      noir={noirBug(f, 'nb')}
      zoom={punch(t, 0.18)}
      roll={[0, 4, -8, 6, -4][i]}
      items={[
        {z: 17, el: monstre(cam, 0, 17, {f, tour, ouvre})},
        {z: 8, el: <Perso cam={cam} id="z10" x={0} z={8} dos={dosPour(cam, 8, 1)} lum={0.55} teinte={VERT} worry={1} eyes={1 + 0.35 * peur} scream={peur} epauleG={35 * peur} coudeG={130 * peur} epauleD={-35 * peur} coudeD={-130 * peur} sweat={1} shiver={peur ? (random(`s10${f}`) - 0.5) * 8 : 0} />},
      ]}
      dessus={<rect width="1080" height="1920" fill="#ffe9e0" opacity={flash} />}
    />
  );
};

// ---------- 11. Il charge à quatre pattes ----------
const Charge = () => {
  const f = useCurrentFrame();
  const {i, t, d, bornes} = decoupe('charge', f);
  const zM = interpolate(f, [bornes[1], DUREES.charge], [17, 9.6], {...clamp, easing: Easing.in(Easing.quad)});
  const sh = i === 1 ? (random(`ch${f}`) - 0.5) * 24 : 0;
  const cams = [
    () => ({x: 150, y: -300, z: 15.2, yaw: -4}),
    () => ({x: 60 + sh, y: 400 + sh * 0.5, z: 8.6, pitch: -6, yaw: 0}),
    () => orbite(0, zM, 2.2, 168 + (24 * t) / d, -380, {pitch: 6}),
    () => camFace(0, 8, 1, 0.4, t, d),
  ];
  const cam = makeCam(cams[i]());
  const pattes = interpolate(f, [0, bornes[1] - 2], [0, 1], clamp);
  // les néons éclatent quand il passe dessous
  const neon = (k) => {
    const z = [0, 2.5, 5, 7.5, 10, 12.5, 15, 17.5][k] ?? 99;
    return z > zM && z < 17.5 ? 0 : k === 7 ? 0.6 : 0;
  };
  const eclats = (k, z) => {
    if (!(z > zM && z < zM + 1.2)) return null;
    return [...Array(10)].map((_, q) => {
      const p = cam.proj(-200 + random(`e${k}${q}`) * 400, PLAF + 30 + (zM + 1.2 - z) * 600 * random(`ey${q}`), z + 0.5);
      return cam.visible(z + 0.5, 0, PLAF) ? <circle key={q} cx={p[0]} cy={p[1]} r={6 * cam.scale(z + 0.5, 0, PLAF)} fill="#f4fffa" opacity="0.8" /> : null;
    });
  };
  const decor = couloir(cam, f, {casier: casiersOuverts, neon, eclats});
  return (
    <Plan
      f={f}
      cam={cam}
      decor={decor}
      noir={noirBug(f, 'nb')}
      zoom={punch(t, 0.18)}
      roll={[-3, 5, -6, 8][i]}
      items={[
        {z: zM, el: monstre(cam, 0, zM, {f, tour: 1, ouvre: 1, pattes})},
        {z: 8, el: <Perso cam={cam} id="z11" x={0} z={8} dos={dosPour(cam, 8, 1)} lum={0.55} teinte={VERT} worry={1} eyes={1.35} scream={1} epauleG={35} coudeG={130} epauleD={-35} coudeD={-130} sweat={1} shiver={(random(`s11${f}`) - 0.5) * 8} />},
      ]}
    />
  );
};

// ---------- 12. Le dilemme ----------
const Choix = ({f, debut, x, y, texte, emoji, couleur}) => {
  const p = spring({frame: f - debut, fps: 30, config: {damping: 9}});
  if (f < debut) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${p}) rotate(${(1 - p) * -12})`}>
      <rect x="-280" y="-90" width="560" height="180" rx="28" fill="#0b0b0e" opacity="0.85" stroke={couleur} strokeWidth="6" />
      <image href={staticFile(`emoji/${emoji}.svg`)} x="-255" y="-55" width="110" height="110" />
      <text x="-125" y="20" textAnchor="start" fontFamily="'DejaVu Sans', Arial, sans-serif" fontWeight="900" fontSize="52" fill="#fff">
        {texte}
      </text>
    </g>
  );
};
const Dilemme = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('dilemme', f);
  const cams = [
    () => ({x: 0, y: -540, z: 5.7 + (0.2 * t) / d, pitch: 12, yaw: 0}),
    () => ({x: 120, y: -150, z: 7.4, yaw: 24}),
    () => ({x: -120, y: -150, z: 7.3, yaw: -24}),
    () => orbite(0, 10.6, 1.6, 196 - (30 * t) / d, 150, {pitch: -10}),
    () => ({x: 0, y: -540, z: 5.4 + (0.3 * t) / d, pitch: 12, yaw: 0}),
  ];
  const cam = makeCam(cams[i]());
  const decor = couloir(cam, f, {casier: casiersOuverts, porteRouge: 8.6, ouvreRouge: 0.35, neon: neonsCouloir(f)});
  const regard = f < 60 ? 1 : f < 100 ? -1 : 0;
  return (
    <Plan
      f={f}
      cam={cam}
      decor={decor}
      noir={noirBug(f, 'nb')}
      zoom={punch(t)}
      roll={[-3, 4, -4, 6, 0][i]}
      items={[
        {z: 10.6, el: monstre(cam, 0, 10.6, {f: 300 + f * 0.15, tour: 1, ouvre: 1, pattes: 1})},
        {z: 8, el: <Perso cam={cam} id="z12" x={0} z={8} dos={dosPour(cam, 8, 1)} lum={0.6} teinte={[1, 0.9, 0.85]} worry={1} eyes={1.25} pupilX={regard * 5} tilt={regard * 4} sweat={1} breath={Math.sin(f / 4) * 4} />},
      ]}
      dessus={
        <g>
          <Choix f={f} debut={repere('dilemme', 'tu', 30)} x={760} y={190} texte="TU COURS ?" emoji="1f3c3" couleur="#3dff8a" />
          <Choix f={f} debut={repere('dilemme', 'ou', 65)} x={320} y={420} texte="SALLE 0 ?" emoji="1f6aa" couleur="#ff3b2a" />
          {f >= repere('dilemme', 'dis-le', 100) && (
            <g transform={`translate(540 1680) scale(${spring({frame: f - repere('dilemme', 'dis-le', 100), fps: 30, config: {damping: 10}})})`}>
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

const COMPOSANTS = {
  reveil: Reveil,
  classeVide: ClasseVide,
  tableau: Tableau,
  couloir: Couloir,
  casiers: Casiers,
  hautParleur: HautParleur,
  salleZero: SalleZeroScene,
  escalier: Escalier,
  surveillant: SurveillantScene,
  retourne: Retourne,
  charge: Charge,
  dilemme: Dilemme,
};

export const SalleZero = () => (
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
