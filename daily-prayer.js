
(() => {
  "use strict";

  // ==========================================
  // MUSIC SESSION HUB - DAILY PRAYER
  // FIVE PAGE NAVIGATION
  // ==========================================

  const slides = [
    ...document.querySelectorAll(".prayer-slide")
  ];

  const bar = document.querySelector("#prayer-progress");
  const count = document.querySelector("#prayer-count");
  const prev = document.querySelector("#prayer-prev");
  const next = document.querySelector("#prayer-next");
  const stage = document.querySelector(".prayer-stage");

  const duration = document.querySelector(
    "#prayer-duration"
  );

  const total = document.querySelector(
    "#prayer-total"
  );

  if (
    !slides.length ||
    !bar ||
    !count ||
    !prev ||
    !next ||
    !stage
  ) {
    console.warn(
      "Daily Prayer: elemen halaman tidak lengkap."
    );
    return;
  }

  let index = 0;
  let touchX = 0;
  let touchY = 0;
  let resizeFrame = null;

  const MIN_FONT = 9;
  const FONT_STEP = 0.25;

  const minutes = slides.map(slide => {
    const value = Number(slide.dataset.minutes);

    return Number.isFinite(value) && value > 0
      ? value
      : 0;
  });

  const totalMinutes = minutes.reduce(
    (sum, value) => sum + value,
    0
  );

  if (total) {
    total.textContent =
      `Total ±${totalMinutes} menit`;
  }

  // ==========================================
  // CREATE FIVE PROGRESS BARS
  // ==========================================

  bar.innerHTML = "";

  slides.forEach((slide, i) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "prayer-progress-item";

    button.setAttribute(
      "aria-label",
      `Buka doa ${i + 1} dari ${slides.length}`
    );

    const line = document.createElement("span");
    button.appendChild(line);

    button.addEventListener("click", () => {
      show(i);
    });

    bar.appendChild(button);
  });

  const dots = [...bar.children];

  // ==========================================
  // CHECK CONTENT HEIGHT
  // ==========================================

  function contentFits(panel, inner) {
    const style = getComputedStyle(panel);

    const paddingTop =
      parseFloat(style.paddingTop) || 0;

    const paddingBottom =
      parseFloat(style.paddingBottom) || 0;

    const paddingLeft =
      parseFloat(style.paddingLeft) || 0;

    const paddingRight =
      parseFloat(style.paddingRight) || 0;

    const availableHeight =
      panel.clientHeight -
      paddingTop -
      paddingBottom;

    const availableWidth =
      panel.clientWidth -
      paddingLeft -
      paddingRight;

    return (
      inner.scrollHeight <= availableHeight + 1 &&
      inner.scrollWidth <= availableWidth + 1
    );
  }

  // ==========================================
  // AUTO FIT PRAYER TEXT
  // ==========================================

  function fit() {
    const panel = slides[index];
    if (!panel) return;

    const inner = panel.querySelector(
      ".prayer-slide-content"
    );

    const words = panel.querySelector(
      ".prayer-words"
    );

    if (!inner || !words) return;

    words.style.fontSize = "";
    words.style.lineHeight = "";
    words.style.removeProperty("--prayer-gap");

    const elements = words.querySelectorAll(
      "h1, h2, h3, h4, p"
    );

    elements.forEach(element => {
      element.style.marginTop = "";
      element.style.marginBottom = "";
      element.style.lineHeight = "";
    });

    // Page 5 scrolls independently.
    if (panel.classList.contains(
      "prayer-slide--long"
    )) {
      inner.scrollTop = 0;
      return;
    }

    let size = parseFloat(
      getComputedStyle(words).fontSize
    );

    if (!Number.isFinite(size)) {
      size = 16;
    }

    size = Math.min(size, 18);

    words.style.fontSize = `${size}px`;
    words.style.lineHeight = "1.18";
    words.style.setProperty(
      "--prayer-gap",
      "8px"
    );

    const gaps = [8, 6, 4, 2, 0];

    for (const gap of gaps) {
      words.style.setProperty(
        "--prayer-gap",
        `${gap}px`
      );

      if (contentFits(panel, inner)) {
        return;
      }
    }

    while (size > MIN_FONT) {
      size = Math.max(
        MIN_FONT,
        size - FONT_STEP
      );

      words.style.fontSize = `${size}px`;
      words.style.lineHeight = "1.12";

      if (contentFits(panel, inner)) {
        return;
      }
    }

    words.style.setProperty(
      "--prayer-gap",
      "0px"
    );

    words.style.lineHeight = "1.05";

    if (!contentFits(panel, inner)) {
      console.warn(
        `Doa ${index + 1} terlalu panjang.`
      );
    }
  }

  // ==========================================
  // DISPLAY SELECTED PRAYER
  // ==========================================

  function show(page) {
    index = Math.max(
      0,
      Math.min(slides.length - 1, page)
    );

    slides.forEach((slide, i) => {
      const active = i === index;

      slide.hidden = !active;

      slide.classList.toggle(
        "is-active",
        active
      );

      slide.setAttribute(
        "aria-hidden",
        String(!active)
      );
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle(
        "past",
        i < index
      );

      dot.classList.toggle(
        "active",
        i === index
      );

      if (i === index) {
        dot.setAttribute(
          "aria-current",
          "step"
        );
      } else {
        dot.removeAttribute("aria-current");
      }
    });

    count.textContent =
      `${index + 1} / ${slides.length}`;

    if (duration) {
      duration.textContent =
        `Doa ${index + 1} · ±${minutes[index]} menit`;
    }

    prev.disabled = index === 0;

    // The final button remains clickable.
    next.disabled = false;

    next.textContent =
      index === slides.length - 1
        ? "Selesai ✓"
        : "Berikutnya →";

    requestAnimationFrame(fit);
  }

  // ==========================================
  // PREVIOUS BUTTON
  // ==========================================

  prev.addEventListener("click", () => {
    show(index - 1);
  });

  // ==========================================
  // NEXT / FINISH BUTTON
  // ==========================================

  next.addEventListener("click", () => {
    if (index === slides.length - 1) {
      // Return to the Music Session Hub homepage.
      window.location.href = "index.html";
      return;
    }

    show(index + 1);
  });

  // ==========================================
  // KEYBOARD NAVIGATION
  // ==========================================

  document.addEventListener(
    "keydown",
    event => {
      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (
          target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(
            target.tagName
          )
        )
      ) {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        show(index + 1);
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        show(index - 1);
      }
    }
  );

  // ==========================================
  // MOBILE SWIPE NAVIGATION
  // ==========================================

  stage.addEventListener(
    "touchstart",
    event => {
      const touch = event.changedTouches[0];

      touchX = touch.screenX;
      touchY = touch.screenY;
    },
    { passive: true }
  );

  stage.addEventListener(
    "touchend",
    event => {
      const touch = event.changedTouches[0];

      const dx = touch.screenX - touchX;
      const dy = touch.screenY - touchY;

      if (
        Math.abs(dx) > 55 &&
        Math.abs(dx) > Math.abs(dy)
      ) {
        if (dx < 0) {
          show(index + 1);
        } else {
          show(index - 1);
        }
      }
    },
    { passive: true }
  );

  // ==========================================
  // RESPONSIVE REFITTING
  // ==========================================

  function refit() {
    if (resizeFrame !== null) {
      cancelAnimationFrame(resizeFrame);
    }

    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      fit();
    });
  }

  window.addEventListener("resize", refit);
  window.addEventListener("orientationchange", refit);
  window.addEventListener("load", refit);

  if (document.fonts) {
    document.fonts.ready.then(refit);
  }

  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(refit);
    observer.observe(stage);
  }

  // ==========================================
  // INITIALIZE
  // ==========================================

  show(0);
})();
