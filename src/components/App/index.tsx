import React, { useState, useEffect } from 'react';
import type { PanelDefinition } from '@abcnews/scrollyteller';
import Scrollyteller from '@abcnews/scrollyteller';
import Dots from '../Dots';
import scrollytellerPanelStyles from '@abcnews/scrollyteller/src/Panel/index.module.scss';
import styles from './styles.scss';

export type PanelConfig = {
  measure: string;
  comparison: string;
  align: string | undefined;
};

export type AppProps = {
  panels: PanelDefinition<PanelConfig>[];
  dataURL?: string;
  dotLabel?: string;
  dotMinRadius?: number;
};

type OdysseySchedulerClient = {
  hasChanged: boolean;
  width: number;
  height: number;
  fixedHeight: number;
};

type OdysseySchedulerSubscriber = (client: OdysseySchedulerClient) => void;

type OdysseyAPI = {
  scheduler: {
    subscribe: (subscriber: OdysseySchedulerSubscriber) => void;
    unsubscribe: (subscriber: OdysseySchedulerSubscriber) => void;
  };
};

const App: React.FC<AppProps> = ({
  panels,
  dataURL = `${__webpack_public_path__}data.csv`,
  dotLabel,
  dotMinRadius = 1
}) => {
  const [mark, setMark] = useState<PanelConfig>();
  const [dimensions, setDimensions] = useState([window.innerWidth, window.innerHeight]);
  const minDimension = Math.min.apply(null, dimensions);
  const minDimensionBasedScaling = value => value * (minDimension > 1200 ? 2 : minDimension > 600 ? 1.5 : 1);

  useEffect(() => {
    const updateDimensions = (client: OdysseySchedulerClient) => {
      if (!dimensions || client.hasChanged) {
        setDimensions([client.width, client.height]);
      }
    };
    const { subscribe, unsubscribe } = (window.__ODYSSEY__ as OdysseyAPI).scheduler;

    subscribe(updateDimensions);

    return () => unsubscribe(updateDimensions);
  }, [dimensions]);

  return panels && dimensions ? (
    <Scrollyteller<PanelConfig>
      panels={panels}
      panelClassName={`${scrollytellerPanelStyles.base} ${styles.panel}`}
      onMarker={mark => setMark(mark)}
    >
      <Dots
        mark={mark}
        marks={panels.map(d => d.data)}
        dataURL={dataURL}
        width={dimensions[0]}
        height={dimensions[1]}
        dotLabel={dotLabel}
        dotRadius={minDimensionBasedScaling(dotMinRadius)}
        dotSpacing={minDimensionBasedScaling(dotMinRadius) * 1.25 + 0.5}
      />
    </Scrollyteller>
  ) : null;
};

export default App;