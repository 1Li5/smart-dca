'use strict';

/**
 * 健康检查端点（纯探测，不连数据库）
 * 文件路径：api/health.js  →  对外路由：/api/health
 *
 * 请求：GET /api/health   （亦支持 OPTIONS 预检）
 * 响应：200 { status, timestamp, postgres, env }
 *
 * 设计原则：
 * 1. 不连接 Postgres —— 避免 DB 抖动导致健康检查误报「服务挂」。
 * 2. 仅探测关键环境变量是否就绪，便于部署后快速判断配置是否到位。
 *
 * 项目根 package.json 含 "type": "module"，故本文件使用 ESM 语法。
 */

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // 预检请求直接放行，与其他 api 端点保持一致
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    postgres: process.env.POSTGRES_URL ? 'configured' : 'missing',
    env: process.env.VITE_API_BASE ? 'api-base-set' : 'api-base-empty',
  });
}
