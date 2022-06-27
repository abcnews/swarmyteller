export interface Dot {
  x: number;
  y: number;
  r: number;
  color: string;
}

export interface CanvasDot extends Dot {
  sx: number;
  sy: number;
  scolor: string;
  tx: number;
  ty: number;
  tcolor: string;
}

export interface Cluster extends Dot {
  label: any;
  anchor?: any;

  hasLabel: boolean;
  swarm: any;
  shape: string;
  dotR: number;
  value: number;
  groupLines: any;
}

export interface Swarm {
  value: number;
  label: string;

  shape?: string;
  color?: string;
}

export interface Mark {
  backgroundColor?: string;
  dotRadius?: number;
  swarms: Swarm[];
  align?: string,
}
