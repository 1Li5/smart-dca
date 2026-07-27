import { theme as antdTheme, type ThemeConfig } from 'antd';

// 专业金融工具风：金融蓝主色 + 冷静中性灰背景
// 红涨绿跌按中国习惯在状态色中固定（见 StatusBadge），不随主题翻转
export function getThemeConfig(mode: 'light' | 'dark'): ThemeConfig {
  const dark = mode === 'dark';
  return {
    algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: '#1668dc',
      borderRadius: 6,
      fontSize: 14,
      colorBgLayout: dark ? '#0d1117' : '#f0f2f5',
      colorBgContainer: dark ? '#161b22' : '#ffffff',
      colorBorder: dark ? '#30363d' : '#e5e7eb',
      colorText: dark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.88)',
      colorTextSecondary: dark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)',
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    },
    components: {
      Card: { headerFontSize: 15, paddingLG: 18 },
      Table: {
        cellPaddingBlockSM: 9,
        cellPaddingInlineSM: 12,
        headerBg: dark ? '#1c2230' : '#f7f9fc',
        headerColor: dark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.78)',
        borderColor: dark ? '#2a3038' : '#eef0f3',
      },
      Tabs: { titleFontSize: 14, horizontalItemPadding: '10px 14px' },
    },
  };
}

import type { StatusKey } from './lib/calc';

// ====================================================================
// 图表配色（红涨绿跌固定，不随主题翻转红绿）
// 涨/低估/买入 rise(#cf1322)；跌/高估/卖出 fall(#389e0d)；
// 极端/橙 extreme(#d46b08)；主色/蓝 primary(#1668dc)；中性灰 neutral。
// 深色模式下轴/网格/文字用深色调。
// ====================================================================
export interface ChartColors {
  /** 涨 / 低估 / 买入 */
  rise: string;
  /** 跌 / 高估 / 卖出 */
  fall: string;
  /** 极端（如极度高估） */
  extreme: string;
  /** 主色 / 蓝 */
  primary: string;
  /** 中性灰 */
  neutral: string;
  /** 坐标轴颜色 */
  axis: string;
  /** 网格线颜色 */
  grid: string;
  /** 文字颜色 */
  text: string;
}

export function chartColors(mode: 'light' | 'dark'): ChartColors {
  const dark = mode === 'dark';
  return {
    rise: '#cf1322',
    fall: '#389e0d',
    extreme: '#d46b08',
    primary: '#1668dc',
    neutral: dark ? '#8b949e' : '#8c8c8c',
    axis: dark ? '#30363d' : '#d9d9d9',
    grid: dark ? '#21262d' : '#f0f0f0',
    text: dark ? 'rgba(255,255,255,0.85)' : '#595959',
  };
}

/** 语义化状态色：低估/买入→红，高估/卖出→绿，极端→橙，正常/持有/未知→中性灰。 */
export function statusColor(status: StatusKey, colors: ChartColors): string {
  switch (status) {
    case 'low':
    case 'buy':
      return colors.rise;
    case 'high':
    case 'sell':
      return colors.fall;
    case 'extreme':
      return colors.extreme;
    case 'normal':
    case 'hold':
    case null:
    default:
      return colors.neutral;
  }
}

/** 测试友好纯函数：直接按 mode 取状态十六进制色。 */
export function statusToHex(status: StatusKey, mode: 'light' | 'dark'): string {
  return statusColor(status, chartColors(mode));
}

// 分类调色板：用于无状态语义的饼图/柱状（如 position 权重全为 neutral 时区分切片）
export const CATEGORICAL: string[] = [
  '#1668dc',
  '#cf1322',
  '#389e0d',
  '#d46b08',
  '#722ed1',
  '#13c2c2',
  '#eb2f96',
  '#faad14',
];
