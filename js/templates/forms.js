/**
 * HTML Templates for Modals
 * Centralized source of truth for all management forms.
 */
const FormTemplates = {
    // Task Form (Extended with QA, Bug, Sub-tasks)
    task: `
        <form id="task-form" class="task-modal-grid">
            <!-- LEFT COLUMN -->
            <div class="task-col-left">
                <!-- Row 1: Name & Parent -->
                <div class="form-row">
                    <div class="form-group" style="flex: 2;">
                        <label for="name">Tên công việc</label>
                        <input type="text" id="name" name="name" class="pixel-input" placeholder="Nhập tên..." required>
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label for="parentId">Task cha</label>
                        <select id="parentId" name="parentId" class="pixel-input">
                            <option value="">-- Gốc --</option>
                            <!-- Options sẽ được inject bởi JS -->
                        </select>
                    </div>
                </div>

                <!-- Row 2: Type, Priority, Progress -->
                <div class="form-row">
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
                            <option value="medium">TB</option>
                            <option value="high">Cao</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="progress">Tiến độ (%)</label>
                        <input type="number" id="progress" name="progress" class="pixel-input" min="0" max="100" value="0">
                    </div>
                </div>

                <!-- Row 3: Start & End Date -->
                <div class="form-row">
                    <div class="form-group">
                        <label for="startDate">Ngày bắt đầu</label>
                        <input type="date" id="startDate" name="startDate" class="pixel-input">
                    </div>
                    <div class="form-group">
                        <label for="endDate">Ngày kết thúc</label>
                        <input type="date" id="endDate" name="endDate" class="pixel-input">
                    </div>
                </div>

                <!-- Row 4: Notes (fills remaining height) -->
                <div class="form-group checkbox-grow">
                    <label for="notes">Ghi chú</label>
                    <textarea id="notes" class="pixel-input full-height" style="resize: none;"></textarea>
                </div>
            </div>

            <!-- RIGHT COLUMN -->
            <div class="task-col-right">
                <!-- QA LIST SECTION -->
                <div class="form-group item-list-section no-border-top">
                    <label>📝 Danh sách QA</label>
                    <div class="item-input-row">
                        <input type="text" id="qaLabel" class="pixel-input" placeholder="Tên QA..." style="flex:1;">
                        <input type="url" id="qaLink" class="pixel-input" placeholder="Link..." style="flex:1;">
                        <button type="button" class="pixel-button green mini" id="btnAddQa" style="min-width: 30px;">+</button>
                    </div>
                    <!-- Fixed height container for exactly 3 items -->
                    <ul id="qa-list" class="item-list-mini fixed-list pixel-scrollbar"></ul>
                </div>

                <!-- BUG LIST SECTION -->
                <div class="form-group item-list-section">
                    <label>🐛 Danh sách Bug</label>
                    <div class="item-input-row">
                        <input type="text" id="bugLabel" class="pixel-input" placeholder="Mô tả bug..." style="flex:1;">
                        <input type="url" id="bugLink" class="pixel-input" placeholder="Link..." style="flex:1;">
                        <button type="button" class="pixel-button red mini" id="btnAddBug" style="min-width: 30px;">+</button>
                    </div>
                    <!-- Fixed height container for exactly 3 items -->
                    <ul id="bug-list" class="item-list-mini fixed-list pixel-scrollbar"></ul>
                </div>
            </div>

            <!-- Save Button moved to Header -->
            <div class="form-group" style="display: none;"></div>
        </form>
    `,

    // Link Form
    link: `
        <form id="link-form" class="form-grid">
            <div class="form-group" style="grid-column: span 2;">
                <label for="label">Tên hiển thị</label>
                <input type="text" id="label" name="label" class="pixel-input" placeholder="Ví dụ: Project Alpha" required>
            </div>
            <div class="form-group" style="grid-column: span 2;">
                <label for="path">Đường dẫn (URL / Folder / File)</label>
                <input type="text" id="path" name="path" class="pixel-input" placeholder="C:\\Projects\\... hoặc https://..." required>
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
            <!-- Save Button moved to Header -->
            <div class="form-group" style="grid-column: span 2; display: none;"></div>
        </form>
    `,

    // Reminder Form
    reminder: `
        <form id="rem-form" class="form-grid">
            <div class="form-group" style="grid-column: span 2;">
                <label for="eventName">Tên sự kiện / Nhắc nhở</label>
                <input type="text" id="eventName" name="eventName" class="pixel-input" placeholder="Ví dụ: Họp Sprint, Gửi báo cáo" required>
            </div>
            <div class="form-group">
                <label for="date">Ngày diễn ra</label>
                <input type="date" id="date" name="date" class="pixel-input" required>
            </div>
            <div class="form-group">
                <label for="time">Thời gian</label>
                <input type="time" id="time" name="time" class="pixel-input" required>
            </div>
            <div class="form-group" style="grid-column: span 2;">
                <label for="repeat">Lặp lại</label>
                <select id="repeat" name="repeat" class="pixel-input">
                    <option value="none">Không lặp</option>
                    <option value="daily">Hàng ngày</option>
                    <option value="weekly">Hàng tuần</option>
                    <option value="monthly">Hàng tháng</option>
                </select>
            </div>
            <div class="form-group" style="grid-column: span 2;">
                <label for="link">Đường dẫn liên quan (URL)</label>
                <input type="url" id="link" name="link" class="pixel-input" placeholder="https://...">
            </div>
            <div class="form-group" style="grid-column: span 2;">
                <label for="notes">Ghi chú thêm</label>
                <textarea id="notes" class="pixel-input" rows="2"></textarea>
            </div>
            <!-- Save Button moved to Header -->
            <div class="form-group" style="grid-column: span 2; display: none;"></div>
        </form>
    `,

    // Automation Form
    automation: `
        <form id="auto-form" class="auto-modal-grid">
            <!-- LEFT COLUMN: Info (25%) -->
            <div class="auto-col-left">
                <div class="form-group">
                    <label for="presetName">Tên Kịch Bản</label>
                    <input type="text" id="presetName" name="presetName" class="pixel-input" placeholder="Ví dụ: Start Coding Session" required>
                </div>
                <!-- Description grows to fill height -->
                <div class="form-group checkbox-grow">
                    <label for="presetDesc">Mô tả</label>
                    <textarea id="presetDesc" class="pixel-input full-height" style="resize: none;" placeholder="Mở VS Code, Chrome và Spotify..."></textarea>
                </div>
            </div>

            <!-- RIGHT COLUMN: Actions (75%) -->
            <div class="auto-col-right">
                <div class="form-group item-list-section no-border-top full-height-section">
                    <label>DANH SÁCH HÀNH ĐỘNG (STEPS)</label>
                    
                    <!-- Action Inputs -->
                    <div class="action-input-row" style="display:flex; gap:0.5rem; margin-bottom:0.5rem; align-items:flex-end;">
                        <div class="form-group" style="width: 120px;">
                            <label style="font-size: 0.8rem;">Loại</label>
                            <select id="actionType" class="pixel-input">
                                <option value="open">Mở App/File</option>
                            </select>
                        </div>
                        <div class="form-group" style="flex: 4;">
                            <label style="font-size: 0.8rem;">Đường dẫn (Path)</label>
                            <input type="text" id="actionPath" class="pixel-input" placeholder="C:\\Windows\\System32\\calc.exe...">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label style="font-size: 0.8rem;">Nhãn</label>
                            <input type="text" id="actionLabel" class="pixel-input" placeholder="Tên...">
                        </div>
                        <button type="button" class="pixel-button green mini" id="btnAddAction" style="min-width: 40px; height: 32px;">+</button>
                    </div>

                    <!-- Action List -->
                    <ul id="new-action-list" class="item-list-mini auto-list-fill pixel-scrollbar">
                        <li id="empty-action-msg" style="padding:1rem; color:#666; text-align:center;">Chưa có hành động nào</li>
                    </ul>
                </div>
            </div>

            <!-- Save Button moved to Header -->
            <div class="form-group" style="display: none;"></div>
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
