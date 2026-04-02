/**
 * Colour maps for field rendering.
 * All functions take a value in [0, 1] and return [r, g, b] in [0, 255].
 */

/** Blue-cyan-white for probability density |psi|^2 */
export function colormapWave(t: number): [number, number, number] {
  // 0 -> deep navy, 0.5 -> cyan, 1 -> white
  t = Math.max(0, Math.min(1, t));
  const r = Math.round(t < 0.5 ? t * 2 * 0 : (t - 0.5) * 2 * 255);
  const g = Math.round(t < 0.5 ? t * 2 * 200 : 200 + (t - 0.5) * 2 * 55);
  const b = Math.round(t < 0.5 ? 80 + t * 2 * 175 : 255);
  return [r, g, b];
}

/** Diverging blue-white-red for Re(psi) */
export function colormapDiverging(t: number): [number, number, number] {
  // t=0 -> blue, t=0.5 -> white, t=1 -> red
  t = Math.max(0, Math.min(1, t));
  if (t < 0.5) {
    const s = t * 2;
    return [
      Math.round(s * 255),
      Math.round(s * 255),
      255,
    ];
  } else {
    const s = (t - 0.5) * 2;
    return [
      255,
      Math.round((1 - s) * 255),
      Math.round((1 - s) * 255),
    ];
  }
}

/** Plasma colourmap for quantum potential Q (dark=low, bright=high) */
export function colormapPlasma(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  // Approximate plasma: black -> purple -> magenta -> orange -> yellow
  const stops: Array<[number, number, number, number]> = [
    [0.00, 13,  8,  135],
    [0.25, 126, 3,  168],
    [0.50, 204, 71, 120],
    [0.75, 248, 149, 64],
    [1.00, 240, 249, 33],
  ];

  let i = 0;
  while (i < stops.length - 2 && t > stops[i + 1][0]) i++;

  const [t0, r0, g0, b0] = stops[i];
  const [t1, r1, g1, b1] = stops[i + 1];
  const s = (t - t0) / (t1 - t0);

  return [
    Math.round(r0 + s * (r1 - r0)),
    Math.round(g0 + s * (g1 - g0)),
    Math.round(b0 + s * (b1 - b0)),
  ];
}
