import { useState } from 'react';
import { Alert, Button, Modal, Space, Typography } from 'antd';
import { CloudUploadOutlined, CloudDownloadOutlined } from '@ant-design/icons';

interface Props {
  open: boolean;
  cloudUpdatedAt: string | null;
  localAssetCount: number;
  onChooseLocal: () => void;     // 用本地覆盖云端
  onChooseCloud: () => void;     // 用云端覆盖本地
  onCancel: () => void;          // 取消并清 cookie（恢复游客）
}

export default function MigrationDialog({
  open, cloudUpdatedAt, localAssetCount, onChooseLocal, onChooseCloud, onCancel,
}: Props) {
  const [busy, setBusy] = useState<'local' | 'cloud' | 'cancel' | null>(null);

  async function withBusy(action: 'local' | 'cloud' | 'cancel', fn: () => Promise<void> | void) {
    setBusy(action);
    try { await fn(); } finally { setBusy(null); }
  }

  return (
    <Modal
      open={open}
      title="检测到本地与云端都有数据"
      onCancel={busy ? undefined : onCancel}
      footer={null}
      closable={!busy}
      maskClosable={false}
      width={460}
    >
      <Alert
        type="info"
        showIcon
        message="请选择保留哪一份数据"
        description="二选一即可；选错可重新登录再选。"
        style={{ marginBottom: 16 }}
      />
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div className="migration-card">
          <div className="migration-card-title">
            <CloudUploadOutlined style={{ color: '#1677ff' }} /> 用本地数据覆盖云端
          </div>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 8, fontSize: 13 }}>
            当前设备有 {localAssetCount} 条标的 + 全局参数。云端数据（最近更新 {cloudUpdatedAt ? new Date(cloudUpdatedAt).toLocaleString('zh-CN') : '—'}）将被覆盖。
          </Typography.Paragraph>
          <Button
            type="primary"
            block
            loading={busy === 'local'}
            disabled={!!busy}
            onClick={() => withBusy('local', onChooseLocal)}
          >
            以本地为准覆盖云端
          </Button>
        </div>
        <div className="migration-card">
          <div className="migration-card-title">
            <CloudDownloadOutlined style={{ color: '#52c41a' }} /> 用云端数据覆盖本地
          </div>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 8, fontSize: 13 }}>
            云端数据（{cloudUpdatedAt ? new Date(cloudUpdatedAt).toLocaleString('zh-CN') : '—'}）会下载并替换当前设备的本地内容。
          </Typography.Paragraph>
          <Button
            block
            loading={busy === 'cloud'}
            disabled={!!busy}
            onClick={() => withBusy('cloud', onChooseCloud)}
          >
            以下载的云端为准
          </Button>
        </div>
        <Button
          type="link"
          block
          disabled={!!busy}
          onClick={() => withBusy('cancel', onCancel)}
          style={{ marginTop: 4 }}
        >
          取消登录（继续以游客模式使用）
        </Button>
      </Space>
    </Modal>
  );
}
