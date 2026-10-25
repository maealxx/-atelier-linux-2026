import {random} from 'remotion';
import {Bonhomme} from './Bonhomme';

// Mini moteur 2,5D partagé par les scènes.
// Monde : X (gauche/droite), Y (haut/bas), Z (profondeur, 1 Z = 1000 unités, 1 m ≈ 370 unités).
export const VP = [540, 820];
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};

// Caméra 3D : position (x, y, z), lacet `yaw` (+ = regarde à droite), tangage `pitch` (+ = regarde vers le bas).
// Les polygones sont découpés au plan proche, donc on peut tourner la caméra librement.
const PROCHE = 0.06;
export const makeCam = (cam) => {
  const ya = ((cam.yaw || 0) * Math.PI) / 180;
  const pi = ((cam.pitch || 0) * Math.PI) / 180;
  const [cy, sy, cp, sp] = [Math.cos(ya), Math.sin(ya), Math.cos(pi), Math.sin(pi)];
  const versCam = (X, Y, Z) => {
    const x = X - cam.x;
    const y = Y - cam.y;
    const z = (Z - cam.z) * 1000;
    const x1 = x * cy - z * sy;
    const z1 = x * sy + z * cy;
    return [x1, y * cp - z1 * sp, (y * sp + z1 * cp) / 1000];
  };
  const ecran = ([x, y, d]) => {
    const dd = Math.max(d, 0.02);
    return [VP[0] + x / dd, VP[1] + y / dd];
  };
  const proj = (X, Y, Z) => ecran(versCam(X, Y, Z));
  const profondeur = (Z, X = cam.x, Y = cam.y) => versCam(X, Y, Z)[2];
  const scale = (Z, X, Y) => 1 / Math.max(profondeur(Z, X, Y), 0.02);
  const visible = (Z, X, Y) => profondeur(Z, X, Y) > 0.12;
  const decoupe = (pts) => {
    const out = [];
    pts.forEach((a, i) => {
      const b = pts[(i + 1) % pts.length];
      const ina = a[2] >= PROCHE;
      if (ina) out.push(a);
      if (ina !== b[2] >= PROCHE) {
        const t = (PROCHE - a[2]) / (b[2] - a[2]);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, PROCHE]);
      }
    });
    return out;
  };
  const poly = (pts) => {
    const c = decoupe(pts.map((p) => versCam(...p)));
    return c.length < 3 ? '' : c.map((p) => ecran(p).join(',')).join(' ');
  };
  // segment 3D → [a, b] à l'écran, ou null s'il est derrière la caméra
  const seg = (A, B) => {
    let a = versCam(...A);
    let b = versCam(...B);
    if (a[2] < PROCHE && b[2] < PROCHE) return null;
    if (a[2] < PROCHE) a = a.map((v, k) => v + (b[k] - v) * ((PROCHE - a[2]) / (b[2] - a[2])));
    if (b[2] < PROCHE) b = b.map((v, k) => v + (a[k] - v) * ((PROCHE - b[2]) / (a[2] - b[2])));
    return [ecran(a), ecran(b)];
  };
  const fuite = ecran(versCam(cam.x, cam.y, cam.z + 100));
  return {...cam, proj, poly, seg, scale, visible, profondeur, fuite};
};

// Caméra qui tourne autour d'un point (travelling circulaire) en le gardant au centre
export const orbite = (cx, cz, rayon, angle, y, extra = {}) => ({
  x: cx - Math.sin((angle * Math.PI) / 180) * rayon * 1000,
  z: cz - Math.cos((angle * Math.PI) / 180) * rayon,
  y,
  yaw: angle,
  ...extra,
});

// Lumière qui grésille (déterministe)
export const flick = (f, seed, from, to, low = 0.15) =>
  f >= from && f <= to ? (random(`${seed}-${f}`) > 0.45 ? 1 : low) : 1;

// Cycle de marche / course vu de face ou de dos
export const marche = (f, vitesse, amp = 1) => {
  const ph = f * vitesse;
  return {
    legG: Math.max(0, Math.sin(ph)) * amp,
    legD: Math.max(0, -Math.sin(ph)) * amp,
    bob: -Math.abs(Math.sin(ph)) * 14 * amp,
    bras: Math.sin(ph) * 8 * amp,
  };
};

// Le bonhomme posé dans le monde 3D (billboard). y = sol, lift en unités du dessin (négatif = en l'air).
export const Perso = ({cam, id, x, z, y = 432, lum = 1, teinte = [1, 1, 1], sx = 1, sy = 1, lift = 0, shiver = 0, ombre = 0.5, ...pose}) => {
  if (!cam.visible(z, x, y - 300)) return null;
  const [px, py] = cam.proj(x, y, z);
  const s = cam.scale(z, x, y - 300) * 0.78;
  const [r, g, b] = teinte.map((c) => c * lum);
  return (
    <g>
      <defs>
        <filter id={id}>
          <feColorMatrix type="matrix" values={`${r} 0 0 0 0  0 ${g} 0 0 0  0 0 ${b} 0 0  0 0 0 1 0`} />
        </filter>
      </defs>
      <ellipse cx={px} cy={py} rx={130 * s * (1 + lift / 600)} ry={22 * s} fill="#000" opacity={ombre} />
      <g filter={`url(#${id})`} transform={`translate(${px + shiver} ${py}) scale(${s * sx} ${s * sy}) translate(-300 ${-922 + lift})`}>
        <Bonhomme {...pose} />
      </g>
    </g>
  );
};

// Vignette + grain, par-dessus toute l'image
export const Finition = ({f, id = 'fin', vignette = 0.9}) => (
  <g>
    <defs>
      <radialGradient id={`${id}-v`} cx="540" cy="960" r="1150" gradientUnits="userSpaceOnUse">
        <stop offset="0.45" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity={vignette} />
      </radialGradient>
      <filter id={`${id}-g`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={f} />
        <feColorMatrix type="saturate" values="0" />
      </filter>
    </defs>
    <rect x="0" y="0" width="1080" height="1920" fill={`url(#${id}-v)`} />
    <rect x="0" y="0" width="1080" height="1920" filter={`url(#${id}-g)`} opacity="0.09" />
  </g>
);

// Yeux rouges qui brillent dans le noir (billboard)
export const YeuxRouges = ({cam, x, y, z, taille = 1, ouvert = 1, id = 'yr'}) => {
  if (!cam.visible(z, x, y)) return null;
  const [px, py] = cam.proj(x, y, z);
  const s = cam.scale(z, x, y) * taille;
  return (
    <g transform={`translate(${px} ${py}) scale(${s})`}>
      <defs>
        <radialGradient id={id}>
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.35" stopColor="#ff3b3b" />
          <stop offset="1" stopColor="#ff0000" stopOpacity="0" />
        </radialGradient>
      </defs>
      {[-26, 26].map((ex) => (
        <g key={ex} transform={`translate(${ex} 0) scale(1 ${ouvert})`}>
          <ellipse rx="70" ry="38" fill={`url(#${id})`} opacity="0.5" />
          <ellipse rx="28" ry="15" fill={`url(#${id})`} />
          <ellipse rx="7" ry="4" fill="#fff" />
        </g>
      ))}
    </g>
  );
};
