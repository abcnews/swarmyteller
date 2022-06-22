
declare var  __webpack_public_path__: string; 

export const BG_COLOURS = ['#0D659C', '#9D1C67', '#625095', '#006B75'];
// export const BG_COLOURS = ['#3C6998', '#B05154', '#1B7A7D', '#8D4579', '#97593F', '#605487', '#306C3F'];
export const DOT_COLOURS = ['#FFFFFF', '#FFD782', '#000000'];
export const SHAPES = [
  'circle',
  'australia',
  'australiadots',
  'australia2',
  'battery',
  'bulb',
  'car',
  'dollar',
  'home',
  'power',
  'submarine',
  'sun',
  'water',
  'wrench'
];
export const SHAPE_IMAGE_URLS: Record<string, any> = SHAPES.reduce(
  (memo, shape) => ({
    ...memo,
    [shape]: `${__webpack_public_path__}shapes/${shape}.png`
  }),
  {}
);
export const MQ_LARGE = window.matchMedia('(min-width: 1023px)');


