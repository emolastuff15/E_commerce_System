# hmall-web · 黑马商城 React 前端

把课程自带的静态前端（`hmall-nginx/html/hmall-portal`、`hmall-admin`）重写成 **React + TypeScript + Vite + Ant Design 5** 的单页应用，接口仍然走原来的网关（`/api` → `http://localhost:8080`），**后端零改动**。

## 技术栈

| 项 | 版本/说明 |
|---|---|
| React | 18.3 |
| 构建 | Vite 5 + TypeScript 5 |
| UI | Ant Design 5（`antd` + `@ant-design/icons`） |
| 路由 | react-router-dom 6 |
| 请求 | axios（统一封装，自动带 `authorization` 头、401 自动跳登录） |

## 目录结构

```
hmall-web/
├── vite.config.ts          # dev 代理：/api → http://localhost:8080（等价于原 nginx 的 rewrite+反代）
├── index.html
└── src/
    ├── main.tsx            # 入口（ConfigProvider zh_CN）
    ├── App.tsx             # 路由表
    ├── auth.ts             # token / 登录用户信息存取（localStorage）
    ├── api/
    │   ├── http.ts         # axios 实例 + 拦截器 + 错误信息提取
    │   ├── types.ts        # 与后端 DTO/VO 一一对应的 TS 类型
    │   └── index.ts        # 所有接口调用
    ├── components/RequireLogin.tsx
    ├── layouts/            # PortalLayout（用户端头/脚）、AdminLayout（后台侧边栏）
    └── pages/
        ├── portal/         # Home / Login / Search / Cart / OrderConfirm / Pay / PaySuccess
        └── admin/          # AdminItems（商品管理）/ AdminUsers（用户管理）
```

## 快速开始

```bash
cd F:\project\springcloud\hmall\hmall-web
npm install
npm run dev          # http://localhost:5173
npm run build        # 类型检查 + 打包到 dist/
```

**前置条件**：后端已启动（Nacos + 各中间件 + item/cart/trade/user/pay + **网关 8080**）。开发时不需要 nginx，Vite 自带代理。

测试账号：`Jack` / `123`（数据库里还有 Rose、Hope，密码相同）。

## 页面与接口对应

| 页面 | 路由 | 调用的接口 |
|---|---|---|
| 首页（推荐位） | `/` | `GET /search/list` |
| 登录 | `/login` | `POST /users/login` |
| 搜索 | `/search?key=` | `GET /search/list`（key / category / brand / minPrice / maxPrice / pageNo / pageSize） |
| 购物车 | `/cart` | `GET /carts`、`PUT /carts`、`DELETE /carts/{id}` |
| 确认订单 | `/order-confirm` | `GET /addresses`、`POST /orders` |
| 收银台 | `/pay/:orderId` | `GET /orders/{id}`、`POST /pay-orders`、`POST /pay-orders/{id}` |
| 支付成功 | `/pay-success?orderId=` | `GET /orders/{id}` |
| 管理端·商品 | `/admin/items` | `GET /items/page`、`POST /items`、`PUT /items`、`PUT /items/status/{id}/{status}`、`DELETE /items/{id}` |
| 管理端·用户 | `/admin/users` | `GET /users/page`（**后端未实现，见下**） |

## 与旧前端的差异（有意为之）

1. **价格单位**：后端存的是“分”，页面展示与输入都按“元”，提交前 `Math.round(元 * 100)` 转换（对应旧 `util.formatPrice`）。
2. **登录态**：用 `localStorage` 存 token / 用户信息（旧版用 sessionStorage），401 时自动清理并跳登录页（带 `returnUrl`）。
3. **管理端鉴权**：旧 `hmall-admin` 把请求头硬编码成 `authorization: admin`，网关的 `AuthGlobalFilter` 会解析 JWT 而拒掉它；新版用真实登录拿到的 JWT，所以 `/items/**`、`/users/**` 都能带上有效身份。
4. **未实现的接口不再调用**：
   - `POST /search/filters`、`GET /search/suggestion`（旧的筛选/联想）在 `item-service` 里不存在，改为直接用关键字/分类/品牌/价格区间查 `/search/list`；
   - `GET /users/page` 在 `user-service` 里不存在 → 用户管理页会给出明确提示，并说明如何补后端；
   - 支付宝/微信渠道 `pay-service` 未实现（`PayController` 只支持 `PayType.BALANCE`）→ 收银台只开放“余额支付”。
5. **订单状态文案**：统一用 `1待付款 2已付款 3已发货 4已收货 5已关闭 6已评价`（与课程 SQL 一致）。

## 部署（可选）

打包后把 `dist/` 交给 nginx 托管即可，接口仍走 `/api` 反代：

```nginx
server {
    listen 18080;
    root /opt/www/hmall-web-dist;      # 指向 dist 目录
    index index.html;
    location / { try_files $uri $uri/ /index.html; }   # SPA 路由回退
    location /api {
        rewrite /api/(.*) /$1 break;
        proxy_pass http://gateway:8080;   # 容器内用服务名；宿主机用 127.0.0.1:8080
    }
}
```

## 后续可以做的事

- 订单列表/详情页（后端 `GET /orders/{id}` 已有，缺按用户分页查订单的接口）；
- 给 `user-service` 补 `GET /users/page`，让用户管理页真正可用；
- 地址新增/编辑（后端未实现，需要先补接口）；
- 搜索联想与筛选面板（需要后端配合）。
