/**
 * Command Palette & Quick Open Component
 * Handles Ctrl+P and Ctrl+Shift+P interactions
 */

class CommandPalette {
    constructor() {
        this.isOpen = false;
        this.mode = 'FILES'; // 'FILES' or 'COMMANDS'
        this.selectedIndex = 0;
        this.items = [];
        this.filteredItems = [];

        // Path logic
        this.isRoot = !window.location.pathname.includes('/pages/');
        this.prefix = this.isRoot ? 'pages/' : '';
        this.rootPath = this.isRoot ? 'index.html' : '../index.html';

        this.initUI();
        this.initEvents();

        this.registry = {
            pages: [
                { label: "Dashboard", path: this.rootPath },
                { label: "Tasks", path: this.prefix + "tasks.html" },
                { label: "Quick Access", path: this.prefix + "links.html" },
                { label: "Reminders", path: this.prefix + "reminders.html" },
                { label: "Automation", path: this.prefix + "automation.html" }
            ],
            commands: [

                {
                    label: "System: Restart Server",
                    action: () => {
                        if (confirm("Khởi động lại Server? Trình duyệt sẽ được mở lại.")) {
                            fetch("/api/launch", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ path: "bin/restart.bat" })
                            });
                        }
                    }
                },
                {
                    label: "System: Stop Server",
                    action: () => {
                        if (confirm("Dừng Server ngay lập tức?")) {
                            fetch("/api/launch", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ path: "bin/stop.bat" })
                            });
                        }
                    }
                },
                {
                    label: "System: Settings",
                    action: () => {
                        if (window.openSettingsModal) window.openSettingsModal();
                        else alert("Vui lòng truy cập Dashboard để mở Cài đặt.");
                    }
                },
                // Actions: Tasks
                {
                    label: "Tasks: Create New",
                    action: () => {
                        if (window.openTaskAddModal) window.openTaskAddModal();
                        else if (document.getElementById("btn-open-modal")) document.getElementById("btn-open-modal").click();
                        else alert("Vui lòng truy cập Dashboard hoặc trang Tasks để thực hiện.");
                    }
                },
                // Actions: Links
                {
                    label: "Links: Create New",
                    action: () => {
                        if (window.openLinkAddModal) window.openLinkAddModal();
                        else if (document.getElementById("btn-open-modal")) document.getElementById("btn-open-modal").click();
                        else window.location.href = this.prefix + 'links.html';
                    }
                },
                // Actions: Reminders
                {
                    label: "Reminders: Create New",
                    action: () => {
                        if (window.openRemAddModal) window.openRemAddModal();
                        else if (document.getElementById("btn-open-modal")) document.getElementById("btn-open-modal").click();
                        else window.location.href = this.prefix + 'reminders.html';
                    }
                },
                // Actions: Automation
                {
                    label: "Automation: Create New",
                    action: () => {
                        if (window.openAutoAddModal) window.openAutoAddModal();
                        else if (document.getElementById("btn-open-modal")) document.getElementById("btn-open-modal").click();
                        else window.location.href = this.prefix + 'automation.html';
                    }
                },

                // Layout & UI
                {
                    label: "View: Toggle Dark Mode", action: () => {
                        // Implemented in base.js or app.js? (Actually Phase 11 was reverted/mixed, let's stick to what we see)
                        // The user instructions mentioned Phase 11 was reverted. Ignoring/Hidden for now.
                    }
                },
                {
                    label: "Layout: Toggle Edit Mode", action: () => {
                        if (typeof window.toggleEditMode === 'function') window.toggleEditMode();
                    }
                },
                {
                    label: "Layout: Save Changes", action: () => {
                        if (typeof window.stopEditing === 'function') window.stopEditing(true);
                    }
                },
                {
                    label: "Layout: Discard Changes", action: () => {
                        if (typeof window.stopEditing === 'function') window.stopEditing(false);
                    }
                }
            ]
        };
    }

    initUI() {
        // Create Overlay
        this.overlay = document.createElement('div');
        this.overlay.id = 'cmd-palette-overlay';
        this.overlay.className = 'hidden';

        // Create Modal
        this.modal = document.createElement('div');
        this.modal.id = 'cmd-palette-modal';

        this.modal.innerHTML = `
            <div id="cmd-input-container">
                <input type="text" id="cmd-input" spellcheck="false" autocomplete="off">
            </div>
            <ul id="cmd-list"></ul>
        `;

        this.overlay.appendChild(this.modal);
        document.body.appendChild(this.overlay);

        this.input = this.modal.querySelector('#cmd-input');
        this.list = this.modal.querySelector('#cmd-list');
    }

    initEvents() {
        // Global Shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                if (e.shiftKey) {
                    this.open('COMMANDS');
                } else {
                    this.open('FILES');
                }
            }

            if (this.isOpen) {
                if (e.key === 'Escape') this.close();
                if (e.key === 'ArrowDown') this.navigate(1);
                if (e.key === 'ArrowUp') this.navigate(-1);
                if (e.key === 'Enter') this.execute();
            }
        });

        // Input Filtering
        this.input.addEventListener('input', () => {
            const value = this.input.value;
            if (this.mode === 'FILES' && value.startsWith('>')) {
                this.mode = 'COMMANDS';
                this.render();
            } else if (this.mode === 'COMMANDS' && !value.startsWith('>')) {
                // Keep > if backspaced? Or switch?
                // Logic usually: if it starts with >, it's commands.
            }
            this.filter();
        });

        // Click Outside to Close
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });
    }

    registerPages(pages) {
        this.registry.pages = pages;
    }

    registerCommands(commands) {
        this.registry.commands = commands;
    }

    open(mode) {
        this.isOpen = true;
        this.mode = mode;
        this.overlay.classList.remove('hidden');
        this.input.value = mode === 'COMMANDS' ? '>' : '';
        this.input.focus();
        this.selectedIndex = 0;
        this.filter();
    }

    close() {
        this.isOpen = false;
        this.overlay.classList.add('hidden');
        this.input.value = '';
    }

    filter() {
        const query = this.input.value.toLowerCase();
        let source = [];
        let searchTerm = query;

        if (query.startsWith('>')) {
            this.mode = 'COMMANDS';
            source = this.registry.commands;
            searchTerm = query.slice(1).trim();
        } else {
            this.mode = 'FILES';
            source = this.registry.pages;
        }

        const pageMapping = {
            'Tasks:': 'tasks.html',
            'Links:': 'links.html',
            'Reminders:': 'reminders.html',
            'Automation:': 'automation.html'
        };

        this.filteredItems = source.filter(item => {
            const matchesSearch = item.label.toLowerCase().includes(searchTerm);
            if (!matchesSearch) return false;

            // Contextual Filtering for Commands
            if (this.mode === 'COMMANDS') {
                const category = Object.keys(pageMapping).find(key => item.label.startsWith(key));
                if (category) {
                    // Show if on Dashboard OR on the specific page
                    if (this.isRoot) return true;
                    return window.location.pathname.includes(pageMapping[category]);
                }
            }
            return true;
        });

        this.selectedIndex = 0;
        this.render();
    }

    navigate(dir) {
        this.selectedIndex += dir;
        if (this.selectedIndex < 0) this.selectedIndex = this.filteredItems.length - 1;
        if (this.selectedIndex >= this.filteredItems.length) this.selectedIndex = 0;
        this.render();

        // Scroll into view logic
        const activeItem = this.list.children[this.selectedIndex];
        if (activeItem) {
            activeItem.scrollIntoView({ block: 'nearest' });
        }
    }

    render() {
        this.list.innerHTML = this.filteredItems.map((item, index) => `
            <li class="cmd-item ${index === this.selectedIndex ? 'selected' : ''}" data-index="${index}">
                <span class="item-label">${item.label}</span>
                <span class="item-shortcut">${item.path || 'Command'}</span>
            </li>
        `).join('');

        // Click on item
        Array.from(this.list.children).forEach((el, idx) => {
            el.onclick = () => {
                this.selectedIndex = idx;
                this.execute();
            };
        });
    }

    execute() {
        const item = this.filteredItems[this.selectedIndex];
        if (!item) return;

        if (this.mode === 'FILES') {
            window.location.href = item.path;
        } else {
            if (typeof item.action === 'function') {
                item.action();
            } else if (item.href) {
                window.location.href = item.href;
            }
        }
        this.close();
    }
}

// Global instance
window.cmdPalette = new CommandPalette();
