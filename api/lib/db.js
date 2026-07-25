/**
 * Neon Postgres 连接 + 表结构初始化
 *
 * Vercel 一键集成 Neon 时自动注入 POSTGRES_URL；
 * 用户也可单独配 DATABASE_URL 兼容其他 Postgres。
 */

import { neon } from '@neondatabase/serverless';

let _sql = null;
let _ready = null;

function getConnectionString() {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
}

/**
 * 获取 sql 执行器（懒初始化，首次调用时建表）
 */
export function getSql() {
  if (_sql) return _sql;
  const url = getConnectionString();
  if (!url) {
    throw new Error('未配置 POSTGRES_URL（请在 Vercel Storage 中开通 Neon）');
  }
  _sql = neon(url);
  return _sql;
}

const SCHEMA_USERS = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

const SCHEMA_USER_DATA = `
  CREATE TABLE IF NOT EXISTS user_data (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

/**
 * 幂等初始化表结构。多次调用安全。
 * neon v1.x 的 prepared statement 一次只接受一条 SQL，所以拆成两条独立调用。
 */
export async function ensureSchema() {
  if (_ready) return _ready;
  _ready = (async () => {
    const sql = getSql();
    await sql.query(SCHEMA_USERS);
    await sql.query(SCHEMA_USER_DATA);
  })();
  return _ready;
}
