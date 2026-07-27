/**
 * 导出 PNG：动态 import html2canvas（仅点按时加载，不进主包）。
 * 入参为离屏分享卡 DOM 节点（ShareCard 外层 wrapper）。
 */
export async function exportImage(cardEl: HTMLElement, filename = '定投方案.png'): Promise<void> {
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(cardEl, {
    backgroundColor: '#ffffff',
    scale: 2,
    logging: false,
    useCORS: true,
  });
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
