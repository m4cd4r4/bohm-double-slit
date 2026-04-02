/**
 * Bohmian particle trajectory integrator.
 *
 * Each particle has a definite position at all times.
 * Its velocity is given by the guidance equation: v = (hbar/m) * Im(grad(psi)/psi)
 *
 * Integration: 4th-order Runge-Kutta with dt chosen to keep step < 1 grid cell.
 */

import { GRID_W, GRID_H, BARRIER_Y } from './constants';
import type { WaveField } from './wave';
import { sampleVelocity, type VelocityField } from './velocity-field';

export interface Particle {
  x: number;
  y: number;
  trail: Array<[number, number]>;
  active: boolean;
  detectedAt: number | null; // x position at detector
}

const DT = 4.0; // time step: base vy ≈ K = 0.25, so DT=4 → ~1 cell/frame = visible motion
const MAX_TRAIL = 800;

export function createParticle(x: number): Particle {
  // Spawn slightly inside the velocity-field computed region (starts at BARRIER_Y+2)
  const startY = BARRIER_Y + 3;
  return {
    x,
    y: startY,
    trail: [[x, startY]],
    active: true,
    detectedAt: null,
  };
}

/**
 * Spawn particles with initial x positions sampled from |psi|^2 at BARRIER_Y+2.
 * Returns N particles whose starting x positions follow the Born distribution.
 */
export function spawnParticles(count: number, wave: WaveField): Particle[] {
  const y = BARRIER_Y + 2;
  const row = new Float32Array(GRID_W);
  let sum = 0;

  for (let x = 0; x < GRID_W; x++) {
    const v = wave.prob[y * GRID_W + x];
    row[x] = v;
    sum += v;
  }

  // Build CDF
  const cdf = new Float32Array(GRID_W);
  let acc = 0;
  for (let x = 0; x < GRID_W; x++) {
    acc += row[x] / sum;
    cdf[x] = acc;
  }

  const particles: Particle[] = [];
  for (let n = 0; n < count; n++) {
    const r = Math.random();
    let x = 0;
    for (let i = 0; i < GRID_W; i++) {
      if (cdf[i] >= r) { x = i + Math.random(); break; }
    }
    particles.push(createParticle(x));
  }

  return particles;
}

function rk4Step(
  x: number,
  y: number,
  vf: VelocityField,
  dt: number
): [number, number] {
  const [k1x, k1y] = sampleVelocity(vf, x, y);
  const [k2x, k2y] = sampleVelocity(vf, x + dt * k1x / 2, y + dt * k1y / 2);
  const [k3x, k3y] = sampleVelocity(vf, x + dt * k2x / 2, y + dt * k2y / 2);
  const [k4x, k4y] = sampleVelocity(vf, x + dt * k3x, y + dt * k3y);

  return [
    x + (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x),
    y + (dt / 6) * (k1y + 2 * k2y + 2 * k3y + k4y),
  ];
}

export function stepParticle(particle: Particle, vf: VelocityField): void {
  if (!particle.active) return;

  const [nx, ny] = rk4Step(particle.x, particle.y, vf, DT);

  // Out of bounds
  if (nx < 0 || nx >= GRID_W || ny >= GRID_H) {
    particle.active = false;
    if (ny >= GRID_H - 1) particle.detectedAt = particle.x;
    return;
  }

  particle.x = nx;
  particle.y = ny;

  if (particle.trail.length >= MAX_TRAIL) particle.trail.shift();
  particle.trail.push([nx, ny]);

  // Reached detector
  if (ny >= GRID_H - 2) {
    particle.detectedAt = nx;
    particle.active = false;
  }
}
