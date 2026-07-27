import type { ReactNode } from 'react';
import { Card, Col, Row } from 'antd';
import type { AppState, ResultRow, StrategyResult } from '../lib/calc';
import { num, fmtMoney, fmtPct, fmtNum, fmtSigned } from '../lib/calc';
import { chartColors, statusColor, CATEGORICAL } from '../theme';
import type { ChartColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import BarChart from './charts/BarChart';
import PieChart from './charts/PieChart';
import type { BarItem, PieItem } from './charts';

// ====================================================================
// 纯函数（可单测）
// ====================================================================

/** 各策略的「金额分布」字段：position/percentile/ladder/grid→amount，rebalance→alloc，其余→'' */
export function moneyFieldOf(strategy: string): string {
  switch (strategy) {
    case 'position':
    case 'percentile':
    case 'ladder':
    case 'grid':
      return 'amount';
    case 'rebalance':
      return 'alloc';
    default:
      return '';
  }
}

/** 从 state.assets 取 targetRatio>0 的标的，用 currentValue 拼装饼图数据 */
export function buildPieFromAssets(state: AppState): PieItem[] {
  return (state.assets || [])
    .filter((a) => num(a.targetRatio) > 0 && num(a.currentValue) > 0)
    .map((a) => ({ label: a.name || '(未命名)', value: num(a.currentValue) }));
}

const ASSET_STRATEGIES = ['position', 'percentile', 'ladder', 'grid'];

// ====================================================================
// 组件
// ====================================================================
export default function ResultCharts({
  result,
  state,
}: {
  result: StrategyResult;
  state: AppState;
}) {
  const { strategy } = result;
  // 介绍页无图表数据
  if (strategy === 'intro') return null;

  const colors = chartColors(state.theme ?? 'light');
  const { isMobile } = useResponsive();
  const span = isMobile ? 24 : 12;

  const cards: ReactNode[] = [];

  const push = (key: string, title: string, node: ReactNode) => {
    cards.push(
      <Col xs={24} sm={12} key={key}>
        <Card size="small" title={title}>
          {node}
        </Card>
      </Col>
    );
  };

  // ---------- 金额分布（适用 position/percentile/ladder/grid/rebalance） ----------
  const moneyField = moneyFieldOf(strategy);
  if (moneyField) {
    const pieItems: PieItem[] = result.rows
      .filter((r) => num(r[moneyField]) > 0)
      .map((r, i) => ({
        label: r.name ?? `标的${i + 1}`,
        value: num(r[moneyField]),
        color: r._status ? statusColor(r._status, colors) : CATEGORICAL[i % CATEGORICAL.length],
      }));
    const barItems: BarItem[] = result.rows.map((r) => ({
      label: r.name ?? '',
      value: num(r[moneyField]),
      color: r._status ? statusColor(r._status, colors) : undefined,
    }));
    if (pieItems.length > 0) push('money-pie', '金额分布', <PieChart items={pieItems} colors={colors} />);
    push('money-bar', '本期金额', <BarChart items={barItems} colors={colors} valueFmt={fmtMoney} signed={false} />);
  }

  // ---------- 估值 / 位置信号条 ----------
  if (strategy === 'position') {
    const wItems: BarItem[] = result.rows.map((r) => ({
      label: r.name ?? '',
      value: num(r.weight),
      color: colors.primary,
    }));
    push('weight', '位置权重（越高越该多投）', <BarChart items={wItems} colors={colors} valueFmt={(v) => fmtNum(v, 4)} signed={false} />);
  }

  if (strategy === 'percentile') {
    const pItems: BarItem[] = result.rows.map((r) => ({
      label: r.name ?? '',
      value: num(r.percentile),
      color: statusColor(r._status, colors),
    }));
    push(
      'pct',
      '估值百分位（0–100）',
      <BarChart items={pItems} colors={colors} valueFmt={fmtPct} signed={false} />
    );
  }

  if (strategy === 'ladder') {
    const dItems: BarItem[] = result.rows.map((r) => ({
      label: r.name ?? '',
      value: num(r.dev),
      color: statusColor(r._status, colors),
    }));
    push(
      'dev',
      '偏离比例（%，负=低于均线=低估）',
      <BarChart items={dItems} colors={colors} valueFmt={(v) => fmtSigned(v) + '%'} />
    );
  }

  if (strategy === 'grid') {
    const gItems: BarItem[] = result.rows.map((r) => ({
      label: r.name ?? '',
      value: num(r.gridLevel),
      color: statusColor(r._status, colors),
    }));
    push(
      'grid',
      '所处网格档位（负=低于基准=买入区）',
      <BarChart items={gItems} colors={colors} valueFmt={(v) => (v > 0 ? '+' : '') + fmtNum(v, 0)} />
    );
  }

  // ---------- 持仓当前市值占比（rebalance 及通用资产策略） ----------
  if (strategy === 'rebalance' || ASSET_STRATEGIES.includes(strategy)) {
    const assetPie = buildPieFromAssets(state);
    if (assetPie.length > 0) {
      push(
        'hold-pie',
        strategy === 'rebalance' ? '持仓当前市值占比' : '组合市值构成',
        <PieChart items={assetPie} colors={colors} />
      );
    }
  }

  // ---------- rebalance：目标比例 vs 当前占比 分组柱状对比 ----------
  if (strategy === 'rebalance') {
    push('ratio-cmp', '目标比例 vs 当前占比', <GroupedRatioChart rows={result.rows} colors={colors} />);
  }

  // ---------- va：目标 vs 期初实际 vs 操作金额 ----------
  if (strategy === 'va') {
    const r = result.rows[0];
    if (r) {
      const items: BarItem[] = [
        { label: '目标总市值', value: num(r.target), color: colors.primary },
        { label: '期初实际市值', value: num(r.beginActual), color: colors.neutral },
        { label: '操作金额', value: num(r.amount), color: statusColor(r._status, colors) },
      ];
      push(
        'va',
        '价值平均：目标 vs 期初实际 vs 操作金额',
        <BarChart items={items} colors={colors} valueFmt={fmtMoney} />
      );
    }
  }

  if (cards.length === 0) return null;

  return (
    <Row gutter={[16, 16]}>
      {cards}
    </Row>
  );
}

// ====================================================================
// rebalance 专用：目标比例 vs 当前占比 分组柱状对比（零依赖 SVG）
// ====================================================================
function GroupedRatioChart({ rows, colors }: { rows: ResultRow[]; colors: ChartColors }) {
  const VB_W = 640;
  const VB_H = 260;
  const PAD = { l: 44, r: 14, t: 22, b: 40 };
  const plotL = PAD.l;
  const plotR = VB_W - PAD.r;
  const plotT = PAD.t;
  const plotB = VB_H - PAD.b;
  const plotW = plotR - plotL;
  const plotH = plotB - plotT;

  if (!rows || rows.length === 0) {
    return (
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" role="img" aria-label="占比对比（暂无数据）">
        <rect x={plotL} y={plotT} width={plotW} height={plotH} fill="none" stroke={colors.axis} />
        <text x={VB_W / 2} y={VB_H / 2} textAnchor="middle" fill={colors.text} fontSize={13}>
          暂无数据
        </text>
      </svg>
    );
  }

  const maxV = Math.max(1, ...rows.map((r) => Math.max(num(r.tr), num(r.currentRatio))));
  const yFor = (v: number) => plotB - (v / maxV) * plotH;

  const slot = plotW / rows.length;
  const groupW = Math.min(80, slot * 0.62);
  const barW = groupW / 2 - 2;
  const gx0 = (i: number) => plotL + slot * i + (slot - groupW) / 2;

  // y 轴刻度
  const ticks = Array.from({ length: 4 }, (_, i) => {
    const val = (maxV * i) / 4;
    const y = yFor(val);
    return (
      <g key={`t${i}`}>
        <line x1={plotL} y1={y} x2={plotR} y2={y} stroke={colors.grid} strokeWidth={1} />
        <text x={plotL - 6} y={y + 3} textAnchor="end" fill={colors.text} fontSize={10}>
          {fmtPct(val)}
        </text>
      </g>
    );
  });

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" role="img" aria-label="目标比例 vs 当前占比">
      {ticks}
      <line x1={plotL} y1={plotT} x2={plotL} y2={plotB} stroke={colors.axis} strokeWidth={1.2} />
      <line x1={plotL} y1={plotB} x2={plotR} y2={plotB} stroke={colors.axis} strokeWidth={1.2} />
      {rows.map((r, i) => {
        const tr = num(r.tr);
        const cr = num(r.currentRatio);
        const x0 = gx0(i);
        const yTr = yFor(tr);
        const yCr = yFor(cr);
        const label = r.name && r.name.length > 8 ? r.name.slice(0, 7) + '…' : r.name;
        return (
          <g key={i}>
            {/* 目标比例（蓝） */}
            <rect x={x0} y={yTr} width={barW} height={Math.max(0, plotB - yTr)} rx={3} fill={colors.primary} />
            {/* 当前占比（按状态上色） */}
            <rect
              x={x0 + barW + 4}
              y={yCr}
              width={barW}
              height={Math.max(0, plotB - yCr)}
              rx={3}
              fill={statusColor(r._status, colors)}
            />
            <text x={x0 + groupW / 2} y={plotB + 16} textAnchor="middle" fill={colors.text} fontSize={11}>
              {label}
            </text>
          </g>
        );
      })}
      {/* 图例 */}
      <g transform={`translate(${plotL}, ${plotT - 8})`}>
        <rect x={0} y={-8} width={10} height={10} rx={2} fill={colors.primary} />
        <text x={14} y={1} fill={colors.text} fontSize={11}>
          目标比例
        </text>
        <rect x={84} y={-8} width={10} height={10} rx={2} fill={colors.neutral} />
        <text x={98} y={1} fill={colors.text} fontSize={11}>
          当前占比
        </text>
      </g>
    </svg>
  );
}
