import React from 'react';
import { select } from 'd3-selection';
import { scaleOrdinal } from 'd3-scale';
import { csv } from 'd3-request';
import { path } from 'd3-path';
import { timer } from 'd3-timer';
import ranger from 'power-ranger';
import { labeler } from '../../libs/labeler';
import scaleCanvas from '../../libs/scale-canvas';
import swarm from '../../libs/swarm';

import { forceSimulation, forceCollide, forceCenter, forceManyBody, forceX, forceY } from 'd3-force';
import { deg2rad, getRandomInCircle, hexToRgbA, tspans, wordwrap } from '../../utils';
import '../../poly';

import styles from './styles.scss';

const STANDARD_COLOURS = ['#3C6998', '#B05154', '#1B7A7D', '#8D4579', '#97593F', '#605487', '#306C3F'];
const SHAPES = [
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
];
const SHAPE_IMAGE_URLS = SHAPES.reduce(
  (memo, shape) => ({
    ...memo,
    [shape]: `${__webpack_public_path__}shapes/${shape}.png`
  }),
  {}
);
const MQ_LARGE = window.matchMedia('(min-width: 1023px)');

function easeCubicInOut(t) {
  return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
}

export default class Dots extends React.Component {
  constructor(props) {
    super(props);
    this.rootRef = React.createRef();
    this.data = new Promise((resolve, reject) => {
      csv(this.props.dataURL, (err, json) => {
        if (err) return reject(err);
        resolve(json);
      });
    });
  }

  componentWillReceiveProps(nextProps) {
    this.graph.then(g => g.update(nextProps));
  }

  shouldComponentUpdate() {
    return false;
  }

  componentDidMount() {
    if (!this.rootRef.current) {
      return;
    }

    this.graph = this.data
      .then(data => {
        const colorMeta = document.querySelector('meta[name=bg-colours]');
        const colorPropertyMeta = document.querySelector('meta[name=bg-colour-property]');

        const options = {};
        if (colorMeta) options.colors = colorMeta.content.split(',');
        if (colorPropertyMeta) options.colorProperty = colorPropertyMeta.content;

        options.marks = this.props.marks;

        // Re-format group names
        data.forEach(row => {
          row.group = row.group
            .replace(/_/g, '\u00a0')
            .replace(/\(/g, '(\u202f')
            .replace(/\)/g, '\u202f)');
        });

        const viz = graph(this.rootRef.current, data, options);
        viz.update(this.props);
        return viz;
      })
      .catch(error => {
        console.error('Could not load data', error);
      });
  }

  render() {
    return (
      <div className={styles.dots} ref={this.rootRef}>
        {this.props.dotLabel && <div className={styles.dotLabel}>{`= ${this.props.dotLabel}`}</div>}
      </div>
    );
  }
}

function graph(mountNode, data, options) {
  options = Object.assign(
    {
      colors: STANDARD_COLOURS,
      colorProperty: 'measure',
      margin: 20
    },
    options
  );

  let dots = [];
  let clusters = [];
  let canvasDots = [];
  let removedCanvasDots = [];

  const { colors, colorProperty, margin } = options;
  const domain = options.marks.reduce((acc, row) => {
    if (acc.indexOf(row[colorProperty]) === -1) {
      acc.push(row[colorProperty]);
    }
    return acc;
  }, []);

  const colorScale = scaleOrdinal(domain, colors);

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

  const update = async props => {
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
        swarm({
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
          ...d,
          x: width / 2,
          y: height / 2
        };

        return {
          ...cluster,
          swarm: swarms[i],
          color: d.colour || '#fff',
          shape: d.shape,
          r: swarms[i].size / 2,
          dotR: dotRadius || 1,
          value: +d.value,
          groupLines: wordwrap(d.group, 10)
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
