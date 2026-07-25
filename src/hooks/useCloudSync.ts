import { useCallback, useEffect, useRef, useState } from 'react';
import * as authApi from '../lib/auth';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface UseCloudSyncResult {
  status: SyncStatus;
  lastSyncedAt: number | null;
  lastError: string | null;
  /** 立即同步一次（取消待执行的防抖） */
  syncNow: () => Promise<void>;
}

const DEBOUNCE_MS = 1500;

/**
 * useCloudSync：登录后，把 state 自动防抖上传到云端
 *  - state 变更后 1.5s 无新变更才上传（避免连续键入时反复请求）
 *  - 失败可重试，状态指示给 UI 用
 *  - user 为 null 时不工作（游客模式）
 *  - migrationResolved=false 时不工作（迁移未完成前不动云端数据）
 */
export function useCloudSync<T>(
  user: { id: number } | null,
  state: T,
  migrationResolved: boolean,
): UseCloudSyncResult {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const stateRef = useRef<T>(state);
  stateRef.current = state;

  const timerRef = useRef<number | null>(null);
  const inFlightRef = useRef<boolean>(false);
  const dirtyRef = useRef<boolean>(false);

  // 记录"是否刚切换到该用户"——首次立即同步，后续 state 变化才防抖
  const prevUserIdRef = useRef<number | null>(null);
  const userChangeRef = useRef<boolean>(true); // 首次渲染（user 已是 null）也会触发
  const currentUserId = user?.id ?? null;
  if (prevUserIdRef.current !== currentUserId) {
    userChangeRef.current = true;
    prevUserIdRef.current = currentUserId;
  }

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const flush = useCallback(async () => {
    clearTimer();
    if (!user || !migrationResolved) return;
    if (inFlightRef.current) {
      dirtyRef.current = true;
      return;
    }
    inFlightRef.current = true;
    setStatus('syncing');
    try {
      await authApi.putRemoteData(stateRef.current);
      setStatus('synced');
      setLastSyncedAt(Date.now());
      setLastError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('error');
      setLastError(msg);
    } finally {
      inFlightRef.current = false;
      if (dirtyRef.current) {
        dirtyRef.current = false;
        scheduleFlush();
      }
    }
  }, [user, migrationResolved]);

  function scheduleFlush() {
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void flush();
    }, DEBOUNCE_MS);
  }

  useEffect(() => {
    if (!user || !migrationResolved) {
      userChangeRef.current = false;
      return;
    }
    if (userChangeRef.current) {
      userChangeRef.current = false;
      // 新用户/重新登录：立即同步当前 state 上去
      void flush();
    } else {
      // 同一用户内 state 变化：防抖
      scheduleFlush();
    }
  });

  const syncNow = useCallback(async () => {
    await flush();
  }, [flush]);

  useEffect(() => {
    return () => clearTimer();
  }, []);

  return { status, lastSyncedAt, lastError, syncNow };
}
