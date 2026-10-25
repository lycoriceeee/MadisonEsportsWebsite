const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

// Wrap each word of the statement in a span so it can light up on its own
function splitWords(root) {
  const words = [];
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
          } else {
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = part;
            frag.appendChild(span);
            words.push(span);
          }
        });
        child.replaceWith(frag);
      } else {
        walk(child);
      }
    });
  };
  walk(root);
  return words;
}

const scenes = [...document.querySelectorAll('[data-scene]')].map((el) => ({
  el,
  name: el.dataset.scene,
  target: 0,
  current: 0
}));

const words = splitWords(document.getElementById('statement'));
const track = document.getElementById('games-track');
const games = [...track.querySelectorAll('.game')];
const gameIndex = document.getElementById('game-index');
const header = document.getElementById('header');
const root = document.documentElement;

document.getElementById('game-total').textContent = String(games.length).padStart(2, '0');

let trackDistance = 0;
function measure() {
  trackDistance = Math.max(0, track.scrollWidth - window.innerWidth);
}

function readTargets() {
  const vh = window.innerHeight;
  scenes.forEach((s) => {
    const rect = s.el.getBoundingClientRect();
    const total = rect.height - vh;
    s.target = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
  });
  const max = root.scrollHeight - vh;
  root.style.setProperty('--page', max > 0 ? (window.scrollY / max).toFixed(4) : 0);
  header.classList.toggle('scrolled', window.scrollY > 12);
}

function paint(s) {
  const p = s.current;
  s.el.style.setProperty('--p', p.toFixed(4));

  if (s.name === 'statement') {
    const lit = p * words.length * 1.15;
    words.forEach((w, i) => {
      w.style.opacity = (0.14 + 0.86 * clamp(lit - i, 0, 1)).toFixed(3);
    });
  }

  if (s.name === 'games') {
    track.style.transform = `translate3d(${(-p * trackDistance).toFixed(1)}px, 0, 0)`;
    const centre = window.innerWidth * 0.4;
    let closest = 0;
    let closestDist = Infinity;
    games.forEach((g, i) => {
      const r = g.getBoundingClientRect();
      const dist = Math.abs(r.left + Math.min(r.width, window.innerWidth) / 2 - centre);
      g.style.setProperty('--focus', clamp(1 - dist / (window.innerWidth * 0.6), 0, 1).toFixed(3));
      if (dist < closestDist) { closestDist = dist; closest = i; }
    });
    gameIndex.textContent = String(closest + 1).padStart(2, '0');
  }
}

// Each scene eases toward its scroll position, so motion glides instead of snapping
let running = false;
function frame() {
  let moving = false;
  scenes.forEach((s) => {
    const diff = s.target - s.current;
    if (Math.abs(diff) > 0.0005) {
      s.current += diff * 0.12;
      moving = true;
    } else {
      s.current = s.target;
    }
    paint(s);
  });
  running = moving;
  if (running) requestAnimationFrame(frame);
}

function onScroll() {
  readTargets();
  if (!running) {
    running = true;
    requestAnimationFrame(frame);
  }
}

function start() {
  measure();
  readTargets();
  if (reduceMotion.matches) {
    words.forEach((w) => { w.style.opacity = ''; });
    header.classList.toggle('scrolled', window.scrollY > 12);
    window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 12), { passive: true });
    return;
  }
  scenes.forEach((s) => { s.current = s.target; paint(s); });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { measure(); onScroll(); });
}

document.getElementById('year').textContent = new Date().getFullYear();
start();
if (document.fonts) document.fonts.ready.then(() => { measure(); onScroll(); });
