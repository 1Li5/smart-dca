/**
 * POST /api/auth/login
 * Body: { username, password }
 * 成功：200 + { user }，自动 set auth cookie
 * 失败：401 用户名或密码错误；400 参数错
 */

import { ensureSchema, getSql } from '../lib/db.js';
import { verifyPassword, signToken, setAuthCookie } from '../lib/auth.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json; charset=utf-8',
};

function setCors(res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return null;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = await readJson(req);
  const username = String(body?.username || '').trim();
  const password = String(body?.password || '');
  if (!username || !password) {
    res.status(400).json({ error: '请输入用户名和密码' });
    return;
  }

  try {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT id, username, password_hash FROM users WHERE username = ${username} LIMIT 1
    `;
    const row = rows[0];
    if (!row) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }
    const ok = await verifyPassword(password, row.password_hash);
    if (!ok) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }
    const user = { id: row.id, username: row.username };
    const token = signToken(user);
    setAuthCookie(res, token);
    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ error: err?.message || '登录失败' });
  }
}
