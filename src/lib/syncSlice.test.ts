import { describe, it, expect } from 'vitest';
import { extractSyncPayload, applySyncPayload } from './syncSlice';
import { DEFAULT_STATE } from './defaults';
import type { AppState } from './calc';

describe('syncSlice', () => {
  it('extractSyncPayload 只包含约定的同步字段', () => {
    const state: AppState = {
      ...DEFAULT_STATE,
      activeStrategy: 'grid',
      theme: 'dark',
      monthlyBudget: 8000,
      maxSingleAmount: 2000,
      assets: [
        { ...DEFAULT_STATE.assets[0], id: 'a1', name: 'Test' },
      ],
    };
    const payload = extractSyncPayload(state);
    expect(payload).toHaveProperty('assets');
    expect(payload).toHaveProperty('monthlyBudget', 8000);
    expect(payload).toHaveProperty('maxSingleAmount', 2000);
    expect(payload).not.toHaveProperty('activeStrategy');
    expect(payload).not.toHaveProperty('theme');
  });

  it('applySyncPayload 保留 UI 状态字段（activeStrategy / theme）', () => {
    const state: AppState = {
      ...DEFAULT_STATE,
      activeStrategy: 'grid',
      theme: 'dark',
      monthlyBudget: 5000,
    };
    const payload = extractSyncPayload({
      ...DEFAULT_STATE,
      activeStrategy: 'intro',  // 即使云端有也不该影响本地
      theme: 'light',
      monthlyBudget: 9999,
    });
    const next = applySyncPayload(state, payload);
    expect(next.activeStrategy).toBe('grid');
    expect(next.theme).toBe('dark');
    expect(next.monthlyBudget).toBe(9999);
  });

  it('applySyncPayload 不动未提供字段', () => {
    const state: AppState = { ...DEFAULT_STATE, monthlyBudget: 5000 };
    const next = applySyncPayload(state, null);
    expect(next).toEqual(state);
  });

  it('extract 出来的 payload 是深拷贝，互不影响', () => {
    const state: AppState = JSON.parse(JSON.stringify(DEFAULT_STATE));
    state.assets[0].name = 'ORIGINAL';
    const payload = extractSyncPayload(state);
    payload.assets[0].name = 'CHANGED';
    expect(state.assets[0].name).toBe('ORIGINAL');
  });
});
