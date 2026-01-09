/* ============================== DASHBOARD GRID (OpsGrid) ============================== */

/**
 * Manages dashboard widget grid using OpsGrid library
 */
document.addEventListener("DOMContentLoaded", () => {
  const dashboard = document.getElementById("dashboard");
  let isEditing = false;
  let layoutSnapshot = null; // Store positions before editing

  // Visual preview ghost
  const ghost = document.createElement("div");
  ghost.className = "grid-ghost";
  dashboard.appendChild(ghost);

  // Initialize Library
  const opsGrid = new OpsGrid({
    container: dashboard,
    ghost: ghost,
    onLayoutChange: () => {
      console.log("Layout changed.");
    }
  });

  const widgetElements = Array.from(document.querySelectorAll(".pixel-widget"));

  /**
   * Load widget layout from backend
   */
  const loadLayout = async () => {
    try {
      const response = await fetch("/api/data?file=layout.json");
      if (!response.ok) return;
      const layout = await response.json();

      layout.forEach(item => {
        const widget = document.getElementById(item.id);
        if (widget) {
          widget.style.gridColumn = `${item.x1} / span ${item.w}`;
          widget.style.gridRow = `${item.y1} / span ${item.h}`;
          widget.dataset.w = item.w;
          widget.dataset.h = item.h;
        }
      });
      console.log("Layout loaded successfully.");
    } catch (err) {
      console.error("Failed to load layout:", err);
    }
  };

  /**
   * Save current widget layout to backend
   */
  const saveLayout = async () => {
    const layout = widgetElements.map(w => {
      const style = window.getComputedStyle(w);
      const x1 = parseInt(style.gridColumnStart) || 1;
      const y1 = parseInt(style.gridRowStart) || 1;
      const wSize = parseInt(w.dataset.w) || 8;
      const hSize = parseInt(w.dataset.h) || 6;

      return { id: w.id, x1, y1, w: wSize, h: hSize };
    });

    try {
      const response = await fetch("/api/data?file=layout.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(layout)
      });
      if (response.ok) console.log("Layout saved successfully.");
    } catch (err) {
      console.error("Failed to save layout:", err);
    }
  };

  // Initial load
  loadLayout();

  /* ============================== DASHBOARD TASK WIDGET ============================== */

  const dashboardTaskList = document.getElementById("dashboard-task-list");
  const quickTaskInput = document.getElementById("dashboard-quick-task-input");
  const quickTaskBtn = document.getElementById("dashboard-quick-task-btn");

  /**
   * Load tasks for dashboard display
   */
  const loadDashboardTasks = async () => {
    if (!dashboardTaskList) return;

    try {
      const response = await fetch("/api/data?file=tasks.json");
      if (!response.ok) return;
      const data = await response.json();
      const tasks = Array.isArray(data) ? data : (data ? [data] : []);
      renderDashboardTasks(tasks);
    } catch (err) {
      console.error("Dashboard task load error:", err);
    }
  };

  /**
   * Render tasks to dashboard widget (Top 8)
   */
  const renderDashboardTasks = (tasks) => {
    if (!dashboardTaskList) return;
    dashboardTaskList.innerHTML = "";

    const sortedTasks = [...tasks].sort((a, b) => {
      const p = { high: 3, medium: 2, low: 1 };
      return (p[b.priority] || 0) - (p[a.priority] || 0);
    }).slice(0, 8);

    sortedTasks.forEach((task) => {
      const li = document.createElement("li");
      li.className = "task-item";
      const priorityClass = task.priority === "high" ? "red" : (task.priority === "medium" ? "blue" : "");

      li.innerHTML = `
        <input type="checkbox" ${task.progress === 100 ? "checked" : ""}> 
        <span onclick="location.href='pages/tasks.html'" style="cursor:pointer">${task.name}</span>
        ${priorityClass ? `<span class="badge ${priorityClass}">${task.priority}</span>` : ""}
      `;
      dashboardTaskList.appendChild(li);
    });

    if (tasks.length === 0) {
      dashboardTaskList.innerHTML = '<li class="task-item">No tasks found</li>';
    }
  };

  /**
   * Handle Quick Add task from dashboard
   */
  if (quickTaskBtn) {
    quickTaskBtn.addEventListener("click", () => {
      // Open Modal with pre-filled name if typed
      const initialName = quickTaskInput.value.trim();

      window.modalManager.open('task', 'THÊM CÔNG VIỆC MỚI', async (e) => {
        // Handle Submit Logic (Duplicated from tasks.js effectively, or better, extracted to service)
        // For Phase 13, we'll implement a simple fetch here.
        e.preventDefault();
        const formData = new FormData(e.target);
        const task = {
          id: Date.now().toString(),
          name: formData.get("name"), // Use full form data
          type: document.getElementById("type").value,
          priority: document.getElementById("priority").value,
          startDate: document.getElementById("startDate").value,
          endDate: document.getElementById("endDate").value,
          progress: parseInt(document.getElementById("progress").value) || 0,
          notes: document.getElementById("notes").value
        };

        try {
          const allTasksResponse = await fetch("/api/data?file=tasks.json");
          const allTasks = await allTasksResponse.json();
          allTasks.push(task);

          await fetch("/api/data?file=tasks.json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(allTasks)
          });

          window.modalManager.close();
          loadDashboardTasks(); // Refresh widget
          quickTaskInput.value = "";
        } catch (err) {
          console.error(err);
          alert("Lỗi khi lưu task từ dashboard.");
        }
      }, (modalBody) => {
        // Pre-fill name from quick input
        if (initialName) {
          setTimeout(() => {
            const nameInput = modalBody.querySelector("#name");
            if (nameInput) nameInput.value = initialName;
          }, 50);
        }
      });
    });
  }
  if (quickTaskInput) {
    quickTaskInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleQuickAdd();
    });
  }

  // Initial load
  loadDashboardTasks();

  /* ============================== DASHBOARD QUICK ACCESS ============================== */

  const dashboardAccessGrid = document.getElementById("dashboard-access-grid");

  /**
   * Load Quick Access items
   */
  const loadDashboardAccess = async () => {
    if (!dashboardAccessGrid) return;

    try {
      const response = await fetch("/api/data?file=links.json");
      if (!response.ok) return;
      const data = await response.json();
      const links = Array.isArray(data) ? data : (data ? [data] : []);
      renderDashboardAccess(links);
    } catch (err) {
      console.error("Dashboard access load error:", err);
    }
  };

  /**
   * Render Quick Access items
   */
  const renderDashboardAccess = (links) => {
    if (!dashboardAccessGrid) return;
    dashboardAccessGrid.innerHTML = "";

    links.forEach((link) => {
      const item = document.createElement("div");
      item.className = "access-item";
      const icon = link.type === "url" ? "🌐" : (link.type === "folder" ? "📁" : (link.type === "file" ? "📄" : "🛠️"));
      item.innerHTML = `${icon} ${link.label}`;
      item.title = link.path;
      item.setAttribute("data-path", link.path);
      item.onclick = function () {
        launchResource(this.getAttribute("data-path"));
      };
      dashboardAccessGrid.appendChild(item);
    });

    if (links.length === 0) {
      dashboardAccessGrid.innerHTML = '<div class="access-item" onclick="location.href=\'pages/links.html\'">➕ Add Link</div>';
    }
  };

  /**
   * API call to launch resource
   */
  const launchResource = async (path) => {
    try {
      const response = await fetch("/api/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: path })
      });
      if (response.ok) {
        const result = await response.json();
        if (result.alreadyOpen) {
          alert("Tài nguyên này đang được mở sẵn.");
        }
      }
    } catch (err) {
      console.error("Launch error:", err);
    }
  };

  // Initial load
  loadDashboardAccess();

  /* ============================== EDIT MODE & PERSISTENCE ============================== */

  /**
   * Toggle layout editing mode
   */
  async function toggleEditMode() {
    const bar = document.getElementById("edit-action-bar");

    if (!isEditing) {
      // START EDITING
      isEditing = true;
      layoutSnapshot = opsGrid.getLayout(); // Take snapshot
      opsGrid.setEditMode(true);
      dashboard.classList.add("is-editing");
      if (bar) bar.classList.remove("hidden");

      // Update Palette command labels if needed, but we keep the same trigger
    } else {
      // STOP EDITING (Manual stop via Palette? Usually we use the Bar now)
      await stopEditing(true);
    }
  }

  /**
   * Finalize editing
   * @param {boolean} shouldSave - Whether to save to server or discard
   */
  async function stopEditing(shouldSave) {
    const bar = document.getElementById("edit-action-bar");
    isEditing = false;
    opsGrid.setEditMode(false);
    dashboard.classList.remove("is-editing");
    if (bar) bar.classList.add("hidden");

    if (shouldSave) {
      await saveLayout();
      layoutSnapshot = null;
    } else {
      // CANCEL: Restore from snapshot
      if (layoutSnapshot) {
        opsGrid.setLayout(layoutSnapshot);
        layoutSnapshot = null;
      }
    }
  }

  // Expose for Command Palette access
  window.toggleEditMode = toggleEditMode;
  window.stopEditing = stopEditing;

  // Bind Bar Buttons
  const saveBtn = document.getElementById('edit-save-btn');
  const cancelBtn = document.getElementById('edit-cancel-btn');
  const legacyToggle = document.getElementById('edit-mode-toggle');

  if (saveBtn) saveBtn.onclick = () => stopEditing(true);
  if (cancelBtn) cancelBtn.onclick = () => stopEditing(false);
  if (legacyToggle) legacyToggle.onclick = toggleEditMode;

  // Handle Esc Key for Cancel
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isEditing) {
      stopEditing(false);
    }
  });

  /* ============================== DASHBOARD REMINDERS ============================== */

  const dashboardRemindersList = document.getElementById("dashboard-reminders-list");

  /**
   * Load Reminders
   */
  const loadDashboardReminders = async () => {
    if (!dashboardRemindersList) return;

    try {
      const response = await fetch("/api/data?file=reminders.json");
      if (!response.ok) return;
      const data = await response.json();
      const reminders = Array.isArray(data) ? data : (data ? [data] : []);
      renderDashboardReminders(reminders);
    } catch (err) {
      console.error("Dashboard reminders load error:", err);
    }
  };

  /**
   * Render Reminders
   */
  const renderDashboardReminders = (reminders) => {
    if (!dashboardRemindersList) return;
    dashboardRemindersList.innerHTML = "";

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const sorted = reminders
      .filter(r => r.date >= todayStr)
      .sort((a, b) => (a.date + " " + a.time).localeCompare(b.date + " " + b.time))
      .slice(0, 5);

    sorted.forEach((rem) => {
      const li = document.createElement("li");
      li.className = "task-item";
      li.style.cursor = "pointer";

      const isToday = rem.date === todayStr;
      const dateDisplay = isToday ? "Hôm nay" : rem.date.split("-").slice(1).join("/");

      li.innerHTML = `<span>🔔 ${dateDisplay} ${rem.time} - ${rem.eventName}</span>`;

      li.onclick = () => {
        if (rem.link) {
          window.open(rem.link, "_blank");
        } else {
          location.href = "pages/reminders.html";
        }
      };
      dashboardRemindersList.appendChild(li);
    });

    if (sorted.length === 0) {
      dashboardRemindersList.innerHTML = '<li class="task-item" onclick="location.href=\'pages/reminders.html\'">➕ Chưa có nhắc nhở</li>';
    }
  };

  // Initial load
  loadDashboardReminders();

  /* ============================== DASHBOARD AUTOMATION ============================== */

  const dashboardAutoList = document.getElementById("dashboard-automation-list");

  /**
   * Load Presets from server
   */
  const loadDashboardAutomation = async () => {
    if (!dashboardAutoList) return;

    try {
      const response = await fetch("/api/data?file=automation.json");
      if (!response.ok) return;
      const data = await response.json();
      const presets = Array.isArray(data) ? data : (data ? [data] : []);
      renderDashboardAutomation(presets);
    } catch (err) {
      console.error("Dashboard automation load error:", err);
    }
  };

  /**
   * Render Automation Buttons
   */
  const renderDashboardAutomation = (presets) => {
    if (!dashboardAutoList) return;
    dashboardAutoList.innerHTML = "";

    presets.forEach((pset) => {
      const li = document.createElement("li");
      li.className = "task-item";
      li.style.justifyContent = "center";
      li.style.background = "var(--color-green)";
      li.style.color = "var(--color-white)";
      li.style.cursor = "pointer";
      li.style.fontWeight = "bold";

      li.innerHTML = `🚀 ${pset.name}`;

      li.onclick = async () => {
        if (!confirm(`Chạy kịch bản: ${pset.name}?`)) return;

        try {
          const response = await fetch("/api/automation/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ actions: pset.actions })
          });
          const res = await response.json();
          if (res.ok) alert("Kịch bản đã chạy xong!");
          else alert("Lỗi: " + JSON.stringify(res.error));
        } catch (e) {
          alert("Lỗi kết nối: " + e.message);
        }
      };

      dashboardAutoList.appendChild(li);
    });

    if (presets.length === 0) {
      dashboardAutoList.innerHTML = '<li class="task-item" onclick="location.href=\'pages/automation.html\'">➕ Tạo kịch bản mới</li>';
    }
  };

  // Initial load
  loadDashboardAutomation();
});
