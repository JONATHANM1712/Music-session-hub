
/* ============================================================
   MUSIC SESSION HUB — METRONOME VOICE COUNTING

   Independent MP3 Playback Engine

   FEATURES
   ------------------------------------------------------------
   • Spotify Premium + Platinum only
   • Local HTML / localhost / GitHub Pages support
   • 16 prerecorded voice samples
   • Independent playback for each count
   • No forced interruption at every beat
   • No automatic BPM-dependent pitch increase
   • Pitch preservation where browser-supported
   • Voice + Clicks / Voice Only
   • Volume: 0–100%, default 70%
   • Speech Speed: 100–250%, default 200%
   • Maximum Voice BPM: default 280
   • Persistent localStorage preferences
   • Existing metronome.html API compatibility
   • No changes to style.css

   IMPORTANT
   ------------------------------------------------------------
   Each count uses its own HTMLAudioElement instance.

   A new beat NEVER stops or resets an earlier count.

   At very high BPM, spoken words may overlap naturally.
   ============================================================ */

(() => {
  "use strict";

  /* ============================================================
     CONSTANTS
     ============================================================ */

  const $ = id => document.getElementById(id);

  const PLAN = window.MUSIC_SESSION_PLAN || {};

  const entitled =
    PLAN.SPOTIFY_PREMIUM === true &&
    PLAN.PLATINUM === true;

  const STORAGE_KEY =
    "musicSessionMetronomeVoiceV1";

  const DEFAULTS = Object.freeze({
    enabled: false,
    mode: "layer",
    volume: 70,
    maxBpm: 280,
    speed: 200,
    voiceURI: "recorded"
  });

  const WORDS = [
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen"
  ];

  const SAMPLE_FOLDER = new URL(
    "metronome-voice-counts/",
    document.baseURI
  );

  const MIN_SPEECH_SPEED = 100;
  const MAX_SPEECH_SPEED = 250;

  /* ============================================================
     STATE
     ============================================================ */

  let settings = { ...DEFAULTS };

  let samples = new Array(16).fill(null);

  let sampleReady = new Array(16).fill(false);

  let loadedCount = 0;

  let loadingPromise = null;

  let loadingFinished = false;

  let loadingError = "";

  // Every playing word is tracked independently.
  const activeVoiceInstances = new Set();

  /* ============================================================
     UTILITIES
     ============================================================ */

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function numberSetting(value, min, max, fallback) {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return fallback;
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
      return fallback;
    }

    return clamp(
      Math.round(number),
      min,
      max
    );
  }

  /* ============================================================
     LOCAL STORAGE
     ============================================================ */

  function loadSettings() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "null"
      );

      if (!saved || typeof saved !== "object") {
        return;
      }

      settings.enabled =
        saved.enabled === true;

      settings.mode =
        saved.mode === "only" ? "only" : "layer";

      settings.volume = numberSetting(
        saved.volume,
        0,
        100,
        DEFAULTS.volume
      );

      settings.maxBpm = numberSetting(
        saved.maxBpm,
        60,
        280,
        DEFAULTS.maxBpm
      );

      settings.speed = numberSetting(
        saved.speed,
        MIN_SPEECH_SPEED,
        MAX_SPEECH_SPEED,
        DEFAULTS.speed
      );

      settings.voiceURI = "recorded";

    } catch (error) {
      console.warn(
        "Unable to restore Metronome Voice settings:",
        error
      );
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(settings)
      );
    } catch (error) {
      console.warn(
        "Unable to save Metronome Voice settings:",
        error
      );
    }
  }

  /* ============================================================
     VOICE COUNTING AVAILABILITY
     ============================================================ */

  function withinVoiceRange(bpm) {
    const tempo = Number(bpm);

    return (
      entitled &&
      settings.enabled &&
      Number.isFinite(tempo) &&
      tempo > 0 &&
      tempo <= settings.maxBpm
    );
  }

  function shouldPlayClicks(bpm) {
    // Voice Only always mutes clicks inside the voice BPM range.
    // This does not depend on whether an MP3 is loaded.

    return !(
      withinVoiceRange(bpm) &&
      settings.mode === "only"
    );
  }

  /* ============================================================
     PITCH PRESERVATION
     ============================================================ */

  function preservePitch(audio) {
    audio.preservesPitch = true;

    if ("mozPreservesPitch" in audio) {
      audio.mozPreservesPitch = true;
    }

    if ("webkitPreservesPitch" in audio) {
      audio.webkitPreservesPitch = true;
    }
  }

  function applySpeechSpeed(audio) {
    preservePitch(audio);

    // BPM does not change this rate.
    // Only the Speech Speed slider controls it.

    audio.playbackRate = clamp(
      settings.speed / 100,
      1,
      2.5
    );
  }

  /* ============================================================
     CREATE MP3 AUDIO ELEMENT
     ============================================================ */

  function createAudioSample(number) {
    const audio = new Audio();

    audio.preload = "auto";

    audio.src = new URL(
      `${number}.mp3`,
      SAMPLE_FOLDER
    ).href;

    audio.volume =
      settings.volume / 100;

    preservePitch(audio);

    return audio;
  }

  /* ============================================================
     LOAD ONE MP3 SAMPLE
     ============================================================ */

  function loadOneSample(number) {
    return new Promise(resolve => {
      const index = number - 1;

      const audio = createAudioSample(number);

      samples[index] = audio;

      let finished = false;

      let timeout;

      const cleanup = () => {
        clearTimeout(timeout);

        audio.removeEventListener(
          "canplay",
          successHandler
        );

        audio.removeEventListener(
          "error",
          errorHandler
        );
      };

      const finish = success => {
        if (finished) return;

        finished = true;

        cleanup();

        sampleReady[index] = success;

        if (success) {
          loadedCount++;
        } else {
          console.warn(
            `Unable to load ${number}.mp3`,
            audio.error?.message || audio.src
          );
        }

        render();

        resolve(success);
      };

      const successHandler = () => finish(true);

      const errorHandler = () => finish(false);

      timeout = setTimeout(() => {
        finish(audio.readyState >= 2);
      }, 12000);

      audio.addEventListener(
        "canplay",
        successHandler
      );

      audio.addEventListener(
        "error",
        errorHandler
      );

      audio.load();

      if (audio.readyState >= 2) {
        finish(true);
      }
    });
  }

  /* ============================================================
     LOAD ALL 16 RECORDINGS
     ============================================================ */

  async function loadSamples(forceRetry = false) {
    if (!entitled) {
      return false;
    }

    if (loadedCount === 16) {
      return true;
    }

    if (loadingPromise) {
      return loadingPromise;
    }

    if (loadingFinished && !forceRetry) {
      return loadedCount > 0;
    }

    if (forceRetry) {
      for (const audio of samples) {
        if (!audio) continue;

        try {
          audio.pause();
        } catch (_) {}
      }

      samples = new Array(16).fill(null);
      sampleReady = new Array(16).fill(false);

      loadedCount = 0;
    }

    loadingFinished = false;
    loadingError = "";

    loadingPromise = (async () => {
      try {
        const results = await Promise.all(
          WORDS.map((_, index) =>
            loadOneSample(index + 1)
          )
        );

        if (!results.every(Boolean)) {
          loadingError =
            "Some recorded MP3 files could not be loaded";
        }

        return results.some(Boolean);

      } catch (error) {
        loadingError =
          error.message || String(error);

        console.error(
          "Metronome voice loading failed:",
          error
        );

        return false;

      } finally {
        loadingFinished = true;
        loadingPromise = null;
        render();
      }
    })();

    render();

    return loadingPromise;
  }

  /* ============================================================
     INDEPENDENT VOICE PLAYBACK

     CRITICAL HIGH-BPM FIX

     Each count gets its own audio element.

     No shared currentAudio.
     No voicePlaying lock.
     No automatic stopping at every beat.
     No BPM-dependent speed acceleration.
     ============================================================ */

  function playRecorded(number, bpm) {
    if (!entitled || settings.volume <= 0) {
      return false;
    }

    const index = clamp(
      Math.round(Number(number) || 1),
      1,
      16
    ) - 1;

    if (!sampleReady[index] || !samples[index]) {
      return false;
    }

    // Independent playback instance.
    // The original sample stays available for later beats.

    const audio = samples[index].cloneNode(true);

    audio.volume =
      settings.volume / 100;

    preservePitch(audio);

    applySpeechSpeed(audio);

    const entry = {
      audio,
      cleaned: false
    };

    activeVoiceInstances.add(entry);

    const cleanup = () => {
      if (entry.cleaned) return;

      entry.cleaned = true;

      activeVoiceInstances.delete(entry);

      audio.removeEventListener(
        "ended",
        cleanup
      );

      audio.removeEventListener(
        "error",
        cleanup
      );
    };

    audio.addEventListener(
      "ended",
      cleanup
    );

    audio.addEventListener(
      "error",
      cleanup
    );

    try {
      const result = audio.play();

      if (
        result &&
        typeof result.catch === "function"
      ) {
        result.catch(error => {
          console.warn(
            "Voice playback failed:",
            error
          );

          cleanup();
        });
      }

      return true;

    } catch (error) {
      console.warn(
        "Voice playback failed:",
        error
      );

      cleanup();

      return false;
    }
  }

  /* ============================================================
     STOP ALL VOICE PLAYBACK

     Only stop when explicitly requested.

     Never stop an earlier count because a new beat occurs.
     ============================================================ */

  function stopAudio() {
    for (const entry of activeVoiceInstances) {
      try {
        entry.audio.pause();
        entry.audio.currentTime = 0;
      } catch (_) {}

      entry.cleaned = true;
    }

    activeVoiceInstances.clear();

    try {
      window.speechSynthesis?.cancel();
    } catch (_) {}
  }

  /* ============================================================
     VOICE SELECTOR
     ============================================================ */

  function renderVoiceChoice() {
    const select = $("voiceProvider");

    if (!select) return;

    select.replaceChildren();

    select.add(
      new Option(
        "Recorded voice (Microsoft Aria Neural)",
        "recorded"
      )
    );

    select.value = "recorded";
  }

  /* ============================================================
     UPDATE SETTINGS UI
     ============================================================ */

  function render() {
    const controls = $("voiceSettingsControls");

    if (!controls) return;

    renderVoiceChoice();

    const status = $("voicePlatinumGate");

    if (status) {
      if (!entitled) {
        status.textContent =
          "Spotify Premium + Platinum required for Voice Counting.";

      } else if (loadedCount === 16) {
        status.textContent =
          "Recorded voice ready: 16 counting samples loaded.";

      } else if (loadingPromise) {
        status.textContent =
          `Loading recorded voice samples (${loadedCount}/16)...`;

      } else if (loadedCount > 0) {
        status.textContent =
          `${loadedCount}/16 voice samples loaded.`;

      } else if (loadingFinished) {
        status.textContent =
          "Recorded voice unavailable. Check the MP3 folder.";

      } else {
        status.textContent =
          "Preparing recorded voice samples...";
      }
    }

    controls.classList.toggle(
      "metronome-platinum-locked",
      !entitled
    );

    controls
      .querySelectorAll("input, select, button")
      .forEach(element => {
        element.disabled = !entitled;
      });

    const toggle = $("voiceCountingToggle");

    if (toggle) {
      toggle.checked =
        entitled && settings.enabled;
    }

    const mode = controls.querySelector(
      `input[name="metronomeVoiceMode"][value="${settings.mode}"]`
    );

    if (mode) {
      mode.checked = true;
    }

    const fields = [
      ["volume", "voiceVolume", "%"],
      ["maxBpm", "voiceMaxBpm", " BPM"],
      ["speed", "voiceSpeechRate", "%"]
    ];

    for (const [key, id, suffix] of fields) {
      const input = $(id);

      const value = $(id + "Value");

      if (input) {
        if (key === "speed") {
          input.min = 100;
          input.max = 250;
        }

        input.value = settings[key];
      }

      if (value) {
        value.textContent =
          settings[key] + suffix;
      }
    }
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */

  const API = {
    refresh() {
      render();

      if (entitled && loadedCount < 16) {
        void loadSamples(true);
      }
    },

    setEnabled(value) {
      if (!entitled) return;

      settings.enabled = !!value;

      if (!settings.enabled) {
        stopAudio();
      }

      saveSettings();
      render();

      if (settings.enabled && loadedCount < 16) {
        void loadSamples(true);
      }
    },

    setMode(value) {
      if (!entitled) return;

      settings.mode =
        value === "only" ? "only" : "layer";

      saveSettings();
      render();
    },

    setVolume(value) {
      if (!entitled) return;

      settings.volume = numberSetting(
        value,
        0,
        100,
        DEFAULTS.volume
      );

      for (const entry of activeVoiceInstances) {
        entry.audio.volume =
          settings.volume / 100;
      }

      saveSettings();
      render();
    },

    setMaxBpm(value) {
      if (!entitled) return;

      settings.maxBpm = numberSetting(
        value,
        60,
        280,
        DEFAULTS.maxBpm
      );

      saveSettings();
      render();
    },

    setSpeed(value) {
      if (!entitled) return;

      settings.speed = numberSetting(
        value,
        MIN_SPEECH_SPEED,
        MAX_SPEECH_SPEED,
        DEFAULTS.speed
      );

      saveSettings();
      render();
    },

    setVoice() {
      if (!entitled) return;

      settings.voiceURI = "recorded";

      saveSettings();
      render();
    },

    reset() {
      if (!entitled) return;

      stopAudio();

      settings = { ...DEFAULTS };

      saveSettings();
      render();
    },

    shouldPlayClicks(bpm) {
      return shouldPlayClicks(bpm);
    },

    onBeat(number, beatMode, bpm) {
      if (!withinVoiceRange(bpm)) {
        return false;
      }

      if (beatMode === "off") {
        return false;
      }

      if (settings.volume <= 0) {
        return false;
      }

      return playRecorded(number, bpm);
    },

    prepareStart() {
      if (!entitled || !settings.enabled) {
        return;
      }

      if (loadedCount < 16) {
        void loadSamples();
      }
    },

    stop() {
      stopAudio();
    },

    async test() {
      if (!entitled) return;

      if (loadedCount < 16) {
        await loadSamples(true);
      }

      stopAudio();

      const bpm =
        Number($("bpmInput")?.value) || 100;

      playRecorded(1, bpm);
    }
  };

  /* ============================================================
     INITIALIZATION
     ============================================================ */

  window.MetronomeVoice = API;

  loadSettings();

  render();

  window.addEventListener(
    "pagehide",
    stopAudio
  );

  if (entitled) {
    void loadSamples();
  }

})();
