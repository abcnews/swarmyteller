import { path } from 'd3-path';
import type { Simulation } from 'd3-force';
import { forceSimulation, forceCollide, forceCenter, forceManyBody } from 'd3-force';
import { scaleOrdinal } from 'd3-scale';
import { select } from 'd3-selection';
import { timer } from 'd3-timer';
import type { Anchor, Label } from '../../libs/labeler';
import { labeler } from '../../libs/labeler';
import scaleCanvas from '../../libs/scale-canvas';
import type { Swarm } from '../../libs/swarm';
import createSwarm from '../../libs/swarm';
import { hexToRgbA, tspans, wordwrap } from '../../utils';
import type { PanelConfig } from '../App';
import styles from './styles.scss';
import type { Data, DotsProps } from '.';

export const COLOR_PROPERTIES = ['comparison', 'measure'] as const;
const STANDARD_COLOURS = ['#3C6998', '#B05154', '#1B7A7D', '#8D4579', '#97593F', '#605487', '#306C3F'] as const;
export const SHAPES = [
  'australia',
  'battery',
  'bulb',
  'car',
  'circle',
  'dollar',
  'home',
  'power',
  'submarine',
  'sun',
  'water',
  'wrench'
] as const;

const SHAPE_IMAGE_URLS = SHAPES.reduce(
  (memo, shape) => ({
    ...memo,
    [shape]: `${__webpack_public_path__}shapes/${shape}.png`
  }),
  {} as Record<typeof SHAPES[number], string>
);
const MQ_LARGE = window.matchMedia('(min-width: 1023px)');

function easeCubicInOut(t: number) {
  return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
}

export interface VizSettings {
  colorProperty: typeof COLOR_PROPERTIES[number];
  colors: string[];
  margin: number;
  marks: PanelConfig[];
}

export type Viz = {
  update: (props: DotsProps) => void;
};

type Dot = {
  x: number;
  sx: number;
  tx: number;
  y: number;
  sy: number;
  ty: number;
  r: number;
  color: string;
  scolor: string;
  tcolor: string;
};

type Cluster = {
  measure: string;
  comparison: string;
  group: string;
  value: number;
  color: string;
  shape: typeof SHAPES[number];
  x: number;
  y: number;
  r: number;
  dotR: number;
  groupLines: string[];
  swarm: Swarm;
  label: Label;
  anchor: Anchor;
};

export const createViz = (mountNode: HTMLElement, data: Data, options: Partial<VizSettings>): Viz => {
  const settings = {
    colorProperty: 'measure',
    colors: STANDARD_COLOURS,
    margin: 20,
    ...options
  } as VizSettings;

  let clusters: Cluster[] = [];
  let canvasDots: Dot[] = [];
  let removedCanvasDots: Dot[] = [];

  const { colors, colorProperty, margin } = settings;
  const domain = settings.marks.reduce((acc, row) => {
    if (acc.indexOf(row[colorProperty]) === -1) {
      acc.push(row[colorProperty]);
    }
    return acc;
  }, [] as string[]);

  const colorScale = scaleOrdinal(domain, colors);

  let width: number;
  let height: number;
  let align: string | undefined;
  let measure: string;
  let comparison: string;
  let dotSpacing: number;
  let dotRadius: number;

  // Selections
  const rootSelection = select(mountNode);
  const canvasSelection = rootSelection.append('canvas');
  const svgSelection = rootSelection.append('svg');

  const canvasEl = canvasSelection.node() as HTMLCanvasElement;
  const canvasCtx = canvasEl.getContext('2d') as CanvasRenderingContext2D;

  let clusterSimulation: Simulation<Cluster, undefined>;

  function renderCanvas() {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, width, height);

    const renderableDots: Dot[] = [...canvasDots, ...removedCanvasDots];

    for (let i = 0, len = renderableDots.length; i < len; i++) {
      const dot = renderableDots[i];

      canvasCtx.beginPath();
      canvasCtx.arc(dot.x, dot.y, dot.r, 0, 2 * Math.PI);
      canvasCtx.fillStyle = dot.color || 'rgba(255, 255, 255, 0.8)';
      canvasCtx.fill();
    }

    canvasCtx.restore();
  }

  function updateCanvas(clusters: Cluster[]) {
    const numPoints = clusters.reduce((memo, cluster) => (memo += cluster.swarm.points.length), 0);
    let nextDotIndex = 0;

    removedCanvasDots = canvasDots.slice(numPoints);

    canvasDots = clusters.reduce((memo, cluster) => {
      const { points, size } = cluster.swarm;

      points.forEach(point => {
        const dotIndex = nextDotIndex++;

        const tx = cluster.x + point[0] - size / 2;
        const ty = cluster.y + point[1] - size / 2;

        if (!memo[dotIndex]) {
          memo.push({ x: cluster.x, y: cluster.y } as Dot);
        }

        const dot: Dot = memo[dotIndex];

        dot.scolor = dot.color || 'rgba(0,0,0,0)';
        dot.tcolor = cluster.color;
        dot.sx = dot.x;
        dot.sy = dot.y;
        dot.tx = tx;
        dot.ty = ty;
        dot.r = cluster.dotR;
      });

      return memo;
    }, canvasDots.slice(0, numPoints));

    const dotDuration = 750;
    const dotRemovalDuration = 125;
    const dotStagger = 250;
    const duration = dotDuration + dotStagger;
    const timerInstance = timer(elapsed => {
      const progress = Math.min(1, elapsed / duration);

      canvasDots.forEach((dot, dotIndex) => {
        const dotElapsed = Math.max(0, Math.min(dotDuration, elapsed - (dotStagger / numPoints) * dotIndex));
        const dotProgress = Math.min(1, easeCubicInOut(dotElapsed / dotDuration));

        dot.color = dotProgress < 0.5 ? dot.scolor : dot.tcolor;
        dot.x = dot.sx * (1 - dotProgress) + dot.tx * dotProgress;
        dot.y = dot.sy * (1 - dotProgress) + dot.ty * dotProgress;
      });

      removedCanvasDots.forEach((dot, dotIndex) => {
        const dotElapsed = Math.max(
          0,
          Math.min(dotRemovalDuration, elapsed - (dotStagger / removedCanvasDots.length) * dotIndex)
        );
        ``;
        const dotProgress = Math.min(1, easeCubicInOut(dotElapsed / dotRemovalDuration));

        dot.color = dotProgress < 0.5 ? dot.color : 'rgba(0,0,0,0)';
      });

      renderCanvas();

      if (progress === 1) {
        timerInstance.stop();
      }
    });
  }

  const update = async (props: DotsProps) => {
    const { mark } = props;

    if (
      !mark ||
      (align === mark.align &&
        measure === mark.measure &&
        comparison === mark.comparison &&
        dotSpacing === props.dotSpacing &&
        dotRadius === props.dotRadius)
    )
      return;

    measure = mark.measure;
    comparison = mark.comparison;
    dotSpacing = props.dotSpacing;
    dotRadius = props.dotRadius;

    if (width !== props.width || height !== props.height || align !== mark.align) {
      width = props.width;
      height = props.height;
      align = mark.align;
      clusterSimulation = getClusterSimulation(align);
      scaleCanvas(canvasEl, canvasCtx, width, height);
      renderCanvas();
    }

    // Set color according to measure
    const color = colorScale(mark[colorProperty]);

    rootSelection.style('background-color', color);
    document.documentElement.style.setProperty('--panel-bg-color', hexToRgbA(color));

    const measureComparisonGroups = data
      // Just the groups being compared currently
      .filter(d => d.measure === measure && d.comparison === comparison);

    // Calculate and layout swarms
    const swarms = await Promise.all(
      measureComparisonGroups.map(d =>
        createSwarm({
          imageURL: SHAPE_IMAGE_URLS[SHAPES.indexOf(d.shape) > -1 ? d.shape : 'circle'],
          numPoints: +d.value,
          spacing: dotSpacing || 3
        })
      )
    );

    // New data
    clusters = measureComparisonGroups
      // Add some properties to the groups
      .map((d, i) => {
        const existingCluster = clusters.find(c => c.measure === d.measure && c.group === d.group);

        const cluster = existingCluster || {
          measure: d.measure,
          comparison: d.comparison,
          group: d.group,
          x: width / 2,
          y: height / 2
        };

        return {
          ...cluster,
          value: +d.value,
          color: d.colour || '#fff',
          shape: d.shape,
          r: swarms[i].size / 2,
          dotR: dotRadius || 1,
          groupLines: wordwrap(d.group, 10),
          swarm: swarms[i]
        } as Cluster;
      });

    // Basic fix for labels going off top of screen on small mobiles
    clusters.forEach(d => (d.y += 40)); // Account for label height

    // Labels - using tspans to for multi-line labels
    const groupLabels = svgSelection
      .selectAll(`g.${styles.groupLabel}`)
      .data(clusters)
      .join(enter =>
        enter
          .append('g')
          .attr('class', styles.groupLabel)
          .call(g => {
            g.append('text');
            g.append('path');
          })
      )
      .call(label => label.select('text').call(tspans, d => d.groupLines));

    // Resolve cluster positions
    clusterSimulation.nodes(clusters).alpha(1);

    while (clusterSimulation.alpha() > clusterSimulation.alphaMin()) {
      clusterSimulation.tick();

      // Keep it in the bounds.
      clusters.forEach(d => {
        const cappedR = Math.min(d.r, width / 2 - margin * 2, height / 2 - margin * 2);

        d.x = Math.min(width - margin * 2 - cappedR, Math.max(margin + cappedR, d.x));
        d.y = Math.min(height - margin * 2 - cappedR, Math.max(margin + cappedR + 40, d.y));
      });
    }

    // Setup objects for the label positioner to use
    clusters.forEach(d => {
      d.label = {
        x: d.x,
        y: d.y - d.r - 3 - 17 * d.groupLines.length
      } as Label;
      d.anchor = {
        x: d.x,
        y: d.y,
        r: d.r + 20 // Label rotation is jittery
      };
    });

    // Measure the text
    groupLabels.select('text').each(function (d) {
      let bbox = (this as SVGTextElement).getBBox();
      d.label.width = bbox.width;
      d.label.height = bbox.height;
      d.label.name = d.group;
    });

    // Calculate label positions
    labeler()
      .label(clusters.map(d => d.label))
      .anchor(clusters.map(d => d.anchor))
      .width(width - margin * 2)
      .height(height - margin * 2)
      .start(clusters.length * 2);

    // Position the text
    groupLabels.select('text').attr('transform', d => `translate(${d.label.x}, ${d.label.y})`);

    // Draw the arc
    groupLabels.select('path').attr('d', d => {
      let ctx = path();
      let rad = Math.atan2(d.label.y - d.y, d.label.x - d.x);

      ctx.moveTo((d.r + 15) * Math.cos(rad) + d.x, (d.r + 10) * Math.sin(rad) + d.y);
      ctx.lineTo(d.r * Math.cos(rad) + d.x, d.r * Math.sin(rad) + d.y);
      return ctx.toString();
    });

    // Update the swarms
    updateCanvas(clusters);
  };

  function getClusterSimulation(align: string | undefined) {
    const mqLargeCenterX = align === 'left' ? (width / 3) * 2 : align === 'right' ? width / 3 : width / 2;

    return forceSimulation<Cluster>()
      .force('gravity', forceCenter<Cluster>(MQ_LARGE.matches ? mqLargeCenterX : width / 2, height / 2))
      .force(
        'attract',
        forceManyBody<Cluster>()
          .strength(100)
          .distanceMin(10)
          .distanceMax(Math.max(width, height) * 2)
      )
      .force('collide', forceCollide<Cluster>(c => c.r + 40).iterations(3))
      .stop();
  }

  return { update };
};
