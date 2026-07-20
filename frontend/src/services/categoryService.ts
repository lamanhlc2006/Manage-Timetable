import api from './api';

export interface CategoryItem {
  _id: string;
  name: string;
  color: string;
  icon?: string;
  isSystem?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

const isOffline = (): boolean => {
  return localStorage.getItem('offlineMode') === 'true';
};

const getOfflineCategories = (): CategoryItem[] => {
  const data = localStorage.getItem('categories_data');
  if (!data) {
    const defaults: CategoryItem[] = [
      { _id: 'cat-1', name: 'Học tập', color: '#1890ff', icon: '📚', isSystem: true },
      { _id: 'cat-2', name: 'Công việc', color: '#52c41a', icon: '💼', isSystem: true },
      { _id: 'cat-3', name: 'Cá nhân', color: '#722ed1', icon: '👤', isSystem: true },
      { _id: 'cat-4', name: 'Khác', color: '#fa8c16', icon: '🔍', isSystem: true },
    ];
    localStorage.setItem('categories_data', JSON.stringify(defaults));
    return defaults;
  }
  return JSON.parse(data);
};

const saveOfflineCategories = (items: CategoryItem[]) => {
  localStorage.setItem('categories_data', JSON.stringify(items));
};

export const fetchCategories = async (): Promise<CategoryItem[]> => {
  if (isOffline()) {
    return getOfflineCategories();
  }

  const response = await api.get<CategoryItem[]>('/categories');
  return response.data;
};

export const createCategory = async (data: { name: string; color?: string; icon?: string }): Promise<CategoryItem> => {
  if (isOffline()) {
    const list = getOfflineCategories();
    const newItem: CategoryItem = {
      _id: 'cat-' + Date.now(),
      name: data.name,
      color: data.color || '#1890ff',
      icon: data.icon || '📌',
      isSystem: false,
    };
    list.push(newItem);
    saveOfflineCategories(list);
    return newItem;
  }

  const response = await api.post<CategoryItem>('/categories', data);
  return response.data;
};

export const updateCategory = async (id: string, data: { name?: string; color?: string; icon?: string }): Promise<CategoryItem> => {
  if (isOffline()) {
    const list = getOfflineCategories();
    const idx = list.findIndex((c) => c._id === id);
    if (idx !== -1) {
      if (data.name) list[idx].name = data.name;
      if (data.color) list[idx].color = data.color;
      if (data.icon) list[idx].icon = data.icon;
      saveOfflineCategories(list);
      return list[idx];
    }
    throw new Error('Category not found');
  }

  const response = await api.put<CategoryItem>(`/categories/${id}`, data);
  return response.data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  if (isOffline()) {
    const list = getOfflineCategories();
    const filtered = list.filter((c) => c._id !== id);
    saveOfflineCategories(filtered);
    return;
  }

  await api.delete(`/categories/${id}`);
};
