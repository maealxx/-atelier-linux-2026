import {random, spring} from 'remotion';
import {plaque} from './Lycee';
import {SOL} from './Rue';

// ===================== « La soirée » : le manoir (salle des fêtes), le parc, le portail =====================
// Un grand manoir en 3D. Corps principal : X -3200 → 3200, façade en Z = 10, profondeur jusqu'à Z = 24,
// rez-de-chaussée + étage + combles (Y 432 → -3000, faîtage à -4700). Deux ailes avancées (X ±3200 → ±5400, de Z = 5 à 24).
// Grand porche à colonnes au centre avec perron (3 marches), porte double. Terrasse en bois à gauche, devant la baie vitrée.
export const FACADE = 10;
export const MX = 4000;
export const AILE = {x0: 4000, x: 6300, z: 10.6, h: -1900}; // ailes basses, en léger retrait derrière la façade
export const PORTE = {x0: -280, x1: 280};
export const BAIE = {x0: -2350, x1: -1650};
export const PORTAIL = {z: -3, x0: -450, x1: 450};
export const PERRON = {z0: 8.75, marche: 60, n: 3}; // 3 marches de 60 unités, de Z 8.75 à 9.5 ; palier jusqu'à 10
export const TERRASSE_Z = [8.3, 10];
export const FONTAINE = {x: 2300, z: 3.5};
// fenêtres de la façade principale (rez-de-chaussée et étage) + fenêtres des ailes
export const FENETRES = [
  ...[-3500, -2800, -1000, 1000, 1800, 2600, 3400].map((x) => ({x0: x - 260, x1: x + 260, y0: -1250, y1: -150, z: FACADE})),
  ...[-3400, -2600, -1800, -1000, 0, 1000, 1800, 2600, 3400].map((x) => ({x0: x - 240, x1: x + 240, y0: -2700, y1: -1750, z: FACADE})),
  ...[-5700, -4700, 4700, 5700].map((x) => ({x0: x - 300, x1: x + 300, y0: -1450, y1: -300, z: AILE.z})),
];
const FETE = ['#ff3ea5', '#3ec8ff', '#ffd23e', '#9a3eff'];

const ligne = (cam, A, B, w, col, key, op = 1) => {
  const r = cam.seg(A, B);
  return r ? <line key={key} x1={r[0][0]} y1={r[0][1]} x2={r[1][0]} y2={r[1][1]} stroke={col} strokeWidth={w} opacity={op} strokeLinecap="round" /> : null;
};
const billboard = (cam, x, y, z, contenu, key, taille = 1) => {
  if (!cam.visible(z, x, y - 300)) return null;
  const [px, py] = cam.proj(x, y, z);
  return (
    <g key={key} transform={`translate(${px} ${py}) scale(${cam.scale(z, x, y - 300) * taille})`}>
      {contenu}
    </g>
  );
};
const cercleSol = (cam, cx, cz, rx, rz, y = SOL - 1) => cam.poly([...Array(20)].map((_, k) => [cx + Math.cos((k / 20) * 6.283) * rx, y, cz + Math.sin((k / 20) * 6.283) * rz]));
// Volume en 3D : on ne dessine que les faces tournées vers la caméra
const bloc = (cam, x0, x1, y0, y1, z0, z1, [dessus, face, cote], key) => {
  const {poly} = cam;
  return (
    <g key={key}>
      {cam.y < y0 && <polygon points={poly([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]])} fill={dessus} />}
      {cam.x > x1 && <polygon points={poly([[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]])} fill={cote} />}
      {cam.x < x0 && <polygon points={poly([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]])} fill={cote} />}
      {cam.z < z0 && <polygon points={poly([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]])} fill={face} />}
    </g>
  );
};

// Silhouette derrière une vitre : buste, bras ballants, tête penchée (chaque silhouette a sa posture).
// danse pendant la fête ; ensuite immobile ; tord = 0 → 1 la tête se casse sur le côté d'un coup ; sourire 0 → 1
const Silhouette = ({f, k, danse, sourire, tord = 0, apparition = 1}) => {
  const penche = (random(`pen${k}`) - 0.5) * 16 + tord * (k % 2 ? 48 : -52);
  const h = 0.9 + random(`haut${k}`) * 0.25;
  const b = danse ? Math.sin(f / 4 + k * 1.7) * 25 : 0;
  const r = danse ? Math.sin(f / 6 + k) * 8 : 0;
  const tremble = danse ? 0 : (random(`tr${k}${Math.floor(f / 3)}`) - 0.5) * 2;
  return (
    <g transform={`translate(${tremble} ${b}) rotate(${r}) scale(${h})`} opacity={apparition} filter="url(#ja-flou)">
      {/* buste, épaules tombantes */}
      <path d="M-170,0 Q-175,-150 -120,-215 Q-70,-250 -30,-255 L30,-255 Q70,-250 120,-215 Q175,-150 170,0 Z" fill="#030304" />
      {/* bras le long du corps */}
      {!danse && <path d="M-160,-200 Q-195,-80 -185,0 L-150,0 Q-158,-90 -130,-180 Z M160,-200 Q195,-80 185,0 L150,0 Q158,-90 130,-180 Z" fill="#030304" />}
      {danse && <path d="M-140,-180 L-230,-380 M140,-180 L230,-380" stroke="#030304" strokeWidth="44" strokeLinecap="round" />}
      {/* cou + tête */}
      <g transform={`rotate(${penche} 0 -260)`}>
        <rect x="-26" y="-300" width="52" height="60" fill="#030304" />
        <ellipse cx="0" cy="-370" rx="68" ry="86" fill="#030304" />
        {!danse && (
          <g opacity={0.55}>
            <circle cx="-24" cy="-385" r="5" fill="#f4e8e0" />
            <circle cx="24" cy="-385" r="5" fill="#f4e8e0" />
          </g>
        )}
        {sourire > 0.02 && (
          <g opacity={Math.min(1, sourire * 1.5)}>
            <path d={`M${-56 * sourire - 8},-345 Q0,${-345 + 72 * sourire} ${56 * sourire + 8},-345 Q0,${-345 + 24 * sourire} ${-56 * sourire - 8},-345 Z`} fill="#f4f0e6" />
            {[...Array(9)].map((_, i) => {
              const x = -56 * sourire - 8 + ((i + 1) * (112 * sourire + 16)) / 10;
              return <line key={i} x1={x} y1="-345" x2={x} y2={-345 + 46 * sourire * (1 - Math.abs(x) / (60 * sourire + 10))} stroke="#030304" strokeWidth="3" />;
            })}
          </g>
        )}
      </g>
    </g>
  );
};

// fete : lumières de la fête ; fenetre(i) : lumière de chaque fenêtre (0 → 1) ;
// rouge(i) : faible lumière rouge qui s'allume derrière une fenêtre (0 → 1), révèle une silhouette ;
// gens : 'danse' | 'immobile' | null ; sourire ; tord ; porte ; lampadaire ; cadenas ; vitre (élément sur la baie)
export const jardin = (
  cam,
  f,
  {fete = 0, fenetre = () => fete, rouge = () => 0, gens = 'danse', sourire = 0, tord = 0, porte = 0, lampadaire = 1, enceinte = fete, guirlande = fete, cadenas = 0, vitre = null} = {}
) => {
  const {poly} = cam;
  const etoiles = [...Array(90)].map((_, k) => {
    const x = (random(`ex${k}`) - 0.5) * 70000;
    const y = -4000 - random(`ey${k}`) * 34000;
    const z = cam.z + 60;
    if (!cam.visible(z, x, y)) return null;
    const p = cam.proj(x, y, z);
    return <circle key={k} cx={p[0]} cy={p[1]} r={1 + random(`er${k}`) * 1.8} fill="#e8eeff" opacity={0.3 + 0.5 * random(`eo${k}`) * (0.6 + 0.4 * Math.sin(f / 7 + k))} />;
  });
  const lune = cam.visible(cam.z + 60, -14000, -30000) ? cam.proj(-14000, -30000, cam.z + 60) : null;
  const herbe = [...Array(90)].map((_, k) => {
    const x = -6500 + random(`hx${k}`) * 13000;
    const z = -2.7 + random(`hz${k}`) * 11;
    if (Math.abs(x) < 520 || Math.hypot((x - FONTAINE.x) / 1000, z - FONTAINE.z) < 1.1) return null;
    return billboard(cam, x, SOL, z, <path d="M-30,0 L-20,-60 L-8,0 L0,-80 L10,0 L22,-55 L32,0 Z" fill="#0e1a10" />, `h${k}`);
  });
  const fond = (
    <g>
      <defs>
        <linearGradient id="ja-ciel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#03050c" />
          <stop offset="0.5" stopColor="#0b1428" />
          <stop offset="0.75" stopColor="#1a2440" />
        </linearGradient>
        <radialGradient id="ja-lune">
          <stop offset="0" stopColor="#e8eeff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#e8eeff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ja-chaud">
          <stop offset="0" stopColor="#ffb45a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffb45a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ja-fete">
          <stop offset="0" stopColor="#ff3ea5" stopOpacity="0.45" />
          <stop offset="1" stopColor="#3ec8ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ja-rouge">
          <stop offset="0" stopColor="#ff1a0a" stopOpacity="0.6" />
          <stop offset="1" stopColor="#ff1a0a" stopOpacity="0" />
        </radialGradient>
        <filter id="ja-flou" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <radialGradient id="ja-brume" cx={cam.fuite[0]} cy={cam.fuite[1]} r="1100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0a0f1a" stopOpacity="0.45" />
          <stop offset="1" stopColor="#0a0f1a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#ja-ciel)" />
      {etoiles}
      {lune && (
        <g>
          <circle cx={lune[0]} cy={lune[1]} r="180" fill="url(#ja-lune)" />
          <circle cx={lune[0]} cy={lune[1]} r="58" fill="#e8eef8" opacity="0.85" />
          <circle cx={lune[0] + 15} cy={lune[1] - 8} r="13" fill="#c9d0e0" opacity="0.6" />
        </g>
      )}
      {/* forêt au loin derrière le manoir et maisons de l'autre côté de la rue */}
      {[...Array(14)].map((_, k) => {
        const x = -16000 + k * 2500;
        const h = 3500 + random(`fo${k}`) * 3000;
        return <polygon key={`fo${k}`} points={poly([[x - 1600, SOL, 40], [x, SOL - h - 2500, 40], [x + 1600, SOL, 40]])} fill="#05080a" />;
      })}
      {[-6000, -1500, 3500].map((x, k) => (
        <polygon key={`r${k}`} points={poly([[x - 1800, SOL, -18], [x + 1800, SOL, -18], [x + 1800, -1500, -18], [x, -2600, -18], [x - 1800, -1500, -18]])} fill="#070a12" />
      ))}
      {/* sol : pelouse, rue au-delà du portail */}
      <polygon points={poly([[-12000, SOL, PORTAIL.z], [12000, SOL, PORTAIL.z], [12000, SOL, 40], [-12000, SOL, 40]])} fill="#0f1a12" />
      <polygon points={poly([[-12000, SOL + 30, -14], [12000, SOL + 30, -14], [12000, SOL + 30, PORTAIL.z], [-12000, SOL + 30, PORTAIL.z]])} fill="#1a1c20" />
      {ligne(cam, [-12000, SOL + 29, -8.5], [12000, SOL + 29, -8.5], 4, '#8a8470', 'marquage', 0.4)}
      {fete > 0.02 && <polygon points={cercleSol(cam, 0, 7.5, 5200, 3.5)} fill="url(#ja-fete)" opacity={fete} />}
      {/* allée gravillonnée du portail au perron */}
      <polygon points={poly([[-420, SOL - 1, PORTAIL.z], [420, SOL - 1, PORTAIL.z], [420, SOL - 1, PERRON.z0], [-420, SOL - 1, PERRON.z0]])} fill="#2b2b2a" />
      {[...Array(14)].map((_, k) => ligne(cam, [-420, SOL - 2, PORTAIL.z + k * 0.85], [420, SOL - 2, PORTAIL.z + k * 0.85], 2, '#222', `al${k}`, 0.6))}
      {herbe}
    </g>
  );

  const items = [];
  const zF = FACADE;
  // ---------- le manoir ----------
  const fenetreEl = (w, k) => {
    const v = fenetre(k);
    const rr = rouge(k);
    const col = FETE[(k + Math.floor(f / 8)) % FETE.length];
    const zz = w.z - 0.004;
    const zi = w.z + 0.14; // le fond de l'embrasure (la vitre est en retrait)
    const fond_ = v > 0.05 ? col : rr > 0.02 ? '#2a0404' : '#070b16';
    const cx = (w.x0 + w.x1) / 2;
    return (
      <g key={`fe${k}`}>
        {/* encadrement en pierre */}
        <polygon points={poly([[w.x0 - 45, w.y0 - 60, zz], [w.x1 + 45, w.y0 - 60, zz], [w.x1 + 45, w.y1 + 50, zz], [w.x0 - 45, w.y1 + 50, zz]])} fill="#cbc3b2" />
        {/* embrasure : côtés et linteau en profondeur */}
        <polygon points={poly([[w.x0, w.y0, zz], [w.x0, w.y0, zi], [w.x0, w.y1, zi], [w.x0, w.y1, zz]])} fill="#8f887a" />
        <polygon points={poly([[w.x1, w.y0, zz], [w.x1, w.y0, zi], [w.x1, w.y1, zi], [w.x1, w.y1, zz]])} fill="#a39b8c" />
        <polygon points={poly([[w.x0, w.y0, zz], [w.x1, w.y0, zz], [w.x1, w.y0, zi], [w.x0, w.y0, zi]])} fill="#7a7468" />
        {/* la pièce derrière */}
        <polygon points={poly([[w.x0, w.y0, zi], [w.x1, w.y0, zi], [w.x1, w.y1, zi], [w.x0, w.y1, zi]])} fill={fond_} opacity={v > 0.05 ? 0.6 + 0.4 * v : 1} />
        {rr > 0.02 && <circle cx={cam.proj(cx, (w.y0 + w.y1) / 2, zi + 0.3)[0]} cy={cam.proj(cx, (w.y0 + w.y1) / 2, zi + 0.3)[1]} r={500 * cam.scale(zi, cx, w.y0)} fill="url(#ja-rouge)" opacity={rr} />}
        {gens && billboard(cam, cx, w.y1 + 20, zi + 0.12, <Silhouette f={f} k={k} danse={gens === 'danse'} sourire={sourire} tord={tord} apparition={gens === 'danse' ? 1 : Math.max(rr, 0.35)} />, `si${k}`, (w.y1 - w.y0) / 520)}
        {/* vitre : reflet de lune + croisillons */}
        {v <= 0.05 && <polygon points={poly([[w.x0 + 40, w.y0, w.z + 0.13], [w.x0 + 150, w.y0, w.z + 0.13], [w.x0 + 20, w.y1, w.z + 0.13], [w.x0, w.y1 - 80, w.z + 0.13]])} fill="#9fb4e0" opacity="0.1" />}
        {ligne(cam, [cx, w.y0, w.z + 0.12], [cx, w.y1, w.z + 0.12], 10, '#d8d2c4', 'mont')}
        {ligne(cam, [w.x0, (w.y0 * 2 + w.y1) / 3, w.z + 0.12], [w.x1, (w.y0 * 2 + w.y1) / 3, w.z + 0.12], 8, '#d8d2c4', 'trav')}
        {/* appui de fenêtre */}
        {ligne(cam, [w.x0 - 60, w.y1 + 55, w.z - 0.05], [w.x1 + 60, w.y1 + 55, w.z - 0.05], 18, '#b9b1a0', 'appui')}
        {v > 0.05 && <circle cx={cam.proj(cx, (w.y0 + w.y1) / 2, zz)[0]} cy={cam.proj(cx, (w.y0 + w.y1) / 2, zz)[1]} r={900 * cam.scale(zz, w.x0, w.y0)} fill="url(#ja-fete)" opacity={0.55 * v} />}
      </g>
    );
  };
  const ouv = porte;
  items.push({
    z: zF + 0.5,
    el: (
      <g key="manoir">
        {/* toit à quatre pans + cheminées */}
        <polygon points={poly([[-MX - 200, -3000, zF - 0.4], [MX + 200, -3000, zF - 0.4], [MX - 1400, -4700, 17], [-MX + 1400, -4700, 17]])} fill="#241a17" />
        {cam.x > MX && <polygon points={poly([[MX + 200, -3000, zF - 0.4], [MX + 200, -3000, 24.4], [MX - 1400, -4700, 17]])} fill="#1a1210" />}
        {cam.x < -MX && <polygon points={poly([[-MX - 200, -3000, zF - 0.4], [-MX - 200, -3000, 24.4], [-MX + 1400, -4700, 17]])} fill="#1a1210" />}
        {[...Array(9)].map((_, k) => {
          const t = (k + 1) / 10;
          return ligne(cam, [-MX - 200 + 1600 * t, -3000 - 1700 * t, zF - 0.4 + 7.4 * t], [MX + 200 - 1600 * t, -3000 - 1700 * t, zF - 0.4 + 7.4 * t], 4, '#16100e', `tu${k}`);
        })}
        {/* lucarnes du toit */}
        {[-2000, 0, 2000].map((x, k) => (
          <g key={`lu${k}`}>
            <polygon points={poly([[x - 260, -3350, zF + 1.2], [x + 260, -3350, zF + 1.2], [x + 260, -3850, zF + 1.2], [x, -4150, zF + 1.2], [x - 260, -3850, zF + 1.2]])} fill="#cbc3b2" />
            <polygon points={poly([[x - 170, -3420, zF + 1.19], [x + 170, -3420, zF + 1.19], [x + 170, -3820, zF + 1.19], [x - 170, -3820, zF + 1.19]])} fill={fenetre(20 + k) > 0.05 ? '#ffd23e' : rouge(20 + k) > 0.05 ? '#2a0404' : '#070b16'} />
          </g>
        ))}
        {[[-2900, 14], [2900, 14]].map(([x, z], k) => bloc(cam, x - 180, x + 180, -5300, -3600, z, z + 0.4, ['#3a2e28', '#4a3a32', '#3a2e28'], `che${k}`))}
        {/* façade principale */}
        <polygon points={poly([[-MX, SOL, zF], [MX, SOL, zF], [MX, -3000, zF], [-MX, -3000, zF]])} fill="#6a6152" />
        {[...Array(14)].map((_, k) => ligne(cam, [-MX, -100 - k * 210, zF - 0.002], [MX, -100 - k * 210, zF - 0.002], 2, '#5e5648', `as${k}`, 0.6))}
        <polygon points={poly([[-MX, SOL, zF - 0.003], [MX, SOL, zF - 0.003], [MX, 220, zF - 0.003], [-MX, 220, zF - 0.003]])} fill="#3e3a34" />
        {ligne(cam, [-MX - 30, -1500, zF - 0.06], [MX + 30, -1500, zF - 0.06], 40, '#cbc3b2', 'bandeau')}
        {ligne(cam, [-MX - 60, -3000, zF - 0.1], [MX + 60, -3000, zF - 0.1], 60, '#cbc3b2', 'corniche')}
        {[-MX, MX].map((x) => ligne(cam, [x, SOL, zF - 0.05], [x, -3000, zF - 0.05], 70, '#cbc3b2', `ch${x}`))}
        {FENETRES.filter((w) => w.z === FACADE).map((w) => fenetreEl(w, FENETRES.indexOf(w)))}
        {/* baie vitrée de la terrasse */}
        <polygon points={poly([[BAIE.x0 - 40, -1000, zF - 0.004], [BAIE.x1 + 40, -1000, zF - 0.004], [BAIE.x1 + 40, SOL - 25, zF - 0.004], [BAIE.x0 - 40, SOL - 25, zF - 0.004]])} fill="#cbc3b2" />
        <polygon points={poly([[BAIE.x0, -960, zF - 0.005], [BAIE.x1, -960, zF - 0.005], [BAIE.x1, SOL - 30, zF - 0.005], [BAIE.x0, SOL - 30, zF - 0.005]])} fill={fenetre(30) > 0.05 ? FETE[Math.floor(f / 8) % 4] : '#081020'} opacity={fenetre(30) > 0.05 ? 0.7 : 1} />
        {vitre}
        {ligne(cam, [(BAIE.x0 + BAIE.x1) / 2, -960, zF - 0.006], [(BAIE.x0 + BAIE.x1) / 2, SOL - 30, zF - 0.006], 12, '#d8d2c4', 'baie')}
        {/* porte double sous le porche */}
        <polygon points={poly([[PORTE.x0 - 70, -1050, zF - 0.004], [PORTE.x1 + 70, -1050, zF - 0.004], [PORTE.x1 + 70, SOL - 180, zF - 0.004], [PORTE.x0 - 70, SOL - 180, zF - 0.004]])} fill="#cbc3b2" />
        <polygon points={poly([[PORTE.x0, -1000, zF - 0.005], [PORTE.x1, -1000, zF - 0.005], [PORTE.x1, SOL - 180, zF - 0.005], [PORTE.x0, SOL - 180, zF - 0.005]])} fill="#030304" />
        {ouv > 0.01 && <DiscoInterieur cam={cam} f={f} />}
        {[[PORTE.x0, 1], [PORTE.x1, -1]].map(([x, s]) => {
          const a = ouv * 1.3;
          const xe = x + s * 280 * Math.cos(a);
          const ze = zF - 0.006 + 0.28 * Math.sin(a);
          return <polygon key={x} points={poly([[x, -1000, zF - 0.006], [xe, -1000, ze], [xe, SOL - 180, ze], [x, SOL - 180, zF - 0.006]])} fill="#4a2a1c" stroke="#2a1810" strokeWidth="3" />;
        })}
      </g>
    ),
  });
  // ailes avancées (volumes 3D avec acrotère)
  [-1, 1].forEach((c) => {
    const x0 = c < 0 ? -AILE.x : AILE.x0;
    const x1 = c < 0 ? -AILE.x0 : AILE.x;
    items.push({
      z: AILE.z + 0.2,
      el: (
        <g key={`aile${c}`}>
          {bloc(cam, x0, x1, AILE.h, SOL, AILE.z, 24, ['#2e2a26', '#625a4c', '#57503f'], 'vol')}
          {bloc(cam, x0, x1, AILE.h - 160, AILE.h, AILE.z - 0.1, 24, ['#3a352e', '#cbc3b2', '#b9b1a0'], 'acro')}
          {FENETRES.filter((w) => w.z === AILE.z && (c < 0 ? w.x0 < 0 : w.x0 > 0)).map((w) => fenetreEl(w, FENETRES.indexOf(w)))}
          {/* fenêtres sur le flanc intérieur de l'aile */}
          {[7.9, 9.0].map((z, k) => (
            <polygon key={`fl${k}`} points={poly([[c < 0 ? -AILE.x0 : AILE.x0, -1350, z], [c < 0 ? -AILE.x0 : AILE.x0, -1350, z + 0.7], [c < 0 ? -AILE.x0 : AILE.x0, -350, z + 0.7], [c < 0 ? -AILE.x0 : AILE.x0, -350, z]])} fill={fenetre(40 + k + (c > 0 ? 2 : 0)) > 0.05 ? FETE[(k + Math.floor(f / 8)) % 4] : '#070b16'} opacity="0.9" />
          ))}
        </g>
      ),
    });
  });
  // porche : colonnes, auvent, balcon de l'étage au-dessus
  const zc = PERRON.z0 + 0.1;
  items.push({
    z: zc,
    el: (
      <g key="porche">
        {[-560, -200, 200, 560].map((x) => bloc(cam, x - 55, x + 55, -1320, SOL - 180, zc, zc + 0.11, ['#d8d2c4', '#e2dccf', '#c2bba9'], `col${x}`))}
        {/* fronton du porche (plat, posé sur les colonnes) */}
        <polygon points={poly([[-760, -1480, zc - 0.1], [760, -1480, zc - 0.1], [760, -1320, zc - 0.1], [-760, -1320, zc - 0.1]])} fill="#d8d2c4" />
        <polygon points={poly([[-760, -1480, zc - 0.1], [0, -1900, zc - 0.1], [760, -1480, zc - 0.1]])} fill="#cbc3b2" />
        {ligne(cam, [-760, -1320, zc - 0.11], [760, -1320, zc - 0.11], 6, '#9a937f', 'ombre')}
        {/* balustrade du balcon */}
        {[...Array(13)].map((_, k) => ligne(cam, [-660 + k * 110, -1460, zc - 0.05], [-660 + k * 110, -1760, zc - 0.05], Math.max(2, 22 * cam.scale(zc, 0, -1600)), '#d8d2c4', `bal${k}`))}
        {ligne(cam, [-720, -1780, zc - 0.05], [720, -1780, zc - 0.05], Math.max(2, 34 * cam.scale(zc, 0, -1700)), '#d8d2c4', 'main')}
        {/* lanterne du porche */}
        {(() => {
          const p = cam.proj(0, -1250, zc + 0.5);
          const s = cam.scale(zc + 0.5, 0, -1250);
          return cam.visible(zc + 0.5, 0, -1250) ? (
            <g>
              <circle cx={p[0]} cy={p[1]} r={900 * s} fill="url(#ja-chaud)" opacity={fete > 0.05 ? 1 : lampadaire * 0.12} />
              <rect x={p[0] - 34 * s} y={p[1] - 60 * s} width={68 * s} height={110 * s} rx={10 * s} fill={fete > 0.05 ? '#fff0c8' : '#3a3530'} stroke="#1a1a1a" strokeWidth={Math.max(1, 6 * s)} />
            </g>
          ) : null;
        })()}
        {/* banderole de la fête */}
        {plaque(cam, [-650, -1900, zc - 0.08], [1, 0, 0], [0, 1, 0], 1300, 130, <g><rect width="1300" height="130" rx="14" fill="#5a1a7a" opacity="0.85" /><text x="650" y="96" fontSize="86" textAnchor="middle" fontWeight="900" fill="#ffd23e" fontFamily="'DejaVu Sans', Arial">SOIRÉE 🎉</text></g>, 'banderole')}
      </g>
    ),
  });
  // perron (sol : dessiné avant les personnages)
  items.push({
    z: 30,
    el: (
      <g key="perron">
        {[...Array(PERRON.n)].map((_, m) => {
          const z0 = PERRON.z0 + m * 0.25;
          const y = SOL - (m + 1) * PERRON.marche;
          return (
            <g key={m}>
              <polygon points={poly([[-780, y, z0], [780, y, z0], [780, y, zF], [-780, y, zF]])} fill="#7a766e" />
              <polygon points={poly([[-780, y, z0], [780, y, z0], [780, y + PERRON.marche, z0], [-780, y + PERRON.marche, z0]])} fill="#55524c" />
            </g>
          );
        })}
        {/* terrasse en bois à gauche */}
        <polygon points={poly([[-3100, SOL - 25, TERRASSE_Z[0]], [-900, SOL - 25, TERRASSE_Z[0]], [-900, SOL - 25, zF], [-3100, SOL - 25, zF]])} fill="#4a3424" />
        {[...Array(8)].map((_, k) => ligne(cam, [-3100, SOL - 26, TERRASSE_Z[0] + k * 0.22], [-900, SOL - 26, TERRASSE_Z[0] + k * 0.22], 3, '#2e2016', `la${k}`))}
        <polygon points={poly([[-3100, SOL - 25, TERRASSE_Z[0]], [-900, SOL - 25, TERRASSE_Z[0]], [-900, SOL, TERRASSE_Z[0]], [-3100, SOL, TERRASSE_Z[0]]])} fill="#2e2016" />
        {/* fontaine (bassin) */}
        <polygon points={cercleSol(cam, FONTAINE.x, FONTAINE.z, 900, 0.9, SOL - 2)} fill="#4a4a48" />
        <polygon points={cercleSol(cam, FONTAINE.x, FONTAINE.z, 760, 0.76, SOL - 3)} fill="#0c1420" />
      </g>
    ),
  });
  // fontaine : rebord + colonne centrale + vasque
  items.push({
    z: FONTAINE.z,
    el: (
      <g key="fontaine">
        {[...Array(16)].map((_, k) => {
          const a0 = (k / 16) * 6.283;
          const a1 = ((k + 1) / 16) * 6.283;
          const p = (a, y) => [FONTAINE.x + Math.cos(a) * 900, y, FONTAINE.z + Math.sin(a) * 0.9];
          return Math.sin((a0 + a1) / 2) < 0.2 ? <polygon key={k} points={poly([p(a0, SOL), p(a1, SOL), p(a1, SOL - 160), p(a0, SOL - 160)])} fill="#5a5a56" /> : null;
        })}
        {bloc(cam, FONTAINE.x - 90, FONTAINE.x + 90, -700, SOL, FONTAINE.z - 0.09, FONTAINE.z + 0.09, ['#7a7a74', '#6a6a64', '#5a5a56'], 'colonne')}
        <polygon points={cercleSol(cam, FONTAINE.x, FONTAINE.z, 380, 0.38, -700)} fill="#6a6a64" />
      </g>
    ),
  });
  // enceinte, gobelets, chaises sur la terrasse
  items.push({
    z: 8.8,
    el: (
      <g key="enceinte">
        {billboard(cam, -1300, SOL - 25, 8.8, <g><rect x="-110" y="-330" width="220" height="330" rx="16" fill="#151518" /><circle cx="0" cy="-110" r="70" fill="#26262c" /><circle cx="0" cy="-110" r={30 + (enceinte > 0.05 ? Math.abs(Math.sin(f / 2)) * 12 : 0)} fill="#0c0c0f" /><circle cx="0" cy="-250" r="34" fill="#26262c" /><circle cx="80" cy="-305" r="9" fill={enceinte > 0.05 ? '#3eff7a' : '#202020'} /></g>, 'enc')}
        {[[-1800, 9.0], [-1720, 9.2], [-1560, 8.9]].map(([x, z], k) => billboard(cam, x, SOL - 25, z, <path d="M-22,0 L-28,-80 L28,-80 L22,0 Z" fill="#c42a2a" />, `go${k}`))}
        {[[-2800, 9.1], [-2550, 8.8]].map(([x, z], k) => billboard(cam, x, SOL - 25, z, <g fill="#e8e6e0"><rect x="-90" y="-180" width="180" height="20" /><rect x="-90" y="-420" width="20" height="260" /><rect x="-85" y="-170" width="14" height="170" /><rect x="71" y="-170" width="14" height="170" /></g>, `ch${k}`))}
      </g>
    ),
  });
  // guirlande lumineuse au-dessus de la terrasse
  const guir = [];
  const A = [-3150, -1450, zF - 0.05];
  const B = [-900, -1300, TERRASSE_Z[0]];
  for (let k = 0; k <= 22; k++) {
    const t = k / 22;
    guir.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t + Math.sin(t * Math.PI) * 380, A[2] + (B[2] - A[2]) * t]);
  }
  items.push({
    z: TERRASSE_Z[0] + 0.5,
    el: (
      <g key="guirlande">
        {guir.slice(1).map((p, k) => ligne(cam, guir[k], p, 3, '#111', `gf${k}`))}
        {guir.map((p, k) => {
          if (!cam.visible(p[2], p[0], p[1])) return null;
          const q = cam.proj(...p);
          const s = cam.scale(p[2], p[0], p[1]);
          const on = guirlande > 0.05 && (guirlande >= 1 || random(`gl${k}`) < guirlande);
          return (
            <g key={`gb${k}`}>
              {on && <circle cx={q[0]} cy={q[1] + 18 * s} r={80 * s} fill={FETE[k % 4]} opacity="0.35" />}
              <circle cx={q[0]} cy={q[1] + 18 * s} r={16 * s} fill={on ? FETE[k % 4] : '#2a2a2a'} />
            </g>
          );
        })}
      </g>
    ),
  });
  // lampes de jardin le long de l'allée (éteintes après la coupure)
  [-0.5, 2.5, 5.5].forEach((z, k) => {
    [-560, 560].forEach((x) => {
      items.push({
        z,
        el: billboard(cam, x, SOL, z, <g><rect x="-14" y="-260" width="28" height="260" fill="#1a1a1c" /><rect x="-34" y="-320" width="68" height="70" rx="8" fill={fete > 0.05 ? '#fff0c8' : '#2a2a28'} />{fete > 0.05 && <circle cx="0" cy="-285" r="160" fill="url(#ja-chaud)" />}</g>, `lj${k}${x}`),
      });
    });
  });
  // haies et arbres
  [[-7000, -6600, -2.8, 10], [6600, 7000, -2.8, 10]].forEach(([x0, x1, z0, z1], k) => {
    items.push({z: z0, el: bloc(cam, x0, x1, -450, SOL, z0, z1, ['#0b160d', '#0a140c', '#0d1c10'], `ha${k}`)});
  });
  [[-8200, 2.0, 1.6], [8000, 6.0, 1.8], [-8800, 12.0, 2.0], [8600, -1.5, 1.4], [-4600, -1.8, 1.2]].forEach(([x, z, t], k) => {
    items.push({
      z,
      el: billboard(cam, x, SOL, z, <g fill="#060a08"><rect x="-60" y="-1300" width="120" height="1300" /><circle cx="0" cy="-1700" r="600" /><circle cx="-420" cy="-1400" r="420" /><circle cx="440" cy="-1450" r="460" /><circle cx="60" cy="-2150" r="420" /></g>, `ar${k}`, t),
    });
  });
  // clôture + portail double cadenassé
  const zP = PORTAIL.z;
  const clot = [];
  for (let x = -7000; x <= 7000; x += 200) {
    if (x > PORTAIL.x0 - 20 && x < PORTAIL.x1 + 20) continue;
    clot.push(ligne(cam, [x, SOL, zP], [x, -280, zP], Math.max(2, 16 * cam.scale(zP, x, 0)), '#1d1f22', `cl${x}`));
  }
  const pc = cam.proj(0, -150, zP - 0.03);
  const sc = cam.scale(zP - 0.03, 0, -150);
  items.push({
    z: zP,
    el: (
      <g key="cloture">
        {ligne(cam, [-7000, -230, zP], [PORTAIL.x0, -230, zP], 10, '#1d1f22', 'r1')}
        {ligne(cam, [PORTAIL.x1, -230, zP], [7000, -230, zP], 10, '#1d1f22', 'r2')}
        {ligne(cam, [-7000, 250, zP], [PORTAIL.x0, 250, zP], 10, '#1d1f22', 'r3')}
        {ligne(cam, [PORTAIL.x1, 250, zP], [7000, 250, zP], 10, '#1d1f22', 'r4')}
        {clot}
        {[PORTAIL.x0 - 40, PORTAIL.x1 + 40].map((x) => bloc(cam, x - 70, x + 70, -650, SOL, zP - 0.07, zP + 0.07, ['#5a5650', '#4a4640', '#3e3a34'], `pi${x}`))}
        {[...Array(11)].map((_, k) => {
          const x = PORTAIL.x0 + ((k + 1) * (PORTAIL.x1 - PORTAIL.x0)) / 12;
          return ligne(cam, [x, SOL - 10, zP], [x, -420 - (k % 2) * 50 - Math.sin((k / 11) * Math.PI) * 120, zP], Math.max(2, 12 * cam.scale(zP, x, 0)), '#23262a', `ba${k}`);
        })}
        {ligne(cam, [PORTAIL.x0, -360, zP], [PORTAIL.x1, -360, zP], 12, '#23262a', 'tr1')}
        {ligne(cam, [PORTAIL.x0, 200, zP], [PORTAIL.x1, 200, zP], 12, '#23262a', 'tr2')}
        {cam.visible(zP - 0.03, 0, -150) && (
          <g transform={`translate(${pc[0]} ${pc[1]}) scale(${sc}) rotate(${Math.sin(f / 5) * 12 * cadenas})`}>
            {[...Array(8)].map((_, k) => (
              <ellipse key={k} cx={-105 + k * 30} cy={Math.sin(k / 2) * 18} rx="18" ry="10" fill="none" stroke="#9a9ea4" strokeWidth="6" />
            ))}
            <g transform="translate(0 40)">
              <path d="M-22,0 Q-22,-50 0,-50 Q22,-50 22,0" fill="none" stroke="#b8bcc2" strokeWidth="10" />
              <rect x="-34" y="0" width="68" height="60" rx="10" fill="#c9a23a" />
              <circle cx="0" cy="26" r="7" fill="#3a2a10" />
            </g>
          </g>
        )}
      </g>
    ),
  });
  // lampadaire de la rue
  items.push({
    z: -4.2,
    el: (
      <g key="lampadaire">
        {ligne(cam, [1900, SOL + 30, -4.2], [1900, -1200, -4.2], Math.max(2, 26 * cam.scale(-4.2, 1900, 0)), '#121316', 'lpp')}
        {ligne(cam, [1900, -1200, -4.2], [1650, -1200, -4.2], Math.max(2, 18 * cam.scale(-4.2, 1900, 0)), '#121316', 'lpb')}
        {cam.visible(-4.2, 1650, -1180) && (
          <g>
            <circle cx={cam.proj(1650, -1180, -4.2)[0]} cy={cam.proj(1650, -1180, -4.2)[1]} r={800 * cam.scale(-4.2, 1650, -1180)} fill="url(#ja-chaud)" opacity={lampadaire} />
            <circle cx={cam.proj(1650, -1180, -4.2)[0]} cy={cam.proj(1650, -1180, -4.2)[1]} r={40 * cam.scale(-4.2, 1650, -1180)} fill={lampadaire > 0.3 ? '#ffe2b0' : '#3a3530'} />
          </g>
        )}
        <polygon points={cercleSol(cam, 1650, -4.2, 1000, 1.0, SOL + 29)} fill="url(#ja-chaud)" opacity={0.7 * lampadaire} />
      </g>
    ),
  });
  const brume = <rect key="br" width="1080" height="1920" fill="url(#ja-brume)" />;
  return {fond, items, brume};
};

// Le hall vu par la porte ouverte : noir, avec les reflets d'une boule à facettes qui tourne encore
const DiscoInterieur = ({cam, f}) => {
  const p = cam.proj(0, -650, FACADE + 1.5);
  const s = cam.scale(FACADE + 1.5, 0, -650);
  if (!cam.visible(FACADE + 1.5, 0, -650)) return null;
  return (
    <g>
      {[...Array(18)].map((_, k) => {
        const a = (k / 18) * 6.283 + f / 25;
        return <circle key={k} cx={p[0] + Math.cos(a) * 260 * s} cy={p[1] + 400 * s + Math.sin(a * 1.3) * 220 * s} r={7 * s} fill={['#ff3ea5', '#3ec8ff', '#ffffff'][k % 3]} opacity="0.7" />;
      })}
      <circle cx={p[0]} cy={p[1]} r={50 * s} fill="#9aa0a8" />
      {[...Array(7)].map((_, k) => (
        <line key={k} x1={p[0] - 50 * s} y1={p[1] - 36 * s + k * 12 * s} x2={p[0] + 50 * s} y2={p[1] - 36 * s + k * 12 * s} stroke="#d8dce2" strokeWidth={Math.max(1, 2 * s)} />
      ))}
    </g>
  );
};

// ===================== Le téléphone et ses messages =====================
// Interface de messagerie en plein écran (coordonnées écran). messages : [{debut, texte} | {debut, photo: true, texte}]
// verrouille : écran verrouillé (grande heure + notification) au lieu de la conversation
export const Telephone = ({f, messages = [], notif = null, echelle = 1, x = 540, y = 980, vibre = 0, nom = 'Lucas 🎧', verrouille = false}) => {
  const shake = vibre > 0 ? Math.sin(f * 2.4) * 10 * vibre : 0;
  const bulles = messages.filter((m) => f >= m.debut);
  const ecrit = messages.find((m) => f >= m.debut - 32 && f < m.debut);
  const pile = [];
  let yb = 520;
  [...bulles].reverse().forEach((m) => {
    const lignes = coupe(m.texte, 20);
    const h = (m.photo ? 290 : 0) + lignes.length * 52 + 40;
    yb -= h + 26;
    pile.unshift({m, lignes, h, y: yb});
  });
  return (
    <g transform={`translate(${x + shake} ${y}) scale(${echelle}) rotate(${-2 + Math.sin(f / 25) * 1.2})`}>
      {/* mains */}
      <ellipse cx="-300" cy="240" rx="110" ry="200" fill="#c99a7c" />
      <ellipse cx="300" cy="240" rx="110" ry="200" fill="#c99a7c" />
      <rect x="-280" y="-560" width="560" height="1120" rx="74" fill="#0d0d10" />
      <rect x="-255" y="-535" width="510" height="1070" rx="56" fill="#0b0f16" />
      {/* barre du haut */}
      <rect x="-60" y="-522" width="120" height="26" rx="13" fill="#000" />
      <text x="-200" y="-500" fontSize="26" fill="#cfd6e4" fontFamily="'DejaVu Sans', Arial" fontWeight="700">23:47</text>
      <g transform="translate(160 -515)">
        <rect width="44" height="22" rx="5" fill="none" stroke="#cfd6e4" strokeWidth="3" />
        <rect x="4" y="4" width="24" height="14" rx="2" fill="#cfd6e4" />
      </g>
      {verrouille && (
        <g textAnchor="middle" fontFamily="'DejaVu Sans', Arial">
          <rect x="-255" y="-480" width="510" height="1010" rx="50" fill="#141a2c" />
          <circle cx="120" cy="260" r="260" fill="#2a1a40" opacity="0.6" />
          <text y="-250" fontSize="130" fontWeight="300" fill="#e8ecff">23:47</text>
          <text y="-185" fontSize="30" fill="#aab3d6">samedi 25 octobre</text>
        </g>
      )}
      {!verrouille && <g>
      {/* en-tête de la conversation */}
      <rect x="-255" y="-475" width="510" height="110" fill="#121824" />
      <text x="-225" y="-405" fontSize="40" fill="#5aa0ff" fontFamily="'DejaVu Sans', Arial">‹</text>
      <circle cx="-150" cy="-420" r="34" fill="#3a6ad8" />
      <text x="-150" y="-406" fontSize="38" textAnchor="middle" fill="#fff" fontWeight="900" fontFamily="'DejaVu Sans', Arial">L</text>
      <text x="-100" y="-428" fontSize="32" fill="#fff" fontWeight="700" fontFamily="'DejaVu Sans', Arial">{nom}</text>
      <text x="-100" y="-392" fontSize="22" fill="#7ad48a" fontFamily="'DejaVu Sans', Arial">{ecrit ? 'écrit…' : 'en ligne'}</text>
      {/* bulles de messages (reçues, à gauche) */}
      {pile.map(({m, lignes, h, y: yy}, k) => {
        const p = spring({frame: f - m.debut, fps: 30, config: {damping: 11, stiffness: 180}});
        return (
          <g key={k} transform={`translate(-225 ${yy + h}) scale(${p}) translate(0 ${-h})`}>
            <rect width="400" height={h} rx="30" fill="#262d3a" />
            {m.photo && <PhotoGroupe f={f} />}
            {lignes.map((l, i) => (
              <text key={i} x="26" y={(m.photo ? 290 : 0) + 58 + i * 52} fontSize="38" fill="#eef2f8" fontFamily="'DejaVu Sans', Arial" fontWeight={m.gras ? 900 : 400}>
                {l}
              </text>
            ))}
          </g>
        );
      })}
      {/* « en train d'écrire » */}
      {ecrit && (
        <g transform="translate(-225 450)">
          <rect width="130" height="70" rx="35" fill="#262d3a" />
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={36 + i * 30} cy={35 - Math.max(0, Math.sin(f / 3 - i)) * 10} r="10" fill="#9aa4b4" />
          ))}
        </g>
      )}
      </g>}
      {/* notification sur l'écran verrouillé */}
      {notif && f >= notif.debut && (
        <g transform={`translate(0 ${-330 + (1 - spring({frame: f - notif.debut, fps: 30, config: {damping: 12}})) * -260})`}>
          <rect x="-235" y="-70" width="470" height="140" rx="30" fill="#e8ecf4" opacity="0.95" />
          <circle cx="-180" cy="0" r="30" fill="#3ad86a" />
          <text x="-130" y="-10" fontSize="28" fill="#111" fontWeight="900" fontFamily="'DejaVu Sans', Arial">{nom}</text>
          <text x="-130" y="30" fontSize="26" fill="#333" fontFamily="'DejaVu Sans', Arial">{notif.texte}</text>
        </g>
      )}
      {/* reflet + lueur de l'écran */}
      <path d="M-255,-200 L-60,-535 L40,-535 L-255,-40 Z" fill="#fff" opacity="0.04" />
      <ellipse cx="-230" cy="150" rx="48" ry="95" fill="#d9a888" transform="rotate(-20 -230 150)" />
      <ellipse cx="230" cy="150" rx="48" ry="95" fill="#d9a888" transform="rotate(20 230 150)" />
    </g>
  );
};
const coupe = (texte, n) => {
  const mots = texte.split(' ');
  const out = [''];
  mots.forEach((m) => {
    if ((out[out.length - 1] + ' ' + m).trim().length > n) out.push(m);
    else out[out.length - 1] = (out[out.length - 1] + ' ' + m).trim();
  });
  return out;
};
// Photo de groupe prise au flash pendant la soirée : visages blêmes, yeux rouges, grain…
// et au fond, une silhouette de trop, immense, au visage blanc sans traits.
const PhotoGroupe = ({f}) => {
  const visage = (x, y, r, k) => (
    <g key={k}>
      <rect x={x - r * 1.3} y={y + r * 0.9} width={r * 2.6} height={r * 3} rx={r * 0.9} fill={['#2a1a3a', '#3a1a1a', '#1a2a3a', '#2a2a1a', '#1a1a1a'][k % 5]} />
      <ellipse cx={x} cy={y} rx={r * 0.85} ry={r} fill="#e8d2c0" />
      <path d={`M${x - r * 0.9},${y - r * 0.3} Q${x},${y - r * 1.5} ${x + r * 0.9},${y - r * 0.3}`} fill="#2a1a14" />
      <circle cx={x - r * 0.32} cy={y} r={r * 0.13} fill="#d01a1a" />
      <circle cx={x + r * 0.32} cy={y} r={r * 0.13} fill="#d01a1a" />
      <path d={`M${x - r * 0.35},${y + r * 0.45} Q${x},${y + r * 0.7} ${x + r * 0.35},${y + r * 0.45}`} stroke="#5a2a2a" strokeWidth={r * 0.1} fill="none" />
    </g>
  );
  return (
    <g>
      <defs>
        <clipPath id="ph-clip">
          <rect x="14" y="14" width="372" height="262" rx="20" />
        </clipPath>
        <radialGradient id="ph-flash" cx="45%" cy="55%" r="60%">
          <stop offset="0" stopColor="#fff6e8" stopOpacity="0.35" />
          <stop offset="1" stopColor="#000" stopOpacity="0.6" />
        </radialGradient>
        <filter id="ph-grain">
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="7" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <filter id="ph-doux">
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
      </defs>
      <g clipPath="url(#ph-clip)">
        {/* la pièce sombre, guirlandes floues */}
        <rect x="14" y="14" width="372" height="262" fill="#120c18" />
        {[[60, 40, '#ff3ea5'], [150, 30, '#ffd23e'], [260, 45, '#3ec8ff'], [340, 35, '#9a3eff']].map(([x, y, c], k) => (
          <circle key={k} cx={x} cy={y} r="16" fill={c} opacity="0.6" filter="url(#ph-doux)" />
        ))}
        {/* LA silhouette de trop, derrière tout le monde : très grande, visage blanc lisse, orbites noires */}
        <g opacity="0.92">
          <rect x="222" y="40" width="60" height="230" rx="24" fill="#050507" />
          <ellipse cx="252" cy="58" rx="26" ry="34" fill="#efece6" />
          <ellipse cx="243" cy="56" rx="6" ry="9" fill="#050507" />
          <ellipse cx="261" cy="56" rx="6" ry="9" fill="#050507" />
          <path d="M236,36 L252,6 L268,36 Z" fill="#c42a8a" />
        </g>
        {/* les invités qui posent au premier plan */}
        <g filter="url(#ph-doux)">
          {[[60, 150, 26], [120, 160, 24], [185, 148, 27], [300, 158, 25], [355, 150, 24]].map(([x, y, r], k) => visage(x, y, r, k))}
          {/* bras levés, gobelets */}
          <path d="M95,215 L80,175" stroke="#e8d2c0" strokeWidth="9" strokeLinecap="round" />
          <rect x="72" y="160" width="14" height="18" fill="#c42a2a" />
          <path d="M330,215 L345,178" stroke="#e8d2c0" strokeWidth="9" strokeLinecap="round" />
        </g>
        {/* lumière du flash, grain, date de la photo */}
        <rect x="14" y="14" width="372" height="262" fill="url(#ph-flash)" />
        <rect x="14" y="14" width="372" height="262" filter="url(#ph-grain)" opacity="0.18" />
        <text x="372" y="266" fontSize="14" textAnchor="end" fill="#ffb45a" fontFamily="'DejaVu Sans Mono', monospace" opacity="0.8">23:12</text>
      </g>
    </g>
  );
};
