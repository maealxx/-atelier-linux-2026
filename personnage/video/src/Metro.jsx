import {Bonhomme} from './Bonhomme';
import {AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';

// --- Mini moteur 2,5D ---
// Monde : X (gauche/droite), Y (haut/bas, sol du quai = 432), Z (profondeur, 1 Z = 1000 unités).
// Point de fuite à l'écran : (540, 640).
const VP = [540, 640];
const SOL = 432; // hauteur du quai
const FOSSE = 600; // fond des voies
const PLAFOND = -760;
const BORD = -300; // bord du quai (X)
const FOND = 16; // fond de la station (Z)

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};

const makeCam = (cam) => {
  const proj = (X, Y, Z) => {
    const d = Math.max(Z - cam.z, 0.02);
    return [VP[0] + (X - cam.x) / d, VP[1] + (Y - cam.y) / d];
  };
  const poly = (pts) => pts.map((p) => proj(...p).join(',')).join(' ');
  const scale = (Z) => 1 / Math.max(Z - cam.z, 0.02);
  return {proj, poly, scale};
};

// Lumière d'un néon qui grésille (déterministe)
const flick = (f, seed, from, to, low = 0.15) =>
  f >= from && f <= to ? (random(`${seed}-${f}`) > 0.45 ? 1 : low) : 1;

const NEONS = [1.3, 3, 4.7, 6.4, 8.1, 9.8, 11.5, 13.2];
const PILIERS = [2.4, 5.2, 8, 10.8, 13.6];
const POUSSIERE = [...Array(45)].map((_, i) => ({
  x: -400 + random(`px${i}`) * 900,
  y: -650 + random(`py${i}`) * 1050,
  z: 0.7 + random(`pz${i}`) * 5,
  v: 0.3 + random(`pv${i}`),
}));

export const Metro = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ===== Lumière générale =====
  // 0-110 : grésillements de plus en plus forts, 112-119 : noir, 120-134 : retour brutal, 135+ : noir total
  let L = 1;
  L = Math.min(L, flick(f, 'a', 38, 46, 0.4));
  L = Math.min(L, flick(f, 'b', 68, 92, 0.2));
  if (f >= 112 && f < 120) L = 0.04;
  if (f >= 120 && f < 135) L = flick(f, 'c', 126, 134, 0.3);
  if (f >= 135) L = 0.02;
  const ouverture = interpolate(f, [0, 10], [0, 1], clamp);
  L *= ouverture;

  // ===== Caméra : travelling avant lent + flottement « caméra épaule » =====
  const shake = f >= 120 && f < 132 ? (random(`s${f}`) - 0.5) * 30 * interpolate(f, [120, 132], [1, 0]) : 0;
  const cam = {
    x: interpolate(f, [0, 150], [60, -40], {easing: Easing.inOut(Easing.sin)}) + Math.sin(f / 37) * 12 + shake,
    y: Math.sin(f / 23) * 8 + shake * 0.6,
    z: interpolate(f, [0, 150], [0, 0.3], {easing: Easing.inOut(Easing.sin)}),
  };
  const {proj, poly, scale} = makeCam(cam);

  // ===== Personnage =====
  const P = {x: 40, z: 0.95};
  const scare = spring({frame: f - 120, fps, config: {damping: 9, stiffness: 160}});
  const lookFar = interpolate(f, [50, 58, 104, 110], [0, 1, 1, 0], clamp);
  const lookAround = interpolate(f, [8, 14, 22, 30, 36, 40], [0, -1, -1, 1, 1, 0], clamp);
  const worry = Math.max(interpolate(f, [40, 52], [0, 1], clamp), scare);
  const shiver = f > 72 && f < 120 ? (random(`sh${f}`) - 0.5) * 5 : 0;
  const tense = interpolate(f, [72, 84], [0, 1], clamp) * (1 - scare);
  const breath = Math.sin(f / (f > 60 ? 4 : 8)) * (f > 60 ? 4 : 3);
  const jump = interpolate(f, [121, 126, 133], [0, -110, 0], {...clamp, easing: Easing.bezier(0.33, 0, 0.67, 1)});
  const landSq = f >= 133 ? (1 - spring({frame: f - 133, fps, config: {damping: 7, stiffness: 200}})) * 0.14 : 0;
  const preSq = interpolate(f, [119, 121, 123], [0, 0.12, 0], clamp);
  const st = interpolate(f, [122, 125, 129], [0, 0.1, 0], clamp);
  const sy = 1 - landSq - preSq + st;
  const sx = 1 + (landSq + preSq) * 0.6 - st * 0.5;

  // ===== La silhouette =====
  // apparaît au fond (Z 9), se rapproche (Z 4,5) puis surgit juste derrière (Z 1,75)
  const ombre =
    f >= 74 && f < 96 ? {x: 120, z: 9.5} : f >= 96 && f < 112 ? {x: -60, z: 4.6} : f >= 120 ? {x: -230, z: 1.5} : null;
  const ombreVisible = ombre && (f < 120 ? L < 0.9 || f > 96 : true);

  // ===== Lumière perçue par le personnage (néon juste au-dessus) =====
  const lum = 0.12 + 0.88 * L;
  const m = (r, g, b) => `${r * lum} 0 0 0 0  0 ${g * lum} 0 0 0  0 0 ${b * lum} 0 0  0 0 0 1 0`;

  // ===== Profondeur : brume vers le fond =====
  const brume = (z) => interpolate(z, [1, FOND], [0, 0.92], clamp);

  const charFeet = proj(P.x, SOL + 0, P.z);
  const charScale = scale(P.z) * 0.78;

  const boite = (x0, x1, z0, z1, y0, y1, face, cote) => {
    const cx = (x0 + x1) / 2;
    const sideX = cx > cam.x ? x0 : x1;
    return (
      <g>
        <polygon points={poly([[sideX, y0, z0], [sideX, y0, z1], [sideX, y1, z1], [sideX, y1, z0]])} fill={cote} />
        <polygon points={poly([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]])} fill={face} />
      </g>
    );
  };

  // Lignes de carrelage du mur droit
  const tuilesZ = [];
  for (let z = 0.4; z < FOND; z += 0.16) tuilesZ.push(z);
  const tuilesY = [];
  for (let y = PLAFOND + 120; y < SOL; y += 110) tuilesY.push(y);

  // Rails
  const rails = [-480, -420, -380, -320];

  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <defs>
          <filter id="flou" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id="halo" x="-50%" y="-200%" width="200%" height="500%">
            <feGaussianBlur stdDeviation="22" />
          </filter>
          <filter id="lumPerso">
            <feColorMatrix type="matrix" values={m(0.62, 0.8, 0.95)} />
          </filter>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={f} />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <radialGradient id="brumeFond" cx={VP[0]} cy={VP[1]} r="900" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#000" stopOpacity="1" />
            <stop offset="0.18" stopColor="#000" stopOpacity="0.85" />
            <stop offset="0.55" stopColor="#000" stopOpacity="0.15" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="vignette" cx="540" cy="960" r="1150" gradientUnits="userSpaceOnUse">
            <stop offset="0.45" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.9" />
          </radialGradient>
          <radialGradient id="flaque">
            <stop offset="0" stopColor="#CFF5FF" stopOpacity="0.55" />
            <stop offset="1" stopColor="#CFF5FF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="oeilRouge">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.35" stopColor="#ff3b3b" />
            <stop offset="1" stopColor="#ff0000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ===== DÉCOR (du fond vers l'avant) ===== */}
        <g>
          {/* mur du fond + tunnel */}
          <polygon points={poly([[-540, PLAFOND, FOND], [540, PLAFOND, FOND], [540, FOSSE, FOND], [-540, FOSSE, FOND]])} fill="#0d1416" />
          <polygon points={poly([[-540, -150, FOND], [BORD, -150, FOND], [BORD, FOSSE, FOND], [-540, FOSSE, FOND]])} fill="#000" />

          {/* plafond */}
          <polygon points={poly([[-540, PLAFOND, 0.35], [540, PLAFOND, 0.35], [540, PLAFOND, FOND], [-540, PLAFOND, FOND]])} fill="#141c1f" />
          {/* mur gauche (de l'autre côté des voies) */}
          <polygon points={poly([[-540, PLAFOND, 0.35], [-540, PLAFOND, FOND], [-540, FOSSE, FOND], [-540, FOSSE, 0.35]])} fill="#162124" />
          {/* bande publicitaire sur le mur gauche */}
          {[1.6, 4.2, 6.8, 9.4].map((z) => (
            <polygon key={z} points={poly([[-540, -380, z], [-540, -380, z + 1.6], [-540, 40, z + 1.6], [-540, 40, z]])} fill="#1f2b2a" stroke="#0a0f10" strokeWidth="3" />
          ))}
          {/* fosse des voies */}
          <polygon points={poly([[-540, FOSSE, 0.35], [BORD, FOSSE, 0.35], [BORD, FOSSE, FOND], [-540, FOSSE, FOND]])} fill="#07090a" />
          {rails.map((x, i) => {
            const a = proj(x, FOSSE - 10, 0.36);
            const b = proj(x, FOSSE - 10, FOND);
            return <line key={x} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={i % 2 ? '#3d4448' : '#566066'} strokeWidth={Math.max(2, 12 * scale(0.9))} />;
          })}
          {/* traverses */}
          {tuilesZ.filter((_, i) => i % 3 === 0).map((z) => {
            const a = proj(-500, FOSSE, z);
            const b = proj(-300, FOSSE, z);
            return <line key={z} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#141618" strokeWidth={Math.max(1, 30 * scale(z))} />;
          })}

          {/* mur droit carrelé */}
          <polygon points={poly([[540, PLAFOND, 0.35], [540, PLAFOND, FOND], [540, SOL, FOND], [540, SOL, 0.35]])} fill="#1d2e30" />
          {tuilesY.map((y) => {
            const a = proj(540, y, 0.35);
            const b = proj(540, y, FOND);
            return <line key={y} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#132022" strokeWidth="3" />;
          })}
          {tuilesZ.map((z) => {
            const a = proj(540, PLAFOND, z);
            const b = proj(540, SOL, z);
            return <line key={z} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#132022" strokeWidth={Math.max(1, 4 * scale(z))} />;
          })}
          {/* panneau de station + plan */}
          <polygon points={poly([[540, -460, 3.1], [540, -460, 4.6], [540, -300, 4.6], [540, -300, 3.1]])} fill="#0f2238" stroke="#d9e2e8" strokeWidth="3" strokeOpacity="0.5" />
          <polygon points={poly([[540, -400, 3.3], [540, -400, 4.4], [540, -370, 4.4], [540, -370, 3.3]])} fill="#d9e2e8" opacity="0.55" />
          <polygon points={poly([[540, -200, 1.5], [540, -200, 2.3], [540, 150, 2.3], [540, 150, 1.5]])} fill="#2a2f26" stroke="#0a0f10" strokeWidth="4" />

          {/* quai */}
          <polygon points={poly([[BORD, SOL, 0.35], [540, SOL, 0.35], [540, SOL, FOND], [BORD, SOL, FOND]])} fill="#262b2e" />
          {/* bande de sécurité */}
          <polygon points={poly([[BORD, SOL, 0.35], [BORD + 45, SOL, 0.35], [BORD + 45, SOL, FOND], [BORD, SOL, FOND]])} fill="#8a7420" />
          {/* nez du quai */}
          <polygon points={poly([[BORD, SOL, 0.35], [BORD, SOL, FOND], [BORD, FOSSE, FOND], [BORD, FOSSE, 0.35]])} fill="#111517" />

          {/* flaques de lumière sous les néons */}
          {NEONS.map((z, i) => {
            const c = proj(120, SOL, z + 0.3);
            const s = scale(z + 0.3);
            const l = i === 0 ? L * flick(f, 'n0', 20, 110, 0.3) : L;
            return <ellipse key={z} cx={c[0]} cy={c[1]} rx={520 * s} ry={170 * s} fill="url(#flaque)" opacity={l * 0.7} />;
          })}
          {/* ombre portée du personnage */}
          <ellipse cx={charFeet[0]} cy={charFeet[1]} rx={130 * charScale * interpolate(jump, [-110, 0], [0.6, 1])} ry={22 * charScale} fill="#000" opacity="0.55" />

          {/* néons au plafond */}
          {NEONS.map((z, i) => {
            const l = i === 0 ? L * flick(f, 'n0', 20, 110, 0.3) : L;
            const pts = poly([[90, PLAFOND + 25, z], [150, PLAFOND + 25, z], [150, PLAFOND + 25, z + 0.6], [90, PLAFOND + 25, z + 0.6]]);
            return (
              <g key={z} opacity={0.1 + l * 0.9}>
                <polygon points={pts} fill="#CFF5FF" filter="url(#halo)" opacity={l} />
                <polygon points={pts} fill="#EFFFFF" />
              </g>
            );
          })}

          {/* brume de profondeur */}
          <rect x="0" y="0" width="1080" height="1920" fill="url(#brumeFond)" />
        </g>

        {/* ===== PILIERS + SILHOUETTE + PERSONNAGE triés par profondeur ===== */}
        {[
          ...PILIERS.map((z) => ({
            z,
            el: (
              <g key={`p${z}`}>
                {boite(-250, -170, z, z + 0.08, PLAFOND, SOL, '#22302f', '#151e1e')}
                <rect x="0" y="0" width="0" height="0" />
              </g>
            ),
            brume: brume(z),
          })),
          ombreVisible && {
            z: ombre.z,
            el: (
              <Silhouette key="ombre" f={f} proj={proj} scale={scale} x={ombre.x} z={ombre.z} L={L} pres={f >= 120 ? Math.min(1, scare) : 1} />
            ),
            brume: 0,
          },
          {
            z: P.z,
            el: (
              <g key="perso" filter="url(#lumPerso)" transform={`translate(${charFeet[0] + shiver} ${charFeet[1] + jump * charScale}) scale(${charScale * sx} ${charScale * sy}) translate(-300 -922)`}>
                <Bonhomme
                  epauleG={-6 * tense + Math.sin(f / 10) * 2 * (1 - tense) + 40 * scare}
                  coudeG={-20 * tense + 130 * scare}
                  epauleD={6 * tense - Math.sin(f / 10) * 2 * (1 - tense) - 40 * scare}
                  coudeD={20 * tense - 130 * scare}
                  tilt={lookAround * 5 - lookFar * 4 + Math.sin(f / 14) * 1.5}
                  breath={breath}
                  brows={-6 * scare}
                  worry={worry}
                  eyes={f >= 120 ? 1 + scare * 0.35 : f === 30 || f === 31 ? 0.15 : 1}
                  pupilX={lookAround * 5 - lookFar * 4}
                  pupilY={-lookFar * 2}
                  scream={scare}
                  sweat={interpolate(f, [60, 110], [0, 1], clamp)}
                />
              </g>
            ),
            brume: 0,
          },
        ]
          .filter(Boolean)
          .sort((a, b) => b.z - a.z)
          .map((o) => (
            <g key={o.z}>
              {o.el}
            </g>
          ))}

        {/* pilier au premier plan, flou (profondeur de champ) */}
        <g filter="url(#flou)">{boite(300, 420, 0.62, 0.7, PLAFOND - 400, SOL + 400, '#070a0b', '#0d1213')}</g>

        {/* poussière en suspension */}
        {POUSSIERE.map((p, i) => {
          const [x, y] = proj(p.x + Math.sin(f / 30 + i) * 30, p.y + ((f * p.v * 3) % 300) - 150, p.z);
          const r = 2.5 * scale(p.z);
          return <circle key={i} cx={x} cy={y} r={r} fill="#CFF5FF" opacity={0.35 * L * (1 - brume(p.z))} />;
        })}

        {/* obscurité globale (néons qui grésillent / coupure) */}
        <rect x="0" y="0" width="1080" height="1920" fill="#000" opacity={(1 - L) * 0.9} />

        {/* vignette + grain */}
        <rect x="0" y="0" width="1080" height="1920" fill="url(#vignette)" />
        <rect x="0" y="0" width="1080" height="1920" filter="url(#grain)" opacity="0.09" />
        {/* yeux de la silhouette, visibles même dans le noir */}
        {ombreVisible && <Yeux f={f} proj={proj} scale={scale} x={ombre.x} z={ombre.z} pres={f >= 120 ? Math.min(1, scare) : 1} fin={f >= 135} />}

        {/* texte final */}
        {f >= 138 && (
          <text
            x="540"
            y="1560"
            textAnchor="middle"
            fontFamily="Georgia, 'DejaVu Serif', serif"
            fontStyle="italic"
            fontSize="92"
            fill="#e01e26"
            opacity={interpolate(f, [137, 141], [0, 1], clamp) * (random(`t${f}`) > 0.15 ? 1 : 0.3)}
            letterSpacing="4"
          >
            Tu n'es pas seul…
          </text>
        )}

      </svg>
    </AbsoluteFill>
  );
};

// Silhouette longiligne : pieds en (0,0), tête vers y = -1000 (repère local).
const Silhouette = ({f, proj, scale, x, z, L, pres}) => {
  const [px, py] = proj(x, SOL, z);
  const s = scale(z) * 1.05 * pres;
  const sway = Math.sin(f / 9) * 3;
  return (
    <g transform={`translate(${px} ${py}) scale(${s})`} opacity={0.95}>
      <ellipse cx="0" cy="8" rx="110" ry="18" fill="#000" opacity="0.6" />
      <g transform={`rotate(${sway * 0.3} 0 0)`}>
        {/* jambes */}
        <path d="M-38,0 L-30,-430 L-8,-430 L-14,0 Z M14,0 L8,-430 L30,-430 L38,0 Z" fill="#020303" />
        {/* corps */}
        <path d="M-95,-820 Q0,-860 95,-820 L70,-420 L-70,-420 Z" fill="#020303" />
        {/* bras trop longs */}
        <path d="M-92,-815 Q-130,-600 -120,-260 L-100,-255 Q-100,-560 -72,-760 Z" fill="#020303" />
        <path d="M92,-815 Q130,-600 120,-260 L100,-255 Q100,-560 72,-760 Z" fill="#020303" />
        {/* doigts */}
        <path d="M-122,-262 l-8,50 M-114,-260 l-2,58 M-104,-258 l6,52" stroke="#020303" strokeWidth="7" strokeLinecap="round" />
        <path d="M122,-262 l8,50 M114,-260 l2,58 M104,-258 l-6,52" stroke="#020303" strokeWidth="7" strokeLinecap="round" />
        {/* tête penchée */}
        <g transform={`rotate(${-14 + sway} 0 -840)`}>
          <rect x="-14" y="-880" width="28" height="60" fill="#020303" />
          <ellipse cx="0" cy="-945" rx="58" ry="78" fill="#020303" />
        </g>
      </g>
      {/* léger contour éclairé */}
      <path d="M-95,-820 Q0,-860 95,-820" fill="none" stroke="#9fd8e6" strokeWidth="4" opacity={0.25 * L} />
    </g>
  );
};

const Yeux = ({f, proj, scale, x, z, pres, fin}) => {
  const [px, py] = proj(x, SOL, z);
  const s = scale(z) * 1.05 * pres;
  const sway = Math.sin(f / 9) * 3;
  const ferme = fin ? interpolate(f, [146, 148], [1, 0.05], clamp) : 1;
  return (
    <g transform={`translate(${px} ${py}) scale(${s}) rotate(${sway * 0.3} 0 0) rotate(${-14 + sway} 0 -840)`}>
      {[-22, 22].map((ex) => (
        <g key={ex} transform={`translate(${ex} -950) scale(${1 + z * 0.2} ${(1 + z * 0.2) * ferme})`}>
          <ellipse cx="0" cy="0" rx="60" ry="34" fill="url(#oeilRouge)" opacity="0.5" />
          <ellipse cx="0" cy="0" rx="26" ry="14" fill="url(#oeilRouge)" />
          <ellipse cx="0" cy="0" rx="6" ry="4" fill="#fff" />
        </g>
      ))}
    </g>
  );
};
