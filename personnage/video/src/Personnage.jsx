import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

const C = {
  peau: '#F2C3A0',
  peauO: '#E3A984',
  chev: '#2B2140',
  haut: '#FF6B5B',
  hautO: '#E2554A',
  pant: '#2F4B7C',
  chaus: '#1E1E2A',
};

const rot = (a, x, y) => `rotate(${a} ${x} ${y})`;
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
          {/* jambe G */}
          <line x1="258" y1="560" x2="252" y2="725" stroke={C.pant} strokeWidth="58" strokeLinecap="round" />
          <line x1="252" y1="725" x2="250" y2="885" stroke={C.pant} strokeWidth="50" strokeLinecap="round" />
          <path fill={C.chaus} d="M228,880 Q228,868 245,868 L262,868 Q274,868 274,885 L274,900 Q274,920 255,920 L205,920 Q188,920 190,905 Q192,890 210,886 Z" />
          <rect x="188" y="912" width="88" height="10" rx="5" fill="#fff" />
          {/* jambe D */}
          <line x1="342" y1="560" x2="348" y2="725" stroke={C.pant} strokeWidth="58" strokeLinecap="round" />
          <line x1="348" y1="725" x2="350" y2="885" stroke={C.pant} strokeWidth="50" strokeLinecap="round" />
          <path fill={C.chaus} d="M372,880 Q372,868 355,868 L338,868 Q326,868 326,885 L326,900 Q326,920 345,920 L395,920 Q412,920 410,905 Q408,890 390,886 Z" />
          <rect x="324" y="912" width="88" height="10" rx="5" fill="#fff" />

          {/* bassin */}
          <path fill={C.pant} d="M222,505 L378,505 L384,575 Q384,592 366,592 L234,592 Q216,592 216,575 Z" />
          <rect x="220" y="505" width="160" height="14" rx="4" fill="#24395F" />

          {/* haut du corps (respiration) */}
          <g transform={`translate(0 ${breath * 0.5})`}>
            {/* bras G */}
            <g transform={rot(epauleG, 210, 318)}>
              <g transform={rot(coudeG, 182, 450)}>
                <line x1="182" y1="450" x2="170" y2="570" stroke={C.peau} strokeWidth="36" strokeLinecap="round" />
                <ellipse fill={C.peau} cx="167" cy="598" rx="22" ry="26" />
                <ellipse fill={C.peauO} cx="183" cy="592" rx="7" ry="11" />
              </g>
              <line x1="210" y1="318" x2="182" y2="450" stroke={C.peau} strokeWidth="40" strokeLinecap="round" />
              <path fill={C.haut} d="M190,300 Q215,292 236,312 L222,395 Q200,402 178,390 L182,325 Q183,305 190,300 Z" />
            </g>

            {/* bras D (salut) */}
            <g transform={rot(epauleD, 390, 318)}>
              <g transform={rot(coudeD, 418, 450)}>
                <line x1="418" y1="450" x2="430" y2="570" stroke={C.peau} strokeWidth="36" strokeLinecap="round" />
                <g transform={rot(poignetD, 430, 575)}>
                  <ellipse fill={C.peau} cx="433" cy="598" rx="22" ry="26" />
                  <ellipse fill={C.peauO} cx="417" cy="592" rx="7" ry="11" />
                </g>
              </g>
              <line x1="390" y1="318" x2="418" y2="450" stroke={C.peau} strokeWidth="40" strokeLinecap="round" />
              <path fill={C.haut} d="M410,300 Q385,292 364,312 L378,395 Q400,402 422,390 L418,325 Q417,305 410,300 Z" />
            </g>

            {/* cou */}
            <rect fill={C.peauO} x="282" y="240" width="36" height="68" rx="14" />

            {/* torse */}
            <path fill={C.haut} d="M222,296 Q300,282 378,296 Q402,300 404,326 L384,515 L216,515 L196,326 Q198,300 222,296 Z" />
            <path fill={C.peau} d="M276,290 L300,326 L324,290 Z" />
            <path d="M272,289 L300,332 L328,289" fill="none" stroke={C.hautO} strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
            <rect x="330" y="360" width="34" height="30" rx="6" fill={C.hautO} />

            {/* tête */}
            <g transform={`translate(0 ${breath * 0.5}) ${rot(tilt, 300, 262)}`}>
              <ellipse fill={C.chev} cx="300" cy="170" rx="86" ry="80" />
              <circle fill={C.peauO} cx="231" cy="198" r="15" />
              <circle fill={C.peauO} cx="369" cy="198" r="15" />
              <ellipse fill={C.peau} cx="300" cy="192" rx="70" ry="76" />
              <circle cx="258" cy="222" r="11" fill="#FF8A80" opacity={0.45 + up * 0.25} />
              <circle cx="342" cy="222" r="11" fill="#FF8A80" opacity={0.45 + up * 0.25} />

              {/* yeux */}
              {[272, 328].map((x) => (
                <g key={x} transform={`translate(${x} 198) scale(1 ${eyes}) translate(${-x} -198)`}>
                  <ellipse cx={x} cy="198" rx="8" ry="10" fill="#1E1E2A" />
                  <circle cx={x + 3} cy="194" r="3" fill="#fff" />
                </g>
              ))}

              {/* sourcils */}
              <g transform={`translate(0 ${brows})`}>
                <path d="M258,174 Q272,165 286,172" fill="none" stroke={C.chev} strokeWidth="6" strokeLinecap="round" />
                <path d="M314,172 Q328,165 342,174" fill="none" stroke={C.chev} strokeWidth="6" strokeLinecap="round" />
              </g>

              <path d="M300,205 Q294,220 302,222" fill="none" stroke="#D99572" strokeWidth="5" strokeLinecap="round" />

              {/* bouche : sourire → bouche ouverte */}
              <path
                d={`M284,236 Q300,${252 + mouthOpen * 14} 316,236 Q300,${236 + mouthOpen * 2} 284,236 Z`}
                fill={mouthOpen > 0.05 ? '#7A2E3A' : 'none'}
                stroke="#7A2E3A"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <path fill={C.chev} d="M226,182 Q220,100 300,98 Q382,98 376,182 Q366,150 345,138 Q330,158 290,156 Q300,146 296,138 Q270,156 240,150 Q230,162 226,182 Z" />
            </g>
          </g>
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
