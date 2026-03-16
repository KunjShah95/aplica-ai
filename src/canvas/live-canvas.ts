import { Canvas, CanvasElement, CanvasEvent, createCanvas } from '../canvas/canvas.js';

export interface CanvasRenderRequest {
  type: 'canvas_render';
  payload: {
    canvasId?: string;
    elements?: CanvasElement[];
    action?: CanvasAction;
  };
}

export interface CanvasAction {
  type: 'create' | 'update' | 'delete' | 'clear';
  element?: CanvasElement;
  elementId?: string;
  updates?: Partial<CanvasElement>;
}

export interface CanvasEventMessage {
  type: 'canvas_event';
  payload: {
    canvasId: string;
    event: CanvasEvent;
    timestamp: Date;
  };
}

export interface CanvasInteractionEvent {
  type: 'canvas_interaction';
  payload: {
    canvasId: string;
    elementId: string;
    interaction: 'click' | 'input' | 'submit' | 'hover';
    data: Record<string, unknown>;
    userId: string;
    timestamp: Date;
  };
}

export type LiveCanvasEvent =
  | { type: 'canvas_event'; payload: { canvasId: string; event: CanvasEvent; timestamp: Date } }
  | CanvasInteractionEvent;

export class LiveCanvasManager {
  private canvases: Map<string, Canvas> = new Map();
  private eventListeners: Map<string, Set<(event: LiveCanvasEvent) => void>> = new Map();

  createCanvas(name?: string): Canvas {
    const canvas = createCanvas(name);
    this.canvases.set(canvas.getId(), canvas);

    const emitEvent: (event: CanvasEvent) => void = (event) => {
      const listeners = this.eventListeners.get(canvas.getId());
      if (listeners) {
        const message: CanvasEventMessage = {
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

  getCanvas(canvasId: string): Canvas | undefined {
    return this.canvases.get(canvasId);
  }

  deleteCanvas(canvasId: string): boolean {
    this.eventListeners.delete(canvasId);
    return this.canvases.delete(canvasId);
  }

  listCanvases(): Array<{ id: string; name: string; elementCount: number }> {
    return Array.from(this.canvases.entries()).map(([id, canvas]) => ({
      id,
      name: canvas.getName(),
      elementCount: canvas.getAllElements().length,
    }));
  }

  handleRenderRequest(request: CanvasRenderRequest): CanvasEventMessage | null {
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
    if (!canvas) return null;

    if (action) {
      switch (action.type) {
        case 'create':
          if (action.element) {
            canvas.createElement(
              action.element.type,
              action.element.x,
              action.element.y,
              action.element.content,
              action.element.properties
            );
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

  handleInteraction(event: CanvasInteractionEvent): void {
    const canvas = this.canvases.get(event.payload.canvasId);
    if (!canvas) return;

    const { elementId, interaction } = event.payload;

    if (interaction === 'click' && elementId) {
      canvas.selectElement(elementId);
    }

    const listeners = this.eventListeners.get(event.payload.canvasId);
    if (listeners) {
      listeners.forEach((listener) => listener(event));
    }
  }

  on(canvasId: string, listener: (event: LiveCanvasEvent) => void): () => void {
    if (!this.eventListeners.has(canvasId)) {
      this.eventListeners.set(canvasId, new Set());
    }
    this.eventListeners.get(canvasId)!.add(listener);

    return () => {
      this.eventListeners.get(canvasId)?.delete(listener);
    };
  }

  serializeCanvas(canvasId: string): string | null {
    const canvas = this.canvases.get(canvasId);
    return canvas?.serialize() || null;
  }

  deserializeCanvas(canvasId: string, data: string): boolean {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) return false;

    canvas.deserialize(data);
    return true;
  }
}

export const liveCanvasManager = new LiveCanvasManager();
