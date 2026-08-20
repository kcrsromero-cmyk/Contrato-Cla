const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export const registerUser = async (data: { name?: string; email: string; password: string }) => {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('Too many requests, please try again later');
    }
    const errorData = await res.json().catch(() => ({}));
    if (errorData.details && typeof errorData.details === 'object') {
      const messages = Object.values(errorData.details)
        .map((val: any) => val?._errors?.join(', '))
        .filter(Boolean);
      if (messages.length > 0) throw new Error(messages.join(' | '));
    }
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
    if (res.status === 429) {
      throw new Error('Too many requests, please try again later');
    }
    const errorData = await res.json().catch(() => ({}));
    if (errorData.details && typeof errorData.details === 'object') {
      const messages = Object.values(errorData.details)
        .map((val: any) => val?._errors?.join(', '))
        .filter(Boolean);
      if (messages.length > 0) throw new Error(messages.join(' | '));
    }
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

export const getMe = async () => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/auth/me`, { headers });
  if (!res.ok) throw new Error('Failed to fetch user from backend');
  return res.json();
};

export const updateProfile = async (data: {
  name?: string;
  phone?: string;
  telegramUsername?: string;
  notifyEmail?: boolean;
  notifyTelegram?: boolean;
  notifySms?: boolean;
}) => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const res = await fetch(`${API_URL}/auth/profile`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Error al actualizar perfil');
  return res.json();
};


export const getFavoriteEntities = async () => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/procurement/favorite-entities`, { headers });
  if (!res.ok) throw new Error('Failed to fetch favorite entities from backend');
  return res.json();
};

export const addFavoriteEntity = async (data: { entityCode: string, entityName: string }) => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/procurement/favorite-entities`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    if (res.status === 403) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.error || 'Tu plan actual o límite no permite agregar más entidades favoritas.');
    }
    throw new Error('Error al agregar entidad favorita');
  }
  return res.json();
};

export const removeFavoriteEntity = async (entityCode: string) => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/procurement/favorite-entities?entityCode=${entityCode}`, {
    method: 'DELETE',
    headers
  });
  if (!res.ok) throw new Error('Error al eliminar entidad favorita');
  return; // Un 204 No Content nunca trae cuerpo — no hay nada que parsear.
};


export const getFavoriteContracts = async () => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/procurement/favorites`, { headers });
  if (!res.ok) throw new Error('Failed to fetch favorite contracts from backend');
  return res.json();
};

export const addFavoriteContract = async (contractId: string) => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/procurement/favorites`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ contractId })
  });
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error('Tu plan actual no incluye la capacidad de usar Favoritos.');
    }
    throw new Error('Error al agregar contrato favorito');
  }
  return res.json();
};

export const removeFavoriteContract = async (contractId: string) => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/procurement/favorites?contractId=${contractId}`, {
    method: 'DELETE',
    headers
  });
  if (!res.ok) throw new Error('Error al eliminar contrato favorito');
  return;
};
