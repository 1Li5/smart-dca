import { Alert, Card, Space } from 'antd';
import { COMPARABLE, STRATEGIES } from '../lib/defaults';
import type { AppState, StrategyResult } from '../lib/calc';
import GlobalSettings from './GlobalSettings';
import AssetTable from './AssetTable';
import ResultTable from './ResultTable';
import ComparePanel from './ComparePanel';
import { AUTO_FILL_ENABLED } from '../config';

interface Props {
  strategy: string;
  state: AppState;
  result: StrategyResult;
  update: (path: string, value: any) => void;
  updateAsset: (id: string, field: string, value: any) => void;
  onAddAsset: () => void;
  onDeleteAsset: (id: string) => void;
}

export default function StrategyView({
  strategy,
  state,
  result,
  update,
  updateAsset,
  onAddAsset,
  onDeleteAsset,
}: Props) {
  const meta = STRATEGIES.find((s) => s.id === strategy)!;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Alert type="info" showIcon message={meta.name} description={meta.desc} />

      <Card title="参数设置" extra={<span className="card-tag">切换策略保留通用数据</span>}>
        <GlobalSettings strategy={strategy} state={state} update={update} updateAsset={updateAsset} />
      </Card>

      {meta.kind === 'asset' && (
        <Card title="标的 / 资产" extra={<span className="card-tag">支持新增 / 删除 / 自定义</span>}>
          {AUTO_FILL_ENABLED ? (
            <Alert
              type="success"
              showIcon
              style={{ marginBottom: 12 }}
              message="自动填充已启用"
              description="输入基金名称/代码，下拉选择或回车后，将自动拉取价格、30月均线、估值分位（后端实时数据）。"
            />
          ) : (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message="自动填充未启用"
              description="已配置后端地址（VITE_API_BASE，即 Vercel 部署域名）后，输入代码可自动填充价格/均线/估值。当前仅支持手动输入与基金搜索下拉。详见 DEPLOY-VERCEL.md。"
            />
          )}
          <AssetTable
            strategy={strategy}
            state={state}
            updateAsset={updateAsset}
            onAdd={onAddAsset}
            onDelete={onDeleteAsset}
          />
        </Card>
      )}

      <Card title="计算结果" extra={<span className="card-tag">自动校验 · 状态高亮</span>}>
        <ResultTable result={result} />
      </Card>

      {COMPARABLE.includes(strategy) && (
        <Card title="双策略对比" extra={<span className="card-tag">同一标的金额差异</span>}>
          <ComparePanel state={state} defaultA={strategy} />
        </Card>
      )}
    </Space>
  );
}
