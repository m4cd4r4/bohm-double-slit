import GUI from 'lil-gui';
import { computeWaveField, type WaveField } from './physics/wave';
import { computeQuantumPotential, type QField } from './physics/quantum-potential';
import { computeVelocityField, type VelocityField } from './physics/velocity-field';
import { spawnParticles, stepParticle, type Particle } from './physics/trajectory';
import { GRID_W, GRID_H, DEFAULT_SLIT_WIDTH, DEFAULT_SLIT_SEP, BARRIER_Y } from './physics/constants';
import { renderWaveField, renderBarrier, renderIncomingWave, type WaveDisplayMode } from './rendering/wave-renderer';
import { renderQuantumPotential } from './rendering/potential-renderer';
import { renderTrajectories, renderHistogram } from './rendering/trajectory-renderer';
import { renderAnnotations, renderEquations, renderSymmetryAxis } from './ui/annotations';

// ─── Canvas setup ─────────────────────────────────────────────────────────────

const CANVAS_W = 680;   // CSS display size
const CANVAS_H = 820;
const HISTOGRAM_H = 70; // horizontal detector strip at bottom

// Retina/HiDPI: render at 2x and scale down with CSS for sharp text
const DPR = Math.min(window.devicePixelRatio || 1, 2);

const container = document.getElementById('app')!;
container.style.cssText = 'display:flex;background:#07080f;min-height:100vh;align-items:flex-start;justify-content:center;padding:24px 20px;box-sizing:border-box;gap:0;';

const wrapper = document.createElement('div');
wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;';

const titleEl = document.createElement('div');
titleEl.style.cssText = 'color:rgba(160,210,255,0.92);font:600 14px/1.4 ui-monospace,monospace;text-align:center;letter-spacing:0.12em;text-transform:uppercase;opacity:0.85;';
titleEl.textContent = 'Bohmian Mechanics — Double-Slit Experiment';

const subtitleEl = document.createElement('div');
subtitleEl.style.cssText = 'color:rgba(120,170,220,0.55);font:11px ui-monospace,monospace;text-align:center;letter-spacing:0.06em;margin-top:-6px;';
subtitleEl.textContent = 'Pilot wave guides particles · Quantum potential organises trajectories';

const canvas = document.createElement('canvas');
// Physical pixels = CSS size × DPR for crisp rendering on HiDPI displays
canvas.width = Math.round(CANVAS_W * DPR);
canvas.height = Math.round(CANVAS_H * DPR);
canvas.style.cssText = `width:${CANVAS_W}px;height:${CANVAS_H}px;cursor:crosshair;border:1px solid rgba(74,158,255,0.18);border-radius:6px;display:block;`;

const statusEl = document.createElement('div');
statusEl.style.cssText = 'color:rgba(120,180,255,0.5);font:10px ui-monospace,monospace;text-align:center;height:14px;';

// View toggle bar
const viewBar = document.createElement('div');
viewBar.style.cssText = 'display:flex;gap:6px;align-items:center;';

function makeViewBtn(label: string, active: boolean): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.cssText = `font:10px ui-monospace,monospace;padding:4px 10px;border-radius:4px;cursor:pointer;transition:all 0.15s;border:1px solid rgba(74,158,255,${active ? '0.6' : '0.2'});background:rgba(${active ? '30,60,120' : '10,15,30'},0.7);color:rgba(160,210,255,${active ? '0.95' : '0.5'});`;
  return btn;
}

const btn2D = makeViewBtn('2D Top-down', true);
const btn3D = makeViewBtn('3D Perspective', false);
const dragHint = document.createElement('span');
dragHint.style.cssText = 'font:9px ui-monospace,monospace;color:rgba(120,170,220,0.4);display:none;';
dragHint.textContent = '← drag to rotate →';

// Info button
const btnInfo = document.createElement('button');
btnInfo.textContent = '?';
btnInfo.title = 'About Bohmian mechanics & references';
btnInfo.style.cssText = 'font:bold 11px ui-monospace,monospace;padding:4px 9px;border-radius:4px;cursor:pointer;transition:all 0.15s;border:1px solid rgba(74,158,255,0.2);background:rgba(10,15,30,0.7);color:rgba(160,210,255,0.5);margin-left:4px;';
btnInfo.addEventListener('mouseenter', () => { btnInfo.style.borderColor = 'rgba(74,158,255,0.5)'; btnInfo.style.color = 'rgba(160,210,255,0.9)'; });
btnInfo.addEventListener('mouseleave', () => { btnInfo.style.borderColor = 'rgba(74,158,255,0.2)'; btnInfo.style.color = 'rgba(160,210,255,0.5)'; });

viewBar.appendChild(btn2D);
viewBar.appendChild(btn3D);
viewBar.appendChild(dragHint);
viewBar.appendChild(btnInfo);

// ─── Info modal ────────────────────────────────────────────────────────────

const modal = document.createElement('div');
modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:20px;';

const modalBox = document.createElement('div');
modalBox.style.cssText = 'background:rgba(8,10,24,0.97);border:1px solid rgba(74,158,255,0.25);border-radius:8px;max-width:560px;width:100%;padding:28px 32px;font:13px/1.7 ui-monospace,monospace;color:rgba(160,210,255,0.85);box-shadow:0 20px 60px rgba(0,0,0,0.7);position:relative;max-height:88vh;overflow-y:auto;';

const closeBtn = document.createElement('button');
closeBtn.textContent = '×';
closeBtn.style.cssText = 'position:absolute;top:14px;right:18px;background:none;border:none;font:20px monospace;color:rgba(150,200,255,0.5);cursor:pointer;line-height:1;padding:0;';
closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

modalBox.innerHTML = `
<h2 style="font:600 15px ui-monospace,monospace;color:rgba(160,210,255,0.95);margin:0 0 16px;letter-spacing:0.08em;">About This Simulation</h2>

<p style="margin:0 0 14px;">In standard quantum mechanics (Copenhagen), a particle has no definite position between measurements — the wave function <em>is</em> all there is. David Bohm showed in 1952 that this is not the only consistent interpretation.</p>

<p style="margin:0 0 14px;">In Bohmian mechanics, each particle has a <strong>definite position at all times</strong>, guided by a real physical wave ψ through the <strong>quantum potential</strong>:</p>

<div style="background:rgba(74,158,255,0.07);border:1px solid rgba(74,158,255,0.15);border-radius:4px;padding:10px 14px;margin:0 0 14px;font:12px ui-monospace,monospace;line-height:2;">
  v = (ħ/m) Im(∇ψ / ψ) &nbsp;&nbsp;<span style="opacity:0.5">← guidance equation</span><br>
  Q = −(ħ²/2m) ∇²R / R &nbsp;<span style="opacity:0.5">← quantum potential, R = |ψ|</span>
</div>

<p style="margin:0 0 14px;">The interference pattern is not mysterious — it emerges from the topology of Q. Trajectories bunch into the valleys of Q (bright fringes) and are repelled from its ridges (dark fringes). No randomness, no collapse, no measurement problem. All quantum predictions are reproduced exactly.</p>

<p style="margin:0 0 6px;color:rgba(120,170,220,0.7);font-size:11px;letter-spacing:0.06em;text-transform:uppercase;">Key papers</p>
<ul style="margin:0 0 16px;padding-left:18px;line-height:2;">
  <li>Bohm (1952) — <em>A Suggested Interpretation of the Quantum Theory in Terms of "Hidden" Variables</em><br>
    <a href="https://journals.aps.org/pr/abstract/10.1103/PhysRev.85.166" target="_blank" rel="noopener" style="color:rgba(100,180,255,0.8);">Phys. Rev. 85, 166 (Part I)</a> &nbsp;·&nbsp;
    <a href="https://journals.aps.org/pr/abstract/10.1103/PhysRev.85.180" target="_blank" rel="noopener" style="color:rgba(100,180,255,0.8);">Phys. Rev. 85, 180 (Part II)</a>
  </li>
  <li>Philippidis, Dewdney &amp; Hiley (1979) — <em>Quantum interference and the quantum potential</em> — the paper that first drew Bohmian trajectories for the double-slit<br>
    <a href="https://link.springer.com/article/10.1007/BF02721975" target="_blank" rel="noopener" style="color:rgba(100,180,255,0.8);">Il Nuovo Cimento B 52, 15–28</a>
  </li>
</ul>

<p style="margin:0 0 6px;color:rgba(120,170,220,0.7);font-size:11px;letter-spacing:0.06em;text-transform:uppercase;">Further reading</p>
<ul style="margin:0;padding-left:18px;line-height:2;">
  <li><a href="https://plato.stanford.edu/entries/qm-bohm/" target="_blank" rel="noopener" style="color:rgba(100,180,255,0.8);">Stanford Encyclopedia of Philosophy — Bohmian Mechanics</a> — comprehensive, peer-reviewed, free</li>
  <li>Holland (1993) — <em>The Quantum Theory of Motion</em> — the definitive textbook treatment</li>
</ul>
`;

modalBox.prepend(closeBtn);
modal.appendChild(modalBox);
document.body.appendChild(modal);

btnInfo.addEventListener('click', () => {
  modal.style.display = 'flex';
});

// Canvas wrapper for 3D perspective transform
const canvasWrapper = document.createElement('div');
canvasWrapper.style.cssText = `width:${CANVAS_W}px;height:${CANVAS_H}px;perspective:1200px;display:flex;align-items:center;justify-content:center;`;

wrapper.appendChild(titleEl);
wrapper.appendChild(subtitleEl);
wrapper.appendChild(viewBar);
canvasWrapper.appendChild(canvas);
wrapper.appendChild(canvasWrapper);
wrapper.appendChild(statusEl);
container.appendChild(wrapper);

// ─── 3D perspective drag state ─────────────────────────────────────────────

let is3D = false;
let rotX = -28; // tilt around x axis (degrees)
let rotY = 8;   // tilt around y axis
let dragStart: { x: number; y: number; rx: number; ry: number } | null = null;

function applyTransform(): void {
  if (is3D) {
    canvas.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    canvas.style.cursor = 'grab';
    canvas.style.transformOrigin = '50% 50%';
    canvas.style.transition = 'none';
  } else {
    canvas.style.transform = 'rotateX(0deg) rotateY(0deg)';
    canvas.style.cursor = 'crosshair';
    canvas.style.transition = 'transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94)';
  }
}

canvas.addEventListener('mousedown', (e) => {
  if (!is3D) return;
  dragStart = { x: e.clientX, y: e.clientY, rx: rotX, ry: rotY };
  canvas.style.cursor = 'grabbing';
});

window.addEventListener('mousemove', (e) => {
  if (!dragStart) return;
  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;
  rotY = dragStart.ry + dx * 0.35;
  rotX = Math.max(-70, Math.min(5, dragStart.rx + dy * 0.35));
  applyTransform();
});

window.addEventListener('mouseup', () => {
  if (dragStart) canvas.style.cursor = is3D ? 'grab' : 'crosshair';
  dragStart = null;
});

btn2D.addEventListener('click', () => {
  is3D = false;
  btn2D.style.borderColor = 'rgba(74,158,255,0.6)';
  btn2D.style.background = 'rgba(30,60,120,0.7)';
  btn2D.style.color = 'rgba(160,210,255,0.95)';
  btn3D.style.borderColor = 'rgba(74,158,255,0.2)';
  btn3D.style.background = 'rgba(10,15,30,0.7)';
  btn3D.style.color = 'rgba(160,210,255,0.5)';
  dragHint.style.display = 'none';
  applyTransform();
});

btn3D.addEventListener('click', () => {
  is3D = true;
  rotX = -28; rotY = 8;
  btn3D.style.borderColor = 'rgba(74,158,255,0.6)';
  btn3D.style.background = 'rgba(30,60,120,0.7)';
  btn3D.style.color = 'rgba(160,210,255,0.95)';
  btn2D.style.borderColor = 'rgba(74,158,255,0.2)';
  btn2D.style.background = 'rgba(10,15,30,0.7)';
  btn2D.style.color = 'rgba(160,210,255,0.5)';
  dragHint.style.display = 'inline';
  applyTransform();
});

const ctx = canvas.getContext('2d')!;
// Scale all draw calls so coordinates are in CSS pixels regardless of DPR
ctx.scale(DPR, DPR);

// Off-screen canvas for field compositing (always at grid resolution)
const fieldCanvas = document.createElement('canvas');
fieldCanvas.width = GRID_W;
fieldCanvas.height = GRID_H;
const fieldCtx = fieldCanvas.getContext('2d')!;

// ─── State ────────────────────────────────────────────────────────────────────

const params = {
  slitWidth: DEFAULT_SLIT_WIDTH,
  slitSep: DEFAULT_SLIT_SEP,
  mode: 'bohm' as 'bohm' | 'copenhagen',
  waveDisplay: 'prob' as WaveDisplayMode,
  showWave: true,
  showPotential: false,
  showTrajectories: true,
  showAnnotations: true,
  showSymmetryAxis: true,
  burstSize: 20,
  running: true,
};

let wave: WaveField;
let qField: QField;
let vField: VelocityField;
let particles: Particle[] = [];
const histogram = new Float32Array(GRID_W);
let frameCount = 0;
let spawnTimer = 0;
const SPAWN_INTERVAL = 8;

// ─── Physics recompute ───────────────────────────────────────────────────────

function recompute(): void {
  statusEl.textContent = 'Computing wave field...';
  setTimeout(() => {
    wave = computeWaveField({ slitWidth: params.slitWidth, slitSep: params.slitSep });
    qField = computeQuantumPotential(wave);
    vField = computeVelocityField(wave);
    particles = [];
    histogram.fill(0);
    statusEl.textContent = 'Ready';
  }, 10);
}

// ─── GUI ──────────────────────────────────────────────────────────────────────

const gui = new GUI({ title: 'Controls', width: 260 });

// Helper: add tooltip "ⓘ" after a controller label using the title attribute
function tip(ctrl: ReturnType<typeof gui.add>, tooltip: string): ReturnType<typeof gui.add> {
  const el = ctrl.domElement.closest('.controller') as HTMLElement | null;
  if (el) {
    el.title = tooltip;
    const nameEl = el.querySelector('.name') as HTMLElement | null;
    if (nameEl) {
      const icon = document.createElement('span');
      icon.textContent = ' ⓘ';
      icon.style.cssText = 'opacity:0.45;font-size:10px;cursor:help;';
      nameEl.appendChild(icon);
    }
  }
  return ctrl;
}

const physicsFolder = gui.addFolder('⚛  Physics');
tip(
  physicsFolder.add(params, 'slitWidth', 6, 30, 1).name('Slit width').onFinishChange(recompute),
  'Width of each slit opening. Narrower slits create wider diffraction, producing fewer but more spread-out fringes.'
);
tip(
  physicsFolder.add(params, 'slitSep', 30, 140, 1).name('Slit separation').onFinishChange(recompute),
  'Centre-to-centre distance between the two slits. Larger separation = more fringes packed closer together.'
);

const displayFolder = gui.addFolder('◈  Display');
tip(
  displayFolder.add(params, 'mode', ['bohm', 'copenhagen']).name('Interpretation').onChange(() => {
    histogram.fill(0);
    particles = [];
    if (params.mode === 'copenhagen') {
      params.showPotential = false;
      params.showTrajectories = false;
    }
    gui.controllersRecursive().forEach(c => c.updateDisplay());
  }),
  'BOHM: particles have definite trajectories guided by the pilot wave.\nCOPENHAGEN: no trajectory exists — the particle teleports from source to detector, appearing where |ψ|² says.'
);
tip(
  displayFolder.add(params, 'waveDisplay', ['prob', 'real']).name('Wave display'),
  'PROB: shows |ψ|² — the probability density, bright = likely detection.\nREAL: shows Re(ψ), the oscillating wave crests and troughs (blue=negative, red=positive).'
);
tip(
  displayFolder.add(params, 'showWave').name('Wave field'),
  'The pilot wave ψ(x,y) — a real physical field in Bohmian mechanics. It passes through BOTH slits and creates the interference pattern that guides particles.'
);
tip(
  displayFolder.add(params, 'showPotential').name('Q potential'),
  'The quantum potential Q = −(ℏ²/2m)∇²R/R. This is what makes Bohmian mechanics non-local. Q depends on the global wave field — its valleys guide particles into bright fringes, ridges keep them out of dark fringes.'
);
tip(
  displayFolder.add(params, 'showTrajectories').name('Trajectories'),
  'Definite particle paths in Bohmian mechanics. Each particle has a real position at all times. The trajectories never cross each other, and always respect the symmetry axis.'
);
tip(
  displayFolder.add(params, 'showAnnotations').name('Annotations'),
  'Educational labels explaining key features of the Bohmian picture.'
);
tip(
  displayFolder.add(params, 'showSymmetryAxis').name('Symmetry axis'),
  'The central axis of symmetry. In Bohmian mechanics, no trajectory ever crosses this line — particles starting left stay left, right stay right. This is a provable consequence of the guidance equation.'
);

const particleFolder = gui.addFolder('◉  Particles');
tip(
  particleFolder.add(params, 'burstSize', 1, 200, 1).name('Burst count'),
  'Number of particles to fire simultaneously. Each starts at a random position weighted by |ψ|² (Born rule), so the ensemble builds up the interference pattern over time.'
);
particleFolder.add({ fire: () => fireParticles(params.burstSize) }, 'fire').name('▶ Fire burst');
particleFolder.add({ fireSingle: () => fireParticles(1) }, 'fireSingle').name('▶ Fire single');
particleFolder.add({ clear: () => { particles = []; histogram.fill(0); } }, 'clear').name('✕ Clear');
tip(
  particleFolder.add(params, 'running').name('Auto-spawn'),
  'Continuously fires particles one at a time. Watch the detector histogram slowly build up the interference fringe pattern — identical to the quantum mechanical prediction.'
);

gui.open();

// ─── Particle spawning ────────────────────────────────────────────────────────

function fireParticles(count: number): void {
  if (!wave) return;
  const newParticles = spawnParticles(count, wave);
  particles.push(...newParticles);
  if (particles.length > 800) {
    particles = particles.slice(particles.length - 800);
  }
}

// ─── Render pipeline ──────────────────────────────────────────────────────────

// Simulation region: top portion of canvas, detector strip at bottom
const SIM_H = CANVAS_H - HISTOGRAM_H;

function renderFrame(): void {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#07080f';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (!wave) {
    ctx.fillStyle = 'rgba(150,200,255,0.6)';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Initialising...', CANVAS_W / 2, CANVAS_H / 2);
    return;
  }

  const scaleX = CANVAS_W / GRID_W;
  const scaleY = SIM_H / GRID_H;

  // ── Wave field (drawn into sim region only) ──
  if (params.showWave) {
    const imgData = fieldCtx.createImageData(GRID_W, GRID_H);
    if (params.mode === 'bohm') {
      renderWaveField(imgData, wave, params.waveDisplay);
    } else {
      renderWaveField(imgData, wave, 'prob', 185);
    }
    fieldCtx.putImageData(imgData, 0, 0);

    if (params.mode === 'copenhagen') {
      ctx.save();
      ctx.filter = 'sepia(50%) hue-rotate(15deg) saturate(1.2)';
      ctx.drawImage(fieldCanvas, 0, 0, CANVAS_W, SIM_H);
      ctx.restore();
    } else {
      ctx.drawImage(fieldCanvas, 0, 0, CANVAS_W, SIM_H);
    }
  }

  // ── Quantum potential overlay ──
  if (params.showPotential && params.mode === 'bohm' && qField) {
    const qImgData = fieldCtx.createImageData(GRID_W, GRID_H);
    renderQuantumPotential(qImgData, qField, 160);
    fieldCtx.putImageData(qImgData, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.55;
    ctx.drawImage(fieldCanvas, 0, 0, CANVAS_W, SIM_H);
    ctx.restore();
  }

  // ── Incoming wave animation ──
  renderIncomingWave(ctx, frameCount, CANVAS_W, SIM_H);

  // ── Region labels (left margin) ──
  renderRegionLabels(ctx, scaleY);

  // ── Barrier ──
  renderBarrier(ctx, params.slitWidth, params.slitSep, CANVAS_W, SIM_H);

  // ── Symmetry axis ──
  if (params.showSymmetryAxis) {
    renderSymmetryAxis(ctx, CANVAS_W, SIM_H);
  }

  // ── Bohmian trajectories ──
  if (params.showTrajectories && params.mode === 'bohm') {
    renderTrajectories(ctx, particles, CANVAS_W, SIM_H);
  }

  // ── Copenhagen collapse dots (at detector line) ──
  if (params.mode === 'copenhagen') {
    const detectorY = SIM_H - 6;
    ctx.save();
    for (const p of particles) {
      if (p.detectedAt !== null) {
        const px = p.detectedAt * scaleX;
        ctx.fillStyle = 'rgba(255, 210, 80, 0.9)';
        ctx.beginPath();
        ctx.arc(px, detectorY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ── Detector histogram (horizontal strip at bottom) ──
  renderHistogram(ctx, histogram, CANVAS_W, CANVAS_H, HISTOGRAM_H);

  // ── Equations overlay (top-left, compact) ──
  renderEquations(ctx, params.mode);

  // ── Annotations ──
  if (params.showAnnotations) {
    renderAnnotations(ctx, true, CANVAS_W, SIM_H);
  }

  // ── Particle count HUD (bottom-left of sim area) ──
  const active = particles.filter(p => p.active).length;
  const detected = particles.filter(p => p.detectedAt !== null).length;
  ctx.save();
  ctx.font = '12px ui-monospace,monospace';
  ctx.fillStyle = 'rgba(100, 200, 100, 0.65)';
  ctx.textAlign = 'left';
  ctx.fillText(`${active} active · ${detected} detected`, 8, SIM_H - 10);
  ctx.restore();

  // ── Mode badge ──
  renderModeBadge(ctx);
}

function renderRegionLabels(ctx: CanvasRenderingContext2D, scaleY: number): void {
  const barrierY = BARRIER_Y * scaleY;
  ctx.save();
  ctx.font = '11px ui-monospace,monospace';
  ctx.fillStyle = 'rgba(120,170,220,0.5)';
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 4;
  ctx.fillText('SOURCE', 8, 52);
  ctx.fillText('↓ plane wave', 8, 66);
  ctx.fillText('INTERFERENCE', 8, barrierY + 24);
  ctx.fillText('REGION', 8, barrierY + 38);
  ctx.restore();
}

function renderModeBadge(ctx: CanvasRenderingContext2D): void {
  const isBohm = params.mode === 'bohm';
  const label = isBohm ? 'BOHMIAN MECHANICS' : 'COPENHAGEN';
  const color = isBohm ? 'rgba(57,255,20,0.9)' : 'rgba(255,200,80,0.9)';
  const bg = isBohm ? 'rgba(0,60,10,0.7)' : 'rgba(60,40,0,0.7)';

  ctx.save();
  ctx.font = 'bold 12px ui-monospace,monospace';
  const tw = ctx.measureText(label).width;
  const bx = CANVAS_W - tw - 20;
  const by = 8;

  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(bx - 6, by - 2, tw + 12, 18, 4);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.fillText(label, bx, by + 11);
  ctx.restore();
}

// ─── Animation loop ────────────────────────────────────────────────────────────

function animate(): void {
  frameCount++;

  if (vField && params.mode === 'bohm') {
    for (const p of particles) {
      if (p.active) {
        stepParticle(p, vField);
        if (p.detectedAt !== null) {
          // histogram is indexed by x position (GRID_W bins), displayed vertically
          const xBin = Math.floor(p.detectedAt);
          if (xBin >= 0 && xBin < GRID_W) histogram[xBin]++;
        }
      }
    }

    if (params.running) {
      spawnTimer++;
      if (spawnTimer >= SPAWN_INTERVAL) {
        spawnTimer = 0;
        fireParticles(1);
      }
    }

    if (particles.length > 1000) {
      particles = particles.filter(p => p.active || p.detectedAt !== null).slice(-600);
    }
  }

  // Copenhagen: sample from |psi|^2 at detector
  if (params.mode === 'copenhagen' && params.running && wave) {
    spawnTimer++;
    if (spawnTimer >= SPAWN_INTERVAL * 2) {
      spawnTimer = 0;
      const y = GRID_H - 2;
      let sum = 0;
      for (let x = 0; x < GRID_W; x++) sum += wave.prob[y * GRID_W + x];
      const r = Math.random() * sum;
      let acc = 0;
      for (let x = 0; x < GRID_W; x++) {
        acc += wave.prob[y * GRID_W + x];
        if (acc >= r) {
          particles.push({ x, y, trail: [], active: false, detectedAt: x });
          if (x >= 0 && x < GRID_W) histogram[x]++;
          break;
        }
      }
    }
    if (particles.length > 2000) particles = particles.slice(-2000);
  }

  renderFrame();
  requestAnimationFrame(animate);
}

// ─── Init ──────────────────────────────────────────────────────────────────────

recompute();
setTimeout(animate, 200);
