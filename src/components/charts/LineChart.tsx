import type { ChartColors } from '../../theme';
import { chartColors } from '../../theme';

export interface LineSeries {
  label: string;
  values: number[];
  color?: string;
}

export interface LinePoint {
  x: number;
  y: number;
}

export interface LineChartProps {
  /** 多序列折线（x 自动取数组下标） */
  series?: LineSeries[];
  /** 单序列坐标点（优先于 series） */
  points?: LinePoint[];
  /** 渲染高度（同时作为 viewBox 高度，宽度 100% 自适应） */
  height?: number;
  colors?: ChartColors;
  /** 是否在上方显示图例 */
  legend?: boolean;
  /** 可选的 x 轴月标签（长度需与序列点数一致），按首/中/末等若干刻度展示 */
  xLabels?: string[];
}

const VB_W = 640;
const PAD = { l: 48, r: 16, t: 16, b: 28 };

function buildScale(
  vals: number[],
  plotStart: number,
  plotEnd: number
): (v: number) => number {
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals, 1);
  const span = max - min || 1;
  return (v: number) => plotEnd - ((v - min) / span) * (plotEnd - plotStart);
}

/**
 * 通用 SVG 折线图（零依赖，viewBox + width=100% 自适应）。
 * 本期主要作为回测图表的预留接口，保证可渲染即可。
 */
export default function LineChart({
  series,
  points,
  height = 260,
  colors,
  legend = true,
  xLabels,
}: LineChartProps) {
  const c = colors ?? chartColors('light');
  const VB_H = height;
  const plotL = PAD.l;
  const plotR = VB_W - PAD.r;
  const plotT = PAD.t;
  const plotB = VB_H - PAD.b;
  const plotW = plotR - plotL;
  const plotH = plotB - plotT;

  const datasets: { pts: LinePoint[]; color: string; label: string }[] = [];
  if (points && points.length > 0) {
    datasets.push({ pts: points, color: c.primary, label: 'series' });
  } else if (series && series.length > 0) {
    const palette = [c.primary, c.rise, c.fall, c.extreme];
    series.forEach((s, i) =>
      datasets.push({
        pts: s.values.map((y, x) => ({ x, y })),
        color: s.color ?? palette[i % palette.length],
        label: s.label,
      })
    );
  }

  const allPts = datasets.flatMap((d) => d.pts);
  const hasData = allPts.length > 1;

  if (!hasData) {
    return (
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" role="img" aria-label="折线图（暂无数据）">
        <rect x={plotL} y={plotT} width={plotW} height={plotH} fill="none" stroke={c.axis} />
        <text x={VB_W / 2} y={VB_H / 2} textAnchor="middle" fill={c.text} fontSize={13}>
          暂无数据
        </text>
      </svg>
    );
  }

  const xs = allPts.map((p) => p.x);
  const ys = allPts.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const xSpan = xMax - xMin || 1;
  const yMin = Math.min(...ys, 0);
  const yMax = Math.max(...ys, 1);
  const ySpan = yMax - yMin || 1;

  const sx = (x: number) => plotL + ((x - xMin) / xSpan) * plotW;
  const sy = (y: number) => plotB - ((y - yMin) / ySpan) * plotH;
  const yZero = sy(0);

  // 横向网格 + y 轴刻度（4 等分）
  const ticks = 4;
  const gridLines: JSX.Element[] = [];
  for (let i = 0; i <= ticks; i++) {
    const val = yMin + (ySpan * i) / ticks;
    const y = sy(val);
    gridLines.push(
      <line key={`g${i}`} x1={plotL} y1={y} x2={plotR} y2={y} stroke={c.grid} strokeWidth={1} />
    );
    gridLines.push(
      <text key={`t${i}`} x={plotL - 6} y={y + 3} textAnchor="end" fill={c.text} fontSize={10}>
        {val.toFixed(2)}
      </text>
    );
  }

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" role="img" aria-label="折线图">
      {gridLines}
      {/* 零线（若跨越正负） */}
      {yMin < 0 && yMax > 0 && (
        <line x1={plotL} y1={yZero} x2={plotR} y2={yZero} stroke={c.axis} strokeWidth={1.2} />
      )}
      {/* 坐标轴 */}
      <line x1={plotL} y1={plotT} x2={plotL} y2={plotB} stroke={c.axis} strokeWidth={1.2} />
      <line x1={plotL} y1={plotB} x2={plotR} y2={plotB} stroke={c.axis} strokeWidth={1.2} />
      {/* x 轴月标签（首/中/末等若干刻度） */}
      {xLabels && xLabels.length > 1 && (() => {
        const n = xLabels.length;
        const idxs = Array.from(new Set([0, Math.floor(n * 0.34), Math.floor(n * 0.67), n - 1]));
        return idxs.map((i) => (
          <text
            key={`xl${i}`}
            x={sx(i)}
            y={plotB + 14}
            textAnchor="middle"
            fill={c.text}
            fontSize={10}
          >
            {xLabels[i]}
          </text>
        ));
      })()}
      {/* 折线 */}
      {datasets.map((d, di) => {
        const dStr = d.pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x).toFixed(2)} ${sy(p.y).toFixed(2)}`).join(' ');
        return (
          <g key={di}>
            <path d={dStr} fill="none" stroke={d.color} strokeWidth={2} strokeLinejoin="round" />
            {d.pts.map((p, i) => (
              <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={2.5} fill={d.color} />
            ))}
          </g>
        );
      })}
      {legend && datasets.length > 1 && (
        <g>
          {datasets.map((d, i) => (
            <g key={i} transform={`translate(${plotL + i * 120}, ${plotT - 2})`}>
              <rect x={0} y={-8} width={10} height={10} rx={2} fill={d.color} />
              <text x={14} y={1} fill={c.text} fontSize={11}>
                {d.label}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
