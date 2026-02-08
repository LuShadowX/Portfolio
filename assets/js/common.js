/* FILE: assets/js/common.js */

document.addEventListener('DOMContentLoaded', () => {
    
    // 0. ANIME LOADER LOGIC (Liquid Fill Fix)
    const loader = document.getElementById('tbhx-loader');
    const fillLayer = document.querySelector('.layer-fill'); // Targets the filling layer
    const loadingPercent = document.querySelector('.loading-percent');
    const progressBar = document.querySelector('.progress-bar');
    const logoWrapper = document.querySelector('.logo-wrapper');

    if (loader && fillLayer) {
        let count = 0;
        const totalDuration = 3500; // 3.5 seconds
        const intervalTime = 30;
        const increment = 100 / (totalDuration / intervalTime);

        const loadingInterval = setInterval(() => {
            count += increment;
            
            if (count >= 100) {
                count = 100;
                clearInterval(loadingInterval);
                
                // Final State
                if(loadingPercent) loadingPercent.textContent = "100%";
                if(progressBar) progressBar.style.width = "100%";
                
                // Ensure Fill is complete (Show fully)
                fillLayer.style.clipPath = `inset(0 0 0 0)`;
                
                // Phase 2: Red Strip
                logoWrapper.classList.add('phase-2'); 
                
                // Phase 3: Glitch
                setTimeout(() => {
                    logoWrapper.classList.add('glitching');
                }, 600);

                // Phase 4: Reveal Website
                setTimeout(() => {
                    document.body.classList.add('loaded');
                }, 1600);
            } else {
                // Update text & bar
                const currentPercent = Math.floor(count);
                if(loadingPercent) loadingPercent.textContent = `${currentPercent}%`;
                if(progressBar) progressBar.style.width = `${count}%`;
                
                // *** LIQUID FILL LOGIC ***
                // We clip the TOP of the fill layer. 
                // 100% inset = fully hidden (clipped). 0% inset = fully visible.
                // As count goes 0->100, clip goes 100->0.
                const clipValue = 100 - count;
                fillLayer.style.clipPath = `inset(${clipValue}% 0 0 0)`;
            }
        }, intervalTime);
    }

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

    const overlayLinks = document.querySelectorAll('.nav-link-overlay');
    overlayLinks.forEach(link => {
        link.addEventListener('click', () => {
            menuBtn.classList.remove('is-active');
            header.classList.remove('is-active');
            body.style.overflow = '';
        });
    });

    // 2. THEME TOGGLE
    const toggleBtn = document.getElementById('theme-toggle');
    const sunIcon = document.querySelector('.theme-icon.sun');
    const moonIcon = document.querySelector('.theme-icon.moon');

    if(toggleBtn) {
        const currentTheme = localStorage.getItem('theme');
        if (currentTheme === 'dark') {
            body.setAttribute('data-theme', 'dark');
            if(sunIcon) sunIcon.style.display = 'none';
            if(moonIcon) moonIcon.style.display = 'block';
        }

        toggleBtn.addEventListener('click', () => {
            if (body.getAttribute('data-theme') === 'dark') {
                body.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                if(sunIcon) sunIcon.style.display = 'block';
                if(moonIcon) moonIcon.style.display = 'none';
            } else {
                body.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                if(sunIcon) sunIcon.style.display = 'none';
                if(moonIcon) moonIcon.style.display = 'block';
            }
        });
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