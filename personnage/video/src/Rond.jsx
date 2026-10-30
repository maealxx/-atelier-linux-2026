// ===================== Persos « tête ronde » (style des vidéos « What if ») =====================
// Grosse tête ronde, corps simple, bras et jambes épais aux bouts arrondis, gros yeux noirs avec un reflet.
// Repère : pieds en (0, 0), ≈ 1000 de haut. Tenues : 'blouse' (blouse d'hôpital à pois), 'scrubs' (infirmière),
// 'chirurgien' (vert + charlotte + masque). zombie : silhouette noire, yeux blancs qui brillent.
const PEAU = '#f0c7a0';
const PEAU_O = '#d9a77c';

const bras = (ep, a, c, L1 = 165, L2 = 155) => {
  // a : angle de l'épaule (0 = le long du corps, + = vers l'extérieur / le haut), c : pli du coude
  const s = Math.sign(ep[0]) || 1;
  const r1 = ((a * s) * Math.PI) / 180;
  const coude = [ep[0] + Math.sin(r1) * L1, ep[1] + Math.cos(r1) * L1];
  const r2 = (((a + c) * s) * Math.PI) / 180;
  const main = [coude[0] + Math.sin(r2) * L2, coude[1] + Math.cos(r2) * L2];
  return [coude, main];
};

export const Rond = ({
  tenue = 'blouse',
  cheveux = 'pointes',
  peau = PEAU,
  dos = false,
  zombie = false,
  brasG = [12, 0],
  brasD = [12, 0],
  jambes = 0, // marche : -1 → 1
  yeux = 1,
  pupX = 0,
  pupY = 0,
  bouche = 'neutre', // 'neutre' | 'o' | 'sourire' | 'cri' | 'chut' | 'serre'
  sourcils = 0, // + inquiet, - fâché
  sueur = 0,
  rougeur = 0,
  larmes = 0,
  souffle = 0,
  oeilZ = '#ffffff',
  sansYeux = false,
  profil = 0, // vue de 3/4 : -1 (regarde à gauche) → 1 (regarde à droite)
  assis = false, // sans les jambes (dans un lit, sous la couverture)
  cou = 0, // allonge le cou (tête plus haute)
  bracelet = false, // bracelet d'hôpital au poignet gauche
  oxymetre = false, // pince au doigt de la main droite (lumière rouge + câble)
  penche = 0, // inclinaison de la tête (degrés)
  brasDevant = false, // bras dessinés devant le corps (mains posées sur le ventre)
  couleurs = null, // surcharge des couleurs {haut, hautO, bas, chaus, chev, peau, peauO}
  chapeau = null, // 'casquette' | 'toque' | 'bandeau' | 'facteur'
  chapeauCoul = '#2a4a8a',
  barbe = false,
  lunettes = false,
  mort = false, // zombie « de jour » : peau gris-vert, yeux blancs vides, bouche abîmée (garde ses vêtements)
}) => {
  const noir = '#0b0d16';
  const c0 = zombie
    ? {peau: noir, peauO: noir, haut: noir, hautO: noir, bas: noir, chaus: noir, chev: noir}
    : tenue === 'scrubs'
      ? {peau, peauO: PEAU_O, haut: '#2a4a8a', hautO: '#203a70', bas: '#2a4a8a', chaus: '#f4f4f8', chev: '#1a1210'}
      : tenue === 'chirurgien'
        ? {peau, peauO: PEAU_O, haut: '#4aa88a', hautO: '#3a8a70', bas: '#4aa88a', chaus: '#e8e8ee', chev: '#3a2a1a'}
        : {peau, peauO: PEAU_O, haut: '#a8ccf4', hautO: '#88b0e0', bas: peau, chaus: '#f0c43a', chev: '#141218'};
  const c = {...c0, ...(mort && !zombie ? {peau: '#a3b59a', peauO: '#86997e'} : {}), ...(couleurs || {})};
  const y0 = souffle * 0.5;
  const epG = [-128, -585 + y0];
  const epD = [128, -585 + y0];
  const [cG, mG] = bras(epG, brasG[0], brasG[1]);
  const [cD, mD] = bras(epD, brasD[0], brasD[1]);
  const lg = (x0, k) => {
    const lev = Math.max(0, k * jambes);
    return [[x0, -220], [x0 + k * 4 * jambes * 0, -110 - 30 * lev], [x0, -10 - 60 * lev]];
  };
  const jG = lg(-62, -1);
  const jD = lg(62, 1);
  const membre = (pts, w, col, key) => <polyline key={key} points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={col} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />;
  const corpsChemin = tenue === 'blouse' || zombie ? `M-150,${-620 + y0} Q0,${-660 + y0} 150,${-620 + y0} L178,-170 Q0,-140 -178,-170 Z` : `M-145,${-620 + y0} Q0,${-655 + y0} 145,${-620 + y0} L150,-210 Q0,-195 -150,-210 Z`;
  const brasFace = (
    [[epG, cG, mG], [epD, cD, mD]].map(([e, co, m], k) => (
      <g key={`b${k}`}>
        {membre([e, co, m], 54, c.peau, `ba${k}`)}
        {tenue === 'blouse' || zombie ? membre([e, [e[0] + (co[0] - e[0]) * 0.45, e[1] + (co[1] - e[1]) * 0.45]], 74, c.haut, `bm${k}`) : membre([e, [e[0] + (co[0] - e[0]) * 0.5, e[1] + (co[1] - e[1]) * 0.5]], 66, c.haut, `bm${k}`)}
        <circle cx={m[0]} cy={m[1]} r="36" fill={c.peau} />
        {bracelet && k === 0 && !zombie && <rect x={m[0] - 34} y={m[1] - 70} width="68" height="24" rx="10" fill="#f4f6fa" stroke="#c8d0dc" strokeWidth="3" transform={`rotate(${-brasG[0] - brasG[1]} ${m[0]} ${m[1] - 58})`} />}
        {oxymetre && k === 1 && !zombie && (
          <g>
            <path d={`M${m[0]},${m[1] + 30} C${m[0] + 30},${m[1] + 160} ${m[0] - 120},${m[1] + 200} ${m[0] - 220},${m[1] + 420}`} stroke="#d8dce4" strokeWidth="9" fill="none" />
            <rect x={m[0] - 26} y={m[1] + 6} width="52" height="44" rx="14" fill="#8a929e" />
            <circle cx={m[0]} cy={m[1] + 28} r="9" fill="#ff3a3a" />
            <circle cx={m[0]} cy={m[1] + 28} r="26" fill="#ff3a3a" opacity="0.3" />
          </g>
        )}
        {!zombie && <path d={`M${m[0] - 20},${m[1] - 26} l-6,-22 M${m[0]},${m[1] - 32} l0,-24 M${m[0] + 20},${m[1] - 26} l6,-22`} stroke={c.peau} strokeWidth="18" strokeLinecap="round" opacity={Math.abs(m[1] - e[1]) < 120 ? 1 : 0} />}
      </g>
    ))
  );
  return (
    <g>
      <defs>
        <pattern id="rd-pois" width="38" height="38" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="5" fill="#5a8ad8" />
          <circle cx="29" cy="29" r="5" fill="#5a8ad8" />
        </pattern>
        <pattern id="rd-carreaux" width="30" height="30" patternUnits="userSpaceOnUse">
          <rect width="30" height="30" fill="#2a4ab0" />
          <rect width="30" height="10" fill="#e83a3a" />
          <rect width="10" height="30" fill="#e83a3a" opacity="0.7" />
        </pattern>
        <linearGradient id="rd-corps" x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#1a1030" stopOpacity="0.26" />
        </linearGradient>
        <radialGradient id="rd-modele" cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#3a1a20" stopOpacity="0.28" />
        </radialGradient>
        {zombie && (
          <radialGradient id="rd-oz">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.4" stopColor={oeilZ} stopOpacity="0.8" />
            <stop offset="1" stopColor={oeilZ} stopOpacity="0" />
          </radialGradient>
        )}
      </defs>
      {!assis && <ellipse cx="0" cy="8" rx="170" ry="26" fill="#000" opacity="0.28" />}
      {/* jambes */}
      {!assis && [jG, jD].map((j, k) => (
        <g key={k}>
          {membre(j, 62, tenue === 'blouse' && !zombie ? c.peau : c.bas, `j${k}`)}
          <ellipse cx={j[2][0] + (k ? 22 : -22)} cy={j[2][1] + 4} rx="58" ry="28" fill={c.chaus} />
        </g>
      ))}
      {/* bras derrière (vue de dos : les deux bras sont devant le corps) */}
      {!dos && !brasDevant && brasFace}
      {/* corps */}
      <path d={corpsChemin} fill={c.haut} />
      {tenue === 'blouse' && !zombie && !dos && <path d={corpsChemin} fill="url(#rd-pois)" opacity="0.6" />}
      {!zombie && <path d={corpsChemin} fill="url(#rd-corps)" />}
      {tenue === 'blouse' && !zombie && dos && (
        <g>
          <path d={corpsChemin} fill="url(#rd-pois)" opacity="0.6" />
          {/* la blouse ouverte derrière… */}
          <path d={`M-14,${-610 + y0} L14,${-610 + y0} L74,-172 L-74,-172 Z`} fill={c.peau} />
          <path d="M-60,-300 L60,-300 L78,-172 L-78,-172 Z" fill="url(#rd-carreaux)" />
          <path d={`M-20,${-560 + y0} q20,14 40,0 M-26,${-470 + y0} q26,14 52,0`} stroke="#5a8ad8" strokeWidth="6" fill="none" />
        </g>
      )}
      {(tenue === 'scrubs' || tenue === 'chirurgien') && !zombie && !dos && (
        <g>
          <path d={`M-40,${-628 + y0} L0,${-560 + y0} L40,${-628 + y0}`} stroke={c.hautO} strokeWidth="10" fill="none" />
          <rect x="-110" y="-470" width="60" height="50" rx="8" fill={c.hautO} />
          {tenue === 'scrubs' && <g><rect x="60" y="-500" width="40" height="56" rx="6" fill="#ffffff" /><rect x="66" y="-490" width="28" height="10" fill="#3a8ad8" /><path d="M80,-500 L80,-540" stroke="#e83a3a" strokeWidth="5" /></g>}
        </g>
      )}
      {dos && [[epG, cG, mG], [epD, cD, mD]].map(([e, co, m], k) => (
        <g key={`bd${k}`}>
          {membre([e, co, m], 54, c.peau, `bda${k}`)}
          {membre([e, [e[0] + (co[0] - e[0]) * 0.45, e[1] + (co[1] - e[1]) * 0.45]], 70, c.haut, `bdm${k}`)}
          <circle cx={m[0]} cy={m[1]} r="36" fill={c.peau} />
        </g>
      ))}
      {!dos && brasDevant && brasFace}
      {/* cou */}
      {!zombie && cou > 0 && <rect x={-40 + 16 * profil} y={-690 + y0 - cou} width="80" height={110 + cou} rx="26" fill={c.peauO} />}
      {/* tête */}
      <g transform={`translate(0 ${y0 - cou}) rotate(${penche} 0 -640)`}>
        {cheveux === 'chignon' && !zombie && <circle cx={dos ? 0 : 60} cy="-1000" r="80" fill={c.chev} />}
        {!zombie && !dos && profil <= 0.3 && <g><circle cx={170 + 20 * profil} cy="-780" r="36" fill={c.peauO} /><circle cx={172 + 20 * profil} cy="-780" r="16" fill="#000" opacity="0.12" /></g>}
        {!zombie && !dos && profil >= -0.3 && <g><circle cx={-170 + 20 * profil} cy="-780" r="36" fill={c.peauO} /><circle cx={-172 + 20 * profil} cy="-780" r="16" fill="#000" opacity="0.12" /></g>}
        {cheveux === 'long' && !zombie && <path d="M-192,-830 Q-206,-600 -172,-540 L172,-540 Q206,-600 192,-830 Z" fill={c.chev} />}
        <circle cx="0" cy="-800" r="175" fill={c.peau} />
        {!zombie && <circle cx="0" cy="-800" r="175" fill="url(#rd-modele)" />}
        {mort && !zombie && !dos && <g opacity="0.55"><ellipse cx="-90" cy="-900" rx="34" ry="20" fill="#6e7f66" /><ellipse cx="110" cy="-720" rx="26" ry="16" fill="#6e7f66" /><path d="M60,-940 l30,40 M70,-915 l-14,8 M80,-930 l-14,8" stroke="#4a3a3a" strokeWidth="5" /></g>}
        {dos && !zombie && <path d="M-176,-800 A176,176 0 0 1 176,-800 Q176,-700 120,-660 Q0,-630 -120,-660 Q-176,-700 -176,-800 Z" fill={c.chev} />}
        {!dos && !zombie && cheveux === 'pointes' && (
          <path transform={`translate(${-14 * profil} 0)`} d="M-178,-790 Q-196,-930 -110,-985 L-120,-1050 L-50,-1000 L-30,-1075 L20,-1005 L70,-1065 L90,-990 L160,-1020 L140,-940 Q190,-880 176,-780 Q150,-880 70,-900 Q10,-860 -60,-900 Q-140,-880 -178,-790 Z" fill={c.chev} />
        )}
        {!dos && !zombie && cheveux === 'court' && <path transform={`translate(${-10 * profil} 0)`} d="M-176,-800 Q-182,-975 0,-984 Q182,-975 176,-800 Q150,-905 0,-918 Q-150,-905 -176,-800 Z" fill={c.chev} />}
        {!dos && !zombie && cheveux === 'long' && <path transform={`translate(${-10 * profil} 0)`} d="M-182,-750 Q-192,-978 0,-988 Q192,-978 182,-750 Q162,-892 60,-906 Q-40,-858 -122,-902 Q-172,-862 -182,-750 Z" fill={c.chev} />}
        {!dos && !zombie && cheveux === 'chignon' && <path d="M-178,-780 Q-180,-960 0,-978 Q180,-960 178,-780 Q150,-900 20,-905 Q-120,-900 -178,-780 Z" fill={c.chev} />}
        {!dos && !zombie && tenue === 'chirurgien' && (
          <g>
            <path d="M-182,-840 Q-180,-1000 0,-1000 Q180,-1000 182,-840 Z" fill="#4aa88a" />
            <path d="M-120,-760 L120,-760 L110,-660 Q0,-630 -110,-660 Z" fill="#c8e8f0" />
          </g>
        )}
        {!zombie && chapeau === 'toque' && <g><rect x="-150" y="-985" width="300" height="70" rx="14" fill="#f4f4f0" /><circle cx="-90" cy="-1020" r="70" fill="#ffffff" /><circle cx="0" cy="-1050" r="85" fill="#ffffff" /><circle cx="90" cy="-1020" r="70" fill="#ffffff" /></g>}
        {!zombie && (chapeau === 'casquette' || chapeau === 'facteur') && (
          <g transform={`translate(${-10 * profil} 0)`}>
            <path d="M-182,-850 Q-180,-1004 0,-1006 Q180,-1004 182,-850 Z" fill={chapeauCoul} />
            {chapeau === 'facteur' && <rect x="-180" y="-880" width="360" height="26" fill="#f0c43a" />}
            {!dos && <path d={`M${-60 + 90 * profil},-858 Q${80 + 90 * profil},-875 ${220 + 90 * profil},-842 Q${80 + 90 * profil},-822 ${-60 + 90 * profil},-842 Z`} fill={chapeauCoul} />}
            {!dos && <path d={`M${-60 + 90 * profil},-858 Q${80 + 90 * profil},-875 ${220 + 90 * profil},-842`} stroke="#000" strokeWidth="6" fill="none" opacity="0.2" />}
          </g>
        )}
        {!zombie && chapeau === 'bandeau' && <rect x="-174" y="-920" width="348" height="40" rx="14" fill={chapeauCoul} />}
        {barbe && !zombie && !dos && <path transform={`translate(${40 * profil} 0)`} d="M-150,-770 Q-150,-640 0,-628 Q150,-640 150,-770 Q120,-700 0,-692 Q-120,-700 -150,-770 Z" fill={c.chev} opacity="0.9" />}
        {/* visage */}
        {!dos && !zombie && (
          <g transform={`translate(${52 * profil} 0)`}>
            {[-62, 62].map((x) => (
              <g key={x} transform={`translate(${x * (1 - 0.12 * Math.abs(profil)) + pupX} ${-800 + pupY}) scale(${1 - (Math.sign(x) === -Math.sign(profil) ? 0.22 * Math.abs(profil) : 0)} ${yeux})`}>
                {mort ? (
                  <g>
                    <ellipse cy="26" rx="34" ry="16" fill="#4a5a44" opacity="0.45" />
                    <ellipse rx="27" ry="31" fill="#eef2e2" />
                    <circle cx="2" cy="2" r="6" fill="#7a8a76" />
                  </g>
                ) : (
                  <g>
                    <ellipse rx="22" ry="30" fill="#141218" />
                    <circle cx="7" cy="-10" r="7" fill="#ffffff" />
                  </g>
                )}
              </g>
            ))}
            {lunettes && (
              <g stroke="#2a2a30" strokeWidth="8" fill="#ffffff" fillOpacity="0.12">
                <circle cx={-62 * (1 - 0.12 * Math.abs(profil))} cy="-800" r="46" />
                <circle cx={62 * (1 - 0.12 * Math.abs(profil))} cy="-800" r="46" />
                <path d="M-18,-805 Q0,-818 18,-805" fill="none" />
              </g>
            )}
            <path transform={`rotate(${sourcils * 12} -62 -860)`} d="M-92,-858 Q-62,-872 -32,-858" stroke="#141218" strokeWidth="9" fill="none" strokeLinecap="round" />
            <path transform={`rotate(${-sourcils * 12} 62 -860)`} d="M32,-858 Q62,-872 92,-858" stroke="#141218" strokeWidth="9" fill="none" strokeLinecap="round" />
            {tenue !== 'chirurgien' && (bouche === 'o' ? <ellipse cx="0" cy="-705" rx="20" ry="26" fill="#3a1a1a" />
              : bouche === 'cri' ? <ellipse cx="0" cy="-700" rx="34" ry="44" fill="#3a1a1a" />
              : bouche === 'sourire' ? <path d="M-40,-715 Q0,-680 40,-715" stroke="#3a1a1a" strokeWidth="9" fill="none" strokeLinecap="round" />
              : bouche === 'serre' ? <path d="M-34,-705 L34,-705" stroke="#3a1a1a" strokeWidth="9" strokeLinecap="round" />
              : bouche === 'chut' ? <ellipse cx="0" cy="-708" rx="14" ry="12" fill="#3a1a1a" />
              : mort ? <path d="M-40,-712 L-24,-700 L-10,-714 L6,-698 L22,-712 L40,-702" stroke="#3a1a1a" strokeWidth="8" fill="none" strokeLinejoin="round" strokeLinecap="round" />
              : <path d="M-22,-708 Q0,-700 22,-708" stroke="#3a1a1a" strokeWidth="8" fill="none" strokeLinecap="round" />)}
            {rougeur > 0 && <g opacity={rougeur}><ellipse cx="-100" cy="-740" rx="30" ry="16" fill="#ff8a80" /><ellipse cx="100" cy="-740" rx="30" ry="16" fill="#ff8a80" /></g>}
            {sueur > 0 && <path transform={`translate(120 ${-920 + 30 * sueur})`} d="M0,-20 Q12,4 10,10 A11,11 0 1 1 -10,10 Q-12,4 0,-20 Z" fill="#8ad0ff" opacity={Math.min(1, sueur * 2)} />}
            {larmes > 0 && <path transform={`translate(-70 ${-760 + 60 * larmes})`} d="M0,-14 Q10,2 8,8 A9,9 0 1 1 -8,8 Q-10,2 0,-14 Z" fill="#8ad0ff" />}
          </g>
        )}
        {zombie && !dos && !sansYeux && (
          <g>
            {[-60, 60].map((x) => (
              <g key={x}>
                <circle cx={x} cy="-800" r="60" fill="url(#rd-oz)" opacity="0.6" />
                <circle cx={x} cy="-800" r="20" fill="#ffffff" />
              </g>
            ))}
          </g>
        )}
      </g>
    </g>
  );
};

// posé dans une scène 3D (billboard) avec la teinte de la lumière et un liseré
export const RondMonde = ({cam, x, z, y = 432, echelle = 1, teinte = [1, 1, 1], rim = null, id = 'rm', ...p}) => {
  if (!cam.visible(z, x, y - 300)) return null;
  const [px, py] = cam.proj(x, y, z);
  const s = cam.scale(z, x, y - 300) * 0.7 * echelle;
  const [r, g, b] = teinte;
  return (
    <g filter={rim ? `url(#rim-${rim})` : undefined}>
      <defs>
        <filter id={id}>
          <feColorMatrix type="matrix" values={`${r} 0 0 0 0  0 ${g} 0 0 0  0 0 ${b} 0 0  0 0 0 1 0`} />
        </filter>
      </defs>
      <g transform={`translate(${px} ${py}) scale(${s})`}>
        <g filter={p.zombie ? undefined : `url(#${id})`}>
          <Rond {...p} />
        </g>
      </g>
    </g>
  );
};

// Cinématique inverse d'un bras : angles [épaule, coude] pour poser la main sur `cible` (repère du perso).
// cote : -1 bras gauche, 1 bras droit. vers : 1 coude vers l'extérieur, -1 vers l'intérieur.
export const ikBras = (cote, cible, vers = 1, L1 = 165, L2 = 155) => {
  const ep = [128 * cote, -585];
  const dx = cible[0] - ep[0];
  const dy = cible[1] - ep[1];
  const D = Math.min(L1 + L2 - 1, Math.max(Math.abs(L1 - L2) + 1, Math.hypot(dx, dy)));
  const th = Math.atan2(dx, dy);
  const al = Math.acos((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D));
  const essais = [th + al, th - al].map((r1) => {
    const e = [ep[0] + Math.sin(r1) * L1, ep[1] + Math.cos(r1) * L1];
    const r2 = Math.atan2(cible[0] - e[0], cible[1] - e[1]);
    return {e, a: (r1 * 180) / Math.PI / cote, c: ((r2 - r1) * 180) / Math.PI / cote};
  });
  essais.sort((p, q) => vers * (q.e[0] * cote - p.e[0] * cote));
  return [essais[0].a, essais[0].c];
};
// position de la main (repère du perso) pour des angles donnés
export const mainRond = (cote, [a, c]) => bras([128 * cote, -585], a, c)[1];
