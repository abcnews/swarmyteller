import React, { useState, useEffect } from 'react';
import type { PanelDefinition } from '@abcnews/scrollyteller';
import Scrollyteller from '@abcnews/scrollyteller';
import scrollytellerPanelStyles from '@abcnews/scrollyteller/src/Panel/index.module.scss';
import { decode } from '@abcnews/base-36-props';

import Dots from '../Dots';
import { Mark } from '../Dots/types';
import { DEFAULT_ALIGNMENT, BG_COLOURS } from '../../constants';
import { hexToRgbA } from '../../utils';
import styles from './styles.scss';

export type AppProps = {
  panels: PanelDefinition<any>[];
  align?: string;
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

const setPanelAlignment = (panel) => {
  const markState = panel?.data?.state && decode(panel.data.state);
  panel.align = markState?.align || DEFAULT_ALIGNMENT;
  return panel;
}

const App: React.FC<AppProps> = ({
  panels,
  dotLabel,
  align,
  dotMinRadius = 1
}) => {
  const [mark, setMark] = useState<Mark>();
  const [dimensions, setDimensions] = useState([window.innerWidth, window.innerHeight]);
  const minDimension = Math.min.apply(null, dimensions);
  const minDimensionBasedScaling = value => value * (minDimension > 1200 ? 2 : minDimension > 600 ? 1.5 : 1);

  // Colour the header the same colour as the panel background
  useEffect(() => {
    const firstBgColor = panels.map(p => p?.data?.state ? decode<any>(p.data.state).backgroundColor : null).find(c => !!c);
    const headerEl = document.querySelector('.Header');
    if (headerEl && firstBgColor) {
      // @ts-ignore
      headerEl.style.background = firstBgColor;
    }
    document.documentElement.style.setProperty('--panel-bg-color', hexToRgbA(firstBgColor));
  }, []);

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

  const onMarker= m => {
    if (m?.state) {
      const mark = decode<Mark>(m.state);
      mark.align = align || mark.align;
      setMark(mark);
    }
  };

  return panels && dimensions ? (
    <Scrollyteller
      panels={panels.map(setPanelAlignment)}
      panelClassName={`${scrollytellerPanelStyles.base} ${styles.panel}`}
      onMarker={onMarker}
    >
      <Dots
        mark={mark}
        width={dimensions[0]}
        height={dimensions[1]}
        dotLabel={dotLabel}
        dotRadius={minDimensionBasedScaling(mark?.dotRadius || 1)}
        dotSpacing={minDimensionBasedScaling(mark?.dotRadius || 1) * 1.25 + 0.5}
      />
    </Scrollyteller>
  ) : null;
};

export default App;
