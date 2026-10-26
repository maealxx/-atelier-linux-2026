import {AbsoluteFill, Easing, interpolate, random, Series, spring, staticFile, useCurrentFrame} from 'remotion';
import {Choix} from './Livreur';
import {Telephone} from './Maison';
import {surveillant3D} from './Monstre3D';
import {camFace, montage, Plan, punch} from './montage';
import {clamp, Finition, makeCam, marche, orbite, Perso} from './moteur';
import {SOL} from './Rue';
import {escalators, FOSSE, GRILLE_Z, HAUT, HORAIRE, HP, portesDe, quai, rame, solEsc, ST, voitures, wagon} from './Gare';
import PLANS from './dernier-train/plans.json';
import timeline from './dernier-train/timeline.json';

// « Le dernier train » : tu rates le dernier métro, la station se ferme sur toi, quelque chose marche dans le tunnel,
// et un train sans numéro arrive, rempli de passagers qui ont tous ton visage.
const {decoupe, repere, SCENES} = montage(timeline, PLANS);
export const DUREE_DERNIER_TRAIN = SCENES.reduce((t, [, d]) => t + d, 0);
const START = {};
SCENES.reduce((t, [nom, d]) => {
  START[nom] = t;
  return t + d;
}, 0);
const R_ = (nom, mot, def) => START[nom] + repere(nom, mot, def);

const ease = {...clamp, easing: Easing.inOut(Easing.sin)};
const deg = (r) => (r * 180) / Math.PI;
const vise = (p, c, extra = {}) => {
  const dx = c[0] - p[0];
  const dy = c[1] - p[1];
  const dz = (c[2] - p[2]) * 1000;
  return {x: p[0], y: p[1], z: p[2], yaw: deg(Math.atan2(dx, dz)), pitch: deg(Math.atan2(dy, Math.hypot(dx, dz))), ...extra};
};
const lisse = (t, d) => Easing.inOut(Easing.sin)(Math.min(1, t / Math.max(1, d)));
const doux = (t) => punch(t, 0.04);
const tremble = (f, k, cle) => k * (random(`${cle}${f}`) - 0.5);
const FROID = [0.86, 0.96, 1.1];
const CHAUD = [1.06, 0.92, 0.8];
const VERT = [0.8, 1.06, 0.88];

// ----- les néons : tout allumé, puis ils s'éteignent un par un depuis le fond (scène « noir »), sauf ceux de ton quai -----
const GARDE = [5, 7];
const tOff = (n) => START.noir + 30 + ((21 - Math.abs(n - 6)) / 18) * 100;
const neonsFg = (fg) => (n) => {
  if (GARDE.includes(n)) {
    // pendant l'annonce, les néons de ton quai grésillent
    if (fg > R_('annonce', 'prénom', 112) - 6 && fg < R_('annonce', 'puis', 127) + 4) return random(`gq${n}${Math.floor(fg / 2)}`) > 0.45 ? 1 : 0.15;
    if (fg > START.pas && fg < START.pas + 30) return random(`gp${n}${Math.floor(fg / 2)}`) > 0.6 ? 1 : 0.1;
    return 1;
  }
  const t = fg - tOff(n);
  if (t < 0) return 1;
  if (t < 7) return random(`off${n}${fg}`) > 0.5 ? 1 : 0.1;
  return 0;
};
const decorQuai = (cam, fg, o = {}) => quai(cam, fg, {neon: neonsFg(fg), ...o});
const lumPerso = (decor, z) => 0.32 + 0.68 * (decor.L ? decor.L(z) : 1);

// ----- la chose qui marche dans le tunnel (vraie 3D), en ombre floue, éclairée en rouge par le signal -----
const pasChose = (f, v = 0.16, amp = 1) => {
  const s = Math.sin(f * v);
  return {
    genouG: [-45, -235 - Math.max(0, s) * 70 * amp, 8 + s * 90 * amp],
    piedG: [-48, -Math.max(0, s) * 100 * amp, s * 170 * amp],
    genouD: [45, -235 - Math.max(0, -s) * 70 * amp, 8 - s * 90 * amp],
    piedD: [48, -Math.max(0, -s) * 100 * amp, -s * 170 * amp],
    coudeG: [-170, -520, 10 - s * 40 * amp],
    coudeD: [170, -520, 10 + s * 40 * amp],
    mainG: [-175, -160, 30 - s * 90 * amp],
    mainD: [175, -160, 30 + s * 90 * amp],
  };
};
const halo = (cam, x, y, z, r, op) => {
  if (!cam.visible(z, x, y) || op <= 0.01) return null;
  const [px, py] = cam.proj(x, y, z);
  return <circle cx={px} cy={py} r={r * cam.scale(z, x, y)} fill="url(#ga-rouge)" opacity={Math.min(1, op)} />;
};
const chose = (cam, fg, {x = 590, z, y = FOSSE - 30, angle = 0, amp = 1, penche = 14, id = 'ch', nuit = 0.7, flou = 1.5, rouge = 1}) => {
  const res = surveillant3D(cam, {x, z, y, angle, f: fg, echelle: 1.0, cou: 70, penche, bras: pasChose(fg, 0.16, amp)});
  const k = nuit;
  return {
    z: res.z,
    x,
    y: y - 500,
    el: (
      <g key={id}>
        <defs>
          <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
            <feColorMatrix type="matrix" values={`${k + 0.25 * rouge} 0 0 0 ${0.06 * rouge}  0 ${k * 0.8} 0 0 0  0 0 ${k * 0.8} 0 0  0 0 0 1 0`} />
            <feGaussianBlur stdDeviation={flou} />
          </filter>
        </defs>
        {halo(cam, x, y - 560, res.z + 0.15, 1500, 0.75 * rouge)}
        <g filter={`url(#${id})`}>{res.el}</g>
      </g>
    ),
  };
};
// où est la chose (Z) : elle avance dans le tunnel, s'arrête, puis sort sur le quai dans le noir
const zChose = (fg) => {
  if (fg < R_('rails', 'quelque', 91)) return null;
  if (fg < START.pilier) return interpolate(fg, [R_('rails', 'quelque', 91), START.pilier], [-14, -9], clamp);
  if (fg < START.message) return interpolate(fg, [START.pilier, R_('pilier', 'sarrêtent', 126)], [-9, -4], clamp);
  return -4;
};
// sur le quai (scènes « pas » et « dilemme ») : elle marche vers toi dans la partie éteinte
const zChoseQuai = (fg) => interpolate(fg, [START.pas, START.pas + 60, START.dilemme], [0.8, 2.2, 4.2], clamp);
const X_CHOSE_QUAI = -720;

// ----- les passagers : des clones du bonhomme (même visage, mêmes cheveux), habits différents -----
const HABITS = [
  {haut: '#3a4a6a', hautO: '#2e3c58', pant: '#22222a'},
  {haut: '#6a3a2a', hautO: '#58301f', pant: '#2f3b4c'},
  {haut: '#2a5a4a', hautO: '#204a3c', pant: '#1e1e26'},
  {haut: '#5a2a5a', hautO: '#4a204a', pant: '#2a2a2e'},
  {haut: '#7a6a4a', hautO: '#64563a', pant: '#33384a'},
  {haut: '#FF6B5B', hautO: '#E2554A', pant: '#2F4B7C'},
];
const CLONES = [
  [420, -1.25], [640, -0.85], [330, -0.25], [560, 0.15], [760, 0.55], [430, 0.75], [620, 1.25], [880, -0.35], [300, 1.35], [800, 1.45],
].map(([x, dz], k) => ({x, dz, habit: HABITS[k % HABITS.length]}));
const passagers = (cz, fg, {tourne, sourire = 0, idp = 'cl'}) =>
  CLONES.map((c, k) => {
    const vu = fg >= tourne + (k % 3);
    return {
      x: c.x,
      z: cz + c.dz,
      id: `${idp}${k}`,
      dos: !vu,
      couleurs: c.habit,
      eyes: vu ? 1.12 : 1,
      pupilX: 0,
      pupilY: 0,
      smile: vu ? sourire : 0,
      breath: 0,
      epauleD: k % 2 ? -150 : 0,
      coudeD: k % 2 ? -20 : 0,
    };
  });

// ----- le train fantôme (il arrive du tunnel Z−, s'arrête avant l'autre bout) -----
const TETE_FANTOME = 22;
const teteFantome = (fg) => {
  const a = R_('phares', 'un', 55);
  const b = R_('phares', 'sarrête', 147) + 6;
  if (fg < a) return -16;
  return -16 + (TETE_FANTOME + 16) * Easing.out(Easing.cubic)(Math.min(1, (fg - a) / (b - a)));
};
const VOIT = voitures(TETE_FANTOME)[3]; // la dernière voiture, celle qui s'arrête devant toi
const PORTE = portesDe(VOIT)[0]; // sa première porte
const ZP = (PORTE[0] + PORTE[1]) / 2;
// rendu de l'intérieur de la voiture, vu de l'extérieur (pour la rame, par les ouvertures)
const dedansRendu = (cam, fg, opts) => {
  const w = wagon(cam, fg, {cz: VOIT.c, ...opts});
  const items = w.items.filter((o) => o && o.el).sort((a, b) => cam.profondeur(b.z, b.x ?? cam.x, b.y ?? cam.y) - cam.profondeur(a.z, a.x ?? cam.x, a.y ?? cam.y));
  return (
    <g>
      {w.fond}
      {items.map((o, k) => <g key={k}>{o.el}</g>)}
    </g>
  );
};

// ----- gros plan : les mains qui tirent sur la grille (2D) -----
const MainsGrille = ({f, t, d, tire}) => {
  const k = lisse(t, d);
  const sx = tremble(f, 18 * tire, 'mgx');
  const sy = tremble(f, 10 * tire, 'mgy') + Math.sin(f / 3) * 14 * tire;
  const s = 1.15 + 0.12 * k;
  const main = (x, y, r) => (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <rect x="-95" y="-20" width="190" height="230" rx="80" fill="#E3A984" />
      {[0, 1, 2, 3].map((j) => <rect key={j} x={-92 + j * 48} y={-120 + Math.abs(j - 1.5) * 12} width="44" height="160" rx="22" fill="#F2C3A0" stroke="#d0946e" strokeWidth="4" />)}
      <rect x="-150" y="20" width="80" height="44" rx="22" fill="#F2C3A0" transform="rotate(-35 -110 42)" />
      <rect x="-80" y="200" width="160" height="300" fill="#FF6B5B" />
    </g>
  );
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <defs>
          <radialGradient id="mg-hall" cx="50%" cy="35%" r="70%">
            <stop offset="0" stopColor="#ff9a3a" />
            <stop offset="0.5" stopColor="#7a3a10" />
            <stop offset="1" stopColor="#140802" />
          </radialGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#mg-hall)" />
        {/* au loin dans le hall : la porte vers la rue, et le panneau vert */}
        <rect x="380" y="380" width="320" height="420" fill="#2a1a10" />
        <rect x="400" y="400" width="280" height="380" fill="#ffc87a" opacity="0.35" />
        <rect x="360" y="290" width="360" height="70" rx="10" fill="#0a7a3a" />
        <g transform={`translate(${540 + sx} ${960 + sy}) scale(${s}) translate(-540 -960)`}>
          {[...Array(22)].map((_, j) => (
            <g key={j}>
              <line x1={-900 + j * 150} y1="-100" x2={-900 + j * 150 + 1200} y2="2100" stroke="#5a5e64" strokeWidth="26" />
              <line x1={-900 + j * 150 + 1200} y1="-100" x2={-900 + j * 150} y2="2100" stroke="#7a7e84" strokeWidth="26" />
            </g>
          ))}
          {main(390, 1050, -8)}
          {main(700, 1010, 10)}
        </g>
        <rect width="1080" height="1920" fill="#000" opacity="0.15" />
        <Finition f={f} id="mgf" />
      </svg>
    </AbsoluteFill>
  );
};

// ===================== les scènes =====================
const scene = (nom, rendu) => {
  const C = () => {
    const f = useCurrentFrame();
    const {i, t, d, bornes} = decoupe(nom, f);
    return rendu({f, fg: START[nom] + f, i, t, d, bornes, R: (mot, def) => repere(nom, mot, def)});
  };
  C.displayName = nom;
  return C;
};

// 1. Imagine, tu rates le dernier train. L'escalator, le saut, les portes qui se ferment devant ta main. Il part sans toi.
const TETE_DEPART = 24;
const PORTE_RATEE = portesDe(voitures(TETE_DEPART)[2])[0];
const ZR = (PORTE_RATEE[0] + PORTE_RATEE[1]) / 2;
const Portes = scene('portes', ({f, fg, i, t, d, bornes, R}) => {
  const k = lisse(t, d);
  if (i < 2) {
    // l'escalator : il descend en courant (vers −Z), couloir de lampadaires qui défilent
    const zp = i === 0 ? interpolate(t, [0, d], [9.0, 5.2]) : interpolate(t, [0, 34, 50, d], [4.6, 1.9, 0.9, 0.2], clamp);
    const saut = i === 1 ? interpolate(f, [R('sautes', 108) - 6, R('sautes', 108) + 4, R('sautes', 108) + 16], [0, -260, 0], clamp) : 0;
    const m = marche(fg, 0.7, 1.25);
    const P = {x: 580, z: zp, y: solEsc(zp)};
    const cams = [
      () => vise([560 + 60 * Math.sin(fg / 20), solEsc(zp + 1.7) - 820, zp + 1.7], [580, solEsc(zp - 1.6) - 300, zp - 1.6]),
      () => vise([420 - 100 * k, SOL - 220, -0.9 - 0.3 * k], [580, solEsc(zp) - 420, zp]),
    ];
    const cam = makeCam(cams[i]());
    const decor = escalators(cam, fg, {marche: 1});
    const items = [{z: P.z, x: P.x, y: P.y, el: <Perso cam={cam} id={`po${i}`} x={P.x} z={P.z} y={P.y} dos={i === 0} lum={0.95} teinte={CHAUD} lift={m.bob * 2.2 + saut} legG={saut < -30 ? 0.9 : m.legG} legD={saut < -30 ? 0.6 : m.legD}
      epauleG={14 + m.bras * 3} coudeG={80} epauleD={-14 + m.bras * 3} coudeD={-80} worry={1} eyes={1.3} sweat={1} scream={0.15} />}];
    return <Plan f={fg} cam={cam} decor={decor} items={items} noir={0.05} zoom={doux(t)} roll={[2, -1.5][i]} />;
  }
  if (i === 2) {
    // le quai : il sprinte vers la porte, les portes se ferment, sa main claque contre la vitre
    const ferme = interpolate(f, [R('portes', 165) - 4, R('ferment', 176) + 6], [1, 0], {...clamp, easing: Easing.inOut(Easing.cubic)});
    const xp = interpolate(f, [bornes[2], R('main', 194) - 8], [-1150, -230], {...clamp, easing: Easing.out(Easing.quad)});
    const court = f < R('main', 194) - 8;
    const m = marche(fg, 0.7, court ? 1.2 : 0);
    const tape = interpolate(f, [R('main', 194) - 10, R('main', 194) - 2], [0, 1], clamp);
    const cam = makeCam(vise([-1500 + 160 * k, -330, ZR - 0.55], [60, -230, ZR + 0.15]));
    const decor = decorQuai(cam, fg);
    const items = [...rame(cam, fg, {tete: TETE_DEPART, portes: ferme, lumiere: 1})];
    items.push({z: ZR, x: xp, el: <Perso cam={cam} id="po2" x={xp} z={ZR} dos lum={0.95} teinte={FROID} lift={m.bob * 2} legG={m.legG} legD={m.legD}
      epauleG={14 + m.bras * 3} coudeG={80} epauleD={-14 + m.bras * 3 - 60 * tape} coudeD={-80 + 20 * tape} shiver={tape > 0.5 ? tremble(fg, 4, 'po') : 0} />});
    return <Plan f={fg} cam={cam} decor={decor} items={items} noir={0.04} zoom={doux(t)} roll={1.5} />;
  }
  // il part sans toi : feux rouges qui s'éloignent dans le tunnel
  const tete = TETE_DEPART + 1.5 + 0.06 * t + 0.0055 * t * t;
  const cam = makeCam(vise([-800 + 60 * k, -330, ZR - 3.6], [200, -150, 24]));
  const decor = decorQuai(cam, fg);
  const items = [...rame(cam, fg, {tete, portes: 0, lumiere: 1, feux: 1})];
  items.push({z: ZR, x: -300, el: <Perso cam={cam} id="po3" x={-300} z={ZR} dos lum={0.9} teinte={FROID} epauleG={35} coudeG={130} epauleD={-35} coudeD={-130} breath={Math.sin(fg / 4) * 5} />});
  return <Plan f={fg} cam={cam} decor={decor} items={items} noir={0.05} zoom={doux(t)} roll={-1.5} />;
});

// 2. Pas de réseau. Le panneau : prochain train, 05:40.
const PS = {x: -260, z: 6.7}; // sous le panneau horaire
const Reseau = scene('reseau', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const H = HORAIRE;
  if (i === 0) {
    const cam = makeCam(vise([-700, -300, 3.5], [300, -100, 16]));
    const decor = decorQuai(cam, fg);
    const monte = interpolate(t, [0, 12], [300, 0], {...clamp, easing: Easing.out(Easing.cubic)});
    return (
      <Plan f={fg} cam={cam} decor={decor} items={[]} noir={0.05} zoom={1.02} roll={0}
        dessus={<g><rect width="1080" height="1920" fill="#000" opacity="0.45" /><Telephone f={f} verrouille heure="00:52" date="dimanche 26 octobre" barres={0} echelle={1.15 + 0.1 * k} y={1000 + monte} /></g>} />
    );
  }
  const cams = [
    null,
    () => vise([-40 - 60 * k, 280, 9.7 - 0.2 * k], [PS.x, -420, PS.z]),
    () => vise([PS.x + 30, -330, PS.z + 0.2 + 0.35 * k], [(H.x0 + H.x1) / 2, (H.y0 + H.y1) / 2, H.z]),
  ];
  const cam = makeCam(cams[i]());
  const decor = decorQuai(cam, fg);
  const items = [];
  if (i === 1) items.push({z: PS.z, x: PS.x, el: <Perso cam={cam} id="re1" x={PS.x} z={PS.z} lum={0.95} teinte={[1.12, 0.9, 0.78]} worry={1} eyes={1.2} pupilY={-10} breath={Math.sin(fg / 5) * 4} />});
  return <Plan f={fg} cam={cam} decor={decor} items={items} noir={0.05} zoom={doux(t)} roll={[0, -2, 1][i]} />;
});

// 3. Tu remontes vers la sortie. La grille descend toute seule. Tu tires. Fermée.
const Grille = scene('grille', ({f, fg, i, t, d, bornes, R}) => {
  const k = lisse(t, d);
  const g = interpolate(f, [R('là', 56), R('fermée', 180)], [0, 1], {...clamp, easing: Easing.inOut(Easing.quad)});
  if (i === 2) return <MainsGrille f={fg} t={t} d={d} tire={interpolate(f, [R('tires', 135) - 4, R('tires', 135) + 4], [0.3, 1], clamp)} />;
  const zp = i === 0 ? interpolate(t, [0, d], [2.2, 4.4]) : i === 1 ? interpolate(t, [0, d], [6.0, 10.3]) : 11.15;
  const court = i < 2;
  const m = marche(fg, 0.62, court ? 1.1 : 0);
  const P = {x: 580, z: zp, y: solEsc(zp)};
  const cams = [
    () => vise([520, solEsc(zp - 1.5) - 300, zp - 1.5], [580, solEsc(zp + 3) - 650, zp + 3]),
    () => vise([150 + 120 * k, HAUT - 900, 13.4 - 0.2 * k], [560, solEsc(7.5) - 300, 7.5]),
    null,
    () => vise([350, HAUT - 420, 9.3], [480, HAUT - 900, GRILLE_Z]),
  ];
  const cam = makeCam(cams[i]());
  const decor = escalators(cam, fg, {grille: g, marche: 0});
  const bras = i === 3 ? {epauleG: 150, coudeG: 20, epauleD: -150, coudeD: -20} : {epauleG: 14 + m.bras * 3, coudeG: 80, epauleD: -14 + m.bras * 3, coudeD: -80};
  const items = [{z: P.z, x: P.x, y: P.y, el: <Perso cam={cam} id={`gr${i}`} x={i === 3 ? 480 : P.x} z={P.z} y={P.y} dos={i !== 1} lum={0.95} teinte={CHAUD} lift={m.bob * 2} legG={m.legG} legD={m.legD}
    worry={1} eyes={1.35} sweat={1} scream={i === 1 ? 0.35 : 0} shiver={i === 3 ? tremble(fg, 5, 'gr') : 0} {...bras} />}];
  return <Plan f={fg} cam={cam} decor={decor} items={items} noir={0.06} zoom={doux(t)} roll={[-2, 2, 0, -1][i]} />;
});

// 4. Derrière toi, les néons s'éteignent un par un. Il ne reste que la lumière de ton quai.
const PQ = {x: -420, z: 6.1}; // ton spot sur le quai
const Noir = scene('noir', ({f, fg, i, t, d}) => {
  const k = lisse(t, d);
  const cams = [
    () => vise([-640 + 40 * k, -300, 3.0 + 0.3 * k], [-300, -330, 14]),
    () => vise([-300, -1080, 4.2 + 0.5 * k], [200, 200, 15]),
    () => vise([-150 - 80 * k, -240, PQ.z - 1.5 + 0.2 * k], [PQ.x, -230, PQ.z]),
  ];
  const cam = makeCam(cams[i]());
  const decor = decorQuai(cam, fg);
  const regard = i === 0 ? Math.sin(fg / 9) * 7 : 0;
  const items = [{z: PQ.z, x: PQ.x, el: <Perso cam={cam} id={`no${i}`} x={PQ.x} z={PQ.z} lum={lumPerso(decor, PQ.z)} teinte={FROID} worry={1} eyes={1.3} pupilX={regard} sweat={i === 2 ? 1 : 0} breath={Math.sin(fg / 4) * 4}
    epauleG={10} coudeG={40} epauleD={-10} coudeD={-40} shiver={tremble(fg, 2, 'no')} />}];
  return <Plan f={fg} cam={cam} decor={decor} items={items} noir={0.04} zoom={doux(t)} roll={[1, -2, 1.5][i]} />;
});

// 5. Les haut-parleurs grésillent. Une voix prononce ton prénom. « Veuillez vous éloigner de la bordure du quai. »
const Annonce = scene('annonce', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const parle = f > R('une', 41) - 4 ? 0.5 + 0.5 * Math.abs(Math.sin(f / 2.3) * Math.sin(f / 5.1)) : random(`hp${Math.floor(f / 2)}`) > 0.5 ? 1 : 0.2;
  const cams = [
    () => vise([-330 + 30 * k, -560, HP.z - 1.05 + 0.15 * k], [HP.x + 40, HP.y, HP.z]),
    () => camFace(PQ.x, PQ.z, -1, 0.62, t, d, {dy: -10, push: 0.12}),
    () => vise([1450 - 100 * k, -360, 3.6 + 0.4 * k], [PQ.x, -120, PQ.z + 0.6]),
  ];
  const cam = makeCam(cams[i]());
  const decor = decorQuai(cam, fg, {hp: parle});
  const items = [];
  if (i > 0) items.push({z: PQ.z, x: PQ.x, el: <Perso cam={cam} id={`an${i}`} x={PQ.x} z={PQ.z} lum={lumPerso(decor, PQ.z)} teinte={FROID} worry={1} eyes={i === 1 ? 1.5 : 1.3} pupilY={-6} pupilX={i === 1 ? -5 : 0} breath={0} sweat={1} />});
  return <Plan f={fg} cam={cam} decor={decor} items={items} noir={0.04} zoom={doux(t)} roll={[3, 0, -1.5][i]} />;
});

// 6. Tu t'approches du bord, tu te penches. Au fond du tunnel, quelque chose marche sur les rails. Vers toi.
const PB = {x: -130, z: 6.1}; // au bord du quai
const Rails = scene('rails', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const xp = i === 0 ? interpolate(f, [0, R('bord', 19) + 10], [PQ.x, PB.x], ease) : PB.x;
  const m = marche(fg, 0.3, i === 0 && f < R('bord', 19) + 10 ? 0.6 : 0);
  const penche = i === 0 ? interpolate(f, [R('penches', 41) - 4, R('penches', 41) + 10], [0, 1], clamp) : 1;
  const cams = [
    () => vise([-60, SOL - 70, 3.3 + 0.2 * k], [-260, -200, PB.z]),
    () => vise([PB.x - 300, -330, PB.z + 1.0], [650, 250, -9]),
    () => vise([500 + 30 * k, 250, -5.6 - 0.5 * k], [590, 0, -10]),
  ];
  const cam = makeCam(cams[i]());
  const decor = decorQuai(cam, fg, {signal: 'rouge'});
  const items = [];
  const zc = zChose(fg);
  if (zc !== null && i > 0) items.push(chose(cam, fg, {z: zc, id: `ch${i}`, nuit: 0.75, flou: i === 2 ? 1.2 : 2}));
  if (i < 2) items.push({z: PB.z, x: xp, el: <Perso cam={cam} id={`ra${i}`} x={xp} z={PB.z} dos={i === 1} lum={lumPerso(decor, PB.z)} teinte={FROID} lift={m.bob} legG={m.legG} legD={m.legD} tilt={-8 * penche} sy={1 - 0.04 * penche}
    worry={1} eyes={1.35} pupilY={4 * penche} pupilX={-6 * penche} />});
  return <Plan f={fg} cam={cam} decor={decor} items={items} noir={i === 2 ? 0.12 : 0.04} zoom={doux(t)} roll={[-1.5, 2, -2][i]} />;
});

// 7. Tu recules, tu te plaques derrière un pilier. Tu retiens ta respiration. Et les pas s'arrêtent.
const PP = {x: -780, z: 4.42}; // collé au pilier (côté quai, à l'abri du tunnel)
const Pilier = scene('pilier', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const u = i === 0 ? interpolate(f, [0, R('plaques', 34) + 6], [0, 1], ease) : 1;
  const x = PB.x + (PP.x - PB.x) * u;
  const z = PB.z + (PP.z - PB.z) * u;
  const m = marche(fg, 0.45, i === 0 && u < 1 ? 0.8 : 0);
  const cams = [
    () => vise([-260 - 60 * k, -520, 8.4 - 0.3 * k], [-650, -80, 4.9]),
    () => camFace(PP.x, PP.z, 1, 0.55, t, d, {dx: 40, dy: -10, push: 0.08}),
    () => vise([470, FOSSE - 70, -1.6], [590, FOSSE - 260, -4]),
  ];
  const cam = makeCam(cams[i]());
  const decor = decorQuai(cam, fg);
  const items = [];
  if (i < 2) items.push({z, x, el: <Perso cam={cam} id={`pl${i}`} x={x} z={z} lum={lumPerso(decor, z)} teinte={FROID} lift={m.bob} legG={m.legG} legD={m.legD} worry={1} eyes={1.45} sweat={1}
    pupilX={i === 1 ? -9 : 0} epauleG={6} coudeG={10} epauleD={-6} coudeD={-10} breath={i === 1 ? 0 : Math.sin(fg / 3) * 5} shiver={tremble(fg, 3, 'pl')} />});
  if (i === 2) items.push(chose(cam, fg, {z: zChose(fg), id: 'ch3', amp: f < R('sarrêtent', 126) ? 1 : 0, nuit: 0.75, flou: 1}));
  return <Plan f={fg} cam={cam} decor={decor} items={items} noir={i === 2 ? 0.1 : 0.05} zoom={doux(t)} roll={[1, -1, 0][i]} />;
});

// 8. Ton tel vibre. Une barre de réseau. Un numéro inconnu : « Ne reste pas sur le quai. »
const MSG = 'Ne reste pas sur le quai.';
const Message = scene('message', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const cam = makeCam(vise([-560, -260, PP.z + 0.9], [-780, -200, PP.z]));
  const decor = decorQuai(cam, fg);
  const items = [{z: PP.z, x: PP.x, el: <Perso cam={cam} id="me" x={PP.x} z={PP.z} lum={0.75} teinte={[0.75, 0.88, 1.15]} worry={1} eyes={1.3} pupilY={8} sweat={1} />}];
  const tel = i === 0 ? (
    <Telephone f={f} verrouille heure="00:58" date="dimanche 26 octobre" barres={f >= R('barre', 36) ? 1 : 0} nom="Numéro inconnu" initiale="?"
      notif={{debut: R('numéro', 64), texte: MSG}} echelle={1.15} y={1000} vibre={interpolate(f, [R('vibre', 13) - 6, R('vibre', 13) + 22], [1, 0], clamp)} />
  ) : (
    <Telephone f={f} heure="00:58" barres={1} nom="Numéro inconnu" initiale="?" messages={[{debut: R('ne', 107), texte: MSG, gras: true}]} echelle={1.25 + 0.45 * k} y={960 - (1.25 + 0.45 * k) * 330} />
  );
  return <Plan f={fg} cam={cam} decor={decor} items={items} noir={0.05} zoom={1.0} roll={0} dessus={<g><rect width="1080" height="1920" fill="#000" opacity="0.5" />{tel}</g>} />;
});

// 9. Deux phares au fond du tunnel. Un train arrive. Pas de numéro, pas de destination. Il s'arrête pile devant toi.
const PT = {x: -330, z: ZP}; // devant la porte
const Phares = scene('phares', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const tete = teteFantome(fg);
  const phares = interpolate(f, [R('sallument', 14) - 2, R('sallument', 14) + 6], [0, 1], clamp);
  const cams = [
    () => vise([-420, -330, PP.z + 1.1], [650, 150, -12]),
    () => vise([-170, SOL - 110, 12.5], [450, -80, 0]),
    () => orbite(560, tete, 1.9, 205 - 40 * k, -380, {pitch: 6}),
    () => vise([-1300 + 120 * k, -320, PT.z - 0.9], [60, -230, PT.z + 0.25]),
  ];
  const cam = makeCam(cams[i]());
  const decor = decorQuai(cam, fg, {signal: i < 2 ? 'vert' : 'rouge'});
  const items = [...rame(cam, fg, {tete, portes: 0, lumiere: 0.75, phares: i === 2 ? 0.25 * phares : phares, fantome: true})];
  const souffle = i === 1 ? Math.max(0, 1 - Math.abs(tete - 12.5) / 3) : 0;
  if (i === 0) items.push({z: PP.z, x: PP.x, el: <Perso cam={cam} id="ph0" x={PP.x} z={PP.z} dos lum={0.75} teinte={FROID} />});
  if (i === 3) {
    const xp = interpolate(t, [0, d * 0.7], [PP.x, PT.x], ease);
    const m = marche(fg, 0.35, t < d * 0.7 ? 0.7 : 0);
    items.push({z: PT.z, x: xp, el: <Perso cam={cam} id="ph3" x={xp} z={PT.z} dos lum={0.85} teinte={VERT} lift={m.bob} legG={m.legG} legD={m.legD} />});
  }
  return (
    <Plan f={fg} cam={cam} decor={decor} items={items} noir={0.04} zoom={i === 1 ? 1.0 + 0.05 * k : doux(t)} roll={[1.5, -2 + tremble(fg, 1.5 * souffle, 'ph'), 2, -1][i]}
      dessus={i === 1 && <rect width="1080" height="1920" fill="#fff8e0" opacity={0.25 * souffle} />} />
  );
});

// 10. Les portes s'ouvrent. Le wagon est plein. Tous les passagers tournent la tête vers toi.
const Wagon = scene('wagon', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const portes = interpolate(f, [R('portes', 7), R('souvrent', 17) + 10], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const tourne = R_('wagon', 'tournent', 115);
  const cams = [
    () => vise([-1150 + 60 * k, -300, ZP - 0.4], [60, -250, ZP]),
    () => vise([-330 + 80 * k, -250, ZP], [600, -230, ZP + 0.05]),
    () => vise([-150 + 70 * k, -230, ZP], [600, -230, ZP]),
  ];
  const cam = makeCam(cams[i]());
  const decor = decorQuai(cam, fg);
  const rendu = dedansRendu(cam, fg, {passagers: passagers(VOIT.c, fg, {tourne})});
  const items = [...rame(cam, fg, {tete: TETE_FANTOME, portes, lumiere: 0.9, fantome: true, dedans: {k: 3, rendu}})];
  if (i === 0) items.push({z: PT.z, x: PT.x, el: <Perso cam={cam} id="wa0" x={PT.x} z={PT.z} dos lum={0.85} teinte={VERT} />});
  const clac = i === 2 ? interpolate(f, [R('tournent', 115), R('tournent', 115) + 3, R('tournent', 115) + 10], [0, 0.35, 0], clamp) : 0;
  return <Plan f={fg} cam={cam} decor={decor} items={items} noir={0.04} zoom={i === 2 ? 1.0 + 0.04 * k + clac * 0.08 : doux(t)} roll={[-1, 0, 1][i]} dessus={<rect width="1080" height="1920" fill="#fff" opacity={clac} />} />;
});

// 11. Ils ont tous le même visage. Le tien.
const Visage = scene('visage', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const sourire = interpolate(fg, [START.visage + R('tien', 87) - 10, START.visage + R('tien', 87) + 4], [0.1, 0.75], clamp);
  const cams = [
    () => vise([110 + 120 * k, -190, ZP], [560, -170, ZP + 0.1]),
    () => vise([330 - 40 * k, -165, VOIT.c + 0.15 + 0.02 * k], [560, -165, VOIT.c + 0.15]),
  ];
  const cam = makeCam(cams[i]());
  const decor = decorQuai(cam, fg);
  const pa = passagers(VOIT.c, fg, {tourne: 0, sourire});
  const rendu = dedansRendu(cam, fg, {passagers: pa});
  const items = [...rame(cam, fg, {tete: TETE_FANTOME, portes: 1, lumiere: 0.9, fantome: true, dedans: {k: 3, rendu}})];
  const flash = i === 1 ? interpolate(f, [R('tien', 87) - 2, R('tien', 87) + 1, R('tien', 87) + 8], [0, 0.45, 0], clamp) : 0;
  if (i < 2) {
    // dans la voiture : on avance vers les visages, puis gros plan sur un clone qui sourit
    const camI = makeCam(cams[i]());
    const w = wagon(camI, fg, {cz: VOIT.c, passagers: pa});
    return <Plan f={fg} cam={camI} decor={w} items={[]} noir={0.04} zoom={1.0 + 0.05 * k} roll={i ? -1 : 1} dessus={<rect width="1080" height="1920" fill="#ff2a2a" opacity={flash} />} />;
  }
  return <Plan f={fg} cam={cam} decor={decor} items={items} noir={0.04} zoom={doux(t)} roll={0} />;
});

// 12. Derrière toi, dans le noir, les pas reprennent. Plus vite. Ton tel vibre encore.
const Pas = scene('pas', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const zc = zChoseQuai(fg);
  const cams = [
    () => vise([-1050, 150, PT.z + 0.4 - 0.2 * k], [X_CHOSE_QUAI, -500, zc]),
    () => vise([-1100 + 50 * k, -420, PT.z + 3.2], [-500, -200, PT.z - 2.2]),
    () => vise([-900, -260, PT.z - 1.2], [-300, -200, PT.z + 1]),
  ];
  const cam = makeCam(cams[i]());
  const decor = decorQuai(cam, fg, {signal: 'rouge'});
  const items = [...rame(cam, fg, {tete: TETE_FANTOME, portes: 1, lumiere: 0.9, fantome: true, dedans: {k: 3, rendu: dedansRendu(cam, fg, {passagers: passagers(VOIT.c, fg, {tourne: 0, sourire: 0.75})})}})];
  items.push(chose(cam, fg, {x: X_CHOSE_QUAI, z: zc, y: SOL, amp: 1.3, id: `cp${i}`, nuit: 0.5, flou: 2}));
  if (i < 2) items.push({z: PT.z, x: PT.x, el: <Perso cam={cam} id={`pa${i}`} x={PT.x} z={PT.z} dos={i === 1 ? false : true} lum={0.85} teinte={VERT} worry={1} eyes={1.45} sweat={1} pupilX={i === 1 ? -10 : 0} shiver={tremble(fg, 4, 'pa')} />});
  const tel = i === 2 && (
    <Telephone f={f} heure="01:01" barres={1} nom="Numéro inconnu" initiale="?" messages={[{debut: -999, texte: MSG, gras: true}, {debut: R('ne', 141), texte: MSG, gras: true, alerte: true}]}
      echelle={1.3 + 0.3 * k} y={960 - (1.3 + 0.3 * k) * 330} vibre={interpolate(f, [R('vibre', 109) - 6, R('vibre', 109) + 20], [1, 0], clamp)} />
  );
  return <Plan f={fg} cam={cam} decor={decor} items={items} noir={0.05} zoom={doux(t)} roll={[-2, 1.5, 0][i]} dessus={tel && <g><rect width="1080" height="1920" fill="#000" opacity="0.5" />{tel}</g>} />;
});

// 13. La sonnerie des portes. Tu montes avec eux ? Ou tu restes dans le noir avec ce qui marche sur les rails ?
const Dilemme = scene('dilemme', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const zc = zChoseQuai(fg);
  const cams = [
    () => vise([-620 + 40 * k, -330, PT.z + 3.0], [-80, -230, PT.z]),
    () => vise([PT.x + 120, -300, PT.z + 0.9], [X_CHOSE_QUAI, -450, zc]),
    () => vise([-1150, -1000 + 80 * k, PT.z + 4.4 - 0.3 * k], [-400, 0, PT.z - 1.0]),
  ];
  const cam = makeCam(cams[i]());
  const decor = decorQuai(cam, fg, {signal: 'rouge'});
  const items = [...rame(cam, fg, {tete: TETE_FANTOME, portes: 1, lumiere: 0.9, fantome: true, bip: 1, dedans: {k: 3, rendu: dedansRendu(cam, fg, {passagers: passagers(VOIT.c, fg, {tourne: 0, sourire: 0.75})})}})];
  items.push(chose(cam, fg, {x: X_CHOSE_QUAI, z: zc, y: SOL, amp: 0.4, penche: 24 + 6 * Math.sin(fg / 20), id: `cd${i}`, nuit: 0.5, flou: 2}));
  if (i !== 1) items.push({z: PT.z, x: PT.x, el: <Perso cam={cam} id={`di${i}`} x={PT.x} z={PT.z} dos={false} lum={0.85} teinte={VERT} worry={1} eyes={1.35} sweat={1} pupilX={i === 0 ? 8 : -6} shiver={tremble(fg, 3, 'di')} />});
  const dis = R('dis-le', 170);
  return (
    <Plan f={fg} cam={cam} decor={decor} items={items} noir={0.04} zoom={doux(t)} roll={[1, -1.5, 0][i]}
      dessus={
        <g>
          <rect width="1080" height="1920" fill="#ff1a1a" opacity={Math.floor(f / 6) % 2 === 0 ? 0.06 : 0} />
          <Choix f={f} debut={R('montes', 53)} x={540} y={250} texte="JE MONTE" emoji="1f687" couleur="#3ad86a" />
          <Choix f={f} debut={R('restes', 89)} x={540} y={450} texte="JE RESTE" emoji="1f311" couleur="#ff3a4a" />
          {f >= dis && (
            <g transform={`translate(540 1700) scale(${spring({frame: f - dis, fps: 30, config: {damping: 10}})})`}>
              <rect x="-400" y="-70" width="800" height="140" rx="70" fill="#fff" />
              <image href={staticFile('emoji/1f4ac.svg')} x="-370" y="-48" width="96" height="96" />
              <text x="40" y="18" textAnchor="middle" fontFamily="'DejaVu Sans', Arial, sans-serif" fontWeight="900" fontSize="46" fill="#111">
                DIS-LE EN COMMENTAIRE
              </text>
            </g>
          )}
        </g>
      }
    />
  );
});

const COMPOSANTS = {portes: Portes, reseau: Reseau, grille: Grille, noir: Noir, annonce: Annonce, rails: Rails, pilier: Pilier, message: Message, phares: Phares, wagon: Wagon, visage: Visage, pas: Pas, dilemme: Dilemme};
export const DernierTrain = () => (
  <Series>
    {SCENES.map(([nom, d]) => {
      const C = COMPOSANTS[nom];
      return (
        <Series.Sequence key={nom} durationInFrames={d}>
          <C />
        </Series.Sequence>
      );
    })}
  </Series>
);
