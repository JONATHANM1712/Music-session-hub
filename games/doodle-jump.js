
/*
  ==========================================================
  DOODLE JUMP — MUSIC SESSION HUB
  Original APK Asset Edition

  UPDATED: THREE MOVING PLATFORM SPEEDS

  FEATURES
  ----------------------------------------------------------
  - Original APK character and platform sprites
  - Original APK sound files
  - Height-based scoring
  - Progressive platform spacing
  - Slow, Medium, and Fast moving platforms
  - Spring
  - Double Spring
  - Trampoline
  - Helicopter
  - Rocket
  - Breakable brown platforms
  - Disappearing gray platforms
  - Keyboard, touch, and optional tilt controls
  - Local storage for settings, scores, and saved runs
  - No enemies
  - No shooting

  Moving platform speeds are custom gameplay settings,
  not verified numerical constants from the original APK.

  Helicopter and Rocket durations are retained from
  the supplied JavaScript:
    Helicopter: 3.0 seconds
    Rocket:     3.3 seconds

  ==========================================================
*/

(() => {
  "use strict";

  /* ======================================================
     1. INITIALIZATION
     ====================================================== */

  const el = id => document.getElementById(id);

  const canvas = el("game");

  if (!canvas || canvas.dataset.initialized === "1") {
    return;
  }

  canvas.dataset.initialized = "1";

  const ctx = canvas.getContext("2d");

  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;

  const PW = 104;
  const PH = 30;
  const HALF_PLAYER = 24;

  const GRAVITY = 0.42;
  const JUMP = -12.6;

  const START_Y = 529;

  const clamp = (value, min, max) =>
    Math.max(min, Math.min(max, value));

  const rand = (min, max) =>
    min + Math.random() * (max - min);

  /* ======================================================
     2. FLIGHT POWER-UPS

     Durations retained from the supplied source.
     These are not verified original APK timer values.
     ====================================================== */

  const FLIGHT = Object.freeze({
    helicopter: {
      duration: 3.0,
      vy: -6.4
    },

    rocket: {
      duration: 3.3,
      vy: -15.5
    }
  });

  /* ======================================================
     3. MOVING PLATFORM SPEED PROFILES

     frequency = horizontal oscillations per second
     amplitude = horizontal travel radius in pixels

     Three speed categories:
       SLOW
       MEDIUM
       FAST
     ====================================================== */

  const MOVING_SPEEDS = Object.freeze({
    slow: {
      frequency: [0.65, 1.05],
      amplitude: [12, 24]
    },

    medium: {
      frequency: [1.25, 1.85],
      amplitude: [20, 37]
    },

    fast: {
      frequency: [2.15, 3.00],
      amplitude: [28, 49]
    }
  });

  /*
    Distribution among moving platforms:

    At minimum difficulty:
      Slow   78%
      Medium 20%
      Fast    2%

    At maximum difficulty:
      Slow   20%
      Medium 38%
      Fast   42%
  */

  function chooseMovingSpeed(difficulty) {
    const d = clamp(difficulty, 0, 1);

    const slowChance = 0.78 - 0.58 * d;
    const mediumChance = 0.20 + 0.18 * d;

    const r = Math.random();

    if (r < slowChance) {
      return "slow";
    }

    if (r < slowChance + mediumChance) {
      return "medium";
    }

    return "fast";
  }

  /* ======================================================
     4. ASSET DIRECTORY
     ====================================================== */

  const scriptURL =
    document.currentScript?.src ||
    new URL(
      "doodle-jump.js",
      document.baseURI
    ).href;

  const asset = path =>
    new URL(
      "assets/doodle-jump/" + path,
      scriptURL
    ).href;

  /* ======================================================
     5. LOCAL STORAGE
     ====================================================== */

  const KEY = {
    settings: "msh.doodlejump.settings",
    best: "msh.doodlejump.height.best",
    recent: "msh.doodlejump.height.recent",
    run: "msh.doodlejump.height.run"
  };

  const DEFAULTS = {
    background: "classic",
    sound: true,
    volume: 65,
    tilt: false
  };

  const storage = {
    get(key, fallback) {
      try {
        const value = localStorage.getItem(key);

        return value === null
          ? fallback
          : JSON.parse(value);
      } catch {
        return fallback;
      }
    },

    put(key, value) {
      try {
        localStorage.setItem(
          key,
          JSON.stringify(value)
        );
      } catch {}
    },

    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }
  };

  const savedSettings = storage.get(
    KEY.settings,
    {}
  );

  let settings = {
    ...DEFAULTS,
    ...(
      savedSettings &&
      typeof savedSettings === "object"
        ? savedSettings
        : {}
    )
  };

  const validBackgrounds = [
    "classic",
    "sky",
    "mint",
    "sunset",
    "night"
  ];

  if (!validBackgrounds.includes(
    settings.background
  )) {
    settings.background = "classic";
  }

  settings.volume = clamp(
    Number(settings.volume) || 0,
    0,
    100
  );

  let best = Math.max(
    0,
    Number(storage.get(KEY.best, 0)) || 0
  );

  let recent = storage.get(
    KEY.recent,
    null
  );

  /* ======================================================
     6. ORIGINAL APK GRAPHICS
     ====================================================== */

  const atlas = {
    "doodle-right":
      "sprites/doodle-right.png",

    "doodle-left":
      "sprites/doodle-left.png",

    "doodle-right-jump":
      "sprites/doodle-right-jump.png",

    "doodle-left-jump":
      "sprites/doodle-left-jump.png",

    green:
      "sprites/platform-green.png",

    blue:
      "sprites/platform-blue.png",

    gray:
      "sprites/platform-gray.png",

    brown:
      "sprites/platform-brown.png",

    spring:
      "powerups/spring-shoe.png",

    doubleSpring:
      "powerups/double-spring-shoes.png",

    trampoline:
      "powerups/trampoline.png",

    trampolineDown:
      "powerups/trampoline-compressed.png",

    classic:
      "backgrounds/classic-paper.png",

    sky:
      "backgrounds/sky.svg",

    mint:
      "backgrounds/mint.svg",

    sunset:
      "backgrounds/sunset.svg",

    night:
      "backgrounds/night.svg"
  };

  for (let n = 1; n <= 4; n++) {
    atlas["propeller" + n] =
      `powerups/propeller-${n}.png`;
  }

  for (let n = 1; n <= 9; n++) {
    atlas["rocket" + n] =
      `powerups/rocket-${n}.png`;
  }

  const images = {};

  for (const [name, path] of Object.entries(
    atlas
  )) {
    const image = new Image();

    image.src = asset(path);

    images[name] = image;
  }

  /* ======================================================
     7. ORIGINAL APK AUDIO
     ====================================================== */

  const audioFiles = {
    jump: "jump.ogg",
    spring: "feder.ogg",
    doubleSpring: "springshoes.ogg",
    trampoline: "trampoline.ogg",
    helicopter: "propeller1.ogg",
    rocket: "rocket.ogg",
    break: "explodingplatform.ogg"
  };

  const sounds = Object.fromEntries(
    Object.entries(audioFiles).map(
      ([name, path]) => [
        name,
        asset("audio/" + path)
      ]
    )
  );

  let activeAudio = null;

  function playSound(
    name,
    isFlight = false
  ) {
    if (
      !settings.sound ||
      settings.volume <= 0 ||
      !sounds[name]
    ) {
      return;
    }

    try {
      const audio = new Audio(
        sounds[name]
      );

      audio.volume =
        settings.volume / 100;

      audio.play().catch(() => {});

      if (isFlight) {
        activeAudio = audio;
      }
    } catch {}
  }

  function stopFlightAudio() {
    if (!activeAudio) return;

    activeAudio.pause();

    try {
      activeAudio.currentTime = 0;
    } catch {}

    activeAudio = null;
  }

  /* ======================================================
     8. GAME STATE
     ====================================================== */

  let mode = "ready";

  let score = 0;

  let player = null;

  let platforms = [];

  let cameraY = 0;
  let topY = 0;

  let lastAnchorX = 0;
  let nextId = 1;

  let gameTime = 0;
  let highAltitude = 0;

  let flight = null;

  let lastFrame = 0;
  let saveElapsed = 0;

  let recordAtStart = 0;

  let particles = [];

  let tiltAxis = 0;
  let tiltReceived = false;

  const pressed = {
    left: false,
    right: false
  };

  /* ======================================================
     9. DIFFICULTY SYSTEM
     ====================================================== */

  function levelProgress() {
    return clamp(
      highAltitude / 12000,
      0,
      1
    );
  }

  function level() {
    return Math.min(
      10,
      1 + Math.floor(
        levelProgress() * 10
      )
    );
  }

  /*
    Platform gaps:

    Beginning:
      63–87 pixels

    Maximum difficulty:
      151–174 pixels

    Moving platform probability:
      8% at the beginning
      50% at maximum difficulty

    Slow, Medium, Fast distribution changes
    independently according to altitude.
  */

  /* ======================================================
     10. SCORE DISPLAY
     ====================================================== */

  function refreshScore() {
    el("hud-score").textContent =
      score;

    el("hud-level").textContent =
      "LEVEL " + level();

    el("score").textContent =
      score;

    el("best").textContent =
      best;

    el("recent").textContent =
      recent == null
        ? "—"
        : recent;
  }

  function refreshSettings() {
    el("background").value =
      settings.background;

    el("sound").checked =
      !!settings.sound;

    el("volume").value =
      settings.volume;

    el("volume-label").textContent =
      settings.volume + "%";

    el("tilt").checked =
      !!settings.tilt;
  }

  function pauseButton() {
    el("pause").disabled =
      mode !== "playing" &&
      mode !== "paused";

    el("pause").textContent =
      mode === "paused"
        ? "▶"
        : "Ⅱ";

    el("pause").setAttribute(
      "aria-label",
      mode === "paused"
        ? "Resume game"
        : "Pause game"
    );
  }

  function overlay(
    title,
    description,
    button,
    extra = "Score = maximum altitude"
  ) {
    el("status").textContent =
      title;

    el("hint").textContent =
      description;

    el("start").textContent =
      button;

    el("overlay-extra").textContent =
      extra;

    el("overlay").hidden =
      false;
  }

  function flightBadge() {
    const badge =
      el("flight-status");

    badge.hidden = !flight;

    if (!flight) return;

    const label =
      flight.type === "rocket"
        ? "🚀 Rocket"
        : "🚁 Helicopter";

    badge.textContent =
      label +
      " · " +
      Math.max(
        0,
        flight.remaining
      ).toFixed(1) +
      "s";
  }

  /* ======================================================
     11. MOVING PLATFORM PHYSICS

     Uses a smooth sinusoidal motion.

     Important:
     Movement remains within the playable width.
     The platform does not become permanently stuck
     at the screen edges.
     ====================================================== */

  function platformX(p) {
    if (p.type !== "moving") {
      return p.x;
    }

    const amplitude =
      Number(p.amplitude) || 0;

    const frequency =
      Number(p.frequency) || 1;

    const phase =
      Number(p.phase) || 0;

    const offset =
      Math.sin(
        gameTime *
        Math.PI *
        2 *
        frequency +
        phase
      ) * amplitude;

    return clamp(
      p.x + offset,
      4,
      W - PW - 4
    );
  }

  /* ======================================================
     12. PLATFORM TYPE GENERATION
     ====================================================== */

  function anchorType(difficulty) {
    const d = clamp(
      difficulty,
      0,
      1
    );

    const movingChance =
      0.08 + 0.42 * d;

    const fadingChance =
      0.02 + 0.12 * d;

    const r = Math.random();

    if (r < movingChance) {
      return "moving";
    }

    if (
      r <
      movingChance + fadingChance
    ) {
      return "fading";
    }

    return "normal";
  }

  /* ======================================================
     13. RANDOM POWER-UPS
     ====================================================== */

  function randomPower(difficulty) {
    const d = clamp(
      difficulty,
      0,
      1
    );

    const r = Math.random();

    if (r < 0.065) {
      return "spring";
    }

    if (r < 0.095) {
      return "doubleSpring";
    }

    if (r < 0.123) {
      return "trampoline";
    }

    if (
      r <
      0.148 - 0.008 * d
    ) {
      return "helicopter";
    }

    if (
      r <
      0.160 - 0.008 * d
    ) {
      return "rocket";
    }

    return null;
  }

  /* ======================================================
     14. CREATE PLATFORM

     Each moving platform receives its own:
       speed category
       frequency
       amplitude
       movement phase

     This prevents all moving platforms from
     moving in exactly the same pattern.
     ====================================================== */

  function makePlatform(
    y,
    x,
    type = "normal",
    power = null
  ) {
    const d = levelProgress();

    let movingSpeed = null;
    let frequency = 0;
    let amplitude = 0;

    let centerX = clamp(
      x,
      4,
      W - PW - 4
    );

    if (type === "moving") {
      movingSpeed =
        chooseMovingSpeed(d);

      const profile =
        MOVING_SPEEDS[movingSpeed];

      frequency = rand(
        profile.frequency[0],
        profile.frequency[1]
      );

      amplitude = rand(
        profile.amplitude[0],
        profile.amplitude[1]
      );

      /*
        Keep the movement center away from
        the edges where possible.

        If the movement amplitude exceeds
        the available horizontal space,
        reduce it safely.
      */

      const leftBoundary = 4;
      const rightBoundary =
        W - PW - 4;

      const availableHalfWidth =
        (rightBoundary - leftBoundary) / 2;

      amplitude = Math.min(
        amplitude,
        availableHalfWidth
      );

      centerX = clamp(
        centerX,
        leftBoundary + amplitude,
        rightBoundary - amplitude
      );
    }

    const p = {
      id: nextId++,

      x: centerX,
      y,

      type,
      power,

      movingSpeed,

      counted: false,

      broken: false,
      brokenAt: -1,

      vanishAt: -1,

      phase: rand(
        0,
        Math.PI * 2
      ),

      frequency,
      amplitude,

      trampolineBounceAt: -1
    };

    platforms.push(p);

    return p;
  }

  /* ======================================================
     15. PROGRESSIVE PLATFORM GENERATION
     ====================================================== */

  function growPlatforms() {
    /*
      Ordinary jump apex is approximately
      189 world pixels.

      Platform gaps become larger as the
      player climbs.

      Maximum gap is kept below the ordinary
      vertical jump height.

      Brown platforms remain optional hazards,
      not mandatory landing platforms.
    */

    while (
      topY > cameraY - 650
    ) {
      const d = levelProgress();

      const minimumGap =
        63 + d * 88;

      const maximumGap =
        87 + d * 87;

      const gap = rand(
        minimumGap,
        maximumGap
      );

      const nextY =
        topY - gap;

      /*
        As vertical gaps increase, reduce
        extreme horizontal separation.
      */

      const maxShift = clamp(
        102 -
        Math.max(
          0,
          gap - 115
        ) * 0.85,
        36,
        102
      );

      const newX = clamp(
        lastAnchorX +
        rand(
          -maxShift,
          maxShift
        ),
        4,
        W - PW - 4
      );

      makePlatform(
        nextY,
        newX,
        anchorType(d),
        randomPower(d)
      );

      /*
        Optional brown breakable platform.
      */

      if (
        Math.random() <
        0.06 + 0.36 * d
      ) {
        const side =
          Math.random() < 0.5
            ? -1
            : 1;

        const decoyX = clamp(
          newX +
          side *
          rand(90, 175),
          4,
          W - PW - 4
        );

        const decoyY =
          topY -
          gap *
          rand(0.30, 0.65);

        makePlatform(
          decoyY,
          decoyX,
          "breakable"
        );
      }

      topY = nextY;

      lastAnchorX = newX;
    }
  }

  /* ======================================================
     16. RESET GAME WORLD
     ====================================================== */

  function resetWorld() {
    stopFlightAudio();

    mode = "ready";

    score = 0;

    cameraY = 0;
    gameTime = 0;
    highAltitude = 0;

    saveElapsed = 0;
    nextId = 1;

    particles = [];
    flight = null;

    platforms = [];

    pressed.left = false;
    pressed.right = false;

    recordAtStart = best;

    player = {
      x: W / 2,
      y: START_Y,
      vx: 0,
      vy: JUMP,
      face: 1
    };

    const base = makePlatform(
      558,
      W / 2 - PW / 2,
      "normal"
    );

    base.counted = true;

    topY = base.y;

    lastAnchorX = base.x;

    growPlatforms();

    flightBadge();
    refreshScore();
    pauseButton();
  }

  /* ======================================================
     17. SAVE CURRENT RUN
     ====================================================== */

  function saveRun() {
    if (
      mode !== "playing" &&
      mode !== "paused"
    ) {
      return;
    }

    storage.put(KEY.run, {
      version: 5,

      score,
      best,

      player,
      platforms,

      cameraY,
      topY,

      lastAnchorX,
      nextId,

      gameTime,
      highAltitude,

      flight,
      recordAtStart
    });
  }

  /* ======================================================
     18. RESTORE SAVED RUN

     Supports previous version 4 saves.
     Older moving platforms are migrated
     to the medium speed profile.
     ====================================================== */

  function restoreRun() {
    const saved = storage.get(
      KEY.run,
      null
    );

    if (
      !saved ||
      ![4, 5].includes(saved.version) ||
      !saved.player ||
      !Array.isArray(saved.platforms) ||
      saved.platforms.length > 300 ||
      !Number.isFinite(saved.player.x) ||
      !Number.isFinite(saved.player.y) ||
      !Number.isFinite(saved.topY) ||
      !Number.isFinite(saved.cameraY)
    ) {
      return false;
    }

    score = Math.max(
      0,
      Math.floor(
        Number(saved.highAltitude) || 0
      )
    );

    best = Math.max(
      best,
      Number(saved.best) || 0
    );

    player = saved.player;

    platforms = saved.platforms;

    cameraY = saved.cameraY;
    topY = saved.topY;

    lastAnchorX = saved.lastAnchorX;
    nextId = saved.nextId;

    gameTime = saved.gameTime;
    highAltitude = saved.highAltitude;

    flight =
      saved.flight &&
      FLIGHT[saved.flight.type]
        ? saved.flight
        : null;

    recordAtStart =
      Number(saved.recordAtStart) || 0;

    /*
      Migrate previous moving platforms.

      The previous version used a different
      frequency calculation, so convert
      its angular speed to cycles/second.
    */

    for (const p of platforms) {
      if (p.type !== "moving") {
        continue;
      }

      if (saved.version === 4) {
        p.frequency =
          (Number(p.frequency) || 1.5) /
          (Math.PI * 2);

        p.movingSpeed = "medium";
      }

      if (
        !MOVING_SPEEDS[p.movingSpeed]
      ) {
        p.movingSpeed = "medium";
      }

      if (
        !Number.isFinite(p.frequency) ||
        p.frequency <= 0
      ) {
        p.frequency = 1.5;
      }

      if (
        !Number.isFinite(p.amplitude) ||
        p.amplitude <= 0
      ) {
        p.amplitude = 24;
      }

      /*
        Prevent old platforms from moving
        outside the screen.
      */

      const a = Math.min(
        p.amplitude,
        (W - PW - 8) / 2
      );

      p.amplitude = a;

      p.x = clamp(
        p.x,
        4 + a,
        W - PW - 4 - a
      );
    }

    mode = "paused";

    refreshScore();
    flightBadge();
    pauseButton();

    overlay(
      "Game Paused",
      `Your saved run has ${score} points.`,
      "Resume"
    );

    return true;
  }

  /* ======================================================
     19. START GAME
     ====================================================== */

  function begin(
    forceNew = false
  ) {
    if (
      forceNew ||
      mode === "ready" ||
      mode === "over"
    ) {
      resetWorld();

      storage.remove(KEY.run);
    }

    mode = "playing";

    el("overlay").hidden = true;

    pauseButton();

    if (
      flight &&
      settings.sound &&
      settings.volume > 0
    ) {
      if (activeAudio) {
        activeAudio.play().catch(() => {});
      } else {
        playSound(
          flight.type,
          true
        );
      }
    }
  }

  /* ======================================================
     20. PAUSE GAME
     ====================================================== */

  function pause() {
    if (mode !== "playing") {
      return;
    }

    mode = "paused";

    pressed.left = false;
    pressed.right = false;

    if (activeAudio) {
      activeAudio.pause();
    }

    saveRun();

    pauseButton();

    overlay(
      "Game Paused",
      `Score ${score} · Level ${level()}`,
      "Resume"
    );
  }

  /* ======================================================
     21. GAME OVER
     ====================================================== */

  function endGame() {
    if (mode !== "playing") {
      return;
    }

    mode = "over";

    flight = null;

    stopFlightAudio();

    recent = score;

    storage.put(
      KEY.recent,
      score
    );

    storage.remove(
      KEY.run
    );

    pressed.left = false;
    pressed.right = false;

    const isRecord =
      score > recordAtStart &&
      score > 0;

    if (score > best) {
      best = score;
    }

    storage.put(
      KEY.best,
      best
    );

    refreshScore();
    flightBadge();
    pauseButton();

    overlay(
      "Game Over",
      `Maximum height reached: ${score} points.`,
      "Play Again",
      isRecord
        ? "✦ New personal best!"
        : `Best: ${best}`
    );
  }

  /* ======================================================
     22. PARTICLE EFFECTS
     ====================================================== */

  function sprinkle(
    x,
    y,
    color,
    amount = 10
  ) {
    for (
      let i = 0;
      i < amount;
      i++
    ) {
      particles.push({
        x,
        y,

        dx: rand(-2.3, 2.3),
        dy: rand(-3.4, -0.8),

        radius: rand(1.4, 3.3),

        life: rand(13, 28),

        color
      });
    }
  }

  /* ======================================================
     23. ACTIVATE POWER-UP
     ====================================================== */

  function activatePower(
    p,
    type
  ) {
    p.power = null;

    if (
      type === "spring" ||
      type === "doubleSpring" ||
      type === "trampoline"
    ) {
      const bounceSpeeds = {
        spring: -17.6,
        doubleSpring: -21.0,
        trampoline: -19.0
      };

      player.vy =
        bounceSpeeds[type];

      if (type === "trampoline") {
        p.trampolineBounceAt =
          gameTime;
      }

      sprinkle(
        player.x,
        p.y,
        "#fff1a2",
        15
      );

      playSound(type);

      return;
    }

    if (FLIGHT[type]) {
      stopFlightAudio();

      flight = {
        type,
        remaining:
          FLIGHT[type].duration
      };

      player.vy =
        FLIGHT[type].vy;

      sprinkle(
        player.x,
        player.y,
        type === "rocket"
          ? "#fa9c58"
          : "#99f5e4",
        18
      );

      playSound(
        type,
        true
      );

      flightBadge();
    }
  }

  /* ======================================================
     24. HELICOPTER / ROCKET PICKUPS
     ====================================================== */

  function checkPickups() {
    if (flight) return;

    for (const p of platforms) {
      if (
        p.power !== "helicopter" &&
        p.power !== "rocket"
      ) {
        continue;
      }

      if (
        p.broken ||
        (
          p.vanishAt >= 0 &&
          gameTime >= p.vanishAt
        )
      ) {
        continue;
      }

      const x =
        platformX(p) + PW / 2;

      const y =
        p.y -
        (
          p.power === "rocket"
            ? 38
            : 24
        );

      if (
        Math.abs(player.x - x) <= 30 &&
        Math.abs(player.y - y) <= 38
      ) {
        activatePower(
          p,
          p.power
        );

        return;
      }
    }
  }

  /* ======================================================
     25. PLATFORM LANDING
     ====================================================== */

  function landOn(p) {
    const x = platformX(p);

    if (p.type === "breakable") {
      p.broken = true;

      p.brokenAt =
        gameTime;

      sprinkle(
        x + PW / 2,
        p.y,
        "#c98b50",
        18
      );

      playSound("break");

      return;
    }

    player.y =
      p.y - HALF_PLAYER;

    player.vy =
      JUMP;

    /*
      Score is NOT awarded for landing.

      Score increases only when the player
      reaches a new maximum height.
    */

    if (
      [
        "spring",
        "doubleSpring",
        "trampoline"
      ].includes(p.power)
    ) {
      const centered =
        Math.abs(
          player.x -
          (x + PW / 2)
        ) < 29;

      if (
        p.power === "trampoline" ||
        centered
      ) {
        activatePower(
          p,
          p.power
        );
      } else {
        playSound("jump");
      }
    } else {
      playSound("jump");
    }

    if (p.type === "fading") {
      p.vanishAt =
        gameTime + 0.28;
    }

    sprinkle(
      player.x,
      p.y,
      "#ffffff",
      5
    );
  }

  /* ======================================================
     26. GAME PHYSICS
     ====================================================== */

  function update(dt) {
    if (mode !== "playing") {
      return;
    }

    const step = dt * 60;

    gameTime += dt;
    saveElapsed += dt;

    /* --------------------------------------------------
       HORIZONTAL PLAYER MOVEMENT
       -------------------------------------------------- */

    let horizontal =
      Number(pressed.right) -
      Number(pressed.left);

    if (
      horizontal === 0 &&
      settings.tilt &&
      tiltReceived
    ) {
      horizontal = tiltAxis;
    }

    if (
      Math.abs(horizontal) > 0.05
    ) {
      player.vx +=
        horizontal *
        0.70 *
        step;

      player.face =
        horizontal < 0
          ? -1
          : 1;
    } else {
      player.vx *=
        Math.pow(
          0.80,
          step
        );
    }

    player.vx = clamp(
      player.vx,
      -5.3,
      5.3
    );

    player.x +=
      player.vx * step;

    /* --------------------------------------------------
       HORIZONTAL SCREEN WRAPPING
       -------------------------------------------------- */

    if (player.x < -27) {
      player.x = W + 27;
    }

    if (player.x > W + 27) {
      player.x = -27;
    }

    const previousBottom =
      player.y + HALF_PLAYER;

    /* --------------------------------------------------
       HELICOPTER / ROCKET FLIGHT
       -------------------------------------------------- */

    if (flight) {
      flight.remaining -= dt;

      player.vy =
        FLIGHT[flight.type].vy;

      if (
        flight.remaining <= 0
      ) {
        flight = null;

        player.vy = -4.8;

        stopFlightAudio();
        flightBadge();
      }
    } else {
      player.vy = Math.min(
        14,
        player.vy +
        GRAVITY * step
      );
    }

    player.y +=
      player.vy * step;

    /* --------------------------------------------------
       ORIGINAL-STYLE HEIGHT SCORING
       -------------------------------------------------- */

    const previousScore = score;

    highAltitude = Math.max(
      highAltitude,
      START_Y - player.y
    );

    score = Math.max(
      0,
      Math.floor(highAltitude)
    );

    if (
      score !== previousScore
    ) {
      if (score > best) {
        best = score;

        storage.put(
          KEY.best,
          best
        );
      }

      refreshScore();
    }

    /* --------------------------------------------------
       POWER-UP PICKUPS
       -------------------------------------------------- */

    checkPickups();

    /* --------------------------------------------------
       PLATFORM COLLISIONS
       -------------------------------------------------- */

    if (
      !flight &&
      player.vy > 0
    ) {
      const bottom =
        player.y + HALF_PLAYER;

      let hit = null;

      for (const p of platforms) {
        if (p.broken) {
          continue;
        }

        if (
          p.vanishAt >= 0 &&
          gameTime >= p.vanishAt
        ) {
          continue;
        }

        const x =
          platformX(p);

        const verticalCollision =
          previousBottom <= p.y + 2 &&
          bottom >= p.y;

        const horizontalCollision =
          player.x + 18 > x + 6 &&
          player.x - 18 < x + PW - 6;

        if (
          verticalCollision &&
          horizontalCollision &&
          (
            !hit ||
            p.y < hit.y
          )
        ) {
          hit = p;
        }
      }

      if (hit) {
        landOn(hit);
      }
    }

    /* --------------------------------------------------
       CAMERA FOLLOWING
       -------------------------------------------------- */

    if (
      player.y - cameraY <
      H * 0.37
    ) {
      cameraY =
        player.y -
        H * 0.37;
    }

    /* --------------------------------------------------
       GENERATE MORE PLATFORMS
       -------------------------------------------------- */

    growPlatforms();

    /* --------------------------------------------------
       REMOVE OLD PLATFORMS
       -------------------------------------------------- */

    platforms = platforms.filter(
      p =>
        p.y <
          cameraY + H + 140 &&
        !(
          p.broken &&
          gameTime - p.brokenAt > 0.4
        )
    );

    /* --------------------------------------------------
       PARTICLE UPDATES
       -------------------------------------------------- */

    for (const particle of particles) {
      particle.x +=
        particle.dx * step;

      particle.y +=
        particle.dy * step;

      particle.dy +=
        0.17 * step;

      particle.life -= step;
    }

    particles = particles.filter(
      p => p.life > 0
    );

    /* --------------------------------------------------
       GAME OVER
       -------------------------------------------------- */

    if (
      player.y - cameraY >
      H + 65
    ) {
      endGame();
    }

    if (flight) {
      flightBadge();
    }

    el("hud-level").textContent =
      "LEVEL " + level();

    /* --------------------------------------------------
       AUTOMATIC SAVE
       -------------------------------------------------- */

    if (
      saveElapsed >= 3
    ) {
      saveElapsed = 0;

      saveRun();
    }
  }

  /* ======================================================
     27. IMAGE DRAWING
     ====================================================== */

  function draw(
    name,
    x,
    y,
    width,
    height
  ) {
    const img = images[name];

    if (
      !img ||
      !img.complete ||
      !img.naturalWidth
    ) {
      return;
    }

    ctx.drawImage(
      img,
      x,
      y,
      width,
      height
    );
  }

  /* ======================================================
     28. RENDER GAME
     ====================================================== */

  function render() {
    ctx.clearRect(
      0,
      0,
      W,
      H
    );

    /* --------------------------------------------------
       BACKGROUND
       -------------------------------------------------- */

    draw(
      settings.background,
      0,
      0,
      W,
      H
    );

    /* --------------------------------------------------
       PLATFORMS
       -------------------------------------------------- */

    for (const p of platforms) {
      if (p.broken) {
        continue;
      }

      const x = platformX(p);

      const y =
        p.y - cameraY;

      if (
        y < -85 ||
        y > H + 75
      ) {
        continue;
      }

      if (
        p.vanishAt >= 0 &&
        gameTime >= p.vanishAt
      ) {
        continue;
      }

      if (
        p.vanishAt >= 0
      ) {
        ctx.globalAlpha = clamp(
          (
            p.vanishAt -
            gameTime
          ) / 0.28,
          0,
          1
        );
      }

      /*
        All three moving platform speeds
        use the original blue platform.
      */

      const platformSprite = {
        normal: "green",
        moving: "blue",
        fading: "gray",
        breakable: "brown"
      }[p.type];

      draw(
        platformSprite,
        x,
        y,
        PW,
        PH
      );

      ctx.globalAlpha = 1;

      /* ------------------------------------------------
         POWER-UPS
         ------------------------------------------------ */

      if (!p.power) {
        continue;
      }

      if (
        p.power === "spring"
      ) {
        draw(
          "spring",
          x + PW / 2 - 13,
          y - 31,
          26,
          34
        );
      }

      else if (
        p.power === "doubleSpring"
      ) {
        draw(
          "doubleSpring",
          x + PW / 2 - 26,
          y - 32,
          52,
          34
        );
      }

      else if (
        p.power === "trampoline"
      ) {
        const recentlyBounced =
          p.trampolineBounceAt >= 0 &&
          gameTime -
          p.trampolineBounceAt < 0.18;

        draw(
          recentlyBounced
            ? "trampolineDown"
            : "trampoline",
          x + PW / 2 - 43,
          y - 30,
          86,
          35
        );
      }

      else if (
        p.power === "helicopter"
      ) {
        draw(
          "propeller1",
          x + PW / 2 - 25,
          y - 42,
          50,
          36
        );
      }

      else if (
        p.power === "rocket"
      ) {
        draw(
          "rocket1",
          x + PW / 2 - 18,
          y - 64,
          36,
          61
        );
      }
    }

    /* --------------------------------------------------
       PARTICLES
       -------------------------------------------------- */

    for (const p of particles) {
      ctx.globalAlpha = clamp(
        p.life / 16,
        0,
        1
      );

      ctx.fillStyle =
        p.color;

      ctx.beginPath();

      ctx.arc(
        p.x,
        p.y - cameraY,
        p.radius,
        0,
        Math.PI * 2
      );

      ctx.fill();
    }

    ctx.globalAlpha = 1;

    /* --------------------------------------------------
       PLAYER
       -------------------------------------------------- */

    const y =
      player.y - cameraY;

    if (
      flight?.type === "rocket"
    ) {
      const frame =
        1 +
        Math.floor(
          gameTime * 11
        ) % 9;

      draw(
        "rocket" + frame,
        player.x - 29,
        y - 51,
        58,
        105
      );
    } else {
      const climbing =
        player.vy < 0;

      const sprite =
        "doodle-" +
        (
          player.face < 0
            ? "left"
            : "right"
        ) +
        (
          climbing
            ? "-jump"
            : ""
        );

      draw(
        sprite,
        player.x - 25,
        y - 25,
        50,
        50
      );

      if (
        flight?.type === "helicopter"
      ) {
        const rotorFrame =
          1 +
          Math.floor(
            gameTime * 14
          ) % 4;

        draw(
          "propeller" + rotorFrame,
          player.x - 30,
          y - 57,
          60,
          43
        );
      }
    }
  }

  /* ======================================================
     29. ANIMATION LOOP
     ====================================================== */

  function frame(timestamp) {
    const dt = lastFrame
      ? Math.min(
          0.04,
          (
            timestamp -
            lastFrame
          ) / 1000
        )
      : 1 / 60;

    lastFrame = timestamp;

    if (
      mode === "playing"
    ) {
      let remaining = dt;

      while (
        remaining > 0.000001
      ) {
        const tick = Math.min(
          remaining,
          1 / 120
        );

        update(tick);

        remaining -= tick;
      }
    }

    render();

    requestAnimationFrame(
      frame
    );
  }

  /* ======================================================
     30. KEYBOARD CONTROLS
     ====================================================== */

  function keyboard(
    event,
    isDown
  ) {
    const key =
      event.key.toLowerCase();

    if (
      key === " " ||
      key === "spacebar"
    ) {
      event.preventDefault();
      return;
    }

    if (
      [
        "INPUT",
        "SELECT",
        "TEXTAREA"
      ].includes(
        document.activeElement?.tagName
      )
    ) {
      return;
    }

    if (
      ![
        "arrowleft",
        "arrowright",
        "a",
        "d"
      ].includes(key)
    ) {
      return;
    }

    event.preventDefault();

    if (
      mode !== "playing"
    ) {
      return;
    }

    if (
      key === "arrowleft" ||
      key === "a"
    ) {
      pressed.left = isDown;
    } else {
      pressed.right = isDown;
    }
  }

  window.addEventListener(
    "keydown",
    event =>
      keyboard(event, true),
    { capture: true }
  );

  window.addEventListener(
    "keyup",
    event =>
      keyboard(event, false),
    { capture: true }
  );

  /* ======================================================
     31. TOUCH CONTROLS
     ====================================================== */

  function bindTouch(
    id,
    direction
  ) {
    const button = el(id);

    const release = () => {
      pressed[direction] = false;

      button.classList.remove(
        "is-held"
      );
    };

    button.addEventListener(
      "pointerdown",
      event => {
        event.preventDefault();

        if (
          mode !== "playing"
        ) {
          return;
        }

        pressed[direction] = true;

        button.classList.add(
          "is-held"
        );

        try {
          button.setPointerCapture(
            event.pointerId
          );
        } catch {}
      }
    );

    [
      "pointerup",
      "pointercancel",
      "lostpointercapture",
      "pointerleave"
    ].forEach(name => {
      button.addEventListener(
        name,
        release
      );
    });
  }

  bindTouch(
    "move-left",
    "left"
  );

  bindTouch(
    "move-right",
    "right"
  );

  /* ======================================================
     32. PAUSE WHEN PAGE IS HIDDEN
     ====================================================== */

  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        pause();
      }
    }
  );

  window.addEventListener(
    "blur",
    pause
  );

  window.addEventListener(
    "pagehide",
    saveRun
  );

  /* ======================================================
     33. BUTTON EVENTS
     ====================================================== */

  el("start").addEventListener(
    "click",
    () => begin()
  );

  el("pause").addEventListener(
    "click",
    () => {
      if (
        mode === "playing"
      ) {
        pause();
      } else if (
        mode === "paused"
      ) {
        begin();
      }
    }
  );

  el("restart").addEventListener(
    "click",
    () => begin(true)
  );

  /* ======================================================
     34. BACKGROUND SETTINGS
     ====================================================== */

  el("background").addEventListener(
    "change",
    event => {
      settings.background =
        event.target.value;

      storage.put(
        KEY.settings,
        settings
      );
    }
  );

  /* ======================================================
     35. SOUND SETTINGS
     ====================================================== */

  el("sound").addEventListener(
    "change",
    event => {
      settings.sound =
        event.target.checked;

      if (
        !settings.sound
      ) {
        stopFlightAudio();
      }

      storage.put(
        KEY.settings,
        settings
      );
    }
  );

  el("volume").addEventListener(
    "input",
    event => {
      settings.volume = clamp(
        Number(event.target.value),
        0,
        100
      );

      el("volume-label").textContent =
        settings.volume + "%";

      if (activeAudio) {
        activeAudio.volume =
          settings.volume / 100;
      }

      storage.put(
        KEY.settings,
        settings
      );
    }
  );

  /* ======================================================
     36. DEVICE TILT CONTROLS
     ====================================================== */

  window.addEventListener(
    "deviceorientation",
    event => {
      if (
        !settings.tilt ||
        typeof event.gamma !== "number"
      ) {
        return;
      }

      tiltReceived = true;

      tiltAxis =
        Math.abs(event.gamma) < 5
          ? 0
          : clamp(
              event.gamma / 24,
              -1,
              1
            );

      el("tilt-status").textContent =
        "Tilt detected; keyboard/touch remain available.";
    }
  );

  el("tilt").addEventListener(
    "change",
    async event => {
      if (
        event.target.checked &&
        typeof DeviceOrientationEvent !==
          "undefined" &&
        typeof DeviceOrientationEvent
          .requestPermission ===
          "function"
      ) {
        try {
          const permission =
            await DeviceOrientationEvent
              .requestPermission();

          if (
            permission !== "granted"
          ) {
            event.target.checked =
              false;
          }
        } catch {
          event.target.checked =
            false;
        }
      }

      settings.tilt =
        event.target.checked;

      if (
        !settings.tilt
      ) {
        tiltReceived = false;
        tiltAxis = 0;
      }

      el("tilt-status").textContent =
        settings.tilt
          ? "Tilt enabled where supported."
          : "Keyboard and touch controls always work.";

      storage.put(
        KEY.settings,
        settings
      );
    }
  );

  /* ======================================================
     37. RESET SETTINGS
     ====================================================== */

  el("reset-settings").addEventListener(
    "click",
    () => {
      settings = {
        ...DEFAULTS
      };

      tiltReceived = false;
      tiltAxis = 0;

      storage.put(
        KEY.settings,
        settings
      );

      refreshSettings();

      el("tilt-status").textContent =
        "Settings reset. Keyboard and touch controls always work.";
    }
  );

  /* ======================================================
     38. INITIALIZATION
     ====================================================== */

  refreshSettings();

  resetWorld();

  if (
    !restoreRun()
  ) {
    overlay(
      "Doodle Jump",
      "Climb higher to increase your score. Use ← → or A / D to steer.",
      "Play"
    );
  }

  pauseButton();

  requestAnimationFrame(
    frame
  );

  /* ======================================================
     39. DEBUGGING INFORMATION
     ====================================================== */

  window.MSH_DoodleJumpDebug =
    Object.freeze({
      state: () => ({
        mode,

        score,
        best,

        level: level(),

        highAltitude,

        flight: flight
          ? { ...flight }
          : null,

        movingSpeedProfiles:
          MOVING_SPEEDS,

        platforms:
          platforms.map(p => ({
            id: p.id,

            type: p.type,

            movingSpeed:
              p.movingSpeed,

            frequency:
              p.frequency,

            amplitude:
              p.amplitude,

            power:
              p.power,

            y: p.y
          })),

        player: {
          ...player
        }
      })
    });

})();
