// 后端地址（Vercel Serverless Functions 同源部署，通过环境变量 VITE_API_BASE 注入；留空则“自动填充”功能不启用，基金搜索下拉仍可用）
export const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/+$/, '') || '';

// 是否启用自动填充（需配置后端地址）
export const AUTO_FILL_ENABLED = API_BASE.length > 0;
