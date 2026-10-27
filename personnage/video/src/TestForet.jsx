import {useCurrentFrame} from 'remotion';
import {chalet, chaletExt, Neige} from './Chalet';
import {foret, Voile} from './ForetNuit';
import {Plan} from './montage';
import {makeCam} from './moteur';
import {RodeurMonde, DEBOUT} from './Rodeur';

const IN = [
  {cam: {x: 900, y: -200, z: -0.3, yaw: -20, pitch: 2}, o: {porte: 0}},
  {cam: {x: -100, y: -150, z: 0.4, yaw: 25, pitch: 2}, o: {rouge: 0.8, ecran: 1, dehors: true}},
  {cam: {x: 1050, y: 360, z: 0.65, yaw: -40, pitch: -2}, o: {porte: 0.8}},
  {cam: {x: 600, y: -150, z: 0.1, yaw: -60, pitch: 3}, o: {}},
];
export const TestForet = () => {
  const f = useCurrentFrame();
  const k = f % 6;
  if (k < 4) {
    const c = IN[k];
    const cam = makeCam(c.cam);
    const o = {...c.o};
    if (o.dehors) o.dehors = <RodeurMonde cam={cam} x={450} z={6} pose={DEBOUT} />;
    const d = chalet(cam, f, o);
    return <Plan f={f} cam={cam} decor={d} items={[]} grain={0.02} vignette={0.7} dessus={d.voile} />;
  }
  const cam = makeCam(k === 4 ? {x: 600, y: -300, z: 9, yaw: 185, pitch: 0} : {x: 2400, y: 200, z: 6, yaw: 215, pitch: -3});
  const d = foret(cam, f, {nuit: 1, neige: 1, lumYaw: 180, degage: [[0, -1.5, 0, 4.5, 1800]]});
  return <Plan f={f} cam={cam} decor={d} items={[chaletExt(cam, f, {})]} grain={0.02} vignette={0.7} dessus={<g><Voile L={d.L} P={d.P} /><Neige f={f} /></g>} />;
};
