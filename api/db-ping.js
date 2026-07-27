'use strict';

/**
 * 真实数据库连通探针
 * 文件路径：api/db-ping.js  →  对外路由：/api/db-ping
 *
 * 用途：供外部监控（UptimeRobot → agent-mail）判断 Postgres 是否"真连通"，
 *       而不仅仅是部署配置是否就绪。区别于 /api/health（后者只看环境变量，不连库）。
 *
 * 请求：GET /api/db-ping   （亦支持 OPTIONS 预检）
 *
 * 响应（永远是 HTTP 200，绝不抛 500）—— 避免监控把"DB 挂"误判成"服务挂"：
 *   配置缺失：{ ok:false, reason:'config missing' }
 *   连通成功：{ status:'ok', ok:true, latencyMs:<毫秒> }
 *   连通失败：{ ok:false, error:'<简短错误信息>' }
 *
 * 监控判定：HTTP 200 且 body.ok === true （不只看 HTTP 200，
 *           因为 config missing / 连接失败也返回 200 但 ok:false）。
 *
 * 项目根 package.json 含 "type": "module"，故本文件使用 ESM 语法。
 */

import { getSql } from './lib/db.js';

/**
 * 纯函数：探测一个已获取的 sql 执行器是否能真正连接数据库。
 * 不依赖 Vercel 的 req/res，便于本地 node 脚本直接自测。
 *
 * @param {object|null} sql - 由 getSql() 获取的 neon 客户端；传 null 表示未配置连接串。
 * @returns {Promise<{ok:boolean, reason?:string, error?:string, status?:string, latencyMs?:number}>}
 */
export async function pingDb(sql) {
  // 连接串缺失：不连库，直接返回 config missing
  if (!sql) {
    return { ok: false, reason: 'config missing' };
  }

  const start = Date.now();
  try {
    // 与 db.js 风格一致的等价 API：sql.query(...)
    await sql.query('SELECT 1');
    const latencyMs = Date.now() - start;
    return { status: 'ok', ok: true, latencyMs };
  } catch (err) {
    // 连接失败 / 超时 / 任何异常：一律捕获并返回 ok:false，绝不抛出
    const message = err && err.message ? err.message : String(err);
    return { ok: false, error: message };
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // 预检请求直接放行，与其他 api 端点保持一致
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // 尝试获取 sql 客户端；配置缺失时 getSql() 会抛错，这里捕获并转成 config missing
  let sql = null;
  try {
    sql = getSql();
  } catch (e) {
    sql = null;
  }

  const result = await pingDb(sql);
  res.status(200).json(result);
}
