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

        stage.querySelectorAll('.cutout').forEach(cutout => {
            let drag = null;
            let offsetX = 0, offsetY = 0;
            cutout.addEventListener('pointermove', (e) => {
                const box = cutout.getBoundingClientRect();
                const px = (e.clientX - box.left) / box.width - 0.5;
                const py = (e.clientY - box.top) / box.height - 0.5;
                cutout.style.setProperty('--tilt-x', `${py * -12}deg`);
                cutout.style.setProperty('--tilt-y', `${px * 12}deg`);
                if (!drag) return;
                offsetX = drag.x + e.clientX - drag.startX;
                offsetY = drag.y + e.clientY - drag.startY;
                cutout.style.translate = `${offsetX}px ${offsetY}px`;
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
        // The menu button sits over this light section once it reaches the top of the screen
        new IntersectionObserver(([entry]) => {
            body.classList.toggle('on-light', entry.isIntersecting);
        }, { rootMargin: '-40px 0px -90% 0px' }).observe(contactForm.closest('.contact-section'));
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