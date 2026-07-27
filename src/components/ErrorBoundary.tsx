import { Component, type ReactNode } from 'react';
import { Button, Result } from 'antd';

/**
 * 全局错误边界。
 * 目的：把任何渲染时异常（React tree 卸载 → 用户看到白屏）兜底成明确错误页，
 *       永远不再出现"看似白屏、其实是 JS 崩了"的体验。
 *
 * 触发后：
 * - 当前 React tree 整体被卸载前的子树，本组件接住 error 并显示友好提示 + 刷新按钮
 * - 控制台保留 error + componentStack，便于排查
 */
interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  errorInfo: string | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // 完整堆栈打到 console（Vercel/Edge 控制台可见，但用户看不到）
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary 捕获渲染异常]', error, info.componentStack);
    this.setState({ errorInfo: info.componentStack || null });
  }

  handleHardReset = () => {
    try {
      // 清干净 localStorage 后再强刷，避免坏 state 反复触发崩溃
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('smart-dca')) localStorage.removeItem(k);
      }
    } catch {
      /* noop */
    }
    // 用 location.replace 强制彻底重新拉 HTML/JS
    window.location.replace(window.location.origin + window.location.pathname);
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Result
        status="warning"
        title="页面渲染遇到异常"
        subTitle={
          <div style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(0,0,0,0.65)' }}>
            <div>已自动捕获，但当前界面无法继续渲染。</div>
            <div style={{ marginTop: 6 }}>
              可点击下方按钮重置本地缓存并刷新页面；若仍异常，请按 <kbd>Ctrl+F5</kbd> / <kbd>Cmd+Shift+R</kbd> 硬刷新。
            </div>
            {this.state.error && (
              <details style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                <summary>技术细节</summary>
                <pre style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
                  {this.state.error.message}
                  {this.state.errorInfo ? '\n\n' + this.state.errorInfo : ''}
                </pre>
              </details>
            )}
          </div>
        }
        extra={
          <Button type="primary" onClick={this.handleHardReset}>
            重置并刷新
          </Button>
        }
      />
    );
  }
}
