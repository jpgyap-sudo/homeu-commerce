const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4010';

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export { API_BASE };
