// ============================================================
// ЧистоПро — Cinematic Scroll Engine
// 7 clips × 120 frames = 840 total frames
// ============================================================

const TOTAL_FRAMES = 840;
const PAGE_COUNT = 6;
const LERP = 0.07;
const CONCURRENCY = 48;
const isMobile = window.innerWidth < 768;
const FRAME_DIR = isMobile ? 'frames-mobile' : 'frames-webp';

// --- State ---
let frames = new Array(TOTAL_FRAMES).fill(null);
let currentFrame = 0;
let targetFrame = 0;
let isReady = false;
let rafId = null;

// --- Canvas ---
const canvas = document.getElementById('gl-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// --- Draw frame cover-fit ---
function drawFrame(idx) {
  const img = frames[Math.max(0, Math.min(TOTAL_FRAMES - 1, idx))];
  if (!img) return;
  const cw = canvas.width, ch = canvas.height;
  const iw = img.naturalWidth || img.width || 1920;
  const ih = img.naturalHeight || img.height || 1080;
  const scale = Math.max(cw / iw, ch / ih);
  const dw = iw * scale, dh = ih * scale;
  const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(img, dx, dy, dw, dh);
}

// --- Frame loader ---
async function loadFrame(idx) {
  return new Promise((resolve) => {
    const img = new Image();
    const n = String(idx + 1).padStart(6, '0');
    img.src = `${FRAME_DIR}/frame_${n}.webp`;
    img.onload = () => { frames[idx] = img; resolve(); };
    img.onerror = () => resolve();
  });
}

async function loadAllFrames() {
  const queue = Array.from({ length: TOTAL_FRAMES }, (_, i) => i);
  let loaded = 0;
  const bar = document.getElementById('loader-bar');
  const pct = document.getElementById('loader-pct');

  async function worker() {
    while (queue.length > 0) {
      const idx = queue.shift();
      await loadFrame(idx);
      loaded++;
      const p = Math.round((loaded / TOTAL_FRAMES) * 100);
      if (bar) bar.style.width = p + '%';
      if (pct) pct.textContent = p + '%';
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // Hide loader
  const loader = document.getElementById('loader');
  if (loader) {
    loader.classList.add('hidden');
    setTimeout(() => loader.remove(), 800);
  }
  isReady = true;
}

// --- Scroll handler ---
window.addEventListener('scroll', () => {
  if (!isReady) return;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  targetFrame = progress * (TOTAL_FRAMES - 1);
}, { passive: true });

// --- RAF loop ---
function animate() {
  rafId = requestAnimationFrame(animate);
  currentFrame += (targetFrame - currentFrame) * LERP;
  if (isReady) drawFrame(Math.round(currentFrame));
}
animate();

// --- Section detection ---
const pages = Array.from(document.querySelectorAll('.page'));
const navLinks = Array.from(document.querySelectorAll('.nav-links a'));
const drawerLinks = Array.from(document.querySelectorAll('.drawer-link'));
const reveals = Array.from(document.querySelectorAll('.reveal-3d'));

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const idx = pages.indexOf(entry.target);
      navLinks.forEach((l, i) => l.classList.toggle('active', i === idx - 1));
      drawerLinks.forEach((l, i) => l.classList.toggle('active', i === idx - 1));
    }
  });
}, { root: null, rootMargin: '-40% 0px -40% 0px' });

pages.forEach(p => sectionObserver.observe(p));

// --- Reveal animations ---
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 80);
    }
  });
}, { root: null, rootMargin: '-10% 0px -10% 0px' });

reveals.forEach(el => revealObserver.observe(el));

// --- Scroll-to-section ---
function scrollToSection(idx) {
  if (pages[idx]) pages[idx].scrollIntoView({ behavior: 'smooth' });
}

document.querySelectorAll('[data-scroll]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    const idx = parseInt(el.dataset.scroll);
    scrollToSection(idx);
    closeDrawer();
  });
});

// --- Burger / Drawer ---
const burger = document.getElementById('burger');
const drawer = document.getElementById('nav-drawer');
const scrim = document.getElementById('nav-scrim');

function openDrawer() {
  drawer.hidden = false;
  scrim.hidden = false;
}
function closeDrawer() {
  drawer.hidden = true;
  scrim.hidden = true;
}

if (burger) burger.addEventListener('click', () => {
  drawer.hidden ? openDrawer() : closeDrawer();
});
if (scrim) scrim.addEventListener('click', closeDrawer);

// --- Form ---
function handleSubmit(e) {
  e.preventDefault();
  const toast = document.getElementById('toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4500);
  e.target.reset();
}

// --- Start loading ---
loadAllFrames();
