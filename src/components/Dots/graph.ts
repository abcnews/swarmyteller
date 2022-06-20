import { select } from 'd3-selection';
import { scaleOrdinal } from 'd3-scale';
import { path } from 'd3-path';
import { timer } from 'd3-timer';
import { forceSimulation, forceCollide, forceCenter, forceManyBody, forceX, forceY } from 'd3-force';
import deepEqual from 'deep-equal';

import styles from './styles.scss';

import '../../poly';
import { labeler } from '../../libs/labeler';
import scaleCanvas from '../../libs/scale-canvas';
import swarm from '../../libs/swarm';
import { easeCubicInOut, hexToRgbA, tspans, wordwrap } from '../../utils';
import { SHAPE_IMAGE_URLS, SHAPES, BG_COLOURS, MQ_LARGE } from '../../constants';

import { Mark, Dot, CanvasDot, Cluster } from './types';

export interface GraphInputs {
  mark: Mark,
  dotSpacing: number,
  dotRadius: number,
  height: number,
  width: number
}

export interface Graph {
  update: (props: GraphInputs) => void;
}

export function graph(mountNode, options) {
  options = Object.assign(
    {
      margin: 20
    },
    options
  );

  let dots: Dot[] = [];
  let clusters: Cluster[] = [];
  let canvasDots: CanvasDot[] = [];
  let removedCanvasDots: CanvasDot[] = [];
  let prevProps: GraphInputs | null = null;

  const { margin } = options;

  let width;
  let height;
  let align;
  let measure;
  let comparison;
  let dotSpacing;
  let dotRadius;

  // Selections
  const rootSelection = select(mountNode);
  const canvasSelection = rootSelection.append('canvas');
  const svgSelection = rootSelection.append('svg');

  const canvasEl = canvasSelection.node();
  const canvasCtx = canvasSelection.node().getContext('2d');

  let clusterSimulation;

  function renderCanvas() {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, width, height);

    const renderableDots = [...canvasDots, ...removedCanvasDots];

    for (let i = 0, len = renderableDots.length; i < len; i++) {
      const dot = renderableDots[i];

      canvasCtx.beginPath();
      canvasCtx.arc(dot.x, dot.y, dot.r, 0, 2 * Math.PI);
      canvasCtx.fillStyle = dot.color || 'rgba(255, 255, 255, 0.8)';
      canvasCtx.fill();
    }

    canvasCtx.restore();
  }

  function updateCanvas(clusters) {
    const numPoints = clusters.reduce((memo, cluster) => (memo += cluster.swarm.points.length), 0);
    let nextDotIndex = 0;

    removedCanvasDots = canvasDots.slice(numPoints);

    canvasDots = clusters.reduce((memo, cluster) => {
      const { points, size } = cluster.swarm;

      points.forEach(point => {
        const dotIndex = nextDotIndex++;

        const tx = cluster.x + point[0] - size / 2;
        const ty = cluster.y + point[1] - size / 2;

        const dot = memo[dotIndex] || (memo.push({ x: cluster.x, y: cluster.y }) && memo[memo.length - 1]);

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
        ``;
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

  const update = async (props: GraphInputs) => {
    const { mark } = props;
    if (!mark || deepEqual(props, prevProps)) {
      return;
    }
    prevProps = props;

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
    const bgColor = mark.backgroundColor || BG_COLOURS[0];
    rootSelection.style('background-color', bgColor);
    document.documentElement.style.setProperty('--panel-bg-color', hexToRgbA(bgColor));

    // Calculate and layout swarms
    const swarms = await Promise.all(mark.swarms.map(s => swarm({
      imageURL: SHAPE_IMAGE_URLS[s.shape || 'circle'] || SHAPE_IMAGE_URLS.circle,
      numPoints: +s.value,
      spacing: dotSpacing || 3,
    })));

    // New data
    clusters = swarms
      // Add some properties to the groups
      .map((s, i) => {
        const swarmDef = mark.swarms[i];

        const existingCluster = clusters.find(c => c.value === swarmDef.value && c.label === swarmDef.value);

        const cluster = existingCluster || {
          ...swarmDef,
          x: width / 2,
          y: height / 2
        };

        return {
          ...cluster,
          swarm: s,
          color: swarmDef.color || '#fff',
          shape: swarmDef.shape || 'circle',
          r: s.size / 2,
          dotR: dotRadius || 1,
          value: +swarmDef.value,
          groupLines: wordwrap(swarmDef.label, 10)
        };
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
      };
      d.anchor = {
        x: d.x,
        y: d.y,
        r: d.r + 20 // Label rotation is jittery
      };
    });

    // Measure the text
    groupLabels.select('text').each(function(d) {
      // @ts-ignore
      let bbox = this.getBBox();
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
      // ctx.arc(
      //   d.anchor.x,
      //   d.anchor.y,
      //   d.r,
      //   rad - deg2rad(30),
      //   rad + deg2rad(30)
      // );
      ctx.moveTo((d.r + 15) * Math.cos(rad) + d.x, (d.r + 10) * Math.sin(rad) + d.y);
      ctx.lineTo(d.r * Math.cos(rad) + d.x, d.r * Math.sin(rad) + d.y);
      return ctx.toString();
    });

    // Update the swarms
    updateCanvas(clusters);
  };

  function getClusterSimulation(align) {
    const mqLargeCenterX = align === 'left' ? (width / 3) * 2 : align === 'right' ? width / 3 : width / 2;

    return forceSimulation()
      .force('gravity', forceCenter(MQ_LARGE.matches ? mqLargeCenterX : width / 2, height / 2))
      .force(
        'attract',
        forceManyBody()
          .strength(100)
          .distanceMin(10)
          .distanceMax(Math.max(width, height) * 2)
      )
      .force('collide', forceCollide(c => c.r + 40).iterations(3))
      .stop();
  }

  return { update };
}
