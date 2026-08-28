import api from './api';

export interface GroupMember {
  user: { _id: string; username: string; email: string } | string;
  role: 'viewer' | 'editor';
  joinedAt: string;
}

export interface GroupItem {
  _id: string;
  name: string;
  description?: string;
  color: string;
  owner: { _id: string; username: string; email: string } | string;
  members: GroupMember[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  color?: string;
}

export const getMyGroups = async (): Promise<GroupItem[]> => {
  const response = await api.get<GroupItem[]>('/groups');
  return response.data;
};

export const createGroup = async (data: CreateGroupInput): Promise<GroupItem> => {
  const response = await api.post<GroupItem>('/groups', data);
  return response.data;
};

export const updateGroup = async (id: string, data: Partial<CreateGroupInput>): Promise<GroupItem> => {
  const response = await api.put<GroupItem>(`/groups/${id}`, data);
  return response.data;
};

export const deleteGroup = async (id: string): Promise<void> => {
  await api.delete(`/groups/${id}`);
};

export const addGroupMember = async (groupId: string, username: string, role: string = 'viewer'): Promise<GroupItem> => {
  const response = await api.post<GroupItem>(`/groups/${groupId}/members`, { username, role });
  return response.data;
};

export const changeGroupMemberRole = async (groupId: string, userId: string, role: string): Promise<GroupItem> => {
  const response = await api.patch<GroupItem>(`/groups/${groupId}/members/${userId}`, { role });
  return response.data;
};

export const removeGroupMember = async (groupId: string, userId: string): Promise<GroupItem> => {
  const response = await api.delete<GroupItem>(`/groups/${groupId}/members/${userId}`);
  return response.data;
};

export const getGroupSchedules = async (groupId: string): Promise<any[]> => {
  const response = await api.get(`/groups/${groupId}/schedules`);
  return response.data;
};
