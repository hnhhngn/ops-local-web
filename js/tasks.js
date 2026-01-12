/**
 * Task Management Logic
 * Handles CRUD operations for tasks using the Local Server API
 */

const API_URL = "/api/data?file=tasks.json";
let allTasks = [];
let editingTaskId = null;

document.addEventListener("DOMContentLoaded", () => {
  loadTasks();

  loadTasks();

  const form = document.getElementById("task-form");
  if (form) {
    form.addEventListener("submit", handleFormSubmit);
  }

  // Modal Event Listeners
  const openModalBtn = document.getElementById("btn-open-modal");
  const closeModalBtn = document.getElementById("btn-close-modal");
  const modalOverlay = document.getElementById("modal-overlay");

  if (openModalBtn) {
    openModalBtn.addEventListener("click", () => {
      openForAdd();
    });
  }

  // Remove local close listener as Manager handles it
});

// Modal Logic replaced by Shared Manager
function openForAdd() {
  editingTaskId = null;
  window.currentQas = [];
  window.currentBugs = [];

  window.modalManager.open('task', 'THÊM CÔNG VIỆC MỚI', handleFormSubmit, (modalBody) => {
    populateParentDropdown(modalBody);
    setupItemBuilders(modalBody);
  });
}


/**
 * Fetch tasks from the server
 */
async function loadTasks() {
  try {
    allTasks = await window.opsApi.getAll("tasks.json");
    renderTasks();
  } catch (error) {
    console.error("Error loading tasks:", error);
    alert("Không thể tải danh sách công việc.");
  }
}

/**
 * Render task list into the table
 */
function renderTasks() {
  const tbody = document.getElementById("task-list-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  // Build tree structure
  const taskMap = {};
  allTasks.forEach(t => taskMap[t.id] = t);

  const getLevel = (t) => {
    let level = 0;
    let curr = t;
    while (curr.parentId && taskMap[curr.parentId] && level < 4) {
      curr = taskMap[curr.parentId];
      level++;
    }
    return level;
  };

  // Helper to render a task and its children
  const renderRow = (task, level = 0) => {
    const tr = document.createElement("tr");
    const priorityClass = getPriorityClass(task.priority);
    const indent = "&nbsp;".repeat(level * 4);
    const prefix = level > 0 ? "┕ " : "";

    const qaCount = (task.qas || []).length;
    const bugCount = (task.bugs || []).length;

    tr.innerHTML = `
            <td>
                <span style="color: #888;">${indent}${prefix}</span>
                <strong>${task.name}</strong>
            </td>
            <td><span class="badge">${task.type}</span></td>
            <td><span class="badge ${priorityClass}">${task.priority}</span></td>
            <td>
                <div style="width: 80px; height: 8px; background: #eee; border: 1px solid #000; display: inline-block; vertical-align: middle;">
                    <div style="width: ${task.progress}%; height: 100%; background: var(--color-green);"></div>
                </div>
                <small>${task.progress}%</small>
            </td>
            <td>
                ${qaCount > 0 ? `<span class="badge gray mini" title="QA">📝 ${qaCount}</span>` : ""}
                ${bugCount > 0 ? `<span class="badge red mini" title="Bugs">🐛 ${bugCount}</span>` : ""}
            </td>
            <td><small>${task.startDate || ""} - ${task.endDate || ""}</small></td>
            <td class="action-btns">
                <button class="pixel-button yellow mini" onclick="editTask('${task.id}')">Sửa</button>
                <button class="pixel-button red mini" onclick="deleteTask('${task.id}')">Xóa</button>
            </td>
        `;
    tbody.appendChild(tr);

    // Render children
    const children = allTasks.filter(t => t.parentId === task.id);
    children.forEach(child => renderRow(child, level + 1));
  };

  // Render root tasks first
  const rootTasks = allTasks.filter(t => !t.parentId || !taskMap[t.parentId]);
  rootTasks.forEach(task => renderRow(task, 0));
}

/**
 * Handle form submission (Create or Update)
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const formData = {
    id: editingTaskId || "task-" + Date.now(),
    name: document.getElementById("name").value,
    parentId: document.getElementById("parentId").value || null,
    type: document.getElementById("type").value,
    priority: document.getElementById("priority").value,
    startDate: document.getElementById("startDate").value,
    endDate: document.getElementById("endDate").value,
    progress: parseInt(document.getElementById("progress").value) || 0,
    notes: document.getElementById("notes").value,
    qas: window.currentQas || [],
    bugs: window.currentBugs || [],
  };

  let updatedList;
  if (editingTaskId) {
    updatedList = allTasks.map((t) => (t.id === editingTaskId ? formData : t));
  } else {
    updatedList = [...allTasks, formData];
  }

  try {
    const success = await saveTasksToServer(updatedList);
    if (success) {
      allTasks = updatedList;
      editingTaskId = null;
      document.getElementById("task-form").reset();
      const submitBtn = document.querySelector("#task-form button[type='submit']");
      if (submitBtn) submitBtn.innerText = "LƯU CÔNG VIỆC";
      renderTasks();
      // Close modal via manager
      window.modalManager.close();

      // Reset editing state after success
      editingTaskId = null;
      // Close modal on success
    }
  } catch (error) {
    console.error("Error saving task:", error);
  }
}

/**
 * Save the entire task list to the JSON file
 */
async function saveTasksToServer(taskList) {
  return await window.opsApi.save("tasks.json", taskList);
}

/**
 * Fill form with task data for editing
 */
function editTask(id) {
  const task = allTasks.find((t) => t.id === id);
  if (!task) return;

  editingTaskId = id;
  window.currentQas = [...(task.qas || [])];
  window.currentBugs = [...(task.bugs || [])];

  window.modalManager.open('task', 'CẬP NHẬT CÔNG VIỆC', handleFormSubmit, (modalBody) => {
    populateParentDropdown(modalBody, id);
    setupItemBuilders(modalBody);

    document.getElementById("name").value = task.name;
    document.getElementById("parentId").value = task.parentId || "";
    document.getElementById("type").value = task.type;
    document.getElementById("priority").value = task.priority;
    document.getElementById("startDate").value = task.startDate || "";
    document.getElementById("endDate").value = task.endDate || "";
    document.getElementById("progress").value = task.progress;
    document.getElementById("notes").value = task.notes || "";

    // Render existing QA/Bugs
    renderItemLists(modalBody);

    const submitBtn = document.querySelector("#task-form button[type='submit']");
    if (submitBtn) submitBtn.innerText = "CẬP NHẬT CÔNG VIỆC";
  });
}

/**
 * Helper: Populate Parent Dropdown
 */
function populateParentDropdown(modalBody, excludeId = null) {
  const select = modalBody.querySelector("#parentId");
  if (!select) return;

  // Helper: Get all descendants IDs of a task (with cycle protection)
  const getDescendantIds = (rootId) => {
    const ids = new Set();
    const find = (pid) => {
      const children = allTasks.filter(t => t.parentId === pid);
      children.forEach(child => {
        if (!ids.has(child.id)) {
          ids.add(child.id);
          find(child.id);
        }
      });
    };
    find(rootId);
    return ids;
  };

  const descendants = excludeId ? getDescendantIds(excludeId) : new Set();

  allTasks.forEach(t => {
    if (t.id === excludeId) return; // Avoid self-parenting
    if (descendants.has(t.id)) return; // Avoid cycle (can't be your own grandfather)

    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    select.appendChild(opt);
  });
}

/**
 * Helper: Setup QA/Bug Builders (Similar to Dashboard)
 */
function setupItemBuilders(modalBody) {
  const setup = (btnId, labelId, linkId, listId, store) => {
    const btn = modalBody.querySelector(btnId);
    if (!btn) return;
    btn.onclick = () => {
      const label = modalBody.querySelector(labelId).value.trim();
      const link = modalBody.querySelector(linkId).value.trim();
      if (label) {
        store.push({ id: Date.now().toString(), label, link });
        renderItemLists(modalBody);
        modalBody.querySelector(labelId).value = "";
        modalBody.querySelector(linkId).value = "";
      }
    };
  };

  setup("#btnAddQa", "#qaLabel", "#qaLink", "#qa-list", window.currentQas);
  setup("#btnAddBug", "#bugLabel", "#bugLink", "#bug-list", window.currentBugs);
}

/**
 * Helper: Render QA/Bug Lists in Modal
 */
function renderItemLists(modalBody) {
  const renderList = (listId, items, store) => {
    const list = modalBody.querySelector(listId);
    if (!list) return;
    list.innerHTML = "";
    items.forEach((item, idx) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${item.label}</span>
        <div>
          ${item.link ? `<a class="item-link" href="${item.link}" target="_blank">🔗</a>` : ""}
          <button type="button" class="btn-remove-item" onclick="removeItem('${listId}', ${idx})">×</button>
        </div>
      `;
      list.appendChild(li);
    });
  };

  renderList("#qa-list", window.currentQas);
  renderList("#bug-list", window.currentBugs);

  // Global helper for remove button (needs to be on window to be callable from onclick string)
  window.removeItem = (listId, idx) => {
    if (listId === "#qa-list") window.currentQas.splice(idx, 1);
    else window.currentBugs.splice(idx, 1);
    renderItemLists(modalBody);
  };
}

/**
 * Delete a task
 */
async function deleteTask(id) {
  if (!confirm("Bạn có chắc chắn muốn xóa công việc này?")) return;

  const updatedList = allTasks.filter((t) => t.id !== id);
  const success = await saveTasksToServer(updatedList);
  if (success) {
    allTasks = updatedList;
    renderTasks();
  }
}

/**
 * Helper to get priority CSS class
 */
function getPriorityClass(p) {
  if (p === "high") return "red";
  if (p === "medium") return "blue";
  return "";
}
