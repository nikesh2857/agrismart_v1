/**
 * apiClient — Authenticated fetch wrapper
 *
 * Automatically attaches the Firebase ID Token to every request.
 * Throws on HTTP errors with the server's error message.
 *
 * Usage:
 *   import { apiClient } from '@/lib/apiClient';
 *   const { products } = await apiClient.get('/api/products');
 *   await apiClient.post('/api/orders', { items: [...] });
 */
import { supabase } from './supabase';

async function getToken(): Promise<string | null> {
  const adminToken = localStorage.getItem('admin_token');
  if (adminToken) return adminToken;

  const phoneUserStr = localStorage.getItem('phone_user');
  if (phoneUserStr) {
    try {
      const phoneUser = JSON.parse(phoneUserStr);
      if (phoneUser && phoneUser.id) {
        const phoneDigits = phoneUser.id.replace('phone_', '');
        return `mock_id_token_${phoneDigits}`;
      }
    } catch (e) {
      console.error('[apiClient] Error parsing phone_user from localStorage:', e);
    }
  }

  // Check Supabase session
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.access_token) {
      return session.access_token;
    }
  } catch (e) {
    console.error('[apiClient] Error checking Supabase session:', e);
  }

  return null;
}

async function request<T = any>(
  method: string,
  url: string,
  body?: unknown,
  isFormData = false
): Promise<T> {
  const token = await getToken();

  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body && !isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method,
    headers,
    body: body
      ? isFormData
        ? (body as FormData)
        : JSON.stringify(body)
      : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T = any>(url: string) => request<T>('GET', url),
  post: <T = any>(url: string, body?: unknown) => request<T>('POST', url, body),
  patch: <T = any>(url: string, body?: unknown) => request<T>('PATCH', url, body),
  delete: <T = any>(url: string) => request<T>('DELETE', url),
  postForm: <T = any>(url: string, formData: FormData) => request<T>('POST', url, formData, true),
};
