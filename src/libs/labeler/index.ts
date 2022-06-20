// Fork of https://github.com/tinker10/D3-Labeler

export interface Label {
  x: number;
  y: number;
  width: number;
  height: number;
  name?: string;
}

export interface Anchor {
  x: number;
  y: number;
  r: number;
}

type Energy = (index: number, lab?: Label[], anc?: Anchor[]) => number;

type Schedule = (currT: number, initialT: number, nsweeps: number) => number;

interface Labeler {
  start(nsweeps: number): void;
  width(): number;
  width(x: number): Labeler;
  height(): number;
  height(x: number): Labeler;
  label(): Label[];
  label(x: Label[]): Labeler;
  anchor(): Anchor[];
  anchor(x: Anchor[]): Labeler;
  alt_energy(): Energy;
  alt_energy(x: Energy): Labeler;
  alt_schedule(): Schedule;
  alt_schedule(x: Schedule): Labeler;
}

export function labeler() {
  // User definable data
  let lab: Label[] = [];
  let anc: Anchor[] = [];
  let w = 1; // box width
  let h = 1; // box width
  let user_defined_energy: Energy | null = null;
  let user_defined_schedule: Schedule | null = null;

  const max_move = 5.0;
  const max_angle = 0.2;

  // Possibly useful for debugging
  let acceptedMoves = 0;
  let rejectedMoves = 0;

  // weights
  const w_len = 0.2; // leader line length
  const w_inter = 1.0; // leader line intersection
  const w_lab2 = 30.0; // label-label overlap
  const w_lab_anc = 30.0; // label-anchor overlap
  const w_orient = 3.0; // orientation bias

  const getEnergy: Energy = (i, lab, anc) => (user_defined_energy ? user_defined_energy(i, lab, anc) : energy(i));

  const energy: Energy = function (index) {
    // energy function, tailored for label placement

    let result = 0;

    const label = lab[index];
    const anchor = anc[index];

    let dx = label.x - anchor.x;
    let dy = anchor.y - label.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let overlap = true;

    // penalty for length of leader line
    if (dist > 0) result += dist * w_len;

    // label orientation bias
    dx /= dist;
    dy /= dist;
    if (dx > 0 && dy > 0) {
      result += 0 * w_orient;
    } else if (dx < 0 && dy > 0) {
      result += 1 * w_orient;
    } else if (dx < 0 && dy < 0) {
      result += 2 * w_orient;
    } else {
      result += 3 * w_orient;
    }

    const x21 = label.x;
    const y21 = label.y - label.height + 2.0;
    const x22 = label.x + label.width;
    const y22 = label.y + 2.0;

    let x11: number;
    let x12: number;
    let y11: number;
    let y12: number;
    let x_overlap: number;
    let y_overlap: number;
    let overlap_area: number;

    const m = lab.length;

    for (let i = 0; i < m; i++) {
      if (i != index) {
        // penalty for intersection of leader lines
        overlap = intersect(anchor.x, label.x, anc[i].x, lab[i].x, anchor.y, label.y, anc[i].y, lab[i].y);
        if (overlap) result += w_inter;

        // penalty for label-label overlap
        x11 = lab[i].x;
        y11 = lab[i].y - lab[i].height + 2.0;
        x12 = lab[i].x + lab[i].width;
        y12 = lab[i].y + 2.0;
        x_overlap = Math.max(0, Math.min(x12, x22) - Math.max(x11, x21));
        y_overlap = Math.max(0, Math.min(y12, y22) - Math.max(y11, y21));
        overlap_area = x_overlap * y_overlap;
        result += overlap_area * w_lab2;
      }

      // penalty for label-anchor overlap
      x11 = anc[i].x - anc[i].r;
      y11 = anc[i].y - anc[i].r;
      x12 = anc[i].x + anc[i].r;
      y12 = anc[i].y + anc[i].r;
      x_overlap = Math.max(0, Math.min(x12, x22) - Math.max(x11, x21));
      y_overlap = Math.max(0, Math.min(y12, y22) - Math.max(y11, y21));
      overlap_area = x_overlap * y_overlap;
      result += overlap_area * w_lab_anc;
    }

    return result;
  };

  const mcmove = function (currT: number) {
    // Monte Carlo translation move

    // select a random label
    const i = Math.floor(Math.random() * lab.length);
    const label = lab[i];

    // save old coordinates
    const x_old = label.x;
    const y_old = label.y;

    // old energy
    const old_energy = getEnergy(i, lab, anc);

    // random translation
    label.x += (Math.random() - 0.5) * max_move;
    label.y += (Math.random() - 0.5) * max_move;

    // hard wall boundaries
    if (label.x > w - label.width / 2) label.x = x_old;
    if (label.x < 0 + label.width / 2) label.x = x_old;
    if (label.y > h - label.height / 2) label.y = y_old;
    if (label.y < 0 + label.height / 2) label.y = y_old;

    // new energy
    const new_energy = getEnergy(i, lab, anc);

    // delta E
    var delta_energy = new_energy - old_energy;

    if (Math.random() < Math.exp(-delta_energy / currT)) {
      acceptedMoves += 1;
    } else {
      // move back to old coordinates
      label.x = x_old;
      label.y = y_old;
      rejectedMoves += 1;
    }
  };

  const mcrotate = function (currT: number) {
    // Monte Carlo rotation move

    // select a random label
    const i = Math.floor(Math.random() * lab.length);
    const label = lab[i];
    const anchor = anc[i];

    // save old coordinates
    const x_old = label.x;
    const y_old = label.y;

    // old energy
    const old_energy = getEnergy(i, lab, anc);

    // random angle
    const angle = (Math.random() - 0.5) * max_angle;
    const s = Math.sin(angle);
    const c = Math.cos(angle);

    // translate label (relative to anchor at origin):
    label.x -= anchor.x;
    label.y -= anchor.y;

    // rotate label
    const x_new = label.x * c - label.y * s;
    const y_new = label.x * s + label.y * c;

    // translate label back
    label.x = x_new + anchor.x;
    label.y = y_new + anchor.y;

    // hard wall boundaries
    if (label.x > w) label.x = x_old;
    if (label.x < 0) label.x = x_old;
    if (label.y > h) label.y = y_old;
    if (label.y < 0) label.y = y_old;

    // new energy
    const new_energy = getEnergy(i, lab, anc);

    // delta E
    var delta_energy = new_energy - old_energy;

    if (Math.random() < Math.exp(-delta_energy / currT)) {
      acceptedMoves += 1;
    } else {
      // move back to old coordinates
      label.x = x_old;
      label.y = y_old;
      rejectedMoves += 1;
    }
  };

  const intersect = function (
    x1: number,
    x2: number,
    x3: number,
    x4: number,
    y1: number,
    y2: number,
    y3: number,
    y4: number
  ) {
    // returns true if two lines intersect, else false
    // from http://paulbourke.net/geometry/lineline2d/

    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    const numera = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
    const numerb = (x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3);

    /* Is the intersection along the the segments */
    const mua = numera / denom;
    const mub = numerb / denom;
    return !(mua < 0 || mua > 1 || mub < 0 || mub > 1);
  };

  const cooling_schedule: Schedule = function (currT, initialT, nsweeps) {
    // linear cooling
    return currT - initialT / nsweeps;
  };

  // The returned labeler object
  const labeler = {} as Labeler;

  function start(nsweeps: number) {
    // main simulated annealing function
    const m = lab.length;
    const initialT = 1.0;
    let currT = 1.0;

    for (let i = 0; i < nsweeps; i++) {
      for (let j = 0; j < m; j++) {
        if (Math.random() < 0.5) {
          mcmove(currT);
        } else {
          mcrotate(currT);
        }
      }
      currT = user_defined_schedule
        ? user_defined_schedule(currT, initialT, nsweeps)
        : cooling_schedule(currT, initialT, nsweeps);
    }
  }
  labeler.start = start;

  function width(): number;
  function width(x: number): Labeler;
  function width(x?: number) {
    // users insert graph width
    if (typeof x === 'undefined') return w;
    w = x;
    return labeler;
  }
  labeler.width = width;

  function height(): number;
  function height(x: number): Labeler;
  function height(x?: number) {
    // users insert graph height
    if (typeof x === 'undefined') return h;
    h = x;
    return labeler;
  }
  labeler.height = height;

  function label(): Label[];
  function label(x: Label[]): Labeler;
  function label(x?: Label[]): Label[] | Labeler {
    // users insert label positions
    if (typeof x === 'undefined') return lab;
    lab = x;
    return labeler;
  }
  labeler.label = label;

  function anchor(): Anchor[];
  function anchor(x: Anchor[]): Labeler;
  function anchor(x?: Anchor[]) {
    // users insert anchor positions
    if (typeof x === 'undefined') return anc;
    anc = x;
    return labeler;
  }
  labeler.anchor = anchor;

  // user defined energy
  function alt_energy(): Energy;
  function alt_energy(x: Energy): Labeler;
  function alt_energy(x?: Energy): Energy | Labeler {
    if (typeof x === 'undefined') return user_defined_energy ? user_defined_energy : energy;
    user_defined_energy = x;
    return labeler;
  }
  labeler.alt_energy = alt_energy;

  // user defined cooling_schedule
  function alt_schedule(): Schedule;
  function alt_schedule(x: Schedule): Labeler;
  function alt_schedule(x?: Schedule): Schedule | Labeler {
    if (typeof x === 'undefined') return user_defined_schedule ? user_defined_schedule : cooling_schedule;
    user_defined_schedule = x;
    return labeler;
  }
  labeler.alt_schedule = alt_schedule;

  return labeler;
}
