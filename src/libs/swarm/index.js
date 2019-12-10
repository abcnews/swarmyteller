import "core-js/features/typed-array/slice";
import Worker from "./index.worker.js";

const NUM_WORKERS = Math.min(navigator.hardwareConcurrency || 1, 7);

function getPointsFromPointsData(pointsData) {
  const points = new Array(pointsData.length / 2);

  for (let i = 0, len = pointsData.length; i < len; i += 2) {
    points[i >> 1] = [pointsData[i], pointsData[i + 1]];
  }

  return points;
}

const pixelDataCache = {};
const taskCache = {};
const onTaskDone = event => {
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
  const worker = new Worker();

  worker.addEventListener("message", onTaskDone);

  return worker;
});
const getNextWorker = () => {
  const worker = workers.shift();

  workers.push(worker);

  return worker;
};
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

export default data => {
  const { imageURL, numPoints, spacing } = data;
  const id = btoa([imageURL, numPoints, spacing]);

  if (!taskCache[id]) {
    taskCache[id] = new Promise((resolve, reject) => {
      let pixelData;

      function addTask() {
        const message = {
          id,
          data: {
            numPoints,
            pixelData: pixelData.slice(0), // transferrable object must be cloned
            spacing
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
          ctx.drawImage(imgEl, 0, 0, width, height);

          pixelData = ctx.getImageData(0, 0, width, height).data;
          pixelDataCache[imageURL] = pixelData;

          addTask();
        };
        imgEl.onerror = reject;
        imgEl.crossOrigin = "anonymous";
        imgEl.src = imageURL;
      }
    });
  }

  return taskCache[id];
};
