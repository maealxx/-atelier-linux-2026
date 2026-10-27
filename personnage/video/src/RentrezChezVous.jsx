import {AbsoluteFill, Easing, interpolate, random, Series, spring, staticFile, useCurrentFrame} from 'remotion';
import {Bonhomme} from './Bonhomme';
import {ACCROUPI, CHENE, foret, LAMPE, OEIL, SOL, Voile} from './ForetNuit';
import {Choix} from './Livreur';
import {montage, Plan} from './montage';
import {clamp, makeCam, marche, orbite, Perso} from './moteur';
import {DEBOUT, doigts, ECARTE, galop, melange, QUATRE, RodeurMonde} from './Rodeur';
import {PH_H, PH_W, TelReel} from './TelReel';
import PLANS from './foret/plans.json';
import timeline from './foret/timeline.json';

// « Rentrez chez vous » : tu marches en forêt, un numéro inconnu t'écrit « Rentrez chez vous », puis « Il se cache
// dans la forêt ». Une branche craque. « Ne vous retournez pas. » Tu te retournes : une silhouette immense, sans yeux.
// Elle fonce à quatre pattes, tu cours, tu te caches derrière un chêne. Ses griffes raclent l'écorce. Puis une photo
// de toi, caché, prise de dos. « Je suis devant vous. Courez vers moi. » Une lampe torche clignote au loin.
const {decoupe, repere, SCENES} = montage(timeline, PLANS);
export const DUREE_RENTREZ = SCENES.reduce((t, [, d]) => t + d, 0);
const START = {};
SCENES.reduce((t, [nom, d]) => {
  START[nom] = t;
  return t + d;
}, 0);
const G = (nom, mot, def) => START[nom] + repere(nom, mot, def);

const EZ = Easing.bezier(0.45, 0, 0.55, 1);
const lisse = (t, d) => EZ(Math.min(1, Math.max(0, t / Math.max(1, d))));
const ease = (f, a, b, e = EZ) => interpolate(f, [a, b], [0, 1], {...clamp, easing: e});
const lerp = (a, b, t) => a + (b - a) * t;
const tremble = (f, k, cle) => k * (random(`${cle}${f}`) - 0.5);
const PLAN = {grain: 0.03, vignette: 0.8};
// caméra portée à la main : petite dérive permanente
const main = (f, k = 1) => ({dx: k * (5 * Math.sin(f / 23) + 3 * Math.sin(f / 9.7)), dy: k * 3 * Math.sin(f / 17 + 1), r: k * 0.35 * Math.sin(f / 31)});
// pas : balancement vertical + roulis
const pas = (f, v, amp) => ({bob: -Math.abs(Math.sin(f * v)) * 16 * amp, sway: Math.sin(f * v) * 9 * amp, roll: Math.sin(f * v) * 0.8 * amp});

// ----- le téléphone : les messages du numéro inconnu -----
const T1 = 30; // vibration dès la première seconde
const T2 = G('blague', 'vibration', 77) + 12;
const T3 = G('branche', 'message', 92) + 20;
const T4 = G('cachette', 'vibre', 103) + 10;
const T5 = G('photo', 'vibration', 15) + 8;
const T6 = G('lampe', 'je', 41) - 6;
const BUZZ = [T1, T2, T3, T4, T5, T6];
const INCONNU = {nom: 'Numéro inconnu', avatar: '?', couleurAvatar: '#5a5e6a'};

// la photo reçue : toi, accroupi derrière le chêne, pris de dos au flash (et, en haut, des doigts sur l'écorce)
const Photo = ({age = 0, w = PH_W, h = PH_H}) => {
  const flash = interpolate(age, [0, 3, 14], [1, 0.6, 0], clamp);
  return (
    <g>
      <defs>
        <radialGradient id="ph-flash" cx="0.45" cy="0.55" r="0.7">
          <stop offset="0" stopColor="#e8ecf4" stopOpacity="0.28" />
          <stop offset="0.45" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.88" />
        </radialGradient>
        <linearGradient id="ph-tronc" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5a5560" />
          <stop offset="0.35" stopColor="#8a8490" />
          <stop offset="1" stopColor="#2a2630" />
        </linearGradient>
        <filter id="ph-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="4" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
      <rect width={w} height={h} fill="#08080c" />
      {/* arbres du fond */}
      {[30, 95, 330, 372].map((x, k) => <rect key={k} x={x} y="0" width={18 + k * 6} height={h} fill="#16151c" />)}
      {/* sol éclairé */}
      <ellipse cx={w * 0.45} cy={h * 0.98} rx={w * 0.8} ry={h * 0.25} fill="#3a3640" />
      {/* le chêne, en plein flash */}
      <path d={`M${w * 0.5},0 L${w * 0.98},0 L${w * 1.02},${h} L${w * 0.44},${h} Q${w * 0.52},${h * 0.6} ${w * 0.5},0 Z`} fill="url(#ph-tronc)" />
      {[0.56, 0.62, 0.69, 0.75, 0.82, 0.88, 0.94].map((u, k) => (
        <path key={k} d={`M${w * u},0 q${10 - k * 3},${h * 0.25} ${-3 + k},${h * 0.5} t${2 - k},${h * 0.5}`} stroke="#25212b" strokeWidth={4 + (k % 3) * 2} fill="none" opacity="0.75" />
      ))}
      {[0.6, 0.78, 0.9].map((u, k) => <ellipse key={`n${k}`} cx={w * u} cy={h * (0.3 + 0.2 * k)} rx="9" ry="16" fill="#25212b" opacity="0.7" />)}
      {/* des longs doigts gris qui dépassent du tronc, tout en haut */}
      <g opacity="0.95">
        {doigts([w * 0.99, 40], [-1, 0.35], {long: 0.55, plie: 0.5, cote: -1}).map((d, k) => (
          <polyline key={k} points={d.map((p) => p.join(',')).join(' ')} fill="none" stroke="#b8b6c4" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </g>
      {/* toi, de dos, accroupi contre le tronc */}
      <g transform={`translate(${w * 0.36} ${h * 1.3}) scale(0.46) translate(-300 -922)`}>
        <Bonhomme dos epauleG={-40} coudeG={-70} epauleD={40} coudeD={70} couleurs={{haut: '#2a3040', hautO: '#1e2330'}} />
      </g>
      {/* fougères au premier plan (il est accroupi derrière) */}
      {[...Array(9)].map((_, k) => (
        <ellipse key={k} cx={w * (0.05 + k * 0.11)} cy={h * (0.93 + 0.03 * Math.sin(k * 2.1))} rx={w * 0.12} ry={h * 0.045} transform={`rotate(${(k % 2 ? 1 : -1) * 18} ${w * (0.05 + k * 0.11)} ${h * 0.93})`} fill="#141218" />
      ))}
      <rect width={w} height={h} fill="url(#ph-flash)" />
      <rect width={w} height={h} filter="url(#ph-grain)" opacity="0.2" />
      <rect width={w} height={h} fill="#2a3a30" opacity="0.12" />
      <text x={w - 16} y={h - 16} textAnchor="end" fontSize="16" fontFamily="'DejaVu Sans Mono', monospace" fill="#ffb347" opacity="0.85">27/10 19:58</text>
      <rect width={w} height={h} fill="#fff" opacity={flash} />
    </g>
  );
};
const MSGS = [
  {t: T1, texte: 'Rentrez chez vous.'},
  {t: T2, texte: 'Il se cache dans la forêt.'},
  {t: G('doute', 'parle', 94) + 4, fantome: true, texte: ''},
  {t: T3, texte: 'Ne vous retournez pas.', alerte: true},
  {t: T4, texte: 'Ne bougez plus. Il sent la peur.', alerte: true},
  {t: T5, photo: (age) => <Photo age={age} />, texte: ''},
  {t: T6, texte: 'Je suis devant vous. Courez vers moi.', alerte: true},
];
const NOTIFS = [{t: T1, titre: 'Numéro inconnu', texte: 'Rentrez chez vous.'}];

// arrière-plan flouté (profondeur de champ) derrière le téléphone
const Flou = ({children, k = 7, lum = 0.7}) => (k <= 0.3 && lum >= 0.99 ? <AbsoluteFill>{children}</AbsoluteFill> : <AbsoluteFill style={{filter: `blur(${k}px) brightness(${lum})`}}>{children}</AbsoluteFill>);
const TAP = G('vibre', 'rentrez', 179) - 22;
const Tel = ({fg, pose, tap = TAP, lueur = 0.45, nuit = 0, allume = 1, zoomConv = 0, appui = 0}) => (
  <TelReel f={fg} pose={pose} vib={BUZZ} notifs={NOTIFS} messages={MSGS} tap={tap} manche="#2a3040" heure="19:47" date="mardi 27 octobre" lueur={lueur} nuit={nuit} allume={allume} zoomConv={zoomConv} appui={appui} {...INCONNU} />
);

const scene = (nom, rendu) => {
  const C = () => {
    const f = useCurrentFrame();
    const {i, t, d, bornes} = decoupe(nom, f);
    return rendu({f, fg: START[nom] + f, i, t, d, bornes, R: (mot, def) => repere(nom, mot, def)});
  };
  C.displayName = nom;
  return C;
};

// une vue de la forêt (caméra + options) → <Plan>
const Vue = ({fg, cam: c, o = {}, items = [], zoom = 1, roll = 0, noir = 0, flou = null, dessus = null, voile = 1}) => {
  const cam = makeCam(c);
  const d = foret(cam, fg, o);
  const its = typeof items === 'function' ? items(cam, d) : items;
  return (
    <Plan {...PLAN} f={fg} cam={cam} decor={d} items={its} zoom={zoom} roll={roll} noir={noir} flou={flou}
      dessus={<g>{d.poussiere}<Voile L={d.L} P={d.P} k={voile} />{dessus}</g>} />
  );
};
// ----- le bonhomme vu de l'extérieur -----
const CREP_T = [1.0, 0.8, 0.78];
const NUIT_T = [0.55, 0.62, 1.0];
const moi = (cam, {x, z, id, lum = 0.85, teinte = CREP_T, accroupi = false, ...pose}) => ({z, x, el: (
  <g>
    {accroupi && (
      <defs>
        <clipPath id={`cl${id}`}>
          <rect x="-2000" y="-4000" width="5080" height={4000 + cam.proj(x, SOL, z)[1]} />
        </clipPath>
      </defs>
    )}
    <g clipPath={accroupi ? `url(#cl${id})` : undefined}>
      <Perso cam={cam} id={id} x={x} z={z} y={SOL + (accroupi ? 230 : 0)} lum={lum} teinte={teinte} ombre={accroupi ? 0 : 0.35} {...pose} />
    </g>
    {accroupi && fougere(cam, x, z, id)}
  </g>
)});
// une touffe de fougères posée au sol devant (x, z), côté caméra
const fougere = (cam, x, z, id) => {
  if (!cam.visible(z, x, SOL)) return null;
  const [px, py] = cam.proj(x, SOL, z);
  const s = cam.scale(z, x, SOL);
  return (
    <g transform={`translate(${px} ${py}) scale(${s})`}>
      {[...Array(15)].map((_, k) => {
        const a = -80 + k * 11.5 + 6 * Math.sin(k * 7);
        const L = 230 + 70 * Math.sin(k * 3.1);
        return <path key={k} d={`M0,10 Q${Math.sin((a * Math.PI) / 180) * L * 0.5},${-L * 0.8} ${Math.sin((a * Math.PI) / 180) * L * 1.1},${-Math.cos((a * Math.PI) / 180) * L * 0.6}`} stroke="#0d0e17" strokeWidth="38" fill="none" strokeLinecap="round" />;
      })}
      {[...Array(9)].map((_, k) => <ellipse key={`e${k}`} cx={-260 + k * 65} cy={-40 - 40 * Math.abs(Math.sin(k * 1.3))} rx="70" ry="40" fill="#10111b" />)}
    </g>
  );
};
// lueur de l'écran du téléphone sur son visage + le téléphone dans sa main
const lueurTel = (cam, x, z, k = 1) => {
  if (!cam.visible(z, x, SOL - 420)) return null;
  const s = cam.scale(z, x, SOL - 386);
  const [bx, by] = cam.proj(x, SOL - 386, z);
  const [px, py] = [bx + 123 * s, by];
  return {z: z - 0.08, x, el: (
    <g key="lt">
      <defs>
        <radialGradient id="lt-g">
          <stop offset="0" stopColor="#b8c4ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#b8c4ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={px - 90 * s} cy={py - 150 * s} r={280 * s} fill="url(#lt-g)" opacity={k} />
      <rect x={px - 26 * s} y={py - 46 * s} width={52 * s} height={92 * s} rx={9 * s} fill="#0c0d12" transform={`rotate(-12 ${px} ${py})`} />
      <rect x={px - 22 * s} y={py - 42 * s} width={44 * s} height={84 * s} rx={7 * s} fill="#8a7ae0" opacity={0.9 * k} transform={`rotate(-12 ${px} ${py})`} />
    </g>
  )};
};
// marche le long du sentier (z selon l'image globale)
const VITESSE = 0.021;
const marcheCam = (fg, z0, f0, {yaw = 0, k = 1, v = VITESSE, x = 30, y = OEIL} = {}) => {
  const p = pas(fg, 0.21, k);
  const m = main(fg);
  return {x: x + p.sway + m.dx, y: y + p.bob + m.dy, z: z0 + (fg - f0) * v, yaw: yaw + 0.6 * Math.sin(fg / 40), pitch: 1.5, roll: p.roll + m.r};
};

// ===== 1. Imagine. Tu marches seul dans la forêt quand ton téléphone vibre. « Rentrez chez vous. » =====
const Z0 = 0.5;
const Vibre = scene('vibre', ({f, fg, i, t, d, R}) => {
  const o = {nuit: 0, lumYaw: 6, lumY: -1.4};
  if (i < 2) {
    // de l'extérieur : il marche vers le soleil couchant ; ça vibre, il s'arrête et sort son téléphone
    const zm = Z0 + 1.2 + VITESSE * (f < 30 ? f : 30 + 10 * ease(f, 30, 54));
    const pasK = 1 - ease(f, 30, 50);
    const mk = marche(fg, 0.21, pasK);
    const sort = ease(f, 36, 56, Easing.out(Easing.cubic));
    const vib = f >= 30 && f < 46 ? Math.sin(f * 3) * 4 : 0;
    const pose = {legG: mk.legG, legD: mk.legD, lift: mk.bob, epauleG: mk.bras, epauleD: lerp(-mk.bras, -20, sort), coudeD: lerp(0, 120, sort), pupilY: 7 * sort, eyes: 1 + 0.15 * sort, brows: -4 * sort, shiver: vib};
    if (i === 0) {
      // travelling de dos, au ras du sol, il se découpe sur le soleil
      const c = {x: 180 + 30 * Math.sin(fg / 40), y: 60, z: zm - 1.55 + 0.25 * lisse(t, d), yaw: -5, pitch: -6};
      return <Vue fg={fg} cam={c} o={o} zoom={1.05} items={(cam) => [moi(cam, {x: 30, z: zm, id: 'mv0', dos: true, lum: 0.4, teinte: [0.95, 0.68, 0.72], ...pose})]} />;
    }
    // de face, plan rapproché : il lit, éclairé par l'écran
    const c = {x: 60 + 20 * lisse(t, d), y: -200, z: zm + 0.95 - 0.15 * lisse(t, d), yaw: 186, pitch: 3};
    return <Vue fg={fg} cam={c} o={{...o, lumYaw: 180, lumY: -1.2}} zoom={1.05} items={(cam) => [moi(cam, {x: 30, z: zm, id: 'mv1', lum: 0.62, ...pose, worry: 0.3}), lueurTel(cam, 30, zm, sort)].filter(Boolean)} />;
  }
  const c = marcheCam(fg, Z0, 0, {k: 0.2});
  // le téléphone monte depuis la poche (à la vibration), puis on le rapproche pour lire
  const monte = ease(t, 0, 16, Easing.out(Easing.cubic));
  const lire = ease(f, R('numéro', 127) - 22, R('numéro', 127) + 2);
  const flou = 7 * lire;
  const tap = TAP;
  const pose = {
    x: lerp(700, 540, lire) + 4 * Math.sin(f / 20),
    y: lerp(lerp(2500, 1330, monte), 840, lire) + 6 * Math.sin(f / 15),
    rx: lerp(lerp(50, 16, monte), 5, lire),
    ry: lerp(-14, -4, lire) + 2 * Math.sin(f / 33),
    rz: lerp(lerp(18, 6, monte), -1.5, lire),
    s: lerp(0.78, 1.18, lire),
  };
  return (
    <AbsoluteFill>
      <Flou k={flou} lum={1 - 0.3 * lire}>
        <Vue fg={fg} cam={c} o={o} roll={c.roll} zoom={1.02} />
      </Flou>
      {<Tel fg={fg} pose={pose} tap={tap} lueur={0.35} nuit={0.2} appui={ease(f, tap - START.vibre - 8, tap - START.vibre) * (1 - ease(f, tap - START.vibre + 2, tap - START.vibre + 10))} />}
    </AbsoluteFill>
  );
});

// ===== 2. Tu souris. Une blague. Deuxième vibration : « Il se cache dans la forêt. » =====
const Blague = scene('blague', ({f, fg, R}) => {
  const c = marcheCam(fg, Z0, 0, {k: 0.5});
  const o = {nuit: 0.08, lumYaw: 6, lumY: -1.3};
  // il baisse le téléphone en marchant (on voit la forêt), puis le remonte à la vibration
  const baisse = ease(f, 4, 30) * (1 - ease(f, R('deuxième', 63) - 4, R('deuxième', 63) + 16));
  const flou = 7 * (1 - baisse);
  const pose = {x: 540 + 200 * baisse, y: lerp(840, 1560, baisse) + 6 * Math.sin(f / 15), rx: lerp(5, 34, baisse), ry: -4 + 2 * Math.sin(f / 33), rz: lerp(-1.5, 5, baisse), s: lerp(1.18, 0.95, baisse)};
  return (
    <AbsoluteFill>
      <Flou k={flou} lum={1 - 0.3 * (1 - baisse)}>
        <Vue fg={fg} cam={c} o={o} roll={c.roll} zoom={1.02} />
      </Flou>
      <Tel fg={fg} pose={pose} lueur={0.35} nuit={0.25} />
    </AbsoluteFill>
  );
});

// ===== 3. Qui t'écrit ? Comment il sait que tu es ici ? Et de qui il parle ? =====
const Doute = scene('doute', ({f, fg, R}) => {
  const zf = START.doute;
  const c = marcheCam(zf, Z0, 0, {k: 0});
  const o = {nuit: 0.15, lumYaw: 6, lumY: -1.2};
  // zoom sur « Numéro inconnu », puis recul quand il se met à écrire… et s'arrête
  const zoomH = ease(f, 0, 18) * (1 - ease(f, R('comment', 22) + 4, R('comment', 22) + 26));
  const m = main(fg, 0.6);
  const pose = {x: 540 + m.dx, y: lerp(840, 1720, zoomH) + m.dy, rx: 5, ry: -3, rz: -1.2 + m.r, s: lerp(1.18, 1.75, zoomH)};
  return (
    <AbsoluteFill>
      <Flou k={8} lum={0.62}>
        <Vue fg={fg} cam={c} o={o} zoom={1.02} />
      </Flou>
      <Tel fg={fg} pose={pose} lueur={0.4} nuit={0.3} />
    </AbsoluteFill>
  );
});

// ===== 4. Tu regardes autour de toi. Rien. C'est une coïncidence, tu continues. =====
const Coincidence = scene('coincidence', ({f, fg, i, t, d, R}) => {
  const z = Z0 + START.doute * VITESSE;
  if (i === 0) {
    // de l'extérieur : il regarde à gauche, à droite ; la caméra tourne lentement autour de lui, en contre-plongée
    const k = lisse(t, d);
    const regard = interpolate(f, [0, 10, 30, 42, 62], [0, -1, -1, 1, 1], {...clamp, easing: EZ});
    const c = orbite(30, z, 1.05, lerp(196, 166, k), 40, {pitch: -7});
    return (
      <Vue fg={fg} cam={c} o={{nuit: 0.25, lumYaw: 180, lumY: -1.2}} zoom={1.08}
        items={(cam) => [moi(cam, {x: 30, z, id: 'mc0', lum: 0.58, pupilX: 14 * regard, tilt: 4 * regard, worry: 0.6, epauleD: -20, coudeD: 120}), lueurTel(cam, 30, z, 0.6)].filter(Boolean)} />
    );
  }
  // panoramique gauche, puis droite, puis on repart
  const YAWS = [[62, 70, 95, 110, 138], [-20, -20, 42, 42, 0]];
  const yaw = interpolate(f, YAWS[0], YAWS[1], {...clamp, easing: EZ});
  const repart = ease(f, R('continues', 141) - 20, R('continues', 141) + 10);
  const p = pas(fg, 0.21, repart);
  const m = main(fg);
  const c = {x: 30 + m.dx + p.sway, y: OEIL + m.dy + p.bob, z: z + Math.max(0, f - 120) * VITESSE * repart, yaw, pitch: 1.5};
  const o = {nuit: interpolate(f, [0, 160], [0.22, 0.45], clamp), lumYaw: 6, lumY: -1.1};
  const vitesse = Math.abs(interpolate(f + 1, YAWS[0], YAWS[1], {...clamp, easing: EZ}) - yaw);
  return (
    <AbsoluteFill>
      <Vue fg={fg} cam={c} o={o} roll={m.r + p.roll} flou={vitesse > 0.5 ? [Math.min(14, vitesse * 4), 0] : null} zoom={1.02} />
    </AbsoluteFill>
  );
});

// ===== 5. Derrière toi, une branche craque. « Ne vous retournez pas. » =====
const Z_ARRET = 10.5;
const Branche = scene('branche', ({f, fg, i, t, d, R}) => {
  const crac = R('craque', 59) - 6;
  if (i === 1) {
    // de face, gros plan : il se fige, les yeux grands ouverts, le regard qui glisse vers l'arrière
    const zm = Z_ARRET - 0.021 * 50 + crac * VITESSE + 0.6;
    const k = lisse(t, d);
    const c = {x: 40 + tremble(fg, 4, 'bf'), y: -170, z: zm + 0.62 - 0.16 * k, yaw: 182, pitch: 0};
    return (
      <Vue fg={fg} cam={c} o={{nuit: 0.58, lumYaw: 0, lumY: -1.4, rim: 0.8}} zoom={1.0}
        items={(cam) => [moi(cam, {x: 30, z: zm, id: 'mb1', lum: 0.45, teinte: [0.7, 0.7, 1.0], eyes: 1.5, worry: 1, sweat: 1, pupilX: lerp(0, 16, ease(t, 4, 14)), brows: -10, epauleD: -20, coudeD: 120, shiver: tremble(fg, 3, 'bs')})]} />
    );
  }
  const arret = ease(f, crac - 4, crac + 6, Easing.out(Easing.cubic));
  const zc = Z_ARRET - 0.021 * 50;
  const p = pas(fg, 0.21, 1 - arret);
  const m = main(fg, 0.6 + 0.6 * arret);
  const choc = interpolate(f - crac, [0, 2, 10], [0, 1, 0], clamp);
  const c = {x: 30 + m.dx + p.sway + tremble(fg, 18 * choc, 'cr'), y: OEIL + p.bob + m.dy - 6 * arret, z: zc + Math.min(f, crac) * VITESSE + arret * 0.02, yaw: 0.6 * Math.sin(fg / 40), pitch: 1.5};
  const o = {nuit: 0.58, lumYaw: 180, lumY: -1.4, rim: 0.7};
  const leve = i === 2 ? ease(t, 0, 16, Easing.out(Easing.cubic)) : 0;
  const pose = {x: 540 + m.dx, y: lerp(2400, 860, leve) + m.dy, rx: lerp(50, 5, leve), ry: -3, rz: lerp(14, -1, leve), s: 1.2};
  return (
    <AbsoluteFill>
      <Flou k={7 * leve} lum={1 - 0.35 * leve}>
        <Vue fg={fg} cam={c} o={o} roll={m.r + p.roll} zoom={1.02 + 0.06 * arret} />
      </Flou>
      {leve > 0 && <Tel fg={fg} pose={pose} lueur={0.5} nuit={0.6} />}
    </AbsoluteFill>
  );
});

// ===== 6. Mais tu te retournes. Une silhouette immense. Des bras trop longs. Un visage sans yeux. Elle penche la tête. =====
const ROD = {x: 0, z: 6.0};
const NUIT = {nuit: 0.85, lumYaw: 180, lumY: -1.5, rim: 1.1};
const respire = (fg) => 0.5 + 0.5 * Math.sin(fg / 14);
const Retourne = scene('retourne', ({f, fg, i, t, d, R}) => {
  const k = lisse(t, d);
  const m = main(fg, 0.8);
  const rodeur = (cam, o) => [{z: ROD.z, x: ROD.x, el: <RodeurMonde cam={cam} x={ROD.x} z={ROD.z} id="ro1" respire={respire(fg)} {...o} />}];
  if (i === 0) {
    // demi-tour rapide (flou de bougé), puis on la découvre entre deux arbres ; lent travelling avant
    const tour = ease(f, 0, 22, Easing.inOut(Easing.cubic));
    const v = Math.abs(ease(f + 1, 0, 22, Easing.inOut(Easing.cubic)) - tour) * 180;
    const c = {x: 30 + m.dx, y: OEIL + m.dy, z: Z_ARRET - 0.25 * k, yaw: 180 * tour, pitch: 1};
    return <Vue fg={fg} cam={c} o={NUIT} roll={m.r} zoom={1.25 + 0.35 * k} flou={v > 1 ? [Math.min(40, v * 3), 0] : null} items={(cam) => rodeur(cam, {pose: DEBOUT, tete: 3 * Math.sin(fg / 30)})} />;
  }
  if (i === 1) {
    // par-dessus son épaule : lui de dos au premier plan, elle au loin entre les deux arbres
    const c = {x: 330 + 40 * k, y: -230 + m.dy, z: Z_ARRET + 0.85 + 0.1 * k, yaw: 184, pitch: 1};
    return (
      <Vue fg={fg} cam={c} o={NUIT} zoom={1.25 + 0.15 * k}
        items={(cam) => [...rodeur(cam, {pose: DEBOUT, tete: 3 * Math.sin(fg / 30)}), moi(cam, {x: 60, z: Z_ARRET, id: 'mr1', dos: true, lum: 0.28, teinte: NUIT_T, epauleD: -20, coudeD: 120, shiver: tremble(fg, 2, 'rs')})]} />
    );
  }
  if (i === 2) {
    // les bras s'ouvrent, beaucoup trop longs
    const ouvre = ease(f, R('bras', 132) - 6, R('longs', 155) + 8);
    const c = {x: 0 + m.dx, y: -520 + m.dy, z: ROD.z + 2.7 - 0.2 * k, yaw: 180, pitch: 2};
    return <Vue fg={fg} cam={c} o={NUIT} roll={m.r} zoom={1.05} items={(cam) => rodeur(cam, {pose: melange(DEBOUT, ECARTE, ouvre), tete: 2})} />;
  }
  if (i === 3) {
    // gros plan : le visage blanc, les orbites vides
    const c = {x: 0 + m.dx * 0.3, y: -640 + m.dy * 0.3, z: ROD.z + 0.62 - 0.12 * k, yaw: 180, pitch: 0};
    return <Vue fg={fg} cam={c} o={NUIT} roll={m.r * 0.5} zoom={1.0} voile={0.7} items={(cam) => rodeur(cam, {pose: ECARTE, tete: 0})} />;
  }
  // elle penche la tête, lentement
  const penche = ease(f, R('penche', 229) - 4, R('tête', 247) + 10, Easing.inOut(Easing.sin));
  const c = {x: 0 + m.dx, y: -600 + m.dy, z: ROD.z + 1.9 - 0.25 * k, yaw: 180, pitch: 0};
  return <Vue fg={fg} cam={c} o={NUIT} roll={m.r} zoom={1.0} items={(cam) => rodeur(cam, {pose: ECARTE, tete: -38 * penche})} />;
});

// ===== 7. D'un coup, elle se met à quatre pattes, et elle fonce sur toi ! =====
const Charge = scene('charge', ({f, fg, d, R}) => {
  const tombe = ease(f, R('coup', 16) - 8, R('pattes', 67), Easing.inOut(Easing.cubic));
  const fonce = R('fonce', 98) - 22;
  const u = ease(f, fonce, d - 2, Easing.in(Easing.quad));
  const z = ROD.z + u * 4.1;
  const choc = interpolate(f, [fonce, d - 2], [0, 1], clamp);
  const m = main(fg, 1 + 3 * choc);
  const c = {x: 30 + m.dx + tremble(fg, 26 * choc * choc, 'ch'), y: OEIL + m.dy + tremble(fg + 7, 20 * choc * choc, 'ch'), z: Z_ARRET + 0.25 * (1 - choc), yaw: 180, pitch: 1};
  const pose = galop(melange(DEBOUT, QUATRE, tombe), fg * 0.55, ease(f, fonce - 10, fonce + 6));
  const flash = interpolate(f, [d - 6, d - 4, d - 1], [0, 0.85, 0.3], clamp);
  return (
    <Vue fg={fg} cam={c} o={NUIT} roll={m.r * 2} zoom={lerp(1.75, 1.15, ease(f, fonce - 10, d - 8)) * (1 + 0.1 * choc)}
      items={(cam) => [{z, x: ROD.x, el: <RodeurMonde cam={cam} x={ROD.x} z={z} id="ro2" pose={pose} tete={lerp(-20, 0, tombe)} ouvre={ease(f, R('fonce', 98) - 12, R('fonce', 98) + 6)} respire={respire(fg)} />}]}
      dessus={<rect width="1080" height="1920" fill="#fff" opacity={flash} />} />
  );
});

// branches qui fouettent l'écran pendant la course
const Fouet = ({f, t0, cote = 1, h = 600, id}) => {
  const u = (f - t0) / 8;
  if (u < 0 || u > 1) return null;
  const x = cote > 0 ? lerp(1700, -700, u) : lerp(-700, 1700, u);
  const y = h + 260 * u;
  // une branche feuillue, très près de l'objectif (floue, presque noire)
  return (
    <g transform={`translate(${x} ${y}) rotate(${cote * (24 - 46 * u)}) scale(${2.3 * cote} 2.3)`} key={id}>
      <defs>
        <filter id={`fo-fl${id}`} x="-30%" y="-80%" width="160%" height="260%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      <g filter={`url(#fo-fl${id})`}>
        <path d="M-900,40 Q-300,-40 0,0 T900,-30" stroke="#040307" strokeWidth="30" fill="none" strokeLinecap="round" />
        {[...Array(9)].map((_, k) => {
          const bx = -760 + k * 190;
          const by = -10 + 20 * Math.sin(k);
          const a = (k % 2 ? 1 : -1) * (40 + 10 * Math.sin(k * 3));
          return (
            <g key={k} transform={`translate(${bx} ${by}) rotate(${a})`}>
              <path d="M0,0 L0,-170" stroke="#040307" strokeWidth="12" />
              {[0, 1, 2, 3].map((j) => (
                <ellipse key={j} cx={(j % 2 ? 1 : -1) * 38} cy={-50 - j * 36} rx="52" ry="20" transform={`rotate(${(j % 2 ? 1 : -1) * 30} ${(j % 2 ? 1 : -1) * 38} ${-50 - j * 36})`} fill="#06050a" />
              ))}
            </g>
          );
        })}
      </g>
    </g>
  );
};

// ===== 8. Tu cours ! Les branches te fouettent le visage. Derrière toi, ça se rapproche ! =====
const VCOURSE = 0.075;
const Course = scene('course', ({f, fg, i, t, d, R, bornes}) => {
  const p = pas(fg, 0.42, 2.2);
  const m = main(fg, 2);
  const z = Z_ARRET + f * VCOURSE;
  const o = {nuit: 0.9, lumYaw: 12, lumY: -1.4, rim: 1};
  if (i === 0) {
    const c = {x: 40 + p.sway * 1.6 + m.dx, y: OEIL + 20 + p.bob * 1.5 + m.dy, z, yaw: 4 * Math.sin(fg / 11), pitch: 3};
    const tf = R('fouettent', 40);
    return (
      <Vue fg={fg} cam={c} o={o} roll={p.roll * 2.5 + m.r} zoom={1.04} flou={[0, 3]}
        dessus={<g>{[tf - 12, tf - 2, tf + 6, tf + 15].map((t0, k) => <Fouet key={k} f={f} t0={t0} cote={k % 2 ? 1 : -1} h={[500, 900, 300, 1200][k]} id={k} />)}</g>} />
    );
  }
  if (i === 1) {
    // de face : il court vers nous, elle galope derrière lui
    const k = lisse(t, d);
    const zm = z - 0.2;
    const mk = marche(fg, 0.42, 1.6);
    const zr = zm - lerp(3.2, 2.2, k);
    const c = {x: 120 + p.sway * 0.6, y: 0 + p.bob * 0.4, z: zm + 0.95 - 0.15 * k, yaw: 188, pitch: -6};
    return (
      <Vue fg={fg} cam={c} o={{...o, lumYaw: 180}} roll={-2 + p.roll} zoom={1.05} flou={[0, 2]}
        items={(cam) => [
          moi(cam, {x: 40, z: zm, id: 'mo1', lum: 0.42, teinte: NUIT_T, legG: mk.legG, legD: mk.legD, lift: mk.bob, epauleG: 40 * Math.sin(fg * 0.42), epauleD: -40 * Math.sin(fg * 0.42), coudeG: -60, coudeD: -60, scream: 0.7, sweat: 1, worry: 1, eyes: 1.4}),
          {z: zr, x: 0, el: <RodeurMonde cam={cam} x={0} z={zr} id="ro5" pose={galop(QUATRE, fg * 0.6, 1)} ouvre={0.7} />},
        ]} />
    );
  }
  // coup d'œil derrière : elle galope, de plus en plus près
  const tour = ease(t, 0, 10, Easing.out(Easing.cubic));
  const zr = z - lerp(2.9, 1.25, lisse(t, d));
  const c = {x: 40 + p.sway * 1.6 + m.dx, y: OEIL + 20 + p.bob * 1.5 + m.dy, z, yaw: lerp(20, 168, tour), pitch: 2};
  return (
    <Vue fg={fg} cam={c} o={{...o, lumYaw: 180}} roll={p.roll * 2.5 + m.r} zoom={1.05} flou={t < 10 ? [30 * (1 - tour), 0] : [0, 3]}
      items={(cam) => [{z: zr, x: 60, el: <RodeurMonde cam={cam} x={60} z={zr} id="ro3" pose={galop(QUATRE, fg * 0.6, 1)} ouvre={0.8} />}]} />
  );
});

// ===== 9. Tu plonges derrière un énorme chêne, la main sur la bouche. « Ne bougez plus. Il sent la peur. » =====
const CACHE = {x: CHENE.x + 60, y: ACCROUPI, z: CHENE.z + 0.6};
const NUIT_C = {nuit: 1, lumYaw: 172, lumY: -1.6, rim: 1.2, portee: 10, degage: [[CHENE.x - 300, CHENE.z, LAMPE.x, LAMPE.z, 380], [CHENE.x + 300, CHENE.z - 1, CHENE.x - 100, CHENE.z - 9, 450]]};
const MainBouche = ({monte}) => (
  <g>
    <defs>
      <filter id="mb-flou" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation="18" />
      </filter>
    </defs>
    <g filter="url(#mb-flou)">
      <g transform={`translate(560 ${lerp(2500, 1720, monte)}) rotate(-8)`}>
        <ellipse cx="0" cy="0" rx="430" ry="300" fill="#17121a" />
        {[-260, -110, 40, 190].map((x, k) => <ellipse key={k} cx={x} cy={-250 - k * 6} rx="82" ry="190" fill="#1d171f" transform={`rotate(${-10 + k * 6} ${x} -240)`} />)}
        <ellipse cx="-60" cy="-330" rx="320" ry="40" fill="#6a6c8c" opacity="0.16" />
      </g>
    </g>
  </g>
);
const Cachette = scene('cachette', ({f, fg, i, t, d, R}) => {
  const m = main(fg, 0.7);
  if (i === 0) {
    // la course vers le chêne, puis plongeon derrière (on se retrouve accroupi, face au tronc)
    const a = ease(t, 0, d * 0.55, Easing.in(Easing.quad));
    const b = ease(t, d * 0.45, d, Easing.inOut(Easing.cubic));
    const p = pas(fg, 0.42, 2 * (1 - b));
    const x = lerp(lerp(40, 520, a), CACHE.x, b);
    const z = lerp(lerp(CHENE.z - 3.4, CHENE.z - 0.9, a), CACHE.z, b);
    const yaw = lerp(lerp(4, 24, a), 178, b);
    const v = Math.abs(lerp(lerp(4, 24, ease(t + 1, 0, d * 0.55, Easing.in(Easing.quad))), 178, ease(t + 1, d * 0.45, d, Easing.inOut(Easing.cubic))) - yaw);
    const c = {x: x + p.sway, y: lerp(OEIL + 20 + p.bob * 1.5, CACHE.y, b), z, yaw, pitch: lerp(3, -4, b)};
    return <Vue fg={fg} cam={c} o={NUIT_C} roll={lerp(p.roll * 2, -6, Math.sin(b * Math.PI))} zoom={1.03} flou={v > 1 ? [Math.min(40, v * 2.5), 0] : [0, 3 * (1 - b)]} />;
  }
  const c = {x: CACHE.x + m.dx, y: CACHE.y + m.dy + 4 * Math.sin(fg / 9), z: CACHE.z, yaw: 178, pitch: -4};
  if (i === 1) {
    // de côté : accroupi contre le chêne, la main sur la bouche ; elle rôde au loin
    const k = lisse(t, d);
    const cc = {x: CHENE.x + 1350 - 120 * k, y: -60, z: CHENE.z + 0.75, yaw: -98, pitch: -2};
    const zr = CHENE.z - 3.2 + 0.4 * k;
    return (
      <Vue fg={fg} cam={cc} o={{...NUIT_C, lumYaw: -110}} zoom={1.1} roll={m.r}
        items={(cam) => [
          moi(cam, {x: CHENE.x + 380, z: CHENE.z + 0.35, id: 'mh1', lum: 0.32, teinte: NUIT_T, accroupi: true, eyes: 1.4, worry: 1, sweat: 1, epauleD: 60, coudeD: 150, epauleG: 20, coudeG: -60, pupilX: -12, shiver: tremble(fg, 2.5, 'hs')}),
          {z: zr, x: CHENE.x - 500, el: <RodeurMonde cam={cam} x={CHENE.x - 500} z={zr} id="ro6" pose={galop(QUATRE, fg * 0.15, 0.4)} tete={-15} />},
        ]} />
    );
  }
  // le téléphone, luminosité au minimum, contre la poitrine
  const leve = ease(t, 0, 16, Easing.out(Easing.cubic));
  const pose = {x: 540 + m.dx, y: lerp(2300, 900, leve) + m.dy, rx: lerp(40, 8, leve), ry: -4, rz: lerp(10, -2, leve), s: 1.15};
  return (
    <AbsoluteFill>
      <Flou k={7} lum={0.55}>
        <Vue fg={fg} cam={c} o={NUIT_C} zoom={1.03} />
      </Flou>
      <Tel fg={fg} pose={pose} lueur={0.25} nuit={0.85} allume={0.55} />
      <g />
    </AbsoluteFill>
  );
});

// ----- les griffes sur l'écorce (vue de dessous, le long du tronc) -----
// coin haut du tronc à l'écran : on dessine les doigts qui débordent du bord droit et raclent vers le bas
const Griffes = ({cam, f, sort, racle, id}) => {
  // bord droit du tronc (côté créature caché derrière) : projeté à deux hauteurs
  const [px, pz] = (() => {
    const vx = CHENE.x - cam.x;
    const vz = (CHENE.z - cam.z) * 1000;
    const L = Math.hypot(vx, vz);
    return [vz / L, -vx / L];
  })();
  const bord = (y) => cam.proj(CHENE.x - px * CHENE.r * 0.97, y, CHENE.z - (pz * CHENE.r * 0.97) / 1000);
  const haut = bord(-900 - 300 * racle);
  const dir = [-1, 0.15 + 0.2 * racle];
  const s = cam.scale(CHENE.z, CHENE.x, -900) * 2.8;
  const d = doigts([0, 0], dir, {long: 1.25 * sort, plie: 0.15 + 0.35 * sort, cote: -1});
  // traces de griffes laissées sur l'écorce
  const traces = [0, 1, 2, 3].map((k) => {
    const a = bord(-1060 + k * 40);
    const b = bord(-1060 + k * 40 + 380 * racle);
    return <path key={k} d={`M${a[0] - 60 - k * 22},${a[1] + k * 10} L${b[0] - 70 - k * 22},${b[1] + k * 10}`} stroke="#c8c4d4" strokeWidth={5 + 2 * s} opacity={0.55 * Math.min(1, racle * 3)} strokeLinecap="round" />;
  });
  return (
    <g key={id}>
      {traces}
      <g transform={`translate(${haut[0] + 8} ${haut[1]}) scale(${s})`}>
        {d.map((dd, k) => (
          <g key={k}>
            <polyline points={dd.map((p) => p.join(',')).join(' ')} fill="none" stroke="#eef0ff" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={dd.map((p) => p.join(',')).join(' ')} fill="none" stroke="#8a8796" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
            <path d={`M${dd[3][0]},${dd[3][1]} l${-10},${12}`} stroke="#15131a" strokeWidth="6" strokeLinecap="round" />
          </g>
        ))}
      </g>
    </g>
  );
};
// la tête qui se penche par-dessus le bord gauche du tronc et renifle
const TeteRenifle = ({cam, sort, f}) => {
  const vx = CHENE.x - cam.x;
  const vz = (CHENE.z - cam.z) * 1000;
  const L = Math.hypot(vx, vz);
  const [px, pz] = [vz / L, -vx / L];
  const b = cam.proj(CHENE.x + px * CHENE.r * 0.9, -1250, CHENE.z + (pz * CHENE.r * 0.9) / 1000);
  const s = cam.scale(CHENE.z, CHENE.x, -1250) * 2.4;
  const sniff = Math.max(0, Math.sin(f * 1.3)) ** 3 * 8;
  return (
    <g transform={`translate(${b[0] - (1 - sort) * 140 * s + 30} ${b[1] + sniff}) scale(${s}) rotate(${-25 - 10 * sort})`}>
      <path d="M0,-92 C52,-92 70,-50 66,-6 C62,44 34,84 0,86 C-34,84 -62,44 -66,-6 C-70,-50 -52,-92 0,-92 Z" fill="#eef0ff" stroke="#eef0ff" strokeWidth="9" />
      <path d="M0,-92 C52,-92 70,-50 66,-6 C62,44 34,84 0,86 C-34,84 -62,44 -66,-6 C-70,-50 -52,-92 0,-92 Z" fill="#7a7786" />
      {[-1, 1].map((k) => <ellipse key={k} cx={k * 25} cy="2" rx="18.5" ry="25" transform={`rotate(${k * -14} ${k * 25} 2)`} fill="#030205" />)}
      <path d="M-14,50 q14,8 28,-3" stroke="#1a1820" strokeWidth="3.5" fill="none" />
    </g>
  );
};

// ===== 10. Des griffes raclent l'écorce, juste au-dessus de ta tête. Il renifle. Puis plus rien. =====
const GriffesS = scene('griffes', ({f, fg, i, t, d, R}) => {
  const m = main(fg, 0.5);
  if (i === 2) {
    // plan large de côté : lui recroquevillé, elle collée de l'autre côté du tronc, la tête qui dépasse, elle renifle
    const k = lisse(t, d);
    const cc = {x: CHENE.x + 1500 - 100 * k, y: -260, z: CHENE.z + 0.55, yaw: -108, pitch: -4};
    const sniff = Math.max(0, Math.sin(fg * 1.3)) ** 3;
    return (
      <Vue fg={fg} cam={cc} o={{...NUIT_C, lumYaw: -100}} zoom={1.12}
        items={(cam) => [
          moi(cam, {x: CHENE.x + 380, z: CHENE.z + 0.35, id: 'mh2', lum: 0.32, teinte: NUIT_T, accroupi: true, eyes: 1.5, worry: 1, sweat: 1, epauleD: 60, coudeD: 150, epauleG: 20, coudeG: -60, pupilX: -14, shiver: tremble(fg, 3, 'gs')}),
          {z: CHENE.z - 0.55, x: CHENE.x - 120, el: <RodeurMonde cam={cam} x={CHENE.x - 120} z={CHENE.z - 0.55} id="ro7" pose={ECARTE} tete={-30 - 6 * sniff} />},
        ]} />
    );
  }
  if (i < 3) {
    const c = {x: CACHE.x + m.dx, y: CACHE.y + m.dy, z: CACHE.z + 0.05, yaw: 176, pitch: -52 + 3 * Math.sin(fg / 40)};
    const sort = i === 0 ? ease(f, R('griffes', 8) - 6, R('raclent', 18)) : 1 - ease(t, d - 14, d);
    const racle = i === 0 ? ease(f, R('raclent', 18), R('juste', 45) + 20, Easing.inOut(Easing.sin)) : 1;
    const renifle = i === 1 ? ease(t, 0, 10) * (1 - ease(t, d - 8, d)) : 0;
    return (
      <Vue fg={fg} cam={c} o={NUIT_C} roll={m.r} zoom={1.05 + 0.04 * lisse(t, d)}
        items={(cam) => [{z: CHENE.z - 0.5, x: CHENE.x, el: <g>{i === 0 && <Griffes cam={cam} f={f} sort={sort} racle={racle} id="gr" />}{i === 1 && <TeteRenifle cam={cam} sort={renifle} f={fg} />}</g>}]} />
    );
  }
  // plus rien : la forêt vide, dans la brume (on jette un œil sur le côté du tronc)
  const k = lisse(t, d);
  const c = {x: CACHE.x + 260 * k + m.dx, y: CACHE.y + m.dy, z: CACHE.z - 0.1, yaw: lerp(150, 140, k), pitch: -2};
  return <Vue fg={fg} cam={c} o={NUIT_C} roll={m.r} zoom={1.04} noir={0.08} />;
});

// ===== 11. Nouvelle vibration. Une photo. Toi. Caché derrière l'arbre. Prise de dos, il y a deux secondes. =====
const PhotoS = scene('photo', ({f, fg, i, t, d, R}) => {
  const m = main(fg, 0.5);
  const c = {x: CACHE.x + m.dx, y: CACHE.y + m.dy, z: CACHE.z, yaw: 178, pitch: -4};
  const leve = ease(f, 0, 16, Easing.out(Easing.cubic));
  // la photo est en bas de la conversation : on la rapproche pour la lire
  const zp = ease(f, R('toi', 53) - 6, R('caché', 68) + 4) * (1 - 0.0 * f);
  const pose = {x: lerp(540, 600, zp) + m.dx, y: lerp(lerp(2300, 880, leve), 470, zp) + m.dy, rx: lerp(lerp(40, 7, leve), 3, zp), ry: -4, rz: lerp(-2, -0.5, zp), s: lerp(1.15, 1.85, zp) + 0.08 * ease(f, 70, d)};
  return (
    <AbsoluteFill>
      <Flou k={8} lum={0.5}>
        <Vue fg={fg} cam={c} o={NUIT_C} zoom={1.03} />
      </Flou>
      <Tel fg={fg} pose={pose} lueur={0.3} nuit={0.85} allume={0.6} />
    </AbsoluteFill>
  );
});

// la lampe torche au loin (allumée / éteinte) : l'éblouissement garde une taille fixe à l'écran
const lampe = (cam, on, f) => {
  if (!cam.visible(LAMPE.z, LAMPE.x, LAMPE.y)) return null;
  const [x, y] = cam.proj(LAMPE.x, LAMPE.y, LAMPE.z);
  const v = on * (0.93 + 0.07 * Math.sin(f / 3));
  const a = (cam.yaw * Math.PI) / 180;
  return {
    z: cam.z + Math.cos(a) * 6,
    x: cam.x + Math.sin(a) * 6000,
    el: (
      <g key="lampe" opacity={v}>
        <defs>
          <radialGradient id="lp-h">
            <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="0.1" stopColor="#fff6dc" stopOpacity="0.8" />
            <stop offset="0.35" stopColor="#ffe6b0" stopOpacity="0.22" />
            <stop offset="1" stopColor="#ffd890" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lp-s" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff6dc" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff6dc" stopOpacity="0.7" />
            <stop offset="1" stopColor="#fff6dc" stopOpacity="0" />
          </linearGradient>
        </defs>
        <ellipse cx={x} cy={y + 30} rx="760" ry="460" fill="url(#lp-h)" opacity="0.4" />
        <circle cx={x} cy={y} r="230" fill="url(#lp-h)" />
        <circle cx={x} cy={y} r="15" fill="#fff" />
        <rect x={x - 520} y={y - 3} width="1040" height="6" fill="url(#lp-s)" />
        {/* faisceau vers nous */}
        <polygon points={`${x},${y} ${x - 260},${y + 900} ${x + 200},${y + 900}`} fill="#fff4d8" opacity="0.05" />
      </g>
    ),
  };
};
const etatLampe = (f, R) => {
  const a = R('sallume', 132);
  const b = R('séteint', 148);
  const c = R('rallume', 175);
  return f < a ? 0 : f < b ? ease(f, a, a + 2) : f < c - 2 ? 0 : ease(f, c - 2, c);
};

// ===== 12. « Je suis devant vous. Courez vers moi. » Au loin, une lampe torche s'allume. S'éteint. Se rallume. =====
const Lampe = scene('lampe', ({f, fg, i, t, d, R}) => {
  const m = main(fg, 0.5);
  if (i === 0) {
    const c = {x: CACHE.x + m.dx, y: CACHE.y + m.dy, z: CACHE.z, yaw: 178, pitch: -4};
    const pose = {x: 540 + m.dx, y: 880 + m.dy, rx: 7, ry: -4, rz: -1.5, s: 1.18 + 0.04 * lisse(t, d)};
    return (
      <AbsoluteFill>
        <Flou k={8} lum={0.5}>
          <Vue fg={fg} cam={c} o={NUIT_C} zoom={1.03} />
        </Flou>
        <Tel fg={fg} pose={pose} lueur={0.3} nuit={0.85} allume={0.6} />
      </AbsoluteFill>
    );
  }
  // on se penche hors du tronc et on regarde devant : la lampe, très loin
  const k = lisse(t, d);
  const on = etatLampe(f, R);
  const c = {x: CACHE.x - 360 - 80 * k + m.dx, y: CACHE.y - 20 + m.dy, z: CHENE.z + 0.15, yaw: -12, pitch: 0};
  return (
    <Vue fg={fg} cam={c} o={{...NUIT_C, lumYaw: 172}} roll={m.r} zoom={1.15 + 0.25 * k}
      items={(cam) => [lampe(cam, on, fg)].filter(Boolean)}
      dessus={<rect width="1080" height="1920" fill="#fff4d8" opacity={0.05 * on} />} />
  );
});

// ===== 13. Qui a pris la photo ? Celui qui t'écrit, ou celui qui te chasse ? Tu cours ou tu restes caché ? =====
const Dilemme = scene('dilemme', ({f, fg, i, t, d, R}) => {
  const m = main(fg, 0.4);
  if (i === 0) {
    // la photo, plein écran
    const k = lisse(t, d);
    const s = 2.62 + 0.18 * k;
    return (
      <AbsoluteFill style={{background: '#000'}}>
        <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
          <defs>
            <clipPath id="di-ph">
              <rect width={PH_W} height={PH_H} />
            </clipPath>
            <filter id="di-fl" colorInterpolationFilters="sRGB">
              <feGaussianBlur stdDeviation="9" />
            </filter>
          </defs>
          {/* fond : la même photo, agrandie, floutée et assombrie */}
          <g filter="url(#di-fl)" opacity="0.45">
            <g transform={`translate(540 960) scale(4.9) translate(${-PH_W / 2} ${-PH_H / 2})`} clipPath="url(#di-ph)">
              <Photo age={99} />
            </g>
          </g>
          <g transform={`translate(540 940) scale(${s}) translate(${-PH_W / 2} ${-PH_H / 2})`} clipPath="url(#di-ph)">
            <Photo age={99} />
          </g>
        </svg>
      </AbsoluteFill>
    );
  }
  // écran partagé : en haut la lampe (celui qui t'écrit), en bas derrière toi (celui qui te chasse)
  const lp = Math.floor(fg / 20) % 3 === 0 ? 0 : 1;
  const k = lisse(t, d);
  const haut = (
    <Vue fg={fg} cam={{x: CACHE.x - 420 + m.dx, y: CACHE.y - 20 + m.dy, z: CHENE.z + 0.15, yaw: -12, pitch: 0}} o={NUIT_C} zoom={1.45 + 0.1 * k} items={(cam) => [lampe(cam, lp, fg)].filter(Boolean)} />
  );
  const zr = CHENE.z - 5.2;
  const xr = CHENE.x + 80;
  const bas = (
    <Vue fg={fg} cam={{x: CACHE.x + 420 + m.dx, y: CACHE.y - 60 + m.dy, z: CACHE.z - 0.1, yaw: 184, pitch: -6}} o={NUIT_C} zoom={1.75 + 0.1 * k}
      items={(cam) => [{z: zr, x: xr, el: <RodeurMonde cam={cam} x={xr} z={zr} id="ro4" pose={ECARTE} tete={-30} respire={respire(fg)} />}]} />
  );
  const dis = R('dis-le', 177);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{clipPath: 'inset(0 0 962px 0)'}}>
        <AbsoluteFill style={{transform: 'translateY(-330px)'}}>{haut}</AbsoluteFill>
      </AbsoluteFill>
      <AbsoluteFill style={{clipPath: 'inset(962px 0 0 0)'}}>
        <AbsoluteFill style={{transform: 'translateY(420px)'}}>{bas}</AbsoluteFill>
      </AbsoluteFill>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{position: 'absolute'}}>
        <rect x="0" y="956" width="1080" height="8" fill="#000" />
        <Choix f={f} debut={R('cours', 116)} x={540} y={850} texte="JE COURS" emoji="1f526" couleur="#ffd23a" />
        <Choix f={f} debut={R('restes', 155)} x={540} y={1075} texte="JE RESTE CACHÉ" emoji="1f333" couleur="#ff3a4a" />
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

const COMPOSANTS = {vibre: Vibre, blague: Blague, doute: Doute, coincidence: Coincidence, branche: Branche, retourne: Retourne, charge: Charge, course: Course, cachette: Cachette, griffes: GriffesS, photo: PhotoS, lampe: Lampe, dilemme: Dilemme};
export const RentrezChezVous = () => (
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
