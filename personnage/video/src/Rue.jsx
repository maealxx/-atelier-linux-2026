import {random} from 'remotion';
import {VP} from './moteur';

// ===== La rue la nuit, en 2,5D =====
// La rue file vers +Z. Trottoir droit : X -20 → 520, chaussée : X -1100 → -20, trottoir gauche : X -1500 → -1100.
export const SOL = 432;
export const ROUTE = 470;
export const BORDURE = -20;
const ROUTE_G = -1100;
const FACADE_D = 520;
const FACADE_G = -1500;
const TOIT = -2600;
export const PARC = [4.2, 8.6];
export const ABRIBUS = [3, 4];
const LIGNE_Y = -760; // tête des lampadaires

const COULEURS = ['#3a3341', '#3b3832', '#30383e', '#3e3337', '#353a32'];

// Immeubles (générés une fois)
const blocs = (cote) => {
  const out = [];
  const pas = cote === 'D' ? 4.6 : 5.1;
  const long = cote === 'D' ? 4.3 : 4.8;
  for (let i = 0; i < 24; i++) {
    const z0 = -60 + (cote === 'D' ? 0 : 1.7) + i * pas;
    const z1 = z0 + long;
    if (cote === 'D' && z1 > PARC[0] && z0 < PARC[1]) continue;
    out.push({i, z0, z1, c: COULEURS[Math.floor(random(`c${cote}${i}`) * COULEURS.length)]});
  }
  return out;
};
const BLOCS_D = blocs('D');
const BLOCS_G = blocs('G');
export const LAMPES = [];
for (let k = 0; k < 40; k++) {
  LAMPES.push({cote: 'D', z: -60 + k * 2.6, x: 430, tete: 280});
  LAMPES.push({cote: 'G', z: -58.7 + k * 2.6, x: -1180, tete: -1030});
}

const cercleSol = (cam, cx, cz, rx, rz, y = SOL) =>
  cam.poly([...Array(20)].map((_, i) => [cx + Math.cos((i / 20) * Math.PI * 2) * rx, y, cz + Math.sin((i / 20) * Math.PI * 2) * rz]));

// lampe(l) → intensité 0..1 ; fenetre(cle, defaut) → 0..1 ; balancoire → angle en degrés
export const rue = (cam, f, {lampe = () => 1, fenetre = (k, d) => d, balancoire = [0, 0], panneau = 1} = {}) => {
  const {proj, poly, scale, visible} = cam;
  const zMin = cam.z + 0.15;
  const zMax = cam.z + 30;
  const dans = (z0, z1) => z1 > zMin && z0 < zMax;
  const cz = (z) => Math.min(Math.max(z, zMin), zMax);
  const line = (a, b, w, col, key, op = 1) => (
    <line key={key} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={col} strokeWidth={w} opacity={op} strokeLinecap="round" />
  );

  // ----- Fond : ciel, façades, sol -----
  const facades = (liste, cote) =>
    liste
      .filter((b) => dans(b.z0, b.z1))
      .sort((a, b) => b.z0 - a.z0)
      .map((b) => {
        const X = cote === 'D' ? FACADE_D : FACADE_G;
        const Xb = cote === 'D' ? FACADE_D + 900 : FACADE_G - 900;
        const z0 = cz(b.z0);
        const z1 = cz(b.z1);
        const fen = [];
        for (let zc = b.z0 + 0.4; zc < b.z1 - 0.3; zc += 0.75) {
          if (!dans(zc - 0.18, zc + 0.18)) continue;
          for (const [r, yc] of [[0, -380], [1, -1380], [2, -2380]]) {
            const cle = `${cote}${b.i}-${Math.round(zc * 10)}-${r}`;
            const lit = fenetre(cle, random(cle) < 0.3 ? 1 : 0);
            fen.push(
              <polygon
                key={cle}
                points={poly([[X, yc - 210, cz(zc - 0.18)], [X, yc - 210, cz(zc + 0.18)], [X, yc + 210, cz(zc + 0.18)], [X, yc + 210, cz(zc - 0.18)]])}
                fill={lit > 0 ? '#FFC46B' : '#0c0f13'}
                opacity={lit > 0 ? 0.35 + 0.6 * lit : 1}
              />
            );
          }
        }
        return (
          <g key={`${cote}${b.i}`}>
            {/* face avant du bloc (visible dans les ruelles) */}
            {visible(b.z0) && <polygon points={poly([[X, TOIT, b.z0], [Xb, TOIT, b.z0], [Xb, SOL, b.z0], [X, SOL, b.z0]])} fill="#141218" />}
            <polygon points={poly([[X, TOIT, z0], [X, TOIT, z1], [X, SOL, z1], [X, SOL, z0]])} fill={b.c} />
            {/* rideau de fer au rez-de-chaussée */}
            <polygon points={poly([[X, 40, cz(b.z0 + 0.3)], [X, 40, cz(b.z1 - 0.3)], [X, SOL, cz(b.z1 - 0.3)], [X, SOL, cz(b.z0 + 0.3)]])} fill="#34373c" />
            {fen}
          </g>
        );
      });

  const tirets = [];
  for (let z = Math.ceil(zMin / 1.2) * 1.2; z < zMax; z += 1.2) {
    tirets.push(<polygon key={z} points={poly([[-575, ROUTE, z], [-545, ROUTE, z], [-545, ROUTE, z + 0.55], [-575, ROUTE, z + 0.55]])} fill="#b9b4a0" opacity="0.5" />);
  }

  const parcVisible = dans(PARC[0], PARC[1]);
  const flaques = LAMPES.filter((l) => dans(l.z - 0.7, l.z + 0.7)).map((l, i) => {
    const v = lampe(l);
    return v > 0.02 ? <polygon key={`fl${i}`} points={cercleSol(cam, l.tete, l.z, 700, 0.75)} fill="url(#rue-flaque)" opacity={v} /> : null;
  });

  const fond = (
    <g>
      <defs>
        <linearGradient id="rue-ciel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#05070f" />
          <stop offset="0.35" stopColor="#141226" />
          <stop offset="0.5" stopColor="#2a1a24" />
        </linearGradient>
        <radialGradient id="rue-flaque">
          <stop offset="0" stopColor="#FFB45A" stopOpacity="0.5" />
          <stop offset="0.6" stopColor="#FF9A3C" stopOpacity="0.15" />
          <stop offset="1" stopColor="#FF9A3C" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rue-halo">
          <stop offset="0" stopColor="#FFE2B0" stopOpacity="0.9" />
          <stop offset="0.3" stopColor="#FFB45A" stopOpacity="0.35" />
          <stop offset="1" stopColor="#FF9A3C" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rue-brume" cx={VP[0]} cy={VP[1]} r="900" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#05060a" stopOpacity="1" />
          <stop offset="0.15" stopColor="#05060a" stopOpacity="0.75" />
          <stop offset="0.5" stopColor="#05060a" stopOpacity="0.2" />
          <stop offset="1" stopColor="#05060a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="1080" height="1920" fill="url(#rue-ciel)" />
      {/* lune */}
      <circle cx="830" cy="230" r="120" fill="#cfd6ff" opacity="0.06" />
      <circle cx="830" cy="230" r="46" fill="#dfe3f5" opacity="0.55" />
      {/* immeuble du fond du parc */}
      {parcVisible && <polygon points={poly([[1700, TOIT, cz(PARC[0])], [1700, TOIT, cz(PARC[1])], [1700, SOL, cz(PARC[1])], [1700, SOL, cz(PARC[0])]])} fill="#1d1a22" />}
      {facades(BLOCS_G, 'G')}
      {facades(BLOCS_D, 'D')}
      {/* sol */}
      <polygon points={poly([[ROUTE_G, ROUTE, zMin], [BORDURE, ROUTE, zMin], [BORDURE, ROUTE, zMax], [ROUTE_G, ROUTE, zMax]])} fill="#25262b" />
      {tirets}
      <polygon points={poly([[BORDURE, SOL, zMin], [FACADE_D, SOL, zMin], [FACADE_D, SOL, zMax], [BORDURE, SOL, zMax]])} fill="#38363c" />
      <polygon points={poly([[FACADE_G, SOL, zMin], [ROUTE_G, SOL, zMin], [ROUTE_G, SOL, zMax], [FACADE_G, SOL, zMax]])} fill="#38363c" />
      <polygon points={poly([[BORDURE, SOL, zMin], [BORDURE, SOL, zMax], [BORDURE, ROUTE, zMax], [BORDURE, ROUTE, zMin]])} fill="#3d3c40" />
      <polygon points={poly([[ROUTE_G, SOL, zMin], [ROUTE_G, SOL, zMax], [ROUTE_G, ROUTE, zMax], [ROUTE_G, ROUTE, zMin]])} fill="#151518" />
      {parcVisible && <polygon points={poly([[FACADE_D, SOL, cz(PARC[0])], [1700, SOL, cz(PARC[0])], [1700, SOL, cz(PARC[1])], [FACADE_D, SOL, cz(PARC[1])]])} fill="#14201a" />}
      {flaques}
    </g>
  );

  // ----- Éléments triables par profondeur -----
  const items = [];

  LAMPES.filter((l) => visible(l.z) && l.z < zMax).forEach((l, i) => {
    const v = lampe(l);
    const s = scale(l.z);
    const pied = proj(l.x, SOL, l.z);
    const haut = proj(l.x, LIGNE_Y - 40, l.z);
    const tete = proj(l.tete, LIGNE_Y, l.z);
    items.push({
      z: l.z,
      el: (
        <g key={`l${l.cote}${l.z}`}>
          {line(pied, haut, Math.max(2, 26 * s), '#15161a', 'p')}
          {line(haut, tete, Math.max(2, 18 * s), '#15161a', 'b')}
          <ellipse cx={tete[0]} cy={tete[1] + 6 * s} rx={60 * s} ry={14 * s} fill={v > 0.05 ? '#FFE9C2' : '#2a2a2e'} opacity={0.3 + 0.7 * v} />
          {v > 0.02 && <ellipse cx={tete[0]} cy={tete[1] + 30 * s} rx={420 * s} ry={300 * s} fill="url(#rue-halo)" opacity={v} />}
        </g>
      ),
    });
  });

  // Abribus
  if (dans(ABRIBUS[0], ABRIBUS[1] + 0.1)) {
    const [z0, z1] = ABRIBUS;
    const pc = proj(350, -10, z1);
    const ps = scale(z1);
    items.push({
      z: z1,
      el: (
        <g key="panneau">
          <polygon points={poly([[210, -320, z1], [490, -320, z1], [490, 320, z1], [210, 320, z1]])} fill="#1e2a36" />
          <polygon points={poly([[225, -300, z1], [475, -300, z1], [475, 300, z1], [225, 300, z1]])} fill="#dfe9f2" opacity={0.15 + 0.75 * panneau} />
          <g transform={`translate(${pc[0]} ${pc[1]}) scale(${ps})`} fontFamily="'DejaVu Sans', Arial, sans-serif" textAnchor="middle" opacity={0.25 + 0.75 * panneau}>
            <rect x="-112" y="-270" width="224" height="62" fill="#1f5c45" />
            <text y="-226" fontSize="38" fontWeight="900" fill="#fff">LIGNE 42</text>
            <text y="-160" fontSize="22" fill="#2a2f36" fontWeight="700">DERNIER BUS</text>
            <text y="-118" fontSize="40" fill="#2a2f36" fontWeight="900">00:47</text>
            <line x1="-62" y1="-131" x2="62" y2="-131" stroke="#c4161c" strokeWidth="6" />
            <rect x="-104" y="-80" width="208" height="170" rx="10" fill="#111" />
            <text y="-42" fontSize="22" fill="#FFB000" fontWeight="700">PROCHAIN</text>
            <text y="48" fontSize="76" fill="#FFB000" fontWeight="900" fontFamily="'DejaVu Sans Mono', monospace">05:42</text>
            {[...Array(5)].map((_, k) => (
              <rect key={k} x="-90" y={128 + k * 26} width={150 - k * 18} height="10" rx="5" fill="#9aa4ad" />
            ))}
          </g>
        </g>
      ),
    });
    items.push({
      z: z0,
      el: (
        <g key="abri">
          <polygon points={poly([[490, -330, z0], [490, -330, z1], [490, SOL, z1], [490, SOL, z0]])} fill="#8fb6d6" opacity="0.13" />
          <polygon points={poly([[180, -330, z0], [500, -330, z0], [500, -330, z1], [180, -330, z1]])} fill="#141418" />
          <polygon points={poly([[180, -360, z0], [500, -360, z0], [500, -330, z0], [180, -330, z0]])} fill="#2a2d33" />
          {line(proj(190, -330, z0), proj(190, SOL, z0), Math.max(2, 10 * scale(z0)), '#3a3d44', 'm1')}
          {line(proj(490, -330, z0), proj(490, SOL, z0), Math.max(2, 10 * scale(z0)), '#3a3d44', 'm2')}
          {/* banc */}
          <polygon points={poly([[380, 250, z0 + 0.2], [470, 250, z0 + 0.2], [470, 250, z1 - 0.2], [380, 250, z1 - 0.2]])} fill="#3b3f46" />
        </g>
      ),
    });
    // poteau d'arrêt
    const pz = z0 - 0.15;
    if (visible(pz)) {
      const s = scale(pz);
      const t = proj(120, -620, pz);
      items.push({
        z: pz,
        el: (
          <g key="arret">
            {line(proj(120, SOL, pz), proj(120, -560, pz), Math.max(2, 16 * s), '#2a2c31', 'pa')}
            <circle cx={t[0]} cy={t[1]} r={95 * s} fill="#1f5c45" stroke="#e8e8e8" strokeWidth={8 * s} />
            <text x={t[0]} y={t[1] + 22 * s} fontSize={62 * s} fontWeight="900" fill="#fff" textAnchor="middle" fontFamily="'DejaVu Sans', Arial, sans-serif">BUS</text>
          </g>
        ),
      });
    }
  }

  // Parc : grille, arbres, balançoire
  if (parcVisible) {
    for (let z = PARC[0]; z <= PARC[1]; z += 0.35) {
      if (!visible(z)) continue;
      const s = scale(z);
      items.push({z, el: <g key={`g${z}`}>{line(proj(530, SOL, z), proj(530, 160, z), Math.max(1, 9 * s), '#101114', 'gp')}{z + 0.35 <= PARC[1] && line(proj(530, 200, z), proj(530, 200, z + 0.35), Math.max(1, 7 * s), '#101114', 'gr')}</g>});
    }
    [[1300, 7.4, 1.1], [900, 5.2, 0.9]].forEach(([x, z, t], k) => {
      if (!visible(z)) return;
      const s = scale(z);
      const [px, py] = proj(x, SOL, z);
      items.push({
        z,
        el: (
          <g key={`arbre${k}`} transform={`translate(${px} ${py}) scale(${s * t})`} fill="#090c0b">
            <rect x="-30" y="-700" width="60" height="700" />
            <circle cx="0" cy="-950" r="330" />
            <circle cx="-220" cy="-800" r="220" />
            <circle cx="230" cy="-820" r="240" />
          </g>
        ),
      });
    });
    const zb = 8.0;
    if (visible(zb)) {
      const s = scale(zb);
      const H = -420;
      const chaines = [[860, balancoire[0]], [1040, balancoire[1]]].map(([hx, a], k) => {
        const r = (a * Math.PI) / 180;
        const L = 600;
        const sx = hx + Math.sin(r) * L;
        const sy = H + Math.cos(r) * L;
        return (
          <g key={k}>
            {line(proj(hx - 55, H, zb), proj(sx - 55, sy, zb), Math.max(1, 5 * s), '#5d6066', 'c1')}
            {line(proj(hx + 55, H, zb), proj(sx + 55, sy, zb), Math.max(1, 5 * s), '#5d6066', 'c2')}
            {line(proj(sx - 70, sy, zb), proj(sx + 70, sy, zb), Math.max(2, 22 * s), '#3a2a22', 's')}
          </g>
        );
      });
      items.push({
        z: zb,
        el: (
          <g key="balancoire">
            {line(proj(740, SOL, zb), proj(760, H, zb), Math.max(2, 18 * s), '#2b2e33', 'b1')}
            {line(proj(1160, SOL, zb), proj(1140, H, zb), Math.max(2, 18 * s), '#2b2e33', 'b2')}
            {line(proj(740, H, zb), proj(1160, H, zb), Math.max(2, 18 * s), '#2b2e33', 'b3')}
            {chaines}
          </g>
        ),
      });
    }
  }

  const brume = <rect key="brume" x="0" y="0" width="1080" height="1920" fill="url(#rue-brume)" />;
  return {fond, items, brume};
};

// ===== Le bus =====
// zp = face la plus proche de la caméra. sens = 'arriere' (on voit l'arrière) ou 'avant'.
const BX0 = -990;
const BX1 = -130;
const BH = -700;
const BB = 380;
const BL = 4.4;

export const bus = (cam, f, {zp, sens = 'avant', numero = '42', interieur = '#ffd79a', phares = 1, porte = 0, chauffeur = null, led = 1}) => {
  const {proj, poly, scale, visible} = cam;
  if (!visible(zp) && !visible(zp + BL)) return null;
  const z0 = Math.max(zp, cam.z + 0.13);
  const z1 = zp + BL;
  const s = scale(zp);
  const avant = sens === 'avant';
  const zPorte = avant ? [zp + 0.2, zp + 0.75] : [zp + 1.9, zp + 2.45];

  // côté droit (face au trottoir)
  const fenetres = [];
  for (let z = zp + (avant ? 0.9 : 0.25); z < z1 - 0.3; z += 0.85) {
    if (z + 0.7 < z0) continue;
    fenetres.push(<polygon key={z} points={poly([[BX1, -600, Math.max(z, z0)], [BX1, -600, z + 0.7], [BX1, -180, z + 0.7], [BX1, -180, Math.max(z, z0)]])} fill={interieur} opacity="0.55" />);
  }
  const roues = [avant ? zp + 0.9 : zp + 0.9, avant ? zp + 3.3 : zp + 3.3].filter((z) => visible(z)).map((z) => (
    <polygon key={z} points={poly([...Array(14)].map((_, i) => [BX1 + 5, 380 + Math.cos((i / 14) * 6.283) * 100, z + Math.sin((i / 14) * 6.283) * 0.1]))} fill="#0b0b0d" />
  ));
  const ouvert = Math.min(1, porte);
  const pz0 = zPorte[0];
  const pz1 = zPorte[1];
  const pm = (pz0 + pz1) / 2;
  const cote =
    cam.x > BX1 ? (
      <g key="cote">
        <polygon points={poly([[BX1, BH, z0], [BX1, BH, z1], [BX1, BB, z1], [BX1, BB, z0]])} fill="#5d6a62" />
        <polygon points={poly([[BX1, 150, z0], [BX1, 150, z1], [BX1, 260, z1], [BX1, 260, z0]])} fill="#2f5d4a" />
        {fenetres}
        {/* porte */}
        {visible(pz0) && (
          <g>
            <polygon points={poly([[BX1, -620, pz0], [BX1, -620, pz1], [BX1, 360, pz1], [BX1, 360, pz0]])} fill={interieur} opacity={0.25 + 0.75 * ouvert} />
            <polygon points={poly([[BX1 + 2, -610, pz0], [BX1 + 2, -610, pm - (pm - pz0) * ouvert], [BX1 + 2, 360, pm - (pm - pz0) * ouvert], [BX1 + 2, 360, pz0]])} fill="#36423c" stroke="#1a201d" strokeWidth="3" />
            <polygon points={poly([[BX1 + 2, -610, pm + (pz1 - pm) * ouvert], [BX1 + 2, -610, pz1], [BX1 + 2, 360, pz1], [BX1 + 2, 360, pm + (pz1 - pm) * ouvert]])} fill="#36423c" stroke="#1a201d" strokeWidth="3" />
          </g>
        )}
        {roues}
      </g>
    ) : null;

  // face proche
  const c = (x, y) => proj(x, y, zp);
  const face = visible(zp) ? (
    avant ? (
      <g key="avant">
        {/* intérieur + chauffeur derrière le pare-brise */}
        <polygon points={poly([[BX0 + 40, -620, zp + 0.9], [BX1 - 40, -620, zp + 0.9], [BX1 - 40, -60, zp + 0.9], [BX0 + 40, -60, zp + 0.9]])} fill={interieur} opacity="0.75" />
        {chauffeur && chauffeur(zp + 0.45)}
        <path
          fillRule="evenodd"
          fill="#66746b"
          d={`M${c(BX0, BH)} L${c(BX1, BH)} L${c(BX1, BB)} L${c(BX0, BB)} Z M${c(BX0 + 60, -610)} L${c(BX1 - 60, -610)} L${c(BX1 - 60, -80)} L${c(BX0 + 60, -80)} Z`}
        />
        <polygon points={poly([[BX0 + 60, -610, zp], [BX1 - 60, -610, zp], [BX1 - 60, -80, zp], [BX0 + 60, -80, zp]])} fill="#bfffe0" opacity="0.07" />
        <polygon points={poly([[BX0 + 200, -610, zp], [BX0 + 330, -610, zp], [BX0 + 120, -80, zp], [BX0 + 60, -80, zp], [BX0 + 60, -200, zp]])} fill="#fff" opacity="0.06" />
        {/* girouette */}
        <polygon points={poly([[BX0 + 120, -690, zp], [BX1 - 120, -690, zp], [BX1 - 120, -625, zp], [BX0 + 120, -625, zp]])} fill="#0b0b0b" />
        <text x={c(-560, -640)[0]} y={c(-560, -640)[1]} fontSize={56 * s} fill="#ff8a00" opacity={led} fontWeight="900" textAnchor="middle" fontFamily="'DejaVu Sans Mono', monospace">
          {numero}
        </text>
        <polygon points={poly([[BX0, 150, zp], [BX1, 150, zp], [BX1, 260, zp], [BX0, 260, zp]])} fill="#2f5d4a" />
        {/* phares */}
        {[BX0 + 110, BX1 - 110].map((x) => {
          const p = c(x, 300);
          return (
            <g key={x}>
              <ellipse cx={p[0]} cy={p[1]} rx={55 * s} ry={30 * s} fill="#fffbe8" opacity={0.3 + 0.7 * phares} />
              {phares > 0 && <circle cx={p[0]} cy={p[1]} r={Math.min(900, 380 * s) * phares} fill="url(#bus-glare)" />}
            </g>
          );
        })}
      </g>
    ) : (
      <g key="arriere">
        <polygon points={poly([[BX0, BH, zp], [BX1, BH, zp], [BX1, BB, zp], [BX0, BB, zp]])} fill="#5a665e" />
        <polygon points={poly([[BX0 + 80, -600, zp], [BX1 - 80, -600, zp], [BX1 - 80, -260, zp], [BX0 + 80, -260, zp]])} fill={interieur} opacity="0.5" />
        <polygon points={poly([[BX0 + 220, -690, zp], [BX1 - 220, -690, zp], [BX1 - 220, -630, zp], [BX0 + 220, -630, zp]])} fill="#0b0b0b" />
        <text x={c(-560, -643)[0]} y={c(-560, -643)[1]} fontSize={52 * s} fill="#ff8a00" fontWeight="900" textAnchor="middle" fontFamily="'DejaVu Sans Mono', monospace">
          {numero}
        </text>
        <polygon points={poly([[BX0, 150, zp], [BX1, 150, zp], [BX1, 260, zp], [BX0, 260, zp]])} fill="#2f5d4a" />
        {[BX0 + 90, BX1 - 90].map((x) => {
          const p = c(x, 60);
          return (
            <g key={x}>
              <rect x={p[0] - 35 * s} y={p[1] - 70 * s} width={70 * s} height={140 * s} rx={12 * s} fill="#ff2a2a" />
              <circle cx={p[0]} cy={p[1]} r={260 * s} fill="url(#bus-rouge)" />
            </g>
          );
        })}
        <rect x={c(-640, 300)[0]} y={c(-640, 300)[1]} width={160 * s} height={50 * s} fill="#ddd" />
      </g>
    )
  ) : null;

  return {
    z: zp,
    el: (
      <g key="bus">
        <defs>
          <radialGradient id="bus-glare">
            <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
            <stop offset="0.2" stopColor="#fffbe0" stopOpacity="0.5" />
            <stop offset="1" stopColor="#fffbe0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="bus-rouge">
            <stop offset="0" stopColor="#ff3030" stopOpacity="0.6" />
            <stop offset="1" stopColor="#ff0000" stopOpacity="0" />
          </radialGradient>
        </defs>
        {cote}
        {face}
      </g>
    ),
  };
};
