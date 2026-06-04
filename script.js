function pageKey() {
  return "musicSessionChartFlow_" + (document.body.dataset.page || "default");
}

function saveAll() {
  const data = {};

  document.querySelectorAll("[data-save]").forEach((element) => {
    if (element.id) {
      data[element.id] = element.value;
    }
  });

  localStorage.setItem(pageKey(), JSON.stringify(data));
}

function loadAll() {
  const saved = localStorage.getItem(pageKey());

  if (saved) {
    const data = JSON.parse(saved);

    Object.keys(data).forEach((id) => {
      const element = document.getElementById(id);

      if (element) {
        element.value = data[id];
      }
    });
  }

  applyColors();
}

function applyColors() {
  document.querySelectorAll("[data-color-target]").forEach((picker) => {
    const targetId = picker.dataset.colorTarget;
    const target = document.getElementById(targetId);

    if (target) {
      target.style.backgroundColor = picker.value;
    }
  });
}

function resetPage() {
  const confirmDelete = confirm("Hapus semua data di halaman ini?");

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

document.addEventListener("DOMContentLoaded", () => {
  loadAll();

  document.querySelectorAll("[data-save]").forEach((element) => {
    element.addEventListener("input", () => {
      applyColors();
      saveAll();
    });

    element.addEventListener("change", () => {
      applyColors();
      saveAll();
    });
  });
});