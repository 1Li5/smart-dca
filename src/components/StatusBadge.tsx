import { Tag } from 'antd';
import type { StatusKey } from '../lib/calc';

// 红涨绿跌（中国习惯）：低估/买入=红，高估/卖出=绿，极度高估=橙，正常/持有=中性灰
const STATUS_COLOR: Record<string, string> = {
  low: 'red',
  buy: 'red',
  high: 'green',
  sell: 'green',
  extreme: 'orange',
  normal: 'default',
  hold: 'default',
};

export default function StatusBadge({ status, text }: { status: StatusKey; text: string }) {
  const color = STATUS_COLOR[status ?? 'null'] ?? 'default';
  return (
    <Tag color={color} bordered={false} style={{ fontWeight: 600, marginInlineEnd: 0 }}>
      {text}
    </Tag>
  );
}
