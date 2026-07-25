/**
 * 鉴权工具：密码哈希、JWT 签发与校验、Cookie 读写
 *
 * - 密码用 bcryptjs（纯 JS，兼容 Vercel Serverless，无需原生编译）
 * - JWT 用 HS256，密钥从 JWT_SECRET 注入，30 天有效
 * - Cookie httpOnly + sameSite=lax；生产环境自动 secure
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'dca_token';
const TOKEN_TTL_SEC = 30 * 24 * 60 * 60; // 30 天

function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('未配置 JWT_SECRET 环境变量');
  return s;
}

function getInviteCode() {
  return (process.env.INVITE_CODE || '').trim();
}

export function isInviteCodeValid(input) {
  const expected = getInviteCode();
  if (!expected) return false; // 未配置邀请码 = 关闭注册
  return String(input || '').trim() === expected;
}

export function isRegistrationEnabled() {
  return getInviteCode().length > 0;
}

/** 密码哈希。bcrypt 10 轮 ≈ 60ms，平衡安全与响应速度。 */
export async function hashPassword(plain) {
  return bcrypt.hash(String(plain), 10);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(String(plain), String(hash));
}

/** 签发 JWT，载荷只放 userId + username */
export function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username },
    getJwtSecret(),
    { algorithm: 'HS256', expiresIn: TOKEN_TTL_SEC }
  );
}

/** 校验并解码 token；失败返回 null */
export function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

function parseCookies(headerValue) {
  const out = {};
  if (!headerValue) return out;
  for (const part of String(headerValue).split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join('='));
  }
  return out;
}

/** 从 req 读取 token 并校验；成功返回 {id, username}，否则 null */
export function getUserFromRequest(req) {
  const cookies = parseCookies(req.headers?.cookie);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || typeof payload.sub !== 'number') return null;
  return { id: payload.sub, username: payload.username };
}

/** 设置鉴权 cookie 到 res。生产（Vercel）走 https，自动加 secure */
export function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${TOKEN_TTL_SEC}`,
  ];
  if (isProd) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearAuthCookie(res) {
  const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (isProd) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}
