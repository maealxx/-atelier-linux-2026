import {useCurrentFrame} from 'remotion';
import {Bonhomme} from './Bonhomme';

const POSES = [
  {epauleD: 20, coudeD: 120}, {epauleD: -20, coudeD: 120}, {epauleD: 30, coudeD: -120}, {epauleD: 160, coudeD: 60},
  {epauleD: 40, coudeD: 140}, {epauleG: -20, coudeG: -120}, {epauleG: -40, coudeG: -140}, {epauleD: 60, coudeD: 150},
];
export const TestForet = () => {
  const f = useCurrentFrame();
  return (
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{background: '#555'}}>
      {POSES.map((p, k) => (
        <g key={k} transform={`translate(${(k % 4) * 270} ${Math.floor(k / 4) * 900}) scale(0.45)`}>
          <Bonhomme {...p} />
          <text x="50" y="80" fontSize="60" fill="#fff">{JSON.stringify(p)}</text>
        </g>
      ))}
    </svg>
  );
};
