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

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS user_data (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

/**
 * 幂等初始化表结构。多次调用安全。
 */
export async function ensureSchema() {
  if (_ready) return _ready;
  _ready = (async () => {
    const sql = getSql();
    // 多条 DDL 用字符串传入；必须走 .query() 因为 neon() v1.x 不再支持
    // 直接把多语句 SQL 当 tagged template 的字符串部分。
    await sql.query(SCHEMA_SQL);
  })();
  return _ready;
}
