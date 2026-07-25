'use strict';
/**
 * 行情数据抓取核心（服务端，规避浏览器 CORS）
 * - 基金：东财 NAV 历史 api.fund.eastmoney.com/f10/lsjz
 * - 指数/ETF：新浪日线 money.finance.sina.com.cn（scale=240），聚合月线
 * 计算：30 月均线（真实近30月均值）、估值分位（10年月度序列排名）
 *
 * 估值口径说明：
 *  - 指数/ETF：用“价格分位”（10年月度收盘排名），标注 approx/basis:'price'
 *  - 基金：    用“净值分位”（10年月度单位净值排名），basis:'nav'
 *  两者均为真实排名，但非官方 PE/PB 估值分位，前端会明确标注“参考”。
 */

const REGISTRY = {
  // 常见指数/ETF -> 新浪 symbol（避免 6 位代码市场前缀歧义）
  '000300': 'sh000300', '399905': 'sz399905', '399006': 'sz399006',
  '000001': 'sh000001', '399001': 'sz399001', '000688': 'sh000688',
  '000016': 'sh000016', '399300': 'sz399300', '950300': 'sh000300',
  'NDX': 'gb_ixic', 'IXIC': 'gb_ixic', 'INX': 'gb_inx', 'SPX': 'gb_inx',
  '518880': 'sh518880', '513100': 'sh513100', '510300': 'sh510300',
  '159915': 'sz159915', '513500': 'sh513500', '161725': 'sz161725',
};

function resolveSinaSymbol(code) {
  if (!code) return null;
  let c = String(code).trim().toUpperCase();
  if (/^(SH|SZ|HK|GB)/i.test(c)) return c.toLowerCase();
  if (REGISTRY[c]) return REGISTRY[c];
  if (/^\d{6}$/.test(c)) return 'sh' + c; // 6位默认沪市（基金走 NAV，不依赖此）
  return null;
}

async function httpGetJson(url, headers, timeoutMs = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: Object.assign({ 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json, */*' }, headers || {}),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    try { return JSON.parse(text); } catch (e) { return text; }
  } finally {
    clearTimeout(t);
  }
}

// 新浪日线 -> [{date:'YYYY-MM-DD', close:Number}]
async function fetchSinaDaily(symbol, datalen = 1600) {
  const url = `https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${symbol}&scale=240&ma=no&datalen=${datalen}`;
  const data = await httpGetJson(url, { Referer: 'https://finance.sina.com.cn/' }, 8000);
  if (!Array.isArray(data) || !data.length) throw new Error('新浪日线空数据');
  return data
    .map((d) => ({ date: d.day, close: parseFloat(d.close) }))
    .filter((d) => isFinite(d.close))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

async function httpGetText(url, headers, timeoutMs = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: Object.assign({ 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' }, headers || {}),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

// 东财基金全量净值文件（一次拿回完整历史，含 Data_netWorthTrend）
// 返回 [{date:'YYYY-MM-DD', nav:Number}] 升序
async function fetchFundNavFull(fundCode) {
  const url = `https://fund.eastmoney.com/pingzhongdata/${fundCode}.js`;
  const text = await httpGetText(url, { Referer: 'https://fundf10.eastmoney.com/' }, 9000);
  const m = text.match(/Data_netWorthTrend\s*=\s*(\[[\s\S]*?\]);/);
  if (!m) throw new Error('净值数据解析失败');
  let arr;
  try { arr = JSON.parse(m[1]); } catch (e) { throw new Error('净值JSON解析失败'); }
  if (!Array.isArray(arr) || !arr.length) throw new Error('基金净值历史空数据');
  return arr
    .map((p) => ({ date: new Date(p.x).toISOString().slice(0, 10), nav: Number(p.y) }))
    .filter((p) => isFinite(p.nav) && p.date)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

function toMonthly(series) {
  const m = new Map();
  for (const d of series) m.set(d.date.slice(0, 7), d.close != null ? d.close : d.nav);
  return [...m.entries()]
    .map(([date, close]) => ({ date, close }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

function computeMA30(monthly) {
  if (!monthly.length) throw new Error('无月线数据');
  const level = monthly[monthly.length - 1].close;
  const asOf = monthly[monthly.length - 1].date;
  const window = monthly.slice(-30);
  const ma30 = window.reduce((a, b) => a + b.close, 0) / window.length;
  return { level, ma30, asOf, months: monthly.length };
}

function computePercentile(monthly) {
  const vals = monthly.map((m) => m.close);
  const cur = vals[vals.length - 1];
  const below = vals.filter((v) => v <= cur).length;
  return Math.round((below / vals.length) * 10000) / 100; // 两位小数百分比
}

async function getFundIndicator(code) {
  const nav = await fetchFundNavFull(code);
  if (nav.length < 2) throw new Error('净值数据过少');
  const monthly = toMonthly(nav);
  const { level, ma30, asOf } = computeMA30(monthly);
  const percentile = computePercentile(monthly);
  return {
    type: 'fund',
    code,
    price: Math.round(level * 100) / 100,
    ma30: Math.round(ma30 * 100) / 100,
    percentile,
    basis: 'nav',
    basisLabel: '净值分位',
    approx: true,
    asOf,
    source: 'eastmoney-nav',
  };
}

async function getIndexIndicator(code) {
  const symbol = resolveSinaSymbol(code);
  if (!symbol) throw new Error('无法解析指数代码: ' + code);
  const daily = await fetchSinaDaily(symbol);
  if (daily.length < 2) throw new Error('日线数据过少');
  const monthly = toMonthly(daily);
  const { level, ma30, asOf } = computeMA30(monthly);
  const percentile = computePercentile(monthly);
  return {
    type: 'index',
    code,
    symbol,
    price: Math.round(level * 100) / 100,
    ma30: Math.round(ma30 * 100) / 100,
    percentile,
    basis: 'price',
    basisLabel: '价格分位(近似,非官方PE分位)',
    approx: true,
    asOf,
    source: 'sina-daily',
  };
}

/**
 * 统一入口
 * @param {string} code 基金代码 或 指数/ETF 代码
 * @param {'auto'|'fund'|'index'} type
 */
async function getIndicator(code, type) {
  if (!code) throw new Error('缺少 code 参数');
  code = String(code).trim();
  if (type === 'fund') return await getFundIndicator(code);
  if (type === 'index') return await getIndexIndicator(code);
  // auto: 先试基金（6位代码多为基金），失败再试指数
  try {
    return await getFundIndicator(code);
  } catch (e1) {
    try {
      return await getIndexIndicator(code);
    } catch (e2) {
      throw new Error('无法获取指标（基金/指数均失败）：' + e1.message + ' | ' + e2.message);
    }
  }
}

export { getIndicator, getFundIndicator, getIndexIndicator, resolveSinaSymbol };
