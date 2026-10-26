import {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Easing, interpolate, random, Series, spring, staticFile, useCurrentFrame} from 'remotion';
import {appart} from './Appart';
import {BallonFoot, BouleOr, LUTRIN, marcheScene, SCENE_Y, stade, theatre} from './Gala';
import {Choix} from './Livreur';
import {Telephone} from './Maison';
import {surveillant3D} from './Monstre3D';
import {camFace, dosPour, montage, Plan, punch} from './montage';
import {clamp, makeCam, marche, orbite, Perso} from './moteur';
import {SOL} from './Rue';
import PLANS from './ballon/plans.json';
import timeline from './ballon/timeline.json';

// « Et si tu gagnais le Ballon d'Or… sans jamais avoir joué au foot ? »
// Pas de voix : une phrase entière à l'écran par scène (sous-titre posé, pas dynamique), musique + bruitages.
const {DUREES, decoupe, SCENES} = montage(timeline, PLANS);
export const DUREE_BALLON = SCENES.reduce((t, [, d]) => t + d, 0);

const CHAUD = [1.05, 0.9, 0.78];
const SCENE_L = [1.08, 0.98, 0.9]; // lumière des projecteurs
const TELE = [0.8, 0.9, 1.15];
const STADE = [0.95, 1, 1.08];
const COSTUME = {haut: '#1c1c24', hautO: '#34343e', pant: '#1c1c24'};
const MAILLOT = {haut: '#1a4ac8', hautO: '#e8e8f0', pant: '#f0f0f0', chaus: '#e8e8e8'};
const P0 = {x: 820, z: 1.9};
const ALLEE = {x: 0, z: -1.4};

export const PHRASES = {
  tv: ["Imagine : tu gagnes le ", "Ballon d'Or", "… alors que tu n'as jamais joué au foot de ta vie."],
  tel: ['Ton téléphone explose : ', '847 appels manqués', ' et des milliers de messages.'],
  arrivee: ['Le soir même, tu es à la cérémonie, en costume… et ', 'personne', ' ne sait qui tu es.'],
  enveloppe: ["Le présentateur ouvre l'enveloppe… et prononce ", 'TON nom', '.'],
  salle: ['Toute la salle se retourne vers toi. ', 'Silence total', '.'],
  joueurs: ['Les plus grands joueurs du monde se demandent ', 'qui tu es', '.'],
  marche: ['Tu montes sur scène… et tu rates ', 'la première marche', '.'],
  trophee: ['On te tend le trophée. Il est ', 'beaucoup plus lourd', ' que prévu.'],
  discours: ['Ton discours : « Euh… je remercie ma mère. ', 'Et le Wi-Fi', '. »'],
  contrat: ["Le lendemain, un club t'appelle : ", 'contrat de 5 ans', '. Tu signes sans réfléchir.'],
  match: ['Premier match : tu touches le ballon une seule fois… ', 'avec la main', '.'],
  fin: ['Alors… tu le gardes, ou tu le rends ? ', 'Dis-le en commentaire', ' 👇'],
};

// les persos 3D (présentateur, joueurs, arbitre)
const humain = (cam, f, {x, z, y = SOL, angle = 180, couleurs, bras = null, echelle = 0.7}) =>
  surveillant3D(cam, {x, z, y, angle, f, echelle, tenue: 'vrai', casque: false, sac: false, couleurs, bras});
const CRAVATE = {jambe: '#15151a', bras: '#1a1a22', gilet: '#1a1a22', gilet2: '#121218', cheveux: '#2a1e16'};
const JOUEURS = [
  {x: -2300, couleurs: {...CRAVATE, cheveux: '#0e0e10', peau: '#8a5a3a', peau2: '#704830', main: '#8a5a3a'}},
  {x: -1100, couleurs: {...CRAVATE, gilet: '#2a1a3a', bras: '#2a1a3a', cheveux: '#c8a85a'}},
  {x: 1100, couleurs: {...CRAVATE, cheveux: '#3a2416', peau: '#c88a5a', peau2: '#a8704a', main: '#c88a5a'}},
  {x: 2300, couleurs: {...CRAVATE, gilet: '#3a3a44', bras: '#3a3a44', cheveux: '#0e0e10'}},
];

// ---------- 1. À la télé ----------
const TvDirect = ({f}) => (
  <g>
    <rect width="1540" height="320" fill="#0a0a1a" />
    <rect width="1540" height="320" fill="#ffd25a" opacity="0.08" />
    <g transform="translate(1250 150)">
      <BouleOr r={110} f={f} />
    </g>
    <rect x="30" y="26" width="200" height="46" rx="8" fill="#d81a2a" />
    <text x="130" y="60" fontSize="30" textAnchor="middle" fill="#fff" fontWeight="900" fontFamily="'MontEB', sans-serif">● DIRECT</text>
    <text x="40" y="150" fontSize="64" fill="#ffd25a" fontWeight="900" fontFamily="'MontEB', sans-serif">BALLON D'OR</text>
    <text x="40" y="215" fontSize="40" fill="#fff" fontWeight="900" fontFamily="'MontEB', sans-serif">LE VAINQUEUR EST… UN INCONNU ?!</text>
    <rect y="262" width="1540" height="58" fill="#d81a2a" />
    <text x={1540 - ((f * 6) % 3200)} y="303" fontSize="34" fill="#fff" fontWeight="900" fontFamily="'MontEB', sans-serif">
      INCROYABLE : PERSONNE NE SAIT QUI IL EST • IL N'A JAMAIS JOUÉ UN SEUL MATCH • LA FIFA EN PLEINE RÉUNION D'URGENCE •
    </text>
  </g>
);
const Tv = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('tv', f);
  const cams = [
    () => ({x: 20 + (120 * t) / d, y: -180, z: 3.15, yaw: 90, pitch: 1}),
    () => ({x: P0.x + 560, y: -160, z: P0.z + 0.05, yaw: -90}),
    () => ({x: -1050, y: -330, z: 0.5 + (0.35 * t) / d, yaw: 42, pitch: 3}),
  ];
  const cam = makeCam(cams[i]());
  const decor = appart(cam, f, {tvContenu: <TvDirect f={f} />});
  const choc = interpolate(f, [DUREES.tv * 0.4, DUREES.tv * 0.45], [0, 1], clamp);
  return (
    <Plan f={f} cam={cam} decor={decor} noir={0.04} zoom={punch(t)} roll={[0, -3, 2][i]}
      items={[{z: P0.z, x: P0.x, el: <Perso cam={cam} id="b1" x={P0.x} z={P0.z} dos={i === 2 ? false : cam.x < P0.x} lum={0.85} teinte={i === 1 ? TELE : CHAUD} eyes={1 + 0.4 * choc} scream={0.6 * choc} worry={0.3} epauleG={20 * choc} coudeG={110 * choc} epauleD={-20 * choc} coudeD={-110 * choc} breath={Math.sin(f / 8) * 3} />}]}
    />
  );
};

// ---------- 2. Le téléphone explose ----------
const NOTIFS = [
  ['Maman ❤️', "T'AS GAGNÉ LE BALLON D'OR ???", '#e83a5a'],
  ['Numéro masqué', 'Appel manqué (12)', '#888'],
  ['Le Journal du Foot', 'Qui est le mystérieux vainqueur ?', '#1a6ac8'],
  ['Mamie', 'tu fais du foot toi ?', '#e8a83a'],
  ['Ton ex', 'coucou ça va ? 🥺', '#a83ae8'],
  ['Téléphone', '847 appels manqués', '#3ad86a'],
];
const Tel = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('tel', f);
  const notifs = NOTIFS.map(([nom, texte, couleur], k) => ({debut: 8 + k * 11, nom, texte, couleur}));
  const vibre = 0.6 + 0.4 * Math.sin(f / 2);
  const cam = makeCam(i === 1 ? {x: P0.x + 520, y: -160, z: P0.z, yaw: -90} : {x: 300, y: -250, z: 1.6, yaw: 15});
  const decor = appart(cam, f, {tvContenu: <TvDirect f={f} />});
  const tel = [
    <Telephone key="a" f={f} verrouille notifs={notifs} echelle={0.85} y={1100} vibre={vibre} />,
    null,
    <Telephone key="c" f={f} verrouille notifs={notifs} echelle={1.5 + (0.15 * t) / d} y={1250} x={560} vibre={vibre * 0.6} />,
  ][i];
  return (
    <Plan f={f} cam={cam} decor={decor} noir={0.04} zoom={punch(t)} roll={[2, -4, 0][i]}
      items={[i === 1 && {z: P0.z, x: P0.x, el: <Perso cam={cam} id="b2" x={P0.x} z={P0.z} lum={0.85} teinte={TELE} eyes={1.35} worry={1} sweat={1} pupilY={5} breath={Math.sin(f / 5) * 3} shiver={(random(`b2${f}`) - 0.5) * 3} />}]}
      dessus={tel && <g><rect width="1080" height="1920" fill="#000" opacity="0.4" />{tel}</g>}
    />
  );
};

// ---------- 3. La cérémonie ----------
const Arrivee = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('arrivee', f);
  const k = interpolate(f, [0, DUREES.arrivee], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
  const z = -8.4 + (ALLEE.z + 8.4) * k;
  const m = marche(f, 0.3, k < 0.98 ? 0.8 : 0);
  const cams = [
    () => ({x: 120, y: -330, z: z - 1.7, yaw: 2, pitch: 1}),
    () => ({x: 3000, y: -3600, z: -9 + (1.5 * t) / d, yaw: -14, pitch: 24}),
    () => camFace(0, z, 1, 0.75, t, d, {dy: -30}),
  ];
  const cam = makeCam(cams[i]());
  const decor = theatre(cam, f, {ecran: 'logo', flashs: 1});
  return (
    <Plan f={f} cam={cam} decor={decor} noir={0.03} zoom={punch(t)} roll={[0, 3, -3][i]}
      items={[{z, x: 0, el: <Perso cam={cam} id="b3" x={0} z={z} dos={dosPour(cam, z, 1)} lum={0.9} teinte={SCENE_L} couleurs={COSTUME} lift={m.bob} legG={m.legG} legD={m.legD} epauleG={m.bras} epauleD={-m.bras} eyes={1.2} smile={0.2} pupilX={Math.sin(f / 9) * 6} breath={Math.sin(f / 7) * 3} />}]}
    />
  );
};

// ---------- 4. L'enveloppe ----------
const presentateur = (cam, f, o = {}) => humain(cam, f, {x: LUTRIN.x, z: LUTRIN.z + 0.35, y: SCENE_Y, angle: 180, couleurs: CRAVATE, ...o});
const Enveloppe = () => {
  const f = useCurrentFrame();
  const {i, t, d, bornes} = decoupe('enveloppe', f);
  const nom = bornes[2];
  const cams = [
    () => ({x: 1350, y: -480, z: 7.9 + (0.25 * t) / d, yaw: 12, pitch: -3}),
    () => ({x: 0, y: -900, z: -0.5 + (0.6 * t) / d, yaw: 0, pitch: -14}),
    () => camFace(ALLEE.x, ALLEE.z, 1, 1.1, t, d, {dy: -40}),
  ];
  const cam = makeCam(cams[i]());
  const spotX = interpolate(f, [nom - 6, nom + 6], [-2500, 0], {...clamp, easing: Easing.out(Easing.cubic)});
  const decor = theatre(cam, f, {ecran: f < nom ? 'question' : 'toi', spots: f > nom - 8 ? [{x: spotX, z: ALLEE.z, sx: 0, sz: 8.5}] : [], lumiere: f > nom ? 0.6 : 1});
  const bras = {coudeD: [200, -820, 160], mainD: [120, -900, 300], coudeG: [-200, -820, 160], mainG: [-120, -900, 300]};
  return (
    <Plan f={f} cam={cam} decor={decor} noir={0.04} zoom={punch(t, 0.16)} roll={[3, 0, -4][i]}
      items={[
        {...presentateur(cam, f, {bras}), x: LUTRIN.x, y: SCENE_Y - 400},
        {z: ALLEE.z, x: 0, el: <Perso cam={cam} id="b4" x={0} z={ALLEE.z} dos={dosPour(cam, ALLEE.z, 1)} lum={i === 2 ? 1.15 : 0.8} teinte={SCENE_L} couleurs={COSTUME} eyes={i === 2 ? 1.45 : 1.1} worry={i === 2 ? 1 : 0} scream={i === 2 ? 0.35 : 0} sweat={i === 2 ? 1 : 0} breath={Math.sin(f / 5) * 3} />},
      ]}
      dessus={i === 2 && t < 6 ? <rect width="1080" height="1920" fill="#fff" opacity={0.5 * (1 - t / 6)} /> : null}
    />
  );
};

// ---------- 5. Toute la salle se retourne ----------
const Salle = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('salle', f);
  const cams = [
    () => ({x: 0, y: -260, z: ALLEE.z + 0.15, yaw: Math.sin(f / 25) * 4, pitch: 2}),
    () => camFace(ALLEE.x, ALLEE.z, 1, 0.5, t, d, {dy: -30}),
    () => ({x: 0, y: -1500, z: 7.7, yaw: 180, pitch: 14}),
  ];
  const cam = makeCam(cams[i]());
  const tourne = (k, z) => (z > ALLEE.z && f > 18 + random(`to${k}`) * 30 ? 1 : 0);
  const decor = theatre(cam, f, {ecran: 'toi', tourne, spots: [{x: 0, z: ALLEE.z, sx: 0, sz: 8.5}], lumiere: 0.55});
  return (
    <Plan f={f} cam={cam} decor={decor} noir={0.06} zoom={punch(t)} roll={[0, 4, -2][i]}
      items={[i > 0 && {z: ALLEE.z, x: 0, el: <Perso cam={cam} id="b5" x={0} z={ALLEE.z} dos={dosPour(cam, ALLEE.z, 1)} lum={1.1} teinte={SCENE_L} couleurs={COSTUME} eyes={1.4} worry={1} sweat={1} smile={0.15} pupilX={Math.sin(f / 4) * 6} breath={Math.sin(f / 4) * 4} />}]}
    />
  );
};

// ---------- 6. Les joueurs se demandent qui tu es ----------
const Joueurs = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('joueurs', f);
  const cams = [
    () => ({x: -300 + (600 * t) / d, y: -300, z: 4.6, yaw: 0, pitch: -2}),
    () => ({x: 0, y: -520, z: 4.0 + (0.3 * t) / d, yaw: 0, pitch: 3}),
    () => camFace(ALLEE.x, ALLEE.z, 1, 0.6, t, d, {dy: -30}),
  ];
  const cam = makeCam(cams[i]());
  const decor = theatre(cam, f, {ecran: 'toi', spots: [{x: 0, z: ALLEE.z, sx: 0, sz: 8.5}], lumiere: 0.7});
  const tete = (k) => ({x: JOUEURS[k].x, z: 6.4, angle: 180 + (JOUEURS[k].x > 0 ? -12 : 12) + Math.sin(f / 20 + k) * 4});
  const coucou = i === 2 ? 1 : 0;
  return (
    <Plan f={f} cam={cam} decor={decor} noir={0.04} zoom={punch(t)} roll={[-2, 3, 4][i]}
      items={[
        ...(i < 2 ? JOUEURS.map((j, k) => {
          const h = humain(cam, f, {...tete(k), couleurs: j.couleurs, bras: k === 1 ? {coudeD: [170, -620, 60], mainD: [60, -880, 120]} : null});
          return {...h, x: j.x, y: SOL - 400};
        }) : []),
        {z: ALLEE.z, x: 0, el: <Perso cam={cam} id="b6" x={0} z={ALLEE.z} dos={dosPour(cam, ALLEE.z, 1)} lum={1.05} teinte={SCENE_L} couleurs={COSTUME} smile={0.6} worry={0.6} eyes={1.2} epauleD={-150 * coucou} coudeD={coucou * (-10 + Math.sin(f / 3) * 30)} sweat={1} />},
      ]}
    />
  );
};

// ---------- 7. La première marche ----------
const Marche = () => {
  const f = useCurrentFrame();
  const {i, t, d, bornes} = decoupe('marche', f);
  const chute = bornes[1] + 22;
  const k = interpolate(f, [0, chute], [0, 1], clamp);
  const z = ALLEE.z + (7.18 - ALLEE.z) * k;
  const tombe = interpolate(f, [chute, chute + 9], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
  const m = marche(f, 0.34, f < chute ? 0.8 : 0);
  const cams = [
    () => ({x: 100, y: -330, z: z - 1.7, yaw: 2}),
    () => ({x: 1400, y: 60, z: 7.1, yaw: -90, pitch: -3}),
    () => ({x: -1200, y: -1300, z: 7.9, yaw: 172, pitch: 14}),
  ];
  const cam = makeCam(cams[i]());
  const decor = theatre(cam, f, {ecran: 'logo', tourne: () => (cam.z > 5 ? 0 : 1), flashs: tombe > 0.5 ? 1 : 0});
  const [px, py] = cam.proj(0, SOL, z);
  const perso = <Perso cam={cam} id="b7" x={0} z={z} dos={dosPour(cam, z, 1)} lum={0.95} teinte={SCENE_L} couleurs={COSTUME} lift={m.bob} legG={m.legG} legD={m.legD} epauleG={m.bras + 60 * tombe} coudeG={60 * tombe} epauleD={-m.bras - 60 * tombe} coudeD={-60 * tombe} eyes={1 + 0.4 * tombe} scream={tombe} smile={tombe ? 0 : 0.3} />;
  return (
    <Plan f={f} cam={cam} decor={decor} noir={0.04} zoom={punch(t, 0.15) + 0.04 * tombe} roll={[2, 0, -3][i]}
      items={[{z, x: 0, el: <g transform={`rotate(${(i === 1 ? 82 : 0) * tombe} ${px} ${py})`}>{perso}</g>}]}
    />
  );
};

// ---------- 8. Le trophée (beaucoup trop lourd) ----------
const SC = {x: 0, z: 9.6};
const Trophee = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('trophee', f);
  const poids = interpolate(f, [25, 45], [0, 1], clamp);
  const cams = [
    () => ({x: 380, y: -620 + (60 * t) / d, z: 8.0, yaw: 4, pitch: 9}),
    () => camFace(SC.x, SC.z, -1, 1.0, t, d, {dy: -90, pitch: 4}),
    () => ({x: 0, y: -1100, z: -2 + (0.8 * t) / d, yaw: 0, pitch: -8}),
  ];
  const cam = makeCam(cams[i]());
  const decor = theatre(cam, f, {ecran: i === 2 ? 'poids' : 'logo', flashs: 1});
  const yb = SCENE_Y - 270 + 50 * poids;
  const boule = cam.visible(SC.z - 0.15, SC.x, yb) ? (
    <g transform={`translate(${cam.proj(SC.x, yb, SC.z - 0.15)[0]} ${cam.proj(SC.x, yb, SC.z - 0.15)[1]}) scale(${cam.scale(SC.z - 0.15, SC.x, yb)})`}>
      <BouleOr r={115} f={f} />
    </g>
  ) : null;
  const h = humain(cam, f, {x: 750, z: SC.z, y: SCENE_Y, angle: -100, couleurs: CRAVATE, bras: {coudeD: [200, -560, 120], mainD: [180, -330, 260]}});
  return (
    <Plan f={f} cam={cam} decor={decor} noir={0.03} zoom={punch(t)} roll={[0, -4, 2][i]}
      items={[
        {...h, x: 750, y: SCENE_Y - 400},
        {z: SC.z, x: 0, el: <Perso cam={cam} id="b8" x={0} y={SCENE_Y} z={SC.z} dos={false} lum={1} teinte={SCENE_L} couleurs={COSTUME} sy={1 - 0.07 * poids} lift={30 * poids} epauleG={-22} coudeG={-75} epauleD={22} coudeD={75} eyes={1.2 + 0.2 * poids} worry={poids} sweat={poids} scream={0.2 * poids} shiver={(random(`b8${f}`) - 0.5) * 6 * poids} />},
        {z: SC.z - 0.15, x: 0, y: yb, el: boule},
      ]}
    />
  );
};

// ---------- 9. Le discours ----------
const Discours = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('discours', f);
  const ZD = LUTRIN.z + 0.35;
  const cams = [
    () => ({x: 1300, y: -600 + (40 * t) / d, z: 8.3 + (0.2 * t) / d, yaw: 16, pitch: 4}),
    () => ({x: 0, y: -1300, z: -7 + (1 * t) / d, yaw: 0, pitch: -8}),
    () => ({x: 1400, y: -800, z: 7.8, yaw: 186, pitch: 9}),
  ];
  const cam = makeCam(cams[i]());
  const decor = theatre(cam, f, {ecran: 'visage', tourne: () => 0, lumiere: 0.8});
  return (
    <Plan f={f} cam={cam} decor={decor} noir={0.04} zoom={punch(t)} roll={[-2, 0, 3][i]}
      items={[{z: ZD, x: LUTRIN.x, el: <Perso cam={cam} id="b9" x={LUTRIN.x} y={SCENE_Y} z={ZD} dos={false} lum={1} teinte={SCENE_L} couleurs={COSTUME} smile={0.35} worry={0.7} eyes={1.15} pupilX={Math.sin(f / 12) * 6} sweat={1} breath={Math.sin(f / 6) * 3} />}]}
    />
  );
};

// ---------- 10. Le contrat ----------
const Contrat = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('contrat', f);
  const cam = makeCam(i === 2 ? {x: -1050, y: -330, z: 0.6 + (0.3 * t) / d, yaw: 42, pitch: 3} : {x: 300, y: -250, z: 1.6, yaw: 15});
  const decor = appart(cam, f, {tvContenu: <TvDirect f={f} />});
  const msg = [{debut: 40, texte: 'Salut champion 🏆 On te veut au club. Contrat de 5 ans. Tu signes ?', gras: false}];
  const tel = [
    <Telephone key="a" f={f} nom="FC Paris ⚽" verrouille notif={{debut: 6, texte: 'On te veut au club 🏆'}} echelle={0.85} y={1100} vibre={interpolate(f, [6, 26], [1, 0], clamp)} />,
    <Telephone key="b" f={f} nom="FC Paris ⚽" messages={msg} echelle={1.05 + (0.12 * t) / d} y={980} />,
    null,
  ][i];
  const saut = Math.abs(Math.sin(f / 5));
  return (
    <Plan f={f} cam={cam} decor={decor} noir={0.04} zoom={punch(t)} roll={[-2, 0, 3][i]}
      items={[i === 2 && {z: P0.z, x: P0.x, el: <Perso cam={cam} id="b10" x={P0.x} z={P0.z} lum={0.9} teinte={CHAUD} lift={-160 * saut} smile={1} eyes={1.1} epauleG={150} coudeG={20} epauleD={-150} coudeD={-20} />}]}
      dessus={tel && <g><rect width="1080" height="1920" fill="#000" opacity="0.45" />{tel}</g>}
    />
  );
};

// ---------- 11. Le premier match ----------
const ARBITRE = {jambe: '#111', bras: '#111', gilet: '#121212', gilet2: '#0a0a0a', cheveux: '#2a1e16'};
const Match = () => {
  const f = useCurrentFrame();
  const {i, t, d, bornes} = decoupe('match', f);
  const PJ = {x: 0, z: 2.2};
  const main = bornes[2] + 8;
  const zb = interpolate(f, [bornes[1], main], [-3.5, PJ.z - 0.25], clamp);
  const attrape = f >= main ? 1 : 0;
  const coup = f > main + 8 ? 1 : 0;
  const cams = [
    () => ({x: -6000 + (1500 * t) / d, y: -6000, z: -16, yaw: 16, pitch: 24}),
    () => ({x: 300, y: 390, z: -1.2, yaw: -3, pitch: -9}),
    () => ({x: 1300, y: -380, z: -0.6, yaw: -20, pitch: 1}),
    () => ({x: 2600, y: -330, z: 4.6, yaw: -116, pitch: 0}),
  ];
  const cam = makeCam(cams[i]());
  const decor = stade(cam, f, {ecran: 'MATCH 1', ola: i === 0 ? 1 : 0});
  const yb = attrape ? SOL - 560 : SOL - 70;
  const ballon = cam.visible(zb, 0, yb) ? (
    <g transform={`translate(${cam.proj(PJ.x, yb, zb)[0]} ${cam.proj(PJ.x, yb, zb)[1]}) scale(${cam.scale(zb, PJ.x, yb)})`}>
      <BallonFoot r={70} rot={attrape ? 0 : f * 25} />
    </g>
  ) : null;
  const carton = coup ? {coudeD: [200, -900, 80], mainD: [230, -1180, 120]} : null;
  const arb = humain(cam, f, {x: 1800, z: 4.4, angle: -140, couleurs: ARBITRE, bras: carton});
  const pc = cam.proj(1800 + 160, SOL - 830 * 1 - 10, 4.4 - 0.08);
  const sc = cam.scale(4.4, 1800, SOL - 800);
  return (
    <Plan f={f} cam={cam} decor={decor} noir={0.03} zoom={punch(t)} roll={[0, 3, -4, 5][i]}
      items={[
        {z: PJ.z, x: 0, el: <Perso cam={cam} id="b11" x={PJ.x} z={PJ.z} dos={dosPour(cam, PJ.z, -1)} lum={1} teinte={STADE} couleurs={MAILLOT} eyes={1.25 + 0.2 * coup} worry={0.7} sweat={1} epauleG={attrape ? 35 : 0} coudeG={attrape ? 130 : 0} epauleD={attrape ? -35 : 0} coudeD={attrape ? -130 : 0} scream={coup * 0.4} />},
        {z: zb, x: 0, y: yb, el: ballon},
        {...arb, x: 1800, y: SOL - 400},
        coup && cam.visible(4.32, 1960, SOL - 840) && {z: 4.3, x: 1960, y: SOL - 840, el: <rect x={pc[0] - 30 * sc} y={pc[1] - 90 * sc} width={60 * sc} height={90 * sc} rx={6 * sc} fill="#e81a1a" stroke="#fff" strokeWidth={2 * sc} />},
      ]}
    />
  );
};

// ---------- 12. Tu le gardes ou tu le rends ? ----------
const Fin = () => {
  const f = useCurrentFrame();
  const {i, t, d} = decoupe('fin', f);
  const PJ = {x: 0, z: 0};
  const cams = [
    () => orbite(PJ.x, PJ.z, 1.6, 160 + (60 * t) / d, -300, {pitch: 2}),
    () => camFace(PJ.x, PJ.z, -1, 0.55, t, d, {dy: -60}),
    () => ({x: 0, y: -1500 - (4000 * t) / d, z: -2.5 - (3 * t) / d, yaw: 0, pitch: 18 + (14 * t) / d}),
  ];
  const cam = makeCam(cams[i]());
  const decor = stade(cam, f, {ecran: "BALLON D'OR", ola: 1});
  const yb = SOL - 330;
  const zb = PJ.z + 0.15 * Math.sign(cam.z - PJ.z);
  const boule = cam.visible(zb, PJ.x, yb) ? (
    <g transform={`translate(${cam.proj(PJ.x, yb, zb)[0]} ${cam.proj(PJ.x, yb, zb)[1]}) scale(${cam.scale(zb, PJ.x, yb)})`}>
      <BouleOr r={150} f={f} />
    </g>
  ) : null;
  return (
    <Plan f={f} cam={cam} decor={decor} noir={0.03} zoom={punch(t)} roll={[-3, 2, 0][i]}
      items={[
        {z: PJ.z, x: 0, el: <Perso cam={cam} id="b12" x={PJ.x} z={PJ.z} dos={false} lum={1.05} teinte={STADE} couleurs={MAILLOT} smile={0.5} eyes={1.1} epauleG={-22} coudeG={-75} epauleD={22} coudeD={75} breath={Math.sin(f / 6) * 3} />},
        {z: zb, x: 0, y: yb, el: boule},
      ]}
      dessus={
        <g>
          <Choix f={f} debut={20} x={540} y={250} texte="TU LE GARDES ?" emoji="1f3c6" couleur="#ffd25a" />
          <Choix f={f} debut={45} x={540} y={450} texte="TU LE RENDS ?" emoji="1f91d" couleur="#8fd3ff" />
        </g>
      }
    />
  );
};

// ---------- le sous-titre : une phrase entière, posée (pas de mot à mot) ----------
const SousTitre = ({nom, f, d}) => {
  const [a, fort, b] = PHRASES[nom];
  const ent = spring({frame: f - 4, fps: 30, config: {damping: 16, stiffness: 120}});
  const sort = interpolate(f, [d - 8, d], [1, 0], clamp);
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top: 1430, display: 'flex', justifyContent: 'center', opacity: ent * sort, transform: `translateY(${(1 - ent) * 40}px)`}}>
      <div style={{background: 'rgba(8,8,14,0.72)', borderRadius: 30, padding: '30px 40px', border: '2px solid rgba(255,214,90,0.35)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', fontFamily: "'MontEB', 'DejaVu Sans', sans-serif", fontSize: 54, lineHeight: 1.28, color: '#fff', textAlign: 'center'}}>
        {a}
        <span style={{color: '#ffd25a'}}>{fort}</span>
        {b}
      </div>
    </div>
  );
};

const usePolice = () => {
  const [h] = useState(() => delayRender('police'));
  useEffect(() => {
    const ff = new FontFace('MontEB', `url(${staticFile('fonts/Montserrat-ExtraBold.woff')})`);
    ff.load()
      .then((x) => {
        document.fonts.add(x);
        continueRender(h);
      })
      .catch(() => continueRender(h));
  }, [h]);
};

const COMPOSANTS = {tv: Tv, tel: Tel, arrivee: Arrivee, enveloppe: Enveloppe, salle: Salle, joueurs: Joueurs, marche: Marche, trophee: Trophee, discours: Discours, contrat: Contrat, match: Match, fin: Fin};
const Scene = ({nom, d}) => {
  const f = useCurrentFrame();
  const C = COMPOSANTS[nom];
  return (
    <AbsoluteFill>
      <C />
      <SousTitre nom={nom} f={f} d={d} />
    </AbsoluteFill>
  );
};
export const BallonDor = () => {
  usePolice();
  return (
    <Series>
      {SCENES.map(([nom, d]) => (
        <Series.Sequence key={nom} durationInFrames={d}>
          <Scene nom={nom} d={d} />
        </Series.Sequence>
      ))}
    </Series>
  );
};
