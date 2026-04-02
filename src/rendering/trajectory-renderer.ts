/**
 * Renders Bohmian particle trajectories as smooth curves.
 * Active particles have a bright glowing head; completed ones fade.
 */

import { GRID_W, GRID_H } from '../physics/constants';
import type { Particle } from '../physics/trajectory';

export function renderTrajectories(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  canvasW: number,
  canvasH: number
): void {
  const sx = canvasW / GRID_W;
  const sy = canvasH / GRID_H;

  for (const p of particles) {
    if (p.trail.length < 2) continue;

    ctx.save();
    ctx.globalAlpha = p.active ? 0.85 : 0.45;
    ctx.strokeStyle = p.active ? '#39ff14' : '#22aa00';
    ctx.lineWidth = p.active ? 1.5 : 1;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(p.trail[0][0] * sx, p.trail[0][1] * sy);
    for (let i = 1; i < p.trail.length; i++) {
      ctx.lineTo(p.trail[i][0] * sx, p.trail[i][1] * sy);
    }
    ctx.stroke();

    // Glowing head for active particles
    if (p.active) {
      const [hx, hy] = p.trail[p.trail.length - 1];
      const cx = hx * sx;
      const cy = hy * sy;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 6);
      grad.addColorStop(0, 'rgba(100, 255, 80, 1)');
      grad.addColorStop(0.5, 'rgba(57, 255, 20, 0.5)');
      grad.addColorStop(1, 'rgba(57, 255, 20, 0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

/**
 * Render the detector histogram as a horizontal bar chart at the bottom of the canvas.
 * histogram[x] = count of detections at x position (length = GRID_W).
 * Rendered at the bottom strip of height `stripH`.
 */
export function renderHistogram(
  ctx: CanvasRenderingContext2D,
  histogram: Float32Array,
  canvasW: number,
  canvasH: number,
  stripH: number
): void {
  const maxVal = Math.max(...Array.from(histogram), 1);
  const bins = histogram.length;
  const binW = canvasW / bins;
  const stripY = canvasH - stripH;

  ctx.save();

  // Background strip
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, stripY, canvasW, stripH);

  // Top border line
  ctx.strokeStyle = 'rgba(74, 158, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, stripY);
  ctx.lineTo(canvasW, stripY);
  ctx.stroke();

  // Bars growing upward from bottom
  for (let i = 0; i < bins; i++) {
    const norm = histogram[i] / maxVal;
    if (norm < 0.005) continue;
    const barH = norm * (stripH - 4);
    const bx = i * binW;

    const hue = 200 - norm * 150;
    ctx.fillStyle = `hsl(${hue}, 100%, ${35 + norm * 45}%)`;
    ctx.fillRect(bx, stripY + stripH - barH, binW - 0.5, barH);
  }

  // Label
  ctx.fillStyle = 'rgba(150, 200, 255, 0.75)';
  ctx.font = '12px ui-monospace,monospace';
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 3;
  ctx.fillText('DETECTOR SCREEN', 8, stripY + 14);

  ctx.restore();
}
