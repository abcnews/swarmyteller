import 'core-js/features/typed-array/slice';
import type { Delaunay } from 'd3-delaunay';

interface Swarm {
  points: Delaunay.Point[];
  size: number;
}

type SwarmPromise = Promise<Swarm> & {
  _resolve: (swarm: Swarm) => void;
};

interface Config {
  imageURL: string;
  numPoints: number;
  spacing: number;
}

export interface MessageToWorker {
  id: string;
  data: {
    numPoints: number;
    spacing: number;
    pixelData: ImageData['data'];
  };
}

export interface MessageFromWorker {
  id: string;
  data: {
    size: number;
    pointsData: Float32Array;
  };
}

const NUM_WORKERS = Math.min(navigator.hardwareConcurrency || 1, 7);

function getPointsFromPointsData(pointsData: Float32Array) {
  const points: Delaunay.Point[] = new Array(pointsData.length / 2);

  for (let i = 0, len = pointsData.length; i < len; i += 2) {
    points[i >> 1] = [pointsData[i], pointsData[i + 1]];
  }

  return points;
}

const pixelDataCache: Record<string, ImageData['data']> = {};
const taskCache: Record<string, SwarmPromise> = {};
const onTaskDone = (event: MessageEvent<MessageFromWorker>) => {
  const {
    id,
    data: { pointsData, size }
  } = event.data;

  if (!taskCache[id]) {
    return;
  }

  taskCache[id]._resolve({ points: getPointsFromPointsData(pointsData), size });
};
const workers = [...Array(NUM_WORKERS)].map(() => {
  const worker = new Worker(new URL('./index.worker.ts', import.meta.url));

  worker.addEventListener('message', onTaskDone);

  return worker;
});
const getNextWorker = () => {
  if (workers.length === 0) {
    throw new Error('No workers');
  }

  const worker = workers.shift() as Worker;

  workers.push(worker);

  return worker;
};
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

export default (config: Config): SwarmPromise => {
  const { imageURL, numPoints, spacing } = config;
  const id = btoa(String([imageURL, numPoints, spacing]));

  if (!taskCache[id]) {
    taskCache[id] = new Promise((resolve, reject) => {
      let pixelData: ImageData['data'];

      function addTask() {
        const message: MessageToWorker = {
          id,
          data: {
            numPoints,
            spacing,
            pixelData: pixelData.slice(0) // transferrable object must be cloned
          }
        };

        if (!taskCache[id]) {
          return; // this only occurs when hot-reloading
        }

        taskCache[id]._resolve = resolve;
        getNextWorker().postMessage(message, [message.data.pixelData.buffer]);
      }

      pixelData = pixelDataCache[imageURL];

      if (pixelData) {
        requestAnimationFrame(addTask); // must be async
      } else {
        const imgEl = new Image();

        imgEl.onload = () => {
          const { width, height } = imgEl;

          canvas.width = width;
          canvas.height = height;

          if (ctx) {
            ctx.drawImage(imgEl, 0, 0, width, height);

            pixelData = ctx.getImageData(0, 0, width, height).data;
            pixelDataCache[imageURL] = pixelData;
            addTask();
          }
        };
        imgEl.onerror = reject;
        imgEl.crossOrigin = 'anonymous';
        imgEl.src = imageURL;
      }
    }) as SwarmPromise;
  }

  return taskCache[id];
};
