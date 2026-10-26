import {AbsoluteFill, Easing, interpolate, random, Series, useCurrentFrame} from 'remotion';
import {Bonhomme} from './Bonhomme';
import {montage, Plan, punch} from './montage';
import {clamp, Finition, makeCam, marche, Perso} from './moteur';
import {SOL} from './Rue';
import {capsule, Dormeur, GRIFFEE, gyro, hall, HUBLOT, MA_CAPSULE, POD, POD_Z} from './Vaisseau';
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

// (parties 2 à 4 : à venir) plan d'attente sur la salle
const Attente = scene('conduit', ({fg, t}) => {
  const cam = makeCam(vise([0, -300, 6], [0, -300, 20]));
  return <Plan f={fg} cam={cam} decor={hall(cam, fg)} items={capsules(cam, fg, {mienne: {ouvre: 1, vide: true, buee: 0}})} noir={0.5} zoom={doux(t)} />;
});

const COMPOSANTS = {reveil: Reveil, sortie: Sortie, capsules: Capsules, hublot: Hublot};
export const LeVaisseau = () => (
  <Series>
    {SCENES.map(([nom, d]) => {
      const C = COMPOSANTS[nom] || Attente;
      return (
        <Series.Sequence key={nom} durationInFrames={d}>
          <C />
        </Series.Sequence>
      );
    })}
  </Series>
);
