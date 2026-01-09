/**
 * Reminders Management Logic
 */

const API_DATA_URL = "/api/data?file=reminders.json";
let allReminders = [];
let editingRemId = null;

document.addEventListener("DOMContentLoaded", () => {
    loadReminders();

    const form = document.getElementById("rem-form");
    if (form) {
        form.addEventListener("submit", handleFormSubmit);
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
    editingRemId = null;
    window.modalManager.open('reminder', 'THÊM NHẮC NHỞ MỚI', handleFormSubmit);
}


/**
 * Fetch reminders from server
 */
async function loadReminders() {
    try {
        const response = await fetch(API_DATA_URL);
        if (!response.ok) throw new Error("Failed to fetch reminders");
        const data = await response.json();
        allReminders = Array.isArray(data) ? data : (data ? [data] : []);
        renderReminders();
    } catch (error) {
        console.error("Error loading reminders:", error);
    }
}

/**
 * Render table
 */
function renderReminders() {
    const tbody = document.getElementById("rem-list-body");
    if (!tbody) return;

    tbody.innerHTML = "";

    // Sort by date and time
    const sorted = [...allReminders].sort((a, b) => {
        const dtA = a.date + " " + a.time;
        const dtB = b.date + " " + b.time;
        return dtA.localeCompare(dtB);
    });

    sorted.forEach((rem) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>
                <strong>${rem.eventName}</strong>
                ${rem.link ? `<br><a href="${rem.link}" target="_blank" style="font-size:0.8rem; color:var(--color-blue)">Link sự kiện</a>` : ""}
            </td>
            <td>
                <span class="event-time">${rem.date}</span><br>
                <small>${rem.time}</small>
            </td>
            <td style="font-size: 0.9rem; color: var(--color-muted)">${rem.notes || ""}</td>
            <td>
                <div class="action-btns">
                    <button class="pixel-button yellow mini" onclick="editRem('${rem.id}')">Sửa</button>
                    <button class="pixel-button red mini" onclick="deleteRem('${rem.id}')">Xóa</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Handle form
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = {
        id: editingRemId || "rem-" + Date.now(),
        eventName: document.getElementById("eventName").value,
        date: document.getElementById("date").value,
        time: document.getElementById("time").value,
        link: document.getElementById("link").value,
        notes: document.getElementById("notes").value,
    };

    let updatedList;
    if (editingRemId) {
        updatedList = allReminders.map((r) => (r.id === editingRemId ? formData : r));
    } else {
        updatedList = [...allReminders, formData];
    }

    const success = await saveRemindersToServer(updatedList);
    if (success) {
        allReminders = updatedList;
        editingRemId = null;
        document.getElementById("rem-form").reset();
        const btn = document.querySelector("#rem-form button[type='submit']");
        if (btn) btn.innerText = "LƯU NHẮC NHỞ";
        renderReminders();
        window.modalManager.close();
    }
}

/**
 * Save to server
 */
async function saveRemindersToServer(list) {
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
 * Edit
 */
function editRem(id) {
    const rem = allReminders.find((r) => r.id === id);
    if (!rem) return;

    editingRemId = id;

    window.modalManager.open('reminder', 'CẬP NHẬT NHẮC NHỞ', handleFormSubmit, () => {
        const eventNameEl = document.getElementById("eventName");
        if (eventNameEl) {
            eventNameEl.value = rem.eventName;
            document.getElementById("date").value = rem.date;
            document.getElementById("time").value = rem.time;
            document.getElementById("link").value = rem.link || "";
            document.getElementById("notes").value = rem.notes || "";

            const btn = document.querySelector("#rem-form button[type='submit']");
            if (btn) btn.innerText = "CẬP NHẬT NHẮC NHỞ";
        }
    });
}

/**
 * Delete
 */
async function deleteRem(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa nhắc nhở này?")) return;

    const updatedList = allReminders.filter((r) => r.id !== id);
    const success = await saveRemindersToServer(updatedList);
    if (success) {
        allReminders = updatedList;
        renderReminders();
    }
}
