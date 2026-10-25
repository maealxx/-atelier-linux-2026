import {Composition} from 'remotion';
import {DernierBus, DUREE_BUS} from './DernierBus';
import {Metro} from './Metro';
import {Personnage} from './Personnage';

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
  </>
);
