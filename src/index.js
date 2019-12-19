import "regenerator-runtime/runtime";
import React from "react";
import { render } from "react-dom";
import App from "./components/App";
import { loadOdysseyScrollyteller } from "@abcnews/scrollyteller";

const PROJECT_NAME = "swarmyteller";
const root = document.querySelector(`[data-${PROJECT_NAME}-root]`);

let scrollyteller;

function init() {
  try {
    scrollyteller = loadOdysseyScrollyteller("swarmyteller", "u-full");
  } catch (e) {
    console.error(e);
  }

  // Keep the DOM tidy.
  if (scrollyteller && scrollyteller.mountNode) {
    while (scrollyteller.mountNode.nextElementSibling.tagName === "A") {
      window.__ODYSSEY__.utils.dom.detach(
        scrollyteller.mountNode.nextElementSibling
      );
    }
  }

  render(
    <App
      scrollyData={scrollyteller}
      dataUrl={root.dataset.data || `${__webpack_public_path__}data.csv`}
      dotLabel={root.dataset.dotLabel}
      dotMinRadius={root.dataset.dotMinRadius}
    />,
    scrollyteller.mountNode
  );

  // Add data-* attriubutes to aligned panels so we can override some styles
  scrollyteller.panels.forEach(panel => {
    if (!panel.config.align || !panel.nodes.length) {
      return;
    }

    panel.nodes[0].parentElement.setAttribute("data-align", panel.config.align);
  });
}

if (window.__ODYSSEY__) {
  init();
} else {
  window.addEventListener("odyssey:api", init);
}

if (module.hot) {
  module.hot.accept("./components/App", () => {
    try {
      init();
    } catch (err) {
      import("./components/ErrorBox").then(exports => {
        const ErrorBox = exports.default;
        render(<ErrorBox error={err} />, root);
      });
    }
  });
}

if (process.env.NODE_ENV === "development") {
  console.debug(`[${PROJECT_NAME}] public path: ${__webpack_public_path__}`);
}
