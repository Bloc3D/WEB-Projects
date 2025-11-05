
/* Updated script.js — preserves background animation + adds API calls */
// Dynamic year
document.getElementById("year").textContent = new Date().getFullYear();

// Toggle mobile nav
const menuBtn = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");
menuBtn.addEventListener("click", () => navMenu.classList.toggle("active"));

// Background animation (unchanged)
const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d");
let particles = [];
let w, h;

function resize() {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

function createParticles() {
  particles = [];
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      dx: (Math.random() - 0.5) * 0.7,
      dy: (Math.random() - 0.5) * 0.7,
      r: Math.random() * 2 + 1
    });
  }
}

function draw() {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(0, 255, 255, 0.5)";
  particles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    p.x += p.dx;
    p.y += p.dy;
    if (p.x < 0 || p.x > w) p.dx *= -1;
    if (p.y < 0 || p.y > h) p.dy *= -1;
  });
  requestAnimationFrame(draw);
}

createParticles();
draw();

// Scroll reveal animation
const revealElements = document.querySelectorAll('.reveal');
function revealOnScroll() {
  const trigger = window.innerHeight * 0.85;
  revealElements.forEach(el => {
    const top = el.getBoundingClientRect().top;
    if (top < trigger) el.classList.add('visible');
  });
}
window.addEventListener('scroll', revealOnScroll);
revealOnScroll();

// ---------------------
// New: API integration
// ---------------------
const API_ROOT = '/api';

// Load projects from backend and render
async function loadProjects() {
  try {
    const res = await fetch(`${API_ROOT}/projects`);
    if (!res.ok) throw new Error('Failed fetching projects');
    const projects = await res.json();
    const container = document.getElementById('projectsGrid');
    if (!container) return;
    container.innerHTML = '';
    projects.forEach(p => {
      const el = document.createElement('article');
      el.className = 'project-card';
      el.innerHTML = `
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.description || '')}</p>
        ${p.url ? `<p><a href="${escapeAttr(p.url)}" target="_blank" rel="noopener" class="btn btn-outline">View</a></p>` : ''}
      `;
      container.appendChild(el);
    });
  } catch (err) {
    console.error(err);
  }
}
loadProjects();

// Contact form submit
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const message = document.getElementById('contactMessage').value.trim();
    const statusEl = document.getElementById('contactStatus');
    statusEl.textContent = 'Sending...';

    try {
      const res = await fetch(`${API_ROOT}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to send');
      }
      statusEl.textContent = 'Message sent — thanks!';
      contactForm.reset();
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Failed to send message. Try again later.';
    } finally {
      setTimeout(()=> { statusEl.textContent = ''; }, 5000);
    }
  });
}

// small helpers to avoid HTML injection
function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
}
function escapeAttr(s) {
  if (!s) return '';
  return s.replace(/"/g, '&quot;');
}
