
/*
  DOODLE JUMP — Music Session Hub
  Original APK sprite and OGG edition
  (no generated character/platform/power-up art).

  Custom gameplay:
    Score = highest altitude reached (not platform landings);
    Spring / Double Spring / Trampoline / Helicopter / Rocket;
    progressive reachable platform gaps;
    slow/medium/fast moving platforms;
    breakable brown hazards; no enemies or shooting.

  UPDATE:
    Moving platforms now travel edge-to-edge.
    Each platform touches the left/right screen edge,
    reverses direction, and continues moving.
    Slow / Medium / Fast use different horizontal speeds.

  Helicopter and Rocket flight times below are tuned
  gameplay approximations. The supplied APK does not
  establish exact internal flight timer constants.
*/

(() => {
  'use strict';

  const el = id => document.getElementById(id);

  const canvas = el('game');

  if (!canvas || canvas.dataset.initialized === '1') return;

  canvas.dataset.initialized = '1';

  const ctx = canvas.getContext('2d');

  const W = canvas.width;
  const H = canvas.height;

  const PW = 104;
  const PH = 30;
  const HALF_PLAYER = 24;

  const GRAVITY = 0.42;
  const JUMP = -12.6;

  // ==================================================
  // MOVING PLATFORM SPEEDS
  //
  // Horizontal speeds in canvas pixels per second.
  // Every moving platform reaches x=0 and x=W-PW.
  // ==================================================

  const MOVING_SPEEDS = Object.freeze({
    slow: 100,
    medium: 300,
    fast: 500
  });

  // ==================================================
  // FLIGHT POWER-UPS
  // ==================================================

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

  const clamp = (v, lo, hi) =>
    Math.max(lo, Math.min(hi, v));

  const rand = (lo, hi) =>
    lo + Math.random() * (hi - lo);

  const scriptURL =
    document.currentScript?.src ||
    new URL('doodle-jump.js', document.baseURI).href;

  const asset = file =>
    new URL('assets/doodle-jump/' + file, scriptURL).href;

  // ==================================================
  // LOCAL STORAGE
  // ==================================================

  const KEY = {
    settings: 'msh.doodlejump.settings',
    best: 'msh.doodlejump.height.best',
    recent: 'msh.doodlejump.height.recent',
    run: 'msh.doodlejump.height.run'
  };

  const DEFAULTS = {
    background: 'classic',
    sound: true,
    volume: 65,
    tilt: false
  };

  const storage = {
    get(k, fallback) {
      try {
        const v = localStorage.getItem(k);

        return v == null
          ? fallback
          : JSON.parse(v);

      } catch {
        return fallback;
      }
    },

    put(k, value) {
      try {
        localStorage.setItem(
          k,
          JSON.stringify(value)
        );
      } catch {}
    },

    remove(k) {
      try {
        localStorage.removeItem(k);
      } catch {}
    }
  };

  let settings = {
    ...DEFAULTS,
    ...storage.get(KEY.settings, {})
  };

  if (![
    'classic',
    'sky',
    'mint',
    'sunset',
    'night'
  ].includes(settings.background)) {
    settings.background = 'classic';
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

  let recent = storage.get(KEY.recent, null);

  // ==================================================
  // IMAGE ASSETS
  // ==================================================

  const atlas = {
    'doodle-right': 'sprites/doodle-right.png',
    'doodle-left': 'sprites/doodle-left.png',

    'doodle-right-jump':
      'sprites/doodle-right-jump.png',

    'doodle-left-jump':
      'sprites/doodle-left-jump.png',

    green: 'sprites/platform-green.png',
    blue: 'sprites/platform-blue.png',
    gray: 'sprites/platform-gray.png',
    brown: 'sprites/platform-brown.png',

    spring: 'powerups/spring-shoe.png',

    doubleSpring:
      'powerups/double-spring-shoes.png',

    trampoline: 'powerups/trampoline.png',

    trampolineDown:
      'powerups/trampoline-compressed.png',

    classic: 'backgrounds/classic-paper.png',
    sky: 'backgrounds/sky.svg',
    mint: 'backgrounds/mint.svg',
    sunset: 'backgrounds/sunset.svg',
    night: 'backgrounds/night.svg'
  };

  for (let n = 1; n <= 4; n++) {
    atlas['propeller' + n] =
      `powerups/propeller-${n}.png`;
  }

  for (let n = 1; n <= 9; n++) {
    atlas['rocket' + n] =
      `powerups/rocket-${n}.png`;
  }

  const images = {};

  for (const [key, path] of Object.entries(atlas)) {
    const image = new Image();

    image.src = asset(path);

    images[key] = image;
  }

  // ==================================================
  // SOUND ASSETS
  // ==================================================

  const audioFiles = {
    jump: 'jump.ogg',
    spring: 'feder.ogg',
    doubleSpring: 'springshoes.ogg',
    trampoline: 'trampoline.ogg',
    helicopter: 'propeller1.ogg',
    rocket: 'rocket.ogg',
    break: 'explodingplatform.ogg'
  };

  const sounds = Object.fromEntries(
    Object.entries(audioFiles).map(
      ([k, v]) => [
        k,
        asset('audio/' + v)
      ]
    )
  );

  let activeAudio = null;

  function playSound(name, isFlight = false) {
    if (
      !settings.sound ||
      settings.volume <= 0 ||
      !sounds[name]
    ) {
      return;
    }

    try {
      const a = new Audio(sounds[name]);

      a.volume = settings.volume / 100;

      a.play().catch(() => {});

      if (isFlight) {
        activeAudio = a;
      }

    } catch {
      // Sound is optional.
    }
  }

  function stopFlightAudio() {
    if (!activeAudio) return;

    activeAudio.pause();

    try {
      activeAudio.currentTime = 0;
    } catch {}

    activeAudio = null;
  }

  // ==================================================
  // GAME STATE
  // ==================================================

  let mode = 'ready';

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

  // ==================================================
  // DIFFICULTY AND LEVEL
  // ==================================================

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
      1 + Math.floor(levelProgress() * 10)
    );
  }

  // ==================================================
  // USER INTERFACE
  // ==================================================

  function refreshScore() {
    el('hud-score').textContent = score;

    el('hud-level').textContent =
      'LEVEL ' + level();

    el('score').textContent = score;
    el('best').textContent = best;

    el('recent').textContent =
      recent == null ? '—' : recent;
  }

  function refreshSettings() {
    el('background').value = settings.background;

    el('sound').checked = !!settings.sound;

    el('volume').value = settings.volume;

    el('volume-label').textContent =
      settings.volume + '%';

    el('tilt').checked = !!settings.tilt;
  }

  function pauseButton() {
    el('pause').disabled =
      mode !== 'playing' &&
      mode !== 'paused';

    el('pause').textContent =
      mode === 'paused' ? '▶' : 'Ⅱ';

    el('pause').setAttribute(
      'aria-label',
      mode === 'paused'
        ? 'Resume game'
        : 'Pause game'
    );
  }

  function overlay(
    title,
    description,
    button,
    extra = 'Score = maximum altitude'
  ) {
    el('status').textContent = title;
    el('hint').textContent = description;
    el('start').textContent = button;

    el('overlay-extra').textContent = extra;

    el('overlay').hidden = false;
  }

  function flightBadge() {
    el('flight-status').hidden = !flight;

    if (flight) {
      el('flight-status').textContent =
        (
          flight.type === 'rocket'
            ? '🚀 Rocket'
            : '🚁 Helicopter'
        ) +
        ' · ' +
        Math.max(0, flight.remaining).toFixed(1) +
        's';
    }
  }

  // ==================================================
  // MOVING PLATFORM — EDGE-TO-EDGE MOVEMENT
  //
  // The x position is now the actual platform position.
  // No sine waves or limited movement amplitude.
  //
  // Left boundary:  0
  // Right boundary: W - PW
  //
  // Platforms remain completely inside the game screen.
  // ==================================================

  function platformX(p) {
    return p.x;
  }

  function updateMovingPlatforms(dt) {
    const leftEdge = 0;
    const rightEdge = W - PW;

    for (const p of platforms) {
      if (p.type !== 'moving') {
        continue;
      }

      // Older saved runs may not contain a direction.
      if (
        p.moveDirection !== 1 &&
        p.moveDirection !== -1
      ) {
        p.moveDirection =
          Number.isFinite(p.phase) &&
          p.phase >= Math.PI
            ? -1
            : 1;
      }

      const speed =
        MOVING_SPEEDS[p.movingSpeed] ||
        MOVING_SPEEDS.medium;

      // Move according to the selected speed.
      p.x += p.moveDirection * speed * dt;

      // Right wall: touch edge, then travel left.
      if (p.x >= rightEdge) {
        p.x = rightEdge;
        p.moveDirection = -1;
      }

      // Left wall: touch edge, then travel right.
      else if (p.x <= leftEdge) {
        p.x = leftEdge;
        p.moveDirection = 1;
      }
    }
  }

  // ==================================================
  // SELECT MOVING PLATFORM SPEED
  //
  // Higher levels gradually introduce more fast
  // moving platforms.
  // ==================================================

  function chooseMovingSpeed(d) {
    const r = Math.random();

    const slowChance =
      0.78 - 0.58 * d;

    const mediumChance =
      0.20 + 0.18 * d;

    if (r < slowChance) {
      return 'slow';
    }

    if (r < slowChance + mediumChance) {
      return 'medium';
    }

    return 'fast';
  }

  // ==================================================
  // PLATFORM GENERATION
  // ==================================================

  function anchorType(d) {
    const r = Math.random();

    if (r < 0.08 + 0.42 * d) {
      return 'moving';
    }

    if (r < 0.10 + 0.54 * d) {
      return 'fading';
    }

    return 'normal';
  }

  function randomPower(d) {
    const r = Math.random();

    if (r < 0.065) return 'spring';

    if (r < 0.095) return 'doubleSpring';

    if (r < 0.123) return 'trampoline';

    if (r < 0.148 - 0.008 * d) {
      return 'helicopter';
    }

    if (r < 0.160 - 0.008 * d) {
      return 'rocket';
    }

    return null;
  }

  function makePlatform(
    y,
    x,
    type = 'normal',
    power = null
  ) {
    const d = levelProgress();

    const movingSpeed =
      type === 'moving'
        ? chooseMovingSpeed(d)
        : null;

    const p = {
      id: nextId++,

      x: clamp(x, 4, W - PW - 4),
      y,
      type,
      power,

      counted: false,
      broken: false,
      brokenAt: -1,
      vanishAt: -1,

      movingSpeed,

      // Start in either direction.
      moveDirection:
        type === 'moving'
          ? (Math.random() < 0.5 ? -1 : 1)
          : 0,

      trampolineBounceAt: -1
    };

    platforms.push(p);

    return p;
  }

  function growPlatforms() {
    // Nominal ordinary jump apex ~189 world px.
    // Gaps increase with difficulty.
    // Brown platforms are optional hazards.

    while (topY > cameraY - 650) {
      const d = levelProgress();

      const gap = rand(
        63 + d * 88,
        87 + d * 87
      );

      const nextY = topY - gap;

      const maxShift = clamp(
        102 - Math.max(0, gap - 115) * 0.85,
        36,
        102
      );

      const newX = clamp(
        lastAnchorX + rand(-maxShift, maxShift),
        4,
        W - PW - 4
      );

      makePlatform(
        nextY,
        newX,
        anchorType(d),
        randomPower(d)
      );

      // Never put a breakaway platform
      // in the mandatory climbing route.
      if (Math.random() < 0.06 + 0.36 * d) {
        const side =
          Math.random() < 0.5 ? -1 : 1;

        makePlatform(
          topY - gap * rand(0.30, 0.65),

          clamp(
            newX + side * rand(90, 175),
            4,
            W - PW - 4
          ),

          'breakable'
        );
      }

      topY = nextY;
      lastAnchorX = newX;
    }
  }

  // ==================================================
  // RESET GAME WORLD
  // ==================================================

  function resetWorld() {
    stopFlightAudio();

    mode = 'ready';
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
      y: 529,
      vx: 0,
      vy: JUMP,
      face: 1
    };

    const base = makePlatform(
      558,
      W / 2 - PW / 2
    );

    topY = base.y;
    lastAnchorX = base.x;

    growPlatforms();

    flightBadge();
    refreshScore();
    pauseButton();
  }

  // ==================================================
  // SAVE CURRENT RUN
  // ==================================================

  function saveRun() {
    if (
      mode !== 'playing' &&
      mode !== 'paused'
    ) {
      return;
    }

    storage.put(KEY.run, {
      version: 6,
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

  // ==================================================
  // RESTORE SAVED RUN
  // ==================================================

  function restoreRun() {
    const saved = storage.get(KEY.run, null);

    if (
      !saved ||
      ![4, 5, 6].includes(saved.version) ||
      !saved.player ||
      !Array.isArray(saved.platforms) ||
      saved.platforms.length > 300 ||
      !Number.isFinite(saved.player.x) ||
      !Number.isFinite(saved.player.y) ||
      !Number.isFinite(saved.topY)
    ) {
      return false;
    }

    score = Math.max(
      0,
      Math.floor(Number(saved.highAltitude) || 0)
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
      saved.flight?.type in FLIGHT
        ? saved.flight
        : null;

    recordAtStart =
      Number(saved.recordAtStart) || 0;

    mode = 'paused';

    refreshScore();
    flightBadge();
    pauseButton();

    overlay(
      'Game Paused',
      `Your saved run has ${score} points.`,
      'Resume'
    );

    return true;
  }

  // ==================================================
  // START / RESUME
  // ==================================================

  function begin(forceNew = false) {
    if (
      forceNew ||
      mode === 'ready' ||
      mode === 'over'
    ) {
      resetWorld();
      storage.remove(KEY.run);
    }

    mode = 'playing';

    el('overlay').hidden = true;

    pauseButton();

    if (
      flight &&
      settings.sound &&
      settings.volume > 0
    ) {
      if (activeAudio) {
        activeAudio.play().catch(() => {});
      } else {
        playSound(flight.type, true);
      }
    }
  }

  // ==================================================
  // PAUSE GAME
  // ==================================================

  function pause() {
    if (mode !== 'playing') return;

    mode = 'paused';

    pressed.left = false;
    pressed.right = false;

    if (activeAudio) {
      activeAudio.pause();
    }

    saveRun();
    pauseButton();

    overlay(
      'Game Paused',
      `Score ${score} · Level ${level()}`,
      'Resume'
    );
  }

  // ==================================================
  // GAME OVER
  // ==================================================

  function endGame() {
    if (mode !== 'playing') return;

    mode = 'over';
    flight = null;

    stopFlightAudio();

    recent = score;

    storage.put(KEY.recent, score);
    storage.remove(KEY.run);

    pressed.left = false;
    pressed.right = false;

    const isRecord =
      score > recordAtStart &&
      score > 0;

    if (score > best) {
      best = score;
    }

    storage.put(KEY.best, best);

    refreshScore();
    flightBadge();
    pauseButton();

    overlay(
      'Game Over',

      `Maximum height reached: ${score} points.`,

      'Play Again',

      isRecord
        ? '✦ New personal best!'
        : `Best: ${best}`
    );
  }

  // ==================================================
  // PARTICLE EFFECTS
  // ==================================================

  function sprinkle(
    x,
    y,
    color,
    amount = 10
  ) {
    for (let i = 0; i < amount; i++) {
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

  // ==================================================
  // ACTIVATE POWER-UPS
  // ==================================================

  function activatePower(p, type) {
    p.power = null;

    if (
      type === 'spring' ||
      type === 'doubleSpring' ||
      type === 'trampoline'
    ) {
      player.vy = {
        spring: -17.6,
        doubleSpring: -21.0,
        trampoline: -19.0
      }[type];

      if (type === 'trampoline') {
        p.trampolineBounceAt = gameTime;
      }

      sprinkle(
        player.x,
        p.y,
        '#fff1a2',
        15
      );

      playSound(type);

      return;
    }

    if (FLIGHT[type]) {
      stopFlightAudio();

      flight = {
        type,
        remaining: FLIGHT[type].duration
      };

      player.vy = FLIGHT[type].vy;

      sprinkle(
        player.x,
        player.y,

        type === 'rocket'
          ? '#fa9c58'
          : '#99f5e4',

        18
      );

      playSound(type, true);
      flightBadge();
    }
  }

  // ==================================================
  // PICKUP DETECTION
  // ==================================================

  function checkPickups() {
    if (flight) return;

    for (const p of platforms) {
      if (
        p.power !== 'helicopter' &&
        p.power !== 'rocket'
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

      const x = platformX(p) + PW / 2;

      const y =
        p.y -
        (p.power === 'rocket' ? 38 : 24);

      if (
        Math.abs(player.x - x) <= 30 &&
        Math.abs(player.y - y) <= 38
      ) {
        activatePower(p, p.power);
        return;
      }
    }
  }

  // ==================================================
  // PLATFORM LANDING
  // ==================================================

  function landOn(p) {
    const x = platformX(p);

    if (p.type === 'breakable') {
      p.broken = true;
      p.brokenAt = gameTime;

      sprinkle(
        x + PW / 2,
        p.y,
        '#c98b50',
        18
      );

      playSound('break');

      return;
    }

    player.y = p.y - HALF_PLAYER;
    player.vy = JUMP;

    if ([
      'spring',
      'doubleSpring',
      'trampoline'
    ].includes(p.power)) {
      if (
        p.power === 'trampoline' ||
        Math.abs(
          player.x - (x + PW / 2)
        ) < 29
      ) {
        activatePower(p, p.power);
      } else {
        playSound('jump');
      }
    } else {
      playSound('jump');
    }

    if (p.type === 'fading') {
      p.vanishAt = gameTime + 0.28;
    }

    sprinkle(
      player.x,
      p.y,
      '#fff',
      5
    );
  }

  // ==================================================
  // MAIN GAME UPDATE
  // ==================================================

  function update(dt) {
    if (mode !== 'playing') return;

    const step = dt * 60;

    gameTime += dt;
    saveElapsed += dt;

    // NEW:
    // Move every moving platform across the full width.
    // Touch the wall, reverse, and continue.
    updateMovingPlatforms(dt);

    // ==================================================
    // PLAYER HORIZONTAL MOVEMENT
    // ==================================================

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

    if (Math.abs(horizontal) > 0.05) {
      player.vx += horizontal * 0.70 * step;

      player.face =
        horizontal < 0 ? -1 : 1;

    } else {
      player.vx *= Math.pow(0.80, step);
    }

    player.vx = clamp(
      player.vx,
      -5.3,
      5.3
    );

    player.x += player.vx * step;

    // Horizontal player screen wrapping.
    if (player.x < -27) {
      player.x = W + 27;
    }

    if (player.x > W + 27) {
      player.x = -27;
    }

    // ==================================================
    // PLAYER VERTICAL MOVEMENT
    // ==================================================

    const previousBottom =
      player.y + HALF_PLAYER;

    if (flight) {
      flight.remaining -= dt;

      player.vy =
        FLIGHT[flight.type].vy;

      if (flight.remaining <= 0) {
        flight = null;
        player.vy = -4.8;

        stopFlightAudio();
        flightBadge();
      }

    } else {
      player.vy = Math.min(
        14,
        player.vy + GRAVITY * step
      );
    }

    player.y += player.vy * step;

    // ==================================================
    // HEIGHT SCORING
    // ==================================================

    const previousScore = score;

    highAltitude = Math.max(
      highAltitude,
      529 - player.y
    );

    score = Math.max(
      0,
      Math.floor(highAltitude)
    );

    if (score !== previousScore) {
      if (score > best) {
        best = score;
        storage.put(KEY.best, best);
      }

      refreshScore();
    }

    checkPickups();

    // ==================================================
    // COLLISION WITH PLATFORMS
    // ==================================================

    if (!flight && player.vy > 0) {
      const bottom =
        player.y + HALF_PLAYER;

      let hit = null;

      for (const p of platforms) {
        if (
          p.broken ||
          (
            p.vanishAt >= 0 &&
            gameTime >= p.vanishAt
          )
        ) {
          continue;
        }

        // The platform's updated real x position.
        const x = platformX(p);

        if (
          previousBottom <= p.y + 2 &&
          bottom >= p.y &&

          player.x + 18 > x + 6 &&
          player.x - 18 < x + PW - 6 &&

          (!hit || p.y < hit.y)
        ) {
          hit = p;
        }
      }

      if (hit) {
        landOn(hit);
      }
    }

    // ==================================================
    // CAMERA AND WORLD GENERATION
    // ==================================================

    if (player.y - cameraY < H * 0.37) {
      cameraY =
        player.y - H * 0.37;
    }

    growPlatforms();

    platforms = platforms.filter(
      p =>
        p.y < cameraY + H + 140 &&
        !(
          p.broken &&
          gameTime - p.brokenAt > 0.4
        )
    );

    // ==================================================
    // UPDATE PARTICLES
    // ==================================================

    for (const particle of particles) {
      particle.x += particle.dx * step;
      particle.y += particle.dy * step;

      particle.dy += 0.17 * step;
      particle.life -= step;
    }

    particles = particles.filter(
      p => p.life > 0
    );

    // ==================================================
    // GAME OVER CHECK
    // ==================================================

    if (player.y - cameraY > H + 65) {
      endGame();
    }

    if (flight) {
      flightBadge();
    }

    el('hud-level').textContent =
      'LEVEL ' + level();

    // ==================================================
    // AUTOSAVE
    // ==================================================

    if (saveElapsed >= 3) {
      saveElapsed = 0;
      saveRun();
    }
  }

  // ==================================================
  // IMAGE DRAWING
  // ==================================================

  function draw(
    name,
    x,
    y,
    width,
    height
  ) {
    const img = images[name];

    if (
      !img?.complete ||
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

  // ==================================================
  // RENDER GAME
  // ==================================================

  function render() {
    ctx.clearRect(0, 0, W, H);

    draw(
      settings.background,
      0,
      0,
      W,
      H
    );

    // ==================================================
    // DRAW PLATFORMS
    // ==================================================

    for (const p of platforms) {
      if (p.broken) continue;

      const x = platformX(p);
      const y = p.y - cameraY;

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

      if (p.vanishAt >= 0) {
        ctx.globalAlpha = clamp(
          (p.vanishAt - gameTime) / 0.28,
          0,
          1
        );
      }

      draw(
        {
          normal: 'green',
          moving: 'blue',
          fading: 'gray',
          breakable: 'brown'
        }[p.type],

        x,
        y,
        PW,
        PH
      );

      ctx.globalAlpha = 1;

      // ==================================================
      // DRAW PLATFORM POWER-UPS
      // ==================================================

      if (!p.power) continue;

      const cy = y;

      if (p.power === 'spring') {
        draw(
          'spring',
          x + PW / 2 - 13,
          cy - 31,
          26,
          34
        );
      }

      else if (p.power === 'doubleSpring') {
        draw(
          'doubleSpring',
          x + PW / 2 - 26,
          cy - 32,
          52,
          34
        );
      }

      else if (p.power === 'trampoline') {
        draw(
          'trampoline',
          x + PW / 2 - 43,
          cy - 30,
          86,
          35
        );
      }

      else if (p.power === 'helicopter') {
        draw(
          'propeller1',
          x + PW / 2 - 25,
          cy - 42,
          50,
          36
        );
      }

      else if (p.power === 'rocket') {
        draw(
          'rocket1',
          x + PW / 2 - 18,
          cy - 64,
          36,
          61
        );
      }
    }

    // ==================================================
    // DRAW PARTICLES
    // ==================================================

    for (const p of particles) {
      ctx.globalAlpha = clamp(
        p.life / 16,
        0,
        1
      );

      ctx.fillStyle = p.color;

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

    // ==================================================
    // DRAW PLAYER
    // ==================================================

    const y = player.y - cameraY;

    if (flight?.type === 'rocket') {
      const frame =
        1 + Math.floor(gameTime * 11) % 9;

      draw(
        'rocket' + frame,
        player.x - 29,
        y - 51,
        58,
        105
      );

    } else {
      const climbing =
        player.vy < 0;

      const sprite =
        'doodle-' +
        (
          player.face < 0
            ? 'left'
            : 'right'
        ) +
        (
          climbing
            ? '-jump'
            : ''
        );

      draw(
        sprite,
        player.x - 25,
        y - 25,
        50,
        50
      );

      if (flight?.type === 'helicopter') {
        const rotorFrame =
          1 + Math.floor(gameTime * 14) % 4;

        draw(
          'propeller' + rotorFrame,
          player.x - 30,
          y - 57,
          60,
          43
        );
      }
    }
  }

  // ==================================================
  // ANIMATION LOOP
  // ==================================================

  function frame(timestamp) {
    const dt = lastFrame
      ? Math.min(
          0.04,
          (timestamp - lastFrame) / 1000
        )
      : 1 / 60;

    lastFrame = timestamp;

    if (mode === 'playing') {
      let remaining = dt;

      while (remaining > 0.000001) {
        const tick = Math.min(
          remaining,
          1 / 120
        );

        update(tick);

        remaining -= tick;
      }
    }

    render();

    requestAnimationFrame(frame);
  }

  // ==================================================
  // KEYBOARD CONTROLS
  // ==================================================

  function keyboard(e, isDown) {
    if ([
      ' ',
      'spacebar'
    ].includes(e.key.toLowerCase())) {
      e.preventDefault();
      return;
    }

    if ([
      'INPUT',
      'SELECT',
      'TEXTAREA'
    ].includes(
      document.activeElement?.tagName
    )) {
      return;
    }

    const k = e.key.toLowerCase();

    if (![
      'arrowleft',
      'arrowright',
      'a',
      'd'
    ].includes(k)) {
      return;
    }

    e.preventDefault();

    if (mode !== 'playing') return;

    if (
      k === 'arrowleft' ||
      k === 'a'
    ) {
      pressed.left = isDown;

    } else {
      pressed.right = isDown;
    }
  }

  window.addEventListener(
    'keydown',
    e => keyboard(e, true),
    { capture: true }
  );

  window.addEventListener(
    'keyup',
    e => keyboard(e, false),
    { capture: true }
  );

  // ==================================================
  // TOUCH CONTROLS
  // ==================================================

  function bindTouch(id, direction) {
    const button = el(id);

    const release = () => {
      pressed[direction] = false;

      button.classList.remove('is-held');
    };

    button.addEventListener(
      'pointerdown',
      e => {
        e.preventDefault();

        if (mode !== 'playing') return;

        pressed[direction] = true;

        button.classList.add('is-held');

        try {
          button.setPointerCapture(e.pointerId);
        } catch {}
      }
    );

    [
      'pointerup',
      'pointercancel',
      'lostpointercapture',
      'pointerleave'
    ].forEach(name => {
      button.addEventListener(
        name,
        release
      );
    });
  }

  bindTouch('move-left', 'left');
  bindTouch('move-right', 'right');

  // ==================================================
  // PAGE VISIBILITY AND GAME PAUSE
  // ==================================================

  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) {
        pause();
      }
    }
  );

  window.addEventListener(
    'blur',
    pause
  );

  window.addEventListener(
    'pagehide',
    saveRun
  );

  // ==================================================
  // GAME BUTTONS
  // ==================================================

  el('start').addEventListener(
    'click',
    () => begin()
  );

  el('pause').addEventListener(
    'click',
    () =>
      mode === 'playing'
        ? pause()
        : mode === 'paused'
          ? begin()
          : null
  );

  el('restart').addEventListener(
    'click',
    () => begin(true)
  );

  // ==================================================
  // BACKGROUND SETTINGS
  // ==================================================

  el('background').addEventListener(
    'change',
    e => {
      settings.background = e.target.value;

      storage.put(
        KEY.settings,
        settings
      );
    }
  );

  // ==================================================
  // SOUND SETTINGS
  // ==================================================

  el('sound').addEventListener(
    'change',
    e => {
      settings.sound = e.target.checked;

      if (!settings.sound) {
        stopFlightAudio();
      }

      storage.put(
        KEY.settings,
        settings
      );
    }
  );

  // ==================================================
  // VOLUME SETTINGS
  // ==================================================

  el('volume').addEventListener(
    'input',
    e => {
      settings.volume = clamp(
        Number(e.target.value),
        0,
        100
      );

      el('volume-label').textContent =
        settings.volume + '%';

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

  // ==================================================
  // DEVICE TILT CONTROLS
  // ==================================================

  window.addEventListener(
    'deviceorientation',
    e => {
      if (
        !settings.tilt ||
        typeof e.gamma !== 'number'
      ) {
        return;
      }

      tiltReceived = true;

      tiltAxis =
        Math.abs(e.gamma) < 5
          ? 0
          : clamp(
              e.gamma / 24,
              -1,
              1
            );

      el('tilt-status').textContent =
        'Tilt detected; keyboard/touch remain available.';
    }
  );

  el('tilt').addEventListener(
    'change',
    async e => {
      if (
        e.target.checked &&
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function'
      ) {
        try {
          if (
            await DeviceOrientationEvent.requestPermission()
            !== 'granted'
          ) {
            e.target.checked = false;
          }
        } catch {
          e.target.checked = false;
        }
      }

      settings.tilt = e.target.checked;

      if (!settings.tilt) {
        tiltReceived = false;
        tiltAxis = 0;
      }

      el('tilt-status').textContent =
        settings.tilt
          ? 'Tilt enabled where supported.'
          : 'Keyboard and touch controls always work.';

      storage.put(
        KEY.settings,
        settings
      );
    }
  );

  // ==================================================
  // RESET SETTINGS
  // ==================================================

  el('reset-settings').addEventListener(
    'click',
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

      el('tilt-status').textContent =
        'Settings reset. Keyboard and touch controls always work.';
    }
  );

  // ==================================================
  // INITIALIZE GAME
  // ==================================================

  refreshSettings();

  resetWorld();

  if (!restoreRun()) {
    overlay(
      'Doodle Jump',

      'Climb higher to increase your score. Use ← → or A / D to steer.',

      'Play'
    );
  }

  pauseButton();

  requestAnimationFrame(frame);

  // ==================================================
  // READ-ONLY DEBUG INFORMATION
  // ==================================================

  window.MSH_DoodleJumpDebug = Object.freeze({
    state: () => ({
      mode,
      score,
      best,

      level: level(),
      highAltitude,

      flight:
        flight && { ...flight },

      platforms: platforms.map(p => ({
        id: p.id,
        type: p.type,
        movingSpeed: p.movingSpeed || null,

        x: p.x,
        y: p.y,

        moveDirection: p.moveDirection,

        power: p.power
      })),

      player: { ...player }
    })
  });

})();
