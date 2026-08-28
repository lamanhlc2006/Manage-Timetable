import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock api
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from '../services/api';
import { getTemplates, createTemplate, deleteTemplate, applyTemplate, TemplateItem } from '../services/templateService';

const mockTemplate: TemplateItem = {
  _id: 'tmpl-1',
  name: 'Test Template',
  description: 'A test',
  icon: '📋',
  category: 'general',
  events: [
    { title: 'Event 1', dayOffset: 0, startHour: 9, startMinute: 0, endHour: 10, endMinute: 0 },
  ],
  isSystem: true,
  createdAt: '2026-08-28T00:00:00Z',
  updatedAt: '2026-08-28T00:00:00Z',
};

describe('templateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getTemplates should call GET /templates', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [mockTemplate] });
    const result = await getTemplates();
    expect(api.get).toHaveBeenCalledWith('/templates');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Test Template');
  });

  it('createTemplate should call POST /templates', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: mockTemplate });
    const result = await createTemplate({
      name: 'Test Template',
      events: mockTemplate.events,
    });
    expect(api.post).toHaveBeenCalledWith('/templates', expect.objectContaining({ name: 'Test Template' }));
    expect(result._id).toBe('tmpl-1');
  });

  it('deleteTemplate should call DELETE /templates/:id', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: {} });
    await deleteTemplate('tmpl-1');
    expect(api.delete).toHaveBeenCalledWith('/templates/tmpl-1');
  });

  it('applyTemplate should call POST /templates/:id/apply with startDate', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { message: 'Created 3 events', count: 3 } });
    const result = await applyTemplate('tmpl-1', '2026-09-01');
    expect(api.post).toHaveBeenCalledWith('/templates/tmpl-1/apply', { startDate: '2026-09-01' });
    expect(result.count).toBe(3);
  });
});
