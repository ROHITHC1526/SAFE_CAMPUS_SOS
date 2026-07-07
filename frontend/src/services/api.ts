import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

console.log("API URL:", API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('safecampus_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('safecampus_token');
      localStorage.removeItem('safecampus_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────
export const authAPI = {
  login: (data: { email: string; password: string; role?: string }) =>
    api.post('/auth/login', data),
  register: (data: { email: string; password: string; firstName: string; lastName: string; phone?: string }) =>
    api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/change-password', data),
};

// ─── Users ───────────────────────────────────────────────────────
export const userAPI = {
  getAll: (params?: any) => api.get('/users', { params }),
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: any) => api.put('/users/profile', data),
  updateMedical: (data: any) => api.put('/users/medical-profile', data),
  getEmergencyContacts: () => api.get('/users/emergency-contacts'),
  addEmergencyContact: (data: any) => api.post('/users/emergency-contacts', data),
  updateEmergencyContact: (id: string, data: any) => api.put(`/users/emergency-contacts/${id}`, data),
  deleteEmergencyContact: (id: string) => api.delete(`/users/emergency-contacts/${id}`),
  createUser: (data: any) => api.post('/users/create', data),
  toggleActive: (id: string) => api.put(`/users/${id}/toggle-active`),
  getSecurityGuards: () => api.get('/users/security-guards'),
};

// ─── Incidents ───────────────────────────────────────────────────
export const incidentAPI = {
  createSOS: (data: { category: string; latitude: number; longitude: number; description?: string; address?: string }) =>
    api.post('/incidents/sos', data),
  getAll: (params?: any) => api.get('/incidents', { params }),
  getById: (id: string) => api.get(`/incidents/${id}`),
  updateStatus: (id: string, data: { status: string; notes?: string }) =>
    api.put(`/incidents/${id}/status`, data),
  accept: (id: string) => api.post(`/incidents/${id}/accept`),
  getActiveForSecurity: () => api.get('/incidents/security/active'),
};

// ─── Chat ────────────────────────────────────────────────────────
export const chatAPI = {
  getMessages: (incidentId: string, params?: any) => api.get(`/chat/${incidentId}`, { params }),
  sendMessage: (incidentId: string, data: { content: string; type?: string; fileUrl?: string }) =>
    api.post(`/chat/${incidentId}`, data),
};

// ─── Analytics ───────────────────────────────────────────────────
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getTrends: () => api.get('/analytics/trends'),
  getHeatmap: (params?: any) => api.get('/analytics/heatmap', { params }),
  getGuardPerformance: () => api.get('/analytics/guard-performance'),
  getActivityLogs: (params?: any) => api.get('/analytics/activity-logs', { params }),
  getMonthlyReport: (params?: any) => api.get('/analytics/monthly-report', { params }),
};

// ─── Buildings ───────────────────────────────────────────────────
export const buildingAPI = {
  getAll: () => api.get('/buildings'),
  getSafeZones: () => api.get('/buildings/safe-zones'),
  getEmergencyTypes: () => api.get('/buildings/emergency-types'),
};

// ─── Notifications ───────────────────────────────────────────────
export const notificationAPI = {
  getAll: (params?: any) => api.get('/notifications', { params }),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  registerDevice: (data: { token: string; platform: string }) =>
    api.post('/notifications/device-token', data),
};

// ─── Location ────────────────────────────────────────────────────
export const locationAPI = {
  update: (data: { latitude: number; longitude: number; accuracy?: number }) =>
    api.post('/locations/update', data),
  getHistory: (userId: string, params?: any) => api.get(`/locations/history/${userId}`, { params }),
  getNearbyGuards: (params?: any) => api.get('/locations/nearby-guards', { params }),
};

// ─── Media ───────────────────────────────────────────────────────
export const mediaAPI = {
  upload: (incidentId: string, formData: FormData) =>
    api.post(`/media/upload/${incidentId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getEvidence: (incidentId: string) => api.get(`/media/evidence/${incidentId}`),
};

// ─── Settings ────────────────────────────────────────────────────
export const settingsAPI = {
  getAll: () => api.get('/settings'),
  update: (data: { key: string; value: string; category?: string }) =>
    api.put('/settings', data),
};

export default api;
