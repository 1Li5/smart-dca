import { Badge, Popover, Tooltip, Typography } from 'antd';
import {
  CheckCircleFilled,
  CloudSyncOutlined,
  ExclamationCircleFilled,
  MinusCircleFilled,
} from '@ant-design/icons';
import type { SyncStatus } from '../hooks/useCloudSync';

interface Props {
  status: SyncStatus;
  lastSyncedAt: number | null;
  lastError: string | null;
  onSyncNow: () => void;
  loggedIn: boolean;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function SyncStatusBadge({ status, lastSyncedAt, lastError, onSyncNow, loggedIn }: Props) {
  if (!loggedIn) return null;

  const config = (() => {
    switch (status) {
      case 'syncing':
        return { color: 'processing' as const, icon: <CloudSyncOutlined spin />, text: '同步中…' };
      case 'synced':
        return {
          color: 'success' as const,
          icon: <CheckCircleFilled style={{ color: '#52c41a' }} />,
          text: lastSyncedAt ? `已同步 ${formatTime(lastSyncedAt)}` : '已同步',
        };
      case 'error':
        return { color: 'error' as const, icon: <ExclamationCircleFilled style={{ color: '#ff4d4f' }} />, text: '同步失败' };
      default:
        return { color: 'default' as const, icon: <MinusCircleFilled />, text: '待同步' };
    }
  })();

  const content = (
    <div style={{ width: 220 }}>
      <Typography.Paragraph style={{ marginBottom: 6, fontSize: 13 }}>
        {config.text}
      </Typography.Paragraph>
      {status === 'error' && lastError && (
        <Typography.Paragraph type="danger" style={{ marginBottom: 8, fontSize: 12 }}>
          {lastError}
        </Typography.Paragraph>
      )}
      <a onClick={onSyncNow} style={{ fontSize: 12, cursor: 'pointer' }}>立即同步</a>
    </div>
  );

  return (
    <Popover content={content} trigger="hover" placement="bottomRight">
      <Tooltip title={config.text}>
        <Badge status={config.color} style={{ cursor: 'pointer' }}>
          <span className="sync-status-text" style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>
            {config.icon} <span style={{ marginLeft: 4 }}>{config.text}</span>
          </span>
        </Badge>
      </Tooltip>
    </Popover>
  );
}
