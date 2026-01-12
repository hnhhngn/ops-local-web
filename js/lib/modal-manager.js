/**
 * Modal Manager
 * Handles dynamic modal rendering and interaction for the entire application.
 * Depends on: js/templates/forms.js (FormTemplates)
 */
class ModalManager {
    constructor() {
        this.overlay = null;
        this.modal = null;
        this.headerTitle = null;
        this.body = null;
        this.closeBtn = null;
        this.init();
    }

    init() {
        // Create Modal HTML Structure if it doesn't exist (or rely on existing static one)
        // For Phase 13, we assume the shared modal structure exists in the DOM (added via index.html or dynamic injection).
        // Let's check or create it dynamicially to be safe and "Write Once".

        let existing = document.getElementById('modal-overlay');
        if (!existing) {
            const html = `
            <div id="modal-overlay" class="pixel-modal-overlay hidden">
                <div class="pixel-modal">
                    <div class="pixel-modal-header">
                        <h2>TITLE</h2>
                        <button id="btn-close-modal-global" class="pixel-button red mini">X</button>
                    </div>
                    <div class="pixel-modal-body pixel-scrollbar">
                        <!-- Content Injected Here -->
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', html);
        }

        this.overlay = document.getElementById('modal-overlay');
        this.modal = this.overlay.querySelector('.pixel-modal');
        this.headerTitle = this.overlay.querySelector('.pixel-modal-header h2');

        // Ensure Save button exists in header (Backward compatibility if HTML is static)
        let headerActions = this.overlay.querySelector('.pixel-modal-header .header-actions');
        if (!headerActions) {
            // Re-structure header if needed or just append
            const header = this.overlay.querySelector('.pixel-modal-header');
            const closeBtn = header.querySelector('button'); // existing close button

            // Create a wrapper for actions if not exists
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'header-actions';
            actionsDiv.style.display = 'flex';
            actionsDiv.style.gap = '0.5rem';

            // Move close button into actions
            if (closeBtn) {
                header.removeChild(closeBtn);
                actionsDiv.appendChild(closeBtn);
            }

            header.appendChild(actionsDiv);
            headerActions = actionsDiv;
        }

        // Add Save Button if not exists
        let saveBtn = document.getElementById('btn-save-modal-global');
        if (!saveBtn) {
            saveBtn = document.createElement('button');
            saveBtn.id = 'btn-save-modal-global';
            saveBtn.className = 'pixel-button blue mini hidden';
            saveBtn.textContent = 'LƯU';
            saveBtn.style.marginRight = '0.5rem';
            headerActions.insertBefore(saveBtn, headerActions.firstChild);
        }

        this.body = this.overlay.querySelector('.pixel-modal-body');
        this.closeBtn = document.getElementById('btn-close-modal-global') || this.overlay.querySelector('.pixel-modal-header button');
        this.saveBtn = document.getElementById('btn-save-modal-global');

        this.closeBtn.addEventListener('click', () => this.close());
        this.saveBtn.addEventListener('click', () => {
            const form = this.body.querySelector('form');
            if (form) {
                // Trigger native submit to validation HTML5
                if (form.reportValidity()) {
                    form.dispatchEvent(new Event('submit', { cancelable: true }));
                }
            }
        });

        // Global keydown for Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.overlay.classList.contains('hidden')) {
                this.close();
            }
        });
    }

    /**
     * Open Modal with specific content
     * @param {string} type - 'task', 'link', 'reminder', 'automation'
     * @param {string} title - Header title
     * @param {Function} onSubmit - Callback when form is submitted
     * @param {Function} onRender - Callback after HTML is injected (for binding events like AddAction)
     */
    open(type, title, onSubmit, onRender = null) {
        // Show Save Button by default for forms, logic can be refined
        if (this.saveBtn) {
            this.saveBtn.classList.remove('hidden');
        }
        const template = window.FormTemplates[type];
        if (!template) {
            console.error(`Template type '${type}' not found.`);
            return;
        }

        // 1. Inject HTML
        this.body.innerHTML = template;
        this.headerTitle.textContent = title;

        // 2. Bind Submit Event
        const form = this.body.querySelector('form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                if (onSubmit) onSubmit(e);
            });
        }

        // 3. Optional: Run post-render logic (for complex forms)
        if (onRender && typeof onRender === 'function') {
            onRender(this.body);
        }

        // 4. Show Modal
        this.overlay.classList.remove('hidden');
    }

    close() {
        this.overlay.classList.add('hidden');
        // Optional: clear body after transition to save memory?
        setTimeout(() => {
            if (this.overlay.classList.contains('hidden')) {
                this.body.innerHTML = '';
            }
        }, 200);
    }
}

// Export global instance
window.modalManager = new ModalManager();
