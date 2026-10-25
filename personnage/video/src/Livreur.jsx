import {AbsoluteFill, Easing, interpolate, random, Series, spring, staticFile, useCurrentFrame} from 'remotion';
import {appart, COULOIR, LivreurPerso, NOTRE, palier, PLAF, quartier} from './Appart';
import {Telephone} from './Maison';
import {surveillant3D} from './Monstre3D';
import {camFace, dosPour, montage, Plan, punch} from './montage';
import {clamp, Finition, makeCam, marche, orbite, Perso} from './moteur';
import PLANS from './livreur/plans.json';
import timeline from './livreur/timeline.json';

// « Le livreur » : on toque à ta porte… au moment où ton livreur t'écrit qu'il arrive dans 5 minutes.
const {DUREES, decoupe, repere, SCENES} = montage(timeline, PLANS);
export const DUREE_LIVREUR = SCENES.reduce((t, [, d]) => t + d, 0);

const ease = {...clamp, easing: Easing.inOut(Easing.sin)};
const SOIR = [1.05, 0.9, 0.78]; // lumière chaude des lampes
const TELE = [0.8, 0.9, 1.15]; // lueur du téléphone / de la TV
const RUE = [0.95, 0.85, 0.75];
const P0 = {x: 820, z: 1.9}; // devant la TV
const PP = {x: 850, z: 5.45}; // devant la porte d'entrée
const PF = {x: -1220, z: 2.6}; // à la fenêtre
const VRAI = {x: -760, z: 7.35}; // le vrai livreur, sous le lampadaire
const JU = {x: 850, y: -160, z: 6.02, yaw: 0};
const NOM = 'Livreur 🛵';
const MSG1 = repere('message', 'jarrive', 101);
const MSG2 = repere('message2', 'je', 49);
const MSG3 = repere('alerte', 'ne', 80);

// coups contre la porte : renvoie la force du choc (0 → 1) à l'image f
const chocs = (f, liste, fort = 1) => liste.reduce((v, c) => Math.max(v, fort * interpolate(f, [c, c + 1, c + 7], [0, 1, 0], clamp)), 0);
const tremble = (f, k, cle) => k * (random(`${cle}${f}`) - 0.5);
// néon du palier qui grésille
const gresille = (f, graine) => (random(`${graine}${Math.floor(f / 3)}`) < 0.12 ? 0.25 : 1);

// le voile sombre + le téléphone par-dessus la scène
const ecran = (f, props, voile = 0.55) => (
  <g>
    <rect width="1080" height="1920" fill="#000" opacity={voile} />
    <Telephone f={f} nom={NOM} {...props} />
  </g>
);

// La vue à travers le judas : grand angle, image ronde, bord noir, reflet du verre
const Judas = ({f, cam, decor, items = [], zoom = 1, roll = 0, noir = 0}) => {
  const tous = [...decor.items, ...items].filter((o) => o && o.el).sort((a, b) => cam.profondeur(b.z, b.x ?? cam.x, b.y ?? cam.y) - cam.profondeur(a.z, a.x ?? cam.x, a.y ?? cam.y));
  const R = 470;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <defs>
          <clipPath id="ju-c">
            <circle cx="540" cy="900" r={R} />
          </clipPath>
          <radialGradient id="ju-v" cx="540" cy="900" r={R} gradientUnits="userSpaceOnUse">
            <stop offset="0.5" stopColor="#000" stopOpacity="0" />
            <stop offset="0.86" stopColor="#000" stopOpacity="0.75" />
            <stop offset="1" stopColor="#000" stopOpacity="1" />
          </radialGradient>
          <radialGradient id="ju-bois" cx="540" cy="900" r="900" gradientUnits="userSpaceOnUse">
            <stop offset="0.5" stopColor="#1a120c" />
            <stop offset="1" stopColor="#050302" />
          </radialGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#ju-bois)" />
        <g clipPath="url(#ju-c)">
          <rect width="1080" height="1920" fill="#000" />
          <g transform={`rotate(${roll} 540 900) translate(540 900) scale(${0.52 * zoom}) translate(-540 -820)`}>
            {decor.fond}
            {decor.brume}
            {tous.map((o, i) => (
              <g key={i}>{o.el}</g>
            ))}
          </g>
          <rect width="1080" height="1920" fill="#000" opacity={noir} />
          <circle cx="540" cy="900" r={R} fill="url(#ju-v)" />
          <path d={`M${540 - R * 0.7},${900 - R * 0.35} Q${540 - R * 0.4},${900 - R * 0.8} ${540 + R * 0.1},${900 - R * 0.82}`} stroke="#fff" strokeWidth="14" fill="none" opacity="0.07" strokeLinecap="round" />
        </g>
        <circle cx="540" cy="900" r={R + 8} fill="none" stroke="#0b0806" strokeWidth="26" />
        <circle cx="540" cy="900" r={R + 26} fill="none" stroke="#2a2016" strokeWidth="8" opacity="0.6" />
        <Finition f={f} vignette={0.95} />
      </svg>
    </AbsoluteFill>
  );
};

// ---------- 1. On toque ----------
const Coups = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('coups', f);
  const k0 = repere('coups', 'toque', 58);
  const choc = chocs(f, [k0, k0 + 7, k0 + 14]);
  const cams = [
    () => ({x: -1050, y: -380, z: 0.5 + (0.35 * t) / d, yaw: 26, pitch: 9}),
    () => ({x: 830, y: -170, z: 3.4 + (0.6 * t) / d, yaw: 0}),
    () => ({x: 720 + tremble(f, 30 * choc, 'c1'), y: -40, z: 4.7, yaw: 5, pitch: -3}),
    () => camFace(P0.x, P0.z, 1, 0.8, t, d, {dy: -20}),
  ];
  const cam = makeCam(cams[i]());
  const decor = appart(cam, f, {choc, fente: interpolate(f, [k0 - 10, k0], [0, 1], clamp)});
  const tourne = interpolate(f, [k0 + 2, k0 + 8], [0, 1], clamp);
  return (
    <Plan f={f} cam={cam} decor={decor} noir={0.1} zoom={punch(t) + choc * 0.05} roll={[-2, 0, 3, -4][i]}
      items={[{z: P0.z, x: P0.x, el: <Perso cam={cam} id="l1" x={P0.x} z={P0.z} dos={dosPour(cam, P0.z, 1)} lum={0.85} teinte={SOIR} pupilX={-6 + 6 * tourne} pupilY={2} eyes={1 + 0.25 * tourne} worry={0.5 * tourne} breath={Math.sin(f / 8) * 3} />}]}
    />
  );
};

// ---------- 2. Au même moment, ton téléphone vibre ----------
const Message = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('message', f);
  const vib = repere('message', 'vibre', 56);
  const vibre = interpolate(f, [vib, vib + 24], [1, 0], clamp);
  const cams = [
    () => camFace(P0.x, P0.z, 1, 0.5, t, d, {dy: -30}),
    () => ({x: 300, y: -250, z: 1.6, yaw: 15}),
    () => ({x: 300, y: -250, z: 1.6, yaw: 15}),
  ];
  const cam = makeCam(cams[i]());
  const decor = appart(cam, f, {});
  const tel = [
    null,
    ecran(f, {verrouille: true, notif: {debut: vib, texte: "J'arrive dans 5 minutes 👍"}, echelle: 0.85, y: 1100, vibre}, 0.3),
    ecran(f, {messages: [{debut: MSG1, texte: "J'arrive dans 5 minutes 👍"}], echelle: 1.05 + (0.15 * t) / d, y: 980}, 0.5),
  ][i];
  return (
    <Plan f={f} cam={cam} decor={decor} noir={0.1} zoom={punch(t)} roll={[3, -2, 0][i]}
      items={[{z: P0.z, x: P0.x, el: <Perso cam={cam} id="l2" x={P0.x} z={P0.z} dos={dosPour(cam, P0.z, 1)} lum={0.85} teinte={i === 0 ? TELE : SOIR} worry={0.8} eyes={1.2} pupilY={5} breath={Math.sin(f / 7) * 3} />}]}
      dessus={tel}
    />
  );
};

// ---------- 3. Alors… qui est devant ta porte ? ----------
const Question = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('question', f);
  const cams = [
    () => ({x: 300, y: -250, z: 1.6, yaw: 15}),
    () => ({x: 850, y: -150, z: 3.2 + (1.4 * t) / d, yaw: 0}),
    () => camFace(P0.x, P0.z, 1, 0.42, t, d, {dy: -30, dx: 40}),
  ];
  const cam = makeCam(cams[i]());
  const decor = appart(cam, f, {fente: 1});
  const tel = i === 0 ? ecran(f, {messages: [{debut: -400, texte: "J'arrive dans 5 minutes 👍"}], echelle: 2.2, y: 20, x: 640}, 0.6) : null;
  return (
    <Plan f={f} cam={cam} decor={decor} noir={0.12} zoom={punch(t, 0.16)} roll={[-3, 4, -6][i]}
      items={[{z: P0.z, x: P0.x, el: <Perso cam={cam} id="l3" x={P0.x} z={P0.z} dos={dosPour(cam, P0.z, 1)} lum={0.85} teinte={SOIR} worry={1} eyes={1.3} pupilX={Math.sin(f / 4) * 4} sweat={0.4} breath={Math.sin(f / 6) * 3} />}]}
      dessus={tel}
    />
  );
};

// ---------- 4. Le judas ----------
const Judas1 = () => {
  const f = useCurrentFrame();
  const {i, t, d, bornes} = decoupe('judas', f);
  // il marche jusqu'à la porte pendant le premier plan
  const k = interpolate(f, [0, bornes[1] + 4], [0, 1], {...clamp, easing: Easing.inOut(Easing.quad)});
  const x = P0.x + (PP.x - P0.x) * k;
  const z = P0.z + (PP.z - P0.z) * k;
  const m = marche(f, 0.32, k < 1 ? 0.8 : 0);
  const penche = interpolate(f, [bornes[3], bornes[4], bornes[5], DUREES.judas], [4, 9, 9, 24], clamp);
  const avance = interpolate(f, [bornes[5] + 6, DUREES.judas], [0, 0.32], ease);
  const nn = () => gresille(f, 'jn');
  if (i === 1 || i === 3 || i === 5) {
    const cam = makeCam(JU);
    const decor = palier(cam, f, {neon: (n) => (n === 1 ? nn() : 1), faux: {x: 850, z: 6.62 - avance, tilt: -penche, sy: 1.12}});
    return <Judas f={f} cam={cam} decor={decor} zoom={[1, 1, 1, 1.12, 1, 1.22][i] + (0.08 * t) / d} roll={[0, 0, 0, -2, 0, 3][i]} />;
  }
  const cams = {
    0: () => ({x: x + 120, y: -280, z: z - 1.7, yaw: 4, pitch: 4}),
    2: () => camFace(PP.x, PP.z, 1, 0.33, t, d, {dy: -10, push: 0.04}),
    4: () => camFace(PP.x, PP.z, 1, 0.3, t, d, {dy: -20, dx: -40, push: 0.04}),
  };
  const cam = makeCam(cams[i]());
  const decor = appart(cam, f, {fente: 1});
  return (
    <Plan f={f} cam={cam} decor={decor} noir={0.12} zoom={punch(t)} roll={[2, 0, -3, 0, 5, 0][i]}
      items={[{z, x, el: <Perso cam={cam} id="l4" x={i === 0 ? x : PP.x} z={i === 0 ? z : PP.z} dos={dosPour(cam, i === 0 ? z : PP.z, 1)} lum={0.8} teinte={SOIR} lift={m.bob} legG={m.legG} legD={m.legD} epauleG={m.bras} epauleD={-m.bras} worry={1} eyes={i === 2 ? 0.55 : 1.3} pupilX={i === 2 ? 0 : 3} sweat={i === 4 ? 1 : 0.3} breath={Math.sin(f / 5) * 3} shiver={i === 4 ? tremble(f, 4, 'l4') : 0} />}]}
    />
  );
};

// ---------- 5. Il dit ton prénom ----------
const Prenom = () => {
  const f = useCurrentFrame();
  const {i, t, d, bornes} = decoupe('prenom', f);
  const r1 = repere('prenom', 'retoque', 8);
  const r2 = repere('prenom', 'plus', 28);
  const choc = Math.max(chocs(f, [r1, r1 + 6, r1 + 12], 0.7), chocs(f, [r2 + 2, r2 + 8, r2 + 14], 1.4));
  const recule = interpolate(f, [bornes[4], bornes[5]], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
  const z = PP.z - 1.1 * recule;
  const nom = interpolate(f, [repere('prenom', 'prénom', 102) - 4, repere('prenom', 'prénom', 102) + 6], [0, 1], clamp);
  const cams = [
    () => ({x: 700 + tremble(f, 30 * choc, 'p0'), y: -150, z: 4.6, yaw: 6}),
    () => ({x: 560 + tremble(f, 40 * choc, 'p1'), y: 250, z: 4.3, yaw: 14, pitch: -14}),
    () => ({x: 770, y: 392, z: 5.5 + (0.08 * t) / d, yaw: 6, pitch: -3}),
    () => camFace(PP.x, PP.z, 1, 0.3, t, d, {dy: -15, push: 0.05}),
    () => ({x: 820, y: -250, z: 3.4, yaw: 1}),
    () => camFace(PP.x, z, 1, 0.55, t, d, {dy: -10, push: 0.2}),
  ];
  const cam = makeCam(cams[i]());
  const pied = Math.sin(f / 9) * 0.5 + 0.5;
  const decor = appart(cam, f, {choc, fente: 0.9 + 0.1 * pied});
  const m = marche(f, 0.25, recule > 0 && recule < 1 ? 0.6 : 0);
  return (
    <Plan f={f} cam={cam} decor={decor} noir={0.14} zoom={punch(t, 0.16) + choc * 0.06} roll={[3, -6, 0, 4, -3, 7][i]}
      items={[i !== 2 && {z, x: PP.x, el: <Perso cam={cam} id="l5" x={PP.x} z={z} dos={dosPour(cam, z, 1)} lum={0.75} teinte={SOIR} lift={m.bob} legG={m.legD} legD={m.legG} worry={1} eyes={1.25 + 0.2 * nom} scream={i === 5 ? 0.5 : 0} sweat={1} shiver={tremble(f, 3 + 4 * nom, 'l5')} epauleG={i === 5 ? 25 : 0} coudeG={i === 5 ? 100 : 0} epauleD={i === 5 ? -25 : 0} coudeD={i === 5 ? -100 : 0} breath={Math.sin(f / 4) * 4} />}]}
    />
  );
};

// ---------- 6. Je suis en bas de ton immeuble ----------
const Message2 = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('message2', f);
  const vib = repere('message2', 'vibre', 23);
  const cam = makeCam({x: 600, y: -300, z: 2.6, yaw: 8});
  const decor = appart(cam, f, {fente: 0});
  const msgs = [{debut: -400, texte: "J'arrive dans 5 minutes 👍"}, {debut: MSG2, texte: 'Je suis en bas de ton immeuble 🛵'}];
  const tel = [
    ecran(f, {verrouille: true, notif: {debut: vib, texte: 'Je suis en bas de ton immeuble 🛵'}, echelle: 0.85, y: 1100, vibre: interpolate(f, [vib, vib + 22], [1, 0], clamp)}, 0.35),
    ecran(f, {messages: msgs, echelle: 1.05 + (0.12 * t) / d, y: 980}, 0.55),
  ][i];
  return <Plan f={f} cam={cam} decor={decor} noir={0.12} zoom={punch(t)} roll={[-2, 0][i]} items={[]} dessus={tel} />;
};

// ---------- 7. À la fenêtre ----------
// cadre de la fenêtre et rideaux, en bord d'image (vue plongeante)
const BordFenetre = ({f}) => (
  <g>
    <path d={`M0,0 L${120 + Math.sin(f / 20) * 10},0 Q${160},960 ${110 + Math.sin(f / 17) * 14},1920 L0,1920 Z`} fill="#4a1e1a" />
    <path d={`M1080,0 L${980 - Math.sin(f / 19) * 10},0 Q${930},960 ${985},1920 L1080,1920 Z`} fill="#4a1e1a" />
    <rect x="0" y="1780" width="1080" height="140" fill="#1a1612" />
    <rect x="0" y="1760" width="1080" height="30" fill="#d8d0c4" opacity="0.5" />
  </g>
);
const Fenetre = () => {
  const f = useCurrentFrame();
  const {i, t, d, bornes} = decoupe('fenetre', f);
  const signe = repere('fenetre', 'fait', 188) - 10;
  const leve = interpolate(f, [repere('fenetre', 'lève', 150), repere('fenetre', 'tête', 163)], [0, 1], clamp);
  const coucou = f > signe ? 1 : 0;
  const livreur = {...VRAI, pupilY: -7 * leve, eyes: 1, smile: 0.4 * coucou, epauleD: -150 * coucou, coudeD: coucou * (-10 + Math.sin(f / 3) * 30)};
  if (i >= 2) {
    const cams = {
      2: () => ({x: 0, y: NOTRE.y1 - 180, z: 9.72, yaw: 180 + Math.sin(f / 30) * 3, pitch: 46 + (10 * t) / d}),
      3: () => ({x: -500, y: -2500, z: 9.85, yaw: 184, pitch: 48}),
      4: () => ({x: -650, y: -1500, z: 9.3, yaw: 178, pitch: 45}),
    };
    const cam = makeCam(cams[i]());
    const decor = quartier(cam, f, {livreur});
    return (
      <Plan f={f} cam={cam} decor={decor} noir={0.08} zoom={[1, 1, 1 + (0.15 * t) / d, 1.1 + (0.25 * t) / d, 1.25 + (0.15 * t) / d][i]} roll={[0, 0, -4 + (6 * t) / d, 2, -2][i]} dessus={i === 2 ? <BordFenetre f={f} /> : null} />
    );
  }
  // il traverse le salon jusqu'à la fenêtre, puis ouvre les rideaux
  const k = interpolate(f, [0, bornes[1]], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
  const x = i === 0 ? -100 + (PF.x - -100) * k : PF.x;
  const z = i === 0 ? 1.5 + (PF.z - 1.5) * k : PF.z;
  const rideau = interpolate(f, [bornes[1] + 4, bornes[2] - 4], [0, 1], ease);
  const m = marche(f, 0.32, i === 0 && k < 0.98 ? 0.8 : 0);
  const cams = [() => ({x: x + 1000, y: -260, z: z - 0.1, yaw: -90, pitch: 3}), () => ({x: -650, y: -220, z: 0.9, yaw: -20, pitch: 2})];
  const cam = makeCam(cams[i]());
  const decor = appart(cam, f, {rideau: i === 0 ? 0 : rideau});
  const bras = i === 1 ? Math.sin(rideau * Math.PI) : 0;
  return (
    <Plan f={f} cam={cam} decor={decor} noir={0.12} zoom={punch(t)} roll={[-2, 3][i]}
      items={[{z, x, el: <Perso cam={cam} id="l7" x={x} z={z} dos={cam.x > x} lum={0.75} teinte={SOIR} lift={m.bob} legG={m.legG} legD={m.legD} epauleG={m.bras + 60 * bras} coudeG={40 * bras} epauleD={-m.bras - 60 * bras} coudeD={-40 * bras} worry={1} eyes={1.2} breath={Math.sin(f / 6) * 3} />}]}
    />
  );
};

// ---------- 8. Il arrête. Il regarde au-dessus de ta fenêtre ----------
const Arrete = () => {
  const f = useCurrentFrame();
  const {i, t, d, bornes} = decoupe('arrete', f);
  const stop = repere('arrete', 'arrête', 31);
  const tombe = interpolate(f, [repere('arrete', 'bras', 56), repere('arrete', 'retombe', 62) + 6], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
  const coucou = f < stop ? 1 : Math.max(0, 1 - tombe);
  const plusHaut = interpolate(f, [repere('arrete', 'regarde', 89), repere('arrete', 'haut', 115)], [0, 1], ease);
  const forme = interpolate(f, [bornes[2] + 10, bornes[2] + 40], [0.15, 1], clamp);
  const livreur = {...VRAI, pupilY: -7 - 3 * plusHaut, eyes: 1 + 0.35 * (1 - coucou), worry: 1 - coucou, smile: 0.4 * coucou * (f < stop ? 1 : 0), epauleD: -150 * coucou, coudeD: f < stop ? -10 + Math.sin(f / 3) * 30 : -10 * coucou, tilt: -4 * plusHaut};
  const cams = [
    () => ({x: -650, y: -1500, z: 9.3, yaw: 178, pitch: 45}),
    () => ({x: -1250, y: 120, z: 5.6, yaw: 18, pitch: -22}),
    () => ({x: 350, y: -150, z: 7.7, yaw: -6, pitch: -63 - (6 * t) / d}),
    () => ({x: 250, y: -4650, z: 7.9 + (0.25 * t) / d, yaw: -4, pitch: -12}),
  ];
  const cam = makeCam(cams[i]());
  const dansFenetre = i >= 2 ? <Perso cam={cam} id="l8f" x={0} y={NOTRE.y1 + 330} z={10.5} lum={0.8} teinte={SOIR} worry={1} eyes={1.2} pupilY={7} epauleG={10} epauleD={-10} ombre={0} /> : null;
  const decor = quartier(cam, f, {livreur, forme: i >= 2 ? forme : 0, dansFenetre});
  return <Plan f={f} cam={cam} decor={decor} noir={0.1} zoom={i === 0 ? 1.35 : i === 2 ? 1.5 + (0.2 * t) / d : punch(t)} roll={[-2, 4, -3 + (4 * t) / d, 3][i]} />;
};

// ---------- 9. « Ne sortez surtout pas » ----------
const Alerte = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('alerte', f);
  const bip = repere('alerte', 'bipe', 28);
  const flash = interpolate(f, [bip - 1, bip, bip + 8], [0, 0.55, 0], clamp);
  const cams = [() => ({x: PF.x + 450, y: -180, z: PF.z + 0.15, yaw: -90}), () => ({x: -600, y: -300, z: 2.9, yaw: -80}), () => ({x: -600, y: -300, z: 2.9, yaw: -80}), () => ({x: PF.x + 380, y: -170, z: PF.z, yaw: -90})];
  const cam = makeCam(cams[i]());
  const decor = appart(cam, f, {rideau: 1});
  const msgs = [{debut: -800, texte: "J'arrive dans 5 minutes 👍"}, {debut: -400, texte: 'Je suis en bas de ton immeuble 🛵'}, {debut: MSG3, texte: 'Ne sortez surtout pas.', gras: true, alerte: true}];
  const rouge = interpolate(f, [MSG3, MSG3 + 20], [0, 0.35], clamp);
  const tel = [
    null,
    ecran(f, {messages: msgs, echelle: 1.05, y: 980}, 0.55),
    <g key="t2">
      {ecran(f, {messages: msgs, echelle: 1.7 + (0.2 * t) / d, y: 300, x: 640}, 0.65)}
      <rect width="1080" height="1920" fill="#5a0008" opacity={rouge} />
    </g>,
    <rect key="t3" width="1080" height="1920" fill="#5a0008" opacity={0.3} />,
  ][i];
  // vu depuis la fenêtre : il nous fait face, le visage éclairé par le téléphone
  return (
    <Plan f={f} cam={cam} decor={decor} noir={0.18} zoom={punch(t, 0.18)} roll={[3, 0, -2, -6][i]}
      items={[{z: PF.z, x: PF.x, el: <Perso cam={cam} id="l9" x={PF.x} z={PF.z} dos={cam.x > PF.x + 400 && i === 1} lum={0.8} teinte={TELE} worry={1} eyes={1.3} pupilY={6} sweat={1} scream={i === 3 ? 0.6 : 0} shiver={i === 3 ? tremble(f, 7, 'l9') : 0} breath={Math.sin(f / 4) * 4} />}]}
      dessus={
        <g>
          {tel}
          <rect width="1080" height="1920" fill="#ff1a2a" opacity={flash} />
        </g>
      }
    />
  );
};

// ---------- 10. Il n'y a plus personne ----------
const Vide = () => {
  const f = useCurrentFrame();
  const {i, t, d, bornes} = decoupe('vide', f);
  const coupe = (n) => (f > bornes[2] + 6 + n * 7 ? 0 : n === 1 ? gresille(f, 'vn') : 1);
  if (i === 1 || i === 2) {
    const cam = makeCam(JU);
    const decor = palier(cam, f, {neon: coupe, sac: 1});
    return <Judas f={f} cam={cam} decor={decor} zoom={(i === 1 ? 1 : 1.1) + (0.1 * t) / d} />;
  }
  const k = interpolate(f, [0, bornes[1]], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
  const x = i === 0 ? 400 + (PP.x - 400) * k : PP.x;
  const z = i === 0 ? 4.3 + (PP.z - 4.3) * k : PP.z;
  const m = marche(f, 0.34, i === 0 && k < 0.98 ? 0.8 : 0);
  const cams = {0: () => ({x: x - 150, y: -260, z: z - 1.6, yaw: -3}), 3: () => camFace(PP.x, PP.z, 1, 0.34, t, d, {dy: -15, push: 0.04})};
  const cam = makeCam(cams[i]());
  const decor = appart(cam, f, {tv: 0, lampes: 0.6});
  return (
    <Plan f={f} cam={cam} decor={decor} noir={0.2} zoom={punch(t)} roll={[2, 0, 0, -3][i]}
      items={[{z, x, el: <Perso cam={cam} id="l10" x={x} z={z} dos={dosPour(cam, z, 1)} lum={0.6} teinte={SOIR} lift={m.bob} legG={m.legG} legD={m.legD} epauleG={m.bras} epauleD={-m.bras} worry={1} eyes={i === 3 ? 1.35 : 1.2} sweat={1} breath={Math.sin(f / 5) * 3} />}]}
    />
  );
};

// ---------- 11. Le bruit dans la chambre ----------
const Bruit = () => {
  const f = useCurrentFrame();
  const {i, t, d, bornes} = decoupe('bruit', f);
  const boom = bornes[1];
  const choc = interpolate(f, [boom, boom + 1, boom + 16], [0, 1, 0], clamp);
  const cadre = interpolate(f, [boom + 2, boom + 12], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
  const ombre = interpolate(f, [repere('bruit', 'ombre', 94) - 2, repere('bruit', 'porte', 122) + 4], [-1, 1.6], clamp);
  const cams = [
    () => ({x: -1100, y: -420, z: 0.6, yaw: 30, pitch: 10}),
    () => ({x: 100 + tremble(f, 70 * choc, 'b1'), y: -300 + tremble(f, 50 * choc, 'b1y'), z: 4.6, yaw: -14}),
    () => camFace(PP.x, PP.z, -1, 0.75, t, d, {dy: -20}),
    () => ({x: 900, y: -120, z: 1.2, yaw: 90, pitch: 2}),
  ];
  const cam = makeCam(cams[i]());
  const decor = appart(cam, f, {tv: 0, lampes: 0.6, cadre, fenteChambre: i === 3 ? ombre : null, lumiereChambre: 0.8});
  const peur = interpolate(f, [bornes[2], bornes[2] + 6], [0, 1], clamp);
  return (
    <Plan f={f} cam={cam} decor={decor} noir={0.2} zoom={punch(t, 0.2) + choc * 0.08} roll={[0, 6 * choc, -5, 2][i]}
      items={[{z: PP.z, x: PP.x, el: <Perso cam={cam} id="l11" x={PP.x} z={PP.z} dos={i === 2 ? false : dosPour(cam, PP.z, 1)} lum={0.6} teinte={SOIR} worry={1} eyes={1 + 0.4 * peur} scream={i === 2 ? peur * 0.8 : 0} sweat={1} shiver={tremble(f, 6 * peur + 10 * choc, 'l11')} epauleG={i === 2 ? 30 * peur : 0} coudeG={i === 2 ? 110 * peur : 0} epauleD={i === 2 ? -30 * peur : 0} coudeD={i === 2 ? -110 * peur : 0} />}]}
    />
  );
};

// ---------- 12. Tu pousses la porte… et il est là ----------
const MONSTRE = {x: 5300, z: 1.2};
const monstre = (cam, f, o = {}) => surveillant3D(cam, {x: MONSTRE.x, z: MONSTRE.z, y: PLAF, angle: -90, f, echelle: 1.15, tenue: 'livreur', pose: 1, plafond: true, cou: 180, penche: 80, ...o}).el;
const Chambre = () => {
  const f = useCurrentFrame();
  const {i, t, d, bornes} = decoupe('chambre', f);
  const pousse = repere('chambre', 'pousses', 37);
  const la = repere('chambre', 'là', 82);
  const porte = interpolate(f, [pousse, bornes[2], bornes[2] + 10], [0, 0.3, 1], {...clamp, easing: Easing.out(Easing.quad)});
  const ouvre = interpolate(f, [la - 8, la], [0, 1], clamp);
  const flash = interpolate(f, [la - 2, la, la + 8], [0, 0.6, 0], clamp);
  const cams = [
    () => ({x: 1750 + (1000 * t) / d, y: -170 + Math.sin(f / 4) * 8, z: 1.2, yaw: 90, pitch: 0}),
    () => ({x: 2550, y: -230, z: 1.15, yaw: 90}),
    () => ({x: 3380 + (60 * t) / d, y: -40, z: 1.2, yaw: 90, pitch: -24}),
  ];
  const cam = makeCam(cams[i]());
  const decor = appart(cam, f, {tv: 0, lampes: 0.5, porteChambre: porte, monstre: monstre(cam, f, {ouvre}), lumiereChambre: 0.8});
  const X = 3250;
  return (
    <Plan f={f} cam={cam} decor={decor} noir={0.16} zoom={punch(t, i === 2 ? 0.25 : 0.1)} roll={[0, 2, -6][i]}
      items={[i === 1 && {z: 1.2, x: X, el: <Perso cam={cam} id="l12" x={X} z={1.2} dos={true} lum={0.55} teinte={SOIR} epauleD={-75} coudeD={-55} breath={Math.sin(f / 4) * 3} />}]}
      dessus={<rect width="1080" height="1920" fill="#ffe9e0" opacity={flash} />}
    />
  );
};

// ---------- 13. Le dilemme ----------
const Choix = ({f, debut, x, y, texte, emoji, couleur}) => {
  const p = spring({frame: f - debut, fps: 30, config: {damping: 9}});
  if (f < debut) return null;
  const w = 210 + texte.length * 29;
  return (
    <g transform={`translate(${x} ${y}) scale(${p}) rotate(${(1 - p) * -12})`}>
      <rect x={-w / 2} y="-80" width={w} height="160" rx="28" fill="#0b0b0e" opacity="0.88" stroke={couleur} strokeWidth="6" />
      <image href={staticFile(`emoji/${emoji}.svg`)} x={-w / 2 + 24} y="-48" width="96" height="96" />
      <text x={-w / 2 + 140} y="17" textAnchor="start" fontFamily="'DejaVu Sans', Arial, sans-serif" fontWeight="900" fontSize="46" fill="#fff">
        {texte}
      </text>
    </g>
  );
};
// le monstre qui rampe au plafond (dans le salon, il sort du couloir)
const monstreSalon = (cam, f, x, z, angle) => surveillant3D(cam, {x, z, y: PLAF, angle, f: 400 + f * 0.5, echelle: 1.1, tenue: 'livreur', pose: 1, plafond: true, cou: 180, penche: 80, ouvre: 1});
// dans le couloir, il n'est visible que par l'ouverture
const parOuverture = (cam, el) => {
  const p = cam.poly([[COULOIR.x0, -380, COULOIR.z0], [COULOIR.x0, -380, COULOIR.z1], [COULOIR.x0, 432, COULOIR.z1], [COULOIR.x0, 432, COULOIR.z0]]);
  if (!p) return null;
  return (
    <g>
      <defs>
        <clipPath id="li-ouv">
          <polygon points={p} />
        </clipPath>
      </defs>
      <g clipPath="url(#li-ouv)">{el}</g>
    </g>
  );
};
const Dilemme = () => {
  const f = useCurrentFrame();
  const {i, t, d, bornes} = decoupe('dilemme', f);
  const PD = {x: 300, z: 4.2};
  // le monstre sort du couloir en rampant au plafond, puis fonce vers lui
  const k4 = interpolate(f, [bornes[4], DUREES.dilemme], [0, 1], clamp);
  const xm = i === 3 ? interpolate(f, [bornes[3], bornes[4]], [3100, 1700], clamp) : 1350 - 850 * k4;
  const zm = i === 3 ? 1.2 : 1.2 + 1.6 * k4;
  const cams = [
    () => orbite(4550, MONSTRE.z, 0.8, 72 + (36 * t) / d, 100, {pitch: -34}),
    () => ({x: 3470, y: -150, z: 1.2, yaw: -90}),
    () => ({x: -1200, y: -380, z: 1.0 + (0.3 * t) / d, yaw: 30, pitch: 7}),
    () => ({x: -200, y: -150, z: 1.22, yaw: 88, pitch: -14}),
    () => ({x: -150, y: -60, z: 5.4 - (0.2 * t) / d, yaw: 158, pitch: -16}),
  ];
  const cam = makeCam(cams[i]());
  const enChambre = i === 0;
  const decor = appart(cam, f, {tv: 0, lampes: 0.5, porteChambre: 1, monstre: enChambre ? monstre(cam, 400 + f, {ouvre: 1}) : null, lumiereChambre: 0.8});
  const items = [];
  if (i === 1) items.push({z: 1.2, x: 3000, el: <Perso cam={cam} id="l13" x={3000} z={1.2} lum={0.55} teinte={SOIR} worry={1} eyes={1.4} scream={1} sweat={1} epauleG={30} coudeG={120} epauleD={-30} coudeD={-120} shiver={tremble(f, 9, 'l13')} />});
  if (i >= 3) {
    const m = monstreSalon(cam, f, xm, zm, -90 + 65 * k4);
    items.push({z: zm, x: xm, y: PLAF, el: xm > COULOIR.x0 ? parOuverture(cam, m.el) : m.el});
  }
  if (i === 2 || i === 4) items.push({z: PD.z, x: PD.x, el: <Perso cam={cam} id="l14" x={PD.x} z={PD.z} dos={i === 4} lum={0.6} teinte={SOIR} worry={1} eyes={1.35} sweat={1} pupilX={-5} pupilY={-5} breath={Math.sin(f / 3) * 4} shiver={tremble(f, 4, 'l14')} />});
  return (
    <Plan f={f} cam={cam} decor={decor} noir={0.16} zoom={(i === 2 ? 1.35 : 1) * punch(t)} roll={[-4, 6, 0, -5, 0][i]} items={items}
      dessus={
        <g>
          <Choix f={f} debut={repere('dilemme', 'cours', 28)} x={540} y={200} texte="REJOINDRE LE LIVREUR ?" emoji="1f6f5" couleur="#3ad86a" />
          <Choix f={f} debut={repere('dilemme', 'tenfermes', 91)} x={540} y={400} texte="LA SALLE DE BAIN ?" emoji="1f6bf" couleur="#8fd3ff" />
          {f >= repere('dilemme', 'dis-le', 136) && (
            <g transform={`translate(540 1680) scale(${spring({frame: f - repere('dilemme', 'dis-le', 136), fps: 30, config: {damping: 10}})})`}>
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
};

const COMPOSANTS = {coups: Coups, message: Message, question: Question, judas: Judas1, prenom: Prenom, message2: Message2, fenetre: Fenetre, arrete: Arrete, alerte: Alerte, vide: Vide, bruit: Bruit, chambre: Chambre, dilemme: Dilemme};

export const Livreur = () => (
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

export {LivreurPerso};
