import { sum } from 'd3-array';
import type { Selection } from 'd3-selection';

// while this might not be reprentative for all fonts, it is
// still better than assuming every character has the same width
// (set monospace=true if you want to bypass this)
enum CHAR_W {
  A = 7,
  a = 7,
  B = 8,
  b = 7,
  C = 8,
  c = 6,
  D = 9,
  d = 7,
  E = 7,
  e = 7,
  F = 7,
  f = 4,
  G = 9,
  g = 7,
  H = 9,
  h = 7,
  I = 3,
  i = 3,
  J = 5,
  j = 3,
  K = 8,
  k = 6,
  L = 7,
  l = 3,
  M = 11,
  m = 11,
  N = 9,
  n = 7,
  O = 9,
  o = 7,
  P = 8,
  p = 7,
  Q = 9,
  q = 7,
  R = 8,
  r = 4,
  S = 8,
  s = 6,
  T = 7,
  t = 4,
  U = 9,
  u = 7,
  V = 7,
  v = 6,
  W = 11,
  w = 9,
  X = 7,
  x = 6,
  Y = 7,
  y = 6,
  Z = 7,
  z = 5,
  '.' = 2,
  ',' = 2,
  ' =' = 2,
  ';' = 2
}

export const hexToRgbA = (hexString: string, a = '0.85') => {
  if (!/^#([A-Fa-f0-9]{3}){1,2}$/.test(hexString)) {
    throw new Error('Bad Hex');
  }

  let hexStringDigits = hexString.substring(1).split('');

  if (hexStringDigits.length == 3) {
    hexStringDigits = [
      hexStringDigits[0],
      hexStringDigits[0],
      hexStringDigits[1],
      hexStringDigits[1],
      hexStringDigits[2],
      hexStringDigits[2]
    ];
  }

  const value = Number('0x' + hexStringDigits.join(''));

  return `rgba(${[(value >> 16) & 255, (value >> 8) & 255, value & 255].join(',')},${a})`;
};

export const tspans = (selection, lines) =>
  selection
    .selectAll('tspan')
    .data(parent =>
      (typeof lines == 'function' ? lines(parent) : lines).map(line => ({
        line,
        parent
      }))
    )
    .join('tspan')
    .text(d => d.line)
    .attr('x', 0)
    .attr('dy', (d, i) => (i ? 17 : 0));

export function wordwrap(
  line: string,
  maxCharactersPerLine: number,
  minCharactersPerLine?: number,
  monospace?: boolean
) {
  const char_w = (c: CHAR_W | string) => (!monospace && CHAR_W[c]) || CHAR_W.a;
  const word_len = (d: string) => d.length;
  const num_asc = (a: number, b: number) => a - b;
  const lines: string[] = [];
  const w: string[] = [];
  const words: string[] = [];
  const w1 = line.split(' ');

  w1.forEach((s, i) => {
    const w2 = s.split('-');

    if (w2.length > 1) {
      w2.forEach((t, j) => {
        w.push(t + (j < w2.length - 1 ? '-' : ''));
      });
    } else {
      w.push(s + (i < w1.length - 1 ? ' ' : ''));
    }
  });

  const maxChars = maxCharactersPerLine || 40;
  const minChars =
    minCharactersPerLine ||
    Math.max(3, Math.min(maxChars * 0.5, 0.75 * w.map(word_len).sort(num_asc)[Math.round(w.length / 2)]));
  const maxLineW = maxChars * CHAR_W.a;
  const minLineW = minChars * CHAR_W.a;

  let l = 0;

  w.forEach((d: string) => {
    const ww = sum(d.split('').map(char_w));

    if (l + ww > maxLineW && l > minLineW) {
      lines.push(words.join(''));
      words.length = 0;
      l = 0;
    }

    l += ww;

    return words.push(d);
  });

  if (words.length) {
    lines.push(words.join(''));
  }

  return lines.filter((d: string) => d !== '');
}

export function easeCubicInOut(t: number): number {
  return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
}
