/**
 * Task Management Logic
 * Handles CRUD operations for tasks using the Local Server API
 */

const API_URL = "/api/data?file=tasks.json";
let allTasks = [];
let editingTaskId = null;

document.addEventListener("DOMContentLoaded", () => {
  loadTasks();

  const form = document.getElementById("task-form");
  if (form) {
    form.addEventListener("submit", handleFormSubmit);
  }
});

/**
 * Fetch tasks from the server
 */
async function loadTasks() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error("Failed to fetch tasks");
    }
    const data = await response.json();
    // Normalize to array if it's not (though server should handle it)
    allTasks = Array.isArray(data) ? data : [];
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

  allTasks.forEach((task) => {
    const tr = document.createElement("tr");

    // Format priority badge
    const priorityClass = getPriorityClass(task.priority);

    tr.innerHTML = `
            <td><strong>${task.name}</strong></td>
            <td><span class="badge">${task.type}</span></td>
            <td><span class="badge ${priorityClass}">${task.priority}</span></td>
            <td>
                <div style="width: 100px; height: 10px; background: #eee; border: 1px solid #000;">
                    <div style="width: ${task.progress}%; height: 100%; background: var(--color-green);"></div>
                </div>
                ${task.progress}%
            </td>
            <td>${task.startDate || ""} - ${task.endDate || ""}</td>
            <td class="action-btns">
                <button class="pixel-button yellow mini" onclick="editTask('${task.id}')">Sửa</button>
                <button class="pixel-button red mini" onclick="deleteTask('${task.id}')">Xóa</button>
            </td>
        `;
    tbody.appendChild(tr);
  });
}

/**
 * Handle form submission (Create or Update)
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const formData = {
    id: editingTaskId || "task-" + Date.now(),
    name: document.getElementById("name").value,
    type: document.getElementById("type").value,
    priority: document.getElementById("priority").value,
    startDate: document.getElementById("startDate").value,
    endDate: document.getElementById("endDate").value,
    progress: parseInt(document.getElementById("progress").value) || 0,
    notes: document.getElementById("notes").value,
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
    }
  } catch (error) {
    console.error("Error saving task:", error);
  }
}

/**
 * Save the entire task list to the JSON file
 */
async function saveTasksToServer(taskList) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskList),
    });

    if (!response.ok) {
      throw new Error("Save failed");
    }
    return true;
  } catch (error) {
    alert("Lỗi khi lưu dữ liệu!");
    return false;
  }
}

/**
 * Fill form with task data for editing
 */
function editTask(id) {
  const task = allTasks.find((t) => t.id === id);
  if (!task) return;

  editingTaskId = id;
  document.getElementById("name").value = task.name;
  document.getElementById("type").value = task.type;
  document.getElementById("priority").value = task.priority;
  document.getElementById("startDate").value = task.startDate || "";
  document.getElementById("endDate").value = task.endDate || "";
  document.getElementById("progress").value = task.progress;
  document.getElementById("notes").value = task.notes || "";

  const submitBtn = document.querySelector("#task-form button[type='submit']");
  if (submitBtn) submitBtn.innerText = "CẬP NHẬT CÔNG VIỆC";

  window.scrollTo({ top: 0, behavior: "smooth" });
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
