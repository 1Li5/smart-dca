import { API_BASE } from '../config';

export interface SeriesMonthly {
  date: string;
  close: number;
}

export interface SeriesResult {
  code: string;
  type: string;
  monthly: SeriesMonthly[];
  source: string;
  error?: string;
}

// 调后端拿某标的的完整历史月线（用于回测）
// API_BASE 为空时返回 null（自动填充未启用）
export async function fetchSeries(
  code: string,
  type: 'auto' | 'fund' | 'index' = 'auto'
): Promise<{ code: string; type: string; monthly: SeriesMonthly[]; source: string } | null> {
  if (!API_BASE) return null;
  const url = `${API_BASE}/api/series?code=${encodeURIComponent(code)}&type=${type}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const data = (await res.json()) as SeriesResult;
    if (data.error || !data.monthly || data.monthly.length === 0) return null;
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
