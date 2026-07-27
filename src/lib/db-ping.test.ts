import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pingDb } from '../../api/db-ping';
import handler from '../../api/db-ping';
import { getSql } from '../../api/lib/db';

// 用 vitest 自带的 vi.mock 替代 ./lib/db.js 的 getSql()，不引入新依赖。
// 默认实现：getSql() 抛错（模拟未配置 POSTGRES_URL）。
vi.mock('../../api/lib/db', () => ({
  getSql: vi.fn(() => {
    throw new Error('未配置 POSTGRES_URL（请在 Vercel Storage 中开通 Neon）');
  }),
}));

// ---- 构造 mock sql 执行器 ----
function makeFailingSql(errorMsg: string) {
  return {
    query: vi.fn().mockRejectedValue(new Error(errorMsg)),
  };
}

function makeOkSql() {
  return {
    query: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  };
}

// ---- 构造 mock Vercel req/res ----
function makeRes() {
  const res: any = {
    _status: 200,
    _json: null as any,
    headers: {} as Record<string, string>,
    setHeader(k: string, v: string) {
      this.headers[k] = v;
    },
    status(code: number) {
      this._status = code;
      return this;
    },
    json(body: any) {
      this._json = body;
      return this;
    },
    end() {
      return this;
    },
  };
  return res;
}

describe('批次F db-ping 探针（mock sql 固化三分支）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------- 分支1：config missing ----------
  describe('分支1 config missing', () => {
    it('pingDb(null) 返回 {ok:false, reason:"config missing"} 且不抛异常', async () => {
      const res = await pingDb(null);
      expect(res).toEqual({ ok: false, reason: 'config missing' });
      expect(res.ok).toBe(false);
    });

    it('handler：getSql 抛错被捕获 → HTTP 200 + {ok:false, reason:"config missing"}', async () => {
      const req: any = { method: 'GET' };
      const res = makeRes();
      await handler(req, res);
      expect(res._status).toBe(200);
      expect(res._json).toEqual({ ok: false, reason: 'config missing' });
      expect(res.headers['Content-Type']).toBe('application/json');
      expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
    });
  });

  // ---------- 分支2：连接失败（被 try/catch 捕获，绝不抛 500） ----------
  describe('分支2 连接失败', () => {
    it('pingDb(sql.query 拒绝) 返回 {ok:false, error} 且不抛异常（进程干净）', async () => {
      const failing = makeFailingSql('connection refused');
      // 直接 await，若 pingDb 抛错则用例失败 —— 验证其吞掉异常
      const res = await pingDb(failing);
      expect(res.ok).toBe(false);
      expect(typeof res.error).toBe('string');
      expect(res.error!.length).toBeGreaterThan(0);
      expect(failing.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('handler：getSql 返回会拒绝的 sql → HTTP 200 + {ok:false, error}', async () => {
      vi.mocked(getSql).mockReturnValue(makeFailingSql('ECONNREFUSED'));
      const req: any = { method: 'GET' };
      const res = makeRes();
      await handler(req, res);
      expect(res._status).toBe(200);
      expect(res._json.ok).toBe(false);
      expect(typeof res._json.error).toBe('string');
    });
  });

  // ---------- 分支3（可选）：成功连通 ----------
  describe('分支3 成功连通', () => {
    it('pingDb(sql.query 成功) 返回 {ok:true, status:"ok", latencyMs>=0}', async () => {
      const ok = makeOkSql();
      const res = await pingDb(ok);
      expect(res.ok).toBe(true);
      expect(res.status).toBe('ok');
      expect(typeof res.latencyMs).toBe('number');
      expect(res.latencyMs!).toBeGreaterThanOrEqual(0);
      expect(ok.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('handler：getSql 返回成功的 sql → HTTP 200 + {ok:true, latencyMs>=0}', async () => {
      vi.mocked(getSql).mockReturnValue(makeOkSql());
      const req: any = { method: 'GET' };
      const res = makeRes();
      await handler(req, res);
      expect(res._status).toBe(200);
      expect(res._json.ok).toBe(true);
      expect(res._json.status).toBe('ok');
      expect(res._json.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });
});
