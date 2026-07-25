import React, { useState } from 'react';
import { App, AutoComplete, Button, Input, InputNumber, Select, Table } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { FIELD_DEFS, STRATEGIES } from '../lib/defaults';
import type { Asset, AppState } from '../lib/calc';
import { searchFund } from '../lib/fundSearch';
import { fetchIndicator, looksLikeCode } from '../lib/indicator';
import { AUTO_FILL_ENABLED } from '../config';

interface Props {
  strategy: string;
  state: AppState;
  updateAsset: (id: string, field: string, value: any) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}

interface Opt {
  value: string;
  code: string;
  name: string;
  label: React.ReactNode;
}

function NameCell({
  value,
  row,
  updateAsset,
  onAutoFill,
}: {
  value: string;
  row: Asset;
  updateAsset: (id: string, field: string, v: any) => void;
  onAutoFill: (row: Asset, code: string) => void;
}) {
  const [options, setOptions] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(false);

  const onSearch = async (text: string) => {
    const q = (text || '').trim();
    if (!q) {
      setOptions([]);
      return;
    }
    setLoading(true);
    const list = await searchFund(q, 5);
    setOptions(
      list.map((it) => ({
        value: it.name,
        code: it.code,
        name: it.name,
        label: (
          <span>
            {it.name} <span style={{ color: '#999', fontSize: 12 }}>{it.code} · {it.type}</span>
          </span>
        ),
      })),
    );
    setLoading(false);
  };

  return (
    <AutoComplete
      value={value}
      options={options}
      onSearch={onSearch}
      onChange={(t) => updateAsset(row.id, 'name', t)}
      onSelect={(_v, opt: any) => {
        updateAsset(row.id, 'name', opt.name);
        updateAsset(row.id, 'code', opt.code);
        onAutoFill(row, opt.code);
      }}
      onBlur={() => {
        const v = (value || '').trim();
        if (looksLikeCode(v)) {
          updateAsset(row.id, 'code', v);
          onAutoFill(row, v);
        }
      }}
      placeholder="名称或代码"
      size="small"
      style={{ width: '100%' }}
      notFoundContent={loading ? '搜索中…' : null}
      filterOption={false}
    />
  );
}

export default function AssetTable({ strategy, state, updateAsset, onAdd, onDelete }: Props) {
  const { message } = App.useApp();
  const meta = STRATEGIES.find((s) => s.id === strategy)!;
  const fields = meta.assetFields;

  const doAutoFill = async (row: Asset, code: string) => {
    if (!AUTO_FILL_ENABLED) {
      message.info('未配置后端地址，自动填充未启用（详见 server/DEPLOY.md）');
      return;
    }
    const ind = await fetchIndicator(code, 'auto');
    if (!ind || ind.error) {
      message.warning(`未获取到数据：${ind?.error || '网络/后端异常'}`);
      return;
    }
    updateAsset(row.id, 'currentPrice', ind.price);
    updateAsset(row.id, 'ma30', ind.ma30);
    updateAsset(row.id, 'percentile', ind.percentile);
    message.success(
      `${row.name || code} 已自动填充：价格 ${ind.price} / 30月均线 ${ind.ma30} / ${ind.basisLabel} ${ind.percentile}%`,
    );
  };

  const columns: any[] = [
    {
      title: '#',
      key: 'idx',
      width: 44,
      align: 'center',
      render: (_: any, __: any, i: number) => i + 1,
    },
    ...fields.map((f) => {
      const def = FIELD_DEFS[f];
      if (f === 'name') {
        return {
          title: (
            <span>
              标的名称/代码
              <span style={{ color: '#999', fontWeight: 400, marginLeft: 6, fontSize: 12 }}>
                可搜可选·自动填充
              </span>
            </span>
          ),
          dataIndex: 'name',
          key: 'name',
          align: 'left',
          render: (val: any, row: Asset) => (
            <NameCell value={val} row={row} updateAsset={updateAsset} onAutoFill={doAutoFill} />
          ),
        };
      }
      return {
        title: def.label,
        dataIndex: f,
        key: f,
        align: 'right',
        render: (val: any, row: Asset) => {
          if (def.type === 'select') {
            return (
              <Select
                value={val}
                options={def.options}
                onChange={(v) => updateAsset(row.id, f, v)}
                size="small"
                style={{ width: '100%' }}
              />
            );
          }
          if (def.type === 'text') {
            return (
              <Input
                value={val}
                placeholder={def.placeholder}
                onChange={(e) => updateAsset(row.id, f, e.target.value)}
                size="small"
                style={{ width: '100%' }}
              />
            );
          }
          return (
            <InputNumber
              value={val}
              step={def.step}
              min={0}
              onChange={(v) => updateAsset(row.id, f, v ?? 0)}
              size="small"
              style={{ width: '100%' }}
            />
          );
        },
      };
    }),
    {
      title: '操作',
      key: 'op',
      width: 72,
      align: 'center',
      render: (_: any, row: Asset) => (
        <Button
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => {
            onDelete(row.id);
            message.success('已删除标的');
          }}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="result-scroll">
        <Table<Asset>
          columns={columns}
          dataSource={state.assets}
          rowKey="id"
          pagination={false}
          size="small"
          bordered
          scroll={{ x: 'max-content' }}
        />
      </div>
      <Button type="dashed" icon={<PlusOutlined />} onClick={onAdd} style={{ marginTop: 12, width: '100%' }}>
        新增标的
      </Button>
    </div>
  );
}
