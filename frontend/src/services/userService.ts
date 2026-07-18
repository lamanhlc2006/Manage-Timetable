import api from './api';

export interface UserDetail {
  _id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetUsersResponse {
  users: UserDetail[];
  total: number;
  page: number;
  pages: number;
}

const isOffline = (): boolean => {
  return localStorage.getItem('offlineMode') === 'true';
};

const getOfflineUsers = (): UserDetail[] => {
  const data = localStorage.getItem('users_data');
  if (!data) {
    const defaultUsers: UserDetail[] = [
      {
        _id: 'mock-admin-id-123',
        username: 'Demo Admin',
        email: 'admin@example.com',
        role: 'admin',
        isActive: true,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: 'mock-user-id-456',
        username: 'Demo User',
        email: 'user@example.com',
        role: 'user',
        isActive: true,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: 'mock-user-id-789',
        username: 'Locked User',
        email: 'locked@example.com',
        role: 'user',
        isActive: false,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
    localStorage.setItem('users_data', JSON.stringify(defaultUsers));
    return defaultUsers;
  }
  return JSON.parse(data);
};

const saveOfflineUsers = (users: UserDetail[]) => {
  localStorage.setItem('users_data', JSON.stringify(users));
};

export const fetchUsers = async (params: {
  page: number;
  limit: number;
  search?: string;
}): Promise<GetUsersResponse> => {
  if (isOffline()) {
    let list = getOfflineUsers();
    if (params.search) {
      const s = params.search.toLowerCase();
      list = list.filter(
        (u) => u.username.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)
      );
    }
    const total = list.length;
    const skip = (params.page - 1) * params.limit;
    const paginated = list.slice(skip, skip + params.limit);
    const pages = Math.ceil(total / params.limit);
    return {
      users: paginated,
      total,
      page: params.page,
      pages,
    };
  }

  const response = await api.get<GetUsersResponse>('/users', { params });
  return response.data;
};

export const updateUserRole = async (id: string, role: 'admin' | 'user'): Promise<UserDetail> => {
  if (isOffline()) {
    const list = getOfflineUsers();
    const idx = list.findIndex((u) => u._id === id);
    if (idx === -1) throw new Error('Không tìm thấy người dùng');
    
    // Safety check: Prevent current admin from changing their own role in offline mode
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (currentUser._id === id) {
      throw new Error('Không thể tự thay đổi quyền của chính mình!');
    }

    list[idx].role = role;
    list[idx].updatedAt = new Date().toISOString();
    saveOfflineUsers(list);
    return list[idx];
  }

  const response = await api.put<UserDetail>(`/users/${id}/role`, { role });
  return response.data;
};

export const toggleUserStatus = async (id: string, isActive: boolean): Promise<UserDetail> => {
  if (isOffline()) {
    const list = getOfflineUsers();
    const idx = list.findIndex((u) => u._id === id);
    if (idx === -1) throw new Error('Không tìm thấy người dùng');

    // Safety check: Prevent current admin from locking themselves out in offline mode
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (currentUser._id === id) {
      throw new Error('Không thể tự khóa tài khoản của chính mình!');
    }

    list[idx].isActive = isActive;
    list[idx].updatedAt = new Date().toISOString();
    saveOfflineUsers(list);
    return list[idx];
  }

  const response = await api.put<UserDetail>(`/users/${id}/status`, { isActive });
  return response.data;
};
