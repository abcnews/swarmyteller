import "core-js/features/array/from";
import "core-js/features/typed-array/fill";
import "regenerator-runtime/runtime";
import asap from "asap";
import { Delaunay } from "d3-delaunay";

const ALPHA_THRESHOLD = 128;
const LLOYDS_ALGORITHM_ITERATIONS = 12;

function generatePositionsAndVisibilities(
  originalSize,
  size,
  numPoints,
  alphas,
  alphaRatio
) {
  const scalingFactor = size / originalSize;
  const maxControlPoints = Math.ceil(numPoints / (1 - alphaRatio));
  const positions = new Float32Array((numPoints + maxControlPoints) * 2);
  const visibilities = new BitSet();
  let positionsWriteIndex = 0;
  let numControlPointsAdded = 0;

  for (let _ = 0; _ < numPoints; _++) {
    let x, y, alpha;

    while (alpha === undefined || alpha < ALPHA_THRESHOLD) {
      x = Math.random() * originalSize;
      y = Math.random() * originalSize;
      alpha = alphas[originalSize * Math.floor(y) + Math.floor(x)];

      if (alpha < ALPHA_THRESHOLD && maxControlPoints > numControlPointsAdded) {
        numControlPointsAdded++;
        positions[positionsWriteIndex++] = x * scalingFactor;
        positions[positionsWriteIndex++] = y * scalingFactor;
      }
    }

    visibilities.add(positionsWriteIndex >> 1);
    positions[positionsWriteIndex++] = x * scalingFactor;
    positions[positionsWriteIndex++] = y * scalingFactor;
  }

  return { positions, visibilities };
}

function extractAlphasFromPixelData(pixelData) {
  const alphas = new Uint8Array(pixelData.length >> 2);

  for (let i = 0, len = pixelData.length; i < len; i += 4) {
    alphas[i >> 2] = pixelData[i + 3];
  }

  return alphas;
}

function getAlphaRatio(alphas) {
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

function process({ id, data }) {
  const { numPoints, pixelData, spacing } = data;
  const alphas = extractAlphasFromPixelData(pixelData);
  const alphaRatio = getAlphaRatio(alphas);
  const originalSize = Math.sqrt(alphas.length);
  const size = Math.floor(
    Math.sqrt(numPoints / alphaRatio / Math.PI) * 2 * spacing
  );
  const { positions, visibilities } = generatePositionsAndVisibilities(
    originalSize,
    size,
    numPoints,
    alphas,
    alphaRatio
  );
  const delaunay = new Delaunay(positions);
  const voronoi = delaunay.voronoi([0, 0, size, size]);
  let iterations = 0;

  (function next() {
    if (iterations++ < LLOYDS_ALGORITHM_ITERATIONS) {
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
    };

    self.postMessage(message, [message.data.pointsData.buffer]);
  })();
}

function centroid(polygon) {
  var i = -1,
    n = polygon.length,
    x = 0,
    y = 0,
    a,
    b = polygon[n - 1],
    c,
    k = 0;

  while (++i < n) {
    a = b;
    b = polygon[i];
    k += c = a[0] * b[1] - b[0] * a[1];
    x += (a[0] + b[0]) * c;
    y += (a[1] + b[1]) * c;
  }

  return (k *= 3), [x / k, y / k];
}

function BitSet() {
  this.words = [];
}

BitSet.prototype.add = function(index) {
  this.resize(index);
  this.words[index >>> 5] |= 1 << index;
};

BitSet.prototype.has = function(index) {
  return (this.words[index >>> 5] & (1 << index)) !== 0;
};

BitSet.prototype.resize = function(index) {
  var count = (index + 32) >>> 5;
  for (var i = this.words.length; i < count; i++) this.words[i] = 0;
};

self.addEventListener("message", event => process(event.data));
