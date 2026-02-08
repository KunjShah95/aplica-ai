export interface CanvasElement {
    id: string;
    type: CanvasElementType;
    x: number;
    y: number;
    width: number;
    height: number;
    content: string;
    properties: CanvasElementProperties;
    parentId?: string;
    children?: string[];
}
export type CanvasElementType = 'text' | 'image' | 'code' | 'markdown' | 'html' | 'svg' | 'chart' | 'table' | 'list' | 'divider' | 'spacer' | 'button' | 'input' | 'container' | 'grid' | 'flex' | 'card' | 'callout' | 'codeblock' | 'mermaid';
export interface CanvasElementProperties {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    textAlign?: 'left' | 'center' | 'right';
    padding?: number;
    margin?: number;
    opacity?: number;
    rotation?: number;
    shadow?: boolean;
    visible?: boolean;
    selectable?: boolean;
    draggable?: boolean;
    resizable?: boolean;
    link?: string;
    alt?: string;
    language?: string;
    theme?: 'light' | 'dark';
    collapsed?: boolean;
    ordered?: boolean;
    columns?: number;
    gap?: number;
    width?: number;
    height?: number;
}
export interface CanvasState {
    id: string;
    name: string;
    elements: Map<string, CanvasElement>;
    selection: string[];
    zoom: number;
    panX: number;
    panY: number;
    gridEnabled: boolean;
    snapToGrid: boolean;
    gridSize: number;
    theme: 'light' | 'dark';
    createdAt: Date;
    updatedAt: Date;
}
export interface CanvasAction {
    id: string;
    type: CanvasActionType;
    timestamp: Date;
    userId: string;
    data: Record<string, unknown>;
}
export type CanvasActionType = 'element_create' | 'element_update' | 'element_delete' | 'element_move' | 'element_resize' | 'element_duplicate' | 'element_group' | 'element_ungroup' | 'element_layer_up' | 'element_layer_down' | 'element_layer_top' | 'element_layer_bottom' | 'selection_clear' | 'selection_set' | 'selection_add' | 'selection_remove' | 'history_undo' | 'history_redo' | 'canvas_zoom' | 'canvas_pan';
export interface CanvasExportOptions {
    format: 'png' | 'jpeg' | 'svg' | 'pdf' | 'json' | 'html';
    quality?: number;
    scale?: number;
    background?: string;
}
export declare class Canvas {
    private state;
    private history;
    private historyIndex;
    private maxHistory;
    private listeners;
    constructor(name?: string);
    getId(): string;
    getName(): string;
    setName(name: string): void;
    createElement(type: CanvasElementType, x: number, y: number, content?: string, properties?: CanvasElementProperties, parentId?: string): CanvasElement;
    updateElement(id: string, updates: Partial<CanvasElement>): CanvasElement | null;
    deleteElement(id: string): boolean;
    moveElement(id: string, x: number, y: number): boolean;
    resizeElement(id: string, width: number, height: number): boolean;
    duplicateElement(id: string): CanvasElement | null;
    selectElement(id: string, addToSelection?: boolean): void;
    deselectElement(id: string): void;
    clearSelection(): void;
    getSelection(): string[];
    getElement(id: string): CanvasElement | undefined;
    getAllElements(): CanvasElement[];
    getElementsByType(type: CanvasElementType): CanvasElement[];
    zoomToFit(): void;
    setZoom(zoom: number): void;
    setPan(panX: number, panY: number): void;
    zoomIn(): void;
    zoomOut(): void;
    undo(): boolean;
    redo(): boolean;
    private executeAction;
    private executeInverse;
    private recordAction;
    serialize(): string;
    deserialize(json: string): void;
    clear(): void;
    on(listener: (event: CanvasEvent) => void): () => void;
    private emit;
    private snapValue;
    getState(): Partial<CanvasState>;
}
export type CanvasEvent = {
    type: 'element_created';
    element: CanvasElement;
} | {
    type: 'element_updated';
    element: CanvasElement;
    changes: Partial<CanvasElement>;
} | {
    type: 'element_deleted';
    elementId: string;
} | {
    type: 'selection_changed';
    selected: string[];
} | {
    type: 'view_changed';
    zoom: number;
    panX: number;
    panY: number;
} | {
    type: 'history_undo';
    action: CanvasAction;
} | {
    type: 'history_redo';
    action: CanvasAction;
} | {
    type: 'canvas_loaded';
    canvasId: string;
} | {
    type: 'canvas_cleared';
};
export declare const createCanvas: (name?: string) => Canvas;
//# sourceMappingURL=canvas.d.ts.map