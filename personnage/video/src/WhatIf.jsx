// Kit commun du style « What if » (validé le 29/10 sur « Apocalypse zombie à l'hôpital ») :
// police Anton, boîtes de choix, bulle « DIS-LE EN COMMENTAIRE », filtres de flou.
import {continueRender, delayRender, spring, staticFile} from 'remotion';

// police haute et serrée (Anton) : cartes, puces, panneaux
const attente = delayRender('anton');
if (typeof FontFace !== 'undefined') {
  new FontFace('AntonB', `url(${staticFile('fonts/Anton-Regular.ttf')})`)
    .load()
    .then((p) => {
      document.fonts.add(p);
      continueRender(attente);
    })
    .catch(() => continueRender(attente));
} else continueRender(attente);

export const DefsFlou = () => (
  <defs>
    {[2, 4, 8, 14].map((s) => (
      <filter key={s} id={`flou${s}`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation={s} />
      </filter>
    ))}
  </defs>
);

// les deux choix du dilemme final
export const ChoixBoite = ({f, debut, x, y, texte, emoji, couleur, etat = 0}) => {
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

// bulle « DIS-LE EN COMMENTAIRE »
export const BulleCommentaire = ({f, t0, y = 1700}) => {
  if (f < t0) return null;
  const s = spring({frame: f - t0, fps: 30, config: {damping: 10}});
  return (
    <g transform={`translate(540 ${y}) scale(${s})`}>
      <rect x="-400" y="-62" width="800" height="140" rx="70" fill="#000" opacity="0.3" />
      <rect x="-400" y="-70" width="800" height="140" rx="70" fill="#fff" />
      <image href={staticFile('emoji/1f4ac.svg')} x="-370" y="-48" width="96" height="96" />
      <text x="40" y="18" textAnchor="middle" fontFamily="'DejaVu Sans', Arial, sans-serif" fontWeight="900" fontSize="46" fill="#111">
        DIS-LE EN COMMENTAIRE
      </text>
    </g>
  );
};
