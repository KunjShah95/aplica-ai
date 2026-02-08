import { randomUUID } from 'crypto';

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

export type CanvasElementType =
  | 'text'
  | 'image'
  | 'code'
  | 'markdown'
  | 'html'
  | 'svg'
  | 'chart'
  | 'table'
  | 'list'
  | 'divider'
  | 'spacer'
  | 'button'
  | 'input'
  | 'container'
  | 'grid'
  | 'flex'
  | 'card'
  | 'callout'
  | 'codeblock'
  | 'mermaid';

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

export type CanvasActionType =
  | 'element_create'
  | 'element_update'
  | 'element_delete'
  | 'element_move'
  | 'element_resize'
  | 'element_duplicate'
  | 'element_group'
  | 'element_ungroup'
  | 'element_layer_up'
  | 'element_layer_down'
  | 'element_layer_top'
  | 'element_layer_bottom'
  | 'selection_clear'
  | 'selection_set'
  | 'selection_add'
  | 'selection_remove'
  | 'history_undo'
  | 'history_redo'
  | 'canvas_zoom'
  | 'canvas_pan';

export interface CanvasExportOptions {
  format: 'png' | 'jpeg' | 'svg' | 'pdf' | 'json' | 'html';
  quality?: number;
  scale?: number;
  background?: string;
}

export class Canvas {
  private state: CanvasState;
  private history: CanvasAction[];
  private historyIndex: number;
  private maxHistory: number;
  private listeners: Set<(event: CanvasEvent) => void> = new Set();

  constructor(name: string = 'Untitled Canvas') {
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

  getId(): string {
    return this.state.id;
  }

  getName(): string {
    return this.state.name;
  }

  setName(name: string): void {
    this.state.name = name;
    this.state.updatedAt = new Date();
  }

  createElement(
    type: CanvasElementType,
    x: number,
    y: number,
    content: string = '',
    properties: CanvasElementProperties = {},
    parentId?: string
  ): CanvasElement {
    const id = randomUUID();
    const element: CanvasElement = {
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

  updateElement(id: string, updates: Partial<CanvasElement>): CanvasElement | null {
    const element = this.state.elements.get(id);
    if (!element) return null;

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

  deleteElement(id: string): boolean {
    const element = this.state.elements.get(id);
    if (!element) return false;

    if (element.children) {
      for (const childId of element.children) {
        this.deleteElement(childId);
      }
    }

    if (element.parentId) {
      const parent = this.state.elements.get(element.parentId);
      if (parent?.children) {
        parent.children = parent.children.filter((childId: string) => childId !== id);
      }
    }

    this.state.elements.delete(id);
    this.state.selection = this.state.selection.filter((selId: string) => selId !== id);

    this.recordAction('element_delete', { elementId: id, element });
    this.emit({ type: 'element_deleted', elementId: id });
    this.state.updatedAt = new Date();

    return true;
  }

  moveElement(id: string, x: number, y: number): boolean {
    return this.updateElement(id, { x, y }) !== null;
  }

  resizeElement(id: string, width: number, height: number): boolean {
    return this.updateElement(id, { width, height }) !== null;
  }

  duplicateElement(id: string): CanvasElement | null {
    const element = this.state.elements.get(id);
    if (!element) return null;

    const newElement = this.createElement(
      element.type,
      element.x + 20,
      element.y + 20,
      element.content,
      { ...element.properties },
      element.parentId
    );

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

  selectElement(id: string, addToSelection: boolean = false): void {
    if (!addToSelection) {
      this.state.selection = [];
    }

    if (!this.state.selection.includes(id)) {
      this.state.selection.push(id);
    }

    this.emit({ type: 'selection_changed', selected: this.state.selection });
  }

  deselectElement(id: string): void {
    this.state.selection = this.state.selection.filter((selId: string) => selId !== id);
    this.emit({ type: 'selection_changed', selected: this.state.selection });
  }

  clearSelection(): void {
    this.state.selection = [];
    this.emit({ type: 'selection_changed', selected: [] });
  }

  getSelection(): string[] {
    return [...this.state.selection];
  }

  getElement(id: string): CanvasElement | undefined {
    return this.state.elements.get(id);
  }

  getAllElements(): CanvasElement[] {
    return Array.from(this.state.elements.values());
  }

  getElementsByType(type: CanvasElementType): CanvasElement[] {
    return Array.from(this.state.elements.values()).filter((el: CanvasElement) => el.type === type);
  }

  zoomToFit(): void {
    if (this.state.elements.size === 0) return;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

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

  setZoom(zoom: number): void {
    this.state.zoom = Math.max(0.1, Math.min(10, zoom));
    this.recordAction('canvas_zoom', { zoom: this.state.zoom });
    this.emit({
      type: 'view_changed',
      zoom: this.state.zoom,
      panX: this.state.panX,
      panY: this.state.panY,
    });
  }

  setPan(panX: number, panY: number): void {
    this.state.panX = panX;
    this.state.panY = panY;
    this.emit({
      type: 'view_changed',
      zoom: this.state.zoom,
      panX: this.state.panX,
      panY: this.state.panY,
    });
  }

  zoomIn(): void {
    this.setZoom(this.state.zoom * 1.2);
  }

  zoomOut(): void {
    this.setZoom(this.state.zoom / 1.2);
  }

  undo(): boolean {
    if (this.historyIndex < 0) return false;

    const action = this.history[this.historyIndex];
    this.historyIndex--;

    this.executeInverse(action);
    this.emit({ type: 'history_undo', action });
    return true;
  }

  redo(): boolean {
    if (this.historyIndex >= this.history.length - 1) return false;

    this.historyIndex++;
    const action = this.history[this.historyIndex];

    this.executeAction(action);
    this.emit({ type: 'history_redo', action });
    return true;
  }

  private executeAction(action: CanvasAction): void {
    switch (action.type) {
      case 'element_create':
        const createData = action.data as {
          elementId: string;
          type: CanvasElementType;
          x: number;
          y: number;
          content: string;
          properties: CanvasElementProperties;
          parentId?: string;
        };
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
        const deleteData = action.data as { elementId: string };
        this.state.elements.delete(deleteData.elementId);
        break;
      case 'element_update':
        const updateData = action.data as { elementId: string; newValues: Partial<CanvasElement> };
        const element = this.state.elements.get(updateData.elementId);
        if (element) {
          Object.assign(element, updateData.newValues);
        }
        break;
    }
  }

  private executeInverse(action: CanvasAction): void {
    switch (action.type) {
      case 'element_create':
        const createData = action.data as { elementId: string };
        this.state.elements.delete(createData.elementId);
        break;
      case 'element_delete':
        const deleteData = action.data as { element: CanvasElement };
        this.state.elements.set(deleteData.element.id, deleteData.element);
        break;
      case 'element_update':
        const updateData = action.data as { elementId: string; oldValues: Partial<CanvasElement> };
        const element = this.state.elements.get(updateData.elementId);
        if (element) {
          Object.assign(element, updateData.oldValues);
        }
        break;
    }
  }

  private recordAction(type: CanvasActionType, data: Record<string, unknown>): void {
    const action: CanvasAction = {
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

  serialize(): string {
    const elements: Record<string, CanvasElement> = {};
    for (const [id, element] of this.state.elements.entries()) {
      elements[id] = element;
    }

    return JSON.stringify(
      {
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
      },
      null,
      2
    );
  }

  deserialize(json: string): void {
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

  clear(): void {
    this.state.elements.clear();
    this.state.selection = [];
    this.history = [];
    this.historyIndex = -1;
    this.state.updatedAt = new Date();
    this.emit({ type: 'canvas_cleared' });
  }

  on(listener: (event: CanvasEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: CanvasEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private snapValue(value: number): number {
    return Math.round(value / this.state.gridSize) * this.state.gridSize;
  }

  getState(): Partial<CanvasState> {
    const elements: Record<string, CanvasElement> = {};
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

export type CanvasEvent =
  | { type: 'element_created'; element: CanvasElement }
  | { type: 'element_updated'; element: CanvasElement; changes: Partial<CanvasElement> }
  | { type: 'element_deleted'; elementId: string }
  | { type: 'selection_changed'; selected: string[] }
  | { type: 'view_changed'; zoom: number; panX: number; panY: number }
  | { type: 'history_undo'; action: CanvasAction }
  | { type: 'history_redo'; action: CanvasAction }
  | { type: 'canvas_loaded'; canvasId: string }
  | { type: 'canvas_cleared' };

export const createCanvas = (name?: string) => new Canvas(name);
