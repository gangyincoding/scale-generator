# 发布与短链（草案）

面向“小红书商店上架多款心理测试链接商品”的使用场景，本项目建议采用**方案 B：统一运行页 + 量表配置托管 + 短链跳转**。目标是：**每个商品一个稳定链接**，后续改题目/文案/修复体验时无需替换商品链接。

为尽快上线跑通闭环，建议采用 **A → B 过渡策略**：先把“生成的单文件 HTML”托管上线（方案 A），但从第一天就使用“按 `internalCode` 的稳定短路径/短链”，后续升级到方案 B 只改跳转目标，不改商品链接。

## 核心概念

- `internalCode`：量表内部唯一编号（例：`SAS0001`）。用于链接、投放、排查与版本管理。
- `activationCode`：激活码（例：`2026xxxx`）。用于解锁测试（本机存储校验）。
- 短链（对外投放）：建议形如 `https://s.your-domain.com/SAS0001`
- 落地页（实际运行）：建议形如 `https://app.your-domain.com/?id=SAS0001`

## 推荐架构（方案 B）

1. **统一运行页**：只部署一份前端站点（本仓库），负责渲染 UI、激活校验、计分与结果展示。
2. **量表配置**：每个 `internalCode` 对应一份配置数据（建议为 JSON），运行页按 `id` 拉取配置并渲染。
3. **短链跳转**：短域名只做重定向（301/302），将 `/SAS0001` 映射到运行页的 `?id=SAS0001`。

> 说明：本方案把“发布”从“发布一个 HTML 文件”升级为“发布一份配置 + 复用同一套运行代码”，更适合 SKU 多、迭代频繁的商店形态。

## 平台建议（尽快上线）

- 推荐：**Cloudflare Pages** 托管静态站点（统一运行页或单文件 HTML），后续如需更灵活的短链/统计/下线页，可补充 **Cloudflare Workers** 做跳转与逻辑控制。
- 备选：GitHub Pages / Vercel / Netlify 也可托管静态内容；短链跳转能力取决于平台的“重定向/路由规则”支持程度。

## 域名策略（先不上域名也能跑通）

- MVP 阶段：无需购买短域名，先用平台自带域名（例如 `xxx.pages.dev`），用“短路径”作为投放链接（例如 `https://xxx.pages.dev/SAS0001`）。
- 稳定运营阶段（推荐）：再购买一个域名，并划分子域名：`s.your-domain.com`（短链）与 `app.your-domain.com`（落地页/运行页）。域名更利于品牌与长期稳定投放。

## 配置与命名约定（建议）

- 配置存放路径（示例约定）：`config/scales/SAS0001.json`
- 配置最小字段（示例）：`{ internalCode, title, questions, optionType, options, scoring, results, activationCode, status }`
- `status` 建议值：`active` / `maintenance` / `offline`

## 发布流程（MVP，先手动）

1. 本地生成并自测：上传文档 → 校对题目/结果 → 生成（确保激活页正常出现）。
2. 固化编号：为该量表确定 `internalCode`（用于投放与文件命名）。
3. 固化激活：为该量表确定 `activationCode`，并记录到 `config/activation-codes.json`（作为发码与追踪台账）。
4. 选择落地方式（二选一）：
   - **方案 A（最快上线）**：将生成的 `SAS0001.html` 等文件上传并托管。
   - **方案 B（推荐终态）**：发布 `config/scales/{internalCode}.json`，统一运行页按 `id` 拉取配置渲染。
5. 固化投放链接：对外只使用 `/{internalCode}` 这一种形式（即使暂时仍是方案 A）。
6. 配置跳转规则（短链层/路由层）：
   - MVP（方案 A）：`/{internalCode}` → `/{internalCode}.html`
   - 升级（方案 B）：`/{internalCode}` → `/?id={internalCode}`（或你的运行页约定路径）
7. 验收：用无痕窗口打开 `/{internalCode}`，验证激活页、题目、计分与结果文案。

## 更新、回滚与下线

- 更新（不改短链）：仅更新 `/{internalCode}` 当前指向的内容（方案 A：更新 HTML；方案 B：更新配置 JSON）并重新部署。
- 回滚：保留上一版配置（或在配置中增加 `version`），必要时将短链仍指向同一 `internalCode` 的旧版本配置。
- 下线/维护：将 `status` 设为 `offline`/`maintenance`，运行页展示说明与客服联系方式（避免 404 影响转化与售后）。

## 安全与合规提示

- 不要在前端保存或上传用户答题明细到服务器（除非明确告知并做合规设计）；如需统计，优先做匿名聚合指标。
- 激活码本机存储只能做到“同设备已激活”；如要做到“按订单/账号/次数”控制，需要引入服务端校验与风控。
- 不要把任何 API Key/Token 写入仓库或发布产物中。
