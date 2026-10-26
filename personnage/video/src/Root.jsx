import {Composition} from 'remotion';
import {DernierBus, DUREE_BUS} from './DernierBus';
import {Metro} from './Metro';
import {Personnage} from './Personnage';
import {DUREE_SALLE_ZERO, SalleZero} from './SalleZero';
import {DUREE_SOIREE, Soiree} from './Soiree';
import {DUREE_LIVREUR, Livreur} from './Livreur';
import {DUREE_ROULETTE, Roulette} from './Roulette';
import {DUREE_GABARIT, Gabarit} from './Gabarit';

export const Root = () => (
  <>
    <Composition
      id="Personnage"
      component={Personnage}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="Metro"
      component={Metro}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DernierBus"
      component={DernierBus}
      durationInFrames={DUREE_BUS}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="Soiree"
      component={Soiree}
      durationInFrames={DUREE_SOIREE}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="Gabarit"
      component={Gabarit}
      durationInFrames={DUREE_GABARIT}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="Roulette"
      component={Roulette}
      durationInFrames={DUREE_ROULETTE}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="Livreur"
      component={Livreur}
      durationInFrames={DUREE_LIVREUR}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="SalleZero"
      component={SalleZero}
      durationInFrames={DUREE_SALLE_ZERO}
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);
