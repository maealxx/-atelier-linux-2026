import {useCurrentFrame} from 'remotion';
import {foret, Voile, OEIL, CHENE} from './ForetNuit';
import {Plan} from './montage';
import {makeCam} from './moteur';
import {RodeurMonde, DEBOUT, ECARTE, QUATRE, melange} from './Rodeur';

const CONF = [
  {cam: {x: 30, y: OEIL, z: 2, yaw: 0}, o: {nuit: 0}},
  {cam: {x: 30, y: OEIL, z: 8, yaw: -40}, o: {nuit: 0.35}},
  {cam: {x: 0, y: OEIL, z: 10.5, yaw: 180}, o: {nuit: 0.85, lumYaw: 180}, rod: {x: 0, z: 6.0, pose: DEBOUT, tete: 20}},
  {cam: {x: 0, y: OEIL, z: 10.5, yaw: 180}, o: {nuit: 0.85, lumYaw: 180}, rod: {x: 0, z: 8.0, pose: ECARTE}, zoom: 1.6},
  {cam: {x: 0, y: OEIL, z: 10.5, yaw: 180}, o: {nuit: 0.85, lumYaw: 180}, rod: {x: 0, z: 8.5, pose: QUATRE, ouvre: 1}},
  {cam: {x: CHENE.x + 40, y: 170, z: CHENE.z + 0.62, yaw: 175, pitch: -10}, o: {nuit: 1, lumYaw: 170}},
];
export const TestForet = () => {
  const f = useCurrentFrame();
  const c = CONF[f % CONF.length];
  const cam = makeCam(c.cam);
  const d = foret(cam, f, c.o);
  const items = c.rod ? [{z: c.rod.z, x: c.rod.x, el: <RodeurMonde cam={cam} {...c.rod} />}] : [];
  return <Plan f={f} cam={cam} decor={d} items={items} zoom={c.zoom || 1} grain={0.025} vignette={0.75} dessus={<g>{d.poussiere}<Voile L={d.L} P={d.P} /></g>} />;
};
