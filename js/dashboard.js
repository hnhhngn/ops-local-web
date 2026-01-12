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
      const layout = await window.opsApi.getAll("layout.json");

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
  const taskFilterInput = document.getElementById("dashboard-task-filter");
  let currentFilterText = ""; // Store current filter text

  /**
   * Load tasks for dashboard display
   */
  const loadDashboardTasks = async () => {
    if (!dashboardTaskList) return;

    try {
      const tasks = await window.opsApi.getAll("tasks.json");
      renderDashboardTasks(tasks);
    } catch (err) {
      console.error("Dashboard task load error:", err);
    }
  };

  /**
   * Render tasks to dashboard widget (All incomplete)
   */
  /**
   * Render tasks to dashboard widget (All incomplete)
   */
  const renderDashboardTasks = (tasks) => {
    if (!dashboardTaskList) return;
    dashboardTaskList.innerHTML = "";

    // Build parent-child map for tree rendering FIRST
    const taskMap = {};
    tasks.forEach(t => taskMap[t.id] = t);

    // Filter: Only incomplete + match filter text (handling hierarchy)
    const filterText = currentFilterText.toLowerCase();

    // 1. Get all incomplete tasks first
    const allIncomplete = tasks.filter(t => (t.progress || 0) < 100);

    // 2. Determine which IDs to keep
    const keepIds = new Set();
    if (!filterText) {
      allIncomplete.forEach(t => keepIds.add(t.id));
    } else {
      allIncomplete.forEach(task => {
        const name = task.name ? task.name.toLowerCase() : "";
        if (name.includes(filterText)) {
          keepIds.add(task.id);
          // Auto-include incomplete PARENTS to preserve context where possible
          let curr = task;
          while (curr.parentId && taskMap[curr.parentId]) {
            curr = taskMap[curr.parentId];
            if ((curr.progress || 0) < 100) {
              keepIds.add(curr.id);
            }
          }
        }
      });
    }

    const incompleteTasks = allIncomplete.filter(t => keepIds.has(t.id));

    // Sort: Priority (High->Low) -> Start Date (ASC) -> End Date (ASC)
    const sortedTasks = [...incompleteTasks].sort((a, b) => {
      // 1. Priority
      const p = { high: 3, medium: 2, low: 1 };
      const priorityDiff = (p[b.priority] || 0) - (p[a.priority] || 0);
      if (priorityDiff !== 0) return priorityDiff;

      // 2. Start Date (Earliest first)
      if (a.startDate && b.startDate) {
        if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
      } else if (a.startDate) {
        return -1;
      } else if (b.startDate) {
        return 1;
      }

      // 3. End Date (Earliest first)
      if (a.endDate && b.endDate) {
        return a.endDate.localeCompare(b.endDate);
      } else if (a.endDate) {
        return -1;
      } else if (b.endDate) {
        return 1;
      }

      return 0;
    });

    // Re-map sorted for quick lookup
    const sortedMap = {};
    sortedTasks.forEach(t => sortedMap[t.id] = t);

    // ---------------------------------------------------------
    // Recursive Tree Renderer
    // ---------------------------------------------------------
    // ---------------------------------------------------------
    const createNodeFn = (task, level = 0) => {
      const li = document.createElement("li");
      li.className = "task-item-new"; // New generic wrapper
      if (level === 0) li.classList.add("task-root-group");

      // Find direct children present in the sorted list
      const children = sortedTasks.filter(t => t.parentId === task.id);
      const hasKids = children.length > 0;

      // --- Row Content ---
      const row = document.createElement("div");
      row.className = "task-row-container";

      // Metadata
      const priorityClass = task.priority === "high" ? "red" : (task.priority === "medium" ? "blue" : "gray");
      const priorityLabel = task.priority === "high" ? "High" : (task.priority === "medium" ? "Med" : "Low");

      const typeLabel = (task.type || 'task').toUpperCase();
      const typeClassMap = {
        'code': 'type-code',
        'test': 'type-test',
        'design': 'type-design',
        'confirm': 'type-confirm',
        'custom': 'type-custom'
      };
      const typeClass = typeClassMap[task.type] || 'type-confirm';

      // Date formatting to include year: "YYYY-MM-DD"
      const formatDate = (d) => d || '...';
      const dateText = (task.startDate || task.endDate) ? `${formatDate(task.startDate)}➜${formatDate(task.endDate)}` : "";
      const progress = task.progress || 0;

      row.innerHTML = `
            <div class="task-header-row" style="padding-left: ${level * 20}px">
                ${hasKids ? `<span class="toggle-btn" title="Collapse/Expand">-</span>` : `<span style="width:28px"></span>`}
                <label class="pixel-checkbox" style="margin-right: 8px">
                    <input type="checkbox" ${progress === 100 ? "checked" : ""}>
                    <span class="checkmark"></span>
                </label>
                <div class="task-text" title="${task.name}" style="font-weight:${hasKids ? 'bold' : 'normal'}">
                    ${task.name}
                </div>
                 <div class="task-meta">
                    ${task.notes ? `<span class="badge gray mini" title="Has Notes">NOTE</span>` : ""}
                    ${(task.qas || []).length > 0 ? `<span class="badge gray mini">QA</span>` : ""}
                    ${(task.bugs || []).length > 0 ? `<span class="badge red mini">BUG</span>` : ""}
                    <span class="badge ${priorityClass} mini">${priorityLabel}</span>
                    <button class="btn-edit-mini" title="Edit Task">[EDIT]</button>
                </div>
            </div>
            
            <div class="task-sub-row">
                 <span class="task-type-tag ${typeClass}" style="margin-right:10px;">${typeLabel}</span>
                 <span style="width:220px; text-align:left; font-size:0.75rem; margin-right:10px; color:#666; display:inline-block; flex-shrink:0;">${dateText}</span>
                 <div style="flex:1; display:flex; justify-content:flex-end;">
                    <div class="pixel-progress-container">
                        <div class="pixel-progress-bar" style="width: ${progress}%"></div>
                        <span class="pixel-progress-text">${progress}%</span>
                    </div>
                 </div>
            </div>
        `;

      // Toggle Logic
      if (hasKids) {
        const toggle = row.querySelector(".toggle-btn");
        toggle.onclick = (e) => {
          e.stopPropagation();
          const ul = li.querySelector(".nested-task-list");
          if (ul) {
            ul.classList.toggle("hidden");
            toggle.innerText = ul.classList.contains("hidden") ? "+" : "-";
          }
        };
      }

      // Checkbox Logic (Optimistic UI)
      const checkbox = row.querySelector("input[type='checkbox']");
      checkbox.addEventListener("change", async (e) => {
        const newProgress = e.target.checked ? 100 : 0;
        task.progress = newProgress; // local update

        // Visual update immediately
        row.querySelector(".pixel-progress-bar").style.width = newProgress + "%";
        row.querySelector(".pixel-progress-text").innerText = newProgress + "%";

        try {
          const res = await fetch("/api/data?file=tasks.json");
          const all = await res.json();
          const target = all.find(t => t.id === task.id);
          if (target) target.progress = newProgress;

          // Simple Auto-Complete Parent Logic
          if (newProgress === 100 && task.parentId) {
            const parent = all.find(t => t.id === task.parentId);
            if (parent) {
              const siblings = all.filter(t => t.parentId === task.parentId);
              if (siblings.every(s => (s.progress || 0) >= 100)) parent.progress = 100;
            }
          }

          await fetch("/api/data?file=tasks.json", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(all)
          });

          // Reload if completed
          if (newProgress === 100) {
            li.style.opacity = "0.5";
            setTimeout(() => loadDashboardTasks(), 500);
          }
        } catch (err) { console.error(err); }
      });

      // Edit Logic
      row.querySelector(".task-text").addEventListener("click", () => row.querySelector(".btn-edit-mini").click());
      row.querySelector(".btn-edit-mini").addEventListener("click", (e) => {
        e.stopPropagation();
        window.currentQas = [...(task.qas || [])];
        window.currentBugs = [...(task.bugs || [])];

        window.modalManager.open('task', 'CẬP NHẬT CÔNG VIỆC', async (ev) => {
          ev.preventDefault();
          const formData = new FormData(ev.target);
          try {
            const all = await window.opsApi.getAll("tasks.json");
            const idx = all.findIndex(t => t.id === task.id);
            if (idx !== -1) {
              all[idx] = {
                ...all[idx],
                name: formData.get("name"),
                parentId: document.getElementById("parentId").value || null,
                type: document.getElementById("type").value,
                priority: document.getElementById("priority").value,
                startDate: document.getElementById("startDate").value,
                endDate: document.getElementById("endDate").value,
                progress: parseInt(document.getElementById("progress").value) || 0,
                notes: document.getElementById("notes").value,
                qas: window.currentQas,
                bugs: window.currentBugs
              };

              await window.opsApi.save("tasks.json", all);
              window.modalManager.close();
              loadDashboardTasks();
            }
          } catch (err) { console.error(err); }
        },
          // onRender: Pre-fill
          async (modalBody) => {
            if (typeof setupItemBuildersInner !== 'undefined') {
              setupItemBuildersInner(modalBody);
              renderItemListsInner(modalBody);
            }

            setTimeout(() => {
              const nameInput = modalBody.querySelector("#name");
              if (nameInput) nameInput.focus();
            }, 100);

            try {
              const allTasks = await window.opsApi.getAll("tasks.json");
              const parentSelect = modalBody.querySelector("#parentId");
              const typeSelect = modalBody.querySelector("#type");

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

              if (parentSelect && allTasks) {
                const descendants = getDescendantIds(task.id);

                allTasks.forEach(t => {
                  if (t.id === task.id || descendants.has(t.id)) return;
                  const opt = document.createElement("option");
                  opt.value = t.id;
                  opt.textContent = t.name;
                  parentSelect.appendChild(opt);
                });

                parentSelect.addEventListener("change", () => {
                  const pid = parentSelect.value;
                  if (pid) {
                    const parent = allTasks.find(t => t.id === pid);
                    if (parent && typeSelect) {
                      typeSelect.value = parent.type;
                      typeSelect.disabled = true;
                    }
                  } else {
                    if (typeSelect) typeSelect.disabled = false;
                  }
                });
              }
            } catch (err) { console.error("Error populating parents:", err); }

            modalBody.querySelector("#name").value = task.name;
            modalBody.querySelector("#parentId").value = task.parentId || "";
            modalBody.querySelector("#type").value = task.type || "code";
            modalBody.querySelector("#priority").value = task.priority || "medium";
            modalBody.querySelector("#startDate").value = task.startDate || "";
            modalBody.querySelector("#endDate").value = task.endDate || "";
            modalBody.querySelector("#progress").value = task.progress || 0;
            modalBody.querySelector("#notes").value = task.notes || "";

            const btn = modalBody.querySelector("button[type='submit']");
            if (btn) btn.innerText = "LƯU THAY ĐỔI";
          });
      });

      li.appendChild(row);

      // --- Vertical Guide Line ---
      if (hasKids) {
        const vLine = document.createElement("div");
        vLine.className = "tree-v-line";
        // Calculate left based on level: (level*20) + half of toggle-btn (28px) - border adjustment
        // Toggle is 28px wide or starts with 28px empty span. Center is at 14px.
        vLine.style.left = `${(level * 20) + 14}px`;
        li.appendChild(vLine);
      }
      if (hasKids) {
        const ul = document.createElement("ul");
        ul.className = "nested-task-list";
        ul.style.paddingLeft = "0"; // Disable default indent of UL
        ul.style.marginLeft = "0";
        children.forEach(child => {
          ul.appendChild(createNodeFn(child, level + 1));
        });
        li.appendChild(ul);
      }

      return li;
    };

    // 3. Render Roots
    // Roots are tasks in 'sortedTasks' whose parent is NOT in 'sortedTasks'
    const sortedIds = new Set(sortedTasks.map(t => t.id));
    const rootTasks = sortedTasks.filter(t => !t.parentId || !sortedIds.has(t.parentId));

    // Fallback if filtering hid parents but we still want to see children rooted at current scope
    if (rootTasks.length === 0 && sortedTasks.length > 0) {
      // Just render all top-level matched
      sortedTasks.forEach(t => dashboardTaskList.appendChild(createNodeFn(t, 0)));
    } else {
      rootTasks.forEach(task => dashboardTaskList.appendChild(createNodeFn(task, 0)));
    }

    if (incompleteTasks.length === 0) {
      const msg = currentFilterText
        ? `Không tìm thấy "${currentFilterText}"`
        : "No incomplete tasks";
      dashboardTaskList.innerHTML = `<li class="task-item" style="justify-content:center; color:var(--color-muted);">${msg}</li>`;
    }
  };

  /**
   * Global Creation Triggers for Dashboard/Command Palette
   */
  window.openTaskAddModal = () => {
    // Store QAs and Bugs added during form session
    window.currentQas = [];
    window.currentBugs = [];

    window.modalManager.open('task', 'THÊM CÔNG VIỆC MỚI', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const selectedParentId = document.getElementById("parentId").value || null;

      // Determine type based on parent if selected, otherwise user selection
      // Note: We'll trust the disabled state or user selection here, 
      // but strict enforcement could happen server-side
      const selectedType = document.getElementById("type").value;

      const task = {
        id: Date.now().toString(),
        name: formData.get("name"),
        parentId: selectedParentId,
        type: selectedType,
        priority: document.getElementById("priority").value,
        startDate: document.getElementById("startDate").value,
        endDate: document.getElementById("endDate").value,
        progress: parseInt(document.getElementById("progress").value) || 0,
        notes: document.getElementById("notes").value,
        qas: window.currentQas || [],
        bugs: window.currentBugs || []
      };

      try {
        const all = await window.opsApi.getAll("tasks.json");
        all.push(task);
        await window.opsApi.save("tasks.json", all);
        window.modalManager.close();
        loadDashboardTasks();
      } catch (err) { console.error(err); }
    }, async (modalBody) => {
      // 1. Focus Name
      setTimeout(() => {
        const nameInput = modalBody.querySelector("#name");
        if (nameInput) nameInput.focus();
      }, 100);

      // 2. Populate Parent Dropdown & Type Logic
      let allTasks = [];
      try {
        allTasks = await window.opsApi.getAll("tasks.json");
      } catch (err) { console.error(err); }

      const parentSelect = modalBody.querySelector("#parentId");
      const typeSelect = modalBody.querySelector("#type");

      if (parentSelect && allTasks) {
        // For new task, no cycle risk with existing tasks, but we filter max depth
        allTasks.forEach(t => {
          const opt = document.createElement("option");
          opt.value = t.id;
          opt.textContent = t.name;
          parentSelect.appendChild(opt);
        });

        // Sync Type on Parent Change
        parentSelect.addEventListener("change", () => {
          const pid = parentSelect.value;
          if (pid) {
            const parent = allTasks.find(t => t.id === pid);
            if (parent && typeSelect) {
              typeSelect.value = parent.type;
              typeSelect.disabled = true; // Enforce same type
              // Add hidden input to submit the value processing if disabled inputs aren't sent? 
              // Actually, getting value from disabled select usually works in DOM, but FormData might miss it.
              // We'll handle 'disabled' carefully.
              // Better: Just set it and let user see it.
            }
          } else {
            if (typeSelect) typeSelect.disabled = false;
          }
        });
      }

      // 3. QA & Bug Buttons (Re-implement to ensure binding)
      const btnAddQa = modalBody.querySelector("#btnAddQa");
      if (btnAddQa) {
        btnAddQa.onclick = () => {
          const label = modalBody.querySelector("#qaLabel").value.trim();
          const link = modalBody.querySelector("#qaLink").value.trim();
          if (label) {
            window.currentQas.push({ id: Date.now().toString(), label, link });
            const list = modalBody.querySelector("#qa-list");
            const li = document.createElement("li");
            li.innerHTML = `<span>${label}</span>${link ? `<a class="item-link" href="${link}" target="_blank">[->]</a>` : ''}`;
            list.appendChild(li);
            modalBody.querySelector("#qaLabel").value = "";
            modalBody.querySelector("#qaLink").value = "";
          }
        };
      }

      const btnAddBug = modalBody.querySelector("#btnAddBug");
      if (btnAddBug) {
        btnAddBug.onclick = () => {
          const label = modalBody.querySelector("#bugLabel").value.trim();
          const link = modalBody.querySelector("#bugLink").value.trim();
          if (label) {
            window.currentBugs.push({ id: Date.now().toString(), label, link });
            const list = modalBody.querySelector("#bug-list");
            const li = document.createElement("li");
            li.innerHTML = `<span>${label}</span>${link ? `<a class="item-link" href="${link}" target="_blank">[->]</a>` : ''}`;
            list.appendChild(li);
            modalBody.querySelector("#bugLabel").value = "";
            modalBody.querySelector("#bugLink").value = "";
          }
        };
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
        const all = await window.opsApi.getAll("links.json");
        all.push(link);
        await window.opsApi.save("links.json", all);
        window.modalManager.close();
        loadDashboardAccess(); // Refresh link grid
      } catch (err) { console.error(err); }
    });
  };

  window.openRemAddModal = () => {
    window.modalManager.open('reminder', 'THÊM NHẮC NHỎ MỚI', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const rem = {
        id: Date.now().toString(),
        eventName: formData.get("eventName"),
        date: formData.get("date"),
        time: formData.get("time"),
        repeat: formData.get("repeat") || "none",
        link: formData.get("link"),
        notes: formData.get("notes")
      };
      try {
        const all = await window.opsApi.getAll("reminders.json");
        all.push(rem);
        await window.opsApi.save("reminders.json", all);
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
        const all = await window.opsApi.getAll("automation.json");
        all.push(preset);
        await window.opsApi.save("automation.json", all);
        window.modalManager.close();
        if (typeof loadDashboardAutomation === "function") loadDashboardAutomation();
      } catch (err) { console.error(err); }
    }, (modalBody) => {
      // Re-init action builder logic (simplified)
      window.currentActions = [];
      const addBtn = modalBody.querySelector("#btnAddAction");
      if (addBtn) {
        addBtn.onclick = () => {
          const type = modalBody.querySelector("#actionType").value;
          const path = modalBody.querySelector("#actionPath").value;
          const label = modalBody.querySelector("#actionLabel").value;

          if (path && label) {
            window.currentActions.push({ type, path, label });
            const list = modalBody.querySelector("#new-action-list");
            const emptyMsg = modalBody.querySelector("#empty-action-msg");
            if (emptyMsg) emptyMsg.remove();

            if (list) {
              const li = document.createElement("li");
              li.className = "action-item";
              li.style.padding = "0.25rem 0";
              li.style.borderBottom = "1px solid #ccc";
              li.innerHTML = `<span><strong>${label}</strong> (${type})</span>`;
              list.appendChild(li);
            }
          }
        };
      }
    });
  };

  // Filter input listener with debounce
  let filterTimeout = null;
  if (taskFilterInput) {
    taskFilterInput.addEventListener("input", (e) => {
      clearTimeout(filterTimeout);
      filterTimeout = setTimeout(() => {
        currentFilterText = e.target.value.trim();
        loadDashboardTasks();
      }, 200); // 200ms debounce
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
      const links = await window.opsApi.getAll("links.json");
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

    // Ensure grid container class
    dashboardAccessGrid.className = "dashboard-access-grid";

    links.forEach((link) => {
      const item = document.createElement("div");
      // Map types to classes
      const typeClassMap = {
        'url': 'acc-url',
        'folder': 'acc-dir',
        'file': 'acc-doc',
        'app': 'acc-app'
      };
      const typeClass = typeClassMap[link.type] || 'acc-default';

      item.className = `access-item ${typeClass}`;

      item.innerHTML = `
    <span class="access-label" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:center; width:100%;">${link.label}</span>
`;
      item.title = `${link.label} (${link.path})`;
      item.setAttribute("data-path", link.path);

      // Left click to launch
      item.onclick = function () {
        launchResource(this.getAttribute("data-path"));
      };

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
    } else {
      // STOP EDITING
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
      const reminders = await window.opsApi.getAll("reminders.json");
      renderDashboardReminders(reminders);
    } catch (err) {
      console.error("Dashboard reminders load error:", err);
    }
  };

  /**
   * Render Reminders with Recurrence Support
   */
  const renderDashboardReminders = (reminders) => {
    if (!dashboardRemindersList) return;
    dashboardRemindersList.innerHTML = "";

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // Calculate effective date for each reminder
    const processed = reminders.map(r => {
      let nextDate = r.date;

      if (r.repeat && r.repeat !== 'none' && r.date < todayStr) {
        const baseDate = new Date(r.date);
        const today = new Date(todayStr);

        if (r.repeat === 'daily') {
          nextDate = todayStr;
        } else if (r.repeat === 'weekly') {
          const diff = today - baseDate;
          const weeksToAdd = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
          baseDate.setDate(baseDate.getDate() + (weeksToAdd * 7));
          if (baseDate.toISOString().split("T")[0] < todayStr) {
            baseDate.setDate(baseDate.getDate() + 7);
          }
          nextDate = baseDate.toISOString().split("T")[0];
        } else if (r.repeat === 'monthly') {
          const yearDiff = today.getFullYear() - baseDate.getFullYear();
          const monthDiff = today.getMonth() - baseDate.getMonth();
          baseDate.setMonth(baseDate.getMonth() + (yearDiff * 12 + monthDiff));
          if (baseDate.toISOString().split("T")[0] < todayStr) {
            baseDate.setMonth(baseDate.getMonth() + 1);
          }
          nextDate = baseDate.toISOString().split("T")[0];
        }
      }

      return { ...r, nextDate };
    });

    const sorted = processed
      .filter(r => r.nextDate >= todayStr)
      .sort((a, b) => (a.nextDate + " " + a.time).localeCompare(b.nextDate + " " + b.time))
      .slice(0, 5);

    sorted.forEach((rem) => {
      const li = document.createElement("li");
      li.className = "task-item";
      li.style.cursor = "pointer";

      const isToday = rem.nextDate === todayStr;
      const repeatIcon = rem.repeat && rem.repeat !== 'none' ? '[REPEAT] ' : '[ALARM] ';
      const dateDisplay = isToday ? "Hôm nay" : rem.nextDate.split("-").slice(1).join("/");

      li.innerHTML = `<span>${repeatIcon}${dateDisplay} ${rem.time} - ${rem.eventName}</span>`;

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
      dashboardRemindersList.innerHTML = '<li class="task-item" onclick="location.href=\'pages/reminders.html\'">[+] Chưa có nhắc nhở</li>';
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
      const presets = await window.opsApi.getAll("automation.json");
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
      // Render as Grid Item (similar to Quick Access)
      const li = document.createElement("li");
      li.className = "access-item acc-auto"; // Reuse access-item layout + acc-auto color
      li.style.cursor = "pointer";

      li.innerHTML = `
        <span class="access-label" style="width:100%; text-align:center;">${pset.name}</span>
      `;

      li.onclick = async () => {
        if (!confirm(`Chạy kịch bản: ${pset.name}?`)) return;

        try {
          const response = await fetch("/api/automation/run", {
            // ...
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
      dashboardAutoList.innerHTML = '<li class="task-item" onclick="location.href=\'pages/automation.html\'">[+] Tạo kịch bản mới</li>';
    }
  };

  /* ============================== SETTINGS & SERVER CONTROL ============================== */

  /**
   * Fetch and handle Auto Startup status
   */
  const syncStartupStatus = async (btn) => {
    try {
      const res = await fetch("/api/settings/startup");
      const status = await res.json();
      updateStartupButton(btn, status.enabled);
    } catch (err) {
      console.error("Failed to sync startup status:", err);
      btn.innerText = "LỖI KẾT NỐI";
      btn.className = "pixel-button mini red";
    }
  };

  const updateStartupButton = (btn, isEnabled) => {
    btn.innerText = isEnabled ? "ĐANG BẬT (ON)" : "ĐANG TẮT (OFF)";
    btn.className = `pixel-button mini ${isEnabled ? "green" : "gray"}`;
    btn.dataset.enabled = isEnabled;
  };

  /**
   * System Settings Trigger
   */
  window.openSettingsModal = () => {
    window.modalManager.open('settings', 'CÀI ĐẶT HỆ THỐNG', null, (modalBody) => {
      const toggleBtn = modalBody.querySelector("#btn-toggle-startup");

      // Initial state fetch
      syncStartupStatus(toggleBtn);

      // Handle Toggle Click
      toggleBtn.onclick = async () => {
        const currentlyEnabled = toggleBtn.dataset.enabled === "true";
        toggleBtn.innerText = "ĐANG XỬ LÝ...";
        toggleBtn.className = "pixel-button mini gray";

        try {
          const res = await fetch("/api/settings/startup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enabled: !currentlyEnabled })
          });
          const result = await res.json();
          if (result.ok) {
            updateStartupButton(toggleBtn, result.enabled);
          } else {
            alert("Lỗi: " + result.error);
            syncStartupStatus(toggleBtn);
          }
        } catch (err) {
          alert("Lỗi kết nối server.");
          syncStartupStatus(toggleBtn);
        }
      };
    });
  };

  // Initial load
  loadDashboardAutomation();

  /**
   * Helper: Setup QA/Bug Builders for Dashboard Modals
   */
  function setupItemBuildersInner(modalBody) {
    const setup = (btnId, labelId, linkId, store) => {
      const btn = modalBody.querySelector(btnId);
      if (!btn) return;
      btn.onclick = () => {
        const label = modalBody.querySelector(labelId).value.trim();
        const link = modalBody.querySelector(linkId).value.trim();
        if (label) {
          store.push({ id: Date.now().toString(), label, link });
          renderItemListsInner(modalBody);
          modalBody.querySelector(labelId).value = "";
          modalBody.querySelector(linkId).value = "";
        }
      };
    };

    setup("#btnAddQa", "#qaLabel", "#qaLink", window.currentQas);
    setup("#btnAddBug", "#bugLabel", "#bugLink", window.currentBugs);
  }

  /**
   * Helper: Render QA/Bug Lists in Dashboard Modals
   */
  function renderItemListsInner(modalBody) {
    const renderList = (listId, items) => {
      const list = modalBody.querySelector(listId);
      if (!list) return;
      list.innerHTML = "";
      items.forEach((item, idx) => {
        const li = document.createElement("li");
        li.innerHTML = `
  <span>${item.label}</span>
    <div>
      ${item.link ? `<a class="item-link" href="${item.link}" target="_blank">[LNK]</a>` : ""}
      <button type="button" class="btn-remove-item" onclick="window.removeItemDashboard('${listId}', ${idx})">×</button>
    </div>
`;
        list.appendChild(li);
      });
    };

    renderList("#qa-list", window.currentQas);
    renderList("#bug-list", window.currentBugs);
  }

  // Global helper for remove button in Dashboard context
  window.removeItemDashboard = (listId, idx) => {
    if (listId === "#qa-list") window.currentQas.splice(idx, 1);
    else window.currentBugs.splice(idx, 1);
    // Need a way to re-render. Since we use window-level state, we just find the modal body
    const modalBody = document.querySelector(".pixel-modal-body");
    if (modalBody) renderItemListsInner(modalBody);
  };

});
