/* ============================================
   5.18 Memorial Tower — Script v3
   24×50 CSS Grid tower matching the image
   ============================================ */

const API = 'https://518-production.up.railway.app/api/board';

const GRID_COLS = 24;
const GRID_ROWS = 50;

let totalBlocks = 0;
let posts = {};

/* ── DOM ── */
const towerEl      = document.getElementById('tower');
const overlay      = document.getElementById('modal-overlay');
const btnClose     = document.getElementById('modal-close');
const viewMeta     = document.getElementById('view-meta');
const viewName     = document.getElementById('view-name');
const viewContent  = document.getElementById('view-content');
const viewDate     = document.getElementById('view-date');
const inpName      = document.getElementById('inp-name');
const inpContent   = document.getElementById('inp-content');
const charCount    = document.getElementById('char-count');
const submitBtn    = document.getElementById('submit-btn');
const filledCount  = document.getElementById('filled-count');
const totalCount   = document.getElementById('total-count');
const nextPosLabel = document.getElementById('next-pos-label');
const nextPosInfo  = document.getElementById('next-pos-info');

/* ══════════════════════════════════════════
   Tower layout definition (24 cols × 50 rows)
   0 = empty space
   1 = stone block
   2 = sphere/bell block (dark bronze)
   ══════════════════════════════════════════ */
function generateGrid() {
    const G = Array.from({ length: GRID_ROWS }, () => new Uint8Array(GRID_COLS));

    /* Helper: fill row r from col c1 to c2 with type t (default 1) */
    const row = (r, c1, c2, t = 1) => { for (let c = c1; c <= c2; c++) G[r][c] = t; };
    /* Helper: fill rows r1..r2 with same column range */
    const rows = (r1, r2, c1, c2, t = 1) => { for (let r = r1; r <= r2; r++) row(r, c1, c2, t); };

    /* ── Section A: Twin spires (rows 0–9) ─────────────────────────────
       Left spire: cols 9–10 (2 wide)
       Right spire: cols 13–14 (2 wide)
       Gap between: cols 11–12                                          */
    rows(0, 9,  9, 10);
    rows(0, 9, 13, 14);

    /* ── Section B: Spire → pillar transition (rows 10–11) ─────────────
       Left widens to cols 7–10 (4 wide)
       Right widens to cols 13–16 (4 wide)                              */
    rows(10, 11,  7, 10);
    rows(10, 11, 13, 16);

    /* ── Section C: Sphere / bell area (rows 12–19) ────────────────────
       Wings spread outward, sphere fills center gap                     */
    row(12,  6, 10);  row(12, 13, 17);                          // slight wing
    row(13,  5, 10);  row(13, 13, 18);                          // wider wing
    row(14,  3, 10);  row(14, 11, 12, 2); row(14, 13, 20);     // max wing + sphere top
    row(15,  3, 10);  row(15, 11, 12, 2); row(15, 13, 20);     // sphere centre
    row(16,  3, 10);  row(16, 11, 12, 2); row(16, 13, 20);     // sphere centre
    row(17,  4, 10);  row(17, 11, 12, 2); row(17, 13, 19);     // sphere bottom
    row(18,  5, 10);  row(18, 13, 18);                          // wing closing
    row(19,  6, 10);  row(19, 13, 17);                          // wing closing

    /* ── Section D: Upper pillars (rows 20–27) ─────────────────────────
       Left: cols 7–10 | gap: 11–12 | Right: cols 13–16               */
    rows(20, 27,  7, 10);
    rows(20, 27, 13, 16);

    /* ── Section E: Upper crossbar (rows 28–29) ────────────────────────
       Solid bar + bracket caps (1 block wider each side)               */
    rows(28, 29,  6, 17);

    /* ── Section F: Middle pillars (rows 30–39) ────────────────────────
       Same width as upper pillars                                       */
    rows(30, 39,  7, 10);
    rows(30, 39, 13, 16);

    /* ── Section G: Lower crossbar (rows 40–41) ────────────────────────
       Same cap style as upper crossbar                                  */
    rows(40, 41,  6, 17);

    /* ── Section H: Lower flare (rows 42–44) ───────────────────────────
       Pillars step outward toward base                                  */
    row(42,  6, 10);  row(42, 13, 17);
    row(43,  5, 10);  row(43, 13, 18);
    row(44,  4, 10);  row(44, 13, 19);

    /* ── Section I: Stepped base (rows 45–49) ──────────────────────────
       Each row steps 1 block outward on both sides                      */
    row(45,  3, 10);  row(45, 13, 20);
    row(46,  2, 10);  row(46, 13, 21);
    row(47,  1, 10);  row(47, 13, 22);
    row(48,  0, 10);  row(48, 13, 23);
    row(49,  0, 10);  row(49, 13, 23);  // ground row (same width)

    return G;
}

/* ══════════════════════════════════════════
   Init
   ══════════════════════════════════════════ */
async function init() {
    buildTower();
    initParticles();
    await loadPosts();
}

/* ══════════════════════════════════════════
   Build the CSS-Grid tower
   ══════════════════════════════════════════ */
function buildTower() {
    const grid = generateGrid();
    towerEl.innerHTML = '';

    let pos = 1;

    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const type = grid[r][c];

            if (type === 0) {
                const spacer = document.createElement('div');
                spacer.className = 'cell-empty';
                towerEl.appendChild(spacer);
            } else {
                const el = document.createElement('div');
                el.className = 'block empty' + (type === 2 ? ' sphere-block' : '');
                el.dataset.position = pos;
                el.textContent = pos;
                el.addEventListener('click', onBlockClick);
                towerEl.appendChild(el);
                pos++;
            }
        }
    }

    totalBlocks = pos - 1;
    totalCount.textContent = totalBlocks;
}

/* ══════════════════════════════════════════
   API — load all posts
   ══════════════════════════════════════════ */
async function loadPosts() {
    try {
        const res = await fetch(`${API}/list`);
        if (!res.ok) throw new Error(res.status);
        const list = await res.json();
        posts = {};
        list.forEach(p => { posts[Number(p.position)] = p; });
        refreshAllBlocks();
        updateCounter();
        updateNextPosition();
    } catch (e) {
        console.warn('추모글 로드 실패 (백엔드 확인):', e);
        updateNextPosition(); // still set "position 1" label
    }
}

/* ══════════════════════════════════════════
   Block state helpers
   ══════════════════════════════════════════ */
function refreshAllBlocks() {
    towerEl.querySelectorAll('.block').forEach(el => {
        applyState(el, Number(el.dataset.position));
    });
}

function applyState(el, pos) {
    const p = posts[pos];
    const isSphere = el.classList.contains('sphere-block');

    if (p) {
        el.className = 'block filled' + (isSphere ? ' sphere-block' : '');
        el.textContent = p.name;
        el.title = `${p.name} — 클릭하여 추모글 보기`;
    } else {
        el.className = 'block empty' + (isSphere ? ' sphere-block' : '');
        el.textContent = pos;
        el.title = `블록 #${pos}`;
    }
}

function updateCounter() {
    filledCount.textContent = Object.keys(posts).length;
}

function getNextEmpty() {
    for (let i = 1; i <= totalBlocks; i++) {
        if (!posts[i]) return i;
    }
    return null;
}

function updateNextPosition() {
    const next = getNextEmpty();
    if (next) {
        nextPosLabel.textContent = next;
        submitBtn.disabled = false;
    } else {
        nextPosInfo.innerHTML = '<strong>모든 블록이 채워졌습니다.</strong> 함께해 주셔서 감사합니다.';
        submitBtn.disabled = true;
    }
}

/* ══════════════════════════════════════════
   Block click
   ══════════════════════════════════════════ */
function onBlockClick(e) {
    const pos = Number(e.currentTarget.dataset.position);
    if (posts[pos]) {
        openViewModal(pos);
    } else {
        document.getElementById('write-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => inpName.focus(), 500);
    }
}

/* ══════════════════════════════════════════
   View modal
   ══════════════════════════════════════════ */
function openViewModal(pos) {
    const p = posts[pos];
    viewMeta.textContent    = `블록 #${pos}`;
    viewName.textContent    = p.name;
    viewContent.textContent = p.content;
    viewDate.textContent    = formatDate(p.createdAt);
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
}

/* ══════════════════════════════════════════
   Form submit
   ══════════════════════════════════════════ */
async function submitPost() {
    const name    = inpName.value.trim();
    const content = inpContent.value.trim();
    const position = getNextEmpty();

    if (!position) { alert('모든 블록이 채워졌습니다.'); return; }

    let ok = true;
    if (!name)    { showError(inpName,    '이름을 입력해주세요');     ok = false; }
    if (!content) { showError(inpContent, '추모의 글을 입력해주세요'); ok = false; }
    if (!ok) return;

    submitBtn.disabled = true;
    submitBtn.textContent = '새기는 중…';

    try {
        const res = await fetch(`${API}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, content, position }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        /* ── Success ── */
        posts[position] = { name, content, position, createdAt: new Date().toISOString() };
        updateCounter();
        updateNextPosition();

        /* Animate the newly lit block */
        const blockEl = towerEl.querySelector(`[data-position="${position}"]`);
        if (blockEl) {
            const isSphere = blockEl.classList.contains('sphere-block');
            blockEl.className = 'block filled light-up' + (isSphere ? ' sphere-block' : '');
            blockEl.textContent = name;
            blockEl.title = `${name} — 클릭하여 추모글 보기`;
            setTimeout(() => blockEl.classList.remove('light-up'), 1050);
            setTimeout(() => blockEl.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
        }

        inpName.value = ''; inpContent.value = '';
        charCount.textContent = '0';
        submitBtn.textContent = '탑에 새기기';

    } catch (e) {
        console.error('등록 실패:', e);
        submitBtn.disabled = false;
        submitBtn.textContent = '탑에 새기기';
        alert('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
}

/* ══════════════════════════════════════════
   Utilities
   ══════════════════════════════════════════ */
function formatDate(raw) {
    if (!raw) return '';
    if (Array.isArray(raw)) { const [y, m, d] = raw; return `${y}년 ${m}월 ${d}일 작성`; }
    try {
        const d = new Date(raw);
        return isNaN(d) ? '' : `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 작성`;
    } catch { return ''; }
}

function showError(el, msg) {
    el.classList.add('error');
    el.placeholder = msg;
    el.addEventListener('input', () => {
        el.classList.remove('error');
        el.placeholder = el === inpName ? '탑에 새겨질 이름' : '당신의 마음을 전해주세요...';
    }, { once: true });
}

/* ══════════════════════════════════════════
   Particle system
   ══════════════════════════════════════════ */
function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    const ctx    = canvas.getContext('2d');
    let particles = [];

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    const spawn  = () => ({
        x: Math.random() * canvas.width, y: canvas.height + 6,
        r: Math.random() * 1.5 + 0.4,
        vy: Math.random() * 0.42 + 0.18, vx: (Math.random() - 0.5) * 0.25,
        alpha: Math.random() * 0.42 + 0.12,
        life: 0, maxLife: Math.random() * 240 + 150,
    });

    const tick = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (Math.random() < 0.28) particles.push(spawn());
        particles = particles.filter(p => p.life < p.maxLife);
        if (particles.length > 80) particles.splice(0, particles.length - 80);
        particles.forEach(p => {
            p.life++; p.y -= p.vy; p.x += p.vx;
            const a = p.alpha * (1 - p.life / p.maxLife);
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(218,172,92,${a})`; ctx.fill();
        });
        requestAnimationFrame(tick);
    };

    window.addEventListener('resize', resize); resize(); tick();
}

/* ══════════════════════════════════════════
   Event listeners
   ══════════════════════════════════════════ */
btnClose.addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
inpContent.addEventListener('input', () => { charCount.textContent = inpContent.value.length; });
submitBtn.addEventListener('click', submitPost);

/* ══════════════════════════════════════════
   Start
   ══════════════════════════════════════════ */
init();
