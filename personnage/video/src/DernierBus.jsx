import {AbsoluteFill, Easing, interpolate, random, Series, spring, staticFile, useCurrentFrame} from 'remotion';
import {Creature, Poussette, ruelle, vague} from './Decors';
import {clamp, Finition, flick, makeCam, marche, orbite, Perso, YeuxRouges} from './moteur';
import {bus, LAMPES, rue, SOL} from './Rue';
import PLANS from './plans.json';
import timeline from './timeline.json';

// Les scènes et leur durée viennent de timeline.json (généré par voix/generer.py à partir de la voix off).
export const SCENES = timeline.scenes.map((s) => [s.nom, s.frames]);
export const DUREE_BUS = SCENES.reduce((t, [, d]) => t + d, 0);

const CHAUD = [1, 0.82, 0.68];
const ease = {...clamp, easing: Easing.inOut(Easing.sin)};

// Lumière reçue à une profondeur donnée, d'après les lampadaires proches
const lumiere = (z, lampe, ambiance = 0.45) => {
  let v = 0;
  LAMPES.forEach((l) => {
    const d = Math.abs(l.z - z);
    if (d < 1.6) v = Math.max(v, lampe(l) * (1 - d / 1.6));
  });
  return ambiance + (1 - ambiance) * Math.min(1, v * 1.3);
};

// Assemble un plan : décor + éléments triés en profondeur + voiles par-dessus
const Plan = ({f, decor, items = [], noir = 0, dessus = null, flou = 0, roll = 0, zoom = 1}) => {
  const tous = [...decor.items, ...items].filter(Boolean).sort((a, b) => b.z - a.z);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <defs>
          <filter id="plan-flou" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation={flou} />
          </filter>
        </defs>
        <g filter={flou ? 'url(#plan-flou)' : undefined} transform={`rotate(${roll} 540 960) translate(540 960) scale(${zoom * (1 + Math.abs(roll) * 0.012)}) translate(-540 -960)`}>
          {decor.fond}
          {decor.brume}
          {tous.map((o, i) => (
            <g key={i}>{o.el}</g>
          ))}
        </g>
        <rect x="0" y="0" width="1080" height="1920" fill="#000" opacity={noir} />
        {dessus}
        <Finition f={f} />
      </svg>
    </AbsoluteFill>
  );
};

// ================= MONTAGE EN PLANS COURTS =================
const DUREES = Object.fromEntries(timeline.scenes.map((s) => [s.nom, s.frames]));
// Dans quelle coupe de la scène on est : i (n° du plan), t (image dans le plan), d (durée du plan), bornes (début de chaque plan)
const decoupe = (nom, f) => {
  const poids = PLANS[nom];
  const total = poids.reduce((a, b) => a + b, 0);
  const bornes = [0];
  poids.forEach((p) => bornes.push(Math.round(bornes[bornes.length - 1] + (p / total) * DUREES[nom])));
  let i = 0;
  while (i < poids.length - 1 && f >= bornes[i + 1]) i++;
  return {i, t: f - bornes[i], d: bornes[i + 1] - bornes[i], bornes};
};
// Petit coup de zoom à chaque coupe
const punch = (t, fort = 0.12) => interpolate(t, [0, 8], [1 + fort, 1], {...clamp, easing: Easing.out(Easing.cubic)});
// Le perso regarde vers +Z (dir = 1) ou vers -Z (dir = -1) : on le voit de dos si la caméra est derrière lui
const dosPour = (cam, z, dir) => (dir > 0 ? cam.z < z : cam.z > z);
// Gros plan visage, caméra en face (dist en Z, se rapproche doucement)
const FACE_Y = -150;
const camFace = (x, z, dir, dist, t, d, {dx = 0, dy = 0, push = 0.1, pitch = 0} = {}) => ({
  x: x + dx,
  y: FACE_Y + dy,
  z: z + dir * (dist - (push * t) / Math.max(d, 1)),
  yaw: dir > 0 ? 180 : 0,
  pitch,
});

// ---------- 1. Le bus part sans toi ----------
const BusPart = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('busPart', f);
  const z = interpolate(f, [0, 80], [1.45, 2.45], {...clamp, easing: Easing.out(Easing.quad)});
  const cams = [
    () => ({x: 90 + Math.sin(f / 5) * 8, y: 385, z: z - 0.6, pitch: -10, yaw: 4}),
    () => orbite(60, z, 1.25, 55 - (10 * t) / d, -160),
    () => camFace(60, z, 1, 0.65, t, d),
    () => ({x: 200, y: -320, z: 0.35 + (0.2 * t) / d, pitch: 9, yaw: -10 - (8 * t) / d}),
  ];
  const cam = makeCam(cams[i]());
  const lampe = (l) => (Math.abs(l.z - 3.7) < 0.1 && l.cote === 'D' ? flick(f, 'l1', 0, 200, 0.5) : 1);
  const decor = rue(cam, f, {lampe});
  const zBus = 3.4 + interpolate(f, [10, 180], [0, 17], {...clamp, easing: Easing.in(Easing.quad)});
  const amp = interpolate(f, [0, 60, 85], [1, 1, 0], clamp);
  const m = marche(f, 0.55, amp);
  const tend = interpolate(f, [4, 16, 65, 90], [0, 1, 1, 0], clamp);
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.04}
      zoom={punch(t)}
      roll={[3, -4, 2, 0][i]}
      items={[
        bus(cam, f, {zp: zBus, sens: 'arriere', numero: '42', porte: interpolate(f, [0, 12], [0.8, 0], clamp)}),
        {
          z,
          el: (
            <Perso cam={cam} id="p1" x={60} z={z} dos={dosPour(cam, z, 1)} lum={lumiere(z, lampe)} teinte={CHAUD} lift={m.bob} legG={m.legG} legD={m.legD} epauleG={130 * tend + m.bras} coudeG={-20 * tend} epauleD={-m.bras} breath={f > 85 ? Math.sin(f / 4) * 6 : 0} worry={0.8} scream={0.3 * tend} sweat={0.6} />
          ),
        },
      ]}
    />
  );
};

// ---------- 2. À pied ----------
const APied = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('aPied', f);
  const z = 12.3 + f * 0.0085;
  const cams = [
    () => ({x: 120 + Math.sin(f / 50) * 60, y: -1850 + (300 * t) / d, z: z - 2.7, pitch: 34, yaw: -6 + (6 * t) / d}),
    () => camFace(150, z, 1, 0.75, t, d, {dy: 20}),
    () => ({x: 170, y: 395, z: z + 0.65 - (0.1 * t) / d, yaw: 180, pitch: -12}),
  ];
  const cam = makeCam(cams[i]());
  const fenetre = (cle, dd) => (dd && f < 10 + random(`off${cle}`) * 140 ? 1 : 0);
  const decor = rue(cam, f, {fenetre});
  const m = marche(f, 0.3, 0.8);
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.07}
      zoom={punch(t)}
      roll={[Math.sin(f / 45) * 2, -3, 4][i]}
      items={[{z, el: <Perso cam={cam} id="p2" x={150} z={z} dos={dosPour(cam, z, 1)} lum={lumiere(z, () => 1)} teinte={CHAUD} lift={m.bob} legG={m.legG} legD={m.legD} epauleG={m.bras} epauleD={m.bras} breath={Math.sin(f / 8) * 3} worry={0.3} pupilX={Math.sin(f / 20) * 3} />}]}
    />
  );
};

// ---------- 3. La ruelle ----------
const Ruelle = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('ruelle', f);
  const z = 0.55 + f * 0.0105;
  const cams = [
    () => ({x: 60, y: interpolate(t, [0, d], [300, 0]), z: z - 1.0, pitch: interpolate(t, [0, d], [-10, 2]), yaw: 4}),
    () => ({x: 0, y: -150, z: z + 0.05, yaw: Math.sin(f / 15) * 6, pitch: -2}),
    () => camFace(0, z, 1, 0.6, t, d),
    () => ({x: 0, y: -1650, z: z - 1.15, pitch: 52, yaw: 0}),
  ];
  const cam = makeCam(cams[i]());
  const ampoule = (k) => (k === 0 ? flick(f, 'ru0', 30, 200, 0.15) : 1);
  const decor = ruelle(cam, f, {ampoule});
  const m = marche(f, 0.3, 0.8);
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.05}
      zoom={punch(t)}
      roll={[-3, 2, 4, 0][i]}
      items={[{z, el: <Perso cam={cam} id="r3" x={0} z={z} dos={dosPour(cam, z, 1)} lum={0.4 + 0.6 * ampoule(0)} teinte={[0.95, 0.95, 0.75]} lift={m.bob} legG={m.legG} legD={m.legD} epauleG={m.bras} epauleD={m.bras} breath={Math.sin(f / 8) * 3} worry={0.5} pupilX={Math.sin(f / 12) * 4} />}]}
    />
  );
};

// ---------- 4. La poussette ----------
const billboardPoussette = (cam, x, z, f, roule) => {
  if (!cam.visible(z, x, 0)) return null;
  const [px, py] = cam.proj(x, SOL, z);
  return (
    <g transform={`translate(${px} ${py}) scale(${cam.scale(z, x, 0)})`}>
      <ellipse rx="220" ry="30" fill="#000" opacity="0.5" />
      <Poussette f={f} roule={roule} />
    </g>
  );
};
const PoussetteScene = () => {
  const f = useCurrentFrame();
  const {i, t, d, bornes} = decoupe('poussette', f);
  const zP = interpolate(f, [5, bornes[2] + 10], [10, 3.75], {...clamp, easing: Easing.out(Easing.quad)});
  const z = 3.0;
  const cams = [
    () => ({x: 150 + Math.sin(f / 25) * 10, y: -210, z: 1.9 + (0.25 * t) / d, pitch: 2, yaw: 2}),
    () => ({x: 120, y: 385, z: zP - 0.8, pitch: -9, yaw: Math.sin(f / 9) * 3}),
    () => ({x: 120, y: 290, z: 3.78 - (0.12 * t) / d, yaw: 180, pitch: -13}),
    () => ({x: 120, y: -170, z: zP - 0.5 + (0.12 * t) / d, yaw: 0, pitch: 4}),
    () => camFace(0, z, 1, 0.36, t, d, {dy: -10}),
  ];
  const cam = makeCam(cams[i]());
  const ampoule = (k) => (k === 0 ? flick(f, 'ru1', 0, 220, 0.3) : 1);
  const decor = ruelle(cam, f, {ampoule});
  const peur = interpolate(f, [bornes[1], bornes[2]], [0, 1], clamp);
  const dos = dosPour(cam, z, 1);
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.05}
      zoom={punch(t, i === 4 ? 0.2 : 0.12)}
      roll={[2, -3, 6, 0, 9][i]}
      items={[
        {z: zP, el: billboardPoussette(cam, 120, zP, f, f < bornes[2] + 10 ? 1 : 0)},
        {
          z,
          el: (
            <Perso cam={cam} id="r4" x={0} z={z} dos={dos} lum={0.5 + 0.5 * ampoule(0)} teinte={[0.95, 0.95, 0.75]} breath={Math.sin(f / 5) * 4} epauleG={-6 * peur} epauleD={6 * peur} coudeG={-20 * peur} coudeD={20 * peur} worry={0.5 + 0.5 * peur} eyes={1 + 0.3 * peur} pupilY={i >= 2 ? 3 : 0} scream={i === 4 ? 0.35 : 0} sweat={peur} shiver={peur ? (random(`r4${f}`) - 0.5) * 6 : 0} />
          ),
        },
      ]}
    />
  );
};

// ---------- 5. Les yeux entre les poubelles ----------
const Poubelles = () => {
  const f = useCurrentFrame();
  const {i, t, d, bornes} = decoupe('poubelles', f);
  const vite = interpolate(f, [bornes[2], bornes[3]], [0, 1], clamp);
  const z = 5.0 + f * 0.0075 + Math.max(0, f - bornes[2]) * 0.007;
  const cams = [
    () => ({x: -40 + Math.sin(f / 35) * 25, y: -130, z: z + 1.15, yaw: 186, pitch: 1}),
    () => ({x: 20, y: 250, z: 3.9 + (0.15 * t) / d, yaw: -24, pitch: 0}),
    () => camFace(110, z, 1, 0.5, t, d),
    () => ({x: 110 + Math.sin(f / 4) * 10, y: 390, z: z - 0.75, pitch: -10, yaw: 2}),
  ];
  const cam = makeCam(cams[i]());
  const ampoule = (k) => (k === 1 ? flick(f, 'ru2', 40, 200, 0.25) : 1);
  const decor = ruelle(cam, f, {ampoule});
  const m = marche(f, 0.3 + 0.2 * vite, 0.8 + 0.2 * vite);
  const regard = i === 2 ? 1 : 0;
  const yeux = bornes[1] - 8;
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.06}
      zoom={punch(t)}
      roll={[3, -5, 5, -3][i]}
      items={[
        {
          z,
          el: (
            <Perso cam={cam} id="r5" x={110} z={z} dos={dosPour(cam, z, 1)} lum={0.5 + 0.5 * ampoule(1)} teinte={[0.95, 0.95, 0.75]} lift={m.bob} legG={m.legG} legD={m.legD} epauleG={m.bras} epauleD={m.bras} worry={0.5 + 0.5 * Math.max(regard, vite)} pupilX={6 * regard} tilt={6 * regard} eyes={1 + 0.25 * regard} sweat={vite} breath={Math.sin(f / 5) * 3} />
          ),
        },
      ]}
      dessus={f >= yeux ? <YeuxRouges cam={cam} id="yr5" x={-300} y={300} z={4.65} taille={0.8} ouvert={(f - yeux) % 55 < 3 ? 0.1 : interpolate(f, [yeux, yeux + 7], [0.1, 1], clamp)} /> : null}
    />
  );
};

// ---------- 6. Le vieil arrêt ----------
const Arret = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('arret', f);
  const D = DUREES.arret;
  const z = interpolate(f, [0, D * 0.85], [0.8, 2.35], clamp);
  const cams = [
    () => ({x: interpolate(t, [0, d], [400, 300]), y: interpolate(t, [0, d], [-1150, -450]), z: interpolate(t, [0, d], [-1.4, 0.2]), pitch: interpolate(t, [0, d], [26, 8]), yaw: -4}),
    () => ({x: 250, y: -230, z: 2.7 + (0.15 * t) / d, yaw: 7, pitch: -2}),
    () => camFace(220, z, 1, 0.55, t, d),
    () => ({x: 20, y: 300, z: 4.6, yaw: 186, pitch: -6}),
  ];
  const cam = makeCam(cams[i]());
  const neon = flick(f, 'ne6', 0, 200, 0.1);
  const decor = vague(cam, f, {neon});
  const m = marche(f, 0.3, interpolate(f, [0, D * 0.75, D * 0.85], [0.8, 0.8, 0], clamp));
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.04}
      zoom={punch(t)}
      roll={[-3, 5, -3, 2][i]}
      items={[{z, el: <Perso cam={cam} id="v6" x={220} z={z} dos={dosPour(cam, z, 1)} lum={0.45 + 0.4 * neon} teinte={[0.8, 0.95, 0.88]} lift={m.bob} legG={m.legG} legD={m.legD} epauleG={m.bras} epauleD={m.bras} breath={Math.sin(f / 7) * 3} worry={0.7} pupilY={-2} />}]}
    />
  );
};

// ---------- 7. Le post-it ----------
const PostIt = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('postit', f);
  const cams = [
    () => ({x: 260, y: -190, z: 1.9 + (0.35 * t) / d, yaw: 4}),
    () => ({x: 330, y: -40, z: 3.6 + (0.16 * t) / d, yaw: 0}),
    () => camFace(170, 2.75, 1, 0.55, t, d),
    () => ({x: 318, y: -50, z: 3.74, yaw: -3}),
  ];
  const cam = makeCam(cams[i]());
  const neon = flick(f, 'ne7', 0, 200, 0.15);
  const decor = vague(cam, f, {neon});
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.04}
      zoom={punch(t, i === 3 ? 0.25 : 0.12)}
      roll={[0, -2, 4, -9][i]}
      items={[{z: 2.75, el: <Perso cam={cam} id="v7" x={170} z={2.75} dos={dosPour(cam, 2.75, 1)} lum={0.45 + 0.4 * neon} teinte={[0.8, 0.95, 0.88]} breath={Math.sin(f / 7) * 3} worry={1} eyes={1.25} pupilY={-2} sweat={0.7} />}]}
    />
  );
};

// ---------- 8. Le vieux bus arrive ----------
const VIEUX = {sens: 'avant', numero: '- -', interieur: '#5a1a12', vieux: true};
const BusVieux = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('busVieux', f);
  const D = DUREES.busVieux;
  const zBus = interpolate(f, [5, D * 0.8], [26, 2.0], {...clamp, easing: Easing.out(Easing.cubic)});
  const approche = interpolate(zBus, [2, 26], [1, 0], clamp);
  const cams = [
    () => ({x: 430, y: 240, z: 0.25, pitch: -8, yaw: -3 - (4 * t) / d}),
    () => camFace(230, 2.3, -1, 0.55, t, d),
    () => ({x: -560, y: 380, z: zBus - 1.35, yaw: Math.sin(f / 7) * 2, pitch: -10}),
    () => ({x: 480, y: 250, z: zBus + 0.2 + (0.5 * t) / d, yaw: -62, pitch: -4}),
    () => ({x: 120, y: -150, z: 0.2, yaw: -8, pitch: -2}),
  ];
  const cam = makeCam(cams[i]());
  const neon = flick(f, 'ne8', 0, 200, 0.2);
  const decor = vague(cam, f, {neon});
  const flash = interpolate(f, [D * 0.55, D * 0.65, D * 0.75], [0, 0.35, 0], clamp);
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.06}
      zoom={punch(t)}
      roll={[2, -4, 3, 0, -2][i]}
      items={[
        bus(cam, f, {...VIEUX, zp: zBus, phares: 1, led: flick(f, 'led8', 0, 200, 0.1)}),
        {z: 2.3, el: <Perso cam={cam} id="v8" x={230} z={2.3} dos={dosPour(cam, 2.3, -1)} lum={0.4 + 0.5 * approche} teinte={[0.95, 0.92, 0.85]} breath={Math.sin(f / 6) * 3} worry={0.6} pupilX={-5} tilt={-4} eyes={1 + 0.2 * approche} />},
      ]}
      dessus={<rect width="1080" height="1920" fill="#fff6dc" opacity={flash} />}
    />
  );
};

// ---------- 9. Les portes s'ouvrent ----------
const Portes = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('portes', f);
  const cams = [
    () => ({x: 330, y: -100, z: 1.45 + (0.15 * t) / d, yaw: -24, pitch: 1}),
    () => camFace(230, 2.3, -1, 0.5, t, d),
    () => ({x: 330, y: -40, z: 3.72, yaw: 0}),
    () => orbite(230, 2.3, 0.95, -26 + (44 * t) / d, -150, {pitch: 1}),
    () => camFace(230, 2.3, -1, 0.38, t, d),
  ];
  const cam = makeCam(cams[i]());
  const neon = flick(f, 'ne9', 0, 240, 0.2);
  const decor = vague(cam, f, {neon});
  const porte = interpolate(f, [4, 34], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
  const zone = <polygon points={cam.poly([...Array(16)].map((_, k) => [-20 + Math.cos((k / 16) * 6.283) * 500, SOL - 1, 2.45 + Math.sin((k / 16) * 6.283) * 0.5]))} fill="#ff2a12" opacity={0.25 * porte * (0.7 + 0.3 * neon)} />;
  const regard = i === 1 ? -1 : i === 3 ? (t < d / 2 ? -1 : 1) : 0;
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.06}
      zoom={punch(t)}
      roll={[0, 4, -6, 2, -7][i]}
      items={[
        bus(cam, f, {...VIEUX, zp: 2.0, phares: 0.6, porte, led: flick(f, 'led9', 0, 240, 0.1)}),
        {z: 2.5, el: zone},
        {z: 2.3, el: <Perso cam={cam} id="v9" x={230} z={2.3} dos={dosPour(cam, 2.3, -1)} lum={0.75} teinte={[1, 0.85, 0.8]} breath={Math.sin(f / 6) * 4} worry={0.9} eyes={1.15} pupilX={regard * 5} tilt={regard * 5} sweat={0.8} />},
      ]}
    />
  );
};

// ---------- 10. Un souffle dans la nuque ----------
const Souffle = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('souffle', f);
  const cams = [
    () => camFace(230, 2.3, -1, 0.5, t, d),
    () => ({x: 380, y: -110, z: 2.78, yaw: 200, pitch: 2}),
    () => camFace(230, 2.3, -1, 0.27, t, d, {dy: -18, push: 0.04}),
    () => camFace(230, 2.3, -1, 0.45, t, d),
  ];
  const cam = makeCam(cams[i]());
  const decor = vague(cam, f, {neon: flick(f, 'ne10', 0, 200, 0.3)});
  const peur = interpolate(f, [15, 30], [0, 1], clamp);
  const bouffees = [10, 45, 80, 112].map((t0, k) => {
    const r = f - t0;
    if (r < 0 || r > 30 || !cam.visible(2.36, 230, -70)) return null;
    return [-1, 1].map((c) => {
      const p = cam.proj(230 + c * (90 + r * 6), -70 - r * 2, 2.36);
      const s = cam.scale(2.36, 230, -70);
      return <ellipse key={`${k}${c}`} cx={p[0]} cy={p[1]} rx={(40 + r * 5) * s} ry={(22 + r * 3) * s} fill="#e8eef0" opacity={0.3 * (1 - r / 30)} />;
    });
  });
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.08}
      zoom={punch(t, 0.16)}
      roll={[-4, 3, -7, -12][i]}
      items={[
        bus(cam, f, {...VIEUX, zp: 2.0, phares: 0.6, porte: 1}),
        {z: 2.36, el: <g>{bouffees}</g>},
        {z: 2.3, el: <Perso cam={cam} id="v10" x={230} z={2.3} dos={dosPour(cam, 2.3, -1)} lum={0.75} teinte={[1, 0.85, 0.8]} breath={Math.sin(f / 4) * 3} worry={0.6 + 0.4 * peur} eyes={1 + 0.35 * peur} pupilX={peur * 4} pupilY={-2 * peur} sweat={peur} shiver={peur ? (random(`s10${f}`) - 0.5) * 10 : 0} />},
      ]}
    />
  );
};

// ---------- 11. La créature ----------
const CreatureScene = () => {
  const f = useCurrentFrame();
  const {i, t, d, bornes} = decoupe('creature', f);
  const sh = i >= 1 && t < 25 ? (random(`c11${f}`) - 0.5) * 30 * (1 - t / 25) : 0;
  const cams = [
    () => camFace(230, 2.3, -1, 0.45, t, d),
    () => ({x: 230 + sh, y: 250 + (80 * t) / d, z: 1.35 - (0.5 * t) / d, pitch: -12 - (18 * t) / d}),
    () => ({x: 230, y: -1900, z: 1.65 + (0.25 * t) / d, pitch: 2}),
    () => camFace(230, 2.3, -1, 0.4, t, d),
    () => ({x: -420, y: 390, z: 2.45, yaw: -16, pitch: -6}),
  ];
  const cam = makeCam(cams[i]());
  const decor = vague(cam, f, {neon: i === 0 ? 1 : flick(f, 'ne11', 0, 200, 0.2)});
  const monte = interpolate(f, [bornes[1], bornes[1] + 35], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const peur = interpolate(f, [bornes[1] + 10, bornes[1] + 20], [0, 1], clamp);
  const flash = interpolate(f, [bornes[1], bornes[1] + 2, bornes[1] + 10], [0, 0.6, 0], clamp);
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.04}
      zoom={punch(t, 0.18)}
      roll={[-3, -6, 0, 8, 4][i]}
      items={[
        {
          z: 3.2,
          el: cam.visible(3.2, 230, -1200) ? (
            <g transform={`translate(${cam.proj(230, SOL, 3.2).join(' ')}) scale(${cam.scale(3.2, 230, -1200)})`}>
              <Creature f={f} monte={monte} gueule={interpolate(f, [bornes[2], bornes[3]], [0.3, 1], ease)} />
            </g>
          ) : null,
        },
        {z: 2.3, el: <Perso cam={cam} id="v11" x={230} z={2.3} dos={dosPour(cam, 2.3, -1)} lum={0.8} teinte={[0.9, 0.9, 1]} breath={Math.sin(f / 4) * 3} worry={1} eyes={1 + 0.35 * peur} scream={peur} epauleG={35 * peur} coudeG={130 * peur} epauleD={-35 * peur} coudeD={-130 * peur} sweat={1} shiver={peur ? (random(`s11${f}`) - 0.5) * 8 : 0} />},
      ]}
      dessus={<rect width="1080" height="1920" fill="#e9f7ff" opacity={flash} />}
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
      <text x="-130" y="20" textAnchor="start" fontFamily="'DejaVu Sans', Arial, sans-serif" fontWeight="900" fontSize="54" fill="#fff">
        {texte}
      </text>
    </g>
  );
};
const Dilemme = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('dilemme', f);
  const cams = [
    () => ({x: 120, y: -120, z: 0.05 + (0.15 * t) / d, yaw: 1, pitch: -7}),
    () => ({x: 330, y: -100, z: 1.5 + (0.15 * t) / d, yaw: -24, pitch: 1}),
    () => ({x: 620, y: -1900, z: 2.2 + (0.2 * t) / d, pitch: 2}),
    () => camFace(230, 2.3, -1, 0.45, t, d),
    () => ({x: 120, y: -120, z: 0.25 + (0.25 * t) / d, yaw: 1, pitch: -7}),
  ];
  const cam = makeCam(cams[i]());
  const decor = vague(cam, f, {neon: flick(f, 'ne12', 0, 200, 0.25)});
  const regard = f < 70 ? -1 : f < 110 ? 1 : 0;
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.05}
      zoom={punch(t)}
      roll={[-3, 4, -5, 3, 0][i]}
      items={[
        bus(cam, f, {...VIEUX, zp: 2.0, phares: 0.6, porte: 1}),
        {z: 2.5, el: <polygon points={cam.poly([...Array(16)].map((_, k) => [-20 + Math.cos((k / 16) * 6.283) * 500, SOL - 1, 2.45 + Math.sin((k / 16) * 6.283) * 0.5]))} fill="#ff2a12" opacity="0.25" />},
        {
          z: 3.6,
          el: cam.visible(3.6, 620, -1200) ? (
            <g transform={`translate(${cam.proj(620, SOL, 3.6).join(' ')}) scale(${cam.scale(3.6, 620, -1200)})`}>
              <Creature f={f} monte={1} gueule={0.6} />
            </g>
          ) : null,
        },
        {z: 2.3, el: <Perso cam={cam} id="v12" x={230} z={2.3} dos={dosPour(cam, 2.3, -1)} lum={0.8} teinte={[1, 0.88, 0.85]} breath={Math.sin(f / 5) * 4} worry={1} eyes={1.2} pupilX={regard * 5} tilt={regard * 4} sweat={1} />},
      ]}
      dessus={
        <g>
          <Choix f={f} debut={36} x={320} y={190} texte="TU MONTES ?" emoji="1f68c" couleur="#ff3b2a" />
          <Choix f={f} debut={75} x={760} y={560} texte="TU RESTES ?" emoji="1f479" couleur="#8fd3ff" />
          {f >= 112 && (
            <g transform={`translate(540 1680) scale(${spring({frame: f - 112, fps: 30, config: {damping: 10}})})`}>
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
  busPart: BusPart,
  aPied: APied,
  ruelle: Ruelle,
  poussette: PoussetteScene,
  poubelles: Poubelles,
  arret: Arret,
  postit: PostIt,
  busVieux: BusVieux,
  portes: Portes,
  souffle: Souffle,
  creature: CreatureScene,
  dilemme: Dilemme,
};

export const DernierBus = () => (
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
