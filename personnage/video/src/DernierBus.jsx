import {AbsoluteFill, Easing, interpolate, random, Series, spring, staticFile, useCurrentFrame} from 'remotion';
import {Creature, Poussette, ruelle, vague} from './Decors';
import {clamp, Finition, flick, makeCam, marche, orbite, Perso, YeuxRouges} from './moteur';
import {bus, LAMPES, rue, SOL} from './Rue';
import timeline from './timeline.json';

// Les scènes et leur durée viennent de timeline.json (généré par voix/generer.py à partir de la voix off).
export const SCENES = timeline.scenes.map((s) => [s.nom, s.frames]);
export const DUREE_BUS = SCENES.reduce((t, [, d]) => t + d, 0);

const CHAUD = [1, 0.82, 0.68];
const ease = {...clamp, easing: Easing.inOut(Easing.sin)};

// Lumière reçue à une profondeur donnée, d'après les lampadaires proches
const lumiere = (z, lampe, ambiance = 0.45) => {
  let v = 0;
  LAMPES.forEach((l) => {
    const d = Math.abs(l.z - z);
    if (d < 1.6) v = Math.max(v, lampe(l) * (1 - d / 1.6));
  });
  return ambiance + (1 - ambiance) * Math.min(1, v * 1.3);
};

// Assemble un plan : décor + éléments triés en profondeur + voiles par-dessus
const Plan = ({f, decor, items = [], noir = 0, dessus = null, flou = 0, roll = 0}) => {
  const tous = [...decor.items, ...items].filter(Boolean).sort((a, b) => b.z - a.z);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <defs>
          <filter id="plan-flou" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation={flou} />
          </filter>
        </defs>
        <g filter={flou ? 'url(#plan-flou)' : undefined} transform={`rotate(${roll} 540 960) translate(540 960) scale(${1 + Math.abs(roll) * 0.012}) translate(-540 -960)`}>
          {decor.fond}
          {decor.brume}
          {tous.map((o, i) => (
            <g key={i}>{o.el}</g>
          ))}
        </g>
        <rect x="0" y="0" width="1080" height="1920" fill="#000" opacity={noir} />
        {dessus}
        <Finition f={f} />
      </svg>
    </AbsoluteFill>
  );
};

// ---------- 1. Le bus part sans toi ----------
const BusPart = () => {
  const f = useCurrentFrame();
  const cam = makeCam({
    x: interpolate(f, [0, 150], [280, 200], ease) + Math.sin(f / 30) * 15,
    y: interpolate(f, [0, 110], [300, -160], ease),
    z: interpolate(f, [0, 150], [0.75, 0.3], ease),
    pitch: interpolate(f, [0, 110], [-12, 7], ease),
    yaw: interpolate(f, [0, 30, 150], [10, 4, -16], ease),
  });
  const lampe = (l) => (Math.abs(l.z - 3.7) < 0.1 && l.cote === 'D' ? flick(f, 'l1', 0, 150, 0.5) : 1);
  const decor = rue(cam, f, {lampe});
  const zBus = 3.4 + interpolate(f, [12, 150], [0, 17], {...clamp, easing: Easing.in(Easing.quad)});
  const z = interpolate(f, [0, 75], [1.45, 2.4], {...clamp, easing: Easing.out(Easing.quad)});
  const amp = interpolate(f, [0, 55, 80], [1, 1, 0], clamp);
  const m = marche(f, 0.55, amp);
  const tend = interpolate(f, [4, 16, 60, 85], [0, 1, 1, 0], clamp);
  const fume = [0, 1, 2, 3, 4].map((k) => {
    const t = f - 15 - k * 9;
    if (t < 0 || t > 50) return null;
    const p = cam.proj(-300 + t * 4, 360 - t * 6, zBus - 0.1);
    const s = cam.scale(zBus);
    return <circle key={k} cx={p[0]} cy={p[1]} r={(60 + t * 6) * s} fill="#9aa0a8" opacity={0.35 * (1 - t / 50)} />;
  });
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.04}
      roll={interpolate(f, [0, 110], [4, 0], ease)}
      items={[
        bus(cam, f, {zp: zBus, sens: 'arriere', numero: '42', porte: interpolate(f, [0, 12], [0.8, 0], clamp)}),
        {z: zBus - 0.05, el: <g>{fume}</g>},
        {
          z,
          el: (
            <Perso
              cam={cam}
              id="p1"
              x={60}
              z={z}
              dos
              lum={lumiere(z, lampe)}
              teinte={CHAUD}
              lift={m.bob}
              legG={m.legG}
              legD={m.legD}
              epauleG={130 * tend + m.bras}
              coudeG={-20 * tend}
              epauleD={-m.bras + (1 - tend) * 4 * Math.sin(f / 6) * (f > 85 ? 1 : 0)}
              breath={f > 80 ? Math.sin(f / 4) * 6 : 0}
            />
          ),
        },
      ]}
    />
  );
};

// ---------- 2. À pied (plan drone en plongée, de dos) ----------
const APied = () => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, 135], [12.3, 13.5]);
  const cam = makeCam({
    x: 120 + Math.sin(f / 50) * 60,
    y: interpolate(f, [0, 180], [-1900, -1500], ease),
    z: z - interpolate(f, [0, 180], [2.9, 2.2], ease),
    pitch: interpolate(f, [0, 180], [36, 30], ease),
    yaw: interpolate(f, [0, 180], [-6, 4], ease),
  });
  const fenetre = (cle, d) => (d && f < 15 + random(`off${cle}`) * 150 ? 1 : 0);
  const decor = rue(cam, f, {fenetre});
  const m = marche(f, 0.3, 0.8);
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.07}
      roll={Math.sin(f / 45) * 2}
      items={[
        {
          z,
          el: <Perso cam={cam} id="p4" x={150} z={z} dos lum={lumiere(z, () => 1)} teinte={CHAUD} lift={m.bob} legG={m.legG} legD={m.legD} epauleG={m.bras} epauleD={m.bras} breath={Math.sin(f / 8) * 3} />,
        },
      ]}
    />
  );
};

// ---------- 3. La ruelle ----------
const Ruelle = () => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, 150], [0.55, 2.0]);
  const cam = makeCam({
    x: 60 + Math.sin(f / 30) * 20,
    y: interpolate(f, [0, 150], [260, -110], ease),
    z: interpolate(f, [0, 150], [-0.45, 0.75], ease),
    pitch: interpolate(f, [0, 150], [-10, 3], ease),
    yaw: interpolate(f, [0, 150], [5, -2], ease),
  });
  const ampoule = (i) => (i === 0 ? flick(f, 'ru0', 40, 150, 0.15) : 1);
  const decor = ruelle(cam, f, {ampoule});
  const m = marche(f, 0.3, 0.8);
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.05}
      roll={interpolate(f, [0, 150], [-3, 2], ease)}
      items={[{z, el: <Perso cam={cam} id="r3" x={0} z={z} dos lum={0.4 + 0.6 * ampoule(0)} teinte={[0.95, 0.95, 0.75]} lift={m.bob} legG={m.legG} legD={m.legD} epauleG={m.bras} epauleD={m.bras} breath={Math.sin(f / 8) * 3} />}]}
    />
  );
};

// ---------- 4. La poussette ----------
const PoussetteScene = () => {
  const f = useCurrentFrame();
  const contre = f >= 95; // contrechamp : la caméra est à la place de la poussette
  const zP = interpolate(f, [10, 90], [10, 3.75], {...clamp, easing: Easing.out(Easing.quad)});
  const z = interpolate(f, [0, 20], [2.75, 3.0], clamp);
  const cam = makeCam(
    contre
      ? {x: 120, y: 290, z: interpolate(f, [95, 180], [3.78, 3.6], ease), yaw: 180, pitch: -13}
      : {x: 150 + Math.sin(f / 25) * 10, y: -210, z: interpolate(f, [0, 95], [1.85, 2.15], ease), pitch: 2, yaw: 2}
  );
  const ampoule = (i) => (i === 0 ? flick(f, 'ru1', 0, 180, 0.3) : 1);
  const decor = ruelle(cam, f, {ampoule});
  const peur = interpolate(f, [60, 80], [0, 1], clamp);
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.05}
      roll={contre ? interpolate(f, [95, 180], [4, 9], ease) : 2}
      items={[
        !contre && {z: zP, el: billboardPoussette(cam, 120, zP, f, f < 90 ? 1 : 0)},
        {
          z,
          el: (
            <Perso cam={cam} id="r4" x={0} z={z} dos={!contre} lum={0.5 + 0.5 * ampoule(0)} teinte={[0.95, 0.95, 0.75]} breath={Math.sin(f / 5) * 4} epauleG={-6 * peur} epauleD={6 * peur} coudeG={-20 * peur} coudeD={20 * peur} worry={contre ? 1 : 0.5} eyes={contre ? 1.3 : 1} pupilY={contre ? 3 : 0} pupilX={contre ? 2 : 0} scream={contre ? interpolate(f, [120, 135], [0, 0.35], clamp) : 0} sweat={contre ? 1 : 0} shiver={contre ? (random(`r4${f}`) - 0.5) * 6 : 0} />
          ),
        },
      ]}
    />
  );
};
const billboardPoussette = (cam, x, z, f, roule) => {
  if (!cam.visible(z, x, 0)) return null;
  const [px, py] = cam.proj(x, SOL, z);
  return (
    <g transform={`translate(${px} ${py}) scale(${cam.scale(z, x, 0)})`}>
      <ellipse rx="220" ry="30" fill="#000" opacity="0.5" />
      <Poussette f={f} roule={roule} />
    </g>
  );
};

// ---------- 5. Les yeux entre les poubelles ----------
const Poubelles = () => {
  const f = useCurrentFrame();
  const vite = interpolate(f, [95, 115], [0, 1], clamp);
  const z = 5.0 + f * 0.0075 + Math.max(0, f - 95) * 0.006;
  const cam = makeCam({x: -40 + Math.sin(f / 35) * 25, y: -130, z: z + 1.15, yaw: 186, pitch: 1});
  const ampoule = (i) => (i === 1 ? flick(f, 'ru2', 60, 165, 0.25) : 1);
  const decor = ruelle(cam, f, {ampoule});
  const m = marche(f, 0.3 + 0.18 * vite, 0.8 + 0.2 * vite);
  const regard = interpolate(f, [68, 76, 92, 100], [0, 1, 1, 0], clamp);
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.06}
      roll={interpolate(f, [0, 165], [3, -4], ease)}
      items={[
        {
          z,
          el: (
            <Perso cam={cam} id="r5" x={110} z={z} lum={0.5 + 0.5 * ampoule(1)} teinte={[0.95, 0.95, 0.75]} lift={m.bob} legG={m.legG} legD={m.legD} epauleG={m.bras} epauleD={m.bras} worry={0.4 + 0.6 * regard + 0.5 * vite} pupilX={6 * regard} tilt={6 * regard} eyes={1 + 0.25 * regard} sweat={vite} breath={Math.sin(f / 5) * 3} />
          ),
        },
      ]}
      dessus={f >= 45 ? <YeuxRouges cam={cam} id="yr5" x={-300} y={300} z={4.65} taille={0.8} ouvert={(f - 45) % 55 < 3 ? 0.1 : interpolate(f, [45, 52], [0.1, 1], clamp)} /> : null}
    />
  );
};

// ---------- 6. Le vieil arrêt ----------
const Arret = () => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, 130], [0.8, 2.35], clamp);
  const cam = makeCam({
    x: interpolate(f, [0, 150], [400, 270], ease),
    y: interpolate(f, [0, 150], [-1150, -160], ease),
    z: interpolate(f, [0, 150], [-1.4, 0.95], ease),
    pitch: interpolate(f, [0, 150], [26, 2], ease),
    yaw: interpolate(f, [0, 150], [-5, 4], ease),
  });
  const neon = flick(f, 'ne6', 0, 150, 0.1);
  const decor = vague(cam, f, {neon});
  const m = marche(f, 0.3, interpolate(f, [0, 115, 130], [0.8, 0.8, 0], clamp));
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.04}
      roll={interpolate(f, [0, 150], [-4, 1], ease)}
      items={[{z, el: <Perso cam={cam} id="v6" x={220} z={z} dos lum={0.45 + 0.4 * neon} teinte={[0.8, 0.95, 0.88]} lift={m.bob} legG={m.legG} legD={m.legD} epauleG={m.bras} epauleD={m.bras} breath={Math.sin(f / 7) * 3} />}]}
    />
  );
};

// ---------- 7. Le post-it ----------
const PostIt = () => {
  const f = useCurrentFrame();
  const cam = makeCam({
    x: interpolate(f, [0, 120], [260, 330], ease),
    y: interpolate(f, [0, 120], [-190, -40], ease),
    z: interpolate(f, [0, 120], [1.85, 3.78], ease),
    yaw: interpolate(f, [0, 120], [4, 0], ease),
  });
  const neon = flick(f, 'ne7', 0, 150, 0.15);
  const decor = vague(cam, f, {neon});
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.04}
      roll={interpolate(f, [0, 150], [0, -5], ease)}
      items={[{z: 2.75, el: <Perso cam={cam} id="v7" x={170} z={2.75} dos lum={0.45 + 0.4 * neon} teinte={[0.8, 0.95, 0.88]} breath={Math.sin(f / 7) * 3} />}]}
    />
  );
};

// ---------- 8. Le vieux bus arrive ----------
const VIEUX = {sens: 'avant', numero: '- -', interieur: '#5a1a12', vieux: true};
const BusVieux = () => {
  const f = useCurrentFrame();
  const zBus = interpolate(f, [15, 140], [26, 2.0], {...clamp, easing: Easing.out(Easing.cubic)});
  const approche = interpolate(zBus, [2, 26], [1, 0], clamp);
  const cam = makeCam({x: 430, y: 240, z: interpolate(f, [0, 180], [0.25, 0.45]), pitch: -8, yaw: interpolate(f, [30, 140], [-3, -17], ease)});
  const neon = flick(f, 'ne8', 0, 180, 0.2);
  const decor = vague(cam, f, {neon});
  const flash = interpolate(f, [95, 115, 135], [0, 0.35, 0], clamp);
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.06}
      roll={interpolate(f, [0, 180], [2, -3], ease)}
      items={[
        bus(cam, f, {...VIEUX, zp: zBus, phares: 1, led: flick(f, 'led8', 0, 180, 0.1)}),
        {z: 2.3, el: <Perso cam={cam} id="v8" x={230} z={2.3} lum={0.4 + 0.5 * approche} teinte={[0.95, 0.92, 0.85]} breath={Math.sin(f / 6) * 3} worry={0.6} pupilX={f > 40 ? -5 : 0} tilt={f > 40 ? -4 : 0} eyes={1 + 0.15 * approche} />},
      ]}
      dessus={<rect width="1080" height="1920" fill="#fff6dc" opacity={flash} />}
    />
  );
};

// ---------- 9. Les portes s'ouvrent ----------
const Portes = () => {
  const f = useCurrentFrame();
  const cam = makeCam(orbite(230, 2.3, 0.95, interpolate(f, [0, 165], [-26, 18], ease), -150, {pitch: 1}));
  const neon = flick(f, 'ne9', 0, 165, 0.2);
  const decor = vague(cam, f, {neon});
  const porte = interpolate(f, [8, 40], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
  const zone = <polygon points={cam.poly([...Array(16)].map((_, i) => [-20 + Math.cos((i / 16) * 6.283) * 500, SOL - 1, 2.45 + Math.sin((i / 16) * 6.283) * 0.5]))} fill="#ff2a12" opacity={0.25 * porte * (0.7 + 0.3 * neon)} />;
  const regard = f < 45 ? 0 : f < 90 ? -1 : f < 135 ? 1 : 0;
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.06}
      roll={interpolate(f, [0, 165], [3, -3], ease)}
      items={[
        bus(cam, f, {...VIEUX, zp: 2.0, phares: 0.6, porte, led: flick(f, 'led9', 0, 165, 0.1)}),
        {z: 2.5, el: zone},
        {z: 2.3, el: <Perso cam={cam} id="v9" x={230} z={2.3} lum={0.75} teinte={[1, 0.85, 0.8]} breath={Math.sin(f / 6) * 4} worry={0.8} pupilX={regard * 5} pupilY={regard > 0 ? -2 : 0} tilt={regard * 5} />},
      ]}
    />
  );
};

// ---------- 10. Un souffle dans la nuque ----------
const Souffle = () => {
  const f = useCurrentFrame();
  const cam = makeCam({x: 230, y: -175, z: interpolate(f, [0, 135], [1.8, 1.92], ease)});
  const decor = vague(cam, f, {neon: flick(f, 'ne10', 0, 135, 0.3)});
  const peur = interpolate(f, [25, 40], [0, 1], clamp);
  const bouffees = [22, 68, 108].map((t, k) => {
    const r = f - t;
    if (r < 0 || r > 30) return null;
    return [-1, 1].map((c) => {
      const p = cam.proj(230 + c * (90 + r * 6), -70 - r * 2, 2.33);
      const s = cam.scale(2.33, 230, -70);
      return <ellipse key={`${k}${c}`} cx={p[0]} cy={p[1]} rx={(40 + r * 5) * s} ry={(22 + r * 3) * s} fill="#e8eef0" opacity={0.3 * (1 - r / 30)} />;
    });
  });
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.08}
      roll={interpolate(f, [0, 135], [-4, -11], ease)}
      items={[
        bus(cam, f, {...VIEUX, zp: 2.0, phares: 0.6, porte: 1}),
        {z: 2.33, el: <g>{bouffees}</g>},
        {z: 2.3, el: <Perso cam={cam} id="v10" x={230} z={2.3} lum={0.75} teinte={[1, 0.85, 0.8]} breath={Math.sin(f / 4) * 3} worry={0.6 + 0.4 * peur} eyes={1 + 0.35 * peur} pupilX={peur * 4} pupilY={-2 * peur} sweat={peur} shiver={peur ? (random(`s10${f}`) - 0.5) * 10 : 0} />},
      ]}
    />
  );
};

// ---------- 11. La créature ----------
const CreatureScene = () => {
  const f = useCurrentFrame();
  const sh = f > 55 && f < 95 ? (random(`c11${f}`) - 0.5) * 30 : 0;
  const cam = makeCam({
    x: 230 + sh,
    y: interpolate(f, [0, 165], [250, 330], ease) + sh * 0.4,
    z: interpolate(f, [0, 165], [1.35, 0.6], ease),
    pitch: interpolate(f, [0, 165], [-12, -30], ease),
  });
  const decor = vague(cam, f, {neon: f < 12 ? 1 : f < 18 ? 0.1 : flick(f, 'ne11', 18, 165, 0.2)});
  const monte = interpolate(f, [12, 60], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const peur = interpolate(f, [55, 65], [0, 1], clamp);
  const flash = interpolate(f, [12, 14, 22], [0, 0.6, 0], clamp);
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.04}
      roll={interpolate(f, [0, 165], [0, -6], ease)}
      items={[
        {
          z: 3.2,
          el: (
            <g transform={`translate(${cam.proj(230, SOL, 3.2).join(' ')}) scale(${cam.scale(3.2, 230, -1200)})`}>
              <Creature f={f} monte={monte} gueule={interpolate(f, [70, 120], [0.3, 1], ease)} />
            </g>
          ),
        },
        {z: 2.3, el: <Perso cam={cam} id="v11" x={230} z={2.3} lum={0.8} teinte={[0.9, 0.9, 1]} breath={Math.sin(f / 4) * 3} worry={1} eyes={1 + 0.35 * peur} scream={peur} epauleG={35 * peur} coudeG={130 * peur} epauleD={-35 * peur} coudeD={-130 * peur} sweat={1} shiver={peur ? (random(`s11${f}`) - 0.5) * 8 : 0} />},
      ]}
      dessus={<rect width="1080" height="1920" fill="#e9f7ff" opacity={flash} />}
    />
  );
};

// ---------- 12. Le dilemme ----------
const Choix = ({f, debut, x, y, texte, emoji, couleur}) => {
  const p = spring({frame: f - debut, fps: 30, config: {damping: 9}});
  if (f < debut) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${p}) rotate(${(1 - p) * -12})`}>
      <rect x="-290" y="-90" width="580" height="180" rx="28" fill="#0b0b0e" opacity="0.85" stroke={couleur} strokeWidth="6" />
      <image href={staticFile(`emoji/${emoji}.svg`)} x="-265" y="-55" width="110" height="110" />
      <text x="-130" y="20" textAnchor="start" fontFamily="'DejaVu Sans', Arial, sans-serif" fontWeight="900" fontSize="54" fill="#fff">
        {texte}
      </text>
    </g>
  );
};
const Dilemme = () => {
  const f = useCurrentFrame();
  const cam = makeCam({x: 120, y: -120, z: interpolate(f, [0, 195], [0.05, 0.45], ease), yaw: 1, pitch: -7});
  const decor = vague(cam, f, {neon: flick(f, 'ne12', 0, 195, 0.25)});
  const regard = f < 80 ? -1 : f < 130 ? 1 : 0;
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.05}
      roll={interpolate(f, [0, 195], [-3, 0], ease)}
      items={[
        bus(cam, f, {...VIEUX, zp: 2.0, phares: 0.6, porte: 1}),
        {z: 2.5, el: <polygon points={cam.poly([...Array(16)].map((_, i) => [-20 + Math.cos((i / 16) * 6.283) * 500, SOL - 1, 2.45 + Math.sin((i / 16) * 6.283) * 0.5]))} fill="#ff2a12" opacity="0.25" />},
        {
          z: 3.6,
          el: (
            <g transform={`translate(${cam.proj(620, SOL, 3.6).join(' ')}) scale(${cam.scale(3.6, 620, -1200)})`}>
              <Creature f={f} monte={1} gueule={0.6} />
            </g>
          ),
        },
        {z: 2.3, el: <Perso cam={cam} id="v12" x={230} z={2.3} lum={0.8} teinte={[1, 0.88, 0.85]} breath={Math.sin(f / 5) * 4} worry={1} eyes={1.2} pupilX={regard * 5} tilt={regard * 4} sweat={1} />},
      ]}
      dessus={
        <g>
          <Choix f={f} debut={14} x={320} y={260} texte="TU MONTES ?" emoji="1f68c" couleur="#ff3b2a" />
          <Choix f={f} debut={82} x={760} y={860} texte="TU RESTES ?" emoji="1f479" couleur="#8fd3ff" />
          {f >= 125 && (
            <g transform={`translate(540 1680) scale(${spring({frame: f - 125, fps: 30, config: {damping: 10}})})`}>
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

const COMPOSANTS = {
  busPart: BusPart,
  aPied: APied,
  ruelle: Ruelle,
  poussette: PoussetteScene,
  poubelles: Poubelles,
  arret: Arret,
  postit: PostIt,
  busVieux: BusVieux,
  portes: Portes,
  souffle: Souffle,
  creature: CreatureScene,
  dilemme: Dilemme,
};

export const DernierBus = () => (
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
