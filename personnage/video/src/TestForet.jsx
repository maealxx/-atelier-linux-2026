import {useCurrentFrame} from 'remotion';
import {station, boutiqueInt, VOIT} from './Station';
import {Plan} from './montage';
import {makeCam, Perso} from './moteur';
import {RodeurMonde, QUATRE} from './Rodeur';

const vise = (p, c) => {
  const dx = c[0] - p[0], dy = c[1] - p[1], dz = (c[2] - p[2]) * 1000;
  return {x: p[0], y: p[1], z: p[2], yaw: (Math.atan2(dx, dz) * 180) / Math.PI, pitch: (Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI};
};
const CONF = [
  vise([-200, -250, -2.2], [0, -200, 3]),
  vise([600, -100, -0.4], [-300, -50, 1.5]),
  vise([1800, -2400, -1.0], [-400, 0, 1.4]),
  vise([300, -150, 5.3], [-300, -100, 1.5]),
];
export const TestForet = () => {
  const f = useCurrentFrame();
  const k = f % 4;
  const cam = makeCam(CONF[k]);
  const creature = {z: 1.4, x: -430, y: VOIT.toit, el: <RodeurMonde cam={cam} x={-430} z={1.4} y={VOIT.toit} pose={QUATRE} echelle={0.55} />};
  const caissiere = {z: 5.9, x: 950, el: <Perso cam={cam} id="cs" x={950} z={5.9} lum={0.9} coiffure="queue" couleurs={{haut: '#2a6a8a', hautO: '#1f5470', chev: '#3a2418'}} />};
  const moi = {z: 1.1, x: 60, el: <Perso cam={cam} id="mo" x={60} z={1.1} lum={0.85} teinte={[0.85, 0.92, 1]} epauleD={-20} coudeD={120} />};
  if (k < 3) {
    const d = station(cam, f, {creature, caissiere, compteur: 23.47, extra: [moi], feuille: 1});
    return <Plan f={f} cam={cam} decor={d} items={[]} grain={0.02} vignette={0.7} />;
  }
  const d = boutiqueInt(cam, f, {creature, caissiere});
  const deh = [...d.dehors].sort((a, b) => cam.profondeur(b.z, b.x ?? cam.x, b.y ?? cam.y) - cam.profondeur(a.z, a.x ?? cam.x, a.y ?? cam.y));
  return <Plan f={f} cam={cam} decor={{fond: <g>{d.fond}{deh.map((o, i) => <g key={i}>{o.el}</g>)}{d.surf}{d.facade}</g>, brume: null, items: d.items}} items={[]} grain={0.02} vignette={0.7} />;
};
