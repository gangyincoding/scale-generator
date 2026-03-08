# 发布与短链（草案）

面向“小红书商店上架多款心理测试链接商品”的使用场景，本项目建议采用**方案 B：统一运行页 + 量表配置托管 + 短链跳转**。目标是：**每个商品一个稳定短链**，后续改题目/文案/修复体验时无需替换商品链接。

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

## 配置与命名约定（建议）

- 配置存放路径（示例约定）：`config/scales/SAS0001.json`
- 配置最小字段（示例）：`{ internalCode, title, questions, optionType, options, scoring, results, activationCode, status }`
- `status` 建议值：`active` / `maintenance` / `offline`

## 发布流程（MVP，先手动）

1. 本地生成并自测：上传文档 → 校对题目/结果 → 生成（确保激活页正常出现）。
2. 固化编号：为该量表确定 `internalCode`（用于投放与文件命名）。
3. 固化激活：为该量表确定 `activationCode`，并记录到 `config/activation-codes.json`（作为发码与追踪台账）。
4. 发布配置：将 `config/scales/{internalCode}.json` 提交并部署到静态托管。
5. 配置短链：为短域名增加一条跳转规则：`/{internalCode}` → `https://app.../?id={internalCode}`
6. 验收：用无痕窗口打开短链，验证激活页、题目、计分与结果文案。

## 更新、回滚与下线

- 更新（不改短链）：只更新 `config/scales/{internalCode}.json` 并重新部署。
- 回滚：保留上一版配置（或在配置中增加 `version`），必要时将短链仍指向同一 `internalCode` 的旧版本配置。
- 下线/维护：将 `status` 设为 `offline`/`maintenance`，运行页展示说明与客服联系方式（避免 404 影响转化与售后）。

## 安全与合规提示

- 不要在前端保存或上传用户答题明细到服务器（除非明确告知并做合规设计）；如需统计，优先做匿名聚合指标。
- 激活码本机存储只能做到“同设备已激活”；如要做到“按订单/账号/次数”控制，需要引入服务端校验与风控。
- 不要把任何 API Key/Token 写入仓库或发布产物中。

