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
const OMEGA = 1.1 / 30;
const TOURS = EV.tours.map((t, i) => ({...t, debut: G(t.debut), saut: G(t.saut), fin: G(t.fin), prev: i ? EV.tours[i - 1].num : 5}));
const mod2pi = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
const etatRoue = (fg) => {
  const th = OMEGA * fg;
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
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
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
  const st = stress(fg);
  const r = roll + Math.sin(fg * 1.7) * 0.35 * st;
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
      {sec < 2.2 && fini === 0 && (
        <text x="0" y="128" fontSize="40" textAnchor="middle" fontFamily={MONT} fill="#ffd23e" stroke="#000" strokeWidth="8" paintOrder="stroke">
          RIEN NE VA PLUS
        </text>
      )}
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
// texte qui claque (pop + léger angle)
const Claque = ({f, debut, y, texte, couleur = '#fff', taille = 96, fond = null, angle = -4, fin = 9999, contour = '#000'}) => {
  if (f < debut || f > fin) return null;
  const p = spring({frame: f - debut, fps: 30, config: {damping: 9, stiffness: 160}});
  const lignes = texte.split('\n');
  return (
    <g transform={`translate(540 ${y}) rotate(${angle * p}) scale(${p})`}>
      {fond && <rect x={-Math.max(...lignes.map((l) => l.length)) * taille * 0.36 - 40} y={-taille * 0.95} width={Math.max(...lignes.map((l) => l.length)) * taille * 0.72 + 80} height={taille * 1.25 * lignes.length + 20} rx="30" fill={fond} opacity="0.92" />}
      {lignes.map((l, k) => (
        <text key={k} y={k * taille * 1.12} fontSize={taille} textAnchor="middle" fontFamily={MONT} fill={couleur} stroke={contour} strokeWidth={taille * 0.12} paintOrder="stroke">
          {l}
        </text>
      ))}
    </g>
  );
};
// pastille du résultat : « 17 NOIR »
const Resultat = ({f, debut, num, y = 760}) => {
  if (f < debut) return null;
  const p = spring({frame: f - debut, fps: 30, config: {damping: 8}});
  const col = couleurDe(num);
  const bg = col === 'rouge' ? '#d0141e' : col === 'noir' ? '#16161a' : '#14a84a';
  return (
    <g transform={`translate(540 ${y}) scale(${p}) rotate(${(1 - p) * -14})`}>
      <rect x="-300" y="-110" width="600" height="220" rx="110" fill={bg} stroke="#ffd23e" strokeWidth="12" />
      <text x="-170" y="52" fontSize="150" textAnchor="middle" fontFamily={MONT} fill="#fff">{num}</text>
      <text x="95" y="40" fontSize="96" textAnchor="middle" fontFamily={MONT} fill="#fff">{col === 'rouge' ? 'ROUGE' : col === 'noir' ? 'NOIR' : 'VERT'}</text>
    </g>
  );
};
const Emoji = ({f, debut, code, x, y, taille = 150}) => {
  if (f < debut) return null;
  const p = spring({frame: f - debut, fps: 30, config: {damping: 8}});
  return <image href={staticFile(`emoji/${code}.svg`)} x={x - (taille * p) / 2} y={y - (taille * p) / 2 + Math.sin((f - debut) / 6) * 8} width={taille * p} height={taille * p} />;
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

// 1. Imagine. 1 000 € sur le rouge, la bille tourne déjà.
const Mise = scene('mise', ({f, fg, i, t, d, R}) => {
  const e = etatRoue(fg);
  const glisse = interpolate(f, [R('poser', 40) - 14, R('rouge', 74)], [0, 1], ease);
  const J = {x: RC.x, z: RC.z - 0.32 * (1 - glisse), n: 10};
  const cams = [
    () => camDessus(t, d, 1000, 40, 10),
    () => vise([RC.x + 260, TABLE_Y - 150, RC.z - 0.42], [RC.x - 20, TABLE_Y - 20, RC.z]),
    () => vise([P.x + 230, -300, P.z - 0.8 + (0.25 * t) / d], [W.x, TABLE_Y, W.z]),
    () => camFace(P.x, P.z, 1, 0.55, t, d, {dy: -10, push: 0.15}),
    () => vise([2400 - (500 * t) / d, -1150 + (200 * t) / d, 1.0 + (0.6 * t) / d], [-150, 0, 5.0]),
  ];
  const cam = makeCam(cams[i]());
  const titreP = spring({frame: f, fps: 30, config: {damping: 11}});
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={punch(t, 0.14)} roll={[0, 4, -3, 2, -2][i]}
      o={{jetons: J, mise: glisse, joueur: i === 3 ? {sweat: 1, pupilX: -6, pupilY: 4} : {}, coeur: f >= R('tout', 129), chronoY: f < R('tout', 129) ? 380 : 330}}
      dessus={
        <g>
          {f < R('tout', 129) && (
            <g transform={`translate(540 125) scale(${titreP})`}>
              <text y="0" fontSize="84" textAnchor="middle" fontFamily={MONT} fill="#fff" stroke="#000" strokeWidth="12" paintOrder="stroke">ET SI TU MISAIS</text>
              <text y="104" fontSize="104" textAnchor="middle" fontFamily={MONT} fill="#ff2a3a" stroke="#000" strokeWidth="12" paintOrder="stroke">1 000 € ?</text>
            </g>
          )}
          {e && null}
        </g>
      }
    />
  );
});

// 2. Ton cœur cogne. Tu te vois déjà avec 2 000 €…
const Coeur2 = scene('coeur', ({f, fg, i, t, d, R}) => {
  const cams = [
    () => camRas(200 + (50 * t) / d, 520, 140),
    () => orbite(P.x, P.z, 0.95, 150 + (45 * t) / d, -180, {pitch: 4}),
    () => camFace(P.x, P.z, 1, 1.25, t, d, {dy: 140, pitch: -9, push: 0.25}),
  ];
  const cam = makeCam(cams[i]());
  const reve = i > 0;
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={punch(t)} roll={[-5, 3, -2][i]}
      o={{billets: reve, joueur: reve ? {smile: 0.9, worry: 0, eyes: 1.15, epauleG: 30, coudeG: 110, epauleD: -30, coudeD: -110, sweat: 0} : {}, lustres: reve ? 1.4 : 1}}
      dessus={
        <g>
          {reve && <rect width="1080" height="1920" fill="#ffd23e" opacity={0.08 + 0.04 * Math.sin(f / 4)} />}
          <Claque f={f} debut={R('deux', 58)} y={760} texte="2 000 €" couleur="#ffd23e" taille={150} />
          <Emoji f={f} debut={R('téléphone', 98) - 4} code="1f4f1" x={250} y={1000} taille={170} />
          <Emoji f={f} debut={R('vacances', 123) - 4} code="1f334" x={830} y={1020} taille={170} />
        </g>
      }
    />
  );
});

// 3. La bille saute. Rouge, noir, rouge… elle vacille… et tombe.
const Bille = scene('bille', ({f, fg, i, t, d, R}) => {
  const e = etatRoue(fg);
  const cams = [
    () => camBille(e, 260, 190, 0.35),
    () => camFace(P.x, P.z, 1, 0.34, t, d, {dy: -25, push: 0.06}),
    () => camBille(e, 200, 110, -0.7),
    () => camCase(e, 520 - (120 * t) / d, 160, 0.5),
    () => camCase(e, 300 - (90 * t) / d, 230, -0.3),
  ];
  const cam = makeCam(cams[i]());
  const [bx] = billeMonde(e);
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={punch(t, 0.16)} roll={[6, -3, -7, 4, 0][i]}
      o={{joueur: {eyes: 1.5, pupilX: interpolate(bx, [W.x - 300, W.x + 300], [-9, 9], clamp), pupilY: 5, worry: 1}}} />
  );
});

// 4. Noir. Dix-sept. Le râteau emporte tes jetons.
const Perte = scene('perte', ({f, fg, i, t, d, bornes, R}) => {
  const e = etatRoue(fg);
  const k = interpolate(f, [R('râteau', 45), R('jetons', 87) + 4], [0, 1], ease);
  const tete = [RC.x + (K.x - 120 - RC.x) * k, RC.z + 0.06 + (5.3 - RC.z - 0.06) * k];
  const J = {x: tete[0], z: tete[1] - 0.06, n: k < 0.98 ? 10 : 0};
  const cams = [
    () => camCase(e, 380 - (140 * t) / d, 200, 0.2),
    () => vise([K.x + 420, -700 + (80 * t) / d, K.z + 0.45], [(RC.x + K.x) / 2 + 60, TABLE_Y, (RC.z + 5.3) / 2]),
    () => camFace(P.x, P.z, 1, 0.6, t, d, {dy: 10, push: 0.2}),
  ];
  const cam = makeCam(cams[i]());
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={punch(t, i === 0 ? 0.22 : 0.12)} roll={[0, -4, 5][i]}
      o={{jetons: J, rateau: f >= R('râteau', 45) - 8 ? tete : null, joueur: {worry: 1, eyes: 1.4, scream: i === 2 ? 0.8 : 0.3, epauleG: 35, coudeG: 130, epauleD: -35, coudeD: -130},
        croupierPose: {epauleD: -50, coudeD: -40}, tableau: {nouveau: f, eclat: 1}, mise: 0.6 * (1 - k)}}
      dessus={
        <g>
          {f < bornes[2] && <Resultat f={f} debut={R('noir', 2)} num={17} y={760} />}
          <Claque f={f} debut={Math.max(R('emporte', 69), bornes[2])} y={600} texte="- 1 000 €" couleur="#ff2a3a" taille={130} />
        </g>
      }
    />
  );
});

// 5. Une petite voix : « cinq noirs d'affilée, le rouge va forcément tomber. » Il te reste le loyer.
const Relance = scene('relance', ({f, fg, i, t, d, R}) => {
  const ENV = {x: 640, z: 4.56};
  const cams = [
    () => camFace(P.x, P.z, 1, 0.42, t, d, {dx: -40, dy: -20, push: 0.1}),
    () => vise([(TABLEAU.x0 + TABLEAU.x1) / 2 + 380 - (120 * t) / d, -640, TABLEAU.z - 1.0 + (0.25 * t) / d], [(TABLEAU.x0 + TABLEAU.x1) / 2, -690, TABLEAU.z]),
    () => orbite(W.x, W.z, 0.75, 210 - (60 * t) / d, -620, {pitch: 38}),
    () => vise([ENV.x + 120, TABLE_Y - 380, ENV.z - 0.28], [ENV.x, TABLE_Y, ENV.z]),
    () => vise([ENV.x - 160, TABLE_Y - 210 + (60 * t) / d, ENV.z - 0.2], [ENV.x, TABLE_Y - 20, ENV.z + 0.02]),
  ];
  const cam = makeCam(cams[i]());
  const tente = interpolate(f, [R('rouge', 112) - 10, R('rouge', 112) + 30], [0, 1], clamp);
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={punch(t)} roll={[-6, 3, 4, -2, 7][i]}
      o={{jetons: false, env: {...ENV, ouverte: i === 4 ? 1 : 0}, joueur: {worry: 0.9, pupilX: 8, pupilY: -3, brows: 4}, tableau: {eclat: i === 1 ? 1 : 0.3},
        allume: i === 2 ? (n) => (couleurDe(n) === 'rouge' ? tente * (0.5 + 0.5 * Math.sin(f / 3 + n)) : 0) : null, mise: 0, vignette: i === 0 ? 1.3 : 1}}
      dessus={
        <g>
          {i === 0 && <rect width="1080" height="1920" fill="#000" opacity="0.25" />}
          <Claque f={f} debut={R('cinq', 76)} fin={R('le', 106) + 6} y={1100} texte={"5 NOIRS\nD'AFFILÉE"} couleur="#fff" taille={110} fond="#141418" />
          <Claque f={f} debut={R('forcément', 126)} fin={R('il', 158) - 2} y={1100} texte={'LE ROUGE VA\nTOMBER… ?'} couleur="#ff3a3a" taille={100} />
          <Claque f={f} debut={R('reste', 167)} y={760} texte="1 000 €" couleur="#ffd23e" taille={140} fin={R('largent', 193) - 2} />
          <Claque f={f} debut={R('loyer', 210)} y={760} texte="LE LOYER 😬" couleur="#ff3a3a" taille={120} />
        </g>
      }
    />
  );
});

// 6. Sauf que c'est faux. La roue n'a aucune mémoire. Monte-Carlo, 1913 : 26 noirs de suite.
const Erreur = scene('erreur', ({f, fg, i, t, d, bornes, R}) => {
  const e = etatRoue(fg);
  const sepia = i >= 2 ? (i === 5 ? interpolate(t, [d * 0.6, d], [0.85, 0], clamp) : 0.85) : 0;
  const compte = Math.round(interpolate(f, [R('noir', 150), R('suite', 192) + 6], [1, 26], clamp));
  const sweep = interpolate(f, [R('misant', 259) - 6, R('rouge', 278) + 8], [0, 1], ease);
  const piles = [[RC.x, RC.z, 12], [RC.x + 90, RC.z + 0.05, 8], [RC.x - 80, RC.z - 0.03, 15], [RC.x + 30, RC.z + 0.09, 6]].map(([x, z, n]) => ({x: x + (K.x - 100 - x) * sweep, z: z + (5.3 - z) * sweep, n: sweep > 0.97 ? 0 : n, c: '#e8e0c8'}));
  const cams = [
    () => camFace(P.x, P.z, 1, 0.85, t, d, {dx: -60, dy: -30, push: 0.3}),
    () => camDessus(t, d, 1300 - (300 * t) / d, -60, 120),
    () => vise([-2400 + (700 * t) / d, -900, 2.0], [-400, -100, 6.5]),
    () => camDessus(t, d, 760, 25, 300),
    () => vise([1250 - (250 * t) / d, -480, 6.7], [900, -150, 4.2]),
    () => vise([RC.x + 330, TABLE_Y - 170, RC.z - 0.5], [RC.x - 80, TABLE_Y - 20, RC.z + 0.15]),
  ];
  const cam = makeCam(cams[i]());
  const points = [...Array(26)].map((_, k) => (
    <circle key={k} cx={540 - 12.5 * 34 + k * 34} cy={1060} r={k < compte ? 14 : 9} fill={k < compte ? '#16161a' : '#444'} stroke={k < compte ? '#fff' : 'none'} strokeWidth="3" />
  ));
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={punch(t, i === 0 ? 0.25 : 0.12)} roll={[0, 3, -3, 5, -2, 4][i]}
      o={{jetons: false, sepia, autresJetons: i === 5 ? piles : [], rateau: i === 5 ? [piles[0].x, piles[0].z + 0.06] : null, gens: {peur: i >= 4 ? 1 : 0}, chrono: false,
        joueur: i === 0 ? {worry: 1, eyes: 1.3, brows: 0} : i >= 2 ? false : {}, mise: 0}}
      dessus={
        <g>
          <Claque f={f} debut={R('faux', 23)} fin={R('la', 36) + 2} y={760} texte="❌ FAUX" couleur="#ff2a3a" taille={170} angle={-9} />
          <Claque f={f} debut={R('aucune', 53)} fin={R('en', 85) - 2} y={760} texte={'AUCUNE\nMÉMOIRE'} couleur="#fff" taille={110} fond="#141418" />
          <Claque f={f} debut={R('mille', 91)} fin={R('le', 144) - 2} y={700} texte="1913" couleur="#ffe2a8" taille={170} angle={0} />
          <Claque f={f} debut={R('monte-carlo', 123)} fin={R('le', 144) - 2} y={860} texte="MONTE-CARLO" couleur="#fff" taille={92} angle={0} />
          {f >= R('noir', 150) && f < R('et', 207) && (
            <g>
              <Claque f={f} debut={R('noir', 150)} y={820} texte={`${compte} NOIRS`} couleur="#fff" taille={130} fond="#16161a" angle={0} />
              {points}
            </g>
          )}
          <Claque f={f} debut={R('fortunes', 242)} y={760} texte="💸 DES FORTUNES" couleur="#ffd23e" taille={96} angle={-3} />
        </g>
      }
    />
  );
});

// 7. 18 rouges sur 37 cases, le zéro, à la longue c'est le casino qui gagne.
const Chiffre = scene('chiffre', ({f, fg, i, t, d, R}) => {
  const vague = (n) => {
    const k = phi(n) / (2 * Math.PI);
    return Math.max(0, Math.sin((f / 30 - k) * Math.PI * 2)) ** 3;
  };
  const allumes = [
    (n) => vague(n),
    (n) => (couleurDe(n) === 'rouge' ? interpolate(f, [R('dix-huit', 57) - 6, R('dix-huit', 57) + 4], [0, 1], clamp) : 0),
    null,
    (n) => (n === 0 ? 0.6 + 0.4 * Math.sin(f / 3) : 0),
    null,
    null,
  ];
  const e = etatRoue(fg);
  const zero = (() => {
    const a = e.th + phi(0);
    return [W.x + 612 * E * Math.cos(a), TABLE_Y, W.z + (612 * E * Math.sin(a)) / 1000];
  })();
  const cams = [
    () => orbite(W.x, W.z, 0.7, 120 + (70 * t) / d, -360, {pitch: 26}),
    () => camDessus(t, d, 900, 20, 200),
    () => camRas(40 + (80 * t) / d, 430, 70),
    () => vise([zero[0] + 210, zero[1] - 260, zero[2] - 0.12], zero),
    () => vise([0, -900 - (500 * t) / d, 2.2 - (1.2 * t) / d], [-300, 0, 5.2]),
    () => camFace(K.x, K.z, -1, 0.55, t, d, {dy: -10, push: 0.15}),
  ];
  const cam = makeCam(cams[i]());
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={punch(t)} roll={[3, 0, -6, 4, -2, 3][i]}
      o={{jetons: false, allume: allumes[i], chrono: false, croupierPose: i === 5 ? {smile: 0.7, brows: 4} : {}, banque: i === 5 ? Math.floor(t / 3) : 0, mise: 0}}
      dessus={
        <g>
          <Claque f={f} debut={R('trente-sept', 9)} fin={R('seulement', 42) - 2} y={760} texte="37 CASES" couleur="#fff" taille={130} />
          <Claque f={f} debut={R('dix-huit', 57)} fin={R('à', 92) - 2} y={760} texte="18 / 37" couleur="#ff2a3a" taille={170} />
          <Claque f={f} debut={R('avantage', 160) - 4} fin={R('et', 182) - 2} y={760} texte={'LE 0 VERT\n= POUR LE CASINO'} couleur="#3aff7a" taille={84} fond="#0b1a10" angle={0} />
          <Claque f={f} debut={R('gagne', 236) - 2} y={760} texte="🏦 LE CASINO GAGNE" couleur="#ffd23e" taille={84} />
        </g>
      }
    />
  );
});

// 8. Mais t'écoutes pas. Le loyer sur le rouge. Le croupier lance la bille.
const Tapis = scene('tapis', ({f, fg, i, t, d, R}) => {
  const k = interpolate(f, [R('poses', 37) - 4, R('rouge', 67)], [0, 1], ease);
  const env = {x: 640 + (RC.x - 640) * k, z: 4.56 + (RC.z - 4.56) * k};
  const lance = f >= R('lance', 96) - 6;
  const cams = [
    () => camFace(P.x, P.z, 1, 0.46, t, d, {dy: 20, push: 0.18, pitch: -3}),
    () => vise([RC.x + 360, TABLE_Y - 110, RC.z - 0.36], [RC.x + 60, TABLE_Y - 10, RC.z]),
    () => vise([K.x - 120, -420, K.z + 0.75], [W.x, TABLE_Y, W.z]),
  ];
  const cam = makeCam(cams[i]());
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={punch(t)} roll={[-7, 3, -3][i]}
      o={{jetons: false, env, mise: k, joueur: {brows: 8, worry: 0.2, eyes: 1.1, pupilY: 3}, croupierPose: lance ? {epauleD: -95, coudeD: -30} : {}}}
      dessus={<Claque f={f} debut={R('loyer', 51)} fin={R('croupier', 87) - 6} y={760} texte="LOYER ➜ ROUGE" couleur="#ff2a3a" taille={110} fond="#141418" />}
    />
  );
});

// 9. Tout le monde se tait. Tu serres la table. La bille ralentit… rouge, noir, rouge…
const Tension = scene('tension', ({f, fg, i, t, d, R}) => {
  const e = etatRoue(fg);
  const cams = [
    () => vise([-1300 + (200 * t) / d, -480, 6.5], [P.x + 300, -180, P.z]),
    () => camFace(P.x, P.z, 1, 0.5 - (0.12 * t) / d, t, d, {dx: 30 - (60 * t) / d, dy: -15, push: 0}),
    () => vise([P.x + 40, -40, 3.62], [P.x, TABLE_Y + 10, 4.4]),
    () => camBille(e, 190, 130, 0.3),
    () => camBille(e, 150, 95, -0.5),
    () => camFace(P.x, P.z, 1, 0.3, t, d, {dy: -25, push: 0}),
    () => camBille(e, 130, 80, 0.8),
  ];
  const cam = makeCam(cams[i]());
  const env = {x: RC.x, z: RC.z};
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={punch(t, i >= 4 ? 0.22 : 0.12)} roll={[2, -4, 0, 6, -7, 3, 8][i]}
      o={{jetons: false, env, mise: 1, joueur: i === 2 ? false : {eyes: 1.5, worry: 1, sweat: 1, pupilX: i === 5 ? 9 : 0, pupilY: 5}, gens: {fige: 1}, mains: i === 2 ? {serre: 1, tremble: 10} : null,
        noir: 0.08 + 0.18 * (i / 6), lustres: 1 - 0.4 * (i / 6)}}
    />
  );
});

// 10. Elle tombe. (silence total) : la bille tombe, puis il ferme les yeux (on ne voit pas la case)
const Silence = scene('silence', ({f, fg, i, t, d}) => {
  const e = etatRoue(fg);
  const cam = makeCam(i === 0 ? camBille(e, 120, 70, 0.5) : camFace(P.x, P.z, 1, 0.3 - (0.06 * t) / d, t, d, {dy: -25, push: 0}));
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={1.05 + (0.08 * t) / d} roll={[-3, 2][i]}
      o={{jetons: false, env: {x: RC.x, z: RC.z}, mise: 1, noir: 0.35, lustres: 0.4, lampe: 0.5, joueur: {eyes: 0.08, worry: 1, sweat: 1, brows: 6}}} />
  );
});

// 11. Rouge. Trois. Tu récupères 2 000 €. Ton cœur explose !
const Twist = scene('twist', ({f, fg, i, t, d, bornes, R}) => {
  const e = etatRoue(fg);
  const flash = interpolate(f, [R('rouge', 3), R('rouge', 3) + 2, R('rouge', 3) + 12], [0, 0.85, 0], clamp) + interpolate(f, [R('explose', 98), R('explose', 98) + 2, R('explose', 98) + 10], [0, 0.6, 0], clamp);
  const k = interpolate(f, [R('récupères', 40) - 6, R('euros', 70)], [0, 1], ease);
  const J = {x: RC.x - 280 * k, z: RC.z - 0.1 * k, n: 10 + Math.round(10 * k)};
  const cams = [
    () => camCase(e, 300 - (90 * t) / d, 160, 0.1),
    () => vise([RC.x + 300, TABLE_Y - 150, RC.z - 0.48], [RC.x, TABLE_Y - 30, RC.z - 0.06]),
    () => orbite(P.x, P.z, 1.35, 158 + (44 * t) / d, -420, {pitch: 7}),
  ];
  const cam = makeCam(cams[i]());
  const saute = i === 2 ? -Math.abs(Math.sin(t / 4)) * 120 : 0;
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={punch(t, 0.2)} roll={[0, 4, -6][i]}
      o={{jetons: J, env: k < 0.5 ? {x: RC.x - 60, z: RC.z + 0.04} : null, mise: 1, allume: i === 0 ? (n) => (n === 3 ? 0.6 + 0.4 * Math.sin(f / 2) : 0) : null, lustres: 1.5, billets: i === 2,
        joueur: {smile: 1, worry: 0, eyes: 1.3, sweat: 0, epauleG: 150, coudeG: 20, epauleD: -150, coudeD: -20, lift: saute}, gens: {}}}
      dessus={
        <g>
          <rect width="1080" height="1920" fill="#fff" opacity={flash} />
          {f < bornes[1] + 6 && <Resultat f={f} debut={R('rouge', 3)} num={3} y={760} />}
          <Claque f={f} debut={R('deux', 58)} y={1060} texte="+ 2 000 €" couleur="#3aff7a" taille={140} />
        </g>
      }
    />
  );
});

// 12. Et c'est exactement ça, le piège. Ton cerveau croit que t'as une technique.
const Piege = scene('piege', ({f, fg, i, t, d, R}) => {
  const fige = interpolate(f, [R('piège', 48) - 6, R('piège', 48) + 10], [1, 0.25], clamp);
  const cams = [
    () => camFace(P.x, P.z, 1, 0.62 - (0.25 * t) / d, t, d, {dy: -15, push: 0}),
    () => vise([P.x + 120, -330, P.z - 0.55 - (0.9 * t) / d], [W.x + 200, TABLE_Y - 40, W.z]),
    () => camFace(P.x, P.z, 1, 0.42, t, d, {dx: 40, dy: -5, push: 0.12, pitch: 2}),
  ];
  const cam = makeCam(cams[i]());
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={punch(t, 0.08)} roll={[0, -3, 5][i]}
      o={{jetons: {x: RC.x - 280, z: RC.z - 0.1, n: 20}, mise: 1, rouge: '#ff0018', joueur: i === 2 ? {smile: 0.55, brows: 7, worry: 0, eyes: 0.8, sweat: 0} : {smile: i === 0 ? fige : 0.3, worry: 0.6, sweat: 0}, chrono: false,
        allume: i === 1 ? (n) => (couleurDe(n) === 'rouge' ? 0.4 + 0.4 * Math.sin(f / 4) : 0) : null}}
      dessus={
        <g>
          <Claque f={f} debut={R('piège', 48)} fin={R('maintenant', 64) + 4} y={760} texte="LE PIÈGE" couleur="#ff2a3a" taille={170} angle={-6} />
          <Claque f={f} debut={R('technique', 133) - 4} y={1080} texte={'« J\'AI UNE\nTECHNIQUE »'} couleur="#ffd23e" taille={100} fond="#141418" angle={3} />
          <Emoji f={f} debut={R('cerveau', 90)} code="1f92f" x={830} y={560} taille={190} />
        </g>
      }
    />
  );
});

// 13. Alors… tu t'arrêtes là, ou tu rejoues tout ?
const Dilemme = scene('dilemme', ({f, fg, i, t, d, R}) => {
  const cams = [
    () => camFace(P.x, P.z, 1, 0.75, t, d, {dx: 80, dy: 0, push: 0.2}),
    () => camDessus(t, d, 1000, 40, 10),
  ];
  const cam = makeCam(cams[i]());
  const dis = R('tout', 88);
  return (
    <Vue f={f} fg={fg} cam={cam} i={i} t={t} d={d} zoom={punch(t)} roll={[-3, 0][i]}
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
