export interface DeploymentConfig {
    name: string;
    environment: 'development' | 'staging' | 'production';
    region: string;
    instanceType: 'small' | 'medium' | 'large';
    enableSSL: boolean;
    enableBackups: boolean;
    enableMonitoring: boolean;
}
export interface DeploymentStatus {
    id: string;
    name: string;
    status: 'pending' | 'deploying' | 'running' | 'stopped' | 'error';
    url?: string;
    region: string;
    startedAt?: Date;
    deployedAt?: Date;
    logs: string[];
}
export interface InstallOptions {
    method: 'docker' | 'npm' | 'binary';
    domain?: string;
    email?: string;
    password?: string;
    llmProvider?: 'openai' | 'anthropic' | 'ollama';
    llmApiKey?: string;
    platform?: 'telegram' | 'discord' | 'slack' | 'all';
}
export declare class AutoDeployer {
    private deployments;
    oneCommandInstall(options: InstallOptions): Promise<DeploymentStatus>;
    private dockerInstall;
    private npmInstall;
    private binaryInstall;
    private generateEnvFile;
    private generateDockerCompose;
    private runCommand;
    private waitForService;
    private httpGet;
    private downloadFile;
    getDeployment(id: string): DeploymentStatus | undefined;
    listDeployments(): DeploymentStatus[];
    stopDeployment(id: string): Promise<void>;
    restartDeployment(id: string): Promise<void>;
    getLogs(id: string, lines?: number): Promise<string>;
    scaleDeployment(id: string, instances: number): Promise<void>;
    backupDeployment(id: string): Promise<string>;
    updateDeployment(id: string): Promise<void>;
}
export declare const autoDeployer: AutoDeployer;
//# sourceMappingURL=auto-deploy.d.ts.map