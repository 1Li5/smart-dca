/**
 * GET  /api/data   →  200 { payload, updatedAt }  或  200 { payload: null }
 * PUT  /api/data   →  200 { ok: true, updatedAt }
 * 未登录：401
 *
 * payload 是任意 JSON 对象（前端存 AppState 里的「标的列表 + 全局参数」子集）。
 * 后端不做结构校验，只做体积限制（200 KB 防滥用）。
 */

import { ensureSchema, getSql } from './lib/db.js';
import { getUserFromRequest } from './lib/auth.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json; charset=utf-8',
};

const MAX_PAYLOAD_BYTES = 200 * 1024;

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

async function ensure() {
  await ensureSchema();
  return getSql();
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: '未登录' });
    return;
  }

  try {
    const sql = await ensure();

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT payload, updated_at FROM user_data WHERE user_id = ${user.id} LIMIT 1
      `;
      if (rows.length === 0) {
        res.status(200).json({ payload: null, updatedAt: null });
        return;
      }
      const row = rows[0];
      res.status(200).json({
        payload: row.payload,
        updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
      });
      return;
    }

    if (req.method === 'PUT') {
      const body = await readJson(req);
      if (!body || typeof body !== 'object') {
        res.status(400).json({ error: '请求体需为 JSON 对象' });
        return;
      }
      const serialized = JSON.stringify(body);
      if (serialized.length > MAX_PAYLOAD_BYTES) {
        res.status(413).json({ error: `payload 超过 ${MAX_PAYLOAD_BYTES / 1024} KB 限制` });
        return;
      }
      const result = await sql`
        INSERT INTO user_data (user_id, payload, updated_at)
        VALUES (${user.id}, ${body}::jsonb, now())
        ON CONFLICT (user_id)
        DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()
        RETURNING updated_at
      `;
      const ts = result[0]?.updated_at;
      res.status(200).json({
        ok: true,
        updatedAt: ts instanceof Date ? ts.toISOString() : ts,
      });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err?.message || '服务器错误' });
  }
}
