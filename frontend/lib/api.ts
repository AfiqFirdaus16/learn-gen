const API_BASE_URL = 'http://localhost:5000/api';

export const apiCall = async (
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any
) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error [${method} ${endpoint}]:`, error);
    throw error;
  }
};

// Specific API calls
export const authAPI = {
  login: (email: string, password: string) =>
    apiCall('/auth/login', 'POST', { email, password }),

  register: (nama: string, email: string, password: string, confirmPassword: string) =>
    apiCall('/auth/register', 'POST', { nama, email, password, confirmPassword }),

  getMe: () => apiCall('/auth/me', 'GET'),
};

export const videoAPI = {
  createVideo: (videoData: any) =>
    apiCall('/videos', 'POST', videoData),

  getVideos: () => apiCall('/videos', 'GET'),

  getVideoById: (id: number) =>
    apiCall(`/videos/${id}`, 'GET'),

  deleteVideo: (id: number) =>
    apiCall(`/videos/${id}`, 'DELETE'),
};
