import { useRef } from 'react';
import { App, Button, Dropdown, type MenuProps } from 'antd';
import { CopyOutlined, ShareAltOutlined, PictureOutlined, FilePdfOutlined, ImportOutlined } from '@ant-design/icons';
import type { AppState, StrategyResult } from '../lib/calc';
import { extractSyncPayload } from '../lib/syncSlice';
import { buildShareUrl } from '../lib/share';
import { exportImage } from '../lib/exportImage';
import { exportPdf } from '../lib/exportPdf';
import ShareCard from './ShareCard';

export interface ExportActionsOpts {
  state: AppState;
  result: StrategyResult | null;
  strategyName: string;
  onCopy: () => void;
  onImport: (payload: any) => void;
  /** 返回离屏分享卡 DOM 节点（供 html2canvas 截图） */
  getCardEl: () => HTMLElement | null;
}

/**
 * 导出/分享的各类动作（复制文本、复制 JSON、分享链接、图片、PDF、导入）。
 * 图片/PDF 通过 ExportMenu 渲染的离屏 ShareCard + 动态 import 的 html2canvas/jspdf 完成。
 */
export function useExportActions(opts: ExportActionsOpts) {
  const { state, result, strategyName, onCopy, onImport, getCardEl } = opts;
  const { message } = App.useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const copyConfig = async () => {
    const text = JSON.stringify(extractSyncPayload(state), null, 2);
    try {
      await navigator.clipboard.writeText(text);
      message.success('配置(JSON)已复制，可粘贴导入');
    } catch {
      message.error('复制失败，请手动选择文本');
    }
  };

  const shareLink = () => {
    const res = buildShareUrl(state);
    if (!res.ok || !res.url) {
      message.warning(res.reason || '生成分享链接失败');
      return;
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(res.url).then(
        () => message.success('分享链接已复制，粘贴给好友即可还原方案'),
        () => message.error('复制失败，可手动复制链接'),
      );
    } else {
      message.warning('当前环境不支持自动复制，请手动复制地址栏链接');
    }
  };

  const doImage = async () => {
    const el = getCardEl();
    if (!el) {
      message.error('分享卡未就绪');
      return;
    }
    try {
      await exportImage(el, `定投方案_${strategyName}.png`);
      message.success('已导出图片');
    } catch (e: any) {
      message.error('导出图片失败：' + (e?.message || e));
    }
  };

  const doPdf = async () => {
    const el = getCardEl();
    if (!el) {
      message.error('分享卡未就绪');
      return;
    }
    try {
      await exportPdf(el, `定投方案_${strategyName}.pdf`);
      message.success('已导出 PDF');
    } catch (e: any) {
      message.error('导出 PDF 失败：' + (e?.message || e));
    }
  };

  const importConfig = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('配置文件无效');
        }
        onImport(parsed);
      } catch (e: any) {
        message.error('导入失败：' + (e?.message || '配置文件无效'));
      }
    };
    reader.onerror = () => message.error('读取文件失败');
    reader.readAsText(file);
  };

  const items: MenuProps['items'] = [
    { key: 'copy', icon: <CopyOutlined />, label: '复制方案(文本)', onClick: onCopy },
    { key: 'copyJson', icon: <CopyOutlined />, label: '复制配置(JSON)', onClick: copyConfig },
    { key: 'link', icon: <ShareAltOutlined />, label: '生成分享链接', onClick: shareLink },
    { key: 'image', icon: <PictureOutlined />, label: '导出图片(PNG)', onClick: doImage },
    { key: 'pdf', icon: <FilePdfOutlined />, label: '导出 PDF', onClick: doPdf },
    { key: 'import', icon: <ImportOutlined />, label: '导入配置', onClick: () => fileInputRef.current?.click() },
  ];

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="application/json,.json"
      style={{ display: 'none' }}
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) importConfig(f);
        e.target.value = '';
      }}
    />
  );

  return { items, fileInput };
}

/** 桌面端独立使用：一个「导出/分享」Dropdown 按钮 + 隐藏文件输入 */
export default function ExportMenu(props: ExportActionsOpts) {
  const { items, fileInput } = useExportActions(props);
  return (
    <>
      <Dropdown menu={{ items }} placement="bottomRight">
        <Button icon={<ShareAltOutlined />}>导出/分享</Button>
      </Dropdown>
      {fileInput}
    </>
  );
}
