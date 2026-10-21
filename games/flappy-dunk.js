
(() => {
  "use strict";

  /* ==================================================
     FLAPPY DUNK
     PROGRESSIVE DIFFICULTY
     ================================================== */

  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  const $ = (selector) => document.querySelector(selector);

  const W = 360;
  const H = 600;

  const root = "assets/flappy-dunk/";

  /* ==================================================
     SPEED CONFIGURATION
     ================================================== */

  const BASE_SPEED = 1.65;
  const SPEED_INCREMENT = 0.025;
  const MAX_SPEED = 3.65;

  let hoopsPassed = 0;

  function getSpeed() {
    return Math.min(
      BASE_SPEED + hoopsPassed * SPEED_INCREMENT,
      MAX_SPEED
    );
  }

  /* ==================================================
     LOAD TEXTURES
     ================================================== */

  const textures = {};

  const texturePaths = {
    basketball: "balls/normal.png",
    soccer: "balls/football.png",
    tennis: "balls/tennis.png",
    wing: "balls/wing.png",
    hoopFront: "hoops/hoopFront.png",
    hoopBack: "hoops/hoopBack.png",
    background: "backgrounds/background.png"
  };

  for (const [key, path] of Object.entries(texturePaths)) {
    const image = new Image();

    image.src = root + path;

    textures[key] = image;
  }

  /* ==================================================
     LOAD AUDIO
     ================================================== */

  const clips = {};

  for (const name of [
    "flap",
    "pass",
    "bounce",
    "crash"
  ]) {
    const audio = new Audio(
      root + "audio/" + name + ".ogg"
    );

    audio.preload = "auto";

    clips[name] = audio;
  }

  function sound(name) {
    if (!$("#sound").checked) {
      return;
    }

    try {
      const audio = clips[name].cloneNode();

      audio.volume =
        Number($("#volume").value) / 100;

      audio.play().catch(() => {});
    } catch (error) {
      // Continue gameplay if audio is unavailable.
    }
  }

  /* ==================================================
     GAME STATE
     ================================================== */

  let streak = 0;
  let comboFlash = 0;
  let comboText = "";
  let lastSavedFrame = 0;

  let state = "ready";

  let ball = {
    x: 90,
    y: 250,
    vy: 0
  };

  let hoops = [];

  let score = 0;
  let best = 0;
  let frame = 0;
  let last = 0;
  let acc = 0;

  /* ==================================================
     LOCAL STORAGE
     ================================================== */

  function get(key, fallback) {
    try {
      return (
        localStorage.getItem("msh.dunk." + key) ??
        fallback
      );
    } catch (error) {
      return fallback;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(
        "msh.dunk." + key,
        String(value)
      );
    } catch (error) {
      // Continue gameplay if storage is unavailable.
    }
  }

  best = Number(get("best", "0")) || 0;

  $("#best").textContent = best;

  for (const id of [
    "ball",
    "background",
    "volume"
  ]) {
    $("#" + id).value = get(
      id,
      $("#" + id).value
    );
  }

  $("#sound").checked =
    get("sound", "true") === "true";

  /* ==================================================
     GAME MESSAGES
     ================================================== */

  function show(title, hint, button) {
    $("#status").textContent = title;
    $("#hint").textContent = hint;
    $("#start").textContent = button;

    $("#overlay").hidden = false;
  }

  /* ==================================================
     RESET GAME
     ================================================== */

  function reset() {
    state = "ready";

    ball = {
      x: 90,
      y: 245,
      vy: 0
    };

    hoops = [];

    score = 0;
    streak = 0;
    hoopsPassed = 0;

    comboFlash = 0;
    comboText = "";

    frame = 0;
    acc = 0;
    lastSavedFrame = 0;

    set("run", "");

    $("#score").textContent = "0";

    show(
      "Flappy Dunk",
      "Tap, click, or press Space to bounce through hoops",
      "Play"
    );
  }

  /* ==================================================
     CREATE HOOP
     ================================================== */

  function makeHoop(x, y) {
    return {
      x,
      y,
      passed: false,
      failed: false,
      touched: false
    };
  }

  /* ==================================================
     START / BOUNCE
     ================================================== */

  function start() {
    if (state === "paused") {
      state = "playing";
      $("#overlay").hidden = true;
      return;
    }

    if (state === "over") {
      reset();
    }

    if (state === "ready") {
      state = "playing";

      $("#overlay").hidden = true;

      hoops = [
        makeHoop(265, 315),
        makeHoop(510, 270)
      ];
    }

    ball.vy = -5.3;

    sound("flap");
  }

  /* ==================================================
     GAME OVER
     ================================================== */

  function over() {
    if (state !== "playing") {
      return;
    }

    state = "over";

    sound("crash");

    if (score > best) {
      best = score;

      set("best", best);

      $("#best").textContent = best;
    }

    set("run", "");

    show(
      "Game Over",
      `Score ${score} · Best ${best}`,
      "Try Again"
    );
  }

  /* ==================================================
     UPDATE GAME PHYSICS
     ================================================== */

  function tick() {
    frame++;

    ball.vy = Math.min(
      ball.vy + 0.23,
      7.5
    );

    const previousY = ball.y;

    ball.y += ball.vy;

    if (comboFlash > 0) {
      comboFlash--;
    }

    /* ==================================================
       PROGRESSIVE SPEED

       Based on hoops successfully passed,
       NOT the total score.

       0 hoops  = 1.65
       20 hoops = 2.15
       40 hoops = 2.65
       60 hoops = 3.15
       74 hoops = 3.50
       ================================================== */

    const speed = getSpeed();

    for (const hoop of hoops) {

      /* Move hoop */

      hoop.x -= speed;

      /* ==================================================
         RIM CONTACT DETECTION
         ================================================== */

      if (
        !hoop.passed &&
        Math.abs(ball.x - hoop.x) < 55 &&
        Math.abs(ball.y - hoop.y) < 24
      ) {
        const rimDistance = Math.abs(
          Math.abs(ball.x - hoop.x) - 41
        );

        if (
          rimDistance < 17 &&
          Math.abs(ball.y - hoop.y) < 17
        ) {
          hoop.touched = true;
        }
      }

      /* ==================================================
         PASS THROUGH HOOP
         ================================================== */

      if (
        !hoop.passed &&
        ball.vy > 0 &&
        previousY <= hoop.y &&
        ball.y >= hoop.y
      ) {

        if (Math.abs(ball.x - hoop.x) < 34) {

          hoop.passed = true;

          /* Count successful hoops separately */

          hoopsPassed++;

          /* Determine clean swish */

          const clean =
            !hoop.touched &&
            Math.abs(ball.x - hoop.x) <= 22;

          if (clean) {

            /* Unlimited swish scoring */

            streak++;

            const points = streak + 1;

            score += points;

            comboText =
              "SWISH! +" + points;

            comboFlash = 65;

          } else {

            /* Rim contact resets swish streak */

            streak = 0;

            score++;

            comboText = "+1";

            comboFlash = 35;
          }

          $("#score").textContent = score;

          sound("pass");

          if (score > best) {
            best = score;

            set("best", best);

            $("#best").textContent = best;
          }

        } else if (
          hoop.x > ball.x - 38 &&
          hoop.x < ball.x + 38
        ) {

          hoop.failed = true;

          over();
        }
      }

      /* Missed hoop */

      if (
        !hoop.passed &&
        hoop.x + 40 < ball.x - 16
      ) {
        over();
      }
    }

    /* ==================================================
       REMOVE OFFSCREEN HOOPS
       ================================================== */

    hoops = hoops.filter(
      (hoop) => hoop.x > -65
    );

    /* ==================================================
       GENERATE NEW HOOPS
       ================================================== */

    if (
      hoops.length &&
      hoops[hoops.length - 1].x < W - 145
    ) {
      const previousHoop =
        hoops[hoops.length - 1];

      hoops.push(
        makeHoop(
          previousHoop.x + 245,
          175 + Math.random() * 220
        )
      );
    }

    /* ==================================================
       CEILING AND FLOOR
       ================================================== */

    if (
      ball.y > H - 22 ||
      ball.y < 16
    ) {
      over();
    }

    /* ==================================================
       SAVE GAME

       Include hoopsPassed so speed is restored.
       ================================================== */

    if (
      state === "playing" &&
      frame - lastSavedFrame >= 30
    ) {
      lastSavedFrame = frame;

      set(
        "run",
        JSON.stringify({
          ball,
          hoops,
          score,
          streak,
          hoopsPassed,
          frame
        })
      );
    }
  }

  /* ==================================================
     DRAW BALL
     ================================================== */

  function drawBall() {
    ctx.save();

    ctx.translate(
      ball.x,
      ball.y
    );

    ctx.rotate(frame * 0.025);

    const kind = $("#ball").value;
    const sprite = textures[kind];

    if (
      sprite &&
      sprite.complete &&
      sprite.naturalWidth
    ) {
      ctx.drawImage(
        sprite,
        -17,
        -17,
        34,
        34
      );

      ctx.restore();

      return;
    }

    /* Fallback ball */

    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);

    ctx.fillStyle =
      kind === "basketball"
        ? "#f18a2d"
        : kind === "soccer"
          ? "#ffffff"
          : "#c8ed3b";

    ctx.fill();

    ctx.lineWidth = 2;

    ctx.strokeStyle =
      kind === "basketball"
        ? "#58351f"
        : kind === "soccer"
          ? "#252525"
          : "#ffffff";

    ctx.stroke();

    ctx.save();

    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.clip();

    if (kind === "basketball") {

      ctx.beginPath();

      ctx.moveTo(-16, 0);
      ctx.lineTo(16, 0);

      ctx.moveTo(0, -16);
      ctx.lineTo(0, 16);

      ctx.moveTo(-12, -11);
      ctx.quadraticCurveTo(9, 0, -12, 11);

      ctx.moveTo(12, -11);
      ctx.quadraticCurveTo(-9, 0, 12, 11);

      ctx.stroke();

    } else if (kind === "soccer") {

      ctx.fillStyle = "#222222";

      ctx.beginPath();

      for (let i = 0; i < 5; i++) {
        const angle =
          -Math.PI / 2 + i * Math.PI * 2 / 5;

        ctx.lineTo(
          Math.cos(angle) * 8,
          Math.sin(angle) * 8
        );
      }

      ctx.closePath();
      ctx.fill();

      for (let i = 0; i < 5; i++) {
        const angle = i * Math.PI * 2 / 5;

        ctx.beginPath();

        ctx.moveTo(
          Math.cos(angle) * 8,
          Math.sin(angle) * 8
        );

        ctx.lineTo(
          Math.cos(angle) * 17,
          Math.sin(angle) * 17
        );

        ctx.stroke();
      }

    } else {

      ctx.beginPath();
      ctx.arc(-12, 0, 13, -1.2, 1.2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(12, 0, 13, 1.95, 4.35);
      ctx.stroke();
    }

    ctx.restore();
    ctx.restore();
  }

  /* ==================================================
     DRAW GAME
     ================================================== */

  function draw() {
    const background = $("#background").value;

    const colors = {
      sky: ["#7cd7f5", "#d4f5ff"],
      sunset: ["#e98a93", "#ffcf8a"],
      night: ["#182747", "#56618b"],
      mint: ["#9ce5bd", "#dcffdc"]
    };

    /* Correct background-color selection */

    const selectedColors =
      colors[background] || colors.sky;

    const gradient =
      ctx.createLinearGradient(0, 0, 0, H);

    gradient.addColorStop(
      0,
      selectedColors[0]
    );

    gradient.addColorStop(
      1,
      selectedColors[1]
    );

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    /* Background decoration */

    ctx.fillStyle = "#ffffff33";

    for (let i = 0; i < 5; i++) {
      let x =
        (i * 120 - frame * 0.2) % (W + 100);

      if (x < 0) {
        x += W + 100;
      }

      ctx.beginPath();

      ctx.arc(
        x,
        90 + i * 75,
        28,
        0,
        Math.PI * 2
      );

      ctx.fill();
    }

    /* ==================================================
       DRAW HOOPS
       ================================================== */

    for (const hoop of hoops) {
      const hoopBack = textures.hoopBack;

      if (
        hoopBack.complete &&
        hoopBack.naturalWidth
      ) {
        ctx.drawImage(
          hoopBack,
          hoop.x - 44,
          hoop.y - 12,
          88,
          44
        );
      }

      /* Hoop ring */

      ctx.strokeStyle = "#eb6550";
      ctx.lineWidth = 6;

      ctx.beginPath();

      ctx.ellipse(
        hoop.x,
        hoop.y,
        41,
        11,
        0,
        0,
        Math.PI * 2
      );

      ctx.stroke();

      /* Hoop net */

      ctx.strokeStyle = "#ffffffa8";
      ctx.lineWidth = 2;

      for (let j = -3; j <= 3; j++) {
        ctx.beginPath();

        ctx.moveTo(
          hoop.x + j * 10,
          hoop.y + 9
        );

        ctx.lineTo(
          hoop.x + j * 7,
          hoop.y + 33
        );

        ctx.stroke();
      }

      ctx.beginPath();

      ctx.moveTo(
        hoop.x - 30,
        hoop.y + 33
      );

      ctx.lineTo(
        hoop.x + 30,
        hoop.y + 33
      );

      ctx.stroke();

      const hoopFront = textures.hoopFront;

      if (
        hoopFront.complete &&
        hoopFront.naturalWidth
      ) {
        ctx.drawImage(
          hoopFront,
          hoop.x - 44,
          hoop.y - 12,
          88,
          44
        );
      }
    }

    /* Draw ball */

    drawBall();

    /* ==================================================
       DRAW SCORE
       ================================================== */

    ctx.textAlign = "center";
    ctx.font = "bold 40px Rubik, sans-serif";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#17273c";

    ctx.strokeText(
      String(score),
      W / 2,
      64
    );

    ctx.fillStyle = "white";

    ctx.fillText(
      String(score),
      W / 2,
      64
    );

    /* ==================================================
       DRAW SWISH BONUS
       ================================================== */

    if (comboFlash > 0) {
      ctx.save();

      ctx.globalAlpha = Math.min(
        1,
        comboFlash / 16
      );

      ctx.font = "bold 26px Rubik, sans-serif";
      ctx.lineWidth = 4;

      ctx.strokeText(
        comboText,
        W / 2,
        110
      );

      ctx.fillStyle = "#ffe15b";

      ctx.fillText(
        comboText,
        W / 2,
        110
      );

      ctx.restore();
    }

    /* Floor */

    ctx.fillStyle = "#d54b55";
    ctx.fillRect(0, H - 12, W, 12);
  }

  /* ==================================================
     ANIMATION LOOP
     ================================================== */

  function loop(time) {
    if (!last) {
      last = time;
    }

    acc += Math.min(
      50,
      time - last
    );

    last = time;

    while (acc >= 1000 / 60) {
      if (state === "playing") {
        tick();
      } else {
        frame++;
      }

      acc -= 1000 / 60;
    }

    draw();

    requestAnimationFrame(loop);
  }

  /* ==================================================
     CONTROLS
     ================================================== */

  $("#start").onclick = (event) => {
    event.stopPropagation();
    start();
  };

  canvas.addEventListener(
    "pointerdown",
    (event) => {
      event.preventDefault();
      start();
    }
  );

  window.addEventListener(
    "keydown",
    (event) => {
      if (
        (
          event.code === "Space" ||
          event.code === "ArrowUp"
        ) &&
        !event.repeat
      ) {
        event.preventDefault();
        start();
      }
    }
  );

  $("#restart").onclick = reset;

  /* ==================================================
     SAVE SETTINGS
     ================================================== */

  for (const id of [
    "ball",
    "background",
    "volume",
    "sound"
  ]) {
    $("#" + id).addEventListener(
      "change",
      () => {
        const element = $("#" + id);

        const value =
          element.type === "checkbox"
            ? element.checked
            : element.value;

        set(id, value);
      }
    );
  }

  /* ==================================================
     RESTORE SAVED GAME
     ================================================== */

  reset();

  try {
    const saved = JSON.parse(
      get("run", "null")
    );

    if (
      saved &&
      saved.ball &&
      Array.isArray(saved.hoops) &&
      saved.hoops.length
    ) {
      ball = saved.ball;
      hoops = saved.hoops;

      score = Number(saved.score) || 0;
      streak = Number(saved.streak) || 0;
      frame = Number(saved.frame) || 0;

      /* Restore difficulty progression */

      hoopsPassed = Math.max(
        0,
        Number(saved.hoopsPassed) || 0
      );

      $("#score").textContent = score;

      state = "paused";

      show(
        "Continue Game",
        `Saved score: ${score}`,
        "Resume"
      );
    }
  } catch (error) {
    // Ignore invalid saved game data.
  }

  requestAnimationFrame(loop);

})();
