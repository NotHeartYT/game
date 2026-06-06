const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Fixed Internal coordinate space for physics stability
const VIRTUAL_WIDTH = 854;
const VIRTUAL_HEIGHT = 480;

canvas.width = VIRTUAL_WIDTH;
canvas.height = VIRTUAL_HEIGHT;

// --- DOM ELEMENTS ---
const hudWrapper = document.getElementById('hudWrapper');
const scoreVal = document.getElementById('scoreDisplay').querySelector('span:last-child');
const livesVal = document.getElementById('livesDisplay').querySelector('span:last-child');
const timerVal = document.getElementById('timerDisplay').querySelector('span:last-child');

const timerDisplay = document.getElementById('timerDisplay');
const livesDisplay = document.getElementById('livesDisplay');
const gameOverlay = document.getElementById('gameOverlay');
const pauseOverlay = document.getElementById('pauseOverlay');
const settingsOverlay = document.getElementById('settingsOverlay');
const guideOverlay = document.getElementById('guideOverlay');

const overlayMessage = document.getElementById('overlayMessage');
const overlaySubtext = document.getElementById('overlaySubtext');
const modeSelection = document.getElementById('modeSelection');
const tutorialGuide = document.getElementById('tutorialGuide');
const gameEndButtons = document.getElementById('gameEndButtons');

// Buttons
const livesModeButton = document.getElementById('livesModeButton');
const timedModeButton = document.getElementById('timedModeButton');
const pauseButton = document.getElementById('pauseButton');
const resumeButton = document.getElementById('resumeButton');
const quitMenuButton = document.getElementById('quitMenuButton');
const quitToMenuFromEnd = document.getElementById('quitToMenuFromEnd');
const settingsButton = document.getElementById('settingsButton');
const pauseSettingsButton = document.getElementById('pauseSettingsButton');
const backToMainButton = document.getElementById('backToMainButton');
const openGuideButton = document.getElementById('openGuideButton');
const closeGuideButton = document.getElementById('closeGuideButton');
const backFromGuideButton = document.getElementById('backFromGuideButton');

const resolutionSelect = document.getElementById('resolutionSelect');
const sfxToggle = document.getElementById('sfxToggle');

// --- GAME STATE ---
let score = 0;
let lives = 3;
const MAX_LIVES = 3;
let gameTimer = 60;
let gameRunning = false;
let isPaused = false;
let gameMode = 'lives';

let targets = [];
let particles = [];
let floatingTexts = [];

let spawnInterval = null;
let countdownInterval = null;
let animationFrameId = null;

let mouseX = VIRTUAL_WIDTH / 2;
let mouseY = VIRTUAL_HEIGHT / 2;

// --- MOBILE BALANCING VARIABLE ---
let isTouchMode = false;

// --- PHYSICS & POWERUPS ---
const BASE_GRAVITY = 0.08;
let currentGravity = BASE_GRAVITY;
let activeMultiplier = 1;
let isFrenzySpawning = false;
let powerUpTimers = { safetyNet: 0, cryo: 0, flame: 0, multiplier: 0, frenzy: 0 };

let settings = { displaySize: 'auto', sfxEnabled: true, crosshairColor: '#00ffff' };
let audioInitialized = false;
let shootSynth, hitSynth;

const resolutions = {
    '360x640': { width: 360, height: 640 },
    '390x844': { width: 390, height: 844 },
    '1920x1080': { width: 1920, height: 1080 },
    '2560x1080': { width: 2560, height: 1080 }
};

// --- AUDIO ---
async function tryInitAudio() {
    if (audioInitialized) return;
    try {
        await Tone.start();
        shootSynth = new Tone.MembraneSynth({ pitchDecay: 0.06, envelope: { attack: 0.001, decay: 0.2 } }).toDestination();
        hitSynth = new Tone.NoiseSynth({ envelope: { attack: 0.001, decay: 0.1 } }).toDestination();
        audioInitialized = true;
    } catch(e) {}
}

// --- CLASSES ---
class FloatingText {
    constructor(x, y, text, color) {
        this.x = x; this.y = y; this.text = text; this.color = color; this.life = 45;
    }
    update() { this.y -= 0.8; this.life--; }
    draw() {
        ctx.save(); ctx.globalAlpha = this.life / 45; ctx.fillStyle = this.color;
        ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
        ctx.shadowColor = 'black'; ctx.shadowBlur = 4;
        ctx.fillText(this.text, this.x, this.y); ctx.restore();
    }
}

class Target {
    constructor(forcedType = null) {
        this.radius = 24 + Math.random() * 8;
        this.x = Math.random() * (VIRTUAL_WIDTH - this.radius * 2) + this.radius;
        this.y = VIRTUAL_HEIGHT - 20;
        this.speedY = -(7.5 + Math.random() * 2.5);
        this.speedX = (Math.random() - 0.5) * 5;
        this.rotation = 0;
        this.spinSpeed = (Math.random() - 0.5) * 0.2;
        this.type = forcedType || this.rollType();
        this.setupVisuals();

        if (powerUpTimers.cryo > 0) {
            this.speedX *= 0.5;
            this.speedY *= 0.5;
        }
    }
    rollType() {
        const roll = Math.random() * 100;
        if (gameMode === 'lives') {
            if (roll < 8) return 'safetyNet';
            if (roll < 15) return 'cryo';
            if (roll < 20) return 'medic';
        } else {
            if (roll < 8) return 'multiplier';
            if (roll < 15) return 'flame';
            if (roll < 20) return 'frenzy';
        }
        return 'normal';
    }
    setupVisuals() {
        switch(this.type) {
            case 'medic': this.primaryColor = '#10b981'; this.accentColor = '#ffffff'; this.glowColor = '#34d399'; this.label = '✚'; break;
            case 'safetyNet': this.primaryColor = '#8b5cf6'; this.accentColor = '#ffffff'; this.glowColor = '#c084fc'; this.label = '☵'; break;
            case 'cryo': this.primaryColor = '#06b6d4'; this.accentColor = '#ffffff'; this.glowColor = '#22d3ee'; this.label = '❄'; break;
            case 'multiplier': this.primaryColor = '#f97316'; this.accentColor = '#ffffff'; this.glowColor = '#fb923c'; this.label = '2X'; break;
            case 'flame': this.primaryColor = '#ef4444'; this.accentColor = '#facc15'; this.glowColor = '#f87171'; this.label = '🔥'; break;
            case 'frenzy': this.primaryColor = '#eab308'; this.accentColor = '#ffffff'; this.glowColor = '#fde047'; this.label = '★'; break;
            default: this.primaryColor = '#ea580c'; this.accentColor = '#431407'; this.glowColor = 'orange'; this.label = '';
        }
    }
    update() {
        const slow = (powerUpTimers.cryo > 0) ? 0.5 : 1;
        this.x += this.speedX * slow;
        this.y += this.speedY * slow;
        this.rotation += this.spinSpeed * slow;
    }
    draw() {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rotation);
        ctx.shadowColor = this.glowColor; ctx.shadowBlur = 12;
        ctx.fillStyle = this.primaryColor; ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = this.accentColor; ctx.lineWidth = 3; ctx.stroke();
        if (this.label) {
            ctx.rotate(-this.rotation); ctx.fillStyle = 'white'; ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(this.label, 0, 0);
        }
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.vx = (Math.random()-0.5)*10; this.vy = (Math.random()-0.5)*10;
        this.life = 40; this.size = Math.random()*4+2; this.color = color;
    }
    update() { this.x += this.vx; this.y += this.vy; this.vy += currentGravity; this.life--; }
    draw() {
        ctx.save(); ctx.globalAlpha = this.life/40; ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI*2); ctx.fill(); ctx.restore();
    }
}

// --- ENGINE ---
function resizeCanvas() {
    const mode = settings.displaySize || 'auto';
    if (mode !== 'auto' && resolutions[mode]) {
        const r = resolutions[mode];
        canvas.style.aspectRatio = `${r.width} / ${r.height}`;
        canvas.style.width = (r.width > 1200) ? 'min(95vw, 1200px)' : '100%';
    } else {
        canvas.style.aspectRatio = '16 / 9';
        canvas.style.width = 'min(95vw, 1200px)';
    }
}

function refreshLivesDisplay() {
    livesVal.textContent = lives;
    livesVal.style.color = (lives >= MAX_LIVES) ? '#22c55e' : '#ffffff';
}

function spawnTarget(type = null) {
    if (gameRunning && !isPaused) targets.push(new Target(type));
}

function drawCrosshair() {
    ctx.save();
    let crosshairColor = settings.crosshairColor;
    if (powerUpTimers.flame > 0) crosshairColor = '#ef4444';

    ctx.strokeStyle = crosshairColor;
    ctx.shadowColor = crosshairColor;
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2;
    
    // Balanced Advantage: Visually adapt crosshair radius for touch screens
    const radius = isTouchMode ? 28 : 14;
    const lineOffsetInner = isTouchMode ? 16 : 8;
    const lineOffsetOuter = isTouchMode ? 44 : 26;

    ctx.beginPath();
    ctx.arc(mouseX, mouseY, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath(); ctx.moveTo(mouseX - lineOffsetOuter, mouseY); ctx.lineTo(mouseX - lineOffsetInner, mouseY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mouseX + lineOffsetOuter, mouseY); ctx.lineTo(mouseX + lineOffsetInner, mouseY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mouseX, mouseY - lineOffsetOuter); ctx.lineTo(mouseX, mouseY - lineOffsetInner); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mouseX, mouseY + lineOffsetOuter); ctx.lineTo(mouseX, mouseY + lineOffsetInner); ctx.stroke();

    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, isTouchMode ? 4 : 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function executeShot() {
    if (!gameRunning || isPaused) return;
    if (settings.sfxEnabled && shootSynth) shootSynth.triggerAttackRelease("G1", "8n");
    
    // Balanced Advantage: Mobile configuration adds +30px baseline hitbox buffer
    const touchHitboxRadius = isTouchMode ? 30 : 0;
    const blast = (powerUpTimers.flame > 0) ? 80 : 0;
    
    for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i]; const d = Math.hypot(mouseX - t.x, mouseY - t.y);
        if (d <= t.radius + blast + touchHitboxRadius) {
            if (settings.sfxEnabled && hitSynth) hitSynth.triggerAttack();
            applyPowerUp(t);
            for(let j=0; j<20; j++) particles.push(new Particle(t.x, t.y, t.primaryColor));
            targets.splice(i, 1);
            score += 10 * activeMultiplier;
            scoreVal.textContent = score;
            if (blast === 0) break;
        }
    }
}

function gameLoop() {
    if (!gameRunning || isPaused) return;

    for (let k in powerUpTimers) {
        if (powerUpTimers[k] > 0) {
            powerUpTimers[k]--;
            if (k === 'cryo' && powerUpTimers[k] === 0) currentGravity = BASE_GRAVITY;
            if (k === 'multiplier' && powerUpTimers[k] === 0) activeMultiplier = 1;
        }
    }

    ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    
    const g = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
    if (powerUpTimers.cryo > 0) { g.addColorStop(0, '#153243'); g.addColorStop(1, '#2a4454'); }
    else { g.addColorStop(0, '#0c1524'); g.addColorStop(1, '#1e293b'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    if (powerUpTimers.safetyNet > 0) {
        ctx.fillStyle = '#7c3aed'; ctx.fillRect(0, VIRTUAL_HEIGHT - 24, VIRTUAL_WIDTH, 4);
    }

    ctx.fillStyle = '#14532d'; ctx.fillRect(0, VIRTUAL_HEIGHT - 20, VIRTUAL_WIDTH, 20);

    for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i]; t.update(); t.draw();
        
        if (t.y > VIRTUAL_HEIGHT + 60 || t.x < -60 || t.x > VIRTUAL_WIDTH + 60) {
            targets.splice(i, 1);
            
            if (gameMode === 'lives' && t.type === 'normal') {
                if (powerUpTimers.safetyNet > 0) {
                    floatingTexts.push(new FloatingText(t.x, VIRTUAL_HEIGHT-30, "SAVED", "#a78bfa"));
                } else {
                    lives--; refreshLivesDisplay();
                    if (lives <= 0) gameOver();
                }
            }
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update(); particles[i].draw();
        if (particles[i].life <= 0) particles.splice(i, 1);
    }
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        floatingTexts[i].update(); floatingTexts[i].draw();
        if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
    }

    drawCrosshair();

    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- HANDLERS ---
function startGame(mode) {
    tryInitAudio();
    gameMode = mode; score = 0; lives = MAX_LIVES; gameTimer = 60;
    gameRunning = true; isPaused = false;
    targets = []; particles = []; floatingTexts = [];
    for (let k in powerUpTimers) powerUpTimers[k] = 0;
    
    scoreVal.textContent = "0"; refreshLivesDisplay();
    hudWrapper.classList.remove('hidden'); gameOverlay.classList.add('hidden');
    
    if (mode === 'timed') {
        timerDisplay.classList.remove('hidden'); livesDisplay.classList.add('hidden');
        countdownInterval = setInterval(() => {
            if (!isPaused) { gameTimer--; timerVal.textContent = gameTimer+"s"; if (gameTimer<=0) gameOver(); }
        }, 1000);
    } else {
        timerDisplay.classList.add('hidden'); livesDisplay.classList.remove('hidden');
    }

    spawnInterval = setInterval(() => {
        if (powerUpTimers.frenzy > 0 && !isFrenzySpawning) {
            isFrenzySpawning = true;
            let c = 0; let b = setInterval(() => { 
                spawnTarget('normal'); c++; if (c>=12) { clearInterval(b); isFrenzySpawning = false; }
            }, 200);
        } else { spawnTarget(); }
    }, 1100);

    animationFrameId = requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameRunning = false; 
    clearInterval(spawnInterval); 
    clearInterval(countdownInterval);
    
    hudWrapper.classList.add('hidden'); 
    gameOverlay.classList.remove('hidden');
    
    // Completely hide main screen menus
    modeSelection.classList.add('hidden'); 
    tutorialGuide.classList.add('hidden');
    overlaySubtext.classList.add('hidden');
    
    // Show the end game button clean and center
    gameEndButtons.classList.remove('hidden');
    overlayMessage.textContent = "FINAL SCORE: " + score;
}

function resetToMainMenu() {
    gameRunning = false;
    isPaused = false;
    clearInterval(spawnInterval);
    clearInterval(countdownInterval);
    cancelAnimationFrame(animationFrameId);

    // Completely clear out variables
    targets = [];
    particles = [];
    floatingTexts = [];

    // Reset Title Texts
    overlayMessage.textContent = "TRAP SHOOTING PRO";
    overlayMessage.className = "main-heading-text text-4xl md:text-5xl font-black tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-200";
    
    // Toggle Menu Panel displays back to pristine state
    gameEndButtons.classList.add('hidden');
    hudWrapper.classList.add('hidden');
    
    overlaySubtext.classList.remove('hidden');
    modeSelection.classList.remove('hidden');
    tutorialGuide.classList.remove('hidden');
    gameOverlay.classList.remove('hidden');

    // Clean canvas draw
    ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    ctx.fillStyle = '#0c1524';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
}

function applyPowerUp(t) {
    switch(t.type) {
        case 'medic': 
            if (lives < MAX_LIVES) {
                lives++; refreshLivesDisplay(); 
                floatingTexts.push(new FloatingText(t.x, t.y, "+1 LIFE", "#10b981"));
            } else {
                score += 50;
                floatingTexts.push(new FloatingText(t.x, t.y, "MAX LIVES BONUS +50", "#22c55e"));
            }
            return;
        case 'safetyNet': powerUpTimers.safetyNet = 480; break;
        case 'cryo': powerUpTimers.cryo = 300; currentGravity = BASE_GRAVITY * 0.5; break;
        case 'multiplier': powerUpTimers.multiplier = 360; activeMultiplier = 2; break;
        case 'flame': powerUpTimers.flame = 300; break;
        case 'frenzy': powerUpTimers.frenzy = 240; break;
    }
    floatingTexts.push(new FloatingText(t.x, t.y, t.type.toUpperCase() + " ACTIVE!", t.primaryColor));
}

// --- OPTIMIZED POSITION MATRIX CALCULATOR ---
function setInputCoordinates(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    mouseX = ((clientX - r.left) / r.width) * VIRTUAL_WIDTH;
    mouseY = ((clientY - r.top) / r.height) * VIRTUAL_HEIGHT;
}

// --- HARDWARE INTERACTION LISTENERS ---

// A. Advanced Mobile Touch Control Overrides
canvas.addEventListener('touchstart', (e) => {
    if (e.cancelable) e.preventDefault();
    isTouchMode = true; 
    tryInitAudio();
    const touch = e.touches[0];
    setInputCoordinates(touch.clientX, touch.clientY);
    executeShot();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (e.cancelable) e.preventDefault();
    isTouchMode = true;
    const touch = e.touches[0];
    setInputCoordinates(touch.clientX, touch.clientY);
}, { passive: false });

// B. Traditional Desktop Support Matrix
canvas.addEventListener('mousemove', (e) => {
    isTouchMode = false; 
    setInputCoordinates(e.clientX, e.clientY);
});

canvas.addEventListener('mousedown', (e) => {
    isTouchMode = false;
    executeShot();
});

// UI BINDINGS
livesModeButton.addEventListener('click', () => startGame('lives'));
timedModeButton.addEventListener('click', () => startGame('timed'));
pauseButton.addEventListener('click', () => { isPaused = true; pauseOverlay.classList.remove('hidden'); });
resumeButton.addEventListener('click', () => { isPaused = false; pauseOverlay.classList.add('hidden'); animationFrameId = requestAnimationFrame(gameLoop); });

// Explicit hard-state navigation resets 
quitMenuButton.addEventListener('click', () => resetToMainMenu());
quitToMenuFromEnd.addEventListener('click', () => resetToMainMenu());

settingsButton.addEventListener('click', () => { gameOverlay.classList.add('hidden'); settingsOverlay.classList.remove('hidden'); });
pauseSettingsButton.addEventListener('click', () => { pauseOverlay.classList.add('hidden'); settingsOverlay.classList.remove('hidden'); });
backToMainButton.addEventListener('click', () => { settingsOverlay.classList.add('hidden'); gameOverlay.classList.remove('hidden'); resizeCanvas(); });
openGuideButton.addEventListener('click', () => { gameOverlay.classList.add('hidden'); guideOverlay.classList.remove('hidden'); });
closeGuideButton.addEventListener('click', () => { guideOverlay.classList.add('hidden'); gameOverlay.classList.remove('hidden'); });
backFromGuideButton.addEventListener('click', () => { guideOverlay.classList.add('hidden'); gameOverlay.classList.remove('hidden'); });
resolutionSelect.addEventListener('change', (e) => { settings.displaySize = e.target.value; });
sfxToggle.addEventListener('change', (e) => { settings.sfxEnabled = e.target.checked; });

// Initial screen load setup state reset
resetToMainMenu();