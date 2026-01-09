/* ============================== SIDEBAR NAVIGATION ============================== */

/**
 * Toggle sidebar visibility state
 * @returns {void}
 */
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.toggle("is-hidden");
}

/**
 * Handle sidebar navigation and content section switching
 */
document.addEventListener("DOMContentLoaded", () => {
  const sidebarLinks = document.querySelectorAll(".sidebar-link");
  const sections = document.querySelectorAll(".content-section");

  sidebarLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const targetPage = link.getAttribute("data-page");
      if (!targetPage) return;
      sidebarLinks.forEach((l) => l.classList.remove("is-active"));
      link.classList.add("is-active");
      sections.forEach((section) => {
        section.classList.remove("is-active");
        if (section.id === targetPage) section.classList.add("is-active");
      });
    });
  });
});

/* ============================== DASHBOARD EDIT MODE ============================== */

/**
 * Manages dashboard widget drag-and-drop functionality in edit mode
 */
document.addEventListener("DOMContentLoaded", () => {
  const dashboard = document.getElementById("dashboard");
  const editBtn = document.getElementById("edit-mode-toggle");
  let isEditing = false;

  // Create visual preview element for drag feedback
  const ghost = document.createElement("div");
  ghost.className = "grid-ghost";
  dashboard.appendChild(ghost);

  // Cache dashboard metrics to minimize reflow calculations
  let dashboardRect = null;
  let colSize = 0;
  let rowSize = 0;

  /**
   * Updates cached dashboard layout metrics
   * @returns {void}
   */
  const updateLayoutCache = () => {
    dashboardRect = dashboard.getBoundingClientRect();
    colSize = dashboardRect.width / 24;
    rowSize = dashboardRect.height / 24;
  };

  /**
   * Retrieves widget position and dimensions from element attributes
   * Workaround: Uses dataset instead of computed styles to avoid Chrome grid parsing issues
   * @param {HTMLElement} el - Widget element
   * @returns {{id: string, x1: number, y1: number, x2: number, y2: number, w: number, h: number}}
   */
  const getWidgetMetrics = (el) => {
    // Get position from inline styles (already parsed by browser)
    const colStart = parseInt(el.style.gridColumnStart) || 1;
    const rowStart = parseInt(el.style.gridRowStart) || 1;

    // Get dimensions from data attributes (source of truth for widget size)
    const w = parseInt(el.dataset.w) || 8;
    const h = parseInt(el.dataset.h) || 6;

    return {
      id: el.id,
      x1: colStart,
      y1: rowStart,
      x2: colStart + w,
      y2: rowStart + h,
      w,
      h,
    };
  };

  /**
   * Detects collision between proposed position and existing widgets
   * @param {{x1: number, y1: number, x2: number, y2: number}} proposed - Target position
   * @param {HTMLElement[]} otherWidgets - Widgets to check against
   * @param {string} excludeId - Widget ID to skip in collision check
   * @returns {boolean} True if collision detected
   */
  const checkCollision = (proposed, otherWidgets, excludeId) => {
    return otherWidgets.some((other) => {
      if (other.id === excludeId) return false;
      const m = getWidgetMetrics(other);
      return !(
        proposed.x2 <= m.x1 ||
        proposed.x1 >= m.x2 ||
        proposed.y2 <= m.y1 ||
        proposed.y1 >= m.y2
      );
    });
  };

  /**
   * Hides drag preview ghost element
   * @returns {void}
   */
  const hideGhost = () => {
    ghost.classList.remove("is-visible", "valid", "invalid");
  };

  // Cache widget elements and button text for frequent access
  let widgetElements = Array.from(document.querySelectorAll(".pixel-widget"));
  let editBtnText = null;
  if (editBtn) {
    editBtnText = editBtn.querySelector(".text");
  }

  /**
   * Toggle edit mode on/off
   */
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      isEditing = !isEditing;
      dashboard.classList.toggle("is-editing", isEditing);
      updateLayoutCache();

      widgetElements.forEach((w, i) => {
        w.setAttribute("draggable", isEditing);
        if (!w.id) w.id = `widget-auto-${i}`;

        if (isEditing) {
          // Inject handles
          const directions = ["n", "e", "s", "w"];
          directions.forEach((dir) => {
            const h = document.createElement("div");
            h.className = `resize-handle handle-${dir}`;
            h.dataset.direction = dir;
            w.appendChild(h);
          });
        } else {
          // Remove handles
          const handles = w.querySelectorAll(".resize-handle");
          handles.forEach((h) => h.remove());
        }
      });

      if (editBtnText) {
        editBtnText.innerText = isEditing ? "Save Layout" : "Edit Layout";
      }
    });
  }

  /**
   * Handle widget drag start - only from drag handle area (top-left 40x40px)
   */
  dashboard.addEventListener("dragstart", (e) => {
    if (!isEditing) return;

    const widget = e.target.closest(".pixel-widget");
    if (!widget) return;

    // Tọa độ chuột tương đối trong Widget
    const rect = widget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Safeguard: Only allow dragging from drag handle area (top-left 40x40px)
    // Prevents accidental drags when clicking content
    if (x > 40 || y > 40) {
      e.preventDefault();
      return;
    }

    widget.classList.add("is-dragging");
    const metrics = getWidgetMetrics(widget);

    // Lưu size vào dataset để Ghost sử dụng
    widget.dataset.w = metrics.w;
    widget.dataset.h = metrics.h;

    e.dataTransfer.setData("text/plain", widget.id);

    // Thiết lập hình dáng Ghost ban đầu
    ghost.style.gridColumn = `span ${metrics.w}`;
    ghost.style.gridRow = `span ${metrics.h}`;
    ghost.classList.add("is-visible");
  });

  /**
   * Update ghost preview position during drag and detect collisions
   */
  dashboard.addEventListener("dragover", (e) => {
    if (!isEditing) return;
    e.preventDefault();

    const draggingWidget = document.querySelector(".is-dragging");
    if (!draggingWidget) return;

    // Recalculate layout metrics on drag move for responsive accuracy
    updateLayoutCache();

    const w = parseInt(draggingWidget.dataset.w);
    const h = parseInt(draggingWidget.dataset.h);

    let newCol = Math.floor((e.clientX - dashboardRect.left) / colSize) + 1;
    let newRow = Math.floor((e.clientY - dashboardRect.top) / rowSize) + 1;

    newCol = Math.max(1, Math.min(newCol, 25 - w));
    newRow = Math.max(1, Math.min(newRow, 25 - h));

    // Cập nhật vị trí Ghost
    ghost.style.gridColumn = `${newCol} / span ${w}`;
    ghost.style.gridRow = `${newRow} / span ${h}`;

    const proposed = { x1: newCol, y1: newRow, x2: newCol + w, y2: newRow + h };
    const otherWidgets = widgetElements.filter(
      (w) => w.id !== draggingWidget.id
    );

    const isColliding = checkCollision(
      proposed,
      otherWidgets,
      draggingWidget.id
    );

    if (isColliding) {
      ghost.classList.add("invalid");
      ghost.classList.remove("valid");
    } else {
      ghost.classList.add("valid");
      ghost.classList.remove("invalid");
    }
  });

  /**
   * Handle drop to finalize widget position if no collision detected
   */
  dashboard.addEventListener("drop", (e) => {
    if (!isEditing) return;
    e.preventDefault();
    hideGhost();

    const id = e.dataTransfer.getData("text/plain");
    const draggingWidget = document.getElementById(id);
    if (!draggingWidget) return;

    const w = parseInt(draggingWidget.dataset.w);
    const h = parseInt(draggingWidget.dataset.h);

    let newCol = Math.floor((e.clientX - dashboardRect.left) / colSize) + 1;
    let newRow = Math.floor((e.clientY - dashboardRect.top) / rowSize) + 1;
    newCol = Math.max(1, Math.min(newCol, 25 - w));
    newRow = Math.max(1, Math.min(newRow, 25 - h));

    const proposed = { x1: newCol, y1: newRow, x2: newCol + w, y2: newRow + h };
    const otherWidgets = widgetElements.filter((w) => w.id !== id);

    const isColliding = checkCollision(proposed, otherWidgets, id);

    if (!isColliding) {
      draggingWidget.style.gridColumn = `${newCol} / span ${w}`;
      draggingWidget.style.gridRow = `${newRow} / span ${h}`;
    }
  });

  /**
   * Clean up drag state when drag ends
   */
  dashboard.addEventListener("dragend", () => {
    widgetElements.forEach((w) => w.classList.remove("is-dragging"));
    hideGhost();
  });

  /* ============================== RESIZE LOGIC ============================== */

  let resizeConfig = null;

  /**
   * Handle mousedown on resize handles to initiate resizing
   */
  dashboard.addEventListener("mousedown", (e) => {
    if (!isEditing) return;
    const handle = e.target.closest(".resize-handle");
    if (!handle) return;

    e.preventDefault();
    e.stopPropagation();

    const widget = handle.closest(".pixel-widget");
    if (!widget) return;

    const metrics = getWidgetMetrics(widget);
    resizeConfig = {
      widget,
      direction: handle.dataset.direction,
      startMetrics: metrics,
      startMouse: { x: e.clientX, y: e.clientY },
    };

    widget.classList.add("is-resizing");
    ghost.style.gridColumn = widget.style.gridColumn;
    ghost.style.gridRow = widget.style.gridRow;
    ghost.classList.add("is-visible", "valid");
  });

  /**
   * Listen for mousemove on window to handle resize calculations globally
   */
  window.addEventListener("mousemove", (e) => {
    if (!isEditing || !resizeConfig) return;

    updateLayoutCache();
    const { direction, startMetrics, startMouse } = resizeConfig;

    const deltaX = e.clientX - startMouse.x;
    const deltaY = e.clientY - startMouse.y;

    const deltaCol = Math.round(deltaX / colSize);
    const deltaRow = Math.round(deltaY / rowSize);

    let props = {
      x1: startMetrics.x1,
      y1: startMetrics.y1,
      w: startMetrics.w,
      h: startMetrics.h,
    };

    if (direction === "e") {
      props.w = Math.max(1, startMetrics.w + deltaCol);
    } else if (direction === "s") {
      props.h = Math.max(1, startMetrics.h + deltaRow);
    } else if (direction === "w") {
      const maxPossibleX1 = startMetrics.x2 - 1;
      const newX1 = Math.max(1, Math.min(startMetrics.x1 + deltaCol, maxPossibleX1));
      const actualDelta = startMetrics.x1 - newX1;
      props.x1 = newX1;
      props.w = startMetrics.w + actualDelta;
    } else if (direction === "n") {
      const maxPossibleY1 = startMetrics.y2 - 1;
      const newY1 = Math.max(1, Math.min(startMetrics.y1 + deltaRow, maxPossibleY1));
      const actualDelta = startMetrics.y1 - newY1;
      props.y1 = newY1;
      props.h = startMetrics.h + actualDelta;
    }

    props.x2 = props.x1 + props.w;
    props.y2 = props.y1 + props.h;

    // Bounds check
    if (props.x2 > 25) props.w = 25 - props.x1;
    if (props.y2 > 25) props.h = 25 - props.y1;

    // Ghost preview
    ghost.style.gridColumn = `${props.x1} / span ${props.w}`;
    ghost.style.gridRow = `${props.y1} / span ${props.h}`;

    const otherWidgets = widgetElements.filter(
      (w) => w.id !== resizeConfig.widget.id
    );
    const isColliding = checkCollision(props, otherWidgets, resizeConfig.widget.id);

    if (isColliding) {
      ghost.classList.add("invalid");
      ghost.classList.remove("valid");
    } else {
      ghost.classList.add("valid");
      ghost.classList.remove("invalid");
    }

    resizeConfig.latestValid = isColliding ? null : props;
  });

  /**
   * finalize resize on mouseup
   */
  window.addEventListener("mouseup", () => {
    if (!resizeConfig) return;

    if (resizeConfig.latestValid) {
      const p = resizeConfig.latestValid;
      const w = resizeConfig.widget;
      w.style.gridColumn = `${p.x1} / span ${p.w}`;
      w.style.gridRow = `${p.y1} / span ${p.h}`;
      w.dataset.w = p.w;
      w.dataset.h = p.h;
    }

    resizeConfig.widget.classList.remove("is-resizing");
    resizeConfig = null;
    hideGhost();
  });

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

    // Sort by priority (high first) and take top 8
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
        <span onclick="location.href='tasks.html'" style="cursor:pointer">${task.name}</span>
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
  const handleQuickAdd = async () => {
    if (!quickTaskInput || !quickTaskInput.value.trim()) return;

    const newTask = {
      id: "task-" + Date.now(),
      name: quickTaskInput.value.trim(),
      type: "custom",
      priority: "low",
      startDate: new Date().toISOString().split("T")[0],
      progress: 0,
      notes: ""
    };

    try {
      const response = await fetch("/api/data?file=tasks.json");
      let tasks = [];
      if (response.ok) {
        const data = await response.json();
        tasks = Array.isArray(data) ? data : (data ? [data] : []);
      }
      tasks.push(newTask);

      const saveRes = await fetch("/api/data?file=tasks.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tasks)
      });

      if (saveRes.ok) {
        quickTaskInput.value = "";
        loadDashboardTasks();
      }
    } catch (err) {
      console.error("Quick add error:", err);
    }
  };

  if (quickTaskBtn) {
    quickTaskBtn.addEventListener("click", handleQuickAdd);
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
      // Use data attribute and explicit listener to avoid backslash escaping issues in HTML attributes
      item.setAttribute("data-path", link.path);
      item.onclick = function() {
          launchResource(this.getAttribute("data-path"));
      };
      dashboardAccessGrid.appendChild(item);
    });

    if (links.length === 0) {
      dashboardAccessGrid.innerHTML = '<div class="access-item" onclick="location.href=\'links.html\'">➕ Add Link</div>';
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
});

