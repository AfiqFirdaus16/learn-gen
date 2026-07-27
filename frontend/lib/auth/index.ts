// Get JWT Token
export const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// Get Admin Data
export const getAdmin = () => {
  if (typeof window !== 'undefined') {
    const adminData = localStorage.getItem('admin');
    if (adminData) {
      try {
        return JSON.parse(adminData);
      } catch {
        return null;
      }
    }
  }
  return null;
};

// Check if authenticated
export const isAuthenticated = (): boolean => {
  return !!getToken();
};

// Logout
export const logout = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
  }
};

// Set Auth Data
export const setAuthData = (token: string, admin: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
    localStorage.setItem('admin', JSON.stringify(admin));
  }
};

// API Call dengan Auth Header
export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {}
) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
};
