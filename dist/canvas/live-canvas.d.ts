import { Canvas, CanvasElement, CanvasEvent } from '../canvas/canvas.js';
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
export type LiveCanvasEvent = {
    type: 'canvas_event';
    payload: {
        canvasId: string;
        event: CanvasEvent;
        timestamp: Date;
    };
} | CanvasInteractionEvent;
export declare class LiveCanvasManager {
    private canvases;
    private eventListeners;
    createCanvas(name?: string): Canvas;
    getCanvas(canvasId: string): Canvas | undefined;
    deleteCanvas(canvasId: string): boolean;
    listCanvases(): Array<{
        id: string;
        name: string;
        elementCount: number;
    }>;
    handleRenderRequest(request: CanvasRenderRequest): CanvasEventMessage | null;
    handleInteraction(event: CanvasInteractionEvent): void;
    on(canvasId: string, listener: (event: LiveCanvasEvent) => void): () => void;
    serializeCanvas(canvasId: string): string | null;
    deserializeCanvas(canvasId: string, data: string): boolean;
}
export declare const liveCanvasManager: LiveCanvasManager;
//# sourceMappingURL=live-canvas.d.ts.map