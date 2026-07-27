import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { extractSyncPayload } from './syncSlice';
import type { AppState } from './calc';

/**
 * 分享链接：把"可同步的计算配置"用 lz-string 压缩进 URL hash（#cfg=...）。
 * 仅前端实现，不依赖后端短链。压缩后仍超长（>8000）时返回友好提示。
 */

export const SHARE_HASH_PREFIX = '#cfg=';
const MAX_COMPRESSED_LEN = 8000;

/** AppState → 压缩串（cfg 值）。异常向上抛，由调用方决定提示 */
export function encodeState(state: AppState): string {
  const payload = extractSyncPayload(state);
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

/** 压缩串 → { ok, payload }，损坏/非对象一律容错，不抛异常 */
export function decodeShare(value: string): { ok: boolean; payload?: any; error?: string } {
  try {
    const json = decompressFromEncodedURIComponent(value);
    if (!json) return { ok: false, error: '分享数据为空或已损坏' };
    const payload = JSON.parse(json);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return { ok: false, error: '分享数据格式不正确' };
    }
    return { ok: true, payload };
  } catch {
    return { ok: false, error: '分享数据已损坏，无法解析' };
  }
}

/** 生成可分享的完整 URL；超长或编码失败返回 reason */
export function buildShareUrl(state: AppState): { ok: boolean; url?: string; reason?: string } {
  let compressed: string;
  try {
    compressed = encodeState(state);
  } catch {
    return { ok: false, reason: '配置编码失败' };
  }
  if (compressed.length > MAX_COMPRESSED_LEN) {
    return { ok: false, reason: '配置过大，建议改用导出图片/PDF' };
  }
  const base = `${window.location.origin}${window.location.pathname}${window.location.search}`;
  return { ok: true, url: `${base}${SHARE_HASH_PREFIX}${compressed}` };
}

/** 从 location.hash 读取 cfg 值（无则返回 null） */
export function readShareFromHash(): string | null {
  const h = typeof window !== 'undefined' ? window.location.hash : '';
  if (!h || !h.startsWith(SHARE_HASH_PREFIX)) return null;
  try {
    return decodeURIComponent(h.slice(SHARE_HASH_PREFIX.length));
  } catch {
    return h.slice(SHARE_HASH_PREFIX.length);
  }
}

/** 清除 hash，避免刷新重复触发 */
export function clearShareHash() {
  if (typeof window !== 'undefined' && window.location.hash) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}
