import {useCurrentFrame} from 'remotion';
import {Plan} from './montage';
import {makeCam, Perso} from './moteur';
import {CAISSE_P, dedans, eclaireDedans} from './StationNuit';

const VUES = [
  {x: 300, y: -170, z: 5.9, yaw: 25, pitch: 2},
  {x: 0, y: -170, z: 9.0, yaw: 180, pitch: 0},
  {x: 200, y: -170, z: 6.0, yaw: 180, pitch: 0},
  {x: 600, y: -200, z: 6.0, yaw: 55, pitch: 0},
];
export const TestStation2 = () => {
  const f = useCurrentFrame();
  const c = VUES[f % VUES.length];
  const cam = makeCam(c);
  const o = {boutique: f >= 4 ? [0, 1, 0, 0] : [1, 1, 1, 1]};
  const t = eclaireDedans(o, [CAISSE_P.x, -200, CAISSE_P.z]);
  const ca = {z: CAISSE_P.z, x: CAISSE_P.x, el: <Perso cam={cam} id="tc" x={CAISSE_P.x} z={CAISSE_P.z} lum={1} teinte={t} ombre={0.3} coiffure="queue" cils couleurs={{haut: '#2a6a8a', hautO: '#1f5470', chev: '#3a2418'}} />};
  const d = dedans(cam, f, {...o, caissiere: ca, dehors: {compteur: 41.8}});
  return <Plan f={f} cam={cam} decor={d} items={[]} grain={0.03} vignette={0.8} />;
};
