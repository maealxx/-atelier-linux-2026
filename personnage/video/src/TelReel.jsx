import {AbsoluteFill, Easing, interpolate, random, spring} from 'remotion';

// ===================== Le téléphone réaliste (« Le babyphone ») =====================
// Le même dessin sert partout : posé en 3D dans la scène (dans une `plaque`) ou tenu en main (`TelReel`, perspective CSS).
// Repère du dessin : TW × TH, écran inséré de 20 px. Animations au ressort et en courbes douces, jamais de saut.
export const TW = 560;
export const TH = 1180;
const SX = 20;
const SY = 20;
const SW = TW - 2 * SX;
const SH = TH - 2 * SY;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const doux = (f, a, b) => interpolate(f, [a, b], [0, 1], {...clamp, easing: Easing.bezier(0.25, 0.1, 0.25, 1)});
const ressort = (f, t, k = {damping: 15, stiffness: 170, mass: 0.8}) => (f < t ? 0 : spring({frame: f - t, fps: 30, config: k}));
const POLICE = "'DejaVu Sans', Arial, sans-serif";

// vibration haptique : le téléphone seul tremble, à chaque message (amortie en ~12 images)
export const haptique = (f, temps, force = 1) => {
  let dx = 0;
  let rz = 0;
  temps.forEach((t) => {
    const u = f - t;
    if (u < 0 || u > 16) return;
    const a = Math.exp(-u / 4.5) * force;
    dx += a * 9 * Math.sin(u * 2.9);
    rz += a * 1.4 * Math.sin(u * 2.3 + 1);
  });
  return {dx, rz};
};

// coupe un texte en lignes (≈ n caractères) ; les mots en MAJUSCULES restent en gras
const lignes = (texte, n) => {
  const mots = texte.split(' ');
  const out = [''];
  mots.forEach((m) => {
    if ((out[out.length - 1] + ' ' + m).trim().length > n) out.push(m);
    else out[out.length - 1] = (out[out.length - 1] + ' ' + m).trim();
  });
  return out;
};
const TexteRiche = ({x, y, texte, taille, couleur, poids = 400}) => (
  <text x={x} y={y} fontSize={taille} fill={couleur} fontFamily={POLICE} fontWeight={poids}>
    {texte.split(' ').map((m, k) => (
      <tspan key={k} fontWeight={m.length > 2 && m === m.toUpperCase() && /[A-Z]/.test(m) ? 900 : poids}>
        {(k ? ' ' : '') + m}
      </tspan>
    ))}
  </text>
);

// ----- l'écran verrouillé : fond d'écran, heure, notifications qui s'empilent (la plus récente en haut) -----
const Verrou = ({f, heure, date, notifs, appui}) => {
  const vues = notifs.filter((n) => f >= n.t);
  const H = 124;
  const G = 14;
  return (
    <g>
      <defs>
        <linearGradient id="tr-fond" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#0f0c2a" />
          <stop offset="0.55" stopColor="#2a1650" />
          <stop offset="1" stopColor="#5a2a5a" />
        </linearGradient>
        <radialGradient id="tr-blob">
          <stop offset="0" stopColor="#ff6ab0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff6ab0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="tr-blob2">
          <stop offset="0" stopColor="#5a8aff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#5a8aff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x={SX} y={SY} width={SW} height={SH} fill="url(#tr-fond)" />
      <circle cx={140 + 20 * Math.sin(f / 60)} cy={900} r={330} fill="url(#tr-blob)" />
      <circle cx={430} cy={560 + 20 * Math.cos(f / 70)} r={300} fill="url(#tr-blob2)" />
      <text x={TW / 2} y={150} textAnchor="middle" fontSize="30" fill="#e8e6ff" fontFamily={POLICE} opacity="0.85">{date}</text>
      <text x={TW / 2} y={300} textAnchor="middle" fontSize="150" fill="#f4f2ff" fontFamily={POLICE} fontWeight="200" letterSpacing="-4">{heure}</text>
      {vues.map((n, i) => {
        // décalage vers le bas quand des notifications plus récentes arrivent (courbe douce)
        const plusRecentes = vues.slice(i + 1);
        const dy = plusRecentes.reduce((s, m) => s + (H + G) * ressort(f, m.t, {damping: 18, stiffness: 140}), 0);
        const e = ressort(f, n.t, {damping: 13, stiffness: 160});
        const y = 360 + dy;
        if (y > TH - 200) return null;
        const presse = appui && i === vues.length - 1 ? 1 - 0.035 * Math.sin(Math.PI * doux(f, appui - 6, appui)) : 1;
        return (
          <g key={i} transform={`translate(${TW / 2} ${y + H / 2 - (1 - e) * 70}) scale(${(0.88 + 0.12 * e) * presse}) translate(${-TW / 2} ${-H / 2})`} opacity={Math.min(1, e * 1.4)}>
            <rect x="40" y="0" width={TW - 80} height={H} rx="32" fill="#f4f2f8" opacity="0.86" />
            <rect x="62" y="22" width="56" height="56" rx="14" fill="#34c759" />
            <path d="M76,40 h28 a6,6 0 0 1 6,6 v14 a6,6 0 0 1 -6,6 h-18 l-8,7 v-7 a6,6 0 0 1 -6,-6 v-14 a6,6 0 0 1 6,-6 z" fill="#fff" />
            <text x="134" y="46" fontSize="25" fontWeight="700" fill="#111" fontFamily={POLICE}>{n.titre}</text>
            <text x={TW - 62} y="46" textAnchor="end" fontSize="19" fill="#6a6a72" fontFamily={POLICE}>{f - n.t < 90 ? 'maintenant' : '1 min'}</text>
            <text x="134" y="84" fontSize="23" fill="#2a2a30" fontFamily={POLICE}>{n.texte.length > 30 ? n.texte.slice(0, 29) + '…' : n.texte}</text>
          </g>
        );
      })}
      {/* barre du bas, lampe torche et appareil photo */}
      <circle cx="110" cy={TH - 150} r="44" fill="#ffffff" opacity="0.14" />
      <circle cx={TW - 110} cy={TH - 150} r="44" fill="#ffffff" opacity="0.14" />
      <rect x={TW / 2 - 90} y={TH - 46} width="180" height="9" rx="4.5" fill="#fff" opacity="0.8" />
    </g>
  );
};

// ----- la conversation : en-tête, bulles qui arrivent par le bas et poussent les autres, « écrit… » -----
// une photo reçue : 400 × 500, dessinée par m.photo(âge en images)
export const PH_W = 400;
export const PH_H = 500;
const Conversation = ({f, nom, messages, zoom = 0, avatar = null, couleurAvatar = '#c46aa8', statut = ''}) => {
  const L = 21;
  const LH = 40;
  const G = 18;
  const BAS = TH - 150;
  const hauteur = (m) => (m.photo ? PH_H : lignes(m.texte, L).length * LH + 40);
  // hauteur « effective » d'un message à l'instant f : 0 → bulle « écrit… » (78) → bulle complète
  const eff = (m) => {
    const ecr = interpolate(f, [m.t - 30, m.t - 22], [0, 78 + G], {...clamp, easing: Easing.out(Easing.cubic)});
    const plein = interpolate(f, [m.t, m.t + 9], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
    // « écrit… » qui s'arrête sans rien envoyer
    if (m.fantome) return ecr * (1 - interpolate(f, [m.t, m.t + 10], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)}));
    return ecr + (hauteur(m) - 78) * plein;
  };
  const actifs = messages.filter((m) => f >= m.t - 30 && !(m.fantome && f > m.t + 10));
  let y = BAS;
  const blocs = [];
  [...actifs].reverse().forEach((m) => {
    const h = eff(m);
    y -= h;
    blocs.unshift({m, y, h});
  });
  return (
    <g>
      <rect x={SX} y={SY} width={SW} height={SH} fill="#0c0e13" />
      <g transform={`translate(${TW / 2} ${BAS}) scale(${1 + zoom}) translate(${-TW / 2} ${-BAS})`}>
        {blocs.map(({m, y: yb}, k) => {
          const arrive = f >= m.t && !m.fantome;
          if (!arrive) {
            // « écrit… » : trois points qui rebondissent
            const e = ressort(f, m.t - 30, {damping: 14, stiffness: 180}) * (m.fantome ? 1 - doux(f, m.t, m.t + 10) : 1);
            return (
              <g key={k} transform={`translate(46 ${yb}) scale(${e})`}>
                <rect width="120" height="78" rx="39" fill="#262a34" />
                {[0, 1, 2].map((j) => <circle key={j} cx={34 + j * 26} cy={39 - 9 * Math.max(0, Math.sin(f / 3.2 - j * 0.9))} r="9" fill="#9aa2b2" />)}
              </g>
            );
          }
          if (m.photo) {
            const e = ressort(f, m.t, {damping: 14, stiffness: 150});
            return (
              <g key={k} transform={`translate(46 ${yb + PH_H}) scale(${0.7 + 0.3 * e}) translate(0 ${-PH_H})`} opacity={Math.min(1, e * 1.5)}>
                <defs>
                  <clipPath id={`tr-ph${k}`}>
                    <rect width={PH_W} height={PH_H} rx="30" />
                  </clipPath>
                </defs>
                <rect x="-4" y="-4" width={PH_W + 8} height={PH_H + 8} rx="34" fill="#262a34" />
                <g clipPath={`url(#tr-ph${k})`}>{m.photo(f - m.t)}</g>
              </g>
            );
          }
          const ls = lignes(m.texte, L);
          const w = Math.min(TW - 120, Math.max(...ls.map((l) => l.length)) * 17.5 + 52);
          const h = ls.length * LH + 40;
          const e = ressort(f, m.t, {damping: 12, stiffness: 190});
          return (
            <g key={k} transform={`translate(46 ${yb + h}) scale(${0.7 + 0.3 * e}) translate(0 ${-h})`} opacity={Math.min(1, e * 1.5)}>
              {m.alerte && <rect x="-6" y="-6" width={w + 12} height={h + 12} rx="38" fill="#ff2a3a" opacity={0.25 + 0.15 * Math.sin(f / 4)} />}
              <rect width={w} height={h} rx="32" fill={m.alerte ? '#3a0c12' : '#262a34'} stroke={m.alerte ? '#ff3b4a' : 'none'} strokeWidth="4" />
              <path d={`M6,${h - 26} Q-8,${h} -14,${h + 2} Q10,${h + 2} 26,${h - 10} Z`} fill={m.alerte ? '#3a0c12' : '#262a34'} />
              {ls.map((l, j) => <TexteRiche key={j} x={26} y={50 + j * LH} texte={l} taille={31} couleur="#f2f4f8" />)}
            </g>
          );
        })}
      </g>
      {/* en-tête flouté par-dessus les bulles qui montent */}
      <rect x={SX} y={SY} width={SW} height={avatar ? 200 : 150} fill="#14171e" opacity="0.96" />
      {avatar ? (
        <g>
          <path d={`M${SX + 30},150 l-14,-16 l14,-16`} stroke="#3a8bff" strokeWidth="6" fill="none" strokeLinecap="round" />
          <circle cx={TW / 2} cy="132" r="30" fill={couleurAvatar} />
          <text x={TW / 2} y="144" textAnchor="middle" fontSize="32" fontWeight="700" fill="#fff" fontFamily={POLICE}>{avatar}</text>
          <text x={TW / 2} y="190" textAnchor="middle" fontSize="22" fontWeight="600" fill="#e8eaf0" fontFamily={POLICE}>{nom}</text>
        </g>
      ) : (
        <g>
          <path d={`M${SX + 30},96 l-14,-16 l14,-16`} stroke="#3a8bff" strokeWidth="6" fill="none" strokeLinecap="round" />
          <circle cx={TW / 2} cy="78" r="34" fill="#c46aa8" />
          <text x={TW / 2} y="91" textAnchor="middle" fontSize="34" fontWeight="700" fill="#fff" fontFamily={POLICE}>M</text>
          <text x={TW / 2} y="136" textAnchor="middle" fontSize="21" fill="#e8eaf0" fontFamily={POLICE}>{nom}</text>
        </g>
      )}
      {statut && <text x={TW / 2} y="214" textAnchor="middle" fontSize="16" fill="#3ad86a" fontFamily={POLICE}>{statut}</text>}
      {/* barre de saisie */}
      <rect x={SX} y={TH - 130} width={SW} height="110" fill="#14171e" />
      <rect x="70" y={TH - 112} width={TW - 140} height="56" rx="28" fill="none" stroke="#3a3e48" strokeWidth="3" />
      <rect x={TW / 2 - 90} y={TH - 46} width="180" height="9" rx="4.5" fill="#fff" opacity="0.8" />
    </g>
  );
};

// ----- le téléphone (dessin SVG complet) -----
// ecran : 'off' | 'lock' | 'conv'. tap : image où l'on touche la notification (passage à la conversation).
export const Tel = ({f, ecran = 'lock', heure = '23:02', date = 'lundi 27 octobre', notifs = [], messages = [], tap = null, nom = 'Maman de Léna', reflet = 0, zoomConv = 0, allume = 1, avatar, couleurAvatar, statut}) => {
  const vers = tap === null ? (ecran === 'conv' ? 1 : 0) : doux(f, tap, tap + 12);
  return (
    <g>
      <defs>
        <linearGradient id="tr-coque" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8a8e96" />
          <stop offset="0.25" stopColor="#3a3d44" />
          <stop offset="0.6" stopColor="#5a5e66" />
          <stop offset="1" stopColor="#2a2c32" />
        </linearGradient>
        <linearGradient id="tr-reflet" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset={0.35 + 0.2 * reflet} stopColor="#fff" stopOpacity="0" />
          <stop offset={0.45 + 0.2 * reflet} stopColor="#fff" stopOpacity="0.13" />
          <stop offset={0.6 + 0.2 * reflet} stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="tr-ecran">
          <rect x={SX} y={SY} width={SW} height={SH} rx="74" />
        </clipPath>
      </defs>
      {/* coque métal, bords, boutons */}
      <rect x="-5" y="200" width="10" height="90" rx="4" fill="#4a4d54" />
      <rect x="-5" y="320" width="10" height="150" rx="4" fill="#4a4d54" />
      <rect x={TW - 5} y="300" width="10" height="190" rx="4" fill="#4a4d54" />
      <rect x="0" y="0" width={TW} height={TH} rx="92" fill="url(#tr-coque)" />
      <rect x="6" y="6" width={TW - 12} height={TH - 12} rx="88" fill="#050506" />
      <g clipPath="url(#tr-ecran)">
        {ecran === 'off' || allume <= 0 ? (
          <rect x={SX} y={SY} width={SW} height={SH} fill="#020203" />
        ) : (
          <g opacity={allume}>
            {vers < 1 && (
              <g opacity={1 - vers} transform={`translate(${TW / 2} ${TH / 2}) scale(${1 + 0.06 * vers}) translate(${-TW / 2} ${-TH / 2})`}>
                <Verrou f={f} heure={heure} date={date} notifs={notifs} appui={tap} />
              </g>
            )}
            {vers > 0 && (
              <g opacity={vers} transform={`translate(0 ${40 * (1 - vers)})`}>
                <Conversation f={f} nom={nom} messages={messages} zoom={zoomConv} avatar={avatar} couleurAvatar={couleurAvatar} statut={statut} />
              </g>
            )}
            {/* doigt qui touche la notification */}
            {tap !== null && f > tap - 10 && f < tap + 14 && (
              <circle cx={TW / 2} cy={420} r={30 + 40 * doux(f, tap - 2, tap + 12)} fill="#fff" opacity={0.35 * (1 - doux(f, tap, tap + 14))} />
            )}
          </g>
        )}
        <rect x={SX} y={SY} width={SW} height={SH} fill="url(#tr-reflet)" />
      </g>
      {/* Dynamic Island */}
      <rect x={TW / 2 - 92} y="40" width="184" height="54" rx="27" fill="#000" />
      <circle cx={TW / 2 + 60} cy="67" r="10" fill="#0c0e18" />
    </g>
  );
};

// ----- les mains qui tiennent un appareil (dessinées dans le repère de l'appareil, largeur w, hauteur h) -----
const PEAU = '#F2C3A0';
const PEAU_O = '#E3A984';
export const MainsDerriere = ({w, h, manche = '#FF6B5B', peau = null}) => (
  <g>
    <path d={`M${-40},${h * 0.62} Q${w * 0.5},${h * 0.5} ${w + 40},${h * 0.62} L${w + 120},${h + 520} L${-120},${h + 520} Z`} fill={peau || PEAU_O} />
    <path d={`M${-20},${h * 0.66} Q${w * 0.5},${h * 0.56} ${w + 20},${h * 0.66} L${w + 90},${h + 520} L${-90},${h + 520} Z`} fill={peau || PEAU} />
    <rect x={-60} y={h + 120} width={w + 120} height="420" rx="60" fill={manche} />
  </g>
);
export const MainsDevant = ({w, h, appui = 0, peau = null}) => (
  <g>
    {/* doigts qui dépassent sur le bord gauche */}
    {[0.55, 0.64, 0.73].map((r, k) => (
      <g key={k}>
        <ellipse cx={-6} cy={h * r} rx="40" ry="34" fill={peau || PEAU} />
        {!peau && <ellipse cx={4} cy={h * r - 6} rx="18" ry="14" fill="#f8d4b8" opacity="0.7" />}
      </g>
    ))}
    {/* pouce sur le bord droit (il appuie quand on touche l'écran) */}
    <g transform={`rotate(${-28 - 14 * appui} ${w + 10} ${h * 0.78})`}>
      <ellipse cx={w + 10} cy={h * 0.7 - 30 * appui} rx="44" ry="96" fill={peau || PEAU} />
      {!peau && <ellipse cx={w + 4} cy={h * 0.64 - 30 * appui} rx="24" ry="30" fill="#f8d4b8" opacity="0.7" />}
    </g>
  </g>
);

// ----- le téléphone tenu en main, en vraie perspective (CSS 3D), avec la lueur de l'écran sur la scène -----
// pose : {x, y, rx, ry, rz, s} (centre écran en px, angles en degrés). vib : liste des images de vibration.
export const TelReel = ({f, pose, vib = [], mains = true, lueur = 0.5, appui = 0, nuit = 0, manche, ...tel}) => {
  const {x = 540, y = 960, rx = 0, ry = 0, rz = 0, s = 1} = pose;
  const h = haptique(f, vib);
  return (
    <AbsoluteFill style={{perspective: '1700px', perspectiveOrigin: `${x}px ${y}px`}}>
      <div style={{position: 'absolute', left: x - 380, top: y - 520, width: 760, height: 1040, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(150,140,255,0.55), rgba(120,90,220,0.18) 55%, rgba(0,0,0,0))', opacity: lueur, filter: 'blur(30px)'}} />
      <div
        style={{
          position: 'absolute',
          left: x - TW / 2,
          top: y - TH / 2,
          width: TW,
          height: TH,
          transformStyle: 'preserve-3d',
          transform: `translateX(${h.dx}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz + h.rz}deg) scale(${s})`,
          filter: 'drop-shadow(0 50px 50px rgba(0,0,0,0.55))',
        }}
      >
        <svg width={TW} height={TH} viewBox={`0 0 ${TW} ${TH}`} style={{overflow: 'visible'}}>
          {/* de nuit, les mains ne sont éclairées que par l'écran : voile sombre et froid par-dessus */}
          {mains && <MainsDerriere w={TW} h={TH} manche={manche} />}
          {mains && nuit > 0 && <g opacity={0.82 * nuit}><MainsDerriere w={TW} h={TH} manche="#0a0c16" peau="#0a0c16" /></g>}
          <Tel f={f} reflet={ry / 30 + rx / 60} {...tel} />
          {mains && <MainsDevant w={TW} h={TH} appui={appui} />}
          {mains && nuit > 0 && <g opacity={0.78 * nuit}><MainsDevant w={TW} h={TH} appui={appui} peau="#0a0c16" /></g>}
        </svg>
      </div>
    </AbsoluteFill>
  );
};

// ===================== le babyphone (unité parents) =====================
// Boîtier blanc arrondi, antenne, écran 4:3 qui affiche le flux de la caméra, barre de son à 5 diodes, haut-parleur.
export const BW = 520;
export const BH = 780;
export const ECRAN_B = {x: 50, y: 150, w: 420, h: 315};
export const Babyphone = ({f, flux = null, niveau = 0, alerte = 0, grain = 0}) => {
  const E = ECRAN_B;
  return (
    <g>
      <defs>
        <linearGradient id="bb-coque" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#e6e4e0" />
          <stop offset="1" stopColor="#c8c6c2" />
        </linearGradient>
        <clipPath id="bb-ecran">
          <rect x={E.x} y={E.y} width={E.w} height={E.h} rx="18" />
        </clipPath>
      </defs>
      {/* antenne */}
      <rect x="60" y="-150" width="46" height="200" rx="23" fill="#d8d6d2" />
      <rect x="70" y="-140" width="10" height="180" rx="5" fill="#ffffff" opacity="0.6" />
      <rect x="0" y="0" width={BW} height={BH} rx="70" fill="url(#bb-coque)" />
      <rect x="10" y="10" width={BW - 20} height={BH - 20} rx="62" fill="none" stroke="#ffffff" strokeWidth="6" opacity="0.7" />
      <rect x={E.x - 14} y={E.y - 14} width={E.w + 28} height={E.h + 28} rx="26" fill="#1a1c20" />
      <g clipPath="url(#bb-ecran)">
        <rect x={E.x} y={E.y} width={E.w} height={E.h} fill="#020402" />
        {flux && (
          <svg x={E.x} y={E.y} width={E.w} height={E.h} viewBox="0 380 1080 810" preserveAspectRatio="xMidYMid slice">
            {flux}
          </svg>
        )}
        {grain > 0 && [...Array(30)].map((_, k) => <rect key={k} x={E.x} y={E.y + random(`bg${k}${f}`) * E.h} width={E.w} height={2 + 6 * random(`bh${k}${f}`)} fill="#ffffff" opacity={0.5 * grain * random(`bo${k}${f}`)} />)}
        <rect x={E.x} y={E.y} width={E.w} height={E.h} fill="#ffffff" opacity="0.05" />
      </g>
      {/* barre de son : 5 diodes (vert → rouge) */}
      {[0, 1, 2, 3, 4].map((k) => {
        const on = niveau * 5 > k + 0.2;
        const c = ['#3ad86a', '#3ad86a', '#c8e83a', '#ffb02a', '#ff3a3a'][k];
        return (
          <g key={k}>
            <circle cx={140 + k * 60} cy="530" r="16" fill={on ? c : '#c8c6c2'} />
            {on && <circle cx={140 + k * 60} cy="530" r="34" fill={c} opacity="0.35" />}
          </g>
        );
      })}
      {/* haut-parleur et boutons */}
      {[...Array(5)].map((_, r) => [...Array(9)].map((_, c) => <circle key={`${r}${c}`} cx={140 + c * 30} cy={600 + r * 26} r="6" fill="#b8b6b2" />))}
      <circle cx={BW / 2} cy={BH - 40} r="16" fill={alerte > 0.5 ? '#ff3a3a' : '#9ad8a8'} />
    </g>
  );
};
// tenu en main (CSS 3D), comme TelReel
export const BabyReel = ({f, pose, vib = [], mains = true, lueur = 0.4, ...b}) => {
  const {x = 540, y = 960, rx = 0, ry = 0, rz = 0, s = 1} = pose;
  const h = haptique(f, vib, 0.6);
  return (
    <AbsoluteFill style={{perspective: '1700px', perspectiveOrigin: `${x}px ${y}px`}}>
      <div style={{position: 'absolute', left: x - 420, top: y - 460, width: 840, height: 840, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(90,255,140,0.4), rgba(40,180,90,0.12) 55%, rgba(0,0,0,0))', opacity: lueur, filter: 'blur(30px)'}} />
      <div
        style={{
          position: 'absolute',
          left: x - BW / 2,
          top: y - BH / 2,
          width: BW,
          height: BH,
          transformStyle: 'preserve-3d',
          transform: `translateX(${h.dx}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz + h.rz}deg) scale(${s})`,
          filter: 'drop-shadow(0 50px 50px rgba(0,0,0,0.55))',
        }}
      >
        <svg width={BW} height={BH} viewBox={`0 0 ${BW} ${BH}`} style={{overflow: 'visible'}}>
          {mains && <MainsDerriere w={BW} h={BH} />}
          <Babyphone f={f} {...b} />
          {mains && <MainsDevant w={BW} h={BH} />}
        </svg>
      </div>
    </AbsoluteFill>
  );
};

// ===================== la vision nocturne (caméra du babyphone) =====================
// Enveloppe une vue (décor rendu avec une caméra) : teinte verte, grain, lignes, vignette, REC, heure qui défile.
export const VisionNocturne = ({f, id = 'nv', children, heure = '23:14', plein = false, parasites = 0}) => {
  const s = Math.floor(f / 30) % 60;
  return (
    <g>
      <defs>
        <filter id={`${id}-v`} colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="gamma" amplitude="0.2" exponent="1.1" offset="0" />
            <feFuncG type="gamma" amplitude="0.8" exponent="1.0" offset="0.02" />
            <feFuncB type="gamma" amplitude="0.24" exponent="1.1" offset="0" />
          </feComponentTransfer>
        </filter>
        <filter id={`${id}-g`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed={f % 97} />
          <feColorMatrix type="matrix" values="0 0 0 0 0.2  0 0 0 0 1  0 0 0 0 0.3  0 0 0 0.9 0" />
        </filter>
        <radialGradient id={`${id}-vi`} cx="540" cy="960" r="1100" gradientUnits="userSpaceOnUse">
          <stop offset="0.5" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.85" />
        </radialGradient>
      </defs>
      <g filter={`url(#${id}-v)`}>{children}</g>
      <rect width="1080" height="1920" filter={`url(#${id}-g)`} opacity={0.1 + 0.3 * parasites} />
      {[...Array(48)].map((_, k) => <rect key={k} x="0" y={k * 40 + ((f * 2) % 40)} width="1080" height="3" fill="#000" opacity="0.28" />)}
      {parasites > 0 && [...Array(10)].map((_, k) => <rect key={`p${k}`} x="0" y={random(`np${k}${f}`) * 1920} width="1080" height={10 + 50 * random(`nh${k}${f}`)} fill="#c8ffc8" opacity={0.4 * parasites * random(`no${k}${f}`)} />)}
      <rect width="1080" height="1920" fill={`url(#${id}-vi)`} />
      <g fontFamily="'DejaVu Sans Mono', monospace" fontWeight="700" fill="#c8ffc8" opacity="0.9" fontSize={plein ? 44 : 64}>
        <circle cx={plein ? 90 : 110} cy={plein ? 520 : 470} r={plein ? 14 : 20} fill="#ff3a3a" opacity={Math.floor(f / 15) % 2 ? 1 : 0.25} />
        <text x={plein ? 120 : 150} y={plein ? 535 : 492}>REC</text>
        <text x={plein ? 990 : 960} y={plein ? 535 : 492} textAnchor="end">CAM 1</text>
        <text x={plein ? 90 : 110} y={plein ? 1420 : 1160}>{`${heure}:${String(s).padStart(2, '0')}`}</text>
      </g>
    </g>
  );
};
