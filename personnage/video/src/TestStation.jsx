import {useCurrentFrame} from 'remotion';
import {Voile} from './ForetNuit';
import {Plan} from './montage';
import {makeCam, Perso} from './moteur';
import {PENCHE, RodeurMonde} from './Rodeur';
import {eclaire, MOI, stationNuit, VOIT} from './StationNuit';

// banc d'essai : une vue par image
const VUES = [
  {x: 900, y: -260, z: -2.2, yaw: -14, pitch: 4},
  {x: -2600, y: -1600, z: -7, yaw: 18, pitch: 12},
  {x: 600, y: 300, z: 0.6, yaw: -40, pitch: -18},
  {x: 300, y: -200, z: 0.9, yaw: -20, pitch: 0},
  {x: 0, y: -150, z: -3, yaw: 0, pitch: 0},
  {x: -300, y: -150, z: 3.5, yaw: 160, pitch: 0},
];
export const TestStation = () => {
  const f = useCurrentFrame();
  const c = VUES[f % VUES.length];
  const cam = makeCam(c);
  const o = {compteur: 31.4};
  const t = eclaire(o, [MOI.x, -100, MOI.z]);
  const moi = {z: MOI.z, x: MOI.x, el: <Perso cam={cam} id="tm" x={MOI.x} z={MOI.z} lum={1} teinte={t} ombre={0.4} epauleD={-20} coudeD={120} />};
  const tr = eclaire(o, [-200, -400, MOI.z], 0.9);
  const cr = {z: MOI.z + 0.02, x: MOI.x - 250, y: -150, el: <RodeurMonde cam={cam} x={MOI.x - 250} z={MOI.z + 0.02} y={-150} pose={PENCHE} echelle={0.55} tete={25} lum={Math.max(...tr)} id="tr" />};
  const d = stationNuit(cam, f, {...o, extra: f >= 6 ? [moi] : [moi, cr]});
  return <Plan f={f} cam={cam} decor={d} items={[]} grain={0.03} vignette={0.8} dessus={<g>{d.poussiere}<Voile L={d.L} P={d.P} k={0.6} /></g>} />;
};
