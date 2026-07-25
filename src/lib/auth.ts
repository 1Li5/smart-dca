import { API_BASE } from '../config';

/**
 * 注册/登录/登出/获取当前用户、同步数据 — 前端 API 封装
 * 同源部署（Vite + Vercel 同一域名），fetch 走 credentials 携带 cookie。
 */

export interface User {
  id: number;
  username: string;
}

export interface RemoteData {
  payload: unknown | null;
  updatedAt: string | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  // 2xx 解析 JSON，否则抛错带 message
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

/** 与 request 相同，但允许 401 透传（用于"未登录是正常情况"的端点，如 /api/auth/me） */
async function requestAllow401<T>(path: string, init?: RequestInit): Promise<{ status: number; data: T }> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  let data: any = null;
  try { data = await res.json(); } catch { /* ignore */ }
  return { status: res.status, data: data as T };
}

export async function register(input: { username: string; password: string; inviteCode: string }): Promise<{ user: User }> {
  return request<{ user: User }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function login(input: { username: string; password: string }): Promise<{ user: User }> {
  return request<{ user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function logout(): Promise<void> {
  await request<{ ok: true }>('/api/auth/logout', { method: 'POST' });
}

export async function fetchMe(): Promise<User | null> {
  const { status, data } = await requestAllow401<{ user: User | null }>('/api/auth/me');
  if (status === 401) return null;
  return data?.user || null;
}

export async function fetchRemoteData(): Promise<RemoteData> {
  return request<RemoteData>('/api/data');
}

export async function putRemoteData(payload: unknown): Promise<{ ok: true; updatedAt: string }> {
  return request<{ ok: true; updatedAt: string }>('/api/data', {
    method: 'PUT',
    body: JSON.stringify({ payload }),
  });
}
