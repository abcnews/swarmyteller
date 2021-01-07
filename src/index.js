import 'regenerator-runtime/runtime';
import acto from '@abcnews/alternating-case-to-object';
import { decode } from '@abcnews/base-36-props';
import { getMountValue, isMount, selectMounts } from '@abcnews/mount-utils';
import { loadScrollyteller } from '@abcnews/scrollyteller';
import React from 'react';
import { render } from 'react-dom';
import App from './components/App';

let appProps;

function renderApp() {
  render(<App {...appProps} />, appProps.scrollyData.mountNode);
}

function init() {
  try {
    // Isolate and decode APP prop from opening scrollyteller tag
    // (which may contain `dataURL`, 'dotLabel' and `dotMinRadius` props for <App />)
    const [decodedAppProps] = selectMounts('scrollytellerNAMEswarmyteller', { markAsUsed: false }).map(el => {
      const mountProps = acto(getMountValue(el));

      el.setAttribute('id', el.getAttribute('id').replace(/APP[a-z0-9]+/, ''));

      return mountProps.app ? decode(mountProps.app) : null;
    });

    // Get scrollteller config, including `align` as a data prop
    const scrollyData = loadScrollyteller('swarmyteller', 'u-full');

    scrollyData.panels.forEach(panel => {
      panel.data.align = panel.align;
    });

    // Keep the DOM tidy.
    if (scrollyData && scrollyData.mountNode) {
      while (isMount(scrollyData.mountNode.nextElementSibling)) {
        scrollyData.mountNode.parentElement.removeChild(scrollyData.mountNode.nextElementSibling);
      }
    }

    // Set <App /> props for initial and subsequent renders
    appProps = {
      ...(decodedAppProps || {}),
      scrollyData
    };
  } catch (e) {
    console.error(e);
  }

  // Initial render
  renderApp();

  // [async: after initial render] Add data-* attriubutes to aligned panels so we can override some styles
  setTimeout(() => {
    appProps.scrollyData.panels.forEach(panel => {
      if (!panel.align || !panel.nodes.length || !panel.nodes[0].parentElement) {
        return;
      }

      panel.nodes[0].parentElement.setAttribute('data-align', panel.align);
    });
  }, 300);
}

if (window.__ODYSSEY__) {
  init();
} else {
  window.addEventListener('odyssey:api', init);
}

if (module.hot) {
  module.hot.accept('./components/App', () => {
    try {
      renderApp();
    } catch (err) {
      import('./components/ErrorBox').then(exports => {
        const ErrorBox = exports.default;
        render(<ErrorBox error={err} />, root);
      });
    }
  });
}

if (process.env.NODE_ENV === 'development') {
  console.debug(`Public path: ${__webpack_public_path__}`);
}
