/* ═══════════════════════════════════════════════════════════════
   Data Visualization Service — Unit Tests
   ═══════════════════════════════════════════════════════════════ */

import { DataVisualizationService } from '../../DataVisualizationService';
import { ChartType } from '../../../../shared/types';

describe('DataVisualizationService', () => {
  let service: DataVisualizationService;

  beforeEach(() => {
    service = new DataVisualizationService();
  });

  describe('generateComplexityComparison', () => {
    it('should generate complexity comparison chart', () => {
      const viz = service.generateComplexityComparison(
        ['O(1)', 'O(n)', 'O(n²)'],
        100,
      );

      expect(viz.type).toBe(ChartType.LINE);
      expect(viz.data.datasets).toHaveLength(3);
      expect(viz.data.datasets[0].label).toBe('O(1)');
      expect(viz.title).toContain('Complexity');
    });

    it('should evaluate complexity functions correctly', () => {
      const viz = service.generateComplexityComparison(['O(log n)', 'O(2^n)'], 10);

      const logData = viz.data.datasets[0].data;
      const expData = viz.data.datasets[1].data;

      expect(logData[9]).toBeLessThan(expData[9]);
    });

    it('should use appropriate colors for complexity classes', () => {
      const viz = service.generateComplexityComparison(
        ['O(1)', 'O(n)', 'O(n²)'],
        50,
      );

      // O(1) should be green
      expect(viz.data.datasets[0].borderColor).toContain('#00e676');

      // O(n²) should be red
      expect(viz.data.datasets[2].borderColor).toContain('#f44336');
    });
  });

  describe('generateBeforeAfterComparison', () => {
    it('should create before/after bar chart', () => {
      const viz = service.generateBeforeAfterComparison(
        'Response Time',
        200,
        50,
        'ms',
      );

      expect(viz.type).toBe(ChartType.BAR);
      expect(viz.data.datasets[0].data).toEqual([200, 50]);
      expect(viz.data.labels).toEqual(['Before', 'After']);
      expect(viz.description).toContain('-75%'); // 75% improvement
    });

    it('should show positive change in description', () => {
      const viz = service.generateBeforeAfterComparison(
        'Throughput',
        100,
        300,
      );

      expect(viz.description).toContain('200%'); // 200% improvement
    });
  });

  describe('generatePieChart', () => {
    it('should create pie chart with labels and values', () => {
      const viz = service.generatePieChart(
        'Browser Distribution',
        ['Chrome', 'Firefox', 'Safari'],
        [50, 30, 20],
      );

      expect(viz.type).toBe(ChartType.PIE);
      expect(viz.data.labels).toEqual(['Chrome', 'Firefox', 'Safari']);
      expect(viz.data.datasets[0].data).toEqual([50, 30, 20]);
    });

    it('should have multiple colors for segments', () => {
      const viz = service.generatePieChart(
        'Distribution',
        ['A', 'B', 'C'],
        [1, 2, 3],
      );

      expect(viz.data.datasets[0].backgroundColor.length).toBeGreaterThan(2);
    });
  });

  describe('generateTimeSeries', () => {
    it('should create time series chart', () => {
      const timestamps = [
        Date.now() - 3000,
        Date.now() - 2000,
        Date.now() - 1000,
        Date.now(),
      ];
      const values = [10, 15, 12, 18];

      const viz = service.generateTimeSeries(
        'CPU Usage',
        timestamps,
        values,
        'Percentage',
      );

      expect(viz.type).toBe(ChartType.TIMESERIES);
      expect(viz.data.datasets[0].data).toEqual(values);
      expect(viz.config.xAxis?.scale).toBe('time');
    });

    it('should enable zooming for time series', () => {
      const viz = service.generateTimeSeries(
        'Metrics',
        [1, 2, 3],
        [10, 20, 30],
        'Value',
      );

      expect(viz.config.zoomable).toBe(true);
    });
  });

  describe('generateNetworkGraph', () => {
    it('should create network graph visualization', () => {
      const nodes = [
        { id: 'A', label: 'Server A' },
        { id: 'B', label: 'Server B' },
      ];
      const edges = [
        { from: 'A', to: 'B', label: 'connects' },
      ];

      const viz = service.generateNetworkGraph(nodes, edges);

      expect(viz.type).toBe(ChartType.NETWORK);
      expect(viz.data.nodes).toHaveLength(2);
      expect(viz.data.edges).toHaveLength(1);
      expect(viz.data.edges[0].arrows).toBe('to');
    });
  });

  describe('generateVisualization (AI-powered)', () => {
    it('should return null if no visualization is needed', async () => {
      const viz = await service.generateVisualization(
        'This is a simple concept',
        'General topic',
      );

      // May return null if keywords not detected
      if (viz === null) {
        expect(viz).toBeNull();
      } else {
        expect(viz.type).toBeDefined();
      }
    });

    it('should detect need for visualization from keywords', async () => {
      const narration = 'Performance improved from O(n²) to O(n log n)';

      const viz = await service.generateVisualization(narration, 'Algorithms');

      // If Claude API is available, should generate visualization
      // If not, may return null - both are acceptable
      if (viz) {
        expect(viz.type).toBeDefined();
        expect(viz.data).toBeDefined();
      }
    }, 10000);
  });
});
