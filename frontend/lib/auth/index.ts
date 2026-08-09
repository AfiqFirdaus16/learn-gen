export interface AuthUser {
  id: number;
  nama: string;
  email: string;
  role?: 'admin' | 'dosen' | 'mahasiswa';
}

// Get JWT Token
export const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// Get Admin Data
export const getAdmin = (): AuthUser | null => {
  if (typeof window !== 'undefined') {
    const adminData = localStorage.getItem('admin');
    if (adminData) {
      try {
        return JSON.parse(adminData) as AuthUser;
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
export const setAuthData = (token: string, admin: AuthUser) => {
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
  // HeadersInit can be a Headers instance, tuple array, or object. Normalizing it
  // avoids indexing HeadersInit directly (the TypeScript error fixed in 15b9607)
  // while still preserving any headers supplied by the caller.
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
};
