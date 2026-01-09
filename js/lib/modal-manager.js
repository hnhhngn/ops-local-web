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
        this.body = this.overlay.querySelector('.pixel-modal-body');
        this.closeBtn = document.getElementById('btn-close-modal-global') || this.overlay.querySelector('.pixel-modal-header button');

        this.closeBtn.addEventListener('click', () => this.close());

        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
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
