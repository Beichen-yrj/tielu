# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
# 铁路危险货物运输双重预防机制智能安全管控平台

前端采用 React + TypeScript + Vite，后端采用 Python + FastAPI + SQLAlchemy，正式数据库为 MySQL 8。当前首页是官网式门户，登录后进入安全管理驾驶舱。

## 目录说明

- `src/`：React 页面、驾驶舱样式和 API 客户端。
- `public/`：运行时静态资源。`reference-*.{png,jpg}` 是当前门户临时占位图，待正式铁路场景素材确认后替换。
- `backend/app/`：FastAPI 应用、认证、数据模型和数据库连接。
- `backend/tests/`：认证接口测试，测试时使用临时 SQLite，不替代 MySQL 联调。
- `docker-compose.yml`：本地 MySQL 8.4 开发容器配置，映射端口 `3307`。

## 启动开发环境

1. 项目默认通过 `backend/.env` 连接本机 MySQL 8：`127.0.0.1:3306/rail_safety`。
2. 创建 Python 环境并安装依赖：`python -m pip install -r backend/requirements.txt`。
3. 启动 API：`python -m uvicorn backend.app.main:app --reload --port 8000`。
4. 另开终端执行 `npm install` 和 `npm run dev`，打开 `http://127.0.0.1:5173/`。

`docker-compose.yml` 仅作为没有本机 MySQL 时的可选开发环境，不需要在当前电脑执行。

Vite 将 `/api` 代理到 `http://127.0.0.1:8000`；部署到其他域名时可设置 `VITE_API_BASE_URL`。

## 已接入能力

后端已实现注册、登录、当前用户、退出登录和修改密码。密码使用 bcrypt 摘要，会话使用 JWT + 数据库会话表，前端只在 `sessionStorage` 保存当前会话令牌。危险源评估及其整改闭环已接入服务端领域接口，驾驶舱与相关分析页面同步读取评估数据。

## 整改闭环

评估发现隐患后记录原评估账号、检测值、标准和照片，依次进入：待整改 → 整改中 → 待复核 → 复核中 → 待项目经理确认 → 已闭环。

- 项目经理首次接办后负责整改及最终确认；复核交给原评估账号，按账号 ID 校验，不能用相同姓名代替。
- 首次保存处理记录进入“整改中”；后续保存进展保留当前阶段及已填写的说明、照片和复核数据，可直接提交下一阶段，无需重新填写。提交下一阶段同时保存进展，两者均记录操作人、时间、说明及附带证据。
- 当前办理人可修改本人在当前阶段最近一次处理记录，修改不推进阶段，并保留原内容及修改人、时间。已提交到下一办理人或已闭环的记录不能直接修改。
- 原安全员完成复核时必须填写检测值、原控制标准、上传现场照片并确认合格。明确的单一数值阈值由服务端校验，描述性标准由安全员确认。
- 上一次阶段提交人可填写原因撤回上一阶段；复核或确认不通过可退回整改。失效复核结论清除，历史照片和日志保留。
- 已闭环项不计入当前隐患数量、风险分布及默认整改任务列表；在“已闭环记录”中保留历史与撤回入口，撤回后重新计入当前隐患。闭环率仍按全部整改记录计算。
- 提交携带 `expected_version`，服务端拒绝旧版本或越级操作。已有整改进展的评估不能被评估保存接口覆盖。
- 旧记录保留原状态；没有处理日志时从原评估生成发现记录。新增数据库字段通过后端启动时的兼容迁移补齐。
- 离线演示只读展示整改数据；正式处理记录须登录在线账号保存。

流程回归：`node --test tests/rectification-workflow.test.mjs`；后端流程回归：`backend\.venv\Scripts\python.exe -m pytest backend/tests/test_rectification.py -q`。
浏览器联调脚本：`tests/rectification-browser.cjs`，需要隔离预览 API（`backend/tests/preview_permissions.py`，8001）与 Vite（5174）。脚本仅转发到隔离数据库，可用 `PLAYWRIGHT_MODULE` 和 `PLAYWRIGHT_EXECUTABLE` 指定浏览器测试运行时。

## 验证命令

- 前端 lint：`npm run lint -- src`
- 前端构建：`npm run build`
- 后端测试：`python -m pytest backend/tests -q`
- API 健康检查：`GET /api/health` 应返回 `status=ok` 和 `database=connected`
