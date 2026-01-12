/**
 * Quick Access Management Logic
 */

const API_DATA_URL = "/api/data?file=links.json";
const API_LAUNCH_URL = "/api/launch";
let allLinks = [];
let editingLinkId = null;

document.addEventListener("DOMContentLoaded", () => {
  loadLinks();

  const form = document.getElementById("link-form");
  if (form) {
    form.addEventListener("submit", handleFormSubmit);
  }

  // Handle launch clicks safely using event delegation
  const tbody = document.getElementById("link-list-body");
  if (tbody) {
    tbody.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-launch");
      if (btn) {
        const path = btn.getAttribute("data-path");
        if (path) launchResource(path);
      }
    });
  }

  // Modal Event Listeners
  const openModalBtn = document.getElementById("btn-open-modal");
  const closeModalBtn = document.getElementById("btn-close-modal");

  if (openModalBtn) {
    openModalBtn.addEventListener("click", () => {
      openForAdd();
    });
  }

  // Close logic handled by Manager
});

// Modal Logic Replaced by Manager
function openForAdd() {
  editingLinkId = null;
  window.modalManager.open('link', 'THÊM ĐƯỜNG DẪN MỚI', handleFormSubmit);
}

function closeModal() {
  const modalOverlay = document.getElementById("modal-overlay");
  modalOverlay.classList.add("hidden");
  editingLinkId = null;
}

/**
 * Fetch links from the server
 */
async function loadLinks() {
  try {
    allLinks = await window.opsApi.getAll("links.json");
    renderLinks();
  } catch (error) {
    console.error("Error loading links:", error);
  }
}

/**
 * Render links table
 */
function renderLinks() {
  const tbody = document.getElementById("link-list-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  allLinks.forEach((link) => {
    const tr = document.createElement("tr");

    const icon = getTypeIcon(link.type);

    tr.innerHTML = `
            <td><strong>${link.label}</strong></td>
            <td>${icon} ${(link.type || 'url').toUpperCase()}</td>
            <td><div class="path-display" title="${link.path}">${link.path}</div></td>
            <td><span class="badge blue">${link.group || "Chung"}</span></td>
            <td class="action-btns">
                <button class="pixel-button green mini btn-launch" data-path="${link.path}">Mở</button>
                <button class="pixel-button yellow mini" onclick="editLink('${link.id}')">Sửa</button>
                <button class="pixel-button red mini" onclick="deleteLink('${link.id}')">Xóa</button>
            </td>
        `;
    tbody.appendChild(tr);
  });
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const formData = {
    id: editingLinkId || "link-" + Date.now(),
    label: document.getElementById("label").value,
    path: document.getElementById("path").value,
    type: document.getElementById("type").value,
    group: document.getElementById("group").value || "Chung",
  };

  let updatedList;
  if (editingLinkId) {
    updatedList = allLinks.map((l) => (l.id === editingLinkId ? formData : l));
  } else {
    updatedList = [...allLinks, formData];
  }

  const success = await saveLinksToServer(updatedList);
  if (success) {
    allLinks = updatedList;
    editingLinkId = null;
    document.getElementById("link-form").reset();
    const btn = document.querySelector("#link-form button[type='submit']");
    if (btn) btn.innerText = "LƯU ĐƯỜNG DẪN";
    renderLinks();
    closeModal();
  }
}

/**
 * Save to server
 */
async function saveLinksToServer(list) {
  return await window.opsApi.save("links.json", list);
}

/**
 * Trigger local launch
 */
async function launchResource(path) {
  window.opsApi.launch(path);
}

/**
 * Edit mode
 */
function editLink(id) {
  const link = allLinks.find((l) => l.id === id);
  if (!link) return;

  editingLinkId = id;

  window.modalManager.open('link', 'CẬP NHẬT ĐƯỜNG DẪN', handleFormSubmit, () => {
    // Post render: fill data
    const labelEl = document.getElementById("label");
    if (labelEl) {
      labelEl.value = link.label;
      document.getElementById("path").value = link.path;
      document.getElementById("type").value = link.type;
      document.getElementById("group").value = link.group;

      const btn = document.querySelector("#link-form button[type='submit']");
      if (btn) btn.innerText = "CẬP NHẬT ĐƯỜNG DẪN";
    }
  });
}

/**
 * Delete
 */
async function deleteLink(id) {
  if (!confirm("Bạn có chắc chắn muốn xóa đường dẫn này?")) return;

  const updatedList = allLinks.filter((l) => l.id !== id);
  const success = await saveLinksToServer(updatedList);
  if (success) {
    // Close via manager
    window.modalManager.close();
    editingLinkId = null;
    renderLinks();
  }
}

function getTypeIcon(type) {
  switch (type) {
    case "url": return "🌐";
    case "folder": return "📁";
    case "file": return "📄";
    case "tool": return "🛠️";
    default: return "🔗";
  }
}
