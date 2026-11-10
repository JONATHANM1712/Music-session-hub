(() => {
  "use strict";

  // Flappy Bird — progressive speed, Score / Recent / Best.
  // Space/Up work while playing, not on Start, Game Over or Resume screens.
  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#game");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = 288, H = 512, ground = 400;
  const assets = "assets/flappy-bird/";
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  function safeGet(key, fallback) {
    try { return localStorage.getItem(key) ?? fallback; }
    catch (_) { return fallback; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, String(value)); }
    catch (_) { /* Continue without storage. */ }
  }

  const images = {};
  for (const name of ["background-day", "background-night", "base", "pipe-green",
    "yellowbird-downflap", "yellowbird-midflap", "yellowbird-upflap"]) {
    images[name] = new Image();
    images[name].src = assets + "sprites/" + name + ".png";
  }
  const sounds = {};
  for (const name of ["wing", "point", "hit", "die"]) {
    sounds[name] = new Audio(assets + "audio/" + name + ".ogg");
    sounds[name].preload = "auto";
  }
  function play(name) {
    if (!$("#sound").checked || !sounds[name]) return;
    try {
      const audio = sounds[name].cloneNode(true);
      audio.volume = clamp(Number($("#volume").value) / 100, 0, 1);
      audio.play().catch(() => {});
    } catch (_) { /* Audio is optional. */ }
  }

  let best = Math.max(0, Number(safeGet("msh.flappybird.best", "0")) || 0);
  const recentSaved = safeGet("msh.flappybird.recent", "");
  let recent = recentSaved === "" ? null : Math.max(0, Number(recentSaved) || 0);
  $("#best").textContent = best;
  $("#theme").value = safeGet("msh.flappybird.theme", "day");
  $("#sound").checked = safeGet("msh.flappybird.sound", "true") === "true";
  $("#volume").value = safeGet("msh.flappybird.volume", "65");

  // Add a third score tile without changing HTML or shared CSS.
  const scorePanel = $(".score-panel");
  const recentCard = document.createElement("div");
  recentCard.innerHTML = '<span>Recent</span><strong id="recent">—</strong>';
  scorePanel.insertBefore(recentCard, $("#best").parentElement);
  scorePanel.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
  scorePanel.style.gap = "8px";
  for (const card of scorePanel.children) {
    card.style.minWidth = "0";
    card.style.padding = "12px 9px";
  }
  $("#recent").textContent = recent === null ? "—" : recent;

  let state = "ready";
  let bird = { x: 76, y: 210, vy: 0 };
  let pipes = [], score = 0, frame = 0, last = 0, accumulator = 0;

  function show(title, hint, button) {
    $("#status").textContent = title;
    $("#hint").textContent = hint;
    $("#start").textContent = button;
    $("#overlay").hidden = false;
  }
  function reset() {
    state = "ready";
    bird = { x: 76, y: 210, vy: 0 };
    pipes = [];
    score = frame = accumulator = 0;
    $("#score").textContent = "0";
    safeSet("msh.flappybird.run", "");
    show("Flappy Bird", "Select Play to start the game.", "Play");
  }
  function startFromButton() {
    if (state === "paused") {
      state = "playing";
      $("#overlay").hidden = true;
      return;
    }
    if (state === "over") reset();
    if (state !== "ready") return;
    state = "playing";
    $("#overlay").hidden = true;
    flap();
  }
  function flap() {
    if (state !== "playing") return;
    bird.vy = -4.6;
    play("wing");
  }
  function over() {
    if (state !== "playing") return;
    state = "over";
    recent = score; // LAST COMPLETED GAME (including a score of zero).
    safeSet("msh.flappybird.recent", recent);
    $("#recent").textContent = recent;
    safeSet("msh.flappybird.run", "");
    play("hit");
    setTimeout(() => play("die"), 130);
    show("Game Over", `Score ${score} · Best ${best}`, "Try Again");
  }

  function tick() {
    frame++;
    bird.vy = Math.min(7, bird.vy + 0.26);
    bird.y += bird.vy;
    if (frame % 95 === 1) {
      pipes.push({ x: W + 24, top: 65 + Math.random() * 155, passed: false });
    }
    const speed = Math.min(3.65, 1.65 + score * 0.025);
    for (const pipe of pipes) {
      pipe.x -= speed;
      if (!pipe.passed && pipe.x + 52 < bird.x) {
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
      if (bird.x + 11 > pipe.x && bird.x - 11 < pipe.x + 52 &&
          (bird.y - 10 < pipe.top || bird.y + 10 > pipe.top + 112)) {
        over();
        return;
      }
    }
    pipes = pipes.filter(pipe => pipe.x > -60);
    if (bird.y + 12 >= ground || bird.y - 12 < 0) {
      over();
      return;
    }
    if (frame % 30 === 0) {
      safeSet("msh.flappybird.run", JSON.stringify({ bird, pipes, score, frame }));
    }
  }

  function drawImage(name, x, y, w, h) {
    const img = images[name];
    if (img && img.complete && img.naturalWidth) ctx.drawImage(img, x, y, w, h);
  }
  function draw() {
    const theme = $("#theme").value === "night" ? "night" : "day";
    ctx.fillStyle = theme === "day" ? "#78cde6" : "#253f68";
    ctx.fillRect(0, 0, W, H);
    drawImage("background-" + theme, 0, 0, W, ground);
    for (const pipe of pipes) {
      const img = images["pipe-green"];
      if (img.complete && img.naturalWidth) {
        ctx.save();
        ctx.translate(pipe.x + 52, pipe.top);
        ctx.scale(-1, -1);
        ctx.drawImage(img, 0, 0, 52, 320);
        ctx.restore();
        ctx.drawImage(img, pipe.x, pipe.top + 112, 52, 320);
      } else {
        ctx.fillStyle = "#61bf40";
        ctx.fillRect(pipe.x, 0, 52, pipe.top);
        ctx.fillRect(pipe.x, pipe.top + 112, 52, ground);
      }
    }
    drawImage("base", -(frame * 0.9 % 48), ground, 336, 112);
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(clamp(bird.vy * 0.09, -0.45, 1.25));
    const phases = ["yellowbird-downflap", "yellowbird-midflap", "yellowbird-upflap"];
    const img = images[phases[Math.floor(frame / 7) % 3]];
    if (img.complete && img.naturalWidth) ctx.drawImage(img, -17, -12, 34, 24);
    else {
      ctx.fillStyle = "#ffda43";
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.textAlign = "center";
    ctx.font = "bold 34px Rubik, sans-serif";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#443322";
    ctx.strokeText(String(score), W / 2, 55);
    ctx.fillStyle = "white";
    ctx.fillText(String(score), W / 2, 55);
  }
  function loop(time) {
    if (!last) last = time;
    accumulator += Math.min(time - last, 50);
    last = time;
    while (accumulator >= 1000 / 60) {
      if (state === "playing") tick();
      else frame++;
      accumulator -= 1000 / 60;
    }
    draw();
    requestAnimationFrame(loop);
  }

  // Only the Play / Try Again / Resume button may start a non-playing run.
  $("#start").addEventListener("click", event => {
    event.stopPropagation();
    startFromButton();
  });
  canvas.addEventListener("pointerdown", event => {
    event.preventDefault();
    if (state === "playing") flap();
  });
  window.addEventListener("keydown", event => {
    if (event.code !== "Space" && event.code !== "ArrowUp") return;
    const tag = document.activeElement?.tagName || "";
    if (["INPUT", "SELECT", "TEXTAREA"].includes(tag)) return;
    // Prevent focused Play/Try Again buttons being activated by Space.
    if (state !== "playing") {
      if (event.code === "Space") event.preventDefault();
      return;
    }
    if (event.repeat) return;
    event.preventDefault();
    flap();
  }, true);
  $("#restart").addEventListener("click", reset);

  for (const id of ["theme", "sound", "volume"]) {
    $("#" + id).addEventListener(id === "volume" ? "input" : "change", () => {
      const el = $("#" + id);
      safeSet("msh.flappybird." + id, el.type === "checkbox" ? el.checked : el.value);
    });
  }

  // Read the interrupted run BEFORE reset clears the run key.
  const previousRun = safeGet("msh.flappybird.run", "null");
  reset();
  try {
    const saved = JSON.parse(previousRun);
    if (saved && saved.bird && Array.isArray(saved.pipes)) {
      bird = saved.bird;
      pipes = saved.pipes;
      score = Math.max(0, Number(saved.score) || 0);
      frame = Math.max(0, Number(saved.frame) || 0);
      $("#score").textContent = score;
      state = "paused";
      show("Continue Game", `Saved score: ${score}`, "Resume");
    }
  } catch (_) { /* Ignore invalid saved runs. */ }
  requestAnimationFrame(loop);
})();
