/**
 * Renders the quantum potential Q field as a plasma-colourmap overlay.
 */

import { GRID_W, GRID_H, BARRIER_Y } from '../physics/constants';
import type { QField } from '../physics/quantum-potential';
import { colormapPlasma } from './colormap';

export function renderQuantumPotential(
  imageData: ImageData,
  qField: QField,
  alpha: number = 180
): void {
  const data = imageData.data;
  const { display } = qField;

  for (let y = BARRIER_Y + 1; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const idx = y * GRID_W + x;
      const pxIdx = idx * 4;

      // display is in [-1, 1]; map to [0, 1] for colourmap
      // Negate: Q is negative in bright fringes (valleys), we want bright = low Q
      const t = (-display[idx] * 0.5 + 0.5);
      const [r, g, b] = colormapPlasma(Math.max(0, Math.min(1, t)));

      data[pxIdx] = r;
      data[pxIdx + 1] = g;
      data[pxIdx + 2] = b;
      data[pxIdx + 3] = alpha;
    }
  }
}
