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
  const editBtnText = editBtn?.querySelector(".text");

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
});
