import 'regenerator-runtime/runtime';
import acto from '@abcnews/alternating-case-to-object';
import { decode } from '@abcnews/base-36-props';
import { whenOdysseyLoaded } from '@abcnews/env-utils';
import { getMountValue, isMount, selectMounts } from '@abcnews/mount-utils';
import type { ScrollytellerDefinition } from '@abcnews/scrollyteller';
import { loadScrollyteller } from '@abcnews/scrollyteller';
import React from 'react';
import { render } from 'react-dom';
import type { AppProps, PanelConfig } from './components/App';
import App from './components/App';

whenOdysseyLoaded.then(() => {
  // Isolate and decode APP prop from opening scrollyteller tag
  // (which may contain `dataURL`, 'dotLabel' and `dotMinRadius` props for <App />)
  const [decodedAppProps] = selectMounts('scrollytellerNAMEswarmyteller', { markAsUsed: false }).map(el => {
    const mountProps = acto(getMountValue(el));

    el.setAttribute('id', (el.getAttribute('id') || '').replace(/APP[a-z0-9]+/, ''));

    return mountProps.app ? (decode(mountProps.app) as AppProps) : null;
  });

  // Get scrollteller config, including `align` as a data prop
  const scrollytellerDefinition: ScrollytellerDefinition<PanelConfig> = loadScrollyteller('swarmyteller', 'u-full');

  scrollytellerDefinition.panels.forEach(panel => {
    panel.data.align = panel.align;
  });

  // Keep the DOM tidy.
  if (scrollytellerDefinition && scrollytellerDefinition.mountNode) {
    while (
      isMount(scrollytellerDefinition.mountNode.nextElementSibling) &&
      scrollytellerDefinition.mountNode.parentElement
    ) {
      scrollytellerDefinition.mountNode.parentElement.removeChild(scrollytellerDefinition.mountNode.nextElementSibling);
    }
  }

  // Set <App /> props for initial and subsequent renders
  const appProps: AppProps = {
    ...(decodedAppProps || {}),
    panels: scrollytellerDefinition.panels
  };

  // Render app
  render(<App {...appProps} />, scrollytellerDefinition.mountNode);

  // [async: after render] Add data-* attriubutes to aligned panels so we can override some styles
  setTimeout(() => {
    scrollytellerDefinition.panels.forEach(panel => {
      if (!panel.align || !panel.nodes.length || !panel.nodes[0].parentElement) {
        return;
      }

      panel.nodes[0].parentElement.setAttribute('data-align', panel.align);
    });
  }, 300);
});
