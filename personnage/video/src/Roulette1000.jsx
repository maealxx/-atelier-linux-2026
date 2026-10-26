import {useEffect, useState} from 'react';
import {continueRender, delayRender, Easing, interpolate, random, Series, spring, staticFile, useCurrentFrame} from 'remotion';
import {casino, CROUPIER, Croupier, enveloppe, JOUEUR, lampeTable, mains, pileJetons, rateau, ROUE, ROUGE_CASE, TABLE, TABLE_Y, tableauNumeros, TABLEAU, tableRoulette} from './Casino';
import {Choix} from './Livreur';
import {camFace, dosPour, montage, Plan, punch} from './montage';
import {clamp, makeCam, orbite, Perso} from './moteur';
import {SOL} from './Rue';
import {couleurDe, phi, yAt} from './Roulette';
import EV from './roulette1000/evenements.json';
import PLANS from './roulette1000/plans.json';
import timeline from './roulette1000/timeline.json';

// « Et si tu misais 1 000 € ? » : 1 000 € sur le rouge, le noir tombe, puis le loyer… et le rouge sort. Le piège.
// La roue 3D (Roulette.jsx) est la star : on la voit sous tous les angles. Chrono du tour avec centièmes,
// rythme cardiaque qui monte (BPM + vignette rouge qui bat), lumière rouge du casino.
const {DUREES, decoupe, repere, SCENES} = montage(timeline, PLANS);
export const DUREE_ROULETTE_1000 = SCENES.reduce((t, [, d]) => t + d, 0);
const START = {};
SCENES.reduce((t, [nom, d]) => {
  START[nom] = t;
  return t + d;
}, 0);
const G = (ref) => (ref ? (ref[0] === null ? ref[1] : START[ref[0]] + (typeof ref[1] === 'number' ? ref[1] : repere(ref[0], ref[1], 0))) : null);

const MONT = "'MontB', 'DejaVu Sans', sans-serif";
const ROUGE_SOIR = [1.08, 0.84, 0.8]; // lumière rouge et chaude du casino
const ease = {...clamp, easing: Easing.inOut(Easing.sin)};
const W = ROUE;
const E = ROUE.ech;
const P = JOUEUR;
const K = CROUPIER;
const RC = ROUGE_CASE;

// ===================== la roue et la bille (global, en images) =====================
const TOURS = EV.tours.map((t, i) => ({...t, debut: G(t.debut), saut: G(t.saut), fin: G(t.fin), prev: i ? EV.tours[i - 1].num : 5}));
// vitesse de la roue (rad/image) : rapide quand la bille est lancée, très lente quand elle est posée
const omega = (fg) => {
  let v = 0.22;
  TOURS.forEach((T) => {
    const fin = T.fin ?? T.debut + 600;
    if (fg >= T.debut && fg < fin) v = Math.max(v, 0.22 + 0.9 * Math.pow(1 - (fg - T.debut) / (fin - T.debut), 1.5));
  });
  return v / 30;
};
const F0 = -400;
const ANGLE = [0];
for (let f = F0 + 1; f <= 4000; f++) ANGLE.push(ANGLE[ANGLE.length - 1] + omega(f));
const angleRoue = (fg) => ANGLE[Math.max(0, Math.min(ANGLE.length - 1, Math.round(fg) - F0))];
const mod2pi = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
const etatRoue = (fg) => {
  const th = angleRoue(fg);
  let i = TOURS.length - 1;
  while (i > 0 && fg < TOURS[i].debut) i--;
  const T = TOURS[i];
  const fin = T.fin ?? T.debut + 600;
  if (fg >= fin) return {th, b: {r: 612, a: phi(T.num) + 0.03 * Math.sin((fg - fin) / 2.5) * Math.exp(-(fg - fin) / 12), hop: 0}, tour: i, pose: true, num: T.num, depuis: fg - fin};
  if (fg < T.debut) return {th, b: {r: 612, a: phi(T.prev), hop: 0}, tour: i, pose: true, num: T.prev, depuis: 99};
  const tau = (fg - T.debut) / (fin - T.debut);
  const B = mod2pi(phi(T.prev) - phi(T.num)) + 2 * Math.PI * T.tours;
  const a = phi(T.num) + B * Math.pow(1 - tau, 2.3);
  const s = fg - T.debut;
  const saut = T.saut ?? fin;
  let r = 905 + 6 * Math.sin(s * 0.9);
  let hop = 0;
  if (i > 0 && s < 10) r = 612 + (905 - 612) * Easing.out(Easing.quad)(s / 10);
  if (fg >= saut) {
    const u = (fg - saut) / (fin - saut);
    r = 905 - 293 * Easing.inOut(Easing.quad)(u);
    hop = 60 * Math.abs(Math.sin(u * Math.PI * 6)) * (1 - u * 0.8);
  }
  return {th, b: {r, a, hop}, tour: i, pose: false, reste: (fin - fg) / 30, num: T.num};
};
// position de la bille dans le monde
const billeMonde = (e) => {
  const aw = e.th + e.b.a;
  const r = e.b.r * E;
  return [W.x + r * Math.cos(aw), TABLE_Y + (yAt(e.b.r) - 27 - e.b.hop) * E, W.z + (r * Math.sin(aw)) / 1000, aw];
};
const historique = (fg) => {
  const h = [...EV.historique];
  TOURS.forEach((T) => T.fin !== null && fg >= T.fin && h.push(T.num));
  return h;
};

// ===================== le cœur : BPM qui monte et descend, battements =====================
const KEYS = EV.coeur.map(([sc, o, v]) => [START[sc] + o, v]);
const bpm = (fg) => interpolate(fg, KEYS.map((k) => k[0]), KEYS.map((k) => k[1]), clamp);
const PHASE = [0];
for (let f = 1; f <= DUREE_ROULETTE_1000 + 2; f++) PHASE.push(PHASE[f - 1] + bpm(f) / 60 / 30);
const battement = (fg) => {
  const ph = PHASE[Math.max(0, Math.min(PHASE.length - 1, fg))] % 1;
  return Math.exp(-ph * 9) + 0.55 * Math.exp(-Math.max(0, ph - 0.18) * 11) * (ph > 0.18 ? 1 : 0);
};
const stress = (fg) => interpolate(bpm(fg), [95, 180], [0, 1], clamp);

// ===================== outils caméra =====================
const deg = (r) => (r * 180) / Math.PI;
const vise = (p, c, extra = {}) => {
  const dx = c[0] - p[0];
  const dy = c[1] - p[1];
  const dz = (c[2] - p[2]) * 1000;
  return {x: p[0], y: p[1], z: p[2], yaw: deg(Math.atan2(dx, dz)), pitch: deg(Math.atan2(dy, Math.hypot(dx, dz))), ...extra};
};
const CW = [W.x, TABLE_Y, W.z]; // centre de la roue
// au-dessus de la roue, qui tourne lentement
const camDessus = (t, d, haut = 1150, rot = 30, base = 0, cible = CW) => ({x: cible[0], y: TABLE_Y - haut, z: cible[2] - 0.02, yaw: base + (rot * t) / d, pitch: 89});
// au ras de la roue, autour d'elle
const camRas = (ang, dist, h, cible = CW) => {
  const a = (ang * Math.PI) / 180;
  return vise([cible[0] + Math.sin(a) * dist, TABLE_Y - h, cible[2] - (Math.cos(a) * dist) / 1000], cible);
};
// macro qui suit la bille (depuis l'extérieur de la roue, un peu au-dessus)
const camBille = (e, recul = 230, haut = 170, decal = 0) => {
  const [bx, by, bz, aw] = billeMonde(e);
  const a = aw + decal;
  return vise([bx + Math.cos(a) * recul, by - haut, bz + (Math.sin(a) * recul) / 1000], [bx, by, bz]);
};
// gros plan sur une case (là où la bille est posée), vue de dessus inclinée
const camCase = (e, haut, recul, rot = 0) => {
  const [bx, by, bz, aw] = billeMonde(e);
  const a = aw + rot;
  return vise([bx + Math.cos(a) * recul, by - haut, bz + (Math.sin(a) * recul) / 1000], [bx, by, bz]);
};

// ===================== les persos =====================
const tremble = (f, k, cle) => k * (random(`${cle}${f}`) - 0.5);
const Joueur = ({cam, id, fg, pose = {}, x = P.x, z = P.z, lum = 0.9}) => {
  const st = stress(fg);
  return (
    <Perso cam={cam} id={id} x={x} z={z} dos={dosPour(cam, z, 1)} lum={lum} teinte={ROUGE_SOIR}
      worry={0.4 + 0.6 * st} sweat={st > 0.3 ? 1 : 0} eyes={1 + 0.3 * st} breath={Math.sin(fg / (5 - 2.5 * st)) * (2 + 4 * st)} shiver={tremble(fg, 4 * st, id)}
      epauleG={14} coudeG={20} epauleD={-14} coudeD={-20} {...pose} />
  );
};
const gens = (cam, fg, {peur = 0, fige = 0} = {}) => {
  const L = [
    {x: 1000, z: 4.02, c: {haut: '#3aa86a', hautO: '#2a8a52', pant: '#2a2a34', chev: '#5a3a1a'}},
    {x: 1520, z: 4.95, c: {haut: '#7a4ac8', hautO: '#5a34a0', pant: '#1e2a44', chev: '#c8a050'}},
    {x: -1550, z: 4.3, c: {haut: '#d8a030', hautO: '#b8841e', pant: '#3a2a20', chev: '#1a1410'}},
  ];
  return L.map((g, k) => ({
    z: g.z, x: g.x,
    el: (
      <Perso key={`g${k}`} cam={cam} id={`gens${k}`} x={g.x} z={g.z} dos={dosPour(cam, g.z, 1)} lum={0.7} teinte={ROUGE_SOIR} couleurs={g.c}
        worry={peur ? 1 : 0.3} eyes={peur ? 1.35 : 1} scream={peur * (k === 1 ? 1 : 0.4)}
        epauleG={peur ? 35 : 10} coudeG={peur ? 130 : 15} epauleD={peur ? -35 : -10} coudeD={peur ? -130 : -15}
        breath={fige ? 0 : Math.sin(fg / 9 + k) * 3} pupilX={k === 2 ? 6 : -6} />
    ),
  }));
};
const croupier = (cam, fg, pose = {}) => ({
  z: K.z, x: K.x,
  el: <Croupier key="cr" cam={cam} id="crp" x={K.x} z={K.z} dos={dosPour(cam, K.z, -1)} lum={0.85} teinte={ROUGE_SOIR} smile={0.25} pupilY={6} breath={Math.sin(fg / 10) * 2} {...pose} />,
});
// main du croupier (point d'attache du râteau)
const MAIN_K = [K.x + 120, -20, K.z - 0.25];

// ===================== une vue du casino =====================
// opts : joueur (props de pose ou false), croupierPose, gens, jetons {x, z, n}, env {x, z, ouverte}, rateau {tete},
// allume (n → 0..1), tableauOpts, mains, lampe, noir, rouge (couleur de la brume), billets
const Vue = ({f, fg, cam, i, t, d, o = {}, roll = 0, zoom = 1, dessus = null}) => {
  const e = etatRoue(fg);
  const decor = casino(cam, fg, {rouge: o.rouge || '#ff1a2a', lustres: o.lustres ?? 1});
  const items = [];
  const surTable = [];
  if (o.jetons !== false) {
    const J = o.jetons || {x: RC.x, z: RC.z, n: 10};
    if (J.n > 0) surTable.push(pileJetons(cam, J.x, J.z, J.n, '#141416', 'jt'));
    if (J.n > 0) surTable.push(pileJetons(cam, J.x + 70, J.z - 0.04, Math.max(0, J.n - 4), '#c0141e', 'jt2'));
  }
  (o.autresJetons || []).forEach((J, k) => surTable.push(pileJetons(cam, J.x, J.z, J.n, J.c || '#1a4ac8', `aj${k}`)));
  // les jetons du casino devant le croupier
  surTable.push(pileJetons(cam, K.x - 260, 5.38, 14, '#1a4ac8', 'cb1'));
  surTable.push(pileJetons(cam, K.x - 180, 5.4, 9 + (o.banque || 0), '#c0141e', 'cb2'));
  surTable.push(pileJetons(cam, K.x - 340, 5.36, 11, '#e8e0c8', 'cb3'));
  if (o.env) surTable.push(enveloppe(cam, o.env.x, o.env.z, 'env', {ouverte: o.env.ouverte || 0}));
  if (o.rateau) surTable.push(rateau(cam, MAIN_K, o.rateau, 'rt'));
  const table = tableRoulette(cam, fg, {th: e.th, b: e.b, allume: o.allume || null, lampe: o.lampe ?? 1, mise: o.mise ?? 0.6});
  surTable.sort((a, b) => cam.profondeur(b.z, b.x, b.y) - cam.profondeur(a.z, a.x, a.y));
  items.push({...table, el: <g key="tab">{table.el}{surTable.map((s, k) => <g key={k}>{s.el}</g>)}</g>});
  items.push(lampeTable(cam, fg, o.lampe ?? 1));
  items.push(tableauNumeros(cam, fg, historique(fg), o.tableau || {}));
  const plongee = (cam.pitch || 0) > 60; // un billboard vu d'en haut fait plat : on ne montre pas les persos
  const loin = (x, z) => cam.profondeur(z, x, SOL) > 0.2 && cam.profondeur(z, x, -250) > 0.2; // ni collés à la caméra
  if (o.croupier !== false && !plongee && loin(K.x, K.z)) items.push(croupier(cam, fg, o.croupierPose || {}));
  if (o.joueur !== false && !plongee && loin(P.x, P.z)) items.push({z: P.z, x: P.x, el: <Joueur cam={cam} id={`j${i}`} fg={fg} pose={o.joueur || {}} lum={o.lumJoueur ?? 0.9} />});
  if (o.gens !== false && !plongee) gens(cam, fg, o.gens || {}).forEach((g) => loin(g.x, g.z) && items.push(g));
  if (o.mains) items.push(mains(cam, fg, o.mains));
  if (o.billets) items.push(...billets(cam, fg));
  // micro-secousse de stress (douce) : un petit roulis qui tremble
  const r = roll;
  return <Plan f={f} cam={cam} decor={decor} items={items} noir={o.noir ?? 0.06} zoom={zoom} roll={r} dessus={<g>{dessus}<Hud fg={fg} o={o} /></g>} />;
};

// billets qui tombent autour du joueur (le rêve des 2 000 €)
const billets = (cam, fg) =>
  [...Array(26)].map((_, k) => {
    const x = P.x + (random(`bx${k}`) - 0.5) * 1500;
    const z = P.z + (random(`bz${k}`) - 0.3) * 0.9;
    const y = -1500 + ((fg * (9 + 6 * random(`bv${k}`)) + random(`by${k}`) * 1900) % 1900);
    if (!cam.visible(z, x, y)) return null;
    const [px, py] = cam.proj(x, y, z);
    const s = cam.scale(z, x, y);
    const rot = Math.sin(fg / 7 + k) * 40;
    const fl = Math.cos(fg / 5 + k * 2);
    return {
      z, x, y,
      el: (
        <g key={`bi${k}`} transform={`translate(${px} ${py}) rotate(${rot}) scale(${s * fl} ${s})`}>
          <rect x="-120" y="-60" width="240" height="120" rx="10" fill="#7ab87a" stroke="#3a6a3a" strokeWidth="8" />
          <circle r="34" fill="none" stroke="#3a6a3a" strokeWidth="8" />
          <text y="18" fontSize="50" textAnchor="middle" fontWeight="900" fill="#2a4a2a" fontFamily="'DejaVu Sans', Arial">€</text>
        </g>
      ),
    };
  }).filter(Boolean);

// ===================== l'interface : chrono du tour, BPM, textes =====================
const pad = (n, k = 2) => String(Math.floor(n)).padStart(k, '0');
const Chrono = ({fg, y = 330}) => {
  const e = etatRoue(fg);
  const T = TOURS[e.tour];
  if (T.fin === null && e.pose) return null;
  let reste = e.reste;
  let fini = 0;
  if (e.pose) {
    if (e.depuis > 34 || e.depuis < 0) return null;
    reste = 0;
    fini = e.depuis;
  }
  if (reste === undefined) return null;
  const sec = Math.max(0, reste);
  const txt = `${pad(sec / 60)}:${pad(sec % 60)}.${pad((sec * 100) % 100)}`;
  const urgent = sec < 3;
  const pulse = urgent ? 1 + 0.06 * Math.max(0, Math.sin(fg * 1.2)) : 1;
  const clign = fini > 0 ? (Math.floor(fini / 4) % 2 ? 0.35 : 1) : 1;
  const col = fini > 0 || sec < 1 ? '#ff2a3a' : urgent ? '#ff5a3a' : '#ffffff';
  const apparition = spring({frame: fg - T.debut, fps: 30, config: {damping: 12}});
  return (
    <g transform={`translate(540 ${y}) scale(${pulse * Math.min(1, fg < 5 ? 1 : apparition + (T.debut < 0 ? 1 : 0))})`} opacity={clign}>
      <rect x="-330" y="-78" width="660" height="156" rx="34" fill="#08040a" opacity="0.82" stroke={col} strokeWidth="6" />
      <g transform="translate(-262 4)" stroke={col} fill="none" strokeWidth="9" strokeLinecap="round">
        <circle r="34" />
        <path d="M0,-34 L0,-46 M-12,-50 L12,-50 M26,-26 L33,-33" />
        <path d={`M0,0 L${Math.sin((fg / 30) * 6.283) * 22},${-Math.cos((fg / 30) * 6.283) * 22}`} />
      </g>
      <text x="52" y="36" fontSize="98" textAnchor="middle" fontFamily={MONT} fill={col} letterSpacing="2" style={{fontVariantNumeric: 'tabular-nums'}}>
        {txt}
      </text>
    </g>
  );
};
const Coeur = ({fg}) => {
  const b = battement(fg);
  const v = Math.round(bpm(fg));
  const st = stress(fg);
  const col = st > 0.6 ? '#ff2a3a' : st > 0.3 ? '#ff7a4a' : '#ffffff';
  // tracé ECG qui défile
  const pts = [];
  for (let k = 0; k <= 60; k++) {
    const ff = fg - 60 + k;
    const ph = PHASE[Math.max(0, Math.min(PHASE.length - 1, ff))] % 1;
    const pic = ph < 0.04 ? -40 * Math.sin((ph / 0.04) * Math.PI) : ph < 0.08 ? 18 * Math.sin(((ph - 0.04) / 0.04) * Math.PI) : 0;
    pts.push(`${k * 4},${pic}`);
  }
  return (
    <g transform="translate(790 120)">
      <rect x="-40" y="-56" width="300" height="112" rx="26" fill="#08040a" opacity="0.78" stroke={col} strokeWidth="4" />
      <g transform={`translate(2 0) scale(${0.85 + 0.35 * b})`}>
        <path d="M0,18 C-30,-6 -32,-30 -14,-36 C-4,-40 0,-30 0,-24 C0,-30 4,-40 14,-36 C32,-30 30,-6 0,18 Z" fill="#ff2a3a" transform="scale(1.1)" />
      </g>
      <text x="44" y="16" fontSize="50" fontFamily={MONT} fill={col}>{v}</text>
      <text x="152" y="14" fontSize="26" fontFamily={MONT} fill={col}>BPM</text>
      <polyline points={pts.join(' ')} transform="translate(30 40) scale(0.86 0.4)" fill="none" stroke={col} strokeWidth="5" opacity="0.8" />
    </g>
  );
};
// l'interface globale : chrono, BPM, vignette rouge qui bat
const Hud = ({fg, o}) => {
  const st = stress(fg);
  const b = battement(fg);
  return (
    <g>
      <defs>
        <radialGradient id="hud-v" cx="540" cy="960" r="1100" gradientUnits="userSpaceOnUse">
          <stop offset="0.5" stopColor="#ff0018" stopOpacity="0" />
          <stop offset="1" stopColor="#ff0018" stopOpacity="1" />
        </radialGradient>
      </defs>
      {o.sepia && <rect width="1080" height="1920" fill="#a0703a" opacity={o.sepia} style={{mixBlendMode: 'color'}} />}
      {o.sepia && <rect width="1080" height="1920" fill="#2a1a0a" opacity={o.sepia * 0.25} />}
      <rect width="1080" height="1920" fill="url(#hud-v)" opacity={(0.08 + 0.42 * st) * (0.35 + 0.65 * b) * (o.vignette ?? 1)} />
      {o.chrono !== false && <Chrono fg={fg} y={o.chronoY || 330} />}
      {o.coeur !== false && <Coeur fg={fg} />}
    </g>
  );
};

// ===================== les scènes =====================
const scene = (nom, rendu) => {
  const C = () => {
    const f = useCurrentFrame();
    const {i, t, d, bornes} = decoupe(nom, f);
    const fg = START[nom] + f;
    return rendu({f, fg, i, t, d, bornes, R: (mot, def) => repere(nom, mot, def)});
  };
  C.displayName = nom;
  return C;
};

// Plans de 2 à 3 s, caméra qui bouge doucement, petit coup de zoom (Maé : « trop dynamique, ça fait mal à la tête »).
// Aucun texte ajouté à l'écran en plus des sous-titres : seulement le chrono, le cœur et le dilemme final.
const doux = (t) => punch(t, 0.04);
// caméra figée sur la position de la bille à une image donnée (la bille passe dans le cadre, la vue ne tourne pas)
const figee = (fg0, ...args) => camBille(etatRoue(fg0), ...args);

// 1. Imagine. 1 000 € sur le rouge, la bille tourne déjà.
const Mise = scene('mise', ({f, fg, i, t, d, R}) => {
  const glisse = interpolate(f, [R('poser', 40) - 14, R('rouge', 74)], [0, 1], ease);
  const J = {x: RC.x, z: RC.z - 0.32 * (1 - glisse), n: 10};
  const cams = [
    () => camDessus(t, d, 1000, 12, 10),
    () => vise([RC.x + 260, TABLE_Y - 150 - (30 * t) / d, RC.z - 0.42], [RC.x - 20, TABLE_Y - 20, RC.z]),
    () => camFace(P.x, P.z, 1, 0.6, t, d, {dy: -10, push: 0.08}),
  ];
  const cam = makeCam(cams[i]());
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={doux(t)} roll={[0, 2, -1][i]}
      o={{jetons: J, mise: glisse, joueur: i === 2 ? {sweat: 1, pupilX: -6, pupilY: 4} : {}}} />
  );
});

// 2. Ton cœur cogne. Tu te vois déjà avec 2 000 €…
const Coeur2 = scene('coeur', ({f, fg, i, t, d}) => {
  const cams = [
    () => camRas(200 + (15 * t) / d, 560, 150),
    () => orbite(P.x, P.z, 1.0, 165 + (20 * t) / d, -200, {pitch: 4}),
  ];
  const cam = makeCam(cams[i]());
  const reve = i === 1;
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={doux(t)} roll={[-2, 1][i]}
      o={{billets: reve, joueur: reve ? {smile: 0.9, worry: 0, eyes: 1.15, epauleG: 30, coudeG: 110, epauleD: -30, coudeD: -110, sweat: 0} : {}, lustres: reve ? 1.4 : 1}}
      dessus={reve && <rect width="1080" height="1920" fill="#ffd23e" opacity="0.08" />} />
  );
});

// 3. La bille saute. Rouge, noir, rouge… elle vacille… et tombe.
const Bille = scene('bille', ({f, fg, i, t, d, bornes}) => {
  const e = etatRoue(fg);
  const cams = [
    () => figee(START.bille + bornes[0], 330, 230, 0.35),
    () => camFace(P.x, P.z, 1, 0.36, t, d, {dy: -25, push: 0.04}),
    () => camDessus(t, d, 700 - (80 * t) / d, 6, 40),
  ];
  const cam = makeCam(cams[i]());
  const [bx] = billeMonde(e);
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={doux(t)} roll={[2, -1, 0][i]}
      o={{joueur: {eyes: 1.5, pupilX: interpolate(bx, [W.x - 300, W.x + 300], [-9, 9], clamp), pupilY: 5, worry: 1}}} />
  );
});

// 4. Noir. Dix-sept. Le râteau emporte tes jetons.
const Perte = scene('perte', ({f, fg, i, t, d, R}) => {
  const e = etatRoue(fg);
  const k = interpolate(f, [R('râteau', 45), R('jetons', 87) + 4], [0, 1], ease);
  const tete = [RC.x + (K.x - 120 - RC.x) * k, RC.z + 0.06 + (5.3 - RC.z - 0.06) * k];
  const J = {x: tete[0], z: tete[1] - 0.06, n: k < 0.98 ? 10 : 0};
  const cams = [
    () => camCase(e, 330 - (40 * t) / d, 200, 0.2),
    () => vise([K.x + 420, -700 + (40 * t) / d, K.z + 0.45], [(RC.x + K.x) / 2 + 60, TABLE_Y, (RC.z + 5.3) / 2]),
  ];
  const cam = makeCam(cams[i]());
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={doux(t)} roll={[0, -2][i]}
      o={{jetons: J, rateau: f >= R('râteau', 45) - 8 ? tete : null, croupierPose: {epauleD: -50, coudeD: -40}, tableau: {nouveau: f, eclat: 1}, mise: 0.6 * (1 - k)}} />
  );
});

// 5. Une petite voix : « cinq noirs d'affilée, le rouge va forcément tomber. » Il te reste le loyer.
const Relance = scene('relance', ({f, fg, i, t, d, R}) => {
  const ENV = {x: 640, z: 4.56};
  const cams = [
    () => camFace(P.x, P.z, 1, 0.48, t, d, {dx: -40, dy: -20, push: 0.06}),
    () => vise([(TABLEAU.x0 + TABLEAU.x1) / 2 + 330 - (60 * t) / d, -640, TABLEAU.z - 1.0 + (0.1 * t) / d], [(TABLEAU.x0 + TABLEAU.x1) / 2, -690, TABLEAU.z]),
    () => orbite(W.x, W.z, 0.75, 200 - (20 * t) / d, -620, {pitch: 38}),
    () => vise([ENV.x + 60, TABLE_Y - 330 + (60 * t) / d, ENV.z - 0.26], [ENV.x, TABLE_Y, ENV.z]),
  ];
  const cam = makeCam(cams[i]());
  const tente = interpolate(f, [R('rouge', 112) - 10, R('rouge', 112) + 30], [0, 1], clamp);
  const ouverte = interpolate(f, [R('largent', 193) - 4, R('largent', 193) + 8], [0, 1], clamp);
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={doux(t)} roll={[-2, 1, 2, -1][i]}
      o={{jetons: false, env: {...ENV, ouverte}, joueur: {worry: 1, eyes: 1.3, pupilX: 8, pupilY: -3, epauleG: 35, coudeG: 130, epauleD: -35, coudeD: -130}, tableau: {eclat: i === 1 ? 1 : 0.3},
        allume: i === 2 ? (n) => (couleurDe(n) === 'rouge' ? tente * (0.6 + 0.4 * Math.sin(f / 8 + n)) : 0) : null, mise: 0, vignette: i === 0 ? 1.3 : 1}}
      dessus={i === 0 && <rect width="1080" height="1920" fill="#000" opacity="0.2" />} />
  );
});

// 6. Sauf que c'est faux. La roue n'a aucune mémoire. Monte-Carlo, 1913 : 26 noirs de suite, des fortunes perdues.
const Erreur = scene('erreur', ({f, fg, i, t, d, R}) => {
  const sepia = i >= 2 ? (i === 3 ? interpolate(t, [d * 0.7, d], [0.85, 0], clamp) : 0.85) : 0;
  const sweep = interpolate(f, [R('misant', 259) - 6, R('rouge', 278) + 8], [0, 1], ease);
  const piles = [[RC.x, RC.z, 12], [RC.x + 90, RC.z + 0.05, 8], [RC.x - 80, RC.z - 0.03, 15], [RC.x + 30, RC.z + 0.09, 6]].map(([x, z, n]) => ({x: x + (K.x - 100 - x) * sweep, z: z + (5.3 - z) * sweep, n: sweep > 0.97 ? 0 : n, c: '#e8e0c8'}));
  const cams = [
    () => camFace(P.x, P.z, 1, 0.85, t, d, {dx: -60, dy: -30, push: 0.12}),
    () => camDessus(t, d, 1250 - (120 * t) / d, -15, 120),
    () => vise([-2300 + (300 * t) / d, -900, 2.0], [-400, -100, 6.5]),
    () => vise([1250 - (150 * t) / d, -480, 6.7], [700, -100, 4.4]),
  ];
  const cam = makeCam(cams[i]());
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={doux(t)} roll={[0, 1, -1, 1][i]}
      o={{jetons: false, sepia, autresJetons: i === 3 ? piles : [], rateau: i === 3 ? [piles[0].x, piles[0].z + 0.06] : null, gens: {peur: i === 3 ? 1 : 0}, chrono: false,
        joueur: i === 0 ? {worry: 1, eyes: 1.3} : false, mise: 0}} />
  );
});

// 7. 18 rouges sur 37 cases, le zéro, à la longue c'est le casino qui gagne.
const Chiffre = scene('chiffre', ({f, fg, i, t, d, R}) => {
  const vague = (n) => Math.max(0, Math.sin((f / 45 - phi(n) / (2 * Math.PI)) * Math.PI * 2)) ** 3;
  const allumes = [
    (n) => vague(n),
    (n) => (couleurDe(n) === 'rouge' ? interpolate(f, [R('dix-huit', 57) - 6, R('dix-huit', 57) + 4], [0, 1], clamp) : 0),
    (n) => (n === 0 ? 0.6 + 0.4 * Math.sin(f / 5) : 0),
    null,
  ];
  const e = etatRoue(fg);
  const a0 = e.th + phi(0);
  const zero = [W.x + 612 * E * Math.cos(a0), TABLE_Y, W.z + (612 * E * Math.sin(a0)) / 1000];
  const cams = [
    () => orbite(W.x, W.z, 0.7, 120 + (25 * t) / d, -360, {pitch: 26}),
    () => camDessus(t, d, 900, 8, 200),
    () => vise([zero[0] + 230, zero[1] - 300, zero[2] - 0.14], zero),
    () => camFace(K.x, K.z, -1, 0.6, t, d, {dy: -10, push: 0.08}),
  ];
  const cam = makeCam(cams[i]());
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={doux(t)} roll={[1, 0, -1, 1][i]}
      o={{jetons: false, allume: allumes[i], chrono: false, croupierPose: i === 3 ? {smile: 0.7, brows: 4} : {}, banque: i === 3 ? Math.floor(t / 4) : 0, mise: 0}} />
  );
});

// 8. Mais t'écoutes pas. Le loyer sur le rouge. Le croupier lance la bille.
const Tapis = scene('tapis', ({f, fg, i, t, d, R}) => {
  const k = interpolate(f, [R('poses', 37) - 4, R('rouge', 67)], [0, 1], ease);
  const env = {x: 640 + (RC.x - 640) * k, z: 4.56 + (RC.z - 4.56) * k};
  const lance = f >= R('lance', 96) - 6;
  const cams = [
    () => vise([RC.x + 360, TABLE_Y - 130, RC.z - 0.38], [RC.x + 80, TABLE_Y - 10, RC.z]),
    () => vise([K.x - 120, -420, K.z + 0.75], [W.x, TABLE_Y, W.z]),
  ];
  const cam = makeCam(cams[i]());
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={doux(t)} roll={[1, -1][i]}
      o={{jetons: false, env, mise: k, croupierPose: lance ? {epauleD: -95, coudeD: -30} : {}}} />
  );
});

// 9. Tout le monde se tait. Tu serres la table. La bille ralentit… rouge, noir, rouge…
const Tension = scene('tension', ({f, fg, i, t, d}) => {
  const cams = [
    () => vise([-1300 + (80 * t) / d, -480, 6.5], [P.x + 300, -180, P.z]),
    () => vise([P.x + 40, -40, 3.62], [P.x, TABLE_Y + 10, 4.4]),
    () => camRas(15 + (8 * t) / d, 560, 170),
    () => camFace(P.x, P.z, 1, 0.34, t, d, {dy: -25, push: 0.03}),
  ];
  const cam = makeCam(cams[i]());
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={doux(t)} roll={[1, 0, 2, -1][i]}
      o={{jetons: false, env: {x: RC.x, z: RC.z}, mise: 1, joueur: i === 1 ? false : {eyes: 1.5, worry: 1, sweat: 1, pupilX: 4, pupilY: 5}, gens: {fige: 1}, mains: i === 1 ? {serre: 1, tremble: 6} : null,
        noir: 0.08 + 0.06 * i, lustres: 1 - 0.12 * i}} />
  );
});

// 10. Elle tombe. (silence total) : la bille tombe, puis il ferme les yeux (on ne voit pas la case)
const Silence = scene('silence', ({f, fg, i, t, d}) => {
  const cam = makeCam(i === 0 ? figee(TOURS[1].fin - 12, 260, 160, 0.4) : camFace(P.x, P.z, 1, 0.32, t, d, {dy: -25, push: 0.02}));
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={1.02} roll={0}
      o={{jetons: false, env: {x: RC.x, z: RC.z}, mise: 1, noir: 0.35, lustres: 0.4, lampe: 0.5, joueur: {eyes: 0.08, worry: 1, sweat: 1, brows: 6}}} />
  );
});

// 11. Rouge. Trois. Tu récupères 2 000 €. Ton cœur explose !
const Twist = scene('twist', ({f, fg, i, t, d, R}) => {
  const e = etatRoue(fg);
  const flash = interpolate(f, [R('rouge', 3), R('rouge', 3) + 3, R('rouge', 3) + 16], [0, 0.6, 0], clamp);
  const k = interpolate(f, [R('récupères', 40) - 6, R('euros', 70)], [0, 1], ease);
  const J = {x: RC.x - 280 * k, z: RC.z - 0.1 * k, n: 10 + Math.round(10 * k)};
  const cams = [
    () => camCase(e, 300 - (40 * t) / d, 170, 0.1),
    () => orbite(P.x, P.z, 1.35, 165 + (25 * t) / d, -420, {pitch: 7}),
  ];
  const cam = makeCam(cams[i]());
  const saute = i === 1 ? -Math.abs(Math.sin(t / 5)) * 100 : 0;
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={doux(t)} roll={[0, -1][i]}
      o={{jetons: J, env: k < 0.5 ? {x: RC.x - 60, z: RC.z + 0.04} : null, mise: 1, allume: i === 0 ? (n) => (n === 3 ? 0.6 + 0.4 * Math.sin(f / 4) : 0) : null, lustres: 1.4, billets: i === 1,
        joueur: {smile: 1, worry: 0, eyes: 1.3, sweat: 0, epauleG: 150, coudeG: 20, epauleD: -150, coudeD: -20, lift: saute}, gens: {}}}
      dessus={<rect width="1080" height="1920" fill="#fff" opacity={flash} />} />
  );
});

// 12. Et c'est exactement ça, le piège. Ton cerveau croit que t'as une technique.
const Piege = scene('piege', ({f, fg, i, t, d, R}) => {
  const fige = interpolate(f, [R('piège', 48) - 6, R('piège', 48) + 14], [1, 0.25], clamp);
  const cams = [
    () => camFace(P.x, P.z, 1, 0.62 - (0.15 * t) / d, t, d, {dy: -15, push: 0}),
    () => vise([P.x + 120, -330, P.z - 0.55 - (0.6 * t) / d], [W.x + 200, TABLE_Y - 40, W.z]),
  ];
  const cam = makeCam(cams[i]());
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={doux(t)} roll={[0, -1][i]}
      o={{jetons: {x: RC.x - 280, z: RC.z - 0.1, n: 20}, mise: 1, rouge: '#ff0018', joueur: i === 0 ? {smile: fige, worry: 0.6, sweat: 0} : {smile: 0.55, brows: 7, worry: 0, sweat: 0}, chrono: false,
        allume: i === 1 ? (n) => (couleurDe(n) === 'rouge' ? 0.4 + 0.4 * Math.sin(f / 6) : 0) : null}} />
  );
});

// 13. Alors… tu t'arrêtes là, ou tu rejoues tout ? (le dilemme habituel, seul texte en plus des sous-titres)
const Dilemme = scene('dilemme', ({f, fg, i, t, d, R}) => {
  const cams = [
    () => camFace(P.x, P.z, 1, 0.75, t, d, {dx: 80, dy: 0, push: 0.1}),
    () => camDessus(t, d, 1000, 12, 10),
  ];
  const cam = makeCam(cams[i]());
  const dis = R('tout', 88);
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={doux(t)} roll={0}
      o={{jetons: {x: RC.x - 280, z: RC.z - 0.1, n: 20}, mise: 1, chrono: false, joueur: {worry: 0.6, smile: 0.3, pupilX: -8, eyes: 1.1}}}
      dessus={
        <g>
          <Choix f={f} debut={R('tarrêtes', 25)} x={540} y={250} texte="JE M'ARRÊTE" emoji="1f4b0" couleur="#3ad86a" />
          <Choix f={f} debut={R('rejoues', 81)} x={540} y={450} texte="JE REJOUE TOUT" emoji="1f501" couleur="#ff3a4a" />
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

// Police Montserrat Black pour l'interface
const usePolice = () => {
  const [h] = useState(() => delayRender('police'));
  useEffect(() => {
    const ff = new FontFace('MontB', `url(${staticFile('fonts/Montserrat-Black.ttf')})`);
    ff.load()
      .then((x) => {
        document.fonts.add(x);
        continueRender(h);
      })
      .catch(() => continueRender(h));
  }, [h]);
};

const COMPOSANTS = {mise: Mise, coeur: Coeur2, bille: Bille, perte: Perte, relance: Relance, erreur: Erreur, chiffre: Chiffre, tapis: Tapis, tension: Tension, silence: Silence, twist: Twist, piege: Piege, dilemme: Dilemme};
export const Roulette1000 = () => {
  usePolice();
  return (
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
};
export {DUREES};
