import {AbsoluteFill, Easing, interpolate, random, Series, useCurrentFrame} from 'remotion';
import {clamp, Finition, flick, makeCam, marche, orbite, Perso, YeuxRouges} from './moteur';
import {bus, LAMPES, rue, SOL} from './Rue';

// Durée de chaque scène (en images, 30 i/s). À recaler sur la voix off.
export const SCENES = [
  ['busPart', 150], // Imagine. Tu rates le dernier bus pour rentrer chez toi.
  ['horaires', 150], // Le prochain ? Dans six heures.
  ['telephone', 120], // Ton téléphone ? Deux pour cent… Plus rien.
  ['rueVide', 180], // Alors tu marches. La rue est vide. Trop vide.
  ['balancoire', 180], // Tu passes devant le parc. La balançoire bouge. Toute seule. Y'a pas de vent.
  ['pas', 180], // Puis t'entends des pas derrière toi. Tu t'arrêtes… ils s'arrêtent aussi.
  ['souterrain', 210], // Tu coupes par le passage souterrain. Sur le mur, quelqu'un a écrit…
  ['lampadaires', 180], // Tu te retournes. Personne. Mais les lampadaires s'éteignent. Un par un. Vers toi.
  ['course', 120], // Tu cours. Tu cours. Tu cours !
  ['busArrive', 180], // Et là… un bus arrive. Ligne zéro. Elle existe sur aucun plan.
  ['chauffeur', 150], // Les portes s'ouvrent. Le chauffeur te sourit. Tu montes ?
  ['fin', 120], // Abonne-toi pour savoir s'il est rentré.
];
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

// ---------- 2. L'abribus et les horaires ----------
const Horaires = () => {
  const f = useCurrentFrame();
  const cam = makeCam({
    x: interpolate(f, [0, 45, 135], [170, 170, 360], ease),
    y: interpolate(f, [0, 45, 135], [-40, -40, -115], ease),
    z: interpolate(f, [0, 45, 135], [2.15, 2.2, 3.62], ease),
    yaw: interpolate(f, [0, 45, 135], [12, 9, 0], ease),
    pitch: interpolate(f, [0, 45, 135], [4, 4, -3], ease),
  });
  const lampe = (l) => (Math.abs(l.z - 3.7) < 0.1 && l.cote === 'D' ? flick(f, 'l2', 0, 150, 0.4) : 1);
  const decor = rue(cam, f, {lampe, panneau: flick(f, 'pan', 100, 150, 0.6)});
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.02}
      roll={interpolate(f, [0, 135], [0, -4], ease)}
      items={[
        {
          z: 3.2,
          el: (
            <Perso cam={cam} id="p2" x={230} z={3.2} lum={lumiere(3.2, lampe) * 0.9} teinte={[0.85, 0.9, 1]} worry={0.5} breath={Math.sin(f / 9) * 3} pupilX={4} pupilY={-2} tilt={4} eyes={f === 70 || f === 71 ? 0.1 : 1} />
          ),
        },
      ]}
    />
  );
};

// ---------- 3. Le téléphone ----------
const Telephone = () => {
  const f = useCurrentFrame();
  const cam = makeCam({x: 230 + f * 0.8, y: -200, z: 2.2, yaw: Math.sin(f / 30) * 4});
  const decor = rue(cam, f, {});
  const allume = f < 72;
  const glitch = f >= 66 && f < 72;
  const vide = f >= 80 && f < 96 && Math.floor(f / 4) % 2 === 0;
  const clign = Math.floor(f / 10) % 2 === 0 ? 1 : 0.35;
  const fl = Math.sin(f / 20) * 6;
  return (
    <Plan
      f={f}
      decor={decor}
      flou={14}
      noir={0.37}
      dessus={
        <g transform={`translate(540 ${1000 + fl}) rotate(${-3 + Math.sin(f / 30) * 1.5}) scale(${interpolate(f, [0, 120], [0.92, 1.08])})`}>
          {/* mains */}
          <ellipse cx="-300" cy="200" rx="110" ry="190" fill="#c99a7c" />
          <ellipse cx="300" cy="200" rx="110" ry="190" fill="#c99a7c" />
          {/* téléphone */}
          <rect x="-270" y="-520" width="540" height="1040" rx="70" fill="#0d0d10" />
          <rect x="-245" y="-495" width="490" height="990" rx="52" fill={allume ? '#0c1428' : '#000'} />
          {allume && (
            <g textAnchor="middle" fontFamily="'DejaVu Sans', Arial, sans-serif">
              <text y="-330" fontSize="120" fontWeight="300" fill="#e8ecff">00:52</text>
              <text y="-265" fontSize="30" fill="#aab3d6">dimanche 26 octobre</text>
              <rect x="-110" y="-90" width="220" height="110" rx="18" fill="none" stroke="#ff3b3b" strokeWidth="10" opacity={clign} />
              <rect x="110" y="-55" width="18" height="40" rx="6" fill="#ff3b3b" opacity={clign} />
              <rect x="-96" y="-76" width="12" height="82" rx="4" fill="#ff3b3b" opacity={clign} />
              <text y="140" fontSize="110" fontWeight="900" fill="#ff3b3b">2 %</text>
              <text y="210" fontSize="30" fill="#aab3d6">Batterie faible</text>
            </g>
          )}
          {glitch &&
            [...Array(8)].map((_, k) => (
              <rect key={k} x={-245 + (random(`g${f}${k}`) - 0.5) * 80} y={-495 + random(`gy${f}${k}`) * 990} width="490" height={20 + random(`gh${f}${k}`) * 60} fill={k % 2 ? '#ff3b3b' : '#e8ecff'} opacity="0.5" />
            ))}
          {vide && (
            <g>
              <rect x="-110" y="-55" width="220" height="110" rx="18" fill="none" stroke="#ff3b3b" strokeWidth="10" />
              <rect x="110" y="-20" width="18" height="40" rx="6" fill="#ff3b3b" />
            </g>
          )}
          {/* reflet */}
          <path d="M-245,-200 L-60,-495 L40,-495 L-245,-40 Z" fill="#fff" opacity="0.04" />
          {/* pouces */}
          <ellipse cx="-230" cy="120" rx="48" ry="95" fill="#d9a888" transform="rotate(-20 -230 120)" />
          <ellipse cx="230" cy="120" rx="48" ry="95" fill="#d9a888" transform="rotate(20 230 120)" />
          {/* lueur de l'écran */}
          {allume && <rect x="-600" y="-900" width="1200" height="1800" fill="#5577ff" opacity="0.05" />}
        </g>
      }
    />
  );
};

// ---------- 4. La rue vide (plan drone en plongée, de dos) ----------
const RueVide = () => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, 180], [12.3, 13.9]);
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

// ---------- 5. La balançoire ----------
const Balancoire = () => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, 70], [7.6, 6.8], {...clamp, easing: Easing.out(Easing.quad)});
  const cam = makeCam({
    x: interpolate(f, [0, 85, 170], [150, 150, 270], ease) + Math.sin(f / 25) * 8,
    y: interpolate(f, [0, 85, 170], [-170, -170, -110], ease),
    z: interpolate(f, [0, 70, 85, 170], [7.6 - 0.72, 6.8 - 0.72, 6.8 - 0.72, 6.35], ease),
    yaw: interpolate(f, [90, 165], [0, 24], ease),
    pitch: interpolate(f, [90, 165], [0, -4], ease),
  });
  const a1 = 32 * Math.sin(f / 13);
  const decor = rue(cam, f, {balancoire: [a1, 1.5 * Math.sin(f / 25)]});
  const m = marche(f, 0.3, interpolate(f, [0, 55, 70], [0.8, 0.8, 0], clamp));
  const regarde = interpolate(f, [80, 95], [0, 1], clamp);
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.07}
      roll={interpolate(f, [90, 165], [0, 5], ease)}
      items={[
        {
          z,
          el: (
            <Perso cam={cam} id="p5" x={150} z={z} lum={lumiere(z, () => 1)} teinte={CHAUD} lift={m.bob} legG={m.legG} legD={m.legD} epauleG={m.bras} epauleD={m.bras} worry={0.3 + 0.6 * regarde} pupilX={5 * regarde} tilt={6 * regarde} eyes={1 + 0.2 * regarde} sweat={interpolate(f, [120, 180], [0, 1], clamp)} breath={Math.sin(f / 6) * 3} />
          ),
        },
      ]}
    />
  );
};

// ---------- 6. Les pas (caméra au ras du sol, puis gros plan de face) ----------
const TAPS = [8, 18, 28, 38, 48, 58, 124, 134];
const Pas = () => {
  const f = useCurrentFrame();
  const face = f >= 72;
  const z = f < 60 ? interpolate(f, [0, 60], [-3, -2.3]) : f < 120 ? -2.3 : interpolate(f, [120, 140], [-2.3, -2.45], clamp);
  const marcheOn = f < 60 || (f >= 120 && f < 140);
  const m = marche(f, 0.32, marcheOn ? 0.8 : 0);
  const cam = makeCam(
    face
      ? {x: 150 + Math.sin(f / 40) * 10, y: -210, z: z - interpolate(f, [72, 180], [0.75, 0.5], ease), pitch: 2}
      : {x: 150 + Math.sin(f / 9) * 12, y: 340, z: z - 0.8, pitch: -11, yaw: Math.sin(f / 30) * 3}
  );
  const decor = rue(cam, f, {});
  const peur = interpolate(f, [60, 70], [0, 1], clamp);
  const taps = TAPS.map((t, k) => {
    const r = f - t;
    if (r < 0 || r > 14) return null;
    // de dos : les pas résonnent juste derrière lui (près de la caméra) ; de face : au loin derrière lui
    const [x, y, zt] = face ? [150 + (k % 2 ? 160 : -160), -120, z + 1.6] : [150 + (k % 2 ? 230 : -230), 330, cam.z + 0.5];
    if (!cam.visible(zt, x, y)) return null;
    const p = cam.proj(x, y, zt);
    const sc = cam.scale(zt, x, y) * (1 + r * 0.03);
    return (
      <text key={k} x={p[0]} y={p[1]} fontSize={(face ? 150 : 90) * sc} fontStyle="italic" fontWeight="900" fill="#d8d8e0" opacity={0.6 * (1 - r / 14)} textAnchor="middle" fontFamily="'DejaVu Sans', Arial, sans-serif">
        TAP
      </text>
    );
  });
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.1}
      roll={face ? interpolate(f, [72, 180], [-4, -9], ease) : 3}
      items={[
        {z: face ? z + 1.6 : cam.z + 0.5, el: <g>{taps}</g>},
        {
          z,
          el: (
            <Perso cam={cam} id="p6" x={150} z={z} dos={!face} lum={lumiere(z, () => 1)} teinte={CHAUD} lift={m.bob} legG={m.legG} legD={m.legD} epauleG={m.bras - 4 * peur} epauleD={m.bras + 4 * peur} coudeG={-15 * peur} coudeD={15 * peur} worry={0.4 + 0.6 * peur} eyes={1 + 0.25 * peur} pupilX={f > 90 && f < 115 ? -4 : 0} sweat={peur} shiver={peur && !marcheOn ? (random(`s6${f}`) - 0.5) * 6 * cam.scale(z) : 0} breath={Math.sin(f / 5) * 3} />
          ),
        },
      ]}
    />
  );
};

// ---------- 7. Le passage souterrain ----------
const Souterrain = () => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, 90], [4.6, 3.9], clamp);
  const camZ = interpolate(f, [0, 90, 170], [3.55, 2.85, 7.3], ease);
  const cam = makeCam({x: interpolate(f, [90, 130, 170], [0, 300, -120], ease), y: interpolate(f, [90, 170], [-30, -200], ease), z: camZ, yaw: interpolate(f, [0, 90, 130, 170], [5, -4, -10, 3], ease)});
  const {proj, poly, scale, visible} = cam;
  const FONDZ = 9;
  const X = 520;
  const PL = -480;
  const zs = Math.max(cam.z + 0.15, 0.2);
  const neons = [1, 2.6, 4.2, 5.8, 7.4];
  const nl = (k) => (k === 2 ? flick(f, 'sn', 0, 210, 0.1) : k === 4 ? flick(f, 'sn4', 60, 120, 0.3) : 1);
  const tuiles = [];
  for (let zz = Math.ceil(zs / 0.2) * 0.2; zz < FONDZ; zz += 0.2) {
    for (const sx of [-X, X]) {
      const a = proj(sx, PL, zz);
      const b = proj(sx, SOL, zz);
      tuiles.push(<line key={`${sx}${zz}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#16201f" strokeWidth={Math.max(1, 4 * scale(zz))} />);
    }
  }
  for (let y = PL + 110; y < SOL; y += 110) {
    for (const sx of [-X, X]) {
      const a = proj(sx, y, zs);
      const b = proj(sx, y, FONDZ);
      tuiles.push(<line key={`h${sx}${y}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#16201f" strokeWidth="3" />);
    }
  }
  const message = 'IL EST DERRIÈRE TOI';
  const nb = Math.floor(interpolate(f, [118, 160], [0, message.length], clamp));
  const pm = proj(-170, -120, FONDZ - 0.01);
  const sm = scale(FONDZ, -170, -120);
  const ombreX = interpolate(f, [176, 196], [80, 560], clamp);
  const lumG = 0.3 + 0.7 * nl(2);
  const zone = (
    <g>
      <defs>
        <radialGradient id="st-sortie">
          <stop offset="0" stopColor="#ffb45a" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ffb45a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="st-neon">
          <stop offset="0" stopColor="#d8fff0" stopOpacity="0.45" />
          <stop offset="1" stopColor="#d8fff0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1080" height="1920" fill="#000" />
      {/* fond : mur + sortie */}
      <polygon points={poly([[-X, PL, FONDZ], [X, PL, FONDZ], [X, SOL, FONDZ], [-X, SOL, FONDZ]])} fill="#2a2e2a" />
      <polygon points={poly([[150, PL, FONDZ], [X, PL, FONDZ], [X, SOL, FONDZ], [150, SOL, FONDZ]])} fill="#3a2a1a" />
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <polygon key={k} points={poly([[150, SOL - k * 140, FONDZ], [X, SOL - k * 140, FONDZ], [X, SOL - k * 140 - 20, FONDZ], [150, SOL - k * 140 - 20, FONDZ]])} fill="#6b4a28" />
      ))}
      <ellipse cx={proj(335, -50, FONDZ)[0]} cy={proj(335, -50, FONDZ)[1]} rx={500 * sm} ry={700 * sm} fill="url(#st-sortie)" />
      {/* silhouette qui passe dans la sortie */}
      {f >= 176 && f < 196 && (
        <g transform={`translate(${proj(ombreX, SOL, FONDZ - 0.05)[0]} ${proj(ombreX, SOL, FONDZ - 0.05)[1]}) scale(${scale(FONDZ, ombreX, 0) * 0.85})`} fill="#020303">
          <ellipse cx="0" cy="-945" rx="58" ry="78" />
          <path d="M-95,-820 Q0,-860 95,-820 L70,-420 L-70,-420 Z M-38,0 L-30,-430 L-8,-430 L-14,0 Z M14,0 L8,-430 L30,-430 L38,0 Z M-92,-815 Q-130,-600 -120,-260 L-100,-255 Q-100,-560 -72,-760 Z M92,-815 Q130,-600 120,-260 L100,-255 Q100,-560 72,-760 Z" />
        </g>
      )}
      {/* message peint */}
      <g transform={`translate(${pm[0]} ${pm[1]}) scale(${sm})`} fontFamily="Georgia, 'DejaVu Serif', serif" fontWeight="900" fontStyle="italic" fill="#a10f14" textAnchor="middle">
        <text y="-40" fontSize="150">{message.slice(0, Math.min(nb, 6))}</text>
        <text y="125" fontSize="88">{nb > 7 ? message.slice(7, nb) : ''}</text>
        {nb > 6 &&
          [...Array(14)].map((_, k) => {
            const x = -300 + random(`d${k}`) * 600;
            const len = interpolate(f, [130 + k * 2, 200], [0, 60 + random(`dl${k}`) * 200], clamp);
            return <line key={k} x1={x} y1={k < 5 ? -20 : 150} x2={x} y2={(k < 5 ? -20 : 150) + len} stroke="#a10f14" strokeWidth="9" strokeLinecap="round" />;
          })}
      </g>
      {/* murs, plafond, sol */}
      <polygon points={poly([[-X, PL, zs], [-X, PL, FONDZ], [-X, SOL, FONDZ], [-X, SOL, zs]])} fill="#2c3d38" />
      <polygon points={poly([[X, PL, zs], [X, PL, FONDZ], [X, SOL, FONDZ], [X, SOL, zs]])} fill="#2c3d38" />
      <polygon points={poly([[-X, PL, zs], [X, PL, zs], [X, PL, FONDZ], [-X, PL, FONDZ]])} fill="#171d1c" />
      <polygon points={poly([[-X, SOL, zs], [X, SOL, zs], [X, SOL, FONDZ], [-X, SOL, FONDZ]])} fill="#25282a" />
      {tuiles}
      {/* tags */}
      {[[-X, 2.0, '#3b5bd6'], [X, 3.4, '#c43b9a'], [-X, 6.2, '#d6b33b'], [X, 7.1, '#3bd68a']].map(([sx, zz, col], k) =>
        visible(zz) ? (
          <polygon key={k} points={poly([[sx, -60, zz], [sx, -180, zz + 0.25], [sx, -40, zz + 0.55], [sx, 120, zz + 0.8], [sx, 60, zz + 0.3]])} fill={col} opacity="0.35" />
        ) : null
      )}
      {/* flaque */}
      {visible(5) && <polygon points={poly([[-200, SOL, 5], [150, SOL, 4.9], [260, SOL, 5.5], [-100, SOL, 5.8]])} fill="#0c1416" />}
      {/* néons */}
      {neons.map((zz, k) =>
        visible(zz) ? (
          <g key={zz} opacity={0.15 + 0.85 * nl(k)}>
            <ellipse cx={proj(0, SOL, zz + 0.3)[0]} cy={proj(0, SOL, zz + 0.3)[1]} rx={600 * scale(zz + 0.3)} ry={170 * scale(zz + 0.3)} fill="url(#st-neon)" opacity={nl(k)} />
            <polygon points={poly([[-30, PL + 20, zz], [30, PL + 20, zz], [30, PL + 20, zz + 0.6], [-30, PL + 20, zz + 0.6]])} fill="#eafff7" />
          </g>
        ) : null
      )}
    </g>
  );
  const m = marche(f, 0.3, f < 90 ? 0.8 : 0);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <g transform={`rotate(${interpolate(f, [0, 90, 170], [2, 4, -5], ease)} 540 960) translate(540 960) scale(1.07) translate(-540 -960)`}>
        {zone}
        {visible(z) && (
          <Perso cam={cam} id="p7" x={0} z={z} lum={lumG} teinte={[0.8, 0.95, 0.9]} lift={m.bob} legG={m.legG} legD={m.legD} epauleG={m.bras} epauleD={m.bras} worry={0.6} sweat={0.6} breath={Math.sin(f / 6) * 3} pupilX={Math.sin(f / 25) * 4} />
        )}
        </g>
        <rect width="1080" height="1920" fill="#000" opacity={0.2 + (1 - lumG) * 0.35} />
        <Finition f={f} />
      </svg>
    </AbsoluteFill>
  );
};

// ---------- 8. Les lampadaires s'éteignent ----------
const extinction = (l) => 30 + (14 - l.z) * 5.5;
const Lampadaires = () => {
  const f = useCurrentFrame();
  const lampe = (l) => {
    if (l.z > 14) return 0;
    const t = extinction(l);
    if (f >= t) return 0;
    if (f > t - 8) return flick(f, `x${l.z}${l.cote}`, t - 8, t, 0.1);
    return 1;
  };
  const z = interpolate(f, [140, 175], [-6, -6.45], ease);
  const cam = makeCam(orbite(150, -6, interpolate(f, [0, 180], [1.25, 1.5]), interpolate(f, [0, 180], [-32, 22], ease), -20, {pitch: -3}));
  const decor = rue(cam, f, {lampe});
  const lum = lumiere(z, lampe, 0.32);
  const recul = interpolate(f, [140, 150], [0, 1], clamp);
  const zy = interpolate(f, [95, 175], [5, -2.5], clamp);
  return (
    <Plan
      f={f}
      decor={decor}
      noir={interpolate(f, [20, 150], [0.12, 0.45], clamp)}
      roll={interpolate(f, [0, 180], [3, -5], ease)}
      items={[
        {
          z,
          el: (
            <Perso cam={cam} id="p8" x={150} z={z} dos lum={lum} teinte={CHAUD} breath={Math.sin(f / 5) * 4} epauleG={-5 * recul} epauleD={5 * recul} coudeG={-25 * recul} coudeD={25 * recul} shiver={recul ? (random(`s8${f}`) - 0.5) * 8 : 0} />
          ),
        },
      ]}
      dessus={f >= 95 ? <YeuxRouges cam={cam} id="yr8" x={330} y={-380} z={zy} ouvert={f % 50 < 3 ? 0.1 : 1} /> : null}
    />
  );
};

// ---------- 9. La course ----------
const Course = () => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, 120], [-9, -17]);
  const sh = (random(`c${f}`) - 0.5) * 18;
  const cam = makeCam({x: 150 + Math.sin(f / 8) * 20 + sh, y: 60 + sh * 0.5, z: z - 1.15, pitch: -7, yaw: Math.sin(f / 14) * 7});
  const lampe = (l) => (l.z > z + 2.2 ? 0 : 1);
  const decor = rue(cam, f, {lampe});
  const m = marche(f, 0.75, 1);
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.17}
      roll={Math.sin(f / 6) * 4 + sh * 0.15}
      items={[
        {
          z,
          el: (
            <Perso cam={cam} id="p9" x={150} z={z} lum={lumiere(z, lampe)} teinte={CHAUD} lift={m.bob * 2.2} legG={m.legG} legD={m.legD} epauleG={m.bras * 3} epauleD={m.bras * 3} coudeG={-70 + m.bras * 3} coudeD={70 + m.bras * 3} worry={1} scream={0.45} sweat={1} eyes={1.2} />
          ),
        },
      ]}
      dessus={<YeuxRouges cam={cam} id="yr9" x={560} y={-520} z={z + 3.2 - f * 0.009} taille={1.3} />}
    />
  );
};

// ---------- Le chauffeur (derrière le pare-brise) ----------
const chauffeur = (cam, f, sourire) => (z) => {
  if (!cam.visible(z, -760, -330)) return null;
  const [px, py] = cam.proj(-760, -330, z);
  const s = cam.scale(z, -760, -330);
  const L = 30 + 70 * sourire;
  return (
    <g transform={`translate(${px} ${py}) scale(${s})`}>
      <defs>
        <radialGradient id="ch-oeil">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.35" stopColor="#ff3b3b" />
          <stop offset="1" stopColor="#ff0000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M-260,330 Q-240,120 -90,90 L90,90 Q240,120 260,330 Z" fill="#020303" />
      <rect x="-28" y="40" width="56" height="70" fill="#020303" />
      <g transform={`rotate(${-8 + Math.sin(f / 12) * 3} 0 60)`}>
        <ellipse cx="0" cy="-30" rx="92" ry="118" fill="#020303" />
        {[-34, 34].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy="-55" rx="34" ry="18" fill="url(#ch-oeil)" />
            <ellipse cx={x} cy="-55" rx="7" ry="4" fill="#fff" />
          </g>
        ))}
        {sourire > 0.02 && (
          <g>
            <path d={`M${-L},12 Q0,${12 + 80 * sourire} ${L},12 Q0,${12 + 30 * sourire} ${-L},12 Z`} fill="#f2f2e8" />
            {[...Array(7)].map((_, k) => {
              const x = -L + ((k + 1) * 2 * L) / 8;
              return <line key={k} x1={x} y1={12} x2={x} y2={12 + 60 * sourire * (1 - Math.abs(x) / (L + 1))} stroke="#020303" strokeWidth="3" />;
            })}
          </g>
        )}
      </g>
    </g>
  );
};

// ---------- 10. Le bus ligne 0 arrive ----------
const BusArrive = () => {
  const f = useCurrentFrame();
  const zBus = interpolate(f, [25, 125], [7, -19.2], {...clamp, easing: Easing.out(Easing.cubic)});
  const z = interpolate(f, [0, 20], [-19.6, -20], {...clamp, easing: Easing.out(Easing.quad)});
  const cam = makeCam({x: 400 + Math.sin(f / 40) * 10, y: 230, z: interpolate(f, [0, 180], [-21.2, -21.0]), pitch: -9, yaw: interpolate(f, [40, 130], [-4, -20], ease)});
  const decor = rue(cam, f, {lampe: () => 0});
  const approche = interpolate(zBus, [-19.2, 7], [1, 0], clamp);
  const soulage = interpolate(f, [100, 115, 135, 145], [0, 1, 1, 0], clamp);
  const peur = interpolate(f, [140, 150], [0, 1], clamp);
  const flash = interpolate(f, [90, 108, 125], [0, 0.55, 0], clamp);
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.3 - 0.15 * approche}
      roll={interpolate(f, [0, 180], [-3, 2], ease)}
      items={[
        f >= 25 && bus(cam, f, {zp: zBus, sens: 'avant', numero: '0', interieur: '#7dffb0', phares: 1, led: flick(f, 'led', 130, 180, 0.2), chauffeur: f > 120 ? chauffeur(cam, f, 0) : null}),
        {
          z,
          el: (
            <Perso cam={cam} id="p10" x={200} z={z} lum={0.3 + 0.7 * approche} teinte={[1, 0.98, 0.92]} breath={Math.sin(f / 4) * 7 * (1 - approche * 0.5)} worry={f < 100 ? 0.7 : peur} smile={soulage * 0.6} pupilX={f > 35 && f < 100 ? -5 : f > 140 ? -4 : 0} tilt={f > 140 ? -4 : 0} eyes={1 + 0.25 * peur} sweat={1} />
          ),
        },
      ]}
      dessus={<rect width="1080" height="1920" fill="#fffbe8" opacity={flash} />}
    />
  );
};

// ---------- 11. Les portes, le chauffeur ----------
const Chauffeur = () => {
  const f = useCurrentFrame();
  const cam = makeCam({
    x: interpolate(f, [30, 130], [400, -600], ease),
    y: interpolate(f, [30, 130], [230, -480], ease),
    z: interpolate(f, [30, 130], [-21.0, -19.72], ease),
    pitch: interpolate(f, [30, 130], [-9, 0], ease),
    yaw: interpolate(f, [30, 130], [-20, 0], ease),
  });
  const decor = rue(cam, f, {lampe: () => 0});
  const porte = interpolate(f, [0, 25], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
  const sourire = interpolate(f, [75, 140], [0, 1], ease);
  const zone = cam.visible(-18.75) ? (
    <polygon points={cam.poly([...Array(16)].map((_, i) => [-20 + Math.cos((i / 16) * 6.283) * 500, SOL - 1, -18.75 + Math.sin((i / 16) * 6.283) * 0.5]))} fill="#7dffb0" opacity={0.3 * porte} />
  ) : null;
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.07}
      roll={interpolate(f, [30, 130], [2, -3], ease)}
      items={[
        bus(cam, f, {zp: -19.2, sens: 'avant', numero: '0', interieur: '#7dffb0', phares: 0.7, porte, led: flick(f, 'led2', 0, 150, 0.3), chauffeur: chauffeur(cam, f, sourire)}),
        {z: -18.7, el: zone},
        {
          z: -20,
          el: <Perso cam={cam} id="p11" x={200} z={-20} lum={0.85} teinte={[0.8, 1, 0.88]} breath={Math.sin(f / 5) * 5} worry={1} eyes={1.25} pupilX={-5} tilt={-4} sweat={1} />,
        },
      ]}
    />
  );
};

// ---------- 12. Fin ----------
const Fin = () => {
  const f = useCurrentFrame();
  const cam = makeCam({x: 200, y: -136, z: interpolate(f, [0, 72], [-20.62, -20.5])});
  const decor = rue(cam, f, {lampe: () => 0});
  const regard = interpolate(f, [22, 30, 48, 56], [0, 1, 1, 0], clamp);
  if (f >= 72) {
    const op = interpolate(f, [78, 84], [0, 1], clamp) * (random(`fin${f}`) > 0.12 ? 1 : 0.4);
    return (
      <AbsoluteFill style={{background: '#000'}}>
        <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
          <text x="540" y="900" textAnchor="middle" fontFamily="Georgia, 'DejaVu Serif', serif" fontWeight="900" fontSize="170" fill="#d4141c" opacity={op} letterSpacing="10">
            LIGNE 0
          </text>
          <text x="540" y="1030" textAnchor="middle" fontFamily="'DejaVu Sans', Arial, sans-serif" fontWeight="700" fontSize="56" fill="#e8e8e8" opacity={interpolate(f, [88, 96], [0, 1], clamp)} letterSpacing="18">
            ÉPISODE 1
          </text>
          <Finition f={f} />
        </svg>
      </AbsoluteFill>
    );
  }
  return (
    <Plan
      f={f}
      decor={decor}
      noir={0.02}
      roll={interpolate(f, [0, 70], [-7, 0], ease)}
      items={[
        bus(cam, f, {zp: -19.2, sens: 'avant', numero: '0', interieur: '#7dffb0', phares: 0.3, porte: 1, chauffeur: chauffeur(cam, f, 1)}),
        {
          z: -20,
          el: <Perso cam={cam} id="p12" x={200} z={-20} lum={0.85} teinte={[0.8, 1, 0.88]} breath={Math.sin(f / 5) * 4} worry={1} eyes={f === 62 || f === 63 ? 0.1 : 1.15} pupilX={-6 * regard} tilt={-5 * regard} sweat={1} />,
        },
      ]}
    />
  );
};

const COMPOSANTS = {
  busPart: BusPart,
  horaires: Horaires,
  telephone: Telephone,
  rueVide: RueVide,
  balancoire: Balancoire,
  pas: Pas,
  souterrain: Souterrain,
  lampadaires: Lampadaires,
  course: Course,
  busArrive: BusArrive,
  chauffeur: Chauffeur,
  fin: Fin,
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
