import api from './api';

export interface CategoryDistItem {
  _id: { year: number; week: number; category: string };
  hours: number;
}

export interface CompletionTrendItem {
  _id: { year: number; week: number };
  week: number;
  year: number;
  totalHours: number;
  totalCount: number;
  completedCount: number;
  completionRate: number;
}

export interface HeatmapItem {
  _id: { dayOfWeek: number; hour: number };
  count: number;
  totalHours: number;
}

export interface AdvancedAnalytics {
  categoryDistribution: CategoryDistItem[];
  completionTrend: CompletionTrendItem[];
  heatmapData: HeatmapItem[];
}

export const fetchAdvancedAnalytics = async (weeks: number = 8): Promise<AdvancedAnalytics> => {
  const response = await api.get<AdvancedAnalytics>('/analytics/advanced', { params: { weeks } });
  return response.data;
};
