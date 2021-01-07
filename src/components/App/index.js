import React, { useState, useEffect } from 'react';
import Scrollyteller from '@abcnews/scrollyteller';
import Dots from '../Dots';
import scrollytellerPanelStyles from '@abcnews/scrollyteller/src/Panel/index.module.scss';
import styles from './styles.scss';

export default function App({
  scrollyData,
  dataURL = `${__webpack_public_path__}data.csv`,
  dotLabel,
  dotMinRadius = 1
}) {
  const [mark, setMark] = useState();
  const [dimensions, setDimensions] = useState([window.innerWidth, window.innerHeight]);
  const minDimension = Math.min.apply(null, dimensions);
  const minDimensionBasedScaling = value => value * (minDimension > 1200 ? 2 : minDimension > 600 ? 1.5 : 1);

  useEffect(() => {
    const updateDimensions = context => {
      if (!dimensions || context.hasChanged) {
        setDimensions([context.width, context.height]);
      }
    };

    window.__ODYSSEY__.scheduler.subscribe(updateDimensions);
    return () => window.__ODYSSEY__.scheduler.unsubscribe(updateDimensions);
  }, [dimensions]);

  return scrollyData && dimensions ? (
    <Scrollyteller
      panels={scrollyData.panels}
      panelClassName={`${scrollytellerPanelStyles.base} ${styles.panel}`}
      onMarker={mark => setMark(mark)}
    >
      <Dots
        mark={mark}
        marks={scrollyData.panels.map(d => d.data)}
        dataURL={dataURL}
        width={dimensions[0]}
        height={dimensions[1]}
        dotLabel={dotLabel}
        dotRadius={minDimensionBasedScaling(dotMinRadius)}
        dotSpacing={minDimensionBasedScaling(dotMinRadius) * 1.25 + 0.5}
      />
    </Scrollyteller>
  ) : null;
}
