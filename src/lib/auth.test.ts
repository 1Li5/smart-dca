import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { register, login, logout, fetchMe, fetchRemoteData, putRemoteData } from './auth';
import { API_BASE } from '../config';

describe('auth API wrapper', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // 每个 case 单独 mock，避免 case 间相互影响
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockJsonResponse(status: number, body: any) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('login 把 fetch 指向 ${API_BASE}/api/auth/login 并 POST body', async () => {
    const fetchMock = globalThis.fetch as any;
    fetchMock.mockResolvedValueOnce(mockJsonResponse(200, { user: { id: 1, username: 'alice' } }));
    const res = await login({ username: 'alice', password: 'secret' });
    expect(res.user.username).toBe('alice');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/auth/login`);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('same-origin');
    expect(JSON.parse(init.body)).toEqual({ username: 'alice', password: 'secret' });
  });

  it('register 失败时抛带后端 error 信息的 Error', async () => {
    const fetchMock = globalThis.fetch as any;
    fetchMock.mockResolvedValueOnce(mockJsonResponse(409, { error: '该用户名已被占用' }));
    await expect(
      register({ username: 'bob', password: 'secret', inviteCode: 'wrong' })
    ).rejects.toThrow('该用户名已被占用');
  });

  it('logout 忽略错误也正常 resolve（best-effort）', async () => {
    const fetchMock = globalThis.fetch as any;
    fetchMock.mockResolvedValueOnce(mockJsonResponse(200, { ok: true }));
    await expect(logout()).resolves.toBeUndefined();
  });

  it('fetchMe 在 401 时返回 null', async () => {
    const fetchMock = globalThis.fetch as any;
    fetchMock.mockResolvedValueOnce(mockJsonResponse(401, { user: null }));
    await expect(fetchMe()).resolves.toBeNull();
  });

  it('fetchMe 在 200 时返回 user', async () => {
    const fetchMock = globalThis.fetch as any;
    fetchMock.mockResolvedValueOnce(mockJsonResponse(200, { user: { id: 7, username: 'cc' } }));
    const u = await fetchMe();
    expect(u).toEqual({ id: 7, username: 'cc' });
  });

  it('fetchRemoteData 返回 payload + updatedAt', async () => {
    const fetchMock = globalThis.fetch as any;
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse(200, { payload: { foo: 1 }, updatedAt: '2026-07-25T00:00:00Z' })
    );
    const r = await fetchRemoteData();
    expect(r.payload).toEqual({ foo: 1 });
    expect(r.updatedAt).toBe('2026-07-25T00:00:00Z');
  });

  it('putRemoteData 用 PUT 传 JSON body', async () => {
    const fetchMock = globalThis.fetch as any;
    fetchMock.mockResolvedValueOnce(mockJsonResponse(200, { ok: true, updatedAt: 'x' }));
    await putRemoteData({ a: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/data`);
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ payload: { a: 1 } });
  });
});
