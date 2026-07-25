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
} from '@ant-design/icons';

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
}

export default function AppHeader({
  mode, canCopy, onCopy, onReset, onToggleTheme,
  user, onOpenLogin, onOpenRegister, onLogout, syncStatusEl,
}: Props) {
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
        <Button
          icon={<CopyOutlined />}
          onClick={onCopy}
          disabled={!canCopy}
          title={canCopy ? '复制本期定投方案' : '介绍页无需复制'}
        >
          复制方案
        </Button>
        <Button icon={<ReloadOutlined />} onClick={onReset}>
          重置
        </Button>
        <Button
          icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
          onClick={onToggleTheme}
        >
          {mode === 'dark' ? '浅色' : '深色'}
        </Button>
        {authControl}
      </Space>
    </div>
  );
}

// 避免未使用告警
void BulbOutlined;
