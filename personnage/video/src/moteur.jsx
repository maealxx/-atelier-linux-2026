import {random} from 'remotion';
import {Bonhomme} from './Bonhomme';

// Mini moteur 2,5D partagé par les scènes.
// Monde : X (gauche/droite), Y (haut/bas), Z (profondeur, 1 Z = 1000 unités, 1 m ≈ 370 unités).
export const VP = [540, 820];
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};

export const makeCam = (cam) => {
  const proj = (X, Y, Z) => {
    const d = Math.max(Z - cam.z, 0.02);
    return [VP[0] + (X - cam.x) / d, VP[1] + (Y - cam.y) / d];
  };
  const poly = (pts) => pts.map((p) => proj(...p).join(',')).join(' ');
  const scale = (Z) => 1 / Math.max(Z - cam.z, 0.02);
  const visible = (Z) => Z - cam.z > 0.12;
  return {...cam, proj, poly, scale, visible};
};

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
  if (!cam.visible(z)) return null;
  const [px, py] = cam.proj(x, y, z);
  const s = cam.scale(z) * 0.78;
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
  if (!cam.visible(z)) return null;
  const [px, py] = cam.proj(x, y, z);
  const s = cam.scale(z) * taille;
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
