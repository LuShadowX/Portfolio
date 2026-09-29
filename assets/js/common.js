/* FILE: assets/js/common.js */

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. MENU LOGIC
    const menuBtn = document.querySelector('.js-menu');
    const header = document.querySelector('.js-header');
    const body = document.body;

    if(menuBtn) {
        menuBtn.addEventListener('click', () => {
            menuBtn.classList.toggle('is-active');
            header.classList.toggle('is-active');
            const menuVideo = header.querySelector('.nav-bg-video--main');
            if (header.classList.contains('is-active')) {
                body.style.overflow = 'hidden';
                menuVideo?.play().catch(() => {});
            } else {
                body.style.overflow = '';
                menuVideo?.pause();
            }
        });
    }

    // Hover previews: play the hovered link's video behind the menu, with a progress bar
    const nav = document.querySelector('.header__nav');
    const previewBar = document.querySelector('.preview-bar');
    let activeVideo = null;

    const trackProgress = () => {
        if (!activeVideo) return;
        if (activeVideo.duration) {
            previewBar.style.setProperty('--p', activeVideo.currentTime / activeVideo.duration);
        }
        requestAnimationFrame(trackProgress);
    };

    document.querySelectorAll('.nav-link-overlay[data-preview]').forEach(link => {
        const video = document.querySelector(`.nav-bg-video--preview[data-preview="${link.dataset.preview}"]`);
        if (!nav || !video) return;
        video.addEventListener('playing', () => { if (video === activeVideo) nav.classList.add('is-playing'); });
        video.addEventListener('waiting', () => nav.classList.remove('is-playing'));

        link.addEventListener('mouseenter', () => {
            activeVideo = video;
            nav.dataset.preview = link.dataset.preview;
            previewBar.style.setProperty('--p', 0);
            video.currentTime = 0;
            video.play().catch(() => {});
            requestAnimationFrame(trackProgress);
        });
        link.addEventListener('mouseleave', () => {
            activeVideo = null;
            delete nav.dataset.preview;
            nav.classList.remove('is-playing');
            video.pause();
        });
    });

    // SPECIAL: dim the other links and point an arrow at the LuShadowX X
    const specialLink = document.querySelector('.nav-link-special');
    const specialArrow = document.querySelector('.special-arrow');
    const brandX = document.querySelector('.brand-x');

    const aimArrow = () => {
        if (!nav || !specialArrow || !brandX) return;
        const navBox = nav.getBoundingClientRect();
        const from = specialLink.getBoundingClientRect();
        const to = brandX.getBoundingClientRect();
        const tx = to.left + to.width / 2 - navBox.left;
        const ty = to.top + to.height / 2 - navBox.top;
        const fx = from.right - navBox.left;
        const fy = from.top + from.height / 2 - navBox.top;
        const angle = Math.atan2(ty - fy, tx - fx);
        // Arrow tip sits a little short of the X, rotated around the tip
        const gap = to.width / 2 + 30;
        const w = parseFloat(getComputedStyle(specialArrow).width) || 170;
        const h = w * 110 / 200;
        specialArrow.style.setProperty('--ax', `${tx - Math.cos(angle) * gap - w}px`);
        specialArrow.style.setProperty('--ay', `${ty - Math.sin(angle) * gap - h / 2}px`);
        specialArrow.style.setProperty('--ar', `${angle * 180 / Math.PI}deg`);
    };

    const endSpecial = () => nav && nav.classList.remove('is-special');

    if (specialLink) {
        specialLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            aimArrow();
            nav.classList.toggle('is-special');
        });
        window.addEventListener('resize', aimArrow);
        if (menuBtn) menuBtn.addEventListener('click', endSpecial);
    }

    const overlayLinks = document.querySelectorAll('.nav-link-overlay:not(.nav-link-special)');
    overlayLinks.forEach(link => {
        link.addEventListener('click', () => {
            menuBtn.classList.remove('is-active');
            header.classList.remove('is-active');
            body.style.overflow = '';
        });
    });

    // 2. BACKGROUND X: follows the mouse a little
    const bgLayer = document.querySelector('.p-stc');
    if (bgLayer) {
        window.addEventListener('mousemove', (e) => {
            const moveX = (e.clientX - innerWidth / 2) / (innerWidth / 2);
            const moveY = (e.clientY - innerHeight / 2) / (innerHeight / 2);
            bgLayer.style.transform = `translate(${moveX * 30}px, ${moveY * 30}px)`;
        });
        document.addEventListener('mouseleave', () => { bgLayer.style.transform = 'translate(0px, 0px)'; });
    }

    // Intro stage: hide the top bar while it is on screen, and let the paper cutouts tilt and drag
    const stage = document.querySelector('.stage');
    if (stage) {
        new IntersectionObserver(([entry]) => {
            body.classList.toggle('at-intro', entry.intersectionRatio > 0.35);
        }, { threshold: [0, 0.35, 1] }).observe(stage);

        // Clock animation: 154 frames (13 x 12 sheet) at the source's 20 fps, timed by the display clock
        const clip = stage.querySelector('.signal-clip');
        if (clip) {
            // A drawn first frame shows until the sheet arrives, then playback starts from frame 0
            const FRAMES = 154, COLS = 13, ROWS = 12, FPS = 20;
            let start = null, last = -1;
            const tick = (now) => {
                if (start === null) start = now;
                const frame = Math.floor((now - start) / 1000 * FPS) % FRAMES;
                if (frame !== last && body.classList.contains('at-intro')) {
                    last = frame;
                    clip.style.backgroundPosition = `${(frame % COLS) * 100 / (COLS - 1)}% ${Math.floor(frame / COLS) * 100 / (ROWS - 1)}%`;
                }
                requestAnimationFrame(tick);
            };
            const sheet = new Image();
            sheet.onload = () => { clip.classList.add('is-ready'); requestAnimationFrame(tick); };
            sheet.src = 'assets/images/clock-sprite.webp?v=2';
        }

        stage.querySelectorAll('.cutout').forEach(cutout => {
            let drag = null;
            let offsetX = 0, offsetY = 0;
            // Pointer updates are batched to one per frame so the tilt never queues up behind the cursor
            let pending = null;
            const apply = () => {
                const e = pending; pending = null;
                const box = cutout.getBoundingClientRect();
                const px = (e.clientX - box.left) / box.width - 0.5;
                const py = (e.clientY - box.top) / box.height - 0.5;
                cutout.style.setProperty('--tilt-x', `${(py * -12).toFixed(2)}deg`);
                cutout.style.setProperty('--tilt-y', `${(px * 12).toFixed(2)}deg`);
                if (!drag) return;
                offsetX = drag.x + e.clientX - drag.startX;
                offsetY = drag.y + e.clientY - drag.startY;
                cutout.style.translate = `${offsetX}px ${offsetY}px`;
            };
            cutout.addEventListener('pointermove', (e) => {
                if (!pending) requestAnimationFrame(apply);
                pending = e;
            });
            cutout.addEventListener('pointerleave', () => {
                if (drag) return;
                cutout.style.setProperty('--tilt-x', '0deg');
                cutout.style.setProperty('--tilt-y', '0deg');
            });
            cutout.addEventListener('pointerdown', (e) => {
                drag = { startX: e.clientX, startY: e.clientY, x: offsetX, y: offsetY };
                cutout.setPointerCapture(e.pointerId);
                cutout.classList.add('is-grabbed');
            });
            const release = () => { drag = null; cutout.classList.remove('is-grabbed'); };
            cutout.addEventListener('pointerup', release);
            cutout.addEventListener('pointercancel', release);
        });
    }

    // Contact form: no backend, so hand the message to the visitor's email app
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = new FormData(contactForm);
            const subject = `Portfolio message from ${data.get('user_name')}`;
            const bodyText = `${data.get('message')}\n\n${data.get('user_name')} <${data.get('user_email')}>`;
            window.location.href = `mailto:${contactForm.dataset.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
            contactForm.querySelector('[role="status"]').textContent = 'Opening your email app...';
        });
        // The menu button turns dark while a light section (About, Contact) sits under it
        const underMenu = new Set();
        const lightWatch = new IntersectionObserver((entries) => {
            entries.forEach(entry => entry.isIntersecting ? underMenu.add(entry.target) : underMenu.delete(entry.target));
            body.classList.toggle('on-light', underMenu.size > 0);
        }, { rootMargin: '-40px 0px -90% 0px' });
        document.querySelectorAll('.contact-section, .about-page').forEach(el => lightWatch.observe(el));
    }

    // About + Skills in Orbit: reveal on scroll, the "Skills" hand-off, and the particle globe
    document.documentElement.classList.add('motion-ready');
    const revealItems = document.querySelectorAll('.about-page [data-reveal], .skills-orbit-page [data-orbit-reveal], .projects-page [data-project-reveal]');
    const revealer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            revealer.unobserve(entry.target);
        });
    }, { threshold: 0.12 });
    revealItems.forEach(el => revealer.observe(el));

    const transferClone = document.querySelector('.skills-transfer-clone');
    const handoffSource = document.querySelector('.skills-handoff-source');
    const handoffTarget = document.querySelector('.skills-handoff-target');
    const aboutPage = document.querySelector('.about-page');
    const orbitPage = document.querySelector('.skills-orbit-page');
    if (transferClone && handoffSource && handoffTarget && aboutPage && orbitPage) {
        const root = document.documentElement;
        const noMotion = matchMedia('(prefers-reduced-motion: reduce), (max-width: 74rem)');
        let path = null;
        const pageTop = el => el.getBoundingClientRect().top + scrollY;
        const measure = () => {
            // Measure without the hand-off hiding either word
            delete root.dataset.skillsTransfer;
            const from = handoffSource.getBoundingClientRect();
            const to = handoffTarget.getBoundingClientRect();
            path = {
                start: pageTop(aboutPage), end: pageTop(orbitPage),
                sourceX: from.left, sourceY: from.top + scrollY, targetX: to.left, targetY: to.top + scrollY,
                sourceSize: parseFloat(getComputedStyle(handoffSource).fontSize),
                targetSize: parseFloat(getComputedStyle(handoffTarget).fontSize)
            };
            update();
        };
        const update = () => {
            const y = scrollY;
            if (!path || noMotion.matches || y < path.start || y >= path.end) { delete root.dataset.skillsTransfer; return; }
            const t = (y - path.start) / Math.max(path.end - path.start, 1);
            const k = t * t * (3 - 2 * t);
            const x = path.sourceX + (path.targetX - path.sourceX) * k;
            const top = path.sourceY + (path.targetY - path.sourceY) * k;
            const size = path.sourceSize + (path.targetSize - path.sourceSize) * k;
            transferClone.style.setProperty('--transfer-x', `${x.toFixed(1)}px`);
            transferClone.style.setProperty('--transfer-y', `${(top - y).toFixed(1)}px`);
            transferClone.style.setProperty('--transfer-size', `${size.toFixed(2)}px`);
            transferClone.style.setProperty('--transfer-turn', `${(-2.4 + 2.4 * k).toFixed(3)}deg`);
            transferClone.dataset.phase = k > 0.58 ? 'dark' : 'paper';
            root.dataset.skillsTransfer = 'active';
        };
        let ticking = false;
        addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => { ticking = false; update(); });
        }, { passive: true });
        addEventListener('resize', measure, { passive: true });
        addEventListener('load', measure);
        new ResizeObserver(measure).observe(document.body);
        measure();
    }

    const sphere = document.querySelector('.particle-sphere-canvas');
    if (sphere) {
        const colors = ['#3159c7', '#e8e2d4', '#4b70dc', '#c95d43', '#879fe8'];
        const fibonacci = n => {
            const step = Math.PI * (3 - Math.sqrt(5));
            return Array.from({ length: n }, (_, i) => {
                const y = 1 - i / (n - 1) * 2, r = Math.sqrt(1 - y * y), a = step * i;
                return { x: Math.cos(a) * r, y, z: Math.sin(a) * r, color: colors[i % colors.length] };
            });
        };
        const small = fibonacci(320), large = fibonacci(560);
        const ctx = sphere.getContext('2d');
        const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
        let raf = 0, visible = false, last = 0, w = 0, h = 0, points = large;
        const draw = (now = 0) => {
            if (!still && now - last < 32) { raf = requestAnimationFrame(draw); return; }
            last = now;
            ctx.clearRect(0, 0, w, h);
            const turn = still ? -0.18 : 75e-6 * now, cos = Math.cos(turn), sin = Math.sin(turn);
            const radius = 0.405 * Math.min(w, h), cx = w / 2, cy = 0.51 * h;
            for (const p of points) {
                const x = p.x * cos - p.z * sin, z = p.x * sin + p.z * cos;
                const scale = 1.95 / (2.65 - 0.42 * z), depth = (z + 1) / 2;
                ctx.globalAlpha = 0.18 + 0.78 * depth;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(cx + x * radius * scale, cy + p.y * radius * scale, 0.45 + 1.35 * depth, 0, 2 * Math.PI);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            if (!still && visible) raf = requestAnimationFrame(draw);
        };
        const size = () => {
            cancelAnimationFrame(raf);
            const box = sphere.getBoundingClientRect(), ratio = Math.min(devicePixelRatio || 1, 1.35);
            w = Math.max(box.width, 1); h = Math.max(box.height, 1);
            points = innerWidth < 768 ? small : large;
            sphere.width = Math.round(w * ratio); sphere.height = Math.round(h * ratio);
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            if (still) draw(); else if (visible) raf = requestAnimationFrame(draw);
        };
        size();
        new ResizeObserver(size).observe(sphere);
        new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            cancelAnimationFrame(raf);
            if (visible) raf = requestAnimationFrame(draw);
        }, { rootMargin: '12% 0%' }).observe(sphere);
    }

    // Projects + Open Source: ASCII previews, tap-to-reveal and the case-study dialog
    const projectData = JSON.parse(document.getElementById('project-data')?.textContent || '{}');
    const drawAscii = (holder) => {
        const canvas = holder.querySelector('canvas');
        const source = holder.querySelector('.ascii-source-image');
        let image = null, raf = 0;
        const render = () => {
            if (!image?.naturalWidth) return;
            const box = holder.getBoundingClientRect();
            if (!box.width || !box.height) return;
            const ratio = Math.min(devicePixelRatio || 1, 1.35);
            canvas.width = Math.round(box.width * ratio); canvas.height = Math.round(box.height * ratio);
            canvas.style.width = `${box.width}px`; canvas.style.height = `${box.height}px`;
            const ctx = canvas.getContext('2d');
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            ctx.fillStyle = '#080a09'; ctx.fillRect(0, 0, box.width, box.height);
            const cols = Math.max(72, Math.min(innerWidth < 768 ? 110 : 160, Math.round(box.width / 5.3)));
            const rows = Math.max(32, Math.round(cols * (image.naturalHeight / image.naturalWidth) * 0.44));
            const sample = document.createElement('canvas'); sample.width = cols; sample.height = rows;
            const sx = sample.getContext('2d', { willReadFrequently: true });
            sx.drawImage(image, 0, 0, cols, rows);
            const px = sx.getImageData(0, 0, cols, rows).data;
            const ramp = "   ..'',:;irsXA253hMHGS#9B&@";
            const cw = box.width / cols, ch = box.height / rows, size = Math.min(ch * 1.02, cw * 1.62);
            const lum = Array.from({ length: cols * rows }, (_, i) => (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255);
            const sorted = [...lum].sort((x, y) => x - y);
            const lo = sorted[Math.floor(0.04 * sorted.length)] ?? 0;
            const span = Math.max((sorted[Math.floor(0.96 * sorted.length)] ?? 1) - lo, 0.08);
            const v = lum.map(x => Math.max(0, Math.min(1, (x - lo) / span)));
            ctx.font = `400 ${size}px "Courier New", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
                const i = y * cols + x, a = px[i * 4 + 3] / 255, c = v[i];
                const around = [x > 0 ? v[i - 1] : c, x < cols - 1 ? v[i + 1] : c, y > 0 ? v[i - cols] : c, y < rows - 1 ? v[i + cols] : c];
                const n = Math.max(0, Math.min(1, c + (c - around.reduce((p, q) => p + q, 0) / 4) * 0.72));
                const chr = ramp[Math.min(ramp.length - 1, Math.floor(n * ramp.length))];
                if (chr === ' ') continue;
                const g = Math.round(132 + 118 * n);
                ctx.fillStyle = `rgba(${g}, ${Math.max(0, g - 4)}, ${Math.max(0, g - 10)}, ${(0.22 + 0.78 * n) * a})`;
                ctx.fillText(chr, (x + 0.5) * cw, (y + 0.5) * ch);
            }
        };
        const queue = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(render); };
        const load = () => { if (image) return; image = new Image(); image.decoding = 'async'; image.addEventListener('load', queue, { once: true }); image.src = source.getAttribute('src'); };
        new ResizeObserver(queue).observe(holder);
        const seen = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { load(); seen.disconnect(); } }, { rootMargin: '35% 0px' });
        seen.observe(holder);
    };
    document.querySelectorAll('.ascii-preview').forEach(drawAscii);

    const touchy = matchMedia('(hover: none), (pointer: coarse), (max-width: 64rem)');
    let revealed = null, openList = null, openIndex = 0, returnFocus = null, savedScroll = 0;
    const backdrop = document.createElement('div');
    backdrop.className = 'project-dialog-backdrop';
    backdrop.setAttribute('role', 'presentation');
    backdrop.hidden = true;
    document.body.appendChild(backdrop);
    const escapeHtml = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const renderDialog = () => {
        const list = projectData[openList], f = list[openIndex];
        const prev = list[(openIndex - 1 + list.length) % list.length], next = list[(openIndex + 1) % list.length];
        backdrop.innerHTML = `<section class="project-dialog" id="project-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="project-dialog-title" style="--dialog-accent:#c9c5bc;--dialog-ratio:8 / 5">
            <header class="project-dialog-header"><span>${{ oss: 'REPOSITORY', notes: 'FIELD NOTE' }[openList] || 'CASE STUDY'} ${f.id} / ${String(list.length).padStart(2, '0')}</span><p>${escapeHtml(f.stamp)}</p><button class="project-dialog-close" type="button" aria-label="Close project details">CLOSE <span aria-hidden="true">×</span></button></header>
            <div class="project-dialog-body">
                <div class="project-dialog-media-panel"><div class="project-dialog-visual" aria-live="polite"><img src="${f.image}" alt="${escapeHtml(f.name)}" draggable="false"><span>FEATURED</span></div></div>
                <div class="project-dialog-copy">
                    <div class="project-dialog-title-block"><p>${escapeHtml(f.type)}</p><h3 id="project-dialog-title">${escapeHtml(f.name)}</h3><span>${escapeHtml(f.stamp)}</span></div>
                    <dl>${f.sections.map(([t, body]) => `<div><dt>${t}</dt><dd>${body}</dd></div>`).join('')}</dl>
                    <ul aria-label="${escapeHtml(f.name)} technologies">${f.tools.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
                    <div class="project-dialog-links">${f.links.map(l => `<a href="${escapeHtml(l.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label)} <span aria-hidden="true">↗</span></a>`).join('')}</div>
                </div>
            </div>
            <nav class="project-dialog-pagination" aria-label="Browse case studies">
                <button type="button" data-step="-1"><span>PREVIOUS / ${prev.id}</span><b>${escapeHtml(prev.name)}</b></button>
                <button type="button" data-step="1"><span>NEXT / ${next.id}</span><b>${escapeHtml(next.name)}</b></button>
            </nav></section>`;
        backdrop.querySelector('.project-dialog-close').focus();
    };
    const closeDialog = () => {
        if (backdrop.hidden) return;
        backdrop.hidden = true; backdrop.innerHTML = '';
        document.documentElement.classList.remove('project-dialog-open');
        Object.assign(body.style, { position: '', top: '', width: '', overflow: '' });
        scrollTo(0, savedScroll);
        returnFocus?.focus({ preventScroll: true });
    };
    const openDialog = (kind, index) => {
        openList = kind; openIndex = index; returnFocus = document.activeElement; savedScroll = scrollY;
        Object.assign(body.style, { position: 'fixed', top: `-${savedScroll}px`, width: '100%', overflow: 'hidden' });
        document.documentElement.classList.add('project-dialog-open');
        backdrop.hidden = false;
        renderDialog();
    };
    const step = (d) => { const list = projectData[openList]; openIndex = (openIndex + d + list.length) % list.length; renderDialog(); };
    backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) closeDialog(); });
    backdrop.addEventListener('click', (e) => {
        if (e.target.closest('.project-dialog-close')) closeDialog();
        const nav = e.target.closest('[data-step]');
        if (nav) step(Number(nav.dataset.step));
    });
    addEventListener('keydown', (e) => {
        if (backdrop.hidden) return;
        if (e.key === 'Escape') closeDialog();
        else if (e.key === 'ArrowLeft') step(-1);
        else if (e.key === 'ArrowRight') step(1);
    });
    document.querySelectorAll('.ascii-project-card').forEach(card => {
        card.addEventListener('click', () => {
            if (touchy.matches && revealed !== card) {
                revealed?.classList.remove('is-touch-revealed');
                revealed = card; card.classList.add('is-touch-revealed');
                card.querySelector('.ascii-instruction-touch').textContent = 'TAP AGAIN TO OPEN';
                return;
            }
            revealed?.classList.remove('is-touch-revealed'); revealed = null;
            openDialog(card.dataset.kind, Number(card.dataset.index));
        });
    });

    // Scroll progress rail: ticks at each section's start, marker follows the scroll
    const rail = document.querySelector('.scroll-progress-rail');
    if (rail) {
        const marker = rail.querySelector('.scroll-progress-marker');
        const sections = [...document.querySelectorAll('main.hero, body > section')];
        let travel = 0;
        const layout = () => {
            const max = Math.max(document.documentElement.scrollHeight - innerHeight, 1);
            rail.querySelectorAll('.scroll-progress-page').forEach(t => t.remove());
            sections.forEach(sec => {
                const tick = document.createElement('i');
                tick.className = 'scroll-progress-page';
                tick.style.left = `${Math.min(1, (sec.getBoundingClientRect().top + scrollY) / max) * 100}%`;
                rail.appendChild(tick);
            });
            travel = Math.max(rail.clientWidth - marker.offsetWidth, 0);
            move();
        };
        const move = () => {
            const max = Math.max(document.documentElement.scrollHeight - innerHeight, 1);
            marker.style.setProperty('--scroll-progress-x', `${(Math.min(1, scrollY / max) * travel).toFixed(1)}px`);
        };
        let queued = false;
        addEventListener('scroll', () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; move(); }); }, { passive: true });
        addEventListener('resize', layout, { passive: true });
        addEventListener('load', layout);
        new ResizeObserver(layout).observe(document.body);
        layout();
    }

    // GitHub contribution graph (last 12 months)
    const graph = document.getElementById('gh-graph');
    if (graph) {
        // Click the heatmap to dim it and bring the art forward; click again to go back
        const graphCard = graph.closest('.gh-graph-card');
        if (graphCard) graphCard.addEventListener('click', () => graphCard.classList.toggle('is-art'));
        const user = graph.dataset.user;
        fetch(`https://github-contributions-api.jogruber.de/v4/${user}?y=last`)
            .then(r => r.json())
            .then(data => {
                const days = data.contributions;
                const cell = 11, gap = 3, step = cell + gap, left = 32, top = 20;
                const offset = new Date(days[0].date + 'T00:00:00').getDay();
                const weeks = Math.ceil((days.length + offset) / 7);
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                let out = '';
                let lastMonth = -1;
                days.forEach((d, i) => {
                    const date = new Date(d.date + 'T00:00:00');
                    const col = Math.floor((i + offset) / 7), row = (i + offset) % 7;
                    if (row === 0 && date.getMonth() !== lastMonth && date.getDate() <= 7 && col < weeks - 2) {
                        lastMonth = date.getMonth();
                        out += `<text class="gh-graph__label" x="${left + col * step}" y="12">${months[lastMonth]}</text>`;
                    }
                    const label = `${d.count} contribution${d.count === 1 ? '' : 's'} on ${date.toDateString().slice(4)}`;
                    out += `<rect class="gh-cell gh-cell--${d.level}" x="${left + col * step}" y="${top + row * step}" width="${cell}" height="${cell}" rx="2"><title>${label}</title></rect>`;
                });
                ['Mon', 'Wed', 'Fri'].forEach((name, i) => {
                    out += `<text class="gh-graph__label" x="0" y="${top + (i * 2 + 1) * step + cell - 2}">${name}</text>`;
                });
                graph.innerHTML = `<svg viewBox="0 0 ${left + weeks * step} ${top + 7 * step}" role="img" aria-label="GitHub contributions in the last year">${out}</svg>`;
                const total = document.getElementById('gh-total');
                if (total) total.textContent = `${data.total.lastYear} contributions in the last year`;
            })
            .catch(() => { graph.closest('.gh-activity').classList.add('gh-activity--offline'); });
    }

    // 3. TYPEWRITER EFFECT
    const textElement = document.getElementById('typing-text');
    if(textElement) {
        const phrases = [
            "I build machine learning models.",
            "I develop python applications.",
            "I design data visualizations.",
            "I solve complex problems."
        ];
        let phraseIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let typeSpeed = 100;

        function type() {
            if (!textElement) return;
            const currentPhrase = phrases[phraseIndex];
            if (isDeleting) {
                textElement.textContent = currentPhrase.substring(0, charIndex - 1);
                charIndex--;
                typeSpeed = 50; 
            } else {
                textElement.textContent = currentPhrase.substring(0, charIndex + 1);
                charIndex++;
                typeSpeed = 100; 
            }
            if (!isDeleting && charIndex === currentPhrase.length) {
                isDeleting = true; typeSpeed = 2000; 
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false; phraseIndex = (phraseIndex + 1) % phrases.length; typeSpeed = 500; 
            }
            setTimeout(type, typeSpeed);
        }
        type();
    }

    // 4. SMOOTH SCROLLING
    const allLinks = document.querySelectorAll('a[href^="#"]');
    allLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            if(href.length > 1) {
                const target = document.querySelector(href);
                if(target) {
                    if (window.lenis) window.lenis.scrollTo(target); else target.scrollIntoView({ behavior: 'smooth' });
                    if(menuBtn) menuBtn.classList.remove('is-active');
                    if(header) header.classList.remove('is-active');
                    body.style.overflow = '';
                }
            }
        });
    });

    // 5. NAVBAR SCROLL
    const topBar = document.querySelector('.top-bar');
    if(topBar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                topBar.classList.add('scrolled');
            } else {
                topBar.classList.remove('scrolled');
            }
        });
    }

    // 6. SCROLL ANIMATIONS
    const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { root: null, threshold: 0.15, rootMargin: "0px" });
    revealElements.forEach(el => revealObserver.observe(el));

    // 7. CERTIFICATE CAROUSEL
    const track = document.querySelector('.carousel-track');
    if (track) {
        const slides = Array.from(track.children);
        const nextBtn = document.querySelector('.next-btn');
        const prevBtn = document.querySelector('.prev-btn');
        let slideIndex = 0;
        let autoSlideInterval;

        const moveToSlide = (index) => {
            if (index < 0) index = slides.length - 1;
            if (index >= slides.length) index = 0;
            slideIndex = index;
            const amountToMove = -100 * index;
            track.style.transform = `translateX(${amountToMove}%)`;
        };

        if(nextBtn) nextBtn.addEventListener('click', () => { moveToSlide(slideIndex + 1); resetAutoSlide(); });
        if(prevBtn) prevBtn.addEventListener('click', () => { moveToSlide(slideIndex - 1); resetAutoSlide(); });

        const startAutoSlide = () => { autoSlideInterval = setInterval(() => { moveToSlide(slideIndex + 1); }, 3500); };
        const resetAutoSlide = () => { clearInterval(autoSlideInterval); startAutoSlide(); };

        const carouselContainer = document.querySelector('.carousel-container');
        if(carouselContainer) {
            carouselContainer.addEventListener('mouseenter', () => clearInterval(autoSlideInterval));
            carouselContainer.addEventListener('mouseleave', startAutoSlide);
        }
        startAutoSlide();
    }
});

/* Hover cursor (from waleedahmed.site): spring-follows the mouse, grows into a glowing circle over clickable things */
(() => {
    if (matchMedia('(hover: none), (pointer: coarse)').matches) return;
    const ring = document.createElement('div');
    ring.className = 'cursor-ring';
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring);
    const TARGETS = 'a, button, [role="button"], [data-cursor-hover], .js-menu, .cutout, .gh-graph-card, label, summary, select';
    const root = document.documentElement;
    // Same spring as the reference: stiffness 1400, damping 40, mass 0.12
    const K = 1400, C = 40, M = 0.12;
    let tx = -100, ty = -100, x = -100, y = -100, vx = 0, vy = 0, last = 0, raf = 0, hovering = false;
    const step = (now) => {
        let dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
        while (dt > 0) {
            const h = Math.min(dt, 0.002); dt -= h;
            vx += ((K * (tx - x) - C * vx) / M) * h; vy += ((K * (ty - y) - C * vy) / M) * h;
            x += vx * h; y += vy * h;
        }
        ring.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
        if (Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(vx) + Math.abs(vy) > 0.05) raf = requestAnimationFrame(step);
        else { raf = 0; last = 0; }
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
    const setHover = (on) => {
        if (on === hovering) return;
        hovering = on;
        ring.classList.toggle('is-hover', on);
        root.classList.toggle('cursor-hovering', on);
    };
    addEventListener('mousemove', (e) => {
        tx = e.clientX; ty = e.clientY;
        if (x === -100 && y === -100) { x = tx; y = ty; }
        const t = e.target instanceof Element ? e.target.closest(TARGETS) : null;
        setHover(!!t && !t.matches(':disabled'));
        kick();
    }, { passive: true });
    document.addEventListener('mouseleave', () => setHover(false));
    addEventListener('blur', () => setHover(false));
    addEventListener('mousedown', () => ring.classList.add('is-down'));
    addEventListener('mouseup', () => ring.classList.remove('is-down'));
})();

/* Cursor trail (from gmmohit.com): a thin line that follows the pointer and fades out towards its tail */
(() => {
    if (matchMedia('(hover: none), (pointer: coarse)').matches) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'cursor-trail';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const N = 20, pts = Array.from({ length: N }, () => ({ x: 0, y: 0 }));
    let mx = 0, my = 0, hx = 0, hy = 0, started = false, raf = 0;
    const size = () => {
        const d = devicePixelRatio || 1;
        canvas.width = innerWidth * d; canvas.height = innerHeight * d;
        ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    size();
    addEventListener('resize', size);
    const draw = () => {
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        hx += (mx - hx) * 0.3; hy += (my - hy) * 0.3;
        pts[0].x = hx; pts[0].y = hy;
        for (let i = 1; i < N; i++) { pts[i].x += (pts[i - 1].x - pts[i].x) * 0.4; pts[i].y += (pts[i - 1].y - pts[i].y) * 0.4; }
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let i = 1; i < N - 1; i++) {
            const a = pts[i - 1], b = pts[i], c = pts[i + 1], r = Math.pow(1 - i / N, 1.2);
            ctx.beginPath();
            if (i === 1) ctx.moveTo(a.x, a.y); else ctx.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2);
            ctx.quadraticCurveTo(b.x, b.y, (b.x + c.x) / 2, (b.y + c.y) / 2);
            ctx.lineWidth = 1.5 * r;
            ctx.strokeStyle = `rgba(255, 255, 255, ${r})`;
            ctx.stroke();
        }
        const tail = pts[N - 1];
        if (Math.abs(tail.x - mx) + Math.abs(tail.y - my) > 0.1) raf = requestAnimationFrame(draw);
        else { raf = 0; ctx.clearRect(0, 0, innerWidth, innerHeight); }
    };
    addEventListener('mousemove', (e) => {
        mx = e.clientX; my = e.clientY;
        if (!started) { started = true; hx = mx; hy = my; pts.forEach(p => { p.x = mx; p.y = my; }); }
        if (!raf) raf = requestAnimationFrame(draw);
    }, { passive: true });
})();

/* Contact: rotating ASCII tesseract (from gmmohit.com) that scatters across the section when the pointer comes close */
(() => {
    const section = document.getElementById('contact');
    const lead = section?.querySelector('.contact-heading > p');
    const heading = section?.querySelector('.contact-heading h2');
    if (!section || !lead || !heading) return;
    const pre = document.createElement('pre');
    pre.className = 'contact-tesseract';
    pre.setAttribute('aria-hidden', 'true');
    section.prepend(pre);

    const V = []; for (let e = 0; e < 16; e++) V.push([e & 1 ? 1 : -1, e & 2 ? 1 : -1, e & 4 ? 1 : -1, e & 8 ? 1 : -1]);
    const E = []; for (let a = 0; a < 16; a++) for (let b = a + 1; b < 16; b++) { const x = a ^ b; if ((x & (x - 1)) === 0) E.push([a, b]); }
    const PER = 30, COUNT = PER * E.length, RAMP = ' .,-~:;=!*#$@';
    let cols = 0, rows = 0, stride = 0, cw = 6, ch = 10, cx = 0, cy = 0, sc = 1;
    const layout = () => {
        const cs = getComputedStyle(pre);
        const probe = document.createElement('canvas').getContext('2d');
        probe.font = `${cs.fontSize} ${cs.fontFamily}`;
        const fs = parseFloat(cs.fontSize) || 9;
        cw = (probe.measureText('M').width || fs * 0.6) + (parseFloat(cs.letterSpacing) || 0);
        ch = parseFloat(cs.lineHeight) || fs * 1.1;
        const oldC = cols, oldR = rows;
        cols = Math.max(32, Math.ceil(section.clientWidth / cw) + 2);
        rows = Math.max(16, Math.ceil(section.clientHeight / ch) + 2);
        if (cols * rows > 90000) { const k = Math.sqrt(90000 / (cols * rows)); cols = Math.floor(cols * k); rows = Math.floor(rows * k); }
        stride = cols + 1;
        // Centre of the shape: under the small intro line (wide screens), or beside it (single column)
        const s = section.getBoundingClientRect(), p = lead.getBoundingClientRect(), h = heading.getBoundingClientRect();
        const twoCol = h.left - p.left > p.width * 0.8;
        // At scale 1 the shape spans about 56 columns by 28 rows; shrink it to fit the free space
        const boxW = twoCol ? h.left - p.left - 40 : s.width * 0.5;
        const boxH = twoCol ? h.bottom - p.bottom - 24 : p.height + 60;
        sc = Math.max(0.45, Math.min(1.25, boxW / (58 * cw), boxH / (30 * ch)));
        const px = twoCol ? p.left + boxW / 2 : s.left + s.width * 0.74;
        const py = twoCol ? p.bottom + 12 + boxH / 2 : p.top + p.height / 2 + 20;
        cx = (px - s.left) / cw; cy = (py - s.top) / ch;
        return oldC && (oldC !== cols || oldR !== rows);
    };
    layout();
    const P = Array.from({ length: COUNT }, () => ({ x: cx, y: cy, vx: 0, vy: 0, tx: 0, ty: 0, c: '@', seed: Math.random() }));
    let a1 = 0, a2 = 0, a3 = 0, mx = -1e4, my = -1e4, wasHot = false, raf = 0, running = false, touchTimer = 0;
    const toCells = (e) => { const r = section.getBoundingClientRect(); mx = (e.clientX - r.left) / cw; my = (e.clientY - r.top) / ch; };
    section.addEventListener('mousemove', toCells, { passive: true });
    section.addEventListener('mouseleave', () => { mx = my = -1e4; });
    section.addEventListener('touchstart', () => { mx = cx; my = cy; clearTimeout(touchTimer); touchTimer = setTimeout(() => { mx = my = -1e4; }, 2500); }, { passive: true });
    const frame = () => {
        a1 += 0.003; a2 += 0.005; a3 += 0.0015;
        const c1 = Math.cos(a1), s1 = Math.sin(a1), c2 = Math.cos(a2), s2 = Math.sin(a2), c3 = Math.cos(a3), s3 = Math.sin(a3);
        const proj = V.map(([x, y, z, w]) => {
            let t = x * c1 - w * s1; w = x * s1 + w * c1; x = t;
            t = y * c2 - w * s2; w = y * s2 + w * c2; y = t;
            t = x * c3 - y * s3; y = x * s3 + y * c3; x = t;
            const f = 1 / (3 - w);
            return [x * f, y * f, z * f];
        });
        let k = 0;
        for (const [a, b] of E) {
            const A = proj[a], B = proj[b];
            for (let i = 0; i < PER; i++) {
                const t = i / (PER - 1), x = A[0] + (B[0] - A[0]) * t, y = A[1] + (B[1] - A[1]) * t, z = A[2] + (B[2] - A[2]) * t;
                const p = P[k++];
                p.tx = Math.floor(cx + 40 * sc * x); p.ty = Math.floor(cy + 20 * sc * y);
                p.c = RAMP[Math.floor(Math.max(0, Math.min(1, (z + 1) / 2)) * (RAMP.length - 1))];
            }
        }
        const grid = new Array(rows * stride).fill(' ');
        for (let r = 0; r < rows; r++) grid[r * stride + cols] = '\n';
        const dx = mx - cx, dy = my - cy, hot = Math.sqrt(dx * dx + dy * dy) < 25 * Math.max(sc, 0.7), burst = hot && !wasHot;
        section.classList.toggle('tess-hot', hot);
        for (const p of P) {
            if (burst) {
                const ex = p.x - cx, ey = p.y - cy, n = Math.sqrt(ex * ex + ey * ey) || 1, sp = 0.4 + 0.8 * p.seed;
                p.vx = (ex / n * sp + (Math.random() - 0.5) * 0.5) * 3;
                p.vy = (ey / n * sp + (Math.random() - 0.5) * 0.5) * 0.6;
            }
            if (hot) { p.vx *= 0.98; p.vy *= 0.98; p.x += p.vx; p.y += p.vy; }
            else { p.vx = p.vy = 0; p.x += (p.tx - p.x) * 0.08; p.y += (p.ty - p.y) * 0.08; }
            const gx = Math.floor(p.x), gy = Math.floor(p.y);
            if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) grid[gy * stride + gx] = p.c;
        }
        wasHot = hot;
        pre.textContent = grid.join('');
        if (running) raf = requestAnimationFrame(frame);
    };
    new IntersectionObserver(([e]) => {
        if (e.isIntersecting === running) return;
        running = e.isIntersecting;
        if (running) raf = requestAnimationFrame(frame); else cancelAnimationFrame(raf);
    }, { rootMargin: '200px' }).observe(section);
    new ResizeObserver(() => { layout(); }).observe(section);
    document.fonts?.ready.then(layout);
})();

/* ==== PLC listing sections (projects / open source / field notes), behaviour ported from plcossette.com ==== */
(() => {
    const sections = [...document.querySelectorAll('.plc')];
    if (!sections.length) return;
    const DATA = JSON.parse(document.getElementById('plc-data')?.textContent || '{}');
    const root = document.documentElement, page = document.body;
    const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const clamp = v => Math.min(1, Math.max(0, v));
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Smooth scroll (Lenis, same lerp as the reference)
    let lenis = null;
    if (window.Lenis && !reduced) {
        lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
        window.lenis = lenis;
        const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
    }
    const lock = () => { lenis?.stop(); root.classList.add('pl-locked'); };
    const unlock = () => { root.classList.remove('pl-locked'); lenis?.start(); };

    // Fade the copy in the first time each section shows up
    const seen = new IntersectionObserver(entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-ready'); seen.unobserve(e.target); }
    }), { threshold: 0.08 });
    sections.forEach(s => seen.observe(s));

    // --progress: 0 when the element's top meets the viewport bottom, 1 when its bottom leaves the top
    const visuals = [...document.querySelectorAll('.plc [data-pl-progress]')].map(el => ({ el, box: el.parentElement }));
    const measure = ({ el, box }) => {
        const r = box.getBoundingClientRect();
        const top = r.top + (el.offsetTop - box.offsetTop);
        const vh = innerHeight;
        return clamp((vh - top) / (vh + el.offsetHeight));
    };
    // Timeline star: spring-follows how far the list has moved past the middle of the screen
    const timelines = sections.map(sec => {
        const tl = sec.querySelector('[data-pl-timeline]');
        return tl && { sec, wrap: sec.querySelector('.pl-listing_wrap'), star: tl.querySelector('.pl-timeline_star'), items: [...tl.querySelectorAll('.pl-timeline_item')], p: 0, v: 0, target: 0, raf: 0, last: 0 };
    }).filter(Boolean);
    const stepStar = (t, now) => {
        let dt = Math.min(0.05, (now - (t.last || now)) / 1000); t.last = now;
        while (dt > 0) { const h = Math.min(dt, 0.004); dt -= h; t.v += ((60 * (t.target - t.p) - 22 * t.v) / 0.5) * h; t.p += t.v * h; }
        t.star.style.setProperty('--star', `${(Math.min(1, Math.max(0, t.p)) * 100).toFixed(2)}%`);
        const y = t.star.getBoundingClientRect().top + 12;
        let active = 0;
        t.items.forEach((it, i) => { if (it.getBoundingClientRect().top - 6 <= y) active = i; });
        t.items.forEach((it, i) => it.classList.toggle('is-active', i === active));
        if (Math.abs(t.target - t.p) + Math.abs(t.v) > 0.0005) t.raf = requestAnimationFrame(n => stepStar(t, n));
        else { t.raf = 0; t.last = 0; }
    };
    const updateTimelines = () => {
        const mid = innerHeight / 2;
        for (const t of timelines) {
            const r = t.wrap.getBoundingClientRect();
            t.target = clamp((mid - r.top) / Math.max(r.height - mid, 1));
            if (!t.raf) t.raf = requestAnimationFrame(n => stepStar(t, n));
        }
    };

    let queued = false;
    const update = () => {
        updateTimelines();
        queued = false;
        const vh = innerHeight;
        for (const v of visuals) {
            const r = v.box.getBoundingClientRect();
            if (r.bottom < -vh || r.top > vh * 2) continue;
            v.el.style.setProperty('--progress', measure(v).toFixed(4));
        }
        let inside = false;
        for (const s of sections) { const r = s.getBoundingClientRect(); if (r.top <= 60 && r.bottom > 60) inside = true; }
        page.classList.toggle('in-plc', inside || detail.classList.contains('is-open'));
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue, { passive: true });
    lenis?.on('scroll', queue);

    // Detail view
    const detail = document.createElement('div');
    detail.className = 'pl-detail';
    detail.setAttribute('role', 'dialog');
    detail.setAttribute('aria-modal', 'true');
    detail.setAttribute('aria-label', 'Project details');
    detail.setAttribute('data-lenis-prevent', '');
    page.appendChild(detail);
    const ARROW_LEFT = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M14 8H2.5M6.5 4 2.5 8l4 4" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
    const GRID = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2h4.5v4.5H2zM9.5 2H14v4.5H9.5zM2 9.5h4.5V14H2zM9.5 9.5H14V14H9.5z" fill="none" stroke="currentColor" stroke-width="1"/></svg>';
    const BACK = { projects: 'Back to projects', oss: 'Back to open source', notes: 'Back to notes' };
    const image = (src, alt, cls = '', pos = '') => `<div class="pl-gallery_item_inner pl-wireframe" data-pl-dprogress><div class="pl-gallery_element"><div class="pl-image"><div class="pl-image_inner"><img class="pl-image_img ${cls}" src="${src}" alt="${esc(alt)}" decoding="async"${pos ? ` style="object-position:${pos}"` : ''}></div></div></div></div>`;
    const render = (kind, i) => {
        const f = DATA[kind][i];
        const blocks = f.blocks.map(([l, t]) => `<div class="pl-text_content"><div class="pl-text_content_label pl-label">${esc(l)}</div><div class="pl-text_content_inner pl-serif"><p>${t}</p></div></div>`).join('');
        const links = f.links.length ? `<div class="pl-project_links pl-text-label">${f.links.map(l => `<a href="${esc(l.href)}" target="_blank" rel="noopener noreferrer">${esc(l.label)} ↗</a>`).join('')}</div>` : '';
        detail.innerHTML = `<article class="pl-project">
            <h1 class="pl-project_title"><span class="pl-project_title_inner pl-h1">${esc(f.name)}</span></h1>
            <div class="pl-project_grid">
                <div class="pl-project_side"><div class="pl-project_sticky"><div class="pl-project_inner">
                    <div class="pl-project_header"><button type="button" class="pl-project_header_button" data-back><span class="pl-icon">${ARROW_LEFT}</span><span class="pl-text-label">${BACK[kind]}</span></button>
                        <button type="button" class="pl-modal-toggler" data-index-open><span class="pl-icon">${GRID}</span><span class="pl-modal-toggler_label pl-text-label">View Index</span></button></div>
                    <div class="pl-project_content"><div class="pl-project_content_scroll" data-lenis-prevent><div style="position:relative">
                        <div class="pl-tag pl-project_tag">${f.tags.map(t => `<span class="pl-tag_item">${esc(t)}</span>`).join('')}</div>
                        <div class="pl-text"><div class="pl-text_sticky"><h2 class="pl-label pl-text_title"><span>Info</span></h2></div><div class="pl-text_inner">${blocks}</div></div>
                        <div class="pl-project_info">
                            <div class="pl-project_context"><h3 class="pl-project_context_title pl-text-label">Context</h3><div class="pl-project_context_row"><p class="pl-serif">${esc(f.context)}</p><p class="pl-text-label">${esc(f.year)}</p></div></div>
                            <div class="pl-serif pl-project_credits"><p>${f.credits.map(([k, v]) => `${k} : ${v}`).join('<br>')}</p></div>${links}
                        </div></div></div></div>
                    <div class="pl-project_button"><a class="pl-button" href="${esc(f.button.href)}" target="_blank" rel="noopener noreferrer">${esc(f.button.label)}</a></div>
                </div></div></div>
                <div class="pl-gallery_wrap"><div class="pl-gallery">
                    <div class="pl-gallery_item">${image(f.image, f.name)}</div>
                    <div class="pl-gallery_item -dual"><div>${image(f.image, '', '', '18% 50%')}</div><div>${image(f.image, '', '-tall', '72% 50%')}</div></div>
                    <div class="pl-gallery_item">${image(f.image, '', '', '50% 100%')}</div>
                </div></div>
            </div></article>`;
        detail.scrollTop = 0;
        detailProgress();
    };
    const detailProgress = () => {
        const proj = detail.querySelector('.pl-project');
        if (!proj) return;
        const max = Math.max(detail.scrollHeight - detail.clientHeight, 1);
        proj.style.setProperty('--progress', clamp(detail.scrollTop / max).toFixed(4));
        const vh = innerHeight;
        detail.querySelectorAll('[data-pl-dprogress]').forEach(el => {
            const r = el.parentElement.getBoundingClientRect();
            el.style.setProperty('--progress', clamp((vh - r.top) / (vh + r.height)).toFixed(4));
        });
    };
    let dq = false;
    detail.addEventListener('scroll', () => { if (!dq) { dq = true; requestAnimationFrame(() => { dq = false; detailProgress(); }); } }, { passive: true });

    let current = null, busy = false, returnFocus = null;
    const play = async () => {
        await wait(300); detail.classList.add('is-rendering');
        await wait(400); detail.classList.add('is-ready');
    };
    const open = async (sec, kind, i) => {
        if (current || busy) return;
        busy = true; current = { sec, kind, i }; returnFocus = document.activeElement;
        sec.style.setProperty('--pl-shift', `${sec.clientWidth * 7 / 12}px`);
        lock();
        render(kind, i);
        detail.classList.add('is-open');
        sec.classList.add('is-leaving');
        update();
        await play();
        detail.querySelector('[data-back]')?.focus({ preventScroll: true });
        await wait(600);
        detail.classList.add('is-solid');
        sec.classList.remove('is-leaving');
        busy = false;
    };
    const swap = async (kind, i) => {
        if (!current || busy) return;
        busy = true;
        detail.classList.add('is-switching');
        detail.classList.remove('is-ready', 'is-rendering');
        await wait(600);
        current.i = i; render(kind, i);
        detail.classList.remove('is-switching');
        await play();
        busy = false;
    };
    const close = async () => {
        if (!current || busy) return;
        busy = true;
        const { sec } = current;
        const slide = sec.querySelector('.pl-slide');
        detail.style.setProperty('--pl-shift-back', sec.style.getPropertyValue('--pl-shift'));
        slide.style.transition = 'none';
        sec.classList.add('is-leaving');
        void slide.offsetWidth;
        slide.style.transition = '';
        detail.classList.remove('is-solid', 'is-ready', 'is-rendering');
        detail.classList.add('is-closing');
        await wait(20);
        sec.classList.remove('is-leaving');
        sec.classList.add('is-returning');
        await wait(1000);
        detail.classList.remove('is-open', 'is-closing');
        detail.innerHTML = '';
        sec.classList.remove('is-returning');
        current = null; busy = false;
        unlock(); update();
        returnFocus?.focus({ preventScroll: true });
    };

    // Index modal
    const modal = document.createElement('div');
    modal.className = 'pl-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Index');
    modal.setAttribute('data-lenis-prevent', '');
    page.appendChild(modal);
    let modalFrom = null;
    const openIndex = (kind, sec) => {
        modalFrom = { kind, sec };
        modal.innerHTML = `<button type="button" class="pl-modal_close" aria-label="Close index"><span class="pl-modal_close_inner"></span></button>
            <div class="pl-modal_inner"><ul class="pl-modal_list">${DATA[kind].map((f, i) => `<li class="pl-modal_item" style="--i:${i % 8}">
                <button type="button" class="pl-modal_thumbnail" data-pick="${i}"><div class="pl-modal_thumbnail_inner"><div class="pl-modal_thumbnail_visual_wrap"><div class="pl-modal_thumbnail_visual pl-wireframe"><img src="${f.image}" alt="" loading="lazy" decoding="async"></div><span class="pl-modal_hover"></span></div></div>
                <div class="pl-modal_thumbnail_info"><span class="pl-label">${esc(f.name)}</span></div></button></li>`).join('')}</ul></div>`;
        void modal.offsetWidth;
        modal.classList.add('is-open');
        (current ? detail : sec).classList.add('is-modal');
        lock();
        modal.querySelector('.pl-modal_close').focus({ preventScroll: true });
    };
    const closeIndex = () => {
        if (!modal.classList.contains('is-open')) return;
        modal.classList.remove('is-open');
        detail.classList.remove('is-modal');
        sections.forEach(s => s.classList.remove('is-modal'));
        if (!current) unlock();
    };
    modal.addEventListener('click', e => {
        if (e.target.closest('.pl-modal_close')) return closeIndex();
        const pick = e.target.closest('[data-pick]');
        if (!pick) { if (e.target === modal.querySelector('.pl-modal_inner')) closeIndex(); return; }
        const i = Number(pick.dataset.pick), { kind, sec } = modalFrom;
        closeIndex();
        if (current) { if (current.kind === kind && current.i === i) return; current.kind = kind; swap(kind, i); }
        else open(sec, kind, i);
    });

    sections.forEach(sec => {
        const kind = sec.dataset.plc;
        sec.addEventListener('click', e => {
            const link = e.target.closest('[data-open]');
            if (link) { e.preventDefault(); open(sec, kind, Number(link.dataset.open)); return; }
            if (e.target.closest('[data-index-open]')) openIndex(kind, sec);
        });
    });
    detail.addEventListener('click', e => {
        if (e.target.closest('[data-back]')) close();
        else if (e.target.closest('[data-index-open]') && current) openIndex(current.kind, current.sec);
    });
    addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        if (modal.classList.contains('is-open')) closeIndex();
        else if (current) close();
    });

    addEventListener('load', update);
    update();
})();
