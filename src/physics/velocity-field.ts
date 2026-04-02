/**
 * Bohmian guidance equation velocity field.
 *
 * v = (hbar / m) * Im(grad(psi) / psi)
 *
 * This formulation avoids phase unwrapping: we compute grad of the complex
 * field directly, then take Im(grad_psi / psi).
 *
 * For psi = re + i*im:
 *   Im(grad_psi / psi) = Im((dpsi/dx + i*dpsi/dy) / psi)
 *
 * Expanded:
 *   vx = (hbar/m) * (im * d(re)/dx - re * d(im)/dx) / |psi|^2
 *   vy = (hbar/m) * (im * d(re)/dy - re * d(im)/dy) / |psi|^2
 */

import { GRID_W, GRID_H, HBAR, MASS, BARRIER_Y, R_EPSILON, K } from './constants';
import type { WaveField } from './wave';

export interface VelocityField {
  vx: Float32Array;
  vy: Float32Array;
}

export function computeVelocityField(wave: WaveField): VelocityField {
  const { re, im, amp } = wave;
  const total = GRID_W * GRID_H;
  const vx = new Float32Array(total);
  const vy = new Float32Array(total);

  const coeff = HBAR / MASS;

  for (let y = BARRIER_Y + 1; y < GRID_H - 1; y++) {
    for (let x = 1; x < GRID_W - 1; x++) {
      const idx = y * GRID_W + x;
      const prob = amp[idx] * amp[idx];

      if (prob < R_EPSILON * R_EPSILON) {
        vx[idx] = 0;
        vy[idx] = 0;
        continue;
      }

      const reC = re[idx];
      const imC = im[idx];

      // Central differences
      const dre_dx = (re[y * GRID_W + (x + 1)] - re[y * GRID_W + (x - 1)]) / 2;
      const dim_dx = (im[y * GRID_W + (x + 1)] - im[y * GRID_W + (x - 1)]) / 2;
      const dre_dy = (re[(y + 1) * GRID_W + x] - re[(y - 1) * GRID_W + x]) / 2;
      const dim_dy = (im[(y + 1) * GRID_W + x] - im[(y - 1) * GRID_W + x]) / 2;

      vx[idx] = coeff * (imC * dre_dx - reC * dim_dx) / prob;
      // vy: quantum correction + base forward momentum ħk/m for downward-propagating wave
      vy[idx] = coeff * (imC * dre_dy - reC * dim_dy) / prob + (HBAR * K) / MASS;
    }
  }

  return { vx, vy };
}

/** Bilinear interpolation of the velocity field at a continuous (x, y) position. */
export function sampleVelocity(
  vf: VelocityField,
  x: number,
  y: number
): [number, number] {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;

  if (xi < 1 || xi >= GRID_W - 2 || yi < BARRIER_Y + 1 || yi >= GRID_H - 2) {
    return [0, 0];
  }

  const i00 = yi * GRID_W + xi;
  const i10 = yi * GRID_W + (xi + 1);
  const i01 = (yi + 1) * GRID_W + xi;
  const i11 = (yi + 1) * GRID_W + (xi + 1);

  const wx = (arr: Float32Array) =>
    arr[i00] * (1 - fx) * (1 - fy) +
    arr[i10] * fx * (1 - fy) +
    arr[i01] * (1 - fx) * fy +
    arr[i11] * fx * fy;

  return [wx(vf.vx), wx(vf.vy)];
}
