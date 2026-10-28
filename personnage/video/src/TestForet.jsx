import {useCurrentFrame, AbsoluteFill} from 'remotion';
import {Quai, Facade, Interieur, Arriere} from './Station2D';
import {QUATRE} from './Rodeur';
import {Finition} from './moteur';

const V = [
  (f) => <Quai cam={{x: 200, y: 0, zoom: 1}} f={f} o={{compteur: 23.4, moi: {pose: {epauleD: -20, coudeD: 120}}, creature: {pose: QUATRE}}} />,
  (f) => <Quai cam={{x: 400, y: -100, zoom: 2.2}} f={f} o={{compteur: 23.4, moi: {pose: {epauleD: -20, coudeD: 120}}, creature: {pose: QUATRE}}} />,
  (f) => <Facade cam={{x: 0, y: 0, zoom: 1}} f={f} o={{caissiere: {pose: {eyes: 1.4, worry: 1}}, feuille: 1}} />,
  (f) => <Interieur cam={{x: 0, y: -100, zoom: 0.9}} f={f} o={{caissiere: {pose: {}}, dehors: {creature: {pose: QUATRE}, compteur: 41.8}}} />,
  (f) => <Interieur cam={{x: 950, y: -330, zoom: 3}} f={f} o={{neons: [0, 0, 0, 1], caissiere: {pose: {grin: 1, eyes: 1.3}}}} />,
  (f) => <Arriere cam={{x: 640, y: -100, zoom: 1.2}} f={f} />,
];
export const TestForet = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>{V[f % V.length](f)}<Finition f={f} grain={0.02} vignette={0.7} /></svg>
    </AbsoluteFill>
  );
};
