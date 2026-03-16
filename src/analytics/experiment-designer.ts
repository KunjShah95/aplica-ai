import { randomUUID } from 'crypto';

export interface ExperimentSpec {
  id: string;
  name: string;
  hypothesis: string;
  primaryMetric: MetricSpec;
  secondaryMetrics: MetricSpec[];
  sampleSize: number;
  duration: number;
  power: number;
  significance: number;
  minimumDetectableEffect: number;
  variants: VariantSpec[];
  randomization: RandomizationSpec;
  monitoringPlan: MonitoringPlan;
  analysisPlan: string;
}

export interface MetricSpec {
  name: string;
  description: string;
  type: 'conversion' | 'revenue' | 'engagement' | 'custom';
  unit: 'percent' | 'count' | 'currency' | 'seconds';
  aggregation: 'sum' | 'mean' | 'median' | 'count';
}

export interface VariantSpec {
  id: string;
  name: string;
  description: string;
  traffic: number;
  isControl: boolean;
}

export interface RandomizationSpec {
  unit: 'user' | 'session' | 'device' | 'page';
  algorithm: 'random' | 'hash' | 'stratified';
  strata?: string[];
}

export interface MonitoringPlan {
  alerts: AlertSpec[];
  dashboard: string;
  checkFrequency: string;
}

export interface AlertSpec {
  metric: string;
  condition: 'above' | 'below' | 'change';
  threshold: number;
  action: 'pause' | 'notify' | 'auto-revert';
}

export interface ABTestConfig {
  name: string;
  hypothesis: string;
  currentBaseline: number;
  expectedImprovement: number;
  minimumDetectableEffect?: number;
  significanceLevel?: number;
  power?: number;
}

export class ExperimentDesigner {
  createABTest(config: ABTestConfig): ExperimentSpec {
    const power = config.power || 0.8;
    const significance = config.significanceLevel || 0.05;
    const mde =
      config.minimumDetectableEffect || config.expectedImprovement / config.currentBaseline;

    const sampleSize = this.calculateSampleSize(config.currentBaseline, mde, power, significance);

    const duration = this.calculateDuration(sampleSize);

    const spec: ExperimentSpec = {
      id: randomUUID(),
      name: config.name,
      hypothesis: config.hypothesis,
      primaryMetric: {
        name: 'Primary Conversion',
        description: 'The main metric being tested',
        type: 'conversion',
        unit: 'percent',
        aggregation: 'mean',
      },
      secondaryMetrics: [
        {
          name: 'Revenue per User',
          description: 'Average revenue generated per user',
          type: 'revenue',
          unit: 'currency',
          aggregation: 'mean',
        },
        {
          name: 'Session Duration',
          description: 'Time spent on platform',
          type: 'engagement',
          unit: 'seconds',
          aggregation: 'mean',
        },
      ],
      sampleSize,
      duration,
      power,
      significance,
      minimumDetectableEffect: mde,
      variants: [
        {
          id: 'control',
          name: 'Control',
          description: 'Current experience',
          traffic: 50,
          isControl: true,
        },
        {
          id: 'treatment',
          name: 'Treatment',
          description: config.hypothesis,
          traffic: 50,
          isControl: false,
        },
      ],
      randomization: {
        unit: 'user',
        algorithm: 'hash',
      },
      monitoringPlan: {
        alerts: [
          {
            metric: 'Primary Conversion',
            condition: 'below',
            threshold: 0.7,
            action: 'pause',
          },
          {
            metric: 'Primary Conversion',
            condition: 'above',
            threshold: 0.3,
            action: 'notify',
          },
        ],
        dashboard: `https://analytics.example.com/${config.name}`,
        checkFrequency: 'hourly',
      },
      analysisPlan: this.generateAnalysisPlan(config),
    };

    return spec;
  }

  private calculateSampleSize(
    baseline: number,
    mde: number,
    power: number,
    significance: number
  ): number {
    const effectSize = Math.abs(baseline * mde);
    const variance = baseline * (1 - baseline);

    const zAlpha = this.normalInverse(1 - significance / 2);
    const zBeta = this.normalInverse(power);

    const n = (2 * variance * Math.pow(zAlpha + zBeta, 2)) / Math.pow(effectSize, 2);

    return Math.ceil(n * 2);
  }

  private calculateDuration(sampleSize: number): number {
    const dailyTraffic = 10000;
    const days = Math.ceil(sampleSize / dailyTraffic);

    return Math.max(7, Math.min(days, 30));
  }

  private normalInverse(p: number): number {
    const a1 = -39.6968302866538;
    const a2 = 220.946098424521;
    const a3 = -275.928510446969;
    const a4 = 138.357751867269;
    const a5 = -30.6647980661472;
    const a6 = 2.50662827745924;
    const b1 = -54.4760987982241;
    const b2 = 161.585836858041;
    const b3 = -155.698979859887;
    const b4 = 66.8013118877197;
    const b5 = -13.2806815528857;
    const c1 = -7.78489400243029e-3;
    const c2 = -3.22396458041136e-1;
    const c3 = -2.40075827716184;
    const c4 = -2.54973253934373;
    const c5 = 4.37466414146497;
    const c6 = 2.93816398269878;
    const d1 = 7.78469570904146e-3;
    const d2 = 3.22467129070039e-1;
    const d3 = 2.445134137143;
    const d4 = 3.75440866190742;
    const pLow = 0.02425;
    const pHigh = 1 - pLow;

    let q, r;

    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (
        (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
        ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
      );
    } else if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      return (
        ((((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q) /
        (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1)
      );
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return (
        -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
        ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
      );
    }
  }

  private generateAnalysisPlan(config: ABTestConfig): string {
    const baseline = config.currentBaseline;
    const expected = config.currentBaseline * (1 + config.expectedImprovement);

    return `
# Analysis Plan for ${config.name}

## Hypothesis
${config.hypothesis}

## Primary Analysis
- Method: Two-tailed t-test
- Significance level: α = 0.05
- Confidence interval: 95%

## Success Criteria
- Control conversion rate: ${(baseline * 100).toFixed(2)}%
- Expected treatment conversion rate: ${(expected * 100).toFixed(2)}%
- Minimum detectable effect: ${(config.minimumDetectableEffect || (config.expectedImprovement / baseline) * 100).toFixed(2)}%

## Sample Size
- Per variant: ~${Math.ceil(this.calculateSampleSize(baseline, config.expectedImprovement / baseline, 0.8, 0.05) / 2).toLocaleString()}
- Total: ~${this.calculateSampleSize(baseline, config.expectedImprovement / baseline, 0.8, 0.05).toLocaleString()}

## Sequential Testing (Optional)
Consider implementing alpha-spending function for continuous monitoring:
- O'Brien-Fleming boundaries
- Early stopping if p < 0.005

## Heterogeneity Analysis
- Segment by: device, geography, acquisition channel
- Look for interaction effects
`;
  }

  generateMonitoringDashboard(spec: ExperimentSpec): string {
    const metrics = [spec.primaryMetric, ...spec.secondaryMetrics];

    let dashboard = `# Experiment Monitoring Dashboard\n\n`;
    dashboard += `## ${spec.name}\n\n`;
    dashboard += `**Status**: Not Started | **Sample Size**: ${spec.sampleSize.toLocaleString()}\n\n`;

    dashboard += `## Primary Metrics\n`;
    for (const metric of metrics) {
      dashboard += `### ${metric.name}\n`;
      dashboard += `- Type: ${metric.type}\n`;
      dashboard += `- Unit: ${metric.unit}\n\n`;
    }

    dashboard += `## Variant Performance\n`;
    for (const variant of spec.variants) {
      dashboard += `### ${variant.name}\n`;
      dashboard += `- Traffic: ${variant.traffic}%\n`;
      dashboard += `- Control: ${variant.isControl ? 'Yes' : 'No'}\n\n`;
    }

    dashboard += `## Alerts\n`;
    for (const alert of spec.monitoringPlan.alerts) {
      dashboard += `- **${alert.metric}**: ${alert.condition} ${alert.threshold} → ${alert.action}\n`;
    }

    return dashboard;
  }

  validateSpec(spec: ExperimentSpec): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const totalTraffic = spec.variants.reduce((sum, v) => sum + v.traffic, 0);
    if (totalTraffic !== 100) {
      errors.push(`Total traffic allocation is ${totalTraffic}%, must be 100%`);
    }

    const controlCount = spec.variants.filter((v) => v.isControl).length;
    if (controlCount !== 1) {
      errors.push(`Must have exactly one control variant, found ${controlCount}`);
    }

    if (spec.sampleSize < 1000) {
      warnings.push('Sample size is below 1,000 per variant - results may be noisy');
    }

    if (spec.duration < 7) {
      warnings.push('Experiment duration is less than 7 days - may not capture weekly patterns');
    }

    if (spec.power < 0.8) {
      warnings.push('Statistical power is below 80% - may miss true effects');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export const experimentDesigner = new ExperimentDesigner();
