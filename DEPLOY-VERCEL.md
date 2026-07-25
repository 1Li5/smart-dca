# 部署到 Vercel（自动填充后端 · 推荐）

> 腾讯云 SCF 函数 URL 在国内 DNS 注册有 bug（新域名长期 NODOMAIN），故改用 Vercel Serverless Functions。
> Vercel 零配置、自动 HTTPS、自动 CORS、自动 CDN，5 分钟上线。

## 架构
```
F:\网站开发\
├── api/                      ← Vercel Serverless Functions（后端）
│   ├── indicator.js          ← GET /api/indicator?code=&type=  入口
│   └── lib/fetchData.js      ← 行情抓取核心（东财净值 / 新浪日线）
├── src/                      ← React 前端
├── vercel.json               ← 函数超时 30s + 边缘 CORS
├── vite.config.ts            ← base:'./'，build → dist/
└── package.json             ← "type":"module" + engines.node>=18
```
前端（React）和后端（api/ 函数）一起部署到同一个 Vercel 项目，共享域名，免跨域配置（CORS 已双保险）。

## 前置条件
- Vercel 账号（免费版即可，每月 100GB 带宽 + 100 万次函数调用）：https://vercel.com/signup
- Node.js 18+ 已装（本项目用 22）
- 命令行在 `F:\网站开发\` 目录

## 步骤

### 1. 安装并登录 Vercel CLI
```bash
npm i -g vercel --registry=https://registry.npmmirror.com
vercel login
```
> 如果默认注册表下载慢或报 `ETARGET No matching version found for @vercel/build-utils@...`,加上 `--registry=https://registry.npmmirror.com`(国内镜像,缓存更新快)。
> 或永久切换:`npm config set registry https://registry.npmmirror.com`

浏览器会自动打开，用 GitHub / GitLab / 邮箱登录。

### 2. 首次部署（拿到生产 URL）
```bash
cd F:\网站开发
vercel --prod
```
交互提示：
- `Set up and deploy?` → **Y**
- `Which scope?` → 选你的账号
- `Link to existing project?` → **N**（新建）
- `Project name?` → 回车用默认 `smart-dca-calculator`（记下来，URL 就是 `https://<项目名>.vercel.app`）
- `In which directory is your code located?` → 回车默认 `./`
- `Want to override the settings?` → **N**（Vercel 自动识别 Vite）

部署完成后终端会输出类似：
```
🔗 https://smart-dca-calculator.vercel.app
```
（也可能是带 hash 的临时地址 `https://smart-dca-calculator-abc123.vercel.app`，没关系，最终都会绑定到 `https://<项目名>.vercel.app`）

### 3. 配置环境变量（让自动填充生效）
前端 `VITE_API_BASE` 在 **构建时** 读取，必须作为 Vercel 环境变量注入，否则线上是空值、自动填充不启用。

**命令行方式**（把 URL 换成你第 2 步拿到的）：
```bash
vercel env add VITE_API_BASE production https://smart-dca-calculator.vercel.app
```
（会提示 "What's the value?"，直接粘贴 URL 回车即可）

**或 Vercel 控制台方式**：
- 打开 https://vercel.com → 你的项目 → **Settings** → **Environment Variables**
- Add：`VITE_API_BASE` = `https://smart-dca-calculator.vercel.app`
- Environment 勾选 **Production**

### 4. 重新部署（让环境变量生效）
```bash
vercel --prod
```
这次构建时 Vite 会读到 `VITE_API_BASE`，自动填充功能启用。

### 5. 验证
浏览器直接访问（替换成你的真实 URL）：
```
https://smart-dca-calculator.vercel.app/api/indicator?code=110011&type=fund
```
应返回 JSON：
```json
{"type":"fund","code":"110011","price":4.05,"ma30":4.99,"percentile":58.72,"basis":"nav","basisLabel":"净值分位","approx":true,"asOf":"2026-07","source":"eastmoney-nav"}
```

前端访问 `https://smart-dca-calculator.vercel.app`，在标的名称框输入基金代码/名称：
- 输入即出下拉（最多 5 个，东财 JSONP 直连，无需后端）
- 选中或回车代码 → 自动拉价格 / 30月均线 / 估值分位并填充（走 `api/indicator` 后端）

## 本地联调
```bash
# 起 Vercel 本地开发（前端 + api 函数一起跑）
vercel dev
# 或只测后端逻辑：
node test_vercel_local.mjs
```

## 注意事项
- **函数超时 30s**（`vercel.json` 已配）：东方财富 / 新浪抓取偶发慢，不会轻易超时。
- **CORS** 已在 `vercel.json`（边缘层）和 `api/indicator.js`（函数层）双保险，浏览器跨域调用无碍。
- 改了 `api/` 下后端代码 → 重新 `vercel --prod` 即可，前端无需动。
- 改了前端 → 同样 `vercel --prod` 重新构建。
- 免费版额度对个人定投工具完全够用；若超量再考虑升级或限速。
- 腾讯云 SCF 的 `server/` 目录已不再需要，可保留作参考或删除。

## 回退到腾讯云 SCF（不推荐）
若坚持用 SCF，见 `server/DEPLOY.md`。但鉴于函数 URL 的 DNS 注册 bug，SCF 方案当前不稳定，不建议。
