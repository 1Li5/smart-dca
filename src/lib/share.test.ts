// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { compressToEncodedURIComponent } from 'lz-string';
import { encodeState, decodeShare, buildShareUrl } from './share';
import { extractSyncPayload } from './syncSlice';
import { DEFAULT_STATE } from './defaults';
import type { AppState } from './calc';

describe('share (lz-string 编解码与分享链接)', () => {
  it('encodeState → decodeShare 可无损还原同步 payload', () => {
    const state: AppState = {
      ...DEFAULT_STATE,
      monthlyBudget: 12345,
      maxSingleAmount: 3000,
      assets: [{ ...DEFAULT_STATE.assets[0], name: '测试标的A' }],
    };
    const compressed = encodeState(state);
    expect(typeof compressed).toBe('string');
    expect(compressed.length).toBeGreaterThan(0);

    const decoded = decodeShare(compressed);
    expect(decoded.ok).toBe(true);
    expect(decoded.payload).toEqual(extractSyncPayload(state));
  });

  it('中文资产名也能正确编解码', () => {
    const state: AppState = {
      ...DEFAULT_STATE,
      assets: [{ ...DEFAULT_STATE.assets[0], name: '纳斯达克100-中文测试' }],
    };
    const decoded = decodeShare(encodeState(state));
    expect(decoded.ok).toBe(true);
    expect(decoded.payload.assets[0].name).toBe('纳斯达克100-中文测试');
  });

  it('buildShareUrl 返回带 #cfg= 前缀的完整 URL', () => {
    const res = buildShareUrl({ ...DEFAULT_STATE });
    expect(res.ok).toBe(true);
    expect(res.url).toContain('#cfg=');
  });

  it('损坏输入（非编码串）被容错，不抛异常', () => {
    const r = decodeShare('@#$%^&*not-a-valid-share!!!');
    expect(r.ok).toBe(false);
    expect(typeof r.error).toBe('string');
  });

  it('能解压但不是 JSON 的输入被容错', () => {
    // 用 lz-string 压缩一段纯文本（非 JSON），decode 时应报格式错误而非崩溃
    const compressed = compressToEncodedURIComponent('this is not json at all');
    const r = decodeShare(compressed);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/格式|损坏/);
  });

  it('空串输入被容错', () => {
    const r = decodeShare('');
    expect(r.ok).toBe(false);
  });
});
