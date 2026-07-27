import { fmtMoney, fmtNum, fmtPct, fmtSigned, type StrategyResult, type AppState } from '../lib/calc';

/**
 * 自包含分享卡：全部内联样式，不依赖 AntD token / CSS 变量，
 * 规避 html2canvas 对 AntD5 oklch/color-mix 的兼容问题。
 * 红涨绿跌：低估/买入=红(#cf1322)，高估/卖出=绿(#389e0d)，极度=橙，正常/持有=灰。
 */

export const RISK_TEXT = '基金有风险，投资需谨慎。测算结果仅供参考，不构成投资建议。';

const STATUS_COLOR: Record<string, string> = {
  low: '#cf1322',
  buy: '#cf1322',
  high: '#389e0d',
  sell: '#389e0d',
  extreme: '#d46b08',
  normal: '#8c8c8c',
  hold: '#8c8c8c',
  null: '#8c8c8c',
};

export default function ShareCard({
  state,
  result,
  strategyName,
}: {
  state: AppState;
  result: StrategyResult | null;
  strategyName: string;
}) {
  const maxA = state.maxSingleAmount;
  return (
    <div
      style={{
        width: 660,
        boxSizing: 'border-box',
        padding: 20,
        background: '#fff',
        color: '#1a1a1a',
        fontFamily:
          '-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif',
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: 'linear-gradient(135deg,#1668dc,#2f54eb)',
            color: '#fff',
            fontSize: 18,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          定
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>智能定投计算器</div>
          <div style={{ fontSize: 12, color: '#888' }}>策略：{strategyName}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 12, color: '#444' }}>
        <span>
          月度预算：<b>{fmtMoney(state.monthlyBudget)}</b> 元
        </span>
        <span>
          单期上限：<b>{maxA > 0 ? fmtMoney(maxA) + ' 元' : '不限'}</b>
        </span>
        <span>
          标的数：<b>{state.assets.length}</b>
        </span>
      </div>

      {result && result.columns.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr>
              {result.columns.map((c) => (
                <th
                  key={c.key}
                  style={{
                    borderBottom: '2px solid #1668dc',
                    textAlign: c.key === 'name' ? 'left' : 'right',
                    padding: '6px 8px',
                    color: '#1668dc',
                    fontWeight: 600,
                  }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((r, i) => (
              <tr key={i}>
                {result.columns.map((c) => {
                  const raw = (r as any)[c.key];
                  const text = c.fmt ? c.fmt(raw) : raw == null ? '' : String(raw);
                  const color = c.statusField
                    ? STATUS_COLOR[String((r as any)[c.statusField])] || '#1a1a1a'
                    : undefined;
                  return (
                    <td
                      key={c.key}
                      style={{
                        borderBottom: '1px solid #eee',
                        textAlign: c.key === 'name' ? 'left' : 'right',
                        padding: '5px 8px',
                        fontWeight: c.strong ? 700 : 400,
                        color: color || '#1a1a1a',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {text}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {result.summary && (
            <tfoot>
              <tr>
                <td
                  colSpan={Math.max(1, result.columns.length - 1)}
                  style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700 }}
                >
                  {result.summary.label}
                </td>
                <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700 }}>
                  {result.summary.value}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      )}

      {result && result.warnings && result.warnings.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {result.warnings.map((w, i) => (
            <div key={i} style={{ color: '#cf1322', fontSize: 12, margin: '2px 0' }}>
              ⚠ {w}
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: 14,
          paddingTop: 10,
          borderTop: '1px solid #eee',
          color: '#999',
          fontSize: 11.5,
        }}
      >
        {RISK_TEXT}
      </div>
    </div>
  );
}
