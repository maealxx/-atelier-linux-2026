import {random} from 'remotion';
import {SOL} from './Rue';

// ===================== Décors du lycée (« Salle zéro ») =====================
// Mêmes unités que la rue : sol à Y = 432, 1 Z = 1000 unités. Plafond du lycée à Y = -700.
export const PLAF = -700;

const ligne = (cam, A, B, w, col, key, op = 1) => {
  const r = cam.seg(A, B);
  return r ? <line key={key} x1={r[0][0]} y1={r[0][1]} x2={r[1][0]} y2={r[1][1]} stroke={col} strokeWidth={w} opacity={op} strokeLinecap="round" /> : null;
};

// Dessine un contenu 2D (largeur w, hauteur h, en unités monde) plaqué sur un plan 3D :
// P0 = coin haut-gauche, ax = vecteur unitaire « largeur », ay = vecteur unitaire « hauteur » (en unités, Z en Z).
export const plaque = (cam, P0, ax, ay, w, h, contenu, key) => {
  const pt = (u, v) => [P0[0] + ax[0] * u + ay[0] * v, P0[1] + ax[1] * u + ay[1] * v, P0[2] + (ax[2] * u + ay[2] * v) / 1000];
  const coins = [pt(0, 0), pt(w, 0), pt(0, h), pt(w, h)];
  if (!coins.every((c) => cam.visible(c[2], c[0], c[1]))) return null;
  const o = cam.proj(...coins[0]);
  const u = cam.proj(...coins[1]);
  const v = cam.proj(...coins[2]);
  const m = [(u[0] - o[0]) / w, (u[1] - o[1]) / w, (v[0] - o[0]) / h, (v[1] - o[1]) / h, o[0], o[1]];
  return (
    <g key={key} transform={`matrix(${m.join(' ')})`}>
      {contenu}
    </g>
  );
};

const boite = (cam, x0, x1, y0, y1, z0, z1, cols, key) => {
  const {poly} = cam;
  const [dessus, face, cote] = cols;
  const sx = cam.x > x1 ? x1 : cam.x < x0 ? x0 : null;
  const sz = cam.z < z0 ? z0 : cam.z > z1 ? z1 : null;
  return (
    <g key={key}>
      {cam.y < y0 && <polygon points={poly([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]])} fill={dessus} />}
      {sx !== null && <polygon points={poly([[sx, y0, z0], [sx, y0, z1], [sx, y1, z1], [sx, y1, z0]])} fill={cote} />}
      {sz !== null && <polygon points={poly([[x0, y0, sz], [x1, y0, sz], [x1, y1, sz], [x0, y1, sz]])} fill={face} />}
    </g>
  );
};

const brumeDef = (cam, id, couleur, force) => (
  <radialGradient id={id} cx={cam.fuite[0]} cy={cam.fuite[1]} r="950" gradientUnits="userSpaceOnUse">
    <stop offset="0" stopColor={couleur} stopOpacity={force} />
    <stop offset="0.3" stopColor={couleur} stopOpacity={force * 0.55} />
    <stop offset="0.7" stopColor={couleur} stopOpacity="0.1" />
    <stop offset="1" stopColor={couleur} stopOpacity="0" />
  </radialGradient>
);

const CRAIE = {fontFamily: "'DejaVu Sans', Arial, sans-serif", fontWeight: 700, fill: '#e9efe6'};

// ===================== LA SALLE DE CLASSE =====================
// Salle de X -950 à 950, de Z -1.5 (fond) à 7 (tableau). Tables en 3 colonnes × 3 rangées.
export const CX = 950;
export const CFOND = 7;
export const TABLES = [-560, 0, 560].flatMap((x) => [1.4, 2.8, 4.2].map((z) => ({x, z})));
export const TABLE_PERSO = {x: 0, z: 2.8};

export const classe = (cam, f, {neon = 0, craie = 0, horloge = [19, 12], lune = 1} = {}) => {
  const {poly} = cam;
  const zA = -1.5;
  const zB = CFOND;
  const lignesSol = [];
  for (let z = Math.ceil(zA * 2) / 2; z < zB; z += 0.5) lignesSol.push(ligne(cam, [-CX, SOL, z], [CX, SOL, z], 2, '#1e2124', `s${z}`, 0.7));
  for (let x = -CX; x <= CX; x += 380) lignesSol.push(ligne(cam, [x, SOL, zA], [x, SOL, zB], 2, '#1e2124', `sx${x}`, 0.7));
  const fenetres = [1, 3, 5].map((z, k) => (
    <g key={`fe${k}`}>
      <polygon points={poly([[-CX, -560, z], [-CX, -560, z + 1.4], [-CX, 80, z + 1.4], [-CX, 80, z]])} fill="url(#cl-nuit)" />
      {ligne(cam, [-CX, -240, z], [-CX, -240, z + 1.4], 10, '#2a2d33', 'h')}
      {ligne(cam, [-CX, -560, z + 0.7], [-CX, 80, z + 0.7], 10, '#2a2d33', 'v')}
      {/* stores à moitié baissés */}
      <polygon points={poly([[-CX + 2, -560, z], [-CX + 2, -560, z + 1.4], [-CX + 2, -380 - k * 40, z + 1.4], [-CX + 2, -380 - k * 40, z]])} fill="#3b3a35" />
      {[0, 1, 2, 3].map((r) => ligne(cam, [-CX + 3, -540 + r * 40, z], [-CX + 3, -540 + r * 40, z + 1.4], 2, '#2a2925', `st${r}`))}
      {/* rayon de lune sur le sol */}
      <polygon points={poly([[-CX, SOL, z + 0.1], [-CX, SOL, z + 1.3], [-CX + 900, SOL, z + 1.8], [-CX + 900, SOL, z + 0.6]])} fill="#9fb8ff" opacity={0.1 * lune} />
    </g>
  ));
  const fond = (
    <g>
      <defs>
        {brumeDef(cam, 'cl-brume', '#05060a', 0.55)}
        <linearGradient id="cl-nuit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0e1630" />
          <stop offset="1" stopColor="#24324f" />
        </linearGradient>
        <radialGradient id="cl-neon">
          <stop offset="0" stopColor="#eef6ff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#eef6ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1080" height="1920" fill="#050508" />
      {/* murs, plafond, sol */}
      <polygon points={poly([[-CX, PLAF, zB], [CX, PLAF, zB], [CX, SOL, zB], [-CX, SOL, zB]])} fill="#3a3f3a" />
      <polygon points={poly([[-CX, PLAF, zA], [CX, PLAF, zA], [CX, SOL, zA], [-CX, SOL, zA]])} fill="#34383a" />
      <polygon points={poly([[-CX, PLAF, zA], [-CX, PLAF, zB], [-CX, SOL, zB], [-CX, SOL, zA]])} fill="#3d4240" />
      <polygon points={poly([[CX, PLAF, zA], [CX, PLAF, zB], [CX, SOL, zB], [CX, SOL, zA]])} fill="#383d3b" />
      <polygon points={poly([[-CX, PLAF, zA], [CX, PLAF, zA], [CX, PLAF, zB], [-CX, PLAF, zB]])} fill="#1d1f22" />
      <polygon points={poly([[-CX, SOL, zA], [CX, SOL, zA], [CX, SOL, zB], [-CX, SOL, zB]])} fill="#2b2e31" />
      {lignesSol}
      {/* plinthes */}
      {ligne(cam, [-CX, SOL - 20, zA], [-CX, SOL - 20, zB], 6, '#23262a', 'p1')}
      {ligne(cam, [CX, SOL - 20, zA], [CX, SOL - 20, zB], 6, '#23262a', 'p2')}
      {fenetres}
      {/* tableau noir + rebord à craie */}
      <polygon points={poly([[-640, -520, zB - 0.01], [640, -520, zB - 0.01], [640, -60, zB - 0.01], [-640, -60, zB - 0.01]])} fill="#5a4630" />
      <polygon points={poly([[-610, -495, zB - 0.012], [610, -495, zB - 0.012], [610, -85, zB - 0.012], [-610, -85, zB - 0.012]])} fill="#1d3a2d" />
      {plaque(
        cam,
        [-600, -490, zB - 0.015],
        [1, 0, 0],
        [0, 1, 0],
        1200,
        400,
        <g>
          {/* vieilles traces de craie effacées */}
          <path d="M60,300 q80,-40 160,0 t160,0 M700,90 l200,0 M720,140 l140,0 M980,320 q40,-60 90,0" stroke="#e9efe6" strokeWidth="6" fill="none" opacity="0.12" />
          <text x="80" y="110" fontSize="44" {...CRAIE} opacity="0.13">x² + 3x - 4 = 0</text>
          {craie > 0 && (
            <g opacity="0.92">
              <text x="600" y="190" fontSize="92" textAnchor="middle" {...CRAIE}>{'NE COURS PAS'.slice(0, Math.ceil(craie * 22))}</text>
              <text x="600" y="310" fontSize="80" textAnchor="middle" {...CRAIE}>{craie > 0.55 ? 'DANS LES COULOIRS'.slice(0, Math.ceil(((craie - 0.55) / 0.45) * 17)) : ''}</text>
              {craie >= 1 && <path d="M260,340 q340,24 680,0" stroke="#e9efe6" strokeWidth="7" fill="none" />}
            </g>
          )}
        </g>,
        'craie'
      )}
      {ligne(cam, [-620, -55, zB - 0.06], [620, -55, zB - 0.06], 14, '#4a3a28', 'rebord')}
      {/* horloge */}
      {plaque(
        cam,
        [700, -640, zB - 0.01],
        [1, 0, 0],
        [0, 1, 0],
        160,
        160,
        <g transform="translate(80 80)">
          <circle r="78" fill="#d8d6cc" stroke="#222" strokeWidth="8" />
          {[...Array(12)].map((_, k) => (
            <line key={k} x1="0" y1="-62" x2="0" y2="-70" stroke="#222" strokeWidth="5" transform={`rotate(${k * 30})`} />
          ))}
          <line x1="0" y1="0" x2="0" y2="-38" stroke="#111" strokeWidth="8" strokeLinecap="round" transform={`rotate(${(horloge[0] % 12) * 30 + horloge[1] * 0.5})`} />
          <line x1="0" y1="0" x2="0" y2="-58" stroke="#111" strokeWidth="5" strokeLinecap="round" transform={`rotate(${horloge[1] * 6})`} />
          <line x1="0" y1="8" x2="0" y2="-62" stroke="#b01818" strokeWidth="2" transform={`rotate(${(f * 6) % 360})`} />
        </g>,
        'horloge'
      )}
      {/* affiches et porte sur le mur droit */}
      {[[1.2, '#7a3b2e'], [2.2, '#2e5a7a'], [3.6, '#6a6a2e']].map(([z, c], k) => (
        <polygon key={`af${k}`} points={poly([[CX - 1, -520, z], [CX - 1, -520, z + 0.7], [CX - 1, -120, z + 0.7], [CX - 1, -120, z]])} fill={c} opacity="0.75" />
      ))}
      {plaque(
        cam,
        [CX - 2, -500, 2.25],
        [0, 0, 1],
        [0, 1, 0],
        600,
        360,
        <g opacity="0.7">
          {[...Array(6)].map((_, r) => [...Array(9)].map((_, c) => <rect key={`${r}${c}`} x={20 + c * 62} y={20 + r * 55} width="54" height="46" fill={['#d8b35a', '#5ab3d8', '#d85a5a'][(r + c) % 3]} opacity="0.55" />))}
        </g>,
        'mendeleiev'
      )}
      <polygon points={poly([[CX - 1, -330, 5.5], [CX - 1, -330, 6.4], [CX - 1, SOL, 6.4], [CX - 1, SOL, 5.5]])} fill="#5b4632" />
      <polygon points={poly([[CX - 2, -260, 5.7], [CX - 2, -260, 6.2], [CX - 2, -80, 6.2], [CX - 2, -80, 5.7]])} fill="#141a24" />
      {/* néons du plafond */}
      {[1.5, 3.5, 5.5].flatMap((z) =>
        [-450, 450].map((x) => (
          <g key={`n${x}${z}`}>
            <polygon points={poly([[x - 70, PLAF + 5, z], [x + 70, PLAF + 5, z], [x + 70, PLAF + 5, z + 0.9], [x - 70, PLAF + 5, z + 0.9]])} fill={neon > 0.2 ? '#f4fbff' : '#3a3d42'} />
            {neon > 0.05 && <polygon points={poly([...Array(16)].map((_, k) => [x + Math.cos((k / 16) * 6.283) * 500, SOL - 1, z + 0.45 + Math.sin((k / 16) * 6.283) * 0.6]))} fill="url(#cl-neon)" opacity={neon} />}
          </g>
        ))
      )}
    </g>
  );

  const items = [];
  // bureau du prof
  items.push({z: 6.0, el: boite(cam, -350, 350, 120, SOL, 5.8, 6.4, ['#5b4a38', '#4a3b2c', '#3d3125'], 'bureau')});
  items.push({z: 5.95, el: plaque(cam, [-150, 60, 6.0], [1, 0, 0], [0, 1, 0], 200, 60, <g><rect width="120" height="60" fill="#c9c1a8" /><rect x="130" y="20" width="60" height="40" fill="#8a2e2e" /></g>, 'livres')});
  // tables + chaises retournées dessus
  TABLES.forEach((t, k) => {
    const x0 = t.x - 200;
    const x1 = t.x + 200;
    const z0 = t.z;
    const z1 = t.z + 0.45;
    const perso = t.x === TABLE_PERSO.x && t.z === TABLE_PERSO.z;
    const s = cam.scale(z0 + 0.2, t.x, 150);
    items.push({
      z: z0,
      el: (
        <g key={`t${k}`}>
          {[[x0 + 15, z0 + 0.03], [x1 - 15, z0 + 0.03], [x0 + 15, z1 - 0.03], [x1 - 15, z1 - 0.03]].map(([x, z], j) => ligne(cam, [x, 165, z], [x, SOL, z], Math.max(1, 12 * s), '#2a2c30', `p${j}`))}
          {boite(cam, x0, x1, 140, 165, z0, z1, ['#a08a68', '#7d6a50', '#6a5a44'], 'plateau')}
          {!perso &&
            [-100, 100].map((dx, j) => (
              <g key={`ch${j}`}>
                {boite(cam, t.x + dx - 75, t.x + dx + 75, 110, 140, z0 + 0.08, z0 + 0.38, ['#3b5a7a', '#2f4a66', '#284058'], 'assise')}
                {[[-65, 0.1], [65, 0.1], [-65, 0.36], [65, 0.36]].map(([lx, lz], q) => ligne(cam, [t.x + dx + lx, 110, z0 + lz], [t.x + dx + lx, -140, z0 + lz], Math.max(1, 8 * s), '#5d6066', `l${q}`))}
              </g>
            ))}
          {perso && (
            <g>
              {/* sa trousse et son cahier */}
              {plaque(cam, [-120, 138, z0 + 0.1], [1, 0, 0], [0, 0, 1], 160, 220, <g><rect width="160" height="220" fill="#e8e4d8" /><line x1="20" y1="40" x2="140" y2="40" stroke="#9ab" strokeWidth="4" /><line x1="20" y1="80" x2="140" y2="80" stroke="#9ab" strokeWidth="4" /><line x1="20" y1="120" x2="120" y2="120" stroke="#9ab" strokeWidth="4" /></g>, 'cahier')}
              {boite(cam, 60, 170, 105, 140, z0 + 0.15, z0 + 0.25, ['#c44', '#a33', '#922'], 'trousse')}
            </g>
          )}
        </g>
      ),
    });
  });
  // sac par terre
  items.push({z: 2.2, el: boite(cam, 180, 330, 300, SOL, 2.1, 2.3, ['#2d2d3a', '#24242f', '#1e1e28'], 'sac')});
  const brume = <rect key="br" width="1080" height="1920" fill="url(#cl-brume)" />;
  return {fond, items, brume};
};

// ===================== LE COULOIR =====================
// Couloir de Z -6 à 30, X ±520. Casiers bleus sur le mur gauche, portes de classes à droite.
export const KX = 520;
export const KFOND = 30;
export const CASIERS = [];
for (let z = 0.6; z < 26; z += 0.34) if (Math.floor((z - 0.6) / 4.2) % 3 !== 2) CASIERS.push(z);
export const SORTIES = [-1, 4.5, 10, 15.5, 21];
export const NEONS = [0, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25];

export const couloir = (
  cam,
  f,
  {neon = () => 0, casier = () => 0, fleche = () => 0, porteRouge = 'fond', ouvreRouge = 0.15, affichage = 1, eclats = null} = {}
) => {
  const {poly} = cam;
  const zA = cam.z - 3;
  const zB = KFOND;
  const sol = [];
  for (let z = Math.ceil(zA * 2) / 2; z < zB; z += 0.5) sol.push(ligne(cam, [-KX, SOL, z], [KX, SOL, z], 2, '#1b1d20', `s${z}`, 0.8));
  for (let x = -KX + 260; x < KX; x += 260) sol.push(ligne(cam, [x, SOL, zA], [x, SOL, zB], 2, '#1b1d20', `sx${x}`, 0.8));
  const portes = [3, 7.2, 11.4, 15.6, 19.8, 24].map((z, k) => (
    <g key={`po${k}`}>
      <polygon points={poly([[KX - 1, -330, z], [KX - 1, -330, z + 0.95], [KX - 1, SOL, z + 0.95], [KX - 1, SOL, z]])} fill="#5a4530" />
      <polygon points={poly([[KX - 2, -250, z + 0.2], [KX - 2, -250, z + 0.55], [KX - 2, -60, z + 0.55], [KX - 2, -60, z + 0.2]])} fill="#0d1218" />
      {ligne(cam, [KX - 4, 60, z + 0.8], [KX - 4, 60, z + 0.88], 10, '#b8b2a0', 'poignee')}
      {plaque(cam, [KX - 3, -420, z + 0.25], [0, 0, 1], [0, 1, 0], 450, 70, <g><rect width="450" height="70" rx="8" fill="#d8d4c8" /><text x="225" y="52" fontSize="48" textAnchor="middle" fontWeight="900" fill="#222" fontFamily="'DejaVu Sans', Arial">{`SALLE ${12 + k}`}</text></g>, 'num')}
    </g>
  ));
  const rouge = porteRouge === 'fond' ? {x: 0, z: KFOND} : {x: -KX, z: porteRouge};
  const fond = (
    <g>
      <defs>
        {brumeDef(cam, 'co-brume', '#020304', 0.8)}
        <radialGradient id="co-vert">
          <stop offset="0" stopColor="#3dff8a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#3dff8a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="co-rouge">
          <stop offset="0" stopColor="#ff2a1a" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ff2a1a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="co-neon">
          <stop offset="0" stopColor="#f0fff6" stopOpacity="0.5" />
          <stop offset="1" stopColor="#f0fff6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1080" height="1920" fill="#030405" />
      {/* bout du couloir (porte rouge au fond, ou mur) */}
      <polygon points={poly([[-KX, PLAF, zB], [KX, PLAF, zB], [KX, SOL, zB], [-KX, SOL, zB]])} fill="#2e3236" />
      {/* l'autre bout : double porte de sortie */}
      <polygon points={poly([[-KX, PLAF, -6], [KX, PLAF, -6], [KX, SOL, -6], [-KX, SOL, -6]])} fill="#2e3236" />
      <polygon points={poly([[-300, -330, -5.99], [300, -330, -5.99], [300, SOL, -5.99], [-300, SOL, -5.99]])} fill="#7a7f84" />
      {/* murs : bas peint, haut clair, frise */}
      {[-KX, KX].map((x) => (
        <g key={`m${x}`}>
          <polygon points={poly([[x, PLAF, zA], [x, PLAF, zB], [x, 60, zB], [x, 60, zA]])} fill="#3d3d38" />
          <polygon points={poly([[x, 60, zA], [x, 60, zB], [x, SOL, zB], [x, SOL, zA]])} fill="#2e3b45" />
          {ligne(cam, [x, 60, zA], [x, 60, zB], 8, '#7a2e2e', 'frise')}
        </g>
      ))}
      <polygon points={poly([[-KX, PLAF, zA], [KX, PLAF, zA], [KX, PLAF, zB], [-KX, PLAF, zB]])} fill="#191a1d" />
      <polygon points={poly([[-KX, SOL, zA], [KX, SOL, zA], [KX, SOL, zB], [-KX, SOL, zB]])} fill="#232529" />
      {sol}
      {portes}
      {/* tableau d'affichage en liège + la phrase à la craie sur une ardoise */}
      <polygon points={poly([[KX - 1, -420, 8.6], [KX - 1, -420, 10.6], [KX - 1, -60, 10.6], [KX - 1, -60, 8.6]])} fill="#8a6a44" />
      {[[8.7, -400, '#e8e4d8'], [9.2, -300, '#f2d649'], [9.8, -390, '#e8e4d8'], [10.1, -250, '#9fd0ff']].map(([z, y, c], k) => (
        <polygon key={`pa${k}`} points={poly([[KX - 2, y, z], [KX - 2, y, z + 0.4], [KX - 2, y + 160, z + 0.4], [KX - 2, y + 160, z]])} fill={c} opacity="0.85" />
      ))}
      <polygon points={poly([[KX - 1, -420, 13], [KX - 1, -420, 14.6], [KX - 1, -100, 14.6], [KX - 1, -100, 13]])} fill="#1d3a2d" stroke="#5a4630" strokeWidth="6" />
      {affichage > 0 &&
        plaque(
          cam,
          [KX - 2, -390, 13.08],
          [0, 0, 1],
          [0, 1, 0],
          1440,
          260,
          <g>
            <text x="720" y="110" fontSize="110" textAnchor="middle" {...CRAIE} opacity={affichage}>NE COURS PAS</text>
            <text x="720" y="220" fontSize="90" textAnchor="middle" {...CRAIE} opacity={affichage}>DANS LES COULOIRS</text>
          </g>,
          'ardoise'
        )}
      {/* extincteur, fontaine */}
      <polygon points={poly([[KX - 3, -60, 5.5], [KX - 3, -60, 5.65], [KX - 3, 160, 5.65], [KX - 3, 160, 5.5]])} fill="#b51e1e" />
      <polygon points={poly([[KX - 3, 40, 17.5], [KX - 3, 40, 18.1], [KX - 3, 200, 18.1], [KX - 3, 200, 17.5]])} fill="#9aa0a6" />
      {/* reflets verts des panneaux sur le sol brillant */}
      {SORTIES.map((z) => (
        <polygon key={`rv${z}`} points={poly([...Array(14)].map((_, k) => [Math.cos((k / 14) * 6.283) * 420, SOL - 1, z + Math.sin((k / 14) * 6.283) * 0.7]))} fill="url(#co-vert)" opacity="0.45" />
      ))}
      {/* porte rouge « SALLE 0 » */}
      {porteRouge === 'fond' ? (
        <g>
          <polygon points={poly([[-170, -330, zB - 0.01], [170, -330, zB - 0.01], [170, SOL, zB - 0.01], [-170, SOL, zB - 0.01]])} fill="#3a0606" />
          <polygon points={poly([[-170, -330, zB - 0.02], [170 - 300 * ouvreRouge, -330, zB - 0.02 - 0.2 * ouvreRouge], [170 - 300 * ouvreRouge, SOL, zB - 0.02 - 0.2 * ouvreRouge], [-170, SOL, zB - 0.02]])} fill="#8e1414" />
          <polygon points={poly([...Array(14)].map((_, k) => [Math.cos((k / 14) * 6.283) * 380, SOL - 1, zB - 0.6 + Math.sin((k / 14) * 6.283) * 0.6]))} fill="url(#co-rouge)" opacity={0.4 + ouvreRouge} />
          {plaque(cam, [-110, -440, zB - 0.02], [1, 0, 0], [0, 1, 0], 220, 80, <g><rect width="220" height="80" rx="8" fill="#d8d4c8" /><text x="110" y="58" fontSize="48" textAnchor="middle" fontWeight="900" fill="#7a0a0a" fontFamily="'DejaVu Sans', Arial">SALLE 0</text></g>, 'plaque0')}
        </g>
      ) : (
        <g>
          <polygon points={poly([[-KX + 1, -330, rouge.z], [-KX + 1, -330, rouge.z + 0.95], [-KX + 1, SOL, rouge.z + 0.95], [-KX + 1, SOL, rouge.z]])} fill="#3a0606" />
          <polygon points={poly([[-KX + 2, -330, rouge.z], [-KX + 2 + 300 * ouvreRouge, -330, rouge.z + 0.95 - 0.3 * ouvreRouge], [-KX + 2 + 300 * ouvreRouge, SOL, rouge.z + 0.95 - 0.3 * ouvreRouge], [-KX + 2, SOL, rouge.z]])} fill="#8e1414" />
          <polygon points={poly([...Array(14)].map((_, k) => [-KX + 250 + Math.cos((k / 14) * 6.283) * 300, SOL - 1, rouge.z + 0.5 + Math.sin((k / 14) * 6.283) * 0.6]))} fill="url(#co-rouge)" opacity={0.5 + ouvreRouge} />
          {plaque(cam, [-KX + 3, -440, rouge.z + 0.25], [0, 0, 1], [0, 1, 0], 450, 70, <g><rect width="450" height="70" rx="8" fill="#d8d4c8" /><text x="225" y="52" fontSize="48" textAnchor="middle" fontWeight="900" fill="#7a0a0a" fontFamily="'DejaVu Sans', Arial">SALLE 0</text></g>, 'plaque0')}
          {/* issue de secours en face */}
          <polygon points={poly([[KX - 1, -330, rouge.z + 0.2], [KX - 1, -330, rouge.z + 1.3], [KX - 1, SOL, rouge.z + 1.3], [KX - 1, SOL, rouge.z + 0.2]])} fill="#7a7f84" />
          {ligne(cam, [KX - 3, 40, rouge.z + 0.3], [KX - 3, 40, rouge.z + 1.2], 16, '#c8c8c0', 'barre')}
          {plaque(cam, [KX - 3, -450, rouge.z + 1.25], [0, 0, -1], [0, 1, 0], 1000, 100, <g><rect width="1000" height="100" rx="10" fill="#0fa04a" /><text x="500" y="74" fontSize="66" textAnchor="middle" fontWeight="900" fill="#fff" fontFamily="'DejaVu Sans', Arial">ISSUE DE SECOURS</text></g>, 'issue')}
          <polygon points={poly([...Array(14)].map((_, k) => [KX - 250 + Math.cos((k / 14) * 6.283) * 300, SOL - 1, rouge.z + 0.75 + Math.sin((k / 14) * 6.283) * 0.6]))} fill="url(#co-vert)" opacity="0.6" />
        </g>
      )}
    </g>
  );

  const items = [];
  // casiers (la porte pivote vers le couloir quand on l'ouvre)
  CASIERS.forEach((z, k) => {
    if (z < zA || z > zB) return;
    const a = casier(k) * 1.9;
    const L = 0.32;
    const x = -KX + 6;
    const bout = [x + 320 * Math.sin(a), z + L * Math.cos(a)];
    items.push({
      z: z + 0.05,
      el: (
        <g key={`c${k}`}>
          <polygon points={poly([[x - 1, -400, z], [x - 1, -400, z + L], [x - 1, 420, z + L], [x - 1, 420, z]])} fill={a > 0.05 ? '#08090b' : '#3d5a7a'} />
          {a > 0.05 && ligne(cam, [x - 2, 0, z + 0.02], [x - 2, 0, z + L - 0.02], 4, '#1b1d22', 'etag')}
          <polygon points={poly([[x, -400, z], [bout[0], -400, bout[1]], [bout[0], 420, bout[1]], [x, 420, z]])} fill={a > 0.05 ? '#4a6c90' : '#3d5a7a'} stroke="#22344a" strokeWidth="2" />
          {[-330, -300, -270].map((y) => ligne(cam, [x + 1 + 320 * Math.sin(a) * 0.3, y, z + 0.06 + L * Math.cos(a) * 0.3], [x + 1 + 320 * Math.sin(a) * 0.8, y, z + 0.06 + L * Math.cos(a) * 0.8], 3, '#22344a', `ev${y}`))}
          {ligne(cam, [x + 1 + 320 * Math.sin(a) * 0.85, 0, z + L * Math.cos(a) * 0.85], [x + 1 + 320 * Math.sin(a) * 0.85, 60, z + L * Math.cos(a) * 0.85], 6, '#b8b2a0', 'poi')}
        </g>
      ),
    });
  });
  // néons au plafond
  NEONS.forEach((z, i) => {
    if (z < zA - 1 || z > zB) return;
    const v = neon(i);
    items.push({
      z,
      el: (
        <g key={`n${i}`}>
          <polygon points={poly([[-60, PLAF + 8, z], [60, PLAF + 8, z], [60, PLAF + 8, z + 1], [-60, PLAF + 8, z + 1]])} fill={v > 0.2 ? '#f4fffa' : '#33363b'} />
          {v > 0.05 && <polygon points={poly([...Array(16)].map((_, k) => [Math.cos((k / 16) * 6.283) * 520, SOL - 1, z + 0.5 + Math.sin((k / 16) * 6.283) * 0.8]))} fill="url(#co-neon)" opacity={v} />}
          {eclats && eclats(i, z)}
        </g>
      ),
    });
  });
  // panneaux SORTIE suspendus (lisibles des deux côtés), la flèche peut pivoter
  SORTIES.forEach((z, i) => {
    if (z < zA || z > zB) return;
    const derriere = cam.z > z;
    const p0 = derriere ? [190, -640, z] : [-190, -640, z];
    const ax = derriere ? [-1, 0, 0] : [1, 0, 0];
    const p = cam.proj(0, -570, z);
    const s = cam.scale(z, 0, -570);
    items.push({
      z,
      el: (
        <g key={`so${i}`}>
          {ligne(cam, [-120, PLAF, z], [-120, -640, z], 3, '#222', 'f1')}
          {ligne(cam, [120, PLAF, z], [120, -640, z], 3, '#222', 'f2')}
          {cam.visible(z, 0, -570) && <circle cx={p[0]} cy={p[1]} r={420 * s} fill="url(#co-vert)" />}
          {plaque(
            cam,
            p0,
            ax,
            [0, 1, 0],
            380,
            140,
            <g>
              <rect width="380" height="140" rx="10" fill="#0fa04a" stroke="#d9ffe8" strokeWidth="6" />
              <text x="230" y="92" fontSize="58" textAnchor="middle" fontWeight="900" fill="#fff" fontFamily="'DejaVu Sans', Arial">SORTIE</text>
              <g transform={`translate(62 70) rotate(${fleche(i)})`}>
                <path d="M-36,-10 L10,-10 L10,-30 L44,0 L10,30 L10,10 L-36,10 Z" fill="#fff" />
              </g>
            </g>,
            'pan'
          )}
        </g>
      ),
    });
  });
  // haut-parleur
  items.push({
    z: 6.2,
    el: (
      <g key="hp">
        {boite(cam, KX - 90, KX - 2, PLAF + 30, PLAF + 190, 6.0, 6.35, ['#cfcbc0', '#bdb9ad', '#a8a498'], 'hpb')}
        {plaque(cam, [KX - 91, PLAF + 45, 6.02], [0, 0, 1], [0, 1, 0], 330, 130, <g>{[...Array(5)].map((_, r) => [...Array(12)].map((_, c) => <circle key={`${r}${c}`} cx={20 + c * 26} cy={16 + r * 25} r="8" fill="#3a3a36" />))}</g>, 'grille')}
        {ligne(cam, [KX - 2, PLAF, 6.17], [KX - 2, PLAF + 30, 6.17], 4, '#222', 'cable')}
      </g>
    ),
  });
  // poubelle
  items.push({z: 8.0, el: boite(cam, -KX + 340, -KX + 470, 250, SOL, 7.9, 8.1, ['#2f4a3a', '#29402f', '#223628'], 'poub')});
  const brume = <rect key="br" width="1080" height="1920" fill="url(#co-brume)" />;
  return {fond, items, brume};
};

// ===================== LA CAGE D'ESCALIER =====================
// Vue d'en haut : paliers carrés qui s'enfoncent (effet vertige). Vue de côté : volée de marches + panneau « 1ER ÉTAGE ».
export const escalier = (cam, f, {lumiere = 1} = {}) => {
  const {poly} = cam;
  const fond = (
    <g>
      <defs>{brumeDef(cam, 'es-brume', '#020203', 0.9)}</defs>
      <rect width="1080" height="1920" fill="#040405" />
    </g>
  );
  const items = [];
  const E = 600; // demi-largeur du vide central (X), en Z : 0.6
  const R = 1150;
  for (let k = 0; k < 9; k++) {
    const y = SOL + k * 1200;
    const zc = 0;
    const c = k % 2 ? '#2c2f33' : '#33363b';
    items.push({
      z: 10 + k,
      el: (
        <g key={`pal${k}`} opacity={1 - k * 0.09}>
          {/* palier en couronne autour du vide */}
          <polygon points={poly([[-R, y, zc - R / 1000], [R, y, zc - R / 1000], [R, y, zc - E / 1000], [-R, y, zc - E / 1000]])} fill={c} />
          <polygon points={poly([[-R, y, zc + E / 1000], [R, y, zc + E / 1000], [R, y, zc + R / 1000], [-R, y, zc + R / 1000]])} fill={c} />
          <polygon points={poly([[-R, y, zc - E / 1000], [-E, y, zc - E / 1000], [-E, y, zc + E / 1000], [-R, y, zc + E / 1000]])} fill="#2a2d31" />
          <polygon points={poly([[E, y, zc - E / 1000], [R, y, zc - E / 1000], [R, y, zc + E / 1000], [E, y, zc + E / 1000]])} fill="#2a2d31" />
          {/* marches sur un côté */}
          {[...Array(8)].map((_, m) => ligne(cam, [E + 40 + m * 60, y - 20, zc - E / 1000], [E + 40 + m * 60, y - 20, zc + E / 1000], 4, '#1a1c1f', `m${m}`))}
          {/* rambarde rouge autour du vide */}
          {[
            [[-E, y - 380, zc - E / 1000], [E, y - 380, zc - E / 1000]],
            [[E, y - 380, zc - E / 1000], [E, y - 380, zc + E / 1000]],
            [[E, y - 380, zc + E / 1000], [-E, y - 380, zc + E / 1000]],
            [[-E, y - 380, zc + E / 1000], [-E, y - 380, zc - E / 1000]],
          ].map(([a, b], j) => ligne(cam, a, b, Math.max(2, 14 * cam.scale(zc, E, y) * 0.4), '#8e2a22', `r${j}`))}
          {/* lampe de palier */}
          {k < 5 && (
            <circle cx={cam.proj(-R + 80, y - 600, zc)[0]} cy={cam.proj(-R + 80, y - 600, zc)[1]} r={Math.max(3, 250 * cam.scale(zc, -R, y) * 0.3)} fill="#ffe7b0" opacity={0.25 * lumiere} />
          )}
        </g>
      ),
    });
  }
  const brume = <rect key="br" width="1080" height="1920" fill="url(#es-brume)" />;
  return {fond, items, brume};
};

// Volée de marches vue de côté (pour les plans « tu descends… tu reviens au même étage »)
export const volee = (cam, f, {lumiere = 1} = {}) => {
  const {poly} = cam;
  const marches = [];
  for (let m = 0; m < 14; m++) {
    const z = 2 + m * 0.28;
    const y = SOL - m * 95;
    marches.push(
      <g key={m}>
        <polygon points={poly([[-420, y - 95, z], [420, y - 95, z], [420, y - 95, z + 0.28], [-420, y - 95, z + 0.28]])} fill="#3a3d42" />
        <polygon points={poly([[-420, y - 95, z], [420, y - 95, z], [420, y, z], [-420, y, z]])} fill="#2b2e33" />
        {ligne(cam, [-420, y - 95, z], [420, y - 95, z], 5, '#b9a43a', 'nez')}
      </g>
    );
  }
  const fond = (
    <g>
      <defs>
        {brumeDef(cam, 'vo-brume', '#020203', 0.7)}
        <radialGradient id="vo-lampe">
          <stop offset="0" stopColor="#ffe7b0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffe7b0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1080" height="1920" fill="#040405" />
      <polygon points={poly([[-420, -1900, 6], [420, -1900, 6], [420, SOL, 6], [-420, SOL, 6]])} fill="#2c2f2c" />
      <polygon points={poly([[-420, -1900, -1], [-420, -1900, 6], [-420, SOL, 6], [-420, SOL, -1]])} fill="#353833" />
      <polygon points={poly([[420, -1900, -1], [420, -1900, 6], [420, SOL, 6], [420, SOL, -1]])} fill="#30332f" />
      <polygon points={poly([[-420, SOL, -1], [420, SOL, -1], [420, SOL, 2], [-420, SOL, 2]])} fill="#26292d" />
      {/* panneau d'étage */}
      {plaque(cam, [419, -560, 1.5], [0, 0, -1], [0, 1, 0], 900, 300, <g><rect width="900" height="300" rx="20" fill="#e2ddcc" /><text x="450" y="200" fontSize="170" textAnchor="middle" fontWeight="900" fill="#1a1a1a" fontFamily="'DejaVu Sans', Arial">1ER ÉTAGE</text></g>, 'etage')}
      {/* lampe de palier */}
      <circle cx={cam.proj(0, -900, 2.5)[0]} cy={cam.proj(0, -900, 2.5)[1]} r={600 * cam.scale(2.5, 0, -900)} fill="url(#vo-lampe)" opacity={lumiere} />
      {marches}
      {/* main courante */}
      {ligne(cam, [380, SOL - 300, 1.6], [380, SOL - 300 - 13 * 95, 2 + 13 * 0.28], 10, '#8e2a22', 'mc')}
    </g>
  );
  const brume = <rect key="br" width="1080" height="1920" fill="url(#vo-brume)" />;
  return {fond, items: [], brume};
};

// ===================== LE SURVEILLANT =====================
// Pieds en 0,0, environ 1000 unités de haut (plus grand que le bonhomme).
// tour : 0 = de dos → 1 = de face ; ouvre : 0 → 1 la tête se fend en deux ; pattes : 0 → 1 il se met à quatre pattes.
export const Surveillant = ({f, tour = 0, ouvre = 0, pattes = 0}) => {
  const face = tour > 0.5;
  const sx = Math.max(0.12, Math.abs(Math.cos(Math.PI * tour)));
  const resp = 1 + Math.sin(f / 10) * 0.01;
  if (pattes > 0.5) return <SurveillantPattes f={f} ouvre={ouvre} />;
  const plie = pattes * 2; // 0 → 1 : il se penche en avant
  return (
    <g transform={`rotate(${-plie * 25} 0 -500) scale(${sx} ${resp})`}>
      {/* jambes */}
      <path d="M-70,0 L-55,-470 L-10,-470 L-20,0 Z M20,0 L10,-470 L55,-470 L70,0 Z" fill="#1c1d22" />
      <ellipse cx="-50" cy="-8" rx="50" ry="16" fill="#0b0b0d" />
      <ellipse cx="50" cy="-8" rx="50" ry="16" fill="#0b0b0d" />
      {/* bras trop longs */}
      <path d="M-120,-800 Q-170,-560 -150,-260 L-118,-258 Q-128,-540 -88,-760 Z" fill="#4e545b" />
      <path d="M120,-800 Q170,-560 150,-260 L118,-258 Q128,-540 88,-760 Z" fill="#4e545b" />
      <ellipse cx="-135" cy="-235" rx="26" ry="40" fill="#b9b2a8" />
      <ellipse cx="135" cy="-235" rx="26" ry="40" fill="#b9b2a8" />
      {/* torse : gilet gris, chemise */}
      <path d="M-125,-810 Q0,-850 125,-810 L105,-460 L-105,-460 Z" fill="#5b6168" />
      {face ? (
        <g>
          <path d="M-30,-835 L0,-700 L30,-835 Z" fill="#e8e6e0" />
          {/* cordon + sifflet */}
          <path d="M-40,-830 Q0,-640 40,-830" fill="none" stroke="#c41a1a" strokeWidth="6" />
          <g transform={`rotate(${Math.sin(f / 7) * 12} 0 -650)`}>
            <rect x="-14" y="-660" width="28" height="44" rx="6" fill="#c9ccd1" />
          </g>
        </g>
      ) : (
        <path d="M-40,-830 Q-80,-700 -110,-620" fill="none" stroke="#c41a1a" strokeWidth="6" />
      )}
      {/* cou + tête */}
      <rect x="-22" y="-890" width="44" height="70" fill="#b9b2a8" />
      {face ? <TeteMonstre f={f} ouvre={ouvre} /> : (
        <g>
          <ellipse cx="0" cy="-960" rx="72" ry="88" fill="#b9b2a8" />
          <path d="M-76,-950 Q-84,-1066 0,-1068 Q84,-1066 76,-950 Q74,-900 50,-884 Q0,-876 -50,-884 Q-74,-900 -76,-950 Z" fill="#2a2522" />
          <path d="M-40,-1010 Q0,-1030 40,-1010" fill="none" stroke="#3a332e" strokeWidth="5" />
          <ellipse cx="-74" cy="-955" rx="12" ry="20" fill="#a8a197" />
          <ellipse cx="74" cy="-955" rx="12" ry="20" fill="#a8a197" />
        </g>
      )}
    </g>
  );
};

// Tête de face : lisse et sans visage, puis elle se fend verticalement comme une mâchoire
const TeteMonstre = ({f, ouvre}) => {
  const a = ouvre * 32;
  const dents = (cote) =>
    [...Array(9)].map((_, k) => {
      const y = -1035 + k * 18;
      return <path key={k} d={`M0,${y} l${cote * 26},6 l${-cote * 26},8 Z`} fill="#ece6cf" />;
    });
  return (
    <g>
      {ouvre > 0.02 && (
        <g>
          {/* l'intérieur : gueule rouge, yeux au fond, bave */}
          <ellipse cx="0" cy="-955" rx={40 + 90 * ouvre} ry={95 + 30 * ouvre} fill="#3a0505" />
          {[[-20, -1000, 9], [22, -985, 11], [0, -940, 8], [-30, -920, 6], [28, -925, 7]].map(([x, y, r], k) => (
            <g key={k} opacity={ouvre}>
              <circle cx={x * (1 + ouvre)} cy={y} r={r * 2.4} fill="#ff2a1a" opacity="0.35" />
              <circle cx={x * (1 + ouvre)} cy={y} r={r} fill="#ff3b2a" />
              <circle cx={x * (1 + ouvre)} cy={y} r={r * 0.35} fill="#fff" />
            </g>
          ))}
          {[-30, 10, 40].map((x, k) => (
            <path key={k} d={`M${x * ouvre},-880 q3,${50 + Math.sin(f / 6 + k) * 20} 0,${90 + Math.sin(f / 6 + k) * 30}`} stroke="#c9d4c4" strokeWidth="5" fill="none" opacity={0.6 * ouvre} />
          ))}
        </g>
      )}
      {/* moitié gauche */}
      <g transform={`rotate(${-a} 0 -890)`}>
        <path d="M0,-1048 Q-80,-1046 -72,-960 Q-66,-880 0,-872 Z" fill="#c4bdb2" />
        <path d="M0,-1048 Q-80,-1050 -74,-990 Q-50,-1030 0,-1034 Z" fill="#2a2522" />
        {ouvre > 0.02 && <g transform="translate(0 0)">{dents(-1)}</g>}
      </g>
      {/* moitié droite */}
      <g transform={`rotate(${a} 0 -890)`}>
        <path d="M0,-1048 Q80,-1046 72,-960 Q66,-880 0,-872 Z" fill="#bcb5aa" />
        <path d="M0,-1048 Q80,-1050 74,-990 Q50,-1030 0,-1034 Z" fill="#2a2522" />
        {ouvre > 0.02 && dents(1)}
      </g>
      {ouvre <= 0.02 && <line x1="0" y1="-1030" x2="0" y2="-880" stroke="#9a9388" strokeWidth="2" opacity="0.6" />}
    </g>
  );
};

// À quatre pattes : corps à l'horizontale, membres trop longs pliés comme une araignée, tête fendue en avant
const SurveillantPattes = ({f, ouvre}) => {
  const g = Math.sin(f / 2.2);
  const patte = (x0, y0, x1, ph, key) => {
    const s = Math.sin(f / 2.2 + ph);
    const genou = [x0 + (x1 - x0) * 0.5 + s * 40, -560 - Math.abs(s) * 80];
    return <path key={key} d={`M${x0},${y0} L${genou[0]},${genou[1]} L${x1 + s * 60},0`} fill="none" stroke="#3e434a" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" />;
  };
  return (
    <g transform={`translate(0 ${Math.abs(g) * -20})`}>
      {patte(-220, -330, -420, 0, 'a')}
      {patte(220, -330, 420, Math.PI, 'b')}
      {patte(-160, -300, -300, Math.PI / 2, 'c')}
      {patte(160, -300, 300, -Math.PI / 2, 'd')}
      <ellipse cx="0" cy="-360" rx="260" ry="120" fill="#5b6168" />
      <path d="M-40,-470 Q0,-430 40,-470" stroke="#c41a1a" strokeWidth="6" fill="none" />
      <g transform="translate(0 640) scale(1.15)">
        <TeteMonstre f={f} ouvre={Math.max(ouvre, 0.9)} />
      </g>
    </g>
  );
};
