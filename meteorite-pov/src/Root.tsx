import {Composition} from 'remotion';
import {MeteoritePOV} from './MeteoritePOV';
import {DURATION, FPS} from './timeline';

export const RemotionRoot = () => (
  <Composition
    id="MeteoritePOV"
    component={MeteoritePOV}
    durationInFrames={DURATION}
    fps={FPS}
    width={1080}
    height={1920}
  />
);
