import type { AppState, Asset } from './calc';
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

/**
 * 把旧版本/损坏的 assets 数组平滑到当前 Asset 接口：
 * - 数组本身缺失/非数组 → 用 DEFAULT_STATE.assets（深度克隆）整段替换
 * - 数组元素缺字段（典型：历史版本没有 `code`）→ 用同名 DEFAULT_STATE.assets[i] 补字段
 * 永远返回 array；不会抛。
 */
function normalizeAssets(input: unknown): Asset[] {
  const seedAssets: Asset[] = JSON.parse(JSON.stringify(DEFAULT_STATE.assets));
  if (!Array.isArray(input)) return seedAssets;
  return input.map((raw, i) => {
    if (!raw || typeof raw !== 'object') return seedAssets[i] || seedAssets[0];
    const seed = seedAssets[i] || seedAssets[0];
    const merged: any = { ...seed, ...raw };
    // 保底：缺 id 时生成一个
    if (!merged.id || typeof merged.id !== 'string') {
      merged.id = 'a_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4);
    }
    return merged as Asset;
  });
}

function freshDefault(): AppState {
  // 整段深克隆（防 DEFAULT_STATE 共享引用）+ 资产标准化
  const base = JSON.parse(JSON.stringify(DEFAULT_STATE)) as AppState;
  base.assets = normalizeAssets(DEFAULT_STATE.assets);
  return base;
}

export function loadState(): AppState {
  let result: AppState;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // deepMerge 抛错也得接住（旧版 deepMerge 在未知数据下可能崩）
      const merged = deepMerge(DEFAULT_STATE, parsed) as AppState;
      result = merged;
    } else {
      result = freshDefault();
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[storage] loadState failed, falling back to default:', e);
    result = freshDefault();
  }
  // 二次防御：asset 数组即使 deepMerge 没爆，也按当前接口平整一次
  try {
    if (!result || typeof result !== 'object') return freshDefault();
    result.assets = normalizeAssets(result.assets);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[storage] assets normalize failed:', e);
    return freshDefault();
  }
  return result;
}

export function saveState(s: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch (e) {
    // 忽略写入失败（如隐私模式 / 配额超限）
    // eslint-disable-next-line no-console
    console.warn('[storage] saveState failed:', e);
  }
}

export function resetState(): AppState {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
  return freshDefault();
}
