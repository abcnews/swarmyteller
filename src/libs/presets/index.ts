import { PRESETS } from '../../constants';

export default async function getPreset(preset: string, width: number, height: number, margin: number) {
    const { labelList, shapeUrl } = PRESETS[preset];
    const svg = await fetch(shapeUrl).then(r => r.text());

    const dots = svg.match(/cx="[+-]?([0-9]*[.])?[0-9]+" cy="[+-]?([0-9]*[.])?[0-9]+"/g);
    const points = dots?.map(m => m.split('"')).map(m => [
      parseFloat(m[1]) * 15, //  + (Math.random()),
      parseFloat(m[3]) * 15, // + (Math.random() * 3 - 1.5)
    ]);

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
