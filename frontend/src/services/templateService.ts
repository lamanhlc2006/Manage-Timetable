import api from './api';

export interface TemplateEvent {
  title: string;
  description?: string;
  dayOffset: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  color?: string;
  category?: string;
}

export interface TemplateItem {
  _id: string;
  name: string;
  description?: string;
  icon: string;
  category: string;
  events: TemplateEvent[];
  isSystem: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const getTemplates = async (): Promise<TemplateItem[]> => {
  const response = await api.get<TemplateItem[]>('/templates');
  return response.data;
};

export const createTemplate = async (data: {
  name: string;
  description?: string;
  icon?: string;
  category?: string;
  events: TemplateEvent[];
}): Promise<TemplateItem> => {
  const response = await api.post<TemplateItem>('/templates', data);
  return response.data;
};

export const deleteTemplate = async (id: string): Promise<void> => {
  await api.delete(`/templates/${id}`);
};

export const applyTemplate = async (id: string, startDate: string): Promise<{ message: string; count: number }> => {
  const response = await api.post<{ message: string; count: number }>(`/templates/${id}/apply`, { startDate });
  return response.data;
};
