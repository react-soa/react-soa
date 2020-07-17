export const range = (size: number) => Array.apply(null, Array(size)).map((a, i) => i);
export const step = (x: number) => x >= 0 ? 1 : 0;
export const ramp = (x: number) => +x * step(x);
export const xrange = (start: number, size: number) => Array.apply(null, Array(~~(size - start + 1))).map((_, j) => j + Math.floor(start));

