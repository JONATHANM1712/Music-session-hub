(() => {
  "use strict";

  // Flappy Dunk — progressive moving/tilted hoops, Swish combos, x5+ fire.
  // Space/Up bounce DURING play, never start/restart from an overlay.
  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#game");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = 360, H = 600, R = 16, STEP = 1000 / 60, TAU = Math.PI * 2;
  const ROOT = "assets/flappy-dunk/";
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const random = (a, b) => a + Math.random() * (b - a);

  function get(key, fallback) {
    try { return localStorage.getItem("msh.dunk." + key) ?? fallback; }
    catch (_) { return fallback; }
  }
  function set(key, value) {
    try { localStorage.setItem("msh.dunk." + key, String(value)); }
    catch (_) { /* Site data may be disabled. */ }
  }

  const images = {};
  for (const [key, path] of Object.entries({
    basketball: "balls/normal.png", soccer: "balls/football.png",
    tennis: "balls/tennis.png", wing: "balls/wing.png",
    front: "hoops/hoopFront.png", back: "hoops/hoopBack.png"
  })) {
    images[key] = new Image();
    images[key].src = ROOT + path;
  }
  function img(key, x, y, w, h) {
    const image = images[key];
    if (!image || !image.complete || !image.naturalWidth) return false;
    ctx.drawImage(image, x, y, w, h);
    return true;
  }
  const clips = {};
  for (const name of ["flap", "pass", "bounce", "crash", "x2", "x3", "x4",
    "BuildUp_Explosion_07", "newBestScore"]) {
    clips[name] = new Audio(ROOT + "audio/" + name + ".ogg");
    clips[name].preload = "auto";
  }
  function sound(name) {
    if (!$("#sound").checked || !clips[name]) return;
    try {
      const audio = clips[name].cloneNode(true);
      audio.volume = clamp(Number($("#volume").value) / 100, 0, 1);
      audio.play().catch(() => {});
    } catch (_) { /* Continue without audio. */ }
  }

  for (const id of ["ball", "background", "volume"]) {
    const el = $("#" + id);
    const value = get(id, el.value);
    if (id === "volume" || Array.from(el.options).some(option => option.value === value)) {
      el.value = value;
    }
    el.addEventListener(id === "volume" ? "input" : "change", () => set(id, el.value));
  }
  $("#sound").checked = get("sound", "true") === "true";
  $("#sound").addEventListener("change", event => set("sound", event.target.checked));
  let best = Math.max(0, Number(get("best", "0")) || 0);
  const recentSaved = get("recent", "");
  let recent = recentSaved === "" ? null : Math.max(0, Number(recentSaved) || 0);
  $("#best").textContent = best;

  // Insert Recent between Score and Best; preserve existing HTML and CSS files.
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

  let state = "ready", ball, hoops, score, passed, streak, meters;
  let frame = 0, last = 0, accumulator = 0, lastSaved = 0;
  let flash = 0, flashText = "", particles = [], newBestPlayed = false;

  function show(title, hint, button) {
    $("#status").textContent = title;
    $("#hint").textContent = hint;
    $("#start").textContent = button;
    $("#overlay").hidden = false;
  }
  function reset() {
    state = "ready";
    ball = { x: 90, y: 245, vy: 0 };
    hoops = [];
    score = passed = streak = meters = 0;
    frame = lastSaved = accumulator = 0;
    flash = 0; flashText = ""; particles = []; newBestPlayed = false;
    $("#score").textContent = "0";
    set("run", "");
    show("Flappy Dunk", "Select Play to start the game.", "Play");
  }

  // Distance remains private to the difficulty engine; no on-screen stages/meters.
  function difficulty() { return Math.max(passed * 0.85, meters / 17); }
  function speed() { return Math.min(3.35, 1.65 + difficulty() * 0.022); }
  function makeHoop(x, y, index) {
    const d = Math.max(index, difficulty());
    let type = "static";
    if (index >= 7 && Math.random() < clamp(0.16 + (d - 7) * 0.009, 0.16, 0.5)) {
      type = Math.random() < 0.72 ? "vertical" : "lateral";
    }
    const tiltMax = d < 14 ? 0 : d < 26 ? 0.16 : d < 44 ? 0.35 : 0.48;
    const angle = tiltMax && Math.random() < clamp((d - 10) / 60, 0.15, 0.72)
      ? random(-tiltMax, tiltMax) : 0;
    const width = d < 30 ? 42 : Math.max(35, 42 - (d - 30) * 0.13);
    return { x, y, baseX: x, baseY: y, type, angle, width,
      amp: type === "static" ? 0 : type === "vertical" ? random(20, 35) : random(17, 28),
      phase: random(0, TAU), freq: random(0.018, 0.031) + Math.min(d / 8000, 0.008),
      passed: false, touched: false, oldX: x, oldY: y };
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
    hoops = [makeHoop(265, 315, 0), makeHoop(510, 275, 1)];
    bounce();
  }
  function bounce() {
    if (state !== "playing") return;
    ball.vy = -5.3;
    sound("flap");
  }
  function over() {
    if (state !== "playing") return;
    state = "over";
    recent = score; // Only completed games update Recent.
    set("recent", recent);
    $("#recent").textContent = recent;
    set("run", "");
    sound("crash");
    show("Game Over", `Score ${score} · Best ${best}`, "Try Again");
  }

  function puff(x, y, count, fiery = false) {
    for (let i = 0; i < count; i++) {
      const life = random(16, 33);
      particles.push({ x, y, vx: random(-2.8, 2.8), vy: random(-3.3, 1.2),
        life, max: life, size: random(2, fiery ? 8 : 5),
        color: fiery ? ["#ff471b", "#ffae15", "#ffe95f"][i % 3]
          : ["#ffffff", "#ffe56a", "#ffb470"][i % 3] });
    }
    if (particles.length > 180) particles.splice(0, particles.length - 180);
  }
  function updateParticles() {
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.07; p.life--;
    }
    particles = particles.filter(p => p.life > 0);
  }
  function local(x, y, hoop) {
    const dx = x - hoop.x, dy = y - hoop.y;
    const c = Math.cos(hoop.angle), s = Math.sin(hoop.angle);
    return { x: dx * c + dy * s, y: -dx * s + dy * c };
  }
  function passedHoop(hoop, clean) {
    hoop.passed = true;
    passed++;
    if (clean) {
      streak++;
      const multiplier = streak + 1;
      score += multiplier;
      flashText = `SWISH x${multiplier}!`;
      flash = 65;
      sound(multiplier === 2 ? "x2" : multiplier === 3 ? "x3" : "x4");
      if (multiplier >= 5) {
        if (multiplier === 5) sound("BuildUp_Explosion_07");
        puff(hoop.x, hoop.y, 22, true);
      } else puff(hoop.x, hoop.y, 11);
    } else {
      streak = 0; score++; flashText = "+1"; flash = 30;
      puff(hoop.x, hoop.y, 6); sound("pass");
    }
    $("#score").textContent = score;
    if (score > best) {
      best = score;
      set("best", best);
      $("#best").textContent = best;
      if (!newBestPlayed && score > 5) {
        sound("newBestScore"); newBestPlayed = true;
      }
    }
  }

  function tick() {
    frame++;
    const oldY = ball.y;
    ball.vy = Math.min(ball.vy + 0.23, 7.5);
    ball.y += ball.vy;
    if (flash > 0) flash--;
    updateParticles();
    const movementSpeed = speed();
    meters += movementSpeed / 7.5;
    for (const hoop of hoops) {
      hoop.oldX = hoop.x; hoop.oldY = hoop.y;
      hoop.baseX -= movementSpeed;
      const oscillation = Math.sin(frame * hoop.freq + hoop.phase) * hoop.amp;
      hoop.x = hoop.baseX + (hoop.type === "lateral" ? oscillation : 0);
      hoop.y = hoop.baseY + (hoop.type === "vertical" ? oscillation : 0);
      if (hoop.passed) continue;
      const previous = local(ball.x, oldY, { ...hoop, x: hoop.oldX, y: hoop.oldY });
      const current = local(ball.x, ball.y, hoop);
      const relativeDown = current.y - previous.y;
      const edge = hoop.width - 5;
      if (Math.abs(current.y) < R + 5 &&
          Math.abs(Math.abs(current.x) - hoop.width) < R + 5) {
        if (!hoop.touched && Math.abs(current.x) < hoop.width + R + 5) sound("bounce");
        hoop.touched = true;
      }
      if (previous.y <= 0 && current.y >= 0 && relativeDown > 0) {
        const ratio = clamp(-previous.y / (relativeDown || 1), 0, 1);
        const crossingX = previous.x + (current.x - previous.x) * ratio;
        if (Math.abs(crossingX) <= edge) {
          const clean = !hoop.touched &&
            Math.abs(crossingX) <= Math.max(8, hoop.width - R - 4);
          passedHoop(hoop, clean);
        } else if (Math.abs(crossingX) < hoop.width + R) {
          hoop.touched = true;
        }
      }
      if (!hoop.passed && hoop.baseX + hoop.amp + hoop.width + R < ball.x) {
        over();
        return;
      }
    }
    hoops = hoops.filter(hoop => hoop.baseX > -100);
    if (hoops.length && hoops[hoops.length - 1].baseX < W - 135) {
      const previous = hoops[hoops.length - 1];
      const gap = clamp(252 - difficulty() * 0.35, 214, 252);
      const y = clamp(previous.baseY + random(-95, 95), 205, 385);
      hoops.push(makeHoop(previous.baseX + gap, y, passed + hoops.length));
    }
    if (ball.y > H - R - 12 || ball.y < R) {
      over();
      return;
    }
    if (state === "playing" && frame - lastSaved >= 30) {
      lastSaved = frame;
      set("run", JSON.stringify({ ball, hoops, score, passed, streak, meters, frame }));
    }
  }

  function drawBall() {
    if (streak >= 4) {
      for (let i = 0; i < 6; i++) {
        const angle = frame * 0.11 + i * TAU / 6;
        const x = ball.x - 8 + Math.cos(angle) * 8;
        const y = ball.y + Math.sin(angle) * 13;
        ctx.fillStyle = i % 2 ? "#ff7a17a8" : "#ffe852ac";
        ctx.beginPath();
        ctx.ellipse(x - 13, y, 9 + (i % 3) * 3, 5, angle, 0, TAU);
        ctx.fill();
      }
      if (frame % 3 === 0) puff(ball.x - 10, ball.y, 2, true);
    }
    const flap = Math.sin(frame * 0.35) * 5;
    ctx.save(); ctx.translate(ball.x, ball.y);
    if (!img("wing", -31, -13 + flap / 2, 23, 25)) {
      ctx.fillStyle = "white"; ctx.fillRect(-26, -7, 15, 11);
    }
    ctx.save(); ctx.scale(-1, 1);
    img("wing", -31, -13 + flap / 2, 23, 25);
    ctx.restore();
    ctx.rotate(frame * 0.027);
    if (!img($("#ball").value, -R, -R, R * 2, R * 2)) {
      ctx.fillStyle = "#f18a2d";
      ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#332521"; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
  }
  function drawHoop(hoop, foreground) {
    if (hoop.passed && hoop.baseX < ball.x - 65) return;
    ctx.save(); ctx.translate(hoop.x, hoop.y); ctx.rotate(hoop.angle);
    ctx.scale(hoop.width / 42, 1);
    if (!foreground) {
      ctx.strokeStyle = "#ffffffb8"; ctx.lineWidth = 2;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath(); ctx.moveTo(i * 10, 6); ctx.lineTo(i * 7, 31); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(-23, 31); ctx.lineTo(23, 31); ctx.stroke();
      if (!img("back", -48, -20, 96, 45)) {
        ctx.strokeStyle = "#b82124"; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.ellipse(0, 0, 42, 11, 0, Math.PI, TAU); ctx.stroke();
      }
    } else if (!img("front", -48, -20, 96, 45)) {
      ctx.strokeStyle = "#f74743"; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.ellipse(0, 0, 42, 11, 0, 0, Math.PI); ctx.stroke();
    }
    ctx.restore();
  }
  function draw() {
    const palettes = {
      sky: ["#7cd7f5", "#d4f5ff"], sunset: ["#e98a93", "#ffcf8a"],
      night: ["#182747", "#56618b"], mint: ["#9ce5bd", "#dcffdc"]
    };
    const [top, bottom] = palettes[$("#background").value] || palettes.sky;
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, top); gradient.addColorStop(1, bottom);
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff2b";
    for (let i = 0; i < 7; i++) {
      let x = (i * 105 - frame * 0.18) % 480;
      if (x < -40) x += 480;
      ctx.beginPath();
      ctx.arc(x, 85 + (i * 77) % 430, 22 + (i % 3) * 8, 0, TAU);
      ctx.fill();
    }
    for (const hoop of hoops) {
      if (hoop.type === "static" || hoop.passed) continue;
      ctx.save(); ctx.strokeStyle = "#ffffff70"; ctx.lineWidth = 2;
      ctx.setLineDash([5, 7]); ctx.beginPath();
      if (hoop.type === "vertical") {
        ctx.moveTo(hoop.baseX, hoop.baseY - hoop.amp);
        ctx.lineTo(hoop.baseX, hoop.baseY + hoop.amp);
      } else {
        ctx.moveTo(hoop.baseX - hoop.amp, hoop.baseY);
        ctx.lineTo(hoop.baseX + hoop.amp, hoop.baseY);
      }
      ctx.stroke(); ctx.restore();
    }
    for (const hoop of hoops) drawHoop(hoop, false);
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    drawBall();
    for (const hoop of hoops) drawHoop(hoop, true);
    ctx.textAlign = "center";
    ctx.font = "bold 40px Rubik, Arial, sans-serif";
    ctx.strokeStyle = "#17273c"; ctx.lineWidth = 5;
    ctx.strokeText(String(score), W / 2, 60);
    ctx.fillStyle = "white"; ctx.fillText(String(score), W / 2, 60);
    if (flash > 0) {
      ctx.globalAlpha = Math.min(1, flash / 16);
      ctx.font = "bold 25px Rubik, Arial, sans-serif";
      ctx.strokeStyle = "#72300a"; ctx.lineWidth = 5;
      ctx.strokeText(flashText, W / 2, 110);
      ctx.fillStyle = streak >= 4 ? "#ff6b18" : "#ffe15b";
      ctx.fillText(flashText, W / 2, 110);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "#d54b55"; ctx.fillRect(0, H - 12, W, 12);
  }
  function loop(time) {
    if (!last) last = time;
    accumulator += Math.min(50, time - last);
    last = time;
    while (accumulator >= STEP) {
      if (state === "playing") tick();
      else { frame++; updateParticles(); }
      accumulator -= STEP;
    }
    draw();
    requestAnimationFrame(loop);
  }

  $("#start").addEventListener("click", event => {
    event.stopPropagation();
    startFromButton();
  });
  canvas.addEventListener("pointerdown", event => {
    event.preventDefault();
    if (state === "playing") bounce();
  });
  window.addEventListener("keydown", event => {
    if (event.code !== "Space" && event.code !== "ArrowUp") return;
    const tag = document.activeElement?.tagName || "";
    if (["INPUT", "SELECT", "TEXTAREA"].includes(tag)) return;
    if (state !== "playing") {
      if (event.code === "Space") event.preventDefault();
      return;
    }
    if (event.repeat) return;
    event.preventDefault();
    bounce();
  }, true);
  $("#restart").addEventListener("click", reset);

  const previousRun = get("run", "null");
  reset();
  try {
    const saved = JSON.parse(previousRun);
    if (saved && saved.ball && Array.isArray(saved.hoops) && saved.hoops.length) {
      ball = saved.ball;
      hoops = saved.hoops.map(hoop => ({
        ...hoop, baseX: hoop.baseX ?? hoop.x, baseY: hoop.baseY ?? hoop.y,
        oldX: hoop.x, oldY: hoop.y, type: hoop.type || "static",
        angle: hoop.angle || 0, width: hoop.width || 42,
        amp: hoop.amp || 0, phase: hoop.phase || 0, freq: hoop.freq || 0.024
      }));
      score = Math.max(0, Number(saved.score) || 0);
      passed = Math.max(0, Number(saved.passed ?? saved.hoopsPassed) || 0);
      streak = Math.max(0, Number(saved.streak) || 0);
      meters = Math.max(0, Number(saved.meters) || 0);
      frame = Math.max(0, Number(saved.frame) || 0);
      $("#score").textContent = score;
      state = "paused";
      show("Continue Game", `Saved score: ${score}`, "Resume");
    }
  } catch (_) { /* Ignore corrupt saved progress. */ }
  requestAnimationFrame(loop);
})();
