/**
 * GET /api/auth/me
 * 已登录：200 + { user }
 * 未登录：401 + { user: null }（前端据此判断）
 */

import { ensureSchema } from '../lib/db.js';
import { getUserFromRequest } from '../lib/auth.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json; charset=utf-8',
};

function setCors(res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ user: null });
    return;
  }
  // ensureSchema 不强制调用；只在第一次访问时建立。
  // 简单起见直接返回 user，避免每次 me 都打 DB。
  res.status(200).json({ user });
}
