// core.js

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.toggle("is-hidden");
}

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

// --- EDIT DASHBOARD LOGIC WITH DATASET SIZE ---
document.addEventListener("DOMContentLoaded", () => {
  const dashboard = document.getElementById("dashboard");
  const editBtn = document.getElementById("edit-mode-toggle");
  let isEditing = false;

  // 1. Khởi tạo Ghost Element
  const ghost = document.createElement("div");
  ghost.className = "grid-ghost";
  dashboard.appendChild(ghost);

  // SỬA ĐỔI: Hàm lấy Metrics dựa trên DATASET (Root Cause Fix)
  const getWidgetMetrics = (el) => {
    const style = window.getComputedStyle(el);

    // Tọa độ Start vẫn lấy từ style để biết vị trí hiện tại
    const colStart =
      parseInt(el.style.gridColumnStart) ||
      parseInt(style.gridColumnStart) ||
      1;
    const rowStart =
      parseInt(el.style.gridRowStart) || parseInt(style.gridRowStart) || 1;

    // Kích thước lấy TUYỆT ĐỐI từ dataset (Tránh lỗi 8x6 của Chrome)
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

  const hideGhost = () => {
    ghost.classList.remove("is-visible", "valid", "invalid");
  };

  // 2. Toggle Mode
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      isEditing = !isEditing;
      dashboard.classList.toggle("is-editing", isEditing);
      document.querySelectorAll(".pixel-widget").forEach((w, i) => {
        w.setAttribute("draggable", isEditing);
        if (!w.id) w.id = `widget-auto-${i}`;
      });
      editBtn.querySelector(".text").innerText = isEditing
        ? "Save Layout"
        : "Edit Layout";
    });
  }

  // 3. Drag Events
  dashboard.addEventListener("dragstart", (e) => {
    if (!isEditing) return;

    const widget = e.target.closest(".pixel-widget");
    if (!widget) return;

    // Tọa độ chuột tương đối trong Widget
    const rect = widget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Vùng an toàn (Top-Left 40px)
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

  dashboard.addEventListener("dragover", (e) => {
    if (!isEditing) return;
    e.preventDefault();

    const draggingWidget = document.querySelector(".is-dragging");
    if (!draggingWidget) return;

    const rect = dashboard.getBoundingClientRect();
    const colSize = rect.width / 24;
    const rowSize = rect.height / 24;

    // Lấy size từ dataset của widget đang kéo
    const w = parseInt(draggingWidget.dataset.w);
    const h = parseInt(draggingWidget.dataset.h);

    let newCol = Math.floor((e.clientX - rect.left) / colSize) + 1;
    let newRow = Math.floor((e.clientY - rect.top) / rowSize) + 1;

    newCol = Math.max(1, Math.min(newCol, 25 - w));
    newRow = Math.max(1, Math.min(newRow, 25 - h));

    // Cập nhật vị trí Ghost mà không làm thay đổi các widget khác
    ghost.style.gridColumn = `${newCol} / span ${w}`;
    ghost.style.gridRow = `${newRow} / span ${h}`;

    ghost.style.gridColumnStart = newCol;
    ghost.style.gridRowStart = newRow;

    const proposed = { x1: newCol, y1: newRow, x2: newCol + w, y2: newRow + h };
    const otherWidgets = Array.from(
      document.querySelectorAll(".pixel-widget")
    ).filter((w) => w.id !== draggingWidget.id);

    const isColliding = otherWidgets.some((other) => {
      const m = getWidgetMetrics(other);
      return !(
        proposed.x2 <= m.x1 ||
        proposed.x1 >= m.x2 ||
        proposed.y2 <= m.y1 ||
        proposed.y1 >= m.y2
      );
    });

    if (isColliding) {
      ghost.classList.add("invalid");
      ghost.classList.remove("valid");
    } else {
      ghost.classList.add("valid");
      ghost.classList.remove("invalid");
    }
  });

  dashboard.addEventListener("drop", (e) => {
    if (!isEditing) return;
    e.preventDefault();
    hideGhost();

    const id = e.dataTransfer.getData("text/plain");
    const draggingWidget = document.getElementById(id);
    if (!draggingWidget) return;

    const rect = dashboard.getBoundingClientRect();
    const colSize = rect.width / 24;
    const rowSize = rect.height / 24;

    const w = parseInt(draggingWidget.dataset.w);
    const h = parseInt(draggingWidget.dataset.h);

    let newCol = Math.floor((e.clientX - rect.left) / colSize) + 1;
    let newRow = Math.floor((e.clientY - rect.top) / rowSize) + 1;
    newCol = Math.max(1, Math.min(newCol, 25 - w));
    newRow = Math.max(1, Math.min(newRow, 25 - h));

    const proposed = { x1: newCol, y1: newRow, x2: newCol + w, y2: newRow + h };
    const otherWidgets = Array.from(
      document.querySelectorAll(".pixel-widget")
    ).filter((w) => w.id !== id);

    const isColliding = otherWidgets.some((other) => {
      const m = getWidgetMetrics(other);
      return !(
        proposed.x2 <= m.x1 ||
        proposed.x1 >= m.x2 ||
        proposed.y2 <= m.y1 ||
        proposed.y1 >= m.y2
      );
    });

    if (!isColliding) {
      draggingWidget.style.gridColumn = `${newCol} / span ${w}`;
      draggingWidget.style.gridRow = `${newRow} / span ${h}`;
    }
  });

  dashboard.addEventListener("dragend", () => {
    document
      .querySelectorAll(".pixel-widget")
      .forEach((w) => w.classList.remove("is-dragging"));
    hideGhost();
  });
});
