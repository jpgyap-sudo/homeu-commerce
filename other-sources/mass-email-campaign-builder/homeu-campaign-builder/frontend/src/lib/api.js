const API = import.meta.env.VITE_API_URL || 'http://localhost:4100';
const KEY = import.meta.env.VITE_ADMIN_API_KEY || 'change-me';

export async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-admin-api-key': KEY, ...(options.headers || {}) }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
