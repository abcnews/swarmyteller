import type { DSVParsedArray, DSVRowString } from 'd3-dsv';
import { csv } from 'd3-request';
import React, { useEffect, useRef, useState } from 'react';
import '../../poly';
import type { PanelConfig } from '../App';
import styles from './styles.scss';
import type { COLOR_PROPERTIES, SHAPES, Viz, VizSettings } from './viz';
import { createViz } from './viz';

export type Datum = DSVRowString<string> & {
  measure: string;
  comparison: string;
  group: string;
  value: string;
  colour: string;
  shape: typeof SHAPES[number];
};

export type Data = DSVParsedArray<Datum>;

export interface DotsProps {
  dataURL: string;
  dotLabel?: string;
  dotRadius: number;
  dotSpacing: number;
  mark: PanelConfig | undefined;
  marks: PanelConfig[];
  width: number;
  height: number;
}

const Dots: React.FC<DotsProps> = props => {
  const { dataURL, dotLabel, mark, marks } = props;
  const [data, setData] = useState<Data>();
  const [viz, setViz] = useState<Viz>();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    csv(dataURL, (err, json) => {
      if (!err) {
        const data = json as unknown as Data;

        // Re-format group names
        data.forEach(row => {
          row.group = row.group.replace(/_/g, '\u00a0').replace(/\(/g, '(\u202f').replace(/\)/g, '\u202f)');
        });

        setData(data);
      }
    });
  }, []);

  useEffect(() => {
    if (rootRef.current === null || !data) {
      return;
    }

    const options: Partial<VizSettings> = {
      marks
    };

    const colorMeta = document.querySelector<HTMLMetaElement>('meta[name=bg-colours]');
    const colorPropertyMeta = document.querySelector<HTMLMetaElement>('meta[name=bg-colour-property]');

    if (colorMeta) {
      options.colors = colorMeta.content.split(',');
    }

    if (colorPropertyMeta) {
      options.colorProperty = colorPropertyMeta.content as typeof COLOR_PROPERTIES[number] | undefined;
    }

    const viz = createViz(rootRef.current, data, options);

    // viz.update(props);

    setViz(viz);
  }, [rootRef, data]);

  useEffect(() => {
    if (!viz) {
      return;
    }

    viz.update(props);
  }, [viz, mark]);

  return (
    <div ref={rootRef} className={styles.dots}>
      {dotLabel && <div className={styles.dotLabel}>{`= ${dotLabel}`}</div>}
    </div>
  );
};

export default Dots;
