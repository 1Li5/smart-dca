import { Select, Table } from 'antd';
import { useState } from 'react';
import { COMPARABLE, STRATEGIES } from '../lib/defaults';
import { runStrategy, fmtMoney, type AppState } from '../lib/calc';

interface Props {
  state: AppState;
  defaultA: string;
}

export default function ComparePanel({ state, defaultA }: Props) {
  const [a, setA] = useState(defaultA);
  const [b, setB] = useState(COMPARABLE.find((s) => s !== defaultA) ?? 'percentile');

  const opts = COMPARABLE.map((id) => {
    const m = STRATEGIES.find((s) => s.id === id)!;
    return { value: id, label: m.name };
  });
  const nameA = STRATEGIES.find((s) => s.id === a)!.name;
  const nameB = STRATEGIES.find((s) => s.id === b)!.name;

  const ra = runStrategy(a, state);
  const rb = runStrategy(b, state);

  const rows = state.assets.map((asset) => {
    const amtA = ra.rows.find((r) => r.name === asset.name)?.amount ?? null;
    const amtB = rb.rows.find((r) => r.name === asset.name)?.amount ?? null;
    const diff = amtA != null && amtB != null ? amtA - amtB : null;
    return { key: asset.id, name: asset.name, a: amtA, b: amtB, diff };
  });

  const cols: any[] = [
    { title: '标的', dataIndex: 'name', key: 'name', align: 'left' },
    {
      title: `策略 A：${nameA}`,
      dataIndex: 'a',
      key: 'a',
      align: 'right',
      render: (v: number | null) => (v == null ? '—' : fmtMoney(v)),
    },
    {
      title: `策略 B：${nameB}`,
      dataIndex: 'b',
      key: 'b',
      align: 'right',
      render: (v: number | null) => (v == null ? '—' : fmtMoney(v)),
    },
    {
      title: '差异 (A − B)',
      dataIndex: 'diff',
      key: 'diff',
      align: 'right',
      render: (v: number | null) =>
        v == null ? (
          '—'
        ) : (
          <span
            style={{
              color: v > 0 ? '#cf1322' : v < 0 ? '#389e0d' : 'inherit',
              fontWeight: 600,
            }}
          >
            {v > 0 ? '+' : ''}
            {fmtMoney(v)}
          </span>
        ),
    },
  ];

  return (
    <div>
      <div className="compare-select">
        <span>策略 A：</span>
        <Select value={a} options={opts} onChange={setA} style={{ width: 160 }} />
        <span>策略 B：</span>
        <Select value={b} options={opts} onChange={setB} style={{ width: 160 }} />
      </div>
      <div className="result-scroll">
        <Table
          columns={cols}
          dataSource={rows}
          rowKey="key"
          pagination={false}
          size="small"
          bordered
          scroll={{ x: 'max-content' }}
        />
      </div>
    </div>
  );
}
