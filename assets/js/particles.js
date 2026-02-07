/* FILE: assets/js/particles.js */

const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
const bgLayer = document.querySelector('.p-stc'); 

// CONFIGURATION
const config = {
    // ELECTRIC BLUE DOTS
    particleColor: 'rgba(40, 170, 255, 1)', 
    
    // NEON PURPLE LINES
    lineColor: '160, 50, 240',              
    
    startAmount: 100,      
    maxParticles: 220,     
    autoSpawnRate: 80,     
    
    defaultSpeed: 0.5,     
    variantSpeed: 0.8,     
    linkRadius: 150,       
    mouseRadius: 200,      
    parallaxStrength: 30 
};

let particles = [];
let w, h, dpr; // Added 'dpr' variable
let mouse = { x: null, y: null };
let center = { x: 0, y: 0 }; 

// --- THE HD/4K FIX ---
function resize() {
    // Get the screen's pixel density (1 for standard, 2+ for Retina/4K)
    dpr = window.devicePixelRatio || 1;
    
    // Set internal resolution (High Res)
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    
    // Set CSS display size (Standard Res)
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    
    // Scale the drawing context so drawing math stays simple
    ctx.scale(dpr, dpr);
    
    // Update logical width/height for calculations
    w = window.innerWidth;
    h = window.innerHeight;
    
    center.x = w / 2;
    center.y = h / 2;
}
window.addEventListener('resize', resize);
resize(); // Call immediately

// MOUSE TRACKING
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;

    let moveX = (mouse.x - center.x) / center.x;
    let moveY = (mouse.y - center.y) / center.y;

    if(bgLayer) {
        bgLayer.style.transform = `translate(${moveX * config.parallaxStrength}px, ${moveY * config.parallaxStrength}px)`;
    }
});

window.addEventListener('mouseout', () => {
    mouse.x = null;
    mouse.y = null;
    if(bgLayer) bgLayer.style.transform = `translate(0px, 0px)`;
});

// PARTICLE CLASS
class Particle {
    constructor(x, y) {
        this.x = x || Math.random() * w;
        this.y = y || Math.random() * h;
        
        this.vx = (Math.random() - 0.5) * config.variantSpeed + config.defaultSpeed * 0.5;
        this.vy = (Math.random() - 0.5) * config.variantSpeed + config.defaultSpeed * 0.5;
        
        this.size = Math.random() * 2 + 0.5;
        this.opacity = 0;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.x < 0 || this.x > w) this.vx *= -1;
        if (this.y < 0 || this.y > h) this.vy *= -1;
        
        if (this.opacity < 1) this.opacity += 0.02;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.globalAlpha = this.opacity; 
        ctx.fillStyle = config.particleColor;
        ctx.fill();
        ctx.globalAlpha = 1; 
    }
}

// INIT
function init() {
    particles = [];
    for (let i = 0; i < config.startAmount; i++) {
        particles.push(new Particle());
    }
}

// AUTO-SPAWNER
setInterval(() => {
    if (particles.length < config.maxParticles) {
        particles.push(new Particle()); 
    }
}, config.autoSpawnRate);


// ANIMATION LOOP
function animate() {
    // Clear using the logical dimensions
    ctx.clearRect(0, 0, w, h);
    
    for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        p.update();
        p.draw();

        // Particle Links
        for (let j = i + 1; j < particles.length; j++) {
            let p2 = particles[j];
            let dist = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);
            
            if (dist < config.linkRadius) {
                let opacity = (1 - (dist / config.linkRadius)) * p.opacity * p2.opacity;
                
                ctx.beginPath();
                ctx.strokeStyle = `rgba(${config.lineColor}, ${opacity})`;
                // Ultra-fine lines (0.4px) - they will look sharp now due to DPR scaling
                ctx.lineWidth = 0.4; 
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        }

        // Mouse Links
        if (mouse.x != null) {
            let mouseDist = Math.sqrt((p.x - mouse.x) ** 2 + (p.y - mouse.y) ** 2);
            if (mouseDist < config.mouseRadius) {
                let mouseOpacity = 1 - (mouseDist / config.mouseRadius);
                ctx.beginPath();
                ctx.strokeStyle = `rgba(${config.lineColor}, ${mouseOpacity})`;
                ctx.lineWidth = 0.6; // Slightly thicker for mouse
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.stroke();
            }
        }
    }
    requestAnimationFrame(animate);
}

// Click Burst
window.addEventListener('click', (e) => {
    for (let i = 0; i < 5; i++) {
        particles.push(new Particle(e.clientX, e.clientY));
    }
});

init();
animate();