/**
 * Huygens-Fresnel wave function computation.
 *
 * Each slit is discretised into SOURCES_PER_SLIT point sources.
 * psi(x, y) = sum over all sources of exp(i*k*r) / sqrt(r)
 *
 * Returns two Float32Arrays: re and im, each of length GRID_W * GRID_H.
 * Index mapping: idx = y * GRID_W + x
 * Only computed for y > BARRIER_Y (the region beyond the slits).
 */

import { GRID_W, GRID_H, K, BARRIER_Y, SOURCES_PER_SLIT } from './constants';

export interface WaveField {
  re: Float32Array;
  im: Float32Array;
  amp: Float32Array;  // |psi|
  prob: Float32Array; // |psi|^2, normalised to [0,1]
}

export interface SlitParams {
  slitWidth: number;   // full width in grid cells
  slitSep: number;     // centre-to-centre separation in grid cells
}

export function computeWaveField(params: SlitParams): WaveField {
  const { slitWidth, slitSep } = params;
  const cx = GRID_W / 2;

  // Slit centres
  const slit1Centre = cx - slitSep / 2;
  const slit2Centre = cx + slitSep / 2;

  // Build source positions (x, y=BARRIER_Y) for both slits
  const sources: Array<[number, number]> = [];

  for (let s = 0; s < SOURCES_PER_SLIT; s++) {
    const t = (s + 0.5) / SOURCES_PER_SLIT; // 0..1
    // Slit 1
    sources.push([slit1Centre - slitWidth / 2 + t * slitWidth, BARRIER_Y]);
    // Slit 2
    sources.push([slit2Centre - slitWidth / 2 + t * slitWidth, BARRIER_Y]);
  }

  const total = GRID_W * GRID_H;
  const re = new Float32Array(total);
  const im = new Float32Array(total);
  const amp = new Float32Array(total);
  const prob = new Float32Array(total);

  let maxProb = 0;

  for (let y = BARRIER_Y + 1; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      let sumRe = 0;
      let sumIm = 0;

      for (const [sx, sy] of sources) {
        const dx = x - sx;
        const dy = y - sy;
        const r = Math.sqrt(dx * dx + dy * dy);
        if (r < 0.5) continue; // avoid singularity directly at source

        const phase = K * r;
        const invSqrtR = 1 / Math.sqrt(r);
        sumRe += invSqrtR * Math.cos(phase);
        sumIm += invSqrtR * Math.sin(phase);
      }

      const idx = y * GRID_W + x;
      re[idx] = sumRe;
      im[idx] = sumIm;
      const a = Math.sqrt(sumRe * sumRe + sumIm * sumIm);
      amp[idx] = a;
      const p = a * a;
      prob[idx] = p;
      if (p > maxProb) maxProb = p;
    }
  }

  // Normalise prob to [0, 1]
  if (maxProb > 0) {
    for (let i = 0; i < total; i++) {
      prob[i] /= maxProb;
    }
  }

  return { re, im, amp, prob };
}

/** Returns normalised amplitude at the detector screen (last row). */
export function getDetectorProfile(wave: WaveField): Float32Array {
  const profile = new Float32Array(GRID_W);
  const y = GRID_H - 1;
  let maxVal = 0;

  for (let x = 0; x < GRID_W; x++) {
    const v = wave.prob[y * GRID_W + x];
    profile[x] = v;
    if (v > maxVal) maxVal = v;
  }

  if (maxVal > 0) {
    for (let x = 0; x < GRID_W; x++) profile[x] /= maxVal;
  }

  return profile;
}
