import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConfigProvider, Layout, Tabs, App as AntApp, Modal } from 'antd';
import { getThemeConfig } from './theme';
import { DEFAULT_STATE, STRATEGIES } from './lib/defaults';
import { loadState, saveState, resetState } from './lib/storage';
import { runStrategy, type AppState } from './lib/calc';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useCloudSync } from './hooks/useCloudSync';
import { fetchRemoteData } from './lib/auth';
import { extractSyncPayload, applySyncPayload } from './lib/syncSlice';
import { readShareFromHash, decodeShare, clearShareHash } from './lib/share';
import AppHeader from './components/AppHeader';
import IntroPage from './components/IntroPage';
import StrategyView from './components/StrategyView';
import BacktestPanel from './components/BacktestPanel';
import AuthModal from './components/AuthModal';
import MigrationDialog from './components/MigrationDialog';
import SyncStatusBadge from './components/SyncStatus';

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
    code: '',
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
    takeProfitPrice: 0,
  };
}

/** 简单深比较，足够判断"本地还是不是默认值" */
function isDefaultLike(state: AppState): boolean {
  try {
    return JSON.stringify(state) === JSON.stringify(DEFAULT_STATE);
  } catch {
    return false;
  }
}

function Shell({
  state,
  setState,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) {
  const { message } = AntApp.useApp();
  const { user, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [migration, setMigration] = useState<{
    open: boolean;
    cloudPayload: any;
    cloudUpdatedAt: string | null;
    localAssetCount: number;
  } | null>(null);
  const [migrationResolved, setMigrationResolved] = useState(true);

  const mode = state.theme;
  const active = state.activeStrategy;
  const result = active !== 'intro' && active !== 'backtest' ? runStrategy(active, state) : null;
  const strategyName = STRATEGIES.find((s) => s.id === active)?.name || active;
  const copyText = result ? result.copyLines.join('\n') : '';

  // 上云：登录后自动防抖同步（受 migrationResolved 门控）
  const sync = useCloudSync(user, extractSyncPayload(state), migrationResolved);

  // 登录后处理云端数据拉取 / 迁移
  useEffect(() => {
    if (!user) {
      setMigration(null);
      setMigrationResolved(true); // 游客模式不需要门控
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const remote = await fetchRemoteData();
        if (cancelled) return;
        if (remote.payload == null) {
          // 云端无数据：直接把当前 local 当作"用户数据"上传
          setMigration(null);
          setMigrationResolved(true);
          await sync.syncNow();
        } else {
          // 云端有数据：判断是否需要弹迁移框
          if (isDefaultLike(state)) {
            // 本地是默认值：静默下载云端
            setState((prev) => applySyncPayload(prev, remote.payload as any));
            setMigration(null);
            setMigrationResolved(true);
          } else {
            // 本地有用户数据：弹迁移框
            setMigration({
              open: true,
              cloudPayload: remote.payload,
              cloudUpdatedAt: remote.updatedAt,
              localAssetCount: state.assets?.length || 0,
            });
            setMigrationResolved(false);
          }
        }
      } catch (err) {
        // 拉取失败：当作"云端无数据"处理，让用户继续
        message.warning('云端数据拉取失败，将以本地数据为准');
        setMigration(null);
        setMigrationResolved(true);
      }
    })();
    return () => { cancelled = true; };
    // 仅在 user 变化（新登录/登出）时触发；state 变化由 sync 自身处理
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
      next.assets = next.assets.filter((a: any) => a.id === id);
      return next;
    });
  };
  const switchStrategy = (id: string) => update('activeStrategy', id);
  const onReset = () => {
    Modal.confirm({
      title: '确认重置？',
      content: '将清空全部标的和参数，恢复为默认示例数据。',
      okText: '重置',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        const next = resetState();
        setState(next);
        message.success('已重置为默认数据');
      },
    });
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
  const onImport = (payload: any) => {
    setState((prev) => applySyncPayload(prev, payload));
    message.success('已导入配置，参数已更新');
  };

  // 挂载时：若 URL 带 #cfg= 分享配置，询问后还原（容错，不抛异常）
  useEffect(() => {
    const raw = readShareFromHash();
    if (!raw) return;
    const decoded = decodeShare(raw);
    if (!decoded.ok || !decoded.payload) {
      clearShareHash();
      if (raw) message.warning(decoded.error || '分享链接已失效');
      return;
    }
    Modal.confirm({
      title: '检测到分享方案',
      content: '当前链接包含一份定投配置，是否还原到本机？',
      okText: '还原',
      cancelText: '忽略',
      onOk: () => {
        onImport(decoded.payload);
        clearShareHash();
      },
      onCancel: () => clearShareHash(),
    });
    // 仅挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onOpenLogin = () => { setAuthInitialMode('login'); setAuthOpen(true); };
  const onOpenRegister = () => { setAuthInitialMode('register'); setAuthOpen(true); };
  const onLogout = async () => {
    Modal.confirm({
      title: '确认登出？',
      content: '登出后未保存的本地更改不会丢失，但不会再自动同步到云端。',
      okText: '登出',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        await logout();
        message.success('已登出');
      },
    });
  };

  // 迁移对话框的 3 个选项
  const onChooseLocal = useCallback(async () => {
    setMigrationResolved(true);
    setMigration(null);
    await sync.syncNow();
    message.success('已用本地数据覆盖云端');
  }, [sync]);
  const onChooseCloud = useCallback(() => {
    if (migration?.cloudPayload) {
      setState((prev) => applySyncPayload(prev, migration.cloudPayload as any));
    }
    setMigrationResolved(true);
    setMigration(null);
    message.success('已用云端数据覆盖本地');
  }, [migration]);
  const onMigrationCancel = useCallback(async () => {
    // 取消即登出，恢复游客
    setMigration(null);
    setMigrationResolved(true);
    await logout();
    message.info('已取消登录，可继续以游客模式使用');
  }, [logout]);

  const items = STRATEGIES.map((s) => ({
    key: s.id,
    label: s.name,
    children:
      s.id === 'intro' ? (
        <IntroPage />
      ) : s.id === 'backtest' ? (
        <BacktestPanel
          state={state}
          update={update}
          updateAsset={updateAsset}
          onAddAsset={addAsset}
          onDeleteAsset={deleteAsset}
        />
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
          user={user}
          onOpenLogin={onOpenLogin}
          onOpenRegister={onOpenRegister}
          onLogout={onLogout}
          syncStatusEl={
            <SyncStatusBadge
              status={sync.status}
              lastSyncedAt={sync.lastSyncedAt}
              lastError={sync.lastError}
              onSyncNow={sync.syncNow}
              loggedIn={!!user}
            />
          }
          state={state}
          result={result}
          strategyName={strategyName}
          onImport={onImport}
        />
      </div>
      <Content className="app-content">
        <div className="tabs-sticky">
          <Tabs activeKey={active} onChange={switchStrategy} items={items} destroyInactiveTabPane={false} />
        </div>
      </Content>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authInitialMode} />
      {migration && (
        <MigrationDialog
          open={migration.open}
          cloudUpdatedAt={migration.cloudUpdatedAt}
          localAssetCount={migration.localAssetCount}
          onChooseLocal={onChooseLocal}
          onChooseCloud={onChooseCloud}
          onCancel={onMigrationCancel}
        />
      )}
    </Layout>
  );
}

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());

  // 游客 / 已登录用户的本地持久化（已登录：localStorage 仍是云端的镜像缓存）
  useEffect(() => {
    saveState(state);
  }, [state]);

  return (
    <ConfigProvider theme={getThemeConfig(state.theme)}>
      <AntApp>
        <AuthProvider>
          <Shell state={state} setState={setState} />
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
}
