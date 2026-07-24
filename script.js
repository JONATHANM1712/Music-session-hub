function pageKey() {
  return (
    "musicSessionChartFlow_" +
    (document.body.dataset.page || "default")
  );
}

function activeResourceKey() {
  return "musicSessionActiveResource";
}

function saveAll() {
  const data = {};

  document.querySelectorAll("[data-save]").forEach((element) => {
    if (element.id) {
      data[element.id] = element.value;
    }
  });

  localStorage.setItem(
    pageKey(),
    JSON.stringify(data)
  );
}

function loadAll() {
  const saved = localStorage.getItem(pageKey());

  if (saved) {
    try {
      const data = JSON.parse(saved);

      Object.keys(data).forEach((id) => {
        const element = document.getElementById(id);

        if (element) {
          element.value = data[id];
        }
      });
    } catch (error) {
      console.error(
        "Unable to load saved Music Session data:",
        error
      );
    }
  }

  applyColors();
}

function applyColors() {
  document
    .querySelectorAll("[data-color-target]")
    .forEach((picker) => {
      const targetId = picker.dataset.colorTarget;
      const target = document.getElementById(targetId);

      if (target) {
        target.style.backgroundColor = picker.value;
      }
    });
}

function resetPage() {
  const confirmDelete = confirm(
    "Hapus semua data di halaman ini?"
  );

  if (!confirmDelete) {
    return;
  }

  localStorage.removeItem(pageKey());

  document.querySelectorAll("[data-save]").forEach((element) => {
    if (element.type !== "color") {
      element.value = "";
    }
  });

  saveAll();
  location.reload();
}

function setActiveResource(card, shouldScroll = true) {
  const resourceCards =
    document.querySelectorAll(".resource-card");

  const viewerTitle =
    document.getElementById("viewer-title");

  const viewerType =
    document.getElementById("viewer-type");

  const viewerDescription =
    document.getElementById("viewer-description");

  const viewerIcon =
    document.getElementById("viewer-icon");

  const resourceFrame =
    document.getElementById("resource-frame");

  const frameContainer =
    document.getElementById("resource-frame-container");

  const openButton =
    document.getElementById("viewer-open-button");

  const viewerSection =
    document.getElementById("resource-viewer");

  if (
    !card ||
    !viewerTitle ||
    !viewerType ||
    !viewerDescription ||
    !viewerIcon ||
    !resourceFrame ||
    !frameContainer ||
    !openButton
  ) {
    return;
  }

  const title =
    card.dataset.resourceTitle || "Music Session Resource";

  const type =
    card.dataset.resourceType || "Resource";

  const description =
    card.dataset.resourceDescription || "";

  const icon =
    card.dataset.resourceIcon || "📄";

  const previewUrl =
    card.dataset.resourceUrl || "";

  const newTabUrl =
    card.dataset.resourceNewTab || previewUrl;

  resourceCards.forEach((resourceCard) => {
    const isSelected = resourceCard === card;

    resourceCard.classList.toggle(
      "is-active",
      isSelected
    );

    resourceCard.setAttribute(
      "aria-pressed",
      String(isSelected)
    );
  });

  viewerTitle.textContent = title;
  viewerType.textContent = type;
  viewerDescription.textContent = description;
  viewerIcon.textContent = icon;

  resourceFrame.title =
    title + " read-only preview";

  openButton.href = newTabUrl;

  if (resourceFrame.src !== previewUrl) {
    frameContainer.classList.add("is-loading");
    resourceFrame.src = previewUrl;
  }

  localStorage.setItem(
    activeResourceKey(),
    previewUrl
  );

  if (shouldScroll && viewerSection) {
    viewerSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

function initializeResourceCards() {
  const resourceCards =
    document.querySelectorAll(".resource-card");

  resourceCards.forEach((card) => {
    card.addEventListener("click", () => {
      setActiveResource(card, true);
    });
  });

  const savedResourceUrl =
    localStorage.getItem(activeResourceKey());

  if (savedResourceUrl) {
    const savedCard = Array.from(resourceCards).find(
      (card) =>
        card.dataset.resourceUrl === savedResourceUrl
    );

    if (savedCard) {
      setActiveResource(savedCard, false);
      return;
    }
  }

  const firstCard =
    document.querySelector(".resource-card");

  if (firstCard) {
    setActiveResource(firstCard, false);
  }
}

function initializeViewerLoading() {
  const resourceFrame =
    document.getElementById("resource-frame");

  const frameContainer =
    document.getElementById("resource-frame-container");

  if (!resourceFrame || !frameContainer) {
    return;
  }

  frameContainer.classList.add("is-loading");

  resourceFrame.addEventListener("load", () => {
    frameContainer.classList.remove("is-loading");
  });
}

function initializeViewerToggle() {
  const toggleButton =
    document.getElementById("toggle-viewer-button");

  const frameContainer =
    document.getElementById("resource-frame-container");

  const viewerCard =
    document.querySelector(".viewer-card");

  if (
    !toggleButton ||
    !frameContainer ||
    !viewerCard
  ) {
    return;
  }

  toggleButton.addEventListener("click", () => {
    const isExpanded =
      toggleButton.getAttribute("aria-expanded") ===
      "true";

    const nextExpandedState = !isExpanded;

    toggleButton.setAttribute(
      "aria-expanded",
      String(nextExpandedState)
    );

    toggleButton.textContent =
      nextExpandedState
        ? "Hide Preview"
        : "Show Preview";

    frameContainer.classList.toggle(
      "is-collapsed",
      !nextExpandedState
    );

    viewerCard.classList.toggle(
      "preview-collapsed",
      !nextExpandedState
    );
  });
}

function initializeSmoothAnchorScrolling() {
  document
    .querySelectorAll('a[href^="#"]')
    .forEach((link) => {
      link.addEventListener("click", (event) => {
        const targetId =
          link.getAttribute("href");

        if (!targetId || targetId === "#") {
          return;
        }

        const target =
          document.querySelector(targetId);

        if (!target) {
          return;
        }

        event.preventDefault();

        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

        history.pushState(
          null,
          "",
          targetId
        );
      });
    });
}

document.addEventListener(
  "DOMContentLoaded",
  () => {
    loadAll();

    initializeViewerLoading();
    initializeResourceCards();
    initializeViewerToggle();
    initializeSmoothAnchorScrolling();

    document
      .querySelectorAll("[data-save]")
      .forEach((element) => {
        element.addEventListener(
          "input",
          () => {
            applyColors();
            saveAll();
          }
        );

        element.addEventListener(
          "change",
          () => {
            applyColors();
            saveAll();
          }
        );
      });
  }
);
