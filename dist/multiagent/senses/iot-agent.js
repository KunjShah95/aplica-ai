import { randomUUID } from 'crypto';
import { Agent } from '../../core/agent.js';
/**
 * IoT Agent - MQTT subscription, sensor monitoring, and pattern correlation
 */
export class IotAgent extends Agent {
    subscriptions = new Map();
    sensorData = new Map();
    alerts = [];
    constructor(options) {
        super(options);
    }
    /**
     * Subscribe to an MQTT topic
     */
    subscribe(topic, callback, options) {
        const id = randomUUID();
        this.subscriptions.set(id, { topic, threshold: options?.threshold, callback });
        console.log(`[IoTAgent] Subscribed to ${topic} (id: ${id})`);
        return id;
    }
    /**
     * Unsubscribe from an MQTT topic
     */
    unsubscribe(subscriptionId) {
        return this.subscriptions.delete(subscriptionId);
    }
    /**
     * Simulate receiving sensor data
     */
    async receiveData(topic, data) {
        // Store data for pattern analysis
        this.storeSensorData(topic, data);
        // Check thresholds and trigger alerts
        await this.checkThresholds(topic, data);
        // Notify subscribers
        for (const [id, sub] of this.subscriptions.entries()) {
            if (this.topicMatches(sub.topic, topic)) {
                try {
                    sub.callback(data);
                }
                catch (error) {
                    console.error(`[IoTAgent] Error in callback for ${topic}:`, error);
                }
            }
        }
    }
    /**
     * Check if topic matches subscription pattern
     */
    topicMatches(subscription, topic) {
        // Support MQTT wildcards (+ for single level, # for multi-level)
        const subRegex = new RegExp('^' +
            subscription
                .replace(/\+/g, '[^/]+')
                .replace(/\/#$/, '/.*')
                .replace(/#$/, '.*') +
            '$');
        return subRegex.test(topic);
    }
    /**
     * Store sensor data for analysis
     */
    storeSensorData(topic, data) {
        const dataHistory = this.sensorData.get(topic) || [];
        dataHistory.push({
            timestamp: new Date(),
            value: data,
        });
        // Keep only recent data (last 1000 readings)
        if (dataHistory.length > 1000) {
            dataHistory.shift();
        }
        this.sensorData.set(topic, dataHistory);
    }
    /**
     * Check thresholds and generate alerts
     */
    async checkThresholds(topic, data) {
        for (const [id, sub] of this.subscriptions.entries()) {
            if (this.topicMatches(sub.topic, topic) && sub.threshold !== undefined) {
                const value = this.extractValue(data);
                if (value > sub.threshold) {
                    await this.generateAlert({
                        id: randomUUID(),
                        type: 'threshold_breach',
                        topic,
                        sensor: this.extractSensorName(topic),
                        currentValue: value,
                        threshold: sub.threshold,
                        timestamp: new Date(),
                    });
                }
            }
        }
    }
    /**
     * Extract numeric value from data object
     */
    extractValue(data) {
        if (typeof data === 'number')
            return data;
        if (typeof data === 'string')
            return parseFloat(data) || 0;
        if (data && typeof data === 'object') {
            return parseFloat(data.value || data.temperature || data.humidity || data.pressure || '0');
        }
        return 0;
    }
    /**
     * Extract sensor name from topic
     */
    extractSensorName(topic) {
        const parts = topic.split('/');
        return parts[parts.length - 1] || 'unknown';
    }
    /**
     * Generate an alert
     */
    async generateAlert(alert) {
        this.alerts.push(alert);
        console.warn(`[IoTAgent] ALERT: ${alert.type} on ${alert.sensor}: ${alert.currentValue}`);
        // In production, would send notification via email, SMS, webhook, etc.
    }
    /**
     * Get current alerts
     */
    getAlerts() {
        return this.alerts;
    }
    /**
     * Clear resolved alerts
     */
    clearAlerts() {
        this.alerts = [];
        console.log('[IoTAgent] Alerts cleared');
    }
    /**
     * Correlate patterns across sensors
     */
    async correlatePatterns(sensors) {
        // Simulate pattern correlation
        // In production, would use statistical analysis on historical data
        if (sensors.length < 2) {
            return { correlation: 0, patternType: 'none' };
        }
        // Generate simulated correlation based on sensor names
        // (Real implementation would analyze actual sensor data)
        const baseCorrelation = Math.random();
        return {
            correlation: baseCorrelation,
            patternType: baseCorrelation > 0.5 ? 'positive' : baseCorrelation < -0.5 ? 'negative' : 'none',
        };
    }
    /**
     * Get sensor statistics
     */
    getSensorStats(topic) {
        const data = this.sensorData.get(topic) || [];
        const values = data.map((d) => this.extractValue(d.value));
        if (values.length === 0) {
            return { count: 0, min: 0, max: 0, avg: 0, lastValue: null };
        }
        return {
            count: values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            lastValue: data[data.length - 1]?.value || null,
        };
    }
    /**
     * Set threshold for a topic
     */
    setThreshold(topic, threshold) {
        const id = randomUUID();
        this.subscriptions.set(id, { topic, threshold, callback: () => { } });
        console.log(`[IoTAgent] Set threshold ${threshold} for ${topic}`);
        return id;
    }
    /**
     * Unsubscribe and remove threshold
     */
    removeThreshold(id) {
        return this.subscriptions.delete(id);
    }
}
/**
 * Factory function to create an IoT agent
 */
export function createIotAgent(options) {
    return new IotAgent(options);
}
//# sourceMappingURL=iot-agent.js.map