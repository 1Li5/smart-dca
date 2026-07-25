/**
 * POST /api/auth/register
 * Body: { username, password, inviteCode }
 * 成功：201 + { user }，自动 set auth cookie
 * 失败：400 邀请码/参数错；409 用户名已存在；503 邀请码未配置
 */

import { ensureSchema, getSql } from '../lib/db.js';
import {
  isRegistrationEnabled,
  isInviteCodeValid,
  hashPassword,
  signToken,
  setAuthCookie,
} from '../lib/auth.js';

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
  // Vercel 某些情况下 body 已是对象；兜底读原始流
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

  if (!isRegistrationEnabled()) {
    res.status(503).json({ error: '注册未开放，请联系管理员配置邀请码' });
    return;
  }

  const body = await readJson(req);
  const username = String(body?.username || '').trim();
  const password = String(body?.password || '');
  const inviteCode = String(body?.inviteCode || '');

  if (!username || username.length < 2 || username.length > 32) {
    res.status(400).json({ error: '用户名长度需在 2-32 之间' });
    return;
  }
  if (!/^[\w.\-@]+$/.test(username)) {
    res.status(400).json({ error: '用户名仅支持字母/数字/._-@' });
    return;
  }
  if (!password || password.length < 6 || password.length > 128) {
    res.status(400).json({ error: '密码长度需在 6-128 之间' });
    return;
  }
  if (!isInviteCodeValid(inviteCode)) {
    res.status(400).json({ error: '邀请码不正确' });
    return;
  }

  try {
    await ensureSchema();
    const sql = getSql();
    const existing = await sql`SELECT id FROM users WHERE username = ${username} LIMIT 1`;
    if (existing.length > 0) {
      res.status(409).json({ error: '该用户名已被占用' });
      return;
    }
    const hash = await hashPassword(password);
    const inserted = await sql`
      INSERT INTO users (username, password_hash) VALUES (${username}, ${hash})
      RETURNING id, username, created_at
    `;
    const user = inserted[0];
    const token = signToken(user);
    setAuthCookie(res, token);
    res.status(201).json({ user: { id: user.id, username: user.username } });
  } catch (err) {
    res.status(500).json({ error: err?.message || '注册失败' });
  }
}
