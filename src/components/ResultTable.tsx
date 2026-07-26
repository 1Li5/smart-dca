import { Alert, Table, Typography } from 'antd';
import type { StrategyResult } from '../lib/calc';
import StatusBadge from './StatusBadge';

export default function ResultTable({ result }: { result: StrategyResult }) {
  if (!result || result.columns.length === 0) return null;

  const cols: any[] = result.columns.map((c) => ({
    title: c.label,
    dataIndex: c.key,
    key: c.key,
    align: c.key === 'name' ? 'left' : 'right',
    render: (val: any, row: any) => {
      const text = c.fmt ? c.fmt(val) : val == null ? '' : String(val);
      if (c.statusField) return <StatusBadge status={row[c.statusField]} text={text} />;
      return <span className={c.strong ? 'num-cell strong' : 'num-cell'}>{text}</span>;
    },
  }));

  const summaryNode =
    result.summary != null ? (
      <Table.Summary fixed>
        <Table.Summary.Row className="summary-row">
          <Table.Summary.Cell index={0} colSpan={result.columns.length - 1}>
            {result.summary.label}
          </Table.Summary.Cell>
          <Table.Summary.Cell index={1} align="right">
            <span className="num-cell strong">{result.summary.value}</span>
            {result.summary.expect != null &&
              Math.abs(parseFloat(result.summary.value) - parseFloat(result.summary.expect)) > 0.01 && (
                <span className="err"> （期望 {result.summary.expect}）</span>
              )}
          </Table.Summary.Cell>
        </Table.Summary.Row>
      </Table.Summary>
    ) : undefined;

  return (
    <div>
      {result.strategy === 'percentile' && (
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          ≈历史排名参考，非官方估值
        </Typography.Text>
      )}
      <div className="result-scroll">
        <Table
          columns={cols}
          dataSource={result.rows.map((r, i) => ({ ...r, _key: i }))}
          rowKey="_key"
          pagination={false}
          size="small"
          bordered
          scroll={{ x: 'max-content' }}
          summary={() => summaryNode}
        />
      </div>
      {result.warnings && result.warnings.length > 0 && (
        <div className="warn-box">
          {result.warnings.map((w, i) => (
            <Alert key={i} type="warning" showIcon message={w} style={{ marginBottom: 8 }} />
          ))}
        </div>
      )}
    </div>
  );
}
