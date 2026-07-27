import type { AppState, Asset } from './calc';

export type FieldType = 'text' | 'number' | 'select';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  step?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  min?: number;
}

// 所有资产字段的统一定义（AssetTable 据此渲染可编辑列）
export const FIELD_DEFS: Record<string, FieldDef> = {
  name: { key: 'name', label: '标的名称', type: 'text', placeholder: '如 纳斯达克100' },
  currentPrice: { key: 'currentPrice', label: '当前点位/价格', type: 'number', step: 'any' },
  ma30: { key: 'ma30', label: '30月均值', type: 'number', step: 'any' },
  baseAmount: { key: 'baseAmount', label: '基础定投额', type: 'number', step: 'any' },
  metricType: {
    key: 'metricType',
    label: '估值指标',
    type: 'select',
    options: [
      { value: 'PE', label: 'PE' },
      { value: 'PB', label: 'PB' },
    ],
  },
  valuationMetric: { key: 'valuationMetric', label: 'PE/PB 值', type: 'number', step: 'any' },
  percentile: { key: 'percentile', label: '估值百分位(%)', type: 'number', step: 'any' },
  gridBasePrice: { key: 'gridBasePrice', label: '网格基准价', type: 'number', step: 'any' },
  gridGap: { key: 'gridGap', label: '网格间距(%)', type: 'number', step: 'any' },
  gridAmount: { key: 'gridAmount', label: '单格金额', type: 'number', step: 'any' },
  holdingShares: { key: 'holdingShares', label: '持仓份额', type: 'number', step: 'any' },
  gridUpper: { key: 'gridUpper', label: '上限价', type: 'number', step: 'any' },
  gridLower: { key: 'gridLower', label: '下限价', type: 'number', step: 'any' },
  currentValue: { key: 'currentValue', label: '当前市值', type: 'number', step: 'any' },
  targetRatio: { key: 'targetRatio', label: '目标比例(%)', type: 'number', step: 'any' },
  takeProfitPrice: { key: 'takeProfitPrice', label: '目标止盈价', type: 'number', step: 'any', placeholder: '0=未设' },
};

export type StrategyKind = 'intro' | 'asset' | 'account' | 'backtest';

export interface StrategyMeta {
  id: string;
  name: string;
  short: string;
  desc: string;
  kind: StrategyKind;
  /** 该策略下资产表需要展示/编辑的字段（顺序即列顺序） */
  assetFields: string[];
}

// Tab 顺序：介绍页第一，其余 6 策略
export const STRATEGIES: StrategyMeta[] = [
  {
    id: 'intro',
    name: '策略介绍',
    short: '介绍',
    desc: '6 类主流智能定投策略的原理、优缺点与适用场景',
    kind: 'intro',
    assetFields: [],
  },
  {
    id: 'position',
    name: '位置权重法',
    short: '位置权重',
    desc: '以 30 月均线为锚，当前越低于均值、权重越高，自动多投；基准策略',
    kind: 'asset',
    assetFields: ['name', 'currentPrice', 'ma30', 'takeProfitPrice'],
  },
  {
    id: 'percentile',
    name: '估值百分位',
    short: '估值百分位',
    desc: '按 PE/PB 历史百分位分档：低估多投、高估少投、极度高估止盈',
    kind: 'asset',
    assetFields: ['name', 'baseAmount', 'metricType', 'valuationMetric', 'percentile'],
  },
  {
    id: 'ladder',
    name: '阶梯档位',
    short: '阶梯档位',
    desc: '以 30 月均值为基准，按点位偏离比例分 5 档固定倍数，新手友好',
    kind: 'asset',
    assetFields: ['name', 'currentPrice', 'ma30', 'baseAmount'],
  },
  {
    id: 'va',
    name: '价值平均 VA',
    short: '价值平均',
    desc: '设定每月目标市值增长额，自动高抛低吸（账户级）',
    kind: 'account',
    assetFields: [],
  },
  {
    id: 'grid',
    name: '网格定投',
    short: '网格',
    desc: '等比例网格，下跌买入、上涨卖出，震荡市收割差价',
    kind: 'asset',
    assetFields: [
      'name',
      'currentPrice',
      'gridBasePrice',
      'gridGap',
      'gridAmount',
      'holdingShares',
      'gridUpper',
      'gridLower',
      'takeProfitPrice',
    ],
  },
  {
    id: 'rebalance',
    name: '恒定比例再平衡',
    short: '再平衡',
    desc: '预设多资产目标比例，定投优先补足低配，可触发全额再平衡',
    kind: 'asset',
    assetFields: ['name', 'currentValue', 'targetRatio'],
  },
  {
    id: 'backtest',
    name: '回测分析',
    short: '回测',
    desc: '基于历史月线回测各策略净值表现（简化模型，仅供参考）',
    kind: 'backtest',
    assetFields: [],
  },
];

// 哪些策略参与「双策略对比」（VA 为账户级，排除）
export const COMPARABLE = ['position', 'percentile', 'ladder', 'grid', 'rebalance'];

let _seq = 0;
export function newAssetId(): string {
  _seq += 1;
  return 'a_' + Date.now().toString(36) + '_' + _seq;
}

export function makeAsset(name: string): Asset {
  return {
    id: newAssetId(),
    name,
    currentPrice: 0,
    ma30: 0,
    baseAmount: 1000,
    metricType: 'PE',
    valuationMetric: 0,
    percentile: 50,
    gridBasePrice: 0,
    gridGap: 5,
    gridAmount: 1000,
    holdingShares: 0,
    gridUpper: 0,
    gridLower: 0,
    currentValue: 0,
    targetRatio: 0,
    takeProfitPrice: 0,
  };
}

export const DEFAULT_STATE: AppState = {
  activeStrategy: 'intro',
  theme: 'light',
  monthlyBudget: 5000,
  maxSingleAmount: 0,
  assets: [
    {
      id: 'a1',
      name: '纳斯达克100',
      code: '110011', // 易方达纳斯达克100 基金；fetchSeries(type='auto') 先试 fund 再试 index
      currentPrice: 20000,
      ma30: 17000,
      baseAmount: 1000,
      metricType: 'PE',
      valuationMetric: 32,
      percentile: 65,
      gridBasePrice: 18000,
      gridGap: 5,
      gridAmount: 1000,
      holdingShares: 100,
      gridUpper: 24000,
      gridLower: 12000,
      currentValue: 200000,
      targetRatio: 50,
      takeProfitPrice: 0,
    },
    {
      id: 'a2',
      name: '中证500',
      code: '000905', // 中证500 指数；新浪/Sina 日线可拉
      currentPrice: 5500,
      ma30: 5800,
      baseAmount: 1000,
      metricType: 'PE',
      valuationMetric: 22,
      percentile: 35,
      gridBasePrice: 5800,
      gridGap: 5,
      gridAmount: 1000,
      holdingShares: 200,
      gridUpper: 7000,
      gridLower: 4500,
      currentValue: 150000,
      targetRatio: 30,
      takeProfitPrice: 0,
    },
    {
      id: 'a3',
      name: '黄金ETF',
      code: '518880', // 华安黄金ETF；可作为基金拉全量净值
      currentPrice: 5.6,
      ma30: 5.2,
      baseAmount: 1000,
      metricType: 'PB',
      valuationMetric: 3.1,
      percentile: 80,
      gridBasePrice: 5.3,
      gridGap: 4,
      gridAmount: 1000,
      holdingShares: 5000,
      gridUpper: 7,
      gridLower: 4,
      currentValue: 50000,
      targetRatio: 20,
      takeProfitPrice: 0,
    },
  ],
  percentileTiers: { low: 30, normalHigh: 70, high: 90, lowMult: 1.8, normalMult: 1.0, highMult: 0.5 },
  ladderTiers: { sigHigh: 0.5, lightHigh: 0.8, normal: 1.0, lightLow: 1.5, sigLow: 2.0 },
  va: { prevTargetValue: 50000, monthlyGrowth: 5000, prevEndActual: 52000, currentChange: -5 },
  rebalance: { totalValue: 0, rebalanceNow: false, frequency: 'monthly', thresholdPct: 5 },
  takeProfit: { enabled: false, percentile: 80 },
};
