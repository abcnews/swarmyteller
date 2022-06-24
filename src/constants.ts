declare var  __webpack_public_path__: string; 

export const DEFAULT_ALIGNMENT = 'left';

export const BG_COLOURS = ['#0D659C', '#9D1C67', '#625095', '#006B75'];
export const DOT_COLOURS = ['#FFFFFF', '#FFD782', '#000000'];
export const SHAPES = [
  'circle',
  'australia',
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


export const PRESETS = {
  australiadots: {
    labelList: ['Australia as 100 people'],
    shapeUrl: `${__webpack_public_path__}shapes/australiadots.svg`
  },
  statesdotsindpop: {
    labelList: [
      'NSW',
      'QLD',
      'TAS',
      'ACT',
      'VIC',
      'SA',
      'WA',
      'NT',
    ],
    shapeUrl: `${__webpack_public_path__}shapes/statesdotsindpop.svg`
  },
  statesdotspop: {
    labelList: [
      'NSW',
      'QLD',
      'TAS',
      'ACT',
      'VIC',
      'SA',
      'WA',
      'NT',
    ],
    shapeUrl: `${__webpack_public_path__}shapes/statesdotspop.svg`
  },
};
