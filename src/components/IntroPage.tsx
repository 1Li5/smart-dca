import { Alert, Card, Col, Row, Table, Tag, Typography } from 'antd';
import { CheckCircleFilled, CloseCircleFilled, BulbOutlined } from '@ant-design/icons';

interface StrategyIntro {
  id: string;
  title: string;
  tag: string;
  principle: string;
  pros: string[];
  cons: string[];
  scenario: string;
}

const INTRO: StrategyIntro[] = [
  {
    id: 'position',
    title: '位置权重法',
    tag: '基准 · 默认',
    principle:
      '以标的过去 30 个月收盘均值为锚，计算「位置权重 = 30月均值 ÷ 当前点位」。当前价格越低，权重越大，分配到的定投金额越多——本质是「跌得多就多买」，自动实现逆周期布局。',
    pros: ['逻辑直观，无需估值数据', '自动按相对位置加权，分散择时风险', '适合作为组合底仓策略'],
    cons: ['依赖 30 月均线，单边长期下跌会持续加码', '不区分估值绝对高低', '需人工维护各标的 30 月均值'],
    scenario: '想用一套简单规则做长期底仓、懒得看估值的用户',
  },
  {
    id: 'percentile',
    title: '估值百分位',
    tag: '估值视角',
    principle:
      '取指数 PE/PB 在过去 10 年的百分位：<30% 视为低估（1.8×）、30–70% 合理（1.0×）、70–90% 高估（0.5×）、>90% 极度高估（暂停+止盈）。把「贵不贵」量化成分档倍数。',
    pros: ['直接反映估值高低，逻辑清晰', '极度高估自动止盈提示', '分档倍数可自定义'],
    cons: ['依赖历史估值区间，估值中枢上移时易误判', '10 年样本在结构变化时失效', '需手动获取 PE/PB 与百分位'],
    scenario: '关心估值、希望「便宜多买、贵了少买甚至卖」的投资者',
  },
  {
    id: 'ladder',
    title: '阶梯档位',
    tag: '新手友好',
    principle:
      '以 30 月均值为中枢，按当前点位偏离比例分 5 档固定倍数（-20% 以下 2.0×、-10%~-20% 1.5×、±10% 1.0×、10%~20% 0.8×、>20% 0.5×）。偏离越大、买得越多。',
    pros: ['规则极简，新手一眼看懂', '与位置权重同源，但更直观分档', '倍数可自定义'],
    cons: ['档位阈值固定，缺乏估值维度', '同样在单边市会加大偏离', '阈值需按标的波动特征调整'],
    scenario: '刚接触定投、想要「简单明确加减仓信号」的新手',
  },
  {
    id: 'va',
    title: '价值平均 VA',
    tag: '高抛低吸',
    principle:
      '设定每月目标市值增长额，每期投入 = 本期目标总市值 − 期初实际市值。涨了少投甚至卖、跌了多投，机械实现「低买高卖」。',
    pros: ['纪律性强，天然高抛低吸', '目标市值路径清晰可规划', '下跌市自动加仓、上涨市自动减仓'],
    cons: ['需要持续有现金补足（大跌可能需大笔投入）', '长期上涨后可能无钱可投', '依赖对目标增长额的合理设定'],
    scenario: '有稳定现金流、希望严格纪律化「逢低多买」的进阶用户',
  },
  {
    id: 'grid',
    title: '网格定投',
    tag: '震荡收割',
    principle:
      '以基准价为中枢划分等比网格，价格每跌一格买入固定金额、每涨一格卖出对应份额；可设上下限，跌破下限只买不卖、涨破上限只卖不买。',
    pros: ['震荡市持续赚取价差', '规则机械、无需判断方向', '上下限可防极端风险'],
    cons: ['单边趋势市会失效（跌破下限满仓或涨破上限空仓）', '需预置资金与持仓', '网格密度（间距）需匹配波动'],
    scenario: '标的处于区间震荡、想「网格搬砖」收割差价的用户',
  },
  {
    id: 'rebalance',
    title: '恒定比例再平衡',
    tag: '组合管理',
    principle:
      '预设多资产目标比例（如股 60%/债 30%/金 10%），定投资金优先补足低配资产；可按周期触发全额再平衡，卖出超配、买入低配，维持目标结构。',
    pros: ['维持组合风险结构稳定', '定投即再平衡，省心', '支持周期性全额再平衡'],
    cons: ['再平衡可能产生交易成本/税费', '目标比例需随风险偏好动态调整', '依赖各资产当前市值准确录入'],
    scenario: '管理多资产组合、希望「自动回归目标权重」的资产配置型用户',
  },
];

const GUIDE = [
  ['想偷懒做长期底仓', '位置权重法', '不看重估值、要简单规则'],
  ['关心贵不贵、想止盈', '估值百分位', '有 PE/PB 与历史百分位数据'],
  ['新手要简单信号', '阶梯档位', '只要 30 月均线就能用'],
  ['有现金流、要纪律', '价值平均 VA', '能接受大跌时多投'],
  ['标的在震荡区间', '网格定投', '想赚价差、有备用资金'],
  ['管多资产组合', '恒定比例再平衡', '要维持目标配置'],
];

export default function IntroPage() {
  return (
    <div className="intro">
      <div className="intro-hero">
        <Typography.Title level={3} style={{ margin: 0 }}>
          策略原理与适用指南
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 16 }}>
          本站提供 6 类主流智能定投策略。下面逐一说明其原理、优缺点与适用场景，帮你先选对方法，再开始计算。
        </Typography.Paragraph>
        <Row gutter={[12, 12]} className="intro-stats">
          {[
            ['6', '类策略'],
            ['1', '键切换'],
            ['2', '策略对比'],
            ['100%', '本地计算'],
          ].map(([n, l]) => (
            <Col key={l} flex="1 1 120px">
              <div className="stat">
                <div className="stat-n">{n}</div>
                <div className="stat-l">{l}</div>
              </div>
            </Col>
          ))}
        </Row>
      </div>

      <Row gutter={[16, 16]} className="intro-cards">
        {INTRO.map((s) => (
          <Col key={s.id} xs={24} sm={12} lg={8}>
            <Card
              className="intro-card"
              title={
                <span>
                  {s.title} <Tag color="blue" bordered={false}>{s.tag}</Tag>
                </span>
              }
            >
              <Typography.Paragraph style={{ marginBottom: 10 }}>{s.principle}</Typography.Paragraph>
              <div className="intro-block">
                <div className="intro-label pros">优点</div>
                <ul className="intro-list">
                  {s.pros.map((p) => (
                    <li key={p}>
                      <CheckCircleFilled className="ic-pros" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="intro-block">
                <div className="intro-label cons">缺点 · 局限</div>
                <ul className="intro-list">
                  {s.cons.map((c) => (
                    <li key={c}>
                      <CloseCircleFilled className="ic-cons" /> {c}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="intro-scenario">
                <BulbOutlined /> 适用：{s.scenario}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="快速选择指南" style={{ marginTop: 16 }}>
        <Table
          size="small"
          pagination={false}
          rowKey="k"
          columns={[
            { title: '你的需求', dataIndex: 'need', width: '34%' },
            { title: '推荐策略', dataIndex: 'rec', width: '33%', render: (t: string) => <Tag color="blue" bordered={false}>{t}</Tag> },
            { title: '理由', dataIndex: 'why', width: '33%' },
          ]}
          dataSource={GUIDE.map((g, i) => ({ k: i, need: g[0], rec: g[1], why: g[2] }))}
        />
      </Card>

      <Alert
        type="warning"
        showIcon
        style={{ marginTop: 16 }}
        message="风险提示"
        description="本工具所有计算基于你手动输入的数据与既定公式，结果仅供学习与研究参考，不构成任何投资建议。定投不保证保本，市场有风险，决策需谨慎。"
      />
    </div>
  );
}
