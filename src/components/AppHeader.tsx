import { useRef } from 'react';
import type { ReactNode } from 'react';
import { Button, Dropdown, Space, Typography } from 'antd';
import {
  CopyOutlined,
  ReloadOutlined,
  BulbOutlined,
  MoonOutlined,
  SunOutlined,
  UserOutlined,
  LogoutOutlined,
  LoginOutlined,
  UserAddOutlined,
  MoreOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { useResponsive } from '../hooks/useResponsive';
import { useExportActions } from './ExportMenu';
import ShareCard from './ShareCard';
import type { AppState, StrategyResult } from '../lib/calc';

interface Props {
  mode: 'light' | 'dark';
  canCopy: boolean;
  onCopy: () => void;
  onReset: () => void;
  onToggleTheme: () => void;
  user: { id: number; username: string } | null;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onLogout: () => void;
  syncStatusEl: ReactNode;
  state: AppState;
  result: StrategyResult | null;
  strategyName: string;
  onImport: (payload: any) => void;
}

export default function AppHeader({
  mode, canCopy, onCopy, onReset, onToggleTheme,
  user, onOpenLogin, onOpenRegister, onLogout, syncStatusEl,
  state, result, strategyName, onImport,
}: Props) {
  const { isMobile } = useResponsive();
  const shareRef = useRef<HTMLDivElement>(null);
  const { items: exportItems, fileInput } = useExportActions({
    state,
    result,
    strategyName,
    onCopy,
    onImport,
    getCardEl: () => shareRef.current,
  });
  const authControl = user ? (
    <Dropdown
      menu={{
        items: [
          { key: 'username', label: <span style={{ color: 'rgba(0,0,0,0.45)' }}>已登录：{user.username}</span>, disabled: true },
          { type: 'divider' as const },
          { key: 'logout', icon: <LogoutOutlined />, label: '登出', onClick: onLogout },
        ],
      }}
      trigger={['click']}
      placement="bottomRight"
    >
      <Button icon={<UserOutlined />}>
        {user.username}
      </Button>
    </Dropdown>
  ) : (
    <Space.Compact>
      <Button icon={<LoginOutlined />} onClick={onOpenLogin}>登录</Button>
      <Button icon={<UserAddOutlined />} onClick={onOpenRegister}>注册</Button>
    </Space.Compact>
  );

  return (
    <div className="app-header">
      <div className="brand">
        <div className="brand-logo">定</div>
        <div>
          <Typography.Title level={4} style={{ margin: 0, lineHeight: 1.2 }}>
            智能定投计算器
          </Typography.Title>
          <div className="brand-sub">位置权重 · 估值百分位 · 阶梯 · 价值平均 · 网格 · 再平衡</div>
        </div>
      </div>
      <Space className="app-actions" size={8} wrap>
        {syncStatusEl}
        {isMobile ? (
          <Dropdown
            menu={{
              items: [
                { key: 'export', icon: <ShareAltOutlined />, label: '导出/分享', children: exportItems },
                { key: 'reset', icon: <ReloadOutlined />, label: '重置', onClick: onReset },
                {
                  key: 'theme',
                  icon: mode === 'dark' ? <SunOutlined /> : <MoonOutlined />,
                  label: mode === 'dark' ? '浅色' : '深色',
                  onClick: onToggleTheme,
                },
              ],
            }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button icon={<MoreOutlined />}>更多</Button>
          </Dropdown>
        ) : (
          <>
            <Dropdown menu={{ items: exportItems }} placement="bottomRight">
              <Button icon={<ShareAltOutlined />}>导出/分享</Button>
            </Dropdown>
            <Button icon={<ReloadOutlined />} onClick={onReset}>
              重置
            </Button>
            <Button
              icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
              onClick={onToggleTheme}
            >
              {mode === 'dark' ? '浅色' : '深色'}
            </Button>
          </>
        )}
        {authControl}
        {/* 离屏分享卡：仅供 html2canvas 截图，不影响布局/交互 */}
        <div style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none', zIndex: -1 }}>
          <div ref={shareRef}>
            <ShareCard state={state} result={result} strategyName={strategyName} />
          </div>
        </div>
        {fileInput}
      </Space>
    </div>
  );
}

// 避免未使用告警
void BulbOutlined;
