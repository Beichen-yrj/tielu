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
# 铁路危险货物运输“双重预防机制”一体化信息平台

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

后端已实现注册、登录、当前用户、退出登录和修改密码。密码使用 bcrypt 摘要，会话使用 JWT + 数据库会话表，前端只在 `sessionStorage` 保存当前会话令牌。评估、整改、历史分析页面仍使用现有演示数据，尚未接入服务端领域接口。

## 验证命令

- 前端 lint：`npm run lint -- src`
- 前端构建：`npm run build`
- 后端测试：`python -m pytest backend/tests -q`
- API 健康检查：`GET /api/health` 应返回 `status=ok` 和 `database=connected`
