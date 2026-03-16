import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';
/**
 * IoT Agent - MQTT subscription, sensor monitoring, and pattern correlation
 */
export declare class IotAgent extends Agent {
    private subscriptions;
    private sensorData;
    private alerts;
    constructor(options: AgentOptions);
    /**
     * Subscribe to an MQTT topic
     */
    subscribe(topic: string, callback: (data: any) => void, options?: {
        threshold?: number;
    }): string;
    /**
     * Unsubscribe from an MQTT topic
     */
    unsubscribe(subscriptionId: string): boolean;
    /**
     * Simulate receiving sensor data
     */
    receiveData(topic: string, data: any): Promise<void>;
    /**
     * Check if topic matches subscription pattern
     */
    private topicMatches;
    /**
     * Store sensor data for analysis
     */
    private storeSensorData;
    /**
     * Check thresholds and generate alerts
     */
    private checkThresholds;
    /**
     * Extract numeric value from data object
     */
    private extractValue;
    /**
     * Extract sensor name from topic
     */
    private extractSensorName;
    /**
     * Generate an alert
     */
    private generateAlert;
    /**
     * Get current alerts
     */
    getAlerts(): Alert[];
    /**
     * Clear resolved alerts
     */
    clearAlerts(): void;
    /**
     * Correlate patterns across sensors
     */
    correlatePatterns(sensors: string[]): Promise<{
        correlation: number;
        lag?: number;
        patternType: 'positive' | 'negative' | 'none' | 'complex';
    }>;
    /**
     * Get sensor statistics
     */
    getSensorStats(topic: string): {
        count: number;
        min: number;
        max: number;
        avg: number;
        lastValue: any;
    };
    /**
     * Set threshold for a topic
     */
    setThreshold(topic: string, threshold: number): string;
    /**
     * Unsubscribe and remove threshold
     */
    removeThreshold(id: string): boolean;
}
export interface Alert {
    id: string;
    type: string;
    topic: string;
    sensor: string;
    currentValue: number;
    threshold: number;
    timestamp: Date;
    acknowledged?: boolean;
}
/**
 * Factory function to create an IoT agent
 */
export declare function createIotAgent(options: AgentOptions): IotAgent;
//# sourceMappingURL=iot-agent.d.ts.map