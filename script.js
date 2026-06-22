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
const CURRENT_VERSION = "5.2";

const CHANGELOG_HISTORY = [
    {
        v: "5.2",
        date: "6-21-2026",
        notes: [
            "Introduced the full Challenges System — 150 objectives across Easy, Normal, Hard & Mythical tiers",
            "Daily Challenges (7 active slots, resets every 24 h) and Weekly Challenges (7 active slots, resets every 7 days)",
            "Difficulty-balanced selection: guaranteed ≥1 Easy, Normal, Hard per cycle; Mythical has a 3.5% rare roll chance",
            "Rewards on completion — Easy: 1 pack · Normal: 2 · Hard: 3 · Mythical: 4 random power-up packs",
            "Reroll system — 3 daily rerolls and 5 weekly rerolls replace a card with an equivalent-difficulty alternative",
            "Steam-style achievement toast fires the moment a challenge completes mid-match, with a Tone.js chime",
            "Mode labels on every challenge card clearly identify which game mode the objective can be attempted in",
            "Animated mystery-box reveal plays when you claim challenge rewards, showing each pack earned",
            "Notification dot on the Challenges button and Pause menu button highlights unclaimed completions",
        ],
    },
    {
        v: "5.1",
        date: "6-20-2026",
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
        date: "6-18-2026",
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
    // v7: Challenges System
    challengesButton:        document.getElementById('challengesButton'),
    challengesNotifDot:      document.getElementById('challengesNotifDot'),
    pauseChallengesButton:   document.getElementById('pauseChallengesButton'),
    pauseChallengesNotifDot: document.getElementById('pauseChallengesNotifDot'),
    challengesOverlay:       document.getElementById('challengesOverlay'),
    closeChallengesButton:   document.getElementById('closeChallengesButton'),
    challengeTabBtns:        document.querySelectorAll('.challenge-tab-btn'),
    challengeCycleCountdown: document.getElementById('challengeCycleCountdown'),
    challengeRerollCount:    document.getElementById('challengeRerollCount'),
    challengesGrid:          document.getElementById('challengesGrid'),
    toastContainer:          document.getElementById('toastContainer'),
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

    // ── v7: per-run telemetry for Challenges System ───────
    // These reset every startGame() and are read by checkChallengeTelemetry()
    // after every gameplay event (hit, miss, powerup, etc).
    runStats: {
        matchesPlayedLives:   0,
        matchesPlayedTimed:   0,
        normalClaysHit:       0,
        swerveHitsInRow:      0,
        swerveHitsTotal:      0,
        swerveHitsNoMissRun:  0,
        noMissStreak:         0,
        flameMultiKillBest:   0,
        cryoHitsThisWindow:   0,
        cryoNoMissWindow:     true,
        powerUpsUsedTypes:    new Set(),
        powerUpsUsedCount:    0,
        livesLostEarly:       false,
        wasAtOneLifeEarly:    false,
        leftHalfHits:         0,
        rightHalfHits:        0,
        upperHalfHits:        0,
        apexHitsInRow:        0,
        highSpinHits:         0,
        maxSpeedHits:         0,
        consecHitsAllSuccess: 0,
        firstTargetSkipped:   false,
        firstTargetSeen:      false,
        cleanSheetScore:      0,
        cleanSheetBroken:     false,
        safetyNetSaves:       0,
        medicUsedAtOneLife:   false,
        frenzyWindowScore:    0,
        frenzyWaveClearAll:   true,
        gamepadUsed:          false,
        gamepadNonDefault:    false,
        screenShakeCount:     0,
        edgeHits:             [],         // recent {x,t} for edge-to-edge tracking
        simultaneousKills:    0,
        dangerZoneHits:       0,
        boundaryMarginHits:   0,
        multiplierScoreWindow:0,
        zeroDropStreakActive: true,
    },
} ;

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

// ════════════════════════════════════════════════════════════
// ─── v7: CHALLENGES SYSTEM ─────────────────────────────────────
// ════════════════════════════════════════════════════════════
// Fully isolated from META_KEY / tsp_settings to avoid any
// localStorage key collisions. Its own namespace: 'trapShootingPro_challenges'.

const CHALLENGES_KEY = 'trapShootingPro_challenges';
const WEEK_MS = 604800000; // 168 hours

const DAILY_SLOTS    = 7;
const WEEKLY_SLOTS   = 7;
const DAILY_REROLLS  = 3;
const WEEKLY_REROLLS = 5;
const MYTHICAL_ROLL_CHANCE = 0.035; // 3.5%

const REWARD_COUNT = { easy: 1, normal: 2, hard: 3, mythical: 4 };

// ── 150 master challenge definitions ──────────────────────────
// `metric` ties each challenge to a telemetry key tracked during
// gameplay (see Engine.runStats and checkChallengeTelemetry()).
// `target` is the numeric goal. `progress` is populated at runtime.
const CHALLENGE_POOL = [
    // ── EASY (1-45) ──────────────────────────────────────────
    { id: 1,   diff: 'easy', modes: 'both',  title: 'Clay Smash',          desc: 'Destroy a total of 25 standard clays across any match format.',                         metric: 'lifetimeClaysSmashed',       target: 25 },
    { id: 2,   diff: 'easy', modes: 'lives', title: 'First Step',           desc: 'Play 2 complete matches from start to finish in Lives Mode.',                          metric: 'lifetimeMatchesLives',       target: 2 },
    { id: 3,   diff: 'easy', modes: 'timed', title: 'Beat the Clock',       desc: 'Survive for at least 30 seconds in Timed Mode.',                                       metric: 'bestTimedSurvivalSec',       target: 30 },
    { id: 4,   diff: 'easy', modes: 'both',  title: 'Warm-Up Streak',       desc: 'Achieve a consecutive hit combo of 5 targets.',                                        metric: 'bestComboEver',              target: 5 },
    { id: 5,   diff: 'easy', modes: 'both',  title: 'No Miss Spring',       desc: 'Destroy 5 targets in a row without missing a shot.',                                   metric: 'bestNoMissStreak',           target: 5 },
    { id: 6,   diff: 'easy', modes: 'lives', title: 'Double Digit',         desc: 'Reach a score of 30 points in a single Lives Mode game.',                              metric: 'bestLivesScore',             target: 30 },
    { id: 7,   diff: 'easy', modes: 'both',  title: 'Cryo Introduction',    desc: 'Trigger the Cryo Freeze power-up at least once during a match.',                       metric: 'lifetimeCryoTriggers',       target: 1 },
    { id: 8,   diff: 'easy', modes: 'both',  title: 'Casual Play',          desc: 'Spend a total of 3 minutes actively playing the game.',                                metric: 'lifetimePlayTimeSec',        target: 180 },
    { id: 9,   diff: 'easy', modes: 'both',  title: 'Safety First',         desc: 'Have your Safety Net power-up absorb a dropped target.',                               metric: 'lifetimeSafetyNetSaves',     target: 1 },
    { id: 10,  diff: 'easy', modes: 'both',  title: 'Boom Town',            desc: 'Destroy 3 targets using a single Flame Rounds explosion.',                             metric: 'bestFlameMultiKill',         target: 3 },
    { id: 11,  diff: 'easy', modes: 'lives', title: 'Greenhorn Hunter',     desc: 'Complete a match on Easy difficulty without altering settings.',                       metric: 'lifetimeEasyMatchesClean',   target: 1 },
    { id: 12,  diff: 'easy', modes: 'both',  title: 'Double Harvest',       desc: 'Score points while a Multiplier power-up is actively running.',                        metric: 'lifetimeMultiplierScore',    target: 1 },
    { id: 13,  diff: 'easy', modes: 'timed', title: 'Time Collector',       desc: 'Accumulate a total score of 50 points across multiple Timed matches.',                 metric: 'lifetimeTimedScore',         target: 50 },
    { id: 14,  diff: 'easy', modes: 'both',  title: 'Quick Reflex',         desc: 'Hit a target within 0.5 seconds of it spawning on the canvas.',                        metric: 'lifetimeQuickHits',          target: 1 },
    { id: 15,  diff: 'easy', modes: 'both',  title: 'Consistent Gun',       desc: 'Maintain a final match accuracy rating of at least 50%.',                              metric: 'bestAccuracyMatch',          target: 50 },
    { id: 16,  diff: 'easy', modes: 'both',  title: 'Clay Sweeper',         desc: 'Clear an entire visible wave of targets before any hit the floor.',                    metric: 'lifetimeWavesCleared',       target: 1 },
    { id: 17,  diff: 'easy', modes: 'both',  title: 'Vault Raider',         desc: 'Claim your Daily Vault reward and immediately hop into a match.',                      metric: 'lifetimeVaultThenMatch',     target: 1 },
    { id: 18,  diff: 'easy', modes: 'both',  title: 'First Fire',           desc: 'Launch a match using any custom crosshair setting (Classic, Dot, or Circle).',         metric: 'lifetimeMatchesAnyStarted',  target: 1 },
    { id: 19,  diff: 'easy', modes: 'lives', title: 'Medic Call',           desc: 'Activate a Medic Clay while down to your absolute final life.',                        metric: 'lifetimeMedicAtOneLife',     target: 1 },
    { id: 20,  diff: 'easy', modes: 'timed', title: 'Frenzy Farmer',        desc: 'Earn at least 15 points during a single Frenzy wave.',                                 metric: 'bestFrenzyWindowScore',      target: 15 },
    { id: 21,  diff: 'easy', modes: 'both',  title: 'High Altitude',        desc: 'Shoot 10 targets while they are in the top 25% of the screen.',                        metric: 'lifetimeUpperQuarterHits',   target: 10 },
    { id: 22,  diff: 'easy', modes: 'both',  title: 'The Adjuster',         desc: 'Modify any gamepad or mouse sensitivity option in the Settings menu.',                 metric: 'lifetimeSensitivityChanged', target: 1 },
    { id: 23,  diff: 'easy', modes: 'both',  title: 'Swerve Survivor',      desc: 'Successfully track and shoot 3 Swerve targets.',                                       metric: 'lifetimeSwerveHits',         target: 3 },
    { id: 24,  diff: 'easy', modes: 'both',  title: 'Early Exit',            desc: 'Destroy 5 targets before they cross past the horizontal center line.',                metric: 'lifetimeUpperHalfHits',      target: 5 },
    { id: 25,  diff: 'easy', modes: 'both',  title: 'Bullet Conservation',  desc: 'Finish a game having fired fewer than 40 shots total.',                                metric: 'lifetimeLowShotMatches',     target: 1 },
    { id: 26,  diff: 'easy', modes: 'both',  title: 'Endurance Rookie',     desc: 'Keep a single match going for at least 45 seconds.',                                   metric: 'bestMatchDurationSec',       target: 45 },
    { id: 27,  diff: 'easy', modes: 'both',  title: 'Double Down',          desc: 'Destroy two targets within one second of each other using normal ammo.',               metric: 'lifetimeQuickDoubles',       target: 1 },
    { id: 28,  diff: 'easy', modes: 'both',  title: 'Pacifist Start',       desc: 'Let the very first target of a match drop safely without shooting.',                   metric: 'lifetimeFirstTargetSkipped', target: 1 },
    { id: 29,  diff: 'easy', modes: 'both',  title: 'Score Padder',         desc: 'Reach a total lifetime cumulative score of 200 points.',                                metric: 'lifetimeScore',              target: 200 },
    { id: 30,  diff: 'easy', modes: 'lives', title: 'No Panicking',         desc: 'Hit a target while the screen is flashing its low-altitude warning.',                  metric: 'lifetimeDangerZoneHits',     target: 1 },
    { id: 31,  diff: 'easy', modes: 'both',  title: 'Left Side Master',     desc: 'Shoot 15 targets that spawned on the left half of the canvas.',                        metric: 'lifetimeLeftHalfHits',       target: 15 },
    { id: 32,  diff: 'easy', modes: 'both',  title: 'Right Side Master',    desc: 'Shoot 15 targets that spawned on the right half of the canvas.',                       metric: 'lifetimeRightHalfHits',      target: 15 },
    { id: 33,  diff: 'easy', modes: 'both',  title: 'Controller Test',      desc: 'Play a full match utilizing any non-default gamepad layout preset.',                   metric: 'lifetimeNonDefaultPadMatch', target: 1 },
    { id: 34,  diff: 'easy', modes: 'both',  title: 'Steady Pointer',       desc: 'Fire 10 consecutive shots that all make successful contact.',                          metric: 'bestConsecHitsAllSuccess',   target: 10 },
    { id: 35,  diff: 'easy', modes: 'lives', title: 'Combo Starter',        desc: 'Reach a 3x combo modifier during a Lives match.',                                      metric: 'bestLivesCombo',             target: 3 },
    { id: 36,  diff: 'easy', modes: 'both',  title: 'Changelog Reader',     desc: 'Open the "What\'s New" modal to inspect the latest engine tweaks.',                    metric: 'lifetimeChangelogOpened',    target: 1 },
    { id: 37,  diff: 'easy', modes: 'both',  title: 'Sound Check',          desc: 'Complete a match with the procedural Tone.js sound framework active.',                 metric: 'lifetimeMatchesWithAudio',   target: 1 },
    { id: 38,  diff: 'easy', modes: 'timed', title: 'Frenzy Participant',   desc: 'Activate a Frenzy pack in Timed mode before the clock hits 30s.',                      metric: 'lifetimeEarlyFrenzy',        target: 1 },
    { id: 39,  diff: 'easy', modes: 'both',  title: 'Clay Shatter',         desc: 'Trigger high-density particle breaks on 10 consecutive targets.',                      metric: 'bestHighDensityStreak',      target: 10 },
    { id: 40,  diff: 'easy', modes: 'both',  title: 'Clean Sheet',          desc: 'Reach 15 points before incurring your very first miss or life drop.',                  metric: 'lifetimeCleanSheet15',       target: 1 },
    { id: 41,  diff: 'easy', modes: 'both',  title: 'Halfway Mark',         desc: 'Survive past the 40-second dynamic ramping difficulty threshold.',                     metric: 'bestMatchDurationSec',       target: 40 },
    { id: 42,  diff: 'easy', modes: 'both',  title: 'Explosive Finale',     desc: 'Use a Flame Round pack as your final action right before Game Over.',                  metric: 'lifetimeFlameFinale',        target: 1 },
    { id: 43,  diff: 'easy', modes: 'lives', title: 'Easy Run',             desc: 'Complete an entire Lives Mode match on Easy difficulty scoring over 40 points.',        metric: 'bestEasyLivesScore',         target: 40 },
    { id: 44,  diff: 'easy', modes: 'both',  title: 'No Shield Needed',     desc: 'Win or complete a match without relying on a Safety Net pack.',                        metric: 'lifetimeMatchesNoSafetyNet', target: 1 },
    { id: 45,  diff: 'easy', modes: 'both',  title: 'Quick Tap',            desc: 'Hit a target cleanly before it reaches the maximum apex of its arc.',                  metric: 'lifetimeQuickHits',          target: 3 },

    // ── NORMAL (46-90) ───────────────────────────────────────
    { id: 46,  diff: 'normal', modes: 'both',  title: 'Marksman Instinct',    desc: 'Achieve a total match accuracy rating of 75% or higher.',                              metric: 'bestAccuracyMatch',          target: 75 },
    { id: 47,  diff: 'normal', modes: 'both',  title: 'Swerve Annihilator',   desc: 'Hit a total of 15 Swerve targets across your daily matches.',                          metric: 'lifetimeSwerveHits',         target: 15 },
    { id: 48,  diff: 'normal', modes: 'both',  title: 'Double Combo',         desc: 'Reach and hold a consecutive hit combo of 15.',                                        metric: 'bestComboEver',              target: 15 },
    { id: 49,  diff: 'normal', modes: 'lives', title: 'Centurion Club',       desc: 'Reach an individual match score of 100 points in Lives Mode.',                        metric: 'bestLivesScore',             target: 100 },
    { id: 50,  diff: 'normal', modes: 'timed', title: 'Time Extender',        desc: 'Score 80 points in a single Timed Mode match.',                                        metric: 'bestTimedScore',             target: 80 },
    { id: 51,  diff: 'normal', modes: 'both',  title: 'Deep Freeze Precision',desc: 'Shatter 8 targets during a single Cryo Freeze slowdown window.',                       metric: 'bestCryoWindowHits',         target: 8 },
    { id: 52,  diff: 'normal', modes: 'both',  title: 'Chain Reaction',       desc: 'Detonate a Flame Round that catches 4 or more targets in its AoE radius.',             metric: 'bestFlameMultiKill',         target: 4 },
    { id: 53,  diff: 'normal', modes: 'both',  title: 'Perfect Ramping',      desc: 'Survive the full 80-second dynamic difficulty ramping sequence.',                      metric: 'bestMatchDurationSec',       target: 80 },
    { id: 54,  diff: 'normal', modes: 'lives', title: 'Normal Regular',       desc: 'Complete a Lives Mode match on Normal difficulty with 0 lives lost.',                  metric: 'lifetimeFlawlessNormalLives',target: 1 },
    { id: 55,  diff: 'normal', modes: 'both',  title: 'Score Multitasking',   desc: 'Secure a 5x combo multiplier while a Score Multiplier item is active.',                metric: 'bestComboDuringMultiplier',  target: 5 },
    { id: 56,  diff: 'normal', modes: 'both',  title: 'Iron Core',            desc: 'Complete a match without letting a single clay hit the bottom danger boundary.',       metric: 'lifetimeZeroDropMatches',    target: 1 },
    { id: 57,  diff: 'normal', modes: 'timed', title: 'Frenzy Frenzy',        desc: 'Secure 40 points inside Timed Mode strictly using Frenzy triggers.',                   metric: 'bestFrenzyWindowScore',      target: 40 },
    { id: 58,  diff: 'normal', modes: 'both',  title: 'Apex Predator',        desc: 'Shoot 20 clays precisely at the apex of their physics gravity inversion.',             metric: 'lifetimeApexHits',           target: 20 },
    { id: 59,  diff: 'normal', modes: 'both',  title: 'No Flukes',            desc: 'Achieve 3 separate matches in a row with accuracy tracking over 65%.',                 metric: 'bestAccuracyStreakMatches',  target: 3 },
    { id: 60,  diff: 'normal', modes: 'lives', title: 'Patient Gunner',       desc: 'Wait until a target enters the lower warning threshold before shooting it.',           metric: 'lifetimeDangerZoneHits',     target: 3 },
    { id: 61,  diff: 'normal', modes: 'both',  title: 'Inventory Rotation',   desc: 'Deploy three completely different power-up packs in a single match.',                  metric: 'bestPowerUpTypesPerMatch',   target: 3 },
    { id: 62,  diff: 'normal', modes: 'both',  title: 'Swerve Hunter',        desc: 'Destroy 5 Swerve targets in a single run without missing a shot.',                     metric: 'bestSwerveNoMissStreak',     target: 5 },
    { id: 63,  diff: 'normal', modes: 'both',  title: 'High Roller',          desc: 'Score 150 cumulative points over a span of 3 back-to-back matches.',                   metric: 'best3MatchScoreSum',         target: 150 },
    { id: 64,  diff: 'normal', modes: 'both',  title: 'Margin Master',        desc: 'Destroy 15 clays that fly within the 80px smart spawn boundary area.',                 metric: 'lifetimeBoundaryMarginHits', target: 15 },
    { id: 65,  diff: 'normal', modes: 'both',  title: 'Clustering',           desc: 'Shoot 3 targets within a rolling window of 1.5 seconds.',                              metric: 'lifetimeClusterKills',       target: 1 },
    { id: 66,  diff: 'normal', modes: 'lives', title: 'Healthy Condition',    desc: 'Regenerate 2 lives using Medic Clays within one standard match.',                      metric: 'bestMedicUsesPerMatch',      target: 2 },
    { id: 67,  diff: 'normal', modes: 'timed', title: 'Trigger Discipline',   desc: 'Complete a 60-second Timed match firing fewer than 50 total shots.',                   metric: 'lifetimeDisciplinedMatches', target: 1 },
    { id: 68,  diff: 'normal', modes: 'both',  title: 'Speed Tracker',        desc: 'Successfully destroy a target moving at maximum launch velocity.',                     metric: 'lifetimeMaxSpeedHits',       target: 1 },
    { id: 69,  diff: 'normal', modes: 'both',  title: 'Half Century',         desc: 'Reach a 50-point milestone before the difficulty timer hits 40 seconds.',              metric: 'lifetimeFastFifty',          target: 1 },
    { id: 70,  diff: 'normal', modes: 'both',  title: 'Screen Shaker',        desc: 'Trigger 5 independent camera-shake explosion events in one match.',                   metric: 'bestShakeEventsPerMatch',    target: 5 },
    { id: 71,  diff: 'normal', modes: 'both',  title: 'Persistent Execution', desc: 'Play the game across 2 consecutive challenge cycles.',                                 metric: 'lifetimeCyclesPlayed',       target: 2 },
    { id: 72,  diff: 'normal', modes: 'both',  title: 'Unstoppable Arc',      desc: 'Shoot down 10 targets that have a high randomized spin velocity.',                     metric: 'lifetimeHighSpinHits',       target: 10 },
    { id: 73,  diff: 'normal', modes: 'both',  title: 'Pure Gunplay',         desc: 'Reach 60 points without triggering a single inventory power-up item.',                 metric: 'bestNoPowerUpScore',         target: 60 },
    { id: 74,  diff: 'normal', modes: 'lives', title: 'Boundary Guardian',    desc: 'Hit 10 targets while they are inside the dynamic red flash danger zone.',              metric: 'lifetimeDangerZoneHits',     target: 10 },
    { id: 75,  diff: 'normal', modes: 'both',  title: 'Equal Opportunity',    desc: 'Score 30 points on the left half and 30 points on the right half of the screen.',      metric: 'lifetimeBalancedScore',      target: 1 },
    { id: 76,  diff: 'normal', modes: 'timed', title: 'Frenzy Overload',      desc: 'Stack two Frenzy power-ups back-to-back in a Timed Mode match.',                       metric: 'lifetimeFrenzyStacks',       target: 1 },
    { id: 77,  diff: 'normal', modes: 'both',  title: 'Glancing Blow',        desc: 'Shoot 5 targets at the exact horizontal boundary limit of the canvas.',                metric: 'lifetimeBoundaryMarginHits', target: 5 },
    { id: 78,  diff: 'normal', modes: 'both',  title: 'Resourceful',          desc: 'Empty your active sidebar inventory completely during a high-stakes run.',             metric: 'lifetimeInventoryEmptied',   target: 1 },
    { id: 79,  diff: 'normal', modes: 'both',  title: 'Streak Saver',         desc: 'Use a Safety Net power-up to successfully preserve a combo higher than 10.',           metric: 'lifetimeSafetyNetComboSave', target: 1 },
    { id: 80,  diff: 'normal', modes: 'both',  title: 'Tactical Reload',      desc: 'Fire exactly 5 shots, hit 5 targets, and pause for 3 seconds without firing.',         metric: 'lifetimeTacticalReload',     target: 1 },
    { id: 81,  diff: 'normal', modes: 'both',  title: 'Swerve Sweep',         desc: 'Destroy two Swerve targets simultaneously present on the screen.',                     metric: 'lifetimeSwerveSweep',        target: 1 },
    { id: 82,  diff: 'normal', modes: 'timed', title: 'Time Attack Specialist',desc:'Break 100 targets across all Timed Mode matches today.',                               metric: 'lifetimeTimedClaysHit',      target: 100 },
    { id: 83,  diff: 'normal', modes: 'both',  title: 'Sky Master',           desc: 'Destroy 25 targets before they drop below the upper 50% coordinate grid.',             metric: 'lifetimeUpperHalfHits',      target: 25 },
    { id: 84,  diff: 'normal', modes: 'lives', title: 'No Drops Allowed',     desc: 'Play a full Normal Difficulty match without letting a single clay drop.',              metric: 'lifetimeZeroDropMatches',    target: 1 },
    { id: 85,  diff: 'normal', modes: 'both',  title: 'Fast Hands',           desc: 'Hit a target within 0.3 seconds of its audio Tone.js launch sound.',                   metric: 'lifetimeQuickHits',          target: 5 },
    { id: 86,  diff: 'normal', modes: 'both',  title: 'Calculated Ramping',   desc: 'Reach a score of 120 as the engine hits maximum difficulty scaling.',                  metric: 'lifetimeMaxRampScore',       target: 120 },
    { id: 87,  diff: 'normal', modes: 'both',  title: 'Double Multiplier Run',desc: 'Activate two separate Score Multipliers within one instance.',                        metric: 'lifetimeMultiplierStacks',   target: 1 },
    { id: 88,  diff: 'normal', modes: 'both',  title: 'Clean Arc Tracking',   desc: 'Hit 15 targets in a row while they are on their downward falling path.',               metric: 'bestDescendingHitStreak',    target: 15 },
    { id: 89,  diff: 'normal', modes: 'both',  title: 'The 75 Club',          desc: 'Accumulate 75 points in under 45 seconds of runtime.',                                 metric: 'lifetimeFast75',             target: 1 },
    { id: 90,  diff: 'normal', modes: 'both',  title: 'Steady Aim Assist',    desc: 'Complete a match with a controller using sticky aim assist disabled.',                 metric: 'lifetimeMatchesAssistOff',   target: 1 },

    // ── HARD (91-135) ────────────────────────────────────────
    { id: 91,  diff: 'hard', modes: 'lives', title: 'Sniper Execution',       desc: 'Finish an entire Lives Mode match with an accuracy score of 95% or higher.',           metric: 'bestAccuracyMatch',          target: 95 },
    { id: 92,  diff: 'hard', modes: 'lives', title: 'Immortal Gunner',        desc: 'Reach a score of 250 in Lives Mode on Normal Difficulty.',                             metric: 'bestNormalLivesScore',       target: 250 },
    { id: 93,  diff: 'hard', modes: 'both',  title: 'Grand Master Streak',    desc: 'Build and maintain a flawless consecutive hit combo of 40.',                          metric: 'bestComboEver',              target: 40 },
    { id: 94,  diff: 'hard', modes: 'both',  title: 'Swerve Apocalypse',      desc: 'Destroy 12 Swerve targets in a single match without drop penalties.',                  metric: 'bestSwerveNoMissStreak',     target: 12 },
    { id: 95,  diff: 'hard', modes: 'timed', title: 'Clock Eraser',           desc: 'Achieve a score of 160 or higher in a single Timed Mode match.',                       metric: 'bestTimedScore',             target: 160 },
    { id: 96,  diff: 'hard', modes: 'both',  title: 'Flawless Ramping',       desc: 'Stay alive for 120 seconds straight as target spawns reach maximum speeds.',           metric: 'bestMatchDurationSec',       target: 120 },
    { id: 97,  diff: 'hard', modes: 'both',  title: 'Collateral Damage',      desc: 'Secure 3 consecutive multi-kills using individual Flame Round bursts.',               metric: 'bestFlameMultiKillStreak',   target: 3 },
    { id: 98,  diff: 'hard', modes: 'both',  title: 'Cryo Perfection',        desc: 'Destroy 12 targets during a single Cryo Freeze window without missing once.',          metric: 'bestCryoWindowHits',         target: 12 },
    { id: 99,  diff: 'hard', modes: 'lives', title: 'Zero Shield Legend',     desc: 'Reach a score of 150 in Lives Mode without owning or using a Safety Net.',             metric: 'bestNoSafetyNetLivesScore',  target: 150 },
    { id: 100, diff: 'hard', modes: 'both',  title: 'The Overachiever',       desc: 'Accumulate a grand total of 500 points across your session today.',                    metric: 'sessionScore',               target: 500 },
    { id: 101, diff: 'hard', modes: 'both',  title: 'Speed Demon',            desc: 'Hit 5 consecutive targets within 0.25 seconds of their initial canvas spawn.',         metric: 'bestQuickHitStreak',         target: 5 },
    { id: 102, diff: 'hard', modes: 'lives', title: 'Crisis Management',      desc: 'Win a Lives match after being reduced to 1 life within the first 20 seconds.',         metric: 'lifetimeCrisisComebacks',    target: 1 },
    { id: 103, diff: 'hard', modes: 'both',  title: 'Multiplier Monopoly',    desc: 'Earn 60 points strictly within a single 10-second Score Multiplier window.',           metric: 'bestMultiplierWindowScore',  target: 60 },
    { id: 104, diff: 'hard', modes: 'both',  title: 'Apex Champion',          desc: 'Shoot 15 consecutive targets exclusively at the apex point of their arcs.',            metric: 'bestApexStreak',             target: 15 },
    { id: 105, diff: 'hard', modes: 'both',  title: 'Perfect Split',          desc: 'Score at least 50 points on the left and 50 on the right in a single match.',          metric: 'lifetimeBalancedScore',      target: 1 },
    { id: 106, diff: 'hard', modes: 'both',  title: 'Swerve Masterclass',     desc: 'Hit 5 Swerve targets in a row while the game clock is past 60 seconds.',               metric: 'bestLateSwerveStreak',       target: 5 },
    { id: 107, diff: 'hard', modes: 'timed', title: 'Frenzy Mastery',         desc: 'Clear 100% of all targets spawned during a dual-Frenzy wave in Timed Mode.',           metric: 'lifetimeDualFrenzyClear',    target: 1 },
    { id: 108, diff: 'hard', modes: 'both',  title: 'Unbroken Focus',         desc: 'Play for 3 minutes straight across matches without letting your combo drop to 0.',     metric: 'bestComboUptimeSec',         target: 180 },
    { id: 109, diff: 'hard', modes: 'lives', title: 'Danger Zone Specialist', desc: 'Shoot 20 targets sequentially while they reside in the lower warning zone.',           metric: 'lifetimeDangerZoneHits',     target: 20 },
    { id: 110, diff: 'hard', modes: 'both',  title: 'Ammunition Conservation',desc: 'Score 100 points using fewer than 105 total clicks or screen taps.',                   metric: 'lifetimeEfficientHundred',   target: 1 },
    { id: 111, diff: 'hard', modes: 'both',  title: 'Edge-to-Edge',           desc: 'Shoot a target on the extreme left, then one on the extreme right within 0.5s.',        metric: 'lifetimeEdgeToEdge',         target: 1 },
    { id: 112, diff: 'hard', modes: 'both',  title: 'The 300 Club',           desc: 'Reach a massive milestone score of 300 points across any single run.',                 metric: 'bestSingleMatchScore',       target: 300 },
    { id: 113, diff: 'hard', modes: 'both',  title: 'Maximum Chaos',          desc: 'Have 8 targets simultaneously destroyed on screen using a Flame Round chain.',         metric: 'bestFlameMultiKill',         target: 8 },
    { id: 114, diff: 'hard', modes: 'both',  title: 'Untouchable',            desc: 'Do not let a single target touch the lower half of the screen for 45 seconds.',        metric: 'bestUntouchableSec',         target: 45 },
    { id: 115, diff: 'hard', modes: 'both',  title: 'Full Vault Hoarder',     desc: 'Max out every single item slot in your persistent inventory to 3/3.',                  metric: 'lifetimeFullInventory',      target: 1 },
    { id: 116, diff: 'hard', modes: 'lives', title: 'No Room for Error',      desc: 'Achieve a 25-hit combo on Normal Difficulty with only 1 life remaining.',              metric: 'bestComboAtOneLife',         target: 25 },
    { id: 117, diff: 'hard', modes: 'both',  title: 'Timed Carnage',          desc: 'Hit 4 targets simultaneously with a single Flame Round blast shot.',                   metric: 'bestFlameMultiKill',         target: 4 },
    { id: 118, diff: 'hard', modes: 'both',  title: 'High Velocity Sniping',  desc: 'Hit 10 targets in a row that are traveling at physics speed caps.',                   metric: 'bestMaxSpeedHitStreak',      target: 10 },
    { id: 119, diff: 'hard', modes: 'timed', title: 'The Perfect Minute',     desc: 'Play a full 60-second Timed Mode run without recording a single missed shot.',        metric: 'lifetimePerfectMinute',      target: 1 },
    { id: 120, diff: 'hard', modes: 'both',  title: 'Rapid Engagement',       desc: 'Score 5 hits within a 2-second window without using power-ups.',                       metric: 'lifetimeRapidClusterClear',  target: 1 },
    { id: 121, diff: 'hard', modes: 'both',  title: 'Spin Cycle Master',      desc: 'Shoot 20 targets that possess maximum randomized spin velocity metrics.',              metric: 'lifetimeHighSpinHits',       target: 20 },
    { id: 122, diff: 'hard', modes: 'both',  title: 'Deep Run Efficiency',    desc: 'Reach a 30x combo after the dynamic difficulty scaling has fully peaked.',             metric: 'bestComboAfterPeakRamp',     target: 30 },
    { id: 123, diff: 'hard', modes: 'lives', title: 'Double Danger Shield',   desc: 'Let two targets hit the baseline simultaneously while protected by Safety Net.',      metric: 'lifetimeDoubleSafetyNetSave',target: 1 },
    { id: 124, diff: 'hard', modes: 'both',  title: 'The Minimalist',         desc: 'Achieve a 100+ score using only the default crosshair reticle with no assistance.',   metric: 'bestDefaultCrosshairScore',  target: 100 },
    { id: 125, diff: 'hard', modes: 'both',  title: 'Point Maximizer',        desc: 'Combine a 10x combo streak with a Score Multiplier item for its full duration.',      metric: 'lifetimeComboMultiplierCombo',target: 1 },
    { id: 126, diff: 'hard', modes: 'both',  title: 'Swerve Denial',          desc: 'Shoot 10 Swerve targets before they have a chance to make their trajectory shift.',   metric: 'lifetimeSwerveHits',         target: 10 },
    { id: 127, diff: 'hard', modes: 'timed', title: 'Extended Attack',        desc: 'Score 200 cumulative points inside Timed Mode within a two-match limit.',              metric: 'best2MatchTimedScoreSum',    target: 200 },
    { id: 128, diff: 'hard', modes: 'lives', title: 'Flawless Normal',        desc: 'Complete a Normal Difficulty match with a 100% perfect target clear rate.',            metric: 'lifetimePerfectClearNormal', target: 1 },
    { id: 129, diff: 'hard', modes: 'both',  title: 'The Iron Wall',          desc: 'Prevent any clay from dropping below 200 pixels on the vertical grid for 60 seconds.', metric: 'bestIronWallSec',            target: 60 },
    { id: 130, diff: 'hard', modes: 'both',  title: 'Blazing Speed',          desc: 'Hit 3 targets moving at peak velocity while they are in the lower 25% of the canvas.', metric: 'lifetimeMaxSpeedHits',       target: 3 },
    { id: 131, diff: 'hard', modes: 'both',  title: 'No Cryo Reliance',       desc: 'Reach 150 points past the maximum ramping interval without using Cryo Freeze.',       metric: 'bestNoCryoLateScore',        target: 150 },
    { id: 132, diff: 'hard', modes: 'timed', title: 'Triple Digit Blitz',     desc: 'Score 100 points in Timed Mode with more than 15 seconds remaining on the clock.',    metric: 'lifetimeTripleDigitBlitz',   target: 1 },
    { id: 133, diff: 'hard', modes: 'both',  title: 'Precision Burst',        desc: 'Fire 30 shots, record 30 hits, and ensure 10 of them are Swerve variants.',           metric: 'lifetimePrecisionBurst',     target: 1 },
    { id: 134, diff: 'hard', modes: 'both',  title: 'Endurance Master',       desc: 'Keep a single continuous match alive for over 150 seconds.',                          metric: 'bestMatchDurationSec',       target: 150 },
    { id: 135, diff: 'hard', modes: 'both',  title: 'The Finisher',           desc: 'End a 200+ point match with a flawless 20-hit streak right up to the final target.',  metric: 'lifetimeFlawlessFinisher',   target: 1 },

    // ── MYTHICAL (136-150) ───────────────────────────────────
    { id: 136, diff: 'mythical', modes: 'lives', title: 'God Mode Tracking',     desc: 'Reach a score of 500 in Lives Mode on Normal Difficulty with 100% accuracy.',              metric: 'bestPerfectNormalLivesScore',target: 500 },
    { id: 137, diff: 'mythical', modes: 'both',  title: 'The Untouchable Phoenix',desc:'Survive for 180 seconds continuously without losing a single life or combo link.',         metric: 'bestFlawlessSurvivalSec',    target: 180 },
    { id: 138, diff: 'mythical', modes: 'both',  title: 'Swerve Extinction',     desc: 'Shoot 30 Swerve targets in a single match without registering a single miss.',            metric: 'bestSwerveNoMissStreak',     target: 30 },
    { id: 139, diff: 'mythical', modes: 'timed', title: 'Time Paradox',          desc: 'Break the 250-point barrier in a single 60-second Timed Mode match.',                     metric: 'bestTimedScore',             target: 250 },
    { id: 140, diff: 'mythical', modes: 'both',  title: 'Flawless Century',      desc: 'Reach a consecutive hit combo of exactly 100 without a break.',                          metric: 'bestComboEver',              target: 100 },
    { id: 141, diff: 'mythical', modes: 'both',  title: 'The Grid Absolute',     desc: 'Shoot down 50 targets sequentially before they pass the top 33% coordinate grid line.',  metric: 'lifetimeUpperQuarterHits',   target: 50 },
    { id: 142, diff: 'mythical', modes: 'both',  title: 'Maximum Overdrive',     desc: 'Maintain a 10x combo for over 60 seconds of active, fully-ramped game clock time.',      metric: 'bestComboUptimeSec',         target: 60 },
    { id: 143, diff: 'mythical', modes: 'both',  title: 'The Catalyst',          desc: 'Trigger Flame Rounds, Cryo Freeze, and a Score Multiplier all simultaneously while maintaining a 30x combo.', metric: 'lifetimeTripleStackCombo', target: 1 },
    { id: 144, diff: 'mythical', modes: 'both',  title: 'Annihilation Protocol', desc: 'Clear 300 total targets across all game formats within a single challenge cycle window.', metric: 'cycleClaysSmashed',          target: 300 },
    { id: 145, diff: 'mythical', modes: 'both',  title: 'Apex Divinity',         desc: 'Destroy 30 consecutive clays within 0.1 seconds of them reaching their physics apex.',   metric: 'bestApexStreak',             target: 30 },
    { id: 146, diff: 'mythical', modes: 'both',  title: 'Zero-G Phantom',        desc: 'Complete a match surviving past the 90-second mark without using any power-ups.',         metric: 'bestMatchDurationSec',       target: 90 },
    { id: 147, diff: 'mythical', modes: 'both',  title: 'The Perfect Session',   desc: 'Play 5 consecutive matches, averaging over 150 points per match with overall 90% accuracy.', metric: 'best5MatchAvgScore',      target: 150 },
    { id: 148, diff: 'mythical', modes: 'timed', title: 'Frenzy Cataclysm',      desc: 'Farm 80 points during a single Frenzy window in Timed Mode.',                            metric: 'bestFrenzyWindowScore',      target: 80 },
    { id: 149, diff: 'mythical', modes: 'both',  title: 'The Boundary Legend',   desc: 'Clear 40 targets while they are inside the final danger zone boundary.',                  metric: 'lifetimeDangerZoneHits',     target: 40 },
    { id: 150, diff: 'mythical', modes: 'lives', title: 'Engine Overlord v5.1',  desc: 'Complete a Normal match scoring 400+ points, maxing out your dynamic difficulty modifier completely without dropping below 2 lives.', metric: 'bestOverlordRun', target: 400 },
];

// ── Persistent challenge progress + cycle storage ─────────────
function loadChallengeData() {
    const defaults = {
        daily:  { cycleStart: null, activeIds: [], rerollsLeft: DAILY_REROLLS,  claimed: {} },
        weekly: { cycleStart: null, activeIds: [], rerollsLeft: WEEKLY_REROLLS, claimed: {} },
        // lifetime/session telemetry counters — keyed by challenge `metric`
        stats: {},
    };
    try {
        const stored = JSON.parse(localStorage.getItem(CHALLENGES_KEY) || '{}');
        return {
            daily:  { ...defaults.daily,  ...(stored.daily  || {}) },
            weekly: { ...defaults.weekly, ...(stored.weekly || {}) },
            stats:  { ...defaults.stats,  ...(stored.stats  || {}) },
        };
    } catch { return defaults; }
}

const ChallengeData = loadChallengeData();

function saveChallengeData() {
    try { localStorage.setItem(CHALLENGES_KEY, JSON.stringify(ChallengeData)); } catch {}
}

function getChallengeById(id) { return CHALLENGE_POOL.find(c => c.id === id); }

// ── Quota-balanced random selection ───────────────────────────
// Guarantees ≥1 easy, ≥1 normal, ≥1 hard among the 7 active slots.
// Mythical only enters via a 3.5% roll per remaining slot.
function generateChallengeSet(excludeIds = []) {
    const pool = CHALLENGE_POOL.filter(c => !excludeIds.includes(c.id));
    const byDiff = {
        easy:     pool.filter(c => c.diff === 'easy'),
        normal:   pool.filter(c => c.diff === 'normal'),
        hard:     pool.filter(c => c.diff === 'hard'),
        mythical: pool.filter(c => c.diff === 'mythical'),
    };

    const pickRandom = (arr) => arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
    const picked = [];
    const pickedIds = new Set();

    const tryPick = (diffArr) => {
        const candidates = diffArr.filter(c => !pickedIds.has(c.id));
        const choice = pickRandom(candidates);
        if (choice) { picked.push(choice); pickedIds.add(choice.id); }
        return choice;
    };

    // Guaranteed minimums
    tryPick(byDiff.easy);
    tryPick(byDiff.normal);
    tryPick(byDiff.hard);

    // Fill remaining slots — each has a MYTHICAL_ROLL_CHANCE shot,
    // otherwise drawn from a blended easy/normal/hard pool.
    const blended = [...byDiff.easy, ...byDiff.normal, ...byDiff.hard];
    while (picked.length < DAILY_SLOTS) {
        let choice = null;
        if (Math.random() < MYTHICAL_ROLL_CHANCE && byDiff.mythical.length) {
            choice = tryPick(byDiff.mythical);
        }
        if (!choice) choice = tryPick(blended);
        if (!choice) break; // pool exhausted (safety)
    }

    return picked.map(c => c.id);
}

// ── Cycle management — regenerates the active set when the window expires ──
function ensureChallengeCycle(scope) {
    const data = ChallengeData[scope];
    const periodMs = scope === 'daily' ? DAY_MS : WEEK_MS;
    const now = Date.now();

    const expired = data.cycleStart == null || (now - data.cycleStart) >= periodMs;
    if (expired || !data.activeIds || data.activeIds.length === 0) {
        data.cycleStart   = now;
        data.activeIds    = generateChallengeSet();
        data.rerollsLeft  = scope === 'daily' ? DAILY_REROLLS : WEEKLY_REROLLS;
        data.claimed      = {};
        // Reset cycle-scoped stat counters
        ChallengeData.stats.cycleClaysSmashed = 0;
        bumpChallengeStat('lifetimeCyclesPlayed', 1);
        saveChallengeData();
    }
}

function msUntilCycleReset(scope) {
    const data = ChallengeData[scope];
    const periodMs = scope === 'daily' ? DAY_MS : WEEK_MS;
    if (data.cycleStart == null) return 0;
    return Math.max(0, periodMs - (Date.now() - data.cycleStart));
}

// ── Reroll a single card for an equivalent-difficulty replacement ────────
function rerollChallenge(scope, challengeId) {
    const data = ChallengeData[scope];
    if (data.rerollsLeft <= 0) return false;
    if (data.claimed[challengeId]) return false; // can't reroll an already-claimed slot

    const current = getChallengeById(challengeId);
    if (!current) return false;

    const sameDiffPool = CHALLENGE_POOL.filter(c =>
        c.diff === current.diff && !data.activeIds.includes(c.id));
    if (sameDiffPool.length === 0) return false;

    const replacement = sameDiffPool[Math.floor(Math.random() * sameDiffPool.length)];
    const idx = data.activeIds.indexOf(challengeId);
    if (idx === -1) return false;

    data.activeIds[idx] = replacement.id;
    data.rerollsLeft--;
    delete data.claimed[challengeId];
    saveChallengeData();
    return true;
}

// ── Progress lookup — reads the persisted stat for a challenge's metric ──
function getChallengeProgress(challenge) {
    return Math.min(challenge.target, ChallengeData.stats[challenge.metric] || 0);
}

function isChallengeComplete(challenge) {
    return getChallengeProgress(challenge) >= challenge.target;
}

// ── Claim a completed challenge — grants random pack reward(s) ───────────
function claimChallenge(scope, challengeId) {
    const data = ChallengeData[scope];
    const challenge = getChallengeById(challengeId);
    if (!challenge || data.claimed[challengeId]) return null;
    if (!isChallengeComplete(challenge)) return null;

    const rewardCount = REWARD_COUNT[challenge.diff] || 1;
    const grantedKeys = [];
    for (let i = 0; i < rewardCount; i++) {
        const key = rollVaultReward();
        if (key) {
            grantPack(key);
            grantedKeys.push(key);
        } else {
            Meta.pendingOverflowBonus = (Meta.pendingOverflowBonus || 0) + OVERFLOW_BONUS_SCORE;
            saveMeta();
        }
    }

    data.claimed[challengeId] = true;
    saveChallengeData();

    // Check Full Vault Hoarder
    const allMaxed = PACK_KEYS.every(k => Meta.packs[k] >= PACK_CAP);
    if (allMaxed) bumpChallengeStat('lifetimeFullInventory', 1);

    return { challenge, grantedKeys };
}

// ── Aggregate notification check — any unclaimed-but-complete challenge? ─
function hasUnclaimedChallenges() {
    for (const scope of ['daily', 'weekly']) {
        ensureChallengeCycle(scope);
        const data = ChallengeData[scope];
        for (const id of data.activeIds) {
            const c = getChallengeById(id);
            if (c && !data.claimed[id] && isChallengeComplete(c)) return true;
        }
    }
    return false;
}

function updateChallengesNotifDots() {
    const show = hasUnclaimedChallenges();
    if (DOM.challengesNotifDot)      DOM.challengesNotifDot.classList.toggle('hidden', !show);
    if (DOM.pauseChallengesNotifDot) DOM.pauseChallengesNotifDot.classList.toggle('hidden', !show);
}

// ── Telemetry bump helper — increments a persisted stat and re-evaluates ──
function bumpChallengeStat(metric, amount = 1, mode = 'add') {
    const cur = ChallengeData.stats[metric] || 0;
    if (mode === 'add')      ChallengeData.stats[metric] = cur + amount;
    else if (mode === 'max') ChallengeData.stats[metric] = Math.max(cur, amount);
    else if (mode === 'set') ChallengeData.stats[metric] = amount;
    saveChallengeData();
    checkForNewlyCompletedChallenges(metric);
}

// ── Real-time completion detection → fires the Steam-style toast ─────────
const _toastedThisSession = new Set(); // prevents duplicate toasts per challenge per session

function checkForNewlyCompletedChallenges(changedMetric) {
    if (Engine.state !== GameState.PLAYING) {
        updateChallengesNotifDots();
        return;
    }
    for (const scope of ['daily', 'weekly']) {
        const data = ChallengeData[scope];
        if (!data.activeIds) continue;
        for (const id of data.activeIds) {
            if (data.claimed[id]) continue;
            const c = getChallengeById(id);
            if (!c || c.metric !== changedMetric) continue;
            if (isChallengeComplete(c) && !_toastedThisSession.has(`${scope}:${id}`)) {
                _toastedThisSession.add(`${scope}:${id}`);
                showAchievementToast(c);
            }
        }
    }
    updateChallengesNotifDots();
}

// ════════════════════════════════════════════════════════════
// ─── v7: STEAM-STYLE TOAST NOTIFICATIONS ─────────────────────
// ════════════════════════════════════════════════════════════

const DIFF_LABEL_COLOR = {
    easy:     { label: 'EASY',     color: '#4ade80' },
    normal:   { label: 'NORMAL',   color: '#facc15' },
    hard:     { label: 'HARD',     color: '#f87171' },
    mythical: { label: 'MYTHICAL', color: '#c084fc' },
};

function showAchievementToast(challenge) {
    if (!DOM.toastContainer) return;
    const d = DIFF_LABEL_COLOR[challenge.diff] || DIFF_LABEL_COLOR.easy;

    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
        <div class="achievement-toast-icon">🏆</div>
        <div class="flex-1 min-w-0">
            <div class="achievement-toast-header">CHALLENGE COMPLETED!</div>
            <div class="achievement-toast-title truncate">${challenge.title}</div>
            <div class="achievement-toast-diff" style="color:${d.color}">${d.label}</div>
        </div>
    `;
    DOM.toastContainer.appendChild(toast);

    // Slide in
    requestAnimationFrame(() => toast.classList.add('toast-in'));

    // Light synthesized chime
    playSound('powerup');

    // Hold 4s, then slide out and remove
    setTimeout(() => {
        toast.classList.remove('toast-in');
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 450);
    }, 4000);
}

// ════════════════════════════════════════════════════════════
// ─── v7: CHALLENGES OVERLAY UI ────────────────────────────────
// ════════════════════════════════════════════════════════════

let activeChallengeTab = 'daily';
let challengeCountdownInterval = null;

function formatCycleCountdown(ms) {
    const totalSec = Math.ceil(ms / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = n => String(n).padStart(2, '0');
    if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m`;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function renderChallengeCard(scope, challengeId) {
    const c = getChallengeById(challengeId);
    if (!c) return '';

    const data = ChallengeData[scope];
    const progress  = getChallengeProgress(c);
    const complete  = isChallengeComplete(c);
    const claimed   = !!data.claimed[challengeId];
    const pct       = Math.min(100, Math.round((progress / c.target) * 100));
    const d         = DIFF_LABEL_COLOR[c.diff] || DIFF_LABEL_COLOR.easy;
    const rewardN   = REWARD_COUNT[c.diff] || 1;

    // Mode badge
    const modeMap = {
        both:  { icon: '🎮', label: 'Both Modes',   cls: 'text-slate-400 border-slate-600' },
        lives: { icon: '❤️', label: 'Lives Mode',   cls: 'text-emerald-400 border-emerald-700' },
        timed: { icon: '⏱',  label: 'Timed Mode',   cls: 'text-amber-400 border-amber-700' },
    };
    const mInfo = modeMap[c.modes] || modeMap.both;

    // Reward label with pack icons
    const packIcons = { easy: '📦', normal: '📦📦', hard: '📦📦📦', mythical: '📦📦📦📦' };
    const rewardLabel = rewardN > 1 ? `${rewardN}× Random Packs` : `1× Random Pack`;

    const canReroll = data.rerollsLeft > 0 && !claimed;

    return `
    <div class="challenge-card diff-${c.diff} ${complete ? 'challenge-complete' : ''}" data-challenge-id="${c.id}" data-scope="${scope}">
        <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 flex-wrap mb-1">
                    <span class="diff-badge diff-${c.diff}">${d.label}</span>
                    <span class="mode-badge ${mInfo.cls}">${mInfo.icon} ${mInfo.label}</span>
                </div>
                <h4 class="font-bold text-[12px] md:text-sm text-white leading-tight">${c.title}</h4>
            </div>
            <button class="challenge-reroll-btn" data-reroll-id="${c.id}" data-reroll-scope="${scope}" ${canReroll ? '' : 'disabled'} title="Reroll this challenge (${data.rerollsLeft} left)">
                <i class="fa-solid fa-rotate"></i>
            </button>
        </div>
        <p class="text-[10px] md:text-[11px] text-slate-400 leading-snug">${c.desc}</p>
        <div class="challenge-progress-track">
            <div class="challenge-progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="flex items-center justify-between text-[9px] md:text-[10px] text-slate-400 font-semibold">
            <span>${progress} / ${c.target}</span>
            <span>${pct}%</span>
        </div>
        <div class="flex items-center justify-between gap-2 mt-0.5">
            <span class="text-[9px] md:text-[10px] text-amber-300 font-bold truncate">🎁 Reward: ${rewardLabel}</span>
            <button class="challenge-claim-btn ${complete && !claimed ? 'claim-ready' : ''}"
                data-claim-id="${c.id}" data-claim-scope="${scope}"
                ${complete && !claimed ? '' : 'disabled'}>
                ${claimed ? '✓ Claimed' : (complete ? 'Claim!' : 'Locked')}
            </button>
        </div>
    </div>`;
}

function renderChallengesGrid() {
    if (!DOM.challengesGrid) return;
    ensureChallengeCycle(activeChallengeTab);
    const data = ChallengeData[activeChallengeTab];

    DOM.challengesGrid.innerHTML = data.activeIds
        .map(id => renderChallengeCard(activeChallengeTab, id))
        .join('');

    if (DOM.challengeRerollCount) {
        DOM.challengeRerollCount.textContent = data.rerollsLeft;
    }

    updateChallengeCountdown();
}

function updateChallengeCountdown() {
    if (!DOM.challengeCycleCountdown) return;
    DOM.challengeCycleCountdown.textContent = formatCycleCountdown(msUntilCycleReset(activeChallengeTab));
}

function setActiveChallengeTab(tab) {
    activeChallengeTab = tab;
    DOM.challengeTabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.challengeTab === tab);
    });
    renderChallengesGrid();
}

function openChallengesOverlay(fromPause = false) {
    if (fromPause) {
        DOM.pauseOverlay.classList.add('hidden');
    } else {
        DOM.gameOverlay.classList.add('hidden');
    }
    DOM.challengesOverlay.classList.remove('hidden');
    DOM.challengesOverlay.dataset.returnTo = fromPause ? 'pause' : 'menu';

    ensureChallengeCycle('daily');
    ensureChallengeCycle('weekly');
    setActiveChallengeTab(activeChallengeTab);

    clearInterval(challengeCountdownInterval);
    challengeCountdownInterval = setInterval(updateChallengeCountdown, 1000);
}

function closeChallengesOverlay() {
    clearInterval(challengeCountdownInterval);
    DOM.challengesOverlay.classList.add('hidden');
    const returnTo = DOM.challengesOverlay.dataset.returnTo;
    if (returnTo === 'pause' && Engine.state === GameState.PAUSED) {
        DOM.pauseOverlay.classList.remove('hidden');
    } else {
        DOM.gameOverlay.classList.remove('hidden');
    }
    updateChallengesNotifDots();
}

// ── Grid click delegation: handles reroll + claim buttons ────────────────
function handleChallengesGridClick(e) {
    const rerollBtn = e.target.closest('.challenge-reroll-btn');
    if (rerollBtn && !rerollBtn.disabled) {
        const id    = parseInt(rerollBtn.dataset.rerollId, 10);
        const scope = rerollBtn.dataset.rerollScope;
        if (rerollChallenge(scope, id)) {
            renderChallengesGrid();
        }
        return;
    }

    const claimBtn = e.target.closest('.challenge-claim-btn');
    if (claimBtn && !claimBtn.disabled) {
        const id    = parseInt(claimBtn.dataset.claimId, 10);
        const scope = claimBtn.dataset.claimScope;
        const result = claimChallenge(scope, id);
        if (result) {
            refreshSidebarUI();
            renderChallengesGrid();
            updateChallengesNotifDots();
            // Show the mystery box reward animation
            showChallengeRewardAnimation(result.challenge, result.grantedKeys);
        }
        return;
    }
}

// ════════════════════════════════════════════════════════════
// ─── v7: MYSTERY BOX REWARD ANIMATION ───────────────────────
// ════════════════════════════════════════════════════════════

const PACK_DISPLAY_INFO = {
    safetyNet:   { icon: '🛡️', name: 'Safety Net Pack',   desc: 'Universal — blocks the next missed target penalty', color: '#8b5cf6', glow: 'rgba(139,92,246,0.6)' },
    cryoFreeze:  { icon: '❄️', name: 'Cryo Freeze Pack',  desc: 'Universal — halves all target speeds for 5 seconds', color: '#06b6d4', glow: 'rgba(6,182,212,0.6)'  },
    multiplier:  { icon: '✖️', name: 'Multiplier Pack',   desc: 'Universal — doubles all point yields for 10 seconds', color: '#f97316', glow: 'rgba(249,115,22,0.6)' },
    flameRounds: { icon: '🔥', name: 'Flame Rounds Pack', desc: 'Universal — explosive AoE chain reactions on hit', color: '#ef4444', glow: 'rgba(239,68,68,0.6)'   },
    medicClay:   { icon: '➕', name: 'Medic Clay Pack',   desc: 'Lives Mode — restores 1 life when activated', color: '#10b981', glow: 'rgba(16,185,129,0.6)'   },
    frenzy:      { icon: '⭐', name: 'Frenzy Pack',       desc: 'Timed Mode — spawns a rapid-fire burst of targets', color: '#eab308', glow: 'rgba(234,179,8,0.6)'  },
};

function showChallengeRewardAnimation(challenge, grantedKeys) {
    const overlay = document.getElementById('rewardAnimOverlay');
    if (!overlay) return;

    const d = DIFF_LABEL_COLOR[challenge.diff] || DIFF_LABEL_COLOR.easy;

    // Build pack cards HTML
    const packCardsHtml = grantedKeys.length > 0
        ? grantedKeys.map((key, idx) => {
            const info = PACK_DISPLAY_INFO[key] || { icon: '📦', name: key, desc: '', color: '#64748b', glow: 'rgba(100,116,139,0.4)' };
            return `
            <div class="reward-pack-card" style="animation-delay:${0.3 + idx * 0.22}s; --pack-glow:${info.glow}; --pack-color:${info.color}">
                <div class="reward-pack-icon" style="background: radial-gradient(circle, ${info.glow} 0%, rgba(15,23,42,0.8) 70%)">${info.icon}</div>
                <div class="reward-pack-name" style="color:${info.color}">${info.name}</div>
                <div class="reward-pack-desc">${info.desc}</div>
            </div>`;
        }).join('')
        : `<div class="reward-pack-card" style="animation-delay:0.3s">
            <div class="reward-pack-icon">💰</div>
            <div class="reward-pack-name" style="color:#fbbf24">+${OVERFLOW_BONUS_SCORE} Bonus Score</div>
            <div class="reward-pack-desc">Inventory full — bonus applied to next match</div>
           </div>`;

    overlay.innerHTML = `
        <div class="reward-anim-panel">
            <!-- Header -->
            <div class="reward-anim-header">
                <div class="reward-trophy-ring">🏆</div>
                <h2 class="reward-anim-title">CHALLENGE COMPLETE!</h2>
                <p class="reward-anim-challenge-name">${challenge.title}</p>
                <span class="diff-badge diff-${challenge.diff} mx-auto mt-1">${d.label}</span>
            </div>

            <!-- Mystery box -->
            <div class="reward-box-wrapper" id="rewardBoxWrapper">
                <div class="reward-box-lid" id="rewardBoxLid">
                    <div class="reward-box-lid-face"></div>
                    <div class="reward-box-lid-top"></div>
                </div>
                <div class="reward-box-body">
                    <span class="reward-box-label">?</span>
                </div>
                <!-- Stars / sparkles burst -->
                <div class="reward-burst" id="rewardBurst">
                    ${Array.from({length:12}, (_,i) => `<div class="burst-star" style="--angle:${i*30}deg; --delay:${(i%4)*0.06}s"></div>`).join('')}
                </div>
            </div>

            <!-- Pack cards (revealed after box opens) -->
            <div class="reward-packs-row" id="rewardPacksRow">
                ${packCardsHtml}
            </div>

            <!-- Count badge -->
            <p class="reward-count-text">${grantedKeys.length > 0 ? `${grantedKeys.length} pack${grantedKeys.length > 1 ? 's' : ''} added to your inventory!` : 'Bonus score banked!'}</p>

            <!-- Continue button -->
            <button id="rewardAnimContinue" class="reward-continue-btn">
                <i class="fa-solid fa-check mr-2"></i>Continue
            </button>
        </div>`;

    overlay.classList.remove('hidden');
    // Force a reflow then add the open class to trigger CSS animation
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            overlay.classList.add('reward-overlay-in');
            const box = document.getElementById('rewardBoxWrapper');
            if (box) setTimeout(() => box.classList.add('box-open'), 400);
        });
    });

    playSound('powerup');

    document.getElementById('rewardAnimContinue')?.addEventListener('click', closeRewardAnimation);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeRewardAnimation(); });
}

function closeRewardAnimation() {
    const overlay = document.getElementById('rewardAnimOverlay');
    if (!overlay) return;
    overlay.classList.remove('reward-overlay-in');
    setTimeout(() => { overlay.classList.add('hidden'); overlay.innerHTML = ''; }, 350);
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
    // v7: telemetry — independent camera-shake events this match
    if (Engine.state === GameState.PLAYING) {
        Engine.runStats.screenShakeCount = (Engine.runStats.screenShakeCount || 0) + 1;
        bumpChallengeStat('bestShakeEventsPerMatch', Engine.runStats.screenShakeCount, 'max');
    }
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
    let blastKillsThisShot = 0; // v7: for Flame multi-kill telemetry

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
            if (isBlast) { triggerShake(10, 20); blastKillsThisShot++; }

            // ════════════════════════════════════════════════
            // v7: CHALLENGE TELEMETRY — per-hit tracking
            // ════════════════════════════════════════════════
            bumpChallengeStat('lifetimeClaysSmashed', 1);
            bumpChallengeStat('cycleClaysSmashed', 1);
            bumpChallengeStat('lifetimeScore', total);
            bumpChallengeStat('sessionScore', total);
            bumpChallengeStat('bestComboEver', Engine.comboCount, 'max');
            bumpChallengeStat('bestNoMissStreak', ++Engine.runStats.noMissStreak, 'max');
            if (Engine.mode === 'lives') bumpChallengeStat('bestLivesCombo', Engine.comboCount, 'max');

            // Multiplier window score tracking
            if (Engine.powerUps.multiplier > 0) {
                bumpChallengeStat('lifetimeMultiplierScore', 1); // flag: scored during multiplier
                Engine.runStats.multiplierWindowScore = (Engine.runStats.multiplierWindowScore || 0) + total;
                bumpChallengeStat('bestMultiplierWindowScore', Engine.runStats.multiplierWindowScore, 'max');
                // Score Multitasking: 5x combo while multiplier active
                if (Engine.comboCount >= 5) bumpChallengeStat('bestComboDuringMultiplier', Engine.comboCount, 'max');
                // Point Maximizer: 10x combo + multiplier
                if (Engine.comboCount >= 10) bumpChallengeStat('lifetimeComboMultiplierCombo', 1);
            } else {
                Engine.runStats.multiplierWindowScore = 0;
            }

            // Cryo window hits
            if (Engine.powerUps.cryo > 0) {
                Engine.runStats.cryoHitsThisWindow = (Engine.runStats.cryoHitsThisWindow || 0) + 1;
                bumpChallengeStat('bestCryoWindowHits', Engine.runStats.cryoHitsThisWindow, 'max');
            }

            // Frenzy window score
            if (Engine.powerUps.frenzy > 0 || Engine.isFrenzySpawning) {
                Engine.runStats.frenzyWindowScore = (Engine.runStats.frenzyWindowScore || 0) + total;
                bumpChallengeStat('bestFrenzyWindowScore', Engine.runStats.frenzyWindowScore, 'max');
            }

            // Pure Gunplay — score without power-up use
            if (Engine.runStats.powerUpsUsedCount === 0) {
                Engine.runStats.noPowerUpScore = (Engine.runStats.noPowerUpScore || 0) + total;
                bumpChallengeStat('bestNoPowerUpScore', Engine.runStats.noPowerUpScore, 'max');
            }

            // No Safety Net lives score tracking
            if (Engine.mode === 'lives' && !Engine.runStats.safetyNetUsed) {
                Engine.runStats.noSafetyNetScore = (Engine.runStats.noSafetyNetScore || 0) + total;
                bumpChallengeStat('bestNoSafetyNetLivesScore', Engine.runStats.noSafetyNetScore, 'max');
            }

            // Swerve tracking
            if (t.isSwerve) {
                Engine.runStats.swerveHitsInRow++;
                bumpChallengeStat('lifetimeSwerveHits', 1);
                bumpChallengeStat('bestSwerveNoMissStreak', Engine.runStats.swerveHitsInRow, 'max');
                bumpChallengeStat('bestLateSwerveStreak',
                    Engine.playTimeSec > 60 ? Engine.runStats.swerveHitsInRow : 0, 'max');
                // Precision Burst: track swerve hits in match
                Engine.runStats.matchSwerveHits = (Engine.runStats.matchSwerveHits || 0) + 1;
            } else {
                Engine.runStats.swerveHitsInRow = 0;
            }

            // Apex hit detection (target at/near apex = speedY close to 0)
            const isAtApex = Math.abs(t.speedY) < 0.8;
            if (isAtApex) {
                Engine.runStats.apexHitsInRow = (Engine.runStats.apexHitsInRow || 0) + 1;
                bumpChallengeStat('lifetimeApexHits', 1);
                bumpChallengeStat('bestApexStreak', Engine.runStats.apexHitsInRow, 'max');
            } else {
                Engine.runStats.apexHitsInRow = 0;
            }

            // Descending hit streak (target falling = speedY positive)
            if (t.speedY > 0) {
                Engine.runStats.descendingHitStreak = (Engine.runStats.descendingHitStreak || 0) + 1;
                bumpChallengeStat('bestDescendingHitStreak', Engine.runStats.descendingHitStreak, 'max');
            } else {
                Engine.runStats.descendingHitStreak = 0;
            }

            // Position-based tracking (left/right/upper half, danger zone, boundary margin)
            if (t.x < VIRTUAL_WIDTH / 2) {
                bumpChallengeStat('lifetimeLeftHalfHits', 1);
                Engine.runStats.leftHalfScore = (Engine.runStats.leftHalfScore || 0) + total;
            } else {
                bumpChallengeStat('lifetimeRightHalfHits', 1);
                Engine.runStats.rightHalfScore = (Engine.runStats.rightHalfScore || 0) + total;
            }
            if (t.y < VIRTUAL_HEIGHT / 2) bumpChallengeStat('lifetimeUpperHalfHits', 1);
            if (t.y < VIRTUAL_HEIGHT * 0.25) bumpChallengeStat('lifetimeUpperQuarterHits', 1);
            if (t.y >= DANGER_ZONE_Y)         bumpChallengeStat('lifetimeDangerZoneHits', 1);
            if (t.x <= SPAWN_MARGIN + 8 || t.x >= VIRTUAL_WIDTH - SPAWN_MARGIN - 8) {
                bumpChallengeStat('lifetimeBoundaryMarginHits', 1);
            }

            // Balanced score check
            if ((Engine.runStats.leftHalfScore || 0) >= 30 && (Engine.runStats.rightHalfScore || 0) >= 30) {
                bumpChallengeStat('lifetimeBalancedScore', 1);
            }

            // Speed / spin tracking
            const speedMag = Math.hypot(t.speedX, t.speedY);
            const profile  = getProfile();
            if (speedMag >= profile.speedMax * 0.92) {
                bumpChallengeStat('lifetimeMaxSpeedHits', 1);
                Engine.runStats.maxSpeedHitStreak = (Engine.runStats.maxSpeedHitStreak || 0) + 1;
                bumpChallengeStat('bestMaxSpeedHitStreak', Engine.runStats.maxSpeedHitStreak, 'max');
            } else {
                Engine.runStats.maxSpeedHitStreak = 0;
            }
            if (Math.abs(t.spinSpeed) >= profile.spinMax * 0.85) bumpChallengeStat('lifetimeHighSpinHits', 1);

            // Quick reflex — hit within 0.5s (30 ticks) of spawn
            if (t.swerveAge <= 30) {
                bumpChallengeStat('lifetimeQuickHits', 1);
                Engine.runStats.quickHitStreak = (Engine.runStats.quickHitStreak || 0) + 1;
                bumpChallengeStat('bestQuickHitStreak', Engine.runStats.quickHitStreak, 'max');
            } else {
                Engine.runStats.quickHitStreak = 0;
            }

            // Quick doubles — two hits within 1 second
            const nowMs = Date.now();
            if (Engine.runStats.lastHitTime && (nowMs - Engine.runStats.lastHitTime) < 1000) {
                bumpChallengeStat('lifetimeQuickDoubles', 1);
            }
            Engine.runStats.lastHitTime = nowMs;

            // Cluster kills — 3 hits within 1.5s window
            Engine.runStats.clusterHitTimes = (Engine.runStats.clusterHitTimes || []).filter(t => nowMs - t < 1500);
            Engine.runStats.clusterHitTimes.push(nowMs);
            if (Engine.runStats.clusterHitTimes.length >= 3) bumpChallengeStat('lifetimeClusterKills', 1);

            // Accuracy-streak tracking
            Engine.runStats.consecHitsAllSuccess++;
            bumpChallengeStat('bestConsecHitsAllSuccess', Engine.runStats.consecHitsAllSuccess, 'max');

            // High density streak (track any hit as "high density" hit)
            Engine.runStats.highDensityStreak = (Engine.runStats.highDensityStreak || 0) + 1;
            bumpChallengeStat('bestHighDensityStreak', Engine.runStats.highDensityStreak, 'max');

            // Clean sheet — score < 15 before first miss
            if (!Engine.runStats.cleanSheetBroken) {
                Engine.runStats.cleanSheetScore = (Engine.runStats.cleanSheetScore || 0) + total;
                if (Engine.runStats.cleanSheetScore >= 15) bumpChallengeStat('lifetimeCleanSheet15', 1);
            }

            // Fast Fifty — 50 points in first 40 seconds
            if (Engine.score >= 50 && Engine.playTimeSec < 40) bumpChallengeStat('lifetimeFastFifty', 1);
            // Fast 75 — 75 points in first 45 seconds
            if (Engine.score >= 75 && Engine.playTimeSec < 45) bumpChallengeStat('lifetimeFast75', 1);

            // Calculated Ramping — 120 pts when ramp peaks
            if (Engine.score >= 120 && Engine.playTimeSec >= getProfile().rampSecs) {
                bumpChallengeStat('lifetimeMaxRampScore', Engine.score, 'max');
            }

            // Combo after ramp peak
            if (Engine.playTimeSec >= getProfile().rampSecs) {
                bumpChallengeStat('bestComboAfterPeakRamp', Engine.comboCount, 'max');
            }

            // No Room for Error — 25 combo at 1 life
            if (Engine.mode === 'lives' && Engine.lives === 1) {
                bumpChallengeStat('bestComboAtOneLife', Engine.comboCount, 'max');
            }

            // Triple Stack Combo (Catalyst): flame + cryo + multiplier all active with 30+ combo
            if (Engine.powerUps.flame > 0 && Engine.powerUps.cryo > 0 && Engine.powerUps.multiplier > 0 && Engine.comboCount >= 30) {
                bumpChallengeStat('lifetimeTripleStackCombo', 1);
            }

            // Edge-to-edge: left shot then right shot within 0.5s
            Engine.runStats.edgeHits = (Engine.runStats.edgeHits || []).filter(h => nowMs - h.t < 500);
            if (t.x < SPAWN_MARGIN * 1.5) Engine.runStats.edgeHits.push({ side: 'left', t: nowMs });
            if (t.x > VIRTUAL_WIDTH - SPAWN_MARGIN * 1.5) {
                const leftHit = Engine.runStats.edgeHits.find(h => h.side === 'left');
                if (leftHit) bumpChallengeStat('lifetimeEdgeToEdge', 1);
            }

            // Flawless survival time (no life lost + no combo break)
            if (!Engine.runStats.livesLostEarly && Engine.comboCount > 0) {
                bumpChallengeStat('bestFlawlessSurvivalSec', Engine.playTimeSec, 'max');
            }

            Engine.targets.splice(i, 1);
            hitCount++;
            if (!isBlast) break; // only blast hits multiple
        }
    }

    // v7: Flame multi-kill telemetry (after the loop, once we know the total)
    if (isBlast && blastKillsThisShot > 0) {
        bumpChallengeStat('bestFlameMultiKill', blastKillsThisShot, 'max');
    }

    // ── v3: missed shot → break combo ──────────────────────
    if (hitCount === 0) {
        Engine.comboCount = 0;
        refreshComboDisplay();
        Engine.runStats.noMissStreak = 0;
        Engine.runStats.consecHitsAllSuccess = 0;
        Engine.runStats.swerveHitsInRow = 0;
        Engine.runStats.apexHitsInRow = 0;
        Engine.runStats.descendingHitStreak = 0;
        Engine.runStats.highDensityStreak = 0;
        Engine.runStats.maxSpeedHitStreak = 0;
        Engine.runStats.quickHitStreak = 0;
        Engine.runStats.cleanSheetBroken = true; // breaks Clean Sheet
    }
}

// ─── POWER-UP APPLY ──────────────────────────────────────────
function applyPowerUp(t) {
    if (t.type === 'normal' || t.type === 'swerve') return;
    playSound('powerup');

    // v7: telemetry — power-up variety + medic-at-one-life
    Engine.runStats.powerUpsUsedTypes.add(t.type);
    bumpChallengeStat('bestPowerUpTypesPerMatch', Engine.runStats.powerUpsUsedTypes.size, 'max');

    switch(t.type) {
        case 'medic':
            if (Engine.lives === 1) bumpChallengeStat('lifetimeMedicAtOneLife', 1);
            Engine.runStats.medicUsesThisMatch = (Engine.runStats.medicUsesThisMatch || 0) + 1;
            bumpChallengeStat('bestMedicUsesPerMatch', Engine.runStats.medicUsesThisMatch, 'max');
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
        case 'safetyNet':
            Engine.powerUps.safetyNet = 480;
            Engine.runStats.safetyNetUsed = true; // track for No Shield challenges
            break;
        case 'cryo':
            Engine.powerUps.cryo = 300;
            Engine.currentGravity = BASE_GRAVITY * 0.5;
            bumpChallengeStat('lifetimeCryoTriggers', 1);
            Engine.runStats.cryoHitsThisWindow = 0; // reset window counter
            Engine.runStats.cryoUsedThisMatch = true;
            break;
        case 'multiplier':
            if (Engine.powerUps.multiplier > 0) bumpChallengeStat('lifetimeMultiplierStacks', 1);
            Engine.powerUps.multiplier = 360;
            Engine.activeMultiplier = 2;
            Engine.runStats.multiplierWindowScore = 0; // reset window
            break;
        case 'flame':
            Engine.powerUps.flame = 300;
            triggerShake(5, 12);
            break;
        case 'frenzy':
            Engine.powerUps.frenzy = 240;
            Engine.runStats.frenzyWindowScore = 0; // reset frenzy window each activation
            if (Engine.mode === 'timed' && Engine.gameTimer >= (parseInt(DOM.timedDurationSelect.value, 10) - 30)) {
                bumpChallengeStat('lifetimeEarlyFrenzy', 1);
            }
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

    // v7: telemetry — sidebar pack-type variety this match
    Engine.runStats.powerUpsUsedTypes.add(key);
    Engine.runStats.powerUpsUsedCount++;
    bumpChallengeStat('bestPowerUpTypesPerMatch', Engine.runStats.powerUpsUsedTypes.size, 'max');

    switch (key) {
        case 'medicClay':
            if (Engine.lives === 1) bumpChallengeStat('lifetimeMedicAtOneLife', 1);
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
            bumpChallengeStat('lifetimeCryoTriggers', 1);
            Engine.runStats.cryoHitsThisWindow = 0;
            Engine.runStats.cryoUsedThisMatch = true;
            Engine.floatingTexts.push(new FloatingText(cx, cy - 40, 'CRYO FREEZE ACTIVE!', def.color, 1.3));
            break;
        case 'multiplier':
            if (Engine.powerUps.multiplier > 0) bumpChallengeStat('lifetimeMultiplierStacks', 1);
            Engine.powerUps.multiplier = 360;
            Engine.activeMultiplier = 2;
            Engine.runStats.multiplierWindowScore = 0;
            Engine.floatingTexts.push(new FloatingText(cx, cy - 40, 'MULTIPLIER ACTIVE!', def.color, 1.3));
            break;
        case 'flameRounds':
            Engine.powerUps.flame = 300;
            triggerShake(5, 12);
            Engine.floatingTexts.push(new FloatingText(cx, cy - 40, 'FLAME ROUNDS ACTIVE!', def.color, 1.3));
            break;
        case 'frenzy':
            if (Engine.powerUps.frenzy > 0) bumpChallengeStat('lifetimeFrenzyStacks', 1);
            Engine.powerUps.frenzy = 240;
            Engine.runStats.frenzyWindowScore = 0;
            Engine.floatingTexts.push(new FloatingText(cx, cy - 40, 'FRENZY ACTIVE!', def.color, 1.3));
            break;
    }

    // v7: Resourceful — banked inventory fully emptied during this activation
    const totalLeft = PACK_KEYS.reduce((sum, k) => sum + (Meta.packs[k] || 0), 0);
    if (totalLeft === 0) bumpChallengeStat('lifetimeInventoryEmptied', 1);

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
                    // v7: telemetry — safety net absorbed a drop
                    bumpChallengeStat('lifetimeSafetyNetSaves', 1);
                    if (Engine.comboCount > 10) bumpChallengeStat('lifetimeSafetyNetComboSave', 1);
                } else {
                    Engine.comboCount = 0;
                    refreshComboDisplay();
                    Engine.runStats.zeroDropStreakActive = false; // v7: breaks "no drop" challenges
                    Engine.runStats.cleanSheetBroken = true;     // v7: breaks clean sheet

                    Engine.lives--;
                    refreshLivesDisplay();
                    // v7: Crisis Management tracking — down to 1 life within 20s
                    if (Engine.lives === 1 && Engine.playTimeSec <= 20) {
                        Engine.runStats.wasAtOneLifeEarly = true;
                    }
                    // v7: Overlord — went below 2 lives
                    if (Engine.lives < 2) Engine.runStats.wentBelowTwoLives = true;
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

    // v7: reset per-run challenge telemetry
    Engine.runStats = {
        matchesPlayedLives:   Engine.runStats.matchesPlayedLives,
        matchesPlayedTimed:   Engine.runStats.matchesPlayedTimed,
        normalClaysHit:       0,
        swerveHitsInRow:      0,
        swerveHitsTotal:      0,
        swerveHitsNoMissRun:  0,
        noMissStreak:         0,
        flameMultiKillBest:   0,
        cryoHitsThisWindow:   0,
        cryoNoMissWindow:     true,
        cryoUsedThisMatch:    false,
        powerUpsUsedTypes:    new Set(),
        powerUpsUsedCount:    0,
        livesLostEarly:       false,
        wasAtOneLifeEarly:    false,
        wentBelowTwoLives:    false,
        leftHalfHits:         0,
        rightHalfHits:        0,
        upperHalfHits:        0,
        apexHitsInRow:        0,
        highSpinHits:         0,
        maxSpeedHits:         0,
        maxSpeedHitStreak:    0,
        consecHitsAllSuccess: 0,
        firstTargetSkipped:   false,
        firstTargetSeen:      false,
        cleanSheetScore:      0,
        cleanSheetBroken:     false,
        safetyNetSaves:       0,
        safetyNetUsed:        false,
        medicUsedAtOneLife:   false,
        medicUsesThisMatch:   0,
        frenzyWindowScore:    0,
        frenzyWaveClearAll:   true,
        gamepadUsed:          !!getActivePad(),
        gamepadNonDefault:    settings.padPreset !== 'default',
        screenShakeCount:     0,
        edgeHits:             [],
        simultaneousKills:    0,
        dangerZoneHits:       0,
        boundaryMarginHits:   0,
        multiplierWindowScore:0,
        multiplierStacks:     0,
        zeroDropStreakActive: true,
        matchStartTime:       Date.now(),
        noPowerUpScore:       0,
        noSafetyNetScore:     0,
        leftHalfScore:        0,
        rightHalfScore:       0,
        descendingHitStreak:  0,
        quickHitStreak:       0,
        lastHitTime:          0,
        clusterHitTimes:      [],
        highDensityStreak:    0,
        matchSwerveHits:      0,
    };
    window._settingsChangedThisMatch = false; // reset for Greenhorn Hunter
    bumpChallengeStat('lifetimeMatchesAnyStarted', 1);
    if (mode === 'lives') bumpChallengeStat('lifetimeMatchesLives', 1);
    if (settings.padPreset !== 'default' && getActivePad()) {
        bumpChallengeStat('lifetimeNonDefaultPadMatch', 1);
    }
    bumpChallengeStat('lifetimeMatchesWithAudio', audioInitialized ? 1 : 0, 'max');
    // v7: Vault Raider — claimed the vault within the last 30s, then started a match
    if (window._vaultJustClaimedAt && (Date.now() - window._vaultJustClaimedAt) < 30000) {
        bumpChallengeStat('lifetimeVaultThenMatch', 1);
        window._vaultJustClaimedAt = null;
    }

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

    // ════════════════════════════════════════════════════════
    // v7: CHALLENGE TELEMETRY — match-end aggregates
    // ════════════════════════════════════════════════════════
    const durationSec = Math.round((Date.now() - (Engine.runStats.matchStartTime || Date.now())) / 1000);
    bumpChallengeStat('bestMatchDurationSec', Engine.playTimeSec, 'max');
    bumpChallengeStat('bestAccuracyMatch', accuracy, 'max');
    bumpChallengeStat('bestSingleMatchScore', Engine.score, 'max');

    // Accuracy streak tracking (65%+ in a row)
    if (accuracy >= 65 && Engine.shotsFired >= 5) {
        ChallengeData.stats._accuracyStreak = (ChallengeData.stats._accuracyStreak || 0) + 1;
        bumpChallengeStat('bestAccuracyStreakMatches', ChallengeData.stats._accuracyStreak, 'max');
    } else {
        ChallengeData.stats._accuracyStreak = 0;
    }

    // 3-match rolling score sum
    ChallengeData.stats._last3Scores = ChallengeData.stats._last3Scores || [];
    ChallengeData.stats._last3Scores.push(Engine.score);
    if (ChallengeData.stats._last3Scores.length > 3) ChallengeData.stats._last3Scores.shift();
    const sum3 = ChallengeData.stats._last3Scores.reduce((a, b) => a + b, 0);
    bumpChallengeStat('best3MatchScoreSum', sum3, 'max');

    // Defaultcrosshair score: track if using 'classic' style + no assist
    if (settings.crosshairStyle === 'classic' && !settings.padAimAssist && Engine.score >= 100) {
        bumpChallengeStat('bestDefaultCrosshairScore', Engine.score, 'max');
    }

    // No-power-up run score
    if (Engine.runStats.powerUpsUsedCount === 0) {
        bumpChallengeStat('bestNoPowerUpScore', Engine.score, 'max');
    }

    if (Engine.mode === 'lives') {
        bumpChallengeStat('bestLivesScore', Engine.score, 'max');
        if (Engine.difficulty === 'easy') {
            bumpChallengeStat('bestEasyLivesScore', Engine.score, 'max');
            if (!window._settingsChangedThisMatch) bumpChallengeStat('lifetimeEasyMatchesClean', 1);
        }
        if (Engine.difficulty === 'normal') {
            bumpChallengeStat('bestNormalLivesScore', Engine.score, 'max');
            if (accuracy === 100 && Engine.shotsFired > 0) {
                bumpChallengeStat('bestPerfectNormalLivesScore', Engine.score, 'max');
            }
            // Overlord: 400+ pts, max ramp, never below 2 lives
            if (Engine.score >= 400 && Engine.playTimeSec >= getProfile().rampSecs && !Engine.runStats.wentBelowTwoLives) {
                bumpChallengeStat('bestOverlordRun', Engine.score, 'max');
            }
        }
        if (Engine.lives === MAX_LIVES) bumpChallengeStat('lifetimeFlawlessNormalLives', 1);
        if (Engine.runStats.zeroDropStreakActive) bumpChallengeStat('lifetimeZeroDropMatches', 1);
        // Flawless Normal: 100% perfect clear (no drops, full accuracy)
        if (Engine.runStats.zeroDropStreakActive && accuracy === 100 && Engine.difficulty === 'normal') {
            bumpChallengeStat('lifetimePerfectClearNormal', 1);
        }
        // No Safety Net — score tracked per-hit; capture final max here
        if (!Engine.runStats.safetyNetUsed) {
            bumpChallengeStat('lifetimeMatchesNoSafetyNet', 1);
        }
        // Crisis Comeback — reduced to 1 life in first 20s but survived
        if (Engine.runStats.wasAtOneLifeEarly && Engine.lives > 0) {
            bumpChallengeStat('lifetimeCrisisComebacks', 1);
        }
        // Finisher — 200+ pts, ended with 20-hit streak
        if (Engine.score >= 200 && Engine.runStats.noMissStreak >= 20) {
            bumpChallengeStat('lifetimeFlawlessFinisher', 1);
        }
        // Timed survival
        bumpChallengeStat('bestTimedSurvivalSec', Engine.playTimeSec, 'max');
    } else {
        bumpChallengeStat('bestTimedScore', Engine.score, 'max');
        bumpChallengeStat('bestTimedSurvivalSec', Engine.playTimeSec, 'max');
        bumpChallengeStat('lifetimeTimedScore', Engine.score);
        bumpChallengeStat('lifetimeTimedClaysHit', Engine.shotsHit);

        // 2-match timed score sum
        ChallengeData.stats._last2TimedScores = ChallengeData.stats._last2TimedScores || [];
        ChallengeData.stats._last2TimedScores.push(Engine.score);
        if (ChallengeData.stats._last2TimedScores.length > 2) ChallengeData.stats._last2TimedScores.shift();
        const sum2 = ChallengeData.stats._last2TimedScores.reduce((a, b) => a + b, 0);
        bumpChallengeStat('best2MatchTimedScoreSum', sum2, 'max');

        // Triple Digit Blitz: 100 pts with 15+ seconds left
        if (Engine.score >= 100 && Engine.gameTimer > 15) bumpChallengeStat('lifetimeTripleDigitBlitz', 1);

        // Trigger Discipline: under 50 shots in a 60s match
        if (Engine.shotsFired < 50 && parseInt(DOM.timedDurationSelect.value, 10) >= 60) {
            bumpChallengeStat('lifetimeDisciplinedMatches', 1);
        }

        // Perfect minute — 60s match with 100% accuracy
        if (accuracy === 100 && Engine.shotsFired > 0 && parseInt(DOM.timedDurationSelect.value, 10) >= 60) {
            bumpChallengeStat('lifetimePerfectMinute', 1);
        }
    }

    // Cross-mode stats
    if (Engine.shotsFired > 0 && Engine.shotsFired < 40) bumpChallengeStat('lifetimeLowShotMatches', 1);

    // Efficient Hundred: 100 pts with < 105 shots
    if (Engine.score >= 100 && Engine.shotsFired < 105) bumpChallengeStat('lifetimeEfficientHundred', 1);

    // Aim Assist Off with controller
    if (getActivePad() && !settings.padAimAssist) bumpChallengeStat('lifetimeMatchesAssistOff', 1);

    // Audio check
    if (audioInitialized) bumpChallengeStat('lifetimeMatchesWithAudio', 1);

    bumpChallengeStat('lifetimePlayTimeSec', durationSec);

    // 5-match average score
    ChallengeData.stats._last5Scores = ChallengeData.stats._last5Scores || [];
    ChallengeData.stats._last5Scores.push(Engine.score);
    if (ChallengeData.stats._last5Scores.length > 5) ChallengeData.stats._last5Scores.shift();
    if (ChallengeData.stats._last5Scores.length === 5) {
        const avg5 = ChallengeData.stats._last5Scores.reduce((a,b) => a+b, 0) / 5;
        bumpChallengeStat('best5MatchAvgScore', avg5, 'max');
    }

    // Rapid cluster clear: 5 hits in 2 seconds without power-ups (use cluster hits logic)
    if (Engine.runStats.powerUpsUsedCount === 0) {
        const clusterTimes = Engine.runStats.clusterHitTimes || [];
        const recentCluster = clusterTimes.filter(t => Date.now() - t < 2000);
        if (recentCluster.length >= 5) bumpChallengeStat('lifetimeRapidClusterClear', 1);
    }

    // Precision Burst: 30 shots, 30 hits, 10 swerve
    if (Engine.shotsFired >= 30 && Engine.shotsFired === Engine.shotsHit && (Engine.runStats.matchSwerveHits || 0) >= 10) {
        bumpChallengeStat('lifetimePrecisionBurst', 1);
    }

    // No Cryo Late Score: 150+ pts past ramp peak without cryo
    if (!Engine.runStats.cryoUsedThisMatch && Engine.playTimeSec >= getProfile().rampSecs && Engine.score >= 150) {
        bumpChallengeStat('bestNoCryoLateScore', Engine.score, 'max');
    }

    saveChallengeData();

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

    // v7: telemetry — flag that the vault was just claimed; consumed by the
    // next startGame() call to detect "claim then immediately play" combo
    window._vaultJustClaimedAt = Date.now();

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
    bumpChallengeStat('lifetimeChangelogOpened', 1);
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
    window._settingsChangedThisMatch = true;
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
        bumpChallengeStat('lifetimeSensitivityChanged', 1);
    });

    const dz = document.getElementById('deadzoneSlider');
    if (dz) dz.addEventListener('input', e => {
        settings.padDeadzone = parseInt(e.target.value, 10);
        const lbl = document.getElementById('deadzoneLabel');
        if (lbl) lbl.textContent = settings.padDeadzone + '%';
        saveSettings();
        bumpChallengeStat('lifetimeSensitivityChanged', 1);
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

// ════════════════════════════════════════════════════════════
// ─── v7: EVENT WIRING — Challenges System ────────────────────
// ════════════════════════════════════════════════════════════

// Main menu Challenges button
if (DOM.challengesButton) {
    DOM.challengesButton.addEventListener('click', () => openChallengesOverlay(false));
}

// Pause menu Challenges button — opens overlay without ending the run
if (DOM.pauseChallengesButton) {
    DOM.pauseChallengesButton.addEventListener('click', () => openChallengesOverlay(true));
}

// Close button returns to whichever screen opened it (main menu or pause menu)
if (DOM.closeChallengesButton) {
    DOM.closeChallengesButton.addEventListener('click', closeChallengesOverlay);
}

// Daily / Weekly tab switching
DOM.challengeTabBtns.forEach(btn => {
    btn.addEventListener('click', () => setActiveChallengeTab(btn.dataset.challengeTab));
});

// Reroll + Claim buttons (event delegation on the grid container)
if (DOM.challengesGrid) {
    DOM.challengesGrid.addEventListener('click', handleChallengesGridClick);
}

// Initial notification dot state on boot
updateChallengesNotifDots();
