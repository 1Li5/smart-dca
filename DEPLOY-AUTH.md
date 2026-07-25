# 部署账号/同步功能（Vercel + Neon）

## 需要你在 Vercel 上做的 3 件事

### ① 开通 Neon Postgres

1. Vercel 项目 → 左侧 **Storage** → 点 **Create Database** → 选 **Neon Postgres** → Continue
2. 区域建议选 **Singapore**（离中国大陆最近，延迟低）
3. Plan 保持 **Free**（0.5 GB 够用一辈子）
4. 命名随便（如 `smart-dca-db`）
5. 点 **Create** → 等 30 秒初始化完成
6. 弹窗会显示一段连接串和提示 **"Connected to Project"** → 确认勾上 → 关闭
7. **这一步会自动注入 `POSTGRES_URL` 环境变量**，不用手动复制

### ② 配置 2 个环境变量

Vercel 项目 → **Settings** → **Environment Variables** → 添加：

| Name | Value | 作用 |
|------|-------|------|
| `JWT_SECRET` | 一长串随机字符，如 `sK9_a8#mP2qL7wZ4eR5tY6uI0oP3aS` | JWT 签名密钥，防伪造。**不可泄露** |
| `INVITE_CODE` | 你自定的暗号，比如 `dctou2026` | 注册邀请码。**不告诉陌生人** |

> 邀请码以后想换？改这个 env 变量 + Redeploy 就生效，旧账号不受影响。

`POSTGRES_URL` 是上一步自动注入的，不用管。

### ③ 推送代码

```powershell
cd F:\网站开发
git add .
git commit -m "feat: 账号注册/登录 + 多设备数据同步"
git push
```

Vercel 自动检测 push → 自动部署。等 1-2 分钟看到新部署 Ready。

## 验收清单

部署完成后，**按顺序**验证：

| # | 操作 | 预期 |
|---|------|------|
| 1 | 打开 https://smart-dca-delta.vercel.app/ | 头部右侧出现「登录/注册」按钮 |
| 2 | 点「注册」→ 填用户名+密码+邀请码 → 注册 | 提示成功，自动登录，头像按钮显示用户名 |
| 3 | 头部出现同步状态「已同步 2026-xx-xx xx:xx:xx」 | ✓ |
| 4 | 关浏览器再打开（同一设备） | 仍然登录态，资产列表在 |
| 5 | 在**手机浏览器**打开同一网址 → 登录同一账号 | 看到资产列表（自动同步下来） |
| 6 | 改一个基金名 → 等 2 秒 | 同步状态变 "已同步" |
| 7 | 手机端刷新页面 | 修改同步过来了 |

## 安全提示

- **`JWT_SECRET` 必须随机、必须长**。建议用 https://www.randomkeygen.com/ 之类的工具生成 32+ 位的字符串
- **不要**把 `JWT_SECRET` 或 `INVITE_CODE` 写进代码或 commit，只放在 Vercel env 里
- 数据库（Neon）**不要**把连接串发给别人；只要有 Vercel 的 access 就能从 env 读取

## 故障排查

| 现象 | 原因 | 修法 |
|------|------|------|
| 部署成功但注册报 503 | `INVITE_CODE` 没设或空 | 去 env 补设，Redeploy |
| 部署成功但任何 API 报 500 | `POSTGRES_URL` 没注入 | 回 Storage 确认勾了 "Connect to Project" |
| 登录后 401 / cookie 丢 | `JWT_SECRET` 配置后没 Redeploy | Redeploy 一次 |
| 国内访问 api 慢 | Neon 默认在美东/欧/亚太，区域远 | 删库重建在 Singapore 节点 |

## 本地开发

Vercel 不会自动注入 env 到本地。要本地联调：

1. 在项目根建 `.env.local`（已被 `.gitignore` 忽略）：
   ```
   POSTGRES_URL=postgres://...   # 从 Vercel Storage 详情页复制
   JWT_SECRET=随便写一个 dev 用的
   INVITE_CODE=dev123
   ```
2. `vercel dev`（推荐，会读 Vercel env）或 `npm run dev` + 自己 mock 数据

不联调也没事——Vercel 部署完在生产环境测就行。
