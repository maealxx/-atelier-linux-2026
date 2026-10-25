import {Composition} from 'remotion';
import {Personnage} from './Personnage';

export const Root = () => (
  <Composition
    id="Personnage"
    component={Personnage}
    durationInFrames={150}
    fps={30}
    width={1080}
    height={1920}
  />
);
