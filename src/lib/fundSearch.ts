// 基金代码/名称模糊搜索（浏览器直连东方财富 fundcode_search.js，JSONP 式，无需后端）
// 覆盖全市场公募基金（含 ETF、指数基金、主动基）。纯指数（如 000300）不在此列表，
// 但仍可直接手输代码，后端 auto 模式会用新浪行情解析。

export interface FundItem {
  code: string;
  name: string;
  type: string;
}

let _cache: FundItem[] | null = null;
let _loading: Promise<FundItem[]> | null = null;

function normalize(rows: any[]): FundItem[] {
  const out: FundItem[] = [];
  for (const row of rows) {
    // 列序: [0]=代码, [1]=拼音缩写, [2]=中文名称, [3]=类型, [4]=全拼
    if (Array.isArray(row) && row[0] && row[2]) {
      out.push({ code: String(row[0]), name: String(row[2]), type: row[3] ? String(row[3]) : '' });
    }
  }
  return out;
}

// fundcode_search.js 加载后会在全局挂 var r=[...]，这里从 window.r 解析
function parseFromGlobal(): FundItem[] {
  const g = (window as any).r;
  if (!Array.isArray(g)) return [];
  _cache = normalize(g);
  return _cache;
}

export function loadFundList(): Promise<FundItem[]> {
  if (_cache && _cache.length) return Promise.resolve(_cache);
  if (_loading) return _loading;
  _loading = new Promise<FundItem[]>((resolve) => {
    const url = `https://fund.eastmoney.com/js/fundcode_search.js?_=${Date.now()}`;
    const script = document.createElement('script');
    const timer = setTimeout(() => {
      script.remove();
      resolve(_cache || []);
    }, 12000);
    script.onload = () => {
      clearTimeout(timer);
      const items = parseFromGlobal();
      script.remove();
      resolve(items);
    };
    script.onerror = () => {
      clearTimeout(timer);
      script.remove();
      resolve(_cache || []);
    };
    script.src = url;
    document.head.appendChild(script);
  });
  return _loading;
}

// 模糊搜索：代码或名称包含关键字（任意长度，1 个字符/数字也搜），最多返回 limit 条
export async function searchFund(query: string, limit = 5): Promise<FundItem[]> {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const list = await loadFundList();
  const res: FundItem[] = [];
  for (const it of list) {
    if (it.code.toLowerCase().includes(q) || it.name.toLowerCase().includes(q)) {
      res.push(it);
      if (res.length >= limit) break;
    }
  }
  return res;
}
