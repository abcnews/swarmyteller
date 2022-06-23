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
import { DEFAULT_ALIGNMENT } from './constants';

const setPanelAlignment = (panel) => {
  const markState = panel?.data?.state && decode(panel.data.state);
  panel.align = markState?.align || DEFAULT_ALIGNMENT;
  return panel;
}

const Block: React.FC<ScrollytellerDefinition<any>> = ({
  panels,
  config,
}) => {
  const [mark, setMark] = useState<any>(null!);
  const [dimensions, setDimensions] = useState([window.innerWidth, window.innerHeight]);
  const minDimension = Math.min.apply(null, dimensions);
  const minDimensionBasedScaling = value => value * (minDimension > 1200 ? 2 : minDimension > 600 ? 1.5 : 1);

  const onMarker = (m) => {
    if (m.state) {
      setMark(decode(m.state))
    }
  };

  return (
    <Scrollyteller
      panels={panels.map(setPanelAlignment)}
      {...config}
      onMarker={onMarker}
    >
      <Dots
        mark={mark}
        width={dimensions[0]}
        height={dimensions[1]}
        align={config.align}
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
