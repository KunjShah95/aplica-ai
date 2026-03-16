import { createCanvas } from '../canvas/canvas.js';
export class LiveCanvasManager {
    canvases = new Map();
    eventListeners = new Map();
    createCanvas(name) {
        const canvas = createCanvas(name);
        this.canvases.set(canvas.getId(), canvas);
        const emitEvent = (event) => {
            const listeners = this.eventListeners.get(canvas.getId());
            if (listeners) {
                const message = {
                    type: 'canvas_event',
                    payload: {
                        canvasId: canvas.getId(),
                        event,
                        timestamp: new Date(),
                    },
                };
                listeners.forEach((listener) => listener(message));
            }
        };
        canvas.on(emitEvent);
        return canvas;
    }
    getCanvas(canvasId) {
        return this.canvases.get(canvasId);
    }
    deleteCanvas(canvasId) {
        this.eventListeners.delete(canvasId);
        return this.canvases.delete(canvasId);
    }
    listCanvases() {
        return Array.from(this.canvases.entries()).map(([id, canvas]) => ({
            id,
            name: canvas.getName(),
            elementCount: canvas.getAllElements().length,
        }));
    }
    handleRenderRequest(request) {
        const { canvasId, elements, action } = request.payload;
        if (!canvasId) {
            const canvas = this.createCanvas();
            if (elements) {
                for (const el of elements) {
                    canvas.createElement(el.type, el.x, el.y, el.content, el.properties);
                }
            }
            return {
                type: 'canvas_event',
                payload: {
                    canvasId: canvas.getId(),
                    event: { type: 'canvas_loaded', canvasId: canvas.getId() },
                    timestamp: new Date(),
                },
            };
        }
        const canvas = this.canvases.get(canvasId);
        if (!canvas)
            return null;
        if (action) {
            switch (action.type) {
                case 'create':
                    if (action.element) {
                        canvas.createElement(action.element.type, action.element.x, action.element.y, action.element.content, action.element.properties);
                    }
                    break;
                case 'update':
                    if (action.elementId && action.updates) {
                        canvas.updateElement(action.elementId, action.updates);
                    }
                    break;
                case 'delete':
                    if (action.elementId) {
                        canvas.deleteElement(action.elementId);
                    }
                    break;
                case 'clear':
                    canvas.clear();
                    break;
            }
        }
        return {
            type: 'canvas_event',
            payload: {
                canvasId,
                event: { type: 'canvas_loaded', canvasId },
                timestamp: new Date(),
            },
        };
    }
    handleInteraction(event) {
        const canvas = this.canvases.get(event.payload.canvasId);
        if (!canvas)
            return;
        const { elementId, interaction } = event.payload;
        if (interaction === 'click' && elementId) {
            canvas.selectElement(elementId);
        }
        const listeners = this.eventListeners.get(event.payload.canvasId);
        if (listeners) {
            listeners.forEach((listener) => listener(event));
        }
    }
    on(canvasId, listener) {
        if (!this.eventListeners.has(canvasId)) {
            this.eventListeners.set(canvasId, new Set());
        }
        this.eventListeners.get(canvasId).add(listener);
        return () => {
            this.eventListeners.get(canvasId)?.delete(listener);
        };
    }
    serializeCanvas(canvasId) {
        const canvas = this.canvases.get(canvasId);
        return canvas?.serialize() || null;
    }
    deserializeCanvas(canvasId, data) {
        const canvas = this.canvases.get(canvasId);
        if (!canvas)
            return false;
        canvas.deserialize(data);
        return true;
    }
}
export const liveCanvasManager = new LiveCanvasManager();
//# sourceMappingURL=live-canvas.js.map