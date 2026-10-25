import {AbsoluteFill, Easing, interpolate} from 'remotion';
import {clamp, Finition} from './moteur';

// Outils de montage communs aux vidéos POV (plans courts, coups de zoom, gros plans).

// Découpage d'une vidéo : durées des scènes (timeline.json) + poids des plans (plans.json)
export const montage = (timeline, PLANS) => {
  const DUREES = Object.fromEntries(timeline.scenes.map((s) => [s.nom, s.frames]));
  const decoupe = (nom, f) => {
    const poids = PLANS[nom];
    const total = poids.reduce((a, b) => a + b, 0);
    const bornes = [0];
    poids.forEach((p) => bornes.push(Math.round(bornes[bornes.length - 1] + (p / total) * DUREES[nom])));
    let i = 0;
    while (i < poids.length - 1 && f >= bornes[i + 1]) i++;
    return {i, t: f - bornes[i], d: bornes[i + 1] - bornes[i], bornes, D: DUREES[nom]};
  };
  const repere = (nom, mot, defaut) => timeline.scenes.find((s) => s.nom === nom)?.reperes?.[mot] ?? defaut;
  return {DUREES, decoupe, repere, SCENES: timeline.scenes.map((s) => [s.nom, s.frames])};
};

export const punch = (t, fort = 0.12) => interpolate(t, [0, 8], [1 + fort, 1], {...clamp, easing: Easing.out(Easing.cubic)});
export const dosPour = (cam, z, dir) => (dir > 0 ? cam.z < z : cam.z > z);
export const FACE_Y = -150;
export const camFace = (x, z, dir, dist, t, d, {dx = 0, dy = 0, push = 0.1, pitch = 0} = {}) => ({
  x: x + dx,
  y: FACE_Y + dy,
  z: z + dir * (dist - (push * t) / Math.max(d, 1)),
  yaw: dir > 0 ? 180 : 0,
  pitch,
});

// Assemble une image : décor + éléments triés en profondeur + voile noir + éléments par-dessus + finition
// Avec `cam`, les éléments sont triés selon leur vraie distance à la caméra (indispensable en contrechamp).
export const Plan = ({f, decor, items = [], noir = 0, dessus = null, roll = 0, zoom = 1, cam = null}) => {
  const loin = (o) => (cam ? cam.profondeur(o.z, o.x ?? cam.x, o.y ?? cam.y) : o.z);
  const tous = [...decor.items, ...items].filter((o) => o && o.el).sort((a, b) => loin(b) - loin(a));
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <g transform={`rotate(${roll} 540 960) translate(540 960) scale(${zoom * (1 + Math.abs(roll) * 0.012)}) translate(-540 -960)`}>
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
