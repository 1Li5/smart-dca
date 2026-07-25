import type { AppState } from './calc';
import { DEFAULT_STATE } from './defaults';

const KEY = 'smart-dca-state-v2';

function deepMerge(base: any, override: any): any {
  if (Array.isArray(base)) return Array.isArray(override) ? override : base;
  if (base && typeof base === 'object') {
    const out = { ...base };
    if (override && typeof override === 'object') {
      for (const k of Object.keys(out)) {
        if (k in override) out[k] = deepMerge(out[k], override[k]);
      }
      // 允许 override 带 base 没有的键（如新增字段），但忽略 undefined
      for (const k of Object.keys(override)) {
        if (!(k in out) && override[k] !== undefined) out[k] = override[k];
      }
    }
    return out;
  }
  return override === undefined ? base : override;
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return deepMerge(DEFAULT_STATE, parsed) as AppState;
    }
  } catch (e) {
    // 损坏的缓存直接回落默认
  }
  return JSON.parse(JSON.stringify(DEFAULT_STATE)) as AppState;
}

export function saveState(s: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch (e) {
    // 忽略写入失败（如隐私模式）
  }
}

export function resetState(): AppState {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    /* noop */
  }
  return JSON.parse(JSON.stringify(DEFAULT_STATE)) as AppState;
}
