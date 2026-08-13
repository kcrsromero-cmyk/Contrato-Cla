const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export const registerUser = async (data: { name?: string; email: string; password: string }) => {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to register');
  }
  return res.json();
};

export const loginUser = async (data: { email: string; password: string }) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to login');
  }
  return res.json();
};

export const getContracts = async (filters: { codigoEntidad: string; fechaDesde: string; fechaHasta: string }) => {
  const query = new URLSearchParams(filters).toString();
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/procurement/contracts?${query}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch contracts from backend');
  return res.json();
};

export const getSimilarity = async (filters: { codigoEntidad: string; fechaDesde: string; fechaHasta: string }) => {
  const query = new URLSearchParams(filters).toString();
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/procurement/similarity?${query}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch similarity from backend');
  return res.json();
};

export const getDepartamentos = async () => {
  const res = await fetch(`${API_URL}/procurement/departments`);
  if (!res.ok) throw new Error('Failed to fetch departments from backend');
  return res.json();
};

export const getCiudades = async (department: string) => {
  const res = await fetch(`${API_URL}/procurement/cities?department=${encodeURIComponent(department)}`);
  if (!res.ok) throw new Error('Failed to fetch cities from backend');
  return res.json();
};

export const getEntidades = async (department: string, city: string) => {
  const res = await fetch(`${API_URL}/procurement/entities?department=${encodeURIComponent(department)}&city=${encodeURIComponent(city)}`);
  if (!res.ok) throw new Error('Failed to fetch entities from backend');
  return res.json();
};

export const searchEntidades = async (q: string, type: 'global' | 'advanced') => {
  const res = await fetch(`${API_URL}/procurement/entities/search?q=${encodeURIComponent(q)}&type=${type}`);
  if (!res.ok) throw new Error('Failed to search entities from backend');
  return res.json();
};

export const getContractYears = async (entityCode: string) => {
  const res = await fetch(`${API_URL}/procurement/years?entityCode=${encodeURIComponent(entityCode)}`);
  if (!res.ok) throw new Error('Failed to fetch contract years from backend');
  return res.json();
};
