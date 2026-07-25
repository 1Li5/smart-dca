/* ============================================================
 * calc.ts — 定投策略计算内核（纯函数，无 DOM 依赖，TypeScript）
 * 所有金额保留 2 位小数；比例/权重/百分位保留 2 位小数
 * 极端值边界：定投金额下限 0、上限不超过 maxSingleAmount
 * 逻辑与旧版 calc.js 完全一致，仅补 TS 类型。
 * ============================================================ */

export type StatusKey = 'low' | 'normal' | 'high' | 'extreme' | 'buy' | 'sell' | 'hold' | null;

export interface Column {
  key: string;
  label: string;
  fmt?: (v: any) => string;
  statusField?: string;
  strong?: boolean;
}

export interface ResultRow {
  _status: StatusKey;
  [k: string]: any;
}

export interface Summary {
  label: string;
  value: string;
  expect?: string;
}

export interface StrategyResult {
  strategy: string;
  columns: Column[];
  rows: ResultRow[];
  summary: Summary | null;
  warnings: string[];
  copyLines: string[];
}

export interface Asset {
  id: string;
  name: string;
  code?: string;
  currentPrice: number;
  ma30: number;
  baseAmount: number;
  metricType: 'PE' | 'PB';
  valuationMetric: number;
  percentile: number;
  gridBasePrice: number;
  gridGap: number;
  gridAmount: number;
  holdingShares: number;
  gridUpper: number;
  gridLower: number;
  currentValue: number;
  targetRatio: number;
}

export interface AppState {
  activeStrategy: string;
  theme: 'light' | 'dark';
  monthlyBudget: number;
  maxSingleAmount: number;
  assets: Asset[];
  percentileTiers: {
    low: number;
    normalHigh: number;
    high: number;
    lowMult: number;
    normalMult: number;
    highMult: number;
  };
  ladderTiers: {
    sigHigh: number;
    lightHigh: number;
    normal: number;
    lightLow: number;
    sigLow: number;
  };
  va: {
    prevTargetValue: number;
    monthlyGrowth: number;
    prevEndActual: number;
    currentChange: number;
  };
  rebalance: {
    totalValue: number;
    rebalanceNow: boolean;
  };
}

// ---------- 通用工具 ----------
export function num(v: any): number {
  const n = parseFloat(v);
  return isFinite(n) ? n : 0;
}
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
// 上限封顶：maxA<=0 表示“不限”（UI 提示“0=不限”），不可当作 0 上限把金额清零
export function capMax(v: number, maxA: number): number {
  return maxA > 0 ? clamp(round2(v), 0, maxA) : round2(v);
}
export function round2(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}
export function fmtMoney(v: number): string {
  return round2(v).toFixed(2);
}
export function fmtNum(v: number, d?: number): string {
  d = d == null ? 2 : d;
  const f = Math.pow(10, d);
  return (Math.round((v + Number.EPSILON) * f) / f).toFixed(d);
}
export function fmtPct(v: number): string {
  return fmtNum(v, 2) + '%';
}
export function fmtSigned(v: number): string {
  const s = round2(v).toFixed(2);
  return (v > 0 ? '+' : '') + s;
}

// ====================================================================
// 策略0：位置权重法（默认）
// 位置权重 = 30月均值 / 当前点位
// 单标的金额 = 预算 × (位置权重 / 位置权重合计)
// ====================================================================
function calcPosition(state: AppState): StrategyResult {
  const budget = num(state.monthlyBudget);
  const maxA = num(state.maxSingleAmount);
  const assets = state.assets || [];

  const weights = assets.map((a) => {
    const cur = num(a.currentPrice);
    const ma = num(a.ma30);
    return cur > 0 && ma > 0 ? ma / cur : 0;
  });
  const sumW = weights.reduce((s, x) => s + x, 0);

  const rows: ResultRow[] = assets.map((a, i) => {
    const w = weights[i];
    let amount = sumW > 0 ? budget * (w / sumW) : 0;
    amount = capMax(amount, maxA);
    return {
      _status: null,
      name: a.name || '(未命名)',
      currentPrice: num(a.currentPrice),
      ma30: num(a.ma30),
      weight: w,
      amount: amount,
    };
  });

  const total = round2(rows.reduce((s, r) => s + r.amount, 0));
  const warnings: string[] = [];
  if (maxA > 0 && rows.some((r) => r.amount >= maxA - 1e-9 && sumW > 0 && r.weight > 0))
    warnings.push(`部分标的命中单期上限 ${fmtMoney(maxA)}，合计可能小于预算。`);
  else if (sumW > 0 && Math.abs(total - budget) > 0.01)
    warnings.push(`合计金额 ${fmtMoney(total)} 与预算 ${fmtMoney(budget)} 不一致（疑似精度问题）。`);

  return {
    strategy: 'position',
    columns: [
      { key: 'name', label: '标的名称' },
      { key: 'currentPrice', label: '当前点位', fmt: (v) => fmtNum(v) },
      { key: 'ma30', label: '30月均值', fmt: (v) => fmtNum(v) },
      { key: 'weight', label: '位置权重', fmt: (v) => fmtNum(v, 4) },
      { key: 'amount', label: '本期定投金额', fmt: fmtMoney, strong: true },
    ],
    rows,
    summary: { label: '合计总金额', value: fmtMoney(total), expect: fmtMoney(budget) },
    warnings,
    copyLines: rows.map((r) => `${r.name}\t${fmtMoney(r.amount)}`),
  };
}

// ====================================================================
// 策略1：估值百分位定投
// ====================================================================
function calcPercentile(state: AppState): StrategyResult {
  const t = state.percentileTiers || {};
  const low = num(t.low ?? 30);
  const normalHigh = num(t.normalHigh ?? 70);
  const high = num(t.high ?? 90);
  const lowMult = num(t.lowMult ?? 1.8);
  const normalMult = num(t.normalMult ?? 1.0);
  const highMult = num(t.highMult ?? 0.5);
  const maxA = num(state.maxSingleAmount);
  const assets = state.assets || [];

  const rows: ResultRow[] = assets.map((a) => {
    const p = num(a.percentile);
    let mult: number, status: StatusKey, statusLabel: string, paused = false;
    if (p < low) { mult = lowMult; status = 'low'; statusLabel = '低估'; }
    else if (p <= normalHigh) { mult = normalMult; status = 'normal'; statusLabel = '合理'; }
    else if (p <= high) { mult = highMult; status = 'high'; statusLabel = '高估'; }
    else { mult = 0; status = 'extreme'; statusLabel = '极度高估'; paused = true; }

    let amount = num(a.baseAmount) * mult;
    amount = capMax(amount, maxA);

    return {
      _status: status,
      name: a.name || '(未命名)',
      metric: `${a.metricType === 'PB' ? 'PB' : 'PE'} ${fmtNum(num(a.valuationMetric))}`,
      percentile: p,
      statusLabel,
      amount,
      paused,
    };
  });

  const total = round2(rows.reduce((s, r) => s + r.amount, 0));
  const warnings: string[] = [];
  const extreme = rows.filter((r) => r.paused);
  if (extreme.length)
    warnings.push(`止盈提示：${extreme.map((r) => r.name).join('、')} 估值百分位 > ${high}%（极度高估），已暂停定投，建议止盈。`);
  if (maxA > 0 && rows.some((r) => r.amount >= maxA - 1e-9 && !r.paused))
    warnings.push(`部分标的命中单期上限 ${fmtMoney(maxA)}。`);

  return {
    strategy: 'percentile',
    columns: [
      { key: 'name', label: '标的名称' },
      { key: 'metric', label: 'PE/PB' },
      { key: 'percentile', label: '估值百分位', fmt: fmtPct },
      { key: 'statusLabel', label: '估值状态', statusField: '_status' },
      { key: 'amount', label: '本期定投金额', fmt: fmtMoney, strong: true },
    ],
    rows,
    summary: { label: '合计定投金额', value: fmtMoney(total) },
    warnings,
    copyLines: rows.map((r) => `${r.name}\t${r.statusLabel}\t${fmtMoney(r.amount)}${r.paused ? '（已暂停/止盈）' : ''}`),
  };
}

// ====================================================================
// 策略2：阶梯档位定投
// ====================================================================
function calcLadder(state: AppState): StrategyResult {
  const t = state.ladderTiers || {};
  const mult = {
    sigHigh: num(t.sigHigh ?? 0.5),
    lightHigh: num(t.lightHigh ?? 0.8),
    normal: num(t.normal ?? 1.0),
    lightLow: num(t.lightLow ?? 1.5),
    sigLow: num(t.sigLow ?? 2.0),
  };
  const maxA = num(state.maxSingleAmount);
  const assets = state.assets || [];

  const rows: ResultRow[] = assets.map((a) => {
    const cur = num(a.currentPrice);
    const ma = num(a.ma30);
    const dev = ma > 0 ? ((cur - ma) / ma) * 100 : 0;
    let m: number, tier: string, status: StatusKey;
    if (dev > 20) { m = mult.sigHigh; tier = '显著高估'; status = 'high'; }
    else if (dev > 10) { m = mult.lightHigh; tier = '轻度高估'; status = 'high'; }
    else if (dev >= -10) { m = mult.normal; tier = '估值合理'; status = 'normal'; }
    else if (dev >= -20) { m = mult.lightLow; tier = '轻度低估'; status = 'low'; }
    else { m = mult.sigLow; tier = '显著低估'; status = 'low'; }

    let amount = num(a.baseAmount) * m;
    amount = capMax(amount, maxA);

    return {
      _status: status,
      name: a.name || '(未命名)',
      currentPrice: cur,
      ma30: ma,
      dev,
      tier,
      amount,
    };
  });

  const total = round2(rows.reduce((s, r) => s + r.amount, 0));
  const warnings: string[] = [];
  if (maxA > 0 && rows.some((r) => r.amount >= maxA - 1e-9))
    warnings.push(`部分标的命中单期上限 ${fmtMoney(maxA)}。`);

  return {
    strategy: 'ladder',
    columns: [
      { key: 'name', label: '标的名称' },
      { key: 'currentPrice', label: '当前点位', fmt: (v) => fmtNum(v) },
      { key: 'ma30', label: '30月均值', fmt: (v) => fmtNum(v) },
      { key: 'dev', label: '偏离比例', fmt: fmtSigned },
      { key: 'tier', label: '档位', statusField: '_status' },
      { key: 'amount', label: '本期定投金额', fmt: fmtMoney, strong: true },
    ],
    rows,
    summary: { label: '合计定投金额', value: fmtMoney(total) },
    warnings,
    copyLines: rows.map((r) => `${r.name}\t${fmtSigned(r.dev)}%\t${r.tier}\t${fmtMoney(r.amount)}`),
  };
}

// ====================================================================
// 策略3：价值平均策略（VA，账户级）
// ====================================================================
function calcVA(state: AppState): StrategyResult {
  const v = state.va || {};
  const prevTarget = num(v.prevTargetValue);
  const growth = num(v.monthlyGrowth);
  const prevEnd = num(v.prevEndActual);
  const change = num(v.currentChange) / 100;
  const maxA = num(state.maxSingleAmount);

  const target = prevTarget + growth;
  const beginActual = prevEnd * (1 + change);
  let amount = target - beginActual;
  const capped = maxA > 0 ? clamp(round2(amount), -maxA, maxA) : round2(amount);

  const direction = amount > 0 ? '买入' : amount < 0 ? '卖出' : '持有';
  const status: StatusKey = amount > 0 ? 'buy' : amount < 0 ? 'sell' : 'hold';

  const warnings: string[] = [];
  if (Math.abs(capped) !== Math.abs(round2(amount)))
    warnings.push(`操作金额受单期上限 ${fmtMoney(maxA)} 限制，已截断至 ${fmtMoney(Math.abs(capped))}。`);

  return {
    strategy: 'va',
    columns: [
      { key: 'target', label: '本期目标总市值', fmt: fmtMoney },
      { key: 'beginActual', label: '本期期初实际市值', fmt: fmtMoney },
      { key: 'amount', label: '本期操作金额', fmt: fmtMoney, strong: true },
      { key: 'direction', label: '操作方向', statusField: '_status' },
    ],
    rows: [{ _status: status, target, beginActual, amount: capped, direction }],
    summary: null,
    warnings,
    copyLines: [`目标总市值 ${fmtMoney(target)} | 期初实际 ${fmtMoney(beginActual)} | ${direction} ${fmtMoney(Math.abs(capped))}`],
  };
}

// ====================================================================
// 策略4：网格定投（每标的独立网格）
// ====================================================================
function calcGrid(state: AppState): StrategyResult {
  const maxA = num(state.maxSingleAmount);
  const assets = state.assets || [];

  const rows: ResultRow[] = assets.map((a) => {
    const base = num(a.gridBasePrice) || num(a.ma30);
    const gapPct = num(a.gridGap) || 5;
    const gap = gapPct / 100;
    const cur = num(a.currentPrice);
    const gAmount = num(a.gridAmount) || num(a.baseAmount);
    const upper = num(a.gridUpper);
    const lower = num(a.gridLower);
    const hold = num(a.holdingShares);

    let idx = 0;
    if (base > 0 && gap > 0 && cur > 0) {
      idx = Math.round(Math.log(cur / base) / Math.log(1 + gap));
    }

    let direction: string, status: StatusKey, count = 0, amount = 0, shares = 0;
    if (lower > 0 && cur <= lower) {
      direction = '买入'; status = 'buy'; count = Math.max(1, Math.abs(idx));
    } else if (upper > 0 && cur >= upper) {
      direction = '卖出'; status = 'sell'; count = Math.max(1, Math.abs(idx));
    } else if (idx < 0) {
      direction = '买入'; status = 'buy'; count = Math.abs(idx);
    } else if (idx > 0) {
      direction = '卖出'; status = 'sell'; count = Math.abs(idx);
    } else {
      direction = '持有'; status = 'hold'; count = 0;
    }

    if (count > 0 && cur > 0) {
      amount = capMax(count * gAmount, maxA);
      shares = amount / cur;
    }
    const deltaShares = status === 'buy' ? shares : status === 'sell' ? -shares : 0;
    const newHold = hold + deltaShares;

    return {
      _status: status,
      name: a.name || '(未命名)',
      currentPrice: cur,
      gridLevel: idx,
      direction,
      count,
      amount,
      shares: deltaShares,
      holdAfter: newHold,
    };
  });

  const warnings: string[] = [];
  if (maxA > 0 && rows.some((r) => r.amount >= maxA - 1e-9))
    warnings.push(`部分标的命中单期上限 ${fmtMoney(maxA)}。`);

  return {
    strategy: 'grid',
    columns: [
      { key: 'name', label: '标的名称' },
      { key: 'currentPrice', label: '当前价格', fmt: (v) => fmtNum(v) },
      { key: 'gridLevel', label: '所处网格档位', fmt: (v) => (v > 0 ? '+' : '') + v },
      { key: 'direction', label: '操作方向', statusField: '_status' },
      { key: 'amount', label: '操作金额', fmt: fmtMoney, strong: true },
      { key: 'shares', label: '持仓变动(份额)', fmt: (v) => fmtSigned(v) },
      { key: 'holdAfter', label: '变动后持仓', fmt: (v) => fmtNum(v, 2) },
    ],
    rows,
    summary: { label: '本期净投入合计', value: fmtMoney(round2(rows.reduce((s, r) => s + r.amount, 0))) },
    warnings,
    copyLines: rows.map((r) => `${r.name}\t${r.direction}\t${fmtMoney(r.amount)}\t份额${fmtSigned(r.shares)}`),
  };
}

// ====================================================================
// 策略5：恒定比例再平衡
// ====================================================================
function calcRebalance(state: AppState): StrategyResult {
  const budget = num(state.monthlyBudget);
  const maxA = num(state.maxSingleAmount);
  const assets = (state.assets || []).filter((a) => num(a.targetRatio) > 0);
  const totalInput = num(state.rebalance && state.rebalance.totalValue);
  const total = totalInput > 0 ? totalInput : assets.reduce((s, a) => s + num(a.currentValue), 0);
  const rebalanceNow = !!(state.rebalance && state.rebalance.rebalanceNow);

  const items = assets.map((a) => {
    const cv = num(a.currentValue);
    const tr = num(a.targetRatio);
    const targetVal = total * tr / 100;
    const currentRatio = total > 0 ? (cv / total) * 100 : 0;
    const gap = targetVal - cv; // >0 需买入
    return { id: a.id, name: a.name || '(未命名)', cv, tr, targetVal, currentRatio, gap };
  });

  const under = items.filter((it) => it.gap > 0);
  const totalGap = under.reduce((s, it) => s + it.gap, 0);
  const alloc: Record<string, number> = {};
  items.forEach((it) => (alloc[it.id] = 0));

  if (totalGap <= 0) {
    items.forEach((it) => (alloc[it.id] = budget * it.tr / 100));
  } else if (budget >= totalGap) {
    const rem = budget - totalGap;
    under.forEach((it) => (alloc[it.id] += it.gap));
    items.forEach((it) => (alloc[it.id] += rem * it.tr / 100));
  } else {
    under.forEach((it) => (alloc[it.id] = budget * it.gap / totalGap));
  }
  items.forEach((it) => (alloc[it.id] = capMax(alloc[it.id], maxA)));

  const ratioSum = items.reduce((s, it) => s + it.tr, 0);
  const allocSum = round2(items.reduce((s, it) => s + alloc[it.id], 0));

  const warnings: string[] = [];
  if (total <= 0)
    warnings.push('账户总市值与各资产当前市值合计均为 0，无法计算当前占比，已按目标比例分配新资金（首次建仓场景）。');
  if (Math.abs(ratioSum - 100) > 0.01)
    warnings.push(`目标配置比例合计 ${fmtNum(ratioSum, 2)}% ≠ 100%，请检查比例设置。`);
  if (Math.abs(allocSum - budget) > 0.01)
    warnings.push(`分配合计 ${fmtMoney(allocSum)} 与预算 ${fmtMoney(budget)} 不一致（比例合计≠100% 或触发上限）。`);

  const rows: ResultRow[] = items.map((it) => {
    let advice = '—';
    if (rebalanceNow) {
      const delta = it.targetVal - it.cv;
      if (delta > 0.01) advice = `买入 ${fmtMoney(delta)}`;
      else if (delta < -0.01) advice = `卖出 ${fmtMoney(-delta)}`;
      else advice = '维持';
    }
    return {
      _status: it.currentRatio < it.tr - 0.01 ? 'low' : it.currentRatio > it.tr + 0.01 ? 'high' : 'normal',
      name: it.name,
      tr: it.tr,
      currentRatio: it.currentRatio,
      alloc: alloc[it.id],
      advice,
    };
  });

  return {
    strategy: 'rebalance',
    columns: [
      { key: 'name', label: '资产名称' },
      { key: 'tr', label: '目标比例', fmt: fmtPct },
      { key: 'currentRatio', label: '当前占比', fmt: fmtPct, statusField: '_status' },
      { key: 'alloc', label: '本期分配金额', fmt: fmtMoney, strong: true },
      { key: 'advice', label: '再平衡操作建议', statusField: '_status' },
    ],
    rows,
    summary: { label: '分配合计', value: fmtMoney(allocSum), expect: fmtMoney(budget) },
    warnings,
    copyLines: rows.map((r) => `${r.name}\t目标${fmtPct(r.tr)}\t当前${fmtPct(r.currentRatio)}\t分配${fmtMoney(r.alloc)}\t${r.advice}`),
  };
}

// ---------- 策略分发 ----------
const CALC: Record<string, (state: AppState) => StrategyResult> = {
  position: calcPosition,
  percentile: calcPercentile,
  ladder: calcLadder,
  va: calcVA,
  grid: calcGrid,
  rebalance: calcRebalance,
};

export function runStrategy(strategy: string, state: AppState): StrategyResult {
  const fn = CALC[strategy];
  return fn ? fn(state) : { strategy, columns: [], rows: [], warnings: ['未知策略'], summary: null, copyLines: [] };
}

// 供「双策略对比」使用：计算某标的在某策略下的本期金额
export function assetAmountInStrategy(strategy: string, state: AppState, assetId: string): number | null {
  const res = runStrategy(strategy, state);
  const name = assetName(state, assetId);
  const byName = (res.rows || []).find((r) => r.name === name);
  if (byName && byName.amount != null) return byName.amount;
  return null;
}
function assetName(state: AppState, id: string): string {
  const a = (state.assets || []).find((x) => x.id === id);
  return a ? a.name : '';
}
