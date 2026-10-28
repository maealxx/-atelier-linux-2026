import {AbsoluteFill, Series, useCurrentFrame} from 'remotion';
import {montage} from './montage';
import {Finition} from './moteur';
import {TelReel} from './TelReel';
import {
  Anneau, Banque, Billet, BulleCommentaire, Cadre, Carte, ChapeauFete, Chiffre, Coche, Confettis, COSTUME, Couche, Cravate, DefsFlou, doux, ease, Easing, Eclat, Emo,
  Etiquette, Fig, Flux, Gerbe, IconeInsta, IconePlay, interpolate, KARIM, lerp, mainD, mainG, MiniTel, Ombre, P, PASSANTS, Piece, Pile, pop, random, Studio, Tampon, Tele,
  TEXTE, TITRE, Tuile, VENDEUR, versEcran, clamp,
} from './ParrainageKit';
import PLANS from './parrainage/plans.json';
import timeline from './parrainage/timeline.json';

// « Comment les banques gagnent de l'argent avec les parrainages » : vidéo explicative rapide, 2D / 2,5D,
// le bonhomme + des schémas animés (billets, banque, flux d'argent) dans un studio en dégradé.
const {decoupe, repere, SCENES} = montage(timeline, PLANS);
export const DUREE_PARRAINAGE = SCENES.reduce((t, [, d]) => t + d, 0);
const START = {};
SCENES.reduce((t, [nom, d]) => {
  START[nom] = t;
  return t + d;
}, 0);
const lisse = (t, d) => Easing.inOut(Easing.sin)(Math.min(1, t / Math.max(1, d)));

// ----- une image : studio + contenu dans le cadre caméra + éléments fixes + finition -----
const Ecran = ({fg, theme = 'violet', cam, t, children, dessus = null, sol = true, horizon, punch}) => (
  <AbsoluteFill style={{background: '#000'}}>
    <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
      <DefsFlou />
      <Cadre cam={cam} t={t} punch={punch}>
        <Studio f={fg} theme={theme} sol={sol} horizon={horizon} />
        {children}
      </Cadre>
      {dessus}
      <Finition f={fg} id="pf" grain={0.025} vignette={0.5} />
    </svg>
  </AbsoluteFill>
);
// caméra qui dérive doucement pendant le plan
const derive = (k, {x0 = -20, x1 = 20, y0 = 0, y1 = 0, z0 = 1, z1 = 1.06, r = 0} = {}) => ({x: lerp(x0, x1, k), y: lerp(y0, y1, k), z: lerp(z0, z1, k), r});

const scene = (nom, rendu) => {
  const C = () => {
    const f = useCurrentFrame();
    const {i, t, d, bornes} = decoupe(nom, f);
    return rendu({f, fg: START[nom] + f, i, t, d, k: lisse(t, d), bornes, R: (mot, def) => repere(nom, mot, def)});
  };
  C.displayName = nom;
  return C;
};

// bulle de notification qui sort du téléphone
const Notif = ({x, y, u, titre, texte, emo, c = '#3ad86a', ini = 'K', w = 560}) => (
  <g transform={`translate(${x} ${y}) scale(${u})`} opacity={Math.min(1, u * 1.5)}>
    <rect x={-w / 2 + 8} y="-56" width={w} height="124" rx="34" fill="#000" opacity="0.25" />
    <rect x={-w / 2} y="-62" width={w} height="124" rx="34" fill="#ffffff" />
    <circle cx={-w / 2 + 64} cy="0" r="38" fill={c} />
    <text x={-w / 2 + 64} y="14" textAnchor="middle" fontFamily={TEXTE} fontWeight="800" fontSize="38" fill="#fff">{ini}</text>
    <text x={-w / 2 + 120} y="-12" fontFamily={TEXTE} fontWeight="800" fontSize="30" fill="#111">{titre}</text>
    <text x={-w / 2 + 120} y="30" fontFamily={TEXTE} fontWeight="500" fontSize="28" fill="#444">{texte}</text>
    {emo && <Emo c={emo} x={w / 2 - 48} y={0} s={60} />}
  </g>
);

// ===================== 1. Ton pote t'envoie son lien le jour de ton anniv =====================
// carte « lien de parrainage » reçue dans la conversation (400 × 500)
const LienCarte = (age) => {
  const u = Math.min(1, age / 10);
  return (
    <g>
      <defs>
        <linearGradient id="lc-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff6aa6" />
          <stop offset="1" stopColor="#c8145a" />
        </linearGradient>
      </defs>
      <rect width="400" height="500" fill="#1c1f28" />
      <rect width="400" height="260" fill="url(#lc-g)" />
      <circle cx={320} cy={60} r={120} fill="#fff" opacity="0.08" />
      <g transform={`translate(200 110) scale(${0.8 + 0.2 * u})`}>
        <Billet x={0} y={0} s={0.62} rot={-8} id="lcb" />
      </g>
      <text x="200" y="224" textAnchor="middle" fontFamily={TITRE} fontSize="40" fill="#fff">100 € OFFERTS</text>
      <text x="30" y="310" fontFamily={TEXTE} fontWeight="800" fontSize="28" fill="#fff">Mon lien de parrainage</text>
      <text x="30" y="350" fontFamily={TEXTE} fontSize="23" fill="#9aa2b2">Ouvre ton compte avec mon code</text>
      <rect x="30" y="392" width="340" height="72" rx="36" fill="#ff2e7e" />
      <text x="200" y="438" textAnchor="middle" fontFamily={TEXTE} fontWeight="800" fontSize="28" fill="#fff">J'ouvre mon compte</text>
    </g>
  );
};
const Ballons = ({fg, dy = 0}) => (
  <g>
    {[[150, 520, 260, -8], [930, 430, 230, 10], [820, 1050, 190, 6], [90, 1180, 200, -12]].map(([x, y, s, r], k) => (
      <Emo key={k} c="1f388" x={x + 14 * Math.sin(fg / 25 + k)} y={y - ((fg * 0.6 + k * 140) % 300) * 0.3 + dy + 10 * Math.cos(fg / 20 + k)} s={s} rot={r + 5 * Math.sin(fg / 30 + k)} />
    ))}
  </g>
);
const Guirlande = ({fg}) => (
  <g>
    <path d={`M-100,180 Q540,${330 + 6 * Math.sin(fg / 20)} 1180,180`} stroke="#fff" strokeWidth="4" fill="none" opacity="0.7" />
    {[...Array(12)].map((_, k) => {
      const x = -40 + k * 100;
      const u = (x + 100) / 1280;
      const y = 180 + 4 * u * (1 - u) * (150 + 6 * Math.sin(fg / 20)) * 1.0;
      return <path key={k} d={`M${x - 34},${y} L${x + 34},${y} L${x},${y + 70} Z`} fill={['#ff2e7e', '#ffc83a', '#4fc3ff', '#3ad86a'][k % 4]} transform={`rotate(${4 * Math.sin(fg / 15 + k)} ${x} ${y})`} />;
    })}
  </g>
);
const Anniv = scene('anniv', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    // il fête son anniv, le téléphone vibre dans sa main : « Karim : Joyeux anniv frérot », puis le lien
    const blase = ease(f, R('jour', 55) - 6, R('jour', 55) + 6);
    const pose = {epauleD: -30, coudeD: 100, epauleG: 20, coudeG: -10, breath: Math.sin(fg / 7) * 4, smile: 0.9 * (1 - blase), eyes: lerp(1.15, 0.72, blase), pupilX: lerp(0, 10, blase), pupilY: lerp(0, 14, blase), worry: 0.25 * blase, tilt: lerp(-3, 4, blase)};
    const s = 1.55;
    const [hx, hy] = versEcran(540, 1880, s, mainD(pose));
    const vib = f < 40 ? Math.sin(f * 2.6) * 7 * Math.exp(-((f % 20) / 8)) : 0;
    const n1 = pop(f, R('pote', 8) - 2);
    const n2 = pop(f, R('boursorama', 35) - 2);
    return (
      <Ecran fg={fg} theme="rose" t={t} cam={derive(k, {x0: 30, x1: -10, y0: -40, y1: 0, z0: 1.12, z1: 1.02})} punch={0.1}>
        <Couche p={0.3}>
          <Guirlande fg={fg} />
          <Ballons fg={fg} />
        </Couche>
        <Couche p={1}>
          <Fig x={540} y={1880} s={s} {...pose} tete={<ChapeauFete />} />
          {/* le téléphone dans sa main, qui vibre et éclaire */}
          <circle cx={hx - 10} cy={hy - 90} r={220} fill="#ff9ac8" opacity={0.25 + 0.1 * Math.sin(f / 3)} filter="url(#flou14)" />
          <MiniTel x={hx - 12 + vib} y={hy - 100} s={0.62} rot={-6 + vib * 0.3} id="an-t">
            <rect x="-150" y="-300" width="300" height="600" fill="#2a1650" />
            <text x="0" y="-170" textAnchor="middle" fontFamily={TEXTE} fontWeight="300" fontSize="76" fill="#fff">00:01</text>
            <rect x="-128" y="-110" width="256" height="70" rx="18" fill="#fff" opacity={0.9 * n1} />
            <rect x="-128" y="-26" width="256" height="70" rx="18" fill="#fff" opacity={0.9 * n2} />
          </MiniTel>
        </Couche>
        <Couche p={1.25}>
          <Notif x={470} y={420 - 30 * n1} u={n1} titre="Karim" texte="Joyeux anniv frérot !!" emo="1f382" />
          <Notif x={600} y={580 - 30 * n2} u={n2} titre="Karim" texte="Inscris-toi avec mon lien" emo="1f517" />
        </Couche>
        <Confettis f={f} t0={-8} n={70} seed="an" />
      </Ecran>
    );
  }
  // vue subjective : la conversation avec Karim, ses messages tombent
  const msgs = [
    {t: R('joyeux', 86) - 2, texte: 'Joyeux anniv frérot !!'},
    {t: R('inscris-toi', 127) - 3, texte: 'Et inscris-toi avec MON CODE stp'},
    {t: R('code', 151) - 6, photo: LienCarte},
  ];
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill>
        <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
          <DefsFlou />
          <Cadre cam={derive(k, {z0: 1.05, z1: 1.12})} t={t}>
            <Studio f={fg} theme="rose" sol={false} />
            <Couche p={0.4} flou={8}>
              <Ballons fg={fg} dy={200} />
            </Couche>
          </Cadre>
        </svg>
      </AbsoluteFill>
      <TelReel f={f} pose={{x: 540, y: 1010 - 30 * k, rx: 8 - 4 * k, ry: -12 + 8 * k, rz: -4 + 3 * k, s: 1.0 + 0.1 * k}} vib={msgs.map((m) => m.t)} lueur={0.7} ecran="conv" nom="Karim" avatar="K" couleurAvatar="#3ad86a" statut="en ligne" messages={msgs} />
      <AbsoluteFill>
        <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
          <Confettis f={f} t0={60} n={30} seed="an2" />
          <Finition f={fg} id="pf2" grain={0.025} vignette={0.5} />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
});

// ===================== 2. Pourquoi une banque te file 100 balles ? Elle fait un calcul =====================
const Calculette = ({x, y, s = 1, f, v}) => (
  <g transform={`translate(${x} ${y}) scale(${s}) rotate(8)`}>
    <rect x="-150" y="-200" width="300" height="420" rx="36" fill="#000" opacity="0.3" transform="translate(10 16)" />
    <rect x="-150" y="-210" width="300" height="420" rx="36" fill="#2a2c3a" />
    <rect x="-120" y="-180" width="240" height="96" rx="16" fill="#b8f0c8" />
    <text x="104" y="-112" textAnchor="end" fontFamily={TITRE} fontSize="54" fill="#14583a">{v}</text>
    {[...Array(12)].map((_, j) => {
      const cx = -80 + (j % 3) * 80;
      const cy = -30 + Math.floor(j / 3) * 62;
      const appui = Math.floor(f / 4) % 12 === j;
      return <rect key={j} x={cx - 32} y={cy - 24 + (appui ? 4 : 0)} width="64" height="48" rx="12" fill={j % 3 === 2 ? P.rose : '#4a4c5e'} opacity={appui ? 0.7 : 1} />;
    })}
  </g>
);
const Pourquoi = scene('pourquoi', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    // la banque sort du sol ; il se gratte la tête
    const b = pop(f, R('banque', 28) - 4, {damping: 13, stiffness: 120});
    const q = pop(f, R('pourquoi', 8));
    const pose = {epauleG: 150, coudeG: 40, worry: 0.5, pupilX: -10, pupilY: -8, breath: Math.sin(fg / 7) * 3, tilt: -6};
    return (
      <Ecran fg={fg} theme="bleu" t={t} cam={derive(k, {y0: 60, y1: 0, z0: 1.0, z1: 1.07})}>
        <Couche p={0.9}>
          <g opacity={Math.min(1, b * 2)}>
            <Banque x={420} y={1250 + 500 * (1 - b)} s={0.95} lueur={0.5 * b} />
          </g>
        </Couche>
        <Couche p={1.1}>
          <Fig x={860} y={1640} s={0.62} {...pose} />
          <g transform={`translate(${900} ${880}) scale(${q})`}>
            <Emo c="1f914" x={0} y={0} s={150} rot={10 * Math.sin(f / 8)} />
          </g>
        </Couche>
      </Ecran>
    );
  }
  if (i === 1) {
    // un billet de 100 € tombe en tournoyant dans ses mains
    const tc = R('cent', 69) + 6;
    const u = ease(f, tc - 26, tc, Easing.out(Easing.quad));
    const pose = {epauleD: -30, coudeD: 100, epauleG: 30, coudeG: -100, breath: Math.sin(fg / 7) * 3, smile: f > tc ? 1 : 0.2, eyes: f > tc ? 1.3 : 1, pupilY: f > tc ? 8 : -10 + 18 * u};
    const s = 1.35;
    const [ax, ay] = versEcran(540, 1980, s, mainD(pose));
    const [bx, by] = versEcran(540, 1980, s, mainG(pose));
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2 - 40;
    const cb = pop(f, R('compte', 119) - 4);
    return (
      <Ecran fg={fg} theme="vert" t={t} cam={derive(k, {z0: 1.0, z1: 1.06, y0: 20, y1: -20})}>
        <Couche p={0.4}>
          {[...Array(8)].map((_, j) => (
            <Billet key={j} id={`pqf${j}`} x={100 + random(`pq${j}`) * 880} y={((fg * 3 + j * 260) % 2000) - 100} s={0.3} rot={fg * 2 + j * 40} flip={Math.cos(fg / 9 + j)} />
          ))}
        </Couche>
        <Couche p={1}>
          <Fig x={540} y={1980} s={s} {...pose} />
          <Billet id="pqb" x={lerp(620, mx, u)} y={lerp(-200, my, u)} s={0.9} rot={lerp(-140, -4, u)} flip={f > tc ? 1 : Math.cos((f - tc) / 3.2)} />
          <Eclat f={f} t0={tc} x={mx} y={my} r={260} c="#ffe28a" />
        </Couche>
        <Couche p={1.2}>
          <g transform={`translate(840 520) scale(${cb}) rotate(${8 - 8 * cb})`}>
            <Carte x={0} y={0} s={0.9} id="pqc" />
            <Coche x={150} y={-90} s={0.8} u={pop(f, R('compte', 119) + 4)} />
          </g>
        </Couche>
      </Ecran>
    );
  }
  // la banque te regarde… ses fenêtres se plissent : elle calcule
  const malin = ease(f, R('gentille', 151) - 6, R('gentille', 151) + 6);
  const cal = pop(f, R('fait', 176) - 6);
  const v = f < R('fait', 176) ? '0' : String(Math.min(1500, Math.round(((f - R('fait', 176)) / 18) * 1500)));
  return (
    <Ecran fg={fg} theme="nuit" t={t} cam={derive(k, {z0: 1.0, z1: 1.1, y0: 0, y1: -60})}>
      <Couche p={1}>
        <Banque x={540} y={1450} s={1.35} yeux={{ouvert: 1, px: Math.sin(f / 10) * 0.6 * (1 - malin), malin: 0.55 * malin}} lueur={0.4} />
      </Couche>
      <Couche p={1.3}>
        <g opacity={Math.min(1, cal * 1.5)}>
          <Calculette x={800} y={560 + 60 * (1 - cal)} s={0.8 * cal} f={f} v={v} />
        </g>
      </Couche>
    </Ecran>
  );
});

// ===================== 3. Un client coûte une fortune en pub, même si personne ne s'inscrit =====================
const Influenceuse = ({x, y, s, f}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <Anneau x={0} y={-150} r={90} />
    <Fig x={0} y={60} s={0.27} {...PASSANTS[0]} smile={0.9} epauleD={-150} coudeD={-20} breath={Math.sin(f / 5) * 4} ombre={false} />
  </g>
);
const Pub = scene('pub', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    // la banque cherche un client… et ça lui coûte une fortune
    const fl = ease(f, R('client', 22) - 4, R('client', 22) + 10);
    const fort = R('coûte', 58);
    return (
      <Ecran fg={fg} theme="violet" t={t} cam={derive(k, {x0: -30, x1: 30, z0: 1.02, z1: 1.08})}>
        <Couche p={0.9}>
          <Banque x={330} y={1240} s={0.75} lueur={0.3} yeux={{ouvert: 1, px: f < 40 ? Math.sin(f / 6) : 1}} />
          <Flux d="M520,840 C640,700 760,760 820,940" u={fl} c="#ffffff" f={f} points={false} w={8} />
          <Gerbe f={f} t0={fort} x={330} y={1060} n={22} force={900} seed="pg" />
          <Gerbe f={f} t0={R('fortune', 72)} x={330} y={1060} n={18} force={1000} seed="pg2" />
        </Couche>
        <Couche p={1.1}>
          <Fig x={840} y={1500} s={0.52} pupilX={-12} smile={0.2} breath={Math.sin(fg / 7) * 3} />
          <g transform={`translate(840 830) scale(${pop(f, R('client', 22))})`}>
            <circle r="74" fill="none" stroke="#fff" strokeWidth="8" strokeDasharray="20 14" transform={`rotate(${f * 3})`} />
          </g>
        </Couche>
      </Ecran>
    );
  }
  if (i === 1) {
    // les pubs : télé, Insta, YouTube, influenceurs ; les billets pleuvent dessus
    const tuiles = [
      [290, 560, 'pubs', 86, (s) => <Tele x={0} y={0} s={0.72 * s} ecran={<Emo c="1f3e6" x={0} y={-6} s={110} />} />],
      [790, 560, 'insta', 94, (s) => <IconeInsta x={0} y={0} s={0.85 * s} />],
      [290, 1040, 'youtube', 101, (s) => <IconePlay x={0} y={0} s={0.75 * s} />],
      [790, 1040, 'influenceurs', 111, (s) => <Influenceuse x={0} y={60} s={1.0 * s} f={f} />],
    ];
    return (
      <Ecran fg={fg} theme="rose" t={t} cam={derive(k, {z0: 1.0, z1: 1.05, y0: -20, y1: 20})} horizon={1400}>
        <Couche p={1}>
          {tuiles.map(([x, y, mot, def, icone], j) => {
            const u = pop(f, R(mot, def) - 3);
            return (
              <g key={j} transform={`translate(${x} ${y}) rotate(${(j % 2 ? 4 : -4) * (1 - u)}) scale(${u})`}>
                <Tuile x={0} y={0} w={420} h={420} c="#ffffff">
                  <g transform="translate(0 0)">{icone(1)}</g>
                </Tuile>
                {/* billets qui tombent dans la tuile */}
                {[0, 1, 2].map((q) => {
                  const a = (f * 1.6 + q * 18 + j * 9) % 54;
                  return <Billet key={q} id={`pb${j}${q}`} x={-80 + q * 80} y={-280 + a * 6} s={0.28} rot={a * 4 - 60} flip={Math.cos(a / 5)} />;
                })}
              </g>
            );
          })}
        </Couche>
      </Ecran>
    );
  }
  if (i === 2) {
    // le prix d'un client : l'étiquette monte jusqu'à 100 € et plus
    const v = interpolate(f, [R('peut', 133) - 4, R('euros', 155)], [0, 100], {...clamp, easing: Easing.out(Easing.cubic)});
    const fin = f >= R('euros', 155);
    const sw = Math.sin((f - 130) / 7) * 6 * Math.exp(-(f - 130) / 30);
    return (
      <Ecran fg={fg} theme="or" t={t} cam={derive(k, {z0: 1.0, z1: 1.08, y0: -40, y1: 0})}>
        <Couche p={0.55}>
          {/* les pubs tournent autour et l'argent file vers l'étiquette */}
          {[0, 1, 2, 3, 4].map((j) => {
            const a = (j / 5) * Math.PI * 2 + fg / 45;
            const x = 540 + Math.cos(a) * 360;
            const y = 700 + Math.sin(a) * 240;
            const u = ((f * 1.4 + j * 11) % 30) / 30;
            return (
              <g key={j}>
                <line x1={x} y1={y} x2="540" y2="520" stroke="#fff" strokeWidth="4" strokeDasharray="10 14" opacity="0.35" />
                <Billet id={`pcb${j}`} x={lerp(x, 540, u)} y={lerp(y, 540, u)} s={0.22} rot={u * 200} flip={Math.cos(u * 8)} />
                <Tuile x={x} y={y} s={0.62} w={260} h={260} c="#ffffff">
                  {[<Tele key="t" x={0} y={-10} s={0.62} ecran={<Emo c="1f3e6" x={0} y={-6} s={90} />} />, <IconeInsta key="i" x={0} y={0} s={0.8} />, <IconePlay key="p" x={0} y={0} s={0.7} />, <Influenceuse key="n" x={0} y={50} s={0.85} f={f} />, <Emo key="e" c="1f4fa" x={0} y={0} s={160} />][j]}
                </Tuile>
              </g>
            );
          })}
        </Couche>
        <Couche p={1}>
          <Fig x={540} y={1800} s={1.0} smile={0.3} eyes={fin ? 1.3 : 1} pupilY={-12} breath={Math.sin(fg / 7) * 3} worry={fin ? 0.5 : 0} />
          <g transform={`rotate(${sw} 540 200)`}>
            <Etiquette x={540} y={520} s={1.25} texte={`${Math.round(v)} €${fin ? '+' : ''}`} c={fin ? P.rose : P.or} ct={fin ? '#fff' : '#3a2400'} w={380} />
          </g>
          <Eclat f={f} t0={R('euros', 155)} x={540} y={520} r={330} c="#fff" />
        </Couche>
      </Ecran>
    );
  }
  // le panneau de pub dans la rue : les gens passent sans regarder ; compteur d'inscrits : 0
  const passe = (j, v) => ((fg * v + j * 520) % 1700) - 300;
  return (
    <Ecran fg={fg} theme="bleu" t={t} cam={derive(k, {x0: -40, x1: 40, z0: 1.03, z1: 1.08})} horizon={1330}>
      <Couche p={0.7}>
        {/* le panneau */}
        <rect x="300" y="900" width="26" height="460" fill="#3a3e58" />
        <rect x="754" y="900" width="26" height="460" fill="#3a3e58" />
        <rect x="150" y="380" width="780" height="560" rx="20" fill="#1a1c2a" />
        <rect x="170" y="400" width="740" height="520" rx="12" fill={P.rose} />
        <circle cx="760" cy="480" r="200" fill="#fff" opacity="0.08" />
        <Billet x={380} y={660} s={1.0} rot={-10} id="pnb" />
        <text x="740" y="640" textAnchor="middle" fontFamily={TITRE} fontSize="96" fill="#fff">100 €</text>
        <text x="740" y="720" textAnchor="middle" fontFamily={TEXTE} fontWeight="800" fontSize="40" fill="#fff">OFFERTS</text>
        <rect x="560" y="780" width="320" height="76" rx="38" fill="#fff" />
        <text x="720" y="830" textAnchor="middle" fontFamily={TEXTE} fontWeight="800" fontSize="32" fill={P.rose}>Inscris-toi</text>
        {/* spots du panneau */}
        {[260, 540, 820].map((x, j) => (
          <g key={j}>
            <path d={`M${x},360 L${x - 120},${940} L${x + 120},${940} Z`} fill="#fff6c8" opacity="0.07" />
            <rect x={x - 22} y="350" width="44" height="18" rx="6" fill="#2a2c3a" />
          </g>
        ))}
        {/* compteur d'inscrits */}
        <g transform={`translate(900 400) scale(${pop(f, R('personne', 232) - 4)})`}>
          <circle r="70" fill={P.rouge} />
          <text y="26" textAnchor="middle" fontFamily={TITRE} fontSize="74" fill="#fff">0</text>
        </g>
      </Couche>
      <Couche p={1.05}>
        {[0, 1, 2, 3].map((j) => {
          const v = j % 2 ? -3.2 : 3.6;
          const x = v > 0 ? passe(j, v) : 1380 - passe(j, -v);
          const m = Math.sin(fg / 3 + j);
          return (
            <Fig key={j} x={x} y={1640 + (j % 2) * 120} s={0.5 + (j % 2) * 0.06} {...PASSANTS[j]} legG={Math.max(0, m)} legD={Math.max(0, -m)} epauleG={10 * m} epauleD={10 * m} pupilX={v > 0 ? 12 : -12} breath={Math.abs(m) * 4} />
          );
        })}
        <Gerbe f={f} t0={R('paie', 214)} x={540} y={940} n={14} force={600} seed="pnd" />
      </Couche>
    </Ecran>
  );
});

// ===================== 4. Le parrainage : la banque paie seulement si tu ouvres ton compte =====================
const Porte = ({x, y, s = 1, etat = 0, ok = 0}) => (
  // etat : 0 fermée → 1 ouverte ; ok : 1 vert, -1 rouge
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <Ombre x={0} y={4} rx={200} ry={30} o={0.4} />
    <rect x="-160" y="-520" width="320" height="520" rx="16" fill="#2a2c3a" />
    <rect x="-140" y="-500" width="280" height="500" fill="#fff6d8" opacity={0.85 * etat} />
    <path d={`M-140,-500 L${-140 + 280 * (1 - etat * 0.75)},${-500 + 30 * etat} L${-140 + 280 * (1 - etat * 0.75)},${-30 * etat} L-140,0 Z`} fill="#5a4ac8" />
    <circle cx={-140 + 250 * (1 - etat * 0.75)} cy="-250" r="12" fill="#ffc83a" />
    <rect x="-90" y="-600" width="180" height="64" rx="32" fill={ok > 0 ? P.vert : ok < 0 ? P.rouge : '#4a4c5e'} />
    <circle cx="0" cy="-568" r="16" fill="#fff" opacity={Math.abs(ok) > 0 ? 1 : 0.3} />
  </g>
);
const Parrainage = scene('parrainage', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    // la carte se retourne : PUB → PARRAINAGE
    const r = ease(f, R('linverse', 30) - 8, R('linverse', 30) + 6, Easing.inOut(Easing.cubic));
    const a = Math.cos(r * Math.PI);
    const dos = a < 0;
    return (
      <Ecran fg={fg} theme={dos ? 'vert' : 'rouge'} t={t} cam={derive(k, {z0: 1.0, z1: 1.05})}>
        <Couche p={1}>
          <Ombre x={540} y={1300} rx={330} ry={40} />
          <g transform={`translate(540 800) scale(${Math.max(0.02, Math.abs(a))} 1) rotate(${4 * Math.sin(f / 12)})`}>
            <rect x="-340" y="-440" width="680" height="880" rx="56" fill={dos ? '#16a34a' : '#e03a4a'} />
            <rect x="-340" y="-440" width="680" height="380" rx="56" fill="#fff" opacity="0.1" />
            {!dos ? (
              <g>
                <Tele x={0} y={-120} s={1.3} ecran={<Emo c="1f4b8" x={0} y={-6} s={120} />} />
                <text x="0" y="250" textAnchor="middle" fontFamily={TITRE} fontSize="110" fill="#fff">PUB</text>
                {[0, 1, 2].map((q) => {
                  const u = ((f + q * 12) % 36) / 36;
                  return <Billet key={q} id={`pf${q}`} x={-120 + q * 120 + u * 200} y={60 - u * 300} s={0.32} rot={-20 + u * 60} flip={Math.cos(u * 8)} />;
                })}
              </g>
            ) : (
              <g>
                <Fig x={-140} y={160} s={0.42} smile={0.9} epauleD={-60} coudeD={40} ombre={false} />
                <Fig x={140} y={160} s={0.42} {...KARIM} smile={0.9} epauleG={60} coudeG={-40} ombre={false} />
                <Emo c="1f517" x={0} y={-160} s={150} />
                <text x="0" y="300" textAnchor="middle" fontFamily={TITRE} fontSize="80" fill="#fff">PARRAINAGE</text>
              </g>
            )}
          </g>
        </Couche>
      </Ecran>
    );
  }
  const bq = [260, 1000];
  const porte = [800, 1560];
  if (i === 1) {
    // tu passes la porte « compte ouvert » → l'argent part de la banque
    const tc = R('compte', 104);
    const marcheU = ease(f, 48, tc - 6, Easing.inOut(Easing.sin));
    const m = Math.sin(fg / 3);
    const ouvert = ease(f, tc - 20, tc - 8);
    const fl = ease(f, tc, tc + 12);
    const arrive = ease(f, tc + 2, tc + 22, Easing.inOut(Easing.cubic));
    return (
      <Ecran fg={fg} theme="vert" t={t} cam={derive(k, {x0: -20, x1: 20, z0: 1.0, z1: 1.05})} horizon={1300}>
        <Couche p={0.9}>
          <Banque x={bq[0]} y={bq[1]} s={0.55} lueur={0.4 * fl} />
          <Flux d={`M${bq[0] + 120},${bq[1] - 320} C${500},${520} ${700},${640} ${porte[0]},${porte[1] - 700}`} u={fl} f={f} c={P.or} />
          {arrive > 0 && arrive < 1 && <Billet id="pab" x={lerp(bq[0] + 120, porte[0], arrive)} y={lerp(bq[1] - 320, porte[1] - 700, arrive) - Math.sin(arrive * Math.PI) * 220} s={0.5} rot={arrive * 360} flip={Math.cos(arrive * 9)} />}
          <Porte x={porte[0]} y={porte[1]} s={0.95} etat={ouvert} ok={ouvert > 0.5 ? 1 : 0} />
          <Eclat f={f} t0={tc + 22} x={porte[0]} y={porte[1] - 700} c="#ffe28a" />
        </Couche>
        <Couche p={1.05}>
          <Fig x={lerp(1250, porte[0], marcheU)} y={porte[1] + 20} s={0.6} smile={0.6} legG={marcheU < 1 ? Math.max(0, m) : 0} legD={marcheU < 1 ? Math.max(0, -m) : 0} epauleG={marcheU < 1 ? 10 * m : 0} breath={Math.sin(fg / 7) * 3} />
          <Fig x={430} y={1720} s={0.58} {...KARIM} smile={0.9} pupilX={12} epauleD={-150} coudeD={-30 + 20 * Math.sin(f / 4)} breath={Math.sin(fg / 6) * 3} />
          {f > tc + 22 && <Piece x={430} y={1240 - 30 * Math.sin((f - tc) / 6)} r={44} tourne={(f - tc) / 30} />}
        </Couche>
      </Ecran>
    );
  }
  // personne : la porte reste fermée, la banque garde son argent → zéro risque
  const croix = pop(f, R('client', 129) - 4);
  const cad = pop(f, R('prime', 149) - 4);
  return (
    <Ecran fg={fg} theme="nuit" t={t} cam={derive(k, {z0: 1.02, z1: 1.1})} horizon={1300}>
      <Couche p={0.9}>
        <Banque x={bq[0]} y={bq[1]} s={0.55} />
        <g transform={`translate(${bq[0]} ${bq[1] - 240}) scale(${cad})`}>
          <Emo c="1f512" x={0} y={0} s={170} />
        </g>
        <Porte x={porte[0]} y={porte[1]} s={0.95} etat={0} ok={croix > 0.5 ? -1 : 0} />
        <Coche x={porte[0]} y={porte[1] - 260} s={1.4} u={croix} ok={false} />
        <Tampon f={f} t0={R('zéro', 162) - 2} x={540} y={560} texte="ZÉRO RISQUE" />
      </Couche>
    </Ecran>
  );
});

// ===================== 5. Tu crois plus ton pote qu'une pub. Ton pote = un commercial =====================
const Pote = scene('pote', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    // la balance de la confiance : ton pote pèse plus lourd que la pub
    const a = -13 * ease(f, R('pote', 34) - 8, R('pote', 34) + 10, Easing.out(Easing.back(1.6)));
    const r = (a * Math.PI) / 180;
    const L = 330;
    const cx = 540;
    const cy = 620;
    const g = [cx - L * Math.cos(r), cy - L * Math.sin(r)];
    const d = [cx + L * Math.cos(r), cy + L * Math.sin(r)];
    const plateau = ([x, y], contenu) => (
      <g>
        <line x1={x} y1={y} x2={x - 150} y2={y + 300} stroke="#e8e4f8" strokeWidth="5" />
        <line x1={x} y1={y} x2={x + 150} y2={y + 300} stroke="#e8e4f8" strokeWidth="5" />
        <path d={`M${x - 190},${y + 300} Q${x},${y + 390} ${x + 190},${y + 300} Z`} fill="#c8c4e8" />
        <g transform={`translate(${x} ${y + 300})`}>{contenu}</g>
      </g>
    );
    const coeurs = ease(f, R('pote', 34), R('pote', 34) + 30);
    return (
      <Ecran fg={fg} theme="bleu" t={t} cam={derive(k, {z0: 1.02, z1: 1.07, y0: 30, y1: -10})} horizon={1500}>
        <Couche p={1}>
          <rect x="522" y="620" width="36" height="820" rx="10" fill="#e8e4f8" />
          <path d="M420,1460 L660,1460 L620,1400 L460,1400 Z" fill="#c8c4e8" />
          <circle cx={cx} cy={cy} r="30" fill="#ffc83a" />
          <line x1={g[0]} y1={g[1]} x2={d[0]} y2={d[1]} stroke="#f4f2fc" strokeWidth="22" strokeLinecap="round" />
          {plateau(g, (
            <g>
              <Fig x={0} y={-6} s={0.34} {...KARIM} smile={0.9} epauleD={-150} coudeD={-20} ombre={false} breath={Math.sin(fg / 6) * 3} />
              {[0, 1, 2].map((q) => (
                <Emo key={q} c="1f44d" x={-80 + q * 80} y={-380 - coeurs * 60 - q * 20} s={70} o={coeurs * (1 - Math.max(0, coeurs - 0.8) * 3)} />
              ))}
            </g>
          ))}
          {plateau(d, <Tele x={0} y={-80} s={0.55} ecran={<Emo c="1f4b8" x={0} y={-6} s={90} />} />)}
        </Couche>
        <Couche p={1.15}>
          <Fig x={540} y={1840} s={0.6} pupilX={-14} pupilY={-10} smile={0.5} breath={Math.sin(fg / 7) * 3} />
        </Couche>
      </Ecran>
    );
  }
  // il tourne sur lui-même… et revient en costard de commercial ; une pièce pour lui
  const tc = R('commercial', 94);
  const rot = ease(f, tc - 10, tc + 4, Easing.inOut(Easing.cubic));
  const sx = Math.cos(rot * Math.PI * 2);
  const costard = rot > 0.25;
  const tp = R('payé', 112);
  const u = ease(f, tp - 8, tp + 6, Easing.in(Easing.quad));
  const pose = {epauleD: -40, coudeD: -70, epauleG: 20, coudeG: 10, smile: costard ? 1 : 0.6, eyes: costard ? 1.15 : 1, breath: Math.sin(fg / 6) * 4};
  const s = 1.3;
  const [hx, hy] = versEcran(540, 1960, s, mainD(pose));
  return (
    <Ecran fg={fg} theme="rose" t={t} cam={derive(k, {z0: 1.0, z1: 1.06})}>
      <Couche p={0.5}>
        {[0, 1].map((q) => (
          <path key={q} d={`M${q ? 1180 : -100},-100 L${q ? 640 : 440},1600 L${q ? 900 : 180},1600 Z`} fill="#fff6d8" opacity={0.07 + 0.03 * Math.sin(fg / 9 + q)} />
        ))}
        {/* tableau des ventes */}
        <g transform="translate(40 300) rotate(-4)">
          <rect x="0" y="0" width="380" height="300" rx="20" fill="#ffffff" />
          <rect x="0" y="0" width="380" height="60" rx="20" fill={P.rose} />
          <text x="190" y="42" textAnchor="middle" fontFamily={TITRE} fontSize="30" fill="#fff">FILLEULS</text>
          {[0, 1, 2, 3, 4].map((j) => {
            const h = (40 + j * 38) * ease(f, 76 + j * 5, 96 + j * 5);
            return <rect key={j} x={40 + j * 64} y={270 - h} width="44" height={h} rx="8" fill={j === 4 ? P.vert : '#c8c4e8'} />;
          })}
        </g>
        {/* affiche de la banque */}
        <g transform="translate(760 260) rotate(5)">
          <rect x="0" y="0" width="280" height="380" rx="20" fill={P.rose} />
          <circle cx="140" cy="130" r="80" fill="#fff" opacity="0.2" />
          <text x="140" y="160" textAnchor="middle" fontFamily={TITRE} fontSize="90" fill="#fff">€</text>
          <text x="140" y="280" textAnchor="middle" fontFamily={TITRE} fontSize="52" fill="#fff">100 €</text>
          <text x="140" y="330" textAnchor="middle" fontFamily={TEXTE} fontWeight="800" fontSize="26" fill="#fff">OFFERTS</text>
        </g>
      </Couche>
      <Couche p={1.25}>
        {/* les nouveaux clients qu'il ramène */}
        {[[170, 820], [920, 860], [130, 1120], [960, 1150]].map(([x, y], j) => {
          const u = pop(f, tc + 8 + j * 6);
          return (
            <g key={j} transform={`translate(${x} ${y + 8 * Math.sin(f / 9 + j)}) scale(${u})`}>
              <circle r="62" fill="#fff" />
              <clipPath id={`fl${j}`}>
                <circle r="56" />
              </clipPath>
              <g clipPath={`url(#fl${j})`}>
                <Fig x={0} y={300} s={0.4} {...PASSANTS[j]} smile={0.6} ombre={false} />
              </g>
              <circle cx="46" cy="-46" r="24" fill={P.vert} />
              <text x="46" y="-36" textAnchor="middle" fontFamily={TITRE} fontSize="28" fill="#fff">+1</text>
            </g>
          );
        })}
      </Couche>
      <Couche p={1}>
        <g transform={`translate(540 0) scale(${Math.max(0.03, Math.abs(sx))} 1) translate(-540 0)`}>
          <Fig x={540} y={1960} s={s} {...(costard ? COSTUME : KARIM)} {...pose} devant={costard ? <Cravate /> : null} />
        </g>
        {costard && (
          <g transform={`translate(${versEcran(540, 1960, s, [336, 376])[0]} ${versEcran(540, 1960, s, [336, 376])[1]}) scale(${pop(f, tc + 6)})`}>
            <circle r="30" fill="#ffc83a" />
            <Emo c="1f3af" x={0} y={0} s={40} />
          </g>
        )}
        <Eclat f={f} t0={tc + 4} x={540} y={900} r={420} c="#ffffff" />
        {f >= tp - 8 && <Piece x={lerp(1000, hx, u)} y={lerp(200, hy - 30, u)} r={46} tourne={f / 14} />}
        <Eclat f={f} t0={tp + 6} x={hx} y={hy - 30} r={160} c="#ffe28a" seed="pt" />
      </Couche>
    </Ecran>
  );
});

// ===================== 6. Les conditions : payer avec la carte, verser de l'argent → client actif =====================
const Conditions = scene('conditions', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    const loupe = ease(f, R('conditions', 18) - 8, R('conditions', 18) + 14);
    const l1 = pop(f, R('payer', 34) - 4);
    const c1 = pop(f, R('carte', 53));
    const l2 = pop(f, R('parfois', 64) - 2);
    const c2 = pop(f, R('largent', 87));
    const ligne = (y, u, c, icone, texte) => (
      <g transform={`translate(0 ${y}) scale(${u})`} opacity={Math.min(1, u * 1.4)}>
        <rect x="-290" y="-70" width="580" height="140" rx="30" fill="#f4f2fc" />
        <g transform="translate(-210 0)">{icone}</g>
        <text x="-130" y="12" fontFamily={TEXTE} fontWeight="800" fontSize="33" fill="#1b1a2e">{texte}</text>
        <rect x="170" y="-36" width="72" height="72" rx="18" fill="#fff" stroke="#c8c4e8" strokeWidth="5" />
        <g transform="translate(206 0)">
          <Coche x={0} y={0} s={0.62} u={c} />
        </g>
      </g>
    );
    return (
      <Ecran fg={fg} theme="violet" t={t} cam={derive(k, {z0: 1.0, z1: 1.06, y0: -20, y1: 20})}>
        <Couche p={1}>
          <Ombre x={560} y={1290} rx={360} ry={40} />
          {/* la feuille, légèrement inclinée en perspective */}
          <g transform="translate(540 760) skewX(-3) rotate(-3)">
            <rect x="-330" y="-470" width="660" height="940" rx="28" fill="#ffffff" />
            <rect x="-330" y="-470" width="660" height="110" rx="28" fill={P.rose} />
            <text x="0" y="-398" textAnchor="middle" fontFamily={TITRE} fontSize="48" fill="#fff">CONDITIONS</text>
            {[...Array(7)].map((_, j) => (
              <rect key={j} x="-270" y={-320 + j * 34} width={540 - (j % 3) * 90} height="12" rx="6" fill="#d8d4ec" />
            ))}
            {ligne(60, l1, c1, <Carte x={0} y={0} s={0.3} id="cdc" nfc={c1} />, 'Payer par carte')}
            {ligne(250, l2, c2, <Billet x={0} y={0} s={0.32} id="cdb" />, 'Verser de l’argent')}
          </g>
        </Couche>
        <Couche p={1.25}>
          {/* la loupe sur les petites lignes */}
          <g transform={`translate(${lerp(1180, 640, loupe) + 30 * Math.sin(f / 12) * loupe} ${lerp(200, 380, loupe)}) rotate(-20)`} opacity={loupe * (1 - ease(f, 40, 52))}>
            <circle r="130" fill="#ffffff" opacity="0.25" />
            <circle r="130" fill="none" stroke="#2a2c3a" strokeWidth="22" />
            <rect x="-20" y="140" width="40" height="190" rx="18" fill="#2a2c3a" />
            {[0, 1, 2].map((j) => <rect key={j} x="-90" y={-50 + j * 40} width={170 - j * 30} height="18" rx="9" fill="#9a94c8" />)}
          </g>
        </Couche>
      </Ecran>
    );
  }
  // « c'est pas pour t'embêter » → il devient un vrai client actif (jauge de niveau)
  const relou = ease(f, R('tembêter', 117) - 6, R('tembêter', 117) + 4) * (1 - ease(f, R('que', 143), R('que', 143) + 8));
  const jauge = ease(f, R('deviennes', 154) - 4, R('actif', 198), Easing.inOut(Easing.cubic));
  const fini = f >= R('actif', 198) - 2;
  const pose = {worry: 0.6 * relou, eyes: fini ? 1.25 : lerp(1, 0.75, relou), smile: fini ? 1 : 0.4 * jauge, pupilX: fini ? 0 : -6 * relou, epauleD: fini ? -150 : -10, coudeD: fini ? -20 : 10, epauleG: fini ? 150 : 10, coudeG: fini ? 20 : -10, breath: Math.sin(fg / 6) * 4, brows: 6 * relou};
  return (
    <Ecran fg={fg} theme={fini ? 'or' : 'vert'} t={t} cam={derive(k, {z0: 1.0, z1: 1.06})}>
      <Couche p={0.5}>
        <circle cx="540" cy="980" r={380 + 60 * jauge} fill="#fff6c8" opacity={0.12 * jauge} filter="url(#flou14)" />
        {/* la banque en fond, qui surveille */}
        <g opacity={0.6 * (1 - jauge)}>
          <Banque x={880} y={1250} s={0.45} yeux={{ouvert: 1, px: -0.8}} />
        </g>
        {/* le contrat qui s'envole quand il râle */}
        <g transform={`translate(${200 - 40 * relou} ${700 - 30 * Math.sin(f / 10)}) rotate(${-12 + 6 * Math.sin(f / 8)})`} opacity={1 - jauge}>
          <rect x="-110" y="-150" width="220" height="300" rx="14" fill="#fff" />
          <rect x="-110" y="-150" width="220" height="44" rx="14" fill={P.rose} />
          {[...Array(6)].map((_, j) => <rect key={j} x="-80" y={-80 + j * 34} width={150 - (j % 2) * 40} height="10" rx="5" fill="#d8d4ec" />)}
        </g>
      </Couche>
      <Couche p={1.15}>
        {/* ses opérations s'enchaînent : il devient actif */}
        {[['1f959', 'Kebab', '− 9 €', 200, 820], ['1f4b3', 'Paiement CB', '− 23 €', 880, 900], ['1f4b6', 'Virement', '+ 500 €', 200, 1110], ['1f697', 'Essence', '− 40 €', 880, 1160], ['1f4f1', 'Forfait', '− 20 €', 880, 650]].map(([e, n, m, x, y], j) => {
          const u = pop(f, R('deviennes', 154) - 4 + j * 8);
          return (
            <g key={j} transform={`translate(${x} ${y + 6 * Math.sin(f / 10 + j)}) scale(${u})`} opacity={Math.min(1, u * 1.5)}>
              <rect x="-150" y="-44" width="300" height="88" rx="24" fill="#000" opacity="0.2" transform="translate(6 10)" />
              <rect x="-150" y="-44" width="300" height="88" rx="24" fill="#fff" />
              <Emo c={e} x={-104} y={0} s={52} />
              <text x="-66" y="-4" fontFamily={TEXTE} fontWeight="700" fontSize="22" fill="#333">{n}</text>
              <text x="-66" y="26" fontFamily={TITRE} fontSize="24" fill={m[0] === '+' ? P.vert : '#555'}>{m}</text>
            </g>
          );
        })}
      </Couche>
      <Couche p={1}>
        <Fig x={540} y={1840} s={1.05} {...pose} />
        {/* anneau de scan qui monte */}
        {jauge > 0 && jauge < 1 && <ellipse cx="540" cy={1820 - 900 * jauge} rx={300} ry={50} fill="none" stroke="#86efac" strokeWidth="10" opacity={0.8} />}
      </Couche>
      <Couche p={1.2}>
        {/* la jauge « client actif » */}
        <g transform={`translate(540 430) scale(${pop(f, R('deviennes', 154) - 6)})`}>
          <rect x="-360" y="-60" width="720" height="120" rx="60" fill="#14123a" opacity="0.6" />
          <rect x="-340" y="-40" width={680 * Math.max(0.05, jauge)} height="80" rx="40" fill={fini ? P.or : P.vert} />
          <rect x="-340" y="-40" width={680 * Math.max(0.05, jauge)} height="30" rx="15" fill="#fff" opacity="0.25" />
          <text x="0" y="-90" textAnchor="middle" fontFamily={TITRE} fontSize="54" fill="#fff">CLIENT ACTIF</text>
          <Emo c="1f525" x={-340 + 680 * Math.max(0.05, jauge)} y={0} s={90} />
        </g>
        <Eclat f={f} t0={R('actif', 198) - 2} x={540} y={430} r={460} c="#ffe28a" />
        {fini && <Confettis f={f} t0={R('actif', 198) - 6} n={40} seed="cd" dense={0.3} />}
      </Couche>
    </Ecran>
  );
});

// ===================== 7. Le kebab : le commerçant paie une commission, ta banque en touche une partie =====================
const TPE = ({x, y, s = 1, ok = 0}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-90" y="-150" width="180" height="290" rx="30" fill="#2a2c3a" />
    <rect x="-68" y="-126" width="136" height="100" rx="12" fill={ok ? '#22c55e' : '#7ad0ff'} />
    {ok ? <path d="M-24,-76 L-6,-58 L26,-96" stroke="#fff" strokeWidth="12" fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
    {[...Array(9)].map((_, j) => <rect key={j} x={-60 + (j % 3) * 44} y={0 + Math.floor(j / 3) * 40} width="32" height="28" rx="8" fill="#4a4c5e" />)}
  </g>
);
const Kebab = scene('kebab', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    // un client actif, ça rapporte : les pièces tombent dans la banque
    return (
      <Ecran fg={fg} theme="or" t={t} cam={derive(k, {z0: 1.0, z1: 1.08, y0: -20, y1: 10})}>
        <Couche p={0.6}>
          {[...Array(14)].map((_, j) => {
            const y = ((f * 14 + j * 150) % 1300) - 200;
            return <Piece key={j} x={300 + random(`kp${j}`) * 480} y={y} r={30} tourne={f / 15 + j / 7} o={y < 820 ? 1 : 0} />;
          })}
        </Couche>
        <Couche p={1}>
          <Banque x={540} y={1300} s={0.9} lueur={0.6 + 0.2 * Math.sin(f / 4)} />
        </Couche>
      </Ecran>
    );
  }
  if (i === 1) {
    // tu payes ton kebab par carte : bip, validé
    const tb = R('carte', 69);
    const approche = ease(f, 44, tb, Easing.inOut(Easing.cubic));
    const ok = f > tb + 2;
    const bras = {epauleD: lerp(-10, -140, approche), coudeD: lerp(10, 60, approche)};
    const main0 = versEcran(lerp(120, 200, approche), 1950, 1.35, mainD(bras));
    return (
      <Ecran fg={fg} theme="rouge" t={t} cam={derive(k, {z0: 1.02, z1: 1.08, x0: 20, x1: -20})} horizon={1200}>
        <Couche p={0.5}>
          {/* le menu lumineux derrière le comptoir */}
          <rect x="120" y="260" width="840" height="300" rx="24" fill="#1a1020" />
          {[0, 1, 2].map((j) => (
            <g key={j}>
              <rect x={150 + j * 270} y="290" width="240" height="240" rx="18" fill="#fff6e0" opacity="0.92" />
              <Emo c="1f959" x={270 + j * 270} y={390} s={140} />
              <text x={270 + j * 270} y="510" textAnchor="middle" fontFamily={TITRE} fontSize="40" fill="#c8145a">{['8 €', '9 €', '10 €'][j]}</text>
            </g>
          ))}
          <text x="540" y="230" textAnchor="middle" fontFamily={TITRE} fontSize="90" fill="#ffd23a" opacity={0.85 + 0.15 * Math.sin(fg / 3)}>KEBAB</text>
        </Couche>
        <Couche p={0.8}>
          <Fig x={720} y={1300} s={0.78} {...VENDEUR} smile={0.8} pupilX={-12} pupilY={8} breath={Math.sin(fg / 7) * 3} epauleG={30} coudeG={-60} />
          {/* le comptoir */}
          <rect x="-100" y="1080" width="1280" height="900" fill="#c8a888" />
          {[...Array(8)].map((_, j) => <rect key={j} x={-100 + j * 170} y="1110" width="150" height="800" rx="8" fill="#d8bc9c" />)}
          <rect x="-100" y="1050" width="1280" height="50" rx="10" fill="#f4ece4" />
          <TPE x={600} y={940} s={0.85} ok={ok} />
          <Emo c="1f959" x={900} y={960} s={220} />
          {ok && <Eclat f={f} t0={tb + 2} x={600} y={860} r={200} c="#86efac" />}
          {[0, 1, 2].map((q) => {
            const o = f > tb - 6 && !ok ? 0.8 * Math.max(0, Math.sin((f - tb) / 2 + q)) : 0;
            return <path key={q} d={`M${530 - q * 26},${760 - q * 20} q${-14 - q * 6},${40 + q * 10} 0,${80 + q * 20}`} stroke="#fff" strokeWidth="8" fill="none" strokeLinecap="round" opacity={o} />;
          })}
        </Couche>
        <Couche p={1.3}>
          {/* toi, de dos, tu tends ta carte vers le terminal */}
          <Fig x={lerp(120, 200, approche)} y={1950} s={1.35} dos {...bras} breath={Math.sin(fg / 7) * 3} ombre={false} />
          <Carte x={main0[0] + 20} y={main0[1] - 30} s={0.6} rot={lerp(20, -24, approche)} id="kbc" nfc={ok ? 1 : 0} />
        </Couche>
      </Ecran>
    );
  }
  // le schéma : 10 € de la carte au commerçant ; une petite commission part vers ta banque
  const f1 = ease(f, 86, 100);
  const tcom = R('commission', 107);
  const f2 = ease(f, tcom - 4, tcom + 12);
  const bq = pop(f, R('banque', 130) - 6);
  const piece = ease(f, R('banque', 130), R('partie', 156), Easing.inOut(Easing.cubic));
  const A = [260, 470];
  const B = [820, 470];
  const C = [540, 1180];
  const u1 = ((f - 86) % 30) / 30;
  return (
    <Ecran fg={fg} theme="nuit" t={t} cam={derive(k, {z0: 1.0, z1: 1.05})} horizon={1420}>
      <Couche p={1}>
        <Flux d={`M${A[0] + 120},${A[1]} L${B[0] - 140},${B[1]}`} u={f1} f={f} c={P.vert} />
        <Flux d={`M${B[0]},${B[1] + 170} C${B[0]},${900} ${C[0] + 200},${820} ${C[0] + 80},${C[1] - 420}`} u={f2} f={f} c={P.or} />
        <Tuile x={A[0]} y={A[1]} s={pop(f, 84)} c="#ffffff" w={250} h={250}>
          <Carte x={0} y={0} s={0.52} id="kc2" />
        </Tuile>
        <Tuile x={B[0]} y={B[1]} s={pop(f, R('commerçant', 87) - 2)} c="#ffffff" w={250} h={250}>
          <Emo c="1f959" x={0} y={0} s={170} />
        </Tuile>
        {f1 > 0.9 && <g opacity={1 - Math.max(0, u1 - 0.8) * 5}><Billet id="kb10" x={lerp(A[0] + 140, B[0] - 150, u1)} y={A[1] - 20} s={0.38} /></g>}
        <g transform={`translate(${B[0] - 30} ${B[1] + 230}) scale(${pop(f, tcom - 4)})`}>
          <rect x="-110" y="-44" width="220" height="88" rx="44" fill={P.rouge} />
          <text y="18" textAnchor="middle" fontFamily={TITRE} fontSize="48" fill="#fff">− 1 %</text>
        </g>
        <g transform={`translate(${C[0]} ${C[1] - 60 * (1 - bq)}) scale(${bq})`} opacity={Math.min(1, bq * 2)}>
          <Banque x={0} y={0} s={0.6} lueur={0.5 * piece} />
        </g>
        {f >= R('banque', 130) && piece < 1 && <Piece x={lerp(B[0], C[0] + 80, piece)} y={lerp(B[1] + 230, C[1] - 420, piece) - Math.sin(piece * Math.PI) * 120} r={40} tourne={piece * 3} />}
        <Eclat f={f} t0={R('partie', 156)} x={C[0]} y={C[1] - 330} c="#ffe28a" />
      </Couche>
    </Ecran>
  );
});

// ===================== 8. L'argent qui dort sur ton compte, elle le fait bosser =====================
const AppBanque = ({solde, rouge = 0, children}) => (
  <g>
    <rect x="-150" y="-300" width="300" height="600" fill="#f6f4fc" />
    <rect x="-150" y="-300" width="300" height="190" fill={P.rose} />
    <text x="-120" y="-226" fontFamily={TEXTE} fontWeight="600" fontSize="20" fill="#fff" opacity="0.85">Mon compte</text>
    <text x="-120" y="-170" fontFamily={TITRE} fontSize="44" fill={rouge ? '#ffe0e0' : '#fff'}>{solde}</text>
    {children}
  </g>
);
const Dort = scene('dort', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    // dans l'appli : les billets dorment dans un lit
    return (
      <Ecran fg={fg} theme="nuit" t={t} cam={derive(k, {z0: 1.0, z1: 1.06})}>
        <Couche p={1}>
          <MiniTel x={540} y={860} s={1.75} id="dt">
            <AppBanque solde="1 250,00 €">
              {/* le lit */}
              <rect x="-120" y="40" width="240" height="90" rx="16" fill="#8a5aff" />
              <rect x="-130" y="-20" width="30" height="170" rx="10" fill="#5a3ac8" />
              <rect x="-100" y="0" width="70" height="46" rx="14" fill="#fff" />
              {[0, 1, 2].map((j) => (
                <Billet key={j} id={`dtb${j}`} x={-10 + j * 20} y={30 - j * 22 + 2 * Math.sin(fg / 10 + j)} s={0.42} rot={-4} yeux={{ferme: true}} />
              ))}
              <rect x="-110" y="60" width="230" height="80" rx="16" fill="#a88aff" />
              <Emo c="1f4a4" x={90} y={-80 - 10 * Math.sin(fg / 9)} s={70} />
              <circle cx="100" cy="230" r="30" fill="#ffd866" />
              <circle cx="112" cy="222" r="26" fill="#f6f4fc" />
            </AppBanque>
          </MiniTel>
        </Couche>
      </Ecran>
    );
  }
  // ils se réveillent, mettent le casque et partent bosser : prêtés à d'autres
  const tb = R('bosser', 73);
  return (
    <Ecran fg={fg} theme="violet" t={t} cam={derive(k, {x0: -30, x1: 40, z0: 1.0, z1: 1.04})} horizon={1350}>
      <Couche p={0.9}>
        <MiniTel x={230} y={980} s={0.9} rot={-6} id="dt2">
          <AppBanque solde="1 250,00 €" />
        </MiniTel>
        <Emo c="1f3e0" x={850} y={760} s={170} />
        <Emo c="1f697" x={880} y={1080} s={170} />
        <Flux d="M600,1150 C700,1100 760,900 820,840" u={ease(f, tb - 10, tb + 8)} f={f} c={P.or} points={false} />
      </Couche>
      <Couche p={1.05}>
        {[0, 1, 2, 3].map((j) => {
          const u = Math.max(0, f - 50 - j * 5) / 40;
          const x = 300 + u * 520;
          const bob = Math.abs(Math.sin((f + j * 5) / 3)) * -18;
          return u > 0 && x < 1250 ? (
            <g key={j}>
              <path d={`M${x - 20},${1300 + bob + 50} l${-10 + 14 * Math.sin(f / 3 + j)},40 M${x + 20},${1300 + bob + 50} l${10 - 14 * Math.sin(f / 3 + j)},40`} stroke="#14583a" strokeWidth="8" strokeLinecap="round" />
              <Billet id={`dtm${j}`} x={x} y={1300 + bob} s={0.5} yeux={{px: 1}} casque />
            </g>
          ) : null;
        })}
      </Couche>
    </Ecran>
  );
});

// ===================== 9. Prêt voiture, appart, assurance, livret… et le découvert : des frais =====================
const Credits = scene('credits', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    const tuiles = [
      [170, 'voiture', 69, '1f697'],
      [420, 'appart', 88, '1f3e2'],
      [670, 'assurance', 107, '1f6e1'],
      [920, 'livret', 130, '1f437'],
    ];
    const cle = pop(f, R('prêt', 51) - 4);
    const nb = tuiles.filter(([, m, d]) => f > R(m, d) + 10).length;
    return (
      <Ecran fg={fg} theme="bleu" t={t} cam={derive(k, {z0: 1.0, z1: 1.06, y0: 0, y1: -20})} horizon={1450}>
        <Couche p={0.9}>
          <Banque x={540} y={620} s={0.55} lueur={0.15 * nb} />
        </Couche>
        <Couche p={1}>
          {tuiles.map(([x, mot, def, emo], j) => {
            const t0 = R(mot, def);
            const u = pop(f, t0 - 3);
            const fl = ease(f, t0 + 4, t0 + 16);
            return (
              <g key={j}>
                <Flux d={`M${x},${840} C${x},${700} ${540 + (x - 540) * 0.3},${760} ${540},${560}`} u={fl} f={f} c={P.or} w={8} />
                <g transform={`translate(${x} ${960}) scale(${u}) rotate(${(j % 2 ? 6 : -6) * (1 - u)})`}>
                  <Tuile x={0} y={0} w={220} h={220} c="#ffffff">
                    <Emo c={emo} x={0} y={0} s={150} />
                  </Tuile>
                </g>
              </g>
            );
          })}
        </Couche>
        <Couche p={1.15}>
          <Fig x={540} y={1840} s={0.62} smile={0.6} pupilY={-12} epauleD={-60} coudeD={40} breath={Math.sin(fg / 7) * 3} />
          <g transform={`translate(${versEcran(540, 1840, 0.62, mainD({epauleD: -60, coudeD: 40}))[0]} ${versEcran(540, 1840, 0.62, mainD({epauleD: -60, coudeD: 40}))[1] - 20}) scale(${cle}) rotate(${-20 + 10 * Math.sin(f / 6)})`}>
            <Emo c="1f511" x={0} y={0} s={110} />
          </g>
        </Couche>
      </Ecran>
    );
  }
  // le découvert : le solde passe dans le rouge, les frais tombent
  const td = R('découvert', 156);
  const v = interpolate(f, [140, td + 4], [23, -47], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const rouge = v < 0;
  const tf = R('frais', 179);
  const sh = rouge && f < td + 20 ? Math.sin(f * 2.4) * 8 * Math.exp(-(f - td) / 8) : 0;
  return (
    <Ecran fg={fg} theme={rouge ? 'rouge' : 'nuit'} t={t} cam={derive(k, {z0: 1.0, z1: 1.08})}>
      <Couche p={1}>
        <g transform={`translate(${sh} 0)`}>
          <MiniTel x={540} y={880} s={1.7} id="cr">
            <AppBanque solde={`${v.toFixed(2).replace('.', ',')} €`} rouge={rouge}>
              {rouge && <rect x="-150" y="-110" width="300" height="60" fill={P.rouge} />}
              {rouge && <text x="0" y="-70" textAnchor="middle" fontFamily={TEXTE} fontWeight="800" fontSize="24" fill="#fff">À DÉCOUVERT</text>}
              {[['1f959', 'Kebab', '− 9,50 €'], ['1f697', 'Essence', '− 40,00 €'], ['1f4f1', 'Forfait', '− 19,99 €'], ['1f381', 'Cadeau', '− 25,00 €']].map(([e, n, m], j) => (
                <g key={`o${j}`} transform={`translate(0 ${-10 + (j + 3 * pop(f, tf - 2)) * 80})`}>
                  <rect x="-130" y="-32" width="260" height="64" rx="14" fill="#fff" />
                  <Emo c={e} x={-96} y={0} s={40} />
                  <text x="-64" y="9" fontFamily={TEXTE} fontWeight="600" fontSize="20" fill="#555">{n}</text>
                  <text x="116" y="9" textAnchor="end" fontFamily={TEXTE} fontWeight="700" fontSize="20" fill="#333">{m}</text>
                </g>
              ))}
              {[0, 1, 2].map((j) => {
                const u = pop(f, tf - 2 + j * 4);
                return (
                  <g key={j} transform={`translate(0 ${-10 + j * 90}) scale(${u})`} opacity={Math.min(1, u * 1.5)}>
                    <rect x="-130" y="-34" width="260" height="70" rx="16" fill="#fff" stroke="#ffd0d0" strokeWidth="3" />
                    <Emo c="1f9fe" x={-96} y={0} s={46} />
                    <text x="-60" y="10" fontFamily={TEXTE} fontWeight="700" fontSize="22" fill="#333">Frais</text>
                    <text x="116" y="10" textAnchor="end" fontFamily={TITRE} fontSize="26" fill={P.rouge}>{['− 8 €', '− 12 €', '− 8 €'][j]}</text>
                  </g>
                );
              })}
            </AppBanque>
          </MiniTel>
        </g>
      </Couche>
      <Couche p={1.25}>
        {rouge && <Emo c="1f6a8" x={880} y={330} s={170 + 20 * Math.sin(f / 2)} />}
      </Couche>
    </Ecran>
  );
});

// ===================== 10. Sur des années : des centaines, voire des milliers d'euros =====================
const Calcul = scene('calcul', ({f, fg, t, k, R}) => {
  const ans = 10;
  const v = interpolate(f, [R('années', 15), R('centaines', 68), R('milliers', 98), R('deuros', 108) + 8], [100, 400, 1200, 1500], {...clamp, easing: Easing.inOut(Easing.sin)});
  const u = ease(f, R('années', 15) - 4, R('deuros', 108) + 6, Easing.inOut(Easing.sin));
  const x0 = 150;
  const pas = 82;
  const base = 1110;
  const pts = [...Array(ans)].map((_, j) => [x0 + j * pas, base - 40 - Math.pow((j + 1) / ans, 1.5) * 760]);
  const courbe = pts.map(([x, y], j) => `${j ? 'L' : 'M'}${x},${y}`).join(' ');
  return (
    <Ecran fg={fg} theme="vert" t={t} cam={derive(k, {x0: -60, x1: 60, z0: 1.08, z1: 1.0, y0: 30, y1: -10})} horizon={1140}>
      <Couche p={1}>
        <line x1="100" y1={base + 10} x2="980" y2={base + 10} stroke="#fff" strokeWidth="6" opacity="0.4" />
        {pts.map(([x], j) => {
          const g = Math.max(0, Math.min(1, u * ans - j));
          const n = Math.round(g * (2 + j * 1.6));
          return (
            <g key={j}>
              <Pile x={x} y={base} n={n} r={30} />
              <text x={x} y={base + 70} textAnchor="middle" fontFamily={TEXTE} fontWeight="700" fontSize="28" fill="#fff" opacity={0.25 + 0.75 * g}>{`an ${j + 1}`}</text>
            </g>
          );
        })}
        <path d={courbe} fill="none" stroke="#86efac" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - u} />
        <circle cx={lerp(pts[0][0], pts[ans - 1][0], u)} cy={pts[Math.min(ans - 1, Math.floor(u * (ans - 1)))][1]} r="18" fill="#fff" opacity={u > 0 ? 1 : 0} />
        <Fig x={130} y={1420} s={0.36} smile={0.6} pupilX={12} pupilY={-10} />
      </Couche>
      <Couche p={1.2}>
        <Chiffre x={540} y={300} v={v} prefixe="+ " taille={150} c={v > 1000 ? P.or : '#ffffff'} />
        <Eclat f={f} t0={R('milliers', 98)} x={540} y={250} r={420} c="#ffe28a" />
      </Couche>
    </Ecran>
  );
});

// ===================== 11. Personne ne change de banque. 100 € au début : pas un cadeau, un investissement =====================
const Arbre = ({x, y, u, f}) => {
  const tronc = ease(u, 0, 0.45);
  const branches = ease(u, 0.3, 0.7);
  const feuilles = ease(u, 0.5, 1);
  const pos = [[-180, -560], [-60, -680], [90, -650], [200, -540], [-240, -420], [250, -400], [0, -780], [-130, -470], [140, -460], [-20, -560]];
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0,0 C-10,-150 10,-280 0,-420" stroke="#8a5a2a" strokeWidth="44" fill="none" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - tronc} />
      {[[-200, -560], [210, -520], [0, -700]].map(([bx, by], j) => (
        <path key={j} d={`M0,${-300 - j * 40} Q${bx * 0.4},${by + 80} ${bx},${by}`} stroke="#8a5a2a" strokeWidth="22" fill="none" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - branches} />
      ))}
      <circle cx="0" cy="-560" r={330 * feuilles} fill="#22c55e" opacity="0.35" filter="url(#flou14)" />
      {pos.map(([bx, by], j) => {
        const s = Math.max(0, Math.min(1, feuilles * 1.6 - j * 0.06));
        return <Billet key={j} id={`ab${j}`} x={bx} y={by} s={0.36 * s} rot={(j * 37) % 60 - 30 + 4 * Math.sin(f / 10 + j)} />;
      })}
      {feuilles > 0.8 && [[-120, -380], [130, -360], [40, -470]].map(([px, py], j) => <Piece key={j} x={px} y={py + 6 * Math.sin(f / 8 + j)} r={30} tourne={f / 30 + j} />)}
    </g>
  );
};
const Reste = scene('reste', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    // sur son canapé : changer de banque ? la pile de paperasse… trop relou
    const relou = ease(f, R('relou', 62) - 8, R('relou', 62) + 4);
    const sway = Math.sin(f / 9) * 3;
    return (
      <Ecran fg={fg} theme="violet" t={t} cam={derive(k, {z0: 1.0, z1: 1.06, x0: 20, x1: -20})}>
        <Couche p={0.55}>
          {/* le salon : fenêtre de nuit, cadre, lampe, plante, tapis */}
          <rect x="560" y="300" width="420" height="520" rx="18" fill="#2a2e6a" />
          <rect x="580" y="320" width="380" height="480" rx="10" fill="#141a44" />
          {[...Array(9)].map((_, j) => <rect key={j} x={600 + (j % 3) * 120} y={560 + Math.floor(j / 3) * 70 - (j % 2) * 60} width="90" height={240} fill="#20285a" />)}
          {[...Array(14)].map((_, j) => <rect key={`w${j}`} x={620 + (j * 53) % 330} y={600 + ((j * 37) % 170)} width="14" height="18" fill="#ffd866" opacity={0.5 + 0.4 * Math.sin(fg / 20 + j)} />)}
          <circle cx="880" cy="400" r="34" fill="#fff6d8" />
          <rect x="764" y="320" width="12" height="480" fill="#2a2e6a" />
          <rect x="580" y="556" width="380" height="12" fill="#2a2e6a" />
          <rect x="120" y="760" width="0" height="0" />
          <g transform="translate(470 420) rotate(-3)">
            <rect x="-60" y="-80" width="120" height="160" rx="8" fill="#ffc83a" />
            <rect x="-48" y="-68" width="96" height="136" rx="4" fill="#4fc3ff" />
            <circle cx="0" cy="-10" r="24" fill="#ffd866" />
          </g>
          <ellipse cx="740" cy="1600" rx="520" ry="90" fill="#4a3aa8" opacity="0.7" />
          <ellipse cx="740" cy="1600" rx="420" ry="66" fill="none" stroke="#8a7aff" strokeWidth="8" opacity="0.6" />
        </Couche>
        <Couche p={0.75}>
          {/* lampe et plante */}
          <rect x="1050" y="700" width="10" height="560" fill="#2a2c3a" />
          <path d="M990,700 L1120,700 L1090,600 L1020,600 Z" fill="#ffd866" />
          <path d="M990,700 L1120,700 L1200,1300 L910,1300 Z" fill="#fff6c8" opacity="0.07" />
          <rect x="430" y="1200" width="0" height="0" />
        </Couche>
        <Couche p={0.85}>
          {/* la pile de paperasse */}
          <g transform={`rotate(${sway} 260 1300)`}>
            {[...Array(14)].map((_, j) => (
              <g key={j} transform={`translate(${260 + Math.sin(j * 1.7) * 14} ${1280 - j * 48}) rotate(${Math.sin(j * 2.3) * 5})`}>
                <rect x="-150" y="-22" width="300" height="44" rx="6" fill={j % 2 ? '#ffffff' : '#ece8f8'} />
                <rect x="-120" y="-6" width={160 + (j % 3) * 30} height="8" rx="4" fill="#c8c4e8" />
              </g>
            ))}
            <Emo c="1f3e6" x={260} y={560} s={130} />
          </g>
        </Couche>
        <Couche p={1}>
          {/* le canapé, il est assis derrière le coussin avant */}
          <rect x="430" y="1140" width="600" height="260" rx="60" fill="#ff6b5b" />
          <Fig x={740} y={1545} s={0.95} pupilX={-14} eyes={lerp(1, 0.6, relou)} smile={0.1} worry={0.2} tilt={lerp(0, 8, relou)} epauleG={20} coudeG={60} epauleD={-20} coudeD={-60} breath={Math.sin(fg / 9) * 4} ombre={false} />
          <rect x="400" y="1320" width="660" height="230" rx="50" fill="#e2554a" />
          <rect x="370" y="1260" width="110" height="300" rx="50" fill="#ff7b6b" />
          <rect x="980" y="1260" width="110" height="300" rx="50" fill="#ff7b6b" />
          <Ombre x={740} y={1570} rx={360} ry={30} o={0.5} />
        </Couche>
        <Couche p={1.2}>
          <g transform={`translate(560 760) scale(${pop(f, R('relou', 62) - 2)})`}>
            <Emo c="1f4a4" x={0} y={0} s={120} />
          </g>
        </Couche>
      </Ecran>
    );
  }
  if (i === 1) {
    // le cadeau de 100 €… qui cache un hameçon
    const ouvre = ease(f, R('cadeau', 125) - 12, R('cadeau', 125) - 2, Easing.out(Easing.back(1.4)));
    const hm = ease(f, R('cadeau', 125) - 8, R('cadeau', 125) + 4);
    return (
      <Ecran fg={fg} theme="rose" t={t} cam={derive(k, {z0: 1.0, z1: 1.07})}>
        <Couche p={1}>
          <Ombre x={540} y={1250} rx={300} ry={40} />
          <rect x="300" y="820" width="480" height="420" rx="24" fill="#8a5aff" />
          <rect x="510" y="820" width="60" height="420" fill="#ffc83a" />
          <g transform={`rotate(${-38 * ouvre} 290 800) translate(0 ${-120 * ouvre})`}>
            <rect x="270" y="740" width="540" height="110" rx="20" fill="#a88aff" />
            <rect x="510" y="740" width="60" height="110" fill="#ffd866" />
            <path d="M540,740 C470,640 420,700 520,740 M540,740 C610,640 660,700 560,740" stroke="#ffc83a" strokeWidth="22" fill="none" />
          </g>
          <g transform={`translate(540 ${820 - 260 * hm}) scale(${hm})`}>
            <Emo c="1fa9d" x={0} y={0} s={280} />
          </g>
          <Etiquette x={850} y={900} s={0.8} rot={12 + 4 * Math.sin(f / 6)} texte="100 €" />
        </Couche>
      </Ecran>
    );
  }
  // une graine de 100 € qui devient un arbre à billets
  const g = ease(f, 126, R('investissement', 150) + 14, Easing.inOut(Easing.sin));
  return (
    <Ecran fg={fg} theme="vert" t={t} cam={derive(k, {z0: 1.08, z1: 1.0, y0: 60, y1: -40})} horizon={1300}>
      <Couche p={1}>
        <ellipse cx="540" cy="1330" rx="380" ry="70" fill="#5a3a1a" />
        <ellipse cx="540" cy="1318" rx="340" ry="52" fill="#7a5028" />
        {g < 0.15 && <Piece x={540} y={1290 + 30 * g * 6} r={46} />}
        <Arbre x={540} y={1320} u={g} f={f} />
        <Eclat f={f} t0={R('investissement', 150)} x={540} y={760} r={480} c="#ffe28a" />
      </Couche>
    </Ecran>
  );
});

// ===================== 12. Arnaque ? Non, la prime est réelle. Mais si on te paie pour entrer… =====================
const Retiens = scene('retiens', ({f, fg, i, t, k, R}) => {
  if (i === 0) {
    // le billet passé à la loupe… vrai
    const non = f >= R('non', 23) - 2;
    const lp = ease(f, 0, R('non', 23), Easing.inOut(Easing.sin));
    const reel = R('réelle', 57);
    const brille = ease(f, reel - 6, reel + 12);
    return (
      <Ecran fg={fg} theme={non ? 'vert' : 'rouge'} t={t} cam={derive(k, {z0: 1.0, z1: 1.06})}>
        <Couche p={1}>
          <g transform={`translate(${non ? 0 : Math.sin(f * 1.8) * 5} 0)`}>
            <Billet x={540} y={760} s={2.3} rot={-6} id="rtb" />
            {/* reflet holographique qui balaie le billet */}
            <g opacity={brille * (1 - Math.max(0, brille - 0.8) * 5)}>
              <rect x={lerp(160, 900, brille)} y="520" width="60" height="480" fill="#fff" opacity="0.5" transform={`rotate(20 540 760)`} filter="url(#flou4)" />
            </g>
          </g>
        </Couche>
        <Couche p={1.25}>
          <g transform={`translate(${lerp(260, 820, lp)} ${700 + 80 * Math.sin(lp * 6)}) rotate(-25)`} opacity={non ? 0 : 1}>
            <circle r="150" fill="#fff" opacity="0.2" />
            <circle r="150" fill="none" stroke="#2a2c3a" strokeWidth="24" />
            <rect x="-22" y="160" width="44" height="220" rx="20" fill="#2a2c3a" />
          </g>
          <Coche x={820} y={420} s={1.5} u={pop(f, R('non', 23) - 2)} />
          <Eclat f={f} t0={reel + 4} x={540} y={760} r={500} c="#ffe28a" />
        </Couche>
      </Ecran>
    );
  }
  // gros plan sur toi : l'étiquette « 100 € »… qui se retourne : tu vaux bien plus
  const tp = R('paie', 117);
  const tv = R('plus', 159);
  const et = ease(f, tp - 10, tp + 6, Easing.out(Easing.back(1.3)));
  const flip = ease(f, tv - 8, tv + 4, Easing.inOut(Easing.cubic));
  const sx = Math.cos(flip * Math.PI);
  const pose = {smile: f > tv ? 0.5 : 0.15, eyes: 1.05, brows: f > 79 ? -4 : 0, worry: 0, tilt: f > tv ? -5 : 0, pupilX: f > tp && f < tv ? 10 : 0, pupilY: f > tp && f < tv ? 6 : 0, breath: Math.sin(fg / 8) * 4};
  return (
    <Ecran fg={fg} theme="nuit" t={t} cam={derive(k, {z0: 1.0, z1: 1.12, y0: 0, y1: -40})} sol={false}>
      <Couche p={0.4}>
        <path d="M380,-100 L120,1920 L960,1920 L700,-100 Z" fill="#fff6d8" opacity="0.08" />
        <circle cx="540" cy="900" r="520" fill="#7a5aff" opacity="0.18" filter="url(#flou14)" />
        <g opacity="0.45" filter="url(#flou4)">
          <Banque x={230} y={760} s={0.55} yeux={{ouvert: 1, px: 0.8, malin: 0.4}} />
        </g>
        {/* sa valeur qui grimpe derrière lui */}
        <path d={`M600,760 C700,720 760,600 860,520 S980,300 1040,220`} fill="none" stroke="#86efac" strokeWidth="10" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - ease(f, 80, 160)} opacity="0.6" />
      </Couche>
      <Couche p={0.7}>
        {[...Array(10)].map((_, j) => {
          const y = 1500 - ((f * 5 + j * 170) % 1500);
          return <Piece key={j} x={j % 2 ? 140 + (j * 37) % 160 : 800 + (j * 53) % 200} y={y} r={22 + (j % 3) * 6} tourne={f / 20 + j} o={0.75} />;
        })}
      </Couche>
      <Couche p={1}>
        <Fig x={540} y={2420} s={2.0} {...pose} ombre={false} />
      </Couche>
      <Couche p={1.2}>
        <g transform={`translate(${lerp(1300, 820, et)} 1180) rotate(${-8 + 6 * Math.sin(f / 9)})`}>
          <g transform={`scale(${Math.max(0.03, Math.abs(sx))} 1)`}>
            <Etiquette x={0} y={0} s={1.0} texte={sx > 0 ? '100 €' : '1 000 €+'} c={sx > 0 ? P.or : P.rose} ct={sx > 0 ? '#3a2400' : '#fff'} w={sx > 0 ? 300 : 420} />
          </g>
        </g>
        <Eclat f={f} t0={tv + 4} x={820} y={1180} r={300} c="#ffe28a" />
      </Couche>
    </Ecran>
  );
});

// ===================== 13. Ton lien, tu l'as envoyé à combien de personnes ? Dis-le en commentaire =====================
const AVATARS = [KARIM, ...PASSANTS, {couleurs: {chev: '#e8c870', haut: '#ff7ab0', hautO: '#e8609a'}, coiffure: 'carre', cils: true}, {couleurs: {chev: '#3a2a1a', haut: '#ffd23a', hautO: '#e8b820'}}];
const Commentaire = scene('commentaire', ({f, fg, t, k, R}) => {
  const te = R('envoyé', 45) - 6;
  const pose = {epauleD: -30, coudeD: 100, smile: 0.7, eyes: 1.1, pupilY: 10, pupilX: -6, breath: Math.sin(fg / 7) * 4};
  const s = 1.15;
  const [hx, hy] = versEcran(540, 2060, s, mainD(pose));
  const env = Math.max(0, Math.floor((f - te) / 4));
  const n = Math.min(37, Math.max(0, Math.round(interpolate(f, [te, R('dis-le', 91)], [0, 37], clamp))));
  return (
    <Ecran fg={fg} theme="violet" t={t} cam={derive(k, {z0: 1.04, z1: 0.98, y0: -20, y1: 20})}>
      <Couche p={0.8}>
        {[...Array(9)].map((_, j) => {
          const a = Math.PI * (1.08 + (j / 8) * 0.84);
          const ax = 540 + Math.cos(a) * 430;
          const ay = 860 + Math.sin(a) * 520;
          const u = pop(f, R('toi', 7) + j * 2);
          const recu = env > j + 1;
          return (
            <g key={j} transform={`translate(${ax} ${ay}) scale(${u})`}>
              <circle r="62" fill={recu ? '#3ad86a' : '#ffffff'} opacity={recu ? 1 : 0.9} />
              <clipPath id={`cm${j}`}>
                <circle r="56" />
              </clipPath>
              <g clipPath={`url(#cm${j})`}>
                <Fig x={0} y={300} s={0.4} {...AVATARS[j % AVATARS.length]} smile={0.5} ombre={false} />
              </g>
              {recu && <Emo c="1f517" x={44} y={-44} s={46} />}
            </g>
          );
        })}
        {/* liens qui partent du téléphone vers les contacts */}
        {[...Array(9)].map((_, j) => {
          const a = Math.PI * (1.08 + (j / 8) * 0.84);
          const ax = 540 + Math.cos(a) * 430;
          const ay = 860 + Math.sin(a) * 520;
          const u = ease(f, te + j * 4, te + j * 4 + 10);
          if (u <= 0 || u >= 1) return null;
          return (
            <g key={j} transform={`translate(${lerp(hx, ax, u)} ${lerp(hy - 120, ay, u) - Math.sin(u * Math.PI) * 80})`}>
              <circle r="38" fill={P.rose} />
              <Emo c="1f517" x={0} y={0} s={46} />
            </g>
          );
        })}
      </Couche>
      <Couche p={1}>
        <Fig x={540} y={2060} s={s} {...pose} />
        <MiniTel x={hx - 10} y={hy - 110} s={0.5} rot={-6} id="cmt">
          <rect x="-150" y="-300" width="300" height="600" fill={P.rose} />
          <Emo c="1f517" x={0} y={-40} s={150} />
          <rect x="-110" y="120" width="220" height="70" rx="35" fill="#fff" />
        </MiniTel>
      </Couche>
      <Couche p={1.2}>
        <g transform={`translate(540 300) scale(${pop(f, te)})`}>
          <Chiffre x={0} y={0} v={n} prefixe="× " suffixe="" taille={130} c="#ffffff" />
        </g>
      </Couche>
      <BulleCommentaire f={f} t0={R('dis-le', 91) - 2} y={1640} />
    </Ecran>
  );
});

const COMPOSANTS = {anniv: Anniv, pourquoi: Pourquoi, pub: Pub, parrainage: Parrainage, pote: Pote, conditions: Conditions, kebab: Kebab, dort: Dort, credits: Credits, calcul: Calcul, reste: Reste, retiens: Retiens, commentaire: Commentaire};
export const Parrainage_ = () => (
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
export {Parrainage_ as ParrainageVideo};
