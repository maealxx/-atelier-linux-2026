import {Composition} from 'remotion';
import {MeteoritePOV} from './MeteoritePOV';
import {Meteorite25D} from './v25d/Meteorite25D';
import {DURATION, FPS} from './timeline';

export const RemotionRoot = () => (
  <>
    <Composition
      id="Meteorite25D"
      component={Meteorite25D}
      durationInFrames={DURATION}
      fps={FPS}
      width={1080}
      height={1920}
    />
    <Composition
      id="MeteoritePOV"
      component={MeteoritePOV}
      durationInFrames={DURATION}
      fps={FPS}
      width={1080}
      height={1920}
    />
  </>
);
