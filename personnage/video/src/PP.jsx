import {AbsoluteFill, random} from 'remotion';
import {Rond} from './Rond';

// Photo de profil « horreur » : la moitié du visage du perso déjà transformée en zombie.
const S = 1.75;
const CX = 540;
const CY = 500;
// fissure entre les deux moitiés (repère du perso)
const FISSURE = [[0, -1000], [18, -930], [-14, -870], [20, -810], [-10, -760], [16, -700], [-8, -640], [10, -560], [0, -420]];
export const PP = () => {
  const bord = FISSURE.map(([x, y]) => `${x},${y}`).join(' L');
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg viewBox="0 0 1080 1080" width={1080} height={1080}>
        <defs>
          <radialGradient id="pp-fond" cx="0.5" cy="0.45" r="0.6">
            <stop offset="0" stopColor="#7a0c12" />
            <stop offset="0.55" stopColor="#2a0306" />
            <stop offset="1" stopColor="#050102" />
          </radialGradient>
          <radialGradient id="pp-oeil">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.3" stopColor="#ffe8e8" stopOpacity="0.9" />
            <stop offset="1" stopColor="#ff2a2a" stopOpacity="0" />
          </radialGradient>
          <clipPath id="pp-gauche">
            <path d={`M${bord} L-600,-420 L-600,-1300 L0,-1300 Z`} />
          </clipPath>
          <clipPath id="pp-droite">
            <path d={`M${bord} L600,-420 L600,-1300 L0,-1300 Z`} />
          </clipPath>
          <filter id="pp-flou" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          <radialGradient id="pp-vig" cx="0.5" cy="0.5" r="0.62">
            <stop offset="0.6" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.85" />
          </radialGradient>
        </defs>
        <rect width="1080" height="1080" fill="url(#pp-fond)" />
        {/* mains de zombies qui montent des bords */}
        {[[150, 1080, -20], [930, 1080, 22], [60, 760, -50], [1020, 720, 50]].map(([x, y, r], j) => (
          <g key={j} transform={`translate(${x} ${y}) rotate(${r}) scale(1.6)`} opacity="0.9">
            <rect x="-40" y="-20" width="80" height="200" rx="36" fill="#0b0d16" />
            <circle cx="0" cy="-30" r="56" fill="#0b0d16" />
            {[-36, -12, 12, 36].map((fx, q) => <rect key={q} x={fx - 11} y={-150 + Math.abs(q - 1.5) * 14} width="22" height="110" rx="11" fill="#0b0d16" />)}
          </g>
        ))}
        <ellipse cx={CX} cy={CY} rx="430" ry="430" fill="#ff2a2a" opacity="0.18" filter="url(#pp-flou)" />
        <g transform={`translate(${CX} ${CY + 800 * S}) scale(${S})`}>
          {/* moitié humaine : terrifiée */}
          <g clipPath="url(#pp-gauche)">
            <Rond cou={20} yeux={1.35} pupX={-10} pupY={-6} bouche="cri" sourcils={1} sueur={0.6} brasG={[10, 0]} brasD={[10, 0]} />
          </g>
          {/* moitié zombie */}
          <g clipPath="url(#pp-droite)">
            <Rond zombie cou={20} sansYeux brasG={[10, 0]} brasD={[10, 0]} />
            <circle cx="62" cy="-800" r="95" fill="url(#pp-oeil)" />
            <circle cx="62" cy="-800" r="26" fill="#ffffff" />
            <path d="M0,-735 Q30,-690 70,-700 L60,-680 L48,-698 L36,-676 L24,-696 L12,-676 L0,-694 Z" fill="#ffffff" opacity="0.9" />
          </g>
          {/* la fissure et le sang qui coule */}
          <polyline points={FISSURE.map((p) => p.join(',')).join(' ')} fill="none" stroke="#8a0a12" strokeWidth="7" strokeLinejoin="round" />
          {[[18, -930, 60], [20, -810, 110], [16, -700, 80], [10, -560, 130]].map(([x, y, h], j) => (
            <g key={j}>
              <path d={`M${x - 4},${y} Q${x - 3},${y + h * 0.7} ${x - 7},${y + h} A7,7 0 1 0 ${x + 7},${y + h} Q${x + 3},${y + h * 0.7} ${x + 4},${y} Z`} fill="#9a0c14" />
            </g>
          ))}
        </g>
        {[...Array(30)].map((_, j) => (
          <circle key={j} cx={random(`pa${j}`) * 1080} cy={random(`pb${j}`) * 1080} r={2 + random(`pc${j}`) * 4} fill="#ff6a5a" opacity={0.2 + 0.4 * random(`pd${j}`)} />
        ))}
        <rect width="1080" height="1080" fill="url(#pp-vig)" />
      </svg>
    </AbsoluteFill>
  );
};
