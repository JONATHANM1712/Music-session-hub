
(() => {
  "use strict";

  /* ==================================================
     FLAPPY BIRD
     PROGRESSIVE DIFFICULTY
     ================================================== */

  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  const $ = (selector) => document.querySelector(selector);

  const W = 288;
  const H = 512;
  const ground = 400;
  const assets = "assets/flappy-bird/";

  /* ==================================================
     SPEED SETTINGS
     ================================================== */

  const BASE_SPEED = 1.65;
  const SPEED_INCREMENT = 0.025;
  const MAX_SPEED = 3.65;

  function getSpeed() {
    return Math.min(
      BASE_SPEED + score * SPEED_INCREMENT,
      MAX_SPEED
    );
  }

  /* ==================================================
     GAME STATE
     ================================================== */

  let state = "ready";

  let bird = {
    x: 76,
    y: 210,
    vy: 0
  };

  let pipes = [];
  let score = 0;
  let frame = 0;
  let last = 0;
  let acc = 0;

  /* ==================================================
     IMAGES
     ================================================== */

  const imgs = {};

  const imageNames = [
    "background-day",
    "background-night",
    "base",
    "pipe-green",
    "yellowbird-downflap",
    "yellowbird-midflap",
    "yellowbird-upflap"
  ];

  for (const name of imageNames) {
    const image = new Image();

    image.src =
      assets + "sprites/" + name + ".png";

    imgs[name] = image;
  }

  /* ==================================================
     SOUNDS
     ================================================== */

  const sounds = {};

  for (const name of ["wing", "point", "hit", "die"]) {
    const audio = new Audio(
      assets + "audio/" + name + ".ogg"
    );

    audio.preload = "auto";
    sounds[name] = audio;
  }

  function play(name) {
    if (!$("#sound").checked) {
      return;
    }

    try {
      const audio = sounds[name].cloneNode();

      audio.volume =
        Number($("#volume").value) / 100;

      audio.play().catch(() => {});
    } catch (error) {
      // Continue gameplay if audio is unavailable.
    }
  }

  /* ==================================================
     LOCAL STORAGE
     ================================================== */

  function safeGet(key, fallback) {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch (error) {
      return fallback;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch (error) {
      // Continue gameplay if storage is unavailable.
    }
  }

  let best =
    Number(safeGet("msh.flappybird.best", "0")) || 0;

  $("#best").textContent = best;

  $("#theme").value = safeGet(
    "msh.flappybird.theme",
    "day"
  );

  $("#sound").checked =
    safeGet("msh.flappybird.sound", "true") === "true";

  $("#volume").value = safeGet(
    "msh.flappybird.volume",
    "65"
  );

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

    bird = {
      x: 76,
      y: 210,
      vy: 0
    };

    pipes = [];
    score = 0;
    frame = 0;
    acc = 0;

    safeSet("msh.flappybird.run", "");

    $("#score").textContent = "0";

    show(
      "Flappy Bird",
      "Press Space, click, or tap to flap",
      "Play"
    );
  }

  /* ==================================================
     START / FLAP
     ================================================== */

  function flap() {
    if (state === "paused") {
      state = "playing";
      $("#overlay").hidden = true;
      return;
    }

    if (state === "over") {
      reset();
      state = "playing";
      $("#overlay").hidden = true;
    } else if (state === "ready") {
      state = "playing";
      $("#overlay").hidden = true;
    }

    bird.vy = -4.6;

    play("wing");
  }

  /* ==================================================
     GAME OVER
     ================================================== */

  function over() {
    if (state !== "playing") {
      return;
    }

    state = "over";

    safeSet("msh.flappybird.run", "");

    play("hit");

    setTimeout(() => {
      play("die");
    }, 130);

    if (score > best) {
      best = score;

      safeSet("msh.flappybird.best", best);

      $("#best").textContent = best;
    }

    show(
      "Game Over",
      `Score ${score} · Best ${best}`,
      "Try Again"
    );
  }

  /* ==================================================
     GAME PHYSICS
     ================================================== */

  function tick() {
    frame++;

    bird.vy = Math.min(
      7,
      bird.vy + 0.26
    );

    bird.y += bird.vy;

    /* Generate pipes */

    if (frame % 95 === 1) {
      const top =
        65 + Math.random() * 155;

      pipes.push({
        x: W + 24,
        top,
        passed: false
      });
    }

    /* ==================================================
       PROGRESSIVE PIPE MOVEMENT

       Score 0  = 1.65
       Score 20 = 2.15
       Score 40 = 2.65
       Score 60 = 3.15
       Score 74 = 3.50
       ================================================== */

    const speed = getSpeed();

    for (const pipe of pipes) {
      pipe.x -= speed;

      /* Successful pipe */

      if (
        !pipe.passed &&
        pipe.x + 52 < bird.x
      ) {
        pipe.passed = true;

        score++;

        $("#score").textContent = score;

        play("point");

        if (score > best) {
          best = score;

          safeSet("msh.flappybird.best", best);

          $("#best").textContent = best;
        }
      }

      /* Pipe collision */

      const horizontalCollision =
        bird.x + 11 > pipe.x &&
        bird.x - 11 < pipe.x + 52;

      const verticalCollision =
        bird.y - 10 < pipe.top ||
        bird.y + 10 > pipe.top + 112;

      if (
        horizontalCollision &&
        verticalCollision
      ) {
        over();
      }
    }

    /* Remove offscreen pipes */

    pipes = pipes.filter(
      (pipe) => pipe.x > -60
    );

    /* Ground and ceiling collision */

    if (
      bird.y + 12 >= ground ||
      bird.y - 12 < 0
    ) {
      over();
    }

    /* Save progress */

    if (
      state === "playing" &&
      frame % 30 === 0
    ) {
      safeSet(
        "msh.flappybird.run",
        JSON.stringify({
          bird,
          pipes,
          score,
          frame
        })
      );
    }
  }

  /* ==================================================
     DRAW IMAGE
     ================================================== */

  function drawImage(name, x, y, width, height) {
    const image = imgs[name];

    if (
      image &&
      image.complete &&
      image.naturalWidth
    ) {
      ctx.drawImage(
        image,
        x,
        y,
        width,
        height
      );
    }
  }

  /* ==================================================
     DRAW GAME
     ================================================== */

  function draw() {
    const theme = $("#theme").value;

    ctx.fillStyle =
      theme === "day" ? "#78cde6" : "#253f68";

    ctx.fillRect(0, 0, W, H);

    drawImage(
      "background-" + theme,
      0,
      0,
      W,
      ground
    );

    /* Draw pipes */

    for (const pipe of pipes) {
      const image = imgs["pipe-green"];

      if (
        image.complete &&
        image.naturalWidth
      ) {
        ctx.save();

        ctx.translate(
          pipe.x + 52,
          pipe.top
        );

        ctx.scale(-1, -1);

        ctx.drawImage(
          image,
          0,
          0,
          52,
          320
        );

        ctx.restore();

        ctx.drawImage(
          image,
          pipe.x,
          pipe.top + 112,
          52,
          320
        );
      } else {
        ctx.fillStyle = "#61bf40";

        ctx.fillRect(
          pipe.x,
          0,
          52,
          pipe.top
        );

        ctx.fillRect(
          pipe.x,
          pipe.top + 112,
          52,
          ground
        );
      }
    }

    /* Draw ground */

    drawImage(
      "base",
      -(frame * 0.9 % 48),
      ground,
      336,
      112
    );

    /* Draw bird */

    ctx.save();

    ctx.translate(
      bird.x,
      bird.y
    );

    ctx.rotate(
      Math.max(
        -0.45,
        Math.min(
          1.25,
          bird.vy * 0.09
        )
      )
    );

    const phase =
      Math.floor(frame / 7) % 3;

    const birdFrames = [
      "yellowbird-downflap",
      "yellowbird-midflap",
      "yellowbird-upflap"
    ];

    const image = imgs[birdFrames[phase]];

    if (
      image.complete &&
      image.naturalWidth
    ) {
      ctx.drawImage(
        image,
        -17,
        -12,
        34,
        24
      );
    } else {
      ctx.fillStyle = "#ffda43";

      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    /* Draw score */

    ctx.textAlign = "center";
    ctx.font = "bold 34px Rubik, sans-serif";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#443322";

    ctx.strokeText(
      String(score),
      W / 2,
      55
    );

    ctx.fillStyle = "white";

    ctx.fillText(
      String(score),
      W / 2,
      55
    );
  }

  /* ==================================================
     ANIMATION LOOP
     ================================================== */

  function loop(time) {
    if (!last) {
      last = time;
    }

    acc += Math.min(
      time - last,
      50
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
     GAME CONTROLS
     ================================================== */

  $("#start").addEventListener(
    "click",
    (event) => {
      event.stopPropagation();
      flap();
    }
  );

  canvas.addEventListener(
    "pointerdown",
    (event) => {
      event.preventDefault();
      flap();
    }
  );

  window.addEventListener(
    "keydown",
    (event) => {
      if (
        event.code === "Space" ||
        event.code === "ArrowUp"
      ) {
        if (event.repeat) {
          return;
        }

        event.preventDefault();
        flap();
      }
    }
  );

  $("#restart").onclick = reset;

  /* Save settings */

  for (const id of [
    "theme",
    "sound",
    "volume"
  ]) {
    $("#" + id).addEventListener(
      "change",
      () => {
        const element = $("#" + id);

        const value =
          element.type === "checkbox"
            ? element.checked
            : element.value;

        safeSet(
          "msh.flappybird." + id,
          value
        );
      }
    );
  }

  /* ==================================================
     RESTORE SAVED GAME
     ================================================== */

  reset();

  try {
    const saved = JSON.parse(
      safeGet(
        "msh.flappybird.run",
        "null"
      )
    );

    if (
      saved &&
      saved.bird &&
      Array.isArray(saved.pipes)
    ) {
      bird = saved.bird;
      pipes = saved.pipes;

      score = Number(saved.score) || 0;
      frame = Number(saved.frame) || 0;

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
