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
            if (header.classList.contains('is-active')) {
                body.style.overflow = 'hidden';
            } else {
                body.style.overflow = '';
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
    const revealItems = document.querySelectorAll('.about-page [data-reveal], .skills-orbit-page [data-orbit-reveal]');
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
                    target.scrollIntoView({ behavior: 'smooth' });
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