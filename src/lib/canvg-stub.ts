/**
 * canvg 替身（stub）。
 * 本应用只用 jsPDF 把"分享卡 PNG 截图"写入 PDF（addImage 栅格路径），
 * 从不走 SVG→PDF 路径；而 SVG 路径才会动态 import('canvg')。
 * 因此用替身把 canvg 从 PDF chunk 里剔除，避免其沉重的 core-js 依赖，
 * 缩短首屏与导出等待。若将来真要支持 SVG 转 PDF，移除此 alias 即可。
 */
const CanvgStub = {
  fromString() {
    return Promise.reject(
      new Error('暂不支持 SVG 转 PDF，请改用“导出图片(PNG)”或栅格化后导出 PDF。'),
    );
  },
  from() {
    return Promise.reject(
      new Error('暂不支持 SVG 转 PDF，请改用“导出图片(PNG)”或栅格化后导出 PDF。'),
    );
  },
};

export default CanvgStub;
export const Canvg = CanvgStub;
