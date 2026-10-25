// Le bonhomme, dessiné dans le repère du SVG d'origine (viewBox 0 0 600 1000, pieds en 300,922).
// Les angles sont en degrés, autour des pivots du personnage.svg.
const C0 = {
  peau: '#F2C3A0',
  peauO: '#E3A984',
  chev: '#2B2140',
  haut: '#FF6B5B',
  hautO: '#E2554A',
  pant: '#2F4B7C',
  chaus: '#1E1E2A',
};

const rot = (a, x, y) => `rotate(${a} ${x} ${y})`;

export const Bonhomme = ({
  epauleG = 0,
  coudeG = 0,
  epauleD = 0,
  coudeD = 0,
  poignetD = 0,
  tilt = 0,
  breath = 0,
  brows = 0, // décalage vertical des sourcils
  worry = 0, // 0 → 1 : sourcils inquiets
  eyes = 1, // échelle verticale des yeux (0 fermé, >1 écarquillés)
  pupilX = 0,
  pupilY = 0,
  smile = 0, // 0 → 1 : sourire → bouche ouverte joyeuse
  scream = 0, // 0 → 1 : bouche en « O » de peur
  blush = 0,
  sweat = 0, // 0 → 1 : goutte de sueur
  legG = 0, // 0 → 1 : jambe levée (marche / course vue de face)
  legD = 0,
  dos = false, // vu de dos
  couleurs = null, // remplace une partie de la palette (ex. une veste de livreur)
}) => {
  const C = couleurs ? {...C0, ...couleurs} : C0;
  return (
  <g>
    {/* jambe G */}
    <g transform={`translate(0 560) scale(1 ${1 - 0.2 * legG}) translate(0 -560)`}>
    <line x1="258" y1="560" x2="252" y2="725" stroke={C.pant} strokeWidth="58" strokeLinecap="round" />
    <line x1="252" y1="725" x2="250" y2="885" stroke={C.pant} strokeWidth="50" strokeLinecap="round" />
    <path fill={C.chaus} d="M228,880 Q228,868 245,868 L262,868 Q274,868 274,885 L274,900 Q274,920 255,920 L205,920 Q188,920 190,905 Q192,890 210,886 Z" />
    <rect x="188" y="912" width="88" height="10" rx="5" fill="#fff" />
    </g>
    {/* jambe D */}
    <g transform={`translate(0 560) scale(1 ${1 - 0.2 * legD}) translate(0 -560)`}>
    <line x1="342" y1="560" x2="348" y2="725" stroke={C.pant} strokeWidth="58" strokeLinecap="round" />
    <line x1="348" y1="725" x2="350" y2="885" stroke={C.pant} strokeWidth="50" strokeLinecap="round" />
    <path fill={C.chaus} d="M372,880 Q372,868 355,868 L338,868 Q326,868 326,885 L326,900 Q326,920 345,920 L395,920 Q412,920 410,905 Q408,890 390,886 Z" />
    <rect x="324" y="912" width="88" height="10" rx="5" fill="#fff" />
    </g>

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

      {/* bras D */}
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
      {dos ? (
        <path d="M270,292 Q300,302 330,292" fill="none" stroke={C.hautO} strokeWidth="7" strokeLinecap="round" />
      ) : (
        <>
          <path fill={C.peau} d="M276,290 L300,326 L324,290 Z" />
          <path d="M272,289 L300,332 L328,289" fill="none" stroke={C.hautO} strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
          <rect x="330" y="360" width="34" height="30" rx="6" fill={C.hautO} />
        </>
      )}

      {/* tête */}
      <g transform={`translate(0 ${breath * 0.5}) ${rot(tilt, 300, 262)}`}>
        {dos ? (
          <>
            <circle fill={C.peauO} cx="231" cy="198" r="15" />
            <circle fill={C.peauO} cx="369" cy="198" r="15" />
            <ellipse fill={C.peau} cx="300" cy="192" rx="70" ry="76" />
            <path fill={C.chev} d="M228,200 Q214,95 300,92 Q386,95 372,200 Q372,240 340,250 Q300,258 260,250 Q228,240 228,200 Z" />
            <path d="M262,150 Q300,130 338,150" fill="none" stroke="#3a2d55" strokeWidth="5" strokeLinecap="round" />
          </>
        ) : (
        <>
        <ellipse fill={C.chev} cx="300" cy="170" rx="86" ry="80" />
        <circle fill={C.peauO} cx="231" cy="198" r="15" />
        <circle fill={C.peauO} cx="369" cy="198" r="15" />
        <ellipse fill={C.peau} cx="300" cy="192" rx="70" ry="76" />
        <circle cx="258" cy="222" r="11" fill="#FF8A80" opacity={0.45 + blush} />
        <circle cx="342" cy="222" r="11" fill="#FF8A80" opacity={0.45 + blush} />

        {/* yeux */}
        {[272, 328].map((x) => (
          <g key={x} transform={`translate(${x} 198) scale(1 ${eyes}) translate(${-x} -198)`}>
            <g transform={`translate(${pupilX} ${pupilY})`}>
              <ellipse cx={x} cy="198" rx="8" ry="10" fill="#1E1E2A" />
              <circle cx={x + 3} cy="194" r="3" fill="#fff" />
            </g>
          </g>
        ))}

        {/* sourcils */}
        <g transform={`translate(0 ${brows})`}>
          <path transform={rot(-16 * worry, 272, 170)} d="M258,174 Q272,165 286,172" fill="none" stroke={C.chev} strokeWidth="6" strokeLinecap="round" />
          <path transform={rot(16 * worry, 328, 170)} d="M314,172 Q328,165 342,174" fill="none" stroke={C.chev} strokeWidth="6" strokeLinecap="round" />
        </g>

        <path d="M300,205 Q294,220 302,222" fill="none" stroke="#D99572" strokeWidth="5" strokeLinecap="round" />

        {/* bouche */}
        {scream > 0.02 ? (
          <ellipse cx="300" cy={240 + scream * 4} rx={9 + scream * 5} ry={4 + scream * 13} fill="#7A2E3A" />
        ) : (
          <path
            d={`M284,236 Q300,${252 + smile * 14 - worry * 18} 316,236 Q300,${236 + smile * 2} 284,236 Z`}
            fill={smile > 0.05 ? '#7A2E3A' : 'none'}
            stroke="#7A2E3A"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        <path fill={C.chev} d="M226,182 Q220,100 300,98 Q382,98 376,182 Q366,150 345,138 Q330,158 290,156 Q300,146 296,138 Q270,156 240,150 Q230,162 226,182 Z" />

        {/* goutte de sueur */}
        {sweat > 0 && (
          <path
            transform={`translate(0 ${sweat * 18})`}
            d="M352,140 Q362,158 360,166 A9,9 0 1 1 344,166 Q342,158 352,140 Z"
            fill="#8FD3FF"
            opacity={Math.min(1, sweat * 3)}
          />
        )}
        </>
        )}
      </g>
    </g>
  </g>
);
};
