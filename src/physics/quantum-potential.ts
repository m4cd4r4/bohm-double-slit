/**
 * Quantum potential Q from the wave function.
 *
 * Q = -(hbar^2 / 2m) * laplacian(R) / R
 *
 * where R = |psi| = amp field.
 *
 * Computed via finite differences on the amplitude grid.
 * Returns a Float32Array normalised for display.
 */

import { GRID_W, GRID_H, HBAR, MASS, BARRIER_Y, R_EPSILON } from './constants';
import type { WaveField } from './wave';

export interface QField {
  raw: Float32Array;       // actual Q values (can be large)
  display: Float32Array;   // normalised to [-1, 1] for rendering
}

export function computeQuantumPotential(wave: WaveField): QField {
  const { amp } = wave;
  const total = GRID_W * GRID_H;
  const raw = new Float32Array(total);
  const display = new Float32Array(total);

  const coeff = -(HBAR * HBAR) / (2 * MASS);

  for (let y = BARRIER_Y + 2; y < GRID_H - 1; y++) {
    for (let x = 1; x < GRID_W - 1; x++) {
      const idx = y * GRID_W + x;
      const R = amp[idx];

      if (R < R_EPSILON) {
        raw[idx] = 0; // dark fringe — Q is effectively +inf but we clamp
        continue;
      }

      // 5-point Laplacian of R
      const Rn = amp[(y - 1) * GRID_W + x];
      const Rs = amp[(y + 1) * GRID_W + x];
      const Rw = amp[y * GRID_W + (x - 1)];
      const Re = amp[y * GRID_W + (x + 1)];

      const laplacianR = Rn + Rs + Rw + Re - 4 * R;
      raw[idx] = coeff * laplacianR / R;
    }
  }

  // Normalise for display: map to [-1, 1]
  let minQ = 0, maxQ = 0;
  for (let i = 0; i < total; i++) {
    if (raw[i] < minQ) minQ = raw[i];
    if (raw[i] > maxQ) maxQ = raw[i];
  }

  const absMax = Math.max(Math.abs(minQ), Math.abs(maxQ), 1e-10);
  for (let i = 0; i < total; i++) {
    display[i] = raw[i] / absMax;
  }

  return { raw, display };
}
