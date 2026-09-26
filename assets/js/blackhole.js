/* FILE: assets/js/blackhole.js */
/* Click the X in LuShadowX: the page crumbles into a black hole, glitches out to a 404, then restarts. */

(() => {
    const trigger = document.querySelector('.brand-x');
    if (!trigger) return;

    const BACKGROUND_LAYERS = '.p-stc, #particle-canvas';
    const SKIP = 'script, style, noscript, template, .header__nav, .bh-root, .texture-overlay, .scanlines, .p-stc, #particle-canvas';
    const MAX_WORDS = 900;

    const rand = (a, b) => a + Math.random() * (b - a);
    const wait = ms => new Promise(r => setTimeout(r, ms));

    const CSS = `
    .bh-hide body > *:not(.bh-root):not(.p-stc):not(#particle-canvas):not(.texture-overlay):not(.scanlines) { opacity: 0 !important; transition: none !important; }
    .bh-root { position: fixed; inset: 0; z-index: 2147483000; pointer-events: all; cursor: none; }
    .bh-dark { position: absolute; inset: 0; background: radial-gradient(circle at 50% 18vh, #000 0, #050208 45%, #000 100%); opacity: 0; }
    .bh-layer { position: absolute; inset: 0; overflow: visible; }
    .bh-piece { position: absolute; margin: 0; box-sizing: border-box; white-space: pre; will-change: transform, opacity; transform-origin: 50% 50%; }
    .bh-hole { position: absolute; left: 50%; top: 18vh; width: 0; height: 0; transform: scale(0); z-index: 3; }
    .bh-hole canvas { position: absolute; transform: translate(-50%, -50%); }
    .bh-404 { position: absolute; inset: 0; z-index: 6; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0;
        background: #000 repeating-linear-gradient(to bottom, rgba(255,255,255,0.035) 0 1px, transparent 1px 4px);
        font-family: 'Oswald', sans-serif; color: #fff; text-transform: uppercase; }
    .bh-404 .e-top, .bh-404 .e-bot { font-weight: 700; letter-spacing: 0.08em; font-size: clamp(1.4rem, 3.4vw, 2.6rem);
        text-shadow: -2px 0 #3dffa0, 2px 0 #ff2d75; }
    .bh-404 .e-bot { letter-spacing: 0.1em; }
    .bh-404 .e-num { position: relative; font-weight: 900; font-size: clamp(8rem, 30vw, 22rem); line-height: 0.95; letter-spacing: 0.04em; margin: 0.05em 0 0.1em;
        text-shadow: -6px 0 #3dffa0, 6px 0 #ff2d75; }
    .bh-404 .e-num::before, .bh-404 .e-num::after { content: attr(data-text); position: absolute; inset: 0; }
    .bh-404 .e-num::before { color: #3dffa0; transform: translateX(-10px); mix-blend-mode: screen; clip-path: inset(40% 0 45% 0); animation: bh-slice 0.9s steps(1) infinite; }
    .bh-404 .e-num::after { color: #ff2d75; transform: translateX(10px); mix-blend-mode: screen; clip-path: inset(70% 0 12% 0); animation: bh-slice 0.7s steps(1) infinite reverse; }
    .bh-404 .bar { position: absolute; height: 6px; background: #fff; }
    .bh-404 .bar.k { background: #000; height: 5px; }
    .bh-404 .bar.g { background: #3dffa0; width: 12px !important; height: 12px; }
    .bh-404 .bar.p { background: #ff2d75; width: 12px !important; height: 12px; }
    @keyframes bh-slice { 0% { clip-path: inset(40% 0 45% 0); } 20% { clip-path: inset(8% 0 80% 0); } 40% { clip-path: inset(62% 0 20% 0); } 60% { clip-path: inset(25% 0 60% 0); } 80% { clip-path: inset(85% 0 3% 0); } }
    .bh-flash { position: absolute; left: 50%; top: 18vh; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; background: #fff; opacity: 0; z-index: 5;
        box-shadow: 0 0 60px 30px #fff, 0 0 200px 90px rgba(255, 180, 120, 0.8); }
    `;

    const alpha = c => {
        const m = /rgba?\(([^)]+)\)/.exec(c || '');
        if (!m) return 0;
        const p = m[1].split(/[\s,\/]+/).filter(Boolean);
        return p.length < 4 ? 1 : parseFloat(p[3]);
    };

    // --- visibility + clipping helpers ---
    const shownCache = new Map();
    const isShown = el => {
        if (!el || el === document.body || el === document.documentElement) return true;
        if (shownCache.has(el)) return shownCache.get(el);
        const cs = getComputedStyle(el);
        const ok = cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.02 && isShown(el.parentElement);
        shownCache.set(el, ok);
        return ok;
    };

    const clipCache = new Map();
    const clipOf = el => {
        // viewport rect intersected with every overflow-clipping ancestor
        if (!el || el === document.body || el === document.documentElement) return { l: 0, t: 0, r: innerWidth, b: innerHeight };
        if (clipCache.has(el)) return clipCache.get(el);
        let c = clipOf(el.parentElement);
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed') c = { l: 0, t: 0, r: innerWidth, b: innerHeight };
        if (c && (cs.overflowX !== 'visible' || cs.overflowY !== 'visible')) {
            const r = el.getBoundingClientRect();
            c = { l: Math.max(c.l, r.left), t: Math.max(c.t, r.top), r: Math.min(c.r, r.right), b: Math.min(c.b, r.bottom) };
            if (c.r <= c.l || c.b <= c.t) c = null;
        }
        clipCache.set(el, c);
        return c;
    };

    const visibleRect = (r, clip) => {
        if (!clip || r.width < 1 || r.height < 1) return null;
        const v = { l: Math.max(r.left, clip.l), t: Math.max(r.top, clip.t), r: Math.min(r.right, clip.r), b: Math.min(r.bottom, clip.b) };
        return v.r > v.l && v.b > v.t ? v : null;
    };

    const place = (node, x, y, w, h) => {
        node.classList.add('bh-piece');
        Object.assign(node.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
        return node;
    };

    const centerOf = n => n._c || [parseFloat(n.style.left) + parseFloat(n.style.width) / 2, parseFloat(n.style.top) + parseFloat(n.style.height) / 2];

    // break one piece into jagged shards: full-size clones, each clipped to one cell of a jittered grid
    function shatter(node, r, v, cell = 140, pad = 0) {
        const w = v.r - v.l, h = v.b - v.t;
        const cols = Math.max(2, Math.min(5, Math.round(w / cell))), rows = Math.max(2, Math.min(4, Math.round(h / cell)));
        const ox = v.l - r.left, oy = v.t - r.top;
        const P = [];
        for (let i = 0; i <= cols; i++) {
            P.push([]);
            for (let j = 0; j <= rows; j++) {
                let x = ox + (w * i) / cols, y = oy + (h * j) / rows;
                if (i > 0 && i < cols) x += rand(-0.32, 0.32) * (w / cols); else x += i === 0 ? -pad : pad;
                if (j > 0 && j < rows) y += rand(-0.32, 0.32) * (h / rows); else y += j === 0 ? -pad : pad;
                P[i].push([x, y]);
            }
        }
        const polys = [];
        for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
            const a = P[i][j], b = P[i + 1][j], c = P[i + 1][j + 1], d = P[i][j + 1];
            if (Math.random() < 0.5) polys.push([a, b, c, d]);
            else if (Math.random() < 0.5) polys.push([a, b, c], [a, c, d]);
            else polys.push([a, b, d], [b, c, d]);
        }
        return polys.map(pts => {
            const c = node.cloneNode(true);
            const mx = pts.reduce((t, p) => t + p[0], 0) / pts.length, my = pts.reduce((t, p) => t + p[1], 0) / pts.length;
            c.style.clipPath = `polygon(${pts.map(p => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(',')})`;
            c.style.transformOrigin = `${mx}px ${my}px`;
            c._c = [r.left + mx, r.top + my];
            return c;
        });
    }

    // --- build overlay pieces that look exactly like the page ---
    function collect(layer) {
        const boxes = [], small = [], words = [];
        const all = document.body.querySelectorAll('*');

        for (const el of all) {
            if (el.closest(SKIP) || el.closest('svg') !== null && el.tagName.toLowerCase() !== 'svg') continue;
            const tag = el.tagName.toLowerCase();
            if (tag === 'canvas' || tag === 'video' || tag === 'br') continue;
            const r = el.getBoundingClientRect();
            const clip = clipOf(el.parentElement);
            const v = visibleRect(r, clip);
            if (!v || !isShown(el)) continue;
            const cs = getComputedStyle(el);

            if (tag === 'img') {
                if (el.complete && el.naturalWidth) small.push(...imagePieces(el, r, v, cs));
                continue;
            }
            if (tag === 'svg' || (tag === 'i' && /\bfa/.test(el.className))) {
                const c = el.cloneNode(true);
                c.style.cssText = `color:${cs.color};fill:${cs.fill};font-size:${cs.fontSize};line-height:${r.height}px;opacity:${cs.opacity};display:block;overflow:visible;text-align:center;`;
                small.push(place(c, r.left, r.top, r.width, r.height));
                continue;
            }

            const textClip = cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text';
            const bg = alpha(cs.backgroundColor) > 0 || (cs.backgroundImage !== 'none' && !textClip);
            const border = ['Top', 'Right', 'Bottom', 'Left'].some(s => parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== 'none' && alpha(cs[`border${s}Color`]) > 0);
            const shadow = cs.boxShadow !== 'none';
            if (!bg && !border && !shadow) continue;

            const d = document.createElement('div');
            d.style.backgroundColor = cs.backgroundColor;
            if (!textClip) {
                d.style.backgroundImage = cs.backgroundImage;
                d.style.backgroundSize = cs.backgroundSize;
                d.style.backgroundPosition = cs.backgroundPosition;
                d.style.backgroundRepeat = cs.backgroundRepeat;
            }
            for (const s of ['Top', 'Right', 'Bottom', 'Left']) d.style[`border${s}`] = `${cs[`border${s}Width`]} ${cs[`border${s}Style`]} ${cs[`border${s}Color`]}`;
            d.style.borderRadius = cs.borderRadius;
            d.style.boxShadow = cs.boxShadow;
            d.style.opacity = cs.opacity;
            const big = (v.r - v.l) * (v.b - v.t) > innerWidth * innerHeight * 0.35;
            const node = place(d, r.left, r.top, r.width, r.height);
            if (!big && v.r - v.l > 110 && v.b - v.t > 70) {
                for (const sh of shatter(node, r, v, 150, shadow ? 30 : 0)) boxes.push({ node: sh, big });
            } else {
                boxes.push({ node, big });
            }
        }

        // words, via Range rects so the real layout is untouched
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const range = document.createRange();
        const styleCache = new Map();
        for (let n = walker.nextNode(); n && words.length < MAX_WORDS; n = walker.nextNode()) {
            const p = n.parentElement;
            if (!p || !n.data.trim() || p.closest(SKIP) || p.closest('svg') || !isShown(p)) continue;
            const clip = clipOf(p);
            if (!clip) continue;
            let st = styleCache.get(p);
            if (!st) {
                const cs = getComputedStyle(p);
                const textClip = cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text';
                st = `font-family:${cs.fontFamily};font-size:${cs.fontSize};font-weight:${cs.fontWeight};font-style:${cs.fontStyle};` +
                    `letter-spacing:${cs.letterSpacing};text-transform:${cs.textTransform};text-shadow:${cs.textShadow};opacity:${cs.opacity};` +
                    (textClip ? `background-image:${cs.backgroundImage};-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;`
                              : `color:${cs.color};-webkit-text-fill-color:${cs.webkitTextFillColor || cs.color};`);
                styleCache.set(p, st);
            }
            for (const m of n.data.matchAll(/\S+/g)) {
                range.setStart(n, m.index);
                range.setEnd(n, m.index + m[0].length);
                const r = range.getClientRects()[0];
                if (!r || !visibleRect(r, clip)) continue;
                const s = document.createElement('span');
                s.textContent = m[0];
                s.style.cssText = st + `line-height:${r.height}px;`;
                words.push(place(s, r.left, r.top, r.width + 2, r.height));
                if (words.length >= MAX_WORDS) break;
            }
        }

        for (const b of boxes) layer.appendChild(b.node);
        for (const s of small) layer.appendChild(s);
        for (const w of words) layer.appendChild(w);
        return { boxes, small, words };
    }

    function imagePieces(img, r, v, cs) {
        const src = img.currentSrc || img.src;
        const nw = img.naturalWidth, nh = img.naturalHeight;
        let bw = r.width, bh = r.height, ox = 0, oy = 0;
        if (cs.objectFit === 'cover' || cs.objectFit === 'contain') {
            const s = cs.objectFit === 'cover' ? Math.max(r.width / nw, r.height / nh) : Math.min(r.width / nw, r.height / nh);
            bw = nw * s; bh = nh * s; ox = (r.width - bw) / 2; oy = (r.height - bh) / 2;
        }
        const mk = (x, y, w, h) => {
            const d = document.createElement('div');
            Object.assign(d.style, {
                backgroundImage: `url("${src}")`, backgroundRepeat: 'no-repeat',
                backgroundSize: `${bw}px ${bh}px`, backgroundPosition: `${r.left + ox - x}px ${r.top + oy - y}px`, opacity: cs.opacity
            });
            return place(d, x, y, w, h);
        };
        const d = mk(r.left, r.top, r.width, r.height);
        d.style.borderRadius = cs.borderRadius;
        return shatter(d, r, v, 90);
    }

    // --- motion: tremble, crumble under gravity, spiral into the hole ---
    function absorb(node, hx, hy, delay, dur, fall = 1) {
        const [x, y] = centerOf(node);
        const dx = hx - x, dy = hy - y, dist = Math.hypot(dx, dy) || 1;
        const px = -dy / dist, py = dx / dist, swirl = dist * rand(0.18, 0.4);
        const fx = rand(-30, 30), fy = rand(25, 110) * fall, r1 = rand(-40, 40), r2 = r1 + rand(180, 520) * (Math.random() < 0.5 ? -1 : 1);
        return node.animate([
            { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 },
            { transform: `translate(${rand(-4, 4)}px,${rand(-3, 3)}px) rotate(${rand(-5, 5)}deg) scale(1)`, offset: 0.12 },
            { transform: `translate(${fx}px,${fy}px) rotate(${r1}deg) scale(0.97)`, offset: 0.38, easing: 'cubic-bezier(.5,0,.85,.4)' },
            { transform: `translate(${fx + dx * 0.55 + px * swirl}px,${fy + dy * 0.55 + py * swirl}px) rotate(${r2 * 0.6}deg) scale(0.6)`, offset: 0.78, easing: 'cubic-bezier(.6,0,1,.7)' },
            { transform: `translate(${dx}px,${dy}px) rotate(${r2}deg) scale(0.02)`, opacity: 0 }
        ], { duration: dur, delay, fill: 'forwards' });
    }

    // glitch black hole: black core, white photon ring, a flickering disk of neon streaks and a band across the middle
    function glitchHole(host, R = 95) {
        const PAL = ['#ffff00', '#00e5ff', '#ff2bd6', '#1a2cff', '#ff2020', '#39ff14', '#ffffff', '#8a2be2', '#ff8c00'];
        const W = R * 4.4, H = R * 3.1, dpr = Math.min(2, devicePixelRatio || 1);
        const cv = document.createElement('canvas');
        cv.width = W * dpr; cv.height = H * dpr;
        Object.assign(cv.style, { width: `${W}px`, height: `${H}px` });
        host.appendChild(cv);
        const g = cv.getContext('2d');
        g.scale(dpr, dpr);
        const cx = W / 2, cy = H / 2;
        let alive = true, last = 0;
        const pick = () => PAL[(Math.random() * PAL.length) | 0];

        const streak = (x, y, w, h, c) => {
            g.fillStyle = c;
            g.fillRect(x, y, w, h);
            if (Math.random() < 0.25) {          // scan-line texture inside some blocks
                g.fillStyle = 'rgba(0,0,0,0.55)';
                for (let yy = y + 1; yy < y + h; yy += 3) g.fillRect(x, yy, w, 1);
            }
        };

        const frame = t => {
            if (!alive) return;
            requestAnimationFrame(frame);
            if (t - last < 70) return;       // ~14 fps: glitchy, not smooth
            last = t;
            g.clearRect(0, 0, W, H);
            g.globalAlpha = 1;
            // accretion disk: streaks packed in a ring that bulges left and right
            for (let k = 0; k < 560; k++) {
                const th = Math.random() * Math.PI * 2, c2 = Math.cos(th) ** 2;
                const rho = R * (1.0 + Math.random() ** 2.2 * (0.3 + 0.5 * c2));
                const x = cx + Math.cos(th) * rho * (1 + 0.38 * c2 * c2), y = cy + Math.sin(th) * rho * (1.02 - 0.1 * c2);
                const near = rho < R * 1.18;
                const w = rand(6, (near ? 34 : 20) + 44 * c2), h = near ? rand(4, 14) : rand(2, 7);
                streak(x - w / 2, y - h / 2, w, h, pick());
            }
            // far equatorial spikes
            for (let k = 0; k < 24; k++) {
                const side = Math.random() < 0.5 ? -1 : 1, x = cx + side * R * rand(1.3, 2.15), y = cy + rand(-0.12, 0.12) * R;
                streak(x - 20, y, rand(10, 40), rand(2, 7), Math.random() < 0.4 ? '#ffffff' : pick());
            }
            // core and photon ring
            g.fillStyle = '#000';
            g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
            g.strokeStyle = '#fff'; g.lineWidth = Math.max(2.5, R * 0.04);
            g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
            // the band that crosses in front of the hole
            for (let k = 0; k < 80; k++) {
                const x = cx + rand(-1.35, 1.2) * R, y = cy + rand(-0.16, 0.06) * R;
                streak(x, y, rand(10, 58), rand(5, 18), Math.random() < 0.1 ? '#000' : pick());
            }
            // horizontal tearing
            const tears = Math.random() < 0.55 ? (1 + Math.random() * 4) | 0 : 0;
            for (let k = 0; k < tears; k++) {
                const y = rand(0, H - 20), h = rand(3, 22), dx = rand(-28, 28);
                g.drawImage(cv, 0, y * dpr, W * dpr, h * dpr, dx, y, W, h);
            }
        };
        requestAnimationFrame(frame);
        return () => { alive = false; };
    }

    // glitch 404 screen: RGB-split digits, flickering bars and scanlines
    function show404(root) {
        const el = document.createElement('div');
        el.className = 'bh-404';
        el.innerHTML = '<div class="e-top">Error!</div><div class="e-num" data-text="404">404</div><div class="e-bot">Page not found</div>';
        root.appendChild(el);
        const num = el.querySelector('.e-num');
        const bars = [];
        for (let i = 0; i < 22; i++) {
            const b = document.createElement('div');
            b.className = 'bar' + (i % 6 === 0 ? ' g' : i % 6 === 1 ? ' p' : i % 3 === 0 ? ' k' : '');
            el.appendChild(b);
            bars.push(b);
        }
        const tick = () => {
            const r = num.getBoundingClientRect();
            for (const b of bars) {
                const w = rand(20, r.width * 0.28);
                Object.assign(b.style, { left: `${rand(r.left - 40, r.right - w + 40)}px`, top: `${rand(r.top + 10, r.bottom - 10)}px`, width: `${w}px`, opacity: Math.random() < 0.8 ? 1 : 0 });
            }
            num.style.transform = Math.random() < 0.3 ? `translateX(${rand(-8, 8)}px) skewX(${rand(-4, 4)}deg)` : '';
        };
        tick();
        const timer = setInterval(tick, 110);
        el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 0.2, offset: 0.2 }, { opacity: 1, offset: 0.35 }, { opacity: 0.5, offset: 0.45 }, { opacity: 1 }],
            { duration: 700, fill: 'forwards', easing: 'steps(1)' });
        return { el, stop: () => clearInterval(timer) };
    }

    async function run() {
        if (running) return;
        running = true;
        const failsafe = setTimeout(restart, 16000);
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

        // close the menu first so the page itself is what gets eaten
        const header = document.querySelector('.js-header');
        const menuBtn = document.querySelector('.js-menu');
        document.querySelectorAll('.nav-bg-video--preview').forEach(v => v.pause());
        header?.classList.remove('is-active');
        menuBtn?.classList.remove('is-active');
        document.body.style.overflow = 'hidden';
        await wait(650);

        const style = document.createElement('style');
        style.textContent = CSS;
        document.head.appendChild(style);
        const root = document.createElement('div');
        root.className = 'bh-root';
        root.innerHTML = '<div class="bh-dark"></div><div class="bh-layer"></div><div class="bh-hole"></div><div class="bh-flash"></div>';
        const [dark, layer, hole, flash] = root.children;
        const stopHole = glitchHole(hole);

        const pieces = reduced ? { boxes: [], small: [], words: [] } : collect(layer);
        document.body.appendChild(root);
        document.documentElement.classList.add('bh-hide');

        const hx = innerWidth / 2, hy = innerHeight * 0.18;
        const maxD = Math.hypot(innerWidth, innerHeight);
        const lag = n => {
            const [x, y] = centerOf(n);
            return Math.hypot(hx - x, hy - y) / maxD;
        };

        // the hole opens and the ground shakes
        hole.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.15)', offset: 0.7 }, { transform: 'scale(1)' }], { duration: 1100, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
        dark.animate([{ opacity: 0 }, { opacity: 0.55 }], { duration: 2500, fill: 'forwards' });
        layer.animate(Array.from({ length: 14 }, (_, i) => ({ transform: `translate(${rand(-1, 1) * i * 0.5}px,${rand(-1, 1) * i * 0.5}px)` })), { duration: 1100, fill: 'none' });
        await wait(reduced ? 600 : 700);

        const anims = [];
        for (const n of [...pieces.words, ...pieces.small]) anims.push(absorb(n, hx, hy, lag(n) * 2200 + rand(0, 450), rand(1700, 2500)));
        for (const b of pieces.boxes) {
            const base = b.big ? 2300 : 900;
            anims.push(absorb(b.node, hx, hy, base + lag(b.node) * 1800 + rand(0, 400), rand(1900, 2600), b.big ? 0.3 : 0.8));
        }
        document.querySelectorAll(BACKGROUND_LAYERS).forEach(el => {
            el.style.transformOrigin = `${hx}px ${hy}px`;
            anims.push(el.animate([{ transform: 'scale(1) rotate(0deg)', opacity: 1 }, { transform: 'scale(0) rotate(220deg)', opacity: 0 }],
                { duration: 2400, delay: 2600, easing: 'cubic-bezier(.6,0,1,.6)', fill: 'forwards' }));
        });
        hole.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.45)' }], { duration: 4200, delay: 400, easing: 'ease-in', fill: 'forwards' });
        dark.animate([{ opacity: 0.55 }, { opacity: 1 }], { duration: 3800, delay: 1400, fill: 'forwards' });

        await Promise.race([Promise.all(anims.map(a => a.finished)), wait(7500)]);

        // the hole swallows itself, then the page is simply gone: 404
        await wait(300);
        hole.animate([{ transform: 'scale(1.45)' }, { transform: 'scale(1.75)', offset: 0.35 }, { transform: 'scale(0)' }], { duration: 700, easing: 'cubic-bezier(.7,0,1,.4)', fill: 'forwards' });
        await wait(650);
        flash.animate([{ transform: 'scale(0)', opacity: 1 }, { transform: 'scale(40)', opacity: 0.9, offset: 0.3 }, { transform: 'scale(80)', opacity: 0 }], { duration: 900, easing: 'ease-out', fill: 'forwards' });
        await wait(700);
        stopHole();
        const err = show404(root);
        await wait(3200);
        err.el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0.3, transform: 'translateX(-14px) skewX(8deg)', offset: 0.3 }, { opacity: 1, transform: 'translateX(10px)', offset: 0.5 }, { opacity: 0, transform: 'scaleY(0.02)' }],
            { duration: 550, easing: 'steps(1)', fill: 'forwards' });
        await wait(600);
        err.stop();
        clearTimeout(failsafe);
        restart();
    }

    function restart() {
        try { history.scrollRestoration = 'manual'; } catch (e) {}
        window.scrollTo(0, 0);
        location.replace(location.pathname + location.search);
    }

    let running = false;
    trigger.addEventListener('click', run);
})();
