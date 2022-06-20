import React, { useState } from 'react';
import Dots from '../Dots';
import styles from './styles.scss';

import acto from '@abcnews/alternating-case-to-object';
import { encode, decode } from '@abcnews/base-36-props';
import { GithubPicker } from 'react-color';
import { Select, SelectItem, CodeSnippet, Button, Tile, Tabs, TabList, Tab, TabPanels, TabPanel, TextInput, NumberInput } from '@carbon/react';
import { Add, Subtract } from '@carbon/icons-react';

import { BG_COLOURS, DOT_COLOURS, SHAPES } from '../../constants';

const DEFAULT_SWARM = {
  label: '',
  shape: 'circle',
  value: 100,
};

const Editor = () => {
  // const [dotLabel, setDotLabel] = useState('');
  const [dotRadius, setDotRadius] = useState(2);
  const [backgroundColor, setBackgroundColor] = useState(BG_COLOURS[0]);
  const [swarms, setSwarms] = useState([
    { ...DEFAULT_SWARM },
  ]);

  const updateSwarmProp = (i, key, value) => {
    setSwarms([
      ...swarms.slice(0, i),
      {
        ...swarms[i],
        [key]: value,
      },
      ...swarms.slice(i + 1),
    ]);
  }

  const importMarker = () => {
    const marker = prompt('Paste a marker here to import its configuration');
    if (!marker || !marker.length) {
      return alert('No marker was provided');
    }
    
    const obj = acto(marker);

    try {
      const state = decode(obj.state as string) as any;
      if (!state) {
        return alert('invalid marker');
      }
      setDotRadius(state.dotRadius);
      setSwarms(state.swarms);
      setBackgroundColor(state.backgroundColor);
    } catch (e) {
      console.error(e);
      return alert('invalid marker');
    }
  };

  const minDimension = 500;
  const minDimensionBasedScaling = value => value * (minDimension > 1200 ? 2 : minDimension > 600 ? 1.5 : 1);

  const stateEncoded = encode({
    // dotLabel,
    dotRadius,
    backgroundColor, 
    swarms
  });

  return (
    <div className={styles.wrapper}>
      <div className={styles.preview}>
        <Dots
          mark={{ backgroundColor, swarms }}
          width={700}
          height={500}
          dotLabel={''}
          dotRadius={minDimensionBasedScaling(dotRadius)}
          dotSpacing={minDimensionBasedScaling(dotRadius) * 1.25 + 0.5}
        />
      </div>
      <div className={styles.controls}>
        <Tabs>
          <TabList aria-label="List of tabs" contained>
            <Tab>Controls</Tab>
            <Tab>Markers</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
                <NumberInput
                  label="Dot Radius"
                  value={dotRadius}
                  onChange={e => setDotRadius(e.target.value)}
                 />
                <ColorPicker
                  labelText="Background Color"
                  color={backgroundColor}
                  colors={BG_COLOURS}
                  onChange={e => setBackgroundColor(e.hex)}
                />

                <h4>Swarms</h4>
                {swarms.map((s, i) =>
                  <Tile className={styles.swarm}>
                    <TextInput
                      type="text"
                      labelText="Label"
                      value={s.label}
                      onChange={e => updateSwarmProp(i, 'label', e.target.value)}
                     />
                    <NumberInput
                      label="Dots"
                      value={s.value}
                      onChange={e => updateSwarmProp(i, 'value', e.target.value)}
                     />
                     <Select
                      labelText="Shape"
                      size="md"
                      value={s.shape}
                      onChange={e => updateSwarmProp(i, 'shape', e.target.value)}
                     >
                      {SHAPES.map(s => <SelectItem key={s} text={s} value={s} />)}
                    </Select>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: 0 }}>
                      <ColorPicker
                        labelText="Dot Colour"
                        color={s.color}
                        colors={DOT_COLOURS}
                        onChange={e => updateSwarmProp(i, 'color', e.hex)}
                      />
                      <Button
                        renderIcon={Subtract}
                        iconDescription="Remove Swarm"
                        hasIconOnly
                        size="md"
                        onClick={e => setSwarms([...swarms.slice(0, i), ...swarms.slice(i + 1)])}
                      />
                    </div>
                  </Tile>
                )}

                <Button
                  renderIcon={Add}
                  iconDescription="Add Swarm"
                  hasIconOnly
                  size="md"
                  onClick={e => setSwarms([...swarms, { ...DEFAULT_SWARM }])}
                />
            </TabPanel>
            <TabPanel>
              <CodeSnippet>
                #markSTATE{stateEncoded}
              </CodeSnippet>
              <div style={{ padding: '1rem' }} onClick={importMarker}>
                <Button>Import Marker</Button>
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
};

const ColorPicker = (props) => {
  const [isOpen, setIsOpen] = useState(false);

  const onChange = (e) => {
    setIsOpen(false);
    if (props.onChange) {
      props.onChange(e);
    }
  };

  return (<div className={styles.picker}>
    <span className="cds--label">{props.labelText}</span>
    <div className={styles.swatch} onClick={() => setIsOpen(!isOpen) }>
      <div className={styles.color} style={{ background: props.color }} />
    </div>
    {isOpen && (<>
      <div className={styles.popover}>
        <GithubPicker colors={props.colors} color={props.color} onChange={onChange} />
      </div>
      <div className={styles.cover} onClick={() => setIsOpen(false)} />
    </>)}
  </div>);
};

export default Editor;
