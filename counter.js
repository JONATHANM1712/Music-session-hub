
"use strict";

/* ==================================================
   MUSIC SESSION HUB
   COUNTER + COUNTDOWN TIMER

   Features:
   - 100 colored squares
   - Main Style digit counter
   - Local storage
   - Visible blinking cursor
   - Ctrl+A protection
   - Accidental full deletion protection
   - Automatic timer start
   - Run / Stop / Reset
   - Spotify Free / Premium / Platinum
   - Main Style synchronization

   This file is for counter.html only.
   Do not replace the dashboard script.js.
   ================================================== */


/* ==================================================
   STORAGE CONFIGURATION
   ================================================== */

const COUNTER_STORAGE_KEY =
  "musicSessionHub.counter.input.v1";

const MAX_STYLES = 100;


/* ==================================================
   DIGIT COLORS
   ================================================== */

const digitColors = {
  "1": "#ff0909",
  "2": "#ffa500",
  "3": "#ffff00",
  "4": "#29cc2e",
  "5": "#0909ff",
  "6": "#8000ff",
  "7": "#ffc0cb",
  "8": "#a52a2a",
  "9": "#d2b48c",
  "0": "#00f5f5"
};


/* ==================================================
   SPOTIFY PLAN CONFIGURATION
   ================================================== */

const musicPlan =
  window.MUSIC_SESSION_PLAN || {};

const isPremium =
  musicPlan.SPOTIFY_PREMIUM === true;

const isPlatinum =
  isPremium &&
  musicPlan.PLATINUM === true;

const SESSION_MINUTES = !isPremium
  ? 90
  : isPlatinum
    ? 150
    : 120;

const SESSION_COLOR = !isPremium
  ? "#b3b3b3"
  : isPlatinum
    ? "#f3ff46"
    : "#1ed760";

const SESSION_NAME = !isPremium
  ? "Spotify Free"
  : isPlatinum
    ? "Spotify Premium + Platinum"
    : "Spotify Premium";


/* ==================================================
   DOM REFERENCES
   ================================================== */

const input =
  document.getElementById("inputData");

const inputDisplay =
  document.getElementById("inputDisplay");

const squareGrid =
  document.getElementById("squareGrid");

const timerRoot =
  document.getElementById("sessionTimer");

const timerPlan =
  document.getElementById("sessionTimerPlan");

const timerStatus =
  document.getElementById("sessionTimerStatus");

const timerClock =
  document.getElementById("sessionTimerClock");

const timerToggle =
  document.getElementById("sessionTimerToggle");

const timerReset =
  document.getElementById("sessionTimerReset");


/* ==================================================
   COUNTER STATE
   ================================================== */

let previousInput = "";

let counterReady = false;


/* ==================================================
   TIMER STATE
   ================================================== */

const TIMER_DURATION =
  SESSION_MINUTES * 60 * 1000;

let timerRemaining =
  TIMER_DURATION;

let timerRunning = false;

let timerDeadline = 0;

let timerInterval = null;

let timerHasStarted = false;


/* ==================================================
   FOCUS COUNTER INPUT

   The real input remains hidden.
   The visible display shows the blinking cursor.
   ================================================== */

function focusInput() {
  if (!input) {
    return;
  }

  input.focus({
    preventScroll: true
  });

  /* Always position the hidden caret
     at the end of the counter digits. */

  const end =
    input.value.length;

  input.setSelectionRange(
    end,
    end
  );

  if (inputDisplay) {
    inputDisplay.classList.add(
      "is-focused"
    );
  }
}

window.focusInput = focusInput;


/* ==================================================
   VISIBLE CURSOR + INPUT PROTECTION
   ================================================== */

function initializeCounterInputProtection() {
  if (!input || !inputDisplay) {
    return;
  }

  /* Show blinking cursor on focus. */

  input.addEventListener(
    "focus",
    () => {
      inputDisplay.classList.add(
        "is-focused"
      );
    }
  );

  /* Hide blinking cursor on blur. */

  input.addEventListener(
    "blur",
    () => {
      inputDisplay.classList.remove(
        "is-focused"
      );
    }
  );

  /* Prevent Ctrl+A / Cmd+A from selecting
     all digits in the hidden input. */

  input.addEventListener(
    "keydown",
    event => {
      const isSelectAll =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "a";

      if (isSelectAll) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      /* Keep the caret at the end after
         normal typing, without interfering
         with Backspace or Delete. */

      if (
        event.key === "Home" ||
        event.key === "End"
      ) {
        return;
      }
    }
  );

  /* Prevent accidental text selection
     on the visible white input area. */

  inputDisplay.addEventListener(
    "mousedown",
    event => {
      event.preventDefault();
      focusInput();
    }
  );

  /* Support touch screens. */

  inputDisplay.addEventListener(
    "touchstart",
    () => {
      focusInput();
    },
    {
      passive: true
    }
  );

  /* Protect against replacing all
     digits through an accidental
     full-selection paste or typing. */

  input.addEventListener(
    "beforeinput",
    event => {
      const hasText =
        input.value.length > 0;

      const wholeInputSelected =
        hasText &&
        input.selectionStart === 0 &&
        input.selectionEnd === input.value.length;

      const isReplacement =
        event.inputType === "insertText" ||
        event.inputType === "insertFromPaste";

      if (
        wholeInputSelected &&
        isReplacement
      ) {
        event.preventDefault();

        focusInput();
      }
    }
  );

  /* Prevent Ctrl+A from selecting the
     entire page while the visible counter
     area is the active interaction. */

  document.addEventListener(
    "keydown",
    event => {
      const isSelectAll =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "a";

      if (
        isSelectAll &&
        document.activeElement === input
      ) {
        event.preventDefault();
      }
    }
  );
}


/* ==================================================
   CREATE 100 COLORED SQUARES
   ================================================== */

function createGrid() {
  if (!squareGrid) {
    return;
  }

  squareGrid.innerHTML = "";

  for (
    let group = 0;
    group < 20;
    group++
  ) {
    const groupElement =
      document.createElement("div");

    groupElement.className =
      "square-group";

    for (
      let index = 0;
      index < 5;
      index++
    ) {
      const square =
        document.createElement("div");

      const squareIndex =
        group * 5 + index;

      square.className =
        "square";

      square.id =
        "sq" + squareIndex;

      groupElement.appendChild(
        square
      );
    }

    squareGrid.appendChild(
      groupElement
    );
  }
}


/* ==================================================
   UPDATE COUNTER
   ================================================== */

function updateCounter() {
  if (!input || !inputDisplay) {
    return;
  }

  let rawText =
    input.value.replace(
      /[^0-9]/g,
      ""
    );

  rawText =
    rawText.substring(
      0,
      MAX_STYLES
    );

  input.value =
    rawText;

  const formattedText =
    rawText.match(/.{1,5}/g)
      ?.join(" ") || "";

  inputDisplay.textContent =
    formattedText ||
    "Example: 11111 22222 23333 33333";

  /* ========================================
     COUNT DIGITS
     ======================================== */

  const counts = {
    "0": 0,
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
    "6": 0,
    "7": 0,
    "8": 0,
    "9": 0
  };

  for (const digit of rawText) {
    counts[digit]++;
  }

  /* ========================================
     UPDATE COLORED SQUARES
     ======================================== */

  for (
    let i = 0;
    i < MAX_STYLES;
    i++
  ) {
    const square =
      document.getElementById(
        "sq" + i
      );

    if (!square) {
      continue;
    }

    square.style.background =
      i < rawText.length
        ? digitColors[rawText[i]]
        : "rgba(255,255,255,0.14)";
  }

  /* ========================================
     UPDATE MAIN STYLE QUANTITIES
     ======================================== */

  for (
    const digit of Object.keys(counts)
  ) {
    const countElement =
      document.getElementById(
        "count" + digit
      );

    if (countElement) {
      countElement.textContent =
        counts[digit];
    }
  }

  /* ========================================
     SAVE COUNTER
     ======================================== */

  try {
    localStorage.setItem(
      COUNTER_STORAGE_KEY,
      rawText
    );
  } catch (error) {
    console.warn(
      "Unable to save counter:",
      error
    );
  }

  /* ========================================
     AUTOMATIC TIMER START

     Only when a new style is entered.
     Does not start during saved-data restore.
     Does not restart after manual pause.
     ======================================== */

  if (
    counterReady &&
    rawText.length > previousInput.length &&
    !timerHasStarted &&
    timerRemaining === TIMER_DURATION
  ) {
    startTimer();
  }

  previousInput =
    rawText;

  /* ========================================
     MAINTAIN VISIBLE CURSOR
     ======================================== */

  if (
    document.activeElement === input
  ) {
    inputDisplay.classList.add(
      "is-focused"
    );
  }

  /* ========================================
     NOTIFY PARENT PAGE
     ======================================== */

  notifyCounterUpdated();
}

window.updateCounter = updateCounter;


/* ==================================================
   CLEAR COUNTER
   ================================================== */

function resetCounter() {
  const confirmed =
    window.confirm(
      "Are you sure you want to clear the results?"
    );

  if (!confirmed) {
    return;
  }

  if (input) {
    input.value = "";
  }

  updateCounter();

  focusInput();
}

window.resetCounter = resetCounter;


/* ==================================================
   TIMER FORMAT — MM:SS
   ================================================== */

function formatTimer(milliseconds) {
  const seconds =
    Math.ceil(
      Math.max(
        0,
        milliseconds
      ) / 1000
    );

  const minutes =
    Math.floor(
      seconds / 60
    );

  const remainingSeconds =
    seconds % 60;

  return (
    String(minutes) +
    ":" +
    String(remainingSeconds)
      .padStart(2, "0")
  );
}


/* ==================================================
   RENDER TIMER
   ================================================== */

function renderTimer() {
  if (!timerClock || !timerToggle) {
    return;
  }

  timerClock.textContent =
    formatTimer(timerRemaining);

  timerToggle.textContent =
    timerRunning
      ? "■ Stop"
      : "▶ Run";
}


/* ==================================================
   STOP TIMER
   ================================================== */

function stopTimer() {
  if (timerRunning) {
    timerRemaining =
      Math.max(
        0,
        timerDeadline - Date.now()
      );
  }

  timerRunning = false;

  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  renderTimer();
}


/* ==================================================
   TIMER TICK
   ================================================== */

function timerTick() {
  if (!timerRunning) {
    return;
  }

  timerRemaining =
    Math.max(
      0,
      timerDeadline - Date.now()
    );

  if (timerRemaining <= 0) {
    stopTimer();

    timerStatus.textContent =
      "Session complete · Time limit reached";

    renderTimer();

    return;
  }

  renderTimer();
}


/* ==================================================
   START / RESUME TIMER
   ================================================== */

function startTimer() {
  if (timerRunning) {
    return;
  }

  if (timerRemaining <= 0) {
    timerRemaining =
      TIMER_DURATION;
  }

  timerRunning = true;

  timerHasStarted = true;

  timerDeadline =
    Date.now() + timerRemaining;

  if (timerInterval !== null) {
    clearInterval(timerInterval);
  }

  timerInterval =
    setInterval(
      timerTick,
      250
    );

  timerStatus.textContent =
    "Session running";

  renderTimer();
}


/* ==================================================
   RESET TIMER
   ================================================== */

function resetTimer() {
  stopTimer();

  timerRemaining =
    TIMER_DURATION;

  timerDeadline = 0;

  timerHasStarted = false;

  timerStatus.textContent =
    "Ready · Enter a style to start";

  renderTimer();
}


/* ==================================================
   INITIALIZE TIMER BUTTONS
   ================================================== */

function initializeTimerButtons() {
  if (timerToggle) {
    timerToggle.addEventListener(
      "click",
      () => {
        if (timerRunning) {
          stopTimer();

          timerStatus.textContent =
            "Paused";
        } else {
          startTimer();
        }
      }
    );
  }

  if (timerReset) {
    timerReset.addEventListener(
      "click",
      resetTimer
    );
  }
}


/* ==================================================
   INITIALIZE TIMER
   ================================================== */

function initializeTimer() {
  if (
    !timerRoot ||
    !timerPlan ||
    !timerStatus
  ) {
    return;
  }

  timerRoot.style.backgroundColor =
    SESSION_COLOR;

  timerPlan.textContent =
    SESSION_NAME +
    " · " +
    SESSION_MINUTES +
    " minutes";

  timerRemaining =
    TIMER_DURATION;

  timerStatus.textContent =
    "Ready · Enter a style to start";

  renderTimer();

  initializeTimerButtons();
}


/* ==================================================
   READ MAIN STYLE LIST

   Style names are read directly from
   the table in counter.html.
   ================================================== */

function getMainStyles() {
  const left = [];
  const right = [];

  const colors = [
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "violet",
    "pink",
    "brown",
    "tan",
    "cyan"
  ];

  document
    .querySelectorAll(
      ".style-table tr"
    )
    .forEach(row => {
      const cells =
        row.querySelectorAll("td");

      if (cells.length !== 4) {
        return;
      }

      const leftCell =
        cells[0];

      const rightCell =
        cells[2];

      const leftColor =
        colors.find(
          color =>
            leftCell.classList.contains(
              color
            )
        );

      const rightColor =
        colors.find(
          color =>
            rightCell.classList.contains(
              color
            )
        );

      if (leftColor) {
        left.push({
          name:
            leftCell.textContent.trim(),
          color:
            leftColor
        });
      }

      if (rightColor) {
        right.push({
          name:
            rightCell.textContent.trim(),
          color:
            rightColor
        });
      }
    });

  return {
    left,
    right
  };
}


/* ==================================================
   SEND MAIN STYLE LIST
   ================================================== */

function sendMainStyles(target) {
  if (!target) {
    return;
  }

  const styles =
    getMainStyles();

  target.postMessage(
    {
      type:
        "music-session-main-styles",
      left:
        styles.left,
      right:
        styles.right
    },
    "*"
  );
}


/* ==================================================
   NOTIFY COUNTER UPDATED
   ================================================== */

function notifyCounterUpdated() {
  if (
    window.parent === window
  ) {
    return;
  }

  window.parent.postMessage(
    {
      type:
        "music-session-counter-updated"
    },
    "*"
  );
}


/* ==================================================
   MESSAGE LISTENER
   ================================================== */

function initializeMessages() {
  window.addEventListener(
    "message",
    event => {
      if (
        event.source !== window.parent ||
        window.parent === window
      ) {
        return;
      }

      if (
        event.data?.type ===
        "request-music-session-main-styles"
      ) {
        sendMainStyles(
          event.source
        );
      }
    }
  );
}


/* ==================================================
   RESTORE SAVED COUNTER
   ================================================== */

function initializeCounter() {
  createGrid();

  counterReady = false;

  try {
    const savedCounter =
      localStorage.getItem(
        COUNTER_STORAGE_KEY
      );

    if (savedCounter !== null) {
      input.value =
        savedCounter;
    }
  } catch (error) {
    console.warn(
      "Unable to restore counter:",
      error
    );
  }

  updateCounter();

  previousInput =
    input.value;

  counterReady = true;

  /* Focus input and activate
     the blinking cursor. */

  focusInput();

  if (inputDisplay) {
    inputDisplay.classList.add(
      "is-focused"
    );
  }
}


/* ==================================================
   INITIALIZE APPLICATION
   ================================================== */

function initializeApp() {
  initializeTimer();

  initializeMessages();

  /* Install cursor listeners before
     focusing the hidden input. */

  initializeCounterInputProtection();

  initializeCounter();

  if (
    window.parent !== window
  ) {
    sendMainStyles(
      window.parent
    );
  }
}


/* ==================================================
   DOCUMENT READY
   ================================================== */

if (
  document.readyState === "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initializeApp
  );
} else {
  initializeApp();
}
