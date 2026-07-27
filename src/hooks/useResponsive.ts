import { Grid } from 'antd';

const { useBreakpoint } = Grid;

export interface Responsive {
  screens: ReturnType<typeof useBreakpoint>;
  /** 手机：< 576 (xs)，AssetTable 切卡片视图 */
  isMobile: boolean;
  /** 平板：576–991 (sm 且非 lg) */
  isTablet: boolean;
  /** 桌面：≥ 992 (lg) */
  isDesktop: boolean;
}

/**
 * 统一响应式断点封装（基于 AntD5 Grid.useBreakpoint）。
 * 组件据此切换布局，避免散落的手写媒体查询。
 */
export function useResponsive(): Responsive {
  const screens = useBreakpoint();
  return {
    screens,
    isMobile: !!screens.xs,
    isTablet: !!screens.sm && !screens.lg,
    isDesktop: !!screens.lg,
  };
}
