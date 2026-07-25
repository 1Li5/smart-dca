import { Button, Space, Typography } from 'antd';
import {
  CopyOutlined,
  ReloadOutlined,
  BulbOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons';

interface Props {
  mode: 'light' | 'dark';
  canCopy: boolean;
  onCopy: () => void;
  onReset: () => void;
  onToggleTheme: () => void;
}

export default function AppHeader({ mode, canCopy, onCopy, onReset, onToggleTheme }: Props) {
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
      </Space>
    </div>
  );
}

// 避免未使用告警
void BulbOutlined;
