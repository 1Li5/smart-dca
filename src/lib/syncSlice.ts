import type { AppState } from './calc';

/**
 * 同步字段：只把"计算参数"上云，"UI 状态"留在设备
 * 决策依据（用户拍板，2026-07-25 需求评审）：
 *  - 标的列表 + 全局参数 → 跨设备一致
 *  - activeStrategy / theme → UI 偏好，设备各自
 *  - 各策略的 tier 配置（percentileTiers / ladderTiers 等）→ 全局计算参数，跟随账号
 */

const SYNCABLE_KEYS: readonly (keyof AppState)[] = [
  'assets',
  'monthlyBudget',
  'maxSingleAmount',
  'percentileTiers',
  'ladderTiers',
  'va',
  'rebalance',
] as const;

export type SyncPayload = { [K in typeof SYNCABLE_KEYS[number]]: AppState[K] };

/** 从完整 state 抽取要上云的字段 */
export function extractSyncPayload(state: AppState): SyncPayload {
  const out: Record<string, unknown> = {};
  for (const k of SYNCABLE_KEYS) {
    out[k] = clone(state[k]);
  }
  return out as unknown as SyncPayload;
}

/** 把云端 payload 应用回本地 state（保留 UI 状态字段：activeStrategy / theme） */
export function applySyncPayload(state: AppState, payload: Partial<SyncPayload> | null | undefined): AppState {
  if (!payload) return state;
  const next: AppState = { ...state };
  for (const k of SYNCABLE_KEYS) {
    const v = (payload as Record<string, unknown>)[k];
    if (v !== undefined) {
      // 断言赋值，因为 SYNCABLE_KEYS 保证了 key 是 AppState 的合法字段
      (next as unknown as Record<string, unknown>)[k] = clone(v);
    }
  }
  return next;
}

/** 简易深拷贝（不依赖 structuredClone，兼容老浏览器） */
function clone<T>(v: T): T {
  if (v === null || typeof v !== 'object') return v;
  if (typeof structuredClone === 'function') return structuredClone(v);
  return JSON.parse(JSON.stringify(v)) as T;
}
