import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from '../services/api';
import {
  getMyGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  addGroupMember,
  changeGroupMemberRole,
  removeGroupMember,
  getGroupSchedules,
} from '../services/groupService';

describe('groupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getMyGroups should call GET /groups', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [{ _id: 'g1', name: 'Team A' }] });
    const result = await getMyGroups();
    expect(api.get).toHaveBeenCalledWith('/groups');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Team A');
  });

  it('createGroup should call POST /groups', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { _id: 'g1', name: 'New Group' } });
    const result = await createGroup({ name: 'New Group' });
    expect(api.post).toHaveBeenCalledWith('/groups', { name: 'New Group' });
    expect(result.name).toBe('New Group');
  });

  it('updateGroup should call PUT /groups/:id', async () => {
    vi.mocked(api.put).mockResolvedValue({ data: { _id: 'g1', name: 'Updated' } });
    await updateGroup('g1', { name: 'Updated' });
    expect(api.put).toHaveBeenCalledWith('/groups/g1', { name: 'Updated' });
  });

  it('deleteGroup should call DELETE /groups/:id', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: {} });
    await deleteGroup('g1');
    expect(api.delete).toHaveBeenCalledWith('/groups/g1');
  });

  it('addGroupMember should call POST /groups/:id/members', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { _id: 'g1' } });
    await addGroupMember('g1', 'john_doe', 'editor');
    expect(api.post).toHaveBeenCalledWith('/groups/g1/members', { username: 'john_doe', role: 'editor' });
  });

  it('getGroupSchedules should call GET /groups/:id/schedules', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [{ _id: 's1', title: 'Meeting' }] });
    const result = await getGroupSchedules('g1');
    expect(api.get).toHaveBeenCalledWith('/groups/g1/schedules');
    expect(result).toHaveLength(1);
  });
});
