import { describe, it, expect } from 'vitest';
import { runStrategy } from './calc';
import { DEFAULT_STATE, makeAsset } from './defaults';
import type { AppState, Asset } from './calc';

function cloneState(): AppState {
  return structuredClone(DEFAULT_STATE);
}

function mkAsset(name: string, partial: Partial<Asset> = {}): Asset {
  return { ...makeAsset(name), ...partial };
}

// ====================================================================
// 策略0：位置权重法
// 权重 = ma30>0&&cur>0 ? ma30/cur : 0; amount = budget*(w/Σw) 再 capMax
// ====================================================================
describe('position 位置权重法', () => {
  const assets = [
    mkAsset('A', { currentPrice: 100, ma30: 100 }),
    mkAsset('B', { currentPrice: 200, ma30: 100 }),
    mkAsset('C', { currentPrice: 100, ma30: 50 }),
  ];

  it('P-1 无上限：按权重分配 1500/750/750，合计=预算，无警告', () => {
    const s = cloneState();
    s.monthlyBudget = 3000;
    s.maxSingleAmount = 0;
    s.assets = assets.map((a) => ({ ...a }));
    const res = runStrategy('position', s);
    expect(res.rows[0].amount).toBe(1500);
    expect(res.rows[1].amount).toBe(750);
    expect(res.rows[2].amount).toBe(750);
    const total = res.rows.reduce((acc, r) => acc + r.amount, 0);
    expect(total).toBe(3000);
    expect(res.warnings).toEqual([]);
  });

  it('P-2 命中单期上限：首项=1000，其余750/750，合计<预算并提示', () => {
    const s = cloneState();
    s.monthlyBudget = 3000;
    s.maxSingleAmount = 1000;
    s.assets = assets.map((a) => ({ ...a }));
    const res = runStrategy('position', s);
    expect(res.rows[0].amount).toBe(1000);
    expect(res.rows[1].amount).toBe(750);
    expect(res.rows[2].amount).toBe(750);
    const total = res.rows.reduce((acc, r) => acc + r.amount, 0);
    expect(total).toBe(2500);
    expect(
      res.warnings.some((w) => w.includes('部分标的命中单期上限 1000.00，合计可能小于预算。'))
    ).toBe(true);
  });
});

// ====================================================================
// 策略1：估值百分位定投
// 默认档：p<30→低估×1.8; 30≤p≤70→合理×1.0; 70<p≤90→高估×0.5; p>90→极度高估 amount=0 且 paused
// ====================================================================
describe('percentile 估值百分位', () => {
  it('PC-1 百分位=95 极度高估暂停，金额=0，提示止盈', () => {
    const s = cloneState();
    s.maxSingleAmount = 0;
    s.assets = [mkAsset('X', { percentile: 95, baseAmount: 1000 })];
    const res = runStrategy('percentile', s);
    const r = res.rows[0];
    expect(r._status).toBe('extreme');
    expect(r.paused).toBe(true);
    expect(r.amount).toBe(0);
    expect(
      res.warnings.some((w) => w.includes('估值百分位 > 90%（极度高估），已暂停定投，建议止盈。'))
    ).toBe(true);
  });

  it('PC-2 百分位=20 低估×1.8 → 1800', () => {
    const s = cloneState();
    s.assets = [mkAsset('X', { percentile: 20, baseAmount: 1000 })];
    const res = runStrategy('percentile', s);
    const r = res.rows[0];
    expect(r._status).toBe('low');
    expect(r.statusLabel).toBe('低估');
    expect(r.amount).toBe(1800);
  });

  it('PC-3 低估×1.8 期望3600，但命中上限 3000 截断', () => {
    const s = cloneState();
    s.maxSingleAmount = 3000;
    s.assets = [mkAsset('X', { percentile: 20, baseAmount: 2000 })];
    const res = runStrategy('percentile', s);
    expect(res.rows[0].amount).toBe(3000);
    expect(res.warnings.some((w) => w.includes('部分标的命中单期上限 3000.00。'))).toBe(true);
  });
});

// ====================================================================
// 策略2：阶梯档位定投
// dev>20→显著高估0.5; 10<dev≤20→轻度高估0.8; -10≤dev≤10→合理1.0; -20≤dev<-10→轻度低估1.5; dev<-20→显著低估2.0
// ====================================================================
describe('ladder 阶梯档位', () => {
  const cases: Array<{
    cur: number;
    ma: number;
    tier: string;
    status: AppState['activeStrategy'] | string; // StatusKey 字符串
    amount: number;
  }> = [
    { cur: 120, ma: 100, tier: '轻度高估', status: 'high', amount: 800 }, // dev=20
    { cur: 110, ma: 100, tier: '估值合理', status: 'normal', amount: 1000 }, // dev=10
    { cur: 100, ma: 100, tier: '估值合理', status: 'normal', amount: 1000 }, // dev=0
    { cur: 90, ma: 100, tier: '估值合理', status: 'normal', amount: 1000 }, // dev=-10
    { cur: 80, ma: 100, tier: '轻度低估', status: 'low', amount: 1500 }, // dev=-20
    { cur: 121, ma: 100, tier: '显著高估', status: 'high', amount: 500 }, // dev=21
    { cur: 79, ma: 100, tier: '显著低估', status: 'low', amount: 2000 }, // dev=-21
  ];

  cases.forEach((c, i) => {
    it(`LD-1 边界 #${i + 1}：cur=${c.cur} ma=${c.ma} → ${c.tier}`, () => {
      const s = cloneState();
      s.maxSingleAmount = 0;
      s.assets = [mkAsset('X', { currentPrice: c.cur, ma30: c.ma, baseAmount: 1000 })];
      const res = runStrategy('ladder', s);
      const r = res.rows[0];
      expect(r.tier).toBe(c.tier);
      expect(r._status).toBe(c.status);
      expect(r.amount).toBe(c.amount);
    });
  });

  it('LD-2 显著低估×1.5 期望4500，但命中上限 1000 截断', () => {
    const s = cloneState();
    s.maxSingleAmount = 1000;
    s.assets = [mkAsset('X', { currentPrice: 80, ma30: 100, baseAmount: 3000 })];
    const res = runStrategy('ladder', s);
    expect(res.rows[0].amount).toBe(1000);
    expect(res.warnings.some((w) => w.includes('部分标的命中单期上限 1000.00。'))).toBe(true);
  });
});

// ====================================================================
// 策略3：价值平均 VA（账户级）
// target=prevTarget+growth; beginActual=prevEnd×(1+change); amount=target-beginActual 再 clamp[-maxA,maxA]
// ====================================================================
describe('va 价值平均', () => {
  function vaState(vaPartial: Partial<AppState['va']>, maxSingleAmount = 0): AppState {
    const s = cloneState();
    s.maxSingleAmount = maxSingleAmount;
    s.va = { ...DEFAULT_STATE.va, ...vaPartial };
    return s;
  }

  it('VA-1 目标>期初：买入 5600', () => {
    const s = vaState({ prevTargetValue: 50000, monthlyGrowth: 5000, prevEndActual: 52000, currentChange: -5 });
    const res = runStrategy('va', s);
    const r = res.rows[0];
    expect(r.amount).toBe(5600);
    expect(r.direction).toBe('买入');
    expect(r._status).toBe('buy');
    expect(res.warnings).toEqual([]);
  });

  it('VA-2 期初>目标：卖出 -7400', () => {
    const s = vaState({ prevEndActual: 52000, currentChange: 20 });
    const res = runStrategy('va', s);
    const r = res.rows[0];
    expect(r.amount).toBe(-7400);
    expect(r.direction).toBe('卖出');
    expect(r._status).toBe('sell');
  });

  it('VA-3 目标=期初：持有 0', () => {
    const s = vaState({ prevTargetValue: 50000, monthlyGrowth: 5000, prevEndActual: 55000, currentChange: 0 });
    const res = runStrategy('va', s);
    const r = res.rows[0];
    expect(r.amount).toBe(0);
    expect(r.direction).toBe('持有');
    expect(r._status).toBe('hold');
  });

  it('VA-4 命中上限：截断至 1000 并提示', () => {
    const s = vaState({ prevTargetValue: 50000, monthlyGrowth: 5000, prevEndActual: 52000, currentChange: -5 }, 1000);
    const res = runStrategy('va', s);
    const r = res.rows[0];
    expect(r.amount).toBe(1000);
    expect(r.direction).toBe('买入');
    expect(r._status).toBe('buy');
    expect(
      res.warnings.some((w) => w.includes('操作金额受单期上限 1000.00 限制，已截断至 1000.00。'))
    ).toBe(true);
  });
});

// ====================================================================
// 策略4：网格定投（每标的独立网格）
// base=gridBasePrice||ma30; gap=gridGap||5(%); idx=round(log(cur/base)/log(1+gap/100))
// 优先级：cur≤lower→买入(count=max(1,|idx|)); cur≥upper→卖出(count=max(1,|idx|)); idx<0→买入; idx>0→卖出; 否则持有
// ====================================================================
describe('grid 网格定投', () => {
  function gridAsset(cur: number, partial: Partial<Asset> = {}): Asset {
    return mkAsset('G', {
      currentPrice: cur,
      gridBasePrice: 18000,
      gridGap: 5,
      gridAmount: 1000,
      gridUpper: 24000,
      gridLower: 12000,
      holdingShares: 100,
      ...partial,
    });
  }

  it('GR-1 价格≤下限：gridLevel=-12 买入12格 amount=12000 holdAfter=101.2', () => {
    const s = cloneState();
    s.maxSingleAmount = 0;
    s.assets = [gridAsset(10000)];
    const r = runStrategy('grid', s).rows[0];
    expect(r.gridLevel).toBe(-12);
    expect(r.direction).toBe('买入');
    expect(r.count).toBe(12);
    expect(r.amount).toBe(12000);
    expect(r.shares).toBeCloseTo(1.2, 5);
    expect(r.holdAfter).toBeCloseTo(101.2, 5);
  });

  it('GR-2 价格≥上限：gridLevel=6 卖出6格 amount=6000 holdAfter=99.75', () => {
    const s = cloneState();
    s.maxSingleAmount = 0;
    s.assets = [gridAsset(24000)];
    const r = runStrategy('grid', s).rows[0];
    expect(r.gridLevel).toBe(6);
    expect(r.direction).toBe('卖出');
    expect(r.count).toBe(6);
    expect(r.amount).toBe(6000);
    expect(r.shares).toBeCloseTo(-0.25, 5);
    expect(r.holdAfter).toBeCloseTo(99.75, 5);
  });

  it('GR-3 区间内侧：gridLevel=-1 买入1格 holdAfter≈100.0588', () => {
    const s = cloneState();
    s.maxSingleAmount = 0;
    s.assets = [gridAsset(17000)];
    const r = runStrategy('grid', s).rows[0];
    expect(r.gridLevel).toBe(-1);
    expect(r.direction).toBe('买入');
    expect(r.count).toBe(1);
    expect(r.amount).toBe(1000);
    expect(r.shares).toBeCloseTo(0.0588, 4);
    expect(r.holdAfter).toBeCloseTo(100.0588, 4);
  });

  it('GR-4 区间内侧：gridLevel=1 卖出1格 holdAfter≈99.9474', () => {
    const s = cloneState();
    s.maxSingleAmount = 0;
    s.assets = [gridAsset(19000)];
    const r = runStrategy('grid', s).rows[0];
    expect(r.gridLevel).toBe(1);
    expect(r.direction).toBe('卖出');
    expect(r.count).toBe(1);
    expect(r.amount).toBe(1000);
    expect(r.shares).toBeCloseTo(-0.0526, 4);
    expect(r.holdAfter).toBeCloseTo(99.9474, 4);
  });

  it('GR-5 基准价：gridLevel=0 持有 count=0 amount=0 holdAfter=100', () => {
    const s = cloneState();
    s.maxSingleAmount = 0;
    s.assets = [gridAsset(18000)];
    const r = runStrategy('grid', s).rows[0];
    expect(r.gridLevel).toBe(0);
    expect(r.direction).toBe('持有');
    expect(r.count).toBe(0);
    expect(r.amount).toBe(0);
    expect(r.shares).toBe(0);
    expect(r.holdAfter).toBe(100);
  });

  it('GR-6 同GR-1 但命中上限 5000：count不变，amount=5000 holdAfter=100.5', () => {
    const s = cloneState();
    s.maxSingleAmount = 5000;
    s.assets = [gridAsset(10000)];
    const res = runStrategy('grid', s);
    const r = res.rows[0];
    expect(r.count).toBe(12);
    expect(r.amount).toBe(5000);
    expect(r.shares).toBeCloseTo(0.5, 5);
    expect(r.holdAfter).toBeCloseTo(100.5, 5);
    expect(res.warnings.some((w) => w.includes('部分标的命中单期上限 5000.00。'))).toBe(true);
  });
});

// ====================================================================
// 策略5：恒定比例再平衡
// total = totalValue>0 ? totalValue : ΣcurrentValue
// 无under(totalGap≤0)→budget×tr/100; budget≥totalGap→先 under 各加 gap,再每项加 rem×tr/100; budget<totalGap→仅 under 加 budget×gap/totalGap
// ====================================================================
describe('rebalance 恒定比例再平衡', () => {
  function rbState(
    assets: Asset[],
    opts: {
      totalValue?: number;
      rebalanceNow?: boolean;
      monthlyBudget?: number;
      maxSingleAmount?: number;
    } = {}
  ): AppState {
    const s = cloneState();
    s.assets = assets;
    if (opts.monthlyBudget !== undefined) s.monthlyBudget = opts.monthlyBudget;
    if (opts.maxSingleAmount !== undefined) s.maxSingleAmount = opts.maxSingleAmount;
    s.rebalance = {
      totalValue: opts.totalValue ?? 0,
      rebalanceNow: opts.rebalanceNow ?? false,
    };
    return s;
  }

  it('RB-1 三资产补足低配：alloc 5000/23000/2000，合计=预算，无警告', () => {
    const s = rbState(
      [
        mkAsset('a1', { currentValue: 200000, targetRatio: 50 }),
        mkAsset('a2', { currentValue: 100000, targetRatio: 30 }),
        mkAsset('a3', { currentValue: 100000, targetRatio: 20 }),
      ],
      { totalValue: 400000, monthlyBudget: 30000 }
    );
    const res = runStrategy('rebalance', s);
    expect(res.rows[0].alloc).toBe(5000);
    expect(res.rows[0]._status).toBe('normal');
    expect(res.rows[1].alloc).toBe(23000);
    expect(res.rows[1]._status).toBe('low');
    expect(res.rows[2].alloc).toBe(2000);
    expect(res.rows[2]._status).toBe('high');
    const sum = res.rows.reduce((acc, r) => acc + r.alloc, 0);
    expect(sum).toBe(30000);
    expect(res.warnings).toEqual([]);
  });

  it('RB-2 比例合计≠100%：分配合计≠预算，两项警告', () => {
    const s = rbState(
      [
        mkAsset('a1', { currentValue: 200000, targetRatio: 50 }),
        mkAsset('a2', { currentValue: 100000, targetRatio: 30 }),
      ],
      { totalValue: 400000, monthlyBudget: 30000 }
    );
    const res = runStrategy('rebalance', s);
    const sum = res.rows.reduce((acc, r) => acc + r.alloc, 0);
    expect(sum).toBe(28000);
    expect(
      res.warnings.some((w) => w.includes('目标配置比例合计 80.00% ≠ 100%，请检查比例设置。'))
    ).toBe(true);
    expect(
      res.warnings.some((w) => w.includes('分配合计 28000.00 与预算 30000.00 不一致（比例合计≠100% 或触发上限）。'))
    ).toBe(true);
  });

  it('RB-3 首次建仓（total=0）：按目标比例 15000/9000/6000', () => {
    const s = rbState(
      [
        mkAsset('a1', { currentValue: 0, targetRatio: 50 }),
        mkAsset('a2', { currentValue: 0, targetRatio: 30 }),
        mkAsset('a3', { currentValue: 0, targetRatio: 20 }),
      ],
      { totalValue: 0, monthlyBudget: 30000 }
    );
    const res = runStrategy('rebalance', s);
    expect(res.rows[0].alloc).toBe(15000);
    expect(res.rows[1].alloc).toBe(9000);
    expect(res.rows[2].alloc).toBe(6000);
    const sum = res.rows.reduce((acc, r) => acc + r.alloc, 0);
    expect(sum).toBe(30000);
    expect(
      res.warnings.some((w) => w.includes('已按目标比例分配新资金（首次建仓场景）。'))
    ).toBe(true);
  });

  it('RB-4 rebalanceNow：a2 买入 20000，a1 维持，a3 卖出 20000', () => {
    const s = rbState(
      [
        mkAsset('a1', { currentValue: 200000, targetRatio: 50 }),
        mkAsset('a2', { currentValue: 100000, targetRatio: 30 }),
        mkAsset('a3', { currentValue: 100000, targetRatio: 20 }),
      ],
      { totalValue: 400000, monthlyBudget: 30000, rebalanceNow: true }
    );
    const res = runStrategy('rebalance', s);
    expect(res.rows[0].advice).toBe('维持');
    expect(res.rows[1].advice).toBe('买入 20000.00');
    expect(res.rows[2].advice).toBe('卖出 20000.00');
  });

  it('RB-5 命中上限：a2 截断至 10000，分配合计≠预算并提示', () => {
    const s = rbState(
      [
        mkAsset('a1', { currentValue: 200000, targetRatio: 50 }),
        mkAsset('a2', { currentValue: 100000, targetRatio: 30 }),
        mkAsset('a3', { currentValue: 100000, targetRatio: 20 }),
      ],
      { totalValue: 400000, monthlyBudget: 30000, maxSingleAmount: 10000 }
    );
    const res = runStrategy('rebalance', s);
    expect(res.rows[0].alloc).toBe(5000);
    expect(res.rows[1].alloc).toBe(10000);
    expect(res.rows[2].alloc).toBe(2000);
    const sum = res.rows.reduce((acc, r) => acc + r.alloc, 0);
    expect(sum).toBe(17000);
    expect(
      res.warnings.some((w) => w.includes('分配合计 17000.00 与预算 30000.00 不一致（比例合计≠100% 或触发上限）。'))
    ).toBe(true);
  });
});
