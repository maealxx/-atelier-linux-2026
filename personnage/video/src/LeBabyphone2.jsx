import {AbsoluteFill, Easing, interpolate, random, Series, spring, useCurrentFrame} from 'remotion';
import {
  CANAPE, CH, chambre, CO, couloir, Creature, cuisine, CU, eclair, ENTREE, ESC, FA, FEN_LENA, horloge, HUD, jardin, Lena, LENA, LIT, Moi, Pluie2, PLACARD, PORTE_CH,
  RimDefs, RIMS, SA, salon, SOL, solEscalier, TeteCouchee, TRAPPE, trier, VEILL, CAM_BB, PLAF,
} from './MaisonNuit';
import {Bonhomme as BonhommeImport} from './Bonhomme';
import {montage} from './montage';
import {Finition, makeCam} from './moteur';
import {ChoixBoite, Chrono, MainPov, VHS, fmt} from './NeLuiOuvrePas';
import {BulleCommentaire} from './ParrainageKit';
import {DEBOUT, ECARTE, marcheRodeur, melange, QUATRE, VisageSourire} from './Rodeur';
import {BabyReel, TelReel, VisionNocturne} from './TelReel';
import PLANS from './babyphone2/plans.json';
import timeline from './babyphone2/timeline.json';

// « Le babyphone » version 2 : maison en 3D éclairée pièce par pièce (LED orange, couloir vert, salon bleu…),
// l'heure qui défile en haut, la créature noire au sourire plein de dents, dilemme au milieu + rembobinage VHS.
const {decoupe, repere, SCENES, DUREES} = montage(timeline, PLANS);
export const DUREE_BABYPHONE2 = SCENES.reduce((t, [, d]) => t + d, 0);
const START = {};
SCENES.reduce((t, [nom, d]) => {
  START[nom] = t;
  return t + d;
}, 0);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const ease = (f, a, b, e = Easing.inOut(Easing.cubic)) => interpolate(f, [a, b], [0, 1], {...clamp, easing: e});
const lisse = (t, d) => Easing.inOut(Easing.sin)(Math.min(1, t / Math.max(1, d)));
const lerp = (a, b, u) => a + (b - a) * u;
const mixP = (a, b, u) => a.map((v, i) => lerp(v, b[i], u));
const deg = (r) => (r * 180) / Math.PI;
const tremble = (f, k, cle) => k * (random(`${cle}${f}`) - 0.5);
const vise = (p, c, extra = {}) => {
  const dx = c[0] - p[0];
  const dy = c[1] - p[1];
  const dz = (c[2] - p[2]) * 1000;
  return {x: p[0], y: p[1], z: p[2], yaw: deg(Math.atan2(dx, dz)), pitch: deg(Math.atan2(dy, Math.hypot(dx, dz))), ...extra};
};
// caméra portée (vue subjective) : petites oscillations + pas
const pov = (fg, p, c, {k = 1, pas = 0, v = 0.35} = {}) => {
  const b = vise(p, c);
  const s = Math.sin(fg * v);
  return {...b, y: b.y - Math.abs(s) * 26 * pas, x: b.x + s * 10 * pas, yaw: b.yaw + Math.sin(fg / 23) * 1.2 * k + s * 1.2 * pas, pitch: b.pitch + Math.sin(fg / 31 + 1) * 0.8 * k};
};
// heure en haut : 23:00:00 au début de « chuchote »
const BASE = horloge('23:00:00', -START.chuchote / 30);
const heure = (fg) => horloge(BASE, fg / 30);

// ----- une image : décor + objets triés + voile + habillage -----
const Vue = ({fg, cam, d, items = [], lieu, zoom = 1, roll = 0, noir = 0, flou = null, dessus = null, hud = true, voile = null, pluie = 0}) => {
  const its = trier(cam, [...d.items, ...items]);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <RimDefs couleurs={RIMS} />
        <defs>
          {flou && (
            <filter id="bb2-flou" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation={`${flou[0]} ${flou[1]}`} />
            </filter>
          )}
          <radialGradient id="bb2-vg" cx="540" cy="960" r="1150" gradientUnits="userSpaceOnUse">
            <stop offset="0.4" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.85" />
          </radialGradient>
        </defs>
        <g filter={flou ? 'url(#bb2-flou)' : undefined} transform={`rotate(${roll} 540 960) translate(540 960) scale(${zoom * (1 + Math.abs(roll) * 0.012)}) translate(-540 -960)`}>
          {d.fond}
          {its.map((it, k) => <g key={k}>{it.el}</g>)}
        </g>
        {voile && <rect width="1080" height="1920" fill={voile[0]} opacity={voile[1]} />}
        {pluie > 0 && <Pluie2 f={fg} force={pluie} />}
        <rect width="1080" height="1920" fill="#fff" opacity={0.25 * eclair(fg) * (pluie > 0 ? 1 : 0.5)} />
        <rect width="1080" height="1920" fill="url(#bb2-vg)" />
        <rect width="1080" height="1920" fill="#000" opacity={noir} />
        {dessus}
        {hud && <HUD f={fg} lieu={lieu} heure={heure(fg)} />}
        <Finition f={fg} id="bb2f" grain={0.05} vignette={0.3} />
      </svg>
    </AbsoluteFill>
  );
};

const torche = (c) => ({p: [c.x, c.y + 60, c.z + 0.05], c: [0.85, 0.9, 1], i: 0.8, r: 1000});
const RENDUS = {};
const scene = (nom, rendu) => {
  const C = () => {
    const f = useCurrentFrame();
    const {i, t, d, bornes} = decoupe(nom, f);
    return rendu({f, fg: START[nom] + f, i, t, d, k: lisse(t, d), bornes, R: (mot, def) => repere(nom, mot, def)});
  };
  C.displayName = nom;
  RENDUS[nom] = rendu;
  return C;
};
const imageA = (fg) => {
  const nom = SCENES.find(([n, d]) => fg >= START[n] && fg < START[n] + d)?.[0] || SCENES[0][0];
  const f = fg - START[nom];
  const {i, t, d, bornes} = decoupe(nom, f);
  return RENDUS[nom]({f, fg, i, t, d, k: lisse(t, d), bornes, R: (mot, def) => repere(nom, mot, def)});
};
const G = (nom, mot, def) => START[nom] + repere(nom, mot, def);

// ----- le téléphone : les messages de la mère -----
const TEXTES = ['Coucou c’est la maman de Léna', 'Elle doit dormir à 21h', 'Merci encore !!', 'Ah et dernière chose', 'Surtout, n’ouvre JAMAIS la trappe du grenier.'];
const BUZZ = [G('alerte', 'vibre', 95) - 6, G('alerte', 'encore', 115), G('alerte', 'et', 140), G('alerte', 'cinq', 167), G('alerte', 'surtout', 252) - 4];
const NOTIFS = BUZZ.slice(0, 4).map((t, k) => ({t, titre: 'Maman de Léna', texte: TEXTES[k]}));
const MSGS = [...BUZZ.slice(0, 4).map((t, k) => ({t: t - 400, texte: TEXTES[k]})), {t: BUZZ[4], texte: TEXTES[4], alerte: true}];
const MSG6 = {t: G('message', 'on', 66), texte: 'On a oublié de te dire. Léna dort chez sa mamie ce soir.', alerte: true};

// ----- personnages -----
const MOI_SA = {x: 820, z: 1.3};
const POSE_TEL = {epauleD: -30, coudeD: 100, pupilY: 10, pupilX: -4};
const POSE_BB = {epauleD: -35, coudeD: 95, epauleG: 20, coudeG: -20};
const assis = (cam, d, extra = {}) => ({z: 1.85, x: 380, el: <Moi cam={cam} ctx={d.ctx} x={380} z={1.85} y={515} rim="bleu" id={extra.id || 'as'} {...POSE_BB} {...extra} />});
// le devant du canapé, redessiné par-dessus quand il est assis (on ne voit pas ses jambes)
const devantCanape = (cam, d) => ({z: 1.85, x: CANAPE.x1 + 400, el: (
  <g key="dc">
    {(() => {
      const p = cam.poly([[CANAPE.x1, 190, CANAPE.z0], [CANAPE.x1, 190, CANAPE.z1], [CANAPE.x1, SOL, CANAPE.z1], [CANAPE.x1, SOL, CANAPE.z0]]);
      return p ? <polygon points={p} fill="#2a2450" /> : null;
    })()}
  </g>
)});
const lenaCouchee = (cam, d, {yeux = 0, id = 'lc'} = {}) => ({z: LIT.z0 - 0.05, x: -350, el: <TeteCouchee cam={cam} ctx={d.ctx} x={-350} y={150} z={LIT.z1 - 0.2} yeux={yeux} id={id} />});

// main grise très longue qui sort d'un trou (repère écran)
const LongueMain = ({x, y, l, a = 90, s = 1, c = '#9a98a4', rim = '#d8ffd8'}) => {
  const r = (a * Math.PI) / 180;
  const coude = [x + Math.cos(r) * l * 0.55, y + Math.sin(r) * l * 0.55];
  const poignet = [coude[0] + Math.cos(r - 0.25) * l * 0.45, coude[1] + Math.sin(r - 0.25) * l * 0.45];
  const doigts = [-0.5, -0.2, 0.1, 0.4].map((da, k) => [poignet[0] + Math.cos(r - 0.25 + da) * (110 + 20 * (k % 2)) * s, poignet[1] + Math.sin(r - 0.25 + da) * (110 + 20 * (k % 2)) * s]);
  const pl = (pts, w, col) => <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={col} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />;
  return (
    <g>
      {pl([[x, y], coude, poignet], 34 * s + 8, rim)}
      {doigts.map((dd, k) => <g key={k}>{pl([poignet, dd], 12 * s + 6, rim)}</g>)}
      {pl([[x, y], coude, poignet], 34 * s, c)}
      {doigts.map((dd, k) => <g key={`d${k}`}>{pl([poignet, dd], 12 * s, c)}</g>)}
    </g>
  );
};

// ===================== 1. Imagine, tu fais du baby-sitting. Ton tel vibre. Cinq messages. =====================
const Alerte = scene('alerte', ({f, fg, i, t, k, R, bornes}) => {
  if (i < 2) {
    // 1re image : toi dans le salon, le téléphone vibre dans ta main ; l'orage claque
    const vib = BUZZ.some((b) => fg >= b && fg < b + 14) ? Math.sin(fg * 2.6) * 0.6 : 0;
    const cam = makeCam(i === 0 ? vise([MOI_SA.x + 300 - 120 * k, -240, MOI_SA.z - 0.8 + 0.2 * k], [MOI_SA.x - 20, -170, MOI_SA.z]) : vise([MOI_SA.x - 300 + 60 * k, -170, MOI_SA.z - 0.55], [MOI_SA.x, -170, MOI_SA.z]));
    const d = salon(cam, f, fg, {lumieres: [{p: [MOI_SA.x - 80, -200, MOI_SA.z - 0.15], c: [0.6, 0.7, 1], i: 0.5, r: 320}]});
    const moi = {z: MOI_SA.z, x: MOI_SA.x, el: <Moi cam={cam} ctx={d.ctx} x={MOI_SA.x} z={MOI_SA.z} rim="bleu" id="a0" {...POSE_TEL} eyes={i ? 1.15 : 1} worry={i ? 0.4 : 0} shiver={vib * 4} breath={Math.sin(fg / 8) * 3} />};
    return <Vue fg={fg} cam={cam} d={d} items={[moi]} lieu="NUIT 1 · SALON" zoom={i === 0 ? interpolate(f, [0, 8], [1.15, 1], {...clamp, easing: Easing.out(Easing.cubic)}) : 1.05 + 0.04 * k} roll={i ? -2 : 1.5} />;
  }
  // le téléphone en gros plan : 4 notifications, tu ouvres, le 5e message tombe
  const tap = G('alerte', 'cest', 207);
  const cam = makeCam(vise([MOI_SA.x - 200, -170, MOI_SA.z - 0.6], [MOI_SA.x - 900, -100, 3]));
  const d = salon(cam, f, fg, {});
  const prise = ease(t, 0, 18);
  const zoomConv = 0.22 * ease(fg, BUZZ[4] + 4, BUZZ[4] + 30);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{filter: 'blur(14px) brightness(0.7)'}}>
        <Vue fg={fg} cam={cam} d={d} hud={false} lieu="" />
      </AbsoluteFill>
      <TelReel f={fg} pose={{x: 540, y: lerp(1600, 1090, prise), rx: lerp(40, 5, prise), ry: -5 + 2 * Math.sin(f / 30), rz: lerp(10, -1.5, prise), s: 1.12}} vib={BUZZ} notifs={NOTIFS} messages={MSGS} tap={tap} heure={heure(fg).slice(0, 5)} zoomConv={zoomConv} appui={ease(fg, tap - 8, tap) * (1 - ease(fg, tap + 2, tap + 10))} lueur={0.55} nuit={0.5} nom="Maman de Léna" />
      <AbsoluteFill>
        <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
          <HUD f={fg} lieu="NUIT 1 · SALON" heure={heure(fg)} />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
});

// ===================== 2. Tu couches Léna, tu allumes sa veilleuse, tu prends le babyphone et tu descends =====================
const Dodo = scene('dodo', ({f, fg, i, t, k, R}) => {
  const v = ease(f, R('allumes', 37) - 2, R('allumes', 37) + 6);
  if (i === 0) {
    const cam = makeCam(vise([500 - 120 * k, -330, 0.55 + 0.15 * k], [-250, 60, 2.0]));
    const d = chambre(cam, f, fg, {veilleuse: v, led: 0.7 + 0.3 * v});
    const moi = {z: 1.75, x: 120, el: <Moi cam={cam} ctx={d.ctx} x={120} z={1.75} rim="orange" id="d0" epauleG={20} coudeG={-70 * (1 - v)} epauleD={-40 * v} coudeD={-60 * v} pupilX={-12} pupilY={8} smile={0.4} />};
    return <Vue fg={fg} cam={cam} d={d} items={[moi, lenaCouchee(cam, d)]} lieu="NUIT 1 · CHAMBRE DE LÉNA" zoom={1.02 + 0.04 * k} roll={-1.5} />;
  }
  // depuis le lit : il prend le babyphone et sort ; la porte se referme sur le couloir vert
  const u = ease(t, 6, 56, Easing.inOut(Easing.sin));
  const cam = makeCam(vise([-150, -220, 2.1], [-700, -150, 0.5]));
  const d = chambre(cam, f, fg, {veilleuse: 1, porte: 1});
  const x = lerp(-300, -820, u);
  const z = lerp(1.2, 0.6, u);
  const m = Math.sin(fg / 3.5);
  const moi = {z, x, el: <Moi cam={cam} ctx={d.ctx} x={x} z={z} rim="orange" id="d1" dos={u > 0.3} {...POSE_BB} legG={Math.max(0, m) * 0.7} legD={Math.max(0, -m) * 0.7} />};
  return <Vue fg={fg} cam={cam} d={d} items={[moi]} lieu="NUIT 1 · CHAMBRE DE LÉNA" zoom={1.05} roll={2} />;
});

// ===================== 3. 23 h. Dans le babyphone, Léna chuchote. Elle rigole. « Chut, il va t'entendre. » =====================
const vueChambreBB = (fg, f, {regard = 0, assise = 1, id = 'nv'} = {}) => {
  const cam = makeCam(vise(CAM_BB, [-350, 120, 2.0]));
  const d = chambre(cam, f, fg, {veilleuse: 0.7, led: 0.15});
  const lena = assise > 0
    ? {z: LIT.z0 - 0.05, x: -350, el: <TeteCouchee cam={cam} ctx={d.ctx} x={-350} y={150 - 120 * assise} z={LIT.z1 - 0.3} yeux={1} s={1.1} id={`${id}t`} />}
    : lenaCouchee(cam, d, {id: `${id}t`});
  return (
    <g>
      {d.fond}
      {trier(cam, [...d.items, lena]).map((it, q) => <g key={q}>{it.el}</g>)}
    </g>
  );
};
const Chuchote = scene('chuchote', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    // sur le canapé, la télé allumée ; le babyphone posé sur la table basse
    const cam = makeCam(vise([1180 - 80 * k, -220, 0.9 + 0.1 * k], [380, -40, 1.85]));
    const d = salon(cam, f, fg, {});
    return <Vue fg={fg} cam={cam} d={d} items={[assis(cam, d, {pupilX: 10, id: 'c0'}), devantCanape(cam, d)]} lieu="NUIT 1 · SALON" zoom={1.03 + 0.03 * k} roll={-1} />;
  }
  if (i === 1) {
    // le babyphone en main : la vision nocturne, Léna s'est assise dans son lit
    const niveau = 0.25 + 0.35 * Math.abs(Math.sin(f / 3)) * (f > R('chuchote', 80) - 10 ? 1 : 0.3);
    return (
      <AbsoluteFill style={{background: '#04040a'}}>
        <BabyReel f={fg} pose={{x: 540, y: 1150, rx: 8, ry: 6 + 3 * Math.sin(f / 25), rz: 2, s: 1.4 + 0.08 * k}} niveau={niveau} flux={<VisionNocturne f={fg} id="nv1" heure={heure(fg).slice(0, 5)}>{vueChambreBB(fg, f, {assise: 1, id: 'v1'})}</VisionNocturne>} lueur={0.45} />
        <AbsoluteFill>
          <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
            <HUD f={fg} lieu="NUIT 1 · SALON" heure={heure(fg)} />
          </svg>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  // plein écran : la vision nocturne ; Léna tournée vers le coin sombre de la pièce
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <g transform={`translate(540 960) scale(${1.1 + 0.15 * k}) translate(-540 -960)`}>
          <VisionNocturne f={fg} id="nv2" plein heure={heure(fg).slice(0, 5)}>{vueChambreBB(fg, f, {assise: 1, id: 'v2'})}</VisionNocturne>
        </g>
        <HUD f={fg} lieu="CAM 1 · CHAMBRE DE LÉNA" heure={heure(fg)} />
      </svg>
    </AbsoluteFill>
  );
});

// ===================== 4. Tu montes en courant. Léna dort. Toute seule. La trappe est entrouverte. =====================
const Escalier = scene('escalier', ({f, fg, i, t, k, d: dd}) => {
  if (i === 0) {
    // vue subjective : tu montes l'escalier quatre à quatre
    const u = ease(t, 0, dd, Easing.inOut(Easing.sin));
    const z = lerp(0.2, 2.6, u);
    const y = solEscalier(z) - 520;
    const c = pov(fg, [ESC.x0 + 200, y, z], [ESC.x0 + 200, y - 260, z + 2], {k: 1.4, pas: 1.6, v: 0.5});
    const cam = makeCam(c);
    const d = salon(cam, f, fg, {});
    return <Vue fg={fg} cam={cam} d={d} lieu="NUIT 1 · ESCALIER" flou={[0, 3]} zoom={1.05} />;
  }
  if (i === 1) {
    // dans le couloir, tu cours vers la porte de Léna (lumière orange)
    const u = ease(t, 0, dd);
    const c = pov(fg, [100, -150, lerp(0.1, 0.5, u)], [-420, -120, 0.8], {k: 1.2, pas: 1.4, v: 0.5});
    const cam = makeCam(c);
    const d = couloir(cam, f, fg, {trappe: 0.25});
    return <Vue fg={fg} cam={cam} d={d} lieu="NUIT 1 · COULOIR" flou={[4, 0]} />;
  }
  if (i === 2) {
    // tu ouvres : Léna dort, seule, la veilleuse allumée
    const cam = makeCam(vise([-780 + 60 * k, -170, 0.6 + 0.1 * k], [-350, 100, 2.1]));
    const d = chambre(cam, f, fg, {veilleuse: 1, porte: 1});
    return <Vue fg={fg} cam={cam} d={d} items={[lenaCouchee(cam, d, {id: 'e2'})]} lieu="NUIT 1 · CHAMBRE DE LÉNA" zoom={1.0 + 0.08 * k} />;
  }
  // contre-plongée dans le couloir : la trappe du grenier, entrouverte
  const cam = makeCam(vise([60, 250, 1.0], [0, PLAF, lerp(1.9, 2.0, k)], {}));
  const d = couloir(cam, f, fg, {trappe: 0.25 + 0.03 * Math.sin(f / 9)});
  const moi = {z: 1.2, x: 110, el: <Moi cam={cam} ctx={d.ctx} x={110} z={1.2} rim="vert" id="e3" dos pupilY={-10} />};
  return <Vue fg={fg} cam={cam} d={d} items={[moi]} lieu="NUIT 1 · COULOIR" zoom={1.0 + 0.1 * k} roll={-3} />;
});

// ===================== 5. Tu redescends. Le babyphone grésille. Une voix d'homme murmure ton prénom. =====================
const Voix = scene('voix', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    // tu redescends l'escalier, vu d'en bas
    const u = ease(t, 0, 58, Easing.inOut(Easing.sin));
    const z = lerp(3.1, 1.2, u);
    const y = solEscalier(z);
    const m = Math.sin(fg / 3.2);
    const cam = makeCam(vise([-300, -60, 0.2], [-1150, y - 280, z]));
    const d = salon(cam, f, fg, {});
    const moi = {z, x: -1200, y: y - 200, el: <Moi cam={cam} ctx={d.ctx} x={-1200} z={z} y={y} rim="bleu" id="v0" {...POSE_BB} legG={Math.max(0, m) * 0.5} legD={Math.max(0, -m) * 0.5} />};
    return <Vue fg={fg} cam={cam} d={d} items={[moi]} lieu="NUIT 1 · SALON" zoom={1.04 + 0.03 * k} roll={1} />;
  }
  if (i === 1) {
    // le babyphone grésille : la diode rouge, l'image brouillée
    const gr = 0.4 + 0.6 * ease(f, R('grésille', 52) - 4, R('grésille', 52) + 6);
    return (
      <AbsoluteFill style={{background: '#04040a'}}>
        <BabyReel f={fg} pose={{x: 540 + tremble(fg, 5 * gr, 'bv'), y: 1150, rx: 6, ry: -6, rz: -2, s: 1.45 + 0.1 * k}} niveau={0.85 + 0.15 * Math.sin(f)} alerte={gr} grain={gr} flux={<VisionNocturne f={fg} id="nv3" parasites={gr} heure={heure(fg).slice(0, 5)}>{vueChambreBB(fg, f, {assise: 0, id: 'v3'})}</VisionNocturne>} lueur={0.5} />
        <AbsoluteFill>
          <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
            <HUD f={fg} lieu="NUIT 1 · SALON" heure={heure(fg)} />
          </svg>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  // gros plan sur toi, figé, la télé bleue sur le visage
  const cam = makeCam(vise([MOI_SA.x - 260 + 40 * k, -175, MOI_SA.z - 0.42 + 0.06 * k], [MOI_SA.x, -175, MOI_SA.z]));
  const d = salon(cam, f, fg, {});
  const moi = {z: MOI_SA.z, x: MOI_SA.x, el: <Moi cam={cam} ctx={d.ctx} x={MOI_SA.x} z={MOI_SA.z} rim="bleu" id="v2" {...POSE_BB} eyes={1.45} worry={1} pupilX={-14} scream={0.15} sweat={0.6} />};
  return <Vue fg={fg} cam={cam} d={d} items={[moi]} lieu="NUIT 1 · SALON" zoom={1.0 + 0.12 * k} />;
});

// ===================== 6. La caméra a tourné toute seule : elle filme la trappe. Une longue main grise en sort. =====================
const vueTrappe = (fg, f, main = 0) => {
  const cam = makeCam(vise([300, -350, 0.6], [0, PLAF, 2.0]));
  const d = couloir(cam, f, fg, {trappe: 0.55, porteLena: 0.3});
  const [hx, hy] = cam.proj(0, PLAF, 2.0);
  return (
    <g>
      {d.fond}
      {trier(cam, d.items).map((it, q) => <g key={q}>{it.el}</g>)}
      {main > 0 && <LongueMain x={hx + 20} y={hy - 10} l={560 * main} a={110 - 15 * main} s={1.3} />}
    </g>
  );
};
const Ecran = scene('ecran', ({f, fg, i, t, k, R}) => {
  const main = ease(f, R('main', 141) - 14, R('sort', 155) + 10, Easing.out(Easing.cubic));
  if (i === 0) {
    return (
      <AbsoluteFill style={{background: '#04040a'}}>
        <BabyReel f={fg} pose={{x: 540, y: 1150 - 30 * k, rx: 4, ry: 4, rz: 1, s: 1.45 + 0.2 * k}} niveau={0.05} flux={<VisionNocturne f={fg} id="nv4" heure={heure(fg).slice(0, 5)}>{vueTrappe(fg, f, main)}</VisionNocturne>} lueur={0.5} />
        <AbsoluteFill>
          <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
            <HUD f={fg} lieu="NUIT 1 · SALON" heure={heure(fg)} />
          </svg>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <g transform={`translate(540 800) scale(${1.15 + 0.2 * k}) translate(-540 -800)`}>
          <VisionNocturne f={fg} id="nv5" plein heure={heure(fg).slice(0, 5)} parasites={0.15}>{vueTrappe(fg, f, main)}</VisionNocturne>
        </g>
        <HUD f={fg} lieu="CAM 1 · COULOIR" heure={heure(fg)} />
      </svg>
    </AbsoluteFill>
  );
});

// ===================== 7. La mère t'écrit : Léna dort chez sa mamie ce soir. =====================
const Message = scene('message', ({f, fg, i, t, k}) => {
  if (i === 0) {
    const cam = makeCam(vise([MOI_SA.x - 200, -170, MOI_SA.z - 0.6], [MOI_SA.x - 900, -100, 3]));
    const d = salon(cam, f, fg, {});
    return (
      <AbsoluteFill style={{background: '#000'}}>
        <AbsoluteFill style={{filter: 'blur(14px) brightness(0.6)'}}>
          <Vue fg={fg} cam={cam} d={d} hud={false} lieu="" />
        </AbsoluteFill>
        <TelReel f={fg} pose={{x: 540, y: 1090, rx: 5, ry: -4, rz: -1.5, s: 1.12}} vib={[MSG6.t]} notifs={[]} messages={[...MSGS, MSG6]} ecran="conv" heure={heure(fg).slice(0, 5)} zoomConv={0.22 + 0.12 * ease(fg, MSG6.t, MSG6.t + 40)} lueur={0.55} nuit={0.5} nom="Maman de Léna" />
        <AbsoluteFill>
          <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
            <HUD f={fg} lieu="NUIT 1 · SALON" heure={heure(fg)} />
          </svg>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  // ton visage : tu lèves les yeux vers le plafond
  const cam = makeCam(vise([MOI_SA.x - 240, -100, MOI_SA.z - 0.5], [MOI_SA.x, -200, MOI_SA.z]));
  const d = salon(cam, f, fg, {lumieres: [{p: [MOI_SA.x - 80, -200, MOI_SA.z - 0.15], c: [0.6, 0.7, 1], i: 0.6, r: 320}]});
  const moi = {z: MOI_SA.z, x: MOI_SA.x, el: <Moi cam={cam} ctx={d.ctx} x={MOI_SA.x} z={MOI_SA.z} rim="bleu" id="m1" {...POSE_TEL} eyes={1.4} worry={1} pupilY={-14} pupilX={-6} sweat={1} />};
  return <Vue fg={fg} cam={cam} d={d} items={[moi]} lieu="NUIT 1 · SALON" zoom={1.0 + 0.1 * k} roll={-2} />;
});

// ===================== 8. La lumière s'éteint. Des pas à l'étage. Quelque chose descend l'escalier, à quatre pattes. =====================
const Coupure = scene('coupure', ({f, fg, i, t, k, R}) => {
  const off = f >= R('séteint', 19) - 2;
  const o = {tv: off ? 0 : 1, lampe: off ? 0 : 1};
  if (i === 0) {
    const cam = makeCam(vise([1150, -380, 0.3], [0, 0, 2.2]));
    const d = salon(cam, f, fg, o);
    const lum = off ? [{p: [MOI_SA.x - 60, -180, MOI_SA.z - 0.15], c: [0.35, 0.9, 0.5], i: 0.4, r: 300}] : [];
    d.ctx.lums.push(...lum);
    const moi = {z: MOI_SA.z, x: MOI_SA.x, el: <Moi cam={cam} ctx={d.ctx} x={MOI_SA.x} z={MOI_SA.z} rim="bleu" id="k0" {...POSE_BB} eyes={1.3} worry={0.8} pupilY={-10} />};
    return <Vue fg={fg} cam={cam} d={d} items={[moi]} lieu="NUIT 1 · SALON" zoom={1.03} />;
  }
  if (i === 1) {
    // contre-plongée au pied de l'escalier : le plafond qui vibre sous les pas
    const pas = [R('pas', 43), R('lourds', 48) + 4, R('létage', 58) + 6, R('létage', 58) + 18];
    const choc = pas.reduce((s, p) => s + (f >= p && f < p + 6 ? 1 - (f - p) / 6 : 0), 0);
    const cam = makeCam(vise([-800, 280, 0.5], [-1150, -500, 3.0], {}));
    const d = salon(cam, f, fg, o);
    return <Vue fg={fg} cam={cam} d={d} lieu="NUIT 1 · ESCALIER" zoom={1.04 + 0.03 * k} roll={tremble(fg, 3 * choc, 'kp')} />;
  }
  // la chose descend l'escalier à quatre pattes (silhouette, yeux, sourire)
  const u = ease(t, 0, 63, Easing.inOut(Easing.sin));
  const z = lerp(3.3, 2.6, u);
  const y = solEscalier(z);
  const cam = makeCam(vise([-750, 150, 0.7], [-1150, y - 300, z]));
  const d = salon(cam, f, fg, o);
  const cr = {z, x: -1180, y: y - 200, el: <Creature cam={cam} x={-1180} z={z} y={y} pose={melange(QUATRE, DEBOUT, 0)} echelle={1.0} rim="#8a9aff" sourire={0.7} id="k2" />};
  return <Vue fg={fg} cam={cam} d={d} items={[cr]} lieu="NUIT 1 · ESCALIER" zoom={1.05 + 0.08 * k} />;
});

// ===================== 9. Trois secondes : le placard sous l'escalier, ou la porte d'entrée ? =====================
const Choix = scene('choix', ({f, fg, i, t, k, R}) => {
  const a = R('placard', 63) - 4;
  const b = R('porte', 123) - 4;
  const t0 = R('dentrée', 132) + 14;
  const reste = 3 - Math.max(0, f - t0) / 30;
  const o = {tv: 0, lampe: 0, lumieres: [{p: [MOI_SA.x - 60, -180, MOI_SA.z - 0.15], c: [0.35, 0.9, 0.5], i: 0.4, r: 300}]};
  let cam;
  let flou = null;
  let items = [];
  if (i < 2) {
    // regard vers le placard… puis vers la porte d'entrée (panoramiques rapides)
    const de = i === 0 ? [-1000, 100, PLACARD.z0 + 0.3] : [-1000, 100, PLACARD.z0 + 0.3];
    const vers = i === 0 ? [-1000, 100, PLACARD.z0 + 0.3] : [(ENTREE.x0 + ENTREE.x1) / 2, -80, SA.z1];
    const u = i === 0 ? 1 : ease(t, 0, 10, Easing.out(Easing.cubic));
    const p0 = [MOI_SA.x - 100, -150, MOI_SA.z];
    const A = pov(fg, p0, de, {k: 1.2});
    const B = pov(fg, p0, vers, {k: 1.2});
    const dyaw = ((B.yaw - A.yaw + 540) % 360) - 180;
    cam = makeCam({...B, yaw: A.yaw + dyaw * u, pitch: lerp(A.pitch, B.pitch, u)});
    o.lumieres.push(torche(cam));
    const v = Math.abs(dyaw) * Math.abs(ease(t + 1, 0, 10, Easing.out(Easing.cubic)) - u);
    flou = i === 1 && v > 1 ? [Math.min(40, v * 3), 0] : null;
  } else {
    // de l'extérieur : toi au milieu du salon noir, la chose sur l'escalier derrière ; la caméra tourne
    const ang = lerp(250, 205, lisse(t, 89));
    const r = 1.3;
    const tension = 1 - reste / 3;
    cam = makeCam({x: MOI_SA.x - Math.sin((ang * Math.PI) / 180) * r * 1000 + tremble(fg, 8 * tension, 'ch'), y: -170, z: MOI_SA.z - Math.cos((ang * Math.PI) / 180) * r, yaw: ang, pitch: -2});
  }
  const d = salon(cam, f, fg, o);
  items = [
    {z: MOI_SA.z, x: MOI_SA.x, el: <Moi cam={cam} ctx={d.ctx} x={MOI_SA.x} z={MOI_SA.z} rim="bleu" id="ch" {...POSE_BB} eyes={1.4} worry={1} sweat={1} pupilX={14 * Math.sin(fg / 9)} />},
    {z: 2.6, x: -1180, el: <Creature cam={cam} x={-1180} z={2.6} y={solEscalier(2.6)} pose={QUATRE} echelle={0.85} rim="#8a9aff" sourire={0.8} id="chc" />},
  ];
  const pouls = Math.max(0, Math.sin(f / 4.5)) ** 8;
  return (
    <Vue fg={fg} cam={cam} d={d} items={items} flou={flou} lieu="NUIT 1 · SALON" zoom={1.04 + 0.03 * pouls}
      dessus={
        <g>
          <ChoixBoite f={f} debut={a} x={540} y={560} texte="LE PLACARD" emoji="1f6aa" couleur="#ffb03a" />
          <ChoixBoite f={f} debut={b} x={540} y={760} texte="LA PORTE" emoji="1f3c3" couleur="#5ab0ff" />
          {f >= t0 - 4 && <Chrono reste={reste} />}
          <rect width="1080" height="1920" fill="#ff1a1a" opacity={f >= t0 ? 0.05 + 0.06 * Math.max(0, Math.sin(f / 2.5)) * (1 - reste / 3) : 0} />
        </g>
      } />
  );
});

// ===================== 10. Le placard : tu retiens ton souffle… les pas s'arrêtent… « Je te vois. » =====================
// vue depuis le placard, à travers les lattes de la porte
const Lattes = ({children, ouvert = 0}) => (
  <g>
    <defs>
      <clipPath id="lat-c">
        {[...Array(16)].map((_, k) => <rect key={k} x="0" y={140 + k * 105} width="1080" height={40 + 50 * ouvert} />)}
      </clipPath>
    </defs>
    <rect width="1080" height="1920" fill="#030306" />
    <g clipPath="url(#lat-c)">{children}</g>
    {[...Array(16)].map((_, k) => <rect key={k} x="0" y={140 + k * 105 + 40} width="1080" height="10" fill="#14141c" opacity="0.6" />)}
  </g>
);
const Placard = scene('placard', ({f, fg, i, t, k, R, d: dd}) => {
  const o = {tv: 0, lampe: 0};
  const crie = R('vois', 253) + 10;
  if (f >= crie) {
    const u = f - crie;
    if (u > 26) return <AbsoluteFill style={{background: '#000'}} />;
    return <Screamer f={u} fg={fg} />;
  }
  if (i === 0) {
    // tu te glisses dans le placard ; la porte se referme
    const u = ease(t, 0, 48, Easing.in(Easing.quad));
    const c = pov(fg, mixP([MOI_SA.x - 300, -150, MOI_SA.z + 0.2], [-900, -60, PLACARD.z0 + 0.3], u), [-1100, 50, PLACARD.z0 + 0.3], {k: 1.4, pas: 1.4 * (1 - u), v: 0.5});
    const cam = makeCam(c);
    const d = salon(cam, f, fg, {...o, lumieres: [torche(cam)]});
    return <Vue fg={fg} cam={cam} d={d} lieu="NUIT 1 · SALON" noir={ease(t, 30, 48)} flou={[10 * u, 2 * u]} />;
  }
  const vueDehors = (crea) => {
    const cam = makeCam(vise([-1120, -40, PLACARD.z0 + 0.3], [-200, 0, PLACARD.z0 + 0.3]));
    const d = salon(cam, f, fg, {...o, lumieres: [{p: [-400, -300, 3.0], c: [0.5, 0.6, 1], i: 1.0, r: 1600}, {p: [-700, 300, 2.85], c: [0.6, 0.7, 1], i: 0.6, r: 700}]});
    return (
      <g>
        {d.fond}
        {trier(cam, [...d.items, ...(crea ? [crea(cam)] : [])]).map((it, q) => <g key={q}>{it.el}</g>)}
      </g>
    );
  };
  const souffle = horloge('00:00:00', Math.max(0, f - R('retiens', 53)) / 30).slice(3);
  const bandeau = (
    <g>
      <text x="60" y="1250" fontFamily="'DejaVu Sans', sans-serif" fontWeight="700" fontSize="30" letterSpacing="7" fill="#e8e8f0" opacity="0.8">RETIENS TON SOUFFLE</text>
      <text x="60" y="1300" fontFamily="'DejaVu Sans Mono', monospace" fontSize="36" fill="#ff5a5a">{souffle}</text>
    </g>
  );
  if (i === 1) {
    // ton visage dans le noir, rayé par la lumière des lattes
    return (
      <AbsoluteFill style={{background: '#000'}}>
        <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
          <rect width="1080" height="1920" fill="#030306" />
          <g filter="url(#pl-t2)">
            <defs>
              <filter id="pl-t2">
                <feColorMatrix type="matrix" values="0.28 0 0 0 0  0 0.3 0 0 0  0 0 0.55 0 0  0 0 0 1 0" />
              </filter>
            </defs>
            <g transform={`translate(540 ${2650 - 60 * k}) scale(2.3) translate(-300 -922)`}>
              <BonhommeVisage eyes={1.35} worry={1} sweat={1} pupilX={10} />
            </g>
          </g>
          {[...Array(7)].map((_, q) => <rect key={q} x="0" y={700 + q * 120 + 20 * Math.sin(f / 30)} width="1080" height="26" fill="#9ab0ff" opacity="0.13" />)}
          {bandeau}
          <HUD f={fg} lieu="NUIT 1 · PLACARD" heure={heure(fg)} />
          <Finition f={fg} id="plf" grain={0.07} vignette={0.6} />
        </svg>
      </AbsoluteFill>
    );
  }
  if (i === 2) {
    // à travers les lattes : ses longues jambes passent… et s'arrêtent devant la porte
    const u = ease(t, 0, 50, Easing.out(Easing.cubic));
    const x = lerp(-150, -720, u);
    const crea = (cam) => ({z: PLACARD.z0 + 0.3, x, el: <Creature cam={cam} x={x} z={PLACARD.z0 + 0.3} pose={marcheRodeur(DEBOUT, fg / 5, 1 - u)} echelle={1.25} rim="#8a9aff" id="pc" />});
    return (
      <AbsoluteFill style={{background: '#000'}}>
        <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
          <RimDefs couleurs={RIMS} />
          <Lattes>{vueDehors(crea)}</Lattes>
          {bandeau}
          <HUD f={fg} lieu="NUIT 1 · PLACARD" heure={heure(fg)} />
          <Finition f={fg} id="plf2" grain={0.07} vignette={0.6} />
        </svg>
      </AbsoluteFill>
    );
  }
  // le babyphone grésille dans ta main… et dans les lattes, deux yeux, un sourire
  const vois = f >= R('je', 241) - 8;
  if (!vois) {
    const gr = ease(f, R('grésille', 161) - 4, R('grésille', 161) + 6);
    return (
      <AbsoluteFill style={{background: '#020204'}}>
        <BabyReel f={fg} pose={{x: 540 + tremble(fg, 4 * gr, 'bp'), y: 1160, rx: 10, ry: 4, rz: 3, s: 1.45 + 0.1 * k}} niveau={0.3 + 0.7 * gr} alerte={gr} grain={gr} flux={<VisionNocturne f={fg} id="nv6" parasites={gr} heure={heure(fg).slice(0, 5)}>{vueChambreBB(fg, f, {assise: 0, id: 'v6'})}</VisionNocturne>} lueur={0.6} />
        <AbsoluteFill>
          <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
            {bandeau}
            <HUD f={fg} lieu="NUIT 1 · PLACARD" heure={heure(fg)} />
          </svg>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  const z = ease(f, R('je', 241) - 8, R('vois', 253) + 8, Easing.in(Easing.cubic));
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <Lattes ouvert={0.3 * z}>
          <rect width="1080" height="1920" fill="#06060c" />
          <g transform={`translate(540 ${900}) scale(${2.2 + 1.6 * z})`}>
            <VisageSourire rim="#8a9aff" corps="#050508" sourire={0.6 + 0.4 * z} id="plv" />
          </g>
        </Lattes>
        <HUD f={fg} lieu="NUIT 1 · PLACARD" heure={heure(fg)} />
        <Finition f={fg} id="plf3" grain={0.08} vignette={0.6} />
      </svg>
    </AbsoluteFill>
  );
});
// visage du bonhomme seul (gros plans dans le noir)
const BonhommeVisage = (p) => (
  <g>
    <defs>
      <clipPath id="bv-c">
        <rect x="0" y="0" width="600" height="560" />
      </clipPath>
    </defs>
    <g clipPath="url(#bv-c)">
      <BonhommeImport {...p} />
    </g>
  </g>
);

export const Screamer = ({f, fg, fige = false}) => {
  const s = fige ? 4.4 : interpolate(f, [0, 4, 20], [2.0, 4.2, 4.7], clamp);
  const sh = fige ? 0 : 1;
  return (
    <AbsoluteFill style={{background: '#050208'}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <defs>
          <radialGradient id="sc2-v" cx="540" cy="900" r="900" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2a2a5a" />
            <stop offset="1" stopColor="#000" />
          </radialGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#sc2-v)" />
        <g transform={`translate(${540 + tremble(fg, 40 * sh, 'sx')} ${880 + tremble(fg + 2, 40 * sh, 'sy')}) scale(${s}) rotate(${-10 + tremble(fg, 8 * sh, 'sr')})`}>
          <VisageSourire rim="#a8b4ff" corps="#050508" sourire={1} id="scr2" />
        </g>
        {!fige && <rect width="1080" height="1920" fill={Math.floor(fg / 2) % 2 ? '#fff' : '#ff2a3a'} opacity={interpolate(f, [0, 1, 4, 10], [0.9, 0.3, 0.5, 0], clamp)} />}
      </svg>
    </AbsoluteFill>
  );
};

// ===================== 11. Si tu as choisi le placard… tu ne survis pas. =====================
const Mort = scene('mort', ({f, fg, R}) => {
  const pulse = interpolate(f - R('survis', 58), [0, 3, 18], [0, 0.55, 0.2], clamp);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{filter: `grayscale(1) contrast(1.3) brightness(${0.55 + 0.05 * Math.sin(f)})`}}>
        <Screamer f={30} fg={fg} fige />
      </AbsoluteFill>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{position: 'absolute'}}>
        <defs>
          <filter id="mo2-n">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" seed={fg} />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <pattern id="mo2-l" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="2" fill="#000" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="1080" height="1920" fill="#c0101a" opacity={0.18 + pulse} style={{mixBlendMode: 'multiply'}} />
        <rect width="1080" height="1920" fill="#ff1a2a" opacity={pulse * 0.5} />
        <rect width="1080" height="1920" fill="url(#mo2-l)" />
        <g opacity={Math.floor(f / 15) % 2 ? 1 : 0.6}>
          <rect x="70" y="100" width="22" height="70" fill="#fff" />
          <rect x="110" y="100" width="22" height="70" fill="#fff" />
          <text x="160" y="160" fontFamily="'DejaVu Sans Mono', monospace" fontWeight="700" fontSize="66" fill="#fff">PAUSE</text>
        </g>
        {f > DUREES.mort - 12 && <rect width="1080" height="1920" filter="url(#mo2-n)" opacity="0.9" />}
      </svg>
    </AbsoluteFill>
  );
});

// ===================== 12. On rembobine =====================
const Rembobine = scene('rembobine', ({f, fg}) => {
  const D = DUREES.rembobine;
  const a = START.placard + DUREES.placard - 50;
  const b = START.choix + DUREES.choix - 40;
  const fin = D - 14;
  if (f < fin) {
    const u = Easing.inOut(Easing.cubic)(Math.min(1, f / fin));
    const src = Math.round(lerp(a, b, u));
    return <VHS f={fg} force={1} compteur={fmt(src / 30)}>{imageA(src)}</VHS>;
  }
  return <VHS f={fg} force={interpolate(f, [fin, D], [0.8, 0.15], clamp)} texte="▶ PLAY" compteur={fmt(b / 30)}>{imageA(b)}</VHS>;
});

// ===================== 13. La porte : fermée à clé. Par la fenêtre de la cuisine, le jardin, le portail. La fenêtre de Léna s'allume. =====================
const Porte = scene('porte', ({f, fg, i, t, k, R, d: dd}) => {
  const o = {tv: 0, lampe: 0};
  if (i === 0) {
    // tu fonces vers la porte d'entrée
    const u = ease(t, 0, dd, Easing.in(Easing.quad));
    const c = pov(fg, mixP([MOI_SA.x - 100, -150, MOI_SA.z], [(ENTREE.x0 + ENTREE.x1) / 2 + 60, -120, SA.z1 - 0.7], u), [(ENTREE.x0 + ENTREE.x1) / 2, 0, SA.z1], {k: 1.4, pas: 1.6, v: 0.55});
    const cam = makeCam(c);
    const d = salon(cam, f, fg, {...o, lumieres: [torche(cam)]});
    return <Vue fg={fg} cam={cam} d={d} lieu="NUIT 1 · SALON" flou={[6 * u, 6 * u]} dessus={<ChoixBoite f={f + 300} debut={0} x={540} y={600} texte="LA PORTE" emoji="1f3c3" couleur="#5ab0ff" etat={1} />} />;
  }
  if (i === 1) {
    // la poignée : fermée à clé (elle tremble)
    const sec = f > R('fermée', 43) - 4 ? Math.sin(f * 1.7) : 0;
    const cam = makeCam(vise([(ENTREE.x0 + ENTREE.x1) / 2 + 100, -50, SA.z1 - 0.45], [ENTREE.x1 - 55, 50, SA.z1]));
    const d = salon(cam, f, fg, {...o, lumieres: [torche(cam)]});
    return <Vue fg={fg} cam={cam} d={d} lieu="NUIT 1 · ENTRÉE" roll={sec * 1.5} dessus={<MainPov x={620 + sec * 12} y={1180} s={1.25} rot={-30 + sec * 6} nuit={0.7} />} />;
  }
  if (i === 2) {
    // la cuisine : tu cours vers la fenêtre
    const u = ease(t, 0, dd, Easing.in(Easing.quad));
    const c = pov(fg, [0, -150, lerp(0.1, 1.2, u)], [0, -220, 2.2], {k: 1.4, pas: 1.6, v: 0.55});
    const cam = makeCam(c);
    const d = cuisine(cam, f, fg, {});
    return <Vue fg={fg} cam={cam} d={d} lieu="NUIT 1 · CUISINE" flou={[0, 6 * u]} noir={ease(t, dd - 6, dd)} />;
  }
  if (i === 3) {
    // dehors : tu tombes dans l'herbe, sous la pluie
    const chute = ease(t, 0, 14, Easing.in(Easing.quad));
    const cam = makeCam(vise([1100, 150, 3.9], [650, -200, 5.6]));
    const d = jardin(cam, f, fg, {});
    const y = lerp(SOL - 420, SOL, chute);
    const moi = {z: 5.4, x: 700, el: <Moi cam={cam} ctx={d.ctx} x={700} z={5.4} y={y} rim="violet" id="p3" eyes={1.3} worry={1} epauleG={60} epauleD={-60} legG={chute < 1 ? 0.6 : 0} />};
    return <Vue fg={fg} cam={cam} d={d} items={[moi]} lieu="NUIT 1 · JARDIN" pluie={1} zoom={1.02 + 0.04 * k} roll={tremble(fg, t > 12 && t < 18 ? 8 : 0, 'pc')} />;
  }
  if (i === 4) {
    // vue subjective : tu cours vers le portail
    const u = ease(t, 0, dd);
    const c = pov(fg, [100, -150, lerp(4.6, 1.4, u)], [0, -50, 0], {k: 1.4, pas: 1.8, v: 0.55});
    const cam = makeCam(c);
    const d = jardin(cam, f, fg, {});
    return <Vue fg={fg} cam={cam} d={d} lieu="NUIT 1 · JARDIN" pluie={1.2} flou={[0, 4]} />;
  }
  // au portail, tu te retournes : la fenêtre de la chambre de Léna s'allume
  const on = ease(f, R('sallume', 304) - 4, R('sallume', 304) + 4);
  const cam = makeCam(vise([-250, -120, 0.2], [600, -900, 6.0]));
  const d = jardin(cam, f, fg, {fenetreLena: on});
  const moi = {z: 0.9, x: 120, el: <Moi cam={cam} ctx={d.ctx} x={120} z={0.9} rim="violet" id="p5" dos epauleG={10} epauleD={-10} />};
  return <Vue fg={fg} cam={cam} d={d} items={[moi]} lieu="NUIT 1 · JARDIN" pluie={1} zoom={1.0 + 0.05 * k} />;
});

// ===================== 14. Léna à la fenêtre. Elle te fait coucou. Derrière elle, une silhouette immense. =====================
const Fenetre = scene('fenetre', ({f, fg, i, t, k, R}) => {
  const cam = makeCam(i === 0 ? vise([500 - 150 * k, -650, lerp(2.4, 3.4, k)], [(FEN_LENA.x0 + FEN_LENA.x1) / 2, -1130, 6.0]) : vise([760 - 60 * k, -1000, lerp(4.2, 4.7, k)], [(FEN_LENA.x0 + FEN_LENA.x1) / 2, -1130, 6.0]));
  const d = jardin(cam, f, fg, {fenetreLena: 1});
  const fp = cam.poly([[FEN_LENA.x0, FEN_LENA.y0, FA.z - 0.005], [FEN_LENA.x1, FEN_LENA.y0, FA.z - 0.005], [FEN_LENA.x1, FEN_LENA.y1, FA.z - 0.005], [FEN_LENA.x0, FEN_LENA.y1, FA.z - 0.005]]);
  const cx = (FEN_LENA.x0 + FEN_LENA.x1) / 2;
  const coucou = Math.sin(f / 3.2);
  const monte = i === 1 ? ease(f, R('silhouette', 105) - 12, R('immense', 116) + 6) : 0;
  const pose = ease(f, R('pose', 127), R('épaule', 153));
  const dedans = (
    <g>
      <defs>
        <clipPath id="fen-c">
          <polygon points={fp || '0,0'} />
        </clipPath>
      </defs>
      <g clipPath="url(#fen-c)">
        {(() => {
          const ctxIn = {lums: [{p: [cx, -1250, 6.3], c: [1, 0.34, 0.14], i: 1.2, r: 600}], amb: [0.05, 0.02, 0.02]};
          return (
            <g>
              {monte > 0 && <Creature cam={cam} x={cx + 60} z={6.35} y={-220 + 900 * (1 - monte)} pose={ECARTE} echelle={0.95} rim="#ffb070" sourire={0.4 + 0.6 * pose} id="fc" />}
              <Lena cam={cam} ctx={ctxIn} x={cx - 20} z={6.12} y={-850} rim="orange" id="fl" epauleD={-150} coudeD={-30 + 25 * coucou} smile={0.6} eyes={1.1} />
              {pose > 0 && (() => {
                const [sx, sy] = cam.proj(cx + 160, -1150, 6.1);
                const [ex, ey] = cam.proj(cx + 40, -1010, 6.1);
                const s = cam.scale(6.1, cx, -1100);
                return <LongueMain x={sx} y={sy} l={Math.hypot(ex - sx, ey - sy) * pose} a={deg(Math.atan2(ey - sy, ex - sx))} s={0.5 * s * 3} c="#0a0a10" rim="#ffb070" />;
              })()}
            </g>
          );
        })()}
      </g>
    </g>
  );
  return <Vue fg={fg} cam={cam} d={d} items={[{z: FA.z - 0.01, x: cx, y: -1150, el: dedans}]} lieu="NUIT 1 · JARDIN" pluie={1} zoom={1.0 + (i ? 0.15 : 0.08) * k} />;
});

// ===================== 15. Tu t'enfuis ? Ou tu retournes chercher Léna ? =====================
const Dilemme = scene('dilemme', ({f, fg, k, R}) => {
  const cam = makeCam(vise([-100 + 80 * k, -250, -0.1 + 0.4 * k], [560, -1350, 6.0]));
  const d = jardin(cam, f, fg, {fenetreLena: 1});
  const cx = (FEN_LENA.x0 + FEN_LENA.x1) / 2;
  const fp = cam.poly([[FEN_LENA.x0, FEN_LENA.y0, FA.z - 0.005], [FEN_LENA.x1, FEN_LENA.y0, FA.z - 0.005], [FEN_LENA.x1, FEN_LENA.y1, FA.z - 0.005], [FEN_LENA.x0, FEN_LENA.y1, FA.z - 0.005]]);
  const dedans = (
    <g>
      <defs>
        <clipPath id="fen-d">
          <polygon points={fp || '0,0'} />
        </clipPath>
      </defs>
      <g clipPath="url(#fen-d)">
        <Creature cam={cam} x={cx + 60} z={6.35} y={-220} pose={ECARTE} echelle={0.95} rim="#ffb070" sourire={1} id="dc" />
        <Lena cam={cam} ctx={{lums: [{p: [cx, -1250, 6.3], c: [1, 0.34, 0.14], i: 1.2, r: 600}], amb: [0.05, 0.02, 0.02]}} x={cx - 20} z={6.12} y={-850} rim="orange" id="dl" smile={0.2} />
      </g>
    </g>
  );
  const moi = {z: 1.3, x: 200, el: <Moi cam={cam} ctx={d.ctx} x={200} z={1.3} rim="violet" id="dm" dos />};
  const dis = R('dis-le', 78);
  return (
    <Vue fg={fg} cam={cam} d={d} items={[{z: FA.z - 0.01, x: cx, y: -1150, el: dedans}, moi]} lieu="NUIT 1 · JARDIN" pluie={1} zoom={1.02 + 0.04 * k}
      dessus={
        <g>
          <ChoixBoite f={f} debut={R('tenfuis', 10) - 4} x={540} y={560} texte="T'ENFUIR" emoji="1f3c3" couleur="#5ab0ff" />
          <ChoixBoite f={f} debut={R('chercher', 53) - 4} x={540} y={760} texte="CHERCHER LÉNA" emoji="1f526" couleur="#ffb03a" />
          <BulleCommentaire f={f} t0={dis - 2} y={1700} />
        </g>
      } />
  );
});

const COMPOSANTS = {alerte: Alerte, dodo: Dodo, chuchote: Chuchote, escalier: Escalier, voix: Voix, ecran: Ecran, message: Message, coupure: Coupure, choix: Choix, placard: Placard, mort: Mort, rembobine: Rembobine, porte: Porte, fenetre: Fenetre, dilemme: Dilemme};
export const LeBabyphone2 = () => (
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
