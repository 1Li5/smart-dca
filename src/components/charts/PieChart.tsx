import type { ChartColors } from '../../theme';
import { chartColors } from '../../theme';
import { fmtNum } from '../../lib/calc';

export interface PieItem {
  label: string;
  value: number;
  color?: string;
}

export interface PieChartProps {
  items: PieItem[];
  /** 渲染高度（同时作为 viewBox 高度，宽度 100% 自适应） */
  height?: number;
  colors?: ChartColors;
  /** 环图（中间挖空），默认 true；false 为实心饼图 */
  donut?: boolean;
  /** 是否显示图例（标签 + 数值 + 占比），默认 true */
  legend?: boolean;
  /** 无数据时提示文案 */
  emptyText?: string;
}

const VB_W = 640;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** 环形扇区路径（顺时针）。a0→a1 角度范围（度） */
function ringSlice(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  a0: number,
  a1: number
): string {
  const oS = polar(cx, cy, rOuter, a0);
  const oE = polar(cx, cy, rOuter, a1);
  const iE = polar(cx, cy, rInner, a1);
  const iS = polar(cx, cy, rInner, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${oS.x.toFixed(2)} ${oS.y.toFixed(2)} A ${rOuter} ${rOuter} 0 ${large} 1 ${oE.x.toFixed(2)} ${oE.y.toFixed(2)} L ${iE.x.toFixed(2)} ${iE.y.toFixed(2)} A ${rInner} ${rInner} 0 ${large} 0 ${iS.x.toFixed(2)} ${iS.y.toFixed(2)} Z`;
}

/**
 * 通用 SVG 饼图/环图（零依赖，viewBox + width=100% 自适应）。
 * 每片显示占比标签，下方渲染图例（标签 + 数值 + 占比）。
 */
export default function PieChart({
  items,
  height = 260,
  colors,
  donut = true,
  legend = true,
  emptyText = '暂无数据',
}: PieChartProps) {
  const c = colors ?? chartColors('light');
  const VB_H = height;

  const positive = (items ?? []).filter((it) => it.value > 0);
  const total = positive.reduce((s, it) => s + it.value, 0);

  if (total <= 0) {
    return (
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" role="img" aria-label="饼图（暂无数据）">
        <text x={VB_W / 2} y={VB_H / 2} textAnchor="middle" fill={c.text} fontSize={13}>
          {emptyText}
        </text>
      </svg>
    );
  }

  const cx = donut ? VB_W / 2 : VB_W / 2;
  const cy = VB_H / 2;
  const rOuter = Math.min(VB_W, VB_H) / 2 - 16;
  const rInner = donut ? rOuter * 0.58 : 0;

  let acc = 0;
  const slices = positive.map((it, i) => {
    const frac = it.value / total;
    const a0 = acc * 360;
    const a1 = (acc + frac) * 360;
    acc += frac;
    const color = it.color ?? chartColorsPalette(i);
    return { it, a0, a1, frac, color };
  });

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" role="img" aria-label="饼图">
      {slices.map((s, i) => {
        const span = s.a1 - s.a0;
        // 单片接近整圆时拆成两段，避免起止点重合导致弧不可见
        if (span >= 359.9) {
          return (
            <g key={i}>
              <path d={ringSlice(cx, cy, rOuter, rInner, s.a0, s.a0 + 180)} fill={s.color} />
              <path d={ringSlice(cx, cy, rOuter, rInner, s.a0 + 180, s.a1)} fill={s.color} />
            </g>
          );
        }
        return <path key={i} d={ringSlice(cx, cy, rOuter, rInner, s.a0, s.a1)} fill={s.color} />;
      })}
      {/* 占比标签（仅当扇区够大时绘在内部） */}
      {slices.map((s, i) => {
        if (s.frac < 0.06) return null;
        const mid = (s.a0 + s.a1) / 2;
        const rr = donut ? (rOuter + rInner) / 2 : rOuter * 0.62;
        const p = polar(cx, cy, rr, mid);
        return (
          <text
            key={`l${i}`}
            x={p.x}
            y={p.y + 3}
            textAnchor="middle"
            fill="#fff"
            fontSize={11}
            fontWeight={600}
          >
            {(s.frac * 100).toFixed(1)}%
          </text>
        );
      })}
      {/* 图例 */}
      {legend &&
        slices.map((s, i) => (
          <g key={`leg${i}`} transform={`translate(8, ${VB_H - slices.length * 18 + i * 18})`}>
            <rect x={0} y={0} width={10} height={10} rx={2} fill={s.color} />
            <text x={16} y={9} fill={c.text} fontSize={11}>
              {s.it.label.length > 10 ? s.it.label.slice(0, 9) + '…' : s.it.label}：{fmtNum(s.it.value, 2)}（
              {(s.frac * 100).toFixed(1)}%）
            </text>
          </g>
        ))}
    </svg>
  );
}

// 与 theme.CATEGORICAL 一致的回退调色板（避免环形依赖，独立实现）
function chartColorsPalette(i: number): string {
  const palette = [
    '#1668dc',
    '#cf1322',
    '#389e0d',
    '#d46b08',
    '#722ed1',
    '#13c2c2',
    '#eb2f96',
    '#faad14',
  ];
  return palette[i % palette.length];
}
