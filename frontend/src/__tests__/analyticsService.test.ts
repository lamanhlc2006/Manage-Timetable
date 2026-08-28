import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from '../services/api';
import { fetchAdvancedAnalytics } from '../services/analyticsService';

describe('analyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchAdvancedAnalytics should call GET /analytics/advanced with weeks param', async () => {
    const mockData = {
      categoryDistribution: [
        { _id: { year: 2026, week: 35, category: 'Học tập' }, hours: 10.5 },
      ],
      completionTrend: [
        { _id: { year: 2026, week: 35 }, week: 35, year: 2026, totalHours: 20, totalCount: 5, completedCount: 3, completionRate: 60 },
      ],
      heatmapData: [
        { _id: { dayOfWeek: 2, hour: 9 }, count: 5, totalHours: 7.5 },
      ],
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });
    const result = await fetchAdvancedAnalytics(8);
    expect(api.get).toHaveBeenCalledWith('/analytics/advanced', { params: { weeks: 8 } });
    expect(result.categoryDistribution).toHaveLength(1);
    expect(result.completionTrend[0].completionRate).toBe(60);
    expect(result.heatmapData[0].count).toBe(5);
  });

  it('fetchAdvancedAnalytics should default to 8 weeks', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { categoryDistribution: [], completionTrend: [], heatmapData: [] },
    });
    await fetchAdvancedAnalytics();
    expect(api.get).toHaveBeenCalledWith('/analytics/advanced', { params: { weeks: 8 } });
  });
});
