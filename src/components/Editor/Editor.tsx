import React, { useState, useMemo, useEffect } from 'react';
import Dots from '../Dots';
import styles from './styles.scss';

import acto from '@abcnews/alternating-case-to-object';
import { encode, decode } from '@abcnews/base-36-props';
import { GithubPicker } from 'react-color';
import { InlineLoading, Select, SelectItem, CodeSnippet, Button, Tile, Tabs, TabList, Tab, TabPanels, TabPanel, TextInput, NumberInput } from '@carbon/react';
import { Add, Download, TrashCan, Copy, TagImport } from '@carbon/icons-react';

import { BG_COLOURS, DOT_COLOURS, SHAPES, DEFAULT_ALIGNMENT } from '../../constants';

const DEFAULT_SWARM = {
  label: '',
  shape: 'circle',
  value: 100,
};

const SNAPSHOTS_LOCALSTORAGE_KEY = 'swarmyteller-editor-snapshots';
const DEFAULT_PROPS = {
  dotRadius: 2,
  backgroundColor: BG_COLOURS[0],
  swarms: [DEFAULT_SWARM],
};

const Editor = () => {
  const [snapshots, setSnapshots] = useState(JSON.parse(localStorage.getItem(SNAPSHOTS_LOCALSTORAGE_KEY) || '{}'));
  const [dotRadius, setDotRadius] = useState(DEFAULT_PROPS.dotRadius);
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_PROPS.backgroundColor);
  const [align, setAlign] = useState('');
  const [swarms, setSwarms] = useState([
    { ...DEFAULT_SWARM },
  ]);

  const setState = (encodedState: string) => {
    try {
      const state = decode(encodedState) as any;
      setDotRadius(state.dotRadius || DEFAULT_PROPS.dotRadius);
      setBackgroundColor(state.backgroundColor || DEFAULT_PROPS.backgroundColor);
      setSwarms(state.swarms || DEFAULT_PROPS.swarms);
      if (state.align) {
        setAlign(state.align);
      }
      return state;
    } catch (e) {
      console.log(e);
      return null;
    }
  };

  const initialUrlParamProps = useMemo(
    () => {
      const urlQuery = String(window.location.search);
      if (!urlQuery) {
        return;
       }
       const props = JSON.parse(
         '{"' + urlQuery.substring(1).replace(/&/g, '","').replace(/=/g, '":"') + '"}',
         (key, value) => (key === '' ? value : decodeURIComponent(value))
       );
       if (props.state) {
         setState(props.state);
       }
    },
    []
  );

  const stateEncoded = encode({
    dotRadius,
    backgroundColor, 
    swarms,
    ...(align && { align })
  });

  useEffect(() => {
    history.replaceState('', document.title, `?state=${stateEncoded}`);
  }, [stateEncoded]);

  const createSnapshot = () => {
    const name = prompt('What would you like to call this snapshot?');

    if (!name || !name.length) {
      return alert('No name was provided');
    } else if (snapshots[name]) {
      return alert(`Can't overwrite existing snapshot`);
    }
    const nextSnapshots = {
      [name]: stateEncoded,
      ...snapshots
    };

    localStorage.setItem(SNAPSHOTS_LOCALSTORAGE_KEY, JSON.stringify(nextSnapshots));
    setSnapshots(nextSnapshots);
  };

  const deleteSnapshot = (name: string) => {
    const nextSnapshots = { ...snapshots };

    delete nextSnapshots[name];

    localStorage.setItem(SNAPSHOTS_LOCALSTORAGE_KEY, JSON.stringify(nextSnapshots));
    setSnapshots(nextSnapshots);
  };


  const [isDownloadingFallback, setIsDownloadingFallback] = useState(false);
  const downloadFallback = async () => {
    setIsDownloadingFallback(true);

    const fallbackAutomationURL =
      `https://abcnews-cors-anywhere.herokuapp.com/https://fallback-automation.drzax.now.sh/api?url=${encodeURIComponent(
        String(document.location.href).split('?')[0] + `?state=${stateEncoded}`
      )}&width=600&selector=canvas`;

    const res = await fetch(fallbackAutomationURL);
    const blob = await res.blob();
    const data = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = data;
    link.download = `swarmy-fallback-${stateEncoded.slice(10)}.png`;

    // this is necessary as link.click() does not work on the latest firefox
    link.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      })
    );
    setIsDownloadingFallback(false);
  };

  const importMarker = () => {
    const marker = prompt('Paste a marker here to import its configuration');
    if (!marker || !marker.length) {
      return alert('No marker was provided');
    }
    
    const obj = acto(marker);
    const newState = setState(obj.state as string);
    if (!newState) {
      return alert('invalid marker');
    }
  };

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

  const width = window.innerWidth - 350;
  const height = window.innerHeight - 15;

  const minDimension = Math.min(width, height);
  const minDimensionBasedScaling = value => value * (minDimension > 1200 ? 2 : minDimension > 600 ? 1.5 : 1);

  const googleDocPreviewLink = window.location.pathname.replace('/editor.html', '/google-doc.html');

  return (
    <div className={styles.wrapper}>
      <div className={styles.preview}>
        <Dots
          mark={{ backgroundColor, swarms }}
          width={width}
          height={height}
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
            <TabPanel style={{ maxHeight: height - 50, overflow: 'auto' }}>
                <Select
                 style={{ marginBottom: '0.5rem' }}
                 labelText="Align Text (not visible in editor)"
                 size="md"
                 value={align}
                 onChange={e => setAlign(e.target.value)}
                >
                  <SelectItem text={`Default (${DEFAULT_ALIGNMENT})`} value={""} />
                  <SelectItem text={"Left"} value={"left"} />
                  <SelectItem text={"Right"} value={"right"} />
                  <SelectItem text={"Center"} value={"center"} />
                </Select>
                <NumberInput
                  label="Dot Radius"
                  value={dotRadius}
                  step={1}
                  min={1}
                  max={10}
                  onChange={e => setDotRadius(e.imaginaryTarget.value)}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: 0 }}>
                      <TextInput
                        type="text"
                        labelText="Label"
                        value={s.label}
                        onChange={e => updateSwarmProp(i, 'label', e.target.value)}
                       />
                      <Button
                        renderIcon={TrashCan}
                        iconDescription="Remove Swarm"
                        hasIconOnly
                        size="sm"
                        onClick={e => setSwarms([...swarms.slice(0, i), ...swarms.slice(i + 1)])}
                      />
                    </div>
                    <NumberInput
                      label="Dots"
                      value={s.value}
                      step={100}
                      min={1}
                      max={5000}
                      onChange={e => updateSwarmProp(i, 'value', e.imaginaryTarget.value)}
                     />
                     <Select
                      labelText="Shape"
                      size="md"
                      value={s.shape}
                      onChange={e => updateSwarmProp(i, 'shape', e.target.value)}
                     >
                      {SHAPES.map(s => <SelectItem key={s} text={s} value={s} />)}
                    </Select>
                    <ColorPicker
                      labelText="Dot Colour"
                      color={s.color}
                      colors={DOT_COLOURS}
                      onChange={e => updateSwarmProp(i, 'color', e.hex)}
                    />
                  </Tile>
                )}

                <Button
                  renderIcon={Add}
                  size="sm"
                  onClick={e => setSwarms([...swarms, { ...DEFAULT_SWARM }])}
                >
                  Add Swarm
                </Button>
            </TabPanel>
            <TabPanel style={{ maxHeight: height - 50, overflow: 'auto' }}>
              <h4>Markers</h4>

              <span className="cds--label">
                The state of the builder is encoded into a swarmyteller marker.
              </span>
              <span className="cds--label">
                When pasted into the <a href={googleDocPreviewLink}>Google Doc preview</a> or
                a Core Media article, the swarmyteller will reflect the state of the marker.
              </span>
              <CodeSnippet style={{ marginBottom: '0.5rem', }}>
                #markSTATE{stateEncoded}
              </CodeSnippet>

              <span className="cds--label">
                Replace the current state with a marker.
              </span>
              <Button
                style={{ marginBottom: '0.5rem', }}
                onClick={importMarker}
                renderIcon={TagImport}
                size="sm"
              >
                Import Marker
              </Button>

              <span className="cds--label">Swarmyteller open and close tags:</span>
              <CodeSnippet type="inline">
                #scrollytellerNAMEswarmyteller
              </CodeSnippet>
              <CodeSnippet type="inline">
                #endscrollyteller
              </CodeSnippet>

              <h4>Fallbacks</h4>
              {isDownloadingFallback ?
                <InlineLoading
                  style={{ marginTop: '0.5rem', marginBottom: '0.5rem', }}
                  description={'Generating Image'}
                  status={'active'}
                  /> :
                <Button
                  style={{ marginTop: '0.5rem', marginBottom: '0.5rem', }}
                  onClick={downloadFallback}
                  renderIcon={Download}
                  size="sm"
                >
                  Download Fallback
                </Button>
              }

              <h4>Snapshots</h4>

              <span className="cds--label">
                A snapshot is a saved state of the builder. They can be shared as URLs.
              </span>

              <Button
                style={{ marginTop: '0.5rem', marginBottom: '0.5rem', }}
                onClick={createSnapshot}
                renderIcon={Add}
                size="sm"
              >
                Take Snapshot
              </Button>

              <div>
                {Object.keys(snapshots).reverse().map(name => (
                  <Tile key={name} className={styles.snapshot}>
                    <a
                      style={{ maxWidth: 160 }}
                      href={snapshots[name]}
                      onClick={event => {
                        event.preventDefault();
                        setState(snapshots[name]);
                      }}
                    >{name}</a>
                    <div>
                      <Button
                        style={{ marginRight: '0.5rem' }}
                        onClick={() =>
                          navigator.clipboard.writeText(String(window.location.href).split('?')[0] + '?state=' + snapshots[name])
                        }
                        renderIcon={Copy}
                        iconDescription="Copy Snapshot URL"
                        hasIconOnly
                        size="sm"
                      />
                      <Button
                        onClick={() => deleteSnapshot(name)}
                        renderIcon={TrashCan}
                        iconDescription="Delete Snapshot"
                        hasIconOnly
                        size="sm"
                      />
                    </div>
                  </Tile>
                ))}
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
