/* ============================================================
   TRAP SHOOTING PRO — Engine v5.1
   New in v5.1:
   ▸ Persistent Power-Up Packs — itemized meta-inventory (max
     3 per type) funded by a 24-hour Daily Vault reward loop
   ▸ Cross-mode power-up balancing: universal vs mode-restricted
     packs, manually triggered via an in-game floating sidebar
   ▸ Smart "What's New" changelog engine with version tracking
   ▸ Tab-visibility safety net — auto-pauses on tab blur
   ▸ All v5.0 systems preserved intact
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

// ─── VERSION & CHANGELOG ──────────────────────────────────────
const CURRENT_VERSION = "5.1";

const CHANGELOG_HISTORY = [
    {
        v: "5.1",
        date: "2026-06",
        notes: [
            "Added the Daily Vault — claim a free power-up pack every 24 hours",
            "New floating in-game power-up sidebar with cross-mode restrictions",
            "Medic Clay is now Lives Mode only; Frenzy is now Timed Mode only",
            "Flame Rounds is now fully compatible across Lives and Time Attack modes",
            "Fixed a background-tab unfocus glitch that could flood the canvas with targets",
            "Added this Changelog screen so you always know what's new",
        ],
    },
    {
        v: "5.0",
        date: "2026-06",
        notes: [
            "Expanded controller-only advanced settings (sensitivity, deadzone, aim assist)",
            "Full D-pad pause-menu navigation and reliable Start-button resume",
            "Added a Play Again button to the game-over screen",
            "Settings panel is now smoothly scrollable on desktop, touch, and controller",
            "Animated, more game-like timer HUD with low-time urgency effects",
            "Fairer target spawning — targets no longer launch instantly out of bounds",
        ],
    },
];

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
    // v6: Daily Vault / Changelog / Sidebar
    dailyVaultButton:    document.getElementById('dailyVaultButton'),
    vaultButtonInner:    document.getElementById('vaultButtonInner'),
    vaultOverlay:        document.getElementById('vaultOverlay'),
    vaultIdleState:      document.getElementById('vaultIdleState'),
    vaultCooldownState:  document.getElementById('vaultCooldownState'),
    vaultRewardState:    document.getElementById('vaultRewardState'),
    vaultCountdownText:  document.getElementById('vaultCountdownText'),
    vaultChest:          document.getElementById('vaultChest'),
    vaultFlash:          document.getElementById('vaultFlash'),
    claimVaultButton:    document.getElementById('claimVaultButton'),
    vaultContinueButton: document.getElementById('vaultContinueButton'),
    closeVaultButton:    document.getElementById('closeVaultButton'),
    vaultRewardIcon:     document.getElementById('vaultRewardIcon'),
    vaultRewardTitle:    document.getElementById('vaultRewardTitle'),
    vaultRewardName:     document.getElementById('vaultRewardName'),
    vaultRewardSummary:  document.getElementById('vaultRewardSummary'),
    changelogButton:     document.getElementById('changelogButton'),
    whatsNewBadge:       document.getElementById('whatsNewBadge'),
    changelogOverlay:    document.getElementById('changelogOverlay'),
    changelogList:       document.getElementById('changelogList'),
    closeChangelogButton:document.getElementById('closeChangelogButton'),
    changelogGotItButton:document.getElementById('changelogGotItButton'),
    powerupSidebar:      document.getElementById('powerupSidebar'),
    packBtns:            document.querySelectorAll('.pack-btn'),
};

// ─── CONSTANTS ───────────────────────────────────────────────
const BASE_GRAVITY           = 0.065;
const MAX_LIVES              = 3;
const SWERVE_SCORE_THRESHOLD = 150; // score before swerve targets appear
const DANGER_ZONE_Y          = VIRTUAL_HEIGHT - 110; // y below which warning shows

// v5: minimum horizontal distance from each edge for fair spawning
const SPAWN_MARGIN           = 80;  // px — prevents instant-exit near walls

// Particle counts per density level
const PARTICLE_COUNTS = { low: 10, medium: 22, high: 40 };
const BLAST_COUNTS    = { low: 20, medium: 40, high: 60 };

const resolutions = {
    '360x640':   { width: 360,  height: 640  },
    '390x844':   { width: 390,  height: 844  },
    '1920x1080': { width: 1920, height: 1080 },
    '2560x1080': { width: 2560, height: 1080 },
};

// ─── DELTA-TIME CONSTANTS ─────────────────────────────────────
const FIXED_STEP = 1000 / 60;   // 16.6̄ ms — one physics tick at 60 Hz
const MAX_STEPS  = 5;            // spiral-of-death safety cap

// ─── GAMEPAD MAPPING PRESETS ─────────────────────────────────
// Standard Gamepad API button indices (W3C remapping)
const PAD_PRESETS = {
    default:  { fireBtn: 7, pauseBtn: 9, fireLabel: 'RT / R2' },   // Right Trigger
    bumper:   { fireBtn: 5, pauseBtn: 9, fireLabel: 'RB / R1' },   // Right Bumper
    tactical: { fireBtn: 0, pauseBtn: 9, fireLabel: 'A / ✕'   },   // Face A / Cross
};

// ─── DIFFICULTY PROFILES ─────────────────────────────────────
// Each profile defines the INITIAL (t=0) values.
// Progressive scaling is applied on top of these over play time.
const DIFF_PROFILES = {
    easy: {
        label:        'EASY',
        color:        '#34d399',
        spawnStart:   2800,   // ms between spawns at start (v4: tighter)
        spawnMin:     1100,   // fastest spawn rate — cap (v4: harder)
        speedStart:   3.2,    // initial launch speed
        speedMax:     6.8,    // fastest speed (v4: harder cap)
        horizStart:   1.2,    // initial horizontal drift magnitude
        horizMax:     3.5,    // (v4: harder cap)
        spinStart:    0.03,
        spinMax:      0.13,   // (v4: harder cap)
        swerveChance: 0.08,   // lower swerve probability on easy
        rampSecs:     80,     // full difficulty reached at 80 s (v4)
    },
    normal: {
        label:        'NORMAL',
        color:        '#fbbf24',
        spawnStart:   2000,
        spawnMin:     650,    // ~1.5 targets/s at full heat (v4: harder)
        speedStart:   4.5,
        speedMax:     9.2,    // (v4: harder cap)
        horizStart:   2.0,
        horizMax:     5.5,    // (v4: harder cap)
        spinStart:    0.05,
        spinMax:      0.22,   // (v4: harder cap)
        swerveChance: 0.13,
        rampSecs:     80,     // full difficulty reached at 80 s (v4)
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

    // ── v4: delta-time accumulator ────────────────────────
    rafTs:       0,     // timestamp of last rAF call (ms)
    accumulator: 0,     // physics debt (ms)

    // ── v4: gamepad state ─────────────────────────────────
    padIndex:        -1,
    padFireWasDown:  false,
    padStartWasDown: false,
    padAimActive:    false,   // true while stick is outside deadzone

    // ── v5: D-pad pause-menu navigation ──────────────────
    padDpadWasDown:  { up: false, down: false, a: false },
    pauseNavIndex:   0,       // which pause button is currently focused
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
        padPreset:       'default',   // v4: persisted controller preset
        // v5: advanced controller settings
        padSensitivity:  5,           // 1–10
        padDeadzone:     18,          // 5–40 (percent, stored as integer)
        padAimAccel:     50,          // 0–100
        padVibration:    true,
        padAimAssist:    false,
    };
    try { return Object.assign({}, defaults, JSON.parse(localStorage.getItem('tsp_settings') || '{}')); }
    catch { return { ...defaults }; }
})();

function saveSettings() {
    try { localStorage.setItem('tsp_settings', JSON.stringify(settings)); } catch {}
}

// ════════════════════════════════════════════════════════════
// ─── v6: PERSISTENT META-INVENTORY (Daily Vault packs) ───────
// ════════════════════════════════════════════════════════════

const META_KEY  = 'trapShootingPro_meta';
const PACK_CAP  = 3; // strict max per item type

// All pack types and their cross-mode eligibility / visuals
const PACK_CATALOGUE = {
    safetyNet:   { label: 'Safety Net',   mode: 'any',   color: '#8b5cf6', summary: 'Universal · blocks the next missed click or life penalty.' },
    cryoFreeze:  { label: 'Cryo Freeze',  mode: 'any',   color: '#06b6d4', summary: 'Universal · halves target velocity for a short window.' },
    multiplier:  { label: 'Multiplier',   mode: 'any',   color: '#f97316', summary: 'Universal · doubles all point yields for 10 seconds.' },
    flameRounds: { label: 'Flame Rounds', mode: 'any',   color: '#ef4444', summary: 'Universal · explosive AoE chain reactions on hit. Now fully compatible across Lives and Time Attack modes!' },
    medicClay:   { label: 'Medic Clay',   mode: 'lives', color: '#10b981', summary: 'Lives Mode only · restores 1 life.' },
    frenzy:      { label: 'Frenzy',       mode: 'timed', color: '#eab308', summary: 'Timed Mode only · spawns a rapid-fire wave cluster.' },
};
const PACK_KEYS = Object.keys(PACK_CATALOGUE);

const DAY_MS = 86400000;

function loadMeta() {
    const defaults = {
        lastClaimTimestamp: null,
        lastSeenVersion:    null,
        pendingOverflowBonus: 0,
        packs: { safetyNet: 0, cryoFreeze: 0, multiplier: 0, flameRounds: 0, medicClay: 0, frenzy: 0 },
    };
    try {
        const stored = JSON.parse(localStorage.getItem(META_KEY) || '{}');
        return {
            ...defaults,
            ...stored,
            packs: { ...defaults.packs, ...(stored.packs || {}) },
        };
    } catch { return defaults; }
}

const Meta = loadMeta();

function saveMeta() {
    try { localStorage.setItem(META_KEY, JSON.stringify(Meta)); } catch {}
}

function canClaimVault() {
    return Meta.lastClaimTimestamp == null || (Date.now() - Meta.lastClaimTimestamp) >= DAY_MS;
}

function msUntilNextVault() {
    if (Meta.lastClaimTimestamp == null) return 0;
    return Math.max(0, DAY_MS - (Date.now() - Meta.lastClaimTimestamp));
}

function formatCountdown(ms) {
    const totalSec = Math.ceil(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = n => String(n).padStart(2, '0');
    return `⏳ Next Drop: ${pad(h)}:${pad(m)}:${pad(s)}`;
}

// Roll a random pack, auto-rerolling away from maxed slots.
// Returns the pack key, or null if every slot is at the cap (overflow bonus).
function rollVaultReward() {
    const eligible = PACK_KEYS.filter(k => Meta.packs[k] < PACK_CAP);
    if (eligible.length === 0) return null; // all maxed → overflow bonus
    return eligible[Math.floor(Math.random() * eligible.length)];
}

function grantPack(key) {
    Meta.packs[key] = Math.min(PACK_CAP, (Meta.packs[key] || 0) + 1);
    saveMeta();
}

function consumePack(key) {
    if (Meta.packs[key] > 0) {
        Meta.packs[key]--;
        saveMeta();
        return true;
    }
    return false;
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

// v4: reaches 1.0 at profile.rampSecs (80 s), then gently continues.
// Engine.playTimeSec stops ticking while paused — scaling freezes too.
function getProgression() {
    const p = getProfile();
    const t = Math.min(Engine.playTimeSec / p.rampSecs, 1)
            + Math.max(0, (Engine.playTimeSec - p.rampSecs) / (p.rampSecs * 3)) * 0.28;
    return Math.min(t, 1.28);
}

function lerp(a, b, t) { return a + (b - a) * t; }

function getSpawnInterval() {
    const p = getProfile(), t = getProgression();
    return Math.max(p.spawnMin, lerp(p.spawnStart, p.spawnMin, t));
}

function getTargetSpeed() {
    const p = getProfile(), t = getProgression();
    return lerp(p.speedStart, p.speedMax, t) + Math.random() * 1.0;
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
        && Math.random() < p.swerveChance + getProgression() * 0.08;
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
        // v5: safe spawn boundaries — no instant-exit near walls
        const safeMin  = SPAWN_MARGIN + this.radius;
        const safeMax  = VIRTUAL_WIDTH - SPAWN_MARGIN - this.radius;
        this.x         = safeMin + Math.random() * (safeMax - safeMin);
        this.y         = VIRTUAL_HEIGHT - 20;
        this.speedY    = -getTargetSpeed();
        // v5: clamp horizontal drift so target arcs inward, not outward from edges
        const rawDrift = (Math.random() - 0.5) * getHorizDrift();
        const edgeBias = this.x < VIRTUAL_WIDTH / 2 ? 0.3 : -0.3; // gentle inward nudge
        this.speedX    = rawDrift + edgeBias * Math.abs(rawDrift);
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

// ════════════════════════════════════════════════════════════
// ─── v6: MANUAL SIDEBAR PACK ACTIVATION ──────────────────────
// ════════════════════════════════════════════════════════════
// Triggered by clicking a sidebar button during gameplay. Spends
// one banked pack of that type and applies the same effect the
// equivalent in-flight clay would have applied.

function activateBankedPack(key) {
    if (Engine.state !== GameState.PLAYING) return;

    const def = PACK_CATALOGUE[key];
    if (!def) return;

    // Cross-mode restriction enforcement
    if (def.mode === 'lives' && Engine.mode !== 'lives') return;
    if (def.mode === 'timed' && Engine.mode !== 'timed') return;

    if (!consumePack(key)) return; // nothing banked

    playSound('powerup');

    const cx = VIRTUAL_WIDTH / 2, cy = VIRTUAL_HEIGHT / 2;

    switch (key) {
        case 'medicClay':
            if (Engine.lives < MAX_LIVES) {
                Engine.lives++;
                refreshLivesDisplay();
                Engine.floatingTexts.push(new FloatingText(cx, cy - 40, '+1 LIFE', '#10b981', 1.3));
            } else {
                Engine.score += 50;
                DOM.scoreVal.textContent = Engine.score;
                Engine.floatingTexts.push(new FloatingText(cx, cy - 40, 'MAX HP +50', '#22c55e', 1.3));
            }
            break;
        case 'safetyNet':
            Engine.powerUps.safetyNet = 480;
            Engine.floatingTexts.push(new FloatingText(cx, cy - 40, 'SAFETY NET ACTIVE!', def.color, 1.3));
            break;
        case 'cryoFreeze':
            Engine.powerUps.cryo = 300;
            Engine.currentGravity = BASE_GRAVITY * 0.5;
            Engine.floatingTexts.push(new FloatingText(cx, cy - 40, 'CRYO FREEZE ACTIVE!', def.color, 1.3));
            break;
        case 'multiplier':
            Engine.powerUps.multiplier = 360;
            Engine.activeMultiplier = 2;
            Engine.floatingTexts.push(new FloatingText(cx, cy - 40, 'MULTIPLIER ACTIVE!', def.color, 1.3));
            break;
        case 'flameRounds':
            Engine.powerUps.flame = 300;
            triggerShake(5, 12);
            Engine.floatingTexts.push(new FloatingText(cx, cy - 40, 'FLAME ROUNDS ACTIVE!', def.color, 1.3));
            break;
        case 'frenzy':
            Engine.powerUps.frenzy = 240;
            Engine.floatingTexts.push(new FloatingText(cx, cy - 40, 'FRENZY ACTIVE!', def.color, 1.3));
            break;
    }

    refreshSidebarUI();

    // Visual "just used" pulse on the button
    const btn = document.querySelector(`.pack-btn[data-pack="${key}"]`);
    if (btn) {
        btn.classList.remove('pack-just-used');
        void btn.offsetWidth;
        btn.classList.add('pack-just-used');
    }
}

// Refresh sidebar visibility, counts, lock states, and tooltips
function refreshSidebarUI() {
    if (!DOM.packBtns) return;
    DOM.packBtns.forEach(btn => {
        const key = btn.dataset.pack;
        const count = Meta.packs[key] || 0;
        const countEl = btn.querySelector('.pack-count');
        if (countEl) countEl.textContent = `${count}/${PACK_CAP}`;

        const modeLock = btn.dataset.modeLock; // 'lives' | 'timed' | undefined
        const tooltip  = btn.querySelector('.pack-tooltip');
        let incompatible = false;

        if (modeLock === 'lives' && Engine.mode !== 'lives') incompatible = true;
        if (modeLock === 'timed' && Engine.mode !== 'timed') incompatible = true;

        btn.classList.remove('pack-locked', 'pack-locked-hoverable', 'pack-empty');

        if (incompatible) {
            btn.classList.add('pack-locked-hoverable');
            btn.disabled = true;
            if (tooltip) {
                tooltip.textContent = modeLock === 'lives'
                    ? 'Incompatible Mode (Lives Only)'
                    : 'Incompatible Mode (Timed Only)';
                tooltip.classList.add('tooltip-warning');
            }
        } else {
            btn.disabled = count <= 0;
            if (count <= 0) btn.classList.add('pack-empty');
            if (tooltip) {
                tooltip.classList.remove('tooltip-warning');
                const def = PACK_CATALOGUE[key];
                tooltip.textContent = def ? def.summary : '';
            }
        }
    });
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

// ════════════════════════════════════════════════════════════
// ─── GAMEPAD API (v4) ─────────────────────────────────────────
// ════════════════════════════════════════════════════════════

const PAD_DEADZONE  = 0.18;   // default — overridden at runtime by settings.padDeadzone
const PAD_AIM_SPEED = 380;    // base virtual px/s — scaled by settings.padSensitivity

function getActivePad() {
    if (!navigator.getGamepads) return null;
    const pads = navigator.getGamepads();
    if (Engine.padIndex >= 0 && pads[Engine.padIndex]) return pads[Engine.padIndex];
    for (let i = 0; i < pads.length; i++) {
        if (pads[i]) { Engine.padIndex = i; return pads[i]; }
    }
    return null;
}

// v5: helper — move D-pad focus ring on pause menu buttons
function pauseNavMove(delta) {
    const btns = document.querySelectorAll('.pause-nav-btn');
    if (!btns.length) return;
    btns[Engine.pauseNavIndex]?.classList.remove('pad-focused');
    Engine.pauseNavIndex = (Engine.pauseNavIndex + delta + btns.length) % btns.length;
    btns[Engine.pauseNavIndex]?.classList.add('pad-focused');
    btns[Engine.pauseNavIndex]?.focus();
}

function pauseNavConfirm() {
    const btns = document.querySelectorAll('.pause-nav-btn');
    btns[Engine.pauseNavIndex]?.click();
}

// Called once per rAF while PLAYING or PAUSED.
function padPollGamepad(dt) {
    const pad = getActivePad();
    if (!pad) return;

    const preset   = PAD_PRESETS[settings.padPreset] || PAD_PRESETS.default;
    const deadzone = (settings.padDeadzone || 18) / 100;  // v5: live from settings
    const sensMult = (settings.padSensitivity || 5) / 5;  // v5: 1–10 → 0.2–2.0
    // v5: aim acceleration — blend between linear and squared response
    const accel    = (settings.padAimAccel || 50) / 100;

    // ── L-stick aim (PLAYING only) ───────────────────────────
    if (Engine.state === GameState.PLAYING) {
        const ax = pad.axes[0] ?? 0;
        const ay = pad.axes[1] ?? 0;
        const mag = Math.hypot(ax, ay);

        Engine.padAimActive = mag > deadzone;
        if (Engine.padAimActive) {
            // v5: blend linear + squared response for aim acceleration
            const normalised = (mag - deadzone) / (1 - deadzone);
            const response   = lerp(normalised, normalised * normalised, accel);
            const scale      = (dt / 60) * PAD_AIM_SPEED * sensMult * response;
            Engine.mouseX = Math.max(0, Math.min(VIRTUAL_WIDTH,  Engine.mouseX + (ax / mag) * scale));
            Engine.mouseY = Math.max(0, Math.min(VIRTUAL_HEIGHT, Engine.mouseY + (ay / mag) * scale));
        }

        // v5: aim assist — pull crosshair toward nearest target when close
        if (settings.padAimAssist && Engine.padAimActive && Engine.targets.length) {
            const assistRadius = 60;
            let nearest = null, nearestDist = Infinity;
            Engine.targets.forEach(t => {
                const d = Math.hypot(Engine.mouseX - t.x, Engine.mouseY - t.y);
                if (d < assistRadius && d < nearestDist) { nearest = t; nearestDist = d; }
            });
            if (nearest) {
                const strength = 0.08 * (1 - nearestDist / assistRadius);
                Engine.mouseX += (nearest.x - Engine.mouseX) * strength;
                Engine.mouseY += (nearest.y - Engine.mouseY) * strength;
            }
        }
    }

    // ── Fire button — rising edge (PLAYING only) ─────────────
    const fireDown = !!pad.buttons[preset.fireBtn]?.pressed;
    if (fireDown && !Engine.padFireWasDown && Engine.state === GameState.PLAYING) {
        tryInitAudio();
        executeShot();
        // v5: vibration on fire (if supported and enabled)
        if (settings.padVibration && pad.vibrationActuator) {
            pad.vibrationActuator.playEffect('dual-rumble', {
                startDelay: 0, duration: 80, weakMagnitude: 0.3, strongMagnitude: 0.6,
            }).catch(() => {});
        }
    }
    Engine.padFireWasDown = fireDown;

    // ── Start / Options → pause / resume (any non-game-over state) ──
    // v5: fixed — now correctly handles both PLAYING→PAUSED and PAUSED→PLAYING
    const startDown = !!pad.buttons[preset.pauseBtn]?.pressed;
    if (startDown && !Engine.padStartWasDown) {
        if (Engine.state === GameState.PLAYING) {
            pauseGame();
        } else if (Engine.state === GameState.PAUSED) {
            resumeGame();   // v5: resume now fires reliably
        }
    }
    Engine.padStartWasDown = startDown;

    // ── D-pad pause menu navigation (PAUSED only) ────────────
    if (Engine.state === GameState.PAUSED) {
        const dUp   = !!pad.buttons[12]?.pressed;
        const dDown = !!pad.buttons[13]?.pressed;
        const dA    = !!(pad.buttons[0]?.pressed || pad.buttons[1]?.pressed);  // A / B confirm

        if (dUp   && !Engine.padDpadWasDown.up)   pauseNavMove(-1);
        if (dDown && !Engine.padDpadWasDown.down)  pauseNavMove(+1);
        if (dA    && !Engine.padDpadWasDown.a)     pauseNavConfirm();

        Engine.padDpadWasDown.up   = dUp;
        Engine.padDpadWasDown.down = dDown;
        Engine.padDpadWasDown.a    = dA;
    }
}

// ── Connect / disconnect events ──────────────────────────────
window.addEventListener('gamepadconnected', (e) => {
    Engine.padIndex = e.gamepad.index;
    updateControllerUI(true, e.gamepad.id);
});

window.addEventListener('gamepaddisconnected', () => {
    Engine.padIndex        = -1;
    Engine.padFireWasDown  = false;
    Engine.padStartWasDown = false;
    Engine.padAimActive    = false;
    updateControllerUI(false);
});

// ── Controller UI helpers ────────────────────────────────────
function updateControllerUI(connected, label = '') {
    const sec  = document.getElementById('controllerSection');
    const adv  = document.getElementById('padAdvancedSection');
    const dot  = document.getElementById('padDot');
    const txt  = document.getElementById('padStatusText');
    const leg  = document.getElementById('padLegend');
    const bdg  = document.getElementById('controllerBadge');

    if (connected) {
        sec.classList.remove('pad-section-off');
        sec.classList.add('pad-section-on');
        if (adv) { adv.classList.remove('pad-section-off'); adv.classList.add('pad-section-on'); }
        dot.classList.add('connected');
        txt.textContent = label
            ? label.substring(0, 28) + (label.length > 28 ? '…' : '')
            : 'Controller connected';
        leg.classList.remove('hidden');
        if (bdg) bdg.classList.remove('hidden');
    } else {
        sec.classList.add('pad-section-off');
        sec.classList.remove('pad-section-on');
        if (adv) { adv.classList.add('pad-section-off'); adv.classList.remove('pad-section-on'); }
        dot.classList.remove('connected');
        txt.textContent = 'No controller detected';
        leg.classList.add('hidden');
        if (bdg) bdg.classList.add('hidden');
    }
}

function applyPresetUI() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === settings.padPreset);
    });
    const p = PAD_PRESETS[settings.padPreset] || PAD_PRESETS.default;
    const lbl = document.getElementById('legendFireLabel');
    if (lbl) lbl.textContent = p.fireLabel;
}

// ════════════════════════════════════════════════════════════
// ─── DELTA-TIME FIXED-TIMESTEP LOOP (v4) ─────────────────────
// ════════════════════════════════════════════════════════════
/*
  Architecture:
  • rAF callback accumulates real elapsed ms.
  • physicsStep() runs in 16.667 ms increments (dt = 1 tick).
  • renderFrame() fires exactly once per rAF.
  • High-refresh screens run same physics as 60 Hz — no drift.
  • After pause/tab-focus: capped at MAX_STEPS steps.
*/

function rafLoop(timestamp) {
    if (Engine.state !== GameState.PLAYING && Engine.state !== GameState.PAUSED) return;

    // ── Poll gamepad always (both PLAYING and PAUSED) ────────
    // PAUSED polling handles D-pad nav and Start→resume reliably.
    if (Engine.padIndex >= 0 || getActivePad()) {
        padPollGamepad(1);
    }

    if (Engine.state !== GameState.PLAYING) {
        // Keep polling while paused but don't advance physics or render game
        Engine.animFrameId = requestAnimationFrame(rafLoop);
        return;
    }

    if (Engine.rafTs === 0) Engine.rafTs = timestamp;
    const elapsed = Math.min(timestamp - Engine.rafTs, FIXED_STEP * MAX_STEPS);
    Engine.rafTs       = timestamp;
    Engine.accumulator += elapsed;

    let steps = 0;
    while (Engine.accumulator >= FIXED_STEP && steps < MAX_STEPS) {
        physicsStep();
        Engine.accumulator -= FIXED_STEP;
        steps++;
    }

    renderFrame();
    Engine.animFrameId = requestAnimationFrame(rafLoop);
}

// ── PHYSICS STEP — simulation only, no drawing ───────────────
function physicsStep() {
    const dt = 1; // 1 unit = one 60 Hz tick

    // Power-up timers
    for (const k in Engine.powerUps) {
        if (Engine.powerUps[k] > 0) {
            Engine.powerUps[k] -= dt;
            if (Engine.powerUps[k] <= 0) {
                Engine.powerUps[k] = 0;
                if (k === 'cryo')       Engine.currentGravity = BASE_GRAVITY;
                if (k === 'multiplier') Engine.activeMultiplier = 1;
            }
        }
    }

    // Warning blink counter
    Engine.warningBlink = (Engine.warningBlink + dt) % 30;

    // Blast ring animation
    if (Engine.blastRing.active) {
        Engine.blastRing.alpha  -= 0.07 * dt;
        Engine.blastRing.radius += 2.5  * dt;
        if (Engine.blastRing.alpha <= 0) Engine.blastRing.active = false;
    }

    // Shake decrement
    if (Engine.shake.duration > 0) Engine.shake.duration--;

    // Targets
    for (let i = Engine.targets.length - 1; i >= 0; i--) {
        const t = Engine.targets[i];
        t.update(dt);

        const oob = t.y > VIRTUAL_HEIGHT + 60 || t.x < -80 || t.x > VIRTUAL_WIDTH + 80;
        if (oob) {
            Engine.targets.splice(i, 1);

            if (Engine.mode === 'lives' && t.type === 'normal') {
                if (Engine.powerUps.safetyNet > 0) {
                    Engine.floatingTexts.push(new FloatingText(
                        Math.min(Math.max(t.x, 60), VIRTUAL_WIDTH - 60),
                        VIRTUAL_HEIGHT - 50, 'SAVED!', '#a78bfa'));
                } else {
                    Engine.comboCount = 0;
                    refreshComboDisplay();

                    Engine.lives--;
                    refreshLivesDisplay();
                    triggerShake(7, 15);
                    Engine.floatingTexts.push(new FloatingText(
                        Math.min(Math.max(t.x, 60), VIRTUAL_WIDTH - 60),
                        VIRTUAL_HEIGHT - 60, '-1 LIFE', '#f87171'));
                    if (Engine.lives <= 0) { gameOver(); return; }
                }
            }
            // Swerve misses: no life cost, no combo break
        }
    }

    // Particles
    for (let i = Engine.particles.length - 1; i >= 0; i--) {
        Engine.particles[i].update(dt);
        if (Engine.particles[i].life <= 0) Engine.particles.splice(i, 1);
    }

    // Floating texts
    for (let i = Engine.floatingTexts.length - 1; i >= 0; i--) {
        Engine.floatingTexts[i].update(dt);
        if (Engine.floatingTexts[i].life <= 0) Engine.floatingTexts.splice(i, 1);
    }
}

// ── RENDER FRAME — drawing only, no physics mutations ────────
function renderFrame() {
    ctx.save();
    ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    const g = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
    if      (Engine.powerUps.cryo  > 0) { g.addColorStop(0, '#153243'); g.addColorStop(1, '#2a4454'); }
    else if (Engine.powerUps.flame > 0) { g.addColorStop(0, '#1a0a00'); g.addColorStop(1, '#2d1200'); }
    else                                { g.addColorStop(0, '#0c1524'); g.addColorStop(1, '#1e293b'); }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    applyShake();

    if (Engine.powerUps.safetyNet > 0) {
        const a = Math.min(1, Engine.powerUps.safetyNet / 60);
        ctx.fillStyle = `rgba(124,58,237,${0.6 * a})`;
        ctx.fillRect(0, VIRTUAL_HEIGHT - 24, VIRTUAL_WIDTH, 4);
        ctx.shadowColor = '#7c3aed'; ctx.shadowBlur = 12 * a;
        ctx.fillStyle = `rgba(139,92,246,${0.3 * a})`;
        ctx.fillRect(0, VIRTUAL_HEIGHT - 28, VIRTUAL_WIDTH, 8);
        ctx.shadowBlur = 0;
    }

    ctx.fillStyle = '#14532d';
    ctx.fillRect(0, VIRTUAL_HEIGHT - 20, VIRTUAL_WIDTH, 20);

    drawDangerIndicators();

    Engine.targets.forEach(t => t.draw());
    Engine.particles.forEach(p => p.draw());
    Engine.floatingTexts.forEach(f => f.draw());

    // Blast ring draw (values already mutated in physicsStep)
    const br = Engine.blastRing;
    if (br.active && br.alpha > 0) {
        ctx.save();
        ctx.globalAlpha = br.alpha;
        ctx.strokeStyle = '#f97316'; ctx.lineWidth = 3;
        ctx.shadowColor = '#fb923c'; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(br.x, br.y, br.radius, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = br.alpha * 0.15;
        ctx.fillStyle   = '#ef4444';
        ctx.beginPath(); ctx.arc(br.x, br.y, br.radius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    drawPowerUpHUD();
    drawCrosshair();

    ctx.restore();
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

    // v6: apply any banked overflow bonus from a maxed-out Daily Vault claim
    if (Meta.pendingOverflowBonus > 0) {
        Engine.score += Meta.pendingOverflowBonus;
        DOM.scoreVal.textContent = Engine.score;
        Engine.floatingTexts.push(new FloatingText(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 - 60,
            `+${Meta.pendingOverflowBonus} VAULT BONUS!`, '#fbbf24', 1.4));
        Meta.pendingOverflowBonus = 0;
        saveMeta();
    }

    // v6: reveal the floating power-up sidebar and sync its lock/count state
    if (DOM.powerupSidebar) DOM.powerupSidebar.classList.remove('hidden');
    refreshSidebarUI();

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
        // v5: timerInner is the upgraded span
        const timerSpan = document.getElementById('timerInner') || DOM.timerVal;
        timerSpan.textContent = Engine.gameTimer + 's';
        DOM.livesDisplay.classList.add('hidden');
        Engine.countdownInterval = setInterval(() => {
            if (Engine.state !== GameState.PLAYING) return;
            Engine.gameTimer--;
            const span = document.getElementById('timerInner') || DOM.timerVal;
            span.textContent = Engine.gameTimer + 's';
            // v5: urgency effects when ≤10 s remain
            const card = DOM.timerDisplay;
            if (Engine.gameTimer <= 10 && Engine.gameTimer > 0) {
                card.classList.add('timer-urgent');
                span.classList.add('timer-pulse');
                setTimeout(() => span.classList.remove('timer-pulse'), 220);
            } else if (Engine.gameTimer <= 0) {
                card.classList.remove('timer-urgent');
                gameOver();
            }
        }, 1000);
    }

    Engine.state = GameState.PLAYING;
    startPlayTimer();
    startSpawnScheduler();
    Engine.rafTs       = 0;
    Engine.accumulator = 0;
    Engine.padFireWasDown   = false;
    Engine.padStartWasDown  = false;
    Engine.padAimActive     = false;
    Engine.padDpadWasDown   = { up: false, down: false, a: false };
    Engine.pauseNavIndex    = 0;
    // Show controller HUD badge if a pad is already live
    const _activePad = getActivePad();
    if (_activePad) document.getElementById('controllerBadge')?.classList.remove('hidden');
    Engine.animFrameId = requestAnimationFrame(rafLoop);
}

function pauseGame() {
    if (Engine.state !== GameState.PLAYING) return;
    Engine.state = GameState.PAUSED;
    // Stop spawn + play-time timer — difficulty scaling freezes ✓
    stopSpawnScheduler();
    stopPlayTimer();
    // Reset rAF timestamp so physics doesn't catch up a stale gap on resume
    Engine.rafTs       = 0;
    Engine.accumulator = 0;
    // v5: seed D-pad focus to first pause button
    Engine.pauseNavIndex = 0;
    Engine.padDpadWasDown = { up: false, down: false, a: false };
    document.querySelectorAll('.pause-nav-btn').forEach((b, i) => b.classList.toggle('pad-focused', i === 0));
    DOM.pauseOverlay.classList.remove('hidden');
    // v5: keep rafLoop alive while paused (for D-pad nav + Start→resume)
    // cancelAnimationFrame NOT called here intentionally
}

function resumeGame() {
    if (Engine.state !== GameState.PAUSED) return;
    Engine.state = GameState.PLAYING;
    DOM.pauseOverlay.classList.remove('hidden');
    // v5: clear pad-focused ring from pause buttons
    document.querySelectorAll('.pause-nav-btn').forEach(b => b.classList.remove('pad-focused'));
    DOM.pauseOverlay.classList.add('hidden');
    // Restart spawn + play-time; rafLoop already running
    startPlayTimer();
    startSpawnScheduler();
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
    // v6: hide the floating power-up sidebar once the match ends
    if (DOM.powerupSidebar) DOM.powerupSidebar.classList.add('hidden');
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
    document.getElementById('controllerBadge')?.classList.add('hidden');
    DOM.timerDisplay.classList.remove('timer-urgent');
    if (DOM.powerupSidebar) DOM.powerupSidebar.classList.add('hidden');
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

function applyAdvancedControllerUI() {
    const sens   = document.getElementById('sensitivitySlider');
    const sensLbl= document.getElementById('sensitivityLabel');
    const dz     = document.getElementById('deadzoneSlider');
    const dzLbl  = document.getElementById('deadzoneLabel');
    const accel  = document.getElementById('aimAccelSlider');
    const accelLbl = document.getElementById('aimAccelLabel');
    const vibBtn = document.getElementById('vibrationToggle');
    const assistBtn = document.getElementById('aimAssistToggle');

    if (sens)    { sens.value         = settings.padSensitivity; }
    if (sensLbl) { sensLbl.textContent= settings.padSensitivity; }
    if (dz)      { dz.value           = settings.padDeadzone; }
    if (dzLbl)   { dzLbl.textContent  = settings.padDeadzone + '%'; }
    if (accel)   { accel.value        = settings.padAimAccel; }
    if (accelLbl){ accelLbl.textContent= settings.padAimAccel + '%'; }

    if (vibBtn)  {
        const on = settings.padVibration;
        vibBtn.dataset.on = on;
        vibBtn.className = `pad-toggle-btn w-10 h-5 rounded-full relative transition-all ${on ? 'bg-violet-600' : 'bg-slate-700'}`;
        const knob = vibBtn.querySelector('.pad-toggle-knob');
        if (knob) knob.className = `pad-toggle-knob absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? 'right-0.5' : 'left-0.5'}`;
    }
    if (assistBtn) {
        const on = settings.padAimAssist;
        assistBtn.dataset.on = on;
        assistBtn.className = `pad-toggle-btn w-10 h-5 rounded-full relative transition-all ${on ? 'bg-violet-600' : 'bg-slate-700'}`;
        const knob = assistBtn.querySelector('.pad-toggle-knob');
        if (knob) knob.className = `pad-toggle-knob absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? 'right-0.5' : 'left-0.5'}`;
    }
}

function syncSettingsToUI() {
    DOM.resolutionSelect.value = settings.displaySize || 'auto';
    applyVolumeUI();
    applyCrosshairSwatchUI();
    applyStyleSwatchUI();
    applyDensitySwatchUI();
    applyDifficultyUI();
    applyPresetUI();
    applyAdvancedControllerUI();
    // Restore controller section state based on whether a pad is live
    const _pad = getActivePad();
    updateControllerUI(!!_pad, _pad?.id || '');
}

// ════════════════════════════════════════════════════════════
// ─── v6: DAILY VAULT UI ───────────────────────────────────────
// ════════════════════════════════════════════════════════════

const OVERFLOW_BONUS_SCORE = 25; // awarded when every slot is already 3/3

let vaultCountdownInterval = null;

// Refreshes the main-menu Daily Vault button: glowing/available vs ticking cooldown
function updateVaultButtonUI() {
    if (!DOM.dailyVaultButton) return;

    if (canClaimVault()) {
        DOM.dailyVaultButton.classList.add('vault-available', 'animate-pulse');
        DOM.vaultButtonInner.innerHTML = `<i class="fa-solid fa-vault"></i> Daily Vault`;
        clearInterval(vaultCountdownInterval);
        vaultCountdownInterval = null;
    } else {
        DOM.dailyVaultButton.classList.remove('vault-available', 'animate-pulse');
        const tick = () => {
            if (canClaimVault()) {
                updateVaultButtonUI();
                return;
            }
            DOM.vaultButtonInner.textContent = formatCountdown(msUntilNextVault());
        };
        tick();
        clearInterval(vaultCountdownInterval);
        vaultCountdownInterval = setInterval(tick, 1000);
    }
}

// Refreshes the cooldown countdown text shown inside the vault overlay itself
function updateVaultOverlayCountdown() {
    if (!DOM.vaultCountdownText) return;
    DOM.vaultCountdownText.textContent = formatCountdown(msUntilNextVault());
}

let vaultOverlayCountdownInterval = null;

function openVaultOverlay() {
    DOM.gameOverlay.classList.add('hidden');
    DOM.vaultOverlay.classList.remove('hidden');

    DOM.vaultIdleState.classList.add('hidden');
    DOM.vaultCooldownState.classList.add('hidden');
    DOM.vaultRewardState.classList.add('hidden');

    clearInterval(vaultOverlayCountdownInterval);

    if (canClaimVault()) {
        DOM.vaultIdleState.classList.remove('hidden');
    } else {
        DOM.vaultCooldownState.classList.remove('hidden');
        updateVaultOverlayCountdown();
        vaultOverlayCountdownInterval = setInterval(updateVaultOverlayCountdown, 1000);
    }
}

function closeVaultOverlay() {
    clearInterval(vaultOverlayCountdownInterval);
    DOM.vaultOverlay.classList.add('hidden');
    DOM.gameOverlay.classList.remove('hidden');
    updateVaultButtonUI();
    refreshSidebarUI();
}

// Runs the full 1.5s box-opening sequence: violent rock → white flare → reward reveal
function claimDailyVault() {
    if (!canClaimVault()) return;

    DOM.claimVaultButton.disabled = true;
    DOM.vaultChest.classList.add('vault-rocking');
    playSound('powerup');

    setTimeout(() => {
        // Full-screen flare burst
        DOM.vaultFlash.classList.remove('hidden');
        DOM.vaultFlash.classList.add('vault-flash-burst');

        // Resolve the reward
        const rewardKey = rollVaultReward();
        Meta.lastClaimTimestamp = Date.now();

        let title, name, summary, icon, color;

        if (rewardKey) {
            grantPack(rewardKey);
            const def = PACK_CATALOGUE[rewardKey];
            title   = 'YOU GOT...';
            name    = def.label;
            summary = def.summary;
            icon    = ({ safetyNet: '🛡️', cryoFreeze: '❄️', multiplier: '✖️2', flameRounds: '🔥', medicClay: '➕', frenzy: '⭐' })[rewardKey] || '✨';
            color   = def.color;
        } else {
            // All packs maxed → bank a one-time overflow score bonus,
            // applied automatically to the player's next match start.
            Meta.pendingOverflowBonus = (Meta.pendingOverflowBonus || 0) + OVERFLOW_BONUS_SCORE;
            title   = 'VAULT FULL!';
            name    = `+${OVERFLOW_BONUS_SCORE} Bonus`;
            summary = 'All packs are maxed at 3/3 — this bonus will be added to your next match score.';
            icon    = '💰';
            color   = '#fbbf24';
        }

        saveMeta();

        DOM.vaultRewardIcon.textContent   = icon;
        DOM.vaultRewardTitle.textContent  = title;
        DOM.vaultRewardName.textContent   = name;
        DOM.vaultRewardName.style.color   = color;
        DOM.vaultRewardSummary.textContent= summary;

        DOM.vaultIdleState.classList.add('hidden');
        DOM.vaultRewardState.classList.remove('hidden');
        DOM.vaultRewardState.classList.add('vault-reward-enter');

        refreshSidebarUI();
        updateVaultButtonUI();

        setTimeout(() => {
            DOM.vaultFlash.classList.remove('vault-flash-burst');
            DOM.vaultFlash.classList.add('hidden');
        }, 500);

        DOM.vaultChest.classList.remove('vault-rocking');
        DOM.claimVaultButton.disabled = false;
    }, 1500); // matches the 1.5s box-opening animation duration
}

// ════════════════════════════════════════════════════════════
// ─── v6: CHANGELOG ENGINE ─────────────────────────────────────
// ════════════════════════════════════════════════════════════

function isChangelogUnseen() {
    return Meta.lastSeenVersion !== CURRENT_VERSION;
}

function updateChangelogBadge() {
    if (!DOM.whatsNewBadge) return;
    DOM.whatsNewBadge.classList.toggle('hidden', !isChangelogUnseen());
}

function renderChangelog() {
    if (!DOM.changelogList) return;
    DOM.changelogList.innerHTML = CHANGELOG_HISTORY.map(entry => `
        <div class="changelog-entry">
            <div class="flex items-baseline justify-between gap-2">
                <span class="changelog-version">v${entry.v}</span>
                <span class="changelog-date">${entry.date}</span>
            </div>
            <ul>
                ${entry.notes.map(n => `<li>${n}</li>`).join('')}
            </ul>
        </div>
    `).join('');
}

function openChangelogOverlay() {
    renderChangelog();
    DOM.gameOverlay.classList.add('hidden');
    DOM.changelogOverlay.classList.remove('hidden');
}

function closeChangelogOverlay(markSeen) {
    DOM.changelogOverlay.classList.add('hidden');
    DOM.gameOverlay.classList.remove('hidden');
    if (markSeen) {
        Meta.lastSeenVersion = CURRENT_VERSION;
        saveMeta();
        updateChangelogBadge();
    }
}

// ════════════════════════════════════════════════════════════
// ─── v6: TAB-FOCUS SAFETY NET (visibility-pause autofix) ─────
// ════════════════════════════════════════════════════════════
// Prevents target-pooling bugs when switching tabs mid-match by
// immediately pausing the moment the tab is hidden.

document.addEventListener('visibilitychange', () => {
    if (document.hidden && Engine.state === GameState.PLAYING) {
        pauseGame();
    }
});

// ─── EVENT LISTENERS ──────────────────────────────────────────

// Canvas touch
canvas.addEventListener('touchstart', (e) => {
    if (e.cancelable) e.preventDefault();
    Engine.isTouchMode = true;
    Engine.padAimActive = false;
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
    Engine.isTouchMode  = false;
    Engine.padAimActive = false;
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

// v4: controller preset buttons
document.querySelectorAll('.preset-btn').forEach(btn => btn.addEventListener('click', () => {
    settings.padPreset = btn.dataset.preset;
    saveSettings(); applyPresetUI();
}));

// v5: Play Again button
const _playAgainBtn = document.getElementById('playAgainButton');
if (_playAgainBtn) {
    _playAgainBtn.addEventListener('click', () => {
        // Replay the same mode that just ended
        const replayMode = Engine.mode;
        resetToMainMenu();
        // Tiny delay so resetToMainMenu finishes DOM cleanup before startGame
        setTimeout(() => startGame(replayMode), 50);
    });
}

// v5: Advanced controller settings listeners
(function wireAdvancedPadSettings() {
    const sens = document.getElementById('sensitivitySlider');
    if (sens) sens.addEventListener('input', e => {
        settings.padSensitivity = parseInt(e.target.value, 10);
        const lbl = document.getElementById('sensitivityLabel');
        if (lbl) lbl.textContent = settings.padSensitivity;
        saveSettings();
    });

    const dz = document.getElementById('deadzoneSlider');
    if (dz) dz.addEventListener('input', e => {
        settings.padDeadzone = parseInt(e.target.value, 10);
        const lbl = document.getElementById('deadzoneLabel');
        if (lbl) lbl.textContent = settings.padDeadzone + '%';
        saveSettings();
    });

    const accel = document.getElementById('aimAccelSlider');
    if (accel) accel.addEventListener('input', e => {
        settings.padAimAccel = parseInt(e.target.value, 10);
        const lbl = document.getElementById('aimAccelLabel');
        if (lbl) lbl.textContent = settings.padAimAccel + '%';
        saveSettings();
    });

    const vib = document.getElementById('vibrationToggle');
    if (vib) vib.addEventListener('click', () => {
        settings.padVibration = !settings.padVibration;
        saveSettings(); applyAdvancedControllerUI();
    });

    const assist = document.getElementById('aimAssistToggle');
    if (assist) assist.addEventListener('click', () => {
        settings.padAimAssist = !settings.padAimAssist;
        saveSettings(); applyAdvancedControllerUI();
    });
})();

// v5: polished settings scroll — mouse wheel + touch drag
(function initSettingsScroll() {
    const pane = document.getElementById('settingsScroll');
    if (!pane) return;

    // Touch drag scroll
    let touchStartY = 0, scrollStartTop = 0;
    pane.addEventListener('touchstart', e => {
        touchStartY    = e.touches[0].clientY;
        scrollStartTop = pane.scrollTop;
    }, { passive: true });
    pane.addEventListener('touchmove', e => {
        const delta = touchStartY - e.touches[0].clientY;
        pane.scrollTop = scrollStartTop + delta;
    }, { passive: true });

    // Scroll indicator fade — show a subtle glow at bottom when more content below
    pane.addEventListener('scroll', () => {
        const atBottom = pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 4;
        pane.classList.toggle('scroll-at-bottom', atBottom);
    });
})();

// ─── BOOT ────────────────────────────────────────────────────
syncSettingsToUI();
resetToMainMenu();

// ════════════════════════════════════════════════════════════
// ─── v6: EVENT WIRING — Vault, Changelog, Sidebar ────────────
// ════════════════════════════════════════════════════════════

// Daily Vault navigation
if (DOM.dailyVaultButton) DOM.dailyVaultButton.addEventListener('click', openVaultOverlay);
if (DOM.closeVaultButton) DOM.closeVaultButton.addEventListener('click', closeVaultOverlay);
if (DOM.claimVaultButton) DOM.claimVaultButton.addEventListener('click', claimDailyVault);
if (DOM.vaultContinueButton) DOM.vaultContinueButton.addEventListener('click', closeVaultOverlay);

// Changelog navigation
if (DOM.changelogButton) DOM.changelogButton.addEventListener('click', openChangelogOverlay);
if (DOM.closeChangelogButton) DOM.closeChangelogButton.addEventListener('click', () => closeChangelogOverlay(true));
if (DOM.changelogGotItButton) DOM.changelogGotItButton.addEventListener('click', () => closeChangelogOverlay(true));

// Floating power-up sidebar — manual pack activation
DOM.packBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.disabled) return;
        activateBankedPack(btn.dataset.pack);
    });
});

// v6: changelog badge reflects whether the current build has unseen notes
updateChangelogBadge();

// v6: Daily Vault button + boot-time auto-redirect.
// If a drop is available (first run, or 24h elapsed), slide the
// Vault overlay open automatically instead of the plain main menu.
updateVaultButtonUI();
if (canClaimVault()) {
    openVaultOverlay();
}
