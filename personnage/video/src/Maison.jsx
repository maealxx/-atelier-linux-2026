import {random, spring} from 'remotion';
import {plaque} from './Lycee';
import {SOL} from './Rue';

// ===================== « La soirée » : la maison, le jardin, le portail =====================
// Façade de la maison en Z = 8 (on la regarde depuis le jardin), de X -1500 à 1500.
// Rez-de-chaussée de Y 432 à -700, étage de -700 à -1500, toit jusqu'à -2300.
export const FACADE = 8;
export const MX = 1500;
export const PORTE = {x0: 450, x1: 750}; // porte d'entrée (avec perron)
export const BAIE = {x0: -950, x1: -500}; // porte-fenêtre de la terrasse
export const PORTAIL = {z: -2.5, x0: 380, x1: 820};
export const PERRON = {z0: 7.25, marche: 60, n: 3}; // 3 marches de 60 unités
export const FENETRES = [
  {x0: -250, x1: 150, y0: -520, y1: -100}, // rez-de-chaussée
  {x0: -1250, x1: -870, y0: -1380, y1: -960},
  {x0: -650, x1: -270, y0: -1380, y1: -960},
  {x0: -50, x1: 330, y0: -1380, y1: -960},
  {x0: 550, x1: 930, y0: -1380, y1: -960},
  {x0: 1050, x1: 1380, y0: -520, y1: -100},
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
const cercleSol = (cam, cx, cz, rx, rz, y = SOL - 1) => cam.poly([...Array(18)].map((_, k) => [cx + Math.cos((k / 18) * 6.283) * rx, y, cz + Math.sin((k / 18) * 6.283) * rz]));

// Silhouette derrière une fenêtre : tête + épaules ; danse pendant la fête ; sourire trop large ensuite
const Silhouette = ({f, k, danse, sourire}) => {
  const b = danse ? Math.sin(f / 4 + k * 1.7) * 25 : 0;
  const r = danse ? Math.sin(f / 6 + k) * 8 : 0;
  return (
    <g transform={`translate(0 ${b}) rotate(${r})`}>
      <path d="M-150,0 Q-140,-170 -60,-190 L60,-190 Q140,-170 150,0 Z" fill="#050507" />
      <ellipse cx="0" cy="-270" rx="70" ry="85" fill="#050507" />
      {danse && <path d="M-140,-120 L-220,-330 M140,-120 L220,-330" stroke="#050507" strokeWidth="40" strokeLinecap="round" />}
      {sourire > 0.02 && (
        <g opacity={Math.min(1, sourire * 1.5)}>
          <path d={`M${-55 * sourire - 10},-250 Q0,${-250 + 70 * sourire} ${55 * sourire + 10},-250 Q0,${-250 + 25 * sourire} ${-55 * sourire - 10},-250 Z`} fill="#f4f0e6" />
          {[...Array(7)].map((_, i) => {
            const x = (-55 * sourire - 10) + ((i + 1) * (110 * sourire + 20)) / 8;
            return <line key={i} x1={x} y1="-250" x2={x} y2={-250 + 45 * sourire * (1 - Math.abs(x) / (60 * sourire + 12))} stroke="#050507" strokeWidth="3" />;
          })}
          <circle cx="-25" cy="-290" r="6" fill="#f4f0e6" opacity="0.8" />
          <circle cx="25" cy="-290" r="6" fill="#f4f0e6" opacity="0.8" />
        </g>
      )}
    </g>
  );
};

// fete : 0 → 1 (lumières de la fête) ; eteinte(i) : décalage de l'extinction par fenêtre ;
// gens : 'danse' | 'immobile' | null ; sourire 0 → 1 ; porte 0 → 1 (ouverture) ; lampadaire, lune ; cadenas : balancement
export const jardin = (cam, f, {fete = 0, fenetre = () => fete, gens = 'danse', sourire = 0, porte = 0, lampadaire = 1, enceinte = fete, guirlande = fete, cadenas = 0, vitre = null} = {}) => {
  const {poly} = cam;
  const zA = cam.z - 3;
  const zB = 40;
  const etoiles = [...Array(70)].map((_, k) => {
    const x = (random(`ex${k}`) - 0.5) * 60000;
    const y = -3000 - random(`ey${k}`) * 30000;
    const z = cam.z + 60;
    if (!cam.visible(z, x, y)) return null;
    const p = cam.proj(x, y, z);
    return <circle key={k} cx={p[0]} cy={p[1]} r={1 + random(`er${k}`) * 1.8} fill="#e8eeff" opacity={0.3 + 0.5 * random(`eo${k}`) * (0.6 + 0.4 * Math.sin(f / 7 + k))} />;
  });
  const lune = cam.visible(cam.z + 60, -12000, -24000) ? cam.proj(-12000, -24000, cam.z + 60) : null;
  // herbe : touffes
  const herbe = [...Array(60)].map((_, k) => {
    const x = -2100 + random(`hx${k}`) * 4200;
    const z = -2.2 + random(`hz${k}`) * 9;
    if (x > 300 && x < 900) return null;
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
        <radialGradient id="ja-brume" cx={cam.fuite[0]} cy={cam.fuite[1]} r="1000" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0a0f1a" stopOpacity="0.5" />
          <stop offset="1" stopColor="#0a0f1a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#ja-ciel)" />
      {etoiles}
      {lune && (
        <g>
          <circle cx={lune[0]} cy={lune[1]} r="170" fill="url(#ja-lune)" />
          <circle cx={lune[0]} cy={lune[1]} r="55" fill="#e8eef8" opacity="0.85" />
          <circle cx={lune[0] + 14} cy={lune[1] - 8} r="12" fill="#c9d0e0" opacity="0.6" />
        </g>
      )}
      {/* maisons voisines au loin (des deux côtés) */}
      {[-9000, -6000, 6000, 9500].map((x, k) => (
        <g key={`v${k}`}>
          <polygon points={poly([[x - 1400, SOL, 22], [x + 1400, SOL, 22], [x + 1400, -1600, 22], [x, -2600, 22], [x - 1400, -1600, 22]])} fill="#070a12" />
          {k % 2 === 0 && <polygon points={poly([[x - 300, -1100, 21.9], [x + 100, -1100, 21.9], [x + 100, -800, 21.9], [x - 300, -800, 21.9]])} fill="#6a5a2a" opacity="0.5" />}
        </g>
      ))}
      {/* maisons de l'autre côté de la rue (visibles quand on regarde vers le portail) */}
      {[-4000, -500, 3200].map((x, k) => (
        <polygon key={`r${k}`} points={poly([[x - 1500, SOL, -16], [x + 1500, SOL, -16], [x + 1500, -1500, -16], [x, -2500, -16], [x - 1500, -1500, -16]])} fill="#070a12" />
      ))}
      {/* sol : pelouse, rue au-delà du portail */}
      <polygon points={poly([[-9000, SOL, PORTAIL.z], [9000, SOL, PORTAIL.z], [9000, SOL, zB], [-9000, SOL, zB]])} fill="#0f1a12" />
      <polygon points={poly([[-9000, SOL + 30, -12], [9000, SOL + 30, -12], [9000, SOL + 30, PORTAIL.z], [-9000, SOL + 30, PORTAIL.z]])} fill="#1a1c20" />
      {ligne(cam, [-9000, SOL + 29, -7], [9000, SOL + 29, -7], 4, '#8a8470', 'marquage', 0.4)}
      {/* lumière chaude de la fête sur la pelouse */}
      {fete > 0.02 && <polygon points={cercleSol(cam, -300, 6.5, 2200, 2.5)} fill="url(#ja-fete)" opacity={fete} />}
      {/* allée de pierres du portail à la porte */}
      {[...Array(9)].map((_, k) => {
        const z = PORTAIL.z + 0.6 + k * 1.05;
        return <polygon key={`p${k}`} points={cercleSol(cam, 600 + Math.sin(k) * 40, z, 150, 0.18)} fill="#23262a" />;
      })}
      {herbe}
    </g>
  );

  const items = [];
  // ---- la maison ----
  const zF = FACADE;
  const zD = FACADE + 4;
  const fenetreEl = (w, k) => {
    const v = fenetre(k);
    const col = FETE[(k + Math.floor(f / 8)) % FETE.length];
    const zz = zF - 0.004;
    return (
      <g key={`fe${k}`}>
        <polygon points={poly([[w.x0 - 30, w.y0 - 30, zz], [w.x1 + 30, w.y0 - 30, zz], [w.x1 + 30, w.y1 + 30, zz], [w.x0 - 30, w.y1 + 30, zz]])} fill="#d8d2c4" />
        <polygon points={poly([[w.x0, w.y0, zz - 0.001], [w.x1, w.y0, zz - 0.001], [w.x1, w.y1, zz - 0.001], [w.x0, w.y1, zz - 0.001]])} fill={v > 0.05 ? col : '#0a1020'} opacity={v > 0.05 ? 0.55 + 0.45 * v : 1} />
        {/* reflet de lune sur la vitre éteinte */}
        {v <= 0.05 && <polygon points={poly([[w.x0 + 30, w.y0, zz - 0.002], [w.x0 + 110, w.y0, zz - 0.002], [w.x0 + 10, w.y1, zz - 0.002], [w.x0, w.y1 - 60, zz - 0.002]])} fill="#9fb4e0" opacity="0.12" />}
        {gens && billboard(cam, (w.x0 + w.x1) / 2, w.y1 + 10, zz + 0.05, <Silhouette f={f} k={k} danse={gens === 'danse'} sourire={sourire} />, `si${k}`, (w.y1 - w.y0) / 420)}
        {ligne(cam, [(w.x0 + w.x1) / 2, w.y0, zz - 0.003], [(w.x0 + w.x1) / 2, w.y1, zz - 0.003], 8, '#d8d2c4', 'mont')}
        {v > 0.05 && <circle cx={cam.proj((w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2, zz)[0]} cy={cam.proj((w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2, zz)[1]} r={600 * cam.scale(zz, w.x0, w.y0)} fill="url(#ja-fete)" opacity={0.6 * v} />}
      </g>
    );
  };
  const vPorte = PORTE;
  const ouv = porte;
  items.push({
    z: zF,
    el: (
      <g key="maison">
        {/* côtés de la maison */}
        {cam.x > MX && <polygon points={poly([[MX, SOL, zF], [MX, SOL, zD], [MX, -1500, zD], [MX, -1500, zF]])} fill="#3a3530" />}
        {cam.x < -MX && <polygon points={poly([[-MX, SOL, zF], [-MX, SOL, zD], [-MX, -1500, zD], [-MX, -1500, zF]])} fill="#3a3530" />}
        {/* façade crépie + soubassement */}
        <polygon points={poly([[-MX, SOL, zF], [MX, SOL, zF], [MX, -1500, zF], [-MX, -1500, zF]])} fill="#5a5248" />
        <polygon points={poly([[-MX, SOL, zF - 0.002], [MX, SOL, zF - 0.002], [MX, 250, zF - 0.002], [-MX, 250, zF - 0.002]])} fill="#3e3a34" />
        {ligne(cam, [-MX, -700, zF - 0.003], [MX, -700, zF - 0.003], 16, '#4a443c', 'bandeau')}
        {/* toit */}
        <polygon points={poly([[-MX - 120, -1500, zF - 0.4], [MX + 120, -1500, zF - 0.4], [MX + 120, -2350, zF + 2], [-MX - 120, -2350, zF + 2]])} fill="#2a1e1a" />
        {[...Array(6)].map((_, k) => ligne(cam, [-MX - 120, -1500 - k * 140, zF - 0.4 + k * 0.4], [MX + 120, -1500 - k * 140, zF - 0.4 + k * 0.4], 4, '#1c1310', `tu${k}`))}
        <polygon points={poly([[900, -2100, zF + 1.2], [1100, -2100, zF + 1.2], [1100, -2700, zF + 1.2], [900, -2700, zF + 1.2]])} fill="#3a302a" />
        {/* lucarne */}
        <polygon points={poly([[-200, -1950, zF + 0.9], [200, -1950, zF + 0.9], [200, -1650, zF + 0.3], [-200, -1650, zF + 0.3]])} fill={fenetre(9) > 0.05 ? '#ffd23e' : '#0a1020'} opacity="0.85" />
        {FENETRES.map(fenetreEl)}
        {/* porte-fenêtre de la terrasse */}
        <polygon points={poly([[BAIE.x0 - 30, -460, zF - 0.004], [BAIE.x1 + 30, -460, zF - 0.004], [BAIE.x1 + 30, SOL, zF - 0.004], [BAIE.x0 - 30, SOL, zF - 0.004]])} fill="#d8d2c4" />
        <polygon points={poly([[BAIE.x0, -430, zF - 0.005], [BAIE.x1, -430, zF - 0.005], [BAIE.x1, SOL - 10, zF - 0.005], [BAIE.x0, SOL - 10, zF - 0.005]])} fill={fenetre(7) > 0.05 ? FETE[Math.floor(f / 8) % 4] : '#081020'} opacity={fenetre(7) > 0.05 ? 0.7 : 1} />
        {vitre}
        {ligne(cam, [(BAIE.x0 + BAIE.x1) / 2, -430, zF - 0.006], [(BAIE.x0 + BAIE.x1) / 2, SOL, zF - 0.006], 10, '#d8d2c4', 'baie')}
        {/* porte d'entrée : battant qui pivote vers l'intérieur */}
        <polygon points={poly([[vPorte.x0 - 40, -470, zF - 0.004], [vPorte.x1 + 40, -470, zF - 0.004], [vPorte.x1 + 40, SOL - PERRON.n * PERRON.marche, zF - 0.004], [vPorte.x0 - 40, SOL - PERRON.n * PERRON.marche, zF - 0.004]])} fill="#e0dacc" />
        <polygon points={poly([[vPorte.x0, -440, zF - 0.005], [vPorte.x1, -440, zF - 0.005], [vPorte.x1, SOL - 180, zF - 0.005], [vPorte.x0, SOL - 180, zF - 0.005]])} fill="#030304" />
        {ouv > 0.01 && <DiscoInterieur cam={cam} f={f} />}
        <polygon points={poly([[vPorte.x0, -440, zF - 0.006], [vPorte.x0 + (vPorte.x1 - vPorte.x0) * Math.cos(ouv * 1.4), -440, zF - 0.006 + 0.3 * Math.sin(ouv * 1.4)], [vPorte.x0 + (vPorte.x1 - vPorte.x0) * Math.cos(ouv * 1.4), SOL - 180, zF - 0.006 + 0.3 * Math.sin(ouv * 1.4)], [vPorte.x0, SOL - 180, zF - 0.006]])} fill="#4a2a1c" stroke="#2a1810" strokeWidth="3" />
        {/* applique au-dessus de la porte */}
        {(() => {
          const p = cam.proj(600, -560, zF - 0.1);
          const s = cam.scale(zF - 0.1, 600, -560);
          return cam.visible(zF - 0.1, 600, -560) ? <g><circle cx={p[0]} cy={p[1]} r={500 * s} fill="url(#ja-chaud)" opacity={fete > 0.05 ? 1 : 0.15} /><circle cx={p[0]} cy={p[1]} r={30 * s} fill={fete > 0.05 ? '#fff0c8' : '#3a3530'} /></g> : null;
        })()}
        {/* numéro de la maison */}
        {plaque(cam, [820, -380, zF - 0.006], [1, 0, 0], [0, 1, 0], 120, 120, <g><rect width="120" height="120" rx="12" fill="#d8d2c4" /><text x="60" y="88" fontSize="80" textAnchor="middle" fontWeight="900" fill="#2a2420" fontFamily="'DejaVu Sans', Arial">13</text></g>, 'num')}
      </g>
    ),
  });
  // perron (3 marches)
  for (let m = 0; m < PERRON.n; m++) {
    const z0 = PERRON.z0 + m * 0.25;
    const y = SOL - (m + 1) * PERRON.marche;
    items.push({
      z: z0,
      el: (
        <g key={`pe${m}`}>
          <polygon points={poly([[350, y, z0], [850, y, z0], [850, y, zF], [350, y, zF]])} fill="#6a6660" />
          <polygon points={poly([[350, y, z0], [850, y, z0], [850, y + PERRON.marche, z0], [350, y + PERRON.marche, z0]])} fill="#4a4640" />
        </g>
      ),
    });
  }
  // terrasse en bois
  items.push({
    z: 6.2,
    el: (
      <g key="terrasse">
        <polygon points={poly([[-1400, SOL - 25, 6.2], [250, SOL - 25, 6.2], [250, SOL - 25, zF], [-1400, SOL - 25, zF]])} fill="#4a3424" />
        {[...Array(8)].map((_, k) => ligne(cam, [-1400, SOL - 26, 6.2 + k * 0.23], [250, SOL - 26, 6.2 + k * 0.23], 3, '#2e2016', `la${k}`))}
        <polygon points={poly([[-1400, SOL - 25, 6.2], [250, SOL - 25, 6.2], [250, SOL, 6.2], [-1400, SOL, 6.2]])} fill="#2e2016" />
      </g>
    ),
  });
  // enceinte + gobelets + chaises
  items.push({
    z: 6.6,
    el: (
      <g key="enceinte">
        {billboard(cam, -150, SOL - 25, 6.6, <g><rect x="-110" y="-330" width="220" height="330" rx="16" fill="#151518" /><circle cx="0" cy="-110" r="70" fill="#26262c" /><circle cx="0" cy="-110" r={30 + (enceinte > 0.05 ? Math.abs(Math.sin(f / 2)) * 12 : 0)} fill="#0c0c0f" /><circle cx="0" cy="-250" r="34" fill="#26262c" /><circle cx="80" cy="-305" r="9" fill={enceinte > 0.05 ? '#3eff7a' : '#202020'} /></g>, 'enc')}
        {[[-600, 6.9], [-520, 7.1], [-360, 6.8]].map(([x, z], k) => billboard(cam, x, SOL - 25, z, <path d="M-22,0 L-28,-80 L28,-80 L22,0 Z" fill="#c42a2a" />, `go${k}`))}
        {[[-1100, 7.0], [-850, 6.7]].map(([x, z], k) => billboard(cam, x, SOL - 25, z, <g fill="#e8e6e0"><rect x="-90" y="-180" width="180" height="20" /><rect x="-90" y="-420" width="20" height="260" /><rect x="-85" y="-170" width="14" height="170" /><rect x="71" y="-170" width="14" height="170" /></g>, `ch${k}`))}
      </g>
    ),
  });
  // guirlande lumineuse (chaînette d'ampoules colorées)
  const guir = [];
  const A = [-1450, -720, zF - 0.05];
  const B = [300, -640, 6.3];
  for (let k = 0; k <= 20; k++) {
    const t = k / 20;
    const p = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t + Math.sin(t * Math.PI) * 260, A[2] + (B[2] - A[2]) * t];
    guir.push(p);
  }
  items.push({
    z: 6.3,
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
              {on && <circle cx={q[0]} cy={q[1] + 18 * s} r={70 * s} fill={FETE[k % 4]} opacity="0.35" />}
              <circle cx={q[0]} cy={q[1] + 18 * s} r={14 * s} fill={on ? FETE[k % 4] : '#2a2a2a'} />
            </g>
          );
        })}
      </g>
    ),
  });
  // haies et arbres
  [[-2100, -1800, -2, 7.5], [1800, 2100, -2, 7.5]].forEach(([x0, x1, z0, z1], k) => {
    items.push({
      z: z0,
      el: (
        <g key={`ha${k}`}>
          <polygon points={poly([[x0, -350, z0], [x1, -350, z0], [x1, -350, z1], [x0, -350, z1]])} fill="#0b160d" />
          <polygon points={poly([[k ? x0 : x1, -350, z0], [k ? x0 : x1, -350, z1], [k ? x0 : x1, SOL, z1], [k ? x0 : x1, SOL, z0]])} fill="#0d1c10" />
          <polygon points={poly([[x0, -350, z0], [x1, -350, z0], [x1, SOL, z0], [x0, SOL, z0]])} fill="#0a140c" />
        </g>
      ),
    });
  });
  [[-2600, 3.0, 1.3], [2500, 5.5, 1.5], [-3200, 9.0, 1.6], [3300, -1.0, 1.2]].forEach(([x, z, t], k) => {
    items.push({
      z,
      el: billboard(cam, x, SOL, z, <g fill="#060a08"><rect x="-50" y="-1200" width="100" height="1200" /><circle cx="0" cy="-1600" r="560" /><circle cx="-380" cy="-1350" r="380" /><circle cx="400" cy="-1380" r="420" /><circle cx="60" cy="-2000" r="380" /></g>, `ar${k}`, t),
    });
  });
  // clôture + portail cadenassé
  const zP = PORTAIL.z;
  const clot = [];
  for (let x = -2100; x <= 2100; x += 180) {
    if (x > PORTAIL.x0 - 20 && x < PORTAIL.x1 + 20) continue;
    clot.push(ligne(cam, [x, SOL, zP], [x, -220, zP], Math.max(2, 16 * cam.scale(zP, x, 0)), '#1d1f22', `cl${x}`));
  }
  const pc = cam.proj((PORTAIL.x0 + PORTAIL.x1) / 2, -120, zP - 0.03);
  const sc = cam.scale(zP - 0.03, 600, -120);
  items.push({
    z: zP,
    el: (
      <g key="cloture">
        {ligne(cam, [-2100, -180, zP], [PORTAIL.x0, -180, zP], 10, '#1d1f22', 'r1')}
        {ligne(cam, [PORTAIL.x1, -180, zP], [2100, -180, zP], 10, '#1d1f22', 'r2')}
        {ligne(cam, [-2100, 250, zP], [PORTAIL.x0, 250, zP], 10, '#1d1f22', 'r3')}
        {ligne(cam, [PORTAIL.x1, 250, zP], [2100, 250, zP], 10, '#1d1f22', 'r4')}
        {clot}
        {/* portail en fer forgé */}
        {[PORTAIL.x0, PORTAIL.x1].map((x) => ligne(cam, [x, SOL, zP], [x, -420, zP], Math.max(3, 30 * cam.scale(zP, x, 0)), '#16181b', `pi${x}`))}
        {[...Array(9)].map((_, k) => {
          const x = PORTAIL.x0 + ((k + 1) * (PORTAIL.x1 - PORTAIL.x0)) / 10;
          return ligne(cam, [x, SOL - 10, zP], [x, -340 - (k % 2) * 40, zP], Math.max(2, 12 * cam.scale(zP, x, 0)), '#23262a', `ba${k}`);
        })}
        {ligne(cam, [PORTAIL.x0, -300, zP], [PORTAIL.x1, -300, zP], 12, '#23262a', 'tr1')}
        {ligne(cam, [PORTAIL.x0, 200, zP], [PORTAIL.x1, 200, zP], 12, '#23262a', 'tr2')}
        {/* chaîne + cadenas */}
        {cam.visible(zP - 0.03, 600, -120) && (
          <g transform={`translate(${pc[0]} ${pc[1]}) scale(${sc}) rotate(${Math.sin(f / 5) * 12 * cadenas})`}>
            {[...Array(7)].map((_, k) => (
              <ellipse key={k} cx={-90 + k * 30} cy={Math.sin(k / 2) * 18} rx="18" ry="10" fill="none" stroke="#9a9ea4" strokeWidth="6" />
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
  // lampadaire de la rue (lumière orange qui grésille)
  const lp = [1500, -1100, -3.6];
  items.push({
    z: -3.6,
    el: (
      <g key="lampadaire">
        {ligne(cam, [1500, SOL + 30, -3.6], [1500, -1100, -3.6], Math.max(2, 26 * cam.scale(-3.6, 1500, 0)), '#121316', 'lpp')}
        {ligne(cam, [1500, -1100, -3.6], [1250, -1100, -3.6], Math.max(2, 18 * cam.scale(-3.6, 1500, 0)), '#121316', 'lpb')}
        {cam.visible(-3.6, 1250, -1080) && (
          <g>
            <circle cx={cam.proj(1250, -1080, -3.6)[0]} cy={cam.proj(1250, -1080, -3.6)[1]} r={700 * cam.scale(-3.6, 1250, -1080)} fill="url(#ja-chaud)" opacity={lampadaire} />
            <circle cx={cam.proj(1250, -1080, -3.6)[0]} cy={cam.proj(1250, -1080, -3.6)[1]} r={40 * cam.scale(-3.6, 1250, -1080)} fill={lampadaire > 0.3 ? '#ffe2b0' : '#3a3530'} />
          </g>
        )}
        <polygon points={cercleSol(cam, 1250, -3.6, 900, 0.9, SOL + 29)} fill="url(#ja-chaud)" opacity={0.7 * lampadaire} />
      </g>
    ),
  });
  const brume = <rect key="br" width="1080" height="1920" fill="url(#ja-brume)" />;
  return {fond, items, brume};
};

// Couloir intérieur vu par la porte ouverte : noir, avec les reflets d'une boule à facettes qui tourne encore
const DiscoInterieur = ({cam, f}) => {
  const p = cam.proj(600, -350, FACADE + 1.2);
  const s = cam.scale(FACADE + 1.2, 600, -350);
  if (!cam.visible(FACADE + 1.2, 600, -350)) return null;
  return (
    <g>
      {[...Array(14)].map((_, k) => {
        const a = (k / 14) * 6.283 + f / 25;
        return <circle key={k} cx={p[0] + Math.cos(a) * 200 * s} cy={p[1] + 300 * s + Math.sin(a * 1.3) * 160 * s} r={6 * s} fill={['#ff3ea5', '#3ec8ff', '#ffffff'][k % 3]} opacity="0.7" />;
      })}
      <circle cx={p[0]} cy={p[1]} r={40 * s} fill="#9aa0a8" />
      {[...Array(6)].map((_, k) => (
        <line key={k} x1={p[0] - 40 * s} y1={p[1] - 30 * s + k * 12 * s} x2={p[0] + 40 * s} y2={p[1] - 30 * s + k * 12 * s} stroke="#d8dce2" strokeWidth={Math.max(1, 2 * s)} />
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
  const ecrit = messages.find((m) => f >= m.debut - 18 && f < m.debut);
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
// Photo de groupe floue de la soirée… avec une silhouette de trop, immense, au fond
const PhotoGroupe = ({f}) => (
  <g>
    <defs>
      <clipPath id="ph-clip">
        <rect x="14" y="14" width="372" height="262" rx="20" />
      </clipPath>
      <filter id="ph-flou">
        <feGaussianBlur stdDeviation="2.5" />
      </filter>
    </defs>
    <g clipPath="url(#ph-clip)">
      <rect x="14" y="14" width="372" height="262" fill="#3a2a40" />
      <g filter="url(#ph-flou)">
        <circle cx="120" cy="60" r="60" fill="#ff3ea5" opacity="0.5" />
        <circle cx="300" cy="70" r="50" fill="#3ec8ff" opacity="0.5" />
        {[60, 130, 200, 270, 340].map((x, k) => (
          <g key={k} fill="#0c0c10">
            <ellipse cx={x} cy={170} rx="26" ry="32" />
            <rect x={x - 40} y={196} width="80" height="90" rx="30" />
          </g>
        ))}
        {/* celui qu'on ne connaît pas */}
        <g fill="#050507">
          <ellipse cx="236" cy="66" rx="22" ry="30" />
          <rect x="212" y="92" width="48" height="120" rx="18" />
          <rect x="214" y="44" width="44" height="12" fill="#c9a23a" opacity={0.7 + 0.3 * Math.sin(f / 6)} />
        </g>
      </g>
    </g>
  </g>
);
