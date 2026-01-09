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
  /**
   * Render tasks to dashboard widget (Top 8)
   */
  const renderDashboardTasks = (tasks) => {
    if (!dashboardTaskList) return;
    dashboardTaskList.innerHTML = "";

    // Sort by priority (High -> Medium -> Low)
    const sortedTasks = [...tasks].sort((a, b) => {
      const p = { high: 3, medium: 2, low: 1 };
      return (p[b.priority] || 0) - (p[a.priority] || 0);
    }).slice(0, 8);

    sortedTasks.forEach((task) => {
      const li = document.createElement("li");
      li.className = "task-item";

      const priorityClass = task.priority === "high" ? "red" : (task.priority === "medium" ? "blue" : "gray");
      const priorityLabel = task.priority === "high" ? "High" : (task.priority === "medium" ? "Med" : "Low");

      li.innerHTML = `
        <label class="pixel-checkbox">
            <input type="checkbox" ${task.progress === 100 ? "checked" : ""}>
            <span class="checkmark"></span>
        </label>
        <div class="task-text" title="${task.name}">${task.name}</div>
        <div class="task-meta">
            <span class="badge ${priorityClass} mini">${priorityLabel}</span>
            <button class="btn-edit-mini" title="Edit Task">✎</button>
        </div>
      `;

      // Checkbox Logic
      const checkbox = li.querySelector("input[type='checkbox']");
      checkbox.addEventListener("change", async (e) => {
        const newProgress = e.target.checked ? 100 : 0;
        // Optimistic update
        task.progress = newProgress;

        try {
          // Re-fetch all to ensure sync (simplified)
          const res = await fetch("/api/data?file=tasks.json");
          const all = await res.json();
          const target = all.find(t => t.id === task.id);
          if (target) target.progress = newProgress;

          await fetch("/api/data?file=tasks.json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(all)
          });
        } catch (err) { console.error(err); }
      });

      // Edit Button Logic
      li.querySelector(".btn-edit-mini").addEventListener("click", (e) => {
        e.stopPropagation();
        window.modalManager.open('task', 'CẬP NHẬT CÔNG VIỆC', async (ev) => {
          ev.preventDefault();
          const formData = new FormData(ev.target);
          // Merge updates
          try {
            const res = await fetch("/api/data?file=tasks.json");
            const all = await res.json();
            const idx = all.findIndex(t => t.id === task.id);
            if (idx !== -1) {
              all[idx] = {
                ...all[idx],
                name: formData.get("name"),
                type: document.getElementById("type").value,
                priority: document.getElementById("priority").value,
                startDate: document.getElementById("startDate").value,
                endDate: document.getElementById("endDate").value,
                progress: parseInt(document.getElementById("progress").value) || 0,
                notes: document.getElementById("notes").value
              };

              await fetch("/api/data?file=tasks.json", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(all)
              });
              window.modalManager.close();
              loadDashboardTasks();
            }
          } catch (err) { console.error(err); }
        },
          // onRender: Pre-fill
          (modalBody) => {
            modalBody.querySelector("#name").value = task.name;
            modalBody.querySelector("#type").value = task.type || "code";
            modalBody.querySelector("#priority").value = task.priority || "medium";
            modalBody.querySelector("#startDate").value = task.startDate || "";
            modalBody.querySelector("#endDate").value = task.endDate || "";
            modalBody.querySelector("#progress").value = task.progress || 0;
            modalBody.querySelector("#notes").value = task.notes || "";

            // Update submit button text
            const btn = modalBody.querySelector("button[type='submit']");
            if (btn) btn.innerText = "LƯU THAY ĐỔI";
          });
      });

      // Click text to open edit as well
      li.querySelector(".task-text").addEventListener("click", () => {
        li.querySelector(".btn-edit-mini").click();
      });

      dashboardTaskList.appendChild(li);
    });

    if (tasks.length === 0) {
      dashboardTaskList.innerHTML = '<li class="task-item" style="justify-content:center; color:var(--color-muted);">No tasks found</li>';
    }
  };

  /**
   * Global Creation Triggers for Dashboard/Command Palette
   */
  window.openTaskAddModal = () => {
    const initialName = quickTaskInput ? quickTaskInput.value.trim() : "";
    window.modalManager.open('task', 'THÊM CÔNG VIỆC MỚI', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const task = {
        id: Date.now().toString(),
        name: formData.get("name"),
        type: document.getElementById("type").value,
        priority: document.getElementById("priority").value,
        startDate: document.getElementById("startDate").value,
        endDate: document.getElementById("endDate").value,
        progress: parseInt(document.getElementById("progress").value) || 0,
        notes: document.getElementById("notes").value
      };

      try {
        const res = await fetch("/api/data?file=tasks.json");
        const all = await res.json();
        all.push(task);
        await fetch("/api/data?file=tasks.json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(all)
        });
        window.modalManager.close();
        loadDashboardTasks();
        if (quickTaskInput) quickTaskInput.value = "";
      } catch (err) { console.error(err); }
    }, (modalBody) => {
      if (initialName) {
        setTimeout(() => {
          const nameInput = modalBody.querySelector("#name");
          if (nameInput) nameInput.value = initialName;
        }, 50);
      }
    });
  };

  window.openLinkAddModal = () => {
    window.modalManager.open('link', 'THÊM ĐƯỜNG DẪN MỚI', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const link = {
        id: Date.now().toString(),
        label: formData.get("label"),
        path: formData.get("path"),
        type: formData.get("type"),
        group: formData.get("group")
      };
      try {
        const res = await fetch("/api/data?file=links.json");
        const all = await res.json();
        all.push(link);
        await fetch("/api/data?file=links.json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(all)
        });
        window.modalManager.close();
        loadDashboardAccess(); // Refresh link grid
      } catch (err) { console.error(err); }
    });
  };

  window.openRemAddModal = () => {
    window.modalManager.open('reminder', 'THÊM NHẮC NHỞ MỚI', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const rem = {
        id: Date.now().toString(),
        eventName: formData.get("eventName"),
        date: formData.get("date"),
        time: formData.get("time"),
        link: formData.get("link"),
        notes: formData.get("notes")
      };
      try {
        const res = await fetch("/api/data?file=reminders.json");
        const all = await res.json();
        all.push(rem);
        await fetch("/api/data?file=reminders.json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(all)
        });
        window.modalManager.close();
        if (typeof loadDashboardReminders === 'function') loadDashboardReminders();
      } catch (err) { console.error(err); }
    });
  };

  window.openAutoAddModal = () => {
    // For Automation, we need to handle the action builder in onRender
    window.modalManager.open('automation', 'THIẾT LẬP KỊCH BẢN MỚI', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const preset = {
        id: Date.now().toString(),
        name: formData.get("presetName"),
        description: formData.get("presetDesc"),
        actions: window.currentActions || []
      };
      try {
        const res = await fetch("/api/data?file=automation.json");
        const all = await res.json();
        all.push(preset);
        await fetch("/api/data?file=automation.json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(all)
        });
        window.modalManager.close();
      } catch (err) { console.error(err); }
    }, (modalBody) => {
      // Re-init action builder logic (simplified)
      window.currentActions = [];
      const addBtn = modalBody.querySelector("#add-action-btn");
      if (addBtn) {
        addBtn.onclick = () => {
          const type = modalBody.querySelector("#actionType").value;
          const val = modalBody.querySelector("#actionValue").value;
          if (val) {
            window.currentActions.push({ type, value: val });
            // We would need a way to render this buffer in the modalBody
            // For simplicity, let's just alert for now or implement minimally
            const list = modalBody.querySelector(".action-list-mini");
            if (list) {
              const li = document.createElement("li");
              li.className = "action-item";
              li.innerHTML = `<span>${type}: ${val}</span>`;
              list.appendChild(li);
            }
          }
        };
      }
    });
  };

  if (quickTaskBtn) {
    quickTaskBtn.addEventListener("click", () => window.openTaskAddModal());
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
  /**
   * Render Quick Access items
   */
  const renderDashboardAccess = (links) => {
    if (!dashboardAccessGrid) return;
    dashboardAccessGrid.innerHTML = "";

    // Ensure grid container class
    dashboardAccessGrid.className = "dashboard-access-grid";

    links.forEach((link) => {
      const item = document.createElement("div");
      item.className = "access-item";

      const iconMap = {
        'url': '🌐',
        'folder': '📁',
        'file': '📄',
        'app': '🚀'
      };
      const icon = iconMap[link.type] || '🔗';

      item.innerHTML = `
        <span class="access-icon">${icon}</span>
        <span class="access-label" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${link.label}</span>
      `;
      item.title = `${link.label} (${link.path})`;
      item.setAttribute("data-path", link.path);

      // Left click to launch
      item.onclick = function () {
        launchResource(this.getAttribute("data-path"));
      };

      // Right click (context menu) to edit - simplified to shift+click for now or add edit button?
      // For dashboard simplicity, let's keep it clean. 
      // Maybe a small edit button on hover?
      // Let's rely on Management Page for full editing of Links for now to avoid clutter, 
      // OR implement a context menu later. 
      // For now, let's just make them look good. 

      dashboardAccessGrid.appendChild(item);
    });

    if (links.length === 0) {
      dashboardAccessGrid.innerHTML = `
        <div class="access-item" style="justify-content:center; border-style:dashed; opacity:0.6;" onclick="location.href='pages/links.html'">
            <span>+ Add Link</span>
        </div>
      `;
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
