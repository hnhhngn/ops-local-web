/**
 * HTML Templates for Modals
 * Centralized source of truth for all management forms.
 */
const FormTemplates = {
    // Task Form
    task: `
        <form id="task-form" class="form-grid">
            <div class="form-group" style="grid-column: span 2;">
                <label for="name">Tên công việc</label>
                <input type="text" id="name" class="pixel-input" placeholder="Nhập tên..." required>
            </div>
            <div class="form-group">
                <label for="type">Loại</label>
                <select id="type" class="pixel-input">
                    <option value="code">Code</option>
                    <option value="test">Test</option>
                    <option value="design">Design</option>
                    <option value="confirm">Confirm</option>
                    <option value="custom">Tùy chỉnh</option>
                </select>
            </div>
            <div class="form-group">
                <label for="priority">Độ ưu tiên</label>
                <select id="priority" class="pixel-input">
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                </select>
            </div>
            <div class="form-group">
                <label for="startDate">Ngày bắt đầu</label>
                <input type="date" id="startDate" class="pixel-input">
            </div>
            <div class="form-group">
                <label for="endDate">Ngày kết thúc</label>
                <input type="date" id="endDate" class="pixel-input">
            </div>
            <div class="form-group">
                <label for="progress">Tiến độ (%)</label>
                <input type="number" id="progress" class="pixel-input" min="0" max="100" value="0">
            </div>
            <div class="form-group" style="grid-column: span 2;">
                <label for="notes">Ghi chú</label>
                <textarea id="notes" class="pixel-input" rows="3"></textarea>
            </div>
            <div class="form-group" style="grid-column: span 2; align-items: flex-end; margin-top: 1rem;">
                <button type="submit" class="pixel-button blue full-width">LƯU CÔNG VIỆC</button>
            </div>
        </form>
    `,

    // Link Form
    link: `
        <form id="link-form" class="form-grid">
            <div class="form-group" style="grid-column: span 2;">
                <label for="label">Tên hiển thị</label>
                <input type="text" id="label" class="pixel-input" placeholder="Ví dụ: Project Alpha" required>
            </div>
            <div class="form-group" style="grid-column: span 2;">
                <label for="path">Đường dẫn (URL / Folder / File)</label>
                <input type="text" id="path" class="pixel-input" placeholder="C:\\Projects\\... hoặc https://..." required>
            </div>
            <div class="form-group">
                <label for="type">Loại tài nguyên</label>
                <select id="type" class="pixel-input">
                    <option value="url">🌐 Website (URL)</option>
                    <option value="folder">📁 Thư mục (Folder)</option>
                    <option value="file">📄 File / Ứng dụng</option>
                </select>
            </div>
            <div class="form-group">
                <label for="group">Nhóm</label>
                <select id="group" class="pixel-input">
                    <option value="common">Chung</option>
                    <option value="work">Công việc</option>
                    <option value="personal">Cá nhân</option>
                </select>
            </div>
            <div class="form-group" style="grid-column: span 2; align-items: flex-end; margin-top: 1rem;">
                <button type="submit" class="pixel-button green full-width">LƯU ĐƯỜNG DẪN</button>
            </div>
        </form>
    `,

    // Reminder Form
    reminder: `
        <form id="rem-form" class="form-grid">
            <div class="form-group" style="grid-column: span 2;">
                <label for="eventName">Tên sự kiện / Nhắc nhở</label>
                <input type="text" id="eventName" class="pixel-input" placeholder="Ví dụ: Họp Sprint, Gửi báo cáo" required>
            </div>
            <div class="form-group">
                <label for="date">Ngày diễn ra</label>
                <input type="date" id="date" class="pixel-input" required>
            </div>
            <div class="form-group">
                <label for="time">Thời gian</label>
                <input type="time" id="time" class="pixel-input" required>
            </div>
            <div class="form-group" style="grid-column: span 2;">
                <label for="link">Đường dẫn liên quan (URL)</label>
                <input type="url" id="link" class="pixel-input" placeholder="https://...">
            </div>
            <div class="form-group" style="grid-column: span 2;">
                <label for="notes">Ghi chú thêm</label>
                <textarea id="notes" class="pixel-input" rows="2"></textarea>
            </div>
            <div class="form-group" style="grid-column: span 2; align-items: flex-end; margin-top: 1rem;">
                <button type="submit" class="pixel-button yellow full-width" style="color: black;">LƯU NHẮC NHỞ</button>
            </div>
        </form>
    `,

    // Automation Form
    automation: `
        <form id="auto-form" class="form-grid">
            <div class="form-group" style="grid-column: span 2;">
                <label for="presetName">Tên Kịch Bản (Preset Name)</label>
                <input type="text" id="presetName" class="pixel-input" placeholder="Ví dụ: Start Coding Session" required>
            </div>
            <div class="form-group" style="grid-column: span 2;">
                <label for="presetDesc">Mô tả</label>
                <textarea id="presetDesc" class="pixel-input" rows="2" placeholder="Mở VS Code, Chrome và Spotify..."></textarea>
            </div>

            <!-- ACTION BUILDER -->
            <div class="action-builder" style="grid-column: span 2; margin-top: 1rem; border: var(--border-width) dashed var(--color-black); padding: 1rem;">
                <label style="display:block; margin-bottom:0.5rem; font-weight:bold;">DANH SÁCH HÀNH ĐỘNG (STEPS)</label>

                <div class="action-input-row" style="display:flex; gap:0.5rem; margin-bottom:1rem; align-items:flex-end;">
                    <div class="form-group" style="flex: 1;">
                        <label style="font-size: 0.8rem;">Loại</label>
                        <select id="actionType" class="pixel-input">
                            <option value="open">Mở Ứng dụng/Folder</option>
                        </select>
                    </div>
                    <div class="form-group" style="flex: 3;">
                        <label style="font-size: 0.8rem;">Đường dẫn (Path)</label>
                        <input type="text" id="actionPath" class="pixel-input" placeholder="C:\\App.exe hoặc Folder...">
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label style="font-size: 0.8rem;">Nhãn (Label)</label>
                        <input type="text" id="actionLabel" class="pixel-input" placeholder="Tên app...">
                    </div>
                    <button type="button" class="pixel-button green mini" id="btnAddAction">THÊM</button>
                </div>

                <ul id="new-action-list" class="action-list-mini pixel-scrollbar" style="max-height: 200px; overflow-y: auto; background: #f0f0f0; border: 1px solid #000; padding: 0.5rem; list-style: none;">
                    <!-- Items added via JS -->
                    <li id="empty-action-msg" style="padding:1rem; color:#666; text-align:center;">Chưa có hành động nào</li>
                </ul>
            </div>

            <div class="form-group" style="grid-column: span 2; align-items: flex-end; margin-top: 1rem;">
                <button type="submit" class="pixel-button red full-width">LƯU KỊCH BẢN</button>
            </div>
        </form>
    `,

    // Settings Form
    settings: `
        <div id="settings-form" class="form-grid">
            <div class="form-group" style="grid-column: span 2;">
                <h3 style="margin-bottom: 0.5rem; border-bottom: 2px solid var(--color-black); padding-bottom: 0.2rem;">CẤU HÌNH HỆ THỐNG</h3>
            </div>
            
            <div class="form-group" style="grid-column: span 2; display: flex; justify-content: space-between; align-items: center; background: #eee; padding: 0.5rem; border: 1px solid #ccc;">
                <div>
                    <strong style="display: block;">Tự chạy khi mở máy (Auto Startup)</strong>
                    <small style="color: #666;">Server sẽ tự động chạy và mở trình duyệt khi bạn đăng nhập Windows.</small>
                </div>
                <div class="pixel-switch-container">
                    <button id="btn-toggle-startup" class="pixel-button mini gray">ĐANG KIỂM TRA...</button>
                </div>
            </div>

            <div class="form-group" style="grid-column: span 2; margin-top: 1rem;">
                <h3 style="margin-bottom: 0.5rem; border-bottom: 2px solid var(--color-black); padding-bottom: 0.2rem;">PHIÊN BẢN & THÔNG TIN</h3>
                <p style="font-size: 0.9rem;">IJS Ops Dashboard v1.0.0-Core</p>
                <p style="font-size: 0.8rem; color: #666;">Cổng (Port): 8087</p>
            </div>
        </div>
    `
};

window.FormTemplates = FormTemplates;
