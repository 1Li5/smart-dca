import { useCallback, useState } from 'react';
import { Alert, App, Button, Card, Col, Descriptions, Empty, Row, Select, Space, Spin, Statistic } from 'antd';
import { chartColors, statusColor } from '../theme';
import LineChart from './charts/LineChart';
import BarChart from './charts/BarChart';
import { runBacktest, fmtMoney, fmtPct, fmtSigned, type AppState, type BacktestResult, type MonthlyPoint } from '../lib/calc';
import { fetchSeries } from '../lib/series';
import { STRATEGIES } from '../lib/defaults';
import { RISK_TEXT } from './ShareCard';
import { useResponsive } from '../hooks/useResponsive';

interface Props {
  state: AppState;
  update: (path: string, value: any) => void;
  updateAsset: (id: string, field: string, value: any) => void;
  onAddAsset: () => void;
  onDeleteAsset: (id: string) => void;
}

// 可回测的 6 类策略（不含 intro / backtest 自身）
const BACKTEST_STRATEGIES = STRATEGIES.filter((s) => s.kind !== 'intro' && s.kind !== 'backtest');

export default function BacktestPanel({ state }: Props) {
  const { message } = App.useApp();
  const { isMobile } = useResponsive();
  const colors = chartColors(state.theme);

  const [strategy, setStrategy] = useState<string>(() => {
    const v = state.activeStrategy;
    return BACKTEST_STRATEGIES.some((s) => s.id === v) ? v : 'position';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const run = useCallback(async () => {
    const assets = (state.assets || []).filter((a) => a.code && String(a.code).trim().length > 0);
    if (assets.length === 0) {
      message.warning('请为标的填写代码（指数 / 基金代码）后回测');
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const entries = await Promise.all(
        assets.map(async (a) => {
          const r = await fetchSeries(String(a.code), 'auto');
          return [a.id, r ? r.monthly : null] as const;
        })
      );
      const seriesMap: Record<string, MonthlyPoint[]> = {};
      const skipped: string[] = [];
      entries.forEach(([id, monthly]) => {
        if (monthly && monthly.length) seriesMap[id] = monthly;
        else {
          const a = assets.find((x) => x.id === id);
          skipped.push(a ? a.name || id : id);
        }
      });
      if (skipped.length) message.warning(`部分标的行情获取失败，已跳过：${skipped.join('、')}`);

      const res = runBacktest(strategy, state, seriesMap);
      setResult(res);
      if (res.points.length === 0) {
        message.info('无可用历史月线，无法生成回测结果');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError('回测失败：' + msg);
      message.error('回测失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [strategy, state, message]);

  const span = isMobile ? 24 : 12;
  const meta = BACKTEST_STRATEGIES.find((s) => s.id === strategy);

  const summary = result?.summary;
  const retColor = (v: number) => (v >= 0 ? colors.rise : colors.fall);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message="历史回测（简化模型）"
        description="基于各标的历史月线，逐月回放所选策略的定投金额，与「固定月定投 / 一次性买入」做净值对比。回测为简化模型，结果仅供参考，不构成投资建议。"
      />

      <Card title="回测设置" extra={<span className="card-tag">真实历史月线（非 mock）</span>}>
        <Space wrap>
          <span>回测策略：</span>
          <Select
            value={strategy}
            style={{ width: isMobile ? '100%' : 240 }}
            onChange={(v) => setStrategy(v)}
            options={BACKTEST_STRATEGIES.map((s) => ({ value: s.id, label: s.name }))}
          />
          <Button type="primary" onClick={run} loading={loading}>
            开始回测
          </Button>
        </Space>
        {meta && (
          <div style={{ marginTop: 10, color: colors.text, opacity: 0.85 }}>{meta.desc}</div>
        )}
        <div style={{ marginTop: 8, color: colors.text, opacity: 0.7, fontSize: 12 }}>
          提示：请在前述策略页为标的中填写「代码」（指数如 000300、基金如 110011）。未填代码或行情获取失败的标的将被跳过。
        </div>
      </Card>

      {loading && (
        <Card>
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Spin tip="正在拉取历史月线并计算回测…">
              <div style={{ height: 80 }} />
            </Spin>
          </div>
        </Card>
      )}

      {!loading && error && (
        <Alert type="error" showIcon message="回测出错" description={error} />
      )}

      {!loading && !error && result && result.points.length > 0 && (
        <>
          <Card title="净值曲线" extra={<span className="card-tag">策略定投 vs 固定月定投 vs 一次性买入</span>}>
            <LineChart
              height={300}
              colors={colors}
              xLabels={result.months}
              series={[
                { label: '策略定投', values: result.points.map((p) => p.value) },
                { label: '固定月定投', values: result.buyHold.map((p) => p.value) },
                { label: '一次性买入', values: (result.lumpSum || []).map((p) => p.value) },
              ]}
            />
          </Card>

          <Card title="关键指标" extra={<span className="card-tag">期末口径，仅供参考</span>}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <Statistic title="累计投入" value={fmtMoney(summary!.totalInvested)} prefix="¥" />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Statistic title="期末市值" value={fmtMoney(summary!.finalValue)} prefix="¥" />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Statistic
                  title="累计收益"
                  value={fmtSigned(summary!.totalReturnPct) + '%'}
                  valueStyle={{ color: retColor(summary!.totalReturnPct) }}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Statistic
                  title="超额（vs 固定月定投）"
                  value={fmtSigned(summary!.vsBuyHoldPct) + '%'}
                  valueStyle={{ color: retColor(summary!.vsBuyHoldPct) }}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Statistic title="最大回撤" value={fmtPct(summary!.maxDrawdownPct)} valueStyle={{ color: colors.extreme }} />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Descriptions column={1} size="small" title="年度最佳 / 最差">
                  <Descriptions.Item label={summary!.bestYear?.year || '—'}>
                    <span style={{ color: colors.rise }}>{summary!.bestYear ? fmtSigned(summary!.bestYear.ret) + '%' : '—'}</span>
                  </Descriptions.Item>
                  <Descriptions.Item label={summary!.worstYear?.year || '—'}>
                    <span style={{ color: colors.fall }}>{summary!.worstYear ? fmtSigned(summary!.worstYear.ret) + '%' : '—'}</span>
                  </Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>
          </Card>

          <Card title="年度收益" extra={<span className="card-tag">红涨绿跌</span>}>
            <YearlyBar result={result} colors={colors} />
          </Card>

          <Alert
            type="warning"
            showIcon
            message="合规与风险提示"
            description={
              <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                <div>{RISK_TEXT}</div>
                <div>过往业绩不代表未来表现。</div>
                <div>回测为简化模型，结果仅供参考，不构成投资建议。</div>
              </div>
            }
          />
        </>
      )}

      {!loading && !error && (!result || result.points.length === 0) && (
        <Card>
          <Empty
            description={
              result && result.points.length === 0
                ? '无可用历史月线，请检查标的代码或稍后重试'
                : '请为标的填写代码（指数 / 基金代码）后，点击「开始回测」'
            }
          />
        </Card>
      )}
    </Space>
  );
}

// 年度收益柱状图（独立子组件，避免上方 JSX 复杂度）
function YearlyBar({
  result,
  colors,
}: {
  result: BacktestResult;
  colors: ReturnType<typeof chartColors>;
}) {
  // 按自然年聚合：年末 value / 上年末 value - 1
  const yearMap: Record<string, number> = {};
  result.points.forEach((p) => {
    yearMap[p.date.slice(0, 4)] = p.value;
  });
  const years = Object.keys(yearMap).sort();
  const items = years.map((y, i) => {
    const base = i === 0 ? result.points[0].value : yearMap[years[i - 1]];
    const ret = base > 0 ? (yearMap[y] / base - 1) * 100 : 0;
    return { label: y, value: ret, color: ret >= 0 ? colors.rise : colors.fall };
  });
  if (items.length === 0) return <Empty description="暂无年度数据" />;
  return <BarChart height={280} colors={colors} signed valueFmt={(v) => fmtSigned(v) + '%'} items={items} />;
}
