'use strict';

/**
 * Vercel Serverless Function 入口
 * 文件路径：api/series.js  →  对外路由：/api/series
 *
 * 请求：GET /api/series?code=000300&type=index
 * 响应：{ code, type, monthly:[{date:'YYYY-MM', close:Number}], source }
 *      失败：{ error: message }（HTTP 200，与 indicator.js 一致）
 *
 * 复用 api/lib/fetchData.js 的 getMonthlySeries（真实历史月线，非 mock）。
 * Vercel Node.js 18+ 运行时自带全局 fetch / AbortController，无需任何依赖。
 */

import { getMonthlySeries, resolveSinaSymbol } from './lib/fetchData.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
  'Content-Type': 'application/json; charset=utf-8',
};

function setCors(res) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
}

export default async function handler(req, res) {
  setCors(res);

  // 预检请求直接放行
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    const code = req.query?.code;
    const type = String(req.query?.type || 'auto');

    if (!code) {
      res.status(200).json({ error: '缺少 code 参数' });
      return;
    }

    const monthly = await getMonthlySeries(String(code), type);

    // source 仅作信息展示：显式 fund/index 直接映射；auto 按代码是否可解析为指数推断
    let source = 'unknown';
    if (type === 'fund') source = 'eastmoney-nav';
    else if (type === 'index') source = 'sina-daily';
    else source = resolveSinaSymbol(String(code)) ? 'sina-daily' : 'eastmoney-nav';

    res.status(200).json({ code: String(code), type, monthly, source });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(200).json({ error: message });
  }
}
