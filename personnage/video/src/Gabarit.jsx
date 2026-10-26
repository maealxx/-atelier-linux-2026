import {interpolate, Series, useCurrentFrame} from 'remotion';
import {appart, quartier} from './Appart';
import {Telephone} from './Maison';
import {camFace, dosPour, montage, Plan, punch} from './montage';
import {clamp, makeCam, orbite, Perso} from './moteur';
import PLANS from './gabarit/plans.json';
import timeline from './gabarit/timeline.json';

// Gabarit de départ pour une nouvelle vidéo (n'importe quel thème, pas seulement l'horreur).
// 1. Copie ce fichier en src/<MaVideo>.jsx et ajoute sa <Composition> dans Root.jsx.
// 2. Une scène = un composant ; chaque scène est découpée en plans (poids dans plans.json).
// 3. Dans chaque plan : une caméra (cams[i]), un décor ({fond, items, brume}) et des persos triés en profondeur.
const {decoupe, repere, SCENES} = montage(timeline, PLANS);
export const DUREE_GABARIT = SCENES.reduce((t, [, d]) => t + d, 0);
const CHAUD = [1.05, 0.9, 0.78];

// ---------- 1. Le salon : plan large, gros plan, contrechamp ----------
const Salon = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('salon', f);
  const P = {x: 820, z: 1.9};
  const cams = [
    () => ({x: -1050, y: -330, z: 0.5 + (0.35 * t) / d, yaw: 26, pitch: 3}), // plan large qui avance
    () => camFace(P.x, P.z, 1, 0.5, t, d, {dy: -30}), // gros plan visage
    () => ({x: 850, y: -150, z: 3.2 + (1.2 * t) / d, yaw: 0}), // vue subjective vers la porte
  ];
  const cam = makeCam(cams[i]());
  const decor = appart(cam, f, {});
  return (
    <Plan f={f} cam={cam} decor={decor} noir={0.05} zoom={punch(t)} roll={[-2, 3, 0][i]}
      items={[{z: P.z, x: P.x, el: <Perso cam={cam} id="g1" x={P.x} z={P.z} dos={dosPour(cam, P.z, 1)} lum={0.85} teinte={CHAUD} smile={0.5} breath={Math.sin(f / 8) * 3} />}]}
    />
  );
};

// ---------- 2. Un message arrive (le téléphone par-dessus la scène) ----------
const Message = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('message', f);
  const cam = makeCam({x: 300, y: -250, z: 1.6, yaw: 15});
  const decor = appart(cam, f, {});
  const tel = [
    <Telephone key="v" f={f} nom="Lucas 🎧" verrouille notif={{debut: 10, texte: 'Lucas : t’es où ?'}} echelle={0.85} y={1100} vibre={interpolate(f, [10, 30], [1, 0], clamp)} />,
    <Telephone key="c" f={f} nom="Lucas 🎧" messages={[{debut: repere('message', 'coucou', 70), texte: 'coucou 👋 on se rejoint en bas ?'}]} echelle={1.05 + (0.12 * t) / d} y={980} />,
  ][i];
  return <Plan f={f} cam={cam} decor={decor} noir={0.05} zoom={punch(t)} roll={[-2, 0][i]} dessus={<g><rect width="1080" height="1920" fill="#000" opacity="0.45" />{tel}</g>} />;
};

// ---------- 3. La rue vue d'en haut, puis en orbite autour d'un perso 3D ----------
const Rue = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('rue', f);
  const L = {x: -760, z: 7.35};
  const cams = [
    () => ({x: 0, y: -4700, z: 9.72, yaw: 180, pitch: 46 + (10 * t) / d}), // plongée depuis une fenêtre
    () => orbite(L.x, L.z, 2.2 - (0.6 * t) / d, 205 - (30 * t) / d, -2600 + (1300 * t) / d, {pitch: 48 - (12 * t) / d}), // descente drone
    () => orbite(L.x, L.z, 1.0, 160 + (35 * t) / d, 300, {pitch: -24}), // contre-plongée
  ];
  const cam = makeCam(cams[i]());
  const coucou = interpolate(f, [d * 2, d * 2 + 6], [0, 1], clamp);
  const decor = quartier(cam, f, {livreur: {...L, coucou}, passage: i === 0 ? -8000 + t * 230 : null});
  return <Plan f={f} cam={cam} decor={decor} noir={0.06} zoom={punch(t)} roll={[0, 3 - (6 * t) / d, -3][i]} />;
};

const COMPOSANTS = {salon: Salon, message: Message, rue: Rue};
export const Gabarit = () => (
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
