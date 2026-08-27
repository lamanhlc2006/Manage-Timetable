import api from './api';

export interface TagItem {
  _id: string;
  name: string;
  color: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

const isOffline = (): boolean => {
  return localStorage.getItem('offlineMode') === 'true';
};

const getOfflineTags = (): TagItem[] => {
  const data = localStorage.getItem('tags_data');
  if (!data) {
    return [];
  }
  return JSON.parse(data);
};

const saveOfflineTags = (items: TagItem[]) => {
  localStorage.setItem('tags_data', JSON.stringify(items));
};

export const fetchTags = async (): Promise<TagItem[]> => {
  if (isOffline()) {
    return getOfflineTags();
  }

  const response = await api.get<TagItem[]>('/tags');
  return response.data;
};

export const createTagApi = async (data: { name: string; color?: string }): Promise<TagItem> => {
  if (isOffline()) {
    const list = getOfflineTags();
    const newItem: TagItem = {
      _id: 'tag-' + Date.now(),
      name: data.name,
      color: data.color || '#1890ff',
    };
    list.push(newItem);
    saveOfflineTags(list);
    return newItem;
  }

  const response = await api.post<TagItem>('/tags', data);
  return response.data;
};

export const updateTag = async (id: string, data: { name?: string; color?: string }): Promise<TagItem> => {
  if (isOffline()) {
    const list = getOfflineTags();
    const idx = list.findIndex((t) => t._id === id);
    if (idx !== -1) {
      if (data.name) list[idx].name = data.name;
      if (data.color) list[idx].color = data.color;
      saveOfflineTags(list);
      return list[idx];
    }
    throw new Error('Tag not found');
  }

  const response = await api.put<TagItem>(`/tags/${id}`, data);
  return response.data;
};

export const deleteTag = async (id: string): Promise<void> => {
  if (isOffline()) {
    const list = getOfflineTags();
    const filtered = list.filter((t) => t._id !== id);
    saveOfflineTags(filtered);
    return;
  }

  await api.delete(`/tags/${id}`);
};
