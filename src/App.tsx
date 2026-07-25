import { useEffect, useState } from 'react';
import { ConfigProvider, Layout, Tabs, App as AntApp } from 'antd';
import { getThemeConfig } from './theme';
import { STRATEGIES } from './lib/defaults';
import { loadState, saveState, resetState } from './lib/storage';
import { runStrategy, type AppState } from './lib/calc';
import AppHeader from './components/AppHeader';
import IntroPage from './components/IntroPage';
import StrategyView from './components/StrategyView';

const { Content } = Layout;

type Updater = (path: string, value: any) => void;

function setByPath(obj: any, path: string, value: any) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
  cur[keys[keys.length - 1]] = value;
}

function makeAsset() {
  return {
    id: 'a_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4),
    name: '新标的',
    currentPrice: 0,
    ma30: 0,
    baseAmount: 1000,
    metricType: 'PE' as const,
    valuationMetric: 0,
    percentile: 50,
    gridBasePrice: 0,
    gridGap: 5,
    gridAmount: 1000,
    holdingShares: 0,
    gridUpper: 0,
    gridLower: 0,
    currentValue: 0,
    targetRatio: 0,
  };
}

function Shell({
  state,
  setState,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) {
  const { message } = AntApp.useApp();
  const mode = state.theme;
  const active = state.activeStrategy;
  const result = active !== 'intro' ? runStrategy(active, state) : null;
  const copyText = result ? result.copyLines.join('\n') : '';

  const update: Updater = (path, value) => {
    setState((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      setByPath(next, path, value);
      return next;
    });
  };
  const updateAsset = (id: string, field: string, value: any) => {
    setState((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const a = next.assets.find((x: any) => x.id === id);
      if (a) a[field] = value;
      return next;
    });
  };
  const addAsset = () => {
    setState((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next.assets.push(makeAsset());
      return next;
    });
    message.success('已新增标的');
  };
  const deleteAsset = (id: string) => {
    setState((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next.assets = next.assets.filter((a: any) => a.id !== id);
      return next;
    });
  };
  const switchStrategy = (id: string) => update('activeStrategy', id);
  const onReset = () => {
    setState(resetState());
    message.success('已重置为默认数据');
  };
  const onToggleTheme = () => update('theme', mode === 'dark' ? 'light' : 'dark');
  const onCopy = () => {
    if (!copyText) return;
    const done = () => message.success('本期定投方案已复制');
    const fail = () => message.error('复制失败，请手动选择文本');
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(copyText).then(done, fail);
    } else {
      fail();
    }
  };

  const items = STRATEGIES.map((s) => ({
    key: s.id,
    label: s.name,
    children:
      s.id === 'intro' ? (
        <IntroPage />
      ) : (
        <StrategyView
          strategy={s.id}
          state={state}
          result={result!}
          update={update}
          updateAsset={updateAsset}
          onAddAsset={addAsset}
          onDeleteAsset={deleteAsset}
        />
      ),
  }));

  return (
    <Layout className={`app-root theme-${mode}`} style={{ minHeight: '100vh' }}>
      <div className="app-header-wrap">
        <AppHeader
          mode={mode}
          canCopy={!!copyText}
          onCopy={onCopy}
          onReset={onReset}
          onToggleTheme={onToggleTheme}
        />
      </div>
      <Content className="app-content">
        <div className="tabs-sticky">
          <Tabs activeKey={active} onChange={switchStrategy} items={items} destroyInactiveTabPane={false} />
        </div>
      </Content>
    </Layout>
  );
}

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  useEffect(() => {
    saveState(state);
  }, [state]);

  return (
    <ConfigProvider theme={getThemeConfig(state.theme)}>
      <AntApp>
        <Shell state={state} setState={setState} />
      </AntApp>
    </ConfigProvider>
  );
}
