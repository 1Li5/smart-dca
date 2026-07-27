import type { ChartColors } from '../../theme';
import { chartColors } from '../../theme';
import { fmtNum } from '../../lib/calc';

export interface BarItem {
  label: string;
  value: number;
  color?: string;
}

export interface BarChartProps {
  items: BarItem[];
  /** 渲染高度（同时作为 viewBox 高度，宽度 100% 自适应） */
  height?: number;
  colors?: ChartColors;
  /** 柱顶数值格式化（金额/百分比保留 2 位） */
  valueFmt?: (v: number) => string;
  /** 负值柱向下延伸，默认 true */
  signed?: boolean;
  /** 是否绘制坐标轴与 0 基线，默认 true */
  axis?: boolean;
}

const VB_W = 640;
const PAD = { l: 44, r: 14, t: 26, b: 40 };

/**
 * 通用 SVG 柱状图（零依赖，viewBox + width=100% 自适应）。
 * 柱顶显示数值（金额/百分比保留 2 位）；value 为负时柱向下延伸。
 */
export default function BarChart({
  items,
  height = 260,
  colors,
  valueFmt,
  signed = true,
  axis = true,
}: BarChartProps) {
  const c = colors ?? chartColors('light');
  const VB_H = height;
  const plotL = PAD.l;
  const plotR = VB_W - PAD.r;
  const plotT = PAD.t;
  const plotB = VB_H - PAD.b;
  const plotW = plotR - plotL;
  const plotH = plotB - plotT;
  const fmt = valueFmt ?? ((v: number) => fmtNum(v, 2));

  if (!items || items.length === 0) {
    return (
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" role="img" aria-label="柱状图（暂无数据）">
        <rect x={plotL} y={plotT} width={plotW} height={plotH} fill="none" stroke={c.axis} />
        <text x={VB_W / 2} y={VB_H / 2} textAnchor="middle" fill={c.text} fontSize={13}>
          暂无数据
        </text>
      </svg>
    );
  }

  const vals = items.map((it) => it.value);
  const maxPos = Math.max(0, ...vals);
  const minNeg = Math.min(0, ...vals);
  const hasNeg = signed && minNeg < 0;

  // 0 基线位置（混合正负时按比例分配上下空间）
  const denom = maxPos - minNeg || 1;
  const yZero = hasNeg
    ? plotB - (maxPos / denom) * plotH
    : plotB; // 全为非负：基线在底部

  const maxSpan = hasNeg ? denom : Math.max(maxPos, 1);
  const slot = plotW / items.length;
  const barW = Math.min(64, slot * 0.6);

  const yFor = (v: number) =>
    hasNeg ? yZero - (v / maxSpan) * (v >= 0 ? (plotB - yZero) : (yZero - plotT)) : plotB - (v / maxSpan) * plotH;

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" role="img" aria-label="柱状图">
      {/* 网格线 + y 刻度（4 等分，仅正数占比时） */}
      {axis &&
        Array.from({ length: 4 }).map((_, i) => {
          const frac = i / 4;
          const y = plotT + plotH * (1 - frac);
          const val = hasNeg ? minNeg + denom * frac : maxPos * frac;
          return (
            <g key={i}>
              <line x1={plotL} y1={y} x2={plotR} y2={y} stroke={c.grid} strokeWidth={1} />
              <text x={plotL - 6} y={y + 3} textAnchor="end" fill={c.text} fontSize={10}>
                {fmt(val)}
              </text>
            </g>
          );
        })}
      {/* 坐标轴 */}
      {axis && (
        <>
          <line x1={plotL} y1={plotT} x2={plotL} y2={plotB} stroke={c.axis} strokeWidth={1.2} />
          <line x1={plotL} y1={yZero} x2={plotR} y2={yZero} stroke={c.axis} strokeWidth={1.4} />
        </>
      )}
      {/* 柱 */}
      {items.map((it, i) => {
        const cx = plotL + slot * i + slot / 2;
        const x = cx - barW / 2;
        const top = it.value >= 0 ? yFor(it.value) : yZero;
        const bottom = it.value >= 0 ? yZero : yFor(it.value);
        const h = Math.max(0, bottom - top);
        const fill = it.color ?? c.primary;
        const labelY = it.value >= 0 ? top - 6 : bottom + 14;
        return (
          <g key={i}>
            <rect x={x} y={top} width={barW} height={h} rx={3} fill={fill} />
            <text x={cx} y={labelY} textAnchor="middle" fill={c.text} fontSize={11} fontWeight={600}>
              {fmt(it.value)}
            </text>
            {/* 类目标签（自动截断） */}
            <text
              x={cx}
              y={plotB + 16}
              textAnchor="middle"
              fill={c.text}
              fontSize={11}
            >
              {it.label.length > 8 ? it.label.slice(0, 7) + '…' : it.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
