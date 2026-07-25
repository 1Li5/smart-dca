import React, { useState } from 'react';
import { App, Button, InputNumber, Space, Switch, Typography } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import type { AppState } from '../lib/calc';

interface Props {
  strategy: string;
  state: AppState;
  update: (path: string, value: any) => void;
  updateAsset: (id: string, field: string, value: any) => void;
}

function LabeledNumber({
  label,
  value,
  onChange,
  step = 'any',
  min,
  addonAfter,
  width = 150,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
  min?: number;
  addonAfter?: string;
  width?: number;
}) {
  return (
    <div className="field" style={{ minWidth: width }}>
      <div className="field-label">{label}</div>
      <InputNumber
        value={value}
        onChange={(v) => onChange(v ?? 0)}
        step={step}
        min={min}
        addonAfter={addonAfter}
        style={{ width: '100%' }}
      />
    </div>
  );
}

function TierEditor({
  title,
  items,
  tiers,
  onChange,
}: {
  title: string;
  items: { key: string; label: string }[];
  tiers: Record<string, number>;
  onChange: (key: string, v: number) => void;
}) {
  return (
    <div className="tier-box">
      <div className="tier-title">{title}</div>
      <div className="tier-grid">
        {items.map((it) => (
          <LabeledNumber
            key={it.key}
            label={it.label}
            value={tiers[it.key] ?? 0}
            onChange={(v) => onChange(it.key, v)}
          />
        ))}
      </div>
    </div>
  );
}

const PCT_ITEMS = [
  { key: 'low', label: '低估阈值(%)' },
  { key: 'normalHigh', label: '合理上限(%)' },
  { key: 'high', label: '高估上限(%)' },
  { key: 'lowMult', label: '低估倍数' },
  { key: 'normalMult', label: '合理倍数' },
  { key: 'highMult', label: '高估倍数' },
];
const LAD_ITEMS = [
  { key: 'sigHigh', label: '显著高估倍数' },
  { key: 'lightHigh', label: '轻度高估倍数' },
  { key: 'normal', label: '合理倍数' },
  { key: 'lightLow', label: '轻度低估倍数' },
  { key: 'sigLow', label: '显著低估倍数' },
];

export default function GlobalSettings({ strategy, state, update, updateAsset }: Props) {
  const commonMax = (
    <LabeledNumber
      label="单期金额上限 (0=不限)"
      value={state.maxSingleAmount}
      onChange={(v) => update('maxSingleAmount', v)}
      addonAfter="元"
      width={190}
    />
  );
  const budget = (
    <LabeledNumber
      label="月度总预算"
      value={state.monthlyBudget}
      onChange={(v) => update('monthlyBudget', v)}
      addonAfter="元"
      width={160}
    />
  );

  let body: React.ReactNode = null;

  if (strategy === 'position') {
    body = (
      <>
        <Space wrap size={16}>
          {budget}
          {commonMax}
        </Space>
        <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
          位置权重 = 30月均值 ÷ 当前点位；单标的金额 = 预算 × (位置权重 ÷ 权重合计)。
        </Typography.Paragraph>
      </>
    );
  } else if (strategy === 'percentile') {
    body = (
      <>
        {commonMax}
        <TierEditor
          title="估值分档（可自定义）"
          items={PCT_ITEMS}
          tiers={state.percentileTiers as any}
          onChange={(k, v) => update(`percentileTiers.${k}`, v)}
        />
      </>
    );
  } else if (strategy === 'ladder') {
    body = (
      <>
        {commonMax}
        <TierEditor
          title="阶梯倍数（可自定义）"
          items={LAD_ITEMS}
          tiers={state.ladderTiers as any}
          onChange={(k, v) => update(`ladderTiers.${k}`, v)}
        />
      </>
    );
  } else if (strategy === 'va') {
    body = (
      <>
        <Space wrap size={16}>
          <LabeledNumber
            label="上期目标总市值"
            value={state.va.prevTargetValue}
            onChange={(v) => update('va.prevTargetValue', v)}
            addonAfter="元"
          />
          <LabeledNumber
            label="每月目标增长额"
            value={state.va.monthlyGrowth}
            onChange={(v) => update('va.monthlyGrowth', v)}
            addonAfter="元"
          />
          <LabeledNumber
            label="上期期末实际市值"
            value={state.va.prevEndActual}
            onChange={(v) => update('va.prevEndActual', v)}
            addonAfter="元"
          />
          <LabeledNumber
            label="本期涨跌幅"
            value={state.va.currentChange}
            onChange={(v) => update('va.currentChange', v)}
            addonAfter="%"
          />
          {commonMax}
        </Space>
        <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
          本期操作金额 = 本期目标总市值 − 本期期初实际市值（正=买入，负=卖出）。
        </Typography.Paragraph>
      </>
    );
  } else if (strategy === 'grid') {
    body = <GridBatch state={state} updateAsset={updateAsset} />;
  } else if (strategy === 'rebalance') {
    body = (
      <>
        <Space wrap size={16}>
          {budget}
          {commonMax}
          <LabeledNumber
            label="账户总市值(留空=自动合计)"
            value={state.rebalance.totalValue}
            onChange={(v) => update('rebalance.totalValue', v)}
            addonAfter="元"
            width={220}
          />
          <div className="field" style={{ minWidth: 160 }}>
            <div className="field-label">触发全额再平衡</div>
            <Switch
              checked={state.rebalance.rebalanceNow}
              onChange={(v) => update('rebalance.rebalanceNow', v)}
            />
          </div>
        </Space>
        <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
          定投资金优先补足占比低于目标的资产；开启再平衡后显示各资产买卖建议。
        </Typography.Paragraph>
      </>
    );
  }

  return <div className="gs-wrap">{body}</div>;
}

function GridBatch({
  state,
  updateAsset,
}: {
  state: AppState;
  updateAsset: (id: string, field: string, value: any) => void;
}) {
  const { message } = App.useApp();
  const [b, setB] = useState<{ base?: number; gap?: number; amt?: number; up?: number; lo?: number }>({});

  const apply = () => {
    let n = 0;
    state.assets.forEach((a) => {
      if (b.base != null) updateAsset(a.id, 'gridBasePrice', b.base);
      if (b.gap != null) updateAsset(a.id, 'gridGap', b.gap);
      if (b.amt != null) updateAsset(a.id, 'gridAmount', b.amt);
      if (b.up != null) updateAsset(a.id, 'gridUpper', b.up);
      if (b.lo != null) updateAsset(a.id, 'gridLower', b.lo);
      n++;
    });
    message.success(`已应用到 ${n} 个标的`);
  };

  return (
    <>
      <div className="tier-title">网格批量设置（应用到全部标的）</div>
      <div className="tier-grid" style={{ marginBottom: 12 }}>
        <LabeledNumber label="基准价" value={b.base ?? 0} onChange={(v) => setB((p) => ({ ...p, base: v }))} />
        <LabeledNumber label="间距(%)" value={b.gap ?? 0} onChange={(v) => setB((p) => ({ ...p, gap: v }))} />
        <LabeledNumber label="单格金额" value={b.amt ?? 0} onChange={(v) => setB((p) => ({ ...p, amt: v }))} addonAfter="元" />
        <LabeledNumber label="上限价" value={b.up ?? 0} onChange={(v) => setB((p) => ({ ...p, up: v }))} />
        <LabeledNumber label="下限价" value={b.lo ?? 0} onChange={(v) => setB((p) => ({ ...p, lo: v }))} />
      </div>
      <Button type="primary" icon={<ThunderboltOutlined />} onClick={apply} disabled={state.assets.length === 0}>
        应用到全部标的
      </Button>
      <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
        网格间距默认 5%；可设上下限，跌破下限只买不卖、涨破上限只卖不买。
      </Typography.Paragraph>
    </>
  );
}
