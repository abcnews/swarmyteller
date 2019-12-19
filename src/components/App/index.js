import React, { useState, useEffect } from "react";
import Scrollyteller from "@abcnews/scrollyteller";
import Dots from "../Dots";
import scrollytellerPanelStyles from "@abcnews/scrollyteller/src/Panel/index.scss";
import styles from "./styles.scss";

export default function App({ scrollyData, dataUrl, dotLabel }) {
  const [mark, setMark] = useState();
  const [dimensions, setDimensions] = useState([
    window.innerWidth,
    window.innerHeight
  ]);
  const minDimension = Math.min.apply(null, dimensions);

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
      config={{ align: "right" }}
      panels={scrollyData.panels}
      panelClassName={`${scrollytellerPanelStyles.base} ${styles.panel}`}
      onMarker={mark => setMark(mark)}
    >
      <Dots
        mark={mark}
        marks={scrollyData.panels.map(d => d.config)}
        dataUrl={dataUrl}
        width={dimensions[0]}
        height={dimensions[1]}
        dotSpacing={minDimension > 1200 ? 6 : minDimension > 600 ? 4.5 : 3}
        dotRadius={minDimension > 1200 ? 2 : minDimension > 600 ? 1.5 : 1}
        dotLabel={dotLabel}
      />
    </Scrollyteller>
  ) : null;
}
