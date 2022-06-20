import 'regenerator-runtime/runtime';

import React, { useState } from 'react';
import { render } from 'react-dom';

import { decode } from '@abcnews/base-36-props';
import { whenDOMReady } from '@abcnews/env-utils';
import { selectMounts } from '@abcnews/mount-utils';
import GoogleDocScrollyteller from '@abcnews/google-doc-scrollyteller';
import Scrollyteller from '@abcnews/scrollyteller';
import type { ScrollytellerDefinition } from '@abcnews/scrollyteller';

import Dots from './components/Dots';

const Block: React.FC<ScrollytellerDefinition<any>> = ({
  panels,
  config,
}) => {
  const [mark, setMark] = useState<any>(null!);
  const [dimensions, setDimensions] = useState([window.innerWidth, window.innerHeight]);
  const minDimension = Math.min.apply(null, dimensions);
  const minDimensionBasedScaling = value => value * (minDimension > 1200 ? 2 : minDimension > 600 ? 1.5 : 1);

  return (
    <Scrollyteller
      panels={panels}
      {...config}
      onMarker={m => m?.state && setMark(decode(m.state))}
    >
      <Dots
        mark={mark}
        width={dimensions[0]}
        height={dimensions[1]}
        dotLabel={mark?.dotLabel}
        dotRadius={minDimensionBasedScaling(mark?.dotRadius || 1)}
        dotSpacing={minDimensionBasedScaling(mark?.dotRadius || 1) * 1.25 + 0.5}
      />
    </Scrollyteller>
  );
};



const App: React.FC = () => (
  <GoogleDocScrollyteller
    renderPreview={(props) => <Block {...props} />}
  />
);

whenDOMReady.then(() => render(<App />, selectMounts('googledoc')[0]));
