import {AbsoluteFill, Easing, interpolate, random, Series, spring, staticFile, useCurrentFrame} from 'remotion';
import {alien3D} from './Alien3D';
import {Choix} from './Livreur';
import {Bonhomme} from './Bonhomme';
import {dosPour, montage, Plan, punch} from './montage';
import {clamp, Finition, makeCam, marche, Perso} from './moteur';
import {SOL} from './Rue';
import {capsule, couloirV, GRIFFEE, GRILLES, gyro, hall, HUBLOT, MA_CAPSULE, PLAF_V, POD, POD_Z, salleEcrans} from './Vaisseau';
import PLANS from './vaisseau/plans.json';
import timeline from './vaisseau/timeline.json';

// « Le vaisseau » : tu te réveilles dans une capsule, dans un vaisseau alien. Horreur, tension qui monte, deux screamers.
// Partie 1 (réveil → hublot) : salle des capsules, ta capsule qui s'ouvre, la capsule griffée, la Terre au loin.
const {decoupe, repere, SCENES} = montage(timeline, PLANS);
export const DUREE_VAISSEAU = SCENES.reduce((t, [, d]) => t + d, 0);
const START = {};
SCENES.reduce((t, [nom, d]) => {
  START[nom] = t;
  return t + d;
}, 0);

const ease = {...clamp, easing: Easing.inOut(Easing.sin)};
const FROID = [0.78, 0.92, 1.12]; // lumière froide du vaisseau
const deg = (r) => (r * 180) / Math.PI;
const vise = (p, c, extra = {}) => {
  const dx = c[0] - p[0];
  const dy = c[1] - p[1];
  const dz = (c[2] - p[2]) * 1000;
  return {x: p[0], y: p[1], z: p[2], yaw: deg(Math.atan2(dx, dz)), pitch: deg(Math.atan2(dy, Math.hypot(dx, dz))), ...extra};
};
const lisse = (t, d) => Easing.inOut(Easing.sin)(Math.min(1, t / Math.max(1, d)));
const doux = (t) => punch(t, 0.05);
const tremble = (f, k, cle) => k * (random(`${cle}${f}`) - 0.5);
// la teinte du perso : froide, rougie par les gyrophares
const teinte = (f, rouge = 1) => {
  const g = gyro(f, 1.5) * 0.35 * rouge;
  return [FROID[0] + g, FROID[1] - g * 0.4, FROID[2] - g * 0.5];
};
const XM = MA_CAPSULE.cote * 960; // centre de ma capsule
const ZM = MA_CAPSULE.z;

// toutes les capsules de la salle (la mienne, la griffée, les dormeurs)
const capsules = (cam, f, {mienne = {}} = {}) =>
  POD_Z.flatMap((z, k) =>
    [-1, 1].map((s) => {
      const moi = s === MA_CAPSULE.cote && z === ZM;
      const griffe = s === GRIFFEE.cote && z === GRIFFEE.z;
      if (moi) return capsule(cam, f, s, z, 0, {vide: mienne.vide ?? false, ouvre: mienne.ouvre ?? 0, buee: mienne.buee ?? 0.9, regard: mienne.regard});
      if (griffe) return capsule(cam, f, s, z, k, {vide: true, griffee: true, ouvre: 0.85, buee: 0.2, lumiere: gyro(f, 2) > 0.5 ? 0.3 : 0.9});
      return capsule(cam, f, s, z, k + (s > 0 ? 2 : 0) + 1, {buee: 0.45 + 0.3 * random(`bu${s}${z}`)});
    }),
  );

// ----- la buée sur la vitre (par-dessus l'image) -----
const Buee = ({f, force = 1, id = 'bu'}) => (
  <g opacity={force}>
    <defs>
      <filter id={`${id}-f`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="3" seed="7" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.85  0 0 0 0 0.93  0 0 0 0 1  0 0 0 1.4 -0.35" />
      </filter>
      <radialGradient id={`${id}-trou`} cx="540" cy="900" r="520" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#fff" stopOpacity="0.25" />
        <stop offset="1" stopColor="#fff" stopOpacity="1" />
      </radialGradient>
      <mask id={`${id}-m`}>
        <rect width="1080" height="1920" fill={`url(#${id}-trou)`} />
      </mask>
    </defs>
    <rect width="1080" height="1920" filter={`url(#${id}-f)`} opacity="0.85" mask={`url(#${id}-m)`} />
    {[...Array(60)].map((_, k) => {
      const x = random(`gx${k}`) * 1080;
      const y = random(`gy${k}`) * 1920 + (k % 7 === 0 ? (f * 2.5 * random(`gv${k}`)) % 400 : 0);
      const r = 4 + 12 * random(`gr${k}`);
      return (
        <g key={k} opacity="0.75">
          <circle cx={x} cy={y} r={r} fill="#dff4ff" opacity="0.35" />
          <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.35} fill="#fff" opacity="0.9" />
        </g>
      );
    })}
  </g>
);

// ----- gros plan : lui, couché dans la capsule, vu d'au-dessus à travers la vitre -----
const Couche = ({f, t, d, ouvert, buee = 0.6}) => {
  const k = lisse(t, d);
  const s = 1.25 + 0.25 * k; // la caméra descend doucement vers son visage
  const g = gyro(f, 0.5);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <defs>
          <linearGradient id="co-mat" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8a9aa8" />
            <stop offset="0.5" stopColor="#d8e4ec" />
            <stop offset="1" stopColor="#8a9aa8" />
          </linearGradient>
        </defs>
        <g transform={`translate(540 860) scale(${s}) translate(-540 -860)`}>
          <rect width="1080" height="1920" fill="url(#co-mat)" />
          {[...Array(9)].map((_, i) => <line key={i} x1="0" y1={i * 240} x2="1080" y2={i * 240} stroke="#7a8a98" strokeWidth="6" opacity="0.5" />)}
          {[1, 2, 3].map((i) => <line key={i} x1={i * 270} y1="0" x2={i * 270} y2="1920" stroke="#7a8a98" strokeWidth="6" opacity="0.5" />)}
          <ellipse cx="540" cy="560" rx="300" ry="150" fill="#eef4f8" />
          {/* lui, couché sur le dos : vu d'au-dessus, la tête en haut */}
          <g transform="translate(540 1350) scale(1.55) translate(-300 -600)">
            <Bonhomme eyes={ouvert} worry={ouvert > 0.5 ? 1 : 0.5} brows={ouvert > 0.5 ? -4 : 2} pupilX={ouvert > 0.5 ? Math.sin(f / 7) * 6 : 0} sweat={ouvert > 0.5 ? 1 : 0} breath={Math.sin(f / 5) * 3} />
          </g>
          {/* couverture thermique */}
          <path d="M60,1180 Q540,1110 1020,1180 L1060,1920 L20,1920 Z" fill="#6aa8c8" />
          <path d="M60,1180 Q540,1110 1020,1180" stroke="#bfe6f6" strokeWidth="14" fill="none" />
          {[0, 1, 2, 3].map((j) => <path key={j} d={`M80,${1300 + j * 150} Q540,${1240 + j * 150} 1000,${1300 + j * 150}`} stroke="#5a98b8" strokeWidth="8" fill="none" />)}
        </g>
        {/* lumière bleue de la capsule, puis le gyrophare rouge qui balaie */}
        <rect width="1080" height="1920" fill="#2a9ad8" opacity="0.16" style={{mixBlendMode: 'multiply'}} />
        <rect width="1080" height="1920" fill="#ff1a1a" opacity={0.32 * g} />
        {/* arceaux et reflets du verre */}
        <path d="M-40,300 Q540,120 1120,300" stroke="#c8d8e4" strokeWidth="38" fill="none" opacity="0.5" />
        <path d="M-40,1700 Q540,1520 1120,1700" stroke="#c8d8e4" strokeWidth="38" fill="none" opacity="0.5" />
        <path d="M120,0 L420,1920" stroke="#fff" strokeWidth="60" opacity="0.06" />
        <path d="M640,0 L820,1920" stroke="#fff" strokeWidth="24" opacity="0.08" />
        <Buee f={f} force={buee} id="bu1" />
        <Finition f={f} id="fco" vignette={0.95} />
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

// 1. Imagine. Tu te réveilles dans une capsule en verre. Buée, lumière rouge.
const Reveil = scene('reveil', ({f, fg, i, t, d, bornes, R}) => {
  if (i === 0) {
    const o = interpolate(f, [R('réveilles', 26) - 2, R('réveilles', 26) + 3], [0, 1.45], clamp);
    return <Couche f={fg} t={t} d={d} ouvert={o} buee={0.35} />;
  }
  const k = lisse(t, d);
  const cams = [
    null,
    // vue subjective : couché, on regarde le plafond à travers la vitre embuée
    () => ({x: XM - MA_CAPSULE.cote * 220, y: POD.yVerre - 70, z: ZM - 0.02, yaw: 8 * Math.sin(fg / 50), pitch: -78 + 6 * k}),
    // de l'extérieur : la capsule embuée, il est dedans, les yeux ouverts
    () => vise([-150 + 120 * k, -700 + 120 * k, ZM - 1.9 + 0.5 * k], [XM, 40, ZM]),
  ];
  const cam = makeCam(cams[i]());
  const decor = hall(cam, fg);
  return (
    <Plan f={fg} cam={cam} decor={decor} items={capsules(cam, fg, {mienne: {buee: 1, regard: 1.4}})} noir={0.14} zoom={doux(t)} roll={[0, 6, -2][i]}
      dessus={i === 1 && (
        <g>
          <rect width="1080" height="1920" fill="#ff1a1a" opacity={0.45 * gyro(fg, 0.5)} />
          <Buee f={fg} force={0.4} id="bu2" />
        </g>
      )} />
  );
});

// 2. Le couvercle s'ouvre dans un sifflement. L'air est glacé.
const Sortie = scene('sortie', ({f, fg, i, t, d, R}) => {
  const ouvre = interpolate(f, [R('pousses', 4) - 4, R('sifflement', 50) + 10], [0, 1], ease);
  const k = lisse(t, d);
  const P = {x: -430, z: ZM - 0.05};
  const desc = interpolate(t, [0, 16], [-330, 0], {...clamp, easing: Easing.out(Easing.quad)});
  const cams = [
    () => vise([-120 - 60 * k, -480 + 60 * k, ZM - 1.25 + 0.15 * k], [XM + 80, 30, ZM + 0.05]),
    () => vise([-60 + 80 * k, 280 - 60 * k, ZM - 1.35 + 0.15 * k], [P.x, -120, P.z]),
  ];
  const cam = makeCam(cams[i]());
  const decor = hall(cam, fg);
  const items = capsules(cam, fg, {mienne: {ouvre, vide: i === 1, buee: 0.7 * (1 - ouvre)}});
  // jets de vapeur à l'ouverture
  const jet = interpolate(f, [R('sifflement', 50) - 10, R('sifflement', 50) + 4, R('sifflement', 50) + 50], [0, 1, 0.2], clamp);
  for (let j = 0; j < 8; j++) {
    const x = XM + (j - 3.5) * 110;
    const y = 20 - jet * (200 + 160 * random(`jy${j}`)) - (f % 20) * 4;
    items.push({z: ZM - 0.32, x, y, el: <circle key={`j${j}`} cx={cam.proj(x, y, ZM - 0.32)[0]} cy={cam.proj(x, y, ZM - 0.32)[1]} r={(260 + 120 * random(`jr${j}`)) * cam.scale(ZM - 0.32, x, y) * (0.6 + jet)} fill="url(#va-vapeur)" opacity={0.9 * jet} />});
  }
  if (i === 1) {
    items.push({z: P.z, x: P.x, el: <Perso cam={cam} id="so1" x={P.x} z={P.z} lum={0.95} teinte={teinte(fg)} lift={desc} worry={0.8} eyes={1.25} shiver={tremble(fg, 7, 'so')} breath={Math.sin(fg / 3) * 4}
      epauleG={10} coudeG={70} epauleD={-10} coudeD={-70} pupilX={-6} />});
    // buée qui sort de sa bouche (il a froid)
    const souffle = (fg % 40) / 40;
    items.push({z: P.z - 0.05, x: P.x, y: -330, el: <circle key="souffle" cx={cam.proj(P.x + 40 + souffle * 120, -360 - souffle * 60, P.z - 0.08)[0]} cy={cam.proj(P.x + 40 + souffle * 120, -360 - souffle * 60, P.z - 0.08)[1]} r={(40 + 120 * souffle) * cam.scale(P.z, P.x, -360)} fill="url(#va-vapeur)" opacity={1 - souffle} />});
  }
  return <Plan f={fg} cam={cam} decor={decor} items={items} noir={0.14} zoom={doux(t)} roll={[-3, 2][i]} />;
});

// 3. Des dizaines de capsules. Dans chacune, quelqu'un dort. Sauf une, ouverte et griffée.
const Capsules = scene('capsules', ({f, fg, i, t, d}) => {
  const k = lisse(t, d);
  const P = [{x: -330, z: ZM + 0.4}, {x: -100, z: 8.5}, {x: 80, z: 10.9}][i];
  const cams = [
    // grue : on monte au-dessus de lui et on découvre la salle
    () => vise([150, 120 - 820 * k, ZM - 2.2 + 0.4 * k], [0, -60 + 120 * k, 15]),
    // travelling latéral le long des dormeurs
    () => vise([-150, -620, 5.6 + 2.6 * k], [1000, 40, 8.2 + 2.6 * k]),
    // par-dessus son épaule, on s'approche de la capsule griffée
    () => vise([-120 + 60 * k, -330 - 40 * k, 9.9 + 0.55 * k], [GRIFFEE.cote * 900, 40, GRIFFEE.z]),
  ];
  const cam = makeCam(cams[i]());
  const decor = hall(cam, fg);
  const items = capsules(cam, fg, {mienne: {ouvre: 1, vide: true, buee: 0}});
  if (i !== 1) items.push({z: P.z, x: P.x, el: <Perso cam={cam} id={`ca${i}`} x={P.x} z={P.z} dos={cam.z < P.z} lum={0.9} teinte={teinte(fg)} worry={1} eyes={1.3} shiver={tremble(fg, 3, 'ca')} epauleG={10} coudeG={60} epauleD={-10} coudeD={-60} />});
  return <Plan f={fg} cam={cam} decor={decor} items={items} noir={0.14} zoom={doux(t)} roll={[0, -2, 3][i]} />;
});

// 4. Au bout du couloir, un hublot. Et derrière, la Terre. Très, très loin.
const Hublot = scene('hublot', ({f, fg, i, t, d}) => {
  const k = lisse(t, d);
  const zp = i === 0 ? 19.6 + 3.2 * k : 23.0;
  const m = marche(fg, 0.32, i === 0 ? 0.8 * (1 - k * 0.6) : 0);
  const cams = [
    () => vise([140, -360 - 40 * k, zp - 1.9 + 0.3 * k], [HUBLOT.x, HUBLOT.y + 60, HUBLOT.z]),
    () => vise([200 - 50 * k, -250, 24.15 - 0.15 * k], [0, -170, 23.0], {}),
  ];
  const cam = makeCam(cams[i]());
  const decor = hall(cam, fg, {alarme: 0.6});
  const items = capsules(cam, fg, {mienne: {ouvre: 1, vide: true, buee: 0}});
  const bleu = [0.72, 0.9, 1.25];
  items.push({z: zp, x: 0, el: <Perso cam={cam} id={`hu${i}`} x={0} z={zp} dos={cam.z < zp} lum={1} teinte={i === 1 ? bleu : teinte(fg)} lift={m.bob} legG={m.legG} legD={m.legD}
    worry={0.9} eyes={i === 1 ? 1.45 : 1.2} pupilY={-4} epauleG={8 + m.bras} coudeG={20} epauleD={-8 + m.bras} coudeD={-20} breath={Math.sin(fg / 6) * 3} />});
  return (
    <Plan f={fg} cam={cam} decor={decor} items={items} noir={0.1} zoom={doux(t)} roll={[1, -2][i]}
      dessus={i === 1 && <rect width="1080" height="1920" fill="#3a8aff" opacity={0.08 + 0.04 * Math.sin(fg / 20)} />} />
  );
});

// ===================== parties 2 à 4 =====================
const PH = {x: 0, z: 23.0}; // devant le hublot, sous la dernière grille
const ZG = GRILLES[2];
// la chose qui rampe dans les conduits : de Z 12 jusqu'au-dessus de sa tête (fin à « s'arrête »)
const rampeZ = (fg) => interpolate(fg, [START.conduit + 20, START.conduit + repere('conduit', 'sarrête', 150)], [12, ZG], clamp);
// poussière qui tombe du plafond là où ça passe
const poussiere = (cam, fg, zc, n = 18, cle = 'po') =>
  [...Array(n)].map((_, k) => {
    const age = (fg + k * 7) % 40;
    const z = zc + (random(`${cle}z${k}`) - 0.5) * 0.5;
    const x = (random(`${cle}x${k}`) - 0.5) * 500;
    const y = PLAF_V + 10 + age * age * 0.9;
    if (y > SOL || !cam.visible(z, x, y)) return null;
    const [px, py] = cam.proj(x, y, z);
    return {z, x, y, el: <circle key={`${cle}${k}`} cx={px} cy={py} r={Math.max(1, 9 * cam.scale(z, x, y))} fill="#c8d0d8" opacity={0.8 - age / 60} />};
  }).filter(Boolean);
const decorHall = (cam, fg, o = {}) => hall(cam, fg, {neons: (z) => (o.coupure ? (random(`nc${z}${Math.floor(fg / 4)}`) < 0.35 ? 0.15 : 1) : 1), alarme: o.alarme ?? 1});
// la grille au-dessus de lui, dont on voit l'intérieur par les fentes (clip)
const grilleClip = (cam, zg = ZG) => cam.poly([[-260, PLAF_V + 3, zg - 0.3], [260, PLAF_V + 3, zg - 0.3], [260, PLAF_V + 3, zg + 0.3], [-260, PLAF_V + 3, zg + 0.3]]);

// 5. Un bruit dans les conduits. Quelque chose qui rampe… et qui s'arrête au-dessus de ta tête.
const Conduit = scene('conduit', ({f, fg, i, t, d}) => {
  const k = lisse(t, d);
  const zc = rampeZ(fg);
  const cams = [
    () => vise([150 - 40 * k, -230, 24.0 - 0.15 * k], [0, -190, PH.z]),
    () => ({x: 120, y: PLAF_V + 260, z: 23.6 - 0.8 * k, yaw: 180, pitch: -12}),
    () => vise([260, 260 - 40 * k, 21.2 + 0.2 * k], [0, -650, ZG]),
  ];
  const cam = makeCam(cams[i]());
  const items = capsules(cam, fg, {mienne: {ouvre: 1, vide: true, buee: 0}});
  items.push(...poussiere(cam, fg, zc));
  items.push({z: PH.z, x: PH.x, el: <Perso cam={cam} id={`co${i}`} x={PH.x} z={PH.z} dos={cam.z < PH.z} lum={0.85} teinte={teinte(fg)} worry={1} eyes={1.35} pupilY={-9} pupilX={i === 0 ? Math.sin(fg / 9) * 5 : 0} shiver={tremble(fg, 3, 'co')} breath={Math.sin(fg / 4) * 4} />});
  return <Plan f={fg} cam={cam} decor={decorHall(cam, fg, {coupure: i >= 1})} items={items} noir={0.16} zoom={doux(t)} roll={[0, -3, 2][i]} />;
});

// 6. Tu lèves les yeux. Une grille… deux yeux qui brillent. SCREAMER : la tête jaillit de la grille.
const Grille = scene('grille', ({f, fg, i, t, d, bornes, R}) => {
  const k = lisse(t, d);
  const yeux = interpolate(f, [R('deux', 50) - 2, R('deux', 50) + 8], [0, 1], clamp);
  if (i === 0) {
    const cam = makeCam({x: 20, y: -240, z: ZG - 0.05, yaw: 0, pitch: -86 + 4 * k});
    const items = capsules(cam, fg, {mienne: {ouvre: 1, vide: true, buee: 0}});
    const tete = alien3D(cam, {x: 0, y: PLAF_V - 180, z: ZG + 0.05, f: fg, tete: {dir: [0, 1, 0.25], haut: [0, 0, -1]}, yeux, gueule: 0, id: 'al1'});
    const clip = grilleClip(cam);
    // la tête derrière la grille (dessinée après le fond noir de la grille), puis les barreaux par-dessus
    const barreaux = [...Array(9)].map((_, j) => {
      const r = cam.seg([(j - 4) * 55, PLAF_V + 4, ZG - 0.28], [(j - 4) * 55, PLAF_V + 4, ZG + 0.28]);
      return r && <line key={j} x1={r[0][0]} y1={r[0][1]} x2={r[1][0]} y2={r[1][1]} stroke="#3a4a56" strokeWidth={22 / Math.max(0.35, cam.profondeur(ZG, 0, PLAF_V))} />;
    });
    items.push({z: ZG - 0.05, x: 0, y: PLAF_V + 60, el: clip && <g key="dansgrille"><defs><clipPath id="gr-c"><polygon points={clip} /></clipPath></defs><g clipPath="url(#gr-c)"><rect width="1080" height="1920" fill="#020304" />{tete.el}</g>{barreaux}</g>});
    return <Plan f={fg} cam={cam} decor={decorHall(cam, fg, {coupure: true})} items={items} noir={0.2 + 0.1 * k} zoom={1.0 + 0.12 * k} roll={-2} />;
  }
  // le screamer : la grille saute, la tête plonge vers la caméra, gueule ouverte
  const u = interpolate(t, [0, 8], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const sec = tremble(fg, 10 * (1 - u * 0.3), 'sc');
  const cam = makeCam({x: 20 + sec, y: -240 + sec, z: ZG - 0.05, yaw: 0, pitch: -86});
  const items = capsules(cam, fg, {mienne: {ouvre: 1, vide: true, buee: 0}});
  const tete = alien3D(cam, {x: 0, y: PLAF_V - 120 + 480 * u, z: ZG + 0.12 - 0.08 * u, f: fg, tete: {dir: [0, 1, -0.35], haut: [0, 0, -1]}, yeux: 1, gueule: 0.3 + 0.7 * Math.min(1, t / 4), echelle: 1.1, id: 'al2'});
  items.push(tete);
  // la grille arrachée qui tombe en tournant
  const gy = PLAF_V + 4 + 700 * u;
  const gr = cam.poly([[-260, gy, ZG - 0.3 + 0.2 * u], [260, gy + 120 * u, ZG - 0.3], [260, gy + 60 * u, ZG + 0.3], [-260, gy - 60 * u, ZG + 0.3 - 0.2 * u]]);
  if (gr) items.push({z: ZG, x: 0, y: gy, el: <polygon key="grv" points={gr} fill="#3a4a56" stroke="#5a6a76" strokeWidth="6" />});
  const flash = interpolate(t, [0, 2, 5, 9, 12], [0.9, 0.1, 0.5, 0, 0.7], clamp);
  return (
    <Plan f={fg} cam={cam} decor={decorHall(cam, fg)} items={items} noir={0.1} zoom={1.12 + 0.08 * u} roll={sec * 0.4}
      dessus={<g><rect width="1080" height="1920" fill={t % 4 < 2 ? '#fff' : '#ff1a1a'} opacity={flash} /></g>} />
  );
});

// 7. Tu cours. Les néons s'éteignent, les portes claquent derrière toi. Des griffes, de plus en plus près.
const Fuite = scene('fuite', ({f, fg, i, t, d}) => {
  const D = timeline.scenes.find((s) => s.nom === 'fuite').frames;
  const pz = 2 + 28 * (f / D);
  const m = marche(fg, 0.62, 1.2);
  const neon = (z) => (z < pz - 2.5 ? (z < pz - 5 ? 0 : 0.3) : 1);
  const porte = (z) => (i === 2 ? 0 : interpolate(pz - z, [0.9, 1.6], [0, 1], clamp));
  const za = pz - 3.6 + 1.2 * (f / D); // l'alien gagne du terrain
  const cams = [
    () => vise([90, 60, pz + 1.45], [0, -170, pz]),
    () => vise([380, -360, pz - 1.6], [-50, -200, pz + 2.5]),
    () => vise([-200, -60, pz + 0.3], [0, 0, za]),
    () => vise([60, -170, pz + 0.75], [0, -170, pz]),
  ];
  const cam = makeCam(cams[i]());
  const decor = couloirV(cam, fg, {neon, porte});
  const items = [];
  if (i !== 2) items.push({z: pz, x: 0, el: <Perso cam={cam} id={`fu${i}`} x={0} z={pz} dos={cam.z < pz} lum={0.9} teinte={teinte(fg, 1.4)} lift={m.bob * 2} legG={m.legG} legD={m.legD} epauleG={12 + m.bras * 3} coudeG={75} epauleD={-12 + m.bras * 3} coudeD={-75}
    worry={1} eyes={1.4} scream={i === 3 ? 0.5 : 0.2} sweat={1} pupilX={i === 3 ? 9 : 0} />});
  if (i === 2) items.push(alien3D(cam, {x: 0, z: za, angle: 0, f: fg * 1.6, rampe: 1, yeux: 1, gueule: 0.3, id: 'al3'}));
  return <Plan f={fg} cam={cam} decor={decor} items={items} noir={i === 2 ? 0.35 : 0.12} zoom={doux(t)} roll={[3, -4, 5, -3][i] + Math.sin(fg / 2) * 0.8} />;
});

// la salle des capsules vue par la caméra de surveillance (pour le grand écran)
const fluxHall = (fg, camV, mienne) => {
  const cam = makeCam(camV);
  const decor = hall(cam, fg, {brume: 0.6});
  const items = [...decor.items, ...capsules(cam, fg, {mienne})].filter((o) => o && o.el).sort((a, b) => cam.profondeur(b.z, b.x ?? cam.x, b.y ?? cam.y) - cam.profondeur(a.z, a.x ?? cam.x, a.y ?? cam.y));
  return (
    <g>
      {decor.fond}
      {items.map((o, k) => <g key={k}>{o.el}</g>)}
    </g>
  );
};
const MIENNE_TWIST = {ouvre: 0, vide: false, buee: 0.25, regard: 0};
const CCTV = (k) => vise([-200 - 300 * k, -850 + 450 * k, ZM - 2.6 + 1.6 * k], [XM, 20, ZM]);
const CCTV_VISAGE = (k) => vise([XM - MA_CAPSULE.cote * (-80), -320 + 60 * k, ZM - 0.32 + 0.06 * k], [XM - MA_CAPSULE.cote * (-220), POD.yVerre - 50, ZM]);
const PS = {x: 0, z: 4.6}; // devant la console, face au grand écran
const VERT = [0.72, 1.12, 0.86];

// 8. Une porte s'ouvre sur une salle remplie d'écrans. Sur l'un d'eux, la salle des capsules. En direct.
const Ecrans = scene('ecrans', ({f, fg, i, t, d}) => {
  const k = lisse(t, d);
  const porte = interpolate(t, [0, 14], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const P = i === 0 ? {x: interpolate(t, [10, d], [-1500, -850], ease), z: 1.8 + 0.8 * k} : {x: 80, z: PS.z - 0.6 + 0.4 * k};
  const m = marche(fg, 0.45, i === 0 ? 1 : 0.3);
  const cams = [
    () => vise([700 - 150 * k, -420, 5.6 - 0.4 * k], [-1300, -150, 1.8]),
    () => vise([260 - 140 * k, -330 - 20 * k, 2.4 + 1.3 * k], [0, -330, 8]),
  ];
  const cam = makeCam(cams[i]());
  const decor = salleEcrans(cam, fg, {porte: i === 0 ? porte : 1, flux: fluxHall(fg, CCTV(0), MIENNE_TWIST)});
  const items = [{z: P.z, x: P.x, el: <Perso cam={cam} id={`ec${i}`} x={P.x} z={P.z} dos={dosPour(cam, P.z, 1)} lum={0.85} teinte={VERT} lift={m.bob} legG={m.legG} legD={m.legD} worry={1} eyes={1.3} sweat={1} breath={Math.sin(fg / 3) * 5} />}];
  return <Plan f={fg} cam={cam} decor={decor} items={items} noir={0.1} zoom={doux(t)} roll={[-3, 1][i]} />;
});

// 9. Ta capsule n'est pas vide. Quelqu'un dort dedans… avec ton visage.
const Double = scene('double', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  if (i < 2) {
    // l'écran plein cadre : la caméra de surveillance zoome sur ta capsule, puis sur le visage
    const camE = makeCam({x: 0, y: -330, z: 7.12, yaw: 0, pitch: 0});
    const flux = i === 0 ? fluxHall(fg, CCTV(k), MIENNE_TWIST) : fluxHall(fg, CCTV_VISAGE(k), MIENNE_TWIST);
    const decor = salleEcrans(camE, fg, {flux});
    return <Plan f={fg} cam={camE} decor={decor} items={[]} noir={0.05} zoom={1.02 + 0.04 * k + (i === 1 ? tremble(fg, 0.01, 'zz') : 0)} roll={0} />;
  }
  const cam = makeCam(vise([90 - 30 * k, -200, PS.z + 0.75 - 0.1 * k], [0, -170, PS.z]));
  const decor = salleEcrans(cam, fg, {flux: fluxHall(fg, CCTV_VISAGE(1), MIENNE_TWIST), lumiere: 1.4});
  const items = [{z: PS.z, x: PS.x, el: <Perso cam={cam} id="do" x={PS.x} z={PS.z} lum={0.9} teinte={VERT} worry={1} eyes={1.55} scream={0.6} sweat={1} pupilY={-2} shiver={tremble(fg, 4, 'do')} />}];
  return <Plan f={fg} cam={cam} decor={decor} items={items} noir={0.1} zoom={doux(t)} roll={-2} dessus={<rect width="1080" height="1920" fill="#3aff8a" opacity="0.07" />} />;
});

// 10. Alors si lui, c'est toi… toi, t'es quoi ?
const Question = scene('question', ({f, fg, t, d}) => {
  const k = lisse(t, d);
  const cam = makeCam(vise([30, -170, PS.z + 0.62 - 0.18 * k], [0, -150, PS.z]));
  const decor = salleEcrans(cam, fg, {flux: fluxHall(fg, CCTV_VISAGE(1), MIENNE_TWIST)});
  const items = [{z: PS.z, x: PS.x, el: <Perso cam={cam} id="qu" x={PS.x} z={PS.z} lum={0.8} teinte={VERT} worry={1} eyes={1.4} pupilY={8} sweat={1} epauleG={18} coudeG={110} epauleD={-18} coudeD={-110} shiver={tremble(fg, 6, 'qu')} />}];
  return <Plan f={fg} cam={cam} decor={decor} items={items} noir={0.25} zoom={1.0 + 0.06 * k} roll={2} />;
});

// 11. Derrière toi, un souffle. SCREAMER : il est là. Trois mètres. Il ne t'attaque pas, il attend.
const PA = {x: 120, z: 3.2}; // l'alien, derrière lui
const Alien = scene('alien', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const penche = i >= 3 ? interpolate(f, [R('regarde', 220) - 20, R('regarde', 220) + 30], [0, 32], clamp) : 0;
  const cams = [
    () => vise([70, -175, PS.z - 0.42], [0, -180, PS.z + 2]),
    () => ({x: PS.x, y: -190, z: PS.z - 0.05, yaw: interpolate(t, [0, 6], [0, 180], {...clamp, easing: Easing.out(Easing.cubic)}) + tremble(fg, 3, 'yw'), pitch: interpolate(t, [0, 8], [0, -24], clamp)}),
    () => vise([480, 360, PA.z + 1.1], [PA.x, interpolate(k, [0, 1], [200, -640]), PA.z]),
    () => vise([1250 - 100 * k, -330, 2.5 + 0.4 * k], [60, -350, (PA.z + PS.z) / 2]),
    () => vise([PA.x + 160 - 50 * k, -680, PA.z + 1.05 - 0.12 * k], [PA.x, -560, PA.z + 0.35]),
  ];
  const cam = makeCam(cams[i]());
  const decor = salleEcrans(cam, fg, {flux: fluxHall(fg, CCTV_VISAGE(1), MIENNE_TWIST), lumiere: 0.8});
  const items = [];
  const gueule = i === 1 ? interpolate(t, [4, 10], [0, 1], clamp) : i === 4 ? 0.15 + 0.1 * Math.sin(fg / 10) : 0;
  if (i >= 1) items.push(alien3D(cam, {x: i === 1 ? 0 : PA.x, z: i === 1 ? PS.z - 1.05 : PA.z, angle: 0, f: fg, gueule, penche, elan: i === 1 ? 0.35 : 0, yeux: 1, id: 'al4'}));
  if (i !== 1 && i !== 4) items.push({z: PS.z, x: PS.x, el: <Perso cam={cam} id={`ai${i}`} x={PS.x} z={PS.z} dos={dosPour(cam, PS.z, i === 0 ? 1 : -1)} lum={0.75} teinte={VERT} worry={1} eyes={1.5} scream={i === 3 ? 0.3 : 0} sweat={1} shiver={tremble(fg, 5, 'ai')} />});
  if (i === 0) {
    // le souffle chaud qui arrive dans sa nuque
    const s = (f % 45) / 45;
    items.push({z: PS.z - 0.2, x: -150, el: <circle key="souf" cx={cam.proj(-120 + 200 * s, -230, PS.z - 0.25)[0]} cy={cam.proj(-120 + 200 * s, -230, PS.z - 0.25)[1]} r={(80 + 260 * s) * cam.scale(PS.z - 0.25, 0, -230)} fill="url(#va-vapeur)" opacity={(1 - s) * 0.9} />});
  }
  const flash = i === 1 ? interpolate(t, [5, 7, 12, 16], [0, 0.8, 0.15, 0], clamp) : 0;
  return (
    <Plan f={fg} cam={cam} decor={decor} items={items} noir={i === 0 ? 0.25 : 0.12} zoom={i === 1 ? 1.04 + 0.1 * Math.min(1, t / 8) : doux(t)} roll={[1, tremble(fg, 4, 'rr'), -3, 1, 4][i]}
      dessus={<rect width="1080" height="1920" fill="#ff1a1a" opacity={flash} />} />
  );
});

// 12. Une alarme. Au fond de la salle, une capsule de secours s'allume. Une seule place.
const Alarme = scene('alarme', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const sas = i === 1 ? interpolate(t, [4, 26], [0, 1], ease) : 0;
  const cams = [
    () => vise([-1250 + 150 * k, -650, 0.4 + 0.3 * k], [100, -100, 3.8]),
    () => vise([-500 + 100 * k, -330, 3.2 + 0.4 * k], [1400, -100, 4.5]),
  ];
  const cam = makeCam(cams[i]());
  const decor = salleEcrans(cam, fg, {flux: fluxHall(fg, CCTV_VISAGE(1), MIENNE_TWIST), alarme: 1, sas, lumiere: 0.6});
  const items = [alien3D(cam, {x: PA.x, z: PA.z, angle: 20, f: fg, penche: 30, yeux: 1, id: 'al5'})];
  items.push({z: PS.z, x: PS.x, el: <Perso cam={cam} id={`al${i}`} x={PS.x} z={PS.z} dos={cam.x > 900 ? false : dosPour(cam, PS.z, 1)} lum={0.8} teinte={[1.15, 0.7, 0.7]} worry={1} eyes={1.4} pupilX={i === 1 ? 9 : 0} sweat={1} />});
  return <Plan f={fg} cam={cam} decor={decor} items={items} noir={0.12} zoom={doux(t)} roll={[-2, 2][i]} />;
});

// 13. Tu sautes dans la capsule… ou tu retournes réveiller l'autre toi ?
const Dilemme = scene('dilemme', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const cams = [
    () => vise([-150, -380, 7.3 - 0.3 * k], [200, -250, 3.6]),
    () => vise([PA.x + 160 - 40 * k, -680, PA.z + 1.05], [PA.x, -560, PA.z + 0.35]),
  ];
  const cam = makeCam(cams[i]());
  const decor = salleEcrans(cam, fg, {flux: fluxHall(fg, CCTV_VISAGE(1), MIENNE_TWIST), alarme: 0.6, sas: 1, lumiere: 0.6});
  const items = [alien3D(cam, {x: PA.x, z: PA.z, angle: 0, f: fg, penche: 32 + 6 * Math.sin(fg / 25), yeux: 1, gueule: 0.1, id: 'al6'})];
  if (i === 0) items.push({z: PS.z, x: PS.x, el: <Perso cam={cam} id="di" x={PS.x} z={PS.z} lum={0.8} teinte={VERT} worry={1} eyes={1.3} pupilX={-7} sweat={1} />});
  const dis = R('ou', 50) + 30;
  return (
    <Plan f={fg} cam={cam} decor={decor} items={items} noir={0.12} zoom={doux(t)} roll={0}
      dessus={
        <g>
          <Choix f={f} debut={R('sautes', 10)} x={540} y={250} texte="JE RENTRE SUR TERRE" emoji="1f680" couleur="#3ad86a" />
          <Choix f={f} debut={R('réveiller', 90)} x={540} y={450} texte="JE RÉVEILLE L'AUTRE MOI" emoji="1f6cc" couleur="#ff3a4a" />
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

const COMPOSANTS = {reveil: Reveil, sortie: Sortie, capsules: Capsules, hublot: Hublot, conduit: Conduit, grille: Grille, fuite: Fuite, ecrans: Ecrans, double: Double, question: Question, alien: Alien, alarme: Alarme, dilemme: Dilemme};
export const LeVaisseau = () => (
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
