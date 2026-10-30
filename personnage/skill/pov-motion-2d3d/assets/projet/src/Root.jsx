import {Composition} from 'remotion';
import {DUREE_HOPITAL, Hopital} from './Hopital';
import {PP} from './PP';
import {DernierBus, DUREE_BUS} from './DernierBus';
import {Metro} from './Metro';
import {Personnage} from './Personnage';
import {DUREE_SALLE_ZERO, SalleZero} from './SalleZero';
import {DUREE_SOIREE, Soiree} from './Soiree';
import {DUREE_LIVREUR, Livreur} from './Livreur';
import {DUREE_ROULETTE, Roulette} from './Roulette';
import {DUREE_GABARIT, Gabarit} from './Gabarit';
import {DUREE_ROULETTE_1000, Roulette1000} from './Roulette1000';
import {DUREE_VAISSEAU, LeVaisseau} from './LeVaisseau';
import {DernierTrain, DUREE_DERNIER_TRAIN} from './DernierTrain';
import {DUREE_HYPERGAMIE, Hypergamie} from './Hypergamie';
import {DUREE_TENTE, LaTente} from './LaTente';
import {DUREE_BABYPHONE, LeBabyphone} from './LeBabyphone';
import {DUREE_RENTREZ, RentrezChezVous} from './RentrezChezVous';

export const Root = () => (
  <>
    <Composition id="Hopital" component={Hopital} durationInFrames={DUREE_HOPITAL} fps={30} width={1080} height={1920} />
    <Composition id="PP" component={PP} durationInFrames={1} fps={30} width={1080} height={1080} />
    <Composition id="Rentrez" component={RentrezChezVous} durationInFrames={DUREE_RENTREZ} fps={30} width={1080} height={1920} />
    <Composition id="Babyphone" component={LeBabyphone} durationInFrames={DUREE_BABYPHONE} fps={30} width={1080} height={1920} />
    <Composition
      id="LaTente"
      component={LaTente}
      durationInFrames={DUREE_TENTE}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="Hypergamie"
      component={Hypergamie}
      durationInFrames={DUREE_HYPERGAMIE}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DernierTrain"
      component={DernierTrain}
      durationInFrames={DUREE_DERNIER_TRAIN}
      fps={30}
      width={1080}
      height={1920}
    />
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
      id="Vaisseau"
      component={LeVaisseau}
      durationInFrames={DUREE_VAISSEAU}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="Roulette1000"
      component={Roulette1000}
      durationInFrames={DUREE_ROULETTE_1000}
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
