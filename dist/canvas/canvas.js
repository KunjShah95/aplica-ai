import { randomUUID } from 'crypto';
export class Canvas {
    state;
    history;
    historyIndex;
    maxHistory;
    listeners = new Set();
    constructor(name = 'Untitled Canvas') {
        this.state = {
            id: randomUUID(),
            name,
            elements: new Map(),
            selection: [],
            zoom: 1,
            panX: 0,
            panY: 0,
            gridEnabled: false,
            snapToGrid: true,
            gridSize: 20,
            theme: 'light',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 100;
    }
    getId() {
        return this.state.id;
    }
    getName() {
        return this.state.name;
    }
    setName(name) {
        this.state.name = name;
        this.state.updatedAt = new Date();
    }
    createElement(type, x, y, content = '', properties = {}, parentId) {
        const id = randomUUID();
        const element = {
            id,
            type,
            x: this.state.snapToGrid ? this.snapValue(x) : x,
            y: this.state.snapToGrid ? this.snapValue(y) : y,
            width: properties.width || 200,
            height: properties.height || 100,
            content,
            properties: {
                visible: true,
                selectable: true,
                draggable: true,
                resizable: true,
                ...properties,
            },
            parentId,
        };
        this.state.elements.set(id, element);
        if (parentId) {
            const parent = this.state.elements.get(parentId);
            if (parent) {
                parent.children = parent.children || [];
                parent.children.push(id);
            }
        }
        this.recordAction('element_create', {
            elementId: id,
            type,
            x,
            y,
            content,
            properties,
            parentId,
        });
        this.emit({ type: 'element_created', element });
        this.state.updatedAt = new Date();
        return element;
    }
    updateElement(id, updates) {
        const element = this.state.elements.get(id);
        if (!element)
            return null;
        if (updates.x !== undefined) {
            updates.x = this.state.snapToGrid ? this.snapValue(updates.x) : updates.x;
        }
        if (updates.y !== undefined) {
            updates.y = this.state.snapToGrid ? this.snapValue(updates.y) : updates.y;
        }
        const oldElement = { ...element };
        const updatedElement = { ...element, ...updates };
        this.state.elements.set(id, updatedElement);
        this.recordAction('element_update', {
            elementId: id,
            oldValues: oldElement,
            newValues: updates,
        });
        this.emit({ type: 'element_updated', element: updatedElement, changes: updates });
        this.state.updatedAt = new Date();
        return updatedElement;
    }
    deleteElement(id) {
        const element = this.state.elements.get(id);
        if (!element)
            return false;
        if (element.children) {
            for (const childId of element.children) {
                this.deleteElement(childId);
            }
        }
        if (element.parentId) {
            const parent = this.state.elements.get(element.parentId);
            if (parent?.children) {
                parent.children = parent.children.filter((childId) => childId !== id);
            }
        }
        this.state.elements.delete(id);
        this.state.selection = this.state.selection.filter((selId) => selId !== id);
        this.recordAction('element_delete', { elementId: id, element });
        this.emit({ type: 'element_deleted', elementId: id });
        this.state.updatedAt = new Date();
        return true;
    }
    moveElement(id, x, y) {
        return this.updateElement(id, { x, y }) !== null;
    }
    resizeElement(id, width, height) {
        return this.updateElement(id, { width, height }) !== null;
    }
    duplicateElement(id) {
        const element = this.state.elements.get(id);
        if (!element)
            return null;
        const newElement = this.createElement(element.type, element.x + 20, element.y + 20, element.content, { ...element.properties }, element.parentId);
        if (element.children) {
            for (const childId of element.children) {
                const child = this.state.elements.get(childId);
                if (child) {
                    this.duplicateElement(childId);
                }
            }
        }
        return newElement;
    }
    selectElement(id, addToSelection = false) {
        if (!addToSelection) {
            this.state.selection = [];
        }
        if (!this.state.selection.includes(id)) {
            this.state.selection.push(id);
        }
        this.emit({ type: 'selection_changed', selected: this.state.selection });
    }
    deselectElement(id) {
        this.state.selection = this.state.selection.filter((selId) => selId !== id);
        this.emit({ type: 'selection_changed', selected: this.state.selection });
    }
    clearSelection() {
        this.state.selection = [];
        this.emit({ type: 'selection_changed', selected: [] });
    }
    getSelection() {
        return [...this.state.selection];
    }
    getElement(id) {
        return this.state.elements.get(id);
    }
    getAllElements() {
        return Array.from(this.state.elements.values());
    }
    getElementsByType(type) {
        return Array.from(this.state.elements.values()).filter((el) => el.type === type);
    }
    zoomToFit() {
        if (this.state.elements.size === 0)
            return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const element of this.state.elements.values()) {
            minX = Math.min(minX, element.x);
            minY = Math.min(minY, element.y);
            maxX = Math.max(maxX, element.x + element.width);
            maxY = Math.max(maxY, element.y + element.height);
        }
        const padding = 50;
        const canvasWidth = 800;
        const canvasHeight = 600;
        const contentWidth = maxX - minX + padding * 2;
        const contentHeight = maxY - minY + padding * 2;
        const scaleX = canvasWidth / contentWidth;
        const scaleY = canvasHeight / contentHeight;
        this.state.zoom = Math.min(scaleX, scaleY, 1);
        this.state.panX = (canvasWidth - contentWidth * this.state.zoom) / 2 - minX * this.state.zoom;
        this.state.panY = (canvasHeight - contentHeight * this.state.zoom) / 2 - minY * this.state.zoom;
        this.emit({
            type: 'view_changed',
            zoom: this.state.zoom,
            panX: this.state.panX,
            panY: this.state.panY,
        });
    }
    setZoom(zoom) {
        this.state.zoom = Math.max(0.1, Math.min(10, zoom));
        this.recordAction('canvas_zoom', { zoom: this.state.zoom });
        this.emit({
            type: 'view_changed',
            zoom: this.state.zoom,
            panX: this.state.panX,
            panY: this.state.panY,
        });
    }
    setPan(panX, panY) {
        this.state.panX = panX;
        this.state.panY = panY;
        this.emit({
            type: 'view_changed',
            zoom: this.state.zoom,
            panX: this.state.panX,
            panY: this.state.panY,
        });
    }
    zoomIn() {
        this.setZoom(this.state.zoom * 1.2);
    }
    zoomOut() {
        this.setZoom(this.state.zoom / 1.2);
    }
    undo() {
        if (this.historyIndex < 0)
            return false;
        const action = this.history[this.historyIndex];
        this.historyIndex--;
        this.executeInverse(action);
        this.emit({ type: 'history_undo', action });
        return true;
    }
    redo() {
        if (this.historyIndex >= this.history.length - 1)
            return false;
        this.historyIndex++;
        const action = this.history[this.historyIndex];
        this.executeAction(action);
        this.emit({ type: 'history_redo', action });
        return true;
    }
    executeAction(action) {
        switch (action.type) {
            case 'element_create':
                const createData = action.data;
                this.state.elements.set(createData.elementId, {
                    id: createData.elementId,
                    type: createData.type,
                    x: createData.x,
                    y: createData.y,
                    width: createData.properties.width || 200,
                    height: createData.properties.height || 100,
                    content: createData.content,
                    properties: createData.properties,
                    parentId: createData.parentId,
                });
                break;
            case 'element_delete':
                const deleteData = action.data;
                this.state.elements.delete(deleteData.elementId);
                break;
            case 'element_update':
                const updateData = action.data;
                const element = this.state.elements.get(updateData.elementId);
                if (element) {
                    Object.assign(element, updateData.newValues);
                }
                break;
        }
    }
    executeInverse(action) {
        switch (action.type) {
            case 'element_create':
                const createData = action.data;
                this.state.elements.delete(createData.elementId);
                break;
            case 'element_delete':
                const deleteData = action.data;
                this.state.elements.set(deleteData.element.id, deleteData.element);
                break;
            case 'element_update':
                const updateData = action.data;
                const element = this.state.elements.get(updateData.elementId);
                if (element) {
                    Object.assign(element, updateData.oldValues);
                }
                break;
        }
    }
    recordAction(type, data) {
        const action = {
            id: randomUUID(),
            type,
            timestamp: new Date(),
            userId: 'system',
            data,
        };
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(action);
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(-this.maxHistory);
        }
        this.historyIndex = this.history.length - 1;
    }
    serialize() {
        const elements = {};
        for (const [id, element] of this.state.elements.entries()) {
            elements[id] = element;
        }
        return JSON.stringify({
            id: this.state.id,
            name: this.state.name,
            elements,
            zoom: this.state.zoom,
            panX: this.state.panX,
            panY: this.state.panY,
            gridEnabled: this.state.gridEnabled,
            snapToGrid: this.state.snapToGrid,
            gridSize: this.state.gridSize,
            theme: this.state.theme,
            createdAt: this.state.createdAt,
            updatedAt: this.state.updatedAt,
        }, null, 2);
    }
    deserialize(json) {
        const data = JSON.parse(json);
        this.state.id = data.id;
        this.state.name = data.name;
        this.state.elements = new Map(Object.entries(data.elements));
        this.state.zoom = data.zoom;
        this.state.panX = data.panX;
        this.state.panY = data.panY;
        this.state.gridEnabled = data.gridEnabled;
        this.state.snapToGrid = data.snapToGrid;
        this.state.gridSize = data.gridSize;
        this.state.theme = data.theme;
        this.state.updatedAt = new Date();
        this.emit({ type: 'canvas_loaded', canvasId: this.state.id });
    }
    clear() {
        this.state.elements.clear();
        this.state.selection = [];
        this.history = [];
        this.historyIndex = -1;
        this.state.updatedAt = new Date();
        this.emit({ type: 'canvas_cleared' });
    }
    on(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    emit(event) {
        for (const listener of this.listeners) {
            listener(event);
        }
    }
    snapValue(value) {
        return Math.round(value / this.state.gridSize) * this.state.gridSize;
    }
    getState() {
        const elements = {};
        for (const [id, element] of this.state.elements.entries()) {
            elements[id] = element;
        }
        return {
            id: this.state.id,
            name: this.state.name,
            elements: new Map(Object.entries(elements)),
            selection: this.state.selection,
            zoom: this.state.zoom,
            panX: this.state.panX,
            panY: this.state.panY,
            gridEnabled: this.state.gridEnabled,
            snapToGrid: this.state.snapToGrid,
            gridSize: this.state.gridSize,
            theme: this.state.theme,
        };
    }
}
export const createCanvas = (name) => new Canvas(name);
//# sourceMappingURL=canvas.js.map