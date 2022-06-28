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
import getPreset from '../../libs/presets';
import { easeCubicInOut, hexToRgbA, tspans, wordwrap } from '../../utils';
import { DEFAULT_ALIGNMENT, SHAPE_IMAGE_URLS, SHAPES, BG_COLOURS, MQ_LARGE } from '../../constants';

import { Mark, Dot, CanvasDot, Cluster } from './types';

export interface GraphInputs {
  mark: Mark,
  dotSpacing: number,
  dotRadius: number,
  height: number,
  width: number,
}

export interface Graph {
  update: (props: GraphInputs) => void;
  updatePreset: (props: GraphInputs) => void;
}

export function graph(mountNode, options) {
  options = Object.assign(
    {
      margin: 20,
      useWorkers: false,
    },
    options
  );

  let dots: Dot[] = [];
  let clusters: Cluster[] = [];
  let canvasDots: CanvasDot[] = [];
  let removedCanvasDots: CanvasDot[] = [];
  let prevProps: GraphInputs | null = null;

  const { margin, useWorkers } = options;

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
      align = mark.align || DEFAULT_ALIGNMENT;
      clusterSimulation = getClusterSimulation(align);
      scaleCanvas(canvasEl, canvasCtx, width, height);
      renderCanvas();
    }

    // Set background colour
    const bgColor = mark.backgroundColor || BG_COLOURS[0];
    rootSelection.style('background-color', bgColor);
    document.documentElement.style.setProperty('--panel-bg-color', bgColor);

    // Calculate and layout swarms
    const swarms = await Promise.all(mark.swarms.map(s => swarm({
      imageURL: SHAPE_IMAGE_URLS[s.shape || 'circle'] || SHAPE_IMAGE_URLS.circle,
      numPoints: +s.value,
      spacing: dotSpacing || 3,
      useWorkers,
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

        //
        // Underscores are converted to spaces, and prevent wrapping
        //
        const label = (swarmDef.label).replace(/_/g, '\u00a0')
            .replace(/\(/g, '(\u202f')
            .replace(/\)/g, '\u202f)');

        return {
          ...cluster,
          swarm: s,
          color: swarmDef.color || '#fff',
          shape: swarmDef.shape || 'circle',
          r: s.size / 2,
          dotR: dotRadius || 1,
          value: +swarmDef.value,
          hasLabel: !!label,
          groupLines: wordwrap(label, 10)
        };
      });

    // Basic fix for labels going off top of screen on small mobiles
    clusters.forEach(d => (d.y += 40)); // Account for label height

    // Labels - using tspans to for multi-line labels
    // Remove old ones to ensure the delayed appearance of the labels
    svgSelection
      .selectAll(`g.${styles.groupLabel}`)
      .remove();
    const groupLabels = svgSelection
      .selectAll(`g.${styles.groupLabel}`)
      .data(clusters.filter(c => c.hasLabel))
        .enter()
          .append('g')
          .attr('class', styles.groupLabel)
          .call(g => {
            g.append('text');
            g.append('path');
          })
      .call(label => label.select('text').call(tspans, d => d.groupLines));

    const presetGroupLabels = svgSelection
      .selectAll(`.preset`)
      .remove();

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
    groupLabels.select('text')
      .attr('fill', d => d.color === '#000000' ? '#FFFFFF' : d.color)
      .attr('transform', d => `translate(${d.label.x}, ${d.label.y})`);

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

  const updatePreset = async (props: GraphInputs) => {
    const { mark } = props;
    const preset = (mark as any).preset;
    if (!mark || deepEqual(props, prevProps)) {
      return;
    }
    prevProps = props;

    dotSpacing = props.dotSpacing;
    dotRadius = props.dotRadius;

    if (width !== props.width || height !== props.height || align !== mark.align) {
      width = props.width;
      height = props.height;
      align = mark.align || DEFAULT_ALIGNMENT;
      clusterSimulation = getClusterSimulation(align);
      scaleCanvas(canvasEl, canvasCtx, width, height);
      renderCanvas();
    }

    // Set color according to measure
    const bgColor = mark.backgroundColor || BG_COLOURS[0];
    rootSelection.style('background-color', bgColor);
    document.documentElement.style.setProperty('--panel-bg-color', bgColor);

    // Lookup preset from SVG file
    const { swarms, labelPoints } = await getPreset(preset, width, height, margin, dotSpacing);

    clusters = swarms
      // Add some properties to the groups
      .map((s, i) => {
        const swarmDef = mark.swarms ? mark.swarms[i] : ({} as any);
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
          groupLines: wordwrap('', 10)
        };
      });

    // Basic fix for labels going off top of screen on small mobiles
    clusters.forEach(d => (d.y += 40)); // Account for label height

    //
    // Remove all labels
    //
    const groupLabels = svgSelection
      .selectAll(`g.${styles.groupLabel}`)
      .remove();
    const presetGroupLabels = svgSelection
      .selectAll(`.preset`)
      .remove();

    const offsetX = MQ_LARGE.matches ? mqLargeOffsetX(width, align, margin) : 0;

    if (labelPoints?.length) {
      const presetGroupLabels = svgSelection
        .selectAll(`g.${styles.presetLabel}`)
        .data(labelPoints.filter(d => !!d[2]))
        .enter()
        .append('g')
        .attr('class', `${styles.presetLabel} preset`)
        .call(g => {
          g.append('text')
          .attr('fill', d => '#FFFFFF')
          .attr('transform', d => `translate(${d[0] - offsetX}, ${d[1]})`)
          .text(d => d[2]);

          // Draw the arc
          g.append('path')
          .attr('d', d => {
            let ctx = path();
            const x = d[0] - 5 - offsetX;
            const y = d[1] + 20;
            const r = 2;
            let rad = 5;
            ctx.moveTo((r + 5) * Math.cos(rad) + x, (r + 10) * Math.sin(rad) + y);
            ctx.lineTo(r * Math.cos(rad) + x, r * Math.sin(rad) + y);
            return ctx.toString();
          });
        });
    }

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

    // Update the swarms
    updateCanvas(clusters);
  };

  function getClusterSimulation(align) {
    // const mqLargeCenterX = alignmentOffset(width, align);

    return forceSimulation()
      .force('gravity', forceCenter(MQ_LARGE.matches ? mqLargeCenterX(width, align, margin) : width / 2, height / 2))
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

  return { update, updatePreset };
}

const mqLargeOffsetX = (width, align, margin) => {
  if (align === 'left') {
    return -1 * (width / 6 + 4 * margin);
  } else if (align === 'right') {
    return width / 6 + 4 * margin;
  } else {
    return 0;
  }
}

const mqLargeCenterX = (width, align, margin) => {
  if (align === 'left') {
    return 2 * width / 3 + 4 * margin;
  } else if (align === 'right') {
    return width / 3 - 4 * margin;
  } else {
    return width / 2;
  }
}
