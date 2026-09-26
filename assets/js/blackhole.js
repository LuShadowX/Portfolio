/* FILE: assets/js/blackhole.js */
/* Click the X in LuShadowX: the page crumbles into a black hole, says goodbye, then restarts. */

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
    .bh-dark { position: absolute; inset: 0; background: radial-gradient(circle at 50% 16vh, #000 0, #050208 45%, #000 100%); opacity: 0; }
    .bh-layer { position: absolute; inset: 0; overflow: visible; }
    .bh-piece { position: absolute; margin: 0; box-sizing: border-box; white-space: pre; will-change: transform, opacity; transform-origin: 50% 50%; }
    .bh-hole { position: absolute; left: 50%; top: 16vh; width: 190px; height: 190px; margin: -95px 0 0 -95px; border-radius: 50%; transform: scale(0); z-index: 3; }
    .bh-hole::before { content: ''; position: absolute; inset: -55%; border-radius: 50%;
        background: conic-gradient(from 0deg, transparent 0 8%, #ff9a3c 14%, #ff3d6e 24%, transparent 34%, #7b2ff7 46%, #ffcf6b 58%, transparent 70%, #ff5a36 82%, transparent 92%);
        -webkit-mask: radial-gradient(circle, transparent 34%, #000 38%, #000 52%, transparent 70%); mask: radial-gradient(circle, transparent 34%, #000 38%, #000 52%, transparent 70%);
        filter: blur(6px); animation: bh-spin 1.1s linear infinite; }
    .bh-hole::after { content: ''; position: absolute; inset: -2px; border-radius: 50%; background: #000;
        box-shadow: 0 0 0 3px rgba(255, 190, 120, 0.9), 0 0 28px 10px rgba(255, 120, 50, 0.75), 0 0 90px 30px rgba(123, 47, 247, 0.45), inset 0 0 30px rgba(255, 140, 60, 0.5); }
    .bh-lens { position: absolute; inset: -140%; border-radius: 50%; background: radial-gradient(circle, rgba(0,0,0,0) 30%, rgba(255,140,60,0.08) 42%, rgba(0,0,0,0) 60%); animation: bh-pulse 1.6s ease-in-out infinite; }
    .bh-bye { position: absolute; left: 0; right: 0; top: 56vh; display: flex; justify-content: center; gap: 0.08em; z-index: 4;
        font-family: 'Oswald', sans-serif; font-weight: 900; font-size: clamp(3rem, 11vw, 9rem); letter-spacing: 0.12em; color: #fff;
        text-shadow: 0 0 18px rgba(255, 40, 40, 0.9), 0 0 60px rgba(255, 0, 0, 0.6); }
    .bh-bye span { display: inline-block; opacity: 0; }
    .bh-flash { position: absolute; left: 50%; top: 16vh; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; background: #fff; opacity: 0; z-index: 5;
        box-shadow: 0 0 60px 30px #fff, 0 0 200px 90px rgba(255, 180, 120, 0.8); }
    @keyframes bh-spin { to { transform: rotate(360deg); } }
    @keyframes bh-pulse { 50% { transform: scale(1.08); opacity: 0.6; } }
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
        root.innerHTML = '<div class="bh-dark"></div><div class="bh-layer"></div><div class="bh-hole"><div class="bh-lens"></div></div><div class="bh-bye"></div><div class="bh-flash"></div>';
        const [dark, layer, hole, bye, flash] = root.children;

        const pieces = reduced ? { boxes: [], small: [], words: [] } : collect(layer);
        document.body.appendChild(root);
        document.documentElement.classList.add('bh-hide');

        const hx = innerWidth / 2, hy = innerHeight * 0.16;
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

        // goodbye rises out of the hole
        const letters = [...'GOODBYE'].map(ch => { const s = document.createElement('span'); s.textContent = ch; bye.appendChild(s); return s; });
        letters.forEach((s, i) => {
            const r = s.getBoundingClientRect();
            const dx = hx - (r.left + r.width / 2), dy = hy - (r.top + r.height / 2);
            s.animate([
                { transform: `translate(${dx}px,${dy}px) scale(0) rotate(${rand(-180, 180)}deg)`, opacity: 0 },
                { transform: 'translate(0,0) scale(1.15) rotate(0deg)', opacity: 1, offset: 0.75 },
                { transform: 'translate(0,0) scale(1)', opacity: 1 }
            ], { duration: 700, delay: i * 90, easing: 'cubic-bezier(.2,.9,.3,1.2)', fill: 'forwards' });
        });
        await wait(700 + letters.length * 90 + 900);

        // and falls back in; the hole collapses
        letters.forEach((s, i) => {
            const r = s.getBoundingClientRect();
            const dx = hx - (r.left + r.width / 2), dy = hy - (r.top + r.height / 2);
            s.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(0) rotate(${rand(-360, 360)}deg)`, opacity: 0 }],
                { duration: 650, delay: (letters.length - i) * 50, easing: 'cubic-bezier(.6,0,1,.5)', fill: 'forwards' });
        });
        await wait(900);
        hole.animate([{ transform: 'scale(1.45)' }, { transform: 'scale(1.7)', offset: 0.35 }, { transform: 'scale(0)' }], { duration: 700, easing: 'cubic-bezier(.7,0,1,.4)', fill: 'forwards' });
        await wait(650);
        flash.animate([{ transform: 'scale(0)', opacity: 1 }, { transform: 'scale(40)', opacity: 0.9, offset: 0.3 }, { transform: 'scale(80)', opacity: 0 }], { duration: 900, easing: 'ease-out', fill: 'forwards' });
        await wait(1000);
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
