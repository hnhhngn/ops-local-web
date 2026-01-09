/**
 * OpsGrid Library
 * A standalone grid drag-and-drop and resize manager for IJS Ops Dashboard.
 * Option A: Global Namespace approach.
 */

window.OpsGrid = class OpsGrid {
    /**
     * @param {Object} config
     * @param {HTMLElement} config.container - The dashboard grid container
     * @param {HTMLElement} config.ghost - The preview ghost element
     * @param {Function} config.onLayoutChange - Callback when layout changes (save trigger)
     */
    constructor(config) {
        this.container = config.container;
        this.ghost = config.ghost;
        this.onLayoutChange = config.onLayoutChange || (() => {});
        
        this.isEditing = false;
        this.colSize = 0;
        this.rowSize = 0;
        this.containerRect = null;
        
        // Internal state
        this.resizeConfig = null;
        
        this.init();
    }

    init() {
        if (!this.container) return;
        
        // Bind Drag Events
        this.container.addEventListener("dragstart", this.handleDragStart.bind(this));
        this.container.addEventListener("dragover", this.handleDragOver.bind(this));
        this.container.addEventListener("drop", this.handleDrop.bind(this));
        this.container.addEventListener("dragend", this.handleDragEnd.bind(this));
        
        // Bind Resize Events
        this.container.addEventListener("mousedown", this.handleMouseDown.bind(this));
        window.addEventListener("mousemove", this.handleMouseMove.bind(this));
        window.addEventListener("mouseup", this.handleMouseUp.bind(this));
        
        console.log("OpsGrid Library initialized with Drag & Resize support.");
    }

    handleDragStart(e) {
        if (!this.isEditing) return;

        const widget = e.target.closest(".pixel-widget");
        if (!widget) return;

        // Coordinates check for drag handle (top-left 40x40px)
        const rect = widget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (x > 40 || y > 40) {
            e.preventDefault();
            return;
        }

        widget.classList.add("is-dragging");
        const metrics = this.getWidgetMetrics(widget);

        widget.dataset.w = metrics.w;
        widget.dataset.h = metrics.h;

        e.dataTransfer.setData("text/plain", widget.id);

        this.ghost.style.gridColumn = `span ${metrics.w}`;
        this.ghost.style.gridRow = `span ${metrics.h}`;
        this.ghost.classList.add("is-visible");
    }

    handleDragOver(e) {
        if (!this.isEditing) return;
        e.preventDefault();

        const draggingWidget = this.container.querySelector(".is-dragging");
        if (!draggingWidget) return;

        this.updateCache();

        const w = parseInt(draggingWidget.dataset.w);
        const h = parseInt(draggingWidget.dataset.h);

        let newCol = Math.floor((e.clientX - this.containerRect.left) / this.colSize) + 1;
        let newRow = Math.floor((e.clientY - this.containerRect.top) / this.rowSize) + 1;

        newCol = Math.max(1, Math.min(newCol, 25 - w));
        newRow = Math.max(1, Math.min(newRow, 25 - h));

        this.ghost.style.gridColumn = `${newCol} / span ${w}`;
        this.ghost.style.gridRow = `${newRow} / span ${h}`;

        const proposed = { x1: newCol, y1: newRow, x2: newCol + w, y2: newRow + h };
        const otherWidgets = Array.from(this.container.querySelectorAll(".pixel-widget")).filter(
            (w) => w.id !== draggingWidget.id
        );

        const isColliding = this.checkCollision(proposed, otherWidgets, draggingWidget.id);

        if (isColliding) {
            this.ghost.classList.add("invalid");
            this.ghost.classList.remove("valid");
        } else {
            this.ghost.classList.add("valid");
            this.ghost.classList.remove("invalid");
        }
    }

    handleDrop(e) {
        if (!this.isEditing) return;
        e.preventDefault();
        this.hideGhost();

        const id = e.dataTransfer.getData("text/plain");
        const draggingWidget = document.getElementById(id);
        if (!draggingWidget) return;

        const w = parseInt(draggingWidget.dataset.w);
        const h = parseInt(draggingWidget.dataset.h);

        let newCol = Math.floor((e.clientX - this.containerRect.left) / this.colSize) + 1;
        let newRow = Math.floor((e.clientY - this.containerRect.top) / this.rowSize) + 1;
        newCol = Math.max(1, Math.min(newCol, 25 - w));
        newRow = Math.max(1, Math.min(newRow, 25 - h));

        const proposed = { x1: newCol, y1: newRow, x2: newCol + w, y2: newRow + h };
        const otherWidgets = Array.from(this.container.querySelectorAll(".pixel-widget")).filter(
            (w) => w.id !== id
        );

        const isColliding = this.checkCollision(proposed, otherWidgets, id);

        if (!isColliding) {
            draggingWidget.style.gridColumn = `${newCol} / span ${w}`;
            draggingWidget.style.gridRow = `${newRow} / span ${h}`;
            this.onLayoutChange(); // Trigger save callback
        }
    }

    handleDragEnd() {
        const widgets = this.container.querySelectorAll(".pixel-widget");
        widgets.forEach((w) => w.classList.remove("is-dragging"));
        this.hideGhost();
    }

    /* ============================== RESIZE HANDLERS ============================== */

    handleMouseDown(e) {
        if (!this.isEditing) return;
        const handle = e.target.closest(".resize-handle");
        if (!handle) return;

        e.preventDefault();
        e.stopPropagation();

        const widget = handle.closest(".pixel-widget");
        if (!widget) return;

        const metrics = this.getWidgetMetrics(widget);
        this.resizeConfig = {
            widget,
            direction: handle.dataset.direction,
            startMetrics: metrics,
            startMouse: { x: e.clientX, y: e.clientY },
            latestValid: null
        };

        widget.classList.add("is-resizing");
        this.ghost.style.gridColumn = widget.style.gridColumn;
        this.ghost.style.gridRow = widget.style.gridRow;
        this.ghost.classList.add("is-visible", "valid");
    }

    handleMouseMove(e) {
        if (!this.isEditing || !this.resizeConfig) return;

        this.updateCache();
        const { direction, startMetrics, startMouse } = this.resizeConfig;

        const deltaX = e.clientX - startMouse.x;
        const deltaY = e.clientY - startMouse.y;

        const deltaCol = Math.round(deltaX / this.colSize);
        const deltaRow = Math.round(deltaY / this.rowSize);

        let props = {
            x1: startMetrics.x1,
            y1: startMetrics.y1,
            w: startMetrics.w,
            h: startMetrics.h,
        };

        if (direction === "e") {
            props.w = Math.max(1, startMetrics.w + deltaCol);
        } else if (direction === "s") {
            props.h = Math.max(1, startMetrics.h + deltaRow);
        } else if (direction === "w") {
            const maxPossibleX1 = startMetrics.x2 - 1;
            const newX1 = Math.max(1, Math.min(startMetrics.x1 + deltaCol, maxPossibleX1));
            const actualDelta = startMetrics.x1 - newX1;
            props.x1 = newX1;
            props.w = startMetrics.w + actualDelta;
        } else if (direction === "n") {
            const maxPossibleY1 = startMetrics.y2 - 1;
            const newY1 = Math.max(1, Math.min(startMetrics.y1 + deltaRow, maxPossibleY1));
            const actualDelta = startMetrics.y1 - newY1;
            props.y1 = newY1;
            props.h = startMetrics.h + actualDelta;
        }

        props.x2 = props.x1 + props.w;
        props.y2 = props.y1 + props.h;

        // Grid Bounds check
        if (props.x2 > 25) props.w = 25 - props.x1;
        if (props.y2 > 25) props.h = 25 - props.y1;

        // Ghost preview update
        this.ghost.style.gridColumn = `${props.x1} / span ${props.w}`;
        this.ghost.style.gridRow = `${props.y1} / span ${props.h}`;

        const otherWidgets = Array.from(this.container.querySelectorAll(".pixel-widget")).filter(
            (w) => w.id !== this.resizeConfig.widget.id
        );
        
        const isColliding = this.checkCollision(props, otherWidgets, this.resizeConfig.widget.id);

        if (isColliding) {
            this.ghost.classList.add("invalid");
            this.ghost.classList.remove("valid");
        } else {
            this.ghost.classList.add("valid");
            this.ghost.classList.remove("invalid");
        }

        this.resizeConfig.latestValid = isColliding ? null : props;
    }

    handleMouseUp() {
        if (!this.resizeConfig) return;

        if (this.resizeConfig.latestValid) {
            const p = this.resizeConfig.latestValid;
            const w = this.resizeConfig.widget;
            w.style.gridColumn = `${p.x1} / span ${p.w}`;
            w.style.gridRow = `${p.y1} / span ${p.h}`;
            w.dataset.w = p.w;
            w.dataset.h = p.h;
            
            this.onLayoutChange(); // Trigger save callback
        }

        this.resizeConfig.widget.classList.remove("is-resizing");
        this.resizeConfig = null;
        this.hideGhost();
    }

    setEditing(val) {
        this.isEditing = val;
    }

    /**
     * Update internal measurement cache for responsive grid
     */
    updateCache() {
        if (!this.container) return;
        this.containerRect = this.container.getBoundingClientRect();
        this.colSize = this.containerRect.width / 24;
        this.rowSize = this.containerRect.height / 24;
    }
    /**
     * Extract widget position and size from DOM and styles
     * @param {HTMLElement} widget 
     */
    getWidgetMetrics(widget) {
        const style = window.getComputedStyle(widget);
        const colPart = style.gridColumnStart; // e.g., "1" or "1 / span 4"
        const rowPart = style.gridRowStart;

        const x1 = parseInt(colPart) || 1;
        const y1 = parseInt(rowPart) || 1;
        const w = parseInt(widget.dataset.w) || 4;
        const h = parseInt(widget.dataset.h) || 4;

        return { x1, y1, w, h, x2: x1 + w, y2: y1 + h };
    }

    /**
     * Check if a proposed position and size collides with existing widgets
     */
    checkCollision(proposed, widgets, excludeId) {
        // AABB collision detection
        return widgets.some((w) => {
            if (w.id === excludeId) return false;
            const m = this.getWidgetMetrics(w);
            return (
                proposed.x1 < m.x2 &&
                proposed.x2 > m.x1 &&
                proposed.y1 < m.y2 &&
                proposed.y2 > m.y1
            );
        });
    }

    /**
     * Hide the ghost element
     */
    hideGhost() {
        if (this.ghost) {
            this.ghost.classList.remove("is-visible", "valid", "invalid");
        }
    }
};
