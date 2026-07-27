import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { runStrategy } from '../../lib/calc';
import { DEFAULT_STATE } from '../../lib/defaults';
import type { AppState } from '../../lib/calc';
import ResultCharts, { moneyFieldOf, buildPieFromAssets } from '../ResultCharts';
import { statusToHex, chartColors } from '../../theme';

describe('moneyFieldOf', () => {
  it('返回各策略的金额字段', () => {
    expect(moneyFieldOf('position')).toBe('amount');
    expect(moneyFieldOf('percentile')).toBe('amount');
    expect(moneyFieldOf('ladder')).toBe('amount');
    expect(moneyFieldOf('grid')).toBe('amount');
    expect(moneyFieldOf('rebalance')).toBe('alloc');
  });
  it('va / intro 无金额分布字段', () => {
    expect(moneyFieldOf('va')).toBe('');
    expect(moneyFieldOf('intro')).toBe('');
    expect(moneyFieldOf('unknown')).toBe('');
  });
});

describe('buildPieFromAssets', () => {
  it('取 targetRatio>0 且 currentValue>0 的标的', () => {
    const items = buildPieFromAssets(DEFAULT_STATE);
    expect(items.length).toBe(3);
    expect(items.map((i) => i.value)).toEqual([200000, 150000, 50000]);
    expect(items.every((i) => i.value > 0)).toBe(true);
  });
  it('过滤掉 targetRatio=0 或 currentValue=0 的标的', () => {
    const s: AppState = {
      ...structuredClone(DEFAULT_STATE),
      assets: [
        { ...DEFAULT_STATE.assets[0], targetRatio: 0, currentValue: 200000 },
        { ...DEFAULT_STATE.assets[1], targetRatio: 30, currentValue: 0 },
        { ...DEFAULT_STATE.assets[2], targetRatio: 20, currentValue: 50000 },
      ],
    };
    const items = buildPieFromAssets(s);
    expect(items.length).toBe(1);
    expect(items[0].value).toBe(50000);
  });
});

describe('statusToHex', () => {
  it('红涨绿跌：低估/买入=红，高估/卖出=绿，极端=橙', () => {
    const light = chartColors('light');
    expect(statusToHex('low', 'light')).toBe(light.rise);
    expect(statusToHex('buy', 'light')).toBe(light.rise);
    expect(statusToHex('high', 'light')).toBe(light.fall);
    expect(statusToHex('sell', 'light')).toBe(light.fall);
    expect(statusToHex('extreme', 'light')).toBe(light.extreme);
  });
  it('正常/持有/null 取中性灰，且深色与浅色不同', () => {
    expect(statusToHex('normal', 'light')).toBe('#8c8c8c');
    expect(statusToHex('hold', 'light')).toBe('#8c8c8c');
    expect(statusToHex(null, 'light')).toBe('#8c8c8c');
    expect(statusToHex('normal', 'dark')).toBe('#8b949e');
    expect(statusToHex(null, 'dark')).toBe('#8b949e');
  });
});

describe('ResultCharts 渲染冒烟', () => {
  const assetStrategies = ['position', 'percentile', 'ladder', 'grid', 'rebalance'];

  it('intro 返回 null（渲染为空字符串）', () => {
    const html = renderToString(
      <ResultCharts result={runStrategy('intro', DEFAULT_STATE)} state={DEFAULT_STATE} />
    );
    expect(html).toBe('');
  });

  it('各资产策略均能渲染且不抛错，含金额分布', () => {
    assetStrategies.forEach((strategy) => {
      const html = renderToString(
        <ResultCharts result={runStrategy(strategy, DEFAULT_STATE)} state={DEFAULT_STATE} />
      );
      expect(html.length).toBeGreaterThan(0);
      expect(html).toContain('金额分布');
    });
  });

  it('va 策略渲染不抛错，含价值平均对比', () => {
    const html = renderToString(
      <ResultCharts result={runStrategy('va', DEFAULT_STATE)} state={DEFAULT_STATE} />
    );
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain('价值平均');
  });

  it('rebalance 额外含目标/当前占比对比', () => {
    const html = renderToString(
      <ResultCharts result={runStrategy('rebalance', DEFAULT_STATE)} state={DEFAULT_STATE} />
    );
    expect(html).toContain('目标比例 vs 当前占比');
    expect(html).toContain('持仓当前市值占比');
  });

  it('深色主题下不抛错', () => {
    const dark = { ...DEFAULT_STATE, theme: 'dark' as const };
    const html = renderToString(
      <ResultCharts result={runStrategy('percentile', dark)} state={dark} />
    );
    expect(html.length).toBeGreaterThan(0);
  });
});
