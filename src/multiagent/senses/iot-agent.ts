import { randomUUID } from 'crypto';
import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';

/**
 * IoT Agent - MQTT subscription, sensor monitoring, and pattern correlation
 */
export class IotAgent extends Agent {
  private subscriptions: Map<string, {
    topic: string;
    threshold?: number;
    callback: (data: any) => void;
  }> = new Map();
  private sensorData: Map<string, any[]> = new Map();
  private alerts: Alert[] = [];

  constructor(options: AgentOptions) {
    super(options);
  }

  /**
   * Subscribe to an MQTT topic
   */
  subscribe(
    topic: string,
    callback: (data: any) => void,
    options?: { threshold?: number }
  ): string {
    const id = randomUUID();
    this.subscriptions.set(id, { topic, threshold: options?.threshold, callback });
    console.log(`[IoTAgent] Subscribed to ${topic} (id: ${id})`);
    return id;
  }

  /**
   * Unsubscribe from an MQTT topic
   */
  unsubscribe(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId);
  }

  /**
   * Simulate receiving sensor data
   */
  async receiveData(topic: string, data: any): Promise<void> {
    // Store data for pattern analysis
    this.storeSensorData(topic, data);

    // Check thresholds and trigger alerts
    await this.checkThresholds(topic, data);

    // Notify subscribers
    for (const [id, sub] of this.subscriptions.entries()) {
      if (this.topicMatches(sub.topic, topic)) {
        try {
          sub.callback(data);
        } catch (error) {
          console.error(`[IoTAgent] Error in callback for ${topic}:`, error);
        }
      }
    }
  }

  /**
   * Check if topic matches subscription pattern
   */
  private topicMatches(subscription: string, topic: string): boolean {
    // Support MQTT wildcards (+ for single level, # for multi-level)
    const subRegex = new RegExp(
      '^' +
        subscription
          .replace(/\+/g, '[^/]+')
          .replace(/\/#$/, '/.*')
          .replace(/#$/, '.*') +
        '$'
    );
    return subRegex.test(topic);
  }

  /**
   * Store sensor data for analysis
   */
  private storeSensorData(topic: string, data: any): void {
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
  private async checkThresholds(topic: string, data: any): Promise<void> {
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
  private extractValue(data: any): number {
    if (typeof data === 'number') return data;
    if (typeof data === 'string') return parseFloat(data) || 0;
    if (data && typeof data === 'object') {
      return parseFloat(data.value || data.temperature || data.humidity || data.pressure || '0');
    }
    return 0;
  }

  /**
   * Extract sensor name from topic
   */
  private extractSensorName(topic: string): string {
    const parts = topic.split('/');
    return parts[parts.length - 1] || 'unknown';
  }

  /**
   * Generate an alert
   */
  private async generateAlert(alert: Alert): Promise<void> {
    this.alerts.push(alert);
    console.warn(`[IoTAgent] ALERT: ${alert.type} on ${alert.sensor}: ${alert.currentValue}`);

    // In production, would send notification via email, SMS, webhook, etc.
  }

  /**
   * Get current alerts
   */
  getAlerts(): Alert[] {
    return this.alerts;
  }

  /**
   * Clear resolved alerts
   */
  clearAlerts(): void {
    this.alerts = [];
    console.log('[IoTAgent] Alerts cleared');
  }

  /**
   * Correlate patterns across sensors
   */
  async correlatePatterns(sensors: string[]): Promise<{
    correlation: number;
    lag?: number;
    patternType: 'positive' | 'negative' | 'none' | 'complex';
  }> {
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
  getSensorStats(topic: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    lastValue: any;
  } {
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
  setThreshold(topic: string, threshold: number): string {
    const id = randomUUID();
    this.subscriptions.set(id, { topic, threshold, callback: () => {} });
    console.log(`[IoTAgent] Set threshold ${threshold} for ${topic}`);
    return id;
  }

  /**
   * Unsubscribe and remove threshold
   */
  removeThreshold(id: string): boolean {
    return this.subscriptions.delete(id);
  }
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
export function createIotAgent(options: AgentOptions): IotAgent {
  return new IotAgent(options);
}
