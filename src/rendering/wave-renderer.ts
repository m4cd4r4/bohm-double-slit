/**
 * Renders the wave function fields onto a canvas ImageData.
 * Supports three display modes: probability |psi|^2, real part Re(psi), or amplitude.
 */

import { GRID_W, GRID_H, BARRIER_Y } from '../physics/constants';
import type { WaveField } from '../physics/wave';
import { colormapWave, colormapDiverging } from './colormap';

export type WaveDisplayMode = 'prob' | 'real' | 'amp';

export function renderWaveField(
  imageData: ImageData,
  wave: WaveField,
  mode: WaveDisplayMode,
  alpha: number = 255
): void {
  const data = imageData.data;

  // Normalise real part to [0, 1]
  let minRe = 0, maxRe = 0;
  if (mode === 'real') {
    for (let i = 0; i < GRID_W * GRID_H; i++) {
      if (wave.re[i] < minRe) minRe = wave.re[i];
      if (wave.re[i] > maxRe) maxRe = wave.re[i];
    }
  }

  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const idx = y * GRID_W + x;
      const pxIdx = idx * 4;

      if (y <= BARRIER_Y) {
        // Incoming wave region — dark background
        data[pxIdx] = 8;
        data[pxIdx + 1] = 10;
        data[pxIdx + 2] = 18;
        data[pxIdx + 3] = 255;
        continue;
      }

      let r = 0, g = 0, b = 0;

      if (mode === 'prob') {
        const t = Math.pow(wave.prob[idx], 0.5); // gamma correction
        [r, g, b] = colormapWave(t);
      } else if (mode === 'real') {
        const absMax = Math.max(Math.abs(minRe), Math.abs(maxRe), 1e-10);
        const t = (wave.re[idx] / absMax) * 0.5 + 0.5; // map [-1,1] to [0,1]
        [r, g, b] = colormapDiverging(t);
      } else {
        // amp — same as prob but linear
        const t = wave.amp[idx] / (Math.sqrt(wave.prob[0] > 0 ? 1 : 1)); // already in amp
        [r, g, b] = colormapWave(Math.min(t * 0.1, 1));
      }

      data[pxIdx] = r;
      data[pxIdx + 1] = g;
      data[pxIdx + 2] = b;
      data[pxIdx + 3] = alpha;
    }
  }
}

/** Draw the barrier (dark rectangle with two slit gaps). */
export function renderBarrier(
  ctx: CanvasRenderingContext2D,
  slitWidth: number,
  slitSep: number,
  canvasW: number,
  canvasH: number
): void {
  const scaleX = canvasW / GRID_W;
  const scaleY = canvasH / GRID_H;

  const barrierY = BARRIER_Y * scaleY;
  const barrierThickness = 8;
  const cx = canvasW / 2;

  const slit1Centre = cx - (slitSep / 2) * scaleX;
  const slit2Centre = cx + (slitSep / 2) * scaleX;
  const halfW = (slitWidth / 2) * scaleX;

  ctx.fillStyle = '#1a1a2e';
  // Left wall
  ctx.fillRect(0, barrierY, slit1Centre - halfW, barrierThickness);
  // Gap between slits
  ctx.fillRect(slit1Centre + halfW, barrierY, slit2Centre - slit1Centre - slitWidth * scaleX, barrierThickness);
  // Right wall
  ctx.fillRect(slit2Centre + halfW, barrierY, canvasW - (slit2Centre + halfW), barrierThickness);

  // Barrier outline
  ctx.strokeStyle = '#4a9eff';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, barrierY, canvasW, barrierThickness);
}

/** Render a faint incoming wave (horizontal lines) above the barrier. */
export function renderIncomingWave(
  ctx: CanvasRenderingContext2D,
  frameCount: number,
  canvasW: number,
  canvasH: number
): void {
  const barrierY = (BARRIER_Y / GRID_H) * canvasH;
  const lambda = (25 / GRID_H) * canvasH; // visual wavelength in pixels
  const speed = 0.4;
  const offset = (frameCount * speed) % lambda;

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#4a9eff';
  ctx.lineWidth = 1;

  for (let y = offset; y < barrierY; y += lambda) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasW, y);
    ctx.stroke();
  }
  ctx.restore();
}
