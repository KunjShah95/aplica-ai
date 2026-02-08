export interface TailscaleConfig {
    enabled: boolean;
    mode: 'off' | 'serve' | 'funnel';
    port: number;
    authKey?: string;
    resetOnExit: boolean;
}
export interface TailscaleServeConfig {
    path: string;
    targetPort: number;
    https: boolean;
    authenticate: boolean;
    password?: string;
}
export interface TailscaleStatus {
    tunnel: boolean;
    ip: string;
    state: 'Stopped' | 'Starting' | 'Running' | 'Stopping';
    peers: number;
    expires?: Date;
}
export declare class TailscaleManager {
    private config;
    private processes;
    private serves;
    constructor(config?: Partial<TailscaleConfig>);
    isAvailable(): boolean;
    isLoggedIn(): boolean;
    login(): Promise<boolean>;
    logout(): Promise<void>;
    getStatus(): TailscaleStatus;
    enableServe(path: string, targetPort: number, options?: {
        https?: boolean;
        password?: string;
    }): Promise<string | null>;
    disableServe(serveId: string): Promise<boolean>;
    enableFunnel(targetPort: number, options?: {
        password?: string;
    }): Promise<boolean>;
    disableFunnel(targetPort: number): Promise<boolean>;
    reset(): Promise<void>;
    getServeUrl(serveId: string): string | null;
    startGateway(): Promise<boolean>;
    stop(): Promise<void>;
    getConfig(): TailscaleConfig;
    getServes(): TailscaleServeConfig[];
}
export declare const tailscaleManager: TailscaleManager;
//# sourceMappingURL=tailscale.d.ts.map