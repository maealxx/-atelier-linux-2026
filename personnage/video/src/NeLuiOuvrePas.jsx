import {AbsoluteFill, Easing, interpolate, random, Series, spring, staticFile, useCurrentFrame} from 'remotion';
import {chalet, chaletExt, Neige} from './Chalet';
import {foret, SOL, Voile} from './ForetNuit';
import {montage, Plan} from './montage';
import {clamp, makeCam, marche, Perso} from './moteur';
import {DEBOUT, doigts, ECARTE, galop, marcheRodeur, melange, QUATRE, RodeurMonde, TeteRodeur} from './Rodeur';
import {TelReel} from './TelReel';
import PLANS from './chalet/plans.json';
import timeline from './chalet/timeline.json';

// « Ne lui ouvre pas » : seul dans un chalet sous la tempête. Alerte : ne laissez entrer personne. On frappe : « C'est
// moi, Léo ! » Un inconnu : « Ce n'est pas lui. » Dehors, une silhouette immense. Le verrou cède. Dilemme au milieu :
// l'armoire (tu meurs, on rembobine en VHS) ou sous le lit (son visage descend jusqu'au sol, un cri dehors l'attire).
// Puis Léo écrit : « Ouvre vite, il revient. » On frappe… Dilemme final.
const {decoupe, repere, SCENES} = montage(timeline, PLANS);
export const DUREE_CHALET = SCENES.reduce((t, [, d]) => t + d, 0);
const START = {};
const DUREE = {};
SCENES.reduce((t, [nom, d]) => {
  START[nom] = t;
  DUREE[nom] = d;
  return t + d;
}, 0);
const G = (nom, mot, def) => START[nom] + repere(nom, mot, def);

const EZ = Easing.bezier(0.45, 0, 0.55, 1);
const lisse = (t, d) => EZ(Math.min(1, Math.max(0, t / Math.max(1, d))));
const ease = (f, a, b, e = EZ) => interpolate(f, [a, b], [0, 1], {...clamp, easing: e});
const lerp = (a, b, t) => a + (b - a) * t;
const tremble = (f, k, cle) => k * (random(`${cle}${f}`) - 0.5);
const deg = (r) => (r * 180) / Math.PI;
const vise = (p, c, extra = {}) => {
  const dx = c[0] - p[0];
  const dy = c[1] - p[1];
  const dz = (c[2] - p[2]) * 1000;
  return {x: p[0], y: p[1], z: p[2], yaw: deg(Math.atan2(dx, dz)), pitch: deg(Math.atan2(dy, Math.hypot(dx, dz))), ...extra};
};
const main = (f, k = 1) => ({dx: k * (5 * Math.sin(f / 23) + 3 * Math.sin(f / 9.7)), dy: k * 3 * Math.sin(f / 17 + 1), r: k * 0.35 * Math.sin(f / 31)});
const PLAN = {grain: 0.03, vignette: 0.8};

// ----- l'alarme rouge (alerte d'urgence) : flashs de 7 images, de la 1re seconde à la fin de l'alerte -----
const ALARME = [30, START.leo + 20];
const rouge = (fg) => (fg < ALARME[0] || fg > ALARME[1] + 30 ? 0 : (Math.floor((fg - ALARME[0]) / 7) % 2 === 0 ? 1 : 0.15) * (fg > ALARME[1] ? 1 - (fg - ALARME[1]) / 30 : 1));

// ----- le téléphone -----
const T_MSG = G('message', 'vibre', 63) - 2;
const T_LEO = G('leo2', 'vibre', 48) - 2;
const NOTIFS = [
  {t: 30, titre: 'ALERTE SECOURS MONTAGNE', texte: 'Ne laissez entrer personne. Même si on frappe.', alerte: true},
  {t: T_MSG, titre: 'Numéro inconnu', texte: 'Ce n’est pas lui.'},
  {t: T_LEO, titre: 'Léo', texte: 'Je suis devant la porte. Ouvre vite, il revient.', long: true},
];
const BUZZ = [30, 37, 44, T_MSG, T_LEO];
const Tel = ({fg, pose, lueur = 0.4, nuit = 0.5, allume = 1}) => (
  <TelReel f={fg} pose={pose} vib={BUZZ} notifs={NOTIFS} messages={[]} tap={null} manche="#3a2a22" heure="23:12" date="samedi 12 janvier" lueur={lueur} nuit={nuit} allume={allume} />
);
const Flou = ({children, k = 7, lum = 0.7}) => <AbsoluteFill style={{filter: `blur(${k}px) brightness(${lum})`}}>{children}</AbsoluteFill>;

// ----- les scènes : chaque rendu est gardé pour pouvoir le rejouer (rembobinage) -----
const RENDUS = {};
const appel = (nom, f) => {
  const {i, t, d, bornes} = decoupe(nom, f);
  return RENDUS[nom]({f, fg: START[nom] + f, i, t, d, bornes, R: (mot, def) => repere(nom, mot, def)});
};
const scene = (nom, rendu) => {
  RENDUS[nom] = rendu;
  const C = () => appel(nom, useCurrentFrame());
  C.displayName = nom;
  return C;
};
// l'image globale fg, quelle que soit la scène
const imageA = (fg) => {
  const nom = SCENES.find(([n, d]) => fg >= START[n] && fg < START[n] + d)?.[0] || SCENES[0][0];
  return appel(nom, Math.max(0, fg - START[nom]));
};

// ----- vues -----
const FEU_T = [1.0, 0.72, 0.56];
const NUIT_T = [0.55, 0.62, 1.0];
const ROUGE_T = [1.0, 0.35, 0.32];
const moi = (cam, {x, z, id, lum = 0.75, teinte = FEU_T, couche = 0, y = SOL, ...pose}) => {
  if (!couche) return {z, x, el: <Perso cam={cam} id={id} x={x} z={z} y={y} lum={lum} teinte={teinte} ombre={0.3} {...pose} />};
  const [px, py] = cam.proj(x, SOL - 60, z);
  return {z, x, el: <g transform={`rotate(${-80 * couche} ${px} ${py})`}><Perso cam={cam} id={id} x={x} z={z} y={SOL - 60 * couche} lum={lum} teinte={teinte} ombre={0} {...pose} /></g>};
};
const leo = (cam, {x, z, id, ...pose}) => ({z, x, el: <Perso cam={cam} id={id} x={x} z={z} lum={0.7} teinte={FEU_T} ombre={0.3} couleurs={{haut: '#3f7a52', hautO: '#2f6040', chev: '#5a3418'}} {...pose} />});
const rod = (cam, {x, z, id, lum = 1, ...r}) => ({z, x, el: <RodeurMonde cam={cam} x={x} z={z} id={id} lum={lum} {...r} />});

// intérieur
const VueIn = ({fg, cam: c, o = {}, items = [], zoom = 1, roll = 0, noir = 0, flou = null, dessus = null}) => {
  const cam = makeCam(c);
  const r = rouge(fg);
  const d = chalet(cam, fg, {rouge: r, ecran: r > 0 ? 1 : 0, ...o});
  const its = typeof items === 'function' ? items(cam, d) : items;
  return (
    <Plan {...PLAN} f={fg} cam={cam} decor={d} items={its.filter(Boolean)} zoom={zoom} roll={roll} noir={noir} flou={flou}
      dessus={<g>{d.voile}<rect width="1080" height="1920" fill="#ff1a1a" opacity={0.14 * r} style={{mixBlendMode: 'screen'}} /><rect width="1080" height="1920" fill="#ff1a1a" opacity={0.08 * r} />{dessus}</g>} />
  );
};
// dehors : forêt enneigée de nuit + le chalet + le blizzard
const VueExt = ({fg, cam: c, o = {}, items = [], zoom = 1, roll = 0, noir = 0, flou = null, dessus = null, rush = 0, chaletO = {}}) => {
  const cam = makeCam(c);
  const d = foret(cam, fg, {nuit: 1, neige: 1, lumYaw: 180, lumY: -1.6, rayons: 0.4, poussiere: 0, portee: 9, degage: [[0, -1.5, 0, 4.8, 1900]], ...o});
  const its = typeof items === 'function' ? items(cam, d) : items;
  const r = rouge(fg);
  return (
    <Plan {...PLAN} f={fg} cam={cam} decor={d} items={[chaletExt(cam, fg, chaletO), ...its].filter(Boolean)} zoom={zoom} roll={roll} noir={noir} flou={flou}
      dessus={<g><Voile L={d.L} P={d.P} k={0.8} /><Neige f={fg} force={1.1} vent={[-16, 10]} rush={rush} />{r > 0 && <rect width="1080" height="1920" fill="#ff1a1a" opacity={0.05 * r} />}{dessus}</g>} />
  );
};

// ----- les deux choix (milieu) -----
const ChoixBoite = ({f, debut, x, y, texte, emoji, couleur, etat = 0}) => {
  // etat : 0 normal, 1 choisi (pulse + coche), -1 écarté (grisé)
  const p = spring({frame: f - debut, fps: 30, config: {damping: 9}});
  if (f < debut) return null;
  const w = 210 + texte.length * 29;
  const s = p * (etat === 1 ? 1.08 + 0.04 * Math.sin(f / 3) : etat === -1 ? 0.9 : 1);
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(${(1 - p) * -12})`} opacity={etat === -1 ? 0.35 : 1}>
      <rect x={-w / 2} y="-80" width={w} height="160" rx="28" fill="#0b0b0e" opacity="0.88" stroke={etat === 1 ? '#3ad86a' : couleur} strokeWidth={etat === 1 ? 10 : 6} />
      <image href={staticFile(`emoji/${emoji}.svg`)} x={-w / 2 + 24} y="-48" width="96" height="96" />
      <text x={-w / 2 + 140} y="17" textAnchor="start" fontFamily="'DejaVu Sans', Arial, sans-serif" fontWeight="900" fontSize="46" fill="#fff">
        {texte}
      </text>
      {etat === 1 && <circle cx={w / 2 - 10} cy="-70" r="34" fill="#3ad86a" />}
      {etat === 1 && <path d={`M${w / 2 - 26},-70 l12,12 l22,-24`} stroke="#fff" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
    </g>
  );
};
const Deux = ({f, a, b, choisi = 0}) => (
  <g>
    <ChoixBoite f={f} debut={a} x={540} y={300} texte="L'ARMOIRE" emoji="1f6aa" couleur="#ffb03a" etat={choisi === 1 ? 1 : choisi === 2 ? -1 : 0} />
    <ChoixBoite f={f} debut={b} x={540} y={500} texte="SOUS LE LIT" emoji="1f6cf" couleur="#5ab0ff" etat={choisi === 2 ? 1 : choisi === 1 ? -1 : 0} />
  </g>
);

// ----- effets « VHS » : rembobinage, pause -----
const VHS = ({f, children, force = 1, texte = '◀◀ REW', compteur = null}) => {
  const bandes = [0, 1, 2].map((k) => ({y: ((random(`vy${k}${Math.floor(f / 3)}`) * 2100) | 0) - 100, h: 40 + random(`vh${k}${Math.floor(f / 3)}`) * 160, dx: (random(`vd${k}${f}`) - 0.5) * 120 * force}));
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{filter: 'saturate(1.6) contrast(1.2) brightness(1.08)'}}>{children}</AbsoluteFill>
      <AbsoluteFill style={{transform: `translateX(${9 * force}px)`, mixBlendMode: 'screen', opacity: 0.42, filter: 'sepia(1) saturate(7) hue-rotate(-40deg) brightness(0.8)'}}>{children}</AbsoluteFill>
      {bandes.map((b, k) => (
        <AbsoluteFill key={k} style={{clipPath: `inset(${Math.max(0, b.y)}px 0 ${Math.max(0, 1920 - b.y - b.h)}px 0)`, transform: `translateX(${b.dx}px)`, filter: 'brightness(1.3)'}}>{children}</AbsoluteFill>
      ))}
      <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{position: 'absolute'}}>
        <defs>
          <pattern id="vhs-l" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="2" fill="#000" opacity="0.25" />
          </pattern>
          <filter id="vhs-b">
            <feTurbulence type="fractalNoise" baseFrequency="0.9 0.05" numOctaves="1" seed={f} />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
        <rect width="1080" height="1920" fill="url(#vhs-l)" />
        <rect y={1700 + 40 * Math.sin(f)} width="1080" height="70" filter="url(#vhs-b)" opacity={0.55 * force} />
        <rect y={(f * 37) % 1920} width="1080" height="26" fill="#fff" opacity={0.08 * force} />
        <text x="70" y="160" fontFamily="'DejaVu Sans Mono', monospace" fontWeight="700" fontSize="74" fill="#fff" stroke="#000" strokeWidth="3" opacity={Math.floor(f / 8) % 2 ? 1 : 0.85}>{texte}</text>
        {compteur && <text x="1010" y="1830" textAnchor="end" fontFamily="'DejaVu Sans Mono', monospace" fontWeight="700" fontSize="56" fill="#fff" stroke="#000" strokeWidth="3">{compteur}</text>}
      </svg>
    </AbsoluteFill>
  );
};
const fmt = (s) => `0:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// les lattes de l'armoire, vues de l'intérieur (par-dessus l'image)
const Lattes = ({ferme = 1, f}) => (
  <g>
    {/* les deux battants qui se referment (bords) */}
    <rect x={-60} y="0" width={600 * ferme + 60} height="1920" fill="url(#la-b)" opacity={ferme < 1 ? 1 : 0} />
    <defs>
      <linearGradient id="la-g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2a160a" />
        <stop offset="0.5" stopColor="#140904" />
        <stop offset="1" stopColor="#070302" />
      </linearGradient>
      <pattern id="la-p" width="1080" height="64" patternUnits="userSpaceOnUse" y={Math.sin(f / 15) * 3}>
        <rect width="1080" height="46" fill="url(#la-g)" />
      </pattern>
      <radialGradient id="la-v" cx="540" cy="960" r="1100" gradientUnits="userSpaceOnUse">
        <stop offset="0.3" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.85" />
      </radialGradient>
    </defs>
    <g transform={`translate(540 0) scale(${ferme} 1) translate(-540 0)`}>
      <rect width="1080" height="1920" fill="url(#la-p)" />
      <rect x="532" width="16" height="1920" fill="#0a0503" />
    </g>
    <rect width="1080" height="1920" fill="url(#la-v)" />
  </g>
);

// ----- caméra subjective : à hauteur des yeux, portée à la main, avec le pas si on marche -----
const OEIL = -150;
const pov = (fg, p, c, {k = 1, pas = 0, v = 0.21} = {}) => {
  const m = main(fg, k);
  const bob = -Math.abs(Math.sin(fg * v)) * 16 * pas;
  const sway = Math.sin(fg * v) * 9 * pas;
  return vise([p[0] + m.dx + sway, p[1] + m.dy + bob, p[2]], c);
};
const roulis = (fg, k = 1, pas = 0, v = 0.21) => main(fg, k).r + Math.sin(fg * v) * 0.9 * pas;
const mixC = (a, b, u) => a.map((x, i) => x + (b[i] - x) * u);
// une main (vue subjective) qui se tend vers un point de l'écran
const MainPov = ({x, y, s = 1, rot = -20, nuit = 0.5, ouvre = 1}) => (
  <g>
    <path d={`M${x + 70 * s},${y + 90 * s} L${x + 640 * s},${y + 1200 * s} L${x + 1100 * s},${y + 900 * s} L${x + 180 * s},${y + 10 * s} Z`} fill="#3a2a22" />
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <ellipse cx="0" cy="40" rx="78" ry="92" fill="#F2C3A0" />
      {[-48, -16, 16, 46].map((dx, k) => (
        <rect key={k} x={dx - 17} y={-90 - (k === 1 || k === 2 ? 26 : 0) + (1 - ouvre) * 60} width="34" height={120 - (1 - ouvre) * 50} rx="17" fill="#F2C3A0" />
      ))}
      <rect x="62" y="10" width="34" height="96" rx="17" fill="#F2C3A0" transform="rotate(-40 79 58)" />
      <g opacity={0.55 * nuit} fill="#0a0c16">
        <ellipse cx="0" cy="40" rx="78" ry="92" />
        {[-48, -16, 16, 46].map((dx, k) => <rect key={k} x={dx - 17} y={-90 - (k === 1 || k === 2 ? 26 : 0) + (1 - ouvre) * 60} width="34" height={120 - (1 - ouvre) * 50} rx="17" />)}
      </g>
    </g>
  </g>
);

// ===== 1. Imagine. Seul dans un chalet, en pleine tempête, quand ton téléphone vibre. (5 s très dynamiques) =====
const ASSIS = [-830, 20, 0.75]; // assis près du feu
const FEU_V = [-1220, 300, 1.3];
const TEL_V = [-300, 155, 1.0];
const Vibre = scene('vibre', ({f, fg, i, t, d}) => {
  const k = lisse(t, d);
  if (i === 0) {
    // 1re image : toi, seul devant le feu (travelling avant rapide sur ton visage)
    const c = vise([ASSIS[0] + 330 - 120 * k, -170, ASSIS[2] - 0.75 + 0.3 * k], [ASSIS[0], -150, ASSIS[2]]);
    return (
      <VueIn fg={fg} cam={c} roll={lerp(-3, 0, k)} zoom={1.05 + 0.08 * k} o={{rouge: 0, ecran: 0}}
        items={(cam) => [moi(cam, {x: ASSIS[0], z: ASSIS[2], id: 'v0', lum: 0.8, pupilX: -8, smile: 0.2})]} />
    );
  }
  if (i === 1) {
    // assis devant le feu… l'alarme hurle : coup de tête vers la table où le téléphone clignote en rouge
    const w = ease(t, 4, 10, Easing.inOut(Easing.cubic));
    const vit = Math.abs(ease(t + 1, 4, 10, Easing.inOut(Easing.cubic)) - w);
    const c = pov(fg, ASSIS, mixC(FEU_V, TEL_V, w), {k: 0.8 + 1.5 * w});
    return <VueIn fg={fg} cam={c} roll={roulis(fg, 1)} zoom={1.04 + 0.08 * w} flou={vit > 0.05 ? [60 * vit, 0] : null} />;
  }
  if (i === 2) {
    // tu te lèves d'un bond et tu fonces vers la table
    const u = ease(t, 0, d, Easing.out(Easing.cubic));
    const c = pov(fg, mixC(ASSIS, [-420, OEIL, 0.55], u), TEL_V, {k: 1.4, pas: 1.2 * (1 - u), v: 0.4});
    return <VueIn fg={fg} cam={c} roll={roulis(fg, 1.4, 1.2, 0.4)} zoom={1.05} />;
  }
  if (i === 3) {
    // dehors : on fonce à travers le blizzard vers le chalet allumé
    const u = Easing.in(Easing.cubic)(Math.min(1, t / d));
    const c = {x: lerp(-300, 380, u), y: lerp(-1500, -330, u), z: lerp(17, 4.2, u), yaw: 180 + lerp(-10, 3, u), pitch: lerp(14, 2, u)};
    return <VueExt fg={fg} cam={c} rush={1.4} roll={lerp(-5, 0, u)} flou={[0, 4 * u]} />;
  }
  // tu attrapes le téléphone
  const leve = ease(t, 0, 16, Easing.out(Easing.cubic));
  const pose = {x: 540, y: lerp(1900, 900, leve), rx: lerp(62, 8, leve), ry: -4, rz: lerp(-14, -2, leve), s: 1.15};
  return (
    <AbsoluteFill>
      <Flou k={7} lum={0.6}>
        <VueIn fg={fg} cam={vise([-380, -150, 0.45], [-300, 150, 1.05])} />
      </Flou>
      <Tel fg={fg} pose={pose} lueur={0.5} nuit={0.2} />
    </AbsoluteFill>
  );
});

// ===== 2. Alerte secours montagne : « Ne laissez entrer personne. Même si on frappe. » =====
const Alerte = scene('alerte', ({f, fg, R}) => {
  const z = ease(f, R('même', 92) - 8, R('même', 92) + 10);
  const m = main(fg, 0.6);
  const pose = {x: 540 + m.dx, y: lerp(900, 1180, z) + m.dy, rx: 6, ry: -4, rz: -1.5 + m.r, s: lerp(1.18, 1.6, z)};
  return (
    <AbsoluteFill>
      <Flou k={8} lum={0.55}>
        <VueIn fg={fg} cam={vise([-380, -150, 0.45], [-300, 150, 1.05])} />
      </Flou>
      <Tel fg={fg} pose={pose} lueur={0.5} nuit={0.2} />
    </AbsoluteFill>
  );
});

// ===== 3. Léo est parti chercher du bois. Il y a une heure. (souvenir, puis maintenant) =====
const PORTE_V = [-630, -80, 2.6];
const Leo = scene('leo', ({f, fg, i, t, d}) => {
  const k = lisse(t, d);
  if (i === 0) {
    // souvenir (sépia), en vue subjective depuis le feu : Léo se retourne, fait coucou, et sort dans la tempête
    const sort = ease(t, d * 0.45, d);
    const x = lerp(-560, -640, sort);
    const z = lerp(2.25, 2.95, sort);
    const mk = marche(fg, 0.25, sort > 0 && sort < 1 ? 1 : 0);
    return (
      <AbsoluteFill style={{filter: `sepia(0.75) saturate(0.7) brightness(${0.95 + 0.06 * Math.sin(fg * 1.7)})`}}>
        <VueIn fg={fg} cam={pov(fg, ASSIS, [-620, -120, 2.6], {k: 0.5})} o={{porte: 0.85, rouge: 0, ecran: 0}} zoom={1.15}
          items={(cam) => [leo(cam, {x, z, id: 'l0', dos: sort > 0.15, smile: 1, epauleD: sort < 0.15 ? -150 + 20 * Math.sin(fg / 3) : -20, coudeD: sort < 0.15 ? -30 : 0, legG: mk.legG, legD: mk.legD, lift: mk.bob})]} />
      </AbsoluteFill>
    );
  }
  // maintenant : la porte fermée, la lumière dessous ; lent travelling avant
  return <VueIn fg={fg} cam={pov(fg, [-700, OEIL, 0.5 + 0.45 * k], PORTE_V, {k: 0.7})} roll={roulis(fg, 0.7)} zoom={1.05} />;
});

// ===== 4. On frappe à la porte. Trois coups. « C'est moi, Léo ! Ouvre, je gèle ! » =====
const KN = [28, 36, 44];
const coups = (f, liste) => liste.reduce((s, t) => s + (f >= t ? Math.exp(-(f - t) / 3) : 0), 0);
const Frappe = scene('frappe', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const cp = coups(f, KN);
  if (i === 0) {
    // « et là… » : tu tournes la tête vers la porte
    const w = ease(t, 8, 22, Easing.inOut(Easing.cubic));
    return <VueIn fg={fg} cam={pov(fg, [-620, OEIL, 0.95], mixC([-1220, 200, 1.3], PORTE_V, w), {k: 0.8})} roll={roulis(fg)} zoom={1.04} />;
  }
  const pieds = f > 60 ? [-70 + 6 * Math.sin(fg / 9), 70 + 6 * Math.sin(fg / 9 + 1)] : [];
  if (i === 1) {
    const c = pov(fg, [-600 + tremble(fg, 20 * cp, 'fk'), OEIL + tremble(fg + 1, 14 * cp, 'fk'), 1.0 + 0.55 * k], PORTE_V, {k: 0.8 + cp});
    return <VueIn fg={fg} cam={c} roll={roulis(fg)} zoom={1.04 + 0.05 * cp} o={{coups: cp, pieds}} />;
  }
  // tu t'accroupis : la lumière sous la porte, l'ombre de deux pieds… très fins
  const c = pov(fg, [-610, lerp(OEIL, 330, ease(t, 0, 14)), 1.8 + 0.25 * k], [-630, 420, 2.6], {k: 0.6});
  return <VueIn fg={fg} cam={c} zoom={1.1} roll={roulis(fg, 0.6)} o={{pieds: [-60 + 8 * Math.sin(fg / 7), 50 + 8 * Math.sin(fg / 7 + 1)]}} />;
});

// ===== 5. Tu t'approches de la porte. Ton téléphone vibre. Numéro inconnu : « Ce n'est pas lui. » =====
const Message = scene('message', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  if (i === 0) {
    // tu avances vers la porte, pas à pas
    return <VueIn fg={fg} cam={pov(fg, [-640, OEIL, 1.1 + 0.7 * k], PORTE_V, {k: 0.8, pas: 0.8})} roll={roulis(fg, 0.8, 0.8)} zoom={1.04} o={{pieds: [-60, 60]}} />;
  }
  const m = main(fg, 0.6);
  const leve = ease(t, 0, 14, Easing.out(Easing.cubic));
  const z = ease(f, R('ce', 131) - 6, R('ce', 131) + 10);
  const pose = {x: 540 + m.dx, y: lerp(lerp(2000, 900, leve), 1130, z) + m.dy, rx: lerp(50, 6, leve), ry: -4, rz: -1.5 + m.r, s: lerp(1.18, 1.55, z)};
  return (
    <AbsoluteFill>
      <Flou k={8} lum={0.55}>
        <VueIn fg={fg} cam={vise([-600, -150, 1.9], [-630, -60, 2.6])} o={{pieds: [-60, 60]}} />
      </Flou>
      <Tel fg={fg} pose={pose} lueur={0.45} nuit={0.4} />
    </AbsoluteFill>
  );
});

// ===== 6. La fenêtre : une silhouette immense dans la neige, les bras jusqu'aux genoux =====
const DEHORS = {x: 520, z: 5.4};
const Fenetre = scene('fenetre', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const resp = 0.5 + 0.5 * Math.sin(fg / 14);
  if (i < 2) {
    const c = i === 0 ? pov(fg, [150 + 280 * k, OEIL - 20, 1.3 + 0.75 * k], [450, -250, 2.6], {pas: 0.6 * (1 - k)}) : pov(fg, [450, -260, 1.75 + 0.15 * k], [500, -520, 5.4], {k: 0.5});
    // ta respiration fait de la buée sur la vitre
    const buee = i === 1 ? 0.5 + 0.5 * Math.sin(fg / 12) : 0;
    return (
      <VueIn fg={fg} cam={c} zoom={i === 1 ? 1.1 + 0.15 * k : 1.04} roll={roulis(fg, 0.6)}
        o={{dehors: <RodeurMonde cam={makeCam(c)} x={DEHORS.x} z={DEHORS.z + (i === 0 ? 1.5 : 0)} pose={DEBOUT} lum={0.7} respire={resp} tete={4 * Math.sin(fg / 30)} />}}
        dessus={buee > 0 && (
          <g>
            <defs>
              <radialGradient id="bu-g">
                <stop offset="0" stopColor="#dfe6ff" stopOpacity={0.35 * buee} />
                <stop offset="1" stopColor="#dfe6ff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse cx="560" cy="1150" rx="420" ry="300" fill="url(#bu-g)" />
          </g>
        )} />
    );
  }
  if (i === 2) {
    // dehors, plan large : elle, de dos, face au chalet
    const c = {x: 1500 - 200 * k, y: -350, z: 8.6 - 0.4 * k, yaw: 196, pitch: 1};
    return <VueExt fg={fg} cam={c} zoom={1.05} items={(cam) => [rod(cam, {x: DEHORS.x, z: DEHORS.z, id: 'fe2', pose: DEBOUT, dos: true, lum: 0.75, respire: resp})]} />;
  }
  // en contre-plongée, de face, éclairée par la fenêtre : les bras qui pendent jusqu'aux genoux
  const c = {x: 380, y: 250, z: DEHORS.z - 1.9 + 0.3 * k, yaw: 0, pitch: -14};
  return (
    <VueExt fg={fg} cam={c} o={{lumYaw: 10, lumY: -1.4}} zoom={1.0}
      items={(cam) => [rod(cam, {x: DEHORS.x, z: DEHORS.z, id: 'fe3', pose: DEBOUT, lum: 0.95, respire: resp, tete: -10 * ease(t, 10, 50), rim: '#ffd8b0'})]} />
  );
});

// ===== 7. La poignée tourne toute seule. Le verrou cède. (tu recules) =====
const Serrure = scene('serrure', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const p = ease(f, R('poignée', 11), R('seule', 45)) * (1 - 0.15 * Math.max(0, Math.sin(f / 2.2)));
  const cede = R('cède', 77) - 2;
  const v = f < cede ? 0.06 * Math.sin(f * 2.4) * ease(f, 50, 60) : 1;
  const flash = interpolate(f - cede, [0, 2, 8], [0, 0.6, 0], clamp);
  if (i === 0) {
    // tu recules sans quitter la poignée des yeux
    const c = pov(fg, [-560, OEIL + 40, 2.15 - 0.35 * k], [-508, 20, 2.6], {k: 0.9, pas: 0.4, v: 0.15});
    return <VueIn fg={fg} cam={c} roll={roulis(fg, 0.9)} zoom={1.25 + 0.35 * k} o={{poignee: p, verrou: v}} />;
  }
  const c = pov(fg, [-540, -50 + tremble(fg, f >= cede ? 16 : 0, 'sv'), 2.3], [-508, -60, 2.6], {k: 0.6});
  return <VueIn fg={fg} cam={c} zoom={1.0} o={{poignee: p, verrou: v, porte: f >= cede ? 0.03 : 0}} dessus={<rect width="1080" height="1920" fill="#fff" opacity={flash} />} />;
});

// ===== 8. Te cacher : l'armoire, ou sous le lit ? 3 secondes pour choisir (chrono en millisecondes) =====
const ARMOIRE_V = [1050, -100, 1.8];
const LIT_V = [1000, 250, 0.65];
const Chrono = ({reste}) => {
  const s = Math.max(0, reste);
  const txt = `${String(Math.floor(s)).padStart(2, '0')}.${String(Math.floor((s % 1) * 1000)).padStart(3, '0')}`;
  const urgent = s < 1;
  return (
    <g transform="translate(540 1560)">
      <rect x="-270" y="-95" width="540" height="190" rx="36" fill="#0b0b0e" opacity="0.82" stroke={urgent ? '#ff2a2a' : '#ffffff'} strokeWidth="5" />
      <text y="38" textAnchor="middle" fontFamily="'DejaVu Sans Mono', monospace" fontWeight="700" fontSize="118" fill={urgent && Math.floor(s * 10) % 2 ? '#ff3a3a' : '#ffffff'}>{txt}</text>
      <rect x="-240" y="70" width={480 * Math.min(1, s / 3)} height="10" rx="5" fill="#ff3a3a" />
    </g>
  );
};
const Choix = scene('choix', ({f, fg, i, t, d, R, bornes}) => {
  const a = R('larmoire', 53);
  const b = R('lit', 84) - 6;
  const t0 = R('lit', 84) + 6; // fin de la question : le chrono démarre
  const reste = 3 - Math.max(0, f - t0) / 30;
  let cible;
  let vit = 0;
  if (i === 0) {
    const w = ease(t, 0, 8, Easing.out(Easing.cubic));
    cible = mixC(PORTE_V, ARMOIRE_V, w);
    vit = t < 8 ? 1 - w : 0;
  } else if (i === 1) {
    const w = ease(t, 0, 8, Easing.out(Easing.cubic));
    cible = mixC(ARMOIRE_V, LIT_V, w);
    vit = t < 8 ? 1 - w : 0;
  } else {
    // le regard fait des allers-retours de plus en plus rapides entre les deux cachettes
    const u = 0.5 + 0.5 * Math.sin(t * (0.12 + t * 0.0014));
    cible = mixC(ARMOIRE_V, LIT_V, u);
  }
  const c = pov(fg, [-150, OEIL, 1.0], cible, {k: 1.2 + (i === 2 ? 1 - reste / 3 : 0)});
  return (
    <VueIn fg={fg} cam={c} roll={roulis(fg, 1.2)} zoom={1.05} flou={vit > 0.2 ? [30 * vit, 0] : null}
      dessus={
        <g>
          <Deux f={f} a={a} b={b} />
          {f >= t0 - 4 && <Chrono reste={reste} />}
          <rect width="1080" height="1920" fill="#ff1a1a" opacity={f >= t0 ? 0.05 + 0.06 * Math.max(0, Math.sin(f / 2.5)) * (1 - reste / 3) : 0} />
        </g>
      } />
  );
});

// ===== 9. L'armoire : tu fermes, à travers les lattes elle entre, renifle, s'approche… les portes s'ouvrent =====
const DANS = {x: 1190, y: -160, z: 1.8};
const Armoire = scene('armoire', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const resp = 0.5 + 0.5 * Math.sin(fg / 14);
  if (i === 0) {
    // ton choix, et tu cours vers l'armoire (vue subjective), la main se tend vers la porte
    const c = pov(fg, mixC([-150, OEIL, 1.0], [780, OEIL, 1.8], ease(t, 0, d, Easing.in(Easing.quad))), ARMOIRE_V, {k: 1.4, pas: 1.4, v: 0.42});
    const tend = ease(t, d * 0.4, d);
    return (
      <VueIn fg={fg} cam={c} roll={roulis(fg, 1.4, 1.4, 0.42)} zoom={1.05} o={{armoire: ease(t, d * 0.6, d)}}
        dessus={<g>{tend > 0 && <MainPov x={lerp(1200, 700, tend)} y={lerp(2000, 1100, tend)} s={1.5} rot={-25} nuit={0.4} />}<Deux f={f + 200} a={0} b={0} choisi={1} /></g>} />
    );
  }
  const cam = {x: DANS.x + main(fg, 0.4).dx, y: DANS.y + 3 * Math.sin(fg / 9), z: DANS.z, yaw: -90 + 3 * Math.sin(fg / 50), pitch: 0};
  const porte = ease(f, R('vois', 118) - 10, R('entrer', 123) + 12);
  if (i === 1) {
    // de l'intérieur : les battants se referment
    const ferme = ease(t, 2, d - 4, Easing.inOut(Easing.cubic));
    return <VueIn fg={fg} cam={cam} o={{dansArmoire: true}} dessus={<Lattes ferme={ferme} f={fg} />} />;
  }
  if (i === 2) {
    // elle entre (se baisse sous la porte), renifle, s'approche
    const u = ease(f, R('entrer', 123), R('sapproche', 181) + 45);
    const x = lerp(-640, 700, u);
    const z = lerp(2.75, 1.85, u);
    const renifle = f > R('renifle', 149) - 4 && f < R('renifle', 149) + 18 ? Math.max(0, Math.sin(f * 1.4)) ** 3 : 0;
    const pose = marcheRodeur(DEBOUT, fg * 0.18, u > 0 && u < 1 ? 0.8 : 0);
    return (
      <VueIn fg={fg} cam={cam} o={{dansArmoire: true, porte}}
        items={(cam2) => [porte > 0.2 && rod(cam2, {x, z, id: 'ar2', pose, tete: -8 - 14 * renifle, respire: resp, lum: 0.85})]}
        dessus={<Lattes ferme={1} f={fg} />} />
    );
  }
  if (i === 3) {
    // juste devant les lattes : elle penche la tête
    const penche = ease(f, R('penche', 233) - 4, R('devant', 258) + 10, Easing.inOut(Easing.sin));
    return (
      <VueIn fg={fg} cam={{...cam, y: -480, pitch: -9}} o={{dansArmoire: true, porte: 1}}
        items={(cam2) => [rod(cam2, {x: 760 + 40 * k, z: 1.82, id: 'ar3', pose: melange(ECARTE, QUATRE, 0.45), tete: -40 * penche, respire: resp, lum: 0.9})]}
        dessus={<Lattes ferme={1} f={fg} />} />
    );
  }
  // les portes s'ouvrent d'un coup : screamer
  const ouvre = R('souvrent', 307) - 6;
  if (f < ouvre) {
    return (
      <VueIn fg={fg} cam={{...cam, y: -480, pitch: -9}} o={{dansArmoire: true, porte: 1}}
        items={(cam2) => [rod(cam2, {x: 800, z: 1.82, id: 'ar4', pose: melange(ECARTE, QUATRE, 0.45), tete: -40, respire: resp, lum: 0.9})]}
        dessus={<Lattes ferme={1} f={fg} />} />
    );
  }
  const u = f - ouvre;
  const fin = DUREE.armoire - 26;
  if (f >= fin) {
    return <AbsoluteFill style={{background: '#000'}} />;
  }
  return <Screamer f={u} fg={fg} />;
});
const Screamer = ({f, fg, fige = false}) => {
  const s = fige ? 4.6 : interpolate(f, [0, 4, 20], [2.2, 4.4, 4.9], clamp);
  const sh = fige ? 0 : 1;
  return (
    <AbsoluteFill style={{background: '#050208'}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <defs>
          <radialGradient id="sc-v" cx="540" cy="900" r="900" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3a2a4a" />
            <stop offset="1" stopColor="#000" />
          </radialGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#sc-v)" />
        <g transform={`translate(${540 + tremble(fg, 40 * sh, 'sx')} ${900 + tremble(fg + 2, 40 * sh, 'sy')}) scale(${s}) rotate(${-12 + tremble(fg, 8 * sh, 'sr')})`}>
          <TeteRodeur ouvre={1} id="scr" />
        </g>
        {!fige && <rect width="1080" height="1920" fill={Math.floor(fg / 2) % 2 ? '#fff' : '#ff2a3a'} opacity={interpolate(f, [0, 1, 4, 10], [0.9, 0.3, 0.5, 0], clamp)} />}
      </svg>
    </AbsoluteFill>
  );
};

// ===== 10. Si tu as choisi l'armoire… tu ne survis pas. (image figée, en pause) =====
const Mort = scene('mort', ({f, fg, R}) => {
  const pulse = interpolate(f - R('survis', 62), [0, 3, 18], [0, 0.55, 0.2], clamp);
  const neige = f > DUREE.mort - 14;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{filter: `grayscale(1) contrast(1.3) brightness(${0.55 + 0.05 * Math.sin(f)})`}}>
        <Screamer f={30} fg={fg} fige />
      </AbsoluteFill>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{position: 'absolute'}}>
        <defs>
          <filter id="mo-n">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" seed={fg} />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <pattern id="mo-l" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="2" fill="#000" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="1080" height="1920" fill="#c0101a" opacity={0.18 + pulse} style={{mixBlendMode: 'multiply'}} />
        <rect width="1080" height="1920" fill="#ff1a2a" opacity={pulse * 0.5} />
        <rect width="1080" height="1920" fill="url(#mo-l)" />
        <g opacity={Math.floor(f / 15) % 2 ? 1 : 0.6}>
          <rect x="70" y="100" width="22" height="70" fill="#fff" />
          <rect x="110" y="100" width="22" height="70" fill="#fff" />
          <text x="160" y="160" fontFamily="'DejaVu Sans Mono', monospace" fontWeight="700" fontSize="66" fill="#fff">PAUSE</text>
        </g>
        {neige && <rect width="1080" height="1920" filter="url(#mo-n)" opacity="0.9" />}
      </svg>
    </AbsoluteFill>
  );
});

// ===== 11. On rembobine : la bande repart en arrière jusqu'au choix =====
const Rembobine = scene('rembobine', ({f, fg}) => {
  const D = DUREE.rembobine;
  const a = START.armoire + DUREE.armoire - 40; // l'écran juste avant le noir
  const b = START.choix + 30; // pendant le choix
  if (f < 6) {
    return (
      <AbsoluteFill style={{background: '#000'}}>
        <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
          <filter id="rb-n"><feTurbulence type="fractalNoise" baseFrequency="0.85" seed={fg} /><feColorMatrix type="saturate" values="0" /></filter>
          <rect width="1080" height="1920" filter="url(#rb-n)" />
        </svg>
      </AbsoluteFill>
    );
  }
  const fin = D - 22;
  if (f < fin) {
    // vitesse qui accélère puis ralentit : la bande file à l'envers
    const u = Easing.inOut(Easing.cubic)((f - 6) / (fin - 6));
    const src = Math.round(lerp(a, b, u));
    return (
      <VHS f={fg} force={1} compteur={fmt(src / 30)}>
        {imageA(src)}
      </VHS>
    );
  }
  // ▶ PLAY : l'image se stabilise sur le choix
  return (
    <VHS f={fg} force={interpolate(f, [fin, D], [0.8, 0.15], clamp)} texte="▶ PLAY" compteur={fmt(b / 30)}>
      {imageA(b)}
    </VHS>
  );
});

// ===== 12. Cette fois, sous le lit. Elle entre : ses pieds maigres, ses doigts sur le parquet =====
const SOUS = {x: 1090, y: 375, z: 0.62};
const camSous = (fg, extra = {}) => ({x: SOUS.x + 3 * Math.sin(fg / 21), y: SOUS.y + 2 * Math.sin(fg / 13), z: SOUS.z, yaw: -40, pitch: -2, ...extra});
const Lit = scene('lit', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const resp = 0.5 + 0.5 * Math.sin(fg / 14);
  if (i === 0) {
    // ton nouveau choix : tu plonges et tu te glisses sous le lit (vue subjective)
    const u = ease(t, 4, d - 4, Easing.inOut(Easing.cubic));
    const pos = [lerp(300, SOUS.x, u), lerp(OEIL, SOUS.y, Math.min(1, u * 1.6)), lerp(0.9, SOUS.z, u)];
    const c = {...pov(fg, pos, mixC(LIT_V, [-630, 300, 2.6], u), {k: 1.3}), };
    return (
      <VueIn fg={fg} cam={c} zoom={1.05} roll={lerp(0, -8, Math.sin(u * Math.PI))} flou={u > 0.1 && u < 0.9 ? [0, 8] : null}
        dessus={<Deux f={f + 200} a={0} b={0} choisi={2} />} />
    );
  }
  const porte = ease(f, R('elle', 67) - 6, R('entre', 75) + 10);
  const u = ease(f, R('entre', 75), R('pièce', 148) + 10);
  const x = lerp(-640, 150, u);
  const z = lerp(2.75, 1.25, u);
  const accroupi = ease(f, R('longs', 174) - 16, R('longs', 174) + 10);
  const glisse = ease(f, R('longs', 174), R('parquet', 213) + 10);
  const xr = lerp(x, 330, glisse);
  const zr = lerp(z, 0.95, glisse);
  const pose = marcheRodeur(melange(DEBOUT, QUATRE, 0.55 * accroupi), fg * 0.18, u > 0 && u < 1 ? 0.9 : 0.15 * glisse);
  return (
    <VueIn fg={fg} cam={camSous(fg)} o={{porte}} zoom={1.04}
      items={(cam) => [porte > 0.2 && rod(cam, {x: xr, z: zr, id: 'li1', pose, tete: -20 * accroupi, respire: resp, lum: 0.85})]} />
  );
});

// la tête qui descend jusqu'au sol, devant toi (sous le bord du lit)
const TeteSol = ({descend, approche, renifle, fg, part = 0}) => {
  const y = lerp(380, 1240, descend) - 1400 * part;
  const s = lerp(1.6, 3.3, approche);
  return (
    <g>
      <defs>
        <clipPath id="ts-c">
          <rect x="0" y="560" width="1080" height="1400" />
        </clipPath>
      </defs>
      <g clipPath="url(#ts-c)">
        {/* le long cou qui descend du bord du lit */}
        <path d={`M${640},${500} Q${700},${(y + 500) / 2} ${560 + 60 * s},${y - 10 * s}`} stroke="#eef0ff" strokeWidth={22 * s + 8} fill="none" strokeLinecap="round" />
        <path d={`M${640},${500} Q${700},${(y + 500) / 2} ${560 + 60 * s},${y - 10 * s}`} stroke="#8a8796" strokeWidth={22 * s} fill="none" strokeLinecap="round" />
        <g transform={`translate(${560 + tremble(fg, 6 * renifle, 'ts')} ${y}) scale(${s}) rotate(${-78 + 4 * Math.sin(fg / 20)})`}>
          <TeteRodeur id="tsol" />
        </g>
        {/* ses doigts posés à plat, de chaque côté */}
        {[-1, 1].map((c) => (
          <g key={c} transform={`translate(${560 + c * 330 * s * 0.5} ${1350}) scale(${0.9 * s * 0.55})`}>
            {doigts([0, 0], [c * 0.4, 1], {long: 1.3, plie: 0.1, cote: c}).map((dd, j) => (
              <g key={j}>
                <polyline points={dd.map((p) => p.join(',')).join(' ')} fill="none" stroke="#eef0ff" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points={dd.map((p) => p.join(',')).join(' ')} fill="none" stroke="#8a8796" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            ))}
          </g>
        ))}
      </g>
    </g>
  );
};

// ===== 13. Elle s'arrête devant le lit. Son visage blanc descend jusqu'au sol. Juste devant toi. =====
const Visage = scene('visage', ({f, fg, R}) => {
  const resp = 0.5 + 0.5 * Math.sin(fg / 14);
  const descend = ease(f, R('lentement', 56) - 4, R('sol', 138) + 6, Easing.inOut(Easing.sin));
  const approche = ease(f, R('juste', 154) - 6, R('toi', 179) + 10, Easing.out(Easing.cubic));
  const renifle = Math.max(0, Math.sin(fg * 1.3)) ** 3 * approche;
  return (
    <VueIn fg={fg} cam={camSous(fg)} o={{porte: 1}} zoom={1.04 + 0.08 * approche} noir={0.05 * approche}
      items={(cam) => [rod(cam, {x: 560, z: 0.78, id: 'vi', pose: melange(DEBOUT, QUATRE, 0.25), respire: resp, lum: 0.85})]}
      dessus={descend > 0 && <TeteSol descend={descend} approche={approche} renifle={renifle} fg={fg} />} />
  );
});

// ===== 14. Dehors, quelqu'un hurle ton prénom. C'est la voix de Léo. Elle ressort dans la tempête. =====
const Cri = scene('cri', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const resp = 0.5 + 0.5 * Math.sin(fg / 14);
  if (i === 0) {
    const part = ease(f, R('hurle', 37) + 2, R('hurle', 37) + 12, Easing.in(Easing.cubic));
    const sursaut = f > R('hurle', 37) - 2 && f < R('hurle', 37) + 4 ? 1 : 0;
    return (
      <VueIn fg={fg} cam={camSous(fg)} o={{porte: 1}} zoom={1.12}
        items={(cam) => [part < 1 && rod(cam, {x: 560, z: 0.78, id: 'cr0', pose: melange(DEBOUT, QUATRE, 0.25 * (1 - part)), respire: resp, lum: 0.85})]}
        dessus={part < 1 && <TeteSol descend={1} approche={1 - part} renifle={sursaut} fg={fg} part={part} />} />
    );
  }
  if (i === 1) {
    // dehors : une lampe torche au loin dans les sapins, quelqu'un appelle
    const c = vise([-700 + 150 * k, -300, 8.5], [-2600, -180, 16]);
    return (
      <VueExt fg={fg} cam={c} zoom={1.2}
        items={(cam) => {
          const p = cam.proj(-2600, -180, 16);
          const on = 0.9 + 0.1 * Math.sin(fg / 3);
          return [{z: 6.5, x: c.x, el: (
            <g key="lt">
              <defs>
                <radialGradient id="cr-l">
                  <stop offset="0" stopColor="#fff" stopOpacity="1" />
                  <stop offset="0.2" stopColor="#fff2d0" stopOpacity="0.5" />
                  <stop offset="1" stopColor="#ffe0a0" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx={p[0] + 30 * Math.sin(fg / 6)} cy={p[1]} r="160" fill="url(#cr-l)" opacity={on} />
            </g>
          )}];
        }} />
    );
  }
  // elle se redresse d'un coup et ressort en courant ; la porte claque derrière elle
  const u = ease(t, 6, d - 18, Easing.in(Easing.quad));
  const x = lerp(560, -640, u);
  const z = lerp(0.78, 2.9, u);
  const claque = ease(t, d - 14, d - 8, Easing.in(Easing.cubic));
  const choc = interpolate(t - (d - 8), [0, 2, 8], [0, 1, 0], clamp);
  return (
    <VueIn fg={fg} cam={{...camSous(fg), x: SOUS.x + tremble(fg, 14 * choc, 'cq')}} o={{porte: 1 - claque}} zoom={1.04}
      items={(cam) => [u < 0.98 && rod(cam, {x, z, id: 'cr2', pose: galop(melange(DEBOUT, QUATRE, ease(t, 0, 8)), fg * 0.6, 1), respire: resp, lum: 0.85})]} />
  );
});

// ===== 15. Silence. Ton téléphone vibre. C'est Léo : « Je suis devant la porte. Ouvre vite, il revient. » =====
const Leo2 = scene('leo2', ({f, fg, i, t, d}) => {
  const k = lisse(t, d);
  if (i === 0) {
    // tu sors de sous le lit, doucement
    return <VueIn fg={fg} cam={{x: lerp(SOUS.x, 640, k), y: lerp(SOUS.y, 120, k), z: lerp(SOUS.z, 0.5, k), yaw: -50, pitch: lerp(-2, 3, k)}} zoom={1.04} />;
  }
  const m = main(fg, 0.6);
  const leve = ease(t, 0, 14, Easing.out(Easing.cubic));
  const pose = {x: 540 + m.dx, y: lerp(2000, 920, leve) + m.dy, rx: lerp(50, 6, leve), ry: -4, rz: -1.5 + m.r, s: 1.22};
  return (
    <AbsoluteFill>
      <Flou k={8} lum={0.55}>
        <VueIn fg={fg} cam={vise([-200, -150, 1.2], [-630, -60, 2.6])} o={{pieds: [-55, 55]}} />
      </Flou>
      <Tel fg={fg} pose={pose} lueur={0.45} nuit={0.4} />
    </AbsoluteFill>
  );
});

// ===== 16. On frappe. Trois coups. Mais tout à l'heure aussi… Tu lui ouvres ? Ou tu laisses fermé ? =====
const Dilemme = scene('dilemme', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const K2 = [R('frappe', 7), R('frappe', 7) + 8, R('frappe', 7) + 16];
  const cp = coups(f, K2);
  if (i === 0) {
    const c = vise([-580 + tremble(fg, 18 * cp, 'dk'), -150, 1.5 + 0.3 * k], [-630, -50, 2.6]);
    return <VueIn fg={fg} cam={c} zoom={1.05 + 0.04 * cp} o={{coups: cp, pieds: [-55 + 4 * Math.sin(fg / 9), 55]}} />;
  }
  if (i === 1) {
    // « tout à l'heure aussi » : le souvenir de la silhouette à la fenêtre, en VHS
    return <VHS f={fg} force={0.5} texte="" >{imageA(START.fenetre + 110 + Math.floor(t * 0.6))}</VHS>;
  }
  // écran partagé : la porte (dedans) / qui est devant (dehors) — une silhouette… à l'ombre beaucoup trop longue
  const cp2 = coups(f, [R('alors', 122) - 10, R('alors', 122) - 2]);
  const tend = ease(f, R('ouvres', 149) - 10, R('ouvres', 149) + 20);
  const haut = (
    <VueIn fg={fg} cam={pov(fg, [-560 + tremble(fg, 14 * cp2, 'dh'), -120, 1.75], [-560, -40, 2.6], {k: 0.7})} zoom={1.25} o={{coups: cp2, pieds: [-55, 55]}}
      dessus={<MainPov x={lerp(1100, 600, tend) + 6 * Math.sin(fg / 3)} y={lerp(1700, 860, tend)} s={1.3} rot={-30} nuit={0.45} ouvre={0.8} />} />
  );
  const bas = (
    <VueExt fg={fg} cam={{x: -300 + 60 * k, y: -200, z: 5.6 - 0.2 * k, yaw: 188, pitch: 2}} zoom={1.35} chaletO={{}}
      items={(cam) => {
        const p0 = cam.proj(-630, SOL, 2.75);
        const p1 = cam.proj(-1500, SOL, 5.5);
        const w = 26 * cam.scale(2.75, -630, SOL);
        return [
          {z: 2.8, x: -630, el: <polygon key="om" points={`${p0[0] - w},${p0[1]} ${p0[0] + w},${p0[1]} ${p1[0] + 4},${p1[1]} ${p1[0] - 4},${p1[1]}`} fill="#05070e" opacity="0.75" />},
          {z: 2.76, x: -630, el: <Perso cam={cam} id="dsil" x={-630} z={2.76} lum={0.05} teinte={[0.4, 0.45, 0.7]} ombre={0} dos />},
        ];
      }} />
  );
  const dis = R('dis-le', 213);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{clipPath: 'inset(0 0 962px 0)'}}>
        <AbsoluteFill style={{transform: 'translateY(-400px)'}}>{haut}</AbsoluteFill>
      </AbsoluteFill>
      <AbsoluteFill style={{clipPath: 'inset(962px 0 0 0)'}}>
        <AbsoluteFill style={{transform: 'translateY(420px)'}}>{bas}</AbsoluteFill>
      </AbsoluteFill>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{position: 'absolute'}}>
        <rect x="0" y="956" width="1080" height="8" fill="#000" />
        <ChoixBoite f={f} debut={R('ouvres', 149) - 4} x={540} y={850} texte="J'OUVRE" emoji="1f6aa" couleur="#3ad86a" />
        <ChoixBoite f={f} debut={R('laisses', 176) - 4} x={540} y={1075} texte="JE LAISSE FERMÉ" emoji="1f512" couleur="#ff3a4a" />
        {f >= dis && (
          <g transform={`translate(540 1730) scale(${spring({frame: f - dis, fps: 30, config: {damping: 10}})})`}>
            <rect x="-400" y="-70" width="800" height="140" rx="70" fill="#fff" />
            <image href={staticFile('emoji/1f4ac.svg')} x="-370" y="-48" width="96" height="96" />
            <text x="40" y="18" textAnchor="middle" fontFamily="'DejaVu Sans', Arial, sans-serif" fontWeight="900" fontSize="46" fill="#111">
              DIS-LE EN COMMENTAIRE
            </text>
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
});

const COMPOSANTS = {vibre: Vibre, alerte: Alerte, leo: Leo, frappe: Frappe, message: Message, fenetre: Fenetre, serrure: Serrure, choix: Choix, armoire: Armoire, mort: Mort, rembobine: Rembobine, lit: Lit, visage: Visage, cri: Cri, leo2: Leo2, dilemme: Dilemme};
export const NeLuiOuvrePas = () => (
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
