import {random} from 'remotion';
import {Bonhomme} from './Bonhomme';
import {Rodeur} from './Rodeur';

// ===================== La station-service en 2,5D illustrée (plans à étages, parallaxe) =====================
// Pas de boîtes 3D : chaque décor est un dessin en couches (fond lointain → premier plan). La caméra 2D {x, y, zoom, roll}
// déplace les couches selon leur profondeur p (0 = infini, 1 = plan principal, > 1 = premier plan flou).
// Repère du plan principal : origine au centre de l'écran, sol à y = 380.
const R = (s) => random(s);
const SOLY = 380;

// une couche à la profondeur p
const Couche = ({cam, p, children}) => {
  const z = 1 + (cam.zoom - 1) * p;
  return <g transform={`translate(540 960) scale(${z}) translate(${-cam.x * p} ${-cam.y * p})`}>{children}</g>;
};
// le bonhomme / la caissière en 2D, teintés par la lumière
export const B2D = ({x, y, s = 0.62, teinte = [0.86, 0.92, 1.05], lum = 0.9, id, ...pose}) => (
  <g>
    <defs>
      <filter id={`b2-${id}`}>
        <feColorMatrix type="matrix" values={`${teinte[0] * lum} 0 0 0 0  0 ${teinte[1] * lum} 0 0 0  0 0 ${teinte[2] * lum} 0 0  0 0 0 1 0`} />
      </filter>
    </defs>
    <ellipse cx={x} cy={y + 4} rx={130 * s} ry={18 * s} fill="#000" opacity="0.45" />
    <g filter={`url(#b2-${id})`} transform={`translate(${x} ${y}) scale(${s}) translate(-300 -922)`}>
      <Bonhomme {...pose} />
    </g>
  </g>
);
const CAISSIERE = {coiffure: 'queue', cils: true, couleurs: {haut: '#2a6a8a', hautO: '#1f5470', chev: '#3a2418'}};
export const Caissiere2D = (props) => <B2D {...CAISSIERE} {...props} />;

const lueur = (id, x, y, r, c, op) => (
  <g key={id}>
    <defs>
      <radialGradient id={id} cx={x} cy={y} r={r} gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={c} stopOpacity={op} />
        <stop offset="1" stopColor={c} stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect x={x - r} y={y - r} width={2 * r} height={2 * r} fill={`url(#${id})`} />
  </g>
);

// sapins en silhouette (une rangée)
const Sapins = ({n, y, h, couleur, seed, largeur = 4200}) => (
  <g fill={couleur}>
    {[...Array(n)].map((_, k) => {
      const x = -largeur / 2 + (k + R(`${seed}x${k}`) * 0.6) * (largeur / n);
      const hh = h * (0.7 + R(`${seed}h${k}`) * 0.6);
      const w = hh * 0.28;
      return <path key={k} d={`M${x},${y - hh} L${x - w * 0.55},${y - hh * 0.55} L${x - w * 0.35},${y - hh * 0.55} L${x - w},${y} L${x + w},${y} L${x + w * 0.35},${y - hh * 0.55} L${x + w * 0.55},${y - hh * 0.55} Z`} />;
    })}
  </g>
);

// ----- la voiture, vue de côté (avant à gauche) -----
const Voiture2D = ({x = 0, phares = 0, lum = 1}) => (
  <g transform={`translate(${x} 0)`}>
    <defs>
      <linearGradient id="v2-carr" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4a5a7a" />
        <stop offset="0.45" stopColor="#24304a" />
        <stop offset="1" stopColor="#121826" />
      </linearGradient>
      <linearGradient id="v2-vit" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#3a4a66" />
        <stop offset="0.5" stopColor="#0c1220" />
        <stop offset="1" stopColor="#1a2438" />
      </linearGradient>
    </defs>
    <ellipse cx="-330" cy={SOLY + 6} rx="700" ry="40" fill="#000" opacity="0.6" />
    {/* carrosserie */}
    <path d={`M-930,300 Q-940,215 -880,195 L-640,160 Q-560,60 -420,40 L40,40 Q150,50 230,150 L300,175 Q330,190 330,240 L330,300 Q330,330 300,335 L-900,335 Q-930,330 -930,300 Z`} fill="url(#v2-carr)" />
    {/* vitres */}
    <path d={`M-600,160 Q-530,80 -420,68 L-180,68 L-180,160 Z`} fill="url(#v2-vit)" />
    <path d={`M-150,68 L30,68 Q120,80 190,160 L-150,160 Z`} fill="url(#v2-vit)" />
    <rect x="-180" y="66" width="30" height="96" fill="#1a2232" />
    {/* reflet du néon sur le toit et les vitres */}
    <path d="M-420,44 L40,44" stroke="#dfeeff" strokeWidth="6" opacity={0.55 * lum} strokeLinecap="round" />
    <path d="M-560,150 L-430,80" stroke="#cfe2ff" strokeWidth="10" opacity={0.18 * lum} strokeLinecap="round" />
    <path d="M-80,150 L20,80" stroke="#cfe2ff" strokeWidth="10" opacity={0.18 * lum} strokeLinecap="round" />
    {/* ligne de caisse, poignées, trappe à essence */}
    <path d="M-900,215 L300,215" stroke="#0a0e18" strokeWidth="4" opacity="0.7" />
    <rect x="-330" y="185" width="56" height="12" rx="6" fill="#8a96b0" />
    <rect x="40" y="185" width="56" height="12" rx="6" fill="#8a96b0" />
    <rect x="215" y="180" width="40" height="40" rx="6" fill="#1a2234" stroke="#0a0e18" strokeWidth="3" />
    {/* phares, feux */}
    <path d="M-925,230 Q-900,205 -850,205 L-850,245 Q-900,250 -925,230 Z" fill={phares ? '#fff6d0' : '#9aa0aa'} />
    <rect x="300" y="215" width="28" height="44" rx="6" fill="#8a1a1a" />
    {/* roues */}
    {[-700, 110].map((wx) => (
      <g key={wx}>
        <circle cx={wx} cy="320" r="72" fill="#08090c" />
        <circle cx={wx} cy="320" r="40" fill="#2a2e36" />
        <circle cx={wx} cy="320" r="14" fill="#0e1014" />
      </g>
    ))}
  </g>
);

// ----- la pompe -----
const Pompe2D = ({x = 570, compteur = 0, lum = 1}) => (
  <g transform={`translate(${x} 0)`}>
    <rect x="-210" y="345" width="420" height="40" rx="8" fill="#3a3e46" />
    <rect x="-200" y="340" width="400" height="10" fill="#5a606a" />
    <rect x="-105" y="-170" width="210" height="520" rx="16" fill="#3e4a5c" />
    <rect x="-105" y="-170" width="30" height="520" fill="#566278" opacity="0.6" />
    <rect x="-120" y="-225" width="240" height="62" rx="12" fill="#c4202a" />
    <rect x="-120" y="-225" width="240" height="14" rx="7" fill="#e85a60" opacity="0.6" />
    <rect x="-75" y="-120" width="150" height="80" rx="8" fill="#06120a" />
    <text x="0" y="-66" textAnchor="middle" fontFamily="'DejaVu Sans Mono', monospace" fontWeight="700" fontSize="44" fill="#7dff9a">{compteur.toFixed(2)}</text>
    <rect x="-60" y="-10" width="120" height="70" rx="8" fill="#1e2632" />
    {[0, 1, 2].map((k) => <circle key={k} cx={-30 + k * 30} cy="25" r="10" fill="#4a5466" />)}
    {lueur('p2-ecr', 0, -80, 160, '#7dff9a', 0.18 * lum)}
  </g>
);

// ----- la boutique vue de loin (couche du fond du quai) -----
const BoutiqueLoin = ({f, lit = 1, caissiere = null}) => (
  <g>
    <rect x="-1300" y="-420" width="2600" height="720" fill="#2a2e38" />
    <rect x="-1300" y="-470" width="2600" height="60" fill="#c4202a" />
    <defs>
      <linearGradient id="bl-vit" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f4f8ff" stopOpacity={0.95 * lit} />
        <stop offset="1" stopColor="#a8b2c4" stopOpacity={0.95 * lit} />
      </linearGradient>
    </defs>
    <rect x="-1150" y="-330" width="2300" height="520" fill="#0c0e14" />
    <rect x="-1150" y="-330" width="2300" height="520" fill="url(#bl-vit)" />
    {/* rayonnages vus par la vitrine */}
    {[-950, -600, -250, 100].map((x, k) => (
      <g key={k} opacity={0.85 * lit}>
        <rect x={x} y="-150" width="260" height="340" fill="#7a808c" />
        {[0, 1, 2, 3].map((j) => <rect key={j} x={x + 15} y={-130 + j * 80} width="230" height="46" fill={['#c84a3a', '#3a74c8', '#e0b030', '#4aa860', '#a04aa0'][(j + k) % 5]} />)}
      </g>
    ))}
    <rect x="550" y="40" width="550" height="150" fill="#8a6a50" opacity={lit} />
    <rect x="1170" y="-330" width="110" height="520" fill="#0e1016" />
    <rect x="1180" y="-320" width="90" height="500" fill="#c8d4e8" opacity={0.6 * lit} />
    {caissiere}
    {[-1150, -575, 0, 575, 1150].map((x) => <rect key={x} x={x - 12} y="-330" width="24" height="520" fill="#1a1c22" />)}
    <rect x="-1300" y="190" width="2600" height="110" fill="#3a3e48" />
    {lueur('bl-h', 0, -100, 1500, '#e8f2ff', 0.22 * lit)}
  </g>
);

// ===== le quai (vue de côté : la voiture, la pompe, toi ; la boutique et la forêt derrière) =====
// o : compteur, neons [3] (auvent), creature {x, pose, tete, ouvre}, moi {pose…}, caissiere (dans la vitrine), lit (boutique)
export const Quai = ({cam, f, o = {}}) => {
  const ne = o.neons || [1, 1, 1];
  const lit = o.lit ?? 1;
  const nm = (ne[0] + ne[1] + ne[2]) / 3;
  return (
    <g>
      <defs>
        <linearGradient id="q-ciel" x1="0" y1="0" x2="0" y2="1920" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#04050a" />
          <stop offset="0.55" stopColor="#141a2c" />
          <stop offset="1" stopColor="#1e2638" />
        </linearGradient>
        <linearGradient id="q-sol" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a3040" />
          <stop offset="0.25" stopColor="#151820" />
          <stop offset="1" stopColor="#07080b" />
        </linearGradient>
        <linearGradient id="q-brume" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a6a88" stopOpacity="0" />
          <stop offset="0.6" stopColor="#5a6a88" stopOpacity="0.45" />
          <stop offset="1" stopColor="#5a6a88" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="q-cone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8f4ff" stopOpacity="0.2" />
          <stop offset="1" stopColor="#e8f4ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="-400" y="-400" width="1880" height="2720" fill="url(#q-ciel)" />
      {/* forêt lointaine + brume */}
      <Couche cam={cam} p={0.15}><Sapins n={34} y={260} h={900} couleur="#0c1220" seed="s1" largeur={5200} /></Couche>
      <Couche cam={cam} p={0.3}><rect x="-3000" y="60" width="6000" height="320" fill="url(#q-brume)" /><Sapins n={26} y={300} h={1100} couleur="#080c16" seed="s2" largeur={5600} /></Couche>
      {/* la boutique */}
      <Couche cam={cam} p={0.6}>
        <g transform="translate(250 0) scale(0.75)"><BoutiqueLoin f={f} lit={lit} caissiere={o.caissiere} /></g>
        <rect x="-3000" y="160" width="6000" height="140" fill="url(#q-brume)" opacity="0.7" />
      </Couche>
      {/* sol mouillé, reflets des néons */}
      <Couche cam={cam} p={1}>
        <rect x="-3000" y="230" width="6000" height="1800" fill="url(#q-sol)" />
        {[-900, 0, 900].map((x, k) => (
          <g key={k} opacity={ne[k]}>
            <path d={`M${x - 140},${SOLY + 30} L${x + 140},${SOLY + 30} L${x + 60},${SOLY + 520} L${x - 60},${SOLY + 520} Z`} fill="#dff0ff" opacity="0.07" />
            <ellipse cx={x} cy={SOLY + 40} rx="620" ry="70" fill="#9fb6d0" opacity="0.1" />
          </g>
        ))}
        <path d={`M-2000,${SOLY + 260} L2000,${SOLY + 260}`} stroke="#d8d0a0" strokeWidth="10" strokeDasharray="120 90" opacity="0.25" />
      </Couche>
      {/* plan principal : piliers, voiture, pompe, toi, la créature */}
      <Couche cam={cam} p={1}>
        {[-1350, 1350].map((x) => <rect key={x} x={x - 45} y="-640" width="90" height={SOLY + 640} fill="#4a5060" />)}
        <Voiture2D x={0} phares={o.phares} lum={nm} />
        {o.creature && (
          <g transform={`translate(${o.creature.x ?? -230} ${o.creature.y ?? 48}) scale(${o.creature.s ?? 0.42}) rotate(${o.creature.rot || 0})`}>
            <Rodeur pose={o.creature.pose} tete={o.creature.tete || 0} ouvre={o.creature.ouvre || 0} respire={0.5 + 0.5 * Math.sin(f / 14)} lum={0.95} id="q-ro" />
          </g>
        )}
        <Pompe2D x={640} compteur={o.compteur ?? 0} lum={nm} />
        {/* le tuyau, du pistolet à la trappe */}
        <path d={`M${o.moi ? 455 : 300},${o.moi ? 40 : 200} Q420,320 545,120`} stroke="#0e0e10" strokeWidth="18" fill="none" strokeLinecap="round" />
        {o.moi && <B2D x={o.moi.x ?? 430} y={SOLY} s={0.62} id="q-moi" {...o.moi.pose} />}
        {o.premier}
      </Couche>
      {/* l'auvent : bandeau, néons, cônes de lumière */}
      <Couche cam={cam} p={1}>
        <rect x="-2200" y="-760" width="4400" height="130" fill="#6a707c" />
        <rect x="-2200" y="-650" width="4400" height="26" fill="#c4202a" />
        <rect x="-2200" y="-624" width="4400" height="20" fill="#8a9098" />
        {[-900, 0, 900].map((x, k) => (
          <g key={k}>
            <path d={`M${x - 260},-600 L${x + 260},-600 L${x + 760},${SOLY} L${x - 760},${SOLY} Z`} fill="url(#q-cone)" opacity={ne[k]} />
            <rect x={x - 260} y="-612" width="520" height="16" rx="8" fill={ne[k] > 0.5 ? '#f6fbff' : '#2a2e34'} />
            {ne[k] > 0.3 && lueur(`q-n${k}`, x, -590, 520, '#d8ecff', 0.45 * ne[k])}
          </g>
        ))}
      </Couche>
      {/* premier plan flou (poubelle, borne) */}
      <Couche cam={cam} p={1.5}>
        <g filter="url(#q-flou)">
          <defs>
            <filter id="q-flou" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
              <feGaussianBlur stdDeviation="14" />
            </filter>
          </defs>
          <rect x="-1450" y="120" width="220" height="300" rx="20" fill="#0a0c10" />
          <rect x="1250" y="60" width="160" height="360" rx="14" fill="#0a0c10" />
        </g>
      </Couche>
      <rect x="-400" y="-400" width="1880" height="2720" fill="#03040a" opacity={0.22 + 0.45 * (1 - nm)} />
    </g>
  );
};

// ===== la façade (vue depuis la pompe, de face) : la caissière derrière la vitrine =====
// o : caissiere (props B2D), feuille (0 → 1), tape (secousse de la vitre), lit
export const Facade = ({cam, f, o = {}}) => {
  const lit = o.lit ?? 1;
  const tape = o.tape || 0;
  return (
    <g>
      <rect x="-400" y="-400" width="1880" height="2720" fill="#06070c" />
      <Couche cam={cam} p={0.2}><Sapins n={20} y={-200} h={900} couleur="#0b1020" seed="f1" largeur={4000} /></Couche>
      <Couche cam={cam} p={1}>
        {/* le bâtiment */}
        <rect x="-1500" y="-640" width="3000" height="1100" fill="#2a2e38" />
        <rect x="-1500" y="-700" width="3000" height="70" fill="#c4202a" />
        <defs>
          <linearGradient id="fa-vit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c8d4e8" stopOpacity={0.85 * lit} />
            <stop offset="1" stopColor="#6a7488" stopOpacity={0.85 * lit} />
          </linearGradient>
          <clipPath id="fa-c">
            <rect x="-1300" y="-520" width="2600" height="760" />
          </clipPath>
        </defs>
        <g transform={`translate(${tape * 4 * Math.sin(f * 3)} 0)`}>
          <rect x="-1300" y="-520" width="2600" height="760" fill="#0c0e14" />
          <rect x="-1300" y="-520" width="2600" height="760" fill="url(#fa-vit)" />
          <g clipPath="url(#fa-c)">
            {[-1150, -700, 500, 850].map((x, k) => (
              <g key={k} opacity={0.8 * lit}>
                <rect x={x} y="-300" width="300" height="540" fill="#7a808c" />
                {[0, 1, 2, 3, 4].map((j) => <rect key={j} x={x + 18} y={-280 + j * 100} width="264" height="60" fill={['#c84a3a', '#3a74c8', '#e0b030', '#4aa860', '#a04aa0'][(j + k) % 5]} />)}
              </g>
            ))}
            {o.caissiere && <Caissiere2D x={o.caissiere.x ?? 0} y={o.caissiere.y ?? 420} s={o.caissiere.s ?? 0.9} id="fa-ca" teinte={[1, 1, 1.03]} lum={0.95} {...o.caissiere.pose} />}
            {/* la feuille plaquée contre la vitre */}
            {o.feuille > 0 && (
              <g opacity={o.feuille} transform={`translate(${o.feuilleX ?? 0} ${-120}) rotate(-3)`}>
                <rect x="-230" y="-170" width="460" height="330" fill="#f2efe4" />
                <g fontFamily="'DejaVu Sans', sans-serif" fontWeight="800" fontStyle="italic" fill="#1a1a1a" textAnchor="middle">
                  <text y="-60" fontSize="82">NE LÈVE</text>
                  <text y="40" fontSize="82">PAS LES</text>
                  <text y="140" fontSize="82">YEUX</text>
                </g>
              </g>
            )}
            {/* reflets sur la vitre */}
            <path d="M-1300,-520 L-900,-520 L-1300,0 Z" fill="#fff" opacity="0.05" />
            <path d="M200,-520 L380,-520 L-100,240 L-280,240 Z" fill="#fff" opacity="0.04" />
          </g>
          {[-1300, -650, 650, 1300].map((x) => <rect key={x} x={x - 16} y="-520" width="32" height="760" fill="#1a1c22" />)}
        </g>
        {/* la porte vitrée (à droite) */}
        <rect x="880" y="-540" width="380" height="1000" fill="#121418" />
        <rect x="905" y="-515" width="330" height="950" fill="#d8e2f2" opacity={0.75 * lit} />
        <rect x="1180" y="-40" width="20" height="160" rx="8" fill="#8a8c90" />
        <rect x="-1500" y="240" width="880" height="240" fill="#3a3e48" />
        <rect x="1260" y="240" width="240" height="240" fill="#3a3e48" />
        <rect x="-620" y="240" width="1500" height="240" fill="#3a3e48" />
        {o.creature && (
          <g transform={`translate(${o.creature.x} ${o.creature.y ?? 470}) scale(${o.creature.s ?? 0.75})`}>
            <Rodeur pose={o.creature.pose} tete={o.creature.tete || 0} respire={0.5 + 0.5 * Math.sin(f / 14)} lum={0.95} id="fa-ro" />
          </g>
        )}
        <rect x="-3000" y="460" width="6000" height="1400" fill="#0c0e12" />
        {lueur('fa-h', 0, -100, 1600, '#e8f2ff', 0.2 * lit)}
      </Couche>
      {/* l'auvent au premier plan (on est dessous) */}
      <Couche cam={cam} p={1.35}>
        <rect x="-2400" y="-1250" width="4800" height="300" fill="#5a606c" />
        <rect x="-2400" y="-960" width="4800" height="24" fill="#c4202a" />
        {[-700, 700].map((x, k) => (
          <g key={k}>
            <rect x={x - 300} y="-930" width="600" height="20" rx="10" fill="#f6fbff" />
            {lueur(`fa-n${k}`, x, -900, 600, '#d8ecff', 0.4)}
          </g>
        ))}
        {/* la pompe, floue, au bord */}
        <rect x="-1350" y="-500" width="300" height="1500" rx="30" fill="#2a3240" filter="url(#q-flou2)" />
        <defs>
          <filter id="q-flou2" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation="16" />
          </filter>
        </defs>
      </Couche>
    </g>
  );
};

// ===== dans la boutique, vue vers la vitrine (dehors : le quai) =====
// o : neons [4] (plafond), caissiere {x, pose} (derrière le comptoir), dehors (props du Quai), plaque (élément collé à la vitre)
export const Interieur = ({cam, f, o = {}}) => {
  const ne = o.neons || [1, 1, 1, 1];
  const lit = (ne[0] + ne[1] + ne[2] + ne[3]) / 4;
  const c = (k) => Math.max(0.12, lit) * k;
  const tint = (r, g, b, k = 1) => `rgb(${Math.round(r * c(k))},${Math.round(g * c(k))},${Math.round(b * c(k))})`;
  // la caméra du dehors suit la nôtre (le quai est loin derrière la vitre)
  const camD = {x: cam.x * 0.15 - 250, y: -40, zoom: 0.85 + (cam.zoom - 1) * 0.1, ...(o.camDehors || {})};
  return (
    <g>
      <rect x="-400" y="-400" width="1880" height="2720" fill="#05060a" />
      <Couche cam={cam} p={1}>
        {/* le dehors par la vitrine */}
        <defs>
          <clipPath id="in-vit">
            <rect x="-1250" y="-520" width="2500" height="760" />
          </clipPath>
        </defs>
        <g clipPath="url(#in-vit)">
          <g transform="translate(0 -60) scale(1.7) translate(-540 -960)">
            <Quai cam={camD} f={f} o={{lit: 0, ...o.dehors}} />
          </g>
          {o.plaque}
          <rect x="-1250" y="-520" width="2500" height="760" fill="#dfe8ff" opacity={0.05 + 0.06 * lit} />
        </g>
        {[-1250, -625, 0, 625, 1250].map((x) => <rect key={x} x={x - 16} y="-520" width="32" height="760" fill={tint(40, 42, 48)} />)}
        {/* murs, plafond, sol */}
        <rect x="-3000" y="-1400" width="6000" height="880" fill={tint(150, 155, 162)} />
        <rect x="-3000" y="240" width="6000" height="140" fill={tint(110, 112, 118)} />
        <path d="M-1250,-520 L-3000,-1400 L-3000,2000 L-1250,240 Z" fill={tint(135, 140, 145)} />
        <path d="M1250,-520 L3000,-1400 L3000,2000 L1250,240 Z" fill={tint(135, 140, 145)} />
        {/* sol carrelé en perspective */}
        <path d="M-1250,380 L1250,380 L3000,2400 L-3000,2400 Z" fill={tint(170, 172, 168)} />
        {[...Array(11)].map((_, k) => {
          const u = (k - 5) / 5;
          return <path key={k} d={`M${u * 1250},380 L${u * 3000},2400`} stroke={tint(90, 92, 95)} strokeWidth="4" />;
        })}
        {[0.15, 0.35, 0.6, 0.9].map((v, k) => {
          const y = 380 + v * 2020;
          const w = 1250 + v * 1750;
          return <path key={`h${k}`} d={`M${-w},${y} L${w},${y}`} stroke={tint(90, 92, 95)} strokeWidth="4" />;
        })}
        {/* rayonnage à gauche, comptoir et caisse à droite */}
        <path d="M-1250,-380 L-1900,-700 L-1900,1300 L-1250,380 Z" fill={tint(110, 115, 125)} />
        {[0, 1, 2, 3, 4].map((j) => <path key={j} d={`M-1265,${-300 + j * 130} L-1880,${-560 + j * 360} L-1880,${-460 + j * 360} L-1265,${-250 + j * 130} Z`} fill={['#c84a3a', '#3a74c8', '#e0b030', '#4aa860', '#a04aa0'][j]} opacity={c(1)} />)}
        {o.caissiere && <Caissiere2D x={o.caissiere.x ?? 950} y={o.caissiere.y ?? 560} s={o.caissiere.s ?? 0.85} id="in-ca" teinte={[1, 1, 1.02]} lum={Math.max(0.25, lit)} {...o.caissiere.pose} />}
        <path d="M500,160 L1500,160 L1900,500 L500,500 Z" fill={tint(120, 92, 70)} />
        <rect x="500" y="500" width="1400" height="900" fill={tint(90, 68, 52)} />
        <rect x="760" y="40" width="240" height="140" rx="12" fill={tint(30, 32, 38)} />
        {o.premier}
        {/* néons du plafond */}
        {[[-650, -1000], [650, -1000], [-900, -1250], [900, -1250]].map(([x, y], k) => (
          <g key={k}>
            <rect x={x - 330} y={y} width="660" height="34" rx="14" fill={ne[k] > 0.5 ? '#f6fbff' : '#2a2e34'} />
            {ne[k] > 0.3 && lueur(`in-n${k}`, x, y + 20, 700, '#e4f0ff', 0.35 * ne[k])}
          </g>
        ))}
      </Couche>
    </g>
  );
};

// ===== l'arrière-boutique : la porte du générateur, sa veilleuse rouge =====
export const Arriere = ({cam, f, o = {}}) => {
  const ne = o.neons || [0, 0, 0, 0.6];
  const lit = Math.max(0.15, (ne[0] + ne[1] + ne[2] + ne[3]) / 4);
  const t = (r, g, b) => `rgb(${Math.round(r * lit)},${Math.round(g * lit)},${Math.round(b * lit)})`;
  const clig = 0.7 + 0.3 * Math.sin(f / 5);
  return (
    <g>
      <rect x="-400" y="-400" width="1880" height="2720" fill="#040406" />
      <Couche cam={cam} p={1}>
        <rect x="-3000" y="-1400" width="6000" height="1780" fill={t(120, 124, 130)} />
        {/* frigos */}
        {[-1300, -800, -300].map((x, k) => (
          <g key={k}>
            <rect x={x} y="-700" width="460" height="1080" fill={t(70, 80, 95)} />
            <rect x={x + 20} y="-680" width="420" height="1040" fill={t(150, 190, 220)} opacity="0.5" />
            {[0, 1, 2, 3].map((j) => <rect key={j} x={x + 40} y={-640 + j * 250} width="380" height="40" fill={t(200, 120, 80)} opacity="0.6" />)}
          </g>
        ))}
        {/* la porte */}
        <rect x="380" y="-560" width="520" height="940" fill="#2a2c32" />
        <rect x="400" y="-540" width="480" height="920" fill="#3e4048" />
        <rect x="820" y="-20" width="30" height="110" rx="8" fill="#8a8c90" />
        <rect x="470" y="-460" width="340" height="200" fill="#16171c" />
        {/* veilleuse rouge au-dessus */}
        <rect x="560" y="-660" width="160" height="60" rx="10" fill="#ff2a2a" opacity={clig} />
        {lueur('ar-r', 640, -630, 900, '#ff2020', 0.45 * clig)}
        <path d="M-3000,380 L3000,380 L3000,2400 L-3000,2400 Z" fill={t(150, 152, 150)} />
        <path d="M380,380 L900,380 L1400,2400 L-200,2400 Z" fill="#ff2a2a" opacity={0.08 * clig} />
      </Couche>
    </g>
  );
};

// ===== le plafond de la boutique, vu d'en dessous : dalles et quatre néons =====
export const Plafond = ({cam, f, o = {}}) => {
  const ne = o.neons || [1, 1, 1, 1];
  const lit = Math.max(0.1, (ne[0] + ne[1] + ne[2] + ne[3]) / 4);
  const g = (v) => Math.round(v * lit);
  const POS = [[-330, -420], [330, -420], [-330, 300], [330, 300]];
  return (
    <g>
      <rect x="-400" y="-400" width="1880" height="2720" fill={`rgb(${g(150)},${g(155)},${g(162)})`} />
      <Couche cam={cam} p={1}>
        {/* dalles en perspective (point de fuite au centre) */}
        {[...Array(9)].map((_, k) => {
          const u = (k - 4) / 4;
          return <path key={`v${k}`} d={`M${u * 220},0 L${u * 2600},-1700 M${u * 220},0 L${u * 2600},1700`} stroke={`rgb(${g(95)},${g(98)},${g(105)})`} strokeWidth="5" />;
        })}
        {[0.12, 0.3, 0.55, 0.9].map((v, k) => [-1, 1].map((sg) => <path key={`h${k}${sg}`} d={`M${-2600},${sg * v * 1700} L2600,${sg * v * 1700}`} stroke={`rgb(${g(95)},${g(98)},${g(105)})`} strokeWidth="5" />))}
        {POS.map(([x, y], k) => (
          <g key={k}>
            <rect x={x - 190} y={y - 70} width="380" height="140" rx="10" fill="#2a2e34" />
            <rect x={x - 170} y={y - 50} width="340" height="100" rx="8" fill={ne[k] > 0.5 ? '#f6fbff' : '#1a1c20'} />
            {ne[k] > 0.3 && lueur(`pf-${k}`, x, y, 520, '#e4f0ff', 0.55 * ne[k])}
          </g>
        ))}
      </Couche>
    </g>
  );
};
