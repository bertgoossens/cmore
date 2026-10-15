// Header-stijl bij scrollen
const header = document.getElementById('header');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Mobiel menu
const mobileMenu = document.getElementById('mobileMenu');
const setMenu = open => {
  mobileMenu.classList.toggle('open', open);
  mobileMenu.setAttribute('aria-hidden', String(!open));
  document.body.style.overflow = open ? 'hidden' : '';
};
document.getElementById('burger').addEventListener('click', () => setMenu(true));
document.getElementById('menuClose').addEventListener('click', () => setMenu(false));
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));

// Elementen laten verschijnen bij scrollen
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// Fotogalerij: filteren per ruimte
const tiles = [...document.querySelectorAll('#masonry button')];
document.querySelectorAll('.filters button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filters button').forEach(b => b.classList.toggle('active', b === btn));
    const f = btn.dataset.filter;
    tiles.forEach(t => { t.hidden = f !== 'all' && t.dataset.cat !== f; });
  });
});

// Lightbox
const lb = document.getElementById('lightbox');
const lbImg = document.getElementById('lbImg');
const lbCount = document.getElementById('lbCount');
let current = [];
let index = 0;

const show = i => {
  index = (i + current.length) % current.length;
  const img = current[index].querySelector('img');
  lbImg.src = img.src;
  lbImg.alt = img.alt;
  lbCount.textContent = `${index + 1} / ${current.length}`;
};
const openLb = tile => {
  current = tiles.filter(t => !t.hidden);
  show(current.indexOf(tile));
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
};
const closeLb = () => {
  lb.classList.remove('open');
  document.body.style.overflow = '';
};

tiles.forEach(t => t.addEventListener('click', () => openLb(t)));
document.getElementById('lbClose').addEventListener('click', closeLb);
document.getElementById('lbPrev').addEventListener('click', () => show(index - 1));
document.getElementById('lbNext').addEventListener('click', () => show(index + 1));
lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
document.addEventListener('keydown', e => {
  if (!lb.classList.contains('open')) return;
  if (e.key === 'Escape') closeLb();
  if (e.key === 'ArrowLeft') show(index - 1);
  if (e.key === 'ArrowRight') show(index + 1);
});

// Swipen op mobiel
let touchX = null;
lb.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
lb.addEventListener('touchend', e => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
  touchX = null;
});

document.getElementById('year').textContent = new Date().getFullYear();

// ---- Datums ----
// Lokale datum, niet toISOString(): die rekent naar UTC en schuift in België een dag terug.
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const fromIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = fromIso(s); d.setDate(d.getDate() + n); return iso(d); };
const today = new Date(); today.setHours(0, 0, 0, 0);
const todayIso = iso(today);

// ---- Beschikbaarheidskalender ----
// In iCal is de einddatum de vertrekdag: die dag is dus niet bezet (de volgende gast kan dan aankomen).
let bookedSet = new Set();
let calStatus = 'loading';
const view = new Date(today); view.setDate(1);

function loadBookings(data) {
  bookedSet = new Set();
  (data.booked || []).forEach(b => {
    for (let d = b.start; d < b.end; d = addDays(d, 1)) bookedSet.add(d);
  });
}

function month(base) {
  const y = base.getFullYear(), m = base.getMonth();
  const startDow = (new Date(y, m, 1).getDay() + 6) % 7, dim = new Date(y, m + 1, 0).getDate();
  const el = document.createElement('div'); el.className = 'month';
  const title = document.createElement('h3');
  title.textContent = new Date(y, m, 1).toLocaleDateString('nl-BE', { month: 'long', year: 'numeric' });
  const dow = document.createElement('div'); dow.className = 'dow'; dow.setAttribute('aria-hidden', 'true');
  ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].forEach(n => { const s = document.createElement('span'); s.textContent = n; dow.appendChild(s); });
  const g = document.createElement('div'); g.className = 'days';
  for (let i = 0; i < startDow; i++) { const e = document.createElement('div'); e.className = 'cday empty'; g.appendChild(e); }
  for (let day = 1; day <= dim; day++) {
    const k = iso(new Date(y, m, day));
    const label = fromIso(k).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' });
    const c = document.createElement('div');
    if (k < todayIso) c.className = 'cday past';
    else if (bookedSet.has(k)) { c.className = 'cday booked'; c.title = 'Bezet'; c.setAttribute('aria-label', label + ', bezet'); }
    else { c.className = 'cday free'; c.title = 'Vrij'; c.setAttribute('aria-label', label + ', vrij'); }
    c.textContent = day;
    if (k === todayIso) c.classList.add('today');
    g.appendChild(c);
  }
  el.append(title, dow, g);
  return el;
}

function renderCalendar() {
  const box = document.getElementById('calMonths');
  const m2 = new Date(view); m2.setMonth(m2.getMonth() + 1);
  box.replaceChildren(month(view), month(m2));
  const mName = d => d.toLocaleDateString('nl-BE', { month: 'long' });
  document.getElementById('calRange').textContent = mName(view) + ' – ' + mName(m2) + ' ' + m2.getFullYear();
  const first = new Date(today); first.setDate(1);
  document.getElementById('calPrev').disabled = view <= first;

  const s = document.getElementById('calStatus');
  s.className = 'cal-status' + (calStatus === 'ok' ? '' : ' demo');
  s.innerHTML = '<span class="dot"></span> ';
  s.append({
    loading: 'Beschikbaarheid laden…',
    ok: 'Automatisch gesynchroniseerd met onze boekingen.',
    manual: 'De kalender is nog niet gesynchroniseerd.',
    error: 'De kalender kon niet geladen worden. Probeer het later opnieuw.',
  }[calStatus]);
}

document.getElementById('calPrev').addEventListener('click', () => { view.setMonth(view.getMonth() - 1); renderCalendar(); });
document.getElementById('calNext').addEventListener('click', () => { view.setMonth(view.getMonth() + 1); renderCalendar(); });

// ---- Start ----
renderCalendar();
fetch('/api/availability', { cache: 'no-store' })
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(data => { loadBookings(data); calStatus = data.synced ? 'ok' : 'manual'; renderCalendar(); })
  .catch(() => { calStatus = 'error'; renderCalendar(); });
