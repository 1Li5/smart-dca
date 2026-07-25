import { API_BASE } from '../config';

export interface Indicator {
  type: 'fund' | 'index';
  code: string;
  symbol?: string;
  price: number;
  ma30: number;
  percentile: number;
  basis: string;
  basisLabel: string;
  approx: boolean;
  asOf: string;
  source: string;
  error?: string;
}

// 调后端拿 价格 / 30月均线 / 估值分位
// API_BASE 为空时返回 null（自动填充未启用）
export async function fetchIndicator(code: string, type: 'auto' | 'fund' | 'index' = 'auto'): Promise<Indicator | null> {
  if (!API_BASE) return null;
  const url = `${API_BASE}/api/indicator?code=${encodeURIComponent(code)}&type=${type}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const data = await res.json();
    if (data.error) return { ...(data as any), error: data.error } as Indicator;
    return data as Indicator;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// 判断一段输入是否像“代码”（数字或 sh/sz/gb 前缀），用于区分手输代码 vs 名称
export function looksLikeCode(input: string): boolean {
  const s = (input || '').trim();
  return /^\d{3,6}$/.test(s) || /^(sh|sz|hk|gb)\w+/i.test(s);
}
