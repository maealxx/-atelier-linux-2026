import {Bonhomme} from './Bonhomme';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};

// Clignement : 1 = ouvert, ~0 = fermé
const blink = (f, starts) =>
  starts.reduce((v, s) => Math.min(v, interpolate(f, [s, s + 2, s + 4], [1, 0.1, 1], clamp)), 1);

export const Personnage = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();

  // --- Décor ---
  const bgCircle = spring({frame: f, fps, config: {damping: 14}});

  // --- Chute + atterrissage (0 → 20) puis petit saut final (124 → 142) ---
  const fall = interpolate(f, [4, 20], [-1400, 0], {...clamp, easing: Easing.in(Easing.quad)});
  const hop = interpolate(f, [128, 135, 142], [0, -90, 0], {
    ...clamp,
    easing: Easing.bezier(0.33, 0, 0.67, 1),
  });
  const land1 = spring({frame: f - 20, fps, config: {damping: 7, stiffness: 180}});
  const land2 = spring({frame: f - 142, fps, config: {damping: 7, stiffness: 180}});
  const antic = interpolate(f, [122, 128, 130], [0, 1, 0], clamp);
  const squash =
    (f >= 20 ? (1 - land1) * 0.18 : 0) + (f >= 142 ? (1 - land2) * 0.14 : 0) + antic * 0.1;
  const stretch = f < 20 ? interpolate(f, [4, 19, 20], [0, 0.12, 0], clamp) : interpolate(f, [130, 134, 138], [0, 0.08, 0], clamp);
  const sy = 1 - squash + stretch;
  const sx = 1 + squash * 0.6 - stretch * 0.5;

  // --- Respiration ---
  const breath = f > 30 ? Math.sin((f - 30) / 9) * 3 : 0;

  // --- Bras qui salue (bras droit à l'écran) ---
  const raise = spring({frame: f - 34, fps, config: {damping: 12}});
  const lower = spring({frame: f - 108, fps, config: {damping: 14}});
  const up = raise - lower;
  const wave = Math.sin((f - 44) / 3.2) * interpolate(f, [42, 50, 100, 110], [0, 1, 1, 0], clamp);
  const epauleD = -145 * up;
  const coudeD = -40 * up + wave * 28;
  const poignetD = wave * 12;

  // --- Autre bras : léger balancement ---
  const epauleG = Math.sin(f / 10) * 3 + up * 6;
  const coudeG = Math.sin(f / 10 + 1) * 4;

  // --- Tête ---
  const tilt = up * -7 + Math.sin(f / 14) * 2;
  const brows = up * -6;
  const eyes = blink(f, [62, 96, 146]);
  const mouthOpen = up;

  // --- Texte ---
  const txt = spring({frame: f - 44, fps, config: {damping: 9}});
  const txtOut = spring({frame: f - 118, fps, config: {damping: 200}});
  const txtScale = f > 135 ? 0 : txt * (1 - txtOut);

  // --- Étincelles ---
  const spark = interpolate(f, [128, 146], [0, 1], clamp);

  const bodyY = fall + hop;

  return (
    <AbsoluteFill style={{background: '#FFF1E6', overflow: 'hidden'}}>
      {/* cercle décor */}
      <div
        style={{
          position: 'absolute',
          left: 540 - 450,
          top: 1000 - 450,
          width: 900,
          height: 900,
          borderRadius: '50%',
          background: '#FFD9C2',
          transform: `scale(${bgCircle})`,
        }}
      />
      {[0, 1, 2].map((i) => {
        const p = spring({frame: f - 8 - i * 5, fps, config: {damping: 12}});
        const pos = [
          [150, 380, 60, '#2F4B7C'],
          [900, 520, 40, '#FF6B5B'],
          [860, 1250, 70, '#FFB703'],
        ][i];
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: pos[0],
              top: pos[1] + Math.sin(f / 15 + i) * 15,
              width: pos[2],
              height: pos[2],
              borderRadius: i === 2 ? 16 : '50%',
              background: pos[3],
              opacity: 0.85,
              transform: `scale(${p}) rotate(${f * (i + 1)}deg)`,
            }}
          />
        );
      })}

      {/* texte */}
      <div
        style={{
          position: 'absolute',
          top: 110,
          width: '100%',
          textAlign: 'center',
          fontFamily: 'Poppins, Arial, sans-serif',
          fontWeight: 900,
          fontSize: 160,
          color: '#2B2140',
          transform: `scale(${txtScale}) rotate(${(1 - txt) * -10}deg)`,
        }}
      >
        Salut&nbsp;!
      </div>

      <svg
        viewBox="0 0 600 1000"
        width={900}
        height={1500}
        style={{position: 'absolute', left: 90, top: 380, overflow: 'visible'}}
      >
        {/* ombre : rétrécit quand le perso est en l'air */}
        <ellipse
          cx="300"
          cy="935"
          rx={130 * interpolate(bodyY, [-400, 0], [0.4, 1], clamp) * sx}
          ry="16"
          fill="#000"
          opacity={0.12 * interpolate(bodyY, [-600, 0], [0, 1], clamp)}
        />

        <g transform={`translate(0 ${bodyY}) translate(300 922) scale(${sx} ${sy}) translate(-300 -922)`}>
          <Bonhomme
            epauleG={epauleG}
            coudeG={coudeG}
            epauleD={epauleD}
            coudeD={coudeD}
            poignetD={poignetD}
            tilt={tilt}
            breath={breath}
            brows={brows}
            eyes={eyes}
            smile={mouthOpen}
            blush={up * 0.25}
          />
        </g>

        {/* étincelles à l'atterrissage final */}
        {spark > 0 && spark < 1 &&
          [...Array(8)].map((_, i) => {
            const a = (i / 8) * Math.PI * 2;
            const r = 40 + spark * 140;
            return (
              <circle
                key={i}
                cx={300 + Math.cos(a) * r * 1.6}
                cy={900 + Math.sin(a) * r * 0.4}
                r={8 * (1 - spark)}
                fill={i % 2 ? '#FFB703' : '#FF6B5B'}
              />
            );
          })}
      </svg>
    </AbsoluteFill>
  );
};
