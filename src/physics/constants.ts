// Dimensionless units: hbar = 1, m = 1
// All lengths in units of grid cells

export const HBAR = 1;
export const MASS = 1;

// Grid dimensions
export const GRID_W = 400;
export const GRID_H = 600;

// Wavelength in grid cells — determines fringe spacing
export const LAMBDA = 25;
export const K = (2 * Math.PI) / LAMBDA;

// Barrier position (y index)
export const BARRIER_Y = 150;

// Default slit parameters (in grid cells)
export const DEFAULT_SLIT_WIDTH = 12;
export const DEFAULT_SLIT_SEP = 60; // centre-to-centre separation

// Number of point sources per slit for Huygens-Fresnel summation
export const SOURCES_PER_SLIT = 120;

// Regularisation: min R before we clamp Q
export const R_EPSILON = 1e-5;
