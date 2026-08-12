const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export const getContracts = async (filters: { codigoEntidad: string; fechaDesde: string; fechaHasta: string }) => {
  const query = new URLSearchParams(filters).toString();
  const res = await fetch(`${API_URL}/procurement/contracts?${query}`);
  if (!res.ok) throw new Error('Failed to fetch contracts from backend');
  return res.json();
};

export const getSimilarity = async (filters: { codigoEntidad: string; fechaDesde: string; fechaHasta: string }) => {
  const query = new URLSearchParams(filters).toString();
  const res = await fetch(`${API_URL}/procurement/similarity?${query}`);
  if (!res.ok) throw new Error('Failed to fetch similarity from backend');
  return res.json();
};
