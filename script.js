/* ============================================================
   TRAP SHOOTING PRO — Engine v3.0
   New in v3.0:
   ▸ Lives Mode difficulty: Easy / Normal (UI tabs)
   ▸ Time-based progressive difficulty scaling (pause-aware)
   ▸ Accuracy-only combo — no timer decay, breaks on miss/escape
   ▸ Peak combo & accuracy tracked for post-game stats card
   ▸ Target hit-flash (white silhouette frame)
   ▸ Bottom-edge danger indicator for incoming normal targets
   ▸ Crosshair style picker: classic / dot / circle
   ▸ All previous v2.1 fixes carried forward
   ============================================================ */

// ─── CANVAS & VIRTUAL COORDINATE SPACE ───────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

const VIRTUAL_WIDTH  = 854;
const VIRTUAL_HEIGHT = 480;
canvas.width  = VIRTUAL_WIDTH;
canvas.height = VIRTUAL_HEIGHT;

// ─── STATE MACHINE ENUM ──────────────────────────────────────
const GameState = Object.freeze({
    MENU:      'MENU',
    PLAYING:   'PLAYING',
    PAUSED:    'PAUSED',
    GAME_OVER: 'GAME_OVER',
});

// ─── DOM REFERENCES ──────────────────────────────────────────
const DOM = {
    hudWrapper:          document.getElementById('hudWrapper'),
    scoreVal:            document.getElementById('scoreDisplay').querySelector('span:last-child'),
    livesVal:            document.getElementById('livesDisplay').querySelector('span:last-child'),
    timerVal:            document.getElementById('timerDisplay').querySelector('span:last-child'),
    comboDisplay:        document.getElementById('comboDisplay'),
    comboVal:            document.querySelector('.combo-val'),
    timerDisplay:        document.getElementById('timerDisplay'),
    livesDisplay:        document.getElementById('livesDisplay'),
    difficultyBadge:     document.getElementById('difficultyBadge'),
    difficultyLabel:     document.getElementById('difficultyLabel'),
    pauseDiffLabel:      document.getElementById('pauseDiffLabel'),
    gameOverlay:         document.getElementById('gameOverlay'),
    pauseOverlay:        document.getElementById('pauseOverlay'),
    settingsOverlay:     document.getElementById('settingsOverlay'),
    guideOverlay:        document.getElementById('guideOverlay'),
    overlayMessage:      document.getElementById('overlayMessage'),
    overlaySubtext:      document.getElementById('overlaySubtext'),
    modeSelection:       document.getElementById('modeSelection'),
    tutorialGuide:       document.getElementById('tutorialGuide'),
    gameEndButtons:      document.getElementById('gameEndButtons'),
    newHighScoreBadge:   document.getElementById('newHighScoreBadge'),
    livesHighScore:      document.getElementById('livesHighScore'),
    timedHighScore:      document.getElementById('timedHighScore'),
    highScoreDisplay:    document.getElementById('highScoreDisplay'),
    statsCard:           document.getElementById('statsCard'),
    statScore:           document.getElementById('statScore'),
    statAccuracy:        document.getElementById('statAccuracy'),
    statPeakCombo:       document.getElementById('statPeakCombo'),
    statShots:           document.getElementById('statShots'),
    livesModeButton:     document.getElementById('livesModeButton'),
    timedModeButton:     document.getElementById('timedModeButton'),
    timedDurationSelect: document.getElementById('timedDurationSelect'),
    pauseButton:         document.getElementById('pauseButton'),
    resumeButton:        document.getElementById('resumeButton'),
    quitMenuButton:      document.getElementById('quitMenuButton'),
    quitToMenuFromEnd:   document.getElementById('quitToMenuFromEnd'),
    settingsButton:      document.getElementById('settingsButton'),
    pauseSettingsButton: document.getElementById('pauseSettingsButton'),
    backToMainButton:    document.getElementById('backToMainButton'),
    openGuideButton:     document.getElementById('openGuideButton'),
    closeGuideButton:    document.getElementById('closeGuideButton'),
    backFromGuideButton: document.getElementById('backFromGuideButton'),
    resolutionSelect:    document.getElementById('resolutionSelect'),
    volumeSlider:        document.getElementById('volumeSlider'),
    volumeLabel:         document.getElementById('volumeLabel'),
    crosshairSwatches:   document.querySelectorAll('.crosshair-swatch'),
    densitySwatches:     document.querySelectorAll('.density-swatch'),
    styleSwatches:       document.querySelectorAll('.style-swatch'),
    diffBtns:            document.querySelectorAll('.diff-btn'),
};

// ─── CONSTANTS ───────────────────────────────────────────────
const BASE_GRAVITY           = 0.065;
const MAX_LIVES              = 3;
const SWERVE_SCORE_THRESHOLD = 150; // score before swerve targets appear
const DANGER_ZONE_Y          = VIRTUAL_HEIGHT - 110; // y below which warning shows

// Particle counts per density level
const PARTICLE_COUNTS = { low: 10, medium: 22, high: 40 };
const BLAST_COUNTS    = { low: 20, medium: 40, high: 60 };

const resolutions = {
    '360x640':   { width: 360,  height: 640  },
    '390x844':   { width: 390,  height: 844  },
    '1920x1080': { width: 1920, height: 1080 },
    '2560x1080': { width: 2560, height: 1080 },
};

// ─── DIFFICULTY PROFILES ─────────────────────────────────────
// Each profile defines the INITIAL (t=0) values.
// Progressive scaling is applied on top of these over play time.
const DIFF_PROFILES = {
    easy: {
        label:        'EASY',
        color:        '#34d399',
        spawnStart:   3000,   // ms between spawns at start
        spawnMin:     1400,   // fastest spawn rate (cap)
        speedStart:   3.2,    // initial launch speed
        speedMax:     6.0,    // fastest speed (cap)
        horizStart:   1.2,    // initial horizontal drift magnitude
        horizMax:     2.8,
        spinStart:    0.03,
        spinMax:      0.10,
        swerveChance: 0.08,   // lower swerve probability on easy
    },
    normal: {
        label:        'NORMAL',
        color:        '#fbbf24',
        spawnStart:   2200,
        spawnMin:     900,
        speedStart:   4.5,
        speedMax:     7.5,
        horizStart:   2.0,
        horizMax:     4.0,
        spinStart:    0.05,
        spinMax:      0.17,
        swerveChance: 0.12,
    },
};

// ─── ENGINE STATE ─────────────────────────────────────────────
const Engine = {
    state:      GameState.MENU,
    mode:       'lives',       // 'lives' | 'timed'
    difficulty: 'normal',      // 'easy' | 'normal' — Lives Mode only

    // score / lives / time
    score:      0,
    lives:      MAX_LIVES,
    gameTimer:  60,

    // ── v3: accuracy-only combo (no decay timer) ──────────
    comboCount: 0,
    peakCombo:  0,

    // ── v3: stats tracking ────────────────────────────────
    shotsFired: 0,
    shotsHit:   0,

    // ── v3: pause-aware play time (seconds) ───────────────
    // Used for progressive difficulty; paused time does NOT count.
    playTimeSec:  0,
    playTimeTimer:null,   // 1-second interval, pauses with game

    // object pools
    targets:       [],
    particles:     [],
    floatingTexts: [],

    // scheduler
    spawnTimeoutId:    null,
    countdownInterval: null,
    animFrameId:       null,
    frenzyBurstId:     null,
    spawnRunning:      false,

    // power-ups (frame counters @ 60fps)
    powerUps: { safetyNet: 0, cryo: 0, flame: 0, multiplier: 0, frenzy: 0 },
    activeMultiplier: 1,
    currentGravity:   BASE_GRAVITY,
    isFrenzySpawning: false,

    // screen shake
    shake: { duration: 0, intensity: 0 },

    // blast ring visual
    blastRing: { active: false, x: 0, y: 0, radius: 0, alpha: 0 },

    // warning blink state
    warningBlink: 0,  // frame counter for blink phase

    // input
    mouseX:      VIRTUAL_WIDTH  / 2,
    mouseY:      VIRTUAL_HEIGHT / 2,
    isTouchMode: false,
};

// ─── SETTINGS (persisted) ─────────────────────────────────────
const settings = (() => {
    const defaults = {
        displaySize:     'auto',
        volume:          80,
        crosshairColor:  '#00ffff',
        crosshairStyle:  'classic',   // 'classic' | 'dot' | 'circle'
        particleDensity: 'medium',
        livesDifficulty: 'normal',    // persisted last-selected difficulty
    };
    try { return Object.assign({}, defaults, JSON.parse(localStorage.getItem('tsp_settings') || '{}')); }
    catch { return { ...defaults }; }
})();

function saveSettings() {
    try { localStorage.setItem('tsp_settings', JSON.stringify(settings)); } catch {}
}

// ─── HIGH SCORES ─────────────────────────────────────────────
const HighScore = {
    get(mode)      { try { return parseInt(localStorage.getItem(`tsp_hs_${mode}`)) || 0; } catch { return 0; } },
    set(mode, val) { try { localStorage.setItem(`tsp_hs_${mode}`, val); } catch {} },
    check(mode, val) { if (val > this.get(mode)) { this.set(mode, val); return true; } return false; },
    render() {
        const lv = this.get('lives'), ti = this.get('timed');
        DOM.livesHighScore.textContent = lv > 0 ? lv : '—';
        DOM.timedHighScore.textContent = ti > 0 ? ti : '—';
    },
};

// ─── AUDIO ───────────────────────────────────────────────────
let audioInitialized = false;
let shootSynth, hitSynth, missSnap, powerUpChime;

async function tryInitAudio() {
    if (audioInitialized) return;
    try {
        await Tone.start();
        shootSynth   = new Tone.MembraneSynth({ pitchDecay: 0.06, envelope: { attack: 0.001, decay: 0.2 } }).toDestination();
        hitSynth     = new Tone.NoiseSynth({ envelope: { attack: 0.001, decay: 0.1 } }).toDestination();
        missSnap     = new Tone.MembraneSynth({ pitchDecay: 0.03, envelope: { attack: 0.001, decay: 0.08 } }).toDestination();
        powerUpChime = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.1 } }).toDestination();
        applyVolume();
        audioInitialized = true;
    } catch(e) {}
}

function applyVolume() {
    if (!audioInitialized) return;
    const vol = settings.volume;
    Tone.Destination.volume.value = vol === 0 ? -Infinity : (20 * Math.log10(vol / 100));
}

function playSound(type) {
    if (!audioInitialized || settings.volume === 0) return;
    try {
        switch(type) {
            case 'shoot':   shootSynth.triggerAttackRelease('G1', '8n'); break;
            case 'hit':     hitSynth.triggerAttack(); break;
            case 'powerup': powerUpChime.triggerAttackRelease('C5', '16n'); break;
        }
    } catch(e) {}
}

// ─── DIFFICULTY / PROGRESSION ────────────────────────────────
// Returns the active difficulty profile, always 'normal' for timed mode.
function getProfile() {
    return DIFF_PROFILES[Engine.mode === 'lives' ? Engine.difficulty : 'normal'];
}

// t = progression factor 0→1 over the first 120 play-seconds,
// then gently continuing. Importantly this uses Engine.playTimeSec
// so it STOPS while paused.
function getProgression() {
    const t = Math.min(Engine.playTimeSec / 120, 1)
            + Math.max(0, (Engine.playTimeSec - 120) / 600) * 0.25;
    return Math.min(t, 1.25);
}

function lerp(a, b, t) { return a + (b - a) * t; }

function getSpawnInterval() {
    const p = getProfile(), t = getProgression();
    return Math.max(p.spawnMin, lerp(p.spawnStart, p.spawnMin, t));
}

function getTargetSpeed() {
    const p = getProfile(), t = getProgression();
    return lerp(p.speedStart, p.speedMax, t) + Math.random() * 1.2;
}

function getHorizDrift() {
    const p = getProfile(), t = getProgression();
    return lerp(p.horizStart, p.horizMax, t);
}

function getSpinSpeed() {
    const p = getProfile(), t = getProgression();
    return lerp(p.spinStart, p.spinMax, t);
}

function shouldSpawnSwerve() {
    const p = getProfile();
    return Engine.score >= SWERVE_SCORE_THRESHOLD
        && Math.random() < p.swerveChance + getProgression() * 0.06;
}

// ─── SCREEN SHAKE ────────────────────────────────────────────
function triggerShake(intensity = 8, duration = 18) {
    Engine.shake.intensity = intensity;
    Engine.shake.duration  = duration;
}

function applyShake() {
    if (Engine.shake.duration <= 0) return;
    const mag = Engine.shake.intensity * (Engine.shake.duration / 18);
    ctx.translate((Math.random() - 0.5) * mag * 2, (Math.random() - 0.5) * mag * 2);
    Engine.shake.duration--;
    if (Engine.shake.duration <= 0) Engine.shake.intensity = 0;
}

// ─── CLASSES ─────────────────────────────────────────────────

class FloatingText {
    constructor(x, y, text, color, scaleBoost = 1) {
        this.x = x; this.y = y; this.text = text; this.color = color;
        this.life = 60; this.maxLife = 60;
        this.vy = -(1.3 + Math.random() * 0.7);
        this.vx = (Math.random() - 0.5) * 1.4;
        this.scale = scaleBoost;
    }
    update() { this.x += this.vx; this.y += this.vy; this.vy += 0.022; this.life--; }
    draw() {
        const alpha = Math.min(1, this.life / (this.maxLife * 0.38));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = this.color;
        ctx.font        = `bold ${Math.round(14 * this.scale)}px 'Outfit', sans-serif`;
        ctx.textAlign   = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.95)';
        ctx.shadowBlur  = 7;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

class Target {
    constructor(forcedType = null) {
        this.radius    = 22 + Math.random() * 8;
        this.x         = Math.random() * (VIRTUAL_WIDTH - this.radius * 2) + this.radius;
        this.y         = VIRTUAL_HEIGHT - 20;
        this.speedY    = -getTargetSpeed();
        this.speedX    = (Math.random() - 0.5) * getHorizDrift();
        this.rotation  = 0;
        this.spinSpeed = (Math.random() - 0.5) * getSpinSpeed();
        this.type      = forcedType || this.rollType();
        this.isSwerve  = this.type === 'swerve';
        this.swerveAge = 0;
        this.swerveAmp = 0.8 + Math.random() * 1.2;
        this.swerveFreq= 0.03 + Math.random() * 0.02;

        // v3: hit-flash flag — rendered for exactly 1 frame
        this.flashFrame = false;

        this.setupVisuals();

        if (Engine.powerUps.cryo > 0) {
            this.speedX *= 0.5;
            this.speedY *= 0.5;
        }
    }

    rollType() {
        if (shouldSpawnSwerve()) return 'swerve';
        const roll = Math.random() * 100;
        if (Engine.mode === 'lives') {
            if (roll < 7)  return 'safetyNet';
            if (roll < 13) return 'cryo';
            if (roll < 18) return 'medic';
        } else {
            if (roll < 7)  return 'multiplier';
            if (roll < 13) return 'flame';
            if (roll < 18) return 'frenzy';
        }
        return 'normal';
    }

    setupVisuals() {
        switch(this.type) {
            case 'medic':      this.primaryColor='#10b981'; this.accentColor='#ffffff'; this.glowColor='#34d399'; this.label='✚'; break;
            case 'safetyNet':  this.primaryColor='#8b5cf6'; this.accentColor='#ffffff'; this.glowColor='#c084fc'; this.label='☵'; break;
            case 'cryo':       this.primaryColor='#06b6d4'; this.accentColor='#ffffff'; this.glowColor='#22d3ee'; this.label='❄'; break;
            case 'multiplier': this.primaryColor='#f97316'; this.accentColor='#ffffff'; this.glowColor='#fb923c'; this.label='2X'; break;
            case 'flame':      this.primaryColor='#ef4444'; this.accentColor='#facc15'; this.glowColor='#f87171'; this.label='🔥'; break;
            case 'frenzy':     this.primaryColor='#eab308'; this.accentColor='#ffffff'; this.glowColor='#fde047'; this.label='★'; break;
            case 'swerve':     this.primaryColor='#a855f7'; this.accentColor='#f0abfc'; this.glowColor='#d946ef'; this.label='~'; break;
            default:           this.primaryColor='#ea580c'; this.accentColor='#431407'; this.glowColor='orange';  this.label='';
        }
    }

    update() {
        const slow = (Engine.powerUps.cryo > 0) ? 0.5 : 1;
        this.swerveAge++;
        const swerveX = this.isSwerve ? Math.sin(this.swerveAge * this.swerveFreq) * this.swerveAmp : 0;
        this.x        += (this.speedX + swerveX) * slow;
        this.y        += this.speedY * slow;
        this.speedY   += Engine.currentGravity * slow;
        this.rotation += this.spinSpeed * slow;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // ── v3: white hit-flash silhouette (1 frame) ──────
        if (this.flashFrame) {
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur  = 28;
            ctx.fillStyle   = '#ffffff';
            ctx.beginPath(); ctx.arc(0, 0, this.radius + 4, 0, Math.PI * 2); ctx.fill();
            this.flashFrame = false;
            ctx.restore();
            return;  // draw only the flash on hit frame
        }

        ctx.shadowColor = this.glowColor;
        ctx.shadowBlur  = this.isSwerve ? 20 : 12;

        if (this.isSwerve) {
            const pulse = 0.5 + 0.5 * Math.sin(this.swerveAge * 0.15);
            ctx.strokeStyle = `rgba(168,85,247,${0.3 + pulse * 0.4})`;
            ctx.lineWidth   = 3;
            ctx.beginPath(); ctx.arc(0, 0, this.radius + 6 + pulse * 4, 0, Math.PI * 2); ctx.stroke();
        }

        ctx.fillStyle   = this.primaryColor;
        ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = this.accentColor;
        ctx.lineWidth   = 2.5;
        ctx.stroke();

        if (this.label) {
            ctx.rotate(-this.rotation);
            ctx.fillStyle    = 'white';
            ctx.font         = 'bold 13px sans-serif';
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowBlur   = 0;
            ctx.fillText(this.label, 0, 0);
        }
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color, isShard = false) {
        this.x = x; this.y = y; this.color = color; this.isShard = isShard;
        const speed = 2 + Math.random() * 7;
        const angle = Math.random() * Math.PI * 2;
        this.vx   = Math.cos(angle) * speed;
        this.vy   = Math.sin(angle) * speed;
        this.drag = 0.92 + Math.random() * 0.05;
        this.size = isShard ? (3 + Math.random() * 7) : (2 + Math.random() * 4);
        this.life = 40 + Math.random() * 25;
        this.maxLife  = this.life;
        this.rotation = Math.random() * Math.PI * 2;
        this.spin     = (Math.random() - 0.5) * 0.3;
    }
    update() {
        this.vx *= this.drag; this.vy *= this.drag;
        this.vy += Engine.currentGravity * 0.5;
        this.x  += this.vx; this.y += this.vy;
        this.rotation += this.spin;
        this.life--;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = Math.pow(this.life / this.maxLife, 1.5);
        if (this.isShard) {
            ctx.translate(this.x, this.y); ctx.rotate(this.rotation);
            ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 4;
            ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

// ─── PARTICLE SPAWNER ────────────────────────────────────────
function spawnExplosion(x, y, color, isBlast = false) {
    const density = settings.particleDensity || 'medium';
    const count   = isBlast ? BLAST_COUNTS[density] : PARTICLE_COUNTS[density];
    for (let i = 0; i < count; i++) Engine.particles.push(new Particle(x, y, color, i % 3 === 0));
    const sparks = { low: 3, medium: 8, high: 14 }[density];
    for (let i = 0; i < sparks; i++) Engine.particles.push(new Particle(x, y, '#ffffff', false));
}

// ─── DISPLAY HELPERS ─────────────────────────────────────────
function refreshLivesDisplay() {
    DOM.livesVal.textContent = Engine.lives;
    DOM.livesVal.style.color = (Engine.lives >= MAX_LIVES) ? '#22c55e' : '#ffffff';
}

function refreshComboDisplay() {
    if (Engine.comboCount > 1) {
        DOM.comboDisplay.classList.remove('hidden');
        DOM.comboVal.textContent = `x${Engine.comboCount}`;
        DOM.comboVal.classList.remove('combo-pulse');
        void DOM.comboVal.offsetWidth;
        DOM.comboVal.classList.add('combo-pulse');
    } else {
        DOM.comboDisplay.classList.add('hidden');
    }
}

function spawnTarget(type = null) {
    if (Engine.state === GameState.PLAYING) Engine.targets.push(new Target(type));
}

// ─── RESIZE / SCALING ────────────────────────────────────────
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

// ─── CROSSHAIR DRAW ──────────────────────────────────────────
function drawCrosshair() {
    ctx.save();
    let color = settings.crosshairColor;
    if (Engine.powerUps.flame > 0) color = '#ef4444';

    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur  = 18;
    ctx.lineWidth   = 2;
    ctx.fillStyle   = color;

    const mx = Engine.mouseX, my = Engine.mouseY;
    const touch = Engine.isTouchMode;

    const style = settings.crosshairStyle || 'classic';

    if (style === 'dot') {
        // ── Large glowing dot ──────────────────────────
        ctx.beginPath(); ctx.arc(mx, my, touch ? 8 : 5, 0, Math.PI * 2); ctx.fill();

    } else if (style === 'circle') {
        // ── Open hunting circle ────────────────────────
        const r = touch ? 30 : 18;
        ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(mx, my, touch ? 3 : 2, 0, Math.PI * 2); ctx.fill();

    } else {
        // ── Classic crosshairs (default) ───────────────
        const radius = touch ? 28 : 14;
        const inner  = touch ? 16 : 8;
        const outer  = touch ? 44 : 26;
        ctx.beginPath(); ctx.arc(mx, my, radius, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx - outer, my); ctx.lineTo(mx - inner, my); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx + outer, my); ctx.lineTo(mx + inner, my); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx, my - outer); ctx.lineTo(mx, my - inner); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx, my + outer); ctx.lineTo(mx, my + inner); ctx.stroke();
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(mx, my, touch ? 4 : 2.5, 0, Math.PI * 2); ctx.fill();
    }

    // ── Flame AoE ring (always shown when flame active) ──
    if (Engine.powerUps.flame > 0) {
        const blastR = 80 + (touch ? 30 : 0);
        ctx.shadowBlur  = 0;
        ctx.strokeStyle = 'rgba(251,146,60,0.35)';
        ctx.lineWidth   = 1.5;
        ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.arc(mx, my, blastR, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(239,68,68,0.05)';
        ctx.beginPath(); ctx.arc(mx, my, blastR, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
}

// ─── BLAST RING VISUAL ───────────────────────────────────────
function drawBlastRing() {
    const br = Engine.blastRing;
    if (!br.active || br.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = br.alpha;
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth   = 3;
    ctx.shadowColor = '#fb923c';
    ctx.shadowBlur  = 20;
    ctx.beginPath(); ctx.arc(br.x, br.y, br.radius, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = br.alpha * 0.15;
    ctx.fillStyle   = '#ef4444';
    ctx.beginPath(); ctx.arc(br.x, br.y, br.radius, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    br.alpha  -= 0.07;
    br.radius += 2.5;
    if (br.alpha <= 0) br.active = false;
}

function triggerBlastRing(x, y, radius) {
    Engine.blastRing = { active: true, x, y, radius, alpha: 0.85 };
}

// ─── BOTTOM-EDGE DANGER INDICATOR (v3 new) ───────────────────
function drawDangerIndicators() {
    if (Engine.mode !== 'lives') return;
    if (Engine.powerUps.safetyNet > 0) return;

    Engine.warningBlink = (Engine.warningBlink + 1) % 30;
    const blink = Engine.warningBlink < 15; // 2 Hz at 60fps

    Engine.targets.forEach(t => {
        if (t.type !== 'normal') return;
        if (t.y < DANGER_ZONE_Y) return;

        // How close to the bottom (0 at DANGER_ZONE_Y, 1 at VIRTUAL_HEIGHT)
        const proximity = Math.min(1, (t.y - DANGER_ZONE_Y) / (VIRTUAL_HEIGHT - DANGER_ZONE_Y));

        const alpha = blink ? Math.min(0.95, 0.4 + proximity * 0.55) : 0.1;

        ctx.save();
        const cx = Math.min(Math.max(t.x, 20), VIRTUAL_WIDTH - 20);
        const baseY = VIRTUAL_HEIGHT - 22;

        // Glow behind indicator
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur  = 18 * proximity;

        // Down-pointing triangle arrow
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(cx - 9,  baseY - 12);
        ctx.lineTo(cx + 9,  baseY - 12);
        ctx.lineTo(cx,      baseY);
        ctx.closePath();
        ctx.fill();

        // Thin vertical line above arrow for extra visibility
        ctx.globalAlpha = alpha * 0.7;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.moveTo(cx, baseY - 20);
        ctx.lineTo(cx, baseY - 14);
        ctx.stroke();

        ctx.restore();
    });
}

// ─── POWER-UP HUD BARS ───────────────────────────────────────
function drawPowerUpHUD() {
    const pu = Engine.powerUps;
    const bars = [];
    if (pu.safetyNet > 0) bars.push({ label: '☵ NET',   color: '#8b5cf6', t: pu.safetyNet,  max: 480 });
    if (pu.cryo > 0)      bars.push({ label: '❄ CRYO',  color: '#06b6d4', t: pu.cryo,       max: 300 });
    if (pu.flame > 0)     bars.push({ label: '🔥 FLAME', color: '#ef4444', t: pu.flame,      max: 300 });
    if (pu.multiplier > 0)bars.push({ label: '2X',       color: '#f97316', t: pu.multiplier, max: 360 });

    bars.forEach((b, i) => {
        const bw = 80, bh = 5, x = VIRTUAL_WIDTH - 90, y = 16 + i * 20;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(x, y + 10, bw, bh);
        ctx.fillStyle = b.color;
        ctx.fillRect(x, y + 10, bw * (b.t / b.max), bh);
        ctx.save();
        ctx.fillStyle = b.color;
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(b.label, x - 4, y + 14);
        ctx.restore();
    });

    // Difficulty watermark (Lives Mode)
    if (Engine.mode === 'lives') {
        const p = getProfile();
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle   = p.color;
        ctx.font        = 'bold 11px sans-serif';
        ctx.textAlign   = 'left';
        ctx.fillText(p.label, 10, VIRTUAL_HEIGHT - 28);
        ctx.restore();
    }
}

// ─── SHOT LOGIC ──────────────────────────────────────────────
function executeShot() {
    if (Engine.state !== GameState.PLAYING) return;

    playSound('shoot');
    Engine.shotsFired++;

    const touchBonus = Engine.isTouchMode ? 30 : 0;
    const isBlast    = Engine.powerUps.flame > 0;
    const blastR     = isBlast ? 80 : 0;
    let hitCount = 0;

    if (isBlast) triggerBlastRing(Engine.mouseX, Engine.mouseY, blastR + touchBonus);

    for (let i = Engine.targets.length - 1; i >= 0; i--) {
        const t = Engine.targets[i];
        const d = Math.hypot(Engine.mouseX - t.x, Engine.mouseY - t.y);

        if (d <= t.radius + blastR + touchBonus) {
            playSound('hit');
            Engine.shotsHit++;

            // ── v3 combo: purely accuracy-based, no decay ──
            Engine.comboCount++;
            if (Engine.comboCount > Engine.peakCombo) Engine.peakCombo = Engine.comboCount;
            refreshComboDisplay();

            // ── v3: trigger hit-flash ──────────────────────
            t.flashFrame = true;

            const base       = (t.isSwerve ? 35 : 10) * Engine.activeMultiplier;
            const comboBonus = Engine.comboCount > 1
                ? Math.floor(base * (Engine.comboCount - 1) * 0.25) : 0;
            const total      = base + comboBonus;

            Engine.score += total;
            DOM.scoreVal.textContent = Engine.score;

            const label = Engine.comboCount > 1 ? `+${total} x${Engine.comboCount}!` : `+${total}`;
            Engine.floatingTexts.push(new FloatingText(t.x, t.y - 20, label,
                Engine.comboCount > 1 ? '#fbbf24' : '#ffffff',
                Engine.comboCount > 2 ? 1.4 : 1));

            applyPowerUp(t);
            spawnExplosion(t.x, t.y, t.primaryColor, isBlast);
            if (isBlast) triggerShake(10, 20);

            Engine.targets.splice(i, 1);
            hitCount++;
            if (!isBlast) break; // only blast hits multiple
        }
    }

    // ── v3: missed shot → break combo ──────────────────────
    if (hitCount === 0) {
        Engine.comboCount = 0;
        refreshComboDisplay();
    }
}

// ─── POWER-UP APPLY ──────────────────────────────────────────
function applyPowerUp(t) {
    if (t.type === 'normal' || t.type === 'swerve') return;
    playSound('powerup');

    switch(t.type) {
        case 'medic':
            if (Engine.lives < MAX_LIVES) {
                Engine.lives++;
                refreshLivesDisplay();
                Engine.floatingTexts.push(new FloatingText(t.x, t.y - 40, '+1 LIFE', '#10b981'));
            } else {
                Engine.score += 50;
                DOM.scoreVal.textContent = Engine.score;
                Engine.floatingTexts.push(new FloatingText(t.x, t.y - 40, 'MAX HP +50', '#22c55e'));
            }
            return;
        case 'safetyNet': Engine.powerUps.safetyNet = 480; break;
        case 'cryo':
            Engine.powerUps.cryo = 300;
            Engine.currentGravity = BASE_GRAVITY * 0.5;
            break;
        case 'multiplier':
            Engine.powerUps.multiplier = 360;
            Engine.activeMultiplier = 2;
            break;
        case 'flame':
            Engine.powerUps.flame = 300;
            triggerShake(5, 12);
            break;
        case 'frenzy':
            Engine.powerUps.frenzy = 240;
            break;
    }
    Engine.floatingTexts.push(new FloatingText(t.x, t.y - 40,
        t.type.toUpperCase() + ' ACTIVE!', t.primaryColor, 1.2));
}

// ─── SPAWN SCHEDULER ─────────────────────────────────────────
function stopSpawnScheduler() {
    clearTimeout(Engine.spawnTimeoutId);
    clearInterval(Engine.frenzyBurstId);
    Engine.spawnRunning     = false;
    Engine.isFrenzySpawning = false;
}

function startSpawnScheduler() {
    if (Engine.spawnRunning) return;
    Engine.spawnRunning = true;

    function tick() {
        if (Engine.state !== GameState.PLAYING) { Engine.spawnRunning = false; return; }

        if (Engine.powerUps.frenzy > 0 && !Engine.isFrenzySpawning) {
            Engine.isFrenzySpawning = true;
            let c = 0;
            Engine.frenzyBurstId = setInterval(() => {
                if (Engine.state === GameState.PLAYING) spawnTarget('normal');
                if (++c >= 10) { clearInterval(Engine.frenzyBurstId); Engine.isFrenzySpawning = false; }
            }, 250);
        } else {
            spawnTarget();
        }

        Engine.spawnTimeoutId = setTimeout(tick, getSpawnInterval());
    }

    Engine.spawnTimeoutId = setTimeout(tick, getSpawnInterval());
}

// ─── PAUSE-AWARE PLAY TIMER ──────────────────────────────────
// Ticks Engine.playTimeSec only while PLAYING; pauses when paused.
function startPlayTimer() {
    stopPlayTimer();
    Engine.playTimeTimer = setInterval(() => {
        if (Engine.state === GameState.PLAYING) Engine.playTimeSec++;
    }, 1000);
}

function stopPlayTimer() {
    clearInterval(Engine.playTimeTimer);
    Engine.playTimeTimer = null;
}

// ─── MAIN GAME LOOP ──────────────────────────────────────────
function gameLoop() {
    if (Engine.state !== GameState.PLAYING) return;

    // Power-up frame ticks
    for (const k in Engine.powerUps) {
        if (Engine.powerUps[k] > 0) {
            Engine.powerUps[k]--;
            if (k === 'cryo'       && Engine.powerUps[k] === 0) Engine.currentGravity = BASE_GRAVITY;
            if (k === 'multiplier' && Engine.powerUps[k] === 0) Engine.activeMultiplier = 1;
        }
    }

    ctx.save();
    ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    // Background
    const g = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
    if      (Engine.powerUps.cryo  > 0) { g.addColorStop(0, '#153243'); g.addColorStop(1, '#2a4454'); }
    else if (Engine.powerUps.flame > 0) { g.addColorStop(0, '#1a0a00'); g.addColorStop(1, '#2d1200'); }
    else                                { g.addColorStop(0, '#0c1524'); g.addColorStop(1, '#1e293b'); }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    applyShake();

    // Safety-net bar
    if (Engine.powerUps.safetyNet > 0) {
        const a = Math.min(1, Engine.powerUps.safetyNet / 60);
        ctx.fillStyle = `rgba(124,58,237,${0.6 * a})`;
        ctx.fillRect(0, VIRTUAL_HEIGHT - 24, VIRTUAL_WIDTH, 4);
        ctx.shadowColor = '#7c3aed'; ctx.shadowBlur = 12 * a;
        ctx.fillStyle = `rgba(139,92,246,${0.3 * a})`;
        ctx.fillRect(0, VIRTUAL_HEIGHT - 28, VIRTUAL_WIDTH, 8);
        ctx.shadowBlur = 0;
    }

    // Ground
    ctx.fillStyle = '#14532d';
    ctx.fillRect(0, VIRTUAL_HEIGHT - 20, VIRTUAL_WIDTH, 20);

    // ── v3: danger indicators drawn before targets ──────────
    drawDangerIndicators();

    // Targets
    for (let i = Engine.targets.length - 1; i >= 0; i--) {
        const t = Engine.targets[i];
        t.update(); t.draw();

        const oob = t.y > VIRTUAL_HEIGHT + 60 || t.x < -80 || t.x > VIRTUAL_WIDTH + 80;
        if (oob) {
            Engine.targets.splice(i, 1);

            // Only normal targets in Lives Mode cost a life when missed
            if (Engine.mode === 'lives' && t.type === 'normal') {
                if (Engine.powerUps.safetyNet > 0) {
                    Engine.floatingTexts.push(new FloatingText(
                        Math.min(Math.max(t.x, 60), VIRTUAL_WIDTH - 60),
                        VIRTUAL_HEIGHT - 50, 'SAVED!', '#a78bfa'));
                } else {
                    // ── v3: escaped normal target breaks combo ──
                    Engine.comboCount = 0;
                    refreshComboDisplay();

                    Engine.lives--;
                    refreshLivesDisplay();
                    triggerShake(7, 15);
                    Engine.floatingTexts.push(new FloatingText(
                        Math.min(Math.max(t.x, 60), VIRTUAL_WIDTH - 60),
                        VIRTUAL_HEIGHT - 60, '-1 LIFE', '#f87171'));
                    if (Engine.lives <= 0) { ctx.restore(); gameOver(); return; }
                }
            }
            // Swerve misses: no life cost, no combo break
        }
    }

    // Particles
    for (let i = Engine.particles.length - 1; i >= 0; i--) {
        Engine.particles[i].update(); Engine.particles[i].draw();
        if (Engine.particles[i].life <= 0) Engine.particles.splice(i, 1);
    }

    // Floating texts
    for (let i = Engine.floatingTexts.length - 1; i >= 0; i--) {
        Engine.floatingTexts[i].update(); Engine.floatingTexts[i].draw();
        if (Engine.floatingTexts[i].life <= 0) Engine.floatingTexts.splice(i, 1);
    }

    drawBlastRing();
    drawPowerUpHUD();
    drawCrosshair();

    ctx.restore();
    Engine.animFrameId = requestAnimationFrame(gameLoop);
}

// ─── STATE TRANSITIONS ────────────────────────────────────────
function startGame(mode) {
    tryInitAudio();

    Engine.mode             = mode;
    Engine.difficulty       = (mode === 'lives') ? settings.livesDifficulty : 'normal';
    Engine.score            = 0;
    Engine.lives            = MAX_LIVES;
    Engine.gameTimer        = mode === 'timed' ? parseInt(DOM.timedDurationSelect.value, 10) : 0;
    Engine.comboCount       = 0;
    Engine.peakCombo        = 0;
    Engine.shotsFired       = 0;
    Engine.shotsHit         = 0;
    Engine.playTimeSec      = 0;
    Engine.targets          = [];
    Engine.particles        = [];
    Engine.floatingTexts    = [];
    Engine.currentGravity   = BASE_GRAVITY;
    Engine.activeMultiplier = 1;
    Engine.isFrenzySpawning = false;
    Engine.shake            = { duration: 0, intensity: 0 };
    Engine.blastRing        = { active: false, x: 0, y: 0, radius: 0, alpha: 0 };
    Engine.warningBlink     = 0;
    for (const k in Engine.powerUps) Engine.powerUps[k] = 0;

    DOM.scoreVal.textContent = '0';
    refreshLivesDisplay();
    DOM.hudWrapper.classList.remove('hidden');
    DOM.gameOverlay.classList.add('hidden');
    DOM.comboDisplay.classList.add('hidden');

    // Difficulty badge in HUD (Lives Mode only)
    if (mode === 'lives') {
        const p = getProfile();
        DOM.difficultyBadge.classList.remove('hidden');
        DOM.difficultyLabel.textContent = p.label;
        DOM.difficultyLabel.style.color = p.color;
        DOM.pauseDiffLabel.textContent  = p.label + ' MODE';
        DOM.timerDisplay.classList.add('hidden');
        DOM.livesDisplay.classList.remove('hidden');
    } else {
        DOM.difficultyBadge.classList.add('hidden');
        DOM.pauseDiffLabel.textContent = 'TIMED MODE';
        DOM.timerDisplay.classList.remove('hidden');
        DOM.timerVal.textContent = Engine.gameTimer + 's';
        DOM.livesDisplay.classList.add('hidden');
        Engine.countdownInterval = setInterval(() => {
            if (Engine.state !== GameState.PLAYING) return;
            Engine.gameTimer--;
            DOM.timerVal.textContent = Engine.gameTimer + 's';
            if (Engine.gameTimer <= 0) gameOver();
        }, 1000);
    }

    Engine.state = GameState.PLAYING;
    startPlayTimer();
    startSpawnScheduler();
    Engine.animFrameId = requestAnimationFrame(gameLoop);
}

function pauseGame() {
    if (Engine.state !== GameState.PLAYING) return;
    Engine.state = GameState.PAUSED;
    // Stop rAF, spawn, and play-time timer — difficulty scaling freezes ✓
    cancelAnimationFrame(Engine.animFrameId);
    stopSpawnScheduler();
    stopPlayTimer();
    DOM.pauseOverlay.classList.remove('hidden');
}

function resumeGame() {
    if (Engine.state !== GameState.PAUSED) return;
    Engine.state = GameState.PLAYING;
    DOM.pauseOverlay.classList.add('hidden');
    // Restart all three loops fresh
    startPlayTimer();
    startSpawnScheduler();
    Engine.animFrameId = requestAnimationFrame(gameLoop);
}

function gameOver() {
    Engine.state = GameState.GAME_OVER;
    stopSpawnScheduler();
    stopPlayTimer();
    clearInterval(Engine.countdownInterval);
    cancelAnimationFrame(Engine.animFrameId);

    const isNewBest = HighScore.check(Engine.mode, Engine.score);
    HighScore.render();

    // Populate post-game stats
    const accuracy = Engine.shotsFired > 0
        ? Math.round((Engine.shotsHit / Engine.shotsFired) * 100)
        : 0;
    DOM.statScore.textContent     = Engine.score;
    DOM.statAccuracy.textContent  = Engine.shotsFired > 0 ? accuracy + '%' : '—';
    DOM.statPeakCombo.textContent = Engine.peakCombo > 1 ? 'x' + Engine.peakCombo : '—';
    DOM.statShots.textContent     = Engine.shotsFired;

    DOM.hudWrapper.classList.add('hidden');
    DOM.gameOverlay.classList.remove('hidden');
    DOM.modeSelection.classList.add('hidden');
    DOM.tutorialGuide.classList.add('hidden');
    DOM.overlaySubtext.classList.add('hidden');
    DOM.highScoreDisplay.classList.add('hidden');
    DOM.gameEndButtons.classList.remove('hidden');
    DOM.overlayMessage.textContent = 'MATCH OVER';
    DOM.newHighScoreBadge.classList.toggle('hidden', !isNewBest);
}

function resetToMainMenu() {
    Engine.state = GameState.MENU;
    stopSpawnScheduler();
    stopPlayTimer();
    clearInterval(Engine.countdownInterval);
    cancelAnimationFrame(Engine.animFrameId);

    Engine.targets       = [];
    Engine.particles     = [];
    Engine.floatingTexts = [];
    Engine.shake         = { duration: 0, intensity: 0 };

    DOM.overlayMessage.textContent = 'TRAP SHOOTING PRO';
    DOM.overlayMessage.className   = 'main-heading-text text-2xl sm:text-3xl md:text-5xl font-black tracking-tight mb-1 md:mb-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-200';
    DOM.gameEndButtons.classList.add('hidden');
    DOM.newHighScoreBadge.classList.add('hidden');
    DOM.hudWrapper.classList.add('hidden');
    DOM.comboDisplay.classList.add('hidden');
    DOM.difficultyBadge.classList.add('hidden');
    DOM.overlaySubtext.classList.remove('hidden');
    DOM.modeSelection.classList.remove('hidden');
    DOM.tutorialGuide.classList.remove('hidden');
    DOM.highScoreDisplay.classList.remove('hidden');
    DOM.gameOverlay.classList.remove('hidden');
    DOM.pauseOverlay.classList.add('hidden');
    DOM.settingsOverlay.classList.add('hidden');

    HighScore.render();

    ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    ctx.fillStyle = '#0c1524';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    resizeCanvas();
}

// ─── INPUT ───────────────────────────────────────────────────
function setInputCoordinates(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    Engine.mouseX = ((clientX - r.left) / r.width)  * VIRTUAL_WIDTH;
    Engine.mouseY = ((clientY - r.top)  / r.height) * VIRTUAL_HEIGHT;
}

// ─── SETTINGS UI SYNC ────────────────────────────────────────
function applyCrosshairSwatchUI() {
    DOM.crosshairSwatches.forEach(sw => {
        const on = sw.dataset.color === settings.crosshairColor;
        sw.classList.toggle('active', on);
        sw.style.boxShadow = on ? `0 0 0 2px ${sw.dataset.color}, 0 0 0 4px #0f172a` : '';
    });
}

function applyStyleSwatchUI() {
    DOM.styleSwatches.forEach(sw => {
        sw.classList.toggle('active', sw.dataset.style === (settings.crosshairStyle || 'classic'));
    });
}

function applyDensitySwatchUI() {
    DOM.densitySwatches.forEach(sw => {
        sw.classList.toggle('active', sw.dataset.density === settings.particleDensity);
    });
}

function applyDifficultyUI() {
    DOM.diffBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.diff === (settings.livesDifficulty || 'normal'));
    });
}

function applyVolumeUI() {
    DOM.volumeSlider.value      = settings.volume;
    DOM.volumeLabel.textContent = settings.volume + '%';
}

function syncSettingsToUI() {
    DOM.resolutionSelect.value = settings.displaySize || 'auto';
    applyVolumeUI();
    applyCrosshairSwatchUI();
    applyStyleSwatchUI();
    applyDensitySwatchUI();
    applyDifficultyUI();
}

// ─── EVENT LISTENERS ──────────────────────────────────────────

// Canvas touch
canvas.addEventListener('touchstart', (e) => {
    if (e.cancelable) e.preventDefault();
    Engine.isTouchMode = true;
    tryInitAudio();
    setInputCoordinates(e.touches[0].clientX, e.touches[0].clientY);
    executeShot();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (e.cancelable) e.preventDefault();
    Engine.isTouchMode = true;
    setInputCoordinates(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

// Canvas mouse
canvas.addEventListener('mousemove', (e) => {
    Engine.isTouchMode = false;
    setInputCoordinates(e.clientX, e.clientY);
});
canvas.addEventListener('mousedown', () => {
    Engine.isTouchMode = false;
    executeShot();
});

// Game flow buttons
DOM.livesModeButton.addEventListener('click', () => startGame('lives'));
DOM.timedModeButton.addEventListener('click', () => startGame('timed'));
DOM.pauseButton.addEventListener('click', pauseGame);
DOM.resumeButton.addEventListener('click', resumeGame);
DOM.quitMenuButton.addEventListener('click', resetToMainMenu);
DOM.quitToMenuFromEnd.addEventListener('click', resetToMainMenu);

// Difficulty picker (Lives Mode menu tabs)
DOM.diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        settings.livesDifficulty = btn.dataset.diff;
        saveSettings();
        applyDifficultyUI();
    });
});

// Settings open/close
DOM.settingsButton.addEventListener('click', () => {
    DOM.gameOverlay.classList.add('hidden');
    DOM.settingsOverlay.classList.remove('hidden');
    syncSettingsToUI();
});
DOM.pauseSettingsButton.addEventListener('click', () => {
    DOM.pauseOverlay.classList.add('hidden');
    DOM.settingsOverlay.classList.remove('hidden');
    syncSettingsToUI();
});
DOM.backToMainButton.addEventListener('click', () => {
    saveSettings();
    DOM.settingsOverlay.classList.add('hidden');
    if (Engine.state === GameState.PAUSED) {
        DOM.pauseOverlay.classList.remove('hidden');
    } else {
        DOM.gameOverlay.classList.remove('hidden');
    }
    resizeCanvas();
});

// Guide open/close
DOM.openGuideButton.addEventListener('click',   () => { DOM.gameOverlay.classList.add('hidden');    DOM.guideOverlay.classList.remove('hidden'); });
DOM.closeGuideButton.addEventListener('click',  () => { DOM.guideOverlay.classList.add('hidden');   DOM.gameOverlay.classList.remove('hidden');  });
DOM.backFromGuideButton.addEventListener('click',() => { DOM.guideOverlay.classList.add('hidden');  DOM.gameOverlay.classList.remove('hidden');  });

// Settings controls
DOM.resolutionSelect.addEventListener('change', (e) => {
    settings.displaySize = e.target.value;
    resizeCanvas();
    saveSettings();
});

DOM.volumeSlider.addEventListener('input', (e) => {
    settings.volume = parseInt(e.target.value, 10);
    DOM.volumeLabel.textContent = settings.volume + '%';
    applyVolume();
    saveSettings();
});

DOM.crosshairSwatches.forEach(sw => sw.addEventListener('click', () => {
    settings.crosshairColor = sw.dataset.color;
    saveSettings(); applyCrosshairSwatchUI();
}));

DOM.styleSwatches.forEach(sw => sw.addEventListener('click', () => {
    settings.crosshairStyle = sw.dataset.style;
    saveSettings(); applyStyleSwatchUI();
}));

DOM.densitySwatches.forEach(sw => sw.addEventListener('click', () => {
    settings.particleDensity = sw.dataset.density;
    saveSettings(); applyDensitySwatchUI();
}));

// ─── BOOT ────────────────────────────────────────────────────
syncSettingsToUI();
resetToMainMenu();
