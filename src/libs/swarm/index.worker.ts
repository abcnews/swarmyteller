import 'core-js/features/array/from';
import 'core-js/features/typed-array/fill';
import 'regenerator-runtime/runtime';
import { process } from './shared';
import type { MessageFromWorker, MessageToWorker } from '.';

// A wrapper to run this calc in a web worker
//
// This causes issues when previewing in CM10, so it's turned off by default.
// When turned off, the calc happens directly in the main event loop.
self.addEventListener('message', (event: MessageEvent<MessageToWorker>) => process(event.data).then(message => {
  // @ts-ignore
  self.postMessage(message, [message.data.pointsData.buffer])
}));
