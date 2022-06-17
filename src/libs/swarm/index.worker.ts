import 'core-js/features/array/from';
import 'core-js/features/typed-array/fill';
import 'regenerator-runtime/runtime';
import asap from 'asap';
import { Delaunay } from 'd3-delaunay';
import type { MessageFromWorker, MessageToWorker } from '.';

const ALPHA_THRESHOLD = 128;
const MIN_LLOYDS_ALGORITHM_ITERATIONS = 12;

class BitSet {
  words: number[] = [];

  add(index: number) {
    this.resize(index);
    this.words[index >>> 5] |= 1 << index;
  }

  has(index: number) {
    return (this.words[index >>> 5] & (1 << index)) !== 0;
  }

  resize(index: number) {
    var count = (index + 32) >>> 5;
    for (let i = this.words.length; i < count; i++) {
      this.words[i] = 0;
    }
  }
}

function generatePositionsAndVisibilities(
  originalSize: number,
  size: number,
  numPoints: number,
  alphas: Uint8Array,
  alphaRatio: number
) {
  const scalingFactor = size / originalSize;
  const numTotalPoints = Math.ceil(numPoints / alphaRatio);
  const numControlPoints = numTotalPoints - numPoints;
  const positions = new Float32Array(numTotalPoints * 2);
  const visibilities = new BitSet();
  let positionsWriteIndex = 0;
  let numPointsAdded = 0;
  let numControlPointsAdded = 0;
  let x: number;
  let y: number;
  let alpha: number;

  function appendPositions() {
    positions[positionsWriteIndex++] = x;
    positions[positionsWriteIndex++] = y;
  }

  while (numPointsAdded + numControlPoints < numTotalPoints) {
    x = Math.random() * size;
    y = Math.random() * size;
    alpha = alphas[originalSize * Math.floor(y / scalingFactor) + Math.floor(x / scalingFactor)];

    if (alpha < ALPHA_THRESHOLD && numControlPoints > numControlPointsAdded) {
      numControlPointsAdded++;
      appendPositions();
    } else if (alpha >= ALPHA_THRESHOLD && numPoints > numPointsAdded) {
      visibilities.add(positionsWriteIndex >> 1);
      appendPositions();
      numPointsAdded++;
    }
  }

  return { positions, visibilities };
}

function extractAlphasFromPixelData(pixelData: Uint8ClampedArray) {
  const alphas = new Uint8Array(pixelData.length >> 2);

  for (let i = 0, len = pixelData.length; i < len; i += 4) {
    alphas[i >> 2] = pixelData[i + 3];
  }

  return alphas;
}

function getAlphaRatio(alphas: Uint8Array) {
  let i = 0;
  let len = alphas.length;
  let numAlphasAboveThreshold = 0;

  for (; i < len; i++) {
    if (alphas[i] > ALPHA_THRESHOLD) {
      numAlphasAboveThreshold++;
    }
  }

  return numAlphasAboveThreshold / len;
}

function process({ id, data }: MessageToWorker) {
  const { numPoints, pixelData, spacing } = data;
  const alphas = extractAlphasFromPixelData(pixelData);
  const alphaRatio = getAlphaRatio(alphas);
  const originalSize = Math.sqrt(alphas.length);
  const size = Math.floor(Math.sqrt(numPoints / alphaRatio) * spacing * 2);
  const { positions, visibilities } = generatePositionsAndVisibilities(
    originalSize,
    size,
    numPoints,
    alphas,
    alphaRatio
  );
  const delaunay = new Delaunay(positions);
  const voronoi = delaunay.voronoi([0, 0, size, size]);
  const numIterations = Math.max(MIN_LLOYDS_ALGORITHM_ITERATIONS, Math.ceil(spacing * Math.PI));
  let iterations = 0;

  (function next() {
    if (iterations++ < numIterations) {
      for (let i = 0, len = positions.length; i < len; i += 2) {
        const cell = voronoi.cellPolygon(i >> 1);

        if (cell === null) {
          continue;
        }

        const [x1, y1] = centroid(cell);

        positions[i] = x1;
        positions[i + 1] = y1;
      }

      voronoi.update();

      return asap(next);
    }

    const pointsData = new Float32Array(numPoints * 2);
    let pointsDataWriteIndex = 0;

    for (let i = 0, len = positions.length; i < len; i += 2) {
      if (visibilities.has(i >> 1)) {
        pointsData[pointsDataWriteIndex++] = positions[i];
        pointsData[pointsDataWriteIndex++] = positions[i + 1];
      }
    }

    const message = {
      id,
      data: {
        pointsData,
        size
      }
    } as MessageFromWorker;

    // @ts-ignore
    self.postMessage(message, [message.data.pointsData.buffer]);
  })();
}

function centroid(polygon: Delaunay.Polygon) {
  let i = -1;
  let n = polygon.length;
  let x = 0;
  let y = 0;
  let a: Delaunay.Point;
  let b = polygon[n - 1];
  let c: number;
  let k = 0;

  while (++i < n) {
    a = b;
    b = polygon[i];
    k += c = a[0] * b[1] - b[0] * a[1];
    x += (a[0] + b[0]) * c;
    y += (a[1] + b[1]) * c;
  }

  return (k *= 3), [x / k, y / k];
}

self.addEventListener('message', (event: MessageEvent<MessageToWorker>) => process(event.data));
