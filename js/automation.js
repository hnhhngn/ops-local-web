/**
 * Automation Management Logic
 */

const API_DATA_URL = "/api/data?file=automation.json";
const API_RUN_URL = "/api/automation/run";

let allPresets = [];
let editingPresetId = null;
let currentActions = []; // Temporary array for the form

document.addEventListener("DOMContentLoaded", () => {
    loadPresets();

    // Form Handlers
    const form = document.getElementById("auto-form");
    if (form) form.addEventListener("submit", handleFormSubmit);

    // Action Builder Handlers
    const btnAddAction = document.getElementById("btnAddAction");
    if (btnAddAction) btnAddAction.addEventListener("click", addActionToBuffer);
});

/**
 * Fetch presets
 */
async function loadPresets() {
    try {
        const response = await fetch(API_DATA_URL);
        if (!response.ok) throw new Error("Failed to fetch automation data");
        const data = await response.json();
        allPresets = Array.isArray(data) ? data : (data ? [data] : []);
        renderPresets();
    } catch (error) {
        console.error("Error loading presets:", error);
    }
}

/**
 * Render Preset List
 */
function renderPresets() {
    const tbody = document.getElementById("auto-list-body");
    if (!tbody) return;

    tbody.innerHTML = "";

    allPresets.forEach((pset) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td><strong>${pset.name}</strong></td>
            <td style="color: var(--color-muted); font-size: 0.9rem;">${pset.description || ""}</td>
            <td>${pset.actions ? pset.actions.length : 0} bước</td>
            <td>
                <div class="action-btns">
                    <button class="pixel-button green mini" onclick="runPreset('${pset.id}')">▶ Run</button>
                    <button class="pixel-button yellow mini" onclick="editPreset('${pset.id}')">Sửa</button>
                    <button class="pixel-button red mini" onclick="deletePreset('${pset.id}')">Xóa</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Run Preset
 */
async function runPreset(id) {
    const pset = allPresets.find(p => p.id === id);
    if (!pset) return;

    if (!confirm(`Bạn có muốn chạy kịch bản "${pset.name}" ngay bây giờ không?`)) return;

    try {
        const response = await fetch(API_RUN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ actions: pset.actions })
        });
        
        const result = await response.json();
        if (result.ok) {
            alert("Đã thực thi xong kịch bản!");
        } else {
            alert("Lỗi thực thi: " + JSON.stringify(result.error));
        }
    } catch (e) {
        alert("Lỗi kết nối server: " + e.message);
    }
}

/**
 * Add Action to Buffer (Visual only)
 */
function addActionToBuffer() {
    const type = document.getElementById("actionType").value;
    const path = document.getElementById("actionPath").value;
    const label = document.getElementById("actionLabel").value;

    if (!path) {
        alert("Vui lòng nhập đường dẫn!");
        return;
    }

    const action = {
        type: type,
        path: path,
        label: label || path.split('\\').pop() // Default label from filename
    };

    currentActions.push(action);
    renderActionBuffer();

    // Reset inputs
    document.getElementById("actionPath").value = "";
    document.getElementById("actionLabel").value = "";
}

/**
 * Remove Action from Buffer
 */
function removeActionFromBuffer(index) {
    currentActions.splice(index, 1);
    renderActionBuffer();
}

/**
 * Render Action Buffer List
 */
function renderActionBuffer() {
    const ul = document.getElementById("new-action-list");
    ul.innerHTML = "";

    if (currentActions.length === 0) {
        ul.innerHTML = '<li style="padding:1rem; color:#666; text-align:center;">Chưa có hành động nào</li>';
        return;
    }

    currentActions.forEach((act, index) => {
        const li = document.createElement("li");
        li.className = "action-item-mini";
        li.innerHTML = `
            <span>
                <b style="color:var(--color-blue)">[${act.type.toUpperCase()}]</b> 
                ${act.label} <span style="color:#999; font-size:0.8rem">(${act.path})</span>
            </span>
            <button type="button" class="pixel-button red mini" onclick="removeActionFromBuffer(${index})">X</button>
        `;
        ul.appendChild(li);
    });
}

/**
 * Handle Form Submit (Save Preset)
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    if (currentActions.length === 0) {
        alert("Vui lòng thêm ít nhất một hành động cho kịch bản!");
        return;
    }

    const formData = {
        id: editingPresetId || "preset-" + Date.now(),
        name: document.getElementById("presetName").value,
        description: document.getElementById("presetDesc").value,
        actions: currentActions
    };

    let updatedList;
    if (editingPresetId) {
        updatedList = allPresets.map((p) => (p.id === editingPresetId ? formData : p));
    } else {
        updatedList = [...allPresets, formData];
    }

    const success = await savePresetsToServer(updatedList);
    if (success) {
        allPresets = updatedList;
        cancelEdit(); // Reset form
        renderPresets();
    }
}

/**
 * Save to Server
 */
async function savePresetsToServer(list) {
    try {
        const response = await fetch(API_DATA_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(list),
        });
        return response.ok;
    } catch (error) {
        alert("Lỗi khi lưu dữ liệu!");
        return false;
    }
}

/**
 * Edit Preset
 */
function editPreset(id) {
    const pset = allPresets.find((p) => p.id === id);
    if (!pset) return;

    editingPresetId = id;
    document.getElementById("presetName").value = pset.name;
    document.getElementById("presetDesc").value = pset.description || "";
    
    // Load actions into buffer
    currentActions = [...(pset.actions || [])];
    renderActionBuffer();

    const btn = document.querySelector("#auto-form button[type='submit']");
    if (btn) btn.innerText = "CẬP NHẬT KỊCH BẢN";
    
    // Add cancel button if not existing
    // ... (simplified for now)

    window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Reset Form / Cancel Edit
 */
function cancelEdit() {
    editingPresetId = null;
    currentActions = [];
    document.getElementById("auto-form").reset();
    renderActionBuffer();
    const btn = document.querySelector("#auto-form button[type='submit']");
    if (btn) btn.innerText = "LƯU KỊCH BẢN";
}

/**
 * Delete Preset
 */
async function deletePreset(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa kịch bản này?")) return;

    const updatedList = allPresets.filter((p) => p.id !== id);
    const success = await savePresetsToServer(updatedList);
    if (success) {
        allPresets = updatedList;
        renderPresets();
    }
}
