export interface ControlUIConfig {
    port: number;
    https: boolean;
    certificate?: string;
    key?: string;
    password?: string;
    authEnabled: boolean;
}
export interface DashboardWidget {
    id: string;
    type: WidgetType;
    title: string;
    position: {
        x: number;
        y: number;
    };
    size: {
        width: number;
        height: number;
    };
    config: Record<string, unknown>;
}
export type WidgetType = 'stats' | 'conversations' | 'channels' | 'health' | 'logs' | 'activity' | 'usage' | 'skills' | 'nodes' | 'custom';
export interface DashboardConfig {
    id: string;
    name: string;
    widgets: DashboardWidget[];
    theme: 'light' | 'dark';
    refreshInterval: number;
}
export interface ControlEvent {
    type: ControlEventType;
    timestamp: Date;
    data: Record<string, unknown>;
}
export type ControlEventType = 'gateway_start' | 'gateway_stop' | 'gateway_restart' | 'channel_enable' | 'channel_disable' | 'skill_install' | 'skill_uninstall' | 'config_update' | 'user_action';
export declare class ControlUIServer {
    private config;
    private server?;
    private wss?;
    private connections;
    private dashboards;
    private eventHistory;
    private maxHistory;
    private listeners;
    constructor(config?: Partial<ControlUIConfig>, maxHistory?: number);
    private createDefaultDashboard;
    start(): Promise<void>;
    private handleRequest;
    private handleConnection;
    private handleMessage;
    private handleAuth;
    private subscriptions;
    private handleSubscribe;
    private handleUnsubscribe;
    private handleAction;
    private recordEvent;
    broadcast(message: object, excludeConnectionId?: string): void;
    broadcastEvent(event: ControlEvent): void;
    emit(event: ControlEvent): void;
    on(listener: (event: ControlEvent) => void): () => void;
    getDashboards(): DashboardConfig[];
    getDashboard(id: string): DashboardConfig | undefined;
    updateDashboard(id: string, updates: Partial<DashboardConfig>): DashboardConfig | null;
    getEvents(limit?: number): ControlEvent[];
    getStats(): {
        connections: number;
        events: number;
        dashboards: number;
        uptime: number;
    };
    stop(): Promise<void>;
}
export declare const controlUI: ControlUIServer;
//# sourceMappingURL=control-ui.d.ts.map