'use strict';

/**
 * Vercel Serverless Function 入口（替代腾讯云 SCF 的 scf.js）
 * 文件路径：api/indicator.js  →  对外路由：/api/indicator
 *
 * 请求：GET /api/indicator?code=110011&type=fund
 * 响应：{ type, code, price, ma30, percentile, basis, basisLabel, approx, asOf, source }
 *
 * 项目根 package.json 含 "type": "module"，故本文件使用 ESM 语法。
 * Vercel Node.js 18+ 运行时自带全局 fetch / AbortController，无需任何依赖。
 */

import { getIndicator } from './lib/fetchData.js';

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
    const type = (req.query?.type || 'auto');

    if (!code) {
      res.status(200).json({ error: '缺少 code 参数' });
      return;
    }

    const data = await getIndicator(String(code), String(type));
    res.status(200).json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(200).json({ error: message });
  }
}
