/*
 * Music Session Hub — Practice Timer
 * Extends the original Metronome without redefining tick(),
 * startBeatMotionLeg(), scheduleTimer(), or the native audio functions.
 */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "musicSessionPracticeTimerV1";
  // The central plan determines access; never infer it from the saved checkbox.
  const premiumCounters = window.MUSIC_SESSION_PLAN?.SPOTIFY_PREMIUM === true;
  const modeInputs = [...document.querySelectorAll('input[name="practiceStop"]')];
  const limitInputs = [$("practiceBarsLimit"), $("practiceMinutes"), $("practiceSeconds")];

  let beganAt = null;
  let elapsedFinal = 0;
  let finalBars = 0;
  let finalBeats = 0;
  let clockId = null;
  let modeForRun = "off";
  let limitForRun = 0;
  let lastStatus = "Ready to practice.";

  const format = ms => {
    const seconds = Math.floor(Math.max(0, ms) / 1000);
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  };
  // Ceil so the countdown does not show 00:00 while time is still left.
  const formatCountdown = ms => {
    const seconds = Math.ceil(Math.max(0, ms) / 1000);
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  };
  const elapsedMs = () => beganAt === null
    ? elapsedFinal
    : elapsedFinal + performance.now() - beganAt;
  const completedBars = () => {
    const bpb = Math.max(1, Number($("beatsPerBar").value));
    return Math.floor(totalBeats / bpb);
  };
  const chosenMode = () => document.querySelector('input[name="practiceStop"]:checked')?.value || "off";
  const requestedLimit = mode => {
    if (mode === "bars") {
      const n = Number($("practiceBarsLimit").value);
      return Number.isSafeInteger(n) && n >= 1 && n <= 100000 ? n : 0;
    }
    if (mode === "time") {
      const m = Number($("practiceMinutes").value);
      const s = Number($("practiceSeconds").value);
      if (!Number.isInteger(m) || m < 0 || m > 240 ||
          !Number.isInteger(s) || s < 0 || s > 59) return 0;
      return (m * 60 + s) * 1000;
    }
    return Infinity;
  };
  function render() {
    const live = beganAt !== null;
    const bars = live ? completedBars() : finalBars;
    const beats = live ? totalBeats : finalBeats;
    // Track the currently selected mode when idle, and the locked-in mode
    // during playback. Keep the stopped session's final count visible.
    const displayMode = live ? modeForRun : chosenMode();
    const limit = live ? limitForRun : requestedLimit(displayMode);
    let shownTime = elapsedMs();
    if (displayMode === "time" && Number.isFinite(limit) && limit > 0) {
      // Stopwatch becomes remaining time when auto-stop by time is selected.
      shownTime = Math.max(0, limit - elapsedMs());
    } else if (displayMode === "bars" && Number.isFinite(limit) && limit > 0) {
      // Bar mode counts down the remaining beats as equivalent time.
      // Uses the existing metronome's effective (percentage-adjusted) BPM.
      const beatsPerBar = Math.max(1, Number($("beatsPerBar").value) || 4);
      const remainingBeats = Math.max(0, limit * beatsPerBar - beats);
      const activeBpm = Math.max(1, Number(playbackBpm) || 100);
      shownTime = remainingBeats * 60000 / activeBpm;
    }
    const timeElement = $("practiceElapsedMain");
    timeElement.textContent = displayMode === "off"
      ? format(shownTime)
      : formatCountdown(shownTime);
    timeElement.setAttribute("aria-label", displayMode === "off"
      ? "Elapsed practice time" : "Practice time remaining");
    $("practiceProgressMain").textContent = `${bars} bars · ${beats} beats`;
    timeElement.hidden = !$("practiceShowElapsed").checked;
    $("practiceProgressMain").hidden = !premiumCounters || !$("practiceShowCounters").checked;
    $("practiceTimerStatus").textContent = lastStatus;
  }
  function savePreferences() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        mode: chosenMode(),
        bars: $("practiceBarsLimit").value,
        minutes: $("practiceMinutes").value,
        seconds: $("practiceSeconds").value,
        showElapsed: $("practiceShowElapsed").checked,
        showCounters: $("practiceShowCounters").checked
      }));
    } catch (err) { console.warn("Timer preferences could not be saved.", err); }
  }
  function loadPreferences() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!saved || typeof saved !== "object") return;
      const radio = modeInputs.find(input => input.value === saved.mode);
      if (radio) radio.checked = true;
      for (const [id, key] of [
        ["practiceBarsLimit", "bars"],
        ["practiceMinutes", "minutes"],
        ["practiceSeconds", "seconds"]
      ]) {
        if (saved[key] !== undefined) $(id).value = saved[key];
      }
      if (typeof saved.showElapsed === "boolean") $("practiceShowElapsed").checked = saved.showElapsed;
      if (typeof saved.showCounters === "boolean") $("practiceShowCounters").checked = saved.showCounters;
    } catch (err) { console.warn("Timer preferences could not be loaded.", err); }
  }
  function lockLimits(locked) {
    [...modeInputs, ...limitInputs].forEach(input => input.disabled = locked);
  }
  function autoStop(reason) {
    if (!isRunning) return;
    lastStatus = reason;
    // Calls the original stop, retaining its animation reset and controls.
    stopMetronome();
  }
  const API = {
    beforeStart() {
      modeForRun = chosenMode();
      limitForRun = requestedLimit(modeForRun);
      if (modeForRun !== "off" && limitForRun <= 0) {
        lastStatus = modeForRun === "bars"
          ? "Enter a valid bar limit (at least 1)."
          : "Enter a duration greater than zero.";
        render();
        openSettings();
        return false;
      }
      return true;
    },
    onStart() {
      // The original metronome begins a new session on every Play.
      elapsedFinal = 0;
      finalBars = 0;
      finalBeats = 0;
      beganAt = performance.now();
      lastStatus = "Practice in progress.";
      lockLimits(true);
      clearInterval(clockId);
      clockId = setInterval(() => {
        render();
        if (isRunning && modeForRun === "time" && elapsedMs() >= limitForRun) {
          autoStop("Time limit reached. Metronome stopped.");
        }
      }, 50);
      render();
    },
    onBeat() {
      if (beganAt === null) return;
      render();
      if (modeForRun === "bars" && completedBars() >= limitForRun) {
        autoStop(`Stopped after ${limitForRun} completed bars.`);
      }
    },
    onStop() {
      if (beganAt !== null) {
        elapsedFinal += performance.now() - beganAt;
        beganAt = null;
      }
      finalBeats = totalBeats;
      finalBars = completedBars();
      clearInterval(clockId);
      clockId = null;
      lockLimits(false);
      if (lastStatus === "Practice in progress.") lastStatus = "Practice stopped.";
      render();
    }
  };
  window.MetronomePracticeTimer = API;
  window.openPracticeTimer = () => {
    openSettings();
    $("practiceTimerSettings").scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  window.resetPracticeTimer = () => {
    if (isRunning) stopMetronome();
    elapsedFinal = 0;
    beganAt = null;
    finalBars = 0;
    finalBeats = 0;
    lastStatus = "Ready to practice.";
    render();
  };
  // On choosing a new limit while idle, start the selected countdown
  // from its full value. Do not change an active run's settings.
  [...modeInputs, ...limitInputs].forEach(input => {
    const changed = () => {
      if (!isRunning) {
        elapsedFinal = 0;
        finalBars = 0;
        finalBeats = 0;
        lastStatus = "Ready to practice.";
      }
      savePreferences();
      render();
    };
    input.addEventListener("input", changed);
    input.addEventListener("change", changed);
  });
  [$("practiceShowElapsed"), $("practiceShowCounters")]
    .forEach(input => input.addEventListener("change", () => {
      savePreferences();
      render();
    }));
  loadPreferences();
  // Free retains elapsed/countdown and auto-stop, but cannot show counter labels.
  // Do not clear a previously saved Premium preference when switching to Free.
  $("practiceCounterPreference").hidden = !premiumCounters;
  $("practiceShowCounters").disabled = !premiumCounters;
  render();
})();
