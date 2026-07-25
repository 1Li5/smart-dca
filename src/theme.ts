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
