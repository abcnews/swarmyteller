import { PRESETS } from '../../constants';

const distance = (a, b) => {
   const x = b[0] - a[0];
   const y = b[1] - a[1];
   return x + y;
   // return Math.sqrt((x*x) + (y*y));
};

const nearness = (a, b) => {
  return a[0] * 5 + a[1] * 4 < b[0] * 5 + b[1] * 4 ? -1 : 1
}


export default async function getPreset(preset: string, width: number, height: number, margin: number) {
    const { labelList, shapeUrl } = PRESETS[preset];
    const svg = await fetch(shapeUrl).then(r => r.text());

    const dots = svg.match(/cx="[+-]?([0-9]*[.])?[0-9]+" cy="[+-]?([0-9]*[.])?[0-9]+"/g);
    const points = dots?.map(m => m.split('"')).map(m => [
      parseFloat(m[1]) * 15,
      parseFloat(m[3]) * 15,
    ]).sort(nearness)

    const labels = svg.match(/x="[+-]?([0-9]*[.])?[0-9]+" y="[+-]?([0-9]*[.])?[0-9]+"/g);
    const labelPoints = labels?.map(m => m.split('"')).map((m, i) => [
      parseFloat(m[1]) * 15 + (width / 2 - margin * 2 - 110), // Magic numbers :S
      parseFloat(m[3]) * 15 + (height / 2 - margin * 2 - 130),
      labelList[i],
    ]) as any;

    const swarms = [{
      size: 24 * 15,
      points,
    }];

    return {
      swarms,
      labelPoints,
    };
}
